# Progress Tracker

## Repository Baseline

Upstream: `https://github.com/Mintplex-Labs/anything-llm.git` (`master`, read-only push URL disabled)
Base tag: `v1.15.0`
Base commit: `70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f`
Current branch: `main`
Integrated baseline commit: `4a1b1de4ece947348a16422dc377b9dee8783c58`
Original Sentinel head: `1cdee27af70fa96653fa217039d24ca7c998df0d`
Safety reference: `backup/pre-anythingllm-integration`

## Current Phase

Phase: 0A
Sub-phase: Repository freeze and reproducibility
Status: complete; pending commit and push of baseline documentation

## Completed This Session

- Ran the mandatory preflight and Git reconnaissance from a clean `main`.
- Configured `upstream` for read-only AnythingLLM fetches and disabled its push URL.
- Inspected stable tags and 203 post-`v1.15.0` commits on `upstream/master`; selected stable `v1.15.0` because no newer change was required.
- Created `backup/pre-anythingllm-integration` at the original Sentinel head.
- Integrated pinned AnythingLLM and independent Sentinel histories in merge commit `4a1b1de4` without rewriting either history.
- Preserved Sentinel-owned instructions and upstream application source; resolved only README and LICENSE overlap deliberately.
- Recorded the exact repository, toolchain, hardware, integration, and validation baseline in `docs/BASELINE.md`.
- Installed the pinned dependency sets using verified portable Node 18.18.0 and Yarn 1.22.22.
- Initialized and seeded the ignored local SQLite database.
- Did not write Sentinel governance functionality.

## Tests Executed

- Preflight: passed against root `AGENTS.md`.
- Dependency install: passed for root, server, frontend, and collector. One collector registry timeout was resolved by a single cache-backed retry with serialized requests.
- Prisma generation/migration/seed: passed.
- `yarn test --runInBand`: 22/23 suites passed; 196/199 tests passed. The three failures require the missing host FFMPEG binary.
- `yarn lint:ci`: passed across server, frontend, and collector.
- `frontend: yarn build`: passed; 6,130 modules transformed and postbuild completed.
- Ancestry checks: pinned AnythingLLM and original Sentinel commits are both ancestors of the integration commit.
- Integration diff reviewed against the pinned commit; changes are Sentinel scaffolding plus the deliberate README and LICENSE resolutions.

## Security Checks

- Upstream push URL set to `DISABLED`; no write was made to Mintplex-Labs.
- No force push, history rewrite, destructive clean/reset, paid API configuration, governance code, OpenClaw execution, or cloud provisioning occurred.
- Local `.env` files remain ignored and contain only upstream development placeholders.
- Working tree was clean after install, migration, tests, lint, and build.

## Files Changed

- Integrated the pinned AnythingLLM application source and Git history.
- `README.md` — retained upstream operational content and added an honest Sentinel status notice.
- `LICENSE` — retained upstream MIT notice and added the Sentinel copyright holder.
- `docs/BASELINE.md` — Phase 0A evidence.
- `PROGRESS.md` — reconciled stale administrative state against Git reality.

## Architecture Decisions

- Use AnythingLLM `v1.15.0` at `70e0d2e` as the stable baseline rather than moving `upstream/master`.
- Preserve both histories with a two-parent integration commit; do not copy a source archive or rewrite published Sentinel history.
- Keep `origin` as the only writable development remote and disable pushes to `upstream`.
- Use the actual upstream source tree at repository root; do not nest AnythingLLM or invent conceptual directories.

## Known Limitations

- Docker and Docker Compose are not installed on this host.
- FFMPEG is not installed, causing only the three collector FFMPEG integration tests to fail.
- The upstream root `setup:envs` script assumes POSIX shell parsing and is not directly portable through Yarn on Windows.
- The system Node version is v24.18.1; verification used a checksum-verified portable Node v18.18.0 matching `.nvmrc`.
- The two optional Git submodules are pinned but uninitialized.

## Blockers

- Phase 0B cannot claim Docker/Compose acceptance while Docker is absent. An upstream-supported bare-metal acceptance path must be validated or Docker must be installed.
- No Ollama embedding model is currently present; Phase 0B will require a compatible local embedding model.

## Remaining DoD Items

- [x] Record upstream repository, stable tag, exact base SHA, fork/base SHA, branch, integration commit, and current inspected project commit.
- [x] Record local runtime, package-manager, Docker, Ollama, Python, OpenClaw, and hardware state.
- [x] Preserve upstream and Sentinel Git histories and create the safety reference.
- [x] Integrate actual pinned AnythingLLM source at repository root without governance functionality.
- [x] Run practical installation, migration, test, lint, and build checks and document exact limitations.
- [x] Create `docs/BASELINE.md` and update this tracker.
- [ ] Commit and push the Phase 0A documentation work to `origin/main`.

## Next Recommended Work Unit

Commit and push Phase 0A, then begin Phase 0B vanilla AnythingLLM acceptance. Do not start Phase 0B until the push is verified.

## Git State

Local `main` contains history-preserving integration commit `4a1b1de4`; `origin/main` remains at `1cdee27a` until the reviewed Phase 0A commits are pushed. Working tree contains only the intentional `docs/BASELINE.md` and `PROGRESS.md` documentation changes.
