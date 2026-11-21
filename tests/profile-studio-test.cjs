'use strict';
// Shipped profile studio + showcase module with real DOM/FormData/events.
// Layout, browser image decoding and Android/iOS device acceptance are separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),crypto=require('node:crypto').webcrypto;
const source=fs.readFileSync(path.join(__dirname,'../dist/profiles-panel.js'),'utf8'),showcaseSource=fs.readFileSync(path.join(__dirname,'../dist/profile-showcase.js'),'utf8');
const cases=[],test=(name,run)=>cases.push([name,run]),clone=value=>JSON.parse(JSON.stringify(value));
const held=()=>{let resolve,reject;return {promise:new Promise((a,b)=>{resolve=a;reject=b;}),resolve:value=>resolve(value),reject:error=>reject(error)};};
async function settle(){for(let i=0;i<20;i++)await Promise.resolve();}
async function until(check){for(let i=0;i<100&&!check();i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(check(),'controlled operation settled');}
const asset=id=>({id,url:'/api/media/'+id}),gif=id=>({...asset(id),isGif:true,posterUrl:'/api/media/'+id,animationUrl:'/api/media/'+id+'/animation'});
async function fixture(overrides={},options={}){
 const dom=new JSDOM('<dialog id="home-dialog" open></dialog>',{url:'https://voidline.test',runScripts:'outside-only',pretendToBeVisual:true}),window=dom.window,document=window.document,requests=[],announcements=[],inspections=[],looks=[],uploads=new Map();
 const base={id:'account-a',username:'night_a',displayName:'Night A',bio:'An original biography.',status:'Making things',avatar:'moon',banner:'midnight',accent:'ice',nameStyle:'plain',profileFrame:'none',detailsVisibility:'shared',collectionVisibility:'shared',animationEnabled:false,badgeOrder:[],earnedBadges:[],detailsVisible:true,collectionVisible:true,equippedId:null,showcase:[],showcaseSlots:[],revision:1};let server={...base,...clone(overrides)},post=null,get=null,disposed=0;
 const catalog=[{id:'larp',type:'badge',name:'LARP Pro Max'},{id:'angel',type:'badge',name:'Angel'},{id:'gift-rose',type:'gift',name:'Chrome Rose'},{id:'gift-star',type:'gift',name:'Pocket Star'}],instances=[{id:'instance-rose',catalog_id:'gift-rose',name:'Chrome Rose',owner_id:'account-a',origin_kind:'gift',sender_username:'gift_friend',sender_name:'Gift Friend',senderDisclosureAvailable:true},{id:'instance-star',catalog_id:'gift-star',name:'Pocket Star',owner_id:'account-a',origin_kind:'claim'}];
 const state={account:{id:'account-a',username:'night_a',displayName:'Night A'},session:{id:'session-a'},generation:0,dialogGeneration:0,view:'you'},dialog=document.getElementById('home-dialog'),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function merge(patch){const next={...server,...clone(patch),revision:server.revision+1};for(const kind of ['avatar','banner'])if(Object.hasOwn(patch,kind+'MediaId'))next[kind+'Media']=patch[kind+'MediaId']?(uploads.get(patch[kind+'MediaId'])||server[kind+'Media']):null;if(Object.hasOwn(patch,'showcaseSlots'))next.showcase=patch.showcaseSlots.map(slot=>{const item=instances.find(item=>item.id===slot.instanceId);return{...item,slot:slot.slot,instance_id:slot.instanceId,show_sender:slot.showSender?1:0,...(!slot.showSender?{sender_name:null,sender_username:null}:{})};});return next;}
 const bridge={state,esc,guard(){const id=state.account?.id,g=state.generation;return()=>id===state.account?.id&&g===state.generation;},async request(route,body){requests.push({route,body:body&&clone(body)});if(route==='/api/profiles/me'){if(!body)return get?await get():{profile:clone(server)};const {expectedRevision,baseValues,...patch}=body;const result=post?await post(body):{profile:merge(patch)};server=clone(result.profile);return result;}if(route==='/api/cosmetics/catalog')return{items:clone(catalog)};if(route==='/api/cosmetics/inventory')return{owned:[{cosmetic_id:'larp'},{cosmetic_id:'angel'}]};if(route.startsWith('/api/cosmetics/instances/'))return{instance:clone(instances.find(item=>item.id===decodeURIComponent(route.split('/').at(-1))))};if(route.startsWith('/api/cosmetics/instances'))return{instances:clone(instances),total:instances.length,page:{hasMore:false}};if(route.startsWith('/api/media/')&&route.endsWith('/cancel'))return{cancelled:true};return{};},showDialog(title,copy,html){state.dialogGeneration++;dialog.innerHTML=`<h2>${esc(title)}</h2><p>${esc(copy)}</p>${html}`;return state.dialogGeneration;},closeDialog(){dialog.replaceChildren();},announce:text=>announcements.push(text),render(){},refreshChrome(){},registerExtension(extension){bridge.extension=extension;extension.init(bridge);}};
 window.matchMedia=()=>({matches:false});window.VoidHome=bridge;window.VoidTheme={state:()=>({effectiveReducedMotion:false})};window.VoidProfileMedia={disposeAll(){disposed++;}};window.VoidProfileLooks={mount(config){looks.push(config);}};
 window.VoidCosmetics={art:id=>`<svg data-art="${esc(id)}" viewBox="0 0 24 24"></svg>`,earnedArt:id=>`<svg data-earned="${esc(id)}"></svg>`,refresh(){},async openBadge(id,opts){inspections.push({kind:'badge',id,opts});bridge.showDialog('Badge details','','<p>Exact badge</p>');},async openItem(id,opts){inspections.push({kind:'gift',id,opts});bridge.showDialog('Gift details','','<p>Exact gift</p>');}};
 if(options.showcase!==false)window.eval(showcaseSource);
 window.eval(source.replace(/\}\)\(\);\s*$/,'window.__studioTest={save,updatePreview,beforeCloseDialog,mountCrop,formValue,summary:()=>({editor,dirty,busy})};})();'));
 const module=window.VoidProfilesPanel,seam=window.__studioTest;await module.edit();await settle();
 return{window,document,dialog,bridge,state,requests,announcements,inspections,looks,uploads,catalog,instances,module,seam,get form(){return document.getElementById('vp-editor');},get preview(){return document.getElementById('vp-live-preview');},get server(){return server;},set server(value){server=clone(value);},get disposed(){return disposed;},setPost(fn){post=fn;},setGet(fn){get=fn;},input(selector,value,type='input'){const field=typeof selector==='string'?document.querySelector(selector):selector;assert.ok(field,'control exists: '+selector);if(field.type==='checkbox')field.checked=value;else field.value=value;field.dispatchEvent(new window.Event(type,{bubbles:true}));return field;},click(selector){const button=typeof selector==='string'?document.querySelector(selector):selector;assert.ok(button,'button exists: '+selector);button.click();return button;},async save(){await seam.save(this.form);await settle();},posts(){return requests.filter(request=>request.route==='/api/profiles/me'&&request.body);},close(){dom.window.close();}};
}

