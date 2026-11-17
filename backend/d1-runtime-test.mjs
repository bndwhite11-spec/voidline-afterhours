// Actual workerd/D1 integration: SQLite direct-row counts are not D1 metadata.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {authHash} from '../worker/auth.mjs';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
const root=new URL('../',import.meta.url),origin='https://runtime.voidline.example',now=Date.now();
const compiled=await build({stdin:{contents:"import {handleMessagesRequest} from './worker/messages.mjs';import {handleLiveRequest} from './worker/index.mjs';import {createRealtimeService} from './worker/realtime.mjs';const realtime=createRealtimeService({pollMs:20,ttlMs:2000,heartbeatMs:200});export default {fetch(request,env){const path=new URL(request.url).pathname;return path==='/api/realtime'?realtime(request,env):path.startsWith('/api/messages')?handleMessagesRequest(request,env):handleLiveRequest(request,env);}}",resolveDir:root.pathname,loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false});
const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:{DB:'voidline-d1-runtime-regression'},d1Persist:false});
let failed=0,passed=0;
try{
 const db=await mf.getD1Database('DB');
 const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries;
 for(const entry of journal){const sql=readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();}
 const sessions=new Map();for(const id of ['alice','bob','outsider']){
  const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),csrf=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),sessionId=crypto.randomUUID();
  await db.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').bind(id,'runtime_'+id,id,now,now).run();
  await db.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(sessionId,id,await authHash(token),await authHash(csrf),'D1 runtime fixture',now,now,now,now+3600000).run();sessions.set(id,{token,csrf,sessionId});
 }
 await db.prepare("INSERT INTO social_requests(id,sender_id,recipient_id,state,created_at,updated_at) VALUES(?,'alice','bob','accepted',?,?)").bind(crypto.randomUUID(),now,now).run();
 async function call(user,path,body,expected=200){const session=sessions.get(user),headers={accept:'application/json',...(session?{cookie:`__Host-voidline_session=${session.token}; __Host-voidline_csrf=${session.csrf}`}:{})};if(body!==undefined)Object.assign(headers,{origin,'content-type':'application/json','x-voidline-auth':'1','x-voidline-csrf':session?.csrf||''});const response=await mf.dispatchFetch(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({...body,expectedAccountId:user})})}),data=await response.json();assert.equal(response.status,expected,`${path}: ${response.status} ${data.error?.code||''}`);return data;}
 async function test(name,run){try{await run();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.stack);}}
 await test('actual D1 trigger-inclusive metadata preserves guarded native leave acknowledgments',async()=>{
  // Confirm the actual binding's semantics using the shipped ownership trigger.
  const proof=crypto.randomUUID();await db.prepare("INSERT INTO native_conversations(id,kind,name,created_by,owner_id,client_id,request_hash,created_at,updated_at) VALUES(?,'group','Metadata proof','alice','alice',?,'proof',?,?)").bind(proof,crypto.randomUUID(),now,now).run();await db.prepare("INSERT INTO native_members(conversation_id,account_id,joined_at) VALUES(?,'alice',?)").bind(proof,now).run();
  const mutation=await db.prepare("DELETE FROM native_members WHERE conversation_id=? AND account_id='alice'").bind(proof).run();assert(mutation.meta.changes>1);assert.equal((await db.prepare('SELECT changes() AS n').first()).n,1);const rejected=await db.prepare("DELETE FROM native_members WHERE conversation_id=? AND account_id='outsider'").bind(proof).run();assert.equal(rejected.meta.changes,0);
  const created=await call('alice','/api/messages/conversations',{kind:'group',usernames:['runtime_bob'],name:'Runtime group',clientId:crypto.randomUUID(),acknowledgeStandard:true},201),id=created.conversation.id,route='/api/messages/conversations/'+id;
  await call('alice',route+'/leave',{},409);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM native_members WHERE conversation_id=?').bind(id).first()).n,2);
  await call('outsider',route+'/leave',{},404);await call('alice',route+'/transfer',{accountId:'bob'});await call('alice',route+'/leave',{});
  const sent=(await call('bob',route+'/messages',{clientId:crypto.randomUUID(),text:'Isolated runtime message',acknowledgeStandard:true},201)).message;assert(sent.revision>0);await call('bob','/api/messages/messages/'+sent.id+'/delete',{});
  const left=await call('bob',route+'/leave',{});assert.equal(left.left,true);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM native_members WHERE conversation_id=?').bind(id).first()).n,0);assert.equal((await db.prepare('SELECT owner_id FROM native_conversations WHERE id=?').bind(id).first()).owner_id,null);await call('bob',route,undefined,404);
 });
 await test('actual D1 community transfer keeps one owner and an audit despite trigger side effects',async()=>{
  const created=await call('alice','/api/live/communities',{name:'Runtime community'},201),id=created.community.id,channel=created.channel.id,route='/api/live/communities/'+id;
  const invite=(await call('alice',route+'/invites',{maxUses:2,expiresInHours:1},201)).invite;await call('bob','/api/live/invites/claim',{token:invite.token});
  await call('outsider',route+'/transfer',{accountId:'bob'},403);const transferred=await call('alice',route+'/transfer',{accountId:'bob'});assert.equal(transferred.transferred,true);
  const current=await db.prepare('SELECT created_by,ownership_revision FROM live_communities WHERE id=?').bind(id).first();assert.equal(current.created_by,'bob');assert.equal(current.ownership_revision,1);const owners=await db.prepare("SELECT account_id FROM live_memberships WHERE community_id=? AND role='owner'").bind(id).all();assert.deepEqual(owners.results.map(row=>row.account_id),['bob']);assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE action='community.ownership.transfer' AND target_id='bob'").first()).n,1);
  await call('alice',route+'/transfer',{accountId:'bob'},403);
  const sent=(await call('bob','/api/live/channels/'+channel+'/messages',{clientId:crypto.randomUUID(),text:'Runtime community text',acknowledgeStandard:true})).message;await call('alice','/api/live/messages/'+sent.id+'/reaction',{emoji:'👍',active:true,acknowledgeStandard:true});await call('bob','/api/live/messages/'+sent.id+'/edit',{text:'Edited runtime community text',mentionIds:[],acknowledgeStandard:true});const edited=(await call('alice','/api/live/messages/'+sent.id)).message;assert(edited.revision>sent.revision);await call('bob','/api/live/messages/'+sent.id+'/delete',{acknowledgeStandard:true});assert((await call('alice','/api/live/messages/'+sent.id)).message.deleted_at);
 });
 await test('actual workerd streams revision frames after D1 commit and closes on native session revocation',async()=>{
  const conversation=(await call('alice','/api/messages/conversations',{kind:'dm',usernames:['runtime_bob'],clientId:crypto.randomUUID(),acknowledgeStandard:true},201)).conversation.id,session=sessions.get('bob');
  const response=await mf.dispatchFetch(origin+'/api/realtime?conversation='+conversation,{headers:{cookie:'__Host-voidline_session='+session.token}});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/event-stream/);const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
  async function next(){let timer;try{return await Promise.race([(async()=>{for(;;){const end=pending.indexOf('\n\n');if(end>=0){const raw=pending.slice(0,end);pending=pending.slice(end+2);return {event:/^event: (.+)$/m.exec(raw)?.[1],data:JSON.parse(/^data: (.+)$/m.exec(raw)?.[1]||'{}'),raw};}const chunk=await reader.read();if(chunk.done)return null;pending+=decoder.decode(chunk.value,{stream:true});}})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('No workerd streaming frame')),3000);})]);}finally{clearTimeout(timer);}}
  try{const hello=await next();assert.equal(hello.event,'hello');const message=await call('alice','/api/messages/conversations/'+conversation+'/messages',{clientId:crypto.randomUUID(),text:'Runtime SSE private fixture',acknowledgeStandard:true},201);let update;do{update=await next();}while(update?.event==='heartbeat');assert.equal(update.event,'revision');assert(update.data.accountRevision>hello.data.accountRevision);assert.equal(update.raw.includes('Runtime SSE private fixture'),false);await call('alice','/api/messages/messages/'+message.message.id+'/delete',{});await db.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').bind(Date.now(),session.sessionId).run();let restricted;do{restricted=await next();}while(restricted&&['heartbeat','revision'].includes(restricted.event));assert.equal(restricted.event,'restricted');assert.equal(await next(),null);
  }finally{await reader.cancel();}
 });
}catch(error){failed++;console.error('FAIL actual D1 runtime setup',error.stack);}finally{await mf.dispose();}
console.log(`${passed}/3 workerd/D1 integration checks passed. Actual runtime, migrations and handlers; isolated session fixtures, not a browser, production or Matrix exchange.`);process.exitCode=failed?1:0;
