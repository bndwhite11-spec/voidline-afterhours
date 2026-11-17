/** Native VOIDLINE accounts and opaque application sessions. No message keys. */
const SESSION_COOKIE='__Host-voidline_session',CSRF_COOKIE='__Host-voidline_csrf';
const SESSION_SECONDS=7*24*60*60,PASSWORD_ITERATIONS=100000;
const encoder=new TextEncoder(),DUMMY_SALT='a8df45ee43ac2dc98af0915ad32e06fb';
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
const unhex=value=>Uint8Array.from(value.match(/.{2}/g)||[],byte=>parseInt(byte,16));
export async function hashPassword(password,salt=random(),iterations=PASSWORD_ITERATIONS){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const derived=await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations,hash:'SHA-256'},key,256);
 return {hash:Array.from(new Uint8Array(derived),n=>n.toString(16).padStart(2,'0')).join(''),salt,iterations,algorithm:'pbkdf2-sha256'};
}
function equalHex(left,right){if(typeof left!=='string'||typeof right!=='string'||left.length!==64||right.length!==64)return false;let mismatch=0;for(let i=0;i<64;i++)mismatch|=left.charCodeAt(i)^right.charCodeAt(i);return mismatch===0;}
async function passwordMatches(password,credential){
 const bounded=typeof password==='string'&&password.length<=128&&encoder.encode(password).length<=512?password:'';
 const validRecord=credential?.algorithm==='pbkdf2-sha256'&&credential.iterations===PASSWORD_ITERATIONS&&/^[a-f0-9]{64}$/.test(credential.salt||'');
 const computed=await hashPassword(bounded,validRecord?credential.salt:DUMMY_SALT);
 return !!validRecord&&equalHex(computed.hash,credential.password_hash)&&bounded.length>0;
}
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
function deviceLabel(ua){const platform=/Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Macintosh|Mac OS/i.test(ua)?'Mac':/Linux/i.test(ua)?'Linux':'Browser';const browser=/Firefox/i.test(ua)?'Firefox':/Edg\//i.test(ua)?'Edge':/Chrome|CriOS/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'browser';return platform+' · '+browser;}
export function createAuthService({now=()=>Date.now()}={}){
 async function authenticate(request,env){
  requireAuth(env?.DB?.prepare,503,'backend_unavailable','The account service is unavailable.');
  const bearer=readCookie(request,SESSION_COOKIE);requireAuth(/^[a-f0-9]{64}$/.test(bearer),401,'sign_in_required','Log in to continue.');
  const session=await query(env.DB,'SELECT * FROM auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?',await authHash(bearer),now()).first();requireAuth(session,401,'sign_in_required','Your session expired. Log in again.');
  if(now()-session.last_active_at>60000)await query(env.DB,'UPDATE auth_sessions SET last_active_at=? WHERE id=? AND revoked_at IS NULL',now(),session.id).run();
  return {id:session.account_id,sessionId:session.id,csrfHash:session.csrf_hash,reauthenticatedAt:session.reauthenticated_at,session};
 }
 async function sessionPlan(request,db,accountId,time,{revokeAll=false,credentialGuard=null}={}){
  const token=random(),csrf=random(),id=crypto.randomUUID(),deviceName=deviceLabel(request.headers.get('user-agent')||'');
  const writes=[],guard=credentialGuard?' AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND password_hash=? AND change_marker=?)':'',binds=credentialGuard?[accountId,credentialGuard.password_hash,credentialGuard.change_marker]:[];
  if(revokeAll)writes.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL'+guard,time,accountId,...binds));
  const previous=readCookie(request,SESSION_COOKIE);if(/^[a-f0-9]{64}$/.test(previous))writes.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL'+guard,time,await authHash(previous),...binds));
  writes.push(query(db,'INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) SELECT ?,?,?,?,?,?,?,?,?'+(credentialGuard?' WHERE EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND password_hash=? AND change_marker=?)':''),id,accountId,await authHash(token),await authHash(csrf),deviceName,time,time,time,time+SESSION_SECONDS*1000,...binds));
  return {writes,cookies:[cookie(SESSION_COOKIE,token),cookie(CSRF_COOKIE,csrf,false),cookie('__Host-voidline_oauth','',true,0)],session:{id,deviceName,createdAt:time,lastActiveAt:time,reauthenticatedAt:time},csrfToken:csrf};
 }
 async function authSuccess(db,accountId,plan,{status=200,recoveryCode}={}){const account=await query(db,'SELECT * FROM live_accounts WHERE id=?',accountId).first();return responseCookies(json({account:publicAccount(account),session:plan.session,csrfToken:plan.csrfToken,...(recoveryCode?{recoveryCode}:{})},status),plan.cookies);}
 async function handleAuthRequest(request,env){
  const url=new URL(request.url),path=url.pathname;
  try{
   if(path==='/api/auth/config'&&request.method==='GET')return json({configured:!!env?.DB?.prepare&&!!env?.DB?.batch,provider:'password',registerPath:'/api/auth/register',signInPath:'/api/auth/login',matrix:matrixConfiguration(env),encryption:{available:false,reason:'Encrypted messaging uses a separately configured messaging service and verified devices.'}});
   if(path.startsWith('/api/auth/google/'))throw new AuthError(410,'provider_removed','Google sign-in has been removed. Use your Voidline username and password.');
   requireAuth(env?.DB?.prepare&&env.DB.batch,503,'backend_unavailable','The account service is unavailable.');
   const db=env.DB,time=now();
   const preauth=['/api/auth/register','/api/auth/login','/api/auth/recover'].includes(path);
   if(preauth){
    requireAuth(request.method==='POST',405,'method_not_allowed','This action requires a POST request.');validateOrigin(request);
    requireAuth(request.headers.get('x-voidline-auth')==='1',403,'request_denied','Open the account form in this app and try again.');
    const body=await readBody(request),username=typeof body.username==='string'?body.username.trim().normalize('NFKC').toLowerCase().slice(0,100):'';
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
    const record=await query(db,'SELECT c.*,a.username FROM auth_credentials c JOIN live_accounts a ON a.id=c.account_id WHERE a.username=?',username).first();
    if(path==='/api/auth/login'){
     requireAuth(await passwordMatches(body.password,record),401,'invalid_credentials','The username or password is incorrect.');
     const plan=await sessionPlan(request,db,record.account_id,time,{credentialGuard:record});const results=await db.batch(plan.writes);requireAuth(results.at(-1)?.meta?.changes===1,401,'invalid_credentials','The username or password is incorrect.');return authSuccess(db,record.account_id,plan);
    }
    const validCode=typeof body.recoveryCode==='string'&&/^[a-f0-9]{64}$/i.test(body.recoveryCode.trim());
    const recoveryHash=await authHash((record?.account_id||'unknown')+':'+(validCode?body.recoveryCode.trim().toLowerCase():''));
    requireAuth(validCode&&record&&equalHex(recoveryHash,record.recovery_hash),401,'invalid_recovery','The username or recovery code is incorrect.');
    const password=passwordValue(body.password),credential=await hashPassword(password),code=random(),plan=await sessionPlan(request,db,record.account_id,time,{revokeAll:true});
    // The guarded credential update and session writes form one transaction.
    // A code can be used once even when two reset attempts race.
    const marker=crypto.randomUUID();
    const writes=[query(db,'UPDATE auth_credentials SET password_hash=?,salt=?,algorithm=?,iterations=?,recovery_hash=?,updated_at=?,change_marker=? WHERE account_id=? AND recovery_hash=?',credential.hash,credential.salt,credential.algorithm,credential.iterations,await authHash(record.account_id+':'+code),time,marker,record.account_id,recoveryHash)];
    // Check the marker after commit. A replay cannot create an authenticated
    // session: each INSERT is conditional on this request owning the update.
    writes.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',time,record.account_id,record.account_id,marker));
    // Bind a conditional INSERT directly so failed recovery cannot issue a token.
    const previous=readCookie(request,SESSION_COOKIE);if(/^[a-f0-9]{64}$/.test(previous))writes.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',time,await authHash(previous),record.account_id,marker));
    const newToken=plan.cookies[0].split(';')[0].split('=')[1];
    writes.push(query(db,'INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)',plan.session.id,record.account_id,await authHash(newToken),await authHash(plan.csrfToken),plan.session.deviceName,time,time,time,time+SESSION_SECONDS*1000,record.account_id,marker));
    const results=await db.batch(writes);requireAuth(results[0]?.meta?.changes===1,401,'invalid_recovery','The username or recovery code is incorrect.');
    return authSuccess(db,record.account_id,plan,{recoveryCode:code});
   }
   const user=await authenticate(request,env);
   if(path==='/api/auth/session'&&request.method==='GET'){
    const account=await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first();requireAuth(account,401,'sign_in_required','Log in again.');let csrf=readCookie(request,CSRF_COOKIE);const cookies=[];
    if(!/^[a-f0-9]{64}$/.test(csrf)||await authHash(csrf)!==user.csrfHash){csrf=random();await query(db,'UPDATE auth_sessions SET csrf_hash=? WHERE id=?',await authHash(csrf),user.sessionId).run();cookies.push(cookie(CSRF_COOKIE,csrf,false));}
    return responseCookies(json({account:publicAccount(account),session:{id:user.sessionId,deviceName:user.session.device_name,createdAt:user.session.created_at,lastActiveAt:user.session.last_active_at,reauthenticatedAt:user.reauthenticatedAt},csrfToken:csrf}),cookies);
   }
   if(path==='/api/auth/devices'&&request.method==='GET'){
    const devices=(await query(db,'SELECT id,device_name,created_at,last_active_at,reauthenticated_at FROM auth_sessions WHERE account_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY created_at DESC',user.id,time).all()).results.map(s=>({id:s.id,deviceName:s.device_name,current:s.id===user.sessionId,createdAt:s.created_at,lastActiveAt:s.last_active_at,reauthenticatedAt:s.reauthenticated_at}));return json({devices,recovery:{available:false,reason:'These are account sessions. Messaging key recovery is managed separately.'}});
   }
   requireAuth(request.method==='POST',405,'method_not_allowed','This action requires a POST request.');const body=await readBody(request);await validateSessionMutation(request,user,body);
   if(path==='/api/auth/logout'){await query(db,'UPDATE auth_sessions SET revoked_at=? WHERE id=?',time,user.sessionId).run();return responseCookies(json({signedOut:true}),clearCookies());}
   if(path==='/api/auth/reauthenticate'||path==='/api/auth/password/change'||path==='/api/auth/account/delete'){
    await authRateLimit(request,db,'reauth',8,time,user.id);const credential=await query(db,'SELECT * FROM auth_credentials WHERE account_id=?',user.id).first();
    requireAuth(await passwordMatches(path==='/api/auth/password/change'?body.currentPassword:body.password,credential),401,'invalid_credentials','The password is incorrect.');
    if(path==='/api/auth/reauthenticate'){const updated=await query(db,'UPDATE auth_sessions SET reauthenticated_at=? WHERE id=? AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND password_hash=? AND change_marker=?)',time,user.sessionId,user.id,credential.password_hash,credential.change_marker).run();requireAuth(updated.meta?.changes===1,409,'credentials_changed','Account credentials changed. Log in again.');return json({reauthenticated:true,reauthenticatedAt:time});}
    if(path==='/api/auth/account/delete'){
     const owner=await query(db,"SELECT 1 AS found FROM live_memberships WHERE account_id=? AND role='owner' LIMIT 1",user.id).first();requireAuth(!owner,409,'ownership_transfer_required','Transfer ownership of your servers before deleting your account.');
     const marker=crypto.randomUUID(),guard=' AND EXISTS(SELECT 1 FROM auth_credentials WHERE account_id=? AND change_marker=?)';
     const writes=[query(db,"UPDATE auth_credentials SET change_marker=? WHERE account_id=? AND password_hash=? AND change_marker=? AND NOT EXISTS(SELECT 1 FROM live_memberships WHERE account_id=? AND role='owner')",marker,user.id,credential.password_hash,credential.change_marker,user.id),
      query(db,'DELETE FROM auth_identities WHERE account_id=?'+guard,user.id,user.id,marker),
      query(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL'+guard,time,user.id,user.id,marker)];
     for(const [table,condition,values]of [['live_memberships','account_id=?',[user.id]],['live_bookmarks','account_id=?',[user.id]],['live_favorites','account_id=?',[user.id]],['live_read_states','account_id=?',[user.id]],['social_requests','(sender_id=? OR recipient_id=?)',[user.id,user.id]],['social_blocks','(blocker_id=? OR blocked_id=?)',[user.id,user.id]],['social_settings','account_id=?',[user.id]],['cosmetic_gifts','(sender_id=? OR recipient_id=?)',[user.id,user.id]],['cosmetic_profiles','account_id=?',[user.id]],['cosmetic_ownership','account_id=?',[user.id]]])writes.push(query(db,'DELETE FROM '+table+' WHERE '+condition+guard,...values,user.id,marker));
     writes.push(query(db,"UPDATE live_accounts SET username=NULL,display_name='Deleted account',bio='',status='',avatar='moon',theme='obsidian',email='',onboarding_complete=0,updated_at=? WHERE id=?"+guard,time,user.id,user.id,marker),query(db,'DELETE FROM auth_credentials WHERE account_id=? AND change_marker=?',user.id,marker));
     const results=await db.batch(writes);requireAuth(results[0]?.meta?.changes===1,409,'credentials_changed','Account credentials or ownership changed. Log in again before deleting.');
     return responseCookies(json({deleted:true,retained:'Previous shared messages retain an anonymized author reference. Independent messaging service accounts are not deleted.'}),clearCookies());
    }
    const password=passwordValue(body.newPassword),next=await hashPassword(password),code=random(),marker=crypto.randomUUID(),plan=await sessionPlan(request,db,user.id,time,{revokeAll:true,credentialGuard:{password_hash:next.hash,change_marker:marker}});
    const results=await db.batch([query(db,'UPDATE auth_credentials SET password_hash=?,salt=?,algorithm=?,iterations=?,recovery_hash=?,updated_at=?,change_marker=? WHERE account_id=? AND password_hash=? AND change_marker=?',next.hash,next.salt,next.algorithm,next.iterations,await authHash(user.id+':'+code),time,marker,user.id,credential.password_hash,credential.change_marker),...plan.writes]);requireAuth(results[0]?.meta?.changes===1,409,'credentials_changed','Account credentials changed. Log in again.');return authSuccess(db,user.id,plan,{recoveryCode:code});
   }
   if(path==='/api/auth/onboarding'){
    await authRateLimit(request,db,'username',10,time,user.id);const username=normalizeUsername(body.username),displayName=displayValue(body.displayName),avatar=body.avatar??'moon';requireAuth(['moon','orbit','spark','leaf','ghost'].includes(avatar),400,'invalid_avatar','Choose an available avatar.');
    try{await query(db,'UPDATE live_accounts SET username=?,display_name=?,avatar=?,onboarding_complete=1,updated_at=? WHERE id=?',username,displayName,avatar,time,user.id).run();}catch(error){if(/unique/i.test(error.message||''))throw new AuthError(409,'username_taken','That username is already in use.');throw error;}return json({account:publicAccount(await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first())});
   }
   const revocation=path.match(/^\/api\/auth\/devices\/([a-f0-9-]{36})\/revoke$/);
   if(revocation){requireAuth(user.reauthenticatedAt>time-10*60000,401,'reauthentication_required','Confirm your password before revoking a session.');await query(db,'UPDATE auth_sessions SET revoked_at=? WHERE id=? AND account_id=? AND revoked_at IS NULL',time,revocation[1],user.id).run();return responseCookies(json({revoked:true,signedOut:revocation[1]===user.sessionId}),revocation[1]===user.sessionId?clearCookies():[]);}
   throw new AuthError(404,'not_found','No account action matches this request.');
  }catch(error){return json({error:{code:error instanceof AuthError?error.code:'account_unavailable',message:error instanceof AuthError?error.message:'The account action could not complete. Try again.'}},error instanceof AuthError?error.status:503);}
 }
 return {authenticate,handleAuthRequest};
}
const defaultService=createAuthService();
export const authenticate=defaultService.authenticate;
export const handleAuthRequest=defaultService.handleAuthRequest;
