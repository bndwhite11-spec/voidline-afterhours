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
  const catalog=await f.ok('sender','/catalog');assert.equal(catalog.free,true);assert.equal(catalog.items.length,81);assert.ok(catalog.items.every(i=>i.price===0));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_ownership').get().n,0);
  assert.equal((await f.call(undefined,'/inventory')).status,401);
 }finally{f.sqlite.close();}
});
test('crypto and internet series stay free decorations with authoritative ownership and no privileges',async()=>{
 const f=await fixture();try{
  const items=(await f.ok('sender','/catalog')).items;
  assert.equal(new Set(items.map(item=>item.id)).size,81);
  assert.deepEqual(Object.fromEntries(['originals','crypto','memes','ego','guild','gifts'].map(category=>[category,items.filter(item=>item.category===category).length])),{originals:9,crypto:11,memes:22,ego:3,guild:4,gifts:32});
  const added=items.filter(item=>['crypto','memes','ego','guild'].includes(item.category));
  for(const item of added){
   assert.equal(item.type,'badge');assert.equal(item.price,0);assert.ok(item.series.length>0);
   if(item.category==='crypto'){assert.match(item.acquisition,/No coins, wallet holdings or official affiliation/);assert.ok(item.inspiration.length>0);}
   assert.equal((await f.call('stranger','/equip',{cosmeticId:item.id})).status,403);
   if(['coin-crosssignal','meme-nothing-happens','ego-unique-one','guild-cardboard-paladin'].includes(item.id)){await f.ok('sender','/claim',{cosmeticId:item.id});await f.ok('sender','/claim',{cosmeticId:item.id});assert.equal((await f.ok('sender','/equip',{cosmeticId:item.id,role:'owner',walletBalance:1000000})).equippedId,item.id);}
  }
  assert.equal((await f.ok('sender','/inventory')).owned.length,4);
  assert.equal((await f.ok('stranger','/inventory')).owned.length,0);
  for(const table of ['badge_awards','live_memberships','platform_owner','gift_instances'])assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);
 }finally{f.sqlite.close();}
});
test('Blockchain and Ledger are free web-art decorations with stable independent IDs and no wallet permissions',async()=>{const f=await fixture();try{const items=(await f.ok('sender','/catalog')).items;for(const [id,name]of [['coin-blockchain','Blockchain'],['coin-ledger','Ledger']]){const item=items.find(x=>x.id===id);assert.equal(item.name,name);assert.equal(item.type,'badge');assert.equal(item.category,'crypto');assert.equal(item.price,0);assert.match(item.acquisition,/No coins, wallet holdings or official affiliation/);await f.ok('sender','/claim',{cosmeticId:id});assert.equal((await f.ok('sender','/equip',{cosmeticId:id,role:'owner'})).equippedId,id);}assert.equal((await f.call('sender','/catalog')).status,200);assert.equal((await f.ok('sender','/inventory')).earnedBadges.length,0);}finally{f.sqlite.close();}});

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
test('expanded catalog preserves original identities and keeps all new designs separate from earned awards',async()=>{
 const f=await fixture();try{const items=(await f.ok('sender','/catalog')).items;assert.equal(items.filter(i=>i.type==='badge').length,49);assert.equal(items.filter(i=>i.type==='gift').length,32);for(const id of ['larp','angel','ghost','velvet','night','unknown','dead','voidwalker','orbit','coin-bitforge','coin-etherglass','coin-crosssignal','coin-solarstack','coin-moonshibe','coin-diamondhands','meme-grass','meme-npc','meme-yapper','meme-copium','meme-cooked','meme-terminal','gift-rose','gift-cassette','gift-star','gift-cup','gift-ghost','gift-parcel','gift-seraph','gift-key','gift-halo','gift-orchid','gift-signal','gift-ticket'])assert(items.some(item=>item.id===id),id);for(const id of ['ego-unique-one','meme-nothing-happens','meme-six-seven','guild-guildless-knight','coin-cold-storage','gift-ego-volume','gift-curtain-call','gift-last-tab','meme-doomer','meme-bloomer','meme-absolute-cinema','guild-forum-wizard','gift-pocket-doomer','gift-orbit-mobile','gift-last-broadcast','gift-night-lantern'])assert(items.some(item=>item.id===id),id);assert(!items.some(i=>['profile-authored','reviewed-contribution'].includes(i.id)));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_ownership').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM badge_awards').get().n,0);}finally{f.sqlite.close();}
});
test('recipient review resolves only eligible public identity and does not reserve or send a gift',async()=>{
 const f=await fixture();try{const reviewed=await f.ok('sender','/recipient?username=recipient');assert.deepEqual(Object.keys(reviewed.recipient).sort(),['avatar','displayName','id','username']);assert.equal(reviewed.recipient.id,'recipient');assert.equal(reviewed.recipient.username,'recipient');assert.equal((await f.call('sender','/recipient?username=unknown')).status,404);assert.equal((await f.call('sender','/recipient?username=sender')).status,404);f.sqlite.prepare("INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES('sender','recipient',1)").run();assert.equal((await f.call('sender','/recipient?username=recipient')).status,404);f.sqlite.prepare('DELETE FROM social_blocks').run();f.sqlite.prepare("INSERT INTO cosmetic_profiles(account_id,gifts_enabled) VALUES('recipient',0)").run();assert.equal((await f.call('sender','/recipient?username=recipient')).status,404);for(const table of ['cosmetic_gifts','gift_transfers','gift_instances','cosmetic_ownership'])assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);}finally{f.sqlite.close();}
});
test('immutable reviewed recipient prevents a renamed username from redirecting a new grant',async()=>{
 const f=await fixture();try{const reviewed=await f.ok('sender','/recipient?username=recipient');f.sqlite.prepare("UPDATE live_accounts SET username='renamed_recipient' WHERE id='recipient'").run();f.sqlite.prepare("UPDATE live_accounts SET username='recipient' WHERE id='stranger'").run();const response=await f.call('sender','/gifts',{catalogId:'gift-rose',username:'recipient',recipientId:reviewed.recipient.id,clientId:'review-bind-grant'});assert.equal(response.status,409);assert.equal(response.data.error.code,'recipient_changed');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_gifts').get().n,0);}finally{f.sqlite.close();}
});
test('acknowledged gift retry stays bound to its original recipient after a public rename',async()=>{
 const f=await fixture();try{const payload={catalogId:'gift-curtain-call',username:'recipient',recipientId:'recipient',clientId:'review-rename-retry'},first=await f.ok('sender','/gifts',payload);f.sqlite.prepare("UPDATE live_accounts SET username='renamed_recipient' WHERE id='recipient'").run();f.sqlite.prepare("UPDATE live_accounts SET username='recipient' WHERE id='stranger'").run();const retry=await f.ok('sender','/gifts',payload);assert.equal(retry.gift.id,first.gift.id);assert.equal(retry.gift.recipient_id,'recipient');assert.equal((await f.call('sender','/gifts',{...payload,recipientId:'stranger'})).status,409);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_gifts').get().n,1);}finally{f.sqlite.close();}
});
test('reviewed owned-instance transfer cannot reserve an item for a replacement username owner',async()=>{
 const f=await fixture();try{await f.ok('sender','/claim',{cosmeticId:'gift-ego-volume'});const instance=(await f.ok('sender','/instances')).instances[0];const reviewed=await f.ok('sender','/recipient?username=recipient');f.sqlite.prepare("UPDATE live_accounts SET username='renamed_recipient' WHERE id='recipient'").run();f.sqlite.prepare("UPDATE live_accounts SET username='recipient' WHERE id='stranger'").run();const response=await f.call('sender','/transfers',{instanceId:instance.id,username:'recipient',recipientId:reviewed.recipient.id,clientId:'review-bind-transfer'});assert.equal(response.status,409);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM gift_transfers').get().n,0);assert.equal(f.sqlite.prepare('SELECT pending_transfer_id FROM gift_instances WHERE id=?').get(instance.id).pending_transfer_id,null);}finally{f.sqlite.close();}
});

test('recognizable badge names retain stable ownership IDs and former names as search aliases',async()=>{
 const f=await fixture();try{
  const renamed=[['coin-bitforge','Bitcoin','Bitforge'],['coin-etherglass','Ethereum','Ether Glass'],['coin-crosssignal','XRP','Cross Signal'],['coin-solarstack','Solana','Solar Stack'],['coin-moonshibe','Dogecoin','Moon Shibe'],['ego-unique-one','Max Stirner','The Unique One'],['meme-nothing-happens','Chudjak','Nothing Ever Happens'],['meme-final-reply','Reply Guy','Final Reply']];
  // Existing durable rows continue to reference the same design after a public-name change.
  f.sqlite.prepare('INSERT INTO cosmetic_ownership(account_id,cosmetic_id,claimed_at) VALUES(?,?,?)').run('sender','coin-crosssignal',1);
  const items=(await f.ok('sender','/catalog')).items;
  for(const [id,name,formerName]of renamed){const item=items.find(item=>item.id===id);assert(item,id);assert.equal(item.name,name);assert(item.aliases.includes(formerName),formerName);assert.equal(item.type,'badge');assert.equal(item.price,0);}
  assert.equal((await f.ok('sender','/equip',{cosmeticId:'coin-crosssignal'})).equippedId,'coin-crosssignal');
  assert.equal(f.sqlite.prepare("SELECT claimed_at FROM cosmetic_ownership WHERE account_id='sender' AND cosmetic_id='coin-crosssignal'").get().claimed_at,1);
  for(const [id,name]of [['meme-chud','CHUD'],['meme-wojak','Wojak'],['meme-soyjak','Soyjak'],['meme-gigachad','Gigachad'],['meme-cope-seethe','Cope & Seethe'],['meme-pepe','Pepe']]){const item=items.find(item=>item.id===id);assert.equal(item?.name,name);assert.equal(item.category,'memes');assert.equal(item.type,'badge');assert.equal(item.price,0);await f.ok('sender','/claim',{cosmeticId:id});}
  assert.equal((await f.ok('sender','/inventory')).owned.length,7);
  for(const table of ['badge_awards','platform_owner','live_memberships','gift_instances'])assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);
 }finally{f.sqlite.close();}
});
test('researched gift bases become original VOIDLINE gifts without source NFT identities or ownership claims',async()=>{
 const f=await fixture();try{
  const items=(await f.ok('sender','/catalog')).items,gifts=items.filter(item=>item.type==='gift');
  const originals=[['gift-chudjak-plush','Chudjak Plush'],['gift-wojak-jelly','Wojak Jelly'],['gift-doomer-bloom','Doomer Bloom'],['gift-brainrot-pop','Brainrot Pop'],['gift-larp-cap','LARP Cap'],['gift-spook-crystal','Spook Crystal'],['gift-larp-helmet','LARP Helmet'],['gift-copium-cartridge','Copium Cartridge']];
  const sourceNames=new Set(['Plush Pepe','Jelly Bunny','Durov’s Cap','Durov\'s Cap','Astral Shard','Heroic Helmet','Skull Flower','Vintage Cigar','Lol Pop']);
  for(const gift of gifts){assert(!gift.id.startsWith('gift-telegram-'));assert(!sourceNames.has(gift.name));for(const key of ['reference','referenceKey','tokenId','marketValue','walletAddress','contractAddress'])assert.equal(gift[key],undefined,key);}
  for(const [id,name]of originals){const item=gifts.find(item=>item.id===id);assert(item,id);assert.equal(item.name,name);assert.equal(item.price,0);assert.match(item.acquisition,/Free VOIDLINE cosmetic instance/);assert.match(item.acquisition,/credited web artwork/);assert.match(item.acquisition,/no blockchain asset changes hands/i);assert(!JSON.stringify(item).includes('https://t.me/nft/'));}
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_ownership').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM gift_instances').get().n,0);
  const invalid=await f.call('sender','/claim',{cosmeticId:'gift-telegram-plush-pepe'});assert.equal(invalid.status,400);assert.equal(invalid.data.error.code,'unknown_cosmetic');
  await f.ok('sender','/claim',{cosmeticId:'gift-chudjak-plush'});await f.ok('sender','/claim',{cosmeticId:'gift-chudjak-plush'});
  const inventory=await f.ok('sender','/inventory');assert.equal(inventory.instances.length,1);assert.equal(inventory.instances[0].catalog_id,'gift-chudjak-plush');assert.equal(f.sqlite.prepare('SELECT owner_id FROM gift_instances WHERE id=?').get(inventory.instances[0].id).owner_id,'sender');assert.equal(inventory.owned.length,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM badge_awards').get().n,0);
 }finally{f.sqlite.close();}
});
let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}}
console.log(`${tests.length-failures}/${tests.length} free cosmetics checks passed against migrated SQLite and real session authorization. No real contacts or payments were used.`);process.exitCode=failures?1:0;
