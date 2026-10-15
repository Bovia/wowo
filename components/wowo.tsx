"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Layout } from "@/lib/home";
import { Ambience, SOUND_FOR, SOUND_NAME, type Sound } from "@/lib/ambience";
import {
  applyEvent,
  batteryColor,
  CHARGES,
  DRAINS,
  hoursToFull,
  levelAt,
  loadBattery,
  LOW,
  moodFor,
  saveBattery,
  setLevel,
  type Battery,
} from "@/lib/battery";
import { formatHour, nowHour, skyAt } from "@/lib/daylight";
import { colorFor, itemsFor, loadInventory, newId, roomKey, saveInventory, type InvItem, type Inventory } from "@/lib/inventory";
import { loadFamily, saveFamily, type Family } from "@/lib/family";
import { DEMOS, DEMO_ROOMS, TEMPLATES } from "@/lib/layouts";
import {
  capturePhoto,
  captionFor,
  loadAlbum,
  renderPolaroid,
  saveAlbum,
  shutterSound,
  stampFor,
  type Snap,
} from "@/lib/polaroid";
import { scanToLayout, type Scan } from "@/lib/scan";
import { FamilyEditor } from "./family-editor";
import { HouseScene, type IntroMode } from "./house-scene";

const SEEN_KEY = "wowo:intro-seen";
const MINE_KEY = "wowo:my-layout";
const SCAN_KEY = "wowo:my-scan";

function loadScan(): Scan | null {
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    return raw ? (JSON.parse(raw) as Scan) : null;
  } catch {
    return null;
  }
}

function safeLayout(scan: Scan | null) {
  if (!scan) return null;
  try {
    return scanToLayout(scan);
  } catch {
    return null;
  }
}

type View = string;

const CAPTIONS: Record<string, string> = {
  demo: "这是别人家的样板间。点点房间看看。",
  demo2: "照着你给的户型图搭的。地台、落地窗、入户门都在，点点房间看看。",
};

