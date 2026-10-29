import { sql } from "@/lib/db";
import { ensureResident, handleProblem } from "@/lib/resident";
import { currentUser } from "@/lib/session";

type Visibility = "private" | "link" | "public";
const VISIBILITY: Visibility[] = ["private", "link", "public"];

async function visibilityOf(userId: string): Promise<Visibility> {
  const rows = await sql()`select visibility from homes where user_id = ${userId}::uuid`;
  return (rows[0]?.visibility as Visibility | undefined) ?? "link";
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ handle: await ensureResident(user.id), visibility: await visibilityOf(user.id) });
}

// 改门牌号，或者改谁能看（public = 上小镇）
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as { handle?: string; visibility?: string };

  if (body?.visibility !== undefined) {
    if (!VISIBILITY.includes(body.visibility as Visibility)) return Response.json({ error: "bad-visibility" }, { status: 400 });
    const rows = await sql()`
      update homes set visibility = ${body.visibility} where user_id = ${user.id}::uuid returning visibility
    `;
    if (!rows.length) return Response.json({ error: "no-home", message: "家还没存到云上，等一下再试" }, { status: 409 });
    if (body.handle === undefined) return Response.json({ visibility: rows[0].visibility });
  }

  const handle = (body?.handle ?? "").trim().toLowerCase();
  const problem = handleProblem(handle);
  if (problem) return Response.json({ error: "bad-handle", message: problem }, { status: 400 });
  await ensureResident(user.id);
  const taken = await sql()`select 1 from residents where handle = ${handle} and user_id <> ${user.id}::uuid`;
  if (taken.length) return Response.json({ error: "taken", message: "这个门牌号有人用了" }, { status: 409 });
  try {
    await sql()`update residents set handle = ${handle} where user_id = ${user.id}::uuid`;
  } catch {
    return Response.json({ error: "taken", message: "这个门牌号有人用了" }, { status: 409 });
  }
  return Response.json({ handle });
}
