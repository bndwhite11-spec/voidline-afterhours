/* Shared text rooms. Local archives never enter this transport. */
(() => {
  'use strict';
  const API = '/api/live';
  const HOSTED = 'https://voidline-afterhours.pipedcactus1.chatgpt.site/';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const offlineEdition = document.documentElement.dataset.offline === 'true' || location.protocol === 'file:';
  const state = {active:false, phase:'idle', account:null, communities:[], communityId:'', channels:[], channelId:'', members:[], rooms:new Map(), generation:0, identityGeneration:0, poll:0, pendingInvite:'', error:'', network:'', drawer:'', sessionWarning:false};
  let app, root, originalScope, originalSearch, originalSearchLabel, focusBeforeDrawer;
  const initials = name => String(name || '?').trim().split(/\s+/).map(x => Array.from(x)[0]).slice(0,2).join('').toUpperCase();
  const community = () => state.communities.find(c => c.id === state.communityId);
  const channel = () => state.channels.find(c => c.id === state.channelId);
  const sessionKey = id => `voidline.shared.session.v1.${state.account?.id || 'guest'}.${id}`;
  const navKey = () => `voidline.shared.navigation.v1.${state.account?.id || 'guest'}`;
  const canPost = () => channel()?.kind !== 'announcement' || ['owner','moderator'].includes(community()?.role);
  function room(id = state.channelId) {
    if (!state.rooms.has(id)) {
      let saved = {};
      try { saved = JSON.parse(sessionStorage.getItem(sessionKey(id)) || '{}'); } catch (_) { /* private window */ }
      state.rooms.set(id, {messages:[], loaded:false, older:false, loading:false, syncing:false, draft:typeof saved.text === 'string' ? saved.text.slice(0,4000) : '', pending:Array.isArray(saved.pending) ? saved.pending.filter(p => p && typeof p.text === 'string' && p.text.length <= 4000 && /^[A-Za-z0-9_-]{8,100}$/.test(p.clientId)).slice(0,20).map(p => ({clientId:p.clientId,text:p.text,status:'failed',error:'Not confirmed. Retry uses the same message ID.'})) : [], error:''});
    }
    return state.rooms.get(id);
  }
  function saveSession(id = state.channelId) {
    if (!id || !state.account) return true;
    const r = room(id);
    try {
      sessionStorage.setItem(sessionKey(id), JSON.stringify({text:r.draft,pending:r.pending.map(p => ({clientId:p.clientId,text:p.text}))}));
      return true;
    } catch (_) {
      if (!state.sessionWarning) { state.sessionWarning = true; app.toast('This browser cannot save shared drafts. Keep this tab open until your messages are confirmed.'); }
      return false;
    }
  }
  function captureDraft() {
    if (!state.channelId || !$('live-message-input')) return;
    room().draft = $('live-message-input').value;
    saveSession();
  }
  function saveNavigation() {
    try { sessionStorage.setItem(navKey(), JSON.stringify({communityId:state.communityId,channelId:state.channelId})); } catch (_) { /* optional */ }
  }
  async function request(path, body) {
    const payload = body === undefined ? undefined : {...body,...(state.account?.id ? {expectedAccountId:state.account.id} : {})};
    const serialized = payload === undefined ? undefined : JSON.stringify(payload);
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(API + path, {method:body === undefined ? 'GET' : 'POST', credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:body === undefined ? {'accept':'application/json'} : {'accept':'application/json','content-type':'application/json'},...(body === undefined ? {} : {body:serialized})});
      let data;
      try { data = await response.json(); } catch (_) { throw new Error('The service returned an unreadable response. Try again.'); }
      if (!response.ok) {
        const error = new Error(data.error?.message || 'The request could not be completed.');
        error.status = response.status; error.code = data.error?.code || '';
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The connection timed out. Your unsent message is still here.');
      if (error instanceof TypeError) throw new Error('Connection lost. Check your connection and retry.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function inviteFrom(value) {
    const text = String(value || '').trim();
    if (/^[a-f0-9]{64}$/.test(text)) return text;
    try { const token = new URL(text).hash.match(/^#join=([a-f0-9]{64})$/)?.[1]; return token || ''; } catch (_) { return ''; }
  }
  function signInLink() {
    const path = location.pathname + location.search + (state.pendingInvite ? '#join=' + state.pendingInvite : '#shared');
    return '/signin-with-chatgpt?return_to=' + encodeURIComponent(path);
  }
  function syncChrome() {
    const scope = document.querySelector('.local-tag'), search = document.querySelector('.titlebar-command');
    document.querySelector('[data-action="live"]')?.classList.toggle('is-active',state.active);
    document.querySelector('[data-action="live"]')?.setAttribute('aria-pressed',String(state.active));
    if (scope) { scope.innerHTML = state.active ? `${icon('live')}<b>SHARED TEXT</b>` : originalScope; scope.title = state.active ? 'Shared rooms status' : 'Local archive status'; }
    if (search) {
      search.innerHTML = state.active ? `${icon('search')}<span>Search this room</span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ K' : 'Ctrl K'}</kbd>` : originalSearch;
      search.setAttribute('aria-label',state.active ? 'Search loaded shared messages' : originalSearchLabel);
    }
    document.querySelector('.skip-link')?.setAttribute('href',state.active ? '#live-main' : '#message-input');
  }
  function closeDrawers(restore = true) {
    state.drawer = '';
    document.body.classList.remove('live-nav-open','live-people-open');
    const main = $('live-main'); if (main) main.inert = false;
    document.querySelectorAll('[data-live="menu"],[data-live="people"]').forEach(n => n.setAttribute('aria-expanded','false'));
    if (restore && focusBeforeDrawer?.isConnected) focusBeforeDrawer.focus();
    focusBeforeDrawer = null;
  }
  function toggleDrawer(which) {
    if (state.drawer === which) return closeDrawers();
    closeDrawers(false); state.drawer = which; focusBeforeDrawer = document.activeElement;
    document.body.classList.add(which === 'nav' ? 'live-nav-open' : 'live-people-open');
    if (matchMedia('(max-width:760px)').matches || which === 'people') { const main = $('live-main'); if (main) main.inert = true; }
    document.querySelector(`[data-live="${which === 'nav' ? 'menu' : 'people'}"]`)?.setAttribute('aria-expanded','true');
    (which === 'nav' ? root.querySelector('.live-sidebar') : root.querySelector('.live-members'))?.querySelector('button,select,a')?.focus();
  }
  function exitLive() {
    captureDraft(); clearTimeout(state.poll); state.generation++; state.active = false; closeDrawers(false);
    root.hidden = true; document.body.classList.remove('vl-live-mode'); syncChrome();
    if (location.hash === '#shared' || /^#join=/.test(location.hash)) history.replaceState(null,'',location.pathname + location.search);
    app.renderAll();
  }
  async function enterLive() {
    app.closeModal(); app.closeThread(); document.body.classList.remove('mobile-nav','members-open');
    state.active = true; root.hidden = false; document.body.classList.add('vl-live-mode'); syncChrome();
    if (!/^#join=/.test(location.hash)) history.replaceState(null,'',location.pathname + location.search + '#shared');
    await connect();
  }
  function adoptAccount(account) {
    if (state.account?.id !== account?.id) {
      captureDraft(); state.identityGeneration++; clearTimeout(state.poll);
      state.rooms.clear(); state.communities = []; state.communityId = ''; state.channels = []; state.channelId = ''; state.members = []; state.network = ''; state.sessionWarning = false;
    }
    state.account = account;
  }
  function signOut() {
    captureDraft(); clearTimeout(state.poll); state.generation++; adoptAccount(null);
    state.phase = 'guest'; state.error = ''; renderShell();
  }
  async function connect() {
    captureDraft(); clearTimeout(state.poll);
    const generation = ++state.generation;
    state.phase = offlineEdition ? 'offline-edition' : 'loading'; state.error = ''; renderShell();
    if (offlineEdition) return;
    try {
      await request('/health');
      if (!state.active || generation !== state.generation) return;
      const data = await request('/me');
      if (!state.active || generation !== state.generation) return;
      adoptAccount(data.account);
      if (data.account.needsProfile) { state.phase = 'alias'; renderShell(); return; }
      await loadCommunities(generation);
    } catch (error) {
      if (!state.active || generation !== state.generation) return;
      if (error.status === 401) adoptAccount(null);
      state.phase = error.status === 401 ? 'guest' : 'unavailable'; state.error = error.message; renderShell();
    }
  }
  async function loadCommunities(generation = state.generation, preferredId = '') {
    const data = await request('/communities');
    if (!state.active || generation !== state.generation) return;
    state.communities = data.communities; state.phase = 'ready';
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(navKey()) || '{}'); } catch (_) { /* optional */ }
    const selected = data.communities.find(c => c.id === (preferredId || state.communityId || saved.communityId)) || data.communities[0];
    if (selected) await selectCommunity(selected.id, saved.channelId);
    else { state.communityId = ''; state.channelId = ''; state.channels = []; state.members = []; renderShell(); }
    if (state.pendingInvite && state.active) joinDialog(state.pendingInvite);
  }
  async function selectCommunity(id, preferredChannel = '') {
    captureDraft(); closeDrawers(false); clearTimeout(state.poll);
    const generation = ++state.generation;
    state.communityId = id; state.channelId = ''; state.channels = []; state.members = []; state.network = 'Connecting'; state.error = ''; renderShell();
    try {
      const [channels, members] = await Promise.all([request(`/communities/${encodeURIComponent(id)}/channels`),request(`/communities/${encodeURIComponent(id)}/members`)]);
      if (!state.active || generation !== state.generation) return;
      state.channels = channels.channels; state.members = members.members;
      const selected = state.channels.find(c => c.id === preferredChannel) || state.channels[0];
      if (selected) await selectChannel(selected.id);
      else { state.network = 'Connected'; renderShell(); }
    } catch (error) { if (generation === state.generation && state.active) { state.error = error.message; state.network = 'Connection interrupted'; renderShell(); } }
  }
  async function selectChannel(id) {
    if (!state.channels.some(c => c.id === id)) return;
    captureDraft(); closeDrawers(false); clearTimeout(state.poll);
    const generation = ++state.generation;
    state.channelId = id; state.error = ''; state.network = 'Connecting'; const r = room(id);
    r.loading = !r.loaded; renderShell(); saveNavigation();
    try {
      const data = await request(`/channels/${encodeURIComponent(id)}/messages?limit=50`);
      if (!state.active || generation !== state.generation) return;
      mergeMessages(id,data.messages); r.loaded = true; r.loading = false; r.older = data.page.hasMore || (r.older && r.messages.length > data.messages.length); r.error = ''; state.network = 'Connected';
      renderFeed({bottom:true}); updateConnection(); schedulePoll();
    } catch (error) { if (generation === state.generation && state.active) { r.loading = false; r.error = error.message; state.network = 'Connection interrupted'; renderFeed(); updateConnection(); schedulePoll(5000); } }
  }
  function mergeMessages(id, incoming) {
    const r = room(id), all = new Map(r.messages.map(m => [m.id,m]));
    for (const message of incoming) {
      all.set(message.id,message);
      if (message.author_id === state.account?.id) r.pending = r.pending.filter(p => p.clientId !== message.client_id);
    }
    r.messages = Array.from(all.values()).sort((a,b) => a.seq - b.seq); saveSession(id);
  }
  function schedulePoll(delay = 3000) { clearTimeout(state.poll); if (state.active && state.phase === 'ready' && state.channelId) state.poll = setTimeout(poll,delay); }
  async function poll() {
    if (!state.active || state.phase !== 'ready' || !state.channelId) return;
    if (document.hidden || !navigator.onLine) { state.network = navigator.onLine ? 'Paused in background' : 'Offline'; updateConnection(); schedulePoll(5000); return; }
    const id = state.channelId, generation = state.generation, r = room(id);
    if (r.syncing) { schedulePoll(); return; }
    r.syncing = true;
    try {
      const identity = await request('/me');
      if (!state.active || generation !== state.generation) return;
      if (identity.account.id !== state.account?.id) { await connect(); return; }
      const after = r.messages.at(-1)?.seq || 0;
      const data = await request(`/channels/${encodeURIComponent(id)}/messages?after=${after}&limit=100`);
      if (!state.active || generation !== state.generation) return;
      const newMessages = data.messages.filter(m => !r.messages.some(old => old.id === m.id));
      mergeMessages(id,data.messages); r.error = ''; r.loaded = true; state.network = 'Connected';
      if (newMessages.length) { renderFeed(); $('live-announcer').textContent = `${newMessages.length} new ${newMessages.length === 1 ? 'message' : 'messages'} in ${channel()?.name || 'this room'}.`; }
      else if ($('live-stream')?.querySelector('.live-history-error')) renderFeed();
      updateConnection(); schedulePoll(data.page.hasMore ? 80 : 3000);
    } catch (error) {
      if (generation !== state.generation || !state.active) return;
      if (error.status === 401) { signOut(); return; }
      state.network = navigator.onLine ? 'Reconnecting' : 'Offline'; updateConnection(); schedulePoll(5000);
    } finally { r.syncing = false; }
  }
  async function olderMessages(button) {
    const id = state.channelId, generation = state.generation, r = room(id);
    if (!r.older || !r.messages.length) return;
    button.disabled = true; button.textContent = 'Loading…';
    try {
      const data = await request(`/channels/${encodeURIComponent(id)}/messages?before=${r.messages[0].seq}&limit=50`);
      if (!state.active || generation !== state.generation) return;
      mergeMessages(id,data.messages); r.older = data.page.hasMore; renderFeed({prepend:true});
    } catch (error) { if (generation === state.generation) app.toast(error.message); }
    finally { if (button.isConnected) { button.disabled = false; button.textContent = 'Load earlier messages'; } }
  }
  function sidebarHTML() {
    const signedIn = !!state.account && ['ready','alias'].includes(state.phase), selected = community();
    return `<aside class="live-sidebar" aria-label="Shared room navigation"><header class="live-sidebar-heading"><span class="eyebrow">THE SHARED FREQUENCY</span><h2>Afterhours, together.</h2><p>Small rooms. Familiar voices.</p></header>${signedIn ? `<div class="live-space-picker"><label for="live-community-select">YOUR COMMUNITIES</label><select id="live-community-select" aria-label="Choose a shared community" ${state.communities.length ? '' : 'disabled'}>${state.communities.length ? state.communities.map(c => `<option value="${esc(c.id)}" ${c.id === state.communityId ? 'selected' : ''}>${esc(c.name)}</option>`).join('') : '<option>No communities yet</option>'}</select></div><div class="live-space-actions"><button data-live="create">${icon('plus')} Create</button><button data-live="join">${icon('live')} Join</button></div><div class="live-channel-heading"><span>TEXT ROOMS</span>${selected?.role === 'owner' ? `<button data-live="add-channel" aria-label="Create a shared channel">${icon('plus')}</button>` : ''}</div><nav class="live-channel-list" aria-label="Shared text channels">${state.channels.map(c => `<button data-live-channel="${esc(c.id)}" class="${c.id === state.channelId ? 'is-active' : ''}" ${c.id === state.channelId ? 'aria-current="page"' : ''}><span class="live-channel-symbol">${c.kind === 'announcement' ? icon('volume') : '#'}</span><span>${esc(c.name)}</span>${c.kind === 'announcement' ? '<small>NEWS</small>' : ''}</button>`).join('') || '<p class="live-sidebar-empty">Your rooms will appear here.</p>'}</nav><div class="live-sidebar-account"><span class="live-avatar">${esc(initials(state.account.displayName))}</span><button data-live="profile"><b>${esc(state.account.displayName)}</b><small>Edit shared alias</small></button>${icon('shield')}</div>` : `<div class="live-side-art" aria-hidden="true"><span></span><span></span><span></span><i>WL / 02</i></div><div class="live-sidebar-note"><b>A room of your own.</b><p>Make a community, invite your people, and leave a little signal behind.</p></div>`}<button class="live-back" data-live="archive">${icon('arrow')} Personal archive <span>LOCAL</span></button></aside>`;
  }
  function invitationCard() { return state.pendingInvite ? '<div class="live-invitation-note">You arrived with an invitation. Sign in and choose your alias, then review joining the community.</div>' : ''; }
  function splashHTML() {
    let content = '';
    if (state.phase === 'loading' || state.phase === 'idle') content = '<span class="live-loading-mark" aria-hidden="true"></span><h1>Tuning in.</h1><p role="status">Connecting to shared rooms…</p>';
    else if (state.phase === 'guest') content = `<span class="eyebrow">A PLACE BETWEEN DAYS. NOW, TOGETHER.</span><h1>Find your people.<br><em>Keep the signal.</em></h1><p>Private, invite-only communities for the things you make, the nights you remember, and the conversations that go somewhere.</p>${invitationCard()}<a class="live-primary" href="${esc(signInLink())}" target="_top">Continue with ChatGPT ${icon('arrow')}</a><span class="live-fineprint">Choose a public alias after sign-in. Your personal archive stays on this device.</span><div class="live-feature-row"><span>${icon('users')} Invite-only rooms</span><span>${icon('message')} Shared text</span><span>${icon('shield')} Your own alias</span></div>`;
    else if (state.phase === 'offline-edition') content = `<span class="eyebrow">OFFLINE EDITION</span><h1>Your private corner.<br><em>Wherever you are.</em></h1><p>This downloaded client keeps your personal archive offline. Open the hosted app for shared rooms with other people.</p><a class="live-primary" href="${HOSTED}#shared" target="_blank" rel="noopener noreferrer">Open shared rooms ${icon('external')}</a><button class="live-text-button" data-live="archive">Return to your local archive</button>`;
    else if (state.phase === 'unavailable') content = `<span class="eyebrow">CONNECTION INTERRUPTED</span><h1>The room is still here.</h1><p>Shared rooms could not connect. Your personal archive is available on this device.</p><p class="live-error-detail">${esc(state.error)}</p><button class="live-primary" data-live="reconnect">Try again ${icon('arrow')}</button><button class="live-text-button" data-live="archive">Open personal archive</button>`;
    else if (state.phase === 'alias') content = `<span class="eyebrow">FIRST, YOUR FREQUENCY</span><h1>What should<br><em>we call you?</em></h1><p>Choose the alias people in your shared communities will see. Your ChatGPT name and email are not shown.</p><form data-live-form="profile" class="live-alias-form"><label for="live-alias">Your shared alias</label><input id="live-alias" name="displayName" autocomplete="nickname" minlength="2" maxlength="32" required placeholder="e.g. night.window"><p class="live-form-error" role="alert"></p><button class="live-primary" type="submit">Tune in ${icon('arrow')}</button></form>`;
    else if (state.error) content = `<span class="eyebrow">CONNECTION INTERRUPTED</span><h1>Let's reconnect.</h1><p>${esc(state.error)}</p><button class="live-primary" data-live="reload-community">Try again ${icon('arrow')}</button>`;
    else if (state.communityId) content = '<span class="live-loading-mark" aria-hidden="true"></span><h1>Opening the room.</h1><p role="status">Loading your community…</p>';
    else content = `<span class="eyebrow">WELCOME, ${esc(state.account?.displayName?.toUpperCase())}</span><h1>Every good night<br><em>starts somewhere.</em></h1><p>Create a small community for your circle, or join one with an invitation. Your first room is yours to name.</p><div class="live-splash-actions"><button class="live-primary" data-live="create">Create a community ${icon('plus')}</button><button class="live-secondary" data-live="join">Join with an invite</button></div><div class="live-feature-row"><span>${icon('users')} People you invite</span><span>${icon('message')} Messages that stay</span><span>${icon('globe')} Across your devices</span></div>`;
    return `<main id="live-main" class="live-main live-splash" tabindex="-1"><header class="live-splash-top"><button class="icon-button live-menu" data-live="menu" aria-label="Open shared navigation" aria-expanded="false">${icon('menu')}</button><span>SHARED ROOMS <i>VOL. 02</i></span><button class="live-text-button" data-live="archive">Personal archive ${icon('arrow')}</button></header><div class="live-splash-body"><div class="live-orbit" aria-hidden="true"><span></span><span></span><span></span><i></i></div><div class="live-splash-copy">${content}</div></div><footer class="live-splash-footer"><span>VOIDLINE / AFTERHOURS</span><span>No public directory. Just an invitation.</span></footer></main>`;
  }
  function conversationHTML() {
    const c = channel(), r = room(), allowed = canPost();
    return `<main id="live-main" class="live-main live-conversation" tabindex="-1"><header class="live-header"><button class="icon-button live-menu" data-live="menu" aria-label="Open shared navigation" aria-expanded="false">${icon('menu')}</button><span class="live-header-hash">#</span><div><span>${esc(community()?.name)}</span><h1>${esc(c.name)}</h1></div><div class="live-header-actions"><button class="icon-button" data-live="search" aria-label="Search loaded messages" title="Search loaded messages">${icon('search')}</button>${community()?.role === 'owner' ? `<button class="live-invite-button" data-live="invite">${icon('users')}<span>Invite</span></button>` : ''}<button class="icon-button live-people-toggle" data-live="people" aria-label="Show community members" aria-expanded="false">${icon('users')}</button></div></header><div class="live-connection"><span id="live-connection-dot"></span><span id="live-connection-label">Connecting</span><span class="live-connection-copy">Invite-only · Shared text</span><button data-live="refresh" aria-label="Refresh shared messages">Refresh</button></div><div id="live-stream" class="live-stream" tabindex="0" role="log" aria-label="Messages in ${esc(c.name)}" aria-live="off"></div><button class="live-new-messages" id="live-new-messages" data-live="latest" hidden>New messages ${icon('down')}</button><div class="live-compose-wrap">${allowed ? `<form id="live-message-form"><label class="sr-only" for="live-message-input">Message ${esc(c.name)}</label><textarea id="live-message-input" name="text" rows="1" maxlength="4000" placeholder="Message #${esc(c.name)}">${esc(r.draft)}</textarea><button type="submit" class="live-send" aria-label="Send shared message">${icon('arrow')}</button></form><div class="live-compose-caption"><span id="live-draft-status">Shared with this community.</span><span><kbd>Enter</kbd> to send · <kbd>Shift Enter</kbd> for a new line</span></div>` : `<div class="live-readonly">${icon('volume')} Only community staff can post in this announcement room.</div>`}</div><div id="live-announcer" class="sr-only" role="status"></div></main><aside class="live-members" aria-label="Shared community members"><header><span>IN THIS COMMUNITY <b>${state.members.length}</b></span><button class="icon-button" data-live="close-drawer" aria-label="Close member list">${icon('close')}</button></header><p class="live-member-note">A membership list. Presence is private.</p><div class="live-member-list">${state.members.map(m => `<div class="live-member"><span class="live-avatar">${esc(initials(m.display_name))}</span><div><b>${esc(m.display_name)}${m.id === state.account.id ? '<small> YOU</small>' : ''}</b><span>${m.role === 'owner' ? 'Community host' : m.role === 'moderator' ? 'Moderator' : 'Resident'}</span></div>${m.role === 'owner' ? icon('shield') : ''}</div>`).join('')}</div><div class="live-members-card"><span>AFTERHOURS ETIQUETTE</span><h3>Leave a good signal.</h3><p>Make room for the strange ideas, the half-finished things, and each other.</p></div><footer>${icon('live')} An actual shared room.<br>Text updates every few seconds.</footer></aside>`;
  }
  function renderShell() {
    if (!state.active) return;
    root.innerHTML = sidebarHTML() + (state.phase === 'ready' && channel() ? conversationHTML() : splashHTML()) + '<button class="live-drawer-overlay" data-live="close-drawer" aria-label="Close shared navigation"></button>';
    if (state.channelId && channel() && state.phase === 'ready') { renderFeed({bottom:true}); updateConnection(); resizeComposer(); }
    syncChrome();
  }
  function textHTML(text) { return app.format(text); }
  function messageHTML(message, pending = false) {
    const name = pending ? state.account.displayName : message.author_name;
    const own = pending || message.author_id === state.account?.id;
    const date = new Date(message.created_at || Date.now());
    return `<article class="live-message ${own ? 'is-own' : ''} ${pending ? 'is-pending' : ''}" ${pending ? '' : `id="live-message-${esc(message.id)}" data-live-message="${esc(message.id)}"`}><span class="live-avatar">${esc(initials(name))}</span><div class="live-message-content"><header><b>${esc(name)}</b>${own ? '<span class="live-you">YOU</span>' : ''}<time datetime="${date.toISOString()}" title="${esc(date.toLocaleString())}">${pending ? (message.status === 'sending' ? 'Sending…' : 'Not confirmed') : date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></header><div class="live-message-text">${textHTML(message.text)}</div>${pending ? `<div class="live-pending-state">${message.status === 'failed' ? `<span>${esc(message.error || 'Could not confirm this message.')}</span><button data-live-retry="${esc(message.clientId)}">Retry</button><button data-live-restore="${esc(message.clientId)}">Copy to draft</button>` : '<span>Waiting for server confirmation.</span>'}</div>` : ''}</div>${pending ? '' : `<button class="live-message-copy" data-live-copy="${esc(message.id)}" aria-label="Copy message" title="Copy message">${icon('copy')}</button>`}</article>`;
  }
  function renderFeed(options = {}) {
    const feed = $('live-stream'); if (!feed || !state.channelId) return;
    const r = room(), oldHeight = feed.scrollHeight, oldTop = feed.scrollTop, atBottom = oldHeight - feed.clientHeight - oldTop < 80;
    let html = r.older ? '<button class="live-load-earlier" data-live="older">Load earlier messages</button>' : '';
    if (r.loading) html += '<div class="live-feed-empty" role="status"><span class="live-loading-mark" aria-hidden="true"></span><p>Opening the conversation…</p></div>';
    else if (!r.messages.length && !r.error) html += `<div class="live-feed-empty"><span class="live-empty-symbol">#</span><span class="eyebrow">THE START OF SOMETHING</span><h2>Welcome to ${esc(channel()?.name)}.</h2><p>A quiet room, ready for your first signal.</p>${community()?.role === 'owner' ? '<button class="live-secondary" data-live="invite">Invite your people</button>' : ''}</div>`;
    if (r.error) html += `<div class="live-history-error" role="alert"><span>${esc(r.error)}</span><button data-live="reload-channel">Retry history</button></div>`;
    let day = '';
    for (const message of r.messages) {
      const nextDay = new Date(message.created_at).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric',year:'numeric'});
      if (nextDay !== day) { html += `<div class="live-day-divider"><span>${esc(nextDay)}</span></div>`; day = nextDay; }
      html += messageHTML(message);
    }
    for (const message of r.pending) html += messageHTML(message,true);
    feed.innerHTML = html;
    if (options.prepend) feed.scrollTop = oldTop + feed.scrollHeight - oldHeight;
    else if (options.bottom || atBottom) { feed.scrollTop = feed.scrollHeight; if ($('live-new-messages')) $('live-new-messages').hidden = true; }
    else { feed.scrollTop = oldTop; if ($('live-new-messages')) $('live-new-messages').hidden = false; }
  }
  function updateConnection() {
    const label = $('live-connection-label'); if (label) label.textContent = state.network || 'Connecting';
    $('live-connection-dot')?.classList.toggle('is-connected', state.network === 'Connected');
    const status = $('live-draft-status'); if (status) status.textContent = !navigator.onLine ? 'Offline. Your draft stays in this tab.' : state.sessionWarning ? 'Draft cannot be saved by this browser.' : 'Shared with this community.';
  }
  function resizeComposer() {
    const input = $('live-message-input'); if (!input) return;
    input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight,160) + 'px';
    const send = $('live-message-form')?.querySelector('button'); if (send) send.disabled = !input.value.trim();
  }
  async function send() {
    const input = $('live-message-input');
    if (!state.active || state.phase !== 'ready' || !state.account || !state.channelId || !input || !canPost()) return;
    const text = input.value.trim(), id = state.channelId, r = room(id);
    if (!text || text.length > 4000) return;
    let message = r.pending.find(p => p.text === text);
    if (message?.status === 'sending') return app.toast('That message is still waiting for confirmation.');
    if (!message && r.pending.length >= 20) return app.toast('Retry or restore your unconfirmed messages before sending more.');
    if (!message) { message = {clientId:crypto.randomUUID(),text,status:'sending',error:''}; r.pending.push(message); }
    r.draft = ''; input.value = ''; saveSession(id); resizeComposer(); renderFeed({bottom:true}); input.focus();
    await transmit(id,message);
  }
  function confirmsPending(data, id, pending, accountId) {
    const message = data?.message;
    return data?.acknowledged === true && message && message.channel_id === id && message.author_id === accountId && message.client_id === pending.clientId && message.text === pending.text && typeof message.id === 'string' && Number.isFinite(message.seq) && Number.isFinite(new Date(message.created_at).getTime());
  }
  async function transmit(id, pending) {
    const accountId = state.account?.id, identityGeneration = state.identityGeneration, r = state.rooms.get(id);
    if (!accountId || !r || !r.pending.includes(pending)) return;
    pending.status = 'sending'; pending.error = '';
    if (state.active && state.channelId === id) renderFeed();
    try {
      const data = await request('/channels/'+encodeURIComponent(id)+'/messages',{clientId:pending.clientId,text:pending.text});
      if (state.account?.id !== accountId || identityGeneration !== state.identityGeneration) return;
      if (!confirmsPending(data,id,pending,accountId)) throw new Error('The server did not confirm this exact message. Retry safely.');
      mergeMessages(id,[data.message]);
      if (state.active && state.channelId === id) { renderFeed(); state.network = 'Connected'; updateConnection(); $('live-announcer').textContent = 'Message saved to this shared room.'; }
    } catch (error) {
      if (state.account?.id !== accountId || identityGeneration !== state.identityGeneration) return;
      if (!r.pending.some(message => message.clientId === pending.clientId)) return;
      pending.status = 'failed'; pending.error = error.message; saveSession(id);
      if (error.status === 401) { signOut(); return; }
      if (error.code === 'account_changed' && state.active) { await connect(); return; }
      if (state.active && state.channelId === id) { renderFeed(); $('live-announcer').textContent = 'Message not confirmed. Retry or copy it to your draft.'; }
    }
  }
  function dialog(title, copy, body) { app.modal(`<div class="live-dialog"><span class="eyebrow">VOIDLINE / SHARED ROOMS</span><h2>${title}</h2><p>${copy}</p>${body}</div>`); }
  const formError = '<p class="live-form-error" role="alert"></p>';
  function createDialog() {
    if (!state.account || state.account.needsProfile) return app.toast('Choose your shared alias first.');
    dialog('Make a little room.','A shared community for your people. Only invited members can read its messages.',`<form data-live-form="create"><label for="live-community-name">Community name</label><input id="live-community-name" name="name" maxlength="64" required placeholder="The night shift" autofocus>${formError}<button class="live-primary" type="submit">Create community ${icon('plus')}</button></form>`);
  }
  function joinDialog(token = '') {
    if (!state.account || state.account.needsProfile) return;
    dialog('Follow the signal.','Paste an invitation link or code from a community host. Joining makes your alias visible to its members.',`<form data-live-form="join"><label for="live-invite-code">Invitation link or code</label><input id="live-invite-code" name="token" value="${esc(token)}" required placeholder="Paste your invitation" autocomplete="off" spellcheck="false" autofocus>${formError}<button class="live-primary" type="submit">Join community ${icon('arrow')}</button></form>`);
  }
  function channelDialog() {
    if (community()?.role !== 'owner') return;
    dialog('Give it a frequency.','Add a text room or an announcement room to this community.',`<form data-live-form="channel" data-community="${esc(state.communityId)}"><label for="live-channel-name">Channel name</label><input id="live-channel-name" name="name" maxlength="32" pattern="[a-z0-9][a-z0-9-]*" required placeholder="after-midnight" autofocus><label for="live-channel-kind">Who can post?</label><select id="live-channel-kind" name="kind"><option value="text">Everyone in the community</option><option value="announcement">Community staff only</option></select>${formError}<button class="live-primary" type="submit">Create room ${icon('plus')}</button></form>`);
  }
  function profileDialog() {
    if (!state.account) return;
    dialog('Your shared alias.','This name appears with your messages in every shared community. Your personal archive profile is separate.',`<form data-live-form="profile"><label for="live-alias-edit">Display name</label><input id="live-alias-edit" name="displayName" minlength="2" maxlength="32" value="${esc(state.account.displayName)}" required autofocus>${formError}<button class="live-primary" type="submit">Save alias</button></form>`);
  }
  function inviteDialog() {
    if (community()?.role !== 'owner') return;
    dialog('Bring your people.','An invitation grants access to this community and its message history. Choose how many people it can admit.',`<form data-live-form="invite" data-community="${esc(state.communityId)}"><label for="live-invite-uses">Number of people</label><select id="live-invite-uses" name="maxUses"><option value="1">One person</option><option value="5">Up to 5 people</option><option value="10">Up to 10 people</option><option value="25">Up to 25 people</option></select><p class="live-form-note">Invitation expires in 7 days.</p>${formError}<button class="live-primary" type="submit">Create invitation ${icon('arrow')}</button></form>`);
  }
  async function submitForm(form) {
    if (form.dataset.busy) return;
    const kind = form.dataset.liveForm, data = new FormData(form), generation = state.generation, accountId = state.account?.id, identityGeneration = state.identityGeneration;
    const sameIdentity = () => state.account?.id === accountId && state.identityGeneration === identityGeneration;
    const errorNode = form.querySelector('.live-form-error'), submit = form.querySelector('[type="submit"]');
    form.dataset.busy = 'true'; form.setAttribute('aria-busy','true'); if (submit) submit.disabled = true; if (errorNode) errorNode.textContent = '';
    try {
      if (kind === 'profile') {
        const response = await request('/profile',{displayName:String(data.get('displayName') || '').trim()});
        if (!sameIdentity() || !state.active || generation !== state.generation) return;
        if (response.account.id !== accountId) { if (state.active) await connect(); return; }
        state.account = response.account;
        for (const r of state.rooms.values()) for (const m of r.messages) if (m.author_id === state.account.id) m.author_name = state.account.displayName;
        state.members = state.members.map(m => m.id === state.account.id ? {...m,display_name:state.account.displayName} : m);
        if (!sameIdentity() || !state.active || generation !== state.generation) return;
        if (form.isConnected) app.closeModal();
        if (state.phase === 'alias') await loadCommunities(generation); else if (state.active) { captureDraft(); renderShell(); }
        app.toast('Your shared alias is saved.');
      } else if (kind === 'create') {
        const response = await request('/communities',{name:String(data.get('name') || '').trim()});
        if (!sameIdentity()) return;
        if (form.isConnected) app.closeModal();
        if (state.active && generation === state.generation) await loadCommunities(generation,response.community.id);
        app.toast('Your shared community is ready.');
      } else if (kind === 'join') {
        const token = inviteFrom(data.get('token')); if (!token) throw new Error('Paste a complete VOIDLINE invitation link or code.');
        const response = await request('/invites/claim',{token});
        if (!sameIdentity()) return;
        if (!state.pendingInvite || state.pendingInvite === token) state.pendingInvite = '';
        if (state.active && generation === state.generation) history.replaceState(null,'',location.pathname + location.search + '#shared');
        if (!sameIdentity()) return;
        if (form.isConnected) app.closeModal();
        if (state.active && generation === state.generation) await loadCommunities(generation,response.membership.communityId);
        app.toast('You joined the community.');
      } else if (kind === 'channel') {
        const id = form.dataset.community;
        const response = await request(`/communities/${encodeURIComponent(id)}/channels`,{name:String(data.get('name') || '').trim(),kind:String(data.get('kind'))});
        if (!sameIdentity()) return;
        if (form.isConnected) app.closeModal();
        if (state.active && state.communityId === id && generation === state.generation) { state.channels.push(response.channel); await selectChannel(response.channel.id); }
        app.toast('Your shared channel is ready.');
      } else if (kind === 'invite') {
        const response = await request(`/communities/${encodeURIComponent(form.dataset.community)}/invites`,{maxUses:Number(data.get('maxUses'))});
        if (!sameIdentity() || generation !== state.generation || !form.isConnected || !state.active) return;
        const url = location.origin + location.pathname + '#join=' + response.invite.token;
        dialog('An open door.','Share this invitation with the people you want in the room.',`<label for="live-generated-invite">Invitation link</label><input id="live-generated-invite" value="${esc(url)}" readonly><p class="live-form-note">Up to ${response.invite.maxUses} ${response.invite.maxUses === 1 ? 'person' : 'people'} · Expires ${esc(new Date(response.invite.expiresAt).toLocaleDateString())}</p><button class="live-primary" data-live="copy-invite">${icon('copy')} Copy invitation</button>`);
      }
    } catch (error) { if (!sameIdentity()) return; if (error.code === 'account_changed' && state.active) { await connect(); return; } if (error.status === 401) { signOut(); return; } if (errorNode?.isConnected) errorNode.textContent = error.message; else app.toast(error.message); }
    finally { delete form.dataset.busy; form.removeAttribute('aria-busy'); if (submit?.isConnected) submit.disabled = false; }
  }
  async function copyText(text, label, fallback) {
    try { await navigator.clipboard.writeText(text); app.toast(label); }
    catch (_) { if (fallback) { fallback.focus(); fallback.select(); app.toast('Select and copy the invitation link.'); } else dialog('Copy this message.','Select the text below to copy it.',`<textarea class="live-copy-text" readonly>${esc(text)}</textarea>`); }
  }
  function searchDialog() {
    if (!state.channelId || state.phase !== 'ready') { app.toast('Open a shared room to search its messages.'); return; }
    dialog('Find a signal.',`Search the ${room().messages.length} messages loaded in #${esc(channel()?.name)}. Load earlier history to search more.`,`<label class="sr-only" for="live-search">Search this room</label><input id="live-search" type="search" placeholder="Words, phrases, or an alias" autofocus><div id="live-search-results" class="live-search-results"></div>`);
    renderSearch('');
  }
  function renderSearch(value) {
    const results = $('live-search-results'); if (!results) return;
    const term = value.trim().toLocaleLowerCase();
    const matches = term ? room().messages.filter(m => (m.text + ' ' + m.author_name).toLocaleLowerCase().includes(term)) : room().messages.slice(-10).reverse();
    results.innerHTML = `<p class="live-form-note">${term ? matches.length + ' matches' : 'Recent messages'}</p>` + (matches.slice(0,100).map(m => `<button data-live-jump="${esc(m.id)}"><span><b>${esc(m.author_name)}</b><small>${esc(new Date(m.created_at).toLocaleDateString())}</small></span><p>${esc(m.text.slice(0,240))}</p></button>`).join('') || '<p class="live-search-empty">No messages match. Try another phrase or load earlier history.</p>') + (matches.length > 100 ? '<p class="live-form-note">Showing the first 100 matches. Add a more specific phrase to narrow your search.</p>' : '');
  }
  function sharedStatus() {
    dialog('Your shared connection.','Shared rooms store text on the server so community members can read it across devices.',`<div class="live-status-card"><b>${esc(state.network || (state.phase === 'guest' ? 'Sign-in required' : state.phase === 'ready' ? 'Connected' : 'Not connected'))}</b><p>Messages refresh every few seconds while this tab is visible. A message is confirmed only after the server saves it.</p><p>Local archives, attachments, and personal profile worlds stay on this device. Shared rooms currently support text.</p></div><button class="live-secondary" data-live="archive">Open personal archive</button>`);
  }
  function handleAction(action, button) {
    const actions = {archive:() => {app.closeModal();exitLive();},menu:() => toggleDrawer('nav'),people:() => toggleDrawer('people'),'close-drawer':() => closeDrawers(),reconnect:connect,create:createDialog,join:() => joinDialog(state.pendingInvite),profile:profileDialog,'add-channel':channelDialog,invite:inviteDialog,search:searchDialog,older:() => olderMessages(button),'reload-community':() => selectCommunity(state.communityId),'reload-channel':() => selectChannel(state.channelId),refresh:() => {if (room().error) selectChannel(state.channelId); else {state.network = 'Checking';updateConnection();schedulePoll(0);}},latest:() => {const feed = $('live-stream');if (feed) feed.scrollTop = feed.scrollHeight;$('live-new-messages').hidden = true;},'copy-invite':() => copyText($('live-generated-invite').value,'Invitation copied.',$('live-generated-invite'))};
    if (actions[action]) actions[action]();
  }
  function bind() {
    document.addEventListener('click',event => {
      const button = event.target.closest('button,a,[data-action]'); if (!button) return;
      if (button.dataset.action === 'live') { event.preventDefault(); event.stopImmediatePropagation(); enterLive(); return; }
      if (button.dataset.live) { event.preventDefault(); event.stopImmediatePropagation(); handleAction(button.dataset.live,button); return; }
      if (button.dataset.liveChannel) { event.preventDefault(); event.stopImmediatePropagation(); selectChannel(button.dataset.liveChannel); return; }
      if (button.dataset.liveRetry) { event.preventDefault(); event.stopImmediatePropagation(); const p = room().pending.find(m => m.clientId === button.dataset.liveRetry); if (p?.status === 'failed') transmit(state.channelId,p); return; }
      if (button.dataset.liveRestore) { event.preventDefault(); event.stopImmediatePropagation(); const r = room(), p = r.pending.find(m => m.clientId === button.dataset.liveRestore); if (!p || p.status !== 'failed') return; captureDraft(); if (r.draft === p.text) { $('live-message-input').focus(); return; } if (r.draft.length + p.text.length + 2 > 4000) return app.toast('Save or send your current draft before restoring this message.'); r.draft = r.draft ? r.draft + '\n\n' + p.text : p.text; saveSession(); $('live-message-input').value = r.draft; renderFeed(); resizeComposer(); $('live-message-input').focus(); app.toast('Copied to your draft. Sending the same text retries its original message ID.'); return; }
      if (button.dataset.liveCopy) { event.preventDefault(); event.stopImmediatePropagation(); const m = room().messages.find(m => m.id === button.dataset.liveCopy); if (m) copyText(m.text,'Message copied.'); return; }
      if (button.dataset.liveJump) { event.preventDefault(); event.stopImmediatePropagation(); app.closeModal(); const node = $('live-message-' + button.dataset.liveJump); node?.scrollIntoView({block:'center',behavior:window.VoidMotion?.enabled() ? 'smooth' : 'auto'}); node?.classList.add('live-message-highlight'); setTimeout(() => node?.classList.remove('live-message-highlight'),1800); return; }
      if (!state.active) return;
      if (button.dataset.action === 'network' || button.dataset.action === 'command') { event.preventDefault(); event.stopImmediatePropagation(); button.dataset.action === 'network' ? sharedStatus() : searchDialog(); return; }
      if (button.closest('.server-rail') || button.classList.contains('wordmark')) exitLive();
    },true);
    document.addEventListener('submit',event => {
      if (event.target.id === 'live-message-form') { event.preventDefault(); event.stopImmediatePropagation(); send(); }
      else if (event.target.dataset.liveForm) { event.preventDefault(); event.stopImmediatePropagation(); submitForm(event.target); }
    },true);
    document.addEventListener('input',event => {
      if (event.target.id === 'live-message-input') { captureDraft(); resizeComposer(); }
      if (event.target.id === 'live-search') renderSearch(event.target.value);
    });
    document.addEventListener('change',event => { if (event.target.id === 'live-community-select') selectCommunity(event.target.value); });
    document.addEventListener('keydown',event => {
      if (!state.active || window.VoidEntrance?.isPlaying?.()) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); event.stopImmediatePropagation(); searchDialog(); return; }
      if (event.target.id === 'live-message-input' && event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); event.stopImmediatePropagation(); send(); return; }
      if (event.key === 'Escape' && state.drawer) { event.preventDefault(); event.stopImmediatePropagation(); closeDrawers(); }
      if (event.key === 'Tab' && state.drawer) {
        const panel = root.querySelector(state.drawer === 'nav' ? '.live-sidebar' : '.live-members');
        const focusable = Array.from(panel?.querySelectorAll('button:not([disabled]),select:not([disabled]),a[href]') || []);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    },true);
    root.addEventListener('scroll',event => { if (event.target.id === 'live-stream' && event.target.scrollHeight - event.target.clientHeight - event.target.scrollTop < 80 && $('live-new-messages')) $('live-new-messages').hidden = true; },true);
    window.addEventListener('pagehide',captureDraft);
    window.addEventListener('beforeunload',event => { captureDraft(); if (state.sessionWarning && Array.from(state.rooms.values()).some(r => r.draft || r.pending.length)) { event.preventDefault();event.returnValue = ''; } });
    document.addEventListener('visibilitychange',() => { if (document.hidden) { captureDraft();clearTimeout(state.poll); } else if (state.active) schedulePoll(0); });
    window.addEventListener('online',() => { if (state.active) { updateConnection();schedulePoll(0); } });
    window.addEventListener('offline',() => { if (state.active) { state.network = 'Offline';updateConnection(); } });
    window.addEventListener('hashchange',() => { if (/^#join=/.test(location.hash)) { state.pendingInvite = inviteFrom(location.href); enterLive(); } else if (location.hash === '#shared') enterLive(); else if (state.active) exitLive(); });
    window.addEventListener('resize',() => { if (state.drawer && matchMedia('(min-width:1051px)').matches) closeDrawers(false); });
  }
  function init() {
    if (root || !window.VoidApp) return;
    app = window.VoidApp; originalScope = document.querySelector('.local-tag')?.innerHTML || ''; originalSearch = document.querySelector('.titlebar-command')?.innerHTML || ''; originalSearchLabel = document.querySelector('.titlebar-command')?.getAttribute('aria-label') || 'Search messages, channels, and people';
    root = document.createElement('section'); root.id = 'live-workspace'; root.hidden = true; root.setAttribute('aria-label','Shared rooms'); document.querySelector('.app-shell').append(root);
    bind();
    window.VoidLive = Object.freeze({open:enterLive,close:exitLive,isActive:() => state.active});
    state.pendingInvite = inviteFrom(location.href);
    if (location.hash === '#shared' || state.pendingInvite) enterLive();
  }
  window.addEventListener('voidline:ready',init,{once:true});
  if (window.VoidApp) init();
})();
