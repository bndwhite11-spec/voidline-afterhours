# Encryption architecture and delivery status

Built-in Standard messaging is a separate, explicitly consented server-stored
text mode. It needs no Matrix identity and is not E2EE. Nothing in this document
labels those D1 conversations encrypted or permits protected Matrix content to
fall back to them. See NATIVE-MESSAGING.md for that mode and its retention rules.

VOIDLINE uses **Matrix JS SDK 45.1.0 with Matrix Rust crypto WASM 18.9.2** for its
new protected messaging path. The packages are pinned in package-lock.json and
bundled locally, including the WASM asset. No remote script CDN is used. This
is an implementation of an established messaging system rather than a new
protocol assembled from cryptographic primitives.

The shipped adapter is `src/secure-messenger.js`; `scripts/build-crypto.mjs`
produces the lazily loaded browser module and WASM. This source implements a
real integration path but has not been exercised against a configured live
homeserver or two real browser devices in this environment. Do not describe
that gap as a completed encrypted exchange or a security audit.

## Implemented path

- Native-account enrollment is implemented separately in
  `worker/encryption.mjs` and `src/encrypted-enrollment.js`. It uses a maintained
  Synapse JWT login flow with an immutable account-ID mapping and a fresh
  dedicated messaging device. Native password confirmation unlocks a locally
  derived storage secret; ordinary users need not paste a Matrix token or
  invent a second storage password. This path remains provider-configured and
  has not been exercised against a real service. Advanced manual token
  connection is retained separately.
- Every connection validates Matrix `whoami`, including the expected mapped
  Matrix user and device, before initializing its crypto store. Matching names
  or email addresses do not link accounts. Published own-device keys must match
  the unlocked local store; another client's device cannot be overwritten.
- Rust crypto IndexedDB uses an account/homeserver/Matrix-user/device namespace
  and SDK `storagePassword` encryption. Native enrollment stores its token only
  inside the encrypted local enrollment vault for deliberate reopening; it is
  in memory while unlocked. Advanced manual-token sessions remain memory-only.
  Web Locks enforce one active writer per encrypted device store.
- Private room creation installs `m.megolm.v1.aes-sha2`, joined-only history and
  forbidden guest access. Plaintext rooms are excluded from the encrypted list.
- Sends require an encrypted room, fresh membership agreement with SDK state,
  and verified participating devices. Identity changes and missing verification
  block sends. Final HTTP dispatch rejects every plaintext room `/send` route.
- Text/replies/edits use the SDK's encrypted message path. The stable transaction
  ID binds retries to the same intended message. Threads use standard Matrix
  thread relations. The timeline independently authenticates replacement events,
  applies same-author edits, reconciles deletions and combines encrypted reaction
  add/remove events. A successful return means the homeserver accepted the event,
  not delivery or reading by a recipient. Direct-message classification uses
  `m.direct` account data or the SDK's direct-invitation metadata, not headcount.
- Standard Matrix reactions are intentionally unencrypted by the upstream SDK.
  VOIDLINE therefore uses an encrypted `io.voidline.reaction` content event;
  other Matrix clients may not display this custom reaction. It never sends a
  standard plaintext reaction as a fallback.
- Timeline content is decrypted through Rust crypto and returned as plain data
  for escaped text rendering. Unencrypted injected room content is excluded;
  missing-key/untrusted-device failures have unavailable states. Decryption
  alone is insufficient: SDK authenticity shields must be clear before message
  content is exposed to the interface.
- Files and voice recordings, limited to 8 MiB, use the pinned Rust WASM
  `Attachment.encrypt/decrypt` implementation of Matrix v2 encrypted attachments.
  Ciphertext uploads omit the original filename. The descriptor, integrity hash,
  filename, MIME type and key travel inside the encrypted message. Downloads use
  authenticated Matrix media requests to the configured homeserver, with no key
  or access token in the URL. Integrity failures do not open a file. The UI must
  revoke temporary decrypted Blob URLs when closing media or changing accounts.
  Image previews check supported signatures; this is not a malware scanner.
- Drafts are account/device/room/thread scoped. The intended payload and stable
  transaction ID are durably encrypted before a send can reach the SDK. Failed
  sends survive refresh/unlock. A new Matrix access token cannot retry an old
  unconfirmed transaction: the original token is required because Matrix retry
  deduplication is session scoped. Conflicting payloads cannot reuse the ID.
- Pins use actual Matrix state permissions. Saved bookmarks keep an encrypted
  source reference rather than a plaintext copy; opening one checks current
  source membership, encryption and authenticity. Deleted/revoked sources are
  unavailable. Encrypted Matrix Saved validates a self-only private room and
  does not create one merely because an empty Saved screen was opened.
