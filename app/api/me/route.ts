import { sql } from "@/lib/db";
import { ensureResident, handleProblem } from "@/lib/resident";
import { currentUser } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ handle: await ensureResident(user.id) });
}

// 改门牌号
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as { handle?: string };
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
