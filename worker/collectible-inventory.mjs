/** Account projections. Catalog identity, ownership period and private history are separate. */
import {collectibleFamilies} from '../src/collectibles/models.mjs';
import {models,familyName,legacyOnlySQL,capsuleModelIdsJSON,collectibleDisplay} from '../src/collectibles/presentation.mjs';
import {AuthError} from './auth.mjs';

const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const acceptedTransfer=`t.id=(SELECT last.id FROM gift_transfers last WHERE last.instance_id=i.id AND last.state='accepted' AND last.recipient_id=i.owner_id ORDER BY last.handled_at DESC,last.rowid DESC LIMIT 1)`;
export function acquisitionTime(alias='i'){
 return `COALESCE(${alias}.acquired_at,(SELECT MAX(h.handled_at) FROM gift_transfers h WHERE h.instance_id=${alias}.id AND h.recipient_id=${alias}.owner_id AND h.state='accepted'),${alias}.created_at)`;
}
export function acquisitionKind(alias='i'){
 return `CASE WHEN ${alias}.ownership_revision>0 OR EXISTS(SELECT 1 FROM gift_transfers h WHERE h.instance_id=${alias}.id AND h.recipient_id=${alias}.owner_id AND h.state='accepted') THEN 'transfer' ELSE ${alias}.origin_kind END`;
}
const periodTime=acquisitionTime();
const senderVisible=`s.account_status='active' AND s.username IS NOT NULL AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE(b.blocker_id=i.owner_id AND b.blocked_id=s.id)OR(b.blocker_id=s.id AND b.blocked_id=i.owner_id))`;
export const ownInstanceSelect=`SELECT i.id,i.catalog_id,CASE WHEN i.ownership_revision>0 OR t.id IS NOT NULL THEN 'transfer' ELSE i.origin_kind END AS origin_kind,${periodTime} AS created_at,${periodTime} AS acquired_at,i.ownership_revision,i.pending_transfer_id,i.arrival_acknowledged_at,t.id AS received_transfer_id,CASE WHEN ${senderVisible} THEN s.username ELSE NULL END AS sender_username,CASE WHEN ${senderVisible} THEN s.display_name ELSE NULL END AS sender_name FROM gift_instances i LEFT JOIN gift_transfers t ON ${acceptedTransfer} LEFT JOIN cosmetic_gifts g ON i.ownership_revision=0 AND t.id IS NULL AND g.id=i.origin_gift_id AND g.recipient_id=i.owner_id LEFT JOIN live_accounts s ON s.id=COALESCE(t.sender_id,g.sender_id)`;
export function privateInstance(row,designs){
 const model=collectibleDisplay(row.catalog_id,designs.get(row.catalog_id));
 return {...row,arrival_acknowledged_at:row.arrival_acknowledged_at===-1?null:row.arrival_acknowledged_at,is_new:row.arrival_acknowledged_at===null,name:model.name,model,senderDisclosureAvailable:!!row.sender_username};
}

export async function inventorySummary(db,userId){
 const [counts,discovery]=await Promise.all([
  q(db,`SELECT catalog_id,COUNT(*) AS copies,MIN(${periodTime}) AS first_owned_at,SUM(arrival_acknowledged_at IS NULL) AS unseen FROM gift_instances i WHERE owner_id=? GROUP BY catalog_id`,userId).all(),
  q(db,'SELECT model_id FROM collectible_discovery_history WHERE account_id=? ORDER BY model_id',userId).all()
 ]);
 const discoveredModelIds=discovery.results.map(r=>r.model_id),known=new Set(discoveredModelIds);
 const modelCounts=Object.fromEntries(counts.results.map(r=>[r.catalog_id,r.copies]));
 const totalCopies=counts.results.reduce((sum,r)=>sum+r.copies,0),newArrivals=counts.results.reduce((sum,r)=>sum+r.unseen,0);
 const families=Object.values(collectibleFamilies).map(({id,modelIds})=>({familyId:id,ownedModels:modelIds.filter(m=>modelCounts[m]>0).length,discoveredModels:modelIds.filter(m=>known.has(m)).length,totalModels:modelIds.length,copies:modelIds.reduce((sum,m)=>sum+(modelCounts[m]||0),0)}));
 return {designs:counts.results.map(r=>({cosmetic_id:r.catalog_id,claimed_at:r.first_owned_at})),summary:{totalCopies,modelCounts,discoveredModelIds,newArrivals,unacknowledgedCount:newArrivals,duplicateCopies:totalCopies-counts.results.length,families}};
}
const badFilter=()=>{throw new AuthError(400,'invalid_filter','Choose an available collection filter.');};
export function ownerFilters(params,ownerId){
 const where=['i.owner_id=?'],args=[ownerId],family=params.get('familyId'),tier=params.get('tier'),catalogId=params.get('catalogId');
 if(family&&!collectibleFamilies[family]&&family!=='legacy')badFilter();
 if(tier&&!models.some(m=>m.tier.toLowerCase()===tier.toLowerCase()))badFilter();
 if(catalogId){where.push('i.catalog_id=?');args.push(catalogId);}
 if(family==='legacy'){where.push('i.'+legacyOnlySQL);args.push(capsuleModelIdsJSON);}
 if(tier||family&&family!=='legacy'){
  const ids=models.filter(m=>(!family||family===m.familyId)&&(!tier||tier.toLowerCase()===m.tier.toLowerCase())).map(m=>m.id);
  where.push('i.catalog_id IN (SELECT value FROM json_each(?))');args.push(JSON.stringify(ids));
 }
 if(params.get('duplicate')==='1')where.push(`EXISTS(SELECT 1 FROM gift_instances other WHERE other.owner_id=i.owner_id AND other.catalog_id=i.catalog_id AND (${acquisitionTime('other')},other.id)<(${periodTime},i.id))`);
 if(params.get('arrival')==='1')where.push('i.arrival_acknowledged_at IS NULL');
 const sort=params.get('sort')||'recent',orderArgs=[];
 let order;
 if(sort==='oldest'||sort==='recent') order=`${periodTime} ${sort==='oldest'?'ASC':'DESC'}, i.id`;
 else if(sort==='family'||sort==='rarity'){
  const ranking=Object.fromEntries(models.map(m=>[m.id,sort==='family'?familyName(m.familyId)+' '+m.name:['common','uncommon','rare','epic','legendary','mythic'].indexOf(m.tier.toLowerCase())]));
  const whereDefault=sort==='family'?"'~legacy'":'-1';
  order=`COALESCE((SELECT value FROM json_each(?) WHERE key=i.catalog_id),${whereDefault}) ${sort==='family'?'ASC':'DESC'},i.catalog_id,${periodTime} DESC,i.id`;orderArgs.push(JSON.stringify(ranking));
 }else badFilter();
 return {where:where.join(' AND '),args,order,orderArgs};
}

export async function transferReceipt(db,row,userId,catalog){
 if(!row||row.sender_id!==userId&&row.recipient_id!==userId)throw new AuthError(404,'transfer_unavailable','This transfer is unavailable.');
 const {model_snapshot,client_id,mine,...shown}=row;
 const instance=Object.hasOwn(row,'mine')?row:await q(db,'SELECT catalog_id,owner_id=? AS mine FROM gift_instances WHERE id=?',userId,row.instance_id).first();
 const snapshot=model_snapshot?JSON.parse(model_snapshot):{id:instance.catalog_id,name:catalog.get(instance.catalog_id)?.name||'Unavailable collectible'};
 return {...shown,catalog_id:snapshot.id,model:snapshot,modelSnapshotAvailable:!!model_snapshot,currentlyOwned:!!instance?.mine};
}
