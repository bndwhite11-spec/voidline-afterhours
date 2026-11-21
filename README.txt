VOIDLINE: AFTERHOURS

APP
https://voidline-afterhours.pipedcactus1.chatgpt.site/

WEB RELEASE v1.0.5
The messenger now loads optional tools when needed, confirms friend requests
before sending, and preserves the open conversation during profile and search
navigation. Eight collectibles have revised artwork and motion. See
docs/QUALITY-RELEASE.md for measured results, known limits and rollback.
Android 1.0.3 and Windows 1.0.0 use the updated web interface.

Create a native account with a unique username and a 12–128-character password.
New accounts have zero communities, conversations, sample contacts, gifts,
messages or invented activity. Existing legitimate records remain. Save the
one-time account recovery code in a password manager.

INSTALL ON IOS, ANDROID AND PC
Share https://voidline-afterhours.pipedcactus1.chatgpt.site/ with friends.
Each person creates their own username/password account; ChatGPT is not needed.
Install and downloads: https://voidline-afterhours.pipedcactus1.chatgpt.site/install.html
Android file: /downloads/VOIDLINE-Android.apk (signed APK, Android 7.0+).
Download it, open the file from Downloads and choose Install. Android may ask
you to permit installation from your browser. A compatible browser and internet
connection are required by the Trusted Web Activity client.
Windows file: /downloads/VOIDLINE-Windows-x64.zip (Windows 10+, x64).
Extract every file, then run VOIDLINE.exe from the extracted folder. This preview
is not Windows code-signed. It uses an isolated, sandboxed Chromium client.
Android browser alternative: Chrome menu > Install app / Add to Home screen.
iPhone/iPad: Safari > Share > Add to Home Screen > Open as Web App > Add.
PC: open the site in Chrome or Edge and use the browser's Install app option.
Mac: Chrome/Edge installation or Safari > File > Add to Dock when available.
The install page's button opens a browser prompt only when the browser supplies
one; otherwise it shows device instructions. The installed state is reported
only after an installed event or a standalone app launch, never from a click.
Open Friends, enter an exact username and choose Find. Review the matching
handle, then select Send request. Once accepted, choose Message. An internet connection is required. Home Screen
installation and physical keyboards still require actual-device acceptance.
The APK and Windows ZIP are real application packages using the same hosted
accounts. Android 1.0.3 uses the existing app ID and signing key. Open the
downloaded APK and choose Update to install it over an earlier release.
If the launcher closes, open https://voidline-afterhours.pipedcactus1.chatgpt.site/chats
in Chrome or Samsung Internet to use the same account.
No App Store or Play Store listing is claimed. Native iOS source is prepared in
native/ios, but an installable IPA still needs an Apple team, Xcode build/signing
and distribution. The Safari option remains available on iPhone/iPad and Mac.

CURRENT UPGRADE
Edition4 uses actual credited web artwork for49 decorative badges,32 gifts and2
separate earned-award images. Blockchain and Ledger join the crypto selection.
LARP PRO MAX uses a real armor photograph; recognized memes and crypto marks use
actual source images. Conventional source-image collages are disclosed. No image
generation is used for the current badge/gift art.

Source thumbnails stay small, detailed images load on demand, and gifts have
short optional image opening effects. Credits and source links appear in item
inspection and /art-review.html. The graphite/lime shell, empty home, Collection,
profiles, privacy and persistent account/ownership rules remain. See
 docs/UPGRADE-STATUS.md and docs/WEB-ART-SOURCES.md for exact evidence and scope.

PROFILE IMAGES
Open your profile > Edit profile. The studio groups controls into Identity,
Images, Style, Decorations, Showcase and Visibility. Its live preview combines
your choices; on a narrow screen, use Edit and Preview to switch views.
Open You > Appearance & accessibility to change your own view. Pick a palette
or set custom background and accent colors, choose text size and message
spacing, then select Apply. These settings belong to your signed-in account on
this device. The preview lets you try a look before saving it.

For the color other people see on your profile, open Edit profile > Style >
Custom profile color. Save profile publishes the accent to permitted viewers.
Private saved looks can also remember that color.

