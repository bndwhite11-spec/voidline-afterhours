# Downloadable clients and smoother conversations

This update adds actual Android and Windows application files to the existing
merged messenger. The Android 1.0.0 APK is signed for app.voidline.afterhours,
uses maintained Android Browser Helper 2.7.4, and targets the existing HTTPS
origin through a Trusted Web Activity. Its public certificate association is
served at /.well-known/assetlinks.json. The signing key stays outside source.
The Windows x64 portable ZIP uses pinned Electron 45.4.1 with an isolated,
sandboxed renderer, no Node bridge, scoped permissions and actual failure/retry
states. It is an unsigned preview, not a signed Windows installer.

The main download screen exposes Download APK and Download for Windows directly.
Browser installation and source/offline files remain separate. Native iOS source
is prepared, but no IPA, Apple domain association or TestFlight release is
claimed without a real Apple team, Xcode compilation, signing and acceptance.

Conversation improvements address observed interaction defects: Jump to latest
responds to scrolling without network/repaint, selected message text survives
reaction updates, More menus dismiss predictably with keyboard focus retained,
late media sizes follow latest only for readers already at the bottom, and
acknowledged sends do not wait for sidebar requests before the next queued send.
The Windows and source ZIPs use checksum-verified private R2 objects behind
fixed public download routes, with resumable byte ranges. A temporary deployment
secret authorizes staging; normal accounts cannot publish binaries. That secret
is removed after upload. The small APK replaces the developer archive in the
Worker bundle, reducing its bundled asset payload.

Android signatures/alignment/manifest/ZIP checks, Windows PE/ASAR/fuse/ZIP checks
and controlled native-handler/client interaction tests are distinct from device
execution. No physical Android or Windows installation, Xcode build or real
owner passkey ceremony is claimed by those checks. No database migration or
account/ownership reset is introduced.

## Previous owner account moderation and merged messaging update

Combines the existing managed Site v24 with GitHub revision c892b62d9f7ead7e85318027aa589a85a0ec0746 and the owner-control implementation.

The existing hosted @xrp identity was verified through the one-time, passkey-backed
operator bootstrap on 19 November 2026. The immutable platform-owner record remains
the authority. Runtime bootstrap values were removed after binding.

The owner dashboard now distinguishes reversible Block/Unblock controls from
irreversible account deletion. Deletion requires the exact target account ID and
a reason, uses a stable retry receipt, atomically removes private account access
and metadata with its audit, and retains anonymized shared-history/provenance
references. Platform-owner deletion and community orphaning are refused.
Session revocation, verified-channel recovery, reports and catalog/badge controls
remain available. Responsive account rows replace the wide account table.

In-flight account, relationship, cosmetic and organization mutations must recheck
the active session/account before committing so they cannot restore private data
after deletion or finish an action after blocking. Native restrictions are
separate from queued Matrix lifecycle decisions. No homeserver or encrypted
message access is introduced. See OWNER-BOOTSTRAP.md for operation and retention
details. Existing accounts, memberships, legitimate gifts and applied migrations
remain intact; no new schema migration is required.

The public install/download page covers iOS/iPadOS, Android, Windows and desktop
Chrome/Edge, plus Safari's Add to Dock option where supported. The main install
action remains available when the browser supplies no programmable prompt and
opens manual instructions instead. Acceptance of a prompt is only an installation
request; completion is reported only by the browser's installed event or a
standalone app launch. Live messaging requires internet. Separate source ZIP
and offline archive/recovery viewer downloads retain truthful scope labels.
No account API or private conversation content is cached for installation.
Operating-system installation and physical-device behavior require separate
device acceptance; controlled UI events and hosted file checks do not prove it.


## Included GitHub everyday-use update (Telegram-style chats, Discord-style servers)

Starts at commit d51af5f384bf33a2bc9cbbb1fc1d5cd3f27fb216. No migration, account, ownership, identity/provider or hosting-audience change is added.

