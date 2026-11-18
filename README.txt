VOIDLINE: AFTERHOURS

APP
https://voidline-afterhours.pipedcactus1.chatgpt.site/

Create a native account with a unique username and a 12–128-character password.
New accounts have zero communities, conversations, sample contacts, gifts,
messages or invented activity. Existing legitimate records remain. Save the
one-time account recovery code in a password manager.

CURRENT UPGRADE
An edition3 art system with47 decorative badges,32 original gift designs and2
separate earned-award drawings. Accurate XRP, Max Stirner and Chudjak identities,
expanded meme family, authored optical miniatures, material illustration and
part-based reveals. The8 Telegram-inspired bases become original VOIDLINE
objects; no source NFT copies, ownership or market value are claimed.

A graphite/lime shell, deliberate empty home, dedicated Collection destination,
searchable/filterable catalog, full inspection, private profile shelf and clear
preview/grant/transfer/receipt states. Existing accounts, data and owned IDs stay.
Source and configuration are separate: see docs/UPGRADE-STATUS.md,
docs/ART-DIRECTION.md and REVIEW-COVERAGE.md for evidence and remaining work.

MESSAGING AND PRIVACY
Standard messages and their private R2 attachments are service-readable. HTTPS,
session authorization and scoped permissions protect access; this mode is not
E2EE. Add an accepted friend, choose Message, review the Standard disclosure and
create a direct conversation or group. No encrypted send falls back to Standard.

Stable IDs, idempotent writes and monotonic revisions prevent retries and delayed
responses from duplicating or replacing newer content. The ordered Standard
IndexedDB queue contains readable device-local text, with individual states,
retry/cancel and atomic leases. A failed head pauses later items. Tab drafts are
separate. Cancellation cannot undo a server-accepted send. No recipient-delivery
or online/presence claim is inferred from server acceptance.

Standard search covers accessible retained history. Bookmarks and exports
recheck current permissions. Seven export scopes require recent authentication
and an explicit warning that downloads are readable plaintext. They exclude
passwords, authentication/recovery secrets, Matrix content/keys, device-only
Saved notes and uploaded file bytes. Browser exports are bounded at 10MiB/10k
records and are not an atomic database backup.

Private profile media follows current profile visibility and blocking. Avatar
and banner crop locally before staged upload; Save commits the actual reference.
Standard files/voice use private R2 with current-access reads, stable digests,
atomic message claims, ranges and durable cleanup. Browser/microphone/Canvas
acceptance still needs actual devices.

ENCRYPTION AND IDENTITY
The separate maintained Matrix 45.1/Rust 18.9.2 integration retains verified-device
checks, no plaintext fallback, protected local keys/outbox, encrypted attachments
and resumable recovery. Password changes rewrap the stable local-store credential;
account password recovery cannot restore missing encryption keys. Earlier-history
search indexes locally after decryption with bounded, labeled coverage.

No Matrix homeserver exists yet. Operated enrollment, namespace reservation,
complete community/block reconciliation and actual two-device recovery/media
acceptance are incomplete. Encrypted-by-default remains OFF. Native and Matrix
policy lifecycles are separate; supported remote operations queue only verified
managed mappings and report actual retry/completion state.

Native passwords use maintained Argon2id. Sessions are revocable HttpOnly cookies
with CSRF/origin/account checks and server-side status/permissions. Google and
verified-email recovery require actual provider configuration. They are not
fabricated by buttons. The intended platform owner is @xrp; a matching username
never grants authority. Follow docs/OWNER-BOOTSTRAP.md using authenticated native
account/passkey proof and trusted immutable-ID configuration. A community owner
never becomes platform administrator. No dashboard decrypts all private messages.

COLLECTIBLES AND LOCAL DATA
All existing cosmetic IDs, gifts, earned awards and legitimate ownership
remain. The expanded catalog contains47 decorations and32 original gifts. Free cosmetic art is distinct from authoritative achievements and actual
roles. Gift grants and accepted transfers use atomic server ownership; a replay
is available only after an acknowledged receipt. No financial/token-balance or
official-affiliation claim is made by crypto/meme artwork.

Independent local Saved notes use their own encrypted device-only vault. Previous
local archives are reviewed explicitly, never silently uploaded or trusted to
mint ownership. Recovery, retention and export scopes are explained separately.

OPERATIONS
The Worker uses native managed D1(DB) and private R2(MEDIA). Migration 0009 is
additive; applied 0000–0008 are unchanged. A narrow operator-restricted Site MCP
writer processes queues and creates encrypted hosted D1 snapshots. Actual
connected schedules, backup-key retention, R2 file backup and a real production
restore drill need separate verified setup. See docs/OPERATIONS.md and
BACKUP-RESTORE.md. A local restore test does not establish production recovery.

DOWNLOADS
 /downloads/voidline-improvement-prompt.txt  complete current artwork/product brief
 /downloads/voidline-source.zip             source without runtime credentials
 /downloads/voidline-offline.html           offline archive/recovery viewer
/art-review.html                          public artwork and motion inspection
The offline viewer cannot sign in or exchange network messages. These files are
not a signed desktop installer. Deliberate recovery exports may contain plaintext.

BUILD AND CHECKS (Node 24 and Python 3)
 npm ci --no-audit --no-fund
 npm run test:server
 npm run test:client
 npm run check:restore
 npm run build
 python3 build_offline.py
 npm run build
 node scripts/check-build.mjs

Media's shared generated validator must exist before the offline bundler. The
final build embeds matching downloads into the self-contained Worker. Preserve
Sites-managed HTTP compression, the static ChatGPT frame-ancestor allowlist and
the exact existing project_id/public audience during publication.

PROOF AND REMAINING WORK
Current checks cover migrated SQLite, actual local workerd/D1/R2, WebCrypto,
maintained attachment encryption and controlled provider/client interfaces.
Hosted temporary-account/media/stream/asset checks are reported separately.
Interactive browser/mobile keyboards, real zoom/screen readers, actual closed-
browser push receipt, Matrix two-device recovery and independent external
security review are not claimed. Calls/video/screenshare need real signaling,
STUN/TURN/media infrastructure and cross-network verification.
