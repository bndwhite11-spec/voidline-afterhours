/** Account-owned metadata and explicit voluntary report evidence. No hidden history export. */
import {authenticate,validateSessionMutation,authRateLimit,authHash,AuthError} from './auth.mjs';
import {notificationAvailability} from './notifications.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const DEFAULTS={listFilter:'all',notifications:{dm:true,mentions:true,replies:true,community:false,gifts:true,quietHours:{enabled:false,start:'22:00',end:'08:00',timeZone:'UTC'},preview:'full'}};
const FILTERS=['all','unread','favorites','dms','communities','archived'];
// Recheck the actor inside each durable statement. Authentication preflight can
// race owner suspension/deletion, logout, or an expiring session.
const databaseNow="CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)";
function actorGuard(user){return {sql:`EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>${databaseNow} AND a.account_status='active')`,args:[user.sessionId,user.id]};}
function guarded(user,...checks){const actor=actorGuard(user);return {sql:[actor.sql,...checks.map(check=>check.sql)].map(sql=>'('+sql+')').join(' AND '),args:[...actor.args,...checks.flatMap(check=>check.args)]};}
const folderGuard=(id,user)=>({sql:'EXISTS(SELECT 1 FROM organization_folders WHERE id=? AND account_id=?)',args:[id,user.id]});
function accessGuard(kind,id,user){
 if(kind==='channel')return {sql:'EXISTS(SELECT 1 FROM live_channels c JOIN live_memberships m ON m.community_id=c.community_id WHERE c.id=? AND m.account_id=?)',args:[id,user.id]};
 if(kind==='native')return {sql:'EXISTS(SELECT 1 FROM native_conversations c JOIN native_members m ON m.conversation_id=c.id WHERE c.id=? AND m.account_id=?)',args:[id,user.id]};
 return {sql:'1',args:[]};
}
function committed(result){need(result?.meta?.changes>0,409,'organization_access_changed','Your account, session or conversation access changed before this change could be saved. Reload and try again.');}
function reportGuard(type,id,user){
 if(type==='community')return {sql:'EXISTS(SELECT 1 FROM live_memberships WHERE community_id=? AND account_id=?)',args:[id,user.id]};
 if(type==='native-conversation')return accessGuard('native',id,user);
 if(type==='native-message')return {sql:'EXISTS(SELECT 1 FROM native_messages m JOIN native_members n ON n.conversation_id=m.conversation_id WHERE m.id=? AND n.account_id=?)',args:[id,user.id]};
 if(type==='message')return {sql:'EXISTS(SELECT 1 FROM live_messages message JOIN live_channels c ON c.id=message.channel_id JOIN live_memberships m ON m.community_id=c.community_id WHERE message.id=? AND m.account_id=?)',args:[id,user.id]};
 return {sql:`EXISTS(SELECT 1 FROM live_accounts a WHERE a.id=? AND a.username IS NOT NULL AND (EXISTS(SELECT 1 FROM social_requests r WHERE ((r.sender_id=? AND r.recipient_id=a.id) OR (r.recipient_id=? AND r.sender_id=a.id)) AND r.state IN ('pending','accepted')) OR EXISTS(SELECT 1 FROM social_blocks b WHERE b.blocker_id=? AND b.blocked_id=a.id) OR EXISTS(SELECT 1 FROM live_memberships mine JOIN live_memberships theirs ON theirs.community_id=mine.community_id WHERE mine.account_id=? AND theirs.account_id=a.id) OR EXISTS(SELECT 1 FROM native_members mine JOIN native_members theirs ON theirs.conversation_id=mine.conversation_id WHERE mine.account_id=? AND theirs.account_id=a.id)))`,args:[id,user.id,user.id,user.id,user.id,user.id]};
}

