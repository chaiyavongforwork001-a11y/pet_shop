'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { emit, listen, petNameTh } from './core-events';
import type { FaceKind } from './core-events';
import { PetFace, PetRunner, treatForPet } from './core-faces';
import { burst, rain } from './core-fx';
import {
  chatOpen,
  isTypingTarget,
  motionAllowed,
  onMotionChange,
  uiBusy,
} from './core-motion';

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];

const WORDS: { kind: FaceKind; words: string[] }[] = [
  { kind: 'dog', words: ['woof', 'bark', 'โฮ่ง', 'หมา'] },
  { kind: 'cat', words: ['meow', 'เหมียว', 'เมี้ยว', 'แมว'] },
  { kind: 'rabbit', words: ['bunny', 'carrot', 'กระต่าย'] },
];

const EGG_LINES: Record<FaceKind, string> = {
  dog: 'โฮ่ง! รู้รหัสลับด้วยเหรอ ♡',
  cat: 'เมี้ยว~ เจอกันแล้วนะ',
  rabbit: 'ดุ๊กดิ๊ก ๆ ขอแครอทหน่อย',
};
const COMBO_LINE = 'โอ้โห แฟนพันธุ์แท้เลย ♡';
const PARADE_LINE = 'ขบวนเพื่อนซี้มาแล้ว! ♡';
const PARADE_WORD = 'pawpal';
const MARCHERS: FaceKind[] = ['dog', 'cat', 'rabbit'];
const FLAGS = ['#f8e98e', '#e9dbfd', '#f3a8ad'];

const BUNTING = Array.from({ length: 7 }, (_, i) => {
  const t = 0.08 + i * 0.14;
  const u = 1 - t;
  const x = u * u * u * 2 + 3 * u * u * t * 60 + 3 * u * t * t * 270 + t * t * t * 328;
  const y = u * u * u * 6 + 3 * u * u * t * 26 + 3 * u * t * t * 26 + t * t * t * 6;
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    fill: FLAGS[i % FLAGS.length],
  };
});

type Egg = { kind: FaceKind; combo: boolean; id: number; still: boolean };
type Parade = { id: number; still: boolean };

