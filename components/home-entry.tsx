"use client";

import { useEffect, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import { homeRequest, selectHomeInstance, selectHomeOwner } from "@/lib/home-storage";
import { writeLocal, type HomePayload } from "@/lib/snapshot";
import { loadInventory, saveInventory } from "@/lib/inventory";
import { merge, type CloudItem } from "@/lib/items-sync";
import { saveAlbum, type Snap } from "@/lib/polaroid";
import { HomeLogin } from "./home-login";
import { HomeScene } from "./client-app";

function EntryCard({title, children}: {title: string; children?: ReactNode}) {
  return (
    <main className="wowo-bg grid min-h-dvh place-items-center p-5">
      <section className="w-full max-w-sm rounded-3xl bg-[#fffaf2] p-7 text-[#6b4a35] shadow-md">
        <a href="/town" className="text-sm">← 回社区</a>
        <h1 className="my-5 text-2xl font-bold">{title}</h1>
        {children}
      </section>
    </main>
  );
}

function AccountHome({id}: {id: string}) {
  const [state, setState] = useState<"loading" | "empty" | "ready" | "error">("loading");
  const [handle, setHandle] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    selectHomeOwner(id);
    async function open() {
      try {
        const res = await homeRequest("/api/home", {signal: controller.signal});
        if (!res.ok) throw new Error("load-home");
        const { home, handle, instance } = await res.json() as {home: HomePayload | null; handle?: string; instance: string};
        if (controller.signal.aborted) return;
        if (!home) { setState("empty"); return; }
        selectHomeInstance(instance);
        const [photosRes, itemsRes] = await Promise.all([
          homeRequest("/api/photos", {signal: controller.signal}),
          homeRequest("/api/items", {signal: controller.signal}),
        ]);
        if (!photosRes.ok || !itemsRes.ok) throw new Error("load-contents");
        const [{photos}, {items}] = await Promise.all([
          photosRes.json() as Promise<{photos: Snap[]}>,
          itemsRes.json() as Promise<{items: CloudItem[]}>,
        ]);
        if (controller.signal.aborted) return;
        writeLocal(home);
        saveAlbum(photos);
        saveInventory(merge(loadInventory(), items));
        setHandle(handle ?? null);
        setState("ready");
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }
    void open();
    return () => controller.abort();
  }, [id, attempt]);

  async function create() {
    setState("loading");
    try {
      const res = await homeRequest("/api/home", {method: "POST"});
      if (!res.ok) throw new Error("create-home");
      setAttempt(n => n + 1);
    } catch { setState("error"); }
  }

  if (state === "ready") return <HomeScene owner initialHandle={handle}/>;
  if (state === "empty") return <EntryCard title="这个账号还没有家">
    <button className="rounded-full bg-[#6b4a35] px-5 py-2 text-white" onClick={create}>建立我的家</button>
  </EntryCard>;
  if (state === "error") return <EntryCard title="暂时没能打开你的家">
    <button onClick={() => {setState("loading"); setAttempt(n => n + 1);}}>重新读取</button>
  </EntryCard>;
  return <EntryCard title="正在打开你的家…" />;
}

export function HomeEntry() {
  const session = authClient.useSession();
  if (session.isPending) return <EntryCard title="正在确认账号…" />;
  const id = session.data?.user?.id;
  if (!id) return <EntryCard title="登录回我的家"><HomeLogin/></EntryCard>;
  return <AccountHome key={id} id={id}/>;
}
