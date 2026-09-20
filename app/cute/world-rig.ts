// Idle rig, personalities and trick timelines for the three 3D pets.
// Only pet-world.tsx imports this module (three stays inside the lazy chunk).
import * as THREE from "three";
import type { WorldKind } from "./core-events";

export type FxKind = "heart" | "star" | "sparkle";
export type TrickType = "none" | "trick" | "toyLook" | "cheer" | "photo";

/** Additive per-frame offsets. Everything else stays at the build pose. */
export type Act = {
  y: number;
  spin: number;
  sx: number;
  sy: number;
  pitch: number;
  wiggle: number;
  tailBoost: number;
  earPerk: number;
  /** Seconds of ^^ eyes left. Not cleared by resetAct. */
  happy: number;
  /** Seconds of the "tapped too soon" squash left. */
  squash: number;
};

export type Critter = {
  kind: WorldKind;
  group: THREE.Group;
  body: THREE.Mesh;
  belly: THREE.Mesh;
  head: THREE.Group;
  ears: THREE.Object3D[];
  earPivots: [THREE.Group, THREE.Group];
  tailPivot: THREE.Group;
  tail: THREE.Object3D;
  eyes: [THREE.Mesh, THREE.Mesh];
  eyeBase: [THREE.Vector3, THREE.Vector3];
  glints: [THREE.Mesh, THREE.Mesh];
  glintBase: [THREE.Vector3, THREE.Vector3];
  happyEyes: THREE.Mesh[];
  cheeks: THREE.Mesh[];
  cheekMat: THREE.MeshPhysicalMaterial;
  arms: [THREE.Mesh, THREE.Mesh];
  feet: [THREE.Mesh, THREE.Mesh];
  nose: THREE.Mesh;
  mouth?: THREE.Mesh;
  tongue?: THREE.Mesh;
  carrot?: THREE.Group;
  y: number;
  rotY: number;
  scale: number;
  blink: { next: number; t: number; dbl: boolean };
  twitch: { next: number; t: number; side: number };
  flop: { next: number; t: number; side: number };
  /** Bunny nose sniff bursts. */
  sniff: { next: number; t: number };
  /** Accumulated tail-wag phase, so the speed can change without a jump. */
  tailPhase: number;
  act: Act;
  hoverT: number;
  petDist: number;
  petCount: number;
  lastHeart: number;
  trick: {
    type: TrickType;
    t: number;
    dur: number;
    delay: number;
    line: string;
    cooldownUntil: number;
  };
  lookYaw: number;
  lookPitch: number;
  /** Damped 0..1 "puppy eyes" amount. */
  puppyT: number;
  gazeTarget: THREE.Vector3 | null;
  gazeUntil: number;
  /** True while the current gaze target is the camera. */
  gazeIsCam: boolean;
  /** Scratch storage so gaze targets never allocate. */
  gazeVec: THREE.Vector3;
  gazeOverride: THREE.Vector3 | null;
  gazeOverrideUntil: number;
  overrideVec: THREE.Vector3;
};

export type TrickHooks = {
  spawn: (
    kind: FxKind,
    c: Critter,
    count: number,
    opts?: { spread?: number; up?: number; life?: number; buoyancy?: number },
  ) => void;
  emote: (c: Critter, text: string) => void;
};

export const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = x - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
};

export const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

// Build-pose constants, taken from the mesh construction in pet-world.tsx.
const BODY_SY = 0.68;
const BELLY_SY = 0.46;
const HEAD_Y = 1.43;
const ARM_Z = 0.15;
export const EYE_SCALE = { x: 0.102, y: 0.136, z: 0.075 } as const;
const NOSE = { x: 0.09, y: 0.062, z: 0.055 } as const;
const TONGUE = { x: 0.07, y: 0.1, z: 0.036 } as const;
const CHEEK = { x: 0.115, y: 0.056, z: 0.025 } as const;
const MOUTH = { x: 0.11, y: 0.075, z: 0.04 } as const;

