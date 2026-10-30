// Inspect actual hammer corners, gun axes and circular blade tips; compare combat code.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{createCanvas}=require('./canvas_host');
const src=fs.readFileSync('web/yusha.js','utf8'),ss=fs.readFileSync('web/sprites.js','utf8'),ease=src.slice(src.indexOf('  const easeIO ='),src.indexOf('  // the lower body for moves')),code=src.slice(src.indexOf('  const ZP = {'),src.indexOf('  function drawEnemy(e)'));
const w={globalT:0,hero:{x:0,y:100},VARIANTS:{},hyp:Math.hypot,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,k)=>a+(b-a)*k,face4:a=>Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f'};
vm.createContext(w);vm.runInContext(ease+code+';this.pose=e=>{const v=zakoFacing(e);return {view:v.face,st:e.st,motion6:zakoMotion6(e,v),f:0,step:0};};',w);
let heads=[],barrels=[],blades=[];const v={document:{createElement:()=>createCanvas(1,1)},cap:(kind,args,m)=>{const tr=(x,y)=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];if(kind==='poly'&&args[1]==='#8a92a4')heads.push(args[0].map(p=>tr(...p)));if(kind==='r'&&((args[2]===16&&args[4]==='#6a4020')||(args[2]===9&&args[4]==='#3a3a40')))barrels.push([m.a,m.b]);if(kind==='line'&&args[5]==='#6a7080'&&args[4]===3)blades.push([tr(args[0],args[1]),tr(args[2],args[3])]);}};
vm.createContext(v);vm.runInContext(ss.replace('poly(pts, c) {',"poly(pts, c) { cap('poly',[pts,c],x.getTransform());").replace('r(a, b, w, h, c) {',"r(a, b, w, h, c) { cap('r',[a,b,w,h,c],x.getTransform());").replace('line(a, b, c2, d, w, c) {',"line(a, b, c2, d, w, c) { cap('line',[a,b,c2,d,w,c],x.getTransform());")+';this.SPR=SPR;',v);
let samples=0,maxAngle=0,maxRadius=0;
for(let dir=0;dir<64;dir++)for(let n=0;n<=20;n++){
 const face=dir/64*Math.PI*2,e={type:'dwarf',ai:'swing',st:'slash',t:n/20*.2,cd:1,face,x:0,y:0,vx:0,vy:0,phase:0};w.globalT=10+e.t;const p=w.pose(e);p.motion6.sample=samples;heads=[];const s=v.SPR.enemy('dwarf',p);assert.equal(heads.length,1,'one intact hammer head');const pts=heads[0];assert(Math.abs(Math.hypot(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1])-8)<1e-8);assert(Math.abs(Math.hypot(pts[2][0]-pts[1][0],pts[2][1]-pts[1][1])-14)<1e-8);
 for(const [xx,yy]of pts){const tx=p.view==='l'?s.c.width-xx:xx,dx=tx-s.ax,dy=yy-(s.ay-15*.75/1.5),delta=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)+face),Math.cos(Math.atan2(dy,dx)+face))),r=Math.hypot(dx,dy)*1.5;assert(delta<1.25,'head outside attack fan '+JSON.stringify({dir,n,delta,view:p.view,dx,dy}));assert(r<=72,'head outside radius');assert(xx>=0&&xx<s.c.width&&yy>=0&&yy<s.c.height,'head clipped');maxAngle=Math.max(maxAngle,delta);maxRadius=Math.max(maxRadius,r);samples++;}
}
let gunSamples=0,maxGunError=0;
for(const type of['crossbow','ghostpirate'])for(let dir=0;dir<64;dir++){
 const face=dir/64*Math.PI*2,e={type,ai:'shooter',st:'aim',t:.5,cd:0,face,x:0,y:0,vx:0,vy:0,phase:0};w.globalT=20;const p=w.pose(e);p.motion6.sample=dir;barrels=[];v.SPR.enemy(type,p);assert.equal(barrels.length,1);let[dx,dy]=barrels[0];if(p.view==='l')dx=-dx;const delta=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)+face),Math.cos(Math.atan2(dy,dx)+face)));assert(delta<.008,'barrel not aligned');maxGunError=Math.max(maxGunError,delta);gunSamples++;
}
let orbitSamples=0;const faces=new Set();
for(let n=0;n<=128;n++){
 const e={type:'clockwork',ai:'spin',st:'spin',t:n/128*1.6,cd:1,face:0,x:0,y:0,vx:0,vy:0,phase:0};w.globalT=30+e.t;const p=w.pose(e);p.motion6.sample=n;faces.add(p.view);blades=[];const s=v.SPR.enemy('clockwork',p);assert.equal(blades.length,2,'two blades');const pts=blades.map(([base,tip])=>{assert(Math.abs(Math.hypot(tip[0]-base[0],tip[1]-base[1])-24)<1e-8,'tip orbit must be a circle');assert(tip[0]>0&&tip[0]<s.c.width&&tip[1]>0&&tip[1]<s.c.height);const dx=tip[0]-base[0];return[p.view==='l'?-dx:dx,tip[1]-base[1]];});assert(Math.hypot(pts[0][0]+pts[1][0],pts[0][1]+pts[1][1])<1e-8,'blades must oppose');assert(pts.some(([dx,dy])=>Math.hypot(dx-Math.cos(p.motion6.spin)*24,dy-Math.sin(p.motion6.spin)*24)<1e-8),'body mirror changes orbit');orbitSamples+=2;
}assert.equal(faces.size,4,'body must turn with spinning blades');
const types=['chaosbeast','harpy','crossbow','clockwork','starspirit','fireelem','ghostpirate','dwarf','magicmirror','bonewyvern'];let bounds=0;
for(const type of types)for(const view of['f','r','l','b'])for(const st of['idle','wind','dash','aim','cast','spin','dizzy'])for(let n=0;n<=8;n++){
 const s=v.SPR.enemy(type,{view,st,f:n%12,step:n%2?1:-1,shine:n%2,motion6:{ready:n/8,dash:st==='dash'?n/8:0,pulse:n/8,weight:0,drop:0,spin:n*Math.PI/4,key:n*Math.PI/4,aim:0,face:0}}),W=s.c.width,H=s.c.height,a=s.c.getContext('2d').getImageData(0,0,W,H).data;
 for(let x=0;x<W;x++){assert.equal(a[x*4+3],0,type+' top clipped '+view+' '+st);assert.equal(a[((H-1)*W+x)*4+3],0,type+' bottom clipped '+view+' '+st);}for(let y=0;y<H;y++){assert.equal(a[(y*W)*4+3],0,type+' left clipped');assert.equal(a[(y*W+W-1)*4+3],0,type+' right clipped');}bounds++;
}
for(const[type,ai,st,time]of[['chaosbeast','breath','wind',.42],['bonewyvern','breath','wind',.42],['harpy','lunge','wind',.5],['fireelem','lunge','wind',.5],['crossbow','shooter','aim',.85],['ghostpirate','shooter','aim',.7],['clockwork','spin','wind',.8],['starspirit','caster','cast',.6]]){
 const e={type,ai,st,t:0,cd:0,windT:time,lx:1,ly:0,face:0,x:0,y:0,vx:0,vy:0,phase:0},values=new Set();for(let n=0;n<=60;n++){e.t=n/60*time;w.globalT+=1/60;values.add(w.pose(e).motion6.ready);}assert.equal(values.size,17,type+' anticipation');
}
const old=fs.readFileSync(process.env.BASE_GAME,'utf8'),section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
for(const[a,b]of[['  const EN = {','  const SIG = {'],['  function updateEnemies(dt)','  function updateBullets('],['  function runMove(','  // ---------------------------------------------------------------\n  //  MAIN UPDATE']])assert.equal(section(src,a,b),section(old,a,b),'combat/data changed');
console.log(JSON.stringify({hammerCorners:samples,maxAngle,maxRadius,gunDirections:gunSamples,maxGunError,circularBladeTips:orbitSamples,spinBodyFaces:faces.size,unclippedPoses:bounds,anticipationSteps:17,combatAndData:'unchanged'}));
