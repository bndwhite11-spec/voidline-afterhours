/** Actual isolated workerd/D1 confirmation of new grouping and revision triggers. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {authHash} from '../worker/auth.mjs';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
const origin='https://groups-runtime.example',root=new URL('../',import.meta.url),now=Date.now();
const compiled=await build({stdin:{contents:"import{handleGiftCollectionsRequest}from'./worker/gift-collections.mjs';import{handleCosmeticsRequest}from'./worker/cosmetics.mjs';export default{fetch(r,e){return new URL(r.url).pathname.startsWith('/api/gift-collections')?handleGiftCollectionsRequest(r,e):handleCosmeticsRequest(r,e)}}",resolveDir:root.pathname,loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false});
const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:{DB:'named-gift-collections-runtime'},d1Persist:false});
let failed=0,passed=0;
try{
 const db=await mf.getD1Database('DB');for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries){const text=readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');for(const sql of text.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();}
 const sessions=new Map();for(const id of ['alice','bob']){const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),csrf=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),sessionId=crypto.randomUUID();await db.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').bind(id,id,id,now,now).run();await db.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(sessionId,id,await authHash(token),await authHash(csrf),'Isolated group runtime',now,now,now,now+3600000).run();sessions.set(id,{token,csrf,sessionId});}
 async function call(id,path,body,expected=200){const s=sessions.get(id),headers={...(s?{cookie:'__Host-voidline_session='+s.token}:{}),...(body===undefined?{}:{origin,'content-type':'application/json','x-voidline-csrf':s?.csrf||''})};const response=await mf.dispatchFetch(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:id,...body})})}),data=await response.json();assert.equal(response.status,expected,path+': '+JSON.stringify(data));return data;}
 async function test(name,run){try{await run();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.stack);}}
 await test('actual D1 multi-group ownership, transfer-trigger cleanup and cascading group delete remain correct',async()=>{
  const instance=crypto.randomUUID();await db.prepare("INSERT INTO gift_instances(id,catalog_id,owner_id,origin_kind,created_at) VALUES(?,'gift-rose','alice','claim',?)").bind(instance,now).run();
  const ids=[];for(const name of ['One','Two']){const group=(await call('alice','/api/gift-collections',{name,clientId:crypto.randomUUID()},201)).collection;ids.push(group.id);const saved=await call('alice','/api/gift-collections/'+group.id+'/items',{instanceId:instance,included:true,expectedRevision:0});assert.equal(saved.collection.count,1);}
  const mutation=await db.prepare("UPDATE gift_instances SET owner_id='bob' WHERE id=?").bind(instance).run();assert(mutation.meta.changes>1);assert.equal((await db.prepare('SELECT changes() n').first()).n,1);for(const id of ids){const group=await call('alice','/api/gift-collections/'+id);assert.equal(group.instances.length,0);assert.equal(group.collection.revision,2);await call('bob','/api/gift-collections/'+id,undefined,404);}
  const bob=(await call('bob','/api/gift-collections',{name:'Mine',clientId:crypto.randomUUID()},201)).collection;const saved=await call('bob','/api/gift-collections/'+bob.id+'/items',{instanceId:instance,included:true,expectedRevision:0});const removed=await call('bob','/api/gift-collections/'+bob.id+'/delete',{expectedRevision:saved.collection.revision});assert.equal(removed.giftsPreserved,true);assert.equal((await db.prepare('SELECT owner_id FROM gift_instances WHERE id=?').bind(instance).first()).owner_id,'bob');assert.equal((await db.prepare('SELECT COUNT(*) n FROM gift_collection_items').first()).n,0);
 });
 await test('actual D1 revision-trigger side effects do not falsely reject an owned cosmetic equip',async()=>{
  await call('alice','/api/cosmetics/claim',{cosmeticId:'angel'});const saved=await call('alice','/api/cosmetics/equip',{cosmeticId:'angel'});assert.equal(saved.equippedId,'angel');const revision=await db.prepare("SELECT revision,write_token FROM profile_save_state WHERE account_id='alice'").first();assert(revision.revision>0);const removed=await call('alice','/api/cosmetics/equip',{cosmeticId:null});assert.equal(removed.equippedId,null);assert((await db.prepare("SELECT revision FROM profile_save_state WHERE account_id='alice'").first()).revision>revision.revision);
 });
}catch(error){failed++;console.error('FAIL grouping runtime setup',error.stack);}finally{await mf.dispose();}
console.log(`${passed}/2 workerd/D1 gift-group checks passed. Actual isolated migrations, trigger metadata and HTTP handlers; not hosted or browser evidence.`);process.exitCode=failed?1:0;
