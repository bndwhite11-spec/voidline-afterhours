/** Compare real production variants; replay named-part keyframes offline in librsvg.
 * Needs ffmpeg for the MP4. This is an asset review, not a browser recording.
 */
import {mkdir, mkdtemp, rm} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {JSDOM} from 'jsdom';
import {artCatalog, artSVG, priorArtSVG, studioIds} from '../src/art/catalog.mjs';

const dest=fileURLToPath(new URL('../docs/quality-assets/',import.meta.url));
await mkdir(dest,{recursive:true});
const background='#182127', text='#e7ede9', secondary='#a9b6b7';
const composite=(input,left,top)=>({input,left,top});
const raster=(svg,width)=>sharp(Buffer.from(svg)).resize(width,width).png().toBuffer();
const label=(copy,width,height,size,color=text)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="0" y="${height-5}" fill="${color}" font-size="${size}" font-family="DejaVu Sans, sans-serif">${copy}</text></svg>`);
const surface=(width,height,color)=>sharp({create:{width,height,channels:4,background:color}});
const beforeAfter=[],optics=[],strip=[];
const docById=new Map(studioIds.map(id=>[id,new JSDOM(artSVG(id,'detail'),{contentType:'image/svg+xml'})]));
function easing(fraction){
  // WAAPI's per-segment ease-in-out is cubic-bezier(.42,0,.58,1).
  let low=0,high=1;
  for(let i=0;i<19;i++){
    const t=(low+high)/2, one=1-t;
    if(3*one*one*t*.42+3*one*t*t*.58+t*t*t<fraction)low=t;else high=t;
  }
  const t=(low+high)/2;
  return (3-2*t)*t*t;
}
function sample(layer,progress,key,defaultValue) {
  const next=layer.frames.findIndex(frame=>frame.at>=progress);
  if(next<=0)return layer.frames[next===0?0:layer.frames.length-1][key]??defaultValue;
  const left=layer.frames[next-1], right=layer.frames[next];
  if(right.at===progress)return right[key]??defaultValue;
  const t=easing((progress-left.at)/(right.at-left.at));
  const a=left[key]??defaultValue, b=right[key]??defaultValue;
  return a+(b-a)*t;
}
function pose(id,time) {
  const dom=docById.get(id),scene=dom.window.document.documentElement.cloneNode(true);
  for(const layer of artCatalog[id].motion.layers){
    const [ox,oy]=layer.origin;
    for(const node of scene.querySelectorAll('[data-part="'+layer.name+'"]')){
      const get=(key,fallback)=>sample(layer,time,key,fallback);
      const base=node.getAttribute('transform')||'';
      node.setAttribute('transform',`translate(${ox+get('x',0)} ${oy+get('y',0)}) rotate(${get('rotate',0)}) scale(${get('scaleX',1)} ${get('scaleY',1)}) translate(${-ox} ${-oy}) ${base}`);
      node.setAttribute('opacity',get('opacity',Number(node.getAttribute('opacity')??1)));
    }
  }
  return new dom.window.XMLSerializer().serializeToString(scene);
}

for (const [i,id] of studioIds.entries()) {
  const obj=artCatalog[id],x=18+(i%2)*416,y=16+Math.floor(i/2)*215;
  beforeAfter.push(composite(label(obj.name,390,23,16),x,y));
  beforeAfter.push(composite(await raster(priorArtSVG(id,'detail'),159),x,y+28),composite(await raster(artSVG(id,'detail'),159),x+180,y+28));
  beforeAfter.push(composite(label('Previous',90,18,12,secondary),x+48,y+184),composite(label('Studio 01',90,18,12,secondary),x+224,y+184));
  const pixels=svg=>sharp(Buffer.from(svg)).resize(128,128).ensureAlpha().raw().toBuffer();
  const [rest,peak,settle]=await Promise.all([0,.48,1].map(t=>pixels(pose(id,t))));
  assert(rest.equals(settle), id+' motion should finish in the same resting pose');
  let movingPixels=0;
  for(let j=0;j<rest.length;j+=4){
    if((rest[j+3]||peak[j+3])&&[0,1,2,3].some(k=>Math.abs(rest[j+k]-peak[j+k])>8))movingPixels++;
  }
  assert(movingPixels>10,id+' should have visible travel at the sampled action');
  console.log(obj.name+': '+movingPixels+' changed pixels at 48%, identical first/last renders (128px)');
  const row=i*52+40;
  optics.push(composite(label(obj.name,150,22,13),12,row+11));
  for(const [j,size]of [16,20,24].entries()) {
    const current=await raster(artSVG(id,'mini'),size);
    for (const base of [164,354])optics.push(composite(current,base+j*51+Math.floor((24-size)/2),row+Math.floor((45-size)/2)));
  }
  const sy=48+i*105;
  strip.push(composite(label(obj.name,145,25,13),12,sy+38));
  for(const [k,t]of [0,.22,.48,.74,1].entries())
    strip.push(composite(await raster(pose(id,t),105),146+k*116,sy));
}
await surface(850,865,background).composite(beforeAfter).png().toFile(path.join(dest,'studio-01-before-after.png'));
const light=await surface(178,464,'#e7e9e4').png().toBuffer();
const sizes=[];
for(const [j,size]of [16,20,24].entries())
  for(const base of [164,354])sizes.push(composite(label(size+' px',45,23,12,base===164?secondary:'#3f5258'),base+j*51-4,8));
await surface(528,464,background).composite([composite(light,350,0),...sizes,...optics]).png().toFile(path.join(dest,'studio-01-miniatures.png'));
for(const [k,pct]of ['Rest','22%','48%','74%','Settle'].entries())strip.push(composite(label(pct,85,20,12,secondary),174+k*116,12));
await surface(735,894,background).composite(strip).png().toFile(path.join(dest,'studio-01-motion.png'));

const scratch=await mkdtemp(path.join(tmpdir(),'voidline-art-frames-'));
try {
  const fps=20;
  for(let frame=0;frame<42;frame++){
    const placements=await Promise.all(studioIds.map(async(id,index)=>{
      const elapsed=Math.max(0,(frame/fps-.12)*1000),time=Math.min(1,elapsed/artCatalog[id].motion.duration);
      return composite(await raster(pose(id,time),142),10+(index%4)*163,6+Math.floor(index/4)*175);
    }));
    for(const [index,id]of studioIds.entries())
      placements.push(composite(label(artCatalog[id].name,157,20,13),10+(index%4)*163,148+Math.floor(index/4)*175));
    await surface(652,352,background).composite(placements).png().toFile(path.join(scratch,'frame-'+String(frame).padStart(3,'0')+'.png'));
  }
  const encoded=spawnSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',path.join(scratch,'frame-%03d.png'),'-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',path.join(dest,'studio-01-reveals.mp4')],{stdio:'inherit'});
  if(encoded.status!==0)throw Error('ffmpeg could not encode Studio 01 motion proof.');
} finally { await rm(scratch,{recursive:true,force:true}); for(const dom of docById.values())dom.window.close(); }
