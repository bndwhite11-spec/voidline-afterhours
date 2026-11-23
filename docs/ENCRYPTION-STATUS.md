# Encryption status and public service discovery

The status dialog reports separate facts about HTTPS, the selected conversation, the live messaging connection, device-key verification, key backup and recovery. It does not enable encryption, migrate Standard history, create a Matrix device, verify an identity or enable an automatic fallback.

## Frontend integration

Load `dist/encryption-status.css` and `dist/encryption-status.js` through the workspace feature loader, then route `data-home="encryption-status"` to the registered extension. The extension registers immediately when `window.VoidHome` exists or after `voidline:home-ready`.

| Contract | Usage |
| --- | --- |
| Extension ID and action | `encryption-status` |
| `app.state` | Current account, dialog generation and selected `secureRoomId` / `nativeId` / `channelId` |
| `app.showDialog(title, copy, html)` | Creates the status dialog and returns its generation ticket |
| `app.guard()` | Rejects results after account/session generation changes |
| `app.request(path, body)` | Existing authenticated request bridge; supplies expected account and CSRF for POST |
| `app.getSecureClient()` | Current real SDK-backed messenger, or `null` |
| Existing actions | `secure-verify` for devices/recovery; `secure-connect` when account enrollment is configured and no ready SDK connection exists |

No backend route wiring change is required if `/api/encryption/*` already routes to `handleEncryptionRequest`. The module owns only the `#ves-status` contents and its `data-es-action` buttons. It never replaces a newly opened dialog. Account, selection, SDK instance, SDK account/device identity, SDK phase and dialog generation changes invalidate pending results. `onAccount` and `onLock` clear local view state.

## What each status proves

| Layer | Actual source | Limit |
| --- | --- | --- |
| Website connection | `location.protocol` on the actual page URL | HTTPS is browser-to-service transport protection; HTTP on localhost is labeled local development |
| Standard conversation | Selected native conversation or community channel | Standard text and media are service-readable; this history is not converted |
| Selected encrypted conversation | Fresh `messenger.listRooms()` result for the exact selected room and its strict boolean `encrypted` flag | A missing room or failed lookup stays unknown; another room's encryption says nothing about the selected room |
| Messaging connection | Live `messenger.status()` with `phase === 'ready'`, an account ID and a device ID | Connection does not establish verified trust or prove the enrollment gateway was used |
| This device / other devices | Fresh `messenger.devices()` query, using actual SDK device verification booleans | No cached connection flag substitutes for device verification; no fingerprints or account/device IDs are rendered |
| Key backup | Fresh `messenger.securityStatus().backupEnabled` | An enabled backup does not prove recovery works |
| Recovery check | Fresh `securityStatus().recoveryVerified` | The existing SDK adapter requires a successful local restore record matching the current secret-storage key and backup version; this is not proof of a restore on another device |
| Signing and secret storage | Strict booleans `crossSigningReady` / `secretStorageReady` | Missing, malformed or failed SDK results remain unknown |

Only reduced booleans/counts enter the rendered status. Recovery keys, signing material, fingerprints, raw provider responses and raw errors are not rendered or logged. Each opening or Refresh status action obtains fresh SDK status. No periodic background probing runs.

## Authenticated `POST /api/encryption/check`

This explicit action performs **public discovery only**. It authenticates the native account, accepts an application/json object no larger than 4096 bytes, validates Origin/CSRF/`expectedAccountId`, rejects all other body keys, and rate limits to three checks per account per minute before contacting the provider. Changing client IP does not evade the account limit.

Example request body, supplied through the existing request bridge:

```json
{"expectedAccountId":"current-account-id"}
```

If complete enrollment configuration is unavailable, it returns `status: "not-configured"` with no outgoing requests. Otherwise it starts two parallel GET requests at the trusted, validated `MATRIX_HOMESERVER` HTTPS origin:

- `/_matrix/client/versions`
- `/_matrix/client/v3/login`

Both requests use a 12-second abort signal, `redirect: "error"`, `credentials: "omit"`, `cache: "no-store"`, no authorization header and no body. Each response must be HTTP 200 and a JSON object within 65536 bytes. Version arrays are bounded and accept Matrix's `vX.Y` or historical `rX.Y.Z` version syntax. Login flows must be a bounded array of objects with valid string types, and the exact `org.matrix.login.jwt` advertisement is required for the positive capability result. These checks do not negotiate SDK compatibility or test that a signing secret will be accepted.

Successful public capability discovery returns only this bounded shape:

```json
{
  "configured": true,
  "checkedAt": 1795478400000,
  "enrollmentProven": false,
  "encryptedDefaultReady": false,
  "accountRestrictionsSynced": false,
  "status": "advertised",
  "checks": {"versions": "valid", "login": "jwt-advertised"}
}
```

`status` is `not-configured`, `advertised`, or `unavailable`. Version status is `not-checked`, `valid`, `invalid`, or `unavailable`; login status is `not-checked`, `jwt-advertised`, `not-advertised`, `invalid`, or `unavailable`. Transport, redirect, non-200, oversized-body and JSON failures become fixed statuses without provider response bodies or error details. Responses disable caching. An advertisement never changes `enrollmentProven`, `encryptedDefaultReady` or `accountRestrictionsSynced` from false.

The check does not sign a JWT, call POST /login, create/revoke devices, read/write account mappings or enrollment attempts, query private keys, or connect a client. The existing `/config`, `/recipient` and `/enroll` contracts and enrollment cleanup behavior remain intact. The only database mutation for a check is the native authentication activity/rate-limit bookkeeping.

## Operator configuration and rollout limits

The existing enrollment configuration is reused without introducing a second provider or a caller-controlled URL: `MATRIX_HOMESERVER`, `VOIDLINE_ORIGIN`, `MATRIX_SERVER_NAME`, `MATRIX_JWT_AUDIENCE`, `MATRIX_JWT_SECRET` and `MATRIX_JWT_NAMESPACE_RESERVED=1`. The public product dialog contains no environment-variable names or operator setup instructions. See the existing enrollment/operator documentation before enabling the service; a responding discovery endpoint is insufficient deployment evidence.

Standard messaging remains service-readable. Real enrollment, verified device exchange, recovery on a separate controlled device, restriction synchronization and any encrypted-by-default rollout remain separate work. This change keeps both readiness flags false and does not authorize such a rollout.

Primary protocol references: [Matrix client-server API discovery](https://spec.matrix.org/latest/client-server-api/#get_matrixclientversions), [Matrix login flow discovery](https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3login), and [Synapse JWT login](https://element-hq.github.io/synapse/latest/jwt.html).

## Focused validation

```sh
node backend/encryption-readiness-test.mjs
node tests/encryption-status-test.cjs
node backend/encryption-enrollment-test.mjs
node backend/encrypted-enrollment-client-test.mjs
```

The new backend tests exercise migrated SQLite and real HTTP handlers with controlled provider transport. Frontend tests use JSDOM and the real public bridge/SDK method contracts, including account/room/client/device/dialog races. Enrollment regressions exercise actual JWT signing and WebCrypto/IndexedDB behavior. These are not physical-browser, live-homeserver, network-TLS inspection or two-device end-to-end encryption tests.