test('six sections share one persistent form with keyboard tab navigation and unsaved text intact',async()=>{const f=await fixture();try{const form=f.form,input=f.input('[name="bio"]','Keep every unsaved word');input.focus();input.setSelectionRange(3,7);assert.equal(f.form.querySelectorAll('[role="tab"]').length,6);for(const name of ['images','style','decorations','showcase','visibility','identity']){f.click(`[data-vp-action="section"][data-section="${name}"]`);assert.equal(f.form,form);assert.equal(form.elements.namedItem('bio'),input);assert.equal(input.value,'Keep every unsaved word');assert.equal(input.selectionStart,3);assert.equal(f.document.getElementById('vp-section-'+name).hidden,false);}const tab=f.document.getElementById('vp-tab-identity');tab.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(f.form.dataset.section,'images');assert.equal(f.document.activeElement.id,'vp-tab-images');assert.equal(f.posts().length,0);}finally{f.close();}});

test('visual presets change only the draft and scoped saves include original values and revision',async()=>{const f=await fixture();try{f.click('[data-field="accent"][data-value="jade"]');f.click('[data-field="nameStyle"][data-value="mono"]');f.click('[data-field="profileFrame"][data-value="halo"]');assert.equal(f.state.account.nameStyle,undefined);assert.equal(f.posts().length,0);assert.equal(f.preview.querySelector('.vp-card').dataset.frame,'halo');assert.equal(f.form.querySelector('[data-field="accent"][data-value="jade"]').getAttribute('aria-pressed'),'true');await f.save();const body=f.posts()[0].body;assert.deepEqual(Object.keys(body).sort(),['accent','baseValues','expectedRevision','nameStyle','profileFrame'].sort());assert.equal(body.expectedRevision,1);assert.deepEqual(body.baseValues,{accent:'ice',nameStyle:'plain',profileFrame:'none'});assert.equal(f.state.account.nameStyle,'mono');assert.equal(f.seam.summary().dirty,false);}finally{f.close();}});

