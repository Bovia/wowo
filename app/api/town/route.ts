import { connection } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  await connection();
  const homes = await sql()`
    select r.handle, coalesce(nullif(nullif(h.family->'me'->>'name','我'),''), '@' || r.handle) as host
    from residents r join homes h on h.user_id = r.user_id
    where h.visibility = 'public' order by r.handle
  `;
  return Response.json({ homes }, { headers: { "cache-control": "no-store" } });
}
