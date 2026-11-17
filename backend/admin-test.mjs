import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAdminRequest} from '../worker/admin.mjs';
import {authenticate,authHash} from '../worker/auth.mjs';

// Actual administration handler and generated SQL. Sessions and recent UV
// timestamps are isolated fixtures; this is not a real passkey/browser test.
const origin='https://owner-test.example',bootstrapToken='test-infrastructure-token-'+crypto.randomUUID();
const cases=[],test=(name,run)=>cases.push([name,run]);
class Adapter {
 constructor(sqlite){this.sqlite=sqlite;this.failAudit=false;}
 prepare(sql){const db=this.sqlite,adapter=this;return {bind(...values){const s=db.prepare(sql),run=()=>{if(adapter.failAudit&&sql.includes('INSERT INTO admin_audit'))throw Error('Injected audit failure');return {success:true,meta:{changes:s.run(...values).changes}};};return {first:async()=>s.get(...values)||null,all:async()=>({results:s.all(...values)}),run:async()=>run()};}};}
 async batch(statements){this.sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());this.sqlite.exec('COMMIT');return result;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}}
}
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));for(const entry of journal.entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 const db=new Adapter(sqlite),env={DB:db,OWNER_BOOTSTRAP_TOKEN:bootstrapToken},actors=new Map();
 async function add(id,username=id){const now=Date.now(),token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),csrf=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),sessionId=crypto.randomUUID();
  sqlite.prepare('INSERT INTO live_accounts(id,display_name,email,username,onboarding_complete,created_at,updated_at) VALUES(?,?,?,?,1,?,?)').run(id,username==='xrp'?'AT xrp':username,'',username,now,now);
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,mfa_verified_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(sessionId,id,await authHash(token),await authHash(csrf),'Isolated verified test session',now,now,now,now,now+3600000);
  actors.set(id,{id,token,csrf,sessionId});return actors.get(id);
 }
 for(const [id,name]of [['owner','verified_person'],['name-only','xrp'],['community-owner','room_host'],['member','ordinary']])await add(id,name);
 async function call(actor,path,body,options={}){
  const a=actors.get(actor),headers={...(a?{cookie:`__Host-voidline_session=${a.token}`}:{})};if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-csrf':a?.csrf||''});if(options.service)headers.authorization='Bearer '+(options.serviceToken||bootstrapToken);Object.assign(headers,options.headers||{});for(const name of options.omit||[])delete headers[name];
  const request=new Request(origin+'/api/admin'+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({...(a?{expectedAccountId:actor}:{}),...body})})});
  const response=await handleAdminRequest(request,env);return {status:response.status,data:await response.json()};
 }
 async function ok(actor,path,body,options){const r=await call(actor,path,body,options);assert.ok(r.status>=200&&r.status<300,`${path}: ${r.status} ${r.data.error?.code}`);return r.data;}
 function bindDirect(){const a=actors.get('owner');sqlite.prepare('INSERT INTO platform_owner VALUES(1,?,?,?)').run('owner',Date.now(),a.sessionId);}
 return {sqlite,db,env,actors,add,call,ok,bindDirect};
}

