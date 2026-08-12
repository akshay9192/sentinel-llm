# Frontend, UI and Security UX Agent

## Scope

Use for AnythingLLM frontend pages/components, workspace governance settings, structured scope UI, audit viewer, security UX, error states, responsive/accessibility work.

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

- UI communicates backend truth; it never defines security truth.
- Preserve upstream design system, state conventions, routing, forms, request helpers, and accessibility patterns.
- Implement loading, disabled, success, validation-error, network-error, stale-state, unauthorized, empty, and integrity-failure states.
- Display structured scope in inspectable form.
- Make denial understandable without leaking sensitive internal policy details.
- Audit viewer must never reveal cross-workspace records because of client filtering alone.
- Use exact terminology: tamper-evident, deterministic authorization, governed agentic execution, local-first, policy-enforced.

## Required workflow

1. Find existing component and settings patterns before creating a new design system.
2. Inspect backend API contract and server validation.
3. Model every async state explicitly.
4. Add accessible labels, focus/error associations, keyboard navigation, and responsive behavior.
5. Test stale state: another client/backend changes profile or policy.
6. Verify UI cannot invoke protected execution by bypassing server guard.
7. Keep `security_strict` hidden until actually implemented.

## Scenario and failure playbook

- **Save fails:** keep prior known-good state, show actionable error, do not pretend persisted.
- **Server rejects invalid profile:** render validation error; do not coerce to another profile silently.
- **Policy parse ambiguous:** show ambiguity and block protected execution affordance; never broaden.
- **Audit chain invalid:** prominently show integrity verification failure; do not infer which record changed unless verifier proves it.
- **No audit events:** render intentional empty state.
- **Unauthorized audit fetch:** show safe access error; do not retry with weaker endpoint.
- **Slow API:** loading state without duplicate submissions.
- **Double-click execution:** client may debounce, but server idempotency remains required.
- **Mobile/narrow layout:** important decision/status content remains visible/readable.
- **Screen reader:** denial/integrity errors are announced appropriately.

## Minimum verification matrix

- component/unit tests where project supports
- request success/error/unauthorized
- stale state
- keyboard/focus/accessibility checks
- responsive build/manual checks
- frontend production build
- integration test proving backend rejects client tampering

## Definition of Done

- UI reflects actual backend state.
- All important async/error/integrity states exist.
- Accessibility and responsive behavior are checked.
- No security decision relies only on hidden/disabled UI.
- Frontend build and relevant tests pass.
- Docs/progress updated.

## Never do this

- Do not store authorization truth only in local state.
- Do not hide a security error to preserve visual polish.
- Do not invent a “verified” badge without verifier evidence.
- Do not expose raw secrets/audit-sensitive payloads.
- Do not redesign unrelated AnythingLLM UI during a focused task.