Under Images > Avatar or Banner, choose Upload image or GIF. For a still image,
adjust the crop and choose Use this crop. For a GIF, inspect the real local poster
and choose Play GIF to preview motion, then Pause GIF to return to its poster.
The selected preview uses the saved centered fit: square avatar or 3:1 banner.
Choose Use this GIF to upload the unchanged original. Then Save profile publishes
the change; uploading alone does
not replace your saved profile. The image editor brings its confirmation controls
into view. Selection, upload and save states appear beside the image tools; a
failed selection displays an error rather than claiming the image was saved.
Failed uploads can be retried, and Discard changes keeps your saved profile.
Preset avatar/banner choices replace only that image after Save profile. The
Uploaded image option identifies an active custom photo; changing a preset is an
explicit replacement. An unchanged Save is disabled, and Discard closes a clean
editor. Empty earned-badge controls show requirements instead of unused slots.

Profile imports include JPEG, PNG/APNG, WebP, GIF, AVIF, HEIC/HEIF, BMP, ICO,
self-contained SVG and supported uncompressed TIFF variants, up to 8 MiB.
AVIF uses the browser codec; HEIC and TIFF use local decoder tools. Complete JPEG phone photos
with appended camera data use their primary still image in the crop editor.
Extra motion/video data is excluded; incomplete primary images still fail.
GIFs keep their original
frames, with centered cover framing rather than an encoded crop. GIFs must fit
1024 x 1024 pixels, 200 frames, a 30-second loop and the total decoded-pixel
budget; a large animation may need fewer frames. Invalid or oversized files show
an error. The original GIF is retained, including any embedded metadata.

Profiles initially show a still first frame. Choose Play GIFs on a profile to
animate its avatar/banner, or Pause GIFs to stop. Inline message/list avatars
stay still. Reduced-motion settings take priority. Allow GIF playback on my
profile appears when a GIF is selected; turning it off removes the Play control.
Local selection playback also stops when hidden, offscreen, replaced or canceled.

Use Showcase to arrange up to three owned gifts. Removing a showcase slot keeps
the gift in your inventory. Visibility separates profile details from collection
and showcase access. An avatar remains basic identity for permitted friends and
shared-community viewers; the banner follows the profile-details audience.
Public means signed-in viewers, and blocking takes priority. Audience previews
illustrate those rules; they do not sign in as another person or publish a draft.

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

Private profile media, including GIF originals and still previews, follows current
profile visibility and blocking. See docs/MEDIA-AND-PROFILES.md for upload limits.
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

On the existing hosted Site, the intended @xrp account was verified and bound on
19 November 2026; bootstrap runtime values were removed afterward. The bound
owner opens You > Platform administration > Accounts to block/unblock accounts,
revoke sessions, request verified-channel recovery, or delete a non-owner account
with its exact ID and an audited reason. Deletion keeps anonymized shared-history
references and legitimate provenance. Community owners must transfer ownership
first. A matching name, free badge or community role cannot use these controls.

COLLECTIBLES AND LOCAL DATA
All existing cosmetic IDs, gifts, earned awards and legitimate ownership
remain. The expanded catalog contains49 decorations and32 gifts. Free cosmetic art is distinct from authoritative achievements and actual
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
 /downloads/VOIDLINE-Android.apk            signed Android application package
 /downloads/VOIDLINE-Windows-x64.zip        Windows x64 portable app
 /downloads/voidline-release.json           public versions, sizes and SHA-256 digests
 /downloads/voidline-improvement-prompt.txt  full artwork/product brief plus latest web-art correction
 /downloads/voidline-source.zip             source without runtime credentials
 /downloads/voidline-offline.html           offline archive/recovery viewer
/art-review.html                          public artwork and motion inspection
The Windows and source ZIPs stream from the Site's private R2 storage through
fixed public download routes, with verified release checksums and byte ranges.
The small APK is bundled with the Site and served with a real Android package
MIME type, attachment filename and byte ranges.
Keeping the source ZIP outside the Worker reduces its bundled asset payload.
The offline viewer cannot sign in or exchange network messages. Deliberate
recovery exports may contain plaintext. Native build instructions and verification
boundaries are documented in native/android, native/desktop and native/ios.

BUILD AND CHECKS (Node 24 and Python 3)
 npm ci --no-audit --no-fund
 npm run test:server
 npm run test:client
 npm run check:restore
 npm run build
 python3 build_offline.py
 npm run build
 node scripts/check-build.mjs

Local preview: npm run dev builds the Worker, applies the versioned migrations
to the local preview database and starts it on http://127.0.0.1:4173.

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