export function CoreSecrets() {
  const [egg, setEgg] = useState<Egg | null>(null);
  const [parade, setParade] = useState<Parade | null>(null);
  const [announce, setAnnounce] = useState('');

  const eggRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const trainRef = useRef<HTMLDivElement>(null);
  const eggTimer = useRef(0);
  const stillTimer = useRef(0);
  const eggId = useRef(0);
  const paradeId = useRef(0);
  const lastEgg = useRef(0);
  const lastParade = useRef(0);
  const konami = useRef(0);
  const buffer = useRef('');
  const combos = useRef<Record<FaceKind, number[]>>({
    dog: [],
    cat: [],
    rabbit: [],
  });

  const startParade = useCallback((from: 'keys' | 'word' | 'mascot') => {
    const now = Date.now();
    if (now - lastParade.current < 12000 || uiBusy()) return;
    lastParade.current = now;
    paradeId.current += 1;
    const still = !motionAllowed();
    setParade({ id: paradeId.current, still });
    setAnnounce('ขบวนพาเหรดเพื่อนซี้กำลังเดินผ่าน');
    if (from !== 'mascot') emit('pawpal:parade', { from });
    if (still) {
      window.clearTimeout(stillTimer.current);
      stillTimer.current = window.setTimeout(() => setParade(null), 2500);
    }
  }, []);

  const popEgg = useCallback((kind: FaceKind) => {
    const now = Date.now();
    if (now - lastEgg.current < 1500) return;
    lastEgg.current = now;

    const recent = [...combos.current[kind], now].filter(
      (t) => now - t <= 10000,
    );
    const combo = recent.length >= 3;
    combos.current[kind] = combo ? [] : recent;

    const allowed = motionAllowed();
    eggId.current += 1;
    setEgg({ kind, combo, id: eggId.current, still: !allowed });
    setAnnounce(`เจอรหัสลับ! ${petNameTh[kind]} มาทักทายแล้ว`);
    emit('pawpal:secret', { pet: kind, combo });
    if (allowed) rain({ kinds: [treatForPet(kind), 'heart'], count: 12 });

    window.clearTimeout(eggTimer.current);
    eggTimer.current = window.setTimeout(
      () => setEgg(null),
      allowed ? 2800 : 2000,
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.isComposing ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        isTypingTarget(e.target) ||
        uiBusy() ||
        chatOpen()
      )
        return;

      if (e.code === KONAMI[konami.current]) {
        konami.current += 1;
        if (konami.current === KONAMI.length) {
          konami.current = 0;
          startParade('keys');
        }
      } else {
        konami.current = e.code === KONAMI[0] ? 1 : 0;
      }

      if (e.key.length !== 1) return;
      buffer.current = (buffer.current + e.key.toLowerCase()).slice(-16);
      if (buffer.current.endsWith(PARADE_WORD)) {
        buffer.current = '';
        startParade('word');
        return;
      }
      for (const entry of WORDS) {
        if (entry.words.some((w) => buffer.current.endsWith(w))) {
          buffer.current = '';
          popEgg(entry.kind);
          return;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [popEgg, startParade]);

  useEffect(
    () =>
      listen('pawpal:parade', (d) => {
        if (d.from === 'mascot') startParade('mascot');
      }),
    [startParade],
  );

  useEffect(
    () => () => {
      window.clearTimeout(eggTimer.current);
      window.clearTimeout(stillTimer.current);
    },
    [],
  );

  /* egg pop-in */
  useLayoutEffect(() => {
    const node = eggRef.current;
    if (!egg || egg.still || !node) return;
    const pop = node.animate(
      [
        { transform: 'translateY(140%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1.4)', fill: 'both' },
    );
    const face = node.querySelector('.cc-face');
    const spin =
      egg.combo && face
        ? face.animate(
            [{ rotate: '0deg' }, { rotate: '360deg' }],
            { duration: 800, easing: 'cubic-bezier(.2,.75,.3,1)' },
          )
        : null;
    return () => {
      pop.cancel();
      spin?.cancel();
    };
  }, [egg]);

  /* parade march */
  useLayoutEffect(() => {
    const band = bandRef.current;
    const train = trainRef.current;
    if (!parade || parade.still || !band || !train) return;
    const width = window.innerWidth;
    const rect = band.getBoundingClientRect();
    const march = train.animate(
      [
        { transform: 'translateX(-460px)' },
        { transform: `translateX(${width + 40}px)` },
      ],
      { duration: 6500, easing: 'linear', fill: 'both' },
    );
    march.onfinish = () => setParade(null);
    burst({
      x: 40,
      y: rect.top + rect.height / 2,
      kinds: ['heart', 'paw'],
      count: 7,
    });
    return () => march.cancel();
  }, [parade]);

  useEffect(
    () =>
      onMotionChange((allowed) => {
        if (allowed) return;
        setEgg(null);
        setParade(null);
      }),
    [],
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {egg && (
        <div className="cc-egg" ref={eggRef} aria-hidden="true">
          <span className="cc-bubble">
            {egg.combo ? COMBO_LINE : EGG_LINES[egg.kind]}
          </span>
          <PetFace
            kind={egg.kind}
            mood={egg.combo ? 'love' : 'happy'}
            size={96}
            className="cc-anim-blink"
          />
        </div>
      )}
      {parade && !parade.still && (
        <div className="cc-parade" ref={bandRef} aria-hidden="true">
          <div className="cc-parade-train" ref={trainRef}>
            <svg
              className="cc-parade-bunting"
              width={330}
              height={34}
              viewBox="0 0 330 34"
              focusable="false"
            >
              <path
                d="M2 6C60 26 270 26 328 6"
                fill="none"
                stroke="#30233f"
                strokeWidth={1.6}
                strokeLinecap="round"
              />
              {BUNTING.map((flag, i) => (
                <path
                  key={i}
                  d={`M${flag.x - 7} ${flag.y}L${flag.x + 7} ${flag.y}L${flag.x} ${flag.y + 16}Z`}
                  fill={flag.fill}
                  stroke="#30233f"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                />
              ))}
            </svg>
            {MARCHERS.map((kind, m) => (
              <span
                key={kind}
                className="cc-marcher cc-running"
                style={{ animationDelay: `${m * 0.12}s` }}
              >
                <PetRunner kind={kind} width={64} />
              </span>
            ))}
            <span className="cc-bubble">{PARADE_LINE}</span>
          </div>
        </div>
      )}
      {parade && parade.still && (
        <div className="cc-parade-static" aria-hidden="true">
          <div className="cc-parade-static-row">
            {MARCHERS.map((kind) => (
              <PetFace key={kind} kind={kind} mood="happy" size={46} />
            ))}
          </div>
          <b>{PARADE_LINE}</b>
        </div>
      )}
      <span className="cc-sr" role="status" aria-live="polite">
        {announce}
      </span>
    </>,
    document.body,
  );
}
