import type { Layout } from "./home";
import { DEMO_ROOMS } from "./layouts";

export type InvItem = { id: string; name: string; note?: string; count?: number; color: string; warn?: boolean };

export type Inventory = Record<string, InvItem[]>;

const KEY = "wowo:inventory";

const PALETTE = ["#e88f8f", "#f2b3a6", "#e2b25c", "#f2d7a8", "#86a98c", "#5f9e5a", "#9fd3ea", "#7fa6c9", "#c7836b", "#cf9b66", "#b9a3d6", "#e9e4da"];

const HINTS: [RegExp, string][] = [
  [/奶|米|面|纸|盐|糖/, "#f3f1ea"],
  [/蛋|面包|饼/, "#f2d7a8"],
  [/菜|葱|绿|茶/, "#86a98c"],
  [/肉|莓|番茄|辣/, "#e0525a"],
  [/猫粮|狗粮|香蕉|柠檬/, "#e2b25c"],
  [/水|蓝/, "#9fd3ea"],
];

export function colorFor(name: string) {
  for (const [re, c] of HINTS) if (re.test(name)) return c;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const roomKey = (layout: Layout, room: string) => `${layout.id}/${room}`;

export function loadInventory(): Inventory {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Inventory;
  } catch {
    return {};
  }
}

export function saveInventory(inv: Inventory) {
  localStorage.setItem(KEY, JSON.stringify(inv));
}

export function itemsFor(inv: Inventory, layout: Layout, room: string): InvItem[] {
  const stored = inv[roomKey(layout, room)];
  if (stored) return stored;
  if (!layout.demo) return [];
  return (DEMO_ROOMS[room]?.items ?? []).map((it, i) => ({ id: `seed-${i}`, ...it }));
}

export const newId = () => Math.random().toString(36).slice(2, 10);
