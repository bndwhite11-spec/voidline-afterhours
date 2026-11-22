(() => {
 'use strict';
 const art=window.VoidCollectibleArt;
 const $=id=>document.getElementById(id);
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=(art?.items?.()||[]).sort((a,b)=>Number(!!b.familyId)-Number(!!a.familyId)), dialog=$('ar-dialog'),stage=$('ar-stage'),grid=$('ar-grid');
 const types={gift:'Gift',badge:'Name decoration',earned:'Earned badge'};
 let selected=null,origin=null,operation=null,player=null,mode='poster',frameValue=null;
 const systemMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const motionOff=()=>$('ar-reduce').checked||!!systemMotion?.matches;
 const count=(n,one,many=one+'s')=>n+' '+(n===1?one:many);
 if(!rows.length){$('ar-count').textContent='Collection unavailable';$('ar-error').textContent='The artwork catalog could not load. Reload this page to retry.';return;}

 // Keep the card elements and their decoded posters when a filter changes.
 grid.innerHTML=rows.map(a=>`<button class="ar-card" type="button" data-art-open="${escape(a.id)}">${art.render(a.id)}<strong>${escape(a.name)}</strong><small>${a.tier?escape(a.tier):types[a.type]} · ${escape(a.series)}</small></button>`).join('');
 const cards=new Map([...grid.children].map(card=>[card.dataset.artOpen,card]));
 function paintStage(element,model){
  if(!element)return;
  element.querySelector(':scope > .va-backdrop')?.remove();
  const field=model?.backdrop;
  if(!field){element.removeAttribute('data-model-field');return;}
  element.dataset.modelField=model.familyId;
  element.insertAdjacentHTML('afterbegin',art.backdrop?.(model.id)||'');
 }
 for(const model of rows)if(model.familyId)paintStage(cards.get(model.id).querySelector('.vc-art'),model);
 function filter(){
  const query=$('ar-search').value.trim().toLocaleLowerCase(),series=$('ar-series').value,type=$('ar-type').value,counts={badge:0,gift:0,earned:0};
  let total=0;
  for(const row of rows){
   const show=(series==='all'||row.series===series)&&(type==='all'||row.type===type)&&(!query||[row.name,row.series,row.material,row.alt].join(' ').toLocaleLowerCase().includes(query));
   cards.get(row.id).hidden=!show;
   if(show){total++;counts[row.type]++;}
  }
  const prefix=total===rows.length?count(total,'object'):total+' of '+rows.length+' objects';
  $('ar-count').textContent=prefix+' · '+[count(counts.badge,'decoration'),count(counts.gift,'gift'),count(counts.earned,'earned badge')].join(' · ');
  $('ar-empty').hidden=total>0;
 }
 function credits(a){
  const source=a.sourceArt||a.archivedSource;
  const original=a.assetKind==='layered-svg'?'Illustration and object motion drawn for VOIDLINE. Character references retain their respective authorship.':'';
  if(!source)return original;
  let link='';try{const u=new URL(source.sourceURL);if(u.protocol==='https:'&&!u.username&&!u.password)link=' · <a href="'+escape(u.href)+'" target="_blank" rel="noopener noreferrer">Source artwork</a>';}catch{}
  return (a.archivedSource?original+'<br>Site 32 archived artwork · ':'')+escape(source.creator)+' · '+escape(source.license)+link;
 }
 function cancel(){
  operation?.abort();operation=null;art.stop(stage);player=null;
 }
 function displayFrame(fraction){
  const percent=Math.round(fraction*100);
  $('ar-frame').value=String(percent);$('ar-frame-value').textContent=percent+'%';
 }
 function notify(state,message){
  mode=state;const off=motionOff(),loading=state==='loading',failed=state==='failed';
  $('ar-status').textContent=message;
  $('ar-play').textContent=failed?'Retry artwork':off?'Still artwork':state==='complete'||player?'Replay animation':'Play animation';
  $('ar-play').disabled=loading||(!failed&&off);
  $('ar-frame').disabled=loading||failed||off;
  $('ar-pause').hidden=!player||!['playing','paused'].includes(state);
  $('ar-pause').textContent=state==='paused'?'Resume':'Pause';
  stage.setAttribute('aria-busy',String(loading));
 }
 function failure(reason){
  if(reason==='cancelled'){notify('stopped','Loading paused. Select Play to retry.');return;}
  if(reason==='reduced-motion'){notify('ready','Reduced motion is on. The resting artwork is shown.');return;}
  if(reason==='unsupported'){notify('unsupported','This browser can display the still artwork. Animation is unavailable.');$('ar-play').disabled=true;$('ar-frame').disabled=true;return;}
  notify('failed',reason==='validation-rejected'?'The detail failed its artwork check. The poster is still available.':'The detail could not load. The poster is still available.');
 }
 function testDelay(signal){
  return new Promise((resolve,reject)=>{
   const done=()=>{signal.removeEventListener('abort',cancelDelay);resolve();};
   const timer=window.setTimeout(done,1000);
   function cancelDelay(){window.clearTimeout(timer);reject(new Error('cancelled'));}
   signal.addEventListener('abort',cancelDelay,{once:true});
  });
 }
 async function load(){
  cancel();const a=selected,controller=new AbortController();operation=controller;
  const test=$('ar-loading').value;
  stage.innerHTML=art.detail(a.id);
  frameValue=null;displayFrame(0);
  notify('loading','Loading detail…');
  const beforeLoad=test==='delayed'?()=>testDelay(controller.signal):test==='missing'?()=>{throw Error('simulated missing detail');}:undefined;
  const prepared=await art.prepare(stage,a.id,{signal:controller.signal,beforeLoad});
  if(operation!==controller||!dialog.open)return;
  if(!prepared.svg){failure(prepared.reason);return;}
  notify('ready',motionOff()?'Reduced motion is on. The resting artwork is shown.':'Resting artwork');
 }
 function open(id,button){
  const a=rows.find(row=>row.id===id);if(!a)return;
  selected=a;origin=button;$('ar-loading').value='normal';
  $('ar-title').textContent=a.name;$('ar-detail-series').textContent=(a.tier?a.tier+' · ':'')+types[a.type]+' · '+a.series;
  $('ar-alt').textContent=a.description||a.alt;$('ar-material').textContent=a.material;
  paintStage($('ar-plate'),a);
  $('ar-traits').textContent=a.familyId?a.backdrop.name+' · '+a.motif:'';
  $('ar-background').value=a.familyId?'model':'dark';$('ar-plate').dataset.surface=$('ar-background').value;$('ar-source').innerHTML=credits(a);
  $('ar-inline').innerHTML=[16,20,24].map(n=>'<span>'+art.render(id,true)+n+' px</span>').join('');
  $('ar-version').textContent=[a.edition,'Asset '+a.detailURL.split('/').pop()].filter(Boolean).join(' · ');
  $('ar-download').href=a.detailURL;$('ar-download').download=id+'.svg';
  if(!dialog.open)dialog.showModal();
  void load();
 }
 async function play(position=null){
  if(!selected||mode==='loading'||motionOff())return;
  cancel();const controller=new AbortController();operation=controller;
  frameValue=position;displayFrame(position||0);notify('loading','Preparing animation…');
  const result=await art.preview(stage,selected.id,{signal:controller.signal,pausedAt:position});
  if(operation!==controller||!dialog.open){result.stop?.();return;}
  if(!result.played){failure(result.reason);return;}
  player=result;
  if(frameValue!==null){player.seek(frameValue);notify('paused','Frame held for inspection.');}
  else notify('playing','Playing once');
  const outcome=await result.finished;
  if(operation!==controller||!dialog.open)return;
  player=null;displayFrame(outcome==='complete'?1:0);notify(outcome==='complete'?'complete':'stopped',outcome==='complete'?'Preview complete.':motionOff()?'Reduced motion is on. The resting artwork is shown.':'Playback stopped. The resting artwork is shown.');
 }
 function motionChanged(){
  if(systemMotion?.matches)$('ar-reduce').checked=true;
  $('ar-reduce').disabled=!!systemMotion?.matches;
  if(selected&&dialog.open)void load();
 }
 grid.addEventListener('click',event=>{const button=event.target.closest('[data-art-open]');if(button)open(button.dataset.artOpen,button);});
 $('ar-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
 dialog.addEventListener('close',()=>{cancel();selected=null;stage.replaceChildren();if(origin?.isConnected&&!origin.hidden)origin.focus({preventScroll:true});origin=null;});
 $('ar-play').addEventListener('click',()=>{if(mode==='failed'){$('ar-loading').value='normal';void load();}else void play();});
 $('ar-pause').addEventListener('click',()=>{if(!player)return;if(mode==='paused'){player.resume();notify('playing','Playing once');}else{player.pause();displayFrame(player.progress());notify('paused','Playback paused.');}});
 $('ar-frame').addEventListener('input',()=>{
  const fraction=Number($('ar-frame').value)/100;$('ar-frame-value').textContent=Math.round(100*fraction)+'%';
  if(player){player.seek(fraction);notify('paused','Frame held for inspection.');}
  else if(mode!=='loading')void play(fraction);
  else frameValue=fraction;
 });
 $('ar-background').addEventListener('change',()=>{$('ar-plate').dataset.surface=$('ar-background').value;});
 $('ar-loading').addEventListener('change',()=>{if(selected)void load();});
 $('ar-reduce').addEventListener('change',()=>{window.VoidTheme?.apply({reducedMotion:$('ar-reduce').checked});motionChanged();});
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&mode==='stopped'&&dialog.open)void load();
 });
 systemMotion?.addEventListener?.('change',()=>{$('ar-reduce').checked=!!window.VoidTheme?.state?.().reducedMotion||systemMotion.matches;motionChanged();});
 $('ar-reduce').checked=!!window.VoidTheme?.state?.().effectiveReducedMotion;motionChanged();
 for(const series of [...new Set(rows.map(a=>a.series))]){const option=document.createElement('option');option.value=series;option.textContent=series;$('ar-series').append(option);}
 $('ar-search').addEventListener('input',filter);$('ar-series').addEventListener('change',filter);$('ar-type').addEventListener('change',filter);
 const family=new URLSearchParams(window.location?.search||'').get('family'),initial=rows.find(row=>row.familyId===family);
 if(initial){$('ar-series').value=initial.series;$('ar-type').value='gift';}
 $('ar-credits').href='/art/v'+art.version+'/manifest.json';
 filter();
})();
