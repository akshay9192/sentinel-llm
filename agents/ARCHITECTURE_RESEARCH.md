# Architecture, Upstream Mapping, Baseline and ADR Agent

## Scope

Use this file for Phase 0 baseline work, Phase 1 codebase mapping/threat-model support, ADR preparation, or any task whose correctness depends on understanding the pinned AnythingLLM/OpenClaw/Ollama architecture before implementation.

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

- Pin exact upstream/fork commits, toolchain versions, Docker/Ollama/OpenClaw versions.
- Establish vanilla AnythingLLM acceptance before governance modifications.
- Map real file paths, functions, APIs, schemas, auth/authz middleware, frontend consumers, tests, agent/custom-tool/MCP extension points.
- Keep `docs/BASELINE.md` and `docs/CODEBASE_NOTES.md` evidence-based.
- Produce ADRs with Context, Decision, Alternatives, Rejection Reasons, Security, Upgrade/Rebase Impact, Testing Impact, and Known Limitations.
- Prefer the smallest upstream-compatible extension point.
- Treat paths in `PROJECT_PLAN.md` as conceptual until pinned source confirms them.

## Required workflow

1. Inspect git/remotes/version state.
2. Run the upstream-supported baseline installation/build/test path where practical.
3. Trace code from externally visible entry point inward; record actual functions and callers.
4. Search for existing framework hooks before proposing new infrastructure.
5. For major decisions, identify at least two plausible alternatives and compare security, patch size, testability, maintainability, and rebase burden.
6. Do not implement a major architecture while a required ADR question remains unresolved.

## Scenario and failure playbook

- **Docs disagree with source:** pinned source wins; document discrepancy.
- **Tag and commit disagree:** exact commit is authoritative; record both.
- **Baseline tests already fail:** record as pre-existing with commands/logs; do not mask.
- **Expected path absent:** search symbols/callers; never create a duplicate subsystem simply to match the plan diagram.
- **MCP/custom tools appear sufficient:** favor them unless security/auth correlation analysis rejects them.
- **Dirty working tree:** preserve it; record baseline contamination instead of cleaning.
- **Architecture answer uncertain:** stop at research/ADR boundary rather than coding a guess.

## Minimum verification matrix

- `git status --short`
- exact commit/version commands
- upstream baseline build/test
- vanilla app startup where phase requires
- evidence links/paths in `CODEBASE_NOTES.md`
- ADR review against threat model and upgrade/rebase implications

## Definition of Done

- Baseline facts are reproducible.
- Actual architecture paths and auth boundaries are documented.
- No major subsystem is based on a guessed file/path/API.
- Required ADRs resolve their explicit questions.
- `PROGRESS.md` is current.

## Never do this

- Do not copy commands from random blogs without pinned-version verification.
- Do not rewrite upstream architecture for aesthetics.
- Do not start governance implementation during a baseline/mapping-only phase.
- Do not claim architecture properties that were not inspected.
