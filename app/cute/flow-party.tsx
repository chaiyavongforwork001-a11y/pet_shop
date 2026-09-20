'use client';
import type { ReactElement } from 'react';
import { PetFace } from './core-faces';

const KEY = 'pawpal-order-party';
const TTL = 60000;

export type PartyStash = { code?: string; at: number };

let pending: PartyStash | null = null;

function fresh(value: PartyStash | null): PartyStash | null {
  if (!value || typeof value.at !== 'number' || !Number.isFinite(value.at)) {
    return null;
  }
  return Date.now() - value.at < TTL ? value : null;
}

/** Remember that an order was just created, so Orders can throw the party. */
export function stashParty(code?: string): void {
  pending = { code, at: Date.now() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {}
}

/**
 * The party waiting to be shown, or null. Reads the clock, so call it only
 * from a lazy useState initializer.
 */
export function peekParty(): PartyStash | null {
  const live = fresh(pending);
  if (live) return live;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as { code?: unknown; at?: unknown };
    return fresh({
      code: typeof record.code === 'string' ? record.code : undefined,
      at: Number(record.at),
    });
  } catch {
    return null;
  }
}

/** Forget the party: it has been shown, or Orders is closing. */
export function clearParty(): void {
  pending = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

/** The celebration card at the top of Orders right after checkout. */
export function OrderParty({
  code,
  onClose,
}: {
  code?: string;
  onClose: () => void;
}): ReactElement {
  return (
    <div className="cf-party" role="status">
      <div className="cf-party-pets" aria-hidden="true">
        <PetFace kind="dog" mood="love" size={44} />
        <PetFace kind="cat" mood="love" size={44} />
        <PetFace kind="rabbit" mood="love" size={44} />
      </div>
      <b>สั่งซื้อสำเร็จแล้ว!</b>
      {code ? <span className="cf-ticket">#{code}</span> : null}
      <p>ขอบคุณที่ส่งความสุขให้เพื่อนซี้ ♡ แนบสลิปด้านล่างได้เลย</p>
      <button
        className="text-button"
        type="button"
        aria-label="ปิดข้อความฉลอง"
        onClick={onClose}
      >
        ปิด
      </button>
    </div>
  );
}

const INK = '#30233f';
const FUR = '#e4a157';
const CREAM = '#fff7e7';

/** A pup waiting beside an empty box — the empty state of Orders. */
export function OrdersEmptyScene(): ReactElement {
  return (
    <span className="cf-empty-scene" aria-hidden="true">
      <span className="cf-empty-pup">
        <svg viewBox="0 0 64 58" width={64} height={58} focusable="false">
          <g className="cf-empty-tail">
            <path
              d="M45 40c6.4-1 9.6-5.2 9-11.2"
              fill="none"
              stroke={INK}
              strokeWidth={8.6}
              strokeLinecap="round"
            />
            <path
              d="M45 40c6.4-1 9.6-5.2 9-11.2"
              fill="none"
              stroke={FUR}
              strokeWidth={5.6}
              strokeLinecap="round"
            />
          </g>
          <ellipse
            cx={30}
            cy={42}
            rx={17}
            ry={13}
            fill={FUR}
            stroke={INK}
            strokeWidth={1.6}
          />
          <ellipse cx={30} cy={47} rx={10.5} ry={7} fill={CREAM} />
          <rect
            x={19}
            y={47}
            width={10}
            height={8}
            rx={4}
            fill={CREAM}
            stroke={INK}
            strokeWidth={1.6}
          />
          <rect
            x={35}
            y={47}
            width={10}
            height={8}
            rx={4}
            fill={CREAM}
            stroke={INK}
            strokeWidth={1.6}
          />
        </svg>
        <PetFace kind="dog" mood="happy" size={40} />
      </span>
      <svg viewBox="0 0 80 64" width={72} height={58} focusable="false">
        <path
          d="M17 25 6 14l11-4 10 10Z"
          fill={FUR}
          fillOpacity={0.6}
          stroke={INK}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <path
          d="M63 25 74 14l-11-4-10 10Z"
          fill={FUR}
          fillOpacity={0.6}
          stroke={INK}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <path
          d="M17 25h46l-7-9H24Z"
          fill="#f0c191"
          stroke={INK}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <rect
          x={17}
          y={25}
          width={46}
          height={30}
          rx={4}
          fill={FUR}
          fillOpacity={0.6}
          stroke={INK}
          strokeWidth={1.6}
        />
        <path
          d="M40 25v30"
          stroke={INK}
          strokeWidth={1.2}
          opacity={0.3}
          fill="none"
        />
        <path
          d="M25 36h11M25 43h7"
          stroke="#c78f52"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
