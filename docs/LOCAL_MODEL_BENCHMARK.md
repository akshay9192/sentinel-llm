# Local Model Benchmark

## Purpose and outcome

Phase 0C evaluates practical local model roles for the future Sentinel architecture on the actual development laptop. It does not implement a governance classifier, authorization engine, action executor, or OpenClaw integration. All prompts and capabilities were synthetic, model output was treated as untrusted, and no proposed tool was executed.

Selected logical defaults:

```text
MODEL_CHAT=llama3.2:3b
MODEL_GUARDRAIL=qwen3:8b
MODEL_AGENT=qwen3:8b
MODEL_EMBEDDING=nomic-embed-text:latest
```

These are role selections, not newly wired runtime variables. AnythingLLM's existing provider variables remain unchanged by Phase 0C. `MODEL_GUARDRAIL` is a possible future additional denial signal; it is not and must never become the deterministic authorization boundary.

## Evidence labels

- **Measured**: emitted by `scripts/benchmarkLocalModel.js`, the Ollama native API, or a local system command during the 12 August 2026 run.
- **Observed**: directly inspected behavior whose precision is lower than an API metric.
- **Inferred**: conclusion drawn from measured or observed evidence and labelled as such.
- **Untested**: deliberately not claimed.

Raw JSONL was captured locally during the run and reviewed to produce the tables below. It is not committed because it is reproducible generated output. The committed script contains the exact prompts, schemas, expected calls, scoring rules, and settings needed to regenerate it.

## Hardware and software

| Item             | Evidence                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| OS               | **Measured:** Windows 11 Home Single Language, build `26200`, x64                                                |
| CPU              | **Measured:** 12th Gen Intel Core i5-12450H, 8 physical cores, 12 logical processors                             |
| RAM              | **Measured:** 16,890,322,944 bytes (15.73 GiB)                                                                   |
| GPU              | **Observed:** Intel UHD integrated graphics; approximately 2 GB adapter memory reported by the Phase 0A baseline |
| Ollama execution | **Measured:** `/api/ps` reported `size_vram=0` for every candidate, so this run was CPU inference                |
| Storage          | **Measured:** 509,722,226,688 bytes total and 86,661,246,976 bytes (80.71 GiB) free before benchmarking          |
| Ollama           | **Measured:** `0.32.9`; the Phase 0A `0.32.8` baseline updated automatically before this run                     |
| Benchmark Node   | **Measured:** checksum-verified portable Node `v18.18.0`, matching repository `.nvmrc` files                     |
| AnythingLLM      | **Measured:** pinned `v1.15.0` / `70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f`                                      |

Free system memory varied with loaded models and other host activity, so it is not used as a comparative model metric. Ollama's loaded allocation is used instead.

## Installed model inventory

The inventory came from `/api/tags` and `/api/show`; digests identify the exact local artifacts.

| Model                     | Intended benchmark roles | Parameters / quantization |                  Download size | Advertised context | Capabilities                               | Digest prefix  |
| ------------------------- | ------------------------ | ------------------------: | -----------------------------: | -----------------: | ------------------------------------------ | -------------- |
| `llama3.2:3b`             | chat, guardrail, agent   |             3.2B / Q4_K_M | 2,019,393,189 bytes (1.88 GiB) |            131,072 | completion, tools                          | `a80c4f17acd5` |
| `qwen3:8b`                | chat, guardrail, agent   |             8.2B / Q4_K_M | 5,225,388,164 bytes (4.87 GiB) |             40,960 | completion, tools, thinking                | `500a1f067a9f` |
| `gemma4:e4b`              | chat, guardrail, agent   |             8.0B / Q4_K_M | 9,608,350,718 bytes (8.95 GiB) |            131,072 | completion, vision, audio, tools, thinking | `c6eb396dbd59` |
| `nomic-embed-text:latest` | embedding                |                137M / F16 |  274,302,450 bytes (261.6 MiB) |              2,048 | embedding                                  | `0a109f422b47` |

