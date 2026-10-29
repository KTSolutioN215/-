// Uses the real pose controller and captures the actual blade polygon before rasterization.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{createCanvas}=require('@napi-rs/canvas');
const source=fs.readFileSync('web/yusha.js','utf8'),spriteSource=fs.readFileSync('web/sprites.js','utf8');
const start=source.indexOf('  const ZP = {'),end=source.indexOf('  function drawEnemy(e)');
const ease=source.slice(source.indexOf('  const easeIO ='),source.indexOf('  // the lower body for moves'));
const world={VARIANTS:{},globalT:0,hero:{x:180,y:100},hyp:Math.hypot,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,k)=>a+(b-a)*k,face4:a=>Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f'};
vm.createContext(world);vm.runInContext(ease+source.slice(start,end)+`\nthis.pose=e=>{const arm=zakoArm(e),view=zakoFacing(e);return {view:view.face,st:e.st,f:0,step:0,arm,bodyY:Math.round(arm.cr),bodyX:0,upSlash:skeletonUpSlash(e,view)};};`,world);
let captured=[];const sprites={document:{createElement:()=>createCanvas(1,1)},captureBlade:(pts,m)=>captured.push(pts.map(([x,y])=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f]))};
vm.createContext(sprites);vm.runInContext(spriteSource.replace('poly(pts, c) {',"poly(pts, c) { if(c==='#c8ccd4')captureBlade(pts,x.getTransform());")+';this.SPR=SPR;',sprites);
const last=new Map();let samples=0,maxDelta=0,maxRadius=0,maxJoin=0;
for(let direction=0;direction<=20;direction++){
 const angle=.8+direction*(Math.PI-1.6)/20,e={type:'skeleton',ai:'swing',x:0,y:0,vx:0,vy:0,phase:0,st:'idle',t:0,face:angle},points=[];
 world.globalT=0;world.hero.x=Math.cos(angle)*58;world.hero.y=Math.sin(angle)*58;world.pose(e);
 for(const [st,duration,count]of[['wind',.5,61],['slash',.2,101],['idle',.4,81]])for(let n=0;n<count;n++){
  e.st=st;e.t=n/(count-1)*duration;world.globalT+=duration/(count-1);const p=world.pose(e);captured=[];
  const s=sprites.SPR.enemy('skeleton',p);if(captured.length)last.set(s,captured[0]);const blade=last.get(s);assert(blade,'blade not drawn');
  if(st==='slash'){
   const tip=blade[2],dx=tip[0]-s.ax,dy=tip[1]-(s.ay-21*.75/1.5),delta=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)+angle),Math.cos(Math.atan2(dy,dx)+angle))),radius=Math.hypot(dx,dy)*1.5;
   assert(delta<=1.25+.025,'blade tip outside fan: '+[angle,e.t,delta]);assert(radius<=72,'blade tip exceeds range');
   maxDelta=Math.max(maxDelta,delta);maxRadius=Math.max(maxRadius,radius);samples++;
   const directionX=blade[2][0]-(blade[0][0]+blade[4][0])/2,directionY=blade[2][1]-(blade[0][1]+blade[4][1])/2;
   assert(directionX*Math.cos(angle)-directionY*Math.sin(angle)>0,'blade points away from attack');
  }
  if(p.upSlash)points.push({st,tip:blade[2]});
 }
 // At joins, permit raster/cache quantization but never the old downward flip.
 for(let i=1;i<points.length;i++)if(points[i].st!==points[i-1].st){const d=Math.hypot(...points[i].tip.map((v,j)=>v-points[i-1].tip[j]));maxJoin=Math.max(maxJoin,d);assert(d<2,'phase join jumps '+d);}
}
// Scope: without the new rear-attack control, every existing four-direction frame is unchanged.
const base=process.env.BASE_SPRITES;assert(base,'Set BASE_SPRITES to the previous sprites.js');
const old={document:{createElement:()=>createCanvas(1,1)}};vm.createContext(old);vm.runInContext(fs.readFileSync(base,'utf8')+';this.SPR=SPR;',old);
const pixels=s=>Buffer.from(s.c.getContext('2d').getImageData(0,0,s.c.width,s.c.height).data);let unchanged=0;
for(const type of['slime','bat','goblin','archer','skeleton'])for(const view of['f','r','l','b'])for(const st of['idle','wind','slash','aim'])for(const f of[0,1,2]){
 const p={view,st,f,step:0};assert(pixels(old.SPR.enemy(type,p)).equals(pixels(sprites.SPR.enemy(type,p))),type+' unrelated pose changed');unchanged++;
}
console.log(JSON.stringify({actualBladeTipSamples:samples,largestAngleFromFanCenter:maxDelta,maxTipDistance:maxRadius,maxPhaseJoinDistance:maxJoin,unchangedFrames:unchanged}));