- Search starts with loaded decrypted history and can explicitly build a
  bounded, encrypted local index through SDK history pagination. It reports
  partial coverage/missing keys and does not upload plaintext. Thread-only
  history is excluded; reconnect invalidates a complete-coverage claim. The dedicated local Saved
  tool works without Matrix and states explicitly that its encrypted notes do
  not sync to other devices.
- Encrypted invitations have explicit list/preview/accept/decline/block APIs.
  A preview never joins. Acceptance requires advertised supported encryption,
  joins deliberately and rechecks the actual room algorithm and membership.
  Unconfirmed or plaintext rooms are not opened as protected. Leave and
  power-checked participant removal/cancellation use real membership actions.
  Existing-room invitations require confirmed joined-only history, so the SDK
  cannot silently share prior history through a stale Shared default. The
  application centralizes a 16-participant acceptance/send limit; another
  Matrix client is not governed by that application limit. Protected sends stay
  blocked while authoritative membership and encryption targets disagree.
  Matrix ignored-user settings are not a native-D1 block synchronizer and do
  not revoke an authorized group participant's keys.
- Device fingerprints, SDK SAS initiation/acceptance and revocation are exposed.
  Send failures identify the exact unresolved user/device without weakening
  verification. Revocation uses the supported homeserver sign-in challenge;
  an unsupported challenge remains an explicit resumable error.
- Recovery is a resumable sequence rather than a blanket refusal whenever a
  backup exists. Its encrypted local journal records acknowledged key material
  and completed stages until setup succeeds; it never uploads the recovery
  key to D1 or logs it. Existing secret stores, signing identities and backups
  are preserved. A failed public-signing-key upload is replayed with the SDK's
  public API using sanitized public keys, after checking for a changed server
  identity. An SDK-confirmed matching public projection also preserves retries
  interrupted before HTTP dispatch. Authentication/password fields never enter
  that journal.
- Automatic deletion of Matrix backup versions is blocked at the final HTTP
  boundary. This matters because the SDK's new-backup helper can delete
  existing versions internally; a concurrent existing backup must not be erased
  to clear a setup error. The adapter never calls a key/identity reset operation.
- `setupRecovery` reports not-started, key-acknowledged, secret-storage-ready,
  signing-identity-ready and backup-enabled stages. Backup readiness does not
  establish a successful restore. Only `restoreRecovery` records a verified
  recovery operation on this device, tied to the current key ID and backup
  version. That marker does not prove another physical device was tested.
- Disconnect locks locally and stops synchronization before awaiting the
  service. It returns confirmed, failed, unknown or not-requested remote
  revocation. The UI must not equate local locking with confirmed logout.
  Unknown/failed attempts can be retried after deliberately unlocking the
  encrypted enrollment envelope or from another trusted device; no raw-token
  retry queue is persisted. Local encrypted key stores are retained.

## Local storage boundary

`src/secure-vault.js` protects drafts, outbox payloads, upload descriptors and
the independent `src/local-saved.js` notes with browser WebCrypto. It is local
encryption at rest, not an invented messaging protocol. Independent local Saved
and advanced manual connection use a separate user-held passphrase of at least
16 characters. Native-account enrollment instead derives a client-only storage
secret from confirmed native credentials and a persistent random browser seed;
its exact design and password-change/recovery limits are in ENCRYPTED-SETUP.md.
The derived secret is never sent to the server or saved unencrypted. PBKDF2-HMAC-SHA256 with 600,000 iterations and a random
32-byte salt derives a nonextractable AES-256-GCM key. Each record gets a fresh
96-bit IV; its account namespace and record ID are authenticated as additional
data. An encrypted sentinel checks the passphrase before opening existing data.
Unsupported formats, incorrect passphrases, modified records and storage
failures fail without replacing existing records.

