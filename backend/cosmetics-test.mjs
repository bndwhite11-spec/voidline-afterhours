import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleCosmeticsRequest, COSMETICS} from '../worker/cosmetics.mjs';
import {authHash} from '../worker/auth.mjs';

const origin='https://cosmetics.example',tests=[];const test=(name,fn)=>tests.push([name,fn]);
class Adapter{
 constructor(sqlite){this.sqlite=sqlite;this.fail='';this.queue=Promise.resolve();}
 prepare(sql){const adapter=this;return {bind(...values){return {
  first:async()=>{if(adapter.fail&&sql.includes(adapter.fail))throw Error('Injected database failure');return adapter.sqlite.prepare(sql).get(...values)||null;},
  all:async()=>({results:adapter.sqlite.prepare(sql).all(...values)}),
  run:async()=>{adapter.beforeWrite?.(sql);if(adapter.fail&&sql.includes(adapter.fail))throw Error('Injected database failure');return {success:true,meta:{changes:adapter.sqlite.prepare(sql).run(...values).changes}};}
 };}};}
 batch(statements){const operation=this.queue.then(async()=>{this.sqlite.exec('BEGIN');try{const values=[];for(const statement of statements)values.push(await statement.run());this.sqlite.exec('COMMIT');return values;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}});this.queue=operation.catch(()=>{});return operation;}
}
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
 for(const entry of journal.entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 const db=new Adapter(sqlite),env={DB:db},identities=new Map();
 for(const id of ['sender','recipient','stranger']){
  const token='1'.repeat(32)+crypto.randomUUID().replaceAll('-',''),csrf='2'.repeat(32)+crypto.randomUUID().replaceAll('-',''),now=Date.now();
  sqlite.prepare('INSERT INTO live_accounts(id,display_name,email,username,onboarding_complete,created_at,updated_at) VALUES(?,?,?,?,1,?,?)').run(id,'Resident '+id,'',id,now,now);
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),id,await authHash(token),await authHash(csrf),'Isolated test device',now,now,now,now+60000);
  identities.set(id,{token,csrf});
 }
 async function call(id,path,body,extra={}){
  const identity=identities.get(id),headers={...(identity?{cookie:'__Host-voidline_session='+identity.token}:{}),...extra};
  if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-csrf':identity?.csrf||'',...extra});
  const request=new Request(origin+'/api/cosmetics'+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:id,...body})})});
  const response=await handleCosmeticsRequest(request,env);return {status:response.status,data:await response.json()};
 }
 async function ok(id,path,body){const r=await call(id,path,body);assert.ok(r.status>=200&&r.status<300,`${path}: ${r.status} ${JSON.stringify(r.data)}`);return r.data;}
 const gift=async(clientId='gift-client-0001',username='recipient',catalogId='gift-rose')=>ok('sender','/gifts',{username,catalogId,clientId});
 return {sqlite,db,call,ok,gift,identities};
}