const BREATH: readonly [number, number, number] = [2.6, 1.8, 3.0];
const BLINK_DUR = 0.16;
const TWITCH_DUR = 0.6;
const FLOP_IN = 0.3;
const FLOP_HOLD = 1.2;
const FLOP_OUT = 0.4;
const FLOP_DUR = FLOP_IN + FLOP_HOLD + FLOP_OUT;
const SNIFF_DUR = 0.5;
export const HAPPY_DUR = 1.6;

/** Trick lengths per pet, in seconds. */
export const TRICK_DUR: readonly [number, number, number] = [0.95, 1.5, 1.6];
export const CHEER_DUR = 0.5;
export const TOY_LOOK_DUR = 1.2;
export const PHOTO_DUR = 2.6;
export const TRICK_COOLDOWN = 1.1;

export type CritterParts = {
  kind: WorldKind;
  group: THREE.Group;
  body: THREE.Mesh;
  belly: THREE.Mesh;
  head: THREE.Group;
  ears: THREE.Object3D[];
  earPivots: [THREE.Group, THREE.Group];
  tailPivot: THREE.Group;
  tail: THREE.Object3D;
  eyes: [THREE.Mesh, THREE.Mesh];
  glints: [THREE.Mesh, THREE.Mesh];
  happyEyes: THREE.Mesh[];
  cheeks: THREE.Mesh[];
  cheekMat: THREE.MeshPhysicalMaterial;
  arms: [THREE.Mesh, THREE.Mesh];
  feet: [THREE.Mesh, THREE.Mesh];
  nose: THREE.Mesh;
  mouth?: THREE.Mesh;
  tongue?: THREE.Mesh;
  carrot?: THREE.Group;
};

/** Wraps the meshes built in pet-world.tsx into a runtime rig record. */
export function createCritter(parts: CritterParts): Critter {
  return {
    ...parts,
    eyeBase: [parts.eyes[0].position.clone(), parts.eyes[1].position.clone()],
    glintBase: [
      parts.glints[0].position.clone(),
      parts.glints[1].position.clone(),
    ],
    y: parts.group.position.y,
    rotY: parts.group.rotation.y,
    scale: parts.group.scale.x,
    // Seeded here (inside the caller's effect) so each pet runs its own
    // schedule and nothing is random during render.
    blink: { next: 1 + Math.random() * 4, t: 0, dbl: false },
    twitch: { next: 2 + Math.random() * 6, t: 0, side: 0 },
    flop: { next: 6 + Math.random() * 12, t: 0, side: 0 },
    sniff: { next: 1 + Math.random() * 4, t: 0 },
    tailPhase: Math.random() * Math.PI * 2,
    act: {
      y: 0,
      spin: 0,
      sx: 1,
      sy: 1,
      pitch: 0,
      wiggle: 0,
      tailBoost: 0,
      earPerk: 0,
      happy: 0,
      squash: 0,
    },
    hoverT: 0,
    petDist: 0,
    petCount: 0,
    lastHeart: 0,
    trick: {
      type: "none",
      t: 0,
      dur: 0,
      delay: 0,
      line: "",
      cooldownUntil: 0,
    },
    lookYaw: 0,
    lookPitch: 0,
    puppyT: 0,
    gazeTarget: null,
    gazeUntil: 0,
    gazeIsCam: false,
    gazeVec: new THREE.Vector3(),
    gazeOverride: null,
    gazeOverrideUntil: 0,
    overrideVec: new THREE.Vector3(),
  };
}

/** Returns every directly-driven part to its build pose. Call once per frame. */
export function resetAct(c: Critter): void {
  const a = c.act;
  a.y = 0;
  a.spin = 0;
  a.sx = 1;
  a.sy = 1;
  a.pitch = 0;
  a.wiggle = 0;
  a.tailBoost = 0;
  a.earPerk = 0;
  c.earPivots[0].rotation.set(0, 0, 0);
  c.earPivots[1].rotation.set(0, 0, 0);
  c.tailPivot.rotation.set(0, 0, 0);
  c.tailPivot.scale.set(1, 1, 1);
  c.arms[0].rotation.set(0, 0, -ARM_Z);
  c.arms[1].rotation.set(0, 0, ARM_Z);
  c.feet[0].rotation.set(0, 0, 0);
  c.feet[1].rotation.set(0, 0, 0);
  c.nose.scale.set(NOSE.x, NOSE.y, NOSE.z);
  if (c.mouth) c.mouth.scale.set(MOUTH.x, MOUTH.y, MOUTH.z);
  if (c.tongue) c.tongue.scale.set(TONGUE.x, TONGUE.y, TONGUE.z);
  if (c.carrot) {
    c.carrot.visible = false;
    c.carrot.scale.set(1, 1, 1);
  }
}

