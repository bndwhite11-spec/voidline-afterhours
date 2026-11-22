'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {JSDOM}=require('jsdom');
const source=readFileSync(join(__dirname,'../dist/collector.js'),'utf8');
const cases=[];
const delay=ms=>new Promise(done=>setTimeout(done,ms));
const held=()=>{let done;const promise=new Promise(resolve=>done=resolve);return {promise,done};};
async function wait(fn){for(let i=0;i<180;i++){if(fn())return;await delay(5);}assert.fail('Timed out waiting for expected UI');}
function fixture({reduced=false,media='fail',opened=false}={}){
 const dom=new JSDOM('<body><main id="home-main"></main><dialog id="home-dialog"></dialog></body>',{runScripts:'outside-only',url:'https://collectible.example/chats',pretendToBeVisual:true});
 const w=dom.window,d=w.document,main=d.querySelector('main'),dialog=d.querySelector('dialog'),requests=[],announcements=[],mediaLoad=held(),resultAccount={id:'a'},uiState={account:resultAccount,dialogGeneration:0},flags={won:opened,owned:true,lost:false,delayed:null,online:true},browserMoves=[];
 w.matchMedia=()=>({matches:reduced,addEventListener(){}});
 Object.defineProperty(w.navigator,'onLine',{get:()=>flags.online,configurable:true});
 w.VoidlineCapsuleStage={create(){const n=d.createElement('div');n.className='capsule-object';return n;}};
 const model={id:'frog-model',type:'gift',name:'Desk Green',familyId:'frog',familyName:'Pepe Keycap',tier:'Common',description:'A molded key',motif:'Key legends',backdrop:{name:'Terminal'}};
 const capsule={id:'capsule-1',name:'Choice Capsule',source:'welcome',earnedAt:2,openedAt:0};
 const byFamily=['plush','frog'].map(key=>({id:key,name:key==='frog'?'Pepe Keycap':'Chudjak Plush',tableVersion:key+'-frozen-1',models:[{id:key==='frog'?model.id:'plush-model',name:key==='frog'?model.name:'Original Chudjak',tier:'Common',weight:9780},{id:key+'-rare',name:'Held catalog variation',tier:'Mythic',weight:220}]}));
 function receipt(){return {id:'opening-1',capsuleId:capsule.id,instanceId:'copy-12345678901234567890',familyId:'frog',tableVersion:'frog-frozen-1',weight:9780,totalWeight:10000,modelId:model.id,model,currentlyOwned:flags.owned,currentlyReserved:false,discovery:'first',acknowledgedAt:0};}
 w.VoidCollectibleArt={prepare:async()=>media==='slow'?await mediaLoad.promise:media==='fail'?{svg:null}:{svg:true},stop(){},preview:async()=>({played:false,reason:'unsupported'})};
 const app={state:uiState,guard(){const id=uiState.account.id;return ()=>id===uiState.account?.id;},announce(text){announcements.push(text);},request:async(path,body)=>{
  requests.push({path,body,account:uiState.account?.id});
  if(path==='/api/capsules')return {capsules:[{...capsule,openedAt:flags.won?3:0}],progress:{required:3,days:1,nextWeek:3456,qualifyingAction:'Post to a Standard community channel.'},welcomeEligible:true};
  if(path==='/api/capsules/reconcile')return {};
  if(path.startsWith('/api/cosmetics/instances?'))return {total:1,instances:[{id:'owned-a',catalog_id:model.id,is_new:true}]};
  if(path.endsWith('/open')){if(flags.delayed)await flags.delayed.promise;if(flags.lost==='before'){flags.lost=false;throw Error('lost before commit');}flags.won=true;if(flags.lost){flags.lost=false;throw Error('lost response');}return {opening:receipt()};}
  if(path.endsWith('/ack'))return {opening:{...receipt(),acknowledgedAt:20}};
  if(path==='/api/capsules/'+capsule.id)return {capsule,families:byFamily,opening:flags.won?receipt():null};
  throw Error('Unhandled request '+path);
 }};
 const host={app,esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),items:()=>[model],art:()=>'<img alt="" width="64" height="64">',familyName:()=>model.familyName,model:id=>id===model.id?model:null,summary:()=>({totalCopies:212,duplicateCopies:211,newArrivals:1,modelCounts:{[model.id]:212},families:[{familyId:'frog',ownedModels:1,totalModels:6}]}),visibility:()=>'private',activate(){},active:()=>true,page(html){uiState.dialogGeneration++;main.innerHTML=html;dialog.removeAttribute('open');return uiState.dialogGeneration;},dialog(title,copy,html){uiState.dialogGeneration++;dialog.setAttribute('open','');dialog.innerHTML=html;return uiState.dialogGeneration;},refresh:async()=>{},invalidate(){},inspect:(...a)=>browserMoves.push(['inspect',...a]),display:id=>browserMoves.push(['display',id]),gift:id=>browserMoves.push(['gift',id])};
 w.eval(source);const client=w.VoidCollector.create(host);
 const has=s=>d.querySelector(s),click=async(s)=>{await wait(()=>has(s));has(s).click();await delay(0);},text=()=>dialog.textContent;
 const panel=async()=>{await client.open();await click('[data-cl="capsule"]');await wait(()=>has('[data-cl="open"]')||has('[data-cl-state="result"]'));};
 const choose=async()=>{await panel();await click('[data-family="frog"]');};
 const opens=()=>requests.filter(r=>r.path.endsWith('/open'));
 const end=()=>{client.reset();dom.window.close();};
 return {client,main,dialog,uiState,flags,requests,announcements,has,click,text,panel,choose,opens,end,mediaLoad,browserMoves,w,receipt,host};
}
cases.push(['frozen historical contents precede one user-confirmed opening and reduced-motion result',async()=>{
 const f=fixture({reduced:true});try{await f.choose();assert.match(f.text(),/frog-frozen-1/);assert.match(f.text(),/97\.8%/);assert.match(f.text(),/2\.2%/);assert.equal(f.opens().length,0);await f.click('[data-cl="open"]');await wait(()=>f.has('[data-cl-state="result"]'));const o=f.receipt();assert.equal(f.opens().length,1);assert.equal(f.opens()[0].body.familyId,'frog');assert(f.opens()[0].body.clientId);assert.equal(f.has('[data-cl-state="result"]').dataset.instance,o.instanceId);assert.match(f.text(),/New model discovered/);await f.click('[data-cl="view-copy"]');await f.click('[data-cl="display"]');await f.click('[data-cl="gift"]');assert.equal(f.browserMoves[0][2],o.instanceId);assert.equal(f.browserMoves[1][1],o.instanceId);assert.equal(f.browserMoves[2][1],o.instanceId);assert.equal(f.announcements.length,1);await f.click('[data-cl="replay"]');assert.equal(f.opens().length,1);assert.equal(f.announcements.length,1);}finally{f.end();}
}]);
cases.push(['post-commit response loss recovers by GET; reopening a transferred receipt has no ownership buttons',async()=>{
 const f=fixture();try{f.flags.lost=true;await f.choose();await f.click('[data-cl="open"]');await wait(()=>f.has('[data-cl-state="result"]'));assert.equal(f.opens().length,1);f.flags.owned=false;await f.click('[data-cl="replay"]');await wait(()=>f.text().includes('Historical award'));assert(!f.has('[data-cl="display"]'));assert(!f.has('[data-cl="view-copy"]'));assert(!f.has('[data-cl="gift"]'));assert.equal(f.opens().length,1);}finally{f.end();}
}]);
cases.push(['uncommitted uncertain request can be retried after reload with the original key and family',async()=>{
 const f=fixture({reduced:true});try{f.flags.lost='before';await f.choose();await f.click('[data-cl="open"]');await wait(()=>f.text().includes('Retry same opening'));const old=f.opens()[0].body.clientId;assert(f.has('[data-family="plush"]').disabled);await f.client.open();await f.click('[data-cl="capsule"]');await wait(()=>f.text().includes('Retry same opening'));await f.click('[data-cl="open"]');await wait(()=>f.has('[data-cl-state="result"]'));assert.equal(f.opens()[1].body.clientId,old);assert.equal(f.opens()[1].body.familyId,'frog');}finally{f.end();}
}]);
cases.push(['a different family submitted from another tab is reconciled without sending that family from this review',async()=>{
 const f=fixture();try{
  await f.choose();f.w.localStorage.setItem('voidline.capsule.pending.v1.a.capsule-1',JSON.stringify({familyId:'plush',clientId:'another-tab'}));
  await f.click('[data-cl="open"]');await wait(()=>f.text().includes('Retry same opening'));assert.equal(f.opens().length,0);
  assert.equal(f.has('[data-family="plush"]').getAttribute('aria-pressed'),'true');
 }finally{f.end();}
}]);
cases.push(['skip aborts pending media immediately and a late load never restarts presentation',async()=>{
 const f=fixture({media:'slow'});try{await f.choose();await f.click('[data-cl="open"]');await f.click('[data-cl="skip"]');await wait(()=>f.has('[data-cl-state="result"]'));f.mediaLoad.done({svg:true});await delay(15);assert(f.has('[data-cl-state="result"]'));assert(!f.has('[data-cl="skip"]'));assert.equal(f.opens().length,1);assert.equal(f.announcements.length,1);}finally{f.end();}
}]);
cases.push(['unavailable detail retains the named collectible, its receipt and actions',async()=>{
 const f=fixture();try{await f.choose();await f.click('[data-cl="open"]');await wait(()=>f.has('[data-cl-state="result"]'));assert.match(f.text(),/motion could not load/);assert.match(f.text(),/Desk Green/);assert(f.has('[data-cl="view-copy"]'));const img=f.has('.cl-result img');img.dispatchEvent(new f.w.Event('error'));assert(!f.has('.cl-result .cl-art-missing').hidden);assert.match(f.has('.cl-result .cl-art-missing').textContent,/Desk Green/);}finally{f.end();}
}]);
cases.push(['known-offline submission never enqueues an opening or a surprise reconnect request',async()=>{
 const f=fixture();try{await f.choose();f.flags.online=false;await f.click('[data-cl="open"]');assert.equal(f.opens().length,0);assert.match(f.text(),/Connect before opening/);f.flags.online=true;f.w.dispatchEvent(new f.w.Event('online'));await delay(0);assert.equal(f.opens().length,0);}finally{f.end();}
}]);
cases.push(['a late response after switching account cannot present or acknowledge another person’s copy',async()=>{
 const f=fixture();try{await f.choose();f.flags.delayed=held();await f.click('[data-cl="open"]');f.uiState.account={id:'b'};f.client.reset();f.dialog.innerHTML='<p>Second account</p>';f.flags.delayed.done();await delay(20);assert.equal(f.text(),'Second account');assert(!f.requests.some(r=>r.path.endsWith('/ack')));assert.equal(f.announcements.length,0);}finally{f.end();}
}]);
cases.push(['server-wide family and copy counts precede paginated filtered rows; viewing a tile never acknowledges it',async()=>{
 const f=fixture();try{await f.client.open();assert.match(f.main.textContent,/212 owned copies/);assert.match(f.main.textContent,/1 of 6 models owned/);await f.click('[data-cl="mode"][data-mode="arrivals"]');await wait(()=>f.has('[data-copy="owned-a"]'));assert(f.requests.some(r=>r.path.includes('arrival=1')));assert(f.main.textContent.includes('New arrival'));assert(!f.requests.some(r=>r.path.endsWith('/seen')));await f.click('[data-copy="owned-a"]');assert.equal(f.browserMoves.at(-1)[2],'owned-a');}finally{f.end();}
}]);
(async()=>{let pass=0;for(const [name,test] of cases){try{await test();pass++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name,e);}}console.log(pass+'/'+cases.length+' collector interactions passed in jsdom with controlled HTTP and motion.');})();
