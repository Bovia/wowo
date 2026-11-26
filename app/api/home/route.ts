import { DEFAULT_FAMILY } from "@/lib/family";
import { sql } from "@/lib/db";
import { ensureResident } from "@/lib/resident";
import { currentUser } from "@/lib/session";
import type { HomePayload } from "@/lib/snapshot";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sql()`
    select h.instance_id, h.host_name, h.family, h.layout_id, h.scan, h.furniture, h.battery, r.handle
    from homes h
    left join residents r on r.user_id = h.user_id
    where h.user_id = ${user.id}
  `;
  const row = rows[0];
  if (!row) return Response.json({ home: null });
  const home: HomePayload = {
    hostName: String(row.host_name ?? "我家"),
    family: row.family as HomePayload["family"],
    layoutId: (row.layout_id as string | null) ?? null,
    scan: (row.scan as HomePayload["scan"]) ?? null,
    furniture: (row.furniture as HomePayload["furniture"]) ?? {},
    battery: row.battery as HomePayload["battery"],
  };
  const handle = row.handle ? String(row.handle) : await ensureResident(user.id);
  return Response.json({ home, handle, instance: row.instance_id ?? "original" });
}

export async function PUT(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as HomePayload;
  if (!body?.family) return Response.json({ error: "bad-home" }, { status: 400 });
  const host = (body.hostName || "我家").slice(0, 40);
  const updated = await sql()`
    update homes set host_name = ${host}, family = ${JSON.stringify(body.family)}::jsonb,
      layout_id = ${body.layoutId}, scan = ${body.scan ? JSON.stringify(body.scan) : null}::jsonb,
      furniture = ${JSON.stringify(body.furniture ?? {})}::jsonb, battery = ${JSON.stringify(body.battery ?? null)}::jsonb,
      updated_at = now()
    where user_id = ${user.id} and coalesce(instance_id::text, 'original') = ${request.headers.get("x-wowo-home") ?? "original"}
    returning user_id
  `;
  if (!updated.length) return Response.json({ error: "home-changed" }, { status: 409 });
  const handle = await ensureResident(user.id);
  return Response.json({ ok: true, handle });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user || request.headers.get("x-wowo-owner") !== user.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  await sql()`
    insert into homes (user_id, host_name, family, layout_id, furniture)
    values (${user.id}::uuid, '我家', ${JSON.stringify(DEFAULT_FAMILY)}::jsonb, 'demo2', '{}'::jsonb)
    on conflict (user_id) do nothing
  `;
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await currentUser(request);
  const instance = request.headers.get("x-wowo-home");
  if (!user || request.headers.get("x-wowo-owner") !== user.id || !instance)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = sql();
  const [deleted] = await db.transaction([
    db`delete from homes where user_id = ${user.id} and coalesce(instance_id::text, 'original') = ${instance}
       returning user_id`,
    db`delete from items where user_id = ${user.id} and not exists (select 1 from homes where user_id = ${user.id})`,
  ]);
  if (!deleted.length) return Response.json({ error: "home-changed" }, { status: 409 });
  return Response.json({ ok: true });
}
