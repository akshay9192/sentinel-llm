# AGENTS.md — Root Codex Coordinator

This file coordinates all coding-agent work for the AnythingLLM Governance Control Plane project.

## 1. Purpose

Do not treat this file as a generic style guide. It is a routing and safety constitution. The detailed implementation rules live in `agents/*.md`. For every task, Codex must read this root file and then load every specialist file that applies to the work.

## 2. Mandatory startup

Before any edit:

1. Run `powershell -NoProfile -ExecutionPolicy Bypass -File .agents/preflight.ps1 -Acknowledge` from the repository root after reading this file.
2. Read `PROJECT_PLAN.md` completely.
3. Read `PROGRESS.md` completely.
4. Read `docs/BASELINE.md` if present.
5. Read `docs/THREAT_MODEL.md` if present.
6. Read relevant ADRs.
7. Run:
   - `git status --short`
   - `git branch --show-current`
   - `git rev-parse HEAD`
   - `git log -1 --format=fuller`
8. Identify current phase/sub-phase, incomplete Definition-of-Done items, pre-existing local changes, relevant tests, and current blockers.
9. Classify the task using the routing table below.
10. Read all required specialist agent files.
11. Only then begin implementation.

## 3. Specialist routing table

Read **all** matching files; categories may overlap.

| Work type | Required specialist file(s) |
|---|---|
| Repository baseline, upstream mapping, ADRs | `agents/ARCHITECTURE_RESEARCH.md` |
| Backend/server/API logic | `agents/BACKEND_API.md` |
| Frontend/UI/UX | `agents/FRONTEND.md` |
| Prisma/SQLite/schema/migrations/persistence | `agents/DATABASE.md` |
| Audit hashing/storage/checkpoints/viewer | `agents/AUDIT.md` |
| Governance profiles/scope/policy/classifier | `agents/GOVERNANCE.md` |
| Action proposals/capabilities/OpenClaw | `agents/EXECUTION_OPENCLAW.md` |
| Auth/authz, target validation, adversarial security | `agents/SECURITY.md` |
| Unit/integration/e2e/regression/fault testing | `agents/TESTING_QA.md` |
| Docker/Compose/local environment | `agents/DOCKER_LOCAL_RUNTIME.md` |
| Ollama/model selection/benchmarks/RAG diagnosis | `agents/OLLAMA_MODELS_RAG.md` |
| Upload/parser/file handling | `agents/INGESTION_FILES.md` |
| Logging/health/retries/recovery/backup | `agents/OBSERVABILITY_RESILIENCE.md` |
| Dependencies, advisories, secrets | `agents/DEPENDENCIES_SECRETS.md` |
| Terraform/GCP/Confidential Compute/KMS | `agents/DEPLOYMENT_GCP.md` |
| CI, release gate, final demos | `agents/CI_RELEASE.md` |
| Documentation/README/ADRs/progress | `agents/DOCUMENTATION.md` |

### Cross-cutting examples

- A frontend governance-profile picker reads `FRONTEND.md`, `GOVERNANCE.md`, `BACKEND_API.md`, and `TESTING_QA.md`.
- A workspace-profile migration reads `DATABASE.md`, `GOVERNANCE.md`, `SECURITY.md`, and `TESTING_QA.md`.
- An OpenClaw HTTP capability reads `EXECUTION_OPENCLAW.md`, `SECURITY.md`, `AUDIT.md`, `BACKEND_API.md`, and `TESTING_QA.md`.
- Audit viewer work reads `AUDIT.md`, `FRONTEND.md`, `BACKEND_API.md`, `SECURITY.md`, and `TESTING_QA.md`.
- GCP deployment reads `DEPLOYMENT_GCP.md`, `SECURITY.md`, `OBSERVABILITY_RESILIENCE.md`, `DEPENDENCIES_SECRETS.md`, and `CI_RELEASE.md`.

## 4. Global invariants

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


## 5. Universal work-unit loop

Use this exact shape:

```text
UNDERSTAND
→ VERIFY ASSUMPTIONS
→ LOCATE AUTHORITATIVE IMPLEMENTATION
→ DEFINE OBSERVABLE SUCCESS
→ REPRODUCE / WRITE TEST
→ IMPLEMENT THE MINIMUM CHANGE
→ RUN FOCUSED TEST
→ RUN ADJACENT TESTS
→ RUN SECURITY / ADVERSARIAL / FAILURE TESTS WHEN RELEVANT
→ INSPECT DIFF
→ UPDATE DOCUMENTATION
→ UPDATE PROGRESS.md
→ COMMIT COHERENT WORK UNIT IF AUTHORIZED
→ STOP AT REVIEW GATE WHEN REQUIRED
```

Do not implement a whole phase as one uncontrolled patch.

## 6. Unknown-error protocol

For every unexpected failure:

1. capture exact command/request and full useful error;
2. determine whether deterministic;
3. reduce to smallest reproducer;
4. check pinned-version compatibility;
5. inspect relevant implementation/source;
6. form one explicit hypothesis;
7. test the smallest change that can confirm/refute it;
8. revert unsuccessful experiments;
9. after two substantially identical failures, abandon/re-evaluate the hypothesis;
10. convert confirmed defect to regression coverage;
11. document non-obvious root cause.

Never stack speculative edits until the symptom disappears.

## 7. Review gates

Stop and report at:
- end of Phase 0;
- end of Phase 1;
- end of Phase 2;
- end of Phase 3;
- before enabling Phase 5 execution;
- end of Phase 6;
- before Phase 9 provisioning;
- final release.

Do not automatically enter the next gated major phase.

## 8. Completion rule

A task is not done because it compiles. It is done when observable success criteria pass, relevant failure paths are tested, the diff is surgical, security invariants remain intact, documentation/progress match reality, and unresolved limitations are reported.
