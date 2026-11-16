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
Each channel retains up to 500 messages. Images and voice notes are limited
to 2 MB each and the browser's available storage. Drafts last for the session.
Clearing browser data clears your archive. A separate offline file/browser
may use separate storage. Export your JSON archive in Settings to keep it.
Import merges messages and preserves existing message records by ID.
The v1 storage key remains in use to retain your previous VOIDLINE data;
a pre-upgrade backup is attempted when storage space permits.

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
To run the 21 checks with Node.js (tested on Node 24):
node tests/voidline-v2-test.cjs
node tests/voidline-modules-test.cjs
node tests/voidline-regressions-test.cjs

An independent communication client, designed for the hours between days.
