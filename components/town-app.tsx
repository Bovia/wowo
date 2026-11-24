"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const Town = dynamic(() => import("./town-corner"), {
  ssr: false,
  loading: () => <div className="wowo-bg h-dvh w-full" />,
});

const Residents = dynamic(() => import("./town"), { ssr: false });
function TownEntry() {
  const query = useSearchParams();
  return query.has("at") || query.has("neighbors") ? <Residents /> : <Town />;
}
const Entry = dynamic(() => Promise.resolve(TownEntry), { ssr: false });

export function TownApp() {
  return <Entry />;
}