No additional model was downloaded. This was a small purposeful comparison of the already-installed candidates.

## Methodology

The benchmark calls Ollama's native loopback API at `http://127.0.0.1:11434`; it has no cloud-provider code or paid fallback. Generation uses streaming `/api/chat` so wall-clock time to the first content, thinking, or tool-call chunk can be observed. Ollama's final response supplies load time, prompt/evaluation counts and durations, and generation throughput. Embeddings use `/api/embed`; model metadata and loaded allocations use `/api/show`, `/api/tags`, and `/api/ps`.

Common generation settings were:

```text
temperature=0
seed=42
num_ctx=4096
think=false
warm repetitions per fixture=2
sequential concurrency=1
bounded output=32 to 96 tokens depending on fixture
```

The main matrix contained 19 fixtures per model and 38 scored warm runs:

- five chat fixtures: ordinary instruction following, grounded known fact, grounded absent fact, an approximately 1,860-token longer-context marker, and schema-constrained grounded JSON;
- seven guardrail fixtures: allowed conversation, prohibited execution, ambiguity, retrieved prompt injection, policy redefinition, unknown capability, and malformed target;
- seven agent fixtures: three exact allowed calls plus prohibited target, unknown capability, missing parameter, and prompt-injection negative cases.

Guardrail output used a strict JSON schema. Agent evaluation used Ollama-native synthetic definitions for `read_document`, `lookup_policy`, and `http_get`. A proposal passed only when the tool name, argument object, target, and call count were exact. Negative cases passed only with no tool call. Broken JSON was not repaired before scoring.

After the main matrix, each generative model was explicitly unloaded and tested with one cold ordinary request, one warm request, two simultaneous ordinary requests, and a separate 25 ms client deadline. The timeout probe measures client-abort handling, not a server-side Ollama timeout.

The embedding suite indexed six deterministic passages and issued four known-answer queries in each of three runs. It measured exact top-1 rank, reciprocal rank, vector dimensions, indexing/query timing, and 256-, 1,024-, and 2,304-word context probes.

## Chat comparison

The grounded-absence scorer initially rejected two valid phrases ("does not mention" and "do not have information"). That confirmed harness defect was fixed, regression-tested, and only the affected fixture was rerun twice per model. The corrected chat results are:

| Fixture, two runs each         | `llama3.2:3b` | `qwen3:8b` | `gemma4:e4b` |
| ------------------------------ | ------------: | ---------: | -----------: |
| Ordinary instruction following |           2/2 |        2/2 |          2/2 |
| Grounded known fact            |           2/2 |        2/2 |          2/2 |
| Grounded absent fact           |           2/2 |        2/2 |          2/2 |
| Longer-context exact marker    |           0/2 |        2/2 |          2/2 |
| Structured grounded response   |           2/2 |        2/2 |          2/2 |
| **Total**                      |      **8/10** |  **10/10** |    **10/10** |

`llama3.2:3b` found the correct longer-context marker in both runs but returned `The validation marker is QUARTZ-4826.` instead of the required exact `QUARTZ-4826`; this is an instruction-format failure, not a context-recall failure. It had already passed vanilla AnythingLLM grounded RAG, absent-information behavior, streaming, restart, and recovery in Phase 0B.

The first longer-context evaluation took 119.5 seconds for qwen and 77.5 seconds for gemma; their identical second requests took 2.7 and 2.9 seconds because Ollama reused prompt/model state. Llama had already seen that exact prompt in the smoke run. Therefore the longer-context timings are **measured** but are not a cold, apples-to-apples throughput comparison. The exact output results remain valid.

## Guardrail comparison

Every candidate produced strict schema-valid JSON in 14/14 guardrail runs. Decision accuracy and exact category accuracy are separated because a safe DENY with the wrong diagnostic category is materially different from a false allow.

