'use client';
import { useEffect, type ReactElement } from 'react';
import { TreatIcon } from './core-faces';
import { motionAllowed } from './core-motion';

/**
 * A paw that swipes across the gallery once to teach the swipe gesture.
 * Decorative and click-through; it calls onDone when it is finished, and a
 * timer guarantees that even with motion off it never sticks around.
 */
export function SwipeHint({ onDone }: { onDone: () => void }): ReactElement {
  useEffect(() => {
    const timer = setTimeout(onDone, motionAllowed() ? 2600 : 2500);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <span
      className="cf-swipe-hint"
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.animationName === 'cf-swipe') onDone();
      }}
    >
      <TreatIcon kind="paw" size={26} className="cf-swipe-ghost cf-swipe-ghost-b" />
      <TreatIcon kind="paw" size={26} className="cf-swipe-ghost cf-swipe-ghost-a" />
      <TreatIcon kind="paw" size={26} />
      <span>ปัดดูรูปถัดไป</span>
    </span>
  );
}
