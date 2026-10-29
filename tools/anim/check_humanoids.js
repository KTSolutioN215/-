// Integration checks using the game's real drawEnemy/drawBoss, AI cases and sprites.
// BASELINE=/path/to/previous-yusha.js node tools/anim/check_humanoids.js
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=__dirname,src=fs.readFileSync(path.join(dir,'../../web/yusha.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(dir,'capture_canvas.js'),'utf8').split('const bossType =')[0];
function makeWorld(file){const old=process.env.SOURCE;if(file)process.env.SOURCE=file;else delete process.env.SOURCE;const w=new Function('require','__dirname',bootstrap+'\nreturn world;')(require,dir);if(old)process.env.SOURCE=old;else delete process.env.SOURCE;return w;}
const w=makeWorld();
const section=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i,a);return s.slice(i,j);};
vm.runInContext(section(src,'  const SIG = {','  // ---------------------------------------------------------------\n  //  SAVE')+'\nthis.bossData=BOSSES;this.signatureData=SIG;',w);
Object.assign(w,{H:1080,sy:y=>y,q:Math.round,FONT:'sans-serif',shadow(){},zakoArm(){return null;},beatPulse:0,hexA:()=> 'rgba(200,160,100,.2)'});
vm.runInContext(section(src,'  function drawSweeps(','  // ===== bosses drawn from parts')+section(src,'  // Draw-only state.','  // pixel sprite of the hero')+section(src,'  function drawBoss()','  function hexA('),w);
let routes=0;const actual=w.drawR3;w.drawR3=(...args)=>{routes++;return actual(...args);};
const rawPart=w.SPR.part;let headParts=0;w.SPR.part=(name,p)=>{if(name==='h3_dullahan_head')headParts++;const s=rawPart(name,p);assert(s,'missing part '+name);return s;};
const bossTypes=['spiderqueen','dragon','thunderbird','kraken','clockmachine','gorgon','hakaishin','maou','kingslime','treant','deathknight','goblinking','lich','icequeen','pharaoh','archmage','colossus','ghostcaptain','cyclops','shadowhero','demongeneral','fallenangel'],enemyTypes=['dwarf','armor','angel','dullahan','shadowarmor'];
const directions=[-Math.PI/2,0,Math.PI,Math.PI/2];let samples=0,moves=0;
const combat=e=>JSON.stringify(Object.fromEntries(['x','y','vx','vy','r','hp','atk','def','st','t','headOut','face','mod'].map(k=>[k,e[k]])));
for(const type of enemyTypes)for(const a of directions)for(const [st,t,headOut]of[['idle',1,false],['wind',.45,false],['slash',.1,false],['throw',.15,true]]){
 const e=Object.assign({},w.enemyDefs[type],{type,x:200,y:350,vx:0,vy:0,phase:0,t,st,headOut,mod:w.enemyDefs[type].mod||{},hp:50,maxHp:100,hurt:0,face:a});
 w.hero.x=e.x+Math.cos(a)*100;w.hero.y=e.y+Math.sin(a)*100;w.globalT=1;
 const before=combat(e),n=routes;headParts=0;w.drawEnemy(e);assert.equal(routes,n+1,'enemy routing '+type);assert.equal(combat(e),before,'render changed combat '+type);
 if(type==='dullahan')assert.equal(headParts,headOut?0:1,'carried head visibility');samples++;
}
for(const type of bossTypes)for(const phase of[1,2]){
 const all=[...new Set([...w.bossData[type][phase===1?'moves':'moves2']])];
 for(const move of all)for(const a of directions){
  const B=Object.assign({},w.bossData[type],{type,phase,x:0,y:0,z:0,vx:0,vy:0,dead:0,hurt:0,alpha:1,sweeps:[],mv:{name:move,t:0,n:0,acc:0,a0:a}});w.boss=B;
  for(let tick=0;tick<300;tick++){
   w.globalT=tick/60;w.hero.x=B.x+Math.cos(a)*150;w.hero.y=B.y+Math.sin(a)*150;
   if(B.mv)w.moveRig(B,1/60,a,1);
   for(const s of B.sweeps){s.t+=1/60;if(s.t>=s.tele){s.ang+=s.vel/60;s.left-=Math.abs(s.vel/60);if(s.grow)s.len=Math.min(s.lmax,s.len+s.grow/60);}}B.sweeps=B.sweeps.filter(s=>s.left>0);
   if(tick%30===0){
    const before=combat(B),n=routes;w.drawBoss();assert.equal(routes,n+1+(B.decoys||[]).length,'boss routing '+type);assert.equal(combat(B),before,'render changed combat '+type);
    const p=w.poseRig(B);for(const value of Object.values(p))if(Array.isArray(value))assert(value.every(Number.isFinite));samples++;
   }
  }moves++;
 }
}
// The original accepted rigs must remain pixel-identical after the shared renderer changes.
if(process.env.BASELINE){
 const old=makeWorld(process.env.BASELINE),now=makeWorld();let comparisons=0;
 for(const type of['deathknight','goblinking'])for(const a of directions)for(const move of['idle','quake','stalk','sweep','charge','darkwave'])for(const t of[.1,.4,.6,1.1,1.7]){
  if(move==='sweep' && t>=.75)continue; // Deliberate orbit change; all other approved frames remain unchanged.
  const draw=world=>{world.ctx.resetTransform();world.ctx.clearRect(0,0,1000,1080);world.globalT=t;world.hero.x=Math.cos(a)*100;world.hero.y=Math.sin(a)*100;const B={type,phase:1,x:0,y:0,sweeps:[],mv:move==='idle'?null:{name:move,t,a0:a,n:0,acc:0}};if(move==='sweep')B.sweeps=[{ang:a,t,tele:.75,len:170}];world.renderRig(B,world.defs[type],300,500,false);return world.ctx.getImageData(0,0,1000,1080).data;};
  assert(Buffer.from(draw(old)).equals(Buffer.from(draw(now))),'approved rig changed: '+[type,move,t,a]);comparisons++;
 }
 const before=fs.readFileSync(process.env.BASELINE,'utf8');
 for(const[a,b]of[['  const EN = {','  // the golden slime:'],['  const DUNGEONS = [','  const SIG = {'],['  const SIG = {','  // ---------------------------------------------------------------\n  //  SAVE'],['  function updateEnemies(dt)','  function updateBullets('],['  function runMove(','  // ---------------------------------------------------------------\n  //  MAIN UPDATE']])assert.equal(section(src,a,b),section(before,a,b),'gameplay change '+a);
 console.log(comparisons+' non-spin comparisons pixel-identical; enemy/boss data, stages, AI, and move logic unchanged.');
}
console.log(JSON.stringify({routeSamples:samples,bossMoveDirectionPhaseRuns:moves,enemyTypes,bossTypes,allChecks:'passed'}));
