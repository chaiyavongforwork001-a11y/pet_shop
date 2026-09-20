// Time-of-day lighting and the night props for the 3D island.
// Only pet-world.tsx imports this module (three stays inside the lazy chunk).
import * as THREE from "three";

export type Phase = "morning" | "day" | "golden" | "night";

const PHASES: readonly Phase[] = ["morning", "day", "golden", "night"];

/** ?pawpal-phase=morning|day|golden|night — dev builds only. */
export function devPhase(): Phase | null {
  if (typeof window === "undefined") return null;
  if (process.env.NODE_ENV === "production") return null;
  try {
    const value = new URLSearchParams(window.location.search).get(
      "pawpal-phase",
    );
    const found = PHASES.find((p) => p === value);
    return found ?? null;
  } catch {
    return null;
  }
}

/** 6:00-10:00 morning, 10:00-16:00 day, 16:00-18:30 golden, otherwise night. */
export function getPhase(d: Date): Phase {
  const dev = devPhase();
  if (dev) return dev;
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 6 && h < 10) return "morning";
  if (h >= 10 && h < 16) return "day";
  if (h >= 16 && h < 18.5) return "golden";
  return "night";
}

/** Saturday or Sunday, 10:00-18:00. */
export function isWeekendDay(d: Date): boolean {
  const day = d.getDay();
  if (day !== 0 && day !== 6) return false;
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= 10 && h < 18;
}

export type SkyLights = {
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
};

type Look = {
  key: number;
  keyI: number;
  hemiI: number;
  ground: number;
  rimI: number;
  exposure: number;
};

const DAY: Look = {
  key: 0xfff7db,
  keyI: 2.8,
  hemiI: 0.85,
  ground: 0x8e65ae,
  rimI: 1.5,
  exposure: 0.95,
};

const LOOKS: Record<Phase, Look> = {
  morning: { ...DAY, key: 0xffe6c7, keyI: 2.6 },
  day: DAY,
  golden: { ...DAY, key: 0xffc58a, keyI: 2.4, ground: 0xb07aa0 },
  night: {
    ...DAY,
    key: 0xc8c2ff,
    keyI: 1.5,
    hemiI: 0.6,
    rimI: 2.0,
    exposure: 0.9,
  },
};

const BLEND = 3;

export type Sky = {
  /** The phase currently applied. */
  phase(): Phase;
  /** Re-read the clock. Returns true when the phase changed. */
  refresh(animate: boolean): boolean;
  /** Advance the cross-fade. Returns true while it is still blending. */
  update(dt: number): boolean;
};

/** Drives the three lights and the tone-mapping exposure from the visitor's clock. */
export function createSky(
  lights: SkyLights,
  renderer: THREE.WebGLRenderer,
): Sky {
  let phase = getPhase(new Date());
  let blend = 1;
  const from: Look = { ...LOOKS[phase] };
  let to: Look = LOOKS[phase];
  const keyColor = new THREE.Color();
  const groundColor = new THREE.Color();
  const fromKey = new THREE.Color();
  const toKey = new THREE.Color();
  const fromGround = new THREE.Color();
  const toGround = new THREE.Color();

  const apply = (k: number) => {
    fromKey.setHex(from.key);
    toKey.setHex(to.key);
    fromGround.setHex(from.ground);
    toGround.setHex(to.ground);
    keyColor.lerpColors(fromKey, toKey, k);
    groundColor.lerpColors(fromGround, toGround, k);
    lights.key.color.copy(keyColor);
    lights.hemi.groundColor.copy(groundColor);
    lights.key.intensity = from.keyI + (to.keyI - from.keyI) * k;
    lights.hemi.intensity = from.hemiI + (to.hemiI - from.hemiI) * k;
    lights.rim.intensity = from.rimI + (to.rimI - from.rimI) * k;
    renderer.toneMappingExposure =
      from.exposure + (to.exposure - from.exposure) * k;
  };

  const freeze = () => {
    from.key = to.key;
    from.keyI = to.keyI;
    from.hemiI = to.hemiI;
    from.ground = to.ground;
    from.rimI = to.rimI;
    from.exposure = to.exposure;
  };

  // Freeze the currently visible mix into `from`, so a phase change that lands
  // mid-blend keeps the lighting continuous.
  const capture = () => {
    fromKey.setHex(from.key);
    toKey.setHex(to.key);
    fromGround.setHex(from.ground);
    toGround.setHex(to.ground);
    from.key = fromKey.lerp(toKey, blend).getHex();
    from.ground = fromGround.lerp(toGround, blend).getHex();
    from.keyI += (to.keyI - from.keyI) * blend;
    from.hemiI += (to.hemiI - from.hemiI) * blend;
    from.rimI += (to.rimI - from.rimI) * blend;
    from.exposure += (to.exposure - from.exposure) * blend;
  };

  const set = (next: Phase, animate: boolean) => {
    if (next === phase && blend >= 1) return;
    if (blend < 1) capture();
    phase = next;
    to = LOOKS[next];
    if (animate) {
      blend = 0;
    } else {
      blend = 1;
      freeze();
      apply(1);
    }
  };

  apply(1);

  return {
    phase: () => phase,
    refresh(animate) {
      const next = getPhase(new Date());
      if (next === phase) return false;
      set(next, animate);
      return true;
    },
    update(dt) {
      if (blend >= 1) return false;
      blend = Math.min(1, blend + dt / BLEND);
      apply(blend);
      if (blend >= 1) freeze();
      return blend < 1;
    },
  };
}

