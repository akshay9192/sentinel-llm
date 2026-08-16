# ADR-001: Store Sentinel audit events in dedicated tables in the application database

Status: Accepted

## Context

AnythingLLM `v1.15.0` uses Prisma 5.3.1 with SQLite at
`server/storage/anythingllm.db`. The pinned source already uses Prisma
transactions for selected application mutations. Its `event_logs` model has
only an event name, optional metadata, optional user ID, and timestamp;
`EventLogs.logEvent` catches write failures and `EventLogs.delete` can remove
rows. Chat history, scheduled traces, telemetry, and console logs have different
purposes and are not security audit records.

[`CODEBASE_NOTES.md`](../CODEBASE_NOTES.md) also establishes that application
SQLite, LanceDB, files, the collector, MCP processes, and external services
cannot share one transaction. [`THREAT_MODEL.md`](../THREAT_MODEL.md) therefore
requires mandatory authorization audit, ordered tamper-evident events,
correlation, privacy minimization, and honest partial or unknown outcomes.

### Threat-model drivers

`TM-003`, `TM-004`, `TM-005`, `TM-006`, `TM-012`, `TM-013`, `TM-014`,
`TM-015`, and `TM-017`.

## Decision

Sentinel audit events will live in **new, dedicated Prisma-managed tables in the
existing AnythingLLM SQLite database**. They will not reuse or extend
`event_logs`, and `event_logs` will remain optional operational history.

The Phase 2 design will provide these architectural properties:

1. One installation-wide append order and hash chain. Every event receives a
   monotonically increasing sequence number and previous-event hash in the same
   serialized transaction that selects the current head.
2. A dedicated Sentinel audit service is the only application write interface.
   Normal application code receives append and query contracts rather than raw
   table mutation access. Application-level update and delete operations are not
   part of the audit API.
3. Audit rows are queryable through indexed, typed fields for workspace,
   principal, event type, request, correlation, execution attempt, completion
   state, policy version, and time. Authorized viewers receive filtered results;
   chain verification remains a server-side privileged operation so filtered
   viewers do not need access to other workspaces' event contents.
4. Audit payloads favor identifiers, hashes, decision codes, and bounded redacted
   metadata. Passwords, bearer tokens, cookies, private keys, raw authorization
   headers, and unbounded prompt/tool content are prohibited.
5. `request_id` identifies one inbound processing attempt. `correlation_id`
   spans the logical request and its delegated work. `execution_attempt_id`
   identifies one physical effect attempt. An `idempotency_key`, where supplied
   or deterministically derived, identifies the logical operation whose replay
   must not create another effect. ADR-003 owns execution-time propagation;
   audit storage persists and constrains these values.
6. For a protected mutation wholly inside application SQLite, Sentinel first
   commits its authorization/intention event. The application mutation and its
   terminal success event then commit in one Prisma interactive transaction. If
   the terminal append fails, the mutation rolls back. A failed mutation records
   a separate failure event when storage is available; an authorization event
   without a terminal event remains a detectable incomplete attempt.
7. For files, LanceDB, collector calls, MCP, OpenClaw, and external services,
   Sentinel commits authorization before dispatch, records start/attempt state,
   and appends success, failure, partial, or `UNKNOWN_OUTCOME` afterward. It does
   not pretend that an external effect can be rolled back by SQLite. A missing
   terminal event remains reconcilable evidence rather than being fabricated.
8. Failure to commit a mandatory authorization event denies protected
   execution. SQLite busy/locked, disk, serialization, hashing, and transaction
   errors never fall back to `event_logs` or allow execution.
9. Ordered Prisma migrations will create and evolve the audit tables. Phase 2
   must test fresh and pinned-upstream upgrade databases, repeated startup,
   backup/restore, and contention. No parallel ad hoc schema mechanism is used.
10. Checkpoints authenticate the application-database chain outside the
    database as decided by [ADR-005](./005-audit-checkpointing.md).

