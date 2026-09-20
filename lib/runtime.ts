// Runtime bindings for the Netlify port.
//
// Replaces `import { env } from "cloudflare:workers"`. The database is a libSQL
// client wrapped in the D1-shaped shim (lib/d1-shim.ts), so every caller and
// every SQL statement in the app stays exactly as it was under Cloudflare D1.
//
//   TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) -> that database, in any environment
//   neither set, outside production            -> file:.data/local.db
//   neither set, in production                 -> no database at all
//
// The last case deliberately yields `null`: lib/server.ts turns that into the
// existing 503 rather than serving an empty shop.
//
// BUCKET is still undefined; Netlify Blobs is Phase 3.
import { createClient, type Client, type Config } from "@libsql/client";
import { createD1Shim, type D1ShimDatabase } from "./d1-shim";

const DEFAULT_LOCAL_DATABASE_URL = "file:.data/local.db";

export const env: { BUCKET?: R2Bucket; ADMIN_EMAIL?: string } = {
  BUCKET: undefined,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
};

/** Resolved lazily: Next.js loads .env files before the first request, not before this module. */
export function databaseConfig(): Config | null {
  const url = (process.env.TURSO_DATABASE_URL || "").trim();
  if (url) {
    const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
    return authToken ? { url, authToken } : { url };
  }
  if (process.env.NODE_ENV === "production") return null;
  return { url: DEFAULT_LOCAL_DATABASE_URL };
}

let client: Client | null | undefined;

/** The raw libSQL client, shared by the shim and by db/index.ts. */
export function libsqlClient(): Client | null {
  if (client !== undefined) return client;
  const config = databaseConfig();
  if (!config) {
    console.error(
      "PAWPAL has no database: set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) for this environment.",
    );
    client = null;
    return client;
  }
  try {
    client = createClient(config);
  } catch (error) {
    console.error(
      "PAWPAL could not open the libSQL database",
      error instanceof Error ? error.message : "Unknown error",
    );
    client = null;
  }
  return client;
}

let shim: D1ShimDatabase | null | undefined;

/** The D1-shaped database handle, or null when none can be opened. */
export function database(): D1ShimDatabase | null {
  if (shim !== undefined) return shim;
  const opened = libsqlClient();
  shim = opened ? createD1Shim(opened) : null;
  return shim;
}