test('new accounts have zero owned items and every listed cosmetic is explicitly free',async()=>{
 const f=await fixture();try{
  const inventory=await f.ok('sender','/inventory');assert.deepEqual(inventory.owned,[]);assert.equal(inventory.equippedId,null);assert.equal(inventory.pendingGifts,0);
  const catalog=await f.ok('sender','/catalog');assert.equal(catalog.free,true);assert.equal(catalog.items.length,33);assert.ok(catalog.items.every(i=>i.price===0));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_ownership').get().n,0);
  assert.equal((await f.call(undefined,'/inventory')).status,401);
 }finally{f.sqlite.close();}
});
test('crypto and internet series stay free decorations with authoritative ownership and no privileges',async()=>{
 const f=await fixture();try{
  const items=(await f.ok('sender','/catalog')).items;
  assert.equal(new Set(items.map(item=>item.id)).size,33);
  assert.deepEqual(Object.fromEntries(['originals','crypto','memes','gifts'].map(category=>[category,items.filter(item=>item.category===category).length])),{originals:9,crypto:6,memes:6,gifts:12});
  const added=items.filter(item=>['crypto','memes'].includes(item.category));
  for(const item of added){
   assert.equal(item.type,'badge');assert.equal(item.price,0);assert.ok(item.series.length>0);
   if(item.category==='crypto'){assert.match(item.acquisition,/No coins, wallet holdings or official affiliation/);assert.ok(item.inspiration.length>0);}
   assert.equal((await f.call('stranger','/equip',{cosmeticId:item.id})).status,403);
   await f.ok('sender','/claim',{cosmeticId:item.id});await f.ok('sender','/claim',{cosmeticId:item.id});
   assert.equal((await f.ok('sender','/equip',{cosmeticId:item.id,role:'owner',walletBalance:1000000})).equippedId,item.id);
  }
  assert.equal((await f.ok('sender','/inventory')).owned.length,12);
  assert.equal((await f.ok('stranger','/inventory')).owned.length,0);
  for(const table of ['badge_awards','live_memberships','platform_owner','gift_instances'])assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);
 }finally{f.sqlite.close();}
});
test('claiming is idempotent and equipping requires server-owned badge records',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('sender','/equip',{cosmeticId:'angel'})).status,403);
  await f.ok('sender','/claim',{cosmeticId:'angel'});await f.ok('sender','/claim',{cosmeticId:'angel'});
  const equipped=await f.ok('sender','/equip',{cosmeticId:'angel',role:'owner'});assert.equal(equipped.equippedId,'angel');assert.equal(equipped.owned.length,1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_memberships').get().n,0);
  assert.equal((await f.call('stranger','/equip',{cosmeticId:'angel'})).status,403);
  await f.ok('sender','/claim',{cosmeticId:'gift-star'});assert.equal((await f.call('sender','/equip',{cosmeticId:'gift-star'})).status,400);
  assert.equal((await f.ok('sender','/equip',{cosmeticId:null})).equippedId,null);
 }finally{f.sqlite.close();}
});
test('gifts create real recipient requests and stable retries cannot send duplicates',async()=>{
 const f=await fixture();try{
  const a=await f.gift(),b=await f.gift();assert.equal(a.gift.id,b.gift.id);assert.equal(a.acknowledged,true);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_gifts').get().n,1);
  assert.equal((await f.ok('recipient','/inventory')).pendingGifts,1);
  assert.equal((await f.ok('sender','/inventory')).pendingGifts,0);
  assert.equal((await f.ok('recipient','/gifts')).gifts[0].sender_username,'sender');
  assert.equal((await f.ok('stranger','/gifts')).gifts.length,0);
  assert.equal((await f.call('sender','/gifts',{username:'recipient',catalogId:'gift-star',clientId:'gift-client-0001'})).status,409);
  assert.equal((await f.call('sender','/gifts',{username:'stranger',catalogId:'gift-rose',clientId:'gift-client-0001'})).status,409);
 }finally{f.sqlite.close();}
});
test('only the recipient can collect a gift and replay grants ownership once',async()=>{
 const f=await fixture();try{
  const g=(await f.gift()).gift;
  assert.equal((await f.call('sender',`/gifts/${g.id}/open`,{})).status,404);
  assert.equal((await f.call('stranger',`/gifts/${g.id}/open`,{})).status,404);
  await f.ok('recipient',`/gifts/${g.id}/open`,{});const opened=await f.ok('recipient',`/gifts/${g.id}/open`,{});
  assert.equal(opened.pendingGifts,0);assert.equal(opened.owned.length,1);assert.equal(opened.owned[0].cosmetic_id,'gift-rose');
  assert.equal((await f.call('recipient',`/gifts/${g.id}/decline`,{})).status,409);
 }finally{f.sqlite.close();}
});
test('declining never grants ownership and cannot be reversed by a stale open action',async()=>{
 const f=await fixture();try{const g=(await f.gift()).gift;await f.ok('recipient',`/gifts/${g.id}/decline`,{});await f.ok('recipient',`/gifts/${g.id}/decline`,{});assert.equal((await f.call('recipient',`/gifts/${g.id}/open`,{})).status,409);assert.deepEqual((await f.ok('recipient','/inventory')).owned,[]);}finally{f.sqlite.close();}
});
test('gift preferences and either-direction account blocks prevent new gifts',async()=>{
 const f=await fixture();try{
  await f.ok('recipient','/settings',{giftsEnabled:false});assert.equal((await f.call('sender','/gifts',{username:'recipient',catalogId:'gift-rose',clientId:'privacy-gift-1'})).status,404);
  await f.ok('recipient','/settings',{giftsEnabled:true});f.sqlite.prepare('INSERT INTO social_blocks VALUES(?,?,?)').run('recipient','sender',Date.now());
  assert.equal((await f.call('sender','/gifts',{username:'recipient',catalogId:'gift-rose',clientId:'blocked-gift-1'})).status,404);
  f.sqlite.prepare('DELETE FROM social_blocks').run();const g=(await f.gift()).gift;
  f.sqlite.prepare('INSERT INTO social_blocks VALUES(?,?,?)').run('sender','recipient',Date.now());
  assert.equal((await f.call('recipient',`/gifts/${g.id}/open`,{})).status,409);await f.ok('recipient',`/gifts/${g.id}/decline`,{});
 }finally{f.sqlite.close();}
});
test('bounded gift limits count durable sends and retries stay valid at the limit',async()=>{
 const f=await fixture();try{
  for(let i=0;i<3;i++)await f.gift('limit-client-'+i);
  assert.equal((await f.call('sender','/gifts',{username:'recipient',catalogId:'gift-rose',clientId:'limit-client-3'})).status,429);
  await f.gift('limit-client-0');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_gifts').get().n,3);
 }finally{f.sqlite.close();}
});
test('failed collection writes never change a badge or acknowledge an uncommitted gift opening',async()=>{
 const f=await fixture();try{
  await f.ok('sender','/claim',{cosmeticId:'angel'});await f.ok('sender','/equip',{cosmeticId:'angel'});await f.ok('sender','/claim',{cosmeticId:'ghost'});
  f.db.fail='INSERT INTO cosmetic_profiles';assert.equal((await f.call('sender','/equip',{cosmeticId:'ghost'})).status,503);f.db.fail='';assert.equal((await f.ok('sender','/inventory')).equippedId,'angel');
  const g=(await f.gift()).gift;f.db.fail='INSERT OR IGNORE INTO cosmetic_ownership';assert.equal((await f.call('recipient',`/gifts/${g.id}/open`,{})).status,503);f.db.fail='';assert.equal(f.sqlite.prepare('SELECT state FROM cosmetic_gifts WHERE id=?').get(g.id).state,'pending');
 }finally{f.sqlite.close();}
});
test('mutations reject cross-origin, stale account and missing CSRF without granting inventory',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('sender','/claim',{cosmeticId:'angel'},{origin:'https://elsewhere.example'})).status,403);
  assert.equal((await f.call('sender','/claim',{cosmeticId:'angel'},{'x-voidline-csrf':''})).status,403);
  assert.equal((await f.call('sender','/claim',{cosmeticId:'angel',expectedAccountId:'recipient'})).status,409);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_ownership').get().n,0);
 }finally{f.sqlite.close();}
});
test('profile marks require self or real shared membership and never expose private collections',async()=>{
 const f=await fixture();try{
  await f.ok('sender','/claim',{cosmeticId:'angel'});await f.ok('sender','/equip',{cosmeticId:'angel'});
  const own=await f.ok('sender','/profiles/sender');assert.equal(own.equippedId,'angel');assert.equal(own.owned,undefined);
  assert.equal((await f.call('stranger','/profiles/sender')).status,403);
 }finally{f.sqlite.close();}
});

