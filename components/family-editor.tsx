"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
import {
  COATS,
  HAIR_COLORS,
  HAIR_STYLES,
  MAX_CATS,
  newCat,
  PANTS_COLORS,
  SHIRT_COLORS,
  SKIN_COLORS,
  type Cat,
  type Family,
  type Person,
} from "@/lib/family";
import { catParts, Parts, personParts } from "./creatures";

type Tab = "me" | "partner" | string;

function Spin({ children, y }: { children: ReactNode; y: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.8;
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      {children}
    </group>
  );
}

function Preview({ person, cat }: { person?: Person; cat?: Cat }) {
  const parts = useMemo(() => (person ? personParts(person) : cat ? catParts(cat.coat) : []), [person, cat]);
  return (
    <div className="h-36 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#fbf3e7] to-[#f1e2cd]">
      <Canvas flat dpr={[1, 2]} camera={{ position: [2.4, 1.6, 2.4], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 0.45, 0)}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 5, 2]} intensity={1.6} />
        <Spin y={person ? -0.15 : 0.05}>
          <group scale={person ? 0.95 : 1.35} position={cat ? [-0.05, 0, 0] : [0, 0, 0]}>
            <Parts parts={parts} />
          </group>
        </Spin>
      </Canvas>
    </div>
  );
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-xs text-[#a2866f]">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            className={`h-7 w-7 rounded-lg border-2 transition ${value === c ? "scale-110 border-[#ff8a5b]" : "border-white shadow-[0_0_0_1px_rgba(107,74,53,0.15)]"}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

const field =
  "w-full rounded-xl border-2 border-[#efe1cc] bg-white px-3 py-1.5 text-base text-[#6b4a35] outline-none placeholder:text-[#c4ab95] focus:border-[#ff8a5b] sm:text-sm";
const chip = "rounded-full px-3 py-1 text-xs font-semibold transition";

function PersonForm({ person, onChange }: { person: Person; onChange: (p: Person) => void }) {
  const set = (patch: Partial<Person>) => onChange({ ...person, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <input value={person.name} maxLength={8} onChange={(e) => set({ name: e.target.value })} placeholder="名字" className={field} />
      <div className="flex items-center gap-2">
        <span className="w-10 shrink-0 text-xs text-[#a2866f]">发型</span>
        <div className="flex flex-wrap gap-1.5">
          {HAIR_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => set({ style: s.id })}
              className={`${chip} ${person.style === s.id ? "bg-[#6b4a35] text-white" : "bg-[#f6ecdf] text-[#8b6b55]"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <Swatches label="发色" colors={HAIR_COLORS} value={person.hair} onPick={(hair) => set({ hair })} />
      <Swatches label="上衣" colors={SHIRT_COLORS} value={person.shirt} onPick={(shirt) => set({ shirt })} />
      <Swatches label="裤子" colors={PANTS_COLORS} value={person.pants} onPick={(pants) => set({ pants })} />
      <Swatches label="肤色" colors={SKIN_COLORS} value={person.skin} onPick={(skin) => set({ skin })} />
    </div>
  );
}

function CatForm({ cat, onChange, onRemove }: { cat: Cat; onChange: (c: Cat) => void; onRemove?: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <input value={cat.name} maxLength={8} onChange={(e) => onChange({ ...cat, name: e.target.value })} placeholder="猫的名字" className={field} />
      <div className="grid grid-cols-4 gap-2">
        {COATS.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange({ ...cat, coat: c.id })}
            aria-pressed={cat.coat === c.id}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-white p-1.5 transition ${cat.coat === c.id ? "border-[#ff8a5b]" : "border-[#efe1cc]"}`}
          >
            <span
              className="h-5 w-8 rounded-md"
              style={{ background: `linear-gradient(135deg, ${c.swatch[0]} 0 55%, ${c.swatch[1]} 55%)`, boxShadow: "inset 0 0 0 1px rgba(107,74,53,0.15)" }}
            />
            <span className="text-[11px] text-[#6b4a35]">{c.name}</span>
          </button>
        ))}
      </div>
      {onRemove && (
        <button onClick={onRemove} className={`${chip} self-end text-[#b39580] hover:text-[#d9673d]`}>
          它不住这儿了
        </button>
      )}
    </div>
  );
}

