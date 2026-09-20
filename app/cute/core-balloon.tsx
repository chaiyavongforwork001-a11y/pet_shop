'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { motionAllowed, prefersReducedMotion } from './core-motion';

const INK = '#30233f';

function BalloonCat(): ReactElement {
  return (
    <svg viewBox="0 0 34 44" focusable="false" aria-hidden="true">
      <path
        d="M8 17.4C10 22 13.6 25.4 17 28M17.6 13.6C17.4 19 17.2 24.2 17 28M26.4 18C24.2 22.4 20.2 25.6 17 28"
        fill="none"
        stroke={INK}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
      <ellipse
        cx="7.6"
        cy="9.6"
        rx="6.2"
        ry="7.4"
        fill="#e9dbfd"
        stroke={INK}
        strokeWidth={1.3}
      />
      <ellipse
        cx="17.4"
        cy="6.6"
        rx="6.2"
        ry="7.4"
        fill="#f8e98e"
        stroke={INK}
        strokeWidth={1.3}
      />
      <ellipse
        cx="26.6"
        cy="10.4"
        rx="6.2"
        ry="7.4"
        fill="#f3a8ad"
        stroke={INK}
        strokeWidth={1.3}
      />
      <path
        d="M6.2 16.6h2.8L7.6 18.6ZM16 13.6h2.8L17.4 15.6ZM25.2 17.4H28l-1.4 2Z"
        fill="#fffdf9"
        stroke={INK}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path
        d="M12.6 33.6 11.4 28.6 15.4 31ZM21.4 33.6 22.6 28.6 18.6 31Z"
        fill="#a4a4bc"
        stroke={INK}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <circle
        cx="17"
        cy="36.6"
        r="6.4"
        fill="#a4a4bc"
        stroke={INK}
        strokeWidth={1.3}
      />
      <circle cx="14.6" cy="35.8" r="1.2" fill="#252135" />
      <circle cx="19.4" cy="35.8" r="1.2" fill="#252135" />
      <path
        d="M15.6 38.8q1.4 1.6 2.8 0"
        fill="none"
        stroke={INK}
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <ellipse cx="12.4" cy="38.2" rx="1.6" ry="1" fill="#e7a4b0" />
      <ellipse cx="21.6" cy="38.2" rx="1.6" ry="1" fill="#e7a4b0" />
    </svg>
  );
}

type Flight = { x: number; y: number; top: number; height: number; id: number };

export function CoreBalloonTop() {
  const [flight, setFlight] = useState<Flight | null>(null);
  const [back, setBack] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cloneRef = useRef<HTMLSpanElement>(null);
  const flightId = useRef(0);
  const timers = useRef<number[]>([]);
  const wiggle = useRef<Animation | null>(null);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
      wiggle.current?.cancel();
    },
    [],
  );

  const go = useCallback(() => {
    const node = btnRef.current;
    const rect = node?.getBoundingClientRect();
    const allowed = motionAllowed();

    if (allowed && rect) {
      flightId.current += 1;
      setFlight({
        x: rect.left + 4,
        y: rect.top - 6,
        top: rect.top,
        height: rect.height,
        id: flightId.current,
      });
    }

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });

    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      window.removeEventListener('scrollend', land);
      const brand = document.querySelector<HTMLElement>('.header .brand');
      brand?.focus({ preventScroll: true });
      const mark = document.querySelector<HTMLElement>('.header .brand-mark');
      if (motionAllowed() && mark) {
        wiggle.current?.cancel();
        wiggle.current = mark.animate(
          [
            { rotate: '0deg' },
            { rotate: '-16deg' },
            { rotate: '10deg' },
            { rotate: '0deg' },
          ],
          { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1.4)' },
        );
      }
    };
    window.addEventListener('scrollend', land, { once: true });
    timers.current.push(window.setTimeout(land, 1400));
  }, []);

  useLayoutEffect(() => {
    const node = cloneRef.current;
    if (!flight || !node) return;
    const rise = flight.top + flight.height + 80;
    const fly = node.animate(
      [
        { transform: 'translate3d(0,0,0) rotate(0deg)' },
        {
          offset: 0.45,
          transform: `translate3d(14px, ${-flight.top * 0.5}px, 0) rotate(-7deg)`,
        },
        { transform: `translate3d(-8px, ${-rise}px, 0) rotate(5deg)` },
      ],
      { duration: 1300, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'both' },
    );
    fly.onfinish = () => {
      setFlight(null);
      setBack(true);
      timers.current.push(window.setTimeout(() => setBack(false), 520));
    };
    return () => fly.cancel();
  }, [flight]);

  return (
    <>
      <button
        ref={btnRef}
        className={`cc-balloon-top${flight ? ' is-flying' : ''}${back ? ' is-back' : ''}`}
        onClick={go}
      >
        <span className="cc-balloons" aria-hidden="true">
          <BalloonCat />
        </span>
        <span>ลอยกลับข้างบน</span>
      </button>
      {flight && typeof document !== 'undefined'
        ? createPortal(
            <span
              key={flight.id}
              ref={cloneRef}
              className="cc-balloon-flight"
              aria-hidden="true"
              style={{ left: `${flight.x}px`, top: `${flight.y}px` } as CSSProperties}
            >
              <BalloonCat />
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
