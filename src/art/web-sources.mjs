/** Public provenance only. Runtime credentials and original research downloads
 * never enter this registry. The fixed production files are checked at build. */
import {webBadges} from './web-badges.mjs';
import {webObjectBadges} from './web-badges-objects.mjs';
import {webGiftsA} from './web-gifts-a.mjs';
import {webGiftsB} from './web-gifts-b.mjs';
const groups=[webBadges,webObjectBadges,webGiftsA,webGiftsB],seen=new Set(),entries=[];
for(const group of groups)for(const [id,source]of Object.entries(group)){
 if(seen.has(id))throw Error('Duplicate web artwork identity '+id);seen.add(id);
 entries.push([id,Object.freeze({...source,id})]);
}
export const webSources=Object.freeze(Object.fromEntries(entries));
