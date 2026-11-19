import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {authHash} from '../worker/auth.mjs';
import {createRealtimeService} from '../worker/realtime.mjs';
import {handleMessagesRequest} from '../worker/messages.mjs';
import {handleLiveRequest} from '../worker/index.mjs';
const origin='https://realtime.example',cases=[],test=(name,run)=>cases.push([name,run]),uuid=()=>crypto.randomUUID();
const turn=()=>new Promise(resolve=>setImmediate(resolve));
class Adapter{
 constructor(db){this.db=db;}
 prepare(sql){const db=this.db;return {bind(...args){const stmt=db.prepare(sql);return {first:async()=>stmt.get(...args)||null,all:async()=>({results:stmt.all(...args)}),run:async()=>{const before=db.prepare('SELECT total_changes() n').get().n;stmt.run(...args);return {meta:{changes:db.prepare('SELECT total_changes() n').get().n-before}};}};}};}
 async batch(statements){this.db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const e of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url))).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+e.tag+'.sql',import.meta.url),'utf8'));
 const env={DB:new Adapter(sqlite)},sessions=new Map();let time=Date.now(),waiters=[];
 for(const id of ['alice','bob','outsider']){const token=uuid().replaceAll('-','')+uuid().replaceAll('-',''),csrf=uuid().replaceAll('-','')+uuid().replaceAll('-',''),sessionId=uuid();sqlite.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(id,'stream_'+id,'Private name '+id,time,time);sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(sessionId,id,await authHash(token),await authHash(csrf),'Stream test',time,time,time,time+3600000);sessions.set(id,{token,csrf,sessionId});}
 sqlite.prepare("INSERT INTO social_requests(id,sender_id,recipient_id,state,created_at,updated_at) VALUES(?,'alice','bob','accepted',?,?)").run(uuid(),time,time);
 const wait=(_ms,signal)=>new Promise(resolve=>{const done=()=>{signal.removeEventListener('abort',done);waiters=waiters.filter(w=>w!==done);resolve();};waiters.push(done);signal.addEventListener('abort',done,{once:true});if(signal.aborted)done();});
 const handler=createRealtimeService({now:()=>time,pollMs:10,ttlMs:1000,heartbeatMs:30,wait});
 function request(id,path,body,extra={}){const user=sessions.get(id);return new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{...(user?{cookie:`__Host-voidline_session=${user.token}; __Host-voidline_csrf=${user.csrf}`}:{ }),...(body===undefined?{}:{origin,'content-type':'application/json','x-voidline-auth':'1','x-voidline-csrf':user.csrf}),...extra},...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:id,...body})})});}
 async function call(id,path,body){const r=await (path.startsWith('/api/messages')?handleMessagesRequest:handleLiveRequest)(request(id,path,body),env);const data=await r.json();assert(r.ok,JSON.stringify(data));return data;}
 async function open(id,query='',headers={}){const r=await handler(request(id,'/api/realtime'+query,undefined,headers),env);return {response:r,reader:r.ok?r.body.getReader():null};}
 async function tick(ms=10){time+=ms;for(const done of [...waiters])done();await turn();}
 async function dm(){return (await call('alice','/api/messages/conversations',{kind:'dm',usernames:['stream_bob'],clientId:uuid(),acknowledgeStandard:true})).conversation.id;}
 async function close(stream){await stream?.reader?.cancel();await turn();await turn();}
 return {sqlite,env,sessions,request,call,open,tick,dm,close};
}
async function frame(reader){let timer;try{const result=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Expected an SSE frame')),1000);})]);if(result.done)return null;const text=new TextDecoder().decode(result.value),event=/^event: (.+)$/m.exec(text)?.[1],data=JSON.parse(/^data: (.+)$/m.exec(text)?.[1]||'{}'),id=/^id: (.+)$/m.exec(text)?.[1];return {event,data,id,text};}finally{clearTimeout(timer);}}

test('anonymous, forged identity, cross-site and invalid resume requests cannot open streams',async()=>{const f=await fixture();try{
 assert.equal((await f.open(null,'',{'oai-authenticated-user-id':'alice'})).response.status,401);assert.equal((await f.open('alice','',{origin:'https://evil.example'})).response.status,403);assert.equal((await f.open('alice','',{'sec-fetch-site':'same-site'})).response.status,403);assert.equal((await f.open('alice','?after=-1')).response.status,400);assert.equal((await f.open('alice','?conversation='+uuid())).response.status,404);
}finally{f.sqlite.close();}});
test('fresh account streams have zero activity and expose only content-free revision hints',async()=>{const f=await fixture();let s;try{
 s=await f.open('outsider');assert.equal(s.response.headers.get('content-type'),'text/event-stream; charset=utf-8');assert.match(s.response.headers.get('cache-control'),/no-transform/);const hello=await frame(s.reader);assert.equal(hello.event,'hello');assert.equal(hello.data.accountRevision,0);assert.equal(hello.data.conversationRevision,0);assert.equal(hello.data.scope,'account');assert.equal(hello.text.includes('Private name'),false);assert.equal(hello.text.includes(f.sessions.get('outsider').token),false);
}finally{await f.close(s);f.sqlite.close();}});
test('native send, edit and delete commit monotonic hints while history stays behind authorized cursor APIs',async()=>{const f=await fixture();let s;try{
 const id=await f.dm();s=await f.open('bob','?conversation='+id+'&after=0');const hello=await frame(s.reader);assert.equal(hello.data.resumeRequired,true);const body={clientId:uuid(),text:'Sensitive fixture message',acknowledgeStandard:true};const sent=await f.call('alice','/api/messages/conversations/'+id+'/messages',body);await f.tick();const update=await frame(s.reader);assert.equal(update.event,'revision');assert(update.data.seq>hello.data.seq);assert.equal(update.id,String(update.data.seq));assert(update.data.conversationRevision>0);assert.equal(update.text.includes('Sensitive fixture'),false);
 const history=await f.call('bob','/api/messages/conversations/'+id+'/messages?after=0&changesAfter=0');assert.equal(history.messages[0].id,sent.message.id);assert.equal(history.messages[0].text,body.text);
 await f.call('alice','/api/messages/messages/'+sent.message.id+'/edit',{text:'Updated fixture',acknowledgeStandard:true});await f.tick();const edit=await frame(s.reader);assert(edit.data.seq>update.data.seq);await f.call('alice','/api/messages/messages/'+sent.message.id+'/delete',{});await f.tick();assert((await frame(s.reader)).data.seq>edit.data.seq);
}finally{await f.close(s);f.sqlite.close();}});
test('membership changes, suspension and session revocation terminate authorized streams',async()=>{
 for(const action of ['membership','suspension','revocation']){const f=await fixture();let s;try{const id=await f.dm();assert.equal((await f.open('outsider','?conversation='+id)).response.status,404);s=await f.open('bob','?conversation='+id);await frame(s.reader);
 if(action==='membership')f.sqlite.prepare("DELETE FROM native_members WHERE conversation_id=? AND account_id='bob'").run(id);if(action==='suspension')f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id='bob'").run();if(action==='revocation')f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),f.sessions.get('bob').sessionId);
 await f.tick();assert.equal((await frame(s.reader)).event,'restricted');assert.equal(await frame(s.reader),null);await turn();assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM realtime_streams').get().n,0);
 }finally{await f.close(s);f.sqlite.close();}}
});
test('community channels use current community membership and never disclose channel content in events',async()=>{const f=await fixture();let s;try{
 const created=await f.call('alice','/api/live/communities',{name:'Private fixture community'}),id=created.channel.id;assert.equal((await f.open('bob','?channel='+id)).response.status,404);s=await f.open('alice','?channel='+id);const hello=await frame(s.reader);assert.equal(hello.data.scope,'community');await f.call('alice','/api/live/channels/'+id+'/messages',{clientId:uuid(),text:'Sensitive community fixture',acknowledgeStandard:true});await f.tick();const update=await frame(s.reader);assert.equal(update.event,'revision');assert(update.data.conversationRevision>0);assert.equal(update.text.includes('Sensitive community'),false);assert.equal(update.text.includes('Private fixture community'),false);
}finally{await f.close(s);f.sqlite.close();}});
test('stream leases limit simultaneous tabs, disconnect cleans up, heartbeat and renewal stay bounded',async()=>{const f=await fixture();const streams=[];try{
 for(let n=0;n<5;n++){const s=await f.open('alice');streams.push(s);await frame(s.reader);}assert.equal((await f.open('alice')).response.status,429);await f.close(streams.pop());assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM realtime_streams').get().n,4);
 await f.tick(35);assert.equal((await frame(streams[0].reader)).event,'heartbeat');await frame(streams[1].reader);await f.tick(1000);assert.equal((await frame(streams[0].reader)).event,'renew');assert.equal(await frame(streams[0].reader),null);assert.equal((await frame(streams[1].reader)).event,'renew');await turn();assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM realtime_streams').get().n,0);
}finally{for(const s of streams)await f.close(s);f.sqlite.close();}});
test('a tab reconnecting under its own name replaces its lease instead of using up the account slots',async()=>{const f=await fixture(),tab=uuid(),streams=[];try{
 assert.equal((await f.open('alice','?client=not-a-tab-name')).response.status,400);
 for(let n=0;n<8;n++){const s=await f.open('alice','?client='+tab);assert.equal(s.response.status,200);streams.push(s);await frame(s.reader);await f.tick(10);}
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM realtime_streams').get().n,1);
 await f.tick(10);assert.equal(await frame(streams[0].reader),null,'a superseded stream ends and stops reading the database');
 for(let n=0;n<4;n++){const s=await f.open('alice','?client='+uuid());assert.equal(s.response.status,200);streams.push(s);await frame(s.reader);}
 assert.equal((await f.open('alice','?client='+uuid())).response.status,429,'other tabs still count toward the per-account limit');
 await f.tick(10);const again=await f.open('alice','?client='+tab);assert.equal(again.response.status,200,'a tab at the limit can still switch conversations');streams.push(again);
 const other=await f.open('bob','?client='+tab);assert.equal(other.response.status,200);streams.push(other);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM realtime_streams WHERE account_id='alice'").get().n,5,'another session reusing the name cannot replace this lease');
}finally{for(const s of streams)await f.close(s);f.sqlite.close();}});
let failed=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${cases.length-failed}/${cases.length} revision-stream checks passed. Actual migrated SQLite and ReadableStream frames with controlled clock/session fixtures; not hosted transport, browser or Matrix evidence.`);process.exitCode=failed?1:0;
