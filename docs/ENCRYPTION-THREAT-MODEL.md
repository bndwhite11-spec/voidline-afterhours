# Privacy boundary and device lifecycle

Built-in Standard messaging is a separate, explicitly consented server-stored
text mode. It needs no Matrix identity and is not E2EE. Nothing in this document
labels those D1 conversations encrypted or permits protected Matrix content to
fall back to them. See NATIVE-MESSAGING.md for that mode and its retention rules.

This is the threat model for the selected Matrix integration and its current
limits. It is not an independent security review. See ENCRYPTION-DECISION.md for
implemented code, setup, protocol limitations and remaining engineering.

## Existing data

The previous v7 Worker stored message text in D1, while its local archive used
plaintext browser storage. Those were access-controlled legacy records, not
end-to-end encrypted records. Preserve genuine data without relabelling it or
silently uploading local archives/drafts. A redesigned empty account is not a
reason to destroy older records. The new encrypted transport is a distinct
choice and does not automatically encrypt historical D1/local records.

## Protected content and observed limits

The new adapter encrypts Matrix text, reply/thread content, edit bodies, Saved
notes/bookmarks and custom reaction content using the SDK. It never forwards
those contents to D1. Attachment bytes and voice recordings use the maintained
Rust v2 attachment implementation; keys and file metadata are inside encrypted
messages. Backend payload/ciphertext inspection against a real homeserver
remains untested. Redaction targets, room state/membership, event IDs and relation
metadata can remain visible to the Matrix service. Names and profiles are
metadata, not protected message bodies. Pins expose source event IDs as room
state, with permission checks; they do not expose a universal content key.

Search runs over loaded decrypted messages in memory; it has no full-history
index and sends no plaintext query/content to the service. Saved source links
recheck authoritative current membership before revealing cached history and
show unavailable states after access loss. They do not preserve a plaintext copy
that bypasses source permissions. Existing participants may still possess old
keys or their own copies; access revocation cannot make them forget history.
No automatic private content goes to GIF providers, previews, bots, AI,
translation, transcription, analytics or crash-recording services. The adapter
suppresses SDK logging and does not register a telemetry sink.

## Metadata and endpoint trust

The service and hosting providers may observe public account/device IDs,
routing, membership, timing, traffic sizes, session details and IP addresses.
Voidline sign-in is not anonymity. Public discovery must contain owner-approved
listing fields, never private history.

The intended content-encryption boundary is between participating devices and
the homeserver/storage operator. Device fingerprint verification is necessary
to detect key substitution. The account service verifies login; it does not establish
Matrix device trust or derive decryption keys. An untrusted device must verify
with another trusted device or use recovery material before gaining history.

Delivered web code, the browser, extensions and unlocked devices are trusted
endpoints. Malicious application code or device compromise can read plaintext
while in use. CSP, pinned dependencies and restricted integrations reduce some
risks; they do not create an immunity guarantee. An authorized recipient can
retain downloads/screenshots or voluntarily disclose a report. The app cannot
promise to erase those copies.

HTTPS protects traffic between a client and its chosen endpoint. It does not
make server-readable native D1 messages end-to-end encrypted. Local encrypted
vaults protect stored browser records while locked. They are separate from
password hashing, server-provider disk encryption and Matrix message encryption.
The D1/Matrix operators still need their own protected databases, backups and
restore procedures; this document makes no blanket claim about their disks.

## Implemented storage and session controls

Native enrollment maps the immutable native account to a reserved Matrix ID
through the configured server-side supported login flow. This is authentication,
not message-key recovery or cryptographic verification. Operator namespace and
provider requirements are in ENCRYPTED-SETUP.md; absent configuration stays
unavailable. No email/display-name match grants another Matrix identity.

While unlocked, Matrix access tokens and usable recovery material exist in
memory. Native enrollment can retain a token only in its authenticated-encrypted
local vault, unlocked through the client-derived native-password/device-seed
secret. The seed is public salt material, not an encryption key. A password
change/reset does not make an older encrypted token/key store decryptable; it
requires deliberate recovery/fresh-device handling. Advanced manual-token
connection keeps its token in memory only. The Matrix SDK's Rust crypto uses
encrypted IndexedDB through `storagePassword`, scoped by native account,
homeserver, Matrix account and device. Published own-device keys are checked
before upload, blocking reuse of another initialized client's device identity.
Web Locks prevent concurrent writes to the same device store; unsupported
browsers fail closed. Timeline content uses memory storage, not localStorage.

Drafts, intended outbox payloads, upload descriptors and local Saved notes use
the account-scoped IndexedDB vault in `src/secure-vault.js`. A user-held or client-derived
unlock secret derives a nonextractable AES-256-GCM key using PBKDF2-HMAC-SHA256,
600,000 iterations and a random 256-bit salt. Every write uses a fresh 96-bit IV
and authenticates its namespace and record ID. Stored salt/parameters and record
identifiers reveal local metadata; contents remain ciphertext. An attacker with
the browser profile can attempt offline passphrase guesses. This mechanism does
not stop malicious running application code or protect an unlocked device.
The passphrase and key are not saved; locking removes the active key reference,
but cannot guarantee erasure of immutable JavaScript strings from memory.

Writes are ordered. Per-thread draft revision checks reject delayed earlier
inputs; failed durable outbox writes block network transmission. A transaction
ID binds one payload and one Matrix token session. Retries under a new token are
blocked instead of risking duplicate delivery. Concurrent attachment retries
share one ciphertext/upload descriptor. Acknowledged receipts omit original
content, while upload descriptors and receipts currently remain encrypted until
site data is cleared. No automatic encrypted-record compaction exists yet.

