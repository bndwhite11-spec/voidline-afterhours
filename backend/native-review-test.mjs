import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {authHash,handleAuthRequest} from '../worker/auth.mjs';
import {hashPassword} from '../worker/passwords.mjs';
import {handleMessagesRequest} from '../worker/messages.mjs';

// Independent adversarial integration checks: real HTTP handlers, SQLite and
// password verification. No browser, physical passkey or Matrix test evidence.
const origin='https://native-review.example',password='An independent native review password 2026!';
const random=()=>crypto.randomUUID(),credential=await hashPassword(password);
const cases=[],test=(name,run)=>cases.push([name,run]);
class Adapter {
 constructor(sqlite){this.sqlite=sqlite;this.beforeWrite=null;this.queue=Promise.resolve();}
 prepare(sql){const adapter=this,db=this.sqlite;return {bind(...values){const statement=db.prepare(sql),run=()=>({success:true,meta:{changes:statement.run(...values).changes}});return {sql,_run:run,first:async()=>statement.get(...values)||null,all:async()=>({results:statement.all(...values)}),run:async()=>{await adapter.beforeWrite?.([sql]);return run();}};}};}
 batch(statements){const task=this.queue.then(async()=>{await this.beforeWrite?.(statements.map(s=>s.sql));this.sqlite.exec('BEGIN');try{const results=statements.map(s=>s._run());this.sqlite.exec('COMMIT');return results;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}});this.queue=task.catch(()=>{});return task;}
}
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 const db=new Adapter(sqlite),env={DB:db},users=new Map(),now=Date.now();
 for(const id of ['alice','bob','carol','stranger']){
  const token=random().replaceAll('-','')+random().replaceAll('-',''),csrf=random().replaceAll('-','')+random().replaceAll('-',''),sessionId=random();
  sqlite.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(id,'review_'+id,'Review '+id,now,now);
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(sessionId,id,await authHash(token),await authHash(csrf),'Independent review fixture',now,now,now,now+3600000);
  users.set(id,{token,csrf,sessionId});
 }
 sqlite.prepare('INSERT INTO auth_credentials(account_id,password_hash,salt,algorithm,iterations,recovery_hash,change_marker,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run('bob',credential.hash,credential.salt,credential.algorithm,credential.iterations,await authHash(random()),random(),now,now);
 for(const [a,b]of [['alice','bob'],['alice','carol'],['bob','carol']])sqlite.prepare("INSERT INTO social_requests(id,sender_id,recipient_id,state,created_at,updated_at) VALUES(?,?,?,'accepted',?,?)").run(random(),a,b,now,now);
 async function call(user,path,body){
  const identity=users.get(user),headers={accept:'application/json',cookie:`__Host-voidline_session=${identity.token}; __Host-voidline_csrf=${identity.csrf}`};
  if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-auth':'1','x-voidline-csrf':identity.csrf});
  const request=new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:user,...body})})});
  const response=await(path.startsWith('/api/auth/')?handleAuthRequest:handleMessagesRequest)(request,env);return {status:response.status,data:await response.json()};
 }
 async function ok(user,path,body){const result=await call(user,path,body);assert(result.status>=200&&result.status<300,`${path}: ${result.status} ${JSON.stringify(result.data)}`);return result.data;}
 async function create(kind='dm'){return (await ok('alice','/api/messages/conversations',{kind,name:'Independent private group',usernames:kind==='dm'?['review_bob']:['review_bob','review_carol'],clientId:random(),acknowledgeStandard:true})).conversation;}
 async function send(user,id,text){return (await ok(user,`/api/messages/conversations/${id}/messages`,{clientId:random(),text,acknowledgeStandard:true})).message;}
 function intercept(matches,mutate){db.beforeWrite=async statements=>{if(matches(statements)){db.beforeWrite=null;mutate();}};}
 function revoke(id){sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),users.get(id).sessionId);}
 return {sqlite,db,users,call,ok,create,send,intercept,revoke};
}
const conversationURL=id=>'/api/messages/conversations/'+id;
const messageURL=id=>'/api/messages/messages/'+id;

