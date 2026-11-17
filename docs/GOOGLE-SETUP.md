# Google identity setup

The account service implements the Google OpenID Connect Authorization Code
flow with PKCE, state and nonce. It uses the maintained `jose` library for
RS256 ID-token verification against Google's HTTPS JWKS. It requests only
`openid`; Voidline does not request Gmail, email, contacts, Drive or Calendar.

Google credentials are not present in the current Site runtime. The welcome
screen must report setup is required; a disabled login is not a successful
Google integration. No account or conversation is fabricated in that state.

## Configure the provider

1. Create or select a Google Cloud project and configure its OAuth consent
   screen and app audience. Use an External audience if ordinary Google users
   should be able to sign in. If the consent screen remains in Testing, add
   each authorized tester; a testing configuration is not public availability.
2. Create an OAuth 2.0 client of type **Web application**.
3. Add this authorized JavaScript origin:
   `https://voidline-afterhours.pipedcactus1.chatgpt.site`
4. Add this exact authorized redirect URI:
   `https://voidline-afterhours.pipedcactus1.chatgpt.site/api/auth/google/callback`
5. Configure these runtime variables through the Sites environment-variable
   tool: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `VOIDLINE_ORIGIN`.
   The origin is the HTTPS origin above, with no path or trailing slash.
   Never place the client secret in browser JavaScript, `.openai/hosting.json`,
   the source ZIP, screenshots, log messages or a populated tracked env file.
6. Redeploy the existing Site with its existing ID, audience and DB binding.
   Apply the generated schema migration through Sites. The session tables
   are not created during request handling.

If a custom domain is introduced later, update both Google settings and
`VOIDLINE_ORIGIN` together. Redirects are accepted only on the configured
origin. The callback path avoids the `/callback` route owned by Sites.

Google opens as a normal top-level redirect, so blocked popups do not break
the supported path. The app handles cancelled consent and invalid/expired
callbacks with a clean error and a new sign-in attempt. Invitation return
paths are preserved as same-origin relative paths; viewing an invite does not
create membership. Tokens, codes and private content are never placed in the
app's return URL or printed by the account service.

## Authentication and account model

`auth_identities` keys the provider account by Google's stable `sub`, never by
email. Google email, legal name and avatar are neither stored nor published.
The user chooses their normalized unique username and display name. A fresh
Google account creates one otherwise empty `live_accounts` row and provider
mapping. It does not create memberships, DMs, requests, friends or badges.
The provider/subject constraint and a transactional account creation prevent
duplicate users during parallel or repeated callbacks.

Existing ChatGPT-identity accounts and their records are preserved. There is
no automatic email-based linking or transfer into a Google account. A future
transfer needs proof of both identities and an explicit preview/confirmation;
this upgrade does not pretend that transfer has occurred.

OAuth transactions expire after ten minutes and are single-use. The browser
binding is an HttpOnly Secure host cookie. The code exchange includes PKCE
and the client secret; ID tokens validate the signature, permitted RS256
algorithm, issuer, client audience/authorized party, expiration, recent
issuance and transaction nonce. Access/refresh/ID tokens are not persisted.

Application sessions use random 256-bit tokens. Only SHA-256 hashes enter D1;
bearers live in `__Host-voidline_session` with Secure, HttpOnly, Path=/ and
SameSite=Lax. Sessions expire after seven days. Mutation requests require an
exact Origin, an account expectation and a session-bound CSRF token supplied
in a custom header. Logout revokes the database session and clears cookies.
Account switching revokes the browser's previous app session. Other devices
remain visible until revoked or expired.

The Devices screen lists **sign-in sessions**. They are not verified E2EE
devices and confer no ability to decrypt history. Revoking a session requires
a Google reauthentication within ten minutes. Reauthentication uses
`max_age=0` and verifies Google's `auth_time`; if the provider does not confirm
it, the action remains blocked. This does not claim guaranteed password
re-entry or bypass any Google account policy.

## Verification and privacy limits

`node backend/auth-test.mjs` uses locally signed RSA JWTs, the real `jose`
verifier and an isolated SQLite migration chain. It tests authentication
rejection cases, transaction replay, account deduplication, CSRF, usernames,
empty accounts, session switching, logout and revocation. These checks do not
prove a real Google callback or exchange between two authorized browsers.

The service retains provider subjects, account aliases, session timestamps,
coarse browser/platform session labels and hashed minute-scale rate-limit
buckets. Raw User-Agent strings and IP addresses are not stored by this
module. Hosting and Google retain their own operational metadata. Google
sign-in is not anonymity. Delivered app code and the user's device remain
part of the trust boundary. Login does not derive or restore messaging keys.

References:

- https://developers.google.com/identity/openid-connect/openid-connect
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://github.com/panva/jose
