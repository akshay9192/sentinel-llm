# Progress Tracker

## Repository Baseline

Upstream: `https://github.com/Mintplex-Labs/anything-llm.git` (`master`, read-only push disabled)
Base tag: `v1.15.0`
Base commit: `70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f`
Current branch: `main`
Integration commit: `4a1b1de4ece947348a16422dc377b9dee8783c58`
Phase 0A documentation commit: `a71d8fb50bc036b3fc57f990934ada66699c03bd`
Phase 0B validation commit: `068feaeba8c877dd41db3b5cf6c6defdd931d7d4`
Phase 0C model-selection commit: `5188a5c3faa2a15c58b403e0f2cd565d453f7d51`
Sentinel identity commit: `4dd57ee855b592b2cc5ce80cc5c06bd19f710d57`
Original Sentinel head and safety reference: `1cdee27af70fa96653fa217039d24ca7c998df0d` (`backup/pre-anythingllm-integration`)

## Current Phase

Phase: 1B
Sub-phase: Threat model
Status: Phase 1B complete; stopped for developer review before Phase 1C

## Completed This Session

- Ran mandatory preflight and Git reconnaissance from clean `main`.
- Selected stable AnythingLLM `v1.15.0`, preserved upstream and Sentinel histories in a two-parent integration commit, and created a safety reference.
- Recorded the exact repository, toolchain, hardware, integration, and validation baseline.
- Installed dependencies, initialized SQLite, ran baseline checks, committed Phase 0A, pushed to `origin/main`, and verified GitHub at `a71d8fb5`.
- Downloaded only the required local `nomic-embed-text` model; no cloud or paid model was configured.
- Booted vanilla server, collector, and frontend processes with the pinned Node toolchain.
- Created an isolated workspace through the public API.
- Generated and hashed a deterministic temporary PDF; verified upload, parsing, chunking, local embedding, LanceDB storage, query embedding, retrieval, context assembly, grounded generation, and SSE streaming.
- Verified the answerable fact `SAPPHIRE-7319` and an absent-information question independently.
- Restarted only the exact test processes and verified workspace, document, vector, parsed-file, and chat persistence.
- Verified controlled Ollama-unavailable behavior, successful reconnect, controlled invalid-model behavior, and final restoration of `llama3.2:3b`.
- Committed and pushed the complete Phase 0B evidence as `068feaeba8c877dd41db3b5cf6c6defdd931d7d4`; local and remote `main` were verified equal.
- Reconciled the stale Phase 0B state against Git: Phase 0B is complete in pushed commit `068feaeba8c877dd41db3b5cf6c6defdd931d7d4`; current work is Phase 0C.
- Listed installed models and inspected exact Ollama metadata, sizes, digests, context/embedding lengths, and capabilities.
- Confirmed candidates `llama3.2:3b`, `qwen3:8b`, and `gemma4:e4b` all advertise native tool support; confirmed `nomic-embed-text:latest` is an embedding-only model.
- Added a standalone Node benchmark harness and focused tests under `scripts/`; it uses Ollama's loopback native API, strict raw-output scoring, synthetic inert tool definitions, bounded deadlines, and no new dependencies.
- Ran repeated chat, guardrail, synthetic tool-planning, embedding, cold/warm, two-request concurrency, client-timeout, context, throughput, and `/api/ps` allocation measurements for the four installed models.
- Fixed a confirmed benchmark-scorer defect that rejected valid grounded absence phrasing; added regression coverage and reran only the affected fixture twice for all generative candidates.
- Completed `docs/LOCAL_MODEL_BENCHMARK.md` with measured results and selected role defaults: chat `llama3.2:3b`, guardrail/agent `qwen3:8b`, embeddings `nomic-embed-text:latest`.
- Cross-checked the report's scores, timings, memory figures, inventory metadata, embedding results, and context observations against all seven preserved JSONL runs; no evidence discrepancy was found.
- Kept reproducible raw JSONL local under `.codex-audit-temp/` and added that dedicated generated-evidence directory to `.gitignore`; the reviewed report is the versioned summary artifact.
- Established a Sentinel-first repository identity after Phase 0C: replaced the upstream-marketing root README, added pinned upstream attribution and an independent-derivative notice, and adapted public contribution, security, and issue guidance without modifying application code.
- Removed the upstream funding link, sponsor-README automation, and general provider-integration request template because they misrepresented or distracted from the independently maintained Sentinel roadmap.
- Did not write Sentinel governance functionality.
- Read the complete Phase 1A instruction set and all routed architecture, backend, frontend, database, audit, governance, execution, security, testing, ingestion, Ollama/RAG, and documentation specialist guidance.
- Mapped repository topology, server bootstrap, authentication, role and workspace authorization, users/API keys, workspace lifecycle, Prisma schema/migrations, transactions, concurrency, configuration, credentials, frontend routing, streaming, errors, and test conventions against pinned source.
- Traced browser and developer-API chat from frontend/route entry through mode routing, RAG, context assembly, Ollama/provider generation, SSE/WebSocket output, and chat persistence.
- Traced document upload through server-to-collector integrity handling, parser selection, normalized document output, chunking, Ollama embeddings, LanceDB, and Prisma vector/document mappings.
- Traced interactive, API, and scheduled agent initialization; built-in/imported skill discovery; intelligent tool reranking; AIbitat function dispatch; MCP; agent flows; nested execution; and outcome handling.
- Established that AIbitat's `fn.handler(args)` call is a partial common model-to-tool dispatch point, not a universal real-side-effect choke point; direct mutations and nested flow/MCP/imported effects require separate coverage.
- Built evidence-based actor, resource, side-effect, correlation-ID, trust-boundary, network/filesystem/process, and candidate Sentinel-control-point inventories in `docs/CODEBASE_NOTES.md`.
- Recorded Phase 1B questions and Phase 1C decision candidates without creating a threat model, ADR, new execution framework, or functional Sentinel code.
- Revalidated the Phase 1A security-critical source findings for AIbitat dispatch, invocation WebSocket binding, developer API identity, scheduled execution, MCP, flow-inner effects, workspace membership, and `event_logs`.
- Created `docs/THREAT_MODEL.md` with evidence-labelled scope, security objectives, assets, actors, trusted computing base, trust boundaries, identity differences, failure behavior, assumptions, non-goals, and known unknowns.
- Modelled 21 prioritized abuse cases covering fragmented governance paths, cross-workspace access, untrusted model-to-effect transitions, API and scheduled actor ambiguity, WebSocket attachment, indirect prompt injection, MCP/imported/flow bypasses, SSRF, filesystem/process escape, mandatory audit, audit tampering, cross-store recovery, replay/correlation, ingestion, secrets, policy/classifier integrity, Ollama, supply chain, OpenClaw, and future cloud.
- Defined required fail-closed security properties and mapped high-priority threats to Phase 2, 3, 4, 5, 6, 8, and 9 test ownership without implementing any control.
- Recorded the architecture decisions Phase 1C must resolve; no ADR, runtime change, dependency, OpenClaw execution, or cloud action was created.

