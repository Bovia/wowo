import { aiFailure, aiReady, readImage } from "@/lib/ai";
import { scanSchema } from "@/lib/scan";

const MODEL = process.env.WOWO_SCAN_MODEL ?? "google/gemini-3.5-flash";

const PROMPT = `你在读一张中国常见的住宅户型图，要把它还原成结构数据。

坐标系：以整套房子最左上角的墙中线为原点，x 向右、y 向下，单位毫米。
1. 优先用图上标注的尺寸（如 2860、3300）来算坐标；没有标注时按比例估，一般卧室宽 3000–4000 毫米。
2. 每个房间用墙中线围成的矩形表示；L 形或不规则房间拆成几个矩形，同一房间的矩形互相紧贴。
3. 相邻房间共用一条墙线时，坐标要完全一致，不要留缝也不要重叠。过道、玄关也算房间（kind 用 other）。
4. 不在室内的区域（空白、外部、邻居家）不要输出。阳台算 balcony。
5. openings 列出所有门和窗，用它所在墙上的线段两端坐标表示（线段落在墙中线上）。
   - 窗：墙上的细三线或蓝色线段；落地窗（标注里窗台高接近 0 或写明落地）fullHeight=true。
   - 门：带开启弧线的缺口；入户门 kind=entry，只有一扇。
6. 忽略家具、文字说明和尺寸线本身。
如果这张图根本不是户型图，isFloorPlan=false，其余给空数组。`;

export async function POST(request: Request) {
  if (!aiReady())
    return Response.json({ error: "no-key" }, { status: 503 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !file.type.startsWith("image/"))
    return Response.json({ error: "bad-image" }, { status: 400 });

  try {
    const output = await readImage({
      prompt: PROMPT,
      schema: scanSchema,
      image: new Uint8Array(await file.arrayBuffer()),
      mediaType: file.type,
      gatewayModel: MODEL,
    });
    if (!output.isFloorPlan || !output.rooms.length) return Response.json({ error: "not-plan" }, { status: 422 });
    return Response.json({ scan: output });
  } catch (err) {
    console.error("scan failed", err);
    if (aiFailure(err) === "quota") return Response.json({ error: "quota" }, { status: 503 });
    const detail = process.env.NODE_ENV === "development" ? String(err) : undefined;
    return Response.json({ error: "failed", detail }, { status: 502 });
  }
}
