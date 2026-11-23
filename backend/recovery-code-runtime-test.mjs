// Actual production auth handler + workerd/D1 + real Argon2id. Only signup
// email-proof digests are seeded; accounts/credentials/sessions use HTTP forms.
// No real mail provider, user account, clock override or hash stub is involved.
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
const root=new URL('../',import.meta.url),origin='https://recovery-runtime.example';
const bundle=await build({stdin:{resolveDir:root.pathname,contents:"import {handleAuthRequest} from './worker/auth.mjs';export default {fetch(request,env,ctx){return handleAuthRequest(request,env,ctx);}}"},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,minify:true});
const runtime=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:{DB:'isolated-saved-recovery-code'},d1Persist:false});
const password='Original isolated account password 2026',firstPassword='First recovered isolated password 2026',secondPassword='Second recovered isolated password 2026';
const hex64=/^[a-f0-9]{64}$/;
let passed=0;
async function check(name,run){await run();passed++;console.log('PASS '+name);}
function browser(){
 const cookies=new Map();
 return {async call(path,body,expected=200){
  const headers={accept:'application/json',...(cookies.size?{cookie:[...cookies].map(([name,value])=>name+'='+value).join('; ')}:{})};
  if(body!==undefined)Object.assign(headers,{origin,'content-type':'application/json','x-voidline-auth':'1'});
  const response=await runtime.dispatchFetch(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json(),setCookies=response.headers.getSetCookie();
  assert.equal(response.status,expected,`${path}: expected ${expected}, got ${response.status} (${data.error?.code||'no error'})`);
  for(const value of setCookies){const pair=value.split(';')[0],at=pair.indexOf('='),name=pair.slice(0,at),bearer=pair.slice(at+1);bearer?cookies.set(name,bearer):cookies.delete(name);}
  return {data,setCookies};
 }};
}
try{
 const db=await runtime.getD1Database('DB');
 for(const {tag}of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries){
  for(const statement of readFileSync(new URL('../drizzle/'+tag+'.sql',import.meta.url),'utf8').split('--> statement-breakpoint').map(part=>part.trim()).filter(Boolean))await db.prepare(statement).run();
 }
 async function signup(username){
  const email=username+'@example.test',proof=randomBytes(32).toString('hex'),client=browser();
  await db.prepare('INSERT INTO auth_registration_challenges(token_hash,email,expires_at) VALUES(?,?,?)').bind(createHash('sha256').update(proof).digest('hex'),email,Date.now()+600000).run();
  const {data}=await client.call('/api/auth/register',{username,displayName:'Isolated '+username,emailToken:proof,password},201);
  assert.match(data.recoveryCode,hex64);assert.equal(data.account.email,undefined);
  return {client,email,username,id:data.account.id,code:data.recoveryCode,sessionId:data.session.id};
 }
 async function protectedState(){
  // Rate buckets may change on rejected attempts; identity, credentials,
  // sessions, proof records and queued account-policy operations must not.
  const rows=async sql=>(await db.prepare(sql).all()).results;
  return {
   accounts:await rows('SELECT id,username,account_status FROM live_accounts ORDER BY id'),
   credentials:await rows('SELECT * FROM auth_credentials ORDER BY account_id'),
   emails:await rows('SELECT * FROM account_emails ORDER BY account_id'),
   sessions:await rows('SELECT * FROM auth_sessions ORDER BY id'),
   tokens:await rows('SELECT * FROM auth_email_tokens ORDER BY token_hash'),
   policies:await rows('SELECT * FROM matrix_policy_operations ORDER BY id'),
  };
 }
 async function noChange(client,body){const before=await protectedState(),response=await client.call('/api/auth/recover',body,401);assert.equal(response.data.error.code,'invalid_recovery');assert.equal(response.setCookies.length,0);assert.deepEqual(await protectedState(),before);}
 let alice,bob,earlierLogin,recovered,replacementCode,firstRecoverySessionId;
 await check('real verified registration supplies saved codes and earlier account sessions in workerd/D1',async()=>{
  alice=await signup('recovery_alice');bob=await signup('recovery_bob');assert.notEqual(alice.id,bob.id);assert.notEqual(alice.code,bob.code);
  earlierLogin=browser();const login=await earlierLogin.call('/api/auth/login',{login:alice.email,password});assert.equal(login.data.account.id,alice.id);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM auth_registration_challenges').first()).n,0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM live_accounts').first()).n,2);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM auth_credentials WHERE algorithm='argon2id-v19-m19456-t2-p1'").first()).n,2);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM account_emails WHERE verified_at IS NOT NULL').first()).n,2);
 });
 await check('wrong saved codes and another account’s code cannot mutate protected account state',async()=>{
  const wrong=(alice.code[0]==='0'?'1':'0')+alice.code.slice(1);
  await noChange(browser(),{login:alice.email,recoveryCode:wrong,password:firstPassword});
  await noChange(browser(),{login:bob.email,recoveryCode:alice.code,password:firstPassword});
  await noChange(browser(),{login:'unknown@example.test',recoveryCode:bob.code,password:firstPassword});
 });
 await check('a mixed-case verified email and uppercase saved code recover the same ID and revoke prior sessions',async()=>{
  recovered=browser();const result=await recovered.call('/api/auth/recover',{login:'  '+alice.email.toUpperCase()+'  ',recoveryCode:' \n'+alice.code.toUpperCase()+'\t ',password:firstPassword});
  assert.equal(result.data.account.id,alice.id);assert.equal(result.data.account.username,alice.username);assert.match(result.data.recoveryCode,hex64);assert.notEqual(result.data.recoveryCode,alice.code);
  replacementCode=result.data.recoveryCode;firstRecoverySessionId=result.data.session.id;
  assert.equal((await recovered.call('/api/auth/session')).data.account.id,alice.id);
  await alice.client.call('/api/auth/session',undefined,401);await earlierLogin.call('/api/auth/session',undefined,401);
  assert.equal((await bob.client.call('/api/auth/session')).data.account.id,bob.id);
  const active=(await db.prepare('SELECT id FROM auth_sessions WHERE account_id=? AND revoked_at IS NULL').bind(alice.id).all()).results;assert.deepEqual(active.map(row=>row.id),[firstRecoverySessionId]);
 });
 await check('the consumed saved code cannot replay and only the newly chosen password signs in',async()=>{
  await noChange(browser(),{login:alice.email,recoveryCode:alice.code,password:secondPassword});
  const fresh=browser(),signedIn=await fresh.call('/api/auth/login',{login:alice.email,password:firstPassword});assert.equal(signedIn.data.account.id,alice.id);
  const before=await protectedState(),denied=await browser().call('/api/auth/login',{login:alice.email,password},401);assert.equal(denied.data.error.code,'invalid_credentials');assert.equal(denied.setCookies.length,0);assert.deepEqual(await protectedState(),before);
 });
 await check('the replacement code works through username recovery and preserves identity across another rotation',async()=>{
  const latest=browser(),result=await latest.call('/api/auth/recover',{username:alice.username.toUpperCase(),recoveryCode:replacementCode,password:secondPassword});
  assert.equal(result.data.account.id,alice.id);assert.equal(result.data.account.username,alice.username);assert.match(result.data.recoveryCode,hex64);assert.notEqual(result.data.recoveryCode,replacementCode);
  const count=await db.prepare('SELECT COUNT(*) AS n FROM live_accounts').first();assert.equal(count.n,2);
  assert.equal((await db.prepare('SELECT revoked_at FROM auth_sessions WHERE id=?').bind(firstRecoverySessionId).first()).revoked_at!==null,true);
  await recovered.call('/api/auth/session',undefined,401);assert.equal((await latest.call('/api/auth/session')).data.account.id,alice.id);
  assert.equal((await browser().call('/api/auth/login',{login:alice.email,password:secondPassword})).data.account.id,alice.id);
  assert.equal((await bob.client.call('/api/auth/session')).data.account.id,bob.id);
 });
 console.log(`${passed}/5 saved-code recovery checks passed through real workerd/D1 and Argon2id. Synthetic accounts only; no email delivery, real-user recovery or browser rendering claimed.`);
}finally{await runtime.dispose();}
