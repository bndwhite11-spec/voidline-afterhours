VOIDLINE: AFTERHOURS

OPEN
https://voidline-afterhours.pipedcactus1.chatgpt.site/

Create a Voidline account with a username, display name and password, or log in
to an existing account. No external identity-provider setup is required. New
accounts start empty. Save the account recovery code shown after registration;
it can reset a forgotten password. Password and recovery details are documented
in docs/ACCOUNT-SETUP.md.

THIS RELEASE
The client uses a compact server rail, contextual channel navigation and a
readable central conversation. Chats, Servers and Profile provide the primary
phone navigation. Account forms, dialogs, error states, focus indicators and
settings share one visual system. Copy is short and describes actual actions.

Friends: send an exact-username request, accept, decline, cancel or remove a
friend. Block/unblock and request privacy are enforced on the server. Lists
show real account data; no fake contacts, activity or online status is seeded.

Badges and gifts: nine original badge designs and six original gift designs
are free to collect. Badges are cosmetics, never verified identity or staff
roles. Inventory/equipped choices are server validated. Gift requests can be
sent, collected or declined; privacy, blocking, limits and retry deduplication
apply. No payment, credits, invented stock or scarcity is involved.

Servers: intentionally create or join an invitation-only server. Preview an
invite before joining. Existing role, channel, ownership and history controls
remain authorized by the server. Existing genuine records are preserved.

MESSAGING AND PRIVACY
Native account login is independent from message decryption. The optional
Matrix SDK/Rust crypto integration still requires a configured homeserver and
verified encryption devices. Creating an ordinary Voidline server does not
create a Matrix room. New protected content cannot silently fall back to the
retained plaintext API. Shared encrypted media, calls and encrypted persistent
drafts are not implemented. See docs/ENCRYPTION-DECISION.md and
ENCRYPTION-THREAT-MODEL.md for the actual architecture and remaining work.

Google authentication has been retired; former callback routes cannot sign in.
Existing provider/platform rows are preserved but never reclaimed by matching
an email or username. An explicit proof-based migration would be required for
an old identity without native credentials. Real local archives remain on their
original device/origin. The Data screen offers deliberate read-only review and
recovery export. It never re-seeds samples or uploads drafts automatically.

DOWNLOADS
The hosted client provides a source ZIP and an offline account/recovery viewer.
The offline copy cannot authenticate to the server or make networked chats.
Recovery exports can contain unencrypted historical content; store them
privately. The source ZIP contains no runtime account data or credentials.

SOURCE
  dist/home.js + home.css       account client and messenger layout
  dist/cosmetics.js/.css        free original collection and gifts
  dist/social.js/.css           friend requests, blocking and privacy
  dist/legacy-import.js         explicit read-only archive recovery
  src/secure-messenger.js       optional maintained Matrix crypto adapter
  worker/auth.mjs               native credentials, recovery and sessions
  worker/social.mjs             social authorization and data
  worker/cosmetics.mjs          inventory, gift consent and ownership
  worker/index.mjs              community metadata and legacy reads
  db/schema.ts + drizzle/       schema and immutable additive migrations
  docs/UPGRADE-BRIEF.md          detailed product and acceptance brief

BUILD AND CHECKS
Node24 and Python3:
  npm ci --no-audit --no-fund --cache /tmp/voidline-npm-cache
Current account boundaries:
  npm run test:foundation
  node backend/account-integration-test.mjs
  node backend/social-test.mjs
  node backend/cosmetics-test.mjs
Optional encrypted-adapter boundary tests:
  node backend/secure-messenger-test.mjs
Client/recovery and historical archive regression suites:
  node tests/run.cjs
Historical v7 engine tests use explicit fixtures, not production auth:
  node backend/test.mjs
  node backend/review-test.mjs
Generate downloads before the final Worker build:
  python3 build_offline.py
  npm run build
  node scripts/check-build.mjs

Use npm run db:generate only after an intentional schema change. Never change
applied migration SQL or snapshots. Sites applies new migrations before Worker
publication. Keep the existing project ID, audience and DB binding.

Large assets are compressed inside the Worker bundle, decompressed before
responses, and HTTP compression is left to the hosting proxy. Live verification
compares actual served bytes with the local source/build. Credentials, private
responses and decrypted content are never placed in a service-worker cache.

Managed preview needs supported browser controls and the Sites preview daemon.
If those controls are unavailable, HTTP/API checks and hosted screenshots are
reported separately from interactive browser/mobile verification.
