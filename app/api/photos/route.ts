import { sql } from "@/lib/db";
import { photoUrl, putJpeg, storageReady } from "@/lib/s3";
import { currentUser } from "@/lib/session";

const MAX = 12;

function jpegFromDataUrl(photo: string) {
  const m = photo.match(/^data:image\/\w+;base64,(.+)$/);
  if (!m) return null;
  return Buffer.from(m[1], "base64");
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sql()`
    select id, blob_url, caption, stamp, at
    from photos
    where user_id = ${user.id}
    order by at desc
    limit ${MAX}
  `;
  return Response.json({
    photos: rows.map((r) => ({
      id: String(r.id),
      photo: String(r.blob_url),
      caption: String(r.caption ?? ""),
      stamp: String(r.stamp ?? ""),
      at: Number(r.at),
    })),
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!storageReady()) return Response.json({ error: "no-storage" }, { status: 503 });
  const body = (await request.json()) as { id: string; photo: string; caption?: string; stamp?: string; at?: number };
  if (!body?.id || !body.photo) return Response.json({ error: "bad-photo" }, { status: 400 });
  const key = `${user.id}/${body.id}.jpg`;
  let url: string;
  if (body.photo.startsWith("http")) {
    // 已经在云上的照片，只认自己桶里的这一张
    if (body.photo !== photoUrl(key)) return Response.json({ error: "bad-photo" }, { status: 400 });
    url = body.photo;
  } else {
    const jpeg = jpegFromDataUrl(body.photo);
    if (!jpeg || jpeg.length > 1_500_000) return Response.json({ error: "bad-photo" }, { status: 400 });
    url = await putJpeg(key, jpeg);
  }
  const at = body.at ?? Date.now();
  await sql()`
    insert into photos (id, user_id, blob_url, caption, stamp, at)
    values (${body.id}, ${user.id}::uuid, ${url}, ${body.caption ?? ""}, ${body.stamp ?? ""}, ${at})
    on conflict (id) do update set blob_url = excluded.blob_url, caption = excluded.caption, stamp = excluded.stamp
  `;
  const extra = await sql()`
    select id from photos where user_id = ${user.id} order by at desc offset ${MAX}
  `;
  for (const row of extra) {
    await sql()`delete from photos where id = ${row.id} and user_id = ${user.id}`;
  }
  return Response.json({ photo: { ...body, photo: url, at } });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "bad-id" }, { status: 400 });
  await sql()`delete from photos where id = ${id} and user_id = ${user.id}`;
  return Response.json({ ok: true });
}
