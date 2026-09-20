"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { WorldProps } from "./experience";
import { createEmotes } from "./cute/hero-emotes";
import { createWorldFx } from "./cute/hero-world-fx";
import { listen, worldKindOf, type WorldKind } from "./cute/core-events";
import {
  applyTrick,
  composeCritter,
  createCritter,
  easeInOutCubic,
  resetAct,
  updateIdle,
  CHEER_DUR,
  EYE_SCALE,
  HAPPY_DUR,
  PHOTO_DUR,
  TOY_LOOK_DUR,
  TRICK_COOLDOWN,
  TRICK_DUR,
  type Critter,
  type FxKind,
  type TrickType,
} from "./cute/world-rig";
import {
  createNightProps,
  createSky,
  isWeekendDay,
} from "./cute/world-sky";
import {
  alertLine,
  cheerLine,
  countLine,
  daypartLine,
  greetLabel,
  idleLine,
  peekLine,
  petLabel,
  petLine,
  photoLabel,
  photoLine,
  partyLine,
  secretLine,
  shopAllLine,
  toyLabel,
  toyLine,
  trickLabel,
  trickLine,
  weekendLine,
} from "./cute/world-lines";

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

const PEEK_KEY = "pawpal-peek-said";
const DAYPART_KEY = "pawpal-daypart-greeted";

