# Progress Tracker

## Repository Baseline

Upstream: `https://github.com/Mintplex-Labs/anything-llm.git` (`master`, read-only push disabled)
Base tag: `v1.15.0`
Base commit: `70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f`
Current branch: `main`
Integration commit: `4a1b1de4ece947348a16422dc377b9dee8783c58`
Phase 0A documentation commit: `a71d8fb50bc036b3fc57f990934ada66699c03bd`
Original Sentinel head and safety reference: `1cdee27af70fa96653fa217039d24ca7c998df0d` (`backup/pre-anythingllm-integration`)

## Current Phase

Phase: 0B
Sub-phase: Vanilla AnythingLLM acceptance
Status: complete; pending commit and push of acceptance evidence

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
- Did not write Sentinel governance functionality.

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

## Security Checks

- Upstream push URL is `DISABLED`; no write or maintainer interaction occurred.
- No force push, destructive clean/reset, paid API, governance code, OpenClaw execution, or cloud provisioning occurred.
- Phase 0B used only loopback services, ignored placeholder configuration, a synthetic PDF, and local models.
- Telemetry was disabled; no cloud-provider credentials or fallback were configured.
- The outage test changed only AnythingLLM's ignored endpoint configuration; it did not stop or expose the user's Ollama service.

## Files Changed

- Phase 0A: integrated pinned upstream source/history; deliberately resolved `README.md` and `LICENSE`; added `docs/BASELINE.md`; updated this tracker.
- Phase 0B: `docs/BASELINE.md` acceptance matrix and failure/recovery evidence; this tracker.
- Runtime configuration, storage, models, logs, dependencies, and PDF fixture are ignored or outside the repository.

## Architecture Decisions

- Pin AnythingLLM `v1.15.0` instead of moving `upstream/master` because no post-release change was required.
- Preserve both Git histories; keep `origin` as the only writable remote and upstream pushes disabled.
- Use the actual upstream source tree at repository root; do not nest AnythingLLM.
- Validate Phase 0B on the pinned three-process development stack because installing Docker/WSL would be a major host change; record Docker as unvalidated.
- Use local Ollama for chat and embeddings plus local LanceDB; do not configure a paid fallback.
- Use supported query mode for the deterministic RAG fixture after vanilla automatic mode routed “According...” prompts to agent mode.

## Known Limitations

- Docker/Compose startup, container-to-host Ollama networking, and container persistence mounts remain unvalidated because Docker and WSL are absent.
- FFMPEG is absent, causing only three collector audio integration tests to fail.
- Root `setup:envs` assumes POSIX shell parsing and is not directly portable through Yarn on Windows.
- System Node is v24.18.1; validation used checksum-verified portable Node v18.18.0 matching `.nvmrc`.
- Optional Git submodules remain uninitialized.
- Vite used port 3002 because this test process could not bind port 3000.
- Vanilla automatic mode routed prompts beginning with “According” to agent mode; query mode was used for direct RAG acceptance.

## Blockers

- None blocking the tested local Phase 0B development stack.
- Docker-specific acceptance remains an environment limitation and is not claimed as passed.

## Remaining DoD Items

- [x] Boot the local vanilla application stack and reach Ollama.
- [x] Verify single-user authentication behavior and create a workspace.
- [x] Upload, parse, chunk, embed, store, retrieve, and answer from a deterministic PDF.
- [x] Verify SSE streaming and absent-information behavior.
- [x] Verify workspace, document, vector, and chat persistence across restart.
- [x] Verify Ollama outage diagnostics and reconnect without fallback.
- [x] Verify invalid model configuration is controlled and recoverable.
- [x] Record commands, results, failures, and limitations in `docs/BASELINE.md`.
- [x] Update this tracker.
- [ ] Commit and push Phase 0B evidence to `origin/main`.

## Next Recommended Work Unit

Commit and push Phase 0B, then begin Phase 0C local-model feasibility. Do not start Phase 0C until the push is verified.

## Git State

Local and remote `main` began Phase 0B at `a71d8fb50bc036b3fc57f990934ada66699c03bd`. The working tree contains only the intentional `docs/BASELINE.md` and `PROGRESS.md` evidence updates.
