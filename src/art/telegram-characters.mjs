/**
 * Newly drawn VOIDLINE genre gifts. Telegram's gift presentation and physical
 * part choreography were studied, but no canonical collection/product is added.
 * These are free cosmetics; no NFT ownership, token balance or affiliation claim.
 */
const ink='#18212a';
const layer=(name,body)=>`<g data-part="${name}">${body}</g>`;
const grad=(p,name,stops,xy='x1="0" y1="0" x2="1" y2="1"')=>`<linearGradient id="${p}-${name}" ${xy}>${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const seam=(d,color='#85908f')=>`<path class="va-detail-only" d="${d}" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-dasharray="2 3"/>`;
const knit=(d,color='#6b757a')=>`<path class="va-detail-only" d="${d}" fill="none" stroke="${color}" stroke-width=".85" stroke-linecap="round"/>`;

export const telegramCharacters={
 'gift-chudjak-plush':{
  name:'Chudjak Plush',type:'gift',series:'Internet Relics',
  material:'Stitched graphite fleece, ivory felt, black acetate glasses and creased paper',
  alt:'An awkward ivory-faced plush in a stitched grey hoodie and thick rectangular glasses, clutching a creased note that reads Nothing Ever Happens. The hands, paper, face and soft body move separately.',
  mini:`<path d="M5 10C2 6 5 1 11 1c6-1 10 3 9 8l-1 11-5 2-9-3Z" fill="#4b555d" stroke="#17222b" stroke-width=".8"/><path d="M7 4h10l1 8-3 4-6-2-2-5Z" fill="#e4ddc8" stroke="#17222b" stroke-width=".6"/><path d="m7 5 1-2 7-1 3 2v2l-4-1-6 1Z" fill="#3c3735"/><path d="M7.5 7h4v3h-4Zm6 0h4v3h-4Z" fill="#d5ddd3" stroke="#121b22" stroke-width="1.1"/><path d="m11.5 8 2 0m-3 5 3-.2" stroke="#111c24" stroke-width=".8"/><path d="m5 15 14-1-1 7-11 1Z" fill="#e4dcc5" stroke="#615c51" stroke-width=".6"/><path d="m9 16 7-.5m-7 2 6-.5m-5 2 4-.5" stroke="#48504d" stroke-width=".65"/><path d="m4 14 3 4m13-4-3 4" stroke="#c4bfac" stroke-width="2.4" stroke-linecap="round"/><path d="m6 21-3 1 1 2h5m8-3 4 1-1 2h-5" fill="#2d3941"/>`,
  silhouette:`<path d="M52 105c-15-28-6-57 15-72 33-24 93-22 121 10 14 17 19 41 9 64l-5 19c14 16 19 40 12 55l-16 22 13 15c8 12-2 23-15 20l-34-8c-16 5-33 6-51 0l-31 9c-14 4-25-8-17-21l14-20c-20-20-26-41-14-61l5-12Z"/>`,
  body:p=>`
   <defs>
    ${grad(p,'hood-fleece',[[0,'#718089'],[.3,'#505d66'],[.7,'#343f48'],[1,'#242c34']])}
    ${grad(p,'felt-face',[[0,'#f1ead7'],[.48,'#ded8c2'],[1,'#b6bba9']])}
    ${grad(p,'fleece-sleeve',[[0,'#7c888d'],[.35,'#53636a'],[1,'#2b3b45']])}
   </defs>
   <ellipse cx="129" cy="238" rx="77" ry="6" fill="#070c11" opacity=".3"/>
   ${layer('chud-shoe-left',`<path d="m80 201-21 15c-9 6-12 17-5 21 7 6 26 1 49-7l1-22Z" fill="#202e38" stroke="#0d1a23" stroke-width="2.6"/><path d="m81 207-19 14c-5 4-6 7-4 9 4 5 23-3 38-6l3-13Z" fill="#56646b"/><path d="M59 232c12 1 25-4 40-8m-33-2 10 3m-5-7 10 3" fill="none" stroke="#97a49e" stroke-width="1.2"/>`)}
   ${layer('chud-shoe-right',`<path d="m157 204 22 12c14 7 22 17 15 21-8 7-28 2-49-8l-3-18Z" fill="#1e2d37" stroke="#0d1a23" stroke-width="2.6"/><path d="m157 210 21 11c8 4 11 8 8 9-5 4-20-1-35-8l-3-10Z" fill="#52636a"/><path d="M151 226c12 6 24 9 39 8m-20-12 10-3m-16 0 9-3" fill="none" stroke="#a0aaa0" stroke-width="1.2"/>`)}
   ${layer('chud-body',`<path d="M70 111c-11 22-22 41-21 65 1 26 22 45 48 51 17 6 41 5 58 0 28-9 48-29 48-50-1-22-16-45-27-61Z" fill="url(#${p}-hood-fleece)" stroke="#12232c" stroke-width="3.3"/><path d="m75 120 18 15-10 60c17 15 34 19 54 21-31 9-58-3-69-17-10-15-10-31 7-79Z" fill="#293944"/><path d="m177 123-16 18 8 57c13-7 23-19 23-33-1-14-8-28-15-42Z" fill="#78858a" opacity=".24"/><path d="M92 137c11 17 20 20 31 17 10 5 20-3 35-17l-7 53-29 23-31-21Z" fill="#3a4b54"/><path d="m94 140 13 12-4 25m50-34-13 10 4 24" fill="none" stroke="#abb3a5" stroke-width="1.9" stroke-linecap="round"/><circle cx="103" cy="178" r="2.8" fill="#22313b" stroke="#a4ada0" stroke-width="1"/><circle cx="144" cy="178" r="2.8" fill="#22313b" stroke="#a4ada0" stroke-width="1"/>${seam('M68 146c-8 25-8 44 7 58m103-58c9 20 14 39 3 52m-76 27c14 4 34 3 46-1','#8a9694')}`)}
   <g data-part="chud-head">
    <path d="M61 108C45 89 46 60 65 42c25-26 78-30 108-6 25 19 35 49 19 73l-25 36-77 1Z" fill="url(#${p}-hood-fleece)" stroke="#15232b" stroke-width="3.4"/>
    <path d="M65 100C52 77 65 52 89 44c29-11 56-7 78 12 17 15 21 34 12 53l-24 30-58-1Z" fill="#202b33" stroke="#88938e" stroke-width="1.2"/>
    <path d="M69 60c13-17 34-23 57-21m21 5c20 7 33 23 37 41" fill="none" stroke="#9eaaa8" stroke-width="1.9" opacity=".65"/>
    ${seam('M59 77c1-18 15-34 31-39m63 2c22 9 36 30 37 47','#b2b7a7')}
    <path d="m99 120-3 21 24 16 30-15-4-26Z" fill="#bfc3af" stroke="#26373b" stroke-width="2"/>
    <path d="M84 54c18-10 52-13 69 0 12 8 15 22 12 40l-8 29-20 20-21 4-22-15-13-25-5-29Z" fill="url(#${p}-felt-face)" stroke="#27353a" stroke-width="2.9"/>
    <path d="m150 60 11 20-7 36-18 22-10 4 14-30 7-30Z" fill="#b1bba9" opacity=".55"/>
    <path d="M79 83c-11-5-15 4-10 14 2 7 6 11 13 10m81-25c11-6 16 2 12 13-2 7-7 11-14 11" fill="#c7c9b4" stroke="#344446" stroke-width="2"/>
    <path d="m74 89-1 5 6 6m90-12 1 5-6 7" fill="none" stroke="#7c8c7e" stroke-width="1.2"/>
    <path d="m79 69-7-9 11-17 21-9 23 3 21-2 17 12 3 20-11 2-5-13-17 4-16-3-15 6-12-2-7 11Z" fill="#3d3c39" stroke="#1d292e" stroke-width="2.3"/>
    <path d="m86 47 19-7 18 2m-30 13 17-5 10 1m16-8 11-1 12 9" fill="none" stroke="#807a68" stroke-width="1.3"/>
    ${seam('m84 57 11-7 19-3m37 5 7 7','#a49a7c')}
    ${layer('chud-brows',`<path d="m86 75 14-4 11 5m22-1 14-6 12 4" fill="none" stroke="#3c403b" stroke-width="3.7" stroke-linecap="round"/>`)}
    <g data-part="chud-glasses">
     <path d="m81 79 34 1-1 22-31-1Zm49 1 34-3-2 23-31 2Z" fill="#dce6d9" fill-opacity=".35" stroke="#101e27" stroke-width="5.4" stroke-linejoin="round"/>
     <path d="m115 85 15-1m-50 2-8-2m92-1 9-3" fill="none" stroke="#101e27" stroke-width="4"/>
     <path d="m86 83 24 1m25 0 24-2" fill="none" stroke="#6b7979" stroke-width=".9"/>
     ${layer('chud-eyes',`<path d="m90 90 14-1m35 0 14-2" stroke="#3b443d" stroke-width="1.9" stroke-linecap="round"/><path d="m98 89 0 5m48-7-1 6" stroke="#1d2d31" stroke-width="2.6" stroke-linecap="round"/>`)}
    </g>
    <path d="m123 87-6 22 8 3m-17 12 22-2 10 3m-28 3 19-1m-18-13-5 3m34-3 6 4" fill="none" stroke="#69796c" stroke-width="1.55" stroke-linecap="round"/>
    <path d="m96 111-4 6 8 6m46-12 3 6-6 8" fill="none" stroke="#a0ad97" stroke-width="1.15"/>
    ${seam('m88 109 7 16 18 13m31-11-7 9','#8e9d87')}
   </g>
   <g data-part="chud-note">
    <g data-part="chud-note-left" opacity="0">
     <path d="m78 157-51 10 5 57 52-10Z" fill="url(#${p}-paper)" stroke="#6e766a" stroke-width="1.4"/>
     <path d="m78 157-12 31 18 26-13-5-11-22 10-29Z" fill="#b8b199"/><path d="m27 167 33 20 24 27-40-16Z" fill="#ece2c5" opacity=".6"/>
     <path d="m39 167 4 45m11-47 6 49m11-53-2 29 10 20" fill="none" stroke="#9e9b83" stroke-width=".9"/>
     <g transform="rotate(-9 52 188)" fill="#36453f" text-anchor="middle" font-family="sans-serif" font-weight="800"><text x="52" y="184" font-size="8" letter-spacing=".5">STILL</text><text x="52" y="198" font-size="9">…</text></g>
     <path d="m29 171 6 46m37-54-3 23" fill="none" stroke="#faf1d5" stroke-width="1.1"/>
    </g>
    <g data-part="chud-note-right" opacity="0">
     <path d="m166 148 52 1 7 57-54-2Z" fill="url(#${p}-paper)" stroke="#6e766a" stroke-width="1.4"/>
     <path d="m166 148 14 24-9 32 13 0 6-31-14-25Z" fill="#b5ad93"/><path d="m180 172 38-23 7 57-35-13Z" fill="#f0e7ca" opacity=".6"/>
     <path d="m181 152 8 43m11-43 7 48m-32-43 6 15-6 25" fill="none" stroke="#a49e84" stroke-width=".9"/>
     <g transform="rotate(3 199 176)" fill="#36453f" text-anchor="middle" font-family="sans-serif" font-weight="800"><text x="198" y="173" font-size="7.4">NOTHING</text><text x="199" y="187" font-size="8.2">YET.</text></g>
     <path d="m215 153 6 48m-49-49 9 19" fill="none" stroke="#faf0d3" stroke-width="1.1"/>
    </g>
    <path d="m81 160 89-10 4 58-89 9Z" fill="#958d77" stroke="#353f3c" stroke-width="1.7"/>
    <path d="m78 157 88-9 5 56-87 10Z" fill="url(#${p}-paper)" stroke="#6e766a" stroke-width="1.4"/>
    <path d="m153 149 13-1 1 15-12-6Z" fill="#f0e6ca" stroke="#b1a386" stroke-width=".9"/>
    <path d="m122 154-4 30 10 25m-47-37 40 13 47-16m-83 30 33-14 48 5" fill="none" stroke="#bcaf91" stroke-width="1"/>
    <path d="m121 156-2 25m5 9 6 16" stroke="#f5ebcf" stroke-width="1.1"/>
    <g transform="rotate(-6 125 179)" fill="#33413f" text-anchor="middle" font-family="sans-serif" font-weight="800" letter-spacing=".5"><text x="124" y="169" font-size="8">NOTHING</text><text x="124" y="183" font-size="8">EVER</text><text x="124" y="198" font-size="8">HAPPENS.</text></g>
    <path class="va-detail-only" d="m92 205 8-1m49-49 6 0m-58 2 1 1m58 43 7-1" stroke="#7e7868" stroke-width=".7"/>
   </g>
   ${layer('chud-hand-left',`<path d="M63 153c5-6 11-2 15 4 5 5 8 7 16 7 8 0 12 8 7 13-7 6-21 2-30-2-11-5-14-14-8-22Z" fill="#c2c4b0" stroke="#334442" stroke-width="2.4"/><path d="M65 155c3-4 8-1 11 4 5 5 9 8 18 8 5 0 7 5 4 7-7 3-17 1-25-3-7-4-11-11-8-16Z" fill="url(#${p}-felt-face)"/><path d="m82 163-4 8m11-6-3 8m-16-13 4 3" fill="none" stroke="#879482" stroke-width="1.2" stroke-linecap="round"/>${seam('m66 158 4 8 8 5','#9ba591')}`)}
   ${layer('chud-hand-right',`<path d="M181 152c-5-5-10 0-15 6-4 5-8 7-15 9-9 3-9 11-2 14 8 3 19-1 27-6 9-7 11-16 5-23Z" fill="#b9c1ac" stroke="#334442" stroke-width="2.4"/><path d="M179 155c-3-2-7 3-11 7-5 6-9 7-15 8-5 2-5 5-1 6 7 1 16-3 22-7 5-5 8-11 5-14Z" fill="url(#${p}-felt-face)"/><path d="m165 163 4 7m-11-4 4 8m13-14-4 3" fill="none" stroke="#869781" stroke-width="1.2" stroke-linecap="round"/>${seam('m180 160-4 8-8 5','#95a28c')}`)}
  `,
  motion:{duration:1760,layers:[
   {name:'chud-body',origin:[127,219],frames:[{at:0},{at:.17,scaleX:1.03,scaleY:.965},{at:.43,scaleX:.98,scaleY:1.025},{at:.72,scaleX:1.015,scaleY:.99},{at:1}]},
   {name:'chud-head',origin:[125,143],frames:[{at:0},{at:.18,y:2,rotate:2},{at:.43,rotate:-7,x:-2,y:-4},{at:.67,rotate:-2,y:-1},{at:.85,rotate:1},{at:1}]},
   {name:'chud-note',origin:[125,184],frames:[{at:0},{at:.16,scaleX:.97,rotate:2,y:3},{at:.43,scaleX:1.02,scaleY:1.03,y:-16,rotate:-8},{at:.61,scaleX:1.01,y:-12,rotate:-6},{at:.79,rotate:2,y:-2},{at:1}]},
   {name:'chud-note-left',origin:[81,185],frames:[{at:0,scaleX:.025,opacity:0},{at:.17,scaleX:.025,opacity:0},{at:.36,scaleX:.72,rotate:-5,opacity:1},{at:.53,scaleX:1,rotate:-8,opacity:1},{at:.69,scaleX:.92,rotate:-3,opacity:1},{at:.86,scaleX:.025,opacity:0},{at:1,scaleX:.025,opacity:0}]},
   {name:'chud-note-right',origin:[169,179],frames:[{at:0,scaleX:.025,opacity:0},{at:.21,scaleX:.025,opacity:0},{at:.4,scaleX:.74,rotate:5,opacity:1},{at:.57,scaleX:1,rotate:9,opacity:1},{at:.71,scaleX:.9,rotate:3,opacity:1},{at:.88,scaleX:.025,opacity:0},{at:1,scaleX:.025,opacity:0}]},
   {name:'chud-hand-left',origin:[65,155],frames:[{at:0},{at:.18,rotate:2},{at:.43,rotate:-18,x:1,y:-10},{at:.67,rotate:-10,x:1,y:-6},{at:.86,rotate:2},{at:1}]},
   {name:'chud-hand-right',origin:[179,155],frames:[{at:0},{at:.19,rotate:-2},{at:.45,rotate:19,x:-2,y:-12},{at:.69,rotate:10,x:-1,y:-6},{at:.87,rotate:-2},{at:1}]},
   {name:'chud-glasses',origin:[123,90],frames:[{at:0},{at:.24,y:1},{at:.46,rotate:-6,y:5},{at:.68,rotate:2,y:2},{at:1}]},
   {name:'chud-brows',origin:[123,75],frames:[{at:0},{at:.22,y:1},{at:.45,y:-4,rotate:6},{at:.69,y:-1},{at:1}]},
   {name:'chud-eyes',origin:[124,90],frames:[{at:0},{at:.27,x:-1},{at:.49,x:2,y:3},{at:.76,x:1,y:1},{at:1}]},
   {name:'chud-shoe-left',origin:[91,209],frames:[{at:0},{at:.24,rotate:2},{at:.5,rotate:-7},{at:.75,rotate:2},{at:1}]},
   {name:'chud-shoe-right',origin:[152,211],frames:[{at:0},{at:.22,rotate:-2},{at:.48,rotate:7},{at:.74,rotate:-2},{at:1}]}
  ]}
 },
 'gift-wojak-jelly':{
  name:'Wojak Jelly',type:'gift',series:'Internet Relics',
  material:'Pale smoke gelatin, tired ink features and a dark celadon dish',
  alt:'A pale grey gelatin head with a ridged brow, long nose, tiny tired eyes and a flat poker expression, softly slumped on a celadon dish. Its face deforms with the jelly and settles back.',
  mini:`<ellipse cx="12" cy="20" rx="11" ry="3" fill="#546c69" stroke="#263d42" stroke-width=".8"/><ellipse cx="12" cy="19.3" rx="9" ry="2" fill="#a2b5a3"/><path d="M4 17C4 12 5 3 12 2c7 0 8 10 8 14 3 4-2 5-7 5-6 0-11 0-9-4Z" fill="#d6dcd2" stroke="#7e938b" stroke-width=".8"/><path d="m8 8 4-1 4 1M8 9.5l4-1 4 1m-8 2 3 .2m3 0 3-.2m-5-1-1 4 2 .5m-4 2 6-.3" fill="none" stroke="#5c746c" stroke-width=".75" stroke-linecap="round"/><path d="M6 12q0-5 2-7" stroke="#faf8e8" stroke-width="1.1" fill="none" stroke-linecap="round"/>`,
  silhouette:`<path d="M48 172c-5-15-3-31 3-48 2-21 5-43 17-65C81 36 102 28 123 29c31-4 54 16 65 39 11 25 10 50 12 74 14 9 20 22 13 35 25 6 34 17 23 30-15 19-61 26-107 25-49 1-95-7-109-26-11-14 1-27 28-34Z"/>`,
  body:p=>`
   <defs>
    ${grad(p,'wojak-gel',[[0,'#faf8e9'],[.25,'#e1e6da'],[.57,'#c5d0c6'],[.8,'#9caea5'],[1,'#dce2d1']])}
    ${grad(p,'wojak-cheek',[[0,'#eef0df'],[.45,'#bdcdc2'],[1,'#849f94']])}
    ${grad(p,'celadon-dish',[[0,'#b2c4b6'],[.35,'#75948b'],[.65,'#4b6b67'],[1,'#263e44']])}
   </defs>
   <ellipse cx="129" cy="231" rx="79" ry="6" fill="#060d13" opacity=".25"/>
   ${layer('wojak-dish',`<ellipse cx="128" cy="200" rx="109" ry="31" fill="#253e43" stroke="#132a32" stroke-width="2"/><ellipse cx="128" cy="193" rx="109" ry="31" fill="url(#${p}-celadon-dish)" stroke="#96b1a5" stroke-width="1.7"/><ellipse cx="128" cy="190" rx="94" ry="23" fill="#b5c4ac" stroke="#d7e0c7" stroke-width="1.6"/><ellipse cx="128" cy="193" rx="77" ry="17" fill="#758f7d" opacity=".35"/><path d="M29 204c19 14 58 21 101 21 39 0 74-7 94-19" fill="none" stroke="#829f91" stroke-width="1.6"/><path d="M51 176c25-9 55-12 86-11" fill="none" stroke="#dce6d1" stroke-width="1.2"/>`)}
   ${layer('wojak-puddle',`<path d="M55 182c16-12 46-16 73-15 35 0 60 6 75 18 1 11-28 20-66 19-35 3-70-4-82-13Z" fill="#b6c8b2" opacity=".7"/><ellipse cx="129" cy="194" rx="72" ry="12" fill="none" stroke="#e0e6cd" stroke-width="1.1" opacity=".5"/>`)}
   <g data-part="wojak-body">
    <path d="M67 69c10-22 30-34 52-34 25-3 49 9 62 32 16 29 12 57 17 77 3 13 16 17 16 31-1 17-25 23-46 23-18 9-42 8-59 1-29 3-56-4-61-19-4-12 5-22 6-34 0-30 1-55 13-77Z" fill="url(#${p}-wojak-gel)" stroke="#80998d" stroke-width="2.7"/>
    <path d="M66 81c-9 25-8 50-7 69 0 13-10 24-5 30 7 11 31 15 53 11 22 8 44 8 62 0 18 1 34-3 40-13-3 17-24 22-42 21-18 9-42 8-60 1-26 4-52-3-58-15-6-14 5-24 5-40-1-23 3-47 12-64Z" fill="#91a99c" opacity=".49"/>
    <path d="M74 66c9-16 23-24 39-26m-40 39-3 9m-8 38 0 10" fill="none" stroke="#fffbed" stroke-width="3.3" stroke-linecap="round"/>
    <path d="M170 67c16 20 13 43 19 65 4 12 6 21 1 30-5 8-13 8-18 0-8-11-6-27-7-41Z" fill="#f4f4e4" opacity=".25"/>
    <path d="M78 183c10 5 20 6 33 4m44 5c19 1 35-3 42-9" fill="none" stroke="#edf2d9" stroke-width="1.8" opacity=".65"/>
    ${layer('wojak-cheek-left',`<path d="M76 117c-7 15-7 36 0 51 5 9 15 15 25 15-13-12-19-28-15-47Z" fill="url(#${p}-wojak-cheek)" opacity=".7"/><path d="m82 132-3 14 5 14m4-21-1 11 6 10" fill="none" stroke="#8ca395" stroke-width="1.15" stroke-linecap="round"/>`)}
    ${layer('wojak-cheek-right',`<path d="M168 119c10 15 12 39 4 53-6 10-16 15-27 13 13-12 19-26 14-43Z" fill="url(#${p}-wojak-cheek)" opacity=".65"/><path d="m164 134 4 14-6 16m-5-24 1 11-6 11" fill="none" stroke="#89a291" stroke-width="1.15" stroke-linecap="round"/>`)}
    ${layer('wojak-brow',`<path d="M85 84c9-7 22-8 35-6 12-3 26-2 36 5m-69 8c11-6 20-5 32-3 12-3 24-3 35 2m-62 7c8-3 16-2 26-1m7 0c9-2 17-2 24 0" fill="none" stroke="#8c9f8f" stroke-width="1.55" stroke-linecap="round"/><path d="M89 82c9-4 19-4 29-3m8-1c10-2 21 0 26 3" fill="none" stroke="#edf2df" stroke-width="1.2"/>`)}
    ${layer('wojak-eyes',`<path d="M86 109c9-4 18-3 26 0m21 0c8-4 17-4 25 0" fill="none" stroke="#596f64" stroke-width="2.6" stroke-linecap="round"/><path d="m89 112 20 0m27 0 19-1" fill="none" stroke="#718978" stroke-width="1.3"/><path d="m102 109 0 5m40-5 0 5" stroke="#263f3d" stroke-width="2.7" stroke-linecap="round"/><path d="m87 117 19 2m32 0 18-3" fill="none" stroke="#92a992" stroke-width="1.3" stroke-linecap="round"/>`)}
    ${layer('wojak-nose',`<path d="M124 104c-1 16-7 28-9 38-1 5 4 8 8 6 4 4 9 3 11 0" fill="none" stroke="#7f9888" stroke-width="1.8" stroke-linecap="round"/><path d="m126 108 4 30-2 4" fill="none" stroke="#eef1da" stroke-width="1.3"/><path d="m116 145 5-1m10 1 4 2" stroke="#3e5b51" stroke-width="1.4" stroke-linecap="round"/>`)}
    ${layer('wojak-mouth',`<path d="m106 167 32-1 10 2m-38 4 28-1m-29 10c8 3 18 4 27 1" fill="none" stroke="#768f7b" stroke-width="1.55" stroke-linecap="round"/><path d="m103 162-4 10m52-10 3 10" fill="none" stroke="#96ab92" stroke-width="1.3" stroke-linecap="round"/>`)}
   </g>
  `,
  motion:{duration:1780,layers:[
   {name:'wojak-body',origin:[129,193],frames:[{at:0},{at:.18,scaleX:1.12,scaleY:.82,y:2},{at:.4,scaleX:.94,scaleY:1.09,rotate:7,x:4},{at:.61,scaleX:1.045,scaleY:.97,rotate:-3,x:-2},{at:.81,scaleX:.99,scaleY:1.01,rotate:1},{at:1}]},
   {name:'wojak-cheek-left',origin:[87,147],frames:[{at:0},{at:.2,scaleX:1.22,y:5},{at:.44,rotate:6,x:2,y:-2},{at:.66,rotate:-4,x:-1},{at:1}]},
   {name:'wojak-cheek-right',origin:[164,148],frames:[{at:0},{at:.21,scaleX:1.24,y:5},{at:.46,rotate:-7,x:-2,y:-1},{at:.68,rotate:4,x:1},{at:1}]},
   {name:'wojak-brow',origin:[121,91],frames:[{at:0},{at:.2,y:5,scaleY:.78},{at:.44,y:-2,scaleY:1.15},{at:.66,y:1},{at:1}]},
   {name:'wojak-eyes',origin:[122,112],frames:[{at:0},{at:.18,scaleY:.45,y:1},{at:.38,scaleY:.2,y:2},{at:.61,scaleY:.9},{at:1}]},
   {name:'wojak-nose',origin:[124,105],frames:[{at:0},{at:.2,scaleY:.94,y:1},{at:.45,rotate:4,scaleY:1.05},{at:.67,rotate:-3},{at:.84,rotate:1},{at:1}]},
   {name:'wojak-mouth',origin:[126,169],frames:[{at:0},{at:.22,scaleX:1.16,y:6},{at:.43,scaleX:.96,y:-2},{at:.68,y:1},{at:1}]},
   {name:'wojak-puddle',origin:[128,192],frames:[{at:0},{at:.19,scaleX:1.16,scaleY:.72},{at:.42,scaleX:.96,scaleY:1.05,x:3},{at:.65,scaleX:1.04,x:-2},{at:1}]}
  ]}
 },
 'gift-doomer-bloom':{
  name:'Doomer Bloom',type:'gift',series:'Internet Relics',
  material:'Folded dusk-violet petals, ivory bone, charcoal knit and muted jade leaves',
  alt:'A small deadpan skull in a stitched charcoal beanie emerges from sharply folded violet flower petals, with elongated jade leaves. The petals fold away to reveal the skull before springing back.',
  mini:`<path d="m12 1 3 5 5-3-1 7 5 3-5 3 1 6-6-3-5 4-1-7-7-1 5-5-1-6 6 2Z" fill="#7e6993" stroke="#382f48" stroke-width=".8"/><path d="m1 15 7-2 4 3-7 3Zm13 1 8 2-5 5-3-4Z" fill="#6e9a81" stroke="#315e53" stroke-width=".75"/><path d="M8 8c4-4 9-1 10 3 1 4-1 6-4 5l-1 2-3-1-1-2c-3 0-4-4-1-7Z" fill="#e3dfcc" stroke="#3d4b4a" stroke-width=".8"/><path d="M7 10C6 5 9 3 12 3c4 0 6 3 6 6l-1 2-9 1Z" fill="#343e49" stroke="#172a31" stroke-width=".8"/><path d="m8 9 9-1m-8-3 1 3m3-4 1 3" stroke="#738079" stroke-width=".65"/><path d="m9 12 3 .3m2-.5 3-.3m-4 2-.7 1h1.5" fill="none" stroke="#1b292d" stroke-width="1.2" stroke-linecap="round"/>`,
  silhouette:`<path d="m127 18 31 51 42-26-9 63 53 27-49 26 14 57-60-20-23 43-31-41-62 17 12-60-32-22 31-40-3-63 52 24Z"/><path d="m92 110-36-6-41 26 39 22 41-13Z"/><path d="m159 159 58 14-35 47-43-28Z"/>`,
  body:p=>`
   <defs>
    ${grad(p,'dusk-petal',[[0,'#c3b1cc'],[.26,'#9580aa'],[.6,'#665777'],[1,'#382e49']])}
    ${grad(p,'jade-leaf',[[0,'#a6baa1'],[.35,'#71967c'],[.7,'#466d5f'],[1,'#294c47']])}
    ${grad(p,'bone-face',[[0,'#f5efdc'],[.5,'#dedbc5'],[1,'#a3b0a1']])}
   </defs>
   <ellipse cx="134" cy="239" rx="65" ry="6" fill="#060b11" opacity=".23"/>
   <path d="m126 147 9 72-7 19-7-3 7-18-13-65Z" fill="#344c48" stroke="#1b3035" stroke-width="2"/>
   ${layer('bloom-leaf-left',`<path d="M112 147C82 113 48 111 14 132c26 28 61 33 94 24Z" fill="url(#${p}-jade-leaf)" stroke="#244d48" stroke-width="2.5"/><path d="m22 133 38-8 43 25-46-5Z" fill="#9cb59a" opacity=".55"/><path d="m21 133 83 18m-45-18 1-9m9 15 12-2m-27 2-12 7m39 3-8 8" fill="none" stroke="#325e51" stroke-width="1.8"/><path d="m24 131 23-9" fill="none" stroke="#d2d7b7" stroke-width="1"/>`)}
   ${layer('bloom-leaf-right',`<path d="M141 168c29-8 54 4 75 24-22 22-51 17-72-10Z" fill="url(#${p}-jade-leaf)" stroke="#244d48" stroke-width="2.5"/><path d="m148 177 59 15-31 4Z" fill="#91aa8e"/><path d="m147 177 60 15m-38-9 7-6m-10 5 2 10m19-5 9-3m-5 5 0 8" fill="none" stroke="#375d51" stroke-width="1.6"/>`)}
   ${layer('bloom-petal-crown',`<path d="m113 123-18-65 31-38 29 50-13 53Z" fill="url(#${p}-dusk-petal)" stroke="#302b40" stroke-width="2.6"/><path d="m126 20-4 70-9 33-18-65Z" fill="#b6a4c1"/><path d="m126 20 10 61 6 42 13-53Z" fill="#766089"/><path d="m126 32-3 55 6 28m-7-22-18-27" fill="none" stroke="#d2c1d6" stroke-width="1.2"/><path d="m124 91 12-10 4 34" fill="#4c3d60"/>`)}
   ${layer('bloom-petal-upper-left',`<path d="m117 123-58-12-19-73 54 28 30 49Z" fill="url(#${p}-dusk-petal)" stroke="#302b40" stroke-width="2.6"/><path d="m40 38 52 45 25 40-58-12Z" fill="#9e8bac"/><path d="m40 38 39 50 14 17 24 18-25-40Z" fill="#c4b1ca"/><path d="m59 61 34 33 17 24" fill="none" stroke="#dfcde0" stroke-width="1.1"/><path d="m58 109 35-4 24 18Z" fill="#56455e"/>`)}
   ${layer('bloom-petal-upper-right',`<path d="m139 123 22-59 40-25-7 61-47 40Z" fill="url(#${p}-dusk-petal)" stroke="#302b40" stroke-width="2.6"/><path d="m201 39-32 61-30 23 22-59Z" fill="#a28aac"/><path d="m201 39-14 59-40 42-8-17 30-23Z" fill="#5d4b71"/><path d="m193 55-24 45-23 24" fill="none" stroke="#ceb7ce" stroke-width="1.3"/><path d="m167 104 19-6-29 31Z" fill="#80698e"/>`)}
   ${layer('bloom-petal-right',`<path d="m147 127 51-24 45 30-48 30-53-14Z" fill="url(#${p}-dusk-petal)" stroke="#302b40" stroke-width="2.6"/><path d="m198 103-29 31 74-1-48 30-53-14 5-22Z" fill="#8c749d"/><path d="m243 133-74 1-23 9 49 20Z" fill="#51405f"/><path d="m232 132-63 2-17 8" fill="none" stroke="#c4afcd" stroke-width="1.4"/>`)}
   ${layer('bloom-petal-bottom-right',`<path d="m146 145 50 16 14 56-57-20-20-37Z" fill="url(#${p}-dusk-petal)" stroke="#302b40" stroke-width="2.6"/><path d="m144 151 38 26 28 40-57-20-20-37Z" fill="#8f779f"/><path d="m144 151 38 26 28 40-42-29Z" fill="#bea7c9"/><path d="m151 159 31 23 19 26" fill="none" stroke="#d8c4da" stroke-width="1.15"/>`)}
   ${layer('bloom-petal-bottom-left',`<path d="m119 146 17 25-36 47-61-7 29-49Z" fill="url(#${p}-dusk-petal)" stroke="#302b40" stroke-width="2.6"/><path d="m119 146-22 42-58 23 29-49Z" fill="#a890b4"/><path d="m97 188 39-17-36 47-61-7Z" fill="#5a486d"/><path d="m113 158-16 30-40 17" fill="none" stroke="#d4c0d6" stroke-width="1.3"/><path d="m101 194 21-10-22 27-29-1Z" fill="#7f6591"/>`)}
   <g data-part="bloom-skull">
    <path d="m103 147-14 21 28 14 31-11 13-22-26-9Z" fill="#374148" stroke="#1d3034" stroke-width="2"/><path d="m103 149 15 21 21-16-5 22-17 6-28-14Z" fill="#5b6a69"/><path d="m100 156 17 17 19-14" fill="none" stroke="#9ba79c" stroke-width="1.3"/>
    <path d="M94 97c25-17 58-8 70 15 12 22 7 43-12 46l-7-1c-2 11-11 13-17 6-6 10-16 9-19-2-18 3-29-7-28-24 1-16 4-29 13-40Z" fill="url(#${p}-bone-face)" stroke="#465e59" stroke-width="2.6"/>
    <path d="M91 123c2-12 8-23 17-27-15 3-24 16-27 30-4 22 8 37 27 34l1-6c-16 4-23-12-18-31Z" fill="#b3c4b0"/>
    ${layer('bloom-sockets',`<path d="M97 119c10-5 20 0 20 11 0 12-9 16-18 11-8-5-9-16-2-22Zm43-2c11-4 21 4 19 14-1 11-13 14-20 8-7-6-7-17 1-22Z" fill="#17262b"/><path d="m94 118 23 4m20-3 23-4" stroke="#d7ddc6" stroke-width="5" stroke-linecap="round"/><path d="m126 140-5 9c2 3 5 1 7-1 2 3 5 2 6 0l-6-8Z" fill="#213237"/>`)}
    <path d="m110 153 3 6m9-7 2 9m11-9 1 7m11-9-1 6" stroke="#9faf9e" stroke-width="1.1"/>
    <g data-part="bloom-beanie">
     <path d="M83 110c-4-31 13-54 43-56 32-2 52 16 50 46l-13 18-68 4Z" fill="#27333f" stroke="#14262e" stroke-width="2.5"/>
     <path d="M90 100c-1-23 13-38 36-40 24-1 42 13 43 33l-12 12-53 8Z" fill="#46535c"/>
     <path d="m96 94 5-18m8 15 5-24m7 22 4-25m8 25 0-24m11 25-3-22m15 26-6-21m-45 22-3 5m14-8-2 7m15-8-1 7m14-7 0 7" fill="none" stroke="#819087" stroke-width="1.1"/>
     ${knit('m100 82 4 2-5 3m12-9 4 3-5 3m13-9 4 3-5 3m13-7 4 3-4 3m13-3 3 3-3 3m-40 3 4 2-4 3m12-7 4 3-5 3m13-7 3 3-4 3','#8c988b')}
     <g data-part="bloom-cuff"><path d="m83 102 86-12 9 19-89 17Z" fill="#3a4852" stroke="#172a34" stroke-width="2"/><path d="m89 105 77-10 6 11-80 15Z" fill="#5a686d"/><path d="m95 105 2 13m7-14 2 13m7-14 2 12m7-13 2 11m7-12 2 11m7-12 3 10m6-11 3 9m6-10 4 9" fill="none" stroke="#9ba498" stroke-width=".9"/><path d="m93 120 76-14" stroke="#263a42" stroke-width="1"/><path d="m140 103 14-3 2 9-14 3Z" fill="#b9b99e" stroke="#233942" stroke-width="1"/><path d="m144 107 3-2 3 1-2 2Z" fill="#566a62"/></g>
    </g>
   </g>
  `,
  motion:{duration:1800,layers:[
   {name:'bloom-petal-crown',origin:[128,130],frames:[{at:0},{at:.16,rotate:-3},{at:.43,rotate:18,scaleX:.74,scaleY:.82,y:8},{at:.65,rotate:8,scaleX:.9,scaleY:.94},{at:.85,rotate:-3},{at:1}]},
   {name:'bloom-petal-upper-left',origin:[125,128],frames:[{at:0},{at:.19,rotate:3},{at:.45,rotate:-25,scaleX:.8,scaleY:.82,x:6,y:8},{at:.67,rotate:-9,scaleX:.94},{at:.87,rotate:3},{at:1}]},
   {name:'bloom-petal-upper-right',origin:[135,132],frames:[{at:0},{at:.2,rotate:-2},{at:.46,rotate:28,scaleX:.8,scaleY:.85,x:-6,y:5},{at:.68,rotate:10,scaleY:.94},{at:.88,rotate:-3},{at:1}]},
   {name:'bloom-petal-right',origin:[137,140],frames:[{at:0},{at:.22,rotate:4},{at:.48,rotate:29,scaleX:.78,x:-9},{at:.69,rotate:10,scaleX:.94},{at:.89,rotate:-3},{at:1}]},
   {name:'bloom-petal-bottom-right',origin:[134,148],frames:[{at:0},{at:.18,rotate:-3},{at:.44,rotate:-28,scaleX:.82,scaleY:.8,y:-9},{at:.66,rotate:-10,scaleY:.94},{at:.87,rotate:3},{at:1}]},
   {name:'bloom-petal-bottom-left',origin:[124,146],frames:[{at:0},{at:.21,rotate:3},{at:.48,rotate:25,scaleX:.8,scaleY:.82,y:-8},{at:.7,rotate:9,scaleY:.94},{at:.9,rotate:-3},{at:1}]},
   {name:'bloom-skull',origin:[126,142],frames:[{at:0},{at:.18,scaleX:.97,scaleY:.97,rotate:-3},{at:.49,scaleX:1.2,scaleY:1.2,rotate:6,x:4,y:-8},{at:.69,scaleX:1.1,scaleY:1.1,rotate:2,y:-3},{at:.87,scaleX:.99,scaleY:.99,rotate:-2},{at:1}]},
   {name:'bloom-beanie',origin:[128,104],frames:[{at:0},{at:.22,y:1},{at:.5,rotate:2,y:-2},{at:.72,rotate:-1,y:1},{at:1}]},
   {name:'bloom-cuff',origin:[130,106],frames:[{at:0},{at:.25,y:1},{at:.52,rotate:-1,y:2},{at:.74,y:-1},{at:1}]},
   {name:'bloom-sockets',origin:[127,130],frames:[{at:0},{at:.22,scaleY:.85},{at:.49,scaleY:.65},{at:.75,scaleY:.95},{at:1}]},
   {name:'bloom-leaf-left',origin:[108,150],frames:[{at:0},{at:.21,rotate:-4},{at:.49,rotate:-28,scaleX:.84,y:4},{at:.7,rotate:-9,scaleX:.96},{at:.88,rotate:4},{at:1}]},
   {name:'bloom-leaf-right',origin:[145,174],frames:[{at:0},{at:.23,rotate:4},{at:.52,rotate:-24,scaleX:.86,y:-2},{at:.73,rotate:-8},{at:.91,rotate:3},{at:1}]}
  ]}
 },
 'gift-brainrot-pop':{
  name:'Brainrot Pop',type:'gift',series:'Internet Relics',
  material:'Lilac folded sugar, an acid-lime core, ivory waxed wrapper and a crooked candy stick',
  alt:'A crooked two-lobed brain candy with sculpted lilac folds, a narrow lime center seam, an off-center purple stick and a split ivory wrapper. Its wrapper opens and the two lobes part to reveal the center before settling.',
  mini:`<path d="m14 15 5 8" stroke="#735674" stroke-width="2.4" stroke-linecap="round"/><path d="m3 13 4 2 4-1 3 1 5-3 3 8-6-2-4 3-5-2-4 2Z" fill="#e6dfc6" stroke="#7b7c70" stroke-width=".6"/><path d="M11 3C8 0 4 3 5 6 1 7 2 11 4 12c-1 4 4 6 7 3Zm2-1c4-2 7 1 6 4 4 2 3 6 1 7 0 4-5 5-8 2Z" fill="#ac97b9" stroke="#5b486a" stroke-width=".8"/><path d="m12 3-.5 12" stroke="#b9d47a" stroke-width="1.2"/><path d="M8 4C5 4 6 7 8 7c2 1 2 4-1 4m-2-2c-2 2 0 4 2 4m9-10c3 1 2 4 0 4-3 0-3 3-1 4m4-4c3 2 1 4-1 4" fill="none" stroke="#ede2d7" stroke-width=".8" stroke-linecap="round"/>`,
  silhouette:`<path d="M117 32c-17-13-41-3-44 14-22-3-38 18-30 37-22 12-22 36-6 49-10 17-2 36 15 43l-16 9 1 37 32-13 34 14 26-12 30 10 17-9 13 23c8 12 24 4 17-8l-14-24 25 6 9-43-22-13c10-16 9-36-2-47 15-18 5-42-16-47-1-25-23-37-43-28-9-13-23-16-26-5Z"/>`,
  body:p=>`
   <defs>
    ${grad(p,'brain-lilac',[[0,'#e2d1df'],[.25,'#bca4c7'],[.55,'#947b9f'],[.8,'#725780'],[1,'#b09aba']])}
    ${grad(p,'brain-side',[[0,'#9c7eaa'],[.5,'#63456e'],[1,'#3f2f4b']])}
    ${grad(p,'brain-lime',[[0,'#edf1b0'],[.3,'#c6dc8a'],[.7,'#829953'],[1,'#d6df9b']])}
    ${grad(p,'wax-paper',[[0,'#fbf5de'],[.5,'#ddd6bc'],[1,'#afa78f']])}
   </defs>
   <ellipse cx="132" cy="239" rx="73" ry="6" fill="#060a10" opacity=".25"/>
   ${layer('brain-stick',`<path d="m145 163 46 67c4 7 16 2 11-6l-43-69Z" fill="#674b6c" stroke="#3c324c" stroke-width="2"/><path d="m150 164 46 64" stroke="#cba9c5" stroke-width="3.3" stroke-linecap="round"/><path d="m158 172 33 51" stroke="#98739c" stroke-width="1.6" stroke-linecap="round"/>`)}
   <path d="m58 161-19 19 4 31 28-11 27 15 28-15 26 8 28-17 28 9 10-36-29-11-55-10Z" fill="#878979" stroke="#303e40" stroke-width="2"/>
   ${layer('brain-core',`<path d="M121 52c-12 14-8 30-3 44-9 13-6 24 3 32-7 14-4 28 9 32 13-6 15-22 8-32 9-12 6-24-2-33 7-17 7-34-2-43Z" fill="url(#${p}-brain-lime)" stroke="#64734b" stroke-width="2"/><path d="M126 61c-5 14 3 23 2 33-4 10-4 19 3 30-5 12-4 22-1 27" fill="none" stroke="#f3f1bf" stroke-width="2" stroke-linecap="round"/>`)}
   <g data-part="brain-lobe-left">
    <path d="M125 46c-19-17-45-9-48 13-19-4-38 15-29 33-22 13-22 35-6 47-7 18 4 40 22 41 14 20 42 15 58 4 11-32 15-79 3-138Z" fill="url(#${p}-brain-side)" stroke="#42334d" stroke-width="3"/>
    <path d="M121 37c-18-14-42-5-43 15-18-4-34 14-26 31-21 13-22 32-7 44-9 17 2 35 18 37 15 20 41 15 57 4 9-30 12-77 1-131Z" fill="url(#${p}-brain-lilac)" stroke="#5b466a" stroke-width="2.5"/>
    <path d="M113 45c-14-8-29-1-29 12 1 8 9 13 15 11 12-4 18 11 9 19-9 9-23 0-27 8-5 9 5 14 13 11 17-5 20 16 9 21-11 6-22-3-26 5-4 7 5 17 16 14 12-3 21 4 17 13" fill="none" stroke="#61476e" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M112 43c-14-8-29-1-29 12 1 8 9 13 15 11 12-4 18 11 9 19-9 9-23 0-27 8-5 9 5 14 13 11 17-5 20 16 9 21-11 6-22-3-26 5-4 7 5 17 16 14 12-3 21 4 17 13" fill="none" stroke="#e4cfe0" stroke-width="3.1" stroke-linecap="round"/>
    <path d="M67 62c-8 4-9 14-3 19 8 6 4 17-4 18-13 1-14 15-4 19 8 3 13 10 8 18-3 6-1 15 6 19" fill="none" stroke="#5d476c" stroke-width="6" stroke-linecap="round"/>
    <path d="M66 60c-8 4-9 14-3 19 8 6 4 17-4 18-13 1-14 15-4 19 8 3 13 10 8 18-3 6-1 15 6 19" fill="none" stroke="#d9c8db" stroke-width="2.7" stroke-linecap="round"/>
    <path d="M91 36c11-6 20-3 25 1m-70 68c-2 5-1 9 2 12m33 48c8 5 19 3 25 0" fill="none" stroke="#f0e3e6" stroke-width="1.8" stroke-linecap="round"/>
   </g>
   <g data-part="brain-lobe-right">
    <path d="M130 40c17-18 44-8 46 13 23 2 35 24 25 42 17 16 14 37 0 49 2 21-17 39-35 32-17 15-37 12-47 6-2-32-3-99 11-142Z" fill="url(#${p}-brain-side)" stroke="#42334d" stroke-width="3"/>
    <path d="M130 32c17-14 40-5 42 14 21 3 32 22 23 38 17 16 14 34-1 45 3 19-15 34-32 29-15 15-34 13-44 6-1-30-1-91 12-132Z" fill="url(#${p}-brain-lilac)" stroke="#5b466a" stroke-width="2.5"/>
    <path d="M140 39c12-5 23 1 22 12 0 8-8 12-15 9-13-4-22 12-12 21 9 9 20-1 26 6 7 9-4 16-12 12-12-5-22 13-12 22 9 9 20-2 25 6 6 10-4 18-15 17-8-1-15 3-16 12" fill="none" stroke="#61456c" stroke-width="6.8" stroke-linecap="round"/>
    <path d="M139 37c12-5 23 1 22 12 0 8-8 12-15 9-13-4-22 12-12 21 9 9 20-1 26 6 7 9-4 16-12 12-12-5-22 13-12 22 9 9 20-2 25 6 6 10-4 18-15 17-8-1-15 3-16 12" fill="none" stroke="#e5d2df" stroke-width="3.1" stroke-linecap="round"/>
    <path d="M178 59c10 5 11 15 3 21-10 7-7 19 3 21 14 3 12 17 2 20-9 3-14 9-11 17" fill="none" stroke="#5d4368" stroke-width="6" stroke-linecap="round"/>
    <path d="M177 57c10 5 11 15 3 21-10 7-7 19 3 21 14 3 12 17 2 20-9 3-14 9-11 17" fill="none" stroke="#d8c6da" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M140 28c9-2 17 1 22 6m35 58c5 7 5 13 3 18m-42 48c-8 5-17 7-25 3" fill="none" stroke="#f3e6e8" stroke-width="1.8" stroke-linecap="round"/>
   </g>
   ${layer('brain-wrapper-left',`<path d="m36 166 28 8 37-18 25 28-23 30-31-13-29 12Z" fill="url(#${p}-wax-paper)" stroke="#6b786d" stroke-width="1.8"/><path d="m36 166 35 23 30-33-3 31-26 14-29 12Z" fill="#c9c7ae"/><path d="m36 166 35 23 27-2-26 14Z" fill="#f6edd2"/><path d="m44 179 21 15-15 11m27-9 19-9m3-21-4 11" fill="none" stroke="#f8f0d5" stroke-width="1.4"/><path d="m48 170 22 16m11-8 12-13" fill="none" stroke="#9fa993" stroke-width=".9"/>`)}
   ${layer('brain-wrapper-right',`<path d="m124 184 36-32 27 19 32-11-10 43-30-10-27 21Z" fill="url(#${p}-wax-paper)" stroke="#6b786d" stroke-width="1.8"/><path d="m219 160-33 26-26-34 7 36 12 5 30 10Z" fill="#b5bba5"/><path d="m219 160-33 26-19 2 12 5Z" fill="#fff3d8"/><path d="m207 176-20 15 17 8m-28-9-13 13m-2-42 6 17" fill="none" stroke="#f3efd4" stroke-width="1.4"/><path d="m213 164-25 17m-14-11-12-15" fill="none" stroke="#98a28f" stroke-width=".9"/>`)}
   ${layer('brain-wrapper-knot',`<path d="m109 184 15-6 24 11-5 13-18 5-20-10Z" fill="#a5af97" stroke="#4e625b" stroke-width="1.5"/><path d="m109 184 17 8 22-3-5 13-18 5-20-10Z" fill="#dce1bb"/><path d="m116 186 11 8 14-3m-15 4-1 10m-15-11 10 5m20-3-10 4" fill="none" stroke="#7e9475" stroke-width="1.2"/><path d="m116 187 8 2 5-2 7 4-9 2Z" fill="#eaf0ca"/>`)}
  `,
  motion:{duration:1800,layers:[
   {name:'brain-lobe-left',origin:[123,145],frames:[{at:0},{at:.17,scaleX:1.035,scaleY:.97,x:1,y:2},{at:.45,rotate:-10,x:-9,y:-5,scaleX:.91,scaleY:1.03},{at:.64,rotate:-6,x:-4,y:-2},{at:.83,rotate:2,x:1,y:1},{at:1}]},
   {name:'brain-lobe-right',origin:[126,143],frames:[{at:0},{at:.19,scaleX:1.035,scaleY:.97,x:-1,y:2},{at:.48,rotate:11,x:9,y:-5,scaleX:.91,scaleY:1.035},{at:.67,rotate:5,x:4,y:-2},{at:.85,rotate:-2,x:-1,y:1},{at:1}]},
   {name:'brain-core',origin:[127,146],frames:[{at:0,scaleX:.65},{at:.19,scaleX:.6,scaleY:.96,y:2},{at:.46,scaleX:1.15,scaleY:1.12,y:-9},{at:.66,scaleX:1.04,scaleY:1.04,y:-4},{at:.84,scaleX:.8,y:1},{at:1,scaleX:.65}]},
   {name:'brain-wrapper-left',origin:[119,187],frames:[{at:0},{at:.18,rotate:4,x:1},{at:.43,rotate:-18,x:-6,y:4},{at:.65,rotate:-8,x:-2,y:2},{at:.84,rotate:3},{at:1}]},
   {name:'brain-wrapper-right',origin:[132,187],frames:[{at:0},{at:.2,rotate:-4,x:-1},{at:.46,rotate:19,x:6,y:4},{at:.68,rotate:7,x:2,y:2},{at:.87,rotate:-3},{at:1}]},
   {name:'brain-wrapper-knot',origin:[126,193],frames:[{at:0},{at:.2,scaleX:.94,scaleY:1.05},{at:.48,rotate:5,scaleX:1.08,scaleY:.92,y:3},{at:.7,rotate:-2,y:1},{at:1}]},
   {name:'brain-stick',origin:[153,173],frames:[{at:0},{at:.2,rotate:-3},{at:.49,rotate:7},{at:.71,rotate:-3},{at:.88,rotate:1},{at:1}]}
  ]}
 }
};