## Tests Executed

- Preflight: passed.
- Dependency install: root, server, frontend, and collector passed; one registry timeout succeeded on one cache-backed serialized retry.
- Prisma generation/migration/seed: passed.
- `yarn test --runInBand`: 22/23 suites and 196/199 tests passed; three failures require missing host FFMPEG.
- `yarn lint:ci`: passed across all three workspaces.
- `frontend: yarn build`: passed; 6,130 modules transformed.
- Ancestry checks: pinned AnythingLLM and original Sentinel commits are both ancestors of the integration commit.
- Phase 0B health: server, collector, and isolated frontend returned HTTP 200.
- Authentication: single-user no-auth mode; token check HTTP 200.
- Ingestion: deterministic PDF parsed to 34 words and 60 estimated tokens.
- Embedding/storage: one document embedded with Ollama `nomic-embed-text`; Lance dataset and vector cache persisted.
- Retrieval/generation: source score 0.669 and streamed `SAPPHIRE-7319`; absent fact returned `It is not present.`
- Restart: workspace ID 1, one document, parsed PDF, vectors, and chat history persisted.
- Ollama outage: closed SSE abort with explicit diagnostic; no fallback.
- Ollama reconnect: grounded response passed after restore.
- Invalid model: closed SSE abort naming the nonexistent model; valid model restored.
- Phase 0C reconnaissance: `ollama list` confirmed four local models; `ollama show` recorded architecture, parameter count, quantization, context length, embedding length, and advertised capabilities for every candidate.
- `node --check scripts/benchmarkLocalModel.js`: passed on system Node v24.18.1.
- `node --test scripts/benchmarkLocalModel.test.mjs`: passed, initially 4/4 and after the scorer regression 5/5.
- Portable Node v18.18.0 syntax check, focused tests, and help command: passed after approved access to the checksum-verified temporary runtime.
- Prettier check initially reported both new script files needed formatting; `server/node_modules/.bin/prettier.cmd --write ...` formatted them, and the subsequent check passed.
- `git diff --check`: passed after script changes.
- Phase 0C smoke: `llama3.2:3b` chat passed 4/5 fixtures; the exact-output longer-context case returned the correct marker with extra prose.
- Main warm matrix, two runs per 19 fixtures: llama 18/38 exact scores, qwen 28/38, gemma 29/38 before correcting the absence matcher. All 16 schema-oriented runs per model produced valid strict JSON/schema.
- Corrected grounded-absence rerun: 2/2 passed for llama, qwen, and gemma.
- Guardrail binary decisions: llama 10/14 with two false allows and two false denies; qwen 14/14 with zero false allows; gemma 14/14 with zero false allows. Exact category scores were lower and are documented in the final report.
- Synthetic agent plans: llama 8/14 with six negative-case tool hallucinations; qwen 14/14 exact; gemma 12/14 with two wrong arguments. No proposed tool was executed.
- Embedding: `nomic-embed-text:latest` achieved 12/12 top-1 retrieval; 768 dimensions; cold six-document index 888.4 ms; warm indexes 232.1/271.7 ms; context probes returned at 256, 1024, and 2304 words, with the largest capped at 2048 evaluated tokens.
- Operational probe: cold ordinary requests were 9.47 s llama, 24.42 s qwen, and 51.61 s gemma; warm requests were 3.74/6.32/5.58 s. All bounded two-request probes completed; 25 ms client deadlines produced controlled aborts.
- `/api/ps` reported CPU-only execution and loaded allocations of 2.39 GiB llama, 5.53 GiB qwen, and 8.78 GiB gemma at a 4096-token context.
- Final Phase 0C verification: pinned Node v18.18.0 syntax check passed; focused tests passed 6/6, including result aggregation; CLI help passed; repository-pinned Prettier passed for both scripts, the report, and this tracker; `git diff --check` passed.
- Phase 0 identity verification: repository-pinned Prettier and `git diff --check` passed; every relative documentation link resolved; prohibited security terminology, upstream marketing redirects, credentials, personal paths, and core application changes were absent from the identity patch.
- Phase 1A preflight and Git reconnaissance: passed from clean `main` at the authorized identity commit.
- Phase 1A source-evidence scans: pinned entry points, callers, schemas, middleware, effect handlers, transactions, identifiers, and relevant tests were cross-checked with `rg` and direct file reads.
- Pinned Node v18.18.0 was restored under ignored `.codex-audit-temp/` and verified against the official SHA-256; five focused existing Jest suites passed (5/5 suites, 24/24 tests) for OpenAI-compatible chat, agent defaults/imported skills, agent-flow execution, and workspace-deletion protection. Jest required `--forceExit` because the selected upstream suites retain open handles.
- Phase 1A documentation checks: repository-pinned Prettier, documentation path/link validation, terminology scan, and `git diff --check` passed; no model benchmark or paid/cloud inference was run.
- Phase 1B preflight and Git reconnaissance: passed from clean `main` at the authorized Phase 1A completion commit.
- Phase 1B source verification: the partial AIbitat dispatcher, UUID WebSocket boundary, API-key actor gap, scheduled owner/workspace gap and automatic approval, MCP transports, direct flow API calls, workspace membership resolver, and best-effort/deletable event logs were confirmed in pinned source.
- Phase 1B documentation validation: repository-pinned Prettier, relative-link and source-path checks, security-terminology/secret/personal-path scans, core-runtime change check, and `git diff --check` passed.

