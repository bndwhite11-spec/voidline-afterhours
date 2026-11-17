'use strict';
const assert = require('node:assert/strict');
const {client,server,open,response,pendingWait,accountA,accountB} = require('./live-upgrade-fixture.cjs');
const tests=[]; const test=(name,fn)=>tests.push([name,fn]);
function service() {
 const s=server(), baseFetch=s.fetch, baseAdd=s.add; s.changes=[];s.version=0;
 s.add=(channel,body,author=s.account.id)=>{
  const result=baseAdd(channel,body,author);
  if(result.change_seq===undefined)Object.assign(result,{reply_to_id:body.replyToId||null,thread_root_id:body.threadRootId||null,community_id:channel==='channel-b-1'?'community-b':'community-a',change_seq:++s.version,reactions:[],saved:false,pinned:false,edited_at:null,deleted_at:null});
  if(!s.changes.some(c=>c.cursor===result.change_seq))s.changes.push({cursor:result.change_seq,message:{...result}});
  return result;
 };
 s.edit=(message,patch)=>{Object.assign(message,patch,{change_seq:++s.version});s.changes.push({cursor:s.version,message:{...message}});return message;};
 s.find=id=>[...s.messages.values()].flat().find(m=>m.id===id);
 s.fetch=async(url,options={})=>{
  const u=new URL(url,'https://voidline.example'),path=u.pathname.replace('/api/live',''),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
  // Deferred responses must be resolved by the existing fixture before our extensions.
  if(s.overrides.some(x=>x.method===method&&x.pathname===path))return baseFetch(url,options);
  let m=path.match(/^\/messages\/([^/]+)(?:\/(edit|delete|reaction|pin|save))?$/);
  if(m){
   s.calls.push({pathname:path,method,body,search:u.search});const message=s.find(m[1]);
   if(!message)return response({error:{message:'Unavailable source'}},404);
   if(method==='GET')return response({message});
   if(body.expectedAccountId!==s.account.id)return response({error:{code:'account_changed',message:'Account changed'}},409);
   if(m[2]==='edit')s.edit(message,{text:body.text,edited_at:Date.now()});
   if(m[2]==='delete')s.edit(message,{text:'',deleted_at:Date.now()});
   if(m[2]==='reaction')s.edit(message,{reactions:body.active?[{emoji:body.emoji,count:1,mine:true}]:[]});
   if(m[2]==='pin')s.edit(message,{pinned:body.active});
   if(m[2]==='save')s.edit(message,{saved:body.active});
   return response({acknowledged:true,message});
  }
  m=path.match(/^\/channels\/([^/]+)\/(messages|changes)$/);
  if(m&&method==='GET'){
   s.calls.push({pathname:path,method,body,search:u.search});
   if(m[2]==='changes'){const rows=s.changes.filter(c=>c.cursor>Number(u.searchParams.get('after'))&&c.message.channel_id===m[1]);return response({messages:rows.map(c=>c.message),cursor:s.version,hasMore:false});}
   let rows=(s.messages.get(m[1])||[]).filter(m=>(m.thread_root_id||'')===(u.searchParams.get('threadRootId')||''));
   if(u.searchParams.has('before'))rows=rows.filter(m=>m.seq<Number(u.searchParams.get('before')));
   if(u.searchParams.has('after'))rows=rows.filter(m=>m.seq>Number(u.searchParams.get('after')));
   const limit=Number(u.searchParams.get('limit'))||50, more=rows.length>limit;
   rows=u.searchParams.has('after')?rows.slice(0,limit):rows.slice(-limit);
   return response({messages:rows,page:{hasMore:more},changeCursor:s.version});
  }
  return baseFetch(url,options);
 };
 return s;
}
function seed(s,n=1,channel='channel-a-1') {return Array.from({length:n},(_,i)=>s.add(channel,{clientId:'seed_'+channel+'_'+i,text:'Message '+i}));}

test('read-only announcements retain reading position without a composer',async()=>{
 const s=service();s.communities[0].role='member';s.channels['community-a'][0].kind='announcement';seed(s,60);
 const app=client(s);await open(app);assert.equal(app.document.getElementById('live-message-input'),null);
 const feed=app.get('live-stream');feed.scrollTop=120;feed.scrollHeight=2000;feed.clientHeight=500;
 app.shared.captureDraft();assert.equal(app.shared.room().reading.top,120);assert.equal(app.shared.room().reading.bottom,false);
 await app.shared.selectChannel('channel-a-2');await app.shared.selectChannel('channel-a-1');
 assert.equal(app.get('live-stream').scrollTop,120);
});

