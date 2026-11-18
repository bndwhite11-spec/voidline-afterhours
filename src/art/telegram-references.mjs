/** Research metadata for the additional Telegram collectible studies.
 * Canonical collection/model names are verified on the cited public Telegram
 * pages. Production drawings and choreography are separately authored SVGs.
 * No downloaded preview, TGS, marketplace data or ownership claim is bundled. */
export const TELEGRAM_REFERENCE_REVIEWED_AT = '2026-11-19';
const credit = 'Telegram collectible gift reference; collection and model names credited to the cited public Telegram page. VOIDLINE is an independent cosmetic interpretation.';
const rights = 'Original VOIDLINE vector study, not an official Telegram asset or NFT. Third-party character and mark rights remain with their respective holders; no endorsement, blockchain ownership, license to source artwork or market value is claimed. Reference downloads are private study material outside the repository.';
const entry = (id, canonicalName, sourceURL, modelName, backdrop, symbol, palette, observedMotion, transformInspiration) => Object.freeze({
 id, canonicalName, sourceURL, modelName, backdrop, symbol,
 sources: Object.freeze([sourceURL]), credit, rights,
 palette: Object.freeze(palette),
 paletteBasis: 'Approximate visual study colors, not an official brand specification.',
 sourceEvidence: Object.freeze({format:'Official public TGS, converted through python-lottie 0.7.2 to SVG and Inkscape raster samples',fps:60,frames:180,sampledFrames:Object.freeze([0,15,30,60,90,120,150,179]),scope:'Actual source-frame inspection; not a claim that the new VOIDLINE choreography or browser rendering passed QA.'}),
 observedMotion: Object.freeze(observedMotion),
 transformInspiration: Object.freeze(transformInspiration),
 productClassification:'Free VOIDLINE cosmetic study; no minting, paid trade or ownership of the referenced Telegram NFT.',
});

