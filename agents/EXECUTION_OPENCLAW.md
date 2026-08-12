# Governed Execution, Capability Registry and OpenClaw Agent

## Scope

Use for Phase 5 execution architecture, capability registry, structured action proposals, deterministic execution authorization integration, OpenClaw client/sandbox/config, execution lifecycle and retries.

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

- Start with smallest read-only capability set required by demo.
- Each capability defines strict parameter schema, target types, side-effect class, timeout, output limit, logging behavior, and idempotency expectations.
- Unknown capability denies.
- Validate and normalize proposal after model output.
- Authorize capability, target, and parameters immediately before effect.
- Revalidate resolved/redirected targets where capability permits.
- Run OpenClaw least privilege: non-root where possible, restricted FS/network, explicit skills/capabilities, no Docker socket, no host root mount, no unnecessary credentials.
- Pin OpenClaw version and verify Ollama/provider config from pinned docs/source.
- Audit proposed/authorized-or-denied/started/completed-or-failed lifecycle.

## Required workflow

1. Re-read ADR-003 and actual AnythingLLM agent/custom-tool/MCP architecture.
2. Confirm integration cannot bypass workspace authorization.
3. Define strict action schema.
4. Define minimal capability registry.
5. Normalize target and parameters.
6. Call deterministic policy immediately before effect.
7. Write mandatory authorization audit event.
8. Execute only through restricted capability.
9. Persist outcome with correlation/idempotency.
10. Attack alternate routes and direct OpenClaw reachability.
11. Fault-test unavailable/timeout/malformed OpenClaw.

## Scenario and failure playbook

- **Unknown capability/extra field/type confusion:** reject.
- **Read request proposes write:** deny capability escalation.
- **Shell requested when only HTTP_GET allowed:** deny.
- **Redirect to private/metadata/loopback:** deny or re-authorize resolved target according to capability design.
- **DNS resolves unsafe address:** deny.
- **Target changes between proposal and execution:** re-normalize/re-authorize; do not use stale approval.
- **OpenClaw timeout:** do not blindly replay side-effecting action; determine idempotency/unknown completion.
- **Crash after authorization before effect:** do not auto-replay unless safe.
- **Crash after effect before completion audit:** represent completion as unknown/partial until evidence resolves; never fabricate.
- **Browser disconnect:** does not prove execution cancelled.
- **Mandatory authorization audit unavailable:** deny.
- **OpenClaw unreachable:** debug bind/auth/network locally; do not expose publicly.
- **Pinned version differs from remembered config:** pinned docs/source wins.

## Minimum verification matrix

- schema rejection cases
- unknown capability
- escalation attempts
- target normalization suite
- loopback/private/link-local/metadata/IPv6
- redirect/DNS cases
- TOCTOU/resolved-target equality
- allow path
- deny path
- duplicate/replay
- OpenClaw timeout/unavailable/malformed
- audit-store failure
- direct/bypass route test

## Definition of Done

- No model-to-effect path exists.
- Capability set is minimal.
- Authorization happens immediately before effect.
- OpenClaw least privilege is verified.
- Approved and denied paths are both audited.
- Fault/retry semantics are explicit.
- Security regression suite passes.
- `PROGRESS.md` updated.

## Never do this

- Do not expose unrestricted shell by default.
- Do not execute then authorize.
- Do not let a classifier override deterministic denial.
- Do not blindly retry uncertain side effects.
- Do not expose OpenClaw publicly to fix connectivity.
- Do not install/use `latest` without pinning.
