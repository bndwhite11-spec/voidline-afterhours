/** Private organization of existing, currently owned gift instances.
 * A group is neither ownership, profile showcase nor a transferable asset. */
import {acquisitionTime} from './collectible-inventory.mjs';
import {authenticate,validateSessionMutation,authRateLimit,AuthError} from './auth.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,MAX_GROUPS=24,LIMIT=50;
const databaseNow="CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)";
function actor(user){return {sql:`EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND a.id=? AND s.revoked_at IS NULL AND s.expires_at>${databaseNow} AND a.account_status='active' AND a.onboarding_complete=1)`,args:[user.sessionId,user.id]};}
async function currentActor(db,user){const a=actor(user);need(await q(db,'SELECT 1 AS allowed WHERE '+a.sql,...a.args).first(),409,'account_changed','Your account or session changed. Sign in again before changing a collection.');}
function groupName(value){need(typeof value==='string'&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value),400,'invalid_name','Use a readable collection name.');const name=value.trim().replace(/\s+/g,' ');need([...name].length>=1&&[...name].length<=40,400,'invalid_name','Use a collection name between 1 and 40 characters.');const normalized=name.normalize('NFKC').toLowerCase();need([...normalized].length<=80,400,'invalid_name','Use a shorter collection name.');return {name,normalized};}
const identifier=value=>{need(typeof value==='string'&&value.length>0&&value.length<=255&&!/[\u0000-\u001f\u007f]/.test(value),400,'invalid_instance','Choose an owned gift instance.');return value;};
const expected=value=>{need(Number.isSafeInteger(value)&&value>=0,400,'invalid_revision','Reload the collection before changing it.');return value;};
function offset(url){const value=Number(url.searchParams.get('offset')||0);need(Number.isSafeInteger(value)&&value>=0&&value<=100000,400,'invalid_page','Choose a valid collection page.');return value;}
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON collection request.');const reader=request.body?.getReader();need(reader,400,'invalid_body','A collection request is required.');const chunks=[];let size=0;
 for(;;){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>4096){await reader.cancel();throw new AuthError(413,'body_too_large','This collection request is too large.');}chunks.push(item.value);}
 const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length;}let value;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The collection request could not be read.');}need(value&&typeof value==='object'&&!Array.isArray(value),400,'invalid_body','Use a collection request object.');return value;
}
const project=row=>({id:row.id,name:row.name,revision:Number(row.revision),count:Number(row.count||0),createdAt:row.created_at,updatedAt:row.updated_at,...('included'in row?{included:!!row.included}:{})});
async function collection(db,user,id){need(typeof id==='string'&&UUID.test(id),404,'collection_unavailable','This private collection is unavailable.');const row=await q(db,'SELECT c.*,(SELECT COUNT(*) FROM gift_collection_items m JOIN gift_instances i ON i.id=m.instance_id AND i.owner_id=c.owner_id WHERE m.collection_id=c.id) AS count FROM gift_collections c WHERE c.id=? AND c.owner_id=?',id,user.id).first();need(row,404,'collection_unavailable','This private collection is unavailable.');return row;}
async function ownedInstance(db,user,id){const row=await q(db,'SELECT id,catalog_id,created_at,pending_transfer_id FROM gift_instances WHERE id=? AND owner_id=?',identifier(id),user.id).first();need(row,404,'instance_unavailable','This owned gift is unavailable.');return row;}
export function createGiftCollectionsService({now=()=>Date.now()}={}){
 return async function handleGiftCollectionsRequest(request,env){
  try{
   const url=new URL(request.url),base='/api/gift-collections';need(url.pathname===base||url.pathname.startsWith(base+'/'),404,'not_found','This collection action is unavailable.');need(['GET','POST'].includes(request.method),405,'method_not_allowed','Use a supported collection action.');const path=url.pathname.slice(base.length).split('/').filter(Boolean);
   const user=await authenticate(request,env),db=env.DB,time=now();
   if(request.method==='GET'){
    if(path.length===0){
     const instanceId=url.searchParams.get('instance'),instance=instanceId?await ownedInstance(db,user,instanceId):null;
     const rows=(await q(db,`SELECT c.*,(SELECT COUNT(*) FROM gift_collection_items m JOIN gift_instances i ON i.id=m.instance_id AND i.owner_id=c.owner_id WHERE m.collection_id=c.id) AS count,EXISTS(SELECT 1 FROM gift_collection_items m JOIN gift_instances i ON i.id=m.instance_id AND i.owner_id=c.owner_id WHERE m.collection_id=c.id AND m.instance_id=?) AS included FROM gift_collections c WHERE c.owner_id=? ORDER BY c.created_at,c.id LIMIT ?`,instance?.id||'',user.id,MAX_GROUPS).all()).results;
     await currentActor(db,user);return json({accountId:user.id,collections:rows.map(project),maxCollections:MAX_GROUPS,private:true,...(instance?{instance:{id:instance.id,catalogId:instance.catalog_id}}:{})});
    }
    if(path.length===1&&path[0]==='inventory'){
     const groupId=url.searchParams.get('collection'),group=groupId?await collection(db,user,groupId):null,pageOffset=offset(url),total=(await q(db,'SELECT COUNT(*) AS n FROM gift_instances WHERE owner_id=?',user.id).first()).n;
     const rows=(await q(db,`SELECT i.id,i.catalog_id,${acquisitionTime()} AS acquired_at,i.pending_transfer_id,EXISTS(SELECT 1 FROM gift_collection_items m WHERE m.instance_id=i.id AND m.collection_id=?) AS included FROM gift_instances i WHERE i.owner_id=? ORDER BY acquired_at DESC,i.id LIMIT ? OFFSET ?`,group?.id||'',user.id,LIMIT,pageOffset).all()).results;
     await currentActor(db,user);return json({accountId:user.id,instances:rows.map(r=>({id:r.id,catalogId:r.catalog_id,createdAt:r.acquired_at,pendingTransfer:!!r.pending_transfer_id,included:!!r.included})),...(group?{collection:project(group)}:{}),page:{offset:pageOffset,limit:LIMIT,total,hasMore:pageOffset+LIMIT<total}});
    }
    need(path.length===1&&UUID.test(path[0]),404,'not_found','This collection page is unavailable.');const group=await collection(db,user,path[0]),pageOffset=offset(url);
    const rows=(await q(db,`SELECT i.id,i.catalog_id,${acquisitionTime()} AS acquired_at,i.pending_transfer_id,m.added_at FROM gift_collection_items m JOIN gift_instances i ON i.id=m.instance_id AND i.owner_id=? WHERE m.collection_id=? ORDER BY m.position,m.added_at,i.id LIMIT ? OFFSET ?`,user.id,group.id,LIMIT,pageOffset).all()).results;
    await currentActor(db,user);return json({accountId:user.id,collection:project(group),instances:rows.map(r=>({id:r.id,catalogId:r.catalog_id,createdAt:r.acquired_at,addedAt:r.added_at,pendingTransfer:!!r.pending_transfer_id,included:true})),page:{offset:pageOffset,limit:LIMIT,total:group.count,hasMore:pageOffset+LIMIT<group.count}});
   }
   const body=await bodyJSON(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'gift-collections',120,time,user.id);const active=actor(user);
   if(path.length===0){
    const named=groupName(body.name);need(typeof body.clientId==='string'&&UUID.test(body.clientId),400,'invalid_client_id','Use the same collection request ID when retrying.');
    const previous=await q(db,'SELECT * FROM gift_collections WHERE owner_id=? AND client_id=?',user.id,body.clientId).first();if(previous){need(previous.normalized_name===named.normalized,409,'collection_request_conflict','This request already created another collection name. Reload your collections.');await currentActor(db,user);return json({created:false,retried:true,collection:project(await collection(db,user,previous.id))});}
    const id=crypto.randomUUID(),result=await q(db,`INSERT OR IGNORE INTO gift_collections(id,owner_id,name,normalized_name,client_id,revision,change_marker,created_at,updated_at) SELECT ?,?,?,?,?,0,'',?,? WHERE ${active.sql} AND (SELECT COUNT(*) FROM gift_collections WHERE owner_id=?)<?`,id,user.id,named.name,named.normalized,body.clientId,time,time,...active.args,user.id,MAX_GROUPS).run();
    const saved=await q(db,'SELECT * FROM gift_collections WHERE owner_id=? AND client_id=?',user.id,body.clientId).first();await currentActor(db,user);
    if(!saved){const duplicate=await q(db,'SELECT 1 AS found FROM gift_collections WHERE owner_id=? AND normalized_name=?',user.id,named.normalized).first();need(!duplicate,409,'collection_name_taken','You already have a collection with that name.');const count=(await q(db,'SELECT COUNT(*) AS n FROM gift_collections WHERE owner_id=?',user.id).first()).n;need(count<MAX_GROUPS,409,'collection_limit','You can create up to 24 named collections.');throw new AuthError(409,'collection_changed','The collection could not be created. Retry the same request.');}
    need(saved.normalized_name===named.normalized,409,'collection_request_conflict','This request already belongs to another collection name.');return json({created:result.meta?.changes>0,collection:project(await collection(db,user,saved.id))},result.meta?.changes>0?201:200);
   }
   need(path.length===2&&UUID.test(path[0]),404,'not_found','This collection action is unavailable.');const group=await collection(db,user,path[0]);
   if(path[1]==='rename'){
    const named=groupName(body.name),revision=expected(body.expectedRevision);if(named.normalized===group.normalized_name&&named.name===group.name){await currentActor(db,user);return json({saved:true,unchanged:true,collection:project(group)});}
    let result;try{result=await q(db,`UPDATE gift_collections SET name=?,normalized_name=?,revision=revision+1,change_marker=?,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND ${active.sql}`,named.name,named.normalized,crypto.randomUUID(),time,group.id,user.id,revision,...active.args).run();}catch(error){if(/unique/i.test(error.message||''))throw new AuthError(409,'collection_name_taken','You already have a collection with that name.');throw error;}
    need(result.meta?.changes>0,409,'collection_changed','This collection changed elsewhere. Reload it before renaming.');return json({saved:true,collection:project(await collection(db,user,group.id))});
   }
   if(path[1]==='delete'){
    const revision=expected(body.expectedRevision),result=await q(db,`DELETE FROM gift_collections WHERE id=? AND owner_id=? AND revision=? AND ${active.sql}`,group.id,user.id,revision,...active.args).run();need(result.meta?.changes>0,409,'collection_changed','This collection changed elsewhere. Reload it before removing the group.');return json({deleted:true,giftsPreserved:true});
   }
   if(path[1]==='items'){
    need(typeof body.included==='boolean',400,'invalid_membership','Choose whether to include this gift.');const instance=await ownedInstance(db,user,body.instanceId),included=!!await q(db,'SELECT 1 AS found FROM gift_collection_items WHERE collection_id=? AND instance_id=?',group.id,instance.id).first();
    if(included===body.included){await currentActor(db,user);return json({saved:true,unchanged:true,collection:project(await collection(db,user,group.id)),instanceId:instance.id,included});}
    const revision=expected(body.expectedRevision),marker=crypto.randomUUID();
    const writes=[q(db,`UPDATE gift_collections SET revision=revision+1,change_marker=?,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND ${active.sql} AND EXISTS(SELECT 1 FROM gift_instances WHERE id=? AND owner_id=?)`,marker,time,group.id,user.id,revision,...active.args,instance.id,user.id)];
    const gate='EXISTS(SELECT 1 FROM gift_collections WHERE id=? AND owner_id=? AND change_marker=?)',gateArgs=[group.id,user.id,marker];
    writes.push(body.included?q(db,`INSERT OR IGNORE INTO gift_collection_items(collection_id,instance_id,position,added_at) SELECT ?,?,0,? WHERE ${gate} AND EXISTS(SELECT 1 FROM gift_instances WHERE id=? AND owner_id=?)`,group.id,instance.id,time,...gateArgs,instance.id,user.id):q(db,`DELETE FROM gift_collection_items WHERE collection_id=? AND instance_id=? AND ${gate}`,group.id,instance.id,...gateArgs));
    const results=await db.batch(writes);need(results[0]?.meta?.changes>0,409,'collection_changed','The collection or gift ownership changed. Reload before trying again.');return json({saved:true,collection:project(await collection(db,user,group.id)),instanceId:instance.id,included:body.included});
   }
   throw new AuthError(404,'not_found','This collection action is unavailable.');
  }catch(error){return json({error:{code:error instanceof AuthError?error.code:'collections_unavailable',message:error instanceof AuthError?error.message:'Your named collections could not be updated. Please retry.'}},error instanceof AuthError?error.status:503);}
 };
}
export const handleGiftCollectionsRequest=createGiftCollectionsService();
