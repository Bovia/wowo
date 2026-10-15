"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import type { Group } from "three";
import type { Coat, Family, Person } from "@/lib/family";
import { cellKey, FLOOR, randomWalk, walkToward, type BuiltHome, type Cell } from "@/lib/home";

type Part = { size: [number, number, number]; pos: [number, number, number]; color: string };

export function Parts({ parts }: { parts: Part[] }) {
  return parts.map((p, i) => (
    <mesh key={i} position={p.pos} castShadow>
      <boxGeometry args={p.size} />
      <meshStandardMaterial color={p.color} roughness={0.9} />
    </mesh>
  ));
}

const WHITE = "#fbfaf7";
const BLACK = "#26221f";

const COAT_BASE: Record<Coat, { fur: string; ear: string; tail: string; eye: string }> = {
  cowBack: { fur: WHITE, ear: BLACK, tail: BLACK, eye: BLACK },
  cowHead: { fur: WHITE, ear: BLACK, tail: BLACK, eye: BLACK },
  orange: { fur: "#e8a25a", ear: "#d98c45", tail: "#e8a25a", eye: "#3a2a1a" },
  tabby: { fur: "#a08c6e", ear: "#7d6b52", tail: "#a08c6e", eye: "#3a2a1a" },
  black: { fur: "#2b2724", ear: "#2b2724", tail: "#2b2724", eye: "#f2c94c" },
  white: { fur: WHITE, ear: "#f2c2c2", tail: WHITE, eye: "#5b8fc7" },
  calico: { fur: WHITE, ear: BLACK, tail: "#e8a25a", eye: BLACK },
  blue: { fur: "#8d96a0", ear: "#7c8590", tail: "#8d96a0", eye: "#e0a83c" },
};

const stripes = (color: string): Part[] => [
  ...[-0.2, -0.04, 0.12].map((x): Part => ({ size: [0.06, 0.29, 0.31], pos: [x, 0.305, 0], color })),
  { size: [0.29, 0.06, 0.28], pos: [0.36, 0.6, 0], color },
  { size: [0.07, 0.07, 0.07], pos: [-0.36, 0.6, 0], color },
];

export function catParts(coat: Coat): Part[] {
  const c = COAT_BASE[coat];
  const parts: Part[] = [
    { size: [0.6, 0.28, 0.3], pos: [0, 0.3, 0], color: c.fur },
    { size: [0.28, 0.27, 0.27], pos: [0.36, 0.48, 0], color: c.fur },
    { size: [0.08, 0.09, 0.07], pos: [0.36, 0.65, 0.08], color: c.ear },
    { size: [0.08, 0.09, 0.07], pos: [0.36, 0.65, -0.08], color: c.ear },
    { size: [0.03, 0.05, 0.04], pos: [0.5, 0.53, 0.065], color: c.eye },
    { size: [0.03, 0.05, 0.04], pos: [0.5, 0.53, -0.065], color: c.eye },
    { size: [0.04, 0.04, 0.04], pos: [0.51, 0.45, 0], color: "#e99a9a" },
    { size: [0.06, 0.06, 0.06], pos: [-0.33, 0.44, 0], color: c.tail },
    { size: [0.06, 0.2, 0.06], pos: [-0.36, 0.56, 0], color: c.tail },
    ...[
      [0.2, 0.1],
      [0.2, -0.1],
      [-0.2, 0.1],
      [-0.2, -0.1],
    ].map(([x, z]): Part => ({ size: [0.08, 0.17, 0.08], pos: [x, 0.08, z], color: c.fur })),
  ];
  if (coat === "cowBack") {
    parts.push({ size: [0.3, 0.3, 0.32], pos: [-0.05, 0.31, 0], color: BLACK });
    parts.push({ size: [0.29, 0.12, 0.28], pos: [0.36, 0.58, 0], color: BLACK });
  } else if (coat === "cowHead") {
    parts.push({ size: [0.29, 0.28, 0.16], pos: [0.36, 0.49, 0.07], color: BLACK });
    parts.push({ size: [0.16, 0.29, 0.31], pos: [0.12, 0.3, 0], color: BLACK });
    parts.push({ size: [0.09, 0.18, 0.09], pos: [-0.2, 0.08, 0.1], color: BLACK });
  } else if (coat === "orange") {
    parts.push(...stripes("#c27a3a"));
    parts.push({ size: [0.1, 0.16, 0.2], pos: [0.27, 0.27, 0], color: WHITE });
  } else if (coat === "tabby") {
    parts.push(...stripes("#5e5040"));
    parts.push({ size: [0.1, 0.16, 0.2], pos: [0.27, 0.27, 0], color: "#d9ccb4" });
  } else if (coat === "calico") {
    parts.push({ size: [0.24, 0.3, 0.32], pos: [-0.12, 0.31, 0], color: "#e8a25a" });
    parts.push({ size: [0.14, 0.29, 0.31], pos: [0.12, 0.31, 0], color: BLACK });
    parts.push({ size: [0.29, 0.12, 0.14], pos: [0.36, 0.58, -0.07], color: "#e8a25a" });
    parts.push({ size: [0.29, 0.12, 0.14], pos: [0.36, 0.58, 0.07], color: BLACK });
  }
  return parts;
}

