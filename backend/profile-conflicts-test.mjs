import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleProfilesRequest} from '../worker/profiles.mjs';
import {handleCosmeticsRequest} from '../worker/cosmetics.mjs';
import {handleLiveRequest} from '../worker/index.mjs';
import {authHash} from '../worker/auth.mjs';
const origin='https://profiles.example',tests=[];const test=(name,fn)=>tests.push([name,fn]);
class Adapter{constructor(db){this.db=db;this.fail='';this.beforeBatch=null;}prepare(sql){const a=this;return{bind(...v){a.maxBindings=Math.max(a.maxBindings||0,v.length);if(v.length>100)throw Error('D1 binding limit exceeded');const check=()=>{if(a.fail&&sql.includes(a.fail))throw Error('Isolated failure');};return{first:async()=>{check();const result=a.db.prepare(sql).get(...v)||null;a.afterRead?.(sql);return result;},all:async()=>{check();return{results:a.db.prepare(sql).all(...v)};},run:async()=>{check();return{success:true,meta:{changes:a.db.prepare(sql).run(...v).changes}};}};}};}async batch(statements){this.beforeBatch?.();this.db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());this.db.exec('COMMIT');return out;}catch(error){this.db.exec('ROLLBACK');throw error;}}}
async function fixture(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url))).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));const db=new Adapter(sqlite),env={DB:db},identities=new Map();
 async function addSession(id,device=id){
  const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
  const csrf=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
  const session=crypto.randomUUID(),now=Date.now();
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(session,id,await authHash(token),await authHash(csrf),device,now,now,now,now+60000);
  identities.set(device,{token,csrf,session,id});
 }
 for(const id of ['self','friend','stranger']){
  const now=Date.now();
  sqlite.prepare('INSERT INTO live_accounts(id,display_name,email,username,onboarding_complete,created_at,updated_at) VALUES(?,?,?,?,1,?,?)').run(id,id==='stranger'?'AT xrp':'Profile '+id,'',id,now,now);
  await addSession(id);
 }
 sqlite.prepare("INSERT INTO social_requests(id,sender_id,recipient_id,state,created_at,updated_at) VALUES('friends','self','friend','accepted',1,1)").run();
 const call=async(user,path,body)=>{const identity=identities.get(user),headers={cookie:'__Host-voidline_session='+identity.token};if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-csrf':identity.csrf});const request=new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:identity.id,...body})})});const response=await(path.startsWith('/api/cosmetics/')?handleCosmeticsRequest:path.startsWith('/api/live/')?handleLiveRequest:handleProfilesRequest)(request,env);return{status:response.status,data:await response.json()};};
 const ok=async(user,path,body)=>{const r=await call(user,path,body);assert.ok(r.status>=200&&r.status<300,`${path}: ${r.status} ${JSON.stringify(r.data)}`);return r.data;};return{sqlite,db,identities,addSession,call,ok};}
function history(f){
 const db=f.sqlite;db.prepare("INSERT INTO live_communities(id,name,created_by,created_at) VALUES('history-community','History fixture','self',1)").run();
 for(const[id,role]of [['self','owner'],['friend','member']])db.prepare("INSERT INTO live_memberships(community_id,account_id,role,joined_at) VALUES('history-community',?,?,1)").run(id,role);
 for(const channel of ['history-one','history-two'])db.prepare("INSERT INTO live_channels(id,community_id,name,kind,created_at) VALUES(?,'history-community',?,'text',1)").run(channel,channel);
 for(const[id,channel,author]of [['self-one','history-one','self'],['self-two','history-one','self'],['self-three','history-two','self'],['friend-one','history-one','friend']])db.prepare("INSERT INTO live_messages(id,channel_id,author_id,client_id,text,created_at) VALUES(?,?,?,?,?,1)").run(id,channel,author,id,'Real fixture history '+id);
 return()=>db.prepare('SELECT channel_id,message_id,actor_id,kind FROM live_changes ORDER BY seq').all();
}
function stagedImage(f,kind,letter){const id=letter.repeat(64),now=Date.now();f.sqlite.prepare("INSERT INTO media_assets(id,owner_id,client_id,object_key,sha256,kind,content_type,bytes,width,height,filename,state,expires_at,created_at,updated_at) VALUES(?,'self',?,?,?,?,'image/png',128,?,32,?,'staged',?,?,?)").run(id,crypto.randomUUID(),'fixture/'+id,'c'.repeat(64),kind,kind==='avatar'?32:96,kind+'.png',now+60000,now,now);return id;}


