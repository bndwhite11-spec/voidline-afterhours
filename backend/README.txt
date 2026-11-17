VOIDLINE SHARED TEXT MESSAGING

ARCHITECTURE
The hosted build combines a dependency-free Worker API with the existing plain
JavaScript client. /api/live/* is dispatched to handleLiveRequest; other known
asset paths are served from the generated Worker asset map. Shared text is
stored in the Sites-managed D1 binding DB. The offline/local archive remains
separate, and offline Shared rooms are explicitly unavailable.

SOURCE MAP
  worker/index.mjs            authenticated API and authorization boundary
  backend/schema.sql         audited SQL contract used by the SQLite tests
  backend/test.mjs           real SQLite-backed API contract checks
  db/schema.ts               equivalent six-table Drizzle schema
  drizzle/                   generated schema SQL, journal and snapshots
  drizzle.config.ts          SQLite generation config, output ./drizzle
  scripts/build-worker.mjs    self-contained Worker and metadata build
  scripts/dev-worker.mjs      package dev adapter for the Sites preview daemon
  dist/live.js, live.css      shared-room client and interface

The hosting manifest preserves the existing project_id, omits static, and
sets d1 to the string "DB". r2 is null. These values follow the installed Sites
starter/build contract. The Worker entry is dist/server/index.js and default-
exports fetch. Root drizzle/ is also packaged into dist/.openai/drizzle by the
Sites packager. No schema is created or altered inside request handlers.

IDENTITY, ALIASES AND ACCESS
Sites dispatch injects oai-authenticated-user-id. Membership is keyed by this
stable per-Site identity. Visitors choose a public alias, initially shown as
New resident until configured. Messages and member listings expose the chosen
alias, not the sign-in email or account full name. Display aliases are not
unique authentication credentials.

Every community/channel data action checks server-side membership. Owner-only
operations check the stored role; announcement publishing is limited to staff.
A Site's hosting audience and a community's membership are different checks.
Public hosting does not make shared messages public or make a visitor a member.
A community invite cannot bypass the Site's hosting policy.

The handler must stay behind the Sites identity boundary. It does not create
its own OAuth/session flow or intercept the platform's reserved sign-in routes.
The client starts ChatGPT sign-in with a top-level navigation. Authenticated
responses and API errors use Cache-Control: no-store.

API CONTRACT
Writes require JSON and a same-origin Origin when supplied. Errors use
{error:{code,message}} and a non-2xx status. Successful acknowledgment follows
a durable write; a failed database write is never represented as delivered.

GET /api/live/health
  Public availability check; verifies the configured DB/schema without exposing
  accounts or conversation content. Returns shared-text/cursor-polling mode.
GET /api/live/me
  Returns the authenticated account's id, public displayName and needsProfile.
POST /api/live/profile {displayName}
  Sets a public alias of 2..32 characters. This does not change platform identity.
GET /api/live/communities
  Lists only the caller's memberships with stored role.
POST /api/live/communities {name}
  Atomically creates a community, owner membership and general text channel.
GET /api/live/communities/:id/channels
  Lists channels after membership is checked.
POST /api/live/communities/:id/channels {name,kind:"text"|"announcement"}
  Owner only. Names use lowercase letters, digits and hyphens.
GET /api/live/communities/:id/members
  Membership-gated directory with public identity fields; no sign-in email.
POST /api/live/communities/:id/invites {maxUses:1..100}
  Owner only. Returns an unpredictable token once and stores only its SHA-256
  hash. Tokens expire after seven days. The server does not send invitations.
POST /api/live/invites/claim {token}
  Adds membership when an unexpired invite has capacity. Existing members do
  not consume another use. Admission and usage update use an atomic batch.
GET /api/live/channels/:id/messages?limit=50&before=<seq>
  Chronological history page; default latest page. Limit is capped at 100.
  Use page.before to load older content.
GET /api/live/channels/:id/messages?limit=50&after=<seq>
  Ascending cursor catch-up. Use page.after for the next poll and drain while
  page.hasMore. Do not advance past unprocessed messages.
POST /api/live/channels/:id/messages {clientId,text}
  Requires membership and posting permission. clientId is 8..100 ASCII letters,
  digits, underscore or hyphen and remains stable across retries. Text is
  1..4000 characters. The server determines the author from platform identity.
  A unique (channel,author,clientId) constraint deduplicates retries; different
  text with the same ID returns 409. Success: {message,acknowledged:true}.

Messages contain seq,id,channel_id,author_id,author_name,client_id,text,created_at.
Render text safely. Cursor polling supplies shared text and paginated history;
it does not establish WebSockets, live presence, read receipts, shared media,
live voice, a networked friend-request system or server-verified collectibles.
A durable saved acknowledgment does not imply another member read the message.
Shared moderation/edit/delete/event flows are not inferred from local controls.

SCHEMA AND BUILD
Install dependencies through the Sites install-dependencies.mjs helper.
After a schema change run npm run db:generate, review the schema-only SQL and
commit the generated journal/snapshots with source. Applied migrations and
metadata are immutable; append later changes. Keep seeds/backfills separate.
Use one SQL statement per D1 prepare(), and batch() for atomic multi-statement
operations. backend/schema.sql remains a test contract and is not uploaded as
an independently executable migration.

Run the offline/source generator before the final Worker build:
  python3 build_offline.py
  node /home/agent/.codex/plugins/cache/openai-curated-remote/sites/1.1.6/scripts/build-site.mjs

Build output contains the Worker, hosting metadata and generated migrations.
The generated .sites-runtime/wrangler.json uses the starter's placeholder DB
ID solely with --local. Wrangler's temporary files also stay outside dist,
so production rebuilds preserve the running preview's loader. Sites provisions the actual hosted resource from the
logical manifest binding. Do not substitute an account key or real DB ID.

LOCAL PREVIEW
For a fresh local DB, after building, run the initial migration once:
  node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config .sites-runtime/wrangler.json --persist-to .wrangler/state --file drizzle/0000_grey_zarda.sql
Apply each later pending migration in order; do not replay applied migrations.
Then use only the managed daemon:
  sites-preview start /workspace/sites/voidline-afterhours/.sites-checkout
Use its exact returned URL. scripts.dev invokes Wrangler with --local through
that daemon. No authentication mock or separate preview server is provided.
Local and hosted databases are separate.

DEPLOYMENT AND VERIFICATION
Follow the Sites source/package/deploy workflow with the current project ID
and audience. Sites applies generated hosted migrations before Worker upload.
A deployment can apply migrations even if a later stage fails; inspect actual
state before changing migration history or retrying a schema repair.

Run: node backend/test.mjs
The tests exercise actual SQLite with synthetic identities. They verify API
contracts and authorization, not independent real ChatGPT accounts or the
hosted D1 dispatch path. Use the native deployment result and an authenticated
hosted smoke test to verify deployment, then a separately authorized two-account
check for end-to-end shared messaging. See DEPLOYMENT-CHECK.txt.
