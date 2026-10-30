// Cyclops must hold both arms on its own front, with rear views occluded by its torso.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const boot=fs.readFileSync(path.join(__dirname,'capture_canvas.js'),'utf8').split('const bossType =')[0];
const w=new Function('require','__dirname',boot+'\nreturn world;')(require,__dirname);vm.runInContext('this.geometry=generalSpinGeometry;',w);
const def=w.defs.cyclops,K=w.SPR.SCALE;let minimum=Infinity,rearFrames=0;
for(let i=0;i<=720;i++){
 const a=i*Math.PI/360,B={type:'cyclops',phase:1,x:0,y:0,r:50,sweeps:[{ang:a,len:170,t:2,tele:.7}],mv:{name:'sweep',t:2,n:1,a0:a}},F=[Math.cos(a),-.3*Math.sin(a),-Math.sqrt(.91)*Math.sin(a)],g=w.geometry(B,def,0,0,K);
 for(const arm of g)for(const p of[arm.elbow,arm.hand]){
  const front=(p[0]-arm.center[0])*F[0]+(p[1]-arm.center[1])*F[1]+p[2]*F[2];minimum=Math.min(minimum,front);assert(front>0,'arm moved behind the character');
 }
 const face=w.faceRig(B,w.poseRig(B));assert.equal(face,Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f','torso not facing the grip');
 if(face==='b'&&i%10===0){checkRear(B);rearFrames++;}
}
function checkRear(B){
 const calls=[],pd=w.pd;w.pd=(s,...args)=>{calls.push(s);return pd(s,...args);};w.globalT=1;w.renderRig(B,def,0,0,false);w.pd=pd;
 const torso=w.SPR.part(def.p+'_torso',{v:'b',p2:0}),at=calls.indexOf(torso);assert(at>=0,'missing rear torso');
 for(const part of[def.upper,def.fore,def.hand,def.sword]){
  const item=w.SPR.part(part,{p2:0});assert(calls.includes(item),'missing '+part);assert(calls.lastIndexOf(item)<at,'arm or club painted over back: '+part);
 }
}
w.hero.x=0;w.hero.y=150;
for(const name of['idle','quake','boulders']){const B={type:'cyclops',phase:1,x:0,y:0,r:50,sweeps:[],mv:name==='idle'?null:{name,t:.5,n:1,a0:Math.PI/2}};checkRear(B);rearFrames++;}
console.log(JSON.stringify({minForwardDistance:minimum,rearFrames,allChecks:'passed'}));
