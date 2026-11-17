'use strict';
// Controlled transport tests exercise the actual shared client. The private
// seam exists only in this VM copy; production exposes only VoidLive's UI API.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {harness,plain}=require('./voidline-v2-test.cjs');
const source=fs.readFileSync(path.join(__dirname,'../dist/live.js'),'utf8');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const accountA={id:'account-a',displayName:'Night A',needsProfile:false};
const accountB={id:'account-b',displayName:'Night B',needsProfile:false};
const pendingWait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await Promise.resolve();}throw Error('Expected async transition did not occur');};
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>plain(body)});
function server(){
 const s={account:{...accountA},calls:[],overrides:[],messages:new Map(),sequence:0,
  communities:[{id:'community-a',name:'First community',role:'owner'},{id:'community-b',name:'Other community',role:'owner'}],
  channels:{'community-a':[{id:'channel-a-1',name:'general',kind:'text'},{id:'channel-a-2',name:'roughs',kind:'text'}],'community-b':[{id:'channel-b-1',name:'elsewhere',kind:'text'}]}};
 s.defer=(method,pathname)=>{
  let release;const promise=new Promise(resolve=>{release=resolve;});
  const record={method,pathname,handler:()=>promise};
  s.overrides.push(record);
  return {release:(body,status=200)=>release(response(body,status))};
 };
 s.once=(method,pathname,handler)=>s.overrides.push({method,pathname,handler});
 s.add=(channelId,body,author=s.account.id)=>{
  const list=s.messages.get(channelId)||[];
  let message=list.find(item=>item.author_id===author&&item.client_id===body.clientId);
  if(!message){message={id:'server-message-'+(++s.sequence),seq:s.sequence,channel_id:channelId,author_id:author,author_name:s.account.displayName,client_id:body.clientId,text:body.text,created_at:1700000000000+s.sequence};list.push(message);s.messages.set(channelId,list);}
  return message;
 };
 s.fetch=async(url,options={})=>{
  const parsed=new URL(url,'https://voidline.example'),pathname=parsed.pathname.replace('/api/live',''),method=options.method||'GET',body=options.body?JSON.parse(options.body):undefined;
  const call={pathname,method,body,search:parsed.search};s.calls.push(call);
  const index=s.overrides.findIndex(item=>item.method===method&&item.pathname===pathname);
  if(index>=0){const item=s.overrides.splice(index,1)[0];return item.handler(call);}
  if(body?.expectedAccountId&&body.expectedAccountId!==s.account.id)return response({error:{code:'account_changed',message:'The signed-in account changed.'}},409);
  if(pathname==='/health')return response({ok:true});
  if(pathname==='/me')return response({account:s.account});
  if(pathname==='/communities'&&method==='GET')return response({communities:s.communities});
  const communities=pathname.match(/^\/communities\/([^/]+)\/(channels|members)$/);
  if(communities){const [,id,kind]=communities;return response(kind==='channels'?{channels:s.channels[id]||[]}:{members:[{id:s.account.id,display_name:s.account.displayName,role:'owner'}]});}
  const messages=pathname.match(/^\/channels\/([^/]+)\/messages$/);
  if(messages){
   const id=messages[1];
   if(method==='POST')return response({acknowledged:true,message:s.add(id,body)});
   let list=(s.messages.get(id)||[]).slice();
   if(parsed.searchParams.has('after'))list=list.filter(item=>item.seq>Number(parsed.searchParams.get('after')));
   if(parsed.searchParams.has('before'))list=list.filter(item=>item.seq<Number(parsed.searchParams.get('before')));
   return response({messages:list,page:{hasMore:false}});
  }
  if(pathname==='/profile'){s.account={...s.account,displayName:body.displayName};return response({account:s.account});}
  throw Error('Unexpected mock request '+method+' '+pathname);
 };
 return s;
}
function client(s=server(),sessionStorage=new Map()){
 const app=harness({},new Map(),{controlledTimers:true,sessionStorage});
 const document=app.document,baseGet=document.getElementById,baseCreate=document.createElement;
 document.getElementById=id=>id.startsWith('live-')?(app.nodes.get(id)||null):baseGet(id);
 const shell=baseCreate('div');shell.id='live-test-shell';shell.className='app-shell';document.body.appendChild(shell);
 document.createElement=tag=>{
  const node=baseCreate(tag);
  return new Proxy(node,{set(target,property,value){
   if(property==='innerHTML'&&target.id==='live-workspace')for(const id of [...app.nodes.keys()])if(id.startsWith('live-')&&!['live-workspace','live-test-shell'].includes(id))app.nodes.delete(id);
   return Reflect.set(target,property,value);
  }});
 };
 Object.assign(app.context,{fetch:s.fetch,AbortController,crypto:webcrypto,matchMedia:app.window.matchMedia});
 Object.assign(app.context.navigator,{onLine:true,platform:'Linux'});
 Object.assign(app.context.location,{hash:'',search:'',pathname:'/',href:'https://voidline.example/'});
 app.context.history={replaceState(_state,_unused,value){const next=new URL(value,'https://voidline.example');Object.assign(app.context.location,{href:next.href,pathname:next.pathname,search:next.search,hash:next.hash});}};
 const testSource=source.replace(/\}\)\(\);\s*$/,'window.__liveTest={state,room,captureDraft,saveSession,connect,selectCommunity,selectChannel,send,transmit,poll,submitForm,request};\n})();');
 vm.runInContext(testSource,app.context,{filename:'dist/live.js'});
 assert.ok(app.window.VoidLive);
 const api=app.window.__liveTest;
 return {...app,live:app.window.VoidLive,shared:api,server:s,
  async write(text){app.get('live-message-input').value=text;await app.dispatchDocument('input',{target:app.get('live-message-input')});},
  async liveClick(dataset){const button=baseCreate('button');button.dataset=dataset;await app.dispatchDocument('click',{target:button,preventDefault(){},stopImmediatePropagation(){}});},
  form(kind,values){const form=baseCreate('form');form.dataset={liveForm:kind};form.values=values;form.isConnected=true;return form;}
 };
}
const open=async app=>{await app.live.open();assert.equal(app.shared.state.phase,'ready');assert.equal(app.shared.state.channelId,'channel-a-1');};

