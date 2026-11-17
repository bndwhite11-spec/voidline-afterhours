'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../dist/cosmetics.js'),'utf8');
const tests=[],test=(name,fn)=>tests.push([name,fn]);
const held=()=>{let resolve,reject;return {promise:new Promise((a,b)=>{resolve=a;reject=b;}),get resolve(){return resolve;},get reject(){return reject;}};};
function fixture(){
 const nodes=new Map(),listeners=new Map(),calls=[],announcements=[],replies=new Map();let renders=0,extension;
 const catalog=[{id:'angel',type:'badge',name:'404 Angel',finish:'Chrome',description:'A free cosmetic.',acquisition:'Free to collect.',price:0},{id:'gift-rose',type:'gift',name:'Chrome Rose',finish:'Rose chrome',description:'A free gift.',acquisition:'Free to collect.',price:0}];
 const state={account:{id:'account-a'},generation:0,dialogGeneration:0,secureRoomId:null};
 function node(id=''){return {id,isConnected:true,innerHTML:'',textContent:'',disabled:false,value:'',dataset:{},insertAdjacentHTML(_p,text){this.innerHTML+=text;},querySelector(){return null;}};}
 const bridge={state,esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),guard(){const id=state.account?.id,g=state.generation;return ()=>id===state.account?.id&&g===state.generation;},request:async(route,body)=>{calls.push({route,body});if(replies.has(route)){const response=replies.get(route);return typeof response==='function'?response(body):await response;}if(route==='/api/cosmetics/catalog')return {items:catalog};if(route==='/api/cosmetics/inventory')return {owned:[],equippedId:null,giftsEnabled:true,pendingGifts:0};return {owned:[],equippedId:null,giftsEnabled:true,pendingGifts:0};},showDialog(title,copy,html){state.dialogGeneration++;for(const n of nodes.values())n.isConnected=false;nodes.clear();const dialog=node('dialog');dialog.innerHTML=title+copy+html;nodes.set('dialog',dialog);for(const [,id]of html.matchAll(/\bid="([^"]+)"/g))nodes.set(id,node(id));return state.dialogGeneration;},announce:text=>announcements.push(text),render(){renders++;},registerExtension(value){extension=value;value.init(bridge);}};
 const document={getElementById:id=>nodes.get(id)||null,addEventListener:(name,handler)=>listeners.set(name,handler)};
 const context={window:{VoidHome:bridge,addEventListener(){}},document,crypto:webcrypto,FormData:class{constructor(form){this.values=form.values||{};}get(name){return this.values[name];}},console,Date};
 vm.createContext(context);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'window.__cosmeticsTest={collection,mutate,send,inbox,inspect,summary:()=>({owned:[...owned],equipped,pending,loaded})};})();'),context);
 return {bridge,state,calls,replies,nodes,listeners,announcements,seam:context.window.__cosmeticsTest,cosmetics:context.window.VoidCosmetics,get extension(){return extension;},get renders(){return renders;},node};
}

