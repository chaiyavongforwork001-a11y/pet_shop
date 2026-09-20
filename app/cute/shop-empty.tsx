"use client";
import { useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { PetFace } from "./core-faces";

const INK = "#30233f";
const PAW =
  "M12 11.3c3.1 0 5.6 2.3 5.6 4.9 0 2.2-1.8 3.6-3.7 3.6-.8 0-1.3-.3-1.9-.3s-1.1.3-1.9.3c-1.9 0-3.7-1.4-3.7-3.6 0-2.6 2.5-4.9 5.6-4.9Z";
const HEART =
  "M12 20.4 4.5 13C2.1 10.6 2.6 6.7 5.5 5.1 7.7 3.9 10.4 4.6 12 6.6c1.6-2 4.3-2.7 6.5-1.5 2.9 1.6 3.4 5.5 1 7.9Z";

const TRAIL: { x: number; y: number; r: number }[] = [
  { x: 62, y: 96, r: -12 },
  { x: 78, y: 88, r: -4 },
  { x: 94, y: 94, r: 6 },
  { x: 110, y: 86, r: 12 },
  { x: 125, y: 92, r: 20 },
];

/** One dotted paw print of the search trail, drawn at 0.42 of the 24px treat paw. */
function trailPaw(
  step: { x: number; y: number; r: number },
  index: number,
): ReactElement {
  return (
    <g
      key={index}
      className="cs-track-paw"
      style={{ "--i": index } as CSSProperties}
      transform={`translate(${step.x} ${step.y}) rotate(${step.r}) scale(.42) translate(-12 -12)`}
    >
      <path d={PAW} fill="#b998df" stroke={INK} strokeWidth={1.8} />
      <ellipse cx={5.9} cy={9.6} rx={2.2} ry={2.7} fill="#b998df" stroke={INK} strokeWidth={1.8} />
      <ellipse cx={10.3} cy={6.6} rx={2.2} ry={2.8} fill="#b998df" stroke={INK} strokeWidth={1.8} />
      <ellipse cx={14.8} cy={6.6} rx={2.2} ry={2.8} fill="#b998df" stroke={INK} strokeWidth={1.8} />
      <ellipse cx={18.1} cy={9.6} rx={2.2} ry={2.7} fill="#b998df" stroke={INK} strokeWidth={1.8} />
    </g>
  );
}

function CartScene(): ReactElement {
  const [awake, setAwake] = useState(false);
  return (
    <>
      <div className="cs-scene cs-scene-cart">
        <svg
          className="cs-scene-art"
          viewBox="0 0 160 120"
          aria-hidden="true"
          focusable="false"
        >
          <ellipse cx={80} cy={112} rx={43} ry={5.5} fill="#30233f1f" />
          <g className="cs-bag">
            <path
              d="M52 41h56l6 19H46Z"
              fill="#f4e6cd"
              stroke={INK}
              strokeWidth={1.7}
              strokeLinejoin="round"
            />
            <path d="M50 57h60l-3 13H53Z" fill="#e0c9a2" />
          </g>
        </svg>
        <button
          type="button"
          className="cs-nap"
          aria-label="ปลุกน้องแมว"
          aria-pressed={awake}
          onClick={() => setAwake(true)}
        >
          <PetFace
            kind="cat"
            mood={awake ? "happy" : "sleepy"}
            size={48}
            className="cc-anim-ears"
          />
        </button>
        {!awake && (
          <span className="cc-zz cs-scene-zz" aria-hidden="true">
            <i>z</i>
            <i>z</i>
            <i>z</i>
          </span>
        )}
        <svg
          className="cs-scene-fore"
          viewBox="0 0 160 120"
          aria-hidden="true"
          focusable="false"
        >
          <g className="cs-bag">
            <path
              d="M44 58h72l-3.4 46a7 7 0 0 1-7 6.4H54.4a7 7 0 0 1-7-6.4Z"
              fill="#fff7e7"
              stroke={INK}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
            <path
              d="M68 61v46M92 61v46"
              stroke="#e6d4b4"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <g transform="translate(70 74) scale(.85)">
              <path
                d={HEART}
                fill="#ff8fb1"
                stroke={INK}
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
            </g>
          </g>
        </svg>
      </div>
      <span className="cc-bubble cs-speech" aria-live="polite">
        {awake ? "เมี้ยว~ หิวแล้ว ไปหาขนมกัน!" : ""}
      </span>
    </>
  );
}

function SearchScene(): ReactElement {
  return (
    <div className="cs-scene cs-scene-search">
      <svg
        className="cs-scene-art"
        viewBox="0 0 160 120"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx={38} cy={104} rx={30} ry={5} fill="#30233f1a" />
        <path
          d="M56 100h84"
          stroke="#d4c4ec"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray="1 8"
        />
        {TRAIL.map(trailPaw)}
        <g className="cs-quest">
          <path
            d="M138.6 46.8c0-4.4 3.4-7.6 7.8-7.6 4.2 0 7.4 2.9 7.4 6.8 0 3.3-1.6 5-4.4 6.8-2.2 1.4-2.9 2.4-2.9 4.6v1.2"
            fill="none"
            stroke="#8e6bae"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={146.3} cy={66.2} r={2.7} fill="#8e6bae" />
        </g>
      </svg>
      <span className="cs-pup">
        <PetFace kind="dog" mood="idle" size={46} className="cc-anim-blink" />
      </span>
    </div>
  );
}

function SavedScene(): ReactElement {
  return (
    <div className="cs-scene cs-scene-saved">
      <svg
        className="cs-scene-art"
        viewBox="0 0 160 120"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx={82} cy={110} rx={40} ry={5.5} fill="#30233f1a" />
        <g className="cs-heart-hug" transform="translate(66 24) scale(2.6)">
          <path
            d={HEART}
            fill="#ffe6ec"
            stroke="#ff8fb1"
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
        </g>
        <g className="cs-hug-arms">
          <path
            d="M50 64c10-2 18 0 24 5"
            fill="none"
            stroke={INK}
            strokeWidth={7.4}
            strokeLinecap="round"
          />
          <path
            d="M50 64c10-2 18 0 24 5"
            fill="none"
            stroke="#fff7e7"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path
            d="M52 82c10 1 18-1 23-6"
            fill="none"
            stroke={INK}
            strokeWidth={7.4}
            strokeLinecap="round"
          />
          <path
            d="M52 82c10 1 18-1 23-6"
            fill="none"
            stroke="#fff7e7"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <span className="cs-bun">
        <PetFace kind="rabbit" mood="love" size={50} className="cc-anim-blink" />
      </span>
    </div>
  );
}

export function EmptyScene({
  scene,
}: {
  scene: "cart" | "search" | "saved";
}): ReactElement {
  if (scene === "cart") return <CartScene />;
  if (scene === "saved") return <SavedScene />;
  return <SearchScene />;
}
