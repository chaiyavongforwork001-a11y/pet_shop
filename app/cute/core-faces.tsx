import type { ReactElement, ReactNode } from 'react';
import type { FaceKind } from './core-events';

export type { FaceKind } from './core-events';

export type FaceMood =
  | 'idle'
  | 'happy'
  | 'love'
  | 'sleepy'
  | 'worried'
  | 'surprised';

export type TreatKind = 'bone' | 'fish' | 'carrot' | 'heart' | 'paw' | 'star';

const INK = '#30233f';
const EYE = '#252135';
const PINK = '#f3a8ad';
const BLUSH = '#e7a4b0';
const CREAM = '#fff7e7';
const LOVE = '#ff8fb1';
const MOUTH = '#a54d71';
const WHITE = '#ffffff';
const n = (value: number): number => Number(value.toFixed(2));

type FaceGeom = {
  fur: string;
  headRx: number;
  headRy: number;
  headCy: number;
  eyeDx: number;
  eyeY: number;
  noseY: number;
  blushDx: number;
  blushY: number;
};

const GEOM: Record<FaceKind, FaceGeom> = {
  dog: {
    fur: '#e4a157',
    headRx: 22,
    headRy: 19,
    headCy: 36,
    eyeDx: 8.8,
    eyeY: 32.6,
    noseY: 40.4,
    blushDx: 16,
    blushY: 41,
  },
  cat: {
    fur: '#a4a4bc',
    headRx: 20.5,
    headRy: 18,
    headCy: 36,
    eyeDx: 8.2,
    eyeY: 33.6,
    noseY: 41,
    blushDx: 15,
    blushY: 41.4,
  },
  rabbit: {
    fur: CREAM,
    headRx: 19,
    headRy: 18,
    headCy: 37,
    eyeDx: 7.6,
    eyeY: 34.6,
    noseY: 42,
    blushDx: 13.6,
    blushY: 42.4,
  },
};

function earArt(kind: FaceKind): { l: ReactNode; r: ReactNode } {
  if (kind === 'dog')
    return {
      l: (
        <>
          <path
            d="M19.4 25.6C11.2 22.4 7 13.4 10.2 8.8c3-4.4 11 1.4 14.4 10.2Z"
            fill="#e4a157"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <path
            d="M20.6 21.4c-4.6-2-7-7-5.4-9.4 1.6-2.4 6 1 8 6Z"
            fill={PINK}
          />
        </>
      ),
      r: (
        <>
          <path
            d="M44.6 25.6C52.8 22.4 57 13.4 53.8 8.8c-3-4.4-11 1.4-14.4 10.2Z"
            fill="#e4a157"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <path
            d="M43.4 21.4c4.6-2 7-7 5.4-9.4-1.6-2.4-6 1-8 6Z"
            fill={PINK}
          />
        </>
      ),
    };
  if (kind === 'cat')
    return {
      l: (
        <>
          <path
            d="M19.8 24.6L16.4 10.4L29.6 18.8Z"
            fill="#a4a4bc"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <path d="M21.2 21.8L19.6 14.2L26.4 18.4Z" fill={PINK} />
        </>
      ),
      r: (
        <>
          <path
            d="M44.2 24.6L47.6 10.4L34.4 18.8Z"
            fill="#a4a4bc"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <path d="M42.8 21.8L44.4 14.2L37.6 18.4Z" fill={PINK} />
        </>
      ),
    };
  return {
    l: (
      <>
        <ellipse
          cx={24}
          cy={15}
          rx={6.2}
          ry={13.4}
          transform="rotate(-11 24 15)"
          fill={CREAM}
          stroke={INK}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <ellipse
          cx={24}
          cy={16}
          rx={3}
          ry={9}
          transform="rotate(-11 24 16)"
          fill={PINK}
        />
      </>
    ),
    r: (
      <>
        <ellipse
          cx={40}
          cy={15}
          rx={6.2}
          ry={13.4}
          transform="rotate(11 40 15)"
          fill={CREAM}
          stroke={INK}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <ellipse
          cx={40}
          cy={16}
          rx={3}
          ry={9}
          transform="rotate(11 40 16)"
          fill={PINK}
        />
      </>
    ),
  };
}

