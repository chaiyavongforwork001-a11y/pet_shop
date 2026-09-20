'use client';
import { useSyncExternalStore } from 'react';
import { Sparkles } from 'lucide-react';
import { emit } from './core-events';

function subscribe(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-pawpal-motion'],
  });
  return () => observer.disconnect();
}

const readMotion = () => document.documentElement.dataset.pawpalMotion !== 'off';
const serverMotion = () => true;

export function CoreMotionToggle() {
  const on = useSyncExternalStore(subscribe, readMotion, serverMotion);
  return (
    <button
      className="cc-motion-toggle"
      aria-pressed={on}
      onClick={() => emit('pawpal:motion-set', { on: !on })}
    >
      <Sparkles size={14} aria-hidden="true" />
      {on ? 'ปิดความดุ๊กดิ๊ก' : 'เปิดความดุ๊กดิ๊ก'}
    </button>
  );
}