test('all preview contexts retain controls, caret, staged state and show the full gift composition',async()=>{const gifts=[{slot:1,instance_id:'instance-rose',catalog_id:'gift-rose',name:'Chrome Rose'}],f=await fixture({showcase:gifts,showcaseSlots:[{slot:1,instanceId:'instance-rose',showSender:false}]});try{const form=f.form,input=f.input('[name="displayName"]','Edited identity');input.focus();input.setSelectionRange(2,5);assert.match(f.preview.innerHTML,/Gift showcase|Chrome Rose/);for(const mode of ['compact','message','member','mobile','audience','full']){f.click(`[data-vp-action="preview"][data-mode="${mode}"]`);assert.equal(f.form,form);assert.equal(form.elements.namedItem('displayName'),input);assert.equal(input.value,'Edited identity');assert.equal(input.selectionStart,2);assert.equal(f.posts().length,0);}f.click('[data-vp-action="preview"][data-mode="compact"]');assert.equal(f.preview.querySelector('.vp-showcase'),null);f.click('[data-vp-action="preview"][data-mode="full"]');assert.match(f.preview.innerHTML,/Chrome Rose/);f.click('[data-vp-action="mobile-pane"][data-pane="preview"]');assert.equal(f.form.dataset.mobilePane,'preview');f.click('[data-vp-action="mobile-pane"][data-pane="edit"]');assert.equal(f.form.dataset.mobilePane,'edit');assert.equal(f.form,form);}finally{f.close();}});

test('audience preview keeps permitted basic avatar but hides private rich details and independent collection fields',async()=>{const avatarId='a'.repeat(64),bannerId='b'.repeat(64),f=await fixture({avatarMediaId:avatarId,avatarMedia:asset(avatarId),bannerMediaId:bannerId,bannerMedia:asset(bannerId),bio:'PRIVATE BIO',status:'PRIVATE STATUS',detailsVisibility:'private',collectionVisibility:'friends',nameStyle:'serif',profileFrame:'halo',showcase:[{slot:1,instance_id:'instance-rose',catalog_id:'gift-rose',name:'Chrome Rose'}],showcaseSlots:[{slot:1,instanceId:'instance-rose',showSender:false}]});try{f.input('#vp-preview-audience','friend','change');assert.match(f.preview.innerHTML,new RegExp(avatarId));assert.doesNotMatch(f.preview.innerHTML,new RegExp(bannerId+'|PRIVATE BIO|PRIVATE STATUS'));assert.equal(f.preview.querySelector('.vp-card').dataset.nameStyle,'plain');assert.match(f.preview.innerHTML,/Chrome Rose/);f.input('#vp-preview-audience','community','change');assert.doesNotMatch(f.preview.innerHTML,/Chrome Rose/);assert.match(f.preview.innerHTML,/collection is private/);assert.equal(f.posts().length,0);}finally{f.close();}});

test('unrelated and blocked previews follow the profile access gate without inventing anonymous public access',async()=>{const f=await fixture({detailsVisibility:'private',collectionVisibility:'public',bio:'Private secret'});try{f.input('#vp-preview-audience','other','change');assert.match(f.preview.textContent,/Full profile unavailable/);assert.match(f.preview.textContent,/Public collection.*separately/);assert.doesNotMatch(f.preview.innerHTML,/Private secret|vp-card/);f.input('[name="detailsVisibility"]','public','change');assert.ok(f.preview.querySelector('.vp-card'));f.input('#vp-preview-audience','blocked','change');assert.match(f.preview.textContent,/unavailable after a block/);assert.doesNotMatch(f.preview.innerHTML,/Private secret|vp-card/);assert.match(f.document.getElementById('vp-section-visibility').textContent,/signed-in.*anonymous public page/);}finally{f.close();}});

test('uploaded images remain selected when a saved look changes preset values and styles',async()=>{const id='c'.repeat(64),f=await fixture({avatarMediaId:id,avatarMedia:asset(id)});try{assert.equal(f.looks.length,1);assert.deepEqual(clone(f.looks[0].read()),{accent:'ice',avatar:'moon',banner:'midnight',nameStyle:'plain',profileFrame:'none'});f.looks[0].apply({accent:'gold',avatar:'ghost',banner:'orchid',nameStyle:'serif',profileFrame:'line'});const draft=f.seam.formValue(f.form);assert.equal(draft.avatarMediaId,id);assert.equal(draft.avatar,'ghost');assert.equal(draft.nameStyle,'serif');assert.equal(draft.profileFrame,'line');assert.match(f.preview.innerHTML,new RegExp(id));assert.equal(f.posts().length,0);f.click('[data-field="avatar"][data-value="moon"]');assert.equal(f.seam.formValue(f.form).avatarMediaId,null);assert.equal(f.preview.querySelector('.vp-avatar img'),null);}finally{f.close();}});

