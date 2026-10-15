export type HairStyle = "short" | "long" | "bun" | "buzz";
export type Person = { name: string; hair: string; style: HairStyle; shirt: string; pants: string; skin: string };
export type Coat = "cowBack" | "cowHead" | "orange" | "tabby" | "black" | "white" | "calico" | "blue";
export type Cat = { id: string; name: string; coat: Coat };
export type Family = { me: Person; partner: Person | null; cats: Cat[] };

const KEY = "wowo:family";
export const MAX_CATS = 3;

export const HAIR_STYLES: { id: HairStyle; name: string }[] = [
  { id: "short", name: "短发" },
  { id: "long", name: "长发" },
  { id: "bun", name: "丸子头" },
  { id: "buzz", name: "寸头" },
];

export const HAIR_COLORS = ["#2b2522", "#5a3a28", "#a0673e", "#d9b26f", "#9aa0a8", "#c25a5a"];
export const SHIRT_COLORS = ["#4f7cac", "#e59a8c", "#7fae7a", "#f2c76b", "#f6f1e7", "#3b3f4a", "#b58ad1", "#e07a4f"];
export const PANTS_COLORS = ["#3b3f4a", "#5b6f8f", "#8a7259", "#e8dcc8"];
export const SKIN_COLORS = ["#f6d7bd", "#f1c9a5", "#d9a77f", "#a8734f"];

export const COATS: { id: Coat; name: string; swatch: string[] }[] = [
  { id: "cowBack", name: "奶牛·背", swatch: ["#fbfaf7", "#26221f"] },
  { id: "cowHead", name: "奶牛·头", swatch: ["#26221f", "#fbfaf7"] },
  { id: "orange", name: "橘猫", swatch: ["#e8a25a", "#c27a3a"] },
  { id: "tabby", name: "狸花", swatch: ["#a08c6e", "#5e5040"] },
  { id: "black", name: "黑猫", swatch: ["#2b2724", "#f2c94c"] },
  { id: "white", name: "白猫", swatch: ["#fbfaf7", "#e99a9a"] },
  { id: "calico", name: "三花", swatch: ["#e8a25a", "#26221f"] },
  { id: "blue", name: "蓝猫", swatch: ["#8d96a0", "#6d7580"] },
];

const CAT_NAME_IDEAS = ["汤圆", "可乐", "布丁", "煤球", "年糕", "豆包", "橘子"];

export const DEFAULT_FAMILY: Family = {
  me: { name: "我", hair: "#2b2522", style: "short", shirt: "#4f7cac", pants: "#3b3f4a", skin: "#f1c9a5" },
  partner: { name: "TA", hair: "#3a2a22", style: "long", shirt: "#e59a8c", pants: "#3b3f4a", skin: "#f1c9a5" },
  cats: [
    { id: "mochi", name: "麻薯", coat: "cowBack" },
    { id: "sesame", name: "芝麻", coat: "cowHead" },
  ],
};

export function loadFamily(): Family {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const f = JSON.parse(raw) as Family;
      if (f.me && Array.isArray(f.cats) && f.cats.length) return f;
    }
  } catch {}
  return DEFAULT_FAMILY;
}

export function saveFamily(f: Family) {
  localStorage.setItem(KEY, JSON.stringify(f));
}

export function newCat(existing: Cat[]): Cat {
  const used = new Set(existing.map((c) => c.name));
  const coats = COATS.map((c) => c.id).filter((c) => !existing.some((e) => e.coat === c));
  return {
    id: Math.random().toString(36).slice(2, 9),
    name: CAT_NAME_IDEAS.find((n) => !used.has(n)) ?? "小猫",
    coat: coats[Math.floor(Math.random() * coats.length)] ?? "orange",
  };
}
