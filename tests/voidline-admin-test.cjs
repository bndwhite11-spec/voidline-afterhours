'use strict';
// Actual owner UI module with controlled transport/DOM lifecycle. No real
// passkey, browser layout, private account or production owner is involved.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../dist/admin.js'),'utf8');
const cases=[],test=(name,run)=>cases.push([name,run]);
const deferred=()=>{let resolve,reject;return {promise:new Promise((a,b)=>{resolve=a;reject=b;}),resolve:value=>resolve(value),reject:error=>reject(error)};};
function fixture(){
 const nodes=new Map(),calls=[],announcements=[],replies=new Map(),listeners=new Map(),tracked=new Set();
 function node(id=''){const n={id,innerHTML:'',textContent:'',isConnected:true,disabled:false,dataset:{},value:'',attributes:new Map(),focus(){},select(){},setAttribute(name,value){this.attributes.set(name,String(value));},removeAttribute(name){this.attributes.delete(name);}};tracked.add(n);return n;}
 const state={account:{id:'owner-a',username:'xrp'},session:{reauthenticatedAt:Date.now()},generation:0,dialogGeneration:0};let extension,stepUps=0,renders=0;
 const home={state,esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),guard(){const id=state.account?.id,g=state.generation;return ()=>id===state.account?.id&&g===state.generation;},request:async(route,body)=>{calls.push({route,body});const response=replies.get(route);if(response!==undefined)return typeof response==='function'?response(body):await response;if(route==='/api/admin/status')return {isOwner:true,ownerConfigured:true,needsVerification:false};if(route.startsWith('/api/admin/users?'))return {users:[],page:{offset:0,limit:30,total:0,hasMore:false}};return {};},showDialog(title,copy,html){state.dialogGeneration++;for(const n of tracked)n.isConnected=false;tracked.clear();nodes.clear();const dialog=node('dialog');dialog.innerHTML=title+copy+html;nodes.set('dialog',dialog);for(const[,id]of html.matchAll(/\bid="([^"]+)"/g))nodes.set(id,node(id));return state.dialogGeneration;},announce:value=>announcements.push(value),render(){renders++;},async passkeyStepUp(){stepUps++;},async reauthenticate(){state.session.reauthenticatedAt=Date.now();},registerExtension(module){extension=module;module.init(home);}};
 const context={window:{VoidHome:home,addEventListener(){}},document:{getElementById:id=>nodes.get(id)||null,addEventListener:(name,fn)=>listeners.set(name,fn)},navigator:{clipboard:{writeText:async()=>{}}},URLSearchParams,Date,crypto:webcrypto,console,FormData:class{constructor(form){this.data=form.values||{};}*[Symbol.iterator](){yield*Object.entries(this.data);}}};
 vm.createContext(context);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'window.__adminTest={status,open,claim,mutate,action,submit,content};})();'),context);
 function form(values={}){const html=nodes.get('dialog')?.innerHTML||'',tag=html.match(/<form\b[^>]*>/)?.[0];assert.ok(tag,'The action must open a real confirmation form.');const n=node();n.dataset={};for(const[,key,value]of tag.matchAll(/data-([\w-]+)="([^"]*)"/g))n.dataset[key.replace(/-([a-z])/g,(_m,c)=>c.toUpperCase())]=value;n.values=values;n.submitButton=node();n.querySelector=selector=>selector==='[type="submit"]'?n.submitButton:null;return n;}
 return {home,state,nodes,calls,announcements,replies,extension,context,seam:context.window.__adminTest,node,form,get stepUps(){return stepUps;},get renders(){return renders;}};
}
async function until(predicate){for(let i=0;i<80;i++){if(predicate())return;await Promise.resolve();}throw Error('The expected async boundary was not reached.');}

