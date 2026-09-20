"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  PawPrint,
  Heart,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Copy,
  Share2,
  Check,
  Truck,
  ShieldCheck,
  MessageCircle,
  Star,
  ArrowUpRight,
  ImageOff,
  ShoppingBag,
} from "lucide-react";
import {
  type Product,
  type ShopSettings,
  money,
  pets,
  productImages,
} from "../lib/catalog";
import { Modal, ProductArt } from "./ui";
import { SwipeHint } from "./cute/flow-pdp";
import { PawLoader } from "./cute/flow-loader";
import { TreatIcon } from "./cute/core-faces";
import { burst } from "./cute/core-fx";

type Props = {
  product: Product;
  products: Product[];
  settings: ShopSettings;
  saved: boolean;
  inCart: number;
  purchasable: boolean;
  close: () => void;
  favorite: () => void;
  add: (quantity: number) => boolean;
  buy: (quantity: number) => void;
  chat: () => void;
  select: (p: Product) => void;
};
export default function ProductDetail({
  product: p,
  products,
  settings,
  saved,
  inCart,
  purchasable,
  close,
  favorite,
  add,
  buy,
  chat,
  select,
}: Props) {
  const images = productImages(p),
    [active, setActive] = useState(0),
    [zoom, setZoom] = useState(false),
    [quantity, setQuantity] = useState(1),
    [section, setSection] = useState("details"),
    [link, setLink] = useState(""),
    [notice, setNotice] = useState(""),
    [manualCopy, setManualCopy] = useState(false),
    [failed, setFailed] = useState<string[]>([]),
    [hint, setHint] = useState(false),
    [nativeShare, setNativeShare] = useState(false);
  const imageIndex = Math.min(active, images.length - 1),
    currentImage = images[imageIndex];
  const gesture = useRef({ x: 0, y: 0, swiped: false });
  const copyButton = useRef<HTMLButtonElement>(null);
  const hideHint = useCallback(() => setHint(false), []);
  const related = products
    .filter((i) => i.active && i.stock > 0 && i.id !== p.id)
    .sort(
      (a, b) =>
        Number(b.pet === p.pet) - Number(a.pet === p.pet) ||
        Number(b.category === p.category) - Number(a.category === p.category),
    )
    .slice(0, 3);
  useEffect(() => {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("product", p.id);
    url.hash = "";
    setLink(url.href);
    setNativeShare(typeof navigator.share === "function");
  }, [p.id]);
  useEffect(() => {
    if (images.length < 2 || !matchMedia("(pointer: coarse)").matches) return;
    let shown = false;
    try {
      shown = !!sessionStorage.getItem("pawpal-swipe-hint");
    } catch {}
    if (shown) return;
    const t = setTimeout(() => {
      setHint(true);
      try {
        sessionStorage.setItem("pawpal-swipe-hint", "1");
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [images.length]);
  const changeImage = (index: number) => {
    setActive((index + images.length) % images.length);
    setZoom(false);
  };
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setNotice("คัดลอกลิงก์ให้เพื่อนแล้ว ♡");
      setManualCopy(false);
      const box = copyButton.current?.getBoundingClientRect();
      if (box)
        burst({
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
          kinds: ["paw", "heart"],
          count: 6,
          spread: 120,
          size: 14,
        });
    } catch {
      setManualCopy(true);
      setNotice("เลือกลิงก์ด้านล่างเพื่อคัดลอก");
    }
  }
  async function share() {
    try {
      await navigator.share({
        title: p.name,
        text: `ของโปรดของเพื่อนซี้: ${p.name}`,
        url: link,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") copyLink();
    }
  }
  return (
    <Modal
      title="ของโปรดของเพื่อนซี้"
      close={close}
      wide
      className="product-sheet"
    >
      <div className="product-breadcrumb">
        <PawPrint size={15} />
        <span>PAWPAL</span>
        <ChevronRight size={13} />
        <span>{pets.find((t) => t.id === p.pet)?.name}</span>
        <ChevronRight size={13} />
        <span>{p.category}</span>
      </div>
      <div className="pdp-grid">
        <div className="pdp-gallery">
          <div
            className={`gallery-main product-bg-${p.art} ${zoom ? "zoomed" : ""}`}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                changeImage(imageIndex + 1);
              }
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                changeImage(imageIndex - 1);
              }
            }}
          >
            <button
              className="gallery-image"
              aria-label={zoom ? "ย่อภาพสินค้า" : "ซูมภาพสินค้า"}
              onPointerDown={(e) => {
                gesture.current = { x: e.clientX, y: e.clientY, swiped: false };
              }}
              onPointerUp={(e) => {
                const dx = e.clientX - gesture.current.x,
                  dy = e.clientY - gesture.current.y;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                  gesture.current.swiped = true;
                  setHint(false);
                  changeImage(active + (dx < 0 ? 1 : -1));
                }
              }}
              onClick={() => {
                if (!gesture.current.swiped) setZoom(!zoom);
                gesture.current.swiped = false;
              }}
            >
              {failed.includes(currentImage) ? (
                <span className="image-unavailable">
                  <ImageOff />
                  <span>รูปนี้ยังแสดงไม่ได้</span>
                </span>
              ) : (
                <img
                  key={currentImage}
                  src={currentImage}
                  alt={`${p.name} — ภาพที่ ${imageIndex + 1}`}
                  onError={() => setFailed((f) => [...f, currentImage])}
                  style={zoom ? { transform: "scale(1.7)" } : undefined}
                />
              )}
            </button>
            <span className="gallery-count">
              {imageIndex + 1} / {images.length}
            </span>
            <span className="gallery-zoom" aria-hidden="true">
              {zoom ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
            </span>
            {images.length > 1 && (
              <>
                <button
                  className="gallery-arrow prev"
                  aria-label="ภาพสินค้าก่อนหน้า"
                  onClick={() => changeImage(imageIndex - 1)}
                >
                  <ChevronLeft />
                </button>
                <button
                  className="gallery-arrow next"
                  aria-label="ภาพสินค้าถัดไป"
                  onClick={() => changeImage(imageIndex + 1)}
                >
                  <ChevronRight />
                </button>
              </>
            )}
            {hint && <SwipeHint onDone={hideHint} />}
          </div>
          <div className="gallery-thumbs" aria-label="เลือกรูปสินค้า">
            {images.map((src, i) => (
              <button
                key={src}
                aria-label={`ดูภาพสินค้า ${i + 1}`}
                aria-pressed={i === imageIndex}
                className={i === imageIndex ? "selected" : ""}
                onClick={() => changeImage(i)}
              >
                <img src={src} alt="" loading="lazy" />
                {i === imageIndex && (
                  <span>
                    <PawPrint size={12} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="share-row">
            <span>ส่งต่อของโปรด</span>
            <a
              href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link)}&text=${encodeURIComponent(p.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="แชร์สินค้าไป LINE"
            >
              LINE
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="แชร์สินค้าไป Facebook"
            >
              f
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(p.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="แชร์สินค้าไป X"
            >
              𝕏
            </a>
            <button
              ref={copyButton}
              aria-label="คัดลอกลิงก์สินค้า"
              onClick={copyLink}
            >
              <Copy size={17} />
            </button>
            {nativeShare && (
              <button aria-label="แชร์ผ่านแอปอื่น" onClick={share}>
                <Share2 size={17} />
              </button>
            )}
          </div>
          {manualCopy && (
            <input
              className="share-link-field"
              aria-label="ลิงก์สินค้า"
              value={link}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          )}
          {notice && (
            <p role="status" className="gallery-notice">
              {notice}
            </p>
          )}
        </div>
        <div className="pdp-info">
          <div className="pdp-brand">
            <span>{p.brand}</span>
            <button
              aria-label={saved ? "เลิกบันทึกสินค้านี้" : "บันทึกสินค้านี้"}
              aria-pressed={saved}
              onClick={favorite}
            >
              <Heart size={23} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
          <h2>{p.name}</h2>
          <div className="pdp-tags">
            <span>
              <PawPrint size={13} />
              {pets.find((t) => t.id === p.pet)?.name}
            </span>
            <span>{p.size}</span>
            {settings.demo && <span>สินค้าตัวอย่าง</span>}
          </div>
          <div className="pdp-price">
            <strong>{money(p.price)}</strong>
            {p.originalPrice > p.price && (
              <>
                <del>{money(p.originalPrice)}</del>
                <span>
                  ลด {Math.round((1 - p.price / p.originalPrice) * 100)}%
                </span>
              </>
            )}
          </div>
          <div className="pdp-benefits">
            <div>
              <Truck size={20} />
              <span>
                <b>ส่งของโปรดถึงหน้าบ้าน</b>
                <small>
                  ค่าจัดส่ง {money(settings.shipping)} · ฟรีเมื่อครบ{" "}
                  {money(settings.freeShipping)}
                </small>
              </span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <span>
                <b>ชำระด้วยการโอนเงินและแนบสลิป</b>
                <small>ติดตามสถานะและเลขพัสดุในคำสั่งซื้อของคุณ</small>
              </span>
            </div>
          </div>
          <div className="pdp-quantity">
            <span>จำนวน</span>
            <div className="quantity">
              <button
                aria-label="ลดจำนวนสินค้าที่เลือก"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => q - 1)}
              >
                <Minus size={17} />
              </button>
              <input
                aria-label="จำนวนสินค้าที่เลือก"
                type="number"
                min={1}
                max={Math.max(1, Math.min(99, p.stock))}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(
                      1,
                      Math.min(
                        99,
                        p.stock || 1,
                        Math.trunc(Number(e.target.value)) || 1,
                      ),
                    ),
                  )
                }
              />
              <button
                aria-label="เพิ่มจำนวนสินค้าที่เลือก"
                disabled={quantity >= Math.min(p.stock, 99)}
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus size={17} />
              </button>
            </div>
            <small>
              {p.stock ? `พร้อมส่ง ${p.stock} ชิ้น` : "สินค้าหมดชั่วคราว"}
            </small>
          </div>
          {inCart > 0 && (
            <p className="pdp-cart-note">มีในตะกร้าแล้ว {inCart} ชิ้น</p>
          )}
          <div className="pdp-actions">
            <button
              className="pet-action soft"
              disabled={
                !purchasable ||
                !p.stock ||
                quantity + inCart > Math.min(p.stock, 99)
              }
              onClick={() => {
                if (add(quantity))
                  setNotice(`เติมของโปรด ${quantity} ชิ้นลงตะกร้าแล้ว ♡`);
              }}
            >
              <PawPrint size={20} />
              <span>เพิ่มลงตะกร้า</span>
            </button>
            <button
              className="pet-action sunshine"
              disabled={!purchasable || !p.stock}
              onClick={() => buy(quantity)}
            >
              <ShoppingBag size={19} />
              <span>ซื้อให้เพื่อนเลย</span>
              <ArrowUpRight size={18} />
            </button>
          </div>
          {quantity + inCart > Math.min(p.stock, 99) && p.stock > 0 && (
            <p className="pdp-cart-note">
              จำนวนรวมในตะกร้าเกินสต็อก ลองลดจำนวนลงนะ
            </p>
          )}
          <button className="pdp-chat" onClick={chat}>
            <MessageCircle size={18} />
            ถามร้านเกี่ยวกับสินค้านี้
            <ArrowUpRight size={16} />
          </button>
          {settings.demo && (
            <p className="pdp-demo">
              <PawPrint size={14} />
              ร้านอยู่ในโหมดทดลอง ยังไม่รับเงินจริง
            </p>
          )}
        </div>
      </div>
      <div className="pdp-tabs" role="tablist" aria-label="ข้อมูลสินค้า">
        {[
          ["details", "รายละเอียดสินค้า"],
          ["shipping", "การจัดส่งและคืนสินค้า"],
          ["reviews", "เสียงจากเพื่อน ๆ"],
        ].map(([id, label]) => (
          <button
            role="tab"
            aria-selected={section === id}
            aria-controls={`panel-${id}`}
            id={`tab-${id}`}
            key={id}
            tabIndex={section === id ? 0 : -1}
            onKeyDown={(e) => {
              const ids = ["details", "shipping", "reviews"];
              const direction =
                e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 2
                    : direction
                      ? (ids.indexOf(id) + direction + ids.length) % ids.length
                      : -1;
              if (next < 0) return;
              e.preventDefault();
              setSection(ids[next]);
              document.getElementById(`tab-${ids[next]}`)?.focus();
            }}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="pdp-panel"
        id={`panel-${section}`}
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={`tab-${section}`}
      >
        {section === "details" ? (
          <>
            <h3>รู้จักของโปรดชิ้นนี้</h3>
            <dl>
              <div>
                <dt>แบรนด์</dt>
                <dd>{p.brand}</dd>
              </div>
              <div>
                <dt>เหมาะสำหรับ</dt>
                <dd>{pets.find((t) => t.id === p.pet)?.name}</dd>
              </div>
              <div>
                <dt>หมวดหมู่</dt>
                <dd>{p.category}</dd>
              </div>
              <div>
                <dt>ขนาดบรรจุ</dt>
                <dd>{p.size}</dd>
              </div>
            </dl>
            <p>{p.description}</p>
          </>
        ) : section === "shipping" ? (
          <>
            <h3>จากร้าน ถึงเพื่อนตัวเล็ก</h3>
            <p>
              ค่าจัดส่ง {money(settings.shipping)} ต่อคำสั่งซื้อ
              ส่งฟรีเมื่อยอดสินค้าครบ {money(settings.freeShipping)}{" "}
              หลังจัดส่งแล้ว ดูเลขพัสดุได้ที่ “คำสั่งซื้อของฉัน”
            </p>
            <h3>การคืนสินค้า</h3>
            <p>{settings.returnPolicy}</p>
            <h3>การยืนยันการชำระเงิน</h3>
            <p>
              สร้างคำสั่งซื้อ โอนเงินตามยอด และแนบสลิปภายใน 24 ชั่วโมง
              ร้านจะตรวจสอบก่อนจัดเตรียมสินค้า
            </p>
          </>
        ) : (
          <ProductReviews productId={p.id} />
        )}
      </div>
      {related.length > 0 && (
        <div className="pdp-related">
          <div>
            <PawPrint size={20} />
            <h3>เพื่อนซี้อาจจะชอบสิ่งนี้ด้วย</h3>
          </div>
          <div className="related-grid">
            {related.map((item) => (
              <button key={item.id} onClick={() => select(item)}>
                <span>
                  <ProductArt product={item} />
                </span>
                <b>{item.name}</b>
                <strong>{money(item.price)}</strong>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [rating, setRating] = useState(5),
    [nickname, setNickname] = useState(""),
    [comment, setComment] = useState(""),
    [success, setSuccess] = useState("");
  const submitButton = useRef<HTMLButtonElement>(null);
  async function load(signal?: AbortSignal) {
    const r = await fetch(
      `/api/products/${encodeURIComponent(productId)}/reviews`,
      { signal },
    );
    const d = (await r.json()) as any;
    if (!r.ok) throw Error(d.error);
    setData(d);
    if (d.mine) {
      setRating(d.mine.rating);
      setNickname(d.mine.nickname);
      setComment(d.mine.comment);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((e) => {
      if (e.name !== "AbortError") setError(e.message);
    });
    return () => controller.abort();
  }, [productId]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/products/${encodeURIComponent(productId)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, nickname, comment }),
        },
      );
      const d = (await r.json()) as any;
      if (!r.ok) throw Error(d.error);
      await load();
      setSuccess("ขอบคุณที่แบ่งปันเรื่องของเพื่อนซี้ ♡");
      const box = submitButton.current?.getBoundingClientRect();
      if (box)
        burst({
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
          kinds: ["heart", "star"],
          count: 7,
        });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="reviews">
      <div className="reviews-summary">
        <span>
          <Star size={26} fill="currentColor" />
          <b>
            {data?.summary?.count
              ? Number(data.summary.average).toFixed(1)
              : "—"}
          </b>
          <small>/ 5</small>
        </span>
        <div>
          <h3>เสียงจากเพื่อน ๆ</h3>
          <p>
            {data ? (
              `${data.summary.count} รีวิวจากคำสั่งซื้อที่จัดส่งแล้ว`
            ) : (
              <PawLoader size="sm" label="กำลังโหลดรีวิว…" />
            )}
            {data?.demo ? " · โหมดทดลอง" : ""}
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="notice">
          {success}
        </p>
      )}
      {data?.canReview ? (
        <form className="review-form form-stack" onSubmit={submit}>
          <h4>
            {data.mine
              ? "แก้ไขรีวิวของคุณ"
              : "เพื่อนซี้ชอบไหม? เล่าให้ฟังหน่อย"}
          </h4>
          <div
            className="rating-input"
            role="radiogroup"
            aria-label="คะแนนสินค้า"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                role="radio"
                key={n}
                aria-checked={rating === n}
                aria-label={`${n} ดาว`}
                onClick={() => setRating(n)}
              >
                <Star fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <label>
            ชื่อที่แสดงในรีวิว
            <input
              required
              minLength={2}
              maxLength={40}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ชื่อเล่นของคุณหรือเพื่อนซี้"
            />
          </label>
          <label>
            รีวิวของคุณ
            <textarea
              required
              minLength={10}
              maxLength={1500}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เล่าประสบการณ์ใช้งานของเพื่อนตัวเล็ก…"
            />
          </label>
          <button ref={submitButton} className="primary-button" disabled={busy}>
            {busy ? (
              <span className="cf-walk-paws" aria-hidden="true">
                <TreatIcon kind="paw" size={13} />
                <TreatIcon kind="paw" size={13} />
                <TreatIcon kind="paw" size={13} />
              </span>
            ) : (
              <PawPrint size={18} />
            )}
            {busy ? "กำลังบันทึก…" : "แบ่งปันรีวิว"}
          </button>
        </form>
      ) : (
        data && (
          <p className="review-guidance">
            {data.signedIn
              ? "เขียนรีวิวได้เมื่อคำสั่งซื้อสินค้านี้ถูกจัดส่งแล้ว"
              : "ลงชื่อเข้าใช้และซื้อสินค้านี้เพื่อเขียนรีวิวหลังจัดส่ง"}
          </p>
        )
      )}
      {data?.reviews.length === 0 && (
        <div className="review-empty">
          <PawPrint size={32} />
          <p>ยังไม่มีเสียงจากเพื่อน ๆ สำหรับสินค้านี้</p>
        </div>
      )}
      {data?.reviews.map((r: any) => (
        <article className="review-item" key={r.id}>
          <div className="review-avatar">
            <PawPrint size={20} />
          </div>
          <div>
            <b>{r.nickname}</b>
            <span className="review-verified">
              <Check size={12} />
              {r.demo ? "คำสั่งซื้อทดลอง" : "ตรวจสอบประวัติการซื้อแล้ว"}
            </span>
            <div className="review-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={13}
                  fill={n <= r.rating ? "currentColor" : "none"}
                />
              ))}
            </div>
            <p>{r.comment}</p>
            <time>
              {new Date(r.updatedAt).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          </div>
        </article>
      ))}
    </div>
  );
}