export function personParts(p: Person): Part[] {
  const parts: Part[] = [
    { size: [0.14, 0.4, 0.14], pos: [0, 0.2, 0.09], color: p.pants },
    { size: [0.14, 0.4, 0.14], pos: [0, 0.2, -0.09], color: p.pants },
    { size: [0.24, 0.42, 0.38], pos: [0, 0.61, 0], color: p.shirt },
    { size: [0.12, 0.36, 0.1], pos: [0, 0.62, 0.25], color: p.shirt },
    { size: [0.12, 0.36, 0.1], pos: [0, 0.62, -0.25], color: p.shirt },
    { size: [0.32, 0.32, 0.32], pos: [0, 0.99, 0], color: p.skin },
    { size: [0.04, 0.05, 0.04], pos: [0.165, 1.0, 0.07], color: BLACK },
    { size: [0.04, 0.05, 0.04], pos: [0.165, 1.0, -0.07], color: BLACK },
  ];
  if (p.style === "buzz") {
    parts.push({ size: [0.33, 0.05, 0.33], pos: [0, 1.16, 0], color: p.hair });
    parts.push({ size: [0.06, 0.18, 0.33], pos: [-0.14, 1.06, 0], color: p.hair });
  } else {
    parts.push({ size: [0.34, 0.1, 0.34], pos: [0, 1.18, 0], color: p.hair });
    parts.push({ size: [0.1, 0.24, 0.34], pos: [-0.13, 1.04, 0], color: p.hair });
  }
  if (p.style === "long") parts.push({ size: [0.12, 0.42, 0.36], pos: [-0.14, 0.9, 0], color: p.hair });
  if (p.style === "bun") parts.push({ size: [0.16, 0.15, 0.16], pos: [-0.06, 1.3, 0], color: p.hair });
  return parts;
}

type WanderState = {
  home: BuiltHome;
  cell: Cell;
  x: number;
  z: number;
  y: number;
  heading: number;
  path: Cell[];
  wait: number;
  phase: number;
  retarget: number;
  curl: number;
};

export type Goal = { x: number; z: number; spread: number };

function spawn(home: BuiltHome, idle: [number, number]): WanderState {
  const cells = [...home.nav.cells.keys()];
  const [i, j] = cells[Math.floor(Math.random() * cells.length)].split(",").map(Number);
  const r = home.nav.res;
  return {
    home,
    cell: [i, j],
    x: (i + 0.5) * r,
    z: (j + 0.5) * r,
    y: home.nav.cells.get(cellKey(i, j)) ?? 0,
    heading: Math.random() * Math.PI * 2,
    path: [],
    wait: Math.random() * idle[1],
    phase: Math.random() * 10,
    retarget: 0,
    curl: 0,
  };
}

