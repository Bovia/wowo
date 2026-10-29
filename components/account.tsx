"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { isEmbed } from "@/lib/embed";
import type { Snap } from "@/lib/polaroid";
import type { HomePayload } from "@/lib/snapshot";

type Status = "idle" | "pulling" | "pushing" | "ok" | "error";

// Neon Auth 归一化后的错误码
const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "邮箱或密码不对",
  user_not_found: "邮箱或密码不对",
  email_address_invalid: "邮箱格式不太对",
  weak_password: "密码至少 8 位",
  user_already_exists: "这个邮箱已经有账号了，直接登录吧",
};

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function pushHome(home: HomePayload) {
  const res = await fetch("/api/home", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(home),
  });
  if (!res.ok) throw new Error("push-home");
}

async function uploadAlbum(album: Snap[]) {
  for (const snap of album) {
    if (snap.photo.startsWith("http")) continue;
    await fetch("/api/photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(snap),
    });
  }
}

export function AccountDock({
  hidden,
  collect,
  apply,
  album,
  dirtyKey,
}: {
  hidden: boolean;
  collect: () => HomePayload;
  apply: (home: HomePayload, photos: Snap[]) => void;
  album: Snap[];
  dirtyKey: string;
}) {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const ready = useRef(false);
  const collectRef = useRef(collect);
  const applyRef = useRef(apply);
  const albumRef = useRef(album);
  const embed = isEmbed();

  useEffect(() => {
    collectRef.current = collect;
    applyRef.current = apply;
    albumRef.current = album;
  }, [collect, apply, album]);

  useEffect(() => {
    if (hidden || embed || !user || ready.current) return;
    let cancel = false;
    (async () => {
      setStatus("pulling");
      try {
        const homeRes = await fetch("/api/home");
        // 读失败不能当成「云上是空的」，否则会拿本机这份去盖
        if (!homeRes.ok) throw new Error("pull-home");
        const homeBody = await readJson<{ home: HomePayload | null }>(homeRes);
        if (cancel) return;
        if (!homeBody.home) {
          setStatus("pushing");
          await pushHome(collectRef.current());
          await uploadAlbum(albumRef.current);
        } else {
          const photosRes = await fetch("/api/photos");
          const photosBody = photosRes.ok ? await readJson<{ photos: Snap[] }>(photosRes) : { photos: [] };
          if (cancel) return;
          applyRef.current(homeBody.home, photosBody.photos ?? []);
        }
        ready.current = true;
        setStatus("ok");
      } catch {
        if (!cancel) setStatus("error");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user, hidden, embed]);

  useEffect(() => {
    if (hidden || embed || !user || !ready.current) return;
    const id = window.setTimeout(() => {
      setStatus("pushing");
      pushHome(collectRef.current())
        .then(() => setStatus("ok"))
        .catch(() => setStatus("error"));
    }, 1400);
    return () => window.clearTimeout(id);
  }, [dirtyKey, user, hidden, embed]);

  if (hidden || embed) return null;

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
    setOpen(false);
  };

  const signOut = async () => {
    ready.current = false;
    await authClient.signOut();
    setOpen(false);
    setStatus("idle");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full px-2.5 py-1.5 text-[13px] shadow-sm backdrop-blur transition sm:px-3 sm:text-sm ${
          user ? "bg-white/75 text-[#6b4a35] hover:bg-white" : "bg-[#6b4a35] text-white hover:bg-[#5a3d2c]"
        }`}
      >
        {user ? (status === "pushing" || status === "pulling" ? "同步中" : "云上的窝") : "存到云上"}
      </button>
      {open && (
        <div className="card-pop pointer-events-auto absolute top-full left-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-[#fffaf2]/95 p-4 text-left shadow-[0_10px_30px_rgba(107,74,53,0.18)] backdrop-blur sm:left-auto sm:right-0">
          {user ? (
            <>
              <p className="text-sm font-semibold text-[#6b4a35]">{user.email ?? user.name}</p>
              <p className="mt-1 text-xs text-[#8b6b55]">
                {status === "ok"
                  ? "这座窝已经跟着账号走了，换手机也能打开。"
                  : status === "error"
                    ? "这次没同步上，待会再试试。"
                    : "正在把家里人存到云上…"}
              </p>
              <button
                onClick={signOut}
                className="mt-3 rounded-full bg-[#f6ecdf] px-3 py-1.5 text-xs font-semibold text-[#8b6b55] hover:bg-[#efe1cc]"
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#6b4a35]">把窝存到云上</p>
              <p className="mt-1 text-xs leading-relaxed text-[#8b6b55]">不登录也能玩。登了之后，人和猫、家具、户型会跟着账号走。</p>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

export async function cloudKeepPhoto(snap: Snap) {
  if (isEmbed()) return;
  const { data } = await authClient.getSession();
  if (!data?.user) return;
  await fetch("/api/photos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(snap),
  });
}

export async function cloudDropPhoto(id: string) {
  if (isEmbed()) return;
  const { data } = await authClient.getSession();
  if (!data?.user) return;
  await fetch(`/api/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}
