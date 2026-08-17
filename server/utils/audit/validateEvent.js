const { AUDIT_SCHEMA_VERSION, isValidSha256Hex } = require("./hashChain");

const EVENT_FIELDS = Object.freeze([
  "schema_version",
  "event_id",
  "sequence_number",
  "timestamp_utc",
  "event_type",
  "completion_state",
  "principal_type",
  "principal_id",
  "user_id",
  "initiating_principal_type",
  "initiating_principal_id",
  "delegation_chain",
  "executor_type",
  "executor_id",
  "workspace_id",
  "thread_id",
  "chat_id",
  "request_id",
  "correlation_id",
  "execution_attempt_id",
  "idempotency_key",
  "context_refs",
  "resource_type",
  "resource_id",
  "query_hash",
  "query_optional",
  "retrieval_chunk_ids",
  "retrieval_hash",
  "policy_profile",
  "policy_version_id",
  "policy_version",
  "policy_hash",
  "policy_input_hash",
  "policy_decision",
  "policy_reason_code",
  "policy_reason",
  "policy_rules_triggered",
  "semantic_evidence",
  "model_provider",
  "model_id",
  "model_request_id",
  "execution_requested",
  "execution_capability",
  "execution_target_type",
  "execution_target",
  "execution_target_hash",
  "execution_parameters_schema_version",
  "execution_parameters_hash",
  "proposal_hash",
  "execution_decision",
  "response_hash",
  "response_optional",
  "error_code",
  "error_detail_optional",
  "attributes",
  "previous_event_hash",
  "event_hash",
]);

const SYSTEM_ASSIGNED_FIELDS = Object.freeze([
  "sequence_number",
  "timestamp_utc",
  "previous_event_hash",
  "event_hash",
]);
const DRAFT_FIELDS = Object.freeze(
  EVENT_FIELDS.filter((field) => !SYSTEM_ASSIGNED_FIELDS.includes(field))
);

const EVENT_STATES = Object.freeze({
  CHAT_REQUEST_RECEIVED: ["PENDING"],
  GOVERNANCE_CONTEXT_EVALUATED: ["COMPLETED", "FAILED", "PARTIAL"],
  GUARDRAIL_EVALUATED: ["COMPLETED", "FAILED", "PARTIAL"],
  RETRIEVAL_COMPLETED: ["COMPLETED", "FAILED", "PARTIAL"],
  MODEL_STARTED: ["PENDING"],
  MODEL_COMPLETED: ["COMPLETED"],
  MODEL_FAILED: ["FAILED"],
  EXECUTION_PROPOSED: ["PENDING"],
  EXECUTION_AUTHORIZED: ["COMPLETED"],
  EXECUTION_DENIED: ["DENIED"],
  EXECUTION_STARTED: ["PENDING"],
  EXECUTION_COMPLETED: ["COMPLETED"],
  EXECUTION_FAILED: ["FAILED"],
  EXECUTION_PARTIAL: ["PARTIAL"],
  EXECUTION_OUTCOME_UNKNOWN: ["UNKNOWN"],
  DIRECT_MUTATION_REQUESTED: ["PENDING"],
  DIRECT_MUTATION_AUTHORIZED: ["COMPLETED"],
  DIRECT_MUTATION_DENIED: ["DENIED"],
  DIRECT_MUTATION_COMPLETED: ["COMPLETED"],
  DIRECT_MUTATION_FAILED: ["FAILED"],
  DIRECT_MUTATION_PARTIAL: ["PARTIAL"],
  DIRECT_MUTATION_OUTCOME_UNKNOWN: ["UNKNOWN"],
});

const PRINCIPAL_TYPES = new Set([
  "instance_owner",
  "user",
  "api_key",
  "scheduled",
  "service",
]);
const EXECUTOR_TYPES = new Set([
  "model",
  "agent",
  "tool",
  "flow_node",
  "mcp_tool",
  "schedule_worker",
  "service",
  "openclaw",
]);
const POLICY_DECISIONS = new Set(["ALLOW", "DENY", "NOT_APPLICABLE", "ERROR"]);
const EXECUTION_DECISIONS = new Set([
  "NOT_REQUESTED",
  "PENDING",
  "AUTHORIZED",
  "DENIED",
  "ERROR_DENIED",
]);
const DELEGATION_RELATIONSHIPS = new Set([
  "initiated",
  "delegated",
  "scheduled",
  "service_call",
]);
const CONTEXT_TYPES = new Set([
  "api_key",
  "agent_invocation",
  "response_uuid",
  "tool",
  "flow",
  "flow_node",
  "mcp_server",
  "mcp_tool",
  "schedule",
  "schedule_run",
  "connector",
  "provider_request",
]);
const ATTRIBUTE_KEYS = new Set([
  "adapter",
  "operation",
  "truncated",
  "retry_of_execution_attempt_id",
  "outcome_receipt_id",
  "content_capture_policy",
  "result_count",
  "duration_ms",
]);
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_MILLISECOND_PATTERN =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

