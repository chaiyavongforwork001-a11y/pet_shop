"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { WorldProps } from "./experience";

export default function PetWorld({ motion, greet, onReady }: WorldProps) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ motion, greet, onReady });
  state.current = { motion, greet, onReady };
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8e65ae, 0.85));
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
      darkPurple = mat(0x60438b, 0.32);
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 24);
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
    const critters: {
      group: THREE.Group;
      head: THREE.Group;
      tail: THREE.Object3D;
      eyes: THREE.Mesh[];
      y: number;
    }[] = [];
    for (let kind = 0; kind < 3; kind++) {
      const g = new THREE.Group();
      world.add(g);
      const fur = kind === 0 ? caramel : kind === 1 ? grey : cream;
      ball(g, fur, 0, 0.61, 0, 0.62, 0.68, 0.48);
      ball(g, cream, 0, 0.56, 0.35, 0.4, 0.46, 0.17);
      const head = new THREE.Group();
      head.position.set(0, 1.43, 0.08);
      g.add(head);
      ball(head, fur, 0, 0, 0, 0.74, 0.65, 0.59);
      if (kind === 0) ball(head, cream, 0, 0.12, 0.49, 0.19, 0.5, 0.14);
      const eyes: THREE.Mesh[] = [];
      for (const side of [-1, 1]) {
        ball(g, cream, side * 0.36, 0.12, 0.23, 0.25, 0.17, 0.31);
        const arm = ball(g, fur, side * 0.5, 0.55, 0.22, 0.19, 0.36, 0.2);
        arm.rotation.z = side * 0.15;
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
        }
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
        ball(
          head,
          white,
          side * 0.28 - 0.025,
          0.088,
          0.601,
          0.029,
          0.038,
          0.014,
        );
        ball(head, blush, side * 0.45, -0.18, 0.48, 0.115, 0.056, 0.025);
        ball(head, cream, side * 0.115, -0.21, 0.55, 0.205, 0.15, 0.11);
      }
      ball(head, kind === 0 ? eye : pink, 0, -0.13, 0.68, 0.09, 0.062, 0.055);
      if (kind === 0) {
        ball(head, eye, 0, -0.36, 0.55, 0.11, 0.075, 0.04);
        ball(head, pink, 0, -0.385, 0.6, 0.07, 0.1, 0.036);
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
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.055, 12, 48),
        kind === 0 ? darkPurple : butter,
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.98;
      g.add(collar);
      ball(g, butter, 0, 0.88, 0.43, 0.065, 0.075, 0.025);
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
      critters.push({ group: g, head, tail, eyes, y: g.position.y });
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
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.39;
    shadow.receiveShadow = true;
    scene.add(shadow);
    let visible = true,
      raf = 0,
      prev = 0,
      time = 0,
      lastGreet = 0,
      jump = 0,
      ready = false,
      dirty = true,
      lastMotion = state.current.motion;
    const pointer = new THREE.Vector2(),
      target = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let down = { x: 0, y: 0, angle: 0 },
      dragging = false,
      angle = 0;
    const pointerMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - down.x,
          dy = e.clientY - down.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          angle = down.angle + dx * 0.008;
          dirty = true;
        }
      }
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      target.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        ((e.clientY - r.top) / r.height) * 2 - 1,
      );
    };
    const pointerLeave = () => {
      target.set(0, 0);
      dragging = false;
    };
    const pointerDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, angle };
      dragging = true;
    };
    const pointerUp = (e: PointerEvent) => {
      dragging = false;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) return;
      const r = el.getBoundingClientRect();
      const p = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(p, camera);
      if (
        raycaster.intersectObjects(
          critters.map((c) => c.group),
          true,
        ).length
      )
        jump = 1;
    };
    el.addEventListener("pointermove", pointerMove);
    el.addEventListener("pointerleave", pointerLeave);
    el.addEventListener("pointerdown", pointerDown);
    el.addEventListener("pointerup", pointerUp);
    el.addEventListener("pointercancel", pointerLeave);
    const resize = () => {
      if (!el.clientWidth || !el.clientHeight) return;
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);
    const lost = (e: Event) => {
      e.preventDefault();
      ready = false;
      dirty = true;
      state.current.onReady(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (
        document.hidden ||
        !visible ||
        renderer.getContext().isContextLost() ||
        now - prev < 32
      )
        return;
      const dt = Math.min((now - prev) / 1000, 0.06);
      prev = now;
      if (state.current.greet !== lastGreet) {
        lastGreet = state.current.greet;
        jump = 1;
      }
      const animate = state.current.motion;
      if (lastMotion !== animate) {
        dirty = true;
        lastMotion = animate;
      }
      if (!animate && !dirty && ready && jump <= 0) return;
      if (animate) time += dt;
      pointer.lerp(animate ? target : new THREE.Vector2(), 0.04);
      camera.position.set(3.1 + pointer.x * 0.7, 3.8 - pointer.y * 0.35, 10);
      if (camera.aspect < 1) camera.position.multiplyScalar(1.12);
      camera.lookAt(0, 1.05, 0);
      world.rotation.y =
        angle + (animate ? Math.sin(time * 0.3) * 0.055 + pointer.x * 0.07 : 0);
      jump = Math.max(0, jump - dt * 1.1);
      critters.forEach((c, i) => {
        c.group.position.y =
          c.y +
          Math.max(0, Math.sin((1 - jump) * Math.PI * 2 - i * 0.45)) *
            jump *
            0.5;
        c.head.rotation.z = animate ? Math.sin(time * 0.9 + i) * 0.055 : 0;
        c.head.rotation.y = animate ? pointer.x * 0.14 : 0;
        c.tail.rotation.z = animate ? Math.sin(time * 5 + i) * 0.17 : 0;
        c.eyes.forEach(
          (e) =>
            (e.scale.y =
              animate && Math.sin(time * 0.8 + i) > 0.999 ? 0.025 : 0.136),
        );
      });
      orb.position.y = 0.44 + (animate ? Math.sin(time * 1.2) * 0.1 : 0);
      orb2.position.y = 0.23 + (animate ? Math.cos(time) * 0.05 : 0);
      ring.rotation.z = animate ? time * 0.2 : 0;
      renderer.render(scene, camera);
      dirty = false;
      if (!ready) {
        ready = true;
        state.current.onReady(true);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      observer.disconnect();
      el.removeEventListener("pointermove", pointerMove);
      el.removeEventListener("pointerleave", pointerLeave);
      el.removeEventListener("pointerdown", pointerDown);
      el.removeEventListener("pointerup", pointerUp);
      el.removeEventListener("pointercancel", pointerLeave);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
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
