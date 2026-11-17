'use strict';
// Controlled transport tests exercise the actual shared client. The private
// seam exists only in this VM copy; production exposes only VoidLive's UI API.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {harness,plain}=require('./voidline-v2-test.cjs');
const source=fs.readFileSync(path.join(__dirname,'../dist/live.js'),'utf8');
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
 const testSource=source.replace(/\}\)\(\);\s*$/,'window.__liveTest={state,room,activeRoom,captureDraft,saveSession,connect,selectCommunity,selectChannel,send,transmit,poll,submitForm,request,openThread,closeThread,messageAction,mutateMessage,mergeMessages,jumpMessage,signInLink,deepLinkFromHash,confirmsPending,newerMessages,olderMessages};\n})();');
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


module.exports={client,server,open,response,pendingWait,accountA,accountB};
