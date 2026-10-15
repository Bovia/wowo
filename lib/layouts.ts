import {
  boxes,
  catTree,
  counter,
  doormat,
  fridge,
  litter,
  plant,
  rugTable,
  shelf,
  shoeCabinet,
  shower,
  sofa,
  tatami,
  toilet,
  tvStand,
  vanity,
  wardrobe,
} from "./furniture";
import { T, type Layout, type Placement, type Side } from "./home";

export const DEMO_LAYOUT: Layout = {
  id: "demo",
  name: "样板间一",
  demo: true,
  rooms: [
    { id: "bedroom", name: "卧室", kind: "bedroom", x: 0, z: 0, w: 7, d: 6 },
    { id: "living", name: "客厅", kind: "living", x: 7, z: 0, w: 9, d: 6 },
    { id: "kitchen", name: "厨房", kind: "kitchen", x: 0, z: 6, w: 6, d: 6 },
    { id: "bathroom", name: "厕所", kind: "bathroom", x: 6, z: 6, w: 5, d: 6 },
    { id: "storage", name: "收纳间", kind: "storage", x: 11, z: 6, w: 5, d: 6 },
  ],
};

// From the user's floor plan: millimetres / 800, origin at the lower block's top-left wall centre line.
const XL = 0.875;
const XM = 1.25;
const XS1 = 1.913;
const XS2 = 4.338;
const XR = 5.088;
const XC = 3.663;
const XE = 7.475;
const XB = 0.95;
const XT = 2.1;
const ZP = 1.79;
const ZBAY = 4.813;
const ZM = 6.025;
const ZB = 7.81;
const ZST = 9.75;
const ZE = 11.413;
const ZCOR = 7.11;
const PLATFORM = 0.22;
const IN = T / 2;

const put = (piece: Placement["piece"], room: string, x: number, z: number, side: Side, y?: number): Placement => ({
  piece,
  room,
  x,
  z,
  side,
  y,
});

