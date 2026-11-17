/* A brief first-entry brand reveal. Authentication starts independently. */
(() => {
  'use strict';
  if (window.VoidEntry) return;

  const SEEN_KEY = 'voidline.entry.seen.v1';
  const MIN_REVEAL = 560;
  const MAX_REVEAL = 1050;
  const EXIT_TIME = 140;
  let overlay = null, status = null, root = null, observer = null;
  let startedAt = 0, originalInert = false, previousFocus = null;
  let hardTimer = null, readyTimer = null, exitTimer = null;
  let closing = false, restoreRequested = false, active = false;

  function bypass() {
    if (document.documentElement.dataset.offline === 'true' || location.protocol === 'file:') return true;
    if (window.VoidTheme?.state?.().effectiveReducedMotion || document.documentElement.classList?.contains('vh-reduced-motion')) return true;
    const route = location.pathname + location.search + location.hash;
    if (/\/(?:api\/auth|auth\/callback|oauth\/callback)(?:\/|\?|$)/i.test(route) || /(?:[?#&])(?:verify-email|reset-password|code|oauth_state|auth_error)=/i.test(route)) return true;
    try { if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true; } catch (_) { /* A bounded static fallback still works. */ }
    try { if (sessionStorage.getItem(SEEN_KEY) === '1') return true; } catch (_) { /* Optional session preference; never needed for access. */ }
    return false;
  }

  function clearTimers() {
    clearTimeout(hardTimer); clearTimeout(readyTimer); clearTimeout(exitTimer);
    hardTimer = readyTimer = exitTimer = null;
  }

  function restoreFocus() {
    if (!restoreRequested) return;
    const candidate = previousFocus && previousFocus.isConnected && previousFocus !== document.body && previousFocus !== document.documentElement ? previousFocus : document.getElementById('home-main');
    if (!candidate || candidate === overlay || root?.inert && root.contains(candidate)) return;
    if (candidate === document.getElementById('home-main') && !candidate.hasAttribute('tabindex')) candidate.setAttribute('tabindex', '-1');
    candidate.focus?.({preventScroll:true});
  }

  function cleanup() {
    if (!active) return;
    clearTimers(); observer?.disconnect(); observer = null;
    window.removeEventListener('voidline:home-ready', inspect);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('voidline:theme', themechange);
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('focusin', focusin);
    document.removeEventListener('visibilitychange', visibility);
    if (root) root.inert = originalInert;
    overlay?.remove();
    restoreFocus();
    overlay = status = root = previousFocus = null;
    active = false;
  }

  function dismiss({immediate=false, focus=false} = {}) {
    if (!active) return;
    restoreRequested = restoreRequested || focus || !!overlay?.contains(document.activeElement);
    if (immediate) { cleanup(); return; }
    if (closing) return;
    closing = true;
    clearTimers();
    overlay.classList.add('ve-is-leaving');
    exitTimer = setTimeout(cleanup, EXIT_TIME);
  }

  function inspect() {
    if (!active || closing) return;
    const state = window.VoidHome?.state;
    if (state?.error) { dismiss({immediate:true}); return; }
    // The home-ready event exposes the bridge before its session request finishes.
    const phase = state?.phase;
    const resolved = phase ? phase !== 'loading' : root?.getAttribute('aria-busy') === 'false';
    if (!resolved) return;
    if (status) status.textContent = phase === 'ready' ? 'Your space is ready.' : 'Ready when you are.';
    if (readyTimer !== null) return;
    const remaining = Math.max(0, MIN_REVEAL - (Date.now() - startedAt));
    if (!remaining) dismiss();
    else readyTimer = setTimeout(() => { readyTimer = null; dismiss(); }, remaining);
  }

  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); dismiss({immediate:true, focus:!!overlay?.contains(document.activeElement)}); }
  }
  function focusin(event) {
    // Keyboard navigation may leave the introduction; it must never be trapped.
    if (active && !overlay?.contains(event.target) && event.target !== document.body && event.target !== document.documentElement) dismiss({immediate:true});
  }
  function themechange(event) { if (event.detail?.effectiveReducedMotion) dismiss({immediate:true}); }
  function pagehide() { restoreRequested = false; cleanup(); }
  function visibility() { if (document.hidden) { restoreRequested = false; cleanup(); } }

  function start() {
    if (active || bypass() || !document.body) return;
    if (window.VoidHome?.state?.phase && window.VoidHome.state.phase !== 'loading') return;
    root = document.getElementById('home-root');
    if (!root) return;
    previousFocus = document.activeElement;
    originalInert = !!root.inert;
    startedAt = Date.now(); active = true; closing = false; restoreRequested = false;
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (_) { /* This page still has a strict deadline. */ }
    overlay = document.createElement('section');
    overlay.id = 'voidline-entry'; overlay.className = 've-entry';
    overlay.setAttribute('aria-label', 'Voidline introduction');
    overlay.innerHTML = `<header class="ve-header"><span class="ve-signature">VOIDLINE<span>AFTERHOURS</span></span><button class="ve-skip" type="button" data-ve-skip>Skip intro <span aria-hidden="true">↗</span></button></header>
      <div class="ve-center"><div class="ve-art" aria-hidden="true"><span class="ve-axis ve-axis-x"></span><span class="ve-axis ve-axis-y"></span><svg viewBox="0 0 240 240" focusable="false"><defs><linearGradient id="ve-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0f3fa"/><stop offset=".35" stop-color="#909aa9"/><stop offset=".54" stop-color="#f7f8fb"/><stop offset="1" stop-color="#6d7d94"/></linearGradient></defs><g class="ve-metal"><path d="m112 18 28 16-64 38v88l36 21v35l-70-41V58z"/><path d="m128 41 70 41v89l-70 41v-35l36-21V95l-36-21z"/><path d="m106 102 28-16v51l-28 16z"/></g><g class="ve-outline" pathLength="1"><path pathLength="1" d="m112 18 28 16-64 38v88l36 21v35l-70-41V58z"/><path pathLength="1" d="m128 41 70 41v89l-70 41v-35l36-21V95l-36-21z"/><path pathLength="1" d="m106 102 28-16v51l-28 16z"/></g></svg></div><div class="ve-title"><p class="ve-eyebrow">A place between days.</p><p class="ve-wordmark">VOIDLINE</p><span class="ve-rule" aria-hidden="true"></span><p class="ve-status" data-ve-status role="status">Opening Voidline…</p></div></div>
      <footer class="ve-footer"><span>YOUR PEOPLE. YOUR SPACE.</span><span>AFTERHOURS</span></footer>`;
    status = overlay.querySelector('[data-ve-status]');
    overlay.querySelector('[data-ve-skip]').addEventListener('click', () => dismiss({immediate:true, focus:true}));
    document.body.appendChild(overlay);
    root.inert = true;
    window.addEventListener('voidline:home-ready', inspect);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('voidline:theme', themechange);
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusin);
    document.addEventListener('visibilitychange', visibility);
    if (typeof MutationObserver === 'function') {
      observer = new MutationObserver(inspect);
      observer.observe(root, {attributes:true, attributeFilter:['aria-busy'], childList:true});
    }
    hardTimer = setTimeout(() => dismiss(), MAX_REVEAL);
    inspect();
  }

  window.VoidEntry = Object.freeze({dismiss:() => dismiss({immediate:true})});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
