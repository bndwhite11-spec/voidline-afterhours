import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {authHash} from '../worker/auth.mjs';
import {handleLiveRequest} from '../worker/index.mjs';

// Actual HTTP handler, opaque sessions and the complete additive SQLite schema.
// Deterministic interleaving happens immediately before its real write batch.
// D1 meta.changes includes trigger writes; SQLite changes() inside SQL remains direct.
const origin='https://community-correctness.example';
const cases=[],test=(name,run)=>cases.push([name,run]);
class Adapter{
 constructor(sqlite){this.sqlite=sqlite;this.queue=Promise.resolve();this.beforeBatch=null;this.onBatch=null;this.writeCounts=[];}
 prepare(sql){const db=this.sqlite,counts=this.writeCounts;return {bind(...values){assert(values.length<=100,'D1 parameter budget');const p=db.prepare(sql);return {sql,first:async()=>p.get(...values)||null,all:async()=>({results:p.all(...values)}),run:async()=>{const before=db.prepare('SELECT total_changes() AS n').get().n;p.run(...values);const changes=db.prepare('SELECT total_changes() AS n').get().n-before;counts.push(changes);return{success:true,meta:{changes}};}};}};}
 batch(steps){this.onBatch?.(steps);const task=this.queue.then(async()=>{if(this.beforeBatch)await this.beforeBatch(steps);this.sqlite.exec('BEGIN');try{const out=[];for(const step of steps)out.push(await step.run());this.sqlite.exec('COMMIT');return out;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}});this.queue=task.catch(()=>{});return task;}
}
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url))).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 const db=new Adapter(sqlite),env={DB:db},sessions=new Map(),now=Date.now();
 for(const id of ['owner','mod','bob','carol','stranger']){
  const token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-',''),csrf=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-',''),session=crypto.randomUUID();
  sqlite.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(id,'user_'+id,id==='bob'||id==='carol'?'Same Name':'Test '+id,now,now);
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(session,id,await authHash(token),await authHash(csrf),'Community correctness fixture',now,now,now,now+3600000);
  sessions.set(id,{token,csrf,session});
 }
 sqlite.prepare("INSERT INTO live_communities(id,name,created_by,created_at) VALUES('room','Isolated community','owner',?)").run(now);
 for(const [id,role]of [['owner','owner'],['mod','moderator'],['bob','member'],['carol','member']])sqlite.prepare("INSERT INTO live_memberships(community_id,account_id,role,joined_at) VALUES('room',?,?,?)").run(id,role,now);
 sqlite.prepare("INSERT INTO live_channels(id,community_id,name,kind,created_at) VALUES('channel','room','general','text',?)").run(now);
 async function call(id,path,body){const user=sessions.get(id),headers={...(user?{cookie:`__Host-voidline_session=${user.token}; __Host-voidline_csrf=${user.csrf}`}:{})};if(body!==undefined)Object.assign(headers,{origin,'content-type':'application/json','x-voidline-auth':'1','x-voidline-csrf':user?.csrf||''});const response=await handleLiveRequest(new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:id,...body})})}),env);return{status:response.status,data:await response.json()};}
 async function ok(...args){const result=await call(...args);assert(result.status>=200&&result.status<300,`${args[1]}: ${result.status} ${JSON.stringify(result.data)}`);return result.data;}
 async function send(text='Reviewed message',extra={}){return(await ok('owner','/api/live/channels/channel/messages',{clientId:crypto.randomUUID(),text,acknowledgeStandard:true,...extra})).message;}
 function beforeCommit(run){db.beforeBatch=async()=>{db.beforeBatch=null;run();};}
 function owner(){const c=sqlite.prepare("SELECT created_by,ownership_revision FROM live_communities WHERE id='room'").get(),rows=sqlite.prepare("SELECT account_id FROM live_memberships WHERE community_id='room' AND role='owner'").all();assert.deepEqual(rows.map(x=>x.account_id),[c.created_by]);return c;}
 return{sqlite,db,env,sessions,call,ok,send,beforeCommit,owner};
}
const transfer=(f,target)=>f.call('owner','/api/live/communities/room/transfer',{accountId:target});
const auditCount=f=>f.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_audit').get().n;

