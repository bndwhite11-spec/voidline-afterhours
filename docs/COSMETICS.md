# Profiles, free decorations and gifts

The account collection contains twenty-one free decoration designs and twelve
gift designs. The nine existing badges and all existing gift IDs are preserved. Every initial catalogue item is free. There is no checkout,
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
view. The v17 artwork is authored in `dist/collectible-art.js`: brushed metal,
translucent glass, enamel, ceramic and folded paper have different shading and
internal structure. The 20px icons have their own simplified paths rather than
scaled-down inspection illustrations. Medium profile and large detail art share
object proportions and contact-shadow placement. These are digital cosmetics, not financial assets or physical goods.

## Crypto culture and internet meme collections

Twelve additional original badge designs are curated into two free collections.
The public catalogue supplies a stable category and series label. Crypto
cards identify their cultural reference (Bitcoin, Ethereum, XRP, Solana,
Dogecoin or the diamond-hands meme) beside the original-art description. Existing badge
records receive `originals` / VOIDLINE Originals; gifts receive `gifts` /
Afterhours Objects. No database migration or ownership conversion is needed.

| Collection | Badge | Stable ID | Material direction |
| --- | --- | --- | --- |
| Chain Signals | Bitforge | `coin-bitforge` | Hammered copper circuit coin |
| Chain Signals | Ether Glass | `coin-etherglass` | Violet faceted optical glass |
| Chain Signals | Cross Signal | `coin-crosssignal` | Silver crossing signals over graphite |
| Chain Signals | Solar Stack | `coin-solarstack` | Jade/violet offset alloy bars |
| Chain Signals | Moon Shibe | `coin-moonshibe` | Brass dog beneath a crescent |
| Chain Signals | Diamond Hands | `coin-diamondhands` | Ice crystal held by steel hands |
| Internet Relics | Touch Grass | `meme-grass` | Jade enamel grass and a stone base |
| Internet Relics | NPC Energy | `meme-npc` | Porcelain face with a dialogue bubble |
| Internet Relics | Certified Yapper | `meme-yapper` | Chrome microphone with oxide details |
| Internet Relics | Copium Reserve | `meme-copium` | Bottle-green glass canister |
| Internet Relics | Absolutely Cooked | `meme-cooked` | Cast-iron pan and amber flame |
| Internet Relics | Chronically Online | `meme-terminal` | A small phosphor terminal |

These are original VOIDLINE profile artwork inspired by crypto and internet
culture. They are not issued tokens, wallet holdings, coins, investments or
proof of official affiliation. No wallet connection, financial transfer, price
feed, supply claim or paid badge exists. Cross Signal grants no owner authority,
including when used by an account named xrp.

The Decorations view offers All badges, VOIDLINE, Crypto culture, Internet memes
and Collected filters. Counts derive from catalogue and current server-owned
inventory. Opening or filtering the collection never claims an item. A new
account has zero collected badges. Each new design has an original vector
silhouette, an individual material palette, a small profile version and a larger
inspection with its series and meaning. Touch and keyboard controls have names,
visible focus and selected state; motion respects reduced-motion preferences.
Claim/equip actions use the same authenticated, CSRF-protected server paths as
the preserved designs. Client-side changes cannot award achievements or roles.

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
boundary. Gift opening is static by default. A collected receipt is shown only when the
acceptance response confirms `handled: true` and the exact owned instance;
transfer receipts also require the accepted transfer state. Optional replay
lasts at most 1.25 seconds, has no sound, and stops when offscreen, hidden,
replaced, locked or reduced motion is enabled. App and OS reduced-motion
preferences independently suppress the effect. Named internal groups provide
cassette reel/tape movement, a rose highlight, cup steam, paper folds/expression,
key glint, orchid opening, signal pulse and package lid/reveal. The remaining
four objects have crystal light, seraph wings, a halo glint and a ticket clip.
There is no shared whole-object wobble or animation alongside every message.

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

The badge directory and its inspection view show requirements, issue date,
issuer and validity from server records. Profile Authored uses a framed document
and pencil; Community Contribution uses a review medallion and ribbon. They no
longer reuse the Angel or Voidwalker decorations. Role and security indicators
remain separate from both achievements and collectibles.
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
- `node tests/voidline-cosmetics-test.cjs`: 21 controlled client checks for
  review/confirmation, truthful receipts, retries, transfers, showcase requests,
  account isolation, optical variants, accepted-instance receipts, named object
  layers, app/OS reduced motion, offscreen/background cancellation, restored
  filter/scroll state and well-formed XML for all 70 SVG variants.
- `node tests/voidline-profile-panel-test.cjs`: 7 controlled client checks for
  escaped rendering, failed/delayed saves, retained drafts, badge visibility
  and account switching.

These use isolated test identities and production handlers. Client checks use
a VM with controlled DOM and transport; they do not establish browser layout,
SVG rasterization, native focus behavior or production delivery. No gifts were
sent to real contacts. Browser screenshots and deployed checks are separate
release verification.

## Current collection acceptance evidence

`node backend/cosmetics-test.mjs` checks all 33 unique catalogue IDs, exact
9/6/6/12 category counts, empty inventory, free acquisition, new-badge claims,
claim retries, equipment ownership and absence of earned awards or platform
roles from crypto/meme decoration claims. Existing gift, transfer, blocking,
suspension, showcase and privacy checks remain.

`node tests/voidline-cosmetics-test.cjs` checks server-catalog filtering, truthful
collected counts, no mutation from browsing, category isolation after account
switch, inspect meaning, and all 21 distinct badge silhouette paths. These are
VM/transport tests, not browser rasterization or production account screenshots.


## v17 collection layout and verification boundary

Collections use a purpose-built shared modal up to 1040 CSS pixels wide. A named
inline-size container and an auto-fill grid select columns from the panel’s
available width, including when the surrounding viewport is much wider. Narrow
panels switch to one-column horizontal cards. Cards keep the name, material,
ownership and action; full meaning, acquisition and ownership provenance live
in inspection. Back from inspection preserves the current series filter and
scroll position within this account. Lock/account changes clear those positions.

Every UI text/surface uses the shared semantic theme tokens and relative font
scale, including this external dialog. Controls have visible focus and at least
44px height. The theme’s measured text-token contrast applies to these shared
roles. Artwork keeps its deliberately controlled material palette and textual
meaning beside it; art colors alone do not communicate ownership or validity.

The focused client suite uses VM DOM/transport and XML parsing. It establishes
state changes, guards, structure and cancellation paths, not actual responsive
rendering, SVG rasterization, modal focus trapping or assistive-technology
behavior. The available ImageMagick installation lacked its `rsvg-convert`
delegate, so an attempted standalone art contact-sheet rasterization did not
complete. No browser or mobile screenshot is claimed from that attempt. Real
browser layout, optical sharpness, 200% zoom and physical-device motion checks
remain release acceptance work.