const baseFor=(profile,patch)=>Object.fromEntries(Object.keys(patch).map(key=>[key,profile[key]]));
const gift=(f,id='instance-one')=>{f.sqlite.prepare("INSERT INTO gift_instances(id,catalog_id,owner_id,origin_kind,created_at) VALUES(?,'gift-rose','self','claim',1)").run(id);return id;};
const ownDecoration=f=>f.sqlite.prepare("INSERT INTO cosmetic_ownership(account_id,cosmetic_id,claimed_at) VALUES('self','larp',1)").run();

test('two devices merge independent fields and retain the latest server revision',async()=>{const f=await fixture();try{
 await f.addSession('self','phone');
 assert.notEqual(f.identities.get('phone').session,f.identities.get('self').session);
 const phone=(await f.ok('phone','/api/profiles/me')).profile,desktop=(await f.ok('self','/api/profiles/me')).profile;
 const saved=(await f.ok('self','/api/profiles/me',{bio:'A desktop biography.',expectedRevision:desktop.revision,baseValues:{bio:desktop.bio}})).profile;
 const merged=(await f.ok('phone','/api/profiles/me',{avatar:'ghost',expectedRevision:phone.revision,baseValues:{avatar:phone.avatar}})).profile;
 assert.equal(merged.bio,'A desktop biography.');assert.equal(merged.avatar,'ghost');assert.ok(merged.revision>saved.revision);
 const persisted=(await f.ok('self','/api/profiles/me')).profile;
 assert.equal(persisted.avatar,'ghost');assert.equal(persisted.bio,merged.bio);
 f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?').run(Date.now(),f.identities.get('phone').session);
 const denied=await f.call('phone','/api/profiles/me',{bio:'Revoked edit',baseValues:{bio:persisted.bio}});
 assert.equal(denied.status,401);
 assert.equal((await f.ok('self','/api/profiles/me')).profile.bio,persisted.bio);
}finally{f.sqlite.close();}});

