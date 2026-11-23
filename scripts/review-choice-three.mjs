// Render the original choice-v3 masters at actual timeline positions. Requires
// the same sharp/librsvg renderer as the other collectible comparison sheets.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
import sharp from 'sharp';
import {artCatalog,artSVG} from '../src/art/catalog.mjs';
import {validateLayeredScene} from '../src/art/layered-format.mjs';
import {sampleArtPose} from './sample-art-pose.mjs';
const output=fileURLToPath(new URL('../docs/collectible-proof/', import.meta.url));
const models=Object.values(artCatalog).filter(m=>['copium-cartridge','pocket-terminal','egoists-volume'].includes(m.familyId));
assert.equal(models.length,14);
const pixels=async (svg,size)=>sharp(Buffer.from(svg)).resize(size,size).ensureAlpha().raw().toBuffer();
const png=(bytes,size)=>sharp(bytes,{raw:{width:size,height:size,channels:4}}).png().toBuffer();
const cells=[], canvas=1040, tile=260, height=828, rows=4;
const text=(x,y,txt,px,color='#e7e5d9')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${px}" font-family="sans-serif">${txt}</text>`;
let labels=text(14,27,'Choice capsules · cartridge editions, pocket terminals and pocket volumes',20);
function difference(a,b) {let sum=0;for(let i=0;i<a.length;i+=4)if(Math.max(...[0,1,2,3].map(k=>Math.abs(a[i+k]-b[i+k])))>25)sum++;return sum;}
for(const [i,m] of models.entries()){
 const left=i%4*tile,top=41+Math.floor(i/4)*(height-41)/rows;
 const y=Math.round(top),stage=128;
 for(const v of ['mini','card','silhouette','detail']){
  const dom=new JSDOM(artSVG(m.id,v),{contentType:'image/svg+xml'});validateLayeredScene(dom.window.document.documentElement,m.id,v);dom.window.close();
 }
 const doc=new JSDOM(artSVG(m.id,'detail'),{contentType:'image/svg+xml'});
 let first,peak,last,change=0,tpeak=0;
 for(let j=0;j<=16;j++){
  const t=j/16;
  const raw=await pixels(sampleArtPose(doc,m.motion,t),stage);
  for(let k=0;k<stage;k++){
   for(const pos of [k,k*stage,k*stage+stage-1,(stage-1)*stage+k])assert(raw[pos*4+3]<70,m.id+' stage edge at '+t);
  }
  if(!first)first=raw;
  const diff=difference(first,raw);
  if(diff>change){change=diff;peak=raw;tpeak=t;}
  last=raw;
 }
 assert.equal(Buffer.compare(first,last),0,m.id+' endpoint');
 assert(change>72,m.id+' movement '+change);
 const mini=artSVG(m.id,'mini');
 const tiny=await pixels(mini,16);assert(tiny.filter((v,i)=>i%4===3&&v>128).length>17,m.id+' tiny');
 const rest=await pixels(artSVG(m.id,'card'),stage);
 cells.push({input:await png(rest,stage),left,top:y+18},{input:await png(peak,stage),left:left+123,top:y+18},
  {input:await png(await pixels(mini,24),24),left:left+16,top:y+144},{input:await png(tiny,16),left:left+48,top:y+149});
 labels+=text(left+12,y+15,m.name,16)+text(left+76,y+159,m.tier+' · '+Math.round(tpeak*100)+'% frame',12,'#bdc5c3')+
 `<path d="M${left+10} ${y+176}h238" stroke="#34414a"/>`;
 console.log(m.id+': 4 variants, 17 sampled frames; '+change+' changed pixels at '+tpeak);
 doc.window.close();
}
await mkdir(output,{recursive:true});
const surface=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${height}"><rect width="100%" height="100%" fill="#20292f"/>${labels}</svg>`);
const final=await sharp(surface).composite(cells).png().toBuffer();
await writeFile(output+'choice-v3-models.png',final);
