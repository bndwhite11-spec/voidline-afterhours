/** Native-account enrollment for a separately operated Synapse JWT service.
 * Login JWTs stay server-side. This endpoint never receives message keys. */
import {SignJWT} from 'jose';
import {matrixPolicyHealth} from './matrix-policy.mjs';
import {authenticate,validateSessionMutation,authRateLimit,authHash,normalizeUsername,AuthError} from './auth.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','pragma':'no-cache','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}});
const encoder=new TextEncoder(),TTL_SECONDS=45;
function httpsOrigin(value){try{const u=new URL(value);return u.protocol==='https:'&&u.pathname==='/'&&!u.username&&!u.password&&!u.search&&!u.hash?u.origin:null;}catch{return null;}}
function configuration(env){
 const homeserver=httpsOrigin(env?.MATRIX_HOMESERVER),issuer=httpsOrigin(env?.VOIDLINE_ORIGIN),serverName=env?.MATRIX_SERVER_NAME,audience=env?.MATRIX_JWT_AUDIENCE,secret=env?.MATRIX_JWT_SECRET;
 let validName=false;try{const u=new URL('https://'+serverName);validName=typeof serverName==='string'&&serverName.length<=185&&u.host===serverName&&u.hostname.includes('.')&&u.pathname==='/'&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{}
 const configured=env?.MATRIX_JWT_NAMESPACE_RESERVED==='1'&&!!homeserver&&!!issuer&&validName&&typeof audience==='string'&&audience.length>=1&&audience.length<=200&&!/[\u0000-\u0020\u007f]/.test(audience)&&typeof secret==='string'&&encoder.encode(secret).length>=32&&encoder.encode(secret).length<=4096;
 return {configured,homeserver,issuer,serverName:validName?serverName:null,audience,secret};
}
function activeGuard(user,time){return {sql:"EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.reauthenticated_at>? AND a.account_status='active' AND a.onboarding_complete=1)",args:[user.sessionId,user.id,time,time-10*60000]};}
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use an application/json request.');
 const reader=request.body?.getReader();need(reader,400,'invalid_request','An enrollment request is required.');const parts=[];let length=0;
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();throw new AuthError(413,'request_too_large','The enrollment request is too large.');}parts.push(value);}
 const bytes=new Uint8Array(length);let position=0;for(const value of parts){bytes.set(value,position);position+=value.byteLength;}let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_request','The enrollment request could not be read.');}
 need(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_request','Use an enrollment object.');return body;
}
async function expectedIdentity(accountId,config){const subject='v_'+await authHash(accountId);return {subject,userId:'@'+subject+':'+config.serverName};}
// Public discovery only: never sign in, allocate a device or echo provider output.
async function discoveryJSON(response){
 if(response.status!==200){try{await response.body?.cancel();}catch{}return null;}
 const reader=response.body?.getReader();if(!reader)return null;const parts=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return null;}parts.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  const value=JSON.parse(new TextDecoder().decode(bytes));return value&&typeof value==='object'&&!Array.isArray(value)?value:null;
 }catch{try{await reader.cancel();}catch{}return null;}
}
export function createEncryptionService({now=()=>Date.now(),fetcher=(...args)=>fetch(...args)}={}){
 async function discover(config,path,validate){
  try{const response=await fetcher(config.homeserver+path,{method:'GET',headers:{accept:'application/json'},redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(response.status!==200){try{await response.body?.cancel();}catch{}return 'unavailable';}
   const data=await discoveryJSON(response);return data?validate(data):'invalid';
  }catch{return 'unavailable';}
 }
 async function checkService(config){
  const base={configured:config.configured,checkedAt:now(),enrollmentProven:false,encryptedDefaultReady:false,accountRestrictionsSynced:false};
  if(!config.configured)return {...base,status:'not-configured',checks:{versions:'not-checked',login:'not-checked'}};
  const [versions,login]=await Promise.all([
   discover(config,'/_matrix/client/versions',data=>Array.isArray(data.versions)&&data.versions.length>0&&data.versions.length<=128&&data.versions.every(value=>typeof value==='string'&&/^(?:v\d{1,4}\.\d{1,4}|r\d{1,4}\.\d{1,4}\.\d{1,4})$/.test(value))?'valid':'invalid'),
   discover(config,'/_matrix/client/v3/login',data=>Array.isArray(data.flows)&&data.flows.length<=128&&data.flows.every(flow=>flow&&typeof flow==='object'&&!Array.isArray(flow)&&typeof flow.type==='string'&&flow.type.length>0&&flow.type.length<=200)?data.flows.some(flow=>flow.type==='org.matrix.login.jwt')?'jwt-advertised':'not-advertised':'invalid')
  ]);
  return {...base,status:versions==='valid'&&login==='jwt-advertised'?'advertised':'unavailable',checks:{versions,login}};
 }
 async function matrix(config,path,{token,body}={}){
  const response=await fetcher(config.homeserver+path,{method:body===undefined?'GET':'POST',headers:{accept:'application/json',...(token?{authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
  let data;try{data=await response.json();}catch{throw new AuthError(503,'encrypted_service_unavailable','The encrypted service returned an unreadable response.');}
  need(response.ok,503,'encrypted_service_unavailable','The encrypted service could not complete enrollment. Your existing conversations have not changed.');return data;
 }
 async function logout(config,token){try{await matrix(config,'/_matrix/client/v3/logout',{token,body:{}});return 'confirmed';}catch{return 'unknown';}}
 async function markIssue(db,user,jti,state,deviceId=null){await q(db,'UPDATE matrix_enrollment_issues SET state=?,matrix_device_id=COALESCE(?,matrix_device_id),completed_at=? WHERE jti=? AND account_id=? AND session_id=?',state,deviceId,now(),jti,user.id,user.sessionId).run();}
 async function handleEncryptionRequest(request,env){
  let inFlightToken=null,config=null,user=null,jti=null,deviceId=null,ownsIssue=false,preflight=false;
  try{
   const url=new URL(request.url),path=url.pathname.replace(/^\/api\/encryption\/?/,'').split('/').filter(Boolean);
   preflight=path.length===1&&path[0]==='check';
   need(url.pathname==='/api/encryption'||url.pathname.startsWith('/api/encryption/'),404,'not_found','No encrypted enrollment action matches this request.');need(['GET','POST'].includes(request.method),405,'method_not_allowed','This method is unavailable.');
   user=await authenticate(request,env);const db=env.DB;config=configuration(env);
   if(preflight&&request.method==='POST'){
    const body=await bodyJSON(request);await validateSessionMutation(request,user,body);
    need(Object.keys(body).every(key=>key==='expectedAccountId'),400,'invalid_request','Service checks use the configured encrypted service.');
    await authRateLimit(request,db,'encrypted-service-check',3,now(),user.id);
    return json(await checkService(config));
   }
   if(path.length===1&&path[0]==='config'&&request.method==='GET'){
    const password=await q(db,'SELECT 1 AS present FROM auth_credentials WHERE account_id=?',user.id).first();
    const policy=await matrixPolicyHealth(env,{accountId:user.id});
    return json({policy,callsEnabled:config.configured&&policy.configured&&env.MATRIX_CALLS_ENABLED==='1',configured:config.configured,provider:'synapse-jwt',credentialHomeserver:config.homeserver,homeserver:config.configured?config.homeserver:null,serverName:config.configured?config.serverName:null,requiresNativePassword:true,nativePasswordAvailable:!!password,encryptedDefaultReady:false,accountRestrictionsSynced:false,description:config.configured?'An encrypted service is configured. Device verification and recovery remain separate.':'Encrypted account enrollment is not configured. Standard messaging remains a separate choice.'});
   }
   need(config.configured,503,'encrypted_enrollment_unavailable','Encrypted account enrollment is not configured. Your existing account and Standard conversations remain available.');
   const identity=await expectedIdentity(user.id,config);need(identity.userId.length<=255,503,'encrypted_configuration_invalid','The encrypted service identity configuration is invalid.');
   if(path.length===1&&path[0]==='call-permission'&&request.method==='GET'){
    need(env.MATRIX_CALLS_ENABLED==='1' && (await matrixPolicyHealth(env,{accountId:user.id})).configured,503,'calling_unavailable','Calling is unavailable on this service.');
    const peer=url.searchParams.get('peer'),device=url.searchParams.get('device');
    need(typeof peer==='string'&&peer.length<=255&&typeof device==='string'&&device.length>=1&&device.length<=255,400,'invalid_call_recipient','Choose a verified direct conversation.');
    const allowed=await q(db,`SELECT 1 AS allowed FROM matrix_account_links me
      JOIN matrix_enrollment_issues own ON own.account_id=me.account_id
      JOIN matrix_account_links target ON target.homeserver_origin=me.homeserver_origin AND target.account_id<>me.account_id
      JOIN live_accounts other ON other.id=target.account_id
      WHERE me.account_id=? AND me.homeserver_origin=? AND me.verified_at IS NOT NULL
        AND own.session_id=? AND own.state='confirmed' AND own.matrix_device_id=?
        AND target.matrix_user_id=? AND target.verified_at IS NOT NULL AND other.account_status='active'
        AND EXISTS (SELECT 1 FROM social_requests r WHERE r.state='accepted' AND ((r.sender_id=me.account_id AND r.recipient_id=target.account_id) OR (r.sender_id=target.account_id AND r.recipient_id=me.account_id)))
        AND NOT EXISTS (SELECT 1 FROM social_blocks b WHERE (b.blocker_id=me.account_id AND b.blocked_id=target.account_id) OR (b.blocker_id=target.account_id AND b.blocked_id=me.account_id)) LIMIT 1`,user.id,config.homeserver,user.sessionId,device,peer).first();
    need(allowed,403,'call_unavailable','This device cannot call that participant.');return json({allowed:true});
   }
   if(path.length===1&&path[0]==='recipient'&&request.method==='GET'){
    const username=normalizeUsername(url.searchParams.get('username'));
    const target=await q(db,`SELECT a.id,a.username,a.display_name,l.matrix_user_id FROM live_accounts a JOIN matrix_account_links l ON l.account_id=a.id AND l.verified_at IS NOT NULL AND l.homeserver_origin=? WHERE a.username=? AND a.account_status='active' AND EXISTS(SELECT 1 FROM social_requests r WHERE r.state='accepted' AND ((r.sender_id=? AND r.recipient_id=a.id) OR(r.recipient_id=? AND r.sender_id=a.id))) AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE(b.blocker_id=? AND b.blocked_id=a.id) OR(b.blocker_id=a.id AND b.blocked_id=?))`,config.homeserver,username,user.id,user.id,user.id,user.id).first();
    need(target&&target.matrix_user_id.endsWith(':'+config.serverName),404,'encrypted_recipient_unavailable','Choose an accepted friend who has enrolled encrypted messaging.');return json({recipient:{accountId:target.id,username:target.username,displayName:target.display_name,matrixUserId:target.matrix_user_id}});
   }
   need(path.length===1&&path[0]==='enroll'&&request.method==='POST',404,'not_found','No encrypted enrollment action matches this request.');
   const body=await bodyJSON(request);await validateSessionMutation(request,user,body);need(Object.keys(body).every(key=>['expectedAccountId','clientId','deviceName'].includes(key)),400,'invalid_request','Enrollment identity is determined by the signed-in account.');
   need(user.reauthenticatedAt>now()-10*60000,401,'reauthentication_required','Confirm your account authentication before enrolling this device.');
   need(typeof body.clientId==='string'&&/^[a-f0-9-]{36}$/i.test(body.clientId),400,'invalid_client_id','Use a stable enrollment request ID.');jti=body.clientId;
   need(body.deviceName===undefined||(typeof body.deviceName==='string'&&body.deviceName.trim().length>=1&&body.deviceName.length<=64&&!/[\u0000-\u001f\u007f]/.test(body.deviceName)),400,'invalid_device_name','Use a device name of 1–64 characters.');
   await authRateLimit(request,db,'encrypted-enrollment',3,now(),user.id);
   const oldIssue=await q(db,'SELECT account_id,state FROM matrix_enrollment_issues WHERE jti=?',jti).first();need(!oldIssue,409,'enrollment_attempt_used','This enrollment attempt has already been used. Unlock the saved device or review Devices before starting another attempt.');
   const oldLink=await q(db,'SELECT * FROM matrix_account_links WHERE account_id=?',user.id).first();need(!oldLink||(oldLink.matrix_user_id===identity.userId&&oldLink.matrix_subject===identity.subject&&oldLink.homeserver_origin===config.homeserver),409,'encrypted_identity_conflict','This account is already bound to a different encrypted service. A verified operator migration is required.');
   const time=now(),guard=activeGuard(user,time);
   const reserved=await db.batch([
    q(db,'INSERT OR IGNORE INTO matrix_account_links(account_id,matrix_user_id,matrix_subject,homeserver_origin,created_at) SELECT ?,?,?,?,? WHERE '+guard.sql,user.id,identity.userId,identity.subject,config.homeserver,time,...guard.args),
    q(db,'INSERT OR IGNORE INTO matrix_enrollment_issues(jti,account_id,session_id,expires_at,created_at,state) SELECT ?,?,?,?,?,? WHERE '+guard.sql+" AND EXISTS(SELECT 1 FROM matrix_account_links WHERE account_id=? AND matrix_user_id=? AND matrix_subject=? AND homeserver_origin=?)",jti,user.id,user.sessionId,time+TTL_SECONDS*1000,time,'pending',...guard.args,user.id,identity.userId,identity.subject,config.homeserver)
   ]);
   ownsIssue=reserved[1]?.meta?.changes>0;need(ownsIssue,409,'enrollment_attempt_used','This enrollment attempt was already reserved or account access changed. Review Devices before retrying.');
   const issue=await q(db,'SELECT account_id,session_id,state FROM matrix_enrollment_issues WHERE jti=?',jti).first();need(issue&&issue.account_id===user.id&&issue.session_id===user.sessionId&&issue.state==='pending',403,'enrollment_access_changed','Account or session access changed. No enrollment was authorized.');
   // The JWT never leaves this Worker except in its TLS request to Synapse.
   const flows=await matrix(config,'/_matrix/client/v3/login');need(Array.isArray(flows.flows)&&flows.flows.some(flow=>flow.type==='org.matrix.login.jwt'),503,'encrypted_login_unsupported','The encrypted service does not support the configured account enrollment method.');
   const signingTime=now(),signingGuard=activeGuard(user,signingTime);need(await q(db,"SELECT 1 AS allowed WHERE "+signingGuard.sql+" AND EXISTS(SELECT 1 FROM matrix_enrollment_issues WHERE jti=? AND state='pending' AND expires_at>?)",...signingGuard.args,jti,signingTime).first(),403,'enrollment_access_changed','Account or session access changed before the encrypted service login.');
   const seconds=Math.floor(now()/1000),jwt=await new SignJWT({}).setProtectedHeader({alg:'HS256',typ:'JWT'}).setSubject(identity.subject).setIssuer(config.issuer).setAudience(config.audience).setJti(jti).setIssuedAt(seconds).setNotBefore(seconds-1).setExpirationTime(seconds+TTL_SECONDS).sign(encoder.encode(config.secret));
   const login=await matrix(config,'/_matrix/client/v3/login',{body:{type:'org.matrix.login.jwt',token:jwt,initial_device_display_name:body.deviceName?.trim()||'Voidline browser',refresh_token:false}});
   if(typeof login.access_token==='string'&&login.access_token.length>0&&login.access_token.length<=8192)inFlightToken=login.access_token;
   deviceId=typeof login.device_id==='string'?login.device_id:null;
   need(inFlightToken&&deviceId&&deviceId.length<=255&&!/[\u0000-\u0020\u007f]/.test(deviceId)&&login.user_id===identity.userId,503,'encrypted_identity_mismatch','The encrypted service returned an unexpected account or device. No device was connected.');
   const who=await matrix(config,'/_matrix/client/v3/account/whoami',{token:inFlightToken});need(who.user_id===identity.userId&&who.device_id===deviceId,503,'encrypted_identity_mismatch','The encrypted service could not verify the dedicated device identity.');
   if(!oldLink?.verified_at){const devices=await matrix(config,'/_matrix/client/v3/devices',{token:inFlightToken});need(Array.isArray(devices.devices)&&devices.devices.every(device=>device.device_id===deviceId),409,'encrypted_identity_preexisting','This encrypted identity already has another device. A verified operator migration is required before linking it.');}
   need(!await q(db,'SELECT 1 AS present FROM matrix_enrollment_issues WHERE account_id=? AND matrix_device_id=? AND jti<>?',user.id,deviceId,jti).first(),409,'encrypted_device_reused','The encrypted service reused an existing device. Start a fresh dedicated device after reviewing service configuration.');
   const finalTime=now(),finalGuard=activeGuard(user,finalTime);
   const result=await db.batch([
    q(db,"UPDATE matrix_enrollment_issues SET state='confirmed',matrix_device_id=?,completed_at=? WHERE jti=? AND account_id=? AND session_id=? AND state='pending' AND expires_at>? AND "+finalGuard.sql,deviceId,finalTime,jti,user.id,user.sessionId,finalTime,...finalGuard.args),
    q(db,'UPDATE matrix_account_links SET verified_at=? WHERE account_id=? AND matrix_user_id=? AND homeserver_origin=? AND EXISTS(SELECT 1 FROM matrix_enrollment_issues WHERE jti=? AND state=?) AND '+finalGuard.sql,finalTime,user.id,identity.userId,config.homeserver,jti,'confirmed',...finalGuard.args)
   ]);
   need(result[0]?.meta?.changes>0&&result[1]?.meta?.changes>0,403,'enrollment_access_changed','Account or session access changed before enrollment completed.');
   return json({accountId:user.id,homeserver:config.homeserver,userId:identity.userId,deviceId,accessToken:inFlightToken,enrollmentAttemptId:jti,expiresAt:Number.isSafeInteger(login.expires_in_ms)&&login.expires_in_ms>0?finalTime+login.expires_in_ms:null,accountRestrictionsSynced:false,encryptedDefaultReady:false});
  }catch(error){
   if(ownsIssue&&jti&&user&&env?.DB){let state='failed';if(inFlightToken&&config?.configured){const result=await logout(config,inFlightToken);state=result==='confirmed'?'revoked':'revocation_unknown';}else if(!(error instanceof AuthError)||error.code==='encrypted_service_unavailable')state='unknown';try{await markIssue(env.DB,user,jti,state,deviceId);}catch{/* A safe error response must not include credentials or database output. */}}
   return json({error:{code:error instanceof AuthError?error.code:'encrypted_service_unavailable',message:error instanceof AuthError?error.message:preflight?'The encrypted service check could not finish. Try again later.':'Encrypted enrollment could not finish. A remote device may have been created; review Devices before trying again.'}},error instanceof AuthError?error.status:503);
  }finally{inFlightToken=null;/* No JWT, Matrix token or recovery key is persisted server-side. */}
 }
 return {handleEncryptionRequest};
}
export const handleEncryptionRequest=createEncryptionService().handleEncryptionRequest;
