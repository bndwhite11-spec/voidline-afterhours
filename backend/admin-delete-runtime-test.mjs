/** Actual isolated workerd/D1 checks for privileged deletion and commit guards. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {authHash} from '../worker/auth.mjs';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
const origin='https://admin-runtime.voidline.example',now=Date.now();
const compiled=await build({stdin:{contents:`
import {handleAdminRequest} from './worker/admin.mjs';
import {handleAuthRequest} from './worker/auth.mjs';
export default {fetch(request,env){
 if(request.headers.get('x-fixture-revoke-before-batch')==='1'){
  const database=env.DB;let intercepted=false;
  env={...env,DB:{prepare:sql=>database.prepare(sql),batch:async statements=>{
   if(!intercepted){intercepted=true;await database.prepare("UPDATE auth_sessions SET revoked_at=1 WHERE account_id='owner'").run();}
   return database.batch(statements);
  }}};
 }
 return new URL(request.url).pathname.startsWith('/api/auth/')?handleAuthRequest(request,env):handleAdminRequest(request,env);
}};`,resolveDir:new URL('../',import.meta.url).pathname,loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,minify:true});
const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:{DB:'voidline-owner-delete-runtime'},d1Persist:false});
let passed=0,failed=0;
async function test(name,run){try{await run();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.stack);}}
try{
 const db=await mf.getD1Database('DB'),sessions=new Map();
 for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries)for(const statement of readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 for(const id of ['owner','target','survivor']){
  const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),csrf=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),sessionId=crypto.randomUUID();
  await db.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').bind(id,'runtime_'+id,id,now,now).run();
  await db.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,mfa_verified_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(sessionId,id,await authHash(token),await authHash(csrf),'Isolated runtime proof fixture',now,now,now,now,now+3600000).run();sessions.set(id,{token,csrf,sessionId});
 }
 await db.prepare('INSERT INTO platform_owner(id,account_id,bound_at,binding_session_id) VALUES(1,?,?,?)').bind('owner',now,sessions.get('owner').sessionId).run();
 async function call(actor,path,body,expected=200,extra={}){
  const session=sessions.get(actor),headers={accept:'application/json',...(session?{cookie:'__Host-voidline_session='+session.token}:{})};
  if(body!==undefined)Object.assign(headers,{origin,'content-type':'application/json','x-voidline-auth':'1','x-voidline-csrf':session?.csrf||''});Object.assign(headers,extra);
  const response=await mf.dispatchFetch(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({...body,expectedAccountId:actor})})}),data=await response.json();assert.equal(response.status,expected,path+' '+response.status+' '+(data.error?.code||''));return data;
 }
 await test('actual D1 owner deletion preserves history and group succession while acknowledging exactly one receipt',async()=>{
  await db.prepare("INSERT INTO native_conversations(id,kind,name,created_by,owner_id,client_id,request_hash,created_at,updated_at) VALUES('group','group','Runtime retained group','target','target','fixture-group','hash',?,?)").bind(now,now).run();
  await db.prepare("INSERT INTO native_members(conversation_id,account_id,joined_at) VALUES('group','target',?),('group','survivor',?)").bind(now,now+1).run();
  await db.prepare("INSERT INTO native_messages(id,conversation_id,author_id,client_id,text,original_hash,created_at) VALUES('message','group','target','fixture-send','Isolated retained runtime history','hash',?)").bind(now).run();
  await db.prepare("INSERT INTO media_assets(id,owner_id,client_id,object_key,sha256,kind,content_type,bytes,state,created_at,updated_at) VALUES('avatar','target','fixture-avatar','isolated-avatar',?,'avatar','image/png',128,'ready',?,?)").bind('a'.repeat(64),now,now).run();
  await db.prepare("INSERT INTO profile_preferences(account_id,avatar_media_id,updated_at) VALUES('target','avatar',?)").bind(now).run();
  await db.prepare("INSERT INTO matrix_account_links(account_id,matrix_user_id,matrix_subject,homeserver_origin,verified_at,created_at) VALUES('target','@fixture:matrix.example','fixture','https://matrix.example',?,?)").bind(now,now).run();
  const payload={confirmAccountId:'target',reason:'Reviewed isolated runtime deletion',clientId:crypto.randomUUID()};
  await call('survivor','/api/admin/users/target/delete',payload,403);const first=await call('owner','/api/admin/users/target/delete',payload);assert.equal(first.deleted,true);assert.equal(first.replayed,false);assert.equal((await call('owner','/api/admin/users/target/delete',payload)).replayed,true);await call('target','/api/auth/session',undefined,401);
  assert.equal((await db.prepare("SELECT account_status FROM live_accounts WHERE id='target'").first()).account_status,'deleted');assert.equal((await db.prepare("SELECT owner_id FROM native_conversations WHERE id='group'").first()).owner_id,'survivor');assert.equal((await db.prepare("SELECT text FROM native_messages WHERE id='message'").first()).text,'Isolated retained runtime history');assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM admin_audit').first()).n,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM matrix_policy_operations').first()).n,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM media_cleanup').first()).n,1);assert.equal((await db.prepare("SELECT state FROM media_assets WHERE id='avatar'").first()).state,'deleting');assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 });
 await test('actual D1 checks owner revocation at commit before status, audit or remote policy effects',async()=>{
  const result=await call('owner','/api/admin/users/survivor/status',{status:'suspended',reason:'A revoked owner request must fail'},401,{'x-fixture-revoke-before-batch':'1'});assert.equal(result.error.code,'sign_in_required');assert.equal((await db.prepare("SELECT account_status FROM live_accounts WHERE id='survivor'").first()).account_status,'active');assert.equal((await db.prepare("SELECT revoked_at FROM auth_sessions WHERE account_id='survivor'").first()).revoked_at,null);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM admin_audit').first()).n,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM matrix_policy_operations').first()).n,1);
 });
}catch(error){failed++;console.error('FAIL owner deletion runtime setup',error.stack);}finally{await mf.dispose();}
console.log(`${passed}/${passed+failed} owner deletion workerd/D1 checks passed. Actual isolated runtime, schema and handlers with synthetic owner/passkey proof; no production owner action or real authenticator claim.`);process.exitCode=failed?1:0;
