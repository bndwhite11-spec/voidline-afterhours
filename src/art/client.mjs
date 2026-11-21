/** Public illustration renderer and choreography. It has no account APIs. */
export function installArt(catalog,version=3){
 let serial=0;const cache=new Map(),active=new Map(),mounts=new Set(),generation=new WeakMap(),finalPoses=new WeakMap();
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const known=id=>Object.prototype.hasOwnProperty.call(catalog,id),item=id=>known(id)?catalog[id]:catalog.unknown||Object.values(catalog)[0];
 const reduced=()=>{try{return !!window.VoidTheme?.state?.().effectiveReducedMotion||document.documentElement.classList?.contains('vh-reduced-motion')||!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}catch{return false;}};
 const signalActive=(host,signal,g)=>!signal?.aborted&&host?.isConnected!==false&&(generation.get(host)||0)===g;
 function miniature(id){const a=item(id);if(!a)return '';const attrs=`class="vc-art vc-mini${a.type==='earned'?' vc-earned-art':''}" data-vc-object="${esc(a.id)}" data-vc-kind="${a.type==='earned'?'earned':a.type==='gift'?'gift':'decoration'}" data-vc-size="mini" data-art-version="${version}" aria-hidden="true"`;return a.sourceArt?`<img ${attrs} src="${esc(a.sourceArt.mini.path)}" alt="" width="24" height="24" loading="lazy" decoding="async" draggable="false">`:`<svg ${attrs} viewBox="0 0 24 24">${a.mini}</svg>`;}
 function render(id,mini=false){if(mini)return miniature(id);const a=item(id);if(!a)return '';return `<span class="vc-art va-asset${a.type==='earned'?' vc-earned-art':''}" data-vc-object="${esc(a.id)}" data-vc-kind="${a.type==='earned'?'earned':a.type==='gift'?'gift':'decoration'}" data-vc-size="card" data-vc-material="${esc(a.material)}" data-art-version="${version}" role="img" aria-label="${esc(a.alt)}"><img src="${a.cardURL}" alt="" width="256" height="256" loading="lazy" decoding="async" draggable="false"></span>`;}
 function detail(id){const a=item(id);if(!a)return '';return render(id).replace('data-vc-size="card"','data-vc-size="detail"').replace('loading="lazy"','loading="eager"');}
 async function trustedRaster(uri,a){
  const expected=a.sourceArt,match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(uri||'');
  if(!expected||!match||match[1]!==expected.mime||!Number.isInteger(expected.bytes)||expected.bytes<1||expected.bytes>150*1024||match[2].length!==4*Math.ceil(expected.bytes/3)||!/^([a-f0-9]{64})$/.test(expected.sha256||''))return false;
  try{const raw=atob(match[2]);if(raw.length!==expected.bytes)return false;const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')===expected.sha256;}catch{return false;}
 }
 async function cleanSVG(text,a){
  if(typeof DOMParser!=='function')return null;
  const doc=new DOMParser().parseFromString(text,'image/svg+xml'),svg=doc.documentElement;
  if(svg.localName!=='svg'||doc.querySelector('parsererror')||svg.getAttribute('data-vc-object')!==a.id)return null;
  const allowed=new Set(['svg','g','defs','linearGradient','radialGradient','stop','path','rect','circle','ellipse','line','polyline','polygon','clipPath','mask','title','desc','text','tspan','image','use','filter','feColorMatrix']);
  const ids=new Map(),imageIds=new Set(),uses=[],prefix='va-mounted-'+(++serial)+'-';let imageCount=0;
  for(const node of [svg,...svg.querySelectorAll('*')]){
   if(!allowed.has(node.localName))return null;
   if(node.localName==='image'&&++imageCount>1)return null;
   for(const attr of [...node.attributes]){
    if(/^on/i.test(attr.name)||/^src$/i.test(attr.name)||/url\(\s*[^#]/i.test(attr.value))return null;
    if(/^(?:href|xlink:href)$/i.test(attr.name)){
     if(attr.name!=='href')return null;
     if(node.localName==='image'){if(!await trustedRaster(attr.value,a))return null;}
     else if(node.localName==='use'&&/^#[a-zA-Z][\w:.-]*$/.test(attr.value))uses.push(attr.value.slice(1));
     else return null;
    }
   }
   const id=node.getAttribute('id');if(id){if(!/^[a-zA-Z][\w:.-]*$/.test(id)||ids.has(id))return null;ids.set(id,prefix+id);}
   if(node.localName==='image'){if(!node.getAttribute('href'))return null;if(id)imageIds.add(id);}
  }
  if(a.sourceArt&&imageCount!==1||uses.some(id=>!imageIds.has(id)))return null;
  for(const node of [svg,...svg.querySelectorAll('*')])for(const attr of [...node.attributes]){
   let value=attr.value;if(attr.name==='id')value=ids.get(value);else{for(const [old,next]of ids)value=value.replaceAll('url(#'+old+')','url(#'+next+')');if(attr.name==='href'&&value.startsWith('#'))value='#'+ids.get(value.slice(1));if(attr.name==='aria-labelledby')value=value.split(/\s+/).map(id=>ids.get(id)||id).join(' ');}
   if(value!==attr.value)node.setAttribute(attr.name,value);
  }
  svg.setAttribute('aria-hidden','true');svg.removeAttribute('role');svg.removeAttribute('aria-labelledby');svg.classList.add('va-scene');svg.dataset.artObject=a.id;return document.importNode?document.importNode(svg,true):svg;
 }
 // Only verified, same-origin public artwork is cached. A rejected response
 // is evicted so a later retry can fetch the corrected asset.
 class AssetError extends Error {}
 function source(a,pending){
  let entry=cache.get(a.id);
  if(!entry){
   const controller=new AbortController();
   entry={controller,readers:0,settled:false,text:null};
   entry.text=fetch(a.detailURL,{credentials:'omit',cache:'force-cache',redirect:'error',signal:controller.signal}).then(async response=>{
    if(!response.ok)throw new AssetError('asset-unavailable');
    const mime=response.headers?.get?.('content-type')?.split(';')[0];
    if(mime&&mime!=='image/svg+xml')throw new AssetError('validation-rejected');
    const text=await response.text();
    const limit=Number.isInteger(a.detailBytes)&&a.detailBytes>0?Math.min(a.detailBytes,400000):70000;
    if(text.length>limit)throw new AssetError('validation-rejected');
    return text;
   }).catch(error=>{if(cache.get(a.id)===entry)cache.delete(a.id);throw error;}).finally(()=>{entry.settled=true;});
   cache.set(a.id,entry);
  }
  entry.readers++;
  pending.release=()=>{
   entry.readers--;
   if(!entry.readers&&!entry.settled){
    if(cache.get(a.id)===entry)cache.delete(a.id);
    entry.controller.abort();
   }
  };
  return entry.text;
 }
 async function prepare(container,id,options={}){
  const a=known(id)?catalog[id]:null;
  if(!a||!container)return {reason:'asset-unavailable'};
  const host=container.matches?.('.va-asset')?container:container.querySelector?.('.va-asset[data-vc-object="'+id+'"]')||container;
  if(host===container&&!container.matches?.('.va-asset')&&container.querySelector?.('.va-asset[data-vc-object]'))return {reason:'cancelled'};
  const g=generation.get(container)||0,first=host.firstChild??host.firstElementChild??null;
  const current=()=>signalActive(container,options.signal,g)&&host.isConnected!==false&&(host===container||!container.contains||container.contains(host))&&(!host.dataset?.vcObject||host.dataset.vcObject===id)&&(host.firstChild??host.firstElementChild??null)===first;
  if(!current())return {reason:'cancelled'};
  const existing=host.querySelector?.('svg.va-scene');
  if(existing?.dataset?.artObject===id)return {svg:existing};
  const pending={container,release:null,cancel};
  function release(){
   mounts.delete(pending);options.signal?.removeEventListener('abort',cancel);
   pending.release?.();pending.release=null;
  }
  function cancel(){if(host.dataset.vaState==='loading')host.dataset.vaState='poster';release();}
  mounts.add(pending);options.signal?.addEventListener('abort',cancel,{once:true});
  try{
   host.dataset.vaState='loading';
   // Used only by the public inspection tool's explicit loading tests.
   if(options.beforeLoad)await options.beforeLoad();
   if(!current())return {reason:'cancelled'};
   const text=await source(a,pending);
   if(!current())return {reason:'cancelled'};
   const svg=await cleanSVG(text,a);
   if(!current())return {reason:'cancelled'};
   if(!svg){cache.delete(id);throw new AssetError('validation-rejected');}
   host.replaceChildren(svg);host.dataset.vaMounted=id;host.dataset.vaState='ready';
   return {svg};
  }catch(error){
   if(!current())return {reason:'cancelled'};
   const reason=error instanceof AssetError?error.message:'asset-unavailable';
   host.dataset.vaState='failed';
   return {reason};
  }finally{release();}
 }
 async function mount(container,id,options){return (await prepare(container,id,options)).svg||null;}
 function stop(container){
  if(!container||typeof container!=='object')return;
  generation.set(container,(generation.get(container)||0)+1);
  for(const pending of mounts)if(pending.container===container)pending.cancel();
  const record=active.get(container);
  if(record)record.finish('stopped');
  finalPoses.get(container)?.();
  finalPoses.delete(container);
 }
 function stopAll(){
  for(const host of new Set([...active.keys(),...[...mounts].map(pending=>pending.container)]))stop(host);
  for(const host of document.querySelectorAll?.('[data-va-state="complete"]')||[])stop(host);
 }
 const value=(frame,key,otherwise)=>Number.isFinite(frame[key])?frame[key]:otherwise;
 function transform(frame){return `translate(${value(frame,'x',0)}px,${value(frame,'y',0)}px) rotate(${value(frame,'rotate',0)}deg) scale(${value(frame,'scaleX',1)},${value(frame,'scaleY',1)})`;}
 function applyFinalFrame(node,frame,origin){
  const original=node.getAttribute('transform'),opacity=node.getAttribute('opacity');
  const transformed=frame.x||frame.y||frame.rotate||value(frame,'scaleX',1)!==1||value(frame,'scaleY',1)!==1;
  if(transformed){
   const [x,y]=origin;
   node.setAttribute('transform',`translate(${x} ${y}) translate(${value(frame,'x',0)} ${value(frame,'y',0)}) rotate(${value(frame,'rotate',0)}) scale(${value(frame,'scaleX',1)} ${value(frame,'scaleY',1)}) translate(${-x} ${-y}) ${original||''}`);
  }
  if(Number.isFinite(frame.opacity))node.setAttribute('opacity',String(frame.opacity));
  if(!transformed&&!Number.isFinite(frame.opacity))return null;
  return ()=>{
   if(original===null)node.removeAttribute('transform');else node.setAttribute('transform',original);
   if(opacity===null)node.removeAttribute('opacity');else node.setAttribute('opacity',opacity);
  };
 }
 async function preview(container,id,options={}){
  const declined=reason=>({played:false,stop:()=>{},reason});
  if(!container||!known(id))return declined('asset-unavailable');
  stop(container);
  if(reduced())return declined('reduced-motion');
  if(document.hidden||options.signal?.aborted)return declined('cancelled');
  const a=catalog[id],g=generation.get(container)||0,{svg,reason}=await prepare(container,id,options);
  if(!svg)return declined(reason);
  if(reduced())return declined('reduced-motion');
  if(document.hidden||svg.isConnected===false||(container.contains&&!container.contains(svg))||!signalActive(container,options.signal,g))return declined('cancelled');
  const animations=[],layers=[];
  for(const layer of a.motion?.layers||[]){
   for(const node of svg.querySelectorAll('[data-part="'+layer.name+'"]')){
    if(typeof node.animate!=='function')continue;
    const origin=(layer.origin||[128,128]).map(x=>Number(x)||0);let base='',restOpacity=Number(node.getAttribute('opacity')??1);
    if(!Number.isFinite(restOpacity))restOpacity=1;
    try{const m=node.transform?.baseVal?.consolidate?.()?.matrix;if(m)base=` matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;}catch{}
    const frames=layer.frames.map(frame=>({offset:frame.at,easing:'ease-in-out',transform:`translate(${origin[0]}px,${origin[1]}px) ${transform(frame)} translate(${-origin[0]}px,${-origin[1]}px)`+base,transformOrigin:'0px 0px',transformBox:'view-box',opacity:value(frame,'opacity',restOpacity)}));
    try{
     const animation=node.animate(frames,{duration:a.motion.duration,easing:'linear',iterations:1,fill:'forwards'});
     animations.push(animation);layers.push({node,frame:layer.frames.at(-1),origin});
    }catch{}
   }
  }
  if(!animations.length)return declined('unsupported');
  let resolve;const finished=new Promise(done=>{resolve=done;});
  const record={observer:null,replacementObserver:null,finish};
  const owns=()=>active.get(container)===record;
  const stopOwn=()=>{if(owns())stop(container);};
  function finish(state){
   if(!owns())return;
   active.delete(container);
   record.observer?.disconnect();record.replacementObserver?.disconnect();
   options.signal?.removeEventListener('abort',stopOwn);
   container.classList.remove('va-playing');container.dataset.vaState=state;
   if(state==='complete'){
    const restore=layers.map(({node,frame,origin})=>applyFinalFrame(node,frame,origin)).filter(Boolean);
    if(restore.length)finalPoses.set(container,()=>{for(const reset of restore)reset();container.dataset.vaState='ready';});
   }
   for(const animation of animations)animation.cancel();
   resolve(state);
  }
  function seek(fraction){
   if(!owns()||!Number.isFinite(fraction))return;
   const time=a.motion.duration*Math.min(1,Math.max(0,fraction));
   for(const animation of animations){animation.pause();animation.currentTime=time;}
   container.classList.remove('va-playing');container.dataset.vaState='paused';
  }
  function pause(){
   if(!owns())return;
   for(const animation of animations)animation.pause();
   container.classList.remove('va-playing');container.dataset.vaState='paused';
  }
  function resume(){
   if(!owns())return;
   for(const animation of animations)animation.play();
   container.classList.add('va-playing');container.dataset.vaState='playing';
  }
  active.set(container,record);container.classList.add('va-playing');container.dataset.vaState='playing';
  if(typeof IntersectionObserver==='function'){
   record.observer=new IntersectionObserver(entries=>{if(entries.some(entry=>!entry.isIntersecting))stopOwn();},{threshold:0});
   record.observer.observe(container);
  }
  if(typeof MutationObserver==='function'){
   record.replacementObserver=new MutationObserver(()=>{if(container.isConnected===false||!container.contains(svg))stopOwn();});
   record.replacementObserver.observe(document.body||document.documentElement,{childList:true,subtree:true});
  }
  options.signal?.addEventListener('abort',stopOwn,{once:true});
  Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>finish('complete'));
  if(Number.isFinite(options.pausedAt))seek(options.pausedAt);
  const progress=()=>Math.min(1,Math.max(0,(Number(animations[0]?.currentTime)||0)/a.motion.duration));
  return {played:true,duration:a.motion.duration,finished,stop:stopOwn,pause,resume,seek,progress};
 }
 document.addEventListener?.('visibilitychange',()=>{if(document.hidden)stopAll();});
 window.addEventListener?.('voidline:theme',()=>{if(reduced())stopAll();});
 window.addEventListener?.('pagehide',stopAll);
 try{window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',event=>{if(event.matches)stopAll();});}catch{}
 window.VoidCollectibleArt=Object.freeze({render,earned:render,detail,mount,prepare,preview,stop,stopAll,version,items:()=>Object.values(catalog).map(({mini,motion,...metadata})=>({...metadata})),motion:id=>known(id)?catalog[id].motion:null});
}
