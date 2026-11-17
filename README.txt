VOIDLINE: AFTERHOURS

APP
https://voidline-afterhours.pipedcactus1.chatgpt.site/

Create a native account with a unique username and a 12–128-character password.
New accounts start with no joined communities, conversations, contacts, messages,
collectibles or invented activity. Save the one-time account recovery code in a
password manager. Existing legitimate accounts, memberships and history remain.

CURRENT IMPLEMENTATION
The account client uses a graphite/ice-blue visual system, compact community
rail, contextual lists, message area and full-width phone navigation. Empty home
provides Create a community, Join with an invite, Find someone, Saved and profile
customization. Filters, favorites, pins, archive/mute settings and folders belong
to the account. Search results open the authorized source. Inbox opening does not
mark everything read; notification preferences do not claim a working push service.

Friends and communities use real D1 records and server authorization. Exact-name
friend requests, consent, blocking, invite previews/revocation, scoped moderation,
member lists and audit records are implemented. Sample personas and communities
remain recovery/test fixtures and are never seeded into a new account.

Profiles provide compact/full views, previewable edits, avatar/banner/accent
presets, independent detail/collection privacy and three gift showcase slots.
The nine original decorations, including LARP PRO MAX, 404 Angel, Ghost Frequency
and Voidwalker, remain free personal cosmetics. Separate earned badges have
server-validated requirements, issuers and revocation state. Neither kind grants
a role. Twelve original gift designs support free grants and accepted transfers
of concrete owned instances, stable retry IDs, blocking, consent and privacy.
Private gift notes remain unavailable; no plaintext private note is stored.

ACCOUNT SECURITY AND OWNER ACCESS
Native registration/login works without OAuth. Login also accepts a separately
verified private email. New passwords use maintained Argon2id; older PBKDF2
credentials upgrade atomically after successful login. Password managers, secure
server sessions, logout/revocation, suspension checks and offline-code recovery
are supported. Authentication is separate from message encryption.

Google is an optional real OpenID Connect flow, shown only when configured.
Google client credentials were not available for this upgrade. Verified-email
verification/reset requires the configured Resend delivery service and sender;
without it, the UI retains the offline recovery-code path. No provider callback
or email delivery is fabricated. Passkeys use maintained SimpleWebAuthn and
provide signed-in step-up verification, not standalone passkey login.

The intended owner handle is @xrp. No production owner was verified or bound by
this upgrade. A username, decoration, community role or first registration grants
no platform authority. The signed-in holder must prove control with recent
authentication and a passkey; a trusted operator then binds the exact immutable
account ID once. The owner dashboard independently checks authority/MFA on every
API and has no universal message-decryption key. See docs/OWNER-BOOTSTRAP.md.

SAVED, MESSAGING AND ENCRYPTION BOUNDARIES
Saved has three explicit scopes:
  This device: private notes/links/tags in an encrypted IndexedDB vault, usable
  without Matrix. A separate 16+ character passphrase protects it. It does not
  sync, export or back up automatically. Losing the passphrase or browser data
  can lose these notes; account password recovery cannot restore the vault.
  Encrypted Saved: notes and source references in a protected Matrix self-room,
  requiring the independent messaging service, keys and current source access.
  Legacy bookmarks: permission-checked references to retained native history;
  these older records do not become end-to-end encrypted retroactively.

New protected messaging uses the pinned Matrix JS SDK and Rust crypto WASM.
The adapter implements device verification/recovery, text/replies/threads,
edits/deletions, encrypted custom reactions, authorized pins, encrypted persistent
drafts/outbox, stable retries and encrypted files/voice notes. Files are limited
to 8 MiB; recordings require an explicit microphone action and review. Search
covers loaded decrypted history on the client and labels that limit.

