// 给窝窝镇建几户邻居：走本地开发服务器的接口注册、存家、改门牌号、上小镇。
// 用法：先 npm run dev，再 node scripts/seed-neighbors.mjs
// 账号密码随机生成，写进 .env.neighbors.local（被 .gitignore 挡住，不会提交）。
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";

const BASE = process.env.WOWO_BASE ?? "http://localhost:3000";
const OUT = ".env.neighbors.local";

const NEIGHBORS = [
  {
    handle: "mumu",
    layoutId: "1b1l",
    family: {
      me: { name: "木木", hair: "#2b2522", style: "long", shirt: "#e59a8c", pants: "#e8dcc8", skin: "#f6d7bd" },
      partner: null,
      cats: [{ id: "xueqiu", name: "雪球", coat: "white" }],
    },
  },
  {
    handle: "dahai",
    layoutId: "2b1l",
    family: {
      me: { name: "大海", hair: "#2b2522", style: "buzz", shirt: "#3b3f4a", pants: "#5b6f8f", skin: "#d9a77f" },
      partner: { name: "小鱼", hair: "#5a3a28", style: "bun", shirt: "#f2c76b", pants: "#3b3f4a", skin: "#f1c9a5" },
      cats: [
        { id: "huzi", name: "虎子", coat: "tabby" },
        { id: "huahua", name: "花花", coat: "calico" },
      ],
    },
  },
  {
    handle: "tangtang",
    layoutId: "3b2l",
    family: {
      me: { name: "糖糖", hair: "#c25a5a", style: "short", shirt: "#b58ad1", pants: "#3b3f4a", skin: "#f1c9a5" },
      partner: null,
      cats: [{ id: "huihui", name: "灰灰", coat: "blue" }],
    },
  },
];

async function call(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", origin: BASE, ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`);
  return { res, data: text ? JSON.parse(text) : null };
}

if (!existsSync(OUT)) writeFileSync(OUT, "# 窝窝镇邻居账号（本地文件，别提交）\n");

for (const n of NEIGHBORS) {
  const email = `wowo-neighbor-${n.handle}@example.com`;
  const password = randomBytes(9).toString("base64url");
  const { res } = await call("/api/auth/sign-up/email", { method: "POST", body: { email, password, name: n.family.me.name } });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  await call("/api/home", {
    method: "PUT",
    cookie,
    body: { hostName: n.family.me.name, family: n.family, layoutId: n.layoutId, scan: null, furniture: {}, battery: null },
  });
  await call("/api/me", { method: "PATCH", cookie, body: { handle: n.handle } });
  await call("/api/me", { method: "PATCH", cookie, body: { visibility: "public" } });
  appendFileSync(OUT, `\n# ${n.family.me.name}家 @${n.handle}\n${n.handle.toUpperCase()}_EMAIL=${email}\n${n.handle.toUpperCase()}_PASSWORD=${password}\n`);
  console.log(`✓ ${n.family.me.name}家 @${n.handle}`);
}
console.log(`账号写在 ${OUT}`);
