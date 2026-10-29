import type { Box } from "./home";
import type { Family } from "./family";
import type { Spot } from "./decor";
import type { HomeRef } from "./visit";

// 窝窝镇第一版：一条街，中间一个小广场，两边一户一块地。每户就是它真实的窝，缩小了摆上去。
export type TownHome = { handle: string; host: string; home: HomeRef; decor: Spot[] | null; family: Family; npc?: boolean };

// 两个样板间当最早的邻居：镇子刚开张也不空
export const NPCS: TownHome[] = [
  {
    handle: "xiaolin",
    host: "小林",
    npc: true,
    home: { d: "demo" },
    decor: null,
    family: {
      me: { name: "小林", hair: "#2b2522", style: "short", shirt: "#4f7cac", pants: "#3b3f4a", skin: "#f1c9a5" },
      partner: { name: "阿树", hair: "#3a2a22", style: "long", shirt: "#e59a8c", pants: "#3b3f4a", skin: "#f1c9a5" },
      cats: [
        { id: "mochi", name: "麻薯", coat: "cowBack" },
        { id: "sesame", name: "芝麻", coat: "cowHead" },
      ],
    },
  },
  {
    handle: "ahe",
    host: "阿禾",
    npc: true,
    home: { d: "demo2" },
    decor: null,
    family: {
      me: { name: "阿禾", hair: "#a0673e", style: "bun", shirt: "#7fae7a", pants: "#8a7259", skin: "#f6d7bd" },
      partner: null,
      cats: [{ id: "orange", name: "橘子", coat: "orange" }],
    },
  },
];

export const PLOT_W = 7.2;
export const PLOT_D = 6.4;
export const PLAZA = 5.5;
const PLAZA_D = 4.2; // 广场从人行道往里铺多深
export const STREET = 1.1; // 半宽
export const WALK = 0.6; // 人行道宽
export const LOT_MAX = { w: 5.2, d: 3.9 }; // 房子本身；剩下的地方是前院

export type Plot = { x: number; z: number; side: -1 | 1 };

// 第 i 户放哪：广场左右两边、街的南北两边轮着排，近的先排
export function plotAt(i: number): Plot {
  const col = Math.floor(i / 4);
  const q = i % 4;
  const side: -1 | 1 = q < 2 ? -1 : 1;
  const dir = q % 2 === 0 ? -1 : 1;
  return { x: dir * (PLAZA / 2 + PLOT_W / 2 + col * PLOT_W), z: side * (STREET + WALK + 0.4 + PLOT_D / 2), side };
}

// 北边（离镜头远的那边）再留一条地放高楼，不挡房子
export const BACK = 4.6;
export const TOWER_MAX = 7.2;

export function townSize(n: number) {
  const cols = Math.max(1, Math.ceil(n / 4));
  return { halfW: PLAZA / 2 + cols * PLOT_W + 1.5, halfD: STREET + WALK + 0.4 + PLOT_D + 1.2, back: BACK };
}

const TOWER_COLORS = [0xf1e4cf, 0xd9e2e8, 0xf0d6d0, 0xe4e0cf, 0xd6e3d4];
const AWNINGS = [0xc86b4f, 0x4f8a8b, 0xd9a441, 0xb5677d];