A compatible Matrix homeserver and authorized devices are still required. None
was configured during this upgrade, and no live encrypted exchange was verified.
The native account and Matrix identity remain separate. Native friend/block and
community permissions are not yet mapped to Matrix rooms; creating a Voidline
community does not create an encrypted channel. Native message history remains
read-only and new protected content cannot fall back to plaintext D1 writes.

HTTPS, server storage protection, password hashing, local vault encryption and
message E2EE are different properties. Local notes and tested attachment crypto
are not evidence of a completed cross-device E2EE deployment. Calls, live voice,
video, screen sharing, full encrypted-history search, integrated encrypted-service
moderation/retention and notification delivery remain incomplete. Detailed limits
and exact setup are in docs/ENCRYPTION-DECISION.md and docs/ENCRYPTION-THREAT-MODEL.md.

DATA AND DOWNLOADS
Migration 0006_hard_tombstone.sql extends the existing immutable migration chain
to 41 application tables. D1 remains authoritative for accounts, permissions,
organization and legitimate collectible ownership. Local archive inspection is
explicit, read-only and device/origin scoped; no archive is silently uploaded or
trusted to mint badges, gifts or privileges.

The hosted app offers a source ZIP and an offline account/archive viewer. The
offline copy cannot sign in or make networked chats. Historical recovery exports
may contain plaintext; store them privately. Source downloads exclude credentials,
runtime account data, dependency directories and generated recursive output.
Protected snapshot tooling and isolated restore checks exist; a production D1
export, restore or backup schedule still requires the managed provider operator.

BUILD AND VERIFICATION
Use Node >=22.13 (Node 24 used here), Python 3 and pinned dependencies:
  npm ci --no-audit --no-fund --cache /tmp/voidline-npm-cache
  npm run test:server
  npm run test:client
  python3 -m pip install -r requirements-backup.txt
  npm run check:restore
Generate browser bundles, downloads and the final Worker in this order:
  npm run build
  python3 build_offline.py
  npm run build
  node scripts/check-build.mjs

Server checks use real handlers and isolated migrated SQLite. Argon2id, JWT and
WebAuthn signature checks use actual maintained implementations; Google exchange
and email transport are controlled test doubles. Vault tests use real WebCrypto
with fake-indexeddb; media tests invoke actual pinned Rust WASM. Client tests use
controlled DOM/transport and include 43 production-entry behavior checks. These
are distinct from browser layout, physical authenticator, real Google/email,
production CPU/load and live two-device Matrix acceptance, which remain unverified.
Any hosted checks/screenshots must be reported separately by the release report.

SOURCE MAP AND OPERATIONS
  dist/home.js/.css                    account client, navigation, message UI
  dist/organize.js/.css                filters, Inbox, Saved, search, communities
  dist/profiles-panel.js/.css          privacy-aware profiles and editing
  dist/cosmetics.js/.css; social.js/.css collections, gifts and social controls
  dist/admin.js/.css                   verified-owner dashboard
  src/passkey-client.js                maintained WebAuthn browser serialization
  src/secure-messenger.js              independent Matrix/Rust crypto adapter
  src/secure-vault.js; local-saved.js   encrypted browser storage and private notes
  worker/*.mjs                        authorized account/application APIs
  db/schema.ts; drizzle/              schema, SQL migrations, journal/snapshots

See docs/UPGRADE-STATUS.md for release status and remaining work. See
DEVELOPMENT.txt, docs/ACCOUNT-SETUP.md, docs/AUTHENTICATION.md,
docs/COSMETICS.md, docs/ORGANIZATION.md and docs/BACKUP-RESTORE.md.
Preserve the existing Site project ID, audience and DB binding. Publish through
the normal Sites workflow. Argon2id credential upgrades make blind rollback to
the v10 Worker unsafe: it cannot verify upgraded passwords or enforce the new
suspension state. Roll forward a compatible fix, or use a vetted coordinated
snapshot restoration after isolated verification; never destructively downgrade
the schema. Do not edit an applied migration or put secrets in
source, client bundles, public configuration, logs or downloadable exports.
