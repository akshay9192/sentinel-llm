# Phase 2C Atomic Audit Storage Completion and Hardening Report

Date: 2026-08-17 (Australia/Sydney)

## Outcome

Phase 2C is complete and has passed the Windows/pinned-Node production-readiness
acceptance available in this repository. The implementation remains stopped at
the Phase 2C review gate. Phase 2D idempotency/replay, Phase 2E full-chain
verification, Phase 2F checkpoints, and later integration phases have not
started.

All database tests used isolated files below ignored `.codex-audit-temp/`. The
real `server/storage/anythingllm.db` was not changed.

## Defects found and fixed

1. **Current-head payload authentication.** The original append guard compared
   only the latest row's sequence/hash columns with the singleton. A modified
   canonical payload, an indexed scalar edit, or a coordinated latest-row and
   singleton hash edit could be accepted as the parent of a new event. Reduced
   tests reproduced all three cases. Append now parses and validates the latest
   canonical event, recomputes its hash, and compares every duplicated storage
   column before extending the chain. Failure is controlled
   `AUDIT_STORAGE_HEAD_MISMATCH`, and the transaction consumes no sequence.
2. **Obvious credential values in allowed strings.** Fake bearer, password
   assignment, private-key envelope, and URL-userinfo canaries were accepted in
   an allowlisted attribute value. Full event validation now rejects
   unmistakable bearer/header assignment, private-key envelope, URL-userinfo,
   and JWT-shaped values as `AUDIT_SCHEMA_PROHIBITED_SECRET`. Errors do not echo
   the canary, no row is stored, and the singleton does not advance. This is
   defense in depth; structured omission and producer redaction remain primary.
3. **Parallel test-process collisions.** Two simultaneous storage suites shared
   static SQLite fixture directories and deterministically failed with Windows
   `EBUSY` unlink errors. Storage and migration fixture roots now include the
   process ID. Two simultaneous complete storage suites subsequently passed
   20/20 tests each.

No arbitrary transaction retries were added, no test was weakened, and no
fallback to `event_logs` was introduced.

## Acceptance evidence

- Focused/adjacent audit run: 5/5 suites and 78/78 tests passed under checksum-
  verified portable Node 18.18.0.
- Complete server regression run: 23/23 suites and 234/234 tests passed.
- Race-sensitive repetition: 20/20 fresh-process iterations passed. Every
  iteration exercised 12 concurrent appends across four independent Prisma
  clients and two workspaces, an independently held SQLite writer lock, and
  forced termination of a child process with an open write transaction.
- Parallel isolation: two simultaneous complete storage suites passed 20/20
  tests each after the fixture isolation fix.
- Migration repetition: 5/5 fresh-process iterations passed. Each iteration
  covered a fresh database, repeated migration deploy, and upgrade from the
  complete pinned pre-Phase-2C migration set while preserving an existing
  application marker.
- Fault coverage passed for caller-metadata rejection, malformed schema,
  mutation/accessor races, duplicate event ID, post-insert trigger abort,
  missing/tampered singleton, latest payload/scalar/hash tampering, writer lock,
  process termination, invalid server clock, and signed 64-bit sequence
  exhaustion. Each asserted rollback/no-gap behavior.
- Restart and closed-database copy/restore passed and continued from the exact
  sequence/hash head.
- Historical audit rows survived deletion of referenced user/workspace rows;
  audit identifiers remain non-cascading historical scalars.
- `PRAGMA integrity_check` returned `ok` after concurrency, crash recovery,
  restore, fresh migration, and upgrade migration. `PRAGMA foreign_key_check`
  returned no violations for fresh migration, upgrade, restore, and historical
  reference deletion.
- A tracked-file high-confidence credential scan found zero unclassified hits;
  deliberate `SENTINEL_FAKE_*` regression canaries were classified as test data.
- Prisma 5.3.1 schema validation and client generation, repository-pinned
  Prettier, server-local ESLint (including explicit Jest globals for normally
  ignored test files), Node syntax checks, and `git diff --check` passed.

## Significant commands

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .agents/preflight.ps1 -Acknowledge

# Focused and adjacent audit storage
& $node ..\node_modules\jest\bin\jest.js --runInBand `
  __tests__/utils/audit/canonicalize.test.js `
  __tests__/utils/audit/hashChain.test.js `
  __tests__/utils/audit/auditDb.test.js `
  __tests__/utils/audit/auditMigration.test.js `
  __tests__/utils/safeJSONStringify/safeJSONStringify.test.js

# Twenty race/lock/crash repetitions
for ($i = 1; $i -le 20; $i++) {
  & $node $jest --runInBand __tests__/utils/audit/auditDb.test.js `
    -t 'independent-client contention|explicitly held SQLite|process termination'
}

# Five fresh/repeated/upgrade migration repetitions
for ($i = 1; $i -le 5; $i++) {
  & $node $jest --runInBand __tests__/utils/audit/auditMigration.test.js
}

# Explicit complete server suite list
& $node .\node_modules\jest\bin\jest.js --runInBand --runTestsByPath $tests

& $node node_modules/prettier/bin/prettier.cjs --check <changed-files>
& $node node_modules/eslint/bin/eslint.js <changed-runtime-files>
& $node node_modules/eslint/bin/eslint.js --no-ignore `
  --global describe --global test --global expect --global afterEach `
  --global afterAll <changed-test-files>
& $node node_modules/prisma/build/index.js validate --schema prisma/schema.prisma
& $node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma
git diff --check
```

`$node` was the ignored portable Node 18.18.0 executable under
`.codex-audit-temp/node-v18.18.0-win-x64/`. `$tests` was the explicit relative
list of all 23 `server/__tests__/**/*.test.js` files. An earlier broad path
invocation also ran all 23 real suites successfully but selected
`fixtures/v1GoldenVectors.js` as an empty suite; the explicit `--runTestsByPath`
command above removed that invocation artifact and exited cleanly.

## Remaining limitations

- The append-time integrity guard authenticates only the current head. Full
  historical modification/deletion/insertion/reordering/truncation detection is
  Phase 2E and remains unimplemented.
- The singleton and event rows share the SQLite compromise domain. Phase 2F
  independently protected checkpoints remain required to expose complete
  database rewrite/recompute attacks.
- Obvious-secret pattern rejection is deliberately defense in depth and cannot
  prove arbitrary text is redacted. Later event producers must omit secrets and
  apply their explicit optional-content policy before append.
- Contention losers can return `AUDIT_STORAGE_BUSY`; Phase 2C does not retry or
  promise admission. Replay/idempotency behavior belongs to Phase 2D.
- Process termination was injected after SQLite acquired the write transaction.
  Host power loss, filesystem corruption, and physical disk exhaustion were not
  simulated. Trigger aborts and SQLite lock failures covered deterministic
  write-failure rollback.
- Docker/Compose/WSL are unavailable on this host, so container-specific
  acceptance remains unclaimed. The complete local server Jest suite passed on
  the repository-pinned Node runtime.
- No root `SENTINEL_SESSION_CHECKPOINT_*.md` file existed at resume time; current
  Git state and authoritative project documents were used instead.

## Review gate

Phase 2C Definition of Done remains satisfied. No known unresolved audit-
integrity defect remains within the Phase 2C scope. Stop here; Phase 2D requires
separate explicit developer authorization.