## Security Checks

- Upstream push URL is `DISABLED`; no write or maintainer interaction occurred.
- No force push, destructive clean/reset, paid API, governance code, OpenClaw execution, or cloud provisioning occurred.
- Phase 0B used only loopback services, ignored placeholder configuration, a synthetic PDF, and local models.
- Telemetry was disabled; no cloud-provider credentials or fallback were configured.
- The outage test changed only AnythingLLM's ignored endpoint configuration; it did not stop or expose the user's Ollama service.
- Phase 0C used only loopback Ollama; no paid API, cloud fallback, OpenClaw call, or real capability execution was introduced.
- Tool-planning fixtures were synthetic and inert; raw model proposals were scored as untrusted data only.
- Repository identity documentation preserves Mintplex Labs attribution, makes planned security controls explicit, and does not claim that future Sentinel enforcement is already implemented.
- Phase 1A treats model output, retrieved text, uploaded content, and tool results as untrusted; it distinguishes tool selection from deterministic authorization and records the existing event log as insufficient for mandatory tamper-evident audit.
- No agent tool, MCP server, imported skill, flow, scheduled job, OpenClaw operation, external integration, or cloud resource was executed for architecture mapping.
- Phase 1B performed documentation and read-only source analysis only; it preserved model output and all content/tool results as untrusted, deterministic denial as final, mandatory audit failure as fail-closed, and audit claims as tamper-evident within explicit limits.

