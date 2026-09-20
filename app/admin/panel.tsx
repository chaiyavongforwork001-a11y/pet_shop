"use client";
import { useState, useEffect, type FormEvent } from "react";
import {
  Package,
  ShoppingBag,
  MessageCircle,
  Settings,
  LayoutDashboard,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  Send,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
} from "lucide-react";
import { Brand, Modal, ProductArt } from "../ui";
import {
  Product,
  ShopSettings,
  defaultSettings,
  money,
  pets,
  categories,
  statusLabels,
  productImages,
} from "../../lib/catalog";
type Dashboard = {
  products: Product[];
  orders: any[];
  settings: ShopSettings;
  threads: any[];
};
async function api(url: string, method = "GET", data?: unknown) {
  const r = await fetch(url, {
    method,
    ...(data
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {}),
  });
  const d: any = await r.json();
  if (!r.ok) throw Error(d.error || "ดำเนินการไม่สำเร็จ");
  return d;
}
export default function Admin({ name }: { name: string }) {
  const [tab, setTab] = useState("overview"),
    [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [editing, setEditing] = useState<Product | null>(null),
    [removing, setRemoving] = useState<Product | null>(null),
    [order, setOrder] = useState<any>(null),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await api("/api/admin"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (tab === "orders" || tab === "overview" || tab === "chat") {
      const t = setInterval(load, 10000);
      return () => clearInterval(t);
    }
  }, [tab]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  async function saveProduct(p: Product) {
    await api("/api/admin/products", "POST", { ...p, id: p.id || undefined });
    setEditing(null);
    await load();
    setToast("บันทึกสินค้าเรียบร้อยแล้ว");
  }
  const tabs = [
    ["overview", "ภาพรวมร้าน", LayoutDashboard],
    ["products", "สินค้า", Package],
    ["orders", "คำสั่งซื้อ", ShoppingBag],
    ["chat", "แชตลูกค้า", MessageCircle],
    ["settings", "ตั้งค่าร้าน", Settings],
  ] as const;
  const newProduct: Product = {
    id: "",
    name: "",
    brand: "PAWPAL",
    pet: "dog",
    category: "อาหาร",
    price: 0,
    originalPrice: 0,
    size: "",
    stock: 0,
    description: "",
    image: "",
    art: 0,
    badge: "",
    active: 1,
  };
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Brand />
        <span className="admin-label">SHOP MANAGER</span>
        <nav>
          {tabs.map(([id, title, Icon]) => (
            <button
              key={id}
              className={tab === id ? "selected" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={19} />
              {title}
              {id === "orders" &&
                !!data?.orders.filter((o) => o.status === "reviewing")
                  .length && (
                  <b>
                    {data.orders.filter((o) => o.status === "reviewing").length}
                  </b>
                )}
            </button>
          ))}
        </nav>
        <a className="back-shop" href="/">
          <ArrowUpRight size={18} /> ไปหน้าร้าน
        </a>
        <small className="admin-user">{name}</small>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <div>
            <span className="kicker">A HAPPY STORE FOR HAPPY PETS</span>
            <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
          </div>
          <a href="/" className="secondary-button">
            ดูหน้าร้าน <ArrowUpRight size={16} />
          </a>
        </header>
        {error && (
          <div className="error">
            {error} <button onClick={load}>ลองใหม่</button>
          </div>
        )}
        {data?.settings.demo && (
          <div className="notice admin-demo">
            <AlertCircle size={18} />
            <div>
              <b>ร้านอยู่ในโหมดทดลอง</b>
              <p>
                ข้อมูลสินค้าตัวอย่างและคำสั่งซื้อใช้สำหรับทดสอบ
                ยังไม่รับชำระเงินจริง ตั้งค่าบัญชีและเพิ่มสินค้าจริงก่อนเปิดร้าน
              </p>
            </div>
          </div>
        )}
        {!data ? (
          <div className="empty-state">กำลังโหลดข้อมูลร้าน…</div>
        ) : (
          <>
            {tab === "overview" && (
              <>
                <div className="stats-grid">
                  <div>
                    <span>ยอดชำระเงินจริง</span>
                    <strong>
                      {money(
                        data.orders
                          .filter(
                            (o) =>
                              !o.demo &&
                              ["paid", "packing", "shipped"].includes(o.status),
                          )
                          .reduce((s, o) => s + o.total, 0),
                      )}
                    </strong>
                    <small>จากคำสั่งซื้อที่โหลดล่าสุด</small>
                  </div>
                  <div>
                    <span>รอตรวจสอบสลิป</span>
                    <strong>
                      {
                        data.orders.filter((o) => o.status === "reviewing")
                          .length
                      }
                    </strong>
                    <small>ตรวจสอบก่อนยืนยันรับเงิน</small>
                  </div>
                  <div>
                    <span>สินค้าที่เปิดขาย</span>
                    <strong>
                      {data.products.filter((p) => p.active).length}
                    </strong>
                    <small>
                      {
                        data.products.filter((p) => p.active && p.stock < 5)
                          .length
                      }{" "}
                      รายการใกล้หมด
                    </small>
                  </div>
                  <div>
                    <span>บทสนทนาลูกค้า</span>
                    <strong>{data.threads.length}</strong>
                    <small>ข้อความรอให้คุณดูแล</small>
                  </div>
                </div>
                <div className="admin-card">
                  <div className="admin-card-head">
                    <h2>คำสั่งซื้อล่าสุด</h2>
                    <button
                      className="text-button"
                      onClick={() => setTab("orders")}
                    >
                      ดูทั้งหมด <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <OrderTable
                    orders={data.orders.slice(0, 8)}
                    select={setOrder}
                  />
                </div>
              </>
            )}
            {tab === "products" && (
              <div className="admin-card">
                <div className="admin-card-head">
                  <label className="search-field">
                    <Search size={18} />
                    <input
                      placeholder="ค้นหาสินค้า…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <button
                    className="primary-button"
                    onClick={() => setEditing(newProduct)}
                  >
                    <Plus size={18} /> เพิ่มสินค้า
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>สินค้า</th>
                        <th>หมวดหมู่</th>
                        <th>ราคา</th>
                        <th>คงเหลือ</th>
                        <th>สถานะ</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products
                        .filter((p) =>
                          p.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="table-product">
                                <span>
                                  <ProductArt product={p} />
                                </span>
                                <div>
                                  <b>{p.name}</b>
                                  <small>
                                    {p.size} •{" "}
                                    {pets.find((t) => t.id === p.pet)?.name}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>{p.category}</td>
                            <td>{money(p.price)}</td>
                            <td>
                              <span className={p.stock < 5 ? "low-stock" : ""}>
                                {p.stock}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status ${p.active ? "status-paid" : "status-cancelled"}`}
                              >
                                {p.active ? "เปิดขาย" : "ซ่อนแล้ว"}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  aria-label={`แก้ไข ${p.name}`}
                                  onClick={() => setEditing(p)}
                                >
                                  <Pencil size={17} />
                                </button>
                                {!!p.active && (
                                  <button
                                    aria-label={`ลบ ${p.name}`}
                                    onClick={() => setRemoving(p)}
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab === "orders" && (
              <div className="admin-card">
                <div className="admin-card-head">
                  <h2>คำสั่งซื้อทั้งหมด</h2>
                  <span className="muted">อัปเดตอัตโนมัติทุก 10 วินาที</span>
                </div>
                <OrderTable orders={data.orders} select={setOrder} />
              </div>
            )}
            {tab === "chat" && <AdminChat threads={data.threads} />}
            {tab === "settings" && (
              <SettingsForm
                initial={data.settings}
                saved={async () => {
                  await load();
                  setToast("บันทึกการตั้งค่าแล้ว");
                }}
              />
            )}
          </>
        )}
        {editing && (
          <ProductForm
            initial={editing}
            close={() => setEditing(null)}
            save={saveProduct}
          />
        )}{" "}
        {removing && (
          <Modal title="ลบสินค้าออกจากหน้าร้าน" close={() => setRemoving(null)}>
            <p>
              ต้องการซ่อน “{removing.name}” ใช่ไหม? ประวัติคำสั่งซื้อจะยังอยู่
              และเปิดขายใหม่ได้ในหน้าแก้ไขสินค้า
            </p>
            <div className="action-row">
              <button
                className="secondary-button"
                onClick={() => setRemoving(null)}
              >
                กลับ
              </button>
              <button
                className="danger-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`/api/admin/products/${removing.id}`, "DELETE");
                    setRemoving(null);
                    await load();
                    setToast("ซ่อนสินค้าแล้ว");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                ยืนยันซ่อนสินค้า
              </button>
            </div>
          </Modal>
        )}
        {order && (
          <AdminOrder
            order={order}
            close={() => setOrder(null)}
            saved={async () => {
              setOrder(null);
              await load();
              setToast("อัปเดตคำสั่งซื้อแล้ว");
            }}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={18} />
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
function OrderTable({
  orders,
  select,
}: {
  orders: any[];
  select: (o: any) => void;
}) {
  return !orders.length ? (
    <div className="empty-state">
      <ShoppingBag size={37} />
      <h3>ยังไม่มีคำสั่งซื้อ</h3>
      <p>คำสั่งซื้อใหม่จะแสดงที่นี่</p>
    </div>
  ) : (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>คำสั่งซื้อ</th>
            <th>ลูกค้า</th>
            <th>ยอดรวม</th>
            <th>สถานะ</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <b>#{o.code}</b>
                <small>
                  {new Date(o.createdAt).toLocaleDateString("th-TH")}
                  {o.demo ? " • ทดลอง" : ""}
                </small>
              </td>
              <td>{o.customer.name}</td>
              <td>{money(o.total)}</td>
              <td>
                <span className={`status status-${o.status}`}>
                  {statusLabels[o.status]}
                </span>
              </td>
              <td>
                <button className="text-button" onClick={() => select(o)}>
                  <Eye size={16} /> ดูรายละเอียด
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ProductForm({
  initial,
  close,
  save,
}: {
  initial: Product;
  close: () => void;
  save: (p: Product) => Promise<void>;
}) {
  const [p, setP] = useState({
      ...initial,
      images: initial.id ? productImages(initial) : [],
      expectedStock: initial.stock,
    }),
    [error, setError] = useState(""),
    [imageLink, setImageLink] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (k: keyof Product, v: any) => setP((s) => ({ ...s, [k]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function updateImages(images: string[]) {
    setP((s) => ({ ...s, images, image: images[0] || "" }));
  }
  function moveImage(index: number, direction: number) {
    const images = [...p.images];
    [images[index], images[index + direction]] = [
      images[index + direction],
      images[index],
    ];
    updateImages(images);
  }
  async function upload(files: File[]) {
    if (!files.length) return;
    if (p.images.length + files.length > 8) {
      setError("เพิ่มได้สูงสุด 8 ภาพต่อสินค้า");
      return;
    }
    setBusy(true);
    setError("");
    const uploaded = [...p.images];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const r = await fetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        uploaded.push(d.url);
        updateImages([...uploaded]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={p.id ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"} close={close} wide>
      <form onSubmit={submit} className="form-stack">
        <div className="product-edit-grid">
          <fieldset className="gallery-editor" disabled={busy}>
            <legend>
              อัลบั้มของเพื่อนซี้ <span>{p.images.length}/8 ภาพ</span>
            </legend>
            <p>รูปแรกเป็นภาพปก ใช้ปุ่มลูกศรเพื่อจัดลำดับ</p>
            <div className="admin-gallery-grid">
              {p.images.map((src, i) => (
                <div className="admin-gallery-item" key={src}>
                  <img src={src} alt={"ภาพสินค้า " + (i + 1)} />
                  <span>{i === 0 ? "ภาพปก" : i + 1}</span>
                  <div>
                    <button
                      type="button"
                      disabled={i === 0}
                      aria-label={"เลื่อนภาพ " + (i + 1) + " ไปก่อนหน้า"}
                      onClick={() => moveImage(i, -1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={i === p.images.length - 1}
                      aria-label={"เลื่อนภาพ " + (i + 1) + " ไปถัดไป"}
                      onClick={() => moveImage(i, 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={"ลบภาพ " + (i + 1)}
                      onClick={() =>
                        updateImages(p.images.filter((_, n) => n !== i))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <label className="upload-label">
              <span>
                <ImagePlus size={18} /> เพิ่มรูปให้เพื่อน ๆ ดู
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  upload(files);
                }}
              />
              <small>เลือกได้หลายรูป • JPG, PNG, WebP ไม่เกิน 3 MB/รูป</small>
            </label>
            <label>
              หรือเพิ่มด้วยลิงก์ภาพ HTTPS
              <input
                value={imageLink}
                onChange={(e) => setImageLink(e.target.value)}
                placeholder="https://…"
              />
            </label>
            <button
              type="button"
              className="secondary-button"
              disabled={!imageLink.trim() || p.images.length >= 8}
              onClick={() => {
                try {
                  const url = new URL(imageLink.trim());
                  if (url.protocol !== "https:") throw Error();
                  if (!p.images.includes(url.href))
                    updateImages([...p.images, url.href]);
                  setImageLink("");
                  setError("");
                } catch {
                  setError("กรุณาใส่ลิงก์ HTTPS ที่ถูกต้อง");
                }
              }}
            >
              <Plus size={16} /> เพิ่มภาพจากลิงก์
            </button>
          </fieldset>
          <div className="form-stack">
            <label>
              ชื่อสินค้า
              <input
                required
                value={p.name}
                maxLength={150}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
            <label>
              แบรนด์
              <input
                required
                value={p.brand}
                onChange={(e) => change("brand", e.target.value)}
              />
            </label>
            <div className="form-row">
              <label>
                สัตว์เลี้ยง
                <select
                  value={p.pet}
                  onChange={(e) => change("pet", e.target.value)}
                >
                  {pets.slice(1).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                หมวดหมู่
                <select
                  value={p.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {categories.slice(1).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                ราคาขาย (บาท)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={p.price}
                  onChange={(e) => change("price", Number(e.target.value))}
                />
              </label>
              <label>
                ราคาเดิม (0 = ไม่แสดง)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.originalPrice}
                  onChange={(e) =>
                    change("originalPrice", Number(e.target.value))
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                ขนาดบรรจุ
                <input
                  required
                  value={p.size}
                  onChange={(e) => change("size", e.target.value)}
                />
              </label>
              <label>
                จำนวนคงเหลือ
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={p.stock}
                  onChange={(e) => change("stock", Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        </div>
        <label>
          รายละเอียดสินค้า / ข้อมูลฉลาก
          <textarea
            rows={4}
            required
            minLength={5}
            maxLength={5000}
            value={p.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            ป้ายบนสินค้า
            <input
              value={p.badge}
              maxLength={60}
              onChange={(e) => change("badge", e.target.value)}
            />
          </label>
          <label>
            สถานะ
            <select
              value={p.active}
              onChange={(e) => change("active", Number(e.target.value))}
            >
              <option value={1}>เปิดขาย</option>
              <option value={0}>ซ่อนสินค้า</option>
            </select>
          </label>
        </div>
        {error && <div className="error">{error}</div>}
        <button disabled={busy} className="primary-button">
          {busy ? "กำลังบันทึก…" : "บันทึกสินค้า"}
          <Check size={18} />
        </button>
      </form>
    </Modal>
  );
}
function AdminOrder({
  order: o,
  close,
  saved,
}: {
  order: any;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(""),
    [tracking, setTracking] = useState(o.tracking || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const options: Record<string, string[]> = {
    awaiting_payment: ["cancelled"],
    reviewing: ["paid", "awaiting_payment", "cancelled"],
    paid: ["packing", "cancelled"],
    packing: ["shipped", "cancelled"],
    shipped: [],
    cancelled: [],
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/admin/orders/${o.id}`, "PATCH", {
        status,
        tracking,
        expectedSlip: o.slip,
      });
      await saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`คำสั่งซื้อ #${o.code}`} close={close} wide>
      <div className="admin-order-grid">
        <div>
          <span className={`status status-${o.status}`}>
            {statusLabels[o.status]}
          </span>
          {o.demo && <p className="notice">คำสั่งซื้อทดลอง — ไม่รับเงินจริง</p>}
          <h3>ข้อมูลจัดส่ง</h3>
          <p>
            {o.customer.name}
            <br />
            {o.customer.phone}
            <br />
            {o.customer.address} {o.customer.postal}
          </p>
          {o.customer.note && <p>หมายเหตุ: {o.customer.note}</p>}
          <h3>รายการสินค้า</h3>
          {o.items.map((i: any) => (
            <div className="order-line" key={i.id}>
              <span>
                {i.name} × {i.quantity}
              </span>
              <b>{money(i.price * i.quantity)}</b>
            </div>
          ))}
          <div className="order-line">
            <span>ค่าจัดส่ง</span>
            <b>{money(o.shipping)}</b>
          </div>
          <div className="order-line total">
            <span>รวม</span>
            <b>{money(o.total)}</b>
          </div>
        </div>
        <div>
          <h3>หลักฐานการโอน</h3>
          {o.slip ? (
            <a href={`/api/media/${o.slip}`} target="_blank" rel="noreferrer">
              <img
                className="slip-preview"
                src={`/api/media/${o.slip}`}
                alt="สลิปการโอนเงิน"
              />
              <small className="muted">เปิดรูปเต็มเพื่อตรวจสอบ</small>
            </a>
          ) : (
            <div className="empty-state">ยังไม่มีสลิป</div>
          )}
          <form className="form-stack" onSubmit={submit}>
            {options[o.status]?.length > 0 && (
              <>
                <label>
                  ดำเนินการ
                  <select
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">เลือกการดำเนินการ</option>
                    {options[o.status].map((s) => (
                      <option key={s} value={s}>
                        {s === "paid"
                          ? "ตรวจสอบยอดเข้าบัญชีแล้ว — ยืนยันชำระ"
                          : s === "awaiting_payment"
                            ? "สลิปไม่ถูกต้อง — ขอให้แนบใหม่"
                            : statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </label>
                {status === "shipped" && (
                  <label>
                    เลขติดตามพัสดุ
                    <input
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </label>
                )}
                {status === "cancelled" && (
                  <div className="notice">
                    การยกเลิกจะคืนสต็อก หากได้รับเงินแล้ว
                    ร้านต้องดำเนินการคืนเงินให้ลูกค้าแยกต่างหาก
                  </div>
                )}
                {error && <div className="error">{error}</div>}
                <button className="primary-button" disabled={busy || !status}>
                  {busy ? "กำลังบันทึก…" : "ยืนยันการเปลี่ยนสถานะ"}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </Modal>
  );
}
function SettingsForm({
  initial,
  saved,
}: {
  initial: ShopSettings;
  saved: () => Promise<void>;
}) {
  const [s, setS] = useState({ ...initial }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const field = (k: keyof ShopSettings, v: any) =>
    setS((p) => ({ ...p, [k]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/settings", "POST", s);
      await saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-card settings-card">
      <h2>รับเงินและจัดส่ง</h2>
      <p className="muted">
        ข้อมูลบัญชีจะแสดงให้ลูกค้าในคำสั่งซื้อใหม่เท่านั้น
      </p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          ชื่อธนาคาร
          <input
            value={s.bankName}
            onChange={(e) => field("bankName", e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            เลขบัญชี
            <input
              value={s.bankAccount}
              onChange={(e) => field("bankAccount", e.target.value)}
            />
          </label>
          <label>
            ชื่อบัญชี
            <input
              value={s.bankOwner}
              onChange={(e) => field("bankOwner", e.target.value)}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            ค่าจัดส่ง (บาท)
            <input
              type="number"
              min="0"
              required
              value={s.shipping}
              onChange={(e) => field("shipping", Number(e.target.value))}
            />
          </label>
          <label>
            ส่งฟรีเมื่อครบ (บาท)
            <input
              type="number"
              min="1"
              required
              value={s.freeShipping}
              onChange={(e) => field("freeShipping", Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          เงื่อนไขคืนสินค้า
          <textarea
            rows={4}
            required
            value={s.returnPolicy}
            onChange={(e) => field("returnPolicy", e.target.value)}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={s.demo}
            onChange={(e) => field("demo", e.target.checked)}
          />
          โหมดทดลอง (คำสั่งซื้อจะระบุว่าเป็นการทดสอบ และไม่แสดงบัญชีรับเงิน)
        </label>
        {!s.demo && (
          <div className="notice">
            เมื่อลูกค้าสั่งซื้อใหม่ ระบบจะแสดงบัญชีรับเงินจริง
            กรุณาตรวจข้อมูลบัญชีและเปลี่ยนสินค้าตัวอย่างให้เป็นสินค้าจริงก่อนบันทึก
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <button className="primary-button" disabled={busy}>
          {busy ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
          <Check size={18} />
        </button>
      </form>
    </div>
  );
}
function AdminChat({ threads }: { threads: any[] }) {
  const [user, setUser] = useState(""),
    [messages, setMessages] = useState<any[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load(id = user) {
    if (!id) return;
    try {
      const r = await api(`/api/admin/chat/${id}`);
      setMessages(r.messages);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    setMessages([]);
    load();
    if (user) {
      const t = setInterval(() => load(), 4000);
      return () => clearInterval(t);
    }
  }, [user]);
  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/admin/chat/${user}`, "POST", { text });
      setText("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-card admin-chat">
      <aside>
        {threads.length ? (
          threads.map((t) => (
            <button
              key={t.userId}
              className={user === t.userId ? "selected" : ""}
              onClick={() => setUser(t.userId)}
            >
              <MessageCircle size={19} />
              <span>
                <b>{t.userName}</b>
                <small>{new Date(t.lastAt).toLocaleString("th-TH")}</small>
              </span>
            </button>
          ))
        ) : (
          <p className="muted">ยังไม่มีข้อความจากลูกค้า</p>
        )}
      </aside>
      <div className="admin-conversation">
        {user ? (
          <>
            <div className="admin-messages">
              {messages.map((m) => (
                <div
                  className={`bubble ${m.sender === "admin" ? "mine" : ""}`}
                  key={m.id}
                >
                  <small>
                    {m.sender === "admin" ? "ทีม PAWPAL" : "ลูกค้า"}
                  </small>
                  <p>{m.text}</p>
                  <time>
                    {new Date(m.createdAt).toLocaleTimeString("th-TH")}
                  </time>
                </div>
              ))}
            </div>
            {error && <div className="error">{error}</div>}
            <form className="chat-input" onSubmit={send}>
              <input
                value={text}
                aria-label="ตอบลูกค้า"
                maxLength={2000}
                placeholder="พิมพ์ตอบลูกค้า…"
                onChange={(e) => setText(e.target.value)}
              />
              <button
                disabled={busy || !text.trim()}
                aria-label="ส่งข้อความตอบ"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <MessageCircle size={40} />
            <h3>เพื่อนช่วยดูแลเพื่อน</h3>
            <p>เลือกบทสนทนาเพื่อตอบลูกค้า</p>
          </div>
        )}
      </div>
    </div>
  );
}
