# Current upgrade plan — release v17

The latest audit starts at published v16, commit a2882d48cc6fd90dd50b0f51e972b4e0cd34cbce. The supplied 24-section brief is preserved verbatim in `VOIDLINE-MEGA-IMPROVEMENT-7.txt`. Native password accounts, empty onboarding, D1 permissions/history, free ownership, server revisions and the separate Matrix adapter already work; they are retained. Sites hosts the Worker with managed D1; new private media uses the native R2 binding, not browser authority. No Matrix homeserver, Google client, email provider or verified platform-owner binding is configured.

1. Fix global preference inheritance and consolidate the violet/charcoal visual system without changing account identity or existing data.
2. Add additive schema 0009, authenticated content-free revision streams with fallback, a durable ordered Standard outbox and measured history windowing.
3. Complete private profile/media storage, crop and Standard attachment/voice paths; preserve the separate encrypted transport boundary.
4. Refine original 21-badge/12-gift artwork and collection inspection; keep earned awards, decorations and permissions distinct.
5. Preserve encrypted local storage across native password changes, support deliberate crypto-writer handoff, and queue supported provider lifecycle reconciliation without inventing homeserver configuration.
6. Add scoped plaintext account exports and protected hosted snapshot/queue writers. Connect an independently authorized scheduler only after verifying its actual unattended access.
7. Verify meaningful SQLite, actual workerd/D1/R2, WebCrypto, client lifecycle and hosted HTTP behavior; publish the exact reviewed source and matching downloadable artifacts. Record browser/device/provider gaps explicitly.

Only unapplied migration0009 is changed. Applied migrations0000–0008 remain byte-identical. Existing histories, account IDs, memberships and legitimate cosmetic ownership must survive. A release is reversible by redeploying the prior compatible Worker; leave additive schema in place. Before any production restore, preserve a pre-restore snapshot and use the managed provider’s supported maintenance procedure.

## Earlier audit history

# VOIDLINE substantial upgrade: audit and priorities

The source audit began at release v10, commit cd3a397. Its normal entry was
already native username/password authentication and an empty signed-in account.
The older sample communities and ChatGPT sign-in observations did not describe
that release. Sample modules existed as retained recovery/test source, and
were excluded from the production asset allowlist. D1 was the shared authority
for accounts, memberships, friendships and free cosmetic ownership. A separate
Matrix SDK/Rust crypto adapter required a homeserver that was not configured.

## Priority 1: identity and authority

Preserve native login and account IDs. Add the requested optional Google OIDC,
verified-email recovery and passkeys with real verification and honest provider
configuration gates. Upgrade password derivation to Argon2id with a maintained
implementation and an atomic legacy-login migration. Check account suspension
at every authenticated request. Bind the platform owner once, using a verified
session claim and trusted server configuration; @xrp is an identity hint only.

## Priority 2: messaging and organization

Complete independent adapter actions and encrypted local draft/outbox storage,
with no plaintext fallback. Add maintained encrypted attachment handling and
actual library tamper tests. Keep native account metadata separate from private
content. Make filters, folders, mute/archive/pin settings, Inbox, Saved, search
scope and exact source navigation coherent and durable. Local encrypted Saved
notes must remain usable without pretending to be cross-device synchronization.

## Priority 3: profiles and collections

Preserve legitimate free cosmetic ownership. Add concrete gift instances,
atomic accepted transfers, privacy and showcase slots. Keep earned awards,
decorations and real role indicators separate. Improve original artwork and
profiles while keeping text readable and profile decoration optional.

## Priority 4: release proof

Apply only additive schema changes. Test permissions, password upgrades,
suspension, owner denial, passkey challenge handling, gift transfers, private
Saved storage and retained histories against actual code and migrated SQLite.
Verify encrypted snapshot/restore in isolation. Build matching downloads and
Worker output, publish the existing Site without changing its audience, then
exercise isolated live accounts and compare served asset bytes. Close release
test accounts afterward. Distinguish hosted screenshots from interactive
browser/device tests and from controlled transport tests.

## External verification gates

- The intended owner must prove control of its signed-in native account and
  verify a passkey before the trusted infrastructure binding can be completed.
- Real Google sign-in requires a Google-issued client and registered callback.
- Verified email needs a configured delivery provider and verified sending
  identity. No email is treated as delivered merely because a token exists.
- Real encrypted exchange and encrypted media/device recovery acceptance need
  a configured Matrix homeserver and two independently authorized devices.
- Supported browser controls were not available during the initial audit.
  Screenshots and interactive flows must be reported according to actual tools.
- Production D1 export/restore/backup scheduling needs its managed provider's
  infrastructure controls; local restore tests do not prove hosted retention.
