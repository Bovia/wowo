import { z } from "zod";

export const receiptSchema = z.object({
  isReceipt: z.boolean().describe("这张图是不是购物订单 / 小票 / 购物车截图"),
  shop: z.string().nullable().describe("店铺或平台名，比如 盒马、京东超市；看不出就 null"),
  boughtAt: z.string().nullable().describe("下单日期 YYYY-MM-DD；看不出就 null"),
  items: z.array(
    z.object({
      name: z.string().describe("日常叫法，越短越好，比如「鸡蛋」「洗衣液」「卫衣」，不要整段商品标题"),
      spec: z.string().nullable().describe("规格，比如「30枚」「2kg」「黑色 L」；没有就 null"),
      count: z.number().int().describe("买了几件（下单数量），看不出就 1"),
      price: z.number().nullable().describe("每件的单价，单位元；看不出就 null"),
      category: z.enum(["food", "daily", "clothes", "appliance", "other"]).describe("吃的喝的 food；纸巾洗衣液这类消耗品 daily；衣服鞋包 clothes；电器数码 appliance"),
      roomKind: z
        .enum(["kitchen", "bathroom", "bedroom", "living", "storage"])
        .describe("一般放在哪类房间：吃的厨房，洗护浴室，衣服卧室，大件电器客厅，囤货收纳间"),
    }),
  ),
});

export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptLine = Receipt["items"][number];