IndexedDB stores ciphertext plus version, KDF parameters, salt, record keys and
IVs. Record keys reveal local account/room identifiers and record counts to
someone who can inspect the browser profile. They do not contain message or
note text. Web Locks allow one active writer per vault namespace; writes are
ordered, with draft revisions reserved before asynchronous membership checks.
Locking drops the live key reference. JavaScript strings and unlocked UI content
cannot be guaranteed erased from memory; browser/XSS/extension compromise is
outside this at-rest boundary. A weak passphrase is vulnerable to offline
guessing. See [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
for the PBKDF2 work factor; native account password hashing is a separate server
implementation.

Local Saved has no automatic backup, sync, export or forgotten-passphrase
recovery. Losing its passphrase, clearing site data or losing the device loses
those notes. Matrix SDK recovery backs up messaging keys; it does not back up
this independent local vault. A server account password reset unlocks neither.

## Exact infrastructure setup

A production Matrix homeserver is required; the D1 database is not a Matrix
homeserver. Configure a maintained Synapse deployment or equivalent compatible
provider. The managed Sites Worker cannot itself host the long-running Synapse
process and its database/media storage. Run that service separately with TLS,
its own persistent database, backups, limits and private media configuration.

The exact supported Synapse configuration, namespace reservation, server-secret
keys, first-device checks, client unlock and operational responsibilities are
in [ENCRYPTED-SETUP.md](ENCRYPTED-SETUP.md). Merely setting a hostname is
insufficient: a compatible operated service, supported login flow, reserved
immutable-ID namespace and private server signing configuration are required.

Use two isolated account/device contexts for acceptance. Establish actual
verification trust, accept an in-app invitation and exchange messages in both
directions. Exercise encrypted media, refresh/unlock, source permissions,
interrupted setup after every persisted stage, signing-upload authentication,
backup reuse, device identity changes, group removal and confirmed/unknown
logout. Capture server-bound ciphertext and verify that distinctive test
plaintext is absent; SDK-boundary doubles are not a substitute.

Native sign-in continues without this provider. No Matrix homeserver was
configured when the upgrade was implemented. Encrypted-by-default product
readiness remains false until real-service device and policy acceptance passes.

## Remaining application engineering

The following are **not implemented merely by supplying credentials**:

- Private-community/channel permissions and native friend/block controls mapped
  to independent Matrix identities/spaces/rooms, and the existing D1 community
  service migrated to the encrypted transport.
- Complete private-search parity: the bounded encrypted local index does not
  include thread-only history. Old remote edits/redactions outside downloaded
  or synchronized history may remain cached until source refresh. Full-history
  device/performance acceptance is outstanding.
- Homeserver media retention and deletion administration. Redacting a message
  does not promise deletion of an uploaded object. Interrupted uploads can leave
  unreferenced ciphertext, and automatic cleanup requires homeserver controls.
  Upload descriptors and acknowledged receipts remain encrypted in the local
  vault; an automatic retention/compaction policy is not implemented.
- Cross-device conflict resolution for simultaneous creation of the Matrix Saved
  room or modifications to `m.direct`/pin account-state records. Calls within one
  unlocked device serialize Saved initialization, but Matrix state updates do
  not provide application-level compare-and-swap across devices. A newly created
  room may need to finish synchronizing before its first note can be sent.
- Encrypted thumbnails and rich quoted-message snapshots. Current image previews
  decrypt the original attachment locally; replies store references and display
  available source context without uploading plaintext previews.
- Full moderation reports, disappearing messages, encrypted notification
  configuration and integrated deletion/retention controls across the independent
  encrypted service.
- Voice/video signaling, STUN/TURN, a conferencing stack and verified media
  E2EE. Text encryption does not secure a nonexistent call transport.

These omissions remain engineering scope, not invented external blockers.
The current adapter also requires browser/homeserver integration testing and
independent review before making production assurance claims.

## Verification evidence

| Check | What actually ran | What it does not establish |
| --- | --- | --- |
| `backend/secure-messenger-test.mjs` | Controlled SDK/HTTP boundary tests for connection races, verification, plaintext guards, source permissions, draft ordering, retry identity, reconciliation, room/Saved permissions and attachment routing. Its media case invokes the actual Rust WASM attachment library. | A real homeserver, live synchronization, two users/devices, browser layout, Matrix message encryption or key-backup interoperability. |
| `backend/secure-lifecycle-test.mjs` | Controlled SDK lifecycle tests for invitation consent/security, membership powers, immediate local lock versus remote logout, interrupted recovery/backup reuse, sanitized signing-upload replay/UIA, identity change, key/version-bound restore status and final backup-delete protection. | Real homeserver behavior, UIA compatibility, physical-device trust, cross-device recovery or a protocol audit. |
| `backend/secure-media-test.mjs` | Actual pinned Rust WASM v2 attachment roundtrip and tampered-ciphertext rejection. | A deployed upload service, device trust, full message E2EE or an independent library audit. |
| `backend/secure-vault-test.mjs` | Real Node WebCrypto and `fake-indexeddb`: ciphertext persistence/reopen, wrong password, account/record AAD isolation, fresh IVs, tamper, failed write and lock. | A browser's quota/private-mode behavior, browser UI or device-level security. |
| `backend/local-saved-test.mjs` | The same real WebCrypto/storage adapter, including persistence, independent accounts, tags/search/pagination and exclusive-lock behavior. | Cloud synchronization or message delivery. |

The missing live service/device checks are a release limitation. A working
at-rest vault and attachment primitive are not evidence that two production
users successfully exchanged end-to-end encrypted messages.

## Protocol properties and limitations

Matrix's Rust crypto implements Olm/Megolm, not Signal or MLS. In particular,
Megolm has partial forward secrecy and no inherent post-compromise security
inside an already compromised session. Periodic new outbound sessions reduce
exposure but are not an unconditional healing guarantee. This adapter requests
rotation after 100 messages or 24 hours and refuses sends while authoritative
membership and cached encryption targets differ. The SDK processes member
changes and rotates outbound sessions; that behavior still needs a real
revocation test. Stored historical inbound sessions and backups preserve the
ability to decrypt history, with the corresponding compromise tradeoff.
[Protocol limitations](https://spec.matrix.org/latest/olm-megolm/megolm/#limitations).

Redactions and room membership/state contain public-to-service metadata.
Deletion asks other clients to remove displayed content; it cannot erase old
plaintext, backups or screenshots held by another person. No quantum resistance,
anonymity, screenshot prevention or audit of VOIDLINE is claimed.

## Alternatives evaluated

| Implementation | Current fit and evidence | Decision |
| --- | --- | --- |
| Official Signal `libsignal` | Signal-maintained Rust, AGPL-3.0; TypeScript/Node distribution uses native binaries. Upstream does not support use outside Signal. | Not a supported browser drop-in. |
| OpenMLS | MIT, maintained by Phoenix R&D/CE Labs; WASM target is built but not tested in documented CI, with experimental in-repo bindings. | Requires maintained browser application bindings and full lifecycle integration. |
| `ts-mls` | MIT browser/serverless TypeScript RFC 9420 candidate; current main 2.0.0-rc.16 explicitly unaudited. Requires app authentication service, protected state, delivery ordering and recovery integration. | Valid future MLS path; not installed or deployed here. |
| Matrix JS SDK + Rust crypto | Apache-2.0, maintained with Element sponsorship; browser SDK with existing device verification, secret storage and backup interfaces. | Selected complete messaging/crypto system, with the stated Megolm conditions and real homeserver dependency. |

Primary references: [Signal](https://github.com/signalapp/libsignal),
[OpenMLS](https://github.com/openmls/openmls),
[OpenMLS WASM bindings](https://github.com/openmls/openmls/tree/main/openmls-wasm),
[ts-mls](https://github.com/LukaJCB/ts-mls),
[ts-mls authentication service](https://github.com/LukaJCB/ts-mls/blob/main/docs/20-authentication-service.md),
[MLS architecture](https://www.rfc-editor.org/rfc/rfc9750.html),
[Matrix JS SDK](https://github.com/matrix-org/matrix-js-sdk),
[Matrix CryptoApi](https://matrix-org.github.io/matrix-js-sdk/interfaces/crypto-api.CryptoApi.html),
[maintained Rust WASM attachment API](https://matrix-org.github.io/matrix-sdk-crypto-wasm/classes/Attachment.html),
[Matrix encrypted attachment format](https://spec.matrix.org/latest/client-server-api/#sending-encrypted-attachments),
[Matrix client transactions](https://spec.matrix.org/latest/client-server-api/#transaction-identifiers).

## Maintained dependency check

The installed SDK remains pinned to 45.1.0. The maintainers' November 2026
[GHSA-jx97-gwvc-pfxx advisory](https://github.com/matrix-org/matrix-js-sdk/security/advisories/GHSA-jx97-gwvc-pfxx)
affects versions through 45.0.0 and identifies 45.1.0 as patched. The current
[release page](https://github.com/matrix-org/matrix-js-sdk/releases/tag/v45.1.0),
[CryptoApi reference](https://matrix-org.github.io/matrix-js-sdk/interfaces/crypto-api.CryptoApi.html),
pinned SDK source and [Matrix UIA fallback specification](https://spec.matrix.org/latest/client-server-api/#fallback)
were consulted for these changes. This check is not a claim that every
dependency or the completed integration has received an independent audit.


## v17 lifecycle additions

Native-password changes now stage an encrypted v2 credential envelope before
the server mutation and commit/abort/retain it according to the actual outcome.
A stable crypto-store password inside that envelope preserves existing Rust
keys; v1 devices migrate without changing their derived crypto-store key.
Explicit approved tab handoff flushes drafts and stops/releases the sole writer
before another tab can acquire it. No credentials cross BroadcastChannel.

A durable, leased Synapse admin operation queue covers verified account
suspension/deactivation and session-linked device revocation, with bounded
retries, safe errors and audit receipts. Native-community room mapping and
native blocks remain separate; no service is configured and readiness remains
false. These additions have controlled SDK/API and real WebCrypto/SQLite tests,
not physical-device or production E2EE acceptance. See ENCRYPTED-SETUP.md for
current official endpoints, review date, configuration and operating limits.
