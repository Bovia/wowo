export type Snap = {
  id: string;
  photo: string;
  caption: string;
  stamp: string;
  at: number;
};

const ALBUM_KEY = "wowo:album";
const ALBUM_MAX = 12;
const PHOTO_SIZE = 720;

export function capturePhoto(source: HTMLCanvasElement): string {
  const side = Math.min(source.width, source.height) * 0.92;
  const sx = (source.width - side) / 2;
  const sy = (source.height - side) / 2;
  const out = document.createElement("canvas");
  out.width = out.height = PHOTO_SIZE;
  out.getContext("2d")!.drawImage(source, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  return out.toDataURL("image/jpeg", 0.88);
}

export function stampFor(hour: number, now = new Date()) {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `'${String(now.getFullYear()).slice(2)} ${pad(now.getMonth() + 1)} ${pad(now.getDate())}  ${pad(h)}:${pad(m)}`;
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function captionFor(ctx: {
  hour: number;
  home: string;
  cat?: string;
  room?: string;
  running?: { room: string; item: string };
}) {
  const h = ((ctx.hour % 24) + 24) % 24;
  if (ctx.cat) return pick([`${ctx.cat}在巡视领地`, `${ctx.cat}今天也很忙`, `跟拍${ctx.cat}，第一视角`, `${ctx.cat}：别拍了`]);
  const lines: string[] = [];
  if (ctx.room) lines.push(`今天的${ctx.room}`, `${ctx.room}，一切照旧`);
  if (ctx.running) lines.push(`${ctx.running.room}的${ctx.running.item}快没了，记得买`);
  if (h < 5 || h >= 22) lines.push("大家都睡了，灯还亮着一盏", "深夜的窝");
  else if (h < 8) lines.push("早安，窝窝", "天刚亮，猫先醒");
  else if (h < 11.5) lines.push("上午的光刚刚好", "今天也要好好过");
  else if (h < 14) lines.push("午饭时间到了", "中午的窝暖洋洋");
  else if (h < 17) lines.push("下午，适合发呆", "阳光挪到地板上了");
  else if (h < 19.5) lines.push("傍晚的光照进来了", "下班回窝");
  else lines.push("晚上好，窝里亮灯了", "一天结束，回窝充电");
  lines.push(`${ctx.home}的一天`);
  return pick(lines);
}

export function loadAlbum(): Snap[] {
  try {
    const raw = localStorage.getItem(ALBUM_KEY);
    return raw ? (JSON.parse(raw) as Snap[]) : [];
  } catch {
    return [];
  }
}

export function saveAlbum(album: Snap[]): Snap[] {
  let list = album.slice(0, ALBUM_MAX);
  while (list.length) {
    try {
      localStorage.setItem(ALBUM_KEY, JSON.stringify(list));
      return list;
    } catch {
      list = list.slice(0, -1);
    }
  }
  localStorage.removeItem(ALBUM_KEY);
  return list;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function renderPolaroid(snap: Pick<Snap, "photo" | "caption" | "stamp">): Promise<Blob> {
  const W = 1000;
  const pad = 56;
  const photo = W - pad * 2;
  const H = pad + photo + 230;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  g.fillStyle = "#fffdf8";
  g.fillRect(0, 0, W, H);
  g.drawImage(await loadImage(snap.photo), pad, pad, photo, photo);
  g.strokeStyle = "rgba(107, 74, 53, 0.12)";
  g.lineWidth = 2;
  g.strokeRect(pad, pad, photo, photo);

  g.font = '600 30px "Courier New", ui-monospace, monospace';
  g.textAlign = "right";
  g.textBaseline = "alphabetic";
  g.fillStyle = "rgba(255, 138, 60, 0.92)";
  g.shadowColor = "rgba(255, 120, 40, 0.6)";
  g.shadowBlur = 6;
  g.fillText(snap.stamp, pad + photo - 24, pad + photo - 24);
  g.shadowBlur = 0;

  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#5c3f2d";
  let size = 54;
  const font = (s: number) => `${s}px "Kaiti SC", "STKaiti", "KaiTi", "Hiragino Mincho ProN", serif`;
  g.font = font(size);
  while (g.measureText(snap.caption).width > photo - 40 && size > 30) g.font = font((size -= 2));
  g.fillText(snap.caption, W / 2, pad + photo + 115);

  g.font = '24px "PingFang SC", sans-serif';
  g.fillStyle = "rgba(139, 107, 85, 0.55)";
  g.textAlign = "right";
  g.fillText("窝窝", W - pad, H - 36);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/png"),
  );
}

export function shutterSound() {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const click = (at: number, freq: number, dur: number) => {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(ctx.currentTime + at);
  };
  click(0, 2400, 0.05);
  click(0.09, 1600, 0.08);
  window.setTimeout(() => ctx.close(), 600);
}
