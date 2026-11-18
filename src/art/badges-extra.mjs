/** Additional original internet-culture studies. Reference context is recorded
 * separately; these masters contain no third-party photographs or gallery art. */
const edge='#132129';

const doomer={
 name:'Doomer',type:'badge',series:'Internet Relics',material:'Dark knitted cloth, smoke porcelain and a worn nickel edge',
 alt:'An original tired porcelain face wears a ribbed dark beanie and a slouched night jacket, with heavy eyelids and a plainly downturned mouth.',
 mini:'<g stroke="#182831" stroke-width=".65" stroke-linejoin="round"><path d="m5 16 3-2h8l4 3 2 7H2Z" fill="#283b45"/><path d="M7 7h10l1 8-6 6-6-6Z" fill="#b0b4aa"/><path d="M4 8C4-1 20-1 20 8l-1 3H5Z" fill="#35414a"/><path d="M5 7h14v4H5Z" fill="#55616a"/><path d="m7 13 3 1m4 0 3-1m-8 5 5-.5" fill="none" stroke="#53645e" stroke-width="1"/><path d="m12 13-1 3 2 .3" fill="none" stroke="#879388" stroke-width=".6"/></g>',
 silhouette:'<path d="M58 97c-11-51 18-82 68-82 50-1 82 30 70 81l-7 25-7 61 21 14 30 50H25l30-50 21-14-8-61Z"/>',
 body:p=>`
  <path d="m73 180-29 24-21 42h211l-25-44-29-22Z" fill="#182b35" stroke="#0c1b25" stroke-width="3" stroke-linejoin="round"/>
  <path d="m76 182 43 28 10 29-49-14-25-21Z" fill="#2d4350" stroke="#536977" stroke-width="1.2"/>
  <path d="m180 182-43 28-8 29 48-13 27-22Z" fill="#243a46" stroke="#4e6471" stroke-width="1.2"/>
  <path d="m59 207 22 15m97 0 21-15" stroke="#789096" stroke-width="1.3"/>
  <path d="m89 155 72 1 6 47-38 32-42-31Z" fill="#566a6f" stroke="#223d47" stroke-width="2"/>
  <path d="m95 162 55 3 3 34-24 25-31-24Z" fill="#929e95"/>
  <path d="M72 81c-8 35-1 89 29 113l29 19 29-17c34-25 42-80 30-117l-54-24Z" fill="#435b66" stroke="#172d38" stroke-width="3"/>
  <path d="M77 80c-8 34-1 84 27 109l26 17 27-16c31-24 38-76 26-109l-49-22Z" fill="url(#${p}-ivory)" stroke="#bbc5b6" stroke-width="1.4"/>
  <path d="M80 85c-10 39-2 77 26 102l23 16-18-33-8-49 7-43Z" fill="#a4aea3"/>
  <path d="m164 87 17 1c9 36 1 72-23 96l-19 12 17-31 8-39Z" fill="#b5b9a8"/>
  <path d="M90 111q18-10 32-4m14 1q19-6 32 5" fill="none" stroke="#7c8a7f" stroke-width="4" stroke-linecap="round"/>
  <path d="M88 126q17-5 32 2-14 8-31 4Zm49 1q15-6 29 0-11 9-28 6Z" fill="#87998a"/>
  <g data-part="doomer-eyelids"><path d="m90 124 29 3m19 0 26-2" fill="none" stroke="#405b53" stroke-width="3.2" stroke-linecap="round"/><path d="m105 127 1 5m44-5-1 5" stroke="#263e38" stroke-width="3" stroke-linecap="round"/></g>
  <path d="M91 139q13 5 26 0m22 2q13 3 24-2" fill="none" stroke="#b2baa7" stroke-width="1.5"/>
  <path d="m131 124-9 31 7 6 9-5m-16 1 10 1" fill="none" stroke="#8b9888" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="M111 181q18-9 34-1" fill="none" stroke="#6e8172" stroke-width="2.6" stroke-linecap="round"/>
  <path d="m117 185 12-2 10 2" fill="none" stroke="#d4d9bd" stroke-width="1.1"/>
  <path d="m108 197 19 8 17-7" fill="none" stroke="#87988b" stroke-width="1.2"/>
  <g data-part="doomer-cap"><path d="M58 91c-3-49 22-73 69-74 48-1 78 23 71 74l-9 22H67Z" fill="#253844" stroke="#112732" stroke-width="3"/><path d="M65 79c0-35 21-56 61-57 42-1 66 18 66 57l-6 18H72Z" fill="#394d58"/><path d="M74 77c4-28 20-43 49-47m20 0c22 5 37 20 40 45" fill="none" stroke="#556b72" stroke-width="1.5"/>
  <path d="m86 37-8 43m22-49-7 48m23-51-4 50m21-50 1 51m14-47 7 48m8-41 10 42" fill="none" stroke="#253b48" stroke-width="2.2"/>
  <path d="M60 78q67 17 137 0l-5 29q-64 17-128 0Z" fill="#52656b" stroke="#233e48" stroke-width="2"/><path d="M64 84q63 15 128 0m-126 18q60 15 124 0" fill="none" stroke="#78878a" stroke-width="1.3"/>
  <path d="m73 87 1 16m11-14 1 16m11-13 1 15m11-12v14m12-14v15m13-15v15m12-16v15m12-17v16m12-18-1 16m13-19-2 17" fill="none" stroke="#354e59" stroke-width="1.6"/>
  <path d="m173 89 11-2-2 14-10 2Z" fill="#344f59" stroke="#81918c" stroke-width=".8"/><path d="m174 92 7-1m-7 4 6-1" stroke="#a2ad9a" stroke-width=".7"/></g>
 `,
 motion:{duration:1390,layers:[{name:'doomer-eyelids',origin:[128,129],frames:[{at:0},{at:.26,y:1,scaleY:.8},{at:.48,y:2,scaleY:.2},{at:.65,y:1,scaleY:.7},{at:1}]},{name:'doomer-cap',origin:[128,105],frames:[{at:0},{at:.45,rotate:.8},{at:.74,rotate:-.3},{at:1}]}]}
};

