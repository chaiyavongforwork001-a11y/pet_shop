"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Heart,
  Pause,
  Play,
  Rotate3D,
} from "lucide-react";

export type WorldProps = {
  motion: boolean;
  greet: number;
  onReady: (ready: boolean) => void;
};

export function WorldHero({ shop }: { shop: (pet?: string) => void }) {
  const [World, setWorld] = useState<ComponentType<WorldProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [motion, setMotion] = useState(false);
  const [greet, setGreet] = useState(0);
  const shell = useRef<HTMLElement>(null);
  useEffect(() => {
    document.documentElement.dataset.pawpalMotion = motion ? "on" : "off";
    return () => {
      delete document.documentElement.dataset.pawpalMotion;
    };
  }, [motion]);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!reduced.matches);
    update();
    reduced.addEventListener("change", update);
    import("./pet-world")
      .then((m) => setWorld(() => m.default))
      .catch(() => {});
    return () => reduced.removeEventListener("change", update);
  }, []);
  return (
    <section className="world-hero" ref={shell} aria-label="โลกของ PAWPAL">
      <div className="world-grid" aria-hidden="true" />
      <div className="world-copy">
        <div className="world-eyebrow">
          <span>THE PAWPAL UNIVERSE</span>
          <span>01 / ∞</span>
        </div>
        <h1>
          <span>Little paws.</span>
          <span className="happy-line">
            Big <em>love.</em>
            <Heart aria-hidden="true" />
          </span>
        </h1>
        <h2>โลกทั้งใบ ของเพื่อนตัวเล็ก</h2>
        <p>
          ของอร่อย สุขภาพดี และความสุขทุกวัน
          <br />
          เลือกสิ่งที่ใช่ ให้เพื่อนที่รักที่สุดของคุณ
        </p>
        <button className="world-shop" onClick={() => shop()}>
          ช้อปให้เพื่อนซี้{" "}
          <span>
            <ArrowUpRight size={23} />
          </span>
        </button>
        <div className="world-quick">
          <span>ช้อปตามเพื่อนของคุณ</span>
          <button onClick={() => shop("dog")}>น้องหมา</button>
          <button onClick={() => shop("cat")}>น้องแมว</button>
          <button onClick={() => shop("exotic")}>เอ็กโซติก</button>
        </div>
      </div>
      <div className={`world-stage ${ready ? "is-ready" : ""}`}>
        <div className="world-halo" aria-hidden="true" />
        <img
          className="world-fallback"
          src="/images/world.webp"
          alt="คอร์กี้ แมว และกระต่าย บนเกาะของเล่นสีม่วง"
          fetchPriority="high"
        />
        <div className="world-render">
          {World && <World motion={motion} greet={greet} onReady={setReady} />}
        </div>
        <span className="world-sticker">
          <Heart size={17} fill="currentColor" />
          <span>
            100%
            <br />
            <b>BEST FRIEND ENERGY</b>
          </span>
        </span>
        <div className="world-controls">
          <button disabled={!ready} onClick={() => setGreet((v) => v + 1)}>
            <Rotate3D size={17} />
            ทักทายเพื่อน ๆ
          </button>
          <button
            aria-label={motion ? "หยุดแอนิเมชัน" : "เล่นแอนิเมชัน"}
            aria-pressed={!motion}
            onClick={() => setMotion((v) => !v)}
          >
            {motion ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
        <span className="world-hint">ลากเพื่อหมุน · แตะน้องเพื่อทักทาย</span>
      </div>
      <div className="world-bottom">
        <span>FOR EVERY KIND OF LITTLE FRIEND.</span>
        <button onClick={() => shop()}>
          ค้นพบของโปรด <ArrowDown size={17} />
        </button>
        <span>หมา · แมว · เอ็กโซติก</span>
      </div>
    </section>
  );
}

export function MotionLayer() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (reduced.matches || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    elements.forEach((e) => {
      e.classList.add("will-reveal");
      observer.observe(e);
    });
    return () => {
      observer.disconnect();
      elements.forEach((e) => e.classList.remove("will-reveal"));
    };
  }, []);
  return null;
}
