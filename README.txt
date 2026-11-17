VOIDLINE: AFTERHOURS / CLIENT 02
A place between days.

OPEN THE CLIENT
Open dist/downloads/voidline-offline.html in a modern desktop browser.
The entire application is in this HTML file. No installation is required.
You may also open dist/index.html to use the source version.

THE EXPERIENCE
A skippable cinematic entry, abbreviated return visits, and reduced motion.
Separate community archives with text channels, replies, threads, reactions,
image attachments, rich text, editable messages, and pinned transmissions.
Local direct/group conversations, contacts, saved notes, a command palette,
global search, an activity log, community discovery, and owner tools.
Personal profile worlds with custom bios, banners, status, accent, themes,
frames, layouts, featured artifacts, and optional ambient profile motion.
Nine original collectible artifacts with inspection, lore, defined unlock
conditions, ownership records, and keyboard/pointer rotation.
Microphone recording produces local voice notes up to 30 seconds/2 MB in
supported browsers. Microphone permission is requested only on Start.

SCOPE AND STORAGE
This is a device-local communication client. Built-in residents and discovery
communities are sample content. No account server, shared messaging backend,
friend-request service, live voice calls, or public event submissions exist.
Local conversations do not deliver messages to another person.
Open tabs in the same browser/origin synchronize saved message changes.

Messages, identity, settings, artifacts, and contacts save in browser storage.
History is retained without a destructive message-count cap. The feed and
threads load in pages of 100; Load older and search reach earlier content. Images and voice notes are limited
to 2 MB each and the browser's available storage. Drafts last for the session.
Clearing browser data clears your archive. A separate offline file/browser
may use separate storage. Export your JSON archive in Settings to keep it.
Import merges messages and preserves existing message records by ID.
A versioned, per-tab operation journal now records local changes. The old v1
archive remains a migration/recovery source. Independent changes merge by
entity field. Failed writes retain input and offer Retry and recovery export;
export recovery before closing the tab if the browser cannot save.

The client performs no IP lookup or covert tracking. The hosted edition uses
normal hosting and authentication traffic. The offline app needs no network.
Artifact tiers describe defined local milestones or edition provenance.
They do not claim a limited global supply or random rarity.

KEYBOARD
Ctrl/Cmd + K: command palette. Ctrl/Cmd + comma: appearance settings.
Enter: send. Shift + Enter: new line. Escape: close dialog/panel or skip entry.
Artifact inspection: Left/Right arrows rotate. R resets rotation.
Message options are available through the options button or right click.

EDIT AND PACKAGE
Edit dist/index.html, dist/styles.css, and dist/app.js for the main client.
entrance.js/css, badges.js/css, and profiles.js/css are independent modules.
All scripts use plain browser JavaScript. No package installation is needed.
Run: python3 build_offline.py
This regenerates the standalone HTML client and complete source ZIP.

VALIDATION
JavaScript syntax and behavioral VM checks cover migration, local messaging,
threads, reactions, permissions, drafts, deletion, storage synchronization,
conversations, settings, artifact and profile contracts. These checks do not
replace browser layout/accessibility/media-device testing.
To run the checks with Node.js (tested on Node 24):
node tests/run.cjs
node backend/test.mjs

An independent communication client, designed for the hours between days.

RELIABILITY EDITION
Client reading colors are independent from profile identity colors. Avatar
images support a circular crop/focal point and PNG/JPEG/WebP up to 512 KB.
Messages are typically 15 px; secondary functional labels are at least12 px.
Returning channels preserve reading positions; background updates keep the
thread composer and its caret and do not replace unrelated audio elements.
Search is globally newest-first before limiting, supports in:/from:/has:/
before:/after: filters, and targets exact retained replies.
Imports show a preview, validate the complete merge, and commit atomically.
Community/channel/conversation capacity failures leave the archive unchanged.
Recovery JSON can be imported through the same preview.

BACKEND SOURCE / NOT A LIVE SERVICE
worker/index.mjs and backend/schema.sql implement a text-chat API with platform
identity, server-enforced membership, invites, durable acknowledgments,
idempotency and paginated history/catch-up. SQLite contract tests use synthetic
identities. It is not wired into the static client or deployed. See
backend/README.txt for the missing supported D1 binding/migration/build steps.
The hosted Site remains owner-private. An authorized sharing change and two
independent browser accounts are needed for real two-user verification.
The current client still does not send local messages to another person.

VALIDATION LIMITS
Client tests use a DOM harness, not a browser renderer. Pointer appearance,
mobile keyboard, 200% zoom, native microphone/image decoding, and screenshots
remain unverified in this execution environment. No frame-rate claim is made.

TRUST EDITION
Navigation is independent in each tab. Conversation and thread drafts, reply
targets, and pending image/voice attachments survive refresh in the same tab
when session storage is available. Closing a tab ends that session unless the
browser restores it. This draft storage does not synchronize to another tab or
device. A persistent warning, Retry, recovery export and leave-page protection
appear if a tab cannot store its latest drafts. Draft attachment bytes are
stored separately so typing does not repeatedly rewrite them.

Read checks run when visible messages enter an active channel, including short
conversations that cannot scroll. Primary search groups people, channels,
messages and commands. Fresh general is seeded before creating an empty bucket;
previously empty archives remain empty. Conversation introductions now update
with their destination.

The Night Bus sample project gives residents original avatars and inspectable
contributions: a cassette-cover zine, title rough, map, print variation and an
optional locally synthesized eight-second audio sketch. All personas and works
are clearly fictional sample content; opening them grants no achievements.
Previously stored messages are preserved. The catalogue remains nine artifacts.

See backend/DEPLOYMENT-CHECK.txt for the latest evidence: Worker hosting itself
is supported, but no D1 binding exists and the required declaration/migration
pipeline is unavailable here. The private Site and local voice-note scope are
unchanged. No real shared-message connection is represented as complete.
