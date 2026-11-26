"use client";
import dynamic from "next/dynamic";

export const HomeScene = dynamic(() => import("./wowo"), { ssr: false });