class AuditValidationError extends TypeError {
  constructor(code, field = null) {
    super(code);
    this.name = "AuditValidationError";
    this.code = code;
    this.field = field;
  }
}

function fail(code, field = null) {
  throw new AuditValidationError(code, field);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, expected, field) {
  if (!isPlainObject(value)) fail("AUDIT_SCHEMA_EXPECTED_OBJECT", field);
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string"))
    fail("AUDIT_SCHEMA_UNKNOWN_FIELD", field);
  const actual = [...keys].sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  )
    fail("AUDIT_SCHEMA_FIELD_SET", field);
}

function assertString(value, field, maxBytes, { nullable = true } = {}) {
  if (value === null && nullable) return;
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > maxBytes)
    fail("AUDIT_SCHEMA_STRING", field);
}

function assertNonEmptyString(value, field, maxBytes = 128) {
  assertString(value, field, maxBytes, { nullable: false });
  if (value.length === 0) fail("AUDIT_SCHEMA_EMPTY_STRING", field);
}

function assertUuid(value, field, { nullable = false } = {}) {
  if (value === null && nullable) return;
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value))
    fail("AUDIT_SCHEMA_UUID_V4", field);
}

function assertPositiveInteger(value, field, { nullable = true } = {}) {
  if (value === null && nullable) return;
  if (!Number.isSafeInteger(value) || value <= 0)
    fail("AUDIT_SCHEMA_POSITIVE_INTEGER", field);
}

function assertHash(value, field, { nullable = true } = {}) {
  if (value === null && nullable) return;
  if (!isValidSha256Hex(value)) fail("AUDIT_SCHEMA_SHA256", field);
}

function assertUniqueStringList(value, field, limit, maxBytes = 128) {
  if (!Array.isArray(value) || value.length > limit)
    fail("AUDIT_SCHEMA_LIST", field);
  const seen = new Set();
  for (const item of value) {
    assertNonEmptyString(item, field, maxBytes);
    if (seen.has(item)) fail("AUDIT_SCHEMA_DUPLICATE_LIST_ITEM", field);
    seen.add(item);
  }
}

function validateDelegation(event) {
  const initiatingNull = event.initiating_principal_type === null;
  if (initiatingNull !== (event.initiating_principal_id === null))
    fail("AUDIT_SCHEMA_INITIATOR_PAIR", "initiating_principal_type");
  if (!initiatingNull) {
    if (!PRINCIPAL_TYPES.has(event.initiating_principal_type))
      fail("AUDIT_SCHEMA_PRINCIPAL_TYPE", "initiating_principal_type");
    assertNonEmptyString(
      event.initiating_principal_id,
      "initiating_principal_id"
    );
  }
  if (
    !Array.isArray(event.delegation_chain) ||
    event.delegation_chain.length > 8
  )
    fail("AUDIT_SCHEMA_DELEGATION_CHAIN", "delegation_chain");
  for (const entry of event.delegation_chain) {
    assertExactKeys(
      entry,
      ["principal_type", "principal_id", "relationship"],
      "delegation_chain"
    );
    if (!PRINCIPAL_TYPES.has(entry.principal_type))
      fail("AUDIT_SCHEMA_PRINCIPAL_TYPE", "delegation_chain");
    assertNonEmptyString(entry.principal_id, "delegation_chain");
    if (!DELEGATION_RELATIONSHIPS.has(entry.relationship))
      fail("AUDIT_SCHEMA_DELEGATION_RELATIONSHIP", "delegation_chain");
  }
  if (
    event.principal_type === "scheduled" &&
    (initiatingNull || event.delegation_chain.length === 0)
  )
    fail("AUDIT_SCHEMA_SCHEDULED_INITIATOR", "delegation_chain");
}

function validateContextRefs(value) {
  if (!Array.isArray(value) || value.length > 16)
    fail("AUDIT_SCHEMA_CONTEXT_REFS", "context_refs");
  const seen = new Set();
  for (const entry of value) {
    assertExactKeys(entry, ["type", "id"], "context_refs");
    if (!CONTEXT_TYPES.has(entry.type))
      fail("AUDIT_SCHEMA_CONTEXT_TYPE", "context_refs");
    assertNonEmptyString(entry.id, "context_refs");
    const identity = `${entry.type}\u0000${entry.id}`;
    if (seen.has(identity))
      fail("AUDIT_SCHEMA_DUPLICATE_CONTEXT", "context_refs");
    seen.add(identity);
  }
}

