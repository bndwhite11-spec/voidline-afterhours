/** Native standard text messaging. Never a Matrix transport or an E2EE fallback. */
import {authenticate,validateSessionMutation,normalizeUsername,authRateLimit,AuthError} from './auth.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const security=Object.freeze({mode:'standard',endToEndEncrypted:false,description:'Access-controlled server-stored text over HTTPS. The service can read message content.'});
const REACTIONS=['♥','❤️','💜','👍','🔥','👀','✨','😂','💯','🎯','😭','💀','🚀'];
export const NATIVE_GROUP_LIMIT=16;
const LIST_TTL=10*60*1000;
// D1 meta.changes counts trigger/cascade writes as well as the targeted row.
// Guarded primary-key mutations prove success with a positive count, not exactly one.
const uuid=()=>crypto.randomUUID();
async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 const reader=request.body?.getReader();need(reader,400,'invalid_body','A request body is required.');let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw new AuthError(413,'body_too_large','This request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}let body;
 try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The request could not be read.');}
 need(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_body','Use a JSON object.');return body;
}
function retryId(id){need(typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id),400,'invalid_client_id','Use a stable client-generated UUID for retries.');return id;}
function acknowledgement(body){need(body.acknowledgeStandard===true,400,'standard_acknowledgement_required','Review standard messaging before continuing. These messages are stored by the service and are not end-to-end encrypted.');}
function textValue(value){need(typeof value==='string'&&value.trim().length>0&&value.length<=4000&&!/\u0000/.test(value),400,'invalid_text','Write a message between 1 and 4000 characters.');return value.trim();}
function cursor(value){if(value===null||value===undefined)return null;need(/^\d+$/.test(String(value))&&Number.isSafeInteger(Number(value)),400,'invalid_cursor','Use a nonnegative message position.');return Number(value);}
function page(url){const limit=Number(url.searchParams.get('limit')??50);need(Number.isSafeInteger(limit)&&limit>=1&&limit<=100,400,'invalid_page','Choose a page size between 1 and 100.');return limit;}
function activeSession(user,now){return {sql:"EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active' AND a.onboarding_complete=1)",args:[user.sessionId,user.id,now]};}
function memberGuard(user,id,now){const session=activeSession(user,now);return {sql:`${session.sql} AND EXISTS(SELECT 1 FROM native_members WHERE conversation_id=? AND account_id=?)`,args:[...session.args,id,user.id]};}
function writeGuard(user,id,now){
 const member=memberGuard(user,id,now);
 // A personal block prevents new direct delivery, not unrelated group activity.
 // Shared group members retain history access; blocking is not cryptographic removal.
 return {sql:`${member.sql} AND EXISTS(SELECT 1 FROM native_conversations c WHERE c.id=? AND (c.kind='group' OR (NOT EXISTS(SELECT 1 FROM native_members m JOIN live_accounts a ON a.id=m.account_id WHERE m.conversation_id=c.id AND a.account_status<>'active') AND NOT EXISTS(SELECT 1 FROM social_blocks b JOIN native_members x ON x.account_id=b.blocker_id AND x.conversation_id=c.id JOIN native_members y ON y.account_id=b.blocked_id AND y.conversation_id=x.conversation_id))))`,args:[...member.args,id]};
}
function ownerGuard(user,id,now){const member=memberGuard(user,id,now);return {sql:`${member.sql} AND EXISTS(SELECT 1 FROM native_conversations WHERE id=? AND kind='group' AND owner_id=?)`,args:[...member.args,id,user.id]};}
function audit(db,user,action,id,detail,now,guard){return q(db,`INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at) SELECT ?,?,?,'native-group',?,?,? WHERE ${guard.sql}`,uuid(),user.id,'native.group.'+action,id,JSON.stringify(detail),now,...guard.args);}

