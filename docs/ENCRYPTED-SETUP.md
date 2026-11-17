# Native-account encrypted enrollment: operator setup and proof

No Matrix service was configured when this integration was implemented. This
file is a concrete deployment procedure, not evidence that a service is active
or that a real encrypted exchange passed. The Sites Worker and D1 database do
not run Synapse. A separate operated HTTPS homeserver is required.

## 1. Choose infrastructure before entering credentials

A managed **Synapse** host can supply the service without maintaining a VM.
Before purchasing or migrating, obtain written confirmation that the provider
can configure the supported `org.matrix.login.jwt` login type, custom issuer and
audience, an operator-controlled HS256 secret, a reserved username namespace,
PostgreSQL/media backups, authenticated media and current supported releases.
Also confirm a supported user-interactive authentication (UIA) or trusted service
workflow for lost-device revocation and sensitive signing-key operations; JWT
login alone does not supply every UIA mechanism.
A generic public Matrix account or a host allowing only its own SSO does not
satisfy this particular integration. Provider prices/features can change; this
repository does not enroll in or purchase a service on the user's behalf.

Self-hosting is another option. Use a maintained Linux VM/container host, durable
PostgreSQL and media storage, an HTTPS reverse proxy, monitoring, backups and an
operator available for upgrades and incidents. Choose the Matrix **server name**
first: it becomes the domain part of Matrix IDs and cannot casually be changed
later. Example values in this guide are placeholders, not owned domains:

- Public API origin: `https://matrix.example.com`.
- Immutable Matrix server name: `messages.example.com`.
- VOIDLINE origin: `https://voidline-afterhours.pipedcactus1.chatgpt.site`.

The API hostname and server name may differ when delegation is deliberately
configured. For an initial installation, using the same Matrix-specific domain
for both is simpler. Add DNS and obtain a valid TLS certificate. No HTTP-only,
self-signed or browser mixed-content workaround is supported by the app.

## 2. Create and protect the service

Follow the current official Synapse installation instructions. Its official
Docker image is published at `ghcr.io/element-hq/synapse` and
`matrixdotorg/synapse`. Select a current supported version after reviewing its
release/security notes, record the exact image digest, and use that pinned
version for deployment. A floating `latest` tag is not a recoverable release
process. The official image includes the JWT authentication dependencies.

A minimal operator sequence is:

1. Create a private working directory outside this repository; apply `umask 077`.
2. Generate Synapse configuration with the reviewed image's documented
   `generate` command and the chosen immutable server name.
3. Configure PostgreSQL rather than the generated SQLite development default.
   Keep its password and connection settings in private server configuration.
4. Mount durable `/data` storage and a separate protected PostgreSQL volume;
   retain the signing key, configuration, database and media store together in
   the backup plan. Never put generated config/signing keys into this repo.
5. Publish the client listener through HTTPS, bind the unproxied listener only
   on a private network/loopback, and follow Synapse's reverse-proxy guidance.
6. Set upload limits, media retention and abuse protections. Ensure browser CORS
   supports VOIDLINE's origin and authenticated Matrix media requests. Do not
   expose Synapse administration endpoints through an unrestricted public proxy.
7. Validate configuration using Synapse's official validation command, start the
   service and check its logs without recording login bodies or access tokens.

Example generation command, after setting `SYNAPSE_IMAGE` to the reviewed image
reference, in that private operator directory:

```sh
umask 077
mkdir -p synapse-data
docker run --rm \
  -v "$PWD/synapse-data:/data" \
  -e SYNAPSE_SERVER_NAME=messages.example.com \
  -e SYNAPSE_REPORT_STATS=no \
  "$SYNAPSE_IMAGE" generate
```

The generated `homeserver.yaml` then needs a real PostgreSQL configuration,
reverse proxy and private secrets. This command alone does not create a
production deployment. Follow the provider's volume ownership guidance rather
than making its signing keys/world readable to fix container permissions.

## 3. Reserve the identity namespace

VOIDLINE maps immutable account IDs to the Matrix localpart
`v_` followed by the 64-character SHA-256 hex digest of that ID. It never uses a
public handle, display name, email or Google profile as the permission identity.
The `v_` prefix must be reserved on the chosen service. A person must not be
able to register or claim these names through public/password registration,
another SSO provider or a shared-service signup form.

