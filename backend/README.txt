CURRENT FOUNDATION NOTICE

The account upgrade replaces production platform-header identity with verified
Google sessions (worker/auth.mjs). worker/index.mjs retains authorized metadata
and legacy plaintext reads, but blocks new protected plaintext content.
Encrypted messaging is a separate maintained Matrix SDK integration requiring
a configured homeserver and independently verified devices. No working Google
or Matrix service is implied while external credentials are missing.

Current checks: backend/auth-test.mjs (real JWT verifier + SQLite),
backend/foundation-review-test.mjs (production auth/API),
backend/secure-messenger-test.mjs (mock SDK boundary tests).
backend/test.mjs and review-test.mjs use an explicit historical v7 fixture.
See README.txt and docs/ for current setup, encryption and acceptance limits.

HISTORICAL V7 NOTES FOLLOW

VOIDLINE SHARED TEXT SERVICE / V7 SOURCE

ARCHITECTURE
worker/index.mjs is the dependency-free authenticated Worker API. The builder
embeds this handler beside the authored dist browser client. Sites dispatch
supplies oai-authenticated-user-id; the API must remain behind that trusted
boundary. Shared text uses the Sites-managed D1 binding DB. Public hosting
never grants membership in a community. The offline archive remains separate.

The public profile contains the alias a person chose, bio, status, an original
avatar motif and a theme. Sign-in email and full name are not exposed. Aliases
are display names, not unique authentication credentials. Shared profiles do
not claim ownership of local artifacts or silently import local profile data.

SOURCE MAP
  worker/index.mjs            authenticated API / authorization boundary
  db/schema.ts               current eleven-table Drizzle schema
  drizzle/                   immutable generated SQL, journal and snapshots
  backend/schema.sql         historical v6 SQL reference, not current migrations
  backend/test.mjs            SQLite-backed positive and failure contracts
  backend/review-test.mjs     independent migration/privacy/revocation checks
  scripts/build-worker.mjs    Worker asset and deployment metadata build
  dist/live.js               shared navigation, messaging, threads, reconnection
  dist/live-tools.js          account discovery, inbox, saves and community tools

RUN
  node backend/test.mjs
  node backend/review-test.mjs
  npm run db:generate          only after an intentional schema edit
  python3 build_offline.py     refresh downloads before final Worker build
  npm run build

The managed Sites helper files are unavailable in this task environment; the
existing project build script is the supported fallback and preserves authored
dist files, Worker metadata and the complete migration chain.

Tests apply the actual generated migrations, not a hand-maintained substitute.
All SQL statements use one D1 prepare() each; related mutations and change
notifications share a D1 batch transaction. No request-time DDL, seeds or
backfills are performed. All migrations are additive and retain old IDs/data.

GENERAL API CONTRACT
All paths below are relative to /api/live. GETs and errors use no-store.
All POSTs require JSON and expectedAccountId matching the signed-in identity.
A mismatched or missing expected account returns 409 before domain mutation.
A supplied Origin must match the Site. Body size is limited to 16 KiB.
Errors use {error:{code,message}} with an appropriate non-2xx status.
Success means the database acknowledged the write, not recipient delivery/read.
Times are integer Unix milliseconds. Message/history/change sequences are
nonnegative integers. Pagination uses limit 1..100 (default 50), offset >=0.

IDENTITY AND COMMUNITY
GET /health                       public DB availability, no account details
GET /me                           {account,transport}
POST /profile                     displayName 2..32, bio <=240, status <=80,
                                  theme obsidian/lilac/ice,
                                  avatar moon/orbit/spark/leaf/ghost
GET /profiles/:accountId           only yourself or a member of a shared community
GET /communities                   your communities, description/icon/role
POST /communities                 {name,description?,icon?}; atomic owner+general
GET /communities/:id/channels      membership gated
POST /communities/:id/channels     owner; {name,kind:text|announcement}
GET /communities/:id/members       chosen public fields and roles, never email
POST /communities/:id/settings     owner; name <=64, description <=240, icon <=8
POST /communities/:id/members/:id  owner changes role member/moderator or removes;
                                  moderator may only remove an ordinary member
POST /communities/:id/transfer     owner; {accountId} must already be a member
POST /communities/:id/leave        owner must transfer ownership first

INVITES
GET /communities/:id/invites       owner-only management list, no reusable token
POST /communities/:id/invites      owner; maxUses 1..100, expiresInHours 1..720
                                  (default 168); token is returned only once
POST /communities/:id/invites/:id/revoke  owner; id is the stored token hash
POST /invites/claim                {token}; distinct invalid/revoked/expired/
                                  exhausted errors; alreadyJoined is explicit
