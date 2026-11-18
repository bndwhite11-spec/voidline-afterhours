# Collections, profile decorations and gifts

The current server catalog contains **79 free designs: 47 decorative badges and
32 gifts**. Two earned-achievement illustrations remain separate from the
catalog and do not count as free decorations. The original 21 decorations and
12 gifts keep their stable IDs and legitimate ownership records.

Recognizable subjects use direct names, including Bitcoin, Ethereum, XRP,
Solana, Dogecoin, Max Stirner, Chudjak and Reply Guy. Former names such as Cross
Signal, The Unique One, Nothing Ever Happens and Final Reply remain searchable
aliases; renaming a design does not replace its ownership ID. The latest meme
additions are CHUD, Wojak, Soyjak, Gigachad, Cope & Seethe and Pepe.

Eight additional original gifts are Chudjak Plush, Wojak Jelly, Doomer Bloom,
Brainrot Pop, LARP Cap, Spook Crystal, LARP Helmet and Copium Cartridge. Telegram
collectibles inform object staging and motion research. These entries use
original VOIDLINE names, artwork and choreography; the catalog does not offer
named Telegram NFT collections/models or imply ownership of an external asset.
Source-collection and model links stay in the research/credit context rather
than appearing as an owned or transferable NFT identity. Acquiring or sending a
VOIDLINE gift changes only the server's cosmetic-instance records; no blockchain
asset changes hands.

Earned achievements remain separate server records. Equipping a decoration,
previewing its animation or changing browser data cannot award an achievement,
verify an identity or confer a platform/community role. The intended owner handle
`@xrp` and the XRP decoration do not grant administration.

Every catalog item is free. There is no checkout, wallet connection, price feed,
stock counter, paid tier, invented rarity or edition scarcity. A new account
starts without collected items, earned awards, showcase slots or gift requests.
Local archive claims are not accepted as authoritative ownership.

## Collection destination and inspection

The existing router now exposes a proper `#collection` destination. The client
separates Browse, Collected, Gifts and Earned views. Browse filters by type,
series and a search across all returned catalog names, former-name aliases,
materials and inspiration text.
Collected derives from the authenticated inventory; an available design is not
an owned instance. Gift requests distinguish received/sent new grants from
incoming/sent owned-instance transfers.

Cards give most space to the static artwork and keep the name, series, factual
ownership state and action concise. Inspection uses a larger isolated stage,
meaning/materials, acquisition rules and actual ownership/provenance. It stays
in an overlay above the collection page. Returning preserves the filter, query,
scroll position and keyboard focus. The same object identity appears in the
profile shelf, collection and inspection. A profile inspection can return to
that profile without changing the current conversation or its draft.

The page caches its canonical content, including completed asynchronous gift
and earned rows. Application chrome rerenders do not restore a stale Loading
state or an old filter. Context generations and request intents reject responses
from older sections, dialogs and accounts. Account switching/lock clears the
prior inventory, private receipt, filters, page content and pending motion.
Page errors and inspection errors have separate element IDs, so a modal failure
is shown in the visible modal rather than behind it.

Container-based grids adapt to the actual available width. Buttons retain
keyboard/touch access, visible focus and the document-wide text-size, contrast
and reduced-motion settings. Artwork may retain its colors under forced colors;
functional controls keep system contrast. Real browser/mobile accessibility
and optical acceptance must be recorded separately from controlled tests.

## Drawings and choreography

Editable masters live under `src/art/`. The art compiler supplies independently
simplified 24px optical drawings, static card SVGs, detailed 256px construction
scenes and monochrome silhouettes. Inspection and preview load the detailed
scene lazily. The public art manifest records version, alt text, original drawn
components, reference sources/credit status, variants and named-part motion.
See `COLLECTIBLE-RESEARCH.md` for the actual cultural sources and reference-only
asset boundary. No research bitmap, video or soundtrack is bundled as an app
illustration.

An explicit **Preview animation** is available for catalog art before collection
and for earned-badge art before the requirement is earned. This is pure artwork
playback: it sends no claim, gift, transfer, equipment or award request. It does
not imply ownership or success. Hover uses a short dwell and does not continually
restart while the pointer remains on the same object. Keyboard and touch users
have the same explicit preview action.

Named construction parts perform one short object-specific sequence, then hold
a settled pose until stopped/replaced. There is no animation beside every
message and no default sound. Explicit reduced motion suppresses preview;
page/dialog replacement, offscreen/hidden state, account lock and preference
changes stop motion through the renderer's cancellation API. An unavailable or
older renderer leaves the complete still and reports that motion is unavailable
instead of inventing a playing state.

