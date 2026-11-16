VOIDLINE SHARED TEXT MESSAGING — INTEGRATION SOURCE

STATUS
This module is NOT enabled in the published device-local client. It is a
tested server-side boundary for the next integration step. No UI control
claims this service is connected, and the static client does not call it.

Files:
  worker/index.mjs       dependency-free Worker handler/default fetch export
  backend/schema.sql    schema-only SQL for the six live_* tables
  backend/test.mjs      actual SQLite-backed handler/database contract checks

The 12 checks use Node 24's built-in node:sqlite and synthetic identity
headers. They validate SQL, transactional batches, server authorization,
retry deduplication, history pagination, cursor catch-up and failure outcomes.
They are not a deployed D1 test or a test of two signed-in people/devices.

Run from the source root:
  node --check worker/index.mjs
  node backend/test.mjs

KNOWN HOST CAPABILITIES AND EXACT MISSING BOUNDARY
Sites documentation supports a Worker default fetch export, a logical D1
binding, dispatch-owned ChatGPT identity headers, and generated Drizzle SQL
migrations applied by the supported publish workflow. The current app is
static: .openai/hosting.json declares static.directory=dist and has no D1
binding, Drizzle migration journal/snapshots, or server build pipeline.
The installed Sites source/build helpers are unavailable in this execution
workspace. The available references expose null binding defaults but not a
complete working D1 manifest and migration artifact configuration. No binding
shape or deployment metadata has been guessed or written into that manifest.

Before this source can be switched on:
1. Restore the supported Sites/Vinext D1 starter/build helpers in a separate
   preparation checkout. Preserve the current Site project ID and audience.
2. Declare a supported logical D1 binding named DB using that starter's
   documented manifest shape. Sites owns database provisioning; do not embed
   a database ID, API key, or account credential in browser code.
3. Express schema.sql's tables/indexes in that starter's db/schema.ts.
   Run npm run db:generate to produce reviewed immutable SQL plus Drizzle
   journal/snapshot metadata in drizzle/. This SQL file alone is not claimed
   to be a deploy-ready Sites migration artifact. Keep migrations schema-only.
4. Build the supported Worker artifact. For local migrations the documented
   command is:
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js
     d1 execute DB --local --config dist/server/wrangler.json
     --persist-to .wrangler/state --file drizzle/<generated-migration>.sql
   Run this as one command per pending generated migration, in order.
5. Route /api/live/* to handleLiveRequest and serve the existing client/assets
   from the same supported Worker build. The server module is dependency-free;
   it does not replace the app or serve static assets by itself. Sites expects
   server output at dist/server/index.js when static.directory is omitted.
   Follow the supported build rather than manually fabricating deployment JSON.
6. Publish through the existing Sites source/package/deploy workflow so Sites
   applies the reviewed generated migrations before starting the Worker.
7. Add a separate connected mode to the client: durable account identity,
   connection state, server communities/channels, acknowledged outbox records,
   cursor polling, exact retry IDs and before-history pagination. Keep local
   archives separate and explicitly offer any migration/sending of local text.
8. Test platform-authenticated requests, server permission denials, reconnect,
   concurrent invitation claims and D1 batch behavior on the actual host.

The Site remains owner-private. A second person cannot access it merely
because a community invite exists. The Site owner must explicitly authorize
the intended hosting audience/collaborator access before a two-person test.
No such hosting sharing change or invitation message has been performed.

IDENTITY AND TRUST
The handler reads oai-authenticated-user-id injected by Sites dispatch. Email
and the optional percent-encoded full name are display metadata. Durable
membership uses the stable per-Site user ID. Every community/channel action
checks membership on the server, and owner operations check the stored role.
Do not expose this handler on a raw public Worker URL that accepts caller-
supplied identity headers. It must run behind the Sites identity boundary.
The module does not implement its own OAuth/session flow, reserved sign-in
routes, or a service token that impersonates visitors.

API CONTRACT
All responses are JSON with Cache-Control: no-store. Writes require JSON,
a same-origin Origin when supplied, and an authenticated platform identity.
Errors use {error:{code,message}} and an appropriate non-2xx status.
No durable-write failure returns acknowledged:true.

GET /api/live/me
  Returns account {id,displayName} and transport="cursor-polling".
GET /api/live/communities
  Lists only the caller's communities with stored role.
POST /api/live/communities {name}
  Atomically creates a community, owner membership and general text channel.
GET /api/live/communities/:id/channels
  Lists channels only after membership is checked.
POST /api/live/communities/:id/channels {name,kind:"text"|"announcement"}
  Owner only; announcement publishing is restricted to owner/moderator.
POST /api/live/communities/:id/invites {maxUses:1..100}
  Owner only; returns an unpredictable token once. Only its SHA-256 hash is
  stored. Invites expire after seven days. The server does not send invites.
POST /api/live/invites/claim {token}
  Adds a member if the unexpired token still has capacity. A repeated claim
  by an existing member does not consume another use. Admission and usage
  update execute together in a D1 atomic batch.
GET /api/live/channels/:id/messages?limit=50&before=<seq>
  History page, chronological in the response. The default is the latest
  page. Use page.before to load older content. Limit is capped at 100.
GET /api/live/channels/:id/messages?limit=50&after=<seq>
  Ascending cursor catch-up for new content. Use page.after for the next poll.
  Drain while page.hasMore; do not advance past unprocessed messages.
POST /api/live/channels/:id/messages {clientId,text}
  Requires membership and posting permission. clientId is 8..100 ASCII letters,
  digits, underscore or hyphen and must remain stable across retries. Text is
  1..4000 characters. The author always comes from platform identity. A unique
  (channel,author,clientId) constraint deduplicates retries. Different text with
  the same retry ID returns 409. Success returns {message,acknowledged:true}.

Messages contain seq,id,channel_id,author_id,author_name,client_id,text,created_at.
Never render text as trusted HTML. The intended client uses escaped/rich-text
rendering and keyed rows. Polling supplies a complete small-text vertical
slice; it does not claim WebSockets, live presence, delivery/read receipts,
shared media, voice transport, friend requests or server-verified artifacts.
Editing/deletion event streams, moderation tools and rate/abuse policies need
their own complete server flows before a wider audience is enabled.

INVARIANTS
- Identity and membership are established by the server, never by a hidden UI.
- A successful message acknowledgment follows a committed database write.
- Stable client IDs make retries safe, including reconnect after lost responses.
- Cursor ordering uses durable monotonic message sequences, not bucket order.
- Community creation and invite admission/usage use atomic batches.
- Missing provisioning produces an explicit 503, not fabricated live behavior.
