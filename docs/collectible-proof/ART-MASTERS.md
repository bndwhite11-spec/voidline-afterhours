# Collectible master drawings

The 21 capsule models ship as local layered SVGs. Each has a resting poster, a detailed figure, a silhouette and a separately drawn 24-unit miniature. Family identity, model, tier, backdrop and motif come from the shared collectible registry. The backdrop sits behind the transparent art. None of the new assets contains a flattened character image, downloaded Telegram gift, external texture, audio file or font download. The cassette face lettering consists of original vector paths.

## Joints and construction

| Family and editable source | Parts that move | Grounding and overlap |
| --- | --- | --- |
| [Chudjak Plush](../../src/art/plush-models.mjs) | The torso compresses about the seated hips at (128, 208). The head nests in the torso at (130, 137). Both glasses and all facial embroidery belong to the head. Sleeve and paw turn together about their near and far shoulders. | Feet and shadow stay planted. The torso is drawn under each complete sleeve. The helmet has its own pivot over full hair and a fixed chin strap. The raised velvet hood unfolds around (128, 132) from the same low, lined collar seen in the poster. The silver bomber has a stitched highlight and a zipper pivot on its chest. |
| [Pepe Keycap](../../src/art/keycap-models.mjs) | The cap, stem, spring, shadow and each model's eye, light or reflection have distinct tracks. Stem displacement and spring compression share a stop at y=196. | The housing and socket stay planted. Relief, eyelids and lip sit on the cap itself. Black Opal Eclipse briefly lifts off the extended stem, reveals its underside and settles back on the guide. |
| [Midnight Tape](../../src/art/tape-models.mjs) | The supply and take-up hubs turn about (79, 117) and (171, 117) inside a casing tipped five degrees. The two spool pivots turn through different angles. The splice strip, clear leader, brushed-metal reflection or foil registration mark belongs to its corresponding construction. | A fixed shell holds both spindles. Clear Leader reveals unequal tape packs, guides and a marked tape path. Splice Repair catches briefly in the inspection slot. Brushed Deck clips a reflection to its inset plate. Night Press keeps its printed moon still while the foil mark turns with its hub. |
| [Copium Reserve Tank](../../src/art/tank-models.mjs) | The valve wheel turns about (92, 59). The dial needle turns about (161, 60), after the valve starts. The two short vapor tracks are local to their outlet. Each variant has its own valve, shell treatment and response. | The molded foot and tank stay grounded. The gauge retains a stationary dial face. The painted shell, clear liquid reservoir, patched utility tank and glazed ceramic variant use distinct panels and fittings. |

The optical miniatures identify a model through one or two features at small sizes. Inspect the main poster for tape lettering, plush embroidery or metal inscriptions. Each clip starts and ends in its model's canonical resting pose. For a drawing revision, keep a model's immutable identity and write new asset filenames for new bytes.

## Export and evidence

Run the following from the repository root with its lockfile dependencies installed. Video export also uses ffmpeg.

~~~sh
node scripts/build-art.mjs --require-web-sources
node scripts/review-collectible-models.mjs --video
node scripts/review-curated-gifts.mjs
~~~

The review tool reads the compiled manifest, verifies the files’ SHA-256 values, and samples the actual part transforms with their playback easing. The MP4s use a software renderer at 20 frames per second. They document the silhouette, layer overlap, motion and return to rest. Interactive playback, browser frame times, physical screen contrast and actual touch behavior need their own checks.

| Family | 16/20/24 and 64 pixels | Full illustrations | Motion |
| --- | --- | --- | --- |
| Chudjak Plush | [Light](chudjak-plush-optics-light.png) · [Dark](chudjak-plush-optics-dark.png) | [Sheet](chudjak-plush-details.png) · [Site 32 comparison](chudjak-plush-comparison.png) | [Sampled poses](chudjak-plush-poses.png) · [Video](chudjak-plush.mp4) |
| Pepe Keycap | [Light](pepe-keycap-optics-light.png) · [Dark](pepe-keycap-optics-dark.png) | [Sheet](pepe-keycap-details.png) · [Earlier Tab mechanism and new keycap](pepe-keycap-comparison.png) | [Sampled poses](pepe-keycap-poses.png) · [Video](pepe-keycap.mp4) |
| Midnight Tape | [Light](midnight-tape-optics-light.png) · [Dark](midnight-tape-optics-dark.png) | [Sheet](midnight-tape-details.png) | [Sampled poses](midnight-tape-poses.png) · [Video](midnight-tape.mp4) |
| Copium Reserve Tank | [Light](copium-reserve-optics-light.png) · [Dark](copium-reserve-optics-dark.png) | [Sheet](copium-reserve-details.png) | [Sampled poses](copium-reserve-poses.png) · [Video](copium-reserve.mp4) |

## Sources and credit

The familiar Chudjak proportions, brow, glasses, nose and compressed mouth were used as a visual reference to draw the plush in fabric. The historic meme image has no verified open-reuse license in the earlier gallery’s attribution. The new toy does not embed those image bytes. Pepe the Frog is Matt Furie's character. The sculpted keycaps are original drawings of that character, with no claim of endorsement or ownership of the underlying character. Legacy items retain their edition-specific source and credit records. [Chudjak reference](https://knowyourmeme.com/sensitive/memes/chudjak) · [Matt Furie](https://mattfurie.com/)

Telegram's gift presentation informed the readable family/model hierarchy and the separation between the figure and its backdrop. The physical drawings, poses, fixed backdrop pairings and drop weights in VOIDLINE were authored for this release. [Telegram collectible overview](https://telegram.org/blog/collectible-gifts-and-more) · [Backdrop attribute](https://core.telegram.org/constructor/starGiftAttributeBackdrop)
