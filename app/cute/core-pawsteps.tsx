'use client';
import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { TreatIcon } from './core-faces';
import { motionAllowed, onMotionChange } from './core-motion';

type StepsProps = {
  kind: 'dog' | 'cat' | 'rabbit';
  end: 'bone' | 'fish' | 'carrot';
  place: 'top' | 'bottom';
  flip?: boolean;
};

const WALK = Array.from({ length: 6 }, (_, i) => ({
  i,
  sx: `${(4 + i * 16.5).toFixed(2)}%`,
  sy: `${(50 + (i % 2 ? 16 : -16) + Math.sin(i * 1.1) * 14).toFixed(2)}%`,
}));

const HOPS = Array.from({ length: 3 }, (_, i) => ({
  i,
  sx: `${(8 + i * 28).toFixed(2)}%`,
  sy: `${(48 + (i % 2 ? 14 : -14)).toFixed(2)}%`,
}));

function DogPrint(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
      <path
        d="M10 9.2c2.8 0 5 2.1 5 4.4 0 1.9-1.6 3.1-3.3 3.1-.7 0-1.1-.3-1.7-.3s-1 .3-1.7.3C6.6 16.7 5 15.5 5 13.6c0-2.3 2.2-4.4 5-4.4Z"
        fill="currentColor"
      />
      <ellipse cx="4.3" cy="7.9" rx="1.9" ry="2.4" fill="currentColor" />
      <ellipse cx="8.4" cy="4.6" rx="1.9" ry="2.5" fill="currentColor" />
      <ellipse cx="12.4" cy="4.6" rx="1.9" ry="2.5" fill="currentColor" />
      <ellipse cx="15.8" cy="7.9" rx="1.9" ry="2.4" fill="currentColor" />
    </svg>
  );
}

function CatPrint(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
      <path
        d="M10 10.4c2.4 0 4.2 1.8 4.2 3.7 0 1.6-1.3 2.6-2.8 2.6-.6 0-1-.2-1.4-.2s-.8.2-1.4.2c-1.5 0-2.8-1-2.8-2.6 0-1.9 1.8-3.7 4.2-3.7Z"
        fill="currentColor"
      />
      <ellipse cx="5.4" cy="9" rx="1.6" ry="2" fill="currentColor" />
      <ellipse cx="8.8" cy="6.4" rx="1.6" ry="2.1" fill="currentColor" />
      <ellipse cx="11.9" cy="6.4" rx="1.6" ry="2.1" fill="currentColor" />
      <ellipse cx="14.8" cy="9" rx="1.6" ry="2" fill="currentColor" />
    </svg>
  );
}

function HopPrint(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
      <ellipse cx="6.2" cy="10" rx="2.7" ry="6.2" fill="currentColor" />
      <ellipse cx="13.8" cy="10" rx="2.7" ry="6.2" fill="currentColor" />
      <circle cx="6.2" cy="3.6" r="1.5" fill="currentColor" />
      <circle cx="13.8" cy="3.6" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function CorePawSteps({
  kind,
  end,
  place,
  flip,
}: StepsProps): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const prints = kind === 'rabbit' ? HOPS : WALK;
  const rotation =
    kind === 'rabbit'
      ? flip
        ? '-10deg'
        : '10deg'
      : flip
        ? '-90deg'
        : '90deg';

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let observer: IntersectionObserver | null = null;
    const arm = () => {
      if (node.classList.contains('is-walking')) return;
      node.classList.add('is-armed');
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          node.classList.add('is-walking');
          observer?.disconnect();
          observer = null;
        },
        { threshold: 0.6 },
      );
      observer.observe(node);
    };
    if (motionAllowed()) arm();
    const stop = onMotionChange((allowed) => {
      if (allowed) {
        arm();
        return;
      }
      observer?.disconnect();
      observer = null;
      node.classList.remove('is-armed', 'is-walking');
    });
    return () => {
      observer?.disconnect();
      stop();
    };
  }, []);

  return (
    <div className={`cc-steps cc-steps-${place}`} aria-hidden="true" ref={root}>
      {prints.map((print) => (
        <span
          key={print.i}
          className="cc-step"
          style={
            {
              '--i': print.i,
              '--sx': print.sx,
              '--sy': print.sy,
              '--sr': rotation,
            } as CSSProperties
          }
        >
          {kind === 'rabbit' ? (
            <HopPrint />
          ) : kind === 'cat' ? (
            <CatPrint />
          ) : (
            <DogPrint />
          )}
        </span>
      ))}
      <span className="cc-step-end">
        <TreatIcon kind={end} size={22} />
      </span>
    </div>
  );
}
