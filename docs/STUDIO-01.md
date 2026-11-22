# Studio 01 collectibles

This records the historical Studio 01 visual edition. Its proof script reproduces the published source-image compositions. [Current gift artwork and motion](COLLECTIBLE-ART.md)

Seven existing gifts and one existing name decoration have new artwork. The source images remain credited in each inspection view. Studio 01 combines those images with separately drawn objects, working parts and optical miniatures. The existing catalog IDs continue to identify the same gifts and decoration.

## Object guide

Use a three-quarter or front-facing resting pose with light arriving from above left. Leave room within the 256-unit stage for the widest animated pose. A small contact shadow grounds a metal object; the paper ghost has a separated shadow to make its lift legible. Light metal uses a bright upper lip and a darker lower edge. Paper uses broad adjoining folds. Casing, seams and screws have firmer edges than shadows. Brass and blue-green enamel recur on minted objects.

The 24-unit miniature is a separate drawing. Use one identifying outline, a small number of contrasting internal planes and a clear edge against dark and light backgrounds. On the cassette, the two hubs matter more than the label type. On the rose, the bloom, leaf and stem matter more than the texture of each petal. Miniatures export to 96-pixel transparent PNGs for high-density displays. Catalog posters omit selected secondary line work. Detail art retains the source material and its texture.

| Existing ID | Object | Reveal and inspection |
| --- | --- | --- |
| gift-rose | Chrome Rose | The bound stem bends, two socketed outer petals unfold, and a narrow reflection touches the photographed bloom. The optical mark has a separate flower head, leaves and stem. |
| gift-star | Pocket Star | Perhelion’s five-point star rocks across a gilt bevel. A clipped highlight crosses the facets. All five points remain visible. |
| gift-cassette | Midnight Tape | Fyrsten’s cassette sits in a graphite shell with an ice-blue label. The two independently masked hubs take up slack at different rates. Matching cutouts remove the stationary teeth behind them. |
| gift-ghost | Paper Ghost | A broad folded hood frames the face from Douglas P. Perkins’s photograph. It rises slightly and the hinged tail follows. The small mark keeps the hood, face and pointed tail. |
| gift-signal | Sealed Signal | Cream folded paper holds the original red wax impression. A back hinge opens, a note lifts, then the pieces fold back into the original pose. |
| gift-block-zero | Block Zero | The credited cube sits in a petrol-enamel field and gilt milled rim. Its turn reveals the edge while retaining at least 73 percent of the face width. |
| gift-last-tab | Last Tab Open | The photographed Tab key travels into an amber switch above the socket, rebounds once and settles. Two copper contacts and the lower plate stay fixed. |
| coin-genesis-block | Genesis Block | The three interlinked cube outlines sit in a hexagonal enamel pin. Its restrained pin tilt is shorter than the seven gift reveals. |

## Review evidence

[Previous and current resting poses](quality-assets/studio-01-before-after.png) · [Transparent miniatures at 16, 20 and 24 pixels](quality-assets/studio-01-miniatures.png) · [Five sampled poses](quality-assets/studio-01-motion.png) · [Object-motion study](quality-assets/studio-01-reveals.mp4)

The comparison uses the released v31 detail on the left and the current detail on the right. The miniatures are displayed on pale and dark grounds. Each gift has a complete resting pose and a deliberate return. The cassette's hub travel is subtler at gallery size. The Block Zero and Genesis Block inscriptions require the larger inspection view. The small marks convey the respective coin and three-cube pin.

The motion study samples the production named-part transforms and per-interval easing in software, using librsvg through sharp. It runs at 20 fps and includes the settling pose. It establishes object continuity and composition at the sampled frames. Browser compositor timing, mobile frame rate, assistive technology and physical screen quality require separate verification.

## Reproduction and compatibility

- Run `node scripts/prepare-studio-miniatures.mjs` after changing a miniature master. Commit the generated PNG and updated path map. Ordinary builds use the pinned PNGs.
- Run `node scripts/build-art.mjs --require-web-sources`, then `node scripts/review-studio-art.mjs` to rebuild all four review artifacts. Rendering the MP4 requires ffmpeg.
- Run `node backend/art-assets-test.mjs` and `node tests/voidline-cassette-reveal-test.cjs` to check compiled variants, credited raster identity, historical artwork and the cassette mechanism.
- The public manifest stays on its v4 format and records the per-item Studio 01 edition and storyboard. New variants have new content fingerprints. The art builder also emits all 32 original v31 variants for these IDs, preserving the old bytes for clients with the previous motion data.
- Source credit, license and modification records remain in the manifest under each stable item ID. The new setting and miniature are identified separately from source-image authorship. The other 75 objects retain their previous art and await a separate craft review.
