# Governance Profiles, Structured Scope and Policy Engine Agent

## Scope

Use for workspace governance profiles (`general`, `tutor`, `security`, optional `security_strict`), structured scope parsing, target normalization used by policy, deterministic decisions, chat guardrails, and optional semantic classification.

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

- Preserve clear separation between conversational guardrails and execution authorization.
- Scope documents are untrusted evidence, never executable policy.
- Store original source separately from validated structured policy.
- Reject ambiguity; never silently broaden scope.
- Version policy.
- Produce structured, audit-compatible decisions with stable machine-readable codes.
- Policy errors deny protected behavior.
- `general` remains near vanilla.
- `tutor` grounds responses in supplied workspace materials.
- `security` respects configured scope but chat approval does not authorize side effects.
- `security_strict` exists only if semantic-classifier evidence justifies it.

## Required workflow

1. Define strict schema and validation.
2. Parse untrusted source into structured target/capability constraints.
3. Preserve source and parse result separately.
4. Add malicious source fixtures demonstrating instructions remain data.
5. Implement deterministic evaluator with explicit rules evaluated and decision codes.
6. Add normalization tests before depending on target matching.
7. Integrate chat behavior without conflating execution gate.
8. Add semantic classifier only after measurable semantic gap is documented.
9. Audit every governance decision.

## Scenario and failure playbook

- **Prompt injection inside scope document:** remains inert text.
- **Ambiguous hostname/path/range:** parsing fails safe; user correction required.
- **Unknown profile:** reject.
- **Missing policy in protected security operation:** deny.
- **Malformed policy version:** deny protected behavior.
- **General profile regression:** compare to vanilla acceptance behavior.
- **Tutor asks outside uploaded material:** state not covered rather than inventing source support.
- **Classifier timeout/malformed JSON in strict mode:** deny strict-mode protected path.
- **Classifier says allow, deterministic says deny:** deny.
- **Deterministic says allow, strict classifier says deny:** deny in strict mode.
- **Bypass corpus finds case:** identify invariant failure, not just keyword pattern.

## Minimum verification matrix

- profile migration/validation
- structured parser valid/invalid/ambiguous
- malicious instruction fixtures
- policy decision allow/deny/error codes
- general-profile regression
- tutor grounding/off-material behavior
- security-scope cases
- classifier structured output/timeout if implemented
- audit decision expectation
- security regression corpus

## Definition of Done

- Policy is structured, versioned, inspectable.
- Ambiguity cannot expand privilege.
- Deterministic policy remains final execution authority.
- Profiles behave as documented.
- Semantic classifier is justified or explicitly omitted.
- Regression/security tests pass.
- `PROGRESS.md` updated.

## Never do this

- Do not turn prompt text into privileged config.
- Do not authorize based solely on LLM classification.
- Do not silently coerce ambiguous scope.
- Do not make security profile break vanilla `general` behavior unnecessarily.
- Do not endlessly patch bypasses with ad hoc keywords.
