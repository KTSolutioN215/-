// Match browser Canvas semantics: napi-rs/canvas currently applies the CTM to
// putImageData, although the browser API explicitly ignores that transform.
// Keep this correction only in the recording/test adapter, never the game.
const canvas=require('@napi-rs/canvas');
const context=canvas.createCanvas(1,1).getContext('2d'),proto=Object.getPrototypeOf(context),original=proto.putImageData;
proto.putImageData=function(...args){this.save();this.resetTransform();try{return original.apply(this,args);}finally{this.restore();}};
module.exports=canvas;
