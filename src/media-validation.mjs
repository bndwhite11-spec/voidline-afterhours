/** Bounded image headers and structures; no remote fetching or executable formats. */
export const MEDIA_LIMIT = 8 * 1024 * 1024;
export const IMAGE_PIXELS = 16 * 1024 * 1024;
export const PROFILE_GIF_LIMITS = Object.freeze({maxSide:1024,maxPixels:1024*1024,maxFrames:200,maxCanvasPixels:32*1024*1024,maxDurationMs:30000,maxBlocks:2048,maxSubBlocks:65536,maxMetadataBytes:128*1024});
const fail = message => { throw new Error(message); };
const equal = (bytes, offset, values) => values.every((value, i) => bytes[offset + i] === value);
const ascii = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
const u16 = (b, i) => b[i] * 256 + b[i + 1];
const u32 = (b, i) => (b[i] * 0x1000000 + b[i + 1] * 65536 + b[i + 2] * 256 + b[i + 3]) >>> 0;
const le32 = (b, i) => (b[i] + b[i + 1] * 256 + b[i + 2] * 65536 + b[i + 3] * 0x1000000) >>> 0;
const le16 = (b, i) => b[i] + b[i + 1] * 256;
const dimensions = (width, height, maxPixels) => {
 if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 16384 || height > 16384 || width * height > maxPixels) fail('This image is too large. Choose an image under 16 megapixels.');
 return {width, height};
};
/** Profile-source JPEG boundaries only; the maintained browser decoder validates pixels.
 * APP/COM segments can contain thumbnails/EOI bytes. Entropy scans use FF00 stuffing,
 * restart markers and fill bytes; progressive JPEGs can contain several scans.
 */
