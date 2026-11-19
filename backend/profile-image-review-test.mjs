// Independent exact-pixel/import-boundary checks; no browser rasterization claim.
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {decodeProfileImageCodec} from '../src/profile-image-codecs-worker.mjs';
import {prepareProfileSvg} from '../src/profile-svg.mjs';

const tests=[],test=(name,run)=>tests.push([name,run]);
function tiff({width,height=1,bits=8,photo=1,channels=1,data,little=true,fillOrder,omitBits=false,palette,alpha}){
 const entries=[
  [256,4,[width]],[257,4,[height]],[259,3,[1]],[262,3,[photo]],
  [273,4,[0]],[274,3,[1]],[277,3,[channels]],[278,4,[height]],
  [279,4,[data.length]],[284,3,[1]],
 ];
 if(!omitBits)entries.push([258,3,Array(channels).fill(bits)]);
 if(fillOrder!==undefined)entries.push([266,3,[fillOrder]]);
 if(palette)entries.push([320,3,palette]);
 if(alpha!==undefined)entries.push([338,3,[alpha]]);
 entries.sort((a,b)=>a[0]-b[0]);
 const tableEnd=8+2+entries.length*12+4;
 let payloadAt=tableEnd;
 for(const entry of entries){const size=(entry[1]===3?2:4)*entry[2].length;if(size>4){entry[3]=payloadAt;payloadAt+=size;}}
 entries.find(entry=>entry[0]===273)[2]=[payloadAt];
 const output=new Uint8Array(payloadAt+data.length),view=new DataView(output.buffer);
 output.set(little?[73,73]:[77,77]);view.setUint16(2,42,little);view.setUint32(4,8,little);view.setUint16(8,entries.length,little);
 for(let i=0;i<entries.length;i++){
  const [tag,type,values,external]=entries[i],at=10+i*12;
  view.setUint16(at,tag,little);view.setUint16(at+2,type,little);view.setUint32(at+4,values.length,little);
  if(external!==undefined)view.setUint32(at+8,external,little);
  for(let j=0;j<values.length;j++)if(type===3)view.setUint16((external??at+8)+j*2,values[j],little);else view.setUint32((external??at+8)+j*4,values[j],little);
 }
 output.set(data,payloadAt);return output;
}
const rgba=async bytes=>[...new Uint8Array((await decodeProfileImageCodec({bytes,mime:'image/tiff'})).pixels)];
const gray=values=>values.flatMap(value=>[value,value,value,255]);
const samples16=(values,little)=>{const result=new Uint8Array(values.length*2),view=new DataView(result.buffer);values.forEach((value,i)=>view.setUint16(i*2,value,little));return result;};

test('TIFF 8-bit palette channels use their full 16-bit color-map range',async()=>{
 const palette=Array(768).fill(0);
 for(const [index,color]of [[0,[65535,0,0]],[1,[0,65535,0]],[2,[0,0,65535]],[3,[32896,16448,65535]]])color.forEach((value,channel)=>palette[channel*256+index]=value);
 assert.deepEqual(await rgba(tiff({width:4,photo:3,data:new Uint8Array([0,1,2,3]),palette})),[255,0,0,255,0,255,0,255,0,0,255,255,128,64,255,255]);
});
test('TIFF 1-bit black-is-zero and white-is-zero preserve pixel polarity and row padding',async()=>{
 const data=new Uint8Array([0b10110000,0b01000000]);
 assert.deepEqual(await rgba(tiff({width:4,height:2,bits:1,photo:1,data})),gray([255,0,255,255,0,255,0,0]));
 assert.deepEqual(await rgba(tiff({width:4,height:2,bits:1,photo:0,data})),gray([0,255,0,0,255,0,255,255]));
});
test('TIFF 16-bit grayscale and RGB preserve middle values in both byte orders',async()=>{
 for(const little of [true,false]){
  assert.deepEqual(await rgba(tiff({width:3,bits:16,little,data:samples16([0,32896,65535],little)})),gray([0,128,255]));
  assert.deepEqual(await rgba(tiff({width:1,bits:16,photo:2,channels:3,little,data:samples16([65535,32896,16448],little)})),[255,128,64,255]);
 }
});
test('TIFF unassociated16-bit alpha scales together with the source RGB samples',async()=>{
 assert.deepEqual(await rgba(tiff({width:2,bits:16,photo:2,channels:4,alpha:2,data:samples16([56540,7710,17990,32896,2570,61680,35980,0],true)})),[220,30,70,128,10,240,140,0]);
});
test('a valid omitted default bi-level sample depth is supported or explicitly rejected before the vendor decoder',async()=>{
 const bytes=tiff({width:4,bits:1,omitBits:true,data:new Uint8Array([0b10110000])});
 try{assert.deepEqual(await rgba(bytes),gray([255,0,255,255]));}
 catch(error){assert.match(error.message,/Export.*PNG|pixel layout is not supported/,'raw vendor undefined-depth errors are not valid import guidance');}
});
test('LSB-first TIFF data is never silently interpreted as MSB-first artwork',async()=>{
 const bytes=tiff({width:4,bits:1,fillOrder:2,data:new Uint8Array([0b00001101])});
 try{assert.deepEqual(await rgba(bytes),gray([255,0,255,255]));}
 catch(error){assert.match(error.message,/fill|layout|supported|Export/i);}
});
test('external XML bases cannot change the meaning of accepted internal SVG paint URLs before parsing',()=>{
 const window=new JSDOM('').window;let calls=0;
 try{
  const host={document:window.document,XMLSerializer:window.XMLSerializer,DOMParser:class{constructor(){calls++;}parseFromString(){throw Error('Unexpected parse');}}};
  const source='<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://outside.invalid/paint.svg" width="16" height="16"><defs><linearGradient id="p"><stop offset="0" stop-color="red"/></linearGradient></defs><rect width="16" height="16" fill="url(#p)"/></svg>';
  assert.throws(()=>prepareProfileSvg(new TextEncoder().encode(source),{window:host}),/SVG|static|unsupported|base/);
  assert.equal(calls,0);
 }finally{window.close();}
});

let failures=0;
for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error.stack);}}
console.log(`${tests.length-failures}/${tests.length} independent image-import checks passed. Actual TIFF pixels and SVG preparse guards; not browser rendering or hosted verification.`);
process.exitCode=failures?1:0;