test('owned decoration selection is a cosmetic draft until one atomic profile save',async()=>{const f=await fixture();try{assert.equal(f.requests.filter(r=>r.route==='/api/cosmetics/inventory').length,0);f.click('[data-vp-action="section"][data-section="decorations"]');await settle();f.click('[data-vp-action="equip"][data-item="larp"]');assert.equal(f.seam.summary().editor.draft.equippedId,'larp');assert.equal(f.state.account.equippedId,undefined);assert.match(f.preview.querySelector('.vp-equipped').innerHTML,/larp/);assert.equal(f.posts().length,0);await f.save();assert.equal(f.posts()[0].body.equippedId,'larp');assert.equal(f.requests.some(request=>request.route==='/api/cosmetics/equip'),false);assert.doesNotMatch(f.preview.textContent,/Platform owner/);}finally{f.close();}});

test('showcase choosing, ordering, removal and sender disclosure remain draft-only',async()=>{const f=await fixture();try{f.click('[data-vp-action="section"][data-section="showcase"]');f.click('[data-ps-action="choose"][data-slot="1"]');await until(()=>f.document.querySelector('[data-ps-action="pick"][data-instance="instance-rose"]'));f.click('[data-ps-action="pick"][data-instance="instance-rose"]');f.click('[data-ps-action="choose"][data-slot="2"]');await until(()=>f.document.querySelector('[data-ps-action="pick"][data-instance="instance-star"]'));f.click('[data-ps-action="pick"][data-instance="instance-star"]');assert.match(f.preview.innerHTML,/Chrome Rose|Pocket Star/);f.input('[data-ps-sender="1"]',true,'change');assert.match(f.preview.textContent,/From @gift_friend/);f.click('[data-ps-action="move"][data-slot="1"][data-target="2"]');assert.equal(f.seam.formValue(f.form).showcaseSlots[1].instanceId,'instance-rose');f.click('[data-ps-action="remove"][data-slot="1"]');assert.equal(f.seam.formValue(f.form).showcaseSlots.length,1);assert.equal(f.posts().length,0);assert.equal(f.requests.some(request=>request.body),false);await f.save();assert.deepEqual(f.posts()[0].body.showcaseSlots,[{slot:2,instanceId:'instance-rose',showSender:true}]);assert.equal(f.requests.some(request=>/claim|transfer|\/showcase$/.test(request.route)),false);}finally{f.close();}});

test('exact earned-badge inspection returns to the same unsaved editor section and preview',async()=>{const award={badge_id:'profile-authored',name:'Profile Authored'},f=await fixture({earnedBadges:[award],badgeOrder:['profile-authored']});try{f.input('[name="bio"]','Keep this draft while reading badge details');f.click('[data-vp-action="section"][data-section="decorations"]');f.click('[data-vp-action="preview"][data-mode="mobile"]');f.click('[data-vp-award="profile-authored"]');await settle();assert.equal(f.inspections[0].kind,'badge');assert.equal(f.inspections[0].id,'profile-authored');assert.equal(f.inspections[0].opts.profileId,'account-a');await f.inspections[0].opts.returnTo();assert.equal(f.form.elements.namedItem('bio').value,'Keep this draft while reading badge details');assert.equal(f.form.dataset.section,'decorations');assert.equal(f.form.querySelector('[data-mode="mobile"]').getAttribute('aria-pressed'),'true');assert.equal(f.seam.summary().dirty,true);assert.equal(f.posts().length,0);}finally{f.close();}});

test('discard confirmation retains section, audience and full draft when editing continues',async()=>{const f=await fixture();try{f.input('[name="bio"]','Do not drop my draft');f.click('[data-vp-action="section"][data-section="style"]');f.input('#vp-preview-audience','friend','change');f.click('[data-field="accent"][data-value="oxide"]');f.click('[data-vp-action="discard"]');assert.match(f.dialog.textContent,/Discard profile changes/);f.click('[data-vp-action="keep-editing"]');assert.equal(f.form.dataset.section,'style');assert.equal(f.form.elements.namedItem('bio').value,'Do not drop my draft');assert.equal(f.seam.formValue(f.form).accent,'oxide');assert.equal(f.document.getElementById('vp-preview-audience').value,'friend');assert.equal(f.posts().length,0);f.click('[data-vp-action="discard"]');f.click('[data-vp-action="confirm-discard"]');assert.equal(f.form,null);assert.equal(f.posts().length,0);}finally{f.close();}});

