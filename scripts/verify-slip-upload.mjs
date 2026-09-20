// Drives the real HTTP surface of a running PAWPAL server to prove the file
// store: a customer uploads a payment slip, reads it back, nobody else can,
// an admin can, and an oversized upload gets the app's own Thai error rather
// than an opaque platform failure.
//
// Identity is a real signed session cookie, minted by the development-only
// provider at /auth/dev (scripts/dev-session.mjs). The forged
// `oai-authenticated-user-*` headers this script used to send are gone, along
// with the code that trusted them.
//
//   TEST_BASE_URL=http://127.0.0.1:3213 ADMIN_EMAIL=dev@pawpal.test \
//     node scripts/verify-slip-upload.mjs
import assert from "node:assert/strict";
import { devSession } from "./dev-session.mjs";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3213";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local test only");
const adminEmail = (process.env.ADMIN_EMAIL || "dev@pawpal.test")
  .split(",")[0]
  .trim();

async function signIn(sub, email, name) {
  return { cookie: await devSession(base, { sub, email, name }) };
}

const owner = await signIn(
  `user-owner-${crypto.randomUUID()}`,
  "owner@pawpal.test",
  "Slip Owner",
);
const other = await signIn(
  `user-other-${crypto.randomUUID()}`,
  "other@pawpal.test",
  "Someone Else",
);
const admin = await signIn(
  `user-admin-${crypto.randomUUID()}`,
  adminEmail,
  "Shop Admin",
);

function headers(user) {
  return user ? { cookie: user.cookie } : {};
}

async function api(path, { user, method = "GET", data, body, type } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...headers(user),
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(type ? { "Content-Type": type } : {}),
      // State-changing requests must say where they come from, as a browser does.
      ...(method === "GET" ? {} : { Origin: base }),
    },
    body: body ?? (data ? JSON.stringify(data) : undefined),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  let json;
  try {
    json = JSON.parse(bytes.toString("utf8"));
  } catch {}
  return { status: response.status, json, bytes, response };
}