export const telegramReferences = Object.freeze({
 'gift-telegram-plush-pepe':entry(
  'gift-telegram-plush-pepe','Plush Pepe','https://t.me/nft/PlushPepe-1058','Amalgam','Persimmon','Crystal Ball',
  ['#303642','#E7194C','#F779EB','#087CE2','#0A9B17','#FFC32E'],
  ['The seated dark toy keeps separated red/yellow feet and large button eyes visible.','Blue and green arms independently draw a pink heart toward the body, compressing its outline before releasing it.','The final pose returns to the recognizable held-heart resting silhouette.'],
  {anticipation:'The toy notices the viewer; eyes glance and hands prepare around the held object.',reveal:'The separate held heart opens from a narrow folded form into a substantial colored object.',action:'Arms bend and press the heart against the chest with a small local squash; eyes and feet respond after the embrace.',settle:'Hands release pressure, the heart restores its volume and the seated silhouette returns. These are proposed original stages, not a description of implemented client motion.'}
 ),
 'gift-telegram-jelly-bunny':entry(
  'gift-telegram-jelly-bunny','Jelly Bunny','https://t.me/nft/jellybunny-41029','Dr. Jelly','Onyx Black','Mafdet',
  ['#F4C2A4','#FFF5DB','#76BDE4','#327AA4','#A3BD39'],
  ['The peach gelatin bunny wears a pale blue mask and blue headband with a round forehead mirror, resting on a pale plate.','Its body tips and squashes sideways while the ears and mask preserve attached structure.','The body and ears rebound and center, rather than remaining in a floating pose.'],
  {anticipation:'Forehead mirror catches a small directed light while the ears attend to the viewer.',reveal:'A separate soft body rises from a flattened wobble; the mask and headband keep clear attachment points.',action:'The jelly body compresses on one side, ears lag and recover, and the mirror tilts independently.',settle:'The plate stays grounded while the gelatin volume gives one diminishing rebound and returns to its calm seated form. Proposed VOIDLINE choreography.'}
 ),
 'gift-telegram-durovs-cap':entry(
  'gift-telegram-durovs-cap','Durov’s Cap','https://t.me/nft/DurovsCap-2870','Tron','Indigo Dye','Money Bag',
  ['#071124','#0C3244','#56DEEC','#3A2264','#EFFAFF'],
  ['A nearly black crown has selective cyan seams, a pale paper-plane mark and layered curved visor bands.','The visor lifts and exposes its underside around the middle of the sampled sequence as the crown tips.','Reflections shift with the turn, then the brim lowers into the original cap silhouette.'],
  {anticipation:'A short seam light travels toward the front of the crown.',reveal:'The curved visor hinges upward and exposes a visibly separate underside.',action:'Front panels ease apart into a brief constructed display, with the visor and rear strap moving on distinct pivots.',settle:'Panels reconnect, the visor folds down and a final directional reflection confirms the cap’s volume. Proposed original transformation; no official affiliation.'}
 ),
 'gift-telegram-astral-shard':entry(
  'gift-telegram-astral-shard','Astral Shard','https://t.me/nft/AstralShard-260','Dark Soul','Electric Purple','Gold',
  ['#450914','#A92B19','#FF8E27','#FFD13D','#FFF0BA'],
  ['Angular red/orange crystal fragments enclose a brighter faceted center.','Independent fire-like ribbons and small luminous points weave in front of and behind the solid core.','The core remains readable while the ribbons change curvature and position; this is more than a whole-object glow pulse.'],
  {anticipation:'Small fragments lean toward a darkened central crystal.',reveal:'Outer facet plates separate enough to expose the inner core and its drawn depth.',action:'Distinct attached shards orbit through an ordered opening while narrow original energy ribbons pass behind and in front of them.',settle:'Facet plates interlock, ribbons contract and the object returns to a stable complete crystal with a brief restrained inner reflection. Proposed VOIDLINE stages.'}
 ),
 'gift-telegram-heroic-helmet':entry(
  'gift-telegram-heroic-helmet','Heroic Helmet','https://t.me/nft/HeroicHelmet-1','King Leonidas','Black','Coin Purse',
  ['#8D481D','#C89545','#F7D789','#C43317','#F2682E','#2785BD'],
  ['A gold classical helmet has an orange-red crest, red side protection and blue arrow details.','The shell turns toward the viewer, changing the visible cheek and visor planes.','The crest and arrows lag the turn, a brief metallic glint crosses the shell, and the helmet returns to its side-facing rest.'],
  {anticipation:'The red crest draws taut before the helmet moves.',reveal:'Separate cheek guards and brow rotate enough to reveal a dark interior and rim thickness.',action:'The visor opens through a mechanical pivot; crest segments and small decorative fastenings react with delayed motion.',settle:'The visor closes with a short controlled recoil, crest fibers settle and the profile returns. Original SVG transformation, not a reused source animation.'}
 ),
 'gift-telegram-skull-flower':entry(
  'gift-telegram-skull-flower','Skull Flower','https://t.me/nft/skullflower-17528','Sunburst','Light Olive','Flower',
  ['#F56D2A','#FFA64A','#FFE0AE','#EAFBFF','#1D1D2B','#229DCD'],
  ['An ivory skull sits in layered orange petals with broad cyan-blue leaves.','The flower rotates and folds the petal/leaf cluster, presenting a larger exposed skull in the middle frames.','Leaves and petals fan back into the complete flower; an early droplet separates and falls.'],
  {anticipation:'Leaves draw inward and the flower holds a brief closed-bud pause.',reveal:'Separate petal rings unfold in order around the visible skull.',action:'The skull lifts and turns slightly while blue leaves sweep behind and the lower petal ring curls forward.',settle:'The skull seats back into the bloom, leaf motion decays and the complete flower silhouette holds. Proposed original choreography.'}
 ),
 'gift-telegram-vintage-cigar':entry(
  'gift-telegram-vintage-cigar','Vintage Cigar','https://t.me/nft/vintagecigar-5937','Silver Bullet','Mint Green','Tie',
  ['#1B1C21','#6E7786','#C0D5E9','#F0E8C8','#EF7626','#FFE532'],
  ['A dark cylindrical wrapper has diagonal silver/blue bands and a round pale emblem, with the ember at the left.','The ember brightens to yellow while the cylinder turns and shortens in perspective; separate smoke curls change with that action.','Smoke briefly reduces then reforms as the ember returns toward orange and the cigar resumes its resting angle.'],
  {anticipation:'A separate wrapper band rotates to show its edge before the main action.',reveal:'The cylinder turns through a short perspective change, exposing its cut end and distinct layered rim.',action:'The ember intensifies locally and an authored smoke ribbon curls upward in two connected bends; a small ash piece breaks away once.',settle:'Smoke thins, the ash stops and the cylinder returns to the quiet resting angle. Proposed cosmetic stagecraft, not a functional smoking or trade feature.'}
 ),
 'gift-telegram-lol-pop':entry(
  'gift-telegram-lol-pop','Lol Pop','https://t.me/nft/LolPop-223713','Vanilla Jam','Electric Indigo','Chest',
  ['#FFF3C9','#FB5C9B','#3BC6F4','#267FDE','#A62A9A'],
  ['A thick ivory/cyan/pink spiral candy sits on a purple stick.','The candy face rotates almost edge-on in the later middle frames, showing its thin colored edge and physical thickness.','The face returns to a full spiral disk while the stick remains visibly attached.'],
  {anticipation:'The outer candy rim gives a small twist while the stick remains anchored.',reveal:'The spiral face turns edge-on and a separate back/edge construction becomes visible.',action:'Two drawn spiral sections unwind outward briefly around a small central hub, then wind back in opposite order.',settle:'The face completes its turn, all spiral pieces reconnect and a single local highlight crosses the restored candy disk. Proposed original transformation.'}
 ),
});
