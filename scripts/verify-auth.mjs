// Proves the identity system against a running PAWPAL server, with real
// requests rather than reasoning about the code.
//
// What is being proved, in order:
//
//   1. The forged `oai-authenticated-user-*` headers that used to *be* the
//      login get you nothing at all. This is the vulnerability this phase
//      exists to close, so it is the first check.
//   2. A session cookie is only accepted if this server signed it: every way
//      of editing one — payload, signature, both, a plausible fake — fails
//      closed to signed out.
//   3. The ADMIN_EMAIL allowlist still decides admin, and an ordinary
//      customer's session does not.
//   4. One customer cannot read another customer's order or payment slip.
//   5. Sign-out actually ends the session.
//
// The "fails closed when ADMIN_EMAIL is unset" and "dev provider is
// unreachable in production" cases need a differently configured server, so
// they live in scripts/verify-auth-closed.mjs, which starts its own.
//
//   TEST_BASE_URL=http://127.0.0.1:3214 node scripts/verify-auth.mjs
import assert from "node:assert/strict";
import { devSession } from "./dev-session.mjs";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3214";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local test only");
const adminEmail = (process.env.ADMIN_EMAIL || "dev@pawpal.test")
  .split(",")[0]
  .trim();

let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks += 1;
  console.log("PASS", message);
}

async function api(path, { cookie, method = "GET", data, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    redirect: "manual",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  let json;
  try {
    json = await response.clone().json();
  } catch {}
  return { status: response.status, json, response };
}

// ---------------------------------------------------------------------------
// 1. The headers the app used to trust
// ---------------------------------------------------------------------------

const FORGED = {
  "oai-authenticated-user-id": "attacker",
  "oai-authenticated-user-email": adminEmail,
  "oai-authenticated-user-full-name": "Shop%20Owner",
  "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
};

for (const [path, expected] of [
  ["/api/admin", 401],
  ["/api/orders", 401],
  ["/api/chat", 401],
]) {
  const forged = await api(path, { headers: FORGED });
  check(
    forged.status === expected,
    `forged oai-authenticated headers on ${path} -> ${expected} (got ${forged.status})`,
  );
}
check(
  (await api("/api/admin", { headers: FORGED })).json?.error ===
    "กรุณาลงชื่อเข้าใช้ก่อนดำเนินการ",
  "forged headers get the app's ordinary signed-out error, not admin data",
);

// ---------------------------------------------------------------------------
// 2. Cookie integrity
// ---------------------------------------------------------------------------

const customer = await devSession(base, {
  sub: "verify-auth-customer",
  email: "customer@pawpal.test",
  name: "ลูกค้าทดสอบ",
});
const stranger = await devSession(base, {
  sub: "verify-auth-stranger",
  email: "stranger@pawpal.test",
  name: "อีกคนหนึ่ง",
});
const admin = await devSession(base, {
  sub: "verify-auth-admin",
  email: adminEmail,
  name: "เจ้าของร้าน",
});

check(
  (await api("/api/orders", { cookie: customer })).status === 200,
  "a real signed session reads its own orders -> 200",
);

const token = customer.slice("pawpal_session=".length);
const [payloadPart, signaturePart] = token.split(".");
const decode = (value) =>
  JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
const encode = (value) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const claims = decode(payloadPart);
check(
  claims.sub === "verify-auth-customer" && claims.email === "customer@pawpal.test",
  `session payload is the account that signed in (${claims.email})`,
);

const tampered = {
  "payload edited to the admin address, signature kept": `${encode({
    ...claims,
    email: adminEmail,
  })}.${signaturePart}`,
  "payload edited to another customer's id": `${encode({
    ...claims,
    sub: "verify-auth-stranger",
  })}.${signaturePart}`,
  "expiry pushed far into the future": `${encode({
    ...claims,
    exp: claims.exp + 10 * 365 * 24 * 60 * 60,
  })}.${signaturePart}`,
  "one bit flipped in the signature": `${payloadPart}.${
    signaturePart.slice(0, -1) + (signaturePart.endsWith("A") ? "B" : "A")
  }`,
  "signature removed": payloadPart,
  "signature replaced with junk": `${payloadPart}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
  "payload is not JSON": `bm90LWpzb24.${signaturePart}`,
  "whole cookie invented": "not-even-close.at-all",
  "empty cookie": "",
};

for (const [what, value] of Object.entries(tampered)) {
  const result = await api("/api/orders", {
    cookie: `pawpal_session=${value}`,
  });
  check(result.status === 401, `tampered cookie rejected — ${what} -> 401`);
}
check(
  (
    await api("/api/admin", {
      cookie: `pawpal_session=${encode({ ...claims, email: adminEmail })}.${signaturePart}`,
    })
  ).status === 401,
  "a cookie rewritten to the admin address does not reach /api/admin",
);

// ---------------------------------------------------------------------------
// 3. The admin allowlist
// ---------------------------------------------------------------------------

check(
  (await api("/api/admin", { cookie: admin })).status === 200,
  `ADMIN_EMAIL account (${adminEmail}) reaches /api/admin -> 200`,
);
const customerAtAdmin = await api("/api/admin", { cookie: customer });
check(
  customerAtAdmin.status === 403 &&
    customerAtAdmin.json?.error ===
      "บัญชีนี้ไม่มีสิทธิ์แอดมิน กรุณาใช้บัญชีที่เจ้าของร้านกำหนด",
  "a signed-in customer gets the shop's own 403 from /api/admin",
);
check(
  (await api("/api/admin/upload", { cookie: customer, method: "POST" })).status ===
    403,
  "a customer cannot upload product images -> 403",
);

// ---------------------------------------------------------------------------
// 4. One customer, one customer's data
// ---------------------------------------------------------------------------

const shop = await api("/api/shop");
const product = shop.json.products.find((p) => p.stock > 0);
assert.ok(product, "a product with stock to order");
const shipping =
  product.price >= shop.json.settings.freeShipping
    ? 0
    : shop.json.settings.shipping;
const order = await api("/api/orders", {
  cookie: customer,
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
check(order.status === 201, "the customer places an order -> 201");
const orderId = order.json.id;

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000a49444154789c6360000002000100ffff030000060" +
    "0055dc5b3860000000049454e44ae426082",
  "hex",
);
const boundary = `----pawpal${crypto.randomUUID().replace(/-/g, "")}`;
const slipBody = Buffer.concat([
  Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="slip.png"\r\n` +
      "Content-Type: image/png\r\n\r\n",
  ),
  PNG,
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);
const uploaded = await fetch(`${base}/api/orders/${orderId}/slip`, {
  method: "POST",
  headers: {
    cookie: customer,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
  },
  body: slipBody,
});
check(uploaded.status === 200, "the customer attaches a payment slip -> 200");