// 一栋公寓楼：朝镜头的两面（南面、东面）开窗，楼顶一圈女儿墙加水箱，一楼一条遮阳棚
function tower(cx: number, cz: number, w: number, d: number, floors: number, color: number, i: number, lit: boolean): Box[] {
  const fh = 0.62;
  const h = 0.4 + floors * fh;
  const out: Box[] = [box(cx - w / 2, 0, cz - d / 2, cx + w / 2, h, cz + d / 2, color)];
  out.push(box(cx - w / 2 - 0.05, h, cz - d / 2 - 0.05, cx + w / 2 + 0.05, h + 0.18, cz + d / 2 + 0.05, shade(color, 0.85)));
  out.push(box(cx - w / 2 + 0.4, h + 0.18, cz - d / 2 + 0.4, cx - w / 2 + 1.1, h + 0.75, cz - d / 2 + 1.1, 0x9aa3ab));
  const cols = Math.floor(w / 0.62);
  const windowColor = (f: number, c: number) => {
    const on = lit && (f * 7 + c * 13 + i * 5) % 10 < 6;
    return on ? 0xf7d98b : 0xbcd0df;
  };
  for (let f = 1; f < floors; f++) {
    const y0 = 0.4 + f * fh + 0.14;
    for (let c = 0; c < cols; c++) {
      const x = cx - w / 2 + (w / cols) * (c + 0.5);
      out.push(box(x - 0.17, y0, cz + d / 2, x + 0.17, y0 + 0.32, cz + d / 2 + 0.03, windowColor(f, c)));
    }
    const rows = Math.floor(d / 0.62);
    for (let c = 0; c < rows; c++) {
      const z = cz - d / 2 + (d / rows) * (c + 0.5);
      out.push(box(cx + w / 2, y0, z - 0.17, cx + w / 2 + 0.03, y0 + 0.32, z + 0.17, windowColor(f, c + 31)));
    }
  }
  out.push(box(cx - w / 2 - 0.05, 0.62, cz + d / 2, cx + w / 2 + 0.05, 0.7, cz + d / 2 + 0.35, AWNINGS[i % AWNINGS.length]));
  out.push(box(cx - 0.25, 0, cz + d / 2, cx + 0.25, 0.58, cz + d / 2 + 0.02, 0x6b4a35));
  return out;
}

export function towers(n: number, lit: boolean): Box[] {
  const { halfW, halfD } = townSize(n);
  const z = -halfD - BACK / 2;
  const out: Box[] = [];
  const count = Math.max(3, Math.round((halfW * 2) / 4.4));
  for (let i = 0; i < count; i++) {
    const x = -halfW + 2.2 + ((halfW * 2 - 4.4) * i) / Math.max(1, count - 1);
    const floors = 6 + ((i * 3) % 5); // 6–10 层，参差一点；别把小房子压住
    out.push(...tower(x, z, 3, 2.8, Math.min(floors, Math.floor((TOWER_MAX - 0.4) / 0.62)), TOWER_COLORS[i % TOWER_COLORS.length], i, lit));
  }
  return out;
}

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number): Box => ({
  x0,
  y0,
  z0,
  x1,
  y1,
  z1,
  color,
  room: null,
});

function tree(x: number, z: number, h = 1.6): Box[] {
  return [
    box(x - 0.12, 0, z - 0.12, x + 0.12, h * 0.45, z + 0.12, 0x8a6440),
    box(x - 0.55, h * 0.4, z - 0.55, x + 0.55, h * 0.8, z + 0.55, 0x6fa565),
    box(x - 0.38, h * 0.8, z - 0.38, x + 0.38, h, z + 0.38, 0x7fb873),
  ];
}

function lamp(x: number, z: number): Box[] {
  return [box(x - 0.05, 0, z - 0.05, x + 0.05, 1.5, z + 0.05, 0x4a4540), box(x - 0.14, 1.5, z - 0.14, x + 0.14, 1.72, z + 0.14, 0xf3dd9a)];
}

function bench(x: number, z: number, along: boolean): Box[] {
  const [w, d] = along ? [1.1, 0.35] : [0.35, 1.1];
  return [
    box(x - w / 2, 0.25, z - d / 2, x + w / 2, 0.33, z + d / 2, 0xa0703f),
    box(x - w / 2 + 0.05, 0, z - d / 2 + 0.05, x - w / 2 + 0.15, 0.25, z + d / 2 - 0.05, 0x5a4030),
    box(x + w / 2 - 0.15, 0, z - d / 2 + 0.05, x + w / 2 - 0.05, 0.25, z + d / 2 - 0.05, 0x5a4030),
  ];
}

