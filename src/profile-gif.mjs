/** Server-only GIF validation. Original animation bytes are never re-encoded. */
import {decodeGIF,renderGIFFrameSequence} from '@sindresorhus/gifkit';
import {encode as encodePng} from 'fast-png';
import {inspectProfileGif} from './media-validation.mjs';

const POSTER_SIDE=256,POSTER_BYTES=512*1024;
function posterPng(frame){
 const scale=Math.min(1,POSTER_SIDE/Math.max(frame.width,frame.height)),width=Math.max(1,Math.round(frame.width*scale)),height=Math.max(1,Math.round(frame.height*scale));
 const data=new Uint8Array(width*height*4);
 // Area averaging is bounded by one 1MP source frame and preserves thin/transparent artwork.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const left=Math.floor(x*frame.width/width),right=Math.max(left+1,Math.floor((x+1)*frame.width/width)),top=Math.floor(y*frame.height/height),bottom=Math.max(top+1,Math.floor((y+1)*frame.height/height));
  let alpha=0,red=0,green=0,blue=0,count=0;
  for(let sy=top;sy<bottom;sy++)for(let sx=left;sx<right;sx++){const source=(sy*frame.width+sx)*4,a=frame.pixels[source+3];alpha+=a;red+=frame.pixels[source]*a;green+=frame.pixels[source+1]*a;blue+=frame.pixels[source+2]*a;count++;}
  const dest=(y*width+x)*4;data[dest]=alpha?Math.round(red/alpha):0;data[dest+1]=alpha?Math.round(green/alpha):0;data[dest+2]=alpha?Math.round(blue/alpha):0;data[dest+3]=Math.round(alpha/count);
 }
 const bytes=encodePng({width,height,data,channels:4,depth:8});
 if(bytes.length>POSTER_BYTES)throw new Error('The GIF preview is too large. Choose a smaller GIF.');
 return bytes;
}
export function prepareProfileGif(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input),meta=inspectProfileGif(bytes,{includeFrameRanges:true});
 let poster=null;
 for(const range of meta.frameRanges){
  // A structural container slice is not a custom codec: gifkit validates/decompresses
  // each original LZW stream. Keep only one decoded indexed frame in memory at a time.
  const controlLength=range.controlStart===null?0:range.controlEnd-range.controlStart,imageLength=range.end-range.start;
  const container=new Uint8Array(meta.headerEnd+controlLength+imageLength+1);let at=meta.headerEnd;
  container.set(bytes.subarray(0,meta.headerEnd));
  if(controlLength){container.set(bytes.subarray(range.controlStart,range.controlEnd),at);at+=controlLength;}
  container.set(bytes.subarray(range.start,range.end),at);container[container.length-1]=59;
  const decoded=decodeGIF(container,{strict:true});
  if(decoded.imageBlocks.length!==1)throw new Error('This GIF frame could not be read.');
  if(!poster){
   const transparent=decoded.imageBlocks[0].graphicControlExtension?.transparentColorIndex!==undefined;
   const sequence=renderGIFFrameSequence(decoded,{strict:true,background:transparent?'transparent':'gif',repeat:false}),frame=sequence.next().value;
   if(!frame)throw new Error('This GIF has no readable first frame.');
   // gifkit exposes the image-patch geometry alongside full logical-screen pixels.
   poster=posterPng({...frame,width:decoded.width,height:decoded.height});sequence.return?.();
  }
 }
 const {headerEnd,frameRanges,...info}=meta;
 return {...info,poster};
}
