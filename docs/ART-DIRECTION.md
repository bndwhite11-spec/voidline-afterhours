# VOIDLINE art direction / edition 3

The preserved full brief is `VOIDLINE-MEGA-IMPROVEMENT-8.txt`. Later user steering requires accurate names for recognized badges, a larger CHUD/Chudjak/Wojak meme family, and original gifts informed by Telegram collectible construction and motion. **Do not ship copies of Telegram’s named NFT gifts.** Their names, models and downloaded frames belong only to research. The final catalog is47 decorative badges and32 original gift designs, with2 earned awards separate.

Existing account IDs, catalog IDs, owned instances, showcase selections and legitimate awards remain. Display-name corrections retain aliases: XRP, Max Stirner, Chudjak, Bitcoin, Ethereum, Solana, Dogecoin and Reply Guy. None of these names or images signifies holdings, official affiliation, ideology, an earned achievement or platform authority.

## Visual direction

Graphite and restrained acid-lime organize the interface. Object artwork uses ivory, oxblood, jade, brass, smoked glass and precise chrome. Draw anatomy, material planes, thickness, occlusion and attachments. Keep silhouettes distinct. Avoid generic gradient-filled logo cutouts, uniform circular frames and automatic decorative sparkle.

The first six quality-gate objects were Max Stirner, Chudjak’s curtain scene, LARP PRO MAX, XRP, Chrome Rose and Midnight Tape. Their actual SVGs were rasterized with Inkscape at optical/card/inspection/silhouette sizes. The rose was revised after review. All subsequent art uses the same contract and review process. This establishes illustration evidence, not browser playback or mobile layout verification.

## Editable module contract

Art packs in `src/art/` export object maps. Each known ID maps to:

```js
{
  name, type: 'badge' | 'gift' | 'earned', series, material, alt,
  mini: '<g>…</g>', // separately authored24×24, inspected at16/20/24px
  body: prefix => '<g>…</g>', //256×256 scene with named construction layers
  silhouette: '<path…/>',
  motion: { duration: 1280, layers: [
    { name: 'visor', origin: [128,116], frames: [
      {at:0}, {at:.35,rotate:18}, {at:.8,rotate:0}, {at:1}
    ] }
  ] }
}
```

`body(prefix)` receives a safe unique prefix. Parts use `<g data-part="visor">`. Repeated named parts deliberately move together. Build around credible pivots and attachment points. Do not substitute whole-card bobbing for part movement. Omitted motion transform fields have neutral defaults. Motion data is declarative; arbitrary JavaScript is not accepted.

Shared material gradients live in `materials.mjs`; object-local definitions use prefix IDs. `va-detail-only` can omit microscopic inspection detail from cards. Inscriptions use real text with fallback fonts. Production SVGs contain no remote images, external references, scripts, foreignObject or SMIL.

## Production architecture

`catalog.mjs` merges original, culture, extra, genre and gift packs. `scripts/build-art.mjs` validates identity coverage, object contracts and bound choreography; it emits mini/card/detail/silhouette SVGs with content fingerprints under `/art/v3/`, plus a provenance manifest. The client bundle contains optical marks and motion metadata; full SVG scenes load on inspection or explicit preview.

Static artwork is always complete. Hover/focus, deliberate previews and acknowledged receipt reveals remain separate. The runner animates named parts with Web Animations, bounded900–1800ms sequences, segment easing and a final settled hold. Stop, closing, replacement, account lock, visibility loss or reduced motion restore the complete still. There is no perpetual background animation or autoplay sound. Previewing unowned art never grants, transfers or claims anything.

`gift-bases.mjs` contains the8 original base-inspired gifts: Chudjak Plush, Wojak Jelly, Doomer Bloom, Brainrot Pop, LARP Cap, Spook Crystal, LARP Helmet and Copium Cartridge. `telegram-references.mjs` documents actual reference-frame observations only. Reference metadata must never overwrite a product ID, name or type. No third-party TGS, preview image, rarity, edition, marketplace price or blockchain-ownership record is shipped.

## Review artifacts and limits

`scripts/review-art.mjs --all` exports actual SVG/PNG variants. `scripts/art-contact-sheet.mjs --all` produces the contact sheet and optical/silhouette proof. `scripts/render-art-motion.py` samples the same named-part keyframes into a filmstrip/GIF; these are rendered diagrams rather than screen recordings. The public `/art-review.html` shows actual generated assets and deliberate previews without account APIs.

Review alt text, source credits and meaning with the visual forms. Cultural sources and creator attribution are in `COLLECTIBLE-RESEARCH.md` and the manifest. Research access is not a license or endorsement. Earned awards and real role indicators stay separate from decorative genre artwork. Browser/device acceptance is reported honestly in the release report.
