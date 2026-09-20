// Proves the two risks of swapping Cloudflare D1 for libSQL, against a real
// local database built from drizzle/*.sql, through the real lib/d1-shim.ts:
//
//   (a) the SQLite trigger aborts still reach the app as strings containing
//       "inventory_changed" / "pending_limit", so the matches in
//       app/api/[...path]/route.ts still return 409 / 429;
//   (b) rows come back as plain JSON objects, so Response.json() produces the
//       same shape D1 produced (named keys only, no numeric indices).
//
//   node scripts/verify-d1-shim.mjs
import { createClient } from "@libsql/client";
import { rmSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { applyMigrations } from "./db-migrate.mjs";
import { createD1Shim } from "../lib/d1-shim.ts";

const FILE = ".data/verify-shim.db";
for (const suffix of ["", "-journal", "-wal", "-shm"])
  rmSync(`${FILE}${suffix}`, { force: true });
mkdirSync(".data", { recursive: true });

const client = createClient({ url: `file:${FILE}` });
await applyMigrations(client);
const db = createD1Shim(client);
const now = () => new Date().toISOString();

// --- setup: one product with 2 in stock, through the shim -------------------
const insert = await db
  .prepare(
    "INSERT INTO products (name,brand,pet,category,price,originalPrice,size,stock,description,image,art,badge,active,images,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  )
  .bind(
    "ขนมสุนัขอบแห้ง",
    "PAWPAL",
    "dog",
    "อาหาร",
    120.5,
    150,
    "500 กรัม",
    2,
    "ขนมสำหรับสุนัขโตทุกสายพันธุ์",
    "/images/product-front-0.webp",
    0,
    "ขายดี",
    1,
    JSON.stringify(["/images/product-front-0.webp"]),
    "prod-1",
  )
  .run();
console.log(
  "run() meta:",
  JSON.stringify(insert.meta),
  "success:",
  insert.success,
  "results:",
  JSON.stringify(insert.results),
);
assert.equal(insert.meta.changes, 1, "run() must expose meta.changes");
assert.ok(insert.meta.last_row_id > 0, "run() must expose meta.last_row_id");

const noop = await db
  .prepare("UPDATE products SET active=0 WHERE id=?")
  .bind("does-not-exist")
  .run();
assert.equal(noop.meta.changes, 0, "meta.changes must be 0 when nothing matched");
assert.equal(
  await db.prepare("SELECT id FROM products WHERE id=?").bind("nope").first(),
  null,
  "first() must return null, never undefined",
);

// --- (b) row JSON shape -----------------------------------------------------
// The exact SELECT behind GET /api/shop.
const shop = await db
  .prepare("SELECT * FROM products WHERE active=1 ORDER BY rowid")
  .all();
const row = shop.results[0];
console.log("\n=== (b) row JSON shape ===");
console.log("JSON.stringify(row):", JSON.stringify(row));
console.log("Object.keys(row):", JSON.stringify(Object.keys(row)));
console.log(
  "Object.getOwnPropertyNames(row):",
  JSON.stringify(Object.getOwnPropertyNames(row)),
);
console.log(
  "prototype is Object.prototype:",
  Object.getPrototypeOf(row) === Object.prototype,
);
console.log("constructor:", row.constructor.name);
// The real serialisation path: route.ts hands these rows to Response.json().
const bodyText = await Response.json({ products: shop.results }).text();
console.log("Response.json() body:", bodyText);

assert.deepEqual(
  Object.getOwnPropertyNames(row),
  [
    "id",
    "name",
    "brand",
    "pet",
    "category",
    "price",
    "originalPrice",
    "size",
    "stock",
    "description",
    "image",
    "art",
    "badge",
    "active",
    "images",
  ],
  "rows must carry column names only",
);
assert.ok(
  !Object.getOwnPropertyNames(row).some((key) => /^\d+$/.test(key)),
  "rows must not carry numeric indices",
);
assert.ok(
  !Object.getOwnPropertyNames(row).includes("length"),
  "rows must not carry a length property",
);
assert.equal(Object.getPrototypeOf(row), Object.prototype, "rows must be plain objects");
assert.equal(typeof row.price, "number");
assert.equal(typeof row.stock, "number");
assert.equal(typeof row.name, "string");
assert.equal(
  bodyText,
  JSON.stringify({ products: [Object.fromEntries(Object.entries(row))] }),
  "Response.json() must serialise exactly the named columns",
);

// --- (a) trigger aborts -----------------------------------------------------
console.log("\n=== (a) trigger aborts ===");
const orderStatement = (id, requestId) =>
  db
    .prepare(
      "INSERT INTO orders (id,code,userId,customer,items,total,shipping,status,tracking,slip,bank,demo,createdAt,requestId,paymentDueAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .bind(
      id,
      `PP-${id.toUpperCase()}`,
      "user-1",
      "{}",
      "[]",
      241,
      0,
      "awaiting_payment",
      "",
      "",
      "{}",
      1,
      now(),
      requestId,
      now(),
    );
const lineStatement = (id, orderId, quantity) =>
  db
    .prepare(
      "INSERT INTO order_lines (id,orderId,productId,quantity,price) VALUES (?,?,?,?,?)",
    )
    .bind(id, orderId, "prod-1", quantity, 120.5);

// (a1) oversell through db.batch(), the path POST /api/orders actually uses.
let oversellBatch = "";
try {
  await db.batch([orderStatement("order-over", "req-over"), lineStatement("line-over", "order-over", 99)]);
  assert.fail("the oversell batch should have been aborted by order_inventory_check");
} catch (error) {
  oversellBatch = String(error);
  console.log("batch oversell   String(e):", JSON.stringify(oversellBatch));
  console.log("                 name:", error.name, "code:", error.code, "extendedCode:", error.extendedCode);
}
assert.ok(
  oversellBatch.includes("inventory_changed"),
  'route.ts line 356 matches String(e).includes("inventory_changed")',
);
assert.equal(
  (await db.prepare("SELECT COUNT(*) AS n FROM orders WHERE id=?").bind("order-over").first()).n,
  0,
  "the failed batch must roll the order row back",
);
assert.equal(
  (await db.prepare("SELECT stock FROM products WHERE id=?").bind("prod-1").first()).stock,
  2,
  "stock must be untouched after the rolled-back batch",
);

// (a2) oversell through a single prepared statement.
let oversellSingle = "";
await db.batch([orderStatement("order-ok", "req-ok")]);
try {
  await lineStatement("line-single", "order-ok", 99).run();
  assert.fail("the oversell insert should have been aborted");
} catch (error) {
  oversellSingle = String(error);
  console.log("single oversell  String(e):", JSON.stringify(oversellSingle));
}
assert.ok(oversellSingle.includes("inventory_changed"));

// (a3) the reserve trigger still moves stock on a legal line.
await lineStatement("line-ok", "order-ok", 2).run();
assert.equal(
  (await db.prepare("SELECT stock FROM products WHERE id=?").bind("prod-1").first()).stock,
  0,
  "order_inventory_reserve must still deduct stock",
);

// (a4) pending-order limit: 10 pending orders, then one more.
for (let i = 1; i < 10; i += 1)
  await db.batch([orderStatement(`order-${i}`, `req-${i}`)]);
let pendingBatch = "";
try {
  await db.batch([orderStatement("order-11", "req-11"), lineStatement("line-11", "order-11", 1)]);
  assert.fail("the 11th pending order should have been aborted by order_pending_limit");
} catch (error) {
  pendingBatch = String(error);
  console.log("batch pending    String(e):", JSON.stringify(pendingBatch));
  console.log("                 name:", error.name, "code:", error.code, "extendedCode:", error.extendedCode);
}
assert.ok(
  pendingBatch.includes("pending_limit"),
  'route.ts line 351 matches String(e).includes("pending_limit")',
);

let pendingSingle = "";
try {
  await orderStatement("order-12", "req-12").run();
  assert.fail("the 12th pending order should have been aborted");
} catch (error) {
  pendingSingle = String(error);
  console.log("single pending   String(e):", JSON.stringify(pendingSingle));
}
assert.ok(pendingSingle.includes("pending_limit"));

// (a5) the release trigger still returns stock on cancellation.
const cancelled = await db
  .prepare("UPDATE orders SET status='cancelled' WHERE id=?")
  .bind("order-ok")
  .run();
assert.equal(cancelled.meta.changes, 1);
assert.equal(
  (await db.prepare("SELECT stock FROM products WHERE id=?").bind("prod-1").first()).stock,
  2,
  "order_inventory_release must still return stock",
);

client.close();
console.log(
  "\nAll shim checks passed: trigger aborts reach the app intact and rows serialise as plain objects.",
);
