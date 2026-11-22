# Phone access and account setup

The existing public Site uses native username/password accounts. Friends can open the HTTPS app directly in current Android Chrome or iPhone/iPad Safari and choose Create account. They do not need ChatGPT, a Matrix account, an invitation to the Site, or the owner’s credentials. Communities can still require explicit invitations. Existing account IDs, server histories and legitimate ownership stay unchanged.

Choose a platform on the public install page. On Android 7.0 or later, download the signed APK, open it from Downloads and choose **Install** or **Update**. Launch requires a compatible browser and internet access. On Windows 10 or later, download the unsigned x64 portable ZIP, extract it and open VOIDLINE from the extracted folder. Both platforms also support browser installation.

On iPhone or iPad, open VOIDLINE in Safari and choose **Share → Add to Home Screen**. Leave **Open as Web App** enabled when shown. On macOS Sonoma or later, use Safari’s **File → Add to Dock**. Friends can use the same HTTPS link in a browser and sign in on each device. Live chats need internet. The separate downloadable offline viewer opens a local archive. [Download and installation instructions](https://voidline-afterhours.pipedcactus1.chatgpt.site/install.html)

The root manifest has a stable root id/start/scope and separate192/512 PNG icons,512 maskable and180 Apple touch icon. Existing logo pixels are rasterized conventionally; no new collectible artwork is generated. `scripts/build-app-icons.mjs --check` validates real static PNG dimensions and source-SVG hashes during builds. Regeneration uses installed Inkscape/Pillow; normal deployment builds need only Node for the check.

`mobile.js` does not read typed text or change application/account state. Visible-viewport resize/focus events update CSS variables, preserve pinch zoom and adapt phone panes/dialogs to a detected keyboard. Width-aware baselines handle rotation while focused. Bottom navigation returns when the keyboard closes. Safe areas protect the header, content and Home Screen navigation. Actual OS keyboard behavior remains an acceptance limit.

On coarse primary pointers with no hover, Return inserts a newline and the Send button sends. Ctrl/Cmd+Enter sends from an attached keyboard. Desktop Enter retains its send shortcut; Shift/Alt/IME confirmation and already handled events do not submit. Draft/outbox and permission rules remain independent.

The install flow never requests notification permission or installs a private-content cache. The existing push worker still has no fetch/cache handler. Notification settings explain that iOS16.4+ Web Push needs an installed Home Screen app. Provider acceptance does not prove device display.

Verification distinguishes controlled install/share/viewport and composer tests, actual PNG/manifest/build checks, public HTTP access and isolated native-account persistence from physical Android/iOS browser installation, software keyboards and push delivery. No physical-device or native app-store acceptance is fabricated.

Official references: [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [MDN icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons), [Apple Home Screen web apps](https://support.apple.com/en-az/guide/iphone/iphea86e5236/26/ios/26). Service workers are not a general installability requirement; no fetch handler is added merely to pretend otherwise.

## Collectible release mobile verification

| Test environment | Observed behavior |
| --- | --- |
| Chromium 156 with Android touch emulation | The public gallery opened the selected object at widths of 320, 390 and 768 CSS pixels. Rotation preserved the selection. Reduced motion preserved the poster. Isolated accounts at 320 and 390 pixels registered, opened a capsule, saved the awarded instance in a profile slot and retained it after reload. |
| WebKit 26.5 on Linux with iPhone and iPad viewports | The public login, registration form and Safari installation guide fit 320, 360, 390 and 768 CSS pixels, and 844 pixels in landscape. An isolated account registered, opened its welcome capsule with reduced motion, displayed that same copy on its profile and signed back in. |
| Android 7.0 emulator, API 24 | Installing the published signed APK over 1.0.2 retained the application UID. Launch handed the canonical URL to a browser. Back returned to the launcher, and disabling the browser produced a recoverable message. |

The signed-in checks used the shipped client and an isolated Worker and database. The two captures show actual awarded copies. [Phone screenshots](quality-assets/mobile-capsules.jpg)

The phone checks uncovered a content security policy that blocked the install manifest. The Worker now permits same-origin manifests on its app and install pages. The build verifies the manifest link and policy together. Chromium’s installability check on the corrected release loaded the manifest and returned zero errors in a fresh profile.

Concurrent mobile sign-ups also exposed a Worker request that could hang. Two requests can now hash passwords independently. At capacity the service returns a retryable 503. An isolated database test submitted three overlapping registrations, retried the busy request, and signed all three users back in on the same Worker.
A cold start on the Collection URL could overwrite an immediate tap on Profile while the two screens waited on the same download. An explicit navigation now takes precedence over route restoration. The regression test covers the first tap and browser back and forward.

Physical iOS installation through the Safari share sheet, software keyboards and on-device push delivery still require a handset.
