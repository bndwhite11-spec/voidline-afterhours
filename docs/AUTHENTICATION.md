# Authentication and identity

The Worker uses D1 for immutable account IDs, provider mappings, native
credentials and server-managed sessions. Usernames and display names are public
profile fields, never authority. `@xrp` identifies the intended owner; ownership
is not granted until the infrastructure-backed procedure in
[OWNER-BOOTSTRAP.md](OWNER-BOOTSTRAP.md) binds a verified account ID. A community
owner cannot administer the platform.

## Native accounts

Password registration requires a verified private address. POST /api/auth/register/email delivers a ten-minute fragment link through Resend. Migration 0013 keeps its digest, address and expiry separate from account records. The password is chosen after opening the link. A transaction creates the immutable account, credential, verified private address and session while consuming all outstanding proofs for the mailbox. Token replay, concurrent signup, and uniqueness conflicts cannot create additional accounts. A delivery failure invalidates that token. Usernames use NFKC, lowercase and a
unique database constraint: 3–24 ASCII letters, numbers or underscores, starting
with a letter. Reserved staff/system terms are rejected. Display names remain
separate. New accounts receive no memberships, messages, contacts, fabricated
notifications, earned badges or gifts.

Before presenting the password form for a `#signup-email=` link, the client posts
`{emailToken}` to `/api/auth/register/email/inspect`. This read-only check returns
the verified private address and expiry only for a live challenge. Unknown,
expired and consumed links return `invalid_signup_link`; inspection does not
consume the proof or create an account/session. Previously delivered links can
still be inspected if the mail service later becomes unavailable. The route
requires the exact app Origin, JSON, the app request header and rate limits.

Passwords accept 12–128 characters, allow password managers and pasting, and are
hashed server-side using pinned `@noble/hashes` Argon2id v19. The stored algorithm
is `argon2id-v19-m19456-t2-p1`: 19 MiB memory, two passes, one lane, a fresh random
32-byte salt and a 32-byte output. These are OWASP's current minimum Argon2id
parameters. Only exact known stored algorithms select work factors. Existing
100,000-iteration PBKDF2 records are verified with WebCrypto and upgraded after a
successful login using a credential-version compare-and-swap. IDs, membership
and history remain intact. No fast-hash password fallback is used.

Each isolate admits up to two simultaneous Argon2 operations (38 MiB of Argon2
working memory total). Each hash runs in the request that submitted it. An
overlapping request beyond this limit receives HTTP 503 with a one-second
Retry-After before account or credential writes. A Node measurement in the execution
workspace took approximately 376 ms and increased RSS by approximately 28 MiB.
An isolated Wrangler/workerd request also completed the exact hash in 367 ms
(HTTP 200). This proves local Worker compatibility, not a hosted CPU allowance
or production load capacity. The bundle uses no native Node addon. A free Worker
10-ms CPU allowance is insufficient; confirm the actual Sites runtime budget
by creating an isolated account after release. Use a sufficiently provisioned
Worker or a compatible maintained authentication service if the hosted limit
rejects the real hash. Do not reduce the password parameters to hide a failure.

Native login uses verified email. Users with older password accounts without a verified address retain username login and the existing saved recovery code. Verifying an address disables username sign-in, revokes other local sessions, queues messaging session cleanup and invalidates outstanding reset and verification tokens for that account. The current device stays signed in. Changing an email does not re-encrypt local history or change the password.
Generic credential errors avoid identifying private accounts. Authentication,
recovery, signup and sensitive actions have bounded per-IP and/or per-account
rate limits. The edge-derived IP is hashed into short-lived rate buckets; this
is not an IP-grabber feature.

## Optional Google OpenID Connect

Google is shown only when the backend reports it configured. Native account
creation and login remain available when Google is unconfigured. Set server
secrets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and the exact HTTPS
`VOIDLINE_ORIGIN`. Create a Google OAuth **Web application** client and authorize
this exact callback:

```
https://YOUR-APP-ORIGIN/api/auth/google/callback
```

Configure the Google consent screen and test users or production publishing as
required by Google. Add the authorized origin in Google's client configuration.
The Worker uses the authorization-code flow, browser-bound one-use state,
nonce and S256 PKCE. It exchanges the code server-side and verifies RS256
signature, issuer, audience, authorized party, expiration, subject and nonce
using `jose` and Google's current JWKS. Redirect targets are constrained to the
app. Explicit provider reauthentication requests `max_age=0` and requires a
fresh `auth_time` before sensitive actions.

A verified Google subject maps to an internal account ID. An email match never
links another account. Google users choose a public username and display name;
Google full name, email and photograph are not published automatically. A
new Google account requires a verified provider address that is available for that account. Existing provider identities retain their immutable account IDs. Google-only users can reauthenticate with Google and set a
native password, which produces a saved recovery code and rotates sessions.
There is no unauthenticated provider-linking endpoint.

## Email verification and password recovery

New password accounts require a verified email. Configure **server secrets**
`RESEND_API_KEY`, `EMAIL_FROM` and the exact HTTPS `VOIDLINE_ORIGIN` for signup, address changes and verified-email recovery. Verify the sending domain in Resend, configure its
required DNS records and use an allowed sender. The Worker sends through
Resend's HTTPS API; it does not expose a browser mail credential. A verification
request requires recent authentication, and an owner recovery-address change
also requires recent user-verifying passkey proof.

A 256-bit random verification/reset token is delivered only through the actual
provider. D1 stores its SHA-256 hash. Links carry the raw token in the URL
fragment rather than the server request path/query. Tokens expire after ten
minutes, are account/purpose bound and are consumed atomically once. A unique
consumption marker prevents simultaneous requests at the same timestamp from
reusing a token. Changing a password invalidates outstanding reset links. A
reset only works while the target still has that verified address and an active
account. Verification never joins accounts with matching email addresses.

