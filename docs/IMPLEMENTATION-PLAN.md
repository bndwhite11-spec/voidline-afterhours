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
