"use client";

import { HomeScene } from "./home-scene";
import { useSyncExternalStore } from "react";
import { hasVisit } from "@/lib/visit";
import { authClient } from "@/lib/auth/client";
import { HomeEntry } from "./home-entry";
import { TownApp } from "./town-app";


function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

function Landing() {
  const session = authClient.useSession();
  if (session.isPending) return <div className="wowo-bg h-dvh"/>;
  return session.data?.user ? <HomeEntry/> : <TownApp/>;
}

export function ClientApp() {
  const visiting = useSyncExternalStore(subscribe, hasVisit, () => false);
  return visiting ? <HomeScene/> : <Landing/>;
}