async function readBody(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 const reader=request.body?.getReader();need(reader,400,'invalid_body','A request body is required.');let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw new AuthError(413,'body_too_large','This request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The request could not be read.');}
 need(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_body','Use a JSON object.');return body;
}
function preferences(stored){let value={};try{value=JSON.parse(stored||'{}');}catch{}return {...DEFAULTS,...value,notifications:{...DEFAULTS.notifications,...value.notifications,preview:value.notifications?.preview==='content'?'full':value.notifications?.preview||DEFAULTS.notifications.preview,quietHours:{...DEFAULTS.notifications.quietHours,...value.notifications?.quietHours}}};}
function preferencePatch(body){
 const changes=[];
 if(body.listFilter!==undefined){need(FILTERS.includes(body.listFilter)||(typeof body.listFilter==='string'&&/^folder:[a-f0-9-]{36}$/.test(body.listFilter)),400,'invalid_filter','Choose All, Unread, Favorites, DMs, Communities or Archived.');changes.push(['$.listFilter',body.listFilter]);}
 if(body.notifications!==undefined){const n=body.notifications;need(n&&typeof n==='object'&&!Array.isArray(n),400,'invalid_preferences','Choose notification preferences.');
  for(const key of ['dm','mentions','replies','community','gifts'])if(n[key]!==undefined){need(typeof n[key]==='boolean',400,'invalid_preferences','Notification choices must be on or off.');changes.push(['$.notifications.'+key,n[key]]);}
  if(n.preview!==undefined){need(['generic','sender','full','content'].includes(n.preview),400,'invalid_preview','Choose hidden content, sender-only or full previews.');changes.push(['$.notifications.preview',n.preview==='content'?'full':n.preview]);}
  if(n.quietHours!==undefined){const value=n.quietHours;need(value&&typeof value==='object',400,'invalid_quiet_hours','Choose quiet hours.');if(value.enabled!==undefined){need(typeof value.enabled==='boolean',400,'invalid_quiet_hours','Quiet hours must be on or off.');changes.push(['$.notifications.quietHours.enabled',value.enabled]);}if(value.timeZone!==undefined){need(typeof value.timeZone==='string'&&value.timeZone.length<=64,400,'invalid_time_zone','Choose a valid IANA time zone.');try{new Intl.DateTimeFormat('en',{timeZone:value.timeZone}).format();}catch{throw new AuthError(400,'invalid_time_zone','Choose a valid IANA time zone.');}changes.push(['$.notifications.quietHours.timeZone',value.timeZone]);}for(const key of ['start','end'])if(value[key]!==undefined){need(typeof value[key]==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value[key]),400,'invalid_quiet_hours','Use a valid 24-hour time.');changes.push(['$.notifications.quietHours.'+key,value[key]]);}}
 }
 need(changes.length,400,'empty_preferences','Choose at least one preference to update.');return changes;
}
async function channelAccess(db,id,userId){
 const channel=await q(db,'SELECT c.id,c.community_id,c.name,m.role FROM live_channels c JOIN live_memberships m ON m.community_id=c.community_id WHERE c.id=? AND m.account_id=?',id,userId).first();
 need(channel,403,'channel_unavailable','This conversation is unavailable to your account.');return channel;
}
function targetId(kind,id){need(['channel','matrix','native'].includes(kind)&&typeof id==='string'&&id.length>0&&id.length<=255&&!/[\u0000-\u0020\u007f/?#]/.test(id),400,'invalid_target','Choose a valid conversation.');if(kind==='matrix')need(/^![^:]+:.+$/.test(id),400,'invalid_target','Choose a Matrix conversation ID.');return kind+':'+id;}
function targetView(row){return {key:row.target_key,kind:row.kind,targetId:row.kind==='channel'?row.channel_id:row.kind==='native'?row.conversation_id:row.target_key.slice(7),communityId:row.community_id||null,favorite:!!row.favorite,pinned:!!row.pinned,archived:!!row.archived,muted:!!row.muted,folderId:row.folder_id||null,readSeq:row.read_seq||0,updatedAt:row.updated_at};}
async function nativeAccess(db,id,userId){const row=await q(db,'SELECT c.id,c.kind FROM native_conversations c JOIN native_members m ON m.conversation_id=c.id WHERE c.id=? AND m.account_id=?',id,userId).first();need(row,403,'conversation_unavailable','This conversation is unavailable to your account.');return row;}
async function targets(db,userId){
 const legacy=(await q(db,`SELECT t.* FROM organization_targets t LEFT JOIN live_channels c ON c.id=t.channel_id LEFT JOIN live_memberships m ON m.community_id=c.community_id AND m.account_id=t.account_id WHERE t.account_id=? AND (t.kind='matrix' OR m.account_id IS NOT NULL) ORDER BY t.pinned DESC,t.updated_at DESC,t.target_key LIMIT 1000`,userId).all()).results;
 const native=(await q(db,`SELECT p.*,'native' AS kind,'native:'||p.conversation_id AS target_key FROM native_conversation_preferences p JOIN native_members m ON m.conversation_id=p.conversation_id AND m.account_id=p.account_id WHERE p.account_id=? ORDER BY p.pinned DESC,p.updated_at DESC,p.conversation_id LIMIT 1000`,userId).all()).results;
 return [...legacy,...native].map(targetView).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt||a.key.localeCompare(b.key)).slice(0,1000);
}
async function folderList(db,userId){return (await q(db,'SELECT id,name,position,created_at AS createdAt FROM organization_folders WHERE account_id=? ORDER BY position,created_at,id',userId).all()).results;}
async function reportAccess(db,userId,type,id){
 if(type==='community'){need(await q(db,'SELECT 1 AS ok FROM live_memberships WHERE community_id=? AND account_id=?',id,userId).first(),404,'source_unavailable','This report source is unavailable.');return;}
 if(type==='native-message'){need(await q(db,'SELECT 1 AS ok FROM native_messages m JOIN native_members n ON n.conversation_id=m.conversation_id WHERE m.id=? AND n.account_id=?',id,userId).first(),403,'source_unavailable','This report source is unavailable.');return;}
 if(type==='native-conversation'){await nativeAccess(db,id,userId);return;}
 if(type==='message'){const m=await q(db,'SELECT channel_id FROM live_messages WHERE id=?',id).first();need(m,404,'source_unavailable','This report source is unavailable.');await channelAccess(db,m.channel_id,userId);return;}
 need(type==='account'&&id!==userId,400,'invalid_report','Choose a permitted conversation, message or another account.');
 const known=await q(db,`SELECT a.id FROM live_accounts a WHERE a.id=? AND a.username IS NOT NULL AND (EXISTS(SELECT 1 FROM social_requests r WHERE ((r.sender_id=? AND r.recipient_id=a.id) OR (r.recipient_id=? AND r.sender_id=a.id)) AND r.state IN ('pending','accepted')) OR EXISTS(SELECT 1 FROM social_blocks b WHERE b.blocker_id=? AND b.blocked_id=a.id) OR EXISTS(SELECT 1 FROM live_memberships mine JOIN live_memberships theirs ON theirs.community_id=mine.community_id WHERE mine.account_id=? AND theirs.account_id=a.id) OR EXISTS(SELECT 1 FROM native_members mine JOIN native_members theirs ON theirs.conversation_id=mine.conversation_id WHERE mine.account_id=? AND theirs.account_id=a.id))`,id,userId,userId,userId,userId,userId).first();
 need(known,404,'source_unavailable','This report source is unavailable.');
}
export async function handleOrganizeRequest(request,env){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/organize\/?/,'').split('/').filter(Boolean).map(decodeURIComponent),method=request.method;
  need(url.pathname==='/api/organize'||url.pathname.startsWith('/api/organize/'),404,'not_found','No organization action matches this request.');need(['GET','POST'].includes(method),405,'method_not_allowed','This method is unavailable.');
  const user=await authenticate(request,env),db=env.DB,now=Date.now();let body;
  if(method==='POST'){body=await readBody(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'organize',90,now,user.id);}
  if(path.length===1&&path[0]==='activity'&&method==='GET'){
   const row=await q(db,`SELECT
    (SELECT COUNT(*) FROM native_messages m JOIN native_members n ON n.conversation_id=m.conversation_id LEFT JOIN native_conversation_preferences p ON p.conversation_id=n.conversation_id AND p.account_id=n.account_id WHERE n.account_id=? AND m.seq>n.read_seq AND m.author_id<>n.account_id AND m.deleted_at IS NULL AND COALESCE(p.muted,0)=0) AS native_unread,
    (SELECT COUNT(*) FROM live_messages m JOIN live_channels c ON c.id=m.channel_id JOIN live_memberships n ON n.community_id=c.community_id LEFT JOIN live_read_states r ON r.channel_id=c.id AND r.account_id=n.account_id LEFT JOIN organization_targets p ON p.account_id=n.account_id AND p.target_key='channel:'||c.id WHERE n.account_id=? AND m.seq>COALESCE(r.seq,0) AND m.author_id<>n.account_id AND m.deleted_at IS NULL AND COALESCE(p.muted,0)=0) AS community_unread,
    (SELECT COUNT(*) FROM social_requests WHERE recipient_id=? AND state='pending') AS friend_requests,
    (SELECT COUNT(*) FROM cosmetic_gifts WHERE recipient_id=? AND state='pending') AS gift_requests,
    (SELECT COUNT(*) FROM gift_transfers WHERE recipient_id=? AND state='pending') AS gift_transfers,
    (SELECT COALESCE(MAX(c.updated_at),0) FROM native_conversations c JOIN native_members n ON n.conversation_id=c.id WHERE n.account_id=?) AS native_updated_at,
    (SELECT COALESCE(MAX(ch.seq),0) FROM native_changes ch JOIN native_members n ON n.conversation_id=ch.conversation_id WHERE n.account_id=?) AS native_change_seq,
    (SELECT COUNT(*) FROM native_members WHERE account_id=?) AS native_memberships`,user.id,user.id,user.id,user.id,user.id,user.id,user.id,user.id).first();
   const counts={nativeUnread:row.native_unread||0,communityUnread:row.community_unread||0,friendRequests:row.friend_requests||0,giftRequests:(row.gift_requests||0)+(row.gift_transfers||0)};
   counts.unreadTotal=counts.nativeUnread+counts.communityUnread;
   const revision=await authHash(JSON.stringify([...Object.values(counts),row.native_updated_at||0,row.native_change_seq||0,row.native_memberships||0]));return json({counts,revision,changed:url.searchParams.get('revision')!==revision,pollAfterMs:25000,notificationDelivery:notificationAvailability(env),scope:'current-account-authorized-activity'});
  }
  if(path.length===1&&path[0]==='preferences'){
   if(method==='POST'){
    if(typeof body.listFilter==='string'&&body.listFilter.startsWith('folder:'))need(await q(db,'SELECT id FROM organization_folders WHERE id=? AND account_id=?',body.listFilter.slice(7),user.id).first(),404,'folder_unavailable','This folder is unavailable.');
    const patch=preferencePatch(body),sqlArgs=patch.map(()=>',?,json(?)').join(''),values=patch.flatMap(([key,value])=>[key,JSON.stringify(value)]);
    const guard=guarded(user,...(typeof body.listFilter==='string'&&body.listFilter.startsWith('folder:')?[folderGuard(body.listFilter.slice(7),user)]:[]));
    const result=await q(db,`INSERT INTO account_organization(account_id,preferences,updated_at) SELECT ?,json_set('{}'${sqlArgs}),? WHERE ${guard.sql} ON CONFLICT(account_id) DO UPDATE SET preferences=json_set(account_organization.preferences${sqlArgs}),updated_at=excluded.updated_at WHERE ${guard.sql}`,user.id,...values,now,...guard.args,...values,...guard.args).run();committed(result);
   }
   const row=await q(db,'SELECT preferences FROM account_organization WHERE account_id=?',user.id).first();return json({preferences:preferences(row?.preferences),notificationDelivery:notificationAvailability(env)});
  }
  if(path.length===1&&path[0]==='targets'){
   if(method==='POST'){
    const key=targetId(body.kind,body.targetId),channel=body.kind==='channel'?await channelAccess(db,body.targetId,user.id):null,native=body.kind==='native'?await nativeAccess(db,body.targetId,user.id):null;
    const fields=[],values=[];for(const [field,column]of [['favorite','favorite'],['pinned','pinned'],['archived','archived'],['muted','muted']])if(body[field]!==undefined){need(typeof body[field]==='boolean',400,'invalid_setting','Conversation settings must be on or off.');fields.push(column);values.push(body[field]?1:0);}
    if(body.folderId!==undefined){if(body.folderId!==null)need(typeof body.folderId==='string'&&await q(db,'SELECT id FROM organization_folders WHERE id=? AND account_id=?',body.folderId,user.id).first(),404,'folder_unavailable','This folder is unavailable.');fields.push('folder_id');values.push(body.folderId);}
    if(body.readSeq!==undefined){need(Number.isSafeInteger(body.readSeq)&&body.readSeq>=0,400,'invalid_read','Use a valid reading position.');const max=channel?(await q(db,'SELECT COALESCE(MAX(seq),0) AS seq FROM live_messages WHERE channel_id=?',channel.id).first()).seq:native?(await q(db,'SELECT COALESCE(MAX(seq),0) AS seq FROM native_messages WHERE conversation_id=?',native.id).first()).seq:body.readSeq;fields.push('read_seq');values.push(Math.min(max,body.readSeq));}
    need(fields.length,400,'empty_setting','Choose at least one setting.');
    const guard=guarded(user,accessGuard(body.kind,body.targetId,user),...(body.folderId!==undefined&&body.folderId!==null?[folderGuard(body.folderId,user)]:[]));
    let result;
    if(native)result=await q(db,`INSERT INTO native_conversation_preferences(account_id,conversation_id,${fields.join(',')},updated_at) SELECT ?,?,${fields.map(()=>'?').join(',')},? WHERE ${guard.sql} ON CONFLICT(account_id,conversation_id) DO UPDATE SET ${fields.map(field=>field==='read_seq'?'read_seq=MAX(native_conversation_preferences.read_seq,excluded.read_seq)':field+'=excluded.'+field).join(',')},updated_at=excluded.updated_at WHERE ${guard.sql}`,user.id,native.id,...values,now,...guard.args,...guard.args).run();
    else result=await q(db,`INSERT INTO organization_targets(account_id,target_key,kind,community_id,channel_id,${fields.join(',')},updated_at) SELECT ?,?,?,?, ?,${fields.map(()=>'?').join(',')},? WHERE ${guard.sql} ON CONFLICT(account_id,target_key) DO UPDATE SET ${fields.map(field=>field==='read_seq'?'read_seq=MAX(organization_targets.read_seq,excluded.read_seq)':field+'=excluded.'+field).join(',')},updated_at=excluded.updated_at WHERE ${guard.sql}`,user.id,key,body.kind,channel?.community_id||null,channel?.id||null,...values,now,...guard.args,...guard.args).run();
    committed(result);
   }
   return json({targets:await targets(db,user.id),limit:1000,contentStored:false});
  }
  if(path[0]==='folders'){
   if(method==='POST'){
    if(path.length===1){
     need(typeof body.name==='string'&&body.name.trim().length>0&&body.name.trim().length<=40&&!/[\u0000-\u001f]/.test(body.name),400,'invalid_folder','Use a folder name between 1 and 40 characters.');
     const count=(await q(db,'SELECT COUNT(*) AS n FROM organization_folders WHERE account_id=?',user.id).first()).n;
     const clientId=body.clientId??crypto.randomUUID();need(typeof clientId==='string'&&/^[a-f0-9-]{36}$/.test(clientId),400,'invalid_retry','Use a stable folder request ID.');
     const prior=await q(db,'SELECT account_id FROM organization_folders WHERE id=?',clientId).first();need(!prior||prior.account_id===user.id,404,'folder_unavailable','This folder is unavailable.');
     const guard=guarded(user);
     if(!prior){need(count<20,409,'folder_limit','An account can have up to 20 folders.');const result=await q(db,`INSERT OR IGNORE INTO organization_folders(id,account_id,name,position,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM organization_folders WHERE account_id=?)<20 AND ${guard.sql}`,clientId,user.id,body.name.trim(),count,now,user.id,...guard.args).run();if(result.meta?.changes!==1){const replay=await q(db,`UPDATE organization_folders SET name=name WHERE id=? AND account_id=? AND ${guard.sql}`,clientId,user.id,...guard.args).run();committed(replay);}}
     else committed(await q(db,`UPDATE organization_folders SET name=name WHERE id=? AND account_id=? AND ${guard.sql}`,clientId,user.id,...guard.args).run());
    }else if(path.length===2){
     need(await q(db,'SELECT id FROM organization_folders WHERE id=? AND account_id=?',path[1],user.id).first(),404,'folder_unavailable','This folder is unavailable.');
     const guard=guarded(user,folderGuard(path[1],user));
     if(body.remove===true){const result=await db.batch([q(db,`UPDATE native_conversation_preferences SET folder_id=NULL,updated_at=? WHERE account_id=? AND folder_id=? AND ${guard.sql}`,now,user.id,path[1],...guard.args),q(db,`UPDATE organization_targets SET folder_id=NULL,updated_at=? WHERE account_id=? AND folder_id=? AND ${guard.sql}`,now,user.id,path[1],...guard.args),q(db,`UPDATE account_organization SET preferences=json_set(preferences,'$.listFilter','all'),updated_at=? WHERE account_id=? AND json_extract(preferences,'$.listFilter')=? AND ${guard.sql}`,now,user.id,'folder:'+path[1],...guard.args),q(db,`DELETE FROM organization_folders WHERE id=? AND account_id=? AND ${guard.sql}`,path[1],user.id,...guard.args)]);committed(result.at(-1));}
     else{need(typeof body.name==='string'&&body.name.trim().length>0&&body.name.trim().length<=40&&!/[\u0000-\u001f]/.test(body.name),400,'invalid_folder','Use a folder name between 1 and 40 characters.');const position=body.position??0;need(Number.isSafeInteger(position)&&position>=0&&position<=20,400,'invalid_position','Choose a valid folder position.');committed(await q(db,`UPDATE organization_folders SET name=?,position=? WHERE id=? AND account_id=? AND ${guard.sql}`,body.name.trim(),position,path[1],user.id,...guard.args).run());}
    }else throw new AuthError(404,'not_found','This folder action is unavailable.');
   }
   return json({folders:await folderList(db,user.id)});
  }
  if(path.length===1&&path[0]==='reports'&&method==='POST'){
   need(typeof body.targetId==='string'&&body.targetId.length>0&&body.targetId.length<=255,400,'invalid_report','Choose a valid report source.');
   await reportAccess(db,user.id,body.targetType,body.targetId);need(['spam','harassment','unsafe','impersonation','other'].includes(body.reason),400,'invalid_reason','Choose a report reason.');
   const detail=body.detailText??'';need(typeof detail==='string'&&detail.length<=2000,400,'invalid_detail','Use at most 2,000 characters.');need(body.disclosureAcknowledged===true,400,'disclosure_required','Confirm which report details you are sharing with the platform owner.');
   await authRateLimit(request,db,'reports',5,now,user.id);const id=crypto.randomUUID();
   const guard=guarded(user,reportGuard(body.targetType,body.targetId,user));
   committed(await q(db,`INSERT INTO abuse_reports(id,reporter_id,target_type,target_id,reason,detail_text,status,created_at) SELECT ?,?,?,?,?,?,'open',? WHERE ${guard.sql}`,id,user.id,body.targetType,body.targetId,body.reason,detail.trim(),now,...guard.args).run());
   return json({report:{id,status:'open',sharedWith:'platform-owner',includesContent:!!detail.trim()}},201);
  }
  throw new AuthError(404,'not_found','No organization action matches this request.');
 }catch(error){return json({error:{code:error instanceof AuthError?error.code:'organization_unavailable',message:error instanceof AuthError?error.message:'This change could not be saved. Please retry.'}},error instanceof AuthError?error.status:503);}
}
