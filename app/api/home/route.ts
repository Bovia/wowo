import { sql } from "@/lib/db";
import { currentUser } from "@/lib/session";
import type { HomePayload } from "@/lib/snapshot";

function slugFor(email: string | undefined, userId: string) {
  const base = (email?.split("@")[0] ?? "wowo").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "wowo";
  return `${base}-${userId.replaceAll("-", "").slice(0, 6)}`;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sql()`
    select host_name, family, layout_id, scan, furniture, inventory, battery, slug
    from homes
    where user_id = ${user.id}
  `;
  const row = rows[0];
  if (!row) return Response.json({ home: null });
  const home: HomePayload = {
    hostName: String(row.host_name ?? "我家"),
    family: row.family as HomePayload["family"],
    layoutId: (row.layout_id as string | null) ?? null,
    scan: (row.scan as HomePayload["scan"]) ?? null,
    furniture: (row.furniture as HomePayload["furniture"]) ?? {},
    inventory: (row.inventory as HomePayload["inventory"]) ?? {},
    battery: row.battery as HomePayload["battery"],
  };
  return Response.json({ home, slug: row.slug });
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as HomePayload;
  if (!body?.family) return Response.json({ error: "bad-home" }, { status: 400 });
  const slug = slugFor(user.email, user.id);
  const host = (body.hostName || "我家").slice(0, 40);
  await sql()`
    insert into homes (user_id, slug, host_name, family, layout_id, scan, furniture, inventory, battery, updated_at)
    values (
      ${user.id}::uuid,
      ${slug},
      ${host},
      ${JSON.stringify(body.family)}::jsonb,
      ${body.layoutId},
      ${body.scan ? JSON.stringify(body.scan) : null}::jsonb,
      ${JSON.stringify(body.furniture ?? {})}::jsonb,
      ${JSON.stringify(body.inventory ?? {})}::jsonb,
      ${JSON.stringify(body.battery ?? null)}::jsonb,
      now()
    )
    on conflict (user_id) do update set
      host_name = excluded.host_name,
      family = excluded.family,
      layout_id = excluded.layout_id,
      scan = excluded.scan,
      furniture = excluded.furniture,
      inventory = excluded.inventory,
      battery = excluded.battery,
      updated_at = now()
  `;
  return Response.json({ ok: true, slug });
}
