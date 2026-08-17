const prisma = require("../prisma");
const { canonicalize } = require("./canonicalize");
const {
  GENESIS_PREVIOUS_HASH,
  computeAuditEventHash,
  isValidSha256Hex,
} = require("./hashChain");
const {
  AuditValidationError,
  SYSTEM_ASSIGNED_FIELDS,
  validateAuditEvent,
  validateAuditEventDraft,
} = require("./validateEvent");

const CHAIN_STATE_ID = 1;
const TRANSACTION_OPTIONS = Object.freeze({ maxWait: 5_000, timeout: 10_000 });

class AuditStorageError extends Error {
  constructor(code, cause = null) {
    super(code);
    this.name = "AuditStorageError";
    this.code = code;
    if (cause) this.cause = cause;
  }
}

function storageFailure(code, cause = null) {
  return new AuditStorageError(code, cause);
}

function translateStorageError(error) {
  if (
    error instanceof AuditStorageError ||
    error instanceof AuditValidationError
  )
    return error;
  if (error?.code === "P2025")
    return storageFailure("AUDIT_STORAGE_STATE_MISSING", error);
  if (error?.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(",")
      : String(error.meta?.target || "");
    if (target.includes("event_id"))
      return storageFailure("AUDIT_STORAGE_DUPLICATE_EVENT_ID", error);
    if (target.includes("sequence_number"))
      return storageFailure("AUDIT_STORAGE_DUPLICATE_SEQUENCE", error);
    if (target.includes("event_hash"))
      return storageFailure("AUDIT_STORAGE_DUPLICATE_EVENT_HASH", error);
    return storageFailure("AUDIT_STORAGE_UNIQUE_CONSTRAINT", error);
  }
  const message = String(error?.message || "");
  if (
    error?.code === "P1008" ||
    error?.code === "P2028" ||
    /database is locked|SQLITE_BUSY|SQLITE_LOCKED|Timed out during query execution|Transaction not found/i.test(
      message
    )
  )
    return storageFailure("AUDIT_STORAGE_BUSY", error);
  return storageFailure("AUDIT_STORAGE_APPEND_FAILED", error);
}

function assertChainState(state, priorSequence) {
  if (!state) throw storageFailure("AUDIT_STORAGE_STATE_MISSING");
  if (
    typeof state.currentSequence !== "bigint" ||
    priorSequence < 0n ||
    state.currentSequence !== priorSequence + 1n ||
    !isValidSha256Hex(state.currentEventHash)
  )
    throw storageFailure("AUDIT_STORAGE_STATE_INVALID");
  if (
    (priorSequence === 0n &&
      state.currentEventHash !== GENESIS_PREVIOUS_HASH) ||
    (priorSequence > 0n && state.currentEventHash === GENESIS_PREVIOUS_HASH)
  )
    throw storageFailure("AUDIT_STORAGE_STATE_INVALID");
}

function assertStoredHead(latest, priorSequence, priorHash) {
  if (priorSequence === 0n) {
    if (latest !== null) throw storageFailure("AUDIT_STORAGE_HEAD_MISMATCH");
    return;
  }
  if (
    latest === null ||
    latest.sequenceNumber !== priorSequence ||
    latest.eventHash !== priorHash
  )
    throw storageFailure("AUDIT_STORAGE_HEAD_MISMATCH");
}

function toPersistenceRow(event) {
  return {
    eventId: event.event_id,
    schemaVersion: event.schema_version,
    sequenceNumber: BigInt(event.sequence_number),
    timestampUtc: event.timestamp_utc,
    eventType: event.event_type,
    completionState: event.completion_state,
    principalType: event.principal_type,
    principalId: event.principal_id,
    userId: event.user_id,
    workspaceId: event.workspace_id,
    threadId: event.thread_id,
    chatId: event.chat_id,
    requestId: event.request_id,
    correlationId: event.correlation_id,
    executionAttemptId: event.execution_attempt_id,
    idempotencyKey: event.idempotency_key,
    resourceType: event.resource_type,
    resourceId: event.resource_id,
    policyVersionId: event.policy_version_id,
    policyHash: event.policy_hash,
    policyDecision: event.policy_decision,
    executionCapability: event.execution_capability,
    executionDecision: event.execution_decision,
    previousEventHash: event.previous_event_hash,
    eventHash: event.event_hash,
    eventJson: canonicalize(event),
  };
}

function createAuditStore({
  prismaClient = prisma,
  now = () => new Date(),
} = {}) {
  if (!prismaClient || typeof prismaClient.$transaction !== "function")
    throw new TypeError("AUDIT_STORAGE_INVALID_PRISMA_CLIENT");
  if (typeof now !== "function")
    throw new TypeError("AUDIT_STORAGE_INVALID_CLOCK");

  return Object.freeze({
    append: async function append(draft) {
      for (const field of SYSTEM_ASSIGNED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(draft || {}, field))
          throw new AuditValidationError(
            "AUDIT_SCHEMA_CALLER_CHAIN_METADATA",
            field
          );
      }
      validateAuditEventDraft(draft);
      // Snapshot before the first await. This both rejects accessors/unsafe
      // runtime values and prevents a caller from racing nested mutations into
      // the event after validation has started.
      const draftSnapshot = JSON.parse(canonicalize(draft));

      try {
        return await prismaClient.$transaction(async (tx) => {
          // This is intentionally the first database statement. In SQLite a
          // DEFERRED transaction whose first statement writes becomes a write
          // transaction before any head is read, serializing appenders.
          const state = await tx.sentinel_audit_chain_state.update({
            where: { id: CHAIN_STATE_ID },
            data: { currentSequence: { increment: 1n } },
          });
          const priorSequence = state.currentSequence - 1n;
          assertChainState(state, priorSequence);

          const latest = await tx.sentinel_audit_events.findFirst({
            orderBy: { sequenceNumber: "desc" },
            select: { sequenceNumber: true, eventHash: true },
          });
          assertStoredHead(latest, priorSequence, state.currentEventHash);

          const timestamp = now();
          if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime()))
            throw storageFailure("AUDIT_STORAGE_INVALID_CLOCK");
          const preHashEvent = {
            ...draftSnapshot,
            sequence_number: state.currentSequence.toString(10),
            timestamp_utc: timestamp.toISOString(),
            previous_event_hash: state.currentEventHash,
            event_hash: null,
          };
          validateAuditEvent(preHashEvent);
          const eventHash = computeAuditEventHash(preHashEvent);
          const storedEvent = { ...preHashEvent, event_hash: eventHash };
          validateAuditEvent(storedEvent);

          await tx.sentinel_audit_events.create({
            data: toPersistenceRow(storedEvent),
          });
          const advanced = await tx.sentinel_audit_chain_state.updateMany({
            where: {
              id: CHAIN_STATE_ID,
              currentSequence: state.currentSequence,
              currentEventHash: state.currentEventHash,
            },
            data: { currentEventHash: eventHash },
          });
          if (advanced.count !== 1)
            throw storageFailure("AUDIT_STORAGE_HEAD_ADVANCE_FAILED");
          return storedEvent;
        }, TRANSACTION_OPTIONS);
      } catch (error) {
        throw translateStorageError(error);
      }
    },
  });
}

const defaultAuditStore = createAuditStore();

module.exports = {
  AuditStorageError,
  CHAIN_STATE_ID,
  TRANSACTION_OPTIONS,
  appendAuditEvent: defaultAuditStore.append,
  createAuditStore,
  toPersistenceRow,
};
