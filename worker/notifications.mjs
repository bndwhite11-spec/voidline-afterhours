/** Generic Web Push only. No message text, provider credentials or endpoint URLs enter responses. */
import {buildPushPayload} from '@block65/webcrypto-web-push';
import {authenticate, createAuthService, validateSessionMutation, authRateLimit, AuthError} from './auth.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const need=(value,status,code,message)=>{if(!value)throw new AuthError(status,code,message);};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const b64=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export function notificationAvailability(env){
 let valid=false;try{const subject=new URL(env.VAPID_SUBJECT);valid=subject.protocol==='https:'&&b64(env.VAPID_PUBLIC_KEY).length===65&&b64(env.VAPID_PRIVATE_KEY).length===32;}catch{}
 return {push:valid,reason:valid?'Optional generic notifications for native account activity. Encrypted Matrix pushes are separate.':'Browser push needs server notification-key configuration. No permission is requested automatically.'};
}
export function allowedPushEndpoint(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!u.hash&&u.href.length<=2048&&(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||u.hostname.endsWith('.push.services.mozilla.com')||u.hostname.endsWith('.push.apple.com')||u.hostname.endsWith('.notify.windows.com'));}catch{return false;}
}
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 const reader=request.body?.getReader();need(reader,400,'body_required','A request body is required.');let length=0;const chunks=[];
 for(;;){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();throw new AuthError(413,'body_too_large','The subscription is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The subscription could not be read.');}need(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_body','Use a JSON object.');return body;
}
function preferences(row){let p={};try{p=JSON.parse(row?.preferences||'{}');}catch{}return {dm:true,mentions:true,replies:true,community:false,gifts:true,...(p?.notifications||{})};}
export function pushQuietHours(preferences,now){
 const h=preferences.quietHours;if(!h?.enabled)return false;
 if(!/^\d\d:\d\d$/.test(h.start||'')||!/^\d\d:\d\d$/.test(h.end||''))return true;
 let current;try{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:h.timeZone||'UTC',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);current=parts.find(p=>p.type==='hour').value+':'+parts.find(p=>p.type==='minute').value;}catch{return true;}
 return h.start===h.end|| (h.start<h.end?current>=h.start&&current<h.end:current>=h.start||current<h.end);
}
async function source(db,event,accountId,now){
 if(event.kind==='test')return event.actor_id===accountId?{path:'#inbox'}:null;
 if(event.actor_id===accountId)return null;
 if(await q(db,'SELECT 1 AS blocked FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)',event.actor_id,accountId,accountId,event.actor_id).first())return null;
 const pref=preferences(await q(db,'SELECT preferences FROM account_organization WHERE account_id=?',accountId).first());if(pushQuietHours(pref,now))return null;
 if(event.kind==='native'){
  const row=await q(db,`SELECT c.id,p.muted FROM native_messages m JOIN native_conversations c ON c.id=m.conversation_id JOIN native_members own ON own.conversation_id=c.id AND own.account_id=? LEFT JOIN native_conversation_preferences p ON p.account_id=own.account_id AND p.conversation_id=c.id WHERE m.id=? AND m.deleted_at IS NULL AND own.joined_at<=? AND own.read_seq<m.seq`,accountId,event.source_id,event.created_at).first();
  return row&&!row.muted&&pref.dm!==false?{path:'#messages/'+encodeURIComponent(row.id)}:null;
 }
 if(event.kind==='community'){
  const row=await q(db,`SELECT m.id,m.seq,c.id AS channel_id,c.community_id,COALESCE(r.author_id,t.author_id) AS replied_to,o.muted,EXISTS(SELECT 1 FROM live_message_mentions x WHERE x.message_id=m.id AND x.account_id=?) AS mentioned FROM live_messages m JOIN live_channels c ON c.id=m.channel_id JOIN live_memberships member ON member.community_id=c.community_id AND member.account_id=? LEFT JOIN live_messages r ON r.id=m.reply_to_id LEFT JOIN live_messages t ON t.id=m.thread_root_id LEFT JOIN organization_targets o ON o.account_id=member.account_id AND o.channel_id=c.id LEFT JOIN live_read_states reads ON reads.account_id=member.account_id AND reads.channel_id=c.id WHERE m.id=? AND m.deleted_at IS NULL AND member.joined_at<=? AND COALESCE(reads.seq,0)<m.seq`,accountId,accountId,event.source_id,event.created_at).first();
  return row&&!row.muted&&(pref.community===true||row.mentioned&&pref.mentions!==false||row.replied_to===accountId&&pref.replies!==false)?{path:'#servers/'+encodeURIComponent(row.community_id)+'/channels/'+encodeURIComponent(row.channel_id)+'/messages/'+encodeURIComponent(row.id)}:null;
 }
 if(event.kind==='friend')return await q(db,"SELECT 1 AS ok FROM social_requests WHERE id=? AND recipient_id=? AND state='pending'",event.source_id,accountId).first()?{path:'#you'}:null;
 if(event.kind==='gift')return pref.gifts!==false&&await q(db,"SELECT 1 AS ok FROM cosmetic_gifts WHERE id=? AND recipient_id=? AND state='pending'",event.source_id,accountId).first()?{path:'#you'}:null;
 return null;
}
export function createNotificationService({fetcher=fetch,now=Date.now}={}){
 const authenticateRequest=createAuthService({now}).authenticate;
 async function dispatch(env){
  if(!env.DB||!notificationAvailability(env).push)return {processed:0,accepted:0};const db=env.DB,time=now();let processed=0,accepted=0;
  // Subscriptions never receive activity predating their opt-in. Skip that backlog.
  await q(db,"UPDATE notification_events SET processed_at=? WHERE processed_at=0 AND created_at<COALESCE((SELECT MIN(p.created_at) FROM push_subscriptions p JOIN auth_sessions s ON s.id=p.session_id JOIN live_accounts a ON a.id=p.account_id WHERE s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active'),?)",time,time,time+1).run();
  await q(db,"UPDATE push_deliveries SET state='failed',updated_at=? WHERE attempts>=5 AND (state='retry' OR(state='sending' AND claimed_at<?))",time,time-60000).run();
  await q(db,'DELETE FROM notification_events WHERE processed_at>0 AND created_at<?',time-7*86400000).run();
  const events=(await q(db,'SELECT * FROM notification_events WHERE processed_at=0 ORDER BY seq LIMIT 4').all()).results;
  for(const event of events){
   const scope=event.kind==='native'?"EXISTS(SELECT 1 FROM native_members m WHERE m.conversation_id=? AND m.account_id=p.account_id AND m.joined_at<=?)":event.kind==='community'?"EXISTS(SELECT 1 FROM live_memberships m WHERE m.community_id=? AND m.account_id=p.account_id AND m.joined_at<=?)":event.kind==='friend'?"EXISTS(SELECT 1 FROM social_requests r WHERE r.id=? AND r.recipient_id=p.account_id AND r.state='pending')":event.kind==='gift'?"EXISTS(SELECT 1 FROM cosmetic_gifts g WHERE g.id=? AND g.recipient_id=p.account_id AND g.state='pending')":"p.account_id=?";
   const args=event.kind==='native'?[event.conversation_id,event.created_at]:event.kind==='community'?[event.community_id,event.created_at]:event.kind==='test'?[event.actor_id]:[event.source_id];
   await db.batch([
    q(db,`INSERT OR IGNORE INTO push_deliveries(event_seq,subscription_id,state,attempts,next_attempt_at,claimed_at,updated_at) SELECT ?,p.id,'pending',0,0,0,? FROM push_subscriptions p JOIN auth_sessions session ON session.id=p.session_id AND session.account_id=p.account_id JOIN live_accounts a ON a.id=p.account_id WHERE session.revoked_at IS NULL AND session.expires_at>? AND a.account_status='active' AND p.created_at<=? AND ${event.kind==='test'?'1=1':'p.account_id<>?'} AND ${scope}`,event.seq,time,time,event.created_at,...(event.kind==='test'?[]:[event.actor_id]),...args),
    q(db,'UPDATE notification_events SET processed_at=? WHERE seq=?',time,event.seq)
   ]);processed++;
  }
  const pending=(await q(db,`SELECT d.*,p.endpoint,p.keys_json,p.account_id,p.session_id,p.created_at AS subscribed_at,e.kind,e.source_id,e.actor_id,e.created_at FROM push_deliveries d JOIN push_subscriptions p ON p.id=d.subscription_id JOIN notification_events e ON e.seq=d.event_seq WHERE d.attempts<5 AND ((d.state IN ('pending','retry') AND d.next_attempt_at<=?) OR(d.state='sending' AND d.claimed_at<?)) ORDER BY d.event_seq LIMIT 10`,time,time-60000).all()).results;
  for(const item of pending){
   const claim=await q(db,"UPDATE push_deliveries SET state='sending',attempts=attempts+1,claimed_at=?,updated_at=? WHERE event_seq=? AND subscription_id=? AND attempts<5 AND ((state IN('pending','retry') AND next_attempt_at<=?) OR(state='sending' AND claimed_at<?))",time,time,item.event_seq,item.subscription_id,time,time-60000).run();if(claim.meta?.changes!==1)continue;
   const active=await q(db,"SELECT 1 AS ok FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active'",item.session_id,item.account_id,time).first();
   const destination=active?await source(db,item,item.account_id,time):null;
   if(item.subscribed_at>item.created_at||!destination||!allowedPushEndpoint(item.endpoint)){await q(db,"UPDATE push_deliveries SET state='failed',updated_at=? WHERE event_seq=? AND subscription_id=?",time,item.event_seq,item.subscription_id).run();continue;}
   try{
    const payload=await buildPushPayload({data:JSON.stringify({title:'VOIDLINE',body:item.kind==='test'?'Notifications are connected.':'You have new activity in VOIDLINE.',path:destination.path,tag:'voidline-'+item.event_seq}),options:{ttl:300,urgency:'normal'}},{endpoint:item.endpoint,expirationTime:null,keys:JSON.parse(item.keys_json)},{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
    // Async key agreement can yield; recheck access at actual provider dispatch.
    const fresh=now(),stillActive=await q(db,"SELECT 1 AS ok FROM push_subscriptions p JOIN auth_sessions s ON s.id=p.session_id AND s.account_id=p.account_id JOIN live_accounts a ON a.id=p.account_id WHERE p.id=? AND p.endpoint=? AND p.keys_json=? AND p.created_at<=? AND s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active'",item.subscription_id,item.endpoint,item.keys_json,item.created_at,item.session_id,item.account_id,fresh).first();
    if(!stillActive||!await source(db,item,item.account_id,fresh)){await q(db,"UPDATE push_deliveries SET state='failed',updated_at=? WHERE event_seq=? AND subscription_id=?",fresh,item.event_seq,item.subscription_id).run();continue;}
    const response=await fetcher(item.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(5000)});
    if(response.status===404||response.status===410){await q(db,'DELETE FROM push_subscriptions WHERE id=?',item.subscription_id).run();continue;}
    if(response.status===201||response.status===202){await q(db,"UPDATE push_deliveries SET state='sent',updated_at=? WHERE event_seq=? AND subscription_id=?",time,item.event_seq,item.subscription_id).run();accepted++;continue;}
    if(response.status!==429&&response.status<500){await q(db,"UPDATE push_deliveries SET state='failed',updated_at=? WHERE event_seq=? AND subscription_id=?",time,item.event_seq,item.subscription_id).run();continue;}
    throw Error('Provider unavailable');
   }catch{await q(db,"UPDATE push_deliveries SET state=?,next_attempt_at=?,updated_at=? WHERE event_seq=? AND subscription_id=?",item.attempts+1>=5?'failed':'retry',time+Math.min(3600000,30000*2**item.attempts),time,item.event_seq,item.subscription_id).run();}
  }
  return {processed,accepted};
 }
 async function handleNotificationsRequest(request,env){
  try{
   const path=new URL(request.url).pathname.replace(/^\/api\/notifications\/?/,'').split('/').filter(Boolean);const user=await authenticateRequest(request,env),db=env.DB,time=now();
   if(path[0]==='config'&&path.length===1&&request.method==='GET')return json({...notificationAvailability(env),configured:notificationAvailability(env).push,publicKey:notificationAvailability(env).push?env.VAPID_PUBLIC_KEY:null,privacy:'Generic native-activity notifications only. No message text is sent.',subscriptions:(await q(db,'SELECT id,created_at FROM push_subscriptions WHERE account_id=? AND session_id=?',user.id,user.sessionId).all()).results});
   need(request.method==='POST',405,'method_not_allowed','Use a supported notification action.');const body=await bodyJSON(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'push-settings',20,time,user.id);
   if(path.length===1&&path[0]==='subscribe'){
    need(notificationAvailability(env).push,503,'push_unavailable','Push delivery is not configured.');const sub=body.subscription;need(sub&&allowedPushEndpoint(sub.endpoint),400,'invalid_endpoint','Use a supported browser push service.');let pub,auth;try{pub=b64(sub.keys.p256dh);auth=b64(sub.keys.auth);await crypto.subtle.importKey('raw',pub,{name:'ECDH',namedCurve:'P-256'},false,[]);}catch{throw new AuthError(400,'invalid_subscription','The browser subscription is invalid.');}need(pub.length===65&&auth.length===16,400,'invalid_subscription','The browser subscription is invalid.');
    const id=crypto.randomUUID(),stored=JSON.stringify({p256dh:sub.keys.p256dh,auth:sub.keys.auth});
    const result=await q(db,`INSERT INTO push_subscriptions(id,account_id,session_id,endpoint,keys_json,created_at,last_used_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active') ON CONFLICT(endpoint) DO UPDATE SET account_id=excluded.account_id,session_id=excluded.session_id,keys_json=excluded.keys_json,created_at=CASE WHEN (push_subscriptions.account_id<>excluded.account_id OR push_subscriptions.session_id<>excluded.session_id) THEN excluded.created_at ELSE push_subscriptions.created_at END,last_used_at=excluded.last_used_at WHERE push_subscriptions.account_id=excluded.account_id OR NOT EXISTS(SELECT 1 FROM auth_sessions old WHERE old.id=push_subscriptions.session_id AND old.revoked_at IS NULL AND old.expires_at>?)`,id,user.id,user.sessionId,sub.endpoint,stored,time,time,user.sessionId,user.id,time,time).run();need(result.meta?.changes===1,409,'subscription_changed','The browser subscription belongs to another active session or your access changed.');
    const record=await q(db,'SELECT id FROM push_subscriptions WHERE endpoint=? AND account_id=?',sub.endpoint,user.id).first();return json({registered:true,id:record.id},201);
   }
   if(path.length===2&&path[0]==='remove'){await q(db,'DELETE FROM push_subscriptions WHERE id=? AND account_id=?',path[1],user.id).run();return json({removed:true});}
   if(path.length===1&&path[0]==='test'){need(notificationAvailability(env).push,503,'push_unavailable','Push delivery is not configured.');const queued=await q(db,"INSERT INTO notification_events(kind,source_id,actor_id,created_at) SELECT 'test',?,?,? WHERE EXISTS(SELECT 1 FROM auth_sessions WHERE id=? AND account_id=? AND revoked_at IS NULL AND expires_at>?)",crypto.randomUUID(),user.id,time,user.sessionId,user.id,time).run();need(queued.meta?.changes===1,409,'session_changed','Your session changed. Sign in again.');return json({queued:true,deliveryConfirmed:false},202);}
   throw new AuthError(404,'not_found','This notification action is unavailable.');
  }catch(error){return json({error:{code:error instanceof AuthError?error.code:'notifications_unavailable',message:error instanceof AuthError?error.message:'Notification settings could not be updated.'}},error instanceof AuthError?error.status:503);}
 }
 return {handleNotificationsRequest,dispatch};
}
const service=createNotificationService();export const handleNotificationsRequest=service.handleNotificationsRequest;export const dispatchNotifications=service.dispatch;
let drain;
export async function scheduleNotificationDelivery(request,env,ctx){
 if(!env.DB||!notificationAvailability(env).push||!ctx?.waitUntil)return;
 try{await authenticate(request,env);}catch{return;}
 if(!drain)drain=dispatchNotifications(env).catch(()=>({processed:0,accepted:0})).finally(()=>{drain=null;});ctx.waitUntil(drain);
}
