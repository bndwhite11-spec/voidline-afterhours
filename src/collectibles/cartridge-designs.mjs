// Free catalog gifts. Capsule editions retain their own frozen model tables.
export const cartridgeSeries = 'Copium Cartridges';

function cartridge(name, material, description, alt) {
  return Object.freeze({
    name, material, description, alt,
    series: cartridgeSeries,
    artRevision: 'cartridge-01',
    acquisitionPolicy: 'legacy-free',
  });
}

export const cartridgeDesigns = Object.freeze({
  'gift-cartridge-rain-check': cartridge(
    'They’ll Text Back', 'Storm-blue glass, midnight paper and antique brass',
    '“They saw it. They’re just busy.” The ember sends up three typing dots. The reply never arrives.',
    'A tiny terracotta umbrella sits inside a blue glass cigar cartridge. A midnight-and-gold band wraps its brass-trimmed barrel. Blue-gray smoke forms three typing dots above the ash tip.'
  ),
  'gift-cartridge-second-wind': cartridge(
    'One More Game', 'Indigo concertina sleeve, copper foil and ivory enamel',
    '“I can end on a win.” A puff curls into the retry arrow. There goes another evening.',
    'An indigo ribbed cigar cartridge with ivory ends, an orange seal and a copper checkerboard band around a cream dial. Pale lavender smoke curls into a retry arrow.'
  ),
  'gift-cartridge-hold-music': cartridge(
    'Next in Queue', 'Smoked violet glass, silver foil and spring brass',
    '“My call is very important to them.” The ember plays one smoky note of hold music. The queue hasn’t moved.',
    'A violet glass cigar cartridge with a silver QUEUE band and three brass reeds in its side window. Lavender smoke rises from the ashy tip to form a musical note.'
  ),
  'gift-cartridge-panic-button': cartridge(
    'It Was Lag', 'Graphite enamel, gold-edged foil and amber resin',
    '“That hit never registered.” The puff forms a Wi-Fi signal, then the bars break apart.',
    'A graphite cigar cartridge with warning stripes, a foil LAG band and an amber guard over a scarlet release. Ember smoke stutters into three broken Wi-Fi arcs.'
  ),
  'gift-cartridge-last-resort': cartridge(
    'Still Early', 'Smoked jade glass, nacre, rose gold and pink opal',
    '“The chart just needs more time.” The line finally goes up. Granted, it’s made of smoke.',
    'A nacre-wrapped cigar cartridge with a rose-gold band, an ivory pressure dial and a pink opal in the jade flank. Rose smoke traces a rising price chart.'
  ),
});
