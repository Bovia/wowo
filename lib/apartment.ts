import { counter, doormat, fridge, plant, shower, sofa, tatami, toilet, tvStand, vanity, wardrobe, shoeCabinet } from "./furniture";
import type { Layout, Opening, Placement, WallSpec } from "./home";

// Millimetres in the supplied plan / 800. Dimensions follow wall centre lines;
// the plan does not dimension the interior split or bay depth, so those are estimates.
const u = (mm: number) => mm / 800;
const W = u(3015), BAL = u(1445), SECOND = u(4920), BATH = u(6637);
const KITCHEN = u(9620), MASTER = u(11892), END = u(14720), SPLIT = u(1040);
const wall = (x0:number,z0:number,x1:number,z1:number,room:string,outer:boolean,openings?:Opening[]): WallSpec => ({x0,z0,x1,z1,room,outer,openings});
const put = (piece:Placement["piece"],room:string,x:number,z:number,side:Placement["side"]="n"):Placement=>({piece,room,x,z,side});
export const XIAONING_APARTMENT: Layout = {
  id: "xiaoning-apartment",
  name: "小宁的家",
  rooms: [
    {id:"balcony",name:"阳台",kind:"living",x:0,z:0,w:W,d:BAL},
    {id:"second",name:"次卧",kind:"bedroom",x:0,z:BAL,w:W,d:SECOND-BAL},
    {id:"bathroom",name:"卫生间",kind:"bathroom",x:SPLIT,z:SECOND,w:W-SPLIT,d:BATH-SECOND},
    {id:"living",name:"客餐厅",kind:"living",x:0,z:BATH,w:W,d:KITCHEN-BATH},
    {id:"entry",name:"玄关",kind:"storage",x:0,z:KITCHEN,w:SPLIT,d:MASTER-KITCHEN},
    {id:"kitchen",name:"厨房",kind:"kitchen",x:SPLIT,z:KITCHEN,w:W-SPLIT,d:MASTER-KITCHEN},
    {id:"master",name:"主卧",kind:"bedroom",x:0,z:MASTER,w:W,d:END-MASTER},
  ],
  plan: {
    floors: [
      {room:"balcony",x0:0,z0:0,x1:W,z1:BAL},
      {room:"second",x0:0,z0:BAL,x1:W,z1:SECOND},
      {room:"living",x0:0,z0:SECOND,x1:SPLIT,z1:BATH},
      {room:"bathroom",x0:SPLIT,z0:SECOND,x1:W,z1:BATH},
      {room:"living",x0:0,z0:BATH,x1:W,z1:KITCHEN},
      {room:"living",x0:W,z0:u(7200),x1:W+.55,z1:u(8800),elev:.34},
      {room:"entry",x0:0,z0:KITCHEN,x1:SPLIT,z1:MASTER},
      {room:"kitchen",x0:SPLIT,z0:KITCHEN,x1:W,z1:MASTER},
      {room:"master",x0:0,z0:MASTER,x1:W,z1:END},
    ],
    walls: [
      wall(0,0,W,0,"balcony",true,[{a:.45,b:W-.45,kind:"window",sill:.65,top:2.15}]),
      wall(0,0,0,END,"living",true,[{a:u(10600),b:u(11400),kind:"door",leaf:"+"}]),
      wall(W,0,W,BAL,"balcony",true,[{a:.3,b:BAL-.3,kind:"window",sill:.65,top:2.15}]),
      wall(0,BAL,W,BAL,"second",false,[{a:.55,b:W-.55,kind:"door",top:2.1}]),
      wall(W,BAL,W,SECOND,"second",true),
      wall(0,SECOND,W,SECOND,"second",false,[{a:.15,b:1.2,kind:"door"}]),
      wall(SPLIT,SECOND,SPLIT,BATH,"bathroom",false,[{a:SECOND+.4,b:SECOND+1.3,kind:"door"}]),
      wall(SPLIT,BATH,W,BATH,"bathroom",false),
      wall(W,SECOND,W,BATH,"bathroom",true,[{a:SECOND+.45,b:SECOND+1.2,kind:"window",sill:1.35,top:2.1}]),
      wall(W,BATH,W,KITCHEN,"living",true,[{a:u(7200),b:u(8800),kind:"window",sill:.35,top:2.1}]),
      wall(W,u(7200),W+.55,u(7200),"living",true,[{a:W+.1,b:W+.5,kind:"window",sill:.35,top:2.1}]),
      wall(W+.55,u(7200),W+.55,u(8800),"living",true,[{a:u(7200)+.1,b:u(8800)-.1,kind:"window",sill:.35,top:2.1}]),
      wall(W,u(8800),W+.55,u(8800),"living",true,[{a:W+.1,b:W+.5,kind:"window",sill:.35,top:2.1}]),
      wall(SPLIT,KITCHEN,W,KITCHEN,"kitchen",false),
      wall(SPLIT,KITCHEN,SPLIT,MASTER,"kitchen",false,[{a:MASTER-1.35,b:MASTER-.3,kind:"door"}]),
      wall(W,KITCHEN,W,MASTER,"kitchen",true,[{a:KITCHEN+.85,b:KITCHEN+1.6,kind:"window",sill:1.15,top:2.1}]),
      wall(0,MASTER,W,MASTER,"master",false,[{a:.15,b:1.2,kind:"door"}]),
      wall(W,MASTER,W,END,"master",true),
      wall(0,END,W,END,"master",true,[{a:.55,b:W-.6,kind:"window",sill:.7,top:2.1}]),
    ],
    furniture: [
      put(plant,"balcony",W-.65,.2),
      put(tatami(1.7,2.5),"second",W-1.85,BAL+.3),
      put(wardrobe(1.5),"second",.15,BAL+.25,"w"),
      put(shower(.85,.95),"bathroom",W-.98,SECOND+.15),
      put(toilet,"bathroom",SPLIT+.22,SECOND+.15),
      put(vanity,"bathroom",W-.95,BATH-.65,"s"),
      put(sofa(1.75),"living",.15,BATH+.5,"w"),
      put(tvStand(1.15),"living",W-.5,BATH+.8,"e"),
      put(plant,"living",W-.6,KITCHEN-.6),
      put(shoeCabinet(.85),"entry",.1,KITCHEN+.15,"w"),
      put(doormat,"entry",.15,u(10650),"w"),
      put(counter(1.9,{sink:true,stove:true}),"kitchen",W-.72,KITCHEN+.15,"e"),
      put(fridge,"kitchen",SPLIT+.18,KITCHEN+.2),
      put(tatami(1.9,2.5),"master",W-2.05,MASTER+.3),
      put(wardrobe(1.6),"master",.15,MASTER+1.4,"w"),
    ],
  },
};
