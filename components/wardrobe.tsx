"use client";

import { useState, type CSSProperties } from "react";
import { newId, type InvItem } from "@/lib/inventory";
import {
  clothesOf,
  dayOf,
  KINDS,
  lastWornGap,
  SEASONS,
  SWATCHES,
  toggleWorn,
  wornNote,
  wornToday,
  type ClothesKind,
  type Season,
} from "@/lib/wardrobe";

export type Worn = { room: string; item: InvItem };

const LONG = 30;

export function Wardrobe({
  clothes,
  onUpdate,
  onAdd,
  onRemove,
  onPhoto,
  onClose,
}: {
  clothes: Worn[];
  onUpdate: (changes: Worn[]) => void;
  // 手动加的放进哪屋由外面定（卧室）
  onAdd: (item: InvItem) => void;
  onRemove: (c: Worn) => void;
  onPhoto: () => void;
  onClose: () => void;
}) {
  const today = dayOf();
  const [kind, setKind] = useState<ClothesKind | "all">("all");
  const [picked, setPicked] = useState<string[]>([]);
  // 整理模式：点一件是改它，不是选今天穿
  const [tidy, setTidy] = useState(false);
  const [editing, setEditing] = useState<Worn | "new" | null>(null);

  const kinds = KINDS.filter((k) => clothes.some((c) => (clothesOf(c.item).kind ?? "other") === k.id));
  const shown = clothes.filter((c) => kind === "all" || (clothesOf(c.item).kind ?? "other") === kind);
  const todays = clothes.filter((c) => wornToday(c.item, today));

  const groups = (() => {
    const never: Worn[] = [];
    const long: Worn[] = [];
    const recent: Worn[] = [];
    for (const c of shown) {
      const gap = lastWornGap(c.item, today);
      if (gap === null) never.push(c);
      else if (gap > LONG) long.push(c);
      else recent.push(c);
    }
    recent.sort((a, b) => (lastWornGap(a.item, today) ?? 0) - (lastWornGap(b.item, today) ?? 0));
    long.sort((a, b) => (lastWornGap(b.item, today) ?? 0) - (lastWornGap(a.item, today) ?? 0));
    return [
      { title: "还没穿过", list: never },
      { title: `好久没穿（${LONG} 天以上）`, list: long },
      { title: "最近穿过", list: recent },
    ].filter((g) => g.list.length);
  })();

  const togglePick = (id: string) => setPicked(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);
  const tap = (c: Worn) => (tidy ? setEditing(c) : togglePick(c.item.id));

  if (editing)
    return (
      <ClothesEditor
        initial={editing === "new" ? null : editing.item}
        onSave={(item) => {
          if (editing === "new") onAdd(item);
          else onUpdate([{ ...editing, item }]);
          setEditing(null);
        }}
        onDelete={editing === "new" ? undefined : () => (onRemove(editing), setEditing(null))}
        onCancel={() => setEditing(null)}
      />
    );

  const wearPicked = () => {
    const changes = clothes
      .filter((c) => picked.includes(c.item.id) && !wornToday(c.item, today))
      .map((c) => ({ ...c, item: toggleWorn(c.item, today) }));
    onUpdate(changes);
    setPicked([]);
  };

  const unwear = (c: Worn) => onUpdate([{ ...c, item: toggleWorn(c.item, today) }]);

  const chip = "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition";

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#6b4a35]/20 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-pop flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl bg-[#fffaf2] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_10px_30px_rgba(107,74,53,0.25)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#6b4a35]">
            衣橱
            <span className="ml-2 text-xs font-normal text-[#b39580]">{clothes.length} 件</span>
          </h2>
          <div className="flex items-center gap-3">
            {clothes.length > 0 && (
              <button
                onClick={() => {
                  setTidy(!tidy);
                  setPicked([]);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${tidy ? "bg-[#6b4a35] text-white" : "bg-[#f6ecdf] text-[#8b6b55]"}`}
              >
                {tidy ? "整理好了" : "整理"}
              </button>
            )}
            <button onClick={onClose} aria-label="关闭" className="text-xl text-[#a2866f]">
              ×
            </button>
          </div>
        </div>

        {!clothes.length ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#8b6b55]">衣橱还空着。</p>
            <p className="mt-1 text-xs leading-relaxed text-[#a2866f]">打开衣柜拍一张，衣服会一件件认出来，连颜色和季节一起记下。</p>
            <button onClick={onPhoto} className="mt-4 rounded-full bg-[#6b4a35] px-4 py-2 text-sm font-semibold text-white">
              拍一拍衣柜
            </button>
            <button onClick={() => setEditing("new")} className="mt-2 block w-full text-xs text-[#a2866f] hover:text-[#6b4a35]">
              手动加一件
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-[#a2866f]">
              {tidy ? "点一件改名字、种类、颜色；认错的、扔掉的在这里处理。" : "点几件今天穿的，再点下面「今天穿这身」。记上几周，就知道哪些一直没穿。"}
            </p>

            {todays.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl bg-white p-2.5 text-xs text-[#6b4a35]">
                <span className="font-semibold">今天穿了</span>
                {todays.map((c) => (
                  <button
                    key={c.item.id}
                    onClick={() => unwear(c)}
                    aria-label={`今天没穿${c.item.name}`}
                    className="rounded-full bg-[#f6ecdf] px-2 py-0.5 text-[#8b6b55] hover:bg-[#efe1cc]"
                  >
                    {clothesOf(c.item).colorName ?? ""}
                    {c.item.name} ×
                  </button>
                ))}
              </div>
            )}

            {kinds.length > 1 && (
              <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {[{ id: "all" as const, name: "全部" }, ...kinds].map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setKind(k.id)}
                    className={`${chip} ${kind === k.id ? "bg-[#6b4a35] text-white" : "bg-[#f6ecdf] text-[#8b6b55]"}`}
                  >
                    {k.name}
                  </button>
                ))}
              </div>
            )}

            <div className="-mx-1 mt-2 flex-1 space-y-3 overflow-y-auto px-1">
              {groups.map((g) => (
                <section key={g.title}>
                  <h3 className="mb-1.5 text-xs font-semibold text-[#8b6b55]">
                    {g.title}
                    <span className="ml-1 font-normal text-[#b39580]">{g.list.length}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {g.list.map((c) => {
                      const on = picked.includes(c.item.id);
                      const c2 = clothesOf(c.item);
                      return (
                        <button
                          key={c.item.id}
                          onClick={() => tap(c)}
                          aria-pressed={on}
                          className={`relative rounded-2xl border-2 bg-white p-2 text-center transition ${
                            on ? "border-[#ff8a5b]" : "border-[#efe1cc] hover:border-[#e6c9ad]"
                          }`}
                        >
                          {on && <span className="absolute top-1 right-1.5 text-xs font-bold text-[#ff8a5b]">✓</span>}
                          <div className="pixel-icon mx-auto mb-1.5 h-8 w-8 rounded-md" style={{ "--c": c.item.color } as CSSProperties} />
                          <div className="truncate text-xs font-semibold text-[#6b4a35]">
                            {c2.colorName && !c.item.name.includes(c2.colorName) ? c2.colorName : ""}
                            {c.item.name}
                            {(c.item.count ?? 1) > 1 && <span className="ml-0.5 font-normal text-[#a2866f]">×{c.item.count}</span>}
                          </div>
                          <div className="mt-0.5 text-[10px] leading-tight text-[#a2866f]">{wornNote(c.item, today)}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {tidy ? (
              <button onClick={() => setEditing("new")} className="mt-4 w-full rounded-full bg-[#f6ecdf] py-2.5 text-sm font-semibold text-[#8b6b55]">
                手动加一件
              </button>
            ) : picked.length ? (
              <button onClick={wearPicked} className="mt-4 w-full rounded-full bg-[#6b4a35] py-2.5 text-sm font-semibold text-white">
                今天穿这身（{picked.length} 件）
              </button>
            ) : (
              <button onClick={onPhoto} className="mt-4 w-full rounded-full bg-[#f6ecdf] py-2.5 text-sm font-semibold text-[#8b6b55]">
                拍一拍，再录几件
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ClothesEditor({
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  initial: InvItem | null;
  onSave: (item: InvItem) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const c = initial ? clothesOf(initial) : {};
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<ClothesKind>(c.kind ?? "top");
  const [colorName, setColorName] = useState(c.colorName ?? "");
  const [hex, setHex] = useState(initial?.color ?? SWATCHES[0].hex);
  const [season, setSeason] = useState<Season>(c.season ?? "all");
  const [count, setCount] = useState(initial?.count ?? 1);
  const [sure, setSure] = useState(false);

  const save = () => {
    const base: InvItem = initial ?? { id: newId(), name: "", color: hex, category: "clothes", source: "manual" };
    onSave({
      ...base,
      name: name.trim(),
      color: hex,
      count,
      category: "clothes",
      extra: { ...(base.extra ?? {}), kind, colorName: colorName.trim() || undefined, season },
    });
  };

  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition ${on ? "bg-[#6b4a35] text-white" : "bg-[#f6ecdf] text-[#8b6b55]"}`;
  const field =
    "w-full rounded-xl border-2 border-[#efe1cc] bg-white px-3 py-1.5 text-base text-[#6b4a35] outline-none sm:text-sm placeholder:text-[#c4ab95] focus:border-[#ff8a5b]";

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#6b4a35]/20 sm:items-center" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save();
        }}
        className="card-pop flex max-h-[85dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-3xl bg-[#fffaf2] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_10px_30px_rgba(107,74,53,0.25)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#6b4a35]">{initial ? "改一下这件" : "手动加一件"}</h2>
          <button type="button" onClick={onCancel} aria-label="关闭" className="text-xl text-[#a2866f]">
            ×
          </button>
        </div>

        <label className="block text-xs text-[#8b6b55]">
          叫什么
          <input autoFocus={!initial} value={name} onChange={(e) => setName(e.target.value)} placeholder="比如 卫衣、牛仔裤" className={`${field} mt-1`} />
        </label>

        <div>
          <p className="mb-1.5 text-xs text-[#8b6b55]">种类</p>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button type="button" key={k.id} onClick={() => setKind(k.id)} className={chip(kind === k.id)}>
                {k.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-[#8b6b55]">颜色</p>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((s) => (
              <button
                type="button"
                key={s.hex}
                onClick={() => {
                  setHex(s.hex);
                  setColorName(s.name);
                }}
                aria-label={s.name}
                title={s.name}
                className={`h-7 w-7 rounded-full border-2 ${hex === s.hex ? "border-[#ff8a5b] ring-2 ring-[#ff8a5b]/30" : "border-[#e6d3bb]"}`}
                style={{ background: s.hex }}
              />
            ))}
          </div>
          <input
            value={colorName}
            onChange={(e) => setColorName(e.target.value)}
            placeholder="颜色叫法，比如 燕麦色"
            className={`${field} mt-2`}
          />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="mb-1.5 text-xs text-[#8b6b55]">季节</p>
            <div className="flex flex-wrap gap-1.5">
              {SEASONS.map((s) => (
                <button type="button" key={s.id} onClick={() => setSeason(s.id)} className={chip(season === s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center rounded-full bg-[#f6ecdf]">
            <button type="button" onClick={() => setCount(Math.max(1, count - 1))} aria-label="减一" className="h-8 w-8 text-[#6b4a35]">
              −
            </button>
            <span className="min-w-6 text-center text-sm font-semibold text-[#6b4a35]">{count}</span>
            <button type="button" onClick={() => setCount(count + 1)} aria-label="加一" className="h-8 w-8 text-[#6b4a35]">
              +
            </button>
          </div>
        </div>

        <button type="submit" disabled={!name.trim()} className="mt-1 w-full rounded-full bg-[#6b4a35] py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {initial ? "改好了" : "放进衣橱"}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => (sure ? onDelete() : setSure(true))}
            className={`w-full text-xs ${sure ? "font-semibold text-[#d9673d]" : "text-[#a2866f] hover:text-[#d9673d]"}`}
          >
            {sure ? "再点一下，从衣橱拿掉" : "扔掉了 / 送人了"}
          </button>
        )}
      </form>
    </div>
  );
}
