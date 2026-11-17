/* Account-scoped discovery and community tools for the shared service. */
(() => {
  'use strict';
  let live, initialized = false, identity = '', epoch = 0, refreshPromise = null, refreshedAt = 0, panel = 0;
  let favorites = new Set(), unread = new Map(), counts = {unread:0,mentions:0,activity:0}, filter = 'all', summaryError = '', favoriteQueue = Promise.resolve(), unreadVersion = 0, favoritesVersion = 0;
  let inboxView = 'unread', searchValues = {}, panelPage = 0, searchGeneration = 0;
  const $ = id => document.getElementById(id);
  const state = () => live?.state || {};
  const esc = value => live.esc(value);
  const icon = value => live.icon(value);
  const encode = value => encodeURIComponent(String(value));
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const time = value => { const date = new Date(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value); return Number.isFinite(date.getTime()) ? date.toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Time unavailable'; };
  const ready = () => !!state().account && state().phase === 'ready';
  const profileName = profile => profile.displayName || profile.display_name || 'Resident';
  function syncIdentity() {
    const next = state().account?.id || '';
    if (next === identity) return;
    identity = next; epoch++; panel++; refreshedAt = 0; refreshPromise = null; favoriteQueue = Promise.resolve(); unreadVersion++; favoritesVersion++;
    favorites = new Set(); unread = new Map(); counts = {unread:0,mentions:0,activity:0}; summaryError = ''; searchValues = {};
    filter = 'all';
    try { const saved = sessionStorage.getItem('voidline.shared.filter.v1.' + identity); if (['all','unread','favorites'].includes(saved)) filter = saved; } catch (_) { /* optional UI preference */ }
  }
  function guard() {
    syncIdentity(); const ownEpoch = epoch, ownIdentity = identity, upstream = live.guard();
    return () => state().active && ownEpoch === epoch && ownIdentity === state().account?.id && upstream.current();
  }
  function panelGuard() { const current = guard(), ticket = ++panel; return () => current() && ticket === panel && $('app-modal')?.open !== false; }
  function dialog(title, copy, html) { live.dialog(title,copy,`<div class="live-tools-panel">${html}</div>`); }
  const errorHTML = '<p class="live-tool-error" id="live-tools-error" role="alert"></p>';
  function failure(error, current = () => true) {
    if (!current()) return;
    const node = $('live-tools-error'); if (node) node.textContent = error.message || 'This action could not be completed. Try again.';
    else live.toast(error.message || 'This action could not be completed.');
  }
  function empty(title, copy) { return `<div class="live-tool-empty"><h3>${esc(title)}</h3><p>${esc(copy)}</p></div>`; }
  function pagination(data, action, offset) {
    const total = finite(data.total), limit = finite(data.page?.limit) || 30;
    return `<div class="live-tools-pagination"><span>${total ? `${offset + 1}–${Math.min(offset + limit,total)} of ${total}` : '0 results'}</span><button class="live-secondary" data-live-tool="${action}" data-offset="${Math.max(0,offset-limit)}" ${offset ? '' : 'disabled'}>Previous</button><button class="live-secondary" data-live-tool="${action}" data-offset="${offset+limit}" ${data.page?.hasMore ? '' : 'disabled'}>Next</button></div>`;
  }
  function destination(message) {
    return `data-community="${esc(message.community_id || '')}" data-channel="${esc(message.channel_id || '')}" data-message="${esc(message.id || message.message_id || '')}" data-thread="${esc(message.thread_root_id || '')}"`;
  }
  function resultHTML(message, kind) {
    const unavailable = !!message.unavailable, deleted = !!message.deleted_at, id = message.id || message.message_id;
    const copy = deleted ? 'This message was deleted. Its conversation reference is retained.' : unavailable ? 'The original is unavailable. You may have left its community or lost access.' : message.text || '';
    return `<article class="live-tool-result"><div class="live-tool-source"><b>${esc(message.author_name || 'Original author')}</b><time>${esc(time(message.created_at || message.saved_at))}</time></div><p class="live-tool-source">${esc(message.community_name || 'Former community')} / #${esc(message.channel_name || 'unavailable room')}${message.thread_root_id ? ' · thread reply' : ''}</p><p class="live-tool-copy">${esc(copy.slice(0,700))}</p><div class="live-tool-result-actions">${!unavailable || deleted ? `<button class="live-secondary" data-live-tool="jump" ${destination(message)}>Open ${message.thread_root_id ? 'thread reply' : 'message'} ${icon('arrow')}</button>` : ''}${kind === 'saved' ? `<button class="live-secondary" data-live-tool="unsave" data-message="${esc(id)}">Remove from Saved</button>` : kind === 'inbox' ? `<button class="live-secondary" data-live-tool="read" data-channel="${esc(message.channel_id)}" data-seq="${finite(message.seq)}" data-change="${finite(message.activity_seq || message.change_seq)}">Mark conversation read through here</button>` : ''}</div></article>`;
  }
  async function refresh(force = false) {
    syncIdentity(); if (!ready()) return;
    if (refreshPromise || (!force && Date.now() - refreshedAt < 15000)) return refreshPromise;
    const current = guard(), requestUnreadVersion = ++unreadVersion, requestFavoritesVersion = favoritesVersion;
    const running = (async () => {
      try {
        const [activity, star] = await Promise.all([live.request('/inbox?view=unread&limit=1&offset=0'),live.request('/favorites')]);
        if (!current()) return;
        if (requestUnreadVersion === unreadVersion) {unread = new Map((activity.conversations || []).map(c => [c.channel_id,c])); counts = {...counts,...activity.counts};}
        if (requestFavoritesVersion === favoritesVersion) favorites = new Set(star.favorites || []); summaryError = ''; refreshedAt = Date.now();
        live.renderSidebar();
      } catch (error) { if (current()) { summaryError = 'Counts unavailable. Open Inbox to retry.'; refreshedAt = Date.now(); live.renderSidebar(); } }
    })();
    refreshPromise = running;
    try { await running; } finally { if (refreshPromise === running) refreshPromise = null; }
  }
  function sidebarHTML() {
    syncIdentity(); if (!ready()) return '';
    return `<nav class="live-tools-nav" aria-label="Shared conversation tools"><button data-live-tool="inbox">${icon('inbox')}<span>Inbox</span>${finite(counts.unread) ? `<b class="live-tool-count" aria-label="${finite(counts.unread)} unread messages">${finite(counts.unread)}</b>` : ''}</button><button data-live-tool="saved">${icon('bookmark')}<span>Saved</span></button><button data-live-tool="search">${icon('search')}<span>Search</span></button></nav><div class="live-channel-filters" role="group" aria-label="Filter shared channels">${[['all','All'],['unread','Unread'],['favorites','Favorites']].map(([id,label]) => `<button data-live-tool="filter" data-filter="${id}" class="${filter === id ? 'is-active' : ''}" aria-pressed="${filter === id}">${label}</button>`).join('')}</div>${summaryError ? `<p class="live-filter-note">${summaryError}</p>` : ''}${filter !== 'all' && !filterChannels(state().channels || []).length ? `<p class="live-filter-note">No ${filter} rooms in this community. <button data-live-tool="filter" data-filter="all">Show all</button></p>` : ''}${filter !== 'all' && state().channelId && !visibleChannel(state().channelId) ? `<p class="live-filter-note">Your open conversation is outside this filter.</p>` : ''}<button class="live-community-tools" data-live-tool="settings">${icon('settings')} Community ${live.community()?.role === 'owner' ? 'settings' : 'details'}</button>`;
  }
  const visibleChannel = id => filter === 'all' || (filter === 'favorites' ? favorites.has(id) : finite(unread.get(id)?.unread_count) > 0);
  function filterChannels(channels) { syncIdentity(); return channels.filter(c => visibleChannel(c.id)); }
  function onRender() {
    syncIdentity(); if (!ready()) return;
    document.querySelectorAll('#live-workspace [data-live-channel]').forEach(button => {
      const id = button.dataset.liveChannel;
      const container = button.parentElement; if (!container || container.querySelector(`[data-live-favorite="${id}"]`)) return;
      // A sibling button preserves the channel button's native keyboard behavior.
      const star = document.createElement('button'); star.className = 'live-favorite-button'; star.dataset.liveTool = 'favorite'; star.dataset.channel = id; star.dataset.liveFavorite = id;
      star.setAttribute('aria-label',`${favorites.has(id) ? 'Remove' : 'Add'} #${state().channels.find(c => c.id === id)?.name || 'room'} ${favorites.has(id) ? 'from' : 'to'} Favorites`);
      star.setAttribute('aria-pressed',String(favorites.has(id))); star.innerHTML = icon('star');
      const row = document.createElement('div'); row.className = 'live-channel-row'; button.replaceWith(row); row.append(button,star);
      const count = finite(unread.get(id)?.unread_count); if (count) { const badge = document.createElement('span'); badge.className = 'live-tool-count'; badge.textContent = String(count); button.append(badge); }
    });
  }
  function onData() { syncIdentity(); if (ready()) refresh(); }
  function setFavorite(id, button) {
    const current = guard(); if (button) button.disabled = true;
    // Serialize account preference mutations so out-of-order responses cannot
    // replace the list returned by a newer favorite change.
    const operation = favoriteQueue.catch(() => {}).then(async () => {
      if (!current()) return;
      try { const data = await live.request('/favorites',{channelId:id,active:!favorites.has(id)}); if (!current()) return; favorites = new Set(data.favorites || []); favoritesVersion++; live.renderSidebar(); }
      catch (error) { failure(error,current); }
      finally { if (current() && button?.isConnected) button.disabled = false; }
    });
    favoriteQueue = operation;
    return operation;
  }
  async function inbox(view = 'unread', offset = 0) {
    if (!ready()) return; inboxView = ['unread','mentions','activity'].includes(view) ? view : 'unread'; panelPage = offset;
    const current = panelGuard(), requestUnreadVersion = ++unreadVersion;
    dialog('Your shared inbox.','Real activity in communities you belong to. Opening this view does not mark anything read.',`<div class="live-tools-tabs" role="group" aria-label="Inbox view">${['unread','mentions','activity'].map(name => `<button data-live-tool="inbox-tab" data-view="${name}" aria-pressed="${name===inboxView}" class="${name===inboxView?'is-active':''}">${name[0].toUpperCase()+name.slice(1)} <span>${finite(counts[name])}</span></button>`).join('')}</div><div class="live-tools-actions"><button class="live-secondary" data-live-tool="read-all">Mark all shared conversations read</button></div>${errorHTML}<div id="live-tools-results" class="live-tools-results" role="status">Loading shared activity…</div>`);
    const results=$('live-tools-results');
    try {
      const data = await live.request(`/inbox?view=${inboxView}&limit=30&offset=${offset}`);
      if (!current() || !results?.isConnected) return;
      if (requestUnreadVersion === unreadVersion) {counts = {...counts,...data.counts}; unread = new Map((data.conversations || []).map(c => [c.channel_id,c]));} refreshedAt = Date.now(); live.renderSidebar();
      document.querySelectorAll('[data-live-tool="inbox-tab"]').forEach(button => {const label=button.querySelector('span');if(label)label.textContent=String(finite(counts[button.dataset.view]));});
      results.innerHTML = (data.items || []).map(m=>resultHTML(m,'inbox')).join('') || empty(inboxView==='unread' ? 'You are caught up.' : inboxView==='mentions' ? 'No unread mentions.' : 'No unread shared activity.',inboxView==='mentions' ? 'Mentions of your exact shared alias will appear here.' : 'New activity from your shared communities appears here. Sample archive activity stays in the personal archive.');
      results.insertAdjacentHTML('beforeend',pagination(data,'inbox-page',offset));
    } catch (error) { if (current() && results?.isConnected) { results.innerHTML = empty('Activity could not load.','Your read state has not changed.'); failure(error,current); } }
  }
  async function markRead(channelId, seq, all = false, button, changeSeq) {
    const current = guard(),ticket=panel; if(button)button.disabled=true;
    try { await live.request('/read',all ? {all:true} : {channelId,seq:finite(seq),...(changeSeq ? {changeSeq:finite(changeSeq)} : {})}); if(!current())return; await refresh(true); if(current()&&ticket===panel&&(!button||button.isConnected))await inbox(inboxView,0); }
    catch(error){failure(error,current);}
    finally { if(current()&&button?.isConnected)button.disabled=false; }
  }
  async function saved(offset = 0) {
    if(!ready())return; panelPage=offset; const current=panelGuard();
    dialog('Signals worth keeping.','Private bookmarks for this signed-in account, available across your devices. Community pins are separate.',`${errorHTML}<div id="live-tools-results" class="live-tools-results" role="status">Loading Saved…</div>`);
    const results=$('live-tools-results');
    try { const data=await live.request(`/saved?limit=30&offset=${offset}`); if(!current()||!results?.isConnected)return;
      results.innerHTML=(data.messages||[]).map(m=>resultHTML(m,'saved')).join('')||empty('Nothing saved yet.','Choose Save from a shared message’s actions. Your device-local saved messages remain in the personal archive.');
      results.insertAdjacentHTML('beforeend',pagination(data,'saved-page',offset));
    }catch(error){if(current()&&results?.isConnected){results.innerHTML=empty('Saved could not load.','Your bookmarks are unchanged.');failure(error,current);}}
  }
  async function save(message, active = true, button) {
    if(!ready()||!message?.id)return; const current=guard(),ticket=panel;if(button)button.disabled=true;
    try { await live.request(`/messages/${encode(message.id)}/save`,{active});if(!current())return;live.toast(active?'Saved privately to your shared account.':'Removed from Saved. The original message is unchanged.');if(!active&&ticket===panel&&(!button||button.isConnected)&&$('live-tools-results'))await saved(panelPage); }
    catch(error){failure(error,current);}finally{if(current()&&button?.isConnected)button.disabled=false;}
  }
  function validateSearch(values) {
    for(const name of ['before','after'])if(values[name]){if(!/^\d{4}-\d{2}-\d{2}$/.test(values[name])||new Date(values[name]+'T00:00:00Z').toISOString().slice(0,10)!==values[name])throw new Error('Use a real calendar date in YYYY-MM-DD format.');}
    if(values.before&&values.after&&values.after>=values.before)throw new Error('After must be earlier than Before. After is inclusive; Before is exclusive.');
    return values;
  }
  function search() {
    if(!ready())return live.toast('Sign in and join a shared community to search.'); const current=panelGuard();
    const values=searchValues;
    dialog('Find a shared signal.','Search the full text history you have permission to read. Dates use UTC: After includes that day; Before excludes it.',`<form id="live-tools-search-form" class="live-tools-search-form" data-live-tools-form="search"><label for="live-tools-query">Words or phrase</label><input id="live-tools-query" name="q" type="search" value="${esc(values.q||'')}" maxlength="200" autofocus placeholder="Search messages, people, rooms…"><div class="live-tools-field-grid"><label>Community<select name="communityId"><option value="">All my communities</option>${(state().communities||[]).map(c=>`<option value="${esc(c.id)}" ${values.communityId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>Conversation<select name="channelId"><option value="">All permitted rooms</option>${(state().channels||[]).map(c=>`<option value="${esc(c.id)}" ${values.channelId===c.id?'selected':''}>${esc(live.community()?.name)} / #${esc(c.name)}</option>`).join('')}</select></label><label>Author<select name="authorId"><option value="">Anyone</option>${(state().members||[]).map(m=>`<option value="${esc(m.id)}" ${values.authorId===m.id?'selected':''}>${esc(m.display_name)}</option>`).join('')}</select></label><label>Content<select name="has"><option value="text">Shared text</option></select></label><label>After (UTC, inclusive)<input type="date" name="after" value="${esc(values.after||'')}"></label><label>Before (UTC, exclusive)<input type="date" name="before" value="${esc(values.before||'')}"></label></div>${errorHTML}<button class="live-primary" type="submit">Search shared history ${icon('search')}</button><p class="live-form-note">Shared attachments are not available. Search your personal archive separately for local media.</p></form><div id="live-tools-results" class="live-tools-results"></div>`);
    if(current()&&values.q)runSearch(values,0);
  }
  async function runSearch(values,offset=0) {
    const current=guard(), ticket=panel, queryGeneration=++searchGeneration;
    try { validateSearch(values); } catch(error){failure(error,current);return;}
    searchValues={...values};panelPage=offset;
    const results=$('live-tools-results');if(!results)return;results.innerHTML='<p role="status">Searching your permitted shared history…</p>';if($('live-tools-error'))$('live-tools-error').textContent='';
    const params=new URLSearchParams({limit:'30',offset:String(offset)});for(const [key,value]of Object.entries(values))if(value)params.set(key,value);
    try{const data=await live.request('/search?'+params);if(!current()||ticket!==panel||queryGeneration!==searchGeneration||!results.isConnected)return;
      let html='';if(offset===0){
        if(data.communities?.length)html+=`<h3>Communities</h3><div class="live-tools-actions">${data.communities.map(c=>`<button class="live-secondary" data-live-tool="jump" data-community="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>`;
        if(data.channels?.length)html+=`<h3>Rooms</h3><div class="live-tools-actions">${data.channels.map(c=>`<button class="live-secondary" data-live-tool="jump" data-community="${esc(c.community_id)}" data-channel="${esc(c.id)}">${esc(c.community_name||'Community')} / #${esc(c.name)}</button>`).join('')}</div>`;
        if(data.people?.length)html+=`<h3>People</h3><div class="live-tools-actions">${data.people.map(p=>`<button class="live-secondary" data-live-tool="member-profile" data-account="${esc(p.id)}">${esc(p.display_name)}</button>`).join('')}</div>`;
      }
      html+=`<p class="live-form-note">People, communities and rooms show up to ${finite(data.entityLimit)||30} matches each. Message results include every permitted match and are paginated below.</p><h3>${finite(data.total)} matching messages</h3>`+(data.messages||[]).map(m=>resultHTML(m,'search')).join('');
      if(!data.messages?.length)html+=empty('No matching messages.','Try a shorter phrase or clear a conversation, author, or date filter.');
      results.innerHTML=html+pagination(data,'search-page',offset);
    }catch(error){if(current()&&ticket===panel&&queryGeneration===searchGeneration&&results.isConnected){results.innerHTML=empty('Search could not finish.','Your existing conversations are unchanged.');failure(error,current);}}
  }
  const avatarPaths={moon:'M17 3a9 9 0 1 0 4 14A9 9 0 0 1 17 3Z',orbit:'M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0M2 16 22 8',spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z',leaf:'M20 3C8 2 3 8 5 16c7 7 15 0 15-13ZM5 20 16 8',ghost:'M5 20V9a7 7 0 0 1 14 0v11l-4-2-3 2-3-2-4 2M9 9v2m6-2v2'};
  function avatar(value){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${avatarPaths[value]||avatarPaths.moon}"/></svg>`;}
  function profileCard(data){return `<div class="live-profile-preview" data-theme="${['obsidian','lilac','ice'].includes(data.theme)?data.theme:'obsidian'}"><span class="live-profile-avatar">${avatar(data.avatar)}</span><span class="eyebrow">SHARED PROFILE</span><h3>${esc(profileName(data))}</h3>${data.status?`<p class="live-profile-status">${esc(data.status)}</p>`:''}<p class="live-profile-bio">${esc(data.bio||'A little room for your story.')}</p></div>`;}
  function profile(){
    if(!state().account)return;panelGuard();const p=state().account;
    dialog('Your shared identity.','Members see this profile with your shared alias. Your local profile world and artifact cabinet remain separate.',`<form data-live-tools-form="profile" id="live-tools-profile-form"><div id="live-profile-preview">${profileCard(p)}</div><label for="live-profile-alias">Public alias</label><input id="live-profile-alias" name="displayName" required minlength="2" maxlength="32" value="${esc(profileName(p))}"><label for="live-profile-bio">Short bio</label><textarea id="live-profile-bio" name="bio" maxlength="240" rows="3">${esc(p.bio||'')}</textarea><label for="live-profile-status">Status</label><input id="live-profile-status" name="status" maxlength="80" value="${esc(p.status||'')}"><div class="live-tools-field-grid"><label>Visual theme<select name="theme">${['obsidian','lilac','ice'].map(v=>`<option ${p.theme===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Original avatar<select name="avatar">${Object.keys(avatarPaths).map(v=>`<option ${p.avatar===v?'selected':''}>${v}</option>`).join('')}</select></label></div><p id="live-profile-save-state" role="status">Saved account profile.</p>${errorHTML}<button type="submit" class="live-primary">Save shared profile</button><p class="live-form-note">Local artwork, uploads and artifact ownership are not transferred to this account.</p></form>`);
  }
  async function memberProfile(id){
    const current=panelGuard();dialog('A shared resident.','Public information this person chose to share.',`${errorHTML}<div id="live-tools-results" role="status">Loading profile…</div>`);
    const results=$('live-tools-results');
    try{const data=await live.request('/profiles/'+encode(id));if(!current()||!results?.isConnected)return;const p=data.profile||data.account||data; results.innerHTML=profileCard(p)+'<p class="live-form-note">Shown because you share a community. This is not a presence or delivery indicator.</p>';}
    catch(error){if(current()&&results?.isConnected){results.innerHTML=empty('Profile unavailable.','You may no longer share a community with this person.');failure(error,current);}}
  }
  async function saveProfile(form){
    const current=guard(),values=Object.fromEntries(new FormData(form));const button=form.querySelector('[type="submit"]');if(form.dataset.busy)return;form.dataset.busy='1';if(button)button.disabled=true;
    try{const data=await live.request('/profile',values);if(!current()||!form.isConnected)return;
      if(data.account?.id!==state().account?.id)throw Error('The signed-in account changed. Reconnect before saving.');
      state().account={...state().account,...data.account};for(const r of state().rooms.values())for(const m of r.messages)if(m.author_id===data.account.id)m.author_name=data.account.displayName;
      state().members=(state().members||[]).map(m=>m.id===data.account.id?{...m,...data.account,display_name:data.account.displayName}:m);
      const visibleValues=Object.fromEntries(new FormData(form));
      const hasNewerEdits=Object.keys(values).some(key=>visibleValues[key]!==values[key]);
      if($('live-profile-save-state'))$('live-profile-save-state').textContent=hasNewerEdits?'Submitted version saved. Your newer edits are still unsaved.':'Saved to your shared account.';
      live.renderSidebar();live.toast(hasNewerEdits?'Submitted profile saved. Save again to keep your newer edits.':'Shared profile saved.');
    }catch(error){failure(error,current);}finally{delete form.dataset.busy;if(button?.isConnected)button.disabled=false;}
  }
  function profileInput(form){const values=Object.fromEntries(new FormData(form));const preview=$('live-profile-preview');if(preview)preview.innerHTML=profileCard(values);const saved=$('live-profile-save-state');if(saved)saved.textContent='Unsaved changes. Save before closing.';}
  function settings(){
    const c=live.community();if(!c)return;panelGuard();const owner=c.role==='owner',staff=owner||c.role==='moderator';
    dialog(esc(c.name),'Community identity and permissions are enforced by the shared service.',`<p class="live-form-note">Your role: <strong>${esc(c.role)}</strong>. ${owner?'Owners manage rooms, invitations, membership and community identity.':staff?'Moderators manage community pins and may remove ordinary members.':'Members can read rooms and post in ordinary text rooms. Announcement posting is reserved for staff.'}</p><form data-live-tools-form="community" data-community="${esc(c.id)}"><label for="live-settings-name">Community name</label><input id="live-settings-name" name="name" required maxlength="64" value="${esc(c.name)}" ${owner?'':'readonly'}><label for="live-settings-description">Description</label><textarea id="live-settings-description" name="description" maxlength="240" rows="3" ${owner?'':'readonly'}>${esc(c.description||'')}</textarea><label for="live-settings-icon">Community mark</label><input id="live-settings-icon" name="icon" maxlength="8" value="${esc(c.icon||'')}" placeholder="WL" ${owner?'':'readonly'}>${errorHTML}${owner?'<button type="submit" class="live-primary">Save community</button>':''}</form><div class="live-tools-actions"><button class="live-secondary" data-live-tool="members" data-community="${esc(c.id)}">${icon('users')} Members</button>${owner?`<button class="live-secondary" data-live-tool="invites" data-community="${esc(c.id)}">Manage invitations</button>`:''}<button class="live-danger" data-live-tool="leave-confirm" data-community="${esc(c.id)}">${owner?'Transfer ownership to leave':'Leave community'}</button></div>`);
  }
  async function members(communityId=state().communityId){
    const c=state().communities.find(c=>c.id===communityId);if(!c)return;const current=panelGuard();
    dialog('People in the room.',esc(c.name)+' · Roles determine what each person can do.',`${errorHTML}<div id="live-tools-results" class="live-settings-members" role="status">Loading members…</div>`);
    const results=$('live-tools-results');
    try{const data=await live.request(`/communities/${encode(communityId)}/members`);if(!current()||!results?.isConnected)return;
      results.innerHTML=(data.members||[]).map(m=>`<article class="live-settings-member"><span class="live-profile-avatar">${avatar(m.avatar)}</span><div><button class="live-text-button" data-live-tool="member-profile" data-account="${esc(m.id)}">${esc(m.display_name)}</button><small>${esc(m.role)}</small>${m.status?`<p>${esc(m.status)}</p>`:''}</div><div class="live-tools-actions">${c.role==='owner'&&m.role!=='owner'?`<button class="live-secondary" data-live-tool="member-role" data-community="${esc(communityId)}" data-account="${esc(m.id)}" data-role="${m.role==='moderator'?'member':'moderator'}">${m.role==='moderator'?'Make member':'Make moderator'}</button><button class="live-secondary" data-live-tool="transfer-confirm" data-community="${esc(communityId)}" data-account="${esc(m.id)}" data-name="${esc(m.display_name)}">Transfer ownership</button>`:''}${m.id!==state().account.id&&((c.role==='owner'&&m.role!=='owner')||(c.role==='moderator'&&m.role==='member'))?`<button class="live-danger" data-live-tool="remove-confirm" data-community="${esc(communityId)}" data-account="${esc(m.id)}" data-name="${esc(m.display_name)}">Remove</button>`:''}</div></article>`).join('')||empty('No members to display.','Refresh the community and try again.');
    }catch(error){if(current()&&results?.isConnected){results.innerHTML=empty('Members could not load.','No membership changes were made.');failure(error,current);}}
  }
  function invite(){invites(state().communityId);}
  async function invites(communityId=state().communityId){
    const c=state().communities.find(c=>c.id===communityId);if(c?.role!=='owner')return;const current=panelGuard();
    dialog('Doors into your community.',esc(c.name)+' · Invitations grant access to its message history. Links are shown once, when created.',`<form data-live-tools-form="invite" data-community="${esc(communityId)}"><div class="live-tools-field-grid"><label>Maximum uses<input type="number" name="maxUses" min="1" max="100" value="1" required></label><label>Expires after<select name="expiresInHours"><option value="1">1 hour</option><option value="24">1 day</option><option value="168" selected>7 days</option><option value="720">30 days</option></select></label></div><button type="submit" class="live-primary">Create invitation</button></form>${errorHTML}<div id="live-generated-link"></div><h3>Existing invitations</h3><div id="live-tools-results" role="status">Loading invitations…</div>`);
    const results=$('live-tools-results');
    try{const data=await live.request(`/communities/${encode(communityId)}/invites`);if(!current()||!results?.isConnected)return;renderInvites(data.invites||[],communityId);}
    catch(error){if(current()&&results?.isConnected){results.innerHTML=empty('Invitations could not load.','Retry before changing access.');failure(error,current);}}
  }
  function renderInvites(list,communityId){$('live-tools-results').innerHTML=list.map(item=>`<article class="live-invite-row"><div><b>${esc(item.state||'active')}</b><p>${finite(item.uses)} / ${finite(item.max_uses)} uses · Expires ${esc(time(item.expires_at))}</p></div>${!item.revoked_at&&item.state!=='revoked'?`<button class="live-danger" data-live-tool="revoke" data-community="${esc(communityId)}" data-invite="${esc(item.id||item.token_hash)}">Revoke</button>`:''}</article>`).join('')||empty('No invitations yet.','Create a limited invitation, then share it with someone you want here.');}
  async function createInvite(form){
    const current=guard(),communityId=form.dataset.community,values=new FormData(form),submit=form.querySelector('[type="submit"]');if(form.dataset.busy)return;form.dataset.busy='1';if(submit)submit.disabled=true;
    try{const data=await live.request(`/communities/${encode(communityId)}/invites`,{maxUses:Number(values.get('maxUses')),expiresInHours:Number(values.get('expiresInHours'))});if(!current()||!form.isConnected)return;
      const link=location.origin+location.pathname+'#join='+data.invite.token;const output=$('live-generated-link');if(output)output.innerHTML=`<label for="live-tools-invite-link">New invitation link</label><input id="live-tools-invite-link" readonly value="${esc(link)}"><p class="live-form-note">${finite(data.invite.maxUses)} uses · expires ${esc(time(data.invite.expiresAt))}</p><button class="live-secondary" data-live-tool="copy-invite">${icon('copy')} Copy link</button>`;
      const listing=await live.request(`/communities/${encode(communityId)}/invites`);if(current()&&form.isConnected)renderInvites(listing.invites||[],communityId);
    }catch(error){failure(error,current);}finally{delete form.dataset.busy;if(submit?.isConnected)submit.disabled=false;}
  }
  function confirmAction(kind,button){
    const c=state().communities.find(c=>c.id===button.dataset.community);if(!c)return;
    if(kind==='leave'&&c.role==='owner'){members(c.id);live.toast('Transfer ownership to another member before leaving.');return;}
    panelGuard();const name=button.dataset.name||c.name;
    const details=kind==='remove'?['Remove this member?',`${name} will lose access to ${c.name} and its history. Existing messages remain. They can return only with a valid invitation.`,'Remove member']:kind==='transfer'?['Transfer ownership?',`${name} will become the owner of ${c.name}. You will become a moderator and lose owner-only controls.`,'Transfer ownership']:['Leave this community?',`You will lose access to ${c.name} and its message history. Your existing messages remain. You will need a new invitation to return.`,'Leave community'];
    dialog(details[0],esc(details[1]),`${errorHTML}<form data-live-tools-form="confirm" data-kind="${kind}" data-community="${esc(c.id)}" data-account="${esc(button.dataset.account||'')}"><button class="live-danger" type="submit">${details[2]}</button><button class="live-secondary" type="button" data-live-tool="settings">Keep current access</button></form>`);
  }
  async function mutate(path,body,button,after){
    const current=guard(),ticket=panel;if(button)button.disabled=true;
    try{const data=await live.request(path,body);if(!current()||ticket!==panel||(button&&!button.isConnected))return;if(after)await after(data,current);}
    catch(error){failure(error,current);}finally{if(current()&&button?.isConnected)button.disabled=false;}
  }
  async function submit(form){
    const kind=form.dataset.liveToolsForm;
    if(kind==='search'){const data=Object.fromEntries(new FormData(form));return runSearch(data,0);}
    if(kind==='profile')return saveProfile(form);
    if(kind==='invite')return createInvite(form);
    if(form.dataset.busy)return;form.dataset.busy='1';const button=form.querySelector('[type="submit"]');
    try{
      if(kind==='community'){const id=form.dataset.community,values=Object.fromEntries(new FormData(form));await mutate(`/communities/${encode(id)}/settings`,values,button,async(_data,current)=>{await live.refreshCommunities();if(current()){live.toast('Community settings saved.');settings();}});}
      if(kind==='confirm'){
        const id=form.dataset.community,target=form.dataset.account,action=form.dataset.kind;
        const path=action==='leave'?`/communities/${encode(id)}/leave`:action==='transfer'?`/communities/${encode(id)}/transfer`:`/communities/${encode(id)}/members/${encode(target)}`;
        await mutate(path,action==='transfer'?{accountId:target}:action==='remove'?{remove:true}:{},button,async(_data,current)=>{if(form.isConnected)live.closeDialog();await live.refreshCommunities();if(current()){live.toast(action==='leave'?'You left the community.':action==='transfer'?'Community ownership transferred.':'Member removed.');await refresh(true);}});
      }
    }finally{delete form.dataset.busy;}
  }
  function handleAction(action,button){
    if(!ready())return;
    const data=button?.dataset||{};
    const actions={inbox:()=>inbox('unread'),'inbox-tab':()=>inbox(data.view),'inbox-page':()=>inbox(inboxView,finite(data.offset)),saved:()=>saved(),'saved-page':()=>saved(finite(data.offset)),search,profile,settings,members:()=>members(data.community),invites:()=>invites(data.community),invite,
      filter:()=>{filter=['all','unread','favorites'].includes(data.filter)?data.filter:'all';try{sessionStorage.setItem('voidline.shared.filter.v1.'+identity,filter);}catch(_){}live.renderSidebar();},favorite:()=>setFavorite(data.channel,button),
      read:()=>markRead(data.channel,data.seq,false,button,data.change),'read-all':()=>markRead('',0,true,button),unsave:()=>save({id:data.message},false,button),'search-page':()=>runSearch(searchValues,finite(data.offset)),
      jump:()=>{live.closeDialog();return live.navigate({communityId:data.community,channelId:data.channel,messageId:data.message,threadRootId:data.thread});},'member-profile':()=>memberProfile(data.account),member:()=>memberProfile(data.member),
      revoke:()=>mutate(`/communities/${encode(data.community)}/invites/${encode(data.invite)}/revoke`,{},button,()=>invites(data.community)),
      'member-role':()=>mutate(`/communities/${encode(data.community)}/members/${encode(data.account)}`,{role:data.role},button,()=>members(data.community)),
      'leave-confirm':()=>confirmAction('leave',button),'remove-confirm':()=>confirmAction('remove',button),'transfer-confirm':()=>confirmAction('transfer',button),
      'copy-invite':()=>{const input=$('live-tools-invite-link');if(input)return live.copyText(input.value,'Invitation copied.',input);}
    };
    return actions[action]?.();
  }
  function init(bridge){
    live=bridge;if(initialized)return;initialized=true;
    document.addEventListener('click',event=>{const button=event.target.closest('[data-live-tool]');if(!button||!state().active)return;event.preventDefault();event.stopImmediatePropagation();Promise.resolve(handleAction(button.dataset.liveTool,button)).catch(error=>failure(error));},true);
    document.addEventListener('submit',event=>{const form=event.target;if(!form.dataset.liveToolsForm||!state().active)return;event.preventDefault();event.stopImmediatePropagation();submit(form).catch(error=>failure(error));},true);
    document.addEventListener('input',event=>{const form=event.target.closest('[data-live-tools-form="profile"]');if(form)profileInput(form);});
    document.addEventListener('change',event=>{const form=event.target.closest('[data-live-tools-form="profile"]');if(form)profileInput(form);});
    syncIdentity();
  }
  const api=Object.freeze({init,sidebarHTML,filterChannels,handleAction,search,profile,invite,communitySettings:settings,onRender,onData,save,refresh,memberProfile});
  window.VoidLiveTools=api;
  if(window.VoidLive?.registerTools)window.VoidLive.registerTools(api);
})();