test('the actual API’s numeric millisecond timestamp confirms a successful send',async()=>{
 const app=client();await open(app);await app.write('Confirm a numeric timestamp');await app.shared.send();
 const saved=app.server.messages.get('channel-a-1')[0];
 assert.equal(typeof saved.created_at,'number');assert.equal(typeof saved.seq,'number');
 assert.equal(saved.author_id,accountA.id);assert.equal(saved.author_name,accountA.displayName);
 assert.equal(saved.client_id,app.server.calls.find(call=>call.method==='POST').body.clientId);
 assert.equal(app.shared.room().pending.length,0);
 assert.equal(app.shared.room().messages[0].id,saved.id);
 assert.match(app.get('live-announcer').textContent,/Message saved/);
});

test('slower old channel and community responses never replace the newer destination',async()=>{
 const app=client();await open(app);
 const held=app.server.defer('GET','/channels/channel-a-2/messages');
 const oldRoute=app.shared.selectChannel('channel-a-2');
 await pendingWait(()=>app.server.calls.some(call=>call.pathname==='/channels/channel-a-2/messages'));
 await app.shared.selectChannel('channel-a-1');
 held.release({messages:[{id:'wrong-room',seq:99,channel_id:'channel-a-2',author_id:'other',author_name:'Other',client_id:'remote_1234',text:'Old route response',created_at:Date.now()}],page:{hasMore:false}});
 await oldRoute;
 assert.equal(app.shared.state.channelId,'channel-a-1');assert.doesNotMatch(app.get('live-stream').innerHTML,/Old route response/);
 const communityResponse=app.server.defer('GET','/communities/community-b/channels');
 const oldCommunity=app.shared.selectCommunity('community-b');
 await app.shared.selectCommunity('community-a');
 communityResponse.release({channels:app.server.channels['community-b']});await oldCommunity;
 assert.equal(app.shared.state.communityId,'community-a');assert.equal(app.shared.state.channelId,'channel-a-1');
});

