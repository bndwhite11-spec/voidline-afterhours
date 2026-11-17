# Platform ownership and administration

The intended owner handle is **@xrp**. That text is a way to identify the account
the user means. A matching username, display name, community role, browser flag,
or first registration never grants platform administration.

## Current binding state and smallest remaining step

No real owner account has been verified or bound by this upgrade. The public
application must continue to deny platform administration until the procedure
below completes. A test-fixture owner is not a production owner.

The account holder must sign into the intended account, confirm their password,
enroll a passkey in Devices and Security, and choose **Verify owner access**.
The app verifies a fresh user-verifying passkey assertion and creates a private
five-minute ownership request code. The code proves control of that signed-in
account; generating it alone grants nothing. Provide that short-lived code to
the trusted infrastructure operator. Do not provide a password, passkey private
key, account recovery secret, Matrix token, or message recovery key.

The operator resolves the code through the authenticated infrastructure channel,
checks that it is the intended person's request, configures the exact immutable
account ID, then performs the one-time binding. No account lookup by @xrp can
substitute for this verification.

## Trusted server setup

These are runtime settings in the Sites secret/configuration store, never source
files, browser bundles, `.openai/hosting.json`, or a downloadable archive:

- `OWNER_BOOTSTRAP_TOKEN`: a random high-entropy infrastructure bearer, at least
  32 characters. It must be available only to the trusted operator/service.
- `PLATFORM_OWNER_ACCOUNT_ID`: the immutable account ID obtained from a verified
  ownership request. It is not a public handle or user-selected role.

Runtime updates require redeploying the existing saved Site version. Preserve
the existing Site ID, database and audience. The token is not delivered to any
browser. The application does not return its value from an endpoint.

Use `python3 scripts/owner-bootstrap.py resolve --origin <site-origin>` from an
authorized operator workspace. It prompts privately for the infrastructure
token and the request code, avoiding command-line secrets. The server validates
the code's hash, expiry, current session, account status, recent password and
recent passkey verification before returning the immutable account ID to that
authorized operator. Request codes are stored only as SHA-256 hashes.

After independently checking the account holder's request, set the exact returned
ID in trusted runtime configuration and redeploy. Run the helper's `bind` action
with `--expected-account-id <verified-id>`. The server requires that configured
ID to match the verified request. It atomically writes the singleton
`platform_owner` record, consumes the request, and records the binding in
`admin_audit`. If the short-lived request expired while configuration was being
deployed, the same signed-in account must create a fresh request.

Remove `OWNER_BOOTSTRAP_TOKEN` and `PLATFORM_OWNER_ACCOUNT_ID` after a successful
binding, then redeploy. The persisted `platform_owner.account_id` remains the
authority. A new environment value cannot silently rebind it, and repeating the
bootstrap operation returns a conflict. A schema constraint permits only the
singleton owner record.

## Everyday owner access

Every owner API authenticates the current opaque session, checks the singleton
owner record, and requires password authentication within ten minutes plus a
user-verifying passkey assertion within five minutes. HTTP methods, origin,
account expectation, CSRF and mutation limits are checked independently of the
dashboard. A suspended or revoked session fails before administrative access.

The dashboard offers paginated account lookup, account status and authentication
method/verification indicators, suspension/reinstatement, session revocation,
community invitation revocation, reporter-selected abuse evidence, official
gift-catalog settings, reviewed badge awards/revocations, health and an audit
trail. Account lists exclude passwords, hashes, tokens, passkey public keys,
email addresses and private profile collections. Gift prices remain zero.
Cosmetics and community ownership do not grant this role.

The dashboard has no universal conversation decryption capability. Voluntarily
submitted report evidence is explicitly separate from hidden access to private
messages. Administrative recovery does not reveal a user's recovery secret or
invent an email delivery. With a configured provider and verified channel, it
issues a real ten-minute single-use reset through the authentication service.
An audit intent is committed before the external request. Success means the
provider accepted the request, not that it reached an inbox. If verified
recovery delivery is unconfigured, the action returns an unavailable state.

Suspension revokes all existing account sessions. Reinstatement permits a new
login and does not revive old cookies. Administrative account mutations and
their audit records commit together. The verified owner cannot suspend themself,
and the native account-deletion endpoint must protect that owner record.

## Owner recovery

Keep two passkeys on separate devices where possible and keep the account's
offline recovery material separately. Password recovery changes the login
credential and signs out existing sessions; a new owner session must verify its
passkey again. It does not restore missing Matrix message keys.

If all owner passkeys and usable authentication material are lost, there is no
public username-based bypass. Recovery requires authenticated infrastructure
administration, independent proof of the account holder, and a controlled,
audited credential/backup restoration. The existing immutable owner ID must be
preserved. This environment's database inspection connector does not itself
provide a production backup restoration console. See the repository's backup
and restore documentation for access requirements and the isolated restore
verification, rather than inferring that a live provider restore was performed.

## Verification boundaries

`node backend/admin-test.mjs` runs the actual handler against the generated
SQLite migration chain with isolated authenticated sessions. It tests that the
name @xrp and community roles confer no privilege, ordinary/anonymous callers
are denied, bootstrap is exact-ID and one-time, expired proof is rejected,
recent MFA is required, account output excludes secrets, status/session controls
work, audits roll back atomically, and catalog/award actions never grant roles.
Passkey timestamps in these administration tests are fixtures. Real WebAuthn
validation has its own tests and still needs the holder's actual browser/device
for production enrollment. No production owner binding or privileged screenshot
is claimed without that participation.
