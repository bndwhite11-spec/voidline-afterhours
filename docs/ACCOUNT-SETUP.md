# Voidline accounts

Account creation and login now use a Voidline username and password. They work
with the Site's existing D1 database and do not require an external identity
provider, email address, phone number or OAuth credentials.

## Registration and login

Choose a unique username, display name and a password of 12–128 characters.
Usernames are normalized with NFKC and lowercase, contain 3–24 ASCII letters,
digits or underscores, and start with a letter. System/staff names are reserved.
The display name remains separate from the stable account ID used for access
control. New accounts have no memberships, conversations, friend requests,
gifts, owned cosmetics, bookmarks or unread activity. They are never enrolled
in a sample community. Account creation also creates a real browser session.

Successful registration shows a random 256-bit account recovery code once.
Save it in a password manager or another private place. Only an account-bound
SHA-256 hash of the code is stored. It is not an email-reset link or a message
key. A valid recovery code can reset the password; it is consumed and replaced
with a fresh code, and previous sessions are revoked. Changing a password also
rotates the recovery code and revokes earlier sessions. The UI must show the
new code. There is no email-based recovery service. If both password and code
are lost, this implementation cannot recover that account for the user.

No password, recovery code, session bearer or private messaging material should
be stored in browser localStorage or sessionStorage by account forms. Passwords
and recovery codes are cleared from form fields after successful operations.

## Server controls

Passwords use WebCrypto PBKDF2-HMAC-SHA256 with a fresh random 256-bit salt and a
256-bit derived value. The work factor is 100,000 iterations, the supported
Cloudflare Workers PBKDF2 limit. This is a deployment constraint, not a claim
that it meets a stronger memory-hard-password recommendation. The record stores
the algorithm/work factor for a future migration. Password length/common-value
checks and bounded per-IP plus per-username authentication attempts complement
the derivation cost. Unknown-user login performs the same derivation rather
than immediately revealing whether a credential exists.

The API rejects missing/foreign Origin, non-JSON requests and missing
`x-voidline-auth: 1` for registration, login and recovery. Cookies use random
opaque 256-bit bearers with Secure, HttpOnly, Path=/ and SameSite=Lax; only their
SHA-256 hashes are in D1. Sessions expire after seven days. Sign-in rotates the
browser's previous session. Authenticated mutations additionally require the
expected account ID and a session-bound CSRF token. Sensitive session revocation
requires a password-confirmed authentication within ten minutes.

Password/recovery operations use conditional credential versions and D1 batches.
A delayed old-password login cannot create a new session after a recovery/reset.
A delayed password change cannot overwrite a newer recovery operation. Recovery
codes can be consumed once, including when requests race. No code paths accept
frontend booleans or public usernames as proof of identity.

## Existing data

Migration `0005_next_magik.sql` only adds credential, social and cosmetic tables.
Existing accounts, provider rows, histories, memberships and IDs remain intact.
Retired Google routes return 410. Existing browser sessions are not re-keyed to
another account. Matching a username or email does not claim an old identity.
An old provider account without native credentials needs an explicit proof-based
migration; it is not silently linked to a newly registered account.

Deleting an account requires its password and is blocked while it owns a server.
Transfer ownership first. The endpoint revokes its sessions, erases native
credentials, social/private collection metadata and provider mappings, clears
its public profile and removes memberships. Historical shared messages retain
an anonymized author ID rather than breaking references. Retained session audit
rows remain revoked. Independent Matrix accounts are not deleted by this action.

## Messaging is separate

A Voidline account password does not derive, restore or transmit Matrix message
keys. The optional encrypted messaging service still needs a configured
`MATRIX_HOMESERVER` and independently verified devices. The existing protection
against silently sending private content to the legacy plaintext API remains.
See ENCRYPTION-DECISION.md and ENCRYPTION-THREAT-MODEL.md for that boundary.

## Checks

`node backend/auth-test.mjs` exercises the actual handler with migrated SQLite
and real WebCrypto derivation: empty registration, login, password hashing,
unique usernames, failed authentication, CSRF, browser rotation, logout,
reauthentication, recovery, password changes, deletion, rate limits and expiry.
These are isolated tests. They do not prove a browser rendering or a live Matrix
exchange. The separate cross-layer production API tests exercise account-bound
community, friendship and cosmetic behavior.

Reference: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