For a new dedicated service, disable public registration and ordinary password
login for the app namespace; configure operator recovery/admin access privately.
For a shared managed service, require a supported namespace policy from the
provider. Merely hiding a signup page is insufficient. Check that no preexisting
`v_` users belong to unrelated people before enabling enrollment. First
application enrollment also rejects unexpected existing devices; that check
cannot prove a preexisting account has no other authentication method.

Only after the namespace is controlled should the operator set
`MATRIX_JWT_NAMESPACE_RESERVED=1` in Sites. This setting is an operator
attestation, not a cryptographic proof or an automatic reservation mechanism.
Do not enable it on a shared public homeserver without that policy.

## 4. Configure the supported JWT login flow

Generate at least 32 random bytes with a secure generator; a 48-byte random value
encoded as Base64 is suitable. Store it only in private Synapse configuration
and the host's server secret store. Do not paste it into chat, source files,
URLs, shell command-line arguments, screenshots or client-side settings.

Synapse's JWT configuration must match the app exactly:

```yaml
jwt_config:
  enabled: true
  secret: "<private-random-key-in-this-server-file-only>"
  algorithm: "HS256"
  subject_claim: "sub"
  issuer: "https://voidline-afterhours.pipedcactus1.chatgpt.site"
  audiences:
    - "voidline"
```

Synapse validates issuer/audience when configured. In particular, supplying an
`aud` claim while Synapse has no audience configured can make authentication
fail. Keep both sides explicit. The integration fixes the algorithm to HS256;
it does not accept an algorithm selected by a browser request.

Restart/reload Synapse through its supported release process. Confirm that
`GET /_matrix/client/v3/login` advertises `org.matrix.login.jwt`. The documented
Synapse flow creates a nonexistent user when its valid JWT subject first logs
in; the app does not need a privileged Synapse admin credential to create an
ordinary native-mapped account. Do not set an admin claim or grant app users
Synapse administration.

## 5. Set the existing Site's private runtime values

Keep the existing Site ID, audience, D1 binding and native accounts. Set these
through Sites runtime environment/secrets administration, never hosting.json:

| Setting | Example/requirement |
|---|---|
| `VOIDLINE_ORIGIN` | Exact existing canonical HTTPS app origin |
| `MATRIX_HOMESERVER` | HTTPS API origin only; no path/query/userinfo |
| `MATRIX_SERVER_NAME` | Exact immutable Synapse server name |
| `MATRIX_JWT_AUDIENCE` | `voidline`, matching `jwt_config.audiences` |
| `MATRIX_JWT_SECRET` | Same private HS256 key as Synapse, at least 32 bytes |
| `MATRIX_JWT_NAMESPACE_RESERVED` | `1`, only after the namespace checks above |

Redeploy the existing saved application version to apply runtime settings.
The native account remains usable without them. Missing or malformed settings
keep enrollment unavailable and never cause a fake connection or plaintext
fallback. An administrator should see the precise setup diagnosis; ordinary
users receive a short availability message.

The server-side `matrix_account_links` record fixes the account, Matrix user ID,
subject and API origin. A settings change cannot silently move a linked account
to a different identity or server. Domain/service migration needs a verified
operator plan that preserves keys/history and handles old sessions explicitly.

## 6. What the application actually does

`POST /api/encryption/enroll` requires an active native session, CSRF, exact
expected account ID, recent authentication and an account rate limit. The app
reserves a one-attempt journal entry and the immutable identity mapping under
commit-time authorization. The Worker signs a 45-second JWT using maintained
`jose`, consumes it directly against Synapse, validates `whoami`, and confirms
that the returned device matches the expected identity. It never supplies a
reused `device_id` to login. Unexpected existing devices on first linking fail
closed instead of silently adopting their keys.

The JWT stays server-side. Synapse sees it over TLS; the browser never receives
the signing key or JWT. The browser receives its own device-scoped Matrix access
token in an authenticated no-store response. It is then handed to the maintained
SDK in memory and encrypted in the separate local enrollment vault. Neither the
JWT nor access token is stored in D1, logs or ordinary browser storage.

