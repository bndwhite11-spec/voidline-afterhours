import {matrixPolicyStatement,matrixPolicySessionsStatement,matrixPolicyHealth} from './matrix-policy.mjs';
import {hostedBackupHealth} from './hosted-backup.mjs';
import {accountDeletionStatements,ACCOUNT_DELETION_RETENTION} from './account-deletion.mjs';
/** Platform administration. A public name never confers a platform role. */
import {authenticate,validateSessionMutation,authHash,authRateLimit,requestVerifiedResetForAccount,AuthError} from './auth.mjs';
import {requireRecentPasskey} from './passkeys.mjs';
import {COSMETICS} from './cosmetics.mjs';
import {notificationAvailability} from './notifications.mjs';

const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const need=(condition,status,code,message)=>{if(!condition)throw new AuthError(status,code,message);};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
const text=(value,max,label,minimum=0)=>{need(typeof value==='string'&&value.trim().length>=minimum&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),400,'invalid_input',`${label} must contain ${minimum}–${max} characters.`);return value.trim();};
const identifier=value=>{need(typeof value==='string'&&value.length>=1&&value.length<=100,400,'invalid_id','Choose a valid record.');return value;};
function page(url){const limit=Number(url.searchParams.get('limit')||30),offset=Number(url.searchParams.get('offset')||0);need(Number.isSafeInteger(limit)&&limit>=1&&limit<=100&&Number.isSafeInteger(offset)&&offset>=0&&offset<=100000,400,'invalid_page','Choose a valid page.');return {limit,offset};}
const pageInfo=(p,total)=>({...p,total,hasMore:p.offset+p.limit<total});
const like=value=>'%'+value.replace(/[\\%_]/g,'\\$&')+'%';
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 need(Number(request.headers.get('content-length')||0)<=12288,413,'body_too_large','The request is too large.');
 const reader=request.body?.getReader();need(reader,400,'body_required','A request body is required.');const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>12288){await reader.cancel();throw new AuthError(413,'body_too_large','The request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let result;try{result=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The request could not be read.');}
 need(result&&typeof result==='object'&&!Array.isArray(result),400,'invalid_body','Use a JSON object.');return result;
}
function audit(db,actor,action,type,id,detail,now){return q(db,'INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at) VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),actor,action,type,id,JSON.stringify(detail),now);}
async function ownerRecord(db){return q(db,'SELECT account_id,bound_at FROM platform_owner WHERE id=1').first();}
export async function requirePlatformOwner(request,env,{recent=true}={}){
 const user=await authenticate(request,env),owner=await ownerRecord(env.DB);
 need(owner&&owner.account_id===user.id,403,'platform_owner_required','This area is available only to the verified platform owner.');
 if(recent)requireRecentPasskey(user);
 return user;
}
function hasRecentProof(user,now){return user.reauthenticatedAt>now-600000&&Number(user.session?.mfa_verified_at||0)>now-300000;}
async function serviceAuthorization(request,env){
 const secret=env?.OWNER_BOOTSTRAP_TOKEN,provided=request.headers.get('authorization')||'';
 need(typeof secret==='string'&&secret.length>=32&&provided.startsWith('Bearer ')&&provided.length<1000,403,'bootstrap_unavailable','Owner setup is unavailable.');
 // Compare fixed-size hashes; neither the supplied token nor the secret is logged.
 const left=await authHash(secret),right=await authHash(provided.slice(7));let difference=0;for(let i=0;i<64;i++)difference|=left.charCodeAt(i)^right.charCodeAt(i);
 need(difference===0,403,'bootstrap_unavailable','Owner setup is unavailable.');
}
async function claimForCode(db,code,now){
 need(typeof code==='string'&&/^[a-f0-9]{64}$/.test(code),400,'invalid_claim','This ownership request is unavailable.');
 const claim=await q(db,`SELECT c.*,a.username,a.display_name,a.account_status,s.revoked_at,s.expires_at AS session_expires_at,s.reauthenticated_at,s.mfa_verified_at
  FROM owner_claims c JOIN live_accounts a ON a.id=c.account_id JOIN auth_sessions s ON s.id=c.session_id
  WHERE c.code_hash=?`,await authHash(code)).first();
 need(claim&&!claim.consumed_at&&claim.expires_at>now&&claim.account_status==='active'&&!claim.revoked_at&&claim.session_expires_at>now&&claim.reauthenticated_at>now-600000&&claim.mfa_verified_at>now-300000,410,'claim_expired','This ownership request expired. Create a new request while signed in.');
 return claim;
}
async function targetAccount(db,id){identifier(id);const account=await q(db,'SELECT id,username,display_name,account_status,created_at FROM live_accounts WHERE id=?',id).first();need(account,404,'account_unavailable','This account is unavailable.');return account;}
// The database clock is evaluated inside the mutation transaction. A logout,
// suspension or proof expiry after request preflight cannot authorize a write.
const databaseNow="CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)";
function ownerMutationGuard(user){return {sql:`EXISTS(SELECT 1 FROM platform_owner p JOIN live_accounts a ON a.id=p.account_id JOIN auth_sessions s ON s.account_id=p.account_id WHERE p.id=1 AND p.account_id=? AND s.id=? AND a.account_status='active' AND s.revoked_at IS NULL AND s.expires_at>${databaseNow} AND s.reauthenticated_at>${databaseNow}-600000 AND COALESCE(s.mfa_verified_at,0)>${databaseNow}-300000)`,binds:[user.id,user.sessionId]};}
async function currentOwnerProof(db,user){
 const row=await q(db,`SELECT a.account_status,s.revoked_at,s.expires_at,s.reauthenticated_at,s.mfa_verified_at,${databaseNow} AS clock_now FROM platform_owner p JOIN live_accounts a ON a.id=p.account_id JOIN auth_sessions s ON s.account_id=p.account_id WHERE p.id=1 AND p.account_id=? AND s.id=?`,user.id,user.sessionId).first();
 need(row&&row.account_status==='active'&&row.revoked_at===null&&row.expires_at>row.clock_now,401,'sign_in_required','Your owner session changed. Sign in and verify again.');
 requireRecentPasskey({reauthenticatedAt:row.reauthenticated_at,session:row},row.clock_now);
}
const communityOwnershipSql="(EXISTS(SELECT 1 FROM live_memberships WHERE account_id=? AND role='owner') OR EXISTS(SELECT 1 FROM live_communities WHERE created_by=? AND ownership_repair_required=0))";
async function ownsCommunity(db,accountId){return !!await q(db,'SELECT 1 AS found WHERE '+communityOwnershipSql,accountId,accountId).first();}
const deletionResult=(accountId,replayed)=>json({deleted:true,accountId,deletedAccount:{id:accountId,status:'deleted'},status:'deleted',replayed,retained:ACCOUNT_DELETION_RETENTION,matrixPolicyCompletion:'queued-if-verified-mapping-exists'});
function validateDeletionReceipt(receipt,{actorId,accountId,reason,clientId}){
 let detail;try{detail=JSON.parse(receipt.detail_json);}catch{}
 need(receipt.actor_id===actorId&&receipt.action==='account.deleted'&&receipt.target_type==='account'&&receipt.target_id===accountId&&detail?.reason===reason&&detail?.clientId===clientId,409,'idempotency_conflict','This deletion request ID was already used for a different account or reason. Start a new reviewed action.');
}
async function deleteAccountAsOwner(db,user,targetId,body){
 const accountId=identifier(targetId);need(body.confirmAccountId===accountId,400,'confirmation_required','Confirm the exact immutable account ID before deleting.');
 const reason=text(body.reason,400,'Deletion reason',5);need(typeof body.clientId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.clientId),400,'invalid_client_id','Use a stable deletion request ID for retries.');
 const clientId=body.clientId.toLowerCase(),auditId='admin-delete:'+user.id+':'+clientId,receiptArgs={actorId:user.id,accountId,reason,clientId};
 const receipt=await q(db,'SELECT * FROM admin_audit WHERE id=?',auditId).first();
 if(receipt){await currentOwnerProof(db,user);validateDeletionReceipt(receipt,receiptArgs);return deletionResult(accountId,true);}
 const account=await targetAccount(db,accountId);need(account.id!==user.id&&!await q(db,'SELECT 1 AS found FROM platform_owner WHERE account_id=?',accountId).first(),409,'owner_protected','The platform owner cannot be deleted through account administration.');
 if(account.account_status==='deleted'){
  // Another identical request can commit after the initial receipt lookup but
  // before this account read. A tombstone alone must not hide its valid receipt.
  const lateReceipt=await q(db,'SELECT * FROM admin_audit WHERE id=?',auditId).first();if(lateReceipt){await currentOwnerProof(db,user);validateDeletionReceipt(lateReceipt,receiptArgs);return deletionResult(accountId,true);}
  throw new AuthError(409,'account_deleted','This account was already deleted. It cannot be reinstated.');
 }
 need(!await ownsCommunity(db,accountId),409,'ownership_transfer_required','Transfer or repair community ownership before deleting this account. Communities and their histories will not be orphaned.');
 const time=Date.now(),authorization=ownerMutationGuard(user),executionId=crypto.randomUUID(),detail=JSON.stringify({clientId,reason,executionId,retention:'anonymized-account-and-shared-history'});
 // The receipt's unique execution marker authorizes cleanup only for the
 // transaction that actually won the INSERT, never a duplicate or losing CAS.
 const appliedSql="EXISTS(SELECT 1 FROM admin_audit WHERE id=? AND actor_id=? AND action='account.deleted' AND target_type='account' AND target_id=? AND detail_json=?)",appliedBinds=[auditId,user.id,accountId,detail];
 const result=await db.batch([
  q(db,`INSERT OR IGNORE INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at) SELECT ?,?,'account.deleted','account',?,?,? WHERE ${authorization.sql} AND EXISTS(SELECT 1 FROM live_accounts target WHERE target.id=? AND target.account_status<>'deleted') AND NOT EXISTS(SELECT 1 FROM platform_owner WHERE account_id=?) AND NOT ${communityOwnershipSql}`,auditId,user.id,accountId,detail,time,...authorization.binds,accountId,accountId,accountId,accountId),
  ...accountDeletionStatements(db,{accountId,guardSql:appliedSql,guardBinds:appliedBinds,time,actorId:user.id,operationId:'account-delete:'+auditId}),
 ]);
 if(result[0]?.meta?.changes>0)return deletionResult(accountId,false);
 // Distinguish an acknowledged duplicate from authorization/ownership changes
 // without ever claiming that a skipped transaction deleted an account.
 await currentOwnerProof(db,user);
 const concurrentReceipt=await q(db,'SELECT * FROM admin_audit WHERE id=?',auditId).first();if(concurrentReceipt){validateDeletionReceipt(concurrentReceipt,receiptArgs);return deletionResult(accountId,true);}
 need(!await q(db,'SELECT 1 AS found FROM platform_owner WHERE account_id=?',accountId).first(),409,'owner_protected','The platform owner cannot be deleted through account administration.');
 need(!await ownsCommunity(db,accountId),409,'ownership_transfer_required','Transfer or repair community ownership before deleting this account.');
 const current=await targetAccount(db,accountId);need(current.account_status!=='deleted',409,'account_deleted','This account was already deleted. It cannot be reinstated.');
 throw new AuthError(409,'account_changed','This account changed before deletion committed. Refresh and review the account again.');
}

export async function handleAdminRequest(request,env){
 try{
  const url=new URL(request.url),method=request.method,path=url.pathname.replace(/^\/api\/admin\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
  need(url.pathname==='/api/admin'||url.pathname.startsWith('/api/admin/'),404,'not_found','No administration action matches this request.');
  need(['GET','POST'].includes(method),405,'method_not_allowed','This method is unavailable.');
  need(env?.DB?.prepare&&env.DB.batch,503,'backend_unavailable','Administration is unavailable.');
  const db=env.DB,now=Date.now();
  // This is a server-operator channel, separate from ordinary browser APIs.
  if(path[0]==='bootstrap'&&['resolve','bind'].includes(path[1])&&path.length===2){
   need(method==='POST',405,'method_not_allowed','Use a POST request.');await serviceAuthorization(request,env);
   await authRateLimit(request,db,'owner-bootstrap',10,now);const body=await bodyJSON(request);
   need(!await ownerRecord(db),409,'owner_already_bound','The platform owner has already been bound.');
   const claim=await claimForCode(db,body.code,now);
   if(path[1]==='resolve')return json({accountId:claim.account_id,username:claim.username,displayName:claim.display_name,expiresAt:claim.expires_at});
   need(typeof env.PLATFORM_OWNER_ACCOUNT_ID==='string'&&env.PLATFORM_OWNER_ACCOUNT_ID===claim.account_id,403,'owner_configuration_mismatch','Trusted owner configuration does not match this verified account.');
   const writes=[q(db,`INSERT OR IGNORE INTO platform_owner(id,account_id,bound_at,binding_session_id)
    SELECT 1,c.account_id,?,c.session_id FROM owner_claims c JOIN auth_sessions s ON s.id=c.session_id JOIN live_accounts a ON a.id=c.account_id
    WHERE c.id=? AND c.account_id=? AND c.consumed_at IS NULL AND c.expires_at>? AND s.revoked_at IS NULL AND s.expires_at>?
      AND s.reauthenticated_at>? AND s.mfa_verified_at>? AND a.account_status='active' AND NOT EXISTS(SELECT 1 FROM platform_owner WHERE id=1)`,now,claim.id,claim.account_id,now,now,now-600000,now-300000),
    q(db,'UPDATE owner_claims SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM platform_owner WHERE id=1 AND account_id=? AND binding_session_id=?)',now,claim.id,claim.account_id,claim.session_id),
    q(db,`INSERT OR IGNORE INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at)
      SELECT ?,?,'platform.owner.bound','account',?,'{"method":"trusted-configuration-and-verified-session"}',?
      WHERE EXISTS(SELECT 1 FROM platform_owner WHERE id=1 AND account_id=? AND binding_session_id=?)`,'owner-binding-'+claim.id,claim.account_id,claim.account_id,now,claim.account_id,claim.session_id)];
   const result=await db.batch(writes);need(result[0]?.meta?.changes===1,409,'owner_already_bound','Owner setup was already completed or the verification expired.');
   return json({bound:true,accountId:claim.account_id,removeBootstrapSecret:true});
  }
  const user=await authenticate(request,env);
  if(path.length===1&&path[0]==='status'&&method==='GET'){
   const owner=await ownerRecord(db),isOwner=owner?.account_id===user.id;
   return json({isOwner,ownerConfigured:!!owner,needsVerification:isOwner&&!hasRecentProof(user,now)});
  }
  let body;if(method==='POST'){body=await bodyJSON(request);await validateSessionMutation(request,user,body);}
  if(path.length===2&&path[0]==='owner'&&path[1]==='claim'&&method==='POST'){
   need(!await ownerRecord(db),409,'owner_already_bound','The platform owner has already been configured.');requireRecentPasskey(user);
   await authRateLimit(request,db,'owner-claim',3,now,user.id);const code=random(),id=crypto.randomUUID(),expiresAt=now+300000;
   await db.batch([q(db,'DELETE FROM owner_claims WHERE expires_at<? OR account_id=?',now,user.id),q(db,'INSERT INTO owner_claims(id,account_id,session_id,code_hash,created_at,expires_at) VALUES(?,?,?,?,?,?)',id,user.id,user.sessionId,await authHash(code),now,expiresAt)]);
   return json({code,expiresAt,accountId:user.id,grantsAccess:false},201);
  }
  const owner=await ownerRecord(db);need(owner?.account_id===user.id,403,'platform_owner_required','This area is available only to the verified platform owner.');requireRecentPasskey(user);
  if(method==='POST')await authRateLimit(request,db,'admin-mutation',30,now,user.id);
  if(path.length===1&&path[0]==='health'&&method==='GET'){
   const counts={};for(const table of ['live_accounts','live_communities','live_channels','live_memberships','cosmetic_gifts','badge_awards','abuse_reports'])counts[table]=(await q(db,'SELECT COUNT(*) AS n FROM '+table).first()).n;
   return json({database:'available',accountCounts:{active:(await q(db,"SELECT COUNT(*) AS n FROM live_accounts WHERE account_status='active'").first()).n,suspended:(await q(db,"SELECT COUNT(*) AS n FROM live_accounts WHERE account_status='suspended'").first()).n},counts,encryptionServiceConfigured:!!env.MATRIX_HOMESERVER,encryptedDefaultReady:false,accountRestrictionsSynced:false,notificationDelivery:notificationAvailability(env),communityOwnershipRepairRequired:(await q(db,'SELECT COUNT(*) AS n FROM live_communities WHERE ownership_repair_required=1').first()).n,e2eeDecryptionAvailable:false,ownerMessageContentAccess:false,legacyTextMode:'explicit-consent-server-stored',matrixPolicy:await matrixPolicyHealth(env),backup:{...await hostedBackupHealth(env),managedProvider:'Sites-managed D1',manualExportAvailable:false,restoreCheck:'npm run check:restore'}});
  }
  if(path.length===1&&path[0]==='users'&&method==='GET'){
   const p=page(url),term=text(url.searchParams.get('q')||'',100,'Search'),needle=like(term);
   const where="WHERE (?='' OR a.username LIKE ? ESCAPE '\\' OR a.id=?)",values=[term,needle,term];
   const total=(await q(db,'SELECT COUNT(*) AS n FROM live_accounts a '+where,...values).first()).n;
   const rows=(await q(db,`SELECT a.id,a.username,a.display_name,a.account_status,a.created_at,a.updated_at,
    EXISTS(SELECT 1 FROM auth_credentials c WHERE c.account_id=a.id) AS has_password,
    (SELECT COUNT(*) FROM account_passkeys p WHERE p.account_id=a.id) AS passkey_count,
    EXISTS(SELECT 1 FROM account_emails e WHERE e.account_id=a.id AND e.verified_at IS NOT NULL) AS verified_email,
    (SELECT GROUP_CONCAT(DISTINCT provider) FROM auth_identities i WHERE i.account_id=a.id) AS provider_methods
    FROM live_accounts a ${where} ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?`,...values,p.limit,p.offset).all()).results;
   return json({users:rows.map(r=>({id:r.id,username:r.username,displayName:r.display_name,status:r.account_status,createdAt:r.created_at,updatedAt:r.updated_at,verifiedEmail:!!r.verified_email,methods:[...(r.has_password?['password']:[]),...(r.passkey_count?['passkey']:[]),...(r.provider_methods?r.provider_methods.split(','):[])]})),page:pageInfo(p,total)});
  }
  if(path.length===3&&path[0]==='users'&&method==='POST'){
   const action=path[2];if(action==='delete')return await deleteAccountAsOwner(db,user,path[1],body);
   const account=await targetAccount(db,path[1]);
   if(action==='status'){
    need(['active','suspended'].includes(body.status),400,'invalid_status','Choose active or suspended.');need(account.id!==user.id,409,'owner_protected','The platform owner cannot suspend their own account.');need(account.account_status!=='deleted',409,'account_deleted','Deleted accounts cannot be reinstated.');
    const reason=text(body.reason,400,'Reason',5),auditId=crypto.randomUUID(),authorization=ownerMutationGuard(user);
    // Deletion may commit after the preliminary account read. A tombstone is
    // terminal; the direct SQL changes() gate binds the audit and every later
    // effect to this request's successful update inside the same transaction.
    // D1 metadata can include trigger effects, so check the unique update >0.
    const appliedSql='EXISTS(SELECT 1 FROM admin_audit WHERE id=? AND actor_id=? AND target_id=?)',appliedBinds=[auditId,user.id,account.id];
    const result=await db.batch([
     q(db,"UPDATE live_accounts SET account_status=?,updated_at=? WHERE id=? AND account_status<>'deleted' AND NOT EXISTS(SELECT 1 FROM platform_owner WHERE account_id=live_accounts.id) AND "+authorization.sql,body.status,now,account.id,...authorization.binds),
     q(db,'INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1',auditId,user.id,'account.'+body.status,'account',account.id,JSON.stringify({reason}),now),
     q(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL AND '+appliedSql,now,account.id,...appliedBinds),
     matrixPolicyStatement(db,{accountId:account.id,kind:body.status==='suspended'?'suspend':'reinstate',idempotencyKey:'admin-status:'+auditId,requestedBy:user.id,time:now,guardSql:appliedSql,guardBinds:appliedBinds})
    ]);
    if(!(result[0]?.meta?.changes>0&&result[1]?.meta?.changes>0))await currentOwnerProof(db,user);
    need(result[0]?.meta?.changes>0&&result[1]?.meta?.changes>0,409,'account_changed','This account changed before the action committed. Refresh before trying again.');
    return json({changed:true,status:body.status,sessionsRevoked:true,matrixPolicyCompletion:'queued-if-verified-mapping-exists'});
   }
   if(action==='revoke-sessions'){
    const includeCurrent=body.includeCurrent===true,auditId=crypto.randomUUID(),authorization=ownerMutationGuard(user),appliedSql='EXISTS(SELECT 1 FROM admin_audit WHERE id=? AND actor_id=? AND target_id=?)',appliedBinds=[auditId,user.id,account.id];
    const writes=[q(db,'INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,detail_json,created_at) SELECT ?,?,?,?,?,?,? WHERE '+authorization.sql,auditId,user.id,'account.sessions.revoked','account',account.id,JSON.stringify({includeCurrent}),now,...authorization.binds),q(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL'+(!includeCurrent&&account.id===user.id?' AND id<>?':'')+' AND '+appliedSql,now,account.id,...(!includeCurrent&&account.id===user.id?[user.sessionId]:[]),...appliedBinds)];
    writes.push(matrixPolicySessionsStatement(db,{accountId:account.id,exceptSessionId:!includeCurrent&&account.id===user.id?user.sessionId:null,idempotencyKey:'admin-revoke:'+auditId,requestedBy:user.id,time:now,revokedAt:now,guardSql:appliedSql,guardBinds:appliedBinds}));const result=await db.batch(writes);if(!(result[0]?.meta?.changes>0)){await currentOwnerProof(db,user);throw new AuthError(409,'authorization_changed','Owner authorization changed before this action committed. Verify and retry.');}return json({revoked:true,matrixPolicyCompletion:'queued-if-verified-mapping-exists',currentSessionRevoked:includeCurrent&&account.id===user.id});
   }
   if(action==='recovery'){
    // Record intent before external delivery, so an audit failure cannot send
    // an unrecorded recovery request. No credential is returned to the owner.
    await audit(db,user.id,'account.recovery.requested','account',account.id,{channel:'verified-email'},now).run();
    let result;try{result=await requestVerifiedResetForAccount(request,env,account.id);}catch(error){await audit(db,user.id,'account.recovery.unavailable','account',account.id,{code:error instanceof AuthError?error.code:'provider-unavailable'},Date.now()).run();throw error;}
    await audit(db,user.id,'account.recovery.provider-accepted','account',account.id,{channel:'verified-email'},Date.now()).run();
    return json({...result,delivery:'provider-accepted',message:'The email provider accepted a reset request to the verified recovery channel. Inbox delivery is not confirmed.'});
   }
  }
  if(path.length===1&&path[0]==='communities'&&method==='GET'){
   const p=page(url),needle=like(text(url.searchParams.get('q')||'',100,'Search'));
   const total=(await q(db,"SELECT COUNT(*) AS n FROM live_communities WHERE name LIKE ? ESCAPE '\\'",needle).first()).n;
   const communities=(await q(db,`SELECT c.id,c.name,c.description,c.created_at,(SELECT account_id FROM live_memberships m WHERE m.community_id=c.id AND m.role='owner') AS owner_id,(SELECT COUNT(*) FROM live_memberships m WHERE m.community_id=c.id) AS member_count FROM live_communities c WHERE c.name LIKE ? ESCAPE '\\' ORDER BY c.created_at DESC,c.id LIMIT ? OFFSET ?`,needle,p.limit,p.offset).all()).results;
   return json({communities,page:pageInfo(p,total)});
  }
  if(path.length===3&&path[0]==='communities'&&path[2]==='revoke-invites'&&method==='POST'){
   const found=await q(db,'SELECT id FROM live_communities WHERE id=?',identifier(path[1])).first();need(found,404,'community_unavailable','This community is unavailable.');const reason=text(body.reason,400,'Reason',5);
   await db.batch([q(db,'UPDATE live_invites SET revoked_at=COALESCE(revoked_at,?) WHERE community_id=?',now,found.id),audit(db,user.id,'community.invites.revoked','community',found.id,{reason},now)]);return json({revoked:true});
  }
  if(path.length===1&&path[0]==='reports'&&method==='GET'){
   const p=page(url),status=url.searchParams.get('status')||'open';need(['open','reviewing','resolved','dismissed','all'].includes(status),400,'invalid_status','Choose a report status.');const filter=status==='all'?'':' WHERE status=?',values=status==='all'?[]:[status];
   const total=(await q(db,'SELECT COUNT(*) AS n FROM abuse_reports'+filter,...values).first()).n;
   const reports=(await q(db,'SELECT id,reporter_id,target_type,target_id,reason,detail_text,status,created_at,resolved_at,resolved_by FROM abuse_reports'+filter+' ORDER BY created_at DESC,id LIMIT ? OFFSET ?',...values,p.limit,p.offset).all()).results;
   return json({reports,page:pageInfo(p,total),contentDisclosure:'Report details contain only information deliberately submitted by the reporter.'});
  }
  if(path.length===3&&path[0]==='reports'&&path[2]==='resolve'&&method==='POST'){
   need(['reviewing','resolved','dismissed'].includes(body.status),400,'invalid_status','Choose a report status.');const reason=text(body.reason,400,'Review note',5),report=await q(db,'SELECT id FROM abuse_reports WHERE id=?',identifier(path[1])).first();need(report,404,'report_unavailable','This report is unavailable.');
   await db.batch([q(db,'UPDATE abuse_reports SET status=?,resolved_at=?,resolved_by=? WHERE id=?',body.status,body.status==='reviewing'?null:now,user.id,report.id),audit(db,user.id,'report.'+body.status,'report',report.id,{reason},now)]);return json({changed:true});
  }
  if(path.length===1&&path[0]==='catalog'&&method==='GET'){
   const overrides=(await q(db,'SELECT id,name,description,active,updated_at FROM gift_catalog').all()).results;
   return json({gifts:COSMETICS.filter(c=>c.type==='gift').map(item=>({...item,...overrides.find(r=>r.id===item.id),price:0})),monetary:false});
  }
  if(path.length===2&&path[0]==='catalog'&&method==='POST'){
   const item=COSMETICS.find(c=>c.id===path[1]&&c.type==='gift');need(item,404,'gift_unavailable','Choose an existing original gift design.');const name=text(body.name,60,'Gift name',2),description=text(body.description,300,'Description',2);need(typeof body.active==='boolean',400,'invalid_state','Choose whether the item is available.');
   await db.batch([q(db,'INSERT INTO gift_catalog(id,name,description,active,updated_by,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,active=excluded.active,updated_by=excluded.updated_by,updated_at=excluded.updated_at',item.id,name,description,body.active?1:0,user.id,now),audit(db,user.id,'gift.catalog.updated','gift',item.id,{active:body.active,name},now)]);return json({saved:true,price:0});
  }
  if(path.length===1&&path[0]==='badges'&&method==='GET'){
   const p=page(url),total=(await q(db,'SELECT COUNT(*) AS n FROM badge_definitions').first()).n;
   return json({definitions:(await q(db,'SELECT * FROM badge_definitions ORDER BY created_at,id LIMIT ? OFFSET ?',p.limit,p.offset).all()).results,page:pageInfo(p,total)});
  }
  if(path.length===1&&path[0]==='awards'&&method==='GET'){
   const p=page(url),accountId=url.searchParams.get('accountId'),filter=accountId?' WHERE account_id=?':'',values=accountId?[identifier(accountId)]:[];
   const total=(await q(db,'SELECT COUNT(*) AS n FROM badge_awards'+filter,...values).first()).n;
   return json({awards:(await q(db,'SELECT id,account_id,badge_id,issuer_id,issued_at,revoked_at,reason FROM badge_awards'+filter+' ORDER BY issued_at DESC,id LIMIT ? OFFSET ?',...values,p.limit,p.offset).all()).results,page:pageInfo(p,total)});
  }
  if(path.length===2&&path[0]==='badges'&&method==='POST'){
   need(/^[a-z][a-z0-9-]{2,47}$/.test(path[1]),400,'invalid_badge','Use a stable badge ID.');const name=text(body.name,60,'Badge name',2),description=text(body.description,300,'Description',5),requirement=text(body.requirement,500,'Requirement',10);need(['reviewed-contribution','profile-authored'].includes(body.rule),400,'invalid_rule','Choose a supported award rule.');need(typeof body.active==='boolean',400,'invalid_state','Choose whether the badge is available.');
   if(body.rule==='profile-authored')need(path[1]==='profile-authored',400,'invalid_rule','The profile rule belongs to the defined profile-authored badge.');
   await db.batch([q(db,'INSERT INTO badge_definitions(id,name,description,requirement,rule,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,requirement=excluded.requirement,rule=excluded.rule,active=excluded.active,updated_at=excluded.updated_at',path[1],name,description,requirement,body.rule,body.active?1:0,now,now),audit(db,user.id,'badge.definition.updated','badge',path[1],{active:body.active,rule:body.rule},now)]);return json({saved:true});
  }
  if(path.length===3&&path[0]==='badges'&&path[2]==='award'&&method==='POST'){
   const definition=await q(db,'SELECT * FROM badge_definitions WHERE id=?',identifier(path[1])).first();need(definition&&definition.active&&definition.rule==='reviewed-contribution',409,'review_required','Only an active reviewed-contribution badge may be awarded here.');const account=await targetAccount(db,body.accountId),reason=text(body.reason,500,'Review evidence',10);need(account.account_status==='active',409,'account_unavailable','Choose an active account.');
   await db.batch([q(db,'INSERT INTO badge_awards(id,account_id,badge_id,issuer_id,issued_at,reason) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,badge_id) DO UPDATE SET issuer_id=excluded.issuer_id,issued_at=excluded.issued_at,revoked_at=NULL,reason=excluded.reason',crypto.randomUUID(),account.id,definition.id,user.id,now,reason),audit(db,user.id,'badge.awarded','account',account.id,{badgeId:definition.id,reason},now)]);return json({awarded:true});
  }
  if(path.length===3&&path[0]==='awards'&&path[2]==='revoke'&&method==='POST'){
   const award=await q(db,'SELECT id,account_id,badge_id FROM badge_awards WHERE id=?',identifier(path[1])).first();need(award,404,'award_unavailable','This award is unavailable.');const reason=text(body.reason,500,'Revocation reason',10);await db.batch([q(db,'UPDATE badge_awards SET revoked_at=COALESCE(revoked_at,?) WHERE id=?',now,award.id),audit(db,user.id,'badge.revoked','account',award.account_id,{awardId:award.id,badgeId:award.badge_id,reason},now)]);return json({revoked:true});
  }
  if(path.length===1&&path[0]==='audit'&&method==='GET'){
   const p=page(url),total=(await q(db,'SELECT COUNT(*) AS n FROM admin_audit').first()).n;
   const events=(await q(db,'SELECT id,actor_id,action,target_type,target_id,detail_json,created_at FROM admin_audit ORDER BY created_at DESC,id LIMIT ? OFFSET ?',p.limit,p.offset).all()).results;return json({events,page:pageInfo(p,total)});
  }
  throw new AuthError(404,'not_found','No administration action matches this request.');
 }catch(error){if(error instanceof URIError)return json({error:{code:'invalid_path',message:'This record path is invalid.'}},400);return json({error:{code:error instanceof AuthError?error.code:'admin_unavailable',message:error instanceof AuthError?error.message:'The administrative operation could not be completed. No success was confirmed.'}},error instanceof AuthError?error.status:503);}
}
export default {fetch:handleAdminRequest};
