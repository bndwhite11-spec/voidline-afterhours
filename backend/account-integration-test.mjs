import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAuthRequest} from '../worker/auth.mjs';
import {handleLiveRequest} from '../worker/index.mjs';
import {handleCosmeticsRequest} from '../worker/cosmetics.mjs';
import {handleSocialRequest} from '../worker/social.mjs';

// Native account HTTP handlers, current generated SQL and actual password
// hashing. Test identities live only in an isolated in-memory database.
const origin='https://account-integration.example';
const password='Long evening password 2026!';
const nextPassword='Another private password 2026!';
const cases=[];const test=(name,run)=>cases.push([name,run]);
const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:()=>resolve()};};
class Adapter {
 constructor(sqlite){this.sqlite=sqlite;this.beforeBatch=null;}
 prepare(sql){const db=this.sqlite;return {bind(...values){const statement=db.prepare(sql),run=()=>({success:true,meta:{changes:statement.run(...values).changes}});return {
  sql,_run:run,first:async()=>statement.get(...values)||null,
  all:async()=>({results:statement.all(...values)}),run:async()=>run()
 };}};}
 async batch(statements){
  if(this.beforeBatch)await this.beforeBatch(statements.map(s=>s.sql));
  this.sqlite.exec('BEGIN');try{const result=statements.map(s=>s._run());this.sqlite.exec('COMMIT');return result;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}
 }
}
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
 for(const entry of journal.entries)sqlite.exec(readFileSync(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),'utf8'));
 const db=new Adapter(sqlite),env={DB:db};let nextIP=0;
 function client(){
  const cookies=new Map(),ip='192.0.2.'+(++nextIP);
  const instance={account:null,csrf:'',cookies,async call(path,body,options={}){
   const headers={accept:'application/json','cf-connecting-ip':ip,...(cookies.size?{cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}:{})};
   let payload=body;
   if(body!==undefined){Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-auth':'1','x-voidline-csrf':instance.csrf});payload={...(instance.account?{expectedAccountId:instance.account.id}:{}),...body};}
   Object.assign(headers,options.headers||{});for(const key of options.omitHeaders||[])delete headers[key];
   const request=new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify(payload)})});
   const route=path.startsWith('/api/auth/')?handleAuthRequest:path.startsWith('/api/cosmetics/')?handleCosmeticsRequest:path.startsWith('/api/social')?handleSocialRequest:handleLiveRequest;
   const response=await route(request,env),data=await response.json();
   if(!options.ignoreCookies){for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],cut=pair.indexOf('=');if(pair.slice(cut+1))cookies.set(pair.slice(0,cut),pair.slice(cut+1));else cookies.delete(pair.slice(0,cut));}}
   if(response.ok&&data.account)instance.account=data.account;
   if(response.ok&&data.csrfToken)instance.csrf=data.csrfToken;
   return {status:response.status,data,headers:response.headers};
  },async ok(path,body){const response=await instance.call(path,body);assert.ok(response.status>=200&&response.status<300,`${path}: status ${response.status}, code ${response.data.error?.code||'none'}`);return response.data;}};
  return instance;
 }
 async function register(username){const c=client();const data=await c.ok('/api/auth/register',{username,displayName:'Test '+username,password});return {client:c,recoveryCode:data.recoveryCode};}
 function holdNextBatch(match){const entered=deferred(),release=deferred();let used=false;db.beforeBatch=async statements=>{if(!used&&match(statements)){used=true;entered.resolve();await release.promise;}};let timer;const waiting=Promise.race([entered.promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The intended in-flight batch was not reached.')),3000);})]);entered.promise.then(()=>clearTimeout(timer));return {entered:waiting,release:release.resolve};}
 return {sqlite,db,env,client,register,holdNextBatch};
}

test('a real registration, refresh, logout and password login retain one empty account without provider configuration',async()=>{
 const f=fixture();try{
  const c=f.client(),config=await c.ok('/api/auth/config');assert.equal(config.provider,'password');assert.equal(config.configured,true);
  const registration=await c.call('/api/auth/register',{username:'Native_One',displayName:'Native One',password});assert.equal(registration.status,201);const id=c.account.id;
  assert.equal(c.account.username,'native_one');assert.equal(c.account.needsOnboarding,false);assert.match(registration.data.recoveryCode,/^[a-f0-9]{64}$/);
  for(const table of ['live_memberships','live_messages','social_requests','cosmetic_ownership','cosmetic_gifts'])assert.equal(f.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0,table);
  assert.deepEqual((await c.ok('/api/live/communities')).communities,[]);assert.equal((await c.ok('/api/auth/session')).account.id,id);
  const token=c.cookies.get('__Host-voidline_session'),csrf=c.csrf;
  await c.ok('/api/auth/logout',{});const replay=f.client();replay.cookies.set('__Host-voidline_session',token);replay.cookies.set('__Host-voidline_csrf',csrf);assert.equal((await replay.call('/api/auth/session')).status,401);
  const login=await c.ok('/api/auth/login',{username:'NATIVE_ONE',password});assert.equal(login.account.id,id);assert.notEqual(c.cookies.get('__Host-voidline_session'),token);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_accounts').get().n,1);
  assert.equal((await c.call('/api/auth/google/start')).status,503);
  assert.equal((await c.ok('/api/auth/config')).google.configured,false);
 }finally{f.sqlite.close();}
});

test('credentials are salted and hashed, while wrong and unknown logins return the same useful error',async()=>{
 const f=fixture();try{
  const a=await f.register('hash_person_a'),b=await f.register('hash_person_b');
  const rows=f.sqlite.prepare('SELECT * FROM auth_credentials ORDER BY account_id').all();assert.equal(rows.length,2);assert.notEqual(rows[0].password_hash,rows[1].password_hash);assert.notEqual(rows[0].salt,rows[1].salt);
  const records=JSON.stringify([...rows,...f.sqlite.prepare('SELECT * FROM auth_sessions').all()]);
  for(const secret of [password,a.recoveryCode,b.recoveryCode,a.client.cookies.get('__Host-voidline_session'),a.client.csrf])assert.ok(!records.includes(secret),'A raw authentication secret entered durable records');
  const login=f.client(),wrong=await login.call('/api/auth/login',{username:'hash_person_a',password:'Wrong password 12345!'}),missing=await login.call('/api/auth/login',{username:'does_not_exist',password:'Wrong password 12345!'});
  assert.equal(wrong.status,401);assert.equal(missing.status,401);assert.deepEqual(wrong.data,missing.data);
  assert.equal((await login.call('/api/auth/register',{username:'hash_person_a',displayName:'Duplicate',password})).status,409);
 }finally{f.sqlite.close();}
});

test('native accounts cannot cross private communities or bypass mutation origin, CSRF and expected-account checks',async()=>{
 const f=fixture();try{
  const {client:a}=await f.register('scope_owner'),{client:b}=await f.register('scope_member');
  const created=await a.ok('/api/live/communities',{name:'Chosen server'}),id=created.community.id;
  assert.equal((await b.call(`/api/live/communities/${id}/channels`)).status,403);
  for(const options of [{omitHeaders:['origin']},{headers:{origin:'https://other.example'}},{omitHeaders:['x-voidline-csrf']}])assert.equal((await a.call('/api/live/communities',{name:'Not created'},options)).status,403);
  assert.equal((await a.call('/api/live/communities',{name:'Not created',expectedAccountId:b.account.id})).status,409);
  const invite=await a.ok(`/api/live/communities/${id}/invites`,{maxUses:1});await b.ok('/api/live/invites/'+invite.invite.token);assert.equal((await b.ok('/api/live/communities')).communities.length,0);
  await b.ok('/api/live/invites/claim',{token:invite.invite.token});await b.ok('/api/live/invites/claim',{token:invite.invite.token});assert.equal((await b.ok('/api/live/communities')).communities.length,1);
  assert.equal((await b.call(`/api/live/communities/${id}/members/${b.account.id}`,{role:'owner'})).status,403);
 }finally{f.sqlite.close();}
});

test('free claims and equipment belong to the authenticated account and never create permission roles',async()=>{
 const f=fixture();try{
  const {client:a}=await f.register('badge_owner'),{client:b}=await f.register('badge_other');
  const catalogue=await a.ok('/api/cosmetics/catalog');assert.equal(catalogue.free,true);assert.ok(catalogue.items.length>=10);assert.ok(catalogue.items.every(item=>item.price===0));
  assert.deepEqual((await a.ok('/api/cosmetics/inventory')).owned,[]);
  assert.equal((await a.call('/api/cosmetics/equip',{cosmeticId:'angel'})).status,403);
  await a.ok('/api/cosmetics/claim',{cosmeticId:'angel'});await a.ok('/api/cosmetics/claim',{cosmeticId:'angel'});await a.ok('/api/cosmetics/equip',{cosmeticId:'angel'});
  assert.equal((await a.ok('/api/cosmetics/inventory')).owned.length,1);assert.equal((await a.ok('/api/cosmetics/inventory')).equippedId,'angel');assert.deepEqual((await b.ok('/api/cosmetics/inventory')).owned,[]);
  assert.equal((await b.call('/api/cosmetics/equip',{cosmeticId:'angel',accountId:a.account.id})).status,403);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_memberships').get().n,0);
 }finally{f.sqlite.close();}
});

test('real gift requests retry once, remain private and require the recipient to open or decline',async()=>{
 const f=fixture();try{
  const {client:a}=await f.register('gift_sender'),{client:b}=await f.register('gift_receiver'),{client:c}=await f.register('gift_outsider');
  const payload={catalogId:'gift-rose',username:'gift_receiver',clientId:'gift-request-0001'};
  const first=await a.ok('/api/cosmetics/gifts',payload),retry=await a.ok('/api/cosmetics/gifts',payload);assert.equal(first.gift.id,retry.gift.id);
  assert.equal((await b.ok('/api/cosmetics/inventory')).pendingGifts,1);assert.deepEqual((await b.ok('/api/cosmetics/inventory')).owned,[]);assert.equal((await c.ok('/api/cosmetics/gifts')).total,0);
  assert.equal((await a.call(`/api/cosmetics/gifts/${first.gift.id}/open`,{})).status,404);assert.equal((await c.call(`/api/cosmetics/gifts/${first.gift.id}/open`,{})).status,404);
  await b.ok(`/api/cosmetics/gifts/${first.gift.id}/open`,{});await b.ok(`/api/cosmetics/gifts/${first.gift.id}/open`,{});const owned=(await b.ok('/api/cosmetics/inventory')).owned;assert.equal(owned.length,1);assert.equal(owned[0].cosmetic_id,'gift-rose');
  assert.equal((await b.call(`/api/cosmetics/gifts/${first.gift.id}/decline`,{})).status,409);
  await b.ok('/api/cosmetics/settings',{giftsEnabled:false});assert.equal((await a.call('/api/cosmetics/gifts',{catalogId:'gift-star',username:'gift_receiver',clientId:'gift-request-0002'})).status,404);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_gifts').get().n,1);
 }finally{f.sqlite.close();}
});

test('password recovery rotates the recovery secret and invalidates existing sessions without changing identity',async()=>{
 const f=fixture();try{
  const {client:old,recoveryCode}=await f.register('recover_person'),id=old.account.id;
  const reset=f.client(),changed=await reset.ok('/api/auth/recover',{username:'recover_person',recoveryCode,password:nextPassword});assert.equal(changed.account.id,id);assert.notEqual(changed.recoveryCode,recoveryCode);
  assert.equal((await old.call('/api/auth/session')).status,401);
  assert.equal((await f.client().call('/api/auth/recover',{username:'recover_person',recoveryCode,password})).status,401);
  assert.equal((await f.client().call('/api/auth/login',{username:'recover_person',password})).status,401);
  assert.equal((await f.client().ok('/api/auth/login',{username:'recover_person',password:nextPassword})).account.id,id);
 }finally{f.sqlite.close();}
});

test('friend acceptance and account blocking control real gift requests without creating pretend conversations',async()=>{
 const f=fixture();try{
  const {client:a}=await f.register('social_sender'),{client:b}=await f.register('social_receiver'),{client:c}=await f.register('social_other');
  const request=await a.ok('/api/social/request',{username:'social_receiver'});
  assert.equal((await c.call(`/api/social/requests/${request.request.id}/respond`,{accept:true})).status,404);
  assert.equal((await b.ok('/api/social')).counts.incoming,1);await b.ok(`/api/social/requests/${request.request.id}/respond`,{accept:true});
  assert.equal((await a.ok('/api/social')).counts.friends,1);assert.equal((await b.ok('/api/social')).counts.friends,1);assert.equal((await c.ok('/api/social')).counts.friends,0);
  const gift=await a.ok('/api/cosmetics/gifts',{catalogId:'gift-cassette',username:'social_receiver',clientId:'before-block-gift'});
  await b.ok('/api/social/blocks',{accountId:a.account.id,active:true});
  assert.equal((await a.ok('/api/social')).counts.friends,0);assert.equal((await b.ok('/api/social')).counts.friends,0);
  assert.equal((await a.call('/api/social/request',{username:'social_receiver'})).status,404);
  assert.equal((await a.call('/api/cosmetics/gifts',{catalogId:'gift-star',username:'social_receiver',clientId:'after-block-gift'})).status,404);
  assert.equal((await b.call(`/api/cosmetics/gifts/${gift.gift.id}/open`,{})).status,409);assert.deepEqual((await b.ok('/api/cosmetics/inventory')).owned,[]);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n,0);
 }finally{f.sqlite.close();}
});

test('a new block committed while gift opening waits prevents the old opening from granting ownership',async()=>{
 const f=fixture();try{
  const {client:a}=await f.register('race_gift_sender'),{client:b}=await f.register('race_gift_receiver');
  const gift=await a.ok('/api/cosmetics/gifts',{catalogId:'gift-star',username:'race_gift_receiver',clientId:'race-gift-opening'});
  const hold=f.holdNextBatch(sql=>sql.some(s=>s.startsWith('UPDATE cosmetic_gifts')));
  const opening=b.call(`/api/cosmetics/gifts/${gift.gift.id}/open`,{});await hold.entered;
  await a.ok('/api/social/blocks',{accountId:b.account.id,active:true});hold.release();const result=await opening;
  assert.equal(result.status,409);assert.deepEqual((await b.ok('/api/cosmetics/inventory')).owned,[]);assert.equal(f.sqlite.prepare('SELECT state FROM cosmetic_gifts WHERE id=?').get(gift.gift.id).state,'pending');
 }finally{f.sqlite.close();}
});

test('an old login verification cannot create a new valid session after recovery commits',async()=>{
 const f=fixture();try{
  const {client:old,recoveryCode}=await f.register('racing_login');
  const hold=f.holdNextBatch(sql=>sql.some(s=>s.startsWith('INSERT INTO auth_sessions'))&&!sql.some(s=>s.includes('UPDATE auth_credentials')));
  const stale=f.client(),login=stale.call('/api/auth/login',{username:'racing_login',password});await hold.entered;
  const reset=f.client();await reset.ok('/api/auth/recover',{username:'racing_login',recoveryCode,password:nextPassword});hold.release();const result=await login;
  assert.ok([401,409].includes(result.status),'A password verified before recovery must not issue a later session');assert.equal((await stale.call('/api/auth/session')).status,401);assert.equal((await old.call('/api/auth/session')).status,401);assert.equal((await reset.ok('/api/auth/session')).account.username,'racing_login');
 }finally{f.sqlite.close();}
});

test('an in-flight password change cannot overwrite a completed recovery or resurrect its revoked session',async()=>{
 const f=fixture();try{
  const {client:old,recoveryCode}=await f.register('racing_change');
  const hold=f.holdNextBatch(sql=>sql.some(s=>s.startsWith('UPDATE auth_credentials'))&&sql.some(s=>s.startsWith('INSERT INTO auth_sessions')));
  const changing=old.call('/api/auth/password/change',{currentPassword:password,newPassword:'Stale intended password 2026!'});await hold.entered;
  const reset=f.client();await reset.ok('/api/auth/recover',{username:'racing_change',recoveryCode,password:nextPassword});hold.release();const result=await changing;
  assert.ok([401,409].includes(result.status),'A stale password change must be rejected');assert.equal((await old.call('/api/auth/session')).status,401);
  assert.equal((await f.client().ok('/api/auth/login',{username:'racing_change',password:nextPassword})).account.id,reset.account.id);
  assert.equal((await f.client().call('/api/auth/login',{username:'racing_change',password:'Stale intended password 2026!'})).status,401);
 }finally{f.sqlite.close();}
});

test('an in-flight account deletion cannot erase an account after its recovery code changes credentials',async()=>{
 const f=fixture();try{
  const {client:old,recoveryCode}=await f.register('racing_deletion');
  const hold=f.holdNextBatch(sql=>sql.some(s=>s.startsWith('UPDATE auth_credentials'))&&sql.some(s=>s.startsWith('DELETE FROM auth_credentials')));
  const deleting=old.call('/api/auth/account/delete',{password});await hold.entered;
  const reset=f.client();await reset.ok('/api/auth/recover',{username:'racing_deletion',recoveryCode,password:nextPassword});hold.release();const result=await deleting;
  assert.equal(result.status,409);assert.equal((await reset.ok('/api/auth/session')).account.username,'racing_deletion');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_credentials').get().n,1);
 }finally{f.sqlite.close();}
});

let failures=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${cases.length-failures}/${cases.length} native account/collection integration checks passed. Actual handlers and migrated SQLite; isolated accounts, no browser or production social interaction.`);
process.exitCode=failures?1:0;
