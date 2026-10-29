import type { InvItem } from "./inventory";

// 衣服就是品类为 clothes 的物品；种类、颜色、季节、哪天穿过都放在 extra 里，跟着物品一起同步
export type ClothesKind = "top" | "bottom" | "outer" | "dress" | "shoes" | "other";
export type Season = "spring-autumn" | "summer" | "winter" | "all";
export type Clothes = { kind?: ClothesKind; colorName?: string; season?: Season; worn?: string[] };

export const KINDS: { id: ClothesKind; name: string }[] = [
  { id: "top", name: "上衣" },
  { id: "bottom", name: "裤裙" },
  { id: "outer", name: "外套" },
  { id: "dress", name: "连衣裙" },
  { id: "shoes", name: "鞋" },
  { id: "other", name: "配饰" },
];

export const SEASONS: { id: Season; name: string }[] = [
  { id: "spring-autumn", name: "春秋" },
  { id: "summer", name: "夏" },
  { id: "winter", name: "冬" },
  { id: "all", name: "四季" },
];

// 手动改颜色时给的一排色块；点一下名字和图标颜色一起换
export const SWATCHES: { name: string; hex: string }[] = [
  { name: "黑色", hex: "#2b2b2b" },
  { name: "白色", hex: "#f5f3ee" },
  { name: "灰色", hex: "#9a9a9a" },
  { name: "藏青", hex: "#2c3e66" },
  { name: "蓝色", hex: "#3b6aa0" },
  { name: "卡其色", hex: "#c3b091" },
  { name: "米色", hex: "#e8dcc4" },
  { name: "棕色", hex: "#7a5230" },
  { name: "红色", hex: "#c84e4e" },
  { name: "粉色", hex: "#e8a0a8" },
  { name: "绿色", hex: "#5f8a5a" },
  { name: "黄色", hex: "#e2b25c" },
];

const MAX_WORN = 120;

export const isClothes = (it: InvItem) => it.category === "clothes";
export const clothesOf = (it: InvItem): Clothes => (it.extra ?? {}) as Clothes;

export function dayOf(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

// 今天穿了 / 没穿：再点一下就取消
export function toggleWorn(it: InvItem, day: string): InvItem {
  const c = clothesOf(it);
  const worn = c.worn ?? [];
  const next = worn.includes(day) ? worn.filter((d) => d !== day) : [...worn, day].sort().slice(-MAX_WORN);
  return { ...it, extra: { ...(it.extra ?? {}), worn: next } };
}

export function wornNote(it: InvItem, today: string) {
  const worn = clothesOf(it).worn ?? [];
  if (!worn.length) return "还没穿过";
  const last = worn[worn.length - 1];
  const gap = daysBetween(last, today);
  const when = gap <= 0 ? "今天" : gap === 1 ? "昨天" : `${gap} 天前`;
  return worn.length > 1 ? `${when} · 穿过 ${worn.length} 次` : when;
}

export const wornToday = (it: InvItem, today: string) => (clothesOf(it).worn ?? []).includes(today);

export function lastWornGap(it: InvItem, today: string): number | null {
  const worn = clothesOf(it).worn ?? [];
  return worn.length ? daysBetween(worn[worn.length - 1], today) : null;
}
