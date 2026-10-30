// Preserve all original art and exact variant palettes; check padded new poses and gaze direction.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{createCanvas}=require('./canvas_host');
function load(file){const w={document:{createElement:()=>createCanvas(1,1)}};vm.createContext(w);vm.runInContext(fs.readFileSync(file,'utf8').replace('  return { SCALE, creatureParts', '  this.VAR=VAR;this.recolor=recolor;return { SCALE, creatureParts')+';this.SPR=SPR',w);return w;}
const now=load('web/sprites.js'),old=load(process.env.BASE_SPRITES),changed=['basilisk','clown','fireslime','iceslime','vampbat','hobgoblin','firearcher','generalskel','wraith','frostmage'],pixels=s=>Buffer.from(s.c.getContext('2d').getImageData(0,0,s.c.width,s.c.height).data);
let original=0,others=0,palettes=0,bounds=0;
for(const type of [...old.SPR.types().enemies,...Object.keys(old.VAR)])for(const st of['idle','aim','wind','slash','hop','cast'])for(const f of[0,1,2]){
 const p={st,f,step:f-1},a=old.SPR.enemy(type,p),b=now.SPR.enemy(type,p);assert.equal(a.ax,b.ax);assert.equal(a.ay,b.ay);assert(pixels(a).equals(pixels(b)),type+' original art');original++;
 if(!changed.includes(type))for(const view of['f','r','l','b']){assert(pixels(old.SPR.enemy(type,{...p,view})).equals(pixels(now.SPR.enemy(type,{...p,view}))),type+' unrelated direction');others++;}
}
for(const type of changed.filter(t=>now.VAR[t]))for(const view of['f','r','l','b'])for(const st of['idle','wind','slash','aim','cast']){
 const p={view,st,f:2,step:1,pull:.5,upSlash:st==='slash'?{a:-1.57,w:1}:null,motion:['wraith','frostmage'].includes(type)?{raise:.5,pulse:.5}:null},b=now.SPR.enemy(now.VAR[type].base,p),expected=now.recolor(b,now.VAR[type]);assert(pixels(expected).equals(pixels(now.SPR.enemy(type,p))),type+' palette or geometry differs from its source');palettes++;
}
for(const type of['basilisk','clown'])for(const view of['f','r','l','b'])for(const st of['idle','wind','gaze','aim','throw'])for(let n=0;n<=16;n++){
 const s=now.SPR.enemy(type,{view,st,f:n%6,step:n%2?1:-1,motion8:{ready:n/16,loop:n/16*Math.PI*2}}),W=s.c.width,H=s.c.height,a=pixels(s);
 for(let x=0;x<W;x++){assert.equal(a[x*4+3],0,type+' top');assert.equal(a[((H-1)*W+x)*4+3],0,type+' bottom');}for(let y=0;y<H;y++){assert.equal(a[y*W*4+3],0,type+' left');assert.equal(a[(y*W+W-1)*4+3],0,type+' right');}bounds++;
}
const source=fs.readFileSync('web/yusha.js','utf8'),base=fs.readFileSync(process.env.BASE_GAME,'utf8'),section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
for(const[a,b]of[['  const EN = {','  const SIG = {'],['  function updateEnemies(dt)','  function updateBullets('],['  function updateZones(dt)','  function update(']])assert.equal(section(source,a,b),section(base,a,b),'combat/data changed');
const w={zones:[],hero:{x:100,y:0},globalT:0,hyp:Math.hypot,face4:a=>Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f',clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),easeIO:k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2};vm.createContext(w);vm.runInContext(section(source,'  function zakoFacing(e)','  function skeletonUpSlash')+section(source,'  function zakoMotion8(e','  function drawEnemy(e)')+';this.facing=zakoFacing;this.pose=zakoMotion8;',w);
for(const st of['wind','gaze'])for(const[dir,a]of[['r',0],['b',Math.PI/2],['l',Math.PI],['f',-Math.PI/2]]){const e={type:'basilisk',ai:'gaze',st,t:.95,face:0,x:0,y:0,vx:0,vy:0};w.zones=[{src:e,ang:a}];assert.equal(w.facing(e).face,dir,'gaze must follow its actual cone');assert.equal(w.pose(e,e.zakoView).ready,1);}
const clown={type:'clown',st:'idle',t:0},view={changed:0,prev:'idle'};w.globalT=12.345;let last=w.pose(clown,view).loop;for(let i=0;i<120;i++){w.globalT+=1/60;if(i===30)clown.st='aim';if(i===90)clown.st='throw';const a=w.pose(clown,view).loop,delta=Math.abs(Math.atan2(Math.sin(a-last),Math.cos(a-last)));assert(delta<.53,'juggling phase jumps on transition');last=a;}
console.log(JSON.stringify({originalFrames:original,unchangedOtherDirections:others,exactVariantPalettes:palettes,unclippedNewPoses:bounds,gazeConeDirections:'passed',jugglingPhaseContinuity:'passed',combatAndData:'unchanged'}));
