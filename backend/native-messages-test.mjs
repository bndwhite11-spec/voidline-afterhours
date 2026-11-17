import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {authHash} from '../worker/auth.mjs';
import {handleMessagesRequest} from '../worker/messages.mjs';

// Actual native HTTP handler + immutable migration chain + opaque-session
// fixtures. These tests establish standard server-stored chat behavior, never
// Matrix/E2EE, a browser render or transport delivery to a human device.
const origin='https://native-messages.example';
const cases=[],test=(name,run)=>cases.push([name,run]);
const random=()=>crypto.randomUUID();
const denied=result=>assert(result.status>=400&&result.status<500,'Expected deliberate client rejection, got '+result.status+' '+JSON.stringify(result.data));
class Adapter {
 constructor(sqlite){this.sqlite=sqlite;this.beforeBatch=null;this.queue=Promise.resolve();}
 prepare(sql){const db=this.sqlite;return {bind(...values){if(values.length>100)throw Error('Simulated D1 statement parameter limit exceeded');const statement=db.prepare(sql);return {sql,first:async()=>statement.get(...values)||null,all:async()=>({results:statement.all(...values)}),run:async()=>({success:true,meta:{changes:statement.run(...values).changes}})};}};}
 batch(statements){const task=this.queue.then(async()=>{if(this.beforeBatch)await this.beforeBatch(statements);this.sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.sqlite.exec('COMMIT');return results;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}});this.queue=task.catch(()=>{});return task;}
}
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 const db=new Adapter(sqlite),env={DB:db},identities=new Map(),now=Date.now();
 for(const user of ['alice','bob','carol','stranger']){
  const token=random().replaceAll('-','')+random().replaceAll('-',''),csrf=random().replaceAll('-','')+random().replaceAll('-',''),sessionId=random();
  sqlite.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(user,'user_'+user,'Test '+user,now,now);
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(sessionId,user,await authHash(token),await authHash(csrf),'Native acceptance fixture',now,now,now,now+3600000);
  identities.set(user,{token,csrf,sessionId});
 }
 for(const [a,b]of [['alice','bob'],['alice','carol'],['bob','carol']])sqlite.prepare("INSERT INTO social_requests(id,sender_id,recipient_id,state,created_at,updated_at) VALUES(?,?,?,'accepted',?,?)").run(random(),a,b,now,now);
 async function call(user,path,body,options={}){
  const identity=identities.get(user),headers={accept:'application/json',...(identity?{cookie:`__Host-voidline_session=${identity.token}; __Host-voidline_csrf=${identity.csrf}`}:{})};
  if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-auth':'1','x-voidline-csrf':identity?.csrf||''});
  Object.assign(headers,options.headers||{});for(const key of options.omitHeaders||[])delete headers[key];
  const request=new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:user,...body})})});
  const response=await handleMessagesRequest(request,env);return {status:response.status,data:await response.json()};
 }
 async function ok(user,path,body){const response=await call(user,path,body);assert(response.status>=200&&response.status<300,`${path}: ${response.status} ${JSON.stringify(response.data)}`);return response.data;}
 async function dm(a='alice',b='bob',extra={}){return (await ok(a,'/api/messages/conversations',{kind:'dm',usernames:['user_'+b],clientId:random(),acknowledgeStandard:true,...extra})).conversation;}
 async function send(user,id,text,extra={}){return (await ok(user,`/api/messages/conversations/${id}/messages`,{clientId:random(),text,acknowledgeStandard:true,...extra})).message;}
 function beforeCommit(run){db.beforeBatch=async()=>{db.beforeBatch=null;run();};}
 return {sqlite,db,env,identities,call,ok,dm,send,beforeCommit};
}
const conversationURL=id=>'/api/messages/conversations/'+id;
const messageURL=id=>'/api/messages/messages/'+id;