/** A real multipart body, so the content-length the server sees is ours. */
function multipart(bytes, { filename = "slip.png", contentType = "image/png" } = {}) {
  const boundary = `----pawpal${crypto.randomUUID().replace(/-/g, "")}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([head, bytes, tail]),
    type: `multipart/form-data; boundary=${boundary}`,
  };
}

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000a49444154789c6360000002000100ffff030000060" +
    "0055dc5b3860000000049454e44ae426082",
  "hex",
);
/** Still a valid PNG header, just far too much of it. */
const bigPNG = (bytes) =>
  Buffer.concat([PNG, Buffer.alloc(Math.round(bytes) - PNG.length, 0x41)]);

let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log("PASS", message);
}

// --- an order to attach a slip to -------------------------------------------
const shop = await api("/api/shop");
check(shop.status === 200, "GET /api/shop 200");
const product = shop.json.products.find((p) => p.stock > 0);
assert.ok(product, "a product with stock");
const shipping =
  product.price >= shop.json.settings.freeShipping ? 0 : shop.json.settings.shipping;
const order = await api("/api/orders", {
  user: owner,
  method: "POST",
  data: {
    quotedTotal: Math.round((product.price + shipping) * 100) / 100,
    requestId: crypto.randomUUID(),
    items: [{ id: product.id, quantity: 1 }],
    customer: {
      name: "ลูกค้า ทดสอบ",
      phone: "0812345678",
      address: "123 ถนนทดสอบ แขวงทดสอบ เขตทดสอบ กรุงเทพมหานคร",
      postal: "10110",
      note: "",
      consent: "on",
    },
  },
});
check(order.status === 201, `POST /api/orders 201 (${JSON.stringify(order.json)})`);
const orderId = order.json.id;

// --- the upload -------------------------------------------------------------
const slip = multipart(PNG);
const upload = await api(`/api/orders/${orderId}/slip`, {
  user: owner,
  method: "POST",
  body: slip.body,
  type: slip.type,
});
check(upload.status === 200 && upload.json.ok, "owner uploads a slip -> 200");

const orders = await api("/api/orders", { user: owner });
const stored = orders.json.orders.find((o) => o.id === orderId);
check(stored.status === "reviewing", "order flipped to reviewing after the upload");
check(
  /^slips\/[0-9a-f-]+\/[0-9a-f-]+$/.test(stored.slip),
  `slip key recorded: ${stored.slip}`,
);

// --- reading it back --------------------------------------------------------
const mine = await api(`/api/media/${stored.slip}`, { user: owner });
const served = mine.bytes;
check(mine.status === 200, "owner reads the slip -> 200");
check(
  mine.response.headers.get("content-type") === "image/png",
  `served as ${mine.response.headers.get("content-type")}`,
);
check(
  served.equals(PNG),
  `bytes identical: ${served.length} of ${PNG.length} bytes round-tripped`,
);
check(
  mine.response.headers.get("cache-control") === "private, no-store",
  "slips stay private, no-store",
);

const stranger = await api(`/api/media/${stored.slip}`, { user: other });
check(
  stranger.status === 404 && stranger.json.error === "ไม่พบไฟล์",
  "a different signed-in customer -> 404 ไม่พบไฟล์",
);
const anonymous = await api(`/api/media/${stored.slip}`);
check(
  anonymous.status === 401 && anonymous.json.error === "กรุณาลงชื่อเข้าใช้ก่อนดำเนินการ",
  "a signed-out visitor -> 401",
);
const asAdmin = await api(`/api/media/${stored.slip}`, { user: admin });
check(asAdmin.status === 200, "the shop admin -> 200");

// --- replacing a slip deletes the old blob ----------------------------------
const second = multipart(PNG, { filename: "slip2.png" });
const reupload = await api(`/api/orders/${orderId}/slip`, {
  user: owner,
  method: "POST",
  body: second.body,
  type: second.type,
});
check(reupload.status === 200, "owner replaces the slip -> 200");
const afterwards = await api("/api/orders", { user: owner });
const replaced = afterwards.json.orders.find((o) => o.id === orderId);
check(replaced.slip !== stored.slip, "a new key was stored");
check(
  (await api(`/api/media/${stored.slip}`, { user: owner })).status === 404,
  "the superseded slip is gone from the store -> 404",
);
check(
  (await api(`/api/media/${replaced.slip}`, { user: owner })).status === 200,
  "the current slip is readable",
);

// --- keys that were never written -------------------------------------------
for (const key of [
  `slips/${orderId}/${crypto.randomUUID()}`,
  "products/does-not-exist",
  "products/..%2fsecret",
  "secrets/passwords",
]) {
  const missing = await api(`/api/media/${key}`, { user: owner });
  check(
    missing.status === 404 && missing.json.error === "ไม่พบไฟล์",
    `GET /api/media/${key} -> 404 ไม่พบไฟล์`,
  );
}

// --- the size limits --------------------------------------------------------
const tooBig = multipart(bigPNG(4.2 * 1024 * 1024));
const rejectedEarly = await api(`/api/orders/${orderId}/slip`, {
  user: owner,
  method: "POST",
  body: tooBig.body,
  type: tooBig.type,
});
check(
  rejectedEarly.status === 413 &&
    rejectedEarly.json.error === "รูปต้องมีขนาดไม่เกิน 3 MB",
  `${tooBig.body.length} byte request -> 413 รูปต้องมีขนาดไม่เกิน 3 MB`,
);
const overTheFileLimit = multipart(bigPNG(3.5 * 1024 * 1024));
const rejectedFile = await api(`/api/orders/${orderId}/slip`, {
  user: owner,
  method: "POST",
  body: overTheFileLimit.body,
  type: overTheFileLimit.type,
});
check(
  rejectedFile.status === 400 &&
    rejectedFile.json.error === "เลือกรูป JPG, PNG หรือ WebP ไม่เกิน 3 MB",
  `${overTheFileLimit.body.length} byte request -> 400 เลือกรูป JPG, PNG หรือ WebP ไม่เกิน 3 MB`,
);
const stillThere = await api(`/api/media/${replaced.slip}`, { user: owner });
check(stillThere.status === 200, "a rejected upload left the stored slip alone");

// --- product images: the other half of the bucket ---------------------------
const productImage = multipart(PNG, { filename: "product.png" });
const adminUpload = await api("/api/admin/upload", {
  user: admin,
  method: "POST",
  body: productImage.body,
  type: productImage.type,
});
check(
  adminUpload.status === 200 &&
    /^\/api\/media\/products\/[0-9a-f-]+$/.test(adminUpload.json.url),
  `admin uploads a product image -> ${adminUpload.json?.url ?? adminUpload.status}`,
);
const publicRead = await api(adminUpload.json.url);
const publicBytes = publicRead.bytes;
check(
  publicRead.status === 200 &&
    publicRead.response.headers.get("content-type") === "image/png" &&
    publicBytes.equals(PNG),
  "a signed-out visitor reads the product image as image/png, bytes identical",
);
check(
  publicRead.response.headers.get("cache-control") === "public, max-age=86400",
  "product images stay publicly cacheable",
);
const customerAttempt = multipart(PNG);
const notAdmin = await api("/api/admin/upload", {
  user: other,
  method: "POST",
  body: customerAttempt.body,
  type: customerAttempt.type,
});
check(notAdmin.status === 403, "a customer cannot upload product images -> 403");

console.log(`\n${checks} checks passed against ${base}`);
