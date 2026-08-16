# Sentinel Audit Event Schema

## 1. Purpose and status

This document defines the Phase 2A logical `AuditEvent` contract before any
logger, hashing, database, checkpoint, or integration code exists. Schema
version `1` is the input contract for later Phase 2 work; it is not evidence
that the runtime currently emits Sentinel audit events.

The contract is constrained by:

- [ADR-001](./adr/001-audit-storage.md): dedicated Sentinel tables in the
  application SQLite database, one installation-wide chain, mandatory
  authorization audit, and honest external-effect outcomes;
- [ADR-002](./adr/002-governance-hook.md): typed principal, workspace, exact
  policy reference, request, and correlation context;
- [ADR-003](./adr/003-execution-integration.md): proposal, deterministic
  authorization, restricted execution, and outcome lifecycle;
- [ADR-004](./adr/004-policy-storage.md): immutable policy versions and mutable
  workspace activation bindings;
- [ADR-005](./adr/005-audit-checkpointing.md): future checkpoints that reference
  a stable global sequence and chain head; and
- [ADR-006](./adr/006-single-vs-multi-user.md): typed, non-null principals in
  both product modes.

This phase defines semantics only. Phase 2B owns canonical serialization and
SHA-256 event-chain hashing. Phase 2C owns Prisma mapping, migrations, sequence
allocation, and atomic append. Phase 2D owns idempotency enforcement. No Phase
2B or later functionality is implemented here.

## 2. Design rules

1. Each persisted event is an application-level append-only lifecycle
   observation. The application write API will expose append, not update or
   delete; physical database immutability is not claimed.
2. The logical schema is independent from its future Prisma row layout.
3. Every event has a typed, non-null effective principal. `user_id` is only an
   optional compatibility/join field for a real AnythingLLM user.
4. The principal authorizes; delegation describes derived authority; the
   executor describes the component that acted. These concepts never substitute
   for one another.
5. Content, model output, tool selection, classifier output, and approval prompts
   are evidence, never permission.
6. One logical activity uses multiple append-only lifecycle events linked by
   identifiers. It is not collapsed into one mutable final record.
7. Raw queries and responses are absent by default. Raw execution parameters,
   credentials, authorization headers, and arbitrary nested metadata are never
   permitted.
8. Unknown top-level fields, enum values, or event-specific combinations are
   rejected for schema version `1`. Evolution occurs through an explicit schema
   version.

## 3. Schema version and evolution

`schema_version` is the JSON integer `1` for the initial contract.

- Every stored event carries its own version.
- Events are never rewritten merely to adopt a newer schema.
- A verifier must select canonicalization and validation rules by the event's
  version.
- A new optional or required field, changed enum meaning, or changed hash-input
  meaning requires an explicit schema-version decision. A consumer must not
  reinterpret a version `1` field under later semantics.
- Unknown schema versions fail validation and verification safely. They are not
  skipped or treated as valid.
- `schema_version` is security-relevant and will be included in the Phase 2B
  canonical event hash.

## 4. Logical `AuditEvent` structure

The following is the version `1` logical shape. `null` means explicitly not
applicable; arrays are present and empty when applicable but contain no values.
Phase 2B will decide the exact canonical byte representation without changing
these meanings.

```json
{
  "schema_version": 1,
  "event_id": "uuid-v4",
  "sequence_number": "positive-decimal-string",
  "timestamp_utc": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "event_type": "EVENT_TYPE",
  "completion_state": "PENDING|COMPLETED|FAILED|PARTIAL|UNKNOWN|DENIED",

  "principal_type": "instance_owner|user|api_key|scheduled|service",
  "principal_id": "stable-non-secret-id",
  "user_id": null,
  "initiating_principal_type": null,
  "initiating_principal_id": null,
  "delegation_chain": [],
  "executor_type": null,
  "executor_id": null,

  "workspace_id": null,
  "thread_id": null,
  "chat_id": null,
  "request_id": "uuid-v4",
  "correlation_id": "uuid-v4",
  "execution_attempt_id": null,
  "idempotency_key": null,
  "context_refs": [],

  "resource_type": null,
  "resource_id": null,

  "query_hash": null,
  "query_optional": null,
  "retrieval_chunk_ids": [],
  "retrieval_hash": null,

  "policy_profile": null,
  "policy_version_id": null,
  "policy_version": null,
  "policy_hash": null,
  "policy_input_hash": null,
  "policy_decision": "NOT_APPLICABLE",
  "policy_reason_code": null,
  "policy_reason": null,
  "policy_rules_triggered": [],
  "semantic_evidence": null,

  "model_provider": null,
  "model_id": null,
  "model_request_id": null,

  "execution_requested": false,
  "execution_capability": null,
  "execution_target_type": null,
  "execution_target": null,
  "execution_target_hash": null,
  "execution_parameters_schema_version": null,
  "execution_parameters_hash": null,
  "proposal_hash": null,
  "execution_decision": "NOT_REQUESTED",

  "response_hash": null,
  "response_optional": null,
  "error_code": null,
  "error_detail_optional": null,
  "attributes": {},

  "previous_event_hash": "lower-case-64-hex",
  "event_hash": "lower-case-64-hex"
}
```

All keys shown above are required parts of a version `1` stored event, using
explicit nulls, empty collections, and false/default enum values where a field
is not applicable. Examples later in this document omit unchanged null fields
only for readability and are not valid Phase 2B canonical vectors.

## 5. Core identity and ordering fields

