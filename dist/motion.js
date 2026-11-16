(() => {
  'use strict';
  const STORE = 'voidline.local.v1';
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const listeners = new Set();
  const durations = Object.freeze({
    fast:120, normal:180, slow:280,
    first:2200, returning:200, entryRevealAt:1600, entryArt:1750,
    reveal:560, revealFade:320, revealSafety:160,
    welcome:750, readinessFallback:1000
  });
  function storedPreference() {
    try { return (window.VoidStore ? window.VoidStore.create(localStorage,STORE).read() : JSON.parse(localStorage.getItem(STORE) || '{}'))?.settings?.motion !== false; }
    catch (_) { return true; }
  }
  let allowed = storedPreference();
  let previous;
  const enabled = () => allowed && !media?.matches && !document.hidden;
  function apply() {
    const active = enabled();
    document.body?.classList.toggle('reduce-motion', !active);
    if (document.documentElement) document.documentElement.dataset.motion = active ? 'full' : 'reduced';
    if (previous === active) return active;
    previous = active;
    listeners.forEach(listener => listener(active));
    window.dispatchEvent(new CustomEvent('voidline:motionchange', {detail:{enabled:active}}));
    return active;
  }
  function setEnabled(value) { allowed = value !== false; return apply(); }
  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  const variables = {
    '--vm-fast':durations.fast, '--vm-normal':durations.normal, '--vm-slow':durations.slow,
    '--vm-entry-art':durations.entryArt, '--vm-entry-return':durations.returning,
    '--vm-entry-fade':durations.revealFade, '--vm-welcome':durations.welcome
  };
  Object.entries(variables).forEach(([name,value]) => document.documentElement?.style.setProperty(name, value+'ms'));
  window.VoidMotion = Object.freeze({
    enabled, durations, setEnabled, subscribe,
    sync: () => { allowed = storedPreference(); return apply(); },
    prefersReduced: () => !!media?.matches
  });
  media?.addEventListener?.('change', apply);
  window.addEventListener('storage', event => {
    if (event.key?.startsWith('voidline.archive.v3.')) {allowed=storedPreference();apply();return;}
    if (event.key !== STORE) return;
    try { allowed = window.VoidStore?storedPreference():JSON.parse(event.newValue || '{}')?.settings?.motion !== false; apply(); } catch (_) {}
  });
  document.addEventListener('visibilitychange',()=>{document.body?.classList.toggle('motion-suspended',!!document.hidden);apply();});
  apply();
})();