const mine = (await api("/api/orders", { cookie: customer })).json.orders.find(
  (o) => o.id === orderId,
);
check(!!mine, "the order is in its owner's list");
check(
  !(await api("/api/orders", { cookie: stranger })).json.orders.some(
    (o) => o.id === orderId,
  ),
  "another customer's order list does not contain it",
);
check(
  (await api(`/api/media/${mine.slip}`, { cookie: customer })).status === 200,
  "the owner reads their own slip -> 200",
);
const strangerSlip = await api(`/api/media/${mine.slip}`, { cookie: stranger });
check(
  strangerSlip.status === 404 && strangerSlip.json?.error === "ไม่พบไฟล์",
  "another customer reading that slip -> 404 ไม่พบไฟล์",
);
check(
  (await api(`/api/media/${mine.slip}`, { headers: FORGED })).status === 401,
  "forged headers cannot read the slip either -> 401",
);
check(
  (await api(`/api/media/${mine.slip}`, { cookie: admin })).status === 200,
  "the shop admin can read the slip -> 200",
);
const hijack = await api(`/api/orders/${orderId}/slip`, {
  cookie: stranger,
  method: "POST",
});
check(
  hijack.status === 404,
  "another customer cannot attach a slip to that order -> 404",
);

// ---------------------------------------------------------------------------
// 5. The admin page itself, not just its API
// ---------------------------------------------------------------------------

const adminPage = async (headers) =>
  (await fetch(`${base}/admin`, { headers, redirect: "manual" })).text();

const PANEL_MARKER = "SHOP MANAGER";
const LOCKED_MARKER = "พื้นที่ดูแลร้าน PAWPAL";

check(
  (await adminPage(FORGED)).includes(LOCKED_MARKER) &&
    !(await adminPage(FORGED)).includes(PANEL_MARKER),
  "GET /admin with forged headers renders the locked card, never the panel",
);
check(
  (await adminPage({ cookie: customer })).includes(LOCKED_MARKER),
  "GET /admin as a signed-in customer renders the locked card",
);
check(
  (await adminPage({ cookie: admin })).includes(PANEL_MARKER),
  "GET /admin as the allowlisted admin renders the panel",
);
check(
  (await adminPage({})).includes("ลงชื่อเข้าใช้ด้วย Google"),
  "the signed-out admin page offers Google, not ChatGPT",
);

