const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const {
  AuditStorageError,
  createAuditStore,
  toPersistenceRow,
} = require("../../../utils/audit/auditDb");
const { AuditValidationError } = require("../../../utils/audit/validateEvent");
const { computeAuditEventHash } = require("../../../utils/audit/hashChain");
const { GENESIS_EVENT } = require("./fixtures/v1GoldenVectors");

const REPOSITORY_ROOT = path.resolve(__dirname, "../../../..");
const MIGRATION_PATH = path.join(
  REPOSITORY_ROOT,
  "server/prisma/migrations/20260817000000_sentinel_audit_storage/migration.sql"
);
const TEST_ROOT = path.join(
  REPOSITORY_ROOT,
  `.codex-audit-temp/phase-2c-jest-${process.pid}`
);

function databaseUrl(databasePath) {
  return `file:${databasePath.replace(/\\/g, "/")}`;
}

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/u)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function createTestDatabase(name) {
  const directory = path.join(TEST_ROOT, name);
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  const databasePath = path.join(directory, "audit.db");
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl(databasePath) } },
    log: [],
  });
  for (const statement of splitSqlStatements(
    fs.readFileSync(MIGRATION_PATH, "utf8")
  ))
    await client.$executeRawUnsafe(statement);
  return { client, databasePath, directory };
}

function makeDraft(overrides = {}) {
  const draft = { ...GENESIS_EVENT };
  delete draft.sequence_number;
  delete draft.timestamp_utc;
  delete draft.previous_event_hash;
  delete draft.event_hash;
  draft.attributes = { ...draft.attributes, duration_ms: 1 };
  return { ...draft, ...overrides };
}

