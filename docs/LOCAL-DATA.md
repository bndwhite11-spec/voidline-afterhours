# Legacy device archive review

The account client never boots the former sample client. `store.js` and
`legacy-import.js` do not seed communities, people, conversations, achievements,
or notifications. Loading these files performs no storage operation. An explicit
review calls `VoidLegacy.inspect(storage, {sessionStorage})`; the journal reader
uses reads only. It does not normalize old data through the former client.

The original `voidline.local.v1`, `voidline.archive.v3.base`, immutable journal
operations, and current-tab draft/media records remain in place. No review
operation calls `setItem`, `removeItem`, `clear`, or `fetch`. No local record is
linked to a signed-in account or uploaded. Existing shared-account transport
caches are not inspected or exported by this generic device-archive tool.

## Classification

The reviewed copy excludes only exact unchanged shipped fixture messages. A
match requires the original conversation context, known generated message ID,
author identifier, and SHA-256 of the exact author/text/contribution tuple. The
registry contains fingerprints of the two shipped catalogues rather than sample
people or conversation content. It is a provenance aid, not an authentication or
cryptographic security boundary.

Self-authored messages are retained. Unknown IDs, changed text, edited messages,
newer modification timestamps, and reactions made by the local user remain
uncertain and are retained for review. Missing browser fingerprint support also
retains messages instead of guessing. Custom communities, profile preferences,
artifact records, settings, saved sources and conversation metadata remain in
the in-memory candidate. They do not grant real membership, friendships,
artifacts, verified identity, or server permissions.

Personal replies keep their original IDs and references. When an exact sample
parent is omitted from the reviewed message list, `referenceSources` separately
retains its exact source with a sample label, so the review does not invent a
replacement speaker or silently lose quoted context. The preview shows at most
100 records and states that limit; the candidate and recovery export retain the
complete data.

## Recovery download

`exportArchive` / `downloadArchive` must be called from an explicit user action.
The recovery JSON includes the original relevant local storage values verbatim,
plus a reconstructed state when the journal is valid. A damaged journal is still
exportable without discarding its raw bytes. Current-tab local draft text,
reply targets, thread drafts and media references/bytes are included only when
`includeSessionDrafts: true` is explicitly selected. No unrelated application
storage or shared-account transport cache is included.

The recovery file is **unencrypted**. It can contain private text, media and
profile information. Keep it somewhere private. This release provides review
and recovery, not account import: protected import must wait for a complete
client encryption and key-distribution path. The original browser records are
never reset on launch and remain available if that future migration is added.

## Checks

`node tests/voidline-legacy-import-test.cjs` executes the actual journal and
review modules. Seven checks cover empty storage, exact fixture provenance,
modified/uncertain content, retained profile/media/references, journal edits and
tombstones, byte-preserving export, optional drafts/media, unrelated-cache
exclusion, malformed journals, and unavailable crypto/journal support. They do
not claim browser layout, account import, or encrypted backup verification.