test('a matching public handle shows no platform navigation unless the server confirms the owner',async()=>{
 const f=fixture();f.replies.set('/api/admin/status',{isOwner:false,ownerConfigured:true,needsVerification:false});await f.seam.status();assert.equal(f.extension.navHTML(),'');assert.equal(f.extension.accountHTML(),'');
 f.replies.set('/api/admin/status',{isOwner:false,ownerConfigured:false,needsVerification:false});await f.seam.status();assert.equal(f.extension.navHTML(),'');assert.match(f.extension.accountHTML(),/Owner verification request/);assert.doesNotMatch(f.extension.accountHTML(),/Platform administration/);
});
test('late owner status cannot reveal navigation or account data after switching accounts',async()=>{
 const f=fixture(),held=deferred();f.replies.set('/api/admin/status',held.promise);const pending=f.seam.status();f.state.account={id:'other-account',username:'other'};f.state.generation++;f.extension.onLock();held.resolve({isOwner:true,ownerConfigured:true,needsVerification:false});await pending;assert.equal(f.extension.navHTML(),'');assert.equal(f.renders,0);
});
test('an old account-list response cannot overwrite a newer profile editor or its unsaved content',async()=>{
 const f=fixture(),held=deferred();f.replies.set('/api/admin/users?limit=30&offset=0',held.promise);const pending=f.seam.open();for(let i=0;i<30&&!f.calls.some(c=>c.route.startsWith('/api/admin/users?'));i++)await Promise.resolve();
 f.home.showDialog('Profile editor','Unsaved profile', '<textarea id="profile-bio">Unsent edit</textarea>');held.resolve({users:[{id:'private-id',displayName:'Owner-only data',username:'other',status:'active',methods:['password'],createdAt:1}],page:{total:1,offset:0,limit:30,hasMore:false}});await pending;assert.match(f.nodes.get('dialog').innerHTML,/Unsent edit/);assert.doesNotMatch(f.nodes.get('dialog').innerHTML,/Owner-only data/);
});
test('ownership proof requires successful passkey step-up and never marks the account an owner',async()=>{
 const f=fixture();f.home.passkeyStepUp=async()=>{throw Error('User cancelled');};await f.seam.claim();assert.equal(f.calls.filter(c=>c.route==='/api/admin/owner/claim').length,0);assert.equal(f.extension.navHTML(),'');
 f.home.passkeyStepUp=async()=>{};f.replies.set('/api/admin/owner/claim',{code:'a'.repeat(64),accountId:'owner-a',expiresAt:Date.now()+300000,grantsAccess:false});await f.seam.claim();assert.equal(f.calls.find(c=>c.route==='/api/admin/owner/claim').body!==undefined,true);assert.match(f.nodes.get('dialog').innerHTML,/does not grant administration/);assert.match(f.nodes.get('dialog').innerHTML,/private, five-minute|five-minute|five.minute|trusted server operator/i);assert.equal(f.extension.navHTML(),'');
});
test('failed administrative writes announce no success and stale write acknowledgments cannot replace a new dialog',async()=>{
 const f=fixture();f.home.showDialog('Suspend account','','<p id="va-error"></p>');const button=f.node();f.replies.set('/api/admin/users/target/status',()=>Promise.reject(Error('Audit write failed')));await f.seam.mutate('users/target/status',{status:'suspended',reason:'Review complete'},button);assert.match(f.nodes.get('va-error').textContent,/Audit write failed/);assert.equal(f.announcements.length,0);
 const held=deferred();f.replies.set('/api/admin/users/target/status',held.promise);const pending=f.seam.mutate('users/target/status',{status:'suspended',reason:'Review complete'},button);f.home.showDialog('Profile editor','','<textarea id="profile-bio">Keep this text</textarea>');held.resolve({changed:true});await pending;assert.equal(f.announcements.length,0);assert.match(f.nodes.get('dialog').innerHTML,/Keep this text/);
});

test('an administrative open waiting for owner status cannot replace a newer editor',async()=>{
 const f=fixture(),held=deferred();f.replies.set('/api/admin/status',held.promise);const pending=f.seam.open('users');
 f.home.showDialog('Edit profile','','<textarea id="profile-bio">Keep this unsaved bio</textarea>');held.resolve({isOwner:true,ownerConfigured:true,needsVerification:false});await pending;
 assert.match(f.nodes.get('dialog').innerHTML,/Keep this unsaved bio/);assert.equal(f.calls.filter(c=>c.route.startsWith('/api/admin/users?')).length,0);
});