test('a same-account acknowledgment after navigation is saved only to its original room',async()=>{
 const app=client();await open(app);
 const held=app.server.defer('POST','/channels/channel-a-1/messages');
 await app.write('Only for the first room');const sending=app.shared.send();
 await pendingWait(()=>app.server.calls.some(call=>call.method==='POST'));
 const payload=app.server.calls.find(call=>call.method==='POST').body;
 await app.shared.selectChannel('channel-a-2');await app.write('Different room draft');
 const message=app.server.add('channel-a-1',payload);
 held.release({acknowledged:true,message});await sending;
 assert.equal(app.shared.state.channelId,'channel-a-2');assert.equal(app.get('live-message-input').value,'Different room draft');
 assert.equal(app.shared.room('channel-a-1').pending.length,0);assert.equal(app.shared.room('channel-a-1').messages[0].text,'Only for the first room');
 assert.doesNotMatch(app.get('live-stream').innerHTML,/Only for the first room/);
});

test('an unconfirmed send survives refresh and retries with the original client ID',async()=>{
 const s=server(),session=new Map(),app=client(s,session);await open(app);
 s.once('POST','/channels/channel-a-1/messages',()=>response({error:{message:'Temporary interruption'}},503));
 await app.write('Keep this thought');await app.shared.send();
 const original=app.shared.room().pending[0];assert.equal(original.status,'failed');
 const stored=JSON.parse(session.get('voidline.shared.session.v1.account-a.channel-a-1'));
 assert.equal(stored.pending[0].text,'Keep this thought');assert.equal(stored.pending[0].clientId,original.clientId);
 const restored=client(s,session);await open(restored);
 const pending=restored.shared.room().pending[0];assert.equal(pending.clientId,original.clientId);
 await restored.shared.transmit('channel-a-1',pending);
 const posts=s.calls.filter(call=>call.method==='POST');
 assert.equal(posts[0].body.clientId,posts[1].body.clientId);assert.equal(posts[1].body.expectedAccountId,accountA.id);
 assert.equal(restored.shared.room().pending.length,0);assert.equal(s.messages.get('channel-a-1').length,1);
});

test('history confirmation wins over an older failing POST response',async()=>{
 const app=client();await open(app);
 const held=app.server.defer('POST','/channels/channel-a-1/messages');
 await app.write('Already saved by the service');const sending=app.shared.send();
 await pendingWait(()=>app.server.calls.some(call=>call.method==='POST'));
 const payload=app.server.calls.find(call=>call.method==='POST').body;
 app.server.add('channel-a-1',payload);
 await app.shared.poll();assert.equal(app.shared.room().pending.length,0);
 held.release({error:{message:'Late gateway error'}},503);await sending;
 assert.equal(app.shared.room().pending.length,0);assert.equal(app.shared.room().messages.length,1);
 assert.doesNotMatch(app.get('live-announcer').textContent,/not confirmed/i);
});

test('re-entry and foreground polling isolate drafts by authenticated account',async()=>{
 const app=client();await open(app);await app.write('Private account A draft');app.live.close();
 app.server.account={...accountB};await app.live.open();
 assert.equal(app.shared.state.account.id,accountB.id);assert.equal(app.get('live-message-input').value,'');
 assert.ok(![...app.sessionStorage].filter(([key])=>key.includes('account-b')).some(([,value])=>value.includes('Private account A draft')));
 await app.write('Private account B draft');
 app.server.account={...accountA};await app.shared.poll();
 assert.equal(app.shared.state.account.id,accountA.id);assert.equal(app.get('live-message-input').value,'Private account A draft');
 assert.equal(JSON.parse(app.sessionStorage.get('voidline.shared.session.v1.account-b.channel-a-1')).text,'Private account B draft');
});

test('a stale send completion cannot populate the new account’s room',async()=>{
 const app=client();await open(app);
 const held=app.server.defer('POST','/channels/channel-a-1/messages');
 await app.write('Pending only for A');const sending=app.shared.send();
 await pendingWait(()=>app.server.calls.some(call=>call.method==='POST'));
 const payload=app.server.calls.find(call=>call.method==='POST').body;
 app.server.account={...accountB};await app.shared.connect();
 const message={id:'a-late-ack',seq:200,channel_id:'channel-a-1',author_id:accountA.id,author_name:accountA.displayName,client_id:payload.clientId,text:payload.text,created_at:Date.now()};
 held.release({acknowledged:true,message});await sending;
 assert.equal(app.shared.state.account.id,accountB.id);assert.equal(app.shared.room().pending.length,0);
 assert.ok(!app.shared.room().messages.some(item=>item.id==='a-late-ack'));
 assert.ok(![...app.sessionStorage].filter(([key])=>key.includes('account-b')).some(([,value])=>value.includes('Pending only for A')));
});

