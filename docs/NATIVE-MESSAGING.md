# Built-in standard messaging

VOIDLINE can exchange text through its own authenticated Worker and D1 database.
It does not require a Matrix account. This is a separate, explicit mode called
**Standard messaging**, not an automatic fallback for encrypted content.

## Security boundary

A new direct or private-group conversation requires an explicit explanation and
confirmation: HTTPS protects network transport; the service stores readable text
in D1; standard conversations are not end-to-end encrypted. The server verifies
`acknowledgeStandard: true` on creation and content mutations. Conversation
`security_mode` is constrained to `standard`; identifiers cannot select a Matrix
room. The client checks the returned mode before showing a composer. Existing
Matrix messages, drafts, outbox records, rooms and keys never move into this API.

Standard conversation confidentiality depends on authenticated API permissions
and operational database access. A trusted database operator can read its text.
The owner dashboard does not provide a universal message-reading interface.
Account login, server backup encryption and Matrix message encryption remain
separate systems. Existing historical D1 text remains plaintext; it has not been
retroactively encrypted by this change.

## Conversations and permissions

`worker/messages.mjs` serves `/api/messages/*`. Creation supports a direct message
to one accepted friend or a named group with up to fifteen invited friends.
The server checks accepted relationships, current account status, blocks and
current sessions, including at commit. A normalized pair key allows only one
standard DM for the same accounts. Opening a list or invitation does not create
a conversation. New accounts remain empty.

Every conversation/history/message reference is checked against current
`native_members`. Session cookies, origin, CSRF, expected immutable account ID,
request size and rate limits protect mutations. Usernames only find recipients;
they never confer permission. The current conservative group rule blocks new
content while a participant is suspended or a blocking relationship conflicts.
It can require participant departure or an operator resolution; there is not
yet a complete group-management interface. Own message deletion remains possible
with an active authorized session even when new content is restricted.

Existing community text/announcement channels use their scoped membership,
roles and timeout rules. New content requires explicit standard-mode consent.
Announcements restrict sending to authorized staff. Their actual capability
and `endToEndEncrypted: false` are returned to the client. Native restrictions
do not change independently managed Matrix membership.

## Reliability and organization

Message client IDs are stable and bound to the original payload. Retrying an
acknowledged send returns that operation rather than duplicate text. Pending
and failed messages are shown separately from server-acknowledged history.
Replies, author edits/deletions, reactions, exact links, earlier pages and
change cursors are persisted. Changes synchronize while the conversation is
open using five-second polling, not a simulated live socket or fake presence.
Acknowledgment means server acceptance, not delivery or reading by a human.

The current tab stores account-and-conversation-scoped standard drafts and
failed sends in sessionStorage. This is readable local storage, not the protected
Matrix vault. The UI explains that distinction; sign-out, account lock and
revocation clear the current account's native draft/acknowledgment keys. Never
store passwords, session tokens or message-encryption keys in those drafts.

Read state is deliberate; opening Inbox does not mark anything read. The client
can explicitly mark viewed messages. Organization uses a separate
`native_conversation_preferences` table, with private favorites, pins, archive,
mute and folders. Native conversation references require membership; old
metadata disappears from responses after access loss. Folder deletion clears
references. Inbox uses real standard-conversation summaries and counts. Loaded
native search states its scope and opens exact sources. Full-history native-DM
server search and a combined cross-mode unread/push system remain future work.

## Schema and retention

Additive migration `0007_cloudy_orphan.sql` adds six native tables: conversations,
members, messages, reactions, changes and conversation preferences. The complete
0000–0007 chain contains 47 application tables. Previous migrations and genuine
records are preserved. Constraints cover membership, native security mode,
conversation/message retry IDs, direct-pair uniqueness and source relationships.

Deleting an account revokes its authentication and removes native preferences
and memberships under the existing atomic credential guard. It tombstones the
account identity while preserving legitimate conversation history with an
anonymized author. Other active group participants can continue. This is not a
promise to erase every message from recipients' histories. Database snapshots
must be protected accordingly. Local encrypted backup/restore tests include
both community and native text; hosted D1 backup operations remain a provider
infrastructure task.

## Availability and proof

Native messaging currently supports text, replies, edits, deletes, reactions,
read state and history. Native file uploads, voice notes, calls, push delivery,
full group administration and verified presence/read receipts are not supplied.
Encrypted attachments and voice have a separate Matrix adapter and require its
configured service and device verification.

Backend tests exercise actual handlers, opaque sessions and migrated SQLite,
including simultaneous retries, object permission checks, blocks, suspension,
revocation and before-commit races. Client tests exercise controlled DOM and
transport behavior. The independent review covers account deletion/history,
source deletion and revoked membership. These are not browser, mobile keyboard,
physical passkey or live Matrix acceptance tests. Live release checks use
isolated temporary accounts and remove them afterward.
