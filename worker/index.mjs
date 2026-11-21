import {profileAvatarsForViewer,unavailableAvatar} from './identity.mjs';
import {authenticate, validateSessionMutation, normalizeUsername, AuthError} from './auth.mjs';
import {standardAttachmentIds,stagedAttachmentGuard,claimStandardAttachments,standardAttachmentMetadata} from './attachments.mjs';
import {readProfile,profileAuthorChanges,profileNativeAuthorChanges} from './profiles.mjs';
/**
 * Authenticated standard-text API for Sites Workers + D1.
 * The build embeds this handler alongside the authored browser client.
 * Opaque account sessions authorize every private object; no identity header grants access.
 */

const PREFIX = '/api/live';
const MAX_BODY = 16 * 1024;
const uuid = () => crypto.randomUUID();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  },
});

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireThat(condition, status, code, message) {
  if (!condition) throw new ApiError(status, code, message);
}

async function bodyJSON(request, authenticatedAccountId) {
  requireThat(request.headers.get('content-type')?.split(';')[0].trim() === 'application/json',
    415, 'json_required', 'Send an application/json request.');
  const declared = Number(request.headers.get('content-length') || 0);
  requireThat(declared <= MAX_BODY, 413, 'body_too_large', 'The request is too large.');
  const reader = request.body?.getReader();
  requireThat(reader, 400, 'body_required', 'A JSON body is required.');
  let size = 0;
  const chunks = [];
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      throw new ApiError(413, 'body_too_large', 'The request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch {
    throw new ApiError(400, 'invalid_json', 'The JSON body could not be read.');
  }
  requireThat(data && typeof data === 'object' && !Array.isArray(data), 400, 'invalid_body', 'Use a JSON object.');
  requireThat(data.expectedAccountId === authenticatedAccountId,
    409, 'account_changed', 'Your signed-in account changed. Reconnect before submitting this change.');
  return data;
}

function nameValue(value, maximum = 64) {
  requireThat(typeof value === 'string', 400, 'invalid_name', 'A name is required.');
  const name = value.trim();
  requireThat(name.length > 0 && name.length <= maximum, 400, 'invalid_name', `Use a name between 1 and ${maximum} characters.`);
  return name;
}

function cursorValue(value) {
  if (value == null) return null;
  requireThat(/^\d+$/.test(value) && Number.isSafeInteger(Number(value)), 400, 'invalid_cursor', 'Use a nonnegative integer cursor.');
  return Number(value);
}

async function tokenHash(token) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
}

function query(db, sql, ...values) { return db.prepare(sql).bind(...values); }

async function membership(db, communityId, userId) {
  const member = await query(db,
    'SELECT m.role,c.created_by AS owner_id,c.ownership_revision,c.ownership_repair_required FROM live_memberships m JOIN live_communities c ON c.id=m.community_id WHERE m.community_id = ? AND m.account_id = ?', communityId, userId).first();
  requireThat(member, 403, 'membership_required', 'You do not have access to this community.');
  return member;
}

async function requireOwner(db, communityId, userId) {
  const member = await membership(db, communityId, userId);
  requireThat(member.role === 'owner'&&member.owner_id===userId&&!member.ownership_repair_required, 403, 'owner_required', 'Only the community owner can perform this action.');
}

const channelMembership = `FROM live_channels c
  JOIN live_memberships m ON m.community_id = c.community_id
  JOIN live_communities g ON g.id = c.community_id
  WHERE c.id = ? AND m.account_id = ?`;

async function accessibleChannel(db, channelId, userId) {
  requireThat(typeof channelId==='string'&&channelId.length>0&&channelId.length<=100,400,'invalid_channel','Choose a valid shared channel.');
  const channel = await query(db,
    `SELECT c.id, c.community_id, c.name, c.kind, m.role,g.ownership_repair_required ${channelMembership}`,
    channelId, userId).first();
  requireThat(channel, 403, 'channel_access_denied', 'You do not have access to this channel.');
  return channel;
}

// Check the viewer again after loading history and its related profile/media records.
async function currentChannelReadAccess(db, channelId, user) {
  const now = Date.now(), session = activeSessionGuard(user, now);
  const channel = await query(db,
    `SELECT c.kind, m.role, g.ownership_repair_required,
       EXISTS(SELECT 1 FROM community_timeouts t WHERE t.community_id=c.community_id
              AND t.account_id=m.account_id AND t.expires_at>?) AS timed_out
       ${channelMembership} AND ${session.sql}`,
    now, channelId, user.id, ...session.args).first();
  requireThat(channel, 403, 'channel_access_denied', 'You do not have access to this channel.');
  return channel;
}

// These conditions are repeated inside mutations so a prior authorization read
// cannot outlive a role change, membership departure or session revocation.
function activeSessionGuard(user,now){return {sql:"EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active' AND a.onboarding_complete=1)",args:[user.sessionId,user.id,now]};}
function communityMutationGuard(user,communityId,now,{ownerOnly=false,targetId=null,targetRule='member',allowModerator=false}={}){
 const active=activeSessionGuard(user,now);
 const role=ownerOnly?"actor.role='owner' AND c.created_by=actor.account_id":allowModerator?"((actor.role='owner' AND c.created_by=actor.account_id) OR actor.role='moderator')":"1=1";
 const target=targetId?` AND EXISTS(SELECT 1 FROM live_memberships target JOIN live_accounts ta ON ta.id=target.account_id WHERE target.community_id=c.id AND target.account_id=?${targetRule==='active'?" AND ta.account_status='active' AND ta.username IS NOT NULL":targetRule==='mutable'?" AND target.account_id<>c.created_by AND target.role<>'owner' AND (actor.role='owner' OR target.role='member')":''})`:'';
 return {sql:`${active.sql} AND EXISTS(SELECT 1 FROM live_communities c JOIN live_memberships actor ON actor.community_id=c.id WHERE c.id=? AND actor.account_id=? AND c.ownership_repair_required=0 AND ${role}${target})`,args:[...active.args,communityId,user.id,...(targetId?[targetId]:[])]};
}
function mentionsValue(value){requireThat(value===undefined||(Array.isArray(value)&&value.length<=20&&new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&id.length>0&&id.length<=100)),400,'invalid_mentions','Choose up to twenty distinct current community members.');return [...(value||[])].sort();}
async function mentionTargets(db,communityId,ids,{strict=true}={}){
 if(!ids.length)return [];
 const rows=(await query(db,`SELECT m.account_id FROM live_memberships m JOIN live_accounts a ON a.id=m.account_id WHERE m.community_id=? AND m.account_id IN (${ids.map(()=>'?').join(',')}) AND a.account_status='active' AND a.username IS NOT NULL`,communityId,...ids).all()).results.map(row=>row.account_id).sort();
 requireThat(!strict||rows.length===ids.length,400,'invalid_mentions','Mention only current community members.');return rows;
}
function includeMentionGuard(guard,communityId,ids){if(ids.length){guard.sql+=` AND (SELECT COUNT(*) FROM live_memberships mentioned JOIN live_accounts ma ON ma.id=mentioned.account_id WHERE mentioned.community_id=? AND mentioned.account_id IN (${ids.map(()=>'?').join(',')}) AND ma.account_status='active' AND ma.username IS NOT NULL)=?`;guard.args.push(communityId,...ids,ids.length);}return guard;}

