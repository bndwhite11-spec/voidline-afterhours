VOIDLINE: AFTERHOURS / ACCOUNT FOUNDATION

The production entry is dist/index.html + home.js/home.css. Visitors see a
welcome screen while identity resolves, then choose a public username and
display name. Real new accounts have no memberships, chats or fake activity.
Account authentication is Google OIDC, verified by the Worker. Provider email,
legal name and avatar are not copied into public profiles. Google sign-in
sessions and messaging encryption devices are separate identities.

CURRENT EXTERNAL SETUP REQUIRED
Google is not enabled without GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and
VOIDLINE_ORIGIN. Configure a Web application in Google Cloud and use the exact
callback in docs/GOOGLE-SETUP.md. Never place secrets in browser source.
MATRIX_HOMESERVER must identify an operator-controlled HTTPS Matrix server for
the encrypted adapter. No Matrix service or accounts are provisioned by this
repository. See docs/ENCRYPTION-DECISION.md and the encryption setup/threat-model
documents for protocol limits and the required external verification.

The welcome button honestly reports missing configuration. No pretend Google
identity, chat confirmation, online status, encryption device or recovery key
is synthesized. No encrypted-message deployment claim follows from unit tests.

DATA AND MIGRATION
Google's stable subject maps to a unique app account; matching an email never
links an older account. Existing v7 platform-owned rows remain in D1, unchanged.
They are not automatically assigned to a new Google identity. Data migration
between identities requires a future explicit dual-identity proof, not email.

The old D1 text API is retained for authorized metadata/history and deletion.
New plaintext sends, edits, reactions and saved copies are blocked. Private
messaging belongs to the maintained encrypted protocol adapter. Existing
community metadata supports intentional creation, membership, invitation review
and acceptance; creating a server does not establish encrypted Matrix rooms.
That integration remains distinct and cannot silently fall back to plaintext.

Old browser archives remain on their original origin/device. An explicit
read-only review separates exact unchanged fixtures from personal, modified
and uncertain content. Recovery export retains original bytes. Nothing is
silently deleted, re-seeded, uploaded or claimed to be an encrypted backup.
See docs/LOCAL-DATA.md. The offline download provides this review/recovery
interface; it cannot perform hosted authentication or encrypted network chat.

SOURCE
  dist/home.js + home.css       production account client
  dist/legacy-import.js        explicit read-only local archive review
  dist/store.js                retained journal reader, no boot-time seeding
  src/secure-messenger.js      maintained Matrix/Rust crypto adapter
  worker/auth.mjs              Google verification + opaque app sessions
  worker/index.mjs             authorized community metadata + legacy reads
  db/schema.ts + drizzle/      current schema + immutable additive migrations
  scripts/build-crypto.mjs     pinned local SDK/crypto asset bundling
  scripts/build-worker.mjs     Worker + compressed static assets and migrations

The v7 browser modules remain authored source for recovery and historical
regressions, inside the source download. Production does not load or serve
those sample modules. tests/fixtures/legacy-worker-v7.mjs is an explicit
historical test fixture, never an API authentication bypass.

BUILD AND VERIFY
Node24 and Python3 are used. Install exact package-lock dependencies:
  npm ci --no-audit --no-fund --cache /tmp/voidline-npm-cache
For intentional schema changes only:
  npm run db:generate
Do not edit applied migration SQL or old snapshots.
Current account boundaries:
  npm run test:foundation
Client, recovery, adapter and historical archive regressions:
  node tests/run.cjs
Historical v7 engine regression checks (not production auth/encryption proof):
  node backend/test.mjs
  node backend/review-test.mjs
Package in this order after source settles:
  python3 build_offline.py
  npm run build
  node scripts/check-build.mjs

The source ZIP excludes secrets, dependencies, runtime state, generated Worker
and crypto bundles and the source ZIP itself. It includes source, migrations,
setup documentation, .env.example and exact package inputs. The Worker includes
only the production asset allowlist. Large assets are compressed before being
embedded; no third-party CDN executes code in private conversations.

In managed Sites, preview requires supported browser controls and the preview
daemon. No alternative browser route or server is started when those tools are
absent. Publish the matching source/build through Sites, preserving project ID,
D1 binding DB and the current audience. Native deployment verifies publication;
it does not replace a real Google+Matrix multi-device acceptance test.