// ---------------------------------------------------------------------------
// 6. Sliding refresh
// ---------------------------------------------------------------------------
//
// A session past half its life should come back re-issued on the next API
// call. Reaching that state means minting a cookie with an older `iat`, which
// needs the server's own secret — so this block only runs when the harness
// passes SESSION_SECRET, and it re-implements the token format on purpose: if
// lib/session.ts ever changed shape, this check would stop passing.

const secret = process.env.SESSION_SECRET;
if (!secret) {
  console.log("SKIP sliding refresh (SESSION_SECRET not passed to the script)");
} else {
  const { createHmac } = await import("node:crypto");
  const mint = (payload) => {
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url",
    );
    const signature = createHmac("sha256", secret)
      .update(`pawpal.session.v1.${body}`)
      .digest("base64url");
    return `pawpal_session=${body}.${signature}`;
  };
  const now = Math.floor(Date.now() / 1000);
  const week = 7 * 24 * 60 * 60;

  const fresh = await api("/api/shop", {
    cookie: mint({
      sub: "verify-auth-refresh",
      email: "refresh@pawpal.test",
      name: null,
      iat: now,
      exp: now + week,
    }),
  });
  check(
    fresh.status === 200,
    "a hand-minted session with the documented format is accepted -> 200",
  );
  check(
    !(fresh.response.headers.getSetCookie?.() ?? []).some((c) =>
      c.startsWith("pawpal_session="),
    ),
    "a young session is not needlessly re-issued",
  );

  const aging = await api("/api/shop", {
    cookie: mint({
      sub: "verify-auth-refresh",
      email: "refresh@pawpal.test",
      name: null,
      iat: now - 5 * 24 * 60 * 60,
      exp: now + 2 * 24 * 60 * 60,
    }),
  });
  const reissued = (aging.response.headers.getSetCookie?.() ?? []).find((c) =>
    c.startsWith("pawpal_session="),
  );
  check(!!reissued, "a session past half its life comes back re-issued");
  const reissuedClaims = decode(
    reissued.split(";")[0].slice("pawpal_session=".length).split(".")[0],
  );
  check(
    reissuedClaims.sub === "verify-auth-refresh" &&
      reissuedClaims.exp > now + 6 * 24 * 60 * 60,
    "the re-issued session is the same account with a later expiry",
  );

  const forgedSecret = createHmac("sha256", `${secret}-wrong`)
    .update("pawpal.session.v1.x")
    .digest("base64url");
  check(
    (await api("/api/orders", { cookie: `pawpal_session=x.${forgedSecret}` }))
      .status === 401,
    "a cookie signed with a different secret is rejected -> 401",
  );
}

// ---------------------------------------------------------------------------
// 7. Sign-out, and the sign-in entry point
// ---------------------------------------------------------------------------

const signedOut = await fetch(`${base}/signout?return_to=/`, {
  headers: { cookie: customer },
  redirect: "manual",
});
check(signedOut.status === 302, "GET /signout redirects");
const cleared = (signedOut.headers.getSetCookie?.() ?? []).find((c) =>
  c.startsWith("pawpal_session="),
);
check(
  cleared?.includes("Max-Age=0") && cleared.includes("HttpOnly"),
  `sign-out expires the session cookie (${cleared})`,
);
for (const hostile of [
  "https://evil.test/steal",
  "//evil.test/steal",
  "/\\evil.test/steal",
  "/\t/evil.test/steal",
  "/\n/evil.test/steal",
  "http:/evil.test",
  "javascript:alert(1)",
  "/signout?return_to=/signin",
]) {
  const where = (
    await api(`/signout?return_to=${encodeURIComponent(hostile)}`)
  ).response.headers.get("location");
  check(
    where === "/" || where.startsWith("/"),
    `sign-out return_to ${JSON.stringify(hostile)} stays on this site (${where})`,
  );
  check(
    !where.startsWith("//") && !/^[a-z]+:/i.test(where),
    `sign-out return_to ${JSON.stringify(hostile)} is not an open redirect`,
  );
}
check(
  (await api("/signin?return_to=//evil.test/steal")).response.headers
    .get("location")
    .startsWith("/auth/dev?return_to=%2F"),
  "the sign-in entry point collapses a protocol-relative return_to to /",
);
check(
  (await api("/signin?return_to=%2Forders%3Fpage%3D2")).response.headers
    .get("location")
    .includes(encodeURIComponent("/orders?page=2")),
  "an ordinary relative return_to is carried through intact",
);

console.log(`\n${checks} identity checks passed against ${base}`);
