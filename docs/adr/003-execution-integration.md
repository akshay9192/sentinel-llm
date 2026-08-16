# ADR-003: Use the existing agent framework for proposals and capability-specific restricted executors for effects

Status: Accepted

## Context

In the pinned source, `AIbitat.handleExecution` and
`AIbitat.handleAsyncExecution` see many model-selected function names and
arguments immediately before `fn.handler(args)`. This is a useful proposal
interception point, but it is only partial: built-in handlers own their final
effects, flows execute inner nodes directly, MCP delegates to remote servers or
processes, imported JavaScript runs in the server process, schedules use an
ephemeral agent with automatic approval, and direct UI/API mutations bypass
AIbitat.

The execution architecture must preserve AnythingLLM's agent framework without
mistaking tool selection, schemas, reranking, or approval prompts for
authorization. It must also integrate the future restricted OpenClaw runtime
without exposing a direct model-to-OpenClaw or HTTP-to-OpenClaw path.

### Threat-model drivers

`TM-001`, `TM-004`, `TM-005`, `TM-006`, `TM-007`, `TM-008`, `TM-009`,
`TM-010`, `TM-011`, `TM-012`, `TM-014`, `TM-015`, `TM-017`, `TM-018`, and
`TM-021`.

## Decision

AnythingLLM's existing agent/AIbitat framework remains the model interaction and
proposal carrier. Sentinel adds a narrow proposal-interception hook before
AIbitat dispatch, but **all governed side effects execute through registered,
capability-specific Sentinel executor adapters**. AIbitat is not the final
security boundary.

The logical contract is:

```text
untrusted model/tool proposal
-> strict proposal schema validation
-> capability/target/parameter normalization
-> immutable GovernanceContext
-> deterministic capability authorization
-> deterministic target authorization
-> deterministic parameter authorization
-> mandatory authorization audit commit
-> capability-specific restricted executor
-> completed / failed / partial / unknown outcome audit
```

The stages have these architectural homes:

1. A Sentinel proposal adapter converts provider/AIbitat function calls into one
   versioned action-proposal contract. Malformed, extra, ambiguous, or unknown
   fields deny.
2. The shared context from [ADR-002](./002-governance-hook.md) supplies the
   typed principal, workspace, immutable policy reference, request, correlation,
   and delegation state. The proposal itself cannot supply authoritative actor,
   workspace, policy, or credentials.
3. An isolated deterministic authorizer evaluates the registered capability,
   canonical target, and normalized parameters against the exact policy version
   from [ADR-004](./004-policy-storage.md). It verifies that the workspace still
   binds to that version immediately before execution. Unknowns and exceptions
   deny; deterministic denial is final.
4. [ADR-001](./001-audit-storage.md) must commit the authorization decision
   before dispatch. Failure denies execution.
5. A capability registry selects a final executor adapter with strict target
   types, parameter schema, side-effect class, timeout, output bound, credential
   references, logging policy, and idempotency semantics. Registration is
   explicit; unregistered AnythingLLM tools are unavailable for governed
   effects.
6. OpenClaw is the default Phase 5 restricted runtime for the initial governed
   read-only capabilities. It receives only the already-authorized normalized
   action and least-privilege credential references. Each adapter revalidates
   resolved paths, DNS addresses, redirects, and other TOCTOU-sensitive targets
   at the closest controllable effect boundary.
7. `request_id` and `correlation_id` enter through ADR-002. Each physical
   dispatch receives a new `execution_attempt_id`. An idempotency key identifies
   the logical action across retries. Retries are allowed only when the
   capability contract declares them safe or the target supports proven
   idempotency; ambiguous timeouts become `UNKNOWN_OUTCOME`, not automatic
   retries.
8. Direct security-sensitive UI/API mutations use their existing service paths,
   deterministic route/object authorization, and ADR-001 audit hooks. They are
   not routed through AIbitat or OpenClaw.

### Required integration questions

| Question                                                      | Answer                                                                                                                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can AnythingLLM custom tools provide the boundary?            | They can provide proposal adapters, but current imported/custom handlers are in-process code and are not a sufficient final boundary.                                                                   |
| Can MCP provide the boundary?                                 | No. MCP transports a tool call to another process/server whose internal effects Sentinel cannot fully inspect.                                                                                          |
| Can the existing agent architecture call governance directly? | Yes. A narrow pre-handler AIbitat hook can call the shared proposal/authorization service while preserving the agent loop.                                                                              |
| Is a dedicated REST endpoint required?                        | No for internal execution. A new REST bridge would create another externally reachable path. Any future administrative/test endpoint must call the same service and cannot invoke an executor directly. |
| Which option preserves workspace authorization?               | The shared GovernanceContext plus internal authorizer and registered executor adapters.                                                                                                                 |
| Which option produces the smallest upstream patch?            | A narrow AIbitat proposal hook and small hooks at real effect adapters, with Sentinel logic in isolated modules.                                                                                        |
| Which option is easiest to secure?                            | Explicit capability adapters that authorize immediately before each controllable effect.                                                                                                                |
| Which option is easiest to rebase?                            | Retaining AIbitat/provider/chat frameworks and avoiding copies of their implementations.                                                                                                                |

