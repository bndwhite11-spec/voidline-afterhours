# Profiles, free decorations and gifts

The account collection contains nine preserved decoration designs and twelve
gift designs. Every initial catalogue item is free. There is no checkout,
currency, stock counter, paid tier or invented rarity. A fresh account has no
items, earned awards, showcase slots or gift requests. Local archive claims are
not accepted as authoritative ownership.

The nine original decoration designs include LARP PRO MAX, 404 Angel, Ghost
Frequency and Voidwalker. They are personal decorations; equipping one does not
award an achievement, verify identity or grant permissions. Existing server
ownership is preserved.

The original Chrome Rose, Midnight Tape, Pocket Star, Afterhours Cup, Paper
Ghost and Small Surprise remain. The collection adds Chrome Seraph, Obsidian
Key, Broken Halo, Midnight Orchid, Sealed Signal and Afterhours Ticket. Each has
an original SVG silhouette, controlled material palette and larger inspection
view. These are digital cosmetics, not financial assets or physical goods.

## Granting and transferring

Two operations have different ownership rules:

| Action | Result |
| --- | --- |
| Add to collection | One free self-claim per gift design; creates a stable owned instance. |
| Send new gift | A free new grant request; creates a separate instance when the recipient collects it. |
| Transfer this instance | Reserves an existing owned instance; moves that same instance only when accepted. |

The sender reviews the item and exact recipient username before confirmation.
The receipt appears only after the server acknowledges a durable request ID.
The recipient can accept or decline. A transfer sender can cancel a pending
request. Retries retain the same client ID. Conflicting reuse is rejected.
Pending requests do not claim that the recipient has viewed them.

Conditional SQL and D1 atomic batches enforce recipient eligibility, account
status, blocks, ownership, a single pending transfer reservation and a single
final transfer. Suspension and blocking are checked again at the mutation,
including a change after the first lookup. Acceptance removes the former
owner's showcase entry. Refreshing that former owner's collection cannot mint
the instance again. Each operation type has a limit of ten requests per hour
and three to the same recipient per day. Cosmetic writes also have an account
rate limit of sixty per minute.

Disabling gift requests prevents new grants and transfers. Either-direction
blocks prevent new requests and acceptance. A previously received legitimate
item remains owned if its design is later retired; retirement prevents new
free claims and grants. Gifts confer no platform or community privileges.

Private gift notes are unavailable. The UI says so, and the server refuses a
nonempty note with `private_note_unavailable`; plaintext notes never enter D1.
No message-content E2EE claim applies to gift metadata. An encrypted note can
be added later through an actual protected conversation, without weakening this
boundary. Gift opening is static by default, with an explicitly requested brief
effect, a reduced-motion equivalent and no sound.

## Storage and preservation

Migration `0006_hard_tombstone.sql` adds:

- `gift_instances`: immutable instance ID, current owner, catalogue ID and grant provenance.
- `gift_transfers`: durable sender/recipient events and unique `(sender_id, client_id)` retry keys.
- `gift_showcase`: at most three server-validated distinct owned instances.
- `gift_catalog`: verified-owner name/description/availability overrides; items remain free.
- `badge_definitions` and `badge_awards`: authoritative earned achievements and revocation history.
- `profile_preferences`: safe appearance presets, independent privacy and earned-badge order.

The original `cosmetic_ownership`, `cosmetic_profiles` and `cosmetic_gifts` stay
in place. A received legacy server gift uses `gift:<request-id>` as its instance
ID. A server-owned design without a matching received gift uses a deterministic
`claim:<account-id>:<design-id>` legacy instance. Ambiguous older design records
are preserved without inventing an additional duplicate claim. Reconciliation
runs in bounded batches of 100 unmatched received grants. The owned inventory
summary returns at most 200 instances; the complete collection and transfer
lists have explicit 30-record pagination and owned-design filtering.

Account deletion retains anonymized ownership/provenance history, removes
private profile preferences and showcase entries, and cancels pending
transfers. The global backup and restore procedure is in `BACKUP-RESTORE.md`.

## Profiles, privacy and achievements

`worker/profiles.mjs` and `dist/profiles-panel.js/css` provide a compact and full
profile, previewable edits, saved/unsaved/failure states, avatar/banner/accent
presets, bio and status. Draft edits remain in memory through dialogs. Account
lock clears profile and collection caches. A delayed response cannot populate
a different account or describe newer edits as saved.

Profile details and the gift collection each support public, shared-community,
accepted-friend or private visibility. Blocks override public visibility.
Profile access is authenticated; basic identity requires a relationship or
public details. The collection API independently enforces its own visibility.
Email, authentication providers and credentials never appear in the public
profile response. The old live-profile route delegates to the same policy.

Showcase slots are validated against current ownership. The original gift
sender is hidden until the owner explicitly chooses to disclose it for that
slot. Collection lists do not reveal an undisclosed sender. Saving an empty
earned-badge display order hides earned artwork without revoking the award.

The initial earned rules are:

- **Profile Authored**: the server observes a committed profile with a bio of
  at least 20 characters and a non-default avatar, banner or accent. Failed
  writes do not award it. Revoked awards are not silently recreated.
- **Community Contribution**: the verified platform owner reviews an actual
  contribution and records a reason. Ordinary accounts cannot mint it.

The badge directory shows requirements, issue date, issuer and validity.
Changing local storage, equipping free artwork or submitting a profile role
field cannot create an award. The platform owner indicator reads only the
trusted `platform_owner` account-ID binding. A matching username or display
name grants no role; community ownership is separate.

## API and verification

Production handlers use the existing secure account sessions, Origin/CSRF and
expected-account checks. Mutation bodies are bounded, inputs validated and SQL
parameterized. Main additions are `/api/profiles/me|:id`,
`/api/cosmetics/instances`, `/collections/:id`, `/transfers`, `/showcase` and
`/badges`; existing claim, equipment and gift routes remain compatible.

Focused checks:

- `node backend/cosmetics-test.mjs`: 16 migrated-SQLite and real-session checks,
  including concurrent reservations, stable retries, ownership, visibility,
  blocks, catalogue retirement, injected persistence failures and commit-time
  suspension at all grant/transfer stages for both participants.
- `node backend/profiles-test.mjs`: 8 real SQLite/session checks for profile
  privacy, authoritative rule awards, revocations, display slots, failed writes,
  trusted owner indicators and sender disclosure.
- `node tests/voidline-cosmetics-test.cjs`: 12 controlled client checks for
  review/confirmation, truthful receipts, retries, transfers, showcase requests,
  account isolation and distinct vector silhouettes.
- `node tests/voidline-profile-panel-test.cjs`: 7 controlled client checks for
  escaped rendering, failed/delayed saves, retained drafts, badge visibility
  and account switching.

These use isolated test identities and production handlers. Client checks use
a VM with controlled DOM and transport; they do not establish browser layout,
SVG rasterization, native focus behavior or production delivery. No gifts were
sent to real contacts. Browser screenshots and deployed checks are separate
release verification.
