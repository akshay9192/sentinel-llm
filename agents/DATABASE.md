# Database, Prisma, SQLite, Migration and Persistence Agent

## Scope

Use for Prisma schema, migrations, SQLite behavior, governance profile persistence, audit DB storage, checkpoint references, uniqueness/idempotency constraints, backup/restore interactions.

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

- Inspect authoritative schema and migration mechanism for pinned AnythingLLM; never assume old model files.
- Preserve existing user/workspace data.
- Separate governance/audit storage according to ADR decisions.
- Make migrations safe for fresh DB and upgrade from upstream DB.
- Use transactional/serialization semantics for audit chain head/sequence.
- Define uniqueness and idempotency deliberately.
- Keep migrations deterministic and restart-safe.
- Understand SQLite lock/busy behavior rather than disabling it.

## Required workflow

1. Inspect schema, prior migrations, startup migration runner, ORM/model abstractions, serializers, API validators, tests.
2. Create representative pre-migration DB fixture/copy.
3. Define defaults/backfill and invalid-data behavior.
4. Apply migration on fresh DB and upgrade DB.
5. Repeat startup/migration to prove idempotent behavior.
6. Test failure/recovery path.
7. For concurrent audit writes, test real transaction semantics.
8. Run backup/restore verification when persistence contract changes.

## Scenario and failure playbook

- **Existing workspace lacks profile:** backfill documented default (`general` unless decision changes).
- **Invalid existing value:** do not silently broaden privilege; migrate conservatively or block with explicit remediation.
- **Migration interrupted:** startup/recovery must not corrupt state.
- **SQLite locked:** use bounded wait/short transaction/serialization strategy; do not disable locking.
- **Concurrent audit writers:** must not allocate same sequence or parent hash.
- **Duplicate request:** enforce model-appropriate uniqueness/idempotency.
- **Disk/write error:** transaction rolls back; no partial chain state.
- **Schema differs from plan:** pinned schema wins; update notes/ADR.
- **Restore:** verify app data plus audit chain/checkpoint after restore.

## Minimum verification matrix

- fresh DB migration
- pinned-upstream upgrade migration
- existing workspace/data preservation
- default/backfill
- invalid value rejection
- repeated startup
- migration failure/recovery
- transaction rollback
- concurrent writes
- duplicate uniqueness
- backup + actual restore where applicable

## Definition of Done

- Fresh and upgrade migrations pass.
- Existing data is preserved.
- Defaults and constraints are explicit.
- Concurrency/idempotency semantics are tested.
- No DB deletion required for normal upgrade.
- Recovery/backup implications documented.
- `PROGRESS.md` updated.

## Never do this

- Never delete/reset the DB to make tests pass.
- Never weaken foreign key/uniqueness/locking guarantees as a shortcut.
- Never mix audit and app DB solely for convenience if ADR says separate.
- Never write migration based on guessed schema.
- Never store secrets in schema/audit fields.
