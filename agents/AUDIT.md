# Tamper-Evident Audit System Agent

## Scope

Use for audit event schema, canonicalization, SHA-256 chain hashing, atomic append, idempotency/correlation, verifier, checkpoints, chat/execution lifecycle audit, audit viewer backend.

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

- Maintain a versioned, deterministic event model.
- Minimize raw sensitive content; hash or identify where evidence is sufficient.
- Canonical serialization must be deterministic independent of object insertion order.
- Event hash includes previous hash and schema version and excludes its own hash field.
- Append sequence and parent selection atomically.
- Detect modification, deletion, insertion, reorder, duplicate, truncation.
- Checkpoint outside primary audit DB with separately protected authentication/signing material.
- Represent partial/failure lifecycle honestly.
- Preserve workspace-aware audit authorization.

## Required workflow

1. Define/confirm schema and event lifecycle before changing logger.
2. Create deterministic canonical fixtures.
3. Unit-test canonicalization edge cases: null, arrays, booleans, Unicode, timestamps, empty strings, numbers.
4. Test hash mutation sensitivity.
5. Implement append transaction and concurrency tests.
6. Define request/correlation/idempotency semantics.
7. Verify clean chain and destructive tamper corpus.
8. Verify checkpoint independently from DB.
9. Integrate lifecycle events at request/guardrail/model/execution boundaries.
10. Ensure mandatory authorization event can be persisted before protected effect.

## Scenario and failure playbook

- **First event:** deterministic genesis behavior.
- **Concurrent append:** one serial order; no forked parent head.
- **Rollback/write failure:** no committed partial sequence/head.
- **Duplicate request:** defined replay/idempotency behavior.
- **Event missing after failure:** fix lifecycle hook; never fabricate history.
- **Manual payload edit:** verifier reports first invalid sequence.
- **Deleted/reordered row:** verifier detects linkage/sequence break.
- **Entire DB rewritten with valid internal hashes:** trusted checkpoint must expose mismatch if checkpoint threat model covers it.
- **Checkpoint missing/stale/modified:** report distinct status; do not claim verified.
- **Audit DB unavailable during protected execution:** deny.
- **Chat audit unavailable:** only documented degraded mode if it cannot weaken security integrity.
- **Secret-like field:** redact before persistence.

## Minimum verification matrix

- canonical fixture determinism
- mutation changes hash
- transaction rollback
- concurrent append
- DB lock
- duplicate sequence/request
- destructive tamper suite
- checkpoint valid/wrong/missing/stale/modified
- full-chain rewrite vs checkpoint
- lifecycle success/failure/cancellation
- workspace audit access tests

## Definition of Done

- Chain is deterministic and verifiable.
- Concurrent writes cannot corrupt sequence/linkage.
- Destructive tests detect expected tampering.
- Checkpoint threat and limitation are documented.
- Required lifecycle events exist for failure as well as success.
- Terminology remains tamper-evident.
- `PROGRESS.md` updated.

## Never do this

- Do not call the local chain immutable/tamper-proof.
- Do not read head outside transaction and write later.
- Do not log secrets/raw auth headers.
- Do not backfill fake historical events.
- Do not let audit viewer authorization depend only on frontend filtering.
