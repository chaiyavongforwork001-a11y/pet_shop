"use client";
import { useEffect } from "react";
import { motionAllowed, onMotionChange, smallScreen } from "./core-motion";
import { listen } from "./core-events";
import { burst } from "./core-fx";
import { treatForPet, treatSvg } from "./core-faces";

const MAX_FLYERS = 3;
const HELLO_KEY = "pawpal-hello";

function inViewport(r: DOMRect): boolean {
  return (
    r.width > 0 &&
    r.height > 0 &&
    r.top >= -8 &&
    r.left >= 0 &&
    r.bottom <= window.innerHeight + 8 &&
    r.right <= window.innerWidth
  );
}

function readHello(): number[] {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(HELLO_KEY) || "[]");
    if (Array.isArray(raw))
      return raw.filter((n): n is number => typeof n === "number");
  } catch {}
  return [];
}

export function ShopDelight(): null {
  useEffect(() => {
    const layer = document.createElement("div");
    layer.className = "cs-fly-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);

    const live = new Set<Animation>();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    /** Track an animation so a motion toggle or unmount can cancel it. */
    const reg = (animation: Animation) => {
      live.add(animation);
      const drop = () => live.delete(animation);
      animation.addEventListener("finish", drop);
      animation.addEventListener("cancel", drop);
      return animation;
    };
    /** Track an animation whose node is thrown away when it ends. */
    const regNode = (animation: Animation, node: Element) => {
      reg(animation);
      const kill = () => node.remove();
      animation.addEventListener("finish", kill);
      animation.addEventListener("cancel", kill);
    };
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    /**
     * Three nested nodes so x, y and spin stay independent:
     * outer carries x, .cs-flyer-y carries the parabola, body carries scale+spin.
     */
    const arc = (
      cls: string,
      sx: number,
      sy: number,
      dx: number,
      dy: number,
      duration: number,
      body: HTMLElement,
      bodyFrames: Keyframe[],
      done?: () => void,
    ) => {
      const outer = document.createElement("div");
      outer.className = cls;
      outer.style.left = `${sx}px`;
      outer.style.top = `${sy}px`;
      const mid = document.createElement("div");
      mid.className = "cs-flyer-y";
      mid.appendChild(body);
      outer.appendChild(mid);
      layer.appendChild(outer);
      const peak = Math.min(-60, dy - 70);
      const flight = reg(
        outer.animate(
          [
            { transform: "translate3d(0,0,0)" },
            { transform: `translate3d(${dx}px,0,0)` },
          ],
          { duration, easing: "linear", fill: "forwards" },
        ),
      );
      reg(
        mid.animate(
          [
            { transform: "translateY(0)" },
            { offset: 0.38, transform: `translateY(${peak}px)` },
            { transform: `translateY(${dy}px)` },
          ],
          {
            duration,
            easing: "cubic-bezier(.2,.7,.4,1)",
            fill: "forwards",
          },
        ),
      );
      reg(
        body.animate(bodyFrames, {
          duration,
          easing: "ease-out",
          fill: "forwards",
        }),
      );
      flight.addEventListener("cancel", () => outer.remove());
      flight.addEventListener("finish", () => {
        outer.remove();
        done?.();
      });
      return outer;
    };

    const gulp = (cart: HTMLElement, quantity: number) => {
      if (!motionAllowed() || !cart.isConnected) return;
      reg(
        cart.animate(
          [
            { transform: "scale(1,1)" },
            { transform: "scale(1.14,.86)", offset: 0.35 },
            { transform: "scale(.94,1.08)", offset: 0.68 },
            { transform: "scale(1,1)" },
          ],
          { duration: 420, easing: "cubic-bezier(.2,.8,.2,1.4)" },
        ),
      );
      const badge = cart.querySelector("b");
      if (!badge) return;
      reg(
        badge.animate(
          [
            { transform: "none" },
            { transform: "scale(1.45) rotate(-10deg)", offset: 0.45 },
            { transform: "none" },
          ],
          { duration: 380, easing: "cubic-bezier(.2,.8,.2,1.4)" },
        ),
      );
      const br = badge.getBoundingClientRect();
      if (!br.width) return;
      const plus = document.createElement("span");
      plus.className = "cs-plus";
      plus.textContent = `+${quantity}`;
      plus.style.left = `${br.left + br.width / 2}px`;
      plus.style.top = `${br.top}px`;
      layer.appendChild(plus);
      regNode(
        plus.animate(
          [
            { transform: "translate(-50%,0) scale(.7)", opacity: 0 },
            {
              offset: 0.25,
              transform: "translate(-50%,-7px) scale(1)",
              opacity: 1,
            },
            { transform: "translate(-50%,-18px) scale(1)", opacity: 0 },
          ],
          { duration: 700, easing: "cubic-bezier(.2,.8,.3,1)" },
        ),
        plus,
      );
    };

    /* ---------- (a) add to cart ---------- */
    const offAdd = listen("pawpal:cart-added", (detail) => {
      if (!motionAllowed()) return;
      const src = detail.source ?? null;
      const quantity = detail.quantity ?? 1;
      const pet = detail.pet ?? "dog";
      if (src?.isConnected && src.matches(".add-button, .pet-action")) {
        reg(
          src.animate(
            [
              { transform: "scale(1,1)" },
              { transform: "scale(1.22,.78)", offset: 0.25 },
              { transform: "scale(.9,1.12)", offset: 0.5 },
              { transform: "scale(1.04,.96)", offset: 0.75 },
              { transform: "scale(1,1)" },
            ],
            { duration: 520, easing: "ease-out", composite: "add" },
          ),
        );
      }
      const shaded = !!document.querySelector(".modal-shade");
      const cart = document.querySelector<HTMLElement>(
        ".header .cart-button",
      );
      const cr = cart?.getBoundingClientRect();
      if (!cart || !cr || cr.width <= 0) return;
      const rect =
        src?.isConnected && !src.closest(".modal")
          ? src.getBoundingClientRect()
          : null;
      const canFly =
        !shaded &&
        !!rect &&
        inViewport(rect) &&
        layer.querySelectorAll(".cs-flyer").length < MAX_FLYERS;
      if (!canFly) {
        if (!shaded) gulp(cart, quantity);
        return;
      }
      const sx = rect.left + rect.width / 2;
      const sy = rect.top + rect.height / 2;
      const dx = cr.left + cr.width / 2 - sx;
      const dy = cr.top + cr.height / 2 - sy;
      const small = smallScreen();
      const body = document.createElement("div");
      body.className = "cs-flyer-body";
      if (detail.image) {
        const img = document.createElement("img");
        img.src = detail.image;
        img.alt = "";
        img.decoding = "async";
        img.onerror = () => {
          body.innerHTML = treatSvg("paw", 26);
        };
        body.appendChild(img);
      } else {
        body.innerHTML = treatSvg("paw", 26);
      }
      const flyer = arc(
        "cs-flyer",
        sx,
        sy,
        dx,
        dy,
        small ? 560 : 620,
        body,
        [
          { transform: "scale(1) rotate(-18deg)", opacity: 1 },
          { offset: 0.3, transform: "scale(1.12) rotate(-6deg)", opacity: 1 },
          { offset: 0.9, transform: "scale(.5) rotate(288deg)", opacity: 1 },
          { transform: "scale(.32) rotate(360deg)", opacity: 0 },
        ],
        () => gulp(cart, quantity),
      );
      flyer.dataset.pet = pet;
      if (small) flyer.classList.add("cs-flyer-sm");
    });

    /* ---------- (b) favourites ---------- */
    const offFav = listen("pawpal:favorite", (detail) => {
      if (!motionAllowed()) return;
      const src = detail.source ?? null;
      if (!src?.isConnected) return;
      const r = src.getBoundingClientRect();
      if (!r.width) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const svg = src.querySelector("svg");
      const small = smallScreen();
      if (detail.saved) {
        if (svg)
          reg(
            svg.animate(
              [
                { transform: "scale(1)" },
                {
                  offset: 0.3,
                  transform: "scale(1.35) rotate(-12deg)",
                },
                { offset: 0.55, transform: "scale(.9)" },
                { offset: 0.8, transform: "scale(1.08)" },
                { transform: "scale(1)" },
              ],
              { duration: 460, easing: "cubic-bezier(.2,.8,.2,1.4)" },
            ),
          );
        burst({
          x: cx,
          y: cy,
          kinds: [treatForPet(detail.pet), "heart"],
          count: small ? 5 : 7,
          spread: 150,
          distance: [42, 70],
          size: small ? 16 : 18,
        });
        const fav = document.querySelector<HTMLElement>(
          ".header-actions .fav-button",
        );
        const fr = fav?.getBoundingClientRect();
        if (
          fav &&
          fr &&
          fr.width > 0 &&
          !document.querySelector(".modal-shade")
        ) {
          const heart = document.createElement("div");
          heart.className = "cs-heart-body";
          heart.innerHTML = treatSvg("heart", 20);
          arc(
            "cs-heart-fly",
            cx,
            cy,
            fr.left + fr.width / 2 - cx,
            fr.top + fr.height / 2 - cy,
            520,
            heart,
            [
              { transform: "scale(.6)", opacity: 0 },
              { offset: 0.15, transform: "scale(1.1)", opacity: 1 },
              { offset: 0.88, transform: "scale(.9) rotate(18deg)", opacity: 1 },
              { transform: "scale(.4) rotate(26deg)", opacity: 0 },
            ],
            () => {
              const beat = fav.querySelector("svg");
              if (beat && motionAllowed())
                reg(
                  beat.animate(
                    [
                      { transform: "scale(1)" },
                      { offset: 0.25, transform: "scale(1.25)" },
                      { offset: 0.5, transform: "scale(.95)" },
                      { offset: 0.75, transform: "scale(1.12)" },
                      { transform: "scale(1)" },
                    ],
                    { duration: 500, easing: "cubic-bezier(.2,.8,.2,1.4)" },
                  ),
                );
            },
          );
        }
        return;
      }
      if (svg)
        reg(
          svg.animate(
            [
              { transform: "none" },
              {
                offset: 0.4,
                transform: "rotate(16deg) translateY(2px) scale(.86)",
              },
              { transform: "none" },
            ],
            { duration: 420, easing: "cubic-bezier(.2,.8,.3,1.1)" },
          ),
        );
      const crumb = document.createElement("span");
      crumb.className = "cs-crumb";
      crumb.innerHTML = treatSvg("heart", 12);
      crumb.style.left = `${cx}px`;
      crumb.style.top = `${cy}px`;
      layer.appendChild(crumb);
      regNode(
        crumb.animate(
          [
            { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 0.9 },
            {
              transform: "translate(-50%,calc(-50% + 26px)) rotate(38deg)",
              opacity: 0,
            },
          ],
          { duration: 600, easing: "cubic-bezier(.4,0,.8,1)" },
        ),
        crumb,
      );
    });

    /* ---------- (c) quantity steppers ---------- */
    const onQuantity = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>(".quantity button");
      if (!button) return;
      const box = button.parentElement;
      if (!box) return;
      const up = button !== box.firstElementChild;
      box.dataset.csDir = up ? "up" : "down";
      if (!motionAllowed() || button.disabled) return;
      const number = box.querySelector<HTMLElement>(".cs-qty, input");
      const nr = number?.getBoundingClientRect();
      if (up && number && nr && nr.width) {
        const br = button.getBoundingClientRect();
        const sx = br.left + br.width / 2;
        const sy = br.top;
        const dx = nr.left + nr.width / 2 - sx;
        const dy = nr.top + nr.height / 2 - sy;
        const kibble = document.createElement("span");
        kibble.className = "cs-kibble";
        kibble.style.left = `${sx}px`;
        kibble.style.top = `${sy}px`;
        layer.appendChild(kibble);
        regNode(
          kibble.animate(
            [
              { transform: "translate(0,0) scale(.5)", opacity: 0 },
              {
                offset: 0.2,
                transform: `translate(${dx * 0.2}px,${dy * 0.2 - 14}px) scale(1)`,
                opacity: 1,
              },
              {
                offset: 0.62,
                transform: `translate(${dx * 0.62}px,${dy * 0.62 - 9}px) scale(1)`,
                opacity: 1,
              },
              {
                transform: `translate(${dx}px,${dy}px) scale(.55)`,
                opacity: 0,
              },
            ],
            { duration: 380, easing: "cubic-bezier(.2,.7,.4,1)" },
          ),
          kibble,
        );
      }
      if (number instanceof HTMLInputElement)
        reg(
          number.animate(
            [
              {
                transform: `translateY(${up ? 5 : -5}px)`,
                opacity: 0.4,
              },
              { transform: "none", opacity: 1 },
            ],
            { duration: 220, easing: "cubic-bezier(.2,.8,.3,1.2)" },
          ),
        );
    };
    document.addEventListener("click", onQuantity, true);

    /* ---------- (d) free shipping reached ---------- */
    const offFree = listen("pawpal:free-shipping", () => {
      if (!motionAllowed()) return;
      const house = document.querySelector(".cs-house");
      if (!house) return;
      const r = house.getBoundingClientRect();
      if (!r.width) return;
      burst({
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        kinds: ["paw", "heart"],
        count: 10,
        spread: 360,
        distance: [30, 60],
        size: 14,
      });
    });

    /* ---------- (e) pet cards say hello on the phone carousel ---------- */
    let hello: IntersectionObserver | null = null;
    if (window.matchMedia("(max-width: 640px)").matches) {
      const grid = document.querySelector<HTMLElement>(".pet-grid");
      const cards = grid
        ? Array.from(grid.querySelectorAll<HTMLElement>(".pet-card"))
        : [];
      if (grid && cards.length) {
        const seen = readHello();
        hello = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const card = entry.target as HTMLElement;
              const index = cards.indexOf(card);
              if (index < 0 || seen.includes(index)) continue;
              seen.push(index);
              try {
                sessionStorage.setItem(HELLO_KEY, JSON.stringify(seen));
              } catch {}
              hello?.unobserve(card);
              card.classList.add("cs-hello-on");
              later(() => card.classList.remove("cs-hello-on"), 2200);
            }
          },
          { root: grid, threshold: 0.8 },
        );
        for (const card of cards) hello.observe(card);
      }
    }

    const stopAll = () => {
      for (const animation of Array.from(live)) animation.cancel();
      live.clear();
      layer.replaceChildren();
    };
    const offMotion = onMotionChange((allowed) => {
      if (!allowed) stopAll();
    });

    return () => {
      offAdd();
      offFav();
      offFree();
      offMotion();
      hello?.disconnect();
      document.removeEventListener("click", onQuantity, true);
      for (const id of timers) clearTimeout(id);
      timers.clear();
      stopAll();
      layer.remove();
    };
  }, []);
  return null;
}