## Files Changed

- Phase 0A: integrated pinned upstream source/history; deliberately resolved `README.md` and `LICENSE`; added `docs/BASELINE.md`; updated this tracker.
- Phase 0B: `docs/BASELINE.md` acceptance matrix and failure/recovery evidence; this tracker.
- Phase 0C: `scripts/benchmarkLocalModel.js`, `scripts/benchmarkLocalModel.test.mjs`, `docs/LOCAL_MODEL_BENCHMARK.md`, `.gitignore`, and this tracker.
- Phase 0 identity: Sentinel-first `README.md`; `NOTICE.md`; `docs/UPSTREAM_ANYTHINGLLM.md`; adapted `CONTRIBUTING.md`, `SECURITY.md`, and issue templates; removed misleading upstream funding, sponsor automation, and provider-integration solicitation.
- Phase 1A: added `docs/CODEBASE_NOTES.md`; updated this tracker. No `server/`, `frontend/`, `collector/`, `docker/`, schema, migration, dependency, or runtime configuration file changed.
- Phase 1B: added `docs/THREAT_MODEL.md`; updated this tracker. No runtime, schema, migration, dependency, ADR, workflow, or configuration file changed.
- Ignored `.codex-audit-temp/` contains preserved generated benchmark JSONL and the earlier audit temp directory; it remains local and was not deleted or committed.
- Runtime configuration, storage, models, logs, dependencies, and PDF fixture are ignored or outside the repository.

## Architecture Decisions

- Pin AnythingLLM `v1.15.0` instead of moving `upstream/master` because no post-release change was required.
- Preserve both Git histories; keep `origin` as the only writable remote and upstream pushes disabled.
- Use the actual upstream source tree at repository root; do not nest AnythingLLM.
- Validate Phase 0B on the pinned three-process development stack because installing Docker/WSL would be a major host change; record Docker as unvalidated.
- Use local Ollama for chat and embeddings plus local LanceDB; do not configure a paid fallback.
- Use supported query mode for the deterministic RAG fixture after vanilla automatic mode routed “According...” prompts to agent mode.
- Use `llama3.2:3b` for practical interactive chat, `qwen3:8b` for the optional semantic guardrail signal and exact tool planning, and `nomic-embed-text:latest` for embeddings; model output remains untrusted and outside the authorization boundary.
- Present Sentinel as an independently maintained governance layer on the pinned AnythingLLM foundation; preserve upstream source, history, internal names, MIT attribution, and operational references instead of cosmetically rebranding application code.
- Phase 1A observed a partial common AIbitat model-to-plugin dispatch point, multiple chat entry implementations, multiple final-effect executors, and no universal request/effect correlation ID. Architecture choices remain reserved for Phase 1C.
- Likely low-divergence seams are isolated Sentinel services called by small middleware/chat/AIbitat/executor hooks plus dedicated Prisma and frontend modules; no integration seam was finalized in Phase 1A.
- Phase 1B establishes required security properties and threat-driven decision inputs only. Phase 1C retains responsibility for choosing actor context, audit/checkpoint storage, governance resolution, proposal/executor, MCP/imported-skill/flow, scheduled, WebSocket, and correlation/idempotency architecture.

## Known Limitations