function photoPose(c: Critter, t: number): void {
  if (c.kind === 0) {
    c.arms[1].rotation.x = -1.2;
  } else if (c.kind === 1) {
    c.arms[1].rotation.x = -0.6 + Math.sin(t * 12) * 0.4;
  } else {
    c.earPivots[0].rotation.z = -0.16;
    c.earPivots[1].rotation.z = 0.16;
  }
}

/**
 * Advances the running trick and writes it into `act` and the driven meshes.
 * Runs after resetAct and before updateIdle, so idle life layers on top.
 */
export function applyTrick(
  c: Critter,
  dt: number,
  animate: boolean,
  hooks: TrickHooks,
): void {
  const tr = c.trick;
  if (tr.type === "none") return;
  if (!animate) {
    // Under motion-off only the photo pose is applied; the other tricks are
    // handled as a static bubble by pet-world.tsx.
    if (tr.type === "photo") photoPose(c, 0);
    return;
  }
  if (tr.delay > 0) {
    tr.delay -= dt;
    if (tr.delay > 0) return;
  }
  const prev = tr.t;
  tr.t += dt;
  const dur = tr.dur;
  const t = tr.t;
  const u = Math.min(1, t / dur);
  const a = c.act;
  if (prev <= 0 && tr.line) hooks.emote(c, tr.line);

  if (tr.type === "cheer") {
    a.y = Math.sin(Math.PI * u) * 0.28;
    a.tailBoost = 1.2;
    a.earPerk = 0.6;
  } else if (tr.type === "toyLook") {
    a.earPerk = 1;
    a.tailBoost = 1;
  } else if (tr.type === "photo") {
    photoPose(c, t);
  } else if (c.kind === 0) {
    a.y = Math.sin(Math.PI * u) * 0.32;
    a.spin = easeInOutCubic(u) * Math.PI * 2;
    a.tailBoost = 1.6;
    const open = Math.sin(Math.PI * u);
    if (c.tongue) c.tongue.scale.y = TONGUE.y * (1 + 0.7 * open);
    if (c.mouth) c.mouth.scale.set(MOUTH.x, MOUTH.y * (1 + 0.5 * open), MOUTH.z);
    c.feet[0].rotation.x = -0.4 * open;
    c.feet[1].rotation.x = -0.4 * open;
    if (prev < dur * 0.5 && t >= dur * 0.5) hooks.spawn("star", c, 6);
  } else if (c.kind === 1) {
    if (u < 0.45) {
      const e = easeInOutCubic(u / 0.45);
      a.sx = 1 + 0.1 * e;
      a.sy = 1 - 0.12 * e;
      a.pitch = 0.25 * e;
      c.arms[0].rotation.x = -0.8 * e;
      c.arms[1].rotation.x = -0.8 * e;
      c.tailPivot.rotation.z = -0.6 * e;
    } else if (u < 0.72) {
      a.sx = 1.1;
      a.sy = 0.88;
      a.pitch = 0.25;
      c.arms[0].rotation.x = -0.8;
      c.arms[1].rotation.x = -0.8;
      c.tailPivot.rotation.z = -0.6;
      if (a.happy < 0.16) a.happy = 0.16;
    } else {
      const e = clamp(easeOutBack((u - 0.72) / 0.28), 0, 1.2);
      a.sx = 1.1 - 0.1 * e;
      a.sy = 0.88 + 0.12 * e;
      a.pitch = 0.25 * (1 - e);
      c.arms[0].rotation.x = -0.8 * (1 - e);
      c.arms[1].rotation.x = -0.8 * (1 - e);
      c.tailPivot.rotation.z = -0.6 * (1 - e);
    }
    if (prev < dur * 0.2 && t >= dur * 0.2)
      hooks.spawn("heart", c, 4, { buoyancy: 0.4, up: 0.7 });
  } else {
    const HOP = 0.34;
    if (t < HOP * 2) {
      const h = (t % HOP) / HOP;
      a.y = Math.abs(Math.sin(Math.PI * h)) * 0.4;
      const v = ((0.4 * Math.PI) / HOP) * Math.cos(Math.PI * h);
      const lag = clamp(-v * 0.1, -0.45, 0.45);
      c.earPivots[0].rotation.x += lag;
      c.earPivots[1].rotation.x += lag;
      c.feet[0].rotation.x = -1.1 * (a.y / 0.4);
      c.feet[1].rotation.x = -1.1 * (a.y / 0.4);
    } else if (c.carrot) {
      const e = t - HOP * 2;
      c.carrot.visible = true;
      if (e < 0.25) {
        c.carrot.scale.setScalar(clamp(easeOutBack(e / 0.25), 0.01, 1.3));
      } else if (e < 0.85) {
        const bite = Math.floor((e - 0.25) / 0.2);
        const w = ((e - 0.25) % 0.2) / 0.2;
        a.pitch = Math.sin(Math.PI * w) * 0.3;
        c.carrot.scale.y = Math.max(0, 1 - (bite + (w > 0.5 ? 1 : 0)) / 3);
      } else {
        c.carrot.visible = false;
      }
    }
    if (prev < HOP * 2 && t >= HOP * 2) hooks.spawn("sparkle", c, 3);
  }

  if (t >= dur) {
    tr.type = "none";
    tr.t = 0;
    tr.line = "";
  }
}

