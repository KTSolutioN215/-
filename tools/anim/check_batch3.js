// Preserve the original art, added view geometry, live attack endpoints, and stopped clock continuity.
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
let topologySets=0,tipSamples=0,originalFrames=0;
const crypto=require('crypto'),reference=JSON.parse(fs.readFileSync(path.join(__dirname,'original_boss_frames.json'),'utf8'));
for(const[key,expected]of Object.entries(reference.frames)){
 const[type,F,A,P]=key.split(':'),s=w.SPR.part('view_'+type,{v:'f',f:+F,act:+A,p2:+P});
 assert.deepEqual({width:s.c.width,height:s.c.height,ax:s.ax,ay:s.ay},{width:expected.width,height:expected.height,ax:expected.ax,ay:expected.ay},'original art dimensions '+key);
 const hash=crypto.createHash('sha256').update(Buffer.from(s.c.getContext('2d').getImageData(0,0,s.c.width,s.c.height).data)).digest('hex');assert.equal(hash,expected.sha256,'original design changed '+key);originalFrames++;
 for(const v of['s','b']){const added=w.SPR.part('view_'+type,{v,f:+F,act:+A,p2:+P});assert.equal(added.c.width,s.c.width);assert.equal(added.c.height,s.c.height);assert.equal(added.ax,s.ax);assert.equal(added.ay,s.ay);}
}

for(const angle of[-Math.PI/2,0,Math.PI,Math.PI/2])for(const phase of[1,2]){
 let r;
 for(const type of['spiderqueen','dragon','thunderbird','kraken','clockmachine']){
  r=render(type,phase,angle);assert.equal(r.parts.length,1,'reuse the complete original body');assert.equal(r.parts[0].name,'view_'+type);assert.equal(r.draws.length,1);assert.equal(r.draws[0].sy,1,'original height must not stretch');assert.equal(Math.abs(r.draws[0].sx),1,'original width must not stretch');
 }
 for(const type of['dragon','kraken'])for(let i=0;i<24;i++){
  const a=i*Math.PI/12,kind=type==='dragon'?'tail':'tentacle',sw={kind,ang:a,len:175,t:1,tele:.9},sweeps=type==='dragon'?[sw]:Array.from({length:4},(_,k)=>({...sw,ang:a+k*Math.PI/2}));
  r=render(type,phase,angle,{name:type==='dragon'?'tail':'tentacles',t:1,n:1,a0:angle},sweeps);
  const body=r.parts.find(p=>p.name==='view_'+type);assert(body);if(type==='dragon')assert(body.P.hideTail,'old tail must be masked');else assert.equal(body.P.limbMask.toString(2).replace(/0/g,'').length,sweeps.length,'moving tentacles must replace the old ones');
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
console.log(JSON.stringify({originalFrontFramesPixelIdentical:originalFrames,topologySets,circularLimbTipSamples:tipSamples,clock:'stop / resume / continuity passed',allChecks:'passed'}));
