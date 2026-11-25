"use client";
import { loginIdentity } from "@/lib/login-id";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "账号或密码不对",
  user_not_found: "账号或密码不对",
  email_address_invalid: "邮箱格式不太对",
  weak_password: "密码至少 8 位",
  user_already_exists: "账号已存在，直接登录吧",
};

export function HomeLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const withPassword = async (mode: "in" | "up") => {
    if (!identifier.trim() || !password) return;
    const login = loginIdentity(identifier);
    if (!login) { setNote("用户名用 3–20 位字母、数字、下划线或短横线"); return; }
    setBusy(true);
    setNote(null);
    let code: string | undefined;
    let failed = false;
    // Neon 的客户端有时返回 error，有时直接抛（比如密码错），两种都要接住
    try {
      const { error } =
        mode === "up"
          ? await authClient.signUp.email({ ...login, password })
          : await authClient.signIn.email({ email: login.email, password });
      if (error) {
        failed = true;
        code = error.code;
      }
    } catch (e) {
      failed = true;
      code = (e as { code?: string }).code;
    }
    setBusy(false);
    if (failed) {
      setNote(AUTH_ERRORS[code ?? ""] ?? (mode === "up" ? "开账号没成功，待会再试" : "登录没成功，待会再试"));
      return;
    }
    location.replace("/home");
  };

  return (
<form
                onSubmit={(e) => {
                  e.preventDefault();
                  void withPassword("in");
                }}
              >
                <label className="mt-3 block text-xs text-[#8b6b55]" htmlFor="wowo-email">
                  用户名或邮箱
                </label>
                <input
                  id="wowo-email"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="输入用户名或邮箱"
                  className="mt-1 w-full rounded-xl border border-[#ead9c4] bg-white px-3 py-2 text-base text-[#6b4a35] outline-none focus:border-[#ff8a5b]"
                />
                <label className="mt-2 block text-xs text-[#8b6b55]" htmlFor="wowo-pass">
                  密码
                </label>
                <input
                  id="wowo-pass"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 8 位"
                  className="mt-1 w-full rounded-xl border border-[#ead9c4] bg-white px-3 py-2 text-base text-[#6b4a35] outline-none focus:border-[#ff8a5b]"
                />
                {note && <p className="mt-2 text-xs text-[#ff8a5b]">{note}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={busy || !identifier.trim() || !password}
                    className="flex-1 rounded-full bg-[#6b4a35] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "…" : "登录"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !identifier.trim() || !password}
                    onClick={() => withPassword("up")}
                    className="flex-1 rounded-full bg-[#f6ecdf] px-3 py-2 text-sm font-semibold text-[#8b6b55] disabled:opacity-50"
                  >
                    开个账号
                  </button>
                </div>
              </form>
  );
}