The local enrollment operation ID prevents duplicate server-side attempts. JWT
`jti` itself is not a Synapse one-use guarantee; if a JWT escaped through a bad
operator log it could be replayed within its short lifetime. Do not log bodies.
A remote timeout can leave an orphan device. The journal records safe outcome
states and device IDs when known; it never fabricates successful revocation.

Session revocation/suspension between login and response triggers a best-effort
Matrix logout before any token reaches the browser. Failure is recorded as an
unknown revocation outcome. Review those devices through trusted Synapse
operations. The two services do not provide one shared atomic transaction.

## 7. Native-password device unlock, without a second technical password

A normal user confirms their ordinary VOIDLINE password through the existing
reauthentication API. In the browser only, a persistent random 32-byte account/
homeserver salt and PBKDF2-HMAC-SHA256 600,000 iterations derive a 32-byte outer
wrapper secret. The derived value and seed are never sent to the server. The seed is
nonsecret KDF salt in localStorage; it is not a session identifier or token.
The existing local vault adds its own random salt/KDF and AES-256-GCM record
protection. Raw password bytes, Matrix tokens and usable vault keys never enter
ordinary localStorage/sessionStorage.

An encrypted IndexedDB envelope keeps the dedicated Matrix token so returning
users unlock the same device and preserve its device namespace/outbox binding.
The actual Matrix/Rust key store is separate, account/homeserver/user/device
scoped. New devices use a separate stable random storage password held inside
the encrypted v2 envelope; migrated v1 devices retain their original derived
storage password so old stores remain readable. Web Locks coordinate
initial enrollment and prevent two tabs opening the same device store.

A Google-only account currently needs to add a native password before using
this unlock route. A reviewed passkey-PRF/OIDC credential-persistence design is
future work; this implementation does not fake PRF support.

An intentional current-password change now stages and promotes a new outer
wrapper for this browser without changing its crypto-store key (section 11).
Password reset cannot recover an older envelope or missing message keys, and
other revoked browsers are not automatically migrated. Failure to unlock never
silently resets a store. An explicit new-device action can replace the enrollment
envelope while retaining old Matrix stores; authorized history recovery then
needs the real message recovery key or a trusted existing device. A new native
password alone does not grant old keys. The independent local Saved passphrase
remains a separate recovery boundary.

Native logout locks local access immediately and queues verified mapped-device
revocation. A direct Matrix logout is a separate operation with
confirmed/failed/unknown results. On confirmed remote logout,
the encrypted enrollment token envelope is removed. Unknown/failed outcomes
retain only the encrypted envelope for a deliberate native-password unlock and
retry, or resolution through another trusted device/operator. No raw token is
placed into an insecure retry queue.

## 8. Restrictions and default mode are not yet complete

New enrollment and recipient lookup enforce native active-session, friendship
and blocking policy. A verified accepted friend can be found by their native
username; no technical Matrix ID is needed in the ordinary creation journey.
A D1 role/block change does not itself remove an existing Matrix room member
or revoke every existing Matrix session. This integration deliberately reports
`accountRestrictionsSynced:false` and `encryptedDefaultReady:false`.

Synapse JWT login and Matrix user-interactive authentication are distinct.
Current Synapse permits first-time cross-signing setup without UIA, but existing
key replacement and device deletion can require a password/SSO or another
provider-supported authentication flow. A JWT-only mapped user may have no such
flow until the operator configures it. Do not guess that the native password is
also a Matrix password, disable protections to clear an error, or reset existing
keys. Confirm the actual provider/release behavior and provide an authorized
revocation/recovery path before representing the device-management journey as
complete. The integration preserves keys and reports unsupported challenges.

Before switching private messages to encrypted-by-default, operate and verify
service-level suspension/session/device revocation, native-to-Matrix membership
reconciliation, invitation acceptance, device verification, group history rules
and recovery against real devices. Define safe failure handling when only one
service succeeds. Short service session lifetimes limit exposure but are not
instant cross-service revocation. Use Synapse's supported session policy and an
operator process; do not claim that a local cookie expiry ends a Matrix token.

Standard conversations remain separately chosen, service-readable text. There
is no automatic downgrade from failed encrypted sends and no silent migration
of old plaintext history. No universal decryption key is supplied to an owner
or operator by this enrollment service.

## 9. Acceptance and ongoing operations