function validateSemanticEvidence(value) {
  if (value === null) return;
  assertExactKeys(
    value,
    ["model_id", "classifier_version", "result", "reason_code"],
    "semantic_evidence"
  );
  assertNonEmptyString(value.model_id, "semantic_evidence");
  assertNonEmptyString(value.classifier_version, "semantic_evidence");
  assertNonEmptyString(value.reason_code, "semantic_evidence");
  if (!["ALLOW", "DENY", "ERROR"].includes(value.result))
    fail("AUDIT_SCHEMA_SEMANTIC_RESULT", "semantic_evidence");
}

function validateAttributes(value) {
  if (!isPlainObject(value)) fail("AUDIT_SCHEMA_ATTRIBUTES", "attributes");
  const keys = Reflect.ownKeys(value);
  if (keys.length > 8 || keys.some((key) => !ATTRIBUTE_KEYS.has(key)))
    fail("AUDIT_SCHEMA_ATTRIBUTE_KEY", "attributes");
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "string") {
      if (Buffer.byteLength(item, "utf8") > 256)
        fail("AUDIT_SCHEMA_ATTRIBUTE_VALUE", "attributes");
    } else if (
      typeof item !== "boolean" &&
      !(typeof item === "number" && Number.isSafeInteger(item))
    ) {
      fail("AUDIT_SCHEMA_ATTRIBUTE_VALUE", "attributes");
    }
  }
}