// Opaque UUIDs are native identifiers. A Matrix room ID must never select a
// plaintext conversation or become a fallback route.
test('fresh accounts have zero native conversations and anonymous/platform headers grant no access',async()=>{
 const f=await fixture();try{
  assert.deepEqual((await f.ok('alice','/api/messages/conversations')).conversations,[]);
  assert.deepEqual((await f.ok('bob','/api/messages/conversations')).conversations,[]);
  assert.equal((await f.call(undefined,'/api/messages/conversations',undefined,{headers:{'x-user-id':'alice','oai-authenticated-user-id':'alice'}})).status,401);
  denied(await f.call('alice',conversationURL(encodeURIComponent('!room:matrix.example'))+'/messages'));
 }finally{f.sqlite.close();}
});
test('standard mode requires explicit acknowledgement and accepted-friend eligibility',async()=>{
 const f=await fixture();try{
  const missing=await f.call('alice','/api/messages/conversations',{kind:'dm',usernames:['user_bob'],clientId:random()});denied(missing);
  const stranger=await f.call('alice','/api/messages/conversations',{kind:'dm',usernames:['user_stranger'],clientId:random(),acknowledgeStandard:true});denied(stranger);
  assert.deepEqual((await f.ok('alice','/api/messages/conversations')).conversations,[]);
  const conversation=await f.dm();assert.equal(conversation.securityMode,'standard');assert.equal(conversation.kind,'dm');
  assert.equal(conversation.participants.length,2);assert.deepEqual(new Set(conversation.participants.map(p=>p.id)),new Set(['alice','bob']));
  denied(await f.call('alice',conversationURL(conversation.id)+'/messages',{clientId:random(),text:'No acknowledgement'}));
  assert.equal((await f.ok('bob',conversationURL(conversation.id)+'/messages')).messages.length,0);
 }finally{f.sqlite.close();}
});
test('direct conversation creation is canonical and creation retries cannot change participants',async()=>{
 const f=await fixture();try{
  const clientId=random(),first=await f.dm('alice','bob',{clientId}),retry=await f.dm('alice','bob',{clientId}),reverse=await f.dm('bob','alice');
  assert.equal(first.id,retry.id);assert.equal(first.id,reverse.id);
  const conflict=await f.call('alice','/api/messages/conversations',{kind:'dm',usernames:['user_carol'],clientId,acknowledgeStandard:true});assert.equal(conflict.status,409);
  assert.equal((await f.ok('alice','/api/messages/conversations')).conversations.length,1);
 }finally{f.sqlite.close();}
});
test('simultaneous opposite direct-conversation requests commit one canonical pair and no orphan members',async()=>{
 const f=await fixture();try{
  const [a,b]=await Promise.all([f.dm('alice','bob'),f.dm('bob','alice')]);assert.equal(a.id,b.id);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_conversations').get().n,1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_members').get().n,2);
 }finally{f.sqlite.close();}
});
test('private conversation IDs do not grant read, write, read-cursor or message action access',async()=>{
 const f=await fixture();try{
  const conversation=await f.dm(),message=await f.send('alice',conversation.id,'Scoped private text');
  for(const [path,body]of [[conversationURL(conversation.id),undefined],[conversationURL(conversation.id)+'/messages',undefined],[conversationURL(conversation.id)+'/messages',{clientId:random(),text:'Intrusion',acknowledgeStandard:true}],[conversationURL(conversation.id)+'/read',{seq:message.seq}],[messageURL(message.id)+'/edit',{text:'Intrusion',acknowledgeStandard:true}],[messageURL(message.id)+'/delete',{}],[messageURL(message.id)+'/react',{emoji:'👍',active:true}]])denied(await f.call('stranger',path,body));
  assert.equal((await f.ok('alice',conversationURL(conversation.id)+'/messages')).messages[0].text,'Scoped private text');
 }finally{f.sqlite.close();}
});
test('a successful message is durable and identical retries never duplicate or overwrite content',async()=>{
 const f=await fixture();try{
  const conversation=await f.dm(),clientId=random(),payload={clientId,text:'Actual server-stored delivery',acknowledgeStandard:true};
  const first=(await f.ok('alice',conversationURL(conversation.id)+'/messages',payload)).message;
  const retry=(await f.ok('alice',conversationURL(conversation.id)+'/messages',payload)).message;assert.equal(retry.id,first.id);
  assert.equal((await f.call('alice',conversationURL(conversation.id)+'/messages',{...payload,text:'Changed retry'})).status,409);
  const bob=await f.ok('bob',conversationURL(conversation.id)+'/messages');assert.equal(bob.messages.length,1);assert.equal(bob.messages[0].text,payload.text);assert.equal(bob.messages[0].author_id,'alice');
  assert.equal(bob.securityMode,'standard');
  await f.ok('alice',messageURL(first.id)+'/delete',{});
  const afterDelete=(await f.ok('alice',conversationURL(conversation.id)+'/messages',payload)).message;assert(afterDelete.deleted_at);assert.equal(afterDelete.text,'');
 }finally{f.sqlite.close();}
});
test('simultaneous delivery retries acknowledge one stable message without duplicate mutation events',async()=>{
 const f=await fixture();try{
  const conversation=await f.dm(),payload={clientId:random(),text:'Concurrent retry',acknowledgeStandard:true};
  const replies=await Promise.all([f.ok('alice',conversationURL(conversation.id)+'/messages',payload),f.ok('alice',conversationURL(conversation.id)+'/messages',payload)]);
  assert.equal(replies[0].message.id,replies[1].message.id);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_messages WHERE conversation_id=?').get(conversation.id).n,1);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM native_changes WHERE conversation_id=? AND kind='send'").get(conversation.id).n,1);
 }finally{f.sqlite.close();}
});
test('message edit, reaction, reply and deletion synchronize with permission-scoped change cursors',async()=>{
 const f=await fixture();try{
  const conversation=await f.dm(),first=await f.send('alice',conversation.id,'Original'),initial=await f.ok('bob',conversationURL(conversation.id)+'/messages');
  denied(await f.call('bob',messageURL(first.id)+'/edit',{text:'Hijack',acknowledgeStandard:true}));
  denied(await f.call('bob',messageURL(first.id)+'/delete',{}));
  await f.ok('alice',messageURL(first.id)+'/edit',{text:'Edited',acknowledgeStandard:true});
  await f.ok('bob',messageURL(first.id)+'/react',{emoji:'👍',active:true});await f.ok('bob',messageURL(first.id)+'/react',{emoji:'👍',active:true});
  let refreshed=await f.ok('bob',conversationURL(conversation.id)+'/messages?changesAfter='+initial.changeCursor);
  let changed=refreshed.changes.find(m=>m.id===first.id);assert(changed);assert.equal(changed.text,'Edited');assert.equal(changed.reactions.find(r=>r.emoji==='👍').count,1);
  const reply=await f.send('bob',conversation.id,'A precise reply',{replyToId:first.id});assert.equal(reply.reply_to_id,first.id);
  await f.ok('bob',messageURL(first.id)+'/react',{emoji:'👍',active:false});
  await f.ok('alice',messageURL(first.id)+'/delete',{});
  refreshed=await f.ok('bob',conversationURL(conversation.id)+'/messages?changesAfter='+initial.changeCursor);changed=refreshed.changes.find(m=>m.id===first.id);assert(changed.deleted_at);assert.equal(changed.text,'');
  assert.equal(refreshed.messages.find(m=>m.id===reply.id).text,'A precise reply');
 }finally{f.sqlite.close();}
});
test('replies cannot reference another private conversation and history pagination has stable sequence bounds',async()=>{
 const f=await fixture();try{
  const ab=await f.dm(),ac=await f.dm('alice','carol'),outside=await f.send('alice',ac.id,'Outside');
  denied(await f.call('alice',conversationURL(ab.id)+'/messages',{clientId:random(),text:'Cross-source quote',replyToId:outside.id,acknowledgeStandard:true}));
  const messages=[];for(const text of ['first','second','third'])messages.push(await f.send('alice',ab.id,text));
  const latest=await f.ok('bob',conversationURL(ab.id)+'/messages?limit=2');assert.deepEqual(latest.messages.map(m=>m.id),messages.slice(1).map(m=>m.id));assert.equal(latest.hasMore,true);
  const older=await f.ok('bob',conversationURL(ab.id)+'/messages?before='+latest.messages[0].seq+'&limit=2');assert.deepEqual(older.messages.map(m=>m.id),[messages[0].id]);
  const after=await f.ok('bob',conversationURL(ab.id)+'/messages?after='+messages[1].seq);assert.deepEqual(after.messages.map(m=>m.id),[messages[2].id]);
 }finally{f.sqlite.close();}
});
test('read state is private, monotonic and bounded by acknowledged history',async()=>{
 const f=await fixture();try{
  const conversation=await f.dm(),first=await f.send('alice',conversation.id,'one'),second=await f.send('alice',conversation.id,'two');
  assert.equal((await f.ok('bob','/api/messages/conversations')).conversations[0].unreadCount,2);
  await f.ok('bob',conversationURL(conversation.id)+'/read',{seq:Number.MAX_SAFE_INTEGER});
  assert.equal((await f.ok('bob','/api/messages/conversations')).conversations[0].unreadCount,0);
  await f.ok('bob',conversationURL(conversation.id)+'/read',{seq:first.seq});
  assert.equal((await f.ok('bob','/api/messages/conversations')).conversations[0].unreadCount,0);
  await f.send('alice',conversation.id,'future message');assert.equal((await f.ok('bob','/api/messages/conversations')).conversations[0].unreadCount,1);
  await f.send('bob',conversation.id,'answer');assert.equal((await f.ok('alice','/api/messages/conversations')).conversations[0].unreadCount,1);
  assert(second.seq>first.seq);
 }finally{f.sqlite.close();}
});
test('blocks and suspension stop new delivery while preserving prior standard conversation records',async()=>{
 const f=await fixture();try{
  const conversation=await f.dm(),message=await f.send('alice',conversation.id,'Retained');
  f.sqlite.prepare('INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES(?,?,?)').run('bob','alice',Date.now());
  for(const author of ['alice','bob'])denied(await f.call(author,conversationURL(conversation.id)+'/messages',{clientId:random(),text:'Blocked send',acknowledgeStandard:true}));
  f.sqlite.prepare('DELETE FROM social_blocks').run();f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id='bob'").run();
  assert.equal((await f.call('bob',conversationURL(conversation.id)+'/messages')).status,401);
  denied(await f.call('alice',conversationURL(conversation.id)+'/messages',{clientId:random(),text:'Suspended recipient',acknowledgeStandard:true}));
  const history=await f.ok('alice',conversationURL(conversation.id)+'/messages');assert.equal(history.messages.length,1);assert.equal(history.messages[0].id,message.id);
 }finally{f.sqlite.close();}
});
test('origin, CSRF, expected account and revoked sessions protect every native send',async()=>{
 const f=await fixture();try{
  const conversation=await f.dm(),path=conversationURL(conversation.id)+'/messages',payload={clientId:random(),text:'Never committed',acknowledgeStandard:true};
  for(const options of [{omitHeaders:['origin']},{headers:{origin:'https://attacker.example'}},{omitHeaders:['x-voidline-csrf']},{headers:{'x-voidline-csrf':'0'.repeat(64)}}])assert.equal((await f.call('alice',path,payload,options)).status,403);
  assert.equal((await f.call('alice',path,{...payload,expectedAccountId:'bob'})).status,409);
  f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),f.identities.get('alice').sessionId);
  assert.equal((await f.call('alice',path,payload)).status,401);assert.equal((await f.ok('bob',path)).messages.length,0);
 }finally{f.sqlite.close();}
});
test('recipient suspension and session revocation at commit cannot sneak a send past earlier authorization',async()=>{
 for(const change of ['recipient','session','membership','block']){const f=await fixture();try{
  const conversation=await f.dm(),path=conversationURL(conversation.id)+'/messages';
  f.beforeCommit(()=>{if(change==='recipient')f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id='bob'").run();if(change==='session')f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),f.identities.get('alice').sessionId);if(change==='membership')f.sqlite.prepare('DELETE FROM native_members WHERE conversation_id=? AND account_id=?').run(conversation.id,'alice');if(change==='block')f.sqlite.prepare('INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES(?,?,?)').run('bob','alice',Date.now());});
  denied(await f.call('alice',path,{clientId:random(),text:'Commit race canary',acknowledgeStandard:true}));
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_messages WHERE conversation_id=?').get(conversation.id).n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_changes WHERE conversation_id=?').get(conversation.id).n,0);
 }finally{f.sqlite.close();}}
});
test('a new block at creation commit cannot produce a conversation or orphan membership',async()=>{
 const f=await fixture();try{
  f.beforeCommit(()=>f.sqlite.prepare('INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES(?,?,?)').run('bob','alice',Date.now()));
  denied(await f.call('alice','/api/messages/conversations',{kind:'dm',usernames:['user_bob'],clientId:random(),acknowledgeStandard:true}));
  assert.equal((await f.ok('alice','/api/messages/conversations')).conversations.length,0);assert.equal((await f.ok('bob','/api/messages/conversations')).conversations.length,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_members').get().n,0);
 }finally{f.sqlite.close();}
});
test('an edit or reaction cannot acknowledge success if the source was deleted immediately before commit',async()=>{
 for(const action of ['edit','react']){const f=await fixture();try{
  const conversation=await f.dm(),message=await f.send('alice',conversation.id,'Soon deleted');
  f.beforeCommit(()=>{
   f.sqlite.prepare("UPDATE native_messages SET text='',deleted_at=? WHERE id=?").run(Date.now(),message.id);
   f.sqlite.prepare("INSERT INTO native_changes(conversation_id,message_id,actor_id,kind,created_at) VALUES(?,?,?,'delete',?)").run(conversation.id,message.id,'alice',Date.now());
  });
  denied(await f.call('alice',messageURL(message.id)+'/'+action,action==='edit'?{text:'Cannot resurrect',acknowledgeStandard:true}:{emoji:'👍',active:true}));
  assert.equal(f.sqlite.prepare('SELECT text FROM native_messages WHERE id=?').get(message.id).text,'');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM native_reactions WHERE message_id=?').get(message.id).n,0);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM native_changes WHERE message_id=? AND kind IN ('edit','react')").get(message.id).n,0);
 }finally{f.sqlite.close();}}
});
test('one hundred-message history and change pages stay within the modeled D1 parameter budget',async()=>{
 const f=await fixture();try{
  const conversation=await f.dm(),now=Date.now();
  const insert=f.sqlite.prepare('INSERT INTO native_messages(id,conversation_id,author_id,client_id,text,original_hash,created_at) VALUES(?,?,?,?,?,?,?)');
  const change=f.sqlite.prepare("INSERT INTO native_changes(conversation_id,message_id,actor_id,kind,created_at) VALUES(?,?,?,'send',?)");
  for(let i=0;i<100;i++){const id=random();insert.run(id,conversation.id,'alice',random(),'Isolated history fixture '+i,'fixture-hash-'+i,now+i);change.run(conversation.id,id,'alice',now+i);}
  const result=await f.ok('bob',conversationURL(conversation.id)+'/messages?limit=100&changesAfter=0');
  assert.equal(result.messages.length,100);assert.equal(result.changes.length,100);assert.equal(result.hasMore,false);assert.equal(result.changesHasMore,false);
 }finally{f.sqlite.close();}
});
test('large conversation lists retain private metadata and accurate counts across one hundred-item pages',async()=>{
 const f=await fixture();try{
  const now=Date.now(),ids=[];
  const conversation=f.sqlite.prepare("INSERT INTO native_conversations(id,kind,name,security_mode,created_by,client_id,request_hash,created_at,updated_at) VALUES(?,'group',?,'standard','alice',?,?,?,?)");
  const member=f.sqlite.prepare('INSERT INTO native_members(conversation_id,account_id,joined_at,read_seq) VALUES(?,?,?,?)');
  const message=f.sqlite.prepare("INSERT INTO native_messages(id,conversation_id,author_id,client_id,text,original_hash,created_at) VALUES(?,?,'bob',?,?,?,?)");
  const change=f.sqlite.prepare("INSERT INTO native_changes(conversation_id,message_id,actor_id,kind,created_at) VALUES(?,?,'bob','send',?)");
  for(let i=0;i<101;i++){
   const id=random(),messageId=random();ids.push(id);conversation.run(id,'Batch group '+i,random(),'fixture-group-hash-'+i,now+i,now+i);
   message.run(messageId,id,random(),'History item '+i,'fixture-message-hash-'+i,now+i);const seq=f.sqlite.prepare('SELECT seq FROM native_messages WHERE id=?').get(messageId).seq;change.run(id,messageId,now+i);
   member.run(id,'alice',now+i,i%10===0?seq:0);member.run(id,'bob',now+i,seq);
  }
  const first=await f.ok('alice','/api/messages/conversations?limit=100'),second=await f.ok('alice','/api/messages/conversations?limit=100&offset=100');
  assert.equal(first.conversations.length,100);assert.equal(first.page.hasMore,true);assert.equal(second.conversations.length,1);assert.equal(second.page.hasMore,false);
  const all=[...first.conversations,...second.conversations];assert.equal(new Set(all.map(c=>c.id)).size,101);assert.deepEqual(new Set(all.map(c=>c.id)),new Set(ids));assert.equal(first.conversations[0].id,ids[100]);assert.equal(second.conversations[0].id,ids[0]);
  for(const c of all){const i=ids.indexOf(c.id);assert.equal(c.securityMode,'standard');assert.equal(c.participants.length,2);assert.deepEqual(new Set(c.participants.map(p=>p.id)),new Set(['alice','bob']));assert.equal(c.lastMessage.text,'History item '+i);assert.equal(c.unreadCount,i%10===0?0:1);assert(c.lastSeq>0);assert(c.changeSeq>0);}
  assert.deepEqual((await f.ok('stranger','/api/messages/conversations?limit=100')).conversations,[]);
 }finally{f.sqlite.close();}
});
test('private groups admit only reviewed friend participants and remain distinct from DMs',async()=>{
 const f=await fixture();try{
  const dm=await f.dm(),group=(await f.ok('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob','user_carol'],name:'Private test group',clientId:random(),acknowledgeStandard:true})).conversation;
  assert.notEqual(group.id,dm.id);assert.equal(group.kind,'group');assert.equal(group.name,'Private test group');assert.equal(group.participants.length,3);
  await f.send('carol',group.id,'Actual group text');assert.equal((await f.ok('bob',conversationURL(group.id)+'/messages')).messages[0].text,'Actual group text');
  denied(await f.call('stranger',conversationURL(group.id)+'/messages'));
  f.sqlite.prepare('INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES(?,?,?)').run('bob','carol',Date.now());
  denied(await f.call('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob','user_carol'],name:'Blocked pair',clientId:random(),acknowledgeStandard:true}));
  const rejected=await f.call('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob','user_stranger'],name:'No silent strangers',clientId:random(),acknowledgeStandard:true});denied(rejected);
 }finally{f.sqlite.close();}
});
test('group blocks and suspended peers do not freeze unrelated active participants',async()=>{
 const f=await fixture();try{
  const group=(await f.ok('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob','user_carol'],name:'Group policy',clientId:random(),acknowledgeStandard:true})).conversation;
  f.sqlite.prepare('INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES(?,?,?)').run('bob','carol',Date.now());
  await f.send('alice',group.id,'Unrelated member can post');await f.send('carol',group.id,'Shared group remains shared');
  f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id='bob'").run();
  await f.send('carol',group.id,'An inactive peer cannot freeze everyone');assert.equal((await f.call('bob',conversationURL(group.id)+'/messages')).status,401);
  const detail=(await f.ok('alice',conversationURL(group.id))).conversation;assert.match(detail.blockingPolicy,/Shared group members/);assert.equal(detail.capabilities.canSend,true);
 }finally{f.sqlite.close();}
});
test('message and reaction revisions are monotonic and deletion remains a revised tombstone',async()=>{
 const f=await fixture();try{
  const c=await f.dm(),sent=await f.send('alice',c.id,'revision one');assert(sent.revision>0);
  const edited=(await f.ok('alice',messageURL(sent.id)+'/edit',{text:'revision two',acknowledgeStandard:true})).message;assert(edited.revision>sent.revision);
  const reacted=(await f.ok('bob',messageURL(sent.id)+'/react',{emoji:'👍',active:true})).message;assert(reacted.revision>edited.revision);
  const deleted=(await f.ok('alice',messageURL(sent.id)+'/delete',{})).message;assert(deleted.revision>reacted.revision);assert(deleted.deleted_at);assert.equal(deleted.text,'');
  const history=await f.ok('bob',conversationURL(c.id)+'/messages?changesAfter='+sent.revision);assert.equal(history.changes[0].revision,deleted.revision);
  assert.equal((await f.ok('bob','/api/messages/conversations')).conversations[0].lastMessage.revision,deleted.revision);
 }finally{f.sqlite.close();}
});
test('bookmarks synchronize independent revisions without copying text or bypassing membership',async()=>{
 const f=await fixture();try{
  const c=await f.dm(),m=await f.send('alice',c.id,'Bookmark source');const route=messageURL(m.id)+'/bookmark';
  const first=await f.ok('bob',route,{saved:true});assert.equal(first.bookmarkRevision,1);assert.equal((await f.ok('bob',messageURL(m.id))).message.saved,true);
  const removed=await f.ok('bob',route,{saved:false});assert(removed.bookmarkRevision>first.bookmarkRevision);assert.equal((await f.ok('bob','/api/messages/saved')).total,0);
  const again=await f.ok('bob',route,{saved:true});assert(again.bookmarkRevision>removed.bookmarkRevision);const saved=await f.ok('bob','/api/messages/saved');assert.equal(saved.total,1);assert.equal(saved.messages[0].bookmarkRevision,again.bookmarkRevision);assert.equal(saved.messages[0].text,'Bookmark source');
  assert.equal((await f.ok('alice','/api/messages/saved')).total,0);denied(await f.call('stranger',route,{saved:true}));
  f.sqlite.prepare('DELETE FROM native_members WHERE conversation_id=? AND account_id=?').run(c.id,'bob');assert.equal((await f.ok('bob','/api/messages/saved')).total,0);denied(await f.call('bob',route,{saved:true}));
  const cleared=await f.ok('bob',route,{saved:false});assert.equal(cleared.saved,false);assert.equal(f.sqlite.prepare('SELECT saved FROM native_bookmarks WHERE account_id=?').get('bob').saved,0);
 }finally{f.sqlite.close();}
});
test('a session revoked at unsave commit cannot return a false bookmark acknowledgement',async()=>{
 const f=await fixture();try{const c=await f.dm(),m=await f.send('alice',c.id,'Saved');await f.ok('bob',messageURL(m.id)+'/bookmark',{saved:true});f.beforeCommit(()=>f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),f.identities.get('bob').sessionId));denied(await f.call('bob',messageURL(m.id)+'/bookmark',{saved:false}));assert.equal(f.sqlite.prepare('SELECT saved FROM native_bookmarks WHERE account_id=?').get('bob').saved,1);}finally{f.sqlite.close();}
});
test('standard search counts and sources cover authorized history with literal terms and UTC dates',async()=>{
 const f=await fixture();try{
  const ab=await f.dm(),ac=await f.dm('alice','carol');await f.send('alice',ac.id,'needle private other conversation');
  const one=await f.send('alice',ab.id,'needle 100% https://example.test'),two=await f.send('bob',ab.id,'needle second');await f.send('alice',ab.id,'unrelated');
  let result=await f.ok('bob','/api/messages/search?q=needle&limit=1');assert.equal(result.total,2);assert.equal(result.page.hasMore,true);assert.equal(result.messages[0].id,two.id);
  result=await f.ok('bob','/api/messages/search?q=needle&author=user_alice&has=links');assert.equal(result.total,1);assert.equal(result.messages[0].id,one.id);
  assert.equal((await f.ok('bob','/api/messages/search?q=%25')).total,1);assert.equal((await f.ok('stranger','/api/messages/search?q=needle')).total,0);
  assert.equal((await f.call('bob','/api/messages/search?after=2026-02-30')).status,400);assert.equal((await f.call('bob','/api/messages/search?after=2026-12-01&before=2026-01-01')).status,400);
  await f.ok('alice',messageURL(one.id)+'/delete',{});assert.equal((await f.ok('bob','/api/messages/search?q=needle')).total,1);
  f.sqlite.prepare('DELETE FROM native_members WHERE conversation_id=? AND account_id=?').run(ab.id,'bob');assert.equal((await f.ok('bob','/api/messages/search?q=needle')).total,0);
 }finally{f.sqlite.close();}
});
test('complete-account filters find favorites and foldered chats beyond the first loaded page',async()=>{
 const f=await fixture();try{
  const now=Date.now(),ids=[];for(let i=0;i<65;i++){const id=random();ids.push(id);f.sqlite.prepare("INSERT INTO native_conversations(id,kind,name,security_mode,created_by,owner_id,client_id,request_hash,created_at,updated_at) VALUES(?,'group',?,'standard','alice','alice',?,?,?,?)").run(id,'Filtered '+i,random(),'hash-'+i,now+i,now+i);for(const user of ['alice','bob'])f.sqlite.prepare('INSERT INTO native_members(conversation_id,account_id,joined_at) VALUES(?,?,?)').run(id,user,now+i);}
  const folder=random();f.sqlite.prepare('INSERT INTO organization_folders(id,account_id,name,position,created_at) VALUES(?,?,?,?,?)').run(folder,'alice','People',0,now);
  f.sqlite.prepare('INSERT INTO native_conversation_preferences(account_id,conversation_id,favorite,folder_id,updated_at) VALUES(?,?,?,?,?)').run('alice',ids[0],1,folder,now);
  const favorite=await f.ok('alice','/api/messages/conversations?filter=favorites&limit=10');assert.equal(favorite.total,1);assert.equal(favorite.conversations[0].id,ids[0]);assert.equal(favorite.conversations[0].favorite,true);
  const grouped=await f.ok('alice','/api/messages/conversations?filter='+encodeURIComponent('folder:'+folder));assert.equal(grouped.conversations[0].id,ids[0]);assert.equal((await f.call('bob','/api/messages/conversations?filter='+encodeURIComponent('folder:'+folder))).status,404);
  const message=await f.send('bob',ids[0],'Unread beyond first page');const unread=await f.ok('alice','/api/messages/conversations?filter=unread');assert.equal(unread.total,1);assert.equal(unread.conversations[0].id,ids[0]);
  await f.ok('alice',conversationURL(ids[0])+'/read',{seq:message.seq});assert.equal((await f.ok('alice','/api/messages/conversations?filter=unread')).total,0);
 }finally{f.sqlite.close();}
});
test('snapshot cursors remain stable during activity and reject foreign, expired or mismatched lists',async()=>{
 const f=await fixture();try{
  const ids=[];for(let i=0;i<5;i++){const c=(await f.ok('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob'],name:'Snapshot '+i,clientId:random(),acknowledgeStandard:true})).conversation;ids.push(c.id);f.sqlite.prepare('UPDATE native_conversations SET updated_at=? WHERE id=?').run(100+i,c.id);}
  const first=await f.ok('alice','/api/messages/conversations?limit=2');assert(first.page.currentCursor);assert(first.page.nextCursor);const original=[...first.conversations.map(c=>c.id)];
  await f.send('bob',ids[0],'Move oldest to latest');await f.ok('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob'],name:'Not in earlier snapshot',clientId:random(),acknowledgeStandard:true});
  let token=first.page.nextCursor;while(token){const page=await f.ok('alice','/api/messages/conversations?limit=2&cursor='+encodeURIComponent(token));original.push(...page.conversations.map(c=>c.id));token=page.page.nextCursor;}
  assert.equal(original.length,5);assert.equal(new Set(original).size,5);assert.deepEqual(new Set(original),new Set(ids));
  const previous=await f.ok('alice','/api/messages/conversations?limit=2&cursor='+encodeURIComponent(first.page.currentCursor));assert.deepEqual(previous.conversations.map(c=>c.id),first.conversations.map(c=>c.id));
  assert.equal((await f.call('stranger','/api/messages/conversations?cursor='+encodeURIComponent(first.page.currentCursor))).status,409);
  assert.equal((await f.call('alice','/api/messages/conversations?filter=favorites&cursor='+encodeURIComponent(first.page.currentCursor))).status,409);
  f.sqlite.prepare('UPDATE native_list_snapshots SET expires_at=0 WHERE account_id=?').run('alice');assert.equal((await f.call('alice','/api/messages/conversations?cursor='+encodeURIComponent(first.page.currentCursor))).status,409);
 }finally{f.sqlite.close();}
});
test('snapshot pages recheck membership without exposing formerly accessible conversations',async()=>{
 const f=await fixture();try{const ab=await f.dm(),ac=await f.dm('alice','carol');const page=await f.ok('alice','/api/messages/conversations?limit=1');const hidden=page.conversations[0].id===ab.id?ac.id:ab.id;f.sqlite.prepare('DELETE FROM native_members WHERE conversation_id=? AND account_id=?').run(hidden,'alice');const later=await f.ok('alice','/api/messages/conversations?limit=10&cursor='+encodeURIComponent(page.page.currentCursor));assert.equal(later.total,1);assert(later.conversations.every(c=>c.id!==hidden));}finally{f.sqlite.close();}
});
test('group management is scoped to the current owner with explicit transfer and leave rules',async()=>{
 const f=await fixture();try{
  const c=(await f.ok('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob'],name:'Managed',clientId:random(),acknowledgeStandard:true})).conversation;assert.equal(c.ownerId,'alice');assert.equal(c.capabilities.canManage,true);
  denied(await f.call('bob',conversationURL(c.id)+'/settings',{name:'Hijacked'}));await f.ok('alice',conversationURL(c.id)+'/settings',{name:'Updated group'});
  const added=await f.ok('alice',conversationURL(c.id)+'/members',{usernames:['user_carol'],acknowledgeStandard:true});assert.equal(added.conversation.participants.length,3);
  denied(await f.call('alice',conversationURL(c.id)+'/leave',{}));await f.ok('alice',conversationURL(c.id)+'/transfer',{accountId:'bob'});
  denied(await f.call('alice',conversationURL(c.id)+'/members/carol/remove',{}));await f.ok('bob',conversationURL(c.id)+'/members/carol/remove',{});denied(await f.call('carol',conversationURL(c.id)));
  await f.ok('alice',conversationURL(c.id)+'/leave',{});assert.equal((await f.ok('bob',conversationURL(c.id))).conversation.ownerId,'bob');
 }finally{f.sqlite.close();}
});
test('stale native group owner mutations cannot bypass commit authorization or create audit fiction',async()=>{
 const f=await fixture();try{const c=(await f.ok('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob','user_carol'],name:'Race',clientId:random(),acknowledgeStandard:true})).conversation;f.beforeCommit(()=>f.sqlite.prepare('UPDATE native_conversations SET owner_id=? WHERE id=?').run('bob',c.id));denied(await f.call('alice',conversationURL(c.id)+'/members/carol/remove',{}));assert(f.sqlite.prepare('SELECT 1 FROM native_members WHERE conversation_id=? AND account_id=?').get(c.id,'carol'));assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE action='native.group.members.remove'").get().n,0);}finally{f.sqlite.close();}
});

test('group owner departure preserves management for an existing suspended member after reinstatement',async()=>{const f=await fixture();try{
 const c=(await f.ok('alice','/api/messages/conversations',{kind:'group',usernames:['user_bob'],name:'Successor',clientId:random(),acknowledgeStandard:true})).conversation;
 f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id='bob'").run();f.sqlite.prepare('DELETE FROM native_members WHERE conversation_id=? AND account_id=?').run(c.id,'alice');assert.equal(f.sqlite.prepare('SELECT owner_id FROM native_conversations WHERE id=?').get(c.id).owner_id,'bob');
 assert.equal((await f.call('bob',conversationURL(c.id))).status,401);f.sqlite.prepare("UPDATE live_accounts SET account_status='active' WHERE id='bob'").run();assert.equal((await f.ok('bob',conversationURL(c.id))).conversation.capabilities.canManage,true);await f.ok('bob',conversationURL(c.id)+'/settings',{name:'Recovered management'});
}finally{f.sqlite.close();}});
let failures=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${cases.length-failures}/${cases.length} native standard messaging checks passed. Actual migrated SQLite/session handlers; no browser, Matrix or end-to-end encryption claim.`);
process.exitCode=failures?1:0;
