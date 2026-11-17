import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';
import {authHash, handleAuthRequest} from '../worker/auth.mjs';

// Current production boundary: real migrated SQL + opaque application sessions.
// Cookies are created as isolated test fixtures; Google token verification has
// its own signed-token suite. No production account or contact is accessed.
const origin='https://foundation.example';
const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
class Adapter {
 constructor(sqlite){this.sqlite=sqlite;}
 prepare(sql){const db=this.sqlite;return {bind(...values){const statement=db.prepare(sql);return {
  first:async()=>statement.get(...values)||null,
  all:async()=>({results:statement.all(...values)}),
  run:async()=>({success:true,meta:{changes:statement.run(...values).changes}})
 };}};}
 async batch(statements){this.sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());this.sqlite.exec('COMMIT');return result;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}}
}
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const entry of journal.entries)sqlite.exec(readFileSync(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),'utf8'));
 const env={DB:new Adapter(sqlite)};
 const identities=new Map();
 async function add(user,{onboarded=true}={}){
  const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),csrf=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),sessionId=crypto.randomUUID(),now=Date.now();
  sqlite.prepare('INSERT INTO live_accounts(id,display_name,email,username,onboarding_complete,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(user,'Resident '+user,'',onboarded?'user_'+user:null,onboarded?1:0,now,now);
  sqlite.prepare("INSERT INTO auth_identities(provider,subject,account_id,created_at) VALUES('google',?,?,?)").run('provider-'+user,user,now);
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(sessionId,user,await authHash(token),await authHash(csrf),'Isolated test browser',now,now,now,now+60000);
  const identity={token,csrf,sessionId};identities.set(user,identity);return identity;
 }
 async function call(user,path,body,extra={}){
  const identity=identities.get(user),headers={...(identity?{cookie:`__Host-voidline_session=${identity.token}; __Host-voidline_csrf=${identity.csrf}`}:{})};
  if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-csrf':identity?.csrf||''});
  Object.assign(headers,extra.headers||{});for(const key of extra.omitHeaders||[])delete headers[key];
  const request=new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:user,...body})})});
  const response=path.startsWith('/api/auth/')?await handleAuthRequest(request,env):await worker.fetch(request,env);
  return {status:response.status,data:await response.json(),headers:response.headers};
 }
 async function ok(user,path,body){const result=await call(user,path,body);assert.ok(result.status>=200&&result.status<300,`${path}: ${result.status} ${JSON.stringify(result.data)}`);return result.data;}
 async function community(){const created=await ok('owner','/api/live/communities',{name:'Intentional room',description:'Private test metadata'});const invite=await ok('owner',`/api/live/communities/${created.community.id}/invites`,{maxUses:1});return {...created,token:invite.invite.token};}
 for(const user of ['owner','member','stranger'])await add(user);
 return {sqlite,env,identities,add,call,ok,community};
}
const tests=[],test=(name,run)=>tests.push([name,run]);