- Standard messaging is acknowledged once per account on a device (`localStorage`), not once per conversation per tab. The server still requires `acknowledgeStandard: true` on writes.
- Chat rows show message text by default for accounts that never saved a preview choice, drop the per-row "Standard · server-stored" label and align the preview under the name. Saved generic/sender choices are kept; push payloads remain generic.
- The conversation header says "Mark read", the status strip is one line, and phones keep the message input and its actions on one row.
- "Encrypted messaging options" is listed only when a Matrix service is configured.
- A new server takes its rail icon from its name instead of the fixed "WL", and opens its first channel. Opening a server from the rail or an invitation opens its first channel on wide layouts.
- Live updates: each loaded page names itself and replaces its own stream lease, so switching conversations no longer uses up the account's slots (previously a closed stream could hold a slot for the full 45-second lease). The per-account limit is five.
- `npm run dev` applies the versioned migrations to the local preview database before starting.

Interface and motion pass (no server, schema or data change):

- Direct messages and private groups render as bubbles with own messages on the right, in the same visual language as the encrypted feed. One-to-one chats drop the repeated name and avatar; groups keep them. Channels keep full-width rows.
- Message actions (reply, react, more) no longer reserve a row under every message. They float beside the message and appear on pointer hover, on keyboard focus of any action, or after a tap on touch screens. The buttons stay in the tab order and keep their accessible names; touch targets remain 44px.
- Messages show a clock time only (the feed's day separators carry the date; the full timestamp stays in the tooltip). People get one of eight stable avatar tones.
- The conversation header groups its actions on the right; list filters are one row of tabs and only list filters that apply to the current list; Send is quiet until there is text.
- Motion: dialogs, their backdrop, menus and toasts settle in; a newly arrived or newly sent message rises into place once; opening a destination plays one short pane entrance that continues, rather than restarts, across the loading re-render. Controls have hover and press transitions.
- All of it is disabled by the in-app reduced-motion preference and by `prefers-reduced-motion`.

The earlier GitHub revision was checked in headless Chromium at 1280px and 390px against local workerd: animations present in normal mode and absent with reduced motion, action bar by hover, keyboard and tap, and the earlier two-account regression walk-through. Physical devices, iOS Safari and screen readers are not covered by that run.

That earlier GitHub revision was verified with its client and server suites and a headless Chromium walk-through against local workerd/D1 (two accounts: sign-up, friend request, DM both ways, live delivery, server and channel post, 390px layout). Physical phones, hosted transport and the published site are not covered by that run.


## Previous edition4 web-art update

Starts at published v18, source2540635ff7187ffa7d898df432643c2f39c67877. The user’s latest correction requires actual web images for badges and gifts and adds Blockchain and Ledger. Edition4 covers49 decorative badges,32 gifts and2 earned-award images with actual local source pixels, credits, factual license status and disclosed conventional image changes. No image generation is used for current art.

Backend catalog IDs and legitimate ownership remain stable. New badge IDs are coin-blockchain and coin-ledger. Source-image captions replace material claims from old generated drawings. Item inspection and the public artwork gallery link the actual sources. Gifts keep their authoritative free grant/transfer/receipt flows and have optional image opening effects. These are neither copied Telegram NFT products nor blockchain transfers.

The renderer requires complete web-source coverage, validates local raster dimensions/bytes/hashes and uses self-contained SVGs with safe embedded PNG/JPEG images. Full images load on demand; small thumbnails contain no full raster payload in startup JavaScript. Worker raster dedup preserves exact public bytes, ETags, HEAD, CSP and proxy-managed HTTP compression. The full uploaded prompt plus latest correction remains downloadable.

No migration, account reset, ownership reset, identity/provider setting or hosting-audience change is added. The previous visual/navigation work and security/infrastructure limits below remain. Actual image/XML/controlled runtime checks, hosted temporary-account results and browser limits are recorded in the release report.

## Previous edition3 delivery

# Current edition3 artwork and product upgrade

This release starts at published v17, commit77f55390c709e6d7fee447e94f7e7ad461f8e711. `VOIDLINE-MEGA-IMPROVEMENT-8.txt` preserves the latest uploaded brief. Subsequent user steering requires original Telegram-inspired gift bases, accurate XRP/Max Stirner/Chudjak names and a larger CHUD/Wojak meme family. Existing accounts, histories, memberships, IDs and legitimate ownership remain. No database migration is added.

The catalog grows to47 decorative badges and32 gifts, plus2 separate earned awards. Edition3 includes editable vector masters, individually drawn optical marks, card/detail/silhouette assets, source credits and bounded named-part choreography. Eight original gifts use researched material/motion bases rather than the actual Telegram NFT collection identities. Cultural decoration never implies achievements, financial holdings, official affiliation or permission.

The graphite/lime shell uses readable typography, flatter navigation and consistent global preferences. The empty home foregrounds starting a conversation, joining and creating a community. A dedicated Collection page supports browsing, collected items, gifts and earned awards with search/type/series filters, large inspection, explicit previews and clear grant-versus-transfer review. Eligible recipients are resolved before review and confirmation binds the immutable account ID. Accepted server receipts alone authorize collection changes and receipt reveals. Profile shelves and lifecycle handling preserve navigation, focus, scroll and account isolation.

All four SVG variants are fingerprinted and loaded from the same origin. Large scenes mount only on demand, and motion stops for replacement, leaving, closing, account lock, hidden documents or reduced motion. Provenance is kept distinct from product identity. The public `/art-review.html` offers direct artwork inspection and manual playback without account APIs.

Actual SVG rasterization and sampled motion filmstrips are illustration evidence. Controlled DOM/WAAPI tests are distinct from browser playback. The release report records final suite, asset and hosted-account results. Interactive browser/mobile rendering, physical keyboard/crop/microphone use, zoom/screen-reader behavior and real-device animation performance remain unverified when the supported browser infrastructure is absent.

Authentication, persistent ownership, Standard messaging, private media and the maintained Matrix adapter retain the boundaries documented below. No homeserver, Google/email provider or verified native platform-owner binding is fabricated. The intended owner @xrp must still prove control through the documented trusted bootstrap. Standard messages remain explicitly service-readable; no encrypted send falls back to them.

## Previous v17 implementation and infrastructure boundaries

# Current upgrade delivery boundaries

This upgrade starts at live v16, commit a2882d48cc6fd90dd50b0f51e972b4e0cd34cbce. The complete new 24-section brief is preserved in `VOIDLINE-MEGA-IMPROVEMENT-7.txt` and the downloadable improvement prompt. A requested requirement is not a claim of complete delivery. The existing Site/public audience, account IDs, histories, memberships, ownership and applied migrations are preserved.

## Implemented product changes

- A shared charcoal/violet semantic theme replaces scattered interface colors. Preferences apply to both document roots, so portalled dialogs, profiles, gifts, menus, viewers and toasts inherit text size, contrast and reduced motion. OS preferences remain respected, including runtime changes and account resets. The brief intro remains skippable and bypasses on reduced motion.
- Desktop list width is adjustable within 260–320px by pointer and keyboard. Conversation previews respect privacy. Empty accounts still contain no fabricated membership, messages, friends, unread state or ownership.
- Standard messaging has a durable ordered multi-item IndexedDB outbox, stable client IDs, leases, explicit failure/retry/cancel behavior and per-account isolation. A failed head pauses later items. This Standard queue contains readable text on the device; it is not the encrypted Matrix outbox. Tab-local draft storage remains separate. Cancellation cannot retract server acceptance.
- Authenticated content-free SSE revision hints trigger authoritative cursor catch-up. Sessions, account status and membership are rechecked, streams have bounded leases, reconnect resumes with jitter, and a watchdog retains truthful polling fallback. D1 revision checks remain periodic on the server; this is not a claim of native database push.
- Standard native/community history uses measured variable-height windowing with anchors and bounded detached row caching, focus/selection pins, author grouping, reply context and controlled new-message navigation. The encrypted SDK renderer is separate; no universal history-windowing claim is made.
- Private R2 storage supports validated profile images and Standard attachments/voice recordings, staged digest-bound retries, atomic claims, byte/range reads, visibility/block/access checks and durable removal/expiry work. Avatar/banner cropping, preview, save, reset and upload-failure states use actual Canvas/file APIs. Standard media has the same server-readable boundary as Standard text.
- The original 21 cosmetic badge and12 gift IDs/ownership rules remain. Dedicated small and inspection artwork uses distinct silhouettes/materials, with separate earned-award art. Collection sizing follows its container. Gift receipt/replay requires an acknowledged server-owned instance; animation is optional and respects app/OS reduced motion.
- Seven scoped plaintext exports cover the caller's profile, memberships, gifts, earned badges, organization and accessible Standard native/community history. Each page verifies current access and recent authentication. Downloads require explicit plaintext acknowledgment and have conservative bounds. Authentication secrets, Matrix content/keys, device-only Saved notes and uploaded file bytes are excluded.

## Implemented encrypted foundations, not a completed operated service

The maintained Matrix SDK45.1/Rust 18.9.2 adapter and verified-device/no-fallback boundary remain. Native password changes stage and commit a v2 encrypted credential-envelope rewrap while preserving the stable Rust/local-store password. Legacy envelopes migrate without resetting encryption keys. Ambiguous network outcomes retain a recoverable staged envelope. Google-only accounts need a supported native credential before this password-unlock flow; provider login is not falsely described as a local encryption key.

Explicit multi-tab writer handoff uses Web Locks, metadata-only coordination, flush/stop and deliberate approval; the writer lock is not bypassed. Paginated earlier-history indexing runs locally after decryption and stays encrypted at rest. Its coverage is bounded and labeled; thread-only history and remote changes outside downloaded/synced history remain limitations.

Verified native lifecycle decisions now queue supported Synapse suspension/reinstatement/deactivation and session/device revocation. Queue retries/leases and audit results do not claim community-membership or unwanted-contact policy reconciliation. Confirmed current-device mappings survive a verified password change; revoked old-session in-flight enrollments still receive a reconciliation path.

**No homeserver exists yet.** No Matrix admin/JWT service is configured, authoritative encrypted community/block-room reconciliation is incomplete, and real multi-device enrollment, UIA, encrypted attachment/recovery and cross-device trust acceptance remain unverified. `encryptedDefaultReady` and `accountRestrictionsSynced` remain false. Native Standard text stays explicitly service-readable. Encrypted sends never fall back to it.

## Operational implementation versus configuration

Additive migration0009 introduces account revision/stream leases, private media/cleanup records, nullable profile media references and Matrix policy operations. Applied migrations0000–0008 remain unchanged.

The Site MCP writer offers bounded queue processing and protected AES-GCM hosted D1 logical snapshots, with content-free health/receipts and an isolated restore tool. Its operator is bound through trusted Site-scoped identity configuration, separately from native platform ownership. A connected, verified unattended schedule, independent backup-key retention, R2 media-byte backup and an actual hosted restoration drill remain distinct gates. See OPERATIONS.md and BACKUP-RESTORE.md; the release report records what is actually configured and executed.

Google credentials, verified-email delivery and the native platform-owner binding are still absent. `@xrp` is the intended owner handle, not proof or an automatic privilege grant. Owner setup requires the documented authenticated native account/passkey claim and trusted immutable-ID binding. No owner dashboard has a universal encrypted-conversation key.

## Evidence boundaries

Current suites exercise migrated SQLite, actual local workerd/D1/R2, WebCrypto, maintained attachment encryption, controlled provider transports and controlled client/DOM interfaces. Hosted HTTP byte, temporary-account, media and stream checks are recorded separately in the release report. Native publication screenshots establish only their captured logged-out desktop state.

No interactive browser tool was available during this upgrade. Physical phone keyboards, real font zoom/screen readers, real microphone/crop controls, authenticated mobile screenshots, real push receipt while closed, Matrix two-device acceptance and an external independent security audit are not claimed. Calls/video/screen sharing remain unavailable until real signaling, STUN/TURN and cross-network acceptance exist.
