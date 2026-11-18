import {originals,earned} from './badges-originals.mjs';
import {culture} from './badges-culture.mjs';
import {gifts} from './gifts.mjs';
import {extras} from './badges-extra.mjs';
import {genre} from './badges-genre.mjs';
import {telegramCharacters} from './telegram-characters.mjs';
import {telegramObjects} from './telegram-objects.mjs';
import {materialDefs,artVersion} from './materials.mjs';
export const artCatalog=Object.freeze({...originals,...culture,...extras,...genre,...gifts,...telegramCharacters,...telegramObjects,...earned});
const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export {artVersion};
export function artSVG(id,variant='detail'){
 const item=artCatalog[id];if(!item)throw Error('Unknown artwork '+id);
 if(!['mini','card','detail','silhouette'].includes(variant))throw Error('Invalid art variant');
 const prefix='va3-'+id+'-'+variant,small=variant==='mini',silhouette=variant==='silhouette';
 const content=small?item.mini:silhouette?`<g fill="#10161d" fill-rule="evenodd">${item.silhouette}</g>`:`<defs>${materialDefs(prefix)}</defs>${item.body(prefix)}`;
 if(/<(?:script|foreignObject|image|iframe|animate|set)\b|\bon\w+\s*=|(?:href|src)\s*=/i.test(content))throw Error('Unsafe/external SVG content '+id);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${small?24:256}" height="${small?24:256}" viewBox="0 0 ${small?24:256} ${small?24:256}" data-vc-object="${xml(id)}" data-art-version="${artVersion}" data-variant="${variant}" role="img" aria-labelledby="${prefix}-title"><title id="${prefix}-title">${xml(item.alt)}</title>${content}</svg>`;
}
