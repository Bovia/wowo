"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, Object3D, Vector3, type Group, type InstancedMesh, type PerspectiveCamera } from "three";
import { skyAt, nowHour, sunPosition } from "@/lib/daylight";
import { applySpots } from "@/lib/decor";
import type { Person } from "@/lib/family";
import { buildHome, type Box, type Layout } from "@/lib/home";
import { DEMOS, TEMPLATES } from "@/lib/layouts";
import { scanToLayout } from "@/lib/scan";
import { LOT_MAX, NPCS, plotAt, scenery, STREET, townSize, WALK, type Plot, type TownHome } from "@/lib/town";
import { visitLink, type HomeRef } from "@/lib/visit";
import { catParts, Parts, personParts } from "./creatures";

function layoutOf(home: HomeRef): Layout | null {
  if ("d" in home) return DEMOS.find((d) => d.id === home.d) ?? null;
  if ("t" in home) return TEMPLATES.find((t) => t.id === home.t) ?? null;
  try {
    return scanToLayout(home.s);
  } catch {
    return null;
  }
}

type Lot = { home: TownHome; plot: Plot; boxes: Box[] };

// 把一户的窝缩小、摆到它那块地上；朝街的那面对着街
function lotOf(home: TownHome, plot: Plot): Lot | null {
  const layout = layoutOf(home.home);
  if (!layout) return null;
  const built = buildHome(layout, applySpots(layout, home.decor) ?? undefined);
  const s = Math.min(0.36, LOT_MAX.w / built.width, LOT_MAX.d / built.depth);
  const pad = 0.25;
  const [w, d] = [built.width * s, built.depth * s];
  const boxes: Box[] = [
    { x0: plot.x - w / 2 - pad, y0: 0, z0: plot.z - d / 2 - pad, x1: plot.x + w / 2 + pad, y1: 0.05, z1: plot.z + d / 2 + pad, color: 0xd9c9a9, room: null },
  ];
  for (const b of built.boxes) {
    boxes.push({
      ...b,
      x0: plot.x - w / 2 + b.x0 * s,
      x1: plot.x - w / 2 + b.x1 * s,
      z0: plot.z - d / 2 + b.z0 * s,
      z1: plot.z - d / 2 + b.z1 * s,
      y0: 0.05 + b.y0 * s,
      y1: 0.05 + b.y1 * s,
    });
  }
  return { home, plot, boxes };
}

const dummy = new Object3D();
const tint = new Color();
const white = new Color("#ffffff");

function TownBoxes({
  boxes,
  owner,
  hovered,
  onHover,
  onPick,
}: {
  boxes: Box[];
  owner: Int16Array;
  hovered: number | null;
  onHover: (lot: number | null) => void;
  onPick: (lot: number) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    boxes.forEach((b, i) => {
      dummy.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
      dummy.scale.set(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    boxes.forEach((b, i) => {
      tint.setHex(b.color);
      if (hovered !== null && owner[i] === hovered) tint.lerp(white, 0.22);
      mesh.setColorAt(i, tint);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boxes, owner, hovered]);
  const lotAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const o = e.instanceId === undefined ? -1 : owner[e.instanceId];
    return o >= 0 ? o : null;
  };
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, boxes.length]}
      castShadow
      receiveShadow
      onPointerMove={(e) => {
        e.stopPropagation();
        onHover(lotAt(e));
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 6) return;
        const lot = lotAt(e);
        if (lot !== null) onPick(lot);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.85} metalness={0} />
    </instancedMesh>
  );
}

const WALKER = 0.42;