test('same-field conflicts preserve local edits, rebase untouched remote fields and require an explicit resolution',async()=>{const f=await fixture();try{f.input('[name="bio"]','My local biography');const remote={...f.server,bio:'Biography from another device',status:'Remote status',revision:2};f.setPost(()=>Promise.reject(Object.assign(Error('Profile changed'),{code:'profile_conflict',status:409,response:{conflicts:['bio'],profile:remote}})));await f.save();assert.equal(f.form.elements.namedItem('bio').value,'My local biography');assert.equal(f.form.elements.namedItem('status').value,'Remote status');assert.equal(f.form.querySelector('[type="submit"]').disabled,true);assert.match(f.document.getElementById('vp-conflict').textContent,/My local biography|Biography from another device/);const count=f.posts().length;await f.save();assert.equal(f.posts().length,count);f.click('[data-vp-action="conflict-mine"][data-field="bio"]');assert.equal(f.form.querySelector('[type="submit"]').disabled,false);f.server=remote;f.setPost(null);await f.save();const body=f.posts().at(-1).body;assert.equal(body.expectedRevision,2);assert.equal(body.baseValues.bio,'Biography from another device');assert.equal(body.bio,'My local biography');assert.equal(body.status,undefined);assert.equal(f.seam.summary().dirty,false);}finally{f.close();}});

test('choosing the saved conflict value changes only that field and keeps other local work',async()=>{const f=await fixture();try{f.input('[name="bio"]','My draft');f.input('[name="status"]','My unsaved status');const remote={...f.server,bio:'Saved elsewhere',revision:2};f.setPost(()=>Promise.reject(Object.assign(Error('Conflict'),{code:'profile_conflict',status:409,response:{conflicts:['bio'],profile:remote}})));await f.save();f.click('[data-vp-action="conflict-saved"][data-field="bio"]');assert.equal(f.form.elements.namedItem('bio').value,'Saved elsewhere');assert.equal(f.form.elements.namedItem('status').value,'My unsaved status');assert.equal(f.seam.summary().dirty,true);}finally{f.close();}});

test('conflict choices are reversible before save and preserve keyboard focus',async()=>{
 const f=await fixture();
 try{
  f.input('[name="bio"]','My Armenian biography — բարեւ');
  f.input('[name="status"]','Other unsaved work');
  const remote={...f.server,bio:'Edited elsewhere',revision:2};
  f.setPost(()=>Promise.reject(Object.assign(Error('Conflict'),{code:'profile_conflict',status:409,response:{conflicts:['bio'],profile:remote}})));
  await f.save();
  f.click('[data-vp-action="conflict-saved"]');
  assert.equal(f.form.elements.namedItem('bio').value,'Edited elsewhere');
  f.click('[data-vp-action="conflict-mine"]');
  assert.equal(f.form.elements.namedItem('bio').value,'My Armenian biography — բարեւ');
  assert.equal(f.document.activeElement.dataset.vpAction,'conflict-mine');
  assert.equal(f.form.elements.namedItem('status').value,'Other unsaved work');
  assert.equal(f.posts().length,1);
  f.setPost(null);
  await f.save();
  assert.equal(f.posts()[1].body.baseValues.bio,'Edited elsewhere');
  assert.equal(f.server.bio,'My Armenian biography — բարեւ');
 }finally{f.close();}
});

test('coordinated looks and section reset preserve uploaded art and unrelated edits',async()=>{
 const id='a'.repeat(64),f=await fixture({bannerMediaId:id,bannerMedia:asset(id)});
 try{
  f.input('[name="bio"]','Իմ էջը • مرحبا');
  f.click('[data-vp-action="section"][data-section="style"]');
  const choose='[data-vp-action="choose-look"][data-look="orchid"]';
  f.click(choose);
  let draft=f.seam.formValue(f.form);
  assert.equal(draft.accent,'lilac');assert.equal(draft.nameStyle,'serif');
  assert.equal(draft.bannerMediaId,id);
  assert.equal(f.form.querySelector(choose).getAttribute('aria-pressed'),'true');
  const reset=f.form.querySelector('[data-vp-action="reset-section"][data-section="style"]');
  assert.equal(reset.hidden,false);
  f.click(reset);
  draft=f.seam.formValue(f.form);assert.equal(draft.accent,'ice');assert.equal(draft.banner,'midnight');
  assert.equal(draft.bio,'Իմ էջը • مرحبا');assert.equal(draft.bannerMediaId,id);
  assert.equal(f.preview.querySelector('.vp-banner-image').getAttribute('src'),asset(id).url);
  assert.equal(reset.hidden,true);assert.equal(f.document.activeElement.id,'vp-tab-style');
  f.click('[data-field="banner"][data-value="eclipse"]');
  assert.equal(f.seam.formValue(f.form).bannerMediaId,null);
  f.click(reset);assert.equal(f.seam.formValue(f.form).bannerMediaId,id);
  assert.equal(f.posts().length,0);await f.save();
  assert.deepEqual(Object.keys(f.posts()[0].body).sort(),['baseValues','bio','expectedRevision']);
 }finally{f.close();}
});