const bloomer={
 name:'Bloomer',type:'badge',series:'Internet Relics',material:'Warm ivory porcelain, faded cotton and a small enamel flower',
 alt:'An upright original smiling face wears a softly ribbed pale beanie and a faded oxblood scarf, with an open gaze and a small five-petal flower on the lapel.',
 mini:'<g stroke="#695d48" stroke-width=".6" stroke-linejoin="round"><path d="M3 24v-5l5-4h8l5 4v5Z" fill="#8d8268"/><path d="m7 16 5 3 5-3 1 5-6 3-6-3Z" fill="#9c5b56"/><path d="M7 7h10l1 8-6 5-6-5Z" fill="#e5d5ae"/><path d="M5 8C4 0 20 0 19 8l-1 3H6Z" fill="#c5c39f"/><path d="M6 8h12v3H6Z" fill="#e0d8b5"/><path d="m8 13 2-1m4 0 2 1m-7 3q3 3 6 0" fill="none" stroke="#74684e" stroke-width="1"/><path d="m20 19 1-2 1 2 2 1-2 1-1 2-1-2-2-1Z" fill="#e9d39d"/></g>',
 silhouette:'<path d="M70 94c-4-44 17-69 59-70 43-1 69 24 65 68l-8 23c-2 28-11 49-24 63l26 21 31 48H35l29-47 28-22c-14-16-22-39-22-65Z"/><path d="M211 188c15-12 26-4 20 8 16 6 11 21-3 21-3 18-21 20-25 3-15 1-20-13-7-19-6-11 4-20 15-13Z"/>',
 body:p=>`
  <path d="m92 174-26 25-31 47h184l-31-47-28-25Z" fill="#716f59" stroke="#303e31" stroke-width="3" stroke-linejoin="round"/>
  <path d="m91 183-24 24-20 29h75l6-31Z" fill="#939277"/><path d="m160 183 24 24 20 29h-75l-1-31Z" fill="#7b816a"/>
  <path d="m77 199 26 25m75-25-27 25" stroke="#b7b391" stroke-width="1.3"/>
  <path d="m93 167 66-1 3 32-33 28-36-28Z" fill="#c5b995" stroke="#8a8b6c" stroke-width="1.4"/>
  <path d="m92 186 35 20 36-20 12 15-46 34-48-34Z" fill="url(#${p}-oxblood)" stroke="#543b36" stroke-width="2"/>
  <path d="m95 193 32 18 35-19m-69 9 35 25 35-25" fill="none" stroke="#c48972" stroke-width="1.2"/>
  <path d="m145 218 11-3 8 28h-18Z" fill="#8a514b" stroke="#cf947e" stroke-width="1.1"/>
  <g data-part="bloomer-chin"><path d="M76 83c-3 42 7 78 27 98l29 21 29-21c22-23 30-62 21-101l-49-22Z" fill="#9d987a" stroke="#4e5a43" stroke-width="3"/>
  <path d="M81 81c-3 38 6 74 25 95l26 19 26-19c20-21 28-57 20-94l-45-19Z" fill="url(#${p}-ivory)" stroke="#dedbc0" stroke-width="1.5"/>
  <path d="m83 91 20-18 21-4-8 35-4 43 10 40-17-14c-20-24-24-52-22-82Z" fill="#d2c7a3"/>
  <path d="M99 111q11-8 24-5m18 0q14-3 25 6" fill="none" stroke="#a49a75" stroke-width="3" stroke-linecap="round"/>
  <g data-part="bloomer-eyes"><path d="M99 122q12-9 23-1m20 0q11-7 22 3" fill="none" stroke="#645f47" stroke-width="2.7" stroke-linecap="round"/><circle cx="113" cy="121" r="2.5" fill="#514d3b"/><circle cx="152" cy="122" r="2.5" fill="#514d3b"/></g>
  <path d="m132 122-7 24 8 5 9-3" fill="none" stroke="#a99f7b" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M111 161q22 20 43-1-21 29-43 1Z" fill="#9d8564" stroke="#a49a76" stroke-width="1.2"/><path d="M114 163q19 10 36-1" fill="none" stroke="#f4e7c0" stroke-width="2.3"/><path d="m121 183 12 4 10-5" fill="none" stroke="#d6c8a4" stroke-width="1.3"/>
  <path d="m91 142 9 2m62-1 8-2" stroke="#e5d7b1" stroke-width="2" stroke-linecap="round"/>
  <path d="M71 86c-5-40 17-61 59-62 42-1 67 23 64 61l-10 20q-53 12-106 0Z" fill="#a9ad8d" stroke="#5c7051" stroke-width="2.5"/>
  <path d="M79 78c-1-31 17-48 51-48 34-1 55 18 56 48l-7 14H86Z" fill="#c7c5a3"/>
  <path d="M92 43q20-15 42-10m12 3q22 8 31 32" fill="none" stroke="#e6ddba" stroke-width="1.5"/>
  <path d="m95 44-7 33m19-39-5 38m20-40-1 40m15-39 3 39m13-34 7 34m6-25 7 26" stroke="#949e7e" stroke-width="1.5"/>
  <path d="M74 78q57 14 116-1l-5 25q-53 15-106 0Z" fill="#ded5b0" stroke="#82916d" stroke-width="1.6"/>
  <path d="M80 84q51 11 104-1m-102 15q49 13 99-1" fill="none" stroke="#f0e5bf" stroke-width="1.2"/>
  <path d="m90 88v11m12-9v12m13-10v12m13-11v12m13-12v11m13-13v12m13-14v11m12-14-1 11" stroke="#b6b28b" stroke-width="1.2"/></g>
  <g data-part="bloomer-flower"><path d="m194 234 14-35" fill="none" stroke="#607953" stroke-width="3"/><path d="m196 224-11-11 15 4m3-9 13-4-13 12" fill="#7d9563" stroke="#4e6b45" stroke-width="1"/>
  <path d="M209 194c-10-12 1-22 9-13 10-9 18 3 10 11 14 6 7 20-5 15-5 15-19 10-17-2-15 2-18-13-5-16Z" fill="#e1c99a" stroke="#7c7551" stroke-width="1.5"/><path d="m211 189 7 7m7-2-7 2m2 8-2-8m-9 6 9-6" fill="none" stroke="#f6e7be" stroke-width="1.1"/><circle cx="218" cy="196" r="4.5" fill="#ba9655" stroke="#756443" stroke-width="1.1"/></g>
 `,
 motion:{duration:1410,layers:[{name:'bloomer-chin',origin:[130,195],frames:[{at:0},{at:.28,rotate:-1.5,y:-2},{at:.65,rotate:-.5,y:-1},{at:1}]},{name:'bloomer-eyes',origin:[132,122],frames:[{at:0},{at:.17,scaleY:.8},{at:.36},{at:1}]},{name:'bloomer-flower',origin:[194,234],frames:[{at:0},{at:.34,rotate:-7},{at:.62,rotate:3},{at:.84,rotate:-1},{at:1}]}]}
};

