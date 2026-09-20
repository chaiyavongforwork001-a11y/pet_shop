import {
  env,
  database as openDatabase,
  blobStore as openBlobStore,
} from "./runtime";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { defaultSettings, seedProducts, type ShopSettings } from "./catalog";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function database() {
  const db = openDatabase();
  if (!db) throw new HttpError(503, "ระบบข้อมูลยังไม่พร้อม กรุณาลองใหม่");
  return db;
}
export function bucket() {
  const store = openBlobStore();
  if (!store) throw new HttpError(503, "ระบบไฟล์ยังไม่พร้อม กรุณาลองใหม่");
  return store;
}
export async function identity() {
  const u = await getChatGPTUser();
  if (!u) throw new HttpError(401, "กรุณาลงชื่อเข้าใช้ก่อนดำเนินการ");
  return u;
}
export async function isAdmin() {
  const u = await getChatGPTUser();
  if (!u) return false;
  const configured = ((env as any).ADMIN_EMAIL || "")
    .split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(u.email.toLowerCase());
}
export async function requireAdmin() {
  const u = await identity();
  if (!(await isAdmin()))
    throw new HttpError(
      403,
      "บัญชีนี้ไม่มีสิทธิ์แอดมิน กรุณาใช้บัญชีที่เจ้าของร้านกำหนด",
    );
  return u;
}
export function originCheck(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new HttpError(403, "ไม่อนุญาตคำขอจากเว็บไซต์อื่น");
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 100000)
    throw new HttpError(413, "ข้อมูลมีขนาดใหญ่เกินไป");
  const raw = await req.text();
  if (raw.length > 100000) throw new HttpError(413, "ข้อมูลมีขนาดใหญ่เกินไป");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "ข้อมูลไม่ถูกต้อง");
  }
}
export async function ensureSeed() {
  const db = database();
  const done = await db
    .prepare("SELECT id FROM settings WHERE id=?")
    .bind("shop")
    .first();
  if (done) return;
  const statements = seedProducts.map((p) =>
    db
      .prepare(
        "INSERT OR IGNORE INTO products (id,name,brand,pet,category,price,originalPrice,size,stock,description,image,art,badge,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        p.id,
        p.name,
        p.brand,
        p.pet,
        p.category,
        p.price,
        p.originalPrice,
        p.size,
        p.stock,
        p.description,
        p.image,
        p.art,
        p.badge,
        p.active,
      ),
  );
  statements.push(
    db
      .prepare("INSERT OR IGNORE INTO settings (id,data) VALUES (?,?)")
      .bind("shop", JSON.stringify(defaultSettings)),
  );
  await db.batch(statements);
}
export async function shopSettings(): Promise<ShopSettings> {
  const row = await database()
    .prepare("SELECT data FROM settings WHERE id=?")
    .bind("shop")
    .first<{ data: string }>();
  return row
    ? { ...defaultSettings, ...JSON.parse(row.data) }
    : defaultSettings;
}
export function orderView(o: any) {
  return {
    ...o,
    customer: JSON.parse(o.customer),
    items: JSON.parse(o.items),
    bank: JSON.parse(o.bank),
    demo: !!o.demo,
  };
}
export function productView(p: any) {
  let images: string[] = [];
  try {
    const parsed = JSON.parse(p.images || "[]");
    if (Array.isArray(parsed))
      images = parsed.filter((x: unknown) => typeof x === "string").slice(0, 8);
  } catch {}
  return { ...p, images };
}
// Netlify Functions reject a request body of roughly 4.5 MB or more (the
// platform sees it base64-encoded). Staying under that ourselves is what turns
// an opaque platform failure into the app's own Thai-language error: 3 MB of
// image, plus room for the multipart envelope around it.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_REQUEST_BYTES = 4 * 1024 * 1024;

export async function imageFile(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > MAX_IMAGE_REQUEST_BYTES)
    throw new HttpError(413, "รูปต้องมีขนาดไม่เกิน 3 MB");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > MAX_IMAGE_BYTES)
    throw new HttpError(400, "เลือกรูป JPG, PNG หรือ WebP ไม่เกิน 3 MB");
  const bytes = await file.arrayBuffer();
  const b = new Uint8Array(bytes);
  let type = "";
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) type = "image/jpeg";
  else if (
    b[0] === 137 &&
    b[1] === 80 &&
    b[2] === 78 &&
    b[3] === 71 &&
    b[4] === 13 &&
    b[5] === 10 &&
    b[6] === 26 &&
    b[7] === 10
  )
    type = "image/png";
  else if (
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    type = "image/webp";
  if (!type || type !== file.type)
    throw new HttpError(400, "ไฟล์รูปไม่ถูกต้อง รองรับ JPG, PNG และ WebP");
  return { bytes, type };
}
