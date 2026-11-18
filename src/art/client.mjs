/** Public illustration renderer and choreography. It has no account APIs. */
export function installArt(catalog,version=3){
 let serial=0;const cache=new Map(),active=new Map(),mounts=new Set(),generation=new WeakMap();
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const known=id=>Object.prototype.hasOwnProperty.call(catalog,id),item=id=>known(id)?catalog[id]:catalog.unknown||Object.values(catalog)[0];
 const reduced=()=>{try{return !!window.VoidTheme?.state?.().effectiveReducedMotion||document.documentElement.classList?.contains('vh-reduced-motion')||!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}catch{return false;}};
 const signalActive=(host,signal,g)=>!signal?.aborted&&host?.isConnected!==false&&(generation.get(host)||0)===g;
 function miniature(id){const a=item(id);if(!a)return '';const attrs=`class="vc-art vc-mini${a.type==='earned'?' vc-earned-art':''}" data-vc-object="${esc(a.id)}" data-vc-kind="${a.type==='earned'?'earned':a.type==='gift'?'gift':'decoration'}" data-vc-size="mini" data-art-version="${version}" aria-hidden="true"`;return a.sourceArt?`<img ${attrs} src="${esc(a.sourceArt.mini.path)}" alt="" width="24" height="24" loading="lazy" decoding="async" draggable="false">`:`<svg ${attrs} viewBox="0 0 24 24">${a.mini}</svg>`;}
 function render(id,mini=false){if(mini)return miniature(id);const a=item(id);if(!a)return '';return `<span class="vc-art va-asset${a.type==='earned'?' vc-earned-art':''}" data-vc-object="${esc(a.id)}" data-vc-kind="${a.type==='earned'?'earned':a.type==='gift'?'gift':'decoration'}" data-vc-size="card" data-vc-material="${esc(a.material)}" data-art-version="${version}" role="img" aria-label="${esc(a.alt)}"><img src="${a.cardURL}" alt="" width="256" height="256" loading="lazy" decoding="async" draggable="false"></span>`;}
 function detail(id){const a=item(id);if(!a)return '';return render(id).replace('data-vc-size="card"','data-vc-size="detail"').replace(a.cardURL,a.detailURL).replace('loading="lazy"','loading="eager"');}
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
 async function source(a){
  if(!cache.has(a.id)){const pending=fetch(a.detailURL,{credentials:'omit',cache:'force-cache',redirect:'error'}).then(async response=>{if(!response.ok)throw Error('Illustration unavailable');const value=await response.text(),limit=Number.isInteger(a.detailBytes)&&a.detailBytes>0?Math.min(a.detailBytes,400000):70000;if(value.length>limit)throw Error('Illustration too large');return value;}).catch(error=>{cache.delete(a.id);throw error;});cache.set(a.id,pending);}
  return cache.get(a.id);
 }
 async function mount(container,id,{signal}={}){
  const a=known(id)?catalog[id]:null;if(!a||!container)return null;
  const direct=container.matches?.('.va-asset'),matched=direct?container:container.querySelector?.('.va-asset[data-vc-object="'+id+'"]');
  if(!matched&&container.querySelector?.('.va-asset[data-vc-object]'))return null;
  const host=matched||container,g=generation.get(container)||0,first=host.firstChild??host.firstElementChild??null;
  const currentHost=()=>signalActive(container,signal,g)&&host.isConnected!==false&&(host===container||typeof container.contains!=='function'||container.contains(host))&&(!host.dataset?.vcObject||host.dataset.vcObject===id)&&(host.firstChild??host.firstElementChild??null)===first;
  const existing=host.querySelector?.('svg.va-scene');if(existing?.dataset?.artObject===id&&currentHost())return existing;
  if(!currentHost())return null;
  const pendingMount={container};mounts.add(pendingMount);
  try{const text=await source(a);if(!currentHost())return null;const svg=await cleanSVG(text,a);if(!svg||!currentHost())return null;host.replaceChildren(svg);host.dataset.vaMounted=id;return svg;}catch{return null;}finally{mounts.delete(pendingMount);}
 }
 function stop(container){if(!container||typeof container!=='object')return;generation.set(container,(generation.get(container)||0)+1);const record=active.get(container);if(!record)return;active.delete(container);record.releaseAbort?.();for(const animation of record.animations)try{animation.cancel();}catch{}record.observer?.disconnect();record.replacementObserver?.disconnect();container.classList?.remove('va-playing');record.resolve?.();}
 function stopAll(){for(const host of new Set([...active.keys(),...[...mounts].map(pending=>pending.container)]))stop(host);}
 const value=(frame,key,otherwise)=>Number.isFinite(frame[key])?frame[key]:otherwise;
 function transform(frame){return `translate(${value(frame,'x',0)}px,${value(frame,'y',0)}px) rotate(${value(frame,'rotate',0)}deg) scale(${value(frame,'scaleX',1)},${value(frame,'scaleY',1)})`;}
 async function preview(container,id,options={}){
  stopAll();const a=known(id)?catalog[id]:null,g=generation.get(container)||0;
  if(!a||!container||reduced()||document.hidden||options.signal?.aborted)return {played:false,stop:()=>{},reason:reduced()?'reduced-motion':'unavailable'};
  const svg=await mount(container,id,options);
  if(!svg||svg.isConnected===false||typeof container.contains==='function'&&!container.contains(svg)||!signalActive(container,options.signal,g)||reduced()||document.hidden)return {played:false,stop:()=>{},reason:'unavailable'};
  const animations=[];let resolve;const finished=new Promise(done=>{resolve=done;});
  for(const layer of a.motion?.layers||[]){
   const nodes=svg.querySelectorAll('[data-part="'+layer.name+'"]');
   for(const node of nodes){if(typeof node.animate!=='function')continue;
    const origin=(layer.origin||[128,128]).map(x=>Number(x)||0);let base='',restOpacity=Number(node.getAttribute?.('opacity')??1);if(!Number.isFinite(restOpacity))restOpacity=1;
    try{const m=node.transform?.baseVal?.consolidate?.()?.matrix;if(m)base=` matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;}catch{}
    const frames=layer.frames.map(frame=>({offset:frame.at,easing:'ease-in-out',transform:`translate(${origin[0]}px,${origin[1]}px) ${transform(frame)} translate(${-origin[0]}px,${-origin[1]}px)`+base,transformOrigin:'0px 0px',transformBox:'view-box',opacity:value(frame,'opacity',restOpacity)}));
    try{animations.push(node.animate(frames,{duration:a.motion.duration,easing:'linear',iterations:1,fill:'forwards'}));}catch{}
   }
  }
  if(!animations.length)return {played:false,stop:()=>{},reason:'unsupported'};
  const record={animations,resolve,observer:null,replacementObserver:null,releaseAbort:null};const stopOwn=()=>{if(active.get(container)===record)stop(container);};active.set(container,record);container.classList?.add('va-playing');
  if(typeof IntersectionObserver==='function'){record.observer=new IntersectionObserver(entries=>{if(entries.some(entry=>!entry.isIntersecting))stopOwn();},{threshold:0});record.observer.observe(container);}
  if(typeof MutationObserver==='function'){record.replacementObserver=new MutationObserver(()=>{if(container.isConnected===false||!container.contains?.(svg))stopOwn();});record.replacementObserver.observe(document.body||document.documentElement,{childList:true,subtree:true});}
  if(options.signal){options.signal.addEventListener('abort',stopOwn,{once:true});record.releaseAbort=()=>{options.signal.removeEventListener('abort',stopOwn);record.releaseAbort=null;};}
  Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>{if(active.get(container)===record){record.settled=true;container.classList?.remove('va-playing');}resolve();});
  return {played:true,duration:a.motion.duration,finished,stop:stopOwn};
 }
 document.addEventListener?.('visibilitychange',()=>{if(document.hidden)stopAll();});
 window.addEventListener?.('voidline:theme',()=>{if(reduced())stopAll();});
 window.addEventListener?.('pagehide',stopAll);
 try{window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',event=>{if(event.matches)stopAll();});}catch{}
 window.VoidCollectibleArt=Object.freeze({render,earned:render,detail,mount,preview,stop,stopAll,version,items:()=>Object.values(catalog).map(({mini,motion,...metadata})=>({...metadata})),motion:id=>known(id)?catalog[id].motion:null});
}
