// Review creature topology, live attack endpoints, and stopped clock continuity.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const boot=fs.readFileSync(path.join(__dirname,'capture_canvas.js'),'utf8').split('const bossType =')[0],w=new Function('require','__dirname',boot+'\nreturn world;')(require,__dirname);
vm.runInContext('this.creaturePose=creaturePose;',w);
function render(type,phase,angle,mv=null,sweeps=[]){
 const B={type,phase,x:0,y:0,r:40,sweeps,mv},parts=[],draws=[],paths=[],raw=w.SPR.part,pd=w.pd,begin=w.ctx.beginPath.bind(w.ctx),line=w.ctx.lineTo.bind(w.ctx),move=w.ctx.moveTo.bind(w.ctx),close=w.ctx.closePath.bind(w.ctx);let current=[];
 w.SPR.part=(name,P)=>{const s=raw(name,P);parts.push({name,P,s});return s;};w.pd=(s,x,y,a=0,sx=1,sy=1,...rest)=>{draws.push({s,x,y,a,sx,sy});return pd(s,x,y,a,sx,sy,...rest);};
 w.ctx.beginPath=()=>{current=[];return begin();};w.ctx.moveTo=(x,y)=>{current.push([x,y]);return move(x,y);};w.ctx.lineTo=(x,y)=>{current.push([x,y]);return line(x,y);};w.ctx.closePath=()=>{paths.push(current.slice());return close();};
 w.globalT=1;w.hero.x=Math.cos(angle)*150;w.hero.y=Math.sin(angle)*150;w.renderRig(B,w.defs[type],300,500,false);
 w.SPR.part=raw;w.pd=pd;w.ctx.beginPath=begin;w.ctx.lineTo=line;w.ctx.moveTo=move;w.ctx.closePath=close;
 return {B,parts,draws,paths};
}
let topologySets=0,tipSamples=0;
for(const angle of[-Math.PI/2,0,Math.PI,Math.PI/2])for(const phase of[1,2]){
 let r=render('spiderqueen',phase,angle);assert.equal(r.parts.filter(p=>p.name.endsWith('_link')).length,16,'eight two-segment legs');assert.equal(r.parts.filter(p=>p.name.endsWith('_joint')).length,8);
 for(const type of['dragon','thunderbird']){r=render(type,phase,angle);assert.equal(r.parts.filter(p=>p.name.endsWith('_wing')).length,2);assert(r.parts.some(p=>p.name.endsWith('_neck')),'head needs neck');}
 r=render('kraken',phase,angle);assert.equal(r.paths.filter(p=>p.length===38).length,8,'eight continuous resting tentacles');
 r=render('clockmachine',phase,angle);assert.equal(r.parts.filter(p=>p.name.endsWith('_gear')).length,2);assert.equal(r.parts.filter(p=>p.name.endsWith('_dialHand')).length,angle===Math.PI/2?0:2,'no dial hands on rear case');
 for(const type of['dragon','kraken'])for(let i=0;i<24;i++){
  const a=i*Math.PI/12,kind=type==='dragon'?'tail':'tentacle',sw={kind,ang:a,len:175,t:1,tele:.9},sweeps=type==='dragon'?[sw]:Array.from({length:4},(_,k)=>({...sw,ang:a+k*Math.PI/2}));
  r=render(type,phase,angle,{name:type==='dragon'?'tail':'tentacles',t:1,n:1,a0:angle},sweeps);
  for(let k=0;k<sweeps.length;k++){
   let tip;{const tips=r.paths.filter(p=>p.length===42).map(p=>[(p[20][0]+p[21][0])/2,(p[20][1]+p[21][1])/2]);assert.equal(tips.length,type==='dragon'?1:4);const s=sweeps[k],ex=300+Math.cos(s.ang)*s.len,ey=500-40*.7-Math.sin(s.ang)*s.len;tip=tips.reduce((a,b)=>Math.hypot(a[0]-ex,a[1]-ey)<Math.hypot(b[0]-ex,b[1]-ey)?a:b);}
   const s=sweeps[k],wanted=[300+Math.cos(s.ang)*s.len,500-40*.7-Math.sin(s.ang)*s.len];assert(Math.hypot(tip[0]-wanted[0],tip[1]-wanted[1])<.8,JSON.stringify({type,phase,angle,i,k,tip,wanted}));tipSamples++;
  }
 }
 topologySets++;
}
let B={type:'clockmachine',phase:1,mv:{name:'timestop',t:0}};w.globalT=10;const start=w.creaturePose(B).clockTime;
for(const t of[.3,.8,1.3,1.4]){B.mv.t=t;w.globalT=10+t;assert(Math.abs(w.creaturePose(B).clockTime-start)<1e-8,'clock drift during stop');}
B.mv.t=1.6;w.globalT=11.6;assert(Math.abs(w.creaturePose(B).clockTime-start-.2)<1e-8,'clock did not resume');B.mv=null;assert(Math.abs(w.creaturePose(B).clockTime-start-.2)<1e-8,'clock jumped after stop');
for(const type of['spiderqueen','dragon','thunderbird','kraken','clockmachine']){B={type,phase:1,mv:{name:'aimed3',t:.45}};assert(w.creaturePose(B).flare>.9,'release cue absent '+type);}
console.log(JSON.stringify({topologySets,circularLimbTipSamples:tipSamples,clock:'stop / resume / continuity passed',allChecks:'passed'}));
