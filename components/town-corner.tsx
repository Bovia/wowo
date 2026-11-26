"use client";

import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, Object3D, Vector3, type Group, type InstancedMesh } from "three";
import { useSearchParams } from "next/navigation";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { NPCS, XIAONING } from "@/lib/town";
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
      if (x < 0 && f===1) {
        a.push(b([x,y-.38,front+.5],[.66,.18,.2],"#ac7661"));
        for(let i=0;i<5;i++) a.push(b([x-.26+i*.13,y-.23+(i%2)*.035,front+.5],[.16,.19,.18],i%2?"#7e8a66":"#65775e"));
      }
      if(x>0) a.push(b([x-.26,y+.21,front+.09],[.16,.52,.012],"#d6b69d"));
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
    // Overhead line drapes between poles along the railway.
    for(const pole of [-21,-14,-7,0,7,14,21]){
      a.push(b([pole,4.9,-4.95],[.06,2,.06],metal),b([pole,5.85,-4.56],[.06,.06,.8],metal));
      if(pole===21) continue;
      const lineHeight=(t:number)=>5.85-.22*4*t*(1-t);
      for(let j=0;j<8;j++){
        const left=lineHeight(j/8),right=lineHeight((j+1)/8);
        a.push(b([pole+(j+.5)*7/8,(left+right)/2,-4.23],[Math.hypot(7/8,right-left),.014,.014],metal,false,[0,0,Math.atan2(right-left,7/8)]));
      }
    }
    // Pavement railings.
    for(const x of [-6.7,-4.9,-3.1,-1.3,.5,2.3,6.8]) { a.push(b([x,.53,1.74],[.05,.8,.05],cream)); if(x<2.4) for(const y of [.4,.72]) a.push(b([x+.9,y,1.74],[1.8,.04,.04],cream)); }
    // Raised railway behind the houses, with braced piers and sleepers.
    a.push(b([0,3.95,-4.25],[44,.24,1.25],"#5a696f"));
    for(const z of [-4.65,-3.85]) a.push(b([0,4.16,z],[44,.08,.065],"#a1aaa9"));
    for(let x=-21.9;x<22;x+=.3) a.push(b([x,4.09,-4.25],[.09,.075,1.15],"#7e817a"));
    for(const x of [-21,-16,-11,-6,-1,4,9,14,19]) {
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
    // Rain left a few warm reflections under the lamps.
    for (const x of [-6.18,.03,7.03]) {
      for (let i=0;i<7;i++) a.push(b([x+Math.sin(i*2)*.11,.073,2+i*.17],
        [.38-i*.036,.006,.037], i%2 ? "#89817f" : "#98897e"));
    }
    // Split cloth curtains and paper lanterns at the supper counter.
    for(let i=0;i<5;i++) a.push(b([1.18+i*.37,1.52,-.10],[.33,.44+(i%2)*.04,.045],"#596e70"));
    for(const x of [.68,3.48]) {
      a.push(b([x,1.72,-.03],[.03,.35,.03],wood),
        b([x,1.36,-.03],[.26,.46,.24],"#ffd096",true));
      for(const y of [1.12,1.60]) a.push(b([x,y,-.03],[.23,.045,.22],wood));
    }
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
  useFrame((_,dt)=>{if(!paused)t.current+=dt; if(ref.current) ref.current.position.x=Math.sin(t.current*.075)*18.8;});
  return <group ref={ref} position={[0,4.25,-4.25]}><Solid items={items}/></group>;
}
function Neighbor({cat=false,paused=false,index=0}:{cat?:boolean;paused?:boolean;index?:number}) {
  const ref=useRef<Group>(null); const t=useRef(index*5);
  const parts=useMemo(()=>cat ? catParts("orange"):personParts(NPCS[index%2].family.me),[cat,index]);
  useFrame((_,dt)=>{if(!paused)t.current+=dt; const g=ref.current;if(!g)return; const v=t.current*.22; g.position.set(Math.sin(v)*(cat?2.2:4.1),.25,cat ? 1.12:.82);g.rotation.y=Math.cos(v)>0?0:Math.PI;});
  return <group ref={ref} scale={cat?.55:.64}><Parts parts={parts}/></group>;
}
const CENTERS: V[] = [[-4.15,1.5,-1],[-.95,1.5,-1],[2.12,1,-1],[6.15,1.6,-.65]];
function StreetCamera({focus}: {focus:number|null}) {
  const controls = useRef<OrbitImpl>(null);
  const {camera,size} = useThree();
  const flight = useRef(false);
  const target = useMemo(() => new Vector3(...(focus === null ? [0,1.6,0] as V : CENTERS[focus])), [focus]);
  const zoom = Math.min(size.width / (focus === null ? (size.width < 600 ? 15 : 17) : 10), size.height / (focus === null ? 13 : 12));
  useLayoutEffect(() => { flight.current = true; }, [target, zoom]);
  const delta = useMemo(() => new Vector3(), []);
  useFrame((_,dt) => {
    const orbit = controls.current;
    if (!orbit || !flight.current) return;
    const alpha = 1 - Math.exp(-7 * dt);
    delta.copy(target).sub(orbit.target).multiplyScalar(alpha);
    orbit.target.add(delta);
    camera.position.add(delta);
    camera.zoom += (zoom-camera.zoom)*alpha;
    camera.updateProjectionMatrix();
    orbit.update();
    if (delta.lengthSq()<.000001 && Math.abs(camera.zoom-zoom)<.04) flight.current=false;
  });
  return <OrbitControls ref={controls} makeDefault enablePan={false} onStart={()=>{flight.current=false;}}
    minZoom={8} maxZoom={Math.max(110,zoom*2)} minPolarAngle={.55} maxPolarAngle={1.22} minAzimuthAngle={-.65} maxAzimuthAngle={1.1}/>;
}
const APARTMENT = apartmentBuilding(false);
const HOUSE_A=building(2.9,3,"#987c70","#59676b",true);
const HOUSE_B=building(2.75,2,"#b4aa94","#68756e",true);
const CAFE=building(2.8,1,"#a18569","#606b6e",false);
function Scene({paused,onSelect,focus,windows}:{paused:boolean;onSelect:(id:number)=>void;focus:number|null;windows:Brick[]}) {
  return <>
    <fog attach="fog" args={["#ddbbc1",32,63]}/>
    <ambientLight intensity={.65} color="#bfccf3"/><hemisphereLight args={["#c0cce5","#b3a28e",1.25]}/>
    <directionalLight castShadow position={[-9,8,5]} intensity={2.6} color="#ffcf9a" shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={.04}/>
    <group position={[0,-.1,0]}>
      <Street/>
      {[{p:[-4.15,0,-1.65] as V,items:HOUSE_A,label:"小林的家",id:0},{p:[-.95,0,-1.65] as V,items:HOUSE_B,label:"阿禾的家",id:1},{p:[2.12,0,-1.65] as V,items:CAFE,label:"晚风食堂",id:2}].map(({p,items,label,id})=><group key={label} position={p} onClick={e=>{if(e.delta<6){e.stopPropagation();onSelect(id);}}} onPointerOver={()=>{document.body.style.cursor="pointer";}} onPointerOut={()=>{document.body.style.cursor="auto";}}>
        <Solid items={items}/>{id===2 && <Html position={[0,1.85,1.38]} transform distanceFactor={7}><button className="wowo-corner-sign" onClick={()=>onSelect(id)}>{id===2?"晚 风 食 堂":label}</button></Html>}
        <pointLight position={[0,.9,1.7]} color="#ffb769" intensity={7} distance={3.3}/>
      </group>)}
      <group position={[6.15,.04,-1.95]} scale={[.74,1.85,.76]}
        onClick={event => { if (event.delta < 6) { event.stopPropagation(); onSelect(3); } }}>
        <Solid items={APARTMENT}/>
        {windows.length > 0 && <Solid items={windows}/>}
      </group>
      <Tram paused={paused}/><Neighbor paused={paused}/><Neighbor paused={paused} index={1}/><Neighbor paused={paused} cat/>
    </group>
    <ContactShadows position={[0,-.46,0]} opacity={.32} scale={35} blur={2.8} far={12} resolution={512} frames={1}/>
    <StreetCamera focus={focus}/>
  </>;
}
type Door = {handle:string; host:string; building:number; local?:boolean};
const LOCAL_DOORS:Door[] = [...NPCS,XIAONING].map((n,i)=>({handle:n.handle,host:n.host,building:i===2?3:i,local:true}));
const buildingNames = ["小林家","阿禾家","晚风食堂","晚风公寓"];
function doorKey(d:Door) { return (d.local?"local:":"resident:")+d.handle; }

