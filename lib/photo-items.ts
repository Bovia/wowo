import { z } from "zod";

export const photoSchema = z.object({
  isHome: z.boolean().describe("这张照片拍的是不是家里的东西（柜子、冰箱、桌面、架子、衣柜等）"),
  items: z.array(
    z.object({
      name: z.string().describe("日常叫法，越短越好，比如「酱油」「抽纸」「卫衣」；认不出牌子就写品类"),
      count: z.number().int().describe("能看到几件；一大堆数不清就写 1"),
      note: z.string().nullable().describe("一句话补充，比如「黑色」「还剩一半」「一些」；没有就 null"),
      low: z.boolean().describe("看起来快用完了（瓶子见底、只剩最后一包）就 true"),
      category: z.enum(["food", "daily", "clothes", "appliance", "other"]).describe("吃的喝的 food；纸巾洗衣液这类消耗品 daily；衣服鞋包 clothes；电器数码 appliance"),
      clothes: z
        .object({
          kind: z.enum(["top", "bottom", "outer", "dress", "shoes", "other"]).describe("上衣 top；裤子半裙 bottom；外套 outer；连衣裙 dress；鞋 shoes；包帽围巾 other"),
          colorName: z.string().describe("主色的中文叫法，比如「黑色」「燕麦色」「藏青」"),
          hex: z.string().describe("主色的近似色值，#rrggbb"),
          season: z.enum(["spring-autumn", "summer", "winter", "all"]).describe("春秋 spring-autumn；夏 summer；冬 winter；四季都能穿 all"),
        })
        .nullable()
        .describe("category 是 clothes 时填，其余 null"),
    }),
  ),
});

export type PhotoItems = z.infer<typeof photoSchema>;

