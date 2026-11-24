"use client";
import Link from "next/link";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { useLayoutEffect, useMemo, useState } from "react";
import { Solid, Plant } from "./town-corner";
import { XIAONING } from "@/lib/town";
import { visitLink } from "@/lib/visit";
import "./town-corner.css";

type V=[number,number,number];
type Part={p:V;s:V;c:string;glow?:boolean};
const add=(p:V,s:V,c:string,glow=false):Part=>({p,s,c,glow});
function tower():Part[] {
 const a:Part[]=[];const floors=24,fh=.49,w=5.2,d=3.05,base=.7,h=floors*fh;
 a.push(add([0,h/2+base,0],[w,h,d],"#c8a48a"),add([0,.35,0],[w+.45,.7,d+.45],"#a0a4a1"));
 // End walls and the continuous grey window bays alternate with peach piers.
 for(let f=0;f<floors;f++) {
  const y=base+f*fh;
  for(const z of [-d/2,d/2]) {
   a.push(add([0,y,z],[w+.08,.045,.13],"#d5c6b2"));
   for(let col=0;col<7;col++) {
    const x=-2.2+col*.73;const end=col===0||col===6;const depth=end?.3:.1;
    a.push(add([x,y+.24,z+Math.sign(z)*depth/2],[.55,.36,depth],"#56656a"));
    const lit=(f*7+col*11)%13<3;
    a.push(add([x,y+.26,z+Math.sign(z)*(depth+.015)],[.44,.28,.025],lit?"#e6c797":"#859797",lit));
    a.push(add([x,y+.25,z+Math.sign(z)*(depth+.035)],[.025,.34,.025],"#bcbcaf"));
    if(end) {a.push(add([x,y+.06,z+Math.sign(z)*(depth+.04)],[.64,.08,.08],"#c9c4b2"));for(let j=0;j<5;j++)a.push(add([x-.23+j*.115,y+.13,z+Math.sign(z)*(depth+.08)],[.018,.15,.018],"#9aa4a0"));}
   }
  }
  // Exposed end unit: side windows and a projecting living-room bay.
  for(const x of [-w/2,w/2]) for(const z of [-.95,.1,.95]) {
   a.push(add([x+Math.sign(x)*.055,y+.25,z],[.12,.34,.56],"#65797d"),add([x+Math.sign(x)*.12,y+.25,z],[.025,.27,.45],"#94a5a3"));
   a.push(add([x+Math.sign(x)*.14,y+.05,z],[.3,.05,.67],"#d1b69a"));
  }
 }
 for(const x of [-2.6,-1.83,-1.1,-.37,.36,1.09,1.82,2.6]) for(const z of [-1.58,1.58])a.push(add([x,base+h/2,z],[.07,h,.09],"#dbbea0"));
 a.push(add([0,base+h+.08,0],[w+.22,.16,d+.22],"#b8b7a9"),add([0,base+h+.21,0],[w-.2,.13,d-.2],"#89958f"));
 for(const x of [-1.7,1.7]) a.push(add([x,base+h+.5,-.4],[1.1,.65,1.2],"#c8aa8e"),add([x,base+h+.85,-.4],[1.2,.08,1.3],"#d9cbb3"));
 for(const z of [-1.52,1.52])a.push(add([0,base+h+.3,z],[w,.3,.06],"#c9bba4"));
 a.push(add([0,.38,1.8],[1.3,.7,.09],"#576c70"),add([0,.81,1.97],[2,.1,.9],"#baad96"));
 for(const x of [-.82,.82])a.push(add([x,.4,2.2],[.09,.8,.09],"#b9b4a4"));
 // Entrance steps, a pedestrian court and planted verges.
 a.push(add([0,-.3,0],[12,.55,10],"#9b9f96"),add([0,.01,0],[11.9,.09,9.9],"#b9bca7"),add([0,.09,3],[4.7,.1,3.8],"#d0c6b5"));
 for(let i=0;i<3;i++)a.push(add([0,.08+i*.07,2.5-i*.2],[1.8,.15,.55],"#b7b5a8"));
 for(const x of [-4.1,4.1]) a.push(add([x,.12,0],[1.5,.15,7.8],"#8d9d82"));
 for(let i=0;i<10;i++)a.push(add([0,.146,1.3+i*.36],[4.65,.008,.018],"#b2ad9e"));
 // One selected corner apartment, rather than pretending the whole tower is a home.
 const y=base+11*fh;
 a.push(add([2.2,y+.24,1.84],[.52,.35,.035],"#ffda8f",true),add([2.72,y+.24,.95],[.035,.32,.52],"#ffda8f",true));
 return a;
}
function FitTower(){const get=useThree(s=>s.get),size=useThree(s=>s.size);useLayoutEffect(()=>{const c=get().camera;c.zoom=Math.min(size.width/16,size.height/20);c.updateProjectionMatrix();},[get,size]);return null;}
function ApartmentScene({onSelect}:{onSelect:()=>void}) {
 const items=useMemo(()=>tower(),[]);
 return <><color attach="background" args={["#c2c5ca"]}/><ambientLight intensity={1}/><hemisphereLight args={["#d7e2f0","#baa58d",1.3]}/><directionalLight position={[-8,18,9]} intensity={2.3} color="#ffe4c4" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={18} shadow-camera-bottom={-15} shadow-normalBias={.035}/>
 <group onClick={e=>{if(e.delta<6){e.stopPropagation();onSelect();}}}><Solid items={items}/></group>
 {[-4.2,4.2].flatMap(x=>[-2.8,0,2.6].map(z=><Plant key={`${x},${z}`} position={[x,.2,z]} small={false}/>))}
 <Html position={[3.2,6.4,1.9]} zIndexRange={[20,0]} center><button className="apartment-door" onClick={onSelect}>小宁的家 <span>边户 · 来串门 ↗</span></button></Html>
 <ContactShadows position={[0,-.59,0]} scale={30} opacity={.3} blur={2.7} far={18} frames={1}/><OrbitControls makeDefault target={[0,6.4,0]} enablePan={false} minZoom={12} maxZoom={100} minPolarAngle={.65} maxPolarAngle={1.4}/><FitTower/></>;
}
export default function ApartmentTown(){const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false),[reset,setReset]=useState(0);
 async function visit(){setBusy(true);setError(false);try{const n=XIAONING;const url=await visitLink({v:1,host:n.host,home:n.home,decor:n.decor,family:n.family});location.href=url.replace('/#','/?from=apartment#');}catch{setBusy(false);setError(true);}}
 return <main className="wowo-corner-page"><Canvas key={reset} orthographic shadows dpr={[1,1.75]} camera={{position:[18,16,23],zoom:38,near:.1,far:100}}><ApartmentScene onSelect={()=>setOpen(true)}/></Canvas>
 <header className="wowo-corner-header"><Link href="/town" className="wowo-corner-brand">窝窝<span>镇</span></Link><div className="wowo-corner-weather">公寓区 · 新邻居</div><nav className="wowo-corner-nav"><Link href="/town" className="wowo-corner-home">← 晚风街</Link><Link href="/" className="wowo-corner-home">我的家 ↗</Link></nav></header>
 <section className="wowo-corner-intro"><div className="wowo-corner-eyebrow">WOWO · APARTMENT</div><h1>万家灯火里，<br/>小宁搬来了。</h1><p>一栋高楼，一扇为朋友亮着的窗。</p></section>
 {open&&<aside className="wowo-corner-card apartment-card"><button className="wowo-corner-close" onClick={()=>setOpen(false)} aria-label="关闭">×</button><div className="wowo-corner-eyebrow">小宁的家 · 公寓边户</div><h2>窄窄长长，也有阳光。</h2><p>两间卧室、一个阳台。客餐厅和厨房沿着过道排开，侧面的飘窗把光带进来。</p><p>按你提供的户型图搭建，外立面参考照片。</p><button className="wowo-corner-visit" onClick={visit} disabled={busy}>{busy?"正在开门…":"去小宁家 →"}</button>{error&&<p>开门失败，请重试。</p>}</aside>}
 <footer className="wowo-corner-footer"><div><span className="wowo-corner-dot"/> 小宁住在这栋楼的边户<span className="wowo-corner-hint">拖动环看 · 滚轮或双指缩放 · 点亮着的门牌串门</span></div><div className="wowo-corner-controls"><button onClick={()=>setOpen(true)}>去小宁家 ↗</button><button onClick={()=>setReset(reset+1)}>↺ 初始视角</button></div></footer></main>;
}
