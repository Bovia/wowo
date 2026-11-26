"use client";
import dynamic from "next/dynamic";

export const TownApp = dynamic(() => import("./town-corner"), {
  ssr: false,
  loading: () => <div className="wowo-bg h-dvh w-full" />,
});
