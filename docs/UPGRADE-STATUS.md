# VOIDLINE delivery status: loading, collections and account messaging

This upgrade starts from the existing public version 12 source a284c4e. It keeps
the same Site, database, accounts, histories, community memberships and genuine
ownership. The TikTok clip could not be played through the available tools.
The loading design is original, not a verified reproduction of that reference.

## Implemented scope

- Built-in native account DMs and private groups, with accepted-friend creation,
  explicit Standard messaging consent and durable server text. It removes the
  requirement to configure a separate Matrix account merely to start a chat.
- Scoped community text/announcement sending, with explicit mode consent,
  author/role/timeout checks, replies, edits/deletions, reactions and read state.
- Native message stable retries, pending/error states, earlier history, exact
  source links and five-second change polling. Organization includes private
  native favorites, pins, mute/archive and folders. Inbox opening is read-only;
  loaded account search states its scope and source. Friends has a Message
  action that opens review, never creates a conversation without confirmation.
- Original chrome entry reveal, skippable/Escape, bounded to 1.19 seconds, bypassed
  on reduced motion, returning sessions, recovery links and offline copies.
  No fake progress percentage or simulated connection status.
- Twelve additional original free badge designs: six crypto-culture and six
  internet memes. Total 21 cosmetic badges and 12 gift designs. Category/Collected
  filters, distinct inspectable artwork and actual server-owned/equipped state.
- A 2,480-word plain-text improvement prompt with Telegram gift and Discord
  profile customization research. Broader proposed frames/nameplates, gift
  collections and wearable effects are plans rather than claimed completion.
- Additive migration 0007_cloudy_orphan.sql, six new native messaging tables;
  complete 0000–0007 schema totals 47 application tables. Applied earlier SQL is
  unchanged. Account deletion removes native preferences/membership and
  anonymizes retained message authors under the existing guarded transaction.
- Encrypted local backup/restore fixtures now include both community and native
  history. Native organization metadata requires current membership and folders
  clear references on deletion. Existing native auth, passkeys and owner proof
  requirements are retained.

## Security modes

Standard messaging uses HTTPS and permission-checked server persistence. The
service/database operator can read its message text. The UI and API label it
not end-to-end encrypted. New conversations and content require explicit mode
acknowledgment. It is a distinct mode, not a fallback for Matrix conversations,
protected drafts or outbox data. Native sessionStorage drafts are readable local
storage, isolated by account/conversation and purged on lock/sign-out; that is
separate from the encrypted local Saved/Matrix vault.

The optional maintained Matrix SDK/Rust crypto path remains unchanged and
unconfigured. Its existing tests use controlled transport; no real homeserver,
physical-device verification, group rekeying or recovery acceptance is inferred.
A native account or community does not create a Matrix identity or room. Full
E2EE product acceptance still requires operated infrastructure and identity/
permission integration. Existing plaintext history is never relabeled E2EE.

## Authentication and ownership

Native username/password login works without provider setup. Passwords use
maintained Argon2id, and older valid password hashes upgrade on successful login.
Google OIDC and verified email/reset delivery are implemented but require actual
provider credentials in the host's server secret store. Their configured state
remains truthful. No OAuth/client credential or account database goes into the
public source or browser bundle.

@xrp remains the intended owner handle, not authentication evidence. No owner is
assigned by username, first registration, client flags or community ownership.
The actual account holder must sign in, enroll/verify a passkey and create an
Owner verification request; trusted infrastructure resolves its immutable ID
and performs the one-time atomic binding. No production owner is bound merely
by this release. See OWNER-BOOTSTRAP.md.

## Verification boundaries

Focused implementation suites exercise actual handlers and migrated SQLite,
including object access, friendship/block rules, roles, retries, session/account
revocation and deterministic commit races. An independent handler review covers
account deletion, preserved anonymized history, remaining group messaging,
source deletion and revoked membership. Client checks use controlled DOM and
transport, and loading checks use a controlled clock; they are not physical
browser, animation, keyboard or microphone acceptance.

Full server/client runners, backup restore and built Worker asset/migration
checks are run for packaging. Public release checks compare served bytes and
use isolated temporary accounts for standard message exchange, retry and
mutation synchronization; release reporting records the actual results rather
than assuming successful deployment proves these flows.

## Remaining limits

Native uploads/voice notes, calls/video/screenshare, push delivery, complete group
management, full-history DM search, verified presence and recipient-read receipts
remain unavailable. A suspended participant currently blocks new content in a
native group until resolved; account deletion removes membership so remaining
participants can continue. Matrix moderation remains separate from native roles.

Google/email need provider settings. Full E2EE needs Matrix infrastructure and
integration. Hosted D1 export/backup scheduling/restoration needs provider
infrastructure controls; local restore tests do not prove production retention.
The owner must complete authenticated proof. Supported interactive browser
controls are unavailable, so mobile/device acceptance and authenticated
conversation/profile/gift/admin screenshots are not claimed.

## References and deliverables

- VOIDLINE-MEGA-IMPROVEMENT-5.txt: detailed copyable plain-text implementation brief.
- NATIVE-MESSAGING.md: standard-mode architecture, authorization and retention.
- COSMETICS.md: current 21 badge / 12 gift catalog and legitimate ownership rules.
- ENCRYPTION-DECISION.md and ENCRYPTION-THREAT-MODEL.md: separate Matrix/vault model.
- AUTHENTICATION.md, OWNER-BOOTSTRAP.md and BACKUP-RESTORE.md: operator procedures.

The source ZIP and offline viewer are downloadable; the offline viewer cannot
sign in or perform shared messaging. The plain-text prompt has its own download.
These outputs do not constitute a signed desktop installer.
