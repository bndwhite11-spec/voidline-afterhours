'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createDesktop, isAppUrl, isDownloadUrl, safeFilename, ORIGIN } = require('./main.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness({ lock = true, failLoad = false } = {}) {
  const state = { windows: [], dialogs: [], opened: [], menu: [], sandbox: false, quit: 0, response: 0 };
  const app = new EventEmitter();
  Object.assign(app, { enableSandbox: () => { state.sandbox = true; }, requestSingleInstanceLock: () => lock, quit: () => state.quit++, whenReady: async () => {}, getPath: key => `/user/${key}` });
  class Window extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.url = ORIGIN + '/'; this.loaded = []; this.files = []; this.dead = false;
      this.webContents = new EventEmitter();
      this.webContents.getURL = () => this.url;
      this.webContents.setWindowOpenHandler = fn => { this.popup = fn; };
      state.windows.push(this);
    }
    async loadURL(url) { this.loaded.push(url); if (state.loadGate) await state.loadGate; if (failLoad) throw Error('offline'); this.url = url; }
    async loadFile(filename) { this.files.push(filename); this.url = 'file://' + filename; }
    isDestroyed() { return this.dead; }
    isMinimized() { return false; }
    show() {} focus() {} restore() {}
    close() { this.dead = true; this.emit('closed'); }
  }
  const ses = new EventEmitter();
  ses.setPermissionCheckHandler = fn => { state.check = fn; };
  ses.setPermissionRequestHandler = fn => { state.request = fn; };
  const electron = { app, BrowserWindow: Window, session: { defaultSession: ses }, Menu: { buildFromTemplate: menu => menu, setApplicationMenu: menu => { state.menu = menu; } }, dialog: { showMessageBox: async (_window, options) => { state.dialogs.push(options); return state.dialogGate ? state.dialogGate : { response: state.response }; } }, shell: { openExternal: async url => { state.opened.push(url); } } };
  const desktop = createDesktop(electron);
  return { state, desktop, ses, app };
}
function event(url, isMainFrame = true) { return { url, isMainFrame, blocked: false, preventDefault() { this.blocked = true; } }; }
function item(url, filename = 'file.txt', chain = [url]) { const result = new EventEmitter(); return Object.assign(result, { getURL: () => url, getURLChain: () => chain, getFilename: () => filename, setSaveDialogOptions: options => { result.options = options; } }); }

