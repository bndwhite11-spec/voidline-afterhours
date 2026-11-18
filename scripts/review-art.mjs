/** Export actual editable SVGs, rasterized with installed Inkscape. No browser claim. */
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {artCatalog,artSVG} from '../src/art/catalog.mjs';
const args=process.argv.slice(2),dest=args.includes('--all')?'/workspace/work/voidline-output/art-v18':'/workspace/work/voidline-output/art-prototypes-v18';
const ids=args.includes('--all')?Object.keys(artCatalog):['ego-unique-one','meme-nothing-happens','larp','coin-crosssignal','gift-rose','gift-cassette'];
await mkdir(dest,{recursive:true});const entries=[];
for(const id of ids){if(!artCatalog[id])throw Error('Missing quality-gate item '+id);for(const variant of ['detail','card','mini','silhouette']){const svg=dest+'/'+id+'-'+variant+'.svg',png=dest+'/'+id+'-'+variant+'.png';await writeFile(svg,artSVG(id,variant));const width=variant==='mini'?24:variant==='card'?96:256;const r=spawnSync('inkscape',[svg,'--export-type=png','--export-width='+width,'--export-filename='+png],{encoding:'utf8',env:{...process.env,INKSCAPE_PROFILE_DIR:'/tmp/voidline-inkscape-profile'},timeout:20000});if(r.status)throw Error('SVG raster failed '+id+' '+variant+': '+r.stderr.slice(-500));}entries.push({id,...Object.fromEntries(['name','type','series','material','alt'].map(k=>[k,artCatalog[id][k]]))});}
await writeFile(dest+'/index.json',JSON.stringify(entries,null,2));console.log(JSON.stringify({directory:dest,items:entries.length,variants:4,renderer:'Inkscape1.4',browser:false}));
