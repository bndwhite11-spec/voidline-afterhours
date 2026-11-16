'use strict';
// Focused regressions for thread drafts, archive merges, and asynchronous recorder cleanup.
// Media streams and permission promises are controlled fakes; no hardware is used.
const assert=require('node:assert/strict');
const {harness,plain,prevent,input,messages,sampleMessage}=require('./voidline-v2-test.cjs');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
const flush=()=>new Promise(setImmediate);
function microphone(app){
  const requests=[],recorders=[];
  class Recorder {
    static isTypeSupported(){return true;}
    constructor(stream,options={}){this.stream=stream;this.mimeType=options.mimeType||'audio/webm';this.state='inactive';recorders.push(this);}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.onstop?.();}
  }
  app.context.MediaRecorder=Recorder;app.window.MediaRecorder=Recorder;
  app.context.navigator.mediaDevices={getUserMedia(){return new Promise((resolve,reject)=>requests.push({resolve,reject}));}};
  const stream=()=>{const track={stops:0,stop(){this.stops++;}};return {track,getTracks:()=>[track]};};
  return {requests,recorders,stream};
}

test('thread drafts stay separate by root/channel and sending clears only that draft',()=>{
  const app=harness({messages:{'afterhours/general':[],'afterhours/introductions':[sampleMessage('intro-root','An introduction')]}}),api=app.api;
  const a=input(app,'Thread A'),b=input(app,'Thread B');
  api.messageAction('thread',a.id);app.get('thread-input').value='Draft for A <unfinished>';
  api.messageAction('thread',b.id);assert.equal(app.get('thread-input').value,'');app.get('thread-input').value='Draft for B';
  api.messageAction('thread',a.id);assert.equal(app.get('thread-input').value,'Draft for A <unfinished>');
  api.changeContext('afterhours','introductions');api.messageAction('thread','intro-root');assert.equal(app.get('thread-input').value,'');app.get('thread-input').value='Draft for intro';
  api.changeContext('afterhours','general');api.messageAction('thread',b.id);assert.equal(app.get('thread-input').value,'Draft for B');
  api.messageAction('thread',a.id);assert.equal(app.get('thread-input').value,'Draft for A <unfinished>');api.sendThread(prevent());
  api.messageAction('thread',b.id);assert.equal(app.get('thread-input').value,'Draft for B');api.messageAction('thread',a.id);assert.equal(app.get('thread-input').value,'');
  api.changeContext('afterhours','introductions');api.messageAction('thread','intro-root');assert.equal(app.get('thread-input').value,'Draft for intro');
});

test('import updates existing community metadata/channels/settings while retaining local history',async()=>{
  const app=harness({version:2,server:'custom-import',channel:'general',profile:{name:'Ari',avatar:'A',badge:'larp'},customServers:[{id:'custom-import',name:'Original name',owner:true,channels:[['general','Old topic'],['announcements','Old notices'],['local-only','Keep this room']]}],messages:{'custom-import/general':[sampleMessage('local-message','Retain local message')],'custom-import/local-only':[sampleMessage('local-room-message','Retain local-only room')]}});
  const archive=app.saved();archive.customServers[0].name='Updated studio';archive.customServers[0].description='Imported community description';archive.customServers[0].channels=[['general','Updated topic'],['announcements','Updated notices'],['new-ideas','Imported new room']];archive.settings={compact:true,motion:false,memberSidebar:false};archive.messages['custom-import/new-ideas']=[sampleMessage('imported-message','Accessible imported message')];
  const originalCreate=app.document.createElement;let picker;
  app.document.createElement=tag=>{const element=originalCreate(tag);if(tag==='input')picker=element;return element;};
  await app.click({action:'import'});assert.ok(picker?.onchange,'Import action should create its file picker');
  const data=JSON.stringify({format:'voidline-afterhours',state:archive});picker.files=[{size:data.length,text:async()=>data}];await picker.onchange();
  const community=app.api.state.customServers.find(s=>s.id==='custom-import');assert.equal(app.api.state.customServers.length,1);assert.equal(community.name,'Updated studio');assert.equal(community.description,'Imported community description');assert.equal(community.channels.find(c=>c[0]==='general')[1],'Updated topic');
  for(const channel of ['general','announcements','local-only','new-ideas'])assert.ok(community.channels.some(c=>c[0]===channel),'Preserve/merge channel '+channel);
  assert.equal(messages(app,'custom-import/general')[0].id,'local-message');assert.equal(messages(app,'custom-import/local-only')[0].id,'local-room-message');
  app.api.changeContext('custom-import','new-ideas');assert.equal(app.api.state.channel,'new-ideas');assert.equal(messages(app,'custom-import/new-ideas')[0].id,'imported-message');
  assert.equal(app.api.state.settings.compact,true);assert.equal(app.api.state.settings.motion,false);assert.equal(app.api.state.settings.memberSidebar,false);assert.ok(app.document.body.classList.contains('members-hidden'));
  const reloaded=harness(null,app.storage);assert.equal(reloaded.api.state.customServers.find(s=>s.id==='custom-import').name,'Updated studio');assert.equal(reloaded.api.state.settings.memberSidebar,false);
});

test('duplicate microphone starts share one pending request and cancellation stops stale stream',async()=>{
  const app=harness({messages:{'afterhours/general':[]}}),mic=microphone(app);
  await app.click({action:'voice'});await app.click({action:'record-voice'});await app.click({action:'record-voice'});
  assert.equal(mic.requests.length,1,'A second Start while permission is pending must not request another stream');assert.equal(app.get('record-button').disabled,true);
  app.api.closeModal();assert.equal(app.get('app-modal').open,false);
  const stale=mic.stream();mic.requests[0].resolve(stale);await flush();assert.equal(stale.track.stops,1);assert.equal(mic.recorders.length,0,'A canceled permission result must never start a recorder');
});

test('replacing voice modal invalidates a pending microphone permission result',async()=>{
  const app=harness({messages:{'afterhours/general':[]}}),mic=microphone(app);
  await app.click({action:'voice'});await app.click({action:'record-voice'});
  app.api.modal('<h2>A different dialog</h2>');assert.equal(app.get('app-modal').open,true);
  const stale=mic.stream();mic.requests[0].resolve(stale);await flush();assert.equal(stale.track.stops,1);assert.equal(mic.recorders.length,0);
});

test('stale permission result cannot interrupt a newer request and active recording cleans up on close',async()=>{
  const app=harness({messages:{'afterhours/general':[]}}),mic=microphone(app);
  await app.click({action:'voice'});await app.click({action:'record-voice'});app.api.closeModal();
  await app.click({action:'voice'});await app.click({action:'record-voice'});assert.equal(mic.requests.length,2);
  const stale=mic.stream(),current=mic.stream();mic.requests[0].resolve(stale);await flush();assert.equal(stale.track.stops,1);assert.equal(mic.recorders.length,0);assert.equal(app.get('record-button').disabled,true);
  mic.requests[1].resolve(current);await flush();assert.equal(mic.recorders.length,1);assert.equal(mic.recorders[0].stream,current);assert.equal(mic.recorders[0].state,'recording');assert.equal(app.get('record-button').disabled,false);
  app.api.closeModal();assert.equal(mic.recorders[0].state,'inactive');assert.equal(current.track.stops,1);assert.equal(app.get('app-modal').open,false);
});

(async()=>{let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`\n${tests.length-failures}/${tests.length} focused regressions passed. No browser or microphone hardware was used.`);process.exitCode=failures?1:0;})();
