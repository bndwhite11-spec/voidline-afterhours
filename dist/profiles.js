(() => {
  'use strict';
  let api, draft, originalDraft, dirty=false, editGeneration=0, closeIntent='view';
  const themes={midnight:{name:'Midnight',note:'Blue steel / low light'},obsidian:{name:'Obsidian',note:'Black chrome / silver'},velvet:{name:'Velvet',note:'Charcoal / muted violet'}};
  const clientAccents={steel:{name:'Steel',color:'#a5b2d4'},silver:{name:'Silver',color:'#bec5d3'},iris:{name:'Iris',color:'#b8add1'},sage:{name:'Sage',color:'#a9c5bd'}};
  const banners=['orbital','grid','aurora'],frames=['none','chrome','orbit'],statuses=['online','idle','busy','offline'];
  const names={larp:'LARP Pro Max',founder:'The Original Signal',night:'3:33 AM',angel:'404 Angel',ghost:'Ghost Frequency',dead:'Dead Internet',voidwalker:'Voidwalker',velvet:'Velvet Static',unknown:'Unknown Entity'};
  const fallbackEscape=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const esc=value=>(api?.esc||fallbackEscape)(value);
  const hex=(value,fallback='#a5b2d4')=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  const graphemes=value=>segmenter?Array.from(segmenter.segment(String(value)),part=>part.segment):Array.from(String(value));
  const limit=(value,count)=>graphemes(value).slice(0,count).join('');
  const text=(value,count,fallback='')=>typeof value==='string'?limit(value.trim(),count):fallback;
  const pick=(value,options,fallback)=>options.includes(value)?value:fallback;
  const pos=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Number(value))):50;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const systemReduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const human=value=>String(value).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  function signature(bytes,type){
    if(type==='png')return bytes.length>8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
    if(type==='jpeg')return bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    return type==='webp'&&bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  }
  function validateAvatarImage(value){
    if(typeof value!=='string'||value.length>700000)return '';
    const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if(!match||match[2].length%4!==0||match[2].length/4*3-(match[2].endsWith('==')?2:match[2].endsWith('=')?1:0)>512*1024)return '';
    try{const decoded=atob(match[2].slice(0,32));return signature(Uint8Array.from(decoded,c=>c.charCodeAt(0)),match[1])?value:'';}catch(_){return '';}
  }
  function clean(p={}){
    if(!p||typeof p!=='object')p={};
    return {name:text(p.name,24,'you')||'you',avatar:text(p.avatar,3,'Y')||'Y',avatarImage:validateAvatarImage(p.avatarImage),avatarX:pos(p.avatarX??50),avatarY:pos(p.avatarY??50),bio:text(p.bio,240),status:pick(p.status,statuses,'online'),statusText:text(p.statusText,60,'In my own orbit'),accent:hex(p.accent),theme:pick(p.theme,Object.keys(themes),'midnight'),banner:pick(p.banner,banners,'orbital'),frame:pick(p.frame,frames,'chrome'),layout:pick(p.layout,['classic','editorial'],'classic'),animated:typeof p.animated==='boolean'?p.animated:true,featuredBadges:Array.isArray(p.featuredBadges)?[...new Set(p.featuredBadges.filter(id=>typeof id==='string'&&/^[a-z0-9-]{1,40}$/.test(id)))].slice(0,3):[]};
  }
  function normalize(){
    if(!api.state.profile||typeof api.state.profile!=='object')api.state.profile={};
    Object.assign(api.state.profile,clean(api.state.profile));
    const s=api.state.settings&&typeof api.state.settings==='object'?api.state.settings:{};
    api.state.settings={...s,theme:pick(s.theme,Object.keys(themes),api.state.profile.theme),clientAccent:pick(s.clientAccent,Object.keys(clientAccents),'steel'),compact:!!s.compact,motion:typeof s.motion==='boolean'?s.motion:!systemReduced(),memberSidebar:s.memberSidebar!==false};
  }
  function applyAppearance(){
    if(!api)return;normalize();const s=api.state.settings;
    document.documentElement.dataset.theme=s.theme;
    document.documentElement.style.setProperty('--accent',clientAccents[s.clientAccent].color);
    document.body.classList.toggle('density-compact',s.compact);document.body.classList.toggle('compact',s.compact);
    document.body.classList.toggle('reduce-motion',!s.motion||systemReduced());document.body.classList.toggle('members-hidden',!s.memberSidebar);
    document.body.dataset.density=s.compact?'compact':'comfortable';
    window.VoidMotion?.setEnabled?.(s.motion);
  }
  function safePerson(id){
    if(id==='self')return {...api.state.profile};
    const raw=api.person?.(id);if(!raw)return null;
    const palettes={nova:'#b7b0d6',ghost:'#93b5b2',pixel:'#c2a7bc',orbit:'#9caed0',moss:'#b9b093'};
    return {...clean({...raw,bio:raw.bio||'A familiar signal in the Afterhours sample community.',status:statuses.includes(raw.status)?raw.status:'online',statusText:raw.statusText||raw.status||'Somewhere in the void',accent:hex(raw.accent,palettes[id]||'#a5b2d4'),banner:id==='ghost'?'grid':id==='pixel'?'aurora':'orbital',frame:'chrome'}),badge:raw.badge||'',sample:true};
  }
  const art=id=>window.VoidBadges?.art?.(id)||`<span class="vp-art-placeholder">${esc(limit(names[id]||id||'V',1))}</span>`;
  const avatarContent=p=>p.avatarImage?`<img src="${p.avatarImage}" alt="" style="object-position:${pos(p.avatarX)}% ${pos(p.avatarY)}%">`:esc(p.avatar);
  const worldClass=p=>`vp-world vp-world-theme-${p.theme} vp-layout-${p.layout}${p.animated?' vp-world-motion':''}`;
  const bannerClass=p=>`vp-banner vp-banner-${p.banner}${p.animated?' vp-animated':''}`;
  function profileArtwork(p){return `<div class="${bannerClass(p)}" aria-hidden="true"><div class="vp-banner-grid"></div><div class="vp-orbit vp-orbit-a"></div><div class="vp-orbit vp-orbit-b"></div><div class="vp-moon"></div><div class="vp-banner-coordinate">VL / PERSONAL SPACE</div><span class="vp-banner-cross">+</span></div>`;}
  function featured(p,id,preview=false){
    const owned=Object.keys(api.state.artifacts||{});let ids=id==='self'?p.featuredBadges.filter(b=>owned.includes(b)):[];
    if(!ids.length&&p.badge)ids=[p.badge];if(!ids.length)return '';
    const collection=preview?'':id==='self'?'<button type="button" data-vcollection>VIEW COLLECTION ↗</button>':`<button type="button" data-vp-sample-collection="${esc(id)}">SAMPLE COLLECTION ↗</button>`;
    return `<div class="vp-cabinet" data-featured="${esc(ids.join(','))}"><div class="vp-section-title">${id==='self'?'FEATURED ARTIFACTS':'SAMPLE ARTIFACT'}${collection}</div><div class="vp-featured-grid">${ids.slice(0,3).map(badge=>`<${preview?'div':'button type="button"'} class="vp-artifact"${preview?'':id==='self'?` data-vbadge="${esc(badge)}" aria-label="Inspect ${esc(names[badge]||human(badge))}"`:` data-vp-sample-inspect="${esc(id)}" data-vp-sample-badge="${esc(badge)}" aria-label="Inspect sample ${esc(names[badge]||human(badge))}"`}><span>${art(badge)}</span><small>${esc(names[badge]||human(badge))}</small></${preview?'div':'button'}>`).join('')}</div></div>`;
  }
  function affiliations(p,id){
    if(id!=='self')return '<span>AFTERHOURS</span><span>COMMUNITY PREVIEW</span>';
    const communities=Array.isArray(api.state.customServers)?api.state.customServers:[],labels=[...new Set(communities.map(c=>text(c?.name,32)).filter(n=>n&&n.toLocaleLowerCase()!=='afterhours'))].slice(0,2);
    return '<span>AFTERHOURS / LOCAL</span>'+labels.map(name=>`<span title="${esc('Local community: '+name)}">${esc(name)} / LOCAL</span>`).join('');
  }
  function card(p,id='self',preview=false){
    const isSelf=id==='self';
    return `<article class="${worldClass(p)}" style="--vp-accent:${hex(p.accent)}">${profileArtwork(p)}<div class="vp-world-body"><div class="vp-identity-line"><div class="vp-profile-avatar vp-frame-${p.frame}" aria-label="${esc(p.name)} avatar"><span class="vp-avatar-content">${avatarContent(p)}</span><i class="vp-presence vp-presence-${p.status}" title="${p.status}"></i></div><span class="vp-identity-edition">${p.sample?'SAMPLE PROFILE':'DEVICE IDENTITY'}<small>AFTERHOURS / 02</small></span></div><div class="vp-profile-heading"><div><p class="vp-eyebrow">${p.layout==='editorial'?'A WORLD OF YOUR OWN':'YOUR SIGNAL IN THE NOISE'}</p><h2 data-vp-slot="name">${esc(p.name)}</h2><div class="vp-profile-status"><i class="vp-presence-${p.status}"></i><span data-vp-slot="status">${esc(p.statusText||human(p.status))}</span></div></div>${p.badge?`<${preview?'span':'button type="button"'} class="vp-equipped"${preview?'':isSelf?` data-vbadge="${esc(p.badge)}" aria-label="Inspect equipped artifact"`:` data-vp-sample-inspect="${esc(id)}" data-vp-sample-badge="${esc(p.badge)}" aria-label="Inspect sample equipped artifact"`}>${art(p.badge)}</${preview?'span':'button'}>`:''}</div><p class="vp-bio" data-vp-slot="bio">${esc(p.bio||'A little mystery looks good on you.')}</p><div class="vp-profile-tags">${affiliations(p,id)}</div><div data-vp-slot="featured">${featured(p,id,preview)}</div>${preview?'':`<div class="vp-profile-actions">${isSelf?'<button class="primary-button" type="button" data-vp-edit>Customize profile <span>↗</span></button><button class="secondary-button" type="button" data-vcollection>Artifact cabinet</button>':`<button class="primary-button" type="button" data-vp-dm="${esc(id)}">Open conversation <span>↗</span></button><button class="secondary-button" type="button" data-vp-friend="${esc(id)}">${api.isFriend?.(id)?'Remove friend':'Add friend'}</button>`}</div>${p.sample?'<p class="vp-local-note">Sample community member. Conversations are saved on this device.</p>':''}`}</div></article>`;
  }
  function abandonEditor(){editGeneration++;draft=null;originalDraft=null;dirty=false;}
  function open(id='self',editing=false){
    if(!api)return;if(editing&&id==='self')return edit();abandonEditor();const p=safePerson(id);if(!p)return;
    api.modal(`<div class="vp-profile-view">${card(p,id)}</div>`,{wide:false,className:'vp-modal vp-view-modal'});
  }
  function selectField(label,name,value,options){return `<label class="vp-field"><span>${label}</span><select name="${name}">${options.map(id=>`<option value="${id}"${id===value?' selected':''}>${esc(human(id))}</option>`).join('')}</select></label>`;}
  function orderMarkup(ids){return ids.length?`<ol class="vp-featured-order" aria-label="Featured artifact display order">${ids.map((id,index)=>`<li class="vp-order-item"><span>${esc(names[id]||human(id))}</span><div><button type="button" data-vp-move-badge="${esc(id)}" data-vp-direction="-1" aria-label="Move ${esc(names[id]||human(id))} earlier"${index===0?' disabled':''}>↑</button><button type="button" data-vp-move-badge="${esc(id)}" data-vp-direction="1" aria-label="Move ${esc(names[id]||human(id))} later"${index===ids.length-1?' disabled':''}>↓</button></div></li>`).join('')}</ol><p class="vp-editor-note">Use the arrow buttons to set the display order.</p>`:'<p class="vp-editor-note">Select up to three artifacts to feature. Your equipped artifact appears when none are selected.</p>';}
  function edit(){
    if(!api)return;normalize();editGeneration++;draft={...clean(api.state.profile),badge:api.state.profile.badge};originalDraft=clone(draft);dirty=false;
    const ids=Object.keys(api.state.artifacts||{}).filter(id=>/^[a-z0-9-]{1,40}$/.test(id));
    api.modal(`<div class="vp-editor"><div class="vp-editor-form"><p class="vp-eyebrow">IDENTITY STUDIO</p><h2 class="modal-heading">Make it unmistakably you.</h2><p class="modal-copy">A small world with your name on it. Everything saves on this device.</p><form id="vp-profile-form"><div class="vp-fields-two"><label class="vp-field"><span>DISPLAY NAME</span><input name="name" value="${esc(draft.name)}" data-vp-max="24" required autocomplete="nickname"></label><label class="vp-field vp-avatar-field"><span>AVATAR MARK</span><input name="avatar" value="${esc(draft.avatar)}" data-vp-max="3" required aria-label="Avatar initials or symbol"></label></div><div class="vp-avatar-tools"><label class="vp-upload-button"><input type="file" id="vp-avatar-upload" accept="image/png,image/jpeg,image/webp"><span>Upload avatar</span><small>PNG, JPEG, WebP · 512 KB max</small></label><button type="button" class="secondary-button" data-vp-remove-avatar${draft.avatarImage?'':' hidden'}>Use initials</button></div><div id="vp-avatar-crop" class="vp-avatar-crop"${draft.avatarImage?'':' hidden'}><div class="vp-crop-sample" aria-label="Avatar crop preview">${draft.avatarImage?`<img src="${draft.avatarImage}" alt="" style="object-position:${draft.avatarX}% ${draft.avatarY}%">`:""}</div><div class="vp-crop-heading"><span>AVATAR CROP</span><button type="button" data-vp-reset-crop>Center image</button></div><div class="vp-fields-two"><label class="vp-field"><span>HORIZONTAL POSITION</span><input name="avatarX" type="range" min="0" max="100" value="${draft.avatarX}" aria-label="Avatar horizontal focal point"></label><label class="vp-field"><span>VERTICAL POSITION</span><input name="avatarY" type="range" min="0" max="100" value="${draft.avatarY}" aria-label="Avatar vertical focal point"></label></div><p class="vp-editor-note">The image fills the circular crop. Move its focal point with these controls.</p></div><label class="vp-field"><span>BIOGRAPHY <small><output id="vp-bio-count">${graphemes(draft.bio).length}</output> / 240</small></span><textarea name="bio" rows="3" data-vp-max="240" placeholder="Leave a little of yourself in the void.">${esc(draft.bio)}</textarea></label><div class="vp-fields-two">${selectField('PRESENCE','status',draft.status,statuses)}<label class="vp-field"><span>STATUS</span><input name="statusText" value="${esc(draft.statusText)}" data-vp-max="60" placeholder="In my own orbit"></label></div><div class="vp-editor-divider"><span>THE MATERIALS</span><i></i></div><div class="vp-fields-two">${selectField('PROFILE COLOR WORLD','theme',draft.theme,Object.keys(themes))}<label class="vp-field vp-color-field"><span>PROFILE ACCENT</span><div><input name="accent" type="color" value="${draft.accent}" aria-label="Profile accent color"><output id="vp-accent-label">${draft.accent.toUpperCase()}</output></div></label></div><p class="vp-editor-note">These colors belong to your profile. Client colors are set separately in Appearance.</p><div class="vp-fields-three">${selectField('BANNER','banner',draft.banner,banners)}${selectField('FRAME','frame',draft.frame,frames)}${selectField('LAYOUT','layout',draft.layout,['classic','editorial'])}</div><label class="vp-switch-row"><span><b>Ambient profile motion</b><small>Gentle orbital drift. Reduced motion always takes priority.</small></span><input name="animated" type="checkbox"${draft.animated?' checked':''}><i></i></label>${ids.length?`<div class="vp-editor-divider"><span>FEATURE YOUR COLLECTION</span><i></i><small>UP TO THREE</small></div><div class="vp-artifact-choices">${ids.map(id=>`<label class="vp-artifact-choice"><input type="checkbox" name="featuredBadges" value="${esc(id)}"${draft.featuredBadges.includes(id)?' checked':''}><span>${art(id)}</span><small>${esc(names[id]||human(id))}</small><i>✓</i></label>`).join('')}</div><div id="vp-featured-order">${orderMarkup(draft.featuredBadges)}</div>`:''}<div id="vp-discard-confirm" class="vp-discard-confirm" hidden><p>Discard these unsaved edits?</p><button type="button" class="secondary-button" data-vp-keep>Keep editing</button><button type="button" class="secondary-button" data-vp-discard>Discard changes</button></div><div class="vp-editor-footer"><span id="vp-save-state" class="vp-save-state" role="status">No unsaved changes</span><button type="button" class="secondary-button" data-vp-cancel>Cancel</button><button type="submit" class="primary-button">Save identity <span>↗</span></button></div></form></div><aside class="vp-live-preview"><div class="vp-preview-label"><i></i>LIVE PREVIEW<span>01 / 01</span></div><div id="vp-editor-preview">${card(draft,'self',true)}</div><p class="vp-preview-caption">THIS IS HOW YOUR SIGNAL APPEARS.</p></aside></div>`,{wide:true,className:'vp-modal vp-editor-modal'});
    const dialog=document.getElementById('app-modal');dialog?.addEventListener('cancel',guardCancel);
  }
  function formDraft(form){
    const values=new FormData(form),selected=values.getAll('featuredBadges').filter(id=>Object.hasOwn(api.state.artifacts||{},id)),ordered=[...(draft?.featuredBadges||[]).filter(id=>selected.includes(id)),...selected.filter(id=>!draft?.featuredBadges?.includes(id))].slice(0,3);
    return {...clean({name:values.get('name'),avatar:values.get('avatar'),avatarImage:draft?.avatarImage||'',avatarX:values.get('avatarX')??draft?.avatarX??50,avatarY:values.get('avatarY')??draft?.avatarY??50,bio:values.get('bio'),status:values.get('status'),statusText:values.get('statusText'),accent:values.get('accent'),theme:values.get('theme'),banner:values.get('banner'),frame:values.get('frame'),layout:values.get('layout'),animated:values.get('animated')==='on',featuredBadges:ordered}),badge:api.state.profile.badge};
  }
  function patchPreview(p){
    const holder=document.getElementById('vp-editor-preview'),world=holder?.querySelector('.vp-world');if(!world)return;
    world.className=worldClass(p);world.style.setProperty('--vp-accent',hex(p.accent));
    const banner=world.querySelector('.vp-banner');if(banner&&banner.className!==bannerClass(p))banner.className=bannerClass(p);
    const avatar=world.querySelector('.vp-profile-avatar');if(avatar){avatar.className=`vp-profile-avatar vp-frame-${p.frame}`;avatar.setAttribute('aria-label',p.name+' avatar');}
    const content=world.querySelector('.vp-avatar-content');if(content){
      let image=content.querySelector('img');
      if(p.avatarImage){if(!image){image=document.createElement('img');image.alt='';content.replaceChildren(image);}if(image.getAttribute('src')!==p.avatarImage)image.src=p.avatarImage;image.style.objectPosition=`${pos(p.avatarX)}% ${pos(p.avatarY)}%`;}
      else if(content.textContent!==p.avatar||image)content.textContent=p.avatar;
    }
    const crop=document.querySelector('.vp-crop-sample');if(crop){let image=crop.querySelector('img');if(p.avatarImage){if(!image){image=document.createElement('img');image.alt='';crop.replaceChildren(image);}if(image.getAttribute('src')!==p.avatarImage)image.src=p.avatarImage;image.style.objectPosition=`${pos(p.avatarX)}% ${pos(p.avatarY)}%`;}else crop.replaceChildren();}
    const presence=avatar?.querySelector('.vp-presence');if(presence){presence.className=`vp-presence vp-presence-${p.status}`;presence.title=p.status;}
    const statusDot=world.querySelector('.vp-profile-status>i');if(statusDot)statusDot.className=`vp-presence-${p.status}`;
    const slots={name:p.name,status:p.statusText||human(p.status),bio:p.bio||'A little mystery looks good on you.'};
    Object.entries(slots).forEach(([key,value])=>{const node=world.querySelector(`[data-vp-slot="${key}"]`);if(node&&node.textContent!==value)node.textContent=value;});
    const eyebrow=world.querySelector('.vp-profile-heading .vp-eyebrow');if(eyebrow)eyebrow.textContent=p.layout==='editorial'?'A WORLD OF YOUR OWN':'YOUR SIGNAL IN THE NOISE';
    const slot=world.querySelector('[data-vp-slot="featured"]'),ids=p.featuredBadges.length?p.featuredBadges:[p.badge].filter(Boolean),signature=ids.join(',');
    if(slot&&slot.firstElementChild?.dataset.featured!==signature)slot.innerHTML=featured(p,'self',true);
  }
  function updateSaveState(message,failed=false){const node=document.getElementById('vp-save-state');if(node){node.textContent=message|| (dirty?'Unsaved changes':'No unsaved changes');node.classList.toggle('vp-unsaved',dirty||failed);node.classList.toggle('vp-save-error',failed);}}
  function updatePreview(form){
    if(!draft)return;draft=formDraft(form);dirty=JSON.stringify(draft)!==JSON.stringify(originalDraft);patchPreview(draft);updateSaveState();
    const accent=document.getElementById('vp-accent-label');if(accent)accent.textContent=draft.accent.toUpperCase();
    const count=document.getElementById('vp-bio-count');if(count)count.textContent=String(graphemes(draft.bio).length);
  }
  function requestDiscard(intent='view'){
    closeIntent=intent;if(!dirty){if(intent==='close'){abandonEditor();api.closeModal();}else open('self');return;}
    const box=document.getElementById('vp-discard-confirm');if(box){box.hidden=false;box.querySelector('[data-vp-keep]')?.focus();}
  }
  function guardCancel(event){if(document.getElementById('vp-profile-form')&&dirty){event.preventDefault();requestDiscard('close');}}
  function setImageControls(show){const crop=document.getElementById('vp-avatar-crop'),remove=document.querySelector('[data-vp-remove-avatar]');if(crop)crop.hidden=!show;if(remove)remove.hidden=!show;}
  async function uploadAvatar(input){
    const file=input.files?.[0],generation=editGeneration;if(!file)return;
    input.value='';if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>512*1024){api.toast('Choose a PNG, JPEG, or WebP image up to 512 KB.');return;}
    try{
      const bytes=new Uint8Array(await file.arrayBuffer()),type=file.type.split('/')[1];if(!signature(bytes,type))throw new Error('type');
      const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
      if(!validateAvatarImage(source))throw new Error('data');
      await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth>0&&image.naturalHeight>0&&image.naturalWidth<=8192&&image.naturalHeight<=8192?resolve():reject(new Error('dimensions'));image.onerror=reject;image.src=source;});
      const form=document.getElementById('vp-profile-form');if(generation!==editGeneration||!draft||!form||!document.getElementById('app-modal')?.open)return;
      draft.avatarImage=source;draft.avatarX=50;draft.avatarY=50;['avatarX','avatarY'].forEach(key=>{if(form.elements[key])form.elements[key].value=50;});setImageControls(true);updatePreview(form);api.toast('Avatar ready. Position the crop, then save your identity.');
    }catch(_){api.toast('That image could not be used. Choose a valid image under 512 KB and 8192 pixels per side.');}
  }
  function settings(){
    if(!api)return;abandonEditor();normalize();const s=api.state.settings;
    api.modal(`<div class="vp-settings"><p class="vp-eyebrow">CLIENT PREFERENCES</p><h2 class="modal-heading">Set your atmosphere.</h2><p class="modal-copy">Client colors stay readable. Your profile keeps its own independent palette.</p><form id="vp-settings-form"><div class="vp-settings-section"><div class="vp-section-title">CLIENT COLOR WORLD</div><div class="vp-theme-options">${Object.entries(themes).map(([id,t])=>`<label class="vp-theme-option vp-theme-${id}"><input type="radio" name="theme" value="${id}"${s.theme===id?' checked':''}><span class="vp-theme-window"><i></i><b></b><em></em></span><strong>${t.name}</strong><small>${t.note}</small><span class="vp-theme-check">✓</span></label>`).join('')}</div><div class="vp-section-title vp-client-accent-title">CLIENT ACCENT</div><div class="vp-client-accents">${Object.entries(clientAccents).map(([id,a])=>`<label><input type="radio" name="clientAccent" value="${id}"${s.clientAccent===id?' checked':''}><i style="background:${a.color}"></i><span>${a.name}</span></label>`).join('')}</div></div><div class="vp-settings-section"><label class="vp-switch-row"><span><b>Compact conversations</b><small>More messages. A little less space between them.</small></span><input name="compact" type="checkbox"${s.compact?' checked':''}><i></i></label><label class="vp-switch-row"><span><b>Decorative motion</b><small>${systemReduced()?'Your system requests reduced motion. That preference is honored.':'Allow subtle entrance, profile, and interface transitions.'}</small></span><input name="motion" type="checkbox"${s.motion?' checked':''}><i></i></label><label class="vp-switch-row"><span><b>Show community sidebar</b><small>Keep familiar faces and your collection in view.</small></span><input name="memberSidebar" type="checkbox"${s.memberSidebar?' checked':''}><i></i></label></div><div class="vp-settings-section"><div class="vp-section-title">YOUR CLIENT, YOUR DATA</div><div class="vp-setting-links"><button type="button" data-vp-replay><span>Replay the entrance<small>The full Afterhours client entry sequence.</small></span><span>↗</span></button><button type="button" data-action="export"><span>Export your archive<small>Save messages, identity, and artifacts as JSON.</small></span><span>↓</span></button><button type="button" data-action="import"><span>Import an archive<small>Restore an exported VOIDLINE archive.</small></span><span>↑</span></button><button type="button" data-action="download"><span>Take VOIDLINE offline<small>Download the complete single-file client.</small></span><span>↗</span></button></div></div><div class="vp-settings-footer"><span id="vp-settings-save-state" role="status">Saved on this device. Changes save automatically.</span><button type="submit" class="primary-button">Done</button></div></form></div>`,{wide:true,className:'vp-modal vp-settings-modal'});
  }
  function saveSettings(form){
    const values=new FormData(form),previous=clone(api.state.settings);
    api.state.settings={...api.state.settings,theme:pick(values.get('theme'),Object.keys(themes),'midnight'),clientAccent:pick(values.get('clientAccent'),Object.keys(clientAccents),'steel'),compact:values.get('compact')==='on',motion:values.get('motion')==='on',memberSidebar:values.get('memberSidebar')==='on'};
    if(api.persist()===false){api.state.settings=previous;applyAppearance();const node=document.getElementById('vp-settings-save-state');if(node){node.textContent='Not saved. Your choices remain here; retry when storage is available.';node.classList.add('vp-save-error');}return false;}
    applyAppearance();api.refresh();const node=document.getElementById('vp-settings-save-state');if(node){node.textContent='Saved on this device. Changes save automatically.';node.classList.remove('vp-save-error');}return true;
  }
  function isComplete(){
    if(!api)return false;const p=clean(api.state.profile),appearance=!!p.avatarImage||p.avatar!=='Y'||p.banner!=='orbital'||p.frame!=='chrome'||p.layout!=='classic'||p.theme!=='midnight'||p.accent!=='#a5b2d4'||!p.animated;
    return p.name!=='you'&&graphemes(p.bio).length>=20&&graphemes(p.statusText).length>=3&&appearance;
  }
  function init(shared){
    api=shared;normalize();applyAppearance();
    document.addEventListener('click',event=>{
      const editing=document.getElementById('vp-profile-form');
      if(!editing||!dirty)return;
      const dialog=document.getElementById('app-modal'),rect=dialog?.getBoundingClientRect?.();
      const backdrop=event.target===dialog&&rect&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);
      if(event.target.closest?.('#modal-close')||backdrop){event.preventDefault();event.stopImmediatePropagation();requestDiscard('close');}
    },true);
    document.addEventListener('click',event=>{
      const node=event.target.closest?.('[data-vp-edit],[data-vp-cancel],[data-vp-keep],[data-vp-discard],[data-vp-dm],[data-vp-friend],[data-vp-replay],[data-vp-remove-avatar],[data-vp-reset-crop],[data-vp-move-badge],[data-vp-sample-collection],[data-vp-sample-inspect]');if(!node)return;event.preventDefault();
      if(node.hasAttribute('data-vp-edit'))return edit();
      if(node.hasAttribute('data-vp-cancel'))return requestDiscard('view');
      if(node.hasAttribute('data-vp-keep')){const box=document.getElementById('vp-discard-confirm');if(box)box.hidden=true;return;}
      if(node.hasAttribute('data-vp-discard')){const intent=closeIntent;abandonEditor();if(intent==='close')api.closeModal();else open('self');return;}
      if(node.hasAttribute('data-vp-dm')){api.closeModal();api.dm?.(node.dataset.vpDm);return;}
      if(node.hasAttribute('data-vp-friend')){const result=api.toggleFriend?.(node.dataset.vpFriend);if(result!==false)open(node.dataset.vpFriend);return;}
      if(node.hasAttribute('data-vp-replay')){api.closeModal();window.VoidEntrance?.replay?.();return;}
      if(node.hasAttribute('data-vp-sample-inspect')){const id=node.dataset.vpSampleInspect,p=safePerson(id);if(p)window.VoidBadges?.openFor?.(id,[p.badge].filter(Boolean),p.name,node.dataset.vpSampleBadge);return;}
      if(node.hasAttribute('data-vp-sample-collection')){const id=node.dataset.vpSampleCollection,p=safePerson(id);if(p)window.VoidBadges?.openFor?.(id,[p.badge].filter(Boolean),p.name);return;}
      const form=document.getElementById('vp-profile-form');if(!form||!draft)return;
      if(node.hasAttribute('data-vp-remove-avatar')){draft.avatarImage='';setImageControls(false);return updatePreview(form);}
      if(node.hasAttribute('data-vp-reset-crop')){['avatarX','avatarY'].forEach(key=>{if(form.elements[key])form.elements[key].value=50;});return updatePreview(form);}
      if(node.hasAttribute('data-vp-move-badge')){const list=draft.featuredBadges,index=list.indexOf(node.dataset.vpMoveBadge),target=index+Number(node.dataset.vpDirection);if(index<0||target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];updatePreview(form);const holder=document.getElementById('vp-featured-order');if(holder){holder.innerHTML=orderMarkup(draft.featuredBadges);const next=holder.querySelector(`[data-vp-move-badge="${node.dataset.vpMoveBadge}"][data-vp-direction="${node.dataset.vpDirection}"]`);if(next&&!next.disabled)next.focus();else holder.querySelector(`[data-vp-move-badge="${node.dataset.vpMoveBadge}"]:not(:disabled)`)?.focus();}}
    });
    const handleInput=event=>{const form=event.target.closest?.('#vp-profile-form');if(!form||event.isComposing)return;const maximum=Number(event.target.dataset?.vpMax);if(maximum&&typeof event.target.value==='string')event.target.value=limit(event.target.value,maximum);updatePreview(form);};
    document.addEventListener('input',handleInput);document.addEventListener('compositionend',handleInput);
    document.addEventListener('change',event=>{
      if(event.target.id==='vp-avatar-upload')return uploadAvatar(event.target);
      const form=event.target.closest?.('#vp-profile-form');if(form){if(event.target.name==='featuredBadges'&&form.querySelectorAll('[name="featuredBadges"]:checked').length>3){event.target.checked=false;api.toast('Choose up to three featured artifacts.');}updatePreview(form);const holder=document.getElementById('vp-featured-order');if(holder)holder.innerHTML=orderMarkup(draft.featuredBadges);}
      const settingsForm=event.target.closest?.('#vp-settings-form');if(settingsForm)saveSettings(settingsForm);
    });
    document.addEventListener('submit',event=>{
      if(event.target.id==='vp-profile-form'){
        event.preventDefault();const next=formDraft(event.target),previous=clone(api.state.profile);if(!next.name.trim())return;
        Object.assign(api.state.profile,next);
        if(api.persist()===false){api.state.profile=previous;draft=next;dirty=true;updateSaveState('Not saved. Your edits are still here. Retry after freeing storage.',true);return;}
        applyAppearance();api.refresh();abandonEditor();window.dispatchEvent(new CustomEvent('voidline:progress',{detail:{kind:'profile'}}));open('self');api.toast('Identity saved. Your world looks good.');
      }
      if(event.target.id==='vp-settings-form'){event.preventDefault();if(saveSettings(event.target))api.closeModal();}
    });
    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',applyAppearance);return window.VoidProfiles;
  }
  window.VoidProfiles={init,open,edit,settings,applyAppearance,isComplete,clean,validateAvatarImage};
})();
