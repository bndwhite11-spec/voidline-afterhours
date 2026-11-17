# VOIDLINE upgrade: implementation and release boundaries

The existing public Site, account IDs, histories, memberships and legitimate
cosmetic ownership are preserved. New native accounts remain empty. Explicit
local-archive review never silently uploads messages or trusts local ownership.

## Delivered implementation

- Graphite/ice-blue navigation, contextual lists, empty home, exact links,
  keyboard switcher, responsive panes and consistent error/loading states.
- Native username or verified-email login, Argon2id password hashing, atomic
  migration of existing password hashes, opaque revocable cookie sessions,
  recovery-code reset, optional verified-email reset and Google OIDC.
- Maintained WebAuthn verification with user verification required; one-time
  infrastructure ownership binding to an immutable account ID. Public @xrp is
  not authority. The protected dashboard independently checks every API.
- Durable private filters, folders, conversation preferences, explicit Inbox
  read actions, permission-aware legacy search and source navigation.
- Independent encrypted local Saved notes, plus separate self-only encrypted
  Matrix Saved. Device-only notes are not advertised as cloud synchronization.
- Richer profiles and visibility settings, blocking, 12 free original gift
  designs, atomic grant/owned-instance transfer requests, collection details,
  three showcase slots, separate earned awards and cosmetic decorations.
- Matrix SDK/Rust crypto adapter actions for encrypted conversations, threads,
  replies, edits, deletions, reactions, bookmarks and encrypted attachments or
  voice notes. Durable encrypted per-thread drafts and outbox use stable IDs.
- Additive migration 0006, retaining migrations 0000–0005 unchanged: account
  security, ownership/audit, profile, organization and collectible records.
  The schema has 41 application tables. D1 remains the shared-data authority;
  browser storage cannot mint server gifts, awards, roles or memberships.
- Protected local SQLite snapshots and an isolated, authenticated restore
  procedure. Downloads remain a credential-free source ZIP and an offline
  archive/recovery viewer, not a desktop cloud-chat executable.

## Architecture

The Sites Worker owns application APIs and uses the existing D1 binding `DB`.
Native passwords use pinned @noble/hashes Argon2id, 19 MiB memory, two iterations,
one lane, independent random salts. Previously valid PBKDF2 credentials upgrade
only after successful login. SimpleWebAuthn verifies real public-key signatures.
Optional Google OIDC uses jose, provider subject identity, state, PKCE, nonce,
issuer/audience checks and server-side token verification. Resend supplies the
optional verified recovery channel. Configuration secrets stay server-side.

Private message encryption uses matrix-js-sdk 45.1 and Rust crypto 18.9.2, not
a key embedded in the client or a server universal decryption key. Matrix
attachment encryption is implemented by the maintained Rust Attachment API.
The service and Matrix still observe account, routing, timing and room metadata.
HTTPS, server storage security, password hashing and E2EE are separate properties.

The local vault is a separate at-rest protection: a user-supplied passphrase,
PBKDF2-HMAC-SHA256 600,000 rounds and AES-256-GCM, account/device-scoped IndexedDB,
authenticated record IDs and fresh IVs. It does not create an E2EE messaging
protocol. Password recovery does not restore missing encryption keys. Retained
plaintext history remains explicitly read-only and plaintext.

## Verification performed before publication

The full current server and client runners pass, along with encrypted backup
restore, actual Rust attachment roundtrip/tamper, real WebCrypto/IndexedDB, real
WebAuthn generated-key signatures and local Worker-runtime Argon2id tests.
Database tests use migrated isolated SQLite and actual HTTP handlers. Adapter
transport tests use controlled Matrix SDK/network doubles. Client VM tests
exercise UI logic and account switching; they do not replace a browser/device.
Production dependency audit reports no known vulnerabilities.

The built Worker is checked for exact asset bytes, HEAD/ETag behavior, deep-page
asset resolution, private build-path exclusion, provider configuration gates,
project identity and all seven packaged migrations. Download tests reject
runtime database/backup files and credential material. Live HTTP/API smoke and
source-byte comparison are separate release operations, not inferred successes.

## Configuration and unfinished acceptance

These limits must remain visible and must not be represented as completed:

1. **Owner:** no real owner account was bound during implementation. The holder
   must sign into the intended @xrp, confirm authentication, enroll and verify
   a passkey, and create an owner-access request. Trusted infrastructure then
   resolves the five-minute proof, configures the exact immutable ID, binds
   once, and removes bootstrap settings. See OWNER-BOOTSTRAP.md.
2. **Google:** requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, VOIDLINE_ORIGIN
   and the exact registered `/api/auth/google/callback`. A missing provider
   returns unavailable and its sign-in button stays hidden.
3. **Email:** requires RESEND_API_KEY, EMAIL_FROM and a verified sending domain.
   No verified email delivery or reset-inbox acceptance is claimed without it.
4. **Encrypted conversations:** MATRIX_HOMESERVER is unconfigured. Account and
   community creation do not create a Matrix identity/room. Native-to-Matrix
   identity and permission mapping remains an integration stage. Two-device
   exchange, device verification/revocation, recovery, group membership and
   attachment lifecycle tests require that infrastructure. The adapter's local
   tests do not complete the product E2EE requirement.
5. **Remaining product infrastructure:** push delivery, calls/video/screenshare,
   private encrypted gift notes, full-history encrypted search, structured
   mention selection, authoritative presence/read receipts and coordinated
   server-media retention are unavailable. Community timeouts do not revoke
   a separately authorized Matrix room membership.
6. **Operations:** this environment has no hosted D1 export/restore/scheduling
   controls. Local encrypted restore proves the tool, not production backups.
   Provider backup policy and an isolated hosted restore still need operator
   infrastructure access.
7. **Browser/device proof:** no supported interactive browser controls were
   available in this workspace. Width rules and UI state tests were inspected;
   real 320/390/768/1440px interaction, keyboard/microphone/media/passkey devices,
   authenticated screenshots and production cross-device encryption are not
   claimed. A native hosted screenshot is only proof of its captured page.

Refer to AUTHENTICATION.md, OWNER-BOOTSTRAP.md, ENCRYPTION-DECISION.md,
ENCRYPTION-THREAT-MODEL.md, ORGANIZATION.md, COSMETICS.md and BACKUP-RESTORE.md
for precise flows and operating procedures.