test('a same-field conflict preserves the draft server-side boundary and returns current saved values',async()=>{const f=await fixture();try{
 await f.addSession('self','phone');
 const changes=history(f),old=(await f.ok('phone','/api/profiles/me')).profile;
 await f.ok('self','/api/profiles/me',{bio:'Desktop saved biography.',expectedRevision:old.revision,baseValues:{bio:old.bio}});
 const media=stagedImage(f,'avatar','a'),result=await f.call('phone','/api/profiles/me',{bio:'Phone biography.',avatarMediaId:media,expectedRevision:old.revision,baseValues:{bio:old.bio,avatarMediaId:null}});
 assert.equal(result.status,409);assert.equal(result.data.error.code,'profile_conflict');assert.deepEqual(result.data.conflicts,['bio']);assert.equal(result.data.profile.bio,'Desktop saved biography.');assert.equal(result.data.profile.avatarMediaId,null);
 assert.equal(f.sqlite.prepare('SELECT state FROM media_assets WHERE id=?').get(media).state,'staged');assert.equal(changes().length,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM media_cleanup').get().n,0);
}finally{f.sqlite.close();}});

test('a lost-response retry is idempotent for author invalidation, media cleanup, showcase and styles',async()=>{const f=await fixture();try{
 const changes=history(f),oldMedia=stagedImage(f,'avatar','a');await f.ok('self','/api/profiles/me',{avatarMediaId:oldMedia});
 const initialEvents=changes().length,old=(await f.ok('self','/api/profiles/me')).profile,newMedia=stagedImage(f,'avatar','b'),instance=gift(f);ownDecoration(f);
 const patch={displayName:'One committed author',avatarMediaId:newMedia,equippedId:'larp',nameStyle:'serif',profileFrame:'halo',showcaseSlots:[{slot:1,instanceId:instance,showSender:false}]},body={...patch,expectedRevision:old.revision,baseValues:baseFor(old,patch)};
 const first=(await f.ok('self','/api/profiles/me',body)).profile,events=changes().length,cleanups=f.sqlite.prepare('SELECT COUNT(*) n FROM media_cleanup').get().n;
 const again=(await f.ok('self','/api/profiles/me',body)).profile;
 assert.equal(again.revision,first.revision);assert.equal(changes().length,events);assert.equal(events,initialEvents+3);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM media_cleanup').get().n,cleanups);assert.equal(cleanups,1);assert.equal(f.sqlite.prepare('SELECT state FROM media_assets WHERE id=?').get(newMedia).state,'ready');assert.equal(f.sqlite.prepare('SELECT state FROM media_assets WHERE id=?').get(oldMedia).state,'deleting');assert.deepEqual(again.showcaseSlots,patch.showcaseSlots);
}finally{f.sqlite.close();}});

test('a commit-time same-field race rejects all profile, media and author changes atomically',async()=>{const f=await fixture();try{
 const changes=history(f),old=(await f.ok('self','/api/profiles/me')).profile,media=stagedImage(f,'avatar','a');
 f.db.beforeBatch=()=>{f.db.beforeBatch=null;f.sqlite.prepare("UPDATE live_accounts SET bio='Concurrent committed bio' WHERE id='self'").run();};
 const response=await f.call('self','/api/profiles/me',{bio:'Must not replace it',avatarMediaId:media,expectedRevision:old.revision,baseValues:{bio:old.bio,avatarMediaId:null}});
 assert.equal(response.status,409);assert.equal(response.data.error.code,'profile_conflict');assert.equal(response.data.profile.bio,'Concurrent committed bio');assert.equal(f.sqlite.prepare('SELECT state FROM media_assets WHERE id=?').get(media).state,'staged');assert.equal(changes().length,0);assert.equal(f.sqlite.prepare("SELECT write_token FROM profile_save_state WHERE account_id='self'").get().write_token,'');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM profile_preferences').get().n,0);
}finally{f.sqlite.close();}});

test('gift ownership lost immediately before commit prevents the entire combined save',async()=>{const f=await fixture();try{
 const old=(await f.ok('self','/api/profiles/me')).profile,instance=gift(f),patch={bio:'Do not publish this',showcaseSlots:[{slot:1,instanceId:instance,showSender:true}]};
 f.db.beforeBatch=()=>{f.db.beforeBatch=null;f.sqlite.prepare("UPDATE gift_instances SET owner_id='friend' WHERE id=?").run(instance);};
 const response=await f.call('self','/api/profiles/me',{...patch,expectedRevision:old.revision,baseValues:baseFor(old,patch)});assert.equal(response.status,403);assert.equal(response.data.error.code,'instance_not_owned');assert.equal(f.sqlite.prepare("SELECT bio FROM live_accounts WHERE id='self'").get().bio,'');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM gift_showcase').get().n,0);
}finally{f.sqlite.close();}});

test('a failed combined transaction restores its gate, old media, author history, showcase and equipped choice',async()=>{const f=await fixture();try{
 const changes=history(f),oldMedia=stagedImage(f,'avatar','a');await f.ok('self','/api/profiles/me',{avatarMediaId:oldMedia});const old=(await f.ok('self','/api/profiles/me')).profile,token=f.sqlite.prepare("SELECT write_token FROM profile_save_state WHERE account_id='self'").get().write_token,events=changes().length,media=stagedImage(f,'avatar','b'),instance=gift(f);ownDecoration(f);
 f.db.fail='INSERT INTO gift_showcase';const patch={displayName:'Must roll back',avatarMediaId:media,equippedId:'larp',showcaseSlots:[{slot:1,instanceId:instance,showSender:false}]};const response=await f.call('self','/api/profiles/me',{...patch,expectedRevision:old.revision,baseValues:baseFor(old,patch)});
 assert.equal(response.status,503);assert.equal(f.sqlite.prepare("SELECT display_name FROM live_accounts WHERE id='self'").get().display_name,old.displayName);assert.equal(f.sqlite.prepare('SELECT state FROM media_assets WHERE id=?').get(oldMedia).state,'ready');assert.equal(f.sqlite.prepare('SELECT state FROM media_assets WHERE id=?').get(media).state,'staged');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM media_cleanup').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM gift_showcase').get().n,0);assert.equal(f.sqlite.prepare("SELECT write_token FROM profile_save_state WHERE account_id='self'").get().write_token,token);assert.equal(changes().length,events);assert.equal(f.sqlite.prepare("SELECT equipped_id FROM cosmetic_profiles WHERE account_id='self'").get()?.equipped_id||null,null);
}finally{f.sqlite.close();}});

test('an expected-revision-only client cannot replace a newer saved profile',async()=>{const f=await fixture();try{
 const old=(await f.ok('self','/api/profiles/me')).profile;await f.ok('self','/api/profiles/me',{bio:'New server value'});const r=await f.call('self','/api/profiles/me',{avatar:'ghost',expectedRevision:old.revision});assert.equal(r.status,409);assert.equal(r.data.error.code,'profile_conflict');assert.equal(r.data.profile.avatar,'moon');assert.equal(r.data.profile.bio,'New server value');
}finally{f.sqlite.close();}});

