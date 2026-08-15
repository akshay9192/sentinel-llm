# Contributing to Sentinel LLM

Sentinel LLM is an independent derivative of AnythingLLM. Contributions to this repository should advance Sentinel's documented governance roadmap while preserving upstream compatibility and provenance.

## Before contributing

1. Read [AGENTS.md](AGENTS.md), [PROJECT_PLAN.md](PROJECT_PLAN.md), and [PROGRESS.md](PROGRESS.md).
2. Check the current phase and review gate. Do not implement work from an unauthorized later phase.
3. Search [Sentinel issues](https://github.com/akshay9192/sentinel-llm/issues) before opening a new one.
4. Keep changes minimal and separate unrelated work.
5. Treat model, document, retrieval, and tool output as untrusted.

Do not open an AnythingLLM upstream issue or pull request on Sentinel's behalf. If a defect is confirmed to be exclusively upstream, document that finding in the Sentinel issue first; maintainers can decide whether upstream coordination is appropriate.

## Pull requests

- Link the relevant Sentinel issue or approved work unit.
- Add regression coverage for every confirmed defect unless technically impossible.
- Run focused and adjacent checks using the pinned runtime.
- Record exact commands, outcomes, limitations, and skipped prerequisites.
- Update documentation and `PROGRESS.md` when behavior or project state changes.
- Preserve unrelated developer work and upstream-compatible extension points.
- Never commit credentials, generated benchmark evidence, local storage, or environment files.

Security-sensitive changes must demonstrate failure behavior and final enforcement boundaries. Prompt refusal or semantic classification cannot substitute for deterministic authorization.

## Upstream foundation

The repository includes source and history from [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm), pinned initially at `v1.15.0`. Do not mass-rename AnythingLLM internals or remove upstream attribution. See [docs/UPSTREAM_ANYTHINGLLM.md](docs/UPSTREAM_ANYTHINGLLM.md).

## Security reports

Do not disclose vulnerability details in a public issue. Follow [SECURITY.md](SECURITY.md).

## License

Contributions are licensed under the repository's [MIT License](LICENSE). Existing upstream attribution remains binding.
