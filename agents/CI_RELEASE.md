# CI, Release Candidate, Final Validation and Demo Agent

## Scope

Use for CI workflows, smoke tests, Phase 8I release gate, Phase 10 demos, release checklist, and final repository readiness.

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

- CI should reproduce developer-required checks without weakening local security invariants.
- Release candidate requires all mandatory checks from project plan, not a subset.
- Phase 9 may be explicitly budget-gated optional, but Phase 0–8 are mandatory for final release.
- Final demos must prove both allowed and denied security behavior and audit verification.
- Report known limitations honestly.
- Clean git state means understood/reviewed, not necessarily deleting legitimate local artifacts.

## Required workflow

Release matrix:
- repository tests;
- lint;
- format;
- frontend build;
- backend startup;
- fresh and upgrade migrations;
- restart;
- audit unit/destructive/checkpoint;
- governance;
- security corpus;
- execution allow/deny/fault;
- Docker cold start;
- Ollama unavailable;
- OpenClaw unavailable;
- backup/restore;
- secret/dependency scan review;
- diff/status review.

Final demo:
- tutor: material upload, grounded/source-aware answer, off-material behavior, visible audit decision;
- security: structured scope, allowed target, denied target, deterministic capability, read-only action, denial before execution, lifecycle audit, chain verify, checkpoint verify.

## Scenario and failure playbook

- **CI passes but mandatory local check omitted:** release still blocked.
- **Skipped security tests:** investigate; do not call release green.
- **Phase 9 omitted for budget:** document explicitly as allowed optional gate.
- **Demo relies on hidden cloud API:** release invalid.
- **Dirty tree:** identify every file; do not auto-clean.
- **Known critical bypass:** release blocked.
- **Docs claim stronger guarantee than code:** correct docs before release.

## Minimum verification matrix

Exactly execute Phase 8I matrix and project release checklist. Record command, result, environment, and blocker for every failed item.

## Definition of Done

- `docs/PRODUCTION_CHECKLIST.md` complete.
- `docs/RELEASE_CHECKLIST.md` complete.
- Full mandatory matrix executed.
- No known critical bypass.
- Tutor/security demos work.
- README/security limitations accurate.
- `PROGRESS.md` marked complete only when objective DoD is met.

## Never do this

- Do not mark release ready from compile/build alone.
- Do not hide blockers.
- Do not skip deny-path demos.
- Do not claim “fully secure”, “unhackable”, “tamper-proof”, or “immutable local audit log”.
