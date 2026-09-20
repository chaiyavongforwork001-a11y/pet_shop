// Applies drizzle/*.sql to a libSQL database, in filename order, exactly once.
//
// Replaces `wrangler d1 execute`, which is gone with Cloudflare. Targets the
// same database the app does: TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) when set,
// otherwise the local file:.data/local.db.
//
//   node scripts/db-migrate.mjs           apply anything not applied yet
//   node scripts/db-migrate.mjs --fresh   delete the local file first, then apply
//   node scripts/db-migrate.mjs --status  list applied / pending, change nothing
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MIGRATIONS_DIR = "drizzle";
const DEFAULT_LOCAL_DATABASE_URL = "file:.data/local.db";
const LEDGER = "__migrations";

/** Same resolution order as lib/runtime.ts, minus the production fail-closed. */
export function resolveConfig() {
  const url = (process.env.TURSO_DATABASE_URL || "").trim();
  if (url) {
    const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
    return authToken ? { url, authToken } : { url };
  }
  return { url: DEFAULT_LOCAL_DATABASE_URL };
}

/** Local path behind a `file:` URL, or null for a remote database. */
export function localFilePath(url) {
  if (!url.startsWith("file:")) return null;
  const withoutScheme = url.slice("file:".length);
  const path = withoutScheme.startsWith("///")
    ? withoutScheme.slice(3)
    : withoutScheme.startsWith("//")
      ? withoutScheme.slice(2)
      : withoutScheme;
  return resolve(decodeURIComponent(path.split("?")[0]));
}

export function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

/** drizzle writes one statement per `--> statement-breakpoint`; never split on `;`, the triggers contain them. */
export function statementsOf(file) {
  return readFileSync(`${MIGRATIONS_DIR}/${file}`, "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function applyMigrations(client, { log = () => {} } = {}) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS ${LEDGER} (file TEXT PRIMARY KEY NOT NULL, appliedAt TEXT NOT NULL)`,
  );
  const applied = new Set(
    (await client.execute(`SELECT file FROM ${LEDGER}`)).rows.map(
      (row) => row.file,
    ),
  );
  const done = [];
  for (const file of migrationFiles()) {
    if (applied.has(file)) {
      log(`skip    ${file} (already applied)`);
      continue;
    }
    const statements = statementsOf(file);
    // One transaction per migration: a half-applied file never gets recorded.
    await client.batch(
      [
        ...statements.map((sql) => ({ sql, args: [] })),
        {
          sql: `INSERT INTO ${LEDGER} (file,appliedAt) VALUES (?,?)`,
          args: [file, new Date().toISOString()],
        },
      ],
      "write",
    );
    log(`applied ${file} (${statements.length} statements)`);
    done.push(file);
  }
  return done;
}

export function ensureLocalDirectory(url) {
  const path = localFilePath(url);
  if (path) mkdirSync(dirname(path), { recursive: true });
  return path;
}

async function main() {
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env file: env vars may still come from the shell or the host.
  }
  const fresh = process.argv.includes("--fresh");
  const status = process.argv.includes("--status");
  const config = resolveConfig();
  const path = localFilePath(config.url);
  console.log(`database ${config.url}${path ? ` -> ${path}` : ""}`);

  if (fresh) {
    if (!path) {
      console.error("--fresh only works on a local file: database, not a remote one.");
      process.exitCode = 1;
      return;
    }
    for (const suffix of ["", "-journal", "-wal", "-shm"])
      rmSync(`${path}${suffix}`, { force: true });
    console.log("fresh   removed the existing local database file");
  }
  ensureLocalDirectory(config.url);

  const client = createClient(config);
  try {
    if (status) {
      await client.execute(
        `CREATE TABLE IF NOT EXISTS ${LEDGER} (file TEXT PRIMARY KEY NOT NULL, appliedAt TEXT NOT NULL)`,
      );
      const applied = new Map(
        (await client.execute(`SELECT file,appliedAt FROM ${LEDGER}`)).rows.map(
          (row) => [row.file, row.appliedAt],
        ),
      );
      for (const file of migrationFiles())
        console.log(
          `${applied.has(file) ? "applied" : "pending"} ${file}${applied.has(file) ? ` at ${applied.get(file)}` : ""}`,
        );
      return;
    }
    const done = await applyMigrations(client, { log: (line) => console.log(line) });
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const triggers = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name",
    );
    console.log(`tables  ${tables.rows.map((row) => row.name).join(", ")}`);
    console.log(`triggers ${triggers.rows.map((row) => row.name).join(", ")}`);
    console.log(
      done.length
        ? `Applied ${done.length} migration(s): ${done.join(", ")}`
        : "Database already up to date.",
    );
  } finally {
    client.close();
  }
}

// Only run when invoked directly; scripts/verify-d1-shim.mjs imports the helpers.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