export const DEMO_LAYOUT_2: Layout = {
  id: "demo2",
  name: "样板间二",
  demo: true,
  rooms: [
    { id: "living", name: "客厅", kind: "living", x: XM, z: ZP, w: XR - XM, d: ZM - ZP },
    { id: "tatami", name: "榻榻米卧室", kind: "bedroom", x: XC, z: ZM, w: XE - XC, d: ZE - ZM },
    { id: "bath", name: "浴室", kind: "bathroom", x: 0, z: ZM, w: XB, d: ZB - ZM },
    { id: "toilet", name: "厕所", kind: "bathroom", x: XB, z: ZM, w: XT - XB, d: ZB - ZM },
    { id: "wash", name: "洗漱台", kind: "bathroom", x: XT, z: ZM, w: XC - XT, d: ZB - ZM },
    { id: "storage", name: "储藏间", kind: "storage", x: XT, z: ZB, w: XC - XT, d: ZST - ZB },
    { id: "kitchen", name: "厨房", kind: "kitchen", x: 0, z: ZB, w: XC, d: ZE - ZB },
  ],
  plan: {
    floors: [
      { room: "living", x0: XL, z0: 0, x1: XR, z1: ZP, elev: PLATFORM },
      { room: "living", x0: XM, z0: ZP, x1: XR, z1: ZM },
      { room: "tatami", x0: XR, z0: ZBAY, x1: XE, z1: ZM },
      { room: "tatami", x0: XC, z0: ZM, x1: XE, z1: ZE },
      { room: "bath", x0: 0, z0: ZM, x1: XB, z1: ZB },
      { room: "toilet", x0: XB, z0: ZM, x1: XT, z1: ZB },
      { room: "wash", x0: XT, z0: ZM, x1: XC, z1: ZB },
      { room: "storage", x0: XT, z0: ZB, x1: XC, z1: ZST },
      { room: "kitchen", x0: 0, z0: ZB, x1: XT, z1: ZE },
      { room: "kitchen", x0: XT, z0: ZST, x1: XC, z1: ZE },
    ],
    walls: [
      { x0: XL, z0: 0, x1: XR, z1: 0, outer: true, room: "living", openings: [{ a: 2.0, b: 4.5, kind: "window", sill: 0.2, top: 2.1 }] },
      { x0: XR, z0: 0, x1: XR, z1: ZBAY, outer: true, room: "living", openings: [{ a: 0.5, b: 1.55, kind: "window", sill: 0.2, top: 2.1 }] },
      { x0: XL, z0: 0, x1: XL, z1: ZP, outer: true, room: "living" },
      { x0: XL, z0: ZP, x1: XM, z1: ZP, outer: true, room: "living" },
      { x0: XM, z0: ZP, x1: XS1, z1: ZP, outer: false, room: "living" },
      { x0: XS2, z0: ZP, x1: XR, z1: ZP, outer: false, room: "living" },
      { x0: XM, z0: ZP, x1: XM, z1: ZM, outer: true, room: "living" },
      { x0: XR, z0: ZBAY, x1: XE, z1: ZBAY, outer: true, room: "tatami", openings: [{ a: 5.4, b: 7.25, kind: "window", sill: 0.2, top: 2.1 }] },
      { x0: XR, z0: ZBAY, x1: XR, z1: ZM, outer: false, room: "living" },
      { x0: 0, z0: ZM, x1: XM, z1: ZM, outer: true, room: "bath", openings: [{ a: 0.12, b: 0.82, kind: "window", sill: 1.15, top: 2.1 }] },
      { x0: XM, z0: ZM, x1: XC, z1: ZM, outer: false, room: "living" },
      { x0: XC, z0: ZM, x1: XR, z1: ZM, outer: false, room: "living", openings: [{ a: 3.95, b: 4.85, kind: "door" }] },
      { x0: XE, z0: ZBAY, x1: XE, z1: ZE, outer: true, room: "tatami" },
      { x0: 0, z0: ZM, x1: 0, z1: ZB, outer: true, room: "bath" },
      { x0: 0, z0: ZB, x1: 0, z1: ZE, outer: true, room: "kitchen", openings: [{ a: 8.0, b: 8.55, kind: "window", sill: 1.15, top: 2.1 }] },
      { x0: 0, z0: ZE, x1: XC, z1: ZE, outer: true, room: "kitchen" },
      {
        x0: XC,
        z0: ZE,
        x1: XE,
        z1: ZE,
        outer: true,
        room: "tatami",
        openings: [{ a: 4.87, b: 5.97, kind: "door", top: 2.07, leaf: "-" }],
      },
      { x0: XB, z0: ZM, x1: XB, z1: ZB, outer: false, room: "bath", openings: [{ a: 6.85, b: 7.6, kind: "door" }] },
      { x0: XT, z0: ZM, x1: XT, z1: ZB, outer: false, room: "toilet", openings: [{ a: 6.75, b: 7.55, kind: "door" }] },
      { x0: 0, z0: ZB, x1: XT, z1: ZB, outer: false, room: "kitchen" },
      { x0: XT, z0: ZB, x1: XC, z1: ZB, outer: false, room: "storage" },
      { x0: XT, z0: ZB, x1: XT, z1: ZST, outer: false, room: "storage" },
      { x0: XC, z0: ZCOR, x1: XC, z1: ZST, outer: false, room: "storage" },
      { x0: XT, z0: ZST, x1: XC, z1: ZST, outer: false, room: "storage", openings: [{ a: 2.75, b: 3.5, kind: "door" }] },
    ],
    furniture: [
      put(tvStand(1.4), "living", XL + IN, 0.25, "w", PLATFORM),
      put(sofa(1.1), "living", XR - IN - 0.9, 0.45, "e", PLATFORM),
      put(plant, "living", 3.3, IN, "n", PLATFORM),
      put(wardrobe(3.6), "living", XM + IN, 2.2, "w"),
      put(sofa(1.75), "living", XR - IN - 0.9, 2.2, "e"),
      put(rugTable, "living", 2.2, 2.9, "n"),
      put(catTree, "living", XR - IN - 0.7, 4.1, "e"),
      put(litter, "living", 2.4, ZM - IN - 0.45, "s"),
      put(shower(0.65, 1.55), "bath", IN, ZM + IN, "n"),
      put(toilet, "toilet", 1.25, ZM + IN, "n"),
      put(vanity, "wash", 2.5, ZB - IN - 0.5, "s"),
      put(shelf, "storage", XT + IN, 7.95, "w"),
      put(boxes, "storage", XC - IN - 0.6, 8.0, "e"),
      put(counter(2.9, { sink: true, stove: false }), "kitchen", IN, 8.0, "w"),
      put(counter(1.9, { sink: false, stove: true }), "kitchen", 0.75, ZE - IN - 0.62, "s"),
      put(fridge, "kitchen", XC - IN - 0.8, ZE - IN - 0.7, "s"),
      put(tatami(2.35, 3.0), "tatami", 5.025, ZM + IN, "n"),
      put(plant, "tatami", 6.8, ZBAY + IN, "n"),
      put(shoeCabinet(1.0), "tatami", XE - IN - 0.35, 10.2, "e"),
      put(doormat, "tatami", 4.97, ZE - IN - 0.55, "s"),
    ],
  },
};

export const DEMOS = [DEMO_LAYOUT, DEMO_LAYOUT_2];

