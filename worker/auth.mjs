/** Google OIDC identity and opaque application sessions. No message keys. */
import {createRemoteJWKSet, jwtVerify} from 'jose';

const OAUTH_COOKIE='__Host-voidline_oauth',SESSION_COOKIE='__Host-voidline_session',CSRF_COOKIE='__Host-voidline_csrf';
const SESSION_SECONDS=7*24*60*60,TRANSACTION_MS=10*60*1000;
const GOOGLE_AUTH='https://accounts.google.com/o/oauth2/v2/auth',GOOGLE_TOKEN='https://oauth2.googleapis.com/token';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const encoder=new TextEncoder();
export class AuthError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const requireAuth=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
const query=(db,sql,...values)=>db.prepare(sql).bind(...values);
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export async function authHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),n=>n.toString(16).padStart(2,'0')).join('');}
const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const cookie=(name,value,httpOnly=true,seconds=SESSION_SECONDS)=>`${name}=${value}; Path=/; Max-Age=${seconds}; Secure; SameSite=Lax${httpOnly?'; HttpOnly':''}`;
const readCookie=(request,name)=>{const values=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));return values.length===1?values[0].slice(name.length+1):'';};
const clearCookies=()=>[cookie(SESSION_COOKIE,'',true,0),cookie(CSRF_COOKIE,'',false,0),cookie(OAUTH_COOKIE,'',true,0)];
function responseCookies(response,cookies){for(const value of cookies)response.headers.append('set-cookie',value);return response;}
function configuration(env){
 const origin=typeof env?.VOIDLINE_ORIGIN==='string'?env.VOIDLINE_ORIGIN.replace(/\/$/,''):'';
 let valid=false;try{const url=new URL(origin);valid=url.protocol==='https:'&&url.origin===origin;}catch{}
 return {configured:valid&&!!env?.GOOGLE_CLIENT_ID&&!!env?.GOOGLE_CLIENT_SECRET,origin,redirectUri:origin+'/api/auth/google/callback'};
}
function matrixConfiguration(env){
 let homeserver=null;
 try{const url=new URL(env?.MATRIX_HOMESERVER||'');if(url.protocol==='https:'&&url.pathname==='/'&&!url.username&&!url.password&&!url.search&&!url.hash)homeserver=url.origin;}catch{}
 return {configured:!!homeserver,homeserver};
}
export function publicAccount(account){return {id:account.id,username:account.username||null,displayName:account.display_name,bio:account.bio,status:account.status,theme:account.theme,avatar:account.avatar,needsOnboarding:!account.onboarding_complete};}
export function normalizeUsername(value){
 requireAuth(typeof value==='string',400,'invalid_username','Choose a username.');
 const username=value.trim().normalize('NFKC').toLowerCase();
 requireAuth(/^[a-z][a-z0-9_]{2,23}$/.test(username),400,'invalid_username','Use 3–24 letters, digits or underscores, starting with a letter.');
 requireAuth(!new Set(['admin','administrator','mod','moderator','owner','support','system','voidline','afterhours','google','everyone','here','null','undefined','deleted','official','security','staff','root']).has(username),400,'reserved_username','That username is reserved.');
 return username;
}
function safeReturnTo(value){
 if(typeof value!=='string'||value.length>2000||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(value))return '/';
 // Paths belong to this origin; OAuth endpoints cannot become redirect loops.
 const resolved=new URL(value,'https://voidline.invalid');
 if(resolved.origin!=='https://voidline.invalid'||resolved.pathname.startsWith('/api/'))return '/';
 return resolved.pathname+resolved.search+resolved.hash;
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
function validateOrigin(request){const origin=request.headers.get('origin');requireAuth(origin===new URL(request.url).origin,403,'origin_denied','Submit changes from this app.');}
export async function validateSessionMutation(request,user,body){
 validateOrigin(request);
 requireAuth(body.expectedAccountId===user.id,409,'account_changed','The signed-in account changed. Reload before submitting.');
 const csrf=request.headers.get('x-voidline-csrf')||'';
 requireAuth(/^[a-f0-9]{64}$/.test(csrf)&&await authHash(csrf)===user.csrfHash,403,'csrf_denied','The session request could not be verified. Reload and try again.');
}
export async function authRateLimit(request,db,action,maximum,now,identity=''){
 // Hash transient hosting IP with a time bucket; retain no raw network address.
 const window=Math.floor(now/60000),source=identity||request.headers.get('cf-connecting-ip')||'unknown';
 const bucket=await authHash(action+':'+window+':'+source);
 const row=await query(db,'INSERT INTO auth_rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count',bucket,(window+2)*60000).first();
 requireAuth(row.count<=maximum,429,'rate_limited','Too many attempts. Wait a minute and try again.');
}
function errorReturn(returnTo,code){const url=new URL(safeReturnTo(returnTo),'https://voidline.invalid');url.searchParams.set('auth_error',code);return url.pathname+url.search+url.hash;}
export function createAuthService({fetcher=(...args)=>fetch(...args),keyResolver=googleKeys,now=()=>Date.now()}={}){
 async function authenticate(request,env){
  requireAuth(env?.DB?.prepare,503,'backend_unavailable','The account service is unavailable.');
  const bearer=readCookie(request,SESSION_COOKIE);requireAuth(/^[a-f0-9]{64}$/.test(bearer),401,'sign_in_required','Sign in with Google to continue.');
  const session=await query(env.DB,'SELECT * FROM auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?',await authHash(bearer),now()).first();
  requireAuth(session,401,'sign_in_required','Your session expired. Sign in again.');
  if(now()-session.last_active_at>60000)await query(env.DB,'UPDATE auth_sessions SET last_active_at=? WHERE id=? AND revoked_at IS NULL',now(),session.id).run();
  return {id:session.account_id,sessionId:session.id,csrfHash:session.csrf_hash,reauthenticatedAt:session.reauthenticated_at,session};
 }
 async function verifyGoogleToken(token,env,nonce){
  const verified=await jwtVerify(token,keyResolver,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],audience:env.GOOGLE_CLIENT_ID,clockTolerance:5,currentDate:new Date(now()),requiredClaims:['sub','iat','exp','nonce']});
  const claims=verified.payload;
  requireAuth(typeof claims.sub==='string'&&claims.sub.length>0&&claims.sub.length<=255&&claims.nonce===nonce,401,'invalid_identity','Google identity could not be verified.');
  requireAuth(!claims.azp||claims.azp===env.GOOGLE_CLIENT_ID,401,'invalid_identity','Google identity could not be verified.');
  requireAuth(!Array.isArray(claims.aud)||claims.aud.length<=1||claims.azp===env.GOOGLE_CLIENT_ID,401,'invalid_identity','Google identity could not be verified.');
  requireAuth(Number.isFinite(claims.iat)&&claims.iat<=Math.floor(now()/1000)+5&&claims.iat>=Math.floor(now()/1000)-600,401,'invalid_identity','The sign-in response is too old. Start again.');
  return claims;
 }
 async function handleAuthRequest(request,env){
  const url=new URL(request.url),path=url.pathname,config=configuration(env);
  let callbackReturnTo='/';
  try{
   if(path==='/api/auth/config'&&request.method==='GET')return json({configured:config.configured,provider:'google',signInPath:'/api/auth/google/start',matrix:matrixConfiguration(env),encryption:{available:false,reason:'Encrypted messaging requires a configured provider and verified device keys. Protected sending is unavailable until that setup succeeds.'}});
   requireAuth(env?.DB?.prepare&&env.DB.batch,503,'backend_unavailable','The account service is unavailable.');
   const db=env.DB,time=now();
   if(path==='/api/auth/google/start'&&request.method==='GET'){
    requireAuth(config.configured,503,'google_not_configured','Google sign-in is not configured. The owner must add Google OAuth credentials.');
    requireAuth(url.origin===config.origin,400,'origin_mismatch','Open the configured Voidline address to sign in.');
    await authRateLimit(request,db,'google-start',10,time);
    const state=random(),browser=random(),nonce=random(),verifier=random(),returnTo=safeReturnTo(url.searchParams.get('returnTo'));
    await query(db,'DELETE FROM auth_transactions WHERE expires_at<?',time).run();
    await query(db,'DELETE FROM auth_rate_limits WHERE expires_at<?',time).run();
    await query(db,'INSERT INTO auth_transactions(state_hash,browser_hash,nonce,verifier,return_to,reauthenticate,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)',await authHash(state),await authHash(browser),nonce,verifier,returnTo,url.searchParams.get('reauth')==='1'?1:0,time,time+TRANSACTION_MS).run();
    const target=new URL(GOOGLE_AUTH);target.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:config.redirectUri,response_type:'code',scope:'openid',state,nonce,code_challenge:base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier)))),code_challenge_method:'S256',prompt:'select_account',...(url.searchParams.get('reauth')==='1'?{max_age:'0'}:{})}).toString();
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
    const token=random(),csrf=random(),sessionId=crypto.randomUUID(),deviceName=deviceLabel(request.headers.get('user-agent')||'');
    const sessionWrites=[query(db,'INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)',sessionId,accountId,await authHash(token),await authHash(csrf),deviceName,time,time,transaction.reauthenticate?time:0,time+SESSION_SECONDS*1000)];
    // Account switching ends the previous browser session; other devices keep
    // their explicitly visible sessions. Google tokens are never persisted.
    const previous=readCookie(request,SESSION_COOKIE);if(/^[a-f0-9]{64}$/.test(previous))sessionWrites.push(query(db,'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL',time,await authHash(previous)));
    await db.batch(sessionWrites);
    return responseCookies(new Response(null,{status:303,headers:{location:transaction.return_to,'cache-control':'no-store','referrer-policy':'no-referrer'}}),[cookie(SESSION_COOKIE,token),cookie(CSRF_COOKIE,csrf,false),cookie(OAUTH_COOKIE,'',true,0)]);
   }
   const user=await authenticate(request,env);
   if(path==='/api/auth/session'&&request.method==='GET'){
    const account=await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first();requireAuth(account,401,'sign_in_required','Sign in again.');
    let csrf=readCookie(request,CSRF_COOKIE);const cookies=[];
    if(!/^[a-f0-9]{64}$/.test(csrf)||await authHash(csrf)!==user.csrfHash){csrf=random();await query(db,'UPDATE auth_sessions SET csrf_hash=? WHERE id=?',await authHash(csrf),user.sessionId).run();cookies.push(cookie(CSRF_COOKIE,csrf,false));}
    return responseCookies(json({account:publicAccount(account),session:{id:user.sessionId,deviceName:user.session.device_name,createdAt:user.session.created_at,lastActiveAt:user.session.last_active_at,reauthenticatedAt:user.reauthenticatedAt},csrfToken:csrf}),cookies);
   }
   if(path==='/api/auth/devices'&&request.method==='GET'){
    const devices=(await query(db,'SELECT id,device_name,created_at,last_active_at,reauthenticated_at FROM auth_sessions WHERE account_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY created_at DESC',user.id,time).all()).results.map(s=>({id:s.id,deviceName:s.device_name,current:s.id===user.sessionId,createdAt:s.created_at,lastActiveAt:s.last_active_at,reauthenticatedAt:s.reauthenticated_at}));
    return json({devices,recovery:{available:false,reason:'These are sign-in sessions, not verified encryption devices. Key pairing and encrypted recovery are unavailable.'}});
   }
   requireAuth(request.method==='POST',405,'method_not_allowed','This action requires a POST request.');const body=await readBody(request);await validateSessionMutation(request,user,body);
   if(path==='/api/auth/logout'){
    await query(db,'UPDATE auth_sessions SET revoked_at=? WHERE id=?',time,user.sessionId).run();return responseCookies(json({signedOut:true}),clearCookies());
   }
   if(path==='/api/auth/onboarding'){
    await authRateLimit(request,db,'username',10,time,user.id);
    const username=normalizeUsername(body.username),displayName=typeof body.displayName==='string'?body.displayName.trim():'';
    requireAuth(displayName.length>=2&&displayName.length<=32&&!/[\u0000-\u001f\u007f]/.test(displayName),400,'invalid_display_name','Use a display name between 2 and 32 characters.');
    const avatar=body.avatar??'moon';requireAuth(['moon','orbit','spark','leaf','ghost'].includes(avatar),400,'invalid_avatar','Choose an available avatar.');
    const collision=await query(db,'SELECT id FROM live_accounts WHERE username=? AND id<>?',username,user.id).first();requireAuth(!collision,409,'username_taken','That username is already in use.');
    try{await query(db,'UPDATE live_accounts SET username=?,display_name=?,avatar=?,onboarding_complete=1,updated_at=? WHERE id=?',username,displayName,avatar,time,user.id).run();}catch(error){if(/unique/i.test(error.message||''))throw new AuthError(409,'username_taken','That username is already in use.');throw error;}
    return json({account:publicAccount(await query(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first())});
   }
   const revocation=path.match(/^\/api\/auth\/devices\/([a-f0-9-]{36})\/revoke$/);
   if(revocation){
    requireAuth(user.reauthenticatedAt>time-10*60000,401,'reauthentication_required','Sign in again with Google before revoking a session.');
    await query(db,'UPDATE auth_sessions SET revoked_at=? WHERE id=? AND account_id=? AND revoked_at IS NULL',time,revocation[1],user.id).run();
    return responseCookies(json({revoked:true,signedOut:revocation[1]===user.sessionId}),revocation[1]===user.sessionId?clearCookies():[]);
   }
   throw new AuthError(404,'not_found','No account action matches this request.');
  }catch(error){
   const known=error instanceof AuthError;
   if(path==='/api/auth/google/callback')return responseCookies(new Response(null,{status:303,headers:{location:errorReturn(callbackReturnTo,known&&error.code==='invalid_oauth_state'?'expired':known&&error.code==='provider_exchange_failed'?'provider_unavailable':'invalid_response'),'cache-control':'no-store','referrer-policy':'no-referrer'}}),[cookie(OAUTH_COOKIE,'',true,0)]);
   return json({error:{code:known?error.code:'account_unavailable',message:known?error.message:'The account action could not complete. Try again.'}},known?error.status:503);
  }
 }
 return {authenticate,handleAuthRequest,verifyGoogleToken};
}
function deviceLabel(ua){const platform=/Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Macintosh|Mac OS/i.test(ua)?'Mac':/Linux/i.test(ua)?'Linux':'Browser';const browser=/Firefox/i.test(ua)?'Firefox':/Edg\//i.test(ua)?'Edge':/Chrome|CriOS/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'browser';return platform+' · '+browser;}
const defaultService=createAuthService();
export const authenticate=defaultService.authenticate;
export const handleAuthRequest=defaultService.handleAuthRequest;
