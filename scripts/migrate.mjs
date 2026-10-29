// 跑一个 sql/ 里的迁移文件：node --env-file=.env.local scripts/migrate.mjs sql/002_residents.sql
// 迁移文件要写成能重复跑的（if not exists / on conflict do nothing）。
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const file = process.argv[2];
if (!file || !process.env.DATABASE_URL) {
  console.error("用法：node --env-file=.env.local scripts/migrate.mjs sql/xxx.sql");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const statements = readFileSync(file, "utf8")
  .replace(/--.*$/gm, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  await sql.query(stmt);
  console.log("✓", stmt.split("\n")[0].slice(0, 80));
}
console.log(`完成：${file}`);
