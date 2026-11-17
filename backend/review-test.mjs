import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';

// Independent API review against real SQLite. All identities/data are isolated;
// no deployed service, actual account, or contact is involved.
const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
const sqlFor=entry=>readFileSync(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),'utf8');
class DatabaseAdapter {
  constructor(sqlite){this.sqlite=sqlite;}
  prepare(sql){const sqlite=this.sqlite;return {bind(...values){const statement=sqlite.prepare(sql);return {
    first:async()=>statement.get(...values)||null,
    all:async()=>({results:statement.all(...values)}),
    run:async()=>({success:true,meta:{changes:statement.run(...values).changes}}),
  };}};}
  async batch(statements){this.sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.sqlite.exec('COMMIT');return results;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}}
}
function fixture(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
  for(const entry of journal.entries)sqlite.exec(sqlFor(entry));
  const env={DB:new DatabaseAdapter(sqlite)};
  const call=async(user,path,body)=>{
    const headers={'oai-authenticated-user-id':user};
    if(body!==undefined)headers['content-type']='application/json';
    const response=await worker.fetch(new Request('https://review.example/api/live'+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({expectedAccountId:user,...body})})}),env);
    return {status:response.status,data:await response.json()};
  };
  const ok=async(user,path,body)=>{const response=await call(user,path,body);assert.ok(response.status>=200&&response.status<300,`${path}: ${response.status} ${JSON.stringify(response.data)}`);return response.data;};
  let nextClient=0;
  const send=async(user,channel,text,extra={})=>(await ok(user,`/channels/${channel}/messages`,{clientId:`review-client-${++nextClient}`,text,...extra})).message;
  const setup=async()=>{
    for(const user of ['owner','member','stranger'])await ok(user,'/profile',{displayName:user==='member'?'night.window+':'review '+user});
    const created=await ok('owner','/communities',{name:'Private review community'});
    const invite=await ok('owner',`/communities/${created.community.id}/invites`,{maxUses:5});
    await ok('member','/invites/claim',{token:invite.invite.token});
    return {community:created.community.id,channel:created.channel.id};
  };
  return {sqlite,call,ok,send,setup};
}
const tests=[];const test=(name,run)=>tests.push([name,run]);

test('the additive migration preserves existing v6 identities, IDs, history, and memberships',async()=>{
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(sqlFor(journal.entries[0]));
  sqlite.exec(`INSERT INTO live_accounts VALUES ('retained','Old Alias','',1700000000000,1700000000001);
    INSERT INTO live_communities VALUES ('old-community','Existing room','retained',1700000000000);
    INSERT INTO live_memberships VALUES ('old-community','retained','owner',1700000000000);
    INSERT INTO live_channels VALUES ('old-channel','old-community','general','text',1700000000000);
    INSERT INTO live_messages (id,channel_id,author_id,client_id,text,created_at) VALUES ('old-message','old-channel','retained','old-client-id','History survives the upgrade',1700000000002);`);
  for(const entry of journal.entries.slice(1))sqlite.exec(sqlFor(entry));
  assert.equal(sqlite.prepare('SELECT text FROM live_messages WHERE id=?').get('old-message').text,'History survives the upgrade');
  assert.equal(sqlite.prepare('SELECT display_name,bio FROM live_accounts WHERE id=?').get('retained').display_name,'Old Alias');
  assert.equal(sqlite.prepare('SELECT role FROM live_memberships WHERE account_id=?').get('retained').role,'owner');
  assert.equal(sqlite.prepare('SELECT created_at FROM live_messages WHERE id=?').get('old-message').created_at,1700000000002);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[]);sqlite.close();
});

