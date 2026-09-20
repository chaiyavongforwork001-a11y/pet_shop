import { uiBusy } from './core-motion';

let busyUntil = 0;
const KEY = 'pawpal-chatter';
const IDLE_BUDGET = 6;

export function claimBubble(kind: 'user' | 'idle', ms = 2200): boolean {
  const now = performance.now();
  if (kind === 'idle') {
    if (now < busyUntil + 8000 || uiBusy() || document.visibilityState !== 'visible')
      return false;
    let used = 0;
    try {
      used = Number(sessionStorage.getItem(KEY)) || 0;
    } catch {}
    if (used >= IDLE_BUDGET) return false;
    try {
      sessionStorage.setItem(KEY, String(used + 1));
    } catch {}
  }
  busyUntil = Math.max(busyUntil, now + ms);
  return true;
}

export function bubbleBusy(): boolean {
  return performance.now() < busyUntil;
}
