// Original front / preserved front / added right / left / rear, all at the same scale.
const fs=require('fs'),path=require('path'),vm=require('vm'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../..'),out=process.env.OUT||path.join(root,'out/design_restore/original_comparison.png');
const font=process.env.FONT;if(font)GlobalFonts.registerFromPath(font,'ReviewJP');
const w={document:{createElement:()=>createCanvas(1,1)}};vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(root,'web/sprites.js'),'utf8')+';this.SPR=SPR;',w);
const bosses=[['spiderqueen','クイーンスパイダー'],['dragon','えんりゅう'],['thunderbird','サンダーバード'],['kraken','クラーケン'],['clockmachine','クロックマシン']];
const c=createCanvas(1250,1400),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#141820';g.fillRect(0,0,c.width,c.height);
g.font='bold 30px ReviewJP';g.fillStyle='#eee7cd';g.fillText('元のデザインを保持して方向パターンを追加',25,44);g.font='19px ReviewJP';g.fillStyle='#b9c6ce';g.fillText('左の2列は元絵と同一の正面絵。大きさ・頭身・装飾を維持。',25,77);
g.textAlign='center';g.font='bold 23px ReviewJP';for(const[i,label]of['元の正面','今回の正面','追加：右向き','追加：左向き','追加：後ろ'].entries())g.fillText(label,125+i*250,117);
for(const[row,[type,label]]of bosses.entries()){
 const y=145+row*245;g.textAlign='left';g.fillStyle='#c5d3a1';g.font='bold 22px ReviewJP';g.fillText(label,15,y+20);
 for(let i=0;i<5;i++){g.fillStyle='#21272b';g.fillRect(i*250+4,y+31,242,205);const P={f:0,act:0,p2:0,v:i<2?'f':i===4?'b':'s'},s=i===0?w.SPR.boss(type,P):w.SPR.part('view_'+type,P);
  g.save();g.translate(125+i*250,y+210);if(i===3)g.scale(-1,1);w.SPR.draw(g,s,0,0,1.05);g.restore();}
}
g.fillStyle='#9da8b4';g.font='19px ReviewJP';g.textAlign='left';g.fillText('正面80パターン（5体 × 4フレーム × 待機/攻撃 × 2形態）の画素一致を検証',20,1390);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,c.toBuffer('image/png'));console.log(out);
