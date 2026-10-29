import type { InvItem, Inventory } from "./inventory";

// 云上一行：物品 + 在哪个屋 + 是不是已经拿走了
export type CloudItem = InvItem & { room: string; deleted?: boolean };

const SYNCED_KEY = "wowo:items-synced"; // id -> 上次传上去的 updatedAt
const GONE_KEY = "wowo:items-gone"; // id -> 拿走的时间，还没告诉云

type Stamps = Record<string, number>;

function read(key: string): Stamps {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as Stamps;
  } catch {
    return {};
  }
}

const write = (key: string, v: Stamps) => localStorage.setItem(key, JSON.stringify(v));

export function markGone(ids: string[], now = Date.now()) {
  if (!ids.length) return;
  const gone = read(GONE_KEY);
  for (const id of ids) gone[id] = now;
  write(GONE_KEY, gone);
}

// 还没传上去的：改过的东西 + 拿走的记录
export function pending(inv: Inventory): CloudItem[] {
  const synced = read(SYNCED_KEY);
  const out: CloudItem[] = [];
  // 以前存的东西没有时间，当作最旧的 1，只要云上没有就传
  for (const [room, items] of Object.entries(inv))
    for (const it of items) {
      const at = it.updatedAt ?? 1;
      if (at > (synced[it.id] ?? 0)) out.push({ ...it, room, updatedAt: at });
    }
  for (const [id, at] of Object.entries(read(GONE_KEY)))
    out.push({ id, room: "", name: "", color: "", updatedAt: at, deleted: true });
  return out;
}

export function markSynced(sent: CloudItem[]) {
  const synced = read(SYNCED_KEY);
  const gone = read(GONE_KEY);
  for (const it of sent) {
    synced[it.id] = it.updatedAt ?? 0;
    if (it.deleted && gone[it.id] === it.updatedAt) delete gone[it.id];
  }
  write(SYNCED_KEY, synced);
  write(GONE_KEY, gone);
}

// 云上的和本机的按 id 合，谁新听谁的。拿走的以删除记录为准。
export function merge(inv: Inventory, cloud: CloudItem[]): Inventory {
  const rooms: Record<string, InvItem[]> = {};
  const where = new Map<string, { room: string; item: InvItem }>();
  for (const [room, items] of Object.entries(inv)) for (const item of items) where.set(item.id, { room, item });
  const gone = read(GONE_KEY);
  const synced = read(SYNCED_KEY);

  for (const c of cloud) {
    const local = where.get(c.id);
    const localAt = local?.item.updatedAt ?? gone[c.id] ?? 0;
    if (localAt >= (c.updatedAt ?? 0)) continue;
    if (c.deleted) {
      where.delete(c.id);
    } else {
      const item: Partial<CloudItem> = { ...c };
      delete item.room;
      delete item.deleted;
      where.set(c.id, { room: c.room, item: item as InvItem });
    }
    delete gone[c.id];
    synced[c.id] = c.updatedAt ?? 0;
  }
  write(GONE_KEY, gone);
  write(SYNCED_KEY, synced);

  // 原来有的屋子保留（哪怕清空了），免得样板间的默认东西又冒出来
  for (const room of Object.keys(inv)) rooms[room] = [];
  for (const { room, item } of where.values()) (rooms[room] ??= []).push(item);
  return rooms;
}
