import {originals,earned} from './badges-originals.mjs';
import {culture} from './badges-culture.mjs';
import {gifts} from './gifts.mjs';
import {extras} from './badges-extra.mjs';
import {genre} from './badges-genre.mjs';
import {telegramCharacters} from './telegram-characters.mjs';
import {telegramObjects} from './telegram-objects.mjs';
import {webSources} from './web-sources.mjs';
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
export const artCatalog=Object.freeze({...previousCatalog,...Object.fromEntries(studioIds.map(id=>[id,
  createWebArt(legacy[id],webSources[id],{...studioObjects[id],miniPath:studioMinis[id]})
]))});
const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export {artVersion};
export function artSVG(id,variant='detail',registry=artCatalog){
 const item=registry[id];if(!item)throw Error('Unknown artwork '+id);
 if(!['mini','card','detail','silhouette'].includes(variant))throw Error('Invalid art variant');
 const prefix='va'+artVersion+'-'+id+'-'+variant,small=variant==='mini',silhouette=variant==='silhouette';
 const credits=item.sourceArt?xml([item.sourceArt.creator,item.sourceArt.license,item.sourceArt.sourceURL,item.sourceArt.licenseURL,...(item.sourceArt.components||[]).flatMap(c=>[c.creator,c.license,c.sourceURL,c.licenseURL])].filter(Boolean).join(' · ')):'';
 const content=small?item.mini:silhouette?`<g fill="#10161d" fill-rule="evenodd">${typeof item.silhouette==='function'?item.silhouette(prefix):item.silhouette}</g>`:(item.sourceArt?item.body(prefix,variant):`<defs>${materialDefs(prefix)}</defs>${item.body(prefix)}`);
 if(item.sourceArt)assertSafeWebSVG(content,item.sourceArt);
 else if(/<(?:script|foreignObject|image|iframe|animate|set)\b|\bon\w+\s*=|(?:href|src)\s*=/i.test(content))throw Error('Unsafe/external SVG content '+id);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${small?24:256}" height="${small?24:256}" viewBox="0 0 ${small?24:256} ${small?24:256}" data-vc-object="${xml(id)}" data-art-version="${artVersion}" data-variant="${variant}" role="img" aria-labelledby="${prefix}-title"><title id="${prefix}-title">${xml(item.alt)}</title>${credits?`<desc>${credits}</desc>`:''}${content}</svg>`;
}

export const priorArtSVG=(id,variant)=>artSVG(id,variant,previousCatalog);
