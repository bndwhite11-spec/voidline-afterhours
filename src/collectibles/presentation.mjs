/** Catalog identity shared by account and receipt projections. Keep this module independent of the Worker. */
import {collectibleModels,collectibleFamilies} from './models.mjs';
import {legacyPresentations} from './legacy-presentations.mjs';
import {studioObjects} from '../art/studio-objects.mjs';
import {webSources} from '../art/web-sources.mjs';

export const models=Object.values(collectibleModels);
export const familyName=id=>collectibleFamilies[id]?.name;
export const legacyOnlySQL='catalog_id NOT IN (SELECT value FROM json_each(?))';
export const capsuleModelIdsJSON=JSON.stringify(models.map(model=>model.id));

function legacyArt(id){
 if(legacyPresentations[id])return legacyPresentations[id];
 const studio=studioObjects[id];
 if(studio)return {alt:studio.alt,description:studio.alt,material:studio.material,artRevision:'studio-01'};
 const web=webSources[id];
 if(web)return {alt:web.alt,description:web.description||web.alt,material:web.material||'Web-sourced artwork'};
}

export function collectibleDisplay(id,legacy){
 const model=collectibleModels[id];
 if(model)return {
  id,name:model.name,modelName:model.name,familyId:model.familyId,familyName:familyName(model.familyId),
  tier:model.tier,description:model.description,material:model.material,alt:model.alt,
  backdrop:model.backdrop,motif:model.motif,artRevision:model.artRevision,acquisitionPolicy:model.acquisitionPolicy
 };
 const artwork=legacyArt(id),name=typeof legacy==='string'?legacy:legacy?.name;
 return {
  id,...artwork,...(legacy?.description?{description:legacy.description}:{}),
  name:name||artwork?.name||'Unavailable collectible',acquisitionPolicy:(name||artwork)?'legacy-free':'unavailable'
 };
}

export function capsuleCatalogItems(){
 return models.map(model=>({
  ...collectibleDisplay(model.id),type:'gift',category:'gifts',series:familyName(model.familyId),
  finish:model.material,price:0,acquisition:'Earn a Choice Capsule or receive an existing copy by transfer.'
 }));
}
