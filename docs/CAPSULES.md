# Choice Capsules

An active, onboarded account can claim one welcome capsule. This includes users who signed up before the release. Open Collectibles and use the welcome action. The server checks the same `onboarding_complete` field written by local password registration and provider onboarding. Browsing a collection, signing in again or editing a profile cannot issue an extra award.

A Standard community-channel post earns one stamp on its UTC date. Replies and posts with attachments qualify. Reaching three different dates in one Monday-to-Sunday UTC week creates one capsule automatically. Read receipts, heartbeats, DMs, invites, edits and background polling do not qualify. Private text is never inspected to compute eligibility. Each capsule gives one collectible from a family the user selects before confirming. Duplicate copies are distinct, transferable instances. Capsules themselves stay with their earning accounts and do not expire.

## What the server records

| Event | Required evidence | Committed effect |
| --- | --- | --- |
| Welcome reconciliation | Authenticated POST, CSRF, expected account, active database-time session, completed onboarding | Unique `(account_id,'welcome','onboarding')` capsule with the release edition active at issuance |
| Community participation | Fresh, permission-checked `POST /api/live/channels/:id/messages` in the original D1 batch | One `(account_id,utc_day)` stamp from the server-authored message creation time, without saving its text, channel or message ID in reward records. The third-day trigger creates the uniquely keyed weekly capsule and freezes its edition |
| Open | Account-owned capsule, allowed family in its frozen edition, active session, CSRF and a client-generated request UUID | One opening, one exact gift instance and a discovery event in the same D1 transaction |
| Acknowledge | Deliberate authenticated action on the opening account’s receipt | Idempotent receipt acknowledgment. An original copy’s arrival marker can clear only in its initial ownership period |
| Accept transfer | The gift service verifies both participants, the active recipient, current ownership period and the exact pending reservation | The same instance moves once. Its ownership period advances, old showcase and group placements clear, and its original opening receipt stays private to the original opener |

A send retry uses the original message ID and earns no extra stamp. The posting transaction rolls back if its reward record cannot complete. The weekly uniqueness key records the period, independently of the edition version. The account can open an earlier week’s earned capsule at any time.

## Frozen odds and progression

Edition `afterhours-choice.v1` includes `chudjak-plush.v1` and `pepe-keycap.v1`. Each family has six models. Their integer weights, in ascending tier order, are 5,000, 2,800, 1,400, 600, 150 and 50 out of 10,000. The public-facing backdrop and motif are fixed design choices. Each opening uses a Web Crypto integer with rejection sampling. The draw is independent across opens. No paid keys, pity rules, rerolls or duplicate protection participate.

With `CAPSULE_EXPANDED_FAMILIES=1`, newly earned capsules receive edition `afterhours-choice.v2`. This keeps both original tables and adds `midnight-tape.v1` (Graphite Session, Clear Leader, Splice Repair, Brushed Deck, Night Press, at 50%, 27%, 14.5%, 6.5%, 2%) and `copium-reserve.v1` (Field Enamel, Sight Glass, Field Repair, Kiln White, at 52%, 30%, 14%, 4%). These conditional weights total 10,000 separately for each selected family. Earlier capsules keep their two original choices. Returning the setting to 0 changes future issuance; previously issued four-family capsules keep all four choices.

At a weekly cadence and a constant choice of one hero family, a 0.5% Mythic chance has the following consequences. The welcome award, gifts received and gifts sent are excluded.

| Openings | Chance of any Mythic | Expected models owned | Expected additional copies | Chance of all six |
| ---: | ---: | ---: | ---: | ---: |
| 4 | 1.99% | 2.42 | 1.58 | 0% |
| 12 | 5.84% | 3.56 | 8.44 | 0.30% |
| 26 | 12.22% | 4.23 | 21.77 | 2.91% |
| 52 | 22.95% | 4.73 | 47.27 | 11.80% |

The cumulative chance first exceeds half at 139 openings, about 2.7 years at one opening a week. This release implements the provisional rates in the brief. The owner has not designated that time horizon as a progression target. A future cadence or odds change requires explicit new issuance settings. Existing earned capsules keep their frozen choices.

## Recovery and integrity

Each release edition contains an immutable serialized list of family tables and the identities, model metadata and original artwork references for their outcomes. Its row is installed from pinned source data within a guarded award transaction. Every capsule references its exact edition. The stored opening contains the frozen award snapshot, odds, art references and earned instance ID. Its private projection separately rechecks current possession and reservation status without disclosing other owners.

`GET /api/capsules/:id` recovers the original outcome after a lost response, refresh, skipped animation or subsequent transfer. Retrying `POST /api/capsules/:id/open` with its original key and family returns that outcome. An account reusing the key with changed contents gets a conflict. A second key racing on the same capsule can recover the winning outcome even if it requested another eligible family. No prospective random winner travels to the client.

A unique opening row is the durable consumption marker. Conditional SQL inserts that row only for the matching account, capsule, request and family under a current session. An insert trigger creates the unique gift instance in the same transaction, and another trigger records its discovery. A failed award insert aborts the entire D1 batch. SQL rejects capsule model IDs entering through a free legacy claim, grant or inventory insert without the matching committed opening. Normal transfer acceptance changes one ownership row. Artwork inspection and receipt replay never mint a copy.

## Rollout, migration and recovery tests

The schema-only migration is `0011_choice_capsules`. Existing instance IDs, original creation times, pending transfers, showcases and named collections stay intact. Older instances start with a “previously seen” marker and ownership period zero. The current owner’s known acquisition date can be recovered from accepted transfers or the original creation record. No legacy row becomes a newly rolled model. Public display preferences retain their previous values. The newly introduced full inventory has its own private default.

`CAPSULE_ISSUANCE_PAUSED=1` suspends new stamps and awards. `CAPSULE_OPENING_PAUSED=1` suspends new openings independently. An already committed receipt remains recoverable under either setting. Changing the service settings requires deploying the same compatible Worker configuration. During rollback keep the additive migration, immutable editions, openings, receipts, requests and owned gift records. Chat, profile and legacy support can operate independently of opening. Restore database backups in isolation before taking any action on a production store.

Run `node backend/capsule-runtime-test.mjs` for actual workerd/D1 HTTP, migration, earning, race, committed-result recovery and transactional rollback checks. The test uses fresh accounts and simulated historical event dates in a private database. It does not mutate a real user’s inventory. Browser, artwork and platform delivery evidence are separate.