| Field                 | Logical type                                           | Requirement                  | Meaning                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`      | integer                                                | Always `1`                   | Selects this contract and later canonicalization rules.                                                                                                                                                         |
| `event_id`            | lower-case UUID v4 string                              | Required                     | Globally unique within an installation and safe to expose as a non-secret reference. Independent from ordering. UUID v4 matches the pinned server's existing `uuid` 9.x convention and needs no new dependency. |
| `sequence_number`     | non-zero unsigned decimal string, no leading zero      | Required on persisted events | One installation-wide monotonic append position. A string avoids JavaScript safe-integer and JSON `BigInt` ambiguity while remaining storage-mappable later.                                                    |
| `timestamp_utc`       | RFC 3339 UTC string with exactly millisecond precision | Required                     | Server-controlled append time, for example `2026-08-16T10:22:33.456Z`. Client/model timestamps are never authoritative.                                                                                         |
| `event_type`          | closed versioned enum                                  | Required                     | Immutable lifecycle observation described in section 9.                                                                                                                                                         |
| `completion_state`    | closed enum                                            | Required                     | State of the stage represented by this event, not a mutable aggregate status.                                                                                                                                   |
| `previous_event_hash` | lower-case 64-hex string                               | Required on persisted events | Previous committed event's Phase 2B chain hash. Genesis representation is deliberately deferred to Phase 2B.                                                                                                    |
| `event_hash`          | lower-case 64-hex string                               | Required on persisted events | Phase 2B hash of all security-relevant event fields except this field itself.                                                                                                                                   |

Sequence semantics:

- Phase 2C assigns a sequence only inside a successful append transaction.
- Failed appends consume no committed sequence number. A gap in persisted global
  sequence is therefore invalid evidence, not an expected retry artifact.
- Sequence order is authoritative for chain order. Timestamps aid operations but
  do not establish ordering and may move backward if the host clock changes.
- `event_id` is generated before append and may survive a retry;
  `sequence_number` exists only after the append commits.

## 6. Principal, delegation, and executor model

### 6.1 Effective principal

`principal_type` and `principal_id` are required and identify the authority under
which the audited stage occurred.

| Principal type   | `principal_id` semantics                                                                      | `user_id`                                            |
| ---------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `instance_owner` | Stable installation-scoped synthetic principal ID; never a password or token.                 | `null`                                               |
| `user`           | Decimal string form of current AnythingLLM `users.id`.                                        | Required integer equal to the same upstream user ID. |
| `api_key`        | Stable API-key row ID, never the secret or a digest displayed as a credential.                | `null`                                               |
| `scheduled`      | Stable scheduled-run principal ID. Creator authority appears in initiating/delegation fields. | `null`                                               |
| `service`        | Allowlisted service identifier such as a bounded collector or worker identity.                | `null`                                               |

This refines the project plan's legacy `user_id` concept without removing its
join value: typed principal fields are canonical, while `user_id` is populated
only for a real `user` principal. Fake user rows and nullable/unknown effective
actors are prohibited for protected events.

### 6.2 Initiation and delegation

`initiating_principal_type` and `initiating_principal_id` identify the principal
that started delegated work when it differs from the effective principal. They
are required for `scheduled` activity and other delegation whose effective
principal is not the original human/API authority.

`delegation_chain` is an ordered array from initiator toward the effective
principal. It has at most 8 entries. Each entry is exactly:

```json
{
  "principal_type": "user|api_key|instance_owner|scheduled|service",
  "principal_id": "stable-non-secret-id",
  "relationship": "initiated|delegated|scheduled|service_call"
}
```

Unknown keys or relationships are invalid. Models, agents, tools, flows, MCP
servers, and OpenClaw are not placed in this authority chain unless a later ADR
explicitly creates a new registered principal category.

### 6.3 Executor and context references

`executor_type` identifies what performed or attempted the stage. Allowed
version `1` values are `model`, `agent`, `tool`, `flow_node`, `mcp_tool`,
`schedule_worker`, `service`, and `openclaw`; otherwise it is `null`.
`executor_id` is required when `executor_type` is non-null and is a stable,
non-secret registry/configuration identifier.

`context_refs` provides bounded, lower-frequency provenance without creating
dozens of nullable columns. It contains at most 16 unique entries of the form:

```json
{ "type": "agent_invocation", "id": "fake-invocation-uuid" }
```

Allowed reference types are `api_key`, `agent_invocation`, `response_uuid`,
`tool`, `flow`, `flow_node`, `mcp_server`, `mcp_tool`, `schedule`,
`schedule_run`, `connector`, and `provider_request`. IDs are non-secret strings
up to 128 UTF-8 bytes. Future storage may index selected references, but their
meaning remains part of the logical event.

## 7. Correlation and resource context

| Field                           | Requirement                                                                                                                                                 | Meaning                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace_id`                  | Required for workspace chat, retrieval, policy, governed execution, and workspace mutation events. `null` only for explicitly installation-scoped activity. | Integer ID of the authorized AnythingLLM workspace. No fake workspace is permitted.                                                               |
| `thread_id`                     | Required when the activity belongs to a workspace thread; otherwise `null`.                                                                                 | Upstream integer `workspace_threads.id`, distinct from a chat record.                                                                             |
| `chat_id`                       | Present only after a persisted `workspace_chats.id` exists; otherwise `null`.                                                                               | Links later lifecycle records to the upstream chat row. It is not a request identifier.                                                           |
| `request_id`                    | Required UUID v4.                                                                                                                                           | One concrete inbound processing attempt. Internal/scheduled work receives a server-created request ID for that run.                               |
| `correlation_id`                | Required UUID v4.                                                                                                                                           | One logical activity across request, retrieval, model, delegated proposal, authorization, effect, and outcome.                                    |
| `execution_attempt_id`          | Required for `EXECUTION_STARTED` and terminal execution events; assigned no later than authorization for an intended physical dispatch.                     | One physical effect attempt. Every retry receives a new value.                                                                                    |
| `idempotency_key`               | Required for effectful execution/direct mutation when the capability contract requires replay protection; otherwise `null`.                                 | Server-owned opaque UUID v4 for the logical operation. A caller key is never copied verbatim; Phase 2D must validate or derive an internal value. |
| `resource_type` / `resource_id` | Required for direct mutation; optional where another typed field already identifies the resource.                                                           | Stable non-secret object identity such as `workspace`, `document`, `policy`, or `api_key`.                                                        |

Retry linkage uses the same `correlation_id` and `idempotency_key`, with a new
`request_id` for a new inbound attempt and a new `execution_attempt_id` for each
physical dispatch. Reconnects that do not cause another dispatch do not invent a
new execution attempt.

## 8. Content, policy, model, and execution fields

### 8.1 Query, retrieval, and response

