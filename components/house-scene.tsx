"use client";

import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { Color, Object3D, Vector3, type Group, type InstancedMesh } from "three";
import { LOW } from "@/lib/battery";
import { skyAt, sunPosition } from "@/lib/daylight";
import { buildHome, type Box, type Layout } from "@/lib/home";
import { Creatures } from "./creatures";

export type IntroMode = "full" | "short";

const TIMING: Record<IntroMode, { spin: number; roofStart: number; roofEnd: number; from: number; turns: number }> = {
  full: { spin: 2.4, roofStart: 2.55, roofEnd: 3.35, from: 3.4, turns: -2.25 },
  short: { spin: 0.8, roofStart: 0.75, roofEnd: 1.35, from: 1.25, turns: -0.18 },
};
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t ** 3;
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

const dummy = new Object3D();
const white = new Color("#ffffff");
const tint = new Color();

function Boxes({
  boxes,
  highlight,
  interactive,
  onHover,
  onSelect,
}: {
  boxes: Box[];
  highlight?: string | null;
  interactive?: boolean;
  onHover?: (room: string | null) => void;
  onSelect?: (room: string | null) => void;
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
      if (highlight && b.room === highlight) tint.lerp(white, 0.2);
      mesh.setColorAt(i, tint);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boxes, highlight]);

  const roomOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.instanceId === undefined ? null : boxes[e.instanceId]?.room ?? null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, boxes.length]}
      castShadow
      receiveShadow
      onPointerMove={
        interactive
          ? (e) => {
              e.stopPropagation();
              onHover?.(roomOf(e));
            }
          : undefined
      }
      onPointerOut={interactive ? () => onHover?.(null) : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              if (e.delta > 6) return;
              onSelect?.(roomOf(e));
            }
          : undefined
      }
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.85} metalness={0} />
    </instancedMesh>
  );
}

function cameraDistance(extent: number, aspect: number) {
  return extent * 2.2 * Math.max(1, 1.15 / aspect);
}

function CameraRig({ extent }: { extent: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.setLength(cameraDistance(extent, size.width / size.height));
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, extent]);
  return null;
}

const DEFAULT_DIR = new Vector3(18, 26, 18).normalize();
const camGoal = new Vector3();
const lookGoal = new Vector3();
const catPos = new Vector3();

function FollowCam({
  target,
  following,
  extent,
  onSettled,
}: {
  target: RefObject<Group | null>;
  following: boolean;
  extent: number;
  onSettled: () => void;
}) {
  const { camera, size } = useThree();
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
      camGoal.set(catPos.x - fx * 5 * zoom, catPos.y + 6.5 * zoom, catPos.z - fz * 5 * zoom);
      lookGoal.set(catPos.x + fx * 1.5, catPos.y, catPos.z + fz * 1.5);
    } else if (returning.current) {
      camGoal.copy(DEFAULT_DIR).multiplyScalar(cameraDistance(extent, size.width / size.height));
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
  follow,
  camFree,
  onFollow,
  onCamSettled,
  onIntroDone,
  onHover,
  onSelect,
}: {
  alerts: Record<string, number>;
  hour: number;
  battery: number;
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
  const home = useMemo(() => buildHome(layout), [layout]);
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
  useFrame(() => {
    followRef.current = follow === null ? null : (catsRef.current[follow] ?? null);
  });
  const overlays = interactive && follow === null;
  const houseRef = useRef<Group>(null);
  const roofRef = useRef<Group>(null);
  const anim = useRef({ start: -1, done: false, skip: false, run: -1, pop: -1, layout: layout.id });
  const extent = Math.max(home.width, home.depth);
  const { size } = useThree();

  useEffect(() => {
    if (skipTick > 0) anim.current.skip = true;
  }, [skipTick]);

  useFrame((state) => {
    const a = anim.current;
    const now = state.clock.elapsedTime;
    if (a.run !== introRun) {
      Object.assign(a, { run: introRun, start: now, done: false, skip: false, pop: -1, layout: layout.id });
    }
    if (a.layout !== layout.id) {
      a.layout = layout.id;
      a.pop = now;
    }
    const T = TIMING[introMode];
    const t = a.skip ? T.roofEnd : now - a.start;

    const e = easeOutCubic(clamp01(t / T.spin));
    const pop = a.pop < 0 ? 1 : 0.55 + 0.45 * easeOutBack(clamp01((now - a.pop) / 0.6));
    const house = houseRef.current;
    if (house) {
      house.scale.setScalar((T.from + (1 - T.from) * e) * pop);
      house.rotation.y = T.turns * Math.PI * (1 - e);
    }

    const r = clamp01((t - T.roofStart) / (T.roofEnd - T.roofStart));
    if (roofRef.current) {
      roofRef.current.position.y = easeInCubic(r) * 40;
      roofRef.current.visible = r < 1;
    }

    if (!a.done && t >= T.roofEnd) {
      a.done = true;
      onIntroDone();
    }
  });

  const label = hovered ?? selected;
  const labelRoom = home.rooms.find((r) => r.id === label);

  return (
    <>
      <color attach="background" args={[sky.bg]} />
      <CameraRig extent={extent} />
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
          >
            <meshStandardMaterial color="#c99d76" roughness={0.95} />
          </RoundedBox>

          <Boxes
            key={layout.id}
            boxes={home.boxes}
            highlight={label}
            interactive={interactive}
            onHover={onHover}
            onSelect={onSelect}
          />

          <group ref={roofRef}>
            <Boxes key={`roof-${layout.id}`} boxes={home.roof} />
          </group>

          {showCreatures && (
            <Creatures
              home={home}
              catsRef={catsRef}
              onPickCat={interactive ? onFollow : undefined}
              nest={interactive ? nest : null}
              battery={battery}
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

      <FollowCam target={followRef} following={follow !== null} extent={extent} onSettled={onCamSettled} />

      <OrbitControls
        enabled={interactive && camFree}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        minPolarAngle={0.35}
        maxPolarAngle={1.12}
        minDistance={extent * 0.8}
        maxDistance={cameraDistance(extent, size.width / size.height) * 1.5}
        target={[0, 0.8, 0]}
      />

      <EffectComposer multisampling={0}>
        <N8AO aoRadius={0.6} distanceFalloff={0.6} intensity={2.2} color="#5a3e2b" quality="high" />
        <SMAA />
      </EffectComposer>
    </>
  );
}
