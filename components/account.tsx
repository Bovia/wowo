"use client";

import { clearHomeCache, homeRequest } from "@/lib/home-storage";
import { accountLabel } from "@/lib/login-id";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { isEmbed } from "@/lib/embed";
import type { Inventory } from "@/lib/inventory";
import { markSynced, pending } from "@/lib/items-sync";
import type { Snap } from "@/lib/polaroid";
import type { HomePayload } from "@/lib/snapshot";

type Status = "idle" | "pulling" | "pushing" | "ok" | "error";

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function pushHome(home: HomePayload) {
  const res = await homeRequest("/api/home", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(home),
  });
  if (!res.ok) throw new Error("push-home");
  const body = await readJson<{ handle?: string }>(res);
  return body.handle ?? null;
}

async function pushItems(inv: Inventory) {
  const list = pending(inv);
  for (let i = 0; i < list.length; i += 500) {
    const batch = list.slice(i, i + 500);
    const res = await homeRequest("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: batch }),
    });
    if (!res.ok) throw new Error("push-items");
    markSynced(batch);
  }
}

export function AccountDock({
  hidden,
  collect,
  handle,
  dirtyKey,
  onHandle,
  inventory,
}: {
  hidden: boolean;
  collect: () => HomePayload;
  handle: string | null;
  dirtyKey: string;
  onHandle: (handle: string | null) => void;
  inventory: Inventory;
}) {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("ok");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  async function deleteHome() {
    if (!window.confirm("删除我的家？户型、家具、屋内物品和相册记录将被清除。账号和门牌会保留。")) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      const response = await homeRequest("/api/home", { method: "DELETE" });
      if (!response.ok) throw new Error("delete-home");
      clearHomeCache();
      location.replace("/home");
    } catch {
      setDeleting(false);
      setDeleteError(true);
    }
  }
  const savedKey = useRef(dirtyKey);
  const latest = useRef({collect, inventory, onHandle});
  const embed = isEmbed();
  useEffect(() => { latest.current = {collect, inventory, onHandle}; }, [collect, inventory, onHandle]);

  useEffect(() => {
    if (hidden || embed || !user) return;
    const timer = window.setTimeout(async () => {
      try {
        if (savedKey.current !== dirtyKey) {
          setStatus("pushing");
          const handle = await pushHome(latest.current.collect());
          latest.current.onHandle(handle);
          savedKey.current = dirtyKey;
        }
        await pushItems(latest.current.inventory);
        setStatus("ok");
      } catch { setStatus("error"); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dirtyKey, user, hidden, embed]);

  if (hidden || embed || !user) return null;

  const signOut = async () => {
    await authClient.signOut();
    onHandle(null);
    location.replace("/town");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full px-2.5 py-1.5 text-[13px] shadow-sm backdrop-blur transition sm:px-3 sm:text-sm ${
          user ? "bg-white/75 text-[#6b4a35] hover:bg-white" : "bg-[#6b4a35] text-white hover:bg-[#5a3d2c]"
        }`}
      >
        我的家
      </button>
      {open && (
        <div className="card-pop pointer-events-auto absolute top-full left-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-[#fffaf2]/95 p-4 text-left shadow-[0_10px_30px_rgba(107,74,53,0.18)] backdrop-blur">
          {user ? (
            <>
              <p className="text-sm font-semibold text-[#6b4a35]">{accountLabel(user.email) ?? user.name}</p>
              <p className="mt-1 text-xs text-[#8b6b55]">
                {status === "ok"
                  ? "这座窝已经跟着账号走了，换手机也能打开。"
                  : status === "error"
                    ? "这次没同步上，待会再试试。"
                    : "正在把家里人存到云上…"}
              </p>
              {handle && <HandleRow handle={handle} onChange={onHandle} />}
              {handle && <TownSwitch />}
              <button onClick={deleteHome} disabled={deleting} className="mt-3 block text-xs text-red-700">
                {deleting ? "正在删除…" : "删除这个家"}
              </button>
              {deleteError && <p role="alert" className="text-xs">删除失败，请刷新后重试。</p>}
              <button
                onClick={signOut}
                className="mt-3 rounded-full bg-[#f6ecdf] px-3 py-1.5 text-xs font-semibold text-[#8b6b55] hover:bg-[#efe1cc]"
              >
                退出登录
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export async function cloudKeepPhoto(snap: Snap) {
  if (isEmbed()) return;
  const { data } = await authClient.getSession();
  if (!data?.user) return;
  await homeRequest("/api/photos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(snap),
  });
}

export async function cloudDropPhoto(id: string) {
  if (isEmbed()) return;
  const { data } = await authClient.getSession();
  if (!data?.user) return;
  await homeRequest(`/api/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// 门牌号：镇上别人认得你的名字，串门链接就是 /@门牌号
function HandleRow({ handle, onChange }: { handle: string; onChange: (handle: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(handle);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const save = async () => {
    const next = draft.trim().toLowerCase();
    if (next === handle) return setEditing(false);
    setBusy(true);
    setNote(null);
    try {
      const res = await homeRequest("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: next }),
      });
      const body = await readJson<{ handle?: string; message?: string }>(res);
      if (!res.ok || !body.handle) {
        setNote(body.message ?? "没改成，待会再试");
        return;
      }
      onChange(body.handle);
      setEditing(false);
    } catch {
      setNote("没改成，待会再试");
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#f6ecdf] px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] text-[#a2866f]">门牌号</p>
          <p className="truncate text-sm font-semibold text-[#6b4a35]">@{handle}</p>
        </div>
        <button
          onClick={() => {
            setDraft(handle);
            setNote(null);
            setEditing(true);
          }}
          className="shrink-0 text-xs font-semibold text-[#ff8a5b]"
        >
          改
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="block text-[11px] text-[#a2866f]" htmlFor="wowo-handle">
        门牌号（朋友串门用）
      </label>
      <div className="mt-1 flex items-center rounded-xl border border-[#ead9c4] bg-white px-3 focus-within:border-[#ff8a5b]">
        <span className="text-base text-[#a2866f]">@</span>
        <input
          id="wowo-handle"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          // 打的时候就转小写、去掉不认的字，别等提交才报错
          onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          className="min-w-0 flex-1 bg-transparent py-2 pl-0.5 text-base text-[#6b4a35] outline-none"
        />
      </div>
      <p className={`mt-1 text-[11px] ${note ? "text-[#ff8a5b]" : "text-[#a2866f]"}`}>
        {note ?? "小写字母、数字、- 或 _，3–20 位"}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="flex-1 rounded-full bg-[#6b4a35] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "…" : "就用这个"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 rounded-full bg-[#f6ecdf] px-3 py-1.5 text-xs font-semibold text-[#8b6b55]"
        >
          算了
        </button>
      </div>
    </form>
  );
}

// 上小镇：打开了家才会出现在 /town；关着只有拿到 /@门牌号 的人能来
function TownSwitch() {
  const [on, setOn] = useState<boolean | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    homeRequest("/api/me")
      .then((r) => readJson<{ visibility?: string }>(r))
      .then((b) => !cancel && setOn(b.visibility === "public"))
      .catch(() => !cancel && setOn(false));
    return () => {
      cancel = true;
    };
  }, []);

  const flip = async () => {
    if (on === null) return;
    const next = !on;
    setOn(next);
    setNote(null);
    try {
      const res = await homeRequest("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: next ? "public" : "link" }),
      });
      if (!res.ok) throw new Error((await readJson<{ message?: string }>(res)).message ?? "");
    } catch (err) {
      setOn(!next);
      setNote((err instanceof Error && err.message) || "没改成，待会再试");
    }
  };

  return (
    <div className="mt-2 rounded-xl bg-[#f6ecdf] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#6b4a35]">上小镇</p>
          <p className="text-[11px] leading-snug text-[#a2866f]">
            {on === null ? "正在看你家在不在镇上…" : on ? "镇上的人能看到你家，点进来串门。" : "关着时，只有拿到你门牌号的人能来。"}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={!!on}
          aria-label="上小镇"
          disabled={on === null}
          onClick={flip}
          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${on ? "bg-[#ff8a5b]" : "bg-[#d9c6b0]"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      {note && <p className="mt-1 text-[11px] text-[#ff8a5b]">{note}</p>}
      <Link href="/town" className="mt-1.5 inline-block text-[11px] font-semibold text-[#ff8a5b]">
        去镇上逛逛 →
      </Link>
    </div>
  );
}