function validateAuditEvent(event) {
  assertExactKeys(event, EVENT_FIELDS, "event");
  if (event.schema_version !== AUDIT_SCHEMA_VERSION)
    fail("AUDIT_SCHEMA_VERSION", "schema_version");
  assertUuid(event.event_id, "event_id");
  if (
    typeof event.sequence_number !== "string" ||
    !/^[1-9][0-9]*$/.test(event.sequence_number)
  )
    fail("AUDIT_SCHEMA_SEQUENCE", "sequence_number");
  if (
    typeof event.timestamp_utc !== "string" ||
    !UTC_MILLISECOND_PATTERN.test(event.timestamp_utc) ||
    Number.isNaN(Date.parse(event.timestamp_utc)) ||
    new Date(event.timestamp_utc).toISOString() !== event.timestamp_utc
  )
    fail("AUDIT_SCHEMA_TIMESTAMP", "timestamp_utc");

  if (!Object.prototype.hasOwnProperty.call(EVENT_STATES, event.event_type))
    fail("AUDIT_SCHEMA_EVENT_TYPE", "event_type");
  if (!EVENT_STATES[event.event_type].includes(event.completion_state))
    fail("AUDIT_SCHEMA_EVENT_STATE", "completion_state");
  if (!PRINCIPAL_TYPES.has(event.principal_type))
    fail("AUDIT_SCHEMA_PRINCIPAL_TYPE", "principal_type");
  assertNonEmptyString(event.principal_id, "principal_id");
  assertPositiveInteger(event.user_id, "user_id");
  if (event.principal_type === "user") {
    if (event.user_id === null || event.principal_id !== String(event.user_id))
      fail("AUDIT_SCHEMA_USER_PRINCIPAL", "user_id");
  } else if (event.user_id !== null) {
    fail("AUDIT_SCHEMA_NON_USER_USER_ID", "user_id");
  }
  validateDelegation(event);

  if ((event.executor_type === null) !== (event.executor_id === null))
    fail("AUDIT_SCHEMA_EXECUTOR_PAIR", "executor_type");
  if (event.executor_type !== null && !EXECUTOR_TYPES.has(event.executor_type))
    fail("AUDIT_SCHEMA_EXECUTOR_TYPE", "executor_type");
  assertString(event.executor_id, "executor_id", 128);

  for (const field of ["workspace_id", "thread_id", "chat_id"])
    assertPositiveInteger(event[field], field);
  assertUuid(event.request_id, "request_id");
  assertUuid(event.correlation_id, "correlation_id");
  assertUuid(event.execution_attempt_id, "execution_attempt_id", {
    nullable: true,
  });
  assertUuid(event.idempotency_key, "idempotency_key", { nullable: true });
  validateContextRefs(event.context_refs);

  for (const field of ["resource_type", "resource_id"])
    assertString(event[field], field, 128);
  if ((event.resource_type === null) !== (event.resource_id === null))
    fail("AUDIT_SCHEMA_RESOURCE_PAIR", "resource_type");

  for (const field of [
    "query_hash",
    "retrieval_hash",
    "policy_hash",
    "policy_input_hash",
    "execution_target_hash",
    "execution_parameters_hash",
    "proposal_hash",
    "response_hash",
  ])
    assertHash(event[field], field);
  assertHash(event.previous_event_hash, "previous_event_hash", {
    nullable: false,
  });
  assertHash(event.event_hash, "event_hash");
  assertString(event.query_optional, "query_optional", 4096);
  assertString(event.response_optional, "response_optional", 8192);
  assertUniqueStringList(event.retrieval_chunk_ids, "retrieval_chunk_ids", 128);

  for (const field of [
    "policy_profile",
    "policy_version_id",
    "policy_version",
    "model_provider",
    "model_id",
    "model_request_id",
    "execution_capability",
    "execution_target_type",
    "execution_parameters_schema_version",
    "error_code",
  ])
    assertString(event[field], field, 128);
  assertString(event.policy_reason, "policy_reason", 512);
  assertString(event.execution_target, "execution_target", 1024);
  assertString(event.error_detail_optional, "error_detail_optional", 1024);
  assertUniqueStringList(
    event.policy_rules_triggered,
    "policy_rules_triggered",
    64
  );
  if (!POLICY_DECISIONS.has(event.policy_decision))
    fail("AUDIT_SCHEMA_POLICY_DECISION", "policy_decision");
  if (!EXECUTION_DECISIONS.has(event.execution_decision))
    fail("AUDIT_SCHEMA_EXECUTION_DECISION", "execution_decision");
  if (event.policy_reason_code !== null) {
    assertNonEmptyString(event.policy_reason_code, "policy_reason_code");
    if (!REASON_CODE_PATTERN.test(event.policy_reason_code))
      fail("AUDIT_SCHEMA_REASON_CODE", "policy_reason_code");
  }
  if (
    event.policy_decision !== "NOT_APPLICABLE" &&
    [
      event.policy_version_id,
      event.policy_version,
      event.policy_hash,
      event.policy_input_hash,
      event.policy_reason_code,
    ].some((value) => value === null)
  )
    fail("AUDIT_SCHEMA_POLICY_EVIDENCE", "policy_decision");
  validateSemanticEvidence(event.semantic_evidence);

  if (typeof event.execution_requested !== "boolean")
    fail("AUDIT_SCHEMA_EXECUTION_REQUESTED", "execution_requested");
  const isExecutionEvent = event.event_type.startsWith("EXECUTION_");
  if (isExecutionEvent) {
    if (
      !event.execution_requested ||
      event.execution_capability === null ||
      event.proposal_hash === null ||
      event.workspace_id === null
    )
      fail("AUDIT_SCHEMA_EXECUTION_EVIDENCE", "execution_requested");
    if (
      event.event_type === "EXECUTION_STARTED" ||
      ["COMPLETED", "FAILED", "PARTIAL", "UNKNOWN"].includes(
        event.completion_state
      )
    ) {
      if (event.execution_attempt_id === null)
        fail("AUDIT_SCHEMA_EXECUTION_ATTEMPT", "execution_attempt_id");
    }
  } else if (
    !event.event_type.startsWith("DIRECT_MUTATION_") &&
    (event.execution_requested || event.execution_decision !== "NOT_REQUESTED")
  ) {
    fail("AUDIT_SCHEMA_UNEXPECTED_EXECUTION", "execution_requested");
  }

  if (
    event.event_type.startsWith("DIRECT_MUTATION_") &&
    event.resource_type === null
  )
    fail("AUDIT_SCHEMA_MUTATION_RESOURCE", "resource_type");
  if (event.event_type.startsWith("MODEL_")) {
    if (
      event.executor_type === null ||
      event.model_provider === null ||
      event.model_id === null ||
      event.workspace_id === null
    )
      fail("AUDIT_SCHEMA_MODEL_EVIDENCE", "model_id");
  }
  if (event.event_type === "MODEL_COMPLETED" && event.response_hash === null)
    fail("AUDIT_SCHEMA_MODEL_RESPONSE", "response_hash");
  if (
    event.event_type === "RETRIEVAL_COMPLETED" &&
    event.completion_state === "COMPLETED" &&
    event.retrieval_hash === null
  )
    fail("AUDIT_SCHEMA_RETRIEVAL_EVIDENCE", "retrieval_hash");

  validateAttributes(event.attributes);
  return event;
}

function validateAuditEventDraft(draft) {
  assertExactKeys(draft, DRAFT_FIELDS, "event_draft");
  return draft;
}

module.exports = {
  AuditValidationError,
  DRAFT_FIELDS,
  EVENT_FIELDS,
  SYSTEM_ASSIGNED_FIELDS,
  validateAuditEvent,
  validateAuditEventDraft,
};
