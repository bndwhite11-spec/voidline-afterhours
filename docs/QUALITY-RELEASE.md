# VOIDLINE web release v1.0.5

The baseline is Site version 31 at source revision `985e4400c4d1db3b377148a55969f5558a67dabe`. This release changes the hosted messenger used by browsers, installed web apps, Android 1.0.3 and Windows 1.0.0. The package numbers on the download page identify the native wrappers. [Open VOIDLINE](https://voidline-afterhours.pipedcactus1.chatgpt.site/chats) · [Install on your device](https://voidline-afterhours.pipedcactus1.chatgpt.site/install.html)

## What changed

- **Account and conversation privacy.** Channel history, changes, pins and individual messages recheck membership and session validity before returning a response. Switching accounts also clears the previous account’s search input, decrypted query and person filter. Returning through browser history revalidates the session before restoring drafts or queued work. After natural expiry, the same account can recover permitted unsent text.
- **Starting a conversation.** Chats and Communities show relevant empty and filtered states. Friends lets someone find an exact username, review the matching handle and confirm the request. A private invite can be previewed without joining. Accepting it navigates to a refreshable community or channel. Search keeps the submitted filters and page when returning from a result. Signing out returns to the sign-in form.
- **Sending and receiving.** Explicit Send respects active text composition. Delayed encrypted sends keep their confirmed text, reply and attachment while the next draft remains editable. Voice recording handles repeated permission taps and disposes capture tracks on failure. A notification opens its destination while preserving an unrelated conversation, upload or recovery tab.
- **Entry and profiles.** The introduction releases a ready sign-in form immediately. The authenticated workspace and heavier features load in stages and failed feature downloads can be retried. The profile editor preserves the active image while typing, explains conflicting changes, and lets the user reconsider each field before saving. Badge positions have keyboard-operated alternatives to dragging.
- **Gifts and artwork.** Chrome Rose, Pocket Star, Midnight Tape, Paper Ghost, Sealed Signal, Block Zero and Last Tab Open now have object-specific reveals and dedicated miniatures. Genesis Block, a free name decoration, received its own miniature and shorter pin motion. Stable item identities continue to resolve existing ownership, awards and showcase entries. The compiled build preserves all 32 prior variant URLs for these eight objects plus 327 historical artwork redirects. Browsing and replaying art have no gift or badge transaction effects. [Studio comparisons and motion study](STUDIO-01.md) · [Full 83-item ledger](CATALOG-REVIEW.csv)
- **Installation.** Android and Windows have distinct download instructions. The Safari guides open to the selected platform, including when the link is opened from an installed app. On Android, **Use in browser** gives access to the same account. [Platform guide](MOBILE-ACCESS.md)

The worker uses the existing 11 migrations. This release introduces no database schema migration, entitlement grant, payment path, owner reassignment or change to gift transfer rules. Standard conversations store server-readable messages. Matrix conversations use the separate encrypted system and require a configured homeserver and verified device keys. [Encryption and setup](ENCRYPTED-SETUP.md)

## Evidence

| Scope | Observed result |
| --- | --- |
| Packaged entry and local runtime | The complete document and its delivered scripts ran under jsdom against the built Worker with local workerd, D1 and R2. Disposable registrations entered an empty workspace, saved a profile, inspected a gift and created a private community. A paired login/logout probe checked the return path. Recorded guest requests fell from 44 to 14. |
| Backend and isolation | Real native handlers and SQLite exercised account/session, role, friend, transfer and concurrent write paths. Community regressions passed 11/11, including membership and session changes during a read. Profile conflict/atomicity passed 17/17. Local D1/R2 and catalog runtime checks exercised platform bindings. Backup verification passed 2/2 for an isolated encrypted SQLite restore and wrong-key/tamper handling. |
| Client and art | Controlled DOM, storage, media, Matrix and push interfaces exercised account changes, navigation, pending sends, focus, cancellation and denied permissions. The art study used actual raster sources, named transforms and software-rendered frames. All 83 miniatures received a static light/dark inspection. Seven gifts and one decoration received new art. |
| Packaged assets | Local Worker checks verified exact asset bytes, 327 historical GET/HEAD redirects, API access guards, cache validators, Android file integrity and download routing. The release uses the existing signed 93,953-byte Android APK and unsigned portable Windows x64 ZIP. [Download manifest](../dist/downloads/voidline-release.json) |

### Performance

The guest HTML requests 11 JavaScript/CSS resources compared with 41 at baseline. Individually gzipped entry bodies total about 104 KiB compared with 260 KiB. Filtering an 81-card fixture and returning to the full selection created zero new poster nodes in the revised controller. The baseline recreated 2,088 during the same complete fixture. Paired medians below are milliseconds for the entire scenario, with one warm-up and eight measured pairs in alternating order.

| Same-runner scenario | Site 31 baseline | v1.0.5 |
| --- | ---: | ---: |
| Switch ten chats | 82.10 | 81.20 |
| Type 48 characters during eight incoming pages | 9.59 | 9.64 |
| Scroll 24 positions in a 10,000-row fixture | 100.50 | 94.06 |
| Inspect, replay and close gifts eight times | 83.79 | 95.26 |

The gallery cycle took 11.47 ms longer across eight inspections in this fixture. Focus returned correctly, both versions fetched two details including warm-up, and all effects stopped after close. These runs exercised DOM/controller work with controlled transport and geometry. They did not measure rendered frames, physical keyboard latency or field Web Vitals. [Full paired samples](quality-assets/interaction-samples.json) · [Method, startup and other work measurements](../PERFORMANCE.txt)

### Remaining verification

1. **P0, privacy and account access.** Fixtures establish identity and permission behavior in isolation. A live two-device Matrix verification, encrypted attachment exchange and key-backup recovery still require a configured homeserver. Real Google, email delivery and hardware passkeys require working provider settings and credentials.
2. **P1, devices and delivery.** Complete a physical Android launch including the affected Samsung configuration, iPhone/Safari home-screen launch, Windows ZIP launch, external keyboard/IME input, hardware capture and OS notification delivery. Device layout, TalkBack/VoiceOver, zoom, actual frame timing, loss of connectivity and browser lifecycle under memory pressure need interactive testing. Earlier Android wrapper results are recorded separately. [Android runtime history](../native/android/STARTUP-TESTS.md)
3. **P2, art quality.** Seventy-five existing designs retain their previous artwork. Ledger entries identify specific fixes, including the competing forest and helmet at 16 px in LARP PRO MAX. The eight revised designs have software-rendered motion evidence and still need browser and device review. [Acceptance results and defect inventory](QUALITY-ACCEPTANCE.md)

## Release and rollback

1. From a clean checkout with the supported Node version and pinned dependencies, run the following build and checks. The source/offline download is regenerated from the checkout before the final Worker package.

   ```sh
   npm ci
   npm run build
   python3 build_offline.py
   npm run build
   node scripts/check-build.mjs
   npm run test:server
   npm run test:client
   npm run check:restore
   ```

2. Publish the verified build to the existing VOIDLINE Site using its current D1/R2 bindings and runtime configuration. Record the new Site version and Git commit/tag in the release record. Check the canonical chats, install and art-review routes, the version and checksums in the public download manifest, an old art URL and a conditional asset request. Preserve release history for rollback.
3. If a regression blocks access, the Site operator can restore **Site version 31** from the existing Site’s version history. Keep the current D1, R2 and secret bindings. Recheck the public routes, Android/Windows download responses, authenticated sign-in and an isolated existing conversation. Version 31 predates the final channel access and cross-account search fixes, so reapply those fixes before treating a rollback as a lasting release. The local restore drill used isolated SQLite. A hosted database restore or production rollback was not exercised.

The [23-scenario acceptance matrix](QUALITY-ACCEPTANCE.md) links individual reproductions and evidence. The [public app](https://voidline-afterhours.pipedcactus1.chatgpt.site/chats) and the [GitHub release](https://github.com/bndwhite11-spec/voidline-afterhours/releases/tag/v1.0.5) are the delivery targets.
