'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { FaceKind } from './core-events';
import { PetFace } from './core-faces';
import {
  chatOpen,
  motionAllowed,
  onMotionChange,
  smallScreen,
  uiBusy,
} from './core-motion';
import { claimBubble } from './core-talk';

type PeekConfig = {
  sel: string;
  kind: FaceKind;
  side: 'left' | 'right';
  line: string;
  desktopOnly?: boolean;
};

const CONFIG: PeekConfig[] = [
  {
    sel: '.pet-section',
    kind: 'dog',
    side: 'left',
    line: 'เลือกของให้ฉันก่อนน้า!',
  },
  {
    sel: '#shop',
    kind: 'cat',
    side: 'right',
    line: 'อันนี้หอมจัง…',
    desktopOnly: true,
  },
  {
    sel: '.care-story',
    kind: 'rabbit',
    side: 'left',
    line: 'ถามได้ทุกเรื่องเลยนะ',
  },
  {
    sel: '.service-strip',
    kind: 'dog',
    side: 'right',
    line: 'ส่งถึงบ้านเลย โฮ่ง!',
  },
];

const FUR: Record<FaceKind, string> = {
  dog: '#e4a157',
  cat: '#a4a4bc',
  rabbit: '#fff7e7',
};

const KEY = 'pawpal-peeked';
const MAX_PEEKS = 3;
const IN_MS = 520;
const HOLD_MS = 2400;
const OUT_MS = 420;
const TOTAL = IN_MS + HOLD_MS + OUT_MS;

type Peek = { cfg: PeekConfig; side: 'left' | 'right'; id: number };

export function CorePeeks() {
  const [peek, setPeek] = useState<Peek | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef(false);

  useEffect(() => {
    const visible = new Set<string>();
    let done: string[] = [];
    let lastAt = 0;
    let nextId = 0;
    try {
      const raw = sessionStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed))
        done = parsed.filter((s): s is string => typeof s === 'string');
    } catch {}

    const named = new Map<Element, string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sel = named.get(entry.target);
          if (!sel) return;
          if (entry.isIntersecting) visible.add(sel);
          else visible.delete(sel);
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    CONFIG.forEach((cfg) => {
      const node = document.querySelector(cfg.sel);
      if (!node) return;
      named.set(node, cfg.sel);
      observer.observe(node);
    });

    let idle = 0;
    const attempt = () => {
      if (liveRef.current || !motionAllowed() || uiBusy()) return;
      if (done.length >= MAX_PEEKS) return;
      if (Date.now() - lastAt < 10000) return;
      const small = smallScreen();
      const cfg = CONFIG.find(
        (c) =>
          visible.has(c.sel) &&
          !done.includes(c.sel) &&
          !(c.desktopOnly && small),
      );
      if (!cfg) return;
      if (!claimBubble('idle', 3300)) return;
      done = [...done, cfg.sel];
      try {
        sessionStorage.setItem(KEY, JSON.stringify(done));
      } catch {}
      lastAt = Date.now();
      nextId += 1;
      liveRef.current = true;
      setPeek({
        cfg,
        side: cfg.side === 'right' && chatOpen() ? 'left' : cfg.side,
        id: nextId,
      });
    };
    const onScroll = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(attempt, 450);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    idle = window.setTimeout(attempt, 1400);

    const stopMotion = onMotionChange((allowed) => {
      if (allowed) return;
      liveRef.current = false;
      setPeek(null);
    });

    return () => {
      observer.disconnect();
      window.clearTimeout(idle);
      window.removeEventListener('scroll', onScroll);
      stopMotion();
      named.clear();
      visible.clear();
    };
  }, []);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!peek || !node) return;
    const hidden =
      peek.side === 'left' ? 'translateX(-105%)' : 'translateX(105%)';
    const shown =
      peek.side === 'left'
        ? 'translateX(-28%) rotate(12deg)'
        : 'translateX(28%) rotate(-12deg)';
    const show = node.animate(
      [
        { transform: hidden, easing: 'cubic-bezier(.2,.8,.2,1.4)' },
        { offset: IN_MS / TOTAL, transform: shown, easing: 'linear' },
        {
          offset: (IN_MS + HOLD_MS) / TOTAL,
          transform: shown,
          easing: 'ease-in',
        },
        { offset: 1, transform: hidden },
      ],
      { duration: TOTAL, fill: 'both' },
    );
    show.onfinish = () => {
      liveRef.current = false;
      setPeek(null);
    };
    return () => show.cancel();
  }, [peek]);

  if (typeof document === 'undefined' || !peek) return null;

  return createPortal(
    <div
      ref={rootRef}
      className={`cc-peek cc-peek-${peek.side}`}
      aria-hidden="true"
      style={{ '--cc-peek-fur': FUR[peek.cfg.kind] } as CSSProperties}
    >
      <span className="cc-bubble">{peek.cfg.line}</span>
      <PetFace
        kind={peek.cfg.kind}
        mood="happy"
        size={96}
        className="cc-peek-face cc-anim-blink"
      />
      <span className="cc-peek-paws">
        <i className="cc-peek-paw" />
        <i className="cc-peek-paw" />
      </span>
    </div>,
    document.body,
  );
}
