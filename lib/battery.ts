export type BatteryEvent = { id: string; label: string; delta: number; at: number };
export type Battery = { level: number; at: number; log: BatteryEvent[] };

const KEY = "wowo:battery";
const PER_HOUR = 8;
export const LOW = 30;

export const DRAINS = [
  { label: "开会", delta: -15 },
  { label: "聚餐", delta: -25 },
  { label: "接电话", delta: -8 },
  { label: "回消息", delta: -4 },
  { label: "见生人", delta: -20 },
  { label: "被拉群", delta: -6 },
];

export const CHARGES = [
  { label: "撸猫", delta: 6 },
  { label: "发呆", delta: 5 },
  { label: "泡澡", delta: 10 },
  { label: "睡一觉", delta: 30 },
];

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function loadBattery(): Battery {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Battery;
  } catch {}
  return { level: 80, at: Date.now(), log: [] };
}

export function saveBattery(b: Battery) {
  localStorage.setItem(KEY, JSON.stringify(b));
}

export const levelAt = (b: Battery, now: number) => clamp(b.level + ((now - b.at) / 3_600_000) * PER_HOUR);

export function applyEvent(b: Battery, now: number, label: string, delta: number): Battery {
  const today = new Date(now).toDateString();
  const log = b.log.filter((e) => new Date(e.at).toDateString() === today);
  return {
    level: clamp(levelAt(b, now) + delta),
    at: now,
    log: [...log, { id: Math.random().toString(36).slice(2, 9), label, delta, at: now }].slice(-12),
  };
}

export const setLevel = (b: Battery, now: number, level: number): Battery => ({ ...b, level: clamp(level), at: now });

export function moodFor(level: number) {
  if (level >= 85) return "满格。今天可以出门见人了";
  if (level >= 60) return "还行，回消息没问题";
  if (level >= LOW) return "有点累了，能不说话就不说话";
  if (level >= 10) return "低电量。回窝窝着，猫会过来陪你";
  return "已关机，勿扰";
}

export const batteryColor = (level: number) => (level >= 60 ? "#7fbf7a" : level >= LOW ? "#f2b84b" : "#ff8a5b");

export const hoursToFull = (level: number) => (100 - level) / PER_HOUR;
