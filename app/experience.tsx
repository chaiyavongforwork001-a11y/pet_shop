"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Camera,
  Heart,
  Pause,
  Play,
  Rotate3D,
} from "lucide-react";
import { emit, listen } from "./cute/core-events";
import { motionAllowed } from "./cute/core-motion";
import { addLove, getLove, getServerLove, subscribe } from "./cute/hero-love";
import { HeroFloaties } from "./cute/hero-floaties";
import { HeroHeadline } from "./cute/hero-headline";
import { HeroPets } from "./cute/hero-pets";
import { HeroPhotoModal } from "./cute/hero-photo-modal";
import { composePolaroid } from "./cute/hero-photo";

export type WorldPetAction = {
  kind: 0 | 1 | 2;
  action: "pet" | "trick" | "toy" | "photo" | "cheer";
  label: string;
};
export type WorldProps = {
  motion: boolean;
  greet: number;
  focus: { pet: -1 | 0 | 1 | 2; n: number };
  peek: "dog" | "cat" | "exotic" | "all" | null;
  photo: number;
  onReady: (ready: boolean) => void;
  onPetAction: (action: WorldPetAction) => void;
  onPhoto: (shot: HTMLCanvasElement | null) => void;
};

const MOTION_KEY = "pawpal-motion";

function readPref(): "on" | "off" | null {
  try {
    const v = localStorage.getItem(MOTION_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

export function WorldHero({ shop }: { shop: (pet?: string) => void }) {
  const [World, setWorld] = useState<ComponentType<WorldProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [motion, setMotion] = useState(false);
  const [greet, setGreet] = useState(0);
  const [focus, setFocus] = useState<{ pet: -1 | 0 | 1 | 2; n: number }>({
    pet: -1,
    n: 0,
  });
  const [peek, setPeek] = useState<"dog" | "cat" | "exotic" | "all" | null>(
    null,
  );
  const [photo, setPhoto] = useState(0);
  const [announce, setAnnounce] = useState("");
  const [active, setActive] = useState(-1);
  const [shooting, setShooting] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const love = useSyncExternalStore(subscribe, getLove, getServerLove);
  const shell = useRef<HTMLElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | null>(null);
  const shotTimer = useRef<number | null>(null);
  const cam = useRef<HTMLButtonElement>(null);

  const choose = useCallback((on: boolean) => {
    setMotion(on);
    try {
      localStorage.setItem(MOTION_KEY, on ? "on" : "off");
    } catch {
      /* private mode — the choice simply lasts for this page view */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.pawpalMotion = motion ? "on" : "off";
    return () => {
      delete document.documentElement.dataset.pawpalMotion;
    };
  }, [motion]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const stored = readPref();
      setMotion(stored ? stored === "on" : !reduced.matches);
    };
    update();
    reduced.addEventListener("change", update);
    const off = listen("pawpal:motion-set", (d) => {
      if (typeof d.on === "boolean") choose(d.on);
    });
    import("./pet-world")
      .then((m) => setWorld(() => m.default))
      .catch(() => {});
    return () => {
      reduced.removeEventListener("change", update);
      off();
    };
  }, [choose]);

  useEffect(
    () => () => {
      if (holdTimer.current !== null) clearTimeout(holdTimer.current);
      if (shotTimer.current !== null) clearTimeout(shotTimer.current);
    },
    [],
  );

  const pick = useCallback(
    (i: 0 | 1 | 2) => {
      if (holdTimer.current !== null) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
      if (active === i) {
        setFocus((f) => ({ pet: -1, n: f.n + 1 }));
        setActive(-1);
        return;
      }
      setFocus((f) => ({ pet: i, n: f.n + 1 }));
      setActive(i);
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null;
        setActive(-1);
      }, 2800);
    },
    [active],
  );

  const release = useCallback(() => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setFocus((f) => ({ pet: -1, n: f.n + 1 }));
    setActive(-1);
  }, []);

  const onPetAction = useCallback((a: WorldPetAction) => {
    setAnnounce(a.label);
    addLove(1);
  }, []);

  const takePhoto = useCallback(() => {
    setShooting(true);
    setPhoto((v) => v + 1);
    if (shotTimer.current !== null) clearTimeout(shotTimer.current);
    shotTimer.current = window.setTimeout(() => {
      shotTimer.current = null;
      setShooting(false);
    }, 5000);
  }, []);

  const onPhoto = useCallback(async (shot: HTMLCanvasElement | null) => {
    if (shotTimer.current !== null) {
      clearTimeout(shotTimer.current);
      shotTimer.current = null;
    }
    setShooting(false);
    if (!shot) return;
    if (motionAllowed())
      flash.current?.animate(
        [{ opacity: 0 }, { opacity: 0.55 }, { opacity: 0 }],
        { duration: 260 },
      );
    const blob = await composePolaroid(shot);
    if (!blob) return;
    // Disabling the button during the countdown blurred it; take focus back
    // before the modal mounts so it has something to restore to on close.
    if (document.activeElement === document.body) cam.current?.focus();
    setPhotoBlob(blob);
  }, []);

  return (
    <>
      <section className="world-hero" ref={shell} aria-label="โลกของ PAWPAL">
        <div className="world-grid" aria-hidden="true" />
        <HeroFloaties />
        <div className="world-copy">
          <div className="world-eyebrow">
            <span>THE PAWPAL UNIVERSE</span>
            <span>01 / ∞</span>
          </div>
          <HeroHeadline />
          <h2>โลกทั้งใบ ของเพื่อนตัวเล็ก</h2>
          <p>
            ของอร่อย สุขภาพดี และความสุขทุกวัน
            <br />
            เลือกสิ่งที่ใช่ ให้เพื่อนที่รักที่สุดของคุณ
          </p>
          <button
            className="world-shop"
            onClick={() => shop()}
            onPointerEnter={() => setPeek("all")}
            onPointerLeave={() => setPeek(null)}
            onFocus={() => setPeek("all")}
            onBlur={() => setPeek(null)}
          >
            ช้อปให้เพื่อนซี้{" "}
            <span>
              <ArrowUpRight size={23} />
            </span>
          </button>
          <div className="world-quick">
            <span>ช้อปตามเพื่อนของคุณ</span>
            <button
              onClick={() => shop("dog")}
              onPointerEnter={() => setPeek("dog")}
              onPointerLeave={() => setPeek(null)}
              onFocus={() => setPeek("dog")}
              onBlur={() => setPeek(null)}
            >
              น้องหมา
            </button>
            <button
              onClick={() => shop("cat")}
              onPointerEnter={() => setPeek("cat")}
              onPointerLeave={() => setPeek(null)}
              onFocus={() => setPeek("cat")}
              onBlur={() => setPeek(null)}
            >
              น้องแมว
            </button>
            <button
              onClick={() => shop("exotic")}
              onPointerEnter={() => setPeek("exotic")}
              onPointerLeave={() => setPeek(null)}
              onFocus={() => setPeek("exotic")}
              onBlur={() => setPeek(null)}
            >
              เอ็กโซติก
            </button>
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
            {World && (
              <World
                motion={motion}
                greet={greet}
                focus={focus}
                peek={peek}
                photo={photo}
                onReady={setReady}
                onPetAction={onPetAction}
                onPhoto={onPhoto}
              />
            )}
          </div>
          <div className="ch-flash" aria-hidden="true" ref={flash} />
          <span className="world-sticker">
            <Heart size={17} fill="currentColor" />
            <span>
              100%
              <br />
              <b>BEST FRIEND ENERGY</b>
            </span>
            {love > 0 ? (
              <b className="ch-love" key={love} aria-hidden="true">
                ♡ {love}
              </b>
            ) : null}
          </span>
          <div className="world-controls">
            <button
              disabled={!ready}
              onClick={() => {
                setGreet((v) => v + 1);
                emit("pawpal:greet", { at: Date.now() });
              }}
            >
              <Rotate3D size={17} />
              ทักทายเพื่อน ๆ
            </button>
            <button
              ref={cam}
              className="ch-icon"
              aria-label="ถ่ายรูปกับเพื่อน ๆ"
              disabled={!ready || shooting}
              onClick={takePhoto}
            >
              <Camera size={16} />
            </button>
            <button
              aria-label={motion ? "หยุดแอนิเมชัน" : "เล่นแอนิเมชัน"}
              aria-pressed={!motion}
              onClick={() => choose(!motion)}
            >
              {motion ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>
          <HeroPets
            ready={ready}
            active={active}
            onPick={pick}
            onRelease={release}
          />
          <span className="world-hint">ลากเพื่อหมุน · แตะหรือลูบน้องได้นะ</span>
          <span className="cc-sr" role="status" aria-live="polite">
            {announce}
          </span>
        </div>
        <div className="world-bottom">
          <span>FOR EVERY KIND OF LITTLE FRIEND.</span>
          <button onClick={() => shop()}>
            ค้นพบของโปรด <ArrowDown size={17} />
          </button>
          <span>หมา · แมว · เอ็กโซติก</span>
        </div>
      </section>
      {photoBlob ? (
        <HeroPhotoModal blob={photoBlob} close={() => setPhotoBlob(null)} />
      ) : null}
    </>
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
