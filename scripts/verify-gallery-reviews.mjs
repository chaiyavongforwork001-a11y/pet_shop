import assert from "node:assert/strict";
import { devSession } from "./dev-session.mjs";
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local test only");
// The buyer is also the admin here: the script creates a product, buys it and
// ships it to itself to reach the verified-purchase review path.
const cookie = await devSession(base, {
  sub: "verify-gallery-user",
  email: (process.env.ADMIN_EMAIL || "dev@pawpal.test").split(",")[0].trim(),
  name: "QA Pet Parent",
});
let checks = 0;
async function request(path, method = "GET", data, auth = true) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(auth ? { cookie } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
      // State-changing requests must say where they come from, as a browser does.
      ...(method === "GET" ? {} : { Origin: base }),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log("PASS", message);
}
const draft = {
  name: "QA gallery review product",
  brand: "LOCAL TEST",
  pet: "dog",
  category: "อาหาร",
  price: 100,
  originalPrice: 0,
  size: "QA only",
  stock: 5,
  description: "Disposable local product for gallery and review checks",
  image: "/images/product-front-0.webp",
  images: ["/images/product-front-0.webp", "/images/product-side-0.webp"],
  art: 0,
  badge: "TEST",
  active: 1,
};
const created = await request("/api/admin/products", "POST", draft);
check(created.status === 200, "admin saves multi-image product");
const id = created.data.id;
let orderId;
try {
  const shop = await request("/api/shop");
  const p = shop.data.products.find((p) => p.id === id);
  check(
    p.images.length === 2 && p.images[1] === draft.images[1],
    "gallery persists as ordered array",
  );
  check(
    (
      await request("/api/admin/products", "POST", {
        ...draft,
        images: Array(9).fill(draft.image),
      })
    ).status === 400,
    "more than eight images rejected",
  );
  check(
    (
      await request("/api/admin/products", "POST", {
        ...draft,
        images: Array.from(
          { length: 8 },
          (_, i) => `https://example.com/gallery-${i}.webp`,
        ),
      })
    ).status === 400,
    "separate cover plus eight gallery images rejected",
  );
  check(
    (
      await request("/api/admin/products", "POST", {
        ...draft,
        images: ["javascript:alert(1)"],
      })
    ).status === 400,
    "unsafe image scheme rejected",
  );
  const reversed = [...draft.images].reverse();
  check(
    (
      await request("/api/admin/products", "POST", {
        ...p,
        expectedStock: 5,
        image: reversed[0],
        images: reversed,
      })
    ).status === 200,
    "admin changes cover and order",
  );
  const after = (await request("/api/shop")).data.products.find(
    (p) => p.id === id,
  );
  check(
    after.image === reversed[0] && after.images[0] === reversed[0],
    "cover matches first gallery image",
  );
  const path = `/api/products/${id}/reviews`;
  const review = {
    nickname: "QA Pet Parent",
    rating: 5,
    comment: "Local test review only; no real purchase.",
  };
  check(
    (await request(path, "POST", review, false)).status === 401,
    "anonymous reviews denied",
  );
  check(
    (await request(path, "POST", review)).status === 403,
    "unverified buyer review denied",
  );
  const initial = (await request(path, "GET", undefined, false)).data;
  check(
    initial.summary.count === 0 && !initial.canReview,
    "empty reviews have no fabricated rating",
  );
  const settings = shop.data.settings;
  const total = 100 + (100 >= settings.freeShipping ? 0 : settings.shipping);
  const order = await request("/api/orders", "POST", {
    quotedTotal: total,
    requestId: crypto.randomUUID(),
    items: [{ id, quantity: 1 }],
    customer: {
      name: "Local QA",
      phone: "0000000000",
      address: "Local verification address only",
      postal: "00000",
      note: "Not a real order",
      consent: "on",
    },
  });
  check(order.status === 201, "test order created");
  orderId = order.data.id;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=",
    "base64",
  );
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "qa-slip.png");
  const upload = await fetch(base + `/api/orders/${orderId}/slip`, {
    method: "POST",
    headers: { cookie, Origin: base },
    body: form,
  });
  check(upload.status === 200, "test slip stored");
  let current = (await request("/api/orders")).data.orders.find(
    (o) => o.id === orderId,
  );
  for (const status of ["paid", "packing", "shipped"]) {
    const r = await request(`/api/admin/orders/${orderId}`, "PATCH", {
      status,
      expectedSlip: current.slip,
      tracking: status === "shipped" ? "LOCAL-QA-TRACKING" : "",
    });
    assert.equal(r.status, 200);
  }
  check(
    (await request(path)).data.canReview,
    "shipped purchase enables review",
  );
  check(
    (await request(path, "POST", { ...review, rating: 6 })).status === 400,
    "out of range rating rejected",
  );
  check(
    (await request(path, "POST", review)).status === 200,
    "verified buyer submits review",
  );
  check(
    (
      await request(path, "POST", {
        ...review,
        rating: 4,
        comment: "Updated local test review, still one record.",
      })
    ).status === 200,
    "buyer edits own review",
  );
  const list = (await request(path, "GET", undefined, false)).data;
  check(
    list.summary.count === 1 && list.summary.average === 4,
    "editing does not duplicate or inflate reviews",
  );
  check(
    list.reviews[0].demo === 1 &&
      list.reviews[0].userId === undefined &&
      list.reviews[0].orderId === undefined,
    "public review marks demo and omits buyer IDs",
  );
  check(
    (await request("/api/products/no-such-product/reviews")).status === 404,
    "missing product cannot expose reviews",
  );
} finally {
  await request(`/api/admin/products/${id}`, "DELETE");
}
console.log(`${checks} gallery and review integration checks passed.`);
