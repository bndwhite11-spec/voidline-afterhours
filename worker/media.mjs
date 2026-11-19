/** Private R2 storage. Standard uploads are service-readable; never a Matrix transport. */
import {authenticate,validateSessionMutation,authRateLimit,AuthError} from './auth.mjs';
import {relationship,mayView} from './cosmetics.mjs';
import {inspectImage,safeFilename,MEDIA_LIMIT} from '../src/media-validation.mjs';
import {prepareProfileGif} from '../src/profile-gif.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const HEX=/^[a-f0-9-]{36}$/i,STAGE_TTL=24*60*60*1000;
const sessionGuard=(user,now)=>({sql:"EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active' AND a.onboarding_complete=1)",args:[user.sessionId,user.id,now]});
export function mediaAsset(row){if(!row)return null;const url='/api/media/'+encodeURIComponent(row.id),isGif=row.content_type==='image/gif';return {id:row.id,kind:row.kind,contentType:row.content_type,filename:row.filename,bytes:row.bytes,width:row.width,height:row.height,url,...(isGif?{isGif:true,posterUrl:url,animationUrl:url+'/animation'}:{})};}
const posterKey=key=>key+'/poster.png';
export async function profileMedia(db,id,kind){return mediaAsset(await q(db,"SELECT * FROM media_assets WHERE id=? AND kind=? AND state='ready'",id,kind).first());}
/** Same avatar gate as the media GET; native group membership adds no profile access. */
export async function profileAvatarMediaForViewer(db,viewerId,accountIds){
 const ids=[...new Set(accountIds.filter(id=>typeof id==='string'))],result=new Map();
 for(let at=0;at<ids.length;at+=80){const batch=ids.slice(at,at+80),rows=(await q(db,`SELECT a.id AS account_id,f.id,f.content_type FROM live_accounts a JOIN profile_preferences p ON p.account_id=a.id JOIN media_assets f ON f.id=p.avatar_media_id AND f.owner_id=a.id AND f.kind='avatar' AND f.state='ready' WHERE a.id IN(${batch.map(()=>'?').join(',')}) AND a.account_status='active' AND a.username IS NOT NULL AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE(b.blocker_id=? AND b.blocked_id=a.id)OR(b.blocker_id=a.id AND b.blocked_id=?)) AND(a.id=? OR p.details_visibility='public' OR EXISTS(SELECT 1 FROM social_requests r WHERE r.state='accepted' AND((r.sender_id=? AND r.recipient_id=a.id)OR(r.recipient_id=? AND r.sender_id=a.id))) OR EXISTS(SELECT 1 FROM live_memberships mine JOIN live_memberships theirs ON theirs.community_id=mine.community_id WHERE mine.account_id=? AND theirs.account_id=a.id))`,...batch,viewerId,viewerId,viewerId,viewerId,viewerId,viewerId).all()).results;for(const row of rows){const url='/api/media/'+row.id;result.set(row.account_id,{id:row.id,url,...(row.content_type==='image/gif'?{isGif:true,posterUrl:url,animationUrl:url+'/animation'}:{})});}}
 return result;
}
/** Include in the same account-delete batch, using its credential-marker guard. */
export function accountMediaDeletionStatements(db,accountId,guardSql,guardArgs,now){
 const eligible="owner_id=? AND (kind IN('avatar','banner') OR state IN('uploading','staged'))";
 return [q(db,`INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,attempts,created_at) SELECT 'account-delete:'||id,object_key,owner_id,?,0,? FROM media_assets WHERE ${eligible} AND (${guardSql})`,now,now,accountId,...guardArgs),q(db,`UPDATE media_assets SET state='deleting',updated_at=? WHERE ${eligible} AND (${guardSql})`,now,accountId,...guardArgs)];
}
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON upload request.');
 const reader=request.body?.getReader();need(reader,400,'invalid_body','An upload is required.');const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>12*1024*1024){await reader.cancel();throw new AuthError(413,'upload_too_large','Choose a file smaller than 8 MiB.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}let result;
 try{result=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The upload request could not be read.');}
 need(result&&typeof result==='object'&&!Array.isArray(result),400,'invalid_body','Use an upload object.');return result;
}
function decode(body){
 const data=body.base64;need(typeof data==='string'&&data.length>0&&data.length<=Math.ceil(MEDIA_LIMIT/3)*4&&data.length%4===0&&!/[^A-Za-z0-9+/=]/.test(data),400,'invalid_upload','The file encoding is invalid or too large.');
 let raw;try{raw=atob(data);}catch{throw new AuthError(400,'invalid_upload','The file encoding is invalid.');}
 need(raw.length>0&&raw.length<=MEDIA_LIMIT&&btoa(raw)===data,413,'upload_too_large','Choose a file smaller than 8 MiB.');return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
function validateFile(bytes,kind,contentType){
 need(typeof contentType==='string'&&contentType.length<80,400,'invalid_type','Choose a supported file type.');
 const image=contentType.startsWith('image/');let meta={mime:contentType,width:null,height:null};
 if(image||kind==='avatar'||kind==='banner'){
  try{meta=inspectImage(bytes,{maxPixels:kind==='avatar'||kind==='banner'?4*1024*1024:16*1024*1024,allowGif:kind==='avatar'||kind==='banner'});}catch(error){throw new AuthError(400,'invalid_image',error.message);}
  need(meta.mime===contentType,400,'type_mismatch','The image does not match its declared type.');
  if(meta.mime!=='image/gif'){
   if(kind==='avatar')need(meta.width===meta.height&&meta.width<=1024,400,'invalid_crop','Crop an avatar to a square no larger than 1024 pixels.');
   if(kind==='banner')need(meta.width===meta.height*3&&meta.width<=3072,400,'invalid_crop','Crop a banner to a 3:1 image no larger than 3072 pixels.');
  }
 }else{
  const start=String.fromCharCode(...bytes.subarray(0,12));
  const safe=contentType==='application/pdf'?start.startsWith('%PDF-'):
   contentType==='text/plain'?(()=>{try{const value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);return !value.includes('\u0000');}catch{return false;}})():
   contentType==='audio/ogg'?start.startsWith('OggS'):
   contentType==='audio/webm'?bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163:
   contentType==='audio/mp4'?start.slice(4,8)==='ftyp':false;
  need(safe,400,'unsupported_file','Use PNG, JPEG, WebP, PDF, UTF-8 text, or a supported voice recording.');
 }
 if(kind==='voice')need(['audio/ogg','audio/webm','audio/mp4'].includes(meta.mime),400,'invalid_voice','Use a supported voice recording.');
 return meta;
}
function scopeGuard(user,body,now){
 const active=sessionGuard(user,now),hasConversation=body.conversationId!==undefined&&body.conversationId!==null,hasChannel=body.channelId!==undefined&&body.channelId!==null;
 need(['avatar','banner','attachment','voice'].includes(body.kind),400,'invalid_kind','Choose an avatar, banner, attachment or voice recording.');
 if(body.kind==='avatar'||body.kind==='banner'){need(!body.conversationId&&!body.channelId,400,'invalid_scope','Profile files cannot be attached to conversations.');return {...active,conversationId:null,channelId:null};}
 need(hasConversation!==hasChannel&&(!hasConversation||typeof body.conversationId==='string'&&HEX.test(body.conversationId))&&(!hasChannel||typeof body.channelId==='string'&&HEX.test(body.channelId)),400,'invalid_scope','Choose one Standard conversation or community channel.');
 if(hasConversation)return {sql:`${active.sql} AND EXISTS(SELECT 1 FROM native_members m JOIN native_conversations c ON c.id=m.conversation_id WHERE m.conversation_id=? AND m.account_id=? AND (c.kind='group' OR (NOT EXISTS(SELECT 1 FROM native_members n JOIN live_accounts a ON a.id=n.account_id WHERE n.conversation_id=c.id AND a.account_status<>'active') AND NOT EXISTS(SELECT 1 FROM social_blocks b JOIN native_members x ON x.account_id=b.blocker_id AND x.conversation_id=c.id JOIN native_members y ON y.account_id=b.blocked_id AND y.conversation_id=c.id))))`,args:[...active.args,body.conversationId,user.id],conversationId:body.conversationId,channelId:null};
 return {sql:`${active.sql} AND EXISTS(SELECT 1 FROM live_channels c JOIN live_memberships m ON m.community_id=c.community_id JOIN live_communities g ON g.id=c.community_id WHERE c.id=? AND m.account_id=? AND g.ownership_repair_required=0 AND(c.kind<>'announcement' OR m.role IN('owner','moderator')) AND NOT EXISTS(SELECT 1 FROM community_timeouts t WHERE t.community_id=c.community_id AND t.account_id=m.account_id AND t.expires_at>?))`,args:[...active.args,body.channelId,user.id,now],conversationId:null,channelId:body.channelId};
}
async function permitted(db,user,row){
 need(row&&row.state!=='deleting',404,'media_unavailable','This file is unavailable.');
 if(row.state==='uploading'||row.state==='staged'){need(row.owner_id===user.id&&row.expires_at>Date.now(),403,'media_unavailable','This file is unavailable.');return;}
 if(row.kind==='avatar'||row.kind==='banner'){
  const target=await q(db,"SELECT a.id,p.details_visibility,p.avatar_media_id,p.banner_media_id FROM live_accounts a JOIN profile_preferences p ON p.account_id=a.id WHERE a.id=? AND a.account_status='active' AND a.username IS NOT NULL",row.owner_id).first();
  need(target&&(row.kind==='avatar'?target.avatar_media_id:target.banner_media_id)===row.id&&row.state==='ready',404,'media_unavailable','This file is unavailable.');
  const relation=await relationship(db,user.id,row.owner_id);need(!relation.blocked&&(relation.own||relation.friends||relation.shared||target.details_visibility==='public')&&(row.kind==='avatar'||mayView(target.details_visibility,relation)),403,'media_unavailable','This file is unavailable.');return;
 }
 need(row.state==='attached',404,'media_unavailable','This file is unavailable.');
 if(row.native_message_id){need(await q(db,'SELECT 1 FROM native_messages m JOIN native_members p ON p.conversation_id=m.conversation_id WHERE m.id=? AND m.conversation_id=? AND m.deleted_at IS NULL AND p.account_id=?',row.native_message_id,row.conversation_id,user.id).first(),403,'media_unavailable','You no longer have access to this file.');return;}
 if(row.live_message_id){need(await q(db,'SELECT 1 FROM live_messages m JOIN live_channels c ON c.id=m.channel_id JOIN live_memberships p ON p.community_id=c.community_id WHERE m.id=? AND m.channel_id=? AND m.deleted_at IS NULL AND p.account_id=?',row.live_message_id,row.channel_id,user.id).first(),403,'media_unavailable','You no longer have access to this file.');return;}
 throw new AuthError(404,'media_unavailable','This file is unavailable.');
}
async function stage(request,env,user,body){
 const db=env.DB,now=Date.now();need(env.MEDIA?.put&&env.MEDIA?.get&&env.MEDIA?.delete,503,'storage_unavailable','File storage is not configured. Your profile presets remain available.');
 need(typeof body.clientId==='string'&&HEX.test(body.clientId),400,'invalid_client_id','Use a stable upload ID for retries.');
 const guard=scopeGuard(user,body,now);need(await q(db,'SELECT 1 AS allowed WHERE '+guard.sql,...guard.args).first(),403,'upload_denied','This account cannot upload to that conversation.');
 const bytes=decode(body),meta=validateFile(bytes,body.kind,body.contentType),sha=await digest(bytes),filename=safeFilename(body.filename||body.kind+'.'+(meta.extension||'bin'));
 const id=await digest(new TextEncoder().encode(user.id+':'+body.clientId)),key='v1/'+id,existing=await q(db,'SELECT * FROM media_assets WHERE owner_id=? AND client_id=?',user.id,body.clientId).first();
 const same=row=>row.sha256===sha&&row.kind===body.kind&&row.content_type===meta.mime&&row.filename===filename&&row.conversation_id===guard.conversationId&&row.channel_id===guard.channelId;
 if(existing){need(same(existing),409,'upload_id_conflict','This upload ID already belongs to a different file.');need(existing.state!=='deleting'&&(!existing.expires_at||existing.expires_at>now),409,'upload_expired','This upload expired or was removed. Select the file again.');if(existing.state!=='uploading')return json({asset:mediaAsset(existing),staged:existing.state==='staged',securityMode:'standard',endToEndEncrypted:false});}
 let gif=null;
 if(meta.mime==='image/gif')try{gif=prepareProfileGif(bytes);}catch{throw new AuthError(400,'invalid_image','This GIF is damaged or unsupported. Choose a different GIF.');}
 if(!existing){
  // Conservatively reserve the maximum derived-poster size in the existing quota.
  const result=await q(db,`INSERT OR IGNORE INTO media_assets(id,owner_id,client_id,object_key,sha256,kind,content_type,filename,bytes,width,height,conversation_id,channel_id,state,created_at,updated_at,expires_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,'uploading',?,?,? WHERE ${guard.sql} AND (SELECT COUNT(*) FROM media_assets WHERE owner_id=? AND state<>'deleting')<200 AND COALESCE((SELECT SUM(bytes+CASE WHEN content_type='image/gif' THEN 524288 ELSE 0 END) FROM media_assets WHERE owner_id=? AND state<>'deleting'),0)+?<=536870912`,id,user.id,body.clientId,key,sha,body.kind,meta.mime,filename,bytes.length,meta.width,meta.height,guard.conversationId,guard.channelId,now,now,now+STAGE_TTL,...guard.args,user.id,user.id,bytes.length+(gif?524288:0)).run();
  const row=await q(db,'SELECT * FROM media_assets WHERE owner_id=? AND client_id=?',user.id,body.clientId).first();need(row&&same(row),result.meta?.changes>0?409:403,'upload_denied','The upload could not be reserved. Check your session, permissions or storage limit.');
 }
 await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:meta.mime},customMetadata:{assetId:id,sha256:sha}});
 if(gif)await env.MEDIA.put(posterKey(key),gif.poster,{httpMetadata:{contentType:'image/png'},customMetadata:{assetId:id,sourceSha256:sha}});
 // A revoked session, membership departure or deletion during R2 upload cannot commit.
 const fresh=scopeGuard(user,body,Date.now()),updated=await q(db,`UPDATE media_assets SET state='staged',updated_at=? WHERE id=? AND owner_id=? AND state='uploading' AND expires_at>? AND ${fresh.sql}`,Date.now(),id,user.id,Date.now(),...fresh.args).run();
 const row=await q(db,'SELECT * FROM media_assets WHERE id=?',id).first();
 if(!(updated.meta?.changes>0)&&row?.state!=='staged'&&row?.state!=='ready'&&row?.state!=='attached'){
  await db.batch([q(db,"INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,attempts,created_at) SELECT ?,?,?,?,0,? WHERE NOT EXISTS(SELECT 1 FROM media_assets WHERE object_key=? AND state IN('staged','ready','attached'))",crypto.randomUUID(),key,user.id,Date.now(),Date.now(),key),q(db,"UPDATE media_assets SET state='deleting',updated_at=? WHERE id=? AND state='uploading'",Date.now(),id)]);
  throw new AuthError(409,'upload_interrupted','The upload could not finish because access changed. Select the file again.');
 }
 need(await q(db,'SELECT 1 AS allowed WHERE '+fresh.sql,...fresh.args).first(),403,'upload_denied','Your access changed during the upload.');
 return json({asset:{...mediaAsset(row),...(gif?{frames:gif.frames,durationMs:gif.durationMs}:{})},staged:row.state==='staged',securityMode:'standard',endToEndEncrypted:false});
}
export async function cleanupMedia(env,limit=12){
 if(!env?.DB||!env.MEDIA?.delete)return {available:false,deleted:0};const db=env.DB,now=Date.now();limit=Math.max(1,Math.min(30,Number(limit)||12));
 const expired=(await q(db,"SELECT id,object_key,owner_id FROM media_assets WHERE state IN('uploading','staged') AND expires_at<? ORDER BY expires_at LIMIT ?",now,limit).all()).results;
 for(const row of expired)await db.batch([q(db,"INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,attempts,created_at) SELECT ?,object_key,owner_id,?,0,? FROM media_assets WHERE id=? AND state IN('uploading','staged') AND expires_at<?",crypto.randomUUID(),now,now,row.id,now),q(db,"UPDATE media_assets SET state='deleting',updated_at=? WHERE id=? AND state IN('uploading','staged') AND expires_at<?",now,row.id,now)]);
 const rows=(await q(db,'SELECT * FROM media_cleanup WHERE not_before<=? ORDER BY created_at LIMIT ?',now,limit).all()).results;let deleted=0;
 for(const row of rows){try{const current=await q(db,"SELECT state FROM media_assets WHERE object_key=? AND state IN('ready','attached')",row.object_key).first();if(current)continue;await env.MEDIA.delete(row.object_key);await env.MEDIA.delete(posterKey(row.object_key));await db.batch([q(db,"DELETE FROM media_assets WHERE object_key=? AND state='deleting'",row.object_key),q(db,'DELETE FROM media_cleanup WHERE id=?',row.id)]);deleted++;}catch{await q(db,'UPDATE media_cleanup SET attempts=attempts+1,not_before=? WHERE id=?',now+Math.min(3600000,1000*2**Math.min(row.attempts+1,12)),row.id).run();}}
 return {available:true,deleted,pending:Math.max(0,rows.length-deleted)};
}
export async function handleMediaRequest(request,env){
 try{
  const path=new URL(request.url).pathname.replace(/^\/api\/media\/?/,'').split('/').filter(Boolean);need(new URL(request.url).pathname.startsWith('/api/media/'),404,'not_found','This media action is unavailable.');
  const user=await authenticate(request,env),db=env.DB;
  if(request.method==='POST'){
   const body=await bodyJSON(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'media-upload',30,Date.now(),user.id);
   if(path.length===1&&path[0]==='uploads')return await stage(request,env,user,body);
   if(path.length===2&&path[1]==='cancel'){
    const active=sessionGuard(user,Date.now()),row=await q(db,'SELECT * FROM media_assets WHERE id=? AND owner_id=?',path[0],user.id).first();need(row,404,'media_unavailable','This file is unavailable.');
    need(['uploading','staged','deleting'].includes(row.state),409,'media_in_use','This file is in use. Remove it from the profile or message first.');
    await db.batch([q(db,`INSERT OR IGNORE INTO media_cleanup(id,object_key,owner_id,not_before,attempts,created_at) SELECT ?,object_key,owner_id,?,0,? FROM media_assets WHERE id=? AND owner_id=? AND state IN('uploading','staged','deleting') AND ${active.sql}`,crypto.randomUUID(),Date.now(),Date.now(),row.id,user.id,...active.args),q(db,`UPDATE media_assets SET state='deleting',updated_at=? WHERE id=? AND owner_id=? AND state IN('uploading','staged') AND ${active.sql}`,Date.now(),row.id,user.id,...active.args)]);
    const checked=await q(db,'SELECT state FROM media_assets WHERE id=?',row.id).first();need(!checked||checked.state==='deleting',409,'access_changed','Your session or file changed.');return json({cancelled:true});
   }
   throw new AuthError(404,'not_found','This media action is unavailable.');
  }
  need((request.method==='GET'||request.method==='HEAD')&&/^[a-f0-9]{64}$/.test(path[0])&&(path.length===1||path.length===2&&['animation','poster'].includes(path[1])),404,'not_found','This file is unavailable.');need(env.MEDIA?.get,503,'storage_unavailable','File storage is unavailable.');
  let row=await q(db,'SELECT * FROM media_assets WHERE id=?',path[0]).first();await permitted(db,user,row);let range=null;
  const isGif=row.content_type==='image/gif';need(path.length===1||isGif,404,'not_found','This file is unavailable.');
  // The canonical GIF URL is always still, including for cached older clients.
  const poster=isGif&&path[1]!=='animation';
  const header=request.headers.get('range');if(header&&!poster){const m=/^bytes=(\d+)-(\d*)$/.exec(header);need(m,416,'invalid_range','Use one file range.');const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),row.bytes-1):row.bytes-1;need(Number.isSafeInteger(start)&&start>=0&&start<row.bytes&&Number.isSafeInteger(end)&&end>=start,416,'invalid_range','This file range is unavailable.');range={offset:start,length:end-start+1};}
  const object=await env.MEDIA.get(poster?posterKey(row.object_key):row.object_key,...(range?[{range}]:[]));need(object,404,'media_unavailable','This file is unavailable.');
  const fresh=await authenticate(request,env);row=await q(db,'SELECT * FROM media_assets WHERE id=?',path[0]).first();await permitted(db,fresh,row);
  const contentType=poster?'image/png':row.content_type,filename=poster?row.filename.replace(/\.[^.]*$/,'')+'.png':row.filename,byteLength=poster?object.size:row.bytes;
  need(Number.isSafeInteger(byteLength)&&byteLength>0,503,'media_unavailable','This file could not be read.');
  const inline=contentType.startsWith('image/')||contentType.startsWith('audio/'),headers={'content-type':contentType,'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox",'content-disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`,'accept-ranges':poster?'none':'bytes','content-length':String(range?range.length:byteLength),'cross-origin-resource-policy':'same-origin'};
  if(range)headers['content-range']=`bytes ${range.offset}-${range.offset+range.length-1}/${row.bytes}`;
  return new Response(request.method==='HEAD'?null:object.body,{status:range?206:200,headers});
 }catch(error){return json({error:{code:error instanceof AuthError?error.code:'media_unavailable',message:error instanceof AuthError?error.message:'The file could not be processed. Retry with the same upload ID.'}},error instanceof AuthError?error.status:503);}
}
export default {fetch:handleMediaRequest};