Direct security-sensitive UI/API mutations use small route/service hooks that
call the audit service. They are not forced through the agent execution
pipeline described by [ADR-003](./003-execution-integration.md).

## Alternatives considered

### Reuse `event_logs`

This has the smallest schema change and existing UI/model support.

### New audit tables in the existing application SQLite database

This supports Prisma queries and lets same-database mutations share an
interactive transaction with their terminal audit event. Deployment, migration,
and backup remain aligned with the pinned application.

### Separate SQLite audit database

This provides logical file separation, independent retention, and a distinct
write client.

### Dedicated external append-oriented store

An external log service could provide independent retention and stronger
operational separation.

### Hybrid primary and shadow stores

Events could be committed to one primary store and asynchronously copied to a
second store.

## Why rejected

- `event_logs` is best-effort, deletable, weakly typed, and weakly correlated;
  changing its semantics would also couple security behavior to upstream
  operational logging callers.
- A separate SQLite database cannot atomically commit an application mutation
  and its terminal audit event. That creates an avoidable crash window for the
  most common local mutations while providing little protection from an
  attacker who can write arbitrary files on the same host.
- An external store adds network availability, deployment, credential, privacy,
  backup, and paid-service risks before the project has a local release
  candidate. It would make mandatory audit depend on another runtime service.
- A shadow store does not remove the need to choose an authoritative commit
  point and introduces divergence/reconciliation complexity. Authenticated
  checkpoints provide the required initial independent evidence more directly.

## Security implications

The selected design makes same-database mutation/outcome atomicity possible and
keeps authorization-audit failure fail closed. A global sequence prevents
independent workspace forks and yields one checkpoint head. Typed principals
from [ADR-006](./006-single-vs-multi-user.md) and immutable policy references
from [ADR-004](./004-policy-storage.md) are mandatory event inputs.

The audit chain shares the application database's compromise domain. A database
writer can rewrite rows and recompute hashes, so the chain is tamper-evident only
when verified against a trusted checkpoint. Audit-query authorization remains
separate from workspace membership. Hashing sensitive content does not by itself
make low-entropy values private, so minimization and keyed derivations may be
needed for selected fields in Phase 2.

## Upgrade/rebase implications

The implementation adds dedicated Prisma models and ordered migrations but does
not modify upstream `event_logs` callers. Most code stays in isolated Sentinel
audit modules. Small hooks will be required at selected mutation, chat, and
execution services. Prisma schema conflicts are possible during upstream
rebases, but avoiding changes to the existing event-log model limits that risk.

## Testing implications

Phase 2 must cover canonical fixtures, first and concurrent appends, duplicate
sequence rejection, transaction rollback, SQLite busy/locked and disk/write
failure, idempotent retry, request/correlation/attempt uniqueness, same-database
mutation rollback when terminal audit fails, authorization-audit failure before
effect, destructive modification/deletion/insertion/reordering/truncation, query
authorization, redaction, fresh/upgrade migration, restart, and backup/restore.
External-effect integration tests must exercise crash-before-dispatch,
effect-before-outcome, outcome-write failure, and reconciliation of unknown
outcomes in Phases 5 and 6.

## Known limitations

- SQLite cannot roll back external, filesystem, vector, collector, MCP, or
  OpenClaw effects.
- A compromised application process can submit false events or omit activity
  before controls run; host-root control is outside the local guarantee.
- One global chain may create write contention and requires privileged
  server-side verification for filtered workspace views.
- Database and independently protected checkpoint compromise together can
  defeat local historical evidence.
- Exact schema, canonical encoding, indexes, and transaction implementation are
  Phase 2 decisions constrained by this ADR, not implemented here.

## Implementation phases

Phases 2A-2G implement the event schema, canonical chain, atomic append,
idempotency, verification, checkpoint integration, and chat lifecycle. Phases 5
and 6 add execution lifecycle, external-effect, and fault coverage.
