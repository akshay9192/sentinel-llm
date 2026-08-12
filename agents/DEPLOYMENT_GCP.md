# GCP, Terraform, Confidential Compute, Attestation and KMS Agent

## Scope

Use only for Phase 9 cloud architecture/provisioning, Terraform, Confidential VM/Space, attestation, KMS, IAM, cloud network hardening, benchmarking, and cost controls.

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

- Phase 9 requires local release candidate, current credit/expiry check, and explicit developer approval.
- Verify current GCP feature/machine/region availability using primary official sources at execution time.
- Define exact cloud threat before choosing Confidential VM vs Confidential Space.
- Terraform is reproducible, least-privilege, plan-reviewed, and destroyable.
- No secrets in code/state outputs.
- Never silently downgrade confidential-compute properties because capacity/config is unavailable.
- Attestation/KMS access must enforce the chosen trust model.
- Control cost with explicit resource inventory, stop/start/teardown procedure, and verification.

## Required workflow

1. Reconfirm Phase 9 gate in `PROGRESS.md`.
2. Verify credits, expiry, quotas, machine/region/zone, confidential feature support, KMS/attestation constraints, pricing.
3. Review/update cloud ADR.
4. Pin Terraform providers.
5. `terraform fmt/validate/plan`; review plan before apply.
6. Provision minimal resources.
7. Verify IAM/network/exposure.
8. Test attestation/KMS allowed and denied workload.
9. Benchmark model/runtime.
10. Stop/destroy as plan requires and verify state/billing.

## Scenario and failure playbook

- **Machine unavailable:** find supported alternatives; report security/performance/cost tradeoff; no silent downgrade.
- **Quota error:** request/choose approved supported resource; do not random-walk regions.
- **IAM denied:** fix least-privilege permission based on exact operation; do not grant broad owner.
- **Attestation fails:** deny secret release; inspect evidence/measurement.
- **KMS unavailable:** protected secret-dependent workload fails closed.
- **Unexpected public IP/port:** close unless explicitly required and justified.
- **OpenClaw/Ollama exposed:** restrict network.
- **Terraform apply partial:** inspect state/plan, recover through Terraform rather than ad hoc console edits.
- **Unexpected billing:** stop resources, inventory, verify stopped/deleted state.

## Minimum verification matrix

- terraform fmt/validate/plan
- IAM negative test
- ingress/egress/port review
- confidential-compute verification
- attestation allowed/denied
- KMS least privilege
- service exposure checks
- GCP benchmark report
- stop/start or destroy verification
- cost estimate/inventory

## Definition of Done

- Explicit Phase 9 authorization exists.
- Cloud threat/design documented.
- Infrastructure reproducible and least-privilege.
- Confidential/attestation properties verified.
- Costs/teardown understood.
- `GCP_BENCHMARKS.md`, deploy README, and progress updated.

## Never do this

- Do not provision before Phase 9 approval.
- Do not grant broad IAM as shortcut.
- Do not silently use non-confidential compute.
- Do not leave paid resources running unintentionally.
- Do not put secrets in Terraform files/outputs.