export function FamilyEditor({ family, onChange, onClose }: { family: Family; onChange: (f: Family) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("me");
  const cat = family.cats.find((c) => c.id === tab);
  const tabs: { id: Tab; name: string }[] = [
    { id: "me", name: family.me.name || "我" },
    ...(family.partner ? [{ id: "partner", name: family.partner.name || "TA" }] : []),
    ...family.cats.map((c) => ({ id: c.id, name: c.name || "猫" })),
  ];
  const setCat = (next: Cat) => onChange({ ...family, cats: family.cats.map((c) => (c.id === next.id ? next : c)) });

  return (
    <div className="fade-in absolute inset-0 z-10 grid place-items-end bg-[#6b4a35]/20 backdrop-blur-[2px] sm:place-items-center" onClick={onClose}>
      <div
        className="card-pop flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-t-3xl bg-[#fffaf2] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_20px_50px_rgba(107,74,53,0.25)] sm:w-[26rem] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#6b4a35]">窝里住着谁</h2>
          <button onClick={onClose} aria-label="关闭" className="px-1 text-xl leading-none text-[#b39580] hover:text-[#6b4a35]">
            ×
          </button>
        </div>

        <div className="no-scrollbar -mx-5 mb-3 flex gap-1.5 overflow-x-auto px-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`${chip} shrink-0 whitespace-nowrap py-1.5 ${tab === t.id ? "bg-[#6b4a35] text-white" : "bg-[#f6ecdf] text-[#8b6b55]"}`}
            >
              {t.name}
            </button>
          ))}
          {family.cats.length < MAX_CATS && (
            <button
              onClick={() => {
                const c = newCat(family.cats);
                onChange({ ...family, cats: [...family.cats, c] });
                setTab(c.id);
              }}
              className={`${chip} shrink-0 whitespace-nowrap border-2 border-dashed border-[#e6d3bb] py-1 text-[#ff8a5b]`}
            >
              + 再养一只
            </button>
          )}
        </div>

        <Preview person={tab === "me" ? family.me : tab === "partner" ? (family.partner ?? undefined) : undefined} cat={cat} />

        <div className="mt-4">
          {tab === "me" && <PersonForm person={family.me} onChange={(me) => onChange({ ...family, me })} />}
          {tab === "partner" && family.partner && (
            <PersonForm person={family.partner} onChange={(partner) => onChange({ ...family, partner })} />
          )}
          {cat && (
            <CatForm
              cat={cat}
              onChange={setCat}
              onRemove={
                family.cats.length > 1
                  ? () => {
                      onChange({ ...family, cats: family.cats.filter((c) => c.id !== cat.id) });
                      setTab("me");
                    }
                  : undefined
              }
            />
          )}
        </div>

        {(tab === "me" || tab === "partner") && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-3 py-2.5">
            <span className="text-sm text-[#6b4a35]">{family.partner ? "和人一起住" : "一个人住"}</span>
            <button
              onClick={() => {
                if (family.partner) {
                  onChange({ ...family, partner: null });
                  setTab("me");
                } else {
                  onChange({
                    ...family,
                    partner: { name: "TA", hair: "#3a2a22", style: "long", shirt: "#e59a8c", pants: "#3b3f4a", skin: "#f1c9a5" },
                  });
                  setTab("partner");
                }
              }}
              className={`${chip} ${family.partner ? "bg-[#f6ecdf] text-[#8b6b55]" : "bg-[#6b4a35] text-white"}`}
            >
              {family.partner ? "改成一个人住" : "+ 加一个同住的人"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