| Field                 | Requirement and meaning                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query_hash`          | Required for chat request/guardrail/model events once a query exists. Phase 2B hashes the exact accepted UTF-8 query bytes before prompt augmentation.                                                         |
| `query_optional`      | `null` by default. May contain explicitly enabled, redacted, bounded query text under section 12.                                                                                                              |
| `retrieval_chunk_ids` | Required ordered list on `RETRIEVAL_COMPLETED`; otherwise empty. IDs identify the exact chunks in prompt order. At most 128 unique, non-secret IDs, each at most 128 bytes. Raw chunk text is prohibited.      |
| `retrieval_hash`      | Required on `RETRIEVAL_COMPLETED`. Hash-input meaning is the ordered retrieval manifest actually supplied for context: chunk ID, source/document ID, per-chunk content hash, and truncation/ordering metadata. |
| `response_hash`       | Required for `MODEL_COMPLETED`; otherwise optional/null. Hash-input meaning is the exact final UTF-8 response accepted for persistence/delivery.                                                               |
| `response_optional`   | `null` by default. May contain explicitly enabled, redacted, bounded response text under section 12.                                                                                                           |

### 8.2 Deterministic policy evidence

| Field                    | Requirement and meaning                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `policy_profile`         | Human-visible profile identifier used for the decision; not authoritative by itself.                                                            |
| `policy_version_id`      | Stable immutable policy-row identifier. Canonical policy reference with `policy_hash`.                                                          |
| `policy_version`         | Workspace-local immutable version label/number serialized as a string. Retained for inspection and compatibility with the project-plan concept. |
| `policy_hash`            | Hash of the immutable canonical structured policy. Required whenever a policy version governed the stage.                                       |
| `policy_input_hash`      | Hash of the normalized deterministic evaluator input, excluding raw credentials and prohibited content.                                         |
| `policy_decision`        | `ALLOW`, `DENY`, `NOT_APPLICABLE`, or `ERROR`. `ERROR` is evaluation evidence and never permission.                                             |
| `policy_reason_code`     | Stable machine-readable code, at most 128 bytes. Required for policy decisions other than `NOT_APPLICABLE`.                                     |
| `policy_reason`          | Optional bounded redacted human explanation, at most 512 bytes. Never model prose used as authority.                                            |
| `policy_rules_triggered` | Ordered list of at most 64 stable rule IDs, each at most 128 bytes. Empty when not applicable.                                                  |

`semantic_evidence` is optional future Phase 4 evidence and, when present, is
exactly `{model_id, classifier_version, result, reason_code}`. `result` is
`ALLOW`, `DENY`, or `ERROR`; strings are limited to 128 bytes. It does not write
or override `policy_decision` or `execution_decision`.

### 8.3 Model evidence

`model_provider`, `model_id`, and `model_request_id` are bounded non-secret
identifiers, each at most 128 bytes. Provider/model identity is required on
`MODEL_STARTED`, `MODEL_COMPLETED`, and `MODEL_FAILED`. It records which model
was called; it confers no authority.

### 8.4 Execution evidence

| Field                                 | Requirement and meaning                                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `execution_requested`                 | Boolean. True from `EXECUTION_PROPOSED` through terminal execution events and false for unrelated activity.                                                                       |
| `execution_capability`                | Stable registered capability name, required for every execution event. Unknown/unregistered capabilities cannot produce `EXECUTION_AUTHORIZED`.                                   |
| `execution_target_type`               | Stable type such as `url`, `file`, or registered resource type. Required when the capability has a target.                                                                        |
| `execution_target`                    | Optional normalized, redacted, bounded representation up to 1024 bytes; never raw credentials, URL userinfo, sensitive query strings, or unnormalized model text. Default `null`. |
| `execution_target_hash`               | Hash of the complete deterministic normalized target representation used for authorization. Required when a target exists.                                                        |
| `execution_parameters_schema_version` | Version of the registered capability parameter schema. Required when parameters exist.                                                                                            |
| `execution_parameters_hash`           | Hash of validated normalized parameters after secrets have been removed and replaced with non-secret reference IDs. Raw secrets are not hash inputs.                              |
| `proposal_hash`                       | Hash of the validated normalized untrusted proposal. Required from `EXECUTION_PROPOSED` onward. It proves proposal linkage, not permission.                                       |
| `execution_decision`                  | `NOT_REQUESTED`, `PENDING`, `AUTHORIZED`, `DENIED`, or `ERROR_DENIED`. Represents deterministic authorization, never model preference.                                            |

A deterministic evaluator error is recorded as `policy_decision: ERROR` and
`execution_decision: ERROR_DENIED`. It cannot be represented as `AUTHORIZED`.

### 8.5 Errors and bounded attributes

`error_code` is a stable machine-readable code up to 128 bytes. Raw exception
text is not a canonical error code. `error_detail_optional` is redacted,
optional, and limited to 1024 UTF-8 bytes; stack traces and environment dumps
are prohibited.

`attributes` is not arbitrary JSON. It contains at most eight keys from this fixed
version `1` allowlist: `adapter`, `operation`, `truncated`,
`retry_of_execution_attempt_id`, `outcome_receipt_id`,
`content_capture_policy`, `result_count`, and `duration_ms`. Values are only
boolean, safe integer, or UTF-8 string up to 256 bytes. Nested objects, arrays,
unknown keys, and secret values are invalid. Adding another key requires an
explicit schema-version decision.

## 9. Event taxonomy

Version `1` supports these event types. “Supported” means the schema reserves a
validated lifecycle contract; current runtime emission begins only in the phase
listed.

| Event type                        | Meaning                                                                                                                          | First intended integration           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `CHAT_REQUEST_RECEIVED`           | Server accepted one chat-processing attempt.                                                                                     | Phase 2G                             |
| `GOVERNANCE_CONTEXT_EVALUATED`    | Actor/workspace/policy context resolution completed or failed.                                                                   | Phase 3                              |
| `GUARDRAIL_EVALUATED`             | Deterministic and optional semantic chat guardrail evidence recorded.                                                            | Phase 3/4                            |
| `RETRIEVAL_COMPLETED`             | Retrieval stage ended with ordered chunk evidence or a known failure/partial result.                                             | Phase 2G                             |
| `MODEL_STARTED`                   | A model request was dispatched.                                                                                                  | Phase 2G                             |
| `MODEL_COMPLETED`                 | A model request returned an accepted final response.                                                                             | Phase 2G                             |
| `MODEL_FAILED`                    | A model request ended in a known failure.                                                                                        | Phase 2G                             |
| `EXECUTION_PROPOSED`              | An untrusted normalized proposal was observed.                                                                                   | Phase 5                              |
| `EXECUTION_AUTHORIZED`            | Deterministic capability, target, and parameter checks allowed one intended attempt and mandatory authorization audit committed. | Phase 5                              |
| `EXECUTION_DENIED`                | Deterministic checks or required context denied; no executor start is permitted.                                                 | Phase 5                              |
| `EXECUTION_STARTED`               | The restricted executor began one physical attempt.                                                                              | Phase 5                              |
| `EXECUTION_COMPLETED`             | The physical attempt is known to have completed successfully.                                                                    | Phase 5                              |
| `EXECUTION_FAILED`                | The physical attempt is known not to have completed successfully and no effect remains unresolved.                               | Phase 5                              |
| `EXECUTION_PARTIAL`               | Some effects are known to have succeeded and others failed.                                                                      | Phase 5                              |
| `EXECUTION_OUTCOME_UNKNOWN`       | Dispatch occurred but final external state cannot currently be established.                                                      | Phase 5                              |
| `DIRECT_MUTATION_REQUESTED`       | A security-relevant UI/API mutation was requested through its normal service path.                                               | Later protected-mutation integration |
| `DIRECT_MUTATION_AUTHORIZED`      | Route/object authorization succeeded and mandatory pre-mutation audit committed.                                                 | Later protected-mutation integration |
| `DIRECT_MUTATION_DENIED`          | Route/object authorization denied; mutation must not start.                                                                      | Later protected-mutation integration |
| `DIRECT_MUTATION_COMPLETED`       | Same-database or external mutation is known complete.                                                                            | Later protected-mutation integration |
| `DIRECT_MUTATION_FAILED`          | Mutation is known failed with no unresolved effect.                                                                              | Later protected-mutation integration |
| `DIRECT_MUTATION_PARTIAL`         | Some direct-mutation subeffects are known successful and others failed.                                                          | Later protected-mutation integration |
| `DIRECT_MUTATION_OUTCOME_UNKNOWN` | Mutation dispatch occurred but final external state cannot currently be established.                                             | Later protected-mutation integration |

Audit verification and checkpoint creation are deliberately not version `1`
event types. Phase 2E/2F verification reports and authenticated checkpoint files
have distinct trust semantics; recording them in the chain may later be useful
but cannot make them self-authenticating.

## 10. Field applicability matrix

`R` means required, `C` means conditionally required as described, `N` means
must be null/empty/default, and `O` means optional.

| Field group                   | Chat request | Retrieval | Model     | Governance               | Execution proposal/decision | Execution start/outcome      | Direct mutation |
| ----------------------------- | ------------ | --------- | --------- | ------------------------ | --------------------------- | ---------------------------- | --------------- |
| Core version/event/order/time | R            | R         | R         | R                        | R                           | R                            | R               |
| Effective principal           | R            | R         | R         | R                        | R                           | R                            | R               |
| Initiator/delegation          | C            | C         | C         | C                        | C                           | C                            | C               |
| Executor                      | O            | O         | R         | O                        | C                           | R                            | O               |
| `workspace_id`                | R            | R         | R         | R for workspace policy   | R                           | R                            | C               |
| `thread_id`                   | C            | C         | C         | C                        | C                           | C                            | C               |
| `chat_id`                     | O            | O         | O         | O                        | O                           | O                            | N               |
| Request/correlation IDs       | R            | R         | R         | R                        | R                           | R                            | R               |
| `execution_attempt_id`        | N            | N         | N         | N                        | C at authorization          | R                            | N               |
| `idempotency_key`             | N            | N         | N         | N                        | C                           | C                            | C               |
| Query fields                  | R            | C         | C         | C                        | O                           | O                            | N               |
| Retrieval fields              | N            | R         | O         | N                        | O                           | O                            | N               |
| Policy reference/decision     | C            | C         | C         | R                        | R                           | R                            | C               |
| Model identity                | N            | N         | R         | C only semantic evidence | O                           | O                            | N               |
| Execution fields              | N/default    | N/default | N/default | N/default                | R                           | R                            | N/default       |
| Resource identity             | O            | O         | O         | O                        | O                           | O                            | R               |
| Response fields               | N            | N         | C         | N                        | N                           | O only tool outcome evidence | N               |
| Error fields                  | C on failure | C         | C         | C                        | C                           | C                            | C               |
| Chain fields                  | R            | R         | R         | R                        | R                           | R                            | R               |

Event-specific required combinations override group-level optionality. A
validator must not accept “everything nullable” merely because the union has
different event shapes.

## 11. Lifecycle and completion-state semantics

### 11.1 Completion states

| State       | Meaning                                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `PENDING`   | This event records a begun/requested stage whose later terminal state is not represented by this event. It is not an authorization decision. |
| `COMPLETED` | The stage represented by this event completed successfully. It does not imply the whole correlation completed.                               |
| `FAILED`    | The stage is known to have failed. For an external execution, Sentinel has evidence that no unresolved success remains.                      |
| `PARTIAL`   | Some subeffects succeeded and some failed; reconciliation is required.                                                                       |
| `UNKNOWN`   | Dispatch may have caused an effect, but Sentinel cannot establish final external state. It is materially different from failure.             |
| `DENIED`    | Deterministic authorization or required context prohibited continuation.                                                                     |

### 11.2 Valid event/state combinations

| Event type                                                                                                                  | Allowed completion state(s)                          |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `CHAT_REQUEST_RECEIVED`, `MODEL_STARTED`, `EXECUTION_PROPOSED`, `EXECUTION_STARTED`, `DIRECT_MUTATION_REQUESTED`            | `PENDING`                                            |
| `GOVERNANCE_CONTEXT_EVALUATED`, `GUARDRAIL_EVALUATED`, `RETRIEVAL_COMPLETED`                                                | `COMPLETED`, `FAILED`, or `PARTIAL` where meaningful |
| `MODEL_COMPLETED`, `EXECUTION_AUTHORIZED`, `DIRECT_MUTATION_AUTHORIZED`, `EXECUTION_COMPLETED`, `DIRECT_MUTATION_COMPLETED` | `COMPLETED`                                          |
| `MODEL_FAILED`, `EXECUTION_FAILED`, `DIRECT_MUTATION_FAILED`                                                                | `FAILED`                                             |
| `EXECUTION_DENIED`, `DIRECT_MUTATION_DENIED`                                                                                | `DENIED`                                             |
| `EXECUTION_PARTIAL`, `DIRECT_MUTATION_PARTIAL`                                                                              | `PARTIAL`                                            |
| `EXECUTION_OUTCOME_UNKNOWN`, `DIRECT_MUTATION_OUTCOME_UNKNOWN`                                                              | `UNKNOWN`                                            |

### 11.3 Chat lifecycle

```text
CHAT_REQUEST_RECEIVED
  -> GOVERNANCE_CONTEXT_EVALUATED (when Phase 3 is integrated)
  -> GUARDRAIL_EVALUATED (when applicable)
  -> RETRIEVAL_COMPLETED (when retrieval is attempted)
  -> MODEL_STARTED
  -> MODEL_COMPLETED | MODEL_FAILED
