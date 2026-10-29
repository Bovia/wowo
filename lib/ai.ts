import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import { z } from "zod";

// 看图出结构化数据。有百炼的 key 就走通义千问（国内付款方便、新人有免费额度），
// 否则走 Vercel AI Gateway。
const QWEN_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = "qwen3-vl-plus";

export function aiReady() {
  return Boolean(process.env.DASHSCOPE_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export async function readImage<S extends z.ZodType>({
  prompt,
  schema,
  image,
  mediaType,
  gatewayModel,
}: {
  prompt: string;
  schema: S;
  image: Uint8Array;
  mediaType: string;
  gatewayModel: string;
}): Promise<z.infer<S>> {
  const key = process.env.DASHSCOPE_API_KEY;
  const qwen = key
    ? createOpenAICompatible({ name: "qwen", apiKey: key, baseURL: process.env.DASHSCOPE_BASE_URL || QWEN_BASE })
    : null;
  // 百炼的严格 schema 模式只有部分模型支持，这里用 JSON 模式 + 把 schema 写进提示词，哪个模型都认
  const text = qwen
    ? `${prompt}\n\n只输出一个 JSON 对象，不要别的文字，字段按这个 JSON Schema：\n${JSON.stringify(z.toJSONSchema(schema))}`
    : prompt;
  const { output } = await generateText({
    model: qwen ? qwen(process.env.QWEN_VL_MODEL || QWEN_MODEL) : gatewayModel,
    output: Output.object({ schema }),
    // 思考模式下百炼不给 JSON 模式，关掉
    providerOptions: qwen ? { qwen: { enable_thinking: false } } : undefined,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          { type: "file", mediaType, data: image },
        ],
      },
    ],
  });
  return output as z.infer<S>;
}

// 认图失败的原因，给前端换成人话。免费额度用完（开了「用完即停」）时百炼回 403 AllocationQuota.FreeTierOnly
export function aiFailure(err: unknown): "quota" | "failed" {
  const seen: unknown[] = [];
  const walk = (e: unknown): boolean => {
    if (!e || typeof e !== "object" || seen.includes(e)) return false;
    seen.push(e);
    const x = e as { message?: unknown; responseBody?: unknown; data?: unknown; cause?: unknown; lastError?: unknown; errors?: unknown };
    const text = `${String(x.message ?? "")} ${String(x.responseBody ?? "")} ${JSON.stringify(x.data ?? "")}`;
    if (/FreeTierOnly|AllocationQuota/i.test(text)) return true;
    return [x.cause, x.lastError, ...(Array.isArray(x.errors) ? x.errors : [])].some(walk);
  };
  return walk(err) ? "quota" : "failed";
}
