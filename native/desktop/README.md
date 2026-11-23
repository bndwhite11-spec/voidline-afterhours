# VOIDLINE desktop

An actual Windows x64 portable app for the existing HTTPS service. Extract the
**entire** `VOIDLINE-Windows-x64.zip` and open `VOIDLINE.exe`. Keep its DLLs and
`resources` folder together. Windows 10 or later is required. This is a desktop
client, not an offline copy of shared messages.

## Build and checks

Use Node 22.12+ on Linux, Windows or macOS:

```sh
cd native/desktop
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --ignore-scripts
npm test
npm run build:windows
```

The Windows package is built on Linux using the maintained packager's JavaScript
PE resource editor; Wine is unnecessary. The output defaults to
`/workspace/voidline-release/desktop/VOIDLINE-Windows-x64.zip`, accompanied by
`SHA256SUMS` and `release.json`. `VOIDLINE_DESKTOP_OUTPUT` and
`VOIDLINE_DESKTOP_CACHE` can override output/cache directories. Neither belongs
in Git, the downloaded source archive, or the hosted site's static bundle.
Building requires `curl`, `zip`, and `unzip`. Build tools are development
dependencies; the installed application contains no npm dependencies.

Pinned inputs, verified on 19 November 2026:

| Input | Version |
| --- | --- |
| Electron stable | 45.4.1 |
| @electron/packager | 20.3.0 |
| @electron/fuses | 2.1.3 |
| Application | 1.0.1 |

The official Electron Windows archive is downloaded from its versioned GitHub
release and checked against the pinned SHA-256 from that release's
`SHASUMS256.txt`:

`2ba6223afa9121f42831fefe92c434334907540165294fc56697449d12e7cfe9`

The npm lockfile pins build dependencies and their registry integrity values.
Update the Electron version, archive hash and lockfile together when adopting a
new security release; test and rebuild the downloadable binary. There is no
automatic updater in this first version.

The build verifies Windows x64 PE headers, app ASAR contents against reviewed
source, security fuse settings and full ZIP CRC integrity. The focused tests
execute the actual main-process event handlers with an injected Electron mock.
They cover URL and origin validation, current Electron navigation/permission
event shapes, renderer isolation, downloads, revocation races, offline states,
and window lifetime. These tests do **not** execute Chromium or Windows.

## Runtime boundaries

- Only `https://voidline-afterhours.pipedcactus1.chatgpt.site` opens inside the
  client. Foreign HTTPS links require native confirmation and open in the system
  browser. Non-HTTPS schemes, credential-bearing URLs and external iframe
  navigation are denied. New windows cannot change renderer settings.
- The renderer is sandboxed with context isolation and web security enabled.
  Node integration, workers with Node, subframe Node, WebViews and developer
  tools are disabled. There is no preload, IPC bridge or custom URL protocol.
- Electron fuses disable RunAsNode, `NODE_OPTIONS`, Node inspect arguments and
  extra file-protocol privileges. Cookie encryption, ASAR-only app loading and
  embedded ASAR integrity are enabled. TLS validation stays enabled.
- Chromium's normal per-app persistent profile stores cookies/cache. Signing
  into the existing service uses the same account and backend; it does not
  import another browser's cookies. The wrapper stores no embedded accounts,
  authentication tokens, service keys or passwords.
- The trusted app requests native approval for camera, microphone and desktop
  notifications. Separate camera and microphone grants last until quit or
  revocation. Revoking permissions cancels pending approvals and reloads the
  page to stop active capture. Screen sharing, USB and location are denied. Ordinary file selection uses Chromium's native picker.
- Downloads must originate from the app and keep an HTTPS redirect chain
  (own-origin blob downloads are supported). A native Save dialog chooses the
  destination; files never run automatically.
- A local, script-free connection screen offers a truthful retry when loading
  the live service fails. It never reports messages sent or a fake connection.

The service's existing authentication, privacy and encryption limitations remain
in force. This package does not add E2EE, native calls, or a new push transport.

## Release limitations

This portable release has **no publisher Authenticode certificate** and
is not distributed through Microsoft Store. Windows may show an unknown-publisher
warning. Do not bypass organization policy. Distribute it through the project's
official release assets with `SHA256SUMS`. Keep Electron security updates current.

Version 1.0.1 was packaged on Linux. Real Windows
startup, SmartScreen, screen reader behavior, file dialogs, audio, notification
delivery, OAuth provider flows and passkeys require device testing. Some Google
OAuth providers reject embedded user agents; use the menu's **Open VOIDLINE in
browser** action when needed. No provider configuration has been invented.

This project builds a Windows x64 binary. It does not claim a working macOS
DMG, Linux AppImage, iOS IPA, App Store listing, or Apple notarization.

Official references:

- [Electron release](https://github.com/electron/electron/releases/tag/v45.4.1)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Permission handlers](https://www.electronjs.org/docs/latest/api/session)
- [Navigation events](https://www.electronjs.org/docs/latest/api/web-contents)
- [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)
- [Packager](https://electron.github.io/packager/main/)