function eyeArt(mood: FaceMood, geom: FaceGeom): ReactNode {
  const xs = [32 - geom.eyeDx, 32 + geom.eyeDx];
  const y = geom.eyeY;
  if (mood === 'happy')
    return xs.map((cx, i) => (
      <path
        key={i}
        d={`M${n(cx - 4.2)} ${n(y + 1.9)}Q${cx} ${n(y - 4.5)} ${n(cx + 4.2)} ${n(y + 1.9)}`}
        fill="none"
        stroke={EYE}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    ));
  if (mood === 'sleepy')
    return xs.map((cx, i) => (
      <path
        key={i}
        d={`M${n(cx - 4.2)} ${n(y - 1.4)}Q${cx} ${n(y + 3.6)} ${n(cx + 4.2)} ${n(y - 1.4)}`}
        fill="none"
        stroke={EYE}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    ));
  if (mood === 'love')
    return xs.map((cx, i) => (
      <path
        key={i}
        d={`M${cx} ${n(y + 4)}c-5-3.8-5.6-7-3.2-8.2 1.4-.7 2.7 0 3.2 1 .5-1 1.8-1.7 3.2-1 2.4 1.2 1.8 4.4-3.2 8.2Z`}
        fill={LOVE}
      />
    ));
  if (mood === 'surprised')
    return xs.map((cx, i) => (
      <g key={i}>
        <circle cx={cx} cy={y} r={4.4} fill={EYE} />
        <circle cx={cx + 1.5} cy={y - 1.8} r={1.3} fill={WHITE} />
      </g>
    ));
  if (mood === 'worried')
    return xs.map((cx, i) => (
      <g key={i}>
        <ellipse cx={cx} cy={y + 0.8} rx={3} ry={3.6} fill={EYE} />
        <circle cx={cx + 1.1} cy={y - 0.6} r={1.1} fill={WHITE} />
        <path
          d={`M${n(i ? cx + 4.6 : cx - 4.6)} ${n(y - 5.2)}L${n(i ? cx - 3.4 : cx + 3.4)} ${n(y - 8)}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </g>
    ));
  return xs.map((cx, i) => (
    <g key={i}>
      <ellipse cx={cx} cy={y} rx={3.4} ry={4.3} fill={EYE} />
      <circle cx={cx + 1.2} cy={y - 1.6} r={1.1} fill={WHITE} />
    </g>
  ));
}

function noseArt(kind: FaceKind, ny: number): ReactNode {
  if (kind === 'dog')
    return (
      <>
        <ellipse cx={32} cy={ny} rx={4.3} ry={3.3} fill={EYE} />
        <ellipse
          cx={30.5}
          cy={ny - 1.1}
          rx={1.2}
          ry={0.8}
          fill={WHITE}
          opacity={0.55}
        />
      </>
    );
  return (
    <path
      d={`M28.6 ${n(ny - 1.6)}h6.8L32 ${n(ny + 2.6)}Z`}
      fill={PINK}
      stroke={INK}
      strokeWidth={1.2}
      strokeLinejoin="round"
    />
  );
}

function mouthArt(kind: FaceKind, mood: FaceMood, ny: number): ReactNode {
  if (mood === 'surprised')
    return (
      <ellipse
        cx={32}
        cy={ny + 6.4}
        rx={2.7}
        ry={3.3}
        fill={MOUTH}
        stroke={INK}
        strokeWidth={1.2}
      />
    );
  if (mood === 'worried')
    return (
      <path
        d={`M27 ${n(ny + 6)}Q29.5 ${n(ny + 3.6)} 32 ${n(ny + 6)}Q34.5 ${n(ny + 8.4)} 37 ${n(ny + 5.4)}`}
        fill="none"
        stroke={INK}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    );
  if (kind === 'dog')
    return (
      <>
        {(mood === 'happy' || mood === 'love') && (
          <path
            d={`M29.4 ${n(ny + 5.2)}Q32 ${n(ny + 11.4)} 34.6 ${n(ny + 5.2)}Z`}
            fill={PINK}
            stroke={INK}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        )}
        <path
          d={`M32 ${n(ny + 3)}v2M32 ${n(ny + 5)}Q28.6 ${n(ny + 8.4)} 25.6 ${n(ny + 4.8)}M32 ${n(ny + 5)}Q35.4 ${n(ny + 8.4)} 38.4 ${n(ny + 4.8)}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </>
    );
  if (kind === 'cat')
    return (
      <>
        <path
          d={`M21 ${n(ny - 1.6)}L12.8 ${n(ny - 3.6)}M21 ${n(ny + 1.8)}L12.8 ${n(ny + 1.6)}M43 ${n(ny - 1.6)}L51.2 ${n(ny - 3.6)}M43 ${n(ny + 1.8)}L51.2 ${n(ny + 1.6)}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.5}
        />
        <path
          d={`M32 ${n(ny + 2.8)}Q29.4 ${n(ny + 6)} 26.8 ${n(ny + 3)}M32 ${n(ny + 2.8)}Q34.6 ${n(ny + 6)} 37.2 ${n(ny + 3)}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </>
    );
  return (
    <path
      d={`M32 ${n(ny + 2.4)}v1.8M32 ${n(ny + 4.2)}Q29.9 ${n(ny + 7)} 28.2 ${n(ny + 4.4)}M32 ${n(ny + 4.2)}Q34.1 ${n(ny + 7)} 35.8 ${n(ny + 4.4)}`}
      fill="none"
      stroke={INK}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  );
}

export function PetFace({
  kind,
  mood = 'idle',
  size = 40,
  className,
  label,
}: {
  kind: FaceKind;
  mood?: FaceMood;
  size?: number;
  className?: string;
  label?: string;
}): ReactElement {
  const geom = GEOM[kind];
  const ears = earArt(kind);
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      focusable="false"
      className={`cc-face cc-face-${kind} is-${mood} ${className ?? ''}`}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
    >
      {label ? <title>{label}</title> : null}
      <g className="cc-face-ear cc-face-ear-l">{ears.l}</g>
      <g className="cc-face-ear cc-face-ear-r">{ears.r}</g>
      <ellipse
        cx={32}
        cy={geom.headCy}
        rx={geom.headRx}
        ry={geom.headRy}
        fill={geom.fur}
        stroke={INK}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {kind === 'dog' ? (
        <>
          <path
            d="M32 18.6c-4.4 4.8-5.4 11.8-4 17.4h8c1.4-5.6.4-12.6-4-17.4Z"
            fill={CREAM}
          />
          <ellipse cx={32} cy={43.6} rx={12.6} ry={8.6} fill={CREAM} />
        </>
      ) : null}
      <g className="cc-face-blush">
        <ellipse
          cx={32 - geom.blushDx}
          cy={geom.blushY}
          rx={4.4}
          ry={2.9}
          fill={BLUSH}
          opacity={0.85}
        />
        <ellipse
          cx={32 + geom.blushDx}
          cy={geom.blushY}
          rx={4.4}
          ry={2.9}
          fill={BLUSH}
          opacity={0.85}
        />
      </g>
      <g className="cc-face-eyes">{eyeArt(mood, geom)}</g>
      {noseArt(kind, geom.noseY)}
      {mouthArt(kind, mood, geom.noseY)}
    </svg>
  );
}

const TREAT: Record<TreatKind, string> = {
  bone: '<path d="M4.2 8.4c0-1.9 1.6-3.4 3.5-3.4s3.5 1.5 3.5 3.4h1.6c0-1.9 1.6-3.4 3.5-3.4s3.5 1.5 3.5 3.4c0 1.3-.7 2.4-1.8 3.1 1.1.7 1.8 1.8 1.8 3.1 0 1.9-1.6 3.4-3.5 3.4s-3.5-1.5-3.5-3.4h-1.6c0 1.9-1.6 3.4-3.5 3.4s-3.5-1.5-3.5-3.4c0-1.3.7-2.4 1.8-3.1-1.1-.7-1.8-1.8-1.8-3.1Z" fill="#fff7e7" stroke="#30233f" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="7.4" cy="8.4" rx="1.6" ry="1" fill="#ffffff" opacity=".85"/>',
  fish: '<path d="M6.8 12 1.9 7.2v9.6Z" fill="#9873b6" stroke="#30233f" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="13.6" cy="12" rx="7.6" ry="5.6" fill="#b998df" stroke="#30233f" stroke-width="1.5"/><circle cx="17.4" cy="10.4" r="1.2" fill="#30233f"/><ellipse cx="11.4" cy="9.2" rx="2.2" ry="1.1" fill="#ffffff" opacity=".7"/>',
  carrot:
    '<path d="M14.6 7.6 10 19.6c-.5 1.3-2.4 1.1-2.7-.3L5.1 9.1c-.3-1.3.9-2.4 2.2-2.1Z" fill="#f2994a" stroke="#30233f" stroke-width="1.5" stroke-linejoin="round"/><path d="M13.2 7.4c.7-3 3-4.8 5.6-4.9-.2 2.8-2 5-4.6 5.7Z" fill="#8fcf7a" stroke="#30233f" stroke-width="1.5" stroke-linejoin="round"/><path d="M11.8 6.8c-.6-2.6.3-5 2.2-6.2 1.2 2.1 1.2 4.6-.2 6.5Z" fill="#8fcf7a" stroke="#30233f" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.6 10.4 10.6 16" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>',
  heart:
    '<path d="M12 20.4 4.5 13C2.1 10.6 2.6 6.7 5.5 5.1 7.7 3.9 10.4 4.6 12 6.6c1.6-2 4.3-2.7 6.5-1.5 2.9 1.6 3.4 5.5 1 7.9Z" fill="#ff8fb1" stroke="#30233f" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.1 8.2c-.9.9-1.1 2.1-.5 3.1" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>',
  paw: '<path d="M12 11.3c3.1 0 5.6 2.3 5.6 4.9 0 2.2-1.8 3.6-3.7 3.6-.8 0-1.3-.3-1.9-.3s-1.1.3-1.9.3c-1.9 0-3.7-1.4-3.7-3.6 0-2.6 2.5-4.9 5.6-4.9Z" fill="#9873b6" stroke="#30233f" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="5.9" cy="9.6" rx="2.2" ry="2.7" transform="rotate(-20 5.9 9.6)" fill="#9873b6" stroke="#30233f" stroke-width="1.5"/><ellipse cx="10.3" cy="6.6" rx="2.2" ry="2.8" fill="#9873b6" stroke="#30233f" stroke-width="1.5"/><ellipse cx="14.8" cy="6.6" rx="2.2" ry="2.8" fill="#9873b6" stroke="#30233f" stroke-width="1.5"/><ellipse cx="18.1" cy="9.6" rx="2.2" ry="2.7" transform="rotate(20 18.1 9.6)" fill="#9873b6" stroke="#30233f" stroke-width="1.5"/><ellipse cx="10.2" cy="14.6" rx="1.7" ry="1" fill="#ffffff" opacity=".55"/>',
  star: '<path d="M12 2.6 14.8 8.7 21.4 9.5 16.5 14.1 17.8 20.6 12 17.3 6.2 20.6 7.5 14.1 2.6 9.5 9.2 8.7Z" fill="#f5db72" stroke="#30233f" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.6 7.8 11.1 5" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>',
};

export function TreatIcon({
  kind,
  size,
  className,
}: {
  kind: TreatKind;
  size?: number;
  className?: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size ?? 24}
      height={size ?? 24}
      aria-hidden="true"
      focusable="false"
      className={`cc-treat cc-treat-${kind} ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: TREAT[kind] }}
    />
  );
}

export function treatSvg(kind: TreatKind, size = 18): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false" class="cc-treat cc-treat-${kind}">${TREAT[kind]}</svg>`;
}

type RunnerGeom = { fur: string; leg: string; belly: string };

const RUNNER: Record<FaceKind, RunnerGeom> = {
  dog: { fur: '#e4a157', leg: '#c9884a', belly: CREAM },
  cat: { fur: '#a4a4bc', leg: '#8c8ca6', belly: '#c8c8d8' },
  rabbit: { fur: CREAM, leg: '#eadcc6', belly: '#fffdf9' },
};

function runnerLeg(x: number, fill: string, key: number): ReactElement {
  return (
    <rect
      key={key}
      x={x}
      y={14.4}
      width={4.4}
      height={10}
      rx={2.2}
      fill={fill}
      stroke={INK}
      strokeWidth={1.4}
    />
  );
}

function runnerHead(kind: FaceKind, g: RunnerGeom): ReactNode {
  if (kind === 'dog')
    return (
      <>
        <path
          d="M27.6 5.6c-.8-2.8 0-4.8 1.7-5 1.7-.2 2.7 1.7 2.4 4.1Z"
          fill={g.fur}
          stroke={INK}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <circle
          cx={30.6}
          cy={10.2}
          r={6.4}
          fill={g.fur}
          stroke={INK}
          strokeWidth={1.5}
        />
        <ellipse cx={34} cy={12.6} rx={3.6} ry={2.8} fill={g.belly} />
        <circle cx={32.4} cy={9} r={1.2} fill={EYE} />
        <ellipse cx={36.4} cy={11.4} rx={1.6} ry={1.3} fill={EYE} />
      </>
    );
  if (kind === 'cat')
    return (
      <>
        <path
          d="M26.8 6.4 26.2 1.6 30.4 4.2Z"
          fill={g.fur}
          stroke={INK}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <path
          d="M33.6 5.2 35.4 1 36.4 6Z"
          fill={g.fur}
          stroke={INK}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <circle
          cx={31}
          cy={10}
          r={6.1}
          fill={g.fur}
          stroke={INK}
          strokeWidth={1.5}
        />
        <circle cx={32.8} cy={8.8} r={1.2} fill={EYE} />
        <path
          d="M36.6 11.2 34.8 10.2 36.6 9.2Z"
          fill={PINK}
          stroke={INK}
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
      </>
    );
  return (
    <>
      <ellipse
        cx={29.4}
        cy={3.8}
        rx={1.9}
        ry={3.8}
        transform="rotate(-12 29.4 3.8)"
        fill={g.fur}
        stroke={INK}
        strokeWidth={1.4}
      />
      <ellipse
        cx={33.4}
        cy={3.6}
        rx={1.9}
        ry={3.8}
        transform="rotate(8 33.4 3.6)"
        fill={g.fur}
        stroke={INK}
        strokeWidth={1.4}
      />
      <circle
        cx={31}
        cy={10.4}
        r={5.9}
        fill={g.fur}
        stroke={INK}
        strokeWidth={1.5}
      />
      <circle cx={32.8} cy={9.2} r={1.2} fill={EYE} />
      <path
        d="M36.2 11.4 34.4 10.4 36.2 9.4Z"
        fill={PINK}
        stroke={INK}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    </>
  );
}

function runnerTail(kind: FaceKind, g: RunnerGeom): ReactNode {
  if (kind === 'rabbit')
    return (
      <circle
        cx={5.6}
        cy={11.6}
        r={3.2}
        fill={g.belly}
        stroke={INK}
        strokeWidth={1.5}
      />
    );
  const d =
    kind === 'dog'
      ? 'M9.4 11.2C4.6 9.6 2.8 5.8 5 3.6c1.8-1.8 4 .2 3.6 2.4'
      : 'M9 12.4C3.4 12.4 2 6.6 5.8 3.4';
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={INK}
        strokeWidth={5.4}
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke={g.fur}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </>
  );
}

export function PetRunner({
  kind,
  width = 40,
  className,
}: {
  kind: FaceKind;
  width?: number;
  className?: string;
}): ReactElement {
  const g = RUNNER[kind];
  return (
    <svg
      viewBox="0 0 40 26"
      width={width}
      height={(width * 26) / 40}
      aria-hidden="true"
      focusable="false"
      className={`cc-runner cc-runner-${kind} ${className ?? ''}`}
    >
      <g className="cc-tail">{runnerTail(kind, g)}</g>
      <g className="cc-leg-b">
        {[runnerLeg(12.6, g.leg, 0), runnerLeg(22.6, g.leg, 1)]}
      </g>
      <ellipse
        cx={17.4}
        cy={13.4}
        rx={11.4}
        ry={7}
        fill={g.fur}
        stroke={INK}
        strokeWidth={1.5}
      />
      <ellipse cx={18.4} cy={16.4} rx={7.4} ry={3.4} fill={g.belly} />
      <g className="cc-leg-a">
        {[runnerLeg(8.8, g.fur, 0), runnerLeg(19, g.fur, 1)]}
      </g>
      {runnerHead(kind, g)}
    </svg>
  );
}

export const treatForPet = (pet?: string): TreatKind =>
  pet === 'cat' ? 'fish' : pet === 'exotic' || pet === 'rabbit' ? 'carrot' : 'bone';
