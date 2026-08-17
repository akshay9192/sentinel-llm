const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const REPOSITORY_ROOT = path.resolve(__dirname, "../../../..");
const SOURCE_PRISMA = path.join(REPOSITORY_ROOT, "server/prisma");
const PRISMA_CLI = path.join(
  REPOSITORY_ROOT,
  "server/node_modules/prisma/build/index.js"
);
const TEST_ROOT = path.join(
  REPOSITORY_ROOT,
  `.codex-audit-temp/phase-2c-migration-jest-${process.pid}`
);
const PHASE_2C_MIGRATION = "20260817000000_sentinel_audit_storage";

function databaseUrl(databasePath) {
  return `file:${databasePath.replace(/\\/g, "/")}`;
}

function preparePrismaDirectory(name, includePhase2C) {
  const directory = path.join(TEST_ROOT, name);
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  const migrations = path.join(directory, "migrations");
  fs.cpSync(path.join(SOURCE_PRISMA, "migrations"), migrations, {
    recursive: true,
    filter: (source) =>
      includePhase2C || path.basename(source) !== PHASE_2C_MIGRATION,
  });
  const databasePath = path.join(directory, "anythingllm.db");
  const schema = fs
    .readFileSync(path.join(SOURCE_PRISMA, "schema.prisma"), "utf8")
    .replace(
      'url      = "file:../storage/anythingllm.db"',
      `url      = "${databaseUrl(databasePath)}"`
    );
  const schemaPath = path.join(directory, "schema.prisma");
  fs.writeFileSync(schemaPath, schema);
  return { directory, migrations, databasePath, schemaPath };
}

function migrateDeploy(schemaPath) {
  execFileSync(
    process.execPath,
    [PRISMA_CLI, "migrate", "deploy", "--schema", schemaPath],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      stdio: "pipe",
    }
  );
}

describe("Sentinel audit migration", () => {
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

  test("applies to a fresh database and repeated startup reports no pending migration", async () => {
    const fixture = preparePrismaDirectory("fresh", true);
    migrateDeploy(fixture.schemaPath);
    migrateDeploy(fixture.schemaPath);
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl(fixture.databasePath) } },
    });
    await expect(
      client.sentinel_audit_chain_state.findUnique({ where: { id: 1 } })
    ).resolves.toMatchObject({
      currentSequence: 0n,
      currentEventHash: "0".repeat(64),
    });
    await expect(
      client.$queryRawUnsafe("PRAGMA integrity_check")
    ).resolves.toEqual([{ integrity_check: "ok" }]);
    await expect(
      client.$queryRawUnsafe("PRAGMA foreign_key_check")
    ).resolves.toEqual([]);
    await client.$disconnect();
  }, 60_000);

  test("upgrades the pinned pre-Phase-2C schema without changing existing data", async () => {
    const fixture = preparePrismaDirectory("upgrade", false);
    migrateDeploy(fixture.schemaPath);
    let client = new PrismaClient({
      datasources: { db: { url: databaseUrl(fixture.databasePath) } },
    });
    await client.system_settings.create({
      data: { label: "phase-2c-upgrade-marker", value: "preserve-me" },
    });
    await client.$disconnect();

    fs.cpSync(
      path.join(SOURCE_PRISMA, "migrations", PHASE_2C_MIGRATION),
      path.join(fixture.migrations, PHASE_2C_MIGRATION),
      { recursive: true }
    );
    migrateDeploy(fixture.schemaPath);
    client = new PrismaClient({
      datasources: { db: { url: databaseUrl(fixture.databasePath) } },
    });
    await expect(
      client.system_settings.findUnique({
        where: { label: "phase-2c-upgrade-marker" },
      })
    ).resolves.toMatchObject({ value: "preserve-me" });
    await expect(client.sentinel_audit_events.count()).resolves.toBe(0);
    await expect(
      client.$queryRawUnsafe("PRAGMA integrity_check")
    ).resolves.toEqual([{ integrity_check: "ok" }]);
    await expect(
      client.$queryRawUnsafe("PRAGMA foreign_key_check")
    ).resolves.toEqual([]);
    await client.$disconnect();
  }, 60_000);
});
