import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { devSession } from "./dev-session.mjs";
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local test only");
let checks = 0;
// One account plays both parts, as before: it shops, and its address is in
// ADMIN_EMAIL so it also administers. The cookie is a real signed session.
const shopper = {
  sub: "verify-shop-user",
  email: (process.env.ADMIN_EMAIL || "dev@pawpal.test").split(",")[0].trim(),
  name: "Seedy",
};
const cookie = await devSession(base, shopper);
async function request(
  path,
  { method = "GET", data, auth = true, origin, form } = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(auth ? { cookie } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
      // A browser always states its origin on a state-changing request and the
      // server now insists on it, so the script states one too. Pass `origin`
      // explicitly to play somebody else's site.
      ...(method === "GET" ? {} : { Origin: origin || base }),
    },
    body: form || (data ? JSON.stringify(data) : undefined),
  });
  let d;
  try {
    d = await r.json();
  } catch {}
  return { status: r.status, data: d };
}
function check(value, msg) {
  assert.ok(value, msg);
  checks++;
  console.log("PASS", msg);
}
check(
  (await request("/api/admin", { auth: false })).status === 401,
  "anonymous admin denied",
);
check(
  (await request("/api/orders", { auth: false })).status === 401,
  "anonymous orders denied",
);
check(
  (
    await request("/api/chat", {
      method: "POST",
      data: { text: "test" },
      origin: "https://example.org",
    })
  ).status === 403,
  "cross-origin mutations denied",
);
const shop = (await request("/api/shop")).data;
check(shop.products.length > 0, "persistent catalog loads");
const draft = {
  name: "QA disposable pet food",
  brand: "TEST ONLY",
  pet: "dog",
  category: "อาหาร",
  price: 100,
  originalPrice: 0,
  size: "test",
  stock: 3,
  description: "Local integration test data",
  image: "",
  art: 0,
  badge: "TEST",
  active: 1,
};
const created = await request("/api/admin/products", {
  method: "POST",
  data: draft,
});
check(created.status === 200, "admin creates product");
const id = created.data.id;
const customer = {
  name: "QA Test",
  phone: "0000000000",
  address: "Local test address only",
  postal: "00000",
  note: "Not a real order",
  consent: "on",
};
const orderData = {
  quotedTotal: 250,
  requestId: crypto.randomUUID(),
  customer,
  items: [{ id, quantity: 2 }],
};
check(
  (
    await request("/api/orders", {
      method: "POST",
      data: { ...orderData, quotedTotal: 1 },
    })
  ).status === 409,
  "changed checkout total requires reconfirmation",
);
let order = await request("/api/orders", { method: "POST", data: orderData });
check(order.status === 201, "checkout creates order");
const oid = order.data.id;
const again = await request("/api/orders", { method: "POST", data: orderData });
check(
  again.status === 200 && again.data.order.id === oid,
  "checkout retry is idempotent",
);
let current = (await request("/api/admin")).data;
check(
  current.products.find((p) => p.id === id).stock === 1,
  "inventory reserved once",
);
check(
  (
    await request("/api/admin/products", {
      method: "POST",
      data: { ...draft, id, expectedStock: 3 },
    })
  ).status === 409,
  "stale product edits cannot restore sold inventory",
);
check(
  (
    await request("/api/orders", {
      method: "POST",
      data: { ...orderData, requestId: crypto.randomUUID() },
    })
  ).status === 409,
  "insufficient inventory rejected",
);
check(
  (
    await request("/api/admin/orders/" + oid, {
      method: "PATCH",
      data: { status: "paid", tracking: "", expectedSlip: "" },
    })
  ).status === 409,
  "payment cannot be approved before slip",
);
const badForm = new FormData();
badForm.append(
  "file",
  new Blob(["not png"], { type: "image/png" }),
  "test.png",
);
check(
  (
    await request("/api/orders/" + oid + "/slip", {
      method: "POST",
      form: badForm,
    })
  ).status === 400,
  "invalid image bytes rejected",
);
const bytes = await fs.readFile("public/images/products.webp");
const upload = async () => {
  const f = new FormData();
  f.append("file", new Blob([bytes], { type: "image/webp" }), "test.webp");
  return request("/api/orders/" + oid + "/slip", { method: "POST", form: f });
};
check((await upload()).status === 200, "customer uploads slip");
let first = (await request("/api/orders")).data.orders.find(
  (o) => o.id === oid,
);
check(first.status === "reviewing" && first.slip, "slip sets reviewing state");
check(
  (await request("/api/media/" + first.slip, { auth: false })).status === 401,
  "anonymous slip read denied",
);
check((await upload()).status === 200, "customer replaces slip");
check(
  (
    await request("/api/admin/orders/" + oid, {
      method: "PATCH",
      data: { status: "paid", tracking: "", expectedSlip: first.slip },
    })
  ).status === 409,
  "stale slip approval rejected",
);
let updated = (await request("/api/orders")).data.orders.find(
  (o) => o.id === oid,
);
check(
  (
    await request("/api/admin/orders/" + oid, {
      method: "PATCH",
      data: { status: "paid", tracking: "", expectedSlip: updated.slip },
    })
  ).status === 200,
  "reviewed slip can be approved",
);
check(
  (
    await request("/api/admin/orders/" + oid, {
      method: "PATCH",
      data: { status: "packing", tracking: "", expectedSlip: updated.slip },
    })
  ).status === 200,
  "paid order moves to packing",
);
check(
  (
    await request("/api/admin/orders/" + oid, {
      method: "PATCH",
      data: { status: "shipped", tracking: "", expectedSlip: updated.slip },
    })
  ).status === 400,
  "shipping requires tracking number",
);
check(
  (
    await request("/api/admin/orders/" + oid, {
      method: "PATCH",
      data: { status: "cancelled", tracking: "", expectedSlip: updated.slip },
    })
  ).status === 200,
  "cancellation allowed and recorded",
);
check(
  (await request("/api/admin")).data.products.find((p) => p.id === id).stock ===
    3,
  "cancellation restores inventory",
);
check(
  (
    await request("/api/admin/orders/" + oid, {
      method: "PATCH",
      data: { status: "cancelled", tracking: "", expectedSlip: updated.slip },
    })
  ).status === 409,
  "repeated cancellation rejected",
);
check(
  (
    await request("/api/chat", {
      method: "POST",
      data: { text: "Local QA customer message" },
    })
  ).status === 201,
  "customer chat saved",
);
const threads = (await request("/api/admin")).data.threads;
const tid =
  threads.find((t) => t.userName === "Seedy")?.userId || threads[0].userId;
check(
  (
    await request("/api/admin/chat/" + tid, {
      method: "POST",
      data: { text: "Local QA admin reply" },
    })
  ).status === 201,
  "admin chat reply saved",
);
check(
  (await request("/api/chat")).data.messages.some(
    (m) => m.text === "Local QA admin reply" && m.sender === "admin",
  ),
  "customer receives persisted admin reply",
);
check(
  (await request("/api/admin/products/" + id, { method: "DELETE" })).status ===
    200,
  "admin hides product",
);
check(
  !(await request("/api/shop")).data.products.some((p) => p.id === id),
  "hidden product removed from storefront",
);
console.log(`All ${checks} checks passed.`);
