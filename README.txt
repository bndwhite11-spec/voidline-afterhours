VOIDLINE: AFTERHOURS

APP
https://voidline-afterhours.pipedcactus1.chatgpt.site/

Create a native account with a unique username and a 12–128-character password.
New accounts have no joined communities, conversations, sample contacts, gifts,
messages or invented activity. Genuine existing accounts and records remain.
Keep the one-time account recovery code safely in a password manager.

CURRENT UPGRADE
This release follows the version 14 review. It fixes community ownership races,
stale message updates, group-wide blocking, loaded-page-only filters and the
split native search/Saved experience before adding more decoration.

Standard messaging is available between VOIDLINE accounts. Add someone by
username, have them accept the request, select Message, review the disclosure,
and create a direct conversation or group. The service stores readable text
in D1 over HTTPS; Standard messages are not end-to-end encrypted. Encrypted
Matrix rooms, keys and pending content never fall back into that mode.

Native messages have server-generated revisions. Delayed polls cannot replace
newer edits, reactions or deletion tombstones. Keyed timeline updates preserve
unrelated focused controls and composition. Backlog pages drain promptly in
bounded batches, with explicit catching-up and retry states. Read acknowledgments
use actually viewed content in the active document, rather than the highest
merely loaded message. Opening Inbox or a profile does not acknowledge a chat.

Conversation filters cover the account through stable, short-lived snapshots;
a favorite, unread or foldered conversation can appear beyond the first page.
Each page rechecks access. Full-history Standard search and synced source
bookmarks respect current membership, deletion and private-preview settings.
Groups have owner-checked name/member/ownership controls and explicit Leave.
A personal block prevents unwanted direct delivery; it no longer freezes
unrelated eligible group members. Existing authorized group members may still
see group content. Blocking is not cryptographic removal.

Community transfers use an authoritative immutable account-ID relationship,
commit-time checks and database invariants. Invalid older ownership links are
quarantined/audited for trusted infrastructure review, never assigned by a
public handle. Community mentions store account IDs; mutable display names
cannot redirect them to another person.

ENCRYPTED MESSAGING
The maintained Matrix SDK/Rust crypto path remains separate. A supported,
configured Synapse provider can enroll an ordinary VOIDLINE account without
pasting an access token or inventing a second storage password. Native password
confirmation unlocks a client-derived device vault; identity and device checks,
verification, in-app invitations and encrypted media stay on the Matrix path.
Advanced manual connection is separate from the normal enrollment flow.

Recovery resumes completed secret-storage/signing/backup steps without resetting
existing keys. A backup-ready state is distinct from a verified restore. Local
locking is immediate; the interface reports whether remote logout is confirmed,
failed or unknown. Unsupported homeserver reauthentication remains an explicit
error with retained recovery state.

No Matrix homeserver is configured for this release. Native-to-Matrix suspension,
block and room-permission reconciliation, JWT-only UIA restrictions and actual
multi-device acceptance remain open. New private chats are not presented as
secure-by-default merely because provider fields exist. See ENCRYPTED-SETUP.md
and ENCRYPTION-DECISION.md for the exact provider requirements and boundaries.

NOTIFICATIONS, COLLECTIONS AND PROFILES
Optional browser Web Push uses generic native-activity notifications and real
subscription/delivery code when server keys are configured. Permission is asked
only after the user enables it. Message text is excluded from push payloads;
mute, quiet hours and session/access checks apply. A queued test or provider
acceptance is not proof that a physical browser displayed a notification.
Actual browser delivery remains unverified, and Matrix encrypted push is a
separate unfinished integration.

Preserved: 21 original free cosmetic badges, 12 gift designs, legitimate
owned-instance transfers, earned-award rules, three showcase slots and profile
privacy. Cosmetics never grant roles or imply token holdings/financial value.
Avatar/banner/accent presets remain previewable. File uploads/cropping, full
profile frames/nameplates and broader wearable-gift ideas are future scope.

The graphite/ice-blue interface, original chrome artwork and brief skippable
entry reveal remain. Returning sessions, recovery links and reduced motion skip
the reveal. The supplied TikTok clip was inaccessible; no reproduction is claimed.
Public help pages explain security models, recovery, privacy, terms and support.

ACCOUNT SECURITY AND STORAGE
Native passwords use maintained Argon2id; older valid hashes upgrade after
successful login. Opaque secure sessions, CSRF, status/revocation checks and
WebAuthn step-up remain. Google OIDC and verified email/reset delivery require
real provider credentials. Availability is shown truthfully.

@xrp is the intended owner handle, not proof. Only a signed-in passkey-verified
claim and trusted infrastructure binding can establish the immutable platform
owner. A community owner is not a platform administrator. See OWNER-BOOTSTRAP.md.

D1 remains authoritative. Migrations 0000–0008 yield 56 application tables; 0008 adds
ownership/mention/revision, snapshot, bookmark, Matrix-enrollment and notification
records plus 13 integrity/revision/activity triggers. Applied older migrations
are unchanged. Account deletion removes private membership/preferences and
credentials, then anonymizes authors in legitimate retained recipient history.
An owned native group passes to a deterministic eligible remaining member;
community/platform ownership has separate deletion protections.

Standard drafts and failed sends use readable per-account/per-conversation tab
storage and clear on account lock/sign-out. Independent local Saved notes use
a separate encrypted device-only vault; they are not cloud-synced or restored
by an account password reset. Existing local archives are reviewed explicitly,
never silently uploaded or trusted to mint official ownership.

KNOWN REMAINING WORK
Native file/voice uploads, calls/video/screenshare, authoritative presence/read
receipts, full-history encrypted indexing, full timeline windowing, custom avatar
uploads, complete cross-service moderation and hosted backup restoration remain
unfinished. Local backup tools/isolated restore tests do not prove production
backup scheduling. Browser/mobile keyboard/screen-reader/device checks require
actual interactive tooling; controlled UI tests are identified separately.

DOWNLOADS
  /downloads/voidline-improvement-prompt.txt  current 4,769-word review-based brief
  /downloads/voidline-source.zip             source without runtime credentials
  /downloads/voidline-offline.html           offline archive/recovery viewer
The offline viewer cannot sign in or exchange network messages. These files are
not a signed desktop installer. Recovery exports may include plaintext history.

BUILD AND CHECKS (Node 24 and Python 3)
  npm ci --no-audit --no-fund
  npm run test:server
  npm run test:client
  python3 -m pip install -r requirements-backup.txt
  npm run check:restore
  npm run build
  python3 build_offline.py
  npm run build
  node scripts/check-build.mjs

Authored application files live in dist/; generated bundles/downloads have a
separate build contract. DEVELOPMENT.txt and docs/UPGRADE-STATUS.md describe
architecture, release checks, infrastructure gates and exact verification limits.
The strict CSP permits only same-site/known ChatGPT preview framing; do not
restore frame-ancestors none or broaden it to arbitrary reflected origins.
