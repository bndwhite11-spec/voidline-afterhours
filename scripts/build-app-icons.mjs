/** Conventional exports of the existing VOIDLINE mark; no generated artwork.
 * Regeneration: Inkscape + Python/Pillow. Normal builds use --check (Node only).
 */
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const directory=path.join(root,'dist/icons');
const source=await readFile(path.join(root,'dist/icon.svg'),'utf8');
const sourceHash=createHash('sha256').update(source).digest('hex');
const variants=[
 {name:'icon-192.png',size:192,padding:0},
 {name:'icon-512.png',size:512,padding:0},
 {name:'apple-touch-icon.png',size:180,padding:0},
 {name:'icon-maskable-512.png',size:512,padding:.125},
];

function inspectPNG(bytes){
 if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid app-icon PNG');
 const metadata={};let width,height;
 for(let offset=8;offset+12<=bytes.length;){
  const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),start=offset+8;
  if(length>bytes.length-start-4)throw Error('Truncated app-icon PNG');
  if(type==='IHDR'){width=bytes.readUInt32BE(start);height=bytes.readUInt32BE(start+4);}
  if(type==='tEXt'){const text=bytes.toString('latin1',start,start+length),split=text.indexOf('\0');if(split>0)metadata[text.slice(0,split)]=text.slice(split+1);}
  if(type==='acTL')throw Error('App icons must be static');
  offset=start+length+4;
 }
 return {width,height,metadata};
}

if(!process.argv.includes('--check')){
 const inner=/<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/.exec(source)?.[1];
 if(!inner)throw Error('The existing icon.svg could not be read');
 const temporary=await mkdtemp(path.join(tmpdir(),'voidline-app-icons-'));
 try{
  await mkdir(directory,{recursive:true});
  for(const variant of variants){
   const size=variant.size,inset=size*variant.padding,artSize=size-inset*2;
   // The maskable mark is contained within a75% square. Its actual chrome
   // construction stays inside the central80%-diameter safe circle.
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#0E1013"/><svg x="${inset}" y="${inset}" width="${artSize}" height="${artSize}" viewBox="0 0 240 240">${inner}</svg></svg>`;
   const input=path.join(temporary,variant.name+'.svg'),raster=path.join(temporary,variant.name);
   await writeFile(input,svg);
   const result=spawnSync('inkscape',[input,'--export-type=png','--export-filename='+raster],{encoding:'utf8',env:{...process.env,INKSCAPE_PROFILE_DIR:path.join(temporary,'inkscape')},timeout:30000});
   if(result.status!==0)throw Error('Inkscape app-icon export failed: '+result.stderr.slice(-600));
   const python=String.raw`from PIL import Image,PngImagePlugin
import sys
image=Image.open(sys.argv[1]).convert('RGB')
image=image.quantize(colors=256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
metadata=PngImagePlugin.PngInfo()
metadata.add_text('Source-SHA256',sys.argv[3])
metadata.add_text('Preparation','Conventional raster export of existing VOIDLINE icon.svg; opaque graphite background; maskable export has12.5% padding.')
image.save(sys.argv[2],format='PNG',optimize=True,compress_level=9,pnginfo=metadata)
`;
   const encoded=spawnSync('python3',['-c',python,raster,path.join(directory,variant.name),sourceHash],{encoding:'utf8',timeout:30000});
   if(encoded.status!==0)throw Error('PNG optimization failed: '+encoded.stderr.slice(-600));
  }
 }finally{await rm(temporary,{recursive:true,force:true});}
}

let total=0;
for(const variant of variants){
 const bytes=await readFile(path.join(directory,variant.name)),info=inspectPNG(bytes);total+=bytes.length;
 if(info.width!==variant.size||info.height!==variant.size)throw Error('Wrong dimensions: '+variant.name);
 if(info.metadata['Source-SHA256']!==sourceHash)throw Error('Stale icon export: '+variant.name+'; regenerate with node scripts/build-app-icons.mjs');
}
if(total>120*1024)throw Error('App-icon exports exceed120KiB');
console.log(`Verified4 app-icon PNGs:192px,512px,180px Apple touch and512px maskable; ${total} bytes; existing SVG source hash matches.`);