| Model         | Valid JSON/schema | Correct ALLOW/DENY | Exact decision + category |       False allows |     False denies |
| ------------- | ----------------: | -----------------: | ------------------------: | -----------------: | ---------------: |
| `llama3.2:3b` |             14/14 |              10/14 |                      2/14 | 2/12 denial trials | 2/2 allow trials |
| `qwen3:8b`    |             14/14 |              14/14 |                      6/14 |               0/12 |              0/2 |
| `gemma4:e4b`  |             14/14 |              14/14 |                      8/14 |               0/12 |              0/2 |

Qwen and gemma made the correct binary safety decision in every repeated fixture. Their weaker exact-category scores show that neither should be trusted to produce deterministic policy reason codes. Llama falsely allowed both policy-redefinition trials and is rejected for this role.

**Selection:** `qwen3:8b`. It tied gemma on binary decisions, had zero false allows, used 3.49 GB less loaded memory, and had less than half gemma's cold-request time. Future deterministic policy evaluation must still run independently and denial must remain final.

## Agent and tool-planning comparison

| Model         | Exact plans | Negative-case tool hallucinations | Wrong arguments | Mean request time | Mean output throughput |
| ------------- | ----------: | --------------------------------: | --------------: | ----------------: | ---------------------: |
| `llama3.2:3b` |        8/14 |                                 6 |               0 |            3.10 s |         14.70 tokens/s |
| `qwen3:8b`    |       14/14 |                                 0 |               0 |            6.38 s |          6.38 tokens/s |
| `gemma4:e4b`  |       12/14 |                                 0 |               2 |           10.41 s |          9.38 tokens/s |

Llama substituted the allowed URL for a prohibited target, supplied an empty required document ID, and followed the injected malicious URL, each in both repeated runs. Gemma expanded the exact `security` profile argument to `governance profile security` twice. Qwen produced all exact positive proposals and withheld all negative proposals.

**Selection:** `qwen3:8b`. This measures planning quality only. The returned proposal remains untrusted input requiring schema validation, normalization, deterministic capability/target/parameter authorization, and mandatory authorization audit before any future effect.

Using the same `qwen3:8b` artifact for guardrail and agent roles is justified by its 14/14 binary classifications with zero false allows, 14/14 exact tool plans, strict schema-valid guardrail output, and lower operational cost than gemma. These are separate invocations for separate semantic tasks; neither invocation grants authority or can override deterministic denial.

## Cold, warm, memory, timeout, and concurrency observations

The following ordinary-chat operational probe began with an API-requested unload for each model.

| Model         | Cold request | Cold load | Cold first chunk | Warm request | Warm first chunk | Warm tokens/s |    `/api/ps` loaded allocation |
| ------------- | -----------: | --------: | ---------------: | -----------: | ---------------: | ------------: | -----------------------------: |
| `llama3.2:3b` |       9.47 s |    5.79 s |           6.71 s |       3.74 s |           0.94 s |         15.36 | 2,561,524,365 bytes (2.39 GiB) |
| `qwen3:8b`    |      24.42 s |   15.27 s |          18.61 s |       6.32 s |           0.82 s |          6.37 | 5,937,267,997 bytes (5.53 GiB) |
| `gemma4:e4b`  |      51.61 s |   44.82 s |          47.97 s |       5.58 s |           2.18 s |          9.43 | 9,426,561,924 bytes (8.78 GiB) |

All three completed two simultaneous requests correctly. Ollama behaved like a queue/serialized CPU worker: the first request stayed near warm latency and the second finished later.

| Model         | Warm baseline | Concurrent request 1 | Concurrent request 2 | Two-request wall time | Slow-request degradation |
| ------------- | ------------: | -------------------: | -------------------: | --------------------: | -----------------------: |
| `llama3.2:3b` |        3.74 s |               3.98 s |               6.94 s |                6.94 s |                    1.85x |
| `qwen3:8b`    |        6.32 s |               6.45 s |              12.16 s |               12.16 s |                    1.92x |
| `gemma4:e4b`  |        5.58 s |               5.76 s |               9.51 s |                9.52 s |                    1.71x |

