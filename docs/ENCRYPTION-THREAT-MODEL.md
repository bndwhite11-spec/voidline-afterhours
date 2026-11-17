# Privacy boundary and device lifecycle

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

The new adapter encrypts Matrix text, contextual reply bodies, edit bodies and
its custom reaction content using the SDK. It never forwards those contents to
D1. Backend payload/ciphertext inspection against a real homeserver remains
untested. Redaction targets, room state/membership, event IDs and relation
metadata can remain visible to the Matrix service. Names and profiles are
metadata, not protected message bodies.

Shared file/media encryption, protected local search and durable encrypted
client drafts have not been implemented. Do not expose those as working private
features or send content through the older plaintext service as a fallback.
No automatic private content goes to GIF providers, previews, bots, AI,
translation, transcription, analytics or crash-recording services. The adapter
suppresses SDK logging and does not register a telemetry sink.

## Metadata and endpoint trust

The service and hosting providers may observe public account/device IDs,
routing, membership, timing, traffic sizes, session details and IP addresses.
Google sign-in is not anonymity. Public discovery must contain owner-approved
listing fields, never private history.

The intended content-encryption boundary is between participating devices and
the homeserver/storage operator. Device fingerprint verification is necessary
to detect key substitution. Google proves account login; it does not establish
Matrix device trust or derive decryption keys. An untrusted device must verify
with another trusted device or use recovery material before gaining history.

Delivered web code, the browser, extensions and unlocked devices are trusted
endpoints. Malicious application code or device compromise can read plaintext
while in use. CSP, pinned dependencies and restricted integrations reduce some
risks; they do not create an immunity guarantee. An authorized recipient can
retain downloads/screenshots or voluntarily disclose a report. The app cannot
promise to erase those copies.

## Implemented storage and session controls

Matrix access tokens and recovery material are held in memory. The Matrix SDK's
Rust crypto uses encrypted IndexedDB through `storagePassword`, scoped by the
Google account, configured homeserver, Matrix account and Matrix device. The
client also checks published own-device keys before allowing key upload,
preventing a newly created local store from overwriting the identity of an
already initialized Element/other client device. A fresh dedicated Matrix
device token is required for initial connection. The local vault passphrase is distinct from Google credentials and never saved.
Web Locks prevent concurrent writes to the same device store; unsupported
browsers fail closed. Timeline content uses memory storage, not localStorage.

Disconnect stops sync and clears listeners/in-memory identity before another
account is shown. When the shell detects Google session revocation during pre-send, focus or
periodic checks, it disconnects the local client. Detection is not instantaneous
and does not remotely revoke an independently issued Matrix access token. The
explicit Matrix logout action invalidates that Matrix session through the
homeserver. Revoking another Matrix device can require homeserver
reauthentication. Retained local crypto stores stay encrypted and require the
vault passphrase; deleting their only key copy is not automatic.

## Recovery and protocol conditions

The SDK creates a high-entropy recovery key. The user must acknowledge saving
it before initial backup setup. Its raw bytes are temporarily supplied to the
SDK's secret-storage callbacks and zeroed afterward; the service receives SDK
encrypted backup records. Existing signing identities or backups are not
silently replaced. The current UI/adapter uses the SDK's supported restore and
SAS/fingerprint APIs, but a real backup/restore run is still required.

Losing all trusted devices and the recovery material may make old history
unrecoverable. Resetting Google login does not recover Matrix message keys.
Backing up history preserves old decryption capability and changes what a
later compromise can reveal. Matrix's Megolm provides partial forward secrecy
and does not inherently provide post-compromise healing within a compromised
session; rotation/revocation conditions are documented in the decision file.

Membership removal blocks backend access and must stop key sharing to that
member. The adapter compares fresh joined membership with SDK encryption
targets and blocks a send when they disagree; the SDK owns membership rotation.
Nothing revokes plaintext or keys already received. A real removal test on an
already-connected second device remains outstanding.

## Verification evidence

`backend/secure-messenger-test.mjs` exercises the adapter with controlled SDK
responses: fail-closed plaintext/verification/key-change paths, encrypted-store
options, stable retries, final transport rejection of plaintext events,
private room creation, fingerprint mismatch, recovery acknowledgement and
account-switch/membership races. These checks validate integration boundaries,
not the cryptographic library itself, browser IndexedDB/WASM, live Matrix
behavior or a third-party security audit.

Required independent-device checks include actual ciphertext capture, forged
or changed identities, replay/tamper, key-loss and wrong recovery secret,
refresh/unlock, cross-account isolation, device removal during sync and
reauthentication. The deployment may report an unavailable state until the
required Google and Matrix configuration exists; it must never fabricate a
successful sign-in, encrypted exchange, device approval or recovery.
