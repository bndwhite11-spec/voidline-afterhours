'use strict';
// Trust regressions: active destinations, refresh-safe drafts, visible read state,
// useful commands, initial content, and actual static-node reconciliation.
const assert=require('node:assert/strict');
const {harness,plain,input,messages,sampleMessage}=require('./voidline-v2-test.cjs');
const verifyStaticReconciliation=require('./trust-reconcile-fixture.cjs');
const verifyAttachmentRefresh=require('./trust-attachment-fixture.cjs');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);

test('another tab navigation cannot redirect an unsent local draft',async()=>{
  const app=harness({messages:{'afterhours/general':[]}});app.get('message-input').value='Only for Afterhours';await app.get('message-input').dispatch('input');
  const remote=app.saved();remote.server='arcade';remote.channel='general';remote.messages['arcade/general']=remote.messages['arcade/general']||[];remote.messages['arcade/general'].push(sampleMessage('foreign-tab-update','Another tab received a message',{author:'nova',time:Date.now()}));await app.storageEvent(remote);assert.ok(messages(app,'arcade/general').some(m=>m.id==='foreign-tab-update'),'The shared archive update should still be applied');
  assert.equal(app.api.state.server,'afterhours','Another tab may update shared content but cannot move this tab’s destination');assert.equal(app.api.state.channel,'general');assert.equal(app.get('message-input').value,'Only for Afterhours');
  app.api.sendMessage({preventDefault(){}});assert.ok(messages(app,'afterhours/general').some(m=>m.text==='Only for Afterhours'));assert.ok(!(messages(app,'arcade/general')||[]).some(m=>m.text==='Only for Afterhours'));
});

test('a same-tab refresh restores its unsent composer text',async()=>{
  const storage=new Map(),session=new Map(),app=harness({messages:{'afterhours/general':[]}},storage,{sessionStorage:session,controlledTimers:true});
  app.get('message-input').value='A thought which should survive a refresh';await app.get('message-input').dispatch('input');await app.flushTimers(500);
  const reloaded=harness(null,storage,{sessionStorage:session,controlledTimers:true});assert.equal(reloaded.get('message-input').value,'A thought which should survive a refresh');
  reloaded.api.changeContext('afterhours','introductions');reloaded.get('message-input').value='Introduction draft';await reloaded.get('message-input').dispatch('input');await reloaded.flushTimers(500);const secondReload=harness(null,storage,{sessionStorage:session,controlledTimers:true});assert.equal(secondReload.api.state.channel,'introductions');assert.equal(secondReload.get('message-input').value,'Introduction draft');secondReload.api.changeContext('afterhours','general');assert.equal(secondReload.get('message-input').value,'A thought which should survive a refresh');
  const otherTab=harness(null,storage,{sessionStorage:new Map()});assert.equal(otherTab.get('message-input').value,'','A different tab should not inherit this private unsent draft');
});

test('same-tab refresh retains the reply target and each unsent thread draft',async()=>{
  const storage=new Map(),session=new Map(),root=sampleMessage('refresh-root','An original message'),app=harness({messages:{'afterhours/general':[root]}},storage,{sessionStorage:session,controlledTimers:true});
  app.api.messageAction('reply',root.id);app.get('message-input').value='A reply still being composed';await app.get('message-input').dispatch('input');
  app.api.messageAction('thread',root.id);app.get('thread-input').value='An unsent thought inside the thread';await app.dispatchDocument('input',{target:app.get('thread-input')});await app.flushTimers(500);
  const reloaded=harness(null,storage,{sessionStorage:session,controlledTimers:true});assert.equal(reloaded.get('message-input').value,'A reply still being composed');const sent=reloaded.api.sendMessage({preventDefault(){}});assert.equal(sent.replyTo,root.id,'Refreshing must not silently turn a reply into a standalone message');
  reloaded.api.messageAction('thread',root.id);assert.equal(reloaded.get('thread-input').value,'An unsent thought inside the thread');
});

test('a fully visible short channel becomes read without a synthetic scroll',async()=>{
  const newest=1700000000123,app=harness({server:'afterhours',channel:'introductions',messages:{'afterhours/general':[],'afterhours/introductions':[sampleMessage('short-visible','Fully visible introduction',{author:'nova',time:newest})]},lastRead:{}},new Map(),{controlledTimers:true,nodeMetrics:{'chat-feed':{clientHeight:500,scrollHeight:200,scrollTop:0}}});
  await app.flushTimers(1000);assert.ok((app.api.state.lastRead['afterhours/introductions']||0)>=newest,'Messages already visible on entry should be marked read without requiring an impossible scroll');
});

test('the command palette can find a sample person by name',async()=>{
  const app=harness({});await app.click({action:'command'});const query=app.get('command-input');query.value='nova';await app.dispatchDocument('input',{target:query});
  const html=app.get('command-results').innerHTML;assert.match(html,/nova/i);assert.match(html,/data-(?:person|dm|command-person)="nova"/,'The person result should offer a usable profile or conversation action');
});

test('first entry has a populated general conversation while an intentionally emptied archive remains empty',()=>{
  const fresh=harness(null,new Map());assert.ok(messages(fresh,'afterhours/general').some(m=>m.author!=='self'),'Fresh entry should include the supplied community conversation');
  const emptied=harness({version:2,messages:{'afterhours/general':[]}});assert.equal(messages(emptied,'afterhours/general').length,0,'An existing intentionally empty channel must stay empty');
});

test('reused static introduction nodes receive their new content through the template path',()=>{verifyStaticReconciliation(harness({}));});

test('denied session storage retains the draft, warns before leaving, and exports recoverable content',async()=>{
  const storage=new Map(),session=new Map(),app=harness({messages:{'afterhours/general':[]}},storage,{sessionStorage:session,controlledTimers:true}),working=app.context.sessionStorage.setItem;
  app.context.sessionStorage.setItem=()=>{throw Object.assign(new Error('Session quota exceeded'),{name:'QuotaExceededError'});};
  const text='Keep this draft recoverable even when the tab cannot save';app.get('message-input').value=text;await app.get('message-input').dispatch('input');
  assert.equal(app.get('message-input').value,text);assert.equal(app.get('save-status').hidden,false);assert.match(app.get('save-status').innerHTML,/draft|not stored|recovery/i);
  app.api.changeContext('afterhours','introductions');app.api.changeContext('afterhours','general');assert.equal(app.get('message-input').value,text,'Session write failure must still preserve this running tab’s draft');
  const beforeUnload={type:'beforeunload',preventDefault(){this.defaultPrevented=true;}};app.window.dispatchEvent(beforeUnload);assert.equal(beforeUnload.defaultPrevented,true,'The app should warn before discarding an unsaved tab session');
  let exported;app.context.URL={createObjectURL(blob){exported=blob;return 'blob:trust-recovery';},revokeObjectURL(){}};await app.click({action:'recover-save'});assert.ok(exported);const recovery=JSON.parse(await exported.text());assert.equal(recovery.format,'voidline-recovery');assert.ok(JSON.stringify(recovery.tabSession).includes(text),'Recovery export must include the unsaved composer content');
  app.context.sessionStorage.setItem=working;await app.click({action:'retry-save'});assert.equal(app.get('save-status').hidden,true);const reloaded=harness(null,storage,{sessionStorage:session,controlledTimers:true});assert.equal(reloaded.get('message-input').value,text);
});

test('pending image and voice attachments survive refresh before being sent',async()=>{await verifyAttachmentRefresh(harness);});

(async()=>{let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`\n${tests.length-failures}/${tests.length} trust checks passed. Browser layout is not modeled.`);process.exitCode=failures?1:0;})();
