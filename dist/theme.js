/* Account appearance state belongs above every dialog, toast and portal.
 * This module contains no account data and never restores another account's settings. */
(() => {
  'use strict';
  if (window.VoidTheme) return;
  const DEFAULTS = Object.freeze({font:'15',highContrast:false,reducedMotion:false});
  let preferences = {...DEFAULTS};
  function media(query) {
    try { return window.matchMedia?.(query) || null; } catch (_) { return null; }
  }
  const reduced = media('(prefers-reduced-motion: reduce)');
  const contrast = media('(prefers-contrast: more)');
  function state() {
    return Object.freeze({...preferences,systemReducedMotion:!!reduced?.matches,systemHighContrast:!!contrast?.matches,
      effectiveReducedMotion:preferences.reducedMotion || !!reduced?.matches,
      effectiveHighContrast:preferences.highContrast || !!contrast?.matches});
  }
  function sync() {
    const current = state();
    // Both roots keep portals compatible; the CSS variables are defined once on html.
    for (const node of [document.documentElement,document.body]) {
      if (!node) continue;
      node.dataset.vhFont = current.font;
      node.dataset.vhMotion = current.effectiveReducedMotion ? 'reduce' : 'standard';
      node.dataset.vhContrast = current.effectiveHighContrast ? 'more' : 'standard';
      node.classList.toggle('vh-reduced-motion',current.effectiveReducedMotion);
      node.classList.toggle('vh-high-contrast',current.effectiveHighContrast);
    }
    if (typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('voidline:theme',{detail:current}));
    return current;
  }
  function apply(value = DEFAULTS) {
    const input = value && typeof value === 'object' ? value : DEFAULTS;
    preferences = {font:['15','17','19'].includes(String(input.font)) ? String(input.font) : '15',
      highContrast:input.highContrast === true,reducedMotion:input.reducedMotion === true};
    return sync();
  }
  function reset() { return apply(DEFAULTS); }
  for (const query of [reduced,contrast]) {
    if (query?.addEventListener) query.addEventListener('change',sync);
    else if (query?.addListener) query.addListener(sync);
  }
  window.VoidTheme = Object.freeze({apply,reset,state});
  reset();
  if (!document.body) document.addEventListener('DOMContentLoaded',sync,{once:true});
})();