test('private saves and favorites never appear for another account, and revoked membership removes readable sources',async()=>{
  const f=fixture();try{
    const {community,channel}=await f.setup();
    const message=await f.send('owner',channel,'PRIVATE_SOURCE_SENTINEL');
    await f.ok('member',`/messages/${message.id}/save`,{active:true});
    await f.ok('member','/favorites',{channelId:channel,active:true});
    assert.equal(JSON.stringify(await f.ok('owner','/saved')).includes('PRIVATE_SOURCE_SENTINEL'),false);
    assert.equal(JSON.stringify(await f.ok('owner','/favorites')).includes(channel),false);
    assert.equal(JSON.stringify(await f.ok('member','/saved')).includes('PRIVATE_SOURCE_SENTINEL'),true);
    await f.ok('owner',`/communities/${community}/members/member`,{remove:true});
    assert.equal((await f.call('member',`/channels/${channel}/messages`)).status,403);
    for(const endpoint of ['/saved','/search?q=PRIVATE_SOURCE_SENTINEL','/inbox?view=unread','/inbox?view=mentions','/inbox?view=activity']) {
      assert.equal(JSON.stringify(await f.ok('member',endpoint)).includes('PRIVATE_SOURCE_SENTINEL'),false,endpoint);
    }
    assert.equal((await f.call('member',`/messages/${message.id}/save`,{active:true})).status,403);
    assert.equal((await f.call('stranger','/profiles/owner')).status,403);
  }finally{f.sqlite.close();}
});

test('deleted root content stays deleted while surviving thread replies retain their identity and reference',async()=>{
  const f=fixture();try{
    const {channel}=await f.setup();
    const root=await f.send('owner',channel,'ROOT_CONTENT_REMOVED');
    const reply=await f.send('member',channel,'The discussion continues',{threadRootId:root.id,replyToId:root.id});
    await f.ok('member',`/messages/${root.id}/save`,{active:true});
    await f.ok('owner',`/messages/${root.id}/delete`,{});
    const thread=await f.ok('member',`/channels/${channel}/messages?threadRootId=${root.id}`);
    assert.equal(JSON.stringify(thread).includes('ROOT_CONTENT_REMOVED'),false);
    assert.equal(thread.messages.find(message=>message.id===reply.id)?.thread_root_id,root.id);
    assert.equal(JSON.stringify(await f.ok('member','/saved')).includes('ROOT_CONTENT_REMOVED'),false);
    assert.equal(JSON.stringify(await f.ok('member','/search?q=ROOT_CONTENT_REMOVED')).includes('ROOT_CONTENT_REMOVED'),false);
    assert.equal((await f.call('owner',`/messages/${root.id}/edit`,{text:'Resurrection attempt'})).status,409);
  }finally{f.sqlite.close();}
});

test('repeated reaction intent is idempotent and each reader receives their own reaction state',async()=>{
  const f=fixture();try{
    const {channel}=await f.setup();const message=await f.send('owner',channel,'React once');
    await f.ok('member',`/messages/${message.id}/reaction`,{emoji:'💜',active:true});
    await f.ok('member',`/messages/${message.id}/reaction`,{emoji:'💜',active:true});
    const member=(await f.ok('member',`/channels/${channel}/messages`)).messages.find(item=>item.id===message.id);
    const owner=(await f.ok('owner',`/channels/${channel}/messages`)).messages.find(item=>item.id===message.id);
    assert.equal(member.reactions[0].count,1);assert.equal(member.reactions[0].mine,true);assert.equal(owner.reactions[0].mine,false);
    await f.ok('member',`/messages/${message.id}/reaction`,{emoji:'💜',active:false});
    await f.ok('member',`/messages/${message.id}/reaction`,{emoji:'💜',active:false});
    assert.equal((await f.ok('member',`/channels/${channel}/messages`)).messages.find(item=>item.id===message.id).reactions.length,0);
  }finally{f.sqlite.close();}
});

