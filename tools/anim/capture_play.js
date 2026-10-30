// Full-game recording: real update/render, camera, hero, arena, telegraphs and projectiles.
// Review controls only: invulnerable hero, no reinforcements, specified move order.
const fs=require('fs'),path=require('path'),{createCanvas,GlobalFonts}=require('./canvas_host'),{gameHost}=require('./game_host');
const OUT=path.resolve(process.env.OUT||'out/play_motion');fs.mkdirSync(OUT,{recursive:true});
const font=process.env.FONT;if(font)GlobalFonts.registerFromPath(font,'ReviewJP');
const plans={spiderqueen:[['f','webnet',2.9,'くものす ばくだん'],['r','webnet',2.9,'くものす ばくだん'],['l','charge',2.5,'突進'],['b','webnet',2.9,'くものす ばくだん']],dragon:[['f','breath',2.8,'ブレス'],['f','tail',3.4,'尾の回転'],['r','tail',3.4,'尾の回転'],['l','breath',2.8,'ブレス'],['b','fireball',2.3,'火球']],thunderbird:[['f','thunderlines',3.5,'いかずちの あみ'],['r','dash3',5.6,'三連突進'],['l','thunderlines',3.5,'いかずちの あみ'],['b','aimed3',2,'三方向弾']],kraken:[['f','tentacles',4.6,'触手'],['r','ink',5.4,'すみの うみ'],['l','tentacles',4.6,'触手'],['b','ink',5.4,'すみの うみ']],clockmachine:[['f','clock',5.4,'時計の針'],['r','timestop',3.3,'タイムストップ'],['l','triple',2.1,'三連の輪'],['b','mines',2.9,'地雷']]};
const directions={f:[0,-120],r:[88,-8],l:[-88,-8],b:[0,100]},dirNames={f:'正面',r:'右向き',l:'左向き',b:'後ろ'};
const host=gameHost(),{Y}=host,result=createCanvas(780,1120),ctx=result.getContext('2d');ctx.imageSmoothingEnabled=false;
let frame=0,events=[],checks=[],labels=[];
for(const [type,plan]of Object.entries(plans)){
 if(process.env.BOSS&&process.env.BOSS!==type)continue;
 Y.enter(Y.data.DUNGEONS.findIndex(d=>d.boss===type));Y.toBoss();let B=Y.boss;B.intro=0;B.cd=999;B.waveT=999;
 for(const [dir,move,duration,label]of plan){
  B=Y.boss;B.x=180;B.y=20;B.hx=180;B.hy=20;B.mv=null;B.sweeps.length=0;B.cd=999;B.waveT=999;B.z=0;B.alpha=1;B.creatureAnim=null;B.clockHold=null;B.clockOffset=0;B.f3=dir;B.f3s=null;Y.zones.length=0;Y.bullets.length=0;Y.enemies.forEach(e=>e.dead=true);
  const offset=directions[dir],h=Y.hero;
  const pin=()=>{h.x=180+offset[0];h.y=20+offset[1];h.vx=h.vy=0;h.inv=10;h.hp=h.s.maxHp;h.recoil=0;};
  for(let i=0;i<180;i++){pin();B.mv=null;B.cd=999;Y.update(1/60);}
  B.mv={name:move,t:0,n:0,acc:0,a0:Math.atan2(offset[1],offset[0])};B.cd=999;
  let maxBullets=0,maxZones=0,poseStates=new Set();
  for(let i=0;i<Math.round(duration*30);i++){
   for(let sub=0;sub<2;sub++){pin();B.cd=999;B.waveT=999;Y.update(1/60);}
   const game=host.image();ctx.resetTransform();ctx.drawImage(game,0,0,780,1080,0,0,780,1080);ctx.fillStyle='#100e16';ctx.fillRect(0,1080,780,40);ctx.fillStyle='#f3e7b4';ctx.textAlign='center';ctx.font='bold 22px ReviewJP';ctx.fillText(B.name+'（'+dirNames[dir]+'） '+label,390,1107);
   const file=path.join(OUT,'f'+String(frame).padStart(5,'0')+'.png');if(!process.env.CHECK_ONLY)fs.writeFileSync(file,result.toBuffer('image/png'));
   if([6,15,25,40,65,90].includes(i)&&!process.env.CHECK_ONLY)fs.writeFileSync(path.join(OUT,type+'_'+dir+'_'+move+'_'+i+'.png'),result.toBuffer('image/png'));
   maxBullets=Math.max(maxBullets,Y.bullets.length);maxZones=Math.max(maxZones,Y.zones.length);if(B.creatureAnim){for(const val of Object.values(B.creatureAnim.pose))if(!Number.isFinite(val))throw Error(type+' invalid pose');poseStates.add(JSON.stringify(Object.values(B.creatureAnim.pose).map(v=>Math.round(v*100))));}
   labels.push(type+'|'+dir+'|'+move);frame++;
  }
  checks.push({type,dir,move,frames:Math.round(duration*30),maxBullets,maxZones,distinctPoses:poseStates.size});console.log(type,dir,move,Math.round(duration*30)+' frames');
 }
}
fs.writeFileSync(path.join(OUT,'recording.json'),JSON.stringify({frameCount:frame,seconds:frame/30,backend:'complete game update/render; native Canvas compositor',reviewControls:'invulnerable hero, specified moves, no reinforcements',checks},null,2));
console.log(frame+' full-game frames; '+(frame/30).toFixed(1)+' seconds');
