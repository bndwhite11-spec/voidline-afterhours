/** Compile authored, editable masters into lightweight optical marks and lazy SVG scenes. */
import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {artCatalog,artSVG,artVersion} from '../src/art/catalog.mjs';
import {giftBases} from '../src/art/gift-bases.mjs';
import {telegramReferences} from '../src/art/telegram-references.mjs';
import {research,RESEARCH_REVIEWED_AT} from '../src/art/research.mjs';
import {COSMETICS,BADGE_DEFINITIONS} from '../worker/cosmetics.mjs';
const partial=process.argv.includes('--partial'),root=new URL('../',import.meta.url),folder=new URL('../dist/art/v3/',import.meta.url),client={};
const ids=Object.keys(artCatalog),catalogIds=COSMETICS.map(x=>x.id),earnedIds=BADGE_DEFINITIONS.map(x=>x.id);
if(!partial){for(const id of [...catalogIds,...earnedIds])if(!artCatalog[id])throw Error('Missing authored object '+id);if(ids.length!==catalogIds.length+earnedIds.length)throw Error('Art/catalog identity mismatch');}
const hash=value=>createHash('sha256').update(value).digest('hex');
await mkdir(folder,{recursive:true});await rm(folder,{recursive:true,force:true});await mkdir(folder,{recursive:true});
const manifest={artVersion,researchReviewedAt:RESEARCH_REVIEWED_AT,generatedFrom:'src/art/*.mjs editable vector masters',counts:{decorations:ids.filter(id=>artCatalog[id].type==='badge').length,gifts:ids.filter(id=>artCatalog[id].type==='gift').length,earned:ids.filter(id=>artCatalog[id].type==='earned').length},items:[]};
for(const id of ids){
 const a=artCatalog[id];if(!/^[a-z][a-z0-9-]{1,64}$/.test(id)||!a.name||!a.alt||!a.material||typeof a.body!=='function'||!a.mini||!a.silhouette)throw Error('Incomplete editable master '+id);
 if(!a.motion||a.motion.duration<900||a.motion.duration>1800||!a.motion.layers?.length)throw Error('Missing authored choreography '+id);
 const body=a.body('validation');
 for(const layer of a.motion.layers){if(!/^[a-z][a-z0-9-]*$/.test(layer.name)||!body.includes('data-part="'+layer.name+'"')||layer.frames.length<2)throw Error('Unbound moving part '+id+':'+layer.name);let previous=-1;for(const frame of layer.frames){if(!Number.isFinite(frame.at)||frame.at<0||frame.at>1||frame.at<previous)throw Error('Invalid choreography time '+id);previous=frame.at;for(const [key,value]of Object.entries(frame))if(!['at','x','y','rotate','scaleX','scaleY','opacity'].includes(key)||!Number.isFinite(value))throw Error('Invalid motion field '+id+':'+key);}if(layer.frames[0].at!==0||layer.frames.at(-1).at!==1)throw Error('Incomplete choreography endpoints '+id);}
 const variants={};for(const variant of ['mini','card','detail','silhouette']){const svg=artSVG(id,variant),digest=hash(svg),file=id+'-'+variant+'.'+digest.slice(0,12)+'.svg';await writeFile(new URL(file,folder),svg);variants[variant]={url:'/art/v3/'+file,width:variant==='mini'?24:256,height:variant==='mini'?24:256,bytes:Buffer.byteLength(svg),sha256:digest};}
 const basis=giftBases[id],studied=basis?telegramReferences[basis.referenceKey]:null,reference=studied?{kind:'Motion and material reference only',base:basis.base,url:studied.sourceURL}:null;
 const provenance=research[id]||{sources:studied?.sources||[],credits:'Original VOIDLINE illustration and choreography; Telegram collectible research informed only the material and motion base.',rights:'Original VOIDLINE object, not an official Telegram asset or NFT. No downloaded reference artwork is redistributed and no source NFT ownership or affiliation is claimed.',newlyDrawn:[...a.motion.layers.map(layer=>layer.name),'optical miniature','silhouette']};
 const record={id,reference,name:a.name,type:a.type,series:a.series,material:a.material,alt:a.alt,artVersion,restingState:'Complete static illustration',animationStates:['rest','hover/focus response','explicit preview','inspection',...(a.type==='gift'?['acknowledged receipt reveal']:[]),'reduced-motion still','unavailable/retired'],motion:a.motion,variants,sources:provenance.sources||[],credits:provenance.credits||provenance.credit,rights:provenance.rights,newlyDrawn:provenance.newlyDrawn, ...(provenance.constructionBasis?{constructionBasis:provenance.constructionBasis}:{})};
 record.credits=record.credits||record.credit||'Original VOIDLINE vector drawing';record.newlyDrawn=record.newlyDrawn||[...a.motion.layers.map(layer=>layer.name),'optical miniature','silhouette'];
 manifest.items.push(record);client[id]={id,reference,name:a.name,type:a.type,series:a.series,material:a.material,alt:a.alt,mini:a.mini,motion:a.motion,cardURL:variants.card.url,detailURL:variants.detail.url,silhouetteURL:variants.silhouette.url};
}
await writeFile(new URL('manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');
const compiled=await build({stdin:{contents:`import {installArt} from './src/art/client.mjs';installArt(${JSON.stringify(client)},${artVersion});`,resolveDir:root.pathname,sourcefile:'collectible-art-entry.mjs',loader:'js'},bundle:true,format:'iife',platform:'browser',target:'es2022',write:false,minify:true,legalComments:'none'});
await writeFile(new URL('../dist/collectible-art.js',import.meta.url),compiled.outputFiles[0].text);
console.log(`Built edition${artVersion}: ${manifest.counts.decorations} decorations, ${manifest.counts.gifts} gifts, ${manifest.counts.earned} earned awards; ${manifest.items.length*4} lazy SVG variants; ${compiled.outputFiles[0].contents.length} startup bytes${partial?' (partial quality-gate build)':''}.`);