```

Retrieval or guardrail failure may terminate before `MODEL_STARTED`. A crash or
process loss may leave a pending stage without a terminal event; later code must
not fabricate history.

### 11.4 Governed execution lifecycle

```text
EXECUTION_PROPOSED
  -> EXECUTION_AUTHORIZED | EXECUTION_DENIED
  -> EXECUTION_STARTED
  -> EXECUTION_COMPLETED
     | EXECUTION_FAILED
     | EXECUTION_PARTIAL
     | EXECUTION_OUTCOME_UNKNOWN
```

Rules:

- `EXECUTION_DENIED` must never be followed by `EXECUTION_STARTED` for the same
  proposal/attempt.
- `EXECUTION_AUTHORIZED` is the mandatory pre-effect audit event. If that append
  fails, the audit chain contains no fabricated authorization event and the
  executor does not start.
- `EXECUTION_STARTED` requires the same principal, workspace, policy reference,
  proposal hash, correlation, idempotency key, and execution-attempt ID as its
  authorization event.
- Each physical retry creates a new execution-attempt ID. A retry never changes
  an earlier terminal event.
- `UNKNOWN` means the effect may or may not have occurred. It must not be retried
  automatically unless the capability contract proves idempotency.
- `PARTIAL` means at least one subeffect is known successful and another is known
  unsuccessful. It requires reconciliation rather than relabeling as failed.

### 11.5 Direct mutation lifecycle

```text
DIRECT_MUTATION_REQUESTED
  -> DIRECT_MUTATION_AUTHORIZED | DIRECT_MUTATION_DENIED
  -> DIRECT_MUTATION_COMPLETED
     | DIRECT_MUTATION_FAILED
     | DIRECT_MUTATION_PARTIAL
     | DIRECT_MUTATION_OUTCOME_UNKNOWN