test('origin checks reject scheme, credentials, host and port impersonation', () => {
  assert.equal(isAppUrl(ORIGIN + '/messages?q=1'), true);
  for (const url of ['http:' + ORIGIN.slice(6), ORIGIN + '.evil.test/', 'https://user:password@' + new URL(ORIGIN).host, ORIGIN + ':8443/', 'javascript:alert(1)', 'file:///tmp/a', 'data:text/html,x', 'https://evil.test/?' + ORIGIN]) assert.equal(isAppUrl(url), false, url);
  assert.equal(isDownloadUrl('blob:' + ORIGIN + '/uuid'), true);
  assert.equal(isDownloadUrl('blob:https://evil.test/uuid'), false);
});
test('actual main process enables app sandbox and a persistent isolated renderer without bridges', async () => {
  const h = harness(); await h.desktop.start(); const win = h.state.windows[0];
  assert.equal(h.state.sandbox, true);
  const p = win.options.webPreferences;
  for (const key of ['sandbox', 'contextIsolation', 'webSecurity', 'safeDialogs']) assert.equal(p[key], true);
  for (const key of ['nodeIntegration', 'nodeIntegrationInWorker', 'nodeIntegrationInSubFrames', 'webviewTag', 'allowRunningInsecureContent', 'navigateOnDragDrop']) assert.equal(p[key], false);
  assert.equal(p.preload, undefined); assert.equal(p.partition, undefined);
  assert.deepEqual(win.loaded, [ORIGIN + '/']);
  const attach = event(''); win.webContents.emit('will-attach-webview', attach); assert.equal(attach.blocked, true);
});
test('top-level navigation stays on exact app origin; external HTTPS needs native confirmation', async () => {
  const h = harness(); await h.desktop.start(); const win = h.state.windows[0];
  const own = event(ORIGIN + '/messages'); win.webContents.emit('will-navigate', own); assert.equal(own.blocked, false);
  const external = event('https://example.com/path'); win.webContents.emit('will-navigate', external); await tick();
  assert.equal(external.blocked, true); assert.equal(h.state.dialogs.length, 1); assert.deepEqual(h.state.opened, []);
  h.state.response = 1; const next = event('https://example.com/confirmed'); win.webContents.emit('will-redirect', next); await tick();
  assert.deepEqual(h.state.opened, ['https://example.com/confirmed']);
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'http://example.com', 'https://user:secret@example.com/']) { const e = event(url); win.webContents.emit('will-navigate', e); assert.equal(e.blocked, true); }
  assert.equal(h.state.dialogs.length, 2);
});
test('Electron45 single-event iframe navigation and redirects cannot escape or open native browser', async () => {
  const h = harness(); await h.desktop.start(); const wc = h.state.windows[0].webContents;
  for (const name of ['will-frame-navigate', 'will-redirect']) { const e = event('https://evil.test/', false); wc.emit(name, e); assert.equal(e.blocked, true); }
  const own = event(ORIGIN + '/frame', false); wc.emit('will-frame-navigate', own); assert.equal(own.blocked, false);
  await tick(); assert.equal(h.state.dialogs.length, 0);
});
test('popups cannot create windows or acquire Node privileges', async () => {
  const h = harness(); await h.desktop.start(); const win = h.state.windows[0];
  assert.deepEqual(win.popup({ url: ORIGIN + '/profile', features: 'nodeIntegration=yes' }), { action: 'deny' });
  assert.equal(win.loaded.at(-1), ORIGIN + '/profile');
  assert.deepEqual(win.popup({ url: 'file:///etc/passwd' }), { action: 'deny' });
  assert.equal(h.state.windows.length, 1); assert.deepEqual(h.state.opened, []);
});
test('microphone request uses native consent and actual check-handler mediaType contract', async () => {
  const h = harness(); await h.desktop.start(); const wc = h.state.windows[0].webContents;
  const details = { requestingUrl: ORIGIN + '/', isMainFrame: true, mediaTypes: ['audio'] };
  assert.equal(h.state.check(wc, 'media', ORIGIN, { mediaType: 'audio', isMainFrame: true }), false);
  h.state.response = 1; let allowed;
  await h.state.request(wc, 'media', value => { allowed = value; }, details);
  assert.equal(allowed, true);
  assert.equal(h.state.check(wc, 'media', ORIGIN, { mediaType: 'audio', isMainFrame: true }), true);
  assert.equal(h.state.check(wc, 'media', ORIGIN, { mediaType: 'video', isMainFrame: true }), false);
  assert.equal(h.state.check(wc, 'media', 'https://evil.test', { mediaType: 'audio', isMainFrame: true }), false);
});
test('foreign frames, screen capture and special permissions are denied without prompts', async () => {
  const h = harness(); await h.desktop.start(); const wc = h.state.windows[0].webContents;
  for (const [permission, details] of [['media', { mediaTypes: ['video'], isMainFrame: false }], ['display-capture', {}], ['geolocation', {}], ['media', { mediaTypes: ['audio'], isMainFrame: false }], ['notifications', { requestingUrl: 'https://evil.test' }]]) {
    let result; await h.state.request(wc, permission, value => { result = value; }, { requestingUrl: ORIGIN, isMainFrame: true, ...details }); assert.equal(result, false);
  }
  assert.equal(h.state.dialogs.length, 0);
});
test('a top-level video call requests both AV permissions without implicitly extending an audio grant', async () => {
  const h = harness(); await h.desktop.start(); const wc = h.state.windows[0].webContents;
  h.state.response=1; let allowed=false;
  await h.state.request(wc,'media',v=>{allowed=v;},{requestingUrl:ORIGIN+'/',isMainFrame:true,mediaTypes:['audio','video']});
  assert(allowed);assert.equal(h.state.check(wc,'media',ORIGIN,{mediaType:'video',isMainFrame:true}),true);
  assert.equal(h.state.check(wc,'media',ORIGIN,{mediaType:'audio',isMainFrame:true}),true);
  assert.equal(h.state.check(wc,'media',ORIGIN,{mediaType:'video',isMainFrame:false}),false);
});
test('revocation rejects pending approvals and reloads to stop existing microphone tracks', async () => {
  const h = harness(); await h.desktop.start(); const win = h.state.windows[0]; let resolve;
  h.state.dialogGate = new Promise(r => { resolve = r; });
  let result; const pending = h.state.request(win.webContents, 'notifications', v => { result = v; }, { requestingUrl: ORIGIN, isMainFrame: true });
  const revoke = h.state.menu[0].submenu.find(row => row.label?.startsWith('Revoke'));
  revoke.click(); resolve({ response: 1 }); await pending;
  assert.equal(result, false); assert.equal(win.loaded.length, 2);
  assert.equal(h.state.check(win.webContents, 'notifications', ORIGIN, { isMainFrame: true }), false);
});
test('downloads require own document, safe originating URL and HTTPS redirect chain; always use Save dialog', async () => {
  const h = harness(); await h.desktop.start(); const wc = h.state.windows[0].webContents;
  const valid = item(ORIGIN + '/source.zip', '../CON.exe', [ORIGIN + '/source.zip', 'https://github.com/example/file.zip']); const e = event(''); h.ses.emit('will-download', e, valid, wc);
  assert.equal(e.blocked, false); assert.match(valid.options.defaultPath, /^\/user\/downloads\/[^/]+$/); assert.equal(valid.getSavePath, undefined);
  for (const target of [item('https://evil.test/a'), item('file:///tmp/a'), item(ORIGIN + '/x', 'x', [ORIGIN + '/x', 'http://evil.test/x'])]) { const bad = event(''); h.ses.emit('will-download', bad, target, wc); assert.equal(bad.blocked, true); assert.equal(target.options, undefined); }
  const foreign = event(''); h.ses.emit('will-download', foreign, item(ORIGIN + '/x'), { getURL: () => ORIGIN }); assert.equal(foreign.blocked, true);
  assert.equal(h.state.opened.length, 0);
});
test('download filenames cannot create paths or Windows reserved files', () => {
  assert.equal(safeFilename('CON.txt'), 'VOIDLINE-CON.txt');
  for (const name of ['../a', '..\\a', '\u0000file', 'NUL', 'foo. ', 'C:\\a.exe']) assert.doesNotMatch(safeFilename(name), /[<>:"/\\|?*\x00-\x1f]/);
});
test('failed initial connection displays local truthful retry screen', async () => {
  const h = harness({ failLoad: true }); await h.desktop.start(); await tick(); const win = h.state.windows[0];
  assert.match(win.files.at(-1), /offline\.html$/);
  const offline = require('node:fs').readFileSync(require('node:path').join(__dirname, 'offline.html'), 'utf8');
  assert.match(offline, /Connection unavailable/); assert.match(offline, /Nothing was sent/); assert.doesNotMatch(offline, /<script/i);
});
test('closed window ignores late load failure, renderer crash and popup events', async () => {
  const h = harness(); await h.desktop.start(); const win = h.state.windows[0]; win.close();
  assert.doesNotThrow(() => { win.webContents.emit('did-fail-load', {}, -105, 'offline', ORIGIN, true); win.webContents.emit('render-process-gone'); win.popup({ url: ORIGIN }); });
});
test('second process quits without a second persistent-profile window', async () => {
  const h = harness({ lock: false }); await h.desktop.start(); assert.equal(h.state.quit, 1); assert.equal(h.state.windows.length, 0);
});