function inspectProfileJpeg(bytes,maxPixels){
 let at=2,size=null,components=null,scans=0,markers=0,entropy=false;
 const incomplete=()=>fail('This JPEG is incomplete. Choose another copy of the photo.');
 while(at<bytes.length){
  let marker;
  if(entropy){
   let data=false;
   for(;;){
    if(at>=bytes.length)incomplete();
    if(bytes[at++]!==255){data=true;continue;}
    while(at<bytes.length&&bytes[at]===255)at++;
    if(at>=bytes.length)incomplete();marker=bytes[at++];
    if(marker===0){data=true;continue;}
    if(marker>=208&&marker<=215)continue;
    if(!data)incomplete();entropy=false;break;
   }
  }else{
   if(bytes[at++]!==255)fail('This JPEG structure is invalid.');
   while(at<bytes.length&&bytes[at]===255)at++;
   if(at>=bytes.length)incomplete();marker=bytes[at++];
  }
  if(++markers>4096)fail('This JPEG has too many segments. Choose another copy of the photo.');
  if(marker===217){
   if(!size||!scans)fail('This JPEG has no readable image.');
   return {...size,mime:'image/jpeg',extension:'jpg',sourceEnd:at};
  }
  if(marker===216||marker===0||marker===1||(marker>=208&&marker<=215))fail('This JPEG marker is invalid.');
  if(at+2>bytes.length)incomplete();
  const length=u16(bytes,at);
  if(length<2||length>bytes.length-at)incomplete();
  if([192,193,194].includes(marker)){
   if(size)fail('Choose a standard JPEG with one image frame.');
   if(length<8||bytes[at+2]!==8)fail('Use a standard 8-bit JPEG.');
   size=dimensions(u16(bytes,at+5),u16(bytes,at+3),maxPixels);
   const count=bytes[at+7];
   if(count<1||count>4||length!==8+3*count)fail('This JPEG frame is invalid.');
   components=new Set();
   for(let n=0;n<count;n++){
    const id=bytes[at+8+n*3];if(components.has(id))fail('This JPEG frame is invalid.');components.add(id);
   }
  }else if(marker>=192&&marker<=207&&![196,204].includes(marker))fail('Use a standard baseline or progressive JPEG.');
  if(marker===218){
   if(!size||length<6)fail('This JPEG has no readable image.');
   const count=bytes[at+2],seen=new Set();
   if(count<1||count>components.size||length!==6+2*count)fail('This JPEG scan is invalid.');
   for(let n=0;n<count;n++){
    const id=bytes[at+3+n*2];if(!components.has(id)||seen.has(id))fail('This JPEG scan is invalid.');seen.add(id);
   }
   if(++scans>512)fail('This JPEG has too many scans. Choose another copy of the photo.');
   entropy=true;
  }
  // Height supplied later (DNL) and hierarchical frames are outside the still
  // formats supported here. Never guess a decoder allocation before dimensions.
  if(marker===220||marker===222||marker===223)fail('Use a standard baseline or progressive JPEG.');
  at+=length;
 }
 incomplete();
}
/** Structural/resource preflight only. The server strictly decodes every LZW frame before storage. */
export function inspectProfileGif(input, {maxPixels = PROFILE_GIF_LIMITS.maxPixels,includeFrameRanges = false} = {}) {
 const b=input instanceof Uint8Array?input:new Uint8Array(input),limit=PROFILE_GIF_LIMITS;
 if(!b.length||b.length>MEDIA_LIMIT)fail('Choose a file smaller than 8 MiB.');
 if(b.length<14||!['GIF87a','GIF89a'].includes(ascii(b,0,6)))fail('This GIF header is invalid.');
 const width=le16(b,6),height=le16(b,8),pixels=width*height;
 if(!width||!height||width>limit.maxSide||height>limit.maxSide||pixels>Math.min(maxPixels,limit.maxPixels))fail('Choose a GIF no larger than 1024 pixels per side and one megapixel.');
 let at=13,subBlocks=0,blocks=0,metadataBytes=0,durationMs=0,pending=null,ended=false;
 const ranges=[];
 const requireBytes=count=>{if(count>b.length-at)fail('This GIF is incomplete.');};
 if(b[10]&128){at+=3*(1<<((b[10]&7)+1));if(at>b.length)fail('This GIF palette is incomplete.');}
 const headerEnd=at;
 const skipSubBlocks=()=>{let payload=0;for(;;){requireBytes(1);const length=b[at++];if(!length)return payload;if(++subBlocks>limit.maxSubBlocks)fail('This GIF has too many data blocks.');requireBytes(length);payload+=length;at+=length;}};
 while(at<b.length){
  const start=at,marker=b[at++];
  if(marker===59){if(at!==b.length||pending)fail('This GIF has an invalid ending.');ended=true;break;}
  if(++blocks>limit.maxBlocks)fail('This GIF has too many blocks.');
  if(marker===44){
   requireBytes(9);const left=le16(b,at),top=le16(b,at+2),frameWidth=le16(b,at+4),frameHeight=le16(b,at+6),packed=b[at+8];at+=9;
   if(!frameWidth||!frameHeight||left+frameWidth>width||top+frameHeight>height||(packed&24))fail('This GIF has invalid frame dimensions.');
   if(packed&128){const paletteBytes=3*(1<<((packed&7)+1));requireBytes(paletteBytes);at+=paletteBytes;}
   requireBytes(1);const minimumCodeSize=b[at++];if(minimumCodeSize<2||minimumCodeSize>8)fail('This GIF has invalid image data.');
   if(!skipSubBlocks())fail('This GIF has no image data.');
   ranges.push({start,end:at,controlStart:pending?.start??null,controlEnd:pending?.end??null});
   // Browsers commonly clamp absent/0/10ms delays to 100ms. Count that cost too.
   durationMs+=pending?.delayMs>=20?pending.delayMs:100;pending=null;
   if(ranges.length>limit.maxFrames||pixels*ranges.length>limit.maxCanvasPixels)fail('This GIF has too many frames or decoded pixels. Choose a shorter or smaller GIF.');
   if(durationMs>limit.maxDurationMs)fail('Choose a GIF with a loop no longer than 30 seconds.');
   continue;
  }
  if(marker!==33)fail('This GIF has an invalid block.');
  requireBytes(1);const label=b[at++];if(ascii(b,0,6)!=='GIF89a')fail('This GIF uses extensions with an unsupported header.');
  if(label===249){
   requireBytes(6);if(ascii(b,0,6)!=='GIF89a'||pending||b[at]!==4||b[at+5]!==0||(b[at+1]&224)||((b[at+1]>>2)&7)>3)fail('This GIF has invalid frame controls.');
   pending={start,end:at+6,delayMs:le16(b,at+2)*10};at+=6;
  }else if(label===254||label===255){
   if(label===255){requireBytes(12);if(ascii(b,0,6)!=='GIF89a'||b[at]!==11)fail('This GIF application header is invalid.');at+=12;}
   skipSubBlocks();metadataBytes+=at-start;
   if(metadataBytes>limit.maxMetadataBytes)fail('This GIF contains too much metadata.');
  }else fail('This GIF contains unsupported text or extension blocks.');
 }
 if(!ended||!ranges.length)fail('This GIF has no complete image.');
 return {width,height,mime:'image/gif',extension:'gif',frames:ranges.length,durationMs,animated:ranges.length>1,...(includeFrameRanges?{headerEnd,frameRanges:ranges}:{})};
}
export function inspectImage(input, {maxPixels = IMAGE_PIXELS,allowGif = false,allowProfileJpegTrailing = false} = {}) {
 const b = input instanceof Uint8Array ? input : new Uint8Array(input);
 if (!b.length || b.length > MEDIA_LIMIT) fail('Choose a file smaller than 8 MiB.');
 if(ascii(b,0,3)==='GIF'){
  if(!allowGif)fail('GIFs are supported only for profile pictures and banners.');
  return inspectProfileGif(b,{maxPixels});
 }
 if (equal(b, 0, [137,80,78,71,13,10,26,10])) {
  if (b.length < 45 || u32(b, 8) !== 13 || ascii(b, 12, 4) !== 'IHDR') fail('This PNG header is invalid.');
  const size = dimensions(u32(b, 16), u32(b, 20), maxPixels);
  let at = 8, data = false, end = false;
  while (at + 12 <= b.length) {
   const length = u32(b, at), type = ascii(b, at + 4, 4);
   if (!/^[A-Za-z]{4}$/.test(type) || length > b.length - at - 12) fail('This PNG is incomplete.');
   if (['acTL','fcTL','fdAT'].includes(type)) fail('Use a still PNG, JPEG or WebP image.');
   if (type === 'IDAT') data = true;
   if (type === 'IEND') { if (length !== 0 || at + 12 !== b.length) fail('This PNG has an invalid ending.'); end = true; break; }
   at += length + 12;
  }
  if (!data || !end || b[26] !== 0 || b[27] !== 0 || b[28] > 1) fail('This PNG is incomplete or unsupported.');
  return {...size, mime:'image/png', extension:'png'};
 }
 if (equal(b, 0, [255,216,255])) {
  if(allowProfileJpegTrailing)return inspectProfileJpeg(b,maxPixels);
  if (!equal(b, b.length - 2, [255,217])) fail('This JPEG is incomplete.');
  let at = 2, size = null, scanned = false;
  while (at < b.length - 2) {
   if (b[at++] !== 255) fail('This JPEG structure is invalid.');
   while (b[at] === 255) at++;
   const marker = b[at++];
   if (marker === 217) break;
   if (marker === 216 || marker === 0 || marker === 1 || (marker >= 208 && marker <= 215)) fail('This JPEG marker is invalid.');
   if (at + 2 > b.length) fail('This JPEG is incomplete.');
   const length = u16(b, at);
   if (length < 2 || at + length > b.length) fail('This JPEG is incomplete.');
   if ([192,193,194].includes(marker)) {
    if (length < 8 || b[at + 2] !== 8) fail('Use a standard 8-bit JPEG.');
    size = dimensions(u16(b, at + 5), u16(b, at + 3), maxPixels);
   }
   if (marker === 218) { scanned = true; break; }
   at += length;
  }
  if (!size || !scanned) fail('This JPEG has no readable image.');
  return {...size, mime:'image/jpeg', extension:'jpg'};
 }
 if (b.length >= 30 && ascii(b,0,4) === 'RIFF' && ascii(b,8,4) === 'WEBP') {
  if (le32(b,4) + 8 !== b.length) fail('This WebP is incomplete.');
  let at = 12, size = null, image = false;
  while (at + 8 <= b.length) {
   const type = ascii(b, at, 4), length = le32(b, at + 4), start = at + 8;
   if (length > b.length - start) fail('This WebP chunk is incomplete.');
   if (type === 'ANIM' || type === 'ANMF' || (type === 'VP8X' && (b[start] & 2))) fail('Use a still PNG, JPEG or WebP image.');
   if (type === 'VP8X') {
    if (length !== 10) fail('This WebP header is invalid.');
    size = dimensions(1 + b[start+4] + (b[start+5]<<8) + (b[start+6]<<16), 1 + b[start+7] + (b[start+8]<<8) + (b[start+9]<<16), maxPixels);
   }
   if (type === 'VP8 ') {
    if (length < 10 || !equal(b,start+3,[157,1,42])) fail('This WebP image is invalid.');
    const decoded = dimensions((b[start+6] | b[start+7]<<8) & 16383, (b[start+8] | b[start+9]<<8) & 16383,maxPixels);
    if (size && (size.width !== decoded.width || size.height !== decoded.height)) fail('This WebP has inconsistent dimensions.');
    size = decoded; image = true;
   }
   if (type === 'VP8L') {
    if (length < 5 || b[start] !== 47) fail('This WebP image is invalid.');
    const bits = le32(b,start+1), decoded = dimensions((bits & 16383)+1, ((bits >>> 14) & 16383)+1,maxPixels);
    if (size && (size.width !== decoded.width || size.height !== decoded.height)) fail('This WebP has inconsistent dimensions.');
    size = decoded; image = true;
   }
   at = start + length + (length & 1);
  }
  if (!size || !image || at !== b.length) fail('This WebP has no complete image.');
  return {...size, mime:'image/webp', extension:'webp'};
 }
 fail(allowGif?'Choose PNG, JPEG, WebP or GIF. SVG is not supported.':'Choose a still PNG, JPEG or WebP image. SVG is not supported.');
}
export function safeFilename(value) {
 return String(value || 'file').normalize('NFKC').replace(/[\u0000-\u001f\u007f/\\<>:"|?*\u202a-\u202e\u2066-\u2069]/g,'_').trim().slice(0,120) || 'file';
}