Art preview and a **receipt reveal** are separate. A received-gift receipt appears
only when the server confirms `handled:true` and returns the exact currently
owned instance. A transfer additionally requires the accepted state. Opening is
static by default; the recipient may optionally replay afterward. Replay never
changes ownership and never creates another gift.

## Granting and transferring

| Action | Ownership result |
| --- | --- |
| Add to collection | One free self-claim per gift design creates its stable owned instance; a decoration claim records that design. |
| Send new gift | A free new grant request creates a separate instance when the recipient collects it. |
| Transfer this instance | Reserves an existing owned instance and moves that same instance only after acceptance. |

Before confirmation, the sender resolves the exact recipient username through
an authenticated, rate-limited preflight. It returns only an eligible public
identity (immutable ID, username, display name, preset avatar), without reserving
or sending anything. The review states the exact item, recipient, operation and
ownership consequence. New confirmations include that reviewed immutable ID.
A username rename/reassignment between review and send cannot redirect the item.

Client IDs remain stable through duplicate clicks, failed sends and lost
acknowledgments. The server verifies that any retry matches the original item
or instance and recipient. A previously acknowledged request remains bound to
its original immutable recipient after a public rename. A conflicting ID cannot
mint or reserve another item. The UI shows success only after an acknowledged
durable request ID, and sent transfers lead to the transfer list rather than the
new-gift-grant list.

Conditional SQL and D1 atomic batches enforce account status, recipient gift
preferences, blocks, active catalog availability, ownership, a single pending
reservation and a single final transfer. They revalidate access at the mutation,
including suspension or blocking after initial lookup. Acceptance removes the
former owner's showcase entry. Refreshing the former owner's collection cannot
mint the transferred instance again. Each operation type is limited to ten
requests per hour and three to the same recipient per day; cosmetic writes also
have an account rate limit of sixty per minute.

Recipients may accept or decline; a sender may cancel a pending transfer. A
pending request does not assert that someone viewed or received its presentation.
Disabling gift requests and either-direction blocks prevent new grants/transfers
and their applicable acceptance paths. An already owned legitimate retired item
remains owned; retirement prevents new free claims/grants.

Private gift notes are unavailable until they can travel through an actual
protected conversation. The UI has no decorative plaintext note field and the
server rejects a nonempty note with `private_note_unavailable`. Gift metadata
itself is not presented as an end-to-end encrypted conversation.

## Storage, privacy and awards

Existing tables remain authoritative; catalog expansion and illustration
replacement need no database migration or ownership conversion:

- `cosmetic_ownership` and `cosmetic_profiles` retain decoration claims, equipment
  and gift preferences.
- `cosmetic_gifts`, `gift_instances` and `gift_transfers` retain durable requests,
  immutable instance IDs, current ownership and provenance.
- `gift_showcase` allows up to three distinct currently owned instances. Sender
  identity stays hidden on the public shelf unless explicitly selected.
- `gift_catalog` permits authorized official availability/name/description
  overrides; all items remain nonmonetary cosmetics.
- `badge_definitions` and `badge_awards` retain legitimate requirements, issuer,
  award dates, validity and revocations. Free decorations never become awards.
- Profile privacy and collection visibility follow the existing relationship,
  shared-membership and blocking rules. Private authentication details do not
  appear on public profiles.

Legacy legitimate gift claims reconcile to stable instances under existing
server rules. Already applied migrations and existing account/history/membership,
award and gift ownership records are preserved.

## Verification boundaries

`backend/cosmetics-test.mjs` uses actual authenticated handlers and migrated
SQLite for empty accounts, the 47/32 catalog contract, stable renamed identities,
original-gift acquisition, permission denial,
retry/grant/transfer atomicity, scoped showcase/privacy, retirement, commit-time
status changes and immutable recipient preflight/rename behavior.

`tests/voidline-cosmetics-test.cjs` uses controlled DOM and transport with a
controlled art-runner contract. It verifies page/inspection state, caches,
recipient review, direct-name/alias search, original-gift inspection without NFT
transfer claims, preview/transaction separation, delayed-account rejection,
static authoritative receipts and cancellation. Actual SVG, material/optical
quality, raster/manifest integrity and choreography are covered by the separate
art compiler and illustration-review artifacts. Neither suite establishes real
browser rendering, microphone/device behavior or production gift exchange by
itself; those results belong in the release report.
