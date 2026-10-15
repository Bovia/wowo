import type { RoomKind } from "./home";

export type Sound = "rain" | "fridge" | "purr" | "water" | "clock" | "crickets";

export const SOUND_NAME: Record<Sound, string> = {
  rain: "雨声",
  fridge: "冰箱嗡嗡",
  purr: "猫咪呼噜",
  water: "流水",
  clock: "钟表滴答",
  crickets: "夜里的虫鸣",
};

export const SOUND_FOR: Record<RoomKind, Sound> = {
  living: "rain",
  kitchen: "fridge",
  bedroom: "purr",
  bathroom: "water",
  storage: "clock",
};

type Voice = { out: GainNode; stop: () => void };

function noiseBuffer(ctx: AudioContext, brown: boolean) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else data[i] = white;
  }
  return buf;
}

function noise(ctx: AudioContext, brown: boolean) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, brown);
  src.loop = true;
  src.start();
  return src;
}

function filter(ctx: AudioContext, type: BiquadFilterType, frequency: number, Q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  return f;
}

function lfo(ctx: AudioContext, rate: number, depth: number, target: AudioParam) {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.value = depth;
  osc.connect(g).connect(target);
  osc.start();
  return osc;
}

function build(ctx: AudioContext, sound: Sound): Voice {
  const out = ctx.createGain();
  out.gain.value = 0;
  const stops: (() => void)[] = [];
  const keep = (n: AudioScheduledSourceNode) => stops.push(() => n.stop());

  if (sound === "rain") {
    const src = noise(ctx, false);
    keep(src);
    const g = ctx.createGain();
    g.gain.value = 0.22;
    src.connect(filter(ctx, "highpass", 400)).connect(filter(ctx, "lowpass", 2600)).connect(g).connect(out);
    const low = noise(ctx, true);
    keep(low);
    const lg = ctx.createGain();
    lg.gain.value = 0.35;
    low.connect(filter(ctx, "lowpass", 400)).connect(lg).connect(out);
  } else if (sound === "fridge") {
    for (const [f, v] of [
      [50, 0.08],
      [100, 0.05],
      [150, 0.015],
    ]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = v;
      osc.connect(g).connect(out);
      osc.start();
      keep(osc);
    }
    const src = noise(ctx, true);
    keep(src);
    const g = ctx.createGain();
    g.gain.value = 0.25;
    src.connect(filter(ctx, "lowpass", 260)).connect(g).connect(out);
  } else if (sound === "purr") {
    const src = noise(ctx, true);
    keep(src);
    const am = ctx.createGain();
    am.gain.value = 0.35;
    keep(lfo(ctx, 26, 0.3, am.gain));
    const breath = ctx.createGain();
    breath.gain.value = 0.6;
    keep(lfo(ctx, 0.28, 0.45, breath.gain));
    src.connect(filter(ctx, "lowpass", 340)).connect(am).connect(breath).connect(out);
  } else if (sound === "water") {
    const src = noise(ctx, false);
    keep(src);
    const bp = filter(ctx, "bandpass", 1300, 0.9);
    keep(lfo(ctx, 0.17, 500, bp.frequency));
    const g = ctx.createGain();
    g.gain.value = 0.18;
    src.connect(bp).connect(g).connect(out);
  } else {
    const period = sound === "clock" ? 1 : 0.9;
    let next = ctx.currentTime + 0.2;
    let n = 0;
    const timer = window.setInterval(() => {
      while (next < ctx.currentTime + 0.5) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        if (sound === "clock") {
          osc.type = "square";
          osc.frequency.value = n % 2 ? 1800 : 2300;
          g.gain.setValueAtTime(0.05, next);
          g.gain.exponentialRampToValueAtTime(0.0001, next + 0.03);
          osc.start(next);
          osc.stop(next + 0.04);
        } else {
          osc.frequency.value = 4300 + Math.random() * 300;
          const chirps = 3 + Math.floor(Math.random() * 3);
          g.gain.setValueAtTime(0, next);
          for (let c = 0; c < chirps; c++) {
            g.gain.linearRampToValueAtTime(0.025, next + c * 0.06 + 0.01);
            g.gain.linearRampToValueAtTime(0, next + c * 0.06 + 0.04);
          }
          osc.start(next);
          osc.stop(next + chirps * 0.06 + 0.05);
        }
        osc.connect(g).connect(out);
        next += period * (sound === "clock" ? 1 : 0.6 + Math.random() * 1.4);
        n++;
      }
    }, 120);
    stops.push(() => window.clearInterval(timer));
  }

  out.connect(ctx.destination);
  return { out, stop: () => stops.forEach((s) => s()) };
}

export class Ambience {
  private ctx: AudioContext | null = null;
  private voice: Voice | null = null;
  private sound: Sound | null = null;

  play(sound: Sound) {
    if (this.sound === sound) return;
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    this.fadeOut();
    const v = build(this.ctx, sound);
    v.out.gain.linearRampToValueAtTime(0.9, this.ctx.currentTime + 1.2);
    this.voice = v;
    this.sound = sound;
  }

  stop() {
    this.fadeOut();
    this.sound = null;
  }

  private fadeOut() {
    const v = this.voice;
    if (!v || !this.ctx) return;
    const t = this.ctx.currentTime;
    v.out.gain.cancelScheduledValues(t);
    v.out.gain.setValueAtTime(v.out.gain.value, t);
    v.out.gain.linearRampToValueAtTime(0, t + 0.8);
    window.setTimeout(() => {
      v.stop();
      v.out.disconnect();
    }, 900);
    this.voice = null;
  }
}
