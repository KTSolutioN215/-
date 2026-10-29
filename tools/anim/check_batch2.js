// Verify distinct body plans and phase-specific accessories through the real renderer.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const boot=fs.readFileSync(path.join(__dirname,'capture_canvas.js'),'utf8').split('const bossType =')[0],w=new Function('require','__dirname',boot+'\nreturn world;')(require,__dirname);
function render(type,phase,angle,mv=null){
 const B={type,phase,x:0,y:0,r:40,sweeps:[],mv},parts=[],draws=[],part=w.SPR.part,pd=w.pd;
 w.SPR.part=(name,P)=>{parts.push({name,P});return part(name,P);};w.pd=(s,x,y,a=0,sx=1,sy=1,...rest)=>{draws.push({s,x,y,a,sx,sy});return pd(s,x,y,a,sx,sy,...rest);};
 w.hero.x=Math.cos(angle)*150;w.hero.y=Math.sin(angle)*150;w.globalT=1;w.renderRig(B,w.defs[type],0,0,false);w.SPR.part=part;w.pd=pd;return {B,parts,draws};
}
let samples=0;
for(const angle of[-Math.PI/2,0,Math.PI,Math.PI/2])for(const phase of[1,2]){
 let r=render('hakaishin',phase,angle),names=r.parts.map(p=>p.name);assert.equal(names.filter(n=>n==='h3_hakaishin_upper').length,4,'four upper arms');assert(names.includes('h3_hakaishin_world'),'held world');assert(names.includes('h3_hakaishin_halo'),'rune halo');assert(!names.some(n=>/thigh|foot/.test(n)),'no human legs');
 r=render('maou',phase,angle);assert.equal(r.parts.some(p=>p.name==='h3_maou_wings'),phase===2,'rage wings');assert(r.parts.some(p=>p.name==='h3_maou_orb'),'off-hand magic');
 r=render('gorgon',phase,angle,{name:'petrify',t:1.25,n:1,a0:angle});assert(r.parts.some(p=>p.name==='h3_gorgon_head'&&p.P.gaze===1),'gaze flash at 1.2 seconds');assert(r.parts.some(p=>p.name==='h3_gorgon_tail'),'serpent tail');assert(r.parts.some(p=>p.name==='h3_gorgon_shield'),'bronze shield');
 for(const type of['kingslime','treant']){r=render(type,phase,angle);assert(!r.parts.some(p=>/upper|fore|thigh|shin/.test(p.name)),'natural body used humanoid bones');assert(r.parts.some(p=>p.name==='h3_'+type+(type==='treant'?'_trunk':'_body')));}
 samples++;
}
const slime=w.SPR.part('h3_kingslime_body',{v:'f',p2:0,f:3});
function bodyScale(n,t,t1){const r=render('kingslime',1,-Math.PI/2,{name:'split',n,t,t1,a0:-Math.PI/2});const body=r.draws.find(d=>d.s===slime);assert(body);return body.sy;}
assert(bodyScale(1,1.15,1)>1,'airborne stretch');assert(bodyScale(2,1.31,1)<1,'landing squash');
const treeA=render('treant',1,-Math.PI/2),treeB=render('treant',1,-Math.PI/2,{name:'roots',t:.6,n:3,a0:-Math.PI/2});
const branch=w.SPR.part('h3_treant_branch',{v:'f',p2:0,f:3});assert(treeA.draws.some((d,i)=>d.s===branch&&treeB.draws[i]&&Math.abs(d.a-treeB.draws[i].a)>.1),'branches did not rise');
console.log(JSON.stringify({directionPhaseSets:samples,bodyPlans:'gorgon / four arms / crowned caster / slime / tree',allChecks:'passed'}));
