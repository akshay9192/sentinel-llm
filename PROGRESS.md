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

Phase: 2C
Sub-phase: Atomic audit storage
Status: Phase 2C complete; stopped for developer review before Phase 2D

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
- Reconciled the preserved post-Phase-1B documentation: the completion report is an intentional but duplicate local console-summary artifact not required by `PROJECT_PLAN.md`, so it remains untracked; its two matching tracker lines remain an unstaged local checkpoint.
- Revalidated pinned Prisma/SQLite, event-log, browser/API chat, workspace middleware, API-key, AIbitat, WebSocket, MCP, imported-skill, agent-flow, and scheduled-execution seams before deciding architecture.
- Added six accepted ADRs that resolve audit storage, governance context, execution integration, policy storage, checkpointing, and single-/multi-user posture without changing runtime code.
- Chose dedicated Sentinel audit tables in the existing application SQLite database, one installation-wide ordered chain, same-database mutation/outcome transactions, and explicit lifecycle records for non-atomic external effects.
- Chose a shared typed governance-context resolver called by every supported entry adapter, with fail-closed behavior and immutable request policy references.
- Chose the existing AnythingLLM agent framework as proposal carrier plus registered capability-specific restricted executors for final effects; AIbitat remains a partial interception point, not the final security boundary.
- Chose immutable versioned structured policies with a mutable workspace activation binding; raw scope and extracted candidates remain untrusted until validated and explicitly activated.
- Chose chained HMAC-authenticated local checkpoints with separately protected key material and a compatible future Phase 9 external anchor.
- Chose first-class support for single-user and multi-user modes through typed non-null principals, including a synthetic `instance_owner`, retained API-key principals, delegated agents, schedules, and bounded services.
- Cross-checked actor, workspace, policy-version, correlation/idempotency, audit, checkpoint, MCP, imported-skill, flow, scheduled, direct-mutation, fail-closed, testing, and rebase semantics across all six ADRs.
- Passed the explicitly authorized end-of-Phase-1 review gate and entered Phase 2A without beginning canonical hashing or persistence.
- Added `docs/AUDIT_EVENT_SCHEMA.md` as the version `1` logical audit contract; documentation alone satisfies the Phase 2A DoD, so no runtime validator, dependency, logger, Prisma model, or migration was created.
- Defined UUID v4 event/request/correlation/attempt/idempotency identifiers, a decimal-string global sequence, server-controlled millisecond UTC timestamps, typed non-null principals, bounded delegation/executor context, and workspace/thread/chat/resource semantics.
- Defined application-level append-only chat, governance, model, execution, and direct-mutation lifecycle events with explicit pending, completed, failed, denied, partial, and unknown states plus impossible-transition rules.
- Defined immutable policy-version/hash evidence, deterministic policy/execution decisions, stable reason/rule codes, ordered retrieval evidence, target/proposal/parameter hash placeholders, and default-off raw query/response capture.
- Defined an allowlist-first redaction policy, prohibited secret/content classes, bounded optional content/attributes, strict unknown-field rejection, forward-compatible versioning, sanitized examples, ADR/threat traceability, and the exact Phase 2B handoff.
- Entered explicitly authorized Phase 2B and kept the work isolated from Prisma, persistence, sequence allocation, verification, checkpoints, chat, governance, and execution integration.
- Added a pure schema-version-`1` canonical serializer with recursive UTF-16 key ordering, preserved array order and Unicode code points, explicit JSON escaping, deterministic finite-number handling, strict plain-data types, circular/accessor/prototype defenses, and bounded depth/size failure.
- Added a pure SHA-256 event-chain helper with exact UTC/sequence/hash-envelope checks, an all-zero genesis link restricted to sequence `"1"`, explicit `event_hash: null` pre-hash input, and inclusion of every other event field without input mutation.
- Added complete nested/Unicode `MODEL_STARTED` genesis and linked `MODEL_COMPLETED` fixtures with literal reviewed canonical strings and golden hashes `6b610d20a3b9f19db0c4c008f4bcdf3fa5447032605407e260e2b97b25e92421` and `e35b3f704eb077bb206382cf41220825e3f48c76000f248366679d2b23b0aee1`.
- Added focused tests for all required determinism/mutation cases plus property order, null/absence, empty string, booleans, numbers, Unicode variants, unsupported values, accessors, prototype-looking keys, circular data, schema/timestamp/hash/genesis failures, output format, and non-mutation.
- Updated `docs/AUDIT_EVENT_SCHEMA.md` with the exact canonical value domain, byte encoding, limits, version dispatch, genesis rule, event-hash contract, golden vectors, and Phase 2C boundary.
- Entered explicitly authorized Phase 2C without beginning idempotency, stored-chain verification, checkpointing, chat integration, governance, execution, frontend, or cloud work.
- Added dedicated `sentinel_audit_events` and singleton `sentinel_audit_chain_state` Prisma models plus an ordered application-database migration; Sentinel audit data remains separate from `event_logs` and no `audit.db` was created.
- Selected the singleton-head design after comparing latest-row derivation with explicit state: each append transaction's first application statement atomically increments the singleton `BigInt` sequence, acquiring SQLite writer serialization before the head is observed.
- Added a dedicated append service that rejects caller-supplied sequence/timestamp/hash metadata, snapshots drafts before its first await, cross-checks the singleton against the latest row, assigns exact decimal-string order and server time, validates and hashes the final event, inserts it, and advances the head in one transaction.
- Added a closed version-`1` runtime validator for field sets, UUIDs, typed principals, delegation/context structures, enums and event/state combinations, byte/list bounds, hash fields, bounded attributes, policy evidence, and core event-family invariants.
- Stored the complete populated canonical event alongside indexed scalar evidence; enforced DB-level uniqueness for event ID, global sequence, and event hash; kept workspace/user/thread/resource identities as non-cascading historical scalars.
- Confirmed exact Prisma `BigInt` sequence behavior above JavaScript `Number.MAX_SAFE_INTEGER`, fail-closed independent-client lock contention, rollback after injected post-insert failure, head-mismatch detection, restart continuity, and copied-database restore continuity.
- Documented the Phase 2C mapping, head-design comparison, transaction contract, index/constraint choices, full-schema validation boundary, explicit no-retry contention behavior, signed SQLite sequence ceiling, and later-phase exclusions in `docs/AUDIT_EVENT_SCHEMA.md`.

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
- Phase 1C preflight and Git reconnaissance: passed at pushed Phase 1B commit `cec53869e223efabc6f2a9edcbb97a35c5b2a48c`; the two preserved post-Phase-1B local documentation changes were inspected before editing.
- Phase 1C source verification: Prisma 5.3.1 SQLite datasource/transactions, best-effort/deletable `event_logs`, fragmented chat adapters, API-key actor loss, partial AIbitat dispatch, unauthenticated invocation UUID continuation, MCP transports, in-process imported skills, direct flow API calls, and ownerless auto-approved schedules were reconfirmed.
- Phase 1C documentation validation: repository-pinned formatting, ADR template/category checks, relative-link, source-path, threat-ID, phase-reference, cross-ADR, terminology, credential/personal-path, file-scope, and `git diff --check` checks passed.
- Phase 2A preflight and Git reconnaissance: passed at pushed Phase 1C commit `45f925ec51e2e644bd5b9d8f97157b70b4a0f9f6`; pre-existing local documentation was inspected and retained outside the Phase 2A work unit.
- Phase 2A source/convention verification: confirmed pinned UUID v4 usage and dependency, upstream integer workspace/thread/chat/user IDs, UUID agent invocations, absence of a Prisma audit schema, and existing BigInt-to-string JSON handling before choosing logical identifier types.
- Phase 2A documentation validation: repository-pinned formatting, schema-field/enum/lifecycle/example checks, relative-link and threat/ADR traceability, privacy/terminology/credential/personal-path scans, file-scope checks, and `git diff --check` passed.
- Phase 2B preflight and Git reconnaissance: passed at pushed Phase 2A commit `ec17de576780f8bb04bab2b62b0fa5e8b952623c`; pre-existing local documentation was inspected and retained outside the Phase 2B work unit.
- Phase 2B focused Jest under pinned Node 18.18.0: 2/2 audit suites and 48/48 tests passed; all six project-plan cases and malformed/security edge cases are covered.
- Phase 2B adjacent Jest under pinned Node 18.18.0: audit canonicalization, hash-chain, and upstream `safeJSONStringify` suites passed 3/3 suites and 55/55 tests.
- Phase 2B static validation: system and pinned-Node syntax checks passed; server-local ESLint passed for both audit modules; repository-pinned Prettier passed for source, tests, fixture, documentation, and this tracker.
- Phase 2C focused/adjacent Jest under pinned Node 18.18.0: canonicalization, hash-chain, atomic storage, migration, and upstream `safeJSONStringify` suites passed 5/5 suites and 71/71 tests.
- Phase 2C storage tests passed for genesis/linkage, exact persisted JSON/head state, caller-metadata rejection, mutation/accessor defense, 17 malformed-event attacks, duplicate event-ID rollback, injected post-insert rollback, missing/head-tampered state, 12 independent-client cross-workspace contenders, explicit held lock, restart/restore, unsafe-Number-range sequence, historical-reference survival, and DB constraints.
- Phase 2C migration tests applied all migrations to a fresh isolated database, repeated deploy with no pending work, upgraded a pinned pre-Phase-2C schema, and preserved an existing application marker row.
- Phase 2C static validation: Prisma 5.3.1 schema validation/client generation, pinned-Node syntax checks, server-local ESLint, repository-pinned Prettier, and `git diff --check` passed. The root ESLint configuration was not used for server files because its React plugin crashes under ESLint 9; the authoritative server-local configuration passed.

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
- Phase 1C made documentation-only decisions. No runtime, schema, migration, dependency, workflow, OpenClaw, model, or cloud operation was created or executed.
- All accepted ADRs require non-null actor context, required workspace where applicable, immutable policy reference, deterministic capability/target/parameter denial, mandatory authorization audit before effect, explicit unknown/partial outcomes, and bounded tamper-evident claims.
- Phase 2A stores no raw content or secrets by default, keeps model/classifier evidence separate from deterministic decisions, and makes malformed protected events fail closed without falling back to `event_logs`.
- No hashing, canonicalization, chain calculation, database write, migration, chat/AIbitat hook, governance engine, execution, OpenClaw, model call, or cloud action was implemented or run.
- Phase 2B canonicalization rejects undefined, non-finite/unsafe numeric values, BigInt, functions, symbols, accessors, custom/runtime objects, sparse/extended arrays, circular data, bad timestamps, malformed chain links, unknown schema versions, and populated/missing pre-hash `event_hash` without fallback or logging event content.
- Canonical output uses no randomness, ambient environment, locale, timezone, model, external service, or dependency beyond Node built-ins; no raw content storage or privacy policy was broadened.
- No database, migration, append, sequence allocation, transaction, verifier, checkpoint, chat, AIbitat, governance, MCP, flow, schedule, OpenClaw, frontend, or cloud integration was introduced.
- Phase 2C uses only dedicated Sentinel tables in the existing application SQLite DB, never `event_logs`; missing/invalid state, schema failure, uniqueness collision, lock timeout, and transaction failure throw controlled errors without a fallback append.
- The append transaction writes before reading the head, verifies state/latest-row agreement, and rolls back sequence, row, and head together; hostile caller chain metadata, accessors, mutation races, malformed fields, and cascading application-row deletion were tested.
- Phase 2C adds no runtime event emission or protected side effect. Contention losers fail closed as `AUDIT_STORAGE_BUSY`; automatic replay/retry is deliberately deferred to Phase 2D.