// 地面、街、人行道、广场、树、路灯、长椅
export function scenery(n: number, lit = false): Box[] {
  const { halfW, halfD } = townSize(n);
  const out: Box[] = [
    box(-halfW, -0.35, -halfD - BACK, halfW, -0.02, halfD, 0xb08a5c),
    box(-halfW + 0.1, -0.02, -halfD - BACK + 0.1, halfW - 0.1, 0, halfD - 0.1, 0xa9c98b),
    // 楼前一条窄人行道
    box(-halfW + 0.1, 0, -halfD - 0.6, halfW - 0.1, 0.06, -halfD + 0.2, 0xe8dcc8),
    ...towers(n, lit),
    box(-halfW + 0.1, 0, -STREET, halfW - 0.1, 0.02, STREET, 0x9a948c),
    box(-halfW + 0.1, 0, -STREET - WALK, halfW - 0.1, 0.07, -STREET, 0xe8dcc8),
    box(-halfW + 0.1, 0, STREET, halfW - 0.1, 0.07, STREET + WALK, 0xe8dcc8),
    box(-PLAZA / 2, 0, -STREET - WALK - PLAZA_D, PLAZA / 2, 0.06, -STREET - WALK, 0xeadfc8),
    box(-PLAZA / 2, 0, STREET + WALK, PLAZA / 2, 0.06, STREET + WALK + PLAZA_D, 0xeadfc8),
  ];
  for (let x = -halfW + 1; x < halfW - 1; x += 1.4) out.push(box(x, 0.02, -0.05, x + 0.6, 0.03, 0.05, 0xf2e6c9));
  const mid = STREET + WALK + PLAZA_D / 2 + 0.4;
  out.push(...tree(0, -mid, 2.2), ...tree(0, mid, 2.2));
  out.push(...bench(-1.6, -mid, false), ...bench(1.6, -mid, false));
  out.push(...bench(-1.6, mid, false), ...bench(1.6, mid, false));
  const cols = Math.max(1, Math.ceil(n / 4));
  for (let c = 0; c <= cols; c++) {
    for (const dir of [-1, 1]) {
      const x = dir * (PLAZA / 2 + c * PLOT_W);
      out.push(...lamp(x, -STREET - WALK + 0.2), ...lamp(x, STREET + WALK - 0.2));
    }
  }
  return out;
}

// ---------- 让小房子更像个家：屋顶、前院 ----------

const ROOFS = [0xc86b4f, 0x4f8a8b, 0xd9a441, 0xb5677d, 0x5f7fb0, 0x7d9a5a];

// 按在镇上的顺序轮着上色，挨着的两家不会撞色
export const roofColor = (index: number) => ROOFS[index % ROOFS.length];

const shade = (c: number, k: number) => {
  const r = Math.round(((c >> 16) & 255) * k);
  const g = Math.round(((c >> 8) & 255) * k);
  const b = Math.round((c & 255) * k);
  return (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b);
};

// 一层层收进去的方块坡屋顶，沿长边起脊，带个烟囱。y 从 0 起，摆的时候整体抬到墙顶
export function roofBoxes(cx: number, cz: number, w: number, d: number, color: number): Box[] {
  const out: Box[] = [];
  const over = 0.18;
  const alongX = w >= d;
  const span = (alongX ? d : w) / 2 + over;
  const len = (alongX ? w : d) / 2 + over;
  const layers = 5;
  const step = span / layers;
  const h = 0.16;
  for (let k = 0; k < layers; k++) {
    const half = span - k * step;
    const c = k % 2 ? shade(color, 0.86) : color;
    out.push(
      alongX
        ? box(cx - len, k * h, cz - half, cx + len, (k + 1) * h, cz + half, c)
        : box(cx - half, k * h, cz - len, cx + half, (k + 1) * h, cz + len, c),
    );
  }
  out.push(
    alongX
      ? box(cx - len, layers * h, cz - 0.08, cx + len, layers * h + 0.08, cz + 0.08, shade(color, 0.7))
      : box(cx - 0.08, layers * h, cz - len, cx + 0.08, layers * h + 0.08, cz + len, shade(color, 0.7)),
  );
  const chx = cx + (alongX ? len * 0.5 : span * 0.35);
  const chz = cz + (alongX ? span * 0.35 : len * 0.5);
  out.push(box(chx - 0.12, 0, chz - 0.12, chx + 0.12, layers * h + 0.35, chz + 0.12, 0x8a5a44));
  out.push(box(chx - 0.15, layers * h + 0.35, chz - 0.15, chx + 0.15, layers * h + 0.42, chz + 0.15, 0x6b4636));
  return out;
}

