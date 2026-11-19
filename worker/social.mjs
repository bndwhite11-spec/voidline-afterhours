/** Native, account-scoped friend requests. No presence or message delivery is inferred. */
import {authenticate, validateSessionMutation, authRateLimit, AuthError} from './auth.mjs';
import {profileAvatarMediaForViewer} from './media.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const check=(value,status,code,message)=>{if(!value)throw new AuthError(status,code,message);};
const unavailable=()=>new AuthError(404,'request_unavailable','This request is unavailable. Check the username or try again later.');
const blockedSQL='NOT EXISTS(SELECT 1 FROM social_blocks b WHERE (b.blocker_id=r.sender_id AND b.blocked_id=r.recipient_id) OR (b.blocker_id=r.recipient_id AND b.blocked_id=r.sender_id))';
const databaseNow="CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)";
function activeSession(user){return {sql:`EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>${databaseNow} AND a.account_status='active')`,args:[user.sessionId,user.id]};}
const activeTargetSql="EXISTS(SELECT 1 FROM live_accounts WHERE id=? AND account_status='active' AND username IS NOT NULL AND onboarding_complete=1)";
async function requireActive(db,guard){check(await q(db,'SELECT 1 AS allowed WHERE '+guard.sql,...guard.args).first(),409,'session_changed','Your account or session changed. Sign in again before changing Friends.');}
async function bodyOf(request){
 check(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 const reader=request.body?.getReader();check(reader,400,'invalid_body','A request body is required.');let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw new AuthError(413,'body_too_large','The request is too large.');}chunks.push(value);}
 let data;try{const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The request could not be read.');}
 check(data&&typeof data==='object'&&!Array.isArray(data),400,'invalid_body','Use a JSON object.');return data;
}
async function isBlocked(db,a,b){return !!await q(db,'SELECT 1 AS found FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',a,b,b,a).first();}
async function accountByName(db,value){
 check(typeof value==='string'&&/^[a-z][a-z0-9_]{2,23}$/.test(value.trim().normalize('NFKC').toLowerCase()),400,'invalid_username','Enter an exact username, without @.');
 return q(db,"SELECT id,username,display_name,avatar FROM live_accounts WHERE username=? AND onboarding_complete=1 AND account_status='active'",value.trim().normalize('NFKC').toLowerCase()).first();
}
export async function handleSocialRequest(request,env){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/social\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
  check(url.pathname==='/api/social'||url.pathname.startsWith('/api/social/'),404,'not_found','No social action matches this request.');
  check(['GET','POST'].includes(request.method),405,'method_not_allowed','This method is not supported.');
  const user=await authenticate(request,env),db=env.DB,now=Date.now();
  const me=await q(db,'SELECT onboarding_complete FROM live_accounts WHERE id=?',user.id).first();check(me?.onboarding_complete,409,'onboarding_required','Choose a username before adding friends.');
  if(request.method==='GET'&&path.length===0){
   const limit=Number(url.searchParams.get('limit')||30),offset=Number(url.searchParams.get('offset')||0);
   check(Number.isSafeInteger(limit)&&limit>=1&&limit<=50&&Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Choose a page size from 1 to 50.');
   const rows=async(sql,...args)=>(await q(db,sql,...args).all()).results;
   const publicFields='a.id AS accountId,a.username,a.display_name AS displayName,a.avatar';
   const relation=`FROM social_requests r JOIN live_accounts a ON a.id=CASE WHEN r.sender_id=? THEN r.recipient_id ELSE r.sender_id END WHERE (r.sender_id=? OR r.recipient_id=?) AND r.state='accepted' AND ${blockedSQL} AND a.username IS NOT NULL`;
   const incoming=`FROM social_requests r JOIN live_accounts a ON a.id=r.sender_id WHERE r.recipient_id=? AND r.state='pending' AND ${blockedSQL} AND a.username IS NOT NULL`;
   const outgoing=`FROM social_requests r JOIN live_accounts a ON a.id=r.recipient_id WHERE r.sender_id=? AND r.state='pending' AND ${blockedSQL} AND a.username IS NOT NULL`;
   const friends=await rows(`SELECT DISTINCT ${publicFields} ${relation} ORDER BY a.username LIMIT ? OFFSET ?`,user.id,user.id,user.id,limit,offset);
   const incomingRows=await rows(`SELECT r.id,r.created_at AS createdAt,${publicFields} ${incoming} ORDER BY r.updated_at DESC,r.id LIMIT ? OFFSET ?`,user.id,limit,offset);
   const outgoingRows=await rows(`SELECT r.id,r.created_at AS createdAt,${publicFields} ${outgoing} ORDER BY r.updated_at DESC,r.id LIMIT ? OFFSET ?`,user.id,limit,offset);
   const blocked=await rows(`SELECT ${publicFields},b.created_at AS createdAt FROM social_blocks b JOIN live_accounts a ON a.id=b.blocked_id WHERE b.blocker_id=? ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,user.id,limit,offset);
   const counts={friends:(await q(db,`SELECT COUNT(DISTINCT a.id) AS n ${relation}`,user.id,user.id,user.id).first()).n,incoming:(await q(db,`SELECT COUNT(*) AS n ${incoming}`,user.id).first()).n,outgoing:(await q(db,`SELECT COUNT(*) AS n ${outgoing}`,user.id).first()).n,blocked:(await q(db,'SELECT COUNT(*) AS n FROM social_blocks WHERE blocker_id=?',user.id).first()).n};
   const people=[...friends,...incomingRows,...outgoingRows],avatars=await profileAvatarMediaForViewer(db,user.id,people.map(person=>person.accountId));
   for(const person of people)person.avatarMedia=avatars.get(person.accountId)||null;
   const setting=await q(db,'SELECT allow_requests FROM social_settings WHERE account_id=?',user.id).first();
   return json({friends,incoming:incomingRows,outgoing:outgoingRows,blocked,counts,settings:{allowRequests:setting?.allow_requests!==0},page:{limit,offset}});
  }
  check(request.method==='POST',405,'method_not_allowed','This action requires a POST request.');
  const body=await bodyOf(request);await validateSessionMutation(request,user,body);
  await authRateLimit(request,db,'social-actions',30,now,user.id);
  const active=activeSession(user);
  if(path.length===1&&path[0]==='settings'){
   check(typeof body.allowRequests==='boolean',400,'invalid_setting','Choose whether to allow friend requests.');
   const saved=await q(db,'INSERT INTO social_settings(account_id,allow_requests) SELECT ?,? WHERE '+active.sql+' ON CONFLICT(account_id) DO UPDATE SET allow_requests=excluded.allow_requests',user.id,body.allowRequests?1:0,...active.args).run();
   check(saved.meta?.changes===1,409,'session_changed','Your account or session changed. Your preference was not saved.');
   return json({settings:{allowRequests:body.allowRequests}});
  }
  if(path.length===1&&path[0]==='request'){
   await authRateLimit(request,db,'friend-request',5,now,user.id);
   const target=await accountByName(db,body.username);if(!target||target.id===user.id||await isBlocked(db,user.id,target.id))throw unavailable();
   const setting=await q(db,'SELECT allow_requests FROM social_settings WHERE account_id=?',target.id).first();if(setting?.allow_requests===0)throw unavailable();
   const existing=await q(db,"SELECT * FROM social_requests WHERE ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) AND state IN ('pending','accepted') ORDER BY CASE state WHEN 'accepted' THEN 0 ELSE 1 END LIMIT 1",user.id,target.id,target.id,user.id).first();
   if(existing){await requireActive(db,active);return json({request:{id:existing.id,state:existing.state,direction:existing.sender_id===user.id?'outgoing':'incoming'},alreadyExists:true});}
   const id=crypto.randomUUID();
   await q(db,`INSERT INTO social_requests(id,sender_id,recipient_id,state,created_at,updated_at)
    SELECT ?,?,?,'pending',?,? WHERE NOT EXISTS(SELECT 1 FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))
    AND COALESCE((SELECT allow_requests FROM social_settings WHERE account_id=?),1)=1
    AND (SELECT COUNT(*) FROM social_requests WHERE recipient_id=? AND state='pending')<200
    AND NOT EXISTS(SELECT 1 FROM social_requests WHERE sender_id=? AND recipient_id=? AND state IN ('pending','accepted'))
    AND ${active.sql} AND ${activeTargetSql}
    ON CONFLICT(sender_id,recipient_id) DO UPDATE SET state='pending',updated_at=excluded.updated_at WHERE social_requests.state IN ('declined','cancelled')`,id,user.id,target.id,now,now,user.id,target.id,target.id,user.id,target.id,target.id,target.id,user.id,...active.args,target.id).run();
   await requireActive(db,active);if(!await q(db,'SELECT 1 AS allowed WHERE '+activeTargetSql,target.id).first())throw unavailable();
   const sent=await q(db,"SELECT id,state FROM social_requests WHERE sender_id=? AND recipient_id=? AND state='pending'",user.id,target.id).first();
   if(!sent){const reverse=await q(db,"SELECT id,state FROM social_requests WHERE sender_id=? AND recipient_id=? AND state IN ('pending','accepted')",target.id,user.id).first();if(reverse)return json({request:{...reverse,direction:'incoming'},alreadyExists:true});throw unavailable();}
   return json({request:{...sent,direction:'outgoing'},alreadyExists:false},201);
  }
  if(path.length===3&&path[0]==='requests'&&['respond','cancel'].includes(path[2])){
   const record=await q(db,'SELECT * FROM social_requests WHERE id=?',path[1]).first();
   if(!record||record[path[2]==='respond'?'recipient_id':'sender_id']!==user.id)throw unavailable();
   if(path[2]==='cancel'){
    await q(db,"UPDATE social_requests SET state='cancelled',updated_at=? WHERE id=? AND sender_id=? AND state='pending' AND "+active.sql,now,record.id,user.id,...active.args).run();
    await requireActive(db,active);
    const latest=await q(db,'SELECT state FROM social_requests WHERE id=?',record.id).first();
    check(latest?.state==='cancelled',409,'request_changed','This request was already handled. Refresh Friends to see its current state.');
    return json({cancelled:true});
   }
   check(typeof body.accept==='boolean',400,'invalid_response','Choose accept or decline.');
   if(await isBlocked(db,record.sender_id,record.recipient_id))throw unavailable();
   const state=body.accept?'accepted':'declined';
   if(record.state===state){await requireActive(db,active);return json({state,alreadyHandled:true});}
   if(record.state!=='pending')throw unavailable();
   await db.batch([
    q(db,`UPDATE social_requests AS r SET state=?,updated_at=? WHERE id=? AND recipient_id=? AND state='pending' AND ${blockedSQL} AND ${active.sql} AND ${activeTargetSql}`,state,now,record.id,user.id,...active.args,record.sender_id),
    q(db,"UPDATE social_requests SET state='cancelled',updated_at=? WHERE sender_id=? AND recipient_id=? AND state='pending' AND EXISTS(SELECT 1 FROM social_requests WHERE id=? AND state='accepted') AND "+active.sql,now,record.recipient_id,record.sender_id,record.id,...active.args)
   ]);
   await requireActive(db,active);const done=await q(db,'SELECT state FROM social_requests WHERE id=?',record.id).first();if(done?.state!==state)throw unavailable();return json({state});
  }
  if(path.length===3&&path[0]==='friends'&&path[2]==='remove'){
   check(path[1]!==user.id,400,'invalid_person','Choose another account.');
   await q(db,"UPDATE social_requests SET state='cancelled',updated_at=? WHERE ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) AND state='accepted' AND "+active.sql,now,user.id,path[1],path[1],user.id,...active.args).run();await requireActive(db,active);return json({removed:true});
  }
  if(path.length===1&&path[0]==='blocks'){
   check(typeof body.active==='boolean',400,'invalid_state','Choose whether to block this account.');
   let target;if(typeof body.accountId==='string')target=await q(db,"SELECT id FROM live_accounts WHERE id=? AND username IS NOT NULL AND account_status='active'",body.accountId).first();else target=await accountByName(db,body.username);
   if(!target||target.id===user.id)throw unavailable();
   const guard={sql:active.sql+' AND '+activeTargetSql,args:[...active.args,target.id]};
   if(body.active)await db.batch([
    q(db,'INSERT OR IGNORE INTO social_blocks(blocker_id,blocked_id,created_at) SELECT ?,?,? WHERE '+guard.sql,user.id,target.id,now,...guard.args),
    q(db,"UPDATE social_requests SET state='cancelled',updated_at=? WHERE ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) AND "+guard.sql,now,user.id,target.id,target.id,user.id,...guard.args)
   ]);else await q(db,'DELETE FROM social_blocks WHERE blocker_id=? AND blocked_id=? AND '+guard.sql,user.id,target.id,...guard.args).run();
   await requireActive(db,active);if(!await q(db,'SELECT 1 AS allowed WHERE '+activeTargetSql,target.id).first())throw unavailable();
   const ownBlock=await q(db,'SELECT 1 AS found FROM social_blocks WHERE blocker_id=? AND blocked_id=?',user.id,target.id).first();check(body.active?!!ownBlock:!ownBlock,409,'request_changed','This block changed before it could be saved. Refresh Friends.');
   return json({blocked:body.active});
  }
  throw new AuthError(404,'not_found','No social action matches this request.');
 }catch(error){const known=error instanceof AuthError;return json({error:{code:known?error.code:'social_unavailable',message:known?error.message:'This action could not finish. Try again.'}},known?error.status:503);}
}
export default {fetch:handleSocialRequest};
