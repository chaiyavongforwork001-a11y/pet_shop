'use client';
import type { ReactElement } from 'react';
import { TreatIcon } from './core-faces';

/** Three walking paws plus a visible Thai label. Safe inside a <p>. */
export function PawLoader({
  label,
  size = 'md',
}: {
  label: string;
  size?: 'sm' | 'md';
}): ReactElement {
  const paw = size === 'sm' ? 12 : 16;
  return (
    <span className={`cf-loader cf-loader-${size}`} role="status">
      <span className="cf-loader-paws" aria-hidden="true">
        <TreatIcon kind="paw" size={paw} />
        <TreatIcon kind="paw" size={paw} />
        <TreatIcon kind="paw" size={paw} />
      </span>
      <span>{label}</span>
    </span>
  );
}

/** Fluffy placeholder cards shown while a list loads. Purely decorative. */
export function SkeletonCards({ count = 2 }: { count?: number }): ReactElement {
  return (
    <>
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <div className="cf-skeleton" aria-hidden="true" key={i} />
      ))}
    </>
  );
}