export default function Wowo() {
  const [introMode, setIntroMode] = useState<IntroMode>(() =>
    localStorage.getItem(SEEN_KEY) ? "short" : "full",
  );
  const [introRun, setIntroRun] = useState(0);
  const [skipTick, setSkipTick] = useState(0);
  const [phase, setPhase] = useState<"intro" | "home">("intro");
  const [mineId, setMineId] = useState<string | null>(() => localStorage.getItem(MINE_KEY));
  const [view, setView] = useState<View>(DEMOS[0].id);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [scan, setScan] = useState<Scan | null>(loadScan);
  const scanned = useMemo(() => safeLayout(scan), [scan]);
  const mine = scanned ?? TEMPLATES.find((t) => t.id === mineId) ?? null;
  const layout = (view === "mine" && mine) || DEMOS.find((d) => d.id === view) || DEMOS[0];
  const views = [...DEMOS.map((d) => ({ id: d.id, name: d.name })), ...(mine ? [{ id: "mine", name: "我的窝" }] : [])];
  const interactive = phase === "home";
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  useEffect(() => {
    document.body.style.cursor = interactive && hovered ? "pointer" : "";
  }, [interactive, hovered]);

  const replay = () => {
    setSelected(null);
    setHovered(null);
    setIntroMode("full");
    setPhase("intro");
    setIntroRun((n) => n + 1);
  };

  const showMine = () => {
    setView("mine");
    setSelected(null);
    setHovered(null);
    setUploadOpen(false);
  };

  const chooseTemplate = (t: Layout) => {
    localStorage.setItem(MINE_KEY, t.id);
    localStorage.removeItem(SCAN_KEY);
    setMineId(t.id);
    setScan(null);
    showMine();
  };

  const chooseScan = (s: Scan) => {
    localStorage.setItem(SCAN_KEY, JSON.stringify(s));
    setScan(s);
    showMine();
  };

  const switchView = (v: View) => {
    setView(v);
    setFollow(null);
    setSelected(null);
    setHovered(null);
  };

  const [inventory, setInventory] = useState<Inventory>(loadInventory);
  const setRoomItems = (room: string, items: InvItem[]) => {
    const next = { ...inventory, [roomKey(layout, room)]: items };
    setInventory(next);
    saveInventory(next);
  };
  const alerts = useMemo(
    () =>
      Object.fromEntries(
        layout.rooms.map((r) => [r.id, itemsFor(inventory, layout, r.id).filter((it) => it.warn).length]),
      ),
    [inventory, layout],
  );

  const selectedRoom = layout.rooms.find((r) => r.id === selected) ?? null;

  const [realHour, setRealHour] = useState(nowHour);
  const [hourOverride, setHourOverride] = useState<number | null>(null);
  const [clockOpen, setClockOpen] = useState(false);
  const hour = hourOverride ?? realHour;
  const night = skyAt(hour).night;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setRealHour(nowHour());
      setNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const [battery, setBattery] = useState<Battery>(loadBattery);
  const [batteryOpen, setBatteryOpen] = useState(false);
  const level = levelAt(battery, now);
  const updateBattery = (next: (b: Battery, t: number) => Battery) => {
    const t = Date.now();
    const b = next(battery, t);
    setNow(t);
    setBattery(b);
    saveBattery(b);
  };

  const [follow, setFollow] = useState<number | null>(null);
  const [family, setFamily] = useState<Family>(loadFamily);
  const [familyOpen, setFamilyOpen] = useState(false);
  const catNames = family.cats.map((c) => c.name || "猫");
  const updateFamily = (f: Family) => {
    setFamily(f);
    saveFamily(f);
    if (follow !== null && follow >= f.cats.length) setFollow(null);
  };
  const [camFree, setCamFree] = useState(true);
  const startFollow = (cat: number) => {
    setFollow(cat);
    setCamFree(false);
    setSelected(null);
    setHovered(null);
  };

  const [ambience] = useState(() => new Ambience());
  const [soundOn, setSoundOn] = useState(false);
  const sound: Sound = selectedRoom ? SOUND_FOR[selectedRoom.kind] : night ? "crickets" : "rain";

  useEffect(() => {
    if (soundOn) ambience.play(sound);
    else ambience.stop();
  }, [ambience, soundOn, sound]);

  useEffect(() => () => ambience.stop(), [ambience]);

  const glCanvas = useRef<HTMLCanvasElement | null>(null);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(0), 600);
    return () => window.clearTimeout(id);
  }, [flash]);
  const [snap, setSnap] = useState<{ snap: Snap; fresh: boolean } | null>(null);
  const [album, setAlbum] = useState<Snap[]>(loadAlbum);
  const [albumOpen, setAlbumOpen] = useState(false);

  const takePhoto = () => {
    if (!glCanvas.current) return;
    const photo = capturePhoto(glCanvas.current);
    let running: { room: string; item: string } | undefined;
    for (const r of layout.rooms) {
      const it = itemsFor(inventory, layout, r.id).find((i) => i.warn);
      if (it) {
        running = { room: r.name, item: it.name };
        break;
      }
    }
    shutterSound();
    setFlash(Date.now());
    setAlbumOpen(false);
    setSnap({
      fresh: true,
      snap: {
        id: newId(),
        photo,
        at: Date.now(),
        stamp: stampFor(hour),
        caption: captionFor({
          hour,
          home: layout.demo ? layout.name : "我的窝",
          cat: follow !== null ? catNames[follow] : undefined,
          room: selectedRoom?.name,
          running,
          charging: level < LOW,
        }),
      },
    });
  };

  const keepSnap = (s: Snap) => {
    setAlbum(saveAlbum([s, ...album.filter((a) => a.id !== s.id)]));
    setSnap(null);
  };

  const dropSnap = (id: string) => {
    setAlbum(saveAlbum(album.filter((a) => a.id !== id)));
    setSnap(null);
  };

  return (
    <div className={`wowo-bg relative h-dvh w-full overflow-hidden select-none ${night ? "is-night" : ""}`}>
      <Canvas
        shadows
        flat
        dpr={[1, 2]}
        camera={{ position: [18, 26, 18], fov: 32 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          glCanvas.current = gl.domElement;
        }}
        onPointerMissed={() => {
          setBatteryOpen(false);
          setClockOpen(false);
          setAlbumOpen(false);
          if (follow === null) setSelected(null);
        }}
      >
        <HouseScene
          layout={layout}
          introMode={introMode}
          introRun={introRun}
          skipTick={skipTick}
          interactive={interactive}
          hovered={interactive ? hovered : null}
          selected={selected}
          showCreatures
          alerts={alerts}
          hour={hour}
          battery={level}
          family={family}
          follow={follow}
          camFree={camFree}
          onFollow={startFollow}
          onCamSettled={() => setCamFree(true)}
          onIntroDone={() => {
            localStorage.setItem(SEEN_KEY, "1");
            setPhase("home");
          }}
          onHover={setHovered}
          onSelect={setSelected}
        />
      </Canvas>

      {phase === "intro" && (
        <>
          {introMode === "full" && (
            <div key={introRun} className="welcome pointer-events-none absolute inset-x-0 top-[14%] text-center">
              <p className="text-4xl font-extrabold tracking-[0.3em] text-[#6b4a35] sm:text-5xl">
                欢迎来到窝窝
              </p>
            </div>
          )}
          <button
            onClick={() => setSkipTick((n) => n + 1)}
            className="absolute right-5 bottom-6 rounded-full px-4 py-2 text-sm text-[#8b6b55]/80 transition hover:text-[#6b4a35]"
          >
            跳过
          </button>
        </>
      )}

      {phase === "home" && (
        <>
          <div className="fade-in pointer-events-none absolute inset-x-0 top-0 grid items-start gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:grid-cols-[1fr_auto] sm:grid-rows-[auto_1fr] sm:gap-x-4 sm:gap-y-3 sm:p-5">
            <header
              className={`flex items-center gap-3 transition-opacity sm:col-start-1 sm:row-start-1 ${follow !== null ? "opacity-0" : "pointer-events-auto"}`}
            >
              <span className="ink text-2xl font-extrabold tracking-widest text-[#6b4a35]">窝窝</span>
              <div className="flex rounded-full bg-white/70 p-1 text-sm shadow-sm backdrop-blur">
                {views.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => switchView(v.id)}
                    className={`rounded-full px-3 py-1 transition ${
                      layout.id === (v.id === "mine" ? mine?.id : v.id) ? "bg-[#6b4a35] text-white" : "text-[#8b6b55]"
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </header>

            <div className="pointer-events-none flex min-w-0 flex-col items-stretch gap-2 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:items-end">
            <div className="no-scrollbar pointer-events-auto -mx-4 -my-1 flex py-1 items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:gap-2 sm:overflow-visible sm:px-0 [&>button]:shrink-0 [&>button]:whitespace-nowrap">
              <button
                onClick={() => {
                  setBatteryOpen((o) => !o);
                  setClockOpen(false);
                  setAlbumOpen(false);
                }}
                aria-label={`i 人电量 ${Math.round(level)}%`}
                className="flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1.5 text-[13px] sm:px-3 sm:text-sm font-semibold text-[#6b4a35] shadow-sm backdrop-blur transition hover:bg-white"
              >
                <BatteryIcon level={level} />
                {Math.round(level)}%
              </button>
              <button
                onClick={() => {
                  setClockOpen((o) => !o);
                  setBatteryOpen(false);
                  setAlbumOpen(false);
                }}
                className="rounded-full bg-white/75 px-2.5 py-1.5 text-[13px] sm:px-3 sm:text-sm font-semibold text-[#6b4a35] shadow-sm backdrop-blur transition hover:bg-white"
              >
                {night ? "☾" : "☀"} {formatHour(hour)}
                {hourOverride !== null && <span className="ml-1 text-xs font-normal text-[#ff8a5b]">调过</span>}
              </button>
              <button
                onClick={() => setSoundOn((s) => !s)}
                aria-pressed={soundOn}
                className={`rounded-full px-2.5 py-1.5 text-[13px] shadow-sm sm:px-3 sm:text-sm backdrop-blur transition ${
                  soundOn ? "bg-[#6b4a35] text-white" : "bg-white/75 text-[#8b6b55] hover:bg-white"
                }`}
              >
                {soundOn ? `♪ ${SOUND_NAME[sound]}` : "♪ 声音"}
              </button>
              <button
                onClick={() => (follow === null ? startFollow(0) : setFollow(null))}
                aria-pressed={follow !== null}
                className={`rounded-full px-2.5 py-1.5 text-[13px] shadow-sm sm:px-3 sm:text-sm backdrop-blur transition ${
                  follow !== null ? "bg-[#6b4a35] text-white" : "bg-white/75 text-[#8b6b55] hover:bg-white"
                }`}
              >
                跟着猫走
              </button>
              <button
                onClick={takePhoto}
                className="rounded-full bg-[#ff8a5b] px-2.5 py-1.5 text-[13px] font-semibold sm:px-3 sm:text-sm text-white shadow-[0_3px_0_#d9673d] transition active:translate-y-0.5 active:shadow-[0_1px_0_#d9673d]"
              >
                拍一张
              </button>
              <button
                onClick={() => {
                  setFamilyOpen(true);
                  setSelected(null);
                  setBatteryOpen(false);
                  setClockOpen(false);
                  setAlbumOpen(false);
                }}
                className="rounded-full bg-white/75 px-2.5 py-1.5 text-[13px] text-[#8b6b55] shadow-sm backdrop-blur transition hover:bg-white sm:px-3 sm:text-sm"
              >
                家里人
              </button>
              {album.length > 0 && (
                <button
                  onClick={() => {
                    setSnap(null);
                    setAlbumOpen((o) => !o);
                    setBatteryOpen(false);
                    setClockOpen(false);
                  }}
                  className="rounded-full bg-white/75 px-2.5 py-1.5 text-[13px] text-[#8b6b55] shadow-sm backdrop-blur sm:hidden"
                >
                  相册 {album.length}
                </button>
              )}
            </div>
            {batteryOpen && (
              <BatteryPanel
                level={level}
                battery={battery}
                onEvent={(label, delta) => updateBattery((b, t) => applyEvent(b, t, label, delta))}
                onSet={(v) => updateBattery((b, t) => setLevel(b, t, v))}
                onClose={() => setBatteryOpen(false)}
              />
            )}
            {albumOpen && (
              <Album
                album={album}
                onOpen={(s) => {
                  setAlbumOpen(false);
                  setSnap({ snap: s, fresh: false });
                }}
                onClose={() => setAlbumOpen(false)}
              />
            )}
            {clockOpen && (
              <div className="card-pop pointer-events-auto rounded-2xl bg-[#fffaf2]/95 p-3 shadow-[0_10px_30px_rgba(107,74,53,0.18)] backdrop-blur sm:w-64">
                <input
                  type="range"
                  min={0}
                  max={23.99}
                  step={0.25}
                  value={hour}
                  onChange={(e) => setHourOverride(Number(e.target.value))}
                  className="w-full accent-[#ff8a5b]"
                  aria-label="调整窝里的时间"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-[#a2866f]">
                  <span>拖一拖，看看窝里的一天</span>
                  <button
                    onClick={() => setHourOverride(null)}
                    disabled={hourOverride === null}
                    className="font-semibold text-[#ff8a5b] disabled:text-[#c4ab95]"
                  >
                    回到现在
                  </button>
                </div>
              </div>
            )}
            <div className="pointer-events-auto hidden items-center justify-end gap-1 sm:flex">
              {album.length > 0 && (
                <button
                  onClick={() => {
                    setSnap(null);
                    setAlbumOpen((o) => !o);
                  }}
                  className="ink-soft rounded-full px-3 py-1 text-xs text-[#8b6b55] transition hover:text-[#6b4a35]"
                >
                  相册 · {album.length}
                </button>
              )}
              <button
                onClick={replay}
                className="ink-soft rounded-full px-3 py-1 text-xs text-[#8b6b55]/70 transition hover:text-[#6b4a35]"
              >
                重播开场
              </button>
            </div>
            </div>

            <p
              className={`ink-soft max-w-[17rem] text-xs leading-relaxed text-[#8b6b55] transition-opacity sm:col-start-1 sm:row-start-2 sm:text-sm ${
                follow !== null ? "opacity-0" : batteryOpen || clockOpen || albumOpen ? "max-sm:opacity-0" : ""
              }`}
            >
              {layout.demo
                ? CAPTIONS[layout.id]
                : "我理解的你家是这样的。不对也没关系，以后直接说一句「厨房在左边」就能改。"}
            </p>
          </div>

          <p className="ink-soft fade-in pointer-events-none absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-[#8b6b55]/60">
            {follow !== null ? "镜头会跟着它溜达" : touch ? "单指旋转 · 双指缩放 · 点房间或小猫看看" : "拖动旋转 · 滚轮缩放 · 点房间或小猫看看"}
          </p>

          <div
            className={`fade-in absolute right-6 bottom-20 flex items-center gap-3 transition-opacity sm:right-[12%] sm:bottom-[22%] ${follow !== null ? "pointer-events-none opacity-0" : ""}`}
          >
            <span className="plus-label rounded-full bg-white/80 px-3 py-1.5 text-sm text-[#6b4a35] shadow-sm backdrop-blur">
              {mine ? "换一张户型图" : "上传你家的户型图"}
            </span>
            <button
              aria-label="上传户型图"
              onClick={() => {
                setSelected(null);
                setUploadOpen(true);
              }}
              className={`plus-btn relative grid h-14 w-14 place-items-center rounded-2xl bg-[#ff8a5b] shadow-[0_6px_0_#d9673d] transition active:translate-y-1 active:shadow-[0_2px_0_#d9673d] ${
                mine ? "" : "plus-pulse"
              }`}
            >
              <span className="absolute h-1.5 w-7 rounded-sm bg-white" />
              <span className="absolute h-7 w-1.5 rounded-sm bg-white" />
            </button>
          </div>

          {follow !== null && (
            <div className="card-pop absolute inset-x-0 bottom-14 mx-auto flex w-fit items-center gap-2 rounded-full bg-[#fffaf2]/95 p-1.5 pl-4 shadow-[0_10px_30px_rgba(107,74,53,0.18)] backdrop-blur">
              <span className="text-sm text-[#6b4a35]">
                正在跟着 <b>{catNames[follow]}</b>
              </span>
              <button
                onClick={() => setFollow((f) => ((f ?? 0) + 1) % catNames.length)}
                className="rounded-full bg-[#f6ecdf] px-3 py-1.5 text-xs font-semibold text-[#8b6b55] transition hover:bg-[#efe1cc]"
              >
                换一只
              </button>
              <button
                onClick={() => setFollow(null)}
                className="rounded-full bg-[#6b4a35] px-3 py-1.5 text-xs font-semibold text-white"
              >
                下来吧
              </button>
            </div>
          )}

          {selectedRoom && (
            <RoomCard
              key={`${layout.id}-${selectedRoom.id}`}
              name={selectedRoom.name}
              note={layout.demo ? DEMO_ROOMS[selectedRoom.id]?.note : undefined}
              items={itemsFor(inventory, layout, selectedRoom.id)}
              onChange={(items) => setRoomItems(selectedRoom.id, items)}
              onClose={() => setSelected(null)}
            />
          )}

          {uploadOpen && (
            <UploadPanel onClose={() => setUploadOpen(false)} onChoose={chooseTemplate} onScan={chooseScan} />
          )}

          {familyOpen && <FamilyEditor family={family} onChange={updateFamily} onClose={() => setFamilyOpen(false)} />}

          {snap && (
            <PolaroidCard
              key={snap.snap.id}
              snap={snap.snap}
              fresh={snap.fresh}
              onKeep={keepSnap}
              onDrop={() => (snap.fresh ? setSnap(null) : dropSnap(snap.snap.id))}
              onClose={() => setSnap(null)}
            />
          )}
        </>
      )}

      {flash > 0 && <div key={flash} className="shutter-flash pointer-events-none absolute inset-0 bg-white" />}
    </div>
  );
}

function BatteryIcon({ level }: { level: number }) {
  return (
    <span className="relative inline-flex h-3 w-6 items-center rounded-[3px] border-2 border-current p-px after:absolute after:-right-[4px] after:h-1.5 after:w-[2px] after:rounded-r-sm after:bg-current">
      <span
        className={`h-full rounded-[1px] transition-[width] duration-500 ${level < LOW ? "battery-low" : ""}`}
        style={{ width: `${Math.max(8, level)}%`, background: batteryColor(level) }}
      />
    </span>
  );
}

function BatteryPanel({
  level,
  battery,
  onEvent,
  onSet,
  onClose,
}: {
  level: number;
  battery: Battery;
  onEvent: (label: string, delta: number) => void;
  onSet: (level: number) => void;
  onClose: () => void;
}) {
  const today = new Date(battery.at).toDateString();
  const log = battery.log.filter((e) => new Date(e.at).toDateString() === today);
  const spent = -log.reduce((sum, e) => sum + Math.min(0, e.delta), 0);
  const toFull = hoursToFull(level);
  const chip = "rounded-full px-2.5 py-1 text-xs font-semibold transition active:scale-95";

  return (
    <div className="card-pop pointer-events-auto max-h-[70dvh] overflow-y-auto rounded-2xl bg-[#fffaf2]/95 p-4 shadow-[0_10px_30px_rgba(107,74,53,0.18)] backdrop-blur sm:w-72">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-[#6b4a35]">i 人电量</span>
        <span className="ml-auto text-2xl font-extrabold" style={{ color: batteryColor(level) }}>
          {Math.round(level)}%
        </span>
        <button onClick={onClose} aria-label="关闭" className="-mr-1 px-1 text-xl leading-none text-[#b39580] hover:text-[#6b4a35]">
          ×
        </button>
      </div>
      <p className="mt-1 text-sm text-[#8b6b55]">{moodFor(level)}</p>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(level)}
        onChange={(e) => onSet(Number(e.target.value))}
        className="mt-3 w-full"
        style={{ accentColor: batteryColor(level) }}
        aria-label="手动调电量"
      />
      <p className="text-[11px] text-[#a2866f]">
        {toFull < 0.05 ? "满电了" : `待在窝里会慢慢回电，大约 ${toFull < 1 ? `${Math.round(toFull * 60)} 分钟` : `${toFull.toFixed(1)} 小时`}充满`}
      </p>

      <div className="mt-3 text-xs font-semibold text-[#a2866f]">刚才去干嘛了</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {DRAINS.map((d) => (
          <button key={d.label} onClick={() => onEvent(d.label, d.delta)} className={`${chip} bg-[#fbe3d6] text-[#c25a33] hover:bg-[#f8d4c1]`}>
            {d.label} {d.delta}
          </button>
        ))}
      </div>
      <div className="mt-3 text-xs font-semibold text-[#a2866f]">回窝充电</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {CHARGES.map((c) => (
          <button key={c.label} onClick={() => onEvent(c.label, c.delta)} className={`${chip} bg-[#e2f0dc] text-[#4f8a49] hover:bg-[#d4e9cc]`}>
            {c.label} +{c.delta}
          </button>
        ))}
      </div>

      {log.length > 0 && (
        <div className="mt-3 border-t border-[#efe1cc] pt-2 text-[11px] leading-relaxed text-[#a2866f]">
          今天社交花掉 <b className="text-[#c25a33]">{spent}%</b>：{log.map((e) => `${e.label}${e.delta > 0 ? "+" : ""}${e.delta}`).join(" · ")}
        </div>
      )}
      <p className="mt-2 text-[11px] text-[#c4ab95]">低于 {LOW}% 时你会自己回卧室窝着，猫会过来陪你</p>
    </div>
  );
}

