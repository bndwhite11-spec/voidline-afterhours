# Review-guided upgrade: actual delivery boundaries

The supplied review was checked against published version 14, commit cd59329.
The existing Site, audience, D1 binding, accounts, histories, memberships and
legitimate cosmetic ownership are preserved. The complete requirement brief is
VOIDLINE-MEGA-IMPROVEMENT-6.txt; it includes all 19 sections. A requirement in that
brief is not a claim of completed delivery.

## Implemented correctness

- Community ownership uses an authoritative account ID, commit-time ownership
  revision/CAS, consistent role transitions, database constraints and atomic
  audit records. Stale simultaneous transfers fail. Existing inconsistent
  communities are normalized only from a legitimate active authoritative
  member; missing/inactive authority is quarantined, not guessed or joined.
  Authorized history remains readable while repairs need trusted operators.
- Standard native/community message representations carry monotonic server
  revisions, including reactions and deletion tombstones. Client merging rejects
  stale polling/history responses. Private bookmark state has its own revision.
- Personal blocks still prevent unwanted DMs and requests, but do not freeze
  unrelated eligible members in a shared Standard group. Suspended authors
  cannot post. Shared membership is not cryptographic isolation from a peer.
- Native group controls include name, membership, management transfer and leave.
  Existing eligible group members receive audited legacy management repair where
  needed. Group authority never grants community or platform administration.
- Explicit viewed-read behavior checks actual viewport eligibility and document
  visibility/focus. Loaded history and Inbox opening do not silently mark read.
- Message/change backlog processing drains bounded pages promptly with context
  cancellation and truthful catch-up/error states. Account-wide server filters
  use expiring account-bound snapshot cursors, current authorization and stable
  page cohorts. First-page liveness is separate from stable paged browsing.
- Community mention targets use immutable account IDs, unique-handle lookup and
  authoritative stored references. Renames or matching display names cannot
  redirect mentions. Edits/deletions reconcile targets atomically.

## Implemented everyday experience

Full-history Standard DM/group search is permission-aware and accepts familiar
people/date/link filters. Results open exact sources. Unified Saved labels synced
Standard bookmarks, encrypted references and device-only notes distinctly.
Lost access/deleted sources become unavailable rather than reveal old content.

Content-free account activity updates native/community unread, friend and gift
counts without rebuilding focused message content. Quiet hours use a validated
IANA time zone. Conversation previews respect private-preview settings and drafts.
Native timeline updates preserve unaffected DOM nodes, focus and selection;
composer input grows to a cap and Enter respects IME composition. Profile
artwork and profile-card components are reused instead of arbitrary initials.

Browser push uses a real opt-in service-worker/subscription flow and maintained
WebCrypto Web Push encryption. Payloads are fixed generic activity text, not
message previews. Durable content-free events, delivery leases, source/session
rechecks, mute/read/block/quiet-hour suppression and bounded retries are tested.
Runtime keys and physical browser delivery status are recorded in the release
report; a key alone does not establish successful device display. Retries are
currently driven by authenticated app traffic, not an independent scheduler.

Public help explains Standard/encrypted/local-vault boundaries, recovery,
account deletion, cosmetics, support and basic product terms before signup.
The 21 free cosmetic badges, 12 gift designs, earned awards, ownership and transfer
rules are retained. No cosmetic grants identity verification or administrative
powers. The brief covers further profile personalization without claiming it is
already implemented.

## Implemented encrypted integration, awaiting a real service

The normal enrollment path uses an authenticated immutable VOIDLINE account,
recent native authentication, server-consumed short-lived Synapse JWT login,
a reserved provider namespace and a freshly allocated verified Matrix device.
The ordinary account password unlocks an encrypted local credential envelope;
users do not enter raw Matrix tokens or a second storage password in this path.
No raw token/JWT is stored server-side or in ordinary browser storage. The
advanced manual Matrix connection remains clearly separate.

The adapter/UI now include pending invitations, accept/decline, ignore/block,
member invitation/cancellation, leave, role-authorized removal, device comparison
and verification, and truthful remote-revocation results. Local locking occurs
immediately; a failed/unknown remote logout is not presented as confirmed.

Recovery has an encrypted resumable local journal, explicit progress, supported
public signing upload retry and authentication challenge handling. Existing keys
and backups are preserved; automatic backup-version deletion is blocked.
Recovery setup readiness is separate from actual restored-history verification.
Password recovery and independent local Saved recovery remain distinct.

**The owner confirmed there is no Matrix homeserver yet.** No real encrypted
exchange, multi-device key recovery, operated-service UIA or encrypted attachment
lifecycle has passed acceptance. The pinned Matrix 45.1 / Rust 18.9.2 foundation is
maintained; controlled SDK tests are not a substitute for a real deployment.

A compatible operated Synapse service must support the documented JWT login,
reserve its application account namespace, provide HTTPS/browser access and
support the required interactive authentication and device-revocation flows.
JWT login alone does not provide every Matrix UIA stage. Native suspension,
blocks and roles do not yet revoke independently issued Matrix tokens or room
membership. The API therefore keeps encryptedDefaultReady:false and
accountRestrictionsSynced:false. Standard conversations stay an explicit,
service-readable mode; encrypted sends never silently fall back to it.

See ENCRYPTED-SETUP.md for exact operator settings and acceptance steps.

## Data, operations and identity

Additive 0008_correctness_and_enrollment.sql extends immutable migrations 0000–0007
to 56 application tables. It adds revision/ownership safeguards, immutable mentions,
private bookmarks and snapshots, enrollment metadata and notification records.
Migration tests cover existing histories, duplicate owners, quarantine without
invented membership, audited native-group succession and no notification backfill.
Fresh local workerd D1 and foreign-key checks are part of verification.

Argon2id passwords, secure revocable native sessions, CSRF, server permissions,
passkeys and verified-owner bootstrap are retained. @xrp remains an identity hint,
not proof; no owner is bound by matching that handle. Google/email integrations
still need real provider credentials. Native login works independently.

Account deletion clears newly private bookmarks, snapshots and push subscriptions,
removes native membership and anonymizes retained authors under the existing
credential guard. Legitimate recipient history can remain. Matrix account/token
lifecycle is separate; it is not falsely described as deleted remotely.

Encrypted SQLite backup/restore verification covers the current schema and native/
community history. Hosted D1 export, backup scheduling and isolated provider
restoration still require infrastructure access. A blind rollback to an older
Worker is unsafe after credential/schema changes; prefer a compatible roll-forward.

## Intentionally unfinished or unverified

- Real Matrix provisioning, policy reconciliation, UIA compatibility and complete
  two-user/multi-device encrypted acceptance; encrypted-by-default remains off.
- Real Google/email provider acceptance and verified owner binding.
- Physical browser push permission/background delivery and an independent retry
  scheduler; generic native push does not provide Matrix push integration.
- Full-history encrypted local indexing, native media/voice uploads, avatar/banner
  file upload/cropping, complete windowed long-history rendering and account-wide
  data export beyond current explicit recovery/export tools.
- Calls, video and screen sharing with actual signaling/TURN/media architecture.
- Real phone keyboard, 320/375/390/768/1024/1440-pixel viewports, zoom, touch and screen
  reader acceptance. Supported interactive browser controls are unavailable.
  Authenticated/mobile/admin screenshots are not fabricated.
- Production backup retention/restore proof and qualified integration review.

The release report lists exact executed tests and live checks. Local SQLite,
cryptographic primitive tests, controlled SDK/DOM tests, hosted screenshots,
HTTP smoke checks and physical-device acceptance remain distinct evidence.
