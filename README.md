# Sentinel LLM

**A governance control plane for verifiable, policy-enforced agentic AI execution.**

Sentinel LLM is an independent derivative project built on the open-source AnythingLLM platform. It is not an AnythingLLM rename: AnythingLLM supplies the application foundation, while Sentinel is adding a governance and security layer around model-assisted activity and future agentic execution.

> **Project status: Foundation / Phase 0 complete.** The pinned AnythingLLM baseline, local Ollama runtime, RAG path, and model-role feasibility have been validated. Sentinel-specific audit, governance, policy, execution-control, and UI features are planned and are not yet implemented.

## Why Sentinel

LLM proposals are probabilistic and untrusted. Prompt instructions alone cannot provide a dependable authorization boundary for side effects. Sentinel is intended to separate model reasoning from deterministic enforcement, record governance-relevant activity, and make controlled execution reviewable without requiring a paid model service.

## What Sentinel Adds

The Sentinel capabilities below are planned or being implemented according to [PROJECT_PLAN.md](PROJECT_PLAN.md); they must not be read as current runtime claims.

| Capability                                       | Status                           |
| ------------------------------------------------ | -------------------------------- |
| Pinned AnythingLLM application baseline          | Validated                        |
| Local Ollama chat                                | Validated                        |
| Local Ollama embeddings and LanceDB              | Validated                        |
| Grounded RAG baseline                            | Validated                        |
| Local model-role benchmark                       | Validated                        |
| Tamper-evident Sentinel audit trail              | Planned                          |
| Workspace governance profiles                    | Planned                          |
| Structured scope definitions                     | Planned                          |
| Deterministic policy enforcement                 | Planned                          |
| Semantic guardrails as additional denial signals | Planned                          |
| Capability, target, and parameter authorization  | Planned                          |
| Restricted OpenClaw execution                    | Planned                          |
| Execution outcome auditing                       | Planned                          |
| Security-focused adversarial testing             | Planned                          |
| Governance and audit UI                          | Planned                          |
| GCP deployment                                   | Future Phase 9; separately gated |

## Architecture

Sentinel's target control-plane architecture is:

```text
AnythingLLM application foundation
        +
Sentinel governance control plane
        |-- Verifiable activity
        |-- Deterministic policy enforcement
        `-- Governed agency
```

The planned protected-execution flow is:

```text
User / Agent Request
        |
        v
LLM Proposal
        |
        v
Schema Validation
        |
        v
Normalization
        |
        v
Deterministic Capability Authorization
        |
        v
Deterministic Target Authorization
        |
        v
Deterministic Parameter Authorization
        |
        v
Mandatory Authorization Audit
        |
        v
Restricted Execution
        |
        v
Outcome Audit
```

This is the target architecture for later phases, not functionality currently present in the Phase 0 runtime.

## Security Model

- Model output is never an authorization decision.
- A deterministic denial cannot be overridden by the LLM or a semantic classifier.
- Model output, retrieved text, uploaded documents, and tool output are untrusted input.
- Governance and protected-execution failures must fail closed.
- Audit records are described as **tamper-evident**, with explicitly bounded guarantees.
- Authentication, workspace access, audit access, and execution authorization are separate concerns.

## Current Project Status

Phase 0 is complete and the project is stopped at its mandatory review gate. Phase 1 has not started.

- Phase 0A pinned and integrated AnythingLLM `v1.15.0` while preserving both histories.
- Phase 0B validated startup, ingestion, local embeddings, LanceDB persistence, retrieval, grounded generation, streaming, restart persistence, and controlled Ollama failure/recovery.
- Phase 0C selected practical local model roles using preserved, repeatable evidence:

```text
MODEL_CHAT=llama3.2:3b
MODEL_GUARDRAIL=qwen3:8b
MODEL_AGENT=qwen3:8b
MODEL_EMBEDDING=nomic-embed-text:latest
```

These selections do not make a model authoritative. In particular, `qwen3:8b` is only a future semantic signal and proposal generator; deterministic authorization remains the planned enforcement boundary.

## Local-First Runtime

The validated default path is local-first:

```text
AnythingLLM + Ollama + LanceDB
```

No paid API is required for the validated Phase 0 chat, embedding, RAG, or benchmark paths. AnythingLLM's upstream provider integrations remain present and unchanged, but Sentinel does not use a paid provider as a hidden fallback.

## Upstream Foundation

Sentinel LLM is built on [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) by Mintplex Labs.

```text
Upstream repository: https://github.com/Mintplex-Labs/anything-llm.git
Pinned baseline tag: v1.15.0
Pinned baseline commit: 70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f
```

AnythingLLM provides the existing chat, workspace, document-ingestion, RAG, provider-abstraction, agent, frontend, server, and collector foundation. Sentinel-specific development is maintained independently and adds governance and controlled-execution capabilities on top. Sentinel does not claim authorship of upstream functionality or endorsement by Mintplex Labs.

The pinned upstream operational reference is preserved in [docs/UPSTREAM_ANYTHINGLLM.md](docs/UPSTREAM_ANYTHINGLLM.md).

## Development Roadmap

[PROJECT_PLAN.md](PROJECT_PLAN.md) is the authoritative phased roadmap. Review gates prevent later phases from starting automatically. [AGENTS.md](AGENTS.md) defines repository safety and routing rules for coding-agent work.

## Project Documentation

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — authoritative implementation plan and Definitions of Done
- [PROGRESS.md](PROGRESS.md) — current phase, evidence, limitations, and blockers
- [docs/BASELINE.md](docs/BASELINE.md) — pinned upstream and validated Phase 0A/0B baseline
- [docs/LOCAL_MODEL_BENCHMARK.md](docs/LOCAL_MODEL_BENCHMARK.md) — Phase 0C methodology, results, and exact model identities
- [docs/UPSTREAM_ANYTHINGLLM.md](docs/UPSTREAM_ANYTHINGLLM.md) — attributed upstream operational reference
- [NOTICE.md](NOTICE.md) — derivative-project provenance and independence notice

## Running the Current Baseline

Use Node `v18.18.0`, matching the repository `.nvmrc` files. The upstream-derived development stack is:

```powershell
yarn.cmd install --frozen-lockfile

Push-Location server
yarn.cmd install --frozen-lockfile
Pop-Location

Push-Location frontend
yarn.cmd install --frozen-lockfile
Pop-Location

Push-Location collector
yarn.cmd install --frozen-lockfile
Pop-Location

yarn.cmd prisma:setup
```

After configuring the environment, run `yarn.cmd dev:server`, `yarn.cmd dev:frontend`, and `yarn.cmd dev:collector` from the repository root in three separate terminals.

Environment files must be created from the checked-in examples and configured for the intended local services. The Phase 0 validation used Ollama on loopback, local LanceDB, telemetry disabled, and no cloud credentials. Windows-specific setup notes, exact commands, and known limitations are recorded in [docs/BASELINE.md](docs/BASELINE.md). Docker remains unvalidated on the recorded development host.

## Contributing and Security

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a Sentinel issue or pull request. Security concerns should follow [SECURITY.md](SECURITY.md) and must not be disclosed in a public issue with exploit details.

## License and Attribution

The repository remains MIT licensed. The [LICENSE](LICENSE) file retains Mintplex Labs attribution for the AnythingLLM foundation and includes Sentinel-specific attribution. Sentinel LLM is an independent derivative project and is not affiliated with or endorsed by Mintplex Labs.
