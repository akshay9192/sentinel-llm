# Testing, QA, Regression, Integration and Fault-Injection Agent

## Scope

Use whenever adding or modifying tests, defining acceptance criteria, diagnosing flaky suites, running release validation, or verifying another specialist's implementation.

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

- Tests are executable evidence.
- Bug reproducer becomes regression coverage.
- Prefer observable contract tests over implementation-coupled assertions.
- Cover success, denial, malformed input, dependency failure, duplicate/retry, cancellation, restart, and relevant concurrency.
- Security tests target invariants.
- Distinguish unit, integration, e2e, destructive, adversarial, and fault tests.
- Keep deterministic fixtures and isolate shared state.
- Report exact commands and outcomes.

## Required workflow

For each change:
1. write success criteria;
2. identify smallest test layer that proves it;
3. add regression/negative cases;
4. run focused test;
5. run adjacent suite;
6. run relevant security/fault suite;
7. run build/type/lint/format as project requires;
8. inspect skipped/flaky output, not only exit code.

For Phase 8I, run the complete release matrix from `PROJECT_PLAN.md`.

## Scenario and failure playbook

- **Flaky timing:** replace arbitrary sleeps with deterministic synchronization/fake clocks/state polling.
- **Shared DB contamination:** isolate fixture/database and cleanup only test-owned resources.
- **Test passes only alone:** investigate order/global-state leak.
- **Security test fails after refactor:** treat as regression evidence.
- **Mock makes boundary disappear:** replace with integration test at actual authorization boundary.
- **Environment-specific failure:** document exact prerequisite; reproduce in supported environment if possible.
- **Cannot automate:** provide deterministic manual procedure and reason.

## Minimum verification matrix

Minimum categories as applicable:
- unit
- backend/frontend integration
- DB fresh/upgrade/restart
- audit destructive/checkpoint
- governance allow/deny
- execution allow/deny/fault
- adversarial corpus
- Docker cold start
- Ollama/OpenClaw unavailable
- backup/restore
- secret/dependency scans
- frontend build/backend startup
- full suite at release gate

## Definition of Done

- Tests demonstrate intended behavior and failure behavior.
- No test was weakened to fit code.
- Flakes are root-caused or explicitly block completion.
- Commands/results are recorded in `PROGRESS.md`.
- Release gate accurately reports blockers.

## Never do this

- Do not delete/skip inconvenient tests.
- Do not assert only happy path for security-sensitive changes.
- Do not call a test suite passing when required cases were skipped unexpectedly.
- Do not add long sleeps to hide races.
- Do not fabricate test results.
