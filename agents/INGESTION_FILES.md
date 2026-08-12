# Document Ingestion, Upload and Parser Safety Agent

## Scope

Use for file uploads, PDF/document parsing, extraction, chunking, ingestion limits, filenames, cleanup, and workspace material handling.

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

- Treat uploaded documents as untrusted data.
- Validate file size/type and parser limits server-side.
- Do not trust client MIME/extension alone.
- Bound pages/characters/chunks/time/resources as architecture requires.
- Preserve clear parse errors and cleanup partial artifacts.
- Uploaded/scope text cannot become privileged policy without separate structured validation.
- Do not log sensitive document content unnecessarily.

## Required workflow

1. Trace upload → validation → storage → parse → extraction → chunk → embedding → vector persistence.
2. Define resource limits and user-facing failure behavior.
3. Test malformed and mismatched types.
4. Ensure failure leaves consistent storage/vector state.
5. Test retry/idempotency if upload endpoint can duplicate work.
6. For scope documents, route through governance parser rather than treating prose as configuration.

## Scenario and failure playbook

- oversized file
- wrong MIME/extension
- malformed/truncated PDF
- zero-page/empty content
- extremely long text
- parser timeout
- unusual Unicode filename
- path-like filename
- duplicate upload/retry
- embedding failure after parse
- vector write failure
- malicious prompt instructions embedded in document
- cancellation during ingestion

## Minimum verification matrix

- valid document end-to-end ingest
- limit enforcement
- malformed input
- cleanup after partial failure
- duplicate/retry behavior
- RAG retrieval after ingest
- malicious document remains untrusted
- no path traversal/unsafe filename handling

## Definition of Done

- Limits are explicit and enforced.
- Partial failures do not leave misleading complete state.
- Parser errors are diagnosable without secret/data leakage.
- Scope content remains untrusted.
- Tests/docs/progress updated.

## Never do this

- Do not trust filename/MIME from client.
- Do not parse unbounded files.
- Do not convert uploaded instructions directly into authorization.
- Do not solve ingestion failure by changing chat model.
