"use client";

import { useState } from "react";
import type { Room } from "@/lib/home";
import type { Category } from "@/lib/inventory";
import type { PhotoItems } from "@/lib/photo-items";
import type { Receipt } from "@/lib/receipt";

// 购物截图和拍照认出来的，都先变成这张草稿给人确认
export type Draft = {
  source: "receipt" | "photo";
  shop: string | null;
  boughtAt: string | null;
  items: { name: string; spec: string | null; count: number; price: number | null; category: Category; roomKind: string | null; low: boolean }[];
};

export const fromReceipt = (r: Receipt): Draft => ({
  source: "receipt",
  shop: r.shop,
  boughtAt: r.boughtAt,
  items: r.items.map((it) => ({ ...it, low: false })),
});

// 拍的就是当前这间屋，不猜房间
export const fromPhoto = (p: PhotoItems): Draft => ({
  source: "photo",
  shop: null,
  boughtAt: null,
  items: p.items.map((it) => ({ name: it.name, spec: it.note, count: it.count, price: null, category: it.category, roomKind: null, low: it.low })),
});

// retry=false：换一张也没用（没登录、AI 没配好、额度用完），只给「知道了」
export type ReceiptState =
  | { status: "reading"; source: Draft["source"] }
  | { status: "error"; source: Draft["source"]; message: string; retry: boolean }
  | { status: "ready"; draft: Draft };

export type ReceiptEntry = {
  room: string;
  name: string;
  spec: string | null;
  count: number;
  price: number | null;
  category: Category;
  low: boolean;
};

const WORDS = {
  receipt: { title: "从截图记一笔", reading: "正在看你买了什么…", privacy: "截图只拿来认东西，不会存下来" },
  photo: { title: "拍一拍，记下来", reading: "正在看这里有什么…", privacy: "照片只拿来认东西，不会存下来" },
};

type Row = ReceiptEntry & { key: number; on: boolean };

function suggestRoom(rooms: Room[], kind: string | null, fallback: string) {
  return (kind && rooms.find((r) => r.kind === kind)?.id) || fallback;
}

export function ReceiptSheet({
  state,
  rooms,
  defaultRoom,
  onConfirm,
  onRetry,
  onClose,
}: {
  state: ReceiptState;
  rooms: Room[];
  defaultRoom: string;
  onConfirm: (entries: ReceiptEntry[], boughtAt: string | null) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const words = WORDS[state.status === "ready" ? state.draft.source : state.source];
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#6b4a35]/20 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-pop flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl bg-[#fffaf2] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_10px_30px_rgba(107,74,53,0.25)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#6b4a35]">{words.title}</h2>
          <button onClick={onClose} aria-label="关闭" className="text-xl text-[#a2866f]">
            ×
          </button>
        </div>
        {state.status === "reading" && (
          <div className="py-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#f6ecdf] border-t-[#ff8a5b]" />
            <p className="mt-3 text-sm text-[#8b6b55]">{words.reading}</p>
            <p className="mt-1 text-xs text-[#a2866f]">{words.privacy}</p>
          </div>
        )}
        {state.status === "error" && (
          <div className="py-8 text-center">
            <p className="text-sm text-[#8b6b55]">{state.message}</p>
            <button
              onClick={state.retry ? onRetry : onClose}
              className="mt-4 rounded-full bg-[#6b4a35] px-4 py-2 text-sm font-semibold text-white"
            >
              {state.retry ? "换一张" : "知道了"}
            </button>
          </div>
        )}
        {state.status === "ready" && (
          <Lines draft={state.draft} rooms={rooms} defaultRoom={defaultRoom} onConfirm={onConfirm} />
        )}
      </div>
    </div>
  );
}

function Lines({
  draft,
  rooms,
  defaultRoom,
  onConfirm,
}: {
  draft: Draft;
  rooms: Room[];
  defaultRoom: string;
  onConfirm: (entries: ReceiptEntry[], boughtAt: string | null) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    draft.items.map((it, key) => ({
      key,
      on: true,
      room: suggestRoom(rooms, it.roomKind, defaultRoom),
      name: it.name,
      spec: it.spec,
      count: Math.max(1, it.count || 1),
      price: it.price,
      category: it.category,
      low: it.low,
    })),
  );
  const picked = rows.filter((r) => r.on && r.name.trim());
  const edit = (key: number, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const field =
    "min-w-0 rounded-lg border border-[#efe1cc] bg-white px-2 py-1 text-base text-[#6b4a35] outline-none focus:border-[#ff8a5b] sm:text-sm";

  return (
    <>
      <p className="mt-1 text-xs text-[#a2866f]">
        {[draft.shop, draft.boughtAt].filter(Boolean).join(" · ") || "认出来这些"}，不对的直接改，不要的取消勾选。
      </p>
      <ul className="-mx-1 mt-3 flex-1 space-y-2 overflow-y-auto px-1">
        {rows.map((r) => (
          <li key={r.key} className={`rounded-2xl bg-white p-2.5 transition ${r.on ? "" : "opacity-45"}`}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={r.on}
                onChange={(e) => edit(r.key, { on: e.target.checked })}
                aria-label={`要不要${r.name}`}
                className="h-4 w-4 shrink-0 accent-[#ff8a5b]"
              />
              <input value={r.name} onChange={(e) => edit(r.key, { name: e.target.value })} className={`${field} flex-1 font-semibold`} />
              <div className="flex shrink-0 items-center rounded-full bg-[#f6ecdf]">
                <button onClick={() => edit(r.key, { count: Math.max(1, r.count - 1) })} aria-label="减一" className="h-7 w-7 text-[#6b4a35]">
                  −
                </button>
                <span className="min-w-5 text-center text-sm font-semibold text-[#6b4a35]">{r.count}</span>
                <button onClick={() => edit(r.key, { count: r.count + 1 })} aria-label="加一" className="h-7 w-7 text-[#6b4a35]">
                  +
                </button>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2 pl-6 text-xs text-[#a2866f]">
              <span className="min-w-0 flex-1 truncate">
                {[r.low ? "快用完了" : null, r.spec, r.price !== null ? `¥${r.price}` : null].filter(Boolean).join(" · ")}
              </span>
              <span className="shrink-0">放到</span>
              <select
                value={r.room}
                onChange={(e) => edit(r.key, { room: e.target.value })}
                className="shrink-0 rounded-lg border border-[#efe1cc] bg-white px-1.5 py-0.5 text-xs text-[#6b4a35] outline-none"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>
      <button
        disabled={!picked.length}
        onClick={() => onConfirm(picked, draft.boughtAt)}
        className="mt-4 w-full rounded-full bg-[#6b4a35] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        放进去 {picked.length} 样
      </button>
    </>
  );
}
