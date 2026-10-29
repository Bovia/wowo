import { generateText, Output } from "ai";
import { receiptSchema } from "@/lib/receipt";
import { currentUser } from "@/lib/session";

const MODEL = process.env.WOWO_RECEIPT_MODEL ?? process.env.WOWO_SCAN_MODEL ?? "google/gemini-3.5-flash";

const PROMPT = `你在读一张购物截图（淘宝、京东、拼多多、盒马、美团、超市小票等的订单或购物车），要列出买了哪些东西。

1. 每个商品一行。同一商品买了多件，count 写件数，不要拆成多行。
2. name 用日常叫法：「【官方旗舰】农夫山泉饮用天然水550ml*24瓶整箱」写成「矿泉水」，规格「550ml×24」放 spec。
3. 运费、优惠券、红包、赠品说明、推荐商品、「猜你喜欢」都不要。
4. 收件人、电话、地址、订单号这些个人信息一概不要输出。
5. 价格用这一行实付的钱；只有原价就用原价；看不清就 null。
如果这张图根本不是购物相关的截图，isReceipt=false，items 给空数组。`;

export async function POST(request: Request) {
  // 认图要花钱，登录了才给用，免得公开地址被人刷
  const user = await currentUser();
  if (!user) return Response.json({ error: "login" }, { status: 401 });
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN)
    return Response.json({ error: "no-key" }, { status: 503 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 6_000_000)
    return Response.json({ error: "bad-image" }, { status: 400 });

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: receiptSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "file", mediaType: file.type, data: new Uint8Array(await file.arrayBuffer()) },
          ],
        },
      ],
    });
    if (!output.isReceipt || !output.items.length) return Response.json({ error: "not-receipt" }, { status: 422 });
    return Response.json({ receipt: output });
  } catch (err) {
    console.error("receipt failed", err);
    const detail = process.env.NODE_ENV === "development" ? String(err) : undefined;
    return Response.json({ error: "failed", detail }, { status: 502 });
  }
}
