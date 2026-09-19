import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON");
for (const file of readdirSync("drizzle")
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  const sql = readFileSync(`drizzle/${file}`, "utf8");
  assert.ok(!sql.includes("\r"), `${file} must use LF for D1 trigger parsing`);
  assert.ok(
    !sql.includes("SELECT CASE"),
    `${file} must parenthesize trigger CASE expressions for the D1 SQL splitter`,
  );
  db.exec(sql);
}
db.exec(
  "INSERT INTO products (id,name,brand,pet,category,price,size,stock,description) VALUES ('test','test','test','dog','food',10,'test',2,'test')",
);
const order = db.prepare(
  "INSERT INTO orders (id,code,userId,customer,items,total,shipping,bank,demo,createdAt,requestId) VALUES (?,?,?,'{}','[]',10,0,'{}',1,?,?)",
);
order.run("order", "test", "user", new Date().toISOString(), "request");
db.exec(
  "INSERT INTO order_lines (id,orderId,productId,quantity,price) VALUES ('line','order','test',1,10)",
);
assert.equal(
  db.prepare("SELECT stock FROM products WHERE id='test'").get().stock,
  1,
);
assert.throws(
  () =>
    db.exec(
      "INSERT INTO order_lines (id,orderId,productId,quantity,price) VALUES ('bad','order','test',2,10)",
    ),
  /inventory_changed/,
);
db.exec("UPDATE orders SET status='cancelled' WHERE id='order'");
assert.equal(
  db.prepare("SELECT stock FROM products WHERE id='test'").get().stock,
  2,
);
db.exec("UPDATE orders SET status='cancelled' WHERE id='order'");
assert.equal(
  db.prepare("SELECT stock FROM products WHERE id='test'").get().stock,
  2,
);
for (let i = 0; i < 10; i++)
  order.run(`pending-${i}`, `P${i}`, "user", new Date().toISOString(), `R${i}`);
assert.throws(
  () =>
    order.run("over-limit", "extra", "user", new Date().toISOString(), "extra"),
  /pending_limit/,
);
const review = db.prepare(
  "INSERT INTO reviews (id,productId,userId,orderId,nickname,rating,comment,demo,createdAt,updatedAt) VALUES (?,'test','user','order','tester',5,'Local schema test',?,?,?)",
);
const stamp = new Date().toISOString();
review.run("demo-review", 1, stamp, stamp);
review.run("real-review", 0, stamp, stamp);
assert.throws(() => review.run("duplicate-review", 1, stamp, stamp), /UNIQUE/);
assert.equal(
  db.prepare("SELECT COUNT(*) AS count FROM reviews").get().count,
  2,
);
db.close();
console.log(
  "Fresh migrations, inventory reservation, cancellation, and pending-order cap passed.",
);
