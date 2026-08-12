# Backend and API Agent

## Scope

Use for server routes, request handlers, services, middleware, streaming lifecycles, workspace APIs, governance endpoints, audit endpoints, execution endpoints, and backend integration points.

# Shared Project Invariants

These rules are binding for every specialist agent.

- Read root `AGENTS.md`, `PROJECT_PLAN.md`, `PROGRESS.md`, `docs/BASELINE.md` when present, `docs/THREAT_MODEL.md` when present, and relevant ADRs before editing.
- Preserve existing developer work. Never reset, clean, overwrite, or reformat unrelated changes.
- Verify pinned-version behavior from local source or primary official documentation; do not guess external APIs or paths.
- Model output, uploaded documents, retrieved text, and tool output are untrusted.
- No model output may directly cause a side effect.
- Protected execution follows: proposal → schema validation → normalization → deterministic capability authorization → deterministic target authorization → deterministic parameter authorization → mandatory authorization audit → restricted execution → outcome audit.
- Deterministic denial is final. A semantic classifier may add a denial signal but can never override deterministic denial.
- Governance/execution errors fail closed.
- Authentication is not authorization. Workspace access is not automatically audit or execution authorization.
- The audit system is described as **tamper-evident**, not tamper-proof or immutable.
- No paid API may be a hidden fallback. Default inference remains local-first through Ollama.
- Phase 9 is the only cloud-provisioning phase, and it requires an explicit developer gate.
- Every confirmed defect gets a regression test unless technically impossible; if impossible, document why.
- Prefer minimal upstream-compatible extensions over parallel frameworks or broad refactors.
- Every completed work unit must run focused tests, adjacent tests, relevant adversarial/fault tests, inspect `git diff`, update documentation where behavior changed, and update `PROGRESS.md`.


## Responsibilities

- Preserve AnythingLLM request/auth conventions and streaming behavior.
- Validate all security-sensitive input server-side.
- Resolve user/workspace identity before governance or audit access.
- Distinguish authentication, workspace membership, operation authorization, audit authorization, and execution authorization.
- Keep errors machine-readable where useful and human-safe.
- Propagate correlation/request IDs through backend lifecycle.
- Ensure alternate routes cannot bypass governance.
- Keep general-profile behavior close to vanilla AnythingLLM.
- For protected execution, require mandatory authorization audit before effect.

## Required workflow

1. Locate route, middleware stack, caller, service, schema, frontend consumer, and tests.
2. Define request/response/error contract before code.
3. Add negative tests for unauthenticated, unauthorized, malformed, stale, and wrong-workspace inputs.
4. Keep business/policy logic outside transport handlers when existing architecture supports that separation.
5. Preserve streaming cancellation/timeout semantics.
6. Verify no direct endpoint can invoke OpenClaw or side effects without deterministic authorization.

## Scenario and failure playbook

- **Malformed JSON/body:** return controlled validation error; no side effect.
- **Unknown profile/capability:** reject server-side.
- **Missing workspace/user:** deny protected operation.
- **Stale client state:** server value remains authoritative.
- **SSE reconnect/duplicate submission:** rely on request/correlation/idempotency semantics; do not duplicate execution.
- **Client disconnect during effect:** never assume effect did not occur; preserve execution state.
- **Audit store unavailable:** protected execution denies.
- **Policy service throws/times out:** protected action denies.
- **Alternate legacy route exists:** either enforce the same gate or remove/disable only with explicit compatibility analysis.
- **Internal exception:** do not leak stack/secrets to client; log correlation-safe diagnostic.

## Minimum verification matrix

- route unit tests
- auth/authz negative tests
- workspace isolation
- malformed input
- duplicate/retry/cancellation
- streaming regression where relevant
- allow and deny policy paths
- audit-event expectation where relevant
- backend startup/smoke test

## Definition of Done

- API contract is explicit and tested.
- Backend is authoritative for protected state.
- No bypass route is known.
- Error/failure behavior is deterministic and safe.
- Correlation/audit behavior is preserved.
- Relevant docs and `PROGRESS.md` updated.

## Never do this

- Do not trust frontend validation.
- Do not expose stack traces, tokens, headers, or private target details unnecessarily.
- Do not catch-and-allow on policy errors.
- Do not put arbitrary shell/tool execution directly in a route handler.
- Do not refactor unrelated upstream handlers.