test('owned badge buttons reorder the preview and save only display order',async()=>{
 const awards=[{badge_id:'profile-authored',name:'Profile Authored'},{badge_id:'invitation-guide',name:'Invitation Guide'}];
 const ids=awards.map(award=>award.badge_id),f=await fixture({earnedBadges:awards,badgeOrder:ids});
 try{
  f.click('[data-vp-action="section"][data-section="decorations"]');
  const later=f.form.querySelector('[data-index="0"][data-direction="later"]');
  assert.equal(later.getAttribute('aria-label'),'Move Profile Authored later');
  f.click(later);
  assert.deepEqual([...f.preview.querySelectorAll('[data-vp-award]')].map(el=>el.dataset.vpAward),[ids[1],ids[0]]);
  assert.equal(f.document.activeElement.getAttribute('aria-label'),'Move Profile Authored earlier');
  assert.equal(f.posts().length,0);await f.save();
  assert.deepEqual(f.posts()[0].body,{baseValues:{badgeOrder:ids},expectedRevision:1,badgeOrder:[ids[1],ids[0]]});
 }finally{f.close();}
});

test('an editor load failure replaces the loading state; retry opens the requested section',async()=>{
 const f=await fixture();
 try{
  f.bridge.loadFeature=async name=>{assert.equal(name,'collection');throw Error('Offline');};
  await f.module.edit({section:'visibility'});
  assert.doesNotMatch(f.dialog.textContent,/Loading saved profile/);
  const retry=f.dialog.querySelector('[data-vp-action="retry-editor"]');assert.ok(retry);
  f.bridge.loadFeature=async()=>{};f.click(retry);
  await until(()=>f.form?.dataset.section==='visibility');assert.equal(f.posts().length,0);
 }finally{f.close();}
});

test('a timeout reconciles an already-committed save without a duplicate mutation',async()=>{const f=await fixture();try{f.input('[name="bio"]','Saved despite a lost response');f.setPost(body=>{f.server={...f.server,bio:body.bio,revision:2};throw Object.assign(Error('Connection timed out'),{status:503});});await f.save();assert.equal(f.posts().length,1);assert.equal(f.seam.summary().dirty,false);assert.equal(f.form.elements.namedItem('bio').value,'Saved despite a lost response');assert.ok(f.announcements.includes('Profile saved.'));}finally{f.close();}});

test('an unconfirmed save rebases independent remote changes before a safe deliberate retry',async()=>{const f=await fixture();try{f.click('[data-field="accent"][data-value="gold"]');f.setPost(()=>{f.server={...f.server,bio:'New remote biography',revision:2};throw Object.assign(Error('Connection interrupted'),{status:503});});await f.save();assert.equal(f.form.elements.namedItem('bio').value,'New remote biography');assert.equal(f.seam.summary().dirty,true);assert.match(f.document.getElementById('vp-error').textContent,/saved version was checked/);f.setPost(null);await f.save();const body=f.posts().at(-1).body;assert.equal(body.accent,'gold');assert.equal(body.bio,undefined);assert.equal(body.expectedRevision,2);assert.equal(f.server.bio,'New remote biography');}finally{f.close();}});

test('newer edits made during a save remain unsaved with the current controls intact',async()=>{const f=await fixture();try{const response=held();f.input('[name="bio"]','Submitted biography');f.setPost(()=>response.promise);const form=f.form,saving=f.seam.save(form);f.input('[name="bio"]','Newer biography while saving');response.resolve({profile:{...f.server,bio:'Submitted biography',revision:2}});await saving;assert.equal(f.form,form);assert.equal(form.elements.namedItem('bio').value,'Newer biography while saving');assert.equal(f.seam.summary().dirty,true);assert.equal(f.document.getElementById('vp-save-state').textContent,'Unsaved changes');assert.ok(!f.announcements.includes('Profile saved.'));}finally{f.close();}});

test('an account switch rejects late save, inspection and saved-look callbacks',async()=>{const f=await fixture();try{const response=held();f.input('[name="bio"]','Account A draft');f.setPost(()=>response.promise);const saving=f.seam.save(f.form),apply=f.looks[0].apply;f.bridge.extension.onLock();f.state.account={id:'account-b',displayName:'Account B'};f.state.session={id:'session-b'};f.state.generation++;response.resolve({profile:{...f.server,bio:'A only',revision:2}});await saving;apply({accent:'gold',avatar:'ghost',banner:'noise',nameStyle:'mono',profileFrame:'halo'});assert.equal(f.state.account.displayName,'Account B');assert.equal(f.seam.summary().editor,null);assert.equal(f.announcements.length,0);}finally{f.close();}});

