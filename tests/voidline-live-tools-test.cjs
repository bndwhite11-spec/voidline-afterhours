'use strict';
// These execute the account tools with controlled transport and DOM lifecycle.
// Browser layout and real authentication are deliberately outside this harness.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/live-tools.js'),'utf8');
const tests=[],test=(name,fn)=>tests.push([name,fn]);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function client(){
 const nodes=new Map(),storage=new Map(),calls=[],toasts=[],listeners=new Map();
 function node(id=''){return {id,innerHTML:'',textContent:'',isConnected:true,open:true,dataset:{},disabled:false,insertAdjacentHTML(_position,html){this.innerHTML+=html;},querySelector(){return null;}};}
 const state={active:true,phase:'ready',account:{id:'account-a',displayName:'a.b',bio:'',status:'',theme:'obsidian',avatar:'moon'},identityGeneration:0,communityId:'community-a',channelId:'a-general',communities:[{id:'community-a',name:'First',role:'owner'},{id:'community-b',name:'Second',role:'member'}],channels:[{id:'a-general',name:'general'},{id:'b-general',name:'general'}],members:[],rooms:new Map()};
 const replies=new Map();let shellRenders=0;
 const api={state,esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),icon:name=>`<svg data-icon="${name}"></svg>`,guard(){const id=state.account?.id,epoch=state.identityGeneration;return {current:()=>id===state.account?.id&&epoch===state.identityGeneration};},request:async(path,body)=>{calls.push({path,body});if(replies.has(path)){const answer=replies.get(path);return typeof answer==='function'?answer(body):answer;}if(path.startsWith('/inbox'))return {items:[],counts:{unread:0,mentions:0,activity:0},conversations:[],total:0,page:{limit:30,hasMore:false}};if(path==='/favorites')return {favorites:[]};if(path.startsWith('/saved'))return {messages:[],total:0,page:{limit:30,hasMore:false}};if(path.startsWith('/search'))return {messages:[],channels:[],communities:[],people:[],total:0,page:{limit:30,hasMore:false}};return {};},dialog(title,copy,html){for(const n of nodes.values())n.isConnected=false;nodes.clear();nodes.set('app-modal',node('app-modal'));const container=node('dialog');container.innerHTML=title+copy+html;nodes.set('dialog',container);for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))nodes.set(id,node(id));},closeDialog(){nodes.get('app-modal').open=false;},toast:message=>toasts.push(message),renderSidebar(){shellRenders++;},community:()=>state.communities.find(c=>c.id===state.communityId),channel:()=>state.channels.find(c=>c.id===state.channelId),refreshCommunities:async()=>{},navigate:async target=>{api.lastDestination=target;},copyText:async()=>{}};
 const context={window:{VoidLive:{registerTools(tools){tools.init(api);}}},document:{getElementById:id=>nodes.get(id)||null,querySelectorAll:()=>[],createElement:()=>node(),addEventListener:(type,fn)=>listeners.set(type,fn)},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},URLSearchParams,Date,console,location:{origin:'https://voidline.example',pathname:'/'},FormData:class{constructor(form){this.values=form.values||{};}*[Symbol.iterator](){yield*Object.entries(this.values);}get(key){return this.values[key];}}};
 vm.createContext(context);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'window.__toolsTest={refresh,inbox,saved,save,markRead,runSearch,validateSearch,saveProfile,submit,confirmAction,setFavorite,memberProfile,searchValues:()=>searchValues};})();'),context);
 const tools=context.window.VoidLiveTools,seam=context.window.__toolsTest;
 return {tools,seam,state,api,nodes,replies,calls,toasts,storage,context,node,get renders(){return shellRenders;},form(kind,values,dataset={}){const n=node();n.dataset={liveToolsForm:kind,...dataset};n.values=values;return n;},switchAccount(){state.account={...state.account,id:'account-b',displayName:'Account B'};state.identityGeneration++;tools.onData();}};
}