Use two disposable native accounts and independent browser profiles, then an
additional controlled device. Verify both users enroll through the normal
password UI, resolve each other by native handle, accept an encrypted invitation,
verify their device identities and exchange bidirectional encrypted text/media.
Inspect actual server-bound ciphertext, attachment bytes and safe logs using
distinctive test canaries; do not infer encryption solely from a shield icon.

Exercise partial recovery and resume, lost acknowledgments, refresh/unlock,
expired tokens, wrong identity/device responses, account switching, namespace
preclaim rejection, native suspension and failed remote revocation. Confirm
membership removal stops future key delivery according to the actual protocol;
it cannot erase previously received keys/plaintext. Keep encrypted-by-default
disabled until the full intended policy and recovery journey pass.

Monitor service health and error counts without message bodies, tokens or
recovery material. Back up PostgreSQL, the media store, server signing key and
private configuration to protected storage; test an isolated restoration.
Preserve message-key recovery separately: a server database backup does not
recover secrets never held by the server. Record service versions, configuration
revisions, maintenance responsibility and a recovery contact before inviting
real users. Native D1 backups remain another operational system.

Repository verification currently establishes actual JWT signing/verification,
native HTTP authorization/migrated SQLite and actual WebCrypto/IndexedDB
protection under controlled Matrix/SDK transport. It does not establish a live
Synapse, browser CORS, physical-device verification or a two-device E2EE result.

## Official references

- Synapse JWT login and its nonstandard login type:
  https://element-hq.github.io/synapse/latest/jwt.html
- Synapse installation, immutable server name and official images:
  https://element-hq.github.io/synapse/latest/setup/installation.html
- Synapse JWT/session/storage configuration:
  https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html
- Synapse reverse proxy:
  https://element-hq.github.io/synapse/latest/reverse_proxy.html
- Maintained Synapse JWT login implementation (review current release too):
  https://github.com/element-hq/synapse/blob/develop/synapse/rest/client/login.py
- Synapse UIA methods and first-time signing behavior:
  https://github.com/element-hq/synapse/blob/develop/synapse/handlers/auth.py
  https://github.com/element-hq/synapse/blob/develop/synapse/rest/client/keys.py
- Current stable Matrix client/server protocol:
  https://spec.matrix.org/latest/client-server-api/
- OWASP HTML5 storage guidance:
  https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html

## 10. Durable native lifecycle reconciliation (v17)

Code is available; no homeserver or production acceptance is established by this
release. `worker/matrix-policy.mjs` is a bounded service adapter, not a server
provisioner. Configure `MATRIX_ADMIN_TOKEN` only in the hosting secret store after
an operator has enabled and tested the supported Synapse admin APIs. The API
origin and immutable `MATRIX_SERVER_NAME` must match the existing verified link.
Protect the token and restrict its upstream proxy to the documented managed-user
lifecycle paths where practical. Synapse's admin token itself is privileged;
application route restrictions do not make a stolen token harmless.

Native authenticated lifecycle mutations enqueue idempotent operations in the
same atomic D1 batch. The service checks the immutable `v_<sha256(accountId)>`
identity, verified mapping, current native status and non-admin remote account.
It never uses Synapse's impersonation-login endpoint, reads private messages, or
receives a message/recovery key. Supported operations are:

| Native intent | Supported Synapse operation | Confirmation |
| --- | --- | --- |
| Suspend | Delete remote devices, `PUT /_synapse/admin/v1/suspend/{user}` | Re-list devices and read suspended state |
| Reinstate | Same suspension endpoint with `suspend:false` | Read unsuspended state; never reactivate a deleted identity |
| Delete | `POST /_synapse/admin/v1/deactivate/{user}` with `erase:true` | Read deactivated state |
| Revoke all native sessions/recovery | List managed user's devices and `POST /_synapse/admin/v2/users/{user}/delete_devices` | Re-list affected devices |
| Revoke one native session | Delete only devices linked by confirmed enrollment issue/session records | Native revocation plus remote device absence |
| Revoke known device | Same supported device deletion endpoint after account/device mapping check | Remote device absence |

Suspension alone does not invalidate read-capable tokens, so the operation also
deletes devices. No password reset or impersonation token is used as a shortcut.
Device-less tokens issued outside this integration are outside its session model;
operate the reserved namespace so unrelated authentication cannot create them.
Synapse deactivation removes devices, sessions and account data and schedules
room departure. It does not erase other participants' copies, existing message
events or uploaded media. Confirm its asynchronous completion and retention
policy with the operator; an HTTP receipt is not universal deletion proof.

