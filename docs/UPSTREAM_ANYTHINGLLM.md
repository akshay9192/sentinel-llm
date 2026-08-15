# Upstream AnythingLLM Documentation Reference

This file records operational information derived from the upstream AnythingLLM project. It is provided for attribution and for maintaining the pinned application baseline; it is not Sentinel-authored product documentation.

## Pinned upstream

```text
Repository: https://github.com/Mintplex-Labs/anything-llm.git
Tag: v1.15.0
Commit: 70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f
Pinned README: https://github.com/Mintplex-Labs/anything-llm/blob/70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f/README.md
Upstream documentation: https://docs.anythingllm.com
```

The pinned README is the authoritative upstream marketing, feature, provider, deployment, telemetry, and community reference for the integrated version. Linking the commit-pinned source avoids silently presenting moving upstream documentation as Sentinel behavior.

## Application foundation

AnythingLLM supplies the existing application architecture used by Sentinel:

- `frontend`: Vite/React user interface;
- `server`: Express application, workspace, vector-database, and LLM interactions;
- `collector`: document processing and parsing service;
- `docker`: upstream container build and deployment material;
- `embed` and `browser-extension`: optional pinned submodules.

Sentinel preserves this source and history. Repository identity documentation does not rename packages, APIs, environment variables, database objects, containers, or application UI.

## Pinned development workflow

The upstream-derived root commands used by the baseline are:

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
yarn.cmd test --runInBand
yarn.cmd lint:ci
```

The development server, frontend, and collector are started from the repository root with `yarn.cmd dev:server`, `yarn.cmd dev:frontend`, and `yarn.cmd dev:collector` in separate terminals.

Node `v18.18.0` is required by the checked-in `.nvmrc` files. On Windows, the POSIX `yarn setup:envs` implementation is not directly portable through Yarn's command shell; [BASELINE.md](BASELINE.md) documents the reviewed `Copy-Item` workaround and exact Phase 0 evidence.

## Local Phase 0 configuration

Phase 0 validated the existing AnythingLLM provider path with:

- local Ollama for chat;
- local Ollama for embeddings;
- LanceDB for vector storage;
- telemetry disabled;
- no paid or cloud-provider fallback.

This does not remove or relabel AnythingLLM's upstream integrations. It records only Sentinel's validated default/test path.

## Repository-surface classification

- Test, lint, translation, and package-version workflows are retained as upstream-derived validation infrastructure.
- Upstream Docker image workflows are retained unchanged for provenance and future review. The primary workflow targets the upstream `master` branch and is inactive on Sentinel's `main`; the release workflow is not evidence of a Sentinel production release and must not be used before the later release gate.
- Upstream funding configuration and sponsor-README automation were removed because they represented Mintplex funding on an independently maintained repository.
- Sentinel issue, contribution, and security guidance replaces upstream-facing routing.
- The upstream provider-integration request template was removed because Sentinel is not soliciting general provider integrations during its governance roadmap.

## Attribution

AnythingLLM is developed by Mintplex Labs and its contributors and is distributed under the MIT License. Sentinel LLM is maintained independently. No endorsement, affiliation, upstream pull request, or maintainer involvement is implied.