const FLOWERS = [0xf28b82, 0xfbbc04, 0xf6aea9, 0xffffff, 0xc58af9];

// 房子靠里摆，前面留院子。side=-1 在街北（z 负），离街越远 z 越小
export const backOf = (p: Plot) => p.z + (p.side * PLOT_D) / 2 - p.side * 0.3;
export const frontOf = (p: Plot) => p.z - (p.side * PLOT_D) / 2 + p.side * 0.3;
export const houseZ = (p: Plot, d: number) => backOf(p) - p.side * (0.3 + d / 2);

// 前院：围栏（朝街留个口）、石板路、信箱、灌木和小花
export function yardBoxes(p: Plot, d: number, seed: number): Box[] {
  const out: Box[] = [];
  const x0 = p.x - PLOT_W / 2 + 0.35;
  const x1 = p.x + PLOT_W / 2 - 0.35;
  const zIn = backOf(p);
  const zOut = frontOf(p);
  const [za, zb] = [Math.min(zIn, zOut), Math.max(zIn, zOut)];
  const post = (x: number, z: number) => box(x - 0.05, 0, z - 0.05, x + 0.05, 0.32, z + 0.05, 0xf3ece0);
  const rail = (ax: number, az: number, bx: number, bz: number) =>
    box(Math.min(ax, bx) - 0.03, 0.18, Math.min(az, bz) - 0.03, Math.max(ax, bx) + 0.03, 0.24, Math.max(az, bz) + 0.03, 0xf3ece0);
  const gate = 0.55;
  // 三面整的，朝街那面中间留门
  for (const [ax, az, bx, bz] of [
    [x0, zIn, x1, zIn],
    [x0, za, x0, zb],
    [x1, za, x1, zb],
    [x0, zOut, p.x - gate, zOut],
    [p.x + gate, zOut, x1, zOut],
  ] as const) {
    out.push(rail(ax, az, bx, bz));
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.6));
    for (let i = 0; i <= n; i++) out.push(post(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n));
  }
  // 房子前沿到门口的石板路
  const houseFront = houseZ(p, d) - (p.side * d) / 2;
  const [pa, pb] = [Math.min(houseFront, zOut), Math.max(houseFront, zOut)];
  for (let z = pa + 0.1; z < pb - 0.05; z += 0.32) out.push(box(p.x - 0.22, 0.05, z, p.x + 0.22, 0.08, z + 0.22, 0xd6cbb8));
  // 信箱
  const mx = p.x + gate + 0.35;
  const mz = zOut + p.side * 0.25;
  out.push(box(mx - 0.03, 0, mz - 0.03, mx + 0.03, 0.42, mz + 0.03, 0x6b4a35));
  out.push(box(mx - 0.13, 0.42, mz - 0.09, mx + 0.13, 0.6, mz + 0.09, roofColor(seed + 2)));
  // 灌木和花：在院子两角
  const bushZ = (zOut + houseFront) / 2;
  for (const bx of [x0 + 0.55, x1 - 0.55]) {
    out.push(box(bx - 0.3, 0, bushZ - 0.25, bx + 0.3, 0.38, bushZ + 0.25, 0x6fa565));
    out.push(box(bx - 0.2, 0.38, bushZ - 0.16, bx + 0.2, 0.52, bushZ + 0.16, 0x7fb873));
  }
  for (let i = 0; i < 6; i++) {
    const fx = x0 + 1.1 + ((seed * 7 + i * 13) % 10) / 10 * (x1 - x0 - 2.2);
    if (Math.abs(fx - p.x) < gate + 0.2) continue;
    const fz = zOut + p.side * (0.25 + ((seed + i * 3) % 4) * 0.08);
    out.push(box(fx - 0.01, 0, fz - 0.01, fx + 0.01, 0.12, fz + 0.01, 0x5f8a4a));
    out.push(box(fx - 0.06, 0.12, fz - 0.06, fx + 0.06, 0.2, fz + 0.06, FLOWERS[(seed + i) % FLOWERS.length]));
  }
  return out;
}
