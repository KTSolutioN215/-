// Regression checks for the three visible attachment/silhouette problems.
const fs=require('fs'),path=require('path'),assert=require('assert');
const boot=fs.readFileSync(path.join(__dirname,'capture_canvas.js'),'utf8').split('const bossType =')[0],w=new Function('require','__dirname',boot+'\nreturn world;')(require,__dirname);
function bandWidth(s,offset){const p=s.c.getContext('2d').getImageData(0,0,s.c.width,s.c.height).data;let lo=Infinity,hi=-Infinity;for(let y=Math.round(s.ay+offset)-1;y<=Math.round(s.ay+offset)+1;y++)for(let x=0;x<s.c.width;x++)if(p[(y*s.c.width+x)*4+3]){lo=Math.min(lo,x-s.ax);hi=Math.max(hi,x-s.ax);}return hi-lo;}
let waistChecks=0,mouthChecks=0;
for(const v of['f','s','b'])for(const p2 of[0,1])for(let f=0;f<4;f++){
 const torso=w.SPR.part('h3_hakaishin_torso',{v,p2,f}),tail=w.SPR.part('h3_hakaishin_tail',{v,p2,f});
 assert(bandWidth(tail,0)<=bandWidth(torso,1)+2,'lower body wider than waist in '+v);waistChecks++;
}
for(const p2 of[0,1])for(let f=0;f<4;f++){
 const s=w.SPR.part('h3_kingslime_body',{v:'s',p2,f}),d=s.c.getContext('2d').getImageData(0,0,s.c.width,s.c.height).data;let mouth=0;
 for(let y=0;y<s.c.height;y++)for(let x=0;x<s.c.width;x++){
  const n=(y*s.c.width+x)*4,yy=y-s.ay;if(!d[n+3]||yy< -19||yy> -7)continue;
  if(Math.abs(d[n]-31)+Math.abs(d[n+1]-106)+Math.abs(d[n+2]-52)<20){mouth++;const xx=x-s.ax;assert((xx/33)**2+((yy+26)/27)**2<1.03,'mouth protrudes beyond slime silhouette');}
 }
 assert(mouth>0,'mouth missing');mouthChecks++;
}
for(const angle of[0,Math.PI])for(const move of[null,{name:'roots',t:.8,n:4,a0:angle}]){
 const parts=[],pd=w.pd,part=w.SPR.part,bySprite=new Map();w.SPR.part=(name,P)=>{const s=part(name,P);bySprite.set(s,name);return s;};w.pd=(s,x,y,...args)=>{parts.push({name:bySprite.get(s),x,y});return pd(s,x,y,...args);};
 w.globalT=1;w.hero.x=Math.cos(angle)*150;w.hero.y=0;w.renderRig({type:'treant',phase:1,x:0,y:0,sweeps:[],mv:move},w.defs.treant,0,0,false);w.pd=pd;w.SPR.part=part;
 const branches=parts.filter(p=>p.name==='h3_treant_branch'),mir=angle===0?1:-1;assert.equal(branches.length,4);
 for(const root of[branches[0],branches[2]]){assert(Math.abs(root.x)<12*w.SPR.SCALE,'socket outside trunk');assert(root.x*mir<0,'socket on face side');assert(root.y> -30*w.SPR.SCALE,'socket too close to mouth');}
}
console.log(JSON.stringify({waistChecks,mouthChecks,treeProfileChecks:4,allChecks:'passed'}));
