import { planOf, type Layout, type Placement, type Side } from "./home";

export type Spot = { x: number; z: number; side: Side; room: string; y?: number };

const KEY = "wowo:decor";

export function loadAllDecor(): Record<string, Spot[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function loadAll(): Record<string, Spot[]> {
  return loadAllDecor();
}

export function saveAllDecor(all: Record<string, Spot[]>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export const toSpots = (furniture: Placement[]): Spot[] =>
  furniture.map(({ x, z, side, room, y }) => ({ x: +x.toFixed(3), z: +z.toFixed(3), side, room, ...(y ? { y } : {}) }));

// Spots only make sense against the plan they were made for, so a length mismatch means "start over".
export function applySpots(layout: Layout, spots: Spot[] | null | undefined): Placement[] | null {
  const base = planOf(layout).furniture;
  if (!spots || spots.length !== base.length) return null;
  return base.map((p, i) => ({ ...p, ...spots[i], y: spots[i].y }));
}

export function loadDecor(layout: Layout): Placement[] | null {
  return applySpots(layout, loadAll()[layout.id]);
}

export function saveDecor(layout: Layout, furniture: Placement[] | null) {
  const all = loadAll();
  if (furniture) all[layout.id] = toSpots(furniture);
  else delete all[layout.id];
  saveAllDecor(all);
}
