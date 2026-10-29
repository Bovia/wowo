import { aiFailure, aiReady, readImage } from "@/lib/ai";
import { photoSchema } from "@/lib/photo-items";
import { currentUser } from "@/lib/session";

const MODEL = process.env.WOWO_PHOTO_MODEL ?? process.env.WOWO_SCAN_MODEL ?? "google/gemini-3.5-flash";

const PROMPT = `这是一张在家里拍的照片（柜子里、冰箱里、桌面、架子、衣柜、抽屉等），要列出能看清的东西，好记进家里的物品清单。

1. 每种东西一行；同样的东西有几件，count 写几件，不要拆成多行。
2. name 用日常叫法；能看出牌子也只写品类，比如「酱油」「洗发水」「卫衣」；「鲜」「新鲜」「家用」这类修饰词去掉。
   牌子、规格写进 note。
   衣服：每件单独一行（两件黑卫衣算一行 count=2），name 写「卫衣」「牛仔裤」「风衣」这种，颜色放 clothes.colorName，不要写进 name。
3. 家具本身（柜子、桌子、架子、墙、地板）不要列，列放在里面、上面的东西。
4. 看不清、被挡住、猜不准的不要列，宁可少列也不要乱列。
5. 透明瓶子里只剩瓶底一点、袋子瘪了、只剩最后一包，low=true。
6. 照片里有人脸、证件、屏幕上的文字等个人信息，一概不要输出。
如果这张照片拍的根本不是家里的东西，isHome=false，items 给空数组。`;

export async function POST(request: Request) {
  // 认图要花钱，登录了才给用
  const user = await currentUser();
  if (!user) return Response.json({ error: "login" }, { status: 401 });
  if (!aiReady()) return Response.json({ error: "no-key" }, { status: 503 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 6_000_000)
    return Response.json({ error: "bad-image" }, { status: 400 });

  try {
    const output = await readImage({
      prompt: PROMPT,
      schema: photoSchema,
      image: new Uint8Array(await file.arrayBuffer()),
      mediaType: file.type,
      gatewayModel: MODEL,
    });
    if (!output.isHome || !output.items.length) return Response.json({ error: "not-home" }, { status: 422 });
    return Response.json({ photo: output });
  } catch (err) {
    console.error("photo items failed", err);
    if (aiFailure(err) === "quota") return Response.json({ error: "quota" }, { status: 503 });
    const detail = process.env.NODE_ENV === "development" ? String(err) : undefined;
    return Response.json({ error: "failed", detail }, { status: 502 });
  }
}
