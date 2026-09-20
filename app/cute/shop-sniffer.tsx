"use client";
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { motionAllowed, onMotionChange } from "./core-motion";

const INK = "#30233f";

export function ShopSniffer({
  mood,
}: {
  mood: "idle" | "found" | "lost";
}): ReactElement {
  const root = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const input = document.getElementById("search");
    if (!input) return;
    const live = new Set<Animation>();
    const reg = (animation: Animation) => {
      live.add(animation);
      const drop = () => live.delete(animation);
      animation.addEventListener("finish", drop);
      animation.addEventListener("cancel", drop);
    };
    const stopAll = () => {
      for (const animation of Array.from(live)) animation.cancel();
      live.clear();
    };
    const twitch = () => {
      const node = root.current;
      if (!node || !motionAllowed()) return;
      if (node.getAnimations().length > 0) return;
      reg(
        node.animate(
          [
            { transform: "none" },
            { offset: 0.4, transform: "translateY(-2px) rotate(-6deg)" },
            { offset: 0.72, transform: "rotate(4deg)" },
            { transform: "none" },
          ],
          { duration: 260, easing: "ease-out", composite: "add" },
        ),
      );
      const puffs = node.querySelectorAll<SVGElement>(".cs-puff");
      puffs.forEach((puff, index) =>
        reg(
          puff.animate(
            [
              { transform: "translate(0,0) scale(.7)", opacity: 0 },
              { offset: 0.35, opacity: 0.95 },
              { transform: "translate(-6px,-6px) scale(1.15)", opacity: 0 },
            ],
            { duration: 460, delay: index * 90, easing: "ease-out" },
          ),
        ),
      );
    };
    const offMotion = onMotionChange((allowed) => {
      if (!allowed) stopAll();
    });
    input.addEventListener("input", twitch);
    return () => {
      input.removeEventListener("input", twitch);
      offMotion();
      stopAll();
    };
  }, []);

  return (
    <span className="cs-sniffer" data-mood={mood} aria-hidden="true" ref={root}>
      <svg viewBox="0 0 48 40" width={48} height={40} focusable="false">
        <circle className="cs-puff" cx={7.4} cy={10.6} r={3.2} fill="#e9dbfd" />
        <circle
          className="cs-puff cs-puff-b"
          cx={3.2}
          cy={15.6}
          r={2}
          fill="#efe6fa"
        />
        <g className="cs-ear cs-ear-l">
          <path
            d="M13 11c-5.4 0-9 4.2-9 9.6 0 4.6 2.8 7.8 6.2 7.8 2.8 0 4.4-2.2 4.4-6.2V13Z"
            fill="#c9884a"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </g>
        <g className="cs-ear cs-ear-r">
          <path
            d="M35 11c5.4 0 9 4.2 9 9.6 0 4.6-2.8 7.8-6.2 7.8-2.8 0-4.4-2.2-4.4-6.2V13Z"
            fill="#c9884a"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </g>
        <ellipse
          cx={24}
          cy={22}
          rx={13.6}
          ry={14.4}
          fill="#e4a157"
          stroke={INK}
          strokeWidth={1.6}
        />
        <ellipse cx={24} cy={27} rx={9} ry={6.6} fill="#fff7e7" />
        <path
          d="M24 29.6v2M24 31.4c-1.4 1.6-3.8 1.4-4.8-.4M24 31.4c1.4 1.6 3.8 1.4 4.8-.4"
          fill="none"
          stroke={INK}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <path
          d="M24 22.2c2.9 0 5 1.6 5 3.6 0 2.4-2.9 4.2-5 4.2s-5-1.8-5-4.2c0-2 2.1-3.6 5-3.6Z"
          fill={INK}
        />
        <ellipse cx={21.8} cy={24.4} rx={1.5} ry={.9} fill="#ffffff" opacity={.5} />
        <g className="cs-eyes cs-eyes-happy">
          <circle cx={18} cy={18.4} r={2.4} fill={INK} />
          <circle cx={18.9} cy={17.5} r={0.9} fill="#ffffff" />
          <circle cx={30} cy={18.4} r={2.4} fill={INK} />
          <circle cx={30.9} cy={17.5} r={0.9} fill="#ffffff" />
        </g>
        <g className="cs-eyes cs-eyes-sad">
          <ellipse cx={18} cy={19.6} rx={2.1} ry={1.6} fill={INK} />
          <ellipse cx={30} cy={19.6} rx={2.1} ry={1.6} fill={INK} />
          <path
            d="M14.6 15c1.6-1.1 3.6-.9 4.8.4M33.4 15c-1.6-1.1-3.6-.9-4.8.4"
            fill="none"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </span>
  );
}
