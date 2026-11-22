// Actual current masters and Site 32 assets. Generates representative optical
// sheets for the complete pre-capsule gift catalog plus sampled motion checks.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {JSDOM} from 'jsdom';
import {sampleArtPose} from './sample-art-pose.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dest=path.join(root,'docs/collectible-proof');
const current=JSON.parse(await readFile(path.join(root,'dist/art/v4/manifest.json'),'utf8'));
const history=JSON.parse(await readFile(path.join(root,'src/art/published-32-gift-variants.json'),'utf8'));
const ids=Object.keys(history);
const currentById=new Map(current.items.map(m=>[m.id,m]));
const illustration=async v=>{const b=await readFile(path.join(root,'dist',v.url));assert.equal(createHash('sha256').update(b).digest('hex'),v.sha256);return b;};
const raster=(svg,n)=>sharp(Buffer.from(svg)).resize(n,n).png().toBuffer();
const label=(value,size=13)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="175" height="22"><text x="2" y="16" fill="#eceeea" font-family="DejaVu Sans,sans-serif" font-size="${size}">${value.replaceAll('&','&amp;').replaceAll('<','&lt;')}</text></svg>`);
const plate=(width,height)=>sharp({create:{width,height,channels:4,background:'#202327'}});
const place=(input,left,top)=>({input,left,top});
const report=[];
await mkdir(dest,{recursive:true});
for(let start=0;start<ids.length;start+=8){
 const items=ids.slice(start,start+8),rows=[];
 for(const [index,column]of ['Object','Site 32','Current','Rest','19%','48%','74%','Settled'].entries())
   rows.push(place(label(column,12),[4,184,270,359,471,583,695,807][index],7));
 for(const [i,id]of items.entries()){
  const item=currentById.get(id),revised=item.assetKind==='layered-svg',y=34+i*108;
  const old=await illustration(history[id].card),now=await illustration(item.variants.card),detail=await illustration(item.variants.detail);
  rows.push(place(label(item.name),6,y+25),place(label(revised?'Revised visual':'Legacy edition',11),6,y+45),place(await raster(old,64),185,y+17),place(await raster(now,64),276,y+17));
  const dom=new JSDOM(detail.toString(),{contentType:'image/svg+xml'}),sampled=[];
  try{
   for(const [j,t]of [0,.19,.48,.74,1].entries()){
    const pose=await raster(sampleArtPose(dom,item.motion,t),96);
    rows.push(place(pose,351+j*112,y));
    sampled.push(await sharp(pose).raw().ensureAlpha().toBuffer());
   }
  }finally{dom.window.close();}
  const first=sampled[0];let moving=0,cut=0;
  for(let k=0;k<first.length;k+=4){
   const x=k/4%96,y=Math.floor(k/4/96);
   if(sampled.some(f=>f.slice(k,k+4).some((v,c)=>Math.abs(v-first[k+c])>10)))moving++;
   if((x===0||y===0||x===95||y===95)&&sampled.some(f=>f[k+3]>=128))cut++;
  }
  const same=first.equals(sampled.at(-1));
  if(revised){assert(same,id+' final pose changed');assert(moving>0,id+' has no movement in samples');}
  report.push({id,name:item.name,revised,edition:item.edition??'legacy',canonicalEndpointsMatch:same,changedPixelsAt96:moving,occupiedStageEdgePixelsAt96:cut});
 }
 const suffix=String(start/8+1).padStart(2,'0');
 await plate(915,34+items.length*108).composite(rows).png().toFile(path.join(dest,'legacy-curation-'+suffix+'.png'));
}
await writeFile(path.join(dest,'legacy-curation.json'),JSON.stringify(report,null,2)+'\n');
console.log(report.length+' legacy gifts sampled; '+report.filter(r=>r.revised).length+' revised. '+report.filter(r=>r.revised&&r.occupiedStageEdgePixelsAt96>0).length+' revised models touch the sampled stage edge.');
