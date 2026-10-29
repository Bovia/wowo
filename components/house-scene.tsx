"use client";

import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Color, Object3D, Plane, Raycaster, Vector3, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import { LOW } from "@/lib/battery";
import type { Family, Person } from "@/lib/family";
import { skyAt, sunPosition } from "@/lib/daylight";
import {
  buildHome,
  FLOOR,
  footprintOf,
  H_OUT,
  pieceBoxes,
  seat,
  type BuiltHome,
  type Box,
  type Layout,
  type Placement,
} from "@/lib/home";
import { Creatures, type Goal } from "./creatures";

export type IntroMode = "full" | "short";

// `speed` scales the build schedule below; the house spins in while it builds.
const TIMING: Record<IntroMode, { spin: number; speed: number; from: number; turns: number }> = {
  full: { spin: 2.8, speed: 1, from: 1.5, turns: -1.25 },
  short: { spin: 0.8, speed: 2.6, from: 1.1, turns: -0.18 },
};
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

const POP = 0.4;

// Floors sweep in from the far corner, walls rise course by course, then furniture pops up bottom-first.
function buildSchedule(boxes: Box[]) {
  let w = 1;
  let d = 1;
  for (const b of boxes) {
    w = Math.max(w, b.x1);
    d = Math.max(d, b.z1);
  }
  let total = 0;
  const delays = Float32Array.from(boxes, (b) => {
    const sweep = (b.x0 + b.x1 + b.z0 + b.z1) / 2 / (w + d);
    const t =
      b.piece !== undefined
        ? 1.85 + sweep * 0.6 + b.y0 * 0.2
        : b.y1 - b.y0 <= 0.12 && b.y0 < 0.4
          ? sweep * 0.8
          : 0.6 + sweep * 0.35 + (b.y0 / H_OUT) * 0.9;
    total = Math.max(total, t + POP);
    return t;
  });
  return { delays, total };
}

type Build = { delays: Float32Array; total: number };

const dummy = new Object3D();
const white = new Color("#ffffff");
const tint = new Color();

function Boxes({
  boxes,
  highlight,
  picked,
  interactive,
  onHover,
  onSelect,
  onGrab,
  build,
  clock,
  name,
}: {
  name?: string;
  boxes: Box[];
  build?: Build;
  clock?: RefObject<number>;
  highlight?: string | null;
  picked?: number | null;
  interactive?: boolean;
  onHover?: (room: string | null) => void;
  onSelect?: (room: string | null, point?: Vector3) => void;
  onGrab?: (piece: number) => void;
}) {
  const ref = useRef<InstancedMesh>(null);

  const settled = useRef(false);
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
    settled.current = true;
  }, [boxes]);

  useFrame(() => {
    const mesh = ref.current;
    const t = clock?.current ?? Infinity;
    if (!mesh || !build || build.delays.length !== boxes.length) return;
    if (t >= build.total && settled.current) return;
    boxes.forEach((b, i) => {
      const k = clamp01((t - build.delays[i]) / POP);
      const w = b.x1 - b.x0;
      const h = b.y1 - b.y0;
      const d = b.z1 - b.z0;
      if (k <= 0) {
        dummy.scale.setScalar(1e-4);
      } else if (b.piece === undefined && h > 0.12) {
        const g = Math.min(1, k * 3);
        dummy.scale.set(w * g, h * g, d * g);
        dummy.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2 + (1 - easeOutCubic(k)) * 1.2, (b.z0 + b.z1) / 2);
      } else {
        const g = Math.max(0, easeOutBack(k));
        dummy.scale.set(w * g, h * g, d * g);
        dummy.position.set((b.x0 + b.x1) / 2, b.y0 + (h * g) / 2, (b.z0 + b.z1) / 2);
      }
      if (k <= 0) dummy.position.set((b.x0 + b.x1) / 2, b.y0, (b.z0 + b.z1) / 2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    settled.current = t >= build.total;
  });

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    boxes.forEach((b, i) => {
      tint.setHex(b.color);
      if (highlight && b.room === highlight) tint.lerp(white, 0.2);
      if (picked != null && b.piece === picked) tint.lerp(white, 0.35);
      mesh.setColorAt(i, tint);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boxes, highlight, picked]);

  const roomOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.instanceId === undefined ? null : boxes[e.instanceId]?.room ?? null;
  const pieceOf = (e: ThreeEvent<PointerEvent>) => (e.instanceId === undefined ? undefined : boxes[e.instanceId]?.piece);

  return (
    <instancedMesh
      ref={ref}
      name={name}
      args={[undefined, undefined, boxes.length]}
      castShadow
      receiveShadow
      onPointerDown={
        onGrab
          ? (e) => {
              const piece = pieceOf(e);
              if (piece === undefined) return;
              e.stopPropagation();
              onGrab(piece);
            }
          : undefined
      }
      onPointerMove={
        onGrab
          ? (e) => {
              document.body.style.cursor = pieceOf(e) === undefined ? "" : "grab";
            }
          : interactive
            ? (e) => {
                e.stopPropagation();
                onHover?.(roomOf(e));
              }
            : undefined
      }
      onPointerOut={onGrab ? () => (document.body.style.cursor = "") : interactive ? () => onHover?.(null) : undefined}
      onClick={
        interactive && !onGrab
          ? (e) => {
              e.stopPropagation();
              if (e.delta > 6) return;
              onSelect?.(roomOf(e), e.point);
            }
          : undefined
      }
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.85} metalness={0} />
    </instancedMesh>
  );
}

