'use strict';
// Behavioral checks for the vanilla client. This deliberately does not model browser layout.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {webcrypto} = require('node:crypto');
const SOURCE = process.argv[2] || require('node:path').join(__dirname,'../dist/app.js');
const STORE = 'voidline.local.v1';
const plain = (value) => JSON.parse(JSON.stringify(value));
const prevent = () => ({preventDefault(){}});
function harness(initial = {}, storage = new Map(), options = {}) {
  if (initial !== null) storage.set(STORE, typeof initial === 'string' ? initial : JSON.stringify(initial));
  const nodes = new Map(), docListeners = new Map(), winListeners = new Map(), sessionData=options.sessionStorage||new Map(), scheduled=new Map();let timerSerial=0,timerClock=0;
  let document;
  function classes() {
    const set = new Set();
    return {set(value){set.clear();String(value).split(/\s+/).filter(Boolean).forEach(x=>set.add(x));},add(...names){names.forEach(x=>{if(/\s/.test(x))throw Error('DOMTokenList token contains whitespace: '+x);set.add(x);});},remove(...names){names.forEach(x=>set.delete(x));},contains(name){return set.has(name);},toggle(name,force){const on=force===undefined?!set.has(name):!!force;on?set.add(name):set.delete(name);return on;},toString(){return [...set].join(' ');}};
  }
  function addListener(map,type,fn) {if(!map.has(type))map.set(type,[]);map.get(type).push(fn);}
  function node(id='',tagName='div') {
    const attrs=new Map(), listeners=new Map();
    const n={id,tagName:tagName.toUpperCase(),parentElement:null,children:[],dataset:{},value:'',innerHTML:'',textContent:'',disabled:false,hidden:false,open:false,scrollTop:0,scrollHeight:600,offsetHeight:100,selectionStart:0,selectionEnd:0,classList:classes(),style:{setProperty(name,value){this[name]=value;},removeProperty(name){delete this[name];},getPropertyValue(name){return this[name]||'';}},
      addEventListener(type,fn){addListener(listeners,type,fn);},
      async dispatch(type,event={}){for(const fn of listeners.get(type)||[])await fn({target:n,...event});},
      setAttribute(k,v){attrs.set(k,String(v));if(k==='class')n.className=v;if(k==='id')n.id=v;if(k.startsWith('data-'))n.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);},getAttribute:k=>attrs.get(k)??null,removeAttribute(k){attrs.delete(k);},hasAttribute:k=>attrs.has(k)||(k.startsWith('data-')&&Object.hasOwn(n.dataset,k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))),
      showModal(){n.open=true;},close(){n.open=false;},focus(){document.activeElement=n;},blur(){if(document.activeElement===n)document.activeElement=document.body;},remove(){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);if(n.id)nodes.delete(n.id);},before(){},after(){},append(child){return n.appendChild(child);},prepend(...items){for(const child of [...items].reverse()){if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(x=>x!==child);child.parentElement=n;n.children.unshift(child);if(child.id)nodes.set(child.id,child);}},appendChild(child){child.parentElement=n;n.children.push(child);if(child.id)nodes.set(child.id,child);return child;},insertBefore(child){return n.appendChild(child);},contains(child){return child===n||n.children.some(c=>c.contains(child));},scrollIntoView(){n.scrolledIntoView=true;},getBoundingClientRect(){return {left:10,right:100,top:10,bottom:100};},
      querySelectorAll(selector){return selector==='[data-message-id]'?n.messageNodes||[]:[];},querySelector(selector){if(selector==='[data-message-id]')return n.messageNodes?.[0]||null;if(selector==='h1,h2'&&/<h[12][ >]/.test(n.innerHTML))return node('modal-heading');return null;},matches(selector){return selector.split(',').some(part=>{part=part.trim();if(part.startsWith('#'))return n.id===part.slice(1);if(part.startsWith('.'))return n.classList.contains(part.slice(1));if(/^\[[^=]+\]$/.test(part))return n.hasAttribute(part.slice(1,-1));return n.tagName.toLowerCase()===part.toLowerCase();});},closest(selector){return n.matches(selector)?n:n.parentElement?.closest(selector)||null;},click(){return dispatchDoc('click',{target:n,preventDefault(){}});}
    };
    let html='';Object.defineProperty(n,'innerHTML',{get:()=>html,set(value){html=String(value);for(const match of html.matchAll(/<([a-z][a-z0-9-]*)[^>]*\bid="([^"]+)"[^>]*>/gi)){const child=node(match[2],match[1]);child.parentElement=n;if(match[1].toLowerCase()==='textarea'){const tail=html.slice(match.index+match[0].length),body=tail.slice(0,tail.indexOf('</textarea>'));child.value=body.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'\"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');}nodes.set(child.id,child);}n._parseMessages?.();}});
    Object.defineProperty(n,'_parseMessages',{value:()=>{n.messageNodes=[];for(const match of html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/g)){const row=node('','article');for(const attr of match[1].matchAll(/([\w-]+)="([^"]*)"/g))row.setAttribute(attr[1],attr[2]);row.innerHTML=match[2];row.parentElement=n;n.messageNodes.push(row);}}});
    Object.defineProperty(n,'className',{get:()=>n.classList.toString(),set:value=>n.classList.set(value)});
    if(options.nodeMetrics?.[id])Object.assign(n,options.nodeMetrics[id]);
    return n;
  }
  const get=(id)=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);};
  document={readyState:'complete',documentElement:node('html'),body:node('body'),activeElement:null,getElementById:id=>options.realModules?(nodes.get(id)||null):get(id),createElement:tag=>node('',tag),createElementNS:(ns,tag)=>node('',tag),querySelector:selector=>[...nodes.values(),...(document?.body?.children||[])].find(n=>n.matches(selector))||null,querySelectorAll:selector=>[...nodes.values(),...(document?.body?.children||[])].filter(n=>n.matches(selector)),addEventListener(type,fn){addListener(docListeners,type,fn);}};
  document.documentElement.dataset={};document.activeElement=document.body;
  if(options.realModules){const html=fs.readFileSync(SOURCE.replace(/app\.js$/,'index.html'),'utf8');for(const match of html.matchAll(/\bid="([^"]+)"/g))get(match[1]);}
  function dispatchDoc(type,event){return Promise.all((docListeners.get(type)||[]).map(fn=>fn(event)));}
  const moduleCalls={badges:0,appearance:0};
  const window={crypto:webcrypto,innerWidth:1440,innerHeight:900,matchMedia:query=>({matches:query.includes('min-width')?true:!!options.reducedMotion,addEventListener(){},removeEventListener(){}}),addEventListener(type,fn){addListener(winListeners,type,fn);},dispatchEvent(event){(winListeners.get(event.type)||[]).forEach(fn=>fn(event));return true;},VoidBadges:{catalog:[],init(api){this.api=api;},art:id=>`<span class="test-art">${id||''}</span>`,mini:id=>id?`<span class="test-mini">${id}</span>`:'',checkUnlocks(){moduleCalls.badges++;},open(){}},VoidProfiles:{init(api){this.api=api;},applyAppearance(){moduleCalls.appearance++;},open(){},edit(){},settings(){}},VoidEntrance:{replay(){},skip(){},isPlaying:()=>false}};
  const sessionAdapter={get length(){return sessionData.size;},key:index=>[...sessionData.keys()][index]??null,getItem:k=>sessionData.get(k)??null,setItem:(k,v)=>sessionData.set(k,String(v)),removeItem:k=>sessionData.delete(k),clear:()=>sessionData.clear()};window.sessionStorage=sessionAdapter;
  const context={window,document,sessionStorage:sessionAdapter,localStorage:{get length(){return storage.size;},key:index=>[...storage.keys()][index]??null,getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear()},location:{href:'https://voidline.example/',origin:'https://voidline.example',pathname:'/',protocol:'https:'},navigator:{clipboard:{writeText:async()=>{}}},requestAnimationFrame:fn=>{if(!options.controlledTimers){fn();return ++timerSerial;}const id=++timerSerial;scheduled.set(id,{fn,due:timerClock,type:'raf'});return id;},cancelAnimationFrame:id=>scheduled.delete(id),setTimeout:(fn,delay=0)=>{const id=++timerSerial;if(options.controlledTimers)scheduled.set(id,{fn,due:timerClock+delay,type:'timer'});return id;},clearTimeout:id=>scheduled.delete(id),Event,CustomEvent:class {constructor(type,options={}){this.type=type;this.detail=options.detail;}},atob:globalThis.atob,btoa:globalThis.btoa,FormData:class {constructor(form){this.values=form.values||{};}get(k){return this.values[k]??null;}getAll(k){return Array.isArray(this.values[k])?this.values[k]:this.values[k]?[this.values[k]]:[];}},Blob,URL,console};
  vm.createContext(context);
  for(const name of ['store.js','drafts.js',...(options.runtimeModules||[])]){const runtimeFile=require('node:path').join(require('node:path').dirname(SOURCE),name);if(fs.existsSync(runtimeFile))vm.runInContext(fs.readFileSync(runtimeFile,'utf8'),context,{filename:runtimeFile});}
  if(options.realModules)for(const name of ['badges.js','profiles.js']){const filename=SOURCE.replace(/app\.js$/,name);vm.runInContext(fs.readFileSync(filename,'utf8'),context,{filename});}
  vm.runInContext(fs.readFileSync(SOURCE,'utf8'),context,{filename:SOURCE});
  assert.ok(window.VoidApp,'Client should expose window.VoidApp after boot');
  return {api:window.VoidApp,window,document,nodes,storage,sessionStorage:sessionData,moduleCalls,get,context,dispatchDocument:dispatchDoc,
    async flushTimers(milliseconds=1000){const end=timerClock+milliseconds;let count=0;while(true){const next=[...scheduled].filter(([,item])=>item.due<=end).sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];if(!next)break;if(++count>1000)throw Error('Timer queue did not settle');scheduled.delete(next[0]);timerClock=next[1].due;await next[1].fn();}timerClock=end;},
    async flushFrames(){let count=0;while(true){const next=[...scheduled].find(([,item])=>item.type==='raf');if(!next)break;if(++count>1000)throw Error('Frame queue did not settle');scheduled.delete(next[0]);await next[1].fn();}},
    async click(dataset,attrs={}){const b=node('test-button','button');b.dataset=dataset;Object.entries(attrs).forEach(([k,v])=>b.setAttribute(k,v));await dispatchDoc('click',{target:b,preventDefault(){}});return b;},
    async submit(id,values,dataset={}){const f=node(id);f.values=values;f.dataset=dataset;await dispatchDoc('submit',{target:f,preventDefault(){}});},
    async storageEvent(raw){
      let events;
      if(window.VoidStore){const peer=window.VoidStore.create(context.localStorage,STORE);peer.load();const before=new Map(storage);const result=peer.commit(raw);assert.ok(result.ok,'Simulated peer write must succeed');events=[...storage].filter(([key,value])=>before.get(key)!==value).map(([key,newValue])=>({key,newValue}));}
      else{const value=JSON.stringify(raw);storage.set(STORE,value);events=[{key:STORE,newValue:value}];}
      for(const event of events)for(const fn of winListeners.get('storage')||[])await fn(event);
    },
    saved:()=>window.VoidStore?window.VoidStore.create(context.localStorage,STORE).read():JSON.parse(storage.get(STORE))
  };
}
const tests=[];
function test(name,fn){tests.push([name,fn]);}
function input(app,text){app.get('message-input').value=text;return app.api.sendMessage(prevent());}
function messages(app,key){return app.api.state.messages[key];}
const sampleMessage=(id,text,extra={})=>({id,author:'self',text,time:1700000000000,reactions:[],...extra});
const image='data:image/png;base64,aGVsbG8=';

test('v1 migration preserves full archives, IDs, profile extras and selected custom context',()=>{
  const original=Array.from({length:100},(_,i)=>sampleMessage('old-'+i,'Retained transmission '+i,{time:1700000000000+i,pinned:i===3,reactions:i===3?[{emoji:'💜',count:7,mine:true}]:[],image:i===3?image:''}));
  const fixture={server:'custom-existing',channel:'announcements',profile:{name:'Ari',avatar:'☾',badge:'night',bio:'A retained biography',accent:'#8899aa',customField:'keep me'},customServers:[{id:'custom-existing',name:'Original club'}],messages:{'afterhours/general':[], 'custom-existing/general':original,'custom-existing/announcements':[sampleMessage('notice','Original announcement')]}};
  const app=harness(fixture),s=app.api.state;
  assert.equal(s.version,2);assert.equal(s.server,fixture.server);assert.equal(s.channel,fixture.channel);
  assert.equal(s.messages['custom-existing/general'].length,100);
  for(let i=0;i<100;i++){const m=s.messages['custom-existing/general'][i];assert.equal(m.id,original[i].id);assert.equal(m.text,original[i].text);assert.equal(m.time,original[i].time);}
  assert.equal(s.messages['custom-existing/general'][3].pinned,true);
  assert.deepEqual(plain(s.messages['custom-existing/general'][3].reactions),original[3].reactions);
  assert.equal(s.messages['custom-existing/general'][3].image,image);
  assert.deepEqual(plain(s.profile),fixture.profile);
  assert.equal(s.customServers[0].owner,true);assert.equal(app.api.canModerate(),true);
  assert.deepEqual(plain(s.messages['afterhours/general']),[],'Intentionally emptied history must not reseed');
  assert.equal(s.artifacts.night!==undefined,true,'Previously equipped badge should be retained as an artifact');
  assert.deepEqual(JSON.parse(app.storage.get('voidline.backup.before-afterhours2')),fixture);
  assert.equal(app.get('chat-feed').scrollTop,0);
});

test('sending, replies, threads, pins, edits, reactions and statistics',async()=>{
  const app=harness({messages:{'afterhours/general':[]}}),api=app.api;
  const first=input(app,'First **transmission**');
  assert.equal(first.author,'self');assert.equal(messages(app,'afterhours/general').length,1,'Sending must not create automatic sample replies');
  api.messageAction('reply',first.id);const reply=input(app,'A reply');assert.equal(reply.replyTo,first.id);
  api.messageAction('thread',first.id);app.get('thread-input').value='A longer thread thought';api.sendThread(prevent());
  const thread=messages(app,'afterhours/general').find(m=>m.threadRoot===first.id);assert.ok(thread);assert.equal(thread.text,'A longer thread thought');
  assert.equal(app.get('thread-panel').hidden,false);api.closeThread();assert.equal(app.get('thread-panel').hidden,true);
  api.messageAction('pin',first.id);assert.equal(messages(app,'afterhours/general').find(m=>m.id===first.id).pinned,true);
  api.messageAction('edit',first.id);assert.match(app.get('modal-content').innerHTML,/edit-message-form/);
  await app.submit('edit-message-form',{text:'Refined transmission'},{id:first.id});
  assert.equal(messages(app,'afterhours/general').find(m=>m.id===first.id).text,'Refined transmission');
  assert.equal(messages(app,'afterhours/general').find(m=>m.id===first.id).edited,true);
  await app.click({react:'💜',id:first.id});
  assert.deepEqual(plain(messages(app,'afterhours/general')[0].reactions),[{emoji:'💜',count:1,mine:true}]);
  await app.click({react:'💜',id:first.id});assert.equal(messages(app,'afterhours/general')[0].reactions.length,0);
  const stats=api.getStats();assert.equal(stats.ownMessages,3);assert.equal(stats.channelsUsed,1);assert.equal(stats.replies,1);assert.equal(stats.pins,1);
  assert.ok(app.moduleCalls.badges>0,'User activity should refresh artifact progress');
  assert.equal(app.saved().messages['afterhours/general'].length,3);
});

test('formatting and archive search preserve readable literal text',()=>{
  const app=harness({messages:{'afterhours/general':[sampleMessage('formatting','Sketch <draft> & notes')]}}),format=app.api.format;
  assert.match(format('**bold** *italic* ~~old~~ `code`'),/<strong>bold<\/strong> <em>italic<\/em> <s>old<\/s> <code>code<\/code>/);
  assert.equal(format('Sketch <draft> & notes'),'Sketch &lt;draft&gt; &amp; notes');
  assert.match(format('See https://example.com/page\n@nova'),/<a href="https:\/\/example.com\/page"/);
  assert.match(format('See https://example.com/page\n@nova'),/<br><span class="mention">@nova<\/span>/);
  assert.match(app.api.searchResults('sketch'),/(?:<mark>)?Sketch(?:<\/mark>)? &lt;draft&gt; &amp; notes/);
  assert.match(app.api.searchResults('nova'),/PROFILE/);
  assert.match(app.api.searchResults('afterhours'),/COMMUNITY/);
});

test('base announcement read-only and owned-community channel/announcement flows',()=>{
  const app=harness({}),api=app.api;
  assert.equal(api.canModerate(),false);assert.equal(api.addChannel('new-room'),false);
  api.changeContext('afterhours','announcements');const before=messages(app,'afterhours/announcements').length;
  input(app,'Cannot publish here');assert.equal(messages(app,'afterhours/announcements').length,before);assert.equal(app.get('message-input').disabled,true);
  const sample=messages(app,'afterhours/announcements')[0],wasPinned=sample.pinned;api.messageAction('pin',sample.id);assert.equal(sample.pinned,wasPinned);
  const community=api.createLocalServer('Late Studio','Making things together','Art & design');assert.ok(community);assert.equal(api.canModerate(),true);
  assert.equal(api.addChannel('Work in Progress','Bring unfinished work'),'work-in-progress');assert.equal(api.state.channel,'work-in-progress');
  assert.equal(api.addChannel('Work in Progress'),false,'Duplicate channels should be rejected');
  api.changeContext(community.id,'announcements');assert.equal(app.get('message-input').disabled,false);
  const notice=input(app,'Welcome to our studio');assert.equal(notice.text,'Welcome to our studio');assert.equal(messages(app,community.id+'/announcements').length,1);
  const stats=api.getStats();assert.equal(stats.customServers,1);assert.equal(stats.customChannels,1);
});

test('channel drafts remain isolated and are cleared after sending',()=>{
  const app=harness({messages:{'afterhours/general':[]}}),api=app.api;
  app.get('message-input').value='An unfinished thought';api.changeContext('afterhours','introductions');
  assert.equal(app.get('message-input').value,'');api.changeContext('afterhours','general');assert.equal(app.get('message-input').value,'An unfinished thought');
  api.sendMessage(prevent());api.changeContext('afterhours','introductions');api.changeContext('afterhours','general');assert.equal(app.get('message-input').value,'');
});

test('deletion includes a thread and tombstones survive stale persisted copies',()=>{
  const app=harness({messages:{'afterhours/general':[]}}),api=app.api;
  const root=input(app,'Root to remove');api.messageAction('thread',root.id);app.get('thread-input').value='Child to remove';api.sendThread(prevent());
  const child=messages(app,'afterhours/general').find(m=>m.threadRoot===root.id),stale=app.saved();
  api.removeMessage(root.id);assert.equal(messages(app,'afterhours/general').length,0);assert.ok(api.state.deleted.includes(root.id));assert.ok(api.state.deleted.includes(child.id));
  app.storage.set(STORE,JSON.stringify(stale));api.persist();assert.equal(messages(app,'afterhours/general').length,0,'Stale saved messages must not revive deleted IDs');
  const reloaded=harness(null,app.storage,{sessionStorage:app.sessionStorage});assert.equal(messages(reloaded,'afterhours/general').length,0);assert.ok(reloaded.api.state.deleted.includes(root.id));
});

test('storage events merge message additions and later edits while applying deletion tombstones',async()=>{
  const app=harness({messages:{'afterhours/general':[]}}),api=app.api;const local=input(app,'Local message');
  const incoming=app.saved();incoming.messages['afterhours/general'].push(sampleMessage('from-other-tab','Remote message',{time:Date.now()+1000,updatedAt:Date.now()+1000}));
  incoming.messages['afterhours/general'][0].text='Edited in another tab';incoming.messages['afterhours/general'][0].updatedAt=Date.now()+2000;incoming.profile.bio='Cross-tab biography';
  await app.storageEvent(incoming);assert.equal(messages(app,'afterhours/general').length,2);assert.equal(messages(app,'afterhours/general').find(m=>m.id===local.id).text,'Edited in another tab');assert.equal(api.state.profile.bio,'Cross-tab biography');
  const deletion=app.saved();deletion.deleted.push(local.id);deletion.messages['afterhours/general']=deletion.messages['afterhours/general'].filter(m=>m.id!==local.id);
  await app.storageEvent(deletion);assert.equal(messages(app,'afterhours/general').some(m=>m.id===local.id),false);assert.equal(messages(app,'afterhours/general').some(m=>m.id==='from-other-tab'),true);
});

test('DM sample contacts are local, deduplicate, retain notes and survive reload',()=>{
  const app=harness({messages:{'afterhours/general':[]}}),api=app.api;
  api.dm('nova');assert.equal(api.state.server,'direct');assert.equal(api.state.channel,'dm-nova');assert.equal(api.state.conversations.length,1);
  input(app,'A device-local hello');assert.equal(messages(app,'direct/dm-nova').length,1,'Sample contact does not auto-reply');
  api.dm('nova');assert.equal(api.state.conversations.length,1);
  api.changeContext('direct','notes');assert.equal(api.state.channel,'notes','Saved signals should remain accessible after opening a DM');
  input(app,'Private saved signal');assert.equal(messages(app,'direct/notes').length,1);api.persist();
  const reloaded=harness(null,app.storage,{sessionStorage:app.sessionStorage});assert.equal(reloaded.api.state.server,'direct');assert.equal(reloaded.api.state.channel,'notes');assert.equal(messages(reloaded,'direct/dm-nova').length,1);assert.equal(messages(reloaded,'direct/notes').length,1);
});

test('desktop member visibility uses the same persisted setting as renderAll',async()=>{
  const app=harness({settings:{memberSidebar:true}});
  await app.click({action:'members'});assert.equal(app.api.state.settings.memberSidebar,false);assert.equal(app.document.body.classList.contains('members-hidden'),true);
  await app.click({action:'members'});assert.equal(app.api.state.settings.memberSidebar,true);assert.equal(app.document.body.classList.contains('members-hidden'),false);
});

test('normalization handles malformed saved context without losing valid message buckets',()=>{
  const app=harness({server:'toString',channel:'missing',messages:{'afterhours/general':[sampleMessage('valid','Still here',{time:Number.MAX_VALUE})]}});
  assert.equal(app.api.state.server,'afterhours');assert.equal(app.api.state.channel,'general');assert.equal(messages(app,'afterhours/general')[0].id,'valid');assert.ok(Number.isFinite(messages(app,'afterhours/general')[0].time));
});

module.exports={harness,plain,prevent,input,messages,sampleMessage,STORE};
if(require.main===module)(async()=>{let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`\n${tests.length-failures}/${tests.length} behavioral checks passed. Browser layout, native media recording, and downloads are not exercised.`);process.exitCode=failures?1:0;})();