test('legacy server grants reconcile to stable instances and do not return after transfer',async()=>{
 const f=await fixture();try{
  f.sqlite.prepare('INSERT INTO cosmetic_ownership VALUES(?,?,?)').run('sender','gift-star',1);
  const inventory=await f.ok('sender','/inventory');assert.equal(inventory.instances.length,1);
  const instance=inventory.instances[0];assert.equal(instance.origin_kind,'legacy-claim');
  const transfer=(await f.ok('sender','/transfers',{instanceId:instance.id,username:'recipient',clientId:'transfer-legacy-1'})).transfer;
  await f.ok('recipient','/transfers/'+transfer.id+'/open',{});
  assert.equal((await f.ok('sender','/inventory')).instances.length,0);
  assert.equal((await f.ok('recipient','/inventory')).instances[0].id,instance.id);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM gift_instances').get().n,1);
 }finally{f.sqlite.close();}
});
test('one owned instance cannot be reserved by two simultaneous transfers and retries retain one receipt',async()=>{
 const f=await fixture();try{
  const instance=(await f.ok('sender','/claim',{cosmeticId:'gift-rose'})).instances[0];
  const results=await Promise.all([f.call('sender','/transfers',{instanceId:instance.id,username:'recipient',clientId:'race-transfer-1'}),f.call('sender','/transfers',{instanceId:instance.id,username:'stranger',clientId:'race-transfer-2'})]);
  assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM gift_transfers').get().n,1);
  const record=f.sqlite.prepare('SELECT * FROM gift_transfers').get(),recipient=record.recipient_id;
  const retry=await f.ok('sender','/transfers',{instanceId:instance.id,username:recipient,clientId:record.client_id});assert.equal(retry.transfer.id,record.id);
  assert.equal((await f.call('stranger','/transfers/'+record.id+'/open',{})).status,recipient==='stranger'?200:404);
  if(recipient!=='stranger')await f.ok(recipient,'/transfers/'+record.id+'/open',{});
  await f.ok(recipient,'/transfers/'+record.id+'/open',{});
  assert.equal(f.sqlite.prepare('SELECT owner_id FROM gift_instances WHERE id=?').get(instance.id).owner_id,recipient);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM gift_instances').get().n,1);
 }finally{f.sqlite.close();}
});
test('showcase accepts only owned instances, has three distinct slots and clears on transfer',async()=>{
 const f=await fixture();try{
  const first=(await f.ok('sender','/claim',{cosmeticId:'gift-star'})).instances[0];
  assert.equal((await f.call('stranger','/showcase',{slots:[{instanceId:first.id,showSender:false}]})).status,403);
  assert.equal((await f.call('sender','/showcase',{slots:[{instanceId:first.id,showSender:false},{instanceId:first.id,showSender:false}]})).status,400);
  assert.equal((await f.ok('sender','/showcase',{slots:[{instanceId:first.id,showSender:false}]})).showcase.length,1);
  const transfer=(await f.ok('sender','/transfers',{instanceId:first.id,username:'recipient',clientId:'showcase-transfer'})).transfer;await f.ok('recipient','/transfers/'+transfer.id+'/open',{});
  assert.equal((await f.ok('sender','/inventory')).showcase.length,0);
 }finally{f.sqlite.close();}
});
test('collection visibility and block rules apply to full instance lists while notes never enter plaintext storage',async()=>{
 const f=await fixture();try{
  await f.ok('sender','/claim',{cosmeticId:'gift-star'});
  assert.equal((await f.call('stranger','/collections/sender')).status,403);
  await f.ok('sender','/settings',{collectionVisibility:'public'});assert.equal((await f.ok('stranger','/collections/sender')).instances.length,1);
  f.sqlite.prepare('INSERT INTO social_blocks VALUES(?,?,?)').run('stranger','sender',Date.now());assert.equal((await f.call('stranger','/collections/sender')).status,403);
  assert.equal((await f.call('sender','/gifts',{catalogId:'gift-star',username:'recipient',clientId:'no-private-note',message:'private note'})).status,503);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_gifts').get().n,0);
 }finally{f.sqlite.close();}
});
test('retired catalog designs preserve owned objects but cannot mint a new free grant',async()=>{
 const f=await fixture();try{
  await f.ok('sender','/claim',{cosmeticId:'gift-key'});
  f.sqlite.prepare('INSERT INTO gift_catalog VALUES(?,?,?,?,?,?)').run('gift-key','Obsidian Key','Retired design',0,'sender',Date.now());
  assert.equal((await f.ok('sender','/catalog')).items.find(i=>i.id==='gift-key').active,false);
  assert.equal((await f.call('recipient','/claim',{cosmeticId:'gift-key'})).status,409);
  assert.equal((await f.ok('sender','/inventory')).instances.length,1);
 }finally{f.sqlite.close();}
});
test('commit-time suspension prevents grants, transfer reservations and acceptance after the initial lookup',async()=>{
 for(const actor of ['sender','recipient'])for(const stage of ['grant','reserve','accept','open']){
  const f=await fixture();try{
   let instance,transfer,gift;
   if(stage==='reserve'||stage==='accept'){instance=(await f.ok('sender','/claim',{cosmeticId:'gift-rose'})).instances[0];if(stage==='accept')transfer=(await f.ok('sender','/transfers',{instanceId:instance.id,username:'recipient',clientId:'suspend-transfer'})).transfer;}
   if(stage==='open')gift=(await f.gift()).gift;
   const prefix={grant:'INSERT OR IGNORE INTO cosmetic_gifts',reserve:'UPDATE gift_instances SET pending_transfer_id',accept:'UPDATE gift_transfers SET state',open:'UPDATE cosmetic_gifts SET state'}[stage];
   let suspended=false;f.db.beforeWrite=sql=>{if(!suspended&&sql.startsWith(prefix)){suspended=true;f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id=?").run(actor);}};
   const result=stage==='grant'?await f.call('sender','/gifts',{username:'recipient',catalogId:'gift-rose',clientId:'suspend-grant'}):stage==='reserve'?await f.call('sender','/transfers',{instanceId:instance.id,username:'recipient',clientId:'suspend-reserve'}):stage==='accept'?await f.call('recipient','/transfers/'+transfer.id+'/open',{}):await f.call('recipient','/gifts/'+gift.id+'/open',{});
   assert.equal(suspended,true);assert.ok(result.status>=400,actor+' '+stage+' should fail');assert.equal(result.data.acknowledged,undefined);assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM gift_instances WHERE owner_id='recipient'").get().n,0);
   if(stage==='reserve'){assert.equal(f.sqlite.prepare('SELECT pending_transfer_id FROM gift_instances WHERE id=?').get(instance.id).pending_transfer_id,null);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM gift_transfers').get().n,0);}
   if(stage==='accept'){assert.equal(f.sqlite.prepare('SELECT owner_id FROM gift_instances WHERE id=?').get(instance.id).owner_id,'sender');assert.equal(f.sqlite.prepare('SELECT state FROM gift_transfers WHERE id=?').get(transfer.id).state,'pending');}
   if(stage==='grant')assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_gifts').get().n,0);
   if(stage==='open')assert.equal(f.sqlite.prepare('SELECT state FROM cosmetic_gifts WHERE id=?').get(gift.id).state,'pending');
  }finally{f.sqlite.close();}
 }
});
let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}}
console.log(`${tests.length-failures}/${tests.length} free cosmetics checks passed against migrated SQLite and real session authorization. No real contacts or payments were used.`);process.exitCode=failures?1:0;
