'use strict';
// Actual owner UI module with controlled transport/DOM lifecycle. No real
// passkey, browser layout, private account or production owner is involved.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../dist/admin.js'),'utf8');
const cases=[],test=(name,run)=>cases.push([name,run]);
const deferred=()=>{let resolve,reject;return {promise:new Promise((a,b)=>{resolve=a;reject=b;}),resolve:value=>resolve(value),reject:error=>reject(error)};};
function fixture(){
 const nodes=new Map(),calls=[],announcements=[],replies=new Map(),listeners=new Map();
 function node(id=''){return {id,innerHTML:'',textContent:'',isConnected:true,disabled:false,dataset:{},value:'',focus(){},select(){},setAttribute(){},removeAttribute(){}};}
 const state={account:{id:'owner-a',username:'xrp'},session:{reauthenticatedAt:Date.now()},generation:0,dialogGeneration:0};let extension,stepUps=0,renders=0;
 const home={state,esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),guard(){const id=state.account?.id,g=state.generation;return ()=>id===state.account?.id&&g===state.generation;},request:async(route,body)=>{calls.push({route,body});const response=replies.get(route);if(response!==undefined)return typeof response==='function'?response(body):await response;if(route==='/api/admin/status')return {isOwner:true,ownerConfigured:true,needsVerification:false};if(route.startsWith('/api/admin/users?'))return {users:[],page:{offset:0,limit:30,total:0,hasMore:false}};return {};},showDialog(title,copy,html){state.dialogGeneration++;for(const n of nodes.values())n.isConnected=false;nodes.clear();const dialog=node('dialog');dialog.innerHTML=title+copy+html;nodes.set('dialog',dialog);for(const[,id]of html.matchAll(/\bid="([^"]+)"/g))nodes.set(id,node(id));},announce:value=>announcements.push(value),render(){renders++;},async passkeyStepUp(){stepUps++;},async reauthenticate(){state.session.reauthenticatedAt=Date.now();},registerExtension(module){extension=module;module.init(home);}};
 const context={window:{VoidHome:home,addEventListener(){}},document:{getElementById:id=>nodes.get(id)||null,addEventListener:(name,fn)=>listeners.set(name,fn)},navigator:{clipboard:{writeText:async()=>{}}},URLSearchParams,Date,console,FormData:class{constructor(form){this.data=form.values||{};}*[Symbol.iterator](){yield*Object.entries(this.data);}}};
 vm.createContext(context);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'window.__adminTest={status,open,claim,mutate,action,submit};})();'),context);
 return {home,state,nodes,calls,announcements,replies,extension,context,seam:context.window.__adminTest,node,get stepUps(){return stepUps;},get renders(){return renders;}};
}

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

(async()=>{let failed=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${cases.length-failed}/${cases.length} owner-interface checks passed. Controlled transport and DOM lifecycle; no real owner or browser/passkey interaction.`);process.exitCode=failed?1:0;})();
