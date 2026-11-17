# Account exports

`GET /api/export` lists seven authenticated scopes. `POST /api/export` prepares one bounded JSON page after checking the native session, account status, expected immutable account ID, same-origin CSRF, recent password/passkey authentication (ten minutes), and `acknowledgePlaintext: true`.

| Scope | Included |
| --- | --- |
| `profile` | Own profile fields, customization and privacy choices. |
| `memberships` | Current community membership, scoped role, joining date and community metadata. |
| `gifts` | Currently owned instances and nonfinancial provenance references. |
| `badges` | Own earned awards, published definitions, issuer reference and revocation state. |
| `organization` | Own folders/preferences and bookmarks whose source remains accessible. Bookmark references contain no copied message text. Matrix target references are excluded. |
| `standard-native` | Currently accessible Standard DM/group text, attribution, edits/deletion state and attachment metadata. |
| `standard-community` | Currently accessible Standard community history and attachment metadata. |

Exports are **plaintext**. Anyone with the downloaded file can read it. Standard history is service-readable before export; downloading it does not create an encrypted backup. The endpoint does not export Matrix event plaintext, encryption keys, local encrypted notes/vaults, file bytes, credentials/password hashes, recovery addresses/secrets, provider identities, sessions, or access tokens. It does not grant an owner access to other users' private conversations.

Each POST includes `{expectedAccountId, scope, limit, acknowledgePlaintext: true, cursor?}` and the normal `x-voidline-csrf` header. Limits are 1–100 records per page and 120 page requests per account/minute. The response identifies `format: "voidline-account-export-v1"`, account ID, scope, warning, records, and `page: {limit,count,hasMore,nextCursor}`. The browser validates each page, caps downloads at 100 pages/10,000 records/10 MiB, and creates a file only after all pages succeed. It must discard partial results when access, account or dialog state changes.

Cursors use Web Crypto HMAC-SHA-256 bound to the authenticated session, account, selected scope and ten-minute expiry. History uses immutable message sequence positions and an initial high watermark, so later sends do not extend an in-progress export. Other records use stable identifying keys. Current edits, ownership and permissions are refreshed on every page; losing access removes the affected records, and session revocation stops the response. This intentionally is **not a transactional database snapshot**: changes or removals during export can alter later pages. Restart a scope after expiry or session rotation. Previously downloaded files cannot be remotely revoked.

`backend/account-export-test.mjs` exercises the real handler and complete migration chain against isolated SQLite/session fixtures: scope whitelists, cross-account cursor rejection, CSRF/recent-authentication gates, bounded keyset pagination, high watermark, token expiry, tombstone redaction, current membership/ownership checks, serialization-time revocation and permitted bookmark references. This is controlled backend verification, separate from browser downloads, hosted restore evidence and encrypted-history recovery.