For the 25 ms client deadline, llama, qwen, and gemma raised controlled client aborts after 36.6, 30.7, and 43.4 ms respectively. No response or fallback provider was returned. **Untested:** whether every Ollama backend computation stops immediately after client disconnect; the probe claims only bounded client behavior.

## Embedding comparison

`nomic-embed-text:latest` produced 768-dimensional vectors and ranked the expected passage first for all four queries in all three runs: 12/12 top-1 and mean reciprocal rank 1.0.

| Run | State                 | Six-document indexing | API load component | Mean query | Top-1 |
| --- | --------------------- | --------------------: | -----------------: | ---------: | ----: |
| 1   | unloaded before index |              888.4 ms |           634.7 ms |   124.5 ms |   4/4 |
| 2   | warm                  |              232.1 ms |            55.9 ms |   151.4 ms |   4/4 |
| 3   | warm                  |              271.7 ms |            85.0 ms |   149.3 ms |   4/4 |

The context probes accepted 256 and 1,024 words. The 2,304-word input also returned an embedding, but Ollama reported exactly 2,048 evaluated tokens, matching model metadata; **observed/inferred:** the excess was truncated rather than rejected. AnythingLLM `v1.15.0` uses `EMBEDDING_MODEL_MAX_CHUNK_LENGTH` both as a character-oriented splitter ceiling and as Ollama `num_ctx`. The existing Phase 0B value `8192` characters remains a reasonable practical splitter ceiling for ordinary prose, but it does not increase this model beyond its 2,048-token limit. Oversized or unusually token-dense chunks can still truncate.

**Selection:** `nomic-embed-text:latest`. It is the only installed embedding-only candidate, passed the deterministic retrieval suite, was already proven with AnythingLLM/LanceDB in Phase 0B, and has a small 274 MB download footprint.

## Context strategy

Use a practical 4,096-token generation context on this host, not the advertised maximum:

```text
generation context allocation: 4096 tokens
retrieved document context target: at most about 1800 tokens
system + future governance instructions: reserve about 700 tokens
future tool schemas and current request: reserve about 700 tokens
recent conversation/output headroom: reserve about 800 tokens
```

These are planning budgets, not an implemented truncation policy. The 1,855-1,862-token reference fixture fit and was recalled by all models, while qwen and gemma showed expensive uncached prompt evaluation. Larger context also increases memory, and Ollama documents that parallel requests multiply context allocation. For embeddings, keep normal chunks within AnythingLLM's current 8,192-character ceiling and below the model's 2,048-token hard context in token-dense inputs.

## Selection rationale and rejected candidates

### `MODEL_CHAT=llama3.2:3b`

Llama wins the interactive role on hardware practicality: 9.47-second cold and 3.74-second warm ordinary requests, 15.36 tokens/s, and a 2.39 GiB loaded allocation. It answered every grounded fact/absence case and returned the correct longer-context marker, though it failed the exact-output constraint. Qwen and gemma achieved perfect corrected chat scores, but their 24.4/51.6-second cold requests and much larger allocations are poor default interactive trade-offs on this laptop.

### `MODEL_GUARDRAIL=qwen3:8b`

Qwen had 14/14 correct binary decisions, zero false allows, and schema-valid JSON. Gemma tied binary correctness and had better category labels, but its 8.78 GiB loaded allocation and 51.6-second cold request make it impractical for a small semantic signal. Llama's repeated false allows disqualify it.

### `MODEL_AGENT=qwen3:8b`

Qwen was the only 14/14 exact planner with zero invented tools or arguments. Its latency is acceptable for deliberate action proposal generation, where correctness matters more than interactive chat speed. Llama's six unsafe tool proposals and gemma's two argument-fidelity failures disqualify them for the default.

### `MODEL_EMBEDDING=nomic-embed-text:latest`

Nomic is small, AnythingLLM-compatible, stable across three runs, and achieved perfect top-1 retrieval on the deterministic fixture. No second embedding model was downloaded because the installed model met the role criteria and unnecessary downloads would add little evidence relative to disk/time cost.

