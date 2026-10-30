// Check drawn weapon tips, arm reach and both-hand grip through a complete revolution.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const bootstrap=fs.readFileSync(path.join(__dirname,'capture_canvas.js'),'utf8').split('const bossType =')[0];
const w=new Function('require','__dirname',bootstrap+'\nreturn world;')(require,__dirname);vm.runInContext('this.spinGeometry=generalSpinGeometry;',w);
const types=['deathknight','goblinking','ghostcaptain','cyclops','shadowhero','fallenangel','demongeneral'],K=w.SPR.SCALE;
let tips=0,maxError=0,maxReachError=0;
for(const type of types)for(const phase of[1,2])for(const radius of(type==='demongeneral'?[60,170,200,260]:[170,200,260])){
 const def=w.defs[type],gap=type==='demongeneral'&&phase===2?Math.PI*2/3:Math.PI,tipArt=def.spinTip;let prev;
 for(let tick=0;tick<=360;tick++){
  const a=tick*Math.PI/180,sweeps=[{ang:a,len:radius,t:2,tele:.7}];if(def.dual)sweeps.push({ang:a+gap,len:radius,t:2,tele:.7});
  const B={type,phase,x:0,y:0,r:44,sweeps,mv:{name:'sweep',t:2,a0:0,n:1}},g=w.spinGeometry(B,def,0,0,K);
  for(const q of g){
   const error=Math.max(Math.abs(Math.hypot(...q.elbow.map((v,i)=>v-q.shoulder[i]))-def.A1*K),Math.abs(Math.hypot(...q.hand.map((v,i)=>v-q.elbow[i]))-def.A2*K));
   maxReachError=Math.max(maxReachError,error);assert(error<1e-6,JSON.stringify({type,tick,radius,error,q}));
   if(q.weapon){const tx=tipArt[0]*q.scale*K,ty=tipArt[1]*K,end=[q.hand[0]+Math.cos(q.angle)*tx-Math.sin(q.angle)*ty,q.hand[1]+Math.sin(q.angle)*tx+Math.cos(q.angle)*ty];
    const e=Math.hypot(end[0]-q.tip[0],end[1]-q.tip[1]);maxError=Math.max(maxError,e);assert(e<1e-6,type+' tip drift');
   }
  }
  if(def.twoHand)assert(Math.abs(Math.hypot(g[1].hand[0]-g[0].hand[0],g[1].hand[1]-g[0].hand[1])-4*K)<1e-6,'second hand left club grip');
  if(prev && def.twoHand)for(let i=0;i<g.length;i++)assert(Math.hypot(...g[i].elbow.map((v,j)=>v-prev[i].elbow[j]))<2,type+' elbow flipped');
  if(prev)for(let i=0;i<g.length;i++)assert(Math.hypot(g[i].hand[0]-prev[i].hand[0],g[i].hand[1]-prev[i].hand[1])<1,type+' hand jumped');prev=g;
  if(tick%45===0){
   const draw=[],pd=w.pd;w.pd=(s,x,y,a=0,sx=1,sy=1,alpha=1)=>{draw.push({s,x,y,a,sx,alpha});return pd(s,x,y,a,sx,sy,alpha);};
   w.globalT=tick/60;w.hero.x=0;w.hero.y=-150;w.renderRig(B,def,0,0,false);w.pd=pd;
   const blade=w.SPR.part(def.sword,{p2:phase===2?1:0}),actual=draw.filter(d=>d.s===blade&&d.alpha===1);assert.equal(actual.length,def.dual?2:1,type+' blade count');
   for(const d of actual){const tx=tipArt[0]*d.sx*K,ty=tipArt[1]*K,end=[d.x+Math.cos(d.a)*tx-Math.sin(d.a)*ty,d.y+Math.sin(d.a)*tx+Math.cos(d.a)*ty];assert(g.some(q=>q.weapon&&Math.hypot(end[0]-q.tip[0],end[1]-q.tip[1])<1e-6),type+' renderer differs from orbit');tips++;}
   if(def.shield)assert(draw.some(d=>d.s===w.SPR.part(def.p+'_shield',{v:w.faceRig(B,w.poseRig(B))==='b'?'b':['r','l'].includes(w.faceRig(B,w.poseRig(B)))?'s':'f'})),type+' shield missing');
  }
 }
}
for(const type of types){
 const def=w.defs[type],B={type,phase:1,x:0,y:0,r:44,sweeps:[{ang:1,len:170,t:2,tele:.7}],mv:null};if(def.dual)B.sweeps.push({ang:1+Math.PI,len:170,t:2,tele:.7});
 w.globalT=4;w.renderRig(B,def,0,0,false);assert(B.r3SpinG,type+' stopped before hitbox expiration');B.sweeps=[];w.globalT=4.1;
 const pd=w.pd,parts=[];w.pd=(s,...args)=>{parts.push(s);return pd(s,...args);};w.renderRig(B,def,0,0,false);w.pd=pd;
 assert(parts.includes(w.SPR.part(def.upper,{})),type+' arms missing during recovery');assert(!B.r3SpinG,type+' stale spin history');
}
console.log(JSON.stringify({types,drawnTips:tips,maxTipError:maxError,maxArmLengthError:maxReachError,allChecks:'passed'}));
