import {opticalEmblems} from './profile-emblems.mjs';
import {originals,earned} from './badges-originals.mjs';
import {culture} from './badges-culture.mjs';
import {gifts} from './gifts.mjs';
import {extras} from './badges-extra.mjs';
import {genre} from './badges-genre.mjs';
import {telegramCharacters} from './telegram-characters.mjs';
import {telegramObjects} from './telegram-objects.mjs';
import {webSources} from './web-sources.mjs';
import {collectibleModels,collectibleFamilies} from '../collectibles/models.mjs';
import {curatedGifts} from './curated-gifts.mjs';
import {plushModels} from './plush-models.mjs';
import {tapeModels} from './tape-models.mjs';
import {tankModels} from './tank-models.mjs';
import {keycapModels} from './keycap-models.mjs';
import {cartridgeEditions} from './cartridge-editions.mjs';
import {terminalEditions} from './terminal-editions.mjs';
import {volumeEditions} from './volume-editions.mjs';
import {cartridgeDesigns} from '../collectibles/cartridge-designs.mjs';
import {weatherCartridges} from './cartridges-weather.mjs';
import {signalCartridges} from './cartridges-signal.mjs';
import {pearlCartridges} from './cartridges-pearl.mjs';
import {studioObjects} from './studio-objects.mjs';
import studioMinis from './studio-miniatures.json' with {type:'json'};
import {createWebArt,assertSafeWebSVG} from './web-art.mjs';
import {materialDefs,artVersion} from './materials.mjs';
const legacy={...originals,...culture,...extras,...genre,...gifts,...telegramCharacters,...telegramObjects,...earned,
 'coin-blockchain':{name:'Blockchain',type:'badge',series:'Chain Signals',material:'Web-sourced artwork',alt:'A web-sourced blockchain mark.'},
 'coin-ledger':{name:'Ledger',type:'badge',series:'Chain Signals',material:'Web-sourced artwork',alt:'A web-sourced Ledger hardware-wallet mark.'}};
// Generate the old fingerprinted bytes too. Open clients can still fetch the
// precise artwork their original choreography and sanitizer expect.
const previousCatalog=Object.fromEntries(Object.entries(legacy).map(([id,a])=>[id,webSources[id]?createWebArt(a,webSources[id]):a]));
export const studioIds=Object.freeze(Object.keys(studioObjects));
const expansion=Object.fromEntries(Object.entries({...tapeModels,...tankModels}).filter(([id])=>Object.hasOwn(collectibleModels,id)));
const modelArtwork={...plushModels,...keycapModels,...expansion,...cartridgeEditions,...terminalEditions,...volumeEditions};
const originalsByModel=Object.fromEntries(Object.entries(modelArtwork).map(([id,art])=>{
 const model=collectibleModels[id];
 if(!model)throw Error('Unknown model master '+id);
 return [id,{...art,...model,type:'gift',series:collectibleFamilies[model.familyId].name,
  edition:model.artRevision,assetKind:'layered-svg',storyboard:art.storyboard||art.story}];
}));
export const studioCatalog=Object.freeze({...previousCatalog,...Object.fromEntries(studioIds.map(id=>[id,
  createWebArt(legacy[id],webSources[id],{...studioObjects[id],miniPath:studioMinis[id]})
]))});
export const curatedIds=Object.freeze(Object.keys(curatedGifts));
const revised=Object.fromEntries(curatedIds.map(id=>{
 const prior=studioCatalog[id],art=curatedGifts[id];
 if(!prior||prior.type!=='gift'||art.name&&art.name!==prior.name)throw Error('Invalid legacy replacement '+id);
 return [id,{...art,name:prior.name,type:'gift',series:prior.series,assetKind:'layered-svg',edition:art.artRevision,
  acquisitionPolicy:'legacy-free'}];
}));
const cartridgeMasters={...weatherCartridges,...signalCartridges,...pearlCartridges};
const cartridges=Object.fromEntries(Object.entries(cartridgeDesigns).map(([id,design])=>{
 const master=cartridgeMasters[id];
 if(!master)throw Error('Missing cartridge artwork '+id);
 return [id,{...master,...design,type:'gift',assetKind:'layered-svg',edition:design.artRevision}];
}));
export const emblemIds=Object.freeze(Object.keys(opticalEmblems));
const emblems=Object.fromEntries(emblemIds.map(id=>{
 const {name,type,series}=studioCatalog[id];
 return [id,{...opticalEmblems[id],name,type,series,acquisitionPolicy:type==='earned'?'earned':'legacy-free'}];
}));
const originalFinish=Object.fromEntries(Object.entries(originalsByModel).filter(([,art])=>art.historicalMotion).map(([id,art])=>
 [id,{...art,motion:art.historicalMotion,body:(p,variant)=>art.body(p,variant,false)}]));
export const priorModelArtSVG=(id,variant)=>Object.hasOwn(originalFinish,id)?artSVG(id,variant,originalFinish):null;
export const artCatalog=Object.freeze({...studioCatalog,...emblems,...revised,...originalsByModel,...cartridges});
const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export {artVersion};
export function artSVG(id,variant='detail',registry=artCatalog){
 const item=registry[id];if(!item)throw Error('Unknown artwork '+id);
 if(!['mini','card','detail','silhouette'].includes(variant))throw Error('Invalid art variant');
 const prefix='va'+artVersion+'-'+id+'-'+variant,small=variant==='mini',silhouette=variant==='silhouette';
 const credits=item.sourceArt?xml([item.sourceArt.creator,item.sourceArt.license,item.sourceArt.sourceURL,item.sourceArt.licenseURL,...(item.sourceArt.components||[]).flatMap(c=>[c.creator,c.license,c.sourceURL,c.licenseURL])].filter(Boolean).join(' · ')):'';
 const content=small?item.mini:silhouette?`<g fill="#10161d" fill-rule="evenodd">${typeof item.silhouette==='function'?item.silhouette(prefix):item.silhouette}</g>`:(item.sourceArt||item.assetKind==='layered-svg'?item.body(prefix,variant):`<defs>${materialDefs(prefix)}</defs>${item.body(prefix)}`);
 if(item.sourceArt)assertSafeWebSVG(content,item.sourceArt);
 else if(/<(?:script|foreignObject|image|iframe|animate|set)\b|\bon\w+\s*=|(?:href|src)\s*=/i.test(content))throw Error('Unsafe/external SVG content '+id);
 const trackData=item.assetKind==='layered-svg'&&variant==='detail'?' data-motion="'+xml(JSON.stringify(item.motion))+'"':'';
 return `<svg${trackData} xmlns="http://www.w3.org/2000/svg" width="${small?24:256}" height="${small?24:256}" viewBox="0 0 ${small?24:256} ${small?24:256}" data-vc-object="${xml(id)}" data-art-version="${artVersion}" data-variant="${variant}" role="img" aria-labelledby="${prefix}-title"><title id="${prefix}-title">${xml(item.alt)}</title>${credits?`<desc>${credits}</desc>`:''}${content}</svg>`;
}

export const priorArtSVG=(id,variant)=>artSVG(id,variant,previousCatalog);

export const published32ArtSVG=(id,variant)=>artSVG(id,variant,studioCatalog);
