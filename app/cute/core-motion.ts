import { useSyncExternalStore } from 'react';

const REDUCED = '(prefers-reduced-motion: reduce)';
const noopSubscribe = () => () => {};

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED).matches;
}

export function motionAllowed(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    !prefersReducedMotion() &&
    document.documentElement.dataset.pawpalMotion !== 'off'
  );
}

export function finePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

export function smallScreen(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  );
}

export function uiBusy(): boolean {
  return typeof document !== 'undefined' && !!document.querySelector('.modal-shade');
}

export function chatOpen(): boolean {
  return (
    typeof document !== 'undefined' && !!document.querySelector('.chat-dock.is-open')
  );
}

export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest('input, textarea, select, [contenteditable=true]')
  );
}

export function onMotionChange(cb: (allowed: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia(REDUCED);
  const fire = () => cb(motionAllowed());
  const observer = new MutationObserver(fire);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-pawpal-motion'],
  });
  media.addEventListener('change', fire);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', fire);
  };
}

export function useMotionAllowed(): boolean {
  return useSyncExternalStore(onMotionChange, motionAllowed, () => false);
}

export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