export const TEMPLATES: Layout[] = [
  {
    id: "1b1l",
    name: "一室一厅",
    rooms: [
      { id: "bedroom", name: "卧室", kind: "bedroom", x: 0, z: 0, w: 7, d: 6 },
      { id: "living", name: "客厅", kind: "living", x: 7, z: 0, w: 7, d: 6 },
      { id: "kitchen", name: "厨房", kind: "kitchen", x: 0, z: 6, w: 5, d: 5 },
      { id: "bathroom", name: "厕所", kind: "bathroom", x: 5, z: 6, w: 4, d: 5 },
      { id: "storage", name: "收纳间", kind: "storage", x: 9, z: 6, w: 5, d: 5 },
    ],
  },
  {
    id: "2b1l",
    name: "两室一厅",
    rooms: [
      { id: "master", name: "主卧", kind: "bedroom", x: 0, z: 0, w: 7, d: 6 },
      { id: "second", name: "次卧", kind: "bedroom", x: 0, z: 6, w: 6, d: 6 },
      { id: "living", name: "客厅", kind: "living", x: 7, z: 0, w: 12, d: 6 },
      { id: "kitchen", name: "厨房", kind: "kitchen", x: 6, z: 6, w: 5, d: 6 },
      { id: "bathroom", name: "厕所", kind: "bathroom", x: 11, z: 6, w: 4, d: 6 },
      { id: "storage", name: "收纳间", kind: "storage", x: 15, z: 6, w: 4, d: 6 },
    ],
  },
  {
    id: "3b2l",
    name: "三室两厅",
    rooms: [
      { id: "master", name: "主卧", kind: "bedroom", x: 0, z: 0, w: 7, d: 7 },
      { id: "second", name: "次卧", kind: "bedroom", x: 0, z: 7, w: 7, d: 7 },
      { id: "study", name: "书房", kind: "bedroom", x: 7, z: 0, w: 6, d: 6 },
      { id: "kitchen", name: "厨房", kind: "kitchen", x: 7, z: 6, w: 6, d: 4 },
      { id: "bathroom", name: "厕所", kind: "bathroom", x: 7, z: 10, w: 6, d: 4 },
      { id: "living", name: "客厅", kind: "living", x: 13, z: 0, w: 7, d: 8 },
      { id: "dining", name: "餐厅", kind: "living", x: 13, z: 8, w: 7, d: 6 },
    ],
  },
];

export type Item = { name: string; note?: string; color: string; warn?: boolean };

export const DEMO_ROOMS: Record<string, { note: string; items: Item[] }> = {
  bedroom: {
    note: "衣柜先不展开，以后再说。",
    items: [
      { name: "衣柜", note: "32 件衣服", color: "#c99a6b" },
      { name: "床头的书", note: "读到第 4 章", color: "#7fa6c9" },
      { name: "粘毛滚轮", note: "猫毛克星", color: "#e88f8f" },
    ],
  },
  living: {
    note: "两只猫最常在这里睡觉。",
    items: [
      { name: "猫抓板", note: "已经抓秃了", color: "#cf9b66" },
      { name: "投影仪", color: "#3c3f44" },
      { name: "绿萝", note: "该浇水了", color: "#5f9e5a", warn: true },
    ],
  },
  kitchen: {
    note: "冰箱里的东西会自己过期、自己消失。",
    items: [
      { name: "牛奶", note: "还剩 2 天", color: "#f3f7f8", warn: true },
      { name: "鸡蛋", note: "6 个", color: "#f2d7a8" },
      { name: "草莓", note: "今天吃掉", color: "#e0525a", warn: true },
      { name: "速冻饺子", note: "2 袋", color: "#e9e4da" },
    ],
  },
  bathroom: {
    note: "消耗品快用完时，这里会轻轻亮一下。",
    items: [
      { name: "洗发水", note: "快用完了", color: "#9fd3ea", warn: true },
      { name: "卷纸", note: "4 卷", color: "#fafafa" },
      { name: "牙膏", note: "新的一支", color: "#86a98c" },
    ],
  },
  tatami: {
    note: "榻榻米下面是一排抽屉，飘窗边晒得到太阳。",
    items: [
      { name: "被子", note: "该晒一晒了", color: "#e88f8f", warn: true },
      { name: "抽屉", note: "换季衣服", color: "#e6d3b6" },
      { name: "鞋柜", note: "12 双鞋", color: "#e9dcc6" },
    ],
  },
  bath: {
    note: "窄窄的淋浴间，窗开得很高。",
    items: [
      { name: "沐浴露", note: "还剩一半", color: "#e88f8f" },
      { name: "洗发水", note: "快用完了", color: "#7fa6c9", warn: true },
    ],
  },
  toilet: {
    note: "门开在过道那边。",
    items: [
      { name: "卷纸", note: "4 卷", color: "#fafafa" },
      { name: "清洁剂", color: "#86a98c" },
    ],
  },
  wash: {
    note: "干湿分离，洗漱台在外面。",
    items: [
      { name: "牙膏", note: "新的一支", color: "#86a98c" },
      { name: "洗面奶", note: "还能用 2 周", color: "#d6ecf4" },
      { name: "毛巾", note: "两条", color: "#f2b3a6" },
    ],
  },
  storage: {
    note: "家里囤的东西都在这儿。",
    items: [
      { name: "猫粮", note: "还能吃 3 周", color: "#e2b25c" },
      { name: "猫砂", note: "2 袋", color: "#d9c7a5" },
      { name: "电池", note: "一盒", color: "#6f97bd" },
      { name: "行李箱", color: "#c7836b" },
    ],
  },
};
