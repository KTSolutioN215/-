// Verify the drawn sword-tip trajectory and arm reach through every angle and radius.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const bootstrap=fs.readFileSync(path.join(__dirname,'capture_canvas.js'),'utf8').split('const bossType =')[0];
const w=new Function('require','__dirname',bootstrap+'\nreturn world;')(require,__dirname);
vm.runInContext('this.spinGeometry=generalSpinGeometry;',w);
const def=w.defs.demongeneral,K=w.SPR.SCALE,tipArt=39*1.15,dirs=[0,Math.PI/2,Math.PI,-Math.PI/2];
let tips=0,maxError=0,maxReachError=0;
// Test both the opposed twin blades and the 120-degree blades of phase-two whirlblade.
for(const gap of[Math.PI,2*Math.PI/3])for(const radius of[60,170,200,260]){
 let prev=null;
 for(let tick=0;tick<=720;tick++){
  const a=tick*Math.PI/180,B={type:'demongeneral',phase:1,x:0,y:0,sweeps:[{ang:a,len:radius,t:2,tele:.7},{ang:a+gap,len:radius,t:2,tele:.7}],mv:{name:'twin',t:2,a0:0,n:1}};
  const geometry=w.spinGeometry(B,def,0,0,K);
  for(const g of geometry){
   const end=[g.hand[0]+Math.cos(g.angle)*g.scale*tipArt*K,g.hand[1]+Math.sin(g.angle)*g.scale*tipArt*K];
   const error=Math.hypot(end[0]-g.tip[0],end[1]-g.tip[1]);maxError=Math.max(maxError,error);assert(error<1e-6,'tip drift');
   assert(Math.abs(Math.hypot(end[0]-g.center[0],end[1]-g.center[1])-radius)<1e-6,'radius drift');
   const reachError=Math.max(Math.abs(Math.hypot(g.elbow[0]-g.shoulder[0],g.elbow[1]-g.shoulder[1])-def.A1*K),Math.abs(Math.hypot(g.hand[0]-g.elbow[0],g.hand[1]-g.elbow[1])-def.A2*K));
   maxReachError=Math.max(maxReachError,reachError);assert(reachError<1e-6,'unreachable grip');
  }
  if(prev)for(let i=0;i<2;i++)assert(Math.hypot(geometry[i].hand[0]-prev[i].hand[0],geometry[i].hand[1]-prev[i].hand[1])<1,'grip discontinuity');
  prev=geometry;
  if(tick%90===0)for(const dir of dirs){
   const draws=[],pd=w.pd;w.pd=(s,x,y,a=0,sx=1,sy=1,alpha=1)=>{draws.push({s,x,y,a,sx,alpha});return pd(s,x,y,a,sx,sy,alpha);};
   w.hero.x=Math.cos(dir)*150;w.hero.y=Math.sin(dir)*150;w.globalT=tick/60;B.r3SpinG=[[],[]];
   w.renderRig(B,def,0,0,false);w.pd=pd;
   const sword=w.SPR.part(def.sword,{p2:0}),actual=draws.filter(d=>d.s===sword&&d.alpha===1);assert.equal(actual.length,2,'drawn blade count');
   for(const d of actual){const end=[d.x+Math.cos(d.a)*d.sx*tipArt*K,d.y+Math.sin(d.a)*d.sx*tipArt*K];assert(geometry.some(g=>Math.hypot(end[0]-g.tip[0],end[1]-g.tip[1])<1e-6),'renderer differs from orbit');tips++;}
  }
 }
}
// The real move timer can finish before the sweep. Render both sides of sweep expiration.
for(const phase of[1,2]){
 const B={type:'demongeneral',phase,x:0,y:0,r:44,sweeps:[{ang:1,len:200,t:2,tele:.7},{ang:1+Math.PI,len:200,t:2,tele:.7}],mv:null};
 w.globalT=4;w.renderRig(B,def,0,0,false);assert(B.r3SpinG,'spin stopped before hitboxes');
 B.sweeps=[];w.globalT=4.1;
 const pd=w.pd,parts=[];w.pd=(s,...args)=>{parts.push(s);return pd(s,...args);};w.renderRig(B,def,0,0,false);w.pd=pd;
 assert(parts.includes(w.SPR.part(def.upper,{})),'arms disappeared during recovery');assert(!B.r3SpinG,'stale spin history');
}
console.log(JSON.stringify({drawnTips:tips,maxTipError:maxError,maxArmLengthError:maxReachError,allChecks:'passed'}));
