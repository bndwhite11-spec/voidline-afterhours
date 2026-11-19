/* A bounded recovery path for the public page. No account data or caching. */
(function () {
  'use strict';
  var WAIT_TIME = 35000, timer = null, observer = null, settled = false;
  function node(id) { return document.getElementById(id); }
  function resolved() {
    var root = node('home-root');
    return !!root && root.getAttribute('aria-busy') === 'false';
  }
  function check() {
    if (!resolved()) return false;
    settled = true;
    clearTimeout(timer); timer = null;
    if (observer) { observer.disconnect(); observer = null; }
    var panel = node('home-startup-recovery');
    if (panel) panel.hidden = true;
    return true;
  }
  function reveal(failed) {
    if (settled || check()) return;
    var panel = node('home-startup-recovery'), title = node('home-startup-title'), copy = node('home-startup-copy');
    if (!panel) return;
    if (title) title.textContent = failed ? 'VOIDLINE couldn’t finish loading.' : 'Still opening VOIDLINE';
    if (copy) copy.textContent = failed ? 'Check your connection and try again. You can also open VOIDLINE in your browser.' : 'This is taking longer than usual. Keep this page open to continue waiting, or check your connection and try again.';
    panel.hidden = false;
    try { if (window.VoidEntry && typeof window.VoidEntry.dismiss === 'function') window.VoidEntry.dismiss(); } catch (_) { /* Recovery stays available if the optional intro failed. */ }
  }
  function arm() {
    clearTimeout(timer);
    timer = setTimeout(function () { timer = null; reveal(false); }, WAIT_TIME);
  }
  function inspect() {
    if (settled || check()) return;
    var root = node('home-root');
    if (!observer && root && typeof MutationObserver === 'function') {
      try { observer = new MutationObserver(check); observer.observe(root, {attributes:true,attributeFilter:['aria-busy'],childList:true}); }
      catch (_) { if (observer) observer.disconnect(); observer = null; }
    }
  }
  function retry() {
    if (settled || check()) return;
    var panel = node('home-startup-recovery');
    if (panel) panel.hidden = true;
    arm();
    try {
      if (window.VoidHome && typeof window.VoidHome.reload === 'function') {
        Promise.resolve(window.VoidHome.reload()).then(check, function () { reveal(true); });
      } else location.reload();
    } catch (_) { reveal(true); }
  }
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (target && target !== window) {
      // Optional images, artwork and extensions cannot replace a usable page.
      if (target.tagName !== 'SCRIPT' || !/\/home\.js(?:[?#]|$)/.test(target.src || '')) return;
    }
    reveal(true);
  }, true);
  window.addEventListener('unhandledrejection', function () { reveal(true); });
  window.addEventListener('voidline:home-ready', inspect);
  document.addEventListener('DOMContentLoaded', inspect);
  var retryButton = node('home-startup-retry');
  if (retryButton) retryButton.addEventListener('click', retry);
  arm(); inspect();
}());
