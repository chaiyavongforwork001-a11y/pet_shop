// Proves the replacement for the Cloudflare R2 bucket, through the real
// lib/blob-store.ts, against BOTH drivers:
//
//   - the local filesystem driver used for development;
//   - the Netlify Blobs driver, run against an in-process BlobsServer (the
//     same server Netlify Dev uses), so the Netlify code path is exercised
//     without a Netlify account.
//
// It also proves the strong-consistency guard: what URL the Netlify driver
// actually asks for, and that a runtime with no uncached edge URL would
// otherwise fail outright.
//
//   node scripts/verify-blob-store.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BlobsServer } from "@netlify/blobs/server";
import { getStore } from "@netlify/blobs";
import {
  createLocalBlobStore,
  createNetlifyBlobStore,
  isSafeKey,
} from "../lib/blob-store.ts";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000a49444154789c6360000002000100ffff030000060" +
    "0055dc5b3860000000049454e44ae426082",
  "hex",
);
const JPEG = Buffer.from("ffd8ffe000104a46494600010100000100010000ffd9", "hex");

const asArrayBuffer = (buf) =>
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

async function readBody(body) {
  // Exactly what app/api/[...path]/route.ts does with it.
  return Buffer.from(await new Response(body).arrayBuffer());
}

const UNSAFE_KEYS = [
  "",
  "/products/a",
  "products/",
  "products//a",
  "products/../secret",
  "../secret",
  "..",
  ".",
  "products/%2e%2e/secret",
  "products\\a",
  "products/.hidden",
  "products/a b",
  "products/a?b",
  "products/a\u0000b",
];

async function runSuite(label, store) {
  const key = `slips/${crypto.randomUUID()}/${crypto.randomUUID()}`;

  // 1. put -> immediate get, which is the slip sequence in route.ts.
  await store.put(key, asArrayBuffer(PNG), {
    httpMetadata: { contentType: "image/png" },
  });
  const found = await store.get(key);
  assert.ok(found, `${label}: slip read back immediately after the write`);
  assert.equal(found.httpMetadata?.contentType, "image/png");
  const bytes = await readBody(found.body);
  assert.ok(bytes.equals(PNG), `${label}: bytes survive the round trip`);
  console.log(
    `${label}  put/get  ${bytes.length} bytes, content type ${found.httpMetadata.contentType}, identical: ${bytes.equals(PNG)}`,
  );

  // 2. head answers existence + content type without the body.
  assert.deepEqual(await store.head(key), { contentType: "image/png" });
  assert.equal(await store.head(`${key}-nope`), null);

  // 3. overwrite keeps type and bytes in step.
  await store.put(key, asArrayBuffer(JPEG), {
    httpMetadata: { contentType: "image/jpeg" },
  });
  const second = await store.get(key);
  assert.equal(second.httpMetadata?.contentType, "image/jpeg");
  assert.ok((await readBody(second.body)).equals(JPEG));

  // 4. a blob stored with no type reports none, so route.ts falls back to
  //    image/jpeg exactly as it did with R2.
  const bare = `products/${crypto.randomUUID()}`;
  await store.put(bare, asArrayBuffer(PNG));
  const bareRead = await store.get(bare);
  assert.equal(bareRead.httpMetadata?.contentType, undefined);
  assert.ok((await readBody(bareRead.body)).equals(PNG));

  // 5. missing key -> null, which route.ts turns into 404 "ไม่พบไฟล์".
  assert.equal(await store.get(`products/${crypto.randomUUID()}`), null);

  // 6. unsafe keys are never read, written or deleted.
  for (const unsafe of UNSAFE_KEYS) {
    assert.equal(isSafeKey(unsafe), false, `isSafeKey(${JSON.stringify(unsafe)})`);
    assert.equal(
      await store.get(unsafe),
      null,
      `${label}: get(${JSON.stringify(unsafe)})`,
    );
    await store.delete(unsafe);
    await assert.rejects(
      () => store.put(unsafe, asArrayBuffer(PNG)),
      TypeError,
      `${label}: put(${JSON.stringify(unsafe)})`,
    );
  }
  console.log(`${label}  rejected ${UNSAFE_KEYS.length} unsafe keys`);

  // 7. delete really deletes, and deleting nothing is not an error.
  await store.delete(key);
  assert.equal(await store.get(key), null);
  assert.equal(await store.head(key), null);
  await store.delete(key);
  await store.delete(bare);
  console.log(`${label}  delete  gone from get() and head()`);
}

