import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {authHash} from '../worker/auth.mjs';
import {handleLiveRequest} from '../worker/index.mjs';

// Native community handler and real migrated SQLite with opaque-session
// fixtures. Explicit standard-mode acknowledgement is not an E2EE claim.
const origin='https://native-community.example',cases=[],test=(name,run)=>cases.push([name,run]),random=()=>crypto.randomUUID();
const denied=result=>assert(result.status>=400&&result.status<500,`Expected client rejection, got ${result.status} ${JSON.stringify(result.data)}`);
class Adapter{
 constructor(sqlite){this.sqlite=sqlite;this.beforeBatch=null;this.queue=Promise.resolve();}
 prepare(sql){const db=this.sqlite;return {bind(...values){if(values.length>100)throw Error('Modeled D1 statement parameter budget exceeded');const statement=db.prepare(sql);return {sql,first:async()=>statement.get(...values)||null,all:async()=>({results:statement.all(...values)}),run:async()=>({success:true,meta:{changes:statement.run(...values).changes}})};}};}
 batch(statements){const task=this.queue.then(async()=>{if(this.beforeBatch)await this.beforeBatch(statements);this.sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());this.sqlite.exec('COMMIT');return result;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}});this.queue=task.catch(()=>{});return task;}
}
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 const db=new Adapter(sqlite),env={DB:db},identities=new Map(),now=Date.now();
 for(const id of ['owner','moderator','member','stranger']){
  const token=random().replaceAll('-','')+random().replaceAll('-',''),csrf=random().replaceAll('-','')+random().replaceAll('-',''),sessionId=random();
  sqlite.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(id,'user_'+id,'Test '+id,now,now);
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(sessionId,id,await authHash(token),await authHash(csrf),'Community acceptance fixture',now,now,now,now+3600000);identities.set(id,{token,csrf,sessionId});
 }
 sqlite.prepare('INSERT INTO live_communities(id,name,created_by,created_at) VALUES(?,?,?,?)').run('room','Isolated community','owner',now);
 for(const id of ['owner','moderator','member'])sqlite.prepare('INSERT INTO live_memberships(community_id,account_id,role,joined_at) VALUES(?,?,?,?)').run('room',id,id,now);
 for(const [id,kind]of [['text-channel','text'],['announcements','announcement'],['other-channel','text']])sqlite.prepare('INSERT INTO live_channels(id,community_id,name,kind,created_at) VALUES(?,?,?,?,?)').run(id,'room',id,kind,now);
 async function call(user,path,body,options={}){
  const identity=identities.get(user),headers={accept:'application/json',...(identity?{cookie:`__Host-voidline_session=${identity.token}; __Host-voidline_csrf=${identity.csrf}`}:{})};if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-auth':'1','x-voidline-csrf':identity?.csrf||''});Object.assign(headers,options.headers||{});for(const key of options.omitHeaders||[])delete headers[key];
  const response=await handleLiveRequest(new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:user,...body})})}),env);return {status:response.status,data:await response.json()};
 }
 async function ok(user,path,body){const result=await call(user,path,body);assert(result.status>=200&&result.status<300,`${path}: ${result.status} ${JSON.stringify(result.data)}`);return result.data;}
 async function send(user='member',text='Standard community text',channel='text-channel',extra={}){return (await ok(user,`/api/live/channels/${channel}/messages`,{clientId:random(),text,acknowledgeStandard:true,...extra})).message;}
 function beforeCommit(action){db.beforeBatch=()=>{db.beforeBatch=null;action();};}
 return {sqlite,db,env,identities,call,ok,send,beforeCommit};
}
const channelURL=id=>'/api/live/channels/'+id+'/messages',messageURL=id=>'/api/live/messages/'+id;

