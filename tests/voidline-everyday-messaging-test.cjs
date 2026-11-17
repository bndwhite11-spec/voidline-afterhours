'use strict';
const assert=require('node:assert/strict');
const {harness,plain,sampleMessage}=require('./voidline-v2-test.cjs');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
const at=Date.parse('2026-02-28T12:00:00Z');
const fixture=(messages={},extra={})=>({messages:{'afterhours/general':[],...messages},...extra});

test('saving another resident’s message is personal, survives refresh, and never changes a community pin',async()=>{
 const message=sampleMessage('save-the-work','Keep this useful rough',{author:'pixel',time:at,pinned:false});
 const storage=new Map(),app=harness(fixture({'afterhours/general':[message]}),storage,{controlledTimers:true});
 assert.equal(app.api.toggleBookmark(message.id),true);
 assert.equal(app.api.state.messages['afterhours/general'][0].pinned,false);
 assert.equal(app.api.bookmarkedMessages().length,1);
 app.api.messageAction('menu',message.id);
 assert.match(app.get('context-menu').innerHTML,/Remove from Saved/);
 const reloaded=harness(null,storage,{controlledTimers:true});
 assert.equal(reloaded.api.bookmarkedMessages()[0].message.text,message.text);
 await reloaded.click({action:'saved-messages'});
 assert.match(reloaded.get('modal-content').innerHTML,/Afterhours \/ #general/);
 const saved=reloaded.api.bookmarkedMessages()[0];
 await reloaded.click({removeBookmark:saved.id});
 assert.equal(reloaded.api.bookmarkedMessages().length,0);
 assert.equal(reloaded.api.state.messages['afterhours/general'][0].text,message.text);
});

test('a saved thread reply opens its original channel and exact thread',async()=>{
 const root=sampleMessage('saved-thread-root','The source post',{author:'nova',time:at});
 const reply=sampleMessage('saved-thread-reply','A reply worth keeping',{author:'ghost',time:at+1000,threadRoot:root.id});
 const app=harness(fixture({'afterhours/introductions':[root,reply]}),new Map(),{controlledTimers:true});
 assert.equal(app.api.toggleBookmark(reply.id,'afterhours/introductions'),true);
 await app.click({action:'saved-messages'});
 assert.match(app.get('modal-content').innerHTML,/Thread reply/);
 await app.click({searchKey:'afterhours/introductions',searchMessage:reply.id});
 assert.equal(app.api.state.channel,'introductions');
 assert.equal(app.get('thread-panel').hidden,false);
 assert.ok(app.get('thread-feed').messageNodes.some(node=>node.dataset.messageId===reply.id&&node.scrolledIntoView));
});

test('saved entries explain a deleted source and can be removed independently',async()=>{
 const own=sampleMessage('removed-bookmark-source','A temporary note',{time:at});
 const app=harness(fixture({'afterhours/general':[own]}),new Map(),{controlledTimers:true});
 app.api.toggleBookmark(own.id);app.api.removeMessage(own.id);
 await app.click({action:'saved-messages'});
 assert.match(app.get('modal-content').innerHTML,/Original message unavailable/);
 assert.equal(app.api.openMessageSource('afterhours/general',own.id),false);
 assert.equal(app.api.removeBookmark(app.api.bookmarkedMessages()[0].id),true);
 assert.equal(app.api.bookmarkedMessages().length,0);
});

test('favorites distinguish identical channel names, persist, and provide a useful empty filter',async()=>{
 const storage=new Map(),app=harness(fixture(),storage,{controlledTimers:true});
 app.api.toggleFavorite('arcade/general');
 assert.equal(app.api.state.favoriteContexts['afterhours/general'],undefined);
 app.api.setContextFilter('favorites');
 assert.match(app.get('channel-list').innerHTML,/No favorites here yet/);
 assert.match(app.get('channel-list').innerHTML,/data-context-filter="all"/);
 app.api.toggleFavorite('afterhours/introductions');
 assert.deepEqual(plain(app.api.getContextEntries('afterhours','favorites').map(entry=>entry.id)),['introductions']);
 const reloaded=harness(null,storage,{controlledTimers:true});
 assert.equal(reloaded.api.state.contextFilters.afterhours,'favorites');
 assert.equal(reloaded.api.state.favoriteContexts['arcade/general'],true);
 assert.equal(reloaded.api.state.favoriteContexts['afterhours/introductions'],true);
 assert.equal(reloaded.api.toggleFavorite('afterhours/introductions'),false);
 assert.equal(reloaded.api.getContextEntries('afterhours','favorites').length,0);
});

test('Unread filters and inbox read actions clear attention without removing messages',async()=>{
 const incoming=sampleMessage('read-me','An unread sample message',{author:'nova',time:at});
 const own=sampleMessage('my-own-message','Already mine',{time:at+1000});
 const app=harness(fixture({'afterhours/general':[own],'afterhours/introductions':[incoming]}),new Map(),{controlledTimers:true});
 app.api.setContextFilter('unread');
 assert.ok(!app.api.getContextEntries('afterhours','unread').some(entry=>entry.id==='general'));
 assert.ok(app.api.getContextEntries('afterhours','unread').some(entry=>entry.id==='introductions'));
 await app.click({action:'inbox'});
 assert.ok(app.api.inboxEntries('unread').some(entry=>entry.message.id===incoming.id),'Opening the inbox must not mark unseen messages read');
 await app.click({inboxRead:'afterhours/introductions',inboxMessage:incoming.id});
 assert.ok(!app.api.inboxEntries('unread').some(entry=>entry.message.id===incoming.id));
 assert.equal(app.api.state.messages['afterhours/introductions'].length,1);
 app.api.markAllInboxRead('unread');
 assert.equal(app.api.getContextEntries('afterhours','unread').length,0);
 assert.match(app.get('channel-list').innerHTML,/caught up/i);
});

test('Mentions respect the current name, literal punctuation, and word boundaries',async()=>{
 const messages=[
  sampleMessage('mention-real','hello @ebi.wav, listen to this',{author:'ghost',time:at}),
  sampleMessage('mention-wrong','hello @ebixwav',{author:'nova',time:at+1}),
  sampleMessage('mention-longer','hello @ebi.wavextra',{author:'nova',time:at+2}),
  sampleMessage('mention-self','I wrote @ebi.wav myself',{author:'self',time:at+3})
 ];
 const app=harness(fixture({'afterhours/general':messages},{profile:{name:'ebi.wav'}}),new Map(),{controlledTimers:true});
 assert.deepEqual(plain(app.api.inboxEntries('mentions').map(entry=>entry.message.id)),['mention-real']);
 await app.click({action:'inbox'});await app.click({inboxTab:'mentions'});
 assert.match(app.get('modal-content').innerHTML,/data-search-message="mention-real"/);
 assert.doesNotMatch(app.get('modal-content').innerHTML,/data-search-message="mention-wrong"/);
 await app.click({searchKey:'afterhours/general',searchMessage:'mention-real'});
 assert.equal(app.api.state.channel,'general');
 assert.ok(app.get('chat-feed').messageNodes.some(node=>node.dataset.messageId==='mention-real'&&node.scrolledIntoView));
});

test('activity entries retain their context and have deliberate read state',async()=>{
 const notification={id:'activity-context',text:'A local change in the arcade',time:at,read:false,action:'help',context:'arcade/general'};
 const app=harness(fixture({}, {notifications:[notification]}),new Map(),{controlledTimers:true});
 await app.click({action:'inbox'});await app.click({inboxTab:'activity'});
 assert.equal(app.api.state.notifications.find(item=>item.id===notification.id).read,false);
 await app.click({notificationOpen:notification.id});
 assert.equal(app.api.state.server,'arcade');
 assert.equal(app.api.state.notifications.find(item=>item.id===notification.id).read,true);
});

test('search exposes its full count and loads older results beyond thirty',async()=>{
 const needle='unbounded-search-fixture',messages=Array.from({length:67},(_,index)=>sampleMessage('search-page-'+index,needle+' '+index,{time:at+index}));
 const app=harness(fixture({'afterhours/general':messages}),new Map(),{controlledTimers:true});
 await app.click({action:'search'});
 const field=app.get('global-search');field.value=needle;await app.dispatchDocument('input',{target:field});
 let html=app.get('global-results').innerHTML;
 assert.match(html,/Showing 30 of 67 messages/);assert.equal((html.match(/data-search-message=/g)||[]).length,30);
 assert.match(html,/data-search-message="search-page-66"/);assert.doesNotMatch(html,/data-search-message="search-page-0"/);
 await app.click({action:'search-more'});html=app.get('global-results').innerHTML;assert.match(html,/Showing 60 of 67 messages/);
 await app.click({action:'search-more'});html=app.get('global-results').innerHTML;
 assert.match(html,/Showing 67 of 67 messages/);assert.match(html,/data-search-message="search-page-0"/);assert.doesNotMatch(html,/data-action="search-more"/);
});

test('advanced search rejects impossible or malformed dates instead of silently ignoring them',()=>{
 const app=harness(fixture({'afterhours/general':[sampleMessage('date-source','calendar fixture',{author:'nova',time:at})]}),new Map(),{controlledTimers:true});
 for(const query of ['before:not-a-date','after:2026-02-30','after:2026-04-01 before:2026-03-01']){
  const result=app.api.searchArchive(query);assert.ok(result.error,query+' should be rejected');assert.match(app.api.searchResults(query),/role="alert"/);
 }
 const valid=app.api.searchArchive('calendar in:general from:nova after:2026-02-27 before:2026-03-01');
 assert.equal(valid.error,'');assert.equal(valid.matches.length,1);assert.equal(valid.matches[0].m.id,'date-source');
 assert.match(app.api.searchArchive('has:video').error,/has:image/);
});

test('independent tabs merge different bookmarks and favorites without overwriting each other',()=>{
 const initial=fixture({'afterhours/general':[sampleMessage('bookmark-a','A'),sampleMessage('bookmark-b','B')]});
 const storage=new Map(),a=harness(initial,storage,{controlledTimers:true}),b=harness(null,storage,{controlledTimers:true});
 a.api.toggleBookmark('bookmark-a');a.api.toggleFavorite('afterhours/general');
 b.api.toggleBookmark('bookmark-b');b.api.toggleFavorite('arcade/general');
 const latest=harness(null,storage,{controlledTimers:true});
 assert.deepEqual(plain(latest.api.bookmarkedMessages().map(entry=>entry.messageId).sort()),['bookmark-a','bookmark-b']);
 assert.equal(latest.api.state.favoriteContexts['afterhours/general'],true);assert.equal(latest.api.state.favoriteContexts['arcade/general'],true);
});

test('failed bookmark and favorite writes do not show false success',()=>{
 const app=harness(fixture({'afterhours/general':[sampleMessage('write-failure','Keep the truth')]}),new Map(),{controlledTimers:true});
 app.context.localStorage.setItem=()=>{throw new Error('Quota exceeded');};
 assert.equal(app.api.toggleBookmark('write-failure'),false);assert.equal(app.api.bookmarkedMessages().length,0);
 assert.equal(app.api.toggleFavorite('afterhours/general'),false);assert.equal(app.api.state.favoriteContexts['afterhours/general'],undefined);
 assert.equal(app.get('save-status').hidden,false);
});

test('archive import keeps local saves and merges imported bookmarks and preferences',()=>{
 const existing=sampleMessage('existing-save','Already here'),incoming=sampleMessage('imported-save','From another copy');
 const app=harness(fixture({'afterhours/general':[existing]}),new Map(),{controlledTimers:true});app.api.toggleBookmark(existing.id);
 const imported=fixture({'afterhours/general':[incoming]},{version:2,savedMessages:{external:{context:'afterhours/general',messageId:incoming.id,savedAt:at}},favoriteContexts:{'arcade/general':true},contextFilters:{arcade:'favorites'}});
 const candidate=app.api.prepareImport({format:'voidline-afterhours',state:imported});
 assert.equal(Object.keys(candidate.savedMessages).length,2);assert.equal(candidate.favoriteContexts['arcade/general'],true);assert.equal(candidate.contextFilters.arcade,'favorites');
});

test('shared workspace visibility never marks the hidden local conversation read',async()=>{
 const message=sampleMessage('local-behind-live','Keep this local message unread',{author:'nova',time:at});
 const app=harness(fixture({'afterhours/general':[message]}),new Map(),{controlledTimers:true,nodeMetrics:{'chat-feed':{clientHeight:800,scrollHeight:200,scrollTop:0}}});
 app.document.body.classList.add('vl-live-mode');
 await app.flushTimers(1500);
 assert.equal(app.api.state.lastRead['afterhours/general']||0,0);
 assert.ok(app.api.inboxEntries('unread').some(entry=>entry.message.id===message.id));
 app.document.body.classList.remove('vl-live-mode');
 app.window.dispatchEvent({type:'resize'});
 await app.flushTimers(1500);
 assert.ok(app.api.state.lastRead['afterhours/general']>=at);
});

(async()=>{
 let failed=0;
 for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
 console.log('\n'+(tests.length-failed)+'/'+tests.length+' everyday messaging checks passed. Browser layout is verified separately.');
 process.exitCode=failed?1:0;
})();
