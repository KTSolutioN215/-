// Verify preserved artwork, four directions, bounded caches and gameplay isolation.
const assert=require('assert'),fs=require('fs'),vm=require('vm'),{createCanvas}=require('./canvas_host'),{gameHost}=require('./game_host');
const baseSprite=process.env.BASE_SPRITES,baseGame=process.env.BASE_GAME;assert(baseSprite&&baseGame,'Set BASE_SPRITES and BASE_GAME to the pre-change files');
function sprites(file){const w={document:{createElement:()=>createCanvas(1,1)}};vm.createContext(w);vm.runInContext(fs.readFileSync(file,'utf8')+';this.SPR=SPR',w);return w.SPR;}
const before=sprites(baseSprite),now=sprites('web/sprites.js'),types=process.env.BATCH==='5'?['book','armor','mimic','angler','jelly']:process.env.BATCH==='6'?['hellhound','fairy','baku','gargoyle','angel']:process.env.BATCH==='56'?['book','armor','mimic','angler','jelly','hellhound','fairy','baku','gargoyle','angel']:process.env.BATCH==='4'?['scorpion','mummy','toad','mandrake','wyvern']:process.env.BATCH==='3'?['imp','wolf','mushroom','spider','fishman']:process.env.BATCH==='2'?['ghost','mage','lizard','golem','knight']:['slime','bat','goblin','archer','skeleton'];
const pixels=s=>Buffer.from(s.c.getContext('2d').getImageData(0,0,s.c.width,s.c.height).data);
let fronts=0,unchanged=0,mirrors=0;
for(const type of types)for(const st of['idle','hop','wind','dash','aim','slash'])for(let f=0;f<6;f++)for(const step of[-1,0,1]){
 const p={st,f,step},a=before.enemy(type,p),b=now.enemy(type,{...p,view:['lizard','wolf','scorpion','toad','wyvern','angler','hellhound','baku'].includes(type)?'r':type==='spider'?undefined:'f'});
 if(!(type==='archer'&&(st==='aim'||st==='wind'))){assert.equal(a.ax,b.ax);assert.equal(a.ay,b.ay);assert(pixels(a).equals(pixels(b)),type+' original front '+st);fronts++;}
 const r=now.enemy(type,{...p,view:'r'}),l=now.enemy(type,{...p,view:'l'}),back=now.enemy(type,{...p,view:'b'}),rp=pixels(r),lp=pixels(l),W=r.c.width,H=r.c.height;
 assert.equal(back.ax,a.ax);assert.equal(back.ay,a.ay);assert(rp.some(v=>v),'empty side');
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)for(let c=0;c<4;c++)assert.equal(rp[(y*W+x)*4+c],lp[(y*W+W-1-x)*4+c],'left mirror');mirrors++;
}
for(const type of before.types().enemies)if(!types.includes(type))for(const st of['idle','wind','aim','slash']){const p={st,f:1,step:1};assert(pixels(before.enemy(type,p)).equals(pixels(now.enemy(type,p))),type+' unrelated enemy');unchanged++;}
for(const type of before.types().bosses)for(const f of[0,1,2,3]){const p={f,act:0};assert(pixels(before.boss(type,p)).equals(pixels(now.boss(type,p))),type+' boss sprite changed');unchanged++;}
// Real game, identical deterministic inputs, both render every tick.
const old=gameHost({sources:{'yusha.js':baseGame,'sprites.js':baseSprite}}),current=gameHost();let ticks=0;
const state=h=>JSON.stringify({hero:['x','y','vx','vy','hp','inv'].map(k=>h.Y.hero[k]),enemies:h.Y.enemies.map(e=>Object.fromEntries(['type','x','y','vx','vy','hp','st','t','cd','face','lx','ly','atk','def'].map(k=>[k,e[k]]))),bullets:h.Y.bullets.map(b=>[b.type,b.x,b.y,b.vx,b.vy,b.dmg,b.life]),gold:h.Y.runGold,exp:h.Y.runExp});
for(const type of types)for(const[dir,dx,dy]of[['f',0,-1],['r',1,0],['l',-1,0],['b',0,1]]){
 for(const h of[old,current]){h.Y.enter(0);h.Y.enemies.splice(0);h.Y.props.splice(0);const e=h.Y.spawn(type,180,600);e.cd=.1;e.phase=0;e.t=0;}
 for(let tick=0;tick<90;tick++){
  for(const h of[old,current]){const hero=h.Y.hero;hero.x=180+dx*65;hero.y=600+dy*65;hero.vx=hero.vy=0;hero.hp=hero.s.maxHp;hero.inv=10;h.Y.update(1/60);if(tick%3===0)h.image();}
  assert.equal(state(old),state(current),type+' combat changed '+dir+' tick '+tick);ticks++;
 }
}
// Direct facing control test: cardinal movement, attack locks, diagonal hysteresis.
const source=fs.readFileSync('web/yusha.js','utf8'),slice=source.slice(source.indexOf('  // Draw-only state.'),source.indexOf('  function drawEnemy(e)'));
const w={hero:{x:0,y:-100},globalT:0,face4:a=>Math.abs(Math.cos(a))>.7?(Math.cos(a)>0?'r':'l'):Math.sin(a)>0?'b':'f',hyp:Math.hypot};vm.createContext(w);vm.runInContext(slice+';this.facing=zakoFacing;',w);
for(const[d,dx,dy]of[['f',0,-1],['r',1,0],['l',-1,0],['b',0,1]]){let e={x:0,y:0,st:'idle',vx:dx*50,vy:dy*50,ai:'lunge'};assert.equal(w.facing(e).face,d);e.st='wind';e.lx=1;e.ly=0;assert.equal(w.facing(e).face,'r');e.st='dash';w.hero.x=-100;assert.equal(w.facing(e).face,'r');}
let e={x:0,y:0,st:'idle',vx:60,vy:0};assert.equal(w.facing(e).face,'r');for(let i=0;i<60;i++){w.globalT=i/60;e.vx=50;e.vy=i%2?48:52;assert.equal(w.facing(e).face,'r');}
console.log(JSON.stringify({preservedFrontFrames:fronts,unchangedOtherSprites:unchanged,mirroredViews:mirrors,identicalCombatTicks:ticks,facingAndAttackLocks:'passed'}));