// Native standard text is an explicit mode, never a fallback for Matrix IDs.
function channelWriteGuard(user,channelId,now,{staffOnly=false,cleanup=false}={}) {
 const sql=`EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active' AND a.onboarding_complete=1)
  AND EXISTS(SELECT 1 FROM live_channels c JOIN live_memberships mem ON mem.community_id=c.community_id JOIN live_communities g ON g.id=c.community_id WHERE c.id=? AND mem.account_id=?${cleanup&&!staffOnly?'':' AND g.ownership_repair_required=0'}${staffOnly?" AND mem.role IN('owner','moderator')":''})
  ${cleanup?'':"AND NOT EXISTS(SELECT 1 FROM community_timeouts t JOIN live_channels c ON c.community_id=t.community_id WHERE c.id=? AND t.account_id=? AND t.expires_at>?)"}`;
 return {sql,args:[user.sessionId,user.id,now,channelId,user.id,...(cleanup?[]:[channelId,user.id,now])]};
}
async function requireChannelWrite(db,user,channelId,now,options){if(!(options?.cleanup&&!options?.staffOnly)){const channel=await query(db,'SELECT g.ownership_repair_required FROM live_channels c JOIN live_communities g ON g.id=c.community_id WHERE c.id=?',channelId).first();requireThat(!channel?.ownership_repair_required,409,'ownership_repair_required','This community needs an ownership review before new changes can be made.');}const guard=channelWriteGuard(user,channelId,now,options);requireThat(await query(db,'SELECT 1 AS allowed WHERE '+guard.sql,...guard.args).first(),403,'posting_denied','Your membership, account status or community restriction prevents this action.');return guard;}
const messageColumns = `m.seq,m.id,m.channel_id,m.author_id,a.display_name AS author_name,
 m.client_id,m.text,m.revision,m.created_at,m.reply_to_id,m.thread_root_id,m.edited_at,m.deleted_at,m.pinned,
 c.community_id,c.name AS channel_name,g.name AS community_name,
 COALESCE((SELECT MAX(ch.seq) FROM live_changes ch WHERE ch.message_id=m.id),0) AS change_seq`;
