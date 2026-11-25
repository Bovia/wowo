"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { hasVisit } from "@/lib/visit";
import { TownApp } from "./town-app";

export const HomeScene = dynamic(() => import("./wowo"), { ssr: false });

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

export function ClientApp() {
  const visiting = useSyncExternalStore(subscribe, hasVisit, () => false);
  return visiting ? <HomeScene/> : <TownApp/>;
}
