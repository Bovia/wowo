"use client";

import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, Object3D, type Group, type InstancedMesh } from "three";
import { NPCS } from "@/lib/town";
import { apartmentBuilding } from "@/lib/apartment-building";
import { XIAONING_VISIT_URL, visitLink } from "@/lib/visit";
import { Parts, catParts, personParts } from "./creatures";
import "./town-corner.css";

type V = [number, number, number];
type Brick = { p: V; s: V; c: string; glow?: boolean; r?: V };
const wood = "#594b45", cream = "#c5b9a5", metal = "#535e63";
const b = (p: V, s: V, c: string, glow = false, r?: V): Brick => ({p,s,c,glow,r});
function Blocks({items, glowing = false}: {items: Brick[]; glowing?: boolean}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new Object3D(); const color = new Color();
    items.forEach((v,i) => { o.position.set(...v.p); o.scale.set(...v.s); o.rotation.set(...(v.r ?? [0,0,0])); o.updateMatrix(); m.setMatrixAt(i,o.matrix); m.setColorAt(i,color.set(v.c)); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
  },[items]);
  return <instancedMesh ref={ref} args={[undefined,undefined,items.length]} castShadow={!glowing} receiveShadow><boxGeometry/><meshStandardMaterial roughness={.78} emissive={glowing ? "#ffd39a" : "#000000"} emissiveIntensity={glowing ? .65 : 0}/></instancedMesh>;
}
export function Solid({items}: {items: Brick[]}) {
  const normal = useMemo(()=>items.filter(x=>!x.glow),[items]);
  const lit = useMemo(()=>items.filter(x=>x.glow),[items]);
  return <><Blocks items={normal}/>{lit.length > 0 && <Blocks items={lit} glowing/>}</>;
}
function building(w: number, floors: number, wall: string, roof: string, shop = false): Brick[] {
  const a: Brick[] = []; const d = 2.65, h = floors * 1.65; const front = d/2;
  a.push(b([0,h/2,0],[w,h,d],wall),b([0,.14,0],[w+.12,.28,d+.12],wood));
  for(let f=0;f<=floors;f++) a.push(b([0,f*1.65+.12,0],[w+.16,.12,d+.16],cream));
  // Windows have recessed frames, warm glass, mullions and protruding sills.
  for(let f=0;f<floors;f++) for(const x of [-w*.27,w*.27]) {
    const y=.93+f*1.65;
    a.push(b([x,y,front+.025],[.92,1.1,.07],wood),b([x,y,front+.07],[.78,.96,.035],"#efca91",true));
    for(const dx of [-.43,0,.43]) a.push(b([x+dx,y,front+.105],[.035,1.05,.05],wood));
    a.push(b([x,y+.08,front+.11],[.88,.035,.04],wood),b([x,y-.58,front+.11],[1.04,.09,.25],cream));
    // Windows along the visible side.
    a.push(b([w/2+.025,y,.12],[.06,1.06,1.1],wood),b([w/2+.065,y,.12],[.035,.9,.94],"#d5b78d",true));
    for(const z of [-.4,.12,.64]) a.push(b([w/2+.09,y,z],[.04,1.02,.04],wood));
    a.push(b([w/2+.09,y-.56,.12],[.2,.08,1.22],cream));
    if(f>0) {
      a.push(b([x,y-.48,front+.38],[1.12,.09,.6],"#737774"));
      for(let j=0;j<7;j++) a.push(b([x-.5+j/6,y-.23,front+.66],[.025,.5,.025],metal));
      a.push(b([x,y+.02,front+.66],[1.1,.035,.035],metal));
    }
  }
  // A narrow door and a small tiled stoop.
  a.push(b([0,.65,front+.07],[.48,1.15,.13],wood),b([.04,.81,front+.15],[.3,.62,.02],"#d5bb85",true),b([.18,.55,front+.19],[.05,.05,.04],"#d1ad6d"),b([0,.08,front+.35],[.85,.16,.65],cream));
  if(shop) for(let i=0;i<12;i++) a.push(b([-w/2+(i+.5)*w/12,1.53,front+.46],[w/12,.065,.95],i%2 ? "#d5bb9e":"#986957",false,[-.22,0,0]));
  // True sloping roof panels, with standing seams.
  for(const dir of [-1,1]) {
    a.push(b([0,h+.42,dir*.72],[w+.36,.13,1.68],roof,false,[dir*.43,0,0]));
    for(let x=-w/2;x<w/2+.2;x+=.27) a.push(b([x,h+.46,dir*.72],[.025,.045,1.68],"#677579",false,[dir*.43,0,0]));
  }
  a.push(b([0,h+.79,0],[w+.4,.08,.1],"#788488"),b([w*.27,h+.64,-.45],[.38,.95,.4],"#a68b77"),b([w*.27,h+1.13,-.45],[.48,.08,.48],cream));
  // Side drainpipe and air-conditioning unit.
  a.push(b([w/2+.1,h/2,-1.16],[.06,h,.06],metal),b([w/2+.22,1.75,.72],[.38,.36,.65],"#b0b7b3"));
  for(let j=0;j<5;j++) a.push(b([w/2+.42,1.63+j*.055,.72],[.015,.018,.5],"#687573"));
  return a;
}
export function Plant({position, pink=false, small=false}: {position: V; pink?:boolean; small?:boolean}) {
  return <group position={position} scale={small ? .26 : 1}>
    <mesh position={[0,.7,0]} castShadow><cylinderGeometry args={[.085,.14,1.4,7]}/><meshStandardMaterial color="#756252"/></mesh>
    {Array.from({length:22},(_,i)=> {
      const angle=i*2.399, radius=.38+(i%4)*.14;
      return <mesh key={i} position={[Math.cos(angle)*radius,1.55+(i%5)*.19,Math.sin(angle)*radius]} castShadow><icosahedronGeometry args={[.43+(i%3)*.07,1]}/><meshStandardMaterial color={pink ? ["#b79bab","#c7a7b5","#a18b9e"][i%3] : ["#7b8f77","#8a9c7c","#657d70"][i%3]} roughness={1}/></mesh>;
    })}
    <mesh position={[0,.1,0]} receiveShadow><boxGeometry args={[1.8,.2,1.6]}/><meshStandardMaterial color="#9d9c92"/></mesh>
  </group>;
}
function Street() {
  const items = useMemo(()=>{
    const a: Brick[] = [b([0,-.35,0],[15,.65,11.6],"#8b9393"),b([0,-.015,0],[14.9,.08,11.5],"#b3b0a6"),b([0,.035,3.55],[14.9,.055,3.7],"#626e77"),b([0,.13,1.25],[14.9,.22,.95],"#c0b9aa"),b([0,.1,5.55],[14.9,.16,.4],"#c0b9aa")];
    for(let i=0;i<38;i++) a.push(b([-7.3+i*.39,.252,1.25],[.015,.01,.95],"#a39f94"));
    for(let x=-7;x<7;x+=1.6) a.push(b([x,.073,3.55],[.75,.012,.055],"#d6cbb5"));
    for(let i=0;i<7;i++) a.push(b([4.8,.077,2.1+i*.43],[1.35,.015,.21],"#d9d5c6"));
    for(const z of [1.79,5.32]) a.push(b([0,.074,z],[14.8,.012,.045],"#c7b17c"));
    // Pavement railings.
    for(const x of [-6.7,-4.9,-3.1,-1.3,.5,2.3,6.8]) { a.push(b([x,.53,1.74],[.05,.8,.05],cream)); if(x<2.4) for(const y of [.4,.72]) a.push(b([x+.9,y,1.74],[1.8,.04,.04],cream)); }
    // Raised railway behind the houses, with braced piers and sleepers.
    a.push(b([0,3.95,-4.25],[15,.24,1.25],"#5a696f"));
    for(const z of [-4.65,-3.85]) a.push(b([0,4.16,z],[15,.08,.065],"#a1aaa9"));
    for(let x=-7.4;x<7.5;x+=.3) a.push(b([x,4.09,-4.25],[.09,.075,1.15],"#7e817a"));
    for(const x of [-6,-1,4]) {
      for(const z of [-4.7,-3.8]) a.push(b([x,1.95,z],[.24,3.9,.22],"#6f7c80"));
      a.push(b([x+1.3,3,-3.8],[3,.13,.13],"#718084",false,[0,0,.55]));
    }
    // Bench with separate wooden slats and back.
    for(let j=0;j<4;j++) { a.push(b([-5.15,.49,.5+j*.1],[1.5,.075,.075],"#8d6a50")); a.push(b([-5.15,.73+j*.1,.44],[1.5,.07,.075],"#98765a")); }
    for(const x of [-5.7,-4.6]) a.push(b([x,.28,.65],[.07,.5,.42],metal));
    for(const x of [-6.6,-.4,6.6]) { a.push(b([x,1.45,1.55],[.075,2.8,.075],metal),b([x+.22,2.8,1.55],[.5,.06,.08],metal),b([x+.43,2.74,1.55],[.22,.09,.2],"#ffe0a1",true)); }
    // Cafe stools and potted plants.
    for(const x of [.7,1.4,2.1]) a.push(b([x,.45,.5],[.3,.08,.3],"#9f7758"),b([x,.23,.5],[.06,.44,.06],metal));
    a.push(b([1.4,.75,.1],[2.2,.12,.48],"#a48968"));
    for(const x of [-3.7,-1.1,3.2]) a.push(b([x,.3,.65],[.4,.5,.4],"#a38a70"));
    // Small glowing vending machine.
    a.push(b([6.5,.92,-.2],[.8,1.8,.62],"#819897"),b([6.5,1.16,.12],[.63,1.03,.04],"#d5e6dd",true),b([6.5,.36,.13],[.52,.19,.035],"#3c4b51"));
    for(let i=0;i<9;i++) a.push(b([6.3+(i%3)*.2,.86+Math.floor(i/3)*.27,.16],[.09,.16,.035],["#c28a6b","#9cab82","#c4aa66"][i%3]));
    return a;
  },[]);
  return <><Solid items={items}/><Plant position={[-6,.25,-.5]} pink/><Plant position={[4.05,.12,.1]}/>{[-3.7,-1.1,3.2].map(x=><Plant key={x} position={[x,.5,.65]} small/>)}{[-6.6,-.4,6.6].map(x=><pointLight key={x} position={[x+.4,2.5,1.55]} color="#ffc080" intensity={5} distance={4} decay={2}/>)}</>;
}
function Tram({paused}: {paused:boolean}) {
  const ref=useRef<Group>(null); const t=useRef(0);
  const items=useMemo(()=> {
    const a: Brick[]=[];
    for(const x of [-1.55,1.55]) {
      a.push(b([x,.52,0],[2.9,1,.86],"#9e6558"),b([x,.76,0],[2.9,.56,.89],"#c1b7a0"),b([x,1.08,0],[3,.13,.94],"#727c7c"));
      for(let j=0;j<6;j++) a.push(b([x-1.16+j*.46,.8,.456],[.34,.33,.025],"#d7d6bc",true),b([x-1.16+j*.46,.8,-.456],[.34,.33,.025],"#d7d6bc",true));
      for(const dx of [-.95,.95]) a.push(b([x+dx,.035,0],[.38,.23,1],"#3a4448"),b([x+dx,1.2,0],[.45,.14,.48],"#a0a6a0"));
    }
    a.push(b([0,.2,0],[.35,.18,.35],metal)); return a;
  },[]);
  useFrame((_,dt)=>{if(!paused)t.current+=dt; if(ref.current) ref.current.position.x=Math.sin(t.current*.085)*4.35;});
  return <group ref={ref} position={[0,4.25,-4.25]}><Solid items={items}/></group>;
}
function Neighbor({cat=false,paused=false,index=0}:{cat?:boolean;paused?:boolean;index?:number}) {
  const ref=useRef<Group>(null); const t=useRef(index*5);
  const parts=useMemo(()=>cat ? catParts("orange"):personParts(NPCS[index%2].family.me),[cat,index]);
  useFrame((_,dt)=>{if(!paused)t.current+=dt; const g=ref.current;if(!g)return; const v=t.current*.22; g.position.set(Math.sin(v)*(cat?2.2:4.1),.25,cat ? 1.12:.82);g.rotation.y=Math.cos(v)>0?0:Math.PI;});
  return <group ref={ref} scale={cat?.55:.64}><Parts parts={parts}/></group>;
}
function Fit() {
  const get=useThree(state=>state.get);
  const size=useThree(state=>state.size);
  useLayoutEffect(()=>{const camera=get().camera; camera.zoom=Math.min(size.width/22,size.height/17);camera.updateProjectionMatrix();},[get,size]);
  return null;
}
const APARTMENT = apartmentBuilding(false);
const HOUSE_A=building(2.9,3,"#987c70","#59676b",true);
const HOUSE_B=building(2.75,2,"#b4aa94","#68756e",true);
const CAFE=building(2.8,1,"#a18569","#606b6e",false);
function Scene({paused,onSelect}:{paused:boolean;onSelect:(id:number)=>void}) {
  return <>
    <color attach="background" args={["#c2c5ca"]}/><fog attach="fog" args={["#c2c5ca",32,65]}/>
    <ambientLight intensity={.8} color="#d3def2"/><hemisphereLight args={["#c0cce5","#b3a28e",1.25]}/>
    <directionalLight castShadow position={[-7,12,6]} intensity={2.1} color="#ffe0bb" shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={.04}/>
    <group position={[0,-.1,0]}>
      <Street/>
      {[{p:[-4.15,0,-1.65] as V,items:HOUSE_A,label:"小林的家",id:0},{p:[-.95,0,-1.65] as V,items:HOUSE_B,label:"阿禾的家",id:1},{p:[2.12,0,-1.65] as V,items:CAFE,label:"晚风食堂",id:2}].map(({p,items,label,id})=><group key={label} position={p} onClick={e=>{if(e.delta<6){e.stopPropagation();onSelect(id);}}} onPointerOver={()=>{document.body.style.cursor="pointer";}} onPointerOut={()=>{document.body.style.cursor="auto";}}>
        <Solid items={items}/><Html position={[0,id===2?1.85:1.8,1.38]} transform distanceFactor={7}><button className="wowo-corner-sign" onClick={()=>onSelect(id)}>{id===2?"晚 风 食 堂":label}</button></Html>
        <pointLight position={[0,.9,1.7]} color="#ffb769" intensity={7} distance={3.3}/>
      </group>)}
      <group position={[5.7,.04,-1.95]} scale={.45}
        onClick={event => { if (event.delta < 6) { event.stopPropagation(); location.assign(XIAONING_VISIT_URL); } }}>
        <Solid items={APARTMENT}/>
        <Html position={[0,4.2,2.1]} center zIndexRange={[20,0]}>
          <a className="apartment-door" style={{whiteSpace:"nowrap"}} href={XIAONING_VISIT_URL}>小宁的家 ↗</a>
        </Html>
      </group>
      <Tram paused={paused}/><Neighbor paused={paused}/><Neighbor paused={paused} index={1}/><Neighbor paused={paused} cat/>
    </group>
    <ContactShadows position={[0,-.46,0]} opacity={.32} scale={35} blur={2.8} far={12} resolution={512} frames={1}/>
    <OrbitControls makeDefault target={[0,1.2,0]} enablePan={false} minZoom={10} maxZoom={110} minPolarAngle={.55} maxPolarAngle={1.22} minAzimuthAngle={-.65} maxAzimuthAngle={1.1}/><Fit/>
  </>;
}
export default function TownCorner() {
  const [selected,setSelected]=useState<number|null>(null);const [paused,setPaused]=useState(false);const [version,setVersion]=useState(0);const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
  async function visit(id:number) {setBusy(true);setError(false);try {const n=NPCS[id];const url=await visitLink({v:1,host:n.host,home:n.home,decor:n.decor,family:n.family});location.href=url.replace('/#','/?from=town#');}catch{setError(true);setBusy(false);}}
  return <main className="wowo-corner-page">
    <Canvas key={version} orthographic shadows dpr={[1,1.75]} camera={{position:[13,11,17],zoom:45,near:.1,far:100}} gl={{antialias:true}}><Scene paused={paused} onSelect={setSelected}/></Canvas>
    <header className="wowo-corner-header"><Link href="/" className="wowo-corner-brand">窝窝<span>镇</span></Link><div className="wowo-corner-weather"><span/> 黄昏 · 晚风街</div><nav className="wowo-corner-nav"><Link className="wowo-corner-home" href="/town?neighbors=1">镇上邻居</Link><Link className="wowo-corner-home" href="/town/apartment">公寓楼下</Link><Link className="wowo-corner-home" href="/">回我的家 ↗</Link></nav></header>
    <section className="wowo-corner-intro"><div className="wowo-corner-eyebrow">WOWO · A LITTLE NEIGHBORHOOD</div><h1>晚风刚好，<br/>在街角待一会。</h1><p>灯亮了，邻居也回来了。</p></section>
    {selected!==null && <aside className="wowo-corner-card"><button className="wowo-corner-close" aria-label="关闭" onClick={()=>setSelected(null)}>×</button><div className="wowo-corner-eyebrow">{selected===2 ? "街角小店":"邻居的窝"}</div><h2>{selected===2?"晚风食堂":`${NPCS[selected].host}的家`}</h2><p>{selected===2?"今晚的灯，先为路过的人亮着。小店暂时还不能进去。":"门前留着一盏灯，进来坐坐吧。"}</p>{selected<2&&<button className="wowo-corner-visit" disabled={busy} onClick={()=>visit(selected)}>{busy?"正在开门…":"去串门 →"}</button>}{error&&<p>开门失败，请重试。</p>}</aside>}
    <footer className="wowo-corner-footer"><div><span className="wowo-corner-dot"/> 一小块正在生长的日常<span className="wowo-corner-hint">拖动看看街角 · 滚轮或双指缩放 · 点房子串门</span></div><div className="wowo-corner-controls"><button aria-label={paused?"继续街景动画":"暂停街景动画"} onClick={()=>setPaused(!paused)}>{paused?"▷ 继续":"Ⅱ 停一会"}</button><button onClick={()=>setVersion(version+1)}>↺ 初始视角</button></div></footer>
  </main>;
}