function Wanderer({
  home,
  speed,
  idle,
  scale,
  goal,
  curl = [1, 1],
  register,
  onPick,
  children,
}: {
  home: BuiltHome;
  speed: number;
  idle: [number, number];
  scale: number;
  goal?: () => Goal | null;
  curl?: [number, number];
  register?: (g: Group | null) => void;
  onPick?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const setRef = (g: Group | null) => {
    ref.current = g;
    register?.(g);
  };
  const stateRef = useRef<WanderState | null>(null);

  useFrame((frame, dt) => {
    const g = ref.current;
    if (!g) return;
    if (stateRef.current?.home !== home) stateRef.current = spawn(home, idle);
    const s = stateRef.current;
    const step = Math.min(dt, 0.05);
    let moving = false;
    const r = home.nav.res;
    const target = goal?.() ?? null;
    let settled = false;

    if (target) {
      const end = s.path.at(-1) ?? s.cell;
      const off = Math.hypot((end[0] + 0.5) * r - target.x, (end[1] + 0.5) * r - target.z);
      if ((s.retarget -= step) <= 0 && off > target.spread + 0.6) {
        s.path = walkToward(home.nav, s.cell, target.x, target.z, target.spread);
        s.retarget = 1.2;
      }
      settled = !s.path.length;
      if (settled) s.wait = Math.max(s.wait, 0.5);
    }

    if (s.path.length) {
      const [ti, tj] = s.path[0];
      const dx = (ti + 0.5) * r - s.x;
      const dz = (tj + 0.5) * r - s.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.03) {
        s.cell = s.path.shift()!;
        if (!s.path.length) s.wait = idle[0] + Math.random() * (idle[1] - idle[0]);
      } else {
        const move = Math.min(dist, speed * step);
        s.x += (dx / dist) * move;
        s.z += (dz / dist) * move;
        const facing = Math.atan2(-dz, dx);
        let delta = facing - s.heading;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        s.heading += delta * Math.min(1, step * 10);
        moving = true;
      }
    } else if (!settled && (s.wait -= step) <= 0) {
      s.path = randomWalk(home.nav, s.cell);
      if (!s.path.length) s.wait = idle[1];
    }

    const elev = home.nav.cells.get(cellKey(s.path[0]?.[0] ?? s.cell[0], s.path[0]?.[1] ?? s.cell[1])) ?? 0;
    s.y += (elev - s.y) * Math.min(1, step * 12);
    s.curl += ((settled ? 1 : 0) - s.curl) * Math.min(1, step * 3);
    const t = frame.clock.elapsedTime + s.phase;
    const breathe = moving ? 1 : 1 + Math.sin(t * (settled ? 1.2 : 2.2)) * 0.025;
    g.position.set(s.x, FLOOR + s.y + (moving ? Math.abs(Math.sin(t * 11)) * 0.06 : 0), s.z);
    g.rotation.y = s.heading;
    g.scale.set(
      scale * (1 + (curl[0] - 1) * s.curl),
      scale * (1 + (curl[1] - 1) * s.curl) * breathe,
      scale * (1 + (curl[0] - 1) * s.curl),
    );
  });

  return (
    <group
      ref={setRef}
      onClick={
        onPick
          ? (e) => {
              e.stopPropagation();
              if (e.delta <= 6) onPick();
            }
          : undefined
      }
      onPointerOver={onPick ? () => (document.body.style.cursor = "pointer") : undefined}
      onPointerOut={onPick ? () => (document.body.style.cursor = "") : undefined}
    >
      {children}
    </group>
  );
}

const CAT_IDLE: [number, number] = [2, 7];
const PERSON_IDLE: [number, number] = [3, 9];

export function Creatures({
  home,
  catsRef,
  onPickCat,
  nest,
  battery,
  family,
}: {
  home: BuiltHome;
  catsRef: RefObject<(Group | null)[]>;
  onPickCat?: (i: number) => void;
  nest: { x: number; z: number } | null;
  battery: number;
  family: Family;
}) {
  const cats = useMemo(() => family.cats.map((c) => ({ key: c.id, parts: catParts(c.coat) })), [family.cats]);
  const people = useMemo(
    () => [family.me, ...(family.partner ? [family.partner] : [])].map(personParts),
    [family.me, family.partner],
  );
  const me = useRef<Group | null>(null);
  const charging = nest !== null;
  const nearMe = (): Goal | null =>
    charging && me.current ? { x: me.current.position.x, z: me.current.position.z, spread: 0.7 } : null;

  return (
    <>
      {cats.map(({ key, parts }, i) => (
        <Wanderer
          key={key}
          home={home}
          speed={1.4}
          idle={CAT_IDLE}
          scale={0.9}
          goal={nearMe}
          curl={[1.08, 0.72]}
          register={(g) => (catsRef.current[i] = g)}
          onPick={onPickCat && (() => onPickCat(i))}
        >
          <Parts parts={parts} />
        </Wanderer>
      ))}
      {people.map((parts, i) => (
        <Wanderer
          key={`p${i}`}
          home={home}
          speed={i === 0 && battery < 50 ? 0.7 : 1.0}
          idle={PERSON_IDLE}
          scale={1.3}
          goal={i === 0 && nest ? () => ({ ...nest, spread: 0.25 }) : undefined}
          curl={[1, 0.74]}
          register={i === 0 ? (g) => (me.current = g) : undefined}
        >
          <Parts parts={parts} />
          {i === 0 && charging && (
            <Html position={[0, 1.55, 0]} center zIndexRange={[0, 0]} style={{ pointerEvents: "none" }}>
              <div className="charge-bubble">
                <span className="charge-bolt">⚡</span> 充电中 {Math.round(battery)}%
              </div>
            </Html>
          )}
        </Wanderer>
      ))}
    </>
  );
}
