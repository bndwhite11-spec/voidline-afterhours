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