test('ordinary text editing preserves live preview image nodes and deliberate playback',async()=>{const id='d'.repeat(64),f=await fixture({avatarMediaId:id,avatarMedia:gif(id),animationEnabled:true});try{const preview=f.preview,card=preview.querySelector('.vp-card'),image=card.querySelector('.vp-avatar img');f.click('[data-vp-action="toggle-gifs"]');assert.equal(image.getAttribute('src'),'/api/media/'+id+'/animation');for(let i=0;i<20;i++)f.input('[name="displayName"]','Live name '+i);f.click('[data-vp-action="section"][data-section="style"]');f.click('[data-field="accent"][data-value="lilac"]');assert.equal(f.preview,preview);assert.equal(preview.querySelector('.vp-card'),card);assert.equal(card.querySelector('.vp-avatar img'),image);assert.equal(image.getAttribute('src'),'/api/media/'+id+'/animation');assert.equal(f.posts().length,0);}finally{f.close();}});

test('showcase editor can be opened directly and empty/no-upload accounts stay usable',async()=>{const f=await fixture({}, {showcase:false});try{await f.module.edit({section:'showcase'});assert.equal(f.form.dataset.section,'showcase');assert.match(f.form.textContent,/Removing a showcase item keeps it in your inventory/);f.click('[data-vp-action="section"][data-section="images"]');assert.equal(f.form.querySelector('[data-vp-action="reset-avatar"]').hidden,true);assert.equal(f.form.querySelector('[type="submit"]').disabled,true);assert.equal(f.posts().length,0);}finally{f.close();}});

test('viewed earned badges retain the viewed account when opening exact issuance details',async()=>{const f=await fixture();try{f.bridge.closeDialog();const other={...f.server,id:'account-other',username:'other_person',displayName:'Other person',earnedBadges:[{badge_id:'profile-authored',name:'Profile Authored'}],badgeOrder:['profile-authored']};f.dialog.innerHTML=f.module.profileCard(other);const badge=f.dialog.querySelector('[data-vp-award]');assert.equal(badge.dataset.account,'account-other');badge.click();await settle();assert.equal(f.inspections.at(-1).id,'profile-authored');assert.equal(f.inspections.at(-1).opts.profileId,'account-other');assert.equal(f.posts().length,0);}finally{f.close();}});

test('a newer same-field saved value in an acknowledgment is reviewed instead of falsely clearing the draft',async()=>{const f=await fixture();try{f.input('[name="bio"]','My submitted biography');f.setPost(()=>({profile:{...f.server,bio:'A newer device saved this',revision:3}}));await f.save();assert.equal(f.form.elements.namedItem('bio').value,'My submitted biography');assert.equal(f.seam.summary().dirty,true);assert.equal(f.form.querySelector('[type="submit"]').disabled,true);assert.match(f.document.getElementById('vp-conflict').textContent,/A newer device saved this/);assert.ok(!f.announcements.includes('Profile saved.'));}finally{f.close();}});

test('Show on profile deep entry reviews the exact owned instance and requires a position before changing the draft',async()=>{const f=await fixture();try{f.input('[name="bio"]','Keep my existing edits');await f.module.edit({section:'showcase',instanceId:'instance-star'});await until(()=>f.document.querySelector('[data-ps-action="offer-position"]'));assert.equal(f.form.dataset.section,'showcase');assert.equal(f.form.elements.namedItem('bio').value,'Keep my existing edits');assert.match(f.document.querySelector('[data-ps-offer]').textContent,/Pocket Star/);assert.equal(f.seam.formValue(f.form).showcaseSlots.length,0);assert.equal(f.posts().length,0);f.click('[data-ps-action="offer-position"][data-slot="3"]');assert.deepEqual(clone(f.seam.formValue(f.form).showcaseSlots),[{slot:3,instanceId:'instance-star',showSender:false}]);assert.equal(f.posts().length,0);}finally{f.close();}});

test('reopening a clean editor adopts the newest saved baseline without inventing unsaved edits',async()=>{const f=await fixture();try{f.bridge.closeDialog();f.server={...f.server,bio:'A biography saved on another device',revision:4};await f.module.edit();assert.equal(f.form.elements.namedItem('bio').value,'A biography saved on another device');assert.equal(f.seam.summary().editor.profile.revision,4);assert.equal(f.seam.summary().dirty,false);assert.equal(f.form.querySelector('[type="submit"]').disabled,true);assert.equal(f.posts().length,0);}finally{f.close();}});

