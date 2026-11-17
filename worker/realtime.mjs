/** Authenticated, bounded, content-free revision stream. Payloads are hints;
 * cursor APIs remain the authority for messages and current permissions.
 * D1 has no push subscription API. A live Worker checks its revision row every
 * two seconds, instead of making each client reload message/list endpoints.
 */
import {authenticate,authRateLimit,AuthError} from './auth.mjs';
const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const json=(data,status)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const pause=(ms,signal)=>new Promise(resolve=>{if(signal.aborted)return resolve();const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();},timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true});});
const UUID=/^[a-f0-9-]{36}$/i;
function scopeFor(url){
 const conversation=url.searchParams.get('conversation'),channel=url.searchParams.get('channel');
 need(!conversation||!channel,400,'invalid_scope','Choose one conversation or channel.');
 need((!conversation||UUID.test(conversation))&&(!channel||UUID.test(channel)),404,'conversation_unavailable','This conversation is unavailable.');
 return {kind:conversation?'native':channel?'community':'account',id:conversation||channel||null};
}
async function snapshot(db,user,scope,time){
 // Session, suspension and current membership are checked in the same read as
 // every event. No content, member names, room names or access tokens enter SSE.
 const membership=scope.kind==='native'?" AND EXISTS(SELECT 1 FROM native_members m JOIN native_conversations c ON c.id=m.conversation_id AND c.security_mode='standard' WHERE m.conversation_id=? AND m.account_id=a.id)":scope.kind==='community'?" AND EXISTS(SELECT 1 FROM live_memberships m JOIN live_channels c ON c.community_id=m.community_id WHERE c.id=? AND m.account_id=a.id)":'';
 const revision=scope.kind==='native'?'(SELECT COALESCE(MAX(seq),0) FROM native_changes WHERE conversation_id=?)':scope.kind==='community'?'(SELECT COALESCE(MAX(seq),0) FROM live_changes WHERE channel_id=?)':'0';
 return q(db,`SELECT COALESCE(r.revision,0) AS accountRevision,${revision} AS conversationRevision FROM live_accounts a JOIN auth_sessions s ON s.account_id=a.id LEFT JOIN account_revisions r ON r.account_id=a.id WHERE a.id=? AND a.account_status='active' AND a.onboarding_complete=1 AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>?${membership}`,...(scope.id?[scope.id]:[]),user.id,user.sessionId,time,...(scope.id?[scope.id]:[])).first();
}
export function createRealtimeService({now=()=>Date.now(),pollMs=2000,ttlMs=45000,heartbeatMs=10000,wait=pause}={}){
 return async function handleRealtimeRequest(request,env){
  try{
   const url=new URL(request.url);need(url.pathname==='/api/realtime',404,'not_found','This update stream is unavailable.');need(request.method==='GET',405,'method_not_allowed','Open updates with GET.');
   const origin=request.headers.get('origin');need(!origin||origin===url.origin,403,'origin_denied','Open updates from this app.');
   need(!['cross-site','same-site'].includes(request.headers.get('sec-fetch-site')),403,'origin_denied','Open updates from this app.');
   const incoming=request.headers.get('last-event-id')??url.searchParams.get('after');need(incoming===null||(/^\d{1,16}$/.test(incoming)&&Number.isSafeInteger(Number(incoming))),400,'invalid_cursor','Reconnect with the last update position.');
   const user=await authenticate(request,env),db=env.DB,scope=scopeFor(url),started=now();
   const initial=await snapshot(db,user,scope,started);need(initial,404,'conversation_unavailable','This conversation or account is unavailable.');
   await authRateLimit(request,db,'realtime-open',30,started,user.id);
   const id=crypto.randomUUID(),expires=started+ttlMs;
   const result=await db.batch([
    q(db,'DELETE FROM realtime_streams WHERE id IN(SELECT id FROM realtime_streams WHERE expires_at<=? ORDER BY expires_at LIMIT 100)',started),
    q(db,"INSERT INTO realtime_streams(id,account_id,session_id,expires_at,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM realtime_streams WHERE account_id=? AND expires_at>?)<3 AND EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND a.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active')",id,user.id,user.sessionId,expires,started,user.id,started,user.sessionId,user.id,started)
   ]);need(result[1]?.meta?.changes>0,429,'stream_limit','Too many active update streams. Close another tab or use periodic refresh.');
   const aborter=new AbortController(),onAbort=()=>aborter.abort();request.signal.addEventListener('abort',onAbort,{once:true});if(request.signal.aborted)aborter.abort();
   const encoder=new TextEncoder();let closed=false;
   const stream=new ReadableStream({
    start(controller){
     const emit=(event,data,seq)=>{if(closed||aborter.signal.aborted)return;controller.enqueue(encoder.encode((seq===undefined?'':'id: '+seq+'\n')+'event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n'));};
     const payload=row=>({seq:Number(row.accountRevision),accountRevision:Number(row.accountRevision),nativeRevision:Number(row.accountRevision),conversationId:scope.kind==='native'?scope.id:null,channelId:scope.kind==='community'?scope.id:null,conversationRevision:Number(row.conversationRevision),scope:scope.kind});
     (async()=>{
      let previous=Number(initial.accountRevision),lastHeartbeat=started;
      emit('hello',{...payload(initial),leaseMs:ttlMs,pollFallbackAfterMs:15000,resumeRequired:incoming!==null&&Number(incoming)!==previous},previous);
      while(!aborter.signal.aborted&&now()<expires){
       await wait(Math.min(pollMs,Math.max(0,expires-now())),aborter.signal);if(aborter.signal.aborted)break;if(now()>=expires){emit('renew',{reconnect:true});break;}
       const row=await snapshot(db,user,scope,now());if(!row){emit('restricted',{reason:'access_changed'});break;}
       if(Number(row.accountRevision)!==previous){previous=Number(row.accountRevision);emit('revision',payload(row),previous);lastHeartbeat=now();}
       else if(now()-lastHeartbeat>=heartbeatMs){emit('heartbeat',{...payload(row),serverTime:now()},previous);lastHeartbeat=now();}
      }
     })().catch(()=>{emit('unavailable',{reason:'stream_interrupted'});}).finally(async()=>{
      request.signal.removeEventListener('abort',onAbort);aborter.abort();if(!closed){closed=true;try{controller.close();}catch{}}
      await q(db,'DELETE FROM realtime_streams WHERE id=? AND session_id=?',id,user.sessionId).run().catch(()=>{});
     });
    },
    cancel(){closed=true;aborter.abort();}
   });
   return new Response(stream,{headers:{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store, no-transform','x-content-type-options':'nosniff','x-accel-buffering':'no','referrer-policy':'no-referrer'}});
  }catch(error){return json({error:{code:error instanceof AuthError?error.code:'realtime_unavailable',message:error instanceof AuthError?error.message:'Live updates are unavailable. Periodic refresh remains available.'}},error instanceof AuthError?error.status:503);}
 };
}
export const handleRealtimeRequest=createRealtimeService();
