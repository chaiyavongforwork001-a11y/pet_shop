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
// The R2 bucket is replaced the same way (lib/blob-store.ts):
//
//   PAWPAL_BLOBS_DIR                -> that directory, in any environment
//   on Netlify                      -> Netlify Blobs, strongly consistent
//   neither, outside production     -> .data/blobs
//   neither, in production          -> no store at all, i.e. the existing 503
import { createClient, type Client, type Config } from "@libsql/client";
import { createD1Shim, type D1ShimDatabase } from "./d1-shim";
import {
  createLocalBlobStore,
  createNetlifyBlobStore,
  onNetlify,
  DEFAULT_BLOB_STORE_NAME,
  DEFAULT_LOCAL_BLOB_DIR,
  type BlobStore,
} from "./blob-store";

const DEFAULT_LOCAL_DATABASE_URL = "file:.data/local.db";

export const env: { ADMIN_EMAIL?: string } = {
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

export type BlobStoreConfig =
  | { kind: "netlify"; name: string }
  | { kind: "local"; directory: string };

/** Resolved lazily, for the same reason the database config is. */
export function blobStoreConfig(): BlobStoreConfig | null {
  const directory = (process.env.PAWPAL_BLOBS_DIR || "").trim();
  if (directory) return { kind: "local", directory };
  if (onNetlify())
    return {
      kind: "netlify",
      name:
        (process.env.NETLIFY_BLOBS_STORE || "").trim() ||
        DEFAULT_BLOB_STORE_NAME,
    };
  if (process.env.NODE_ENV === "production") return null;
  return { kind: "local", directory: DEFAULT_LOCAL_BLOB_DIR };
}

/**
 * The R2-shaped store, or null when none can be opened.
 *
 * Not memoised, unlike the database client: building a store opens no
 * connection, and on Netlify the blobs credentials can be injected per
 * invocation, so a store cached at module scope could outlive its own
 * configuration.
 */
export function blobStore(): BlobStore | null {
  const config = blobStoreConfig();
  if (!config) {
    console.error(
      "PAWPAL has no file store: deploy on Netlify (Blobs) or set PAWPAL_BLOBS_DIR for this environment.",
    );
    return null;
  }
  try {
    return config.kind === "netlify"
      ? createNetlifyBlobStore(config.name)
      : createLocalBlobStore(config.directory);
  } catch (error) {
    console.error(
      "PAWPAL could not open the file store",
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}
