import {editionThreeFamilies} from './edition-three-families.mjs';
import {workshopFamilies} from './workshop-families.mjs';
// Stable identity and collector copy. Art modules supply geometry, never odds.
const model = (id, name, material, description, alt, setting) => ({
  id, name, material, description, alt, setting
});

const plush = [
  model('gift-chudjak-original', 'Original Chudjak', 'Felt, cotton shirting and embroidered thread',
    'An unimpressed face behind thick glasses. One soft hand lifts for a reluctant wave.',
    'Seated Chudjak doll with felt hair, thick glasses, sewn shirt and rounded feet.',
    ['Warm Desk', 'Seam marks', '#755d4b', '#29232a', '#a48971', '#fff4df']),
  model('gift-chudjak-midnight-hoodie', 'Midnight Hoodie', 'Charcoal jersey with ribbed cotton cuffs',
    'He tugs at a lined hood. The cords take a beat to settle against his chest.',
    'Bespectacled Chudjak in a charcoal hood with a deep lining and two hanging drawstrings.',
    ['Night Bus', 'Stitches', '#45586c', '#192431', '#788da4', '#f3f6ff']),
  model('gift-chudjak-helmet', 'Helmet Chudjak', 'Olive twill, webbing and padded felt',
    'A padded field helmet slips with the tilt of his head. One hand nudges it back.',
    'Chudjak plush in a paneled olive helmet with a chin strap and a utility overshirt.',
    ['Field Dusk', 'Stitched chevrons', '#60664c', '#232a24', '#919774', '#fcfae3']),
  model('gift-chudjak-patchwork', 'Patchwork Afterhours', 'Pieced cotton with blanket-stitched repairs',
    'Cream, burgundy and graphite panels pull together in a brief self-hug. One knee wears a repair.',
    'Patchwork Chudjak toy with a repaired knee, mismatched cuff and stitched fabric panels.',
    ['Burgundy Workshop', 'Repair crosses', '#78515d', '#321f2c', '#b28785', '#fff4ee']),
  model('gift-chudjak-silver-thread', 'Silver Thread', 'Dark velour, satin and silver embroidery',
    'A shoulder turn catches the silver embroidery. The zipper pull swings against the satin collar.',
    'Chudjak in a dark satin bomber jacket with a separate zipper pull and silver stitching.',
    ['Graphite Atelier', 'Thread loops', '#5c616c', '#232531', '#959cac', '#fbfaff']),
  model('gift-chudjak-velvet-eclipse', 'Velvet Eclipse', 'Violet velvet with moon-gray lining and woven trim',
    'He draws a velvet hood around his glasses, lowers it and gives a small wave.',
    'Violet velvet Chudjak with a lined hood, a moon-gray interior and a familiar deadpan face.',
    ['Eclipse Violet', 'Crescent stitches', '#61537d', '#241d35', '#a08ba9', '#fff5ff'])
];
const keycaps = [
  model('gift-pepe-desk-green', 'Desk Green', 'Moss-green molded PBT, cream stem and brushed steel',
    'Raised sleepy eyes sit above a broad terracotta lip. A single press compresses the switch.',
    'Sculpted green Pepe keycap with sleepy raised eyes, a cream stem and a grounded metal socket.',
    ['Warm Terminal', 'Key legends', '#75664b', '#282720', '#a99870', '#fcfae9']),
  model('gift-pepe-terminal-clear', 'Terminal Clear', 'Translucent jade polycarbonate and brass spring',
    'The stepped clear wall exposes the spring. A point of light rises through the jade as it releases.',
    'Clear jade frog keycap with a visible internal stem and brass spring.',
    ['Deep Jade', 'Circuit traces', '#37695f', '#162b2c', '#70a497', '#f0fff6']),
  model('gift-pepe-night-shift', 'Night Shift', 'Graphite and ivory two-shot plastic',
    'A small moon sits in the graphite cap. The far eye opens under load and settles back.',
    'Graphite and ivory sculpted frog keycap with a crescent inset beside the raised eyes.',
    ['Ink Blue', 'Moons', '#4d5f7a', '#1b2238', '#8198b7', '#f5f7ff']),
  model('gift-pepe-porcelain-pond', 'Porcelain Pond', 'Ivory ceramic glaze, celadon and gold repair lines',
    'Painted reeds curl around the ceramic face. A fine gold seam catches the light on release.',
    'Ivory glazed frog keycap with a celadon face and a fine gold repair seam.',
    ['Pond Mist', 'Ripples', '#557675', '#223737', '#8db0a5', '#f6fff4']),
  model('gift-pepe-meteor-core', 'Meteor Core', 'Faceted ironstone, polished nickel and amber resin',
    'A warm inclusion sits inside the cut mineral shell. One reflection circles the inset.',
    'Dark faceted mineral frog cap with a bright amber inclusion and polished metal stem.',
    ['Copper Dusk', 'Mineral facets', '#805b4d', '#342623', '#bd8e70', '#fff6ea']),
  model('gift-pepe-black-opal-eclipse', 'Black Opal Eclipse', 'Carved opal, silver and smoked metal',
    'The opal cap lifts clear of its stem, revealing an eclipse, then seats itself in the switch.',
    'Dark opalescent frog keycap with a silver crescent over a smoked-metal switch housing.',
    ['Plum Night', 'Crescents', '#6a5573', '#2c2034', '#a38aaf', '#fff4ff'])
];

const tiers = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
const weights = [5000, 2800, 1400, 600, 150, 50];
const familyDefinitions = [
  { id: 'chudjak-plush', name: 'Chudjak Plush', entries: plush, tableRevision: 2 },
  { id: 'pepe-keycap', name: 'Pepe Keycap', entries: keycaps, tableRevision: 2 },
  ...workshopFamilies.map(family=>({...family,tableRevision:2})),
  ...editionThreeFamilies
];

export const collectibleFamilies = Object.freeze(Object.fromEntries(familyDefinitions.map(({ id, name, entries, tableRevision = 1 }) =>
  [id, Object.freeze({ id, name, modelIds: Object.freeze(entries.map(m => m.id)), tableVersion: id + '.v' + tableRevision })]
)));
export const collectibleModels = Object.freeze(Object.fromEntries(familyDefinitions.flatMap(({ id: familyId, entries, tiers: familyTiers = tiers, weights: familyWeights = weights }) =>
  entries.map(({ setting, ...entry }, index) => {
    const [name, motif, center, edge, motifColor, foreground] = setting;
    return [entry.id, Object.freeze({
      ...entry, familyId, tier: familyTiers[index], weight: familyWeights[index],
      backdrop: Object.freeze({ name, center, edge, motifColor, foreground }), motif,
      artRevision: 'atelier-02', acquisitionPolicy: 'capsule-only'
    })];
  })
)));
