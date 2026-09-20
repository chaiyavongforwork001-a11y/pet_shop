'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { emit, petNameTh } from './core-events';
import type { FaceKind } from './core-events';
import { PetFace } from './core-faces';
import type { FaceMood } from './core-faces';
import { burst } from './core-fx';
import { motionAllowed, onMotionChange } from './core-motion';
import { claimBubble } from './core-talk';

const ROTATION: FaceKind[] = ['dog', 'cat', 'rabbit'];
const PAT_LINES = [
  'งื้ออ ชอบจัง ♡',
  'อีกนิดนึงน้า',
  'วันนี้มีขนมไหม?',
  'หัวฟูหมดแล้ว~',
  'เพื่อนซี้ที่สุดเลย!',
];
const KEY_KIND = 'pawpal-mascot-kind';
const KEY_HIDDEN = 'pawpal-mascot-hidden';
const KEY_PATS = 'pawpal-pats';
const KEY_GOLD = 'pawpal-mascot-gold';

function readStore(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

export function PetMascot({
  pet,
  welcome,
}: {
  pet: string;
  welcome: number;
}) {
  const [rotated] = useState<FaceKind>(() => {
    const index = Number(readStore(KEY_KIND)) || 0;
    return ROTATION[((index % 3) + 3) % 3];
  });
  const [hidden, setHidden] = useState(() => readStore(KEY_HIDDEN) === '1');
  const [gold, setGold] = useState(() => readStore(KEY_GOLD) === '1');
  const [mood, setMood] = useState<FaceMood>('idle');
  const [line, setLine] = useState<string | null>(null);
  const [lineId, setLineId] = useState(0);
  const [announce, setAnnounce] = useState('');
  const [phase, setPhase] = useState<'hold' | 'in' | 'shown'>('hold');
  const [footerNear, setFooterNear] = useState(false);
  const [rushing, setRushing] = useState(false);

  const moodRef = useRef<FaceMood>('idle');
  const timers = useRef<number[]>([]);
  const anims = useRef<Animation[]>([]);
  const lineTimer = useRef(0);
  const lineIndex = useRef(0);
  const patTimes = useRef<number[]>([]);
  const patRef = useRef<HTMLButtonElement>(null);

  const kind: FaceKind =
    pet === 'cat'
      ? 'cat'
      : pet === 'exotic' || pet === 'rabbit'
        ? 'rabbit'
        : pet === 'dog'
          ? 'dog'
          : rotated;

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const setFace = useCallback((next: FaceMood) => {
    moodRef.current = next;
    setMood(next);
  }, []);

  const say = useCallback(
    (text: string, ms = 2400) => {
      setLine(text);
      setLineId((n) => n + 1);
      window.clearTimeout(lineTimer.current);
      lineTimer.current = window.setTimeout(() => setLine(null), ms);
    },
    [],
  );

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
      anims.current.forEach((a) => a.cancel());
      anims.current = [];
      window.clearTimeout(lineTimer.current);
    },
    [],
  );

  useEffect(() => {
    const index = Number(readStore(KEY_KIND)) || 0;
    writeStore(KEY_KIND, String((index + 1) % 3));
  }, []);

  /* arrival — the motion attribute starts as 'off', so settle it from a callback */
  useEffect(() => {
    if (hidden) return;
    let settled = false;
    let hold = 0;
    let done = 0;
    const settle = (allowed: boolean) => {
      if (settled) return;
      settled = true;
      if (!allowed) {
        setPhase('shown');
        return;
      }
      hold = window.setTimeout(() => {
        setPhase('in');
        done = window.setTimeout(() => setPhase('shown'), 720);
      }, 2200);
    };
    const stop = onMotionChange((allowed) => settle(allowed));
    const first = window.setTimeout(() => settle(motionAllowed()), 320);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(hold);
      window.clearTimeout(done);
      stop();
    };
  }, [hidden]);

  /* welcome back after a long tab switch */
  useEffect(() => {
    if (!welcome) return;
    const start = window.setTimeout(() => {
      claimBubble('user', 1800);
      setFace('love');
      setLine('กลับมาแล้ว! น้อง ๆ ดีใจสุด ๆ ♡');
      setLineId((n) => n + 1);
      window.clearTimeout(lineTimer.current);
      lineTimer.current = window.setTimeout(() => setLine(null), 2600);
    }, 0);
    const back = window.setTimeout(() => {
      if (moodRef.current === 'love') setFace('idle');
    }, 1600);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(back);
    };
  }, [welcome, setFace]);

  /* nap */
  useEffect(() => {
    if (hidden) return;
    let nap = 0;
    let lastWrite = 0;
    const arm = () => {
      window.clearTimeout(nap);
      nap = window.setTimeout(() => {
        if (moodRef.current === 'idle') setFace('sleepy');
      }, 40000);
    };
    const activity = () => {
      const now = Date.now();
      if (now - lastWrite < 1000) return;
      lastWrite = now;
      if (moodRef.current === 'sleepy') {
        setFace('surprised');
        after(400, () => {
          if (moodRef.current === 'surprised') setFace('idle');
        });
      }
      arm();
    };
    arm();
    window.addEventListener('pointerdown', activity, { passive: true });
    window.addEventListener('keydown', activity, { passive: true });
    window.addEventListener('scroll', activity, { passive: true });
    return () => {
      window.clearTimeout(nap);
      window.removeEventListener('pointerdown', activity);
      window.removeEventListener('keydown', activity);
      window.removeEventListener('scroll', activity);
    };
  }, [hidden, setFace, after]);

  /* tuck: footer fineprint in view, or a fast scroll */
  useEffect(() => {
    if (hidden) return;
    const target = document.querySelector('.footer-fineprint');
    let observer: IntersectionObserver | null = null;
    if (target) {
      observer = new IntersectionObserver(
        (entries) => setFooterNear(entries.some((e) => e.isIntersecting)),
        { threshold: 0 },
      );
      observer.observe(target);
    }
    let lastY = window.scrollY;
    let lastAt = performance.now();
    let calm = 0;
    const onScroll = () => {
      const now = performance.now();
      const dt = now - lastAt;
      if (dt > 0) {
        const speed = Math.abs(window.scrollY - lastY) / dt;
        if (speed > 2.5) setRushing(true);
      }
      lastY = window.scrollY;
      lastAt = now;
      window.clearTimeout(calm);
      calm = window.setTimeout(() => setRushing(false), 700);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer?.disconnect();
      window.clearTimeout(calm);
      window.removeEventListener('scroll', onScroll);
    };
  }, [hidden]);

  const pat = useCallback(() => {
    const pats = (Number(readStore(KEY_PATS)) || 0) + 1;
    writeStore(KEY_PATS, String(pats));

    const wasSleeping = moodRef.current === 'sleepy';
    if (wasSleeping) {
      setFace('surprised');
      after(400, () => setFace('happy'));
      after(1600, () => {
        if (moodRef.current === 'happy') setFace('idle');
      });
    } else {
      setFace('happy');
      after(1200, () => {
        if (moodRef.current === 'happy') setFace('idle');
      });
    }

    claimBubble('user', 1400);
    const text = PAT_LINES[lineIndex.current % PAT_LINES.length];
    lineIndex.current += 1;
    say(text, 2000);

    const node = patRef.current;
    if (motionAllowed() && node) {
      const face = node.querySelector('.cc-face');
      if (face) {
        const squish = face.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.12, .9)' },
            { transform: 'scale(.96, 1.05)' },
            { transform: 'scale(1)' },
          ],
          { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1.4)' },
        );
        anims.current.push(squish);
        squish.onfinish = () => {
          anims.current = anims.current.filter((a) => a !== squish);
        };
      }
      const rect = node.getBoundingClientRect();
      burst({
        x: rect.left + rect.width / 2,
        y: rect.top + 10,
        kinds: ['heart'],
        count: 3,
        spread: 70,
        distance: [30, 50],
      });
    }

    const now = Date.now();
    patTimes.current = [...patTimes.current, now].filter(
      (t) => now - t <= 4000,
    );
    if (patTimes.current.length >= 5) {
      patTimes.current = [];
      say('ไปเรียกเพื่อน ๆ มาเดินพาเหรดกัน!', 2600);
      emit('pawpal:parade', { from: 'mascot' });
      setAnnounce('ขบวนพาเหรดเพื่อนซี้มาแล้ว');
    } else if (pats === 10) {
      setGold(true);
      writeStore(KEY_GOLD, '1');
      setAnnounce('น้องได้โบว์ทองแล้ว');
    } else if (pats === 1) {
      setAnnounce('น้องชอบให้ลูบหัว');
    }
  }, [after, say, setFace]);

  const hide = useCallback(() => {
    writeStore(KEY_HIDDEN, '1');
    setHidden(true);
  }, []);

  if (hidden || typeof document === 'undefined') return null;

  const tucked = footerNear || rushing;
  const cls = [
    'cc-mascot',
    `is-${mood}`,
    tucked ? 'is-tucked' : '',
    phase === 'hold' ? 'is-hold' : '',
    phase === 'in' ? 'is-arriving' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div className={cls}>
      <button
        ref={patRef}
        className="cc-mascot-pat"
        aria-label={`ลูบหัว${petNameTh[kind]}`}
        onClick={pat}
      >
        <span className="cc-mascot-arch" aria-hidden="true" />
        <PetFace
          kind={kind}
          mood={mood}
          size={64}
          className="cc-anim-blink"
        />
        {gold && <i className="cc-mascot-ribbon" aria-hidden="true" />}
      </button>
      <button
        className="cc-mascot-hide"
        aria-label="ซ่อนน้องมาสคอต"
        onClick={hide}
      >
        ×
      </button>
      {line && (
        <span
          key={lineId}
          className="cc-bubble is-pop cc-mascot-bubble"
          aria-hidden="true"
        >
          {line}
        </span>
      )}
      {mood === 'sleepy' && (
        <span className="cc-zz cc-mascot-zz" aria-hidden="true">
          <i>z</i>
          <i>z</i>
        </span>
      )}
      <span className="cc-sr" role="status" aria-live="polite">
        {announce}
      </span>
    </div>,
    document.body,
  );
}
