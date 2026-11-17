# Account organization, Saved, search and community tools

`worker/organize.mjs` stores account-owned organization metadata in D1. Its routes require an active native account session. Mutations require the session's CSRF token, an allowed Origin, the expected immutable account ID, bounded JSON, and rate limits. Native channel references require current community membership. Matrix references are opaque room identifiers; they confer no Matrix access and cannot retrieve encrypted content.

The versioned `0006_hard_tombstone.sql` migration adds `account_organization`, `organization_folders`, `organization_targets`, and `community_timeouts`, alongside the shared administrative audit/report records. Foreign keys preserve account, folder and native channel relationships. Existing memberships and message history are retained. Defaults are read without creating sample conversations or notification records.

## Organization and notifications

All, Unread, Favorites, DMs, Communities, Archived and custom folder filters share an account's metadata. Favorite, pin, archive, mute and folder changes affect only that account. They do not change membership, delete history or alter another account's list. Folder creation accepts a stable retry ID, has a 20-folder limit and atomically avoids duplicate creates. Deleting a selected folder clears its references and resets that account's list filter to All. Target reads are monotonic and native positions are clamped to the actual channel history.

Notification preferences cover DMs, mentions, replies, community activity, gifts, quiet hours and generic/content previews. Preferences persist; native push delivery is not configured. The UI does not request notification permission or claim successful push delivery. Opening Inbox does not mark conversations read. Per-conversation and bulk legacy read actions are explicit. Friend and gift request counts come from their actual account APIs. Native Inbox does not imply a complete encrypted-service activity feed.

## Saved has three explicit storage scopes

1. **This device** is an independently encrypted private-notes vault, available without a Matrix homeserver. A separate passphrase unlocks the secure-messaging module's IndexedDB vault. Notes, titles, links and tags are encrypted with authenticated encryption; plaintext is never sent to the organization API. A note may contain up to 16,000 characters. Search runs inside the unlocked client. Stable note IDs preserve retry behavior. The UI keeps unsaved drafts only in memory, clears them on account lock and warns before leaving the page with a draft. The vault does not sync. Losing the passphrase or clearing browser storage can make its contents unrecoverable. Account password recovery cannot recover this vault.
2. **Encrypted Saved** uses a verified Matrix client and an encrypted self-only room when the service is configured. Private notes are encrypted events; bookmarks store encrypted source references rather than plaintext copies. Resolving a reference still requires current room access and available device keys. A missing or revoked source appears unavailable. This scope is not usable merely because the native account is signed in.
3. **Legacy bookmarks** are existing native message references, retrieved through the permission-aware native Saved endpoint. They are not newly encrypted by this upgrade. Deleted or inaccessible sources are shown as unavailable and never restored from a plaintext copy.

Community-visible pins are separate from all three Saved scopes. Saved does not provide a pretend file-upload path.

## Search

Legacy search uses the existing authorized native search API, with full result counts, pagination, author/channel filters and strictly validated UTC date boundaries. Every result opens its exact source message and thread through the home navigation bridge. The server rechecks access when loading the source.

Encrypted search filters only the currently loaded decrypted timeline on the client, with text, author, date and link filters. It sends no message plaintext or query to a server index. Its result label states both the match count and loaded-history boundary. Unloaded or locked history is not silently included. Local Saved notes have a separate unlocked-vault search. Full encrypted-history indexing and encrypted file search remain future work.

## Community administration and reporting

Owners can update community details, manage invitations, promote/demote moderators and transfer community ownership. Staff can inspect paginated member and audit lists. Moderators can remove or restrict ordinary members; they cannot target owners or peers. The server checks these permissions independently of the UI. Member-directory responses expose public identity and scoped role, not private rich-profile fields. Profile reads delegate to the shared privacy-aware profile API.

Invitations have expiry, usage limits, explicit previews and revocation. The full invitation token is displayed when created; management lists expose status and usage without recovering secret link tokens. Opening a link never automatically joins a community.

Native restrictions are recorded in `community_timeouts`. New native plaintext sending is disabled, and these restrictions do not purport to revoke access to a separately managed Matrix room. Matrix room moderation requires the corresponding encrypted service integration.

Community permission changes and their audit entries are committed in the same D1 batch. Audit entries identify the authenticated actor and necessary action metadata without copying message content. Community owners and moderators receive no platform-owner privileges.

Reports require access to the source and explicit disclosure acknowledgement. The user may voluntarily provide selected text; the application never automatically copies encrypted messages or full histories. Reports are delivered to the platform owner's authorized review queue. Administrative access does not provide encryption keys.

## Focused verification

- `node backend/organize-test.mjs`: real Worker handlers, active native sessions and isolated migrated SQLite. Covers empty defaults, partial writes, access revocation, scoped folders, concurrent retry IDs, atomic deletion, monotonic reads, no protected text storage, explicit report disclosure, request protections, scoped moderation and rollback if audit writing fails.
- `node tests/voidline-organize-test.cjs`: controlled DOM/transport checks for read-only Inbox opening, truthful request counts, validated dates, stale search responses, escaped results, client-only encrypted search, local Saved unlock/no server note upload, failed-save retention, independent note IDs, account isolation and vault lock.

These are not browser-layout or live Matrix interoperability tests. Cryptographic vault and Matrix adapter tests live with the secure-messaging module. A configured external encrypted service is required before claiming cross-device encrypted messaging or Saved synchronization.