const messageJoins = 'FROM live_messages m JOIN live_accounts a ON a.id=m.author_id JOIN live_channels c ON c.id=m.channel_id JOIN live_communities g ON g.id=c.community_id';
const publicProfile = a => ({id:a.id,displayName:a.display_name,needsProfile:a.display_name==='New resident',bio:a.bio,status:a.status,theme:a.theme,avatar:a.avatar});
const staff = role => ['owner','moderator'].includes(role);
// Default rail mark from a community name: "Test Lounge" -> "TL", "Voidline" -> "VO".
function communityInitials(name) { const words=String(name||'').trim().split(/\s+/).filter(Boolean); const letters=words.length>1?words.slice(0,2).map(word=>Array.from(word)[0]).join(''):Array.from(words[0]||'').slice(0,2).join(''); return letters.toUpperCase()||'#'; }
const textValue = (v,max,field) => { requireThat(typeof v==='string' && v.length<=max,400,'invalid_'+field,`${field} must contain at most ${max} characters.`); return v.trim(); };
function paging(url,maximum=100) {
 const limit = Number(url.searchParams.get('limit') ?? 50),offset=Number(url.searchParams.get('offset') ?? 0);
 requireThat(Number.isSafeInteger(limit)&&limit>=1&&limit<=maximum&&Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Use a page size from 1 to 100 and a nonnegative offset.');
 return {limit,offset};
}
const pageInfo = (limit,offset,total) => ({limit,offset,hasMore:offset+limit<total});
function communityAudit(db,actor,action,targetType,targetId,now,detail={},onlyAfterChange=false) { return query(db,'INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at) '+(onlyAfterChange?'SELECT ?,?,?,?,?,?,? WHERE changes()=1':'VALUES(?,?,?,?,?,?,?)'),uuid(),actor,'community.'+action,targetType,targetId,JSON.stringify(detail),now); }
async function commitCommunityChange(db,statement,audit){const results=await db.batch([statement,audit]);requireThat(results[0]?.meta?.changes>0,409,'community_changed','Ownership, membership or account access changed. Refresh before trying again.');return results;}
async function enriched(db,messages,userId) {
 if(!messages.length)return [];
 if(messages.length>80){const result=[];for(let i=0;i<messages.length;i+=80)result.push(...await enriched(db,messages.slice(i,i+80),userId));return result;}
 const ids=messages.map(m=>m.id),slots=ids.map(()=>'?').join(',');
 const [reactions,saved,threads,mentions,media,avatars] = await Promise.all([
  query(db,`SELECT message_id,emoji,COUNT(*) AS count,MAX(CASE WHEN account_id=? THEN 1 ELSE 0 END) AS mine FROM live_reactions WHERE message_id IN (${slots}) GROUP BY message_id,emoji`,userId,...ids).all(),
  query(db,`SELECT message_id FROM live_bookmarks WHERE account_id=? AND message_id IN (${slots})`,userId,...ids).all(),
  query(db,`SELECT thread_root_id,COUNT(*) AS count FROM live_messages WHERE thread_root_id IN (${slots}) AND deleted_at IS NULL GROUP BY thread_root_id`,...ids).all(),
  query(db,`SELECT message_id,account_id FROM live_message_mentions WHERE message_id IN (${slots})`,...ids).all(),
  query(db,`SELECT id,live_message_id,kind,content_type,filename,bytes,width,height FROM media_assets WHERE live_message_id IN (${slots}) AND state='attached' ORDER BY message_position,id`,...ids).all(),
  profileAvatarsForViewer(db,userId,messages.map(m=>m.author_id))
 ]);
 const refs=[...new Set(messages.map(m=>m.reply_to_id).filter(Boolean))];
 const previews=refs.length?(await query(db,`SELECT m.id,m.text,m.deleted_at,m.thread_root_id,a.display_name AS author_name FROM live_messages m JOIN live_accounts a ON a.id=m.author_id WHERE m.id IN (${refs.map(()=>'?').join(',')})`,...refs).all()).results:[];
 return messages.map(m=>({...m,author_avatar:(avatars.get(m.author_id)||unavailableAvatar).avatar,authorAvatarMedia:avatars.get(m.author_id)?.avatarMedia||null,author_profile_available:avatars.has(m.author_id),author_name_style:avatars.get(m.author_id)?.nameStyle||'plain',author_avatar_media_id:avatars.get(m.author_id)?.avatarMedia?.id||null,attachments:m.deleted_at?[]:media.results.filter(a=>a.live_message_id===m.id).map(standardAttachmentMetadata),mention_ids:mentions.results.filter(t=>t.message_id===m.id).map(t=>t.account_id),pinned:!!m.pinned,reactions:reactions.results.filter(r=>r.message_id===m.id).map(r=>({emoji:r.emoji,count:r.count,mine:!!r.mine})),saved:saved.results.some(r=>r.message_id===m.id),thread_count:threads.results.find(t=>t.thread_root_id===m.id)?.count||0,reply_preview:previews.find(p=>p.id===m.reply_to_id)||null}));
}
async function getMessage(db,id,userId) {
 const message=await query(db,`SELECT ${messageColumns} ${messageJoins} WHERE m.id=?`,id).first();
 requireThat(message,404,'message_unavailable','This message is no longer available.');
 await accessibleChannel(db,message.channel_id,userId);
 return (await enriched(db,[message],userId))[0];
}
function dateValue(value) {
 if(value===null)return null;
 requireThat(/^\d{4}-\d{2}-\d{2}$/.test(value),400,'invalid_date','Use dates in YYYY-MM-DD format (UTC).');
 const ms=Date.parse(value+'T00:00:00.000Z');
 requireThat(Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value,400,'invalid_date','Use a valid calendar date in UTC.');
 return ms;
}
const literalLike = value => '%'+value.replace(/[\\%_]/g,'\\$&')+'%';


export async function handleLiveRequest(request,env) {
 try {
  const url=new URL(request.url),method=request.method;
  requireThat(url.pathname.startsWith(PREFIX+'/')||url.pathname===PREFIX,404,'not_found','No API route matches this request.');
  requireThat(['GET','POST'].includes(method),405,'method_not_allowed','This method is not supported.');
  if(method==='POST'){const origin=request.headers.get('origin');requireThat(!origin||origin===url.origin,403,'origin_denied','Use this Site to submit changes.');}
  if(url.pathname===PREFIX+'/health'&&method==='GET'){
   requireThat(env?.DB?.prepare&&env.DB.batch,503,'backend_not_configured','Shared rooms are not available in this edition.');
   await query(env.DB,'SELECT id FROM live_accounts LIMIT 1').first();
   return json({available:true,mode:'standard',transport:'revision-stream-with-cursor-refresh',realtimePath:'/api/realtime',fallback:'cursor-polling',protectedSending:false,encryptionRequired:false,endToEndEncrypted:false,explicitAcknowledgementRequired:true});
  }
  const user=await authenticate(request,env);requireThat(env?.DB?.prepare&&env.DB.batch,503,'backend_not_configured','Durable messaging is not configured for this deployment.');
  const db=env.DB,now=Date.now();
  await query(db,`INSERT INTO live_accounts(id,display_name,email,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,user.id,'New resident','',now,now).run();
  const path=url.pathname.slice(PREFIX.length).split('/').filter(Boolean).map(decodeURIComponent);
  // Every mutation validates account identity before touching domain state.
  const body=method==='POST'?await bodyJSON(request,user.id):null;
  if(body){
   await validateSessionMutation(request,user,body);
   const account=await query(db,'SELECT onboarding_complete FROM live_accounts WHERE id=?',user.id).first();
   requireThat(account?.onboarding_complete,409,'onboarding_required','Choose your username before changing community data.');
   await query(db,'DELETE FROM auth_rate_limits WHERE expires_at<?',now).run();
   const bucket=await tokenHash('live:'+user.id+':'+Math.floor(now/60000));
   const rate=await query(db,'INSERT INTO auth_rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count',bucket,now+120000).first();
   requireThat(rate.count<=60,429,'rate_limited','Too many changes. Wait a minute and try again.');
   // Old history remains plaintext. New standard text needs an explicit review;
   // Matrix/protected content is never routed through this API.
   const removingLegacy=path[0]==='messages'&&(path[2]==='delete'||(path[2]==='save'&&body.active===false));
   const protectedContent=(path[0]==='channels'&&path[2]==='messages')||(path[0]==='messages'&&!removingLegacy);
   requireThat(!protectedContent||body.acknowledgeStandard===true,503,'encryption_required','Review standard messaging to use access-controlled server-stored text. End-to-end encrypted messaging is a separate service.');
  }
  if(path.length===1&&path[0]==='me'&&method==='GET')return json({account:publicProfile(await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first()),transport:'cursor-polling'});
  if(path.length===1&&path[0]==='profile'&&method==='POST'){
   const old=await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first();
   const name=body.displayName===undefined?old.display_name:nameValue(body.displayName,32);
   requireThat(name.length>=2&&name!=='New resident',400,'invalid_name','Choose an alias between 2 and 32 characters.');
   const bio=body.bio===undefined?old.bio:textValue(body.bio,240,'bio'),status=body.status===undefined?old.status:textValue(body.status,80,'status');
   const theme=body.theme??old.theme,avatar=body.avatar??old.avatar;
   requireThat(['obsidian','lilac','ice'].includes(theme),400,'invalid_theme','Choose an available profile theme.');
   requireThat(['moon','orbit','spark','leaf','ghost'].includes(avatar),400,'invalid_avatar','Choose an available profile avatar.');
   const values={displayName:{column:'display_name',value:name},bio:{column:'bio',value:bio},status:{column:'status',value:status},theme:{column:'theme',value:theme},avatar:{column:'avatar',value:avatar}},fields=Object.keys(values).filter(key=>body[key]!==undefined);
   const guard=activeSessionGuard(user,now),saved=await db.batch([
    profileAuthorChanges(db,user,now,{...(body.displayName!==undefined?{displayName:name}:{}),...(body.avatar!==undefined?{avatar}:{})},guard),
    profileNativeAuthorChanges(db,user,now,{...(body.displayName!==undefined?{displayName:name}:{}),...(body.avatar!==undefined?{avatar}:{})},guard),
    query(db,'UPDATE live_accounts SET '+[...fields.map(key=>values[key].column+'=?'),'updated_at=?'].join(',')+' WHERE id=? AND '+guard.sql,...fields.map(key=>values[key].value),now,user.id,...guard.args)
   ]);
   requireThat(saved[2]?.meta?.changes>0,409,'profile_changed','Your account access changed before the profile could be saved. Please retry.');
   return json({account:publicProfile(await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first())});
  }
  if(path.length===2&&path[0]==='profiles'&&method==='GET'){
   return json({profile:await readProfile(db,user.id,path[1],0,user.sessionId)});
  }
  if(path.length===1&&path[0]==='communities'){
   if(method==='GET')return json({communities:(await query(db,'SELECT c.id,c.name,c.description,c.icon,c.created_at,c.ownership_repair_required,m.role FROM live_communities c JOIN live_memberships m ON m.community_id=c.id WHERE m.account_id=? ORDER BY c.created_at,c.id',user.id).all()).results});
   const name=nameValue(body.name),description=textValue(body.description??'',240,'description'),icon=textValue(body.icon===undefined||body.icon===''?communityInitials(name):body.icon,8,'icon');const communityId=uuid(),channelId=uuid();
   const guard=activeSessionGuard(user,now),created=await db.batch([
    query(db,'INSERT INTO live_communities(id,name,description,icon,created_by,created_at) SELECT ?,?,?,?,?,? WHERE '+guard.sql,communityId,name,description,icon,user.id,now,...guard.args),
    query(db,"INSERT INTO live_memberships(community_id,account_id,role,joined_at) SELECT id,?,'owner',? FROM live_communities WHERE id=? AND created_by=?",user.id,now,communityId,user.id),
    query(db,"INSERT INTO live_channels(id,community_id,name,kind,created_at) SELECT ?,id,'general','text',? FROM live_communities WHERE id=? AND created_by=?",channelId,now,communityId,user.id)
   ]);requireThat(created[0]?.meta?.changes>0,409,'community_changed','Your account access changed. No community was created.');return json({community:{id:communityId,name,description,icon,role:'owner'},channel:{id:channelId,name:'general',kind:'text'}},201);
  }
  if(path[0]==='communities'&&path.length>=3){
   const communityId=path[1],member=await membership(db,communityId,user.id);
   if(method==='POST')requireThat(!member.ownership_repair_required,409,'ownership_repair_required','This community needs an ownership review before new changes can be made.');
   if(path.length===3&&path[2]==='members'&&method==='GET'){
    const {limit,offset}=paging(url),term=(url.searchParams.get('query')||'').trim().replace(/^@/,'');requireThat(term.length<=64,400,'invalid_search','Search for a name or username up to 64 characters.');
    const where='m.community_id=?'+(term?" AND (a.username LIKE ? ESCAPE '\\' OR a.display_name LIKE ? ESCAPE '\\')":''),args=[communityId,...(term?[literalLike(term),literalLike(term)]:[])],total=(await query(db,'SELECT COUNT(*) AS n FROM live_memberships m JOIN live_accounts a ON a.id=m.account_id WHERE '+where,...args).first()).n;
    const members=(await query(db,'SELECT a.id,a.username,a.display_name,a.avatar,(a.account_status=\'active\' AND a.username IS NOT NULL) AS mentionable,m.role,m.joined_at,(SELECT t.expires_at FROM community_timeouts t WHERE t.community_id=m.community_id AND t.account_id=m.account_id AND t.expires_at>?) AS timeout_until FROM live_memberships m JOIN live_accounts a ON a.id=m.account_id WHERE '+where+' ORDER BY m.joined_at,a.id LIMIT ? OFFSET ?',now,...args,limit,offset).all()).results;
    const avatars=await profileAvatarsForViewer(db,user.id,members.map(m=>m.id));return json({members:members.map(m=>({...m,...(avatars.get(m.id)||unavailableAvatar)})),total,page:pageInfo(limit,offset,total)});
   }
   if(path.length===4&&path[2]==='timeouts'){
    const target=await membership(db,communityId,path[3]);
    requireThat(path[3]!==user.id&&target.role!=='owner'&&(member.role==='owner'||(member.role==='moderator'&&target.role==='member')),403,'moderation_denied','Your role cannot restrict this member.');
    requireThat(method==='POST',405,'method_not_allowed','Submit a timeout change.');
    const guard=communityMutationGuard(user,communityId,now,{targetId:path[3],targetRule:'mutable',allowModerator:true});
    if(body.remove===true)await commitCommunityChange(db,query(db,'DELETE FROM community_timeouts WHERE community_id=? AND account_id=? AND '+guard.sql,communityId,path[3],...guard.args),communityAudit(db,user.id,'timeout.remove','account',path[3],now,{communityId},true));
    else{
     const minutes=body.minutes,reason=textValue(body.reason??'',240,'reason');requireThat(Number.isInteger(minutes)&&minutes>=1&&minutes<=10080,400,'invalid_timeout','Choose a timeout from one minute to seven days.');
     await commitCommunityChange(db,query(db,'INSERT INTO community_timeouts(community_id,account_id,expires_at,reason,issued_by,created_at) SELECT ?,?,?,?,?,? WHERE '+guard.sql+' ON CONFLICT(community_id,account_id) DO UPDATE SET expires_at=excluded.expires_at,reason=excluded.reason,issued_by=excluded.issued_by,created_at=excluded.created_at',communityId,path[3],now+minutes*60000,reason,user.id,now,...guard.args),communityAudit(db,user.id,'timeout.set','account',path[3],now,{communityId,minutes},true));
    }
    return json({updated:true,scope:'native-community',encryptedServiceEnforcement:false});
   }
   if(path.length===3&&path[2]==='audit'&&method==='GET'){
    requireThat(staff(member.role),403,'moderation_denied','Community staff can view its moderation log.');const {limit,offset}=paging(url);
    const where="action LIKE 'community.%' AND json_extract(detail_json,'$.communityId')=?";
    const total=(await query(db,'SELECT COUNT(*) AS n FROM admin_audit WHERE '+where,communityId).first()).n;
    const events=(await query(db,'SELECT id,actor_id,action,target_type,target_id,detail_json,created_at FROM admin_audit WHERE '+where+' ORDER BY created_at DESC,id LIMIT ? OFFSET ?',communityId,limit,offset).all()).results.map(event=>({...event,detail:JSON.parse(event.detail_json),detail_json:undefined}));return json({events,total,page:pageInfo(limit,offset,total)});
   }
   if(path.length===4&&path[2]==='members'&&method==='POST'){
    const target=await membership(db,communityId,path[3]);
    requireThat(path[3]!==user.id&&target.role!=='owner',403,'protected_member','Owners cannot be removed or demoted here. Use Leave for yourself.');
    requireThat(member.role==='owner'||(member.role==='moderator'&&body.remove===true&&target.role==='member'),403,'moderation_denied','Your role cannot change this member.');
    const guard=communityMutationGuard(user,communityId,now,{ownerOnly:body.remove!==true,targetId:path[3],targetRule:'mutable',allowModerator:body.remove===true});
    if(body.remove===true)await commitCommunityChange(db,query(db,'DELETE FROM live_memberships WHERE community_id=? AND account_id=? AND '+guard.sql,communityId,path[3],...guard.args),communityAudit(db,user.id,'member.remove','account',path[3],now,{communityId},true));
    else{requireThat(['member','moderator'].includes(body.role),400,'invalid_role','Choose member or moderator.');await commitCommunityChange(db,query(db,'UPDATE live_memberships SET role=? WHERE community_id=? AND account_id=? AND '+guard.sql,body.role,communityId,path[3],...guard.args),communityAudit(db,user.id,'member.role','account',path[3],now,{communityId,role:body.role},true));}
    return json({updated:true});
   }
   if(path.length===3&&path[2]==='settings'&&method==='POST'){
    await requireOwner(db,communityId,user.id);const old=await query(db,'SELECT * FROM live_communities WHERE id=?',communityId).first();
    const name=body.name===undefined?old.name:nameValue(body.name),description=body.description===undefined?old.description:textValue(body.description,240,'description'),icon=body.icon===undefined?old.icon:textValue(body.icon,8,'icon'),guard=communityMutationGuard(user,communityId,now,{ownerOnly:true});
    await commitCommunityChange(db,query(db,'UPDATE live_communities SET name=?,description=?,icon=? WHERE id=? AND '+guard.sql,name,description,icon,communityId,...guard.args),communityAudit(db,user.id,'settings','community',communityId,now,{communityId},true));return json({community:{id:communityId,name,description,icon,role:member.role}});
   }
   if(path.length===3&&path[2]==='leave'&&method==='POST'){
    requireThat(member.role!=='owner',409,'owner_must_transfer','Transfer ownership to a member before leaving.');
    const guard=communityMutationGuard(user,communityId,now),result=await query(db,"DELETE FROM live_memberships WHERE community_id=? AND account_id=? AND role<>'owner' AND NOT EXISTS(SELECT 1 FROM live_communities WHERE id=? AND created_by=?) AND "+guard.sql,communityId,user.id,communityId,user.id,...guard.args).run();
    requireThat(result.meta?.changes>0,409,'community_changed','Your membership, ownership or account access changed. Refresh before leaving.');return json({left:true});
   }
   if(path.length===3&&path[2]==='transfer'&&method==='POST'){
    await requireOwner(db,communityId,user.id);requireThat(typeof body.accountId==='string'&&body.accountId!==user.id,400,'invalid_member','Choose another member.');await membership(db,communityId,body.accountId);
    const guard=communityMutationGuard(user,communityId,now,{ownerOnly:true,targetId:body.accountId,targetRule:'active'});
    // The database owner-change trigger keeps the one owner role consistent.
    await commitCommunityChange(db,query(db,'UPDATE live_communities SET created_by=? WHERE id=? AND created_by=? AND ownership_revision=? AND '+guard.sql,body.accountId,communityId,user.id,member.ownership_revision,...guard.args),communityAudit(db,user.id,'ownership.transfer','account',body.accountId,now,{communityId},true));return json({transferred:true});
   }
   if(path.length===3&&path[2]==='channels'){
    if(method==='GET')return json({channels:(await query(db,'SELECT id,name,kind,created_at FROM live_channels WHERE community_id=? ORDER BY created_at,id',communityId).all()).results});
    await requireOwner(db,communityId,user.id);const name=nameValue(body.name,32).toLowerCase(),kind=body.kind||'text';
    requireThat(/^[a-z0-9][a-z0-9-]*$/.test(name),400,'invalid_channel','Use letters, digits, and hyphens for the channel name.');requireThat(['text','announcement'].includes(kind),400,'invalid_kind','Choose text or announcement.');
    requireThat(!await query(db,'SELECT id FROM live_channels WHERE community_id=? AND name=?',communityId,name).first(),409,'channel_exists','A channel already uses this name.');const id=uuid();
    const guard=communityMutationGuard(user,communityId,now,{ownerOnly:true});await commitCommunityChange(db,query(db,'INSERT INTO live_channels(id,community_id,name,kind,created_at) SELECT ?,?,?,?,? WHERE '+guard.sql+' AND NOT EXISTS(SELECT 1 FROM live_channels WHERE community_id=? AND name=?)',id,communityId,name,kind,now,...guard.args,communityId,name),communityAudit(db,user.id,'channel.create','channel',id,now,{communityId,kind},true));return json({channel:{id,name,kind}},201);
   }
   if(path[2]==='invites'){
    await requireOwner(db,communityId,user.id);
    if(path.length===5&&path[4]==='revoke'&&method==='POST'){
     const found=await query(db,'SELECT token_hash FROM live_invites WHERE token_hash=? AND community_id=?',path[3],communityId).first();requireThat(found,404,'invite_unavailable','This invitation was not found.');
     const guard=communityMutationGuard(user,communityId,now,{ownerOnly:true});await commitCommunityChange(db,query(db,'UPDATE live_invites SET revoked_at=COALESCE(revoked_at,?) WHERE token_hash=? AND community_id=? AND '+guard.sql,now,path[3],communityId,...guard.args),communityAudit(db,user.id,'invite.revoke','invite',path[3],now,{communityId},true));return json({revoked:true});
    }
    if(path.length===3&&method==='GET'){
     const invites=(await query(db,'SELECT token_hash AS id,expires_at,max_uses,uses,created_at,revoked_at FROM live_invites WHERE community_id=? ORDER BY created_at DESC',communityId).all()).results;
     return json({invites:invites.map(i=>({...i,state:i.revoked_at?'revoked':i.expires_at<=now?'expired':i.uses>=i.max_uses?'exhausted':'active'}))});
    }
    if(path.length===3&&method==='POST'){
     const maxUses=body.maxUses??1,hours=body.expiresInHours??168;requireThat(Number.isInteger(maxUses)&&maxUses>=1&&maxUses<=100,400,'invalid_uses','Invite uses must be between 1 and 100.');requireThat(Number.isInteger(hours)&&hours>=1&&hours<=720,400,'invalid_expiry','Invite expiry must be between 1 and 720 hours.');
     const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),id=await tokenHash(token),expiresAt=now+hours*3600000;
     const guard=communityMutationGuard(user,communityId,now,{ownerOnly:true});await commitCommunityChange(db,query(db,'INSERT INTO live_invites(token_hash,community_id,created_by,expires_at,max_uses,created_at) SELECT ?,?,?,?,?,? WHERE '+guard.sql,id,communityId,user.id,expiresAt,maxUses,now,...guard.args),communityAudit(db,user.id,'invite.create','invite',id,now,{communityId,maxUses,expiresAt},true));return json({invite:{token,id,communityId,expiresAt,maxUses}},201);
    }
   }
  }
  if(path.length===2&&path[0]==='invites'&&path[1]==='claim'&&method==='POST'){
   requireThat(typeof body.token==='string'&&/^[a-f0-9]{64}$/.test(body.token),400,'invalid_invite','Use a valid invitation token.');const hash=await tokenHash(body.token),invite=await query(db,'SELECT i.*,c.ownership_repair_required FROM live_invites i JOIN live_communities c ON c.id=i.community_id WHERE token_hash=?',hash).first();
   requireThat(invite,403,'invalid_invite','This invitation is invalid.');requireThat(!invite.ownership_repair_required,409,'ownership_repair_required','This community needs an ownership review before anyone can join.');
   const existing=await query(db,'SELECT role FROM live_memberships WHERE community_id=? AND account_id=?',invite.community_id,user.id).first();
   if(existing)return json({membership:{communityId:invite.community_id,role:existing.role},alreadyJoined:true});
   requireThat(!invite.revoked_at,403,'invite_revoked','This invitation was revoked.');requireThat(invite.expires_at>now,403,'invite_expired','This invitation expired.');requireThat(invite.uses<invite.max_uses,403,'invite_exhausted','This invitation has no uses left.');
   const guard=activeSessionGuard(user,now);
   await db.batch([query(db,"INSERT OR IGNORE INTO live_memberships(community_id,account_id,role,joined_at) SELECT i.community_id,?,'member',? FROM live_invites i JOIN live_communities c ON c.id=i.community_id WHERE i.token_hash=? AND i.expires_at>? AND i.uses<i.max_uses AND i.revoked_at IS NULL AND c.ownership_repair_required=0 AND "+guard.sql,user.id,now,hash,now,...guard.args),query(db,'UPDATE live_invites SET uses=uses+1 WHERE token_hash=? AND changes()>0',hash)]);
   const member=await query(db,'SELECT role FROM live_memberships WHERE community_id=? AND account_id=?',invite.community_id,user.id).first();requireThat(member,403,'invite_exhausted','This invitation has no uses left.');return json({membership:{communityId:invite.community_id,role:member.role},alreadyJoined:false});
  }
  if(path.length===2&&path[0]==='invites'&&method==='GET'){
   requireThat(/^[a-f0-9]{64}$/.test(path[1]),404,'invite_unavailable','This invitation is unavailable.');
   const invite=await query(db,'SELECT i.*,c.name,c.description,c.icon,c.ownership_repair_required FROM live_invites i JOIN live_communities c ON c.id=i.community_id WHERE i.token_hash=?',await tokenHash(path[1])).first();
   requireThat(invite,404,'invite_unavailable','This invitation is unavailable.');requireThat(!invite.ownership_repair_required,409,'ownership_repair_required','This community needs an ownership review before anyone can join.');
   const existing=await query(db,'SELECT role FROM live_memberships WHERE community_id=? AND account_id=?',invite.community_id,user.id).first();
   const state=existing?'already-joined':invite.revoked_at?'revoked':invite.expires_at<=now?'expired':invite.uses>=invite.max_uses?'exhausted':'active';
   requireThat(state==='active'||state==='already-joined',410,'invite_'+state,`This invitation is ${state}.`);
   return json({invite:{communityId:invite.community_id,name:invite.name,description:invite.description,icon:invite.icon,expiresAt:invite.expires_at,alreadyMember:!!existing,state}});
  }
  if(path.length===3&&path[0]==='channels'){
   const channelId=path[1],channel=await accessibleChannel(db,channelId,user.id);
   if(path[2]==='changes'&&method==='GET'){
    const after=cursorValue(url.searchParams.get('after'))??0,{limit}=paging(url);
    const changes=(await query(db,'SELECT seq,message_id FROM live_changes WHERE channel_id=? AND seq>? ORDER BY seq LIMIT ?',channelId,after,limit+1).all()).results;
    const window=changes.slice(0,limit),ids=[...new Set(window.map(c=>c.message_id))];
    const messages=ids.length?(await query(db,`SELECT ${messageColumns} ${messageJoins} WHERE m.id IN (${ids.map(()=>'?').join(',')})`,...ids).all()).results:[];
    const page=await enriched(db,messages,user.id);
    await currentChannelReadAccess(db,channelId,user);
    return json({messages:page,cursor:window.at(-1)?.seq??after,hasMore:changes.length>limit});
   }
   if(path[2]==='pins'&&method==='GET'){
    const messages=(await query(db,`SELECT ${messageColumns} ${messageJoins} WHERE m.channel_id=? AND m.pinned=1 AND m.deleted_at IS NULL ORDER BY m.seq DESC`,channelId).all()).results;
    const page=await enriched(db,messages,user.id);
    await currentChannelReadAccess(db,channelId,user);
    return json({messages:page});
   }
   if(path[2]==='messages'){
    if(method==='GET'){
     const before=cursorValue(url.searchParams.get('before')),after=cursorValue(url.searchParams.get('after')),{limit}=paging(url),thread=url.searchParams.get('threadRootId');
     requireThat(before===null||after===null,400,'invalid_cursor','Use before or after, not both.');
     if(thread){const root=await getMessage(db,thread,user.id);requireThat(root.channel_id===channelId&&!root.thread_root_id,400,'invalid_thread','Choose a root message in this channel.');}
     // Capture high water first. Anything concurrent with the history query is replayed.
     const high=(await query(db,'SELECT COALESCE(MAX(seq),0) AS seq FROM live_changes WHERE channel_id=?',channelId).first()).seq;
     const ascending=after!==null,condition=after!==null?'AND m.seq>?':before!==null?'AND m.seq<?':'',threadWhere=thread?'m.thread_root_id=?':'m.thread_root_id IS NULL';
     const binds=[channelId,...(thread?[thread]:[]),...(after!==null?[after]:before!==null?[before]:[]),limit+1];
     const records=(await query(db,`SELECT ${messageColumns} ${messageJoins} WHERE m.channel_id=? AND ${threadWhere} ${condition} ORDER BY m.seq ${ascending?'ASC':'DESC'} LIMIT ?`,...binds).all()).results;
     const selected=records.slice(0,limit),messages=ascending?selected:selected.reverse();
     const page=await enriched(db,messages,user.id);
     const access=await currentChannelReadAccess(db,channelId,user);
     return json({messages:page,securityMode:'standard',endToEndEncrypted:false,ownershipRepairRequired:!!access.ownership_repair_required,permissions:{canSend:!access.ownership_repair_required&&!access.timed_out&&(access.kind!=='announcement'||staff(access.role)),canManageMessages:!access.ownership_repair_required&&staff(access.role)},changeCursor:high,page:{hasMore:records.length>limit,before:messages[0]?.seq??before??null,after:messages.at(-1)?.seq??after??0}});
    }
    requireThat(channel.kind!=='announcement'||staff(channel.role),403,'posting_denied','Only community staff can post announcements.');
    const writeGuard=await requireChannelWrite(db,user,channelId,now,{staffOnly:channel.kind==='announcement'});
    requireThat(typeof body.clientId==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(body.clientId),400,'invalid_client_id','Use a stable client-generated ID for retry deduplication.');
    const attachmentIds=standardAttachmentIds(body.attachmentIds),rawText=body.text??'';requireThat(typeof rawText==='string'&&(rawText.trim().length>0||attachmentIds.length>0)&&rawText.length<=4000&&!/\u0000/.test(rawText),400,'invalid_text','Write at most 4000 characters. Empty messages need an attachment.');
    const text=rawText.trim(),replyToId=body.replyToId||null,threadRootId=body.threadRootId||null,mentionIds=mentionsValue(body.mentionIds);
    requireThat([replyToId,threadRootId].every(id=>id===null||(typeof id==='string'&&id.length<=100)),400,'invalid_reference','Use valid message IDs for replies and threads.');
    const hash=await tokenHash(JSON.stringify(attachmentIds.length?[text,replyToId,threadRootId,mentionIds,attachmentIds]:mentionIds.length?[text,replyToId,threadRootId,mentionIds]:[text,replyToId,threadRootId]));
    const previous=await query(db,'SELECT * FROM live_messages WHERE channel_id=? AND author_id=? AND client_id=?',channelId,user.id,body.clientId).first();
    if(previous){const previousHash=previous.original_hash||await tokenHash(JSON.stringify([previous.text,previous.reply_to_id,previous.thread_root_id]));requireThat(hash===previousHash,409,'idempotency_conflict','This retry ID already belongs to a different message.');return json({message:await getMessage(db,previous.id,user.id),acknowledged:true,acknowledgedPayload:{text,replyToId,threadRootId,mentionIds,attachmentIds,clientId:body.clientId}});}
    await mentionTargets(db,channel.community_id,mentionIds);includeMentionGuard(writeGuard,channel.community_id,mentionIds);
    if(replyToId){const source=await getMessage(db,replyToId,user.id);requireThat(source.channel_id===channelId,400,'invalid_reply','Reply to a message in this channel.');requireThat(!source.deleted_at,409,'source_deleted','This message was deleted. Remove the reply reference to send.');}
    if(threadRootId){const root=await getMessage(db,threadRootId,user.id);requireThat(root.channel_id===channelId&&!root.thread_root_id,400,'invalid_thread','Choose a root message in this channel.');}
    const id=uuid(),record={id,channel_id:channelId},assetGuard=stagedAttachmentGuard(attachmentIds,user.id,{channelId},now);
    const statements=[query(db,`INSERT OR IGNORE INTO live_messages(id,channel_id,author_id,client_id,text,reply_to_id,thread_root_id,original_hash,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${writeGuard.sql}${replyToId?' AND EXISTS(SELECT 1 FROM live_messages WHERE id=? AND channel_id=? AND deleted_at IS NULL)':''}${threadRootId?' AND EXISTS(SELECT 1 FROM live_messages WHERE id=? AND channel_id=? AND thread_root_id IS NULL AND deleted_at IS NULL)':''}${assetGuard.sql}`,id,channelId,user.id,body.clientId,text,replyToId,threadRootId,hash,now,...writeGuard.args,...(replyToId?[replyToId,channelId]:[]),...(threadRootId?[threadRootId,channelId]:[]),...assetGuard.args),...claimStandardAttachments(db,attachmentIds,user.id,{channelId},id,hash,now),query(db,"INSERT INTO live_changes(channel_id,message_id,actor_id,kind,created_at) SELECT channel_id,id,?,'send',? FROM live_messages WHERE id=?",user.id,now,id)];
    if(mentionIds.length)statements.push(query(db,`INSERT OR IGNORE INTO live_message_mentions(message_id,account_id,created_at) SELECT m.id,t.account_id,? FROM live_messages m JOIN live_memberships t ON t.community_id=? WHERE m.id=? AND t.account_id IN (${mentionIds.map(()=>'?').join(',')})`,now,channel.community_id,id,...mentionIds));
    if(threadRootId)statements.push(query(db,"INSERT INTO live_changes(channel_id,message_id,actor_id,kind,created_at) SELECT channel_id,?,?,'thread',? FROM live_messages WHERE id=?",threadRootId,user.id,now,id));
    await db.batch(statements);
    const stored=await query(db,'SELECT id,original_hash FROM live_messages WHERE channel_id=? AND author_id=? AND client_id=?',channelId,user.id,body.clientId).first();
    requireThat(stored,403,'posting_denied','Membership, account status or reply access changed. The message was not sent.');
    requireThat(stored.original_hash===hash,409,'idempotency_conflict','This retry ID already belongs to a different message.');return json({message:await getMessage(db,stored.id,user.id),acknowledged:true,acknowledgedPayload:{text,replyToId,threadRootId,mentionIds,attachmentIds,clientId:body.clientId}});
   }
  }
  if(path[0]==='messages'&&(path.length===2||path.length===3)){
   // A private bookmark can be removed even after losing its source membership.
   if(path.length===3&&path[2]==='save'&&method==='POST'&&body.active===false){await query(db,'DELETE FROM live_bookmarks WHERE message_id=? AND account_id=?',path[1],user.id).run();try{return json({saved:false,message:await getMessage(db,path[1],user.id),acknowledged:true});}catch(error){if(!(error instanceof ApiError))throw error;return json({saved:false,unavailable:true});}}
   const message=await getMessage(db,path[1],user.id);
   if(path.length===2&&method==='GET'){
    await currentChannelReadAccess(db,message.channel_id,user);
    return json({message,securityMode:'standard',endToEndEncrypted:false});
   }
   const channel=await accessibleChannel(db,message.channel_id,user.id);
   if(method==='POST'&&path.length===3){
    const action=path[2];requireThat(['save','edit','delete','reaction','pin'].includes(action),404,'not_found','This message action does not exist.');
    if(action==='edit'||action==='delete')requireThat(message.author_id===user.id||(action==='delete'&&staff(channel.role)),403,'ownership_required','Only the author or authorized community staff can change this message.');
    if(action==='pin')requireThat(staff(channel.role),403,'moderation_denied','Only community staff can change pins.');
    requireThat(!message.deleted_at||action==='delete',409,'source_deleted','This message was deleted.');
    const guard=await requireChannelWrite(db,user,channel.id,now,{staffOnly:action==='pin'||(action==='delete'&&message.author_id!==user.id)||(action==='edit'&&channel.kind==='announcement'),cleanup:action==='delete'||action==='save'});
    if(action!=='delete'){guard.sql+=' AND EXISTS(SELECT 1 FROM live_messages source WHERE source.id=? AND source.deleted_at IS NULL)';guard.args.push(message.id);}
    const editMentions=action==='edit'?await mentionTargets(db,channel.community_id,mentionsValue(body.mentionIds??message.mention_ids),{strict:body.mentionIds!==undefined}):null;
    if(editMentions)includeMentionGuard(guard,channel.community_id,editMentions);
    const writes=[query(db,'UPDATE live_memberships SET joined_at=joined_at WHERE community_id=? AND account_id=? AND '+guard.sql,channel.community_id,user.id,...guard.args)];
    const event=(kind,id=message.id)=>query(db,'INSERT INTO live_changes(channel_id,message_id,actor_id,kind,created_at) SELECT channel_id,id,?,?,? FROM live_messages WHERE id=? AND '+guard.sql,user.id,kind,now,id,...guard.args);
    if(action==='save'){
     requireThat(typeof body.active==='boolean',400,'invalid_state','Choose whether to save this message.');
     writes.push(query(db,'INSERT OR IGNORE INTO live_bookmarks(message_id,account_id,created_at) SELECT id,?,? FROM live_messages WHERE id=? AND '+guard.sql,user.id,now,message.id,...guard.args));
    }else if(action==='edit'){
     const text=textValue(body.text,4000,'text');requireThat(text.length||message.attachments.length,400,'invalid_text','Empty messages need an attachment.');const hash=await tokenHash(JSON.stringify([message.text,message.reply_to_id,message.thread_root_id]));
     writes.push(query(db,"UPDATE live_messages SET text=?,edited_at=?,original_hash=CASE WHEN original_hash='' THEN ? ELSE original_hash END WHERE id=? AND deleted_at IS NULL AND "+guard.sql,text,now,hash,message.id,...guard.args),event('edit'),query(db,"INSERT INTO live_changes(channel_id,message_id,actor_id,kind,created_at) SELECT channel_id,id,?,'reference',? FROM live_messages WHERE reply_to_id=? AND "+guard.sql,user.id,now,message.id,...guard.args));
    }else if(action==='delete'){
     const hash=await tokenHash(JSON.stringify([message.text,message.reply_to_id,message.thread_root_id]));
     writes.push(query(db,"UPDATE live_messages SET text='',deleted_at=COALESCE(deleted_at,?),pinned=0,original_hash=CASE WHEN original_hash='' THEN ? ELSE original_hash END WHERE id=? AND "+guard.sql,now,hash,message.id,...guard.args),query(db,'DELETE FROM live_reactions WHERE message_id=? AND '+guard.sql,message.id,...guard.args),event('delete'),query(db,"INSERT INTO live_changes(channel_id,message_id,actor_id,kind,created_at) SELECT channel_id,id,?,'reference',? FROM live_messages WHERE reply_to_id=? AND "+guard.sql,user.id,now,message.id,...guard.args));
     if(message.thread_root_id)writes.push(event('thread',message.thread_root_id));
    }else if(action==='reaction'){
     requireThat(['♥','❤️','💜','👍','🔥','👀','✨','😂','💯','🎯','😭','💀','🚀'].includes(body.emoji),400,'invalid_reaction','Choose an available reaction.');requireThat(typeof body.active==='boolean',400,'invalid_state','Choose whether to add or remove this reaction.');
     writes.push(body.active?query(db,'INSERT OR IGNORE INTO live_reactions(message_id,account_id,emoji,created_at) SELECT id,?,?,? FROM live_messages WHERE id=? AND '+guard.sql,user.id,body.emoji,now,message.id,...guard.args):query(db,'DELETE FROM live_reactions WHERE message_id=? AND account_id=? AND emoji=? AND '+guard.sql,message.id,user.id,body.emoji,...guard.args),event('reaction'));
    }else if(action==='pin'){
     requireThat(typeof body.active==='boolean',400,'invalid_state','Choose whether to pin this message.');writes.push(query(db,'UPDATE live_messages SET pinned=? WHERE id=? AND '+guard.sql,body.active?1:0,message.id,...guard.args),event('pin'));
    }
    if(action==='edit'||action==='delete'){
     writes.push(query(db,'DELETE FROM live_message_mentions WHERE message_id=? AND '+guard.sql,message.id,...guard.args));
     if(editMentions?.length)writes.push(query(db,`INSERT OR IGNORE INTO live_message_mentions(message_id,account_id,created_at) SELECT m.id,t.account_id,? FROM live_messages m JOIN live_memberships t ON t.community_id=? WHERE m.id=? AND t.account_id IN (${editMentions.map(()=>'?').join(',')}) AND ${guard.sql}`,now,channel.community_id,message.id,...editMentions,...guard.args));
    }
    const results=await db.batch(writes);requireThat(results[0]?.meta?.changes>0,409,'message_changed','The message, membership or account access changed. Refresh before retrying.');
    return json({message:await getMessage(db,message.id,user.id),acknowledged:true,...(action==='save'?{saved:true}:{})});
   }
  }
  if(path.length===1&&path[0]==='favorites'){
   if(method==='POST'){
    requireThat(typeof body.channelId==='string'&&typeof body.active==='boolean',400,'invalid_favorite','Choose a channel and favorite state.');
    if(body.active){await accessibleChannel(db,body.channelId,user.id);await query(db,'INSERT OR IGNORE INTO live_favorites(channel_id,account_id) VALUES(?,?)',body.channelId,user.id).run();}
    else await query(db,'DELETE FROM live_favorites WHERE channel_id=? AND account_id=?',body.channelId,user.id).run();
   }
   return json({favorites:(await query(db,'SELECT f.channel_id FROM live_favorites f JOIN live_channels c ON c.id=f.channel_id JOIN live_memberships mem ON mem.community_id=c.community_id AND mem.account_id=f.account_id WHERE f.account_id=?',user.id).all()).results.map(r=>r.channel_id)});
  }
  if(path.length===1&&path[0]==='read'&&method==='POST'){
   const active=activeSessionGuard(user,now);
   const access=query(db,'UPDATE auth_sessions SET last_active_at=last_active_at WHERE id=? AND account_id=? AND '+active.sql,user.sessionId,user.id,...active.args);
   let statement;
   if(body.all===true){
    statement=query(db,`INSERT INTO live_read_states(channel_id,account_id,seq,activity_seq) SELECT c.id,?,COALESCE(MAX(m.seq),0),(SELECT COALESCE(MAX(ch.seq),0) FROM live_changes ch WHERE ch.channel_id=c.id) FROM live_channels c JOIN live_memberships mem ON mem.community_id=c.community_id LEFT JOIN live_messages m ON m.channel_id=c.id WHERE mem.account_id=? AND ${active.sql} GROUP BY c.id ON CONFLICT(channel_id,account_id) DO UPDATE SET seq=MAX(live_read_states.seq,excluded.seq),activity_seq=MAX(live_read_states.activity_seq,excluded.activity_seq)`,user.id,user.id,...active.args);
   }else{
    await accessibleChannel(db,body.channelId,user.id);requireThat(Number.isSafeInteger(body.seq)&&body.seq>=0,400,'invalid_cursor','Read position must be a nonnegative message sequence.');
    const changeSeq=body.changeSeq??0;requireThat(Number.isSafeInteger(changeSeq)&&changeSeq>=0,400,'invalid_cursor','Activity position must be a nonnegative change sequence.');
    statement=query(db,`INSERT INTO live_read_states(channel_id,account_id,seq,activity_seq) SELECT c.id,?,MIN(?,(SELECT COALESCE(MAX(m.seq),0) FROM live_messages m WHERE m.channel_id=c.id)),MIN(?,(SELECT COALESCE(MAX(ch.seq),0) FROM live_changes ch WHERE ch.channel_id=c.id)) FROM live_channels c JOIN live_memberships mem ON mem.community_id=c.community_id WHERE c.id=? AND mem.account_id=? AND ${active.sql} ON CONFLICT(channel_id,account_id) DO UPDATE SET seq=MAX(live_read_states.seq,excluded.seq),activity_seq=MAX(live_read_states.activity_seq,excluded.activity_seq)`,user.id,body.seq,changeSeq,body.channelId,user.id,...active.args);
   }
   const results=await db.batch([access,statement]);requireThat(results[0]?.meta?.changes>0&&(body.all===true||results[1]?.meta?.changes>0),409,'community_changed','Your session or conversation membership changed. Read state was not updated.');return json({read:true});
  }
  if(path.length===1&&path[0]==='saved'&&method==='GET'){
   const {limit,offset}=paging(url),total=(await query(db,'SELECT COUNT(*) AS n FROM live_bookmarks WHERE account_id=?',user.id).first()).n;
   const bookmarks=(await query(db,'SELECT message_id,created_at FROM live_bookmarks WHERE account_id=? ORDER BY created_at DESC,message_id LIMIT ? OFFSET ?',user.id,limit,offset).all()).results,messages=[];
   for(const b of bookmarks){try{const m=await getMessage(db,b.message_id,user.id);messages.push({...m,saved_at:b.created_at,unavailable:!!m.deleted_at});}catch(error){if(!(error instanceof ApiError))throw error;messages.push({id:b.message_id,saved_at:b.created_at,unavailable:true,unavailable_reason:'You no longer have access to the original conversation.'});}}
   return json({messages,total,page:pageInfo(limit,offset,total)});
  }
  if(path.length===1&&path[0]==='search'&&method==='GET'){
   const {limit,offset}=paging(url),term=(url.searchParams.get('q')||'').trim(),before=dateValue(url.searchParams.get('before')),after=dateValue(url.searchParams.get('after'));
   requireThat(term.length<=200,400,'invalid_search','Search text must contain at most 200 characters.');requireThat(before===null||after===null||before>after,400,'contradictory_dates','After must be earlier than Before. Before excludes that UTC day; After includes it.');
   const has=url.searchParams.get('has');requireThat(!has||['text','links'].includes(has),400,'unsupported_attachment','Shared channels currently contain text and links.');
   const conditions=['mem.account_id=?','m.deleted_at IS NULL'],values=[user.id];if(has==='links')conditions.push("(m.text LIKE '%https://%' OR m.text LIKE '%http://%')");
   if(term){conditions.push("m.text LIKE ? ESCAPE '\\'");values.push(literalLike(term));}
   const author=url.searchParams.get('author');if(author){conditions.push('a.username=?');values.push(normalizeUsername(author.replace(/^@/,'')));}
   for(const [parameter,column]of [['channelId','m.channel_id'],['communityId','c.community_id'],['authorId','m.author_id']]){const value=url.searchParams.get(parameter);if(value){conditions.push(column+'=?');values.push(value);}}
   if(before!==null){conditions.push('m.created_at<?');values.push(before);}if(after!==null){conditions.push('m.created_at>=?');values.push(after);}
   const where=conditions.join(' AND '),joined=messageJoins+' JOIN live_memberships mem ON mem.community_id=c.community_id';
   const total=(await query(db,`SELECT COUNT(*) AS n ${joined} WHERE ${where}`,...values).first()).n;
   const messages=(await query(db,`SELECT ${messageColumns} ${joined} WHERE ${where} ORDER BY m.seq DESC LIMIT ? OFFSET ?`,...values,limit,offset).all()).results;
   const like=literalLike(term),communities=(await query(db,"SELECT c.id,c.name,c.description,c.icon FROM live_communities c JOIN live_memberships mem ON mem.community_id=c.id WHERE mem.account_id=? AND c.name LIKE ? ESCAPE '\\' ORDER BY c.name LIMIT 30",user.id,like).all()).results;
   const channels=(await query(db,"SELECT c.id,c.name,c.community_id,g.name AS community_name FROM live_channels c JOIN live_communities g ON g.id=c.community_id JOIN live_memberships mem ON mem.community_id=c.community_id WHERE mem.account_id=? AND c.name LIKE ? ESCAPE '\\' ORDER BY c.name LIMIT 30",user.id,like).all()).results;
   const people=(await query(db,"SELECT DISTINCT a.id,a.display_name,a.avatar FROM live_accounts a JOIN live_memberships their ON their.account_id=a.id JOIN live_memberships mine ON mine.community_id=their.community_id WHERE mine.account_id=? AND a.display_name LIKE ? ESCAPE '\\' ORDER BY a.display_name LIMIT 30",user.id,like).all()).results;
   return json({messages:await enriched(db,messages,user.id),total,page:pageInfo(limit,offset,total),communities,channels,people,dateInterpretation:'UTC calendar days. After includes its date; Before excludes its date.',entityLimit:30});
  }
  if(path.length===1&&path[0]==='inbox'&&method==='GET'){
   const {limit,offset}=paging(url),view=url.searchParams.get('view')||'unread';requireThat(['unread','mentions','activity'].includes(view),400,'invalid_view','Choose Unread, Mentions, or Activity.');
   const unreadSQL=`SELECT ${messageColumns} ${messageJoins} JOIN live_memberships mem ON mem.community_id=c.community_id LEFT JOIN live_read_states r ON r.channel_id=c.id AND r.account_id=mem.account_id WHERE mem.account_id=? AND m.seq>COALESCE(r.seq,0) AND m.author_id<>? AND m.deleted_at IS NULL`;
   // Targets are immutable identities chosen when sending/editing. Old display
   // names and unstructured @text never invent notification recipients.
   const mentionCTE=`WITH unread AS (${unreadSQL}), mentions AS (SELECT DISTINCT message_id AS id FROM live_message_mentions WHERE account_id=?)`;
   const activitySQL=`SELECT ${messageColumns},ev.activity_seq,ev.activity_at ${messageJoins} JOIN live_memberships mem ON mem.community_id=c.community_id LEFT JOIN live_read_states r ON r.channel_id=c.id AND r.account_id=mem.account_id JOIN (
    SELECT x.message_id,MAX(x.seq) AS activity_seq,MAX(x.created_at) AS activity_at FROM live_changes x JOIN live_messages t ON t.id=x.message_id
    WHERE x.actor_id<>? AND ((t.author_id=? AND x.kind IN ('reaction','pin')) OR (t.author_id<>? AND x.kind='send' AND (t.reply_to_id IN (SELECT id FROM live_messages WHERE author_id=?) OR t.thread_root_id IN (SELECT id FROM live_messages WHERE author_id=?)))) GROUP BY x.message_id
   ) ev ON ev.message_id=m.id WHERE mem.account_id=? AND m.deleted_at IS NULL AND ev.activity_seq>COALESCE(r.activity_seq,0)`;
   const uv=[user.id,user.id],mv=[...uv,user.id],av=Array(6).fill(user.id);
   const counts={unread:(await query(db,`SELECT COUNT(*) AS n FROM (${unreadSQL})`,...uv).first()).n,mentions:(await query(db,mentionCTE+' SELECT COUNT(*) AS n FROM mentions',...mv).first()).n,activity:(await query(db,`SELECT COUNT(*) AS n FROM (${activitySQL})`,...av).first()).n};
   let records;
   if(view==='mentions')records=(await query(db,mentionCTE+' SELECT unread.* FROM unread JOIN mentions ON mentions.id=unread.id ORDER BY unread.seq DESC LIMIT ? OFFSET ?',...mv,limit,offset).all()).results;
   else if(view==='activity')records=(await query(db,activitySQL+' ORDER BY ev.activity_seq DESC LIMIT ? OFFSET ?',...av,limit,offset).all()).results;
   else records=(await query(db,unreadSQL+' ORDER BY m.seq DESC LIMIT ? OFFSET ?',...uv,limit,offset).all()).results;
   const conversations=(await query(db,`SELECT channel_id,community_id,channel_name,community_name,COUNT(*) AS unread_count,MAX(seq) AS latest_seq FROM (${unreadSQL}) GROUP BY channel_id ORDER BY latest_seq DESC`,...uv).all()).results;
   return json({items:await enriched(db,records,user.id),total:counts[view],counts,conversations,page:pageInfo(limit,offset,counts[view]),mentionMatching:'Explicit immutable account IDs; historical text is not inferred.'});
  }
  throw new ApiError(404,'not_found','No API route matches this request.');
 }catch(error){
  if(error instanceof ApiError||error instanceof AuthError)return json({error:{code:error.code,message:error.message}},error.status);
  if(error instanceof URIError)return json({error:{code:'invalid_path',message:'The request path is invalid.'}},400);
  return json({error:{code:'server_error',message:'The request could not be committed. Retry with the same client message ID.'}},500);
 }
}

export default {fetch: handleLiveRequest};
