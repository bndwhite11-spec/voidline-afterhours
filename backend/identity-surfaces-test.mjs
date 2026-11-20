import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {authHash} from '../worker/auth.mjs';
import {handleMessagesRequest} from '../worker/messages.mjs';
import {handleSocialRequest} from '../worker/social.mjs';
import {handleLiveRequest} from '../worker/index.mjs';
import {profileAvatarsForViewer} from '../worker/identity.mjs';
const origin='https://identity-surfaces.example',cases=[],test=(name,run)=>cases.push([name,run]);
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 let queries=0;
 const db={prepare(sql){return {bind(...values){assert(values.length<=100,'D1 parameter budget');const statement=sqlite.prepare(sql);return {first:async()=>{queries++;return statement.get(...values)||null;},all:async()=>{queries++;return {results:statement.all(...values)};},run:async()=>({success:true,meta:{changes:statement.run(...values).changes}})};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const now=Date.now(),identities=new Map(),images={owner:'a'.repeat(64),friend:'b'.repeat(64),groupmate:'c'.repeat(64),stranger:'d'.repeat(64)};
 for(const [index,id]of ['owner','friend','groupmate','stranger'].entries()){
  sqlite.prepare('INSERT INTO live_accounts(id,username,display_name,avatar,onboarding_complete,created_at,updated_at) VALUES(?,?,?,?,1,?,?)').run(id,'identity_'+id,'Identity '+id,['moon','leaf','ghost','spark'][index],now,now);
  sqlite.prepare("INSERT INTO media_assets(id,owner_id,client_id,object_key,sha256,kind,content_type,filename,bytes,width,height,state,created_at,updated_at) VALUES(?,?,?,?,?,'avatar','image/gif','profile.gif',64,8,8,'ready',?,?)").run(images[id],id,crypto.randomUUID(),'identity/'+id,'f'.repeat(64),now,now);
  sqlite.prepare('INSERT INTO profile_preferences(account_id,avatar_media_id,details_visibility,name_style,updated_at) VALUES(?,?,?,?,?)').run(id,images[id],id==='stranger'?'public':id==='groupmate'?'private':'friends',id==='stranger'?'mono':'serif',now);
  const token='f'.repeat(32)+crypto.randomUUID().replaceAll('-',''),csrf='e'.repeat(32)+crypto.randomUUID().replaceAll('-',''),sessionId=crypto.randomUUID();
  sqlite.prepare('INSERT INTO auth_sessions(id,account_id,token_hash,csrf_hash,device_name,created_at,last_active_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').run(sessionId,id,await authHash(token),await authHash(csrf),'Identity fixture',now,now,now,now+3600000);identities.set(id,{token,csrf});
 }
 sqlite.prepare("INSERT INTO social_requests(id,sender_id,recipient_id,state,created_at,updated_at) VALUES('friendship','owner','friend','accepted',?,?)").run(now,now);
 const group=crypto.randomUUID();sqlite.prepare("INSERT INTO native_conversations(id,kind,name,created_by,owner_id,client_id,request_hash,created_at,updated_at) VALUES(?,'group','A real group','owner','owner',?,'fixture',?,?)").run(group,crypto.randomUUID(),now,now);
 for(const id of ['owner','friend','groupmate'])sqlite.prepare('INSERT INTO native_members(conversation_id,account_id,joined_at) VALUES(?,?,?)').run(group,id,now);
 const nativeMessage=crypto.randomUUID();sqlite.prepare("INSERT INTO native_messages(id,conversation_id,author_id,client_id,text,original_hash,created_at) VALUES(?,?,'friend',?,'A real author message','fixture',?)").run(nativeMessage,group,crypto.randomUUID(),now);
 sqlite.prepare("INSERT INTO live_communities(id,name,created_by,created_at) VALUES('community','Community','owner',?)").run(now);
 for(const [id,role]of [['owner','owner'],['friend','member']])sqlite.prepare("INSERT INTO live_memberships(community_id,account_id,role,joined_at) VALUES('community',?,?,?)").run(id,role,now);
 sqlite.prepare("INSERT INTO live_channels(id,community_id,name,kind,created_at) VALUES('channel','community','general','text',?)").run(now);
 sqlite.prepare("INSERT INTO live_messages(id,channel_id,author_id,client_id,text,created_at) VALUES('community-message','channel','friend','identity-message','Community author',?)").run(now);
 async function call(id,path){const user=identities.get(id),handler=path.startsWith('/api/messages')?handleMessagesRequest:path.startsWith('/api/social')?handleSocialRequest:handleLiveRequest;
  const response=await handler(new Request(origin+path,{headers:{cookie:`__Host-voidline_session=${user.token}; __Host-voidline_csrf=${user.csrf}`}}),{DB:db});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;}
 return {sqlite,db,call,group,nativeMessage,images,get queries(){return queries;}};
}

test('account identity projection follows profile access and richer name styles obey the selected audience',async()=>{
 const f=await fixture();try{
  const projected=await profileAvatarsForViewer(f.db,'owner',['owner','friend','groupmate','stranger']);
  assert.equal(projected.get('friend').avatar,'leaf');assert.equal(projected.get('friend').avatarMedia.url,'/api/media/'+f.images.friend);assert.equal(projected.get('friend').nameStyle,'serif');
  assert.equal(projected.has('groupmate'),false,'native group membership alone grants no profile access');assert.equal(projected.get('stranger').nameStyle,'mono');
  f.sqlite.prepare("UPDATE profile_preferences SET details_visibility='private' WHERE account_id='friend'").run();const privateFriend=(await profileAvatarsForViewer(f.db,'owner',['friend'])).get('friend');assert.equal(privateFriend.nameStyle,'plain');assert.equal(privateFriend.avatarMedia.id,f.images.friend,'existing basic friend avatar identity remains available');
  f.sqlite.prepare("INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES('friend','owner',?)").run(Date.now());assert.equal((await profileAvatarsForViewer(f.db,'owner',['friend'])).size,0);
 }finally{f.sqlite.close();}
});
test('native group participants and authors return the same projected avatar without choosing another group member as its identity',async()=>{
 const f=await fixture();try{
  const conversation=(await f.call('owner','/api/messages/conversations/'+f.group)).conversation;
  const friend=conversation.participants.find(person=>person.id==='friend'),groupmate=conversation.participants.find(person=>person.id==='groupmate');assert.equal(friend.avatarMedia.id,f.images.friend);assert.equal(friend.nameStyle,'serif');assert.equal(groupmate.avatar,null);assert.equal(groupmate.avatarMedia,null);assert.equal(groupmate.profileAvailable,false);
  const message=(await f.call('owner','/api/messages/conversations/'+f.group+'/messages')).messages.find(row=>row.id===f.nativeMessage);assert.equal(message.author_avatar,'leaf');assert.equal(message.authorAvatarMedia.id,friend.avatarMedia.id);assert.equal(message.author_name_style,friend.nameStyle);
  f.sqlite.prepare("INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES('owner','friend',?)").run(Date.now());const hidden=(await f.call('owner','/api/messages/conversations/'+f.group+'/messages')).messages.find(row=>row.id===f.nativeMessage);assert.equal(hidden.author_avatar,null);assert.equal(hidden.author_avatar_media_id,null);assert.equal(hidden.authorAvatarMedia,null);assert.equal(hidden.author_name_style,'plain');
 }finally{f.sqlite.close();}
});
test('community member lists, messages and friend lists share permission-projected identity fields',async()=>{
 const f=await fixture();try{
  const person=(await f.call('owner','/api/social')).friends[0],member=(await f.call('owner','/api/live/communities/community/members')).members.find(row=>row.id==='friend'),message=(await f.call('owner','/api/live/channels/channel/messages')).messages[0];
  for(const row of [person,member]){assert.equal(row.avatar,'leaf');assert.equal(row.avatarMedia.id,f.images.friend);assert.equal(row.nameStyle,'serif');assert.equal(row.profileAvailable,true);}
  assert.equal(message.author_avatar,'leaf');assert.equal(message.authorAvatarMedia.id,f.images.friend);assert.equal(message.author_name_style,'serif');
  f.sqlite.prepare("UPDATE profile_preferences SET details_visibility='private' WHERE account_id='friend'").run();assert.equal((await f.call('owner','/api/social')).friends[0].nameStyle,'plain');assert.equal((await f.call('owner','/api/live/communities/community/members')).members.find(row=>row.id==='friend').nameStyle,'plain');
 }finally{f.sqlite.close();}
});
test('identity projection remains bounded by batch count rather than one network query per rendered author',async()=>{
 const f=await fixture();try{const now=Date.now(),ids=[];for(let i=0;i<100;i++){const id='public-'+i;ids.push(id);f.sqlite.prepare("INSERT INTO live_accounts(id,username,display_name,avatar,onboarding_complete,created_at,updated_at) VALUES(?,?,?,'leaf',1,?,?)").run(id,'public_'+i,'Public '+i,now,now);f.sqlite.prepare("INSERT INTO profile_preferences(account_id,details_visibility,updated_at) VALUES(?,'public',?)").run(id,now);}const before=f.queries,result=await profileAvatarsForViewer(f.db,'owner',ids);assert.equal(result.size,100);assert.equal(f.queries-before,4,'two batched projection/media queries per 80 identities');}finally{f.sqlite.close();}
});
test('native profile cursor events return current author projections without adding an unseen anchor to message history',async()=>{
 const f=await fixture();try{
  const high=f.sqlite.prepare('SELECT COALESCE(MAX(seq),0) AS seq FROM native_changes WHERE conversation_id=?').get(f.group).seq,last=f.sqlite.prepare('SELECT seq FROM native_messages WHERE id=?').get(f.nativeMessage).seq;
  f.sqlite.prepare("UPDATE live_accounts SET display_name='A new author identity' WHERE id='friend'").run();f.sqlite.prepare("UPDATE profile_preferences SET name_style='mono' WHERE account_id='friend'").run();f.sqlite.prepare("INSERT INTO native_changes(conversation_id,message_id,actor_id,kind,created_at) VALUES(?,?,'friend','profile',?)").run(f.group,f.nativeMessage,Date.now());
  const page=await f.call('owner','/api/messages/conversations/'+f.group+'/messages?after='+last+'&changesAfter='+high+'&limit=100');assert.deepEqual(page.messages,[]);assert.deepEqual(page.changes,[]);assert.equal(page.authorProfiles.length,1);const author=page.authorProfiles[0];assert.equal(author.author_id,'friend');assert.equal(author.author_name,'A new author identity');assert.equal(author.author_name_style,'mono');assert.equal(author.authorAvatarMedia.id,f.images.friend);assert.equal(author.authorRevision,f.sqlite.prepare("SELECT revision FROM profile_save_state WHERE account_id='friend'").get().revision);assert.equal(Object.hasOwn(author,'text'),false);assert.equal(Object.hasOwn(author,'id'),false);assert.equal(page.changesHasMore,false);assert.ok(page.changeCursor>high);
  const initial=await f.call('owner','/api/messages/conversations/'+f.group+'/messages');assert.equal(initial.messages[0].authorRevision,author.authorRevision);
  f.sqlite.prepare("INSERT INTO social_blocks(blocker_id,blocked_id,created_at) VALUES('owner','friend',?)").run(Date.now());const blocked=(await f.call('owner','/api/messages/conversations/'+f.group+'/messages?after='+last+'&changesAfter='+high+'&limit=100')).authorProfiles[0];assert.equal(blocked.authorAvatarMedia,null);assert.equal(blocked.author_avatar,null);assert.equal(blocked.author_name_style,'plain');assert.equal(blocked.authorRevision,author.authorRevision);
 }finally{f.sqlite.close();}
});
let failed=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error);}}
console.log(`${cases.length-failed}/${cases.length} identity surface checks passed against actual handlers and migrated SQLite. No browser or Matrix identity inference.`);process.exitCode=failed?1:0;
