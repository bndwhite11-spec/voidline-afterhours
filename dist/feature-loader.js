/* First-party assets declared in inert templates in index.html. */
(() => {
  'use strict';
  if (document.documentElement.dataset.offline === 'true') return;
  // This script executes before the later script templates have been parsed.
  // Read the complete manifest when a feature is requested.
  const jobs = new Map(), complete = new Set();
  function loadAsset(template) {
    if (jobs.has(template)) return jobs.get(template);
    const source = template.content.firstElementChild;
    const script = source.tagName === 'SCRIPT';
    const path = source.getAttribute(script ? 'src' : 'href');
    if (!/^\/[a-z][a-z0-9-]*\.(?:js|css)$/.test(path))
      return Promise.reject(Error('The requested component is unavailable.'));
    const element = document.createElement(script ? 'script' : 'link');
    if (script) {
      element.async = false; // Dynamic classic scripts execute in insertion order.
      element.src = path;
    } else {
      element.rel = 'stylesheet';
      element.href = path;
    }
    const job = new Promise((resolve, reject) => {
      element.onload = resolve;
      element.onerror = () => reject(Error('This component could not load. Check your connection and try again.'));
      template.before(element); // Keep stylesheet order across independently loaded features.
    }).catch(error => {
      element.remove();
      jobs.delete(template);
      throw error;
    });
    jobs.set(template, job);
    return job;
  }
  function load(group) {
    if (complete.has(group)) return Promise.resolve();
    const assets = Array.from(document.querySelectorAll('template[data-feature]')).filter(template => template.dataset.feature === group);
    if (!assets.length) return Promise.reject(Error('This component is unavailable.'));
    return Promise.all(assets.map(loadAsset)).then(() => { complete.add(group); });
  }
  window.VoidFeatures = Object.freeze({load, ready: group => complete.has(group)});
})();
