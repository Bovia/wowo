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
export const LOT_MAX = { w: 6, d: 5.2 };

export type Plot = { x: number; z: number; side: -1 | 1 };

// 第 i 户放哪：广场左右两边、街的南北两边轮着排，近的先排
export function plotAt(i: number): Plot {
  const col = Math.floor(i / 4);
  const q = i % 4;
  const side: -1 | 1 = q < 2 ? -1 : 1;
  const dir = q % 2 === 0 ? -1 : 1;
  return { x: dir * (PLAZA / 2 + PLOT_W / 2 + col * PLOT_W), z: side * (STREET + WALK + 0.4 + PLOT_D / 2), side };
}

export function townSize(n: number) {
  const cols = Math.max(1, Math.ceil(n / 4));
  return { halfW: PLAZA / 2 + cols * PLOT_W + 1.5, halfD: STREET + WALK + 0.4 + PLOT_D + 1.2 };
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
export function scenery(n: number): Box[] {
  const { halfW, halfD } = townSize(n);
  const out: Box[] = [
    box(-halfW, -0.35, -halfD, halfW, -0.02, halfD, 0xb08a5c),
    box(-halfW + 0.1, -0.02, -halfD + 0.1, halfW - 0.1, 0, halfD - 0.1, 0xa9c98b),
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
