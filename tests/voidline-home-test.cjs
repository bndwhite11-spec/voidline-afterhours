'use strict';
// The real production entry with isolated transport and a deliberately small DOM.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../dist/home.js'),'utf8');
const tests=[],test=(name,run)=>tests.push([name,run]);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function client(options={}){
 const nodes=new Map(),calls=[],listeners=new Map(),windowListeners=new Map(),scripts=[];let storageReads=0;
 function node(tag='div'){let id='',html='';const n={tagName:tag.toUpperCase(),dataset:{},style:{setProperty(){}},isConnected:true,open:false,scrollTop:0,scrollHeight:1200,clientHeight:500,value:'',textContent:'',children:[],className:'',classList:{add(){},remove(){},toggle(){}},setAttribute(name,value){this[name]=value;},removeAttribute(name){delete this[name];},appendChild(child){this.children.push(child);if(child.tagName==='SCRIPT')scripts.push(child);},append(...children){children.forEach(c=>this.appendChild(c));},remove(){this.isConnected=false;},addEventListener(){},querySelector(selector){if(selector==='[data-form-error]')return nodes.get('test-error')||null;if(selector==='[type="submit"]')return null;return null;},focus(){document.activeElement=n;},showModal(){n.open=true;},close(){n.open=false;},reset(){},click(){},insertAdjacentHTML(_p,text){n.innerHTML+=text;}};
 Object.defineProperty(n,'id',{get:()=>id,set:value=>{id=value;nodes.set(id,n);}});
 Object.defineProperty(n,'innerHTML',{get:()=>html,set:value=>{html=String(value);for(const [,newId]of html.matchAll(/\bid="([^"]+)"/g)){if(newId!==id){const child=node();child.id=newId;}}if(html.includes('data-form-error')){const error=node();error.id='test-error';}const input=nodes.get('home-secure-input');if(input){const match=html.match(/id="home-secure-input"[^>]*>([\s\S]*?)<\/textarea>/);if(match)input.value=match[1];}}});return n;}
 const document={readyState:'loading',documentElement:{dataset:options.offline?{offline:'true'}:{}},hidden:false,body:node('body'),head:node('head'),activeElement:null,getElementById:id=>nodes.get(id)||null,createElement:node,querySelector:()=>null,addEventListener(name,fn){listeners.set(name,fn);}};
 const account={id:'account-a',username:'night_a',displayName:'Night A',bio:'',status:'',theme:'obsidian',avatar:'moon',needsOnboarding:false};
 const server={account,communities:[],replies:new Map(),configured:true};
 const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
 const fetch=async(url,request={})=>{calls.push({url,request,body:request.body?JSON.parse(request.body):undefined});if(server.replies.has(url)){const value=server.replies.get(url);return typeof value==='function'?value(request):await value;}
  if(url==='/api/auth/config')return response({configured:server.configured,matrix:{configured:false},encryption:{available:false}});
  if(url==='/api/auth/session')return options.guest?response({error:{code:'sign_in_required',message:'Sign in required'}},401):response({account:server.account,session:{id:'session-a'},csrfToken:'csrf-a'});
  if(url==='/api/live/communities')return response({communities:server.communities});
  throw Error('Unexpected route '+url);
 };
 const storage={getItem(){storageReads++;return null;},setItem(){},length:0,key(){return null;}};
 const location={protocol:'https:',origin:'https://voidline.example',pathname:options.pathname||'/',search:'',hash:options.hash||'',href:'https://voidline.example'+(options.pathname||'/')+(options.hash||'')};
 const window={addEventListener:(name,fn)=>windowListeners.set(name,fn)};
 const context={window,document,fetch,location,navigator:{clipboard:{writeText:async()=>{}}},history:{replaceState(_a,_b,url){const parsed=new URL(url,location.origin);Object.assign(location,{pathname:parsed.pathname,search:parsed.search,hash:parsed.hash,href:parsed.href});}},localStorage:storage,sessionStorage:storage,AbortController,URL,URLSearchParams,Blob,crypto:webcrypto,console,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,requestAnimationFrame:fn=>fn(),FormData:class{constructor(form){this.data=form.values||{};}*[Symbol.iterator](){yield*Object.entries(this.data);}}};
 vm.createContext(context);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'window.__homeTest={state,init,boot,render,request,lock,view,submit,authView,action,finishRecovery,openCommunity,openChannel,previewInvite,inviteToken,route,checkSession,sendSecure,loadSecure,security,compareDevice};})();'),context);
 return {api:window.__homeTest,window,document,server,nodes,calls,scripts,context,response,get reads(){return storageReads;},form(kind,values={},dataset={}){const n=node('form');n.dataset={homeForm:kind,...dataset};n.values=values;return n;},async start(){window.__homeTest.init();for(let i=0;i<80;i++)await Promise.resolve();}};
}

test('authentication resolves before any account or sample interface appears',async()=>{
 const app=client({guest:true}),held=deferred();app.server.replies.set('/api/auth/session',held.promise);await app.start();
 const root=app.nodes.get('home-root');assert.match(root.innerHTML,/Opening Voidline/);assert.doesNotMatch(root.innerHTML,/Your corner|Afterhours community|The Arcade|Studio 404|No conversations/);
 held.resolve(app.response({error:{code:'sign_in_required',message:'Sign in'}},401));for(let i=0;i<20;i++)await Promise.resolve();assert.match(root.innerHTML,/Log in/);assert.match(root.innerHTML,/Create account/);assert.doesNotMatch(root.innerHTML,/Google|disabled aria-describedby/);assert.equal(app.reads,0);
});
test('a new account has null selections and no conversations, memberships or invented achievements',async()=>{
 const app=client();await app.start();const state=app.api.state;assert.equal(state.phase,'ready');assert.equal(state.communityId,null);assert.equal(state.channelId,null);assert.equal(state.secureRoomId,null);assert.equal(state.communities.length,0);assert.equal(state.messages.length,0);const html=app.nodes.get('home-root').innerHTML;assert.match(html,/Welcome to Voidline/);assert.doesNotMatch(html,/Founder|Admin|nova|Unread [1-9]/);assert.ok(!app.calls.some(c=>c.request.method==='POST'));
});
test('offline entry performs no authentication or shared-data request',async()=>{
 const app=client({offline:true});await app.start();assert.equal(app.calls.length,0);assert.equal(app.reads,0);assert.match(app.nodes.get('home-root').innerHTML,/Review previous local archive/);assert.equal(app.api.state.phase,'welcome');
});
test('invitation preview does not join and both path and hash links preserve the token',async()=>{
 const token='a'.repeat(64),app=client();await app.start();app.server.replies.set('/api/live/invites/'+token,app.response({invite:{name:'Chosen server',state:'active',communityId:'chosen'}}));await app.api.previewInvite(token);
 assert.equal(app.calls.filter(c=>c.request.method==='POST').length,0);assert.match(app.nodes.get('home-dialog').innerHTML,/Join this server/);assert.equal(app.api.inviteToken('https://voidline.example/invite/'+token),token);assert.equal(app.api.inviteToken('https://voidline.example/#join='+token),token);
});
test('new server creation is explicit and does not silently select its suggested channel',async()=>{
 const app=client();await app.start();app.server.communities=[{id:'new-server',name:'Our chosen room',role:'owner'}];app.server.replies.set('/api/live/communities',request=>request.method==='POST'?app.response({community:{id:'new-server'}}):app.response({communities:app.server.communities}));app.server.replies.set('/api/live/communities/new-server/channels',app.response({channels:[{id:'general-new',name:'general'}]}));
 await app.api.submit(app.form('create',{name:'Our chosen room',description:'',icon:'WL'}));assert.equal(app.api.state.communityId,'new-server');assert.equal(app.api.state.channelId,null);const write=app.calls.find(c=>c.request.method==='POST');assert.equal(write.body.expectedAccountId,'account-a');assert.equal(write.request.headers['x-voidline-csrf'],'csrf-a');
});
test('late history cannot replace another selected channel and content is escaped',async()=>{
 const app=client();await app.start();Object.assign(app.api.state,{view:'servers',communityId:'room',communities:[{id:'room',name:'Room'}],channels:[{id:'one',name:'one'},{id:'two',name:'two'}]});
 const held=deferred();app.server.replies.set('/api/live/channels/one/messages?limit=50',held.promise);app.server.replies.set('/api/live/channels/two/messages?limit=50',app.response({messages:[{id:'safe',text:'<script>private</script>',author_name:'<img>',created_at:1700000000000}],page:{hasMore:false}}));const earlier=app.api.openChannel('one');await app.api.openChannel('two');held.resolve(app.response({messages:[{text:'Wrong old room'}],page:{}}));await earlier;
 assert.equal(app.api.state.channelId,'two');const html=app.nodes.get('home-root').innerHTML;assert.match(html,/&lt;script&gt;private/);assert.doesNotMatch(html,/Wrong old room|<script>private/);
});
test('session revocation locks visible account data and disconnects the messaging adapter',async()=>{
 const app=client();await app.start();let disconnected=false;app.api.state.secure={disconnect:async()=>{disconnected=true;}};app.api.state.secureMessages=[{text:'PRIVATE'}];app.api.state.messages=[{text:'OLD PRIVATE'}];app.server.replies.set('/api/auth/session',app.response({error:{code:'sign_in_required',message:'Session revoked'}},401));assert.equal(await app.api.checkSession(),false);assert.equal(disconnected,true);assert.equal(app.api.state.account,null);assert.equal(app.api.state.messages.length,0);assert.equal(app.api.state.secureMessages.length,0);assert.doesNotMatch(app.nodes.get('home-root').innerHTML,/PRIVATE/);
});
test('failed encrypted sends preserve text and reuse the intended transaction ID',async()=>{
 const app=client();await app.start();const sent=[];const messenger={sendText:async(id,text,options)=>{sent.push({id,text,options});if(sent.length===1)throw Error('Connection lost');},timeline:async()=>[]};Object.assign(app.api.state,{secure:messenger,secureStatus:{phase:'ready'},secureRoomId:'!room:example',secureRooms:[{id:'!room:example',name:'Real room',encrypted:true}],view:'chats'});app.api.render();app.nodes.get('home-secure-input').value='Keep this unsent signal';await app.api.sendSecure();assert.equal(app.nodes.get('home-secure-input').value,'Keep this unsent signal');assert.match(app.nodes.get('home-secure-status').textContent,/retry uses the same message ID/);await app.api.sendSecure();assert.equal(sent.length,2);assert.equal(sent[0].options.clientId,sent[1].options.clientId);assert.equal(app.nodes.get('home-secure-input').value,'');
});
test('an expired account session blocks a Matrix send before the SDK receives content',async()=>{
 const app=client();await app.start();let sends=0;Object.assign(app.api.state,{secure:{sendText:async()=>sends++,disconnect:async()=>{}},secureStatus:{phase:'ready'},secureRoomId:'!room:example',secureRooms:[{id:'!room:example',name:'Room',encrypted:true}],view:'chats'});app.api.render();app.nodes.get('home-secure-input').value='Do not send';app.server.replies.set('/api/auth/session',app.response({error:{code:'sign_in_required',message:'Expired'}},401));await app.api.sendSecure();assert.equal(sends,0);assert.equal(app.api.state.account,null);
});

test('a delayed pre-send session check cannot send a different conversation draft',async()=>{
 const app=client();await app.start();const sent=[],messenger={sendText:async(...values)=>sent.push(values),timeline:async()=>[]};Object.assign(app.api.state,{secure:messenger,secureStatus:{phase:'ready'},secureRoomId:'!a:example',secureRooms:[{id:'!a:example',name:'A',encrypted:true},{id:'!b:example',name:'B',encrypted:true}],view:'chats'});app.api.render();app.nodes.get('home-secure-input').value='Intended for A';const held=deferred();app.server.replies.set('/api/auth/session',held.promise);const sending=app.api.sendSecure();app.api.state.generation++;app.api.state.secureRoomId='!b:example';app.api.render();app.nodes.get('home-secure-input').value='Private B draft';held.resolve(app.response({account:app.server.account,session:{id:'session-a'},csrfToken:'csrf-a'}));await sending;assert.equal(sent.length,0);assert.equal(app.nodes.get('home-secure-input').value,'Private B draft');
});

test('the encryption bundle loads as a module and no secrets enter navigation',async()=>{
 const app=client();await app.start();const loading=app.api.loadSecure();assert.equal(app.scripts[0].type,'module');assert.equal(app.scripts[0].src,'/secure-messenger.js');app.window.VoidSecureMessenger={create(){}};app.scripts[0].onload();await loading;assert.doesNotMatch(app.context.location.href,/token|password|key/);assert.equal(app.api.route().view,'chats');
});
test('registration uses the real native endpoint and keeps the recovery code in memory until acknowledged',async()=>{
 const app=client({guest:true});await app.start();app.api.authView('register');
 const account={...app.server.account,username:'new_user',displayName:'New User'},code='b'.repeat(64);
 app.server.replies.set('/api/auth/register',app.response({account,session:{id:'registered-session'},csrfToken:'registered-csrf',recoveryCode:code},201));
 await app.api.submit(app.form('register',{username:'new_user',displayName:'New User',password:'correct horse battery',passwordConfirm:'correct horse battery'}));
 const call=app.calls.find(c=>c.url==='/api/auth/register');assert.ok(call);assert.equal(call.request.headers['x-voidline-auth'],'1');assert.equal(call.body.passwordConfirm,undefined);assert.equal(call.body.username,'new_user');
 assert.equal(app.api.state.account.id,account.id);assert.equal(app.api.state.phase,'account-recovery');assert.equal(app.api.state.accountRecovery,code);assert.equal(app.api.state.communityId,null);assert.equal(app.api.state.communities.length,0);
 assert.match(app.nodes.get('home-root').innerHTML,/Save your recovery code/);await app.api.finishRecovery();assert.equal(app.api.state.accountRecovery,null);assert.equal(app.api.state.phase,'ready');assert.doesNotMatch(app.context.location.href,/password|recovery|code=/);
});
test('bad credentials remain inline without creating an account or clearing the form',async()=>{
 const app=client({guest:true});await app.start();app.server.replies.set('/api/auth/login',app.response({error:{code:'invalid_credentials',message:'Username or password is incorrect.'}},401));
 const form=app.form('login',{username:'real_user',password:'a sufficiently long password'});let resets=0;form.reset=()=>resets++;await app.api.submit(form);
 assert.equal(app.api.state.account,null);assert.equal(app.api.state.phase,'welcome');assert.equal(resets,0);assert.match(app.nodes.get('test-error').textContent,/incorrect/);assert.equal(form.values.password,'a sufficiently long password');
});
test('password mismatch is rejected before registration and overlapping tab selection cannot discard an active auth result',async()=>{
 const app=client({guest:true});await app.start();app.api.authView('register');
 await app.api.submit(app.form('register',{username:'real_user',displayName:'Real',password:'long enough password',passwordConfirm:'different password'}));assert.ok(!app.calls.some(c=>c.url==='/api/auth/register'));
 const held=deferred();app.server.replies.set('/api/auth/register',held.promise);const pending=app.api.submit(app.form('register',{username:'real_user',displayName:'Real',password:'long enough password',passwordConfirm:'long enough password'}));app.api.authView('login');assert.equal(app.api.state.authView,'register');
 held.resolve(app.response({account:app.server.account,session:{id:'new'},csrfToken:'csrf-a',recoveryCode:'f'.repeat(64)},201));await pending;assert.equal(app.api.state.phase,'account-recovery');assert.equal(app.api.state.authBusy,false);
});
test('password recovery and reauthentication submit distinct protected operations',async()=>{
 const app=client({guest:true});await app.start();app.api.authView('recover');app.server.replies.set('/api/auth/recover',app.response({account:app.server.account,session:{id:'recovered'},csrfToken:'recovered-csrf',recoveryCode:'c'.repeat(64)}));
 await app.api.submit(app.form('recover',{username:'real_user',recoveryCode:'d'.repeat(64),password:'new password long enough',passwordConfirm:'new password long enough'}));assert.equal(app.calls.find(c=>c.url==='/api/auth/recover').body.recoveryCode,'d'.repeat(64));await app.api.finishRecovery();
 app.server.replies.set('/api/auth/reauthenticate',app.response({reauthenticated:true}));app.server.replies.set('/api/auth/devices',app.response({devices:[]}));await app.api.submit(app.form('reauthenticate',{password:'new password long enough'}));const reauth=app.calls.find(c=>c.url==='/api/auth/reauthenticate');assert.equal(reauth.request.headers['x-voidline-csrf'],'recovered-csrf');assert.equal(reauth.body.expectedAccountId,'account-a');assert.equal(app.api.state.account.id,'account-a');
});
test('multiple free-product extensions render together and Add friend routes to the social module',async()=>{
 const app=client();await app.start();let friendCalls=0,locked=0;
 app.window.VoidHome.registerExtension({id:'cosmetics',accountHTML:()=>'<section>Free badges</section>',navHTML:()=>'<button>Free gifts</button>',onLock:()=>locked++});
 app.window.VoidHome.registerExtension({id:'social',accountHTML:()=>'<section>Friend requests</section>',handleAction:name=>{if(name==='friend')friendCalls++;},onLock:()=>locked++});
 app.api.view('you');const html=app.nodes.get('home-root').innerHTML;assert.match(html,/Free badges/);assert.match(html,/Friend requests/);app.api.action('friend');assert.equal(friendCalls,1);app.api.lock();assert.equal(locked,2);
});
test('account deletion requires explicit confirmation and only locks after the server commits deletion',async()=>{
 const app=client();await app.start();await app.api.submit(app.form('delete-account',{password:'a sufficiently long password'}));assert.ok(!app.calls.some(c=>c.url==='/api/auth/account/delete'));assert.equal(app.api.state.account.id,'account-a');
 app.server.replies.set('/api/auth/account/delete',app.response({deleted:true}));await app.api.submit(app.form('delete-account',{password:'a sufficiently long password',confirmDelete:'on'}));assert.equal(app.calls.find(c=>c.url==='/api/auth/account/delete').body.expectedAccountId,'account-a');assert.equal(app.api.state.account,null);assert.equal(app.api.state.phase,'welcome');assert.match(app.nodes.get('home-root').innerHTML,/Log in/);
});
test('an older session check cannot replace a password-change session or hide its recovery code',async()=>{
 const app=client();await app.start();const session=deferred(),change=deferred();app.server.replies.set('/api/auth/session',session.promise);const checking=app.api.checkSession();app.server.replies.set('/api/auth/password/change',change.promise);
 const changing=app.api.submit(app.form('password-change',{currentPassword:'old long enough password',newPassword:'new long enough password',passwordConfirm:'new long enough password'}));assert.equal(app.api.state.credentialsBusy,true);assert.equal(await app.api.checkSession(),false);
 change.resolve(app.response({account:app.server.account,session:{id:'rotated'},csrfToken:'rotated-csrf',recoveryCode:'e'.repeat(64)}));await changing;session.resolve(app.response({account:app.server.account,session:{id:'old'},csrfToken:'old-csrf'}));await checking;assert.equal(app.api.state.session.id,'rotated');assert.equal(app.api.state.csrf,'rotated-csrf');assert.equal(app.api.state.phase,'account-recovery');assert.equal(app.api.state.accountRecovery,'e'.repeat(64));
});
test('background profile and gift refreshes preserve the active composer node, text and caret',async()=>{
 const app=client();await app.start();Object.assign(app.api.state,{secure:{},secureStatus:{phase:'ready',userId:'@me:example'},secureRoomId:'!a:example',secureRooms:[{id:'!a:example',name:'A',encrypted:true}],view:'chats'});app.api.render();const input=app.nodes.get('home-secure-input');input.value='Typing while a gift arrives';input.selectionStart=7;input.selectionEnd=12;input.focus();app.api.render();assert.equal(app.nodes.get('home-secure-input'),input);assert.equal(input.value,'Typing while a gift arrives');assert.equal(input.selectionStart,7);assert.equal(input.selectionEnd,12);assert.equal(app.api.state.secureDrafts.get('!a:example').text,input.value);
});
(async()=>{let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${tests.length-failed}/${tests.length} production-entry behavior checks passed. VM DOM/transport; browser layouts and live account/Matrix networks are not exercised.`);process.exitCode=failed?1:0;})();
