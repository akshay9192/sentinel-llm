const { createHash } = require("crypto");
const { canonicalize } = require("./canonicalize");

const AUDIT_SCHEMA_VERSION = 1;
const GENESIS_PREVIOUS_HASH = "0".repeat(64);
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const SEQUENCE_PATTERN = /^[1-9][0-9]*$/;
const UTC_MILLISECOND_PATTERN =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;

class AuditHashError extends TypeError {
  constructor(code) {
    super(code);
    this.name = "AuditHashError";
    this.code = code;
  }
}

function fail(code) {
  throw new AuditHashError(code);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function getOwnDataProperty(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
    fail("AUDIT_HASH_INVALID_EVENT_PROPERTY");
  return descriptor.value;
}

function isValidSha256Hex(value) {
  return typeof value === "string" && SHA256_HEX_PATTERN.test(value);
}

function validateTimestamp(timestamp) {
  if (
    typeof timestamp !== "string" ||
    !UTC_MILLISECOND_PATTERN.test(timestamp) ||
    Number.isNaN(Date.parse(timestamp)) ||
    new Date(timestamp).toISOString() !== timestamp
  )
    fail("AUDIT_HASH_INVALID_TIMESTAMP");
}

function validateAuditEventEnvelope(event) {
  if (!isPlainObject(event)) fail("AUDIT_HASH_EVENT_NOT_PLAIN_OBJECT");

  const schemaVersion = getOwnDataProperty(event, "schema_version");
  if (schemaVersion !== AUDIT_SCHEMA_VERSION)
    fail("AUDIT_HASH_UNSUPPORTED_SCHEMA_VERSION");

  const sequenceNumber = getOwnDataProperty(event, "sequence_number");
  if (
    typeof sequenceNumber !== "string" ||
    !SEQUENCE_PATTERN.test(sequenceNumber)
  )
    fail("AUDIT_HASH_INVALID_SEQUENCE");

  validateTimestamp(getOwnDataProperty(event, "timestamp_utc"));

  const previousEventHash = getOwnDataProperty(event, "previous_event_hash");
  if (!isValidSha256Hex(previousEventHash))
    fail("AUDIT_HASH_INVALID_PREVIOUS_HASH");
  if (sequenceNumber === "1") {
    if (previousEventHash !== GENESIS_PREVIOUS_HASH)
      fail("AUDIT_HASH_INVALID_GENESIS_LINK");
  } else if (previousEventHash === GENESIS_PREVIOUS_HASH) {
    fail("AUDIT_HASH_GENESIS_LINK_AFTER_FIRST_EVENT");
  }

  if (getOwnDataProperty(event, "event_hash") !== null)
    fail("AUDIT_HASH_EVENT_HASH_MUST_BE_NULL");
}

function copyHashInput(event) {
  const hashInput = Object.create(null);
  for (const key of Reflect.ownKeys(event)) {
    if (typeof key === "symbol") fail("AUDIT_HASH_SYMBOL_PROPERTY");
    if (key === "event_hash") continue;
    const descriptor = Object.getOwnPropertyDescriptor(event, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("AUDIT_HASH_INVALID_EVENT_PROPERTY");
    Object.defineProperty(hashInput, key, {
      value: descriptor.value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return hashInput;
}

function canonicalizeAuditEvent(event) {
  validateAuditEventEnvelope(event);
  return canonicalize(copyHashInput(event));
}

function computeAuditEventHash(event) {
  const canonicalBytes = Buffer.from(canonicalizeAuditEvent(event), "utf8");
  return createHash("sha256").update(canonicalBytes).digest("hex");
}

module.exports = {
  AUDIT_SCHEMA_VERSION,
  AuditHashError,
  GENESIS_PREVIOUS_HASH,
  SHA256_HEX_PATTERN,
  canonicalizeAuditEvent,
  computeAuditEventHash,
  isValidSha256Hex,
};
