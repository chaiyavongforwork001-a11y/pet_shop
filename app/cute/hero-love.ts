/* PAWPAL cute — hero love meter, kept in sessionStorage behind an external store. */

const KEY = "pawpal-love";
const subscribers = new Set<() => void>();
let cached = -1;

function read(): number {
  try {
    const raw = Number(sessionStorage.getItem(KEY));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  } catch {
    return 0;
  }
}

export function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

export function getLove(): number {
  if (cached < 0) cached = read();
  return cached;
}

export function getServerLove(): number {
  return 0;
}

export function addLove(step = 1): void {
  const next = Math.max(0, getLove() + step);
  if (next === cached) return;
  cached = next;
  try {
    sessionStorage.setItem(KEY, String(next));
  } catch {
    /* private mode — the meter simply stays in memory */
  }
  for (const fn of subscribers) fn();
}
