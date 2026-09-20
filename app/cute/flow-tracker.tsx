'use client';
import type { ReactElement } from 'react';
import { PetFace, PetRunner } from './core-faces';

const STEPS = [
  'awaiting_payment',
  'reviewing',
  'paid',
  'packing',
  'shipped',
] as const;

const INK = '#30233f';

function TrackPaw(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" focusable="false">
      <path d="M12 11.6c3.1 0 5.5 2.3 5.5 4.8 0 2.1-1.7 3.6-3.6 3.6-.8 0-1.3-.3-1.9-.3s-1.1.3-1.9.3c-1.9 0-3.6-1.5-3.6-3.6 0-2.5 2.4-4.8 5.5-4.8Z" />
      <ellipse cx={5.9} cy={9.8} rx={2.1} ry={2.6} />
      <ellipse cx={10.3} cy={6.9} rx={2.1} ry={2.7} />
      <ellipse cx={14.8} cy={6.9} rx={2.1} ry={2.7} />
      <ellipse cx={18.1} cy={9.8} rx={2.1} ry={2.6} />
    </svg>
  );
}

function TrackHome(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path
        d="M3.4 11.2 12 3.6l8.6 7.6"
        fill="none"
        stroke={INK}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.4 10.4 12 4.6l6.6 5.8V20a.9.9 0 0 1-.9.9H6.3a.9.9 0 0 1-.9-.9Z"
        fill="currentColor"
        stroke={INK}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d="M12 13.4c1.5-1.6 4-.6 4 1.3 0 1.4-2.1 2.8-4 4.1-1.9-1.3-4-2.7-4-4.1 0-1.9 2.5-2.9 4-1.3Z"
        fill="#ff8fb1"
        stroke={INK}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The paw road a parcel walks along. Decorative: the real status text stays
 * next to it in the order card, so this is aria-hidden.
 */
export function OrderTracker({ status }: { status: string }): ReactElement {
  const cancelled = status === 'cancelled';
  const found = STEPS.indexOf(status as (typeof STEPS)[number]);
  const current = found < 0 ? 0 : found;
  return (
    <div
      className={`cf-track${cancelled ? ' is-cancelled' : ''}`}
      aria-hidden="true"
    >
      <span className="cf-track-line" />
      {STEPS.map((step, i) => (
        <span
          className={`cf-track-dot${!cancelled && i <= current ? ' is-done' : ''}`}
          key={step}
        >
          {step === 'shipped' ? <TrackHome /> : <TrackPaw />}
          {!cancelled && i === current ? (
            <span className="cf-track-runner">
              <PetRunner kind="dog" width={28} />
            </span>
          ) : null}
        </span>
      ))}
      {cancelled ? (
        <span className="cf-track-sad">
          <PetFace kind="dog" mood="worried" size={20} />
        </span>
      ) : null}
    </div>
  );
}
