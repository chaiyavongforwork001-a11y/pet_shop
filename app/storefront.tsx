"use client";
import { useEffect, useState } from "react";
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
  Dog,
  Cat,
  Rabbit,
  Sparkles,
  Truck,
  ShieldCheck,
  MessageCircle,
  Leaf,
  ChevronDown,
  Box,
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
    [chatOpen, setChatOpen] = useState(false),
    [menu, setMenu] = useState(false),
    [info, setInfo] = useState(""),
    [toast, setToast] = useState(""),
    [ordersOpen, setOrdersOpen] = useState(false),
    [play, setPlay] = useState(false),
    [unavailable, setUnavailable] = useState(false);
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
    if (toast) {
      const t = setTimeout(() => setToast(""), 3200);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const showProducts = (p = "all") => {
    setPet(p);
    setOnlySaved(false);
    setMenu(false);
    document
      .getElementById("shop")
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  };
  function add(p: Product) {
    if (p.stock < 1) return;
    const current = cart.find((i) => i.id === p.id);
    if (current && current.quantity >= p.stock) {
      setToast("เพิ่มครบตามจำนวนที่มีในสต็อกแล้ว");
      return;
    }
    setCart((prev) => {
      const i = prev.find((i) => i.id === p.id);
      return i
        ? prev.map((i) =>
            i.id === p.id
              ? { ...i, quantity: Math.min(i.quantity + 1, p.stock) }
              : i,
          )
        : [...prev, { id: p.id, quantity: 1 }];
    });
    setToast(`เพิ่ม ${p.name} ลงตะกร้าแล้ว`);
  }
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
          <nav className="desktop-nav">
            <a className="active" href="/">
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
              className="icon-button"
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
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={19} />
              <span>ตะกร้าของฉัน</span>
              <b>{count}</b>
            </button>
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="เปิดเมนู"
              aria-expanded={menu}
            >
              <Menu />
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav">
            <button onClick={() => showProducts()}>ช้อปสินค้าทั้งหมด</button>
            <button
              onClick={() => {
                setOrdersOpen(true);
                setMenu(false);
              }}
            >
              คำสั่งซื้อของฉัน
            </button>
            <button
              onClick={() => {
                setChatOpen(true);
                setMenu(false);
              }}
            >
              คุยกับ PAWPAL
            </button>
            <a href="/admin">จัดการร้านค้า</a>
          </nav>
        )}
      </header>
      <main>
        <section className="hero-shell">
          <div
            className="hero"
            onPointerMove={(e) => {
              if (
                e.pointerType !== "mouse" ||
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
              )
                return;
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty(
                "--mx",
                `${(e.clientX - r.left - r.width / 2) * 0.012}px`,
              );
              e.currentTarget.style.setProperty(
                "--my",
                `${(e.clientY - r.top - r.height / 2) * 0.012}px`,
              );
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.setProperty("--mx", "0px");
              e.currentTarget.style.setProperty("--my", "0px");
            }}
          >
            <div className="hero-image">
              <img
                src="/images/hero.webp"
                alt="หมาคอร์กี้ แมว และกระต่าย 3D บนโลกสีฟ้าของ PAWPAL"
                fetchPriority="high"
              />
            </div>
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="tiny-paw">
                  <PawPrint size={14} />
                </span>{" "}
                A LITTLE WORLD OF HAPPINESS
              </div>
              <h1>
                ทุกความสุข
                <br />
                ของ
                <span className="underline-word">
                  เพื่อนตัวเล็ก
                  <svg viewBox="0 0 350 15" aria-hidden="true">
                    <path d="M3 10 Q160 -2 345 9" />
                  </svg>
                </span>
                <br />
                เริ่มต้นที่นี่<span className="yellow-dot">.</span>
              </h1>
              <p>
                อาหารดี ๆ การดูแลที่ใช่ และความรักเต็มกระเป๋า
                <br />
                สำหรับน้องหมา น้องแมว และเพื่อนตัวจิ๋วของคุณ
              </p>
              <button className="primary-button" onClick={() => showProducts()}>
                ไปช้อปให้เพื่อนซี้ <ArrowUpRight size={20} />
              </button>
              <div className="hero-note">
                <Heart size={15} /> เพราะเขาคือครอบครัวของเราเหมือนกัน
              </div>
            </div>
            <div className="floating-tag tag-love">
              <Heart size={18} fill="#ff8997" color="#ff8997" />
              <span>Made for little besties</span>
            </div>
            <button className="scene-button" onClick={() => setPlay(true)}>
              <Box size={16} /> เล่นกับเพื่อน 3D <ArrowUpRight size={15} />
            </button>
            <div className="hero-bottom">
              <span>HAPPY PETS, HAPPY PLANET</span>
              <span className="hero-paw">
                <PawPrint size={13} />
              </span>
              <span>YOUR LITTLE HAPPY PLACE</span>
            </div>
          </div>
        </section>
        <section className="perks wrap" aria-label="บริการของร้าน">
          <div>
            <Truck />
            <span>
              <b>ส่งความสุขถึงหน้าบ้าน</b>
              <small>ส่งฟรีเมื่อช้อปครบ {money(settings.freeShipping)}</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <b>เลือกด้วยความใส่ใจ</b>
              <small>ข้อมูลสินค้าอ่านง่าย เลือกได้ตรงใจ</small>
            </span>
          </div>
          <div>
            <MessageCircle />
            <span>
              <b>มีเพื่อนคอยช่วยเลือก</b>
              <small>คุยกับทีม PAWPAL ผ่านแชต</small>
            </span>
          </div>
          <div>
            <Heart />
            <span>
              <b>สำหรับทุกเพื่อนตัวเล็ก</b>
              <small>หมา แมว และสัตว์เอ็กโซติก</small>
            </span>
          </div>
        </section>
        <section className="pet-section wrap">
          <div className="section-heading">
            <div>
              <span className="kicker">WHO'S YOUR LITTLE BESTIE?</span>
              <h2>วันนี้ ช้อปให้ใครดี?</h2>
            </div>
            <p>ไม่ว่าจะเพื่อนแบบไหน ก็มีของที่ใช่รออยู่</p>
          </div>
          <div className="pet-grid">
            {pets.slice(1).map((p, i) => {
              const Icon = [Dog, Cat, Rabbit][i];
              return (
                <button
                  key={p.id}
                  className={`pet-card pet-${p.id} ${pet === p.id ? "selected" : ""}`}
                  onClick={() => showProducts(p.id)}
                >
                  <span className="pet-icon">
                    <Icon size={48} strokeWidth={1.3} />
                  </span>
                  <span>
                    <small>{p.en}</small>
                    <strong>{p.name}</strong>
                    <em>
                      {
                        [
                          "อาหารและของโปรดของเจ้าตูบ",
                          "เอาใจเจ้านายตัวน้อย",
                          "กระต่าย หนู และเพื่อนตัวจิ๋ว",
                        ][i]
                      }
                    </em>
                  </span>
                  <span className="round-arrow">
                    <ArrowUpRight size={21} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <section id="shop" className="shop-section wrap">
          <div className="section-heading">
            <div>
              <span className="kicker">GOOD THINGS FOR YOUR GOOD FRIENDS</span>
              <h2>
                {onlySaved ? "ของโปรดที่เก็บไว้" : "ของดี ที่เพื่อนซี้จะหลงรัก"}
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
            </label>
          </div>
          <div className="catalog-meta">
            <div>
              {pet !== "all" && (
                <button className="filter-chip" onClick={() => setPet("all")}>
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
          <div className="product-grid">
            {shown.map((p) => (
              <article className="product-card" key={p.id}>
                <div className={`product-visual product-bg-${p.art}`}>
                  <button
                    className="product-art-button"
                    onClick={() => setDetail(p)}
                    aria-label={`ดูรายละเอียด ${p.name}`}
                  >
                    <ProductArt product={p} />
                  </button>
                  {p.badge && <span className="product-badge">{p.badge}</span>}
                  <button
                    className={`save-button ${saved.includes(p.id) ? "saved" : ""}`}
                    aria-label={`${saved.includes(p.id) ? "เลิกบันทึก" : "บันทึก"} ${p.name}`}
                    onClick={() =>
                      setSaved((s) =>
                        s.includes(p.id)
                          ? s.filter((id) => id !== p.id)
                          : [...s, p.id],
                      )
                    }
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
                    onClick={() => setDetail(p)}
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
                      onClick={() => add(p)}
                      aria-label={`เพิ่ม ${p.name} ลงตะกร้า`}
                    >
                      {p.stock ? <Plus size={22} /> : <span>หมด</span>}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!shown.length && (
            <div className="empty-state">
              <Search size={38} />
              <h3>ยังไม่เจอของที่กำลังหา</h3>
              <p>ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่นดูนะ</p>
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
          )}
        </section>
        <section className="care-banner wrap">
          <div className="care-icon">
            <PawPrint size={62} strokeWidth={1.3} />
          </div>
          <div>
            <span className="kicker">A LITTLE HELP, A LOT OF LOVE</span>
            <h2>เลือกไม่ถูก? เราอยู่ตรงนี้นะ</h2>
            <p>บอกเราเรื่องเพื่อนตัวเล็ก แล้วมาหาของที่เหมาะไปด้วยกัน</p>
          </div>
          <button className="primary-button" onClick={() => setChatOpen(true)}>
            <MessageCircle size={18} /> คุยกับ PAWPAL <ArrowUpRight size={18} />
          </button>
        </section>
      </main>
      <footer className="footer">
        <div className="footer-main wrap">
          <div>
            <Brand />
            <p>
              Small friends. Whole heart.
              <br />
              โลกเล็ก ๆ ที่เต็มไปด้วยความรัก
            </p>
          </div>
          <div>
            <b>ช้อปให้เพื่อนซี้</b>
            {pets.slice(1).map((p) => (
              <button key={p.id} onClick={() => showProducts(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
          <div>
            <b>ให้เราช่วยดูแล</b>
            <button onClick={() => setOrdersOpen(true)}>
              คำสั่งซื้อของฉัน
            </button>
            <button onClick={() => setInfo("การจัดส่ง")}>
              การจัดส่งและการคืนสินค้า
            </button>
            <button onClick={() => setChatOpen(true)}>ติดต่อเรา</button>
          </div>
          <div className="footer-note">
            <Leaf size={24} />
            <b>สิ่งเล็ก ๆ ที่เราใส่ใจ</b>
            <p>
              เลือกให้เหมาะกับชนิดและช่วงวัย
              <br />
              เพราะเพื่อนทุกตัวแตกต่างกัน
            </p>
            <a href="/admin">
              สำหรับแอดมิน <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="footer-bottom wrap">
          <span>
            © {new Date().getFullYear()} PAWPAL. Made with a whole lot of love.
          </span>
          <button onClick={() => setInfo("ความเป็นส่วนตัว")}>
            นโยบายความเป็นส่วนตัว
          </button>
          <span>TH / ฿ THB</span>
        </div>
      </footer>
      <button
        className="chat-fab"
        onClick={() => setChatOpen(!chatOpen)}
        aria-label="แชตกับ PAWPAL"
      >
        <MessageCircle size={23} />
        <span>มีอะไรให้ช่วยไหม?</span>
        <span className="chat-fab-dot" />
      </button>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {detail && (
        <Modal title="ของดีสำหรับเพื่อนซี้" close={() => setDetail(null)} wide>
          <div className="detail-grid">
            <div className={`detail-art product-bg-${detail.art}`}>
              <ProductArt product={detail} />
            </div>
            <div>
              <span className="kicker">{detail.brand}</span>
              <h2>{detail.name}</h2>
              <p>
                {detail.size} • {pets.find((p) => p.id === detail.pet)?.name}
              </p>
              <strong className="detail-price">{money(detail.price)}</strong>
              <p className="detail-description">{detail.description}</p>
              <span className="stock">
                {detail.stock > 0
                  ? `พร้อมส่ง ${detail.stock} ชิ้น`
                  : "สินค้ายังไม่พร้อมจำหน่าย"}
              </span>
              <button
                className="primary-button full"
                disabled={!detail.stock}
                onClick={() => add(detail)}
              >
                <ShoppingBag size={18} /> เพิ่มลงตะกร้า
              </button>
            </div>
          </div>
        </Modal>
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
                <div>
                  <span
                    style={{
                      width: `${Math.min(100, (subtotal / settings.freeShipping) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="cart-items">
                {cart.map((item) => {
                  const p = products.find((p) => p.id === item.id);
                  return p ? (
                    <div className="cart-item" key={p.id}>
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
                          <span>{item.quantity}</span>
                          <button
                            aria-label={`เพิ่มจำนวน ${p.name}`}
                            disabled={item.quantity >= p.stock}
                            onClick={() => add(p)}
                          >
                            <Plus size={14} />
                          </button>
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
              <ShoppingBag size={45} />
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
          cart={cart}
          products={products}
          settings={settings}
          close={() => setCheckout(false)}
          done={() => {
            setCart([]);
            setCheckout(false);
            setOrdersOpen(true);
          }}
        />
      )}
      {ordersOpen && (
        <Orders close={() => setOrdersOpen(false)} settings={settings} />
      )}
      {chatOpen && <Chat close={() => setChatOpen(false)} />}
      {play && <PetPlay close={() => setPlay(false)} />}
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
                  ส่วนคำสั่งซื้อและแชตผูกกับบัญชีที่ลงชื่อเข้าใช้
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
function PetPlay({ close }: { close: () => void }) {
  const [Scene, setScene] = useState<any>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    import("./pet-scene")
      .then((m) => setScene(() => m.default))
      .catch(() => setError(true));
  }, []);
  return (
    <Modal title="มาเล่นกับเพื่อนตัวเล็ก" close={close} wide>
      {Scene ? (
        <Scene />
      ) : (
        <div className="scene-loading">
          {error
            ? "โหลดสนามเล่นไม่สำเร็จ กรุณาลองใหม่"
            : "กำลังปลุกเพื่อนตัวเล็ก…"}
        </div>
      )}
      <p className="muted center">
        ลากเพื่อหมุนดูรอบตัว • แตะเพื่อนเพื่อทักทาย
      </p>
    </Modal>
  );
}
