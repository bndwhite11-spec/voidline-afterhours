/* Shared text rooms. Local archives never enter this transport. */
(() => {
  'use strict';
  const API = '/api/live';
  const HOSTED = 'https://voidline-afterhours.pipedcactus1.chatgpt.site/';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const offlineEdition = document.documentElement.dataset.offline === 'true' || location.protocol === 'file:';
  const state = {active:false, phase:'idle', account:null, communities:[], communityId:'', channels:[], channelId:'', members:[], rooms:new Map(), generation:0, identityGeneration:0, poll:0, pendingInvite:'', error:'', network:'', drawer:'', sessionWarning:false, threadRootId:'', deepLink:'', actionBusy:new Set()};
  let app, root, originalScope, originalSearch, originalSearchLabel, focusBeforeDrawer, toolsModule;
  const tools = () => toolsModule || window.VoidLiveTools;
  const roomKey = (id, threadId = '') => id + (threadId ? '::' + threadId : '');
  const activeRoom = () => room(state.channelId, state.threadRootId);
  const guard = () => { const id = state.account?.id, epoch = state.identityGeneration; return {current:() => state.account?.id === id && state.identityGeneration === epoch}; };
  const dateValue = value => { const d = new Date(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value); return Number.isFinite(d.getTime()) ? d : new Date(0); };
  const initials = name => String(name || '?').trim().split(/\s+/).map(x => Array.from(x)[0]).slice(0,2).join('').toUpperCase();
  const community = () => state.communities.find(c => c.id === state.communityId);
  const channel = () => state.channels.find(c => c.id === state.channelId);
  const sessionKey = id => `voidline.shared.session.v1.${state.account?.id || 'guest'}.${id}`;
  const navKey = () => `voidline.shared.navigation.v1.${state.account?.id || 'guest'}`;
  const canPost = () => channel()?.kind !== 'announcement' || ['owner','moderator'].includes(community()?.role);
  function room(id = state.channelId, threadId = '') {
    const key = roomKey(id,threadId);
    if (!state.rooms.has(key)) {
      let saved = {};
      try { saved = JSON.parse(sessionStorage.getItem(sessionKey(key)) || '{}'); } catch (_) { /* private window */ }
      const pending = Array.isArray(saved.pending) ? saved.pending.filter(p => p && typeof p.text === 'string' && p.text.length <= 4000 && /^[A-Za-z0-9_-]{8,100}$/.test(p.clientId)).slice(0,20).map(p => ({clientId:p.clientId,text:p.text,replyToId:typeof p.replyToId === 'string' ? p.replyToId : null,threadRootId:threadId || null,status:'failed',error:'Not confirmed. Retry uses the same message ID.'})) : [];
      state.rooms.set(key, {channelId:id,threadRootId:threadId,messages:[], loaded:false, older:false, newer:false, windowEnd:0, loading:false, syncing:false, changeCursor:null, draft:typeof saved.text === 'string' ? saved.text.slice(0,4000) : '', replyToId:typeof saved.replyToId === 'string' ? saved.replyToId : null, pending, reading:saved.reading && Number.isFinite(saved.reading.top) ? saved.reading : null,error:''});
    }
    return state.rooms.get(key);
  }
  function saveSession(id = state.channelId, threadId = state.threadRootId) {
    if (!id || !state.account) return true;
    const r = room(id,threadId);
    try {
      sessionStorage.setItem(sessionKey(roomKey(id,threadId)), JSON.stringify({text:r.draft,replyToId:r.replyToId,reading:r.reading,pending:r.pending.map(p => ({clientId:p.clientId,text:p.text,replyToId:p.replyToId,threadRootId:p.threadRootId}))}));
      return true;
    } catch (_) {
      if (!state.sessionWarning) { state.sessionWarning = true; app.toast('This browser cannot save shared drafts. Copy a recovery draft before closing this tab.'); }
      updateConnection(); return false;
    }
  }
  function captureDraft() {
    if (!state.channelId) return;
    const input = $('live-message-input');
    if (input) activeRoom().draft = input.value;
    const feed = $('live-stream');
    if (feed) activeRoom().reading = {top:feed.scrollTop,bottom:feed.scrollHeight - feed.clientHeight - feed.scrollTop < 80};
    saveSession();
  }
  function saveNavigation() {
    try { sessionStorage.setItem(navKey(), JSON.stringify({communityId:state.communityId,channelId:state.channelId,threadRootId:state.threadRootId})); } catch (_) { /* optional */ }
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
  function deepLinkFromHash() { try { const id = decodeURIComponent(location.hash.slice(8)); return /^#shared\//.test(location.hash) && /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : ''; } catch (_) { return ''; } }
  function signInLink() {
    const path = location.pathname + location.search + (state.pendingInvite ? '#join=' + state.pendingInvite : state.deepLink ? '#shared/' + encodeURIComponent(state.deepLink) : /^#shared\//.test(location.hash) ? location.hash : '#shared');
    return '/signin-with-chatgpt?return_to=' + encodeURIComponent(path);
  }
  function syncChrome() {
    const scope = document.querySelector('.local-tag'), search = document.querySelector('.titlebar-command');
    document.querySelector('[data-action="live"]')?.classList.toggle('is-active',state.active);
    document.querySelector('[data-action="live"]')?.setAttribute('aria-pressed',String(state.active));
    if (scope) { scope.innerHTML = state.active ? `${icon('live')}<b>SHARED TEXT</b>` : originalScope; scope.title = state.active ? 'Shared rooms status' : 'Local archive status'; }
    if (search) {
      search.innerHTML = state.active ? `${icon('search')}<span>Search shared rooms</span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ K' : 'Ctrl K'}</kbd>` : originalSearch;
      search.setAttribute('aria-label',state.active ? 'Search shared messages, channels, and people' : originalSearchLabel);
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
    if (/^#(?:shared|join=)/.test(location.hash)) history.replaceState(null,'',location.pathname + location.search);
    app.renderAll();
  }
  async function enterLive() {
    app.closeModal(); app.closeLocalDrawers?.(false); app.closeThread(false); document.body.classList.remove('mobile-nav','members-open');
    state.active = true; root.hidden = false; document.body.classList.add('vl-live-mode'); syncChrome();
    if (!/^#(?:join=|shared\/)/.test(location.hash)) history.replaceState(null,'',location.pathname + location.search + '#shared');
    await connect();
  }
  function adoptAccount(account) {
    if (state.account?.id !== account?.id) {
      captureDraft(); state.identityGeneration++; clearTimeout(state.poll);
      state.rooms.clear(); state.threadRootId = ''; state.actionBusy.clear(); state.communities = []; state.communityId = ''; state.channels = []; state.channelId = ''; state.members = []; state.network = ''; state.sessionWarning = false;
    }
    state.account = account; tools()?.onData?.();
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
    let route = generation;
    if (selected) {
      route = await selectCommunity(selected.id, saved.channelId);
      if (!state.active || route !== state.generation) return;
      if (saved.threadRootId && state.channelId === saved.channelId) { route = await openThread(saved.threadRootId); if (!state.active || route !== state.generation) return; }
    } else { state.communityId = ''; state.channelId = ''; state.channels = []; state.members = []; renderShell(); }
    if (state.deepLink && state.active && route === state.generation) { const target = state.deepLink; state.deepLink = ''; await jumpMessage(target); }
    if (state.pendingInvite && state.active) joinDialog(state.pendingInvite);
  }
  async function selectCommunity(id, preferredChannel = '') {
    captureDraft(); closeDrawers(false); clearTimeout(state.poll);
    const generation = ++state.generation;
    state.communityId = id; state.channelId = ''; state.threadRootId = ''; state.channels = []; state.members = []; state.network = 'Connecting'; state.error = ''; renderShell();
    try {
      const [channels, members] = await Promise.all([request(`/communities/${encodeURIComponent(id)}/channels`),request(`/communities/${encodeURIComponent(id)}/members`)]);
      if (!state.active || generation !== state.generation) return;
      state.channels = channels.channels; state.members = members.members;
      const selected = state.channels.find(c => c.id === preferredChannel) || state.channels[0];
      if (selected) return await selectChannel(selected.id);
      else { state.network = 'Connected'; renderShell(); return generation; }
    } catch (error) { if (generation === state.generation && state.active) { state.error = error.message; state.network = 'Connection interrupted'; renderShell(); } }
  }
  async function selectChannel(id, latest = false) {
    if (!state.channels.some(c => c.id === id)) return;
    captureDraft(); closeDrawers(false); clearTimeout(state.poll);
    const generation = ++state.generation;
    state.channelId = id; state.threadRootId = ''; state.error = ''; state.network = 'Connecting'; const r = room(id);
    r.loading = !r.loaded; renderShell(); saveNavigation();
    if (r.loaded && r.newer && !latest) { state.network = 'Checking'; updateConnection(); schedulePoll(0); return generation; }
    try {
      const data = await request(`/channels/${encodeURIComponent(id)}/messages?limit=50`);
      if (!state.active || generation !== state.generation) return;
      if (latest && r.newer) { r.messages = []; r.newer = false; r.reading = null; }
      mergeMessages(id,data.messages); r.loaded = true; r.loading = false; r.older = data.page.hasMore || (r.older && r.messages.length > data.messages.length); if (r.changeCursor === null && Number.isFinite(data.changeCursor)) r.changeCursor = data.changeCursor; r.error = ''; state.network = 'Connected';
      renderFeed({restore:true}); updateConnection(); schedulePoll(); tools()?.onData?.(); return generation;
    } catch (error) { if (generation === state.generation && state.active) { r.loading = false; r.error = error.message; state.network = 'Connection interrupted'; renderFeed(); updateConnection(); schedulePoll(5000); } }
  }
  function mergeMessages(id, incoming) {
    if (!Array.isArray(incoming)) return;
    for (const message of incoming) {
      if (!message || message.channel_id !== id) continue;
      const r = room(id,message.thread_root_id || ''), old = r.messages.find(m => m.id === message.id);
      if (old && (Number(message.change_seq) || 0) < (Number(old.change_seq) || 0)) continue;
      if (old) Object.assign(old,message); else r.messages.push(message);
      if (message.author_id === state.account?.id) r.pending = r.pending.filter(p => p.clientId !== message.client_id);
      r.messages.sort((a,b) => a.seq - b.seq); saveSession(id,message.thread_root_id || '');
      // Reply previews remain useful when the source is edited or tombstoned.
      for (const cached of state.rooms.values()) for (const reply of cached.messages) if (reply.reply_to_id === message.id) reply.reply_preview = {id:message.id,text:message.text,author_name:message.author_name,deleted_at:message.deleted_at};
    }
    tools()?.onData?.();
  }
  function findMessage(id) {
    for (const r of state.rooms.values()) { const message = r.messages.find(m => m.id === id); if (message) return message; }
    return null;
  }
  async function openThread(id, latest = false) {
    const source = findMessage(id), rootId = source?.thread_root_id || id;
    if (!state.channelId) return;
    captureDraft(); closeDrawers(false); clearTimeout(state.poll);
    const generation = ++state.generation, channelId = state.channelId;
    state.threadRootId = rootId; const r = activeRoom(); r.loading = !r.loaded;
    renderShell(); saveNavigation();
    if (r.loaded && r.newer && !latest) { schedulePoll(0); return generation; }
    try {
      const [rootData,data] = await Promise.all([request(`/messages/${encodeURIComponent(rootId)}`),request(`/channels/${encodeURIComponent(channelId)}/messages?threadRootId=${encodeURIComponent(rootId)}&limit=50`)]);
      if (!state.active || generation !== state.generation) return;
      if (latest && r.newer) { r.messages = []; r.newer = false; r.reading = null; }
      mergeMessages(channelId,[rootData.message,...data.messages]); r.loaded = true; r.loading = false; r.error = ''; r.older = data.page.hasMore || r.older;
      if (room(channelId).changeCursor === null && Number.isFinite(data.changeCursor)) room(channelId).changeCursor = data.changeCursor;
      renderFeed({restore:true}); updateComposerContext(); schedulePoll(); return generation;
    } catch (error) { if (state.active && generation === state.generation) { r.loading = false; r.error = error.message; renderFeed(); schedulePoll(5000); } }
  }
  async function closeThread() { if (state.threadRootId) { const id = state.channelId; captureDraft(); const generation = await selectChannel(id); if (generation === state.generation) $('live-message-input')?.focus(); return generation; } }
  async function navigate(target) {
    if (!state.active) await enterLive();
    const identity = guard(); let route = state.generation;
    const current = () => identity.current() && state.active && route === state.generation;
    if (state.phase !== 'ready') return;
    if (target.communityId && target.communityId !== state.communityId) route = await selectCommunity(target.communityId,target.channelId);
    else if (target.channelId && target.channelId !== state.channelId) route = await selectChannel(target.channelId);
    if (!current()) return;
    if (target.messageId) return jumpMessage(target.messageId);
    if (target.threadRootId) return openThread(target.threadRootId);
  }
  async function jumpMessage(id) {
    clearTimeout(state.poll);
    const identity = guard(); let route = ++state.generation;
    const current = () => identity.current() && state.active && route === state.generation;
    try {
      const data = await request(`/messages/${encodeURIComponent(id)}`), message = data.message;
      if (!current()) return;
      app.closeModal();
      if (message.community_id && message.community_id !== state.communityId) route = await selectCommunity(message.community_id,message.channel_id);
      else if (message.channel_id !== state.channelId) route = await selectChannel(message.channel_id);
      if (!current() || state.channelId !== message.channel_id) return;
      if (message.thread_root_id) { if (state.threadRootId !== message.thread_root_id) route = await openThread(message.thread_root_id); }
      else if (state.threadRootId) route = await closeThread();
      if (!current() || state.channelId !== message.channel_id) return;
      // Build a contiguous page around an exact result. Merging only one old
      // result into the latest page would hide the gap from pagination.
      const suffix = message.thread_root_id ? '&threadRootId=' + encodeURIComponent(message.thread_root_id) : '';
      const [before,after] = await Promise.all([request(`/channels/${encodeURIComponent(message.channel_id)}/messages?before=${message.seq + 1}&limit=25${suffix}`),request(`/channels/${encodeURIComponent(message.channel_id)}/messages?after=${message.seq}&limit=25${suffix}`)]);
      if (!current()) return;
      const r = activeRoom(); r.messages = []; r.older = before.page.hasMore; r.newer = after.page.hasMore;
      r.windowEnd = Math.max(message.seq,...after.messages.map(m => m.seq));
      mergeMessages(message.channel_id,[...before.messages,message,...after.messages]); renderFeed();
      history.replaceState(null,'',location.pathname + location.search + '#shared/' + encodeURIComponent(message.id));
      const node = $('live-message-' + message.id); node?.scrollIntoView({block:'center',behavior:window.VoidMotion?.enabled() ? 'smooth' : 'auto'}); node?.focus({preventScroll:true}); node?.classList.add('live-message-highlight'); setTimeout(() => node?.classList.remove('live-message-highlight'),1800);
    } catch (error) { if (current()) app.toast(error.status === 403 || error.status === 404 ? 'This source is no longer available to your account.' : error.message); }
    finally { if (current()) schedulePoll(0); }
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
      const path = r.changeCursor !== null ? `/channels/${encodeURIComponent(id)}/changes?after=${r.changeCursor}&limit=100` : `/channels/${encodeURIComponent(id)}/messages?after=${r.messages.at(-1)?.seq || 0}&limit=100`;
      const data = await request(path);
      if (!state.active || generation !== state.generation) return;
      const relevant = data.messages.filter(m => (m.thread_root_id || '') === state.threadRootId), fresh = relevant.filter(m => !findMessage(m.id));
      mergeMessages(id,data.messages); r.error = ''; r.loaded = true; state.network = 'Connected';
      if (Number.isFinite(data.cursor)) r.changeCursor = data.cursor;
      if (data.messages.length) { renderFeed({newMessages:fresh.length > 0}); updateComposerContext(); if (fresh.length && $('live-announcer')) $('live-announcer').textContent = `${fresh.length} new ${fresh.length === 1 ? 'message' : 'messages'} in ${channel()?.name || 'this room'}.`; }
      else if ($('live-stream')?.querySelector('.live-history-error')) renderFeed();
      updateConnection(); tools()?.onData?.(); schedulePoll((data.hasMore ?? data.page?.hasMore) ? 80 : 3000);
    } catch (error) {
      if (generation !== state.generation || !state.active) return;
      if (error.status === 401) { signOut(); return; }
      if (error.status === 403) { captureDraft(); const inaccessible = new Set(state.channels.map(c => c.id)); for (const cached of state.rooms.values()) if (inaccessible.has(cached.channelId)) { cached.messages = []; cached.loaded = false; cached.changeCursor = null; cached.error = 'Your access to this room changed. Unsent text is still retained in this tab.'; } await connect(); return; }
      state.network = navigator.onLine ? 'Reconnecting' : 'Offline'; updateConnection(); schedulePoll(5000);
    } finally { r.syncing = false; }
  }
  async function olderMessages(button) {
    const id = state.channelId, generation = state.generation, r = activeRoom();
    if (!r.older || !r.messages.length) return;
    button.disabled = true; button.textContent = 'Loading…';
    try {
      const data = await request(`/channels/${encodeURIComponent(id)}/messages?before=${r.messages[0].seq}&limit=50${state.threadRootId ? '&threadRootId=' + encodeURIComponent(state.threadRootId) : ''}`);
      if (!state.active || generation !== state.generation) return;
      mergeMessages(id,data.messages); r.older = data.page.hasMore; renderFeed({prepend:true});
    } catch (error) { if (generation === state.generation) app.toast(error.message); }
    finally { if (button.isConnected) { button.disabled = false; button.textContent = 'Load earlier messages'; } }
  }
  async function newerMessages(button) {
    const id = state.channelId, generation = state.generation, r = activeRoom();
    if (!r.newer) return;
    button.disabled = true; button.textContent = 'Loading…';
    try {
      const data = await request(`/channels/${encodeURIComponent(id)}/messages?after=${r.windowEnd}&limit=50${state.threadRootId ? '&threadRootId=' + encodeURIComponent(state.threadRootId) : ''}`);
      if (!state.active || generation !== state.generation) return;
      mergeMessages(id,data.messages); r.newer = data.page.hasMore; r.windowEnd = Math.max(r.windowEnd,...data.messages.map(m => m.seq)); renderFeed();
    } catch(error) { if (generation === state.generation) app.toast(error.message); }
    finally { if (button.isConnected) {button.disabled=false;button.textContent='Load newer messages';} }
  }
  function sidebarHTML() {
    const signedIn = !!state.account && ['ready','alias'].includes(state.phase), selected = community();
    return `<aside class="live-sidebar" aria-label="Shared room navigation"><header class="live-sidebar-heading"><span class="eyebrow">THE SHARED FREQUENCY</span><h2>Afterhours, together.</h2><p>Small rooms. Familiar voices.</p></header>${signedIn ? `<div class="live-space-picker"><label for="live-community-select">YOUR COMMUNITIES</label><select id="live-community-select" aria-label="Choose a shared community" ${state.communities.length ? '' : 'disabled'}>${state.communities.length ? state.communities.map(c => `<option value="${esc(c.id)}" ${c.id === state.communityId ? 'selected' : ''}>${esc(c.name)}</option>`).join('') : '<option>No communities yet</option>'}</select></div><div class="live-space-actions"><button data-live="create">${icon('plus')} Create</button><button data-live="join">${icon('live')} Join</button></div>${tools()?.sidebarHTML?.(state) || ''}<div class="live-channel-heading"><span>TEXT ROOMS</span>${selected?.role === 'owner' ? `<button data-live="add-channel" aria-label="Create a shared channel">${icon('plus')}</button>` : ''}</div><nav class="live-channel-list" aria-label="Shared text channels">${(tools()?.filterChannels?.(state.channels,state) || state.channels).map(c => `<button data-live-channel="${esc(c.id)}" class="${c.id === state.channelId ? 'is-active' : ''}" ${c.id === state.channelId ? 'aria-current="page"' : ''}><span class="live-channel-symbol">${c.kind === 'announcement' ? icon('volume') : '#'}</span><span>${esc(c.name)}</span>${c.kind === 'announcement' ? '<small>NEWS</small>' : ''}</button>`).join('') || '<p class="live-sidebar-empty">Your rooms will appear here.</p>'}</nav><div class="live-sidebar-account"><span class="live-avatar">${esc(initials(state.account.displayName))}</span><button data-live="profile"><b>${esc(state.account.displayName)}</b><small>Edit shared alias</small></button>${icon('shield')}</div>` : `<div class="live-side-art" aria-hidden="true"><span></span><span></span><span></span><i>WL / 02</i></div><div class="live-sidebar-note"><b>A room of your own.</b><p>Make a community, invite your people, and leave a little signal behind.</p></div>`}<button class="live-back" data-live="archive">${icon('arrow')} Personal archive <span>LOCAL</span></button></aside>`;
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
    const c = channel(), r = activeRoom(), allowed = canPost();
    return `<main id="live-main" class="live-main live-conversation ${state.threadRootId ? 'live-thread-panel' : ''}" tabindex="-1"><header class="live-header"><button class="icon-button live-menu" data-live="menu" aria-label="Open shared navigation" aria-expanded="false">${icon('menu')}</button>${state.threadRootId ? `<button class="icon-button" data-live="close-thread" aria-label="Back to channel">${icon('arrow')}</button>` : '<span class="live-header-hash">#</span>'}<div><span>${esc(community()?.name)}</span><h1>${state.threadRootId ? 'Thread · ' : ''}${esc(c.name)}</h1></div><div class="live-header-actions"><button class="icon-button" data-live="search" aria-label="Search shared rooms" title="Search shared rooms">${icon('search')}</button>${community()?.role === 'owner' ? `<button class="live-invite-button" data-live="invite">${icon('users')}<span>Invite</span></button>` : ''}<button class="icon-button" data-live="pins" aria-label="Community pins" title="Community pins">${icon('pin')}</button><button class="icon-button live-people-toggle" data-live="people" aria-label="Show community members" aria-expanded="false">${icon('users')}</button></div></header><div class="live-connection"><span id="live-connection-dot"></span><span id="live-connection-label">Connecting</span><span class="live-connection-copy">Invite-only · Shared text</span><button data-live="refresh" aria-label="Refresh shared messages">Refresh</button></div><div id="live-stream" class="live-stream" tabindex="0" role="log" aria-label="Messages in ${esc(c.name)}" aria-live="off"></div><button class="live-new-messages" id="live-new-messages" data-live="latest" hidden>New messages ${icon('down')}</button><div class="live-compose-wrap"><div id="live-composer-context" class="live-composer-context" hidden></div><div id="live-draft-warning" class="live-draft-warning" role="status" hidden>Draft storage is unavailable. Keep this tab open or <button data-live="copy-drafts">copy your unsent text</button>.</div>${allowed ? `<form id="live-message-form"><label class="sr-only" for="live-message-input">Message ${esc(c.name)}</label><textarea id="live-message-input" name="text" rows="1" maxlength="4000" placeholder="Message #${esc(c.name)}">${esc(r.draft)}</textarea><button type="submit" class="live-send" aria-label="Send shared message">${icon('arrow')}</button></form><div class="live-compose-caption"><span id="live-draft-status">Shared with this community.</span><span><kbd>Enter</kbd> to send · <kbd>Shift Enter</kbd> for a new line</span></div>` : `<div class="live-readonly">${icon('volume')} Only community staff can post in this announcement room.</div>`}</div><div id="live-announcer" class="sr-only" role="status"></div></main><aside class="live-members" aria-label="Shared community members"><header><span>IN THIS COMMUNITY <b>${state.members.length}</b></span><button class="icon-button" data-live="close-drawer" aria-label="Close member list">${icon('close')}</button></header><p class="live-member-note">Community members. Online status is not tracked.</p><div class="live-member-list">${state.members.map(m => `<button class="live-member" data-live-tool="member" data-member="${esc(m.id)}"><span class="live-avatar">${esc(initials(m.display_name))}</span><div><b>${esc(m.display_name)}${m.id === state.account.id ? '<small> YOU</small>' : ''}</b><span>${m.role === 'owner' ? 'Community host' : m.role === 'moderator' ? 'Moderator' : 'Resident'}</span></div>${m.role === 'owner' ? icon('shield') : ''}</button>`).join('')}</div><div class="live-members-card"><span>AFTERHOURS ETIQUETTE</span><h3>Leave a good signal.</h3><p>Make room for the strange ideas, the half-finished things, and each other.</p></div><footer>${icon('live')} An actual shared room.<br>Text updates every few seconds.</footer></aside>`;
  }
  function renderShell() {
    if (!state.active) return;
    root.innerHTML = sidebarHTML() + (state.phase === 'ready' && channel() ? conversationHTML() : splashHTML()) + '<button class="live-drawer-overlay" data-live="close-drawer" aria-label="Close shared navigation"></button>';
    if (state.channelId && channel() && state.phase === 'ready') { renderFeed({restore:true}); updateConnection(); resizeComposer(); updateComposerContext(); }
    syncChrome(); tools()?.onRender?.();
  }
  function renderSidebar() {
    const previous = root?.querySelector('.live-sidebar'); if (!previous) return;
    const focused = previous.contains(document.activeElement) ? document.activeElement : null;
    // Native selects should never disappear while their option menu is open.
    if (focused?.tagName === 'SELECT') return;
    const identity = focused ? {id:focused.id,channel:focused.dataset.liveChannel,tool:focused.dataset.liveTool,action:focused.dataset.live} : null;
    const template = document.createElement('template'); template.innerHTML = sidebarHTML();
    if (template.content?.firstElementChild) {
      const next = template.content.firstElementChild; previous.replaceWith(next);
      if (identity) { const target = Array.from(next.querySelectorAll('button,a,input,select')).find(n => identity.id ? n.id === identity.id : identity.channel ? n.dataset.liveChannel === identity.channel : identity.tool ? n.dataset.liveTool === identity.tool : identity.action && n.dataset.live === identity.action); target?.focus({preventScroll:true}); }
    }
    tools()?.onRender?.();
  }
  function textHTML(text) { return app.format(text); }
  function messageHTML(message, pending = false) {
    const name = pending ? state.account.displayName : message.author_name, own = pending || message.author_id === state.account?.id;
    const date = dateValue(message.created_at || Date.now()), deleted = !!message.deleted_at;
    const preview = message.reply_preview, reactions = message.reactions || [];
    return `<article class="live-message ${own ? 'is-own' : ''} ${pending ? 'is-pending' : ''} ${deleted ? 'live-message-deleted' : ''}" ${pending ? '' : `id="live-message-${esc(message.id)}" data-live-message="${esc(message.id)}" tabindex="-1"`}><span class="live-avatar">${esc(initials(name))}</span><div class="live-message-content"><header><button class="live-author" data-live-tool="member" data-member="${esc(message.author_id || state.account.id)}">${esc(name)}</button>${own ? '<span class="live-you">YOU</span>' : ''}<time datetime="${date.toISOString()}" title="${esc(date.toLocaleString())}">${pending ? (message.status === 'sending' ? 'Sending…' : 'Not confirmed') : date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>${message.edited_at && !deleted ? '<span class="live-edited">edited</span>' : ''}${message.pinned ? '<span class="live-pinned">Pinned</span>' : ''}</header>${message.reply_to_id ? `<button class="live-reply-preview" data-live-jump="${esc(message.reply_to_id)}"><b>${esc(preview?.author_name || 'Original message')}</b><span>${esc(preview?.deleted_at ? 'Message deleted' : preview?.text?.slice(0,180) || 'Open the original message')}</span></button>` : ''}<div class="live-message-text">${deleted ? '<em>This message was deleted.</em>' : textHTML(message.text)}</div>${pending ? `<div class="live-pending-state">${message.status === 'failed' ? `<span>${esc(message.error || 'Could not confirm this message.')}</span><button data-live-retry="${esc(message.clientId)}">Retry</button><button data-live-restore="${esc(message.clientId)}">Copy to draft</button>` : '<span>Waiting for server confirmation.</span>'}</div>` : `<div class="live-reactions">${reactions.map(r => `<button data-live-message-action="reaction" data-message="${esc(message.id)}" data-emoji="${esc(r.emoji)}" aria-pressed="${!!r.mine}" aria-label="${esc(r.emoji)} reaction, ${r.count}${r.mine ? ', you reacted' : ''}" ${deleted ? 'disabled' : ''}>${esc(r.emoji)} <span>${r.count}</span></button>`).join('')}</div>${!message.thread_root_id && (message.thread_count || 0) > 0 ? `<button class="live-thread-link" data-live-message-action="thread" data-message="${esc(message.id)}">${message.thread_count} ${message.thread_count === 1 ? 'reply' : 'replies'} in thread ${icon('arrow')}</button>` : ''}<div class="live-message-actions">${!deleted && canPost() ? `<button data-live-message-action="reply" data-message="${esc(message.id)}">Reply</button>` : ''}<button data-live-message-action="thread" data-message="${esc(message.id)}">Thread</button>${!deleted ? `<button data-live-message-action="react" data-message="${esc(message.id)}">React</button>` : ''}<button data-live-message-action="more" data-message="${esc(message.id)}" aria-label="More actions for ${esc(name)}'s message">${icon('more')}<span>More</span></button></div>`}</div></article>`;
  }
  function updateComposerContext() {
    const node = $('live-composer-context'); if (!node || !state.channelId) return;
    const id = activeRoom().replyToId, message = id && findMessage(id);
    node.hidden = !id;
    node.innerHTML = id ? `<span>Replying to <b>${esc(message?.author_name || 'an earlier message')}</b><small>${esc(message?.deleted_at ? 'Message deleted' : message?.text?.slice(0,120) || 'Open the original to view it')}</small></span><button data-live="cancel-reply" aria-label="Cancel reply">${icon('close')}</button>` : '';
  }
  function renderFeed(options = {}) {
    const feed = $('live-stream'); if (!feed || !state.channelId) return;
    const r = activeRoom(), oldHeight = feed.scrollHeight, oldTop = feed.scrollTop, atBottom = oldHeight - feed.clientHeight - oldTop < 80;
    const focused = feed.contains(document.activeElement) ? document.activeElement : null, focusIdentity = focused ? {id:focused.id,...focused.dataset} : null;
    const visibleAnchor = !atBottom ? Array.from(feed.querySelectorAll('[data-live-message]')).find(n => n.getBoundingClientRect().bottom > feed.getBoundingClientRect().top) : null;
    const anchor = visibleAnchor ? {id:visibleAnchor.id,top:visibleAnchor.getBoundingClientRect().top} : null;
    let html = r.older ? '<button class="live-load-earlier" data-live="older">Load earlier messages</button>' : '';
    if (state.threadRootId) { const parent = findMessage(state.threadRootId); if (parent) html += `<div class="live-thread-root"><span class="eyebrow">THREAD STARTED HERE</span>${messageHTML(parent)}</div>`; }
    if (r.loading) html += '<div class="live-feed-empty" role="status"><span class="live-loading-mark" aria-hidden="true"></span><p>Opening the conversation…</p></div>';
    else if (!r.messages.length && !r.error) html += `<div class="live-feed-empty"><span class="live-empty-symbol">#</span><span class="eyebrow">THE START OF SOMETHING</span><h2>Welcome to ${esc(channel()?.name)}.</h2><p>A quiet room, ready for your first signal.</p>${community()?.role === 'owner' ? '<button class="live-secondary" data-live="invite">Invite your people</button>' : ''}</div>`;
    if (r.error) html += `<div class="live-history-error" role="alert"><span>${esc(r.error)}</span><button data-live="reload-channel">Retry history</button></div>`;
    let day = '';
    for (const message of r.messages.filter(m => !r.newer || m.seq <= r.windowEnd)) {
      const nextDay = dateValue(message.created_at).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric',year:'numeric'});
      if (nextDay !== day) { html += `<div class="live-day-divider"><span>${esc(nextDay)}</span></div>`; day = nextDay; }
      html += messageHTML(message);
    }
    if (r.newer) html += '<button class="live-load-earlier" data-live="newer">Load newer messages</button><button class="live-secondary" data-live="latest-window">Return to latest</button>';
    for (const message of r.pending) html += messageHTML(message,true);
    feed.innerHTML = html;
    if (options.prepend) feed.scrollTop = oldTop + feed.scrollHeight - oldHeight;
    else if (options.restore && r.reading && !r.reading.bottom) feed.scrollTop = r.reading.top;
    else if (options.bottom || options.restore || atBottom) { feed.scrollTop = feed.scrollHeight; if ($('live-new-messages')) $('live-new-messages').hidden = true; }
    else { const replacement = anchor && $(anchor.id); feed.scrollTop = replacement ? oldTop + replacement.getBoundingClientRect().top - anchor.top : oldTop; if (options.newMessages && $('live-new-messages')) $('live-new-messages').hidden = false; }    if (focusIdentity) { const target = focusIdentity.id ? $(focusIdentity.id) : Array.from(feed.querySelectorAll('button')).find(n => Object.entries(focusIdentity).filter(([key]) => key !== 'id').every(([key,value]) => n.dataset[key] === value)); target?.focus({preventScroll:true}); }
  }
  function updateConnection() {
    if ($('live-draft-warning')) $('live-draft-warning').hidden = !state.sessionWarning;
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
    const text = input.value.trim(), id = state.channelId, r = activeRoom();
    if (!text || text.length > 4000) return;
    let message = r.pending.find(p => p.text === text && (p.replyToId || null) === (r.replyToId || null));
    if (message?.status === 'sending') return app.toast('That message is still waiting for confirmation.');
    if (!message && r.pending.length >= 20) return app.toast('Retry or restore your unconfirmed messages before sending more.');
    if (!message) { message = {clientId:crypto.randomUUID(),text,replyToId:r.replyToId || null,threadRootId:state.threadRootId || null,status:'sending',error:''}; r.pending.push(message); }
    r.draft = ''; r.replyToId = null; input.value = ''; saveSession(id); updateComposerContext(); resizeComposer(); renderFeed({bottom:true}); input.focus();
    await transmit(id,message);
  }
  function confirmsPending(data, id, pending, accountId) {
    const message = data?.message, original = data?.acknowledgedPayload;
    const textMatches = original ? original.text === pending.text && original.clientId === pending.clientId && (original.replyToId || null) === (pending.replyToId || null) && (original.threadRootId || null) === (pending.threadRootId || null) : message?.text === pending.text;
    return data?.acknowledged === true && message && message.channel_id === id && message.author_id === accountId && message.client_id === pending.clientId && textMatches && (message.reply_to_id || null) === (pending.replyToId || null) && (message.thread_root_id || null) === (pending.threadRootId || null) && typeof message.id === 'string' && Number.isFinite(message.seq) && Number.isFinite(new Date(message.created_at).getTime());
  }
  async function transmit(id, pending) {
    const accountId = state.account?.id, identityGeneration = state.identityGeneration, r = state.rooms.get(roomKey(id,pending.threadRootId || ''));
    if (!accountId || !r || !r.pending.includes(pending)) return;
    pending.status = 'sending'; pending.error = '';
    if (state.active && state.channelId === id && state.threadRootId === (pending.threadRootId || '')) renderFeed();
    try {
      const data = await request('/channels/'+encodeURIComponent(id)+'/messages',{clientId:pending.clientId,text:pending.text,replyToId:pending.replyToId || null,threadRootId:pending.threadRootId || null});
      if (state.account?.id !== accountId || identityGeneration !== state.identityGeneration) return;
      if (!confirmsPending(data,id,pending,accountId)) throw new Error('The server did not confirm this exact message. Retry safely.');
      mergeMessages(id,[data.message]);
      if (state.active && state.channelId === id && state.threadRootId === (pending.threadRootId || '')) { renderFeed(); state.network = 'Connected'; updateConnection(); $('live-announcer').textContent = 'Message saved to this shared room.'; }
    } catch (error) {
      if (state.account?.id !== accountId || identityGeneration !== state.identityGeneration) return;
      if (!r.pending.some(message => message.clientId === pending.clientId)) return;
      pending.status = 'failed'; pending.error = error.message; saveSession(id,pending.threadRootId || '');
      if (error.status === 401) { signOut(); return; }
      if (error.code === 'account_changed' && state.active) { await connect(); return; }
      if (state.active && state.channelId === id && state.threadRootId === (pending.threadRootId || '')) { renderFeed(); $('live-announcer').textContent = 'Message not confirmed. Retry or copy it to your draft.'; }
    }
  }
  function messageMenu(message) {
    const own = message.author_id === state.account?.id, staff = ['owner','moderator'].includes(community()?.role), deleted = !!message.deleted_at;
    dialog('Message options.',`${esc(message.author_name)} · ${esc(dateValue(message.created_at).toLocaleString())}`,`<div class="live-message-menu">${!deleted ? `<button data-live-message-action="save" data-message="${esc(message.id)}">${message.saved ? 'Remove from personal Saved' : 'Save privately to your account'}</button><button data-live-message-action="copy" data-message="${esc(message.id)}">Copy text</button>` : '<p>This message was deleted. Its place in the conversation remains.</p>'}<button data-live-message-action="link" data-message="${esc(message.id)}">Copy message link</button>${!deleted && own ? `<button data-live-message-action="edit" data-message="${esc(message.id)}">Edit message</button>` : ''}${!deleted && staff ? `<button data-live-message-action="pin" data-message="${esc(message.id)}">${message.pinned ? 'Unpin for this community' : 'Pin for this community'}</button>` : ''}${!deleted && (own || staff) ? `<button class="live-danger" data-live-message-action="delete" data-message="${esc(message.id)}">Delete message</button>` : ''}</div><p class="live-action-error" role="alert"></p>`);
  }
  async function mutateMessage(message, action, body, button) {
    const identity = guard(), key = message.id + ':' + action;
    if (state.actionBusy.has(key)) return;
    state.actionBusy.add(key); if (button) { button.disabled = true; button.setAttribute('aria-busy','true'); }
    const errorNode = document.querySelector('.live-action-error'); if (errorNode) errorNode.textContent = '';
    try {
      const data = await request(`/messages/${encodeURIComponent(message.id)}/${action}`,body);
      if (!identity.current()) return;
      if (!data.message || data.message.id !== message.id || data.message.channel_id !== message.channel_id) throw new Error('The server did not confirm this message change. Try again.');
      mergeMessages(message.channel_id,[data.message]);
      if (state.active && state.channelId === message.channel_id) { renderFeed(); updateComposerContext(); }
      if (button?.closest('.live-dialog')?.isConnected) app.closeModal();
      app.toast(({edit:'Message edited.',delete:'Message deleted.',reaction:'Reaction saved.',pin:body.active ? 'Pinned for the community.' : 'Message unpinned.',save:body.active ? 'Saved privately to your account.' : 'Removed from your Saved messages.'})[action] || 'Change saved.');
      return data.message;
    } catch (error) {
      if (!identity.current()) return;
      if (error.code === 'account_changed') { await connect(); return; }
      if (error.status === 401) { signOut(); return; }
      if (errorNode?.isConnected) errorNode.textContent = error.message; else app.toast(error.message);
    } finally { state.actionBusy.delete(key); if (button?.isConnected) { button.disabled = false; button.removeAttribute('aria-busy'); } }
  }
  function messageAction(action, id, button) {
    const message = findMessage(id); if (!message) return app.toast('This source is not loaded. Open the message again.');
    if (action === 'thread') return openThread(message.thread_root_id || message.id);
    if (action === 'more') return messageMenu(message);
    if (action === 'link') return copyText(location.origin + location.pathname + '#shared/' + encodeURIComponent(message.id),'Message link copied. Only community members can open it.');
    if (message.deleted_at) return app.toast('This message was deleted.');
    if (action === 'reply') {
      if (!canPost()) return app.toast('Only community staff can post here.');
      activeRoom().replyToId = message.id; saveSession(); updateComposerContext(); $('live-message-input')?.focus(); return;
    }
    if (action === 'copy') return copyText(message.text,'Message copied.');
    if (action === 'save') return mutateMessage(message,'save',{active:!message.saved},button);
    if (action === 'pin') return mutateMessage(message,'pin',{active:!message.pinned},button);
    if (action === 'react') { dialog('Leave a reaction.','Reactions are visible to members of this community.',`<div class="live-reaction-picker">${['♥','🔥','✨','👀','👍','😂'].map(emoji => `<button data-live-message-action="reaction" data-message="${esc(id)}" data-emoji="${emoji}" aria-label="React ${emoji}">${emoji}</button>`).join('')}</div><p class="live-action-error" role="alert"></p>`); return; }
    if (action === 'reaction') { const emoji = button.dataset.emoji; return mutateMessage(message,'reaction',{emoji,active:!message.reactions?.find(r => r.emoji === emoji)?.mine},button); }
    if (action === 'edit') { dialog('Refine your signal.','Only the author can edit this message. Other members will see an edited label.',`<form data-live-edit="${esc(id)}"><label for="live-edit-text">Message text</label><textarea id="live-edit-text" name="text" maxlength="4000" rows="6" required autofocus>${esc(message.text)}</textarea><p class="live-action-error" role="alert"></p><button class="live-primary" type="submit">Save edit</button></form>`); return; }
    if (action === 'delete') { dialog('Delete this message?','Its text will be removed for everyone. Replies and thread history will retain a deleted-message reference.',`<p class="live-delete-preview">${esc(message.text.slice(0,240))}</p><p class="live-action-error" role="alert"></p><button class="live-danger" data-live-message-action="confirm-delete" data-message="${esc(id)}">Delete for everyone</button><button class="live-secondary" data-live="cancel-dialog">Keep message</button>`); return; }
    if (action === 'confirm-delete') return mutateMessage(message,'delete',{},button);
  }
  async function pinsDialog() {
    const identity = guard(), channelId = state.channelId, generation = state.generation;
    dialog('Community pins.','Pinned by the host or moderators. Personal Saved messages are private to your account.','<div id="live-pins-results" role="status">Loading pins…</div>');
    try {
      const data = await request(`/channels/${encodeURIComponent(channelId)}/pins`);
      if (!identity.current() || generation !== state.generation || !$('live-pins-results')) return;
      mergeMessages(channelId,data.messages);
      $('live-pins-results').innerHTML = data.messages.map(m => `<button class="live-pin-result" data-live-jump="${esc(m.id)}"><b>${esc(m.author_name)}</b><p>${esc(m.deleted_at ? 'Message deleted' : m.text.slice(0,220))}</p></button>`).join('') || '<p>No pins in this room yet.</p>';
    } catch(error) { if (identity.current() && $('live-pins-results')) $('live-pins-results').textContent = error.message; }
  }
  function copyDrafts() {
    captureDraft(); const rows = [];
    for (const r of state.rooms.values()) { if (r.draft || r.pending.length) rows.push(`Channel ${r.channelId}${r.threadRootId ? ' / thread ' + r.threadRootId : ''}\n${r.draft}${r.pending.map(p => '\nUnconfirmed [' + p.clientId + ']: ' + p.text).join('')}`); }
    copyText(rows.join('\n\n'),'Unsent text copied. This recovery copy stays under your control.');
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
    if (tools()?.search) return tools().search();
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
    const actions = {archive:() => {app.closeModal();exitLive();},menu:() => toggleDrawer('nav'),people:() => toggleDrawer('people'),'close-drawer':() => closeDrawers(),reconnect:connect,create:createDialog,join:() => joinDialog(state.pendingInvite),profile:() => tools()?.profile ? tools().profile() : profileDialog(),'add-channel':channelDialog,invite:() => tools()?.invite ? tools().invite() : inviteDialog(),search:searchDialog,pins:pinsDialog,'close-thread':closeThread,'cancel-dialog':() => app.closeModal(),'cancel-reply':() => {activeRoom().replyToId = null;saveSession();updateComposerContext();$('live-message-input')?.focus();},'copy-drafts':copyDrafts,older:() => olderMessages(button),newer:() => newerMessages(button),'latest-window':() => state.threadRootId ? openThread(state.threadRootId,true) : selectChannel(state.channelId,true),'reload-community':() => selectCommunity(state.communityId),'reload-channel':() => state.threadRootId ? openThread(state.threadRootId) : selectChannel(state.channelId),refresh:() => {if (activeRoom().error) state.threadRootId ? openThread(state.threadRootId) : selectChannel(state.channelId); else {state.network = 'Checking';updateConnection();schedulePoll(0);}},latest:() => {if(activeRoom().newer)return state.threadRootId ? openThread(state.threadRootId,true) : selectChannel(state.channelId,true);const feed = $('live-stream');if (feed) feed.scrollTop = feed.scrollHeight;$('live-new-messages').hidden = true;},'copy-invite':() => copyText($('live-generated-invite').value,'Invitation copied.',$('live-generated-invite'))};
    if (actions[action]) return actions[action]();
    tools()?.handleAction?.(action,button);
  }
  function bind() {
    document.addEventListener('click',event => {
      const button = event.target.closest('button,a,[data-action]'); if (!button) return;
      if (button.dataset.action === 'live') { event.preventDefault(); event.stopImmediatePropagation(); enterLive(); return; }
      if (button.dataset.liveMessageAction) { event.preventDefault(); event.stopImmediatePropagation(); return messageAction(button.dataset.liveMessageAction,button.dataset.message,button); }
      if (button.dataset.live) { event.preventDefault(); event.stopImmediatePropagation(); return handleAction(button.dataset.live,button); }
      if (button.dataset.liveChannel) { event.preventDefault(); event.stopImmediatePropagation(); selectChannel(button.dataset.liveChannel); return; }
      if (button.dataset.liveRetry) { event.preventDefault(); event.stopImmediatePropagation(); const p = activeRoom().pending.find(m => m.clientId === button.dataset.liveRetry); if (p?.status === 'failed') transmit(state.channelId,p); return; }
      if (button.dataset.liveRestore) { event.preventDefault(); event.stopImmediatePropagation(); const r = activeRoom(), p = r.pending.find(m => m.clientId === button.dataset.liveRestore); if (!p || p.status !== 'failed') return; captureDraft(); if (r.draft === p.text) { $('live-message-input').focus(); return; } if (r.draft.length + p.text.length + 2 > 4000) return app.toast('Save or send your current draft before restoring this message.'); r.draft = r.draft ? r.draft + '\n\n' + p.text : p.text; r.replyToId = p.replyToId || null; saveSession(); updateComposerContext(); $('live-message-input').value = r.draft; renderFeed(); resizeComposer(); $('live-message-input').focus(); app.toast('Copied to your draft. Sending the same text retries its original message ID.'); return; }
      if (button.dataset.liveCopy) { event.preventDefault(); event.stopImmediatePropagation(); const m = room().messages.find(m => m.id === button.dataset.liveCopy); if (m) copyText(m.text,'Message copied.'); return; }
      if (button.dataset.liveJump) { event.preventDefault(); event.stopImmediatePropagation(); return jumpMessage(button.dataset.liveJump); }
      if (!state.active) return;
      if (button.dataset.action === 'network' || button.dataset.action === 'command') { event.preventDefault(); event.stopImmediatePropagation(); button.dataset.action === 'network' ? sharedStatus() : searchDialog(); return; }
      if (button.closest('.server-rail') || button.classList.contains('wordmark')) exitLive();
    },true);
    document.addEventListener('submit',event => {
      if (event.target.dataset.liveEdit) { event.preventDefault(); event.stopImmediatePropagation(); const message = findMessage(event.target.dataset.liveEdit), text = String(new FormData(event.target).get('text') || '').trim(); if (message && text && text.length <= 4000) return mutateMessage(message,'edit',{text},event.target.querySelector('[type="submit"]')); }
      else if (event.target.id === 'live-message-form') { event.preventDefault(); event.stopImmediatePropagation(); send(); }
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
      if (event.target.id === 'live-message-input' && event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); event.stopImmediatePropagation(); send(); return; }
      if (event.key === 'Escape' && state.threadRootId && !state.drawer && !document.querySelector('dialog[open]')) { event.preventDefault(); event.stopImmediatePropagation(); closeThread(); return; }
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
    window.addEventListener('hashchange',() => { if (/^#shared\//.test(location.hash)) { state.deepLink = deepLinkFromHash(); if (state.active && state.phase === 'ready') { const id=state.deepLink;state.deepLink='';jumpMessage(id); } else enterLive(); } else if (/^#join=/.test(location.hash)) { state.pendingInvite = inviteFrom(location.href); enterLive(); } else if (location.hash === '#shared') enterLive(); else if (state.active) exitLive(); });
    window.addEventListener('resize',() => { if (state.drawer && matchMedia(state.drawer === 'nav' ? '(min-width:761px)' : '(min-width:1051px)').matches) closeDrawers(false); });
  }
  function init() {
    if (root || !window.VoidApp) return;
    app = window.VoidApp; originalScope = document.querySelector('.local-tag')?.innerHTML || ''; originalSearch = document.querySelector('.titlebar-command')?.innerHTML || ''; originalSearchLabel = document.querySelector('.titlebar-command')?.getAttribute('aria-label') || 'Search messages, channels, and people';
    root = document.createElement('section'); root.id = 'live-workspace'; root.hidden = true; root.setAttribute('aria-label','Shared rooms'); document.querySelector('.app-shell').append(root);
    bind();
    window.VoidLive = Object.freeze({open:enterLive,close:exitLive,isActive:() => state.active,state,request,guard,esc,icon,app,dialog,closeDialog:() => app.closeModal(),toast:message => app.toast(message),captureDraft,renderSidebar,refreshSidebar:renderSidebar,refreshView:() => {captureDraft();renderShell();},selectCommunity,selectChannel,jumpMessage,navigate,refreshCommunities:() => loadCommunities(),updateMessage:message => {mergeMessages(message.channel_id,[message]);if(state.active && state.channelId === message.channel_id)renderFeed();},getRoom:activeRoom,copyText,community,channel,registerTools(module){toolsModule=module;module.init?.(window.VoidLive);if(state.active)renderSidebar();}});
    if (window.VoidLiveTools) window.VoidLive.registerTools(window.VoidLiveTools);
    state.pendingInvite = inviteFrom(location.href);
    state.deepLink = deepLinkFromHash();
    if (location.hash === '#shared' || state.deepLink || state.pendingInvite) enterLive();
  }
  window.addEventListener('voidline:ready',init,{once:true});
  if (window.VoidApp) init();
})();
