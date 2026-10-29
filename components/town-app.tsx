"use client";

import dynamic from "next/dynamic";

const Town = dynamic(() => import("./town"), {
  ssr: false,
  loading: () => <div className="wowo-bg h-dvh w-full" />,
});

export function TownApp() {
  return <Town />;
}