test('main and thread drafts, reply target, and pending IDs survive refresh independently',async()=>{
 const s=service(),[root]=seed(s),storage=new Map(),app=client(s,storage);await open(app);
 await app.write('Main draft');await app.shared.openThread(root.id);await app.write('Thread draft');
 app.shared.messageAction('reply',root.id);app.shared.captureDraft();
 await app.shared.closeThread();assert.equal(app.get('live-message-input').value,'Main draft');
 await app.shared.openThread(root.id);assert.equal(app.get('live-message-input').value,'Thread draft');assert.equal(app.shared.activeRoom().replyToId,root.id);
 app.shared.captureDraft();const restored=client(s,storage);await restored.live.open();
 assert.equal(restored.shared.state.threadRootId,root.id);assert.equal(restored.get('live-message-input').value,'Thread draft');
 assert.equal(restored.shared.activeRoom().replyToId,root.id);
 await restored.shared.closeThread();assert.equal(restored.get('live-message-input').value,'Main draft');
});
test('thread acknowledgment after navigation does not overwrite the main draft',async()=>{
 const s=service(),[root]=seed(s),app=client(s);await open(app);await app.shared.openThread(root.id);
 const held=s.defer('POST','/channels/channel-a-1/messages');await app.write('Thread send');const task=app.shared.send();
 await pendingWait(()=>s.calls.some(c=>c.method==='POST'));const payload=s.calls.find(c=>c.method==='POST').body;
 await app.shared.closeThread();await app.write('Main remains here');
 held.release({acknowledged:true,message:s.add('channel-a-1',payload)});await task;
 assert.equal(app.get('live-message-input').value,'Main remains here');assert.equal(app.shared.state.threadRootId,'');
 assert.equal(app.shared.room('channel-a-1',root.id).pending.length,0);assert.equal(app.shared.room('channel-a-1',root.id).messages[0].text,'Thread send');
});
test('reply sends and account-backed actions apply only after confirmed server responses',async()=>{
 const s=service(),[root]=seed(s),app=client(s);await open(app);app.shared.messageAction('reply',root.id);await app.write('Context reply');await app.shared.send();
 const reply=app.shared.room().messages.find(m=>m.text==='Context reply');assert.equal(reply.reply_to_id,root.id);
 const message=app.shared.room().messages[0];
 await app.shared.mutateMessage(message,'edit',{text:'Edited text'});assert.equal(message.text,'Edited text');assert.ok(message.edited_at);
 await app.shared.mutateMessage(message,'reaction',{emoji:'🔥',active:true});assert.equal(message.reactions[0].count,1);assert.equal(message.reactions[0].mine,true);
 await app.shared.mutateMessage(message,'pin',{active:true});assert.equal(message.pinned,true);
 await app.shared.mutateMessage(message,'save',{active:true});assert.equal(message.saved,true);
 s.once('POST','/messages/'+message.id+'/edit',()=>response({error:{message:'Failed write'}},503));
 await app.shared.mutateMessage(message,'edit',{text:'Must not appear'});assert.equal(message.text,'Edited text');
 await app.shared.mutateMessage(message,'delete',{});assert.ok(message.deleted_at);assert.equal(message.text,'');assert.ok(reply.reply_preview.deleted_at);
});
test('change polling updates edits, reactions and tombstones without replacing the composer',async()=>{
 const s=service(),[root]=seed(s),reply=s.add('channel-a-1',{clientId:'thread_seed',text:'A thread reply',threadRootId:root.id}),app=client(s);await open(app);await app.shared.openThread(root.id);
 await app.write('Still typing');const input=app.get('live-message-input');input.selectionStart=5;input.selectionEnd=7;
 s.edit(reply,{text:'Changed elsewhere',edited_at:Date.now(),reactions:[{emoji:'🔥',count:2,mine:false}]});await app.shared.poll();
 assert.equal(app.get('live-message-input'),input);assert.equal(input.value,'Still typing');assert.equal(input.selectionStart,5);assert.equal(app.shared.activeRoom().messages[0].text,'Changed elsewhere');
 s.edit(reply,{text:'',deleted_at:Date.now()});await app.shared.poll();assert.ok(app.shared.activeRoom().messages[0].deleted_at);assert.match(app.get('live-stream').innerHTML,/This message was deleted/);
});
test('reopening recent history preserves the older change cursor until cached edits catch up',async()=>{
 const s=service(),messages=seed(s,60),app=client(s);await open(app);app.shared.mergeMessages('channel-a-1',[messages[0]]);
 const oldCursor=app.shared.room().changeCursor;s.edit(messages[0],{text:'Old cached message edited',edited_at:Date.now()});
 await app.shared.selectChannel('channel-a-2');await app.shared.selectChannel('channel-a-1');
 assert.equal(app.shared.room().changeCursor,oldCursor);await app.shared.poll();
 assert.equal(app.shared.room().messages.find(m=>m.id===messages[0].id).text,'Old cached message edited');
});
test('older message revisions and stale action responses cannot roll back a newer edit',async()=>{
 const s=service(),[root]=seed(s),app=client(s);await open(app);const original={...app.shared.room().messages[0]};
 const fresh={...original,text:'Latest',change_seq:100,edited_at:Date.now()};app.shared.mergeMessages('channel-a-1',[fresh]);app.shared.mergeMessages('channel-a-1',[original]);
 assert.equal(app.shared.room().messages[0].text,'Latest');
});
test('an edited durable retry confirms the original acknowledged payload',async()=>{
 const s=service(),app=client(s);await open(app);
 s.once('POST','/channels/channel-a-1/messages',call=>{const message=s.add('channel-a-1',call.body);s.edit(message,{text:'Edited later',edited_at:Date.now()});return response({error:{message:'Lost response'}},503);});
 await app.write('Original text');await app.shared.send();const pending=app.shared.room().pending[0];
 s.once('POST','/channels/channel-a-1/messages',call=>response({acknowledged:true,acknowledgedPayload:{...call.body},message:s.messages.get('channel-a-1')[0]}));
 await app.shared.transmit('channel-a-1',pending);assert.equal(app.shared.room().pending.length,0);assert.equal(app.shared.room().messages[0].text,'Edited later');
});
test('late exact jumps cannot replace a newer thread selected in the same channel',async()=>{
 const s=service(),[root1,root2]=seed(s,2),reply=s.add('channel-a-1',{clientId:'thread_jump',text:'Jump me',threadRootId:root1.id}),app=client(s);await open(app);
 const held=s.defer('GET','/channels/channel-a-1/messages');const jumping=app.shared.jumpMessage(reply.id);
 await pendingWait(()=>app.shared.state.threadRootId===root1.id);await app.shared.openThread(root2.id);
 held.release({messages:[reply],page:{hasMore:false},changeCursor:s.version});await jumping;
 assert.equal(app.shared.state.threadRootId,root2.id);assert.doesNotMatch(app.context.location.hash,new RegExp(reply.id));
});
test('overlapping exact jumps in one conversation obey the latest navigation intent',async()=>{
 const s=service(),messages=seed(s,120),app=client(s);await open(app);
 const lookup=s.defer('GET','/messages/'+messages[10].id),early=app.shared.jumpMessage(messages[10].id);
 await app.shared.jumpMessage(messages[90].id);lookup.release({message:messages[10]});await early;
 assert.equal(app.context.location.hash,'#shared/'+messages[90].id);
 const window=s.defer('GET','/channels/channel-a-1/messages'),oldWindow=app.shared.jumpMessage(messages[20].id);
 await pendingWait(()=>s.calls.some(c=>c.search==='?before=22&limit=25'));
 await app.shared.jumpMessage(messages[80].id);window.release({messages:messages.slice(0,21),page:{hasMore:false}});await oldWindow;
 assert.equal(app.context.location.hash,'#shared/'+messages[80].id);assert.ok(app.shared.room().messages.every(m=>m.seq>=57));
});
test('old exact jumps expose contiguous older and newer history and a return to latest',async()=>{
 const s=service(),messages=seed(s,120),app=client(s);await open(app);await app.shared.jumpMessage(messages[30].id);
 assert.equal(app.shared.room().newer,true);assert.equal(app.shared.room().older,true);
 assert.ok(app.shared.room().messages.every((m,i,a)=>!i||m.seq===a[i-1].seq+1));assert.match(app.get('live-stream').innerHTML,/Load newer messages/);
 const button=app.document.createElement('button');await app.shared.newerMessages(button);assert.ok(app.shared.room().windowEnd>55);
 await app.shared.selectChannel('channel-a-1',true);assert.equal(app.shared.room().newer,false);assert.equal(app.shared.room().messages.at(-1).id,messages.at(-1).id);
});
test('lost membership removes visible cached content while retaining unsent text',async()=>{
 const s=service(),[root]=seed(s),app=client(s);await open(app);await app.write('Recover this unsent draft');
 s.once('GET','/channels/channel-a-1/changes',()=>response({error:{message:'Membership removed'}},403));s.communities=s.communities.filter(c=>c.id!=='community-a');
 await app.shared.poll();assert.equal(app.shared.state.communityId,'community-b');assert.equal(app.shared.room('channel-a-1').messages.length,0);assert.equal(app.shared.room('channel-a-1').draft,'Recover this unsent draft');assert.doesNotMatch(app.get('live-stream').innerHTML,/Message 0/);
});
test('IME Enter does not submit and Shift Enter leaves newlines to the browser',async()=>{
 const app=client(service());await open(app);await app.write('Composing');const input=app.get('live-message-input');
 for(const event of [{isComposing:true},{keyCode:229},{shiftKey:true}])await app.dispatchDocument('keydown',{key:'Enter',target:input,preventDefault(){},stopImmediatePropagation(){},...event});
 assert.equal(app.server.calls.filter(c=>c.method==='POST').length,0);assert.equal(input.value,'Composing');
});
test('deep links survive sign-in and malformed escapes do not crash navigation',async()=>{
 const app=client(service());app.context.location.hash='#shared/message-id';app.shared.state.deepLink='message-id';
 assert.match(decodeURIComponent(app.shared.signInLink()),/#shared\/message-id/);app.context.location.hash='#shared/%E0%A4%A';assert.equal(app.shared.deepLinkFromHash(),'');
});
(async()=>{let failures=0;for(const[name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`\n${tests.length-failures}/${tests.length} shared-upgrade checks passed (controlled transport and DOM; not browser layout).`);process.exitCode=failures?1:0;})();
