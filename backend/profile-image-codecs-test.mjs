import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {deflateSync} from 'node:zlib';
import {decodeProfileImageCodec,inspectTiffForCodec} from '../src/profile-image-codecs-worker.mjs';

const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),fixtures=path.join(root,'backend/fixtures/profile-images');
const heifFactory=require('libheif-js/libheif-wasm/libheif.js'),wasmBinary=readFileSync(path.join(root,'node_modules/libheif-js/libheif-wasm/libheif.wasm'));
const tests=[],test=(name,run)=>tests.push([name,run]),read=name=>readFileSync(path.join(fixtures,name));
const loadHeif=()=>heifFactory({wasmBinary,print(){},printErr(){}});
function field(bytes,tag){const little=bytes[0]===73,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.length),offset=view.getUint32(4,little),count=view.getUint16(offset,little);for(let at=offset+2;at<offset+2+12*count;at+=12)if(view.getUint16(at,little)===tag)return {view,at,little};throw Error('Missing fixture field '+tag);}
function setLong(bytes,tag,value){const f=field(bytes,tag);f.view.setUint16(f.at+2,4,f.little);f.view.setUint32(f.at+4,1,f.little);f.view.setUint32(f.at+8,value,f.little);return bytes;}
function addExifCycle(input){
 const original=Uint8Array.from(input),oldView=new DataView(original.buffer),count=oldView.getUint16(8,true),end=10+count*12,result=new Uint8Array(original.length+12);result.set(original.subarray(0,end),0);result.set(original.subarray(end),end+12);const view=new DataView(result.buffer);view.setUint16(8,count+1,true);
 for(let at=10;at<end;at+=12){const tag=view.getUint16(at,true),type=view.getUint16(at+2,true),n=view.getUint32(at+4,true),size=([0,1,1,2,4,8,1,1,2,4,8,4,8][type]||0)*n;if(size>4||tag===273)view.setUint32(at+8,view.getUint32(at+8,true)+12,true);}
 view.setUint16(end,0x8769,true);view.setUint16(end+2,4,true);view.setUint32(end+4,1,true);view.setUint32(end+8,8,true);return result;
}

