'use strict';
// Focused storage-quota acceptance checks. No browser rendering or native dialogs are modeled.
const assert=require('node:assert/strict');
const {harness,plain,prevent,messages,sampleMessage}=require('./voidline-v2-test.cjs');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
const boot=(initial={},realModules=false)=>harness(initial,new Map(),{realModules});
const root=()=>sampleMessage('owned-root','A previously saved message',{pinned:false});
function denyWrites(app){const before=app.saved(),working=app.context.localStorage.setItem;app.context.localStorage.setItem=()=>{throw Object.assign(new Error('Storage quota exceeded'),{name:'QuotaExceededError'});};return {before,restore(){app.context.localStorage.setItem=working;}};}
function durableUnchanged(app,before){assert.deepEqual(app.saved(),before,'Failed mutation must not change the committed archive');}
function noSuccess(app,pattern){assert.doesNotMatch(app.get('toast').textContent,pattern,'A failed write must not produce success feedback');}

test('quota-denied thread send retains input and does not commit a reply',()=>{
  const app=boot({messages:{'afterhours/general':[root()]}});app.api.messageAction('thread','owned-root');
  const composer=app.get('thread-input');composer.value='Keep this reply until it can be saved';const {before}=denyWrites(app);
  assert.equal(app.api.sendThread(prevent()),false);assert.equal(app.get('thread-input'),composer);assert.equal(composer.value,'Keep this reply until it can be saved');assert.equal(messages(app,'afterhours/general').length,1);durableUnchanged(app,before);
  const reloaded=harness(null,app.storage,{sessionStorage:app.sessionStorage});assert.equal(messages(reloaded,'afterhours/general').length,1);noSuccess(app,/Message saved|reply saved/i);
});

test('quota-denied edit retains its dialog and draft while restoring saved text',async()=>{
  const app=boot({messages:{'afterhours/general':[root()]}});app.api.messageAction('edit','owned-root');const editor=app.get('edit-text');editor.value='A refinement which has not saved';const {before}=denyWrites(app);
  await app.submit('edit-message-form',{text:editor.value},{id:'owned-root'});
  assert.equal(app.get('app-modal').open,true);assert.equal(app.get('edit-text'),editor);assert.equal(editor.value,'A refinement which has not saved');assert.equal(messages(app,'afterhours/general')[0].text,'A previously saved message');assert.equal(messages(app,'afterhours/general')[0].edited,false);durableUnchanged(app,before);noSuccess(app,/Message updated/i);
});

test('quota-denied pin leaves message unpinned and suppresses success',()=>{
  const app=boot({messages:{'afterhours/general':[root()]}}),{before}=denyWrites(app);
  app.api.messageAction('pin','owned-root');assert.equal(messages(app,'afterhours/general')[0].pinned,false);durableUnchanged(app,before);noSuccess(app,/Transmission pinned|Pin removed/i);
});

test('quota-denied community creation does not add or acknowledge a community',()=>{
  const app=boot({messages:{'afterhours/general':[]}}),beforeCount=app.api.state.customServers.length,{before}=denyWrites(app);
  assert.ok(!app.api.createLocalServer('Uncommitted community','This should be recoverable'));
  assert.equal(app.api.state.customServers.length,beforeCount);assert.equal(app.api.state.customServers.some(s=>s.name==='Uncommitted community'),false);durableUnchanged(app,before);noSuccess(app,/community is ready|owner permissions|frequency is ready/i);
});

test('quota-denied channel creation preserves owner context and existing channel list',()=>{
  const app=boot({server:'custom-owned',channel:'general',customServers:[{id:'custom-owned',name:'Owned studio',owner:true,channels:[['general','Conversation'],['announcements','Notices']]}],messages:{'custom-owned/general':[]}}),{before}=denyWrites(app);
  assert.ok(!app.api.addChannel('Unsaved room','Do not lose the previous channels'));
  assert.equal(app.api.state.server,'custom-owned');assert.equal(app.api.state.channel,'general');assert.equal(app.api.state.customServers[0].channels.length,2);assert.equal(app.api.state.customServers[0].channels.some(c=>c[0]==='unsaved-room'),false);durableUnchanged(app,before);noSuccess(app,/#unsaved-room is ready|channel created/i);
});

test('quota-denied real profile save retains editor and reports unsaved edits',async()=>{
  const app=boot({profile:{name:'Ari',avatar:'A',badge:'larp',bio:'An existing biography worth retaining.',statusText:'Listening'},messages:{'afterhours/general':[]}},true);
  app.window.VoidProfiles.edit();const {before}=denyWrites(app);
  await app.submit('vp-profile-form',{name:'Nia',avatar:'N',bio:'A replacement biography which is not yet saved.',status:'idle',statusText:'A new status',theme:'velvet',accent:'#887799',banner:'aurora',frame:'orbit',layout:'editorial',animated:'on',featuredBadges:['larp']});
  assert.equal(app.api.state.profile.name,'Ari');assert.equal(app.api.state.profile.bio,'An existing biography worth retaining.');assert.equal(app.get('app-modal').open,true);assert.ok(app.get('app-modal').classList.contains('vp-editor-modal'));assert.match(app.get('vp-save-state').textContent,/Not saved|unsaved/i);assert.doesNotMatch(app.get('vp-save-state').textContent,/No unsaved changes/);durableUnchanged(app,before);noSuccess(app,/Identity saved|world looks good/i);
});

test('quota-denied real artifact equip retains the previously equipped artifact',async()=>{
  const app=boot({profile:{name:'Ari',avatar:'A',badge:'larp'},messages:{'afterhours/general':[]}},true);
  app.window.VoidBadges.open('founder');assert.equal(app.window.VoidBadges.has('founder'),true);const {before}=denyWrites(app);
  await app.click({vbadgeEquip:'founder'});assert.equal(app.api.state.profile.badge,'larp');durableUnchanged(app,before);noSuccess(app,/now on your profile|equipped/i);
  const reloaded=harness(null,app.storage,{realModules:true,sessionStorage:app.sessionStorage});assert.equal(reloaded.api.state.profile.badge,'larp');
});

(async()=>{let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`\n${tests.length-failures}/${tests.length} mutation-failure acceptance checks passed. Storage errors are simulated; no app files were changed.`);process.exitCode=failures?1:0;})();