test('overlapping administration opens preserve the most recent navigation intent',async()=>{
 const f=fixture(),older=deferred(),newer=deferred();let statusCalls=0;
 f.replies.set('/api/admin/status',()=>++statusCalls===1?older.promise:newer.promise);
 f.replies.set('/api/admin/health?limit=30&offset=0',{database:'Newest health response',accountCounts:{active:1,suspended:0}});
 const first=f.seam.open('users'),second=f.seam.open('health');newer.resolve({isOwner:true,ownerConfigured:true,needsVerification:false});await second;
 assert.match(f.nodes.get('va-results').innerHTML,/Newest health response/);older.resolve({isOwner:true,ownerConfigured:true,needsVerification:false});await first;
 assert.match(f.nodes.get('va-results').innerHTML,/Newest health response/);assert.equal(f.calls.filter(c=>c.route.startsWith('/api/admin/users?')).length,0);
});

test('account controls distinguish block, unblock and deletion while protecting owner and tombstone rows',async()=>{
 const f=fixture();const row=(id,status='active',name='Person')=>f.seam.content({users:[{id,username:'person',displayName:name,status,methods:['password'],createdAt:1}],page:{total:1,offset:0,limit:30,hasMore:false}});
 const active=row('target-active');assert.match(active,/Block account|Block/);assert.match(active,/Delete account/);assert.match(active,/data-va-action="delete-confirm"/);
 const blocked=row('target-blocked','suspended');assert.match(blocked,/Unblock/);assert.match(blocked,/Delete account/);
 const owner=row('owner-a');assert.doesNotMatch(owner,/data-va-action="(?:status-confirm|delete-confirm)"/);assert.match(owner,/platform owner/i);
 const deleted=row('target-deleted','deleted');assert.doesNotMatch(deleted,/data-va-action="(?:status-confirm|delete-confirm|revoke-confirm|recovery)"/);assert.match(deleted,/retained|deleted/i);
 const escaped=row('target-safe','active','<img src=x onerror=alert(1)>');assert.doesNotMatch(escaped,/<img src=x/);assert.match(escaped,/&lt;img/);
});

test('blocking and unblocking require a reasoned confirmation tied to the selected account',async()=>{
 const f=fixture();const button=f.node();button.dataset={vaAction:'status-confirm',account:'target-account',status:'suspended',username:'target_user',displayName:'Target person'};
 await f.seam.action(button);assert.equal(f.calls.length,0);assert.match(f.nodes.get('dialog').innerHTML,/target-account/);assert.match(f.nodes.get('dialog').innerHTML,/Block|block/);
 const confirmation=f.form({reason:'Repeated abuse reviewed'});await f.seam.submit(confirmation);
 let write=f.calls.find(c=>c.route==='/api/admin/users/target-account/status');assert.ok(write);assert.equal(write.body.status,'suspended');assert.equal(write.body.reason,'Repeated abuse reviewed');
 const unblock=f.node();unblock.dataset={...button.dataset,status:'active'};await f.seam.action(unblock);await f.seam.submit(f.form({reason:'Appeal reviewed and accepted'}));
 const writes=f.calls.filter(c=>c.route==='/api/admin/users/target-account/status');assert.equal(writes.length,2);assert.equal(writes[1].body.status,'active');
});

test('irreversible deletion requires the exact immutable account confirmation before a request',async()=>{
 const f=fixture(),button=f.node();button.dataset={vaAction:'delete-confirm',account:'target-exact-id',username:'target_name',displayName:'Target Name'};await f.seam.action(button);
 const html=f.nodes.get('dialog').innerHTML;assert.match(html,/target-exact-id/);assert.match(html,/target_name|Target Name/);assert.match(html,/retai|history|message|audit/i);assert.equal(f.calls.length,0);
 await f.seam.submit(f.form({reason:'Reviewed deletion request',confirmAccountId:'someone-else'})).catch(()=>{});
 assert.equal(f.calls.filter(c=>c.route.endsWith('/delete')).length,0);
});

