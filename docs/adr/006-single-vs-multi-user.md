# ADR-006: Support both user modes with typed non-null principals

Status: Accepted

## Context

AnythingLLM `v1.15.0` supports single-user and multi-user modes with materially
different identity behavior. Multi-user browser requests resolve a user row and
role. Single-user mode may have no user row and may bypass authentication in
development or unconfigured deployments. Developer API middleware authenticates
a global secret without retaining the key row as actor, scheduled jobs have no
persisted owner/workspace, and agents delegate work through invocation state.

A nullable `user_id` cannot express the actors required by audit, governance,
and execution. Sentinel also cannot claim both modes while leaving protected
single-user execution unattributed.

### Threat-model drivers

`TM-002`, `TM-003`, `TM-004`, `TM-005`, `TM-006`, `TM-012`, `TM-015`,
`TM-017`, and `TM-018`.

## Decision

Sentinel will support both AnythingLLM modes as first-class product postures and
will represent every protected operation with a **typed, non-null principal**.

The principal categories are:

- `instance_owner`: the stable synthetic principal for the one local operator in
  single-user mode;
- `user`: a current multi-user `users.id` plus current role/status;
- `api_key`: the retained API-key row ID with explicit workspace and operation
  scopes; its creator/issuer is provenance, not the effective caller;
- `scheduled`: a schedule/run principal whose authority is delegated from a
  persisted creator and revalidated at fire time;
- `service`: an allowlisted internal service identity such as the collector or a
  bounded background worker; and
- future explicitly registered executor identities, such as a restricted
  OpenClaw runtime, which remain delegated components rather than permission
  sources.

Agents, models, tools, MCP servers, flows, and imported skills do not become
human-equivalent authorization principals. They are recorded as delegation or
executor identities beneath the initiating/effective principal. Model output is
always untrusted input.

Mode rules are:

1. In single-user mode, `instance_owner` is used wherever protected audit,
   policy, or execution requires an actor. It has a stable installation-scoped
   identifier and is never represented as null. This does not silently improve
   upstream authentication; deployments without an auth token remain local
   single-operator deployments whose network exposure must be hardened.
2. In multi-user mode, the effective human principal comes from the current
   authenticated database row. Suspended, missing, stale, or unauthorized users
   deny protected operations. Admin/manager/member roles do not by themselves
   grant audit viewing, policy management, credential access, or execution;
   those remain explicit operation authorizations.
3. Developer API keys become principals in both modes. Protected operations are
   unavailable to legacy global keys until the key row is retained in request
   context and has explicit workspace/operation scope. Audit records the key ID,
   never its secret, and may also record issuer provenance.
4. Scheduled authority is never ownerless. A schedule stores creator principal,
   workspace, and capability/policy provenance. At fire time a `scheduled`
   principal is constructed only if its creator/delegation, workspace, active
   policy, and credentials are still valid as required by ADR-003.
5. Interactive and API agents carry initiating principal, effective principal,
   workspace, invocation, and delegation data through ADR-002. WebSocket UUID
   possession alone is insufficient.
6. Service principals receive only explicitly registered operations and cannot
   inherit instance-owner/admin authority. Their content and results remain
   untrusted.
7. ADR-001 persists a principal type and stable principal identifier plus
   optional initiating/delegated identity fields. No protected event or
   authorization uses a nullable actor as implicit permission.

## Alternatives considered

- Support multi-user mode only.
- Support single-user mode only.
- Use nullable `user_id` for non-human activity.
- Create a real database user row for single-user mode.
- Support both modes with a synthetic instance principal and typed principal
  union.

## Why rejected

- Multi-user-only would abandon the validated local-first baseline and upstream
  default use case.
- Single-user-only would avoid rather than solve workspace isolation, delegated
  identity, and administrator/member security requirements.
- Nullable actors make authorization and forensic attribution ambiguous and
  recreate the current API/scheduler gaps.
- A fabricated `users` row would couple single-user semantics to multi-user
  lifecycle, roles, migrations, and UI and could be mistaken for an authenticated
  human.
- The selected typed model preserves both upstream modes while making authority
  explicit.

## Security implications

Every protected decision can distinguish instance, human, API, scheduled, and
service authority while retaining delegation provenance. Authentication remains
separate from workspace, policy, audit, and execution authorization. API-key
secrets and session tokens are never principal identifiers in audit records.

Single-user mode still has a broad instance owner and therefore less tenant
isolation than multi-user mode. Multi-user administrators remain powerful and
their authorized harmful actions are a residual risk. Typed identities improve
attribution and policy evaluation but do not protect against stolen valid
credentials without revocation and session controls.

## Upgrade/rebase implications

Principal types should live in isolated Sentinel identity/context modules rather
than modifying the upstream user model into a polymorphic table. Narrow changes
are needed in session/API-key middleware, agent invocation persistence,
scheduler persistence, audit fields, and governance/execution adapters. Existing
user and workspace relationships remain intact, reducing upstream conflict.

## Testing implications

Phases 2-8 must test stable single-user `instance_owner` attribution,
single-user authenticated/unconfigured exposure assumptions, multi-user
admin/manager/member operation matrices, suspended/stale users, wrong workspace,
API-key row propagation/scope/revocation/replay, secret redaction, scheduled
creator deletion/role or membership change, service-principal least privilege,
delegated agent identity, WebSocket cross-user/workspace/replay cases, audit
query authorization, and non-null principal enforcement.

## Known limitations

- The detailed permission matrix for every existing and future endpoint is
  implemented and exhaustively reviewed in Phases 3, 5, and 8.
- A synthetic instance principal provides attribution, not proof of which person
  used an unlocked single-user deployment.
- Shared API keys remain ambiguous at the human level even after the key row is
  attributable; operational policy should avoid sharing and support rotation.
- Host administrators and compromised application processes remain outside the
  strongest identity guarantee.

## Implementation phases

The principal representation constrains Phase 2 audit schema, Phase 3
governance, Phase 5 execution and scheduling, Phase 7 audit/security UI, and
Phase 8 authentication/authorization hardening.
