import {withLegacyRegistration} from './legacy-account-fixture.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPair,SignJWT} from 'jose';
import {createAuthService,authHash} from '../worker/auth.mjs';
const origin='https://hardening.example',password='A private overnight password 2026';
const encoder=new TextEncoder();
class Adapter{constructor(db){this.db=db;this.queue=Promise.resolve();this.beforeRun=null;}prepare(sql){const db=this.db,adapter=this;return {bind(...values){const p=db.prepare(sql);return {first:async()=>{const row=p.get(...values)||null;if(adapter.afterRead)await adapter.afterRead(sql);return row;},all:async()=>({results:p.all(...values)}),run:async()=>{if(adapter.beforeRun)await adapter.beforeRun(sql);return {success:true,meta:{changes:p.run(...values).changes}};}};}};}batch(steps){const task=this.queue.then(async()=>{this.db.exec('BEGIN');try{const result=[];for(const step of steps)result.push(await step.run());this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}});this.queue=task.catch(()=>{});return task;}}
const rsa=await generateKeyPair('RS256');
function fixture({configuredMail=false,configuredGoogle=false,mailAccepted=true}={}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url))).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 let time=Date.now(),subject='google-subject',badAudience=false;const messages=[];
 const env={DB:new Adapter(sqlite),VOIDLINE_ORIGIN:origin,...(configuredMail?{RESEND_API_KEY:'test-provider-key',EMAIL_FROM:'noreply@example.test'}:{}),...(configuredGoogle?{GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret'}:{})};
 const fetcher=async(url,options)=>{if(url==='https://api.resend.com/emails'){messages.push(JSON.parse(options.body));return {ok:mailAccepted};}if(url==='https://oauth2.googleapis.com/token'){const tx=sqlite.prepare('SELECT nonce FROM auth_transactions ORDER BY created_at DESC,rowid DESC LIMIT 1').get();const token=await new SignJWT({nonce:tx.nonce,email:'private@example.test',email_verified:true,auth_time:Math.floor(time/1000)}).setProtectedHeader({alg:'RS256'}).setIssuer('https://accounts.google.com').setAudience(badAudience?'wrong-client':'test-client').setSubject(subject).setIssuedAt(Math.floor(time/1000)).setExpirationTime(Math.floor(time/1000)+600).sign(rsa.privateKey);return {ok:true,json:async()=>({id_token:token})};}throw Error('Unexpected external request');};
 const auth=createAuthService({now:()=>time,keyResolver:rsa.publicKey,fetcher});
 const productionAuth=auth.handleAuthRequest;
 auth.handleAuthRequest=withLegacyRegistration(productionAuth);
 function browser(raw=false){const execute=raw?productionAuth:auth.handleAuthRequest;const cookies=new Map();let session;return {get session(){return session;},cookies,async call(path,body,expected=200){const headers={...(cookies.size?{cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}:{})};if(body!==undefined)Object.assign(headers,{origin,'content-type':'application/json','x-voidline-auth':'1','x-voidline-csrf':session?.csrfToken||''});const response=await execute(new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({...body,...(session?{expectedAccountId:session.account.id}:{})})})}),env);for(const v of response.headers.getSetCookie()){const [key,value]=v.split(';')[0].split('=');value?cookies.set(key,value):cookies.delete(key);}if(response.status>=300&&response.status<400){assert.equal(response.status,expected);return {location:response.headers.get('location'),status:response.status};}const data=await response.json();if(Array.isArray(expected)){assert.ok(expected.includes(response.status),`${path}: ${data.error?.code}`);return {status:response.status,data};}assert.equal(response.status,expected,`${path}: ${data.error?.code}`);if(data.account)session=data;return data;}};}
 async function register(name='native_user'){const client=browser();await client.call('/api/auth/register',{username:name,displayName:'Native account',password},201);return client;}
 const tokenFromLastMail=()=>messages.at(-1).text.match(/#(?:signup-email|verify-email|reset-password)=([a-f0-9]{64})/)[1];
 return {sqlite,env,auth,browser,register,messages,tokenFromLastMail,advance:ms=>time+=ms,time:()=>time,setGoogleSubject:value=>subject=value,setBadAudience:value=>badAudience=value};
}
const tests=[],test=(name,run)=>tests.push([name,run]);
test('a real old PBKDF2 password is verified then upgraded without changing account identity or history',async()=>{const f=fixture();try{const c=await f.register(),id=c.session.account.id,salt='ab'.repeat(32),key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']),old=Buffer.from(await crypto.subtle.deriveBits({name:'PBKDF2',salt:Buffer.from(salt,'hex'),iterations:100000,hash:'SHA-256'},key,256)).toString('hex');f.sqlite.prepare("UPDATE auth_credentials SET password_hash=?,salt=?,algorithm='pbkdf2-sha256',iterations=100000 WHERE account_id=?").run(old,salt,id);await f.browser().call('/api/auth/login',{username:'native_user',password:'wrong password value'},401);assert.equal(f.sqlite.prepare('SELECT algorithm FROM auth_credentials').get().algorithm,'pbkdf2-sha256');const b=f.browser(),login=await b.call('/api/auth/login',{username:'native_user',password});assert.equal(login.account.id,id);assert.equal(f.sqlite.prepare('SELECT algorithm FROM auth_credentials').get().algorithm,'argon2id-v19-m19456-t2-p1');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_accounts').get().n,1);}finally{f.sqlite.close();}});
test('suspension immediately rejects an existing session and valid-password login without creating sessions',async()=>{const f=fixture();try{const c=await f.register();f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id=?").run(c.session.account.id);const count=f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n;await c.call('/api/auth/session',undefined,401);await f.browser().call('/api/auth/login',{username:'native_user',password},401);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n,count);}finally{f.sqlite.close();}});
test('Google OIDC uses browser-bound state, nonce and PKCE and a stable subject creates one empty account',async()=>{const f=fixture({configuredGoogle:true});try{const b=f.browser();for(let attempt=0;attempt<2;attempt++){const start=await b.call('/api/auth/google/start?returnTo='+encodeURIComponent('/#join=abc'),undefined,303),target=new URL(start.location);assert.equal(target.origin,'https://accounts.google.com');assert.equal(target.searchParams.get('code_challenge_method'),'S256');assert.equal(target.searchParams.get('scope'),'openid email');const callback=await b.call('/api/auth/google/callback?state='+target.searchParams.get('state')+'&code=provider-code',undefined,303);assert.equal(callback.location,'/#join=abc');}const session=await b.call('/api/auth/session');assert.equal(session.account.needsOnboarding,true);assert.equal(session.account.email,undefined);assert.deepEqual(session.authentication.methods,['google']);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_accounts').get().n,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_memberships').get().n,0);}finally{f.sqlite.close();}});
test('wrong-audience Google credentials and reused callback state never create a usable session',async()=>{const f=fixture({configuredGoogle:true});try{f.setBadAudience(true);const b=f.browser(),start=await b.call('/api/auth/google/start',undefined,303),target=new URL(start.location),path='/api/auth/google/callback?state='+target.searchParams.get('state')+'&code=invalid';const callback=await b.call(path,undefined,303);assert.ok(callback.location.includes('auth_error=invalid_response'));await b.call(path,undefined,303);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n,0);}finally{f.sqlite.close();}});
test('Google signup with a conflicting private email cannot link accounts or leave an orphan',async()=>{
 const f=fixture({configuredGoogle:true});try{
  const native=await f.register();f.sqlite.prepare('INSERT INTO account_emails VALUES(?,?,?,?,?)').run(native.session.account.id,'private@example.test',f.time(),f.time(),f.time());
  const b=f.browser(),start=await b.call('/api/auth/google/start',undefined,303),target=new URL(start.location);
  const result=await b.call('/api/auth/google/callback?state='+target.searchParams.get('state')+'&code=valid',undefined,303);
  assert.match(result.location,/auth_error=/);await b.call('/api/auth/session',undefined,401);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM live_accounts').get().n,1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM auth_identities').get().n,0);
 }finally{f.sqlite.close();}
});
test('unconfigured email cannot fake verification or delivery and exposes no token',async()=>{const f=fixture();try{const c=await f.register();await c.call('/api/auth/email/request',{email:'person@example.test'},503);await f.browser().call('/api/auth/password/reset/request',{login:'native_user'},503);assert.equal(f.messages.length,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_email_tokens').get().n,0);}finally{f.sqlite.close();}});
test('verified email stays private, requires its actual one-time token and permits password login by that address',async()=>{const f=fixture({configuredMail:true});try{const c=await f.register();const ack=await c.call('/api/auth/email/request',{email:'Private@Example.test'},202);assert.equal(ack.token,undefined);const token=f.tokenFromLastMail(),record=f.sqlite.prepare('SELECT token_hash FROM auth_email_tokens').get();assert.notEqual(record.token_hash,token);await c.call('/api/auth/email/verify',{token});await c.call('/api/auth/email/verify',{token},400);const email=await c.call('/api/auth/email');assert.equal(email.email,'private@example.test');assert.equal((await finishPasswordLogin(f,{login:email.email,password})).account.id,c.session.account.id);assert.equal((await c.call('/api/auth/session')).account.email,undefined);}finally{f.sqlite.close();}});
test('reset links expire, are single use and replace credentials without restoring MFA or previous sessions',async()=>{const f=fixture({configuredMail:true});try{const c=await f.register();await c.call('/api/auth/email/request',{email:'private@example.test'},202);await c.call('/api/auth/email/verify',{token:f.tokenFromLastMail()});await f.browser().call('/api/auth/password/reset/request',{login:'native_user'},202);const expired=f.tokenFromLastMail();f.advance(11*60000);await f.browser().call('/api/auth/password/reset',{token:expired,password:'A recovered private password 2026'},401);await f.browser().call('/api/auth/password/reset/request',{login:'private@example.test'},202);const token=f.tokenFromLastMail(),b=f.browser(),reset=await b.call('/api/auth/password/reset',{token,password:'A recovered private password 2026'});assert.equal(reset.account.id,c.session.account.id);assert.equal(reset.session.mfaVerifiedAt,0);await c.call('/api/auth/session',undefined,401);await f.browser().call('/api/auth/password/reset',{token,password:'Another reset private password 2026'},401);await f.browser().call('/api/auth/login',{username:'private@example.test',password},401);await finishPasswordLogin(f,{username:'private@example.test',password:'A recovered private password 2026'});}finally{f.sqlite.close();}});
test('simultaneous reset attempts at the same clock instant cannot consume one token twice or overwrite the winner',async()=>{const f=fixture({configuredMail:true});try{const c=await f.register();await c.call('/api/auth/email/request',{email:'private@example.test'},202);await c.call('/api/auth/email/verify',{token:f.tokenFromLastMail()});await f.browser().call('/api/auth/password/reset/request',{login:'native_user'},202);const token=f.tokenFromLastMail(),choices=['One reset private password 2026','Two reset private password 2026'],browsers=[f.browser(),f.browser()];const results=await Promise.allSettled(browsers.map((b,i)=>b.call('/api/auth/password/reset',{token,password:choices[i]})));const winner=results.findIndex(x=>x.status==='fulfilled');assert.equal(results.filter(x=>x.status==='fulfilled').length,1);await finishPasswordLogin(f,{username:'private@example.test',password:choices[winner]});await f.browser().call('/api/auth/login',{username:'private@example.test',password:choices[1-winner]},401);}finally{f.sqlite.close();}});
test('Google-only users must freshly reauthenticate before adding a native password to the same account',async()=>{const f=fixture({configuredGoogle:true});try{const b=f.browser();async function google(reauth=false){const start=await b.call('/api/auth/google/start'+(reauth?'?reauth=1':''),undefined,303),target=new URL(start.location);if(reauth)assert.equal(target.searchParams.get('max_age'),'0');await b.call('/api/auth/google/callback?state='+target.searchParams.get('state')+'&code=provider-code',undefined,303);return b.call('/api/auth/session');}const first=await google();await b.call('/api/auth/password/set',{password},401);await google(true);const set=await b.call('/api/auth/password/set',{password});assert.equal(set.account.id,first.account.id);assert.match(set.recoveryCode,/^[a-f0-9]{64}$/);assert.equal(set.session.mfaVerifiedAt,0);assert.deepEqual((await b.call('/api/auth/session')).authentication.methods,['password','google']);}finally{f.sqlite.close();}});
test('changing a password invalidates outstanding verified-email reset links',async()=>{const f=fixture({configuredMail:true});try{const c=await f.register();await c.call('/api/auth/email/request',{email:'private@example.test'},202);await c.call('/api/auth/email/verify',{token:f.tokenFromLastMail()});await f.browser().call('/api/auth/password/reset/request',{login:'native_user'},202);const token=f.tokenFromLastMail();await c.call('/api/auth/password/change',{currentPassword:password,newPassword:'Changed private overnight password 2026'});await f.browser().call('/api/auth/password/reset',{token,password:'An older reset private password 2026'},401);}finally{f.sqlite.close();}});
test('the real JWT verifier rejects wrong issuer, expiry, nonce, authorized party, future issue time and tampered signatures',async()=>{const f=fixture({configuredGoogle:true});try{const issued=Math.floor(f.time()/1000),base={sub:'stable-sub',nonce:'correct',aud:'test-client',iss:'https://accounts.google.com',iat:issued,exp:issued+300};for(const change of [{iss:'https://attacker.example'},{exp:issued-60},{nonce:'wrong'},{azp:'another-client'},{iat:issued+60}]){const token=await new SignJWT({...base,...change}).setProtectedHeader({alg:'RS256'}).sign(rsa.privateKey);await assert.rejects(f.auth.verifyGoogleToken(token,f.env,'correct'));}const valid=await new SignJWT(base).setProtectedHeader({alg:'RS256'}).sign(rsa.privateKey),parts=valid.split('.');parts[2]=(parts[2][0]==='a'?'b':'a')+parts[2].slice(1);await assert.rejects(f.auth.verifyGoogleToken(parts.join('.'),f.env,'correct'));}finally{f.sqlite.close();}});

test('a Google callback racing deletion cannot recreate verified-email metadata or an authenticated session',async()=>{
 const f=fixture({configuredGoogle:true});try{
  const native=await f.register(),id=native.session.account.id;f.sqlite.prepare('INSERT INTO auth_identities(provider,subject,account_id,created_at) VALUES(?,?,?,?)').run('google','google-subject',id,f.time());const b=f.browser(),start=await b.call('/api/auth/google/start',undefined,303),target=new URL(start.location);let intercepted=false;
  f.env.DB.beforeRun=sql=>{if(!sql.startsWith('INSERT OR IGNORE INTO account_emails'))return;f.env.DB.beforeRun=null;intercepted=true;f.sqlite.prepare("UPDATE live_accounts SET username=NULL,display_name='Deleted account',onboarding_complete=0,account_status='deleted' WHERE id=?").run(id);f.sqlite.prepare('DELETE FROM account_emails WHERE account_id=?').run(id);f.sqlite.prepare('DELETE FROM auth_identities WHERE account_id=?').run(id);f.sqlite.prepare('DELETE FROM auth_credentials WHERE account_id=?').run(id);f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE account_id=?').run(f.time(),id);};
  const callback=await b.call('/api/auth/google/callback?state='+target.searchParams.get('state')+'&code=valid',undefined,303);assert.equal(intercepted,true);assert.match(callback.location,/auth_error=/);await b.call('/api/auth/session',undefined,401);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM account_emails WHERE account_id=?').get(id).n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE account_id=? AND revoked_at IS NULL').get(id).n,0);assert.equal(f.sqlite.prepare('SELECT account_status FROM live_accounts WHERE id=?').get(id).account_status,'deleted');
 }finally{f.sqlite.close();}
});
test('signup requires mailbox control; disabled delivery cannot create credentials or a session',async()=>{
 const f=fixture();try{
  const b=f.browser(true);assert.equal((await b.call('/api/auth/config')).email.registration,'verified-email');
  await b.call('/api/auth/register/email',{email:'new@example.test'},503);
  await b.call('/api/auth/register',{username:'new_user',displayName:'New user',password},400);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM live_accounts').get().n,0);assert.equal(b.cookies.size,0);
 }finally{f.sqlite.close();}
});
test('signup proves email before creating an account, handles conflicts, single-use races and expiry',async()=>{
 const f=fixture({configuredMail:true});try{
  const challenge=async email=>{await f.browser(true).call('/api/auth/register/email',{email},202);return f.tokenFromLastMail();};
  const fields=(emailToken,username='new_user')=>({emailToken,username,displayName:'Public name',password});
  const token=await challenge(' First@Example.test '),user=await f.browser(true).call('/api/auth/register',fields(token),201);
  assert.equal(user.account.email,undefined);assert.equal(f.sqlite.prepare('SELECT email FROM account_emails WHERE account_id=?').get(user.account.id).email,'first@example.test');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM live_memberships').get().n,0);
  await f.browser(true).call('/api/auth/register',fields(token,'replayed_user'),400);
  await f.browser(true).call('/api/auth/login',{login:'new_user',password},401);
  assert.equal((await finishPasswordLogin(f,{login:'FIRST@EXAMPLE.TEST',password})).account.id,user.account.id);
  f.advance(60001);
  const collision=await challenge('first@example.test');await f.browser(true).call('/api/auth/register',fields(collision,'another_user'),409);
  const next=await challenge('second@example.test');await f.browser(true).call('/api/auth/register',fields(next,'new_user'),409);
  f.advance(60001);
  const results=await Promise.all(['second_user','third_user'].map(username=>f.browser(true).call('/api/auth/register',fields(next,username),[201,400])));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,400]);
  assert.equal(results.find(r=>r.status===400).data.error.code,'invalid_signup_link');
  const expired=await challenge('third@example.test');f.advance(600001);await f.browser(true).call('/api/auth/register',fields(expired,'too_late'),400);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM live_accounts').get().n,2);
 }finally{f.sqlite.close();}
});
test('failed email delivery removes the proof and reports an unavailable provider',async()=>{
 const f=fixture({configuredMail:true,mailAccepted:false});try{
  await f.browser(true).call('/api/auth/register/email',{email:'inbox@example.test'},503);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM auth_registration_challenges').get().n,0);
 }finally{f.sqlite.close();}
});
test('legacy enrollment preserves identity, revokes other sessions and retires username login',async()=>{
 const f=fixture({configuredMail:true});try{
  const active=await f.register(),other=f.browser(true);await other.call('/api/auth/login',{username:'native_user',password});
  assert.equal((await active.call('/api/auth/session')).authentication.needsVerifiedEmail,true);
  await active.call('/api/auth/email/request',{email:'migrated@example.test'},202);
  await active.call('/api/auth/email/verify',{token:f.tokenFromLastMail()});await other.call('/api/auth/session',undefined,401);
  assert.equal((await active.call('/api/auth/session')).authentication.needsVerifiedEmail,false);
  await f.browser(true).call('/api/auth/login',{login:'native_user',password},401);
  assert.equal((await finishPasswordLogin(f,{login:'migrated@example.test',password})).account.id,active.session.account.id);
 }finally{f.sqlite.close();}
});
const requestCode='/api/auth/email/code/request',verifyCode='/api/auth/email/code/verify';
function lastCode(f){
 const message=f.messages.at(-1);
 assert(!message.text.includes('http'));
 const match=/\b([0-9]{8})\b/.exec(message.text);assert(match);
 return match[1];
}
test('legacy code migrates only the initiating session, retains the account and commits one concurrent verification',async()=>{
 const f=fixture({configuredMail:true});try{
  const user=await f.register(),other=f.browser(true),outsider=await f.register('other_user');
  await other.call('/api/auth/login',{username:'native_user',password});
  const sent=await user.call(requestCode,{email:'Private@Example.test'},202),code=lastCode(f);
  assert.deepEqual(f.messages.at(-1).to,['private@example.test']);
  assert.equal(sent.expiresAt,f.time()+600000);assert.equal(sent.code,undefined);
  const dbrow=f.sqlite.prepare('SELECT * FROM auth_email_codes').get();
  assert.equal(dbrow.challenge_hash,await authHash(sent.challengeId));assert.notEqual(dbrow.code_hash,code);
  const proof={challengeId:sent.challengeId,code};
  await other.call(verifyCode,proof,400);await outsider.call(verifyCode,proof,400);
  const results=await Promise.all([user.call(verifyCode,proof,[200,400]),user.call(verifyCode,proof,[200,400])]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
  await other.call('/api/auth/session',undefined,401);await user.call(verifyCode,proof,400);
  await user.call(requestCode,{email:'replacement@example.test'},409);
  assert.equal((await user.call('/api/auth/email')).email,'private@example.test');
  assert.equal((await finishPasswordLogin(f,{login:'private@example.test',password})).account.id,user.session.account.id);
  await f.browser(true).call('/api/auth/login',{username:'native_user',password},401);
 }finally{f.sqlite.close();}
});
test('replacement, expiry, retry limit and provider failures leave the old username login usable',async()=>{
 const f=fixture({configuredMail:true});try{
  const user=await f.register(),first=await user.call(requestCode,{email:'first@example.test'},202),firstCode=lastCode(f);
  const second=await user.call(requestCode,{email:'second@example.test'},202),secondCode=lastCode(f);
  await user.call(verifyCode,{challengeId:first.challengeId,code:firstCode},400);
  for(let i=0;i<5;i++)await user.call(verifyCode,{challengeId:second.challengeId,code:secondCode==='00000000'?'00000001':'00000000'},400);
  await user.call(verifyCode,{challengeId:second.challengeId,code:secondCode},400);
  const latest=await user.call(requestCode,{email:'third@example.test'},202),code=lastCode(f);
  await user.call(requestCode,{email:'third@example.test'},429);
  f.advance(600001);await user.call(verifyCode,{challengeId:latest.challengeId,code},401);
  await user.call('/api/auth/reauthenticate',{password});
  await user.call(verifyCode,{challengeId:latest.challengeId,code},400);
  assert.equal((await f.browser(true).call('/api/auth/login',{username:'native_user',password})).account.id,user.session.account.id);
 }finally{f.sqlite.close();}
 for(const options of [{},{configuredMail:true,mailAccepted:false}]){
  const f=fixture(options);try{
   const user=await f.register();await user.call(requestCode,{email:'unconfirmed@example.test'},503);
   assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM auth_email_codes').get().n,0);
   assert.equal((await user.call('/api/auth/email')).verifiedAt,null);
  }finally{f.sqlite.close();}
 }
});
test('a code that expires during its verification lookup cannot bind an email address',async()=>{
 const f=fixture({configuredMail:true});try{
  const user=await f.register(),sent=await user.call(requestCode,{email:'fresh@example.test'},202);
  f.env.DB.afterRead=sql=>{if(sql.startsWith('SELECT email FROM auth_email_codes'))f.advance(600001);};
  await user.call(verifyCode,{challengeId:sent.challengeId,code:lastCode(f)},400);
  assert.equal((await user.call('/api/auth/email')).email,null);
 }finally{f.sqlite.close();}
});
test('issued code cannot claim an address verified on another account or bypass an owner passkey',async()=>{
 const f=fixture({configuredMail:true});try{
  const owner=await f.register(),existing=await f.register('holder_user');
  const ownerId=owner.session.account.id,ownerSession=owner.session.session.id;
  f.sqlite.prepare('INSERT INTO account_emails VALUES(?,?,?,?,?)').run(existing.session.account.id,'holder@example.test',f.time(),f.time(),f.time());
  f.sqlite.prepare('INSERT INTO platform_owner VALUES(1,?,?,?)').run(ownerId,f.time(),ownerSession);
  await owner.call(requestCode,{email:'holder@example.test'},401);
  f.sqlite.prepare('UPDATE auth_sessions SET mfa_verified_at=? WHERE id=?').run(f.time(),ownerSession);
  const sent=await owner.call(requestCode,{email:'holder@example.test'},202),code=lastCode(f);
  f.advance(300001);await owner.call(verifyCode,{challengeId:sent.challengeId,code},401);
  f.sqlite.prepare('UPDATE auth_sessions SET mfa_verified_at=? WHERE id=?').run(f.time(),ownerSession);
  await owner.call(verifyCode,{challengeId:sent.challengeId,code},409);
  assert.equal((await owner.call('/api/auth/email')).email,null);assert.equal((await existing.call('/api/auth/email')).email,'holder@example.test');
 }finally{f.sqlite.close();}
});
const preLoginCookie='__Host-voidline_login_challenge';
const loginVerify='/api/auth/login/code/verify',loginResend='/api/auth/login/code/resend';
async function finishPasswordLogin(f,credentials){
 const browser=f.browser(true),pending=await browser.call('/api/auth/login',credentials,202);
 return browser.call(loginVerify,{challengeId:pending.challengeId,code:lastCode(f)});
}
async function verifiedUser(f){
 const user=await f.register();
 f.sqlite.prepare('INSERT INTO account_emails VALUES(?,?,?,?,?)').run(user.session.account.id,'inbox@example.test',f.time(),f.time(),f.time());
 return user;
}
test('verified password alone issues no session; its email code binds the browser and can create precisely one session',async()=>{
 const f=fixture({configuredMail:true});try{
  const user=await verifiedUser(f),login=f.browser(true),stranger=f.browser(true);
  const before=f.sqlite.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n;
  const pending=await login.call('/api/auth/login',{login:'inbox@example.test',password},202),code=lastCode(f);
  assert.deepEqual(Object.keys(pending).sort(),['challengeId','email','expiresAt','requiresEmailCode'].sort());
  assert.equal(pending.requiresEmailCode,true);assert.equal(f.messages.at(-1).subject,'Your VOIDLINE sign-in code');
  assert.deepEqual([...login.cookies.keys()],[preLoginCookie]);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,before);
  await login.call('/api/auth/session',undefined,401);
  const row=f.sqlite.prepare('SELECT * FROM auth_login_codes').get();
  assert.equal(row.browser_hash,await authHash(login.cookies.get(preLoginCookie)));
  assert.equal(row.challenge_hash,await authHash(pending.challengeId));assert.notEqual(row.code_hash,code);
  const proof={challengeId:pending.challengeId,code};await stranger.call(loginVerify,proof,400);
  const results=await Promise.all([login.call(loginVerify,proof,[200,400]),login.call(loginVerify,proof,[200,400])]);
  assert.deepEqual(results.map(i=>i.status).sort(),[200,400]);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,before+1);
  assert.equal((await login.call('/api/auth/session')).account.id,user.session.account.id);
  assert(!login.cookies.has(preLoginCookie));await login.call(loginVerify,proof,400);
 }finally{f.sqlite.close();}
});
test('resending a login code rotates the browser proof without extending password freshness and limits incorrect guesses',async()=>{
 const f=fixture({configuredMail:true});try{
  await verifiedUser(f);const login=f.browser(true),start=await login.call('/api/auth/login',{login:'inbox@example.test',password},202),original=lastCode(f);
  f.advance(120000);const retry=await login.call(loginResend,{challengeId:start.challengeId},202),next=lastCode(f);
  assert.notEqual(retry.challengeId,start.challengeId);assert.equal(retry.expiresAt,start.expiresAt);
  await login.call(loginVerify,{challengeId:start.challengeId,code:original},400);
  for(let i=0;i<5;i++)await login.call(loginVerify,{challengeId:retry.challengeId,code:next==='00000000'?'00000001':'00000000'},400);
  await login.call(loginVerify,{challengeId:retry.challengeId,code:next},400);
  const fresh=await login.call(loginResend,{challengeId:retry.challengeId},202),last=lastCode(f);
  f.advance(480001);await login.call(loginVerify,{challengeId:fresh.challengeId,code:last},400);
  await login.call(loginResend,{challengeId:fresh.challengeId},400);await login.call('/api/auth/session',undefined,401);
 }finally{f.sqlite.close();}
});
test('changing credentials, changing and restoring an email, or suspending then reinstating an account invalidates outstanding login codes',async()=>{
 const f=fixture({configuredMail:true});try{
  const user=await verifiedUser(f),id=user.session.account.id,login=f.browser(true);
  const cases=[
   ()=>f.sqlite.prepare('UPDATE auth_credentials SET change_marker=? WHERE account_id=?').run('new-credential-marker',id),
   ()=>{for(const email of ['replacement@example.test','inbox@example.test'])f.sqlite.prepare('UPDATE account_emails SET email=? WHERE account_id=?').run(email,id);},
   ()=>{for(const status of ['suspended','active'])f.sqlite.prepare('UPDATE live_accounts SET account_status=? WHERE id=?').run(status,id);}
  ];
  for(const invalidate of cases){
   f.advance(60001);const challenge=await login.call('/api/auth/login',{login:'inbox@example.test',password},202),code=lastCode(f);invalidate();
   await login.call(loginVerify,{challengeId:challenge.challengeId,code},400);await login.call('/api/auth/session',undefined,401);
  }
 }finally{f.sqlite.close();}
});
test('missing or rejected mail delivery cannot create a password login session',async()=>{
 for(const opts of [{},{configuredMail:true,mailAccepted:false}]){
  const f=fixture(opts);try{
   await verifiedUser(f);const browser=f.browser(true),before=f.sqlite.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n;
   const result=await browser.call('/api/auth/login',{login:'inbox@example.test',password},503);
   assert.equal(result.error.code,'login_email_unavailable');assert.equal(browser.cookies.size,0);
   assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,before);
   assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM auth_login_codes').get().n,0);
  }finally{f.sqlite.close();}
 }
});
let failures=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}}console.log(`${tests.length-failures}/${tests.length} identity hardening checks passed. Real Argon2id/JWT/SQLite, mocked provider exchange and email delivery; no real Google/email service claim.`);process.exitCode=failures?1:0;