const cinema={
 name:'Absolute Cinema',type:'badge',series:'Internet Relics',material:'Nickel film frame, black cloth and ivory character enamel',
 alt:'An original older director in thick glasses raises both open palms beside his face inside a short graphite film frame; the palms face outward rather than weighing upward.',
 mini:'<g stroke="#1d2d34" stroke-width=".6" stroke-linejoin="round"><path d="M1 4h22v17H1Z" fill="#607171"/><path d="M3 6h18v13H3Z" fill="#182c32"/><path d="M9 7h6l1 5-4 4-4-4Z" fill="#dad5be"/><path d="m8 10 4-1 4 1m-6 0v2h2v-2m1 0v2h2v-2" fill="none" stroke="#3d514f" stroke-width=".7"/><path d="m3 12 0-5 1-.5 1 3 1-4 1 .5v5l1 1-2 4-3-2Zm18 0V7l-1-.5-1 3-1-4-1 .5v5l-1 1 2 4 3-2Z" fill="#c6c4af"/><path d="m7 19 3-5 2 2 2-2 3 5Z" fill="#9daaa0"/></g>',
 silhouette:'<path d="M19 37h218v189H19Zm17 15v155h184V52Z" fill-rule="evenodd"/><path d="m82 194 4-46-10-31 6-24 19-26h54l18 26 9 24-10 32 2 45Zm-41-115 5-6 9 19 2-27 7-2 4 29 7-17 6 3-2 40 11 13-8 28-27-1-17-18Zm170 0-5-6-9 19-2-27-7-2-4 29-7-17-6 3 2 40-11 13 8 28 27-1 17-18Z"/>',
 body:p=>`
  <path d="M21 43h218v187H21Z" fill="#263e46" stroke="#0f252f" stroke-width="3"/>
  <path d="M17 36h218v187H17Z" fill="url(#${p}-steel-dark)" stroke="#b4c2bd" stroke-width="1.5"/>
  <path d="M35 51h181v155H35Z" fill="#0e222a" stroke="#6c838a" stroke-width="1.3"/>
  <g fill="#142b33" stroke="#9cafa9" stroke-width=".8">${[54,86,118,150,182].map(y=>`<rect x="23" y="${y}" width="7" height="13" rx="1"/><rect x="221" y="${y}" width="7" height="13" rx="1"/>`).join('')}</g>
  <path d="m22 40 38 0m121 176h44" stroke="#e0e3d6" stroke-width="1.2"/>
  <path d="m98 159-16 21-13 26h117l-14-28-15-19Z" fill="#22343c" stroke="#172a30" stroke-width="2"/>
  <path d="m105 158 22 20 23-20 9 17-30 32-32-31Z" fill="#e2dfc9" stroke="#83918b" stroke-width="1.4"/><path d="m123 177 8 0 7 29h-19Z" fill="#465e61"/>
  <path d="m104 160 19 18-19 10-14-14Zm47 0-19 18 19 10 15-14Z" fill="#aebaae" stroke="#4b6565" stroke-width="1.1"/>
  <path d="M94 88c-3-22 10-37 34-38 24-1 38 15 37 38l-6 58-30 27-30-26Z" fill="#708079" stroke="#2d4548" stroke-width="2.5"/>
  <path d="M99 88c-3-20 8-34 29-35 21 0 33 14 32 35l-5 55-26 24-26-24Z" fill="url(#${p}-ivory)" stroke="#d0d8c3" stroke-width="1.3"/>
  <path d="M100 85c5-18 13-26 26-28-3 8-2 14-2 23l-12 10-9 29Z" fill="#b6bfac"/>
  <path d="m155 86 4 3-4 50-10 11 3-29Z" fill="#b8bda7"/>
  <path d="M94 92c-5-23 6-42 26-44 21-4 43 8 45 29l-8-5-4-6-8-6-18-4-10 4-8 11-5 20Z" fill="#a6b5ab" stroke="#395656" stroke-width="1.5"/>
  <path d="m102 77 6-10m-2 14 7-12m33-5 8 8m-5-4 9 11" fill="none" stroke="#e3e6d6" stroke-width="1.5"/>
  <g data-part="director-brows"><path d="M102 98q13-8 24-2m9 0q13-6 23 3" fill="none" stroke="#72847a" stroke-width="3" stroke-linecap="round"/></g>
  <path d="M100 105h26v18h-24Zm33 0h26l-2 18h-24Zm-7 4h7m-33-3-8-3m67 3 7-3" fill="#afc4b3" fill-opacity=".16" stroke="#2c474a" stroke-width="3" stroke-linejoin="round"/>
  <path d="m108 113 11 0m20 0 11 0" stroke="#42625b" stroke-width="2.2"/><path d="m128 116-5 19 8 2 5-4" fill="none" stroke="#929e86" stroke-width="1.4"/>
  <path d="M115 147q14 5 28-1" fill="none" stroke="#6b7f6c" stroke-width="2.4" stroke-linecap="round"/><path d="M112 154q17 8 34-2" fill="none" stroke="#b8c3a9" stroke-width="1.1"/>
  <path d="m106 130 4 5m40-4-4 5m-30 23 11 3 13-4" fill="none" stroke="#b0bba3" stroke-width="1"/>
  <g data-part="director-left-palm"><path d="m51 162-15-29 1-30c-1-9 7-11 10-4l4 13-1-33c0-8 8-9 10-1l5 30 1-39c0-8 8-8 9 0l1 37 5-27c2-8 10-6 9 3l-3 37 8-10c5-5 11 1 7 8l-18 34-3 22Z" fill="#e0dcc5" stroke="#778f82" stroke-width="1.9" stroke-linejoin="round"/>
  <path d="m48 114 10 13-1 16m10-29 9 12 5 18m-28 11 20 4m-27-28 3 19" fill="none" stroke="#b5b99f" stroke-width="1.2" stroke-linecap="round"/><path d="m54 85 1 23m15-35 1 33m12-19-2 25" stroke="#f4edd5" stroke-width="1.2"/><path d="m51 162 30 11-3 19-31-13Z" fill="#3a565c" stroke="#a7b9b0" stroke-width="1.4"/><path d="m50 170 28 10" stroke="#dfdfc4" stroke-width="3"/></g>
  <g data-part="director-right-palm"><path d="m205 162 15-29-1-30c1-9-7-11-10-4l-4 13 1-33c0-8-8-9-10-1l-5 30-1-39c0-8-8-8-9 0l-1 37-5-27c-2-8-10-6-9 3l3 37-8-10c-5-5-11 1-7 8l18 34 3 22Z" fill="#d0d4bd" stroke="#6c897d" stroke-width="1.9" stroke-linejoin="round"/>
  <path d="m208 114-10 13 1 16m-10-29-9 12-5 18m28 11-20 4m27-28-3 19" fill="none" stroke="#a6b59a" stroke-width="1.2" stroke-linecap="round"/><path d="m202 85-1 23m-15-35-1 33m-12-19 2 25" stroke="#ece9ce" stroke-width="1.2"/><path d="m205 162-30 11 3 19 31-13Z" fill="#304e55" stroke="#9db3aa" stroke-width="1.4"/><path d="m206 170-28 10" stroke="#d9ddc1" stroke-width="3"/></g>
 `,
 motion:{duration:1450,layers:[{name:'director-left-palm',origin:[66,171],frames:[{at:0},{at:.17,y:2,rotate:-1.4},{at:.4,y:-6,rotate:3},{at:.72,y:-3,rotate:1},{at:1,y:-3,rotate:1}]},{name:'director-right-palm',origin:[189,171],frames:[{at:0},{at:.22,y:2,rotate:1.4},{at:.45,y:-7,rotate:-3},{at:.77,y:-3,rotate:-1},{at:1,y:-3,rotate:-1}]},{name:'director-brows',origin:[129,98],frames:[{at:0},{at:.34},{at:.62,y:-2},{at:1,y:-1}]}]}
};

