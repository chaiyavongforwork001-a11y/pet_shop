"use client";
import { useState } from "react";
import { PetFace, type FaceKind } from "./core-faces";

const CHIPS: { kind: FaceKind; label: string }[] = [
  { kind: "dog", label: "เล่นกับน้องหมา" },
  { kind: "cat", label: "เล่นกับน้องแมว" },
  { kind: "rabbit", label: "เล่นกับน้องกระต่าย" },
];

export function HeroPets({
  ready,
  active,
  onPick,
  onRelease,
}: {
  ready: boolean;
  active: number;
  onPick: (i: 0 | 1 | 2) => void;
  onRelease: () => void;
}) {
  const [hover, setHover] = useState(-1);
  return (
    <div
      className="ch-pets"
      role="group"
      aria-label="เล่นกับเพื่อน ๆ"
      onKeyDown={(e) => {
        if (e.key === "Escape") onRelease();
      }}
    >
      {CHIPS.map((chip, i) => (
        <button
          key={chip.kind}
          type="button"
          className="ch-pet"
          aria-label={chip.label}
          aria-pressed={active === i}
          disabled={!ready}
          onClick={() => onPick(i as 0 | 1 | 2)}
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover((v) => (v === i ? -1 : v))}
        >
          <PetFace
            kind={chip.kind}
            size={26}
            mood={active === i ? "happy" : "idle"}
            className={`cc-anim-blink ${hover === i ? "cc-anim-ears" : ""}`}
          />
        </button>
      ))}
    </div>
  );
}
