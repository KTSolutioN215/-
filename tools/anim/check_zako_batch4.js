// Verify actual artwork bounds, bounded continuous poses, real attack-facing and combat isolation.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{createCanvas}=require('./canvas_host');
const source=fs.readFileSync('web/yusha.js','utf8'),sprite=fs.readFileSync('web/sprites.js','utf8'),ease=source.slice(source.indexOf('  const easeIO ='),source.indexOf('  // the lower body for moves')),code=source.slice(source.indexOf('  const ZP = {'),source.indexOf('  function drawEnemy(e)'));
const w={globalT:0,hero:{x:0,y:100},VARIANTS:{},hyp:Math.hypot,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,k)=>a+(b-a)*k,face4:a=>Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f'};
vm.createContext(w);vm.runInContext(ease+code+';this.pose=e=>{const v=zakoFacing(e);return {view:v.face,st:e.st,motion4:zakoMotion4(e,v),f:0,step:0};};',w);
const v={document:{createElement:()=>createCanvas(1,1)}};vm.createContext(v);vm.runInContext(sprite+';this.SPR=SPR;',v);
// The native adapter must preserve browser pixel placement and restore its CTM.
{const c=createCanvas(40,40),g=c.getContext('2d');g.translate(8,8);g.fillRect(10,10,1,1);const a=g.getImageData(0,0,40,40);g.putImageData(a,0,0);assert.deepEqual(a.data,g.getImageData(0,0,40,40).data);assert.equal(g.getTransform().e,8);}
let bounds=0,locks=0;const types=['scorpion','mummy','toad','mandrake','wyvern'];
for(const type of types)for(const view of['f','r','l','b'])for(const st of['idle','wind','dash','swell','fire'])for(let n=0;n<=16;n++)for(let f=0;f<3;f++){
 const s=v.SPR.enemy(type,{view,st,f,step:n%2?1:-1,motion4:{ready:n/16,dash:st==='dash'?n/16:0,release:type==='mummy'?n/16:0}}),W=s.c.width,H=s.c.height,a=s.c.getContext('2d').getImageData(0,0,W,H).data;
 for(let x=0;x<W;x++){assert.equal(a[x*4+3],0,type+' top clipped '+view+' '+st);assert.equal(a[((H-1)*W+x)*4+3],0,type+' bottom clipped '+view+' '+st+' n='+n+' f='+f+' '+W+'x'+H);}
 for(let y=0;y<H;y++){assert.equal(a[(y*W)*4+3],0,type+' left clipped '+view);assert.equal(a[(y*W+W-1)*4+3],0,type+' right clipped '+view);}
 bounds++;
}
for(const type of['scorpion','toad'])for(const [view,lx,ly]of[['f',0,-1],['r',1,0],['l',-1,0],['b',0,1]]){
 const e={type,ai:'lunge',x:0,y:0,vx:0,vy:0,lx,ly,face:0,phase:0,cd:0,windT:.4,st:'wind',t:0};const sizes=new Set();
 for(let n=0;n<=60;n++){e.t=n/60*.4;w.globalT+=1/60;const p=w.pose(e);sizes.add(p.motion4.ready);assert.equal(p.view,view);}assert.equal(sizes.size,17);assert.equal(w.pose(e).motion4.ready,1);
 e.st='dash';e.t=.15;w.hero.x=-lx*100;w.hero.y=-ly*100;assert.equal(w.pose(e).view,view,'real dash direction must remain locked');locks++;
}
for(const [type,ai,duration]of[['mandrake','spore',.55],['wyvern','breath',.42]]){
 const e={type,ai,x:0,y:0,vx:0,vy:0,face:0,phase:0,cd:0,st:type==='mandrake'?'swell':'wind',t:0},values=new Set();
 for(let n=0;n<=60;n++){e.t=n/60*duration;w.globalT+=1/60;values.add(w.pose(e).motion4.ready);}assert.equal(values.size,17);assert.equal(w.pose(e).motion4.ready,1);
}
const e={type:'mummy',ai:'shamble',x:0,y:0,vx:0,vy:0,phase:0,cd:0,st:'idle',t:0};w.pose(e);e.cd=3;assert.equal(w.pose(e).motion4.release,1);w.globalT+=.35;assert.equal(w.pose(e).motion4.release,0);
const old=fs.readFileSync(process.env.BASE_GAME,'utf8'),section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
for(const[a,b]of[['  const EN = {','  const SIG = {'],['  function updateEnemies(dt)','  function updateBullets('],['  function runMove(','  // ---------------------------------------------------------------\n  //  MAIN UPDATE']])assert.equal(section(source,a,b),section(old,a,b),'combat/data changed '+a);
console.log(JSON.stringify({unclippedPoses:bounds,lockedLungeDirections:locks,continuousPoseSteps:17,mummyRelease:'passed',combatAndData:'unchanged'}));