test('all supported fields fit D1 binding limits and a single atomic profile save',async()=>{const f=await fixture();try{
 await f.ok('self','/api/profiles/me',{bio:'An authored profile sufficiently long.',avatar:'leaf'});ownDecoration(f);for(const id of ['fixture-two','fixture-three']){f.sqlite.prepare("INSERT INTO badge_definitions(id,name,description,requirement,rule,active,created_at,updated_at) VALUES(?,?,'Fixture award','Reviewed fixture','manual',1,1,1)").run(id,id);f.sqlite.prepare("INSERT INTO badge_awards(id,account_id,badge_id,issued_at,reason) VALUES(?,'self',?,1,'Isolated legitimate award fixture')").run('award-'+id,id);}const slots=[1,2,3].map(slot=>({slot,instanceId:gift(f,'instance-'+slot),showSender:slot===1})),old=(await f.ok('self','/api/profiles/me')).profile;
 const patch={displayName:'Complete profile',bio:'A changed and completed profile.',status:'Afterhours',avatar:'ghost',banner:'noise',accent:'gold',detailsVisibility:'public',collectionVisibility:'public',animationEnabled:true,badgeOrder:['profile-authored','fixture-two','fixture-three'],avatarMediaId:stagedImage(f,'avatar','a'),bannerMediaId:stagedImage(f,'banner','b'),nameStyle:'mono',profileFrame:'line',equippedId:'larp',showcaseSlots:slots};
 const result=(await f.ok('self','/api/profiles/me',{...patch,expectedRevision:old.revision,baseValues:baseFor(old,patch)})).profile;for(const[key,value]of Object.entries(patch))assert.deepEqual(result[key],value,key);assert.ok(f.db.maxBindings<=100,'Every prepared statement must stay within D1 bind limits.');
}finally{f.sqlite.close();}});

test('styles are curated and follow profile-details visibility, without granting a role',async()=>{const f=await fixture();try{
 for(const patch of [{nameStyle:'arbitrary-css'},{profileFrame:'<script>'},{role:'platform-owner'}])assert.equal((await f.call('self','/api/profiles/me',patch)).status,400);
 await f.ok('self','/api/profiles/me',{nameStyle:'serif',profileFrame:'halo',detailsVisibility:'private'});const own=(await f.ok('self','/api/profiles/me')).profile,friend=(await f.ok('friend','/api/profiles/self')).profile;assert.equal(own.nameStyle,'serif');assert.equal(own.role,null);assert.equal(friend.nameStyle,undefined);assert.equal(friend.profileFrame,undefined);
}finally{f.sqlite.close();}});

test('pending-transfer gifts cannot be newly showcased but existing owned slots may stay',async()=>{const f=await fixture();try{
 const instance=gift(f);f.sqlite.prepare("UPDATE gift_instances SET pending_transfer_id='pending-fixture' WHERE id=?").run(instance);const patch={showcaseSlots:[{slot:1,instanceId:instance,showSender:false}]};assert.equal((await f.call('self','/api/profiles/me',patch)).status,403);
 f.sqlite.prepare('INSERT INTO gift_showcase(account_id,slot,instance_id,show_sender) VALUES(?,?,?,0)').run('self',1,instance);const own=(await f.ok('self','/api/profiles/me')).profile;assert.deepEqual((await f.ok('self','/api/profiles/me',{...patch,expectedRevision:own.revision,baseValues:{showcaseSlots:own.showcaseSlots}})).profile.showcaseSlots,patch.showcaseSlots);
}finally{f.sqlite.close();}});


test('own profile reads retry when a concurrent commit would pair old fields with a new revision',async()=>{const f=await fixture();try{
 let changed=false;f.db.afterRead=sql=>{if(!changed&&sql==='SELECT * FROM profile_preferences WHERE account_id=?'){changed=true;f.db.afterRead=null;f.sqlite.prepare("UPDATE live_accounts SET bio='Committed during read' WHERE id='self'").run();f.sqlite.prepare("INSERT INTO profile_preferences(account_id,name_style,updated_at) VALUES('self','mono',1)").run();}};
 const profile=(await f.ok('self','/api/profiles/me')).profile;assert.equal(changed,true);assert.equal(profile.bio,'Committed during read');assert.equal(profile.nameStyle,'mono');assert.equal(profile.revision,f.sqlite.prepare("SELECT revision FROM profile_save_state WHERE account_id='self'").get().revision);
}finally{f.sqlite.close();}});

