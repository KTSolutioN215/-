// Optional BASE_SPRITES can point to the pre-change factory for the first column.
const fs=require('fs'),vm=require('vm'),path=require('path'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
if(process.env.FONT)GlobalFonts.registerFromPath(process.env.FONT,'ReviewJP');
function load(file){const w={document:{createElement:()=>createCanvas(1,1)}};vm.createContext(w);vm.runInContext(fs.readFileSync(file,'utf8')+';this.SPR=SPR',w);return w.SPR;}
const spr=load(path.resolve(__dirname,'../../web/sprites.js')),old=process.env.BASE_SPRITES?load(process.env.BASE_SPRITES):spr;
const types=['slime','bat','goblin','archer','skeleton'],names=['スライム','コウモリ','ゴブリン','ゴブリンの弓兵','ガイコツ剣士'],out=createCanvas(1100,900),g=out.getContext('2d');
g.fillStyle='#25212d';g.fillRect(0,0,1100,900);g.imageSmoothingEnabled=false;g.textAlign='center';g.font='bold 24px ReviewJP';g.fillStyle='#f1e4ba';g.fillText('元の正面モデルと4方向の比較',550,35);g.font='20px ReviewJP';['元の正面','正面','右','左','後ろ'].forEach((x,i)=>g.fillText(x,i*220+110,75));
for(let n=0;n<types.length;n++){
 g.textAlign='left';g.fillStyle='#d1c6d4';g.fillText(names[n],15,110+n*150);g.textAlign='center';
 for(let i=0;i<5;i++){const p={f:1,st:'idle',step:0},s=i===0?old.enemy(types[n],p):spr.enemy(types[n],{...p,view:['f','r','l','b'][i-1]});g.save();g.translate(i*220+110,223+n*150);g.scale(2.4,2.4);g.drawImage(s.c,-s.ax,-s.ay);g.restore();}
}
g.font='18px ReviewJP';g.fillStyle='#aaa0b3';g.fillText('正面は既存モデルを使用。左は右の反転。静止画は待機の1フレーム。',550,880);
const file=path.resolve(process.env.OUT||'out/zako4_sheet.png');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,out.toBuffer('image/png'));console.log(file);