// --- local filesystem driver ------------------------------------------------
const root = await mkdtemp(join(tmpdir(), "pawpal-blobs-"));
const localDir = join(root, "blobs");
const secret = join(root, "secret.txt");
await writeFile(secret, "not a blob");

await runSuite("local   ", createLocalBlobStore(localDir));

// The local driver must not be able to reach anything outside its directory.
const local = createLocalBlobStore(localDir);
for (const escape of ["../secret.txt", "../../secret.txt", "..\\secret.txt"]) {
  assert.equal(await local.get(escape), null);
  await local.delete(escape);
}
assert.equal(await readFile(secret, "utf8"), "not a blob");
console.log("local     traversal keys read and deleted nothing outside .data/blobs");

// --- Netlify Blobs driver, against a real in-process BlobsServer ------------
const token = "pawpal-test-token";
const server = new BlobsServer({
  directory: join(root, "netlify"),
  token,
  port: 0,
});
const { port } = await server.start();
const edgeURL = `http://localhost:${port}`;
process.env.NETLIFY = "true";
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(
  JSON.stringify({
    siteID: "pawpal-site",
    token,
    edgeURL,
    uncachedEdgeURL: edgeURL,
  }),
).toString("base64");

await runSuite("netlify ", createNetlifyBlobStore("pawpal-media"));

// --- the strong-consistency guard -------------------------------------------
// What the driver asks for, recorded by stubbing the fetch the client uses.
const realFetch = globalThis.fetch;
const requested = [];
globalThis.fetch = async (url) => {
  requested.push(String(url));
  // The API route asks for a signed URL first; hand one back so the client
  // carries on and we can see which reader it ends up using.
  return String(url).startsWith("https://api.netlify.com/")
    ? Response.json({ url: "http://signed.blobs.invalid/blob" })
    : new Response(null, { status: 404 });
};
try {
  // Distinct origins, because the client resolves the key against the origin.
  // No request leaves the process: fetch is stubbed just above.
  const cachedURL = "http://cached.blobs.invalid";
  const uncachedURL = "http://uncached.blobs.invalid";
  const context = (extra) =>
    (process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(
      JSON.stringify({ siteID: "pawpal-site", token, ...extra }),
    ).toString("base64"));

  context({ edgeURL: cachedURL, uncachedEdgeURL: uncachedURL });
  await createNetlifyBlobStore("pawpal-media").get("slips/a/b");
  assert.ok(
    requested.at(-1).startsWith(uncachedURL),
    `strong reads must use the uncached reader, got ${requested.at(-1)}`,
  );
  console.log(`netlify   strong read -> ${requested.at(-1)}`);

  // A runtime with only a cached edge URL: the plain call fails outright...
  context({ edgeURL: cachedURL });
  await assert.rejects(
    () => getStore({ name: "pawpal-media", consistency: "strong" }).get("slips/a/b"),
    (error) => {
      console.log(`netlify   getStore(strong) without an uncached URL -> ${error.name}: ${error.message}`);
      return error.name === "BlobsConsistencyError";
    },
  );
  // ...while the driver falls back to the API, which is strongly consistent.
  requested.length = 0;
  await createNetlifyBlobStore("pawpal-media").get("slips/a/b");
  const viaAPI = requested.find((url) =>
    url.startsWith("https://api.netlify.com/api/v1/blobs/"),
  );
  assert.ok(viaAPI, `expected the API fallback, got ${requested.join(", ")}`);
  assert.ok(
    !requested.some((url) => url.startsWith(cachedURL)),
    `the cached edge reader must not be used, got ${requested.join(", ")}`,
  );
  console.log(`netlify   fallback read -> ${viaAPI}`);
} finally {
  globalThis.fetch = realFetch;
}

await server.stop();
await rm(root, { recursive: true, force: true });
console.log(
  "All blob store checks passed: both drivers round-trip bytes and content types, refuse unsafe keys, and read strongly consistent.",
);