test('a forged future read cursor cannot hide messages arriving later and stale reads cannot move backward',async()=>{
  const f=fixture();try{
    const {channel}=await f.setup();const first=await f.send('owner',channel,'Read this');
    await f.ok('member','/read',{channelId:channel,seq:first.seq});
    const forged=await f.call('member','/read',{channelId:channel,seq:Number.MAX_SAFE_INTEGER});
    assert.ok(forged.status===400||forged.status===200);
    const read=f.sqlite.prepare('SELECT seq FROM live_read_states WHERE channel_id=? AND account_id=?').get(channel,'member');
    assert.equal(read.seq,first.seq);
    const next=await f.send('owner',channel,'NEW_UNREAD_SENTINEL');
    assert.equal(JSON.stringify(await f.ok('member','/inbox?view=unread')).includes('NEW_UNREAD_SENTINEL'),true);
    await f.ok('member','/read',{channelId:channel,seq:next.seq});await f.ok('member','/read',{channelId:channel,seq:first.seq});
    assert.equal(f.sqlite.prepare('SELECT seq FROM live_read_states WHERE channel_id=? AND account_id=?').get(channel,'member').seq,next.seq);
  }finally{f.sqlite.close();}
});

test('search validates dates and honors membership even with literal SQL wildcard characters',async()=>{
  const f=fixture();try{
    const {channel}=await f.setup();await f.send('owner',channel,'percent%mark');await f.send('owner',channel,'percentXmark');
    for(const query of ['before=2026-02-30','after=bad-date','before=2026-01-01&after=2026-02-01'])assert.equal((await f.call('member','/search?'+query)).status,400,query);
    const exact=await f.ok('member','/search?q=percent%25mark');
    assert.equal(JSON.stringify(exact).includes('percent%mark'),true);assert.equal(JSON.stringify(exact).includes('percentXmark'),false);
    assert.equal(JSON.stringify(await f.ok('stranger','/search?q=percent')).includes('percent%mark'),false);
  }finally{f.sqlite.close();}
});

test('new reactions to an old read message create fresh activity without replaying previously acknowledged activity',async()=>{
  const f=fixture();try{
    const {channel}=await f.setup(),message=await f.send('owner',channel,'An old message worth returning to');
    await f.ok('member',`/messages/${message.id}/reaction`,{emoji:'💜',active:true});
    const first=(await f.ok('owner','/inbox?view=activity')).items.find(item=>item.id===message.id);
    assert.ok(Number.isSafeInteger(first.activity_seq));
    await f.ok('owner','/read',{channelId:channel,seq:message.seq,changeSeq:first.activity_seq});
    assert.equal((await f.ok('owner','/inbox?view=activity')).items.length,0);
    await f.ok('member',`/messages/${message.id}/reaction`,{emoji:'🔥',active:true});
    const second=(await f.ok('owner','/inbox?view=activity')).items.find(item=>item.id===message.id);
    assert.ok(second.activity_seq>first.activity_seq);
    await f.ok('owner','/read',{channelId:channel,seq:message.seq,changeSeq:first.activity_seq});
    assert.equal((await f.ok('owner','/inbox?view=activity')).items.find(item=>item.id===message.id).activity_seq,second.activity_seq);
    await f.ok('owner','/read',{channelId:channel,seq:message.seq,changeSeq:second.activity_seq});
    assert.equal((await f.ok('owner','/inbox?view=activity')).items.length,0);
  }finally{f.sqlite.close();}
});

test('literal punctuation aliases match complete mentions after partial names without inventing partial-name mentions',async()=>{
  const f=fixture();try{
    const {channel}=await f.setup();
    const valid=await f.send('owner',channel,'@night.window+long is someone else; @night.window+, this is for you.');
    await f.send('owner',channel,'Partial @night.window+long and mail@night.window+ do not mention you.');
    const mentions=await f.ok('member','/inbox?view=mentions');
    assert.deepEqual(mentions.items.map(message=>message.id),[valid.id]);
  }finally{f.sqlite.close();}
});

let failed=0;
for(const [name,run] of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${tests.length-failed}/${tests.length} independent migration/privacy/integrity checks passed. Synthetic identities only; no hosted two-account claim.`);
process.exitCode=failed?1:0;