test('a failed deletion keeps its confirmation and stable request ID, and duplicate submits wait',async()=>{
 const f=fixture(),button=f.node();button.dataset={vaAction:'delete-confirm',account:'target-delete',username:'target_person',displayName:'Target Person'};await f.seam.action(button);
 const confirmation=f.form({reason:'Reviewed irreversible removal',confirmAccountId:'target-delete'}),held=deferred();f.replies.set('/api/admin/users/target-delete/delete',held.promise);
 const first=f.seam.submit(confirmation);await until(()=>f.calls.some(c=>c.route.endsWith('/delete')));await f.seam.submit(confirmation);
 assert.equal(f.calls.filter(c=>c.route.endsWith('/delete')).length,1);assert.equal(confirmation.submitButton.disabled,true);
 held.reject(Error('The audit transaction did not commit'));await first;
 assert.equal(f.announcements.length,0);assert.equal(confirmation.isConnected,true);assert.equal(confirmation.values.confirmAccountId,'target-delete');assert.equal(confirmation.submitButton.disabled,false);assert.match(f.nodes.get('va-error').textContent,/did not commit/);
 f.replies.set('/api/admin/users/target-delete/delete',{deleted:true});await f.seam.submit(confirmation);
 const writes=f.calls.filter(c=>c.route==='/api/admin/users/target-delete/delete');assert.equal(writes.length,2);assert.match(writes[0].body.clientId,/^[A-Za-z0-9_-]{8,100}$/);assert.equal(writes[1].body.clientId,writes[0].body.clientId);assert.equal(writes[1].body.confirmAccountId,'target-delete');assert.equal(writes[1].body.reason,'Reviewed irreversible removal');assert.ok(f.announcements.length);
});

test('a deletion acknowledgment from the old account cannot populate or replace the next account editor',async()=>{
 const f=fixture(),button=f.node();button.dataset={vaAction:'delete-confirm',account:'target-delete',username:'target_person',displayName:'Target Person'};await f.seam.action(button);
 const held=deferred();f.replies.set('/api/admin/users/target-delete/delete',held.promise);const pending=f.seam.submit(f.form({reason:'Reviewed irreversible removal',confirmAccountId:'target-delete'}));await until(()=>f.calls.some(c=>c.route.endsWith('/delete')));
 f.state.account={id:'account-b',username:'other'};f.state.generation++;f.extension.onLock();f.home.showDialog('Profile B','','<textarea id="profile-bio">B unsaved edit</textarea>');held.resolve({deleted:true});await pending;
 assert.equal(f.announcements.length,0);assert.match(f.nodes.get('dialog').innerHTML,/B unsaved edit/);assert.equal(f.extension.navHTML(),'');
});

test('expired passkey proof preserves the destructive confirmation without announcing a change',async()=>{
 const f=fixture(),button=f.node();button.dataset={vaAction:'delete-confirm',account:'target-delete',username:'target_person',displayName:'Target Person'};await f.seam.action(button);
 const confirmation=f.form({reason:'Reviewed removal with expired proof',confirmAccountId:'target-delete'});
 f.replies.set('/api/admin/users/target-delete/delete',()=>Promise.reject(Object.assign(Error('Verify your passkey before this sensitive action.'),{code:'passkey_required',status:401})));
 await f.seam.submit(confirmation);
 assert.equal(f.announcements.length,0);assert.equal(confirmation.isConnected,true);assert.equal(confirmation.values.confirmAccountId,'target-delete');assert.equal(confirmation.submitButton.disabled,false);assert.match(f.nodes.get('va-error').textContent,/passkey/i);assert.match(f.nodes.get('va-error').textContent,/reopen|verify again/i);assert.equal(f.state.account.id,'owner-a');
});

test('cancelling the required passkey verification never fetches protected account records',async()=>{
 const f=fixture();f.replies.set('/api/admin/status',{isOwner:true,ownerConfigured:true,needsVerification:true});f.home.passkeyStepUp=async()=>{throw Object.assign(Error('Passkey verification cancelled.'),{code:'passkey_cancelled'});};
 await f.seam.open('users');assert.equal(f.calls.filter(c=>c.route.startsWith('/api/admin/users?')).length,0);assert.equal(f.announcements.filter(x=>/saved|audited|deleted/i.test(x)).length,0);
});

(async()=>{let failed=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${cases.length-failed}/${cases.length} owner-interface checks passed. Controlled transport and DOM lifecycle; no real owner or browser/passkey interaction.`);process.exitCode=failed?1:0;})();
