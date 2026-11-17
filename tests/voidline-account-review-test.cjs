'use strict';
// Execute the real collection module with controlled account/dialog lifetimes.
// The production Worker/SQLite contract is checked by account-integration-test.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/cosmetics.js'),'utf8');
const tests=[],test=(name,run)=>tests.push([name,run]);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){
 const state={account:{id:'account-a'},generation:1,dialogGeneration:0},nodes=new Map(),calls=[],toasts=[],requests=new Map(),renders=[];
 const catalogue={items:[{id:'angel',name:'404 Angel',type:'badge',finish:'Chrome',description:'Original wings',price:0,acquisition:'Free cosmetic.'},{id:'gift-rose',name:'Chrome Rose',type:'gift',finish:'Rose chrome',description:'An original cosmetic rose',price:0,acquisition:'Free cosmetic.'}]};
 let title='',extension;
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const bridge={state,esc,guard(){const id=state.account?.id,generation=state.generation;return ()=>id===state.account?.id&&generation===state.generation;},announce:text=>toasts.push(text),render(){renders.push(state.account?.id);},showDialog(next,copy,html){title=next;state.dialogGeneration++;for(const n of nodes.values())n.isConnected=false;nodes.clear();for(const[,id]of html.matchAll(/\bid="([^"]+)"/g))nodes.set(id,{id,textContent:'',innerHTML:'',isConnected:true,insertAdjacentHTML(_p,value){this.innerHTML+=value;}});return state.dialogGeneration;},closeDialog(){state.dialogGeneration++;},registerExtension(module){extension=module;module.init(bridge);},async request(route,body){calls.push({route,body,account:state.account?.id});const value=requests.get(route);if(value!==undefined)return typeof value==='function'?value(body):await value;if(route==='/api/cosmetics/catalog')return catalogue;if(route==='/api/cosmetics/inventory')return {owned:[],equippedId:null,pendingGifts:0,giftsEnabled:true};if(route.startsWith('/api/cosmetics/gifts?'))return {gifts:[],total:0,page:{hasMore:false}};return {};}};
 const context={window:{VoidHome:bridge,addEventListener(){}},document:{getElementById:id=>nodes.get(id)||null,addEventListener(){}},crypto:{randomUUID:()=> 'stable-generated-gift-id'},FormData:class{constructor(form){this.values=form.values;}get(name){return this.values[name];}},console,Date};
 vm.createContext(context);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'window.__cosmeticReview={collection,mutate,send,inbox};})();'),context);
 // Production calls each extension's accountHTML while rendering an account.
 // Establish that identity before presenting any clickable collection action.
 extension.accountHTML();
 return {state,bridge,nodes,calls,toasts,requests,renders,extension,api:context.window.__cosmeticReview,get title(){return title;},form(){return {dataset:{item:'gift-rose',client:'stable-request-1234'},values:{username:'recipient_one'},isConnected:true,querySelector(){return null;}};},switchAccount(){extension.onLock();state.account={id:'account-b'};state.generation++;}};
}
test('a delayed collection request cannot replace a newer profile editor',async()=>{
 const f=fixture(),held=deferred();f.requests.set('/api/cosmetics/catalog',held.promise);const opening=f.api.collection('badges');
 f.bridge.showDialog('Editing profile','', '<form id="my-profile-editor">Unsaved form</form>');held.resolve({items:[]});await opening;
 assert.equal(f.title,'Editing profile');assert.ok(f.nodes.get('my-profile-editor')?.isConnected);
});
test('inventory from a previous account cannot populate the next profile',async()=>{
 const f=fixture(),held=deferred();f.requests.set('/api/cosmetics/inventory',held.promise);const old=f.extension.onAccount();
 f.switchAccount();f.requests.set('/api/cosmetics/inventory',{owned:[],equippedId:null,pendingGifts:0,giftsEnabled:true});await f.extension.onAccount();
 held.resolve({owned:[{cosmetic_id:'angel'}],equippedId:'angel',pendingGifts:8});await old;
 const html=f.extension.accountHTML();assert.doesNotMatch(html,/vc-equipped-mark|vc-count/);assert.match(html,/<span>0<\/span>/);
});
test('failed claims retain the committed collection and do not render a phantom reward',async()=>{
 const f=fixture();await f.api.collection('badges');f.requests.set('/api/cosmetics/claim',()=>Promise.reject(Error('Write could not commit')));
 await f.api.mutate('/claim',{cosmeticId:'angel'},null,()=>f.api.collection('badges'));
 assert.match(f.nodes.get('vc-error').textContent,/could not commit/);assert.match(f.extension.accountHTML(),/<span>0<\/span>/);assert.doesNotMatch(f.extension.accountHTML(),/vc-equipped-mark/);assert.equal(f.renders.length,0);
});
test('a failed gift retries its original request ID without clearing the form',async()=>{
 const f=fixture();await f.api.collection('gifts');f.api.inbox;const form=f.form();let attempts=0;
 f.requests.set('/api/cosmetics/gifts',()=>{attempts++;if(attempts===1)throw Error('Connection interrupted');return {acknowledged:true,gift:{id:'persisted-gift'}};});
 await f.api.send(form);assert.equal(form.values.username,'recipient_one');assert.equal(f.title,'Your collection');await f.api.send(form);
 const writes=f.calls.filter(call=>call.route==='/api/cosmetics/gifts');assert.equal(writes.length,2);assert.equal(writes[0].body.clientId,writes[1].body.clientId);assert.equal(writes[0].body.username,writes[1].body.username);assert.equal(f.title,'Gift request sent');
});
test('an earlier account gift acknowledgment cannot announce success for the new account',async()=>{
 const f=fixture(),held=deferred();await f.api.collection('gifts');f.requests.set('/api/cosmetics/gifts',held.promise);const sending=f.api.send(f.form());
 f.switchAccount();f.bridge.showDialog('New account profile','','<div id="account-b-profile"></div>');held.resolve({acknowledged:true,gift:{id:'old-account-gift'}});await sending;
 assert.equal(f.title,'New account profile');assert.ok(f.nodes.get('account-b-profile')?.isConnected);assert.ok(!f.toasts.some(text=>/Gift request sent/.test(text)));
});
(async()=>{let failures=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${tests.length-failures}/${tests.length} collection/account UI lifecycle checks passed. VM DOM/transport; no browser rendering claim.`);process.exitCode=failures?1:0;})();