// 镇上溜达的人和猫：在自家门口那段街上走走停停
function Walker({ parts, home, range, speed, seed }: { parts: ReturnType<typeof personParts>; home: Plot; range: number; speed: number; seed: number }) {
  const ref = useRef<Group>(null);
  const curb = home.side * (STREET + WALK / 2);
  const state = useRef({ x: home.x, z: curb, tx: home.x, tz: curb, wait: seed % 3 });
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = state.current;
    if (s.wait > 0) {
      s.wait -= dt;
      if (s.wait <= 0) {
        s.tx = home.x + (Math.random() * 2 - 1) * range;
        // 大多走人行道，偶尔过街
        s.tz = Math.random() < 0.85 ? home.side * (STREET + WALK / 2) : (Math.random() * 2 - 1) * STREET * 0.8;
      }
      g.position.y = 0.07;
      return;
    }
    const dx = s.tx - s.x;
    const dz = s.tz - s.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) {
      s.wait = 1 + Math.random() * 3;
      return;
    }
    const step = Math.min(dist, speed * dt);
    s.x += (dx / dist) * step;
    s.z += (dz / dist) * step;
    g.position.set(s.x, 0.07 + Math.abs(Math.sin(performance.now() / 120 + seed)) * 0.03, s.z);
    g.rotation.y = Math.atan2(-dz, dx);
  });
  return (
    <group ref={ref} position={[home.x, 0.07, curb]} scale={WALKER}>
      <Parts parts={parts} />
    </group>
  );
}

// 门牌：每帧把地块上方那个点换成屏幕坐标，挪对应的 DOM。比每块地一个 Html 根省事也稳
const spot = new Vector3();
function Signs({ lots, els }: { lots: Lot[]; els: React.RefObject<(HTMLButtonElement | null)[]> }) {
  const { camera, size } = useThree();
  useFrame(() => {
    lots.forEach((l, i) => {
      const el = els.current?.[i];
      if (!el) return;
      spot.set(l.plot.x, 2.1, l.plot.z).project(camera);
      const off = spot.z > 1;
      el.style.visibility = off ? "hidden" : "visible";
      el.style.transform = `translate(${((spot.x + 1) / 2) * size.width}px, ${((1 - spot.y) / 2) * size.height}px) translate(-50%, -50%)`;
    });
  });
  return null;
}

function Rig({ halfW, halfD }: { halfW: number; halfD: number }) {
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    const camera = get().camera;
    // 把镇子四个角投到屏幕上，退到四个角都在画面里（留点边）为止；横屏竖屏都适用
    const cam = camera as PerspectiveCamera;
    cam.aspect = size.width / Math.max(1, size.height);
    cam.updateProjectionMatrix();
    const dir = new Vector3(0.55, 0.75, 0.62).normalize();
    const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => new Vector3(sx * halfW, 0, sz * halfD)));
    let dist = Math.hypot(halfW, halfD) * 2;
    for (let i = 0; i < 6; i++) {
      camera.position.copy(dir).multiplyScalar(dist);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const reach = Math.max(...corners.map((c) => {
        const p = c.clone().project(camera);
        return Math.max(Math.abs(p.x) / 0.92, Math.abs(p.y) / 0.8);
      }));
      dist *= reach;
    }
    camera.position.copy(dir).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
  }, [get, size.width, size.height, halfW, halfD]);
  // 拖着挪不许把镇子挪丢
  useFrame(({ controls }) => {
    const t = (controls as unknown as { target?: { x: number; z: number; y: number } } | null)?.target;
    if (!t) return;
    t.x = Math.max(-halfW, Math.min(halfW, t.x));
    t.z = Math.max(-halfD, Math.min(halfD, t.z));
    t.y = 0;
  });
  return null;
}

