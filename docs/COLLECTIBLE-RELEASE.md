# VOIDLINE collectible release

Open Collectibles in the signed-in app, claim the welcome Choice Capsule, inspect a family's complete odds and confirm once. The result identifies the exact copy. It can go in a profile slot, a private group or an offer to an eligible recipient. Opening receipts remain available from the collection. Visitors can inspect every model and replay its motion in the [public gallery](https://voidline-afterhours.pipedcactus1.chatgpt.site/art-review.html).

## What shipped

| Edition or family | Eligible models | How to inspect |
| --- | --- | --- |
| Chudjak Plush v1 | Original Chudjak, Midnight Hoodie, Helmet Chudjak, Patchwork Afterhours, Silver Thread, Velvet Eclipse | [Old and new](collectible-proof/chudjak-plush-comparison.png) · [Six models](collectible-proof/chudjak-plush-details.png) · [Motion](collectible-proof/chudjak-plush.mp4) |
| Pepe Keycap v1 | Desk Green, Terminal Clear, Night Shift, Porcelain Pond, Meteor Core, Black Opal Eclipse | [Legacy Tab and new keycap](collectible-proof/pepe-keycap-comparison.png) · [Six models](collectible-proof/pepe-keycap-details.png) · [Motion](collectible-proof/pepe-keycap.mp4) |
| Midnight Tape v1 | Graphite Session, Clear Leader, Splice Repair, Brushed Deck, Night Press | [Five models](collectible-proof/midnight-tape-details.png) · [Motion](collectible-proof/midnight-tape.mp4) |
| Copium Reserve v1 | Field Enamel, Sight Glass, Field Repair, Kiln White | [Four models](collectible-proof/copium-reserve-details.png) · [Motion](collectible-proof/copium-reserve.mp4) |

The first two families form edition `afterhours-choice.v1`. Edition `afterhours-choice.v2` adds the tape and tank families. A capsule retains its edition and artwork references from the time it was earned. Each model has its own poster, optical miniature, layered illustration, physical motion tracks and fixed backdrop and motif. The family source notes include pose sheets, light and dark miniatures, materials and source credits. [Art masters](collectible-proof/ART-MASTERS.md) · [Mechanical studies](collectible-proof/MECHANICAL-MASTERS.md)

The original catalog contained 32 gifts. Twenty-nine now have revised presentations. Small Surprise, Curtain Call and Doomer Bloom keep their legacy artwork and sit outside capsule draws. Last Tab Open remains its own Tab key. Chudjak Plush retains its pre-capsule identity. Existing LARP equipment and Copium Cartridge copies stay distinct. The 32 original IDs keep their free legacy acquisition policy and their existing ownership records. The 21 new models enter circulation only through committed capsule openings and may subsequently change hands by accepted exact-copy transfer. [All 32 curation decisions](collectible-proof/legacy-map.csv) · [Visual evidence for every prior gift](collectible-proof/legacy-curation.json)

## Earning and ownership

One completed account can claim one welcome capsule. A successful new post in a Standard community channel qualifies for one daily stamp. Three different UTC dates in the same Monday–Sunday week earn one weekly capsule. Once the user chooses a family, the outcome is an independent draw within that family. For either hero family the six odds are 50%, 28%, 14%, 6%, 1.5% and 0.5%. That last tier has a 22.95% cumulative chance after 52 openings in the same family. The provisional rates have been retained. The owner has yet to choose a long-term collection target. [Frozen odds and progression table](CAPSULES.md)

The sender owns a reserved copy until acceptance. Acceptance moves its instance ID, removes its old showcase and group placements, and records the result. Declining or cancelling releases the reservation. An earlier request cannot give away a later ownership period. Historical openings stay with the originating account. New full inventories default to private. Public profile slots follow their existing permission settings. A grant from the free legacy catalog uses a separate review flow.

## Implementation and staged release

The baseline was public Site 32, commit `c19286f8d18f1ea7b73ae900f49b68f5807f9081`. The account service, D1 and media store remain in place. The additive migration `drizzle/0011_choice_capsules.sql` adds earning and opening records, model discovery, inventory preferences and reservation safeguards. Table snapshots pin the model metadata and media hashes. The response comes after the ownership transaction commits. [Award rules](../worker/capsule-rules.mjs) · [Capsule handlers](../worker/capsules.mjs) · [Inventory projection](../worker/collectible-inventory.mjs)

Publish the compatible Worker with issuing and opening paused, verify asset and API delivery, then enable the two operations independently. The expanded-family flag affects future issuance. Existing openings can be recovered during a pause. Preserve the ledger and the historic asset URLs if a rollback is required. [Operational controls](CAPSULES.md) · [Restore procedure](BACKUP-RESTORE.md)

## Verification and limits

The packaged Worker can be exercised with generated isolated accounts and ephemeral D1/R2 bindings. Run these commands from the project root after the normal build.

~~~sh
npm run test:server
npm run test:client
npm run check:restore
node scripts/verify-web-workspace.mjs --collectibles --expanded --collectible-transfer
node scripts/verify-web-workspace.mjs --collectibles --expanded --lost-opening-response
node scripts/verify-web-workspace.mjs --collectibles --reduced-motion --missing-art
~~~

The isolated flows exercise entitlement, confirmation, instance identity in the receipt and inventory, profile featuring, and exact-copy acceptance. [Two-account results](collectible-proof/transfer-flow.json)

Database fixtures exercise races, date boundaries, migration, retries and counts beyond the initial 200-copy page. Scripted interaction uses jsdom and the shipped application. Art proofs use the production SVGs, sampled transforms and a software renderer. The initial chat route retains its 11 parser assets and 106,586 bytes under per-file gzip level 6. Motion loads on inspection. Warm replay of a recently used model needs zero new detail downloads. [Per-model download costs](collectible-proof/payloads.json)

Physical Android and iOS playback, installed-app resume, screen reader output and hardware frame rate require a device session. The motion studies are 20 fps software exports. They document the poses and timing of the artwork.
