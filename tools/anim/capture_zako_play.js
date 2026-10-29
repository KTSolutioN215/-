// Full game update/render; review recording with invulnerable, positioned hero.
// Natural enemy AI controls every attack. No boss animation is changed.
const fs=require('fs'),path=require('path'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas'),{gameHost}=require('./game_host');
const OUT=path.resolve(process.env.OUT||'out/zako_play');fs.mkdirSync(OUT,{recursive:true});
if(process.env.FONT)GlobalFonts.registerFromPath(process.env.FONT,'ReviewJP');
const host=gameHost(),{Y}=host,types=process.env.ENEMY?process.env.ENEMY.split(','):['slime','bat','goblin','archer','skeleton'],dirs={f:[0,-1],r:[1,0],l:[-1,0],b:[0,1]},names={f:'正面',r:'右',l:'左',b:'後ろ'},result=createCanvas(780,1440),ctx=result.getContext('2d');ctx.imageSmoothingEnabled=false;
if(process.env.UP_DIAGONALS){dirs.b_right=[.45,Math.sqrt(1-.45**2)];dirs.b_left=[-.45,Math.sqrt(1-.45**2)];names.b_right='右上';names.b_left='左上';}
let frame=0,checks=[];
for(const type of types)for(const[dir,[dx,dy]]of Object.entries(dirs)){
 if(process.env.UP_ONLY&&!dir.startsWith('b'))continue;
 Y.enter(type==='skeleton'?3:type==='goblin'||type==='archer'?2:0);Y.enemies.splice(0);Y.props.splice(0);Y.bullets.splice(0);const h=Y.hero,y=600,x=Y.tunnelAt(y).cx,dist=type==='archer'?105:type==='bat'?85:58;
 const pin=()=>{h.x=x+dx*dist;h.y=y+dy*dist;h.vx=h.vy=0;h.inv=10;h.hp=h.s.maxHp;h.recoil=0;};
 for(let i=0;i<400;i++){pin();Y.update(1/60);}
 Y.evs.splice(0);if(Y.ev)Y.ev.qT=999;
 const e=Y.spawn(type,x,y);e.cd=.15;e.t=0;e.phase=0;
 const states=new Set(),facings=new Set();let maxBullets=0;
 for(let i=0;i<96;i++){
  for(let sub=0;sub<2;sub++){pin();Y.update(1/60);}
  const game=host.image();ctx.resetTransform();ctx.drawImage(game,0,0,780,1400,0,0,780,1400);ctx.fillStyle='#100e16';ctx.fillRect(0,1400,780,40);ctx.fillStyle='#f3e7b4';ctx.textAlign='center';ctx.font='bold 22px ReviewJP';ctx.fillText(e.name+' / '+names[dir]+'から開始・自然AI',390,1427);
  fs.writeFileSync(path.join(OUT,'f'+String(frame).padStart(5,'0')+'.png'),result.toBuffer('image/png'));
  if([6,15,25,40,65,90].includes(i))fs.writeFileSync(path.join(OUT,type+'_'+dir+'_'+i+'.png'),result.toBuffer('image/png'));
  states.add(e.st);facings.add(e.zakoView&&e.zakoView.face);maxBullets=Math.max(maxBullets,Y.bullets.length);frame++;
 }
 checks.push({type,start:dir,states:[...states],facings:[...facings],maxBullets});console.log(type,dir,[...states].join(','),[...facings].join(','));
}
fs.writeFileSync(path.join(OUT,'recording.json'),JSON.stringify({frameCount:frame,seconds:frame/30,backend:'complete game update/render; native Canvas compositor',reviewControls:'invulnerable hero at fixed positions; natural enemy AI',checks},null,2));
console.log(frame+' frames / '+frame/30+' seconds');
