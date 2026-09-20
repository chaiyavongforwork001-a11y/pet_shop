"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PawPrint } from "lucide-react";
import { motionAllowed } from "./cute/core-motion";

export function PetMotion() {
  const [burst, setBurst] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const allowed = motionAllowed;
    let surface: HTMLElement | null = null;
    let frame = 0;
    let x = 0,
      y = 0;
    let expiry: ReturnType<typeof setTimeout>;
    const clearSurface = () => {
      if (!surface) return;
      surface.style.removeProperty("--pet-rx");
      surface.style.removeProperty("--pet-ry");
      surface.style.removeProperty("--pet-light-x");
      surface.style.removeProperty("--pet-light-y");
      surface = null;
    };
    const move = (event: PointerEvent) => {
      if (!allowed() || !fine.matches || event.pointerType !== "mouse") {
        clearSurface();
        return;
      }
      const next = (event.target as Element).closest<HTMLElement>(
        ".product-visual, .pet-card, .footer-friend",
      );
      if (next !== surface) {
        clearSurface();
        surface = next;
      }
      x = event.clientX;
      y = event.clientY;
      if (!surface || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!surface) return;
        const rect = surface.getBoundingClientRect();
        const px = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
        surface.style.setProperty("--pet-rx", `${(0.5 - py) * 8}deg`);
        surface.style.setProperty("--pet-ry", `${(px - 0.5) * 10}deg`);
        surface.style.setProperty("--pet-light-x", `${px * 100}%`);
        surface.style.setProperty("--pet-light-y", `${py * 100}%`);
      });
    };
    const scroll = () =>
      document.documentElement.classList.toggle(
        "pawpal-scrolled",
        scrollY > 30,
      );
    const cartAdded = (event: Event) => {
      if (!allowed()) return;
      const src =
        (event as CustomEvent<{ source?: HTMLElement | null }>).detail
          ?.source ?? (document.activeElement as HTMLElement | null);
      const btn = src?.closest("button");
      // Only the product-detail sheet keeps the paw burst: grid adds fly to the
      // cart instead, and the cart stepper flicks a kibble.
      if (!btn || !btn.closest(".modal") || btn.closest(".quantity")) return;
      const rect = btn.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > innerHeight) return;
      setBurst({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        id: Date.now(),
      });
      clearTimeout(expiry);
      expiry = setTimeout(() => setBurst(null), 850);
    };
    const stop = () => {
      if (!allowed()) {
        clearSurface();
        setBurst(null);
      }
    };
    const observer = new MutationObserver(stop);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-pawpal-motion"],
    });
    scroll();
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", clearSurface);
    window.addEventListener("blur", clearSurface);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pawpal:cart-added", cartAdded);
    reduced.addEventListener("change", stop);
    return () => {
      clearSurface();
      cancelAnimationFrame(frame);
      clearTimeout(expiry);
      observer.disconnect();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", clearSurface);
      window.removeEventListener("blur", clearSurface);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pawpal:cart-added", cartAdded);
      reduced.removeEventListener("change", stop);
      document.documentElement.classList.remove("pawpal-scrolled");
    };
  }, []);
  return burst
    ? createPortal(
        <div
          className="pet-paw-burst"
          key={burst.id}
          style={{ left: burst.x, top: burst.y }}
          aria-hidden="true"
        >
          <PawPrint />
          <PawPrint />
          <PawPrint />
        </div>,
        document.body,
      )
    : null;
}