## Files Changed

- Phase 0A: integrated pinned upstream source/history; deliberately resolved `README.md` and `LICENSE`; added `docs/BASELINE.md`; updated this tracker.
- Phase 0B: `docs/BASELINE.md` acceptance matrix and failure/recovery evidence; this tracker.
- Phase 0C: `scripts/benchmarkLocalModel.js`, `scripts/benchmarkLocalModel.test.mjs`, `docs/LOCAL_MODEL_BENCHMARK.md`, `.gitignore`, and this tracker.
- Phase 0 identity: Sentinel-first `README.md`; `NOTICE.md`; `docs/UPSTREAM_ANYTHINGLLM.md`; adapted `CONTRIBUTING.md`, `SECURITY.md`, and issue templates; removed misleading upstream funding, sponsor automation, and provider-integration solicitation.
- Phase 1A: added `docs/CODEBASE_NOTES.md`; updated this tracker. No `server/`, `frontend/`, `collector/`, `docker/`, schema, migration, dependency, or runtime configuration file changed.
- Phase 1B: added `docs/THREAT_MODEL.md`; updated this tracker. No runtime, schema, migration, dependency, ADR, workflow, or configuration file changed.
- Phase 1C: added `docs/adr/001-audit-storage.md` through `docs/adr/006-single-vs-multi-user.md`; updated this tracker. No application or infrastructure file changed.
- Phase 2A: added `docs/AUDIT_EVENT_SCHEMA.md`; updated this tracker. No runtime code, test code, Prisma schema, migration, dependency, or integration hook changed.
- Phase 2B: added `server/utils/audit/canonicalize.js`, `server/utils/audit/hashChain.js`, focused audit tests and golden fixtures; updated `docs/AUDIT_EVENT_SCHEMA.md` and this tracker. No Prisma schema, migration, dependency, database, or runtime integration hook changed.
- Phase 2C: added dedicated Prisma audit models and migration, `server/utils/audit/validateEvent.js`, `server/utils/audit/auditDb.js`, atomic-storage and migration tests; updated `docs/AUDIT_EVENT_SCHEMA.md` and this tracker. No dependency, route, chat hook, governance, execution, frontend, OpenClaw, checkpoint, or cloud file changed.
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
- Audit storage: dedicated Sentinel Prisma tables in the existing application SQLite DB, separate from `event_logs`, with one global chain, mandatory pre-effect authorization events, same-DB mutation/outcome transactions, and explicit external-effect recovery states.
- Governance hook: one shared typed `GovernanceContextResolver` invoked by every supported entry adapter; uncovered governed paths deny or remain explicitly unsupported.
- Execution integration: AnythingLLM/AIbitat carries proposals; deterministic Sentinel authorization and registered capability-specific restricted executors control final effects. Unadapted MCP tools, imported JavaScript, effectful flows, built-ins, and ownerless schedules are unavailable for governed execution.
- Policy storage: dedicated immutable workspace policy versions plus a mutable active binding; raw documents and extracted candidates never directly authorize.
- Audit checkpoints: chained HMAC-authenticated local files outside SQLite with separate key material, versioned for a later explicitly gated external/KMS anchor.
- Product posture: both single-user and multi-user modes are supported through typed non-null principals; protected execution never relies on a nullable actor.
- Audit event schema: logical schema version `1` uses closed fields/enums, typed principals, explicit context/correlation IDs, application-level append-only lifecycle events, ordered global sequencing, strict privacy limits, and Phase 2B-compatible hash placeholders while remaining independent from the future Prisma row layout.
- Canonical hashing: schema-version-`1` events use explicitly escaped canonical JSON with recursively sorted object keys and preserved arrays; SHA-256 covers UTF-8 bytes including `schema_version` and `previous_event_hash`, excludes only a required-null `event_hash`, and returns lowercase 64-hex output.
- Atomic audit storage: one singleton chain-state row is the transaction serialization point; its sequence increment is the first application statement, and the event row plus final head update share one Prisma interactive transaction.
- Audit sequence storage uses Prisma `BigInt`/SQLite `INTEGER` with deterministic decimal-string mapping; event ID, sequence, and event hash are unique globally, while application resource IDs remain non-cascading historical scalars.
- Independent-client SQLite lock contention is not automatically retried in Phase 2C. A loser returns a controlled busy failure with no committed sequence; this avoids inventing Phase 2D idempotency semantics.

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
- Same-database audit improves local transaction coupling but shares the application DB compromise domain and may create SQLite write contention; independently protected checkpoints and Phase 2 concurrency tests remain required.
- Local HMAC checkpoints cannot resist compromise of the host, application process, checkpoint history, and key together; deletion of the newest local state may require an independently retained or future external head to expose rollback.
- Optional MCP, imported-skill, flow, built-in, connector, and scheduled effect paths remain denied/unsupported for governed execution until registered adapters and required tests exist.
- Phase 2A is a logical documentation contract, not runtime enforcement. Canonical bytes/genesis linkage belong to Phase 2B; Prisma mapping, append/sequence allocation, collision handling, and atomicity belong to Phase 2C; idempotency enforcement belongs to Phase 2D.
- Plain content hashes can disclose equality and permit guessing of low-entropy inputs; omission and minimization remain the primary privacy controls.
- Phase 2B validates the chain-hashing envelope and unsafe runtime values, not the complete Phase 2A closed event schema; event construction must apply full field/enum/lifecycle/privacy validation before hashing.
- The all-zero genesis sentinel is unambiguous only together with the enforced sequence-`"1"` rule. Phase 2C still owns atomic sequence assignment and parent-head selection; Phase 2E owns stored-chain verification.
- SQLite-backed Prisma `BigInt` sequence capacity is limited to signed 64-bit maximum `9223372036854775807`; exhaustion fails rather than wrapping, while the logical API continues to use decimal strings.
- Pinned Prisma 5.3.1 may reject independent concurrent writers with a bounded query timeout instead of queuing them all. Phase 2C guarantees no fork/gap and controlled failure, not automatic retry or guaranteed admission under contention.
- The mutable singleton is cross-checked against the latest event during append but is not an independently trusted checkpoint. Phase 2E still owns full historical verification and Phase 2F owns independently protected checkpoint evidence.
- Full version-`1` validation now protects append storage, but event-specific producing integrations and redaction of optional raw content remain owned by their later phases.

