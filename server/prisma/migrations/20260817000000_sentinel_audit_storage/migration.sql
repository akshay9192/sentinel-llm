-- Sentinel audit state is a singleton serialization point. The first write in
-- every append transaction increments current_sequence, acquiring SQLite's
-- writer serialization before the current head is consumed.
CREATE TABLE "sentinel_audit_chain_state" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "current_sequence" BIGINT NOT NULL DEFAULT 0,
    "current_event_hash" TEXT NOT NULL,
    CONSTRAINT "sentinel_audit_chain_state_singleton" CHECK ("id" = 1),
    CONSTRAINT "sentinel_audit_chain_state_sequence" CHECK ("current_sequence" >= 0),
    CONSTRAINT "sentinel_audit_chain_state_hash" CHECK (
        length("current_event_hash") = 64
        AND "current_event_hash" NOT GLOB '*[^0-9a-f]*'
    )
);

INSERT INTO "sentinel_audit_chain_state" (
    "id",
    "current_sequence",
    "current_event_hash"
) VALUES (
    1,
    0,
    '0000000000000000000000000000000000000000000000000000000000000000'
);

CREATE TABLE "sentinel_audit_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_id" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "sequence_number" BIGINT NOT NULL,
    "timestamp_utc" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "completion_state" TEXT NOT NULL,
    "principal_type" TEXT NOT NULL,
    "principal_id" TEXT NOT NULL,
    "user_id" INTEGER,
    "workspace_id" INTEGER,
    "thread_id" INTEGER,
    "chat_id" INTEGER,
    "request_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "execution_attempt_id" TEXT,
    "idempotency_key" TEXT,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "policy_version_id" TEXT,
    "policy_hash" TEXT,
    "policy_decision" TEXT NOT NULL,
    "execution_capability" TEXT,
    "execution_decision" TEXT NOT NULL,
    "previous_event_hash" TEXT NOT NULL,
    "event_hash" TEXT NOT NULL,
    "event_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sentinel_audit_events_schema_version" CHECK ("schema_version" = 1),
    CONSTRAINT "sentinel_audit_events_sequence" CHECK ("sequence_number" > 0),
    CONSTRAINT "sentinel_audit_events_previous_hash" CHECK (
        length("previous_event_hash") = 64
        AND "previous_event_hash" NOT GLOB '*[^0-9a-f]*'
    ),
    CONSTRAINT "sentinel_audit_events_event_hash" CHECK (
        length("event_hash") = 64
        AND "event_hash" NOT GLOB '*[^0-9a-f]*'
    )
);

CREATE UNIQUE INDEX "sentinel_audit_events_event_id_key"
ON "sentinel_audit_events"("event_id");

CREATE UNIQUE INDEX "sentinel_audit_events_sequence_number_key"
ON "sentinel_audit_events"("sequence_number");

-- event_hash is unique because every valid hash input contains unique event_id
-- and global sequence_number. A collision or duplicate is a controlled failure.
CREATE UNIQUE INDEX "sentinel_audit_events_event_hash_key"
ON "sentinel_audit_events"("event_hash");

CREATE INDEX "sentinel_audit_events_workspace_id_sequence_number_idx"
ON "sentinel_audit_events"("workspace_id", "sequence_number");

CREATE INDEX "sentinel_audit_events_principal_type_principal_id_sequence_number_idx"
ON "sentinel_audit_events"("principal_type", "principal_id", "sequence_number");

CREATE INDEX "sentinel_audit_events_event_type_sequence_number_idx"
ON "sentinel_audit_events"("event_type", "sequence_number");

CREATE INDEX "sentinel_audit_events_timestamp_utc_idx"
ON "sentinel_audit_events"("timestamp_utc");

CREATE INDEX "sentinel_audit_events_request_id_idx"
ON "sentinel_audit_events"("request_id");

CREATE INDEX "sentinel_audit_events_correlation_id_idx"
ON "sentinel_audit_events"("correlation_id");

CREATE INDEX "sentinel_audit_events_execution_attempt_id_idx"
ON "sentinel_audit_events"("execution_attempt_id");

CREATE INDEX "sentinel_audit_events_idempotency_key_idx"
ON "sentinel_audit_events"("idempotency_key");

CREATE INDEX "sentinel_audit_events_policy_version_id_idx"
ON "sentinel_audit_events"("policy_version_id");