export default function Town() {
  const [homes, setHomes] = useState<TownHome[]>(NPCS);
  const [hovered, setHovered] = useState<number | null>(null);
  const [going, setGoing] = useState<string | null>(null);
  const signs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hour] = useState(nowHour);
  const sky = skyAt(hour);

  useEffect(() => {
    let cancel = false;
    fetch("/api/town")
      .then((r) => r.json() as Promise<{ homes?: TownHome[] }>)
      .then((b) => !cancel && b.homes?.length && setHomes([...NPCS, ...b.homes]))
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  const lots = useMemo(() => homes.map((h, i) => lotOf(h, plotAt(i))).filter((l): l is Lot => l !== null), [homes]);
  const { boxes, owner } = useMemo(() => {
    const env = scenery(lots.length);
    const all = [...env, ...lots.flatMap((l) => l.boxes)];
    const own = new Int16Array(all.length).fill(-1);
    let k = env.length;
    lots.forEach((l, i) => {
      own.fill(i, k, k + l.boxes.length);
      k += l.boxes.length;
    });
    return { boxes: all, owner: own };
  }, [lots]);
  const { halfW, halfD } = townSize(lots.length);

  useEffect(() => {
    document.body.style.cursor = hovered !== null ? "pointer" : "";
    return () => void (document.body.style.cursor = "");
  }, [hovered]);

  const visit = async (i: number) => {
    const home = lots[i]?.home;
    if (!home || going) return;
    setGoing(home.host);
    // 真人：活的串门；样板间邻居：打包一张串门卡
    window.location.href = home.npc
      ? await visitLink({ v: 1, host: home.host, home: home.home, decor: home.decor, family: home.family })
      : `/@${home.handle}`;
  };

  return (
    <div className="wowo-bg relative h-dvh w-full overflow-hidden select-none">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 32, near: 0.5, far: 400 }} onPointerMissed={() => setHovered(null)}>
        <color attach="background" args={[sky.bg]} />
        <ambientLight intensity={sky.ambient} />
        <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.hemi]} />
        <directionalLight
          position={sunPosition(hour).map((v) => v * 1.6) as [number, number, number]}
          intensity={sky.sunIntensity}
          color={sky.sun}
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-camera-left={-halfW - 4}
          shadow-camera-right={halfW + 4}
          shadow-camera-top={halfW + 4}
          shadow-camera-bottom={-halfW - 4}
          shadow-camera-far={140}
          shadow-bias={-0.0004}
        />
        <TownBoxes boxes={boxes} owner={owner} hovered={hovered} onHover={setHovered} onPick={visit} />
        {lots.map((l, i) => {
          const f = l.home.family;
          const people: Person[] = [f.me, ...(f.partner ? [f.partner] : [])];
          return (
            <group key={l.home.handle}>
              {people.map((p, k) => (
                <Walker key={`p${k}`} parts={personParts(p)} home={l.plot} range={2.6} speed={0.55} seed={i * 7 + k} />
              ))}
              {f.cats.slice(0, 2).map((c, k) => (
                <Walker key={`c${k}`} parts={catParts(c.coat)} home={l.plot} range={1.8} speed={0.8} seed={i * 11 + k + 3} />
              ))}
            </group>
          );
        })}
        <OrbitControls
          makeDefault
          enablePan
          screenSpacePanning={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={0.3}
          maxPolarAngle={1.15}
          minDistance={6}
          // 竖屏要退得很远才装得下整条街，别让这里把机位拽回来
          maxDistance={Math.max(halfW, halfD) * 12 + 20}
        />
        <Rig halfW={halfW} halfD={halfD} />
        <Signs lots={lots} els={signs} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {lots.map((l, i) => (
          <button
            key={l.home.handle}
            ref={(el) => {
              signs.current[i] = el;
            }}
            onClick={() => visit(i)}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
            style={{ visibility: "hidden" }}
            className={`pointer-events-auto absolute top-0 left-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur transition-colors ${
              hovered === i ? "bg-[#ff8a5b] text-white" : "bg-[#fffaf2]/90 text-[#6b4a35]"
            }`}
          >
            {l.home.host}家{l.home.npc ? "" : <span className="ml-1 font-normal opacity-70">@{l.home.handle}</span>}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-5">
        <div className="pointer-events-auto">
          <h1 className="ink text-2xl font-extrabold tracking-widest text-[#6b4a35]">窝窝镇</h1>
          <p className="ink-soft mt-1 text-xs text-[#8b6b55]">{lots.length} 户人家 · 点一户进去串门</p>
        </div>
        <Link
          href="/"
          className="pointer-events-auto rounded-full bg-[#fffaf2]/90 px-3 py-1.5 text-sm font-semibold text-[#6b4a35] shadow-sm backdrop-blur hover:bg-white"
        >
          回我家
        </Link>
      </div>

      <p className="ink-soft pointer-events-none absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] px-6 text-center text-xs text-[#8b6b55]/70">
        {going ? `正在去${going}家…` : "拖动看看 · 双指或右键拖着挪 · 想让你家也在这？在「云上的窝」里打开「上小镇」"}
      </p>
    </div>
  );
}
