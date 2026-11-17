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

- Explicit Matrix token connection validates `whoami`, including its Matrix
  user ID and device ID. A Voidline account and Matrix identity are separate;
  matching email addresses never link them or grant decryption access.
- Tokens remain in memory. Rust crypto IndexedDB uses an account/homeserver/
  Matrix-user/device namespace and SDK `storagePassword` encryption. A local
  vault passphrase of at least 16 characters is required and is not saved.
  Web Locks enforce one active writer for the encrypted device store.
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
- Search filters only loaded, decrypted history on this device. It does not
  upload plaintext or claim to cover unloaded history. The dedicated local Saved
  tool works without Matrix and states explicitly that its encrypted notes do
  not sync to other devices.
- Device fingerprints, exact fingerprint comparison, SDK SAS requests and
  confirmation callbacks are exposed. Reauthentication may be required by the
  homeserver for device deletion and signing-key upload.
- New recovery setup uses the SDK's random recovery key, waits for the user's
  saved-key acknowledgement, then invokes SDK secret storage, cross-signing and
  key backup. Existing identities/backups are never silently reset. Recovery
  uses the user-provided Matrix recovery key in memory and clears it afterward.
- Disconnect stops sync, clears listeners, pending UI verification, in-memory
  token/client references and secret handles. Explicit Matrix session logout is
  separate from account logout. Encrypted local keys are retained for deliberate
  reopening with the vault passphrase, not deleted automatically.

## Local storage boundary

`src/secure-vault.js` protects drafts, outbox payloads, upload descriptors and
the independent `src/local-saved.js` notes with browser WebCrypto. It is local
encryption at rest, not an invented messaging protocol. A user enters a separate
passphrase of at least 16 characters; it is never populated from account login,
saved or sent to a server. PBKDF2-HMAC-SHA256 with 600,000 iterations and a random
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

1. Choose a trusted HTTPS origin such as `https://matrix.your-domain.example`.
   Verify `/_matrix/client/versions`, authenticated `whoami`, `/sync`, device/key,
   secret-storage and key-backup APIs. Allow browser CORS requests from the
   VOIDLINE origin. Keep administrative endpoints and provisioning secrets out
   of the browser and source repository.
2. Set the Site's `MATRIX_HOMESERVER` runtime value to that origin. It is public
   configuration, not an access token. Never put a Matrix admin token there.
3. Create two isolated Matrix users for verification. A token used in VOIDLINE
   must come from a **fresh dedicated Matrix login/device**, not the active
   token copied from Element or another already initialized client. For a
   password-enabled homeserver, POST `/_matrix/client/v3/login` with the
   `m.login.password` flow and a fresh device display name; omit `device_id` so
   the homeserver allocates a new one. For SSO-only deployments, provisioning
   requires the provider's supported login-token flow; automatic SSO token
   exchange is not yet part of this UI. Never reuse another client's device.
   The adapter compares published own-device keys against the unlocked local
   device and blocks mismatches before key upload or synchronization.
   Reopening the same encrypted store requires the same account/device identity
   and local vault passphrase. Creating a fresh Matrix device must not reuse a
   different device's crypto store.
4. The present connection UI accepts a user-supplied Matrix access token in
   memory. It does not implement automatic account-to-Matrix token issuance.
   Synapse may be configured with Google OIDC as a separate provider operation;
   that alone does not add a tested token exchange flow to this client.
   [Synapse OIDC documentation](https://element-hq.github.io/synapse/latest/openid.html)
5. Establish device trust and save the recovery key before testing sends.
   Verify comparisons on the actual other device using a separate trusted
   channel. Never compare two values supplied only by the same server page.
6. Test both directions across independent browser/device contexts: initial
   message and encrypted media, refresh/unlock, reply/edit, retry after lost response, fingerprint
   change, untrusted new device, membership removal during an open connection,
   session revocation and restore using the saved recovery material.

Native username/password accounts require no OAuth configuration. The Matrix
service and real device exchange must still be verified independently. No
Matrix homeserver was configured when this upgrade was inspected.

## Remaining application engineering

The following are **not implemented merely by supplying credentials**:

- Private-community/channel permissions and native friend/block controls mapped
  to independent Matrix identities/spaces/rooms, and the existing D1 community
  service migrated to the encrypted transport.
- A protected full-history search index. Current search honestly covers loaded
  decrypted messages only; drafts/outbox are already encrypted and persistent.
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
