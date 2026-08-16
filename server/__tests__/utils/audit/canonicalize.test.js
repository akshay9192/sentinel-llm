/* eslint-env jest */
const {
  CanonicalizationError,
  DEFAULT_CANONICAL_LIMITS,
  canonicalize,
  canonicalizeToBuffer,
} = require("../../../utils/audit/canonicalize");

class FixtureClass {}

describe("audit canonicalization", () => {
  test("sorts object keys recursively without changing array order", () => {
    const first = {
      z: { beta: 2, alpha: 1 },
      array: [{ y: true, x: false }, "last"],
      a: null,
    };
    const second = {
      a: null,
      array: [{ x: false, y: true }, "last"],
      z: { alpha: 1, beta: 2 },
    };

    expect(canonicalize(first)).toBe(canonicalize(second));
    expect(canonicalize(first)).toBe(
      '{"a":null,"array":[{"x":false,"y":true},"last"],"z":{"alpha":1,"beta":2}}'
    );
    expect(canonicalize({ values: ["a", "b"] })).not.toBe(
      canonicalize({ values: ["b", "a"] })
    );
  });

  test("distinguishes null, absent, empty string, and booleans", () => {
    expect(canonicalize({ value: null })).not.toBe(canonicalize({}));
    expect(canonicalize("")).toBe('""');
    expect(canonicalize("")).not.toBe(canonicalize(null));
    expect(canonicalize(true)).toBe("true");
    expect(canonicalize(false)).toBe("false");
    expect(canonicalize(true)).not.toBe(canonicalize(false));
  });

  test("preserves Unicode code points and emits UTF-8 bytes", () => {
    const value = {
      ascii: "plain",
      latin: "café",
      combining: "cafe\u0301",
      cjk: "漢字",
      emoji: "😀",
      rtl: "مرحبا",
      controls: 'quote " slash \\ newline\n tab\t',
    };
    const canonical = canonicalize(value);

    expect(canonical).toContain("café");
    expect(canonical).toContain("cafe\u0301");
    expect(canonical).toContain("漢字");
    expect(canonical).toContain("😀");
    expect(canonical).toContain("مرحبا");
    expect(canonicalize("é")).not.toBe(canonicalize("e\u0301"));
    expect(canonicalizeToBuffer(value)).toEqual(Buffer.from(canonical, "utf8"));
  });

  test("escapes JSON control characters and lone surrogates explicitly", () => {
    expect(canonicalize('\b\f\n\r\t"\u0000\\')).toBe(
      '"\\b\\f\\n\\r\\t\\"\\u0000\\\\"'
    );
    expect(canonicalize("\ud800")).toBe('"\\ud800"');
    expect(canonicalize("\udc00")).toBe('"\\udc00"');
    expect(canonicalize("😀")).toBe('"😀"');
  });

  test("serializes finite numbers deterministically", () => {
    expect(canonicalize(0)).toBe("0");
    expect(canonicalize(-0)).toBe("0");
    expect(canonicalize(1)).toBe("1");
    expect(canonicalize(-1)).toBe("-1");
    expect(canonicalize(1.5)).toBe("1.5");
    expect(canonicalize(1e-7)).toBe("1e-7");
  });

  test.each([
    [undefined, "AUDIT_CANONICAL_UNDEFINED"],
    [NaN, "AUDIT_CANONICAL_NON_FINITE_NUMBER"],
    [Infinity, "AUDIT_CANONICAL_NON_FINITE_NUMBER"],
    [-Infinity, "AUDIT_CANONICAL_NON_FINITE_NUMBER"],
    [BigInt(1), "AUDIT_CANONICAL_BIGINT"],
    [() => true, "AUDIT_CANONICAL_FUNCTION"],
    [Symbol("fixture"), "AUDIT_CANONICAL_SYMBOL"],
    [
      new Date("2026-08-16T10:00:00.000Z"),
      "AUDIT_CANONICAL_UNSUPPORTED_OBJECT",
    ],
    [new Map(), "AUDIT_CANONICAL_UNSUPPORTED_OBJECT"],
    [new FixtureClass(), "AUDIT_CANONICAL_UNSUPPORTED_OBJECT"],
    [Buffer.from("fixture"), "AUDIT_CANONICAL_UNSUPPORTED_OBJECT"],
    [Number.MAX_SAFE_INTEGER + 1, "AUDIT_CANONICAL_UNSAFE_INTEGER"],
    [1e21, "AUDIT_CANONICAL_UNSAFE_INTEGER"],
  ])("rejects unsupported value %# without fallback", (value, code) => {
    expect(() => canonicalize(value)).toThrow(
      expect.objectContaining({
        name: "CanonicalizationError",
        code,
      })
    );
  });

  test("rejects sparse arrays and extra array properties", () => {
    const sparse = [];
    sparse.length = 1;
    expect(() => canonicalize(sparse)).toThrow(
      expect.objectContaining({ code: "AUDIT_CANONICAL_SPARSE_ARRAY" })
    );

    const extended = [1];
    extended.extra = true;
    expect(() => canonicalize(extended)).toThrow(
      expect.objectContaining({ code: "AUDIT_CANONICAL_ARRAY_PROPERTY" })
    );
  });

  test("rejects accessors without invoking them", () => {
    let invoked = false;
    const value = {};
    Object.defineProperty(value, "secret", {
      enumerable: true,
      get() {
        invoked = true;
        return "not-read";
      },
    });

    expect(() => canonicalize(value)).toThrow(
      expect.objectContaining({
        code: "AUDIT_CANONICAL_PROPERTY_DESCRIPTOR",
      })
    );
    expect(invoked).toBe(false);
  });

  test("safely serializes own prototype-looking keys", () => {
    const value = Object.create(null);
    for (const key of ["__proto__", "constructor", "prototype"]) {
      Object.defineProperty(value, key, {
        value: `${key}-value`,
        enumerable: true,
      });
    }

    expect(canonicalize(value)).toBe(
      '{"__proto__":"__proto__-value","constructor":"constructor-value","prototype":"prototype-value"}'
    );
    expect(Object.prototype.polluted).toBeUndefined();
  });

  test("rejects symbol properties and circular references", () => {
    const symbolProperty = { safe: true };
    symbolProperty[Symbol("hidden")] = "value";
    expect(() => canonicalize(symbolProperty)).toThrow(
      expect.objectContaining({ code: "AUDIT_CANONICAL_SYMBOL_PROPERTY" })
    );

    const circular = {};
    circular.self = circular;
    expect(() => canonicalize(circular)).toThrow(
      expect.objectContaining({ code: "AUDIT_CANONICAL_CIRCULAR" })
    );
  });

  test("fails safely at defensive depth and size bounds", () => {
    let tooDeep = null;
    for (let depth = 0; depth <= DEFAULT_CANONICAL_LIMITS.maxDepth; depth += 1)
      tooDeep = { nested: tooDeep };
    expect(() => canonicalize(tooDeep)).toThrow(
      expect.objectContaining({ code: "AUDIT_CANONICAL_MAX_DEPTH" })
    );

    expect(() =>
      canonicalize("a".repeat(DEFAULT_CANONICAL_LIMITS.maxStringBytes + 1))
    ).toThrow(
      expect.objectContaining({ code: "AUDIT_CANONICAL_MAX_STRING_BYTES" })
    );

    expect(() =>
      canonicalize(Array(DEFAULT_CANONICAL_LIMITS.maxEntries + 1).fill(null))
    ).toThrow(expect.objectContaining({ code: "AUDIT_CANONICAL_MAX_ENTRIES" }));
  });

  test("does not mutate objects, nested objects, or arrays", () => {
    const value = { z: [{ beta: 2, alpha: 1 }], a: true };
    const before = JSON.stringify(value);
    const originalKeys = Object.keys(value.z[0]);

    canonicalize(value);

    expect(JSON.stringify(value)).toBe(before);
    expect(Object.keys(value.z[0])).toEqual(originalKeys);
  });

  test("throws a stable local error type without embedding values", () => {
    let error;
    try {
      canonicalize(undefined);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(CanonicalizationError);
    expect(error.message).toBe("AUDIT_CANONICAL_UNDEFINED");
  });
});