test('actual maintained HEIC WASM decodes conformance padding and primary clean-aperture fixtures',async()=>{
 for(const [name,width,height,pixel]of [['conformance_window_padding.heic',1,1,[21,21,21,255]],['clap_cropped.heic',64,64,[255,0,4,255]]]){const bytes=read(name),before=Buffer.from(bytes),result=await decodeProfileImageCodec({bytes,mime:'image/heic'},{loadHeif});assert.equal(result.width,width);assert.equal(result.height,height);assert.equal(result.pixels.byteLength,width*height*4);assert.deepEqual([...new Uint8Array(result.pixels).subarray(0,4)],pixel);assert.deepEqual(bytes,before);}
});
test('actual maintained TIFF decoder returns exact RGB and16-bit grayscale pixels',async()=>{
 const rgb=await decodeProfileImageCodec({bytes:read('rgb-uncompressed.tiff'),mime:'image/tiff'});assert.deepEqual([rgb.width,rgb.height],[2,2]);assert.deepEqual([...new Uint8Array(rgb.pixels)],[255,0,0,255,0,255,0,255,0,0,255,255,240,230,220,255]);
 const gray=await decodeProfileImageCodec({bytes:read('gray16-uncompressed.tiff'),mime:'image/tiff'});assert.deepEqual([...new Uint8Array(gray.pixels)],[0,0,0,255,255,255,255,255]);
 const rgba=await decodeProfileImageCodec({bytes:read('rgba-uncompressed.tiff'),mime:'image/tiff'});assert.deepEqual([...new Uint8Array(rgba.pixels)],[220,30,70,128,10,240,140,0]);
});
test('TIFF default1-bit samples are normalized without input mutation and unsupported bit ordering is rejected',async()=>{
 const bytes=read('bilevel-default-uncompressed.tiff'),before=Buffer.from(bytes),result=await decodeProfileImageCodec({bytes,mime:'image/tiff'});assert.deepEqual([result.width,result.height],[8,1]);assert.deepEqual([...new Uint8Array(result.pixels)].filter((_,i)=>i%4===0),[255,0,255,0,0,255,255,0]);assert.deepEqual(bytes,before);
 const alternate=read('rgb-uncompressed.tiff'),f=field(alternate,284);f.view.setUint16(f.at,266,f.little);f.view.setUint16(f.at+8,2,f.little);await assert.rejects(decodeProfileImageCodec({bytes:alternate,mime:'image/tiff'}),/pixel layout/);
});
test('compressed TIFF and a declared tiny image with a large deflate expansion never reach decompression',async()=>{
 await assert.rejects(decodeProfileImageCodec({bytes:read('rgb-lzw.tiff'),mime:'image/tiff'}),/compressed TIFF.*PNG or JPEG/);
 const base=read('rgb-uncompressed.tiff'),bomb=deflateSync(Buffer.alloc(2*1024*1024)),bytes=Buffer.concat([base,bomb]);setLong(bytes,259,8);setLong(bytes,273,base.length);setLong(bytes,279,bomb.length);assert.throws(()=>inspectTiffForCodec(bytes),/compressed TIFF/);await assert.rejects(decodeProfileImageCodec({bytes,mime:'image/tiff'}),/compressed TIFF/);
});
test('TIFF dimensions, tag arrays and missing pixel ranges fail before maintained pixel allocation',async()=>{
 const oversized=setLong(read('rgb-uncompressed.tiff'),256,100000);assert.throws(()=>inspectTiffForCodec(oversized),/16 megapixels/);
 const array=read('rgb-uncompressed.tiff'),entry=field(array,258);entry.view.setUint32(entry.at+4,0xffffffff,entry.little);assert.throws(()=>inspectTiffForCodec(array),/metadata/);
 const truncated=setLong(read('rgb-uncompressed.tiff'),273,0xffffff00);assert.throws(()=>inspectTiffForCodec(truncated),/incomplete/);
 const compressedDepth=read('gray16-uncompressed.tiff');setLong(compressedDepth,258,32);assert.throws(()=>inspectTiffForCodec(compressedDepth),/pixel layout/);
});
test('unused cyclic EXIF and later-page pointers are isolated without changing the selected file',async()=>{
 const bytes=addExifCycle(read('rgb-uncompressed.tiff')),view=new DataView(bytes.buffer),count=view.getUint16(8,true);view.setUint32(10+count*12,8,true);const before=Uint8Array.from(bytes),result=await decodeProfileImageCodec({bytes,mime:'image/tiff'});assert.deepEqual([...new Uint8Array(result.pixels).subarray(0,4)],[255,0,0,255]);assert.deepEqual(bytes,before);
});
test('HEIC context limit precedes parsing and oversized handles never allocate/display RGBA',async()=>{
 const events=[],lib={heif_error_code:{heif_error_Ok:0},heif_context_alloc(){events.push('allocate');return 1;},heif_context_set_maximum_image_size_limit(ctx,width){assert.equal(ctx,1);assert.equal(width,4096);events.push('limit');},heif_context_read_from_memory(){events.push('parse');return{code:0};},heif_js_context_get_list_of_top_level_image_IDs(){return[7];},heif_js_context_get_image_handle(){return 7;},HeifImage:class{get_width(){return 100000;}get_height(){return 1;}is_primary(){return true;}display(){throw Error('Must not display');}free(){events.push('handle-free');}},heif_context_free(){events.push('context-free');}};
 await assert.rejects(decodeProfileImageCodec({bytes:new Uint8Array([1]),mime:'image/heic'},{loadHeif:async()=>lib}),/16 megapixels/);assert.deepEqual(events,['allocate','limit','parse','handle-free','context-free']);
});
test('actual HEIC metadata conflicting with its coded image cannot yield a decoded profile image',async()=>{
 const bytes=read('conformance_window_padding.heic'),at=bytes.indexOf(Buffer.from('ispe'));assert.ok(at>0);bytes.writeUInt32BE(100000,at+8);await assert.rejects(decodeProfileImageCodec({bytes,mime:'image/heic'},{loadHeif}),/HEIC|large|megapixels/);
});
test('codec transport rejects invalid sizes and unsupported MIME without invoking a decoder',async()=>{
 let calls=0;for(const bytes of [new Uint8Array(0),new Uint8Array(8*1024*1024+1)])await assert.rejects(decodeProfileImageCodec({bytes,mime:'image/heic'},{loadHeif:async()=>{calls++;}}),/8 MiB/);await assert.rejects(decodeProfileImageCodec({bytes:new Uint8Array([1]),mime:'image/avif'},{loadHeif:async()=>{calls++;}}),/available local decoder/);assert.equal(calls,0);
});
test('built classic worker dispatches real TIFF bytes and independently loads the same-origin HEIC WASM',async()=>{
 const source=readFileSync(path.join(root,'dist/pkg/profile-images/worker.js'),'utf8'),messages=[],imports=[],fetches=[];let handler,context;const sandbox={Uint8Array,Uint8ClampedArray,Uint16Array,Uint32Array,ArrayBuffer,DataView,TextEncoder,TextDecoder,WebAssembly,performance,console,setTimeout,clearTimeout,URL,atob,btoa,location:{href:'https://voidline.test/pkg/profile-images/worker.js'},addEventListener(type,fn){assert.equal(type,'message');handler=fn;},postMessage(value,transfer){messages.push({value,transfer});},importScripts(url){imports.push(url);assert.equal(url,'/pkg/profile-images/libheif.js');vm.runInContext(readFileSync(path.join(root,'dist',url),'utf8'),context);},fetch:async url=>{fetches.push(url);assert.equal(url,'/pkg/profile-images/libheif.wasm');return{ok:true,arrayBuffer:async()=>wasmBinary.buffer.slice(wasmBinary.byteOffset,wasmBinary.byteOffset+wasmBinary.byteLength)};}};sandbox.self=sandbox;context=vm.createContext(sandbox);vm.runInContext(source,context);assert.equal(typeof handler,'function');
 await handler({data:{id:'tiff-case',bytes:Uint8Array.from(read('rgb-uncompressed.tiff')).buffer,mime:'image/tiff'}});assert.equal(messages[0].value.id,'tiff-case');assert.equal(messages[0].value.width,2);assert.equal(messages[0].transfer[0],messages[0].value.pixels);assert.equal(imports.length,0);
 await handler({data:{id:'heic-case',bytes:Uint8Array.from(read('conformance_window_padding.heic')).buffer,mime:'image/heic'}});assert.equal(messages[1].value.id,'heic-case');assert.equal(messages[1].value.width,1);assert.deepEqual([...new Uint8Array(messages[1].value.pixels)],[21,21,21,255]);assert.deepEqual(imports,['/pkg/profile-images/libheif.js']);assert.deepEqual(fetches,['/pkg/profile-images/libheif.wasm']);
});

let failures=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error.stack);}}console.log(`${tests.length-failures}/${tests.length} local profile codec checks passed. Actual libheif WASM/TIFF and classic-worker VM transport; browser rendering and native worker/device behavior are not established.`);process.exitCode=failures?1:0;
