import { z } from "zod";
import { autoFurnish, openingZones, type FloorSpec, type Layout, type Opening, type Room, type RoomKind, type WallSpec } from "./home";

const rect = z.object({
  x: z.number().describe("左上角 x，毫米"),
  y: z.number().describe("左上角 y，毫米（向下为正）"),
  w: z.number().describe("宽，毫米"),
  h: z.number().describe("高，毫米"),
});

export const scanSchema = z.object({
  isFloorPlan: z.boolean().describe("这张图是不是户型图"),
  rooms: z.array(
    z.object({
      name: z.string().describe("房间中文名，如 客厅、主卧、厨房"),
      kind: z.enum(["bedroom", "living", "kitchen", "bathroom", "storage", "balcony", "other"]),
      rects: z.array(rect).describe("组成这个房间的矩形，按墙中线；L 形房间拆成多个矩形"),
    }),
  ),
  openings: z.array(
    z.object({
      kind: z.enum(["door", "window", "entry"]).describe("entry 是入户门"),
      x0: z.number(),
      y0: z.number(),
      x1: z.number(),
      y1: z.number(),
      fullHeight: z.boolean().describe("落地窗为 true"),
    }),
  ),
});

export type Scan = z.infer<typeof scanSchema>;

const MM = 1 / 800;
const SNAP = 150;
const EDGE = 150;

const KIND: Record<Scan["rooms"][number]["kind"], RoomKind> = {
  bedroom: "bedroom",
  living: "living",
  kitchen: "kitchen",
  bathroom: "bathroom",
  storage: "storage",
  balcony: "storage",
  other: "storage",
};

function snapper(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const v of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && v - last[last.length - 1] <= SNAP) last.push(v);
    else clusters.push([v]);
  }
  const map = new Map<number, number>();
  for (const c of clusters) {
    const mean = Math.round(c.reduce((s, v) => s + v, 0) / c.length);
    for (const v of c) map.set(v, mean);
  }
  return (v: number) => map.get(v) ?? v;
}

type R = { room: number; x0: number; y0: number; x1: number; y1: number };
type Seg = { vertical: boolean; line: number; s0: number; s1: number; outer: boolean; room: number; inside: 1 | -1; key: string };

function segments(rects: R[], vertical: boolean): Seg[] {
  const lo = (r: R) => (vertical ? r.x0 : r.y0);
  const hi = (r: R) => (vertical ? r.x1 : r.y1);
  const a0 = (r: R) => (vertical ? r.y0 : r.x0);
  const a1 = (r: R) => (vertical ? r.y1 : r.x1);
  const lines = [...new Set(rects.flatMap((r) => [lo(r), hi(r)]))].sort((a, b) => a - b);
  const out: Seg[] = [];
  for (const line of lines) {
    const plus = rects.filter((r) => lo(r) === line);
    const minus = rects.filter((r) => hi(r) === line);
    const cuts = [...new Set([...plus, ...minus].flatMap((r) => [a0(r), a1(r)]))].sort((a, b) => a - b);
    for (let i = 0; i + 1 < cuts.length; i++) {
      const [s0, s1] = [cuts[i], cuts[i + 1]];
      const m = (s0 + s1) / 2;
      const p = plus.find((r) => a0(r) < m && a1(r) > m);
      const n = minus.find((r) => a0(r) < m && a1(r) > m);
      if (!p && !n) continue;
      if (p && n && p.room === n.room) continue;
      const room = (p ?? n)!.room;
      const outer = !(p && n);
      const key = outer ? `o${room}${p ? "+" : "-"}` : `i${[p!.room, n!.room].sort().join("|")}`;
      const prev = out[out.length - 1];
      if (prev && prev.line === line && prev.vertical === vertical && prev.key === key && prev.s1 === s0) prev.s1 = s1;
      else out.push({ vertical, line, s0, s1, outer, room, inside: p ? 1 : -1, key });
    }
  }
  return out;
}

