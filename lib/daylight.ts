import { Color } from "three";

export type Sky = {
  bg: string;
  sun: string;
  sunIntensity: number;
  ambient: number;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  lamps: number;
  night: boolean;
};

type Key = [hour: number, sky: Omit<Sky, "night">];

const NIGHT: Omit<Sky, "night"> = {
  bg: "#2c3047",
  sun: "#9fb4ff",
  sunIntensity: 0.35,
  ambient: 0.16,
  hemiSky: "#6f7fb8",
  hemiGround: "#2a2433",
  hemi: 0.35,
  lamps: 1,
};

const DAY: Omit<Sky, "night"> = {
  bg: "#f4ece0",
  sun: "#fff1dc",
  sunIntensity: 1.6,
  ambient: 0.5,
  hemiSky: "#fff6ea",
  hemiGround: "#d9c2a6",
  hemi: 0.6,
  lamps: 0,
};

const KEYS: Key[] = [
  [0, NIGHT],
  [5, NIGHT],
  [6.5, { bg: "#f2d9d0", sun: "#ffc3a0", sunIntensity: 0.9, ambient: 0.38, hemiSky: "#ffd9cc", hemiGround: "#c9a99a", hemi: 0.5, lamps: 0.3 }],
  [8, DAY],
  [16.5, DAY],
  [18, { bg: "#f0cfae", sun: "#ff9f5a", sunIntensity: 1.1, ambient: 0.36, hemiSky: "#ffcf9e", hemiGround: "#b98f74", hemi: 0.5, lamps: 0.45 }],
  [19.5, { bg: "#4a4566", sun: "#c49bd6", sunIntensity: 0.45, ambient: 0.2, hemiSky: "#8e7fb8", hemiGround: "#3b2f3d", hemi: 0.4, lamps: 0.9 }],
  [21, NIGHT],
  [24, NIGHT],
];

const a = new Color();
const b = new Color();
const mix = (x: string, y: string, t: number) => `#${a.set(x).lerp(b.set(y), t).getHexString()}`;
const lerp = (x: number, y: number, t: number) => x + (y - x) * t;

export function skyAt(hour: number): Sky {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, s0] = KEYS[i];
  const [h1, s1] = KEYS[i + 1];
  const t = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
  const lamps = lerp(s0.lamps, s1.lamps, t);
  return {
    bg: mix(s0.bg, s1.bg, t),
    sun: mix(s0.sun, s1.sun, t),
    sunIntensity: lerp(s0.sunIntensity, s1.sunIntensity, t),
    ambient: lerp(s0.ambient, s1.ambient, t),
    hemiSky: mix(s0.hemiSky, s1.hemiSky, t),
    hemiGround: mix(s0.hemiGround, s1.hemiGround, t),
    hemi: lerp(s0.hemi, s1.hemi, t),
    lamps,
    night: lamps > 0.6,
  };
}

export function sunPosition(hour: number): [number, number, number] {
  const h = ((hour % 24) + 24) % 24;
  const day = h >= 6 && h <= 18.5;
  if (!day) return [-10, 24, 14];
  const p = (h - 6) / 12.5;
  const az = Math.PI * (0.15 + 0.7 * p);
  const el = Math.max(0.25, Math.sin(Math.PI * p));
  return [Math.cos(az) * 22, 6 + el * 22, Math.sin(az) * 10 + 6];
}

export const nowHour = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

export const formatHour = (hour: number) => {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
