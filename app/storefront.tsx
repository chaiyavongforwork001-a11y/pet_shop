"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  PawPrint,
  Search,
  ShoppingBag,
  Heart,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  X,
  Menu,
  Sparkles,
  Truck,
  ShieldCheck,
  MessageCircle,
  ChevronDown,
  UserRound,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import {
  Product,
  CartItem,
  seedProducts,
  money,
  pets,
  categories,
  defaultSettings,
  ShopSettings,
} from "../lib/catalog";
import { Brand, Modal, ProductArt } from "./ui";
import { Checkout, Orders, Chat } from "./shopping";
import { WorldHero, MotionLayer } from "./experience";
import ProductDetail from "./product-detail";
import { PetFooter } from "./footer";
import { PetMotion } from "./pet-motion";
import { motionAllowed } from "./cute/core-motion";
import { CorePawSteps } from "./cute/core-pawsteps";
import { emit, faceKindOf } from "./cute/core-events";
import { PetFace } from "./cute/core-faces";
import { ShopDelight } from "./cute/shop-delight";
import { EmptyScene } from "./cute/shop-empty";
import { ShopFreeShip } from "./cute/shop-freeship";
import { ShopSniffer } from "./cute/shop-sniffer";

type ToastKind = "cart" | "stock" | "info" | "wait";
type ToastMessage = {
  text: string;
  kind: ToastKind;
  pet?: string;
  id: number;
};
const HELLO_LINES = [
  "โฮ่ง! ของอร่อยอยู่ตรงนี้",
  "เมี้ยว~ มาเลือกของเล่นกัน",
  "ฟุดฟิด ♡ มีแครอทไหม?",
];
export default function Storefront() {
  const [products, setProducts] = useState<Product[]>(seedProducts),
    [settings, setSettings] = useState<ShopSettings>(defaultSettings),
    [pet, setPet] = useState("all"),
    [category, setCategory] = useState("ทั้งหมด"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("recommended");
  const [cart, setCart] = useState<CartItem[]>([]),
    [saved, setSaved] = useState<string[]>([]),
    [onlySaved, setOnlySaved] = useState(false),
    [ready, setReady] = useState(false),
    [detail, setDetail] = useState<Product | null>(null),
    [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [directCart, setDirectCart] = useState<CartItem[] | null>(null),
    [chatDraft, setChatDraft] = useState(""),
    [chatOpen, setChatOpen] = useState(false),
    [menu, setMenu] = useState(false),
    [info, setInfo] = useState(""),
    [toast, setToast] = useState<ToastMessage | null>(null),
    [ordersOpen, setOrdersOpen] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [rowHop, setRowHop] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dealt = useRef(false);
  const notify = (text: string, kind: ToastKind = "info", pet?: string) =>
    setToast({ text, kind, pet, id: Date.now() });
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("pawpal-cart") || "[]"),
        s = JSON.parse(localStorage.getItem("pawpal-saved") || "[]");
      if (Array.isArray(c))
        setCart(
          c.filter(
            (i) =>
              typeof i.id === "string" &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0,
          ),
        );
      if (Array.isArray(s)) setSaved(s.filter((i) => typeof i === "string"));
    } catch {}
    setReady(true);
    fetch("/api/shop")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d: any) => {
        setProducts(d.products);
        setSettings(d.settings);
        setCatalogLoaded(true);
      })
      .catch(() => setUnavailable(true));
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("pawpal-cart", JSON.stringify(cart));
        localStorage.setItem("pawpal-saved", JSON.stringify(saved));
      } catch {}
    }
  }, [cart, saved, ready]);
  useEffect(() => {
    if (toast?.id) {
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
  }, [toast?.id]);
  const showProducts = (p = "all") => {
    setPet(p);
    setOnlySaved(false);
    setMenu(false);
    document.getElementById("shop")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };
  function add(p: Product, quantity = 1, source?: HTMLElement | null) {
    if (!catalogLoaded && !unavailable) {
      notify("รอแป๊บนะ ร้านกำลังเตรียมของให้อยู่", "wait");
      return false;
    }
    if (!catalogLoaded || unavailable || p.stock < 1) return false;
    const current = cart.find((i) => i.id === p.id);
    if ((current?.quantity || 0) + quantity > Math.min(p.stock, 99)) {
      notify("เพิ่มครบตามจำนวนที่มีในสต็อกแล้ว", "stock", p.pet);
      return false;
    }
    setCart((prev) => {
      const i = prev.find((i) => i.id === p.id);
      return i
        ? prev.map((i) =>
            i.id === p.id
              ? { ...i, quantity: Math.min(i.quantity + quantity, p.stock) }
              : i,
          )
        : [...prev, { id: p.id, quantity }];
    });
    notify(`เพิ่ม ${p.name} ลงตะกร้าแล้ว`, "cart", p.pet);
    emit("pawpal:cart-added", {
      productId: p.id,
      pet: p.pet,
      quantity,
      // Only an image the grid already painted: productImages() synthesizes a
      // full-size URL the card never loads, so the flyer would fetch it fresh.
      image: p.image || p.images?.[0],
      source: source ?? null,
    });
    return true;
  }
  function toggleSaved(p: Product, source?: HTMLElement | null) {
    const next = !saved.includes(p.id);
    setSaved((s) => (next ? [...s, p.id] : s.filter((id) => id !== p.id)));
    emit("pawpal:favorite", {
      productId: p.id,
      pet: p.pet,
      saved: next,
      source: source ?? null,
    });
  }
  function openProduct(p: Product) {
    const url = new URL(location.href);
    url.searchParams.set("product", p.id);
    history.pushState(history.state, "", url);
    setDetail(p);
  }
  function closeProduct() {
    const url = new URL(location.href);
    url.searchParams.delete("product");
    url.searchParams.delete("buy");
    history.replaceState(history.state, "", url);
    setDetail(null);
  }
  function clearBuy() {
    const url = new URL(location.href);
    url.searchParams.delete("buy");
    history.replaceState(history.state, "", url);
    setCheckout(false);
    setDirectCart(null);
  }
  useEffect(() => {
    if (!catalogLoaded) return;
    function fromLink(pop = false) {
      const params = new URLSearchParams(location.search),
        id = params.get("product");
      const product = products.find((p) => p.id === id && p.active);
      setDetail(product || null);
      const quantity = Number(params.get("buy"));
      if (
        product &&
        Number.isInteger(quantity) &&
        quantity > 0 &&
        quantity <= Math.min(product.stock, 99)
      ) {
        setDirectCart([{ id: product.id, quantity }]);
        setCheckout(true);
      } else if (pop || params.has("buy")) {
        setCheckout(false);
        setDirectCart(null);
        if (params.has("buy")) {
          setToast({
            text: "จำนวนสินค้าหรือสต็อกเปลี่ยนไป กรุณาเลือกสินค้าใหม่",
            kind: "info",
            id: Date.now(),
          });
          const url = new URL(location.href);
          url.searchParams.delete("buy");
          history.replaceState(history.state, "", url);
        }
      }
    }
    const pop = () => fromLink(true);
    fromLink();
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [products, catalogLoaded]);
  const count = cart.reduce((a, b) => a + b.quantity, 0),
    subtotal = cart.reduce(
      (s, i) =>
        s + (products.find((p) => p.id === i.id)?.price || 0) * i.quantity,
      0,
    ),
    shipping = subtotal >= settings.freeShipping ? 0 : settings.shipping;
  const shown = products
    .filter(
      (p) =>
        p.active &&
        (pet === "all" || p.pet === pet) &&
        (category === "ทั้งหมด" || p.category === category) &&
        (!onlySaved || saved.includes(p.id)) &&
        `${p.name} ${p.brand} ${p.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : 0,
    );
  useEffect(() => {
    if (!dealt.current) {
      dealt.current = true;
      return;
    }
    const grid = gridRef.current;
    if (!grid || !motionAllowed()) return;
    if (grid.getBoundingClientRect().top >= window.innerHeight) return;
    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(".product-card"),
    ).slice(0, 6);
    const running = cards.map((card, i) =>
      card.animate(
        [
          { opacity: 0.6, transform: "translateY(10px) scale(.97)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: 300,
          delay: i * 30,
          easing: "cubic-bezier(.2,.8,.3,1.25)",
          fill: "backwards",
        },
      ),
    );
    return () => running.forEach((animation) => animation.cancel());
  }, [pet, category, onlySaved, sort]);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "filter_pet_products",
            description:
              "Filter the visible PAWPAL catalog. Does not purchase anything.",
            inputSchema: {
              type: "object",
              properties: {
                pet: { type: "string", enum: ["all", "dog", "cat", "exotic"] },
                search: { type: "string" },
              },
              required: ["pet"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: async (input: any) => {
              if (
                !input ||
                !["all", "dog", "cat", "exotic"].includes(input.pet) ||
                (input.search !== undefined && typeof input.search !== "string")
              )
                throw Error("Invalid filter");
              setPet(input.pet);
              setSearch(input.search || "");
              setCategory("ทั้งหมด");
              setOnlySaved(false);
              document.getElementById("shop")?.scrollIntoView();
              await new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              );
              return { pet: input.pet, search: input.search || "" };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  return (
    <>
      <div className="announcement">
        <span>Little paws. Big love.</span>
        <span>
          <Truck size={15} /> ส่งฟรีเมื่อครบ {money(settings.freeShipping)}{" "}
          <span className="announcement-extra"> • ความสุขพร้อมส่งถึงบ้าน</span>
        </span>
        <button onClick={() => setInfo("การจัดส่ง")}>
          ดูรายละเอียด <ArrowUpRight size={14} />
        </button>
      </div>
      <header className="header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="เมนูหลัก">
            <a className="active" href="/">
              <PawPrint size={15} aria-hidden="true" />
              หน้าแรก
            </a>
            <button onClick={() => showProducts()}>
              ช้อปสินค้า <ChevronDown size={14} />
            </button>
            <button
              onClick={() => {
                setCategory("ยาและการป้องกัน");
                showProducts();
              }}
            >
              ดูแลสุขภาพ
            </button>
            <button onClick={() => setInfo("รู้จัก PAWPAL")}>รู้จักเรา</button>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button search-button"
              aria-label="ค้นหาสินค้า"
              onClick={() => {
                showProducts();
                document.getElementById("search")?.focus();
              }}
            >
              <Search size={21} />
            </button>
            <button
              className="icon-button fav-button"
              aria-label="สินค้าที่ชอบ"
              onClick={() => {
                showProducts();
                setOnlySaved(true);
              }}
            >
              <Heart size={21} />
              {saved.length > 0 && <i className="dot" />}
            </button>
            <button
              className="icon-button account-button"
              aria-label="คำสั่งซื้อของฉัน"
              onClick={() => setOrdersOpen(true)}
            >
              <UserRound size={21} />
            </button>
            <span className="header-divider" />
            <button
              className="cart-button"
              aria-label={`ตะกร้าของฉัน ${count}`}
              onClick={() => {
                let first = false;
                try {
                  first = !sessionStorage.getItem("pawpal-cart-hop");
                  sessionStorage.setItem("pawpal-cart-hop", "1");
                } catch {}
                setRowHop(first);
                setCartOpen(true);
              }}
            >
              <ShoppingBag size={19} />
              <span>ตะกร้าของฉัน</span>
              <b>{count}</b>
            </button>
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={menu}
              aria-controls="mobile-navigation"
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <div
          className={`mobile-menu-reveal ${menu ? "is-open" : ""}`}
          inert={!menu}
          aria-hidden={!menu}
        >
          <nav
            className="mobile-nav"
            id="mobile-navigation"
            aria-label="เมนูมือถือ"
          >
            <button onClick={() => showProducts()}>
              <PawPrint size={18} />
              ช้อปสินค้าทั้งหมด
            </button>
            <button
              onClick={() => {
                showProducts();
                setOnlySaved(true);
              }}
            >
              <Heart size={18} />
              รายการโปรด
            </button>
            <button
              onClick={() => {
                setOrdersOpen(true);
                setMenu(false);
              }}
            >
              <ShoppingBag size={18} />
              คำสั่งซื้อของฉัน
            </button>
            <button
              onClick={() => {
                setChatOpen(true);
                setMenu(false);
              }}
            >
              <MessageCircle size={18} />
              คุยกับ PAWPAL
            </button>
            <a href="/admin">จัดการร้านค้า</a>
          </nav>
        </div>
      </header>
      <MotionLayer />
      <PetMotion />
      <ShopDelight />
      <main>
        <WorldHero shop={showProducts} />
        <div className="love-ribbon" aria-hidden="true">
          <div>
            {[0, 1, 2, 3].map((i) => (
              <span key={i}>
                SMALL FRIENDS <PawPrint /> BIG FEELINGS <Heart /> EVERYDAY
                GOODNESS <Sparkles />
              </span>
            ))}
          </div>
        </div>
        <section className="pet-section wrap" data-reveal>
          <CorePawSteps kind="dog" end="bone" place="top" />
          <div className="section-heading editorial-heading">
            <div>
              <span className="kicker">01 — FIND THEIR HAPPY PLACE</span>
              <h2>
                ใครคือเพื่อนซี้
                <br />
                <em>ของคุณ?</em>
              </h2>
            </div>
            <p>
              ตัวเล็ก ตัวใหญ่ หรือขนฟูแค่ไหน
              <br />
              ก็มีโลกของเขาอยู่ตรงนี้
            </p>
          </div>
          <div className="pet-grid">
            {pets.slice(1).map((p, i) => (
              <button
                key={p.id}
                className={
                  "pet-card pet-" + p.id + (pet === p.id ? " selected" : "")
                }
                onClick={() => showProducts(p.id)}
                aria-pressed={pet === p.id}
              >
                <span className="pet-portrait">
                  <img
                    src={"/images/pet-" + p.id + ".webp"}
                    alt={p.name}
                    loading="lazy"
                  />
                </span>
                <span className="cs-pet-hello" aria-hidden="true">
                  <i className="cc-bubble">{HELLO_LINES[i]}</i>
                </span>
                <span className="pet-card-bottom">
                  <span>
                    <strong>{p.name}</strong>
                    <em>
                      {
                        [
                          "ความสุขของเจ้าตูบ",
                          "เอาใจเจ้านายตัวน้อย",
                          "เพื่อนพิเศษ ของพิเศษ",
                        ][i]
                      }
                    </em>
                  </span>
                  <span className="round-arrow">
                    <ArrowUpRight size={24} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section id="shop" className="shop-section wrap" data-reveal>
          <div className="section-heading">
            <div>
              <span className="kicker">02 — THE GOOD STUFF</span>
              <h2>
                {onlySaved ? "ของโปรดที่เก็บไว้" : "ของโปรดประจำวัน"}
                <Sparkles className="heading-spark" size={25} />
              </h2>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setPet("all");
                setCategory("ทั้งหมด");
                setSearch("");
                setOnlySaved(false);
              }}
            >
              ดูสินค้าทั้งหมด <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="catalog-toolbar">
            <div className="category-tabs">
              {categories.map((c) => (
                <button
                  key={c}
                  className={category === c ? "selected" : ""}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="search-field">
              <Search size={18} />
              <input
                id="search"
                aria-label="ค้นหาสินค้า"
                placeholder="ค้นหาของโปรด…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button aria-label="ล้างคำค้นหา" onClick={() => setSearch("")}>
                  <X size={16} />
                </button>
              )}
              <ShopSniffer
                mood={search ? (shown.length ? "found" : "lost") : "idle"}
              />
            </label>
          </div>
          <div className="catalog-meta">
            <div>
              {pet !== "all" && (
                <button className="filter-chip" onClick={() => setPet("all")}>
                  <PetFace kind={faceKindOf(pet)} size={16} mood="happy" />
                  {pets.find((p) => p.id === pet)?.name}
                  <X size={13} />
                </button>
              )}
              <span>
                {shown.length} สินค้า{" "}
                {settings.demo && (
                  <span className="demo-label"> · แคตตาล็อกตัวอย่าง</span>
                )}
              </span>
            </div>
            <label>
              <SlidersHorizontal size={14} />
              <select
                aria-label="เรียงสินค้า"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recommended">แนะนำสำหรับคุณ</option>
                <option value="low">ราคา: ต่ำไปสูง</option>
                <option value="high">ราคา: สูงไปต่ำ</option>
              </select>
            </label>
          </div>
          {unavailable && (
            <div className="notice">
              ระบบร้านค้ายังเชื่อมต่อไม่ได้ กำลังแสดงตัวอย่างสินค้า{" "}
              <button onClick={() => location.reload()}>ลองใหม่</button>
            </div>
          )}
          <div className="product-grid" ref={gridRef}>
            {shown.map((p) => (
              <article
                className="product-card"
                key={p.id}
                data-pet={p.pet}
                data-product-id={p.id}
              >
                <div className={`product-visual product-bg-${p.art}`}>
                  <button
                    className="product-art-button"
                    onClick={() => openProduct(p)}
                    aria-label={`ดูรายละเอียด ${p.name}`}
                  >
                    <ProductArt product={p} />
                  </button>
                  {p.badge && <span className="product-badge">{p.badge}</span>}
                  <button
                    className={`save-button ${saved.includes(p.id) ? "saved" : ""}`}
                    aria-label={`${saved.includes(p.id) ? "เลิกบันทึก" : "บันทึก"} ${p.name}`}
                    aria-pressed={saved.includes(p.id)}
                    onClick={(e) => toggleSaved(p, e.currentTarget)}
                  >
                    <Heart
                      size={17}
                      fill={saved.includes(p.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="product-body">
                  <span className="product-brand">{p.brand}</span>
                  <button
                    className="product-title"
                    onClick={() => openProduct(p)}
                  >
                    {p.name}
                  </button>
                  <p>
                    {p.size} <span>·</span>{" "}
                    {pets.find((t) => t.id === p.pet)?.name}
                  </p>
                  <div className="product-bottom">
                    <div>
                      <strong>{money(p.price)}</strong>
                      {p.originalPrice > p.price && (
                        <del>{money(p.originalPrice)}</del>
                      )}
                    </div>
                    <button
                      className="add-button"
                      disabled={!p.stock}
                      onClick={(e) => add(p, 1, e.currentTarget)}
                      aria-label={
                        p.stock
                          ? `เพิ่ม ${p.name} ลงตะกร้า`
                          : `${p.name} หมดชั่วคราว`
                      }
                    >
                      {p.stock ? (
                        <PawPrint size={22} />
                      ) : (
                        <span className="cs-soldout">
                          <i className="cc-zz cs-z" aria-hidden="true">
                            z
                          </i>
                          หมด
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!shown.length &&
            (onlySaved && saved.length === 0 ? (
              <div className="empty-state">
                <EmptyScene scene="saved" />
                <h3>ยังไม่มีของโปรดเลย</h3>
                <p>
                  แตะ ♡ บนสินค้าที่ถูกใจ แล้วน้องกระต่ายจะเก็บไว้ให้ตรงนี้
                </p>
                <button
                  className="secondary-button"
                  onClick={() => setOnlySaved(false)}
                >
                  ไปเลือกของโปรด
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <EmptyScene scene="search" />
                <h3>ยังไม่เจอของที่กำลังหา</h3>
                <p>
                  {search
                    ? `ดมหาทั่วแล้ว ยังไม่เจอ “${search}” ลองคำอื่นดูนะ`
                    : "ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่นดูนะ"}
                </p>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setSearch("");
                    setPet("all");
                    setCategory("ทั้งหมด");
                    setOnlySaved(false);
                  }}
                >
                  ดูสินค้าทั้งหมด
                </button>
              </div>
            ))}
          <CorePawSteps kind="rabbit" end="carrot" place="bottom" />
        </section>
        <section className="care-story wrap" data-reveal>
          <div className="care-world">
            <img
              src="/images/world.webp"
              alt="เพื่อนสัตว์เลี้ยงในโลกของ PAWPAL"
              loading="lazy"
            />
            <span>
              GOOD CARE.
              <br />
              GREAT LITTLE LIVES.
            </span>
          </div>
          <div className="care-copy">
            <span className="kicker">03 — HERE FOR YOU & YOUR BESTIE</span>
            <h2>
              เพื่อนของคุณ
              <br />
              ก็เพื่อนของเรา<span>♡</span>
            </h2>
            <p>
              สงสัยว่าของชิ้นไหนเหมาะกับเพื่อนตัวเล็ก?
              <br />
              บอกเราได้เลย มาช่วยกันเลือกสิ่งดี ๆ ให้เขา
            </p>
            <button className="world-shop" onClick={() => setChatOpen(true)}>
              คุยกับ PAWPAL{" "}
              <span>
                <MessageCircle size={23} />
              </span>
            </button>
            <button
              className="care-link"
              onClick={() => setInfo("รู้จัก PAWPAL")}
            >
              รู้จักโลกของเรา <ArrowUpRight size={17} />
            </button>
          </div>
        </section>
        <section className="service-strip wrap" aria-label="บริการของร้าน">
          <div>
            <Truck />
            <span>
              <b>ส่งความสุขถึงบ้าน</b>
              <small>ส่งฟรีเมื่อครบ {money(settings.freeShipping)}</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <b>ข้อมูลครบ เลือกง่าย</b>
              <small>ดูรายละเอียดก่อนตัดสินใจ</small>
            </span>
          </div>
          <div>
            <MessageCircle />
            <span>
              <b>มีเพื่อนคอยช่วย</b>
              <small>คุยกับทีมร้านผ่านแชต</small>
            </span>
          </div>
        </section>
      </main>
      <PetFooter
        shop={showProducts}
        orders={() => setOrdersOpen(true)}
        info={setInfo}
        chat={() => setChatOpen(true)}
        pet={pet}
      />
      <div className="cs-toast-region" role="status" aria-live="polite">
        {toast && (
          <div
            key={toast.id}
            className={`toast cs-toast cs-toast-${toast.kind}`}
          >
            <PetFace
              kind={faceKindOf(toast.pet)}
              mood={
                toast.kind === "stock"
                  ? "worried"
                  : toast.kind === "wait"
                    ? "sleepy"
                    : "happy"
              }
              size={34}
              className="cs-toast-face cc-anim-blink cc-anim-ears"
            />
            <Check size={18} aria-hidden="true" />
            {toast.text}
          </div>
        )}
      </div>
      {detail && !checkout && (
        <ProductDetail
          key={detail.id}
          product={detail}
          purchasable={catalogLoaded && !unavailable}
          products={products}
          settings={settings}
          saved={saved.includes(detail.id)}
          inCart={cart.find((i) => i.id === detail.id)?.quantity || 0}
          close={closeProduct}
          favorite={() =>
            toggleSaved(
              detail,
              document.querySelector<HTMLElement>(
                ".product-sheet .pdp-brand > button",
              ),
            )
          }
          add={(quantity) =>
            add(
              detail,
              quantity,
              document.querySelector<HTMLElement>(
                ".product-sheet .pdp-actions .pet-action.soft",
              ),
            )
          }
          buy={(quantity) => {
            setDirectCart([{ id: detail.id, quantity }]);
            const url = new URL(location.href);
            url.searchParams.set("buy", String(quantity));
            history.replaceState(history.state, "", url);
            setCheckout(true);
          }}
          chat={() => {
            setChatDraft(
              "สนใจสินค้า " + detail.name + " ขอสอบถามรายละเอียดค่ะ",
            );
            closeProduct();
            setChatOpen(true);
          }}
          select={openProduct}
        />
      )}
      {cartOpen && (
        <Modal
          title={`ตะกร้าของเพื่อนซี้ (${count})`}
          close={() => setCartOpen(false)}
        >
          {cart.length ? (
            <>
              <div className="shipping-progress">
                <p>
                  {subtotal >= settings.freeShipping
                    ? "เย้! ได้รับสิทธิ์ส่งฟรีแล้ว"
                    : `อีก ${money(settings.freeShipping - subtotal)} ก็ส่งฟรีแล้วนะ`}
                </p>
                <ShopFreeShip
                  subtotal={subtotal}
                  threshold={settings.freeShipping}
                />
              </div>
              <div className={`cart-items${rowHop ? " cs-rows-hop" : ""}`}>
                {cart.map((item, i) => {
                  const p = products.find((p) => p.id === item.id);
                  const full = p
                    ? item.quantity >= Math.min(p.stock, 99)
                    : false;
                  return p ? (
                    <div
                      className="cart-item"
                      key={p.id}
                      style={{ "--i": i } as CSSProperties}
                    >
                      <div className="cart-art">
                        <ProductArt product={p} />
                      </div>
                      <div className="cart-item-info">
                        <b>{p.name}</b>
                        <small>{p.size}</small>
                        <div className="quantity">
                          <button
                            aria-label={`ลดจำนวน ${p.name}`}
                            onClick={() =>
                              setCart((c) =>
                                c
                                  .map((i) =>
                                    i.id === p.id
                                      ? { ...i, quantity: i.quantity - 1 }
                                      : i,
                                  )
                                  .filter((i) => i.quantity > 0),
                              )
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <span className="cs-qty-window">
                            <span key={item.quantity} className="cs-qty">
                              {item.quantity}
                            </span>
                          </span>
                          <button
                            aria-label={`เพิ่มจำนวน ${p.name}${full ? " (ครบตามสต็อกแล้ว)" : ""}`}
                            disabled={full}
                            onClick={(e) => add(p, 1, e.currentTarget)}
                          >
                            <Plus size={14} />
                          </button>
                          {full && (
                            <small className="cs-full">ครบตามสต็อกแล้ว</small>
                          )}
                        </div>
                      </div>
                      <div className="cart-item-price">
                        <b>{money(p.price * item.quantity)}</b>
                        <button
                          aria-label={`ลบ ${p.name} ออกจากตะกร้า`}
                          onClick={() =>
                            setCart((c) => c.filter((i) => i.id !== p.id))
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="notice">
                      สินค้านี้ไม่มีจำหน่ายแล้ว{" "}
                      <button
                        onClick={() =>
                          setCart((c) => c.filter((i) => i.id !== item.id))
                        }
                      >
                        นำออก
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="order-summary">
                <div>
                  <span>ยอดสินค้า</span>
                  <b>{money(subtotal)}</b>
                </div>
                <div>
                  <span>ค่าจัดส่ง</span>
                  <b>{shipping ? money(shipping) : "ฟรี"}</b>
                </div>
                <div className="total">
                  <span>รวมทั้งหมด</span>
                  <b>{money(subtotal + shipping)}</b>
                </div>
              </div>
              <button
                className="primary-button full"
                disabled={unavailable}
                onClick={() => {
                  setCartOpen(false);
                  setCheckout(true);
                }}
              >
                ดำเนินการสั่งซื้อ <ArrowRight size={18} />
              </button>
              <p className="muted center">
                โอนเงินและแนบสลิป • ตรวจสอบโดยแอดมิน
              </p>
            </>
          ) : (
            <div className="empty-state">
              <EmptyScene scene="cart" />
              <h3>เพื่อนซี้กำลังรอของโปรด</h3>
              <p>เลือกสิ่งดี ๆ มาเติมตะกร้ากัน</p>
              <button
                className="primary-button"
                onClick={() => {
                  setCartOpen(false);
                  showProducts();
                }}
              >
                ไปเลือกสินค้า <ArrowUpRight size={18} />
              </button>
            </div>
          )}
        </Modal>
      )}
      {checkout && (
        <Checkout
          cart={directCart || cart}
          products={products}
          settings={settings}
          close={clearBuy}
          done={() => {
            if (!directCart) setCart([]);
            clearBuy();
            closeProduct();
            setOrdersOpen(true);
          }}
        />
      )}
      {ordersOpen && (
        <Orders close={() => setOrdersOpen(false)} settings={settings} />
      )}
      <Chat
        open={chatOpen}
        setOpen={setChatOpen}
        initialMessage={chatDraft}
        consumeInitialMessage={() => setChatDraft("")}
      />

      {info && (
        <Modal title={info} close={() => setInfo("")}>
          <div className="info-content">
            {info === "รู้จัก PAWPAL" ? (
              <>
                <PawPrint size={40} />
                <h3>เพื่อนซี้ของทุกชีวิตตัวเล็ก</h3>
                <p>
                  PAWPAL รวมอาหารและผลิตภัณฑ์ดูแลสัตว์เลี้ยงไว้ในที่เดียว
                  ให้คุณเลือกตามชนิดสัตว์ ช่วงวัย และความต้องการได้ง่ายขึ้น
                </p>
                <p>
                  หากไม่แน่ใจเรื่องยาและอาหารเสริม ควรปรึกษาสัตวแพทย์ก่อนใช้
                  โดยเฉพาะสัตว์ที่มีโรคประจำตัว
                </p>
              </>
            ) : info === "ความเป็นส่วนตัว" ? (
              <>
                <h3>ดูแลข้อมูลเหมือนดูแลเพื่อน</h3>
                <p>
                  ร้านเก็บชื่อ ที่อยู่ เบอร์โทร คำสั่งซื้อ สลิป
                  และข้อความแชตเพื่อรับคำสั่งซื้อ จัดส่ง และบริการลูกค้า
                  ผู้ดูแลร้านเข้าถึงข้อมูลเพื่อดำเนินการเหล่านี้ได้
                </p>
                <p>
                  ตะกร้าและรายการโปรดบันทึกในอุปกรณ์ของคุณ
                  ส่วนคำสั่งซื้อและแชตผูกกับบัญชี Google ที่ลงชื่อเข้าใช้
                  ติดต่อร้านผ่านแชตเพื่อขอแก้ไขหรือลบข้อมูลได้
                </p>
                <p>
                  เว็บไซต์ใช้คุกกี้ที่จำเป็นสำหรับการลงชื่อเข้าใช้
                  ไม่มีระบบโฆษณาติดตามในเวอร์ชันนี้
                </p>
              </>
            ) : (
              <>
                <h3>การจัดส่ง</h3>
                <p>
                  ค่าจัดส่ง {money(settings.shipping)} ต่อคำสั่งซื้อ
                  ส่งฟรีเมื่อครบ {money(settings.freeShipping)}{" "}
                  แอดมินจะแจ้งเลขติดตามพัสดุในหน้าคำสั่งซื้อหลังจัดส่ง
                </p>
                <h3>การชำระเงิน</h3>
                <p>
                  โอนเข้าบัญชีร้านตามยอดที่แจ้งและแนบสลิปในหน้าคำสั่งซื้อ
                  สถานะจะเปลี่ยนเมื่อแอดมินตรวจสอบแล้ว
                </p>
                <h3>การคืนสินค้า</h3>
                <p>{settings.returnPolicy}</p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
