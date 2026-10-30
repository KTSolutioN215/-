// Inspect actual authored weapon tips, directional frames and draw-only pose timing.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{createCanvas}=require('./canvas_host');
const source=fs.readFileSync('web/yusha.js','utf8'),sprite=fs.readFileSync('web/sprites.js','utf8'),ease=source.slice(source.indexOf('  const easeIO ='),source.indexOf('  // the lower body for moves')),code=source.slice(source.indexOf('  const ZP = {'),source.indexOf('  function drawEnemy(e)'));
const w={globalT:0,hero:{x:0,y:100},VARIANTS:{},hyp:Math.hypot,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,k)=>a+(b-a)*k,face4:a=>Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f'};
vm.createContext(w);vm.runInContext(ease+code+';this.pose=e=>{const v=zakoFacing(e);return {view:v.face,st:e.st,motion5:zakoMotion5(e,v),f:0,step:0};};',w);
let tips=[],shafts=[];const v={document:{createElement:()=>createCanvas(1,1)},capture:(key,args,m)=>{const tr=(x,y)=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];if(key==='line'&&args[5]==='#8a90a0'&&args[4]===3){tips.push(tr(args[2],args[3]));shafts.push(Math.hypot(args[2]-args[0],args[3]-args[1]));}if(key==='poly'&&args[1]==='#e8ecf4')tips.push(tr(...args[0][1]));}};
vm.createContext(v);vm.runInContext(sprite.replace('line(a, b, c2, d, w, c) {',"line(a, b, c2, d, w, c) { capture('line',[a,b,c2,d,w,c],x.getTransform());").replace('poly(pts, c) {',"poly(pts, c) { capture('poly',[pts,c],x.getTransform());")+';this.SPR=SPR;',v);
let samples=0,maxAngle=0,maxRadius=0;
for(const type of['armor','angel'])for(let dir=0;dir<64;dir++)for(let n=0;n<=20;n++){
 const face=dir/64*Math.PI*2,e={type,ai:'swing',x:0,y:0,vx:0,vy:0,face,phase:0,st:'slash',t:n/20*.2,cd:1};w.globalT=10+e.t;const p=w.pose(e);p.motion5.sample=samples;tips=[];shafts=[];const s=v.SPR.enemy(type,p);assert.equal(tips.length,1,'one weapon tip');const [xx,yy]=tips[0],tx=p.view==='l'?s.c.width-xx:xx,dx=tx-s.ax,dy=yy-(s.ay-(type==='armor'?16:15)*.75/1.5),delta=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)+face),Math.cos(Math.atan2(dy,dx)+face))),radius=Math.hypot(dx,dy)*1.5;
 assert(delta<1.25,'tip outside attack fan '+JSON.stringify({type,dir,n,delta,dx,dy,view:p.view}));assert(radius<=72,'tip outside attack radius '+JSON.stringify({type,dir,n,radius}));if(type==='armor')assert(Math.abs(shafts[0]-20)<1e-8,'sword length changed');assert(xx>=0&&xx<s.c.width&&yy>=0&&yy<s.c.height,'weapon clipped');maxAngle=Math.max(maxAngle,delta);maxRadius=Math.max(maxRadius,radius);samples++;
}
const types=['book','armor','mimic','angler','jelly','hellhound','fairy','baku','gargoyle','angel'];let bounds=0;
for(const type of types)for(const view of['f','r','l','b'])for(const st of['idle','wind','dash','swell','cast'])for(let n=0;n<=16;n++){
 const s=v.SPR.enemy(type,{view,st,f:n%6,step:n%2?1:-1,perch:type==='gargoyle'&&st==='idle',motion5:{ready:n/16,dash:st==='dash'?n/16:0,pulse:n/16,weight:0,drop:0}}),W=s.c.width,H=s.c.height,a=s.c.getContext('2d').getImageData(0,0,W,H).data;
 for(let x=0;x<W;x++){assert.equal(a[x*4+3],0,type+' top clipped '+view+' '+st);assert.equal(a[((H-1)*W+x)*4+3],0,type+' bottom clipped '+view+' '+st);}
 for(let y=0;y<H;y++){assert.equal(a[(y*W)*4+3],0,type+' left clipped');assert.equal(a[(y*W+W-1)*4+3],0,type+' right clipped');}bounds++;
}
for(const[type,ai,st,duration]of[['book','caster','cast',.6],['baku','spore','swell',.55],['mimic','lunge','wind',.3],['hellhound','lunge','wind',.3],['gargoyle','lunge','wind',.45]]){const e={type,ai,st,t:0,windT:duration,x:0,y:0,vx:0,vy:0,lx:1,ly:0,face:0,phase:0,cd:0},values=new Set();for(let n=0;n<=60;n++){e.t=n/60*duration;w.globalT+=1/60;values.add(w.pose(e).motion5.ready);}assert.equal(values.size,17,type+' anticipation');if(ai==='lunge'){e.st='dash';w.hero.x=-100;assert.equal(w.pose(e).view,'r');}}
for(const type of['fairy','angler']){const e={type,ai:type==='fairy'?'imp':'phase',x:0,y:0,vx:0,vy:0,face:0,phase:0,cd:0,st:'idle',t:0};w.pose(e);e.cd=2;assert.equal(w.pose(e).motion5.pulse,1);w.globalT+=.31;assert.equal(w.pose(e).motion5.pulse,0);}
const old=fs.readFileSync(process.env.BASE_GAME,'utf8'),section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
for(const[a,b]of[['  const EN = {','  const SIG = {'],['  function updateEnemies(dt)','  function updateBullets('],['  function runMove(','  // ---------------------------------------------------------------\n  //  MAIN UPDATE']])assert.equal(section(source,a,b),section(old,a,b),'combat changed');
assert(source.includes('if(!ZAKO4.has(e.type)&&R3[e.type]'),'new armor and angel must use original-design directional sprites');
console.log(JSON.stringify({weaponTipSamples:samples,maxAngle,maxRadius,unclippedPoses:bounds,anticipationSteps:17,releaseAndAttackLocks:'passed',combatAndData:'unchanged'}));
