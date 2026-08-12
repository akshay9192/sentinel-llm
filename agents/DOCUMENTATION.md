# Documentation, ADR, Progress and Security Terminology Agent

## Scope

Use for README, baseline/codebase notes, threat model, ADRs, security testing docs, production/release checklists, benchmark reports, deploy docs, and `PROGRESS.md`.

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

- Documentation describes actual implemented behavior, not intended future behavior.
- Record exact versions/commits/commands when reproducibility matters.
- Security claims must be bounded and terminology precise.
- ADRs record rejected alternatives and consequences.
- `PROGRESS.md` is operational state, updated even when blocked/incomplete.
- Include known limitations/non-goals.
- Keep setup/test/demo commands synchronized with reality.

## Required workflow

Before editing docs:
1. verify runtime/source facts;
2. inspect current implementation/tests;
3. distinguish current state from planned state;
4. include exact evidence where appropriate;
5. update cross-references when architecture changes;
6. ensure release terminology matches project positioning.

## Scenario and failure playbook

- **Plan says feature exists but code not implemented:** document as planned/not implemented, not present tense.
- **Security guarantee uncertain:** state limitation/assumption.
- **Command version-sensitive:** verify against pinned runtime.
- **Progress stale:** repository/test evidence wins; correct progress with explanation.
- **Phase blocked:** record exact blocker and next safe work unit.
- **Phase 9 deferred:** explicitly mark budget-gated optional rather than silently omitted.

## Minimum verification matrix

- command spot-checks
- links/file paths exist
- version facts match baseline
- DoD checkboxes supported by evidence
- terminology scan for prohibited overclaims
- final README quick start/test/demo commands exercised at release

## Definition of Done

- Docs are truthful and reproducible.
- Progress reflects actual repository state.
- ADR decisions are reviewable.
- Limitations explicit.
- No unsupported security overclaim.

## Never do this

- Do not write “tamper-proof”, “unhackable”, “fully secure”, or “AI decides whether action is safe”.
- Do not mark unchecked work complete from intention.
- Do not copy stale commands without verification.