export function scanToLayout(scan: Scan, id = "scan"): Layout {
  const raw = scan.rooms.flatMap((room, i) =>
    room.rects
      .filter((r) => r.w > 300 && r.h > 300)
      .map((r) => ({ room: i, x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h })),
  );
  if (!raw.length) throw new Error("没有认出房间");

  const sx = snapper(raw.flatMap((r) => [r.x0, r.x1]));
  const sy = snapper(raw.flatMap((r) => [r.y0, r.y1]));
  let rects: R[] = raw
    .map((r) => ({ room: r.room, x0: sx(r.x0), y0: sy(r.y0), x1: sx(r.x1), y1: sy(r.y1) }))
    .filter((r) => r.x1 > r.x0 && r.y1 > r.y0);
  const minX = Math.min(...rects.map((r) => r.x0));
  const minY = Math.min(...rects.map((r) => r.y0));
  const span = Math.max(...rects.map((r) => Math.max(r.x1 - minX, r.y1 - minY)));
  const fix = span < 2500 || span > 40000 ? 12000 / span : 1;
  const tx = (v: number) => (v - minX) * fix;
  const ty = (v: number) => (v - minY) * fix;
  rects = rects.map((r) => ({ room: r.room, x0: tx(r.x0), y0: ty(r.y0), x1: tx(r.x1), y1: ty(r.y1) }));

  const segs = [...segments(rects, true), ...segments(rects, false)];
  const openings = new Map<Seg, Opening[]>(segs.map((s) => [s, []]));

  for (const o of scan.openings) {
    const [x0, y0, x1, y1] = [tx(sx(o.x0)), ty(sy(o.y0)), tx(sx(o.x1)), ty(sy(o.y1))];
    const vertical = Math.abs(y1 - y0) > Math.abs(x1 - x0);
    const line = vertical ? (x0 + x1) / 2 : (y0 + y1) / 2;
    const [lo, hi] = vertical ? [Math.min(y0, y1), Math.max(y0, y1)] : [Math.min(x0, x1), Math.max(x0, x1)];
    let best: Seg | null = null;
    for (const s of segs) {
      if (s.vertical !== vertical || Math.abs(s.line - line) > 400 || Math.min(hi, s.s1) <= Math.max(lo, s.s0)) continue;
      if (!best || Math.abs(s.line - line) < Math.abs(best.line - line)) best = s;
    }
    if (!best) continue;
    const a = Math.max(lo, best.s0 + EDGE) * MM;
    const b = Math.min(hi, best.s1 - EDGE) * MM;
    if (b - a < 0.35) continue;
    const list = openings.get(best)!;
    if (list.some((e) => a < e.b && e.a < b)) continue;
    if (o.kind === "window") list.push(o.fullHeight ? { a, b, kind: "window", sill: 0.2, top: 2.1 } : { a, b, kind: "window" });
    else if (o.kind === "entry") list.push({ a, b, kind: "door", top: 2.07, leaf: best.inside > 0 ? "+" : "-" });
    else list.push({ a, b, kind: "door" });
  }

  const ids = scan.rooms.map((_, i) => `r${i}`);
  const walls: WallSpec[] = segs.map((s) => ({
    ...(s.vertical
      ? { x0: s.line * MM, z0: s.s0 * MM, x1: s.line * MM, z1: s.s1 * MM }
      : { x0: s.s0 * MM, z0: s.line * MM, x1: s.s1 * MM, z1: s.line * MM }),
    outer: s.outer,
    room: ids[s.room],
    openings: openings.get(s),
  }));

  const floors: FloorSpec[] = rects.map((r) => ({ room: ids[r.room], x0: r.x0 * MM, z0: r.y0 * MM, x1: r.x1 * MM, z1: r.y1 * MM }));

  const rooms: Room[] = [];
  scan.rooms.forEach((room, i) => {
    const own = floors.filter((f) => f.room === ids[i]);
    if (!own.length) return;
    const big = own.reduce((m, f) => ((f.x1 - f.x0) * (f.z1 - f.z0) > (m.x1 - m.x0) * (m.z1 - m.z0) ? f : m));
    rooms.push({ id: ids[i], name: room.name, kind: KIND[room.kind], x: big.x0, z: big.z0, w: big.x1 - big.x0, d: big.z1 - big.z0 });
  });

  const zones = openingZones(walls);
  return { id, name: "我的窝", rooms, plan: { floors, walls, furniture: rooms.flatMap((r) => autoFurnish(r, zones)) } };
}