export default function TownCorner() {
  const query = useSearchParams();
  const at = query.get("at");
  const building = query.get("building");
  const initial = building === "xiaolin" ? 0 : building === "ahe" ? 1 : building === "apartment" || at ? 3 : null;
  const [focus,setFocus] = useState<number|null>(initial);
  const [list,setList] = useState(query.has("neighbors") || !!at);
  const [choice,setChoice] = useState<Door|null>(initial===0 || initial===1 ? LOCAL_DOORS[initial] : null);
  const [residents,setResidents] = useState<Door[]>([]);
  const [status,setStatus] = useState<"loading"|"ready"|"error">("loading");
  const [attempt,setAttempt] = useState(0);
  const [filter,setFilter] = useState("");
  const [busy,setBusy] = useState(false);
  const [failed,setFailed] = useState(false);
  const [paused,setPaused] = useState(false);
  const [version,setVersion] = useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/town",{cache:"no-store",signal:controller.signal}).then(async r=>{
      if(!r.ok) throw new Error();
      const data=await r.json() as {homes:Pick<Door,"host"|"handle">[]};
      const rows=data.homes.map(n=>({...n,building:3}));
      setResidents(rows);setStatus("ready");
      if(at){ const found=rows.find(n=>n.handle===at) ?? LOCAL_DOORS.find(n=>n.handle===at);
        if(found){setChoice(found);setFocus(found.building);setList(false);} }
    }).catch(()=>{if(!controller.signal.aborted)setStatus("error");});
    return ()=>controller.abort();
  },[at,attempt]);
  const windows=useMemo(()=>{
    const lit=new Map<number,Brick>();
    for(const resident of residents){
      const slot=Array.from(resident.handle).reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,0)%168;
      lit.set(slot,b([-2.2+(slot%7)*.73,.7+Math.floor(slot/7)*.49+.26,1.875],[.44,.28,.025],"#f8c679",true));
    }
    return [...lit.values()];
  },[residents]);
  function select(id:number) {
    setFocus(id);setList(false);setFailed(false);setFilter("");
    setChoice(id<2?LOCAL_DOORS[id]:null);
  }
  function overview(){setList(false);setChoice(null);setFocus(null);setFailed(false);setFilter("");}
  async function knock(d:Door) {
    if(busy) return;
    setBusy(true);setFailed(false);
    try {
      let url = "/@"+encodeURIComponent(d.handle)+"?from=town";
      if(d.local && d.building===3) url=XIAONING_VISIT_URL;
      else if(d.local){const n=NPCS[d.building];url=(await visitLink({v:1,host:n.host,home:n.home,decor:n.decor,family:n.family})).replace("/#","/?from=town&street="+n.handle+"#");}
      await new Promise(resolve=>window.setTimeout(resolve,850));
      location.assign(url);
    }catch{setBusy(false);setFailed(true);}
  }
  const showDoors = list || (focus===3 && !choice);
  const doors=[...LOCAL_DOORS,...residents].filter(d=>(list || d.building===3) && (d.host+" "+d.handle).toLowerCase().includes(filter.trim().toLowerCase()));
  return <main className="wowo-corner-page evening-street">
    <Canvas key={version} orthographic shadows dpr={[1,1.65]} camera={{position:[12,10,18],zoom:42,near:.1,far:100}} gl={{alpha:true,antialias:true}}>
      <Scene paused={paused} onSelect={select} focus={focus} windows={windows}/>
    </Canvas>
    <header className="wowo-corner-header"><button className="wowo-corner-brand" onClick={overview}>窝窝<span>镇</span></button>
      <nav className="wowo-corner-nav"><button className="wowo-corner-home" onClick={()=>{setList(true);setChoice(null);setFilter("");}}>找邻居</button><Link className="wowo-corner-home" href="/home">回我的家 ↗</Link></nav></header>
    <section className="street-title"><h1>晚风街</h1><p>拖动环看，点房子串门</p></section>
    {(list || focus!==null) && <aside className="street-directory" aria-label="街坊门牌">
      <button className="wowo-corner-close" aria-label="收起门牌" onClick={overview}>×</button>
      <h2>{list?"找邻居":choice?choice.host+"的家":buildingNames[focus!]}</h2>
      {showDoors && <><input aria-label="搜索邻居" placeholder="名字或门牌号" value={filter} onChange={e=>setFilter(e.target.value)}/>
        <div className="street-doors">{doors.map(d=><button key={doorKey(d)} onClick={()=>{setChoice(d);setFocus(d.building);setList(false);setFailed(false);}}>
          <strong>{d.host}</strong><small>{d.local?buildingNames[d.building]:"晚风公寓 · @"+d.handle}</small><span>›</span></button>)}</div>
        {status==="loading" && <p>正在读取公开门牌…</p>}
        {status==="error" && <button onClick={()=>{setStatus("loading");setAttempt(n=>n+1);}}>公开门牌加载失败，重试</button>}
        {status==="ready" && !doors.length && <p>没有找到这位邻居。</p>}
      </>}
      {choice && !list && <><p>{buildingNames[choice.building]} · @{choice.handle}</p>
        <button className="wowo-corner-visit" onClick={()=>knock(choice)} disabled={busy}>敲门拜访</button></>}
      {!list && focus===2 && <p>街角的食堂，暂未开放。</p>}
      {failed && <p role="alert">没能打开门牌，请重试。</p>}
    </aside>}
    <footer className="wowo-corner-footer"><span>黄昏 · 高架电车</span><div className="wowo-corner-controls"><button onClick={()=>setPaused(!paused)}>{paused?"继续街景":"暂停街景"}</button><button onClick={()=>{overview();setVersion(n=>n+1);}}>全街视角</button></div></footer>
    {busy && <div className="street-knock" role="status"><div><i/><strong>叩、叩</strong><p>正在等{choice?.host}开门</p></div></div>}
  </main>;
}