test('overlapping owner transfers have one winner, one conflict and one authoritative owner',async()=>{const f=await fixture();try{
 let release;const gate=new Promise(resolve=>release=resolve);let batches=0;f.db.onBatch=()=>{if(++batches===2)release();};f.db.beforeBatch=()=>gate;
 const results=await Promise.all([transfer(f,'bob'),transfer(f,'carol')]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);assert(['bob','carol'].includes(f.owner().created_by));assert.equal(auditCount(f),1);assert(f.db.writeCounts.some(count=>count>1),'The D1 model must include trigger-side writes.');
}finally{f.sqlite.close();}});
test('target departure or session revocation before transfer commit preserves the existing owner',async()=>{for(const race of ['target','session']){const f=await fixture();try{
 f.beforeCommit(()=>race==='target'?f.sqlite.prepare("DELETE FROM live_memberships WHERE community_id='room' AND account_id='bob'").run():f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),f.sessions.get('owner').session));
 assert.equal((await transfer(f,'bob')).status,409);assert.equal(f.owner().created_by,'owner');assert.equal(auditCount(f),0);
}finally{f.sqlite.close();}}});
test('ownership epoch rejects a stale transfer after ownership leaves and returns to the actor',async()=>{const f=await fixture();try{
 f.beforeCommit(()=>{f.sqlite.prepare("UPDATE live_communities SET created_by='bob' WHERE id='room'").run();f.sqlite.prepare("UPDATE live_communities SET created_by='owner' WHERE id='room'").run();});
 assert.equal((await transfer(f,'carol')).status,409);assert.equal(f.owner().created_by,'owner');assert.equal(f.owner().ownership_revision,2);assert.equal(auditCount(f),0);
}finally{f.sqlite.close();}});
test('database invariants reject a second owner and direct deletion or demotion of the owner',async()=>{const f=await fixture();try{
 assert.throws(()=>f.sqlite.prepare("UPDATE live_memberships SET role='owner' WHERE community_id='room' AND account_id='bob'").run());
 assert.throws(()=>f.sqlite.prepare("DELETE FROM live_memberships WHERE community_id='room' AND account_id='owner'").run());
 assert.throws(()=>f.sqlite.prepare("UPDATE live_memberships SET role='member' WHERE community_id='room' AND account_id='owner'").run());assert.equal(f.owner().created_by,'owner');
}finally{f.sqlite.close();}});
test('settings, channel, invitation and member-role writes reject ownership changed before commit',async()=>{for(const [path,body]of [
 ['/settings',{name:'Stale rename'}],['/channels',{name:'stale-channel'}],['/invites',{maxUses:1}],['/members/carol',{role:'moderator'}]
]){const f=await fixture();try{
 f.beforeCommit(()=>f.sqlite.prepare("UPDATE live_communities SET created_by='bob' WHERE id='room'").run());
 const result=await f.call('owner','/api/live/communities/room'+path,body);assert.equal(result.status,409,path);assert.equal(f.owner().created_by,'bob');assert.equal(auditCount(f),0);assert.equal(f.sqlite.prepare("SELECT name FROM live_communities WHERE id='room'").get().name,'Isolated community');
}finally{f.sqlite.close();}}});
test('moderation rechecks target ownership and actor role at the commit boundary',async()=>{for(const race of ['target-owner','actor-demoted']){const f=await fixture();try{
 f.beforeCommit(()=>race==='target-owner'?f.sqlite.prepare("UPDATE live_communities SET created_by='bob' WHERE id='room'").run():f.sqlite.prepare("UPDATE live_memberships SET role='member' WHERE community_id='room' AND account_id='mod'").run());
 const result=await f.call('mod','/api/live/communities/room/timeouts/bob',{minutes:60});assert.equal(result.status,409);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM community_timeouts').get().n,0);assert.equal(auditCount(f),0);f.owner();
}finally{f.sqlite.close();}}});
test('a member cannot leave after being promoted to owner during the request',async()=>{const f=await fixture();try{
 // This endpoint uses one conditional statement; interleave immediately before run.
 const prepare=f.db.prepare.bind(f.db);let changed=false;f.db.prepare=sql=>{const statement=prepare(sql);if(!sql.startsWith('DELETE FROM live_memberships WHERE'))return statement;return{bind(...args){const bound=statement.bind(...args),run=bound.run;bound.run=async()=>{if(!changed){changed=true;f.sqlite.prepare("UPDATE live_communities SET created_by='bob' WHERE id='room'").run();}return run();};return bound;}};};
 assert.equal((await f.call('bob','/api/live/communities/room/leave',{})).status,409);assert.equal(f.owner().created_by,'bob');
}finally{f.sqlite.close();}});
test('quarantined ownership preserves history while blocking new content and privileged changes',async()=>{const f=await fixture();try{
 const message=await f.send();f.sqlite.prepare("UPDATE live_communities SET ownership_repair_required=1 WHERE id='room'").run();
 assert.equal((await f.ok('bob','/api/live/channels/channel/messages')).messages[0].id,message.id);
 for(const [path,body]of [['/api/live/channels/channel/messages',{clientId:crypto.randomUUID(),text:'Blocked new text',acknowledgeStandard:true}],['/api/live/communities/room/settings',{name:'Blocked'}],['/api/live/communities/room/transfer',{accountId:'bob'}]]){const response=await f.call('owner',path,body);assert.equal(response.status,409);assert.equal(response.data.error.code,'ownership_repair_required');}
}finally{f.sqlite.close();}});
test('mentions use immutable selected identities rather than duplicate or renamed display names',async()=>{const f=await fixture();try{
 await f.send('Hello @Same Name');assert.equal((await f.ok('bob','/api/live/inbox?view=mentions')).total,0);assert.equal((await f.ok('carol','/api/live/inbox?view=mentions')).total,0);
 const message=await f.send('Hello @user_bob',{mentionIds:['bob']});assert.deepEqual(message.mention_ids,['bob']);assert.equal((await f.ok('bob','/api/live/inbox?view=mentions')).total,1);assert.equal((await f.ok('carol','/api/live/inbox?view=mentions')).total,0);
 f.sqlite.prepare("UPDATE live_accounts SET display_name='Renamed',username='renamed_bob' WHERE id='bob'").run();assert.equal((await f.ok('bob','/api/live/inbox?view=mentions')).total,1);
 const results=await f.ok('owner','/api/live/communities/room/members?query=renamed_bob');assert.equal(results.members[0].id,'bob');assert.equal(results.members[0].username,'renamed_bob');assert.equal('email' in results.members[0],false);
}finally{f.sqlite.close();}});
test('edits replace mention recipients atomically and deletions retain higher revision tombstones',async()=>{const f=await fixture();try{
 const sent=await f.send('Hello @user_bob',{mentionIds:['bob']});assert(sent.revision>0);
 const edited=(await f.ok('owner','/api/live/messages/'+sent.id+'/edit',{text:'Hello @user_carol',mentionIds:['carol'],acknowledgeStandard:true})).message;assert(edited.revision>sent.revision);assert.deepEqual(edited.mention_ids,['carol']);assert.equal((await f.ok('bob','/api/live/inbox?view=mentions')).total,0);assert.equal((await f.ok('carol','/api/live/inbox?view=mentions')).total,1);
 const reacted=(await f.ok('bob','/api/live/messages/'+sent.id+'/reaction',{emoji:'🔥',active:true,acknowledgeStandard:true})).message;assert(reacted.revision>edited.revision);
 const deleted=(await f.ok('owner','/api/live/messages/'+sent.id+'/delete',{})).message;assert(deleted.revision>reacted.revision);assert(deleted.deleted_at);assert.equal(deleted.text,'');assert.deepEqual(deleted.mention_ids,[]);
}finally{f.sqlite.close();}});
test('unauthorized or departed mention targets cannot mint notifications or commit a partial message',async()=>{const f=await fixture();try{
 const invalid=await f.call('owner','/api/live/channels/channel/messages',{clientId:crypto.randomUUID(),text:'Private target',mentionIds:['stranger'],acknowledgeStandard:true});assert.equal(invalid.status,400);
 f.beforeCommit(()=>f.sqlite.prepare("DELETE FROM live_memberships WHERE community_id='room' AND account_id='bob'").run());
 const raced=await f.call('owner','/api/live/channels/channel/messages',{clientId:crypto.randomUUID(),text:'Departed target',mentionIds:['bob'],acknowledgeStandard:true});assert.equal(raced.status,403);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM live_messages').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM live_message_mentions').get().n,0);
}finally{f.sqlite.close();}});
test('full permitted community search accepts human usernames and link filtering',async()=>{const f=await fixture();try{
 await f.send('Review https://example.org/needle');const result=await f.ok('bob','/api/live/search?author=%40user_owner&has=links&q=needle');assert.equal(result.total,1);assert(result.messages[0].revision>0);assert.equal((await f.call('stranger','/api/live/communities/room/members?query=user_owner')).status,403);
}finally{f.sqlite.close();}});
test('twenty immutable mentions stay within the D1 parameter budget on send and edit',async()=>{const f=await fixture();try{
 const ids=Array.from({length:20},(_,i)=>'target'+i),now=Date.now();
 for(const id of ids){f.sqlite.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(id,'user_'+id,id,now,now);f.sqlite.prepare("INSERT INTO live_memberships(community_id,account_id,role,joined_at) VALUES('room',?,'member',?)").run(id,now);}
 const message=await f.send('Mentioned cohort',{mentionIds:ids});assert.equal(message.mention_ids.length,20);
 const edited=(await f.ok('owner','/api/live/messages/'+message.id+'/edit',{text:'Revised cohort',mentionIds:ids,acknowledgeStandard:true})).message;assert.equal(edited.mention_ids.length,20);assert(edited.revision>message.revision);
}finally{f.sqlite.close();}});
let failures=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}}console.log(`${cases.length-failures}/${cases.length} community correctness checks passed. Actual migrated SQLite, opaque sessions and deterministic races; no browser, production mutation or encryption-service claim.`);process.exitCode=failures?1:0;
