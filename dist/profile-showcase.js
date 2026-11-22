/* Draft-only profile showcase composition. Selection never claims or transfers an item. */
(() => {
 'use strict';
 let serial=0;
 const validID=value=>typeof value==='string'&&value.length>0&&value.length<=200&&!/[\u0000-\u001f\u007f]/.test(value);
 const normalize=value=>{
  const seen=new Set(),positions=new Set(),result=[];let featured=false;
  for(const entry of Array.isArray(value)?value:[]){
   const slot=Number(entry?.slot),id=entry?.instanceId??entry?.instance_id;
   if(!Number.isInteger(slot)||slot<1||slot>3||!validID(id)||seen.has(id)||positions.has(slot))continue;
   const disclosure=entry.showSender===undefined?entry.show_sender:entry.showSender;
   seen.add(id);positions.add(slot);const feature=!featured&&(entry.featured===true||entry.featured===1);featured=featured||feature;result.push({slot,instanceId:id,showSender:disclosure===true||disclosure===1,...(feature?{featured:true}:{})});
  }
  return result.sort((a,b)=>a.slot-b.slot);
 };
 const clone=value=>value.map(row=>({...row}));
 function create({bridge,profile={},draft={},onChange=()=>{},onInspect}={}){
  if(!bridge?.request||!bridge?.state)throw new TypeError('A signed-in profile editor is required.');
  const accountId=bridge.state.account?.id,sessionId=bridge.state.session?.id,guard=bridge.guard?.()||(()=>true),prefix='ps-'+(++serial),esc=bridge.esc;
  let root=null,disposed=false,busy=false,slots=normalize(draft.showcaseSlots??profile.showcaseSlots??profile.showcase),catalog=[],catalogLoaded=false,metadata=new Map(),pickerSlot=null,designFilter='',pageOffset=0,pageItems=[],pageTotal=0,hasMore=false,loading=false,loadSerial=0,detailSerial=0,loadTask=null,error='',notice='',detailInstance=null,offered=null,offerSerial=0;
  const alive=()=>!disposed&&!!accountId&&bridge.state.account?.id===accountId&&bridge.state.session?.id===sessionId&&guard()&&root?.isConnected!==false;
  const art=id=>validID(id)?window.VoidCosmetics?.art?.(id)||'':'';
  const itemFor=id=>catalog.find(row=>row.id===id);
  const rowFor=id=>metadata.get(id);
  const shortID=id=>'Instance '+(id.length>22?'…'+id.slice(-10):id);
  const titleFor=row=>row?.name||itemFor(row?.catalog_id)?.name||'Gift item';
  function seed(value){for(const row of value?.showcase||[]){const id=row.instance_id??row.instanceId;if(!validID(id))continue;metadata.set(id,{...metadata.get(id),...row,id,catalog_id:row.catalog_id??metadata.get(id)?.catalog_id});}}
  seed(profile);
  function value(){return clone(slots);}
  function project(){return slots.map(slot=>{const row=rowFor(slot.instanceId)||{};return {slot:slot.slot,instance_id:slot.instanceId,catalog_id:row.catalog_id||null,name:titleFor(row),show_sender:slot.showSender?1:0,...(slot.featured?{featured:true}:{}),...(slot.showSender&&row.sender_username?{sender_username:row.sender_username,sender_name:row.sender_name||row.sender_username}:{})};});}
  function commit(next,message,focus){
   if(!alive()||busy)return;
   slots=normalize(next);detailSerial++;error='';notice=message||'Showcase draft updated. Save profile to publish it.';detailInstance=null;renderSlots(focus);onChange(value());
  }
  const slotAt=number=>slots.find(row=>row.slot===number);
  function sourceCopy(row){return row?.origin_kind==='claim'?'Collected by you':row?.origin_kind==='legacy-claim'?'Preserved collection item':row?.origin_kind==='gift'?'Received gift':'Owned gift';}
  function senderAvailable(row){return !!row?.sender_username||row?.senderDisclosureAvailable===true;}
  function slotHTML(number){
   const slot=slotAt(number),row=slot?rowFor(slot.instanceId):null,name=slot?titleFor(row):'Empty slot';
   return `<li class="ps-slot ${slot?'is-filled':''}" data-ps-slot="${number}"><header><span>Position ${number}</span>${slot?`<button type="button" class="vh-text-button" data-ps-action="remove" data-slot="${number}" aria-label="Remove ${esc(name)} from position ${number}">Remove</button>`:''}</header><div class="ps-slot-main"><span class="ps-slot-art" aria-hidden="true">${slot&&row?.catalog_id?art(row.catalog_id):'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 8h14v12H5zM3 5h18v4H3zM12 5v15M12 5C4 6 6-3 12 5Zm0 0c8 1 6-8 0 0Z"/></svg>'}</span><div><h4>${esc(name)}</h4><p>${slot?esc(sourceCopy(row)):'Choose a gift you already own.'}</p>${slot?`<small class="ps-instance" title="Owned instance identifier">${esc(shortID(slot.instanceId))}</small>`:''}</div></div><div class="ps-slot-actions">${slot?`<button type="button" class="vh-secondary" data-ps-action="feature" data-slot="${number}" aria-pressed="${!!slot.featured}">${slot.featured?'Featured item':'Feature item'}</button>`: ''}<button type="button" class="vh-secondary" data-ps-action="choose" data-slot="${number}" aria-expanded="${pickerSlot===number}" aria-controls="${prefix}-picker">${slot?'Replace item':'Choose gift'}</button>${slot?`<button type="button" class="vh-secondary" data-ps-action="inspect" data-slot="${number}" ${row?.catalog_id?'':'disabled'}>Inspect item</button><div class="ps-reorder" role="group" aria-label="Move ${esc(name)}"><button type="button" class="vh-secondary" data-ps-action="move" data-slot="${number}" data-target="${number-1}" ${number===1?'disabled':''} aria-label="Move ${esc(name)} earlier">Earlier</button><button type="button" class="vh-secondary" data-ps-action="move" data-slot="${number}" data-target="${number+1}" ${number===3?'disabled':''} aria-label="Move ${esc(name)} later">Later</button></div>`:''}</div>${slot?`<label class="ps-disclosure"><input type="checkbox" data-ps-sender="${number}" ${slot.showSender?'checked':''} ${!senderAvailable(row)&&!slot.showSender?'disabled':''}><span>Show original gift sender${row?.sender_username?` <b>@${esc(row.sender_username)}</b>`:''}</span></label>${row?.pending_transfer_id?'<p class="ps-fine">Transfer pending. This item stays on the profile only while you still own it.</p>':''}<p class="ps-fine">${senderAvailable(row)?'Off keeps this attribution hidden on your profile. This never includes a private gift message.':'No permitted sender attribution is available for this item.'}</p>`:''}</li>`;
  }
  function renderSlots(focus){
   if(!root||disposed)return;
   const list=root.querySelector('[data-ps-slots]');if(list)list.innerHTML=[1,2,3].map(slotHTML).join('');
   const status=root.querySelector('[data-ps-status]'),failure=root.querySelector('[data-ps-error]');if(status)status.textContent=notice;if(failure)failure.textContent=error;
   const selected=root.querySelector('[data-ps-selected-count]');if(selected)selected.textContent=`${slots.length} of 3 positions filled`;
   if(busy)for(const node of root.querySelectorAll('[data-ps-slots] button,[data-ps-slots] input'))node.disabled=true;
   renderOffer();if(focus)root.querySelector(focus)?.focus?.({preventScroll:true});
  }
  function renderOffer(){
   const host=root?.querySelector('[data-ps-offer]');if(!host)return;host.hidden=!offered;if(!offered){host.replaceChildren();return;}
   host.innerHTML=`<header class="ps-picker-heading"><div><h4>Show ${esc(titleFor(offered))} on your profile</h4><p>Choose a position below. This only prepares your draft; Save profile publishes the change.</p></div><button type="button" class="vh-text-button" data-ps-action="cancel-offer">Cancel</button></header><div class="ps-offered-object"><span aria-hidden="true">${art(offered.catalog_id)}</span><div><b>${esc(titleFor(offered))}</b><p>${esc(sourceCopy(offered))}</p><small class="ps-instance" title="${esc(offered.id)}">${esc(shortID(offered.id))}</small></div></div><div class="ps-offer-positions">${[1,2,3].map(number=>{const current=slotAt(number),row=current?rowFor(current.instanceId):null;return `<button type="button" class="vh-secondary" data-ps-action="offer-position" data-slot="${number}" ${busy?'disabled':''}><b>Use position ${number}</b><span>${current?`Replace ${esc(titleFor(row))} · the replaced gift stays yours.`:'Empty position · no item will be replaced.'}</span></button>`;}).join('')}</div>`;
  }
  async function focusInstance(id){
   if(!alive()||!validID(id))return false;const ticket=++offerSerial;error='';notice='Loading the selected owned gift…';renderSlots();
   try{
    const response=await bridge.request('/api/cosmetics/instances/'+encodeURIComponent(id));if(!alive()||ticket!==offerSerial)return false;const row=response.instance;
    if(!row||row.id!==id||!validID(row.catalog_id))throw Error('This owned item is unavailable. Choose another gift.');metadata.set(id,{...metadata.get(id),...row});
    const existing=slots.find(slot=>slot.instanceId===id);if(existing){offered=null;notice=`${titleFor(row)} is already shown in position ${existing.slot}. Your draft is unchanged.`;renderSlots('[data-ps-slot="'+existing.slot+'"] [data-ps-action="choose"]');root.querySelector('[data-ps-slot="'+existing.slot+'"]')?.scrollIntoView?.({block:'nearest'});return true;}
    if(row.pending_transfer_id)throw Error('This gift has a pending transfer. Choose an unreserved owned instance.');
    offered={...row};pickerSlot=null;loadSerial++;loading=false;renderPicker();notice='Choose the exact profile position for this item.';renderSlots();const host=root.querySelector('[data-ps-offer]');host?.scrollIntoView?.({block:'nearest'});host?.querySelector('[data-ps-action="offer-position"]')?.focus?.({preventScroll:true});return true;
   }catch(reason){if(alive()&&ticket===offerSerial){error=reason.message||'The selected gift could not load. Your draft is unchanged.';notice='';renderSlots();}return false;}
  }
  function pickerHTML(){
   const selected=slotAt(pickerSlot),row=selected?rowFor(selected.instanceId):null;
   return `<header class="ps-picker-heading"><div><h4>${selected?`Replace ${esc(titleFor(row))}`:'Choose an owned gift'}</h4><p>${selected?`The item in position ${pickerSlot} stays yours when replaced.`:`The selected instance will appear in position ${pickerSlot}.`}</p></div><button type="button" class="vh-text-button" data-ps-action="close-picker">Close picker</button></header><label class="vh-field">Gift design<select data-ps-filter><option value="">All owned gift designs</option>${catalog.filter(row=>row.type==='gift').map(row=>`<option value="${esc(row.id)}" ${designFilter===row.id?'selected':''}>${esc(row.name)}</option>`).join('')}</select></label><div data-ps-results aria-busy="${loading}"></div><p class="ps-fine">Only owned instances are offered. Choosing one changes this draft, not ownership.</p>`;
  }
  function renderPicker(){
   const host=root?.querySelector('[data-ps-picker]');if(!host)return;
   host.hidden=pickerSlot===null;if(pickerSlot===null){host.replaceChildren();return;}
   const restore=host.contains(document.activeElement);host.innerHTML=pickerHTML();renderResults();if(restore)host.querySelector('[data-ps-filter]')?.focus?.({preventScroll:true});
  }
  function renderResults(){
   const results=root?.querySelector('[data-ps-results]');if(!results)return;results.setAttribute('aria-busy',String(loading));
   if(loading){results.innerHTML='<p class="ps-picker-state" role="status">Loading owned gifts…</p>';return;}
   if(error){results.innerHTML='<p class="ps-picker-state">Owned gifts could not load. Your showcase draft is unchanged.</p><button type="button" class="vh-secondary" data-ps-action="retry">Retry this page</button>';return;}
   const already=new Map(slots.map(row=>[row.instanceId,row.slot]));
   results.innerHTML=pageItems.length?`<p class="ps-picker-count">${pageOffset+1}–${Math.min(pageOffset+pageItems.length,pageTotal)} of ${pageTotal} owned ${designFilter?'instances in this design':'gift instances'}</p><div class="ps-picker-grid">${pageItems.map(row=>{const position=already.get(row.id),current=position===pickerSlot,unavailable=!!row.pending_transfer_id&&!current,elsewhere=position&&position!==pickerSlot;return `<button type="button" class="ps-pick-item" data-ps-action="pick" data-instance="${esc(row.id)}" ${unavailable||elsewhere||busy?'disabled':''} aria-pressed="${current}"><span aria-hidden="true">${art(row.catalog_id)}</span><b>${esc(titleFor(row))}</b><small>${unavailable?'Transfer pending':elsewhere?`Already in position ${position}`:current?'Currently selected':esc(sourceCopy(row))}</small><small class="ps-instance" title="Owned instance identifier">${esc(shortID(row.id))}</small></button>`;}).join('')}</div><div class="ps-pages"><button type="button" class="vh-secondary" data-ps-action="previous" ${pageOffset?'':'disabled'}>Previous</button><button type="button" class="vh-secondary" data-ps-action="next" ${hasMore?'':'disabled'}>Next</button></div>`:'<div class="ps-empty"><h4>No owned gifts in this view</h4><p>Collect a gift first, or choose another design. Opening the picker never adds items to your account.</p></div>';
  }
  async function loadPage(offset=0,focus=false){
   if(!alive()||pickerSlot===null)return;
   const ticket=++loadSerial,filter=designFilter;pageOffset=Math.max(0,offset);loading=true;error='';renderSlots();renderResults();
   try{
    const data=await bridge.request('/api/cosmetics/instances?offset='+pageOffset+(filter?'&catalogId='+encodeURIComponent(filter):''));
    if(!alive()||ticket!==loadSerial||filter!==designFilter||pickerSlot===null)return;
    if(!Array.isArray(data.instances)||data.instances.length>30||!Number.isSafeInteger(data.total)||data.total<0||!data.page||typeof data.page.hasMore!=='boolean')throw Error('Owned gift information could not be verified. Retry this page.');
    pageItems=data.instances.filter(row=>validID(row?.id)&&validID(row?.catalog_id)).map(row=>({...row}));for(const row of pageItems)metadata.set(row.id,{...metadata.get(row.id),...row});pageTotal=data.total;hasMore=data.page.hasMore;loading=false;renderSlots();renderResults();if(focus)focusResults();
   }catch(reason){if(!alive()||ticket!==loadSerial)return;loading=false;error=reason.message||'Owned gifts could not load. Retry this page.';renderSlots();renderResults();if(focus)focusResults();}
  }
  function focusResults(){const results=root?.querySelector('[data-ps-results]');if(!results)return;const target=results.querySelector('button:not(:disabled)')||results;if(target===results)results.tabIndex=-1;target.focus?.({preventScroll:true});}
  async function loadCatalog(){
   if(catalogLoaded||loadTask)return loadTask;
   const task=(async()=>{try{const response=await bridge.request('/api/cosmetics/catalog');if(!alive())return;catalog=(response.items||[]).filter(row=>validID(row?.id)&&row.type==='gift');catalogLoaded=true;if(pickerSlot!==null)renderPicker();}catch(reason){if(alive()){notice='Gift design filters could not load. Your owned instances are still available below.';renderSlots();}}})();loadTask=task;try{await task;}finally{if(loadTask===task)loadTask=null;}
  }
  function choose(number){if(!alive()||busy||![1,2,3].includes(number))return;offered=null;offerSerial++;renderOffer();pickerSlot=number;detailInstance=null;pageOffset=0;renderSlots();renderPicker();loadCatalog();loadPage();root.querySelector('[data-ps-picker]')?.scrollIntoView?.({block:'nearest'});root.querySelector('[data-ps-filter]')?.focus?.({preventScroll:true});}
  function closePicker(){const number=pickerSlot;pickerSlot=null;loadSerial++;loading=false;renderPicker();renderSlots(number?'[data-ps-slot="'+number+'"] [data-ps-action="choose"]':undefined);}
  async function inspect(number){
   const selected=slotAt(number),known=selected?rowFor(selected.instanceId):null;if(!known?.catalog_id)return;const ticket=++detailSerial;
   try{
    const result=await bridge.request('/api/cosmetics/instances/'+encodeURIComponent(selected.instanceId));
    if(!alive()||ticket!==detailSerial||slotAt(number)?.instanceId!==selected.instanceId)return;
    const row=result.instance;if(!row||row.id!==selected.instanceId||row.catalog_id!==known.catalog_id)throw Error('This owned item could not be verified. Reopen the picker to refresh it.');
    metadata.set(row.id,{...known,...row});
    if(typeof onInspect==='function'){await onInspect({catalogId:row.catalog_id,instanceId:row.id,instance:{...row}});return;}
    detailInstance=row.id;const host=root.querySelector('[data-ps-details]'),item=itemFor(row.catalog_id);if(!host)return;host.hidden=false;host.innerHTML=`<header><h4>${esc(titleFor(row))}</h4><button type="button" class="vh-text-button" data-ps-action="close-detail">Close details</button></header><div class="ps-detail-art">${art(row.catalog_id)}</div><p>${esc(item?.description||'An owned decorative gift instance.')}</p><dl><div><dt>Ownership</dt><dd>Owned by you</dd></div><div><dt>Source</dt><dd>${esc(sourceCopy(row))}</dd></div><div><dt>Instance reference</dt><dd>${esc(detailInstance)}</dd></div>${row.sender_username?`<div><dt>Original gift sender</dt><dd>@${esc(row.sender_username)}</dd></div>`:''}</dl><p class="ps-fine">Viewing this object changes neither ownership nor the profile draft.</p>`;host.scrollIntoView?.({block:'nearest'});
   }catch(reason){if(alive()&&ticket===detailSerial){error=reason.message||'This owned item is unavailable. Your draft is unchanged.';renderSlots();}}
  }
  function click(event){const button=event.target.closest?.('[data-ps-action]');if(!button||!root.contains(button))return;event.preventDefault();if(!alive()||busy||button.disabled)return;const number=Number(button.dataset.slot),action=button.dataset.psAction;
   if(action==='offer-position'){
    if(!offered||![1,2,3].includes(number))return;const row=offered,existing=slots.find(slot=>slot.instanceId===row.id);if(existing){offered=null;notice=`This instance is already shown in position ${existing.slot}.`;renderSlots();return;}
    const previous=slotAt(number);offered=null;commit([...slots.filter(slot=>slot.slot!==number),{slot:number,instanceId:row.id,showSender:false}],previous?`Replaced ${titleFor(rowFor(previous.instanceId))} with ${titleFor(row)} in this draft. Both items stay yours.`:'Gift added to the showcase draft. Save profile to publish it.','[data-ps-slot="'+number+'"] [data-ps-action="choose"]');
   }else if(action==='cancel-offer'){offered=null;offerSerial++;notice='Selected gift placement cancelled. Your draft is unchanged.';renderSlots();}
   else if(action==='feature'){
    const selected=slotAt(number);if(!selected)return;const enable=!selected.featured;
    const next=slots.map(({featured,...slot})=>slot.slot===number&&enable?{...slot,featured:true}:slot);
    commit(next,enable?'Featured gift selected. Save profile to publish it.':'Featured gift cleared. Save profile to publish it.','[data-ps-slot="'+number+'"] [data-ps-action="feature"]');
   }else if(action==='choose')choose(number);
   else if(action==='remove'){commit(slots.filter(row=>row.slot!==number),'Removed from the showcase draft. You still own this gift.','[data-ps-slot="'+number+'"] [data-ps-action="choose"]');if(pickerSlot===number)closePicker();}
   else if(action==='move'){const target=Number(button.dataset.target);if(![1,2,3].includes(target))return;if(pickerSlot!==null){pickerSlot=null;loadSerial++;loading=false;renderPicker();}commit(slots.map(row=>({...row,slot:row.slot===number?target:row.slot===target?number:row.slot})),'Showcase order updated. Save profile to publish it.','[data-ps-slot="'+target+'"] [data-ps-action="move"]:not(:disabled)');renderResults();}
   else if(action==='pick'){const row=rowFor(button.dataset.instance);if(!row||row.pending_transfer_id&&slotAt(pickerSlot)?.instanceId!==row.id||slots.some(slot=>slot.instanceId===row.id&&slot.slot!==pickerSlot))return;const previous=slotAt(pickerSlot),preserve=previous?.instanceId===row.id?previous.showSender:false;commit([...slots.filter(slot=>slot.slot!==pickerSlot),{slot:pickerSlot,instanceId:row.id,showSender:preserve}],previous?`Replaced ${titleFor(rowFor(previous.instanceId))} with ${titleFor(row)} in this draft. Both items stay yours.`:'Gift added to the showcase draft. Save profile to publish it.');closePicker();}
   else if(action==='close-picker')closePicker();else if(action==='next'&&hasMore)loadPage(pageOffset+30,true);else if(action==='previous')loadPage(Math.max(0,pageOffset-30),true);else if(action==='retry')loadPage(pageOffset,true);else if(action==='inspect')inspect(number);else if(action==='close-detail'){detailInstance=null;const node=root.querySelector('[data-ps-details]');if(node){node.hidden=true;node.replaceChildren();}}
  }
  function change(event){if(!alive()||busy)return;const input=event.target;if(input.matches?.('[data-ps-filter]')){designFilter=catalog.some(row=>row.id===input.value)?input.value:'';loadPage(0);return;}if(input.matches?.('[data-ps-sender]')){const number=Number(input.dataset.psSender),selected=slotAt(number),row=selected?rowFor(selected.instanceId):null;if(!selected||input.checked&&!senderAvailable(row))return;commit(slots.map(slot=>slot.slot===number?{...slot,showSender:input.checked}:slot),'Sender disclosure updated for this draft. Save profile to publish it.','[data-ps-sender="'+number+'"]');}}
  function mount(container){if(disposed)throw Error('The showcase editor was disposed.');if(root&&root!==container){root.removeEventListener('click',click);root.removeEventListener('change',change);}root=container;if(!root)return;root.classList.add('ps-editor');root.innerHTML=`<header class="ps-heading"><div><h3>Gift showcase</h3><p>Arrange up to three owned objects. Removing an object here keeps it in your inventory.</p></div><span data-ps-selected-count></span></header><ol class="ps-slots" data-ps-slots aria-label="Profile gift positions"></ol><section class="ps-picker ps-offer" data-ps-offer hidden aria-label="Place the selected gift on your profile"></section><p class="ps-status" data-ps-status role="status"></p><p class="ps-error" data-ps-error role="alert"></p><section id="${prefix}-picker" class="ps-picker" data-ps-picker hidden aria-label="Choose an owned gift"></section><section class="ps-details" data-ps-details hidden aria-label="Gift instance details"></section>`;root.addEventListener('click',click);root.addEventListener('change',change);renderSlots();return api;}
  function update(next={}){if(disposed)return;let changed=false;if(next.profile){profile=next.profile;seed(profile);changed=true;}if(next.draft){const following=normalize(next.draft.showcaseSlots??slots);if(JSON.stringify(following)!==JSON.stringify(slots)){slots=following;changed=true;}}if(typeof next.busy==='boolean'&&next.busy!==busy){busy=next.busy;changed=true;}if(changed){renderSlots();if(pickerSlot!==null)renderResults();}}
  function dispose(){disposed=true;loadSerial++;detailSerial++;offerSerial++;offered=null;loadTask=null;if(root){root.removeEventListener('click',click);root.removeEventListener('change',change);}root=null;metadata.clear();catalog=[];pageItems=[];}
  const api=Object.freeze({mount,value,project,update,focusInstance,dispose});return api;
 }
 window.VoidProfileShowcase=Object.freeze({create,normalize});
})();
