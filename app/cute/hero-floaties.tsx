"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { TreatIcon } from "./core-faces";

type Floatie = {
  kind: "bubble" | "heart" | "paw";
  x: number;
  s: number;
  d: number;
  delay: number;
  rest: number;
};

/* Deterministic, so server and client render the same markup. */
const FLOATIES: Floatie[] = [
  { kind: "bubble", x: 36, s: 22, d: 19, delay: -3, rest: -12 },
  { kind: "heart", x: 44, s: 16, d: 23, delay: -11, rest: -8 },
  { kind: "bubble", x: 53, s: 12, d: 16, delay: -7, rest: -16 },
  { kind: "paw", x: 61, s: 18, d: 25, delay: -15, rest: -6 },
  { kind: "bubble", x: 70, s: 26, d: 21, delay: -1, rest: -14 },
  { kind: "heart", x: 78, s: 13, d: 17, delay: -9, rest: -10 },
  { kind: "bubble", x: 86, s: 19, d: 24, delay: -5, rest: -18 },
  { kind: "paw", x: 97, s: 11, d: 14, delay: -13, rest: -4 },
  { kind: "bubble", x: 6, s: 10, d: 26, delay: -19, rest: 38 },
  { kind: "bubble", x: 18, s: 12, d: 22, delay: -17, rest: 46 },
];

export function HeroFloaties() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          entry.target.classList.toggle("is-idle", !entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="ch-floaties" aria-hidden="true" ref={root}>
      {FLOATIES.map((f, i) => (
        <span
          key={i}
          className={`ch-float ch-float-${f.kind}`}
          style={
            {
              "--x": `${f.x}%`,
              "--s": `${f.s}px`,
              "--d": `${f.d}s`,
              "--delay": `${f.delay}s`,
              "--rest": `${f.rest}%`,
            } as CSSProperties
          }
        >
          <i>
            {f.kind === "heart" ? (
              <TreatIcon kind="heart" size={f.s} />
            ) : f.kind === "paw" ? (
              <TreatIcon kind="paw" size={f.s} />
            ) : null}
          </i>
        </span>
      ))}
    </div>
  );
}
