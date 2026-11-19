# Organization, Saved, search and account activity

The organization API stores private account preferences and source references.
It is not a decryption service. Every route requires an active native session;
mutations check origin, CSRF, immutable expected account ID, bounded JSON and
rate limits. A referenced native conversation/channel requires current
membership. A Matrix room identifier is only routing metadata and cannot grant
Matrix membership or retrieve protected history.

## Complete-account organization

Personal favorites, pin-to-top, archive, mute, folders and read preferences live
in D1. Native preferences use `native_conversation_preferences`; community and
opaque Matrix preferences use `organization_targets`. Existing applied schema
is retained. Folder removal clears referencing records and a selected folder
filter; it does not delete or leave a conversation.

Native conversation filtering and pagination are performed by the native API
across the current authorized account, rather than only filtering the first
loaded page. Account-bound snapshot cursors retain captured order/filter while
activity changes. The client passes opaque `page.currentCursor`/`nextCursor`
values back unchanged and rechecks authorization on each page. Expired snapshots
have a deliberate fresh-view action. Snapshot counts are not public discovery.

The organization metadata endpoint remains bounded to 1,000 records. Native
conversation results also carry their own favorite/pinned/archive/mute/folder
flags; controls use those when a record is outside the metadata window. Matrix
organization covers loaded device-authorized rooms, not a server-side plaintext
index of encrypted conversations.

## One Saved entry, explicit storage scopes

Saved now defaults to **Account bookmarks**. The entry also contains **This
device**, **Encrypted Saved** and **Community bookmarks** tabs. These are related
personal tools with different persistence and security properties:

- Account bookmarks sync through authenticated native APIs. They store a
  private source reference and a per-user bookmark revision, not another copy
  of the message. Lists/search/opening sources recheck current membership.
  Deleted or inaccessible sources are hidden. Unsave is deliberate and never
  deletes the original conversation message.
- This-device notes use `src/local-saved.js` and the encrypted local vault. They
  require a separate vault passphrase, do not upload or sync, and cannot be
  restored by changing an account password. Unsaved note text survives a failed
  save and is never included in a server request. Lock/account changes clear
  in-memory note drafts and vault access. The existing wrong-passphrase and
  ciphertext protections remain in place.
- Encrypted Saved uses the current unlocked Matrix client and a self-only
  private encrypted room. Source references are resolved under Matrix membership
  and authenticity checks. Opening the empty tool does not create a room.
- Community bookmarks retain authorized native channel references. They are
  private bookmarks, distinct from community-visible pins.

None of these choices claims that local vault encryption creates cloud E2EE.
A password reset, local-vault recovery and Matrix recovery are separate flows.
The UI states each tab's scope before presenting its contents.

## Search and exact sources

Account search uses `/api/messages/search` across full permitted Standard
history. It supports text, a recognizable `@username`, optional conversation,
UTC date range and links. Counts and results are permission-aware. Results show
escaped, highlighted snippets and exact source links. The source jump uses the
normal authorized conversation/message path rather than treating a bookmark or
search result as an access capability.

Community search uses the corresponding permitted server history, accepts an
exact username or compatible account-ID API parameter, and keeps channel scope
explicit. Visible controls ask for a person, not an internal identifier.

Encrypted search remains on this device over loaded decrypted history. Its
person picker labels known senders while retaining immutable Matrix IDs only as
internal values. Unloaded history is not claimed as searched. Scope changes
preserve typed text but do not automatically submit it to another server scope;
a user must press Search. An encrypted query is never quietly reused as a
server plaintext query to make the UI convenient.

Malformed/contradictory dates fail before transport. Late results cannot replace
a newer query, dialog or account. HTML/link-like message text is escaped; there
are no automatic third-party preview requests.

## Inbox and global badges

Inbox opening is read-only. Account conversations use the server's filtered
snapshot pages so unread conversations beyond the first page can appear. The
account and community page controls are separate. Per-conversation bulk read is
labeled **Mark this conversation read**. A separate action explicitly marks all
community conversations read. Neither claims that merely loaded messages were
actually viewed. The conversation interface owns its visible-message read
tracker independently.

`GET /api/organize/activity` returns only current-account counts:
`nativeUnread`, `communityUnread`, `unreadTotal`, `friendRequests` and
`giftRequests` (including pending transfers). Native/community unread counts
require current membership, exclude self-authored/deleted messages, and respect
per-conversation mute. It returns no message text, source IDs, account emails or
credentials. An opaque revision covers counts and authorized native cohort activity (conversation update time, change sequence and membership count), so net-neutral unread activity still reaches the first-page refresh policy. It exposes no message content or cohort identifiers.

While the account is visible, the client checks activity every 25 seconds.
Background/locked pages do not continue checking. Counters update directly when counts change. Revision changes also
emit `voidline:activity` with the current account ID and opaque revision for Social/Cosmetics badges.
The existing composer/timeline or an unsaved editing dialog is not rebuilt.
These are polled counts, not simulated online state or delivery/read receipts.

## Notifications and privacy

Preferences persist for DMs, mentions, replies, communities and gifts. Rich
previews on an unlocked client have **generic**, **sender** and **full** choices;
the older `content` value maps to `full`. These do not place protected text in
push infrastructure. Native Inbox previews respect the choice. Accounts that
never saved a choice start with **full** in-app previews for Standard
conversations; a saved **generic** or **sender** choice is kept. Encrypted room
previews stay hidden until the account's preferences have loaded.

Quiet hours store an explicit validated IANA time zone plus start/end times.
Older missing zones use UTC, shown in settings. The UI can select the saved zone
or this device's zone; the server and client use the same saved policy.

Notification availability is supplied by `notificationAvailability(env)`, not a
hard-coded success or an automatic browser permission request. The separate
**Browser notifications** screen performs deliberate opt-in and shows actual
subscription/configuration state. Push payloads remain generic even when a user
chooses full local previews. Provider acceptance is not proof of browser delivery.
Missing VAPID/service configuration remains an unavailable state. See the
notification implementation and operator setup documentation for deployment
and actual-provider/browser verification boundaries.

## Reports and community tools

Reports require an accessible community, channel message, native conversation,
native message or relevant account. Native account relevance can come from an
existing group. The user deliberately chooses any evidence to submit and
acknowledges disclosure to the verified platform owner. The API never fetches
and silently attaches message text. This voluntary report text is an explicit
exception to metadata-only storage, not a universal decryption route.

Community settings, members, roles, invitations, ownership transfer, timeouts
and audits call the actual scoped server APIs. Native moderation does not
implicitly revoke a separately managed Matrix room or its keys. Invitations
have preview, expiry, usage and revocation behavior; previewing one never joins.
Public directory responses expose only permitted profile/role information.

## Verification

`node backend/organize-test.mjs` runs actual HTTP handlers, opaque sessions and
the current migrated SQLite schema. Its 17 checks cover preferences/time zones,
private metadata/folders, global activity privacy/mute/read behavior, deliberate
report evidence, community moderation/audit rollback and an integrated native
search/bookmark/favorite membership-loss scenario.

`node tests/voidline-organize-test.cjs` runs 27 controlled DOM/transport checks.
It covers stale responses, source references, highlights/escaping, encrypted
query isolation, scope changes, snapshot navigation, private previews, activity
without destructive rendering and local-vault draft handling. These tests do
not establish real browser, screen-reader, mobile-keyboard, Web Push delivery or
live Matrix behavior. Release verification must report those separately.
