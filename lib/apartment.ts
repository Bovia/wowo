import { counter, doormat, fridge, plant, sofa, tatami, toilet, tvStand, vanity, wardrobe, shoeCabinet } from "./furniture";
import type { Piece, LBox } from "./furniture";
import type { Layout, Opening, Placement, WallSpec } from "./home";

// Millimetres in the supplied plan / 800. Dimensions follow wall centre lines;
// the plan does not dimension the interior split or bay depth, so those are estimates.
const u = (mm: number) => mm / 800;
const W = u(3015), BAL = u(1445), SECOND = u(4920), BATH = u(6637);
const KITCHEN = u(9620), MASTER = u(11892), END = u(14720), SPLIT = u(1040);
const wall = (x0:number,z0:number,x1:number,z1:number,room:string,outer:boolean,openings?:Opening[]): WallSpec => ({x0,z0,x1,z1,room,outer,openings});
const put = (piece:Placement["piece"],room:string,x:number,z:number,side:Placement["side"]="n"):Placement=>({piece,room,x,z,side});
// These fittings are drawn in the source plan and reflected with the apartment.
function fitting(w: number, d: number, boxes: LBox[]): Piece {
  return { w, d, prefer: "corner", boxes };
}

function balconyRail(width: number): Piece {
  const bars: LBox[] = [[0, .98, 0, width, 1.05, .09, "#696e68"],
    [0, .12, .02, width, .17, .07, "#8c9188"]];
  for (let i = 0; i <= 18; i++) {
    const x = (width - .04) * i / 18;
    bars.push([x, .04, .025, x + .04, 1, .065, "#737c76"]);
  }
  return fitting(width, .09, bars);
}

// Two overlapping sliding panels parked at the side, leaving the other half open.
function balconySlider(): Piece {
  const frame = "#879590";
  const boxes: LBox[] = [];
  for (const offset of [0, .14]) {
    const z = offset / 2;
    boxes.push([offset, .04, z, offset + 1.15, 2.05, z + .025, "#b8ceca"]);
    for (const x of [offset, offset + 1.12])
      boxes.push([x, 0, z, x + .045, 2.1, z + .055, frame]);
    for (const y of [.03, 1.02, 2.04])
      boxes.push([offset, y, z, offset + 1.16, y + .045, z + .055, frame]);
  }
  return fitting(1.31, .13, boxes);
}

// A low step-over curb separates the shower floor from the dry area.
const wetWidth = BATH - SECOND - .22;
const wetZone = fitting(wetWidth, .77, [
  [0, 0, 0, wetWidth, .025, .77, "#b5c3bf"],
  [0, .025, .70, wetWidth, .12, .77, "#8e928a"],
  [.15, .025, .1, .3, .03, .2, "#737f81"],
  [.25, .25, .03, .29, 1.95, .08, "#afb8b9"],
  [.23, 1.9, .04, .31, 1.96, .32, "#a4afb1"],
  [.13, 1.86, .23, .41, 1.92, .45, "#b4bdbf"],
  [.16, .89, .04, .39, .96, .12, "#8b9598"],
]);
wetZone.solids = [];

// Open white seat and a recessed basin, so the toilet reads clearly from overhead.
const openToilet: Piece = {
  ...toilet,
  boxes: [
    ...toilet.boxes.slice(0, 4),
    [.07,.25,.17,.43,.40,.65,"#eeeae2"],
    [.11,.40,.24,.39,.405,.59,"#c2d5d6"],
    [.05,.40,.21,.12,.45,.62,"#fffdf8"], [.38,.40,.21,.45,.45,.62,"#fffdf8"],
    [.09,.40,.17,.41,.45,.25,"#fffdf8"], [.09,.40,.58,.41,.45,.67,"#fffdf8"],
    [.08,.43,.16,.42,.70,.20,"#f4f2eb"],
  ],
};

const woodSlider = fitting(.88, .07, [
  [0, .04, 0, .88, 1.98, .055, "#ad805a"],
  ...[.18,.38,.58,.78].map((x): LBox => [x,.06,.055,x+.012,1.96,.06,"#99704e"]),
  [.71,.85,.055,.76,1.07,.07,"#675d51"],
  [0,1.99,0,.88,2.04,.07,"#686c68"],
]);

