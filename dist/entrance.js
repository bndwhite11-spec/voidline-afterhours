(() => {
  'use strict';

  const SEEN_KEY = 'voidline.entry.v2';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let sequence = null;
  let ready = false;
  let serial = 0;
  let welcomeTimer;

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
  function schedule(run, delay) {
    const id = setTimeout(run, delay);
    sequence?.timers.push(id);
    return id;
  }
  function announceWelcome() {
    document.querySelector('.ve-welcome')?.remove();
    clearTimeout(welcomeTimer);
    if (reduced?.matches) return;
    const note = document.createElement('div');
    note.className = 've-welcome';
    note.setAttribute('role', 'status');
    note.innerHTML = '<span class="ve-welcome-rule"></span><span>YOU’RE IN.</span><small>WELCOME TO AFTERHOURS</small>';
    document.body.append(note);
    welcomeTimer = setTimeout(() => note.remove(), 1250);
  }
  function cleanClasses() {
    document.body.classList.remove('ve-entering', 've-client-reveal');
  }
  function finish({ seen = true, welcome = false, restoreFocus = true } = {}) {
    const active = sequence;
    sequence = null;
    if (active) {
      active.timers.forEach(clearTimeout);
      const wasFocused = active.node.contains(document.activeElement);
      active.node.remove();
      if (restoreFocus && wasFocused && active.previousFocus?.isConnected && active.previousFocus !== document.body) {
        active.previousFocus.focus({ preventScroll: true });
      }
    }
    cleanClasses();
    if (seen) markSeen();
    if (welcome) announceWelcome();
  }
  function phase(label, index) {
    if (!sequence) return;
    const text = sequence.node.querySelector('.ve-phase-name');
    if (text) text.textContent = label;
    sequence.node.dataset.phase = String(index);
  }
  function run(short = false) {
    if (!sequence) return;
    sequence.timers.forEach(clearTimeout);
    sequence.timers = [];
    if (reduced?.matches) return finish();
    if (short) {
      sequence.node.classList.add('ve-return');
      schedule(() => finish(), 420);
      return;
    }
    sequence.node.classList.add('ve-running');
    phase('I. AWAKENING', 1);
    schedule(() => phase('II. THE APERTURE', 2), 800);
    schedule(() => phase('III. CROSSING OVER', 3), 1650);
    schedule(() => {
      phase('IV. AFTERHOURS', 4);
      sequence?.node.classList.add('ve-departing');
      document.body.classList.add('ve-client-reveal');
    }, 2350);
    schedule(() => finish({ welcome: true }), 2980);
  }
  function create({ replay = false } = {}) {
    finish({ seen: false, restoreFocus: false });
    document.querySelector('.ve-welcome')?.remove();
    clearTimeout(welcomeTimer);
    if (reduced?.matches) return;
    const node = document.createElement('section');
    node.id = 'voidline-entrance';
    node.className = 've-entry';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', 'VOIDLINE decorative client entrance');
    const id = `ve-entry-${++serial}`;
    node.innerHTML = `
      <div class="ve-atmosphere" aria-hidden="true"><div class="ve-depth-grid"></div><div class="ve-ambient"></div><div class="ve-scan"></div><div class="ve-horizon"></div></div>
      <div class="ve-entry-top"><span class="ve-entry-brand">VOIDLINE<span>®</span></span><span class="ve-entry-edition">AFTERHOURS / CLIENT 02</span></div>
      <div class="ve-coordinate ve-coordinate-left" aria-hidden="true">VL—02<br>AFTER / HOURS<br><span>0001. 0033. 0404.</span></div>
      <div class="ve-coordinate ve-coordinate-right" aria-hidden="true"><span>PRIVATE SPACE</span><br>PUBLIC IMAGINATION<br>∞ / ∞</div>
      <div class="ve-world" aria-hidden="true">
        <div class="ve-calibration ve-calibration-a"></div><div class="ve-calibration ve-calibration-b"></div>
        <div class="ve-portal-line ve-portal-line-a"></div><div class="ve-portal-line ve-portal-line-b"></div>
        <div class="ve-particles">${Array.from({ length: 12 }, (_, i) => `<i style="--ve-i:${i}"></i>`).join('')}</div>
        <div class="ve-fragment ve-fragment-a"><b></b><span>AFTER / HOURS</span><b></b></div>
        <div class="ve-fragment ve-fragment-b"><span>NO SIGNAL LOST</span><b></b></div>
        <div class="ve-logo-stage">${markSVG(id)}<div class="ve-logo-shadow"></div><div class="ve-aperture-light"></div></div>
      </div>
      <div class="ve-entry-type"><span class="ve-type-kicker">SOMEWHERE BETWEEN THE SIGNAL AND THE STATIC</span><strong>V O I D L I N E</strong><span class="ve-type-edition">A F T E R H O U R S</span></div>
      <div class="ve-entry-bottom"><div class="ve-phase"><span class="ve-phase-dot"></span><span class="ve-phase-name">A CLIENT ENTRY SEQUENCE</span><span class="ve-decorative-label">VISUAL SEQUENCE</span></div><button type="button" class="ve-skip">Skip entrance <kbd>ESC</kbd><span>↗</span></button></div>
    `;
    sequence = { node, timers: [], previousFocus: document.activeElement };
    document.body.classList.add('ve-entering');
    document.body.append(node);
    node.querySelector('.ve-skip').addEventListener('click', () => finish());
    node.querySelector('.ve-skip').focus({ preventScroll: true });
    if (ready || replay) run(!replay && hasSeen());
    else schedule(() => finish({ seen: false }), 1000);
  }

  window.addEventListener('voidline:ready', () => {
    ready = true;
    if (sequence && document.body.classList.contains('reduce-motion')) return finish({welcome:false});
    if (sequence) run(hasSeen());
  });
  document.addEventListener('keydown', (event) => {
    if (!sequence) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      sequence.node.querySelector('.ve-skip').focus({ preventScroll: true });
    }
  }, true);
  reduced?.addEventListener?.('change', (event) => { if (event.matches) finish(); });
  window.VoidEntrance = {
    replay: () => create({ replay: true }),
    skip: () => finish(),
    markSVG,
    isPlaying: () => !!sequence
  };
  create();
})();