Media requests keep access tokens in Authorization headers, omit URL keys,
disable redirects and enforce size limits. Preview Blob URLs hold decrypted
data and must be revoked by the shell on close/navigation/logout. Downloaded
files become the user's own local copies. Cancelling an upload can leave
unreferenced ciphertext at the homeserver; redaction is not guaranteed media
purging. There is no automatic third-party thumbnail or transcription service.

Disconnect stops sync and clears listeners/in-memory identity before another
account is shown. When the shell detects account session revocation during pre-send, focus or
periodic checks, it disconnects the local client. Detection is not instantaneous
and does not remotely revoke an independently issued Matrix access token. The
explicit Matrix logout action requests revocation from the homeserver and
returns confirmed, failed or unknown. Local locking happens immediately; a
failed request is never reported as successful remote revocation. A stopped
client cannot issue logout through its now-invalid device guard, so a dedicated
origin/action-restricted SDK client revokes only the previous token. No token
is placed in an ordinary-storage retry queue. Revoking another Matrix device can require homeserver
reauthentication. Retained local crypto stores stay encrypted and require the
vault passphrase; deleting their only key copy is not automatic.

## Recovery and protocol conditions

The SDK creates a high-entropy recovery key. The user must acknowledge saving
it before publishing initial secret storage. Until setup completes, the current
device retains a resumable journal inside its authenticated-encrypted local
vault, including that key and its actual key-ID/stage. It is not sent to D1 or
another application server. The journal is removed when setup or a verified
restore completes; transient byte arrays are cleared afterward. This is
intentional local persistence rather than a claim that all recovery material
is always memory-only. A compromised unlocked client can read it.

Setup inspects existing secret storage, signing state and backup state. It
fills missing authorized steps and does not replace an existing identity or
backup to remove an error. Pending public signing-key requests retain only
public key payloads, never UIA credentials. A fresh server key query rejects
an intervening different signing identity before replay. The public Matrix
API does not provide an application-wide cross-device compare-and-swap; real
concurrent-device setup still requires service-level acceptance testing.

The final HTTP boundary blocks backup-version DELETE requests even if the
SDK internally attempts them during new-backup setup. Existing/default key
changes require the current matching recovery key; unsupported or mismatched
states fail without a reset. Setup and restore cannot overlap on the device.
SSO UIA fallback URLs stay on the configured homeserver; unsupported sign-in
challenges preserve resumable state and report an error.

Backup-enabled is distinct from recovery-verified. A successful SDK restore
sets a local verification marker bound to its current secret-storage key ID
and backup version; a later change invalidates that marker. This records only
that operation on this device, not proof of a second physical-device exercise.
Real secret-storage, signing-upload, interruption and backup-restore tests
against the selected homeserver remain required.

Losing all trusted devices and the recovery material may make old history
unrecoverable. Resetting Voidline login does not recover Matrix message keys.
Backing up history preserves old decryption capability and changes what a
later compromise can reveal. Matrix's Megolm provides partial forward secrecy
and does not inherently provide post-compromise healing within a compromised
session; rotation/revocation conditions are documented in the decision file.

The independent local Saved vault does not sync or participate in Matrix key
backup. Losing its passphrase or browser data loses those notes. Matrix key
recovery does not recover them, and recovering account login does not recover
either category of encryption keys. The interface must explain these separate
recovery boundaries before a user stores information.

Membership removal blocks backend access and must stop key sharing to that
member. The adapter compares fresh joined membership with SDK encryption
targets and blocks a send when they disagree; the SDK owns membership rotation.
Nothing revokes plaintext or keys already received. A real removal test on an
already-connected second device remains outstanding.

## Verification evidence

`backend/secure-messenger-test.mjs` exercises the adapter with controlled SDK
responses: fail-closed plaintext/verification/key-change paths, encrypted-store
options, stable and concurrent retries, final transport rejection of plaintext
events, private-room/Saved permissions, authenticated edit reconciliation,
fingerprint mismatch, recovery acknowledgement and account-switch/membership
races. Its media case invokes actual Rust attachment encryption while mocking
network transport. These checks validate integration boundaries; they are not
live Matrix synchronization or full message-encryption/device interoperability.

`backend/secure-media-test.mjs` runs actual pinned Rust WASM attachment roundtrip
and integrity-rejection checks. `backend/secure-vault-test.mjs` and
`backend/local-saved-test.mjs` use actual WebCrypto with `fake-indexeddb` to check
encrypted persistence, wrong-secret/tamper handling, namespace isolation,
ordered writes, storage failures and locks. These are not browser layout,
browser storage-quota, real-device, two-account or independent-audit evidence.

Required independent-device checks include actual ciphertext capture, forged
or changed identities, replay/tamper, key-loss and wrong recovery secret,
refresh/unlock, cross-account isolation, device removal during sync and
reauthentication. The deployment may report an unavailable state until the
required Matrix configuration exists; it must never fabricate a
successful sign-in, encrypted exchange, device approval or recovery.

`backend/secure-lifecycle-test.mjs` adds controlled SDK-boundary regression
coverage for the new invitation, membership, revocation and resumable-recovery
paths, including the failed public-key upload scenario and forbidden backup
deletion. It does not establish actual Synapse/JWT UIA interoperability or a
successful multi-device encrypted journey.

Encrypted invitation previews do not join or establish verified identity.
Acceptance checks both advertised and joined room encryption; unsupported
rooms are not opened as protected. Existing-room invitations require the actual
and cached joined-only history policy before the SDK invitation helper runs.
Matrix ignored-user preferences suppress those invitations but do not silently
revoke group membership. Participant removal/cancellation checks current room
power; server authorization remains authoritative. The VOIDLINE adapter limits
accepted/sending groups to 16 participants; unrelated Matrix clients can still
operate according to the homeserver's own policies.
