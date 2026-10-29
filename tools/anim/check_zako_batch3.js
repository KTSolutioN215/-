// Check actual trident lines against the existing swing sector, and the new pose timings.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{createCanvas}=require('@napi-rs/canvas');
const source=fs.readFileSync('web/yusha.js','utf8'),spriteSource=fs.readFileSync('web/sprites.js','utf8'),ease=source.slice(source.indexOf('  const easeIO ='),source.indexOf('  // the lower body for moves')),code=source.slice(source.indexOf('  const ZP = {'),source.indexOf('  function drawEnemy(e)'));
const w={globalT:0,hero:{x:0,y:100},VARIANTS:{},hyp:Math.hypot,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,k)=>a+(b-a)*k,face4:a=>Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f'};
vm.createContext(w);vm.runInContext(ease+code+`;this.pose=e=>{const view=zakoFacing(e),arm=zakoArm(e);return {view:view.face,arm,motion3:zakoMotion3(e,view),bodyX:0,bodyY:arm?Math.round(arm.cr):0,st:e.st,f:0,step:0};};`,w);
let prongs=[],poles=[],feet=[];const v={document:{createElement:()=>createCanvas(1,1)},capture:(a,b,c,d,width,col,m)=>{const tr=(x,y)=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f],line=[...tr(a,b),...tr(c,d)];if(col==='#dfe6f2'&&width===1.3)prongs.push(line);if(col==='#8a6a40'&&width===1.6)poles.push(line);if(col==='#2a3048'&&width===1.4)feet.push(line);}};
vm.createContext(v);vm.runInContext(spriteSource.replace('line(a, b, c2, d, w, c) {','line(a, b, c2, d, w, c) { capture(a,b,c2,d,w,c,x.getTransform());')+';this.SPR=SPR;',v);
let samples=0,maxAngle=0,maxRadius=0;
for(let direction=0;direction<32;direction++)for(let n=0;n<=20;n++){
 const face=direction/32*Math.PI*2,e={type:'fishman',ai:'swing',x:0,y:0,vx:0,vy:0,face,phase:0,st:'slash',t:n/20*.2,cd:1};w.globalT=10+e.t;const p=w.pose(e);p.motion3={...p.motion3,sample:samples};prongs=[];poles=[];const s=v.SPR.enemy('fishman',p);assert.equal(prongs.length,3);assert.equal(poles.length,1);
 const centerTip=prongs[1].slice(2),tip=p.view==='l'?[s.c.width-centerTip[0],centerTip[1]]:centerTip,dx=tip[0]-s.ax,dy=tip[1]-(s.ay-21*.75/1.5),delta=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)+face),Math.cos(Math.atan2(dy,dx)+face))),radius=Math.hypot(dx,dy)*1.5;
 assert(delta<1.25,'tip outside swing fan '+JSON.stringify({face,t:e.t,delta,tip,view:p.view}));assert(radius<=72,'tip exceeds attack range');assert(tip[0]>=0&&tip[0]<s.c.width&&tip[1]>=0&&tip[1]<s.c.height,'tip clipped');
 assert(Math.abs(Math.hypot(poles[0][2]-poles[0][0],poles[0][3]-poles[0][1])-25)<1e-8,'pole stretched');maxAngle=Math.max(maxAngle,delta);maxRadius=Math.max(maxRadius,radius);samples++;
}
for(const view of['f','r','l','b']){feet=[];const s=v.SPR.enemy('spider',{view,f:1,st:'idle',step:0,motion3:{crouch:0,sample:view}});assert.equal(feet.length,8,'spider must retain eight legs');if(view==='r'||view==='l')assert(feet.filter(a=>a[3]>28).length>=4,'near feet hidden inside body');for(const a of feet)assert(a[2]>=0&&a[2]<s.c.width&&a[3]>=0&&a[3]<s.c.height,'spider foot clipped');}
const walk=[-1,1].map(step=>{const s=v.SPR.enemy('fishman',{view:'f',st:'idle',f:0,step,motion3:{weight:0}});return Buffer.from(s.c.getContext('2d').getImageData(0,0,s.c.width,s.c.height).data);});assert(!walk[0].equals(walk[1]),'front webbed feet must alternate');
const e={type:'mushroom',ai:'spore',st:'swell',t:0,x:0,y:0,vx:0,vy:0,face:0,phase:0,cd:0},sizes=new Set();w.globalT=20;
for(let n=0;n<=60;n++){e.t=n/60*.55;w.globalT+=1/60;const p=w.pose(e);sizes.add(p.motion3.swell);v.SPR.enemy('mushroom',p);}assert(sizes.size>=16);assert.equal(w.pose(e).motion3.swell,1);
const wolf={type:'wolf',ai:'lunge',st:'dash',t:.12,windT:.35,lx:0,ly:1,x:0,y:0,vx:0,vy:0,phase:0,face:0,cd:1};w.hero.y=-100;assert.equal(w.pose(wolf).view,'b','wolf must keep its real dash direction');
// Draw-only change: data, stage definitions, all enemy AI and combat update remain byte-identical.
const old=fs.readFileSync(process.env.BASE_GAME,'utf8'),section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
for(const[a,b]of[['  const EN = {','  const SIG = {'],['  function updateEnemies(dt)','  function updateBullets('],['  function runMove(','  // ---------------------------------------------------------------\n  //  MAIN UPDATE']])assert.equal(section(source,a,b),section(old,a,b),'combat/data change '+a);
console.log(JSON.stringify({tridentSamples:samples,maxAngleFromFanCenter:maxAngle,maxTipDistance:maxRadius,continuousCapSizes:sizes.size,wolfDashLock:'passed',combatAndData:'unchanged'}));
