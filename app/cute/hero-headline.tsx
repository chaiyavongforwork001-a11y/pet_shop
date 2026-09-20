"use client";
import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Heart } from "lucide-react";
import { listen } from "./core-events";
import { motionAllowed } from "./core-motion";

function Bouncy({ text, start }: { text: string; start: number }) {
  return (
    <>
      <span className="cc-sr">{text}</span>
      <span className="ch-word" aria-hidden="true">
        {[...text].map((ch, i) =>
          ch === " " ? (
            " "
          ) : (
            <span
              key={i}
              className="ch-letter"
              style={{ "--i": start + i } as CSSProperties}
            >
              <span>{ch}</span>
            </span>
          ),
        )}
      </span>
    </>
  );
}

export function HeroHeadline() {
  const h1 = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  const wave = useCallback(() => {
    if (!motionAllowed()) return;
    const el = h1.current;
    if (!el) return;
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    el.classList.remove("is-waving");
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      el.classList.add("is-waving");
      timer.current = window.setTimeout(() => {
        timer.current = null;
        el.classList.remove("is-waving");
      }, 900);
    });
  }, []);

  useEffect(() => {
    const off = listen("pawpal:greet", wave);
    return () => {
      off();
      if (timer.current !== null) clearTimeout(timer.current);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [wave]);

  const tap = useCallback(
    (e: ReactPointerEvent<HTMLHeadingElement>) => {
      if (e.pointerType !== "mouse") wave();
    },
    [wave],
  );

  return (
    <h1 ref={h1} onPointerDown={tap}>
      <span>
        <Bouncy text="Little paws." start={0} />
      </span>
      <span className="happy-line">
        Big{" "}
        <em>
          <Bouncy text="love." start={16} />
        </em>
        <Heart aria-hidden="true" />
      </span>
    </h1>
  );
}
