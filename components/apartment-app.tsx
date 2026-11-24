"use client";
import dynamic from "next/dynamic";
const Apartment = dynamic(()=>import("./apartment-town"),{ssr:false,loading:()=> <div className="wowo-bg h-dvh w-full"/>});
export default function ApartmentApp(){return <Apartment/>;}
