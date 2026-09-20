/* PAWPAL cute — hero 3D particle pool. ONLY app/pet-world.tsx may import this. */
import * as THREE from "three";

export type FxKind = "heart" | "star" | "sparkle";

export type WorldFx = {
  spawn(
    kind: FxKind,
    origin: THREE.Vector3,
    count: number,
    opts?: { spread?: number; up?: number; life?: number; buoyancy?: number },
  ): void;
  update(dt: number): number;
  clear(): void;
  setEnabled(on: boolean): void;
  dispose(): void;
};

const KINDS: FxKind[] = ["heart", "star", "sparkle"];
const CAPS: Record<FxKind, [number, number]> = {
  heart: [36, 20],
  star: [24, 14],
  sparkle: [24, 14],
};
const TINTS = [0xff8fb1, 0xf3a8ad, 0xf5db72, 0xb998df, 0xfff7e7];

const EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 0.08,
  bevelEnabled: true,
  bevelSize: 0.04,
  bevelThickness: 0.04,
  bevelSegments: 2,
  curveSegments: 8,
};

function normalise(geo: THREE.BufferGeometry, target: number): THREE.BufferGeometry {
  geo.center();
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const height = box ? box.max.y - box.min.y : 0;
  if (height > 0.0001) geo.scale(target / height, target / height, target / height);
  return geo;
}

function heartGeometry(): THREE.BufferGeometry {
  // Classic two-bezier heart, drawn tip-up then flipped upright.
  const shape = new THREE.Shape();
  shape.moveTo(0, 1);
  shape.bezierCurveTo(-1.62, -0.34, -0.92, -1.52, 0, -0.68);
  shape.bezierCurveTo(0.92, -1.52, 1.62, -0.34, 0, 1);
  const geo = new THREE.ExtrudeGeometry(shape, EXTRUDE);
  geo.rotateZ(Math.PI);
  return normalise(geo, 0.22);
}

function starGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const outer = 1;
  const inner = 0.47;
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, EXTRUDE);
  return normalise(geo, 0.2);
}

function geometryFor(kind: FxKind): THREE.BufferGeometry {
  if (kind === "heart") return heartGeometry();
  if (kind === "star") return starGeometry();
  return new THREE.OctahedronGeometry(0.06);
}

type Pool = {
  mesh: THREE.InstancedMesh;
  cap: number;
  pos: Float32Array;
  vel: Float32Array;
  age: Float32Array;
  life: Float32Array;
  spin: Float32Array;
  size: Float32Array;
  seed: Float32Array;
  buoy: Float32Array;
  alive: Uint8Array;
  live: number;
  cursor: number;
};

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

