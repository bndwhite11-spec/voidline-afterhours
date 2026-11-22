# Gift artwork and motion

The active art registry has 49 name decorations, 53 gifts and two earned awards. The gift set includes 21 capsule models across four families and 32 older gifts. The older gift IDs keep their existing inventory and acquisition behavior. Twenty-nine received individual Workshop 01 drawings. Small Surprise, Curtain Call and Doomer Bloom retain their published Site 32 presentations. The badge and award images retain their previous source artwork and entitlement rules.

## What ships

Each model has four fingerprinted assets. The optical miniature is drawn on a 24-unit stage for dense lists. The poster and silhouette are static. The inspection file adds detailed geometry and a finite timeline. Grid cells load posters as they approach the viewport. A deliberate preview loads one inspection file. If the file is missing or its identity fails validation, the player keeps the matching poster or displays an unavailable mark with the supplied model name. Each capsule model pairs its art with a specific backdrop and motif. The generated backdrop uses local SVG paint and works under the site's existing content security policy.

The four family source modules in `src/art` contain editable silhouettes, materials and named moving parts. Chudjak's hood, waving arm and seat are cloth shapes. A Pepe keycap presses onto a separate spring and housing. Midnight Tape turns the reel hubs inside a stationary cassette. A Copium Reserve bottle reacts at its valve, needle and outlet. The older Last Tab Open, Chudjak Plush, Midnight Tape and Copium Reserve Tank retain their own distinct product IDs.

| Family | Models | Full-size objects | Sampled motion | Playback |
| --- | ---: | --- | --- | --- |
| Chudjak Plush | 6 | [Objects](collectible-proof/chudjak-plush-details.png) | [Poses](collectible-proof/chudjak-plush-poses.png) | [Clip](collectible-proof/chudjak-plush.mp4) |
| Pepe Keycap | 6 | [Objects](collectible-proof/pepe-keycap-details.png) | [Poses](collectible-proof/pepe-keycap-poses.png) | [Clip](collectible-proof/pepe-keycap.mp4) |
| Midnight Tape | 5 | [Objects](collectible-proof/midnight-tape-details.png) | [Poses](collectible-proof/midnight-tape-poses.png) | [Clip](collectible-proof/midnight-tape.mp4) |
| Copium Reserve | 4 | [Objects](collectible-proof/copium-reserve-details.png) | [Poses](collectible-proof/copium-reserve-poses.png) | [Clip](collectible-proof/copium-reserve.mp4) |

The proof folder also contains 16, 20 and 24 px miniature sheets against dark and light grounds, direct hero-family comparisons and JSON pose measurements. Each row of the four legacy sheets compares the published and current 64 px poster, followed by five poses sampled from the current production inspection asset. All 29 updated legacy motions have matching first and final sampled pixels, visible local movement and zero sampled opaque pixels at the outer stage edge. [Legacy 1](collectible-proof/legacy-curation-01.png) · [Legacy 2](collectible-proof/legacy-curation-02.png) · [Legacy 3](collectible-proof/legacy-curation-03.png) · [Legacy 4](collectible-proof/legacy-curation-04.png)

The Telegram research covers the relationship among model, backdrop and repeating symbol. Public gift studies and the original reference links live in the research record. Production models, materials and motion use VOIDLINE's own catalog. [Telegram gift model](https://core.telegram.org/constructor/starGiftAttributeModel) · [Backdrop](https://core.telegram.org/constructor/starGiftAttributeBackdrop) · [Pattern](https://core.telegram.org/constructor/starGiftAttributePattern) · [Prior reference studies](COLLECTIBLE-RESEARCH.md)

## Validation, provenance and history

The build compares the server catalog and the artwork registry by ID. Curated legacy materials, descriptions, alternative text, names and revisions must agree with the served account metadata. The 50 original layered scenes permit a restricted set of SVG primitives, locally resolved paint references and finite numeric tracks bound to named parts. The 54 active source-image compositions use a separate validator for their credited embedded raster and optical miniature. The public manifest carries asset kind, revision, rights, sources, variant sizes and full SHA-256 digests. Superseded raster credits on a Workshop model remain labeled as historical.

The player checks the same-origin URL, byte budget and full SHA-256 of the inspection file before importing its geometry. Source-image compositions also check the embedded raster digest. The player namespaces IDs per mount. Hidden tabs, offscreen stages, replaced or removed DOM, reduced motion and interrupted previews stop the active sequence. There is one foreground animation at a time. The client retains up to eight idle detail responses totaling at most 640 KiB. The still poster remains usable without motion.

Choice v1 pins all 48 original hero variant URLs and digests. Choice v2 pins the 36 expansion variants. The full art build checks every frozen entry. Future visual revisions retain prior immutable bytes under the published fingerprint. Where an authored source no longer recreates a pinned output, place those exact historical bytes in `src/art/historical-variants/` before cutting a revised release. Site 32's 128 gift variants and the earlier Studio fingerprints remain reachable. Compatibility routes for older clients preserve their expected image format. [Capsule transactions and snapshots](CAPSULES.md)

## Reproducing the checks

Run from the project directory with locked dependencies installed.

```sh
node scripts/build-art.mjs
node backend/art-assets-test.mjs
node tests/art-runtime-test.cjs
node tests/collectible-model-player-test.cjs
node tests/voidline-art-review-test.cjs
node tests/voidline-cassette-reveal-test.cjs
node scripts/review-collectible-models.mjs
node scripts/review-curated-gifts.mjs
node scripts/measure-collectible-delivery.mjs
```

For a motion movie, pass `--family <family-id> --video` to the family review script with ffmpeg installed. The optical sheets use actual compiled files and software rasterization. The runtime tests exercise shipped JavaScript in jsdom with real immutable source bytes, Web Crypto and controlled Web Animations API behavior. Device GPU performance and native browser playback need independent observation.

The measured baseline and current initial parser dependency sets have the same 11 JS/CSS requests, 412,457 bytes raw and 106,586 bytes at gzip level 6. Opening the collection brings its lazy JS/CSS group from nine requests and 56,452 compressed bytes to 13 requests and 79,113 compressed bytes in this build. The on-demand renderer is 44,269 compressed bytes. Per-model posters range from 846 to 4,452 compressed bytes and inspection assets including motion range from 1,068 to 5,023 compressed bytes. These local measurements exclude HTTP headers, HTML, account API traffic, decoding and paint. A warm replay of the most recent validated scene issued zero additional GETs in the player fixture. [Per-model transfer measurements](collectible-proof/payloads.json)
