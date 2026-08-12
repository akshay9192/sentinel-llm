# Codex Specialist Agent Pack

This pack splits project instructions by engineering responsibility.

## Recommended installation

Copy the entire `agents/` directory and root `AGENTS.md` into the repository root:

```text
repo/
├── AGENTS.md
├── PROJECT_PLAN.md
├── PROGRESS.md
├── agents/
│   ├── ARCHITECTURE_RESEARCH.md
│   ├── BACKEND_API.md
│   ├── FRONTEND.md
│   ├── DATABASE.md
│   ├── AUDIT.md
│   ├── GOVERNANCE.md
│   ├── EXECUTION_OPENCLAW.md
│   ├── SECURITY.md
│   ├── TESTING_QA.md
│   ├── DOCKER_LOCAL_RUNTIME.md
│   ├── OLLAMA_MODELS_RAG.md
│   ├── INGESTION_FILES.md
│   ├── OBSERVABILITY_RESILIENCE.md
│   ├── DEPENDENCIES_SECRETS.md
│   ├── DEPLOYMENT_GCP.md
│   ├── CI_RELEASE.md
│   └── DOCUMENTATION.md
```

The root file tells Codex exactly which specialist documents to load for a task. This is safer than assuming the upstream AnythingLLM directory names before Phase 1 architecture mapping.

## Why not put nested AGENTS.md files directly into guessed frontend/backend paths?

`PROJECT_PLAN.md` explicitly says exact paths must be confirmed during Phase 1. If we guessed paths now, Codex could apply the wrong scope or create unnecessary directories. After Phase 1 maps the real pinned repository, you may optionally copy specialist contents into real nested `AGENTS.md` files for automatic directory scoping.

## Multi-specialist rule

Security-sensitive tasks almost always require multiple files. For example:

- execution endpoint: BACKEND_API + EXECUTION_OPENCLAW + SECURITY + AUDIT + TESTING_QA
- governance migration: DATABASE + GOVERNANCE + SECURITY + TESTING_QA
- audit viewer: AUDIT + BACKEND_API + FRONTEND + SECURITY + TESTING_QA
- GCP rollout: DEPLOYMENT_GCP + SECURITY + OBSERVABILITY_RESILIENCE + DEPENDENCIES_SECRETS + CI_RELEASE