export function createWorldFx(
  scene: THREE.Scene,
  opts: { small: boolean },
): WorldFx {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0,
    emissive: 0xffffff,
    emissiveIntensity: 0.08,
  });

  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const place = new THREE.Vector3();
  const scaleVec = new THREE.Vector3();
  const tint = new THREE.Color();

  const pools = {} as Record<FxKind, Pool>;
  let enabled = true;
  let disposed = false;

  for (const kind of KINDS) {
    const cap = CAPS[kind][opts.small ? 1 : 0];
    const geo = geometryFor(kind);
    const mesh = new THREE.InstancedMesh(geo, material, cap);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < cap; i++) {
      mesh.setMatrixAt(i, zero);
      tint.setHex(TINTS[i % TINTS.length]);
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    pools[kind] = {
      mesh,
      cap,
      pos: new Float32Array(cap * 3),
      vel: new Float32Array(cap * 3),
      age: new Float32Array(cap),
      life: new Float32Array(cap),
      spin: new Float32Array(cap),
      size: new Float32Array(cap),
      seed: new Float32Array(cap),
      buoy: new Float32Array(cap),
      alive: new Uint8Array(cap),
      live: 0,
      cursor: 0,
    };
  }

  function killAll(pool: Pool): void {
    if (!pool.live) return;
    for (let i = 0; i < pool.cap; i++) {
      if (!pool.alive[i]) continue;
      pool.alive[i] = 0;
      pool.mesh.setMatrixAt(i, zero);
    }
    pool.live = 0;
    pool.mesh.count = 0;
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    spawn(kind, origin, count, o) {
      if (!enabled || disposed || count <= 0) return;
      const pool = pools[kind];
      if (!pool) return;
      const spread = o?.spread ?? 0.35;
      const up = o?.up ?? 1.1;
      const life = o?.life ?? 1.1;
      const buoyancy = o?.buoyancy ?? 0.6;
      let made = 0;
      for (let step = 0; step < pool.cap && made < count; step++) {
        const i = (pool.cursor + step) % pool.cap;
        if (pool.alive[i]) continue;
        const p = i * 3;
        pool.pos[p] = origin.x;
        pool.pos[p + 1] = origin.y;
        pool.pos[p + 2] = origin.z;
        pool.vel[p] = (Math.random() * 2 - 1) * spread;
        pool.vel[p + 1] = up;
        pool.vel[p + 2] = (Math.random() * 2 - 1) * spread;
        pool.age[i] = 0;
        pool.life[i] = life * (0.85 + Math.random() * 0.3);
        pool.spin[i] =
          (Math.random() < 0.5 ? -1 : 1) * (3.4 + Math.random() * 2.6);
        pool.size[i] = 0.8 + Math.random() * 0.5;
        pool.seed[i] = Math.random() * Math.PI * 2;
        pool.buoy[i] = buoyancy;
        pool.alive[i] = 1;
        pool.live++;
        pool.cursor = (i + 1) % pool.cap;
        made++;
      }
      if (made) pool.mesh.instanceMatrix.needsUpdate = true;
    },

    update(dt) {
      if (disposed) return 0;
      let total = 0;
      for (const kind of KINDS) {
        const pool = pools[kind];
        if (!pool.live) continue;
        if (dt === 0) {
          total += pool.live;
          continue;
        }
        let top = -1;
        for (let i = 0; i < pool.cap; i++) {
          if (!pool.alive[i]) continue;
          const p = i * 3;
          const age = pool.age[i] + dt;
          const life = pool.life[i];
          if (age >= life) {
            pool.alive[i] = 0;
            pool.live--;
            pool.mesh.setMatrixAt(i, zero);
            continue;
          }
          pool.age[i] = age;
          pool.vel[p + 1] += pool.buoy[i] * dt;
          pool.pos[p] +=
            pool.vel[p] * dt + Math.sin(age * 8 + pool.seed[i]) * 0.3 * dt;
          pool.pos[p + 1] += pool.vel[p + 1] * dt;
          pool.pos[p + 2] += pool.vel[p + 2] * dt;

          const t = age / life;
          let pop = 1;
          if (t < 0.2) pop = easeOutBack(t / 0.2);
          else if (t > 0.75) pop = 1 - (t - 0.75) / 0.25;
          const s = Math.max(0, pool.size[i] * pop);

          place.set(pool.pos[p], pool.pos[p + 1], pool.pos[p + 2]);
          euler.set(0, age * pool.spin[i], 0);
          quat.setFromEuler(euler);
          scaleVec.set(s, s, s);
          matrix.compose(place, quat, scaleVec);
          pool.mesh.setMatrixAt(i, matrix);
          top = i;
        }
        pool.mesh.count = top + 1;
        pool.mesh.instanceMatrix.needsUpdate = true;
        total += pool.live;
      }
      return total;
    },

    clear() {
      if (disposed) return;
      for (const kind of KINDS) killAll(pools[kind]);
    },

    setEnabled(on) {
      if (disposed) return;
      enabled = on;
      if (!on) for (const kind of KINDS) killAll(pools[kind]);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const kind of KINDS) {
        const pool = pools[kind];
        scene.remove(pool.mesh);
        pool.mesh.geometry.dispose();
        pool.mesh.dispose();
      }
      material.dispose();
    },
  };
}
