# Built-in Standard messaging

VOIDLINE exchanges text through its authenticated Worker/D1 service. It needs
no Matrix account and remains an explicit **Standard messaging** choice. The
service stores readable text over HTTPS; it is not end-to-end encrypted. No
existing encrypted room, key, outbox record or message silently moves here.

## Security and identity

New direct/group creation and content mutations require the Standard disclosure
and `acknowledgeStandard: true`. Conversation `security_mode` is constrained to
`standard`; native identifiers cannot select a Matrix room. The client checks
returned security mode before enabling composition. A trusted database operator
can read this mode's text. A dashboard lacking a universal content reader does
not make its database encrypted between participants.

`worker/messages.mjs` serves `/api/messages/*`. Creation finds accepted friends
by normalized unique handle, then uses immutable account IDs for membership and
permissions. The group limit is sixteen total participants. A normalized pair
key deduplicates the same Standard DM. Lists/default reads never seed chats or
join a user automatically. Existing legitimate records are retained.

Every referenced conversation/message/history/search/bookmark requires current
membership. Secure session, account status, Origin, CSRF, expected-account ID,
body bounds and rate limits protect writes. Related effects and audit events
commit together, with active actor/object eligibility checked again at commit.

## Blocking and group management

Blocks prevent unwanted direct messages/requests/gifts and ineligible new
relationships. In an existing group, a block between two members or another
member's suspended account no longer prevents unrelated eligible members from
posting. The suspended sender remains unable to act. Group members retain their
legitimate access until removed/left; personal blocking does not cryptographically
hide group messages or retract earlier keys/plaintext.

Groups have a current owner distinct from platform administration. That owner
can change group metadata, add eligible accepted friends, remove members or
transfer ownership through scoped commit-time checks and atomic audits. Leave
is explicit; an owner with remaining members must transfer first. Addition
checks active identities, friendships, blocking and capacity. An added group
member can read its retained Standard history while membership remains active;
leaving removes API access but cannot erase copies already received. No
fabricated invitation or online state is inferred from creating a group.

Community text/announcement channels use their separate community owner,
moderator/member permissions and timeouts. The authoritative owner field and
role rows now have a database one-owner invariant. Concurrent transfers use
ownership revisions/CAS and cannot independently promote two owners. Invalid
older owner links are audited/quarantined for trusted infrastructure review,
not assigned using a public name. Community mention targets are stored as
immutable IDs, with edit-time membership validation; display names only render
those identities. Native restrictions do not revoke a Matrix membership.

## Message state and synchronization

Stable client IDs bind intended message payloads. Retrying a persisted operation
returns its result rather than duplicating text. Pending, accepted, failed and
retrying states remain separate; acceptance means server persistence, not that
another device delivered or read the message.

Each native/community message has a server-generated monotonic revision driven
by persisted change events, including reactions and deletion tombstones. The
client rejects older revisions from delayed polls, initial history or actions.
Related representation reads retain consistent message/reaction state. Bookmark
state has its own account-private revision so a personal save does not become
a public message mutation or resurrect a stale selection.

While open, conversations poll changes with honest timestamps/status. Extra
message/change pages drain promptly in bounded cancellable batches with backoff;
cursors advance only after the page is processed. This is not a simulated socket,
presence or delivery/read-receipt system. Real-time streaming remains a possible
future transport choice, not a substitute for ordering and authorization.

Keyed timeline updates preserve unrelated nodes, focused controls, composition,
selection and scroll anchors. Earlier pages preserve the reading position;
new activity does not force someone down from older history. Composer handling
respects IME composition. Full windowed rendering and large-history accessibility
still require further engineering and physical browser checks.

The current tab retains Standard drafts/failed sends in account/conversation-
scoped readable sessionStorage. That is separate from the protected Matrix vault.
Account lock/sign-out removes the current account's native draft/acknowledgment
keys. Never store passwords, sessions or encryption keys there, and never restore
an old account's draft into another account/conversation.

