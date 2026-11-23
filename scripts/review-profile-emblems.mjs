// Render the actual inspection and optical files; preserve the native pixel sizes
// beneath each proof so engraving can be checked independently of silhouette.
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {artCatalog,artSVG,emblemIds} from '../src/art/catalog.mjs';

const target=process.argv[2]||fileURLToPath(new URL('../docs/collectible-proof/profile-emblems.png',import.meta.url));
const text=(x,y,s,size,tint)=>`<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${tint}">${s}</text>`;
const svg=(w,h,s)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${s}</svg>`);
const width=1020,height=484,cell=198,rowHeight=202;
const layers=[], miniMasks=new Set();
let labels=text(20,31,'VOIDLINE / Profile emblems',24,'#e8edf0')+text(20,55,'Inspection artwork and native 16, 20 and 24 px profile icons',14,'#b4c0cb');
for(const [idx,id] of emblemIds.entries()){
  const x=16+(idx%5)*cell,y=73+Math.floor(idx/5)*rowHeight;
  labels+=`<path d="M${x} ${y}h184" stroke="#3b454f"/>`+text(x,y+20,artCatalog[id].name,15,'#e8edf0');
  const detail=Buffer.from(artSVG(id,'card')), mini=Buffer.from(artSVG(id,'mini'));
  layers.push({left:x+31,top:y+23,input:await sharp(detail).resize(122).png().toBuffer()});
  labels+=`<rect x="${x+3}" y="${y+153}" width="86" height="37" rx="3" fill="#10151a"/><rect x="${x+95}" y="${y+153}" width="86" height="37" rx="3" fill="#e0e0d8"/>`;
  let cursor=8;
  for(const size of [16,20,24]){
    const rgba=await sharp(mini).resize(size).ensureAlpha().raw().toBuffer();
    let ink=0,fill=0;const silhouette=[];
    for(let i=0;i<rgba.length;i+=4){if(rgba[i+3]>150)fill++;if(rgba[i+3]>150&&Math.min(rgba[i],rgba[i+1],rgba[i+2])<100)ink++;silhouette.push(rgba[i+3]>150?'1':'0');}
    assert(fill>size*size*.17 && ink>4,id+' optical mark collapses at '+size);
    if(size===16){const k=silhouette.join('');assert(!miniMasks.has(k),'identical 16px silhouettes');miniMasks.add(k);}
    const input=await sharp(mini).resize(size).png().toBuffer();
    for(const ground of [0,92])layers.push({left:x+ground+cursor,top:y+153+Math.floor((37-size)/2),input});
    cursor+=size+7;
  }
}
await mkdir(path.dirname(target),{recursive:true});
await sharp({create:{width,height,channels:3,background:'#191e24'}}).composite([{left:0,top:0,input:svg(width,height,labels)},...layers]).png().toFile(target);
console.log('Rendered ten distinct badge silhouettes at 16, 20 and 24 pixels on light and dark grounds. '+target);