export async function accessibleNativeConversation(db,id,userId){
 need(typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id),404,'conversation_unavailable','This conversation is unavailable.');
 const record=await q(db,"SELECT c.*,m.read_seq,m.read_change_seq FROM native_conversations c JOIN native_members m ON m.conversation_id=c.id WHERE c.id=? AND m.account_id=? AND c.security_mode='standard'",id,userId).first();
 need(record,404,'conversation_unavailable','This conversation is unavailable to this account.');return record;
}
const columns='m.seq,m.id,m.revision,m.conversation_id,m.author_id,m.client_id,m.text,m.reply_to_id,m.edited_at,m.deleted_at,m.created_at,a.display_name AS author_name,a.username AS author_username,a.avatar AS author_avatar';
const joins='FROM native_messages m JOIN live_accounts a ON a.id=m.author_id';
async function enrich(db,messages,userId){
 if(!messages.length)return [];
 if(messages.length>80){const result=[];for(let i=0;i<messages.length;i+=80)result.push(...await enrich(db,messages.slice(i,i+80),userId));return result;}
 const ids=messages.map(m=>m.id),slots=ids.map(()=>'?').join(',');
 const [reactionResult,savedResult]=await Promise.all([
  q(db,`SELECT message_id,emoji,COUNT(*) AS count,MAX(CASE WHEN account_id=? THEN 1 ELSE 0 END) AS mine FROM native_reactions WHERE message_id IN (${slots}) GROUP BY message_id,emoji`,userId,...ids).all(),
  q(db,`SELECT message_id,saved,revision FROM native_bookmarks WHERE account_id=? AND message_id IN (${slots})`,userId,...ids).all()
 ]);
 const saved=new Map(savedResult.results.map(row=>[row.message_id,row])),rows=reactionResult.results;
 return messages.map(m=>({...m,revision:Number(m.revision)||0,securityMode:'standard',saved:!!saved.get(m.id)?.saved,bookmarkRevision:saved.get(m.id)?.revision||0,reactions:rows.filter(r=>r.message_id===m.id).map(({emoji,count,mine})=>({emoji,count,mine:!!mine}))}));
}
async function getMessage(db,id,userId){const message=await q(db,`SELECT ${columns} ${joins} JOIN native_members member ON member.conversation_id=m.conversation_id WHERE m.id=? AND member.account_id=?`,id,userId).first();need(message,404,'message_unavailable','This message is unavailable to this account.');return (await enrich(db,[message],userId))[0];}
async function describeMany(db,records,userId){
 const result=[];
 for(let n=0;n<records.length;n+=80){
  const part=records.slice(n,n+80),ids=part.map(c=>c.id),slots=ids.map(()=>'?').join(',');
  const [members,lastMessages,totals,highs,restricted]=await Promise.all([
   q(db,`SELECT m.conversation_id,a.id,a.username,a.display_name AS displayName,a.avatar FROM native_members m JOIN live_accounts a ON a.id=m.account_id WHERE m.conversation_id IN(${slots}) ORDER BY m.joined_at,a.id`,...ids).all(),
   q(db,`SELECT ${columns} ${joins} WHERE m.conversation_id IN(${slots}) AND m.seq=(SELECT MAX(t.seq) FROM native_messages t WHERE t.conversation_id=m.conversation_id)`,...ids).all(),
   q(db,`SELECT m.conversation_id,MAX(m.seq) AS lastSeq,SUM(CASE WHEN m.seq>member.read_seq AND m.author_id<>member.account_id AND m.deleted_at IS NULL THEN 1 ELSE 0 END) AS unreadCount FROM native_messages m JOIN native_members member ON member.conversation_id=m.conversation_id AND member.account_id=? WHERE m.conversation_id IN(${slots}) GROUP BY m.conversation_id`,userId,...ids).all(),
   q(db,`SELECT conversation_id,MAX(seq) AS seq FROM native_changes WHERE conversation_id IN(${slots}) GROUP BY conversation_id`,...ids).all(),
   q(db,`SELECT c.id FROM native_conversations c WHERE c.id IN(${slots}) AND c.kind='dm' AND (EXISTS(SELECT 1 FROM native_members m JOIN live_accounts a ON a.id=m.account_id WHERE m.conversation_id=c.id AND a.account_status<>'active') OR EXISTS(SELECT 1 FROM social_blocks b JOIN native_members x ON x.account_id=b.blocker_id AND x.conversation_id=c.id JOIN native_members y ON y.account_id=b.blocked_id AND y.conversation_id=x.conversation_id))`,...ids).all()
  ]);
  const enrichedLast=await enrich(db,lastMessages.results,userId),restrictedIds=new Set(restricted.results.map(c=>c.id));
  for(const record of part){
   const participants=members.results.filter(m=>m.conversation_id===record.id).map(({conversation_id,...member})=>({...member,role:record.kind==='group'&&record.owner_id===member.id?'owner':'member'})),last=enrichedLast.find(m=>m.conversation_id===record.id),counts=totals.results.find(t=>t.conversation_id===record.id);
   result.push({ownerId:record.owner_id||null,capabilities:{canManage:record.kind==='group'&&record.owner_id===userId,canAddMembers:record.kind==='group'&&record.owner_id===userId,canRemoveMembers:record.kind==='group'&&record.owner_id===userId,canTransferOwnership:record.kind==='group'&&record.owner_id===userId,canLeave:record.kind==='group'&&(record.owner_id!==userId||participants.length===1),canSend:!restrictedIds.has(record.id)},historyPolicy:'Current joined members can read retained history. New members receive earlier group history.',blockingPolicy:'Blocking stops direct messages and requests. Shared group members can still read and post; leave or remove a member to change membership.',favorite:!!record.favorite,pinned:!!record.pinned,archived:!!record.archived,muted:!!record.muted,folderId:record.folder_id||null,id:record.id,kind:record.kind,name:record.name,title:record.kind==='dm'?(participants.find(a=>a.id!==userId)?.displayName||'Deleted account'):record.name,securityMode:'standard',endToEndEncrypted:false,createdAt:record.created_at,updatedAt:record.updated_at,participants,lastMessage:last?{...last,securityMode:'standard'}:null,lastSeq:counts?.lastSeq||0,unreadCount:counts?.unreadCount||0,changeSeq:highs.results.find(h=>h.conversation_id===record.id)?.seq||0,readSeq:record.read_seq||0,readChangeSeq:record.read_change_seq||0});
  }
 }
 return result;
}
async function describe(db,record,userId){return (await describeMany(db,[record],userId))[0];}
function creationGuard(user,ids,now){
 const session=activeSession(user,now),encoded=JSON.stringify(ids);
 return {sql:`${session.sql} AND NOT EXISTS(SELECT 1 FROM json_each(?) j LEFT JOIN live_accounts a ON a.id=j.value WHERE a.id IS NULL OR a.username IS NULL OR a.account_status<>'active' OR (a.id<>? AND NOT EXISTS(SELECT 1 FROM social_requests f WHERE f.state='accepted' AND ((f.sender_id=? AND f.recipient_id=a.id) OR(f.recipient_id=? AND f.sender_id=a.id))))) AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE b.blocker_id IN(SELECT value FROM json_each(?)) AND b.blocked_id IN(SELECT value FROM json_each(?)))`,args:[...session.args,encoded,user.id,user.id,user.id,encoded,encoded]};
}
async function ensureWritable(db,user,id,now){const guard=writeGuard(user,id,now);need(await q(db,'SELECT 1 AS allowed WHERE '+guard.sql,...guard.args).first(),403,'conversation_restricted','This conversation cannot accept messages. Check membership, blocking or account status.');return guard;}
function encodeListCursor(id,position){return btoa(JSON.stringify({v:1,s:id,p:position})).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function decodeListCursor(value){
 try{need(typeof value==='string'&&value.length<300,400,'invalid_cursor','Refresh the conversation list.');const raw=value.replaceAll('-','+').replaceAll('_','/');const data=JSON.parse(atob(raw+'='.repeat((4-raw.length%4)%4)));need(data.v===1&&/^[a-f0-9-]{36}$/i.test(data.s)&&Number.isSafeInteger(data.p)&&data.p>=0,400,'invalid_cursor','Refresh the conversation list.');return data;}
 catch(error){if(error instanceof AuthError)throw error;throw new AuthError(400,'invalid_cursor','Refresh the conversation list.');}
}
async function conversationFilter(db,userId,value){
 const filter=value||'all',allowed=['all','unread','favorites','pinned','dms','groups','communities','archived'];
 need(allowed.includes(filter)||/^folder:[a-f0-9-]{36}$/i.test(filter),400,'invalid_filter','Choose an available conversation filter.');
 let sql="c.security_mode='standard'",args=[];
 if(filter.startsWith('folder:')){need(await q(db,'SELECT id FROM organization_folders WHERE id=? AND account_id=?',filter.slice(7),userId).first(),404,'folder_unavailable','This folder is unavailable.');sql+=' AND p.folder_id=?';args.push(filter.slice(7));}
 else if(filter==='archived')sql+=' AND COALESCE(p.archived,0)=1';
 else if(filter==='unread')sql+=" AND EXISTS(SELECT 1 FROM native_messages message WHERE message.conversation_id=c.id AND message.seq>m.read_seq AND message.author_id<>m.account_id AND message.deleted_at IS NULL)";
 else if(filter==='favorites')sql+=' AND COALESCE(p.favorite,0)=1';
 else if(filter==='pinned')sql+=' AND COALESCE(p.pinned,0)=1';
 else if(filter==='dms')sql+=" AND c.kind='dm'";
 else if(filter==='groups')sql+=" AND c.kind='group'";
 else if(filter==='communities')sql+=' AND 0';
 if(filter!=='archived')sql+=' AND COALESCE(p.archived,0)=0';
 return {filter,sql,args};
}
async function listConversations(request,url,db,user,now){
 const limit=page(url),offset=Number(url.searchParams.get('offset')||0);need(Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Use a nonnegative page offset.');
 const incoming=url.searchParams.get('cursor');let snapshot,position=offset;
 if(incoming){
  const data=decodeListCursor(incoming);position=data.p;snapshot=await q(db,'SELECT * FROM native_list_snapshots WHERE id=? AND account_id=?',data.s,user.id).first();
  need(snapshot&&snapshot.expires_at>now,409,'list_snapshot_expired','This conversation list expired. Refresh to see current activity.');
  need(!url.searchParams.has('filter')||url.searchParams.get('filter')===snapshot.filter,409,'list_filter_changed','Refresh the list after changing its filter.');
 }else{
  const selected=await conversationFilter(db,user.id,url.searchParams.get('filter'));await authRateLimit(request,db,'native-list-snapshot',120,now,user.id);
  const id=uuid(),guard=activeSession(user,now);
  await db.batch([
   q(db,'DELETE FROM native_list_snapshots WHERE id IN(SELECT id FROM native_list_snapshots WHERE expires_at<=? ORDER BY expires_at LIMIT 100)',now),
   q(db,'DELETE FROM native_list_snapshots WHERE id IN(SELECT id FROM native_list_snapshots WHERE account_id=? ORDER BY created_at DESC,id DESC LIMIT -1 OFFSET 49)',user.id),
   q(db,`INSERT INTO native_list_snapshots(id,account_id,filter,created_at,expires_at) SELECT ?,?,?,?,? WHERE ${guard.sql}`,id,user.id,selected.filter,now,now+LIST_TTL,...guard.args),
   q(db,`INSERT INTO native_list_items(snapshot_id,conversation_id,position) SELECT ?,c.id,ROW_NUMBER() OVER(ORDER BY COALESCE(p.pinned,0) DESC,c.updated_at DESC,c.id) FROM native_conversations c JOIN native_members m ON m.conversation_id=c.id AND m.account_id=? LEFT JOIN native_conversation_preferences p ON p.conversation_id=c.id AND p.account_id=m.account_id WHERE ${selected.sql} AND EXISTS(SELECT 1 FROM native_list_snapshots WHERE id=? AND account_id=?) AND ${guard.sql}`,id,user.id,...selected.args,id,user.id,...guard.args)
  ]);
  snapshot=await q(db,'SELECT * FROM native_list_snapshots WHERE id=? AND account_id=?',id,user.id).first();need(snapshot,403,'account_changed','Account access changed. Sign in again.');
 }
 const rows=(await q(db,`SELECT c.*,m.read_seq,m.read_change_seq,p.favorite,p.pinned,p.archived,p.muted,p.folder_id,item.position AS list_position FROM native_list_items item JOIN native_conversations c ON c.id=item.conversation_id JOIN native_members m ON m.conversation_id=c.id AND m.account_id=? LEFT JOIN native_conversation_preferences p ON p.conversation_id=c.id AND p.account_id=m.account_id WHERE item.snapshot_id=? AND item.position>? ORDER BY item.position LIMIT ?`,user.id,snapshot.id,position,limit+1).all()).results;
 const total=(await q(db,'SELECT COUNT(*) AS n FROM native_list_items item JOIN native_members member ON member.conversation_id=item.conversation_id AND member.account_id=? WHERE item.snapshot_id=?',user.id,snapshot.id).first()).n;
 const selected=rows.slice(0,limit),hasMore=rows.length>limit,conversations=await describeMany(db,selected,user.id);
 return json({conversations,security,total,filter:snapshot.filter,page:{limit,offset:position,hasMore,total,currentCursor:encodeListCursor(snapshot.id,position),cursor:encodeListCursor(snapshot.id,position),nextCursor:hasMore?encodeListCursor(snapshot.id,selected.at(-1).list_position):null,snapshotExpiresAt:snapshot.expires_at,snapshot:true,scope:'account',legacyOffset:url.searchParams.has('offset')}});
}
function standardSearch(url){
 const query=String(url.searchParams.get('q')||'').trim(),author=String(url.searchParams.get('author')||url.searchParams.get('authorId')||'').trim().replace(/^@/,'').toLowerCase(),id=url.searchParams.get('conversationId'),has=url.searchParams.get('has')||'text';
 need(query.length<=200&&author.length<=100,400,'invalid_search','Use a shorter search or author.');need(['text','links'].includes(has),400,'invalid_search','Choose text or links.');
 const sql=["m.deleted_at IS NULL","c.security_mode='standard'"],args=[];
 if(query){sql.push("m.text LIKE ? ESCAPE '\\'");args.push('%'+query.replace(/[\\%_]/g,'\\$&')+'%');}
 if(author){sql.push('(a.id=? OR a.username=?)');args.push(author,author);}
 if(id){need(/^[a-f0-9-]{36}$/i.test(id),400,'invalid_conversation','Choose a valid conversation.');sql.push('m.conversation_id=?');args.push(id);}
 if(has==='links')sql.push("(m.text LIKE '%https://%' OR m.text LIKE '%http://%')");
 const dates={};for(const key of ['after','before']){const value=url.searchParams.get(key);if(value){const time=Date.parse(value+'T00:00:00Z');need(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value,400,'invalid_date','Use a valid UTC date in YYYY-MM-DD format.');dates[key]=time;sql.push('m.created_at'+(key==='after'?'>=':'<')+'?');args.push(time);}}
 need(dates.after===undefined||dates.before===undefined||dates.after<dates.before,400,'invalid_date','After must be earlier than Before.');return {sql:sql.join(' AND '),args};
}
async function searchOrSaved(url,db,user,saved){
 const limit=page(url),offset=Number(url.searchParams.get('offset')||0);need(Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Use a valid page offset.');
 const filter=saved?{sql:"m.deleted_at IS NULL AND c.security_mode='standard' AND bookmark.saved=1",args:[]}:standardSearch(url);
 const join=`${joins} JOIN native_conversations c ON c.id=m.conversation_id JOIN native_members member ON member.conversation_id=m.conversation_id AND member.account_id=?`+(saved?' JOIN native_bookmarks bookmark ON bookmark.message_id=m.id AND bookmark.account_id=member.account_id':'');
 const total=(await q(db,'SELECT COUNT(*) AS n '+join+' WHERE '+filter.sql,user.id,...filter.args).first()).n;
 const rows=(await q(db,`SELECT ${columns},c.name AS conversation_name,c.kind AS conversation_kind${saved?',bookmark.updated_at AS saved_at':''} ${join} WHERE ${filter.sql} ORDER BY ${saved?'bookmark.updated_at DESC,':''}m.seq DESC LIMIT ? OFFSET ?`,user.id,...filter.args,limit,offset).all()).results;
 return json({messages:await enrich(db,rows,user.id),total,page:{limit,offset,hasMore:offset+rows.length<total},scope:saved?'synced-standard-bookmarks':'authorized-standard-history',security});
}
async function bookmarkMessage(db,user,id,body,now){
 need(typeof body.saved==='boolean',400,'invalid_bookmark','Choose whether this message is saved.');const active=activeSession(user,now);
 if(!body.saved){const result=await db.batch([q(db,`UPDATE auth_sessions SET last_active_at=last_active_at WHERE id=? AND ${active.sql}`,user.sessionId,...active.args),q(db,`UPDATE native_bookmarks SET saved=0,revision=revision+1,updated_at=? WHERE account_id=? AND message_id=? AND ${active.sql}`,now,user.id,id,...active.args)]);need(result[0]?.meta?.changes>0,403,'account_changed','Account access changed.');}
 else{
  const message=await getMessage(db,id,user.id),guard=memberGuard(user,message.conversation_id,now);
  const result=await q(db,`INSERT INTO native_bookmarks(account_id,message_id,saved,revision,created_at,updated_at) SELECT ?,id,1,1,?,? FROM native_messages WHERE id=? AND deleted_at IS NULL AND ${guard.sql} ON CONFLICT(account_id,message_id) DO UPDATE SET saved=1,revision=native_bookmarks.revision+1,updated_at=excluded.updated_at`,user.id,now,now,id,...guard.args).run();
  need(result.meta?.changes>0,409,'message_changed','This source or its membership changed.');
 }
 const row=await q(db,'SELECT saved,revision FROM native_bookmarks WHERE account_id=? AND message_id=?',user.id,id).first();return json({messageId:id,saved:!!row?.saved,bookmarkRevision:row?.revision||0});
}
async function manageGroup(db,user,record,action,target,body,now){
 need(record.kind==='group',400,'invalid_action','This action belongs to a group conversation.');const guard=ownerGuard(user,record.id,now);
 if(action==='settings'){
  const name=String(body.name||'').trim();need(name.length>0&&name.length<=64&&!/\u0000/.test(name),400,'invalid_name','Use a group name between 1 and 64 characters.');
  const result=await db.batch([q(db,`UPDATE native_conversations SET name=?,updated_at=? WHERE id=? AND ${guard.sql}`,name,now,record.id,...guard.args),audit(db,user,'settings',record.id,{fields:['name']},now,guard)]);need(result[0]?.meta?.changes>0,403,'group_owner_required','Only the current group owner can change settings.');
 }else if(action==='add'){
  acknowledgement(body);need(Array.isArray(body.usernames)&&body.usernames.length>=1&&body.usernames.length<NATIVE_GROUP_LIMIT,400,'invalid_recipients','Choose friends to add.');const names=body.usernames.map(normalizeUsername);need(new Set(names).size===names.length,400,'invalid_recipients','Choose each friend once.');
  const people=(await q(db,`SELECT id FROM live_accounts WHERE username IN(${names.map(()=>'?').join(',')}) AND account_status='active' AND username IS NOT NULL`,...names).all()).results;need(people.length===names.length,404,'recipient_unavailable','Choose available friends.');const ids=people.map(p=>p.id),encoded=JSON.stringify(ids);
  const eligibility=`${guard.sql} AND (SELECT COUNT(*) FROM native_members WHERE conversation_id=?) + (SELECT COUNT(*) FROM json_each(?) j WHERE NOT EXISTS(SELECT 1 FROM native_members WHERE conversation_id=? AND account_id=j.value))<=? AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE j.value<>? AND NOT EXISTS(SELECT 1 FROM social_requests f WHERE f.state='accepted' AND ((f.sender_id=? AND f.recipient_id=j.value) OR(f.recipient_id=? AND f.sender_id=j.value)))) AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE (b.blocker_id IN(SELECT value FROM json_each(?)) AND b.blocked_id IN(SELECT account_id FROM native_members WHERE conversation_id=?)) OR(b.blocked_id IN(SELECT value FROM json_each(?)) AND b.blocker_id IN(SELECT account_id FROM native_members WHERE conversation_id=?)) OR(b.blocker_id IN(SELECT value FROM json_each(?)) AND b.blocked_id IN(SELECT value FROM json_each(?)))) AND NOT EXISTS(SELECT 1 FROM json_each(?) j LEFT JOIN live_accounts a ON a.id=j.value WHERE a.id IS NULL OR a.account_status<>'active' OR a.username IS NULL)`;
  const args=[...guard.args,record.id,encoded,record.id,NATIVE_GROUP_LIMIT,encoded,user.id,user.id,user.id,encoded,record.id,encoded,record.id,encoded,encoded,encoded];
  const writes=[q(db,`UPDATE native_conversations SET updated_at=? WHERE id=? AND ${eligibility}`,now,record.id,...args),audit(db,user,'members.add',record.id,{accountIds:ids},now,{sql:eligibility+' AND changes()=1',args})];
  for(const id of ids)writes.push(q(db,`INSERT OR IGNORE INTO native_members(conversation_id,account_id,joined_at) SELECT id,?,? FROM native_conversations WHERE id=? AND ${eligibility}`,id,now,record.id,...args));
  const result=await db.batch(writes);need(result[0]?.meta?.changes>0,403,'group_membership_changed','Group permission, friendship, blocking or capacity changed.');
 }else if(action==='remove'){
  need(typeof target==='string'&&target!==user.id,400,'invalid_member','Use Leave for yourself.');
  const protectedGuard={sql:guard.sql+' AND EXISTS(SELECT 1 FROM native_conversations c JOIN native_members m ON m.conversation_id=c.id WHERE c.id=? AND c.owner_id<>? AND m.account_id=?)',args:[...guard.args,record.id,target,target]};
  const result=await db.batch([q(db,`UPDATE native_conversations SET updated_at=? WHERE id=? AND ${protectedGuard.sql}`,now,record.id,...protectedGuard.args),audit(db,user,'members.remove',record.id,{accountId:target},now,{sql:protectedGuard.sql+' AND changes()=1',args:protectedGuard.args}),q(db,`DELETE FROM native_members WHERE conversation_id=? AND account_id=? AND ${protectedGuard.sql}`,record.id,target,...protectedGuard.args)]);need(result[0]?.meta?.changes>0&&result[2]?.meta?.changes>0,403,'group_owner_required','Only the current group owner can remove another member.');
 }else if(action==='transfer'){
  need(typeof body.accountId==='string'&&body.accountId!==user.id,400,'invalid_member','Choose another current group member.');
  const transfer={sql:guard.sql+" AND EXISTS(SELECT 1 FROM native_members m JOIN live_accounts a ON a.id=m.account_id WHERE m.conversation_id=? AND m.account_id=? AND a.account_status='active' AND a.username IS NOT NULL)",args:[...guard.args,record.id,body.accountId]};
  const result=await db.batch([audit(db,user,'owner.transfer',record.id,{accountId:body.accountId},now,transfer),q(db,`UPDATE native_conversations SET owner_id=?,updated_at=? WHERE id=? AND ${transfer.sql}`,body.accountId,now,record.id,...transfer.args)]);need(result[1]?.meta?.changes>0,409,'group_owner_changed','Group ownership or membership changed. Refresh before transferring.');
 }else throw new AuthError(404,'not_found','This group action is unavailable.');
 return json({conversation:await describe(db,await accessibleNativeConversation(db,record.id,user.id),user.id),acknowledged:true});
}

export async function handleMessagesRequest(request,env){
 try{
  const url=new URL(request.url),method=request.method;
  need(url.pathname==='/api/messages'||url.pathname.startsWith('/api/messages/'),404,'not_found','No messaging action matches this request.');need(['GET','POST'].includes(method),405,'method_not_allowed','Use a supported messaging action.');
  const user=await authenticate(request,env),db=env.DB,now=Date.now(),path=url.pathname.replace(/^\/api\/messages\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);let body;
  if(method==='POST'){body=await bodyJSON(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'native-messages',90,now,user.id);}
  if(path.length===0&&method==='GET')return json({available:true,security,transport:'cursor-polling'});
  if(method==='GET'&&path.length===1&&['search','saved'].includes(path[0]))return await searchOrSaved(url,db,user,path[0]==='saved');
  if(path[0]==='conversations'&&path.length===1){
   if(method==='GET'){
    return await listConversations(request,url,db,user,now);
   }
   acknowledgement(body);retryId(body.clientId);need(['dm','group'].includes(body.kind),400,'invalid_kind','Choose a direct message or private group.');
   need(Array.isArray(body.usernames)&&body.usernames.length>=1&&body.usernames.length<=(body.kind==='dm'?1:NATIVE_GROUP_LIMIT-1),400,'invalid_recipients','Choose one friend for a direct message or up to fifteen for a group.');
   const names=body.usernames.map(normalizeUsername);need(new Set(names).size===names.length,400,'invalid_recipients','Choose each recipient once.');
   const recipients=(await q(db,`SELECT id,username FROM live_accounts WHERE username IN (${names.map(()=>'?').join(',')}) AND account_status='active'`,...names).all()).results;
   need(recipients.length===names.length&&!recipients.some(a=>a.id===user.id),404,'recipient_unavailable','Choose existing friends who can receive this conversation.');
   const ids=[user.id,...recipients.map(r=>r.id)].sort(),name=body.kind==='dm'?'':String(body.name||'').trim();need(body.kind==='dm'||(name.length>=1&&name.length<=64),400,'invalid_name','Use a group name between 1 and 64 characters.');
   const guard=creationGuard(user,ids,now);need(await q(db,'SELECT 1 AS allowed WHERE '+guard.sql,...guard.args).first(),403,'recipient_unavailable','Choose accepted friends with no active blocks.');
   const requestHash=await hash(JSON.stringify([body.kind,ids,name])),pairKey=body.kind==='dm'?await hash(JSON.stringify(ids)):null;
   let previous=await q(db,'SELECT * FROM native_conversations WHERE created_by=? AND client_id=?',user.id,body.clientId).first();
   if(previous){need(previous.request_hash===requestHash,409,'idempotency_conflict','This request ID belongs to a different conversation.');await accessibleNativeConversation(db,previous.id,user.id);return json({conversation:await describe(db,previous,user.id),security});}
   if(pairKey){previous=await q(db,'SELECT * FROM native_conversations WHERE pair_key=?',pairKey).first();if(previous){await accessibleNativeConversation(db,previous.id,user.id);return json({conversation:await describe(db,previous,user.id),security});}}
   const id=uuid(),writes=[q(db,`INSERT OR IGNORE INTO native_conversations(id,kind,name,security_mode,owner_id,created_by,client_id,request_hash,pair_key,created_at,updated_at) SELECT ?,?,?,'standard',?,?,?,?,?,?,? WHERE ${guard.sql}`,id,body.kind,name,body.kind==='group'?user.id:null,user.id,body.clientId,requestHash,pairKey,now,now,...guard.args)];
   for(const accountId of ids)writes.push(q(db,'INSERT OR IGNORE INTO native_members(conversation_id,account_id,joined_at) SELECT id,?,? FROM native_conversations WHERE id=? AND created_by=? AND request_hash=?',accountId,now,id,user.id,requestHash));
   const result=await db.batch(writes);
   const record=await q(db,'SELECT * FROM native_conversations WHERE (created_by=? AND client_id=?)'+(pairKey?' OR pair_key=?':''),user.id,body.clientId,...(pairKey?[pairKey]:[])).first();
   need(record,403,'recipient_unavailable','Conversation eligibility changed. No conversation was created.');need(record.request_hash===requestHash,409,'idempotency_conflict','This request ID belongs to a different conversation.');
   await accessibleNativeConversation(db,record.id,user.id);return json({conversation:await describe(db,record,user.id),security},result[0]?.meta?.changes>0?201:200);
  }
  if(path[0]==='conversations'&&path.length>=2){
   const id=path[1],conversation=await accessibleNativeConversation(db,id,user.id);
   if(path.length===2&&method==='GET')return json({conversation:await describe(db,conversation,user.id),security});
   if(method==='POST'&&path.length===3&&['settings','members','transfer'].includes(path[2]))return await manageGroup(db,user,conversation,path[2]==='members'?'add':path[2],null,body,now);
   if(method==='POST'&&path.length===5&&path[2]==='members'&&path[4]==='remove')return await manageGroup(db,user,conversation,'remove',path[3],body,now);
   if(path.length===3&&path[2]==='read'&&method==='POST'){
    need(Number.isSafeInteger(body.seq)&&body.seq>=0,400,'invalid_cursor','Use a nonnegative read position.');if(body.changeSeq!==undefined)need(Number.isSafeInteger(body.changeSeq)&&body.changeSeq>=0,400,'invalid_cursor','Use a valid activity position.');
    const active=activeSession(user,now);const result=await q(db,`UPDATE native_members SET read_seq=MAX(read_seq,MIN(?,(SELECT COALESCE(MAX(seq),0) FROM native_messages WHERE conversation_id=?))),read_change_seq=MAX(read_change_seq,MIN(?,(SELECT COALESCE(MAX(seq),0) FROM native_changes WHERE conversation_id=?))) WHERE conversation_id=? AND account_id=? AND ${active.sql}`,body.seq,id,body.changeSeq??0,id,id,user.id,...active.args).run();need(result.meta?.changes>0,403,'conversation_unavailable','Membership or account access changed.');return json({read:true});
   }
   if(path.length===3&&path[2]==='leave'&&method==='POST'){need(conversation.kind==='group',400,'invalid_action','Direct messages can be archived in organization settings.');const active=activeSession(user,now),canLeave="NOT EXISTS(SELECT 1 FROM native_conversations c WHERE c.id=? AND c.owner_id=? AND EXISTS(SELECT 1 FROM native_members m WHERE m.conversation_id=c.id AND m.account_id<>?))";const result=await q(db,'DELETE FROM native_members WHERE conversation_id=? AND account_id=? AND '+active.sql+' AND '+canLeave,id,user.id,...active.args,id,user.id,user.id).run();need(result.meta?.changes>0,409,'group_leave_conflict','Transfer group ownership before leaving, or refresh changed membership.');return json({left:true});}
   if(path.length===3&&path[2]==='messages'){
    if(method==='GET'){
     const limit=page(url),before=cursor(url.searchParams.get('before')),after=cursor(url.searchParams.get('after')),changesAfter=cursor(url.searchParams.get('changesAfter'));
     need(before===null||after===null,400,'invalid_cursor','Use before or after, not both.');const high=(await q(db,'SELECT COALESCE(MAX(seq),0) AS seq FROM native_changes WHERE conversation_id=?',id).first()).seq;
     const records=(await q(db,`SELECT ${columns} ${joins} WHERE m.conversation_id=? ${after!==null?'AND m.seq>?':before!==null?'AND m.seq<?':''} ORDER BY m.seq ${after!==null?'ASC':'DESC'} LIMIT ?`,id,...(after!==null?[after]:before!==null?[before]:[]),limit+1).all()).results;
     const selected=records.slice(0,limit),messages=after!==null?selected:selected.reverse();let changes=[],changeCursor=high,changesHasMore=false;
     if(changesAfter!==null){const events=(await q(db,'SELECT seq,message_id FROM native_changes WHERE conversation_id=? AND seq>? AND seq<=? ORDER BY seq LIMIT ?',id,changesAfter,high,limit+1).all()).results,window=events.slice(0,limit),ids=[...new Set(window.map(e=>e.message_id))];changeCursor=window.at(-1)?.seq??changesAfter;changesHasMore=events.length>limit;if(ids.length){const changed=[];for(let n=0;n<ids.length;n+=80){const part=ids.slice(n,n+80);changed.push(...(await q(db,`SELECT ${columns} ${joins} WHERE m.conversation_id=? AND m.id IN(${part.map(()=>'?').join(',')})`,id,...part).all()).results);}changes=await enrich(db,changed,user.id);}}
     return json({messages:await enrich(db,messages,user.id),changes,hasMore:records.length>limit,cursor:messages[0]?.seq??before??0,changeCursor,changesHasMore,securityMode:'standard',endToEndEncrypted:false,page:{hasMore:records.length>limit,before:messages[0]?.seq??before??null,after:messages.at(-1)?.seq??after??0}});
    }
    acknowledgement(body);retryId(body.clientId);const text=textValue(body.text),replyToId=body.replyToId||null;need(replyToId===null||(typeof replyToId==='string'&&replyToId.length<=100),400,'invalid_reply','Choose a valid reply source.');
    const guard=await ensureWritable(db,user,id,now),originalHash=await hash(JSON.stringify([text,replyToId]));
    const previous=await q(db,'SELECT * FROM native_messages WHERE conversation_id=? AND author_id=? AND client_id=?',id,user.id,body.clientId).first();
    if(previous){need(previous.original_hash===originalHash,409,'idempotency_conflict','This retry ID belongs to another message.');return json({message:await getMessage(db,previous.id,user.id),acknowledged:true});}
    if(replyToId){const source=await getMessage(db,replyToId,user.id);need(source.conversation_id===id,400,'invalid_reply','Reply inside this conversation.');need(!source.deleted_at,409,'source_deleted','This reply source was deleted.');}
    const messageId=uuid(),replySQL=replyToId?' AND EXISTS(SELECT 1 FROM native_messages WHERE id=? AND conversation_id=? AND deleted_at IS NULL)':'';
    await db.batch([
     q(db,`INSERT OR IGNORE INTO native_messages(id,conversation_id,author_id,client_id,text,reply_to_id,original_hash,created_at) SELECT ?,?,?,?,?,?,?,? WHERE ${guard.sql}${replySQL}`,messageId,id,user.id,body.clientId,text,replyToId,originalHash,now,...guard.args,...(replyToId?[replyToId,id]:[])),
     q(db,"INSERT INTO native_changes(conversation_id,message_id,actor_id,kind,created_at) SELECT conversation_id,id,?,'send',? FROM native_messages WHERE id=?",user.id,now,messageId),
     q(db,'UPDATE native_conversations SET updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM native_messages WHERE id=?)',now,id,messageId)
    ]);
    const stored=await q(db,'SELECT id,original_hash FROM native_messages WHERE conversation_id=? AND author_id=? AND client_id=?',id,user.id,body.clientId).first();need(stored,403,'conversation_restricted','Conversation or account access changed. The message was not sent.');need(stored.original_hash===originalHash,409,'idempotency_conflict','This retry ID belongs to another message.');return json({message:await getMessage(db,stored.id,user.id),acknowledged:true},stored.id===messageId?201:200);
   }
  }
  if(method==='POST'&&path.length===3&&path[0]==='messages'&&path[2]==='bookmark')return await bookmarkMessage(db,user,path[1],body,now);
  if(path[0]==='messages'&&(path.length===2||path.length===3)){
   const message=await getMessage(db,path[1],user.id);if(path.length===2&&method==='GET')return json({message,security});
   need(method==='POST'&&path.length===3,405,'method_not_allowed','Choose a supported message action.');const action=path[2];need(['edit','delete','react'].includes(action),404,'not_found','This message action is unavailable.');
   const guard=action==='delete'?memberGuard(user,message.conversation_id,now):await ensureWritable(db,user,message.conversation_id,now);if(action!=='delete'){guard.sql+=' AND EXISTS(SELECT 1 FROM native_messages source WHERE source.id=? AND source.deleted_at IS NULL)';guard.args.push(message.id);}need(!message.deleted_at||action==='delete',409,'source_deleted','This message was deleted.');
   if(action==='edit'||action==='delete')need(message.author_id===user.id,403,'ownership_required','Only the author can change this message.');
   const writes=[q(db,'UPDATE native_members SET joined_at=joined_at WHERE conversation_id=? AND account_id=? AND '+guard.sql,message.conversation_id,user.id,...guard.args)];
   if(action==='edit'){acknowledgement(body);const text=textValue(body.text);writes.push(q(db,'UPDATE native_messages SET text=?,edited_at=? WHERE id=? AND deleted_at IS NULL AND '+guard.sql,text,now,message.id,...guard.args));}
   else if(action==='delete')writes.push(q(db,"UPDATE native_messages SET text='',deleted_at=COALESCE(deleted_at,?) WHERE id=? AND "+guard.sql,now,message.id,...guard.args),q(db,'DELETE FROM native_reactions WHERE message_id=? AND '+guard.sql,message.id,...guard.args));
   else{need(REACTIONS.includes(body.emoji)&&typeof body.active==='boolean',400,'invalid_reaction','Choose an available reaction and its state.');writes.push(body.active?q(db,'INSERT OR IGNORE INTO native_reactions(message_id,account_id,emoji,created_at) SELECT id,?,?,? FROM native_messages WHERE id=? AND deleted_at IS NULL AND '+guard.sql,user.id,body.emoji,now,message.id,...guard.args):q(db,'DELETE FROM native_reactions WHERE message_id=? AND account_id=? AND emoji=? AND '+guard.sql,message.id,user.id,body.emoji,...guard.args));}
   writes.push(q(db,'INSERT INTO native_changes(conversation_id,message_id,actor_id,kind,created_at) SELECT conversation_id,id,?,?,? FROM native_messages WHERE id=? AND '+guard.sql,user.id,action,now,message.id,...guard.args));
   const results=await db.batch(writes);need(results[0]?.meta?.changes>0,409,'message_changed','The message or conversation access changed. Refresh before retrying.');return json({message:await getMessage(db,message.id,user.id),acknowledged:true});
  }
  throw new AuthError(404,'not_found','No messaging action matches this request.');
 }catch(error){return json({error:{code:error instanceof AuthError?error.code:'messaging_unavailable',message:error instanceof AuthError?error.message:'The message could not be committed. Retry using the same request ID.'}},error instanceof AuthError?error.status:503);}
}
export default {fetch:handleMessagesRequest};
