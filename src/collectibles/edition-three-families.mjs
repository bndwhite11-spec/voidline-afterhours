// Each row is a constructed model, with a fixed material, setting and edge motif.
// The six cartridge editions have distinct IDs from their freely claimable siblings.
const cartridges = [
  ['text-back','They’ll Text Back','Storm glass, brass and copper silk','An umbrella opens under pressure. Three vapor dots appear where a reply should be.','Blue glass cigar with a weather chamber, copper umbrella and a dial. Three typing dots rise from the ember.',['Rain Window','Cue dots','#426b84','#182a3c','#86a8be','#eff8ff']],
  ['one-more-game','One More Game','Indigo bellows, copper ferrules and ivory enamel','A sprung sleeve compresses, pushes the gauge past its stop and exhales a retry curl.','Ribbed indigo cigar with a telescoping barrel, checker band and smoke curling back into an arrow.',['Replay Booth','Register crosses','#5c5e82','#242638','#a29abb','#f7f5ff']],
  ['next-in-queue','Next in Queue','Violet glass, silver foil and tuned brass','Three reeds flex behind a window and release one note of hold music.','Violet pressure cigar with a slotted reed window, silver fittings and a musical note of vapor.',['Exchange Room','Signal lines','#685980','#292134','#ad97b8','#fff2ff']],
  ['it-was-lag','It Was Lag','Graphite enamel, amber resin and gold trim','The guard lifts, the delayed needle jumps, and the interrupted conduit exhales a broken signal.','Gray cigar cartridge with an amber switch guard, a warning band and three broken signal arcs.',['Relay Bench','Calibration ticks','#715e48','#28262a','#bc9973','#fff7ec']],
  ['still-early','Still Early','Smoked jade, nacre, rose gold and pink opal','Pressure exposes the mineral inclusion. A pink price line climbs briefly above the barrel.','Pearl-paneled jade cigar with an opal window and rose-gold gauge. A rosy vapor line climbs and fades.',['Market Close','Level marks','#576f6a','#202b33','#a8b29c','#f0fff7']],
  ['last-excuse','Last Excuse','Blackened brass, amber glass and opal','Two chambers trade pressure through a balancing link. Their opposing wisps cross at the opal seam.','A split-chamber cigar with amber and opal reservoirs, a balancing linkage and two crossing wisps.',['Balance Room','Firing rings','#686477','#262432','#b5a5b8','#fff6fb']]
];
const terminals = [
  ['greenline','Greenline','Olive ABS, phosphor glass and steel','A small disk seats in the drive and a green cursor blinks on the curved screen.','Olive pocket computer with a recessed disk slot, bright green CRT and separate keys.',['Night Desk','Key legends','#4f6954','#18281f','#8da389','#f1ffe7']],
  ['amber-relay','Amber Relay','Bakelite, thermal paper and amber glass','The clamshell printer rolls a receipt through its brass feed.','Ochre handheld terminal with amber glass, a hinged case and a moving slip of paper.',['Print Desk','Register crosses','#806239','#30251b','#ba9767','#fff7e9']],
  ['field-service','Field Service','Rubber bumpers, brushed alloy and blue LCD','The antenna extends and a waveform crosses the field technician’s screen.','Reinforced blue-gray portable terminal with a telescoping antenna, exposed screws and a waveform.',['Signal Shack','Signal lines','#4a677e','#172c39','#8aacca','#ecfaff']],
  ['glass-console','Glass Console','Amethyst polycarbonate and magnetic tape','A tiny magnetic reel drives a second display beneath the translucent shell.','Clear violet pocket console with two inset screens and a visible tape reel.',['Violet Booth','Circuit traces','#685581','#292135','#ae93be','#fff4ff']]
];
const volumes = [
  ['marginalia','Marginalia','Ochre cover stock, cotton thread and copper ink','The stitched cover parts to show a copper monograph in the page margin.','Ochre pocket zine with an exposed stitched spine, turned paper corner and copper marginal mark.',['Reading Table','Stitches','#776448','#2e271d','#aa9371','#fff7df']],
  ['clasped-copy','Clasped Copy','Cordovan leather, brass hardware and laid paper','A small clasp turns out of its keyhole before the leather board opens.','Cordovan leather pocket book with an articulated brass clasp and a narrow keyhole.',['Bookbindery','Rivet pairs','#784c49','#331f20','#ba8780','#fff0e5']],
  ['night-binding','Night Binding','Midnight vellum, silk ribbon and silver foil','A silver thumb index catches the light and the ribbon follows the lifted page.','Midnight blue volume with a pale vellum insert, silver thumb index and a separate bookmark ribbon.',['Night Shelf','Thread loops','#4b5972','#1b2331','#8a9bb3','#f1f4ff']],
  ['opal-frontispiece','Opal Frontispiece','Ivory cloth, nacre and mirrored silver','A nacre lens opens on a silver mirror page set inside the blue-black boards.','Blue-black pocket book with an ivory spine and an opal lens above a silver mirror page.',['Mirror Library','Firing rings','#586f76','#222936','#9eb6b3','#f2fff9']]
];
function entries(prefix, rows) {
  return rows.map(([slug,name,material,description,alt,setting])=>({id:prefix+slug,name,material,description,alt,setting}));
}
const fourTiers=['Common','Uncommon','Rare','Epic'];
export const editionThreeFamilies = [
  {id:'copium-cartridge',name:'Copium Cartridges · Capsule Edition',entries:entries('gift-edition-cartridge-',cartridges)},
  {id:'pocket-terminal',name:'Pocket Terminal',entries:entries('gift-terminal-',terminals),tiers:fourTiers,weights:[5000,3000,1500,500]},
  {id:'egoists-volume',name:'Egoist’s Volume',entries:entries('gift-volume-',volumes),tiers:fourTiers,weights:[5000,3000,1500,500]}
];
