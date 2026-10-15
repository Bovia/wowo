"use client";

import dynamic from "next/dynamic";

const Wowo = dynamic(() => import("./wowo"), {
  ssr: false,
  loading: () => <div className="wowo-bg h-dvh w-full" />,
});

export function ClientApp() {
  return <Wowo />;
}
