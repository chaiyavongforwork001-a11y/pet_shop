import { z } from "zod";
import {
  database,
  bucket,
  identity,
  isAdmin,
  requireAdmin,
  originCheck,
  json,
  body,
  ensureSeed,
  shopSettings,
  orderView,
  imageFile,
  HttpError,
} from "../../../lib/server";
import { categories } from "../../../lib/catalog";
export const dynamic = "force-dynamic";
const productSchema = z.object({
  expectedStock: z.number().int().min(0).optional(),
  id: z.string().max(80).optional(),
  name: z.string().trim().min(2).max(150),
  brand: z.string().trim().min(1).max(80),
  pet: z.enum(["dog", "cat", "exotic"]),
  category: z.enum(["อาหาร", "อาหารเสริม", "ยาและการป้องกัน", "ของใช้"]),
  price: z.number().finite().min(0).max(100000),
  originalPrice: z.number().finite().min(0).max(100000),
  size: z.string().trim().min(1).max(80),
  stock: z.number().int().min(0).max(100000),
  description: z.string().trim().min(5).max(5000),
  image: z
    .string()
    .max(2000)
    .refine(
      (s) =>
        !s || s.startsWith("/api/media/products/") || s.startsWith("https://"),
      "ลิงก์รูปต้องเป็น HTTPS",
    ),
  art: z.number().int().min(0).max(3),
  badge: z.string().max(60),
  active: z.union([z.literal(0), z.literal(1)]),
});
const orderSchema = z.object({
  quotedTotal: z.number().finite().nonnegative(),
  requestId: z.string().uuid(),
  items: z
    .array(
      z.object({
        id: z.string().max(80),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().regex(/^[0-9+\s-]{9,15}$/),
    address: z.string().trim().min(15).max(800),
    postal: z.string().regex(/^\d{5}$/),
    note: z.string().max(300).default(""),
    consent: z.literal("on"),
  }),
});
async function handle(req: Request) {
  try {
    const path = new URL(req.url).pathname.slice(5).split("/").filter(Boolean),
      method = req.method;
    if (method !== "GET") originCheck(req);
    const db = database();
    if (path[0] === "media" && method === "GET") {
      const key = path.slice(1).join("/");
      if (path[1] === "slips") {
        const u = await identity();
        const o = await db
          .prepare("SELECT userId FROM orders WHERE slip=?")
          .bind(key)
          .first<{ userId: string }>();
        if (!o || (o.userId !== u.userId && !(await isAdmin())))
          throw new HttpError(404, "ไม่พบไฟล์");
      } else if (path[1] !== "products") throw new HttpError(404, "ไม่พบไฟล์");
      const file = await bucket().get(key);
      if (!file) throw new HttpError(404, "ไม่พบไฟล์");
      return new Response(file.body as any, {
        headers: {
          "Content-Type": file.httpMetadata?.contentType || "image/jpeg",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control":
            path[1] === "slips" ? "private, no-store" : "public, max-age=86400",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      });
    }
    await ensureSeed();
    await db
      .prepare(
        "UPDATE orders SET status='cancelled' WHERE status='awaiting_payment' AND ((paymentDueAt IS NOT NULL AND paymentDueAt<?) OR (paymentDueAt IS NULL AND createdAt<?))",
      )
      .bind(
        new Date().toISOString(),
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .run();
    if (path[0] === "shop" && method === "GET") {
      const p = await db
        .prepare("SELECT * FROM products WHERE active=1 ORDER BY rowid")
        .all();
      return json({ products: p.results, settings: await shopSettings() });
    }
    if (path[0] === "orders") {
      const u = await identity();
      if (path.length === 1 && method === "GET") {
        const r = await db
          .prepare(
            "SELECT * FROM orders WHERE userId=? ORDER BY createdAt DESC LIMIT 100",
          )
          .bind(u.userId)
          .all();
        return json({ orders: r.results.map(orderView) });
      }
      if (path.length === 1 && method === "POST") {
        const d = orderSchema.parse(await body(req));
        const previous = await db
          .prepare("SELECT * FROM orders WHERE userId=? AND requestId=?")
          .bind(u.userId, d.requestId)
          .first();
        if (previous) return json({ order: orderView(previous) });
        const pending = await db
          .prepare(
            "SELECT COUNT(*) AS n FROM orders WHERE userId=? AND status IN ('awaiting_payment','reviewing')",
          )
          .bind(u.userId)
          .first<{ n: number }>();
        if ((pending?.n || 0) >= 10)
          throw new HttpError(
            429,
            "มีคำสั่งซื้อที่รอดำเนินการครบ 10 รายการ กรุณาชำระเงินหรือติดต่อร้านก่อนสั่งเพิ่ม",
          );
        if (new Set(d.items.map((i) => i.id)).size !== d.items.length)
          throw new HttpError(400, "รายการสินค้าซ้ำกัน");
        const settings = await shopSettings();
        if (
          !settings.demo &&
          (!settings.bankName || !settings.bankAccount || !settings.bankOwner)
        )
          throw new HttpError(
            409,
            "ร้านยังไม่ได้ตั้งค่าบัญชีรับเงิน กรุณาติดต่อร้าน",
          );
        const rows = await db
          .prepare(
            `SELECT * FROM products WHERE id IN (${d.items.map(() => "?").join(",")})`,
          )
          .bind(...d.items.map((i) => i.id))
          .all<any>();
        const items = d.items.map((i) => {
          const p = rows.results.find((p) => p.id === i.id);
          if (!p || !p.active || p.stock < i.quantity)
            throw new HttpError(
              409,
              "สินค้าบางรายการหมดหรือมีจำนวนไม่พอ กรุณาปรับตะกร้า",
            );
          return {
            id: p.id,
            name: p.name,
            price: p.price,
            quantity: i.quantity,
          };
        });
        const subtotal =
          Math.round(
            items.reduce((a, i) => a + i.price * i.quantity, 0) * 100,
          ) / 100;
        const shipping =
          subtotal >= settings.freeShipping ? 0 : settings.shipping;
        if (Math.abs(d.quotedTotal - (subtotal + shipping)) > 0.005)
          throw new HttpError(
            409,
            "ยอดสินค้า หรือค่าจัดส่งเปลี่ยนแปลง กรุณาโหลดหน้าร้านใหม่ก่อนสั่งซื้อ",
          );
        const id = crypto.randomUUID(),
          code = `PP-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 4).toUpperCase()}`;
        const statements = [
          db
            .prepare(
              "INSERT INTO orders (id,code,userId,customer,items,total,shipping,status,tracking,slip,bank,demo,createdAt,requestId,paymentDueAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              id,
              code,
              u.userId,
              JSON.stringify(d.customer),
              JSON.stringify(items),
              Math.round((subtotal + shipping) * 100) / 100,
              shipping,
              "awaiting_payment",
              "",
              "",
              JSON.stringify({
                bankName: settings.bankName,
                bankAccount: settings.bankAccount,
                bankOwner: settings.bankOwner,
              }),
              settings.demo ? 1 : 0,
              new Date().toISOString(),
              d.requestId,
              new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            ),
          ...items.map((i) =>
            db
              .prepare(
                "INSERT INTO order_lines (id,orderId,productId,quantity,price) VALUES (?,?,?,?,?)",
              )
              .bind(crypto.randomUUID(), id, i.id, i.quantity, i.price),
          ),
        ];
        try {
          await db.batch(statements);
        } catch (e) {
          const duplicate = await db
            .prepare("SELECT * FROM orders WHERE userId=? AND requestId=?")
            .bind(u.userId, d.requestId)
            .first();
          if (duplicate) return json({ order: orderView(duplicate) });
          if (String(e).includes("pending_limit"))
            throw new HttpError(
              429,
              "มีคำสั่งซื้อที่รอดำเนินการครบ 10 รายการ กรุณาติดต่อร้าน",
            );
          if (String(e).includes("inventory_changed"))
            throw new HttpError(
              409,
              "ราคา หรือสต็อกมีการเปลี่ยนแปลง กรุณาโหลดหน้าร้านใหม่",
            );
          throw e;
        }
        return json({ id, code }, 201);
      }
      if (path.length === 3 && path[2] === "slip" && method === "POST") {
        const o = await db
          .prepare("SELECT * FROM orders WHERE id=? AND userId=?")
          .bind(path[1], u.userId)
          .first<any>();
        if (!o) throw new HttpError(404, "ไม่พบคำสั่งซื้อ");
        if (!["awaiting_payment", "reviewing"].includes(o.status))
          throw new HttpError(409, "คำสั่งซื้อนี้ไม่รับสลิปเพิ่มเติมแล้ว");
        const { bytes, type } = await imageFile(req);
        const key = `slips/${o.id}/${crypto.randomUUID()}`;
        await bucket().put(key, bytes, { httpMetadata: { contentType: type } });
        const result = await db
          .prepare(
            "UPDATE orders SET slip=?,status='reviewing' WHERE id=? AND status IN ('awaiting_payment','reviewing') AND slip=?",
          )
          .bind(key, o.id, o.slip)
          .run();
        if (!result.meta.changes) {
          await bucket().delete(key);
          throw new HttpError(
            409,
            "สถานะเปลี่ยนไปแล้ว กรุณาโหลดคำสั่งซื้อใหม่",
          );
        }
        if (o.slip) await bucket().delete(o.slip);
        return json({ ok: true });
      }
    }
    if (path[0] === "chat") {
      const u = await identity();
      if (method === "GET") {
        const r = await db
          .prepare(
            "SELECT * FROM (SELECT id,sender,text,createdAt FROM messages WHERE userId=? ORDER BY createdAt DESC LIMIT 200) ORDER BY createdAt",
          )
          .bind(u.userId)
          .all();
        return json({ messages: r.results });
      }
      if (method === "POST") {
        const d = z
          .object({ text: z.string().trim().min(1).max(2000) })
          .parse(await body(req));
        const recent = await db
          .prepare(
            "SELECT COUNT(*) AS n FROM messages WHERE userId=? AND sender='customer' AND createdAt>?",
          )
          .bind(u.userId, new Date(Date.now() - 60000).toISOString())
          .first<{ n: number }>();
        if ((recent?.n || 0) >= 20)
          throw new HttpError(429, "ส่งข้อความถี่เกินไป กรุณารอสักครู่");
        await db
          .prepare(
            "INSERT INTO messages (id,userId,userName,sender,text,createdAt) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            u.userId,
            u.displayName,
            "customer",
            d.text,
            new Date().toISOString(),
          )
          .run();
        return json({ ok: true }, 201);
      }
    }
    if (path[0] === "admin") {
      await requireAdmin();
      if (path.length === 1 && method === "GET") {
        const [p, o, s, threads] = await Promise.all([
          db.prepare("SELECT * FROM products ORDER BY rowid").all(),
          db
            .prepare("SELECT * FROM orders ORDER BY createdAt DESC LIMIT 200")
            .all(),
          shopSettings(),
          db
            .prepare(
              "SELECT userId,MAX(userName) AS userName,MAX(createdAt) AS lastAt,COUNT(*) AS count FROM messages GROUP BY userId ORDER BY lastAt DESC LIMIT 100",
            )
            .all(),
        ]);
        return json({
          products: p.results,
          orders: o.results.map(orderView),
          settings: s,
          threads: threads.results,
        });
      }
      if (path[1] === "products" && method === "POST") {
        const p = productSchema.parse(await body(req));
        const id = p.id || crypto.randomUUID();
        const values = [
          p.name,
          p.brand,
          p.pet,
          p.category,
          Math.round(p.price * 100) / 100,
          Math.round(p.originalPrice * 100) / 100,
          p.size,
          p.stock,
          p.description,
          p.image,
          p.art,
          p.badge,
          p.active,
        ];
        if (p.id) {
          if (p.expectedStock === undefined)
            throw new HttpError(400, "กรุณาโหลดสินค้าใหม่ก่อนแก้ไข");
          const r = await db
            .prepare(
              "UPDATE products SET name=?,brand=?,pet=?,category=?,price=?,originalPrice=?,size=?,stock=?,description=?,image=?,art=?,badge=?,active=? WHERE id=? AND stock=?",
            )
            .bind(...values, id, p.expectedStock)
            .run();
          if (!r.meta.changes)
            throw new HttpError(
              409,
              "สต็อกเปลี่ยนแปลงระหว่างแก้ไข กรุณาปิดหน้าต่างและโหลดสินค้าใหม่ก่อนบันทึก",
            );
        } else {
          await db
            .prepare(
              "INSERT INTO products (name,brand,pet,category,price,originalPrice,size,stock,description,image,art,badge,active,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(...values, id)
            .run();
        }
        return json({ id });
      }
      if (path[1] === "products" && path[2] && method === "DELETE") {
        const result = await db
          .prepare("UPDATE products SET active=0 WHERE id=?")
          .bind(path[2])
          .run();
        if (!result.meta.changes) throw new HttpError(404, "ไม่พบสินค้า");
        return json({ ok: true });
      }
      if (path[1] === "upload" && method === "POST") {
        const { bytes, type } = await imageFile(req);
        const key = `products/${crypto.randomUUID()}`;
        await bucket().put(key, bytes, { httpMetadata: { contentType: type } });
        return json({ url: `/api/media/${key}` });
      }
      if (path[1] === "settings" && method === "POST") {
        const s = z
          .object({
            shopName: z.literal("PAWPAL"),
            bankName: z.string().max(100),
            bankAccount: z.string().max(40),
            bankOwner: z.string().max(150),
            shipping: z.number().finite().min(0).max(5000),
            freeShipping: z.number().finite().min(1).max(100000),
            demo: z.boolean(),
            returnPolicy: z.string().min(10).max(2000),
          })
          .parse(await body(req));
        if (
          !s.demo &&
          (!s.bankName.trim() ||
            !s.bankOwner.trim() ||
            !s.bankAccount.match(/^[0-9\s-]{8,30}$/))
        )
          throw new HttpError(
            400,
            "กรอกข้อมูลบัญชีรับเงินให้ครบก่อนเปิดรับคำสั่งซื้อจริง",
          );
        await db
          .prepare("UPDATE settings SET data=? WHERE id=?")
          .bind(JSON.stringify(s), "shop")
          .run();
        return json({ ok: true });
      }
      if (path[1] === "orders" && path[2] && method === "PATCH") {
        const d = z
          .object({
            expectedSlip: z.string().max(200),
            status: z.enum([
              "awaiting_payment",
              "paid",
              "packing",
              "shipped",
              "cancelled",
            ]),
            tracking: z.string().max(100).default(""),
          })
          .parse(await body(req));
        const o = await db
          .prepare("SELECT * FROM orders WHERE id=?")
          .bind(path[2])
          .first<any>();
        if (!o) throw new HttpError(404, "ไม่พบคำสั่งซื้อ");
        const allowed: Record<string, string[]> = {
          awaiting_payment: ["cancelled"],
          reviewing: ["paid", "awaiting_payment", "cancelled"],
          paid: ["packing", "cancelled"],
          packing: ["shipped", "cancelled"],
          shipped: [],
          cancelled: [],
        };
        if (!allowed[o.status]?.includes(d.status))
          throw new HttpError(409, "ไม่สามารถเปลี่ยนสถานะตามขั้นตอนนี้ได้");
        if (d.status === "shipped" && !d.tracking.trim())
          throw new HttpError(400, "กรอกเลขพัสดุก่อนยืนยันการจัดส่ง");
        const r = await db
          .prepare(
            "UPDATE orders SET status=?,tracking=?,paymentDueAt=CASE WHEN ?='awaiting_payment' THEN ? ELSE paymentDueAt END WHERE id=? AND status=? AND slip=?",
          )
          .bind(
            d.status,
            d.tracking,
            d.status,
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            o.id,
            o.status,
            d.expectedSlip,
          )
          .run();
        if (!r.meta.changes)
          throw new HttpError(409, "สถานะเปลี่ยนแล้ว กรุณาโหลดใหม่");
        return json({ ok: true });
      }
      if (path[1] === "chat" && path[2]) {
        if (method === "GET") {
          const r = await db
            .prepare(
              "SELECT * FROM (SELECT * FROM messages WHERE userId=? ORDER BY createdAt DESC LIMIT 200) ORDER BY createdAt",
            )
            .bind(path[2])
            .all();
          return json({ messages: r.results });
        }
        if (method === "POST") {
          const d = z
            .object({ text: z.string().trim().min(1).max(2000) })
            .parse(await body(req));
          const existing = await db
            .prepare(
              "SELECT userName FROM messages WHERE userId=? AND sender='customer' LIMIT 1",
            )
            .bind(path[2])
            .first<{ userName: string }>();
          if (!existing) throw new HttpError(404, "ไม่พบการสนทนา");
          await db
            .prepare(
              "INSERT INTO messages (id,userId,userName,sender,text,createdAt) VALUES (?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              path[2],
              existing.userName,
              "admin",
              d.text,
              new Date().toISOString(),
            )
            .run();
          return json({ ok: true }, 201);
        }
      }
    }
    throw new HttpError(404, "ไม่พบข้อมูลที่ต้องการ");
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        {
          error: "กรุณาตรวจสอบข้อมูลที่กรอก",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    console.error(
      "PAWPAL request failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json({ error: "ระบบไม่พร้อมชั่วคราว กรุณาลองใหม่อีกครั้ง" }, 503);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
