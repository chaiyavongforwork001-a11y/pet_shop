"use client";
import { useEffect, useRef } from "react";
import type { CSSProperties, ReactElement } from "react";
import { motionAllowed } from "./core-motion";
import { emit } from "./core-events";
import { PetRunner } from "./core-faces";

export function ShopFreeShip({
  subtotal,
  threshold,
}: {
  subtotal: number;
  threshold: number;
}): ReactElement {
  const walker = useRef<HTMLSpanElement | null>(null);
  const wasReached = useRef<boolean | null>(null);
  const pct = threshold > 0 ? Math.min(1, Math.max(0, subtotal / threshold)) : 1;
  const reached = subtotal >= threshold;

  useEffect(() => {
    const node = walker.current;
    if (!node || !motionAllowed()) return;
    node.classList.add("cc-running");
    const timer = setTimeout(() => node.classList.remove("cc-running"), 650);
    return () => {
      clearTimeout(timer);
      node.classList.remove("cc-running");
    };
  }, [pct]);

  useEffect(() => {
    if (wasReached.current === false && reached)
      emit("pawpal:free-shipping", { reached: true });
    wasReached.current = reached;
  }, [reached]);

  return (
    <div
      className="cs-track"
      role="progressbar"
      aria-label="ความคืบหน้าส่งฟรี"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      data-reached={reached}
      style={{ "--cs-p": pct } as CSSProperties}
    >
      <span className="cs-bar">
        <span className="cs-fill" />
      </span>
      <span className="cs-lane" aria-hidden="true">
        <span className="cs-walker" ref={walker}>
          <PetRunner kind="dog" width={30} />
        </span>
      </span>
      <span className="cs-house" aria-hidden="true">
        <svg viewBox="0 0 24 24" width={24} height={24} focusable="false">
          <path
            d="M4.4 10.9 12 4.4l7.6 6.5v9.2a1.1 1.1 0 0 1-1.1 1.1H5.5a1.1 1.1 0 0 1-1.1-1.1Z"
            fill="#efe6fa"
            stroke="#30233f"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path
            d="M2 11.6 12 3l10 8.6"
            fill="none"
            stroke="#30233f"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.7 14.6h4.6v6.6H9.7Z"
            fill="#c8b3ef"
            stroke="#30233f"
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
          <path
            d="M12 6.6c-.8-.9-2.2-.4-2.2 .9 0 1.1 1.4 1.9 2.2 2.6.8-.7 2.2-1.5 2.2-2.6 0-1.3-1.4-1.8-2.2-.9Z"
            fill="#ff8fb1"
            stroke="#30233f"
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
        </svg>
        <b>ส่งฟรี!</b>
      </span>
    </div>
  );
}