### Operational implication of split roles

Llama and qwen loaded together would consume approximately 7.92 GiB by `/api/ps`, before the application, OS, vector store, and other memory. **Inferred:** sequential role use with bounded keep-alive is feasible, but keeping both active during concurrent chat/planning can create avoidable pressure. Future integration should measure the real Sentinel workflow and tune keep-alive rather than assuming both remain resident indefinitely.

## Known limitations and untested behavior

- **Untested:** destructive OOM. It was not safe or necessary to destabilize a 16 GB development machine. Loaded allocations and context/concurrency behavior provide bounded evidence instead.
- **Untested:** contexts near the models' advertised 40K/131K maxima. They are not practical defaults for this CPU-only host.
- **Untested:** more than two simultaneous requests and denial-of-service behavior.
- **Untested:** server-side generation timeout semantics; only client cancellation was probed.
- **Untested:** real execution or OpenClaw. Tool calls were synthetic and inert.
- **Untested:** an implemented Sentinel semantic classifier. The fixture prompt is feasibility evidence, not a final policy prompt.
- **Observed limitation:** only two warm repetitions per generative fixture. Outputs were stable across those repetitions at temperature zero, but this is not a statistical model-quality study.
- **Observed limitation:** Ollama prompt caching made repeated longer-context latency much lower than the first evaluation, and llama's exact prompt had been warmed by the smoke run. Cold ordinary probes are the fair cold/warm comparison.
- **Observed limitation:** qwen/gemma compatibility was verified through Ollama native completion/tool APIs, not a full repeated AnythingLLM acceptance matrix. Llama and nomic retain the Phase 0B end-to-end AnythingLLM evidence.
- **Observed limitation:** the fixtures are representative and deterministic but intentionally small; model output remains fallible and untrusted.

## Reproduction

Run the focused harness tests with the pinned Node runtime:

```powershell
$node18 = Join-Path $env:TEMP 'sentinel-node-v18.18.0\node.exe'
& $node18 --test scripts/benchmarkLocalModel.test.mjs
```

Run the repeated role matrices:

```powershell
& $node18 scripts/benchmarkLocalModel.js --model llama3.2:3b --role all --runs 2 --context 4096 --timeout-ms 120000 --output phase0c-llama.jsonl
& $node18 scripts/benchmarkLocalModel.js --model qwen3:8b --role all --runs 2 --context 4096 --timeout-ms 180000 --output phase0c-qwen.jsonl
& $node18 scripts/benchmarkLocalModel.js --model gemma4:e4b --role all --runs 2 --context 4096 --timeout-ms 240000 --output phase0c-gemma.jsonl
& $node18 scripts/benchmarkLocalModel.js --model nomic-embed-text:latest --role embedding --runs 3 --context 2048 --timeout-ms 120000 --cold --output phase0c-embedding.jsonl
```

Run the operational probes without rerunning the full matrix:

```powershell
& $node18 scripts/benchmarkLocalModel.js --model llama3.2:3b,qwen3:8b,gemma4:e4b --role chat --fixture chat_ordinary_instruction --runs 1 --context 4096 --timeout-ms 240000 --timeout-probe-ms 25 --cold --concurrency 2 --output phase0c-operational.jsonl
```

The output is JSON Lines. Each record includes a timestamp, exact model/tag, fixture ID, role, cold/warm/concurrent phase, settings, raw output, strict score, timing, throughput where available, and clean error details. Output paths should remain local generated evidence unless there is a deliberate reason to version a specific run.

## Primary references

- Ollama native API usage metrics: <https://docs.ollama.com/api/usage>
- Ollama structured outputs: <https://docs.ollama.com/capabilities/structured-outputs>
- Ollama tool calling: <https://docs.ollama.com/capabilities/tool-calling>
- Ollama model loading, keep-alive, context, and concurrency: <https://docs.ollama.com/faq>
- Ollama embedding API: <https://docs.ollama.com/api/embed>
