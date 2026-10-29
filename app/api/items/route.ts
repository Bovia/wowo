import { z } from "zod";
import { sql } from "@/lib/db";
import { currentUser } from "@/lib/session";

const item = z.object({
  id: z.string().min(1).max(80),
  room: z.string().max(80),
  name: z.string().max(60),
  count: z.number().int().min(0).max(99999).nullish(),
  note: z.string().max(200).nullish(),
  color: z.string().max(20),
  warn: z.boolean().nullish(),
  category: z.enum(["food", "daily", "clothes", "appliance", "other"]).nullish(),
  price: z.number().min(0).max(9999999).nullish(),
  boughtAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  source: z.enum(["manual", "receipt", "photo"]).nullish(),
  extra: z.record(z.string(), z.unknown()).nullish(),
  updatedAt: z.number().int().positive(),
  deleted: z.boolean().nullish(),
});

const body = z.object({ items: z.array(item).max(500) });

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sql()`
    select id, room, name, count, note, color, warn, category, price, to_char(bought_at, 'YYYY-MM-DD') as bought_at,
           source, extra, updated_at, deleted
    from items
    where user_id = ${user.id}::uuid
  `;
  // 删除记录也给，别的设备才知道要拿走
  const items = rows.map((r) => ({
    id: String(r.id),
    room: String(r.room),
    name: String(r.name),
    color: String(r.color),
    updatedAt: Number(r.updated_at),
    ...(r.deleted ? { deleted: true } : {}),
    ...(r.count !== null ? { count: Number(r.count) } : {}),
    ...(r.note ? { note: String(r.note) } : {}),
    ...(r.warn ? { warn: true } : {}),
    ...(r.category ? { category: String(r.category) } : {}),
    ...(r.price !== null ? { price: Number(r.price) } : {}),
    ...(r.bought_at ? { boughtAt: String(r.bought_at) } : {}),
    ...(r.source && r.source !== "manual" ? { source: String(r.source) } : {}),
    ...(r.extra && Object.keys(r.extra as object).length ? { extra: r.extra } : {}),
  }));
  return Response.json({ items });
}

// 批量传：每样东西只有比云上新才覆盖
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "bad-items" }, { status: 400 });
  const items = parsed.data.items;
  if (!items.length) return Response.json({ ok: true, count: 0 });
  await sql()`
    insert into items (user_id, id, room, name, count, note, color, warn, category, price, bought_at, source, extra, updated_at, deleted)
    select ${user.id}::uuid, x.id, x.room, x.name, x.count, x.note, x.color, coalesce(x.warn, false), x.category, x.price,
           x."boughtAt"::date, coalesce(x.source, 'manual'), coalesce(x.extra, '{}'::jsonb), x."updatedAt", coalesce(x.deleted, false)
    from jsonb_to_recordset(${JSON.stringify(items)}::jsonb) as x(
      id text, room text, name text, count int, note text, color text, warn boolean, category text, price numeric,
      "boughtAt" text, source text, extra jsonb, "updatedAt" bigint, deleted boolean
    )
    on conflict (user_id, id) do update set
      room = excluded.room, name = excluded.name, count = excluded.count, note = excluded.note, color = excluded.color,
      warn = excluded.warn, category = excluded.category, price = excluded.price, bought_at = excluded.bought_at,
      source = excluded.source, extra = excluded.extra, updated_at = excluded.updated_at, deleted = excluded.deleted
    where items.updated_at < excluded.updated_at
  `;
  return Response.json({ ok: true, count: items.length });
}
