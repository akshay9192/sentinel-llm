/* eslint-env jest */
const { createHash } = require("crypto");
const {
  GENESIS_EVENT,
  GOLDEN_GENESIS_CANONICAL,
  GOLDEN_GENESIS_HASH,
  GOLDEN_SECOND_CANONICAL,
  GOLDEN_SECOND_HASH,
  SECOND_EVENT,
} = require("./fixtures/v1GoldenVectors");
const { canonicalize } = require("../../../utils/audit/canonicalize");
const {
  AUDIT_SCHEMA_VERSION,
  GENESIS_PREVIOUS_HASH,
  canonicalizeAuditEvent,
  computeAuditEventHash,
  isValidSha256Hex,
} = require("../../../utils/audit/hashChain");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function reverseObjectInsertionOrder(value) {
  if (Array.isArray(value)) return value.map(reverseObjectInsertionOrder);
  if (value === null || typeof value !== "object") return value;
  return Object.keys(value)
    .reverse()
    .reduce((result, key) => {
      result[key] = reverseObjectInsertionOrder(value[key]);
      return result;
    }, {});
}

describe("audit event hash chain", () => {
  test("matches reviewed genesis canonical bytes and SHA-256 vector", () => {
    expect(AUDIT_SCHEMA_VERSION).toBe(1);
    expect(GENESIS_PREVIOUS_HASH).toBe("0".repeat(64));
    expect(canonicalizeAuditEvent(GENESIS_EVENT)).toBe(
      GOLDEN_GENESIS_CANONICAL
    );
    expect(Buffer.from(GOLDEN_GENESIS_CANONICAL, "utf8")).toEqual(
      Buffer.from(canonicalizeAuditEvent(GENESIS_EVENT), "utf8")
    );
    expect(
      createHash("sha256")
        .update(Buffer.from(GOLDEN_GENESIS_CANONICAL, "utf8"))
        .digest("hex")
    ).toBe(GOLDEN_GENESIS_HASH);
    expect(computeAuditEventHash(GENESIS_EVENT)).toBe(GOLDEN_GENESIS_HASH);
  });

  test("chains a second event to the reviewed genesis hash", () => {
    expect(SECOND_EVENT.previous_event_hash).toBe(GOLDEN_GENESIS_HASH);
    expect(canonicalizeAuditEvent(SECOND_EVENT)).toBe(GOLDEN_SECOND_CANONICAL);
    expect(
      createHash("sha256")
        .update(Buffer.from(GOLDEN_SECOND_CANONICAL, "utf8"))
        .digest("hex")
    ).toBe(GOLDEN_SECOND_HASH);
    expect(computeAuditEventHash(SECOND_EVENT)).toBe(GOLDEN_SECOND_HASH);
  });

  test("same event with different property insertion order has same bytes and hash", () => {
    const reordered = reverseObjectInsertionOrder(GENESIS_EVENT);
    expect(canonicalizeAuditEvent(reordered)).toBe(GOLDEN_GENESIS_CANONICAL);
    expect(computeAuditEventHash(reordered)).toBe(GOLDEN_GENESIS_HASH);
  });

  test("semantically different events have different canonical bytes", () => {
    const changed = clone(GENESIS_EVENT);
    changed.response_optional = "not empty";
    expect(canonicalizeAuditEvent(changed)).not.toBe(GOLDEN_GENESIS_CANONICAL);
  });

  test("Unicode is deterministic without normalization", () => {
    const same = clone(GENESIS_EVENT);
    expect(canonicalizeAuditEvent(same)).toBe(GOLDEN_GENESIS_CANONICAL);

    const normalizedDifferently = clone(GENESIS_EVENT);
    normalizedDifferently.query_optional =
      normalizedDifferently.query_optional.replace("cafe\u0301", "café");
    expect(canonicalizeAuditEvent(normalizedDifferently)).not.toBe(
      GOLDEN_GENESIS_CANONICAL
    );
    expect(computeAuditEventHash(normalizedDifferently)).not.toBe(
      GOLDEN_GENESIS_HASH
    );
  });

  test("array order is intentionally preserved", () => {
    const changed = clone(GENESIS_EVENT);
    changed.retrieval_chunk_ids.reverse();
    expect(canonicalizeAuditEvent(changed)).not.toBe(GOLDEN_GENESIS_CANONICAL);
    expect(computeAuditEventHash(changed)).not.toBe(GOLDEN_GENESIS_HASH);
  });

  test.each([
    ["principal_id", "43"],
    ["workspace_id", 8],
    ["policy_hash", "e".repeat(64)],
    ["schema_version", 2],
  ])("protected field %s cannot retain the original hash", (field, value) => {
    const changed = clone(GENESIS_EVENT);
    changed[field] = value;
    if (field === "schema_version") {
      expect(canonicalize(changed)).not.toBe(canonicalize(GENESIS_EVENT));
      expect(() => computeAuditEventHash(changed)).toThrow(
        expect.objectContaining({
          code: "AUDIT_HASH_UNSUPPORTED_SCHEMA_VERSION",
        })
      );
      return;
    }
    expect(computeAuditEventHash(changed)).not.toBe(GOLDEN_GENESIS_HASH);
  });

  test("changing previous_event_hash changes the event hash", () => {
    const changed = clone(SECOND_EVENT);
    changed.previous_event_hash = "f".repeat(64);
    expect(computeAuditEventHash(changed)).not.toBe(GOLDEN_SECOND_HASH);
  });

  test("rejects populated or missing event_hash instead of hashing itself", () => {
    const populated = clone(GENESIS_EVENT);
    populated.event_hash = "f".repeat(64);
    expect(() => computeAuditEventHash(populated)).toThrow(
      expect.objectContaining({ code: "AUDIT_HASH_EVENT_HASH_MUST_BE_NULL" })
    );

    const absent = clone(GENESIS_EVENT);
    delete absent.event_hash;
    expect(() => computeAuditEventHash(absent)).toThrow(
      expect.objectContaining({ code: "AUDIT_HASH_INVALID_EVENT_PROPERTY" })
    );
  });

  test("enforces genesis and non-genesis chain-link rules", () => {
    const wrongGenesis = clone(GENESIS_EVENT);
    wrongGenesis.previous_event_hash = "f".repeat(64);
    expect(() => computeAuditEventHash(wrongGenesis)).toThrow(
      expect.objectContaining({ code: "AUDIT_HASH_INVALID_GENESIS_LINK" })
    );

    const laterWithGenesisLink = clone(SECOND_EVENT);
    laterWithGenesisLink.previous_event_hash = GENESIS_PREVIOUS_HASH;
    expect(() => computeAuditEventHash(laterWithGenesisLink)).toThrow(
      expect.objectContaining({
        code: "AUDIT_HASH_GENESIS_LINK_AFTER_FIRST_EVENT",
      })
    );
  });

  test.each([
    [null, "AUDIT_HASH_INVALID_PREVIOUS_HASH"],
    ["abc", "AUDIT_HASH_INVALID_PREVIOUS_HASH"],
    ["F".repeat(64), "AUDIT_HASH_INVALID_PREVIOUS_HASH"],
    [` ${"f".repeat(64)}`, "AUDIT_HASH_INVALID_PREVIOUS_HASH"],
  ])("rejects malformed previous hash %#", (previousHash, code) => {
    const changed = clone(SECOND_EVENT);
    changed.previous_event_hash = previousHash;
    expect(() => computeAuditEventHash(changed)).toThrow(
      expect.objectContaining({ code })
    );
  });

  test.each([
    "2026-08-16T10:00:00Z",
    "2026-08-16T20:00:00.000+10:00",
    "August 16, 2026",
    "2026-02-30T10:00:00.000Z",
  ])("rejects a non-contract timestamp: %s", (timestamp) => {
    const changed = clone(GENESIS_EVENT);
    changed.timestamp_utc = timestamp;
    expect(() => computeAuditEventHash(changed)).toThrow(
      expect.objectContaining({ code: "AUDIT_HASH_INVALID_TIMESTAMP" })
    );
  });

  test("produces strict lowercase 64-character hexadecimal output", () => {
    const hash = computeAuditEventHash(GENESIS_EVENT);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toHaveLength(64);
    expect(isValidSha256Hex(hash)).toBe(true);
    expect(isValidSha256Hex(hash.toUpperCase())).toBe(false);
  });

  test("does not mutate the event or nested collection order", () => {
    const event = clone(GENESIS_EVENT);
    const before = JSON.stringify(event);
    const contextOrder = event.context_refs.map(({ id }) => id);

    computeAuditEventHash(event);

    expect(JSON.stringify(event)).toBe(before);
    expect(event.context_refs.map(({ id }) => id)).toEqual(contextOrder);
  });

  test("rejects accessor envelope fields without invoking them", () => {
    const event = clone(GENESIS_EVENT);
    let invoked = false;
    Object.defineProperty(event, "schema_version", {
      enumerable: true,
      get() {
        invoked = true;
        return 1;
      },
    });

    expect(() => computeAuditEventHash(event)).toThrow(
      expect.objectContaining({ code: "AUDIT_HASH_INVALID_EVENT_PROPERTY" })
    );
    expect(invoked).toBe(false);
  });
});
