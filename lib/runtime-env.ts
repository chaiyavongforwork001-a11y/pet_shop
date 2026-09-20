// Phase 0 spike shim.
//
// Stands in for `import { env } from "cloudflare:workers"` so the app can be
// compiled by real Next.js instead of the vinext/Cloudflare build. DB and
// BUCKET are intentionally undefined here: the callers in lib/server.ts already
// fail closed with a 503 when a binding is missing, which is the correct
// behaviour for a build spike. Phase 2 swaps DB for the Turso client and
// Phase 3 swaps BUCKET for Netlify Blobs.
export const env: Cloudflare.Env & { ADMIN_EMAIL?: string } = {
  DB: undefined,
  BUCKET: undefined,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
};
