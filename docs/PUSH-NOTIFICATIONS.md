# Optional browser notifications

`worker/notifications.mjs` uses pinned `@block65/webcrypto-web-push` 2.0.0 for
RFC8291 aes128gcm payload encryption and RFC8292 VAPID. It runs through WebCrypto
in the Worker. It does not implement a new messaging cipher. Messages are
padded by the maintained library. Push-provider acceptance is not device display,
recipient delivery of a message or a read receipt.

## Explicit device opt-in

Opening settings never requests permission. The user chooses Enable, the client
checks configuration, requests browser permission, registers `/push-worker.js`,
creates a real PushManager subscription and saves it through an authenticated
API. Unsupported browsers and denied permission have visible states. A preview
frame may prohibit the browser permission prompt; open the app in a browser tab.

Settings and async permission results are account- and dialog-scoped. They do
not replace a newer profile editor. Repeated clicks coalesce. Disable first
requires confirmation from the browser's unsubscribe operation, then removes
server subscription records. Offline server cleanup is reported separately.

The service worker handles push/click only. It has no fetch handler and never
caches credentials, API responses, messages or decrypted media. Click targets
are sanitized again to same-origin application hash routes.

## Privacy and authorization

Payloads contain only fixed generic activity text, an authorized route and an
event tag. They never include message bodies, usernames, recovery material or
filenames. Native in-app preview preferences can be richer; push remains generic.
Encrypted Matrix pushes require separate service integration and are not implied
by native push support.

Subscription endpoints and p256dh/auth keys are private operational records.
Responses expose only the caller's session subscription IDs and public VAPID
key. HTTPS endpoint hosts are restricted to supported browser push services;
private/arbitrary URLs, credentials and malformed keys are rejected. Cookies,
origin, CSRF, expected account and rate limits protect mutations.

A subscription belongs to a native account and session. Logout, expiration,
suspension, unsubscribe, changed membership, read state, mute, quiet hours and
personal blocks are checked before dispatch. A final check follows asynchronous
payload encryption and verifies the actual subscription row and keys again.
A provider request already dispatched cannot be retracted by a subsequent logout
or block. Generic payloads limit disclosure from already queued notifications.

Quiet hours use the chosen IANA time zone; legacy preferences default to UTC.
Malformed ranges/zones fail closed. Direct messages, community activity,
immutable mentions, replies, friend requests and gifts follow their applicable
preferences and current access. Personal blocks suppress sender notifications
without freezing an unrelated shared group's conversation.

## Durable queue and retry meaning

Database triggers create content-free events for new native/community messages,
friend requests and gift grants. Retrying a message does not create a duplicate
event. They contain source IDs and routing metadata, not copied message text.

An authenticated successful app API response schedules bounded background work.
It atomically fans out unique event/subscription delivery records. Processing
skips activity predating the active subscription, including session renewal.
Every delivery rechecks source authorization. Concurrent workers claim a lease
before submitting encrypted bytes. HTTP201/202 records provider acceptance;
404/410 removes the expired subscription; 429/5xx/transport failure backs off.
Five unsuccessful attempts become terminal rather than pretending to retry
forever. Processed event/delivery metadata is pruned after seven days.

An independently callable, operator-restricted Site MCP runner now exposes
`process_queues`; see OPERATIONS.md for its authenticated boundary and linked
scheduler setup. Its source alone does not establish a connected scheduler or
a successful unattended run. Until a verified schedule is installed, pending
retries resume on later authenticated app traffic and a fully idle service can
delay them. A provider accepting a request before the Worker loses its acknowledgment can
still result in another transport attempt. Stable notification tags allow the
browser to replace repeated presentation, but exactly-once device display is
not promised. Operational scheduling is a separate deployment capability.

## Configuration

Set these only in the server runtime configuration:

- `VAPID_PUBLIC_KEY`: base64url uncompressed P-256 public key, intentionally
  returned to authenticated browser clients.
- `VAPID_PRIVATE_KEY`: corresponding private scalar, stored as a server secret.
- `VAPID_SUBJECT`: an HTTPS operator contact/help URL.

Generate cryptographically random keys through trusted operator tooling. Never
put the private key in Git, source downloads, browser bundles, logs or chats.
Changing the key pair requires browser re-subscription. Environment changes
need deployment of the matching Worker version. The release report records
whether the live configuration was applied; a placeholder does not enable push.

Google, email and Matrix configuration are independent. Browser push needs no
Matrix server, payment feature or notification text disclosure.

## Proof and remaining acceptance

`backend/notifications-test.mjs` runs actual HTTP handlers and migrated SQLite,
real generated P-256 credentials, VAPID signature verification and an actual
RFC8291 decrypt/tamper roundtrip. It tests endpoint restrictions, permissions,
opt-out/revocation races, suppression, idempotency, backfill, expired endpoints
and retry exhaustion. Provider transport is controlled.

`tests/voidline-notifications-test.cjs` exercises permission/subscription/dialog
logic and the actual service-worker code with controlled browser interfaces.
Those checks do not establish permission behavior in a real browser or receipt
from FCM, Mozilla or Apple. A real opted-in browser must still receive a test,
exercise background delivery, disable/revoke, and verify quiet hours and
mobile/platform-specific behavior before those acceptance items are complete.
