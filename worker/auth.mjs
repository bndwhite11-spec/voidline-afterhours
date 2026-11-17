import {matrixPolicyStatement,matrixPolicySessionsStatement} from './matrix-policy.mjs';
import {accountMediaDeletionStatements} from './media.mjs';
/** Native accounts, optional Google OIDC, and opaque sessions. No message keys. */
import {hashPassword,passwordMatches,equalHash,ARGON_ALGORITHM} from './passwords.mjs';
import {createRemoteJWKSet,jwtVerify} from 'jose';
export {hashPassword} from './passwords.mjs';
const SESSION_COOKIE='__Host-voidline_session',CSRF_COOKIE='__Host-voidline_csrf';
const SESSION_SECONDS=7*24*60*60;

const OAUTH_COOKIE='__Host-voidline_oauth';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const GOOGLE_AUTH='https://accounts.google.com/o/oauth2/v2/auth',GOOGLE_TOKEN='https://oauth2.googleapis.com/token';
const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function configuration(env){
 const origin=typeof env?.VOIDLINE_ORIGIN==='string'?env.VOIDLINE_ORIGIN.replace(/\/$/,''):'';
 let valid=false;try{const url=new URL(origin);valid=url.protocol==='https:'&&url.origin===origin;}catch{}
 return {configured:valid&&!!env?.GOOGLE_CLIENT_ID&&!!env?.GOOGLE_CLIENT_SECRET,valid,origin,redirectUri:origin+'/api/auth/google/callback'};
}
function safeReturnTo(value){
 if(typeof value!=='string'||value.length>2000||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(value))return '/';
 const url=new URL(value,'https://voidline.invalid');if(url.origin!=='https://voidline.invalid'||url.pathname.startsWith('/api/'))return '/';
 return url.pathname+url.search+url.hash;
}
function errorReturn(returnTo,code){const url=new URL(safeReturnTo(returnTo),'https://voidline.invalid');url.searchParams.set('auth_error',code);return url.pathname+url.search+url.hash;}

