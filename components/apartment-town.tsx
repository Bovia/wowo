"use client";
import Link from "next/link";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { useLayoutEffect, useMemo, useState } from "react";
import { Solid, Plant } from "./town-corner";
import { apartmentBuilding } from "@/lib/apartment-building";
import { XIAONING_VISIT_URL } from "@/lib/visit";
import "./town-corner.css";

function FitTower(){const get=useThree(s=>s.get),size=useThree(s=>s.size);useLayoutEffect(()=>{const c=get().camera;c.zoom=Math.min(size.width/16,size.height/20);c.updateProjectionMatrix();},[get,size]);return null;}
function ApartmentScene({onSelect}:{onSelect:()=>void}) {
 const items=useMemo(()=>apartmentBuilding(),[]);
 return <><color attach="background" args={["#c2c5ca"]}/><ambientLight intensity={1}/><hemisphereLight args={["#d7e2f0","#baa58d",1.3]}/><directionalLight position={[-8,18,9]} intensity={2.3} color="#ffe4c4" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={18} shadow-camera-bottom={-15} shadow-normalBias={.035}/>
 <group onClick={e=>{if(e.delta<6){e.stopPropagation();onSelect();}}}><Solid items={items}/></group>
 {[-4.2,4.2].flatMap(x=>[-2.8,0,2.6].map(z=><Plant key={`${x},${z}`} position={[x,.2,z]} small={false}/>))}
 <Html position={[3.2,6.4,1.9]} zIndexRange={[20,0]} center><button className="apartment-door" onClick={onSelect}>小宁的家 <span>边户 · 来串门 ↗</span></button></Html>
 <ContactShadows position={[0,-.59,0]} scale={30} opacity={.3} blur={2.7} far={18} frames={1}/><OrbitControls makeDefault target={[0,6.4,0]} enablePan={false} minZoom={12} maxZoom={100} minPolarAngle={.65} maxPolarAngle={1.4}/><FitTower/></>;
}
export default function ApartmentTown(){const [reset,setReset]=useState(0);
 function visit(){location.assign(XIAONING_VISIT_URL);}
 return <main className="wowo-corner-page"><Canvas key={reset} orthographic shadows dpr={[1,1.75]} camera={{position:[18,16,23],zoom:38,near:.1,far:100}}><ApartmentScene onSelect={visit}/></Canvas>
 <header className="wowo-corner-header"><Link href="/town" className="wowo-corner-brand">窝窝<span>镇</span></Link><div className="wowo-corner-weather">公寓区 · 新邻居</div><nav className="wowo-corner-nav"><Link href="/town" className="wowo-corner-home">← 晚风街</Link><Link href="/home" className="wowo-corner-home">我的家 ↗</Link></nav></header>
 <section className="wowo-corner-intro"><div className="wowo-corner-eyebrow">WOWO · APARTMENT</div><h1>万家灯火里，<br/>小宁搬来了。</h1><p>一栋高楼，一扇为朋友亮着的窗。</p></section>
 <footer className="wowo-corner-footer"><div><span className="wowo-corner-dot"/> 小宁住在这栋楼的边户<span className="wowo-corner-hint">拖动环看 · 滚轮或双指缩放 · 点亮着的门牌串门</span></div><div className="wowo-corner-controls"><button onClick={visit}>去小宁家 ↗</button><button onClick={()=>setReset(reset+1)}>↺ 初始视角</button></div></footer></main>;
}
