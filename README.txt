VOIDLINE: AFTERHOURS
Shared text rooms and a personal local archive.

OPEN THE CLIENT
Use the published Site for Shared rooms. Sign in with ChatGPT, choose a public
alias, then create a community or claim an invite. Community membership is
checked by the server. A host's Site access policy is separate from an invite.
The connection panel reports whether shared messaging is available.

For the offline edition, open dist/downloads/voidline-offline.html in a modern
browser. It is one self-contained HTML file and needs no installation or
network. Its local archive remains usable; Shared rooms are unavailable there.
Opening dist/index.html directly also uses local files; hosted authentication
and durable shared messaging require the published Worker environment.

LOCAL ARCHIVE
The local archive provides community/channel organization, local direct/group
conversations, replies, threads, reactions, image attachments, rich text,
editable messages, pins, saved notes, search, contacts and owner tools.
Inbox, Unread and Favorites help organize the local conversations. Search can
find people, channels, messages and commands; advanced message search supports
in:, from:, has:, before: and after: filters.

Profiles support bios, banners, status, accent, themes, frames, layout,
featured artifacts and optional ambient motion. The nine original collectible
artifacts have inspectable artwork, lore, defined local unlock conditions and
ownership records. These records are local milestones or edition provenance,
not a claim about a limited global supply or server-verified rarity.

The Night Bus sample project contains fictional residents and original sample
work: a cassette-cover zine, title rough, map, print variation and optional
locally synthesized audio sketch. Sample profiles and works are labeled and
read-only. Opening them does not grant achievements.

Microphone recording can create local voice notes up to 30 seconds/2 MB in
supported browsers. Permission is requested on Start. Local messages, local
DMs, attachments, voice notes and sample conversations are not delivered to
another person. Shared rooms are a distinct authenticated service.

SHARED TEXT ROOMS
Shared text uses the Site's Worker API and managed D1 database. ChatGPT sign-in
establishes a stable per-Site identity. Other members see the alias you choose;
the API does not publish your sign-in email or account full name in messages
or the member directory.

Create a community with a general channel, or claim a community invite. Owners
can create text/announcement channels and invite tokens. Invites expire after
seven days and have a configured use limit. The app does not message recipients
on your behalf. A valid invite adds membership; it does not override the Site's
hosting access restrictions. Announcement posting is limited to community
owners/moderators by the API.

Messages are plain shared text, up to 4,000 characters. A send is acknowledged
only after the database commits it. Stable client retry IDs prevent duplicate
messages after a retry or a lost response. New messages arrive through cursor
polling, and older history is paginated. A saved acknowledgment does not mean
another member has read the message.

This shared service does not currently provide live voice calls, shared image
or audio attachments, delivery/read receipts, live presence, or synchronized
local badges/profiles. Local archive imports do not upload those records into
shared rooms. No end-to-end encryption claim is made.

LOCAL STORAGE AND RECOVERY
The local archive saves in browser storage. Same-origin tabs merge saved local
changes, while each tab keeps its own navigation and unsent drafts. Histories
are retained without a destructive message-count cap. Feeds and threads load
in pages of 100; older content remains reachable through history and search.

Images and local voice notes are limited to 2 MB each and available browser
storage. Draft text, reply targets and pending attachments survive refresh in
the same tab when session storage is available. Closing a tab ends that session
unless the browser restores it. Drafts are not cross-device synchronization.

Clearing browser data clears the local archive. Separate browsers, origins or
offline files can have separate storage. Export JSON in Settings to keep a
copy. Import previews and validates the complete merge before committing.
Existing message records are preserved by ID. Recovery JSON uses the same
preview. Failed writes retain input and offer Retry and recovery export; keep
a recovery copy before closing a tab that cannot save.

The client performs no IP lookup or covert tracking. The hosted edition uses
normal hosting, authentication and messaging traffic. Shared messages are
server records governed by membership. The offline edition performs no shared
messaging request.

READABILITY AND KEYBOARD
Client reading colors are independent from profile identity colors. Appearance
settings control readable text size, density and motion. Reduced motion
respects the system preference, and the cinematic entrance can be skipped.
Returning channels preserve reading positions and draft context.

Ctrl/Cmd + K: command palette.
Ctrl/Cmd + comma: appearance settings.
Enter: send. Shift + Enter: new line.
Escape: close a dialog/panel or skip the entrance.
Artifact inspection: Left/Right rotate; R resets rotation.
Message options are available through their button or right click.

SOURCE AND OFFLINE BUILD
Authored browser files live directly in dist/: index.html, app.js, supporting
modules and CSS. worker/index.mjs contains the shared API. db/schema.ts is the
Drizzle schema; drizzle/ contains generated SQL and immutable metadata.

The Python offline generator has no third-party dependencies:
  python3 build_offline.py
It inlines the current local styles/scripts, including polish.css, live.css
and live.js. It regenerates the offline HTML and source ZIP. The source ZIP
contains source, tests, package inputs and migration history; it excludes
generated Worker bundles, node_modules, runtime state and local secret files.

Run the offline generator BEFORE the final Worker build, so hosted download
links serve the newly generated files. The Worker builder preserves authored
dist files and embeds them in dist/server/index.js. Generated dist/server and
dist/.openai files are excluded from that embedding to prevent recursion.

HOSTED BUILD AND PREVIEW
Node 24 is used for the checks, including Node's built-in SQLite backend tests.
The deployed Worker has no runtime package dependency. Drizzle and Wrangler are
pinned development tools. In this managed Sites environment, install with:
  node /home/agent/.codex/plugins/cache/openai-curated-remote/sites/1.1.6/scripts/install-dependencies.mjs
After editing db/schema.ts, generate and review migration SQL/metadata:
  npm run db:generate
Build through the supported helper:
  node /home/agent/.codex/plugins/cache/openai-curated-remote/sites/1.1.6/scripts/build-site.mjs

For a fresh local preview database, apply the initial migration once:
  node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config .sites-runtime/wrangler.json --persist-to .wrangler/state --file drizzle/0000_grey_zarda.sql
Apply later pending migrations in order; never replay already-applied SQL.
Local and hosted databases are separate. Start managed preview only through:
  sites-preview start /workspace/sites/voidline-afterhours/.sites-checkout
The daemon owns the process. Use its returned URL; status/stop are available.

Publish through the Sites source/package/deploy workflow. Preserve the existing
project ID and hosting audience for updates. Sites provisions DB and applies
hosted migrations before the Worker upload. If this source is reused for a new
Site, register that new Site and set its returned ID through the Sites helper.
Never put credentials or actual hosted database IDs in browser source.

VALIDATION
  node tests/run.cjs
  node backend/test.mjs
Client tests exercise local persistence and interaction contracts in a DOM/VM
harness. Backend tests use SQLite and synthetic identities. They do not prove
actual hosted D1 or two independent signed-in browser sessions. Browser layout,
mobile input and media-device behavior require browser checks. Consult
backend/DEPLOYMENT-CHECK.txt for the current source verification boundaries.
