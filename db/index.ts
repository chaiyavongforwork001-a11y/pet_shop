import { drizzle } from "drizzle-orm/libsql";
import { libsqlClient } from "./../lib/runtime";
import * as schema from "./schema";

// Not used by the storefront or the admin API: those talk to the database
// through the D1-shaped shim in lib/d1-shim.ts, with raw SQL. This stays for
// the drizzle example under examples/d1 and for schema-typed one-off queries.
export function getDb() {
  const client = libsqlClient();
  if (!client) {
    throw new Error(
      "libSQL database is unavailable. Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) for hosted environments, or run `npm run db:migrate` to create the local file:.data/local.db database.",
    );
  }

  return drizzle(client, { schema });
}