When email is unconfigured, requests return an explicit unavailable response;
no fake delivery, verification or token is shown. Public reset requests return
a generic acknowledgement for known and unknown accounts when mail is
configured. A provider acknowledgement means it accepted the message, not that
the recipient read or received it. Passwords and their hashes are never emailed
or exposed. An admin can request the same legitimate reset for an eligible
verified address without receiving its address or token.

Registration also shows a random 256-bit **offline recovery code** once. Save
it in a password manager. This explicit possession factor is not an email link,
verified identity claim or message-encryption backup. Its account-bound hash is
stored; use consumes and replaces it, changes the password and revokes earlier
sessions. It is deliberately longer lived than a reset challenge. If a user
loses every authentication method, the recovery code and a verified recovery
channel, this app cannot recover the account automatically.

## Sessions, passkeys and owner access

Opaque 256-bit session bearers use `__Host-` Secure, HttpOnly, SameSite=Lax
cookies, expire after seven days and are stored only as hashes in D1. Login
rotates the browser session. Logout, credential replacement, explicit device
revocation and suspension invalidate server access. Every authentication check
joins current account lifecycle state. Password mutations use conditional
credential versions, active-account/session checks and D1 transactions so a
concurrent recovery, revocation or suspension cannot issue a successful stale
login. Public profile status text is separate from `account_status`.

Preauthentication writes require JSON, the exact Origin and
`x-voidline-auth: 1`. Signed-in writes additionally require a session-bound CSRF
token and expected immutable account ID. Session/device management exposes only
own session metadata. A password-confirmation receipt expires in ten minutes.
Credentials, recovery factors and session bearers must not enter browser
localStorage, analytics, public profiles or exports.

Passkeys use pinned `@simplewebauthn/server` with browser WebAuthn. Credential
private keys remain in the authenticator; D1 stores public keys, counters,
credential IDs and device labels. Enrollment requires recent authentication.
Challenges expire after five minutes, are one-use and bind to account, session,
origin, relying-party ID and purpose. Verification checks the real signature,
origin, RPID, challenge and required user presence/verification, and rejects
cross-origin embedding. Assertion counters use compare-and-swap updates.

Passkeys currently provide **signed-in step-up**, not a standalone passkey login
or a messaging-device encryption identity. Owner administration requires a
password/provider authentication receipt within ten minutes plus a
user-verifying passkey assertion within five minutes. A recovered password
starts with MFA proof zero. Adding another owner key requires fresh proof from
an existing key. Removing keys clears all MFA receipts, and an atomic database
condition prevents concurrent removals from deleting the owner's final key.
Public account deletion refuses a bound platform owner.

Enroll at least two owner passkeys kept separately, and retain the offline code
privately. Lost final owner keys require trusted infrastructure administration:
verify the immutable owner record and out-of-band ownership, back up the DB,
revoke sessions, replace only the verified account's lost key material through
an audited maintenance procedure and reenroll on a controlled session. Neither
a display-name change, ordinary password reset nor a support dashboard bypasses
owner MFA. See OWNER-BOOTSTRAP.md for the exact bootstrap procedure.

## Data and security boundaries

Migration `0006_hard_tombstone.sql` adds lifecycle state, passkeys, email tokens,
owner records/audit, organization and collectible records without deleting or
reassigning earlier accounts, histories or memberships. Existing migrations are
unchanged. Account deletion clears private auth/organization data and public
profile fields, cancels pending transfers and tombstones the account. Shared
history and legitimate collectible provenance retain an anonymized ID. Platform
owner deletion and deletion while owning a community are blocked.

HTTPS protects network traffic. Password hashing protects password verification
records. D1 storage protection is an infrastructure property; it is not
end-to-end message encryption. Provider and email services observe the necessary
authentication/delivery metadata. The app server observes account, session and
membership metadata. Neither resetting a Voidline password nor an admin action
restores independently held messaging encryption keys. See
[ENCRYPTION-DECISION.md](ENCRYPTION-DECISION.md) and
[ENCRYPTION-THREAT-MODEL.md](ENCRYPTION-THREAT-MODEL.md).

## Verification and limits

- `node backend/auth-test.mjs`: 17 handler/SQLite checks, real password derivation,
  empty account, collisions, CSRF, sessions, recovery, deletion and expiry.
- `node backend/auth-hardening-test.mjs`: 12 checks with real Argon2id, signed JWTs
  and migrated SQLite; legacy migration, lifecycle enforcement, OIDC identity
  isolation, verified-email privacy, token expiration/reuse and reset races.
- `node backend/passkeys-test.mjs`: 5 checks using the maintained real verifier
  and generated P-256 authenticator signatures; registration/assertion, invalid
  proof, challenge expiry/replay and owner final-key protection.

The Google code exchange and Resend delivery are mocked in those isolated
tests. They do not prove real provider configuration, physical authenticator
behavior, browser rendering, production CPU limits or verified owner binding.
Complete an actual Google callback, delivery and hardware/passkey browser test
only after the corresponding configuration is present. No secrets belong in
this document or the repository.

Official documentation consulted on 2026-11-17:

- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://developers.google.com/identity/openid-connect/openid-connect
- https://simplewebauthn.dev/docs/packages/server
- https://github.com/paulmillr/noble-hashes#argon2
- https://developers.cloudflare.com/workers/platform/limits/
- https://resend.com/docs/api-reference/emails/send-email
