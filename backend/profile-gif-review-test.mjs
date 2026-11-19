// Independent codec regression checks. No browser or hosted-storage claims.
import assert from 'node:assert/strict';
import {encodeGIF} from '@sindresorhus/gifkit';
import {decode as decodePng} from 'fast-png';
import {inspectProfileGif} from '../src/media-validation.mjs';
import {prepareProfileGif} from '../src/profile-gif.mjs';

const tests=[];
const test=(name,run)=>tests.push([name,run]);
const palette=new Uint8Array([255,255,255,230,35,70]);
function partial(transparent=false){
 return encodeGIF({width:4,height:4,backgroundColorIndex:0,globalColorTable:palette,blocks:[{
  type:'image',left:1,top:1,width:2,height:2,pixels:new Uint8Array([1,1,1,1]),
  ...(transparent?{graphicControlExtension:{transparentColorIndex:0,delay:.1}}:{}),
 }]});
}
const pixel=(png,x,y)=>[...png.data.slice((y*png.width+x)*4,(y*png.width+x)*4+4)];

test('an opaque partial first frame keeps its logical GIF background in the poster',()=>{
 const bytes=partial(),before=Uint8Array.from(bytes),png=decodePng(prepareProfileGif(bytes).poster);
 assert.deepEqual(pixel(png,0,0),[255,255,255,255]);
 assert.deepEqual(pixel(png,1,1),[230,35,70,255]);
 assert.deepEqual(pixel(png,3,3),[255,255,255,255]);
 assert.deepEqual(bytes,before,'poster preparation must preserve original source bytes');
});

test('a transparent partial first frame keeps transparent surroundings in the poster',()=>{
 const png=decodePng(prepareProfileGif(partial(true)).poster);
 assert.deepEqual(pixel(png,0,0),[0,0,0,0]);
 assert.deepEqual(pixel(png,1,1),[230,35,70,255]);
});

test('strict decoding validates palette indices in later frames, beyond structural preflight',()=>{
 const bytes=encodeGIF({width:2,height:1,globalColorTable:new Uint8Array([
  0,0,0,255,255,255,230,35,70,40,90,200,
 ]),blocks:[
  {type:'image',width:2,height:1,pixels:new Uint8Array([0,1])},
  {type:'image',width:2,height:1,pixels:new Uint8Array([2,3])},
 ]});
 // Keep the original LZW streams, but shrink the declared palette to two entries.
 // The first image remains valid; the second still contains out-of-palette indices.
 const damaged=new Uint8Array(bytes.length-6);
 damaged.set(bytes.subarray(0,19));damaged.set(bytes.subarray(25),19);
 damaged[10]&=~7;
 assert.equal(inspectProfileGif(damaged).frames,2);
 assert.throws(()=>prepareProfileGif(damaged),/color|palette|index/i);
});

test('interlaced first-frame artwork produces the same poster pixels as its noninterlaced source',()=>{
 const width=7,height=9,pixels=Uint8Array.from({length:width*height},(_,index)=>(index+Math.floor(index/width))%2);
 const create=isInterlaced=>encodeGIF({width,height,globalColorTable:palette,blocks:[{type:'image',width,height,pixels,isInterlaced}]});
 const ordinary=decodePng(prepareProfileGif(create(false)).poster),interlaced=decodePng(prepareProfileGif(create(true)).poster);
 assert.equal(ordinary.width,interlaced.width);assert.equal(ordinary.height,interlaced.height);
 assert.deepEqual(ordinary.data,interlaced.data);
});

let failed=0;
for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.stack);}}
console.log(`${tests.length-failed}/${tests.length} independent GIF codec checks passed. Native codec fixtures; not browser playback or hosted-storage verification.`);
process.exitCode=failed?1:0;