/**
 * Breathing, blinking, ear twitches, tails and the hover flush.
 * Runs after applyTrick and adds on top of it.
 */
export function updateIdle(
  c: Critter,
  i: number,
  t: number,
  dt: number,
  animate: boolean,
): void {
  const a = c.act;
  if (animate) {
    const rate = BREATH[c.kind];
    const s = Math.sin(t * rate + i * 1.7);
    c.body.scale.y = BODY_SY * (1 + 0.02 * s);
    c.belly.scale.y = BELLY_SY * (1 + 0.02 * s);
    c.head.position.y = HEAD_Y + 0.012 * Math.sin(t * rate + i * 1.7 + 0.6);

    // Blink, with a 20% chance of a double blink.
    const b = c.blink;
    if (b.t > 0) {
      b.t -= dt;
      if (b.t <= 0) {
        if (b.dbl) {
          b.dbl = false;
          b.t = BLINK_DUR;
        } else {
          b.next = t + 2.5 + Math.random() * 4;
        }
      }
    } else if (t >= b.next) {
      b.t = BLINK_DUR;
      b.dbl = Math.random() < 0.2;
    }

    // Ear twitch.
    const tw = c.twitch;
    if (tw.t > 0) {
      tw.t -= dt;
      const u = clamp(1 - tw.t / TWITCH_DUR, 0, 1);
      c.earPivots[tw.side].rotation.x +=
        -0.4 * Math.exp(-8 * u) * Math.sin(22 * u);
      if (tw.t <= 0)
        tw.next = t + 3 + Math.random() * (c.kind === 2 ? 3 : 6);
    } else if (t >= tw.next) {
      tw.t = TWITCH_DUR;
      tw.side = Math.random() < 0.5 ? 0 : 1;
    }

    if (c.kind === 2) {
      // One-ear flop.
      const f = c.flop;
      if (f.t > 0) {
        f.t -= dt;
        const el = FLOP_DUR - f.t;
        const amount =
          el < FLOP_IN
            ? easeOutBack(el / FLOP_IN)
            : el < FLOP_IN + FLOP_HOLD
              ? 1
              : 1 - easeOutBack((el - FLOP_IN - FLOP_HOLD) / FLOP_OUT);
        c.earPivots[f.side].rotation.z +=
          (f.side === 0 ? -1 : 1) * 0.55 * amount;
        if (f.t <= 0) f.next = t + 12 + Math.random() * 8;
      } else if (t >= f.next) {
        f.t = FLOP_DUR;
        f.side = Math.random() < 0.5 ? 0 : 1;
      }
      // Nose sniff bursts.
      const n = c.sniff;
      if (n.t > 0) {
        n.t -= dt;
        const u = clamp(1 - n.t / SNIFF_DUR, 0, 1);
        c.nose.scale.x = NOSE.x * (1 + Math.sin(u * Math.PI * 5) * 0.06);
        c.nose.scale.y = NOSE.y * (1 - Math.sin(u * Math.PI * 5) * 0.04);
        if (n.t <= 0) n.next = t + 3 + Math.random() * 3;
      } else if (t >= n.next) {
        n.t = SNIFF_DUR;
      }
    }

    // Tails: fast corgi wag, slow cat sway, bunny wiggle. The phase is
    // accumulated so hover (x1.8) and trick boosts speed it up without a jump.
    const speed = 1 + 0.8 * c.hoverT + 0.5 * a.tailBoost;
    if (c.kind === 0) {
      c.tailPhase += dt * 9 * speed;
      c.tailPivot.rotation.z +=
        Math.sin(c.tailPhase) * 0.28 * (1 + a.tailBoost) + 0.12 * a.tailBoost;
    } else if (c.kind === 1) {
      c.tailPhase += dt * 1.6 * speed;
      c.tailPivot.rotation.y += Math.sin(c.tailPhase) * 0.25;
      c.tailPivot.rotation.x += Math.sin(c.tailPhase + 1) * 0.08 * a.tailBoost;
    } else {
      c.tailPhase += dt * 7 * speed;
      const w = Math.sin(c.tailPhase) * 0.07 * (1 + a.tailBoost);
      c.tailPivot.scale.set(1 + w, 1 - w * 0.6, 1 + w);
    }

    // Perk both ears while hovered or peeking.
    const perk = Math.max(c.hoverT, a.earPerk);
    if (perk > 0) {
      c.earPivots[0].rotation.x += -0.18 * perk;
      c.earPivots[1].rotation.x += -0.18 * perk;
    }

    if (a.squash > 0) {
      a.squash -= dt;
      a.sy *= 0.9;
      a.sx *= 1.04;
    }
    if (a.happy > 0) {
      a.wiggle += Math.sin(t * 22) * 0.05 * (a.happy / HAPPY_DUR);
      a.happy = Math.max(0, a.happy - dt);
    }
  } else {
    c.body.scale.y = BODY_SY;
    c.belly.scale.y = BELLY_SY;
    c.head.position.y = HEAD_Y;
    c.blink.t = 0;
  }

  // Eyes: blink, then the ^^ swap while a happy reaction is on.
  const happy = a.happy > 0;
  const k = c.blink.t > 0 ? Math.sin(Math.PI * (1 - c.blink.t / BLINK_DUR)) : 0;
  const open = EYE_SCALE.y * (1 - 0.85 * Math.max(0, k));
  for (let n = 0; n < 2; n++) {
    c.eyes[n].scale.y = open;
    c.eyes[n].visible = !happy;
    c.glints[n].visible = !happy && k <= 0.5;
  }
  for (let n = 0; n < c.happyEyes.length; n++)
    c.happyEyes[n].visible = happy;

  // Cheeks flush on hover.
  const flush = animate ? c.hoverT : 0;
  c.cheekMat.emissiveIntensity = 0.45 * flush;
  const f = 1 + 0.25 * flush;
  for (let n = 0; n < c.cheeks.length; n++)
    c.cheeks[n].scale.set(CHEEK.x * f, CHEEK.y * f, CHEEK.z * f);
}

/** Writes the composed act onto the group and head. */
export function composeCritter(
  c: Critter,
  i: number,
  t: number,
  animate: boolean,
): void {
  const a = c.act;
  c.group.position.y = c.y + a.y;
  c.group.rotation.set(-0.07 * c.hoverT, c.rotY + a.spin, a.wiggle);
  c.group.scale.set(c.scale * a.sx, c.scale * a.sy, c.scale * a.sx);
  const roll = animate ? Math.sin(t * 0.9 + i) * 0.055 : 0;
  c.head.rotation.set(c.lookPitch + a.pitch, c.lookYaw, roll);
}