function catHouse(): Piece {
  const width = u(1500), height = u(2000), depth = u(600);
  const wood = "#cbab86";
  const boxes: LBox[] = [
    [0,0,0,width,.09,depth,wood], [0,height-.08,0,width,height,depth,wood],
    [0,0,0,width,height,.06,"#b79a7c"],
    [0,0,.05,.065,height,depth,wood], [width-.065,0,.05,width,height,depth,wood],
    [.05,.57,.05,width*.58,.64,depth,wood],
    [width*.45,1.16,.05,width-.05,1.23,depth,wood],
    [.05,1.78,.05,width*.55,1.85,depth,wood],
    [.17,.09,.16,.26,.57,.25,"#b99c71"],
    [width*.6,.1,.12,width-.16,.18,depth-.1,"#92a69b"],
  ];
  return fitting(width, depth, boxes);
}

const bedside = fitting(.44, .43, [
  [0, .05, 0, .44, .48, .43, "#b48c67"], [.02, .26, .42, .42, .45, .44, "#dfbf99"],
  [.17, .34, .44, .27, .37, .46, "#756657"],
]);
const desk = fitting(1.02, .52, [
  [0, .78, 0, 1.02, .86, .52, "#c39970"],
  ...[.05,.91].flatMap(x => [.04,.41].map((z): LBox => [x,0,z,x+.06,.78,z+.06,"#886c54"])),
  [.15,.86,.1,.43,.9,.32,"#d9c5ae"],
]);
const hob = counter(2.08, {sink:false, stove:false});
// Keep the cabinet and backsplash, leaving its work surface clear for a twin hob.
hob.boxes = hob.boxes.filter(box => box[1] < .93 || box[5] <= .03);
hob.boxes.push([.38,.93,.08,1.72,.96,.55,"#363a3c"]);
for (const x of [.69, 1.39]) {
  hob.boxes.push([x-.17,.96,.16,x+.17,.98,.45,"#92958d"],
    [x-.1,.98,.22,x+.1,1,.39,"#424544"],
    [x-.21,1,.28,x+.21,1.02,.32,"#373a39"],
    [x-.025,1,.12,x+.025,1.02,.49,"#373a39"]);
}

