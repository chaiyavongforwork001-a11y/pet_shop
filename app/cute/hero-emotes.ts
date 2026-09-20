/* PAWPAL cute — head-anchored speech bubbles for the 3D hero. Plain DOM. */
import { claimBubble } from "./core-talk";

export type EmoteOptions = {
  ms?: number;
  variant?: "say" | "zz" | "alert" | "count";
  idle?: boolean;
};

export type WorldEmotes = {
  show(slot: number, text: string, opts?: EmoteOptions): boolean;
  place(slot: number, x: number, y: number): void;
  active(slot: number): boolean;
  anyActive(): boolean;
  resize(w: number, h: number): void;
  hideAll(): void;
  dispose(): void;
};

const SLOTS = 3;
const VARIANTS = ["ch-emote-zz", "ch-emote-alert", "ch-emote-count"];

export function createEmotes(host: HTMLElement): WorldEmotes {
  const root = document.createElement("div");
  root.className = "ch-emotes";
  root.setAttribute("aria-hidden", "true");

  const spans: HTMLSpanElement[] = [];
  const bodies: HTMLElement[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const span = document.createElement("span");
    span.className = "ch-emote";
    const body = document.createElement("i");
    body.className = "cc-bubble";
    span.appendChild(body);
    root.appendChild(span);
    spans.push(span);
    bodies.push(body);
  }
  host.appendChild(root);

  const timers: (number | null)[] = [null, null, null];
  const frames: (number | null)[] = [null, null, null];
  let W = host.clientWidth || 640;
  let H = host.clientHeight || 420;
  let dead = false;

  function stopTimers(slot: number): void {
    const t = timers[slot];
    if (t !== null) {
      clearTimeout(t);
      timers[slot] = null;
    }
    const f = frames[slot];
    if (f !== null) {
      cancelAnimationFrame(f);
      frames[slot] = null;
    }
  }

  function hide(slot: number): void {
    stopTimers(slot);
    spans[slot].classList.remove("is-on");
  }

  return {
    show(slot, text, opts) {
      if (dead) return false;
      const index = slot % SLOTS;
      const ms = opts?.ms ?? 1600;
      if (opts?.idle) {
        if (!claimBubble("idle", ms)) return false;
      } else {
        claimBubble("user", ms);
      }
      if (W < 520) {
        for (let i = 0; i < SLOTS; i++) if (i !== index) hide(i);
      }
      const span = spans[index];
      const body = bodies[index];
      body.textContent = text;
      body.classList.remove(...VARIANTS);
      if (opts?.variant === "zz") body.classList.add("ch-emote-zz");
      else if (opts?.variant === "alert") body.classList.add("ch-emote-alert");
      else if (opts?.variant === "count") body.classList.add("ch-emote-count");
      stopTimers(index);
      span.classList.remove("is-on");
      frames[index] = requestAnimationFrame(() => {
        frames[index] = null;
        span.classList.add("is-on");
      });
      timers[index] = window.setTimeout(() => {
        timers[index] = null;
        span.classList.remove("is-on");
      }, ms);
      return true;
    },

    place(slot, x, y) {
      if (dead) return;
      const index = slot % SLOTS;
      const cx = Math.min(Math.max(x, W * 0.1), W * 0.9);
      const cy = Math.min(Math.max(y, H * 0.1), H * 0.78);
      spans[index].style.transform =
        `translate3d(${cx}px,${cy}px,0) translate(-50%,-100%)`;
    },

    active(slot) {
      return !dead && spans[slot % SLOTS].classList.contains("is-on");
    },

    anyActive() {
      if (dead) return false;
      return spans.some((s) => s.classList.contains("is-on"));
    },

    resize(w, h) {
      if (w > 0) W = w;
      if (h > 0) H = h;
    },

    hideAll() {
      if (dead) return;
      for (let i = 0; i < SLOTS; i++) hide(i);
    },

    dispose() {
      if (dead) return;
      dead = true;
      for (let i = 0; i < SLOTS; i++) stopTimers(i);
      root.remove();
    },
  };
}