- Docker/Compose startup, container-to-host Ollama networking, and container persistence mounts remain unvalidated because Docker and WSL are absent.
- FFMPEG is absent, causing only three collector audio integration tests to fail.
- Root `setup:envs` assumes POSIX shell parsing and is not directly portable through Yarn on Windows.
- System Node is v24.18.1; validation used checksum-verified portable Node v18.18.0 matching `.nvmrc`.
- Optional Git submodules remain uninitialized.
- Vite used port 3002 because this test process could not bind port 3000.
- Vanilla automatic mode routed prompts beginning with “According” to agent mode; query mode was used for direct RAG acceptance.
- Ollama updated from the historical Phase 0A baseline `0.32.8` to measured `0.32.9` before Phase 0C; both observations are explicitly time-bounded in their respective reports.
- Destructive OOM, contexts near advertised maxima, more than two concurrent requests, server-side timeout semantics, real OpenClaw execution, and an implemented Sentinel classifier remain untested by design.
- Only two warm repetitions were used per generative fixture; the results are feasibility evidence, not statistical model-quality claims.
- The standalone benchmark adds no dependencies and does not change the AnythingLLM application runtime; the full upstream application suite was not rerun for this isolated script/documentation work unit.
- Developer API key middleware authenticates a secret but does not retain the key/creator as a request actor; scheduled jobs persist no user/workspace owner and run an ephemeral agent with automatic approval. Their future actor/policy semantics are unresolved.
- Browser chat, developer API chat, OpenAI-compatible chat, and agent WebSocket execution do not share one pre-generation function; AIbitat dispatch does not cover direct mutations or every nested final effect.
- Existing `event_logs`, chat history, telemetry, console logs, and scheduled traces are optional/subsystem-specific and are not a mandatory tamper-evident audit trail.
- Route-by-route authorization parity, optional integrations, MCP transports, third-party redirect/redaction behavior, SQLite audit concurrency, and cross-store crash recovery require later focused analysis/testing.
- A local audit hash chain cannot detect complete database rewriting and hash recomputation without an independently protected checkpoint; control of the database, every checkpoint, and relevant keys remains outside that evidence guarantee.
- Optional connectors and third-party integrations are not exhaustively threat-tested; every unregistered effect path remains outside governed execution until explicitly inventoried and covered.

## Blockers

- None blocking the tested local Phase 0B development stack.
- Docker-specific acceptance remains an environment limitation and is not claimed as passed.
- No technical Phase 0C blocker is known.
- No Phase 1A blocker remains.
- No Phase 1B blocker remains. Phase 1C requires separate developer authorization; no ADR or later implementation work has started.

## Remaining DoD Items

- [x] Phase 0B evidence committed and pushed to `origin/main`.
- [x] Enumerate installed Phase 0C candidates and inspect Ollama capabilities.
- [x] Create `scripts/benchmarkLocalModel.js` with repeatable fixtures and bounded requests.
- [x] Benchmark cold/warm latency, first token, throughput, memory, structured output, tool calls, client timeout, and reasonable concurrency.
- [x] Benchmark local embedding behavior and record model size/context constraints.
- [x] Select and justify chat, guardrail, agent/tool, and embedding roles in the final report.
- [x] Complete final review and verification of `docs/LOCAL_MODEL_BENCHMARK.md`, the harness, tests, and documented numbers/claims.
- [x] Keep generated `.codex-audit-temp/` evidence local/ignored and retain the reviewed report as the versioned summary artifact.
- [x] Reconcile baseline/progress wording, run final focused/adjacent checks, inspect the entire diff, and stop at the end-of-Phase-0 review gate.
- [x] Commit and push the complete verified Phase 0C work unit to `origin/main`; verify local and remote branch SHAs match.
- [x] Create `docs/CODEBASE_NOTES.md` from pinned source evidence.
- [x] Map chat/streaming/modes, RAG/context/provider, ingestion/embedding/vector, workspace/schema/migrations, authentication/authorization, frontend, logging/errors, and relevant tests.
- [x] Map interactive/API/scheduled agents, intelligent selection, built-in/imported tools, MCP, flows, all discovered execution bypasses, and the partial execution choke point.
- [x] Record actors, resources, side effects, trust boundaries, correlation IDs, candidate Sentinel hooks, Phase 1B questions, Phase 1C decisions, and known unknowns.
- [x] Keep Phase 1A documentation-only; add no functional governance or execution code and no dependencies.
- [x] Update this tracker, run focused documentation/diff validation, and stop before Phase 1B.
- [x] Create `docs/THREAT_MODEL.md` grounded in Phase 1A and revalidated pinned source.
- [x] Inventory protected assets, materially distinct actors, trusted components, and trust boundaries with validation/failure assumptions.
- [x] Define prioritized abuse cases, required security properties, fail-closed behavior, test ownership, assumptions, non-goals, residual risks, and known unknowns.
- [x] Record the decisions required from Phase 1C without creating ADRs or implementing runtime controls.
- [x] Keep Phase 1B documentation-only and update this tracker before the Phase 1C review boundary.

## Next Recommended Work Unit

Await explicit developer authorization to begin Phase 1C. Do not create ADRs or begin audit, governance, classifier, execution, OpenClaw, frontend-runtime, or cloud implementation before that authorization.

## Git State

Phase 1B began from clean local and remote `main` at `11fc66d270a96c33350c3932a8571dc443ab4f32`. Its documentation-only changes are `docs/THREAT_MODEL.md` and this tracker; ignored `.codex-audit-temp/` remains preserved locally. No reset, clean, discard, force push, upstream write, runtime change, model benchmark, OpenClaw action, cloud action, or external side effect was performed.