test('gift inspection receives the exact displayed instance and viewed profile without publishing',async()=>{const f=await fixture();try{f.bridge.closeDialog();f.dialog.innerHTML=f.module.profileCard({...f.server,id:'account-other',username:'other_person',showcase:[{slot:1,instance_id:'other-owned-instance',catalog_id:'gift-rose',name:'Their Rose'}]});f.dialog.querySelector('[data-vp-action="inspect-gift"]').click();await settle();const inspected=f.inspections.at(-1);assert.equal(inspected.id,'gift-rose');assert.equal(inspected.opts.instanceId,'other-owned-instance');assert.equal(inspected.opts.profileId,'account-other');assert.equal(f.posts().length,0);}finally{f.close();}});

test('owner-only sender metadata does not appear on the published card when disclosure is off',async()=>{const f=await fixture();try{const p={...f.server,showcase:[{slot:1,instance_id:'instance-rose',catalog_id:'gift-rose',name:'Chrome Rose',show_sender:0,sender_username:'private_origin'}]};assert.doesNotMatch(f.module.profileCard(p),/From @private_origin/);p.showcase[0].show_sender=1;assert.match(f.module.profileCard(p),/From @private_origin/);assert.equal(f.posts().length,0);}finally{f.close();}});

test('studio styles provide mobile edit/preview layout, true banner framing and viewer style overrides',()=>{const css=fs.readFileSync(path.join(__dirname,'../dist/profiles-panel.css'),'utf8');assert.match(css,/max-width:760px/);assert.match(css,/data-mobile-pane=preview[^}]*vp-edit-pane/);assert.match(css,/aspect-ratio:3\/1/);assert.match(css,/data-vh-simple-profiles=true/);assert.match(css,/vh-high-contrast/);assert.doesNotMatch(css,/vp-studio[^}]*animation\s*:/);});

test('custom accent picker previews arbitrary hex, scopes the save and reloads the saved value',async()=>{
 const f=await fixture();
 try{
  f.input('#vp-accent-picker','#019abe');
  const card=f.preview.querySelector('.vp-card');
  assert.equal(card.dataset.accent,'#019abe');
  assert.equal(card.querySelector('.vp-custom-stripe rect').getAttribute('fill'),'#019abe');
  assert.equal(card.querySelector('.vp-custom-outline rect').getAttribute('stroke'),'#019abe');
  assert.equal(f.form.querySelector('#vp-accent-code').textContent,'#019ABE');
  assert.equal(f.form.querySelectorAll('[data-field="accent"][aria-pressed="true"]').length,0);
  assert.equal(f.posts().length,0);
  await f.save();
  assert.deepEqual(f.posts()[0].body,{baseValues:{accent:'ice'},expectedRevision:1,accent:'#019abe'});
  await f.module.edit();
  assert.equal(f.form.querySelector('#vp-accent-picker').value,'#019abe');
  f.click('[data-field="accent"][data-value="jade"]');
  assert.equal(f.preview.querySelector('.vp-card').dataset.accent,'jade');
  assert.equal(f.form.querySelector('#vp-accent-picker').value,'#a5c6b1');
 }finally{f.close();}
});
test('saved looks apply custom color only to the draft and private audiences omit the custom accent',async()=>{
 const f=await fixture({detailsVisibility:'private',collectionVisibility:'private',bio:'Keep me'});
 try{
  f.looks[0].apply({avatar:'ghost',banner:'eclipse',accent:'#Ff0099',nameStyle:'serif',profileFrame:'line'});
  assert.equal(f.looks[0].read().accent,'#ff0099');
  assert.equal(f.form.querySelector('[name="bio"]').value,'Keep me');
  assert.equal(f.posts().length,0);
  f.input('#vp-preview-audience','friend','change');
  assert.equal(f.preview.querySelector('.vp-card').dataset.accent,'ice');
  assert.doesNotMatch(f.preview.innerHTML,/#ff0099/i);
  const hostile=f.module.profileCard({...f.server,accent:'red" onmouseover="evil()'});
  assert.doesNotMatch(hostile,/\s(?:onmouseover|style)="/i);
  assert.match(hostile,/data-accent="ice"/);
 }finally{f.close();}
});

(async()=>{let failures=0;for(const[name,run]of cases)try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}console.log(`${cases.length-failures}/${cases.length} profile studio checks passed. Shipped modules, jsdom events and controlled transport; browser layout, decoding, device performance and live multi-account acceptance remain separate.`);process.exitCode=failures?1:0;})();
