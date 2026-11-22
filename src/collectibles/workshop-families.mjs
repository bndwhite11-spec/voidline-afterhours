// Release two adds fixed, pre-authored constructions. Earlier capsules retain
// the complete family tables captured when they were issued.
const tapeModels = [
  ['gift-tape-graphite-session','Graphite Session','Graphite ABS, cream paper and oxide tape','The take-up hub gathers the recorded side while the supply pack unwinds.','Charcoal cassette with a cream label, open hub teeth and red oxide tape.',['Graphite Shelf','Cue dots','#606970','#232a31','#87949a','#f3fbfa']],
  ['gift-tape-clear-leader','Clear Leader','Smoke-jade acrylic, copper guides and clear leader','The clear wall exposes two unequal tape packs. An amber leader joint crosses the center window.','See-through jade cassette with exposed reels, metal tape guides and an amber splice.',['Glass Booth','Signal lines','#477776','#182e32','#80aba2','#f1fffa']],
  ['gift-tape-splice-repair','Splice Repair','Worn ochre plastic, splicing tape and ink','Diagonal repair tape bridges a scuffed shell. A marked edit catches in the window, then slips through.','Ochre cassette with adhesive repair strips and a handwritten red splice mark.',['Repair Bench','Splice marks','#79614e','#30272a','#b39b77','#fff5e6']],
  ['gift-tape-brushed-deck','Brushed Deck','Brushed aluminum, machined hubs and steel screws','A narrow reflection crosses the faceplate while the dark hubs take up the tape.','Pale metal cassette with four countersunk screws and dark machined reels.',['Machine Room','Knurl lines','#616a76','#242939','#919ba9','#f5f6fc']],
  ['gift-tape-night-press','Night Press','Violet screen print, silver foil and gold ink','A gold moon rests on the label. The foil registration cross turns with the take-up hub.','Violet art-label cassette with a printed horizon, gold moon and foil marks.',['Night Printshop','Register crosses','#67566e','#271e32','#a88dad','#fff4fc']]
];
const tankModels = [
  ['gift-tank-field-enamel','Field Enamel','Jade enameled steel, brass valve and gauge glass','The handwheel cracks open. The needle lifts and a short plume dissolves above the regulator.','Jade pressure cylinder on a molded foot, with a brass handwheel and a cream gauge.',['Service Bay','Calibration ticks','#586e62','#202f2b','#93a890','#f6fff3']],
  ['gift-tank-sight-glass','Sight Glass','Borosilicate glass, a brass cage and a ceramic float','The liquid level and float settle behind the clear wall when the regulator opens.','Transparent reservoir in a brass cage with a visible float and liquid meniscus.',['Gauge Room','Level marks','#506d75','#202e35','#82a4a8','#f2fdff']],
  ['gift-tank-field-repair','Field Repair','Oxide-red steel, canvas straps and riveted patches','The repaired wing knob lifts. A taped joint exhales above the khaki field strap.','Oxide-red cylinder with a riveted patch, khaki reinforcement and a repaired regulator.',['Salvage Yard','Rivet pairs','#7b5e54','#322525','#af9171','#fff7eb']],
  ['gift-tank-kiln-white','Kiln White','Ivory ceramic, copper wire and cobalt enamel','The copper wheel meters a breath of vapor past the warm shoulder seam.','Ivory ceramic tank with copper reinforcement, a cobalt gauge and a grounded foot ring.',['Kiln Room','Firing rings','#6e6258','#31272a','#aa978b','#fff9ef']]
];
function entries(rows){return rows.map(([id,name,material,description,alt,setting])=>({id,name,material,description,alt,setting}));}
export const workshopFamilies=[
  {id:'midnight-tape',name:'Midnight Tape',entries:entries(tapeModels),tiers:['Common','Uncommon','Rare','Epic','Legendary'],weights:[5000,2700,1450,650,200]},
  {id:'copium-reserve',name:'Copium Reserve Tank',entries:entries(tankModels),tiers:['Common','Uncommon','Rare','Epic'],weights:[5200,3000,1400,400]}
];
