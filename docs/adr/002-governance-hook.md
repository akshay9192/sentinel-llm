# ADR-002: Resolve a typed governance context through a shared service at every covered entry path

Status: Accepted

## Context

The pinned browser workspace routes commonly run authenticated workspace
middleware before `streamChatWithWorkspace`. Developer API handlers resolve
workspaces separately, OpenAI-compatible and connector paths have different chat
implementations, agent work continues after an HTTP-to-WebSocket handoff, and
scheduled workers currently have no workspace or human owner.

Therefore neither Express middleware nor `streamChatWithWorkspace` is a
universal governance hook. [`THREAT_MODEL.md`](../THREAT_MODEL.md) requires an
effective actor, authorized workspace, immutable policy version, correlation
context, consistent adapter coverage, and fail-closed resolution.

### Threat-model drivers

`TM-002`, `TM-003`, `TM-004`, `TM-005`, `TM-006`, `TM-007`, `TM-015`, and
`TM-018`.

## Decision

Sentinel will implement an isolated, shared `GovernanceContextResolver` service.
Each supported browser, API, connector, agent, scheduled, and direct-mutation
adapter must call this service after authentication and resource authorization
and before a governed chat decision or protected operation.

The resolver returns an immutable request-scoped `GovernanceContext` containing:

- a non-null typed effective principal and, where applicable, initiating
  principal and delegation chain from [ADR-006](./006-single-vs-multi-user.md);
- the authorized workspace ID and stable slug, or an explicit instance scope for
  the small set of non-workspace administrative operations;
- the active governance profile and immutable policy-version ID/hash from
  [ADR-004](./004-policy-storage.md);
- operation and adapter type;
- server-generated `request_id` and `correlation_id` or a validated continuation
  of an existing correlation;
- thread, API-key, invocation, schedule, and run identifiers when relevant; and
- creation time and bounded expiry/continuation state.

Resolution rules are:

1. Browser routes reuse the authenticated user and authorized workspace already
   established by middleware, then call the shared resolver. Middleware is an
   adapter, not the source of governance semantics.
2. Developer API middleware must retain the matched API-key row and construct an
   `api_key` principal. The resolver validates that key's current scope against
   the requested workspace. A caller-provided session ID is never a principal.
3. Browser chat, developer API chat, OpenAI-compatible API, and every connector
   claimed as governed call the same governance decision contract. An optional
   path without an adapter is explicitly unsupported for governed profiles and
   denied rather than silently using vanilla behavior.
4. Agent handoff persists a signed or deterministically bound subset of the
   context with the invocation. WebSocket continuation must authenticate and
   match principal, workspace, invocation state, policy reference, expiry, and
   connection ownership before feedback or execution is trusted.
5. Scheduled creation stores its creator, workspace, and creation-time policy
   reference. At fire time the resolver constructs a fresh run context using the
   current principal status, workspace authorization, current policy, capability
   registry, and credentials. Missing or revoked context denies the run.
6. Direct security-sensitive UI/API mutations call the resolver at their
   route/service boundary and use ADR-001 audit hooks. They do not become model
   actions.
7. The policy snapshot is fixed for a single governance decision. Before a
   later protected effect, ADR-003 verifies that the workspace binding still
   points to the same active version; a change invalidates the proposal and
   requires a new decision rather than executing under stale authority.
8. Resolver failure, missing actor, missing required workspace, inaccessible or
   invalid policy, workspace-policy mismatch, or expired continuation fails
   closed. No adapter may synthesize an allow decision.

The resolver may use request-local memoization only. Cross-request caching of
security policy is deferred until it has explicit version keys and invalidation;
cache misses and cache errors never broaden access.

## Alternatives considered

- Express middleware only.
- A helper on the existing `Workspace` model.
- A hook only inside `streamChatWithWorkspace`.
- Independent governance calls implemented separately in every route.
- A shared context resolver/service invoked by narrow entry adapters.

## Why rejected

- Middleware-only coverage excludes developer API implementations, scheduled
  workers, and post-handoff WebSocket execution.
- A `Workspace` helper cannot represent API-key, instance, scheduled, service,
  delegation, correlation, or policy-snapshot semantics without overloading the
  upstream model.
- A chat-only hook misses direct mutations and protected execution and is
  bypassable through other chat implementations.
- Per-route policy logic would drift across high-churn endpoints and make parity
  difficult to test or rebase.
- The selected shared service centralizes semantics while retaining small,
  upstream-compatible adapters at the actual entry paths.

## Security implications

Actor and workspace resolution become mandatory inputs rather than nullable
metadata. Every covered adapter shares the same versioned policy semantics.
Authentication, workspace membership, policy management, audit viewing, and
execution authorization remain separate decisions. A semantic classifier may
add denial but cannot change deterministic denial.

The resolver does not authorize a final side effect. ADR-003 performs immediate
capability, target, and parameter authorization and verifies policy continuity at
the final executor boundary.

## Upgrade/rebase implications

Most code resides in isolated Sentinel identity/governance modules. Narrow calls
will be required after existing browser workspace middleware and in
`ApiChatHandler`, OpenAI-compatible/connector adapters, agent invocation setup,
the WebSocket endpoint, scheduled worker setup, and selected mutation services.
Large chat handlers and workspace models are not copied. Hooks in high-churn
files should be small and protected by adapter contract tests.

## Testing implications

Phases 3, 5, 6, and 8 must test missing/invalid/suspended principals,
single-user instance identity, API-key scope and revocation, wrong workspace,
slug/ID confusion, missing/stale/mismatched policy, policy change before effect,
browser/API/OpenAI-compatible/connector parity, unsupported-path denial,
WebSocket guessing/replay/cross-user/cross-workspace/race cases, scheduled
reauthorization, direct-mutation context, correlation propagation, and resolver
exceptions/timeouts.

## Known limitations

- Complete optional connector coverage is not yet inventoried; uncovered
  governed paths remain unsupported until adapted.
- Request-scoped consistency cannot make an obsolete policy safe after the
  workspace binding changes; final execution therefore checks continuity.
- The resolver depends on correct route authentication and object-level
  authorization, which still require the Phase 8 parity review.
- Exact context serialization and WebSocket binding format are implementation
  details for later phases.

## Implementation phases

Phase 3 implements policy resolution and chat adapters. Phase 5 extends the
context through protected execution. Phases 6 and 8 prove bypass resistance and
authorization parity.