export default function PetWorld(props: WorldProps) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef(props);
  useLayoutEffect(() => {
    state.current = props;
  });
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 700 ? 1.4 : 1.75),
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.65;
    room.dispose();
    pmrem.dispose();
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8e65ae, 0.85);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff7db, 2.8);
    key.position.set(-4, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -4;
    key.shadow.normalBias = 0.035;
    key.shadow.bias = -0.0001;
    key.shadow.radius = 3;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe3d5ff, 1.5);
    rim.position.set(4, 5, -3);
    scene.add(rim);
    const world = new THREE.Group();
    scene.add(world);
    const mat = (color: number, roughness = 0.39) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        metalness: 0,
        clearcoat: 0.23,
        clearcoatRoughness: 0.35,
      });
    const cream = mat(0xfff7e7),
      caramel = mat(0xe4a157),
      lilac = mat(0xb998df),
      grey = mat(0xa4a4bc),
      pink = mat(0xf3a8ad),
      eye = mat(0x252135, 0.15),
      white = mat(0xffffff),
      butter = mat(0xf5db72, 0.24),
      blush = mat(0xe7a4b0),
      darkPurple = mat(0x60438b, 0.32),
      carrotMat = mat(0xf2994a),
      leafMat = mat(0x8fcf7a);
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 24);
    // Invisible low-poly hit proxies: one body + one head per pet.
    const proxyGeometry = new THREE.SphereGeometry(1, 8, 6);
    const proxyMaterial = new THREE.MeshBasicMaterial();
    // Shared ^^ arc for the happy eyes.
    const happyGeometry = new THREE.TorusGeometry(
      0.085,
      0.02,
      6,
      14,
      Math.PI,
    );
    function ball(
      parent: THREE.Object3D,
      material: THREE.Material,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) {
      const mesh = new THREE.Mesh(sphereGeometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    function tube(
      parent: THREE.Object3D,
      points: THREE.Vector3[],
      radius: number,
      material: THREE.Material,
    ) {
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          24,
          radius,
          10,
          false,
        ),
        material,
      );
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    }
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.25, 3.12, 0.34, 80),
      lilac,
    );
    base.position.y = -0.2;
    base.scale.z = 0.79;
    base.castShadow = base.receiveShadow = true;
    world.add(base);
    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.11, 0.15, 16, 80),
      lilac,
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.scale.y = 0.8;
    baseRing.position.y = -0.02;
    world.add(baseRing);
    const backArch = new THREE.Mesh(
      new THREE.TorusGeometry(1.94, 0.3, 24, 80, Math.PI),
      butter,
    );
    backArch.position.set(0, 0.03, -1.1);
    backArch.scale.y = 1.6;
    backArch.castShadow = true;
    backArch.receiveShadow = true;
    world.add(backArch);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.08, 0.85, 64),
      darkPurple,
    );
    pedestal.position.set(1, 0.39, -0.25);
    pedestal.receiveShadow = pedestal.castShadow = true;
    world.add(pedestal);
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.97, 0.97, 0.12, 64),
      lilac,
    );
    top.position.set(1, 0.87, -0.25);
    world.add(top);
    // Each collectible is a real mesh, with separate head, ears, paws and tail.
    const critters: Critter[] = [];
    const pickTargets: THREE.Object3D[] = [];
    const petOf = new Map<THREE.Object3D, WorldKind>();
    const toyOf = new Map<THREE.Object3D, number>();
    for (let k = 0; k < 3; k++) {
      const kind = k as WorldKind;
      const g = new THREE.Group();
      world.add(g);
      const fur = kind === 0 ? caramel : kind === 1 ? grey : cream;
      const cheekMat = blush.clone();
      cheekMat.emissive = new THREE.Color(0xff7f9e);
      cheekMat.emissiveIntensity = 0;
      const body = ball(g, fur, 0, 0.61, 0, 0.62, 0.68, 0.48);
      const belly = ball(g, cream, 0, 0.56, 0.35, 0.4, 0.46, 0.17);
      const head = new THREE.Group();
      head.position.set(0, 1.43, 0.08);
      g.add(head);
      ball(head, fur, 0, 0, 0, 0.74, 0.65, 0.59);
      if (kind === 0) ball(head, cream, 0, 0.12, 0.49, 0.19, 0.5, 0.14);
      const eyes: THREE.Mesh[] = [];
      const glints: THREE.Mesh[] = [];
      const happyEyes: THREE.Mesh[] = [];
      const cheeks: THREE.Mesh[] = [];
      const arms: THREE.Mesh[] = [];
      const feet: THREE.Mesh[] = [];
      const ears: THREE.Object3D[] = [];
      const earPivots: THREE.Group[] = [];
      for (const side of [-1, 1]) {
        feet.push(ball(g, cream, side * 0.36, 0.12, 0.23, 0.25, 0.17, 0.31));
        const arm = ball(g, fur, side * 0.5, 0.55, 0.22, 0.19, 0.36, 0.2);
        arm.rotation.z = side * 0.15;
        arms.push(arm);
        // Ear pivots are attached after building, so the rest pose never moves.
        const pivot = new THREE.Group();
        if (kind === 2) {
          const ear = ball(
            head,
            cream,
            side * 0.42,
            0.74,
            -0.04,
            0.19,
            0.66,
            0.19,
          );
          ear.rotation.z = -side * 0.16;
          const inner = ball(
            head,
            pink,
            side * 0.43,
            0.79,
            0.1,
            0.095,
            0.47,
            0.08,
          );
          inner.rotation.z = -side * 0.16;
          pivot.position.set(side * 0.4, 0.2, -0.04);
          head.add(pivot);
          pivot.attach(ear);
          pivot.attach(inner);
          ears.push(ear);
        } else {
          const outline = new THREE.Shape();
          outline.moveTo(-0.27, 0);
          outline.quadraticCurveTo(-0.22, 0.35, -0.02, 0.7);
          outline.quadraticCurveTo(0.1, 0.75, 0.22, 0.08);
          outline.quadraticCurveTo(0, -0.14, -0.27, 0);
          const geo = new THREE.ExtrudeGeometry(outline, {
            depth: 0.13,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 1,
            bevelSize: 0.075,
            bevelThickness: 0.07,
            curveSegments: 12,
          });
          const ear = new THREE.Mesh(geo, fur);
          ear.position.set(side * 0.48, 0.37, -0.08);
          ear.rotation.z = -side * 0.25;
          ear.castShadow = true;
          head.add(ear);
          const inner = new THREE.Mesh(geo, pink);
          inner.position.set(side * 0.48, 0.46, 0.095);
          inner.rotation.z = -side * 0.25;
          inner.scale.set(0.6, 0.68, 0.3);
          head.add(inner);
          pivot.position.set(side * 0.48, 0.37, -0.08);
          head.add(pivot);
          pivot.attach(ear);
          pivot.attach(inner);
          ears.push(ear);
        }
        earPivots.push(pivot);
        const eyeball = ball(
          head,
          eye,
          side * 0.28,
          0.04,
          0.535,
          0.102,
          0.136,
          0.075,
        );
        eyes.push(eyeball);
        glints.push(
          ball(
            head,
            white,
            side * 0.28 - 0.025,
            0.088,
            0.601,
            0.029,
            0.038,
            0.014,
          ),
        );
        const happyEye = new THREE.Mesh(happyGeometry, eye);
        happyEye.position.set(side * 0.28, 0.02, 0.545);
        happyEye.visible = false;
        head.add(happyEye);
        happyEyes.push(happyEye);
        cheeks.push(
          ball(head, cheekMat, side * 0.45, -0.18, 0.48, 0.115, 0.056, 0.025),
        );
        ball(head, cream, side * 0.115, -0.21, 0.55, 0.205, 0.15, 0.11);
      }
      const nose = ball(
        head,
        kind === 0 ? eye : pink,
        0,
        -0.13,
        0.68,
        0.09,
        0.062,
        0.055,
      );
      let mouth: THREE.Mesh | undefined;
      let tongue: THREE.Mesh | undefined;
      if (kind === 0) {
        mouth = ball(head, eye, 0, -0.36, 0.55, 0.11, 0.075, 0.04);
        tongue = ball(head, pink, 0, -0.385, 0.6, 0.07, 0.1, 0.036);
      }
      if (kind === 1)
        for (const s of [-1, 1])
          for (let n = 0; n < 2; n++)
            tube(
              head,
              [
                new THREE.Vector3(s * 0.32, -0.2, 0.55),
                new THREE.Vector3(s * 0.56, -0.2 + n * 0.1, 0.59),
                new THREE.Vector3(s * 0.75, -0.23 + n * 0.14, 0.55),
              ],
              0.009,
              cream,
            );
      const tail =
        kind === 1
          ? tube(
              g,
              [
                new THREE.Vector3(0.4, 0.35, -0.32),
                new THREE.Vector3(0.76, 0.55, -0.35),
                new THREE.Vector3(0.83, 0.95, -0.21),
                new THREE.Vector3(0.69, 1.12, -0.2),
              ],
              0.12,
              fur,
            )
          : ball(
              g,
              fur,
              0.53,
              0.56,
              -0.25,
              kind === 2 ? 0.25 : 0.18,
              kind === 2 ? 0.25 : 0.46,
              0.23,
            );
      const tailPivot = new THREE.Group();
      if (kind === 1) tailPivot.position.set(0.4, 0.35, -0.32);
      else tailPivot.position.set(0.42, 0.5, -0.2);
      g.add(tailPivot);
      tailPivot.attach(tail);
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.055, 12, 48),
        kind === 0 ? darkPurple : butter,
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.98;
      g.add(collar);
      ball(g, butter, 0, 0.88, 0.43, 0.065, 0.075, 0.025);
      let carrot: THREE.Group | undefined;
      if (kind === 2) {
        carrot = new THREE.Group();
        carrot.position.set(0, 0.15, 0.7);
        carrot.visible = false;
        g.add(carrot);
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.075, 0.34, 12),
          carrotMat,
        );
        cone.rotation.z = Math.PI;
        cone.castShadow = true;
        carrot.add(cone);
        for (let n = 0; n < 3; n++) {
          const leaf = new THREE.Mesh(sphereGeometry, leafMat);
          leaf.position.set((n - 1) * 0.05, 0.2, (n - 1) * 0.02);
          leaf.scale.set(0.035, 0.06, 0.035);
          carrot.add(leaf);
        }
      }
      if (kind === 0) {
        g.position.set(-1.15, 0.03, 0.56);
        g.rotation.y = 0.18;
        g.scale.setScalar(1.12);
      } else if (kind === 1) {
        g.position.set(1, 0.94, -0.25);
        g.rotation.y = -0.23;
        g.scale.setScalar(0.82);
      } else {
        g.position.set(1.26, 0.03, 1.18);
        g.rotation.y = -0.2;
        g.scale.setScalar(0.65);
      }
      g.userData.pet = kind;
      const bodyProxy = new THREE.Mesh(proxyGeometry, proxyMaterial);
      bodyProxy.position.set(0, 0.61, 0);
      bodyProxy.scale.set(0.66, 0.72, 0.52);
      bodyProxy.visible = false;
      bodyProxy.userData.pet = kind;
      g.add(bodyProxy);
      const headProxy = new THREE.Mesh(proxyGeometry, proxyMaterial);
      headProxy.scale.set(0.78, 0.7, 0.64);
      headProxy.visible = false;
      headProxy.userData.pet = kind;
      head.add(headProxy);
      pickTargets.push(bodyProxy, headProxy);
      petOf.set(bodyProxy, kind);
      petOf.set(headProxy, kind);
      critters.push(
        createCritter({
          kind,
          group: g,
          body,
          belly,
          head,
          ears,
          earPivots: [earPivots[0], earPivots[1]],
          tailPivot,
          tail,
          eyes: [eyes[0], eyes[1]],
          glints: [glints[0], glints[1]],
          happyEyes,
          cheeks,
          cheekMat,
          arms: [arms[0], arms[1]],
          feet: [feet[0], feet[1]],
          nose,
          mouth,
          tongue,
          carrot,
        }),
      );
    }
    const orb = ball(world, butter, -2.26, 0.44, -0.41, 0.33, 0.33, 0.33);
    const orb2 = ball(world, pink, 2.57, 0.23, 0.18, 0.2, 0.2, 0.2);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.075, 16, 48),
      cream,
    );
    ring.position.set(-0.02, 0.26, 1.9);
    ring.rotation.set(0.4, 0.2, -0.35);
    world.add(ring);
    const toys: THREE.Mesh[] = [orb, orb2, ring];
    for (let n = 0; n < toys.length; n++) {
      toys[n].userData.toy = n;
      toyOf.set(toys[n], n);
      pickTargets.push(toys[n]);
    }
    const ORB_Y = 0.44,
      ORB2_Y = 0.23,
      ORB_S = 0.33,
      ORB2_S = 0.2;
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.39;
    shadow.receiveShadow = true;
    scene.add(shadow);

    // ---- engines -------------------------------------------------------
    const fx = createWorldFx(scene, { small: innerWidth < 700 });
    const emotes = createEmotes(el);
    const sky = createSky({ hemi, key, rim }, renderer);
    const night = createNightProps({
      world,
      catHead: critters[1].head,
      sphere: sphereGeometry,
      butter,
      lilac,
    });
    night.setVisible(sky.phase() === "night");

    // ---- scratch objects (never allocate per frame) ---------------------
    const ZERO = new THREE.Vector2();
    const ndc = new THREE.Vector2();
    const gazeNdc = new THREE.Vector2();
    const pointer = new THREE.Vector2();
    const target = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const hits: THREE.Intersection[] = [];
    const gazePlane = new THREE.Plane();
    const gazePoint = new THREE.Vector3();
    const touchPoint = new THREE.Vector3();
    const FOCUS = new THREE.Vector3(0, 1.3, 1.2);
    const DEFAULT_LOOK = new THREE.Vector3(0, 1.05, 0);
    const FOCUS_OFFSET = new THREE.Vector3(1.6, 0.9, 4.2);
    const PHOTO_POS = new THREE.Vector3(0.6, 3.2, 8.6);
    const PHOTO_LOOK = new THREE.Vector3(0, 1.1, 0);
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const local = new THREE.Vector3();
    const headWorld = new THREE.Vector3();
    const defaultPos = new THREE.Vector3();
    const focusPos = new THREE.Vector3();
    const lookVec = new THREE.Vector3();

    // ---- runtime state -------------------------------------------------
    let visible = true,
      raf = 0,
      prev = 0,
      time = 0,
      ready = false,
      dirty = true,
      busy = false,
      alive = 0,
      W = 1,
      H = 1,
      angle = 0;
    let lastMotion = state.current.motion,
      lastGreet = state.current.greet,
      lastFocusN = state.current.focus.n,
      lastPhoto = state.current.photo,
      lastPeek = state.current.peek;
    let hovered = -1,
      hoverDirty = false;
    let mouseUntil = -1e9,
      touchGazeUntil = -1e9,
      lastInteract = -1e9;
    let nextChatter = 45 + Math.random() * 45,
      lastIdle = -1,
      greetArmed = false;
    let shotPending = false;
    let gesture: 0 | 1 | 2 | 3 = 0,
      gesturePet = -1,
      gestureToy = -1,
      capturedId = -1;
    let downX = 0,
      downY = 0,
      lastX = 0,
      lastY = 0,
      downAngle = 0,
      moved = 0;
    const peekOn = [false, false, false];
    const cam = { mode: 0, pet: -1, t: 0, dur: 0, p: 0, out: false };
    const boops = [
      { t: -1, dur: 0.6 },
      { t: -1, dur: 0.6 },
      { t: -1, dur: 0.7 },
    ];
    const pending = { count: 0, pets: new Set<number>() };
    let lastParty = -1e9;
    let partyTimer: ReturnType<typeof setTimeout> | null = null;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const staticTimers: (ReturnType<typeof setTimeout> | null)[] = [
      null,
      null,
      null,
    ];
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    // ---- helpers -------------------------------------------------------
    const spawnFx = (
      kind: FxKind,
      c: Critter,
      count: number,
      opts?: {
        spread?: number;
        up?: number;
        life?: number;
        buoyancy?: number;
      },
    ) => {
      c.head.getWorldPosition(tmp2);
      tmp2.y += 0.28 * c.scale;
      fx.spawn(kind, tmp2, count, opts);
    };
    const hooks = {
      spawn: spawnFx,
      emote: (c: Critter, text: string) => {
        emotes.show(c.kind, text, { ms: 1600 });
      },
    };
    const setOverride = (
      c: Critter,
      x: number,
      y: number,
      z: number,
      ms: number,
    ) => {
      c.overrideVec.set(x, y, z);
      c.gazeOverride = c.overrideVec;
      c.gazeOverrideUntil = performance.now() + ms;
      c.gazeIsCam = false;
    };
    const lookAtCamera = (c: Critter, ms: number) => {
      setOverride(c, camera.position.x, camera.position.y, camera.position.z, ms);
      c.gazeIsCam = true;
    };
    // Returns true when this slot was already used in this session, and marks
    // it otherwise. Storage failures count as "already said", so nothing spams.
    const sessionFlag = (storeKey: string, slot: string): boolean => {
      try {
        const raw = sessionStorage.getItem(storeKey) ?? "";
        if (raw.split(",").includes(slot)) return true;
        sessionStorage.setItem(storeKey, raw ? `${raw},${slot}` : slot);
      } catch {
        return true;
      }
      return false;
    };

    type StartOpts = {
      user?: boolean;
      type?: TrickType;
      delay?: number;
      line?: string;
      label?: string;
      ms?: number;
    };
    const startTrick = (k: WorldKind, o: StartOpts) => {
      const c = critters[k];
      const now = performance.now();
      const type = o.type ?? "trick";
      const animate = state.current.motion;
      const line = o.line ?? (type === "trick" ? trickLine[k] : "");
      if (type === "trick" && o.user && now < c.trick.cooldownUntil) {
        c.act.squash = 0.15;
        emotes.show(k, alertLine, { variant: "alert", ms: 700 });
        dirty = true;
        return;
      }
      if (type === "trick")
        c.trick.cooldownUntil =
          now + TRICK_COOLDOWN * 1000 + (o.delay ?? 0) * 1000;
      if (o.user)
        state.current.onPetAction({
          kind: k,
          action: "trick",
          label: o.label ?? trickLabel[k],
        });
      dirty = true;
      if (!animate) {
        // Static fallback: ^^ eyes and a bubble, no movement at all.
        const hold = o.ms ?? 1400;
        c.act.happy = HAPPY_DUR;
        if (line) emotes.show(k, line, { ms: hold });
        const running = staticTimers[k];
        if (running) {
          clearTimeout(running);
          timers.delete(running);
        }
        staticTimers[k] = later(() => {
          staticTimers[k] = null;
          c.act.happy = 0;
          dirty = true;
        }, hold);
        return;
      }
      c.trick.type = type;
      c.trick.t = 0;
      c.trick.delay = o.delay ?? 0;
      c.trick.line = line;
      c.trick.dur =
        type === "trick"
          ? TRICK_DUR[k]
          : type === "cheer"
            ? CHEER_DUR
            : type === "toyLook"
              ? TOY_LOOK_DUR
              : PHOTO_DUR;
    };

    const greetAll = () => {
      for (let i = 0; i < 3; i++)
        startTrick(i as WorldKind, { delay: i * 0.28, ms: 1600 });
      state.current.onPetAction({
        kind: 0,
        action: "trick",
        label: greetLabel,
      });
      lastInteract = performance.now();
    };

    const setFocus = (pet: number) => {
      dirty = true;
      if (pet < 0) {
        if (cam.mode === 1) cam.out = true;
        for (let i = 0; i < 3; i++) {
          critters[i].gazeOverride = null;
          critters[i].gazeUntil = 0;
        }
        return;
      }
      const k = pet as WorldKind;
      lastInteract = performance.now();
      if (state.current.motion) {
        cam.mode = 1;
        cam.pet = k;
        cam.t = 0;
        cam.dur = 2.8;
        cam.out = false;
      }
      startTrick(k, { user: true });
      critters[k].head.getWorldPosition(tmp);
      for (let i = 0; i < 3; i++) {
        if (i === k) lookAtCamera(critters[i], 3200);
        else setOverride(critters[i], tmp.x, tmp.y, tmp.z, 3200);
      }
    };

    const setPeek = (peek: WorldProps["peek"]) => {
      for (let i = 0; i < 3; i++) {
        if (peekOn[i]) {
          critters[i].gazeOverride = null;
          critters[i].gazeUntil = 0;
        }
        peekOn[i] = false;
      }
      dirty = true;
      if (!peek) return;
      const all = peek === "all";
      const only = all ? -1 : worldKindOf(peek);
      for (let i = 0; i < 3; i++) {
        if (!all && i !== only) continue;
        peekOn[i] = true;
        setOverride(critters[i], -7, 1.4, 3, 30000);
        if (!all && !sessionFlag(PEEK_KEY, String(i)))
          emotes.show(i, peekLine[i], { ms: 1600 });
      }
      if (all && !sessionFlag(PEEK_KEY, "all"))
        emotes.show(0, shopAllLine, { ms: 1600 });
    };

    const capture = () => {
      let shot: HTMLCanvasElement | null = null;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = renderer.domElement.width;
        canvas.height = renderer.domElement.height;
        canvas.getContext("2d")?.drawImage(renderer.domElement, 0, 0);
        shot = canvas;
      } catch {
        shot = null;
      }
      state.current.onPhoto(shot);
      emotes.show(0, photoLine, { ms: 900 });
      state.current.onPetAction({
        kind: 0,
        action: "photo",
        label: photoLabel,
      });
      dirty = true;
    };

    const runPhoto = () => {
      const animate = state.current.motion;
      lastInteract = performance.now();
      for (let i = 0; i < 3; i++) {
        const c = critters[i];
        lookAtCamera(c, animate ? 4200 : 2000);
        c.trick.type = "photo";
        c.trick.t = 0;
        c.trick.dur = PHOTO_DUR;
        c.trick.delay = 0;
        c.trick.line = "";
      }
      dirty = true;
      if (!animate) {
        shotPending = true;
        later(() => {
          for (let i = 0; i < 3; i++)
            if (critters[i].trick.type === "photo")
              critters[i].trick.type = "none";
          dirty = true;
        }, 1400);
        return;
      }
      cam.mode = 2;
      cam.pet = -1;
      cam.t = 0;
      cam.dur = PHOTO_DUR;
      cam.out = false;
      for (let n = 0; n < 3; n++)
        later(
          () => emotes.show(1, countLine[n], { variant: "count", ms: 560 }),
          n * 600,
        );
      later(() => {
        shotPending = true;
        dirty = true;
      }, 1900);
    };

    const party = () => {
      const now = performance.now();
      if (!visible || document.hidden || now - lastParty < 20000) {
        pending.count = 0;
        pending.pets.clear();
        return;
      }
      lastParty = now;
      for (let i = 0; i < 3; i++) {
        lookAtCamera(critters[i], 2600);
        startTrick(i as WorldKind, {
          type: "cheer",
          delay: i * 0.2,
          line: i === 0 ? partyLine : "",
          ms: 2000,
        });
        if (pending.pets.has(i)) critters[i].act.happy = 1.2;
      }
      if (state.current.motion) {
        tmp.set(0, 3.1, -1.1);
        world.localToWorld(tmp);
        fx.spawn("heart", tmp, 12);
      }
      pending.count = 0;
      pending.pets.clear();
      dirty = true;
    };

    const sayDaypart = () => {
      let said = false;
      try {
        said = sessionStorage.getItem(DAYPART_KEY) === "1";
      } catch {
        said = false;
      }
      if (said) return;
      const line = isWeekendDay(new Date())
        ? weekendLine
        : daypartLine[sky.phase()];
      // claimBubble may refuse: only mark the session once it really showed.
      if (!emotes.show(0, line, { idle: true, ms: 2600 })) return;
      try {
        sessionStorage.setItem(DAYPART_KEY, "1");
      } catch {
        // private mode: the greeting simply shows again next load
      }
      dirty = true;
    };

    const boopToy = (n: number) => {
      const animate = state.current.motion;
      lastInteract = performance.now();
      toys[n].getWorldPosition(tmp);
      let nearest: WorldKind = 0;
      let best = Infinity;
      for (let i = 0; i < 3; i++) {
        critters[i].group.getWorldPosition(tmp2);
        const d = tmp2.distanceToSquared(tmp);
        if (d < best) {
          best = d;
          nearest = i as WorldKind;
        }
      }
      state.current.onPetAction({
        kind: nearest,
        action: "toy",
        label: toyLabel,
      });
      if (n === 2) {
        if (animate) boops[2].t = 0;
        startTrick(0, { type: "toyLook", line: "", ms: 1200 });
      } else {
        if (animate) boops[n].t = 0;
        setOverride(critters[nearest], tmp.x, tmp.y, tmp.z, 1200);
        startTrick(nearest, { type: "toyLook", line: toyLine, ms: 1400 });
      }
      dirty = true;
    };

    // ---- pointer -------------------------------------------------------
    const setNdc = (e: PointerEvent) => {
      ndc.set((e.offsetX / W) * 2 - 1, -(e.offsetY / H) * 2 + 1);
    };
    const pickAt = (): THREE.Object3D | null => {
      hits.length = 0;
      raycaster.setFromCamera(ndc, camera);
      raycaster.intersectObjects(pickTargets, false, hits);
      return hits.length ? hits[0].object : null;
    };
    const planePoint = (out: THREE.Vector3): boolean => {
      raycaster.setFromCamera(gazeNdc, camera);
      camera.getWorldDirection(tmp).negate();
      gazePlane.setFromNormalAndCoplanarPoint(tmp, FOCUS);
      return !!raycaster.ray.intersectPlane(gazePlane, out);
    };
    const pointerMove = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - lastX),
        dy = Math.abs(e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      if (gesture === 1) {
        const tx = e.clientX - downX,
          ty = e.clientY - downY;
        if (Math.abs(tx) > Math.abs(ty)) {
          angle = downAngle + tx * 0.008;
          dirty = true;
        }
      } else if (gesture !== 0) {
        moved += dx + dy;
        if (gesture === 2 && gesturePet >= 0)
          critters[gesturePet].petDist += dx + dy;
      }
      if (e.pointerType !== "mouse") return;
      mouseUntil = performance.now() + 3000;
      target.set((e.offsetX / W) * 2 - 1, (e.offsetY / H) * 2 - 1);
      setNdc(e);
      hoverDirty = true;
    };
    const pointerLeave = () => {
      target.set(0, 0);
      mouseUntil = -1e9;
      hovered = -1;
      hoverDirty = false;
      renderer.domElement.style.cursor = "";
    };
    const pointerDown = (e: PointerEvent) => {
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
      downAngle = angle;
      moved = 0;
      lastInteract = performance.now();
      setNdc(e);
      const hit = pickAt();
      const pet = hit ? petOf.get(hit) : undefined;
      const toy = hit ? toyOf.get(hit) : undefined;
      gesturePet = -1;
      gestureToy = -1;
      if (pet !== undefined) {
        gesture = 2;
        gesturePet = pet;
      } else if (toy !== undefined) {
        gesture = 3;
        gestureToy = toy;
      } else {
        gesture = 1;
      }
      try {
        el.setPointerCapture(e.pointerId);
        capturedId = e.pointerId;
      } catch {
        capturedId = -1;
      }
      if (e.pointerType !== "mouse") {
        gazeNdc.copy(ndc);
        if (planePoint(touchPoint))
          touchGazeUntil = performance.now() + 2500;
        mouseUntil = -1e9;
        hovered = -1;
      }
    };
    const endGesture = () => {
      if (gesturePet >= 0) critters[gesturePet].petDist = 0;
      gesture = 0;
      gesturePet = -1;
      gestureToy = -1;
      moved = 0;
    };
    const pointerUp = (e: PointerEvent) => {
      if (capturedId === e.pointerId) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          // the pointer was already released
        }
        capturedId = -1;
      }
      const tap = moved < 10;
      if (gesture === 2 && gesturePet >= 0 && tap)
        startTrick(gesturePet as WorldKind, { user: true });
      else if (gesture === 3 && gestureToy >= 0 && tap) boopToy(gestureToy);
      lastInteract = performance.now();
      endGesture();
    };
    const pointerCancel = (e: PointerEvent) => {
      if (capturedId === e.pointerId) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          // the pointer was already released
        }
        capturedId = -1;
      }
      endGesture();
      pointerLeave();
      dirty = true;
    };
    el.addEventListener("pointermove", pointerMove);
    el.addEventListener("pointerleave", pointerLeave);
    el.addEventListener("pointerdown", pointerDown);
    el.addEventListener("pointerup", pointerUp);
    el.addEventListener("pointercancel", pointerCancel);

    // ---- store events --------------------------------------------------
    const offCart = listen("pawpal:cart-added", (d) => {
      const k = worldKindOf(d.pet);
      if (visible && !document.hidden) {
        startTrick(k, { line: cheerLine[k], ms: 2000 });
        if (state.current.motion) spawnFx("heart", critters[k], 6);
      } else {
        pending.count++;
        pending.pets.add(k);
      }
    });
    const offSecret = listen("pawpal:secret", (d) => {
      if (!visible || document.hidden) return;
      const k = worldKindOf(d.pet);
      startTrick(k, { line: secretLine[k], ms: 2000 });
    });
    const offParade = listen("pawpal:parade", () => {
      if (!visible || document.hidden) return;
      for (let i = 0; i < 3; i++)
        startTrick(i as WorldKind, {
          type: "cheer",
          delay: i * 0.12,
          ms: 2000,
        });
      if (state.current.motion) {
        tmp.set(0, 2.4, 0);
        world.localToWorld(tmp);
        fx.spawn("heart", tmp, 8, { spread: 1.1 });
      }
    });

    const resize = () => {
      if (!el.clientWidth || !el.clientHeight) return;
      W = el.clientWidth;
      H = el.clientHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      emotes.resize(W, H);
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const observer = new IntersectionObserver(
      ([entry]) => {
        const was = visible;
        visible = entry.isIntersecting;
        if (visible && !was) {
          prev = performance.now();
          dirty = true;
          if (pending.count > 0 && !partyTimer)
            partyTimer = later(() => {
              partyTimer = null;
              party();
            }, 400);
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);
    const phaseTimer = setInterval(() => {
      if (sky.refresh(state.current.motion)) {
        night.setVisible(sky.phase() === "night");
        dirty = true;
      }
    }, 600000);
    const lost = (e: Event) => {
      e.preventDefault();
      ready = false;
      dirty = true;
      state.current.onReady(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);

    const pickIdleGaze = (c: Critter, i: number) => {
      c.gazeUntil = time + 2.5 + Math.random() * 2.5;
      c.gazeIsCam = false;
      const r = Math.random();
      if (r < (c.kind === 1 ? 0.45 : 0.25)) {
        orb.getWorldPosition(c.gazeVec);
      } else if (r < 0.55) {
        c.gazeVec.copy(camera.position);
        c.gazeIsCam = true;
      } else if (r < 0.82) {
        const other = critters[(i + 1 + (Math.random() < 0.5 ? 0 : 1)) % 3];
        other.head.getWorldPosition(c.gazeVec);
      } else {
        ring.getWorldPosition(c.gazeVec);
      }
      c.gazeTarget = c.gazeVec;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (
        document.hidden ||
        !visible ||
        renderer.getContext().isContextLost() ||
        now - prev < (state.current.motion && busy ? 15 : 32)
      )
        return;
      const dt = Math.min((now - prev) / 1000, 0.06);
      prev = now;
      const animate = state.current.motion;
      if (lastMotion !== animate) {
        lastMotion = animate;
        dirty = true;
        fx.setEnabled(animate);
        if (!animate) {
          fx.clear();
          emotes.hideAll();
          alive = 0;
          hovered = -1;
          target.set(0, 0);
          pointer.set(0, 0);
          cam.mode = 0;
          cam.p = 0;
          renderer.domElement.style.cursor = "";
          for (let i = 0; i < 3; i++) {
            const c = critters[i];
            c.trick.type = "none";
            c.petDist = 0;
            c.petCount = 0;
            c.hoverT = 0;
            // happy only decays while animating, so clear it here or the
            // ^^ eyes would stay on for good.
            c.act.happy = 0;
            c.act.squash = 0;
            const running = staticTimers[i];
            if (running) {
              clearTimeout(running);
              timers.delete(running);
              staticTimers[i] = null;
            }
            boops[i].t = -1;
          }
          orb.scale.setScalar(ORB_S);
          orb2.scale.setScalar(ORB2_S);
        }
      }
      const live = state.current;
      if (live.greet !== lastGreet) {
        lastGreet = live.greet;
        greetAll();
      }
      if (live.focus.n !== lastFocusN) {
        lastFocusN = live.focus.n;
        setFocus(live.focus.pet);
      }
      if (live.photo !== lastPhoto) {
        lastPhoto = live.photo;
        runPhoto();
      }
      if (live.peek !== lastPeek) {
        lastPeek = live.peek;
        setPeek(live.peek);
      }
      if (hoverDirty) {
        hoverDirty = false;
        const hit = pickAt();
        const pet = hit ? petOf.get(hit) : undefined;
        hovered = pet === undefined ? -1 : pet;
        renderer.domElement.style.cursor =
          pet !== undefined
            ? "var(--cc-cursor-heart, pointer)"
            : hit
              ? "pointer"
              : "";
      }
      if (!animate && !dirty && ready) return;
      if (animate) {
        time += dt;
        if (sky.update(dt)) dirty = true;
      }
      if (sky.phase() === "night") night.twinkle(time, animate);

      // Shared gaze point: the cursor while the mouse is warm, else the last tap.
      let shared: THREE.Vector3 | null = null;
      if (animate) {
        if (now < mouseUntil) {
          gazeNdc.set(target.x, -target.y);
          if (planePoint(gazePoint)) shared = gazePoint;
        } else if (now < touchGazeUntil) {
          shared = touchPoint;
        }
      }

      const damp = 1 - Math.exp(-dt * 7);
      for (let i = 0; i < 3; i++) {
        const c = critters[i];
        if (animate)
          c.hoverT += ((hovered === i ? 1 : 0) - c.hoverT) *
            (1 - Math.exp(-dt * 10));
        else c.hoverT = 0;
        resetAct(c);
        applyTrick(c, dt, animate, hooks);
        if (peekOn[i] && animate) {
          if (c.act.sy < 1.04) c.act.sy = 1.04;
          if (c.act.earPerk < 1) c.act.earPerk = 1;
          if (c.act.tailBoost < 0.8) c.act.tailBoost = 0.8;
        }
        updateIdle(c, i, time, dt, animate);

        // Petting: a heart every 70px, then the milestone.
        if (animate) {
          while (c.petDist >= 70) {
            c.petDist -= 70;
            c.petCount++;
            if (now - c.lastHeart > 250) {
              c.lastHeart = now;
              spawnFx("heart", c, 1, { up: 0.9 });
            }
          }
          if (c.petCount >= 4) {
            c.petCount = 0;
            c.act.happy = HAPPY_DUR;
            emotes.show(i, petLine[i], { ms: 1800 });
            state.current.onPetAction({
              kind: i as WorldKind,
              action: "pet",
              label: petLabel[i],
            });
          }
        } else {
          c.petDist = 0;
          c.petCount = 0;
        }

        // Gaze.
        if (c.gazeOverride && now >= c.gazeOverrideUntil) {
          c.gazeOverride = null;
          c.gazeUntil = 0;
        }
        // "Look at the camera" overrides follow the camera while it tweens.
        if (c.gazeOverride && c.gazeIsCam) c.overrideVec.copy(camera.position);
        let aim: THREE.Vector3 | null = null;
        let isCam = false;
        if (c.gazeOverride) {
          aim = c.gazeOverride;
          isCam = c.gazeIsCam;
        } else if (shared) {
          aim = shared;
        } else if (animate) {
          if (time >= c.gazeUntil) pickIdleGaze(c, i);
          aim = c.gazeTarget;
          isCam = c.gazeIsCam;
        }
        let yaw = 0,
          pitch = 0;
        if (aim && animate) {
          local.copy(aim);
          c.group.worldToLocal(local).sub(c.head.position);
          yaw = clamp(Math.atan2(local.x, local.z), -0.55, 0.55);
          pitch = clamp(
            -Math.atan2(local.y, Math.hypot(local.x, local.z)),
            -0.3,
            0.25,
          );
        }
        if (animate) {
          c.lookYaw += (yaw - c.lookYaw) * damp;
          c.lookPitch += (pitch - c.lookPitch) * damp;
          const puppy =
            isCam && Math.abs(yaw) < 0.08 && Math.abs(pitch) < 0.08 ? 1 : 0;
          c.puppyT += (puppy - c.puppyT) * (1 - Math.exp(-dt * 6));
        } else {
          c.lookYaw = 0;
          c.lookPitch = 0;
          c.puppyT = 0;
        }
        const es = 1 + 0.12 * c.puppyT;
        for (let n = 0; n < 2; n++) {
          c.eyes[n].position.x = c.eyeBase[n].x + c.lookYaw * 0.04;
          c.eyes[n].position.y = c.eyeBase[n].y - c.lookPitch * 0.035;
          c.eyes[n].scale.x = EYE_SCALE.x * es;
          c.eyes[n].scale.z = EYE_SCALE.z * es;
          c.glints[n].position.x = c.glintBase[n].x + c.lookYaw * 0.04;
          c.glints[n].position.y = c.glintBase[n].y - c.lookPitch * 0.035;
        }
        composeCritter(c, i, time, animate);
      }

      // Toys.
      for (let n = 0; n < 3; n++) {
        const b = boops[n];
        if (b.t >= 0) {
          if (animate) b.t += dt;
          const u = Math.min(1, b.t / b.dur);
          if (n === 2) {
            // Ends on a whole turn, so it rejoins the idle spin seamlessly.
            ring.rotation.z = time * 0.2 + easeInOutCubic(u) * Math.PI * 2;
          } else {
            const s = n === 0 ? ORB_S : ORB2_S;
            const land = u > 0.8 ? Math.sin(((u - 0.8) / 0.2) * Math.PI) : 0;
            toys[n].position.y =
              (n === 0 ? ORB_Y : ORB2_Y) + 4 * u * (1 - u) * 0.5;
            toys[n].scale.set(
              s * (1 + 0.25 * land),
              s * (1 - 0.3 * land),
              s * (1 + 0.25 * land),
            );
          }
          if (u >= 1) {
            b.t = -1;
            if (n !== 2) toys[n].scale.setScalar(n === 0 ? ORB_S : ORB2_S);
          }
        } else if (n === 0) {
          orb.position.y = ORB_Y + (animate ? Math.sin(time * 1.2) * 0.1 : 0);
        } else if (n === 1) {
          orb2.position.y = ORB2_Y + (animate ? Math.cos(time) * 0.05 : 0);
        } else {
          ring.rotation.z = animate ? time * 0.2 : 0;
        }
      }

      pointer.lerp(animate ? target : ZERO, 0.04);
      world.rotation.y =
        angle + (animate ? Math.sin(time * 0.3) * 0.055 + pointer.x * 0.07 : 0);
      defaultPos.set(3.1 + pointer.x * 0.7, 3.8 - pointer.y * 0.35, 10);
      if (camera.aspect < 1) defaultPos.multiplyScalar(1.12);
      lookVec.copy(DEFAULT_LOOK);
      if (cam.mode !== 0 && animate) {
        cam.t += dt;
        if (!cam.out && cam.t >= cam.dur - 0.7) cam.out = true;
        cam.p = clamp(cam.p + (cam.out ? -dt / 0.7 : dt / 0.6), 0, 1);
        const k = easeInOutCubic(cam.p);
        if (cam.mode === 1 && cam.pet >= 0) {
          critters[cam.pet].head.getWorldPosition(headWorld);
          focusPos.copy(headWorld).add(FOCUS_OFFSET);
          if (camera.aspect < 1) focusPos.multiplyScalar(1.12);
          camera.position.lerpVectors(defaultPos, focusPos, k);
          lookVec.lerpVectors(DEFAULT_LOOK, headWorld, k);
        } else {
          focusPos.copy(PHOTO_POS);
          if (camera.aspect < 1) focusPos.multiplyScalar(1.12);
          camera.position.lerpVectors(defaultPos, focusPos, k);
          lookVec.lerpVectors(DEFAULT_LOOK, PHOTO_LOOK, k);
        }
        if (cam.out && cam.p <= 0) {
          cam.mode = 0;
          cam.pet = -1;
        }
      } else {
        camera.position.copy(defaultPos);
        cam.mode = 0;
        cam.p = 0;
      }
      camera.lookAt(lookVec);
      camera.updateMatrixWorld();

      alive = fx.update(animate ? dt : 0);

      renderer.render(scene, camera);
      if (shotPending) {
        shotPending = false;
        capture();
      }
      dirty = false;
      if (!ready) {
        ready = true;
        state.current.onReady(true);
      }
      if (!greetArmed && visible) {
        greetArmed = true;
        later(sayDaypart, 1800);
      }
      if (animate && time >= nextChatter) {
        nextChatter = time + 45 + Math.random() * 45;
        if (now - lastInteract > 6000) {
          let n = Math.floor(Math.random() * idleLine.length);
          if (n === lastIdle) n = (n + 1) % idleLine.length;
          lastIdle = n;
          emotes.show(Math.floor(Math.random() * 3), idleLine[n], {
            idle: true,
            ms: 2200,
          });
        }
      }
      // Every slot is placed every frame: show() only flips `is-on` on the
      // next animation frame, so waiting for active() would let a bubble fade
      // in at a stale spot.
      for (let i = 0; i < 3; i++) {
        critters[i].head.getWorldPosition(tmp);
        tmp.y += 0.85 * critters[i].scale;
        tmp.project(camera);
        emotes.place(i, ((tmp.x + 1) / 2) * W, ((1 - tmp.y) / 2) * H);
      }
      busy =
        alive > 0 ||
        cam.mode !== 0 ||
        boops[0].t >= 0 ||
        boops[1].t >= 0 ||
        boops[2].t >= 0 ||
        emotes.anyActive();
      if (!busy)
        for (let i = 0; i < 3; i++)
          if (critters[i].trick.type !== "none" || critters[i].act.happy > 0) {
            busy = true;
            break;
          }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      observer.disconnect();
      clearInterval(phaseTimer);
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      offCart();
      offSecret();
      offParade();
      el.removeEventListener("pointermove", pointerMove);
      el.removeEventListener("pointerleave", pointerLeave);
      el.removeEventListener("pointerdown", pointerDown);
      el.removeEventListener("pointerup", pointerUp);
      el.removeEventListener("pointercancel", pointerCancel);
      if (capturedId >= 0) {
        try {
          el.releasePointerCapture(capturedId);
        } catch {
          // the pointer was already released
        }
      }
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      fx.dispose();
      emotes.dispose();
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);
  return <div className="pet-world-canvas" ref={host} />;
}
