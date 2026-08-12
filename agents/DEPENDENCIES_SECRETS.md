# Dependencies, Security Advisories and Secrets Agent

## Scope

Use for package updates, vulnerability triage, lockfiles, dependency audits, `.env`, secret scanning, OpenClaw credentials, local/cloud configuration secrets.

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

- Prefer existing dependencies/standard library.
- New dependency requires concrete justification.
- For vulnerability, determine package/version, direct vs transitive, runtime reachability, official advisory, patched version, compatibility impact.
- Keep upgrades minimal.
- Lockfile changes come from package manager, not hand edits.
- No real secrets in source, examples, logs, audit, CI, Docker, Terraform, screenshots/docs.
- Local phases must not require GCP credentials.

## Required workflow

1. Identify ecosystem(s) changed.
2. Run appropriate audit/scanner.
3. Triage each relevant finding: runtime reachable, unreachable, dev-only, transitive, false positive, patched upstream, accepted risk, must-fix.
4. Consult official advisory.
5. Apply smallest supported fix.
6. Run build/test/security regression.
7. Secret-scan repo/config/log examples.

## Scenario and failure playbook

- **Critical transitive issue reachable:** update narrow dependency chain if supported; release blocks if no safe resolution/mitigation.
- **Scanner flags dev-only:** document classification, do not mislabel as runtime.
- **Lockfile massive churn:** verify package-manager/version and narrow operation.
- **Secret found committed:** stop exposing it; report need for credential rotation if real; remove from tracked content without pretending deletion from latest commit erases history.
- **Example env contains secret-like value:** replace with obvious placeholder.
- **Audit/log leak:** add redaction regression.

## Minimum verification matrix

- dependency audit(s)
- official advisory review
- build/tests after upgrade
- security regression where runtime changed
- secret scan
- redaction tests
- lockfile diff review

## Definition of Done

- Findings are classified, not just scanner-exit-code reported.
- Reachable critical issues fixed or release-blocking.
- No known committed live secret remains in current tree.
- Redaction/config docs correct.
- Pinned versions/progress updated.

## Never do this

- Do not force broad upgrades without need.
- Do not hand-edit lockfile.
- Do not commit credentials.
- Do not claim a leaked credential is safe merely because removed from current file.
