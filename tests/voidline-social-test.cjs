'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../dist/social.js'),'utf8');
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function client({avatar,openProfile}={}){
 const nodes=new Map(),listeners=new Map(),calls=[],notices=[],answers=new Map();
 const blank={friends:[],incoming:[],outgoing:[],blocked:[],counts:{friends:0,incoming:0,outgoing:0,blocked:0},settings:{allowRequests:true},page:{limit:30,offset:0}};
 const state={account:{id:'alice'},dialogGeneration:0};
 const node=(id='')=>({id,innerHTML:'',textContent:'',isConnected:true,hidden:false,checked:true,disabled:false,dataset:{},querySelector(){return null;}});
 const bridge={state,esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),icon:name=>`<svg data-icon="${name}"></svg>`,announce:message=>notices.push(message),request:async(route,body)=>{calls.push({route,body});if(answers.has(route)){const answer=answers.get(route);return typeof answer==='function'?answer(body):answer;}return blank;},showDialog(title,copy,html){state.dialogGeneration++;for(const old of nodes.values())old.isConnected=false;nodes.clear();const dialog=node('dialog');dialog.innerHTML=title+copy+html;nodes.set('dialog',dialog);for(const match of html.matchAll(/\bid="([^"]+)"/g))nodes.set(match[1],node(match[1]));},registerExtension(){} };
 const context={window:{...((avatar||openProfile)?{VoidProfilesPanel:{avatar,openProfile}}:{}),VoidHome:{registerExtension:extension=>extension.init(bridge)},addEventListener(){}},document:{getElementById:id=>nodes.get(id)||null,addEventListener:(name,fn)=>listeners.set(name,fn)},FormData:class{constructor(form){this.values=form.values;}get(key){return this.values[key];}},console};
 vm.createContext(context);vm.runInContext(source,context,{filename:'dist/social.js'});
 const api=context.window.VoidSocial;
 return {api,bridge,nodes,listeners,calls,notices,answers,blank,node,state,async form(username){const form=node();form.dataset={socialForm:'request'};form.values={username};listeners.get('submit')({target:form,preventDefault(){}});await flush();await flush();return form;},async click(data){const button=node();button.dataset={socialAction:data.action,...data};listeners.get('click')({target:{closest:()=>button},preventDefault(){}});await flush();await flush();return button;}};
}
const cases=[];const test=(name,run)=>cases.push([name,run]);
test('the friend panel starts empty and a read never sends a request or invents a count',async()=>{
 const c=client();await c.api.open();assert.equal(c.calls.length,1);assert.equal(c.calls[0].body,undefined);assert.match(c.nodes.get('social-results').innerHTML,/Your friends will appear/);assert.doesNotMatch(c.api.extension.navHTML(),/vs-count/);assert.equal(c.notices.length,0);
});
test('friend profile labels are escaped and pending counts come from the account response',async()=>{
 const c=client();c.answers.set('/api/social?limit=30&offset=0',{...c.blank,friends:[{accountId:'bob',username:'bob',displayName:'<script>bad()</script>'}],counts:{...c.blank.counts,friends:1,incoming:2}});await c.api.open();assert.match(c.nodes.get('social-results').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(c.nodes.get('social-results').innerHTML,/<script>/);assert.match(c.api.extension.navHTML(),/2 incoming friend requests/);
});
test('friends render uploaded static avatar representations while blocked rows never request those images',async()=>{
 const calls=[],id='a'.repeat(64),person={accountId:'bob',username:'bobby',displayName:'Bobby',avatarMedia:{id,url:'/api/media/'+id,posterUrl:'/api/media/'+id,isGif:true,animationUrl:'/api/media/'+id+'/animation'}},c=client({avatar:p=>{calls.push(p);return '<img src="'+p.avatarMedia.posterUrl+'" alt="">';}});
 c.answers.set('/api/social?limit=30&offset=0',{...c.blank,friends:[person],counts:{...c.blank.counts,friends:1}});await c.api.open();assert.equal(calls.length,1);assert.match(c.nodes.get('social-results').innerHTML,new RegExp('src="/api/media/'+id+'"'));assert.doesNotMatch(c.nodes.get('social-results').innerHTML,/src="[^"]+\/animation/);
 c.answers.set('/api/social?limit=30&offset=0',{...c.blank,blocked:[person],counts:{...c.blank.counts,blocked:1}});await c.api.open('blocked');assert.equal(calls.length,1);assert.doesNotMatch(c.nodes.get('social-results').innerHTML,/<img/);
});
test('sending to an existing incoming request opens Incoming rather than claiming a new send',async()=>{
 const c=client();await c.api.open();c.answers.set('/api/social/request',{request:{id:'request1',state:'pending',direction:'incoming'},alreadyExists:true});await c.form('@bobby');const mutation=c.calls.find(call=>call.body);assert.equal(mutation.body.username,'bobby');assert.match(c.notices[0],/already sent you a request/);assert.match(c.nodes.get('social-tabs').innerHTML,/data-view="incoming" aria-pressed="true"/);
});
test('a failed friend-request write keeps its form available and never announces success',async()=>{
 const c=client();await c.api.open();c.answers.set('/api/social/request',()=>Promise.reject(Error('Not available')));const form=await c.form('bobby');assert.equal(form.isConnected,true);assert.equal(form.values.username,'bobby');assert.match(c.nodes.get('social-error').textContent,/Not available/);assert.equal(c.notices.length,0);assert.equal(form.dataset.busy,undefined);
});
test('a late old-account response cannot populate the new account panel',async()=>{
 const c=client(),held=defer();c.answers.set('/api/social?limit=30&offset=0',held.promise);const opening=c.api.open();c.api.extension.onLock();c.state.account={id:'bobby'};c.bridge.showDialog('Different account','','<div id="other">New account</div>');held.resolve({...c.blank,friends:[{accountId:'secret',username:'old_private_friend',displayName:'Old private friend'}]});await opening;assert.match(c.nodes.get('dialog').innerHTML,/New account/);assert.doesNotMatch(c.nodes.get('dialog').innerHTML,/Old private friend/);
});
test('block and remove actions require their confirmation before account mutation',async()=>{
 const c=client();await c.api.open();await c.click({action:'block-confirm',account:'bobby',username:'bobby'});assert.equal(c.calls.filter(call=>call.body).length,0);assert.match(c.nodes.get('dialog').innerHTML,/Block @bobby/);await c.click({action:'block',account:'bobby'});const mutation=c.calls.find(call=>call.body);assert.equal(mutation.route,'/api/social/blocks');assert.equal(mutation.body.accountId,'bobby');assert.equal(mutation.body.active,true);
});
test('a delayed social write cannot replace a newer profile dialog or its unsaved text',async()=>{
 const c=client(),held=defer();await c.api.open();c.answers.set('/api/social/request',held.promise);await c.form('bobby');c.bridge.showDialog('Edit profile','','<textarea id="new-profile">Unsaved profile text</textarea>');held.resolve({request:{id:'request1',state:'pending',direction:'outgoing'}});await flush();await flush();assert.match(c.nodes.get('dialog').innerHTML,/Unsaved profile text/);assert.equal(c.notices.length,0);assert.equal(c.calls.filter(call=>call.route.startsWith('/api/social?')).length,1);
});
test('an accepted friend Message action opens review without creating a conversation',async()=>{const c=client(),recipients=[];c.bridge.newNativeConversation=username=>recipients.push(username);c.answers.set('/api/social?limit=30&offset=0',{...c.blank,friends:[{accountId:'bob',username:'bobby',displayName:'Bobby'}],counts:{...c.blank.counts,friends:1}});await c.api.open();assert.match(c.nodes.get('social-results').innerHTML,/data-social-action="message"/);await c.click({action:'message',username:'bobby'});assert.deepEqual(recipients,['bobby']);assert.equal(c.calls.some(call=>call.body!==undefined),false);});
test('friend profile clicks use the exact account ID without creating or changing a conversation',async()=>{
 const opened=[],c=client({openProfile:(...args)=>opened.push(args)});c.answers.set('/api/social?limit=30&offset=0',{...c.blank,friends:[{accountId:'exact-account',username:'bobby',displayName:'Bobby',avatar:'leaf',profileAvailable:true}],counts:{...c.blank.counts,friends:1}});await c.api.open();assert.match(c.nodes.get('social-results').innerHTML,/data-social-action="profile" data-account="exact-account"/);await c.click({action:'profile',account:'exact-account'});assert.deepEqual(opened,[['exact-account',true]]);assert.equal(c.calls.filter(call=>call.body!==undefined).length,0);
});
test('permission-restricted request identities use initials rather than a preset or uploaded avatar',async()=>{
 const rendered=[],id='d'.repeat(64),c=client({avatar:person=>{rendered.push(person);return '<img src="'+person.avatarMedia.url+'">';}});c.answers.set('/api/social?limit=30&offset=0',{...c.blank,incoming:[{id:'request-1',accountId:'hidden',username:'hidden',displayName:'Hidden',avatar:'moon',avatarMedia:{url:'/api/media/'+id},nameStyle:'serif',profileAvailable:false}],counts:{...c.blank.counts,incoming:1}});await c.api.open('incoming');const html=c.nodes.get('social-results').innerHTML;assert.equal(rendered.length,0);assert.doesNotMatch(html,/<img|data-social-action="profile"/);assert.match(html,/>H<\/span>/);assert.match(html,/data-name-style="plain"/);
});
(async()=>{let failures=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}}console.log(`${cases.length-failures}/${cases.length} social client checks passed. VM transport and DOM lifecycle, not browser interaction.`);process.exitCode=failures?1:0;})();
