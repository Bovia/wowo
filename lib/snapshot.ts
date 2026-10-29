import { saveAllDecor, type Spot } from "./decor";
import { loadFamily, saveFamily, type Family } from "./family";
import { loadBattery, saveBattery, type Battery } from "./battery";
import type { Scan } from "./scan";

export const LAYOUT_KEY = "wowo:my-layout";
export const SCAN_KEY = "wowo:my-scan";

export type HomePayload = {
  hostName: string;
  family: Family;
  layoutId: string | null;
  scan: Scan | null;
  furniture: Record<string, Spot[]>;
  battery: Battery | null;
};

export function collectLocal(extra?: Partial<HomePayload>): HomePayload {
  let scan: Scan | null = null;
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    scan = raw ? (JSON.parse(raw) as Scan) : null;
  } catch {
    scan = null;
  }
  const family = extra?.family ?? loadFamily();
  const host =
    extra?.hostName ??
    (family.me.name && family.me.name !== "我" ? family.me.name : "我家");
  return {
    hostName: host,
    family,
    layoutId: extra?.layoutId !== undefined ? extra.layoutId : localStorage.getItem(LAYOUT_KEY),
    scan: extra?.scan !== undefined ? extra.scan : scan,
    furniture: extra?.furniture ?? JSON.parse(localStorage.getItem("wowo:decor") ?? "{}"),
    battery: extra?.battery ?? loadBattery(),
  };
}

export function writeLocal(home: HomePayload) {
  saveFamily(home.family);
  if (home.battery) saveBattery(home.battery);
  saveAllDecor(home.furniture ?? {});
  if (home.layoutId) localStorage.setItem(LAYOUT_KEY, home.layoutId);
  else localStorage.removeItem(LAYOUT_KEY);
  if (home.scan) localStorage.setItem(SCAN_KEY, JSON.stringify(home.scan));
  else localStorage.removeItem(SCAN_KEY);
}