test('opening each Inbox view never sends a read mutation',async()=>{
 const app=client();for(const view of ['unread','mentions','activity'])await app.seam.inbox(view);
 assert.equal(app.calls.length,3);assert.ok(app.calls.every(c=>c.path.startsWith('/inbox?view=')&&c.body===undefined));
 assert.match(app.nodes.get('dialog').innerHTML,/does not mark anything read/);
 await app.seam.markRead('a-general',12);assert.deepEqual(JSON.parse(JSON.stringify(app.calls.find(c=>c.path==='/read').body)),{channelId:'a-general',seq:12});
});
test('old-account unread and Favorites responses never enter the new account',async()=>{
 const app=client(),held=deferred();app.replies.set('/favorites',held.promise);const first=app.tools.refresh(true);
 app.replies.set('/favorites',{favorites:[]});app.switchAccount();held.resolve({favorites:['a-general']});await first;await Promise.resolve();
 app.tools.handleAction('filter',{dataset:{filter:'favorites'}});assert.equal(app.tools.filterChannels(app.state.channels).length,0);
 assert.doesNotMatch(app.tools.sidebarHTML(),/99 unread/);
});
test('identically named rooms are filtered by stable channel IDs',async()=>{
 const app=client();app.replies.set('/favorites',{favorites:['b-general']});await app.tools.refresh(true);app.tools.handleAction('filter',{dataset:{filter:'favorites'}});
 const result=app.tools.filterChannels(app.state.channels);assert.equal(result.length,1);assert.equal(result[0].id,'b-general');assert.match(app.tools.sidebarHTML(),/outside this filter/);
});
test('failed favorite and bookmark writes do not claim success',async()=>{
 const app=client();app.replies.set('/favorites',()=>Promise.reject(Error('No connection')));await app.seam.setFavorite('a-general');
 app.replies.set('/messages/message-a/save',()=>Promise.reject(Error('No connection')));await app.tools.save({id:'message-a'});
 assert.ok(!app.toasts.some(t=>/Saved privately/.test(t)));app.tools.handleAction('filter',{dataset:{filter:'favorites'}});assert.equal(app.tools.filterChannels(app.state.channels).length,0);
});
test('search rejects impossible dates and contradictory filters without a request',async()=>{
 const app=client();app.tools.search();for(const values of [{before:'2026-02-30'},{after:'2026-12-31',before:'2026-01-01'},{after:'not-a-date'}])await app.seam.runSearch(values);
 assert.equal(app.calls.length,0);assert.match(app.nodes.get('live-tools-error').textContent,/date|Before/);
});
test('a delayed older query cannot overwrite the latest search result',async()=>{
 const app=client();app.tools.search();const older=deferred();
 app.replies.set('/search?limit=30&offset=0&q=old',older.promise);
 app.replies.set('/search?limit=30&offset=0&q=new',{messages:[{id:'new',text:'Latest exact result',created_at:1700000000000}],total:1,page:{limit:30,hasMore:false}});
 const pending=app.seam.runSearch({q:'old'});await app.seam.runSearch({q:'new'});
 older.resolve({messages:[{id:'old',text:'Stale query content'}],total:1,page:{limit:30,hasMore:false}});await pending;
 assert.match(app.nodes.get('live-tools-results').innerHTML,/Latest exact result/);assert.doesNotMatch(app.nodes.get('live-tools-results').innerHTML,/Stale query/);
});
test('search uses API total, preserves filters and escapes shared content',async()=>{
 const app=client();app.tools.search();const query='/search?limit=30&offset=30&q=signal&channelId=a-general&after=2026-01-01&before=2026-02-01';
 app.replies.set(query,{messages:[{id:'found',author_name:'<img>',text:'<script>alert(1)</script>',community_id:'community-a',channel_id:'a-general',thread_root_id:'root',seq:99,created_at:1700000000000}],total:72,page:{limit:30,hasMore:true},entityLimit:30});
 await app.seam.runSearch({q:'signal',channelId:'a-general',after:'2026-01-01',before:'2026-02-01'},30);
 const html=app.nodes.get('live-tools-results').innerHTML;assert.match(html,/72 matching messages/);assert.match(html,/31–60 of 72/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/data-thread="root"/);assert.equal(app.calls[0].path,query);
});
test('unavailable Saved entries retain removal without exposing or deleting original content',async()=>{
 const app=client();app.replies.set('/saved?limit=30&offset=0',{messages:[{id:'gone',unavailable:true,saved_at:1700000000000}],total:1,page:{limit:30,hasMore:false}});await app.seam.saved();
 const html=app.nodes.get('live-tools-results').innerHTML;assert.match(html,/original is unavailable/);assert.match(html,/data-message="gone"/);assert.doesNotMatch(html,/data-live-tool="jump"/);
 await app.seam.save({id:'gone'},false);const mutation=app.calls.find(c=>c.path==='/messages/gone/save');assert.equal(mutation.body.active,false);assert.equal(app.calls.filter(c=>c.path.includes('/delete')).length,0);
});
test('late profile saves do not update another signed-in account',async()=>{
 const app=client(),held=deferred();app.tools.profile();app.replies.set('/profile',held.promise);const form=app.form('profile',{displayName:'New Alias',bio:'About A',status:'',theme:'ice',avatar:'orbit'});const pending=app.seam.saveProfile(form);
 app.switchAccount();held.resolve({account:{id:'account-a',displayName:'New Alias'}});await pending;
 assert.equal(app.state.account.id,'account-b');assert.equal(app.state.account.displayName,'Account B');assert.ok(!app.toasts.includes('Shared profile saved.'));
});
test('a profile acknowledgment preserves newer edits and keeps their status unsaved',async()=>{
 const app=client(),held=deferred();app.tools.profile();app.replies.set('/profile',held.promise);
 const submitted={displayName:'New Alias',bio:'Submitted bio',status:'Original status',theme:'ice',avatar:'orbit'};
 const form=app.form('profile',{...submitted});const pending=app.seam.saveProfile(form);
 form.values.bio='Newer unsent bio';form.values.status='Newer unsent status';app.nodes.get('live-profile-preview').innerHTML='Newer unsent preview';
 held.resolve({account:{id:'account-a',...submitted}});await pending;
 assert.equal(app.state.account.bio,'Submitted bio');assert.equal(form.values.bio,'Newer unsent bio');assert.equal(form.values.status,'Newer unsent status');
 assert.equal(app.nodes.get('live-profile-preview').innerHTML,'Newer unsent preview');assert.match(app.nodes.get('live-profile-save-state').textContent,/newer edits are still unsaved/);assert.ok(!app.toasts.includes('Shared profile saved.'));
 app.replies.set('/profile',{account:{id:'account-a',...form.values}});await app.seam.saveProfile(form);
 assert.equal(app.state.account.bio,'Newer unsent bio');assert.equal(app.nodes.get('live-profile-save-state').textContent,'Saved to your shared account.');
});
test('consequential membership actions require their explicit confirmation form',async()=>{
 const app=client();app.seam.confirmAction('remove',{dataset:{community:'community-a',account:'target',name:'Target'}});assert.equal(app.calls.length,0);assert.match(app.nodes.get('dialog').innerHTML,/lose access/);
 const form=app.form('confirm',{}, {kind:'remove',community:'community-a',account:'target'});await app.seam.submit(form);
 const request=app.calls.find(c=>c.path==='/communities/community-a/members/target');assert.equal(request.body.remove,true);
});
test('favorite updates serialize so older responses cannot replace newer preferences',async()=>{
 const app=client(),held=deferred();let count=0;app.replies.set('/favorites',()=>{count++;return count===1?held.promise:{favorites:['a-general','b-general']};});
 const first=app.seam.setFavorite('a-general'),second=app.seam.setFavorite('b-general');await Promise.resolve();await Promise.resolve();assert.equal(count,1);
 held.resolve({favorites:['a-general']});await Promise.all([first,second]);app.tools.handleAction('filter',{dataset:{filter:'favorites'}});assert.equal(app.tools.filterChannels(app.state.channels).length,2);assert.equal(count,2);
});
test('activity read actions include the exact displayed event watermark',async()=>{
 const app=client();await app.seam.inbox('activity');await app.seam.markRead('a-general',12,false,undefined,81);const call=app.calls.find(c=>c.path==='/read');assert.equal(call.body.changeSeq,81);assert.equal(call.body.seq,12);
});
test('late errors from closed or replaced tool dialogs are ignored safely',async()=>{
 const app=client(),held=deferred();app.replies.set('/saved?limit=30&offset=0',held.promise);const pending=app.seam.saved();app.api.dialog('Different dialog','', '<div id="other">Other content</div>');held.reject(Error('Old Saved failure'));await pending;assert.match(app.nodes.get('dialog').innerHTML,/Other content/);assert.equal(app.toasts.length,0);
});
(async()=>{let failed=0;for(const[name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${tests.length-failed}/${tests.length} shared tools checks passed.`);process.exitCode=failed?1:0;})();
