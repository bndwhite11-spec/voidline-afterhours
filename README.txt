VOIDLINE: AFTERHOURS

APP
https://voidline-afterhours.pipedcactus1.chatgpt.site/

Create a native account with a unique username and a 12–128-character password.
New accounts have no communities, messages, contacts, collectibles or invented
activity. Existing legitimate accounts and history remain intact. Keep the
one-time account recovery code in your password manager.

THIS UPGRADE
Built-in account messaging fixes the missing-service dead end. Add someone by
username, have them accept the friend request, choose Message, review the
security explanation and start a direct message or group. Community text uses
the same clear Standard messaging disclosure and scoped server permissions.

Standard messaging is protected by HTTPS and authenticated access, with readable
text stored on the service. It is not end-to-end encrypted. No existing Matrix
room, key, protected draft or message is converted into standard messaging.
The optional encrypted connection remains separate and requires its configured
Matrix service. See docs/NATIVE-MESSAGING.md and docs/ENCRYPTION-DECISION.md.

The graphite/ice-blue interface keeps navigation and conversational context
clear. Native messages support server acknowledgments, stable retries, replies,
edits/deletions, reactions, earlier history, exact links, real unread state and
five-second change polling while open. Personal favorites/pins/archive/mute and
folders include native chats. Inbox never silently marks everything read.
Native file/voice uploads and calls are unavailable; their buttons do not fake
connections. Search explicitly states loaded-history or community-server scope.

A short original chrome entry reveal is skippable, bounded to 1.19 seconds and
bypassed for returning sessions, recovery links and reduced motion. It makes no
fake percentage, connection or backend progress claim. The supplied TikTok link
could not be watched through the available tools; the design is original.

COLLECTIONS AND PROFILES
Twenty-one free original badge decorations now include six crypto-culture and
six internet-meme designs alongside LARP PRO MAX, 404 Angel, Ghost Frequency and
Voidwalker. Category/Collected filters show actual ownership. Token-inspired
art does not represent money, wallet balances, verified holdings or affiliation.

Twelve original gift designs support free grants and accepted transfers of
owned instances, consent, blocking, retry deduplication and three showcase slots.
Separate earned awards have server requirements, issuers and revocation state.
No decoration, gift or earned award grants a platform/community role.

Profiles retain previewable avatar/banner/accent presets, bio/status, private
collections and real owner indicators. The detailed improvement prompt develops
future Telegram-inspired gift collections/wearable accents and Discord-inspired
profile frames, nameplates and editing. Those future ideas are not all present
features. The prompt includes official references and concrete acceptance tests.

ACCOUNT SECURITY
Native passwords use maintained Argon2id. Existing valid password hashes upgrade
after successful login. Opaque secure cookies, revocation, suspension checks,
offline-code reset, verified-email recovery and WebAuthn step-up are implemented.
Google OIDC and email delivery require server provider credentials and truthful
configuration gates; current production has neither provider configured.

@xrp identifies the intended owner. Username/display name/community ownership
cannot grant platform administration. A verified passkey-backed session claim
plus trusted infrastructure configuration binds the immutable account once.
No production owner is bound merely by this release. See OWNER-BOOTSTRAP.md.

STORAGE AND RECOVERY
D1 is the shared authority. Additive migrations 0000–0007 create 47 application
tables and preserve existing records. Standard drafts/failed sends use per-tab,
per-account/sessionStorage and clear on lock/sign-out. The independent encrypted
local Saved tool uses a separate vault passphrase and is clearly device-only.
Explicit local-archive review never uploads history or mints official ownership.

Account deletion removes native memberships/preferences and credentials, then
anonymizes author identity; legitimate recipient conversation history remains.
Password recovery does not recover missing Matrix encryption keys. Operator
SQLite backups use maintained authenticated encryption and isolated restore;
hosted D1 retention/restore still requires provider infrastructure access.

DOWNLOADS
  /downloads/voidline-improvement-prompt.txt  2,480-word improvement prompt
  /downloads/voidline-source.zip              source without runtime credentials
  /downloads/voidline-offline.html            offline archive/recovery viewer
The offline viewer cannot sign in or exchange network messages. These are not
a signed desktop installer. Recovery exports may contain plaintext history.

BUILD AND CHECKS (Node24 and Python3)
  npm ci --no-audit --no-fund
  npm run test:server
  npm run test:client
  python3 -m pip install -r requirements-backup.txt
  npm run check:restore
  python3 build_offline.py
  npm run build
  node scripts/check-build.mjs

SOURCE GUIDE
  dist/home.js/.css        account and messaging client
  dist/entry.js/.css       bounded first-entry reveal
  dist/cosmetics.js/.css   original badge/gift collection
  dist/organize.js/.css    private organization, Inbox, Saved and search
  worker/messages.mjs     standard DM/group authorization and persistence
  worker/index.mjs        community channels and permissioned standard text
  worker/auth.mjs          native credentials, sessions and provider integration
  worker/admin.mjs         passkey-protected owner operations
  src/secure-messenger.js optional Matrix/Rust encrypted adapter
  docs/                    setup, threat model, implementation and prompt

Full suites mix actual SQLite/crypto checks with controlled DOM/transport and
historical fixture regressions. They do not prove interactive browser/device or
live Matrix behavior. Supported browser controls were unavailable for this work.
See docs/UPGRADE-STATUS.md for current delivery boundaries.