const source = {
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

      wall(0,BAL,0,END,"living",true,[{a:u(10600),b:u(11400),kind:"door",leaf:"+"}]),

      wall(0,BAL,W,BAL,"second",false,[{a:.55,b:W-.55,kind:"door",top:2.1}]),
      wall(W,BAL,W,SECOND,"second",true),
      wall(0,SECOND,W,SECOND,"second",false,[{a:.15,b:1.2,kind:"door"}]),
      wall(SPLIT,SECOND,SPLIT,BATH,"bathroom",false,[{a:SECOND+.72,b:SECOND+1.62,kind:"door"}]),
      wall(SPLIT,BATH,W,BATH,"bathroom",false),
      wall(W,SECOND,W,BATH,"bathroom",true,[{a:SECOND+.45,b:SECOND+1.2,kind:"window",sill:1.35,top:2.1}]),
      wall(W,BATH,W,u(7200),"living",true),
      wall(W,u(8800),W,KITCHEN,"living",true),
      wall(W,u(7200),W+.55,u(7200),"living",true,[{a:W+.1,b:W+.5,kind:"window",sill:.35,top:2.1}]),
      wall(W+.55,u(7200),W+.55,u(8800),"living",true,[{a:u(7200)+.1,b:u(8800)-.1,kind:"window",sill:.35,top:2.1}]),
      wall(W,u(8800),W+.55,u(8800),"living",true,[{a:W+.1,b:W+.5,kind:"window",sill:.35,top:2.1}]),
      wall(SPLIT,KITCHEN,W,KITCHEN,"kitchen",false),
      wall(SPLIT,KITCHEN,SPLIT,MASTER,"kitchen",false,[{a:KITCHEN+.38,b:MASTER-.25,kind:"door"}]),
      wall(W,KITCHEN,W,MASTER,"kitchen",true,[{a:KITCHEN+.85,b:KITCHEN+1.6,kind:"window",sill:1.15,top:2.1}]),
      wall(0,MASTER,W,MASTER,"master",false,[{a:.15,b:1.2,kind:"door"}]),
      wall(W,MASTER,W,END,"master",true),
      wall(0,END,W,END,"master",true,[{a:W/2-.52,b:W/2+.52,kind:"window",sill:.9,top:2.1}]),
    ],
    furniture: [
      put(balconyRail(W),"balcony",0,0),
      put(balconyRail(BAL),"balcony",0,0,"w"),
      put(balconyRail(BAL),"balcony",W-.09,0,"e"),
      put(balconySlider(),"balcony",W-.55-1.31,BAL-.065),
      put(plant,"balcony",W-.65,.2),
      put(tatami(1.7,2.5),"second",W-2.64,BAL+.83,"e"),
      put(bedside,"second",W-.6,BAL+.21),
      put(wardrobe(2.05),"second",W-2.2,SECOND-.76,"s"),
      put(wetZone,"bathroom",W-.88,SECOND+.11,"e"),
      put(woodSlider,"bathroom",SPLIT+.11,SECOND+.02,"w"),
      put(openToilet,"bathroom",SPLIT+.27,SECOND+.17,"e"),
      put(vanity,"bathroom",SPLIT+.44,BATH-.65,"s"),
      put(sofa(1.75),"living",.15,BATH+.5,"w"),
      put(tvStand(1.15),"living",W-1.45,BATH+.14),
      put(catHouse(),"living",W-u(1500)-.13,KITCHEN-u(600)-.13,"s"),
      put(balconySlider(),"kitchen",SPLIT+.1,KITCHEN+.12,"w"),
      put(shoeCabinet(.85),"entry",.1,KITCHEN+.15,"w"),
      put(doormat,"entry",.15,u(10650),"w"),
      put(counter(1.65,{sink:true,stove:false}),"kitchen",W-.72,KITCHEN+.15,"e"),
      put(hob,"kitchen",W-2.23,MASTER-.74,"s"),
      put(fridge,"kitchen",SPLIT+.36,KITCHEN+.2),
      put(tatami(1.9,2.5),"master",W-2.65,END-2.05,"e"),
      put(wardrobe(1.2),"master",W-.72,MASTER+.14,"e"),
      put(desk,"master",.13,END-1.22,"w"),
    ],
  },
} satisfies Layout;

// Include the bay in the reflection span so all floor coordinates stay nonnegative.
const flipX = (x: number) => W + .55 - x;
function mirrorFurniture({ piece, side, x, ...rest }: Placement): Placement {
  const alongSideWall = side === "w" || side === "e";
  return {
    ...rest,
    side: side === "w" ? "e" : side === "e" ? "w" : side,
    x: flipX(x + (alongSideWall ? piece.d : piece.w)),
    piece: {
      ...piece,
      boxes: piece.boxes.map(([a, y, z, b, top, end, color]) =>
        [piece.w - b, y, z, piece.w - a, top, end, color]),
      solids: piece.solids?.map(([a, z, b, end]) => [piece.w - b, z, piece.w - a, end]),
    },
  };
}

export const XIAONING_APARTMENT: Layout = {
  ...source,
  rooms: source.rooms.map(room => ({ ...room, x: flipX(room.x + room.w) })),
  plan: {
    floors: source.plan.floors.map(f => ({ ...f, x0: flipX(f.x1), x1: flipX(f.x0) })),
    walls: source.plan.walls.map(w => ({
      ...w, x0: flipX(w.x1), x1: flipX(w.x0),
      openings: w.openings?.map(o => {
        if (w.z0 === w.z1) return { ...o, a: flipX(o.b), b: flipX(o.a) };
        return o.leaf ? { ...o, leaf: o.leaf === "+" ? "-" : "+" } : o;
      }),
    })),
    furniture: source.plan.furniture.map(mirrorFurniture),
  },
};