function eventId(index) {
  return `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

describe("Sentinel atomic audit storage", () => {
  const clients = [];

  afterEach(async () => {
    await Promise.allSettled(
      clients.splice(0).map((client) => client.$disconnect())
    );
  });

  afterAll(() => {
    const resolved = path.resolve(TEST_ROOT);
    if (resolved.includes(`${path.sep}.codex-audit-temp${path.sep}`))
      fs.rmSync(resolved, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
  });

  test("appends genesis and linked events with matching row and singleton head", async () => {
    const { client } = await createTestDatabase("basic-chain");
    clients.push(client);
    let millisecond = 0;
    const store = createAuditStore({
      prismaClient: client,
      now: () => new Date(Date.UTC(2026, 7, 17, 0, 0, 0, millisecond++)),
    });

    const first = await store.append(makeDraft());
    const second = await store.append(
      makeDraft({
        event_id: eventId(2),
        request_id: "20000000-0000-4000-8000-000000000002",
      })
    );

    expect(first.sequence_number).toBe("1");
    expect(first.previous_event_hash).toBe("0".repeat(64));
    expect(second.sequence_number).toBe("2");
    expect(second.previous_event_hash).toBe(first.event_hash);
    const rows = await client.sentinel_audit_events.findMany({
      orderBy: { sequenceNumber: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.sequenceNumber)).toEqual([1n, 2n]);
    expect(JSON.parse(rows[1].eventJson)).toEqual(second);
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({
      currentSequence: 2n,
      currentEventHash: second.event_hash,
    });
  });

  test("rejects caller chain metadata and closed-schema violations before writing", async () => {
    const { client } = await createTestDatabase("schema-rejection");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });

    await expect(
      store.append({ ...makeDraft(), sequence_number: "999" })
    ).rejects.toMatchObject({
      name: "AuditValidationError",
      code: "AUDIT_SCHEMA_CALLER_CHAIN_METADATA",
    });
    await expect(
      store.append({ ...makeDraft(), attacker_controlled: true })
    ).rejects.toBeInstanceOf(AuditValidationError);
    await expect(
      store.append(makeDraft({ completion_state: "COMPLETED" }))
    ).rejects.toMatchObject({ code: "AUDIT_SCHEMA_EVENT_STATE" });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(0);
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({
      currentSequence: 0n,
      currentEventHash: "0".repeat(64),
    });
  });

  test("snapshots caller data and rejects accessors without invoking them", async () => {
    const { client } = await createTestDatabase("caller-snapshot");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    const draft = makeDraft();
    const append = store.append(draft);
    draft.attributes.operation = "mutated-after-call";
    const stored = await append;
    expect(stored.attributes.operation).toBe("canonical-hash-test");

    const accessorDraft = makeDraft({ event_id: eventId(8080) });
    let getterCalls = 0;
    Object.defineProperty(accessorDraft, "event_id", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return eventId(8080);
      },
    });
    await expect(store.append(accessorDraft)).rejects.toMatchObject({
      code: "AUDIT_CANONICAL_PROPERTY_DESCRIPTOR",
    });
    expect(getterCalls).toBe(0);
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
  });

  test("adversarial malformed events all fail closed without consuming genesis", async () => {
    const { client } = await createTestDatabase("adversarial-schema");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    const cases = [
      { schema_version: 2 },
      { principal_type: "root" },
      { principal_id: "41" },
      { user_id: null },
      { executor_type: "service", executor_id: null },
      { request_id: "not-a-uuid" },
      { workspace_id: -1 },
      { query_hash: "A".repeat(64) },
      { completion_state: "COMPLETED" },
      { policy_decision: "ALLOW", policy_hash: null },
      { execution_requested: true },
      { attributes: { authorization: "Bearer fixture" } },
      { attributes: { duration_ms: 1.5 } },
      {
        context_refs: [
          { type: "tool", id: "duplicate" },
          { type: "tool", id: "duplicate" },
        ],
      },
      { delegation_chain: [{ principal_type: "user", principal_id: "42" }] },
      { semantic_evidence: { model_id: "x", result: "ALLOW" } },
      { response_optional: "x".repeat(8193) },
    ];

    for (const mutation of cases)
      await expect(store.append(makeDraft(mutation))).rejects.toBeInstanceOf(
        AuditValidationError
      );
    await expect(client.sentinel_audit_events.count()).resolves.toBe(0);
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({
      currentSequence: 0n,
      currentEventHash: "0".repeat(64),
    });
  });

  test("obvious fake credentials are rejected without persistence or error leakage", async () => {
    const { client } = await createTestDatabase("secret-canaries");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    const canaries = [
      "Bearer SENTINEL_FAKE_BEARER_4f87d2",
      "password=SENTINEL_FAKE_PASSWORD_91ac",
      "-----BEGIN PRIVATE KEY-----\nSENTINEL_FAKE_KEY\n-----END PRIVATE KEY-----",
      "https://fixture-user:SENTINEL_FAKE_URL_PASSWORD@example.invalid/path",
    ];

    for (const [index, canary] of canaries.entries()) {
      let error;
      try {
        await store.append(
          makeDraft({
            event_id: eventId(8000 + index),
            request_id: eventId(8100 + index),
            attributes: {
              ...makeDraft().attributes,
              operation: canary,
            },
          })
        );
      } catch (caught) {
        error = caught;
      }
      expect(error).toMatchObject({
        name: "AuditValidationError",
        code: "AUDIT_SCHEMA_PROHIBITED_SECRET",
      });
      expect(String(error)).not.toContain(canary);
      expect(JSON.stringify(error)).not.toContain(canary);
    }

    await expect(client.sentinel_audit_events.count()).resolves.toBe(0);
    const storedText = await client.$queryRawUnsafe(
      "SELECT CAST(GROUP_CONCAT(event_json) AS TEXT) AS payload FROM sentinel_audit_events"
    );
    expect(storedText[0].payload).toBeNull();
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({ currentSequence: 0n });
  });

  test("a duplicate event ID fails without consuming a sequence", async () => {
    const { client } = await createTestDatabase("duplicate-event-id");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    const first = await store.append(makeDraft());

    await expect(store.append(makeDraft())).rejects.toMatchObject({
      name: "AuditStorageError",
      code: "AUDIT_STORAGE_DUPLICATE_EVENT_ID",
    });
    const second = await store.append(
      makeDraft({ event_id: eventId(3), request_id: eventId(3003) })
    );
    expect(second.sequence_number).toBe("2");
    expect(second.previous_event_hash).toBe(first.event_hash);
    await expect(client.sentinel_audit_events.count()).resolves.toBe(2);
  });

  test("a failure after row insertion rolls back both row and head", async () => {
    const { client } = await createTestDatabase("head-update-failure");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    const first = await store.append(makeDraft());
    await client.$executeRawUnsafe(`
      CREATE TRIGGER abort_sentinel_head_update
      BEFORE UPDATE OF current_event_hash ON sentinel_audit_chain_state
      BEGIN
        SELECT RAISE(ABORT, 'injected head failure');
      END
    `);

    await expect(
      store.append(
        makeDraft({ event_id: eventId(4), request_id: eventId(4004) })
      )
    ).rejects.toBeInstanceOf(AuditStorageError);
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({
      currentSequence: 1n,
      currentEventHash: first.event_hash,
    });
  });

  test("head-state tampering is detected and no event is appended", async () => {
    const { client } = await createTestDatabase("head-mismatch");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    await store.append(makeDraft());
    await client.sentinel_audit_chain_state.update({
      where: { id: 1 },
      data: { currentEventHash: "f".repeat(64) },
    });

    await expect(
      store.append(
        makeDraft({ event_id: eventId(5), request_id: eventId(5005) })
      )
    ).rejects.toMatchObject({ code: "AUDIT_STORAGE_HEAD_MISMATCH" });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
  });

  test("latest canonical payload tampering is detected before extending the chain", async () => {
    const { client } = await createTestDatabase("latest-payload-tamper");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    const first = await store.append(makeDraft());
    const tampered = { ...first, principal_id: "attacker" };
    await client.sentinel_audit_events.update({
      where: { eventId: first.event_id },
      data: { eventJson: JSON.stringify(tampered) },
    });

    await expect(
      store.append(
        makeDraft({ event_id: eventId(51), request_id: eventId(5101) })
      )
    ).rejects.toMatchObject({ code: "AUDIT_STORAGE_HEAD_MISMATCH" });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({
      currentSequence: 1n,
      currentEventHash: first.event_hash,
    });
  });

  test("latest indexed-column tampering is detected before extending the chain", async () => {
    const { client } = await createTestDatabase("latest-column-tamper");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    const first = await store.append(makeDraft());
    await client.sentinel_audit_events.update({
      where: { eventId: first.event_id },
      data: { principalId: "attacker" },
    });

    await expect(
      store.append(
        makeDraft({ event_id: eventId(53), request_id: eventId(5301) })
      )
    ).rejects.toMatchObject({ code: "AUDIT_STORAGE_HEAD_MISMATCH" });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
  });

  test("coordinated latest-row and singleton hash tampering is detected", async () => {
    const { client } = await createTestDatabase("coordinated-head-tamper");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    const first = await store.append(makeDraft());
    const forgedHash = "f".repeat(64);
    await client.sentinel_audit_events.update({
      where: { eventId: first.event_id },
      data: { eventHash: forgedHash },
    });
    await client.sentinel_audit_chain_state.update({
      where: { id: 1 },
      data: { currentEventHash: forgedHash },
    });

    await expect(
      store.append(
        makeDraft({ event_id: eventId(52), request_id: eventId(5201) })
      )
    ).rejects.toMatchObject({ code: "AUDIT_STORAGE_HEAD_MISMATCH" });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
  });

  test("missing singleton state is a controlled fail-closed error", async () => {
    const { client } = await createTestDatabase("missing-state");
    clients.push(client);
    await client.sentinel_audit_chain_state.delete({ where: { id: 1 } });
    await expect(
      createAuditStore({ prismaClient: client }).append(makeDraft())
    ).rejects.toMatchObject({
      name: "AuditStorageError",
      code: "AUDIT_STORAGE_STATE_MISSING",
    });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(0);
  });

  test("independent-client contention cannot fork the cross-workspace chain", async () => {
    const { client, databasePath } = await createTestDatabase("concurrency");
    clients.push(client);
    const independentClients = Array.from(
      { length: 4 },
      () =>
        new PrismaClient({
          datasources: { db: { url: databaseUrl(databasePath) } },
          log: [],
        })
    );
    clients.push(...independentClients);
    const stores = independentClients.map((prismaClient) =>
      createAuditStore({ prismaClient })
    );
    const writes = Array.from({ length: 12 }, (_, index) =>
      stores[index % stores.length].append(
        makeDraft({
          event_id: eventId(100 + index),
          request_id: eventId(1000 + index),
          correlation_id: eventId(2000 + index),
          workspace_id: index % 2 === 0 ? 7 : 8,
        })
      )
    );

    const outcomes = await Promise.allSettled(writes);
    const events = outcomes
      .filter((outcome) => outcome.status === "fulfilled")
      .map((outcome) => outcome.value);
    const failures = outcomes.filter(
      (outcome) => outcome.status === "rejected"
    );
    expect(events.length).toBeGreaterThan(0);
    for (const failure of failures)
      expect(failure.reason).toMatchObject({
        name: "AuditStorageError",
        code: "AUDIT_STORAGE_BUSY",
      });
    const ordered = [...events].sort((left, right) =>
      BigInt(left.sequence_number) < BigInt(right.sequence_number) ? -1 : 1
    );
    expect(ordered.map((event) => event.sequence_number)).toEqual(
      Array.from({ length: events.length }, (_, index) => String(index + 1))
    );
    for (let index = 1; index < ordered.length; index += 1)
      expect(ordered[index].previous_event_hash).toBe(
        ordered[index - 1].event_hash
      );
    await expect(client.sentinel_audit_events.count()).resolves.toBe(
      events.length
    );

    await Promise.all(independentClients.map((item) => item.$disconnect()));
    const recovery = await createAuditStore({ prismaClient: client }).append(
      makeDraft({
        event_id: eventId(900),
        request_id: eventId(1900),
        correlation_id: eventId(2900),
      })
    );
    expect(recovery.sequence_number).toBe(String(events.length + 1));
    expect(recovery.previous_event_hash).toBe(ordered.at(-1).event_hash);
    await expect(
      client.$queryRawUnsafe("PRAGMA integrity_check")
    ).resolves.toEqual([{ integrity_check: "ok" }]);
  }, 30_000);

  test("an explicitly held SQLite writer lock fails closed and recovery has no gap", async () => {
    const { client, databasePath } = await createTestDatabase("held-lock");
    clients.push(client);
    const lockClient = new PrismaClient({
      datasources: { db: { url: databaseUrl(databasePath) } },
      log: [],
    });
    const contenderClient = new PrismaClient({
      datasources: { db: { url: databaseUrl(databasePath) } },
      log: [],
    });
    clients.push(lockClient, contenderClient);
    let signalLocked;
    let releaseLock;
    const locked = new Promise((resolve) => {
      signalLocked = resolve;
    });
    const release = new Promise((resolve) => {
      releaseLock = resolve;
    });
    const holder = lockClient
      .$transaction(
        async (tx) => {
          await tx.sentinel_audit_chain_state.update({
            where: { id: 1 },
            data: { currentSequence: { increment: 1n } },
          });
          signalLocked();
          await release;
          throw new Error("ROLLBACK_LOCK_FIXTURE");
        },
        { maxWait: 5_000, timeout: 20_000 }
      )
      .catch((error) => error);
    await locked;

    await expect(
      createAuditStore({ prismaClient: contenderClient }).append(makeDraft())
    ).rejects.toMatchObject({ code: "AUDIT_STORAGE_BUSY" });
    releaseLock();
    await holder;
    const recovered = await createAuditStore({ prismaClient: client }).append(
      makeDraft()
    );
    expect(recovered.sequence_number).toBe("1");
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
  }, 30_000);

  test("restart and copied-database restore preserve the exact append head", async () => {
    const fixture = await createTestDatabase("restart-restore");
    clients.push(fixture.client);
    const first = await createAuditStore({
      prismaClient: fixture.client,
    }).append(makeDraft());
    await fixture.client.$disconnect();

    const restarted = new PrismaClient({
      datasources: { db: { url: databaseUrl(fixture.databasePath) } },
      log: [],
    });
    clients.push(restarted);
    const second = await createAuditStore({ prismaClient: restarted }).append(
      makeDraft({ event_id: eventId(6001), request_id: eventId(6002) })
    );
    expect(second.previous_event_hash).toBe(first.event_hash);
    await restarted.$disconnect();

    const restoredPath = path.join(fixture.directory, "restored.db");
    fs.copyFileSync(fixture.databasePath, restoredPath);
    const restored = new PrismaClient({
      datasources: { db: { url: databaseUrl(restoredPath) } },
      log: [],
    });
    clients.push(restored);
    const third = await createAuditStore({ prismaClient: restored }).append(
      makeDraft({ event_id: eventId(6003), request_id: eventId(6004) })
    );
    expect(third.sequence_number).toBe("3");
    expect(third.previous_event_hash).toBe(second.event_hash);
    await expect(
      restored.$queryRawUnsafe("PRAGMA integrity_check")
    ).resolves.toEqual([{ integrity_check: "ok" }]);
    await expect(
      restored.$queryRawUnsafe("PRAGMA foreign_key_check")
    ).resolves.toEqual([]);
  });

  test("process termination during an open write transaction leaves no partial append state", async () => {
    const fixture = await createTestDatabase("process-crash");
    clients.push(fixture.client);
    const childScript = String.raw`
      const { PrismaClient } = require("@prisma/client");
      const client = new PrismaClient({ datasources: { db: { url: process.env.SENTINEL_CRASH_DB_URL } } });
      client.$transaction(async (tx) => {
        await tx.sentinel_audit_chain_state.update({ where: { id: 1 }, data: { currentSequence: { increment: 1n } } });
        process.stdout.write("WRITE_LOCKED\n");
        await new Promise(() => {});
      }, { maxWait: 5000, timeout: 60000 }).catch((error) => {
        process.stderr.write(String(error));
        process.exitCode = 1;
      });
    `;
    const child = spawn(process.execPath, ["-e", childScript], {
      cwd: path.join(REPOSITORY_ROOT, "server"),
      env: {
        ...process.env,
        SENTINEL_CRASH_DB_URL: databaseUrl(fixture.databasePath),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    const childExited = new Promise((resolve) => child.once("exit", resolve));
    await new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        child.kill();
        reject(new Error(`CRASH_FIXTURE_TIMEOUT:${stderr}`));
      }, 10_000);
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
        if (!settled && stdout.includes("WRITE_LOCKED")) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      });
      child.once("error", (error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      });
      child.once("exit", (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(`CRASH_FIXTURE_EARLY_EXIT:${code}:${stderr}`));
        }
      });
    });
    child.kill();
    await childExited;

    await expect(fixture.client.sentinel_audit_events.count()).resolves.toBe(0);
    await expect(
      fixture.client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({
      currentSequence: 0n,
      currentEventHash: "0".repeat(64),
    });
    const recovered = await createAuditStore({
      prismaClient: fixture.client,
    }).append(makeDraft());
    expect(recovered.sequence_number).toBe("1");
    await expect(
      fixture.client.$queryRawUnsafe("PRAGMA integrity_check")
    ).resolves.toEqual([{ integrity_check: "ok" }]);
  }, 30_000);

  test("sequence persistence remains exact above Number.MAX_SAFE_INTEGER", async () => {
    const { client } = await createTestDatabase("bigint-sequence");
    clients.push(client);
    const priorSequence = 9_007_199_254_740_992n;
    const preHashPrior = {
      ...GENESIS_EVENT,
      attributes: { ...GENESIS_EVENT.attributes, duration_ms: 1 },
      sequence_number: priorSequence.toString(10),
      timestamp_utc: "2026-08-17T00:00:00.000Z",
      previous_event_hash: "b".repeat(64),
      event_hash: null,
    };
    const priorHash = computeAuditEventHash(preHashPrior);
    const priorEvent = { ...preHashPrior, event_hash: priorHash };
    await client.sentinel_audit_events.create({
      data: toPersistenceRow(priorEvent),
    });
    await client.sentinel_audit_chain_state.update({
      where: { id: 1 },
      data: { currentSequence: priorSequence, currentEventHash: priorHash },
    });
    const event = await createAuditStore({ prismaClient: client }).append(
      makeDraft({ event_id: eventId(9003), request_id: eventId(9004) })
    );
    expect(event.sequence_number).toBe("9007199254740993");
    const latest = await client.sentinel_audit_events.findFirst({
      orderBy: { sequenceNumber: "desc" },
    });
    expect(latest.sequenceNumber).toBe(9_007_199_254_740_993n);
  });

  test("signed SQLite sequence exhaustion fails without wrapping or advancing state", async () => {
    const { client } = await createTestDatabase("sequence-exhaustion");
    clients.push(client);
    const maximum = 9_223_372_036_854_775_807n;
    const priorHash = "a".repeat(64);
    await client.sentinel_audit_events.create({
      data: {
        eventId: eventId(9100),
        schemaVersion: 1,
        sequenceNumber: maximum,
        timestampUtc: "2026-08-17T00:00:00.000Z",
        eventType: "MODEL_STARTED",
        completionState: "PENDING",
        principalType: "service",
        principalId: "fixture",
        requestId: eventId(9101),
        correlationId: eventId(9102),
        policyDecision: "NOT_APPLICABLE",
        executionDecision: "NOT_REQUESTED",
        previousEventHash: "b".repeat(64),
        eventHash: priorHash,
        eventJson: "{}",
      },
    });
    await client.sentinel_audit_chain_state.update({
      where: { id: 1 },
      data: { currentSequence: maximum, currentEventHash: priorHash },
    });

    await expect(
      createAuditStore({ prismaClient: client }).append(
        makeDraft({ event_id: eventId(9103), request_id: eventId(9104) })
      )
    ).rejects.toMatchObject({
      name: "AuditStorageError",
      code: "AUDIT_STORAGE_APPEND_FAILED",
    });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({
      currentSequence: maximum,
      currentEventHash: priorHash,
    });
  });

  test("an invalid server clock rolls back allocated sequence and exposes no timestamp", async () => {
    const { client } = await createTestDatabase("invalid-clock");
    clients.push(client);
    const store = createAuditStore({
      prismaClient: client,
      now: () => new Date(Number.NaN),
    });

    await expect(store.append(makeDraft())).rejects.toMatchObject({
      name: "AuditStorageError",
      code: "AUDIT_STORAGE_INVALID_CLOCK",
    });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(0);
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({ currentSequence: 0n });
  });

  test("audit rows survive deletion of referenced application users and workspaces", async () => {
    const { client } = await createTestDatabase("historical-identifiers");
    clients.push(client);
    await client.$executeRawUnsafe(
      'CREATE TABLE "users" ("id" INTEGER NOT NULL PRIMARY KEY, "password" TEXT NOT NULL)'
    );
    await client.$executeRawUnsafe(
      'CREATE TABLE "workspaces" ("id" INTEGER NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL)'
    );
    await client.$executeRawUnsafe(
      'INSERT INTO "users" ("id", "password") VALUES (42, \'fixture\')'
    );
    await client.$executeRawUnsafe(
      'INSERT INTO "workspaces" ("id", "slug") VALUES (7, \'phase-2c-history\')'
    );
    const store = createAuditStore({ prismaClient: client });
    await store.append(makeDraft());
    await client.$executeRawUnsafe('DELETE FROM "workspaces" WHERE "id" = 7');
    await client.$executeRawUnsafe('DELETE FROM "users" WHERE "id" = 42');
    await expect(client.sentinel_audit_events.count()).resolves.toBe(1);
    await expect(
      client.$queryRawUnsafe("PRAGMA foreign_key_check")
    ).resolves.toEqual([]);
  });

  test("database constraints reject forged duplicate sequence, event ID, and hash", async () => {
    const { client } = await createTestDatabase("constraint-attacks");
    clients.push(client);
    const store = createAuditStore({ prismaClient: client });
    await store.append(makeDraft());
    const row = await client.sentinel_audit_events.findFirst();
    for (const mutation of [
      { sequenceNumber: 2n, eventHash: "c".repeat(64) },
      { eventId: eventId(7001), eventHash: "c".repeat(64) },
      { eventId: eventId(7002), sequenceNumber: 2n },
    ]) {
      await expect(
        client.sentinel_audit_events.create({
          data: { ...row, id: undefined, ...mutation },
        })
      ).rejects.toMatchObject({ code: "P2002" });
    }

    await expect(
      client.sentinel_audit_events.create({
        data: {
          ...row,
          id: undefined,
          eventId: eventId(7003),
          sequenceNumber: 2n,
          eventHash: "G".repeat(64),
        },
      })
    ).rejects.toBeDefined();
    await expect(
      client.sentinel_audit_chain_state.create({
        data: { id: 2, currentSequence: 0n, currentEventHash: "0".repeat(64) },
      })
    ).rejects.toBeDefined();
  });
});