test('integrated showcase sender choice is private in the editor until explicitly published and blocking suppresses it',async()=>{const f=await fixture();try{
 const sent=(await f.ok('friend','/api/cosmetics/gifts',{catalogId:'gift-rose',username:'self',clientId:'atomic-showcase-sender'})).gift;await f.ok('self','/api/cosmetics/gifts/'+sent.id+'/open',{});const instance=(await f.ok('self','/api/cosmetics/inventory')).instances[0],slots=[{slot:1,instanceId:instance.id,showSender:false}];
 const own=(await f.ok('self','/api/profiles/me',{detailsVisibility:'public',collectionVisibility:'public',showcaseSlots:slots})).profile;
 assert.equal(own.showcase[0].sender_username,'friend');assert.equal(own.showcase[0].senderDisclosureAvailable,true);assert.equal((await f.ok('stranger','/api/profiles/self')).profile.showcase[0].sender_username,null);
 const shown=[{...slots[0],showSender:true}];await f.ok('self','/api/profiles/me',{showcaseSlots:shown,expectedRevision:own.revision,baseValues:{showcaseSlots:slots}});assert.equal((await f.ok('stranger','/api/profiles/self')).profile.showcase[0].sender_username,'friend');
 f.sqlite.prepare("INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES('self','friend',1)").run();const hidden=(await f.ok('self','/api/profiles/me')).profile.showcase[0];assert.equal(hidden.sender_username,null);assert.equal(hidden.senderDisclosureAvailable,false);assert.equal((await f.ok('stranger','/api/profiles/self')).profile.showcase[0].sender_username,null);
}finally{f.sqlite.close();}});


function nativeHistory(f){const id=crypto.randomUUID();f.sqlite.prepare("INSERT INTO native_conversations(id,kind,name,owner_id,created_by,client_id,request_hash,created_at,updated_at) VALUES(?,'group','Identity fixture','self','self',?,'fixture',1,1)").run(id,'create-'+id);for(const account of ['self','friend'])f.sqlite.prepare('INSERT INTO native_members(conversation_id,account_id,joined_at) VALUES(?,?,1)').run(id,account);const ids=[];for(let n=0;n<3;n++){const mid=crypto.randomUUID();ids.push(mid);f.sqlite.prepare("INSERT INTO native_messages(id,conversation_id,author_id,client_id,text,original_hash,created_at) VALUES(?,?,'self',?,'Retained original message','fixture',1)").run(mid,id,'send-'+mid);}return{id,ids,events:()=>f.sqlite.prepare("SELECT conversation_id,message_id,actor_id,kind FROM native_changes WHERE conversation_id=? AND kind='profile' ORDER BY seq").all(id)};}

test('native identity events use one latest real anchor per joined conversation and skip private-only or unchanged edits',async()=>{const f=await fixture();try{
 const native=nativeHistory(f);await f.ok('self','/api/profiles/me',{bio:'Only private biography changed',profileFrame:'line'});assert.equal(native.events().length,0);
 await f.ok('self','/api/profiles/me',{displayName:'New native author'});assert.equal(native.events().length,1);assert.equal(native.events()[0].message_id,native.ids.at(-1));assert.equal(native.events()[0].actor_id,'self');
 await f.ok('self','/api/profiles/me',{displayName:'New native author'});assert.equal(native.events().length,1);
 await f.ok('self','/api/live/profile',{avatar:'ghost'});assert.equal(native.events().length,2);
 await f.ok('self','/api/profiles/me',{nameStyle:'mono'});assert.equal(native.events().length,3);
 await f.ok('self','/api/profiles/me',{detailsVisibility:'private'});assert.equal(native.events().length,4);
 await f.ok('self','/api/profiles/me',{collectionVisibility:'public',banner:'noise'});assert.equal(native.events().length,4);
 const plan=f.sqlite.prepare('EXPLAIN QUERY PLAN SELECT id FROM native_messages WHERE author_id=? AND conversation_id=? ORDER BY seq DESC LIMIT 1').all('self',native.id);assert.ok(plan.some(row=>row.detail.includes('native_messages_author_conversation_seq')));
}finally{f.sqlite.close();}});

