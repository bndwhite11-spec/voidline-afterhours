/** Local profile-photo codecs. This classic worker is terminated after one conversion. */
import {decode as decodeTiff} from 'tiff';

const MAX_BYTES=8*1024*1024,MAX_PIXELS=16*1024*1024,MAX_SIDE=16384,MAX_SAMPLES=64*1024*1024;
const fail=(message,code='unsupported_image')=>{throw Object.assign(new Error(message),{code});};
function dimensions(width,height){if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>MAX_SIDE||height>MAX_SIDE||width*height>MAX_PIXELS)fail('Choose an image under 16 megapixels and 16,384 pixels per side.','image_too_large');return {width,height};}
function inputBytes(value){const bytes=value instanceof Uint8Array?value:value instanceof ArrayBuffer?new Uint8Array(value):null;if(!bytes||!bytes.length||bytes.length>MAX_BYTES)fail('Choose a file smaller than 8 MiB.','image_too_large');return bytes;}

/** No pixel decompression occurs here. Unused recursive metadata is suppressed in a local copy. */
export function inspectTiffForCodec(input){
 const bytes=inputBytes(input);if(bytes.length<8)fail('This TIFF is incomplete.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),little=bytes[0]===73&&bytes[1]===73;
 if(!little&&!(bytes[0]===77&&bytes[1]===77)||view.getUint16(2,little)!==42)fail('Choose a standard TIFF image. BigTIFF is not supported.');
 const offset=view.getUint32(4,little);if(offset<8||offset+2>bytes.length)fail('This TIFF directory is incomplete.');
 const entries=view.getUint16(offset,little),end=offset+2+entries*12;if(entries<1||entries>512||end+4>bytes.length)fail('This TIFF has an incomplete or overly complex directory.');
 const widths=[0,1,1,2,4,8,1,1,2,4,8,4,8],fields=new Map(),ignored=[];let metadataBytes=0;
 for(let at=offset+2;at<end;at+=12){
  const tag=view.getUint16(at,little),type=view.getUint16(at+2,little),count=view.getUint32(at+4,little);
  if(fields.has(tag))fail('This TIFF contains repeated directory fields.');
  if(type<1||type>12)continue;
  if(count>65536)fail('This TIFF has too much metadata.');
  const size=widths[type]*count,start=size>4?view.getUint32(at+8,little):at+8;
  if(size>bytes.length-start||start>bytes.length)fail('This TIFF contains an incomplete field.');
  metadataBytes+=size;if(metadataBytes>256*1024)fail('This TIFF has too much metadata.');
  const integer=(index=0)=>{if(index>=count||![1,3,4].includes(type))fail('This TIFF field is unsupported.');return type===1?view.getUint8(start+index):type===3?view.getUint16(start+index*2,little):view.getUint32(start+index*4,little);};
  fields.set(tag,{count,integer});
  if(tag===0x8769||tag===0x8825)ignored.push(at+2);
 }
 const scalar=(tag,fallback)=>{const f=fields.get(tag);return f?(f.count===1?f.integer():fail('This TIFF field is unsupported.')):fallback;};
 const list=(tag)=>{const f=fields.get(tag);if(!f||f.count>4096)fail('This TIFF is missing bounded image data.');return Array.from({length:f.count},(_,i)=>f.integer(i));};
 const {width,height}=dimensions(scalar(256),scalar(257)),channels=scalar(277,1),bits=fields.has(258)?list(258):[1],depth=bits[0],photo=scalar(262),formats=fields.has(339)?list(339):[1];
 if(scalar(259,1)!==1)fail('This compressed TIFF is not supported. Export it as PNG or JPEG, or choose an uncompressed TIFF.');
 if(fields.has(322)||fields.has(323)||fields.has(324)||fields.has(325))fail('This tiled TIFF is not supported. Export it as PNG or JPEG.');
 if(scalar(284,1)!==1||scalar(317,1)!==1||scalar(266,1)!==1||formats.some(value=>value!==1)||![1,8,16].includes(depth)||bits.some(b=>b!==depth)||bits.length!==1&&bits.length!==channels)fail('This TIFF pixel layout is not supported. Export it as PNG or JPEG.');
 if(![0,1,2,3].includes(photo)||photo===2&&![3,4].includes(channels)||photo<=1&&![1,2].includes(channels)||photo===3&&(channels!==1||depth!==8)||depth===1&&(channels!==1||photo>1)||photo===0&&channels!==1)fail('This TIFF color layout is not supported. Export it as PNG or JPEG.');
 if(scalar(274,1)!==1)fail('This rotated TIFF is not supported. Export it as PNG or JPEG.');
 const sampleBytes=Math.ceil(width*channels*depth/8)*height;if(sampleBytes>MAX_SAMPLES)fail('This TIFF uses too much decoded image memory. Choose a smaller image.','image_too_large');
 const rows=Math.min(height,scalar(278,height)),offsets=list(273),counts=list(279),stripCount=Math.ceil(height/rows);
 if(!Number.isSafeInteger(rows)||rows<1||stripCount>4096||offsets.length!==stripCount||counts.length!==stripCount)fail('This TIFF strip layout is invalid.');
 for(let i=0;i<stripCount;i++){const required=Math.ceil(width*channels*depth/8)*Math.min(rows,height-i*rows);if(offsets[i]<8||counts[i]<required||offsets[i]>bytes.length||counts[i]>bytes.length-offsets[i])fail('This TIFF pixel data is incomplete.');}
 if(photo===3){const palette=fields.get(320);if(!palette||palette.count!==768)fail('This TIFF palette is incomplete.');}
 // The maintained decoder follows EXIF/GPS pointers even when reading only page0.
 // Profile crops need no metadata: disable those two entries in a private copy.
 let safe;
 if(!fields.has(258)){
  // TIFF defaults BitsPerSample to1; this maintained decoder needs it explicit.
  // Append a private first-page directory so original strip offsets stay valid.
  const directory=(bytes.length+1)&~1,blocks=[];
  for(let at=offset+2;at<end;at+=12)blocks.push(Uint8Array.from(bytes.subarray(at,at+12)));
  const bitTag=new Uint8Array(12),bitView=new DataView(bitTag.buffer);bitView.setUint16(0,258,little);bitView.setUint16(2,3,little);bitView.setUint32(4,1,little);bitView.setUint16(8,1,little);blocks.push(bitTag);
  blocks.sort((a,b)=>new DataView(a.buffer).getUint16(0,little)-new DataView(b.buffer).getUint16(0,little));
  safe=new Uint8Array(directory+2+blocks.length*12+4);safe.set(bytes);const safeView=new DataView(safe.buffer);safeView.setUint32(4,directory,little);safeView.setUint16(directory,blocks.length,little);
  for(let i=0;i<blocks.length;i++){const at=directory+2+i*12;safe.set(blocks[i],at);const tag=safeView.getUint16(at,little);if(tag===0x8769||tag===0x8825)safeView.setUint16(at+2,0,little);}
 }else{safe=Uint8Array.from(bytes);const safeView=new DataView(safe.buffer);for(const at of ignored)safeView.setUint16(at,0,little);safeView.setUint32(end,0,little);}
 return {bytes:safe,width,height,channels,depth,photo};
}

function tiffPixels(bytes){
 const info=inspectTiffForCodec(bytes),meta=decodeTiff(info.bytes,{pages:[0],ignoreImageData:true})[0];
 if(!meta||meta.width!==info.width||meta.height!==info.height)fail('This TIFF could not be read.');
 // Both raw sample storage and RGBA output are bounded before maintained pixel decoding.
 const image=decodeTiff(info.bytes,{pages:[0]})[0],data=image?.data;if(!data||data.length!==info.width*info.height*info.channels)fail('This TIFF pixel data is incomplete.');
 const pixels=new Uint8ClampedArray(info.width*info.height*4),palette=info.photo===3?image.palette:null,scale=info.depth===16?257:info.depth===1?1/255:1;
 for(let i=0,j=0;i<data.length;i+=info.channels,j+=4){
  if(palette){const color=palette[data[i]];if(!color)fail('This TIFF palette is incomplete.');pixels[j]=Math.round(color[0]/257);pixels[j+1]=Math.round(color[1]/257);pixels[j+2]=Math.round(color[2]/257);}
  else if(info.photo===2){pixels[j]=Math.round(data[i]/scale);pixels[j+1]=Math.round(data[i+1]/scale);pixels[j+2]=Math.round(data[i+2]/scale);}
  else pixels[j]=pixels[j+1]=pixels[j+2]=Math.round(data[i]/scale);
  pixels[j+3]=image.alpha?Math.round(data[i+info.channels-1]/scale):255;
 }
 return {width:info.width,height:info.height,pixels:pixels.buffer};
}

async function loadBrowserHeif(){
 if(typeof globalThis.importScripts!=='function')fail('The local HEIC decoder is unavailable.');
 globalThis.importScripts('/pkg/profile-images/libheif.js');
 const response=await fetch('/pkg/profile-images/libheif.wasm',{credentials:'same-origin'});if(!response.ok)fail('The HEIC decoder could not load. Check your connection and try again.','decoder_unavailable');
 return globalThis.libheif({wasmBinary:new Uint8Array(await response.arrayBuffer()),print(){},printErr(){}});
}
async function heifPixels(bytes,loadHeif){
 const lib=await loadHeif();let context=0,images=[];
 try{
  context=lib.heif_context_alloc();if(!context)fail('The HEIC decoder could not start.');
  // This maintained API takes a width and squares it:4096 means16Mi pixels.
  lib.heif_context_set_maximum_image_size_limit(context,4096);
  const read=lib.heif_context_read_from_memory(context,bytes);if(read?.code!==lib.heif_error_code.heif_error_Ok)fail('This HEIC/HEIF image could not be read. Export it as PNG or JPEG.');
  const ids=lib.heif_js_context_get_list_of_top_level_image_IDs(context);if(!Array.isArray(ids)||!ids.length||ids.length>64)fail('This HEIC/HEIF collection is unsupported. Choose a single photo.');
  for(const id of ids){const handle=lib.heif_js_context_get_image_handle(context,id);if(!handle||handle.code)fail('This HEIC/HEIF image could not be read.');images.push(new lib.HeifImage(handle));}
  const image=images.find(item=>item.is_primary())||images[0],{width,height}=dimensions(image.get_width(),image.get_height());
  const data=new Uint8ClampedArray(width*height*4);
  const result=await new Promise((resolve,reject)=>{try{image.display({data,width,height},value=>value?resolve(value):reject(new Error('This HEIC/HEIF image could not be decoded. Export it as PNG or JPEG.')));}catch(error){reject(error);}});
  if(result.width!==width||result.height!==height||result.data.length!==width*height*4)fail('This HEIC/HEIF image has invalid decoded dimensions.');
  return {width,height,pixels:result.data.buffer};
 }finally{for(const image of images)try{image.free();}catch{}if(context)lib.heif_context_free(context);}
}

export async function decodeProfileImageCodec({bytes:input,mime},{loadHeif=loadBrowserHeif}={}){
 const bytes=inputBytes(input);
 if(mime==='image/tiff')return tiffPixels(bytes);
 if(mime==='image/heic'||mime==='image/heif')return heifPixels(bytes,loadHeif);
 fail('This image does not use an available local decoder.');
}

if(typeof globalThis.importScripts==='function'&&typeof globalThis.postMessage==='function'){
 let busy=false;
 globalThis.addEventListener('message',async event=>{
  const {id,bytes,mime}=event.data||{};if(typeof id!=='string'||id.length>100)return;
  if(busy){globalThis.postMessage({id,error:{code:'decoder_busy',message:'Wait for the selected image to finish.'}});return;}busy=true;
  try{const result=await decodeProfileImageCodec({bytes,mime});globalThis.postMessage({id,...result},[result.pixels]);}
  catch(error){globalThis.postMessage({id,error:{code:error.code||'image_decode_failed',message:error.message||'This image could not be decoded. Export it as PNG or JPEG.'}});}
  finally{busy=false;}
 });
}
