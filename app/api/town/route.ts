import { connection } from "next/server";
import { sql } from "@/lib/db";
import type { Spot } from "@/lib/decor";
import type { Family } from "@/lib/family";
import type { Scan } from "@/lib/scan";
import type { TownHome } from "@/lib/town";
import { savedHomeRef, type HomeRef } from "@/lib/visit";

const MAX = 24;

// 公开接口：镇上的人家。只有自己点了「上小镇」的才在；库存、电量、邮箱不给
export async function GET() {
  await connection();
  const rows = await sql()`
    select r.handle, h.family, h.layout_id, h.scan, h.furniture
    from residents r
    join homes h on h.user_id = r.user_id
    where h.visibility = 'public'
    order by h.updated_at desc
    limit ${MAX}
  `;
  const homes: TownHome[] = rows.map((row) => {
    const handle = String(row.handle);
    const family = row.family as Family;
    const scan = (row.scan as Scan | null) ?? null;
    const layoutId = (row.layout_id as string | null) ?? null;
    const home: HomeRef = savedHomeRef(layoutId, scan);
    const key = "s" in home ? "scan" : "d" in home ? home.d : home.t;
    const furniture = (row.furniture as Record<string, Spot[]> | null) ?? {};
    const name = family?.me?.name;
    return { handle, host: name && name !== "我" ? name : `@${handle}`, home, decor: furniture[key] ?? null, family };
  });
  return Response.json({ homes }, { headers: { "cache-control": "no-store" } });
}
