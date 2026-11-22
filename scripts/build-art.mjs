/** Compile authored, editable masters into lightweight optical marks and lazy SVG scenes. */
import {mkdir,mkdtemp,readFile,readdir,rename,rm,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {validateLayeredScene} from '../src/art/layered-format.mjs';
import {artCatalog,artSVG,artVersion,priorArtSVG,studioCatalog,published32ArtSVG,studioIds,curatedIds} from '../src/art/catalog.mjs';
import {legacyPresentations} from '../src/collectibles/legacy-presentations.mjs';
import {giftBases} from '../src/art/gift-bases.mjs';
import {telegramReferences} from '../src/art/telegram-references.mjs';
import {research,RESEARCH_REVIEWED_AT} from '../src/art/research.mjs';
import {COSMETICS,BADGE_DEFINITIONS} from '../worker/cosmetics.mjs';
const partial=process.argv.includes('--partial'),requireWeb=!partial||process.argv.includes('--require-web-sources'),root=new URL('../',import.meta.url),destination=new URL('../dist/art/v'+artVersion+'/',import.meta.url),client={};
const published32Source=id=>{const s=studioCatalog[id].sourceArt;return {edition:'Site 32',creator:s.creator,license:s.license,sourceURL:s.sourceURL,licenseURL:s.licenseURL,sha256:s.sha256,...(s.components?{components:s.components}:{}),changes:s.changes};};
const ids=Object.keys(artCatalog),catalogIds=COSMETICS.map(x=>x.id),earnedIds=BADGE_DEFINITIONS.map(x=>x.id);
if(!partial){for(const id of [...catalogIds,...earnedIds])if(!artCatalog[id])throw Error('Missing authored object '+id);if(ids.length!==catalogIds.length+earnedIds.length)throw Error('Art/catalog identity mismatch');}
if(!partial){
 const revised=Object.keys(legacyPresentations).sort();
 if(JSON.stringify(revised)!==JSON.stringify([...curatedIds].sort()))throw Error('Legacy presentation metadata differs from compiled artwork IDs');
 for(const id of revised){
  const account=COSMETICS.find(item=>item.id===id),master=artCatalog[id];
  for(const key of ['name','description','material','alt','artRevision']){
   if(master[key]!==legacyPresentations[id][key])throw Error('Art/legacy model metadata mismatch '+id+':'+key);
   if(account?.[key]!==master[key])throw Error('Account/legacy model metadata mismatch '+id+':'+key);
  }
 }
}
if(requireWeb)for(const id of ids)if(!artCatalog[id].sourceArt&&artCatalog[id].assetKind!=='layered-svg')throw Error('Missing downloaded web artwork '+id);
const hash=value=>createHash('sha256').update(value).digest('hex');
// Validate in a temporary directory. A failed new model must leave the previous
// working manifest, runtime and immutable assets usable.
const folder=pathToFileURL(await mkdtemp(path.join(tmpdir(),'voidline-compiled-art-'))+path.sep);
try {
const manifest={artVersion,researchReviewedAt:RESEARCH_REVIEWED_AT,generatedFrom:'Credited web sources, optical miniatures and original layered collectible masters in src/art',counts:{decorations:ids.filter(id=>artCatalog[id].type==='badge').length,gifts:ids.filter(id=>artCatalog[id].type==='gift').length,earned:ids.filter(id=>artCatalog[id].type==='earned').length,webSources:ids.filter(id=>artCatalog[id].sourceArt).length},items:[]};
for(const id of ids){
 const a=artCatalog[id],layered=a.assetKind==='layered-svg';if(!/^[a-z][a-z0-9-]{1,64}$/.test(id)||!a.name||!a.alt||!a.material||typeof a.body!=='function'||!a.mini||!a.silhouette)throw Error('Incomplete editable master '+id);
 if(!a.motion||a.motion.duration<900||a.motion.duration>(layered?3000:1800)||!a.motion.layers?.length)throw Error('Missing authored choreography '+id);
 const body=a.body('validation');
 for(const layer of a.motion.layers){if(!/^[a-z][a-z0-9-]*$/.test(layer.name)||!body.includes('data-part="'+layer.name+'"')||layer.frames.length<2)throw Error('Unbound moving part '+id+':'+layer.name);let previous=-1;for(const frame of layer.frames){if(!Number.isFinite(frame.at)||frame.at<0||frame.at>1||frame.at<previous)throw Error('Invalid choreography time '+id);previous=frame.at;for(const [key,value]of Object.entries(frame))if(!['at','x','y','rotate','scaleX','scaleY','opacity'].includes(key)||!Number.isFinite(value))throw Error('Invalid motion field '+id+':'+key);}if(layer.frames[0].at!==0||layer.frames.at(-1).at!==1)throw Error('Incomplete choreography endpoints '+id);}
 const variants={};for(const variant of ['mini','card','detail','silhouette']){const svg=artSVG(id,variant);
  if(layered){const dom=new JSDOM(svg,{contentType:'image/svg+xml'});try{validateLayeredScene(dom.window.document.documentElement,id,variant);}catch(error){throw Error(id+' '+variant+': '+error.message);}finally{dom.window.close();}}
  const digest=hash(svg),file=id+'-'+variant+'.'+digest.slice(0,12)+'.svg';await writeFile(new URL(file,folder),svg);variants[variant]={url:'/art/v'+artVersion+'/'+file,width:variant==='mini'?24:256,height:variant==='mini'?24:256,bytes:Buffer.byteLength(svg),sha256:digest};}
 const history=[];
 if(studioIds.includes(id))history.push(priorArtSVG);
 if(curatedIds.includes(id))history.push(published32ArtSVG);
 for(const archived of history)for(const variant of Object.keys(variants)){
  const previous=archived(id,variant),digest=hash(previous),file=id+'-'+variant+'.'+digest.slice(0,12)+'.svg';
  if(variants[variant].sha256!==digest)await writeFile(new URL(file,folder),previous);
 }

 const basis=giftBases[id],studied=basis?telegramReferences[basis.referenceKey]:null,reference=studied?{kind:'Motion and material reference only',base:basis.base,url:studied.sourceURL}:null;
 const provenance=research[id]||{sources:studied?.sources||[],credits:'Original VOIDLINE illustration and choreography; Telegram collectible research informed only the material and motion base.',rights:'Original VOIDLINE object, not an official Telegram asset or NFT. No downloaded reference artwork is redistributed and no source NFT ownership or affiliation is claimed.',newlyDrawn:[...a.motion.layers.map(layer=>layer.name),'optical miniature','silhouette']};
 const web=a.sourceArt;if(web&&web.id!==id)throw Error('Downloaded source identity mismatch '+id);
 const record={id,assetKind:layered?'layered-svg':'legacy-web-raster',reference,name:a.name,type:a.type,series:a.series,material:a.material,alt:a.alt,artVersion,restingState:web?'Complete static web-sourced image':'Complete static illustration',animationStates:['rest','hover/focus response','explicit preview','inspection',...(a.type==='gift'?['acknowledged receipt reveal']:[]),'reduced-motion still','unavailable/retired'],motion:a.motion,variants,sources:web?[...new Set([web.sourceURL,web.licenseURL,web.usageURL,...(web.components||[]).flatMap(x=>[x.sourceURL,x.licenseURL,x.usageURL])].filter(Boolean))]:provenance.sources||[],credits:web?web.creator+' · '+web.license:provenance.credits||provenance.credit,rights:web?[web.license,web.licenseURL].filter(Boolean).join('; '):provenance.rights,newlyDrawn:web?[]:provenance.newlyDrawn,...(web?{sourceArt:web,changes:web.changes,revealPreset:a.revealPreset,presentation:'Geometric image framing and explicit one-shot image reveal; source artwork is not redrawn.'}:{}),...(!web&&provenance.constructionBasis?{constructionBasis:provenance.constructionBasis}:{})};
 if(a.edition&&!layered){
  record.edition=a.edition;record.storyboard=a.storyboard;
  record.restingState='Complete static web-sourced image composed within an object-specific illustration';
  record.presentation='Credited source image combined with a drawn setting, optical miniature, and motion attached to moving parts.';
  record.newlyDrawn=['optical miniature','object setting and material details'];
 }
 record.credits=record.credits||'Original VOIDLINE vector drawing';record.newlyDrawn=record.newlyDrawn||[...a.motion.layers.map(layer=>layer.name),'optical miniature','silhouette'];
 if(layered){
  const {assetKind,familyId,tier,backdrop,motif,description,acquisitionPolicy,artRevision}=a;
  Object.assign(record,{assetKind,familyId,tier,backdrop,motif,description,acquisitionPolicy,artRevision,edition:artRevision,
    ...(curatedIds.includes(id)?{archivedSource:published32Source(id)}:{}),
    restingState:'Complete static layered illustration',presentation:'Original layered artwork with named mechanical or textile parts',storyboard:a.storyboard,
    credits:'Original VOIDLINE vector illustration and motion',rights:'Art drawn for VOIDLINE. Character references have their respective creators; no official affiliation.',
    newlyDrawn:['optical miniature','object geometry',...a.motion.layers.map(layer=>layer.name)]});
  if(!record.storyboard||record.storyboard.length<12)throw Error('Missing storyboard '+id);
 }
 manifest.items.push(record);client[id]={id,assetKind:record.assetKind,...(record.archivedSource?{archivedSource:{creator:record.archivedSource.creator,sourceURL:record.archivedSource.sourceURL,license:record.archivedSource.license}}:{}),...(a.edition?{edition:a.edition}:{}),reference,name:a.name,type:a.type,series:a.series,material:a.material,alt:a.alt,...(layered?{acquisitionPolicy:a.acquisitionPolicy,familyId:a.familyId,tier:a.tier,backdrop:a.backdrop,motif:a.motif,description:a.description,artRevision:a.artRevision,miniURL:variants.mini.url}:{motion:a.motion}),cardURL:variants.card.url,detailURL:variants.detail.url,silhouetteURL:variants.silhouette.url,detailBytes:variants.detail.bytes,detailSHA256:variants.detail.sha256,...(web?{sourceArt:web}:layered?{}:{mini:a.mini})};
}
await writeFile(new URL('manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');
const compiled=await build({stdin:{contents:`import {installArt} from './src/art/client.mjs';installArt(${JSON.stringify(client)},${artVersion});`,resolveDir:root.pathname,sourcefile:'collectible-art-entry.mjs',loader:'js'},bundle:true,format:'iife',platform:'browser',target:'es2022',write:false,minify:true,legalComments:'none'});
// An awarded receipt may outlive its model's current display revision. An
// intentional art repair retains the old bytes under src/art/historical-variants
// (the normal source ZIP also contains that directory). Refuse a broken release.
const inventoryFolder=new URL('../src/collectibles/',import.meta.url);
for(const table of (await readdir(inventoryFolder)).filter(name=>/^choice-v\d+-assets\.json$/.test(name))){
 const pinned=JSON.parse(await readFile(new URL(table,inventoryFolder),'utf8'));
 for(const [id,variants]of Object.entries(pinned))for(const [variant,record]of Object.entries(variants)){
  const filename=id+'-'+variant+'.'+record.sha256.slice(0,12)+'.svg';
  if(!/^[a-z0-9-]+$/.test(id)||!['mini','card','detail','silhouette'].includes(variant)||!/^[a-f0-9]{64}$/.test(record.sha256)||record.url!=='/art/v'+artVersion+'/'+filename)throw Error('Invalid frozen artwork path in '+table);
  let bytes;
  try{bytes=await readFile(new URL(filename,folder));}
  catch(error){
   if(error.code!=='ENOENT')throw error;
   bytes=await readFile(new URL('../src/art/historical-variants/'+filename,import.meta.url));
   await writeFile(new URL(filename,folder),bytes);
  }
  if(hash(bytes)!==record.sha256)throw Error('Frozen artwork failed its digest in '+table+': '+id);
 }
}
await mkdir(destination,{recursive:true});
const outputFiles=new Set(await readdir(folder));
async function publishFile(target,bytes){
 const temporary=new URL('.writing-'+process.pid+'-'+path.basename(target.pathname),target);
 try{await writeFile(temporary,bytes);await rename(temporary,target);}
 finally{await rm(temporary,{force:true});}
}
for(const file of outputFiles){
 if(file==='manifest.json')continue;
 await publishFile(new URL(file,destination),await readFile(new URL(file,folder)));
}
await publishFile(new URL('manifest.json',destination),await readFile(new URL('manifest.json',folder)));
await publishFile(new URL('../dist/collectible-art.js',import.meta.url),compiled.outputFiles[0].text);
for(const file of await readdir(destination)){
 if(/^[a-z0-9-]+[.][a-f0-9]{12}[.]svg$/.test(file)&&!outputFiles.has(file))await rm(new URL(file,destination));
}
console.log(`Built edition${artVersion}: ${manifest.counts.decorations} decorations, ${manifest.counts.gifts} gifts, ${manifest.counts.earned} earned awards; ${manifest.counts.webSources} credited raster compositions, ${ids.length-manifest.counts.webSources} original layered compositions; ${manifest.items.length*4} lazy SVG variants; ${compiled.outputFiles[0].contents.length} bytes in the on-demand collectible renderer${partial?' (partial quality-gate build)':''}.`);

} finally { await rm(folder,{recursive:true,force:true}); }