const SNAP = 0.05;
const GOOD = new Color("#7fc48a");
const BAD = new Color("#e36b5b");
const BAD_TINT = new Color("#ffb0a3");
const ground = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();

function Dragging({
  home,
  index,
  onDrop,
}: {
  home: BuiltHome;
  index: number;
  onDrop: (p: Placement | null) => void;
}) {
  const p = home.furniture[index];
  const boxes = useMemo(() => pieceBoxes(p), [p]);
  const [fx0, fz0, fx1, fz1] = footprintOf(p);
  const group = useRef<Group>(null);
  const pad = useRef<Mesh>(null);
  const start = useRef<Vector3 | null>(null);
  const spot = useRef<Placement | null>(null);
  const drop = useRef(onDrop);
  useEffect(() => {
    drop.current = onDrop;
  });

  useEffect(() => {
    document.body.style.cursor = "grabbing";
    const up = () => drop.current(spot.current);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  useFrame(({ raycaster, pointer, camera }) => {
    ground.constant = -(FLOOR + (p.y ?? 0));
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(ground, hit)) return;
    if (!start.current) start.current = hit.clone();
    const dx = Math.round((hit.x - start.current.x) / SNAP) * SNAP;
    const dz = Math.round((hit.z - start.current.z) / SNAP) * SNAP;
    const seated = seat(home.plan, home.furniture, index, { ...p, x: p.x + dx, z: p.z + dz });
    spot.current = seated;
    const lift = seated ? (seated.y ?? 0) - (p.y ?? 0) : 0;
    group.current?.position.set(dx, lift + 0.06, dz);
    const ok = seated ? GOOD : BAD;
    (pad.current?.material as MeshBasicMaterial | undefined)?.color.copy(ok);
    const body = group.current?.children[0] as InstancedMesh | undefined;
    (body?.material as MeshStandardMaterial | undefined)?.color.copy(seated ? white : BAD_TINT);
  });

  return (
    <group ref={group}>
      <Boxes boxes={boxes} />
      <mesh ref={pad} rotation-x={-Math.PI / 2} position={[(fx0 + fx1) / 2, FLOOR + (p.y ?? 0) - 0.04, (fz0 + fz1) / 2]}>
        <planeGeometry args={[fx1 - fx0 + 0.1, fz1 - fz0 + 0.1]} />
        <meshBasicMaterial transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Rendered first so the build clock is updated before any Boxes reads it in the same frame.
function TapMark({ x, z, y, stamp }: { x: number; z: number; y: number; stamp: number }) {
  const ring = useRef<Mesh>(null);
  const disc = useRef<Mesh>(null);
  useFrame(() => {
    const t = (performance.now() - stamp) / 1000;
    const k = Math.min(1, t / 1.35);
    const ringMat = ring.current?.material as MeshBasicMaterial | undefined;
    const discMat = disc.current?.material as MeshBasicMaterial | undefined;
    if (ring.current) ring.current.scale.setScalar(0.55 + k * 1.1);
    if (ringMat) ringMat.opacity = (1 - k) * 0.85;
    if (discMat) discMat.opacity = Math.max(0, 0.55 - k * 0.25);
  });
  return (
    <group position={[x, y + 0.06, z]}>
      <mesh ref={disc} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.16, 24]} />
        <meshBasicMaterial color="#ff8a5b" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.14, 0.22, 28]} />
        <meshBasicMaterial color="#ff8a5b" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Tick({ fn }: { fn: (now: number) => void }) {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useFrame((state) => latest.current(state.clock.elapsedTime));
  return null;
}

function cameraDistance(extent: number, aspect: number) {
  return extent * 2.2 * Math.max(1, 1.15 / aspect);
}

const DEFAULT_DIR = new Vector3(18, 26, 18).normalize();
const PORTRAIT = 0.8;
const HALF_FOV = Math.tan((32 * Math.PI) / 360);

function framing(width: number, depth: number, aspect: number) {
  const extent = Math.max(width, depth);
  if (aspect >= PORTRAIT) return { dir: DEFAULT_DIR, dist: cameraDistance(extent, aspect) };
  const az = width <= depth ? 0.5 : Math.PI / 2 - 0.5;
  const elev = 0.98;
  const dir = new Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
  const w = width + 2.4;
  const d = depth + 2.4;
  const across = w * Math.cos(az) + d * Math.sin(az);
  const along = (w * Math.sin(az) + d * Math.cos(az)) * Math.sin(elev) + 2.3 * Math.cos(elev);
  const fit = Math.max(across / (2 * HALF_FOV * aspect), along / (2 * HALF_FOV));
  return { dir, dist: fit * 1.05 + extent * 0.3 };
}

type OrbitLike = { target: Vector3; update: () => void };

function CameraRig({ width, depth }: { width: number; depth: number }) {
  const { camera, size, controls } = useThree();
  const portrait = useRef<boolean | null>(null);
  const boot = useRef(0);
  const apply = (forceDir: boolean) => {
    if (size.width < 2 || size.height < 2) return;
    const aspect = size.width / size.height;
    const nowPortrait = aspect < PORTRAIT;
    const { dir, dist } = framing(width, depth, aspect);
    if (forceDir || portrait.current !== nowPortrait) {
      portrait.current = nowPortrait;
      camera.position.copy(dir);
    }
    camera.position.setLength(dist);
    camera.lookAt(0, 0.8, 0);
    camera.updateProjectionMatrix();
    const orbit = controls as OrbitLike | null;
    if (orbit?.target) {
      orbit.target.set(0, 0.8, 0);
      orbit.update();
    }
  };
  useLayoutEffect(() => {
    boot.current = 0;
    apply(false);
  }, [camera, controls, size.width, size.height, width, depth]);
  useFrame(() => {
    if (boot.current > 8) return;
    boot.current += 1;
    apply(boot.current <= 3);
  });
  return null;
}
const HOUSE = "house-boxes";
const camGoal = new Vector3();
const head = new Vector3();
const toCam = new Vector3();
const blocker = new Raycaster();
// Behind-the-shoulder first; if a wall is in the way, climb up and over it.
const EYE_RIGS = [
  [1.8, 3.5],
  [1.2, 4.1],
  [0.6, 4.7],
  [0.15, 5.3],
];
const lookGoal = new Vector3();
const catPos = new Vector3();

function FollowCam({
  target,
  following,
  eye,
  width,
  depth,
  onSettled,
}: {
  eye: boolean;
  target: RefObject<Group | null>;
  following: boolean;
  width: number;
  depth: number;
  onSettled: () => void;
}) {
  const { camera, size, scene } = useThree();
  const look = useRef(new Vector3(0, 0.8, 0));
  const returning = useRef(false);
  const wasFollowing = useRef(false);

  useFrame((_, dt) => {
    if (following !== wasFollowing.current) {
      returning.current = !following;
      wasFollowing.current = following;
    }
    const k = 1 - Math.exp(-dt * 2.6);
    const cat = target.current;
    if (following && cat) {
      cat.getWorldPosition(catPos);
      const h = cat.rotation.y;
      const fx = Math.cos(h);
      const fz = -Math.sin(h);
      const zoom = Math.max(1, 0.9 / (size.width / size.height));
      const house = eye ? scene.getObjectByName(HOUSE) : undefined;
      const rigs = house ? EYE_RIGS : [[5 * zoom, 6.5 * zoom]];
      head.set(catPos.x, catPos.y + 1.5, catPos.z);
      for (const [back, up] of rigs) {
        camGoal.set(catPos.x - fx * back, catPos.y + up, catPos.z - fz * back);
        if (!house) break;
        toCam.subVectors(camGoal, head);
        blocker.set(head, toCam.clone().normalize());
        blocker.far = toCam.length();
        if (!blocker.intersectObject(house, false).length) break;
      }
      const [ahead, lift] = eye ? [3.4, 0.15] : [1.5, 0];
      lookGoal.set(catPos.x + fx * ahead, catPos.y + lift, catPos.z + fz * ahead);
    } else if (returning.current) {
      const { dir, dist } = framing(width, depth, size.width / size.height);
      camGoal.copy(dir).multiplyScalar(dist);
      lookGoal.set(0, 0.8, 0);
      if (camera.position.distanceTo(camGoal) < 0.15) {
        returning.current = false;
        onSettled();
      }
    } else return;
    camera.position.lerp(camGoal, k);
    look.current.lerp(lookGoal, k);
    camera.lookAt(look.current);
  });
  return null;
}

export function HouseScene({
  layout,
  introMode,
  introRun,
  skipTick,
  interactive,
  hovered,
  selected,
  showCreatures,
  alerts,
  hour,
  battery,
  family,
  follow,
  camFree,
  onFollow,
  onCamSettled,
  onIntroDone,
  onHover,
  onSelect,
  furniture,
  decorating,
  picked,
  onPick,
  onPlace,
  visitor,
  eye,
  dest,
  onWalk,
}: {
  dest: { x: number; z: number; n: number } | null;
  onWalk?: (x: number, z: number) => void;
  visitor: Person | null;
  eye: boolean;
  furniture: Placement[] | null;
  decorating: boolean;
  picked: number | null;
  onPick: (piece: number | null) => void;
  onPlace: (piece: number, p: Placement) => void;
  alerts: Record<string, number>;
  hour: number;
  battery: number;
  family: Family;
  follow: number | null;
  camFree: boolean;
  onFollow: (cat: number) => void;
  onCamSettled: () => void;
  layout: Layout;
  introMode: IntroMode;
  introRun: number;
  skipTick: number;
  interactive: boolean;
  hovered: string | null;
  selected: string | null;
  showCreatures: boolean;
  onIntroDone: () => void;
  onHover: (room: string | null) => void;
  onSelect: (room: string | null) => void;
}) {
  const [lifted, setLifted] = useState<number | null>(null);
  const dragging = decorating ? lifted : null;
  const home = useMemo(() => buildHome(layout, furniture ?? undefined, dragging), [layout, furniture, dragging]);
  const getState = useThree((s) => s.get);
  const setOrbit = (on: boolean) => {
    const c = getState().controls as unknown as { enabled: boolean } | null;
    if (c) c.enabled = on;
  };
  const sky = useMemo(() => skyAt(hour), [hour]);
  const nestRoom =
    battery < LOW
      ? (home.rooms.find((r) => r.kind === "bedroom") ?? home.rooms.find((r) => r.kind === "living") ?? home.rooms[0])
      : null;
  const nest = useMemo(
    () => (nestRoom ? { x: nestRoom.x + nestRoom.w / 2, z: nestRoom.z + nestRoom.d / 2 } : null),
    [nestRoom],
  );
  const lampLevel = (id: string) =>
    !nestRoom ? sky.lamps : id === nestRoom.id ? Math.max(sky.lamps, 0.55) : sky.lamps * 0.3;
  const catsRef = useRef<(Group | null)[]>([]);
  const followRef = useRef<Group | null>(null);
  const guestRef = useRef<Group | null>(null);
  const guestGoal = useRef<Goal | null>(null);
  const mark = useMemo(() => {
    if (!dest || !visitor) return null;
    const floor = home.plan.floors.find((f) => dest.x >= f.x0 && dest.x <= f.x1 && dest.z >= f.z0 && dest.z <= f.z1);
    return { x: dest.x, z: dest.z, y: FLOOR + (floor?.elev ?? 0), n: dest.n };
  }, [dest, visitor, home.plan.floors]);
  const guest = useMemo(
    () =>
      visitor && {
        person: visitor,
        goal: () => guestGoal.current,
        register: (g: Group | null) => (guestRef.current = g),
      },
    [visitor],
  );
  useFrame(() => {
    followRef.current = follow !== null ? (catsRef.current[follow] ?? null) : eye ? guestRef.current : null;
    if (dest && visitor) guestGoal.current = { x: dest.x, z: dest.z, spread: 0.18 };
  });
  const overlays = interactive && follow === null && !decorating;
  const houseRef = useRef<Group>(null);
  const anim = useRef({ start: -1, built: -1, speed: 1, done: false, skip: false, run: -1, layout: layout.id });
  const build = useMemo(() => buildSchedule(home.boxes), [home.boxes]);
  const clock = useRef(0);
  const [builtKey, setBuiltKey] = useState<string | null>(null);
  const buildKey = `${introRun}:${layout.id}`;
  const extent = Math.max(home.width, home.depth);
  const { size } = useThree();

  useEffect(() => {
    if (skipTick > 0) anim.current.skip = true;
  }, [skipTick]);

  const tick = (now: number) => {
    const a = anim.current;
    if (a.run !== introRun) {
      Object.assign(a, { run: introRun, start: now, built: now, speed: TIMING[introMode].speed, done: false, skip: false });
      a.layout = layout.id;
    }
    if (a.layout !== layout.id) {
      Object.assign(a, { layout: layout.id, built: now, speed: TIMING.short.speed });
    }
    const portrait = size.width / Math.max(1, size.height) < PORTRAIT;
    const T = portrait
      ? { ...TIMING[introMode], from: Math.min(TIMING[introMode].from, 1.06), turns: TIMING[introMode].turns * 0.12 }
      : TIMING[introMode];
    clock.current = a.skip ? Infinity : (now - a.built) * a.speed;

    const e = a.skip ? 1 : easeOutCubic(clamp01((now - a.start) / T.spin));
    const house = houseRef.current;
    if (house) {
      house.scale.setScalar(T.from + (1 - T.from) * e);
      house.rotation.y = T.turns * Math.PI * (1 - e);
    }

    if (clock.current >= build.total && builtKey !== buildKey && a.layout === layout.id) setBuiltKey(buildKey);
    if (!a.done && clock.current >= build.total && e >= 1) {
      a.done = true;
      onIntroDone();
    }
  };

  const label = hovered ?? selected;
  const labelRoom = home.rooms.find((r) => r.id === label);

  return (
    <>
      <Tick fn={tick} />
      <color attach="background" args={[sky.bg]} />
      <ambientLight intensity={sky.ambient} />
      <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.hemi]} />
      <directionalLight
        position={sunPosition(hour)}
        intensity={sky.sunIntensity}
        color={sky.sun}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      <group ref={houseRef}>
        <group position={[-home.width / 2, 0, -home.depth / 2]}>
          <RoundedBox
            args={[home.width + 2.4, 0.7, home.depth + 2.4]}
            radius={0.3}
            smoothness={6}
            position={[home.width / 2, -0.35, home.depth / 2]}
            receiveShadow
            raycast={() => {}}
          >
            <meshStandardMaterial color="#c99d76" roughness={0.95} />
          </RoundedBox>

          <Boxes
            key={layout.id}
            name={HOUSE}
            boxes={home.boxes}
            build={build}
            clock={clock}
            highlight={decorating ? null : label}
            picked={decorating ? picked : null}
            interactive={interactive}
            onHover={onHover}
            onSelect={(room, point) => {
              if (guest && point) onWalk?.(point.x + home.width / 2, point.z + home.depth / 2);
              onSelect(room);
            }}
            onGrab={
              decorating
                ? (i) => {
                    setOrbit(false);
                    onPick(i);
                    setLifted(i);
                  }
                : undefined
            }
          />

          {dragging !== null && (
            <Dragging
              key={dragging}
              home={home}
              index={dragging}
              onDrop={(p) => {
                setLifted(null);
                setOrbit(true);
                if (p) onPlace(dragging, p);
              }}
            />
          )}


          {showCreatures && builtKey === buildKey && (
            <Creatures
              home={home}
              catsRef={catsRef}
              onPickCat={interactive ? onFollow : undefined}
              nest={interactive ? nest : null}
              battery={battery}
              family={family}
              visitor={guest}
            />
          )}

          {home.rooms.map((r) => (
            <pointLight
              key={`lamp-${layout.id}-${r.id}`}
              position={[r.x + r.w / 2, 1.9, r.z + r.d / 2]}
              color={r.id === nestRoom?.id ? "#ffad5c" : "#ffc27a"}
              intensity={lampLevel(r.id) * (3 + Math.min(r.w, r.d) * 1.6)}
              distance={Math.max(r.w, r.d) * 1.1 + 1}
              decay={1.6}
            />
          ))}

          {mark && visitor && <TapMark key={mark.n} x={mark.x} z={mark.z} y={mark.y} stamp={mark.n} />}

          {overlays &&
            home.rooms
              .filter((r) => alerts[r.id] > 0 && r.id !== label)
              .map((r) => (
                <Html
                  key={`alert-${layout.id}-${r.id}`}
                  position={[r.x + r.w / 2, 2.6, r.z + r.d / 2]}
                  center
                  zIndexRange={[0, 0]}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="room-alert">{alerts[r.id]}</div>
                </Html>
              ))}

          {overlays && labelRoom && (
            <Html
              position={[labelRoom.x + labelRoom.w / 2, 2.8, labelRoom.z + labelRoom.d / 2]}
              center
              zIndexRange={[0, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div className="room-pill">
                {labelRoom.name}
                {alerts[labelRoom.id] > 0 && <span className="ml-1.5 text-[#ff8a5b]">· {alerts[labelRoom.id]} 件快用完</span>}
              </div>
            </Html>
          )}
        </group>
      </group>

      <FollowCam target={followRef} following={follow !== null || eye} eye={follow === null && eye} width={home.width} depth={home.depth} onSettled={onCamSettled} />

      <OrbitControls
        makeDefault
        enabled={interactive && camFree && dragging === null}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        minPolarAngle={0.35}
        maxPolarAngle={1.12}
        minDistance={extent * 0.8}
        maxDistance={framing(home.width, home.depth, size.width / size.height).dist * 1.5}
        target={[0, 0.8, 0]}
      />
      <CameraRig width={home.width} depth={home.depth} />

      <EffectComposer multisampling={0}>
        <N8AO aoRadius={0.6} distanceFalloff={0.6} intensity={2.2} color="#5a3e2b" quality="high" />
        <SMAA />
      </EffectComposer>
    </>
  );
}
