"use client";

import Link from "next/link";
import { useState } from "react";
import { liveLink, visitLink, type VisitCard } from "@/lib/visit";

export function SharePanel({
  defaultHost,
  card,
  handle,
  onClose,
}: {
  defaultHost: string;
  card: (host: string) => VisitCard;
  // 登录了就有门牌号，发活的链接；没登录发快照
  handle: string | null;
  onClose: () => void;
}) {
  const [host, setHost] = useState(defaultHost);
  const [link, setLink] = useState<string | null>(handle ? liveLink(handle) : null);
  const [note, setNote] = useState<string | null>(null);
  const canShare = typeof navigator.share === "function";

  const make = async () => {
    if (handle) return liveLink(handle);
    const url = await visitLink(card(host.trim() || "朋友"));
    setLink(url);
    return url;
  };

  const copy = async () => {
    const url = link ?? (await make());
    try {
      await navigator.clipboard.writeText(url);
      setNote("复制好了，发给朋友吧");
    } catch {
      setNote("复制不了，长按下面的链接手动复制");
    }
  };

  const share = async () => {
    const url = link ?? (await make());
    try {
      await navigator.share({ title: `来${host.trim() || "我"}家串门`, url });
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-[#6b4a35]/20 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-pop w-full max-w-sm rounded-t-3xl bg-[#fffaf2] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_10px_30px_rgba(107,74,53,0.25)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#6b4a35]">请朋友来串门</h2>
          <button onClick={onClose} aria-label="关闭" className="text-xl text-[#a2866f]">
            ×
          </button>
        </div>
        {handle ? (
          <p className="mt-1 text-xs leading-relaxed text-[#a2866f]">
            朋友打开的就是你<b>现在</b>的窝，只能看不能改。你挪了家具、换了猫，他们下次来看到的也会变。物品清单不会给别人看。
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs leading-relaxed text-[#a2866f]">
              朋友打开链接就能来逛，只能看不能改。户型、摆设、家里人和猫会带上，物品清单不会。之后家里有变化，重新发一次就好。
            </p>

            <label className="mt-4 block text-sm text-[#8b6b55]">
              门牌上写
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    setLink(null);
                  }}
                  maxLength={12}
                  placeholder="比如：小林"
                  className="min-w-0 flex-1 rounded-xl border border-[#eadbc6] bg-white px-3 py-2 text-base text-[#6b4a35] outline-none focus:border-[#ff8a5b] sm:text-sm"
                />
                <span className="shrink-0 text-sm text-[#8b6b55]">的窝</span>
              </div>
            </label>
            <p className="mt-2 text-xs text-[#a2866f]">登录后会有自己的门牌号，朋友看到的就是你现在的家。</p>
          </>
        )}

        {link && (
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-3 w-full truncate rounded-xl bg-[#f6ecdf] px-3 py-2 text-xs text-[#8b6b55] outline-none"
          />
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={copy}
            className="flex-1 rounded-full bg-[#f6ecdf] py-2.5 text-sm font-semibold text-[#8b6b55] transition hover:bg-[#efe1cc]"
          >
            复制链接
          </button>
          {canShare && (
            <button onClick={share} className="flex-1 rounded-full bg-[#ff8a5b] py-2.5 text-sm font-semibold text-white">
              发给朋友
            </button>
          )}
        </div>
        {note && <p className="mt-2 text-center text-xs text-[#ff8a5b]">{note}</p>}
        <Link href="/town" className="mt-3 block text-center text-xs font-semibold text-[#a2866f] hover:text-[#6b4a35]">
          或者去镇上逛逛，看看邻居家 →
        </Link>
      </div>
    </div>
  );
}
