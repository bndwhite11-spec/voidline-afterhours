(() => {
  'use strict';
  const SEEN_KEY = 'voidline.entry.v2';
  const fallbackMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motion = () => window.VoidMotion?.enabled() ?? (!fallbackMedia?.matches && !document.body.classList.contains('reduce-motion'));
  const times = window.VoidMotion?.durations || {first:2200,returning:200,entryRevealAt:1600,entryArt:1750,reveal:560,revealFade:320,revealSafety:160,welcome:750,readinessFallback:1000};
  let sequence = null, ready = false, serial = 0, welcomeTimer;

  // This split aperture is VOIDLINE's original mark. Prefixing its gradient IDs
  // keeps it reusable in the client without duplicate SVG definitions.
  function markSVG(prefix = 'void-mark', className = '') {
    const safe = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '');
    const cls = String(className).replace(/[^a-zA-Z0-9_ -]/g, '');
    return `<svg class="ve-mark-svg ${cls}" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${safe}-chrome" x1=".13" y1="0" x2=".85" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#f0f1f5"/><stop offset=".19" stop-color="#8b91a0"/><stop offset=".31" stop-color="#e0e2e9"/><stop offset=".47" stop-color="#454b5b"/><stop offset=".61" stop-color="#a8a3b7"/><stop offset=".8" stop-color="#525461"/><stop offset="1" stop-color="#c9c9d6"/></linearGradient>
        <linearGradient id="${safe}-edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8f8ff"/><stop offset=".34" stop-color="#686d7d"/><stop offset=".7" stop-color="#383d4a"/><stop offset="1" stop-color="#b4a9c4"/></linearGradient>
        <linearGradient id="${safe}-dark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#acafbc"/><stop offset=".35" stop-color="#363b48"/><stop offset=".7" stop-color="#747384"/><stop offset="1" stop-color="#222733"/></linearGradient>
      </defs>
      <g class="ve-mark-left">
        <path d="m112 22 28 16-64 38v88l36 21v35l-70-41V62z" fill="#11151e" transform="translate(3 4)"/>
        <path d="m112 18 28 16-64 38v88l36 21v35l-70-41V58z" fill="url(#${safe}-chrome)" stroke="url(#${safe}-edge)" stroke-width="1.1"/>
        <path d="m49 62 62-36M49 65v105l55 33M77 76v79" fill="none" stroke="#e0e4ef" stroke-opacity=".42" stroke-width=".7"/>
        <path d="m43 58 32 17M76 160l-33 15M112 181l-10 6v20" fill="none" stroke="#171b28" stroke-width="1"/>
      </g>
      <g class="ve-mark-right">
        <path d="m128 45 70 41v89l-70 41v-35l36-21V99l-36-21z" fill="#11151e" transform="translate(3 4)"/>
        <path d="m128 41 70 41v89l-70 41v-35l36-21V95l-36-21z" fill="url(#${safe}-dark)" stroke="url(#${safe}-edge)" stroke-width="1.1"/>
        <path d="m136 49 55 32v85l-55 32M164 98v54" fill="none" stroke="#e5e3ef" stroke-opacity=".44" stroke-width=".7"/>
        <path d="m198 82-34 13M164 156l34 15M128 177l10 6v20" fill="none" stroke="#151926" stroke-width="1"/>
      </g>
      <g class="ve-mark-shard">
        <path d="m106 102 28-16v51l-28 16z" fill="url(#${safe}-chrome)" stroke="url(#${safe}-edge)" stroke-width=".8"/>
        <path d="m110 105 19-11v40l-19 11" fill="none" stroke="#d6c8ed" stroke-width=".6" stroke-opacity=".62"/>
      </g>
    </svg>`;
  }

  function hasSeen() {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (_) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) {}
  }
  function schedule(callback, delay) {
    const active = sequence;
    const id = setTimeout(() => { if (sequence === active) callback(); }, delay);
    active?.timers.push(id);
    return id;
  }
  function clearWelcome() {
    clearTimeout(welcomeTimer);
    document.querySelector('.ve-welcome')?.remove();
  }
  function announceWelcome() {
    clearWelcome();
    if (!motion()) return;
    const note = document.createElement('div');
    note.className = 've-welcome';
    note.setAttribute('role', 'status');
    note.innerHTML = '<span class="ve-welcome-rule"></span><span>YOU’RE IN.</span><small>WELCOME TO AFTERHOURS</small>';
    document.body.append(note);
    welcomeTimer = setTimeout(() => note.remove(), times.welcome);
  }
  function lockBackground(active) {
    // Preserve prior inert state; no client control or shortcut should compete
    // with the one-button entrance. New sprite nodes are not interactive.
    for (const node of document.body.children) {
      if (node === active.node || ['SCRIPT','STYLE','LINK'].includes(node.tagName)) continue;
      active.background.push([node, node.inert, node.hasAttribute('inert')]);
      node.inert = true;
      node.setAttribute('inert', '');
    }
  }
  function unlockBackground(active) {
    active.background.forEach(([node, value, hadAttribute]) => {
      node.inert = value;
      if (hadAttribute) node.setAttribute('inert', '');
      else node.removeAttribute('inert');
    });
  }
  function finish({seen=true,welcome=false,restoreFocus=true} = {}) {
    const active = sequence;
    sequence = null;
    if (!active) return;
    active.timers.forEach(clearTimeout);
    active.cleanup.forEach(clean => clean());
    const wasFocused = active.node.contains(document.activeElement);
    unlockBackground(active);
    active.node.remove();
    document.body.classList.remove('ve-entering', 've-client-reveal');
    if (restoreFocus && wasFocused && active.previousFocus?.isConnected && active.previousFocus !== document.body && !active.previousFocus.inert) active.previousFocus.focus({preventScroll:true});
    if (seen) markSeen();
    if (welcome) announceWelcome();
  }
  function phase(label,index) {
    if (!sequence) return;
    sequence.node.querySelector('.ve-phase-name').textContent = label;
    sequence.node.dataset.phase = String(index);
  }
  const milliseconds = value => {
    const text = String(value || '').trim();
    return text.endsWith('ms') ? parseFloat(text) || 0 : (parseFloat(text) || 0)*1000;
  };
  function listen(active,target,type,handler) {
    target.addEventListener(type,handler,true);
    active.cleanup.push(() => target.removeEventListener(type,handler,true));
  }
  function beginReveal() {
    const active = sequence;
    if (!active) return;
    if (!motion()) return finish();
    phase('IV. AFTERHOURS',4);
    active.revealing = true;
    active.node.classList.add('ve-departing');
    document.body.classList.add('ve-client-reveal');
    const expected = new Map([
      ['.server-rail','ve-rail-in'], ['.channel-sidebar','ve-sidebar-in'],
      ['.conversation','ve-client-in'], ['.members-sidebar','ve-members-in'], ['.titlebar','ve-header-in']
    ]);
    const pending = new Map();
    let maximum = 0;
    const style = element => window.getComputedStyle?.(element);
    expected.forEach((name,selector) => {
      const element = document.querySelector(selector),computed = element && style(element);
      if (!element || !computed || computed.display === 'none' || !element.getClientRects().length) return;
      const names = computed.animationName.split(',').map(v => v.trim());
      const durations = computed.animationDuration.split(',').map(milliseconds);
      const delays = computed.animationDelay.split(',').map(milliseconds);
      names.forEach((animation,i) => {
        if (animation !== name || !durations[i % durations.length]) return;
        if (!pending.has(element)) pending.set(element,new Set());
        pending.get(element).add(animation);
        maximum = Math.max(maximum,durations[i % durations.length]+delays[i % delays.length]);
      });
    });
    const veil = active.node.querySelector('.ve-veil'),veilStyle = style(veil);
    const transitionDuration = veilStyle ? Math.max(0,...veilStyle.transitionDuration.split(',').map(milliseconds)) : 0;
    let veilPending = transitionDuration > 0;
    maximum = Math.max(maximum,transitionDuration);
    function settle() {
      if (sequence === active && !pending.size && !veilPending) finish({welcome:true});
    }
    const onAnimation = event => {
      const names = pending.get(event.target);
      if (!names?.delete(event.animationName)) return;
      if (!names.size) pending.delete(event.target);
      settle();
    };
    const onTransition = event => {
      if (event.target !== veil || event.propertyName !== 'opacity') return;
      veilPending = false;
      settle();
    };
    listen(active,document,'animationend',onAnimation);
    listen(active,document,'animationcancel',onAnimation);
    listen(active,veil,'transitionend',onTransition);
    listen(active,veil,'transitioncancel',onTransition);
    // Actual browser completion wins. The fallback only covers missing events,
    // lost stylesheets or a suspended frame; it exceeds the computed duration.
    if (pending.size || veilPending) schedule(() => finish({welcome:true}),Math.min(1600,Math.max(times.reveal,maximum)+times.revealSafety));
    else finish({welcome:true});
  }
  function run(short=false) {
    const active = sequence;
    if (!active || active.running) return;
    active.running = true;
    active.timers.forEach(clearTimeout);
    active.timers = [];
    if (!motion()) return finish();
    if (short) {
      active.node.classList.add('ve-return');
      listen(active,active.node,'animationend',event => {
        if (event.target === active.node && event.animationName === 've-return') finish();
      });
      schedule(() => finish(),times.returning+60);
      return;
    }
    active.node.classList.add('ve-running');
    phase('I. AWAKENING',1);
    schedule(() => phase('II. THE APERTURE',2),450);
    schedule(() => phase('III. CROSSING OVER',3),1120);
    schedule(beginReveal,times.entryRevealAt);
  }
  function create({replay=false} = {}) {
    finish({seen:false,restoreFocus:false});
    clearWelcome();
    // Both initial entry and Replay use exactly the same preference gate.
    if (!motion()) return false;
    const node = document.createElement('section');
    node.id = 'voidline-entrance';
    node.className = 've-entry';
    node.setAttribute('role','dialog');
    node.setAttribute('aria-modal','true');
    node.setAttribute('aria-label','VOIDLINE decorative client entrance');
    const id = `ve-entry-${++serial}`;
    node.innerHTML = `
      <div class="ve-veil" aria-hidden="true"></div>
      <div class="ve-atmosphere" aria-hidden="true"><div class="ve-depth-grid"></div><div class="ve-ambient"></div><div class="ve-scan"></div><div class="ve-horizon"></div></div>
      <div class="ve-entry-top"><span class="ve-entry-brand">VOIDLINE<span>®</span></span><span class="ve-entry-edition">AFTERHOURS / CLIENT 02</span></div>
      <div class="ve-coordinate ve-coordinate-left" aria-hidden="true">VL—02<br>AFTER / HOURS<br><span>0001. 0033. 0404.</span></div>
      <div class="ve-coordinate ve-coordinate-right" aria-hidden="true"><span>PRIVATE SPACE</span><br>PUBLIC IMAGINATION<br>∞ / ∞</div>
      <div class="ve-world" aria-hidden="true">
        <div class="ve-calibration ve-calibration-a"></div><div class="ve-calibration ve-calibration-b"></div>
        <div class="ve-portal-line ve-portal-line-a"></div><div class="ve-portal-line ve-portal-line-b"></div>
        <div class="ve-particles">${Array.from({length:12},(_,i) => `<i style="--ve-i:${i}"></i>`).join('')}</div>
        <div class="ve-fragment ve-fragment-a"><b></b><span>AFTER / HOURS</span><b></b></div><div class="ve-fragment ve-fragment-b"><span>NO SIGNAL LOST</span><b></b></div>
        <div class="ve-logo-stage">${markSVG(id)}<div class="ve-logo-shadow"></div><div class="ve-aperture-light"></div></div>
      </div>
      <div class="ve-entry-type"><span class="ve-type-kicker">SOMEWHERE BETWEEN THE SIGNAL AND THE STATIC</span><strong>V O I D L I N E</strong><span class="ve-type-edition">A F T E R H O U R S</span></div>
      <div class="ve-entry-bottom"><div class="ve-phase"><span class="ve-phase-dot"></span><span class="ve-phase-name">A CLIENT ENTRY SEQUENCE</span><span class="ve-decorative-label">VISUAL SEQUENCE</span></div><button type="button" class="ve-skip">Skip entrance <kbd>ESC</kbd><span>↗</span></button></div>
    `;
    const active = {node,timers:[],cleanup:[],background:[],previousFocus:document.activeElement,running:false};
    sequence = active;
    document.body.append(node);
    lockBackground(active);
    document.body.classList.add('ve-entering');
    node.querySelector('.ve-skip').addEventListener('click',() => finish());
    node.querySelector('.ve-skip').focus({preventScroll:true});
    if (ready || replay) run(!replay && hasSeen());
    else schedule(() => finish({seen:false}),times.readinessFallback);
    return true;
  }
  window.addEventListener('voidline:ready',() => {
    ready = true;
    if (!motion()) return finish();
    if (sequence) run(hasSeen());
  });
  document.addEventListener('keydown',event => {
    if (!sequence) return;
    if (event.key === 'Escape') {
      event.preventDefault();event.stopImmediatePropagation();finish();
    } else if (event.key === 'Tab') {
      event.preventDefault();event.stopImmediatePropagation();sequence.node.querySelector('.ve-skip').focus({preventScroll:true});
    } else if ((event.ctrlKey || event.metaKey) && ['k',','].includes(event.key.toLowerCase())) {
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  document.addEventListener('focusin',event => {
    if (sequence && !sequence.node.contains(event.target)) sequence.node.querySelector('.ve-skip').focus({preventScroll:true});
  },true);
  const onMotion = enabled => {if (!enabled) {finish();clearWelcome();}};
  if (window.VoidMotion) window.VoidMotion.subscribe(onMotion);
  else fallbackMedia?.addEventListener?.('change',event => onMotion(!event.matches));
  window.VoidEntrance = {replay:() => create({replay:true}),skip:() => finish(),markSVG,isPlaying:() => !!sequence};
  create();
})();
