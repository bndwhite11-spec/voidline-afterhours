# Private named gift collections

Named collections organize existing owned gift instances. They are separate from
ownership, an equipped decoration and the three profile-showcase slots. A gift
may appear in several named collections at once. Removing it from a group or
removing the group never deletes, transfers or revokes the gift.

## User flow

From the Collected view, choose **Organize gifts** to create, rename, open or
remove a private group. **Add gifts** opens the caller's paginated inventory.
Each item has an explicit Add to group / Remove from group action. An owned
instance's **Add to named collection** action opens a picker showing all of the
caller's groups and current inclusion. No claim, equip, showcase or transfer API
is called by browsing or organizing.

The same gift can be in multiple groups. There are up to 24 groups per account;
names contain 1–40 readable characters. Owned inventories and group contents
load 50 items per page. Names are escaped in the client and normalized for
account-scoped uniqueness. There is no public group endpoint or implicit
profile publication. Profile collection visibility and sender-disclosure
preferences remain independent.

## Storage and authorization

Additive migration 0010 creates:

- `gift_collections`: immutable group ID and owner, normalized name, stable
  create-request ID, revision/change marker and timestamps.
- `gift_collection_items`: references an existing collection and gift instance,
  with a composite key, position and added time.

Every API authenticates the native session. Mutation origin, CSRF, expected
account and rate-limit checks remain mandatory. Every referenced group must be
owned by the caller, and every referenced instance must currently belong to
that account. Ownership is rechecked in the atomic write, not inferred from a
browser inventory or prior lookup.

Updates use an expected revision and a transaction-specific change marker.
Stale conflicting edits return a visible reload path; they cannot overwrite a
newer group. Repeating an already-applied item inclusion is a no-op. Creation
reuses a stable client ID so duplicate requests cannot create another group.
Reusing that ID for a different name produces a conflict rather than a second
object. Deleting a group cascades only its grouping rows.

Database triggers enforce owner-compatible item links. A gift transfer removes
that instance from its former owner's groups and advances those group revisions;
it does not copy the grouping to the recipient. The recipient may organize the
received instance independently. Soft account deletion removes private named
groups, saved looks and profile-save state while retaining legitimate gift
provenance under existing retention rules.

## API

| Endpoint | Meaning |
| --- | --- |
| `GET /api/gift-collections` | Private groups and current-owned item counts. Optional `?instance=` gives inclusion for one currently owned instance. |
| `GET /api/gift-collections/inventory` | Caller-owned instances, 50 per page; optional `collection` shows inclusion. |
| `GET /api/gift-collections/:id` | Current-owned contents of one caller-owned group. |
| `POST /api/gift-collections` | Create with `name` and stable UUID `clientId`. |
| `POST /api/gift-collections/:id/rename` | Change the name using `expectedRevision`. |
| `POST /api/gift-collections/:id/items` | Set `included` for `instanceId`, using `expectedRevision`. |
| `POST /api/gift-collections/:id/delete` | Remove the group using `expectedRevision`; gifts remain owned. |

Responses use private/no-store caching. No endpoint returns credential records,
server change tokens, private gift notes, other accounts' groups or authority to
transfer an item.

## Verification

`backend/gift-collections-test.mjs` uses actual migrated SQLite and native
session handlers for empty accounts, name uniqueness, create retries,
multi-group inclusion, group-removal preservation, cross-account denial,
revision conflicts, transfer cleanup, commit-time revocation/ownership races,
pagination, CSRF/origin/account checks and database ownership constraints. It
also applies 0010 to populated 0009 data and checks retained identities, private
profile preferences, gifts, showcase and earned-award records, plus integrity
and foreign keys. Meaningful profile triggers preserve the CAS write token and
ignore no-op writes.

`backend/gift-collections-runtime-test.mjs` also executes the full migration
chain and grouping handlers on actual isolated workerd/D1. It verifies
trigger-inclusive metadata, transfer cleanup, cascading group deletion without
ownership loss, and cosmetic equip acknowledgments with profile revision
triggers. This is local runtime evidence, separate from hosted verification.

`tests/voidline-gift-collections-test.cjs` checks the controlled client flow,
precise API actions, retry IDs, error draft preservation, duplicate submits,
account/session/dialog invalidation, escaped names and exact-instance inspection
returning to the same authorized group page. The client also preserves group
scroll/focus positions through inspection; physical browser behavior still needs
verification. These checks are not
physical-device, browser-layout, production migration or hosted-account proof.
