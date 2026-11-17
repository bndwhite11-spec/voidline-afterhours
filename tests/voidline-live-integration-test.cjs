'use strict';
// Real authored browser modules -> real Worker handler -> migrated SQLite.
// DOM geometry and platform sign-in are deliberately outside this test.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {DatabaseSync}=require('node:sqlite');
const {client}=require('./live-upgrade-fixture.cjs');

(async()=>{
 const worker=(await import('../worker/index.mjs')).default;
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 const journal=JSON.parse(fs.readFileSync(path.join(__dirname,'../drizzle/meta/_journal.json'),'utf8'));
 for(const migration of journal.entries)sqlite.exec(fs.readFileSync(path.join(__dirname,'../drizzle',migration.tag+'.sql'),'utf8'));
 const env={DB:{prepare(sql){return {bind(...values){const statement=sqlite.prepare(sql);return {
  first:async()=>statement.get(...values)||null,
  all:async()=>({results:statement.all(...values)}),
  run:async()=>({success:true,meta:{changes:statement.run(...values).changes}})
 };}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}}};
 const transport=user=>({fetch:async(url,options={})=>worker.fetch(new Request(new URL(url,'https://voidline.example'),{...options,headers:{...options.headers,'oai-authenticated-user-id':user}}),env)});
 const call=async(user,route,body)=>{const response=await transport(user).fetch('/api/live'+route,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,expectedAccountId:user})});const data=await response.json();assert.ok(response.ok,`${route}: ${response.status} ${JSON.stringify(data)}`);return data;};
 try {
  await call('integration-owner','/profile',{displayName:'Night.owner+'});
  await call('integration-member','/profile',{displayName:'Night.member+'});
  const created=await call('integration-owner','/communities',{name:'Isolated integration room'}),channel=created.channel.id;
  const invitation=await call('integration-owner',`/communities/${created.community.id}/invites`,{maxUses:1});
  await call('integration-member','/invites/claim',{token:invitation.invite.token});
  const owner=client(transport('integration-owner')),member=client(transport('integration-member'));
  for(const app of [owner,member]){await app.live.open();assert.equal(app.shared.state.phase,'ready');assert.equal(app.shared.state.channelId,channel);}
  await owner.write('One real durable signal');await owner.shared.send();
  const root=owner.shared.room().messages.find(message=>message.text==='One real durable signal');assert.ok(root);assert.equal(owner.shared.room().pending.length,0);
  await member.shared.poll();assert.equal(member.shared.room().messages[0].id,root.id);
  console.log('PASS two isolated browser-module identities exchange real Worker/SQLite acknowledgments and polling data');

  await member.shared.openThread(root.id);member.shared.messageAction('reply',root.id);
  await member.write('Thread response for @Night.owner+');await member.shared.send();
  const reply=member.shared.activeRoom().messages.find(message=>message.text.startsWith('Thread response'));assert.equal(reply.thread_root_id,root.id);assert.equal(reply.reply_to_id,root.id);
  await owner.shared.openThread(root.id);await owner.write('An unsent thread thought');const input=owner.get('live-message-input');
  await member.shared.mutateMessage(reply,'edit',{text:'Edited thread response for @Night.owner+'});await owner.shared.poll();
  assert.equal(owner.get('live-message-input'),input);assert.equal(input.value,'An unsent thread thought');assert.match(owner.shared.activeRoom().messages.find(message=>message.id===reply.id).text,/^Edited/);
  await owner.shared.mutateMessage(owner.shared.activeRoom().messages.find(message=>message.id===reply.id),'reaction',{emoji:'💜',active:true});await member.shared.poll();
  assert.equal(member.shared.activeRoom().messages.find(message=>message.id===reply.id).reactions[0].count,1);
  assert.equal(member.shared.activeRoom().messages.find(message=>message.id===reply.id).reactions[0].mine,false);
  console.log('PASS shared thread replies, edits and reaction counts round-trip through actual API while the composer stays intact');

  // The actual tools module supplies the bookmark mutation, including account
  // binding through VoidLive.request. No substitute API response is used.
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/live-tools.js'),'utf8'),member.context,{filename:'dist/live-tools.js'});
  await member.window.VoidLiveTools.save(reply);
  const saved=await call('integration-member','/saved');assert.equal(saved.total,1);assert.equal(saved.messages[0].id,reply.id);
  assert.equal((await call('integration-owner','/saved')).total,0);
  const search=await member.live.request('/search?q=Edited&limit=1&offset=0');assert.equal(search.total,1);assert.equal(search.messages[0].thread_root_id,root.id);
  const inbox=await owner.live.request('/inbox?view=mentions');assert.ok(inbox.items.some(message=>message.id===reply.id));
  const activity=await owner.live.request('/inbox?view=activity');assert.ok(activity.items.length);
  await owner.live.request('/read',{channelId:channel,seq:reply.seq,changeSeq:Math.max(...activity.items.map(message=>message.activity_seq))});
  assert.equal((await owner.live.request('/inbox?view=mentions')).total,0);
  console.log('PASS account tools use real private bookmarks, exact thread search, punctuated mentions and deliberate read watermarks');

  await owner.shared.mutateMessage(root,'delete',{});await member.shared.poll();
  assert.ok(member.shared.room(channel).messages.find(message=>message.id===root.id).deleted_at);
  assert.equal(member.shared.activeRoom().messages.find(message=>message.id===reply.id).reply_preview.text,'');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM live_messages').get().n,2);
  console.log('PASS deleting a root synchronizes tombstones without removing or duplicating its reply');
  console.log('4/4 cross-layer checks passed. Synthetic identities and VM DOM; not a hosted two-account or visual test.');
 }finally{sqlite.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
