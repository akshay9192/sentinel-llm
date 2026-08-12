# Ollama, Local Models, Embeddings and RAG Agent

## Scope

Use for local-model feasibility, chat/guardrail/agent/embedding model selection, Ollama configuration, benchmarking, structured-output/tool-call reliability, and RAG diagnosis.

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

- Default runtime must remain local-first and usable without paid APIs.
- Model roles may differ: chat, guardrail, agent/tool planner, embeddings.
- Select empirically on real developer hardware.
- Measure size, load time, first-token latency, throughput, memory, context feasibility, structured output, tool calls, cold/warm starts, timeout, concurrency, and OOM behavior.
- Model output remains untrusted and never authorizes effects.
- Diagnose RAG pipeline before prompt engineering.

## Required workflow

RAG diagnosis order:
```text
document parsing
→ chunks
→ embeddings
→ vector storage
→ query embedding
→ retrieved chunks
→ context assembly
→ generation
```

Benchmark:
1. pin Ollama/model versions/digests where available;
2. use repeatable prompts/fixtures;
3. record hardware and context size;
4. test structured action outputs separately from prose quality;
5. choose practical defaults, not maximum-size models.

## Scenario and failure playbook

- **Wrong answer with wrong chunks:** fix retrieval/indexing, not prompt.
- **Right chunks but hallucinated answer:** investigate generation/context instructions.
- **OOM:** reduce model/context/concurrency based on measurements.
- **Slow cold start:** record separately from warm throughput.
- **Malformed JSON:** strict parser rejects; benchmark structured-output reliability.
- **Tool-call error:** cannot be compensated by relaxed execution authorization.
- **Ollama timeout/unavailable:** fail safely; no paid fallback.
- **One model works once:** insufficient; test representative corpus/concurrency.

## Minimum verification matrix

- benchmark script/report
- repeated structured output tests
- tool-call correctness
- RAG grounded-answer fixture
- cold/warm timings
- timeout
- concurrent requests where practical
- OOM behavior safely
- no hidden external provider dependency

## Definition of Done

- Default models are justified by measured feasibility.
- Known hardware/context limitations documented.
- RAG defects are localized correctly.
- No model is trusted as authorization boundary.
- `LOCAL_MODEL_BENCHMARK.md` and `PROGRESS.md` updated.

## Never do this

- Do not choose a model solely from reputation or one successful prompt.
- Do not hide local failure with cloud API.
- Do not prompt-hack around broken retrieval.
- Do not accept malformed structured action output.
