'use strict';
// Regression checks for durable saves, concurrent tabs, retention, import, and archive search.
const assert=require('node:assert/strict');
const {harness,plain,prevent,input,messages,sampleMessage,STORE}=require('./voidline-v2-test.cjs');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
async function importArchive(app,state){const originalCreate=app.document.createElement;let picker;app.document.createElement=tag=>{const element=originalCreate(tag);if(tag==='input')picker=element;return element;};await app.click({action:'import'});assert.ok(picker?.onchange);const data=JSON.stringify({format:'voidline-afterhours',state});picker.files=[{size:data.length,text:async()=>data}];await picker.onchange();if(/data-action="commit-import"/.test(app.get('modal-content').innerHTML))await app.click({action:'commit-import'});app.document.createElement=originalCreate;}

test('failed save preserves composer and does not claim a message was saved',async()=>{
  const app=harness({messages:{'afterhours/general':[]}}),before=app.saved(),workingWrite=app.context.localStorage.setItem;
  app.context.localStorage.setItem=()=>{throw Object.assign(new Error('Storage quota exceeded'),{name:'QuotaExceededError'});};
  const draft='Keep this thought until storage is available';app.get('message-input').value=draft;const result=app.api.sendMessage(prevent());
  assert.equal(app.get('message-input').value,draft,'A failed write must retain the composer text');
  assert.ok(!result,'Sending should report failure when no durable write succeeds');
  assert.equal(messages(app,'afterhours/general').length,0,'Uncommitted transmission must not appear as saved');
  assert.doesNotMatch(app.get('message-announcer').textContent,/Message saved/i);
  assert.deepEqual(app.saved(),before,'Last durable archive should stay intact');
  app.context.localStorage.setItem=workingWrite;await app.click({action:'retry-save'});input(app,draft);
  assert.equal(messages(app,'afterhours/general').length,1,'Retry plus resending the preserved draft must not duplicate its message');
  const reloaded=harness(null,app.storage);assert.equal(messages(reloaded,'afterhours/general').length,1);assert.equal(messages(reloaded,'afterhours/general')[0].text,draft);
});

test('retention preserves root and all 499 children when another message is sent',()=>{
  const root=sampleMessage('retention-root','The beginning of a long thread',{time:1700000000000});
  const children=Array.from({length:499},(_,i)=>sampleMessage('retention-child-'+i,'Thread reply '+i,{time:1700000000001+i,threadRoot:root.id}));
  const app=harness({messages:{'afterhours/general':[root,...children]}});
  input(app,'A new transmission after the five-hundredth message');
  const list=messages(app,'afterhours/general');assert.ok(list.some(m=>m.id===root.id),'Retention must not strand thread replies by silently discarding their root');assert.equal(list.length,501);
  const reloaded=harness(null,app.storage);assert.equal(messages(reloaded,'afterhours/general').length,501);assert.ok(messages(reloaded,'afterhours/general').some(m=>m.id===root.id));
});

test('a stale tab message does not erase a community and channel created in another tab',()=>{
  const storage=new Map(),first=harness({messages:{'afterhours/general':[]}},storage),stale=harness(null,storage);
  const community=first.api.createLocalServer('Concurrent studio');first.api.addChannel('Projects','Keep work together');input(first,'Message in the new community');
  input(stale,'A message from the previously opened tab');
  const reloaded=harness(null,storage),retained=reloaded.api.state.customServers.find(s=>s.id===community.id);
  assert.ok(retained,'A stale tab must preserve communities committed by another tab');assert.ok(retained.channels.some(c=>c[0]==='projects'),'The separately created channel must remain reachable');
  reloaded.api.changeContext(community.id,'projects');assert.equal(reloaded.api.state.channel,'projects');assert.ok(messages(reloaded,community.id+'/projects').some(m=>m.text==='Message in the new community'));
  assert.ok(messages(reloaded,'afterhours/general').some(m=>m.text==='A message from the previously opened tab'));
});