## Read state, filters, search and Saved

Viewed read state tracks eligible messages actually visible in the active
conversation/document. Merely loaded or background content is not viewed. Inbox,
profiles and secondary panels do not silently mark all history read. Explicit
bulk read actions are separate and accurately labeled. These viewport rules
have controlled UI tests; real phone/screen-reader behavior remains unverified.

Server filters cover the authorized account before pagination, including unread,
favorites, pinned, direct/group, archived and private folders. A short-lived
account-bound snapshot stores conversation positions and its selected filter.
Opaque cursor pages retain that order under new activity, deduplicate membership
and recheck current access. Expired snapshots/changed filters require refresh;
new activity/preferences can appear in a fresh snapshot. Offset compatibility
alone is not represented as stable cursor traversal.

Full-history Standard search validates source access for results and counts and
supports recognized people/date/scope/link filters. Native bookmarks sync private
source references between account sessions. Opening one rechecks the original;
deleted or no-longer-permitted content is unavailable, not a retained plaintext
permission bypass. Organization preferences/folders remain private metadata;
folder removal clears references without deleting histories.

Saved explains its distinct scopes: synced Standard source bookmarks, Matrix
self-only encrypted Saved, and independent encrypted device-only notes. Native
search may run on the server because its Standard text is already service-
readable. Protected Matrix search stays client-side over loaded decrypted data;
it never uploads plaintext to make a server index.

## Notifications

Optional generic native Web Push has real subscription and delivery code, tied
to configured server keys and deliberate user permission. Delivery eligibility
checks session/access, per-chat mute, preferences and quiet hours; events are
deduplicated. Payloads exclude message text. A queued test/provider receipt is
not proof a browser displayed a notification. Actual browser display remains
unverified; encrypted Matrix push is a separate incomplete integration.

## Schema, retention and operations

`0007_cloudy_orphan.sql` introduced six native messaging tables.
`0008_correctness_and_enrollment.sql` adds revisions/ownership, immutable community
mentions, private native bookmarks, list snapshots, Matrix enrollment records and
notification state. The complete 0000–0008 chain yields 56 application tables;
0008 adds 13 integrity/revision/activity triggers. Earlier applied SQL and genuine
accounts, histories, memberships and collectible ownership are preserved.

Account deletion revokes native authentication and removes private memberships,
preferences, bookmarks/snapshots and notification subscriptions under guarded
rules. Matrix identity/enrollment linkage can remain for audit/revocation; native
account deletion does not establish confirmed remote Matrix token revocation. It
anonymizes retained message authors rather than promising to erase recipient
histories. Ordinary group-owner Leave requires transfer first; native account deletion
uses the database's deterministic remaining-member succession (active members
first, then joined order/account ID). Community/platform-owner deletion has its
own transfer/protection rules. This never assigns platform administration.
Backups and exports must explain retained Standard plaintext. Local protected
SQLite backup/restore tests include community/native content; production D1
backup scheduling/export/restoration still needs trusted provider access.

## Availability and proof

Native text, replies, edits/deletion, reactions, deliberate read state, group
management, full-history search, private synced bookmarks, history and stable
filtered lists are implemented. Native file/voice upload, calls, verified presence
and recipient-delivered/read receipts are not supplied. Encrypted attachments,
voice, invitations, recovery and device operations use the separate configured
Matrix adapter. Native-to-Matrix restriction reconciliation and JWT-only provider
reauthentication remain incomplete; Standard is never a silent fallback.

Backend suites exercise actual handlers and migrated isolated SQLite, retries,
object access, blocked/suspended senders, ownership races, revision ordering,
large filtered lists and group management. Client checks use controlled DOM and
transport. Cryptographic library/storage tests establish their own boundaries.
These do not prove real browser/mobile keyboard, Web Push display, physical
passkeys, live Synapse/UIA or a two-device encrypted exchange. Release reporting
must distinguish those checks and use isolated disposable live test accounts.