test('frontend booleans and former platform identity headers cannot authenticate the current API',async()=>{
 const f=await fixture();try{
  for(const extra of [{headers:{'oai-authenticated-user-id':'owner'}},{headers:{'x-user-id':'owner','x-authenticated':'true'}},{headers:{cookie:'__Host-voidline_session='+'a'.repeat(64)}}]){
   const result=await f.call(undefined,'/api/live/communities',undefined,extra);assert.equal(result.status,401);assert.equal(result.data.communities,undefined);
  }
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_communities').get().n,0);
 }finally{f.sqlite.close();}
});
test('fresh Google identities are empty and do not inherit or modify preserved platform accounts',async()=>{
 const f=await fixture();try{
  f.sqlite.prepare("INSERT INTO live_accounts(id,display_name,email,created_at,updated_at) VALUES('old-platform','Existing Person','',1,1)").run();
  f.sqlite.prepare("INSERT INTO live_communities(id,name,created_by,created_at) VALUES('retained-room','Retained history','old-platform',1)").run();
  f.sqlite.prepare("INSERT INTO live_memberships VALUES('retained-room','old-platform','owner',1)").run();
  f.sqlite.prepare("INSERT INTO live_channels(id,community_id,name,kind,created_at) VALUES('retained-channel','retained-room','history','text',1)").run();
  f.sqlite.prepare("INSERT INTO live_messages(id,channel_id,author_id,client_id,text,created_at) VALUES('retained-message','retained-channel','old-platform','retained-client','Original content stays intact',2)").run();
  await f.add('newgoogle',{onboarded:false});
  for(let i=0;i<2;i++){
   const session=await f.ok('newgoogle','/api/auth/session');assert.equal(session.account.needsOnboarding,true);assert.equal(session.account.username,null);
   assert.deepEqual((await f.ok('newgoogle','/api/live/communities')).communities,[]);
   assert.equal((await f.ok('newgoogle','/api/live/saved')).total,0);
   assert.equal((await f.ok('newgoogle','/api/live/inbox?view=unread')).total,0);
  }
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM live_memberships WHERE account_id='newgoogle'").get().n,0);
  assert.equal(f.sqlite.prepare("SELECT name FROM live_communities WHERE id='retained-room'").get().name,'Retained history');
  assert.equal(f.sqlite.prepare("SELECT role FROM live_memberships WHERE account_id='old-platform'").get().role,'owner');
  assert.equal(f.sqlite.prepare("SELECT text FROM live_messages WHERE id='retained-message'").get().text,'Original content stays intact');
  assert.equal((await f.call('newgoogle','/api/live/channels/retained-channel/messages')).status,403);
 }finally{f.sqlite.close();}
});
test('all current account mutations enforce exact origin, CSRF and expected account',async()=>{
 const f=await fixture();try{
  const attempts=[{omitHeaders:['origin']},{headers:{origin:'https://unrelated.example'}},{omitHeaders:['x-voidline-csrf']},{headers:{'x-voidline-csrf':'b'.repeat(64)}}];
  for(const options of attempts)assert.equal((await f.call('owner','/api/live/communities',{name:'Must not exist'},options)).status,403);
  const changed=await f.call('owner','/api/live/communities',{expectedAccountId:'stranger',name:'Wrong account'});assert.equal(changed.status,409);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_communities').get().n,0);
 }finally{f.sqlite.close();}
});
test('invitation viewing never joins; explicit acceptance is idempotent and use-limited',async()=>{
 const f=await fixture();try{
  const created=await f.community(),id=created.community.id;
  for(let i=0;i<2;i++){const preview=await f.ok('member','/api/live/invites/'+created.token);assert.equal(preview.invite.name,'Intentional room');assert.equal(preview.invite.alreadyMember,false);}
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_memberships WHERE account_id=?').get('member').n,0);
  await f.ok('member','/api/live/invites/claim',{token:created.token});
  await f.ok('member','/api/live/invites/claim',{token:created.token});
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_memberships WHERE account_id=? AND community_id=?').get('member',id).n,1);
  assert.equal(f.sqlite.prepare('SELECT uses FROM live_invites WHERE community_id=?').get(id).uses,1);
  assert.equal((await f.call('stranger','/api/live/invites/claim',{token:created.token})).status,403);
  assert.equal((await f.call('stranger','/api/live/invites/'+created.token)).status,410);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_memberships WHERE account_id=?').get('stranger').n,0);
 }finally{f.sqlite.close();}
});
test('copied private IDs and cosmetic profile edits cannot grant channel or owner access',async()=>{
 const f=await fixture();try{
  const created=await f.community(),id=created.community.id;
  assert.equal((await f.call('member',`/api/live/communities/${id}/channels`)).status,403);
  assert.equal((await f.call('member',`/api/live/channels/${created.channel.id}/messages`)).status,403);
  await f.ok('member','/api/live/invites/claim',{token:created.token});
  await f.ok('member','/api/live/profile',{displayName:'Owner Admin',theme:'ice'});
  assert.equal((await f.call('member',`/api/live/communities/${id}/members/member`,{role:'owner'})).status,403);
  assert.equal((await f.call('member',`/api/live/communities/${id}/settings`,{name:'Hijacked'})).status,403);
  assert.equal(f.sqlite.prepare('SELECT role FROM live_memberships WHERE community_id=? AND account_id=?').get(id,'member').role,'member');
  await f.ok('owner',`/api/live/communities/${id}/members/member`,{remove:true});
  assert.equal((await f.call('member',`/api/live/channels/${created.channel.id}/messages`)).status,403);
 }finally{f.sqlite.close();}
});
test('unencrypted sends and message actions fail closed without writing message content',async()=>{
 const f=await fixture();try{
  const created=await f.community();
  for(const [route,body]of [[`/api/live/channels/${created.channel.id}/messages`,{clientId:'protected_1234',text:'PRIVATE_PLAINTEXT_CANARY'}],['/api/live/messages/unknown/edit',{text:'PRIVATE_PLAINTEXT_CANARY'}],['/api/live/messages/unknown/reaction',{emoji:'💜',active:true}],['/api/live/messages/unknown/save',{active:true}]]){
   const result=await f.call('owner',route,body);assert.equal(result.status,503);assert.equal(result.data.error.code,'encryption_required');
  }
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_changes').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_bookmarks').get().n,0);
 }finally{f.sqlite.close();}
});
test('logout revokes the server session and replaying its cookie cannot reopen account content',async()=>{
 const f=await fixture();try{
  await f.ok('owner','/api/auth/logout',{});
  assert.equal((await f.call('owner','/api/auth/session')).status,401);
  assert.equal((await f.call('owner','/api/live/communities')).status,401);
  assert.equal((await f.call('member','/api/auth/session')).status,200);
 }finally{f.sqlite.close();}
});
test('session listings and revocation are scoped to the signed-in account',async()=>{
 const f=await fixture();try{
  const owner=f.identities.get('owner'),member=f.identities.get('member');
  const listing=await f.ok('owner','/api/auth/devices');assert.equal(listing.devices.length,1);assert.equal(listing.devices[0].id,owner.sessionId);assert.equal(listing.devices[0].current,true);
  await f.ok('owner',`/api/auth/devices/${member.sessionId}/revoke`,{});
  assert.equal((await f.call('member','/api/auth/session')).status,200);
  f.sqlite.prepare('UPDATE auth_sessions SET reauthenticated_at=0 WHERE id=?').run(owner.sessionId);
  assert.equal((await f.call('owner',`/api/auth/devices/${owner.sessionId}/revoke`,{})).status,401);
 }finally{f.sqlite.close();}
});
let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${tests.length-failed}/${tests.length} current foundation boundary checks passed. Isolated SQLite/session fixtures; no real Google or Matrix account exchange.`);
process.exitCode=failed?1:0;