export type NightProps = {
  /** Show or hide the moon, the stars and the cat's nightcap. */
  setVisible(on: boolean): void;
  /** Twinkle the stars; pass animate false to rest them at scale 1. */
  twinkle(t: number, animate: boolean): void;
};

function starShape(outer: number, inner: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Builds the night decorations once and keeps them attached to the scene, so the
 * shared dispose traversal in pet-world.tsx covers every geometry and material.
 */
export function createNightProps(opts: {
  world: THREE.Group;
  catHead: THREE.Object3D;
  sphere: THREE.SphereGeometry;
  butter: THREE.MeshPhysicalMaterial;
  lilac: THREE.MeshPhysicalMaterial;
}): NightProps {
  const { world, catHead, sphere, butter, lilac } = opts;
  const glow = butter.clone();
  glow.emissive = new THREE.Color(0xf5db72);
  glow.emissiveIntensity = 0.6;

  const moon = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.09, 12, 40, Math.PI * 1.3),
    glow,
  );
  moon.position.set(1.5, 3.1, -1.1);
  moon.rotation.z = -0.5;
  moon.visible = false;
  world.add(moon);

  const starGeometry = new THREE.ExtrudeGeometry(starShape(0.1, 0.045), {
    depth: 0.04,
    bevelEnabled: false,
    curveSegments: 2,
  });
  starGeometry.center();
  const stars: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const a = 0.34 + (i / 5) * (Math.PI - 0.68);
    const star = new THREE.Mesh(starGeometry, glow);
    star.position.set(1.94 * Math.cos(a), 0.03 + 3.1 * Math.sin(a), -0.66);
    star.rotation.z = a;
    star.visible = false;
    world.add(star);
    stars.push(star);
  }

  const cap = new THREE.Group();
  cap.position.set(0.15, 0.62, 0);
  cap.rotation.z = -0.5;
  cap.visible = false;
  catHead.add(cap);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 20), lilac);
  cone.position.y = 0.2;
  cone.castShadow = true;
  cap.add(cone);
  const pom = new THREE.Mesh(sphere, butter);
  pom.position.y = 0.48;
  pom.scale.setScalar(0.09);
  pom.castShadow = true;
  cap.add(pom);

  return {
    setVisible(on) {
      moon.visible = on;
      cap.visible = on;
      for (let i = 0; i < stars.length; i++) stars[i].visible = on;
    },
    twinkle(t, animate) {
      for (let i = 0; i < stars.length; i++) {
        stars[i].scale.setScalar(
          animate ? 1 + Math.sin(t * 2.2 + i * 1.1) * 0.25 : 1,
        );
      }
    },
  };
}
