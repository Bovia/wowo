import { Color } from "three";
import { FURNITURE, type LBox, type Piece, type Rect } from "./furniture";

export type RoomKind = "bedroom" | "living" | "kitchen" | "bathroom" | "storage";

export type Room = {
  id: string;
  name: string;
  kind: RoomKind;
  x: number;
  z: number;
  w: number;
  d: number;
};

export type Side = "n" | "s" | "w" | "e";

// a/b are absolute coordinates along the wall's axis; leaf is the side (across the wall) an open door swings to.
export type Opening = { a: number; b: number; kind: "door" | "window"; sill?: number; top?: number; leaf?: "+" | "-" };

export type WallSpec = {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  outer: boolean;
  room: string;
  openings?: Opening[];
};

export type FloorSpec = { room: string; x0: number; z0: number; x1: number; z1: number; elev?: number };

export type Placement = { piece: Piece; room: string; x: number; z: number; side: Side; y?: number };

export type Plan = { floors: FloorSpec[]; walls: WallSpec[]; furniture: Placement[] };

export type Layout = {
  id: string;
  name: string;
  rooms: Room[];
  plan?: Plan;
  demo?: boolean;
};

export type Box = {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  color: number;
  room: string | null;
  piece?: number;
};

export type Cell = [number, number];

export type Nav = { res: number; cells: Map<string, number> };

export type BuiltHome = {
  width: number;
  depth: number;
  boxes: Box[];
  nav: Nav;
  rooms: Room[];
  plan: Plan;
  furniture: Placement[];
};

export const FLOOR = 0.1;
export const T = 0.2;
export const H_OUT = 2.3;
export const H_IN = 1.5;
const ROW = 0.23;

export const cellKey = (i: number, j: number) => `${i},${j}`;

