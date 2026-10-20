import { LOCATIONS, RP_TRAVEL, type Aim, type Patrol, type Target } from "@/lib/rail-patrol";

type Ctx = CanvasRenderingContext2D;
const PALETTES = [
  { sky: "#081326", glow: "#54b8c0", floor: "#132334", wall: "#23394b", accent: "#7de1dc" },
  { sky: "#171b2c", glow: "#dfaf70", floor: "#292c38", wall: "#43414b", accent: "#f7c889" },
  { sky: "#11162e", glow: "#8983e7", floor: "#1d2240", wall: "#30395c", accent: "#a8b8ff" },
];
function polygon(ctx: Ctx, points: number[][], fill: string) { ctx.fillStyle = fill; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, radius = 0) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); }
function box(ctx: Ctx, x: number, y: number, w: number, h: number, d: number, colour: string) {
  rect(ctx, x, y, w, h, colour, 2);
  polygon(ctx, [[x,y],[x+d,y-d],[x+w+d,y-d],[x+w,y]], "#8294a233");
  polygon(ctx, [[x+w,y],[x+w+d,y-d],[x+w+d,y+h-d],[x+w,y+h]], "#0005");
  ctx.strokeStyle = "#b8dae51c"; ctx.lineWidth = 1; ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  for (let i=1;i<6;i++) { ctx.strokeStyle="#0002";ctx.beginPath();ctx.moveTo(x+w*i/6,y+3);ctx.lineTo(x+w*i/6,y+h-3);ctx.stroke(); }
}
function label(ctx: Ctx, text: string, x: number, y: number, size: number, colour: string) { ctx.font = `600 ${size}px system-ui,sans-serif`; ctx.fillStyle=colour;ctx.fillText(text,x,y); }
function background(ctx: Ctx, w: number, h: number, s: Patrol) {
  const zone=Math.floor(s.wave/2); const palette=PALETTES[zone];
  const travel=s.phase==="travel"?Math.min(1,(s.time-s.phaseAt)/RP_TRAVEL):0;
  const pan=Math.sin(s.time/9000)*w*.008;
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,palette.sky);sky.addColorStop(.5,palette.wall);sky.addColorStop(1,"#060e1b");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(w/2+pan,h*.45);ctx.scale(1+travel*.13,1+travel*.13);ctx.translate(-w/2,-h*.45);
  // Distant skyline, light wells, and a receding floor establish depth.
  for(let i=0;i<17;i++) { const bw=w/15;const bh=h*(.13+((i*17)%13)/70);rect(ctx,i*bw-w*.05,h*.45-bh,bw*.8,bh,"#0c182bc9");for(let j=0;j<4;j++)rect(ctx,i*bw+4,h*.45-bh+j*13+7,bw*.2,2,palette.accent+"32"); }
  const mist=ctx.createRadialGradient(w*.52,h*.35,0,w*.52,h*.35,w*.55);mist.addColorStop(0,palette.glow+"44");mist.addColorStop(1,palette.glow+"00");ctx.fillStyle=mist;ctx.fillRect(0,0,w,h);
  polygon(ctx,[[0,h*.44],[w,h*.44],[w,h],[0,h]],palette.floor);
  ctx.strokeStyle=palette.accent+"12";ctx.lineWidth=1;
  for(let i=-5;i<13;i++){ctx.beginPath();ctx.moveTo(w*.5,h*.44);ctx.lineTo(i*w/7,h);ctx.stroke();}
  for(let i=1;i<9;i++){const y=h*.44+(i/9)**2*h*.56;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  if(zone===0){
    box(ctx,-w*.03,h*.19,w*.25,h*.4,w*.045,"#304755");box(ctx,w*.79,h*.23,w*.25,h*.35,-w*.035,"#263e50");
    box(ctx,w*.07,h*.57,w*.18,h*.18,w*.027,"#42626a");box(ctx,w*.72,h*.61,w*.17,h*.19,-w*.027,"#4c4d5d");
    rect(ctx,w*.35,h*.13,w*.3,h*.13,"#162a3a",3);label(ctx,"ORBIT / TRANSIT",w*.38,h*.2,Math.max(10,w*.017),palette.accent);
    ctx.strokeStyle="#8babbd66";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w*.05,0);ctx.lineTo(w*.05,h*.14);ctx.lineTo(w*.78,h*.14);ctx.stroke();
    for(let i=0;i<4;i++)rect(ctx,w*(.12+i*.2),h*.14,3,h*.07,"#698f9b66");
  }else if(zone===1){
    for(let i=0;i<4;i++){const x=w*(.07+i*.28);polygon(ctx,[[x,0],[x+w*.025,0],[x+w*.13,h*.43],[x+w*.11,h*.43]],"#bdc0c21a");}
    box(ctx,w*.02,h*.22,w*.2,h*.31,w*.035,"#3b4c5a");box(ctx,w*.79,h*.22,w*.2,h*.31,-w*.035,"#3b4c5a");
    rect(ctx,w*.32,h*.15,w*.36,h*.13,"#192837",4);label(ctx,"07    DEPARTURES",w*.35,h*.2,Math.max(10,w*.018),palette.accent);label(ctx,"SERVICE BOTS HAVE PRIORITY",w*.35,h*.25,Math.max(6,w*.009),"#bac8d7");
    box(ctx,w*.1,h*.68,w*.2,h*.11,w*.025,"#5e5961");box(ctx,w*.7,h*.68,w*.2,h*.11,-w*.025,"#5e5961");
  }else{
    const r=Math.min(w,h)*.19;
    ctx.strokeStyle="#8ca9e533";ctx.lineWidth=r*.3;ctx.beginPath();ctx.arc(w*.5,h*.34,r,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=palette.accent;ctx.lineWidth=3;ctx.beginPath();ctx.arc(w*.5,h*.34,r*.85,0,Math.PI*2);ctx.stroke();
    const glow=ctx.createRadialGradient(w*.5,h*.34,0,w*.5,h*.34,r*.8);glow.addColorStop(0,"#b2dfff55");glow.addColorStop(1,"#4d78ff00");ctx.fillStyle=glow;ctx.fillRect(w*.5-r,h*.34-r,r*2,r*2);
    for(const x of [.07,.87]){box(ctx,w*x,h*.2,w*.07,h*.45,w*.025,"#323e63");rect(ctx,w*(x+.02),h*.24,w*.012,h*.3,palette.accent+"99");}
    box(ctx,w*.2,h*.68,w*.18,h*.14,w*.024,"#46567c");box(ctx,w*.66,h*.68,w*.16,h*.14,-w*.024,"#46567c");
  }
  // Floor light strips, overhead beams and drifting dust; original procedural art.
  for(const x of [.07,.92])polygon(ctx,[[w*.48,h*.45],[w*.52,h*.45],[w*(x+.02),h],[w*x,h]],palette.accent+"22");
  polygon(ctx,[[w*.2,0],[w*.23,0],[w*.65,h*.72],[w*.06,h*.72]],palette.accent+"05");
  for(let i=0;i<30;i++){const x=((i*137.2+s.time*.004)%w);const y=((i*61.5+s.time*.008)%h);rect(ctx,x,y,1,1,"#d5e7f23a");}
  ctx.restore();
  const vignette=ctx.createRadialGradient(w*.5,h*.5,h*.2,w*.5,h*.5,Math.max(w,h)*.65);vignette.addColorStop(0,"#0000");vignette.addColorStop(1,"#000a");ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
}
function robot(ctx: Ctx,w:number,h:number,t:Target,time:number){
  const r=t.radius*Math.min(w,h);const x=t.x*w;const y=t.y*h;const remaining=Math.max(0,(t.deadline-time)/(t.deadline-t.born));
  const helper=t.kind==="helper";const armour=t.kind==="armoured";
  const shell=helper?"#8fe5d6":armour?"#bdb7e9":"#d77b99";const dark=helper?"#2b6a67":armour?"#544e79":"#793f5b";
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle="#0006";ctx.beginPath();ctx.ellipse(0,r*1.4,r*.85,r*.2,0,0,Math.PI*2);ctx.fill();
  // Limbs, lit armour plates, visor and a distinct helper cargo box.
  ctx.strokeStyle="#19283a";ctx.lineWidth=r*.28;ctx.lineCap="round";
  for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(sign*r*.28,r*.62);ctx.lineTo(sign*r*.35,r*1.24);ctx.stroke();rect(ctx,sign*r*.35-r*.2,r*1.12,r*.42,r*.24,"#a1b5c8",r*.07);}
  ctx.strokeStyle=dark;ctx.lineWidth=r*.29;ctx.beginPath();ctx.moveTo(-r*.47,-r*.18);ctx.lineTo(-r*.7,r*.4);ctx.moveTo(r*.47,-r*.18);ctx.lineTo(r*.7,r*.4);ctx.stroke();
  rect(ctx,-r*.48,-r*.35,r*.96,r*1.12,shell,r*.2);rect(ctx,-r*.34,-r*.18,r*.68,r*.72,dark,r*.12);
  rect(ctx,-r*.58,-r*1.35,r*1.16,r*.97,shell,r*.24);rect(ctx,-r*.43,-r*1.1,r*.86,r*.36,"#102132",r*.12);
  const eye=helper?"#d4fff3":remaining<.25?"#ffbb8f":"#fce3bf";rect(ctx,-r*.27,-r*1.03,r*.14,r*.13,eye,2);rect(ctx,r*.14,-r*1.03,r*.14,r*.13,eye,2);
  rect(ctx,-r*.4,-r*1.3,r*.6,r*.05,"#ffffff66",2);
  if(helper){rect(ctx,-r*.7,r*.1,r*1.4,r*.65,"#d6efe6",r*.09);ctx.strokeStyle="#2e7d73";ctx.lineWidth=r*.1;ctx.beginPath();ctx.moveTo(-r*.18,r*.4);ctx.lineTo(-r*.03,r*.53);ctx.lineTo(r*.24,r*.27);ctx.stroke();}
  else{ctx.fillStyle="#f6dbad";ctx.beginPath();ctx.moveTo(0,-r*.07);ctx.lineTo(r*.2,r*.27);ctx.lineTo(-r*.2,r*.27);ctx.closePath();ctx.fill();label(ctx,"!",-r*.035,r*.2,r*.2,"#523d4f");}
  if(armour){for(const sign of [-1,1])rect(ctx,sign*r*.48-r*.18,-r*.35,r*.36,r*.38,"#ece4ff",r*.07);}
  const barY=-r*1.8;
  rect(ctx,-r*.9,barY,r*1.8,r*.25,"#0a1828dd",3);
  if(helper){label(ctx,"HELPER",-r*.7,barY+r*.2,Math.max(7,r*.24),"#a9f7e4");}
  else{rect(ctx,-r*.85,barY+r*.05,r*1.7*(1-remaining),r*.14,"#ffa985",2);label(ctx,armour?"II":"!",r*.85,barY+r*.2,Math.max(9,r*.35),"#ffe8c2");}
  ctx.restore();
}
export function paintPatrol(ctx:Ctx,w:number,h:number,s:Patrol,aim:Aim,active:boolean){
  ctx.clearRect(0,0,w,h);background(ctx,w,h,s);
  for(const target of [...s.targets].sort((a,b)=>a.radius-b.radius||a.id-b.id))robot(ctx,w,h,target,s.time);
  for(const fx of s.effects){
    const p=(s.time-fx.born)/(fx.until-fx.born);const x=fx.x*w,y=fx.y*h;ctx.save();ctx.globalAlpha=1-p;
    const colour=fx.kind==="friendly"?"#9deedd":fx.kind==="rescue"?"#a5f5dd":fx.kind==="hurt"?"#ff8699":"#ffd49e";
    if(fx.kind==="hurt"||fx.kind==="friendly"){ctx.strokeStyle=fx.kind==="hurt"?"#ff758c66":"#7fe5ce66";ctx.lineWidth=14;ctx.strokeRect(7,7,w-14,h-14);}
    ctx.strokeStyle=colour;ctx.lineWidth=2;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const d=7+p*30;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);ctx.lineTo(x+Math.cos(a)*(d+7),y+Math.sin(a)*(d+7));ctx.stroke();}
    if(fx.kind==="rescue")label(ctx,"+75  SAFE",x-20,y-10-p*18,12,colour);
    if(fx.kind==="friendly")label(ctx,"HELPER HIT",x-35,y-12,12,colour);
    ctx.restore();
  }
  // Pulse-tool silhouette: deliberately fictional, with a visible six-cell display.
  const size=Math.min(w*.21,h*.24);const gx=w*.5,gy=h+size*.1;ctx.save();ctx.translate(gx,gy);
  polygon(ctx,[[-size*.4,0],[-size*.29,-size*.68],[-size*.12,-size],[size*.12,-size],[size*.29,-size*.68],[size*.4,0]],"#202c41");
  polygon(ctx,[[-size*.12,-size],[-size*.08,-size*1.12],[size*.08,-size*1.12],[size*.12,-size]],"#7c98b1");
  rect(ctx,-size*.18,-size*.55,size*.36,size*.19,"#142335",3);
  for(let i=0;i<6;i++)rect(ctx,(-.14+i*.052)*size,-size*.5,size*.025,size*.065,i<s.ammo?"#89e6d5":"#304052",1);
  if(s.time-s.shotAt<100){ctx.strokeStyle="#c0fff0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-size*1.15,size*.12,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
  if(active&&s.phase==="combat"){
    const x=aim.x*w,y=aim.y*h;ctx.strokeStyle="#ecfff5bb";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.moveTo(x-19,y);ctx.lineTo(x-8,y);ctx.moveTo(x+8,y);ctx.lineTo(x+19,y);ctx.moveTo(x,y-19);ctx.lineTo(x,y-8);ctx.moveTo(x,y+8);ctx.lineTo(x,y+19);ctx.stroke();
  }
  const zone=LOCATIONS[Math.floor(s.wave/2)];label(ctx,zone.short,14,h-18,10,zone.colour+"99");
  if(s.phase==="travel"){const p=Math.min(1,(s.time-s.phaseAt)/RP_TRAVEL);ctx.fillStyle=`rgba(4,10,23,${p*.75})`;ctx.fillRect(0,0,w,h);}
  ctx.fillStyle="#0000000a";for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);
}
