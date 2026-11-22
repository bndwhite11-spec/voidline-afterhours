// Renders the exact exported art using librsvg; its timing/geometry are a
// software study of production keyframes, not a recording of browser playback.
import {mkdir,readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {JSDOM} from 'jsdom';
import {sampleArtPose} from './sample-art-pose.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2), flag=name=>args.includes(name),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const output=path.resolve(arg('--output',path.join(root,'docs/collectible-proof')));
const manifest=JSON.parse(await readFile(path.join(root,'dist/art/v4/manifest.json'),'utf8'));
const historicalManifest=JSON.parse(await readFile(path.join(root,'src/art/published-32-gift-variants.json'),'utf8'));
const source=async variant=>{
 const bytes=await readFile(path.join(root,'dist',variant.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),variant.sha256);
 return bytes;
};
const backgrounds={dark:'#212328',light:'#e1dfdb'};
const field=(w,h,background=backgrounds.dark)=>sharp({create:{width:w,height:h,channels:4,background}});
const img=(input,size)=>sharp(Buffer.from(input)).resize(size,size).png().toBuffer();
const add=(input,left,top)=>({input,left,top});
const text=(label,width=270,size=15)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="25"><text x="2" y="18" font-family="DejaVu Sans, sans-serif" font-size="${size}" fill="#ebeee9">${label.replaceAll('&','&amp;').replaceAll('<','&lt;')}</text></svg>`);
const make=async(w,h,items,file,bg)=>field(w,h,bg).composite(items).png().toFile(path.join(output,file));
const families=[...new Set(manifest.items.filter(x=>x.assetKind==='layered-svg'&&x.familyId).map(x=>x.familyId))];
const selected=arg('--family',null);
if(selected&&!families.includes(selected))throw Error('Unknown or unbuilt family: '+selected);
await mkdir(output,{recursive:true});
for(const family of families.filter(id=>!selected||id===selected)){
 const items=manifest.items.filter(item=>item.familyId===family),docs=[],small=[],large=[],motion=[],stats=[];
 try{
  for(const [i,item] of items.entries()){
   const poster=await source(item.variants.card),detail=await source(item.variants.detail),mini=await source(item.variants.mini);
   const dom=new JSDOM(detail.toString(),{contentType:'image/svg+xml'});docs.push(dom);
   const col=i%3,row=Math.floor(i/3),left=col*265+6,top=row*289+8;
   large.push(add(await img(detail,248),left,top),add(text(item.name,255),left,top+248));
   small.push(add(await img(poster,64),i*104+16,10));
   for(const [j,n] of [16,20,24].entries())small.push(add(await img(mini,n),i*104+9+j*30,91+Math.floor((24-n)/2)));
   const poses=[0,.19,.48,.74,1];
   motion.push(add(text(item.name,162,13),6,46+i*104));
   const buffers=[];
   for(const [j,t] of poses.entries()){
    const bytes=await img(sampleArtPose(dom,item.motion,t),100);
    motion.push(add(bytes,172+j*106,8+i*104));buffers.push(await sharp(bytes).ensureAlpha().raw().toBuffer());
   }
   assert.deepEqual(buffers[0],buffers.at(-1),item.name+' canonical endpoints disagree');
   let moving=0,cutEdge=0;
   const initial=buffers[0];for(let k=0;k<initial.length;k+=4){
    if(buffers.some(frame=>frame.slice(k,k+4).some((v,c)=>Math.abs(v-initial[k+c])>10)))moving++;
    const pixel=k/4,x=pixel%100,y=Math.floor(pixel/100);
    if((x===0||x===99||y===0||y===99)&&buffers.some(frame=>frame[k+3]>100))cutEdge++;
   }
   assert(moving>30,item.name+' lacks readable movement');assert.equal(cutEdge,0,item.name+' motion touches stage edge');
   stats.push({id:item.id,movingPixelsAt100px:moving,edgePixelsAt100px:cutEdge,durationMs:item.motion.duration,posterBytes:poster.length,detailBytes:detail.length});
  }
  await make(795,Math.ceil(items.length/3)*289,large,family+'-details.png');
  await make(items.length*104,128,small,family+'-optics-dark.png');
  await make(items.length*104,128,small,family+'-optics-light.png',backgrounds.light);
  await make(712,items.length*104+16,motion,family+'-poses.png');
  if(family==='chudjak-plush'||family==='pepe-keycap'){
   const oldId=family==='chudjak-plush'?'gift-chudjak-plush':'gift-last-tab',old=manifest.items.find(x=>x.id===oldId);
   const comparison=[];const baseline={...old,variants:historicalManifest[old.id]};for(const [i,o]of [baseline,items[0]].entries()){
    const label=i?o.name:family==='pepe-keycap'?'Last Tab Open · existing mechanism':o.name+' · legacy';
    comparison.push(add(text(label,300),8+i*308,4),add(await img(await source(o.variants.detail),230),8+i*308,36),add(await img(await source(o.variants.card),64),238+i*308,178));
   }
   await make(618,275,comparison,family+'-comparison.png');
  }
  if(flag('--video')){
   const scratch=await mkdtemp(path.join(tmpdir(),'voidline-collectibles-'));
   try{
    const fps=20,total=Math.ceil(Math.max(...items.map(item=>item.motion.duration))/1000*fps)+5;
    for(let i=0;i<=total;i++){
     const tiles=await Promise.all(items.map(async(item,j)=>add(await img(sampleArtPose(docs[j],item.motion,Math.min(1,Math.max(0,i/fps*1000-100)/item.motion.duration)),188),j%3*194+3,Math.floor(j/3)*194+3)));
     await field(582,Math.ceil(items.length/3)*194).composite(tiles).png().toFile(path.join(scratch,'frame-'+String(i).padStart(3,'0')+'.png'));
    }
    const proc=spawnSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',path.join(scratch,'frame-%03d.png'),'-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,family+'.mp4')],{stdio:'inherit'});
    assert.equal(proc.status,0,'video encoding failed');
   }finally{await rm(scratch,{recursive:true,force:true});}
  }
  await writeFile(path.join(output,family+'-measurements.json'),JSON.stringify(stats,null,2)+'\n');
  console.log(family+': '+items.length+' exact exported models, matching endpoints, visible motion, no clipped outer pixels in five sampled poses');
 }finally{for(const d of docs)d.window.close();}
}