test('native identity anchors roll back with profile failure and cannot be emitted by revoked sessions',async()=>{const f=await fixture();try{
 const native=nativeHistory(f);f.db.fail='INSERT INTO profile_preferences';assert.equal((await f.call('self','/api/profiles/me',{displayName:'Must roll back'})).status,503);assert.equal(native.events().length,0);f.db.fail='';
 f.db.beforeBatch=()=>{f.db.beforeBatch=null;f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=1 WHERE id=?').run(f.identities.get('self').session);};assert.equal((await f.call('self','/api/profiles/me',{displayName:'Revoked save'})).status,409);assert.equal(native.events().length,0);
}finally{f.sqlite.close();}});

test('profile reads recheck blocks, target suspension and reader session revocation after awaited data reads',async()=>{
 for(const route of ['/api/profiles/self','/api/live/profiles/self'])for(const mutation of ['block','target-suspended','reader-revoked','reader-suspended']){const f=await fixture();try{
  await f.ok('self','/api/profiles/me',{detailsVisibility:'public',bio:'Protected current profile details'});let changed=false;f.db.afterRead=sql=>{if(!changed&&sql==='SELECT * FROM profile_preferences WHERE account_id=?'){changed=true;f.db.afterRead=null;if(mutation==='block')f.sqlite.prepare("INSERT INTO social_blocks VALUES('friend','self',1)").run();else if(mutation==='target-suspended')f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id='self'").run();else if(mutation==='reader-suspended')f.sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id='friend'").run();else f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=1 WHERE id=?').run(f.identities.get('friend').session);}};
  const response=await f.call('friend',route);assert.equal(changed,true);assert.equal(response.status,mutation==='block'?403:mutation==='target-suspended'?404:401,route+' '+mutation);assert.equal(response.data.profile,undefined);
 }finally{f.sqlite.close();}}
});

test('tightened details and showcase audiences during a profile read never return the earlier richer content',async()=>{const f=await fixture();try{
 gift(f);await f.ok('self','/api/profiles/me',{detailsVisibility:'public',collectionVisibility:'public',bio:'Earlier visible biography',nameStyle:'serif',profileFrame:'halo',showcaseSlots:[{slot:1,instanceId:'instance-one',showSender:false}]});let changed=false;
 f.db.afterRead=sql=>{if(!changed&&sql==='SELECT * FROM profile_preferences WHERE account_id=?'){changed=true;f.db.afterRead=null;f.sqlite.prepare("UPDATE profile_preferences SET details_visibility='private',collection_visibility='private' WHERE account_id='self'").run();}};
 const profile=(await f.ok('friend','/api/profiles/self')).profile;assert.equal(changed,true);assert.equal(profile.detailsVisible,false);assert.equal(profile.collectionVisible,false);for(const key of ['bio','status','banner','nameStyle','profileFrame','earnedBadges','showcase']){if(key==='earnedBadges')assert.deepEqual(profile[key],[]);else assert.equal(profile[key],undefined,key);}
}finally{f.sqlite.close();}});

test('displayed public awards preserve their issuing institution without exposing reviewer references or private award notes',async()=>{const f=await fixture();try{
 f.sqlite.prepare("UPDATE live_accounts SET display_name='Private reviewer label' WHERE id='friend'").run();f.sqlite.prepare("INSERT INTO badge_definitions(id,name,description,requirement,rule,active,created_at,updated_at) VALUES('fixture-review','Reviewed contribution','Public meaning','Reviewed contribution','manual',1,1,1)").run();f.sqlite.prepare("INSERT INTO badge_awards(id,account_id,badge_id,issuer_id,issued_at,reason) VALUES('review-fixture','self','fixture-review','friend',1,'Private operational review note')").run();
 const own=(await f.ok('self','/api/profiles/me',{detailsVisibility:'public',badgeOrder:['fixture-review']})).profile;assert.equal(own.earnedBadges[0].issuer_name,'Private reviewer label');assert.equal(own.earnedBadges[0].reason,'Private operational review note');
 const publicAward=(await f.ok('stranger','/api/profiles/self')).profile.earnedBadges[0];assert.equal(publicAward.issuer,'VOIDLINE platform award');assert.equal(publicAward.badge_id,'fixture-review');assert.equal(publicAward.requirement,'Reviewed contribution');assert.equal(publicAward.issued_at,1);for(const key of ['issuer_id','issuer_name','reason'])assert.equal(publicAward[key],undefined);assert.ok(!JSON.stringify(publicAward).includes('Private'));
}finally{f.sqlite.close();}});

let failures=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error.stack);}}console.log(`${tests.length-failures}/${tests.length} profile conflict/atomicity checks passed against actual migrated SQLite and production handlers.`);process.exitCode=failures?1:0;
