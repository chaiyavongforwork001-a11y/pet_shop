"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  Package,
  PawPrint,
  Send,
  X,
  ArrowRight,
  ChevronDown,
  MessageCircle,
  Heart,
} from "lucide-react";
import {
  CartItem,
  Product,
  ShopSettings,
  money,
  statusLabels,
} from "../lib/catalog";
import { Modal } from "./ui";
import { PawLoader, SkeletonCards } from "./cute/flow-loader";
import {
  OrderParty,
  OrdersEmptyScene,
  clearParty,
  peekParty,
  stashParty,
} from "./cute/flow-party";
import { OrderTracker } from "./cute/flow-tracker";
import { PetFace, TreatIcon } from "./cute/core-faces";
import { burst, rain } from "./cute/core-fx";
import { emit } from "./cute/core-events";
import { motionAllowed } from "./cute/core-motion";
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
      const d = (await res.json()) as {
        error?: string;
        code?: string;
        order?: { code?: string };
      };
      if (!res.ok) throw Error(d.error || "สร้างคำสั่งซื้อไม่สำเร็จ");
      sessionStorage.removeItem("pawpal-checkout-id");
      const code = d.code ?? d.order?.code;
      stashParty(code);
      emit("pawpal:order-placed", { code });
      rain({ kinds: ["paw", "bone", "fish", "heart", "carrot"] });
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
            <PawLoader label="กำลังตรวจสอบบัญชี…" />
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
                href={
                  "/signin?return_to=" +
                  encodeURIComponent(
                    typeof window !== "undefined"
                      ? location.pathname + location.search
                      : "/",
                  )
                }
                target="_top"
              >
                ลงชื่อเข้าใช้ด้วย Google
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
              <a href="/signin?return_to=/" target="_top">
                ลงชื่อเข้าใช้
              </a>
            )}
          </div>
        )}
        <button className="primary-button full" disabled={busy}>
          {busy && (
            <span className="cf-walk-paws" aria-hidden="true">
              <TreatIcon kind="paw" size={14} />
              <TreatIcon kind="paw" size={14} />
              <TreatIcon kind="paw" size={14} />
            </span>
          )}
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
    [busy, setBusy] = useState(""),
    [uploaded, setUploaded] = useState(""),
    [party, setParty] = useState(() => peekParty());
  const slipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    return () => {
      clearInterval(id);
      if (slipTimer.current) clearTimeout(slipTimer.current);
      clearParty();
    };
  }, []);
  async function upload(id: string, file: File | undefined, from?: DOMRect) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("รูปสลิปต้องมีขนาดไม่เกิน 3 MB");
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
      setUploaded(id);
      if (slipTimer.current) clearTimeout(slipTimer.current);
      slipTimer.current = setTimeout(() => setUploaded(""), 3000);
      if (from)
        burst({
          x: from.left + from.width / 2,
          y: from.top + from.height / 2,
          kinds: ["paw", "heart"],
          count: 6,
          size: 14,
        });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Modal title="คำสั่งซื้อของฉัน" close={close}>
      {party && (
        <OrderParty
          code={party.code}
          onClose={() => {
            setParty(null);
            clearParty();
          }}
        />
      )}
      {error && (
        <div className="error">
          {error}
          {error.includes("ลงชื่อ") && (
            <a href="/signin?return_to=/" target="_top">
              ลงชื่อเข้าใช้เพื่อดูคำสั่งซื้อ
            </a>
          )}
        </div>
      )}
      {loading ? (
        <>
          <PawLoader label="กำลังโหลดคำสั่งซื้อ…" />
          <SkeletonCards />
        </>
      ) : !orders.length && !error ? (
        <div className="empty-state">
          <OrdersEmptyScene />
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
            <OrderTracker status={o.status} />
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
                  {busy === o.id ? (
                    <PawLoader size="sm" label="กำลังส่งสลิป…" />
                  ) : o.status === "reviewing" ? (
                    "แนบสลิปใหม่"
                  ) : (
                    "แนบสลิปการโอนเงิน"
                  )}
                  <input
                    aria-label={`แนบสลิป ${o.code}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy === o.id}
                    onChange={(e) =>
                      upload(
                        o.id,
                        e.target.files?.[0],
                        e.currentTarget
                          .closest(".upload-label")
                          ?.getBoundingClientRect(),
                      )
                    }
                  />
                  <small>JPG, PNG หรือ WebP ไม่เกิน 3 MB</small>
                </label>
                {uploaded === o.id && (
                  <span className="cf-slip-ok" role="status">
                    ส่งสลิปแล้ว ขอบคุณน้า ♡
                  </span>
                )}
              </>
            )}
          </div>
        ))
      )}
    </Modal>
  );
}
export function Chat({
  open,
  setOpen,
  initialMessage = "",
  consumeInitialMessage,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  initialMessage?: string;
  consumeInitialMessage: () => void;
}) {
  const [messages, setMessages] = useState<any[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [signedOut, setSignedOut] = useState(false),
    [loaded, setLoaded] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null),
    closeButton = useRef<HTMLButtonElement>(null),
    messageList = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true),
    currentRequest = useRef<AbortController | null>(null),
    seen = useRef<Set<string> | null>(null),
    isOpen = useRef(open);
  isOpen.current = open;
  function close() {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  }
  async function load(force = false) {
    if (!isOpen.current) return;
    if (currentRequest.current && !currentRequest.current.signal.aborted) {
      if (!force) return;
      currentRequest.current.abort();
    }
    const controller = new AbortController();
    currentRequest.current = controller;
    try {
      const r = await fetch("/api/chat", { signal: controller.signal });
      const d: any = await r.json();
      if (controller.signal.aborted) return;
      setSignedOut(r.status === 401);
      if (r.status === 401) {
        setError("");
        return;
      }
      if (!r.ok) throw Error(d.error);
      setMessages((previous) =>
        JSON.stringify(previous) === JSON.stringify(d.messages)
          ? previous
          : d.messages,
      );
      setError("");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoaded(true);
      if (currentRequest.current === controller) currentRequest.current = null;
    }
  }
  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(() => load(), 4000);
    const focusFrame = requestAnimationFrame(() => {
      if (!document.querySelector('[aria-modal="true"]'))
        closeButton.current?.focus({ preventScroll: true });
    });
    return () => {
      clearInterval(t);
      cancelAnimationFrame(focusFrame);
      currentRequest.current?.abort();
    };
  }, [open]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("pawpal-chat-resume") || "null",
      );
      sessionStorage.removeItem("pawpal-chat-resume");
      if (
        saved &&
        typeof saved.text === "string" &&
        Date.now() - saved.at < 900000
      ) {
        setText(saved.text.slice(0, 2000));
        setOpen(true);
      }
    } catch {}
  }, [setOpen]);
  function rememberDraft() {
    try {
      sessionStorage.setItem(
        "pawpal-chat-resume",
        JSON.stringify({ text, at: Date.now() }),
      );
    } catch {}
  }
  useEffect(() => {
    if (!initialMessage) return;
    setText((draft) =>
      !draft.trim()
        ? initialMessage
        : draft.includes(initialMessage)
          ? draft
          : `${draft}\n${initialMessage}`.slice(0, 2000),
    );
    consumeInitialMessage();
  }, [initialMessage, consumeInitialMessage]);
  useEffect(() => {
    const list = messageList.current;
    if (open && list && nearBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages, open]);
  useEffect(() => {
    const ids = messages.map((m) => String(m.id));
    const known = seen.current;
    if (!known) {
      seen.current = new Set(ids);
      return;
    }
    const replies = messages.filter(
      (m) => m.sender === "admin" && !known.has(String(m.id)),
    );
    for (const id of ids) known.add(id);
    if (!replies.length || !motionAllowed()) return;
    const avatar = document.querySelector<HTMLElement>(
      ".chat-dock .chat-avatar",
    );
    if (!avatar) return;
    const box = avatar.getBoundingClientRect();
    const wiggle = avatar.animate(
      [
        { rotate: "0deg" },
        { rotate: "-12deg" },
        { rotate: "10deg" },
        { rotate: "0deg" },
      ],
      { duration: 500, easing: "ease-in-out" },
    );
    burst({
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      kinds: ["heart"],
      count: 3,
      size: 12,
      distance: [18, 32],
    });
    return () => wiggle.cancel();
  }, [messages]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending || signedOut) return;
    const submitted = text;
    setSending(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: submitted }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setText((draft) => (draft === submitted ? "" : draft));
      nearBottom.current = true;
      await load(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <aside
      className={`chat-dock ${open ? "is-open" : ""}`}
      aria-label="ติดต่อทีม PAWPAL"
      onKeyDown={(e) => {
        if (
          open &&
          e.key === "Escape" &&
          !document.querySelector('[aria-modal="true"]')
        ) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="chat-reveal" aria-hidden={!open} inert={!open}>
        <div className="chat-clip">
          <div
            id="pawpal-chat"
            className="chat-window"
            role="dialog"
            aria-modal="false"
            aria-label="แชตกับ PAWPAL"
          >
            <div className="chat-heading">
              <span className="chat-avatar">
                <img src="/images/pet-dog.webp" alt="" />
                <span>
                  <PawPrint size={11} />
                </span>
              </span>
              <div>
                <b>เพื่อนช่วยช้อป PAWPAL</b>
                <small>ฝากข้อความไว้ให้ทีมร้านได้เลย</small>
              </div>
              <button
                ref={closeButton}
                className="icon-button"
                onClick={close}
                aria-label="ย่อแชต"
              >
                <ChevronDown size={20} />
              </button>
            </div>
            <div
              className="chat-messages"
              ref={messageList}
              onScroll={(e) => {
                const el = e.currentTarget;
                nearBottom.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 60;
              }}
            >
              {!messages.length && (
                <div className="chat-welcome">
                  <div className="chat-welcome-friends" aria-hidden="true">
                    <img src="/images/pet-cat.webp" alt="" />
                    <img src="/images/pet-dog.webp" alt="" />
                    <img src="/images/pet-exotic.webp" alt="" />
                    <Heart size={20} fill="currentColor" />
                  </div>
                  <h3>ฮัลโหล เพื่อนซี้!</h3>
                  <p>
                    เรื่องของน้อง ๆ ให้เราช่วยนะ
                    <br />
                    ส่งข้อความถึงทีมร้านได้เลย
                  </p>
                  <span className="chat-welcome-paws" aria-hidden="true">
                    <PawPrint size={15} />
                    <PawPrint size={15} />
                    <PawPrint size={15} />
                  </span>
                </div>
              )}
              {!loaded && (
                <p className="chat-loading">
                  <PawLoader size="sm" label="กำลังเปิดห้องแชต…" />
                </p>
              )}
              <div
                className="chat-log"
                role="log"
                aria-label="ข้อความสนทนา"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`bubble ${m.sender === "customer" ? "mine" : ""}`}
                  >
                    <small>
                      {m.sender === "admin" ? (
                        <>
                          <PetFace kind="dog" mood="happy" size={16} />
                          ทีม PAWPAL
                        </>
                      ) : (
                        "คุณ"
                      )}
                    </small>
                    <p>{m.text}</p>
                    <time>
                      {new Date(m.createdAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))}
                {sending && (
                  <div className="bubble mine cf-sending" aria-hidden="true">
                    <span className="cf-walk-paws">
                      <TreatIcon kind="paw" size={14} />
                      <TreatIcon kind="paw" size={14} />
                      <TreatIcon kind="paw" size={14} />
                    </span>
                  </div>
                )}
              </div>
              {signedOut && (
                <div className="chat-signin">
                  <PawPrint size={20} />
                  <p>
                    ลงชื่อเข้าใช้เพื่อคุยกับทีมร้าน
                    <br />
                    <small>เก็บบทสนทนาไว้ กลับมาคุยต่อได้</small>
                  </p>
                  <a
                    href="/signin?return_to=/"
                    target="_top"
                    onClick={rememberDraft}
                  >
                    ลงชื่อเข้าใช้ <ArrowRight size={16} />
                  </a>
                </div>
              )}
              {error && (
                <div className="error" role="status">
                  {error}
                  {error.includes("ลงชื่อ") && (
                    <a
                      href="/signin?return_to=/"
                      target="_top"
                      onClick={rememberDraft}
                    >
                      ลงชื่อเข้าใช้เพื่อเริ่มแชต
                    </a>
                  )}
                </div>
              )}
            </div>
            <form className="chat-input" onSubmit={send}>
              <textarea
                aria-label="ข้อความถึงร้าน"
                placeholder="ฝากข้อความถึงเพื่อนช่วยช้อป…"
                rows={1}
                value={text}
                maxLength={2000}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                aria-label={sending ? "กำลังส่งข้อความ" : "ส่งข้อความ"}
                disabled={sending || !text.trim() || signedOut}
              >
                <Send size={19} />
              </button>
            </form>
          </div>
        </div>
      </div>
      <button
        ref={launcher}
        className="chat-launcher"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "ย่อแชตกับ PAWPAL" : "แชตกับ PAWPAL"}
        aria-expanded={open}
        aria-controls="pawpal-chat"
      >
        <span className="chat-launcher-icon">
          {open ? <ChevronDown size={22} /> : <PawPrint size={23} />}
        </span>
        <span>{open ? "ไว้คุยกันต่อ ย่อแชตได้เลย" : "มีอะไรให้ช่วยไหม?"}</span>
        {!open && <MessageCircle className="chat-launcher-bubble" size={18} />}
      </button>
    </aside>
  );
}
