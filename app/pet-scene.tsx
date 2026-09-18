"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export default function PetScene() {
  const host = useRef<HTMLDivElement>(null),
    action = useRef<(n: number) => void>(() => {});
  const [pet, setPet] = useState(0),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xd3eafa, 1);
    node.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "สนามเล่นโมเดลสุนัข แมว และกระต่าย 3D ลากเพื่อหมุน",
    );
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(3, 2.7, 6.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.25, 0);
    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = 1.6;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a93b6, 1.7));
    const sun = new THREE.DirectionalLight(0xfff9ec, 2.3);
    sun.position.set(-3, 6, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    const back = new THREE.DirectionalLight(0xb6dfff, 0.9);
    back.position.set(4, 3, -4);
    scene.add(back);
    const mat = (c: number) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 });
    const cream = mat(0xfff8e8),
      caramel = mat(0xeebc83),
      grey = mat(0xadb5cd),
      pink = mat(0xf5a8b4),
      black = mat(0x273349),
      white = mat(0xffffff),
      blue = mat(0x95c8ef);
    const geos: THREE.BufferGeometry[] = [];
    function sphere(
      parent: THREE.Object3D,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) {
      const g = new THREE.SphereGeometry(1, 32, 24);
      geos.push(g);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(12, 64),
      mat(0xd3eafa),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.68, 0.32, 64),
      blue,
    );
    platform.position.y = 0.16;
    platform.receiveShadow = true;
    platform.castShadow = true;
    scene.add(platform);
    const models: THREE.Group[] = [],
      tails: THREE.Mesh[] = [];
    for (let kind = 0; kind < 3; kind++) {
      const g = new THREE.Group();
      g.position.y = 0.32;
      const fur = kind === 0 ? caramel : kind === 1 ? grey : cream;
      sphere(g, fur, 0, 0.65, 0, 0.65, 0.7, 0.5);
      sphere(g, cream, 0, 0.6, 0.38, 0.43, 0.5, 0.17);
      sphere(g, fur, 0, 1.55, 0.02, 0.78, 0.72, 0.64);
      for (const s of [-1, 1]) {
        sphere(g, cream, s * 0.38, 0.14, 0.28, 0.25, 0.17, 0.33);
        sphere(g, fur, s * 0.54, 0.6, 0.24, 0.17, 0.38, 0.19);
        if (kind === 2) {
          const ear = sphere(g, cream, s * 0.45, 2.35, -0.03, 0.19, 0.65, 0.2);
          ear.rotation.z = -s * 0.2;
          const inner = sphere(g, pink, s * 0.45, 2.35, 0.13, 0.11, 0.47, 0.06);
          inner.rotation.z = -s * 0.2;
        } else {
          const earGeo = new THREE.ConeGeometry(
            kind === 0 ? 0.3 : 0.27,
            0.68,
            3,
          );
          geos.push(earGeo);
          const ear = new THREE.Mesh(earGeo, fur);
          ear.position.set(s * 0.5, 2.14, -0.02);
          ear.rotation.z = -s * 0.2;
          ear.rotation.y = Math.PI / 6;
          ear.castShadow = true;
          g.add(ear);
          const innerGeo = new THREE.ConeGeometry(0.17, 0.42, 3);
          geos.push(innerGeo);
          const inner = new THREE.Mesh(innerGeo, pink);
          inner.position.set(s * 0.5, 2.16, 0.12);
          inner.rotation.copy(ear.rotation);
          g.add(inner);
        }
        sphere(g, black, s * 0.28, 1.62, 0.6, 0.105, 0.135, 0.08);
        sphere(g, white, s * 0.3, 1.67, 0.67, 0.036, 0.046, 0.015);
        sphere(g, pink, s * 0.47, 1.35, 0.51, 0.11, 0.06, 0.03);
        sphere(g, cream, s * 0.12, 1.31, 0.62, 0.21, 0.16, 0.14);
      }
      sphere(g, kind === 0 ? black : pink, 0, 1.4, 0.775, 0.1, 0.065, 0.045);
      if (kind === 0) sphere(g, pink, 0, 1.15, 0.72, 0.085, 0.12, 0.04);
      const tail = sphere(
        g,
        fur,
        kind === 2 ? 0 : 0.6,
        0.68,
        -0.41,
        kind === 2 ? 0.24 : 0.15,
        kind === 2 ? 0.24 : 0.49,
        0.18,
      );
      tail.rotation.z = -0.7;
      tails.push(tail);
      scene.add(g);
      models.push(g);
    }
    models.forEach((m, i) => (m.visible = i === 0));
    let selected = 0,
      jump = 0;
    action.current = (n) => {
      if (n >= 0) {
        selected = n;
        models.forEach((m, i) => (m.visible = i === n));
        controls.reset();
        camera.position.set(3, 2.7, 6.5);
        controls.target.set(0, 1.25, 0);
      }
      jump = 1;
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prev = 0,
      raf = 0,
      downX = 0,
      downY = 0;
    const down = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 8) jump = 1;
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    const resize = () => {
      renderer.setSize(node.clientWidth, node.clientHeight);
      camera.aspect = node.clientWidth / node.clientHeight;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(node);
    resize();
    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      if (document.hidden || t - prev < 32) return;
      const dt = Math.min((t - prev) / 1000, 0.08);
      prev = t;
      controls.update();
      if (!reduce.matches) {
        jump = Math.max(0, jump - dt * 1.8);
        models[selected].position.y = 0.32 + Math.sin(jump * Math.PI) * 0.4;
        models[selected].rotation.z = Math.sin(t * 0.001) * 0.025;
        tails[selected].rotation.z = -0.7 + Math.sin(t * 0.006) * 0.28;
      } else {
        models[selected].position.y = 0.32;
        models[selected].rotation.z = 0;
      }
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      action.current = () => {};
    };
  }, []);
  return (
    <>
      {failed ? (
        <div className="scene-loading">
          อุปกรณ์นี้ไม่รองรับการแสดงผล 3D คุณยังช้อปสินค้าได้ตามปกติ
        </div>
      ) : (
        <div ref={host} className="pet-canvas" />
      )}
      <div className="pet-play-controls">
        {["น้องหมา", "น้องแมว", "น้องกระต่าย"].map((n, i) => (
          <button
            className={pet === i ? "selected" : ""}
            key={n}
            onClick={() => {
              setPet(i);
              action.current(i);
            }}
          >
            {n}
          </button>
        ))}
        <button onClick={() => action.current(-1)}>ทักทาย ♡</button>
      </div>
    </>
  );
}