function PolaroidCard({
  snap,
  fresh,
  onKeep,
  onDrop,
  onClose,
}: {
  snap: Snap;
  fresh: boolean;
  onKeep: (s: Snap) => void;
  onDrop: () => void;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState(snap.caption);
  const [busy, setBusy] = useState(false);
  const current = { ...snap, caption: caption.trim() || snap.caption };
  const fileName = `窝窝-${new Date(snap.at).toISOString().slice(0, 10)}.png`;

  const download = async () => {
    setBusy(true);
    try {
      const url = URL.createObjectURL(await renderPolaroid(current));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(false);
    }
  };

  const [canShare] = useState(() => typeof navigator.share === "function" && typeof navigator.canShare === "function");
  const share = async () => {
    setBusy(true);
    try {
      const file = new File([await renderPolaroid(current)], fileName, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: current.caption });
      else await download();
    } catch (err) {
      if ((err as Error).name !== "AbortError") await download();
    } finally {
      setBusy(false);
    }
  };

  const btn = "rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

  return (
    <div className="fade-in absolute inset-0 grid place-items-center bg-[#6b4a35]/25 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="flex flex-col items-center gap-5" onClick={(e) => e.stopPropagation()}>
        <div className={`${fresh ? "polaroid-eject" : "card-pop"} w-[min(78vw,20rem)] -rotate-2 bg-[#fffdf8] p-3.5 pb-0 shadow-[0_20px_50px_rgba(60,40,25,0.35)]`}>
          <div className="relative aspect-square overflow-hidden bg-[#2b2019]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={snap.photo} alt={current.caption} className={`h-full w-full ${fresh ? "polaroid-develop" : ""}`} />
            <span className="photo-stamp absolute right-2.5 bottom-2 font-mono text-[11px] font-semibold">{snap.stamp}</span>
          </div>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={24}
            aria-label="照片上的字"
            className="polaroid-caption block w-full bg-transparent py-5 text-center text-xl text-[#5c3f2d] outline-none"
          />
        </div>
        <p className="text-xs text-white/85">点照片下面的字可以改</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={onDrop} className={`${btn} bg-white/80 text-[#8b6b55]`}>
            {fresh ? "不要了" : "删掉"}
          </button>
          <button onClick={download} disabled={busy} className={`${btn} bg-white/90 text-[#6b4a35]`}>
            下载
          </button>
          {canShare && (
            <button onClick={share} disabled={busy} className={`${btn} bg-white/90 text-[#6b4a35]`}>
              分享
            </button>
          )}
          <button onClick={() => onKeep(current)} className={`${btn} bg-[#6b4a35] text-white`}>
            {fresh ? "收进相册" : "好了"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Album({ album, onOpen, onClose }: { album: Snap[]; onOpen: (s: Snap) => void; onClose: () => void }) {
  return (
    <div className="card-pop pointer-events-auto max-h-[60dvh] overflow-y-auto rounded-3xl bg-[#fffaf2]/95 p-4 shadow-[0_10px_30px_rgba(107,74,53,0.18)] backdrop-blur sm:w-[22rem]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-[#6b4a35]">
          窝窝相册<span className="ml-2 text-xs font-normal text-[#b39580]">最多留 12 张</span>
        </h2>
        <button onClick={onClose} aria-label="关闭" className="px-1 text-xl leading-none text-[#b39580] hover:text-[#6b4a35]">
          ×
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {album.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onOpen(s)}
            title={s.caption}
            className="bg-white p-1 pb-3 shadow-[0_3px_8px_rgba(107,74,53,0.2)] transition hover:-translate-y-0.5"
            style={{ rotate: `${((i * 37) % 7) - 3}deg` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.photo} alt={s.caption} className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function RoomCard({
  name,
  note,
  items,
  onChange,
  onClose,
}: {
  name: string;
  note?: string;
  items: InvItem[];
  onChange: (items: InvItem[]) => void;
  onClose: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", note: "", count: "" });
  const current = items.find((it) => it.id === active) ?? null;

  const update = (id: string, patch: Partial<InvItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const add = () => {
    const itemName = draft.name.trim();
    if (!itemName) return;
    const count = Number.parseInt(draft.count, 10);
    onChange([
      ...items,
      {
        id: newId(),
        name: itemName,
        note: draft.note.trim() || undefined,
        count: Number.isFinite(count) && count > 0 ? count : undefined,
        color: colorFor(itemName),
      },
    ]);
    setDraft({ name: "", note: "", count: "" });
    setAdding(false);
  };

  const step = (it: InvItem, delta: number) => {
    const count = Math.max(0, (it.count ?? 1) + delta);
    update(it.id, { count, warn: count === 0 ? true : it.warn });
  };

  const field =
    "w-full rounded-xl border-2 border-[#efe1cc] bg-white px-3 py-1.5 text-base text-[#6b4a35] outline-none sm:text-sm placeholder:text-[#c4ab95] focus:border-[#ff8a5b]";
  const chip = "rounded-full px-3 py-1 text-xs font-semibold transition";

  return (
    <div className="card-pop absolute inset-x-4 bottom-14 max-h-[70dvh] overflow-y-auto rounded-3xl bg-[#fffaf2]/95 p-5 shadow-[0_10px_30px_rgba(107,74,53,0.18)] backdrop-blur select-text sm:inset-x-auto sm:bottom-auto sm:left-5 sm:top-1/2 sm:w-80 sm:-translate-y-1/2">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#6b4a35]">
          {name}
          <span className="ml-2 text-xs font-normal text-[#b39580]">{items.length} 样东西</span>
        </h2>
        <button onClick={onClose} aria-label="关闭" className="px-1 text-xl leading-none text-[#b39580] hover:text-[#6b4a35]">
          ×
        </button>
      </div>
      <p className="mb-4 text-sm text-[#8b6b55]">
        {note ?? (items.length ? "点一样东西可以改数量、标记快用完。" : "这里还空着，点 + 放点东西进来。")}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActive(active === item.id ? null : item.id);
              setAdding(false);
            }}
            className={`relative rounded-2xl border-2 bg-white p-2 text-center transition ${
              active === item.id ? "border-[#ff8a5b]" : "border-[#efe1cc] hover:border-[#e6c9ad]"
            } ${item.count === 0 ? "opacity-60" : ""}`}
          >
            {item.warn && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#ff8a5b]" />}
            <div className="pixel-icon mx-auto mb-1.5 h-8 w-8 rounded-md" style={{ "--c": item.color } as CSSProperties} />
            <div className="text-xs font-semibold text-[#6b4a35]">
              {item.name}
              {item.count !== undefined && <span className="ml-0.5 font-normal text-[#a2866f]">×{item.count}</span>}
            </div>
            {(item.count === 0 || item.note) && (
              <div className="mt-0.5 text-[10px] leading-tight text-[#a2866f]">{item.count === 0 ? "用完了" : item.note}</div>
            )}
          </button>
        ))}
        <button
          onClick={() => {
            setAdding(true);
            setActive(null);
          }}
          aria-label="添加东西"
          className="grid min-h-[76px] place-items-center rounded-2xl border-2 border-dashed border-[#e6d3bb] text-2xl text-[#ff8a5b] transition hover:border-[#ff8a5b]"
        >
          +
        </button>
      </div>

      {current && (
        <div className="fade-in mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2.5">
          <div className="flex items-center rounded-full bg-[#f6ecdf]">
            <button onClick={() => step(current, -1)} aria-label="减一" className="h-7 w-7 text-[#6b4a35]">
              −
            </button>
            <span className="min-w-6 text-center text-sm font-semibold text-[#6b4a35]">{current.count ?? 1}</span>
            <button onClick={() => step(current, 1)} aria-label="加一" className="h-7 w-7 text-[#6b4a35]">
              +
            </button>
          </div>
          <button
            onClick={() => update(current.id, { warn: !current.warn })}
            className={`${chip} ${current.warn ? "bg-[#ff8a5b] text-white" : "bg-[#f6ecdf] text-[#8b6b55]"}`}
          >
            {current.warn ? "快用完了" : "标记快用完"}
          </button>
          <button
            onClick={() => {
              onChange(items.filter((it) => it.id !== current.id));
              setActive(null);
            }}
            className={`${chip} ml-auto text-[#b39580] hover:text-[#d9673d]`}
          >
            拿走
          </button>
        </div>
      )}

      {adding && (
        <form
          className="fade-in mt-3 flex flex-col gap-2 rounded-2xl bg-white p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="放进来什么？比如 鸡蛋"
            className={field}
          />
          <div className="flex gap-2">
            <input
              value={draft.count}
              onChange={(e) => setDraft({ ...draft, count: e.target.value.replace(/\D/g, "") })}
              placeholder="数量"
              inputMode="numeric"
              className={`${field} w-20 shrink-0`}
            />
            <input
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="备注（可不填）"
              className={field}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className={`${chip} text-[#b39580]`}>
              算了
            </button>
            <button type="submit" disabled={!draft.name.trim()} className={`${chip} bg-[#6b4a35] text-white disabled:opacity-40`}>
              放进去
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const SCAN_ERRORS: Record<string, string> = {
  "no-key": "还没配置 AI 密钥，暂时认不了图。先选一个最接近的。",
  "not-plan": "这张图好像不是户型图。换一张，或者先选一个最接近的。",
  "bad-plan": "认出来的结构有点乱，没法搭。换一张清楚点的，或者先选一个。",
};

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.9),
  );
}

function UploadPanel({
  onClose,
  onChoose,
  onScan,
}: {
  onClose: () => void;
  onChoose: (t: Layout) => void;
  onScan: (s: Scan) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "reading" | "template">("pick");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const accept = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setError(null);
    setStep("reading");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const body = new FormData();
      body.append("image", await shrink(file), "plan.jpg");
      const res = await fetch("/api/scan", { method: "POST", body, signal: controller.signal });
      const data = (await res.json()) as { scan?: Scan; error?: string };
      if (!data.scan) throw new Error(data.error ?? "failed");
      scanToLayout(data.scan);
      onScan(data.scan);
    } catch (err) {
      if (controller.signal.aborted) return;
      const code = err instanceof Error ? err.message : "failed";
      setError(SCAN_ERRORS[code] ?? (code === "没有认出房间" ? SCAN_ERRORS["bad-plan"] : "没认出来，网络或模型出了点问题。先选一个最接近的。"));
      setStep("template");
    }
  };

  return (
    <div className="fade-in absolute inset-0 grid place-items-center bg-[#6b4a35]/20 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="card-pop w-full max-w-md rounded-3xl bg-[#fffaf2] p-6 shadow-[0_20px_50px_rgba(107,74,53,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#6b4a35]">
            {step === "pick" ? "上传你家的户型图" : step === "reading" ? "窝窝在看你家的户型图" : "选一个最接近的户型"}
          </h2>
          <button onClick={onClose} aria-label="关闭" className="px-1 text-xl leading-none text-[#b39580] hover:text-[#6b4a35]">
            ×
          </button>
        </div>

        {step === "pick" ? (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                accept(e.dataTransfer.files[0]);
              }}
              className={`flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition ${
                dragging ? "border-[#ff8a5b] bg-[#fff1e8]" : "border-[#e6d3bb] bg-white hover:border-[#ff8a5b]"
              }`}
            >
              <span className="text-3xl leading-none text-[#ff8a5b]">+</span>
              <span className="text-sm text-[#6b4a35]">点这里，或把图片拖进来</span>
              <span className="text-xs text-[#a2866f]">贝壳、链家上的户型图截图就可以</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => accept(e.target.files?.[0])}
            />
            <p className="mt-4 text-xs leading-relaxed text-[#a2866f]">
              图片会发给 AI 识别房间结构，不会保存。截图时可以把小区名和楼号裁掉。
            </p>
            <button
              onClick={() => setStep("template")}
              className="mt-3 text-xs text-[#8b6b55] underline underline-offset-4 hover:text-[#6b4a35]"
            >
              手边没有户型图？直接选一个
            </button>
          </>
        ) : step === "reading" ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {preview && (
              <div className="scan-frame relative h-48 w-full overflow-hidden rounded-2xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="户型图预览" className="h-full w-full object-contain" />
                <div className="scan-line absolute inset-x-0 h-8" />
              </div>
            )}
            <p className="text-sm text-[#8b6b55]">正在找墙、门和窗… 大概要半分钟</p>
          </div>
        ) : (
          <>
            {(preview || error) && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-2">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="户型图预览" className="h-16 w-16 rounded-xl object-cover" />
                )}
                <p className="text-xs leading-relaxed text-[#8b6b55]">
                  {error ?? "先选一个最接近的，之后可以用一句话改。"}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChoose(t)}
                  className="group rounded-2xl border-2 border-[#efe1cc] bg-white p-2 transition hover:-translate-y-0.5 hover:border-[#ff8a5b]"
                >
                  <MiniPlan layout={t} />
                  <div className="mt-2 text-sm font-semibold text-[#6b4a35]">{t.name}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const KIND_COLOR: Record<string, string> = {
  bedroom: "#f3c6b4",
  living: "#dcab76",
  kitchen: "#cfe7da",
  bathroom: "#b9dbeb",
  storage: "#e4d4b5",
};

function MiniPlan({ layout }: { layout: Layout }) {
  const w = Math.max(...layout.rooms.map((r) => r.x + r.w));
  const d = Math.max(...layout.rooms.map((r) => r.z + r.d));
  return (
    <div className="relative mx-auto w-full" style={{ aspectRatio: `${w} / ${d}` }}>
      {layout.rooms.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-[3px] border border-white"
          style={{
            left: `${(r.x / w) * 100}%`,
            top: `${(r.z / d) * 100}%`,
            width: `${(r.w / w) * 100}%`,
            height: `${(r.d / d) * 100}%`,
            background: KIND_COLOR[r.kind],
          }}
        />
      ))}
    </div>
  );
}