Queue leases serialize one account's operations, recover interrupted workers,
and prevent duplicate claims. Transient failures back off and retry, with a
bounded attempt limit; permanent/unsupported states become `blocked`. Error
codes and attempt receipts contain no provider responses or tokens. Inspect
queue health and audit receipts, repair the cause, then deliberately reschedule
blocked operations through trusted infrastructure. A missing configuration
leaves queued work pending; it never marks it complete. Unknown in-flight
enrollment cannot be silently treated as completed session revocation.

The release's private operations runner can invoke this drain independently of
an open client, subject to the runner's separately verified operator binding.
Running a controlled API test or configuring that schedule does not prove an
unattended production invocation or actual Matrix policy enforcement.

An authoritative registry tying private community channels and room power to
native communities does not yet exist. Native blocks do not automatically ban
people from shared Matrix rooms or remove keys already received. Encrypted
room/community/undesired-contact reconciliation and physical-device revocation
acceptance remain incomplete. `accountRestrictionsSynced` and
`encryptedDefaultReady` therefore remain **false**, even if the supported queue
is empty. A working JWT login does not prove interactive authentication for
device deletion or signing-key operations. Test the actual provider's UIA flow.

## 11. Native password change, device handoff and local history

Enrollment v2 wraps the dedicated Matrix credential together with a stable
random crypto-store password. The native password derives only the outer local
wrapper. Existing v1 devices carry their original derived crypto-store password
into the encrypted v2 record; their Rust store, message keys, signing identity
and recovery journals are not reset or rekeyed.

The password-change UI prepares an encrypted new wrapper before changing the
native credential. An acknowledged server change atomically promotes it and
removes the old local wrapper. A definite server failure discards the proposed
wrapper. An uncertain network response retains both encrypted generations and
releases the coordination lock: after the native server verifies the password,
unlock can select the matching generation and finish promotion. This is a
recoverable two-service operation, not a claim of a distributed transaction.
Changing a password on one browser does not migrate another browser's local
envelope. Other revoked devices need a deliberate new-device/recovery flow; this release
does not offer cross-browser rewrapping. Ordinary password reset cannot recreate
a lost key.
Google-only users must first add a native password for this implemented unlock
method. OAuth provider login is not a recovery key; passkey PRF unlock is not
implemented.

Only one tab writes a Rust store. A second tab may request a switch; the current
tab must explicitly approve. It saves local drafts, flushes its vault, stops the
SDK/Rust client and releases the Web Lock before sending a metadata-only
acknowledgement. Credentials, keys and messages never travel on BroadcastChannel.
Decline, missing browser support, failed storage and an unresponsive tab preserve
the lock. Close or disconnect that tab; never delete its lock or crypto database.

Encrypted search can explicitly index earlier available conversation history
through SDK pagination. Only the decrypted client writes the account/device
vault; no plaintext query or index goes to a server. It is bounded to 10,000
indexed events with resumable page limits, reports missing keys and incomplete
coverage, and rechecks current source membership. Coverage must be confirmed
again after reconnecting. Thread-only history is not indexed yet. Local storage
clearance removes the index; it can be rebuilt when source history and keys are
available. It is not a synced backup and is not full product search acceptance.

## References reviewed for v17

Reviewed 2026-11-18 (Asia/Yerevan), with the pinned local SDK source checked too:

- Synapse account state, suspension, deactivation, device listing and supported
  bulk deletion: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html
- Matrix JS SDK Rust-store warning, lifecycle and browser support:
  https://matrix-org.github.io/matrix-js-sdk/classes/matrix.MatrixClient.html#initRustCrypto
- Maintained SDK source, including `stopClient()` and `scrollback()`:
  https://github.com/matrix-org/matrix-js-sdk/blob/v45.1.0/src/client.ts
- SDK Apache-2.0 license: https://github.com/matrix-org/matrix-js-sdk/blob/v45.1.0/LICENSE

The pinned SDK remains 45.1.0 with Rust/WASM crypto 18.9.2. No new cryptographic
protocol, universal service key, unsupported native-password Matrix UIA, or
independent security audit is claimed.
