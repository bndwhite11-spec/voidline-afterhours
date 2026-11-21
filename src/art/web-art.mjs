/** Build-only adapters for downloaded, credited raster artwork.
 * Images remain the visible artwork. Geometry below provides cropping and
 * one-shot presentation; it does not redraw or claim authorship of the image.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../dist/',import.meta.url),LIMIT=150*1024,MINI_LIMIT=12*1024;
const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function inspectRaster(bytes,path=''){
 const b=Buffer.from(bytes);let mime,width,height;
 if(b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.toString('ascii',12,16)==='IHDR'){
  mime='image/png';width=b.readUInt32BE(16);height=b.readUInt32BE(20);
  for(let p=8;p+12<=b.length;){const n=b.readUInt32BE(p),type=b.toString('ascii',p+4,p+8);if(type==='acTL')throw Error('Animated PNG is not a static source '+path);if(n>b.length-p-12)throw Error('Truncated PNG '+path);p+=n+12;}
 }else if(b.length>=30&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
  mime='image/webp';for(let p=12;p+8<=b.length;){const type=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4),at=p+8;if(n>b.length-at)throw Error('Truncated WebP '+path);if(type==='ANIM'||type==='ANMF')throw Error('Animated WebP is not a static source '+path);
   if(type==='VP8X'&&n>=10){if(b[at]&2)throw Error('Animated WebP is not a static source '+path);width=b.readUIntLE(at+4,3)+1;height=b.readUIntLE(at+7,3)+1;}
   if(!width&&type==='VP8 '&&n>=10&&b[at+3]===157&&b[at+4]===1&&b[at+5]===42){width=b.readUInt16LE(at+6)&16383;height=b.readUInt16LE(at+8)&16383;}
   if(!width&&type==='VP8L'&&n>=5&&b[at]===47){const bits=b.readUInt32LE(at+1);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}
   p=at+n+(n%2);
  }
 }else if(b.length>=4&&b[0]===255&&b[1]===216){
  mime='image/jpeg';for(let p=2;p<b.length;){if(b[p++]!==255)continue;while(b[p]===255)p++;const marker=b[p++];if(marker===217||marker===218)break;if(marker===216||marker===1||(marker>=208&&marker<=215))continue;if(p+2>b.length)break;const n=b.readUInt16BE(p);if(n<2||p+n>b.length)throw Error('Truncated JPEG '+path);if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&n>=7){height=b.readUInt16BE(p+3);width=b.readUInt16BE(p+5);break;}p+=n;}
 }
 if(!mime||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2048||height>2048)throw Error('Use a static PNG, JPEG or WebP up to2048px: '+path);
 return {mime,width,height,bytes:b.length,sha256:sha(b)};
}
function readSource(path,maximum){
 if(typeof path!=='string'||!/^\/art\/sources\/[a-z0-9][a-z0-9._-]*[.-]([a-f0-9]{12,64})\.(?:webp|png|jpe?g)$/.test(path))throw Error('Use a safe fingerprinted local source path: '+path);
 const bytes=readFileSync(new URL(path.slice(1),root));if(bytes.length>maximum)throw Error('Source exceeds byte limit '+path);
 const info=inspectRaster(bytes,path),fingerprint=/[.-]([a-f0-9]{12,64})\.[^.]+$/.exec(path)[1];if(!info.sha256.startsWith(fingerprint))throw Error('Source fingerprint does not match bytes '+path);
 const expected=path.endsWith('.webp')?'image/webp':path.endsWith('.png')?'image/png':'image/jpeg';if(info.mime!==expected)throw Error('Source MIME does not match extension '+path);
 return {...info,path,uri:'data:'+info.mime+';base64,'+bytes.toString('base64')};
}
export function assertSafeWebSVG(content,sourceArt){
 if(!sourceArt||typeof content!=='string'||/<(?:script|foreignObject|iframe|animate|set)\b|\bon\w+\s*=|\bsrc\s*=|url\(\s*[^#]/i.test(content))throw Error('Unsafe web illustration');
 const images=[...content.matchAll(/<image\b[^>]*>/g)],uses=[...content.matchAll(/<use\b[^>]*>/g)],allLinks=[...content.matchAll(/\b(?:href|xlink:href)\s*=/g)],ids=new Set();
 if(images.length!==1||allLinks.length!==images.length+uses.length)throw Error('Unexpected web illustration image references');
 for(const match of images){const tag=match[0],link=/\bhref="(data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2}))"/.exec(tag),id=/\bid="([a-zA-Z][\w:.-]*)"/.exec(tag);if(!link)throw Error('Only embedded raster images are allowed');const bytes=Buffer.from(link[3],'base64'),trusted=[sourceArt,sourceArt.mini].find(x=>x?.mime===link[2]&&x.bytes===bytes.length&&x.sha256===sha(bytes));if(!trusted||bytes.toString('base64')!==link[3])throw Error('Embedded raster does not match the downloaded source');if(id)ids.add(id[1]);}
 for(const match of uses){const link=/\bhref="#([a-zA-Z][\w:.-]*)"/.exec(match[0]);if(!link||!ids.has(link[1]))throw Error('Only a local use of the embedded image is allowed');}
 return true;
}
const layer=(name,origin,frames)=>({name,origin,frames});
function choreography(id,type,preset){
 const seed=[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0),small=(seed%9)/100,delay=(seed%7)/100;
 const duration=type==='gift'?1450+(seed%8)*35:1000+(seed%6)*40;
 if(type!=='gift')return{duration,layers:[layer('web-image',[128,128],[{at:0},{at:.22,rotate:-3-small,scaleX:1.025,scaleY:1.025},{at:.64,rotate:1.2+small},{at:1}])]};
 // The cassette's source has real circular reels. Keep its case intact while
 // those exact source regions make a short tape-check turn, then settle back.
 // Centers are measured in the credited 512px source, mapped into its200px view.
 if(id==='gift-cassette'){
  const centers=[[155.5,238],[351.5,238.5]].map(([x,y])=>[28+x*200/512,28+y*200/512]),radius=10.75;
  return {duration:1540,preset:'cassette-reel-check',rects:[[28,28,200,200],...centers.map(([x,y])=>[x-radius,y-radius,radius*2,radius*2])],circles:[null,...centers.map(([cx,cy])=>({cx,cy,r:radius}))],layers:[
   layer('web-panel-1',centers[0],[{at:0},{at:.14,rotate:-8},{at:.48,rotate:95},{at:.7,rotate:72},{at:.9,rotate:8},{at:1}]),
   layer('web-panel-2',centers[1],[{at:0},{at:.19,rotate:-5},{at:.54,rotate:68},{at:.76,rotate:54},{at:.93,rotate:5},{at:1}])
  ]};
 }
 const modes={
  split:{rects:[[28,28,100,200],[128,28,100,200]],origin:[[128,128],[128,128]],poses:[{x:-15,rotate:-7},{x:15,rotate:7}]},
  fold:{rects:[[28,28,100,200],[128,28,100,200]],origin:[[128,128],[128,128]],poses:[{x:-9,scaleX:.12,rotate:-3},{x:9,scaleX:.12,rotate:3}]},
  fan:{rects:[[28,28,100,100],[128,28,100,100],[28,128,100,100],[128,128,100,100]],origin:[[128,128],[128,128],[128,128],[128,128]],poses:[{x:-7,y:-7,rotate:-11},{x:7,y:-7,rotate:11},{x:-7,y:7,rotate:11},{x:7,y:7,rotate:-11}]},
  shutter:{rects:[[28,28,200,50],[28,78,200,50],[28,128,200,50],[28,178,200,50]],origin:[[128,53],[128,103],[128,153],[128,203]],poses:[{x:-12,scaleY:.15},{x:12,scaleY:.15},{x:-12,scaleY:.15},{x:12,scaleY:.15}]},
  turn:{rects:[[28,28,200,200]],origin:[[128,128]],poses:[{scaleX:.08,rotate:-4}]},
  slide:{rects:[[28,28,67,200],[95,28,66,200],[161,28,67,200]],origin:[[61,128],[128,128],[195,128]],poses:[{x:-11,y:-8,rotate:-6},{y:-18},{x:11,y:-8,rotate:6}]},
  wobble:{rects:[[28,28,200,200]],origin:[[128,228]],poses:[{scaleX:1.07,scaleY:.90,rotate:-4}]},
  unseal:{rects:[[28,28,200,100],[28,128,200,100]],origin:[[128,128],[128,128]],poses:[{y:-15,scaleY:.35,rotate:-5},{y:15,scaleY:.35,rotate:5}]},
 };
 const names=Object.keys(modes),mode=modes[preset]||modes[names[seed%names.length]],name=modes[preset]?preset:names[seed%names.length];
 return {duration,preset:name,rects:mode.rects,layers:mode.rects.map((_rect,i)=>layer('web-panel-'+i,mode.origin[i],[{at:0},{at:.10+i*.025},{at:.40+delay+i*.02,...mode.poses[i]},{at:.76+Math.min(i*.02,.06),rotate:(i%2?1:-1)*(1+small),scaleX:1.01,scaleY:1.01},{at:1}]))};
}
function presetFor(id){
 if(/curtain|broadcast/.test(id))return'shutter';
 if(/rose|bloom|orchid|seraph|star/.test(id))return'fan';if(/cap|helmet|cassette|ticket/.test(id))return'fold';if(/jelly|plush|ghost/.test(id))return'wobble';if(/key|pop|cartridge|cup/.test(id))return'turn';if(/crystal|halo|signal/.test(id))return'split';if(/parcel|letter|note|envelope/.test(id))return'unseal';if(/tape|scroll|tab/.test(id))return'slide';return undefined;
}
export function createWebArt(legacy,source,studio=null){
 if(!legacy||!source||source.id===undefined)throw Error('Web artwork needs a source identity');
 if(Array.isArray(source.changes))source={...source,changes:source.changes.join('; ')};
 for(const key of ['sourceURL','creator','license','changes','alt'])if(typeof source[key]!=='string'||!source[key].trim())throw Error('Missing web-source '+key+' for '+source.id);
 for(const key of ['sourceURL','licenseURL','usageURL'])if(source[key]!=null){const url=new URL(source[key]);if(url.protocol!=='https:'||url.username||url.password)throw Error('Unsafe web-source '+key);}
 const components=(source.components||[]).map(component=>{if(Array.isArray(component.changes))component={...component,changes:component.changes.join('; ')};component={...component,changes:component.changes||'Included in the credited composite; see overall preparation changes.'};for(const key of ['sourceURL','creator','license','changes'])if(typeof component[key]!=='string'||!component[key].trim())throw Error('Missing source-component '+key+' for '+source.id);for(const key of ['sourceURL','licenseURL','usageURL'])if(component[key]!=null){const url=new URL(component[key]);if(url.protocol!=='https:'||url.username||url.password)throw Error('Unsafe source-component '+key);}if(component.originalSha256&&!/^[a-f0-9]{64}$/.test(component.originalSha256))throw Error('Invalid original component hash');return Object.freeze({...Object.fromEntries(['sourceURL','creator','license','changes'].map(key=>[key,component[key]])),licenseURL:component.licenseURL||null,...(component.usageURL?{usageURL:component.usageURL}:{}),...(component.originalSha256?{originalSha256:component.originalSha256}:{})});});
 const image=readSource(source.sourcePath,LIMIT),mini=readSource(studio?.miniPath||source.miniPath||source.sourcePath,MINI_LIMIT);
 const motion=studio ? {duration:studio.duration,layers:studio.layers} : choreography(source.id,legacy.type,source.reveal||presetFor(source.id));
 if(source.originalSha256&&!/^[a-f0-9]{64}$/.test(source.originalSha256))throw Error('Invalid original source hash');
 const sourceArt=Object.freeze({id:source.id,kind:'Downloaded web image',sourcePath:source.sourcePath,sourceURL:source.sourceURL,creator:source.creator,license:source.license,licenseURL:source.licenseURL||null,...(source.usageURL?{usageURL:source.usageURL}:{}),changes:studio?source.changes+' Studio 01 retains the credited image in an object-specific composition and adds an optically drawn miniature and named-part motion.':source.changes,...(source.originalSha256?{originalSha256:source.originalSha256}:{}),...(components.length?{components:Object.freeze(components)}:{}),sha256:image.sha256,mime:image.mime,bytes:image.bytes,width:image.width,height:image.height,mini:Object.freeze({path:mini.path,sha256:mini.sha256,mime:mini.mime,bytes:mini.bytes,width:mini.width,height:mini.height})});
 const body=(prefix,variant='detail')=>{
  if(studio)return studio.body(prefix,image.uri,variant==='detail');
  const radius=legacy.type==='gift'?10:3,photo=`<image id="${prefix}-web-image" x="28" y="28" width="200" height="200" preserveAspectRatio="xMidYMid meet" href="${image.uri}"/>`,frame=`<rect x="27" y="27" width="202" height="202" rx="${radius}" fill="#11161d" stroke="#37424c" stroke-width="1.5"/>`,clip=`<clipPath id="${prefix}-web-bound"><rect x="28" y="28" width="200" height="200" rx="${radius}"/></clipPath>`;
  if(legacy.type!=='gift')return`<defs>${photo}${clip}</defs>${frame}<g data-part="web-image"><use href="#${prefix}-web-image" clip-path="url(#${prefix}-web-bound)"/></g>`;
  const panels=motion.rects.map((r,i)=>{
   const circle=motion.circles?.[i],holes=motion.circles?.filter(Boolean),cutouts=holes?.map(({cx,cy,r})=>`M${cx-r} ${cy}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0Z`).join('');
   // Remove the reel regions from the stationary base too. Transparent reel
   // centers must not reveal a second, unmoving copy of the original teeth.
   const shape=circle?`<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}"/>`:i===0&&cutouts?`<path clip-rule="evenodd" fill-rule="evenodd" d="M28 28H228V228H28Z${cutouts}"/>`:`<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}"/>`;
   return`<clipPath id="${prefix}-web-panel-${i}">${shape}</clipPath>`;
  }).join('');
  return`<defs>${photo}${clip}${panels}</defs>${frame}<g clip-path="url(#${prefix}-web-bound)">${motion.rects.map((_r,i)=>`<g data-part="web-panel-${i}"><use href="#${prefix}-web-image" clip-path="url(#${prefix}-web-panel-${i})"/></g>`).join('')}</g>`;
 };
 const silhouette=prefix=>`<defs><filter id="${prefix}-web-silhouette" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .063 0 0 0 0 .086 0 0 0 0 .114 0 0 0 1 0"/></filter></defs><image x="28" y="28" width="200" height="200" preserveAspectRatio="xMidYMid meet" filter="url(#${prefix}-web-silhouette)" href="${mini.uri}"/>`;
 const {rects,circles,preset,...publicMotion}=motion;
 return Object.freeze({...legacy,material:studio?.material||source.material||'Web-sourced '+image.mime.slice(6).toUpperCase()+' artwork',alt:studio?.alt||source.alt,mini:`<image x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet" href="${mini.uri}"/>`,body,silhouette,motion:publicMotion,sourceArt,revealPreset:studio?source.id==='gift-cassette'?'cassette-reel-check':source.id+'-studio':preset||'badge response',...(studio?{edition:'Studio 01',storyboard:studio.story}:{})});
}
