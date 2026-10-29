"use client";

import { useState, type CSSProperties } from "react";
import type { InvItem } from "@/lib/inventory";
import { clothesOf, dayOf, KINDS, lastWornGap, toggleWorn, wornNote, wornToday, type ClothesKind } from "@/lib/wardrobe";

export type Worn = { room: string; item: InvItem };

const LONG = 30;

export function Wardrobe({
  clothes,
  onUpdate,
  onPhoto,
  onClose,
}: {
  clothes: Worn[];
  onUpdate: (changes: Worn[]) => void;
  onPhoto: () => void;
  onClose: () => void;
}) {
  const today = dayOf();
  const [kind, setKind] = useState<ClothesKind | "all">("all");
  const [picked, setPicked] = useState<string[]>([]);

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
          <button onClick={onClose} aria-label="关闭" className="text-xl text-[#a2866f]">
            ×
          </button>
        </div>

        {!clothes.length ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#8b6b55]">衣橱还空着。</p>
            <p className="mt-1 text-xs leading-relaxed text-[#a2866f]">打开衣柜拍一张，衣服会一件件认出来，连颜色和季节一起记下。</p>
            <button onClick={onPhoto} className="mt-4 rounded-full bg-[#6b4a35] px-4 py-2 text-sm font-semibold text-white">
              拍一拍衣柜
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-[#a2866f]">点几件今天穿的，再点下面「今天穿这身」。记上几周，就知道哪些一直没穿。</p>

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
                          onClick={() => togglePick(c.item.id)}
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

            {picked.length ? (
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
