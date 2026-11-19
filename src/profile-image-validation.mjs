/** Profile import preflight only. Native/worker decoders validate pixels before PNG cropping.
 * These source formats are never accepted directly by shared-media upload handlers.
 */
import {inspectImage,MEDIA_LIMIT,IMAGE_PIXELS,PROFILE_GIF_LIMITS} from './media-validation.mjs';
const fail=message=>{throw new Error(message);};
const ascii=(b,at,length)=>String.fromCharCode(...b.subarray(at,at+length));
const le16=(b,at)=>b[at]+b[at+1]*256;
const le32=(b,at)=>(b[at]+b[at+1]*256+b[at+2]*65536+b[at+3]*16777216)>>>0;
const be32=(b,at)=>(b[at]*16777216+b[at+1]*65536+b[at+2]*256+b[at+3])>>>0;
const equal=(b,at,list)=>list.every((value,index)=>b[at+index]===value);
function dimensions(width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>16384||height>16384||width*height>IMAGE_PIXELS)fail('Choose an image no larger than 16 megapixels or 16384 pixels per side.');return{width,height};}
function animation(frames,pixels,durationMs){if(frames>PROFILE_GIF_LIMITS.maxFrames||frames*pixels>PROFILE_GIF_LIMITS.maxCanvasPixels||durationMs>PROFILE_GIF_LIMITS.maxDurationMs)fail('This animation is too large for a still profile crop. Choose a shorter or smaller image.');}
function webpImageSize(b,start,length,type){
 if(type==='VP8 '){if(length<10||!equal(b,start+3,[157,1,42]))fail('This WebP image is invalid.');return dimensions((b[start+6]|b[start+7]<<8)&16383,(b[start+8]|b[start+9]<<8)&16383);}
 if(length<5||b[start]!==47)fail('This WebP image is invalid.');const bits=le32(b,start+1);return dimensions((bits&16383)+1,((bits>>>14)&16383)+1);
}
function png(b){
 if(b.length<45||be32(b,8)!==13||ascii(b,12,4)!=='IHDR')fail('This PNG header is invalid.');
 const size=dimensions(be32(b,16),be32(b,20));let at=8,blocks=0,data=false,end=false,declared=null,frames=0,durationMs=0;
 while(at+12<=b.length){
  const length=be32(b,at),type=ascii(b,at+4,4),start=at+8;
  if(++blocks>4096||!/^[A-Za-z]{4}$/.test(type)||length>b.length-at-12)fail('This PNG is incomplete or too complex.');
  if(type==='acTL'){if(declared!==null||data||length!==8)fail('This animated PNG header is invalid.');declared=be32(b,start);if(!declared)fail('This animated PNG has no frames.');animation(declared,size.width*size.height,0);}
  if(type==='fcTL'){
   if(declared===null||length!==26)fail('This animated PNG frame is invalid.');
   const width=be32(b,start+4),height=be32(b,start+8),left=be32(b,start+12),top=be32(b,start+16);
   if(!width||!height||left+width>size.width||top+height>size.height||b[start+24]>2||b[start+25]>1)fail('This animated PNG frame is invalid.');
   const numerator=b[start+20]*256+b[start+21],denominator=b[start+22]*256+b[start+23]||100;
   frames++;durationMs+=Math.max(20,1000*numerator/denominator);animation(frames,size.width*size.height,durationMs);
  }
  if(type==='fdAT'&&(declared===null||length<4))fail('This animated PNG data is invalid.');
  if(type==='IDAT')data=true;
  if(type==='IEND'){if(length||at+12!==b.length)fail('This PNG has an invalid ending.');end=true;break;}
  at=start+length+4;
 }
 if(!data||!end||b[26]!==0||b[27]!==0||b[28]>1||declared!==null&&frames!==declared)fail('This PNG is incomplete or unsupported.');
 return{...size,mime:'image/png',extension:'png',decoder:'native',...(declared!==null?{animated:true,frames,durationMs}:{})};
}
function webp(b){
 if(b.length<30||le32(b,4)+8!==b.length)fail('This WebP is incomplete.');
 let at=12,blocks=0,size=null,still=false,animated=false,frames=0,durationMs=0,animationHeader=false;
 while(at+8<=b.length){
  const type=ascii(b,at,4),length=le32(b,at+4),start=at+8,end=start+length;
  if(++blocks>4096||end>b.length)fail('This WebP chunk is incomplete or too complex.');
  if(type==='VP8X'){if(size||length!==10)fail('This WebP header is invalid.');size=dimensions(1+b[start+4]+(b[start+5]<<8)+(b[start+6]<<16),1+b[start+7]+(b[start+8]<<8)+(b[start+9]<<16));animated=!!(b[start]&2);}
  if(type==='ANIM'){if(!animated||length!==6||animationHeader)fail('This WebP animation header is invalid.');animationHeader=true;}
  if(type==='ANMF'){
   if(!size||!animated||!animationHeader||length<24)fail('This WebP animation frame is invalid.');
   const little24=i=>b[i]+b[i+1]*256+b[i+2]*65536,left=little24(start)*2,top=little24(start+3)*2,width=little24(start+6)+1,height=little24(start+9)+1;
   if(left+width>size.width||top+height>size.height||b[start+15]&252)fail('This WebP animation frame is invalid.');
   let nested=start+16,hasImage=false;
   while(nested+8<=end){const nestedType=ascii(b,nested,4),nestedLength=le32(b,nested+4),next=nested+8+nestedLength+(nestedLength&1);if(++blocks>4096||next>end)fail('This WebP frame data is incomplete.');if(nestedType==='VP8 '||nestedType==='VP8L'){if(hasImage)fail('This WebP frame contains multiple images.');const decoded=webpImageSize(b,nested+8,nestedLength,nestedType);if(decoded.width!==width||decoded.height!==height)fail('This WebP frame has inconsistent dimensions.');hasImage=true;}else if(nestedType!=='ALPH')fail('This WebP frame data is unsupported.');nested=next;}
   if(nested!==end||!hasImage)fail('This WebP frame has no readable image.');
   frames++;durationMs+=Math.max(20,little24(start+12));animation(frames,size.width*size.height,durationMs);
  }
  if(type==='VP8 '||type==='VP8L'){const decoded=webpImageSize(b,start,length,type);if(size&&(size.width!==decoded.width||size.height!==decoded.height))fail('This WebP has inconsistent dimensions.');size=decoded;still=true;}
  at=end+(length&1);
 }
 if(at!==b.length||!size||(animated?(!animationHeader||!frames||still):!still))fail('This WebP has no complete readable image.');
 return{...size,mime:'image/webp',extension:'webp',decoder:'native',...(animated?{animated:true,frames,durationMs}:{})};
}
function bmp(b){
 if(b.length<26)fail('This BMP header is incomplete.');
 const declared=le32(b,2),offset=le32(b,10),header=le32(b,14);if(declared&&declared!==b.length||![12,40,52,56,108,124].includes(header)||14+header>b.length||offset<14+header||offset>=b.length)fail('This BMP header is invalid.');
 const core=header===12,width=core?le16(b,18):le32(b,18)|0,rawHeight=core?le16(b,20):le32(b,22)|0,height=Math.abs(rawHeight),planes=le16(b,core?22:26),bits=le16(b,core?24:28),compression=core?0:le32(b,30);
 const size=dimensions(width,height);if(planes!==1||![1,4,8,16,24,32].includes(bits)||![0,1,2,3,6].includes(compression)||compression===1&&bits!==8||compression===2&&bits!==4||[3,6].includes(compression)&&![16,32].includes(bits))fail('This BMP encoding is unsupported. Export it as PNG or JPEG.');
 const colors=bits<=8?(core?1<<bits:le32(b,46)||1<<bits):0,masks=header===40&&[3,6].includes(compression)?(compression===6?16:12):0;
 if(colors>(1<<Math.min(bits,8))||14+header+masks+colors*(core?3:4)>offset)fail('This BMP palette is incomplete.');
 if([0,3,6].includes(compression)&&Math.ceil(width*bits/32)*4*height>b.length-offset)fail('This BMP pixel data is incomplete.');
 return{...size,mime:'image/bmp',extension:'bmp',decoder:'native'};
}
function ico(b){
 if(b.length<22)fail('This icon header is incomplete.');const count=le16(b,4),directoryEnd=6+count*16;if(count<1||count>64||directoryEnd>b.length)fail('This icon contains too many or incomplete images.');let size=null;
 for(let n=0;n<count;n++){
  const entry=6+n*16,width=b[entry]||256,height=b[entry+1]||256,length=le32(b,entry+8),offset=le32(b,entry+12);if(!length||offset<directoryEnd||offset+length>b.length)fail('This icon image is incomplete.');const image=b.subarray(offset,offset+length);
  if(equal(image,0,[137,80,78,71,13,10,26,10])){const decoded=png(image);if(decoded.width!==width||decoded.height!==height||decoded.animated)fail('This icon has inconsistent image dimensions.');}
  else{if(image.length<40||![40,52,56,108,124].includes(le32(image,0))||le32(image,0)>image.length||(le32(image,4)|0)!==width||Math.abs(le32(image,8)|0)!==height*2)fail('This icon image header is unsupported.');}
  dimensions(width,height);if(!size||width*height>size.width*size.height)size={width,height};
 }
 return{...size,mime:'image/x-icon',extension:'ico',decoder:'native'};
}
function isoImage(b){
 let boxes=0,brands=null,size=null,data=false;
 const walk=(start,end,depth)=>{
  if(depth>8)fail('This image container is too deeply nested.');let at=start;
  while(at<end){
   if(++boxes>2048||end-at<8)fail('This image container is incomplete or too complex.');
   let length=be32(b,at),header=8;const type=ascii(b,at+4,4);
   if(length===1){if(end-at<16)fail('This image container is incomplete.');const high=be32(b,at+8),low=be32(b,at+12);length=high*4294967296+low;header=16;}
   if(length===0)length=end-at;if(!Number.isSafeInteger(length)||length<header||length>end-at)fail('This image container has invalid box sizes.');
   const payload=at+header,boxEnd=at+length;
   if(type==='ftyp'){
    if(depth!==0||brands||length<header+8||(length-header-8)%4||(length-header-8)/4>64)fail('This image type header is invalid.');brands=[ascii(b,payload,4)];for(let i=payload+8;i<boxEnd;i+=4)brands.push(ascii(b,i,4));
   }
   if(type==='ispe'){if(length!==header+12||b[payload]!==0)fail('This image dimension property is invalid.');const decoded=dimensions(be32(b,payload+4),be32(b,payload+8));if(!size||decoded.width*decoded.height>size.width*size.height)size=decoded;}
   if(type==='mdat'||type==='idat'){if(boxEnd>payload)data=true;}
   if(type==='meta'){if(boxEnd-payload<4||b[payload]!==0)fail('This image metadata is invalid.');walk(payload+4,boxEnd,depth+1);}
   else if(['iprp','ipco','moov','trak','mdia','minf','stbl'].includes(type))walk(payload,boxEnd,depth+1);
   at=boxEnd;
  }
 };
 walk(0,b.length,0);
 if(!brands||!data)fail('This image container has no readable image data.');
 if(brands.includes('avis'))fail('Animated AVIF is not supported for profile crops. Export a still frame as PNG or JPEG.');
 if(brands.includes('avif')){if(!size)fail('This AVIF has no readable dimensions. Export it as PNG or JPEG.');return{...size,mime:'image/avif',extension:'avif',decoder:'native'};}
 if(brands.some(brand=>['heic','heix','hevc','hevx','heim','heis','hevm','hevs','mif1','msf1'].includes(brand))){const heic=brands.some(brand=>brand.startsWith('he'));return{...(size||{}),mime:heic?'image/heic':'image/heif',extension:heic?'heic':'heif',decoder:'heif'};}
 fail('This image container format is unsupported. Export it as PNG or JPEG.');
}
export function inspectProfileImage(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 if(!b.length||b.length>MEDIA_LIMIT)fail('Choose a file smaller than 8 MiB.');
 if(equal(b,0,[255,216,255])||ascii(b,0,3)==='GIF')return{...inspectImage(b,{allowGif:true,allowProfileJpegTrailing:true}),decoder:'native'};
 if(equal(b,0,[137,80,78,71,13,10,26,10]))return png(b);
 if(ascii(b,0,4)==='RIFF'&&ascii(b,8,4)==='WEBP')return webp(b);
 if(ascii(b,0,2)==='BM')return bmp(b);
 if(equal(b,0,[0,0,1,0]))return ico(b);
 if(equal(b,0,[73,73,42,0])||equal(b,0,[77,77,0,42])||equal(b,0,[73,73,43,0])||equal(b,0,[77,77,0,43])){if(b.length<8)fail('This TIFF header is incomplete.');return{mime:'image/tiff',extension:'tiff',decoder:'tiff'};}
 if(b.length>=16&&['ftyp','free','skip','wide'].includes(ascii(b,4,4)))return isoImage(b);
 try{const prefix=new TextDecoder('utf-8',{fatal:true}).decode(b.subarray(0,Math.min(b.length,65536)),{stream:true}).replace(/^\uFEFF/,'').trimStart();if(/^(?:<svg(?:\s|>)|<\?xml(?:\s|\?)|<!--|<!DOCTYPE\s+svg(?:\s|>))/i.test(prefix))return{mime:'image/svg+xml',extension:'svg',decoder:'svg'};}catch{}
 fail('This image format is not supported. Choose JPEG, PNG, GIF, WebP, AVIF, BMP, ICO, SVG, HEIC or TIFF.');
}
