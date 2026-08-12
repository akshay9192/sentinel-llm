# Sentinel LLM Baseline

This document records the reproducible upstream and local environment baseline for Phase 0A. It describes evidence observed on 2026-08-12; it does not claim that planned Sentinel governance features are implemented.

## Baseline identity

```text
UPSTREAM_REPOSITORY=https://github.com/Mintplex-Labs/anything-llm.git
UPSTREAM_DEFAULT_BRANCH=master
UPSTREAM_TAG=v1.15.0
UPSTREAM_COMMIT=70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f
FORK_BASE_COMMIT=70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f
CURRENT_PROJECT_COMMIT=4a1b1de4ece947348a16422dc377b9dee8783c58
ORIGIN_REPOSITORY=https://github.com/akshay9192/sentinel-llm.git

BASELINE_SELECTION_REASON=v1.15.0 is the newest stable release tag inspected. upstream/master was 203 commits ahead, but no post-release commit was shown to be required for Phase 0; the stable tag provides a reproducible baseline.
INTEGRATION_STRATEGY=Created integrate/anythingllm-baseline from v1.15.0, merged the independent Sentinel main history with --allow-unrelated-histories, preserved upstream application files, resolved README and LICENSE deliberately, then fast-forwarded main.
INTEGRATION_COMMIT=4a1b1de4ece947348a16422dc377b9dee8783c58
UPSTREAM_REMOTE=fetch https://github.com/Mintplex-Labs/anything-llm.git; push DISABLED
PERSONAL_FORK=not created / not required
```

`CURRENT_PROJECT_COMMIT` is the exact integrated tree that was inspected before this documentation commit. Both the pinned upstream commit and the original Sentinel head `1cdee27af70fa96653fa217039d24ca7c998df0d` are ancestors of the integration commit. The safety reference `backup/pre-anythingllm-integration` points to that original Sentinel head.

Stable tags inspected included `v1.15.0`, `v1.14.2`, `v1.14.1`, `v1.14.0`, and `v1.13.0`. The fetched upstream default-branch snapshot was `edefbec6960880aa983276e54cca305bac93ccac` on 2026-08-11. It was inspected but not selected because moving `master` was not needed for the baseline.

## Local toolchain

```text
OS=Windows 11 Home Single Language 10.0.26200 build 26200 (64-bit)
CPU=12th Gen Intel(R) Core(TM) i5-12450H; 8 cores; 12 logical processors
GPU=Intel(R) UHD Graphics; integrated GPU; approximately 2 GB adapter memory reported
RAM=16,494,456 KiB visible (approximately 15.73 GiB)
STORAGE=C: 509,722,226,688 bytes total; approximately 90,680,123,392 bytes free at capture
GIT_VERSION=2.47.0.windows.2

NODE_VERSION=system v24.18.1; validation v18.18.0 from an official temporary portable archive matching all repository .nvmrc files
NPM_VERSION=system 11.16.0; validation 9.8.1
PACKAGE_MANAGER=yarn
PACKAGE_MANAGER_VERSION=1.22.22
PNPM_VERSION=not installed
DOCKER_VERSION=not installed
DOCKER_COMPOSE_VERSION=not installed
OLLAMA_VERSION=0.32.8
PYTHON_VERSION=3.12.6
PYTHON3_VERSION=command alias not installed
OPENCLAW_VERSION=2026.7.1-2 (0790d9f); installed but not configured or used during Phase 0A
```

The official Node v18.18.0 Windows x64 archive had SHA-256 `AE45BC05F4FCC02A17C724670534DC928A2FF4287A14B40F17AFA8172601E790`, matching the official `SHASUMS256.txt`. It was extracted under the user temporary directory and did not change the system Node installation.

## Pinned build tooling

- Root, server, frontend, and collector `.nvmrc` files require Node `v18.18.0`.
- The repository uses Yarn v1 lockfiles in `server/`, `frontend/`, and `collector/`; the root intentionally has no lockfile.
- CI uses Node 18 and `yarn install --frozen-lockfile` for the lockfile-backed workspaces.
- The root test command is `yarn test`; the aggregate lint command is `yarn lint:ci`; the frontend production build is `cd frontend && yarn build`.
- The upstream Compose file is `docker/docker-compose.yml`. It persists `server/storage` and `collector/hotdir`, publishes port 3001, and defines `host.docker.internal` for host access.
- The pinned Dockerfile installs FFMPEG. The Windows host did not have FFMPEG or Docker installed during Phase 0A.
- `browser-extension` and `embed` are pinned Git submodules and remained uninitialized because the core application and upstream CI baseline do not require them.

## Phase 0A verification evidence

| Check | Result |
|---|---|
| Preflight | PASS — `.agents/preflight.ps1 -Acknowledge` validated the root instructions. |
| History preservation | PASS — both `70e0d2e` and `1cdee27` are ancestors of `4a1b1de`; no force push was used. |
| Dependency installation | PASS — root, server, frontend, and collector installed under Node 18/Yarn 1.22.22. Collector required one retry after `ESOCKETTIMEDOUT` fetching `zod-to-json-schema-3.25.0.tgz`; the cache-backed serialized retry succeeded. |
| Environment bootstrap | PASS with Windows workaround — the four ignored `.env` files were copied from upstream examples. The POSIX `cp`-based `yarn setup:envs` script is not portable through Yarn's Windows command shell. |
| Prisma bootstrap | PASS — client generation, all pinned SQLite migrations, and seed completed. |
| Test suite | PARTIAL — 22/23 suites and 196/199 tests passed. The three failures were the FFMPEG integration cases because `where ffmpeg` found no host executable. |
| Lint | PASS — `yarn lint:ci` completed across server, frontend, and collector. |
| Frontend build | PASS — Vite transformed 6,130 modules and the postbuild step completed. Upstream chunk-size, browser externalization, and `eval` warnings remain. |
| Working tree after validation | PASS — no tracked or untracked changes from dependency installation, environment bootstrap, Prisma, tests, lint, or build. |

### Exact significant commands

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .agents/preflight.ps1 -Acknowledge
yarn.cmd install --frozen-lockfile
yarn.cmd install --frozen-lockfile --network-timeout 300000 --network-concurrency 1
yarn.cmd prisma:setup
yarn.cmd test --runInBand
yarn.cmd lint:ci
Set-Location frontend; yarn.cmd build
```

The four ignored local environment files were copied with `Copy-Item` only after the upstream `yarn setup:envs` command reproduced the same Windows shell parsing failure twice. No secrets were added; the files contain upstream development placeholders.

## Known Phase 0A limitations

- Docker and Docker Compose are absent, so container startup was not a Phase 0A validation path. Phase 0B must use an upstream-supported bare-metal path or install Docker before claiming container acceptance.
- FFMPEG is absent on the Windows host, so three host-level collector audio tests did not pass. The upstream Docker image includes FFMPEG.
- Root `yarn setup:envs` assumes POSIX shell semantics and does not run correctly through Yarn on this Windows host.
- The machine-wide Node version is newer than the pinned version. Reproduction requires Node 18.18.0; Phase 0A used a verified portable distribution.
- No personal AnythingLLM fork was created because direct read-only upstream fetch preserves history and is sufficient.
- No Sentinel governance functionality was written during this phase.
