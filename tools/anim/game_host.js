// Executes the complete, unmodified game update/render code on a native Canvas.
// DOM nodes are adapters for menus; combat, camera, arena, effects and HUD are real.
const fs=require('fs'),path=require('path'),vm=require('vm'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
function gameHost(){
 const root=path.resolve(__dirname,'../..'),nodes=new Map(),storage=new Map();
 const font=process.env.FONT;if(font){GlobalFonts.registerFromPath(font,'Noto Sans JP');GlobalFonts.registerFromPath(font,'DotGothic16');}
 function node(id,canvas=false){const n=canvas?createCanvas(1,1):{};Object.assign(n,{id,style:{setProperty(k,v){this[k]=v;}},dataset:{},hidden:false,value:'',innerHTML:'',textContent:'',children:[],listeners:{},classList:{toggle(){},remove(){},add(){}},getBoundingClientRect:()=>({left:0,top:0,width:390,height:700}),addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);},appendChild(c){this.children.push(c);},querySelectorAll:()=>[],querySelector:()=>null,setAttribute(){},focus(){},click(){for(const fn of this.listeners.click||[])fn({stopPropagation(){}});},setPointerCapture(){}});return n;}
 const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,node(id,id==='cv'||id==='px'));return nodes.get(id);},createElement:tag=>node('',tag==='canvas'),addEventListener(){},querySelectorAll:()=>[],documentElement:{style:{}}};
 const w={console,document,navigator:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},performance:{now:()=>0},requestAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},devicePixelRatio:2,addEventListener(){},getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),location:{search:''}};w.window=w;
 vm.createContext(w);vm.runInContext('Math.random=(()=>{let n=7123;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};})();',w);
 for(const file of['sprites.js','fantasy.js','arrangements.js','yusha.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',file),'utf8'),w,{filename:file});
 const Y=w.__yusha;Y.audio=false;Y.manual=true;Y.noMerchant=true;Y.save.lv=70;document.getElementById('startBtn').click();Y.audio=false;
 const composite=createCanvas(780,1400),c=composite.getContext('2d');c.imageSmoothingEnabled=false;
 function image(){Y.render();const px=nodes.get('px'),hud=nodes.get('cv');c.resetTransform();c.clearRect(0,0,780,1400);c.drawImage(px,0,0,px.width*1.5*(390/360)*2,px.height*1.5*(390/360)*2);c.drawImage(hud,0,0);return composite;}
 return {Y,w,nodes,image};
}
module.exports={gameHost};
if(require.main===module){const{Y,image}=gameHost();Y.enter(Y.data.DUNGEONS.findIndex(d=>d.boss==='dragon'));Y.toBoss();Y.boss.intro=0;for(let i=0;i<180;i++){Y.hero.inv=10;Y.boss.cd=99;Y.update(1/60);}fs.writeFileSync('/tmp/fullgame.png',image().toBuffer('image/png'));console.log('Complete game update/render succeeded');}
