"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Package, PawPrint, Send, X, ArrowRight } from "lucide-react";
import {
  CartItem,
  Product,
  ShopSettings,
  money,
  statusLabels,
} from "../lib/catalog";
import { Modal } from "./ui";
export function Checkout({
  cart,
  products,
  settings,
  close,
  done,
}: {
  cart: CartItem[];
  products: Product[];
  settings: ShopSettings;
  close: () => void;
  done: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [auth, setAuth] = useState("checking");
  useEffect(() => {
    fetch("/api/orders")
      .then((r) => setAuth(r.status === 401 ? "signin" : "ready"))
      .catch(() => setAuth("ready"));
  }, []);
  const sub = cart.reduce(
    (a, i) =>
      a + (products.find((p) => p.id === i.id)?.price || 0) * i.quantity,
    0,
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const customer = Object.fromEntries(form);
    const signature = JSON.stringify({ cart, customer });
    let requestId = crypto.randomUUID();
    try {
      const prior = JSON.parse(
        sessionStorage.getItem("pawpal-checkout-id") || "null",
      );
      if (prior?.signature === signature) requestId = prior.id;
      sessionStorage.setItem(
        "pawpal-checkout-id",
        JSON.stringify({ signature, id: requestId }),
      );
    } catch {}
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customer,
          quotedTotal:
            sub + (sub >= settings.freeShipping ? 0 : settings.shipping),
          requestId,
        }),
      });
      const d: any = await res.json();
      if (!res.ok) throw Error(d.error || "สร้างคำสั่งซื้อไม่สำเร็จ");
      sessionStorage.removeItem("pawpal-checkout-id");
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (auth !== "ready")
    return (
      <Modal title="ส่งความสุขไปที่ไหนดี?" close={close}>
        <div className="empty-state">
          {auth === "checking" ? (
            <p>กำลังตรวจสอบบัญชี…</p>
          ) : (
            <>
              <Package size={40} />
              <h3>ลงชื่อเข้าใช้เพื่อเก็บคำสั่งซื้อ</h3>
              <p>
                ติดตามคำสั่งซื้อ แนบสลิป และคุยกับร้านได้ในบัญชีเดียว
                ตะกร้าของคุณยังอยู่ครบ
              </p>
              <a
                className="primary-button"
                href="/signin-with-chatgpt?return_to=/"
                target="_top"
              >
                ลงชื่อเข้าใช้ด้วย ChatGPT
              </a>
            </>
          )}
        </div>
      </Modal>
    );
  return (
    <Modal title="ส่งความสุขไปที่ไหนดี?" close={close}>
      <form className="form-stack" onSubmit={submit}>
        {settings.demo && (
          <div className="notice">
            โหมดทดลองร้านค้า — คำสั่งซื้อนี้เป็นการทดสอบ กรุณาอย่าโอนเงินจริง
          </div>
        )}
        <label>
          ชื่อผู้รับ
          <input
            name="name"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="ชื่อ–นามสกุล"
          />
        </label>
        <label>
          เบอร์โทรศัพท์
          <input
            name="phone"
            required
            type="tel"
            pattern="[0-9+\s-]{9,15}"
            autoComplete="tel"
            placeholder="08x xxx xxxx"
          />
        </label>
        <label>
          ที่อยู่จัดส่ง
          <textarea
            name="address"
            required
            minLength={15}
            maxLength={800}
            autoComplete="street-address"
            placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด"
            rows={3}
          />
        </label>
        <div className="form-row">
          <label>
            รหัสไปรษณีย์
            <input
              name="postal"
              required
              pattern="[0-9]{5}"
              maxLength={5}
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </label>
          <label>
            หมายเหตุ
            <input
              name="note"
              maxLength={300}
              placeholder="เช่น ฝากไว้ที่นิติบุคคล"
            />
          </label>
        </div>
        <div className="order-summary">
          <div>
            <span>สินค้า {cart.reduce((a, i) => a + i.quantity, 0)} ชิ้น</span>
            <b>{money(sub)}</b>
          </div>
          <div>
            <span>ค่าจัดส่ง</span>
            <b>
              {sub >= settings.freeShipping ? "ฟรี" : money(settings.shipping)}
            </b>
          </div>
          <div className="total">
            <span>ยอดรวม</span>
            <b>
              {money(
                sub + (sub >= settings.freeShipping ? 0 : settings.shipping),
              )}
            </b>
          </div>
        </div>
        <label className="check-label">
          <input name="consent" type="checkbox" required />
          ยอมรับการใช้ข้อมูลเพื่อจัดส่งสินค้าและติดต่อเกี่ยวกับคำสั่งซื้อ
        </label>
        {error && (
          <div className="error" role="alert">
            {error}
            {error.includes("ลงชื่อ") && (
              <a href="/signin-with-chatgpt?return_to=/" target="_top">
                ลงชื่อเข้าใช้
              </a>
            )}
          </div>
        )}
        <button className="primary-button full" disabled={busy}>
          {busy
            ? "กำลังสร้างคำสั่งซื้อ…"
            : settings.demo
              ? "สร้างคำสั่งซื้อทดสอบ"
              : "ยืนยันคำสั่งซื้อ"}
          <ArrowRight size={18} />
        </button>
        <p className="muted center">
          แนบสลิปภายใน 24 ชั่วโมงเพื่อรักษาสิทธิ์สินค้า
        </p>
      </form>
    </Modal>
  );
}
export function Orders({
  close,
  settings,
}: {
  close: () => void;
  settings: ShopSettings;
}) {
  const [orders, setOrders] = useState<any[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/orders");
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setOrders(d.orders);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);
  async function upload(id: string, file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("รูปสลิปต้องมีขนาดไม่เกิน 5 MB");
      return;
    }
    setBusy(id);
    try {
      const f = new FormData();
      f.append("file", file);
      const r = await fetch(`/api/orders/${id}/slip`, {
        method: "POST",
        body: f,
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Modal title="คำสั่งซื้อของฉัน" close={close}>
      {error && (
        <div className="error">
          {error}
          {error.includes("ลงชื่อ") && (
            <a href="/signin-with-chatgpt?return_to=/" target="_top">
              ลงชื่อเข้าใช้เพื่อดูคำสั่งซื้อ
            </a>
          )}
        </div>
      )}
      {loading ? (
        <p className="muted">กำลังโหลดคำสั่งซื้อ…</p>
      ) : !orders.length && !error ? (
        <div className="empty-state">
          <Package size={44} />
          <h3>ยังไม่มีคำสั่งซื้อ</h3>
          <p>เมื่อสั่งซื้อแล้ว คุณติดตามความสุขได้ที่นี่</p>
        </div>
      ) : (
        orders.map((o) => (
          <div className="order-card" key={o.id}>
            <div className="order-card-head">
              <b>#{o.code}</b>
              <span className={`status status-${o.status}`}>
                {statusLabels[o.status]}
              </span>
            </div>
            <small className="muted">
              {new Date(o.createdAt).toLocaleString("th-TH")}
              {o.demo ? " • คำสั่งซื้อทดลอง" : ""}
            </small>
            {o.items.map((i: any) => (
              <div className="order-line" key={i.id}>
                <span>
                  {i.name} × {i.quantity}
                </span>
                <b>{money(i.price * i.quantity)}</b>
              </div>
            ))}
            <div className="order-line total">
              <span>รวมค่าจัดส่ง</span>
              <b>{money(o.total)}</b>
            </div>
            {o.tracking && (
              <div className="notice">
                เลขพัสดุ: <strong>{o.tracking}</strong>
              </div>
            )}
            {["awaiting_payment", "reviewing"].includes(o.status) && (
              <>
                <p className="muted">
                  คำสั่งซื้อที่ยังไม่แนบสลิปภายใน 24 ชั่วโมงจะถูกยกเลิก
                </p>
                <div className="bank-info">
                  {o.demo ? (
                    <>
                      <b>คำสั่งซื้อทดลอง — ห้ามโอนเงินจริง</b>
                      <p>
                        ใช้ภาพตัวอย่างเพื่อทดสอบการแนบสลิปและตรวจสอบหลังบ้าน
                      </p>
                    </>
                  ) : (
                    <>
                      <b>{o.bank?.bankName || settings.bankName}</b>
                      <strong>
                        {o.bank?.bankAccount || settings.bankAccount}
                      </strong>
                      <p>ชื่อบัญชี {o.bank?.bankOwner || settings.bankOwner}</p>
                    </>
                  )}
                </div>
                <label className="upload-label">
                  {busy === o.id
                    ? "กำลังส่งสลิป…"
                    : o.status === "reviewing"
                      ? "แนบสลิปใหม่"
                      : "แนบสลิปการโอนเงิน"}
                  <input
                    aria-label={`แนบสลิป ${o.code}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy === o.id}
                    onChange={(e) => upload(o.id, e.target.files?.[0])}
                  />
                  <small>JPG, PNG หรือ WebP ไม่เกิน 5 MB</small>
                </label>
              </>
            )}
          </div>
        ))
      )}
    </Modal>
  );
}
export function Chat({ close }: { close: () => void }) {
  const [messages, setMessages] = useState<any[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  async function load() {
    try {
      const r = await fetch("/api/chat");
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessages(d.messages);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setText("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="chat-window" role="dialog" aria-label="แชตกับ PAWPAL">
      <div className="chat-heading">
        <span className="chat-avatar">
          <PawPrint />
        </span>
        <div>
          <b>เพื่อนช่วยช้อป PAWPAL</b>
          <small>ฝากข้อความไว้ ทีมงานจะตอบกลับที่นี่</small>
        </div>
        <button className="icon-button" onClick={close} aria-label="ปิดแชต">
          <X size={20} />
        </button>
      </div>
      <div className="chat-messages">
        <div className="chat-welcome">
          <PawPrint size={30} />
          <h3>ฮัลโหล เพื่อนใหม่!</h3>
          <p>
            มีอะไรให้ช่วยเลือกให้น้อง ๆ ไหม?
            <br />
            ส่งข้อความถึงทีมร้านได้เลย
          </p>
        </div>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.sender === "customer" ? "mine" : ""}`}
          >
            <small>{m.sender === "admin" ? "ทีม PAWPAL" : "คุณ"}</small>
            <p>{m.text}</p>
            <time>
              {new Date(m.createdAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        ))}
        {error && (
          <div className="error">
            {error}
            {error.includes("ลงชื่อ") && (
              <a href="/signin-with-chatgpt?return_to=/" target="_top">
                ลงชื่อเข้าใช้เพื่อเริ่มแชต
              </a>
            )}
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="chat-input" onSubmit={send}>
        <input
          aria-label="ข้อความถึงร้าน"
          placeholder="พิมพ์ข้อความของคุณ…"
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
        />
        <button aria-label="ส่งข้อความ" disabled={sending || !text.trim()}>
          <Send size={19} />
        </button>
      </form>
    </div>
  );
}
