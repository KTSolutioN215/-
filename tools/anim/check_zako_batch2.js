// Pose timings and actual knight blade polygons, with the unchanged game's attack angles.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{createCanvas}=require('@napi-rs/canvas');
const source=fs.readFileSync('web/yusha.js','utf8'),spriteSource=fs.readFileSync('web/sprites.js','utf8'),ease=source.slice(source.indexOf('  const easeIO ='),source.indexOf('  // the lower body for moves')),
 code=source.slice(source.indexOf('  const ZP = {'),source.indexOf('  function drawEnemy(e)'));
const w={globalT:0,hero:{x:0,y:100},VARIANTS:{},hyp:Math.hypot,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,k)=>a+(b-a)*k,face4:a=>Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f'};
vm.createContext(w);vm.runInContext(ease+code+`;this.motion=(e)=>{const view=zakoFacing(e);return {view,motion:zakoMotion2(e,view),arm:zakoArm(e)};};`,w);
let blade=[];const v={document:{createElement:()=>createCanvas(1,1)},capture:(pts,m)=>blade.push(pts.map(([x,y])=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f]))};vm.createContext(v);vm.runInContext(spriteSource.replace('poly(pts, c) {',"poly(pts, c) { if(c==='#dfe6f2')capture(pts,x.getTransform());")+';this.SPR=SPR;',v);
let samples=0,worstAngle=0;
for(let dir=0;dir<32;dir++)for(let n=0;n<=20;n++){
 const face=dir/32*Math.PI*2,e={type:'knight',ai:'guard',x:0,y:0,vx:0,vy:0,face,phase:0,st:'dash',t:n/20*.3,cd:1};w.globalT=10+n/20*.3;
 const p=w.motion(e),pose={...p,view:p.view.face,st:e.st,f:0,step:0,bodyX:0,bodyY:0};blade=[];
 // Flush only the sprite module cache for this inspection by giving each pose a finite test frame.
 pose.motion={...p.motion,testSample:samples};const s=v.SPR.enemy('knight',pose);assert(blade.length===1,'missing blade');const b=blade[0],base=[(b[0][0]+b[4][0])/2,(b[0][1]+b[4][1])/2];let dx=b[2][0]-base[0],dy=b[2][1]-base[1];if(p.view.face==='l')dx=-dx;
 const delta=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)+face),Math.cos(Math.atan2(dy,dx)+face)));assert(delta<=.026,'thrust differs from collision/telegraph direction '+[face,delta]);worstAngle=Math.max(worstAngle,delta);
 assert(Math.abs(Math.hypot(dx,dy)-18)<1e-8,'blade stretched');assert(b[2][0]>=0&&b[2][0]<s.c.width&&b[2][1]>=0&&b[2][1]<s.c.height,'tip clipped '+JSON.stringify({face,t:e.t,view:p.view.face,tip:b[2],width:s.c.width,height:s.c.height}));samples++;
}
function pose(type,ai,st,t,prev,elapsed){const e={type,ai,st,t,cd:1,face:Math.PI/2,x:0,y:0,vx:0,vy:0,phase:0,zakoView:{face:'b',candidate:'b',since:0,st,prev,changed:w.globalT-(elapsed||0)}};return w.motion(e).motion;}
const distinct=(type,ai,st,duration,key)=>new Set(Array.from({length:61},(_,i)=>pose(type,ai,st,i/60*duration,'idle',0)[key])).size;
assert(distinct('mage','caster','cast',.6,'raise')>=16,'no continuous staff lift');assert(distinct('lizard','breath','wind',.42,'jaw')>=16,'no jaw anticipation');
const peak=pose('golem','slam','wind',.5,'idle',0),hit=pose('golem','slam','wind',.7,'idle',0),recover=pose('golem','slam','idle',.7,'wind',0);
assert.equal(peak.raise,1);assert.equal(hit.raise,0);assert.equal(hit.impact,1);assert.equal(hit.drop,3);assert.equal(hit.drop,recover.drop,'slam/recovery jumps');
// Breath must keep facing the actual emission direction even if the hero crosses behind it.
const e={type:'lizard',ai:'breath',x:0,y:0,vx:40,vy:0,face:Math.PI/2,phase:0,st:'fire',t:.2,cd:1};w.hero.x=-100;w.hero.y=-100;assert.equal(w.motion(e).view.face,'b');
console.log(JSON.stringify({knightDirectionSamples:samples,maxBladeAngleError:worstAngle,staffAndJawContinuous:true,slamImpactAndRecovery:'aligned',breathFacingLock:'passed'}));