### MCP policy

MCP tools are disabled for governed execution by default. A tool may be enabled
only when a registered adapter pins server identity and transport, allowlists the
tool identity, validates a strict schema, minimizes credentials, bounds timeout
and result size, and maps the call to a known Sentinel capability whose target
and parameters can be enforced. Stdio servers require process isolation and
restricted environment; remote servers require authenticated transport and
network target controls.

Authorization covers the wrapper call that Sentinel can observe. It does not
guarantee every internal effect of a remote or subprocess MCP server. That
residual trust must be displayed and audited by server/tool identity.

### Imported JavaScript policy

Existing imported JavaScript skills are unavailable for governed execution by
default. Description and JSON schema do not make in-process code safe. A future
skill must be explicitly trusted and registered, declare capabilities, receive
least-privilege context, and execute through an approved restricted adapter or
sandbox. Unadapted in-process skills remain outside the governed-execution
guarantee and cannot be exposed to a governed agent.

### Agent-flow policy

Existing flows are unavailable for governed effects until each effectful node
is compiled or adapted into a normalized capability and independently
authorized immediately before execution. One authorization of the outer flow is
never authority for unknown inner HTTP, scrape, model, filesystem, or other
effects. Pure non-effect computation can be supported separately only when it
cannot invoke an unregistered effect path.

### Scheduled-execution policy

Scheduled governed execution requires persisted creator principal, workspace,
creation-time policy reference, allowed capability references, and schedule
identity. Every firing creates a new run correlation and execution attempt and
reauthorizes the current principal status, workspace access, active policy,
capability registry, target, parameters, and credentials. Automatic tool
approval is user-interaction behavior and supplies no authorization. Existing
ownerless jobs cannot execute governed effects until migrated with validated
context or recreated. Any unresolved, revoked, changed, or missing authority
denies the run.

## Alternatives considered

- Wrap only `AIbitat.fn.handler(args)`.
- Implement execution as an AnythingLLM imported/custom tool.
- Treat MCP as the security boundary.
- Add a dedicated externally callable execution REST endpoint.
- Build a parallel agent framework.
- Retain AnythingLLM proposals but use a Sentinel authorizer and
  capability-specific restricted executors.

## Why rejected

- AIbitat-only wrapping misses inner flow/MCP/imported/built-in effects and
  direct mutations.
- Imported/custom tools execute in the server process and cannot establish
  least privilege merely through schema declarations.
- MCP controls transport and schema exchange, not remote implementation
  semantics or final effects.
- A REST bridge expands attack surface and risks losing request/workspace
  identity when internal service calls suffice.
- A parallel agent framework duplicates high-churn provider, chat, tool, and
  streaming behavior and increases divergence.
- The selected split preserves the upstream agent loop while placing security
  at explicit controllable effect boundaries.

## Security implications

Model output, tool reranking, availability, approval, refusal, and semantic
classification never grant permission. Unknown capabilities, targets, or
parameters deny. Authorization occurs again at the final controllable adapter,
and mandatory audit precedes dispatch. Network redirects/resolution and
filesystem real paths are revalidated to reduce TOCTOU.

The design deliberately narrows initial functionality: unadapted MCP tools,
imported skills, flows, built-ins, connectors, and schedules cannot perform
governed effects. This is safer than claiming coverage the application does not
have.

## Upgrade/rebase implications

Sentinel proposal, policy, capability, executor, OpenClaw client, and outcome
logic remains in dedicated modules. Small changes are expected in AIbitat before
`fn.handler(args)`, agent/context construction, schedule execution, and each
adapted final-effect handler. High-churn chat/provider implementations are not
copied. Each upstream rebase must re-run dispatch and bypass-path contract tests
because moving a handler or adding a new effect path can invalidate coverage.

## Testing implications

Phases 5 and 6 must test malformed proposals, extra fields, unknown capability,
capability escalation, wrong workspace/principal/policy version, target and
parameter normalization, private/link-local/metadata/IPv4/IPv6/DNS/redirect
cases, path traversal/symlink/Windows junction/UNC cases, mandatory-audit
failure, policy change before use, duplicate/idempotent retry, crash boundaries,
unknown outcomes, direct executor reachability, unadapted tool denial, MCP
identity/schema/timeout/result bounds, imported-skill denial, per-flow-node
authorization, scheduled revocation and reauthorization, OpenClaw unavailable/
timeout/malformed responses, and direct-mutation separation.

## Known limitations

- Sentinel cannot prove or reverse every internal effect performed by an
  authorized remote MCP server or external system.
- Some external APIs do not support idempotency or definitive timeout outcomes.
- A compromised restricted runtime or dependency may still exploit an unknown
  isolation weakness; complete isolation is not claimed.
- Optional integrations remain unsupported for governed effects until they have
  registered adapters and tests.
- OpenClaw details must be revalidated against the pinned Phase 5 version before
  implementation.

## Implementation phases

Phases 5A-5F implement the topology, registry, deterministic authorization,
OpenClaw restriction, bridge, and lifecycle audit. Phase 6 attacks the final
boundary and fault behavior. Phase 8 hardens identity, inputs, secrets, and
resilience.
