import type { Family } from "./family";
import type { Spot } from "./decor";
import type { Scan } from "./scan";

export type HomeRef = { d: string } | { t: string } | { s: Scan };

// Everything a friend needs to look around; inventory stays private.
export type VisitCard = { v: 1; host: string; home: HomeRef; decor: Spot[] | null; family: Family };

const PREFIX = "#visit=";

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const toB64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

export async function visitLink(card: VisitCard) {
  const packed = await pipe(new TextEncoder().encode(JSON.stringify(card)), new CompressionStream("deflate-raw"));
  return `${location.origin}${location.pathname}${PREFIX}${toB64(packed)}`;
}

// 活的串门：/@门牌号，打开的是对方现在的家
export function visitHandle(): string | null {
  const m = location.pathname.match(/^\/@([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

export const liveLink = (handle: string) => `${location.origin}/@${handle}`;

export const hasVisit = () => visitHandle() !== null || location.hash.startsWith(PREFIX);

export function leaveVisit() {
  const path = visitHandle() ? "/" : location.pathname;
  history.replaceState(null, "", path + location.search);
}

async function readLive(handle: string): Promise<VisitCard | null> {
  try {
    const res = await fetch(`/api/visit/${encodeURIComponent(handle)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const { card } = (await res.json()) as { card: VisitCard };
    if (card?.v !== 1 || !card.home || !card.family?.me || !Array.isArray(card.family.cats)) return null;
    return card;
  } catch {
    return null;
  }
}

export async function readVisit(): Promise<VisitCard | null> {
  const handle = visitHandle();
  if (handle) return readLive(handle);
  if (!hasVisit()) return null;
  try {
    const raw = await pipe(fromB64(location.hash.slice(PREFIX.length)), new DecompressionStream("deflate-raw"));
    const card = JSON.parse(new TextDecoder().decode(raw)) as VisitCard;
    if (card.v !== 1 || !card.home || !card.family?.me || !Array.isArray(card.family.cats)) return null;
    return card;
  } catch {
    return null;
  }
}
