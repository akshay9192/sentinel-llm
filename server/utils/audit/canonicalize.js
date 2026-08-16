const DEFAULT_CANONICAL_LIMITS = Object.freeze({
  maxDepth: 64,
  maxEntries: 10_000,
  maxStringBytes: 1_048_576,
  maxCanonicalBytes: 2_097_152,
});

class CanonicalizationError extends TypeError {
  constructor(code) {
    super(code);
    this.name = "CanonicalizationError";
    this.code = code;
  }
}

function fail(code) {
  throw new CanonicalizationError(code);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function compareUtf16(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function countEntry(state) {
  state.entries += 1;
  if (state.entries > state.limits.maxEntries)
    fail("AUDIT_CANONICAL_MAX_ENTRIES");
}

function serializeString(value, state) {
  if (Buffer.byteLength(value, "utf8") > state.limits.maxStringBytes)
    fail("AUDIT_CANONICAL_MAX_STRING_BYTES");

  let encoded = '"';
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    switch (codeUnit) {
      case 0x08:
        encoded += "\\b";
        continue;
      case 0x09:
        encoded += "\\t";
        continue;
      case 0x0a:
        encoded += "\\n";
        continue;
      case 0x0c:
        encoded += "\\f";
        continue;
      case 0x0d:
        encoded += "\\r";
        continue;
      case 0x22:
        encoded += '\\"';
        continue;
      case 0x5c:
        encoded += "\\\\";
        continue;
      default:
        break;
    }

    if (codeUnit <= 0x1f) {
      encoded += `\\u${codeUnit.toString(16).padStart(4, "0")}`;
      continue;
    }

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        encoded += value[index] + value[index + 1];
        index += 1;
      } else {
        encoded += `\\u${codeUnit.toString(16)}`;
      }
      continue;
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      encoded += `\\u${codeUnit.toString(16)}`;
      continue;
    }

    encoded += value[index];
  }
  return `${encoded}"`;
}

function serializeNumber(value) {
  if (!Number.isFinite(value)) fail("AUDIT_CANONICAL_NON_FINITE_NUMBER");
  if (Number.isInteger(value) && !Number.isSafeInteger(value))
    fail("AUDIT_CANONICAL_UNSAFE_INTEGER");
  if (Object.is(value, -0)) return "0";
  return String(value);
}

function serializeArray(value, state, depth, ancestors) {
  if (Object.getPrototypeOf(value) !== Array.prototype)
    fail("AUDIT_CANONICAL_UNSUPPORTED_OBJECT");
  if (value.length > state.limits.maxEntries)
    fail("AUDIT_CANONICAL_MAX_ENTRIES");

  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === "symbol"))
    fail("AUDIT_CANONICAL_SYMBOL_PROPERTY");

  const expectedKeys = new Set(["length"]);
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    if (!Object.prototype.hasOwnProperty.call(value, key))
      fail("AUDIT_CANONICAL_SPARSE_ARRAY");
    expectedKeys.add(key);
  }

  if (keys.some((key) => !expectedKeys.has(key)))
    fail("AUDIT_CANONICAL_ARRAY_PROPERTY");

  const parts = [];
  for (let index = 0; index < value.length; index += 1) {
    countEntry(state);
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("AUDIT_CANONICAL_PROPERTY_DESCRIPTOR");
    parts.push(serializeValue(descriptor.value, state, depth + 1, ancestors));
  }
  return `[${parts.join(",")}]`;
}

function serializeObject(value, state, depth, ancestors) {
  if (!isPlainObject(value)) fail("AUDIT_CANONICAL_UNSUPPORTED_OBJECT");

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol"))
    fail("AUDIT_CANONICAL_SYMBOL_PROPERTY");

  const keys = ownKeys.sort(compareUtf16);
  const parts = [];
  for (const key of keys) {
    countEntry(state);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("AUDIT_CANONICAL_PROPERTY_DESCRIPTOR");
    parts.push(
      `${serializeString(key, state)}:${serializeValue(
        descriptor.value,
        state,
        depth + 1,
        ancestors
      )}`
    );
  }
  return `{${parts.join(",")}}`;
}

function serializeValue(value, state, depth, ancestors) {
  if (depth > state.limits.maxDepth) fail("AUDIT_CANONICAL_MAX_DEPTH");
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return serializeString(value, state);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return serializeNumber(value);
    case "undefined":
      fail("AUDIT_CANONICAL_UNDEFINED");
      break;
    case "bigint":
      fail("AUDIT_CANONICAL_BIGINT");
      break;
    case "function":
      fail("AUDIT_CANONICAL_FUNCTION");
      break;
    case "symbol":
      fail("AUDIT_CANONICAL_SYMBOL");
      break;
    case "object": {
      if (ancestors.has(value)) fail("AUDIT_CANONICAL_CIRCULAR");
      ancestors.add(value);
      try {
        return Array.isArray(value)
          ? serializeArray(value, state, depth, ancestors)
          : serializeObject(value, state, depth, ancestors);
      } finally {
        ancestors.delete(value);
      }
    }
    default:
      fail("AUDIT_CANONICAL_UNSUPPORTED_TYPE");
  }
}

/**
 * Serialize JSON-compatible plain data using the Sentinel schema-version-1
 * canonical representation.
 *
 * Object keys are recursively sorted by UTF-16 code units. Array order and
 * string code points are preserved. The input is never mutated.
 *
 * @param {*} value
 * @returns {string}
 */
function canonicalize(value) {
  const state = {
    entries: 0,
    limits: DEFAULT_CANONICAL_LIMITS,
  };
  const canonical = serializeValue(value, state, 0, new WeakSet());
  if (Buffer.byteLength(canonical, "utf8") > state.limits.maxCanonicalBytes)
    fail("AUDIT_CANONICAL_MAX_BYTES");
  return canonical;
}

function canonicalizeToBuffer(value) {
  return Buffer.from(canonicalize(value), "utf8");
}

module.exports = {
  CanonicalizationError,
  DEFAULT_CANONICAL_LIMITS,
  canonicalize,
  canonicalizeToBuffer,
};
