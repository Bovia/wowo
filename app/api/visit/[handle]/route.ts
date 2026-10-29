import { sql } from "@/lib/db";
import { HANDLE_RE } from "@/lib/resident";
import type { Spot } from "@/lib/decor";
import type { Family } from "@/lib/family";
import type { Scan } from "@/lib/scan";
import type { HomeRef, VisitCard } from "@/lib/visit";

// 公开接口：任何人按门牌号来串门。只给看得见的东西，库存、电量、邮箱都不给。
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const handle = decodeURIComponent((await params).handle).toLowerCase();
  if (!HANDLE_RE.test(handle)) return Response.json({ error: "not-found" }, { status: 404 });
  const rows = await sql()`
    select h.family, h.layout_id, h.scan, h.furniture
    from residents r
    join homes h on h.user_id = r.user_id
    where r.handle = ${handle} and h.visibility <> 'private'
  `;
  const row = rows[0];
  if (!row) return Response.json({ error: "not-found" }, { status: 404 });

  const family = row.family as Family;
  const scan = (row.scan as Scan | null) ?? null;
  const layoutId = (row.layout_id as string | null) ?? null;
  // 跟前端 resolveHome 的 id 对上：扫描户型是 "scan"，模板用自己的 id，没有就落在样板间
  const [home, key]: [HomeRef, string] = scan ? [{ s: scan }, "scan"] : layoutId ? [{ t: layoutId }, layoutId] : [{ d: "demo" }, "demo"];
  const furniture = (row.furniture as Record<string, Spot[]> | null) ?? {};
  const name = family?.me?.name;
  const card: VisitCard = {
    v: 1,
    host: name && name !== "我" ? name : `@${handle}`,
    home,
    decor: furniture[key] ?? null,
    family,
  };
  return Response.json({ card, handle }, { headers: { "cache-control": "no-store" } });
}
