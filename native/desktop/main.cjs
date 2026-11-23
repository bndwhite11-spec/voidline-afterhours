'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ORIGIN = 'https://voidline-afterhours.pipedcactus1.chatgpt.site';
const HOME = `${ORIGIN}/`;
const OFFLINE = pathToFileURL(path.join(__dirname, 'offline.html')).href;

function httpsUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password ? u : null;
  } catch { return null; }
}
function isAppUrl(value) { return httpsUrl(value)?.origin === ORIGIN; }
function isDownloadUrl(value) {
  if (isAppUrl(value)) return true;
  return typeof value === 'string' && value.startsWith('blob:') && isAppUrl(value.slice(5));
}
function safeFilename(value) {
  const name = String(value || 'download').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 180);
  return !name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? `VOIDLINE-${name || 'download'}` : name;
}

// Dependency injection lets focused tests exercise these actual Electron event
// handlers. The remote renderer has no preload, IPC bridge or Node capability.
function createDesktop(electron) {
  const { app, BrowserWindow, Menu, dialog, shell, session } = electron;
  let window;
  let externalPrompt = false;
  let grantEpoch = 0;
  const grants = new Set();
  const trustedContents = wc => Boolean(wc && window && wc === window.webContents && isAppUrl(wc.getURL()));

  async function openExternal(value) {
    const u = httpsUrl(value);
    if (!u || externalPrompt) return;
    externalPrompt = true;
    try {
      const { response } = await dialog.showMessageBox(window, {
        type: 'question', title: 'Open link in your browser?',
        message: `Open ${u.hostname} in your default browser?`,
        detail: 'The link opens outside VOIDLINE. Check the address before signing in.',
        buttons: ['Cancel', 'Open browser'], defaultId: 0, cancelId: 0,
        noLink: true
      });
      if (response === 1) await shell.openExternal(u.href);
    } finally { externalPrompt = false; }
  }
  function navigation(event, legacyUrl) {
    const url = event.url || legacyUrl;
    if (isAppUrl(url)) return;
    event.preventDefault();
    if (event.isMainFrame !== false) void openExternal(url).catch(() => {});
  }
  function permissionKeys(permission, details) {
    if (permission === 'notifications') return ['desktop notifications'];
    if (permission !== 'media') return [];
    const types = Array.isArray(details?.mediaTypes) ? details.mediaTypes : [details?.mediaType];
    if (!types.length || types.some(type => !['audio', 'video'].includes(type))) return [];
    return [...new Set(types.map(type => type === 'audio' ? 'microphone' : 'camera'))];
  }
  function setupSession(ses) {
    ses.setPermissionCheckHandler((wc, permission, requestingOrigin, details) => {
      const keys = permissionKeys(permission, details);
      return Boolean(trustedContents(wc) && isAppUrl(requestingOrigin) && details?.isMainFrame !== false && keys.length && keys.every(key => grants.has(key)));
    });
    ses.setPermissionRequestHandler(async (wc, permission, callback, details) => {
      const keys = permissionKeys(permission, details);
      if (!trustedContents(wc) || !isAppUrl(details?.requestingUrl || details?.securityOrigin) || details?.isMainFrame === false || !keys.length) return callback(false);
      if (keys.every(key => grants.has(key))) return callback(true);
      const label = keys.join(' and ');
      const requestEpoch = grantEpoch;
      try {
        const { response } = await dialog.showMessageBox(window, {
          type: 'question', title: `Allow ${label}?`, message: `Allow VOIDLINE to use ${label} during this session?`,
          detail: 'You can revoke this permission in the VOIDLINE desktop menu. Closing the app clears this permission.',
          buttons: ['Don’t allow', 'Allow'], defaultId: 0, cancelId: 0, noLink: true
        });
        if (response === 1 && requestEpoch === grantEpoch && trustedContents(wc)) { keys.forEach(key => grants.add(key)); callback(true); }
        else callback(false);
      } catch { callback(false); }
    });
    ses.on('will-download', (event, item, wc) => {
      const chain = item.getURLChain();
      if (!trustedContents(wc) || !isDownloadUrl(item.getURL()) || !chain.every(value => httpsUrl(value) || isDownloadUrl(value))) return event.preventDefault();
      const filename = safeFilename(item.getFilename());
      item.setSaveDialogOptions({ title: 'Save file from VOIDLINE', defaultPath: path.join(app.getPath('downloads'), filename) });
      item.once('done', (_event, state) => {
        if (state === 'interrupted' && window && !window.isDestroyed()) {
          void dialog.showMessageBox(window, { type: 'error', title: 'Download interrupted', message: 'The file was not downloaded. Try again from the conversation.' }).catch(() => {});
        }
      });
    });
  }
  async function loadHome() {
    const target = window;
    if (!target || target.isDestroyed()) return;
    try { await target.loadURL(HOME); }
    catch { if (!target.isDestroyed()) await target.loadFile(path.join(__dirname, 'offline.html')).catch(() => {}); }
  }
  function createWindow() {
    window = new BrowserWindow({
      width: 1280, height: 820, minWidth: 360, minHeight: 540,
      title: 'VOIDLINE', backgroundColor: '#0E1014', show: false,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true, contextIsolation: true, nodeIntegration: false,
        nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false,
        webSecurity: true, allowRunningInsecureContent: false,
        webviewTag: false, navigateOnDragDrop: false, safeDialogs: true,
        devTools: false
      }
    });
    const createdWindow = window;
    const wc = createdWindow.webContents;
    wc.on('will-navigate', navigation);
    wc.on('will-redirect', navigation);
    wc.on('will-frame-navigate', event => {
      if (event.isMainFrame === false && !isAppUrl(event.url)) event.preventDefault();
    });
    wc.on('will-attach-webview', event => event.preventDefault());
    wc.setWindowOpenHandler(({ url }) => {
      if (createdWindow.isDestroyed()) return { action: 'deny' };
      if (isAppUrl(url)) void createdWindow.loadURL(url).catch(() => loadHome());
      else void openExternal(url).catch(() => {});
      return { action: 'deny' };
    });
    wc.on('did-fail-load', (_event, code, _description, url, mainFrame) => {
      if (mainFrame && code !== -3 && url !== OFFLINE && !createdWindow.isDestroyed()) void createdWindow.loadFile(path.join(__dirname, 'offline.html')).catch(() => {});
    });
    wc.on('render-process-gone', () => { if (!createdWindow.isDestroyed()) void createdWindow.loadFile(path.join(__dirname, 'offline.html')).catch(() => {}); });
    window.once('ready-to-show', () => { if (!createdWindow.isDestroyed()) createdWindow.show(); });
    window.on('closed', () => { window = null; });
    void loadHome();
    return window;
  }
  async function start() {
    app.enableSandbox();
    if (!app.requestSingleInstanceLock()) { app.quit(); return; }
    app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
    app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
    app.on('activate', () => { if (!window) createWindow(); });
    await app.whenReady();
    setupSession(session.defaultSession); // Chromium's default persistent, per-app profile.
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'VOIDLINE', submenu: [
        { label: 'Retry connection / Home', click: () => { if (window) void loadHome(); } },
        { label: 'Open VOIDLINE in browser', click: () => { void openExternal(HOME).catch(() => {}); } },
        { label: 'Revoke camera, microphone and notifications (reloads app)', click: () => { grantEpoch++; grants.clear(); if (window) void loadHome(); } },
        { type: 'separator' }, { role: 'quit' }
      ] },
      { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] }
    ]));
    createWindow();
  }
  return { start, createWindow, setupSession, openExternal, getWindow: () => window };
}

module.exports = { createDesktop, isAppUrl, isDownloadUrl, httpsUrl, safeFilename, ORIGIN };
if (require.main === module) createDesktop(require('electron')).start().catch(() => { process.exitCode = 1; });
