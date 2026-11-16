(() => {
  'use strict';
  let api, draft, viewed = 'self';
  const themes = {
    midnight: {name:'Midnight', note:'Blue steel / low light', accent:'#a5b2d4'},
    obsidian: {name:'Obsidian', note:'Black chrome / silver', accent:'#b8bcc8'},
    velvet: {name:'Velvet', note:'Charcoal / muted violet', accent:'#b5a3ce'}
  };
  const banners = ['orbital','grid','aurora'];
  const frames = ['none','chrome','orbit'];
  const statuses = ['online','idle','busy','offline'];
  const names = {larp:'LARP Pro Max',founder:'The Original Signal',night:'3:33 AM',angel:'404 Angel',ghost:'Ghost Frequency',dead:'Dead Internet',voidwalker:'Voidwalker',velvet:'Velvet Static',unknown:'Unknown Entity'};
  const fallbackEscape = (value='') => String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const esc = (value) => (api?.esc || fallbackEscape)(value);
  const hex = (value, fallback='#a5b2d4') => typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
  const text = (value, limit, fallback='') => typeof value==='string' ? value.trim().slice(0,limit) : fallback;
  const pick = (value, options, fallback) => options.includes(value) ? value : fallback;
  const systemReduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const human = (value) => String(value).replace(/-/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase());
  function clean(p={}) {
    if(!p || typeof p!=='object')p={};
    return {
      name:text(p.name,24,'you')||'you',
      avatar:text(p.avatar,3,'Y')||'Y',
      bio:text(p.bio,240),
      status:pick(p.status,statuses,'online'),
      statusText:text(p.statusText,60,'In my own orbit'),
      accent:hex(p.accent),
      theme:pick(p.theme,Object.keys(themes),'midnight'),
      banner:pick(p.banner,banners,'orbital'),
      frame:pick(p.frame,frames,'chrome'),
      layout:pick(p.layout,['classic','editorial'],'classic'),
      animated:typeof p.animated==='boolean' ? p.animated : true,
      featuredBadges:Array.isArray(p.featuredBadges) ? [...new Set(p.featuredBadges.filter((id)=>typeof id==='string' && /^[a-z0-9-]{1,40}$/.test(id)))].slice(0,3) : []
    };
  }
  function normalize() {
    if(!api.state.profile || typeof api.state.profile!=='object') api.state.profile={};
    Object.assign(api.state.profile,clean(api.state.profile));
    const s=api.state.settings && typeof api.state.settings==='object' ? api.state.settings : {};
    api.state.settings={...s,compact:!!s.compact,motion:typeof s.motion==='boolean'?s.motion:!systemReduced(),memberSidebar:s.memberSidebar!==false};
  }
  function applyAppearance() {
    if(!api)return;
    normalize();
    const p=api.state.profile,s=api.state.settings;
    document.documentElement.dataset.theme=p.theme;
    document.documentElement.style.setProperty('--accent',hex(p.accent));
    document.documentElement.style.setProperty('--profile-accent',hex(p.accent));
    document.body.classList.toggle('density-compact',s.compact);
    document.body.classList.toggle('compact',s.compact);
    document.body.classList.toggle('reduce-motion',!s.motion||systemReduced());
    document.body.classList.toggle('members-hidden',!s.memberSidebar);
    document.body.dataset.density=s.compact?'compact':'comfortable';
  }
  function safePerson(id) {
    if(id==='self')return {...api.state.profile};
    const raw=api.person?.(id);
    if(!raw)return null;
    const palettes={nova:'#b7b0d6',ghost:'#93b5b2',pixel:'#c2a7bc',orbit:'#9caed0',moss:'#b9b093'};
    return {...clean({...raw,bio:raw.bio||'A familiar signal in the Afterhours sample community.',status:statuses.includes(raw.status)?raw.status:'online',statusText:raw.statusText||raw.status||'Somewhere in the void',accent:hex(raw.accent,palettes[id]||'#a5b2d4'),banner:id==='ghost'?'grid':id==='pixel'?'aurora':'orbital',frame:'chrome'}),badge:raw.badge||'',sample:true};
  }
  const art = (id) => window.VoidBadges?.art?.(id) || `<span class="vp-art-placeholder">${esc((names[id]||id||'V').slice(0,1))}</span>`;
  function profileArtwork(p) {
    return `<div class="vp-banner vp-banner-${p.banner}${p.animated?' vp-animated':''}" aria-hidden="true"><div class="vp-banner-grid"></div><div class="vp-orbit vp-orbit-a"></div><div class="vp-orbit vp-orbit-b"></div><div class="vp-moon"></div><div class="vp-banner-coordinate">VL / PERSONAL SPACE</div><span class="vp-banner-cross">+</span></div>`;
  }
  function featured(p,id) {
    const owned=Object.keys(api.state.artifacts||{});
    let ids=id==='self' ? p.featuredBadges.filter((b)=>owned.includes(b)) : [];
    if(!ids.length && p.badge)ids=[p.badge];
    return ids.length?`<div class="vp-cabinet"><div class="vp-section-title">${id==='self'?'FEATURED ARTIFACTS':'SAMPLE ARTIFACT'}<button type="button" data-vcollection>VIEW COLLECTION ↗</button></div><div class="vp-featured-grid">${ids.slice(0,3).map((badge)=>`<button type="button" class="vp-artifact" data-vbadge="${esc(badge)}" aria-label="Inspect ${esc(names[badge]||human(badge))}"><span>${art(badge)}</span><small>${esc(names[badge]||human(badge))}</small></button>`).join('')}</div></div>`:'';
  }
  function affiliations(p,id) {
    if(id!=='self')return '<span>AFTERHOURS</span><span>COMMUNITY PREVIEW</span>';
    const communities=Array.isArray(api.state.customServers)?api.state.customServers:[];
    const labels=[...new Set(communities.map((community)=>text(community?.name,32)).filter((name)=>name&&name.toLocaleLowerCase()!=='afterhours'))].slice(0,2);
    return '<span>AFTERHOURS / LOCAL</span>'+labels.map((name)=>`<span title="${esc('Local community: '+name)}">${esc(name)} / LOCAL</span>`).join('');
  }
  function card(p,id='self',preview=false) {
    const isSelf=id==='self';
    return `<article class="vp-world vp-world-theme-${p.theme} vp-layout-${p.layout}${p.animated?' vp-world-motion':''}" style="--vp-accent:${hex(p.accent)}">${profileArtwork(p)}<div class="vp-world-body"><div class="vp-identity-line"><div class="vp-profile-avatar vp-frame-${p.frame}" aria-label="${esc(p.name)} avatar"><span>${esc(p.avatar)}</span><i class="vp-presence vp-presence-${p.status}" title="${p.status}"></i></div><span class="vp-identity-edition">${p.sample?'SAMPLE PROFILE':'DEVICE IDENTITY'}<small>AFTERHOURS / 02</small></span></div><div class="vp-profile-heading"><div><p class="vp-eyebrow">${p.layout==='editorial'?'A WORLD OF YOUR OWN':'YOUR SIGNAL IN THE NOISE'}</p><h2>${esc(p.name)}</h2><div class="vp-profile-status"><i class="vp-presence-${p.status}"></i><span>${esc(p.statusText||human(p.status))}</span></div></div>${p.badge?`<button type="button" class="vp-equipped" data-vbadge="${esc(p.badge)}" aria-label="Inspect equipped artifact">${art(p.badge)}</button>`:''}</div><p class="vp-bio">${p.bio?esc(p.bio).replace(/\n/g,'<br>'):'A little mystery looks good on you.'}</p><div class="vp-profile-tags">${affiliations(p,id)}</div>${featured(p,id)}${preview?'':`<div class="vp-profile-actions">${isSelf?'<button class="primary-button" type="button" data-vp-edit>Customize profile <span>↗</span></button><button class="secondary-button" type="button" data-vcollection>Artifact cabinet</button>':`<button class="primary-button" type="button" data-vp-dm="${esc(id)}">Open conversation <span>↗</span></button><button class="secondary-button" type="button" data-vp-friend="${esc(id)}">${api.isFriend?.(id)?'Remove friend':'Add friend'}</button>`}</div>${p.sample?'<p class="vp-local-note">Sample community member. Conversations are saved on this device.</p>':''}`}</div></article>`;
  }
  function open(id='self',editing=false) {
    if(!api)return;
    if(editing&&id==='self')return edit();
    viewed=id;
    const p=safePerson(id);if(!p)return;
    api.modal(`<div class="vp-profile-view">${card(p,id)}</div>`,{wide:false,className:'vp-modal vp-view-modal'});
  }
  function selectField(label,name,value,options) {
    return `<label class="vp-field"><span>${label}</span><select name="${name}">${options.map((id)=>`<option value="${id}"${id===value?' selected':''}>${esc(human(id))}</option>`).join('')}</select></label>`;
  }
  function edit() {
    if(!api)return;
    normalize();draft={...clean(api.state.profile),badge:api.state.profile.badge};
    const ids=Object.keys(api.state.artifacts||{}).filter((id)=>/^[a-z0-9-]{1,40}$/.test(id));
    api.modal(`<div class="vp-editor"><div class="vp-editor-form"><p class="vp-eyebrow">IDENTITY STUDIO</p><h2 class="modal-heading">Make it unmistakably you.</h2><p class="modal-copy">A small world with your name on it. Everything saves on this device.</p><form id="vp-profile-form"><div class="vp-fields-two"><label class="vp-field"><span>DISPLAY NAME</span><input name="name" value="${esc(draft.name)}" maxlength="24" required autocomplete="nickname"></label><label class="vp-field vp-avatar-field"><span>AVATAR MARK</span><input name="avatar" value="${esc(draft.avatar)}" maxlength="3" required aria-label="Avatar initials or symbol"></label></div><label class="vp-field"><span>BIOGRAPHY <small>240 characters</small></span><textarea name="bio" rows="3" maxlength="240" placeholder="Leave a little of yourself in the void.">${esc(draft.bio)}</textarea></label><div class="vp-fields-two">${selectField('PRESENCE','status',draft.status,statuses)}<label class="vp-field"><span>STATUS</span><input name="statusText" value="${esc(draft.statusText)}" maxlength="60" placeholder="In my own orbit"></label></div><div class="vp-editor-divider"><span>THE MATERIALS</span><i></i></div><div class="vp-fields-two">${selectField('COLOR WORLD','theme',draft.theme,Object.keys(themes))}<label class="vp-field vp-color-field"><span>PERSONAL ACCENT</span><div><input name="accent" type="color" value="${draft.accent}" aria-label="Profile accent color"><output id="vp-accent-label">${draft.accent.toUpperCase()}</output></div></label></div><div class="vp-fields-three">${selectField('BANNER','banner',draft.banner,banners)}${selectField('FRAME','frame',draft.frame,frames)}${selectField('LAYOUT','layout',draft.layout,['classic','editorial'])}</div><label class="vp-switch-row"><span><b>Ambient profile motion</b><small>Gentle orbital drift. Reduced motion always takes priority.</small></span><input name="animated" type="checkbox"${draft.animated?' checked':''}><i></i></label>${ids.length?`<div class="vp-editor-divider"><span>FEATURE YOUR COLLECTION</span><i></i><small>UP TO THREE</small></div><div class="vp-artifact-choices">${ids.map((id)=>`<label class="vp-artifact-choice"><input type="checkbox" name="featuredBadges" value="${esc(id)}"${draft.featuredBadges.includes(id)?' checked':''}><span>${art(id)}</span><small>${esc(names[id]||human(id))}</small><i>✓</i></label>`).join('')}</div>`:''}<div class="vp-editor-footer"><button type="button" class="secondary-button" data-vp-cancel>Cancel</button><button type="submit" class="primary-button">Save identity <span>↗</span></button></div></form></div><aside class="vp-live-preview"><div class="vp-preview-label"><i></i>LIVE PREVIEW<span>01 / 01</span></div><div id="vp-editor-preview">${card(draft,'self',true)}</div><p class="vp-preview-caption">THIS IS HOW YOUR SIGNAL APPEARS.</p></aside></div>`,{wide:true,className:'vp-modal vp-editor-modal'});
  }
  function formDraft(form) {
    const values=new FormData(form),featuredIds=values.getAll('featuredBadges').filter((id)=>Object.hasOwn(api.state.artifacts||{},id)).slice(0,3);
    return {...clean({name:values.get('name'),avatar:values.get('avatar'),bio:values.get('bio'),status:values.get('status'),statusText:values.get('statusText'),accent:values.get('accent'),theme:values.get('theme'),banner:values.get('banner'),frame:values.get('frame'),layout:values.get('layout'),animated:values.get('animated')==='on',featuredBadges:featuredIds}),badge:api.state.profile.badge};
  }
  function updatePreview(form) {
    draft=formDraft(form);
    const preview=document.getElementById('vp-editor-preview');if(preview)preview.innerHTML=card(draft,'self',true);
    const accent=document.getElementById('vp-accent-label');if(accent)accent.textContent=draft.accent.toUpperCase();
  }
  function settings() {
    if(!api)return;
    normalize();const p=api.state.profile,s=api.state.settings;
    api.modal(`<div class="vp-settings"><p class="vp-eyebrow">CLIENT PREFERENCES</p><h2 class="modal-heading">Set your atmosphere.</h2><p class="modal-copy">Fine-tune the space around the conversation.</p><form id="vp-settings-form"><div class="vp-settings-section"><div class="vp-section-title">COLOR WORLD</div><div class="vp-theme-options">${Object.entries(themes).map(([id,t])=>`<label class="vp-theme-option vp-theme-${id}"><input type="radio" name="theme" value="${id}"${p.theme===id?' checked':''}><span class="vp-theme-window"><i></i><b></b><em></em></span><strong>${t.name}</strong><small>${t.note}</small><span class="vp-theme-check">✓</span></label>`).join('')}</div></div><div class="vp-settings-section"><label class="vp-switch-row"><span><b>Compact conversations</b><small>More messages. A little less space between them.</small></span><input name="compact" type="checkbox"${s.compact?' checked':''}><i></i></label><label class="vp-switch-row"><span><b>Decorative motion</b><small>${systemReduced()?'Your system requests reduced motion. That preference is honored.':'Allow subtle entrance, profile, and interface transitions.'}</small></span><input name="motion" type="checkbox"${s.motion?' checked':''}><i></i></label><label class="vp-switch-row"><span><b>Show community sidebar</b><small>Keep familiar faces and your collection in view.</small></span><input name="memberSidebar" type="checkbox"${s.memberSidebar?' checked':''}><i></i></label></div><div class="vp-settings-section"><div class="vp-section-title">YOUR CLIENT, YOUR DATA</div><div class="vp-setting-links"><button type="button" data-vp-replay><span>Replay the entrance<small>The full Afterhours client entry sequence.</small></span><span>↗</span></button><button type="button" data-action="export"><span>Export your archive<small>Save messages, identity, and artifacts as JSON.</small></span><span>↓</span></button><button type="button" data-action="import"><span>Import an archive<small>Restore an exported VOIDLINE archive.</small></span><span>↑</span></button><button type="button" data-action="download"><span>Take VOIDLINE offline<small>Download the complete single-file client.</small></span><span>↗</span></button></div></div><div class="vp-settings-footer"><span>Changes save automatically on this device.</span><button type="submit" class="primary-button">Done</button></div></form></div>`,{wide:true,className:'vp-modal vp-settings-modal'});
  }
  function saveSettings(form) {
    const values=new FormData(form),theme=pick(values.get('theme'),Object.keys(themes),'midnight');
    api.state.profile.theme=theme;
    api.state.settings={...api.state.settings,compact:values.get('compact')==='on',motion:values.get('motion')==='on',memberSidebar:values.get('memberSidebar')==='on'};
    applyAppearance();api.persist();api.refresh();
  }
  function init(shared) {
    api=shared;normalize();applyAppearance();
    document.addEventListener('click',(event)=>{
      const node=event.target.closest?.('[data-vp-edit],[data-vp-cancel],[data-vp-dm],[data-vp-friend],[data-vp-replay]');
      if(!node)return;
      event.preventDefault();
      if(node.hasAttribute('data-vp-edit'))return edit();
      if(node.hasAttribute('data-vp-cancel'))return open('self');
      if(node.hasAttribute('data-vp-dm')){api.closeModal();api.dm?.(node.dataset.vpDm);return;}
      if(node.hasAttribute('data-vp-friend')){api.toggleFriend?.(node.dataset.vpFriend);open(node.dataset.vpFriend);return;}
      if(node.hasAttribute('data-vp-replay')){api.closeModal();window.VoidEntrance?.replay?.();return;}
    });
    document.addEventListener('input',(event)=>{
      const form=event.target.closest?.('#vp-profile-form');if(form)updatePreview(form);
    });
    document.addEventListener('change',(event)=>{
      const profileForm=event.target.closest?.('#vp-profile-form');
      if(profileForm){
        if(event.target.name==='featuredBadges'&&profileForm.querySelectorAll('[name="featuredBadges"]:checked').length>3){event.target.checked=false;api.toast('Choose up to three featured artifacts.');}
        updatePreview(profileForm);
      }
      const settingsForm=event.target.closest?.('#vp-settings-form');if(settingsForm)saveSettings(settingsForm);
    });
    document.addEventListener('submit',(event)=>{
      if(event.target.id==='vp-profile-form'){
        event.preventDefault();
        const next=formDraft(event.target);
        if(!next.name.trim())return;
        Object.assign(api.state.profile,next);applyAppearance();api.persist();api.refresh();
        window.dispatchEvent(new CustomEvent('voidline:progress',{detail:{kind:'profile'}}));
        open('self');api.toast('Identity saved. Your world looks good.');
      }
      if(event.target.id==='vp-settings-form'){event.preventDefault();saveSettings(event.target);api.closeModal();}
    });
    const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');query?.addEventListener?.('change',applyAppearance);
    return window.VoidProfiles;
  }
  window.VoidProfiles={init,open,edit,settings,applyAppearance,isComplete:()=>!!api&&api.state.profile.name!=='you'&&api.state.profile.bio.length>=20&&api.state.profile.statusText.length>=3,clean};
})();