const wizard={
 name:'Forum Wizard',type:'badge',series:'Afterhours Guild',material:'Patched cloth, folded paper and a binder-clip office wand',
 alt:'An original forum wizard wears a crooked patched cloth hat, studies an overlong creased scroll and holds an office-pen wand with a binder clip gripping a small glass marble.',
 mini:'<g stroke="#382e3d" stroke-width=".65" stroke-linejoin="round"><path d="m5 17 3-5 8 0 4 11H3Z" fill="#675675"/><path d="m6 10 6-10 1 5 5 5 3 3-19 0Z" fill="#877194"/><path d="m8 10 1 5 4 3 3-3v-5Z" fill="#ddd2b1"/><path d="m8 13 3-.5m2 0 2 .5" stroke="#514e47" stroke-width=".8"/><path d="m11 16 2 1-1 4-3-2Z" fill="#a5b1a7"/><path d="m4 18 7-2 3 6-9 1Z" fill="#e7dbb9"/><path d="m19 10 2 12" stroke="#c8b679" stroke-width="1.5"/><circle cx="19" cy="8" r="3" fill="#82a69c"/><path d="m17 9 4 0 1 2-5 0Z" fill="#acb7ad"/></g>',
 silhouette:'<path d="m82 122 23-57 19-58 24 38-3 25 39 29 20 30-36 15 29 86-42 18-20-10-18 10-37-20 3-40-39 7-10-57 27-6Zm111 18-11-64 10-12 18-2 12 14-8 14 18 140-16 6Z"/>',
 body:p=>`
  <path d="m93 125-27 56-9 48 39 16 23-9 20 10 54-17-26-97Z" fill="#3e364b" stroke="#202535" stroke-width="3" stroke-linejoin="round"/>
  <path d="m99 131-24 52-8 42 29 11 24-8 21 9 41-14-24-86Z" fill="#6b587f" stroke="#9b88a8" stroke-width="1.4"/>
  <path d="m101 147-3 56-7 28 25-8 8-54m20-23 11 42 20 32-32 8-8-58" fill="#50405f"/>
  <path d="m79 210 6-30 12-27m54 31 20 36" fill="none" stroke="#a291ae" stroke-width="1.6"/>
  <path d="m113 156 7 32 3 39m12-66 6 29-4 39" fill="none" stroke="#392d4d" stroke-width="2.4"/>
  <g transform="translate(0 18)"><path d="M97 100c-4 33 3 56 27 68 25-11 36-38 28-68l-27-17Z" fill="#b1b6a2" stroke="#4b5b51" stroke-width="2"/>
  <path d="M101 101c-2 29 3 48 23 59 21-11 30-33 24-58l-23-14Z" fill="url(#${p}-ivory)"/>
  <path d="m103 117 16-4 5 2-3 11-16 2Zm27-2 16 2-3 10-14-1Z" fill="#a8bbae" fill-opacity=".25" stroke="#5d645b" stroke-width="1.6"/>
  <path d="m121 118 9-1m-23 3h8m19 0h7" stroke="#4c5d53" stroke-width="1.5"/>
  <g data-part="wizard-glance" fill="#3c5549"><circle cx="113" cy="123" r="2"/><circle cx="138" cy="122" r="2"/></g>
  <path d="m125 120-5 15 8 1m-9 10 13-1" fill="none" stroke="#9a9c81" stroke-width="1.2"/>
  <path d="m109 139 11 11 12-3 12-11-5 27-12 28-18-24Z" fill="#aebdb0" stroke="#5a776b" stroke-width="1.4"/>
  <path d="m112 146 8 17 6 17 8-21m-17-9 9 5 12-8" fill="none" stroke="#e1e4cb" stroke-width="1.2"/>
  </g>
  <g data-part="wizard-hat"><path d="m66 112 31-50 28-54 20 32-5 24 33 26 27 30-28 18-96-4-24-12Z" fill="#403549" stroke="#202331" stroke-width="3" stroke-linejoin="round"/>
  <path d="m73 108 28-45 24-46 13 24-5 24 34 27 18 23-18 11-87-3-15-5Z" fill="url(#${p}-violet-glass)" stroke="#a18baa" stroke-width="1.3"/>
  <path d="m125 17-7 57-31 32 28-5 18-36 5-24Z" fill="#766282"/><path d="m134 66 32 27 18 22-29-6-29-17Z" fill="#55415f"/>
  <path d="M75 105q45-11 92-5l26 18q-63 31-136 2Z" fill="#7d698a" stroke="#382e49" stroke-width="2"/><path d="M68 118q54 12 112-1" fill="none" stroke="#b5a1ba" stroke-width="1.5"/>
  <path d="m114 59 12-18 5 12-6 22-12 11-5-3Z" fill="#6f8a72" stroke="#3c5b49" stroke-width="1.2"/>
  <path d="m116 60 6 2m-9 5 6 3m-8 5 6 3m1-24 5 2m-12 25 5 2" stroke="#c7c39c" stroke-width="1.2"/>
  <path d="m147 85 14 12m-23-8 13 12" stroke="#9f86aa" stroke-width=".9"/>
  </g>
  <g data-part="wizard-scroll"><path d="m43 160 62-10 26 66-70 20-18-14Z" fill="#a79b7c" stroke="#5b5f48" stroke-width="2"/><path d="m41 154 62-10 25 65-67 19-20-14Z" fill="url(#${p}-paper)" stroke="#daceaa" stroke-width="1.4"/>
  <path d="m41 154 14 15 48-25-3 18-39 18Z" fill="#f0e4c1"/><path d="m42 157 12 12-2 36 11 22-20-13Z" fill="#c3b394"/><path d="m64 180 39-11m-35 20 40-11m-35 21 39-11" stroke="#9e8862" stroke-width="1.1"/>
  <text x="58" y="180" transform="rotate(-15 58 180)" font-family="monospace" font-size="7" fill="#746448">actually...</text>
  <path d="m60 219 53-16 12 6-63 18Z" fill="#d9c39a"/><path d="m69 212 35-11" stroke="#8b7655" stroke-width="1.2"/>
  </g>
  <path d="m152 161 14 5 12 15-5 10-13-5-11-14Z" fill="#c3c6ad" stroke="#647d6a" stroke-width="1.6"/><path d="m160 171 13 9m-16-4 12 8" stroke="#eee8cc" stroke-width="1"/>
  <g data-part="wizard-wand"><path d="m185 87 12-2 24 145-10 3Z" fill="#4c5141" stroke="#253c31" stroke-width="2.4"/><path d="m189 89 5-1 22 141-4 1Z" fill="url(#${p}-brass)"/><path d="m197 154 5 29" stroke="#e0d4a3" stroke-width="1.3"/>
  <circle cx="189" cy="65" r="21" fill="url(#${p}-jade-glass)" stroke="#afc5b0" stroke-width="1.5"/><path d="M176 56q9-12 20-7m-22 13 2 11" fill="none" stroke="#e0e6ce" stroke-width="2"/>
  <path d="m171 80 34-5 6 13-37 8Z" fill="#516a6a" stroke="#c6d2c4" stroke-width="1.5"/><path d="m176 84 25-4 3 6-27 6Z" fill="#1f3a3e"/>
  <path d="m177 80-5-16c-2-7 9-11 12-3l4 14m11 3 2-18c1-8-9-9-10-1l-2 16" fill="none" stroke="#d0d8c6" stroke-width="2.2" stroke-linecap="round"/>
  <path data-part="wizard-orb-glint" d="M181 48q-12 12-7 26" fill="none" stroke="#edf2d9" stroke-width="4" opacity=".25"/>
  </g>
 `,
 motion:{duration:1570,layers:[{name:'wizard-glance',origin:[126,123],frames:[{at:0},{at:.22,x:1.7,y:-1.4},{at:.67,x:1.7,y:-1.4},{at:1}]},{name:'wizard-wand',origin:[212,228],frames:[{at:0},{at:.18,rotate:2},{at:.43,rotate:-7},{at:.68,rotate:-3},{at:1}]},{name:'wizard-scroll',origin:[92,156],frames:[{at:0},{at:.25},{at:.58,y:5,rotate:1.7},{at:.84,y:3,rotate:-.5},{at:1,y:3}]},{name:'wizard-hat',origin:[126,111],frames:[{at:0},{at:.44},{at:.64,rotate:2.7},{at:.82,rotate:-1},{at:1}]},{name:'wizard-orb-glint',origin:[189,65],frames:[{at:0,opacity:.25},{at:.3,opacity:.25},{at:.58,opacity:.9},{at:.86,opacity:.25},{at:1,opacity:.25}]}]}
};

export const extras={'meme-doomer':doomer,'meme-bloomer':bloomer,'meme-absolute-cinema':cinema,'guild-forum-wizard':wizard};