test('unacknowledged community text stays fail-closed while explicit standard messages persist with truthful labels',async()=>{
 const f=await fixture();try{
  const rejected=await f.call('member',channelURL('text-channel'),{clientId:random(),text:'Not acknowledged'});assert.equal(rejected.status,503);assert.equal(rejected.data.error.code,'encryption_required');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n,0);
  const message=await f.send(),history=await f.ok('owner',channelURL('text-channel'));assert.equal(history.messages.length,1);assert.equal(history.messages[0].id,message.id);assert.equal(history.messages[0].text,'Standard community text');assert.equal(history.securityMode,'standard');assert.equal(history.endToEndEncrypted,false);
 }finally{f.sqlite.close();}
});
test('community sends deduplicate stable retry IDs without allowing changed content or resurrection',async()=>{
 const f=await fixture();try{
  const clientId=random(),message=await f.send('member','Original','text-channel',{clientId}),retry=await f.send('member','Original','text-channel',{clientId});assert.equal(message.id,retry.id);
  assert.equal((await f.call('member',channelURL('text-channel'),{clientId,text:'Changed retry',acknowledgeStandard:true})).status,409);
  await f.ok('member',messageURL(message.id)+'/edit',{text:'Edited',acknowledgeStandard:true});const replay=await f.send('member','Original','text-channel',{clientId});assert.equal(replay.text,'Edited');
  await f.ok('member',messageURL(message.id)+'/delete',{});const deleted=await f.send('member','Original','text-channel',{clientId});assert(deleted.deleted_at);assert.equal(deleted.text,'');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n,1);
 }finally{f.sqlite.close();}
});
test('announcement posting enforces community staff roles and native timeouts restrict ordinary delivery',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('member',channelURL('announcements'),{clientId:random(),text:'No staff role',acknowledgeStandard:true})).status,403);
  await f.send('owner','Owner announcement','announcements');await f.send('moderator','Moderator announcement','announcements');
  f.sqlite.prepare('INSERT INTO community_timeouts(community_id,account_id,expires_at,reason,issued_by,created_at) VALUES(?,?,?,?,?,?)').run('room','member',Date.now()+60000,'Fixture timeout','owner',Date.now());
  denied(await f.call('member',channelURL('text-channel'),{clientId:random(),text:'Timed out',acknowledgeStandard:true}));assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM live_messages WHERE channel_id='text-channel'").get().n,0);
 }finally{f.sqlite.close();}
});
test('private community IDs and source message IDs do not bypass membership or reply boundaries',async()=>{
 const f=await fixture();try{
  const message=await f.send(),outside=await f.send('member','Other channel','other-channel');
  for(const [path,body]of [[channelURL('text-channel'),undefined],[channelURL('text-channel'),{clientId:random(),text:'Intrusion',acknowledgeStandard:true}],[messageURL(message.id),undefined],[messageURL(message.id)+'/delete',{}],[messageURL(message.id)+'/reaction',{emoji:'👍',active:true,acknowledgeStandard:true}]])denied(await f.call('stranger',path,body));
  denied(await f.call('member',channelURL('text-channel'),{clientId:random(),text:'Wrong reply source',replyToId:outside.id,acknowledgeStandard:true}));
  denied(await f.call('member',channelURL('text-channel'),{clientId:random(),text:'Wrong thread source',threadRootId:outside.id,acknowledgeStandard:true}));
 }finally{f.sqlite.close();}
});
test('edits, reaction toggles, pins, deletion and source updates are synchronized with community permissions',async()=>{
 const f=await fixture();try{
  const message=await f.send(),initial=await f.ok('owner',channelURL('text-channel'));
  assert.equal((await f.call('owner',messageURL(message.id)+'/edit',{text:'Staff cannot impersonate',acknowledgeStandard:true})).status,403);
  await f.ok('member',messageURL(message.id)+'/edit',{text:'Revised',acknowledgeStandard:true});await f.ok('owner',messageURL(message.id)+'/reaction',{emoji:'👍',active:true,acknowledgeStandard:true});
  assert.equal((await f.call('member',messageURL(message.id)+'/pin',{active:true,acknowledgeStandard:true})).status,403);await f.ok('moderator',messageURL(message.id)+'/pin',{active:true,acknowledgeStandard:true});
  const changes=await f.ok('member','/api/live/channels/text-channel/changes?after='+initial.changeCursor),changed=changes.messages.find(m=>m.id===message.id);assert.equal(changed.text,'Revised');assert.equal(changed.pinned,true);assert.equal(changed.reactions.find(r=>r.emoji==='👍').count,1);
  await f.ok('owner',messageURL(message.id)+'/reaction',{emoji:'👍',active:false,acknowledgeStandard:true});await f.ok('moderator',messageURL(message.id)+'/delete',{});
  const removed=(await f.ok('member',messageURL(message.id))).message;assert(removed.deleted_at);assert.equal(removed.text,'');assert.equal(removed.pinned,false);assert.deepEqual(removed.reactions,[]);
 }finally{f.sqlite.close();}
});
test('a timeout, membership removal or session revocation immediately before commit produces no message or send event',async()=>{
 for(const change of ['timeout','membership','session']){const f=await fixture();try{
  f.beforeCommit(()=>{if(change==='timeout')f.sqlite.prepare('INSERT INTO community_timeouts(community_id,account_id,expires_at,reason,issued_by,created_at) VALUES(?,?,?,?,?,?)').run('room','member',Date.now()+60000,'Commit race','owner',Date.now());if(change==='membership')f.sqlite.prepare("DELETE FROM live_memberships WHERE community_id='room' AND account_id='member'").run();if(change==='session')f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),f.identities.get('member').sessionId);});
  denied(await f.call('member',channelURL('text-channel'),{clientId:random(),text:'Must not be sent',acknowledgeStandard:true}));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_changes').get().n,0);
 }finally{f.sqlite.close();}}
});
test('a staff demotion at commit cannot sneak an announcement past the role check',async()=>{
 const f=await fixture();try{
  f.beforeCommit(()=>f.sqlite.prepare("UPDATE live_memberships SET role='member' WHERE community_id='room' AND account_id='moderator'").run());
  denied(await f.call('moderator',channelURL('announcements'),{clientId:random(),text:'Role changed',acknowledgeStandard:true}));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n,0);
 }finally{f.sqlite.close();}
});
test('revocation before edit or reaction commit cannot mutate or append misleading activity',async()=>{
 for(const action of ['edit','reaction']){const f=await fixture();try{
  const message=await f.send(),events=f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_changes').get().n;
  f.beforeCommit(()=>f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),f.identities.get('member').sessionId));
  denied(await f.call('member',messageURL(message.id)+'/'+action,action==='edit'?{text:'Revoked edit',acknowledgeStandard:true}:{emoji:'👍',active:true,acknowledgeStandard:true}));
  assert.equal(f.sqlite.prepare('SELECT text FROM live_messages WHERE id=?').get(message.id).text,'Standard community text');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_reactions').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_changes').get().n,events);
 }finally{f.sqlite.close();}}
});
let failures=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${cases.length-failures}/${cases.length} native community checks passed. Actual migrated SQLite/session handler; standard server-stored text, no browser or E2EE claim.`);process.exitCode=failures?1:0;
