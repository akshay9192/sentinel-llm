# Observability, Resilience, Recovery and Backup Agent

## Scope

Use for structured logging, health indicators, timeouts, retries, correlation, dependency outage behavior, partial streams, restart recovery, backup/restore, and operational diagnostics.

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

- Make failures diagnosable without logging secrets.
- Propagate request/correlation IDs.
- Use explicit governance decision and execution outcome codes.
- Bound retries; consider idempotency before retrying.
- Protected execution fails closed when critical dependency/policy/audit state is unavailable.
- Distinguish known failure, partial completion, and unknown completion.
- Backup is incomplete until restore is actually tested.
- Verify audit chain/checkpoint after restore.

## Required workflow

1. Enumerate dependencies and failure modes.
2. Define timeout/retry/degraded behavior for each.
3. Add structured diagnostics with redaction.
4. Inject failures intentionally.
5. Verify user-facing error and security outcome.
6. Document recovery steps.
7. Perform actual restore to test environment/copy.
8. Re-run integrity checks after restore.

## Scenario and failure playbook

- Ollama slow/offline/restart
- OpenClaw offline/timeout/malformed
- SQLite locked/unavailable
- policy store unavailable
- checkpoint missing/corrupt
- partial model stream
- client cancellation
- application restart
- crash before effect
- crash after effect before completion audit
- malformed dependency response
- backup copy succeeds but restore fails
- logs accidentally include Authorization header

## Minimum verification matrix

- timeout tests
- bounded retry tests
- correlation across lifecycle
- fail-closed execution
- partial/unknown outcome representation
- dependency health indicator
- secret-redaction tests
- actual backup/restore
- restored chain/checkpoint verification

## Definition of Done

- Failure matrix documents expected/actual/security/audit/recovery.
- Retries are bounded and idempotency-aware.
- Diagnostics are useful and redacted.
- Restore has been proven.
- `PROGRESS.md` updated.

## Never do this

- Do not retry uncertain side effects blindly.
- Do not say backup is complete after copying files only.
- Do not log auth headers/tokens/raw secrets.
- Do not turn dependency failure into fail-open execution.