test('a delayed alias response cannot replace a newer signed-in identity',async()=>{
 const app=client();await open(app);
 const held=app.server.defer('POST','/profile');
 const submitted=app.shared.submitForm(app.form('profile',{displayName:'New A alias'}));
 await pendingWait(()=>app.server.calls.some(call=>call.pathname==='/profile'));
 app.server.account={...accountB};await app.shared.connect();await app.write('B is writing here');
 held.release({account:{...accountA,displayName:'New A alias'}});await submitted;
 assert.equal(app.shared.state.account.id,accountB.id);assert.equal(app.shared.state.account.displayName,accountB.displayName);
 assert.equal(app.get('live-message-input').value,'B is writing here');
});

test('a stale same-account alias response cannot replace a newer reconnect result',async()=>{
 const app=client();await open(app);
 const held=app.server.defer('POST','/profile');
 const submitted=app.shared.submitForm(app.form('profile',{displayName:'Earlier alias'}));
 await pendingWait(()=>app.server.calls.some(call=>call.pathname==='/profile'));
 app.server.account={...accountA,displayName:'Latest alias'};await app.shared.connect();
 held.release({account:{...accountA,displayName:'Earlier alias'}});await submitted;
 assert.equal(app.shared.state.account.displayName,'Latest alias');
});

test('an acknowledgment for a different client ID never reports the pending send as saved',async()=>{
 const app=client();await open(app);
 app.server.once('POST','/channels/channel-a-1/messages',call=>response({acknowledged:true,message:{...app.server.add('channel-a-1',call.body),client_id:'wrong_client_id'}}));
 await app.write('Confirm this exact message');await app.shared.send();
 assert.equal(app.shared.room().pending.length,1);assert.equal(app.shared.room().pending[0].status,'failed');
 assert.equal(app.shared.room().messages.length,0);assert.match(app.get('live-announcer').textContent,/not confirmed/i);
});

test('copying an unconfirmed send to the composer preserves idempotency',async()=>{
 const app=client();await open(app);
 app.server.once('POST','/channels/channel-a-1/messages',call=>{app.server.add('channel-a-1',call.body);return response({error:{message:'Response lost after saving'}},503);});
 await app.write('Do not duplicate me');await app.shared.send();
 const pending=app.shared.room().pending[0],id=pending.clientId;
 await app.liveClick({liveRestore:id});await app.liveClick({liveRestore:id});assert.equal(app.get('live-message-input').value,'Do not duplicate me');
 assert.equal(app.shared.room().pending[0].clientId,id,'Copying must retain the unresolved original');
 await app.shared.send();
 const posts=app.server.calls.filter(call=>call.method==='POST');
 assert.equal(posts[0].body.clientId,posts[1].body.clientId);assert.equal(app.server.messages.get('channel-a-1').length,1);assert.equal(app.shared.room().pending.length,0);
});

test('account-change rejection preserves the old retry while reconnecting without sending as the new account',async()=>{
 const app=client();await open(app);app.server.account={...accountB};
 await app.write('Only account A authorized this');await app.shared.send();
 const post=app.server.calls.find(call=>call.method==='POST');
 assert.equal(post.body.expectedAccountId,accountA.id);assert.equal(app.server.messages.size,0);
 assert.equal(app.shared.state.account.id,accountB.id);assert.equal(app.get('live-message-input').value,'');
 const saved=JSON.parse(app.sessionStorage.get('voidline.shared.session.v1.account-a.channel-a-1'));
 assert.equal(saved.pending[0].text,'Only account A authorized this');
});

test('every live mutation captures its expected account before the transport awaits',async()=>{
 const app=client();await open(app);
 const held=app.server.defer('POST','/profile');
 const writing=app.shared.request('/profile',{displayName:'Captured identity'});
 app.shared.state.account={...accountB};
 held.release({account:{...accountA,displayName:'Captured identity'}});await writing;
 const call=app.server.calls.find(item=>item.pathname==='/profile');
 assert.equal(call.body.expectedAccountId,accountA.id);
});

(async()=>{
 let failed=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
 console.log('\n'+(tests.length-failed)+'/'+tests.length+' shared-client reliability checks passed. Controlled transport; no real messages are sent.');
 process.exitCode=failed?1:0;
})();
