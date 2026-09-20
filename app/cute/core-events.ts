export type PetId = 'dog' | 'cat' | 'exotic';
export type FaceKind = 'dog' | 'cat' | 'rabbit';
export type WorldKind = 0 | 1 | 2;

export type PawpalEventMap = {
  'pawpal:cart-added': {
    productId: string;
    pet: string;
    quantity: number;
    image?: string;
    source?: HTMLElement | null;
  };
  'pawpal:favorite': {
    productId: string;
    pet: string;
    saved: boolean;
    source?: HTMLElement | null;
  };
  'pawpal:free-shipping': { reached: boolean };
  'pawpal:order-placed': { code?: string };
  'pawpal:greet': { at: number };
  'pawpal:secret': { pet: FaceKind; combo: boolean };
  'pawpal:parade': { from: 'keys' | 'word' | 'mascot' };
  'pawpal:motion-set': { on: boolean };
};

export type PawpalEventName = keyof PawpalEventMap;

export function emit<K extends PawpalEventName>(
  name: K,
  detail: PawpalEventMap[K],
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function listen<K extends PawpalEventName>(
  name: K,
  cb: (detail: Partial<PawpalEventMap[K]>) => void,
): () => void {
  const handler = (e: Event) =>
    cb(((e as CustomEvent).detail ?? {}) as Partial<PawpalEventMap[K]>);
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}

export const faceKindOf = (pet?: string): FaceKind =>
  pet === 'cat' ? 'cat' : pet === 'exotic' || pet === 'rabbit' ? 'rabbit' : 'dog';

export const worldKindOf = (pet?: string): WorldKind =>
  pet === 'cat' ? 1 : pet === 'exotic' || pet === 'rabbit' ? 2 : 0;

export const petNameTh: Record<FaceKind, string> = {
  dog: 'น้องหมา',
  cat: 'น้องแมว',
  rabbit: 'น้องกระต่าย',
};
