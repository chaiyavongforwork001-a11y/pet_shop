import { motionAllowed, onMotionChange, smallScreen } from './core-motion';
import { treatSvg } from './core-faces';
import type { TreatKind } from './core-faces';

export type BurstOptions = {
  x: number;
  y: number;
  kinds: TreatKind[];
  count?: number;
  spread?: number;
  angle?: number;
  distance?: [number, number];
  size?: number;
  duration?: number;
  gravity?: number;
};

const MAX_PIECES = 48;
const live = new Set<Animation>();

let layer: HTMLDivElement | null = null;
let subscribed = false;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randOf(range: [number, number]): number {
  return rand(range[0], range[1]);
}

function ensureLayer(): HTMLDivElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  if (!subscribed) {
    subscribed = true;
    onMotionChange((allowed) => {
      if (!allowed) clearFx();
    });
  }
  if (layer && layer.isConnected) return layer;
  const node = document.createElement('div');
  node.className = 'cc-fx';
  node.setAttribute('aria-hidden', 'true');
  document.body.appendChild(node);
  layer = node;
  return node;
}

function makePiece(
  host: HTMLDivElement,
  kind: TreatKind,
  size: number,
  left: string,
  top: string,
): HTMLSpanElement | null {
  if (host.childElementCount >= MAX_PIECES) return null;
  const piece = document.createElement('span');
  piece.className = 'cc-fx-piece';
  piece.innerHTML = treatSvg(kind, size);
  piece.style.left = left;
  piece.style.top = top;
  piece.style.margin = `${-size / 2}px`;
  host.appendChild(piece);
  return piece;
}

function track(piece: HTMLElement, animation: Animation): void {
  live.add(animation);
  const done = () => {
    live.delete(animation);
    piece.remove();
  };
  animation.onfinish = done;
  animation.oncancel = done;
}

export function burst(o: BurstOptions): void {
  if (!motionAllowed()) return;
  const host = ensureLayer();
  if (!host || !o.kinds.length) return;
  let n = o.count ?? 6;
  if (smallScreen()) n = Math.min(n, 5);
  const size = o.size ?? 18;
  const spread = o.spread ?? 150;
  const base = o.angle ?? -90;
  const duration = o.duration ?? 850;
  const gravity = o.gravity ?? 14;
  for (let i = 0; i < n; i += 1) {
    const ang =
      base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0) + rand(-8, 8);
    const dist = randOf(o.distance ?? [42, 72]);
    const rad = (ang * Math.PI) / 180;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist;
    const rot = rand(-40, 40) + (Math.random() < 0.5 ? -120 : 120);
    const kind = o.kinds[i % o.kinds.length];
    const piece = makePiece(host, kind, size, `${o.x}px`, `${o.y}px`);
    if (!piece) break;
    const animation = piece.animate(
      [
        { transform: 'translate(0,0) scale(.3)', opacity: 0 },
        {
          offset: 0.2,
          opacity: 1,
          transform: `translate(${dx * 0.35}px,${dy * 0.35}px) scale(1.1) rotate(${rot * 0.3}deg)`,
        },
        {
          offset: 0.65,
          opacity: 1,
          transform: `translate(${dx}px,${dy}px) scale(1) rotate(${rot * 0.7}deg)`,
        },
        {
          opacity: 0,
          transform: `translate(${dx}px,${dy + gravity}px) scale(.85) rotate(${rot}deg)`,
        },
      ],
      {
        duration,
        delay: i * 25,
        easing: 'cubic-bezier(.14,.75,.4,1)',
        fill: 'both',
      },
    );
    track(piece, animation);
  }
}

export function rain(o: {
  kinds: TreatKind[];
  count?: number;
  duration?: [number, number];
}): void {
  if (!motionAllowed()) return;
  const host = ensureLayer();
  if (!host || !o.kinds.length) return;
  const n = smallScreen() ? 10 : (o.count ?? 18);
  for (let i = 0; i < n; i += 1) {
    const size = rand(20, 28);
    const kind = o.kinds[i % o.kinds.length];
    const piece = makePiece(
      host,
      kind,
      size,
      `${rand(2, 98).toFixed(2)}vw`,
      '-40px',
    );
    if (!piece) break;
    const sway = rand(10, 18) * (Math.random() < 0.5 ? -1 : 1);
    const spin = rand(140, 220) * (Math.random() < 0.5 ? -1 : 1);
    const animation = piece.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 0 },
        { offset: 0.08, opacity: 1 },
        {
          offset: 0.33,
          transform: `translate(${sway}px, 33vh) rotate(${spin * 0.33}deg)`,
        },
        {
          offset: 0.66,
          transform: `translate(${-sway}px, 66vh) rotate(${spin * 0.66}deg)`,
        },
        {
          opacity: 1,
          transform: `translate(0, calc(100vh + 80px)) rotate(${spin}deg)`,
        },
      ],
      {
        duration: randOf(o.duration ?? [1400, 2200]),
        delay: rand(0, 300),
        easing: 'cubic-bezier(.3,.1,.6,1)',
        fill: 'both',
      },
    );
    track(piece, animation);
  }
}

export function clearFx(): void {
  for (const animation of Array.from(live)) {
    live.delete(animation);
    animation.cancel();
  }
  live.clear();
  if (layer) layer.replaceChildren();
}