## Blockers

- None blocking the tested local Phase 0B development stack.
- Docker-specific acceptance remains an environment limitation and is not claimed as passed.
- No technical Phase 0C blocker is known.
- No Phase 1A blocker remains.
- No Phase 1A, Phase 1B, or Phase 1C blocker remains.
- No Phase 2A blocker remains.
- No Phase 2B blocker remains.
- No Phase 2C blocker remains.
- Phase 2D requires separate developer authorization; idempotency enforcement and replay semantics have not started.

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
- [x] Create all six required accepted ADRs with the required template categories.
- [x] Choose execution integration explicitly and answer every ADR-003 question from `PROJECT_PLAN.md`.
- [x] Choose single-user versus multi-user posture and typed actor semantics.
- [x] Choose versioned policy storage and activation semantics.
- [x] Choose local audit checkpoint strategy and guarantee boundaries.
- [x] Resolve audit storage, governance hook, actor context, correlation/idempotency, direct mutations, MCP, imported skills, flow-inner effects, and scheduled execution.
- [x] Cross-check all ADRs for security, implementation, testing, and rebase consistency.
- [x] Keep Phase 1C documentation-only, validate the complete diff, and stop at the end-of-Phase-1 review gate.
- [x] Document the version `1` logical audit event schema and every project-plan field concept or its explicit typed refinement.
- [x] Document chat, governed-execution, and direct-mutation lifecycles with valid and impossible transitions.
- [x] Document event types, completion states, principal/delegation/executor context, correlation/idempotency semantics, policy decisions, reason codes, field applicability, and sanitized examples.
- [x] Document default-off raw content, prohibited secrets, allowlisted bounded metadata, redaction principles, and hash-input meanings without implementing hashing.
- [x] Define forward-compatible schema evolution and fail-closed invalid-event behavior.
- [x] Keep Phase 2A documentation-only, validate the complete diff, and stop before Phase 2B.
- [x] Implement the schema-version-`1` canonical serializer with explicit JSON-compatible value, Unicode, number, timestamp, ordering, and failure rules.
- [x] Implement pure SHA-256 event hashing with `schema_version` and `previous_event_hash` included, `event_hash` excluded, strict lowercase hash format, and deterministic genesis linkage.
- [x] Store human-reviewable deterministic nested/Unicode genesis and second-chain fixtures with literal canonical strings and golden SHA-256 vectors.
- [x] Pass the six project-plan-required tests plus property-order, null/absence, primitive, unsupported-value, prototype, circular, schema, timestamp, genesis, self-hash, output-format, and non-mutation cases.
- [x] Keep Phase 2B free of DB integration, dependencies, runtime hooks, and later-phase implementation; update documentation and this tracker.
- [x] Add dedicated Prisma-managed Sentinel audit event and singleton chain-state tables in the existing application SQLite database without reusing `event_logs` or adding cascading foreign keys.
- [x] Atomically serialize global sequence allocation, head selection, final event validation/hashing, row insertion, and head advancement in one transaction.
- [x] Enforce event-ID, global-sequence, and event-hash uniqueness plus closed version-`1` validation and exact decimal-string/BigInt mapping.
- [x] Pass genesis, multi-append, rollback, write-failure, concurrent-writer, held-lock, duplicate, head-tamper, restart/restore, historical-reference, and malformed-input tests.
- [x] Pass fresh, repeated-startup, and pinned-upstream upgrade migration tests while preserving existing application data.
- [x] Keep Phase 2C free of idempotency, verification, checkpoints, chat/runtime hooks, governance, execution, frontend, and cloud work; update documentation and this tracker.

## Next Recommended Work Unit

Await explicit developer authorization to begin Phase 2D. Do not implement idempotency/replay behavior, full-chain verification, checkpointing, chat integration, governance, execution, OpenClaw, frontend-runtime, or cloud work before that authorization.

## Git State

Phase 2B began from local and remote `main` at `ec17de576780f8bb04bab2b62b0fa5e8b952623c` with pre-existing local documentation preserved outside the work unit. The Phase 2B work unit contains only pure canonical/hash modules, focused fixtures/tests, audit-schema documentation, and the intentional tracker update. Ignored `.codex-audit-temp/` remains preserved. No reset, clean, discard, force push, upstream write, dependency, database change, runtime integration, model benchmark, OpenClaw action, cloud action, or external side effect was performed.

Phase 2C began from local and remote `main` at `bcd226456616555f0fa9b6b15f204077f05c1fe1`. The two pre-existing Phase 1B tracker lines and untracked Phase 1B/2B completion reports remain preserved outside the Phase 2C work unit. Phase 2C changed only the Prisma audit schema/migration, isolated audit validator/append modules, focused tests, audit-schema documentation, and this intentional tracker update. No dependency, real application database, runtime integration, model, OpenClaw, cloud, upstream, or external side effect was used.