function hash(x: number, y: number, z: number) {
  let h =
    Math.imul(Math.round(x * 64), 374761393) ^
    Math.imul(Math.round(y * 64), 668265263) ^
    Math.imul(Math.round(z * 64), 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const tmp = new Color();
function shade(hex: string, x: number, y: number, z: number, amount: number) {
  tmp.set(hex);
  tmp.offsetHSL(0, 0, (hash(x, y, z) - 0.5) * 2 * amount);
  return tmp.getHex();
}

class Builder {
  boxes: Box[] = [];
  room: string | null = null;
  piece: number | undefined;
  at(room: string | null, piece?: number) {
    this.room = room;
    this.piece = piece;
    return this;
  }
  add(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string, jitter = 0.03) {
    if (x1 - x0 <= 0.001 || y1 - y0 <= 0.001 || z1 - z0 <= 0.001) return;
    this.boxes.push({
      x0,
      y0,
      z0,
      x1,
      y1,
      z1,
      color: shade(color, x0 + x1, y0 + y1, z0 + z1, jitter),
      room: this.room,
      ...(this.piece === undefined ? {} : { piece: this.piece }),
    });
  }
}

const pick = (colors: string[], r: number) => colors[Math.floor(r * colors.length) % colors.length];

function floorTiles(b: Builder, f: FloorSpec, kind: RoomKind) {
  const { x0: fx0, z0: fz0, x1: fx1, z1: fz1 } = f;
  const y0 = f.elev ?? 0;
  if (y0 > 0) {
    b.add(fx0, 0, fz0, fx1, y0, fz1, "#b8875a", 0.02);
  }
  const g = 0.012;
  const tile = (x0: number, z0: number, x1: number, z1: number, color: string) => {
    const cx0 = Math.max(fx0, x0);
    const cx1 = Math.min(fx1, x1);
    const cz0 = Math.max(fz0, z0);
    const cz1 = Math.min(fz1, z1);
    if (cx1 - cx0 < 0.04 || cz1 - cz0 < 0.04) return;
    b.add(cx0 + g, y0, cz0 + g, cx1 - g, y0 + FLOOR, cz1 - g, color, 0.025);
  };
  const planks = (along: "x" | "z", colors: string[], len: number) => {
    const pw = 0.25;
    const [a0, a1, c0, c1] = along === "x" ? [fx0, fx1, fz0, fz1] : [fz0, fz1, fx0, fx1];
    for (let r = 0; c0 + r * pw < c1; r++) {
      const off = ((r * 0.37) % 1) * len;
      for (let s = a0 - off; s < a1; s += len) {
        const color = pick(colors, hash(r, s, fx0 + fz0));
        if (along === "x") tile(s, c0 + r * pw, s + len, c0 + (r + 1) * pw, color);
        else tile(c0 + r * pw, s, c0 + (r + 1) * pw, s + len, color);
      }
    }
  };
  const grid = (size: number, color: (i: number, j: number) => string) => {
    for (let i = 0; fx0 + i * size < fx1; i++)
      for (let j = 0; fz0 + j * size < fz1; j++)
        tile(fx0 + i * size, fz0 + j * size, fx0 + (i + 1) * size, fz0 + (j + 1) * size, color(i, j));
  };

  switch (kind) {
    case "bedroom":
      return planks("x", ["#e0b48a", "#d6a77c", "#e6be96", "#dcae84"], 1.2);
    case "living":
      return planks("z", ["#c9935f", "#bd8656", "#d29d68", "#c48d5b"], 1.0);
    case "kitchen":
      return grid(0.5, (i, j) => ((i + j) % 2 === 0 ? "#cfe7da" : "#f7f2e8"));
    case "bathroom":
      return grid(0.25, (i, j) => pick(["#b9dbeb", "#d6ecf4", "#a6d0e4", "#eef6f9", "#d6ecf4"], hash(i + fx0 * 4, 9, j + fz0 * 4)));
    case "storage":
      return grid(0.5, (i, j) => pick(["#e4d4b5", "#d9c7a5", "#e0cfae"], hash(i, 4, j)));
  }
}

type WallGeom = {
  spec: WallSpec;
  vertical: boolean;
  line: number;
  s0: number;
  s1: number;
  h: number;
};

function geom(w: WallSpec): WallGeom {
  const vertical = Math.abs(w.x0 - w.x1) < 1e-6;
  return {
    spec: w,
    vertical,
    line: vertical ? w.x0 : w.z0,
    s0: vertical ? Math.min(w.z0, w.z1) : Math.min(w.x0, w.x1),
    s1: vertical ? Math.max(w.z0, w.z1) : Math.max(w.x0, w.x1),
    h: w.outer ? H_OUT : H_IN,
  };
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-4;

function renderWall(b: Builder, g: WallGeom, start: number, end: number) {
  const { vertical, line, h } = g;
  const rows = Math.round(h / ROW);
  const rh = h / rows;
  const c0 = line - T / 2;
  const c1 = line + T / 2;
  const put = (a0: number, y0: number, a1: number, y1: number, color: string, pad = 0, jitter = 0.03) => {
    if (vertical) b.add(c0 - pad, y0, a0, c1 + pad, y1, a1, color, jitter);
    else b.add(a0, y0, c0 - pad, a1, y1, c1 + pad, color, jitter);
  };
  const across = (a0: number, a1: number, y0: number, y1: number, t0: number, t1: number, color: string, jitter = 0.01) => {
    if (vertical) b.add(line + t0, y0, a0, line + t1, y1, a1, color, jitter);
    else b.add(a0, y0, line + t0, a1, y1, line + t1, color, jitter);
  };

  const openings = (g.spec.openings ?? []).map((o) => {
    const top = o.top ?? (o.kind === "door" ? h : 1.85);
    const sill = o.sill ?? (o.kind === "door" ? 0 : 0.85);
    const r0 = Math.max(0, Math.round(sill / rh));
    const r1 = Math.min(rows, Math.round(top / rh));
    return { ...o, r0, r1, y0: r0 * rh, y1: r1 * rh };
  });

  for (let r = 0; r < rows; r++) {
    const y0 = r * rh;
    const y1 = (r + 1) * rh;
    let spans: [number, number][] = [[start, end]];
    for (const o of openings) {
      if (r < o.r0 || r >= o.r1) continue;
      spans = spans.flatMap(([s, e]): [number, number][] => {
        if (o.b <= s || o.a >= e) return [[s, e]];
        return [
          [s, Math.max(s, o.a)],
          [Math.min(e, o.b), e],
        ];
      });
    }
    const off = (r % 2) * 0.2;
    for (const [s, e] of spans) {
      if (e - s < 0.01) continue;
      let k = Math.floor((s + off) / 0.4);
      for (;;) {
        const a0 = Math.max(s, k * 0.4 - off);
        const a1 = Math.min(e, (k + 1) * 0.4 - off);
        if (a0 >= e) break;
        if (a1 > a0 + 0.005) {
          const color = r === 0 ? "#e3d3b9" : hash(a0, y0, line) > 0.82 ? "#ede0cb" : "#f5ecdc";
          put(a0, y0, a1, y1, color);
        }
        k++;
      }
    }
  }

  let capSpans: [number, number][] = [[start, end]];
  for (const o of openings)
    if (o.r1 >= rows)
      capSpans = capSpans.flatMap(([s, e]): [number, number][] =>
        o.b <= s || o.a >= e ? [[s, e]] : [[s, Math.max(s, o.a)], [Math.min(e, o.b), e]],
      );
  for (const [s, e] of capSpans) if (e - s > 0.01) put(s, h, e, h + 0.05, "#d9c7aa", 0.02, 0.01);

  for (const o of openings) {
    if (o.kind === "door") {
      across(o.a, o.b, 0, FLOOR + 0.012, -T / 2, T / 2, "#b07a4f");
      across(o.a - 0.06, o.a, 0, o.y1, -T / 2 - 0.03, T / 2 + 0.03, "#b07a4f");
      across(o.b, o.b + 0.06, 0, o.y1, -T / 2 - 0.03, T / 2 + 0.03, "#b07a4f");
      if (o.y1 < h) across(o.a - 0.06, o.b + 0.06, o.y1 - 0.06, o.y1, -T / 2 - 0.03, T / 2 + 0.03, "#b07a4f");
      if (o.leaf) {
        const len = o.b - o.a - 0.04;
        const [t0, t1] = o.leaf === "-" ? [-T / 2 - len, -T / 2] : [T / 2, T / 2 + len];
        across(o.b - 0.06, o.b, FLOOR + 0.02, o.y1 - 0.08, t0, t1, "#a0714b", 0.02);
        const hz = o.leaf === "-" ? t0 + 0.06 : t1 - 0.1;
        across(o.b - 0.12, o.b + 0.06, 0.95, 1.0, hz, hz + 0.04, "#e2b25c");
      }
      continue;
    }
    const { y0, y1 } = o;
    const tall = y1 - y0 > 1.4;
    across(o.a, o.b, y0, y1, -0.02, 0.02, "#bfe0ee", 0.02);
    across(o.a - 0.04, o.b + 0.04, y0 - 0.05, y0, -T / 2 - 0.06, T / 2 + 0.06, "#fbf7ef");
    across(o.a, o.b, y1 - 0.04, y1, -T / 2 - 0.01, T / 2 + 0.01, "#fbf7ef");
    across(o.a, o.a + 0.04, y0, y1, -T / 2, T / 2, "#fbf7ef");
    across(o.b - 0.04, o.b, y0, y1, -T / 2, T / 2, "#fbf7ef");
    const panes = Math.max(2, Math.round((o.b - o.a) / 0.6));
    for (let k = 1; k < panes; k++) {
      const m = o.a + ((o.b - o.a) * k) / panes;
      across(m - 0.025, m + 0.025, y0, y1, -0.05, 0.05, "#fbf7ef");
    }
    const tm = tall ? y0 + (y1 - y0) * 0.78 : (y0 + y1) / 2;
    across(o.a, o.b, tm - 0.02, tm + 0.02, -0.05, 0.05, "#fbf7ef");
  }
}

function renderWalls(b: Builder, walls: WallSpec[]) {
  const gs = walls.map(geom);
  const posts = new Map<string, { x: number; z: number; h: number; room: string }>();
  const insideOther = (g: WallGeom, x: number, z: number) =>
    gs.some((o) => {
      if (o === g || o.vertical === g.vertical) return false;
      const along = o.vertical ? z : x;
      const cross = o.vertical ? x : z;
      return near(cross, o.line) && along > o.s0 + 1e-4 && along < o.s1 - 1e-4;
    });

  for (const g of gs) {
    const ends: [number, number, number][] = [
      [g.s0, g.vertical ? g.line : g.s0, g.vertical ? g.s0 : g.line],
      [g.s1, g.vertical ? g.line : g.s1, g.vertical ? g.s1 : g.line],
    ];
    for (const [, x, z] of ends) {
      if (insideOther(g, x, z)) continue;
      const k = `${x.toFixed(3)},${z.toFixed(3)}`;
      const p = posts.get(k) ?? { x, z, h: 0, room: g.spec.room };
      p.h = Math.max(p.h, g.h);
      posts.set(k, p);
    }
    renderWall(b.at(g.spec.room), g, g.s0 + T / 2, g.s1 - T / 2);
  }

  for (const p of posts.values()) {
    b.at(p.room);
    b.add(p.x - T / 2, 0, p.z - T / 2, p.x + T / 2, p.h, p.z + T / 2, "#efe3cf", 0.02);
    b.add(p.x - T / 2 - 0.02, p.h, p.z - T / 2 - 0.02, p.x + T / 2 + 0.02, p.h + 0.05, p.z + T / 2 + 0.02, "#d9c7aa", 0.01);
  }
}

function footprint(piece: Piece, side: Side, x: number, z: number): Rect {
  return side === "n" || side === "s" ? [x, z, x + piece.w, z + piece.d] : [x, z, x + piece.d, z + piece.w];
}

export const footprintOf = (p: Placement) => footprint(p.piece, p.side, p.x, p.z);

const TURN: Record<Side, Side> = { n: "e", e: "s", s: "w", w: "n" };

export function rotated(p: Placement): Placement {
  const [x0, z0, x1, z1] = footprintOf(p);
  const side = TURN[p.side];
  const [fw, fd] = side === "n" || side === "s" ? [p.piece.w, p.piece.d] : [p.piece.d, p.piece.w];
  return { ...p, side, x: (x0 + x1 - fw) / 2, z: (z0 + z1 - fd) / 2 };
}

const floorAt = (plan: Plan, x: number, z: number) =>
  plan.floors.find((f) => x > f.x0 - 1e-6 && x < f.x1 + 1e-6 && z > f.z0 - 1e-6 && z < f.z1 + 1e-6);

// Re-seats a moved piece: returns it with its new room and floor height, or null if it hits a wall, another piece, a step or the outside.
export function seat(plan: Plan, furniture: Placement[], index: number, p: Placement): Placement | null {
  const [x0, z0, x1, z1] = footprintOf(p);
  const e = 0.02;
  const probes: [number, number][] = [
    [x0 + e, z0 + e],
    [x1 - e, z0 + e],
    [x0 + e, z1 - e],
    [x1 - e, z1 - e],
    [(x0 + x1) / 2, (z0 + z1) / 2],
  ];
  const floors = probes.map(([x, z]) => floorAt(plan, x, z));
  if (floors.some((f) => !f)) return null;
  const elev = floors[0]!.elev ?? 0;
  if (floors.some((f) => (f!.elev ?? 0) !== elev)) return null;

  for (const w of plan.walls) {
    const g = geom(w);
    const [c0, c1, a0, a1] = g.vertical ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
    if (c0 < g.line + T / 2 && c1 > g.line - T / 2 && a0 < g.s1 + T / 2 && a1 > g.s0 - T / 2) return null;
  }
  const mine = solidsOf(p);
  for (const [i, o] of furniture.entries()) {
    if (i === index) continue;
    for (const [ox0, oz0, ox1, oz1] of solidsOf(o))
      if (mine.some(([sx0, sz0, sx1, sz1]) => sx0 < ox1 - e && ox0 < sx1 - e && sz0 < oz1 - e && oz0 < sz1 - e)) return null;
  }
  return { ...p, room: floors[4]!.room, y: elev || undefined };
}

export function pieceBoxes(p: Placement): Box[] {
  const b = new Builder();
  renderPlacement(b, p, []);
  return b.boxes;
}

function mapRect(piece: Piece, side: Side, x: number, z: number, [lx0, lz0, lx1, lz1]: Rect): Rect {
  const { w, d } = piece;
  switch (side) {
    case "n":
      return [x + lx0, z + lz0, x + lx1, z + lz1];
    case "s":
      return [x + w - lx1, z + d - lz1, x + w - lx0, z + d - lz0];
    case "w":
      return [x + lz0, z + w - lx1, x + lz1, z + w - lx0];
    case "e":
      return [x + d - lz1, z + lx0, x + d - lz0, z + lx1];
  }
}

const solidsOf = (p: Placement) =>
  (p.piece.solids ?? [[0, 0, p.piece.w, p.piece.d] as Rect]).map((s) => mapRect(p.piece, p.side, p.x, p.z, s));

function renderPlacement(b: Builder, p: Placement, solids: Rect[], index?: number) {
  const y = (p.y ?? 0) + FLOOR;
  b.at(p.room, index);
  for (const [x0, y0, z0, x1, y1, z1, color] of p.piece.boxes as LBox[]) {
    const [wx0, wz0, wx1, wz1] = mapRect(p.piece, p.side, p.x, p.z, [x0, z0, x1, z1]);
    b.add(wx0, y + y0, wz0, wx1, y + y1, wz1, color, 0.02);
  }
  solids.push(...solidsOf(p));
}

export function openingZones(walls: WallSpec[]) {
  const doors: Rect[] = [];
  const windows: Rect[] = [];
  for (const w of walls) {
    const g = geom(w);
    for (const o of w.openings ?? []) {
      const [reach, pad] = o.kind === "door" ? [1.0, 0.15] : [0.7, 0];
      const r: Rect = g.vertical
        ? [g.line - reach, o.a - pad, g.line + reach, o.b + pad]
        : [o.a - pad, g.line - reach, o.b + pad, g.line + reach];
      (o.kind === "door" ? doors : windows).push(r);
    }
  }
  return { doors, windows };
}

export function autoFurnish(room: Room, zones: { doors: Rect[]; windows: Rect[] }): Placement[] {
  const ir = {
    x0: room.x + T / 2 + 0.04,
    z0: room.z + T / 2 + 0.04,
    x1: room.x + room.w - T / 2 - 0.04,
    z1: room.z + room.d - T / 2 - 0.04,
  };
  const taken: Rect[] = [];
  const out: Placement[] = [];
  const overlaps = (a: Rect, c: Rect, gap = 0) =>
    a[0] < c[2] + gap && c[0] < a[2] + gap && a[1] < c[3] + gap && c[1] < a[3] + gap;

  for (const alternatives of FURNITURE[room.kind]) {
    let placed = false;
    for (const piece of alternatives) {
      const tall = piece.boxes.some((bx) => bx[4] > 1.3);
      for (const side of ["n", "w", "e", "s"] as Side[]) {
        const horizontal = side === "n" || side === "s";
        const lo = horizontal ? ir.x0 : ir.z0;
        const hi = (horizontal ? ir.x1 : ir.z1) - piece.w;
        if (hi < lo) continue;
        const mid = (lo + hi) / 2;
        const spots = piece.prefer === "center" ? [mid, lo, hi] : [lo, hi, mid];
        for (let s = lo; s <= hi; s += 0.25) spots.push(s);
        for (const p of spots) {
          const [x, z] =
            side === "n" ? [p, ir.z0] : side === "s" ? [p, ir.z1 - piece.d] : side === "w" ? [ir.x0, p] : [ir.x1 - piece.d, p];
          const rect = footprint(piece, side, x, z);
          if (rect[0] < ir.x0 - 1e-6 || rect[2] > ir.x1 + 1e-6 || rect[1] < ir.z0 - 1e-6 || rect[3] > ir.z1 + 1e-6)
            continue;
          if (taken.some((t) => overlaps(rect, t, 0.08))) continue;
          if (zones.doors.some((zr) => overlaps(rect, zr))) continue;
          if (tall && zones.windows.some((zr) => overlaps(rect, zr))) continue;
          taken.push(rect);
          out.push({ piece, room: room.id, x, z, side });
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (placed) break;
    }
  }
  return out;
}

function planFromGrid(layout: Layout): Plan {
  const owner = new Map<string, Room>();
  for (const room of layout.rooms)
    for (let i = room.x; i < room.x + room.w; i++)
      for (let j = room.z; j < room.z + room.d; j++) owner.set(cellKey(i, j), room);

  type Edge = { key: string; vertical: boolean; line: number; start: number; outer: boolean; rooms: string[] };
  const edges = new Map<string, Edge>();
  for (const [k, room] of owner) {
    const [i, j] = k.split(",").map(Number);
    const sides: [string, boolean, number, number, string][] = [
      [`v:${i}:${j}`, true, i, j, cellKey(i - 1, j)],
      [`v:${i + 1}:${j}`, true, i + 1, j, cellKey(i + 1, j)],
      [`h:${i}:${j}`, false, j, i, cellKey(i, j - 1)],
      [`h:${i}:${j + 1}`, false, j + 1, i, cellKey(i, j + 1)],
    ];
    for (const [key, vertical, line, start, other] of sides) {
      const n = owner.get(other);
      if (n?.id === room.id || edges.has(key)) continue;
      edges.set(key, { key, vertical, line, start, outer: !n, rooms: n ? [room.id, n.id] : [room.id] });
    }
  }

  const groups = new Map<string, Edge[]>();
  for (const e of edges.values()) {
    const g = `${e.outer ? "out" : "in"}|${[...e.rooms].sort().join("|")}|${e.vertical}|${e.line}`;
    groups.set(g, [...(groups.get(g) ?? []), e]);
  }

  const walls: WallSpec[] = [];
  for (const [g, list] of groups) {
    list.sort((a, c) => a.start - c.start);
    const openings: Opening[] = [];
    const at = (e: Edge, kind: Opening["kind"]) => openings.push({ a: e.start + 0.1, b: e.start + 0.9, kind });
    if (g.startsWith("in")) at(list[Math.floor((list.length - 1) / 2)], "door");
    else if (list.length >= 7) {
      at(list[Math.floor(list.length / 3)], "window");
      at(list[Math.floor((list.length * 2) / 3)], "window");
    } else if (list.length >= 3) at(list[Math.floor((list.length - 1) / 2)], "window");

    let run: Edge[] = [];
    const flush = () => {
      if (!run.length) return;
      const e = run[0];
      const s0 = run[0].start;
      const s1 = run[run.length - 1].start + 1;
      walls.push({
        ...(e.vertical ? { x0: e.line, z0: s0, x1: e.line, z1: s1 } : { x0: s0, z0: e.line, x1: s1, z1: e.line }),
        outer: e.outer,
        room: e.rooms[0],
        openings: openings.filter((o) => o.a >= s0 && o.b <= s1),
      });
      run = [];
    };
    for (const e of list) {
      if (run.length && run[run.length - 1].start + 1 !== e.start) flush();
      run.push(e);
    }
    flush();
  }

  const zones = openingZones(walls);
  return {
    floors: layout.rooms.map((r) => ({ room: r.id, x0: r.x, z0: r.z, x1: r.x + r.w, z1: r.z + r.d })),
    walls,
    furniture: layout.rooms.flatMap((r) => autoFurnish(r, zones)),
  };
}

const plans = new WeakMap<Layout, Plan>();
export function planOf(layout: Layout): Plan {
  let plan = plans.get(layout);
  if (!plan) plans.set(layout, (plan = layout.plan ?? planFromGrid(layout)));
  return plan;
}

// `lifted` pieces are left out of the boxes (they're being dragged) but still block the nav grid.
export function buildHome(layout: Layout, furniture?: Placement[], lifted?: number | null): BuiltHome {
  const plan = planOf(layout);
  furniture ??= plan.furniture;
  const kindOf = new Map(layout.rooms.map((r) => [r.id, r.kind]));
  const b = new Builder();

  let width = 0;
  let depth = 0;
  for (const f of plan.floors) {
    width = Math.max(width, f.x1);
    depth = Math.max(depth, f.z1);
    floorTiles(b.at(f.room), f, kindOf.get(f.room) ?? "storage");
  }

  renderWalls(b, plan.walls);

  const solids: Rect[] = [];
  furniture.forEach((p, i) => {
    if (i === lifted) solids.push(...solidsOf(p));
    else renderPlacement(b, p, solids, i);
  });

  const res = 0.25;
  const cells = new Map<string, number>();
  const gs = plan.walls.map(geom);
  const band = T / 2 + 0.14;
  const pad = 0.15;
  for (let fi = 0; fi * res < width; fi++)
    for (let fj = 0; fj * res < depth; fj++) {
      const cx = (fi + 0.5) * res;
      const cz = (fj + 0.5) * res;
      const floor = plan.floors.find((f) => cx > f.x0 && cx < f.x1 && cz > f.z0 && cz < f.z1);
      if (!floor) continue;
      if (solids.some(([x0, z0, x1, z1]) => cx > x0 - pad && cx < x1 + pad && cz > z0 - pad && cz < z1 + pad)) continue;
      const hitsWall = gs.some((g) => {
        const cross = g.vertical ? cx : cz;
        const along = g.vertical ? cz : cx;
        if (Math.abs(cross - g.line) >= band || along < g.s0 - band || along > g.s1 + band) return false;
        return !(g.spec.openings ?? []).some((o) => o.kind === "door" && along > o.a + 0.12 && along < o.b - 0.12);
      });
      if (hitsWall) continue;
      cells.set(cellKey(fi, fj), floor.elev ?? 0);
    }

  return {
    width,
    depth,
    boxes: b.boxes,
    nav: { res, cells },
    rooms: layout.rooms,
    plan,
    furniture,
  };
}

const STEPS: Cell[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function reachable(nav: Nav, from: Cell) {
  const start = cellKey(from[0], from[1]);
  const parent = new Map<string, string | null>([[start, null]]);
  const queue: Cell[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const step of STEPS) {
      const next: Cell = [cur[0] + step[0], cur[1] + step[1]];
      const k = cellKey(next[0], next[1]);
      if (!nav.cells.has(k) || parent.has(k)) continue;
      parent.set(k, cellKey(cur[0], cur[1]));
      queue.push(next);
    }
  }
  return { start, parent };
}

function trace(parent: Map<string, string | null>, start: string, target: string): Cell[] {
  const path: Cell[] = [];
  let cur: string | null = target;
  while (cur && cur !== start) {
    path.unshift(cur.split(",").map(Number) as Cell);
    cur = parent.get(cur) ?? null;
  }
  return path;
}

export function randomWalk(nav: Nav, from: Cell): Cell[] {
  const { start, parent } = reachable(nav, from);
  const targets = [...parent.keys()].filter((k) => k !== start);
  if (!targets.length) return [];
  return trace(parent, start, targets[Math.floor(Math.random() * targets.length)]);
}

export function walkToward(nav: Nav, from: Cell, x: number, z: number, spread = 0): Cell[] {
  const { start, parent } = reachable(nav, from);
  const dist = (k: string) => {
    const [i, j] = k.split(",").map(Number);
    return Math.hypot((i + 0.5) * nav.res - x, (j + 0.5) * nav.res - z);
  };
  const keys = [...parent.keys()];
  const best = Math.min(...keys.map(dist));
  const near = keys.filter((k) => dist(k) <= best + spread);
  return trace(parent, start, near[Math.floor(Math.random() * near.length)]);
}
