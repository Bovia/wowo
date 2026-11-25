type V=[number,number,number];
type Part={p:V;s:V;c:string;glow?:boolean};
const add=(p:V,s:V,c:string,glow=false):Part=>({p,s,c,glow});
export function apartmentBuilding(includeCourtyard = true): Part[] {
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
 if (includeCourtyard) {
   a.push(add([0,-.3,0],[12,.55,10],"#9b9f96"),add([0,.01,0],[11.9,.09,9.9],"#b9bca7"),add([0,.09,3],[4.7,.1,3.8],"#d0c6b5"));
   for(let i=0;i<3;i++)a.push(add([0,.08+i*.07,2.5-i*.2],[1.8,.15,.55],"#b7b5a8"));
   for(const x of [-4.1,4.1]) a.push(add([x,.12,0],[1.5,.15,7.8],"#8d9d82"));
   for(let i=0;i<10;i++)a.push(add([0,.146,1.3+i*.36],[4.65,.008,.018],"#b2ad9e"));
 }
 // One selected corner apartment, rather than pretending the whole tower is a home.
 const y=base+11*fh;
 a.push(add([2.2,y+.24,1.84],[.52,.35,.035],"#ffda8f",true),add([2.72,y+.24,.95],[.035,.32,.52],"#ffda8f",true));
 return a;
}
