"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "邮箱或密码不对",
  user_not_found: "邮箱或密码不对",
  email_address_invalid: "邮箱格式不太对",
  weak_password: "密码至少 8 位",
  user_already_exists: "这个邮箱已经有账号了，直接登录吧",
};

export function HomeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const withPassword = async (mode: "in" | "up") => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setNote(null);
    let code: string | undefined;
    let failed = false;
    // Neon 的客户端有时返回 error，有时直接抛（比如密码错），两种都要接住
    try {
      const { error } =
        mode === "up"
          ? await authClient.signUp.email({ email: email.trim(), password, name: email.trim().split("@")[0] })
          : await authClient.signIn.email({ email: email.trim(), password });
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
                  邮箱
                </label>
                <input
                  id="wowo-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@mail.com"
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
                    disabled={busy || !email.trim() || !password}
                    className="flex-1 rounded-full bg-[#6b4a35] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "…" : "登录"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !email.trim() || !password}
                    onClick={() => withPassword("up")}
                    className="flex-1 rounded-full bg-[#f6ecdf] px-3 py-2 text-sm font-semibold text-[#8b6b55] disabled:opacity-50"
                  >
                    开个账号
                  </button>
                </div>
              </form>
  );
}