const encoder=new TextEncoder();
const RESERVED=new Set(['admin','administrator','mod','moderator','owner','support','system','voidline','afterhours','everyone','here','null','undefined','deleted','official','security','staff','root']);
const COMMON_PASSWORDS=new Set(['password1234','password12345','password123456','123456789012','qwerty1234567','letmein123456','abcdefghijkl','111111111111']);
export class AuthError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const requireAuth=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const query=(db,sql,...values)=>db.prepare(sql).bind(...values);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export async function authHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),n=>n.toString(16).padStart(2,'0')).join('');}
const cookie=(name,value,httpOnly=true,seconds=SESSION_SECONDS)=>`${name}=${value}; Path=/; Max-Age=${seconds}; Secure; SameSite=Lax${httpOnly?'; HttpOnly':''}`;
const readCookie=(request,name)=>{const values=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));return values.length===1?values[0].slice(name.length+1):'';};
const clearCookies=()=>[cookie(SESSION_COOKIE,'',true,0),cookie(CSRF_COOKIE,'',false,0),cookie('__Host-voidline_oauth','',true,0)];
function responseCookies(response,cookies){for(const value of cookies)response.headers.append('set-cookie',value);return response;}
function matrixConfiguration(env){let homeserver=null;try{const url=new URL(env?.MATRIX_HOMESERVER||'');if(url.protocol==='https:'&&url.pathname==='/'&&!url.username&&!url.password&&!url.search&&!url.hash)homeserver=url.origin;}catch{}return {configured:!!homeserver,homeserver};}
export function publicAccount(account){return {id:account.id,username:account.username||null,displayName:account.display_name,bio:account.bio,status:account.status,theme:account.theme,avatar:account.avatar,needsOnboarding:!account.onboarding_complete};}
export function normalizeUsername(value){requireAuth(typeof value==='string',400,'invalid_username','Choose a username.');const username=value.trim().normalize('NFKC').toLowerCase();requireAuth(/^[a-z][a-z0-9_]{2,23}$/.test(username),400,'invalid_username','Use 3–24 letters, digits or underscores, starting with a letter.');requireAuth(!RESERVED.has(username),400,'reserved_username','That username is reserved.');return username;}
function passwordValue(value){requireAuth(typeof value==='string'&&value.length>=12&&value.length<=128&&encoder.encode(value).length<=512,400,'invalid_password','Use a password between 12 and 128 characters.');requireAuth(!COMMON_PASSWORDS.has(value.toLowerCase()),400,'weak_password','Choose a less common password.');return value;}
function displayValue(value){requireAuth(typeof value==='string',400,'invalid_display_name','Choose a display name.');const name=value.trim();requireAuth(name.length>=2&&name.length<=32&&!/[\u0000-\u001f\u007f]/.test(name),400,'invalid_display_name','Use a display name between 2 and 32 characters.');return name;}
const equalHex=equalHash;
async function readBody(request){
 requireAuth(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 requireAuth(Number(request.headers.get('content-length')||0)<=8192,413,'body_too_large','The request is too large.');
 const reader=request.body?.getReader();requireAuth(reader,400,'invalid_body','A request body is required.');let total=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>8192){await reader.cancel();throw new AuthError(413,'body_too_large','The request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The request could not be read.');}
 requireAuth(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_body','Use a JSON object.');return body;
}
function validateOrigin(request){requireAuth(request.headers.get('origin')===new URL(request.url).origin,403,'origin_denied','Submit changes from this app.');}
export async function validateSessionMutation(request,user,body){validateOrigin(request);requireAuth(body.expectedAccountId===user.id,409,'account_changed','The signed-in account changed. Reload before submitting.');const csrf=request.headers.get('x-voidline-csrf')||'';requireAuth(/^[a-f0-9]{64}$/.test(csrf)&&await authHash(csrf)===user.csrfHash,403,'csrf_denied','The session request could not be verified. Reload and try again.');}
export async function authRateLimit(request,db,action,maximum,now,identity=''){
 const window=Math.floor(now/60000),source=identity||request.headers.get('cf-connecting-ip')||'unknown';
 const bucket=await authHash(action+':'+window+':'+source);
 const row=await query(db,'INSERT INTO auth_rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count',bucket,(window+2)*60000).first();
 requireAuth(row.count<=maximum,429,'rate_limited','Too many attempts. Wait a minute and try again.');
}
function emailValue(value){requireAuth(typeof value==='string'&&value.length<=254,400,'invalid_email','Enter a valid email address.');const email=value.trim().toLowerCase();requireAuth(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!/[\u0000-\u001f\u007f]/.test(email),400,'invalid_email','Enter a valid email address.');return email;}
function emailConfigured(env){const config=configuration(env);return config.valid&&!!env?.RESEND_API_KEY&&!!env?.EMAIL_FROM;}
function deviceLabel(ua){const platform=/Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Macintosh|Mac OS/i.test(ua)?'Mac':/Linux/i.test(ua)?'Linux':'Browser';const browser=/Firefox/i.test(ua)?'Firefox':/Edg\//i.test(ua)?'Edge':/Chrome|CriOS/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'browser';return platform+' · '+browser;}
export function createAuthService({now=()=>Date.now(),fetcher=(...args)=>fetch(...args),keyResolver=googleKeys}={}){
 async function authenticate(request,env){
  requireAuth(env?.DB?.prepare,503,'backend_unavailable','The account service is unavailable.');
  const bearer=readCookie(request,SESSION_COOKIE);requireAuth(/^[a-f0-9]{64}$/.test(bearer),401,'sign_in_required','Log in to continue.');
  const session=await query(env.DB,"SELECT s.*,a.account_status FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active'",await authHash(bearer),now()).first();requireAuth(session,401,'sign_in_required','Your session expired or this account is unavailable. Log in again.');
  if(now()-session.last_active_at>60000)await query(env.DB,'UPDATE auth_sessions SET last_active_at=? WHERE id=? AND revoked_at IS NULL',now(),session.id).run();
  return {id:session.account_id,sessionId:session.id,csrfHash:session.csrf_hash,reauthenticatedAt:session.reauthenticated_at,session};
 }
 async function sessionPlan(request,db,accountId,time,{revokeAll=false,credentialGuard=null,reauthenticatedAt=time}={}){
  const token=random(),csrf=random(),id=crypto.randomUUID(),deviceName=deviceLabel(request.headers.get('user-agent')||'');
  const accountGuard="EXISTS(SELECT 1 FROM live_accounts WHERE id=? AND account_status='active')";
  const guard=' AND '+accountGuard+(credentialGuard?' AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND password_hash=? AND change_marker=?)':'');
  const binds=[accountId,...(credentialGuard?[accountId,credentialGuard.password_hash,credentialGuard.change_marker]:[])],writes=[];
  if(revokeAll)writes.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL'+guard,time,accountId,...binds));
  const previous=readCookie(request,SESSION_COOKIE);if(/^[a-f0-9]{64}$/.test(previous))writes.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL'+guard,time,await authHash(previous),...binds));
  writes.push(query(db,'INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) SELECT ?,?,?,?,?,?,?,?,? WHERE '+accountGuard+(credentialGuard?' AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND password_hash=? AND change_marker=?)':''),id,accountId,await authHash(token),await authHash(csrf),deviceName,time,time,reauthenticatedAt,time+SESSION_SECONDS*1000,...binds));
  return {writes,cookies:[cookie(SESSION_COOKIE,token),cookie(CSRF_COOKIE,csrf,false),cookie('__Host-voidline_oauth','',true,0)],session:{id,deviceName,createdAt:time,lastActiveAt:time,reauthenticatedAt,mfaVerifiedAt:0},csrfToken:csrf};
 }
 async function authSuccess(db,accountId,plan,{status=200,recoveryCode}={}){const account=await query(db,'SELECT * FROM live_accounts WHERE id=?',accountId).first();return responseCookies(json({account:publicAccount(account),session:plan.session,csrfToken:plan.csrfToken,...(recoveryCode?{recoveryCode}:{})},status),plan.cookies);}
 async function verifyGoogleToken(token,env,nonce){
  const verified=await jwtVerify(token,keyResolver,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],audience:env.GOOGLE_CLIENT_ID,clockTolerance:5,currentDate:new Date(now()),requiredClaims:['sub','iat','exp','nonce']});
  const claims=verified.payload;
  requireAuth(typeof claims.sub==='string'&&claims.sub.length>0&&claims.sub.length<=255&&claims.nonce===nonce,401,'invalid_identity','Google identity could not be verified.');
  requireAuth(!claims.azp||claims.azp===env.GOOGLE_CLIENT_ID,401,'invalid_identity','Google identity could not be verified.');
  requireAuth(!Array.isArray(claims.aud)||claims.aud.length<=1||claims.azp===env.GOOGLE_CLIENT_ID,401,'invalid_identity','Google identity could not be verified.');
  requireAuth(Number.isFinite(claims.iat)&&claims.iat<=Math.floor(now()/1000)+5&&claims.iat>=Math.floor(now()/1000)-600,401,'invalid_identity','The sign-in response is too old. Start again.');
  return claims;
 }
 async function deliverEmail(env,to,kind,token){
  requireAuth(emailConfigured(env),503,'email_not_configured','Email delivery has not been configured. Your existing login remains available.');
  const origin=configuration(env).origin,verify=kind==='verify';
  const link=origin+'/#'+(verify?'verify-email=':'reset-password=')+token;
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject:verify?'Verify your Voidline email':'Reset your Voidline password',text:(verify?'Confirm this email address for your Voidline account: ':'Reset your Voidline password: ')+link+'\n\nThis link expires in 10 minutes and can be used once. If you did not request it, ignore this email. No existing password is revealed.'}),signal:AbortSignal.timeout(15000)});
  requireAuth(response.ok,503,'email_unavailable','The email service could not accept this request. Please retry.');
 }
 async function issueEmailToken(db,accountId,email,kind,time){const token=random(),hash=await authHash(token);await query(db,'DELETE FROM auth_email_tokens WHERE expires_at<?',time).run();await query(db,'INSERT INTO auth_email_tokens(token_hash,account_id,kind,email,expires_at,created_at) VALUES(?,?,?,?,?,?)',hash,accountId,kind,email,time+10*60000,time).run();return {token,hash};}
 async function requestVerifiedResetForAccount(request,env,accountId){
  requireAuth(emailConfigured(env),503,'verified_recovery_unavailable','Verified-email recovery is not configured. No reset was sent.');
  const db=env.DB,time=now();
  await authRateLimit(request,db,'admin-recovery',3,time,accountId);
  const match=await query(db,"SELECT e.email FROM account_emails e JOIN live_accounts a ON a.id=e.account_id JOIN auth_credentials c ON c.account_id=a.id WHERE a.id=? AND a.account_status='active' AND e.verified_at IS NOT NULL",accountId).first();
  requireAuth(match,409,'verified_recovery_unavailable','This account has no verified email recovery channel. No credential was changed.');
  const issued=await issueEmailToken(db,accountId,match.email,'reset',time);
  try{await deliverEmail(env,match.email,'reset',issued.token);}catch(error){await query(db,'DELETE FROM auth_email_tokens WHERE token_hash=?',issued.hash).run();throw error;}
  return {requested:true,channel:'verified-email'};
 }
 async function handleAuthRequest(request,env,context){
  const url=new URL(request.url),path=url.pathname,config=configuration(env);let callbackReturnTo='/';
  try{
   if(path==='/api/auth/config'&&request.method==='GET')return json({configured:!!env?.DB?.prepare&&!!env?.DB?.batch,provider:'password',registerPath:'/api/auth/register',signInPath:'/api/auth/login',google:{configured:config.configured,signInPath:'/api/auth/google/start'},email:{configured:emailConfigured(env)},matrix:matrixConfiguration(env),encryption:{available:false,reason:'Encrypted messaging uses a separately configured messaging service and verified devices.'}});

   requireAuth(env?.DB?.prepare&&env.DB.batch,503,'backend_unavailable','The account service is unavailable.');
   const db=env.DB,time=now();
   if(['/api/auth/password/reset/request','/api/auth/password/reset'].includes(path)){
    requireAuth(request.method==='POST',405,'method_not_allowed','Use the recovery form.');validateOrigin(request);requireAuth(request.headers.get('x-voidline-auth')==='1',403,'request_denied','Use the recovery form in this app.');
    const body=await readBody(request);await authRateLimit(request,db,'email-recovery',8,time);
    if(path.endsWith('/request')){
     requireAuth(emailConfigured(env),503,'email_not_configured','Email recovery has not been configured. Use your saved recovery code.');
     const login=typeof body.login==='string'?body.login.trim().toLowerCase().slice(0,254):'';
     await authRateLimit(request,db,'email-recovery-user',3,time,login||'invalid');
     const match=await query(db,"SELECT a.id,e.email FROM live_accounts a JOIN account_emails e ON e.account_id=a.id JOIN auth_credentials c ON c.account_id=a.id WHERE (a.username=? OR e.email=?) AND e.verified_at IS NOT NULL AND a.account_status='active'",login,login).first();
     if(match){
      const issued=await issueEmailToken(db,match.id,match.email,'reset',time);
      const delivery=deliverEmail(env,match.email,'reset',issued.token).catch(async()=>{await query(db,'DELETE FROM auth_email_tokens WHERE token_hash=?',issued.hash).run();});
      // Public recovery never waits for recipient-dependent provider latency.
      // The Worker context keeps actual delivery alive after the generic 202.
      if(context?.waitUntil)context.waitUntil(delivery);else await delivery;
     }
     return json({accepted:true,message:'If this account has a verified recovery address, a password reset request will be processed.'},202);
    }
    requireAuth(typeof body.token==='string'&&/^[a-f0-9]{64}$/.test(body.token),401,'invalid_reset','This reset link is unavailable or expired.');
    const hash=await authHash(body.token),token=await query(db,"SELECT t.* FROM auth_email_tokens t JOIN account_emails e ON e.account_id=t.account_id AND e.email=t.email JOIN live_accounts a ON a.id=t.account_id WHERE t.token_hash=? AND t.kind='reset' AND t.consumed_at IS NULL AND t.expires_at>? AND e.verified_at IS NOT NULL AND a.account_status='active'",hash,time).first();
    requireAuth(token,401,'invalid_reset','This reset link is unavailable or expired.');
    const password=passwordValue(body.password),credential=await hashPassword(password),marker=crypto.randomUUID(),code=random();
    const plan=await sessionPlan(request,db,token.account_id,time,{revokeAll:true,credentialGuard:{password_hash:credential.hash,change_marker:marker}});
    const consumedKind='reset-used:'+marker;
    const writes=[query(db,"UPDATE auth_email_tokens SET consumed_at=?,kind=? WHERE token_hash=? AND kind='reset' AND consumed_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM account_emails e JOIN live_accounts a ON a.id=e.account_id WHERE e.account_id=auth_email_tokens.account_id AND e.email=auth_email_tokens.email AND e.verified_at IS NOT NULL AND a.account_status='active')",time,consumedKind,hash,time),
     query(db,'UPDATE auth_credentials SET password_hash=?,salt=?,algorithm=?,iterations=?,recovery_hash=?,updated_at=?,change_marker=? WHERE account_id=? AND EXISTS(SELECT 1 FROM auth_email_tokens WHERE token_hash=? AND kind=? AND consumed_at=? AND expires_at>?)',credential.hash,credential.salt,credential.algorithm,credential.iterations,await authHash(token.account_id+':'+code),time,marker,token.account_id,hash,consumedKind,time,time),matrixPolicyStatement(db,{accountId:token.account_id,kind:'logout_all',idempotencyKey:'email-reset:'+marker,time,guardSql:'EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',guardBinds:[token.account_id,marker]}),...plan.writes];
    writes.push(query(db,"UPDATE auth_email_tokens SET consumed_at=?,kind='reset-invalidated' WHERE account_id=? AND kind='reset' AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)",time,token.account_id,token.account_id,marker));
    const result=await db.batch(writes);requireAuth(result[0]?.meta?.changes===1&&result[1]?.meta?.changes===1&&result.at(-2)?.meta?.changes===1,401,'invalid_reset','This reset link is unavailable or expired.');
    return authSuccess(db,token.account_id,plan,{recoveryCode:code});
   }
   const preauth=['/api/auth/register','/api/auth/login','/api/auth/recover'].includes(path);
   if(preauth){
    requireAuth(request.method==='POST',405,'method_not_allowed','This action requires a POST request.');validateOrigin(request);
    requireAuth(request.headers.get('x-voidline-auth')==='1',403,'request_denied','Open the account form in this app and try again.');
    const body=await readBody(request),username=typeof (body.login??body.username)==='string'?(body.login??body.username).trim().normalize('NFKC').toLowerCase().slice(0,254):'';
    await query(db,'DELETE FROM auth_rate_limits WHERE expires_at<?',time).run();
    await authRateLimit(request,db,'auth-ip',path.endsWith('/register')?5:20,time);
    await authRateLimit(request,db,'auth-user',8,time,username||'invalid');
    if(path==='/api/auth/register'){
     const normalized=normalizeUsername(body.username),displayName=displayValue(body.displayName),password=passwordValue(body.password),avatar=body.avatar??'moon';
     requireAuth(['moon','orbit','spark','leaf','ghost'].includes(avatar),400,'invalid_avatar','Choose an available avatar.');
     const credential=await hashPassword(password),id=crypto.randomUUID(),recoveryCode=random(),plan=await sessionPlan(request,db,id,time);
     try{await db.batch([
      query(db,'INSERT INTO live_accounts(id,display_name,email,username,onboarding_complete,avatar,created_at,updated_at) VALUES(?,?,?,?,1,?,?,?)',id,displayName,'',normalized,avatar,time,time),
      query(db,'INSERT INTO auth_credentials(account_id,password_hash,salt,algorithm,iterations,recovery_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',id,credential.hash,credential.salt,credential.algorithm,credential.iterations,await authHash(id+':'+recoveryCode),time,time),...plan.writes
     ]);}catch(error){if(/unique|constraint.*username/i.test(error.message||''))throw new AuthError(409,'username_taken','That username is already in use.');throw error;}
     return authSuccess(db,id,plan,{status:201,recoveryCode});
    }
    const record=await query(db,'SELECT c.*,a.username,a.account_status FROM auth_credentials c JOIN live_accounts a ON a.id=c.account_id LEFT JOIN account_emails e ON e.account_id=a.id AND e.verified_at IS NOT NULL WHERE a.username=? OR e.email=?',username,username).first();
    if(path==='/api/auth/login'){
     requireAuth(await passwordMatches(body.password,record)&&record.account_status==='active',401,'invalid_credentials','The username or password is incorrect.');
     if(record.algorithm!==ARGON_ALGORITHM){
      const upgraded=await hashPassword(body.password),marker=crypto.randomUUID();
      const changed=await query(db,"UPDATE auth_credentials SET password_hash=?,salt=?,algorithm=?,iterations=?,change_marker=?,updated_at=? WHERE account_id=? AND password_hash=? AND change_marker=? AND EXISTS(SELECT 1 FROM live_accounts WHERE id=auth_credentials.account_id AND account_status='active')",upgraded.hash,upgraded.salt,upgraded.algorithm,upgraded.iterations,marker,time,record.account_id,record.password_hash,record.change_marker).run();
      requireAuth(changed.meta?.changes===1,401,'invalid_credentials','The username or password is incorrect.');
      Object.assign(record,{password_hash:upgraded.hash,salt:upgraded.salt,algorithm:upgraded.algorithm,iterations:upgraded.iterations,change_marker:marker});
     }
     const plan=await sessionPlan(request,db,record.account_id,time,{credentialGuard:record});const results=await db.batch(plan.writes);requireAuth(results.at(-1)?.meta?.changes===1,401,'invalid_credentials','The username or password is incorrect.');return authSuccess(db,record.account_id,plan);
    }
    const validCode=typeof body.recoveryCode==='string'&&/^[a-f0-9]{64}$/i.test(body.recoveryCode.trim());
    const recoveryHash=await authHash((record?.account_id||'unknown')+':'+(validCode?body.recoveryCode.trim().toLowerCase():''));
    requireAuth(validCode&&record&&record.account_status==='active'&&equalHex(recoveryHash,record.recovery_hash),401,'invalid_recovery','The username or recovery code is incorrect.');
    const password=passwordValue(body.password),credential=await hashPassword(password),code=random(),plan=await sessionPlan(request,db,record.account_id,time,{revokeAll:true});
    // The guarded credential update and session writes form one transaction.
    // A code can be used once even when two reset attempts race.
    const marker=crypto.randomUUID();
    const writes=[query(db,"UPDATE auth_credentials SET password_hash=?,salt=?,algorithm=?,iterations=?,recovery_hash=?,updated_at=?,change_marker=? WHERE account_id=? AND recovery_hash=? AND EXISTS(SELECT 1 FROM live_accounts WHERE id=auth_credentials.account_id AND account_status='active')",credential.hash,credential.salt,credential.algorithm,credential.iterations,await authHash(record.account_id+':'+code),time,marker,record.account_id,recoveryHash)];
    writes.push(matrixPolicyStatement(db,{accountId:record.account_id,kind:'logout_all',idempotencyKey:'code-reset:'+marker,time,guardSql:'EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',guardBinds:[record.account_id,marker]}));
    // Check the marker after commit. A replay cannot create an authenticated
    // session: each INSERT is conditional on this request owning the update.
    writes.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',time,record.account_id,record.account_id,marker));
    // Bind a conditional INSERT directly so failed recovery cannot issue a token.
    const previous=readCookie(request,SESSION_COOKIE);if(/^[a-f0-9]{64}$/.test(previous))writes.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',time,await authHash(previous),record.account_id,marker));
    const newToken=plan.cookies[0].split(';')[0].split('=')[1];
    writes.push(query(db,"INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?) AND EXISTS(SELECT 1 FROM live_accounts WHERE id=? AND account_status='active')",plan.session.id,record.account_id,await authHash(newToken),await authHash(plan.csrfToken),plan.session.deviceName,time,time,time,time+SESSION_SECONDS*1000,record.account_id,marker,record.account_id));
    writes.push(query(db,"UPDATE auth_email_tokens SET consumed_at=?,kind='reset-invalidated' WHERE account_id=? AND kind='reset' AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)",time,record.account_id,record.account_id,marker));
    const results=await db.batch(writes);requireAuth(results[0]?.meta?.changes===1&&results.at(-2)?.meta?.changes===1,401,'invalid_recovery','The username or recovery code is incorrect.');
    return authSuccess(db,record.account_id,plan,{recoveryCode:code});
   }
   if(path==='/api/auth/google/start'&&request.method==='GET'){
    requireAuth(config.configured,503,'google_not_configured','Google sign-in is not configured. The owner must add Google OAuth credentials.');
    requireAuth(url.origin===config.origin,400,'origin_mismatch','Open the configured Voidline address to sign in.');
    await authRateLimit(request,db,'google-start',10,time);
    const state=random(),browser=random(),nonce=random(),verifier=random(),returnTo=safeReturnTo(url.searchParams.get('returnTo'));
    await query(db,'DELETE FROM auth_transactions WHERE expires_at<?',time).run();
    await query(db,'DELETE FROM auth_rate_limits WHERE expires_at<?',time).run();
    await query(db,'INSERT INTO auth_transactions(state_hash,browser_hash,nonce,verifier,return_to,reauthenticate,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)',await authHash(state),await authHash(browser),nonce,verifier,returnTo,url.searchParams.get('reauth')==='1'?1:0,time,time+10*60000).run();
    const target=new URL(GOOGLE_AUTH);target.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:config.redirectUri,response_type:'code',scope:'openid email',state,nonce,code_challenge:base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier)))),code_challenge_method:'S256',prompt:'select_account',...(url.searchParams.get('reauth')==='1'?{max_age:'0'}:{})}).toString();
    return responseCookies(new Response(null,{status:303,headers:{location:target.href,'cache-control':'no-store','referrer-policy':'no-referrer'}}),[cookie(OAUTH_COOKIE,browser,true,600)]);
   }
   if(path==='/api/auth/google/callback'&&request.method==='GET'){
    requireAuth(config.configured&&url.origin===config.origin,503,'google_not_configured','Google sign-in is not configured for this address.');
    const state=url.searchParams.get('state')||'',browser=readCookie(request,OAUTH_COOKIE);
    requireAuth(/^[a-f0-9]{64}$/.test(state)&&/^[a-f0-9]{64}$/.test(browser),400,'invalid_oauth_state','The sign-in request expired. Start again.');
    const transaction=await query(db,'SELECT * FROM auth_transactions WHERE state_hash=?',await authHash(state)).first();
    requireAuth(transaction&&transaction.expires_at>time&&!transaction.consumed_at&&transaction.browser_hash===await authHash(browser),400,'invalid_oauth_state','The sign-in request expired. Start again.');
    callbackReturnTo=transaction.return_to;
    const consumed=await query(db,'UPDATE auth_transactions SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL AND expires_at>?',time,transaction.state_hash,time).run();
    requireAuth(consumed.meta?.changes===1,400,'oauth_replayed','This sign-in response was already used. Start again.');
    if(url.searchParams.has('error'))return responseCookies(new Response(null,{status:303,headers:{location:errorReturn(callbackReturnTo,'cancelled'),'cache-control':'no-store','referrer-policy':'no-referrer'}}),[cookie(OAUTH_COOKIE,'',true,0)]);
    const code=url.searchParams.get('code');requireAuth(typeof code==='string'&&code.length>0&&code.length<=4096,400,'invalid_oauth_code','The sign-in response could not be verified.');
    const exchange=await fetcher(GOOGLE_TOKEN,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:config.redirectUri,code_verifier:transaction.verifier}).toString(),signal:AbortSignal.timeout(15000)});
    requireAuth(exchange.ok,401,'provider_exchange_failed','Google sign-in could not complete. Start again.');const tokens=await exchange.json();
    requireAuth(typeof tokens.id_token==='string'&&tokens.id_token.length<=16384,401,'invalid_identity','Google identity could not be verified.');
    const claims=await verifyGoogleToken(tokens.id_token,env,transaction.nonce);
    if(transaction.reauthenticate)requireAuth(Number.isFinite(claims.auth_time)&&claims.auth_time>=Math.floor(time/1000)-300&&claims.auth_time<=Math.floor(time/1000)+5,401,'reauthentication_required','Google did not confirm a fresh authentication. Try signing in again.');
    const existing=await query(db,"SELECT account_id FROM auth_identities WHERE provider='google' AND subject=?",claims.sub).first();
    let accountId=existing?.account_id;
    if(!accountId){
     // A race is resolved by the provider/subject uniqueness constraint. The
     // account INSERT is conditional, so a second callback cannot leave a
     // duplicate/orphan account even when two flows complete concurrently.
     const proposed=crypto.randomUUID();
     await db.batch([
      query(db,"INSERT INTO live_accounts(id,display_name,email,created_at,updated_at) SELECT ?,'New resident','',?,? WHERE NOT EXISTS(SELECT 1 FROM auth_identities WHERE provider='google' AND subject=?)",proposed,time,time,claims.sub),
      query(db,"INSERT OR IGNORE INTO auth_identities(provider,subject,account_id,created_at) SELECT 'google',?,?,? WHERE EXISTS(SELECT 1 FROM live_accounts WHERE id=?)",claims.sub,proposed,time,proposed)
     ]);
     accountId=(await query(db,"SELECT account_id FROM auth_identities WHERE provider='google' AND subject=?",claims.sub).first()).account_id;
    }
    const account=await query(db,'SELECT account_status FROM live_accounts WHERE id=?',accountId).first();
    requireAuth(account?.account_status==='active',403,'account_unavailable','This account is unavailable.');
    // A provider email is private metadata, never an account linking key. Only
    // a verified claim can establish an unused private email on this same ID.
    if(claims.email_verified===true&&typeof claims.email==='string'&&claims.email.length<=254){
     const email=claims.email.trim().toLowerCase();
     await query(db,'INSERT OR IGNORE INTO account_emails(account_id,email,verified_at,created_at,updated_at) VALUES(?,?,?,?,?)',accountId,email,time,time,time).run();
    }
    const plan=await sessionPlan(request,db,accountId,time,{reauthenticatedAt:transaction.reauthenticate?time:0});
    const writes=await db.batch(plan.writes);requireAuth(writes.at(-1)?.meta?.changes===1,403,'account_unavailable','This account is unavailable.');
    return responseCookies(new Response(null,{status:303,headers:{location:transaction.return_to,'cache-control':'no-store','referrer-policy':'no-referrer'}}),plan.cookies);
   }
   const user=await authenticate(request,env);
   if(path==='/api/auth/session'&&request.method==='GET'){
    const account=await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first();requireAuth(account,401,'sign_in_required','Log in again.');let csrf=readCookie(request,CSRF_COOKIE);const cookies=[];
    if(!/^[a-f0-9]{64}$/.test(csrf)||await authHash(csrf)!==user.csrfHash){csrf=random();await query(db,'UPDATE auth_sessions SET csrf_hash=? WHERE id=?',await authHash(csrf),user.sessionId).run();cookies.push(cookie(CSRF_COOKIE,csrf,false));}
    const methods=(await query(db,'SELECT provider FROM auth_identities WHERE account_id=?',user.id).all()).results.map(row=>row.provider);if(await query(db,'SELECT 1 AS found FROM auth_credentials WHERE account_id=?',user.id).first())methods.unshift('password');
    return responseCookies(json({account:publicAccount(account),authentication:{methods},session:{id:user.sessionId,deviceName:user.session.device_name,createdAt:user.session.created_at,lastActiveAt:user.session.last_active_at,reauthenticatedAt:user.reauthenticatedAt,mfaVerifiedAt:user.session.mfa_verified_at||0},csrfToken:csrf}),cookies);
   }
   if(path==='/api/auth/email'&&request.method==='GET'){const email=await query(db,'SELECT email,verified_at FROM account_emails WHERE account_id=?',user.id).first();return json({email:email?.email||null,verifiedAt:email?.verified_at||null,deliveryConfigured:emailConfigured(env)});}
   if(path==='/api/auth/devices'&&request.method==='GET'){
    const devices=(await query(db,'SELECT id,device_name,created_at,last_active_at,reauthenticated_at FROM auth_sessions WHERE account_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY created_at DESC',user.id,time).all()).results.map(s=>({id:s.id,deviceName:s.device_name,current:s.id===user.sessionId,createdAt:s.created_at,lastActiveAt:s.last_active_at,reauthenticatedAt:s.reauthenticated_at}));return json({devices,recovery:{available:false,reason:'These are account sessions. Messaging key recovery is managed separately.'}});
   }
   requireAuth(request.method==='POST',405,'method_not_allowed','This action requires a POST request.');const body=await readBody(request);await validateSessionMutation(request,user,body);
   const activeSessionSql=" AND EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active')",activeSessionBinds=[user.sessionId,user.id,time];
   if(path==='/api/auth/email/request'||path==='/api/auth/email/verify'){
    await authRateLimit(request,db,'verify-email',5,time,user.id);
    if(path.endsWith('/request')){
     requireAuth(user.reauthenticatedAt>time-10*60000,401,'reauthentication_required','Confirm your password before adding a recovery address.');
     if(await query(db,'SELECT 1 AS found FROM platform_owner WHERE account_id=?',user.id).first())requireAuth(user.session.mfa_verified_at>time-5*60000,401,'passkey_required','Verify your passkey before changing owner recovery.');
     const email=emailValue(body.email),issued=await issueEmailToken(db,user.id,email,'verify',time);
     try{await deliverEmail(env,email,'verify',issued.token);}catch(error){await query(db,'DELETE FROM auth_email_tokens WHERE token_hash=?',issued.hash).run();throw error;}
     return json({accepted:true,message:'The email service accepted a verification message. Follow its link within 10 minutes.'},202);
    }
    requireAuth(typeof body.token==='string'&&/^[a-f0-9]{64}$/.test(body.token),400,'invalid_verification','This verification link is unavailable or expired.');
    const hash=await authHash(body.token),token=await query(db,"SELECT * FROM auth_email_tokens WHERE token_hash=? AND account_id=? AND kind='verify' AND consumed_at IS NULL AND expires_at>?",hash,user.id,time).first();
    requireAuth(token,400,'invalid_verification','This verification link is unavailable or expired.');
    const consumedKind='verify-used:'+crypto.randomUUID();
    try{const result=await db.batch([query(db,"UPDATE auth_email_tokens SET consumed_at=?,kind=? WHERE token_hash=? AND kind='verify' AND consumed_at IS NULL AND expires_at>?",time,consumedKind,hash,time),query(db,"INSERT INTO account_emails(account_id,email,verified_at,created_at,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_email_tokens WHERE token_hash=? AND account_id=? AND consumed_at=? AND kind=?) ON CONFLICT(account_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at,updated_at=excluded.updated_at",user.id,token.email,time,time,time,hash,user.id,time,consumedKind)]);requireAuth(result[0]?.meta?.changes===1,400,'invalid_verification','This verification link was already used.');}catch(error){if(error instanceof AuthError)throw error;throw new AuthError(409,'email_unavailable','This address cannot be assigned to this account. Existing accounts are never linked by email.');}
    return json({verified:true,email:token.email});
   }
   if(path==='/api/auth/password/set'){
    requireAuth(user.reauthenticatedAt>time-5*60000,401,'reauthentication_required','Reauthenticate with your provider before setting a password.');
    const provider=await query(db,'SELECT 1 AS found FROM auth_identities WHERE account_id=? LIMIT 1',user.id).first();
    requireAuth(provider,403,'provider_required','This account needs its existing authentication method.');
    const password=passwordValue(body.password),credential=await hashPassword(password),code=random(),marker=crypto.randomUUID();
    const plan=await sessionPlan(request,db,user.id,time,{revokeAll:true,credentialGuard:{password_hash:credential.hash,change_marker:marker}});
    const writes=await db.batch([query(db,'INSERT OR IGNORE INTO auth_credentials(account_id,password_hash,salt,algorithm,iterations,recovery_hash,change_marker,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE 1'+activeSessionSql,user.id,credential.hash,credential.salt,credential.algorithm,credential.iterations,await authHash(user.id+':'+code),marker,time,time,...activeSessionBinds),matrixPolicyStatement(db,{accountId:user.id,kind:'logout_all',idempotencyKey:'password-set:'+marker,time,guardSql:'EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',guardBinds:[user.id,marker]}),...plan.writes]);
    requireAuth(writes[0]?.meta?.changes===1&&writes.at(-1)?.meta?.changes===1,409,'password_already_set','This account already has a password. Use Change password.');
    return authSuccess(db,user.id,plan,{recoveryCode:code});
   }
   if(path==='/api/auth/logout'){await db.batch([query(db,'UPDATE auth_sessions SET revoked_at=? WHERE id=?',time,user.sessionId),matrixPolicyStatement(db,{accountId:user.id,kind:'logout_session',subjectId:user.sessionId,idempotencyKey:'logout-session:'+user.sessionId,requestedBy:user.id,time,guardSql:'EXISTS(SELECT 1 FROM auth_sessions WHERE id=? AND account_id=? AND revoked_at IS NOT NULL)',guardBinds:[user.sessionId,user.id]})]);return responseCookies(json({signedOut:true}),clearCookies());}
   if(path==='/api/auth/reauthenticate'||path==='/api/auth/password/change'||path==='/api/auth/account/delete'){
    await authRateLimit(request,db,'reauth',8,time,user.id);const credential=await query(db,'SELECT * FROM auth_credentials WHERE account_id=?',user.id).first();
    requireAuth(await passwordMatches(path==='/api/auth/password/change'?body.currentPassword:body.password,credential),401,'invalid_credentials','The password is incorrect.');
    if(path==='/api/auth/reauthenticate'){const updated=await query(db,'UPDATE auth_sessions SET reauthenticated_at=? WHERE id=? AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND password_hash=? AND change_marker=?)'+activeSessionSql,time,user.sessionId,user.id,credential.password_hash,credential.change_marker,...activeSessionBinds).run();requireAuth(updated.meta?.changes===1,409,'credentials_changed','Account credentials changed. Log in again.');return json({reauthenticated:true,reauthenticatedAt:time});}
    if(path==='/api/auth/account/delete'){
     requireAuth(!await query(db,'SELECT 1 AS present FROM platform_owner WHERE account_id=?',user.id).first(),409,'platform_owner_protected','The platform owner must use the documented infrastructure recovery process before deleting this account.');
     const owner=await query(db,"SELECT 1 AS found FROM live_memberships WHERE account_id=? AND role='owner' LIMIT 1",user.id).first();requireAuth(!owner,409,'ownership_transfer_required','Transfer ownership of your servers before deleting your account.');
     const marker=crypto.randomUUID(),guard=' AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)';
     const writes=[query(db,"UPDATE auth_credentials SET change_marker=? WHERE account_id=? AND password_hash=? AND change_marker=? AND NOT EXISTS(SELECT 1 FROM live_memberships WHERE account_id=? AND role='owner') AND NOT EXISTS(SELECT 1 FROM platform_owner WHERE account_id=auth_credentials.account_id)"+activeSessionSql,marker,user.id,credential.password_hash,credential.change_marker,user.id,...activeSessionBinds),
      query(db,'DELETE FROM auth_identities WHERE account_id=?'+guard,user.id,user.id,marker),
      query(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL'+guard,time,user.id,user.id,marker)];
     writes.push(matrixPolicyStatement(db,{accountId:user.id,kind:'delete',idempotencyKey:'account-delete:'+marker,requestedBy:user.id,time,guardSql:'EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',guardBinds:[user.id,marker]}),...accountMediaDeletionStatements(db,user.id,'EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',[user.id,marker],time));
     writes.push(query(db,"UPDATE gift_instances SET pending_transfer_id=NULL WHERE pending_transfer_id IN(SELECT id FROM gift_transfers WHERE state='pending' AND (sender_id=? OR recipient_id=?))"+guard,user.id,user.id,user.id,marker),query(db,"UPDATE gift_transfers SET state='cancelled',handled_at=? WHERE state='pending' AND (sender_id=? OR recipient_id=?)"+guard,time,user.id,user.id,user.id,marker));
     for(const [table,condition,values]of [['live_memberships','account_id=?',[user.id]],['live_bookmarks','account_id=?',[user.id]],['live_favorites','account_id=?',[user.id]],['live_read_states','account_id=?',[user.id]],['social_requests','(sender_id=? OR recipient_id=?)',[user.id,user.id]],['social_blocks','(blocker_id=? OR blocked_id=?)',[user.id,user.id]],['social_settings','account_id=?',[user.id]],['cosmetic_gifts','(sender_id=? OR recipient_id=?) AND NOT EXISTS(SELECT 1 FROM gift_instances WHERE origin_gift_id=cosmetic_gifts.id)',[user.id,user.id]],['cosmetic_profiles','account_id=?',[user.id]],['gift_showcase','account_id=?',[user.id]],['profile_preferences','account_id=?',[user.id]],['organization_targets','account_id=?',[user.id]],['native_conversation_preferences','account_id=?',[user.id]],['native_bookmarks','account_id=?',[user.id]],['native_list_snapshots','account_id=?',[user.id]],['push_subscriptions','account_id=?',[user.id]],['native_members','account_id=?',[user.id]],['organization_folders','account_id=?',[user.id]],['account_organization','account_id=?',[user.id]],['passkey_challenges','account_id=?',[user.id]],['account_passkeys','account_id=?',[user.id]],['auth_email_tokens','account_id=?',[user.id]],['account_emails','account_id=?',[user.id]],['cosmetic_ownership','account_id=?',[user.id]]])writes.push(query(db,'DELETE FROM '+table+' WHERE '+condition+guard,...values,user.id,marker));
     writes.push(query(db,"UPDATE live_accounts SET username=NULL,display_name='Deleted account',bio='',status='',avatar='moon',theme='obsidian',email='',onboarding_complete=0,account_status='deleted',updated_at=? WHERE id=?"+guard,time,user.id,user.id,marker),query(db,'DELETE FROM auth_credentials WHERE account_id=? AND change_marker=?',user.id,marker));
     const results=await db.batch(writes);requireAuth(results[0]?.meta?.changes===1,409,'credentials_changed','Account credentials or ownership changed. Log in again before deleting.');
     return responseCookies(json({deleted:true,retained:'Previous shared messages retain an anonymized author reference. Configured messaging-service deactivation is queued separately; remote completion is not implied. Encrypted history recovery remains separate.'}),clearCookies());
    }
    const password=passwordValue(body.newPassword),next=await hashPassword(password),code=random(),marker=crypto.randomUUID(),plan=await sessionPlan(request,db,user.id,time,{revokeAll:true,credentialGuard:{password_hash:next.hash,change_marker:marker}});
    const results=await db.batch([query(db,'UPDATE auth_credentials SET password_hash=?,salt=?,algorithm=?,iterations=?,recovery_hash=?,updated_at=?,change_marker=? WHERE account_id=? AND password_hash=? AND change_marker=?'+activeSessionSql,next.hash,next.salt,next.algorithm,next.iterations,await authHash(user.id+':'+code),time,marker,user.id,credential.password_hash,credential.change_marker,...activeSessionBinds),...plan.writes,query(db,"UPDATE matrix_enrollment_issues SET session_id=? WHERE account_id=? AND session_id=? AND state='confirmed' AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)",plan.session.id,user.id,user.sessionId,user.id,marker),matrixPolicySessionsStatement(db,{accountId:user.id,exceptSessionId:plan.session.id,idempotencyKey:'password-change:'+marker,requestedBy:user.id,time,revokedAt:time,guardSql:'EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',guardBinds:[user.id,marker]}),query(db,"UPDATE auth_email_tokens SET consumed_at=?,kind='reset-invalidated' WHERE account_id=? AND kind='reset' AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)",time,user.id,user.id,marker)]);requireAuth(results[0]?.meta?.changes===1&&results[plan.writes.length]?.meta?.changes===1,409,'credentials_changed','Account credentials changed. Log in again.');return authSuccess(db,user.id,plan,{recoveryCode:code});
   }
   if(path==='/api/auth/onboarding'){
    await authRateLimit(request,db,'username',10,time,user.id);const username=normalizeUsername(body.username),displayName=displayValue(body.displayName),avatar=body.avatar??'moon';requireAuth(['moon','orbit','spark','leaf','ghost'].includes(avatar),400,'invalid_avatar','Choose an available avatar.');
    try{await query(db,'UPDATE live_accounts SET username=?,display_name=?,avatar=?,onboarding_complete=1,updated_at=? WHERE id=?',username,displayName,avatar,time,user.id).run();}catch(error){if(/unique/i.test(error.message||''))throw new AuthError(409,'username_taken','That username is already in use.');throw error;}return json({account:publicAccount(await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first())});
   }
   const revocation=path.match(/^\/api\/auth\/devices\/([a-f0-9-]{36})\/revoke$/);
   if(revocation){requireAuth(user.reauthenticatedAt>time-10*60000,401,'reauthentication_required','Confirm your password before revoking a session.');await db.batch([query(db,'UPDATE auth_sessions SET revoked_at=? WHERE id=? AND account_id=? AND revoked_at IS NULL',time,revocation[1],user.id),matrixPolicyStatement(db,{accountId:user.id,kind:'logout_session',subjectId:revocation[1],idempotencyKey:'logout-session:'+revocation[1],requestedBy:user.id,time,guardSql:'EXISTS(SELECT 1 FROM auth_sessions WHERE id=? AND account_id=? AND revoked_at IS NOT NULL)',guardBinds:[revocation[1],user.id]})]);return responseCookies(json({revoked:true,signedOut:revocation[1]===user.sessionId}),revocation[1]===user.sessionId?clearCookies():[]);}
   throw new AuthError(404,'not_found','No account action matches this request.');
  }catch(error){if(path==='/api/auth/google/callback')return responseCookies(new Response(null,{status:303,headers:{location:errorReturn(callbackReturnTo,error instanceof AuthError&&error.code==='invalid_oauth_state'?'expired':error instanceof AuthError&&error.code==='provider_exchange_failed'?'provider_unavailable':'invalid_response'),'cache-control':'no-store','referrer-policy':'no-referrer'}}),[cookie(OAUTH_COOKIE,'',true,0)]);return json({error:{code:error instanceof AuthError||error.code==='authentication_busy'?error.code:'account_unavailable',message:error instanceof AuthError||error.code==='authentication_busy'?error.message:'The account action could not complete. Try again.'}},error instanceof AuthError||error.code==='authentication_busy'?error.status:503);}
 }
 return {authenticate,handleAuthRequest,verifyGoogleToken,requestVerifiedResetForAccount};
}
const defaultService=createAuthService();
export const authenticate=defaultService.authenticate;
export const handleAuthRequest=defaultService.handleAuthRequest;

export const requestVerifiedResetForAccount=defaultService.requestVerifiedResetForAccount;