```

Direct mutations remain on their existing route/service path. They do not pass
through AIbitat or the agent executor. A same-database terminal event may later
share the mutation transaction under ADR-001. External partial and unknown
mutation outcomes use their explicit event types and require reconciliation.

## 12. Privacy classification and redaction policy

### 12.1 Field classes

| Class                     | Examples                                                                        | Policy                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Identifier                | event, request, correlation, workspace, principal, policy-version IDs           | Store only stable non-secret identifiers. Never use bearer material as identity.                                          |
| Security metadata         | event type, decisions, reason/rule codes, capability, completion state          | Store explicitly, validate strictly, and bound lengths.                                                                   |
| Hashed content            | query, retrieval manifest, policy input, proposal, target, parameters, response | Store the digest placeholder and defined semantics; avoid raw content. Hash equality may still reveal low-entropy values. |
| Bounded optional content  | redacted query/response, target summary, reason/error detail                    | Default off or null, explicit policy only, strict byte limits and authorization.                                          |
| Prohibited secret/content | credentials and unconstrained payloads                                          | Reject; never persist in the audit event.                                                                                 |

### 12.2 Prohibited values

Audit events must never store passwords, API/provider/MCP/integration tokens,
Authorization or proxy-authorization headers, cookies, session/JWT secrets,
private keys, recovery secrets, raw bearer credentials, environment dumps, SQL
credentials, credential files, URL userinfo, or decrypted secret values.

The default also prohibits raw email bodies, calendar descriptions, document or
retrieved chunk text, full prompts, full model responses, arbitrary tool output,
raw execution parameters, and stack traces. Credential references may be stored
only as stable non-secret IDs.

### 12.3 Optional raw query/response policy

Raw query and response storage is **off by default**. If a later explicit
configuration permits it, both instance and workspace policy must enable it,
the viewer must be separately authorized, redaction must run first, and the
event must enforce these UTF-8 byte limits:

- `query_optional`: 4096 bytes;
- `response_optional`: 8192 bytes;
- `execution_target`: 1024 bytes;
- `policy_reason`: 512 bytes;
- `error_detail_optional`: 1024 bytes.

Truncation must be explicit in an allowlisted attribute; it must not silently
change the associated hash meaning. Raw execution parameters remain prohibited
even when optional query/response capture is enabled.

### 12.4 Redaction principles

1. Construct events from an allowlist of typed fields; do not sanitize and store
   arbitrary request/tool objects.
2. Remove secrets before hashing or optional-content handling. Raw secrets do
   not become safe merely because a plain hash is stored.
3. Reject known secret-bearing keys such as `authorization`, `password`,
   `api_token`, `cookie`, and `private_key` in bounded attributes.
4. Enforce byte and collection limits before append to resist log flooding.
5. Do not store nested arbitrary metadata, raw headers, environment variables,
   stack traces, email/document bodies, or tool results.
6. Secret-name detection is defense in depth, not a guarantee. Structured
   allowlisting and omission are the primary controls.

## 13. Decision and reason-code conventions

Initial stable reason categories include:

```text
AUTHORIZED_POLICY_MATCH
DENIED_CAPABILITY
DENIED_TARGET
DENIED_PARAMETERS
DENIED_UNKNOWN_CAPABILITY
DENIED_POLICY_ERROR
DENIED_POLICY_CHANGED
DENIED_CONTEXT_ERROR
DENIED_AUDIT_ERROR
MODEL_ERROR
RETRIEVAL_ERROR
EXECUTION_TIMEOUT_UNKNOWN
EXTERNAL_PARTIAL
DIRECT_MUTATION_AUTHORIZED
```

Phase 3/5 may add codes using the prefixes `AUTHORIZED_`, `DENIED_`,
`ERROR_`, `MODEL_`, `RETRIEVAL_`, `EXECUTION_`, or `DIRECT_MUTATION_` without
changing existing meanings. A code is uppercase ASCII with underscores, at most
128 bytes. Model prose cannot create a reason code.

`DENIED_AUDIT_ERROR` describes fail-closed behavior in operational diagnostics
or a later safely recorded recovery event. An unavailable mandatory audit store
cannot record its own failed append, and no event may be fabricated afterward as
if it had committed before the denied effect.

## 14. Hash-field semantics for Phase 2B

No hash is calculated in Phase 2A. These definitions specify what later hashing
must represent:

| Field                       | Semantic input                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `query_hash`                | Exact accepted UTF-8 query bytes before prompt augmentation.                                                                                 |
| `retrieval_hash`            | Ordered manifest actually supplied as retrieved context: stable chunk/source IDs, per-chunk content hashes, order, and truncation metadata.  |
| `policy_hash`               | Immutable canonical structured policy version.                                                                                               |
| `policy_input_hash`         | Normalized deterministic evaluator input, with prohibited secrets omitted/replaced by non-secret references.                                 |
| `proposal_hash`             | Strictly validated normalized proposal, while remaining untrusted evidence.                                                                  |
| `execution_target_hash`     | Complete normalized target object used by deterministic target authorization.                                                                |
| `execution_parameters_hash` | Validated normalized parameter object after raw credentials/secrets are excluded.                                                            |
| `response_hash`             | Exact final UTF-8 response bytes accepted for delivery/persistence.                                                                          |
| `previous_event_hash`       | Hash of the previous committed global-chain event under that event's schema rules.                                                           |
| `event_hash`                | Canonical versioned event containing every security-relevant field, including `previous_event_hash`, and excluding only `event_hash` itself. |

Phase 2B will define canonical JSON bytes, Unicode handling, genesis linkage,
hash algorithm encoding, and deterministic vectors. Event-chain SHA-256 is
separate from ADR-005 checkpoint HMAC authentication.

## 15. Invalid-event behavior

A version `1` event is invalid if it has an unknown schema/event/principal/
executor/decision/completion value; an unknown top-level or attributes key; a
missing required field; an impossible event/state combination; malformed UUID,
decimal sequence, timestamp, or hash; conflicting principal and `user_id`;
missing required workspace/policy/execution context; duplicate/oversized list;
oversized text/metadata; nested arbitrary metadata; or a prohibited
secret-bearing field/value source.

Validation must return a structured local error and must not coerce, drop
unknown security fields, partially append, or fall back to `event_logs`.

- Before a protected effect: invalid event or mandatory append failure denies
  and the executor does not start.
- After an external dispatch: invalid outcome evidence cannot be relabeled as a
  clean failure. The system enters a degraded/reconciliation path and preserves
  the known attempt state when audit storage becomes available.
- Ordinary chat degraded behavior is a Phase 2G decision; this schema does not
  grant permission to silently omit required security events.

## 16. Sanitized illustrative examples

The hashes below are repeated-character placeholders with the correct length;
they are not calculated SHA-256 results or canonical Phase 2B fixtures. Null and
empty fields from the complete logical structure are omitted for readability.

### 16.1 Chat request

```json
{
  "schema_version": 1,
  "event_id": "11111111-1111-4111-8111-111111111111",
  "sequence_number": "1",
  "timestamp_utc": "2026-08-16T10:00:00.000Z",
  "event_type": "CHAT_REQUEST_RECEIVED",
  "completion_state": "PENDING",
  "principal_type": "user",
  "principal_id": "42",
  "user_id": 42,
  "workspace_id": 7,
  "request_id": "21111111-1111-4111-8111-111111111111",
  "correlation_id": "31111111-1111-4111-8111-111111111111",
  "query_hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "policy_decision": "NOT_APPLICABLE",
  "execution_requested": false,
  "execution_decision": "NOT_REQUESTED",
  "previous_event_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "event_hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

### 16.2 Retrieval completion

```json
{
  "schema_version": 1,
  "event_id": "12222222-2222-4222-8222-222222222222",
  "sequence_number": "2",
  "timestamp_utc": "2026-08-16T10:00:00.100Z",
  "event_type": "RETRIEVAL_COMPLETED",
  "completion_state": "COMPLETED",
  "principal_type": "user",
  "principal_id": "42",
  "user_id": 42,
  "workspace_id": 7,
  "request_id": "21111111-1111-4111-8111-111111111111",
  "correlation_id": "31111111-1111-4111-8111-111111111111",
  "query_hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "retrieval_chunk_ids": ["doc-fake:chunk-1", "doc-fake:chunk-4"],
  "retrieval_hash": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "policy_decision": "NOT_APPLICABLE",
  "execution_requested": false,
  "execution_decision": "NOT_REQUESTED",
  "previous_event_hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "event_hash": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
}
```

### 16.3 Execution authorized

```json
{
  "schema_version": 1,
  "event_id": "13333333-3333-4333-8333-333333333333",
  "sequence_number": "20",
  "timestamp_utc": "2026-08-16T10:01:00.000Z",
  "event_type": "EXECUTION_AUTHORIZED",
  "completion_state": "COMPLETED",
  "principal_type": "api_key",
  "principal_id": "9",
  "workspace_id": 7,
  "request_id": "23333333-3333-4333-8333-333333333333",
  "correlation_id": "33333333-3333-4333-8333-333333333333",
  "execution_attempt_id": "43333333-3333-4333-8333-333333333333",
  "idempotency_key": "53333333-3333-4333-8333-333333333333",
  "policy_profile": "security",
  "policy_version_id": "policy-version-fake-12",
  "policy_version": "12",
  "policy_hash": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "policy_input_hash": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "policy_decision": "ALLOW",
  "policy_reason_code": "AUTHORIZED_POLICY_MATCH",
  "policy_rules_triggered": ["CAPABILITY_HTTP_GET", "TARGET_EXAMPLE_TEST"],
  "execution_requested": true,
  "execution_capability": "HTTP_GET",
  "execution_target_type": "url",
  "execution_target": "https://example.test/public",
  "execution_target_hash": "1111111111111111111111111111111111111111111111111111111111111111",
  "execution_parameters_schema_version": "1",
  "execution_parameters_hash": "2222222222222222222222222222222222222222222222222222222222222222",
  "proposal_hash": "3333333333333333333333333333333333333333333333333333333333333333",
  "execution_decision": "AUTHORIZED",
  "previous_event_hash": "4444444444444444444444444444444444444444444444444444444444444444",
  "event_hash": "5555555555555555555555555555555555555555555555555555555555555555"
}
```

### 16.4 Execution denied; no start

```json
{
  "schema_version": 1,
  "event_id": "14444444-4444-4444-8444-444444444444",
  "sequence_number": "30",
  "timestamp_utc": "2026-08-16T10:02:00.000Z",
  "event_type": "EXECUTION_DENIED",
  "completion_state": "DENIED",
  "principal_type": "scheduled",
  "principal_id": "schedule-run-55",
  "initiating_principal_type": "user",
  "initiating_principal_id": "42",
  "delegation_chain": [
    {
      "principal_type": "user",
      "principal_id": "42",
      "relationship": "scheduled"
    }
  ],
  "executor_type": "schedule_worker",
  "executor_id": "scheduled-job-worker",
  "workspace_id": 7,
  "request_id": "24444444-4444-4444-8444-444444444444",
  "correlation_id": "34444444-4444-4444-8444-444444444444",
  "policy_profile": "security",
  "policy_version_id": "policy-version-fake-12",
  "policy_version": "12",
  "policy_hash": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "policy_input_hash": "6666666666666666666666666666666666666666666666666666666666666666",
  "policy_decision": "DENY",
  "policy_reason_code": "DENIED_TARGET",
  "policy_rules_triggered": ["TARGET_EXAMPLE_TEST"],
  "execution_requested": true,
  "execution_capability": "HTTP_GET",
  "execution_target_type": "url",
  "execution_target": "https://denied.example.test/",
  "execution_target_hash": "7777777777777777777777777777777777777777777777777777777777777777",
  "execution_parameters_schema_version": "1",
  "execution_parameters_hash": "8888888888888888888888888888888888888888888888888888888888888888",
  "proposal_hash": "9999999999999999999999999999999999999999999999999999999999999999",
  "execution_decision": "DENIED",
  "previous_event_hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "event_hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

No `EXECUTION_STARTED` event may exist for this proposal/attempt.

### 16.5 Execution completed

```json
{
  "schema_version": 1,
  "event_id": "15555555-5555-4555-8555-555555555555",
  "sequence_number": "22",
  "timestamp_utc": "2026-08-16T10:01:00.400Z",
  "event_type": "EXECUTION_COMPLETED",
  "completion_state": "COMPLETED",
  "principal_type": "api_key",
  "principal_id": "9",
  "executor_type": "openclaw",
  "executor_id": "restricted-openclaw-runtime",
  "workspace_id": 7,
  "request_id": "23333333-3333-4333-8333-333333333333",
  "correlation_id": "33333333-3333-4333-8333-333333333333",
  "execution_attempt_id": "43333333-3333-4333-8333-333333333333",
  "idempotency_key": "53333333-3333-4333-8333-333333333333",
  "policy_version_id": "policy-version-fake-12",
  "policy_version": "12",
  "policy_hash": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "policy_decision": "ALLOW",
  "execution_requested": true,
  "execution_capability": "HTTP_GET",
  "execution_target_type": "url",
  "execution_target_hash": "1111111111111111111111111111111111111111111111111111111111111111",
  "execution_parameters_schema_version": "1",
  "execution_parameters_hash": "2222222222222222222222222222222222222222222222222222222222222222",
  "proposal_hash": "3333333333333333333333333333333333333333333333333333333333333333",
  "execution_decision": "AUTHORIZED",
  "previous_event_hash": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "event_hash": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
}
```

### 16.6 Execution outcome unknown

```json
{
  "schema_version": 1,
  "event_id": "16666666-6666-4666-8666-666666666666",
  "sequence_number": "42",
  "timestamp_utc": "2026-08-16T10:03:30.000Z",
  "event_type": "EXECUTION_OUTCOME_UNKNOWN",
  "completion_state": "UNKNOWN",
  "principal_type": "user",
  "principal_id": "42",
  "user_id": 42,
  "executor_type": "mcp_tool",
  "executor_id": "fake-mcp-server/http_get",
  "workspace_id": 7,
  "request_id": "26666666-6666-4666-8666-666666666666",
  "correlation_id": "36666666-6666-4666-8666-666666666666",
  "execution_attempt_id": "46666666-6666-4666-8666-666666666666",
  "idempotency_key": "56666666-6666-4666-8666-666666666666",
  "context_refs": [
    { "type": "mcp_server", "id": "fake-mcp-server" },
    { "type": "mcp_tool", "id": "http_get" }
  ],
  "policy_version_id": "policy-version-fake-12",
  "policy_version": "12",
  "policy_hash": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "policy_decision": "ALLOW",
  "policy_reason_code": "AUTHORIZED_POLICY_MATCH",
  "execution_requested": true,
  "execution_capability": "HTTP_GET",
  "execution_target_type": "url",
  "execution_target_hash": "1212121212121212121212121212121212121212121212121212121212121212",
  "execution_parameters_schema_version": "1",
  "execution_parameters_hash": "2323232323232323232323232323232323232323232323232323232323232323",
  "proposal_hash": "3434343434343434343434343434343434343434343434343434343434343434",
  "execution_decision": "AUTHORIZED",
  "error_code": "EXECUTION_TIMEOUT_UNKNOWN",
  "previous_event_hash": "4545454545454545454545454545454545454545454545454545454545454545",
  "event_hash": "5656565656565656565656565656565656565656565656565656565656565656"
}
```

### 16.7 Mandatory audit append failure

If deterministic authorization would allow an operation but the mandatory
`EXECUTION_AUTHORIZED` append fails, no successful audit event exists to show.
The required behavior is:

```text
authorization result would be ALLOW
  -> mandatory authorization event append fails
  -> executor is not invoked
  -> safe operational health/error signal may report DENIED_AUDIT_ERROR
  -> no later event is fabricated as if pre-effect audit had committed
```

## 17. Threat and ADR traceability

The schema carries typed principal/workspace/delegation evidence for `TM-002`,
`TM-003`, `TM-004`, `TM-005`, and `TM-006`; proposal, executor, policy, and
lifecycle evidence for `TM-001`, `TM-007`, `TM-008`, `TM-009`, and `TM-018`;
chain fields for `TM-012` and `TM-013`; partial/unknown outcomes for `TM-014`;
distinct correlation, idempotency, and attempt identifiers for `TM-015`; and
privacy restrictions for `TM-017`.

It does not itself enforce authorization, persistence, hashing, checkpointing,
redaction, or executor isolation. Those controls remain owned by the later
phases identified in the accepted ADRs and threat model.

## 18. Known limitations

- UUID uniqueness depends on a correct random generator; Phase 2C must treat a
  collision as an append failure.
- Server timestamps are vulnerable to host clock error. Sequence order, not
  time, determines the chain.
- Plain hashes can disclose equality and support guessing of low-entropy content.
  Data minimization remains primary; a future keyed privacy construction would
  require a separate decision.
- Context references and bounded attributes preserve provenance but do not prove
  that an external MCP/tool/system reported truthfully.
- The final Prisma columns/indexes and transaction layout are Phase 2C work.
- Content-specific normalization remains owned by its producing phase. Event
  canonicalization, hash encoding, null/omission rules, Unicode, and genesis
  linkage are fixed by section 21.
- Event-specific direct-mutation resource and operation allowlists remain later
  integration work within the fixed version `1` field semantics.

## 19. Phase 2B handoff

Phase 2B may assume:

1. schema version is integer `1`;
2. sequence values are represented logically as unsigned decimal strings;
3. timestamps are server-controlled millisecond UTC strings;
4. every security-relevant version `1` field participates in `event_hash`, with
   only `event_hash` excluded;
5. array order is meaningful for delegation, context references, retrieval
   chunks, and triggered policy rules;
6. raw secret values are removed before any content-specific hash input is
   formed; and
7. examples in this document are illustrative, not canonical hash vectors.

Phase 2B must not silently change these semantics. If canonicalization analysis
finds a contradiction, work must stop for schema review rather than rewriting
the accepted event meaning during hashing implementation.

## 20. Phase 2A Definition of Done evidence

- [x] Schema documented: sections 3 through 8.
- [x] Event lifecycle documented: sections 9 through 11.
- [x] Privacy decision documented: section 12.
- [x] Event types documented: section 9.
- [x] Forward-compatible schema version exists: section 3 defines version `1`.
- [x] `PROGRESS.md` updated in the Phase 2A work unit.

## 21. Phase 2B canonicalization and chain-hash specification

Phase 2B implements the schema-version-`1` canonicalizer in
`server/utils/audit/canonicalize.js` and the event-chain helper in
`server/utils/audit/hashChain.js`. These are pure in-memory utilities: they do
not allocate IDs or sequences, read a database head, append rows, verify stored
chains, or emit runtime audit events.

### 21.1 Canonical value domain

Canonical input is limited to `null`, strings, booleans, finite JSON numbers,
dense arrays, and plain objects whose prototype is either `Object.prototype` or
`null`. Only enumerable own string-keyed data properties are accepted. Accessor
properties are rejected without invocation. Functions, symbols and symbol
properties, `undefined`, `BigInt`, sparse or extended arrays, `Date`, `Buffer`,
typed arrays, `Map`, `Set`, regular expressions, and custom class instances are
rejected. Circular references are rejected deterministically.

The canonicalizer provides defense-in-depth limits of 64 nested levels, 10,000
array/object entries, 1 MiB per input string, and 2 MiB of final canonical UTF-8
bytes. The stricter Phase 2A event-field and collection limits remain
authoritative and must be validated before hashing; these broader serializer
limits do not broaden the event schema. Errors are stable local codes and never
fall back to `JSON.stringify` or another hash input.

### 21.2 Canonical encoding rules

- Output from `canonicalize` is a JSON-compatible JavaScript string;
  `canonicalizeToBuffer` explicitly encodes it as UTF-8 bytes.
- Object keys are recursively sorted by ascending UTF-16 code-unit comparison.
  Object construction and insertion order never affect output. Inherited
  properties are ignored because non-plain objects are rejected and only own
  descriptors are read.
- Array order is preserved exactly. Canonicalization never sorts or otherwise
  infers the semantics of arrays such as delegation chains, context references,
  retrieval chunk IDs, or policy-rule IDs.
- `null`, `true`, `false`, and the empty string have distinct literal forms.
  A present null field differs from an absent field. Phase 2A requires all
  version-`1` event keys, so a later schema validator must reject absent required
  keys before hashing.
- Strings preserve their Unicode code points; NFC/NFD normalization is not
  performed. Valid surrogate pairs are emitted as their characters. Lone
  surrogates are escaped as lowercase `\\uXXXX`. Quotation marks, backslashes,
  control characters, newlines, and tabs use explicit JSON escaping. Canonical
  bytes are UTF-8 and are independent of locale or machine timezone.
- Numbers must be finite. Safe integers use their decimal form, finite
  non-integers use ECMAScript `Number` string form, and negative zero is encoded
  as `0`. Unsafe integers, `NaN`, and positive/negative infinity are rejected.
  Security-sensitive large integers such as `sequence_number` remain Phase 2A
  decimal strings and are never converted to `Number`.
- Timestamp objects and alternative timestamp strings are not converted.
  `canonicalizeAuditEvent` accepts only the Phase 2A server-controlled
  `YYYY-MM-DDTHH:mm:ss.sssZ` UTC string whose calendar value round-trips exactly.
- Own keys named `__proto__`, `constructor`, or `prototype` are serialized as
  ordinary strings without merging or assignment. They cannot alter a
  prototype during canonicalization.

### 21.3 Event-chain input and genesis

`canonicalizeAuditEvent` supports only integer `schema_version: 1`; other
versions fail closed so future schema versions require an explicit reviewed
canonicalizer. It requires a positive decimal-string sequence and validates the
chain link as exactly 64 lowercase hexadecimal characters.

The named `GENESIS_PREVIOUS_HASH` value is exactly 64 ASCII zero characters:

```text
0000000000000000000000000000000000000000000000000000000000000000
```

Only `sequence_number: "1"` may use this sentinel. Sequence `"1"` must use it,
and later sequences must not. This sequence binding makes the sentinel
unambiguous even though it has the same lexical shape as a SHA-256 digest.

Hash construction accepts a complete pre-hash event whose own enumerable
`event_hash` field is explicitly `null`. A populated or absent `event_hash`
fails; callers cannot accidentally hash a stored hash value. The canonical hash
input copies every other own field without mutation. Consequently
`previous_event_hash`, `schema_version`, and every other security-relevant event
field are included, while only `event_hash` is excluded.

### 21.4 Event-hash algorithm and compatibility vectors

`computeAuditEventHash` hashes the canonical UTF-8 bytes with Node's built-in
SHA-256 and returns exactly 64 lowercase hexadecimal characters. It adds no
newline, prefix, salt, timestamp, randomness, environment value, or locale data.
This event-chain SHA-256 remains separate from ADR-005 checkpoint HMAC.

Reviewed deterministic fixtures live in
`server/__tests__/utils/audit/fixtures/v1GoldenVectors.js`. They contain literal
canonical strings and hashes for a complete Unicode/nested genesis event and a
second event linked to it:

| Fixture         | Expected SHA-256                                                   |
| --------------- | ------------------------------------------------------------------ |
| `GENESIS_EVENT` | `6b610d20a3b9f19db0c4c008f4bcdf3fa5447032605407e260e2b97b25e92421` |
| `SECOND_EVENT`  | `e35b3f704eb077bb206382cf41220825e3f48c76000f248366679d2b23b0aee1` |

The tests independently apply Node `crypto` to each literal golden canonical
string before checking the production helper. Any change to canonical bytes or
these vectors requires explicit schema/canonicalization compatibility review;
future versions must not silently reinterpret version `1` events.

### 21.5 Boundaries and handoff

The Phase 2B helper validates the hashing envelope (schema version, sequence,
timestamp, previous hash, and pre-hash `event_hash` state) and rejects unsafe
runtime values. It is not the complete Phase 2A event-schema validator. Later
event construction must enforce the closed field list, enums, event-specific
requirements, privacy rules, and byte/collection limits before invoking it.

Phase 2C may use these pure functions only inside its atomic sequence/head
transaction. Phase 2B does not implement Prisma models, migrations, head lookup,
sequence allocation, append, idempotency, full-chain verification,
checkpointing, chat hooks, or execution hooks.
