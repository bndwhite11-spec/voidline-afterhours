import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleCosmeticsRequest, COSMETICS} from '../worker/cosmetics.mjs';
import {authHash} from '../worker/auth.mjs';

const origin='https://cosmetics.example',tests=[];const test=(name,fn)=>tests.push([name,fn]);
class Adapter{
 constructor(sqlite){this.sqlite=sqlite;this.fail='';}
 prepare(sql){const adapter=this;return {bind(...values){return {
  first:async()=>{if(adapter.fail&&sql.includes(adapter.fail))throw Error('Injected database failure');return adapter.sqlite.prepare(sql).get(...values)||null;},
  all:async()=>({results:adapter.sqlite.prepare(sql).all(...values)}),
  run:async()=>{if(adapter.fail&&sql.includes(adapter.fail))throw Error('Injected database failure');return {success:true,meta:{changes:adapter.sqlite.prepare(sql).run(...values).changes}};}
 };}};}
 async batch(statements){this.sqlite.exec('BEGIN');try{const values=[];for(const statement of statements)values.push(await statement.run());this.sqlite.exec('COMMIT');return values;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}}
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
  const catalog=await f.ok('sender','/catalog');assert.equal(catalog.free,true);assert.equal(catalog.items.length,15);assert.ok(catalog.items.every(i=>i.price===0));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_ownership').get().n,0);
  assert.equal((await f.call(undefined,'/inventory')).status,401);
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
let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}}
console.log(`${tests.length-failures}/${tests.length} free cosmetics checks passed against migrated SQLite and real session authorization. No real contacts or payments were used.`);process.exitCode=failures?1:0;