test('the public @xrp name, display name and community ownership never authorize platform APIs',async()=>{
 const f=await fixture();try{
  f.sqlite.exec("INSERT INTO live_communities(id,name,created_by,created_at) VALUES('community','Their room','community-owner',1);INSERT INTO live_memberships VALUES('community','community-owner','owner',1)");
  for(const actor of [undefined,'name-only','community-owner','member']){
   for(const route of ['/users','/communities','/reports','/catalog','/badges','/audit','/health'])assert.equal((await f.call(actor,route)).status,actor?403:401);
  }
  assert.equal((await f.ok('name-only','/status')).isOwner,false);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM platform_owner').get().n,0);
 }finally{f.sqlite.close();}
});
test('owner binding needs signed-in recent passkey proof plus infrastructure secret and exact immutable configuration',async()=>{
 const f=await fixture();try{
  const claim=await f.ok('owner','/owner/claim',{});assert.equal(claim.grantsAccess,false);assert.match(claim.code,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(f.sqlite.prepare('SELECT * FROM owner_claims').all()).includes(claim.code));
  assert.equal((await f.call(undefined,'/bootstrap/resolve',{code:claim.code})).status,403);
  const resolved=await f.ok(undefined,'/bootstrap/resolve',{code:claim.code},{service:true});assert.equal(resolved.accountId,'owner');
  f.env.PLATFORM_OWNER_ACCOUNT_ID='name-only';assert.equal((await f.call(undefined,'/bootstrap/bind',{code:claim.code},{service:true})).status,403);
  f.env.PLATFORM_OWNER_ACCOUNT_ID='owner';assert.equal((await f.ok(undefined,'/bootstrap/bind',{code:claim.code},{service:true})).bound,true);
  assert.equal((await f.ok('owner','/status')).isOwner,true);assert.equal((await f.ok('name-only','/status')).isOwner,false);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_audit').get().n,1);
 }finally{f.sqlite.close();}
});
test('a bound owner is immutable and bootstrap/configuration replay cannot select another account',async()=>{
 const f=await fixture();try{
  const claim=await f.ok('owner','/owner/claim',{});f.env.PLATFORM_OWNER_ACCOUNT_ID='owner';await f.ok(undefined,'/bootstrap/bind',{code:claim.code},{service:true});
  f.env.PLATFORM_OWNER_ACCOUNT_ID='name-only';assert.equal((await f.call(undefined,'/bootstrap/bind',{code:claim.code},{service:true})).status,409);assert.equal((await f.call('name-only','/owner/claim',{})).status,409);
  assert.equal(f.sqlite.prepare('SELECT account_id FROM platform_owner').get().account_id,'owner');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_audit').get().n,1);
 }finally{f.sqlite.close();}
});
test('expired, revoked and unverified ownership requests cannot bind even with infrastructure authorization',async()=>{
 const f=await fixture();try{
  f.sqlite.prepare('UPDATE auth_sessions SET mfa_verified_at=0 WHERE account_id=?').run('name-only');assert.equal((await f.call('name-only','/owner/claim',{})).status,401);
  let claim=await f.ok('owner','/owner/claim',{});f.env.PLATFORM_OWNER_ACCOUNT_ID='owner';f.sqlite.prepare('UPDATE owner_claims SET expires_at=1').run();assert.equal((await f.call(undefined,'/bootstrap/bind',{code:claim.code},{service:true})).status,410);
  claim=await f.ok('owner','/owner/claim',{});f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=1 WHERE account_id=?').run('owner');assert.equal((await f.call(undefined,'/bootstrap/bind',{code:claim.code},{service:true})).status,410);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM platform_owner').get().n,0);
 }finally{f.sqlite.close();}
});
test('each owner API requires fresh password and user-verifying passkey evidence',async()=>{
 const f=await fixture();try{
  f.bindDirect();f.sqlite.prepare('UPDATE auth_sessions SET mfa_verified_at=0 WHERE account_id=?').run('owner');assert.equal((await f.call('owner','/users')).status,401);
  f.sqlite.prepare('UPDATE auth_sessions SET mfa_verified_at=?,reauthenticated_at=1 WHERE account_id=?').run(Date.now(),'owner');assert.equal((await f.call('owner','/users')).status,401);
  assert.equal((await f.ok('owner','/status')).needsVerification,true);
 }finally{f.sqlite.close();}
});
test('account search is bounded and exposes methods/verification without passwords, hashes, email addresses or session bearers',async()=>{
 const f=await fixture();try{
  f.bindDirect();f.sqlite.prepare('INSERT INTO auth_credentials(account_id,password_hash,salt,algorithm,iterations,recovery_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run('member','a'.repeat(64),'b'.repeat(64),'fixture',1,'c'.repeat(64),1,1);
  f.sqlite.prepare('INSERT INTO account_emails(account_id,email,verified_at,created_at,updated_at) VALUES(?,?,?,?,?)').run('member','private-email@example.com',1,1,1);
  const data=await f.ok('owner','/users?limit=2&offset=0');assert.equal(data.users.length,2);assert.equal(data.page.total,4);assert.equal(data.page.hasMore,true);
  const exact=await f.ok('owner','/users?q=member');assert.equal(exact.users.length,1);assert.equal(exact.users[0].verifiedEmail,true);assert.deepEqual(exact.users[0].methods,['password']);
  const value=JSON.stringify(exact);for(const forbidden of ['private-email@example.com','a'.repeat(64),'b'.repeat(64),'c'.repeat(64),f.actors.get('member').token])assert.ok(!value.includes(forbidden));
  assert.equal((await f.ok('owner','/users?q=%25')).users.length,0);assert.equal((await f.call('owner','/users?limit=1000')).status,400);
 }finally{f.sqlite.close();}
});
test('suspension revokes sessions and normal users cannot reinstate themselves or suspend the owner',async()=>{
 const f=await fixture();try{
  f.bindDirect();await f.ok('owner','/users/member/status',{status:'suspended',reason:'Reviewed abusive behavior'});
  assert.equal(f.sqlite.prepare('SELECT account_status FROM live_accounts WHERE id=?').get('member').account_status,'suspended');
  const r=new Request(origin+'/api/auth/session',{headers:{cookie:'__Host-voidline_session='+f.actors.get('member').token}});await assert.rejects(()=>authenticate(r,f.env));
  assert.equal((await f.call('member','/users/member/status',{status:'active',reason:'Claiming a role'})).status,401);
  assert.equal((await f.call('owner','/users/owner/status',{status:'suspended',reason:'Self lockout test'})).status,409);
  await f.ok('owner','/users/member/status',{status:'active',reason:'Reviewed appeal accepted'});assert.equal(f.sqlite.prepare('SELECT account_status FROM live_accounts WHERE id=?').get('member').account_status,'active');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_audit').get().n,2);
 }finally{f.sqlite.close();}
});
test('an audit failure rolls back the administrative account mutation and session revocation',async()=>{
 const f=await fixture();try{
  f.bindDirect();f.db.failAudit=true;assert.equal((await f.call('owner','/users/member/status',{status:'suspended',reason:'Must roll back with audit'})).status,503);
  assert.equal(f.sqlite.prepare('SELECT account_status FROM live_accounts WHERE id=?').get('member').account_status,'active');assert.equal(f.sqlite.prepare('SELECT revoked_at FROM auth_sessions WHERE account_id=?').get('member').revoked_at,null);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_audit').get().n,0);
 }finally{f.sqlite.close();}
});
test('owner mutations enforce origin, CSRF and the authenticated account expectation',async()=>{
 const f=await fixture();try{
  f.bindDirect();for(const options of [{omit:['origin']},{headers:{origin:'https://other.example'}},{omit:['x-voidline-csrf']}])assert.equal((await f.call('owner','/users/member/revoke-sessions',{},options)).status,403);
  assert.equal((await f.call('owner','/users/member/revoke-sessions',{expectedAccountId:'member'})).status,409);assert.equal(f.sqlite.prepare('SELECT revoked_at FROM auth_sessions WHERE account_id=?').get('member').revoked_at,null);
 }finally{f.sqlite.close();}
});
test('community invitation revocation and report reviews are authorized and audited without reading private history',async()=>{
 const f=await fixture();try{
  f.bindDirect();f.sqlite.exec("INSERT INTO live_communities(id,name,created_by,created_at) VALUES('community','Private room','community-owner',1);INSERT INTO live_memberships VALUES('community','community-owner','owner',1);INSERT INTO live_invites(token_hash,community_id,created_by,expires_at,max_uses,created_at) VALUES('invite','community','community-owner',9999999999999,1,1)");
  assert.equal((await f.ok('owner','/communities')).communities[0].name,'Private room');await f.ok('owner','/communities/community/revoke-invites',{reason:'Community abuse investigation'});assert.ok(f.sqlite.prepare('SELECT revoked_at FROM live_invites').get().revoked_at);
  f.sqlite.prepare("INSERT INTO abuse_reports(id,reporter_id,target_type,target_id,reason,detail_text,status,created_at) VALUES('report','member','account','name-only','Spam','Only voluntarily submitted evidence','open',1)").run();
  assert.match((await f.ok('owner','/reports')).reports[0].detail_text,/voluntarily/);await f.ok('owner','/reports/report/resolve',{status:'resolved',reason:'Reviewed submitted evidence'});assert.equal(f.sqlite.prepare('SELECT status FROM abuse_reports').get().status,'resolved');
  const health=await f.ok('owner','/health');assert.equal(health.e2eeDecryptionAvailable,false);assert.equal(health.ownerMessageContentAccess,false);assert.equal(health.legacyTextMode,'explicit-consent-server-stored');assert.equal(health.backup.manualExportAvailable,false);
 }finally{f.sqlite.close();}
});
test('official gifts remain free and reviewed awards cannot become platform roles',async()=>{
 const f=await fixture();try{
  f.bindDirect();await f.ok('owner','/catalog/gift-rose',{name:'Chrome Rose',description:'A reviewed original rose design',active:false,price:999});assert.equal((await f.ok('owner','/catalog')).gifts.find(g=>g.id==='gift-rose').price,0);
  await f.ok('owner','/badges/community-contributor',{name:'Community contributor',description:'Reviewed original community work.',requirement:'An owner-reviewed contribution with recorded evidence.',rule:'reviewed-contribution',active:true});
  await f.ok('owner','/badges/community-contributor/award',{accountId:'member',reason:'Reviewed original artwork submitted voluntarily.'});const award=f.sqlite.prepare('SELECT * FROM badge_awards').get();assert.equal(award.issuer_id,'owner');assert.equal(award.account_id,'member');
  assert.equal((await f.call('member','/users')).status,403);assert.equal((await f.ok('member','/status')).isOwner,false);
  await f.ok('owner','/awards/'+award.id+'/revoke',{reason:'Contribution attribution could not be verified.'});assert.ok(f.sqlite.prepare('SELECT revoked_at FROM badge_awards').get().revoked_at);
 }finally{f.sqlite.close();}
});
test('admin recovery does not fabricate delivery or reveal the user recovery credential',async()=>{
 const f=await fixture();try{f.bindDirect();const result=await f.call('owner','/users/member/recovery',{});assert.equal(result.status,503);assert.equal(result.data.error.code,'verified_recovery_unavailable');assert.equal(result.data.password,undefined);assert.equal(result.data.recoveryCode,undefined);}finally{f.sqlite.close();}
});
test('configured administrative recovery uses the verified channel and audits intent before provider acceptance',async()=>{
 const f=await fixture(),originalFetch=globalThis.fetch;let providerCalls=0;
 try{
  f.bindDirect();Object.assign(f.env,{VOIDLINE_ORIGIN:origin,RESEND_API_KEY:'isolated-test-provider-secret',EMAIL_FROM:'Voidline <accounts@example.com>'});
  f.sqlite.prepare('INSERT INTO auth_credentials(account_id,password_hash,salt,algorithm,iterations,recovery_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run('member','a'.repeat(64),'b'.repeat(64),'fixture',1,'c'.repeat(64),1,1);
  f.sqlite.prepare('INSERT INTO account_emails(account_id,email,verified_at,created_at,updated_at) VALUES(?,?,?,?,?)').run('member','verified-private@example.com',1,1,1);
  globalThis.fetch=async(url,options)=>{providerCalls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE action='account.recovery.requested'").get().n,1);const payload=JSON.parse(options.body);assert.deepEqual(payload.to,['verified-private@example.com']);assert.match(payload.text,/expires in 10 minutes/);return new Response(JSON.stringify({id:'provider-request'}),{status:200,headers:{'content-type':'application/json'}});};
  const data=await f.ok('owner','/users/member/recovery',{});assert.equal(data.delivery,'provider-accepted');assert.equal(providerCalls,1);const audit=JSON.stringify(f.sqlite.prepare('SELECT * FROM admin_audit').all()),response=JSON.stringify(data);assert.ok(!audit.includes('verified-private@example.com'));assert.ok(!response.includes('verified-private@example.com'));assert.equal(data.password,undefined);assert.equal(data.token,undefined);assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE action='account.recovery.provider-accepted'").get().n,1);
 }finally{globalThis.fetch=originalFetch;f.sqlite.close();}
});
test('failure to record a recovery audit intent prevents any provider request',async()=>{
 const f=await fixture(),originalFetch=globalThis.fetch;let calls=0;try{f.bindDirect();f.db.failAudit=true;globalThis.fetch=async()=>{calls++;return new Response('{}');};assert.equal((await f.call('owner','/users/member/recovery',{})).status,503);assert.equal(calls,0);}finally{globalThis.fetch=originalFetch;f.sqlite.close();}
});

let failed=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${cases.length-failed}/${cases.length} platform administration checks passed. Generated SQLite and isolated authenticated sessions; no real owner binding, passkey browser or production action claimed.`);process.exitCode=failed?1:0;
