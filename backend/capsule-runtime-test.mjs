// Isolated actual workerd HTTP handlers, SQLite migrations and D1 batches.
// No test clock, deterministic winner or grant endpoint is compiled into the app.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {authHash} from '../worker/auth.mjs';
import {choiceEdition,modelAt,participationWrites,expandedReleaseTables,releaseTables,validateTables,weekAt} from '../worker/capsule-rules.mjs';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
const root=new URL('../',import.meta.url),origin='https://capsules.example';
const compiled=await build({stdin:{resolveDir:root.pathname,loader:'js',contents:`
  import {handleCapsulesRequest} from './worker/capsules.mjs';
  import {handleCosmeticsRequest} from './worker/cosmetics.mjs';
  import {handleAuthRequest} from './worker/auth.mjs';
  import {handleLiveRequest} from './worker/index.mjs';
  export default {fetch(r,e){const path=new URL(r.url).pathname;
    if(path.startsWith('/api/auth/')) return handleAuthRequest(r,e);
    if(path.startsWith('/api/live/')) return handleLiveRequest(r,e);
    if(path.startsWith('/api/cosmetics/')) return handleCosmeticsRequest(r,e);
    return handleCapsulesRequest(r,e);
  }}`},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,minify:true});
const runtime={modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:{DB:'capsule-verification'}};
const mf=new Miniflare({d1Persist:false,workers:[
  {...runtime,name:'baseline',routes:['capsules.example/*']},
  {...runtime,name:'expanded',routes:['expanded.capsules.example/*'],bindings:{CAPSULE_EXPANDED_FAMILIES:'1'}},
  {...runtime,name:'paused',routes:['paused.capsules.example/*'],bindings:{CAPSULE_ISSUANCE_PAUSED:'1',CAPSULE_OPENING_PAUSED:'1'}}
]});
let deployment='baseline';
const sessions=new Map(),toToken=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
try {
  const db=await mf.getD1Database('DB','baseline');
  const query=(sql,...args)=>db.prepare(sql).bind(...args);
  let before;
  const preserved=[
    ["gift_instances","id,catalog_id,owner_id,origin_kind,created_at,pending_transfer_id"],
    ["gift_transfers","id,instance_id,sender_id,recipient_id,state,created_at"],
    ["gift_showcase","account_id,slot,instance_id,show_sender"],
    ["gift_collection_items","collection_id,instance_id,position,added_at"],
    ["profile_preferences","account_id,collection_visibility,details_visibility"]
  ];
  const capture=()=>Promise.all(preserved.map(async([table,cols])=>(await query('SELECT '+cols+' FROM '+table+' ORDER BY 1').all()).results));
  const entries=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url))).entries;
  for (const entry of entries) {
    if(entry.tag==='0011_choice_capsules'){
      for(const id of ['legacy-holder','legacy-recipient'])await query('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,10,10)',id,id,id).run();
      await query("INSERT INTO gift_instances(id,catalog_id,owner_id,origin_kind,created_at,pending_transfer_id) VALUES('kept-copy','gift-rose','legacy-holder','claim',17,'kept-reservation')").run();
      await query("INSERT INTO gift_transfers(id,instance_id,sender_id,recipient_id,client_id,state,created_at) VALUES('kept-reservation','kept-copy','legacy-holder','legacy-recipient','kept-request','pending',20)").run();
      await query("INSERT INTO gift_showcase(account_id,slot,instance_id,show_sender) VALUES('legacy-holder',0,'kept-copy',0)").run();
      await query("INSERT INTO gift_collections(id,owner_id,name,normalized_name,created_at,updated_at,client_id) VALUES('kept-group','legacy-holder','Keep','keep',17,17,'kept-group-key')").run();
      await query("INSERT INTO gift_collection_items(collection_id,instance_id,position,added_at) VALUES('kept-group','kept-copy',3,20)").run();
      await query("INSERT INTO profile_preferences(account_id,collection_visibility,details_visibility) VALUES('legacy-holder','friends','private')").run();
      before=await capture();
    }
    const sql=readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
    for(const part of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean)) await db.prepare(part).run();
  }
  assert.deepEqual(await capture(),before);
  const prefs=await query("SELECT collection_visibility,full_inventory_visibility FROM profile_preferences WHERE account_id='legacy-holder'").first();
  assert.equal(prefs.collection_visibility,'friends');assert.equal(prefs.full_inventory_visibility,'private');
  const oldCopy=await query("SELECT acquired_at,arrival_acknowledged_at,ownership_revision FROM gift_instances WHERE id='kept-copy'").first();
  assert.equal(oldCopy.acquired_at,null);assert.equal(oldCopy.arrival_acknowledged_at,-1);assert.equal(oldCopy.ownership_revision,0);
  assert.equal((await query("SELECT discovered_at FROM collectible_discovery_history WHERE account_id='legacy-holder' AND model_id='gift-rose'").first()).discovered_at,17);
  console.log('PASS schema-only migration keeps exact copy/reservation/showcase/group and prior profile audiences; new full inventory private');
  async function session(id,onboarded=true) {
    const now=Date.now(),token=toToken(),csrf=toToken(),sessionId=crypto.randomUUID();
    await query('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,?,?,?)',
      id,onboarded?id:null,'Fixture '+id,Number(onboarded),now,now).run();
    await query('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)',
      sessionId,id,await authHash(token),await authHash(csrf),'Capsule test',now,now,now,now+3600000).run();
    sessions.set(id,{token,csrf,sessionId});
  }
  async function call(id,path,body,expected=200,custom={}) {
    const host=deployment==='baseline'?origin:'https://'+deployment+'.capsules.example';
    const s=sessions.get(id),headers={...(s?{cookie:'__Host-voidline_session='+s.token}:{}),
      ...(body!==undefined?{origin:host,'content-type':'application/json','x-voidline-auth':'1','x-voidline-csrf':s?.csrf||''}:{}),...custom};
    const r=await mf.dispatchFetch(host+path,{method:body===undefined?'GET':'POST',headers,
      ...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:id,...body})})});
    const data=await r.json();
    assert.equal(r.status,expected,path+' '+JSON.stringify(data));
    if (path.startsWith('/api/capsules')) assert.match(r.headers.get('cache-control'),/no-store/);
    return {data,headers:r.headers};
  }
  const capsule=(id,path='',body,expected=200)=>call(id,'/api/capsules'+path,body,expected).then(r=>r.data);
  const count=async(sql,...args)=>(await query(sql,...args).first()).n;
  const policyIds=(await query('SELECT model_id FROM collectible_model_policies ORDER BY model_id').all()).results.map(r=>r.model_id);
  assert.deepEqual(policyIds,expandedReleaseTables.flatMap(f=>f.models.map(m=>m.id)).sort());
  for(const family of expandedReleaseTables) {
    let min=0;
    for (const model of family.models) {
      assert.equal(modelAt(min,family.models).id,model.id); min+=model.weight;
      assert.equal(modelAt(min-1,family.models).id,model.id);
    }
    assert.equal(min,10000);assert.throws(()=>modelAt(10000,family.models));
  }
  assert.throws(()=>validateTables([{...releaseTables[0],models:[{...releaseTables[0].models[0],weight:1}]}]));
  console.log('PASS frozen release content, guarded model IDs, integer bounds and all twelve hero and nine workshop outcomes');

  await session('older');await session('incoming',false);await session('stranger');
  await capsule(null,'',undefined,401);
  assert.equal((await capsule('older')).capsules.length,0);
  assert.equal(await count('SELECT count(*) n FROM collectible_capsules'),0);
  await call('older','/api/capsules/reconcile',{},403,{'x-voidline-csrf':''});
  await capsule('older','/reconcile',{expectedAccountId:'stranger'},409);
  await capsule('incoming','/reconcile',{},409);
  const create=await call(null,'/api/auth/register',{username:'capsulelocal',displayName:'Local fixture',password:'Isolated-test-password-592!'},201);
  const localId=create.data.account.id;
  sessions.set(localId,{csrf:create.data.csrfToken,token:create.headers.get('set-cookie').match(/__Host-voidline_session=([a-f0-9]+)/)[1]});
  assert.equal((await capsule(localId,'/reconcile',{})).capsules.length,1);
  await call('incoming','/api/auth/onboarding',{username:'incominguser',displayName:'Provider fixture'});
  assert.equal((await capsule('incoming','/reconcile',{})).capsules.length,1);
  const welcome=await Promise.all(Array.from({length:4},()=>capsule('older','/reconcile',{})));
  const id=welcome[0].capsules[0].id,detail='/'+id;
  assert(welcome.every(row=>row.capsules.length===1&&row.capsules[0].id===id));
  const frozen=await capsule('older',detail);
  assert.deepEqual(frozen.families,releaseTables);assert.equal(frozen.capsule.editionId,choiceEdition);
  assert.equal(frozen.opening,null);await capsule('stranger',detail,undefined,404);
  await capsule('older',detail+'/open',{familyId:'pepe-keycap',clientId:crypto.randomUUID(),winner:'gift-pepe-desk-green'},400);
  await capsule('older',detail+'/open',{familyId:'unreleased',clientId:crypto.randomUUID()},400);
  console.log('PASS welcome once through local signup, separate onboarding, preexisting eligibility and concurrent reconciliation; private reads and CSRF');

  const keys=[crypto.randomUUID(),crypto.randomUUID()];
  const outcomes=await Promise.all(releaseTables.map((f,index)=>capsule('older',detail+'/open',{familyId:f.id,clientId:keys[index]})));
  assert.equal(outcomes[0].opening.id,outcomes[1].opening.id);
  assert.equal(outcomes.filter(o=>!o.alreadyOpened).length,1);
  const winner=outcomes[0].opening;
  assert.equal(winner.discovery,'first');assert.equal(winner.currentlyOwned,true);
  assert.equal(winner.model.id,winner.modelId);
  assert.equal(winner.model.backdrop.name,releaseTables.find(f=>f.id===winner.familyId).models.find(m=>m.id===winner.modelId).backdrop.name);
  assert.equal(await count('SELECT COUNT(*) n FROM gift_instances WHERE capsule_id=?',id),1);
  assert.equal((await capsule('older',detail)).opening.id,winner.id);
  const repeat=await capsule('older',detail+'/open',{familyId:releaseTables[0].id,clientId:keys[0]});
  assert.equal(repeat.opening.instanceId,winner.instanceId);assert.equal(repeat.alreadyOpened,true);
  await capsule('older',detail+'/open',{familyId:releaseTables[1].id,clientId:keys[0]},409);
  await capsule('stranger',detail+'/open',{familyId:releaseTables[0].id,clientId:crypto.randomUUID()},404);
  await capsule('stranger',detail+'/ack',{},404);
  const ack=(await capsule('older',detail+'/ack',{})).opening.acknowledgedAt;
  assert(ack>0);assert.equal((await capsule('older',detail+'/ack',{})).opening.acknowledgedAt,ack);
  console.log('PASS concurrent real D1 opening with different keys and families, single durable copy, lost-response retry, key conflict, acknowledgment and account isolation');

  const transfer=(await call('older','/api/cosmetics/transfers',{instanceId:winner.instanceId,username:'stranger',
    recipientId:'stranger',clientId:crypto.randomUUID(),expectedOwnershipRevision:0},201)).data.transfer;
  assert.equal((await capsule('older',detail)).opening.currentlyReserved,true);
  await call('stranger','/api/cosmetics/transfers/'+transfer.id+'/open',{});
  const historical=(await capsule('older',detail)).opening;
  assert.equal(historical.currentlyOwned,false);assert.equal(historical.currentlyReserved,false);
  assert.equal(historical.modelId,winner.modelId);assert.equal(historical.tableVersion,winner.tableVersion);assert.deepEqual(historical.model,winner.model);
  assert(!JSON.stringify(historical).includes('stranger'));
  assert.equal(await count("SELECT count(*) n FROM collectible_discoveries WHERE account_id='stranger' AND model_id=?",winner.modelId),1);
  console.log('PASS exact-copy pending reservation and acceptance preserve owner-only frozen opening recovery and hide later owner');

  const unopened=(await capsule('incoming')).capsules[0].id, body={familyId:'pepe-keycap',clientId:crypto.randomUUID()};
  await db.prepare("CREATE TRIGGER fixture_injected_failure BEFORE INSERT ON gift_instances WHEN NEW.origin_kind='capsule' BEGIN SELECT RAISE(ABORT,'simulated-storage-failure'); END;").run();
  await capsule('incoming','/'+unopened+'/open',body,503);
  assert.equal(await count('SELECT count(*) n FROM capsule_openings WHERE capsule_id=?',unopened),0);
  assert.equal(await count('SELECT count(*) n FROM gift_instances WHERE capsule_id=?',unopened),0);
  assert.equal(await count('SELECT count(*) n FROM capsule_open_requests WHERE client_id=?',body.clientId),0);
  await db.prepare('DROP TRIGGER fixture_injected_failure').run();
  assert((await capsule('incoming','/'+unopened+'/open',body)).opening.instanceId);
  await assert.rejects(query("UPDATE capsule_editions SET families_json='[]' WHERE id=?",choiceEdition).run(),/immutable/);
  await assert.rejects(query("INSERT INTO gift_instances(id,catalog_id,owner_id,origin_kind,created_at) VALUES(?,?,?,'claim',1)",crypto.randomUUID(),winner.modelId,'older').run(),/opening_required/);
  console.log('PASS award write failure rolls back the request, opening and copy; exact retry succeeds; mint and frozen table guards');

  const now=Date.now(),actor={id:'older',sessionId:sessions.get('older').sessionId};
  await query('INSERT INTO live_communities(id,name,created_by,created_at) VALUES(?,?,?,?)','caps-room','Isolated','older',now).run();
  await query('INSERT INTO live_memberships(community_id,account_id,role,joined_at) VALUES(?,?,?,?)','caps-room','older','owner',now).run();
  await query('INSERT INTO live_channels(id,community_id,name,kind,created_at) VALUES(?,?,?,?,?)','caps-room-channel','caps-room','welcome','text',now).run();
  const messagePath='/api/live/channels/caps-room-channel/messages',message={clientId:crypto.randomUUID(),text:'Fixture',acknowledgeStandard:true};
  await call('stranger',messagePath,message,403);
  await call('older',messagePath,message,200);await call('older',messagePath,message,200);
  assert.equal(await count("SELECT COUNT(*) n FROM capsule_stamps WHERE account_id='older'"),1);
  assert.equal((await capsule('older')).progress.days,1);
  // Historical dates are fixture data. These are the identical statements called
  // by the live handler above, in the same D1 batch as each committed message.
  const monday=Date.parse('2026-02-02T23:59:00Z'),week=weekAt(monday);assert.equal(week.key,'2026-02-02');
  async function historicalSend(time) {
    const msg=crypto.randomUUID();
    await db.batch([query('INSERT INTO live_messages(id,channel_id,author_id,client_id,text,created_at) VALUES(?,?,?,?,?,?)',
      msg,'caps-room-channel','older',msg,'historical fixture',time),...participationWrites({DB:db},msg,actor)]);
  }
  for(const offset of [0,0,1,2,4,6,7])await historicalSend(monday+offset*86400000);
  assert.equal(await count("SELECT count(*) n FROM collectible_capsules WHERE account_id='older' AND source='weekly' AND period=?",week.key),1);
  assert.equal(await count("SELECT count(*) n FROM capsule_stamps WHERE account_id='older' AND utc_week='2026-02-09'"),1);
  assert.equal((await capsule('older')).capsules.filter(c=>c.source==='weekly').length,1);
  assert.equal(participationWrites({DB:db,CAPSULE_ISSUANCE_PAUSED:'1'},'ignored',actor).length,0);
  console.log('PASS server-committed community message hook, denied send, retry, UTC rollover, third-day transaction and permanent old-week entitlement');

  // Two deployments share the same real database but receive distinct trusted release bindings.
  deployment='expanded';
  assert.deepEqual((await capsule('older',detail)).families,releaseTables);
  await session('workshop');await session('workshoptwo');
  for(const [i,who] of ['workshop','workshoptwo'].entries()) {
    const awarded=(await capsule(who,'/reconcile',{})).capsules[0],item='/'+awarded.id;
    const visible=await capsule(who,item);assert.equal(visible.capsule.editionId,'afterhours-choice.v2');
    assert.deepEqual(visible.families,expandedReleaseTables);
    deployment='baseline';
    assert.equal((await capsule(who,item)).families.length,4);
    const result=(await capsule(who,item+'/open',{familyId:['midnight-tape','copium-reserve'][i],clientId:crypto.randomUUID()})).opening;
    assert.equal(result.model.artRevision,'atelier-01');
    assert.equal(result.tableVersion,['midnight-tape.v1','copium-reserve.v1'][i]);
    assert.match(result.model.originalArt.detail.sha256,/^[a-f0-9]{64}$/);deployment='expanded';
  }
  deployment='paused';
  const beforePause=(await capsule(localId)).capsules[0];
  await capsule(localId,'/'+beforePause.id+'/open',{familyId:'pepe-keycap',clientId:crypto.randomUUID()},503);
  await capsule(localId,'/reconcile',{},503);assert.equal((await capsule(localId,'/'+beforePause.id)).opening,null);
  assert.deepEqual((await capsule('older',detail)).opening,historical);
  assert.equal((await capsule('older',detail+'/open',{familyId:releaseTables[0].id,clientId:keys[0]})).opening.id,winner.id);
  deployment='baseline';
  console.log('PASS independent release settings, frozen two-versus-four family choices after toggling, both workshop families and paused recovery');

  await query("UPDATE auth_sessions SET revoked_at=? WHERE id=?",Date.now(),actor.sessionId).run();
  await capsule('older',detail,undefined,401);
  console.log('PASS revoked session cannot recover private receipt');
} finally { await mf.dispose(); }