test('twenty-fifth imported community is retained or clearly rejected without partial changes',async()=>{
  const communities=Array.from({length:24},(_,i)=>({id:'custom-old-'+i,name:'Existing '+i,owner:true,channels:[['general','Existing room'],['announcements','Notices']]}));
  const app=harness({server:communities[0].id,channel:'general',customServers:communities,messages:{}});
  const imported={version:2,profile:plain(app.api.state.profile),customServers:[{id:'custom-import-25',name:'Imported twenty-fifth',owner:true,channels:[['general','Imported room'],['announcements','Imported notices']]}],messages:{'custom-import-25/general':[sampleMessage('import-25-message','A message which must stay accessible')]}};
  const before=app.saved();await importArchive(app,imported);
  if(!app.api.state.customServers.some(s=>s.id==='custom-import-25')){assert.match(app.get('toast').textContent,/capacity|24|limit/i,'Capacity rejection must explain the issue');assert.match(app.get('toast').textContent,/unchanged|nothing changed/i);assert.deepEqual(app.saved(),before,'Rejected import must leave all durable data unchanged');assert.ok(!app.api.state.messages['custom-import-25/general'],'Rejected import must not leave orphaned messages');return;}
  const reloaded=harness(null,app.storage);assert.ok(reloaded.api.state.customServers.some(s=>s.id==='custom-import-25'),'Reload must not silently truncate an accepted imported community');
  reloaded.api.changeContext('custom-import-25','general');assert.equal(reloaded.api.state.server,'custom-import-25');assert.equal(messages(reloaded,'custom-import-25/general')[0].id,'import-25-message');
});

test('global search chooses newest messages across channels before limiting results',()=>{
  const newest=sampleMessage('global-newest','global-needle newest result',{time:1800000000000});
  const older=Array.from({length:40},(_,i)=>sampleMessage('global-older-'+i,'global-needle older result '+i,{time:1700000000000+i}));
  const app=harness({messages:{'afterhours/general':[newest],'afterhours/introductions':older}}),html=app.api.searchResults('global-needle');
  const ids=Array.from(html.matchAll(/data-search-message="([^"]+)"/g),m=>m[1]);
  assert.equal(ids[0],newest.id,'The newest global result must not be omitted because its bucket was inserted first');assert.ok(ids.length<=30);assert.equal(ids[1],'global-older-39');assert.equal(ids.at(-1),'global-older-11');
});

test('storage refresh retains the active thread composer node, draft, selection and focus',async()=>{
  const root=sampleMessage('stable-thread-root','Start a thread');
  const app=harness({messages:{'afterhours/general':[root]}});app.api.messageAction('thread',root.id);
  const composer=app.get('thread-input');composer.value='An unsent thread thought';composer.selectionStart=3;composer.selectionEnd=12;composer.focus();
  const incoming=app.saved();incoming.messages['afterhours/general'].push(sampleMessage('remote-refresh','Another tab has a new message',{author:'nova',time:Date.now()}));
  await app.storageEvent(incoming);
  assert.ok(messages(app,'afterhours/general').some(m=>m.id==='remote-refresh'),'Storage refresh must first apply the incoming durable mutation');
  assert.equal(app.get('thread-input'),composer,'A background update must retain the active composer element');assert.equal(composer.value,'An unsent thread thought');assert.equal(composer.selectionStart,3);assert.equal(composer.selectionEnd,12);assert.equal(app.document.activeElement,composer);
});

test('searching an older thread reply opens and highlights that exact reply',async()=>{
  const root=sampleMessage('search-thread-root','Thread origin',{time:1700000000000});
  const replies=Array.from({length:160},(_,i)=>sampleMessage('search-thread-child-'+i,'Retained thread thought '+i,{time:1700000000001+i,threadRoot:root.id}));
  const app=harness({messages:{'afterhours/general':[root,...replies]}}),targetId='search-thread-child-10';
  await app.click({searchMessage:targetId,searchKey:'afterhours/general'});
  assert.equal(app.get('thread-panel').hidden,false);const target=app.get('thread-feed').querySelectorAll('[data-message-id]').find(n=>n.dataset.messageId===targetId);
  assert.ok(target,'The requested older reply should be included in the rendered thread');assert.equal(target.scrolledIntoView,true,'Navigation should scroll to the requested reply');assert.ok(target.classList.contains('search-highlight'));assert.equal(app.document.activeElement,target);
});

(async()=>{let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`\n${tests.length-failures}/${tests.length} reliability regressions passed. This harness does not model browser layout.`);process.exitCode=failures?1:0;})();