Tokens use 32 random bytes; only their SHA-256 hash is stored. Claim and usage
increment are atomic. An existing member consumes no further use. These APIs
do not send invitations to anyone or bypass Site hosting access restrictions.

MESSAGES
GET /channels/:id/messages?before=N|after=N&threadRootId=ID&limit=50
  Ascending chronological page; default most recent main-channel messages.
  Thread children are returned only when threadRootId is supplied. Tombstones
  preserve root/reply references. page has hasMore,before,after. changeCursor
  is captured before history reads so later changes are replayed, never skipped.
GET /messages/:id                 exact authorized message, including thread context
GET /channels/:id/pins             live community pins; deleted content excluded
POST /channels/:id/messages        {clientId,text,replyToId?,threadRootId?}
  Stable client ID is 8..100 ASCII letters/digits/_/-. Text is 1..4000 chars.
  Unique (channel,author,clientId) plus original payload fingerprint makes
  retries idempotent even after an edit/deletion. Different payload =>409.
  Returns {message,acknowledged:true,acknowledgedPayload:{clientId,text,
  replyToId,threadRootId}}; message reflects its current revision/tombstone.
POST /messages/:id/edit            own live message; {text}
POST /messages/:id/delete          own message or staff; durable tombstone
POST /messages/:id/reaction        {emoji,active}; explicit desired state
POST /messages/:id/pin             staff only; {active}
POST /messages/:id/save            private to caller; {active}

Message records include source community/channel labels, author alias,
reply_to_id, thread_root_id, edited_at, deleted_at, pinned, thread_count,
reply_preview, reactions:[{emoji,count,mine}], saved and change_seq. The latter
is monotonic per message; clients must not replace newer state with an older
history/ack response. Mutations return the full enriched message, except an
unavailable bookmark can still be removed and returns saved:false/unavailable.

Deleted text is emptied, reactions and pins cleared. The internal fingerprint
retains no original text. References remain addressable; dependents receive
change events when reply previews or thread counts change. Editing the source
of a reply updates the preview. Announcement posting is staff-only, including
thread replies. No local badge progress is granted by these server operations.

RECONNECTION
GET /channels/:id/changes?after=N&limit=100
  {messages,cursor,hasMore}. Replays sends, edits, deletes, reactions, pins and
  dependent reference/thread updates. Drain pages before sleeping; advance the
  cursor only after processing returned rows. Full messages may represent a
  later revision than their first event in the page; change_seq prevents stale
  responses from overwriting that newer state. Empty responses preserve cursor.
  Membership is checked again on every history/change request.

DISCOVERY
GET /favorites                    {favorites:[channelId]}; caller's accessible set
POST /favorites                   {channelId,active}; account-backed and private
GET /saved?limit&offset            {messages,total,page}; account-backed private
  Removed membership hides source author/text/labels; returns only opaque ID,
  saved timestamp and unavailable reason. Caller can remove unavailable saves.
GET /search?q&channelId&communityId&authorId&before&after&has=text&limit&offset
  Searches full accessible message history, not just loaded pages. Literal
  wildcard characters are escaped. Total is computed before pagination.
  Dates require real YYYY-MM-DD UTC dates; After includes that day, Before
  excludes it. Contradictory intervals reject. Text is the only shared media.
  Also returns accessible communities/channels/people, limited to 30 per type;
  entityLimit and dateInterpretation make those bounds explicit.
GET /inbox?view=unread|mentions|activity&limit&offset
  {items,total,counts,conversations,page}. GET never marks anything read.
  Unread excludes your own messages. Mentions use an exact public alias,
  including punctuation, with token boundaries. Activity is unread replies,
  thread replies, reactions or pins involving your messages.
POST /read {channelId,seq,changeSeq?} or {all:true}
  Message and activity watermarks are independent, monotonic, scoped to the
  account, and clamped to real channel maxima. For a displayed activity pass
  activity_seq; for a message pass change_seq. Whole-conversation read without
  changeSeq acknowledges current channel activity. Bulk reads affect only
  currently accessible channels. A later reaction on an old message can thus
  reappear in Activity without making all old messages unread.

LIMITS AND VERIFICATION
Cursor polling is not typing/presence, delivery/read receipts, live voice or
video. R2 is null: shared files/images/voice-note uploads are unavailable. Those
media paths remain device-local in the personal archive. No E2EE claim is made.
SQLite tests use synthetic independent identity headers. They exercise actual
SQL, transactions and migrations, but are not a two-real-account hosted test.
See DEPLOYMENT-CHECK.txt and the final native publication result for deployment
and verification boundaries. Existing audience and project ID must be retained.