test('free catalog stays unowned until an acknowledged explicit claim',async()=>{
 const app=fixture();await app.extension.onAccount();await app.seam.collection();assert.equal(app.seam.summary().owned.length,0);assert.match(app.nodes.get('dialog').innerHTML,/Add to collection/);assert.match(app.nodes.get('dialog').innerHTML,/Every item is free/);
 app.replies.set('/api/cosmetics/inventory',{owned:[{cosmetic_id:'angel'}],equippedId:null,giftsEnabled:true,pendingGifts:0});app.replies.set('/api/cosmetics/claim',{owned:[{cosmetic_id:'angel'}],equippedId:null,giftsEnabled:true,pendingGifts:0});await app.seam.mutate('/claim',{cosmeticId:'angel'},app.node(),()=>app.seam.collection());assert.equal(app.seam.summary().owned[0],'angel');
});
test('failed collection writes keep ownership and equipped state unchanged',async()=>{
 const app=fixture();await app.extension.onAccount();await app.seam.collection();app.replies.set('/api/cosmetics/claim',()=>Promise.reject(Error('Write failed')));await app.seam.mutate('/claim',{cosmeticId:'angel'},app.node());assert.equal(app.seam.summary().owned.length,0);assert.equal(app.seam.summary().equipped,null);assert.equal(app.nodes.get('vc-error').textContent,'Write failed');
});
test('a delayed collection load cannot replace a newer profile editor',async()=>{
 const app=fixture(),slow=held();app.replies.set('/api/cosmetics/catalog',slow.promise);const loading=app.seam.collection();app.bridge.showDialog('Edit profile','Unsaved bio','<input id="profile-editor">');slow.resolve({items:[]});await loading;assert.match(app.nodes.get('dialog').innerHTML,/Unsaved bio/);assert.ok(app.nodes.has('profile-editor'));
});
test('old inventory fetches never roll back a later committed equipment change',async()=>{
 const app=fixture();await app.extension.onAccount();const slow=held();app.replies.set('/api/cosmetics/inventory',slow.promise);const loading=app.cosmetics.refresh();app.replies.set('/api/cosmetics/equip',{owned:[{cosmetic_id:'angel'}],equippedId:'angel',giftsEnabled:true,pendingGifts:0});await app.seam.mutate('/equip',{cosmeticId:'angel'},app.node());slow.resolve({owned:[],equippedId:null,giftsEnabled:true,pendingGifts:0});await loading;assert.equal(app.seam.summary().equipped,'angel');assert.equal(app.seam.summary().owned.length,1);
});
test('collection mutations do not rebuild an active conversation composer',async()=>{
 const app=fixture();await app.extension.onAccount();app.state.secureRoomId='private-room';const before=app.renders;app.replies.set('/api/cosmetics/claim',{owned:[{cosmetic_id:'angel'}],equippedId:null,giftsEnabled:true,pendingGifts:0});await app.seam.mutate('/claim',{cosmeticId:'angel'},app.node());assert.equal(app.renders,before);
});
test('old-account inventory and mutation acknowledgments cannot enter a different account',async()=>{
 const app=fixture(),slow=held();await app.extension.onAccount();app.replies.set('/api/cosmetics/equip',slow.promise);const saving=app.seam.mutate('/equip',{cosmeticId:'angel'},app.node());app.extension.onLock();app.state.account={id:'account-b'};await app.extension.onAccount();slow.resolve({owned:[{cosmetic_id:'angel'}],equippedId:'angel',giftsEnabled:true,pendingGifts:99});await saving;assert.equal(app.seam.summary().equipped,null);assert.equal(app.seam.summary().pending,0);
});
test('failed gift sends preserve the form and retry with the same client request ID',async()=>{
 const app=fixture();await app.extension.onAccount();app.bridge.showDialog('Send gift','','<p id="vc-error"></p>');let attempts=0;app.replies.set('/api/cosmetics/gifts',body=>{attempts++;if(attempts===1)throw Error('Connection lost');return {acknowledged:true,gift:{id:'actual-gift'}};});const form=app.node();form.dataset={item:'gift-rose',client:'stable-gift-id'};form.values={username:'recipient'};await app.seam.send(form);assert.match(app.nodes.get('vc-error').textContent,/Connection lost/);assert.equal(form.dataset.client,'stable-gift-id');await app.seam.send(form);const sends=app.calls.filter(call=>call.route==='/api/cosmetics/gifts');assert.equal(sends.length,2);assert.equal(sends[0].body.clientId,sends[1].body.clientId);assert.match(app.nodes.get('dialog').innerHTML,/Gift request sent/);
});
test('badge silhouettes are distinct and each inspection gets independent gradient IDs',async()=>{
 const app=fixture(),ids=['larp','angel','ghost','velvet','night','unknown','dead','voidwalker','orbit'];const svg=ids.map(id=>app.cosmetics.art(id,true));assert.equal(new Set(svg).size,9);for(const art of svg){assert.match(art,/viewBox="0 0 64 68"/);assert.doesNotMatch(art,/<script|onload=|https?:/i);}assert.notEqual(app.cosmetics.art('angel'),app.cosmetics.art('angel'));
});
(async()=>{let failed=0;for(const[name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error);}}console.log(`${tests.length-failed}/${tests.length} cosmetics client checks passed. VM lifecycle and transport; no browser rasterization or real gifts claimed.`);process.exitCode=failed?1:0;})();
