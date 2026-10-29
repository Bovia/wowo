import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";

export const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{2,19}$/;

// 以后可能要用的路径名，门牌号不许占
const RESERVED = new Set(["api", "u", "town", "admin", "wowo", "login", "me", "help", "about", "settings"]);

export function handleProblem(handle: string): string | null {
  if (!HANDLE_RE.test(handle)) return "3–20 位小写字母、数字、- 或 _，字母或数字开头";
  if (RESERVED.has(handle)) return "这个门牌号留着有用，换一个吧";
  return null;
}

function randomHandle() {
  return `wo${randomBytes(4).toString("hex").slice(0, 6)}`;
}

export async function handleOf(userId: string): Promise<string | null> {
  const rows = await sql()`select handle from residents where user_id = ${userId}::uuid`;
  return rows[0] ? String(rows[0].handle) : null;
}

// 第一次存家时发一个随机门牌号，不从邮箱拼，免得把邮箱露出去
export async function ensureResident(userId: string): Promise<string> {
  const existing = await handleOf(userId);
  if (existing) return existing;
  for (let i = 0; i < 5; i++) {
    const rows = await sql()`
      insert into residents (user_id, handle)
      values (${userId}::uuid, ${randomHandle()})
      on conflict do nothing
      returning handle
    `;
    if (rows[0]) return String(rows[0].handle);
    const raced = await handleOf(userId);
    if (raced) return raced;
  }
  throw new Error("no-handle");
}
