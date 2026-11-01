// Procedural inventory pixel art. No game stats or creature artwork are changed.
window.InventoryArt=(()=>{
  const cache=new Map(),outline='#18201f';
  const themes={f01:'#ed7941',f02:'#9cdaed',f03:'#c9d8ba',f04:'#a3c75a',f05:'#b391d2',f06:'#edda6a',f07:'#f2ce77',f08:'#f2e6bb',f09:'#b4dce1',f10:'#89a16a',f11:'#d66a43',f12:'#e4b951',f13:'#a8d16a',b01:'#7fce79',b02:'#88a658',b03:'#b9a16b',b04:'#c7adcf',b05:'#b392d4',b06:'#df7545',b07:'#a0dfe8',b08:'#e9d769',b09:'#77718e',b10:'#aa83bd',b11:'#e0bd60',b12:'#c8a674',b13:'#b879dc',b14:'#c36949',b15:'#7ea969',b16:'#8bd1bd',b17:'#d3b68b',b18:'#8bbae3',b19:'#7acba9',b20:'#96b2ba',b21:'#9584c9',b22:'#6ea8d2',b23:'#d0c6ad',b24:'#d57b77',b25:'#ba7ad0',b26:'#d5e8ec',b27:'#a18ac3',b28:'#8fb58c',b29:'#c8badf',b30:'#cf749c',b31:'#cab080',b32:'#e39872',b33:'#e4d878',b34:'#ba91cc',b35:'#98b5e0'};
  function icon(key,paint){if(cache.has(key))return cache.get(key);const[c,x]=SPR.util.canvas(32,32),g=SPR.util.api(x);paint(g,x);SPR.util.pixelize(c,outline);const s={c,ax:16,ay:16};cache.set(key,s);return s;}
  const shade=(c,k)=>SPR.shade(c,k);
  function feather(g,c,bolt=false){g.poly([[24,4],[17,4],[9,12],[7,22],[12,25],[21,18],[25,10]],shade(c,-.22));g.poly([[22,5],[16,7],[10,15],[10,22],[16,18],[23,10]],c);g.line(6,28,21,8,2,'#e8dec5');for(let i=0;i<3;i++)g.line(11+i*3,22-i*4,17+i*2,20-i*4,1,shade(c,-.35));if(bolt)g.poly([[26,10],[21,17],[25,17],[19,25],[28,16],[24,16]],'#fff0a0');}
  function gem(g,c,broken=false){g.poly([[12,4],[22,7],[26,18],[19,28],[8,25],[5,13]],shade(c,-.35));g.poly([[12,5],[19,8],[16,18],[7,13]],shade(c,.4));g.poly([[19,8],[24,17],[17,19],[16,18]],c);g.poly([[8,16],[16,20],[18,26],[9,24]],c);g.line(14,8,11,12,1,'#fff8e2');if(broken){g.poly([[17,3],[15,14],[21,16],[16,28],[22,19],[18,13],[21,6]],'#253034');g.p(26,26,c);g.r(3,25,3,3,c);}}
  function bone(g,c='#e1d8bc',triple=false){const draw=(dx,dy)=>{g.ell(8+dx,9+dy,3,3,c);g.ell(11+dx,6+dy,3,3,c);g.line(10+dx,10+dy,22+dx,22+dy,6,c);g.ell(21+dx,25+dy,3,3,c);g.ell(25+dx,22+dy,3,3,c);g.line(12+dx,11+dy,22+dx,21+dy,1,'#fff5d9');};draw(triple?-1:0,triple?-1:0);if(triple)g.poly([[7,25],[14,21],[15,24],[9,28]],shade(c,-.25));}
  function drop(g,c){g.poly([[16,3],[9,13],[6,21],[9,27],[17,29],[25,25],[26,19],[21,11]],shade(c,-.25));g.ell(16,21,8,7,c);g.poly([[15,7],[10,17],[11,21],[14,15],[17,12]],shade(c,.55));}
  function bag(g,c,powder=true){g.poly([[11,8],[9,4],[22,4],[20,9],[26,20],[25,27],[7,27],[6,20]],shade(c,-.25));g.poly([[12,10],[19,10],[23,21],[22,25],[9,25],[9,20]],c);g.r(10,8,12,3,'#b89560');g.line(11,14,10,21,1,shade(c,.5));if(powder)for(const[x,y]of[[13,18],[19,17],[16,23],[21,22]])g.r(x,y,2,2,'#f2e5b7');}
  function fang(g,c='#e8ddc4'){g.poly([[10,5],[23,7],[21,17],[15,24],[7,28],[11,20],[13,12]],shade(c,-.24));g.poly([[12,6],[20,8],[18,17],[12,23],[14,14]],c);g.r(10,5,12,3,'#b99a76');}
  function fur(g,c){g.poly([[10,5],[15,8],[23,5],[24,11],[28,16],[24,20],[25,28],[17,25],[8,28],[9,22],[4,17],[9,12]],shade(c,-.3));g.poly([[11,8],[16,11],[22,8],[21,15],[25,17],[21,20],[22,25],[16,22],[10,25],[11,19],[8,17],[12,14]],c);g.line(13,12,16,18,1,shade(c,.5));g.line(17,20,20,17,1,shade(c,-.4));}
  function scale(g,c){g.poly([[16,4],[26,11],[25,20],[16,29],[7,21],[6,11]],shade(c,-.35));g.poly([[16,7],[23,12],[22,19],[16,25],[10,19],[9,12]],c);g.line(16,9,16,23,2,shade(c,.45));g.line(11,14,15,17,1,shade(c,-.3));g.line(21,14,17,17,1,shade(c,-.3));}
  function eye(g,c){g.poly([[3,16],[10,9],[22,9],[29,16],[22,23],[10,23]],shade(c,-.35));g.poly([[5,16],[11,12],[21,12],[27,16],[21,20],[11,20]],'#e8e0c6');g.ell(16,16,5,6,c);g.r(15,11,2,11,'#15212a');g.r(12,12,2,2,'#fff7e5');}
  function gear(g,c,clock=false){for(let i=0;i<8;i++){const a=i*Math.PI/4;g.r(Math.round(14+Math.cos(a)*11),Math.round(14+Math.sin(a)*11),5,5,shade(c,-.2));}g.ell(16,16,10,10,c);g.ell(16,16,6,6,shade(c,-.4));g.ell(16,16,3,3,'#e4dbc1');if(clock){g.line(16,9,16,16,2,'#24312d');g.line(16,16,21,18,2,'#24312d');}}
  function crown(g,c,y=9){g.poly([[6,y+6],[5,y-1],[11,y+3],[16,y-4],[21,y+3],[27,y-1],[26,y+6]],c);g.r(6,y+5,20,3,shade(c,-.3));g.r(14,y+2,3,3,'#f4e3a7');}
  function web(g,c){for(let i=0;i<8;i++){const a=i*Math.PI/4;g.line(16,16,16+Math.cos(a)*12,16+Math.sin(a)*12,1,c);}for(const r of[5,9]){let last=null;for(let i=0;i<=8;i++){const a=i*Math.PI/4,p=[16+Math.cos(a)*r,16+Math.sin(a)*r];if(last)g.line(...last,...p,1,c);last=p;}}}
  function horn(g,c){g.poly([[7,25],[12,27],[19,22],[23,14],[24,5],[20,11],[15,16],[9,18]],shade(c,-.3));g.poly([[9,23],[15,21],[19,16],[21,10],[18,19],[13,25]],c);g.line(9,20,15,23,1,shade(c,.3));}
  function cloth(g,c){g.poly([[5,7],[24,5],[27,23],[22,27],[18,24],[13,28],[9,24],[6,26]],shade(c,-.3));g.poly([[7,9],[22,8],[24,22],[20,24],[15,23],[11,25],[8,22]],c);g.line(11,10,13,23,1,shade(c,-.3));g.line(17,9,19,22,1,shade(c,.4));}
  function ingot(g,c){g.poly([[8,9],[24,9],[29,22],[3,22]],shade(c,-.3));g.poly([[8,9],[24,9],[21,15],[6,15]],shade(c,.35));g.poly([[6,15],[21,15],[25,22],[3,22]],c);g.line(7,16,6,20,1,shade(c,.6));}
  function bottle(g,c,oil=false){g.r(12,3,8,3,'#a27f53');g.r(13,6,6,6,'#b2d7d4');g.poly([[13,10],[19,10],[25,17],[24,27],[8,27],[7,17]],'#c4d9d0');g.poly([[10,18],[22,18],[21,25],[11,25]],c);g.line(10,15,10,20,1,'#fff8de');if(oil)g.r(14,18,5,6,'#d6c39a');}
  function star(g,x,y,c,r=6){g.poly([[x,y-r],[x+2,y-2],[x+r,y-2],[x+3,y+1],[x+4,y+r],[x,y+3],[x-4,y+r],[x-3,y+1],[x-r,y-2],[x-2,y-2]],c);}
  function compass(g,c){g.ell(16,17,11,11,'#c4a86b');g.ell(16,17,8,8,'#e4dbc3');g.poly([[16,7],[20,17],[16,26],[12,17]],c);g.poly([[16,7],[16,17],[12,17]],shade(c,.4));g.ell(16,17,2,2,'#f6edcc');g.r(13,2,6,4,'#c4a86b');}
  function material(id){return icon('mat:'+id,(g,x)=>{
    if(id[0]==='m'){
      const n=+id.slice(1);
      if(n===1){g.ell(16,22,11,6,'#57a25d');g.poly([[5,21],[8,12],[13,9],[20,10],[25,16],[27,23]],'#8dd77f');g.ell(12,14,3,2,'#e0f4c4');g.r(8,25,15,2,'#3b804a');}
      if(n===2)fur(g,'#a88861');if(n===3)fang(g);if(n===4)feather(g,'#d8d5c3');if(n===5)scale(g,'#76a784');if(n===6)fur(g,'#c3ab87');
      if(n===7)drop(g,'#81c4d5');if(n===8){g.ell(16,18,11,10,'#ad8c65');g.line(16,9,16,26,2,'#dfbe8f');for(const y of[14,20])g.line(7,y,25,y,1,'#6c6049');}
      if(n===9){for(const a of[-4,0,4]){g.line(15+a,26,10+a,7,2,'#8eae67');g.poly([[11+a,15],[6+a,10],[8+a,6],[12+a,11]],'#adc985');}g.r(9,23,15,3,'#b79a65');}
      if(n===10)bag(g,'#8ba36d');if(n===11)ingot(g,'#a8b5bb');if(n===12)cloth(g,'#b6ac97');if(n===13)bone(g);if(n===14){bag(g,'#8799af');g.ell(16,18,4,5,'#d3e8e4');g.p(14,17,'#627487');g.p(17,17,'#627487');}
      if(n===15){g.poly([[6,12],[14,6],[24,10],[27,23],[18,27],[5,23]],'#8b9695');g.poly([[8,13],[14,8],[22,11],[18,17]],'#bdc4b8');g.line(19,18,22,23,2,'#606e70');}
      if(n===16)gear(g,'#bba46b');if(n===17)bottle(g,'#755c3c',true);if(n===18){bag(g,'#aa8cbd');star(g,16,18,'#e5d6ee',4);}if(n===19)horn(g,'#a896b5');
      if(n===20){g.poly([[5,20],[23,5],[28,11],[10,27]],'#9f784d');g.poly([[7,20],[23,7],[25,10],[10,24]],'#c4a16d');g.ell(9,23,5,4,'#d4b784');g.ell(9,23,2,2,'#a2784b');g.line(15,15,23,11,1,'#6d583c');}
      if(n===21){bottle(g,'#c4b96d',true);g.poly([[11,22],[17,19],[20,21],[17,24]],'#716e44');g.poly([[20,21],[23,18],[23,25]],'#716e44');}
      return;
    }
    if(id[0]==='s'){
      const n=+id.slice(1);
      if(n===1){gem(g,'#e17e47');g.poly([[16,7],[12,15],[16,21],[21,14],[20,23],[11,25],[8,18]],'#f6cf76');}if(n===2){gem(g,'#96d0e3');g.line(10,20,21,11,1,'#e8f5ec');}
      if(n===3){g.poly([[11,5],[20,5],[25,27],[6,27]],'#c4c9c1');for(let y=9;y<26;y+=4)g.line(10,y,23,y-1,2,'#edf0d9');g.line(24,23,28,28,1,'#edf0d9');}
      if(n===4){bag(g,'#94aa5e');drop(g,'#a9cb6c');g.r(13,19,7,2,'#4b7041');}if(n===5){bag(g,'#a392bf');g.ell(18,16,4,4,'#ecddaa');g.ell(20,14,3,3,'#a392bf');}
      if(n===6)feather(g,'#d8c775',true);if(n===7){bottle(g,'#b9a074');star(g,16,20,'#fff1b1',5);g.p(25,7,'#efda8e');}if(n===8){feather(g,'#eee9d0');g.ell(18,4,6,2,'#e2bf60');}
      if(n===9){g.poly([[8,5],[24,5],[26,26],[7,27]],'#beab80');g.poly([[10,7],[22,7],[24,23],[9,25]],'#90c0cc');g.poly([[11,9],[18,8],[12,17]],'#dfeddf');g.line(18,10,15,16,1,'#455f68');g.line(15,16,20,22,1,'#455f68');}
      if(n===10)eye(g,'#849e6c');if(n===11){g.ell(15,21,10,9,'#4b5057');g.ell(12,18,3,2,'#7f8790');g.r(13,8,5,4,'#b9afa1');g.line(16,8,23,5,2,'#bc9d60');star(g,25,5,'#e8b363',3);}
      if(n===12){ingot(g,'#d9b358');g.r(16,13,2,2,'#fff1b2');}if(n===13){g.line(8,27,15,10,3,'#79a15a');g.poly([[14,8],[26,9],[22,17],[14,23],[18,16],[10,12]],'#cdd8a4');g.line(17,11,23,11,1,'#f2f0d1');}return;
    }
    const n=+id.slice(4),c=themes['b'+String(n).padStart(2,'0')]||'#b4b5a9';
    if(n===1){g.ell(16,21,10,7,c);g.ell(13,18,3,2,'#def3c5');crown(g,'#d8b664',10);}
    else if(n===2){g.poly([[9,7],[22,6],[26,23],[18,28],[6,24]],'#9a744d');g.poly([[16,23],[10,17],[11,12],[15,11],[17,14],[20,11],[23,13],[23,17]],'#a6bd75');g.line(7,13,10,20,1,'#d5b783');}
    else if(n===3){ingot(g,c);crown(g,'#d2b368',8);}
    else if(n===4){web(g,'#dbc9de');g.ell(16,17,5,6,'#a188b2');crown(g,'#d8b565',9);}
    else if(n===5){gem(g,c);g.ell(16,16,5,5,'#d9d6c5');g.r(12,14,3,3,'#65556f');g.r(18,14,3,3,'#65556f');g.r(14,21,5,2,'#b7b0ab');}
    else if([6,15,22].includes(n))scale(g,c);
    else if(n===7){gem(g,c);crown(g,'#d4ebed',9);}
    else if([8,19,29].includes(n)){feather(g,c,n===8);if(n===29){g.poly([[11,11],[17,5],[24,6],[18,9]],'#68617d');g.ell(19,3,6,2,'#e2d8aa');}}
    else if(n===9){ingot(g,c);g.ell(16,16,4,4,'#ded3c3');g.r(13,15,2,2,'#5b4f64');g.r(17,15,2,2,'#5b4f64');}
    else if(n===10){g.ell(16,17,11,10,'#b28ac4');g.ell(16,17,7,6,'#e0bcda');g.ell(16,17,3,3,'#825f94');g.line(6,12,5,6,3,'#a37cb4');}
    else if(n===11){cloth(g,c);g.poly([[12,11],[20,11],[17,16],[20,21],[12,21],[15,16]],'#659ca7');g.r(10,8,14,2,'#f1df99');}
    else if(n===12)gear(g,c,true);
    else if(n===13)eye(g,c);
    else if(n===14){fang(g,c);g.poly([[6,7],[10,5],[9,17],[4,22]],'#edbb82');g.poly([[23,8],[27,7],[25,20],[20,25]],'#edbb82');}
    else if(n===16)compass(g,c);
    else if(n===17)fang(g,c);
    else if(n===18){g.ell(16,16,11,11,'#bcac75');g.ell(16,16,8,8,c);g.ell(13,13,3,2,'#eef2df');g.r(9,26,14,2,'#bcac75');}
    else if(n===20){gear(g,'#829aab');gem(g,'#c8d9bd');}
    else if([21,24].includes(n)){g.poly([[6,6],[26,6],[24,23],[16,29],[8,23]],c);g.poly([[16,9],[21,14],[16,23],[11,14]],shade(c,-.4));g.r(8,4,16,3,'#d8b975');}
    else if(n===23)bone(g,c,true);
    else if(n===25){gem(g,c);g.poly([[9,10],[3,4],[4,16],[10,19]],'#786186');g.poly([[24,10],[29,4],[28,16],[22,19]],'#786186');}
    else if(n===26)fur(g,c);
    else if(n===27){for(let i=0;i<5;i++)g.poly([[7+i*4,5],[11+i*4,10],[8+i*4,23],[5+i*4,28],[6+i*4,16]],i%2?c:shade(c,-.3));}
    else if(n===28){for(let i=0;i<4;i++){const x=7+i*6;g.line(x,27,x-2,19,3,shade(c,-.3));g.line(x-2,19,x+2,11,3,c);g.ell(x+2,8+i%2*2,3,3,c);g.p(x+3,7+i%2*2,'#eadd93');}}
    else if(n===30)gem(g,c,true);
    else if(n===31){g.poly([[5,7],[12,8],[14,18],[9,27],[11,17]],c);g.poly([[27,7],[20,8],[18,18],[23,27],[21,17]],c);for(let i=0;i<3;i++){g.p(12,11+i*4,'#e4d2aa');g.p(19,11+i*4,'#e4d2aa');}}
    else if(n===32){g.ell(16,17,12,10,c);g.line(16,8,16,25,2,'#f3c49f');for(const x of[6,12,21,26])g.poly([[x,14],[x-2,6],[x+3,13]],shade(c,-.25));}
    else if(n===33){g.poly([[7,7],[24,7],[26,25],[9,27]],'#a27e55');g.ell(16,8,10,4,'#e2d5af');g.line(10,12,22,23,1,'#e0c896');g.line(22,11,12,25,1,'#e0c896');g.poly([[17,10],[13,17],[18,17],[14,24],[23,15],[18,15]],'#e8d46d');}
    else if(n===34)horn(g,c);
    else if(n===35){for(let i=0;i<3;i++){g.line(7,25,13+i*4,16-i*3,1,c);g.line(13+i*4,16-i*3,25,6+i*3,1,shade(c,.4));}star(g,24,6,'#e5dca5',4);}
  });}
  function equipment(e){const id=e.craft||e.id.replace('craft_',''),r=window.CRAFT_DATA.recipes.find(r=>r.id===id);if(!r)return SPR.gearIcon({...e,id:e.vis||'w0',craft:null});return icon('eq:'+id,(g,x)=>{
    const c=themes[id]||'#b49f7b',d=shade(c,-.4),h=shade(c,.45);
    if(r.slot==='weapon'){
      x.save();x.translate(16,16);x.rotate(Math.PI/4);
      if(['b03','b17','b30','b33'].includes(id)){g.r(-2,-8,4,20,'#9a7952');g.poly([[-9,-11],[9,-11],[10,-2],[-8,-2]],c);g.r(-7,-10,12,2,h);g.r(5,-8,3,6,d);if(id==='b33')g.line(-6,-7,6,-4,1,'#f3e5a5');}
      else if(id==='f11'){g.r(-1,-10,3,26,'#8e7651');g.poly([[0,-17],[-4,-9],[0,-5],[4,-9]],c);g.line(0,-16,0,-8,1,h);g.r(-3,-6,7,2,'#c0a36b');}
      else if(id==='f13'){g.r(-1,-12,3,25,'#819f66');g.poly([[-1,-12],[10,-10],[12,-1],[4,7],[7,-1],[4,-6]],c);g.line(3,-8,8,-6,1,h);}
      else{g.poly([[-3,-9],[0,-15],[3,-9],[3,6],[-3,6]],c);g.r(-2,-8,1,13,h);g.r(1,-7,1,12,d);g.r(-6,6,12,2,'#c8aa6a');g.r(-1,8,3,7,'#74573e');if(['b21','b24'].includes(id)){g.line(6,-11,6,4,2,d);g.line(7,-11,7,-12,1,h);}}
      x.restore();
    }else if(r.slot==='armor'){
      if(id==='b11'){g.poly([[9,3],[23,3],[28,9],[25,28],[7,28],[4,9]],c);g.r(11,7,10,4,h);g.line(16,13,16,23,3,'#b38f52');g.r(11,15,10,2,'#b38f52');}
      else{g.poly([[5,7],[11,4],[21,4],[27,7],[25,15],[22,28],[10,28],[7,15]],c);g.poly([[17,7],[23,8],[21,25],[17,25]],d);g.poly([[12,4],[20,4],[18,9],[14,9]],'#26352f');g.line(9,9,11,23,2,h);if(id==='b23'){g.poly([[5,12],[1,5],[3,20],[8,22]],'#d6ceb6');g.poly([[27,12],[31,5],[29,20],[24,22]],'#d6ceb6');}if(id==='b32'){g.poly([[5,9],[2,4],[8,5]],'#e4b28a');g.poly([[27,9],[30,4],[24,5]],'#e4b28a');}}
    }else if(r.slot==='boots'){
      g.r(9,4,11,15,c);g.r(17,5,3,14,d);g.r(8,4,13,4,h);g.poly([[9,18],[20,17],[26,22],[26,27],[7,27]],c);g.r(7,27,21,3,'#565547');g.line(10,20,14,24,2,h);
      if(['f06','b08','b19','b26'].includes(id)){g.poly([[9,11],[2,5],[3,12],[1,16],[8,18]],h);g.line(3,9,8,13,1,d);}if(['b04','f03'].includes(id))web(g,shade(c,.5));
    }else if(r.slot==='tool'){
      g.r(6,24,20,4,'#ae8b50');g.line(16,7,16,24,3,'#d5b977');g.line(5,9,27,9,2,'#d5b977');for(const dx of[-8,8]){g.line(16+dx,9,16+dx-4,18,1,'#e1c98a');g.line(16+dx,9,16+dx+4,18,1,'#e1c98a');g.poly([[10+dx,18],[22+dx,18],[19+dx,22],[13+dx,22]],c);}}
    else if(r.slot==='item'){
      const colors={p01:'#8bbd9d',p02:'#9baab5',p03:'#b59bc7',p04:'#b8bd8a',p05:'#b898d3',p06:'#d09b76'};bottle(g,colors[id]||c);if(id==='p01')g.line(14,20,19,16,2,'#e7ecd0');if(id==='p02')g.r(13,16,7,8,'#d8dfd3');if(id==='p03')fang(g,'#d2c4d8');if(id==='p04')g.line(12,21,21,21,1,'#edf0cd');if(id==='p05')g.ell(16,20,4,4,'#e8d8ef');if(id==='p06')g.poly([[12,23],[20,15],[23,20],[16,25]],'#d7c8ac');
    }else{
      if(id==='b12'){g.ell(16,17,11,11,'#c1a16b');g.ell(16,17,8,8,'#e6ddc5');g.r(13,2,6,4,'#c1a16b');g.line(16,10,16,17,2,d);g.line(16,17,21,20,2,d);for(const [px,py]of[[16,10],[23,17],[16,24],[9,17]])g.p(px,py,d);}
      else if(id==='b16')compass(g,c);
      else if(['b13','b28','f10'].includes(id)){if(id==='b28')crown(g,'#bda775',18);eye(g,c);}
      else if(['f05','b27'].includes(id)){g.line(16,3,16,8,2,'#c4b275');g.ell(16,17,8,10,c);g.r(6,24,20,3,h);g.ell(16,28,3,2,'#c4b275');}
      else if(id==='b18'){g.ell(16,18,11,9,'#c5b071');g.ell(16,18,7,5,'#263a36');g.ell(10,8,5,5,c);g.ell(22,8,5,5,'#bd9dd3');g.p(8,6,'#eef3e3');g.p(20,6,'#eef3e3');}
      else if(['f07','b35'].includes(id)){g.ell(16,17,11,11,d);g.ell(16,17,8,8,c);star(g,16,16,'#efe2ad',6);}
      else if(id==='b34'){for(let i=0;i<4;i++)g.line(9+i*4,18,8+i*4,5+(i%2)*3,3,c);g.ell(16,21,9,7,c);g.line(7,19,4,14,3,c);g.r(12,26,9,4,d);}
      else{g.ell(16,20,10,8,'#c6ac71');g.ell(16,20,6,4,'#293d35');g.poly([[16,3],[23,9],[20,16],[12,16],[9,9]],c);g.line(14,6,12,10,1,h);}
    }
    // Material-derived inset distinguishes items of the same silhouette.
    if(r.slot!=='item'&&r.slot!=='tool'){
      if(['b01'].includes(id)){g.ell(15,15,5,4,'#b9e8a2');g.p(13,13,'#e9f8cd');}
      else if(id==='b02'){g.line(15,10,15,23,2,'#e0c58a');g.line(15,15,11,12,2,'#b6d088');g.line(15,18,20,14,2,'#b6d088');}
      else if(['f06','b08','b33'].includes(id))g.poly([[18,8],[13,16],[17,16],[13,23],[22,13],[18,13]],'#f8e8a6');
      else if(['f03','b04'].includes(id)){g.ell(16,17,3,3,'#f0e1e3');g.line(12,13,20,21,1,d);}
      else if(['b05','b09','b23'].includes(id)){g.ell(17,16,4,4,'#dedac6');g.p(15,15,d);g.p(18,15,d);g.r(15,20,4,1,'#dedac6');}
      else if(id==='b06'){g.poly([[16,9],[11,18],[15,22],[21,17],[18,13]],'#f5c177');}
      else if(['f02','b07'].includes(id)){g.line(10,17,22,17,1,'#edf8ef');g.line(16,11,16,23,1,'#edf8ef');g.line(12,13,20,21,1,'#edf8ef');}
      else if(['b14','b17'].includes(id)){g.poly([[12,12],[15,13],[13,21]],'#ead6ae');if(id==='b14'){g.poly([[17,11],[20,12],[18,21]],'#ead6ae');g.poly([[22,12],[25,13],[23,22]],'#ead6ae');}}
      else if(id==='b15'){for(let i=0;i<3;i++)g.poly([[12+i*4,13],[16+i*4,17],[14+i*4,21],[10+i*4,17]],i%2?'#bed3a0':'#73945d');}
      else if(id==='b20'){g.r(13,13,7,7,'#d9dac2');g.r(15,15,3,3,'#e9c786');}
      else if(id==='b21'){g.line(10,12,20,22,1,'#d8c7f0');g.line(13,10,23,20,1,'#d8c7f0');}
      else if(id==='b24'){g.line(11,12,22,22,2,'#ebc49b');g.line(22,12,11,22,2,'#ebc49b');}
      else if(id==='b25'){g.poly([[12,11],[9,6],[10,15]],'#e1b8e4');g.poly([[20,11],[23,6],[22,15]],'#e1b8e4');}
      else if(id==='b29'){g.poly([[12,12],[16,17],[12,24],[9,17]],'#f1e4ad');g.poly([[21,12],[17,17],[21,24],[24,17]],'#655476');}
      else if(id==='b30'){g.line(11,10,18,16,2,'#e8bfd5');g.line(18,16,14,22,2,'#e8bfd5');}
      else if(id==='b31'){g.poly([[12,12],[15,17],[12,22]],'#ead6aa');g.poly([[21,12],[18,17],[21,22]],'#ead6aa');}
      else if(id==='b32'){g.line(15,12,15,23,1,'#f4d4a8');g.line(11,16,21,16,1,'#f4d4a8');}
      else if(id==='b26'){g.line(9,10,13,16,1,'#fbf5df');g.line(10,13,12,20,1,'#fbf5df');}
      else if(!['b12','b13','b16','b18','b28','b34','b35','f05','f07','f10'].includes(id)){g.ell(16,17,3,3,h);g.p(15,15,'#fff1ce');}
    }
  });}
  return {material,equipment};
})();