test('account deletion clears folder preferences and group membership while retaining anonymized history for remaining members',async()=>{
 const f=await fixture();try{
  const group=await f.create('group'),original=await f.send('bob',group.id,'Retained author history'),folder=random();
  f.sqlite.prepare('INSERT INTO organization_folders(id,account_id,name,position,created_at) VALUES(?,?,?,?,?)').run(folder,'bob','Private native folder',0,Date.now());
  f.sqlite.prepare('INSERT INTO native_conversation_preferences(account_id,conversation_id,folder_id,updated_at) VALUES(?,?,?,?)').run('bob',group.id,folder,Date.now());
  const deleted=await f.call('bob','/api/auth/account/delete',{password});assert.equal(deleted.status,200,JSON.stringify(deleted.data));
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM organization_folders WHERE account_id='bob'").get().n,0);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM native_conversation_preferences WHERE account_id='bob'").get().n,0);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM native_members WHERE account_id='bob'").get().n,0);
  assert.equal((await f.call('bob',conversationURL(group.id)+'/messages')).status,401);
  const history=(await f.ok('alice',conversationURL(group.id)+'/messages')).messages;assert.equal(history[0].id,original.id);assert.equal(history[0].text,'Retained author history');assert.equal(history[0].author_name,'Deleted account');assert.equal(history[0].author_username,null);
  const continuation=await f.send('carol',group.id,'The remaining group still works');assert(continuation.id);
  assert.equal((await f.call('stranger',conversationURL(group.id)+'/messages')).status,404);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{f.sqlite.close();}
});
test('platform ownership still prevents account deletion before any native membership or preference cleanup',async()=>{
 const f=await fixture();try{
  const group=await f.create('group');f.sqlite.prepare('INSERT INTO platform_owner(id,account_id,bound_at,binding_session_id) VALUES(1,?,?,?)').run('bob',Date.now(),f.users.get('bob').sessionId);
  const result=await f.call('bob','/api/auth/account/delete',{password});assert.equal(result.status,409);assert.equal(result.data.error.code,'platform_owner_protected');
  assert(f.sqlite.prepare('SELECT account_id FROM native_members WHERE conversation_id=? AND account_id=?').get(group.id,'bob'));assert.equal(f.sqlite.prepare("SELECT account_status FROM live_accounts WHERE id='bob'").get().account_status,'active');
 }finally{f.sqlite.close();}
});
test('an edit or reaction cannot acknowledge a target deleted after authorization or emit a false change event',async()=>{
 for(const action of ['edit','react']){const f=await fixture();try{
  const conversation=await f.create(),message=await f.send('alice',conversation.id,'Original target');
  f.intercept(sql=>sql.some(s=>s.startsWith('UPDATE native_members SET joined_at')),()=>f.sqlite.prepare("UPDATE native_messages SET text='',deleted_at=? WHERE id=?").run(Date.now(),message.id));
  const result=await f.call(action==='edit'?'alice':'bob',messageURL(message.id)+'/'+action,action==='edit'?{text:'Must not resurrect',acknowledgeStandard:true}:{emoji:'👍',active:true});assert(result.status>=400,`${action} falsely acknowledged: ${result.status}`);
  const row=f.sqlite.prepare('SELECT text,deleted_at FROM native_messages WHERE id=?').get(message.id);assert.equal(row.text,'');assert(row.deleted_at);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_changes WHERE message_id=? AND kind=?').get(message.id,action).n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_reactions WHERE message_id=?').get(message.id).n,0);
 }finally{f.sqlite.close();}}
});
test('commit-time membership revocation stops edits, deletion and reactions without changing retained history',async()=>{
 for(const action of ['edit','delete','react']){const f=await fixture();try{
  const conversation=await f.create(),message=await f.send('alice',conversation.id,'Membership race survivor');
  f.intercept(sql=>sql.some(s=>s.startsWith('UPDATE native_members SET joined_at')),()=>f.sqlite.prepare('DELETE FROM native_members WHERE conversation_id=? AND account_id=?').run(conversation.id,'alice'));
  const result=await f.call('alice',messageURL(message.id)+'/'+action,action==='edit'?{text:'Unpermitted edit',acknowledgeStandard:true}:action==='react'?{emoji:'👍',active:true}:{});assert(result.status>=400);
  const remaining=(await f.ok('bob',conversationURL(conversation.id)+'/messages')).messages[0];assert.equal(remaining.text,'Membership race survivor');assert.equal(remaining.deleted_at,null);assert.deepEqual(remaining.reactions,[]);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_changes WHERE message_id=? AND kind=?').get(message.id,action).n,0);
 }finally{f.sqlite.close();}}
});
test('read and group-leave responses cannot falsely acknowledge after session revocation at their write boundary',async()=>{
 for(const action of ['read','leave']){const f=await fixture();try{
  const conversation=await f.create('group'),message=await f.send('alice',conversation.id,'Unread after revocation');
  f.intercept(sql=>sql.some(s=>action==='read'?s.startsWith('UPDATE native_members SET read_seq'):s.startsWith('DELETE FROM native_members')),()=>f.revoke('bob'));
  const result=await f.call('bob',conversationURL(conversation.id)+'/'+action,action==='read'?{seq:message.seq}:{});assert(result.status>=400,`${action} acknowledged despite revoked session: ${result.status}`);
  const member=f.sqlite.prepare('SELECT read_seq FROM native_members WHERE conversation_id=? AND account_id=?').get(conversation.id,'bob');assert(member);assert.equal(member.read_seq,0);
 }finally{f.sqlite.close();}}
});
let failures=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${cases.length-failures}/${cases.length} independent native integration checks passed. Actual HTTP handlers/migrated SQLite/Argon2id; no browser, physical passkey, production or E2EE claims.`);process.exitCode=failures?1:0;
