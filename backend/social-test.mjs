import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleAuthRequest} from '../worker/auth.mjs';
import {handleSocialRequest} from '../worker/social.mjs';

const origin='https://social-test.example';
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url)));
 for(const entry of journal.entries)sqlite.exec(readFileSync(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),'utf8'));
 const adapter={prepare(sql){return {bind(...values){const stmt=sqlite.prepare(sql);return {first:async()=>stmt.get(...values)||null,all:async()=>({results:stmt.all(...values)}),run:async()=>{adapter.beforeWrite?.(sql,values);return {success:true,meta:{changes:stmt.run(...values).changes}};}};}};},async batch(statements){sqlite.exec('BEGIN');try{const values=[];for(const statement of statements)values.push(await statement.run());sqlite.exec('COMMIT');return values;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 return {sqlite,db:adapter,env:{DB:adapter,VOIDLINE_ORIGIN:origin}};
}
async function fixture(){
 const f=database(),accounts={};
 for(const name of ['alice','bobby','claire']){
  const response=await handleAuthRequest(new Request(origin+'/api/auth/register',{method:'POST',headers:{origin,'content-type':'application/json','x-voidline-auth':'1'},body:JSON.stringify({username:'social_'+name,displayName:name,password:'social-private-October-2026!'})}),f.env);
  const data=await response.json();assert.equal(response.status,201,JSON.stringify(data));
  accounts[name]={id:data.account.id,csrf:data.csrfToken,cookie:response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')};
 }
 const call=async(name,path='',body,options={})=>{
  const account=accounts[name],headers={cookie:account.cookie,...(body===undefined?{}:{origin,'content-type':'application/json','x-voidline-csrf':account.csrf}),...options.headers};
  const response=await handleSocialRequest(new Request(origin+'/api/social'+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:account.id,...body})})}),f.env);
  return {status:response.status,data:await response.json()};
 };
 const ok=async(...args)=>{const r=await call(...args);assert.ok(r.status>=200&&r.status<300,JSON.stringify(r));return r.data;};
 return {...f,accounts,call,ok,async close(){f.sqlite.close();}};
}
const tests=[];const test=(name,run)=>tests.push([name,run]);
test('fresh registered accounts have no friends, requests, blocks or invented activity',async()=>{
 const f=await fixture();try{const list=await f.ok('alice');assert.deepEqual(list.friends,[]);assert.deepEqual(list.incoming,[]);assert.deepEqual(list.outgoing,[]);assert.deepEqual(list.blocked,[]);assert.deepEqual(list.counts,{friends:0,incoming:0,outgoing:0,blocked:0});assert.equal(list.settings.allowRequests,true);}finally{await f.close();}
});
test('sending an exact username request is idempotent and does not auto-accept a reverse request',async()=>{
 const f=await fixture();try{const first=await f.ok('alice','/request',{username:'social_bobby'}),again=await f.ok('alice','/request',{username:'SOCIAL_BOBBY'}),reverse=await f.ok('bobby','/request',{username:'social_alice'});assert.equal(again.request.id,first.request.id);assert.equal(reverse.request.id,first.request.id);assert.equal(reverse.request.direction,'incoming');assert.equal((await f.ok('alice')).friends.length,0);assert.equal((await f.ok('bobby')).incoming.length,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM social_requests').get().n,1);}finally{await f.close();}
});
test('only the recipient can accept; acceptance creates one friendship visible to both accounts',async()=>{
 const f=await fixture();try{const first=await f.ok('alice','/request',{username:'social_bobby'}),path=`/requests/${first.request.id}/respond`;assert.equal((await f.call('claire',path,{accept:true})).status,404);assert.equal((await f.call('alice',path,{accept:true})).status,404);await f.ok('bobby',path,{accept:true});await f.ok('bobby',path,{accept:true});assert.equal((await f.ok('alice')).friends[0].accountId,f.accounts.bobby.id);assert.equal((await f.ok('bobby')).friends[0].accountId,f.accounts.alice.id);assert.equal((await f.ok('claire')).friends.length,0);}finally{await f.close();}
});
test('uploaded friend avatars use the protected static representation and never expose pictures to unrelated requests or blocks',async()=>{
 const f=await fixture();try{
  const actor=f.accounts.alice.id,id='d'.repeat(64),now=Date.now();
  f.sqlite.prepare("INSERT INTO media_assets(id,owner_id,client_id,object_key,sha256,kind,content_type,filename,bytes,width,height,state,created_at,updated_at) VALUES(?,?,?,?,?,'avatar','image/gif','avatar.gif',64,8,8,'ready',?,?)").run(id,actor,crypto.randomUUID(),'v1/'+id,'f'.repeat(64),now,now);
  f.sqlite.prepare("INSERT INTO profile_preferences(account_id,avatar_media_id,details_visibility,updated_at) VALUES(?,?,'private',?)").run(actor,id,now);
  await f.ok('claire','/request',{username:'social_alice'});assert.equal((await f.ok('claire')).outgoing[0].avatarMedia,null);
  const r=await f.ok('bobby','/request',{username:'social_alice'});await f.ok('alice','/requests/'+r.request.id+'/respond',{accept:true});
  const picture=(await f.ok('bobby')).friends[0].avatarMedia;assert.equal(picture.id,id);assert.equal(picture.url,'/api/media/'+id);assert.equal(picture.posterUrl,picture.url);assert.equal(picture.animationUrl,picture.url+'/animation');assert.equal(picture.isGif,true);assert.deepEqual(Object.keys(picture).sort(),['animationUrl','id','isGif','posterUrl','url']);
  await f.ok('bobby','/blocks',{accountId:actor,active:true});assert.equal((await f.ok('bobby')).friends.length,0);assert.equal((await f.ok('bobby')).blocked[0].avatarMedia,undefined);
 }finally{await f.close();}
});
test('simultaneous opposite requests create one pending relationship with a truthful incoming response',async()=>{
 const f=await fixture();try{const responses=await Promise.all([f.ok('alice','/request',{username:'social_bobby'}),f.ok('bobby','/request',{username:'social_alice'})]);assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM social_requests WHERE state='pending'").get().n,1);assert.equal(responses[0].request.id,responses[1].request.id);assert.equal(responses.filter(r=>r.request.direction==='incoming').length,1);assert.equal((await f.ok('alice')).friends.length,0);}finally{await f.close();}
});
test('cancelling a request after it was accepted does not claim the friendship was cancelled',async()=>{
 const f=await fixture();try{const request=await f.ok('alice','/request',{username:'social_bobby'});await f.ok('bobby',`/requests/${request.request.id}/respond`,{accept:true});assert.equal((await f.call('alice',`/requests/${request.request.id}/cancel`,{})).status,409);assert.equal((await f.ok('alice')).friends.length,1);}finally{await f.close();}
});
test('cancel and decline preserve ownership and remove requests without creating friendship',async()=>{
 const f=await fixture();try{const first=await f.ok('alice','/request',{username:'social_bobby'});assert.equal((await f.call('bobby',`/requests/${first.request.id}/cancel`,{})).status,404);await f.ok('alice',`/requests/${first.request.id}/cancel`,{});assert.equal((await f.ok('bobby')).incoming.length,0);const second=await f.ok('alice','/request',{username:'social_bobby'});await f.ok('bobby',`/requests/${second.request.id}/respond`,{accept:false});assert.equal((await f.ok('alice')).outgoing.length,0);assert.equal((await f.ok('alice')).friends.length,0);}finally{await f.close();}
});
test('blocking removes friendship and cancels requests; blocked and missing usernames have the same response',async()=>{
 const f=await fixture();try{const first=await f.ok('alice','/request',{username:'social_bobby'});await f.ok('bobby',`/requests/${first.request.id}/respond`,{accept:true});await f.ok('bobby','/blocks',{accountId:f.accounts.alice.id,active:true});assert.equal((await f.ok('alice')).friends.length,0);assert.equal((await f.ok('bobby')).friends.length,0);const denied=await f.call('alice','/request',{username:'social_bobby'}),missing=await f.call('alice','/request',{username:'missing_person'});assert.equal(denied.status,missing.status);assert.deepEqual(denied.data,missing.data);assert.equal((await f.ok('bobby')).blocked[0].accountId,f.accounts.alice.id);assert.equal((await f.ok('alice')).blocked.length,0);await f.ok('bobby','/blocks',{accountId:f.accounts.alice.id,active:false});assert.equal((await f.ok('bobby')).friends.length,0);await f.ok('alice','/request',{username:'social_bobby'});assert.equal((await f.ok('bobby')).incoming.length,1);}finally{await f.close();}
});
test('private request preferences apply on the server and persist across reads',async()=>{
 const f=await fixture();try{await f.ok('bobby','/settings',{allowRequests:false});assert.equal((await f.ok('bobby')).settings.allowRequests,false);assert.equal((await f.call('alice','/request',{username:'social_bobby'})).status,404);await f.ok('bobby','/settings',{allowRequests:true});await f.ok('alice','/request',{username:'social_bobby'});assert.equal((await f.ok('bobby')).incoming.length,1);}finally{await f.close();}
});
test('origin, CSRF and expected-account checks protect every social mutation',async()=>{
 const f=await fixture();try{const payload={username:'social_bobby'};assert.equal((await f.call('alice','/request',payload,{headers:{origin:'https://other.example'}})).status,403);assert.equal((await f.call('alice','/request',payload,{headers:{'x-voidline-csrf':'bad'}})).status,403);assert.equal((await f.call('alice','/request',{...payload,expectedAccountId:f.accounts.bobby.id})).status,409);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM social_requests').get().n,0);}finally{await f.close();}
});
test('removal is account-scoped and pagination counts the correct private lists',async()=>{
 const f=await fixture();try{for(const name of ['bobby','claire']){const r=await f.ok('alice','/request',{username:'social_'+name});await f.ok(name,`/requests/${r.request.id}/respond`,{accept:true});}const first=await f.ok('alice','?limit=1&offset=0'),second=await f.ok('alice','?limit=1&offset=1');assert.equal(first.counts.friends,2);assert.equal(first.friends.length,1);assert.notEqual(first.friends[0].accountId,second.friends[0].accountId);await f.ok('claire',`/friends/${f.accounts.bobby.id}/remove`,{});assert.equal((await f.ok('alice')).friends.length,2);await f.ok('alice',`/friends/${f.accounts.bobby.id}/remove`,{});assert.equal((await f.ok('alice')).friends.length,1);assert.equal((await f.ok('bobby')).friends.length,0);}finally{await f.close();}
});
test('preauthenticated settings, requests and blocks cannot write after actor suspension, deletion, revocation or expiry',async()=>{
 for(const change of ['suspended','deleted','revoked','expired'])for(const action of ['settings','request','blocks']){
  const f=await fixture();try{
   const id=f.accounts.alice.id,table=action==='settings'?'social_settings':action==='request'?'social_requests':'social_blocks';let injected=false;
   f.db.beforeWrite=sql=>{if(injected||!sql.startsWith('INSERT')||!sql.includes('INTO '+table+'('))return;injected=true;
    if(change==='revoked')f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=1 WHERE account_id=?').run(id);
    else if(change==='expired')f.sqlite.prepare('UPDATE auth_sessions SET expires_at=1 WHERE account_id=?').run(id);
    else f.sqlite.prepare("UPDATE live_accounts SET account_status=?,username=CASE WHEN ?='deleted' THEN NULL ELSE username END WHERE id=?").run(change,change,id);
   };
   const body=action==='settings'?{allowRequests:false}:action==='request'?{username:'social_bobby'}:{accountId:f.accounts.bobby.id,active:true};
   const result=await f.call('alice','/'+action,body);assert.ok(injected,action+' did not reach the mutation');assert.equal(result.status,409,`${change} ${action}: ${JSON.stringify(result.data)}`);
   for(const name of ['social_settings','social_requests','social_blocks'])assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM '+name).get().n,0,`${change} ${action} recreated ${name}`);
  }finally{await f.close();}
 }
});
test('suspended or deleted targets cannot receive an in-flight friend request or new block',async()=>{
 for(const status of ['suspended','deleted'])for(const action of ['request','blocks']){
  const f=await fixture();try{
   let injected=false;const table=action==='request'?'social_requests':'social_blocks';
   f.db.beforeWrite=sql=>{if(injected||!sql.startsWith('INSERT')||!sql.includes('INTO '+table+'('))return;injected=true;f.sqlite.prepare("UPDATE live_accounts SET account_status=?,username=CASE WHEN ?='deleted' THEN NULL ELSE username END WHERE id=?").run(status,status,f.accounts.bobby.id);};
   const body=action==='request'?{username:'social_bobby'}:{accountId:f.accounts.bobby.id,active:true},result=await f.call('alice','/'+action,body);
   assert.ok(injected);assert.equal(result.status,404,`${status} ${action}: ${JSON.stringify(result.data)}`);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);
  }finally{await f.close();}
 }
});
test('a stale block cannot cancel an existing request and a suspended sender cannot gain an accepted friendship',async()=>{
 for(const action of ['block','accept']){
  const f=await fixture();try{
   const sent=await f.ok('alice','/request',{username:'social_bobby'});let injected=false;
   f.db.beforeWrite=sql=>{if(injected||!(action==='block'?sql.startsWith('INSERT OR IGNORE INTO social_blocks'):sql.startsWith('UPDATE social_requests AS r')))return;injected=true;f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id=?").run(f.accounts[action==='block'?'bobby':'alice'].id);};
   const result=action==='block'?await f.call('alice','/blocks',{accountId:f.accounts.bobby.id,active:true}):await f.call('bobby','/requests/'+sent.request.id+'/respond',{accept:true});
   assert.ok(injected);assert.equal(result.status,404);assert.equal(f.sqlite.prepare('SELECT state FROM social_requests WHERE id=?').get(sent.request.id).state,'pending');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM social_blocks').get().n,0);
  }finally{await f.close();}
 }
});
let failures=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}}
console.log(`${tests.length-failures}/${tests.length} native social checks passed. Isolated registered accounts and actual SQLite, no contacts or real user accounts.`);process.exitCode=failures?1:0;
