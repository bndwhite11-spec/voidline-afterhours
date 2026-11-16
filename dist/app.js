(() => {
  'use strict';
  const STORE = 'voidline.local.v1';
  const $ = (id) => document.getElementById(id);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => window.crypto?.randomUUID?.() || `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const badges = {
    larp: {name:'LARP PRO MAX', icon:'✦', color:'violet', description:'For taking the bit a little too far. Maximum aura, zero monthly payments.'},
    founder: {name:'FOUNDING GHOST', icon:'◇', color:'mint', description:'You were here before it was cool. An original resident of the void.'},
    night: {name:'NIGHT CREATURE', icon:'☾', color:'orange', description:'One more message. One more track. Definitely going to sleep soon.'}
  };
  const baseServers = {
    afterhours: {name:'Afterhours', icon:'A', description:'Good company. Questionable sleep schedules.', channels:[['general','The room where everything happens.'],['introductions','Find your people. Start with a hello.'],['the-feed','Things worth sending to the group chat.'],['larp-lounge','Commit to the bit. Respect the lore.'],['announcements','The latest from the Afterhours crew.']]},
    arcade: {name:'The Arcade', icon:'✧', description:'One more round. You know the drill.', channels:[['general','The lobby is always open.'],['looking-for-group','Find a party for your next adventure.'],['high-scores','Small wins. Big screenshots.'],['announcements','Updates from the arcade.']]},
    studio: {name:'Studio 404', icon:'▧', description:'A home for unfinished masterpieces.', channels:[['general','A little creative chaos.'],['work-in-progress','Show the rough edges.'],['inspiration','The things that make you make things.'],['announcements','Notes from the studio.']]}
  };
  const people = {
    nova: {name:'nova', avatar:'N', color:'purple', status:'collecting side quests', badge:'larp'},
    ghost: {name:'ghost.wav', avatar:'G', color:'mint', status:'a little off the grid', badge:'founder'},
    pixel: {name:'pixel', avatar:'P', color:'pink', status:'rendering a new personality', badge:'night'},
    orbit: {name:'orbit', avatar:'O', color:'blue', status:'somewhere in the void', badge:''},
    moss: {name:'moss', avatar:'M', color:'orange', status:'touching grass, allegedly', badge:'night'}
  };
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (_) {}
  const state = {
    server: typeof stored.server === 'string' ? stored.server : 'afterhours',
    channel: typeof stored.channel === 'string' ? stored.channel : 'general',
    profile: {name: typeof stored.profile?.name === 'string' ? stored.profile.name.slice(0,24) : 'you', avatar: ['Y','✦','☾','◇','☺','V'].includes(stored.profile?.avatar) ? stored.profile.avatar : 'Y', badge: Object.hasOwn(badges, stored.profile?.badge) ? stored.profile.badge : 'larp'},
    messages: {}, customServers: [], mute:false, deafen:false
  };
  if (Array.isArray(stored.customServers)) state.customServers = stored.customServers.filter((s) => s && /^custom-[a-z0-9-]+$/.test(s.id) && typeof s.name === 'string' && s.name.trim()).slice(0,12).map((s) => ({id:s.id,name:s.name.trim().slice(0,32)}));
  if (stored.messages && typeof stored.messages === 'object' && !Array.isArray(stored.messages)) {
    Object.entries(stored.messages).forEach(([key, list]) => {
      if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(key) || !Array.isArray(list)) return;
      state.messages[key] = list.filter((m) => m && typeof m.id === 'string' && typeof m.text === 'string' && typeof m.author === 'string').slice(-100).map((m) => ({id:m.id.slice(0,80),text:m.text.slice(0,4000),author:Object.hasOwn(people,m.author) ? m.author : 'self',time:typeof m.time==='number' && Number.isFinite(m.time) && Math.abs(m.time)<8640000000000000 ? m.time : Date.now(),pinned:!!m.pinned,image:typeof m.image==='string' && /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(m.image) && m.image.length<2900000 ? m.image : '',reactions:Array.isArray(m.reactions) ? m.reactions.filter((r)=>r && ['🔥','✦','💜','😂','👀','👍','🌙'].includes(r.emoji)).map((r)=>({emoji:r.emoji,count:Math.max(0,Math.min(999,Number(r.count)||0)),mine:!!r.mine})) : []}));
    });
  }
  let pendingImage = '', pendingImageName = '', installPrompt = null, toastTimer, priorFocus;
  const drafts = new Map();
  const servers = () => ({...baseServers, ...Object.fromEntries(state.customServers.map((s) => [s.id,{name:s.name,icon:s.name[0].toUpperCase(),description:'Your own corner of the void.',channels:[['general','Your space. Your conversation.'],['announcements','News for your new community.']]}]))});
  const currentServer = () => servers()[state.server];
  const key = () => `${state.server}/${state.channel}`;
  const badgeHTML = (id, compact=false) => badges[id] ? `<span class="badge badge-${badges[id].color}${compact?' badge-compact':''}" title="${esc(badges[id].name)}">${badges[id].icon} ${esc(badges[id].name)}</span>` : '';
  const self = () => ({name:state.profile.name,avatar:state.profile.avatar,color:'purple',status:'in your own orbit',badge:state.profile.badge});
  const person = (id) => id==='self' ? self() : people[id] || self();
  function toast(message) { const node=$('toast'); if(!node)return; node.textContent=message; node.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>node.classList.remove('show'),3500); }
  function save() { try {localStorage.setItem(STORE,JSON.stringify({server:state.server,channel:state.channel,profile:state.profile,messages:state.messages,customServers:state.customServers}));} catch(_) {toast('Device storage is full. Your latest changes will last for this session.');} }
  function seed() {
    const now = Date.now();
    const msg=(author,text,minutes,reactions=[],extra={})=>({id:uid(),author,text,time:now-minutes*60000,reactions:reactions.map(([emoji,count])=>({emoji,count,mine:false})),...extra});
    const seeds={
      'afterhours/general':[
        msg('nova','the internet feels a little smaller in here. i like it.',34,[['💜',8],['✦',3]],{pinned:true}),
        msg('ghost','a corner of the internet with no algorithm? extremely suspicious. i’m staying.',31,[['😂',5]]),
        msg('pixel','just claimed LARP Pro Max. my imaginary credentials have never looked better.',27,[['🔥',6],['👀',2]]),
        msg('orbit','is “professional lurker” a valid introduction or do i have to develop a personality',23,[['😂',4]]),
        msg('nova','lurking is an art form. you’re among friends.',21,[['💜',5]]),
        msg('moss','tonight’s agenda: share something good, overthink a playlist, stay up too late 🌙',16,[['🌙',4],['👍',2]],{pinned:true})
      ],
      'afterhours/introductions':[msg('nova','name, current obsession, and one wildly unnecessary fun fact. go.',70,[['💜',3]],{pinned:true}),msg('ghost','ghost. collecting obscure ambient records. i have strong opinions about loading screens.',64),msg('pixel','pixel / making things / can identify a font from across the room. unfortunately.',58,[['😂',3]])],
      'afterhours/the-feed':[msg('moss','a reminder to save the thing you made, drink some water, and send that song to your friend.',52,[['💜',4]]),msg('orbit','current mood: a 3am drive in a city i’ve never visited.',37,[['🌙',2]])],
      'afterhours/larp-lounge':[msg('pixel','the council has assembled. first order of business: better badges.',45,[['✦',4]]),msg('nova','motion passed. everyone gets a dramatic title and absolutely no actual responsibilities.',38,[['😂',5]])],
      'afterhours/announcements':[msg('nova','Welcome to VOIDLINE. This is a local-first demo: sample conversations set the scene, and anything you post stays in this browser. Choose a badge, make yourself at home, and build your corner of the void.',180,[['💜',12]],{pinned:true})],
      'arcade/general':[msg('orbit','lobby’s open. what are we playing tonight?',28,[['👀',2]]),msg('moss','something cooperative. my competitive era lasted exactly nine minutes.',20,[['😂',3]])],
      'studio/general':[msg('pixel','show us something you made, even if it’s unfinished. especially if it’s unfinished.',46,[['💜',4]],{pinned:true}),msg('ghost','today’s progress: renamed final_final_v3 to actually_final_v4.',33,[['😂',6]])]
    };
    Object.entries(seeds).forEach(([k,messages])=>{if(!Object.hasOwn(state.messages,k))state.messages[k]=messages;});
  }
  function ensureChannel() { if(!Object.hasOwn(servers(),state.server))state.server='afterhours'; if(!currentServer().channels.some(([id])=>id===state.channel))state.channel='general'; if(!state.messages[key()])state.messages[key()]=[]; }
  function modal(content) { priorFocus=document.activeElement; $('modal-content').innerHTML=content; const dialog=$('app-modal'); if(!dialog.open)dialog.showModal(); }
  function closeModal() { $('app-modal').close(); priorFocus?.focus?.(); }
  function renderServers() {
    const rail=$('server-list');
    if(rail) {
      rail.querySelectorAll('.custom-server').forEach((node)=>node.remove());
      state.customServers.forEach((s)=>{const button=document.createElement('button');button.type='button';button.className='server-button custom-server';button.dataset.server=s.id;button.textContent=s.name[0].toUpperCase();button.title=s.name;button.setAttribute('aria-label',s.name);const add=rail.querySelector('[data-action="add-server"]');rail.insertBefore(button,add);});
    }
    document.querySelectorAll('[data-server]').forEach((node)=>{const active=node.dataset.server===state.server;node.classList.toggle('active',active);node.classList.toggle('is-active',active);node.setAttribute('aria-pressed',String(active));});
    const title=$('server-name');if(title)title.textContent=currentServer().name;
    const subtitle=$('server-description');if(subtitle)subtitle.textContent=currentServer().description;
    document.querySelectorAll('[data-server-name]').forEach((node)=>node.textContent=currentServer().name);
  }
  function renderChannels() {
    $('channel-list').innerHTML=`<div class="channel-section-label">TEXT CHANNELS <span>＋</span></div>${currentServer().channels.map(([id])=>`<button class="channel-button${id===state.channel?' active':''}" data-channel="${esc(id)}" aria-current="${id===state.channel?'page':'false'}"><span class="channel-hash">${id==='announcements'?'⌁':'#'}</span><span class="channel-label">${esc(id)}</span>${id==='general'?'<span class="channel-unread"></span>':''}</button>`).join('')}<div class="channel-section-label voice-section-label">VOICE CHANNELS</div><button class="channel-button voice-channel" data-action="voice"><span class="channel-hash">◖</span><span class="channel-label">midnight-radio</span><span class="voice-demo-label">DEMO</span></button><div class="voice-members"><span class="avatar avatar-xs avatar-mint">G</span><span class="avatar avatar-xs avatar-orange">M</span><span class="voice-demo-copy">sample room</span></div>`;
    $('channel-title').textContent=state.channel;
    $('channel-description').textContent=currentServer().channels.find(([id])=>id===state.channel)?.[1]||'';
    const readonly=state.channel==='announcements';
    $('message-input').disabled=readonly;
    $('send-btn').disabled=readonly;
    $('message-input').placeholder=readonly?'Only moderators can post announcements':`Message #${state.channel}`;
    $('message-form').classList.toggle('read-only',readonly);
    $('message-input').setAttribute('aria-label',`Message ${state.channel}`);
  }
  function renderMessages(scroll=true) {
    const messages=state.messages[key()]||[];
    const date=new Intl.DateTimeFormat(undefined,{month:'long',day:'numeric',year:'numeric'}).format(new Date());
    $('chat-feed').innerHTML=`<div class="welcome"><div class="welcome-icon">#</div><div class="welcome-eyebrow">YOUR LITTLE CORNER OF THE INTERNET</div><h1>Welcome to <span>#${esc(state.channel)}</span></h1><p>${state.channel==='general'?"It's quiet hours. Make some noise.":esc(currentServer().channels.find(([id])=>id===state.channel)?.[1]||'Make yourself at home.')}</p><div class="welcome-pills"><span>✦ Good vibes, weird hours</span><button data-action="badges">◇ Find your badge <span>↗</span></button></div></div><div class="day-divider"><span>${esc(date)}</span></div>${messages.length?messages.map(renderMessage).join(''):'<div class="empty-state">A fresh channel. A blank canvas.<br>Be the first to leave a message.</div>'}`;
    if(scroll)$('chat-feed').scrollTop=$('chat-feed').scrollHeight;
  }
  function renderMessage(m) {
    const p=person(m.author), time=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(m.time));
    return `<article class="message${m.author==='self'?' own-message':''}" data-message-id="${esc(m.id)}"><button class="avatar avatar-${esc(p.color)}" data-person="${esc(m.author)}" aria-label="View ${esc(p.name)}’s profile">${esc(p.avatar)}</button><div class="message-main"><div class="message-meta"><button class="username" data-person="${esc(m.author)}">${esc(p.name)}</button>${badgeHTML(p.badge,true)}<time class="timestamp" datetime="${new Date(m.time).toISOString()}">${esc(time)}</time>${m.pinned?'<span class="message-pin" title="Pinned message">⌖</span>':''}</div><div class="message-text">${esc(m.text).replace(/\n/g,'<br>')}</div>${m.image?`<a href="${m.image}" target="_blank" rel="noopener" class="message-image-link" aria-label="Open attached image"><img class="message-image" alt="Image attached by ${esc(p.name)}" src="${m.image}" loading="lazy"></a>`:''}<div class="reactions">${(m.reactions||[]).map((r)=>`<button class="reaction${r.mine?' selected':''}" data-react="${esc(r.emoji)}" data-id="${esc(m.id)}" aria-label="React ${esc(r.emoji)}, ${r.count} reactions" aria-pressed="${!!r.mine}">${r.emoji} <span>${r.count}</span></button>`).join('')}<button class="reaction add-reaction" data-react="💜" data-id="${esc(m.id)}" aria-label="Add a heart reaction">♡ +</button></div></div></article>`;
  }
  function renderProfile() {
    if($('self-name'))$('self-name').textContent=state.profile.name;
    if($('self-status'))$('self-status').textContent='Local demo · online';
    if($('self-avatar'))$('self-avatar').innerHTML=`${esc(state.profile.avatar)}<i class="presence"></i>`;
    $('member-list').innerHTML=`<div class="member-section-label">IN THIS DEMO — ${Object.keys(people).length+1}</div>${[['self',self()],...Object.entries(people)].map(([id,p])=>`<button class="member" data-person="${esc(id)}"><span class="avatar avatar-${esc(p.color)}">${esc(p.avatar)}<i class="status-dot"></i></span><span class="member-info"><span class="member-name">${esc(p.name)} ${p.badge?`<span class="member-badge" title="${esc(badges[p.badge].name)}">${badges[p.badge].icon}</span>`:''}</span><span class="member-status">${esc(p.status)}</span></span></button>`).join('')}`;
    if($('online-count'))$('online-count').textContent='6';
  }
  function renderAll(){ensureChannel();renderServers();renderChannels();renderMessages();renderProfile();save();}
  function showBadges() {modal(`<div class="modal-eyebrow">MAKE IT OFFICIAL(ISH)</div><h2 class="modal-heading">A little badge. Big energy.</h2><p class="modal-copy">All the prestige. None of the subscription. Pick your identity for this device.</p><div class="badge-grid">${Object.entries(badges).map(([id,b])=>`<button class="badge-option${state.profile.badge===id?' equipped':''}" data-equip="${id}"><span class="badge-emblem badge-${b.color}">${b.icon}</span>${badgeHTML(id)}<p>${b.description}</p><span class="badge-claim">${state.profile.badge===id?'✓ Equipped':'Equip badge →'}</span></button>`).join('')}</div>`);}
  function showProfile() {modal(`<div class="modal-eyebrow">YOUR SIGNAL IN THE NOISE</div><h2 class="modal-heading">Edit your profile</h2><form id="profile-form"><label class="field-label" for="profile-name">DISPLAY NAME</label><input class="text-field" id="profile-name" name="name" maxlength="24" value="${esc(state.profile.name)}" required autocomplete="nickname"><div class="field-label">AVATAR</div><div class="avatar-options">${['Y','✦','☾','◇','☺','V'].map((symbol)=>`<button type="button" class="avatar-option${symbol===state.profile.avatar?' selected':''}" data-avatar="${symbol}" aria-pressed="${symbol===state.profile.avatar}">${symbol}</button>`).join('')}</div><input type="hidden" name="avatar" value="${esc(state.profile.avatar)}"><div class="profile-badge-row">${badgeHTML(state.profile.badge)}<button type="button" class="text-button" data-action="badges">Change badge ↗</button></div><div class="modal-actions"><button class="primary-button" type="submit">Save changes</button></div></form>`);}
  function showPerson(id) {if(id==='self')return showProfile();const p=people[id];if(!p)return;modal(`<div class="profile-card-cover"></div><div class="avatar avatar-large avatar-${p.color}">${p.avatar}</div><h2 class="modal-heading">${esc(p.name)}</h2>${badgeHTML(p.badge)}<p class="modal-copy">${esc(p.status)}</p><div class="sample-panel"><span class="modal-eyebrow">SAMPLE COMMUNITY MEMBER</span><p>This profile is part of the demo conversation. New messages you write stay on this device.</p></div>`);}
  function showDownload() {
    const offline=document.documentElement?.dataset?.offline==='true';
    const href=offline ? location.href : 'downloads/voidline-offline.html';
    modal(`<div class="modal-eyebrow">TAKE THE VOID WITH YOU</div><h2 class="modal-heading">${offline?'You’re already offline.':'Your corner. Anywhere.'}</h2><p class="modal-copy">${offline?'You’re using the complete offline edition of VOIDLINE. Save a copy of this HTML file to keep it or move it to another device.':'Download the complete offline app, then open it in a browser. Chat, customize your profile, and collect badges without an internet connection.'}</p><a class="download-option" href="${esc(href)}" download="VOIDLINE.html"><span class="download-icon">↓</span><span><strong>${offline?'Save an offline copy':'Download VOIDLINE'}</strong><small>Single HTML file · Windows, macOS & Linux</small></span><span>↗</span></a>${!offline?'<a class="download-option source-download" href="downloads/voidline-source.zip" download="VOIDLINE-source.zip"><span class="download-icon">⌘</span><span><strong>Get the source</strong><small>Complete app source · ZIP archive</small></span><span>↗</span></a>':''}${installPrompt&&!offline?'<button class="download-option" data-install><span class="download-icon">▣</span><span><strong>Install web app</strong><small>Add VOIDLINE to this device</small></span><span>＋</span></button>':''}<div class="sample-panel"><p>Local demo: your history is saved separately in each browser. A new copy starts fresh. This build has no shared messaging server or live calls.</p></div>`);
  }
  function showNetwork() {modal(`<div class="modal-eyebrow">TRANSPARENT BY DESIGN</div><h2 class="modal-heading">Network demo</h2><p class="modal-copy">An example connection card. All values below are sample data, and this panel never collects an IP address.</p><div class="sample-panel network-sample"><span class="sample-tag">SAMPLE DATA</span><dl><div><dt>Documentation IP</dt><dd>203.0.113.42</dd></div><div><dt>Connection</dt><dd>Local simulation</dd></div><div><dt>Latency</dt><dd>24 ms (sample)</dd></div><div><dt>Collection</dt><dd>None</dd></div></dl></div><p class="modal-footnote">203.0.113.0/24 is reserved for documentation. No geolocation, IP lookup, or tracking endpoint is used by this demo.</p>`);}
  function showVoice() {modal(`<div class="modal-eyebrow">MIDNIGHT RADIO</div><h2 class="modal-heading">A room for the late hours.</h2><div class="voice-card"><div class="voice-wave">▂ ▅ ▃ ▇ ▄ ▆ ▂ ▅ ▃</div><span class="sample-tag">LOCAL VOICE ROOM DEMO</span><p>Imagine the soundtrack. Bring the company.</p></div><p class="modal-copy">This preview shows the room interface. It does not use your microphone or connect a call.</p><div class="modal-actions"><button class="primary-button" data-voice-preview>Preview room controls</button></div>`);}
  function showSearch(query) {
    const q=query.trim().toLocaleLowerCase();if(!q)return;
    const results=[];
    Object.entries(state.messages).forEach(([channel,messages])=>messages.forEach((m)=>{if(m.text.toLocaleLowerCase().includes(q)){const [server,id]=channel.split('/');if(Object.hasOwn(servers(),server))results.push({m,server,channel:id});}}));
    modal(`<div class="modal-eyebrow">SEARCH YOUR LOCAL HISTORY</div><h2 class="modal-heading">${results.length} result${results.length===1?'':'s'} for “${esc(query.slice(0,80))}”</h2><div class="search-list">${results.slice(-40).reverse().map(({m,server,channel})=>`<button class="search-hit" data-search-server="${esc(server)}" data-search-channel="${esc(channel)}" data-search-message="${esc(m.id)}"><span class="search-hit-location">${esc(servers()[server].name)} / #${esc(channel)}</span><strong>${esc(person(m.author).name)}</strong><p>${esc(m.text.slice(0,220))}</p></button>`).join('')||'<p class="empty-state">No messages found. Try a different word.</p>'}</div>`);
  }
  function clearAttachment() {pendingImage='';pendingImageName='';$('attachment-chip')?.remove();$('message-input').placeholder=state.channel==='announcements'?'Only moderators can post announcements':`Message #${state.channel}`;}
  function renderAttachment() {
    $('attachment-chip')?.remove();
    if(!pendingImage)return;
    const chip=document.createElement('div');chip.id='attachment-chip';chip.className='attachment-chip';chip.innerHTML=`<span>▧ ${esc(pendingImageName.slice(0,48)||'Attached image')}</span><button type="button" data-remove-attachment aria-label="Remove attachment">×</button>`;$('message-form').before(chip);
  }
  function rememberDraft() {drafts.set(key(),{text:$('message-input').value,image:pendingImage,name:pendingImageName});}
  function restoreDraft() {
    clearAttachment();const draft=drafts.get(key());$('message-input').value=draft?.text||'';pendingImage=draft?.image||'';pendingImageName=draft?.name||'';renderAttachment();$('message-input').style.height='auto';$('message-input').style.height=`${Math.min($('message-input').scrollHeight,140)}px`;
  }
  function changeContext(server,channel) {rememberDraft();state.server=server;state.channel=channel;document.body.classList.remove('mobile-nav');renderAll();restoreDraft();}
  function attachImage() {
    if(state.channel==='announcements')return toast('Announcements are read-only.');
    const attachmentKey=key(),channelName=state.channel;
    const picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp,image/gif';
    picker.addEventListener('change',()=>{const file=picker.files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))return toast('Choose a PNG, JPEG, WebP, or GIF image.');if(file.size>2*1024*1024)return toast('Choose an image smaller than 2 MB.');const reader=new FileReader();reader.onload=()=>{
      if(typeof reader.result!=='string')return;
      if(attachmentKey!==key()){const draft=drafts.get(attachmentKey)||{text:''};draft.image=reader.result;draft.name=file.name;drafts.set(attachmentKey,draft);return toast(`Image attached to your #${channelName} draft.`);}
      pendingImage=reader.result;pendingImageName=file.name;renderAttachment();rememberDraft();$('message-input').focus();toast('Image attached. Add a message or press Send.');
    };reader.readAsDataURL(file);});picker.click();
  }
  function sendMessage(event) {event?.preventDefault();if(state.channel==='announcements')return;const input=$('message-input'),text=input.value.trim().slice(0,4000);if(!text&&!pendingImage)return;const list=state.messages[key()]||(state.messages[key()]=[]);list.push({id:uid(),author:'self',text,time:Date.now(),reactions:[],image:pendingImage});if(list.length>100)list.shift();input.value='';input.style.height='';clearAttachment();drafts.delete(key());save();renderMessages();input.focus();}
  function handleAction(action, button) {
    const actions={
      profile:showProfile,badges:showBadges,gift:showBadges,download:showDownload,network:showNetwork,voice:showVoice,
      members:()=>{const desktop=window.matchMedia?.('(min-width: 1051px)').matches??(window.innerWidth>=1051);const open=desktop?!document.body.classList.toggle('members-hidden'):document.body.classList.toggle('members-open');button?.setAttribute('aria-expanded',String(open));},
      menu:()=>{const open=document.body.classList.toggle('mobile-nav');button?.setAttribute('aria-expanded',String(open));},
      mute:()=>{state.mute=!state.mute;button.classList.toggle('toggled',state.mute);button.setAttribute('aria-pressed',String(state.mute));toast(state.mute?'Microphone muted in the local demo.':'Microphone control unmuted. No live call is connected.');},
      deafen:()=>{state.deafen=!state.deafen;button.classList.toggle('toggled',state.deafen);button.setAttribute('aria-pressed',String(state.deafen));toast(state.deafen?'Audio deafened in the local demo.':'Audio control restored. No live audio is playing.');},
      attachment:attachImage,
      emoji:()=>modal(`<h2 class="modal-heading">Set the mood.</h2><div class="emoji-grid">${['💜','🔥','🌙','😂','👀','✦','👍','🫡','✨','🎮','🪩','👻','🖤','💭','🛸','☕'].map((e)=>`<button data-emoji="${e}" aria-label="Insert ${e}">${e}</button>`).join('')}</div>`),
      invite:()=>modal(`<div class="modal-eyebrow">GOOD COMPANY STARTS SOMEWHERE</div><h2 class="modal-heading">Share your corner.</h2><p class="modal-copy">You can share the app link with a friend. Each person gets their own local demo; messages are not shared between devices.</p><div class="modal-actions"><button class="primary-button" data-copy-link>Copy app link</button></div>`),
      inbox:()=>modal(`<div class="modal-eyebrow">YOUR INBOX</div><h2 class="modal-heading">All caught up.</h2><div class="empty-state">✧<br>No mentions or notifications here yet.</div><p class="modal-copy">This local demo has no live notifications or shared messages.</p>`),
      help:()=>modal(`<div class="modal-eyebrow">A QUICK TRANSMISSION</div><h2 class="modal-heading">Welcome to the void.</h2><div class="help-list"><p><strong>Enter</strong> sends your message.</p><p><strong>Shift + Enter</strong> adds a new line.</p><p><strong>Ctrl / ⌘ + K</strong> focuses search.</p><p><strong>Esc</strong> closes a dialog or mobile navigation.</p></div><p class="modal-copy">Choose a server, explore channels, and edit your profile using your avatar. Your messages and badge stay in this browser. Image attachments are limited to 2 MB.</p><button class="secondary-button" data-action="download">Download the offline app ↗</button>`),
      pinned:()=>{const list=(state.messages[key()]||[]).filter((m)=>m.pinned);modal(`<div class="modal-eyebrow">#${esc(state.channel)}</div><h2 class="modal-heading">Pinned transmissions</h2>${list.map((m)=>`<div class="sample-panel"><strong>${esc(person(m.author).name)}</strong><p>${esc(m.text)}</p></div>`).join('')||'<p class="empty-state">No pins in this channel yet.</p>'}`);},
      'server-menu':()=>modal(`<div class="modal-eyebrow">YOUR CURRENT SPACE</div><h2 class="modal-heading">${esc(currentServer().name)}</h2><p class="modal-copy">${esc(currentServer().description)}</p><div class="modal-actions"><button class="primary-button" data-action="invite">Share app link</button><button class="secondary-button" data-action="add-server">Create a local server</button></div>`),
      'add-server':()=>modal(`<div class="modal-eyebrow">MAKE SOME SPACE</div><h2 class="modal-heading">Create your own corner.</h2><p class="modal-copy">A new server, saved on this device. Start with a name.</p><form id="server-form"><label class="field-label" for="new-server-name">SERVER NAME</label><input class="text-field" id="new-server-name" name="name" maxlength="32" placeholder="The secret third place" required><div class="modal-actions"><button class="primary-button" type="submit">Create server</button></div></form>`)
    };actions[action]?.();
  }
  function boot() {
    if(!$('chat-feed')||!$('app-modal'))return;
    seed();renderAll();$('chat-feed').scrollTop=0;
    $('modal-close').addEventListener('click',closeModal);
    $('app-modal').addEventListener('click',(e)=>{if(e.target===$('app-modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
    $('message-form').addEventListener('submit',sendMessage);
    $('message-input').addEventListener('keydown',(e)=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage();}});
    $('message-input').addEventListener('input',()=>{const input=$('message-input');input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,140)}px`;});
    $('message-input').maxLength=4000;
    $('search-input')?.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();showSearch(e.target.value);}});
    document.addEventListener('keydown',(e)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search-input')?.focus();}if(e.key==='Escape'){document.body.classList.remove('mobile-nav');document.body.classList.remove('members-open');}});
    document.addEventListener('submit',(e)=>{
      if(e.target.id==='profile-form'){e.preventDefault();const form=new FormData(e.target),name=String(form.get('name')||'').trim().slice(0,24);if(!name)return;state.profile.name=name;state.profile.avatar=String(form.get('avatar')||'Y');save();renderProfile();renderMessages(false);closeModal();toast('Profile updated. Your signal looks good.');}
      if(e.target.id==='server-form'){e.preventDefault();if(state.customServers.length>=12)return toast('You can create up to 12 local servers.');const name=String(new FormData(e.target).get('name')||'').trim().slice(0,32);if(!name)return;const id=`custom-${Date.now().toString(36)}`;state.customServers.push({id,name});closeModal();changeContext(id,'general');toast(`${name} is ready. Make yourself at home.`);}
    });
    document.addEventListener('click',async(e)=>{
      const button=e.target.closest('button, a, [data-action]');if(!button)return;
      if(button.dataset.server)return changeContext(button.dataset.server,'general');
      if(button.dataset.channel)return changeContext(state.server,button.dataset.channel);
      if(button.dataset.action){e.preventDefault();return handleAction(button.dataset.action,button);}
      if(button.dataset.person)return showPerson(button.dataset.person);
      if(button.dataset.equip){state.profile.badge=button.dataset.equip;save();renderProfile();renderMessages(false);showBadges();return toast(`${badges[state.profile.badge].name} equipped.`);}
      if(button.dataset.avatar){const form=$('profile-form');if(form){form.elements.avatar.value=button.dataset.avatar;form.querySelectorAll('[data-avatar]').forEach((node)=>{const selected=node===button;node.classList.toggle('selected',selected);node.setAttribute('aria-pressed',String(selected));});}return;}
      if(button.dataset.react){const message=(state.messages[key()]||[]).find((m)=>m.id===button.dataset.id);if(!message)return;message.reactions=message.reactions||[];let reaction=message.reactions.find((r)=>r.emoji===button.dataset.react);if(!reaction){reaction={emoji:button.dataset.react,count:0,mine:false};message.reactions.push(reaction);}reaction.mine=!reaction.mine;reaction.count=Math.max(0,reaction.count+(reaction.mine?1:-1));message.reactions=message.reactions.filter((r)=>r.count>0);const scroll=$('chat-feed').scrollTop;save();renderMessages(false);$('chat-feed').scrollTop=scroll;return;}
      if(button.dataset.emoji){const input=$('message-input');if(input.disabled){closeModal();return toast('Announcements are read-only.');}const start=input.selectionStart??input.value.length;input.value=input.value.slice(0,start)+button.dataset.emoji+input.value.slice(input.selectionEnd??start);closeModal();input.focus();input.selectionStart=input.selectionEnd=start+button.dataset.emoji.length;return;}
      if(button.hasAttribute('data-remove-attachment')){clearAttachment();rememberDraft();return;}
      if(button.dataset.searchMessage){closeModal();changeContext(button.dataset.searchServer,button.dataset.searchChannel);const message=Array.from($('chat-feed').querySelectorAll('[data-message-id]')).find((n)=>n.dataset.messageId===button.dataset.searchMessage);message?.scrollIntoView({block:'center',behavior:'smooth'});message?.classList.add('search-highlight');setTimeout(()=>message?.classList.remove('search-highlight'),2200);return;}
      if(button.hasAttribute('data-copy-link')){if(location.protocol==='file:')return toast('Open the hosted version to share its app link.');try{await navigator.clipboard.writeText(location.origin+location.pathname);toast('App link copied.');}catch(_){toast('Copy the app link from your browser’s address bar.');}return;}
      if(button.hasAttribute('data-voice-preview')){const active=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(active));button.textContent=active?'Leave demo room':'Preview room controls';return toast(active?'You entered the local room preview. No call is connected.':'You left the room preview.');}
      if(button.hasAttribute('data-install')&&installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;closeModal();return;}
    });
    window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();installPrompt=e;});
    window.addEventListener('appinstalled',()=>{installPrompt=null;toast('VOIDLINE installed. Welcome home.');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
