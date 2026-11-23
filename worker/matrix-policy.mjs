/** Durable reconciliation of native lifecycle decisions with an operated Synapse.
 * This narrow service never requests an impersonation token, message or key. */
const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const KINDS=new Set(['suspend','reinstate','delete','logout_all','logout_session','device_revoke']);
const fail=(code,retry=true)=>Object.assign(new Error(code),{policyCode:code,retry});
function configuration(env){let homeserver=null,serverName=null;try{const u=new URL(env.MATRIX_HOMESERVER);if(u.protocol==='https:'&&u.pathname==='/'&&!u.username&&!u.password&&!u.search&&!u.hash)homeserver=u.origin;const server=new URL('https://'+env.MATRIX_SERVER_NAME);if(server.host===env.MATRIX_SERVER_NAME&&server.hostname.includes('.')&&server.pathname==='/'&&!server.username&&!server.password&&!server.search&&!server.hash)serverName=server.host;}catch{}const token=env.MATRIX_ADMIN_TOKEN;return {homeserver,serverName,token,configured:!!homeserver&&!!serverName&&typeof token==='string'&&token.length>=16&&token.length<=8192&&!/[\u0000-\u0020\u007f]/.test(token)};}
export function matrixPolicyStatement(db,{accountId,kind,subjectId=null,idempotencyKey,requestedBy=null,time=Date.now(),guardSql='1',guardBinds=[]}={}){
 if(!accountId||!KINDS.has(kind)||typeof idempotencyKey!=='string'||!idempotencyKey||idempotencyKey.length>400||(['logout_session','device_revoke'].includes(kind)&&(!subjectId||subjectId.length>255)))throw TypeError('Invalid Matrix policy operation');
 // guardSql is server-authored SQL only, never request text. Callers place this
 // statement in the SAME atomic batch as their successful guarded native change.
 return q(db,`INSERT OR IGNORE INTO matrix_policy_operations(id,account_id,kind,subject_id,idempotency_key,status,next_attempt_at,requested_by,created_at,updated_at) SELECT ?,?,?,?,?,'pending',?,?,?,? WHERE (${guardSql}) AND EXISTS(SELECT 1 FROM matrix_account_links WHERE account_id=? AND verified_at IS NOT NULL)`,crypto.randomUUID(),accountId,kind,subjectId,idempotencyKey,time,requestedBy,time,time,...guardBinds,accountId);
}
export function matrixPolicySessionsStatement(db,{accountId,exceptSessionId=null,revokedAt=null,idempotencyKey,requestedBy=null,time=Date.now(),guardSql='1',guardBinds=[]}={}){
 if(!accountId||!idempotencyKey)throw TypeError('Invalid Matrix session policy');
 return q(db,`INSERT OR IGNORE INTO matrix_policy_operations(id,account_id,kind,subject_id,idempotency_key,status,next_attempt_at,requested_by,created_at,updated_at) SELECT lower(hex(randomblob(16))),?,'logout_session',s.id,?||':'||s.id,'pending',?,?,?,? FROM auth_sessions s WHERE s.account_id=? AND s.revoked_at IS NOT NULL AND (? IS NULL OR s.revoked_at=?) AND (? IS NULL OR s.id<>?) AND (${guardSql}) AND EXISTS(SELECT 1 FROM matrix_account_links WHERE account_id=? AND verified_at IS NOT NULL)`,accountId,idempotencyKey,time,requestedBy,time,time,accountId,revokedAt,revokedAt,exceptSessionId,exceptSessionId,...guardBinds,accountId);
}
export async function matrixPolicyHealth(env,{accountId}={}){
 const configured=configuration(env).configured,where=accountId?' WHERE account_id=?':'',rows=(await q(env.DB,'SELECT status,COUNT(*) AS count,MIN(created_at) AS oldest_at FROM matrix_policy_operations'+where+' GROUP BY status',...(accountId?[accountId]:[])).all()).results;
 const lastAttempt=await q(env.DB,'SELECT id,kind,status,attempt_count,last_error,updated_at,completed_at FROM matrix_policy_operations'+where+' ORDER BY updated_at DESC,id DESC LIMIT 1',...(accountId?[accountId]:[])).first();
 const unresolved=await q(env.DB,"SELECT COUNT(*) AS count FROM matrix_enrollment_issues WHERE state IN ('unknown','revocation_unknown')"+(accountId?' AND account_id=?':''),...(accountId?[accountId]:[])).first();
 const counts=Object.fromEntries(rows.map(row=>[row.status,row.count]));return {provider:'synapse-admin',configured,operations:counts,lastAttempt,unresolvedEnrollments:unresolved?.count||0,pending:(counts.pending||0)+(counts.retry||0)+(counts.running||0),blocked:counts.blocked||0,accountRestrictionsSynced:false,encryptedDefaultReady:false,scope:'Account suspension/deactivation and verified native-session device revocation. A dedicated Synapse room module can enforce native blocks and account eligibility on invite-only room events. Native community membership, to-device and federation policy coverage is unverified.',acceptance:'Not established by configuration or queue completion.'};
}
export function createMatrixPolicyService({now=()=>Date.now(),fetcher=(...args)=>fetch(...args)}={}){
 async function admin(config,path,{method='GET',body,missing=false}={}){
  // The caller constructs only supported lifecycle paths from a verified mapping.
  if(!/^\/_synapse\/admin\/(?:v1\/(?:suspend|deactivate)\/|v2\/users\/)/.test(path))throw fail('route_not_allowed',false);
  let response;try{response=await fetcher(config.homeserver+path,{method,redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{authorization:'Bearer '+config.token,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw fail('transport_unavailable');}
  if(missing&&response.status===404)return null;
  if(!response.ok)throw fail(response.status===401||response.status===403?'admin_authorization_unavailable':response.status===404?'admin_api_unsupported':response.status===429?'service_rate_limited':'service_unavailable',![400,404,405].includes(response.status));
  try{return await response.json();}catch{throw fail('invalid_service_response');}
 }
 async function devices(config,user){const result=await admin(config,'/_synapse/admin/v2/users/'+encodeURIComponent(user)+'/devices');if(!Array.isArray(result.devices)||result.devices.length>1000||result.total!==undefined&&result.total!==result.devices.length||result.devices.some(d=>typeof d.device_id!=='string'||!d.device_id||d.device_id.length>255))throw fail('unbounded_or_invalid_device_list',false);return result.devices.map(d=>d.device_id);}
 async function deleteDevices(config,user,ids){if(!ids.length)return;for(let i=0;i<ids.length;i+=100)await admin(config,'/_synapse/admin/v2/users/'+encodeURIComponent(user)+'/delete_devices',{method:'POST',body:{devices:ids.slice(i,i+100)}});const remaining=new Set(await devices(config,user));if(ids.some(id=>remaining.has(id)))throw fail('device_revocation_unconfirmed');}
 async function perform(db,config,op){
  const row=await q(db,'SELECT l.*,a.account_status FROM matrix_account_links l JOIN live_accounts a ON a.id=l.account_id WHERE l.account_id=? AND l.verified_at IS NOT NULL',op.account_id).first();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(op.account_id))),n=>n.toString(16).padStart(2,'0')).join('');
  if(!row||row.homeserver_origin!==config.homeserver||row.matrix_subject!=='v_'+digest||row.matrix_user_id!=='@v_'+digest+':'+config.serverName)throw fail('verified_mapping_unavailable',false);
  const user=row.matrix_user_id,encoded=encodeURIComponent(user),remote=await admin(config,'/_synapse/admin/v2/users/'+encoded,{missing:true});
  if(!remote){if(op.kind==='delete')return 'already_absent';throw fail('remote_account_absent',false);}
  if(remote.name!==user||remote.admin===true)throw fail('remote_identity_not_managed',false);
  if(remote.deactivated){if(op.kind==='delete'||['logout_all','logout_session','device_revoke','suspend'].includes(op.kind))return 'already_deactivated';throw fail('manual_reactivation_required',false);}
  if(op.kind==='delete'){
   if(row.account_status!=='deleted')throw fail('native_delete_not_authorized',false);
   await admin(config,'/_synapse/admin/v1/deactivate/'+encoded,{method:'POST',body:{erase:true}});const after=await admin(config,'/_synapse/admin/v2/users/'+encoded);if(after.deactivated!==true)throw fail('deactivation_unconfirmed');return 'deactivated';
  }
  if(op.kind==='suspend'){
   await deleteDevices(config,user,await devices(config,user));
   if(row.account_status!=='suspended')return 'tokens_revoked_native_status_changed';
   await admin(config,'/_synapse/admin/v1/suspend/'+encoded,{method:'PUT',body:{suspend:true}});const after=await admin(config,'/_synapse/admin/v2/users/'+encoded);if(after.suspended!==true)throw fail('suspension_unconfirmed');if(await q(db,"SELECT 1 AS present FROM matrix_enrollment_issues WHERE account_id=? AND state IN ('pending','unknown')",op.account_id).first())throw fail('enrollment_completion_unresolved');return 'suspended_and_devices_revoked';
  }
  if(op.kind==='reinstate'){
   if(row.account_status!=='active')return 'superseded_native_status';
   await admin(config,'/_synapse/admin/v1/suspend/'+encoded,{method:'PUT',body:{suspend:false}});const after=await admin(config,'/_synapse/admin/v2/users/'+encoded);if(after.suspended!==false)throw fail('reinstatement_unconfirmed');return 'reinstated';
  }
  if(op.kind==='logout_all'){await deleteDevices(config,user,await devices(config,user));if(await q(db,"SELECT 1 AS present FROM matrix_enrollment_issues WHERE account_id=? AND state IN ('pending','unknown')",op.account_id).first())throw fail('enrollment_completion_unresolved');return 'devices_revoked';}
  let ids=[];
  if(op.kind==='logout_session'){
   const native=await q(db,'SELECT revoked_at FROM auth_sessions WHERE id=? AND account_id=?',op.subject_id,op.account_id).first();if(native&&!native.revoked_at)throw fail('native_session_not_revoked',false);
   ids=(await q(db,"SELECT DISTINCT matrix_device_id FROM matrix_enrollment_issues WHERE account_id=? AND session_id=? AND matrix_device_id IS NOT NULL AND state IN ('confirmed','revocation_unknown')",op.account_id,op.subject_id).all()).results.map(r=>r.matrix_device_id);
   // An in-flight enrollment reserved before revocation is not silently ignored.
   if(await q(db,"SELECT 1 AS present FROM matrix_enrollment_issues WHERE account_id=? AND session_id=? AND state IN ('pending','unknown')",op.account_id,op.subject_id).first())throw fail('enrollment_completion_unresolved');
  }else if(op.kind==='device_revoke'){
   if(!await q(db,'SELECT 1 AS present FROM matrix_enrollment_issues WHERE account_id=? AND matrix_device_id=?',op.account_id,op.subject_id).first())throw fail('device_mapping_unavailable',false);ids=[op.subject_id];
  }else throw fail('operation_not_supported',false);
  await deleteDevices(config,user,ids);return ids.length?'mapped_devices_revoked':'no_mapped_devices';
 }
 async function drainMatrixPolicy(env,{limit=10}={}){
  const config=configuration(env),db=env.DB,summary={configured:config.configured,attempted:0,completed:0,retrying:0,blocked:0};if(!config.configured)return summary;
  const rows=(await q(db,"SELECT * FROM matrix_policy_operations WHERE (status IN ('pending','retry') AND next_attempt_at<=?) OR(status='running' AND lease_until<=?) ORDER BY created_at,id LIMIT ?",now(),now(),Math.max(1,Math.min(25,limit))).all()).results;
  for(const op of rows){
   const time=now(),lease=time+180000,claimed=await q(db,"UPDATE matrix_policy_operations SET status='running',attempt_count=attempt_count+1,lease_until=?,updated_at=? WHERE id=? AND ((status IN ('pending','retry') AND next_attempt_at<=?) OR(status='running' AND lease_until<=?)) AND NOT EXISTS(SELECT 1 FROM matrix_policy_operations other WHERE other.account_id=matrix_policy_operations.account_id AND other.id<>matrix_policy_operations.id AND other.status='running' AND other.lease_until>?)",lease,time,op.id,time,time,time).run();if(!(claimed.meta?.changes>0))continue;summary.attempted++;
   let status='done',code=null,outcome;try{outcome=await perform(db,config,op);}catch(error){code=error.policyCode||'internal_reconciliation_failure';status=error.retry===false||op.attempt_count>=11?'blocked':'retry';}
   const completed=now(),next=completed+Math.min(3600000,30000*2**Math.min(op.attempt_count,7));
   const finalized=await db.batch([
    q(db,'UPDATE matrix_policy_operations SET status=?,next_attempt_at=?,lease_until=NULL,last_error=?,updated_at=?,completed_at=? WHERE id=? AND status=? AND lease_until=?',status,next,code,completed,status==='done'?completed:null,op.id,'running',lease),
    q(db,"INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at) SELECT ?,?,'matrix.policy.attempt','account',?,?,? WHERE changes()=1",crypto.randomUUID(),op.requested_by||op.account_id,op.account_id,JSON.stringify({service:'matrix-policy',operationId:op.id,kind:op.kind,attempt:op.attempt_count+1,status,...(code?{code}:{outcome})}),completed)
   ]);if(finalized[0]?.meta?.changes>0)summary[status==='done'?'completed':status==='retry'?'retrying':'blocked']++;else summary.unconfirmed=(summary.unconfirmed||0)+1;
  }return summary;
 }
 return {drainMatrixPolicy};
}
export const drainMatrixPolicy=createMatrixPolicyService().drainMatrixPolicy;
