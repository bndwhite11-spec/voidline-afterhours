/** Edition 3 original illustrations. Construction and optical minis are drawn
 * separately; catalog identity and account ownership are defined on the server. */
const outline='#11171c';

const larp={
 name:'LARP PRO MAX',type:'badge',series:'VOIDLINE Originals',material:'Dented steel, corrugated card and orange repair tape',
 alt:'A patched steel shield bearing a dented knight visor, a torn cardboard plume and a blue foam-sword hilt.',
 mini:`<g stroke="#10171b" stroke-linejoin="round"><path d="m11 1 4 1-1 5H9Z" fill="#bd9c70" stroke-width=".6"/><path d="m3 7 9-3 9 3-1 9-8 7-8-7Z" fill="#7e919b" stroke-width="1"/><path d="m5 8 7-2 7 2-1 7-6 5-6-5Z" fill="#26333d" stroke-width=".6"/><path d="m8 8 4-2 4 2 1 8-5 3-5-3Z" fill="#d2d9d7" stroke-width=".6"/><path d="m7 11 10-1-1 4-8 1Z" fill="#87999f" stroke-width=".6"/><path d="m9 12 5-.5" stroke="#18232a" stroke-width="1.1"/><path d="m15 11 3 1-1 2-3-1Z" fill="#de8b4e" stroke="none"/><path d="m2 15 5 5m-5-3 3-3" fill="none" stroke="#81a0aa" stroke-width="1.5"/></g>`,
 silhouette:'<path d="m111 20 34 5-4 25 18 7 49 15-1 82c-7 38-43 65-79 80-24-10-42-22-57-37l-17 20-20-14 18-22-13-16 17-18 8 9-2-85 49-15-3-12Z"/>',
 body:p=>`
  <ellipse cx="128" cy="237" rx="62" ry="4" fill="#070c11" opacity=".14"/>
  <g data-part="foam-sword">
   <path d="m43 151 43 37-31 38-15-13 22-29-31-20Z" fill="#172c36" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
   <path d="m42 157 35 29-25 32-8-7 22-28-29-23Z" fill="#7c9ca5"/>
   <path d="m38 168 34 27-5 8-35-29Z" fill="#3c6472" stroke="#b4c5c5" stroke-width="1.5"/>
   <path d="m49 197 10 9m-15-3 9 8" stroke="#b2c5c4" stroke-width="3"/>
   <path d="m38 172 6 4m13 10 6 5" stroke="#d3d9d0" stroke-width="1.5"/>
  </g>
  <g data-part="shield">
   <path d="m54 76 74-24 77 24-2 78c-7 40-45 70-75 83-31-14-66-41-74-80Z" fill="#1a252d" stroke="${outline}" stroke-width="4" stroke-linejoin="round"/>
   <path d="m56 70 72-24 76 25-3 78c-7 39-42 66-73 81-32-15-67-42-73-80Z" fill="url(#${p}-steel)" stroke="#c8d1d1" stroke-width="1.6" stroke-linejoin="round"/>
   <path d="m65 78 63-21 65 22-2 69c-5 31-34 56-63 71-29-15-58-40-62-71Z" fill="url(#${p}-steel-dark)" stroke="#273943" stroke-width="2" stroke-linejoin="round"/>
   <path d="m70 82 58-19 59 20-1 65c-5 29-30 50-58 65-27-15-52-36-57-65Z" fill="#25343d" stroke="#667780" stroke-width="1.3"/>
   <path d="m128 63 59 20-1 65c-5 29-30 50-58 65Z" fill="#101d28" opacity=".52"/>
   <path d="m60 75 68-22 67 22m-64 150c28-14 53-34 61-61" fill="none" stroke="#e8e8de" stroke-width="1.6" opacity=".8"/>
   <path d="m181 64 8 4-4 4 8 2" fill="#5a646b" stroke="#c5cbca" stroke-width="1.2"/>
   <path d="m66 132-3 10 5 6m116 15-7 9m-68 31 7 5" fill="none" stroke="#96a4aa" stroke-width="1.5"/>
   <g fill="#bac6c9" stroke="#29373d" stroke-width="1.4"><circle cx="69" cy="88" r="3.2"/><circle cx="187" cy="88" r="3.2"/><circle cx="77" cy="164" r="3.2"/><circle cx="179" cy="164" r="3.2"/><circle cx="128" cy="211" r="3.2"/></g>
   <g stroke="#45555e" stroke-width="1.2"><path d="m67 88h4m114 0h4m-114 76h4m98 0h4m-55 47h4"/></g>
   <g class="va-detail-only" fill="none" stroke="#5d6b72" stroke-width="1" opacity=".7"><path d="m79 111 12-4m-10 10 11-3m70 72 9-8m-13 6 6-5m-51 14 6 3"/></g>
  </g>
  <g data-part="plume">
   <path d="m113 72-11-27 4-24 9 7 5-7 9 8 8-3 5 7 10-3-2 32-13 15Z" fill="#755a3d" stroke="#372b21" stroke-width="2.5" stroke-linejoin="round"/>
   <path d="m108 24 8 7 6-6 7 8 8-3 5 7 7-3-4 24-12 12-15-5-11-20Z" fill="#b89b6b"/>
   <path d="m109 29 8 7 6-5 6 8 8-4 5 7 6-3" fill="none" stroke="#e1c79a" stroke-width="2"/>
   <path d="m113 37 7 24m1-25 7 29m1-26 5 24m4-23 2 19" fill="none" stroke="#806445" stroke-width="2"/>
   <path d="m114 43 7 19m3-20 4 20m9-17 1 12" stroke="#d6bb8a" stroke-width="1"/>
   <path d="m117 66 17 5-2 10-12-3Z" fill="#ab7953" stroke="#543d2c" stroke-width="1.5"/>
  </g>
  <g data-part="helmet">
   <path d="M92 117V97c1-25 20-38 38-38 22 0 40 18 40 43l3 60-15 32-30 12-31-15-12-28Z" fill="#111d25" stroke="${outline}" stroke-width="3.4" stroke-linejoin="round"/>
   <path d="M95 115V98c1-23 17-37 35-37 20 0 36 17 36 41l4 58-15 28-28 12-27-13-12-28Z" fill="url(#${p}-steel)" stroke="#e0e5de" stroke-width="1.2" stroke-linejoin="round"/>
   <path d="M128 63c-18 0-31 15-31 35l-3 39 34-11Z" fill="#b9c5c7"/>
   <path d="M128 63c21 1 35 17 35 39l4 47-38-20Z" fill="#6d7f87"/>
   <path d="m128 65 7 43-6 20-6-21Z" fill="#d8ded9"/>
   <path d="m97 95 8-16 16-9m21 3 11 10" fill="none" stroke="#eef0e6" stroke-width="2" opacity=".85"/>
   <path d="m157 87-9 7 4 5-8 8" fill="none" stroke="#435861" stroke-width="2.5"/>
   <path d="m159 89-8 7 4 3" fill="none" stroke="#bac7c7" stroke-width="1.2"/>
   <path d="m104 157-1 25 23 12 23-10 7-29-28 9Z" fill="#3a4b55"/>
   <path d="m127 164-1 29 23-10 7-28Z" fill="#172934"/>
   <path d="m105 173 12 6m-12 1 12 6m22-10 10-4m-10 11 9-5" stroke="#87999e" stroke-width="2"/>
  </g>
  <g data-part="visor">
   <path d="m90 118 38-9 43 10 2 35-43 20-43-19Z" fill="#293e49" stroke="${outline}" stroke-width="3.3" stroke-linejoin="round"/>
   <path d="m92 116 36-9 41 11 1 32-40 20-40-18Z" fill="url(#${p}-chrome)" stroke="#d4dcd8" stroke-width="1.5" stroke-linejoin="round"/>
   <path d="m92 116 37 7 40-5-18 18-20 2-39-7Z" fill="#c5cfcd"/>
   <path d="m129 123 40-5 1 32-40 20Z" fill="#72858c"/>
   <path d="m98 125 27 4 34-4-3 7-30 5-26-5Z" fill="#0d1a23" stroke="#4c626c" stroke-width="1"/>
   <path d="m103 126 21 3m11 0 18-2" stroke="#eef0e7" stroke-width="1.1"/>
   <path d="m131 142 1 20m7-23 1 19m7-22 1 18m-32-12-1 17m-6-21-1 16" stroke="#3a515e" stroke-width="2"/>
   <path d="m95 146 31 15m10-2 27-12" fill="none" stroke="#dde3db" stroke-width="1.2" opacity=".65"/>
   <path d="m153 119 29 13-3 6-2-1-2 5-28-12 2-5 3 1Z" fill="#d8874c" stroke="#9b5736" stroke-width="1.2" stroke-linejoin="round"/>
   <path d="m154 123 24 11m-23-7 15 7" stroke="#f1bb73" stroke-width="1" opacity=".8"/>
   <g class="va-detail-only" stroke="#ae653e" stroke-width=".9"><path d="m158 122-3 7m8-4-3 6m8-3-2 5m8-2-2 5"/></g>
  </g>
  <g data-part="hinge"><circle cx="94" cy="125" r="6.3" fill="#223640" stroke="#bac8c9" stroke-width="1.8"/><circle cx="94" cy="125" r="2.4" fill="#758a91"/><path d="m91 125h6" stroke="#192a35" stroke-width="1.5"/></g>
  <path d="m116 186 10 5 17-7" fill="none" stroke="#a7b7b8" stroke-width="1.5"/>
 `,
 motion:{duration:1440,layers:[
  {name:'visor',origin:[94,125],frames:[{at:0},{at:.17,rotate:-11},{at:.42,rotate:-16},{at:.61,rotate:1.8},{at:.76,rotate:-.8},{at:1}]},
  {name:'plume',origin:[127,73],frames:[{at:0},{at:.4},{at:.64,rotate:8,x:1},{at:.79,rotate:-3},{at:1}]}
 ]}
};

const xrp={
 name:'XRP',type:'badge',series:'Chain Signals',material:'Ceramic-white faces inset in cast nickel',
 alt:'Two opposing curved XRP-shaped nickel brackets with ivory ceramic inlays and a clear central gap.',
 mini:`<g stroke="#142128" stroke-width=".7" stroke-linejoin="round"><path d="M2 4h4l3.8 3.8c1.2 1.2 3.2 1.2 4.4 0L18 4h4l-5.4 5.4a6.5 6.5 0 0 1-9.2 0Z" fill="#e6e9e3"/><path d="M2 20h4l3.8-3.8c1.2-1.2 3.2-1.2 4.4 0L18 20h4l-5.4-5.4a6.5 6.5 0 0 0-9.2 0Z" fill="#c9d1cc"/></g>`,
 silhouette:'<path d="M39 55H76L107 86C119 98 137 98 149 86L180 55H217L173 99C148 123 108 123 83 99ZM39 207H76L107 176C119 164 137 164 149 176L180 207H217L173 163C148 139 108 139 83 163Z"/>',
 body:p=>`
  <defs>
   <clipPath id="${p}-upper-inlay"><path d="M51 61H73L103 91C117 105 139 105 153 91L183 61H205L168 98C146 119 110 119 88 98Z"/></clipPath>
   <clipPath id="${p}-lower-inlay"><path d="M51 201H73L103 171C117 157 139 157 153 171L183 201H205L168 164C146 143 110 143 88 164Z"/></clipPath>
  </defs>
  <ellipse cx="128" cy="231" rx="65" ry="3.5" fill="#070c11" opacity=".1"/>
  <g data-part="upper-casting">
   <path d="M39 62H76L107 93C119 105 137 105 149 93L180 62H217V70L173 106C148 130 108 130 83 106L39 70Z" fill="#344650" stroke="#15232c" stroke-width="3" stroke-linejoin="round"/>
   <path d="M39 55H76L107 86C119 98 137 98 149 86L180 55H217L173 99C148 123 108 123 83 99Z" fill="url(#${p}-chrome)" stroke="#d1d9d5" stroke-width="1.5" stroke-linejoin="round"/>
   <path d="M51 61H73L103 91C117 105 139 105 153 91L183 61H205L168 98C146 119 110 119 88 98Z" fill="url(#${p}-ivory)" stroke="#586b74" stroke-width="1.6" stroke-linejoin="round"/>
   <path d="M52 62H72L102 92C116 106 140 106 154 92L184 62H203" fill="none" stroke="#f4f1df" stroke-width="2.2"/>
   <path d="M42 58H75L106 89C118 101 138 101 150 89L181 58H214" fill="none" stroke="#f1f3eb" stroke-width="1.1"/>
   <path d="M86 100C109 122 146 122 171 101" fill="none" stroke="#576b76" stroke-width="2.3"/>
   <path d="m43 59 4 2m163-2 4-1" stroke="#60727b" stroke-width="1.5"/>
   <g clip-path="url(#${p}-upper-inlay)"><g data-part="upper-reflection" opacity=".2"><path d="m66 42 17-2 56 94-17 7Z" fill="#fffdf0"/><path d="m88 38 4-1 55 95-4 3Z" fill="#fffdf2" opacity=".65"/></g></g>
   <g class="va-detail-only" stroke="#9da69f" stroke-width=".8" opacity=".7"><path d="m61 67 5 4m26 21 5 4m64-3 4-4m27-20 3-3"/></g>
  </g>
  <g data-part="lower-casting">
   <path d="M39 214H76L107 183C119 171 137 171 149 183L180 214H217V221H180L149 190C137 178 119 178 107 190L76 221H39Z" fill="#31444f" stroke="#14222c" stroke-width="3" stroke-linejoin="round"/>
   <path d="M39 207H76L107 176C119 164 137 164 149 176L180 207H217L173 163C148 139 108 139 83 163Z" fill="url(#${p}-steel)" stroke="#cbd3d0" stroke-width="1.5" stroke-linejoin="round"/>
   <path d="M51 201H73L103 171C117 157 139 157 153 171L183 201H205L168 164C146 143 110 143 88 164Z" fill="url(#${p}-ivory)" stroke="#536771" stroke-width="1.6" stroke-linejoin="round"/>
   <path d="M53 199H73L103 169C117 155 139 155 153 169L183 199H203" fill="none" stroke="#f4f1df" stroke-width="2"/>
   <path d="M42 206H75L106 175C118 163 138 163 150 175L181 206H214" fill="none" stroke="#e0e6dc" stroke-width="1.1"/>
   <path d="M86 161C109 139 146 139 171 161" fill="none" stroke="#91a09f" stroke-width="1.4"/>
   <g clip-path="url(#${p}-lower-inlay)"><g data-part="lower-reflection" opacity=".2"><path d="m164 132 18-2-57 93-17-7Z" fill="#fffdf0"/><path d="m161 128 4 1-55 91-4-1Z" fill="#fffdf2" opacity=".65"/></g></g>
   <g class="va-detail-only" stroke="#a4aaa1" stroke-width=".8" opacity=".7"><path d="m61 193 5-4m26-21 5-4m64 3 4 4m27 20 3 3"/></g>
  </g>
 `,
 motion:{duration:1320,layers:[
  {name:'upper-reflection',origin:[128,86],frames:[{at:0,x:-30,opacity:0},{at:.18,x:-24,opacity:.12},{at:.57,x:65,opacity:.78},{at:.83,x:104,opacity:0},{at:1,x:104,opacity:0}]},
  {name:'lower-reflection',origin:[128,174],frames:[{at:0,x:30,opacity:0},{at:.22,x:24,opacity:.12},{at:.61,x:-65,opacity:.75},{at:.87,x:-104,opacity:0},{at:1,x:-104,opacity:0}]}
 ]}
};

const angel={
 name:'404 Angel',type:'badge',series:'VOIDLINE Originals',material:'Scored aluminium feathers and a broken nickel halo',alt:'Asymmetric aluminium feathers unfold around a dark center beneath a deliberately interrupted halo.',
 mini:'<g stroke="#17222b" stroke-width=".65" stroke-linejoin="round"><path d="M10 8 3 4 1 5l3 8 5 3 3 5 3-5 5-3 3-8-2-1-7 4Z" fill="#afbdc4"/><path d="m3 6 6 6-4-1 5 5m11-10-6 6 4-1-5 5" fill="none" stroke="#627984"/><path d="m12 8 3 5-3 6-3-6Z" fill="#243942"/><path d="M8 3c1-2 7-2 8 0l-3 1" fill="none" stroke="#e0debd" stroke-width="1.2"/></g>',
 silhouette:'<path d="m116 61 12 39 12-39 24-12 53-16 20 11-10 51-16 27 9 19-34 40-30 8-28 35-26-35-29-8-35-40 9-19-16-27-11-51 20-11 54 16Z"/><path d="M96 35c0-27 64-27 64 0l-18 5-1-9c-13-5-26-4-32 0l-1 9Z"/>',
 body:p=>`
  <g data-part="halo"><path d="M101 50c-27-25 5-43 35-38 23 4 34 16 21 29l-13 4-3-7c17-7 12-14-8-17-21-3-35 8-23 18l7 3-2 8Z" fill="url(#${p}-brass)" stroke="#76654b" stroke-width="2"/><path d="M105 39c-13-17 11-25 29-21 21 4 25 10 18 16" fill="none" stroke="#ede8c9" stroke-width="1.5"/></g>
  <g data-part="left-upper-feathers"><path d="m113 113-31-50-47-18-9 8 19 46 42 32Z" fill="#374954" stroke="#182831" stroke-width="3" stroke-linejoin="round"/><path d="m111 109-30-50-47-18-9 8 20 46 43 32Z" fill="url(#${p}-steel)" stroke="#d2dcda" stroke-width="1.3"/><path d="m35 49 25 37 39 29M43 51l20 29 26 18" fill="none" stroke="#6d838c" stroke-width="2"/><path d="m31 45 30 13 26 42" fill="none" stroke="#e4e9df" stroke-width="1.4"/><path d="m76 77-20-9m31 26-19-6" stroke="#7e9198" stroke-width="1.3"/></g>
  <g data-part="left-lower-feathers"><path d="m110 128-51-28-15 6 17 29 34 20-37-11 8 20 34 18 25-16Z" fill="url(#${p}-steel)" stroke="#263d48" stroke-width="2.5" stroke-linejoin="round"/><path d="m49 107 47 31m-31 12 39 18" stroke="#d5dfdc" stroke-width="1.3"/><path d="m64 120 31 16m-21 22 27 12" stroke="#6e858e" stroke-width="2"/><path d="m101 147-8 12 20 14 15-10Z" fill="#6a8089"/></g>
  <g data-part="right-upper-feathers"><path d="m143 112 28-48 49-25 14 9-18 49-42 38Z" fill="#324955" stroke="#172a34" stroke-width="3" stroke-linejoin="round"/><path d="m142 107 28-48 49-25 14 9-19 49-42 38Z" fill="url(#${p}-chrome)" stroke="#d3dcd8" stroke-width="1.3"/><path d="m225 43-26 41-44 31m60-69-24 31-25 20" fill="none" stroke="#70858e" stroke-width="2"/><path d="m230 39-40 22-27 42" fill="none" stroke="#eff0e4" stroke-width="1.4"/><path d="m181 77 24-13m-36 30 20-9" stroke="#82959c" stroke-width="1.3"/></g>
  <g data-part="right-lower-feathers"><path d="m144 129 54-28 15 5-20 32-34 18 39-9-8 22-37 17-25-20Z" fill="url(#${p}-steel)" stroke="#263d48" stroke-width="2.5" stroke-linejoin="round"/><path d="m209 108-50 31m32 15-40 17" stroke="#d7dfda" stroke-width="1.3"/><path d="m192 123-31 16m20 22-28 12" stroke="#657f89" stroke-width="2"/><path d="m157 150 8 12-22 14-15-13Z" fill="#5d7884"/></g>
  <path d="m128 86 21 37-5 49-16 35-16-35-6-49Z" fill="#142530" stroke="#a6b8be" stroke-width="2.5"/>
  <path d="m128 92 14 32-14 15-15-15Z" fill="#4b626e"/><path d="m128 139 14-15-4 46-10 27Z" fill="#0b1721"/><path d="m115 143 13 9 10-10-2 22-8 13-10-13Z" fill="#213c4a" stroke="#6d8994" stroke-width="1.2"/>
  <g data-part="hinges" fill="#617d87" stroke="#c8d6d4" stroke-width="1.2"><circle cx="111" cy="126" r="5"/><circle cx="145" cy="126" r="5"/></g>
  <g class="va-detail-only" fill="none" stroke="#d9e0da" stroke-width=".8" opacity=".6"><path d="m50 82 12 12m134-10-9 11m-107 55 8 5m86 0-9 4"/></g>
 `,
 motion:{duration:1510,layers:[{name:'left-upper-feathers',origin:[111,126],frames:[{at:0},{at:.28,rotate:-7},{at:.72,rotate:-2},{at:1}]},{name:'right-upper-feathers',origin:[145,126],frames:[{at:0},{at:.15},{at:.43,rotate:8},{at:.79,rotate:2},{at:1}]},{name:'left-lower-feathers',origin:[118,150],frames:[{at:0},{at:.3},{at:.58,rotate:-6},{at:1}]},{name:'right-lower-feathers',origin:[139,150],frames:[{at:0},{at:.43},{at:.7,rotate:6},{at:1}]},{name:'halo',origin:[128,29],frames:[{at:0},{at:.35,x:3,rotate:5},{at:.79,x:1,rotate:1},{at:1}]}]}
};

const ghost={
 name:'Ghost Frequency',type:'badge',series:'VOIDLINE Originals',material:'Translucent smoked glass and etched radio contours',alt:'A smoked-glass apparition with an uneven folded hem and a tired expression, crossed by an embedded radio signal.',
 mini:'<g stroke="#1a2a31" stroke-width=".7"><path d="M6 11c0-6 2-9 6-9s6 3 6 9l2 10-5-2-3 3-3-3-5 2Z" fill="#a5babc" fill-opacity=".85"/><path d="M4 7c-3 3-3 8 0 11m16-11c3 3 3 8 0 11" fill="none" stroke="#779c9e"/><path d="m8 10 3 1m2 0 3-1" stroke="#16323b" stroke-width="1.5"/><path d="M10 16q2-1 4 0" fill="none" stroke="#34545d"/></g>',
 silhouette:'<path d="M77 106c0-43 20-66 50-66s52 24 52 66l14 102-29-10-22 19-22-15-24 11-31-11Z"/><path d="M52 84C29 116 31 158 54 185l6-5c-21-28-23-62-2-91Zm151 0c24 32 22 74-1 101l-6-5c21-28 23-62 2-91Z"/>',
 body:p=>`
  <defs><clipPath id="${p}-ghost-cut"><path d="M77 106c0-43 20-66 50-66s52 24 52 66l14 102-29-10-22 19-22-15-24 11-31-11Z"/></clipPath></defs>
  <g fill="none" stroke-linecap="round"><path d="M54 83c-28 34-29 74-1 104m150-104c28 34 29 74 1 104" stroke="#517b83" stroke-width="3"/><path d="M65 98c-16 24-17 51-1 74m127-74c16 24 17 51 1 74" stroke="#8aa9aa" stroke-width="2"/></g>
  <path d="M77 106c0-43 20-66 50-66s52 24 52 66l14 102-29-10-22 19-22-15-24 11-31-11Z" fill="#284552" fill-opacity=".88" stroke="#142a34" stroke-width="3"/>
  <path d="M81 105c0-38 17-62 46-62s47 22 48 62l13 95-24-7-22 18-22-14-24 10-26-9Z" fill="url(#${p}-steel)" fill-opacity=".5" stroke="#b6cac8" stroke-width="1.5"/>
  <path d="M129 45c-27 2-41 26-42 66l-7 72 18 12 20-13 12 15Z" fill="#b3c9c6" opacity=".19"/>
  <path d="M129 45c23 6 38 27 38 62l12 83-17-4-18 15-14-11Z" fill="#112f40" opacity=".32"/>
  <path d="M93 80c7-22 18-29 31-30m-37 76-5 53m79-67 7 56" fill="none" stroke="#d2ded6" stroke-width="2" opacity=".62"/>
  <path d="m95 181 2 25m23-25 1 16m24-6-2 20m20-25 1 10" stroke="#6c949b" stroke-width="2" opacity=".6"/>
  <g clip-path="url(#${p}-ghost-cut)"><path d="M60 112c42-17 93-17 137 0m-140 22c44-16 98-16 141 0" fill="none" stroke="#b3d0ca" stroke-width="1.5" opacity=".34"/><g data-part="signal" opacity="0"><path d="M73 60c-12 40-12 93 2 151" fill="none" stroke="#d5e6d5" stroke-width="6" opacity=".8"/><path d="M80 60c-12 40-12 93 2 151" fill="none" stroke="#8db8b2" stroke-width="1.8"/></g></g>
  <g data-part="ghost-eyes"><path d="m100 111 16 5m24 0 15-5" fill="none" stroke="#173240" stroke-width="4" stroke-linecap="round"/><ellipse cx="109" cy="121" rx="4" ry="5" fill="#142e3b"/><ellipse cx="146" cy="121" rx="4" ry="5" fill="#142e3b"/></g>
  <path d="M117 154q11-4 21 0" fill="none" stroke="#2b4c58" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M119 161q8 3 16 0" fill="none" stroke="#99b7b4" stroke-width="1.2" opacity=".6"/>
 `,
 motion:{duration:1400,layers:[{name:'signal',origin:[128,128],frames:[{at:0,x:0,opacity:0},{at:.13,x:5,opacity:.75},{at:.72,x:95,opacity:.8},{at:.9,x:118,opacity:0},{at:1,x:118,opacity:0}]},{name:'ghost-eyes',origin:[128,121],frames:[{at:0},{at:.39},{at:.48,scaleY:.2},{at:.59},{at:1}]}]}
};

const velvet={
 name:'Velvet Static',type:'badge',series:'VOIDLINE Originals',material:'Folded satin violet alloy with exposed cut edges',alt:'A twisting violet-metal ribbon with distinct dark undersides, a folded crossover and one scored crease.',
 mini:'<g stroke="#282332" stroke-width=".7" stroke-linejoin="round"><path d="M6 3c5-4 16-1 15 5-1 4-13 5-13 9 0 3 6 3 10 0l-1 4C9 26 1 20 2 15 3 9 16 9 16 6c0-2-4-3-7-1L7 8 2 7Z" fill="#8f7ca4"/><path d="m8 12 5 3 6-5-4-1Z" fill="#4d3f5e"/><path d="m7 3 6-1 4 3" fill="none" stroke="#d1bfdb"/></g>',
 silhouette:'<path d="M81 40c51-37 130-5 133 39 4 52-117 54-116 99 0 18 40 25 80 3l-7 35c-52 32-120 7-123-39-3-54 118-64 119-99 0-19-33-25-59-11L89 88 46 74Z"/>',
 body:p=>`
  <defs><linearGradient id="${p}-ribbon-front" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#a191b1"/><stop offset=".33" stop-color="#6e5b84"/><stop offset=".52" stop-color="#c2afcf"/><stop offset=".64" stop-color="#826991"/><stop offset="1" stop-color="#493b59"/></linearGradient></defs>
  <path d="M82 44c50-38 128-5 131 38 4 51-118 57-115 99 1 18 40 26 80 5l-7 34c-52 31-120 7-123-39-4-55 118-64 119-99 0-20-33-25-59-11L89 92 46 78Z" fill="#2f283c" stroke="#16151f" stroke-width="3" stroke-linejoin="round"/>
  <g data-part="ribbon-upper"><path d="M82 40c50-38 128-5 131 38 1 16-9 29-30 40l-31-15c11-8 15-17 15-25 0-20-33-25-59-11L89 88 46 74Z" fill="url(#${p}-ribbon-front)" stroke="#b19cbd" stroke-width="1.3" stroke-linejoin="round"/><path d="M88 48c37-24 101-2 112 25" fill="none" stroke="#e0cde8" stroke-width="2" opacity=".72"/><path d="m92 83 17-19c18-9 39-7 53 3-18-19-49-25-77-6L64 77Z" fill="#5b466d"/><path d="m50 74 36 12 22-22" fill="none" stroke="#d0b9da" stroke-width="1.4"/></g>
  <path d="M183 118c-38 20-88 33-86 60 1 19 39 26 80 3l-6 35c-44 26-100 11-117-22-20-42 33-66 73-84Z" fill="url(#${p}-ribbon-front)" stroke="#ac96b9" stroke-width="1.4"/>
  <path d="M127 110c-18 8-36 16-50 27l26 18c14-13 34-23 55-30Z" fill="#43354f" stroke="#8b759c" stroke-width="1.1"/>
  <path d="M61 164c-12 29 21 51 58 49 22-1 39-8 52-15l1-7c-18 11-40 16-59 15-29-1-50-16-46-36Z" fill="#b198bc" opacity=".66"/>
  <path d="m94 145 10 7m-19-2 10 6m-20-1 9 6" stroke="#b59ac1" stroke-width="1.3" opacity=".7"/>
  <path data-part="ribbon-highlight" d="M100 143c21-17 55-28 75-38" fill="none" stroke="#ead6ef" stroke-width="2.5" opacity=".4"/>
  <path d="M98 180c1 19 34 27 63 15" fill="none" stroke="#e1cbea" stroke-width="1.2" opacity=".7"/>
 `,
 motion:{duration:1250,layers:[{name:'ribbon-upper',origin:[144,103],frames:[{at:0},{at:.3,rotate:-2.5},{at:.67,rotate:1},{at:1}]},{name:'ribbon-highlight',origin:[129,130],frames:[{at:0,opacity:.2},{at:.21,x:-4,y:2,opacity:.3},{at:.66,x:6,y:-3,opacity:.95},{at:.9,opacity:.2},{at:1,opacity:.4}]}]}
};

const night={
 name:'Night Shift',type:'badge',series:'VOIDLINE Originals',material:'Midnight-blue enamel, brass desk lamp and inset clock',alt:'A midnight-blue timekeeper pin with a small brass desk lamp and a real inset clock face.',
 mini:'<g stroke="#14222b" stroke-width=".7"><path d="m6 2 13 2 3 5-1 12H3L2 7Z" fill="#344d62"/><circle cx="16" cy="7" r="4" fill="#d6cba8"/><path d="M16 4v3l2 1" fill="none" stroke="#495560" stroke-width="1"/><path d="m5 7 6-2 3 6-8 2Z" fill="#c8ad71"/><path d="m9 12 1 6m-4 1h9" stroke="#e1c387" stroke-width="1.5"/><path d="m6 13-2 5h9l-3-7" fill="#d5bf78" opacity=".4" stroke="none"/></g>',
 silhouette:'<path d="m75 28 104 8 33 33-6 145-23 17-116-3-25-24 5-139Z"/>',
 body:p=>`
  <path d="m75 32 103 8 35 34-7 144-23 17-116-3-25-24 5-140Z" fill="#152631" stroke="#0c1620" stroke-width="3"/>
  <path d="m75 28 103 8 32 33-6 145-23 17-116-3-25-24 5-139Z" fill="url(#${p}-steel)" stroke="#c1cbca" stroke-width="1.2"/>
  <path d="m78 38 95 7 27 29-6 135-17 12-109-3-18-18 5-132Z" fill="#233b50" stroke="#536f7d" stroke-width="2"/>
  <path d="m80 44 89 7 23 25-5 128-13 9-101-2-15-16 5-123Z" fill="#1b3045"/>
  <path d="m61 70 14-21 92 7" fill="none" stroke="#829aa1" stroke-width="1.3" opacity=".65"/>
  <circle cx="157" cy="84" r="32" fill="#122630" stroke="#6d8590" stroke-width="4"/>
  <circle cx="157" cy="84" r="27" fill="url(#${p}-ivory)" stroke="#cbab70" stroke-width="2"/>
  <g stroke="#69706b" stroke-width="1.5"><path d="M157 61v5m0 36v5m-23-23h5m36 0h5m-39-16 3 3m27 27 3 3m0-33-3 3m-27 27-3 3"/></g>
  <path d="m157 84-9-11" stroke="#394c55" stroke-width="3" stroke-linecap="round"/>
  <g data-part="clock-hand"><path d="m157 84 12 7" stroke="#7d4c3c" stroke-width="2" stroke-linecap="round"/></g><circle cx="157" cy="84" r="3" fill="#a78d5a"/>
  <g data-part="lamp-beam" opacity=".15"><path d="m85 118-24 71h80l-30-76Z" fill="#d5bd78"/></g>
  <path d="M88 123c-12 29 5 28 21 43 7 7 7 12 7 20" fill="none" stroke="#16252d" stroke-width="11" stroke-linecap="round"/>
  <path d="M88 121c-12 29 5 28 21 43 7 7 7 12 7 20" fill="none" stroke="url(#${p}-brass)" stroke-width="7" stroke-linecap="round"/>
  <path d="m79 89 26-8 21 33-52 17Z" fill="url(#${p}-brass)" stroke="#6d5a3d" stroke-width="2" stroke-linejoin="round"/>
  <path d="m80 91 10 30 34-9-20-28Z" fill="#cfb271"/><path d="m83 92 21-7" stroke="#f2dda2" stroke-width="1.5"/>
  <ellipse cx="100" cy="123" rx="27" ry="6" transform="rotate(-17 100 123)" fill="#8a713f" stroke="#dfc58c" stroke-width="1.2"/>
  <ellipse cx="101" cy="122" rx="22" ry="3.5" transform="rotate(-17 101 122)" fill="#e9d39c"/>
  <ellipse cx="116" cy="191" rx="31" ry="8" fill="#4b493d" stroke="#a28e62" stroke-width="2"/><ellipse cx="116" cy="188" rx="29" ry="7" fill="url(#${p}-brass)"/>
  <path d="M143 190h21c9 0 10 11 4 13" fill="none" stroke="#0f202e" stroke-width="3"/>
  <g class="va-detail-only" fill="#9caeae"><circle cx="72" cy="205" r="2"/><circle cx="179" cy="205" r="2"/></g>
 `,
 motion:{duration:1430,layers:[{name:'lamp-beam',origin:[100,120],frames:[{at:0,opacity:.15},{at:.16,opacity:.1},{at:.23,opacity:.65},{at:.35,opacity:.3},{at:1,opacity:.3}]},{name:'clock-hand',origin:[157,84],frames:[{at:0},{at:.3},{at:.68,rotate:30},{at:.9,rotate:30},{at:1}]}]}
};

const unknown={
 name:'Unknown Entity',type:'badge',series:'VOIDLINE Originals',material:'Clipped steel specimen frame and smoked optical glass',alt:'Four clipped specimen-frame corners surround an ambiguous folded smoked-glass object with a second silhouette inside.',
 mini:'<g stroke="#1c2931" stroke-width=".6"><path d="M2 2h6v2H4v4H2Zm14 0h6v6h-2V4h-4ZM2 16h2v4h4v2H2Zm18 0h2v6h-6v-2h4Z" fill="#a6b9c0"/><path d="m10 6 7 3-1 9-6 2-4-6Z" fill="#6e9398"/><path d="m10 6 2 8 5-5m-5 5-2 6" fill="none" stroke="#bfd0cb"/><path d="m9 11 4-1-1 6-3-2Z" fill="#213d4c"/></g>',
 silhouette:'<path d="M37 35h55v13H51v43H37Zm127 0h55v55h-14V48h-41ZM37 165h14v42h41v14H37Zm168 0h14v56h-55v-14h41Z M112 65l60 31-9 91-59 19-43-61Z"/>',
 body:p=>`
  <g data-part="specimen-frame" fill="url(#${p}-steel)" stroke="#4c6572" stroke-width="2" stroke-linejoin="round"><path d="M37 35h55v13H51v43H37Z"/><path d="M164 35h55v55h-14V48h-41Z"/><path d="M37 165h14v42h41v14H37Z"/><path d="M205 165h14v56h-55v-14h41Z"/></g>
  <path d="M42 83V41h42m89 0h40v42M42 173v42h42m89 0h40v-42" fill="none" stroke="#d8dfd8" stroke-width="1.2"/>
  <g fill="#2f424e" stroke="#b2c3c4" stroke-width="1.2"><circle cx="45" cy="42" r="3.2"/><circle cx="211" cy="42" r="3.2"/><circle cx="45" cy="214" r="3.2"/><circle cx="211" cy="214" r="3.2"/></g>
  <path d="m68 56 13-10m103 164 11-10m-144-4-5-9" stroke="#6b818b" stroke-width="1.5"/>
  <g data-part="specimen">
   <path d="m112 65 60 31-9 91-59 19-43-61Z" fill="#142b39" stroke="#0c1c27" stroke-width="4" stroke-linejoin="round"/>
   <path d="m112 65 60 31-9 91-59 19-43-61Z" fill="#315866" fill-opacity=".9" stroke="#89a9ad" stroke-width="1.4" stroke-linejoin="round"/>
   <path d="m112 65 20 74-28 67-43-61Z" fill="#6d969a" opacity=".56"/>
   <path d="m112 65 60 31-40 43Z" fill="#aac3ba" opacity=".4"/>
   <path d="m132 139 40-43-9 91-59 19Z" fill="#142e43" opacity=".85"/>
   <path d="m92 117 31-15 20 32-27 43-27-31Z" fill="#0d2736" stroke="#7b9ea6" stroke-width="1.5"/>
   <path d="m97 120 23-10 11 24-16 30-18-19Z" fill="#365a66"/>
   <path d="m112 68 20 70-28 63M67 144l21-30m57 54 13-34" fill="none" stroke="#bdd2c8" stroke-width="1.8" opacity=".6"/>
   <path d="m124 88 8 31m22-13-10 12m-48 59 11 15" stroke="#d5e1d0" stroke-width="1" opacity=".35"/>
  </g>
  <g class="va-detail-only" fill="none" stroke="#728a96" stroke-width="1"><path d="M58 58h17m-17 5h10m119 127h12m-8 5h8"/></g>
 `,
 motion:{duration:1370,layers:[{name:'specimen',origin:[127,137],frames:[{at:0},{at:.25,rotate:-4,scaleX:.94},{at:.6,rotate:7,scaleX:1.04},{at:.84,rotate:-1},{at:1}]}]}
};

const dead={
 name:'Dead Internet',type:'badge',series:'VOIDLINE Originals',material:'Cracked ceramic, interrupted meridians and an amber terminal lamp',alt:'A pale ceramic globe is split by a jagged fracture; interrupted meridians stop beside one amber terminal light.',
 mini:'<g stroke="#1b242c" stroke-width=".7"><path d="M12 2C5 1 1 7 3 14c1 5 6 8 11 7l-3-4 2-4-3-4 3-4Z" fill="#d5d5bd"/><path d="m15 3-2 4 3 5-2 4 3 4c5-3 7-11 2-15Z" fill="#aeb7ad"/><path d="M3 9h7m-5 6h5m5-6h6m-5 6h5M8 3 6 9l2 7" fill="none" stroke="#6f8b87"/><rect x="16" y="17" width="5" height="4" rx="1" fill="#bc9153"/></g>',
 silhouette:'<path d="M126 35c-49-4-90 34-88 82 1 45 37 81 82 82l-11-23 16-22-17-29 21-25-17-28 18-21Zm17 3-16 33 18 29-18 25 17 29-15 24 13 20c38-7 67-41 67-81 0-38-26-70-66-79Z"/><path d="M156 180h49v36h-49Z"/>',
 body:p=>`
  <path d="M126 35c-49-4-90 34-88 82 1 45 37 81 82 82l-11-23 16-22-17-29 21-25-17-28 18-21Z" fill="url(#${p}-ivory)" stroke="#777f79" stroke-width="3"/>
  <path d="M143 38 127 71l18 29-18 25 17 29-15 24 13 20c38-7 67-41 67-81 0-38-26-70-66-79Z" fill="#a8b7ae" stroke="#667b78" stroke-width="3"/>
  <path d="M124 40c-33 13-52 41-50 77 1 34 18 61 43 77m-74-86 69-1m-66 30 63-1m38-29 57 2m-61 27 57 1M61 63c15 13 33 19 54 20m-62 73c14-11 31-17 57-19m27-54c22-1 43-9 56-21m-58 76c24 3 43 11 59 23" fill="none" stroke="#69857f" stroke-width="3"/>
  <path d="M148 43c27 18 39 45 37 75-2 32-17 59-44 77" fill="none" stroke="#6a817b" stroke-width="2.3"/>
  <path d="m130 36-18 36 17 28-21 25 17 29-16 22 11 23" fill="none" stroke="#e9e4d1" stroke-width="3"/>
  <path d="m134 45-11 25 18 30-18 25 17 29-15 24 11 16" fill="none" stroke="#243940" stroke-width="3"/>
  <path d="M54 92c5-21 19-37 39-44m-43 76c2 18 9 33 22 45" fill="none" stroke="#f3efda" stroke-width="2.4" opacity=".8"/>
  <g class="va-detail-only" fill="none" stroke="#818e81" stroke-width="1.1"><path d="m77 54 4 8-6 7m-20 57 9 6-3 7m119-54-7 4 3 9m-7 49-9-3-3 6"/></g>
  <path d="m155 179 45-3 8 8v28l-49 4-7-9Z" fill="#243b40" stroke="#13282e" stroke-width="3" stroke-linejoin="round"/>
  <path d="m159 184 39-2 5 5v21l-43 3Z" fill="#627773" stroke="#91a39a" stroke-width="1.2"/>
  <rect x="165" y="189" width="17" height="12" rx="2" fill="#3d3529" stroke="#ad925a" stroke-width="1.4"/>
  <rect data-part="dead-lamp" x="169" y="192" width="10" height="6" rx="1" fill="#dbb16c"/>
  <path d="m188 189 8-1m-8 5 8-1m-8 5 8-1" stroke="#263e41" stroke-width="2"/>
  <g data-part="dead-signal" opacity="0"><path d="m85 109 26-1" stroke="#d1b773" stroke-width="4" stroke-linecap="round"/></g>
 `,
 motion:{duration:1350,layers:[{name:'dead-signal',origin:[100,108],frames:[{at:0,x:-20,opacity:0},{at:.16,x:-17,opacity:.8},{at:.47,x:1,opacity:1},{at:.59,x:1,opacity:0},{at:1,x:1,opacity:0}]},{name:'dead-lamp',origin:[174,195],frames:[{at:0,opacity:.75},{at:.46,opacity:.75},{at:.53,opacity:.2},{at:.61,opacity:1},{at:.72,opacity:.45},{at:1,opacity:.75}]}]}
};

const voidwalker={
 name:'Voidwalker',type:'badge',series:'VOIDLINE Originals',material:'Chipped oxidised arch and heavy black cloth',alt:'A faceless hooded figure stands inside a chipped metal arch, its stitched cloak edged by one thin opening of light.',
 mini:'<g stroke="#101a22" stroke-width=".7"><path d="M3 22V10C3-2 21-2 21 10v12h-3V10c0-8-12-8-12 0v12Z" fill="#8a9c9f"/><path d="M12 5c-5 4-6 9-5 12l-3 5h16l-3-5c1-3 0-8-5-12Z" fill="#344a59"/><path d="m12 8 4 7-4 3-4-3Z" fill="#09121c"/><path d="M17 11v9" stroke="#c3c8ac" stroke-width=".8"/><path d="m7 21 3-3m7 3-3-3" stroke="#647b84" fill="none"/></g>',
 silhouette:'<path d="M45 226V102C45 2 211 2 211 102v124h-22V103c0-71-122-71-122 0v123Z"/><path d="M128 57c-44 35-56 76-45 112l-30 58 44-8 31 12 31-12 44 8-30-58c11-36-1-77-45-112Z"/>',
 body:p=>`
  <path d="M45 226V102C45 2 211 2 211 102v124h-22V103c0-71-122-71-122 0v123Z" fill="#263d49" stroke="#13242d" stroke-width="3"/>
  <path d="M48 221V103c0-94 160-94 160 0v118h-14V103c0-77-132-77-132 0v118Z" fill="url(#${p}-steel-dark)" stroke="#96a8aa" stroke-width="1.4"/>
  <path d="M53 209V103c0-84 150-84 150 0v106" fill="none" stroke="#bcc6bd" stroke-width="1.3" opacity=".7"/>
  <path d="m67 49 7 5-8 10m130 17 8-2-5 13m-151 85 6 4-5 6m150 22 8 4-4 8" fill="#14252e" stroke="#9faeaa" stroke-width="1"/>
  <path d="M177 95v113h9V105Z" fill="#091724"/>
  <g data-part="door-slit"><path d="m181 111 2-2v98h-2Z" fill="#d1d3b2" opacity=".8"/></g>
  <path d="M128 57c-44 35-56 76-45 112l-30 58 44-8 31 12 31-12 44 8-30-58c11-36-1-77-45-112Z" fill="#182b3b" stroke="#0c1b27" stroke-width="3" stroke-linejoin="round"/>
  <path d="M128 62c-28 26-42 57-38 81l15 26 23 12 22-12 15-25c4-26-11-57-37-82Z" fill="#38505d"/>
  <path d="M128 81c-21 18-31 39-29 59l29 24 28-24c2-20-7-41-28-59Z" fill="#071522" stroke="#607983" stroke-width="1.4"/>
  <path d="m128 84 21 54-21 18-21-18Z" fill="#0a1927"/>
  <path d="M128 63c-23 25-35 49-35 73m38-67c22 25 32 47 31 67" fill="none" stroke="#7d9297" stroke-width="1.5" opacity=".6"/>
  <path d="m91 154 17 31 18 34-30-10-31 9 22-45Z" fill="#334b59"/>
  <path d="m166 154-17 31-21 34 29-10 33 10-22-46Z" fill="#0e2132"/>
  <g data-part="cloak-edge"><path d="m88 168-29 57 34-7 16-32Z" fill="#293e4c" stroke="#496571" stroke-width="1.2"/><path d="m65 218 19-9 11-24m-23 25 12-23" fill="none" stroke="#67808b" stroke-width="1.1"/></g>
  <path d="m161 173 21 41-23-5-15 10" fill="none" stroke="#4b6675" stroke-width="1.3"/>
  <g class="va-detail-only" stroke="#94a6a6" stroke-width="1" opacity=".5"><path d="m103 175 3 4m0 0 3 4m0 0 3 4m32-8 3-4m-6 8 3-4m-6 8 3-4"/></g>
 `,
 motion:{duration:1480,layers:[{name:'cloak-edge',origin:[97,170],frames:[{at:0},{at:.26,rotate:3.5},{at:.57,rotate:-1.6},{at:1}]},{name:'door-slit',origin:[182,159],frames:[{at:0},{at:.36,scaleX:2,opacity:.9},{at:.75,scaleX:1.4},{at:1}]}]}
};

const orbit={
 name:'Low Orbit',type:'badge',series:'VOIDLINE Originals',material:'Pitted enamel moon, nickel orbital ring and a tiny alloy satellite',alt:'An off-center pitted moon sits inside an angled metal orbit; a genuinely small satellite follows the upper-right arc.',
 mini:'<g stroke="#17252e" stroke-width=".6"><path d="M2 17C-3 10 18-1 22 6c4 6-17 17-20 11Z" fill="none" stroke="#aebcb8" stroke-width="1.3"/><circle cx="11" cy="12" r="6" fill="#aeafbc"/><circle cx="9" cy="10" r="1.5" fill="#7d8096" stroke="none"/><path d="M2 17c4 3 17-5 20-11" fill="none" stroke="#d0d8c9" stroke-width="1"/><path d="m17 3 3-1 1 3-3 1Z" fill="#789ba5"/><path d="m16 2 1 3m4-3 1 3" stroke="#7b94b1" stroke-width="1.5"/></g>',
 silhouette:'<path d="M42 179C-4 134 170 4 218 72c45 64-127 150-176 107Zm7-5C11 137 173 18 211 77c35 53-120 138-162 97Z" fill-rule="evenodd"/><circle cx="115" cy="127" r="58"/><path d="m181 40 26-8 10 27-26 9Z"/>',
 body:p=>`
  <path d="M42 179C-4 134 170 4 218 72" fill="none" stroke="#1a2d39" stroke-width="8" stroke-linecap="round"/>
  <path d="M42 175C-1 131 170 8 215 72" fill="none" stroke="url(#${p}-steel)" stroke-width="4" stroke-linecap="round"/>
  <circle cx="115" cy="127" r="60" fill="#292e44" stroke="#142333" stroke-width="3"/>
  <circle cx="114" cy="124" r="57" fill="#a4a7b7" stroke="#c4c7c9" stroke-width="1.3"/>
  <path d="M113 68c-41 12-49 83-11 108 18 12 43 3 56-13-8 14-24 23-43 23-32 0-58-26-58-59 0-29 21-53 56-59Z" fill="#6d758e"/>
  <path d="M107 73c-25 4-43 25-45 48" fill="none" stroke="#d4d3d4" stroke-width="1.6" opacity=".8"/>
  <ellipse cx="96" cy="108" rx="15" ry="11" transform="rotate(-28 96 108)" fill="#80879c" stroke="#b4b6c1" stroke-width="1.3"/>
  <ellipse cx="96" cy="111" rx="10" ry="6" transform="rotate(-28 96 111)" fill="#949bad"/>
  <ellipse cx="132" cy="148" rx="16" ry="11" transform="rotate(20 132 148)" fill="#8b90a5" stroke="#bec1c8" stroke-width="1.2"/>
  <ellipse cx="134" cy="151" rx="10" ry="6" fill="#a0a5b5"/>
  <circle cx="135" cy="100" r="7" fill="#8d91a7"/><circle cx="89" cy="144" r="6" fill="#727e94"/><path d="m120 115 6 4m-9 40-7-2" stroke="#c4c5cc" stroke-width="2"/>
  <path d="M42 175c41 48 209-54 173-103" fill="none" stroke="#233743" stroke-width="8" stroke-linecap="round"/>
  <path d="M42 172c42 44 205-52 171-101" fill="none" stroke="url(#${p}-chrome)" stroke-width="4" stroke-linecap="round"/>
  <path d="M48 177c25 20 88 1 130-30" fill="none" stroke="#dce1d4" stroke-width="1.2" opacity=".85"/>
  <g data-part="satellite">
   <path d="m185 49 18-6 7 20-18 6Z" fill="url(#${p}-steel)" stroke="#243c49" stroke-width="1.5"/>
   <path d="m188 52 12-4 5 13-12 4Z" fill="#a5b7b4"/>
   <path d="m176 45 7-2 9 27-7 2Zm28-9 7-2 9 27-7 2Z" fill="#526b8b" stroke="#96afbd" stroke-width="1.2"/>
   <path d="m178 50 6-2m-4 9 6-2m-3 9 6-2m18-21 6-2m-4 9 6-2m-3 9 6-2" stroke="#9eb4bf" stroke-width="1"/>
   <path d="m194 44-3-8m-1 0h4" stroke="#c6d2ca" stroke-width="1.5"/>
  </g>
 `,
 motion:{duration:1450,layers:[{name:'satellite',origin:[197,54],frames:[{at:0},{at:.5,x:7,y:-4,rotate:5},{at:.8,x:3,y:-2,rotate:2},{at:1}]}]}
};

const bitcoin={
 name:'Bitcoin',type:'badge',series:'Chain Signals',material:'Hammered copper with recessed cuts and orange perimeter inlay',alt:'A thick hammered copper Bitcoin medallion with a double-stem mark, recessed cuts and an interrupted orange perimeter.',
 mini:'<g stroke="#4a332b" stroke-width=".7"><circle cx="12" cy="12" r="10" fill="#bb8559"/><circle cx="12" cy="12" r="8" fill="none" stroke="#e7ba83"/><path d="M9 6h5c4 0 5 5 2 6 4 2 2 6-2 6H8v-2h1V8H8V6Zm2 2v3h3c2 0 2-3 0-3Zm0 5v3h3c2 0 2-3 0-3Z" fill="#69422f" stroke="none"/><path d="M11 4v3m3-3v3m-3 10v3m3-3v3" stroke="#69422f" stroke-width="1"/></g>',
 silhouette:'<path d="M128 35c51 0 91 40 91 91s-40 93-91 93-91-42-91-93 40-91 91-91Z"/>',
 body:p=>`
  <path d="M128 40c51 0 91 40 91 91s-40 93-91 93-91-42-91-93 40-91 91-91Z" fill="#603c2d" stroke="#2b2725" stroke-width="3"/>
  <path d="m127 32 32 6 27 16 20 26 12 31-1 33-12 31-21 25-28 16-32 5-31-7-27-17-20-27-10-31 3-34 13-30 23-24 29-14Z" fill="url(#${p}-copper)" stroke="#edc498" stroke-width="1.4"/>
  <circle cx="128" cy="126" r="77" fill="#a86943" stroke="#774b35" stroke-width="3"/>
  <circle cx="128" cy="124" r="73" fill="url(#${p}-copper)" stroke="#d7a77a" stroke-width="1.3"/>
  <path d="M58 124c0-39 31-70 70-70m70 70c0 39-31 70-70 70" fill="none" stroke="#693f2e" stroke-width="6"/>
  <path d="M59 122c0-37 31-68 69-68m69 71c0 38-31 68-69 68" fill="none" stroke="#dc8550" stroke-width="3"/>
  <g transform="rotate(11 128 126)"><path d="M100 76h16V63h8v13h8V63h8v14c23 2 35 14 32 30-2 9-8 16-17 20 15 4 23 13 22 26-1 19-16 28-37 30v13h-8v-13h-8v13h-8v-14H99v-12h9V89h-8Zm22 14v31h14c20 0 22-31 0-31Zm0 43v35h16c25 0 25-35 0-35Z" fill="#75432f" stroke="#e2b283" stroke-width="1.1" fill-rule="evenodd"/><path d="M100 77h16V64m8 15h8V64m-10 26h14c13 0 17 13 11 22m-25 21h16c15 0 21 15 12 25" fill="none" stroke="#efc694" stroke-width="1.2" opacity=".6"/></g>
  <g class="va-detail-only" fill="none" stroke="#e2b083" stroke-width="1.2" opacity=".7"><path d="m78 62 5-3 3 2m-24 25 3-3 3 1m-15 38 5-3m12 42 5 2m13 23 6-1m69 6 5-3m22-21 2-4m8-31-5 1m-6-46-5-2m-22-17-4 2m-67-7-3 4m53-1-5 2"/></g>
  <g data-part="copper-signal" opacity="0"><path d="M194 111a69 69 0 0 1 1 22" fill="none" stroke="#f6bd79" stroke-width="4" stroke-linecap="round"/></g>
 `,
 motion:{duration:1270,layers:[{name:'copper-signal',origin:[128,124],frames:[{at:0,rotate:-48,opacity:0},{at:.15,rotate:-35,opacity:.8},{at:.7,rotate:35,opacity:.9},{at:.9,rotate:48,opacity:0},{at:1,rotate:48,opacity:0}]}]}
};

const ether={
 name:'Ethereum',type:'badge',series:'Chain Signals',material:'Separated smoky-violet glass facets',alt:'A recognizable Ethereum diamond is built from individually shaded glass planes, with a detached inverted lower form.',
 mini:'<g stroke="#2f293f" stroke-width=".6" stroke-linejoin="round"><path d="m12 1 8 13-8 4-8-4Z" fill="#9a8bae"/><path d="M12 1v17l8-4Z" fill="#665479"/><path d="m4 14 8-5 8 5-8 4Z" fill="#bdb1c9" fill-opacity=".5"/><path d="m4 16 8 8 8-8-8 4Z" fill="#8f78a3"/></g>',
 silhouette:'<path d="m128 24 76 126-76 43-76-43ZM52 164l76 43 76-43-76 72Z"/>',
 body:p=>`
  <defs><clipPath id="${p}-ether-upper"><path d="m128 24 76 126-76 43-76-43Z"/></clipPath></defs>
  <path d="m128 28 76 126-76 43-76-43Z" fill="#2c283e" stroke="#171d2c" stroke-width="4" stroke-linejoin="round"/>
  <path d="m128 24 76 126-76 43-76-43Z" fill="url(#${p}-violet-glass)" stroke="#c4bdd0" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="M128 26V117L55 149Z" fill="#b9adcb" fill-opacity=".65"/>
  <path d="m128 26 74 123-74-32Z" fill="#635173" fill-opacity=".85"/>
  <path d="m55 150 73-33v73Z" fill="#7d6c94" fill-opacity=".8"/>
  <path d="m128 117 74 33-74 40Z" fill="#332d48" fill-opacity=".82"/>
  <path d="M128 28v161m-72-40 72-32 72 32" fill="none" stroke="#d9ccdf" stroke-width="1.3" opacity=".65"/>
  <path d="m127 33-62 106m73-5 48 17-48 26" fill="none" stroke="#ede1ee" stroke-width="1.5" opacity=".45"/>
  <g data-part="ether-lower"><path d="m52 168 76 43 76-43-76 72Z" fill="#30273e" stroke="#171d2c" stroke-width="3" stroke-linejoin="round"/><path d="m52 164 76 43 76-43-76 72Z" fill="url(#${p}-violet-glass)" stroke="#ada2bc" stroke-width="1.5" stroke-linejoin="round"/><path d="m56 168 72 41v22Z" fill="#b5a0c5" fill-opacity=".5"/><path d="m128 209 72-41-72 64Z" fill="#59416d"/><path d="M128 210v22m-67-60 65 36" fill="none" stroke="#d0bedb" stroke-width="1.1"/></g>
  <g clip-path="url(#${p}-ether-upper)"><g data-part="ether-reflection" opacity="0"><path d="m55 20 18-4 103 203-21 5Z" fill="#efe4f0" opacity=".65"/></g></g>
 `,
 motion:{duration:1370,layers:[{name:'ether-lower',origin:[128,209],frames:[{at:0},{at:.31,y:5},{at:.7,y:2},{at:1}]},{name:'ether-reflection',origin:[128,128],frames:[{at:0,x:-16,opacity:0},{at:.18,x:-10,opacity:.3},{at:.67,x:77,opacity:.7},{at:.9,x:98,opacity:0},{at:1,x:98,opacity:0}]}]}
};

const solana={
 name:'Solana',type:'badge',series:'Chain Signals',material:'Three separate anodised-alloy bars with jade and violet faces',alt:'Three offset parallelogram alloy bars have precise metal edges and jade-to-violet faces.',
 mini:'<g stroke="#263239" stroke-width=".6" stroke-linejoin="round"><path d="M6 3h16l-4 4H2Z" fill="#85b29a"/><path d="M2 10h16l4 4H6Z" fill="#8f91a8"/><path d="M6 17h16l-4 4H2Z" fill="#9a83b3"/></g>',
 silhouette:'<path d="M69 43h151l-33 37H36Zm-33 64h151l33 37H69Zm33 64h151l-33 37H36Z"/>',
 body:p=>`
  <g data-part="solar-top"><path d="M69 50h151v9l-33 30H36v-9Z" fill="#2d4a46" stroke="#1b2e34" stroke-width="2.5" stroke-linejoin="round"/><path d="M69 43h151l-33 37H36Z" fill="url(#${p}-steel)" stroke="#c0d3c7" stroke-width="1.4"/><path d="M73 49h134l-23 25H49Z" fill="#6eaa8f" stroke="#446f67" stroke-width="1.1"/><path d="M75 51h129l-5 5H70Z" fill="#b6d7b7" opacity=".8"/><path d="M39 80h146l31-34" fill="none" stroke="#d6dfce" stroke-width="1.2"/><path d="m189 81 27-27" stroke="#69857f" stroke-width="1.4"/></g>
  <g data-part="solar-middle"><path d="M36 114h151l33 37v9H69l-33-37Z" fill="#3a3d52" stroke="#202b38" stroke-width="2.5" stroke-linejoin="round"/><path d="M36 107h151l33 37H69Z" fill="url(#${p}-steel)" stroke="#c1c9d0" stroke-width="1.4"/><path d="M49 113h135l23 25H73Z" fill="#858ba5" stroke="#596575" stroke-width="1.1"/><path d="M53 115h129l5 5H58Z" fill="#bec4c9" opacity=".65"/><path d="m40 109 31 34h144" fill="none" stroke="#d6d9d7" stroke-width="1.2"/></g>
  <g data-part="solar-bottom"><path d="M69 178h151v9l-33 30H36v-9Z" fill="#3c314d" stroke="#252837" stroke-width="2.5" stroke-linejoin="round"/><path d="M69 171h151l-33 37H36Z" fill="url(#${p}-steel)" stroke="#c7bad0" stroke-width="1.4"/><path d="M73 177h134l-23 25H49Z" fill="#9478ab" stroke="#66516f" stroke-width="1.1"/><path d="M75 179h129l-5 5H70Z" fill="#cebbd6" opacity=".75"/><path d="M39 208h146l31-34" fill="none" stroke="#ded8db" stroke-width="1.2"/></g>
 `,
 motion:{duration:1320,layers:[{name:'solar-top',origin:[128,62],frames:[{at:0},{at:.18,x:-7},{at:.48,x:1},{at:.66},{at:1}]},{name:'solar-middle',origin:[128,126],frames:[{at:0},{at:.2},{at:.39,x:7},{at:.68,x:-1},{at:1}]},{name:'solar-bottom',origin:[128,190],frames:[{at:0},{at:.4},{at:.59,x:-7},{at:.85,x:1},{at:1}]}]}
};

const doge={
 name:'Dogecoin',type:'badge',series:'Chain Signals',material:'Satin brass Shiba cameo and an ivory crescent',alt:'An expressive brass Shiba cameo has asymmetrical ears, a rounded muzzle, a sideways glance and a small crescent moon.',
 mini:'<g stroke="#4a3d2e" stroke-width=".65" stroke-linejoin="round"><path d="m5 8-1-6 6 4 4 1 6-4-1 7c4 8-1 12-8 12C4 22 1 16 5 8Z" fill="#c5a671"/><path d="m5 4 4 4-4 2m13-5-1 5 2-1" fill="#806448"/><path d="m6 12 3-1m5 1 3 1" stroke="#463a2d" stroke-width="1.1"/><path d="M6 17c0-5 12-5 12 0s-12 6-12 0Z" fill="#e6d1a1"/><path d="m10 14 4 1-2 2Z" fill="#55432e"/><path d="m12 17 3 1-3 1" fill="none"/><path d="M20 2c-2 1-2 4 0 5-4 0-5-4 0-5Z" fill="#dddcc0" stroke="none"/></g>',
 silhouette:'<path d="m76 90-7-52 48 35c17-7 31-4 43 3l43-26-5 55c32 60-1 113-69 115-70 2-108-47-53-130Z"/><path d="M220 25c-35 7-34 42-6 50-50 2-60-48 6-50Z"/>',
 body:p=>`
  <path d="M220 25c-32 9-32 38-8 49-46 0-56-46 8-49Z" fill="url(#${p}-ivory)" stroke="#a2a38b" stroke-width="2"/>
  <path d="m76 90-7-52 48 35c17-7 31-4 43 3l43-26-5 55c32 60-1 113-69 115-70 2-108-47-53-130Z" fill="#735b3e" stroke="#342b24" stroke-width="3" stroke-linejoin="round"/>
  <path d="m78 88-5-45 43 33c17-7 31-5 44 3l39-25-5 51c29 56-1 108-65 110-66 2-103-43-51-127Z" fill="url(#${p}-brass)" stroke="#e0c38e" stroke-width="1.5"/>
  <g data-part="shibe-ear"><path d="m77 48 31 31-24 22Z" fill="#6f543b" stroke="#c29a68" stroke-width="1.5"/><path d="m81 56 20 23-14 13Z" fill="#a77c52"/><path d="m79 48 4 32" stroke="#f0d29b" stroke-width="1.3"/></g>
  <path d="m192 62-3 37-22-17Z" fill="#8e6748" stroke="#d2ae77" stroke-width="1.4"/><path d="m192 62-8 23-17-3" fill="#bb965e"/>
  <path d="M80 103c-12 23-13 46-1 66l18-39 22-15 17 5 21-1 23 24c10-28-5-49-25-55-26-9-51-4-75 15Z" fill="#b58e58"/>
  <path d="m79 105 15-10 11 2m47-4 20 5" fill="none" stroke="#ead09b" stroke-width="2"/>
  <path data-part="shibe-brow" d="M90 112q14-8 25-1" fill="none" stroke="#6b5237" stroke-width="3" stroke-linecap="round"/>
  <path d="M143 111q15-1 27 8" fill="none" stroke="#71553b" stroke-width="3" stroke-linecap="round"/>
  <path d="M91 119q12-6 23 0-10 10-22 6Z" fill="#e1c99a" stroke="#7e603d" stroke-width="1.2"/>
  <path d="M143 120q14-5 25 4-12 6-25 2Z" fill="#ddc494" stroke="#7e603d" stroke-width="1.2"/>
  <ellipse cx="100" cy="121" rx="4" ry="4.5" fill="#342d27"/><ellipse cx="149" cy="123" rx="4" ry="4.5" fill="#342d27"/>
  <circle cx="99" cy="120" r="1" fill="#e9dec0"/><circle cx="148" cy="122" r="1" fill="#e9dec0"/>
  <path d="M89 149c8-17 26-18 38-13 18-9 39 2 44 18 6 21-13 40-42 40-29 0-49-19-40-45Z" fill="#dec28d" stroke="#b38d58" stroke-width="1.5"/>
  <path d="M97 151c8-9 22-8 29-3 10-7 26-4 35 5" fill="none" stroke="#f0dba9" stroke-width="2"/>
  <path d="M117 141c9-4 19-3 26 2l-9 12h-9Z" fill="#51432f" stroke="#96794b" stroke-width="1.5"/>
  <path d="m125 144 10 1" stroke="#b7a078" stroke-width="1.3"/>
  <path d="M129 154v11q13 2 22-5m-22 5q-8 8-20 1" fill="none" stroke="#84623d" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M112 188q17 8 37-2" fill="none" stroke="#f2d9a4" stroke-width="1.5"/>
  <g class="va-detail-only" fill="none" stroke="#a77e49" stroke-width="1.1"><path d="m78 138 9 2m-10 5 9 2m83-7 9 1m-8 6 8 2m-59 27-4 2m26-2 4 2m-44 27 7-2m34 0 6 2"/></g>
 `,
 motion:{duration:1320,layers:[{name:'shibe-ear',origin:[87,95],frames:[{at:0},{at:.26,rotate:-8},{at:.47,rotate:2},{at:.67},{at:1}]},{name:'shibe-brow',origin:[103,113],frames:[{at:0},{at:.39,y:-3,rotate:-4},{at:.75,y:-1},{at:1}]}]}
};

const diamond={
 name:'Diamond Hands',type:'badge',series:'Chain Signals',material:'Articulated steel fingers holding a faceted ice crystal',alt:'Two articulated steel hands physically cup a clear faceted crystal, with readable finger joints and a single reflection.',
 mini:'<g stroke="#26363f" stroke-width=".65" stroke-linejoin="round"><path d="m8 2 8 0 4 5-8 8-8-8Z" fill="#b4d2d7"/><path d="m8 2 4 5 4-5m-12 5h16m-8 0v8" fill="none" stroke="#648b9c"/><path d="m2 11 3-1 4 7h6l4-7 3 1-3 8-5 3h-4l-5-3Z" fill="#94a9b1"/><path d="m4 12 4 6m12-6-4 6" fill="none" stroke="#d0d9d5"/></g>',
 silhouette:'<path d="m94 34 68 0 28 42-62 70-62-70ZM42 112l24-9 25 53 20 19h34l20-19 25-53 24 9-15 76-49 38h-45l-49-38Z"/>',
 body:p=>`
  <defs><clipPath id="${p}-diamond-cut"><path d="m94 34 68 0 28 42-62 70-62-70Z"/></clipPath></defs>
  <path d="m94 34 68 0 28 42-62 70-62-70Z" fill="#abc8cd" stroke="#23404e" stroke-width="3" stroke-linejoin="round"/>
  <path d="m94 34 34 42-62 0Z" fill="#d8e5df"/><path d="m94 34 68 0-34 42Z" fill="#9bbdc9"/><path d="m162 34 28 42-62 0Z" fill="#729caf"/>
  <path d="m66 76 62 70-28-70Z" fill="#7097ad"/><path d="m100 76 28 70 28-70Z" fill="#c7e0df"/><path d="m156 76 34 0-62 70Z" fill="#56819a"/>
  <path d="m94 34 34 42 34-42M67 76h121m-88 0 28 68 28-68" fill="none" stroke="#e1ece1" stroke-width="1.4"/>
  <path d="m44 194 33-17 39 21-14 30-43-10Z" fill="url(#${p}-steel-dark)" stroke="#1b303d" stroke-width="3"/>
  <path d="m212 194-33-17-39 21 14 30 43-10Z" fill="url(#${p}-steel-dark)" stroke="#1b303d" stroke-width="3"/>
  <g data-part="left-fingers">
   <path d="M62 182c-10-12-13-26-12-40l3-25c1-10 11-13 17-6l24 46 22 17-11 22-24 4Z" fill="url(#${p}-steel)" stroke="#263e4c" stroke-width="2.5" stroke-linejoin="round"/>
   <path d="m57 117 13 30 12 16-3 11-18-20-8-23Z" fill="#b5c6c9" stroke="#6d8893" stroke-width="1.4"/>
   <path d="m75 113 8-8c5-4 11-1 13 4l15 41-7 12-12-14Z" fill="url(#${p}-steel)" stroke="#35515f" stroke-width="2"/>
   <path d="m95 111 10-7c5-1 10 2 11 8l8 31-6 15-12-13Z" fill="url(#${p}-steel)" stroke="#35515f" stroke-width="2"/>
   <path d="m80 173 18-9 30 1c11 1 12 14 2 17l-25 8Z" fill="#c0d0cf" stroke="#496777" stroke-width="2"/>
   <path d="m61 143 10-4m11 6 12-4m13-4 11-3m-28 38 4 14" stroke="#4d6b7a" stroke-width="2.2"/>
   <path d="m56 120 5-3m18-7 4-2m16 2 5-1m-16 66 13-3" stroke="#edf0e4" stroke-width="1.5"/>
  </g>
  <g data-part="right-fingers">
   <path d="M194 182c10-12 13-26 12-40l-3-25c-1-10-11-13-17-6l-24 46-22 17 11 22 24 4Z" fill="url(#${p}-steel)" stroke="#263e4c" stroke-width="2.5" stroke-linejoin="round"/>
   <path d="m199 117-13 30-12 16 3 11 18-20 8-23Z" fill="#9cb3bb" stroke="#5c7987" stroke-width="1.4"/>
   <path d="m181 113-8-8c-5-4-11-1-13 4l-15 41 7 12 12-14Z" fill="url(#${p}-steel)" stroke="#35515f" stroke-width="2"/>
   <path d="m161 111-10-7c-5-1-10 2-11 8l-8 31 6 15 12-13Z" fill="url(#${p}-steel)" stroke="#35515f" stroke-width="2"/>
   <path d="m176 173-18-9-28 1c-10 2-11 13-2 17l23 8Z" fill="#aebfc3" stroke="#496777" stroke-width="2"/>
   <path d="m195 143-10-4m-11 6-12-4m-13-4-11-3m28 38-4 14" stroke="#496a7c" stroke-width="2.2"/>
   <path d="m199 120-5-3m-18-7-4-2m-16 2-5-1m13 66-13-3" stroke="#dce6df" stroke-width="1.5"/>
  </g>
  <path d="m55 204 17-8 24 14-4 10-28-9Zm146 0-17-8-24 14 4 10 28-9Z" fill="#849faa" stroke="#d0d9d4" stroke-width="1.1"/>
  <g clip-path="url(#${p}-diamond-cut)"><path data-part="crystal-reflection" d="m90 20 12-4 69 147-17 7Z" fill="#f7faf0" opacity="0"/></g>
 `,
 motion:{duration:1470,layers:[{name:'left-fingers',origin:[102,183],frames:[{at:0},{at:.3,rotate:-3.7},{at:.62,rotate:-1.5},{at:1}]},{name:'right-fingers',origin:[154,183],frames:[{at:0},{at:.35,rotate:3.2},{at:.67,rotate:1.3},{at:1}]},{name:'crystal-reflection',origin:[128,90],frames:[{at:0,x:-20,opacity:0},{at:.25,x:-10,opacity:0},{at:.65,x:47,opacity:.8},{at:.9,x:69,opacity:0},{at:1,x:69,opacity:0}]}]}
};



const grass={
 name:'Touch Grass',type:'badge',series:'Internet Relics',material:'Cut earth, jade-enamel blades and clear dew',
 alt:'Three different enamel grass blades emerge from a cut soil block, with fine exposed roots, a dew drop and a fingertip leaning toward one blade.',
 mini:'<g stroke="#263a30" stroke-width=".6" stroke-linejoin="round"><path d="m3 15 8-3 10 3v6l-10 3-8-3Z" fill="#8c6c4b"/><path d="m3 15 8 3 10-3-10-3Z" fill="#b18b59"/><path d="M9 16C8 10 3 8 2 3c6 2 9 6 10 13Z" fill="#649d73"/><path d="M11 17c0-9 1-13 5-17-1 7-2 13-3 17Z" fill="#9abd83"/><path d="M13 17c3-6 5-8 9-10-1 5-4 9-7 11Z" fill="#44785c"/><path d="m6 6 1-3 2 3c1 3-4 3-3 0Z" fill="#c0ded1" stroke="#638d82"/></g>',
 silhouette:'<path d="m43 163 66-22C103 91 60 78 41 39c47 13 72 45 79 91-3-58 8-97 36-118-4 42-19 91-18 135 18-48 36-61 69-78-8 43-30 69-57 86l57 22v53l-85 21-79-25Z"/>',
 body:p=>`
  <path d="m48 166 70-25 85 31v58l-83 18-72-27Z" fill="#4e3e2e" stroke="#1e2826" stroke-width="3" stroke-linejoin="round"/>
  <path d="m48 166 72 24 83-18-85-31Z" fill="#907545" stroke="#b69a69" stroke-width="1.3"/>
  <path d="m48 166 72 24v58l-72-27Z" fill="#795c3e"/><path d="m120 190 83-18v58l-83 18Z" fill="#4e4934"/>
  <path d="m52 174 63 22m12-2 71-16" fill="none" stroke="#b29361" stroke-width="3"/>
  <path d="m63 183 13 14-4 17m33-21-2 19 9 15m37-41 2 18-11 16m39-41-5 16 9 13" fill="none" stroke="#d0b47c" stroke-width="1.3"/>
  <path d="m73 198 11 2m18 12-10 6m60-12 10 3m10-9-8 3" stroke="#c5a56d" stroke-width="1"/>
  <g class="va-detail-only" fill="#3b3528"><path d="m60 203 5-2 4 4-6 3Zm24 18 4-2 6 5-6 2Zm45 7 8-3 5 4-9 4Zm42-8 5-5 6 2-2 4Z"/></g>
  <path d="M118 165C113 111 68 89 50 45c40 11 66 39 77 82l5 35Z" fill="#477a54" stroke="#1e4436" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M55 50c34 15 57 46 66 104l-2 8C108 111 74 88 55 50Z" fill="#8db587"/>
  <path d="M60 55c25 21 46 48 58 92" fill="none" stroke="#d5d3a0" stroke-width="1.5"/>
  <g data-part="tall-blade"><path d="M124 169c-2-69 7-111 33-143-7 45-19 94-18 142Z" fill="#76a06b" stroke="#254c36" stroke-width="2.7" stroke-linejoin="round"/><path d="M154 34c-18 38-23 79-23 133l-5-1c1-69 9-108 28-132Z" fill="#a5c487"/><path d="M149 49c-10 34-17 72-17 112" fill="none" stroke="#dad9a1" stroke-width="1.3"/></g>
  <path d="M138 171c17-52 40-72 69-86-9 37-26 66-57 89Z" fill="#3b7657" stroke="#204a3a" stroke-width="2.7" stroke-linejoin="round"/>
  <path d="M201 92c-23 23-39 47-55 77" fill="none" stroke="#9fc68c" stroke-width="2"/>
  <path d="m97 75 6-15 8 15c8 17-20 19-14 0Z" fill="#83b6a4" fill-opacity=".92" stroke="#cee0cc" stroke-width="1.3"/>
  <path d="m100 76 3-9m-2 13 2 2" fill="none" stroke="#f1f1d8" stroke-width="1.8" stroke-linecap="round"/>
  <g data-part="finger"><path d="m217 74-42 16c-15 6-27 11-29 20-1 8 7 11 18 8l21-7 23-5 24-17Z" fill="url(#${p}-ivory)" stroke="#716f60" stroke-width="2"/><path d="m215 77-35 14c-12 5-26 10-29 17" fill="none" stroke="#faf1d3" stroke-width="2"/><path d="m166 98 13-5 8 6-2 8-17 6c-9 2-12-9-2-15Z" fill="#c3bba4" stroke="#938d79" stroke-width="1.1"/><path d="m170 99 8-3 6 4" fill="none" stroke="#eee7ca" stroke-width="1.2"/><path d="m205 90 3 8" stroke="#a89d84" stroke-width="1.2"/></g>
 `,
 motion:{duration:1370,layers:[{name:'finger',origin:[181,99],frames:[{at:0},{at:.23,x:-7,y:7},{at:.43,x:-9,y:10},{at:.7,x:2,y:-1},{at:1}]},{name:'tall-blade',origin:[131,169],frames:[{at:0},{at:.22},{at:.45,rotate:-8},{at:.65,rotate:3.5},{at:.84,rotate:-1.4},{at:1}]}]}
};

const npc={
 name:'NPC Energy',type:'badge',series:'Internet Relics',material:'Unexpressive porcelain, nickel backing and ivory enamel',
 alt:'A deliberately blank porcelain face with uneven eye slots and one flat mouth sits beneath an off-center enamel speech bubble containing three dots.',
 mini:'<g stroke="#555e5a" stroke-width=".65"><path d="M5 6c-4 8-1 17 7 17 6 0 9-8 6-15Z" fill="#e1ddc8"/><path d="M5 5h13v5L5 9Z" fill="#c5cbbb"/><path d="m7 12 3 .3m4 0 3-.3m-8 6h6" stroke="#45514d" stroke-width="1.1"/><path d="M11 1h12v7h-5l-3 3V8h-4Z" fill="#b3bfb8"/><path d="M14 4h.2m2.8 0h.2m2.8 0h.2" stroke="#40534a" stroke-width="1.2"/></g>',
 silhouette:'<path d="M73 56c-40 69-26 172 54 186 74-14 97-97 55-171l-32-13ZM133 17h100v66h-42l-36 26V83h-22Z"/>',
 body:p=>`
  <path d="M74 60c-36 51-39 147 48 180 83-17 103-108 59-164l-46-17Z" fill="#5b6966" stroke="#142420" stroke-width="3"/>
  <path d="M73 56c-35 50-36 144 52 177 78-17 98-104 53-161l-43-17Z" fill="url(#${p}-ivory)" stroke="#dfdfc6" stroke-width="1.5"/>
  <path d="M73 56c-25 43-28 111 18 154l32 16-22-32-13-58 4-69Z" fill="#b3b7a5"/>
  <path d="M94 65c21-9 40-6 60 3l13 27-36-10-37 10Z" fill="#f0ead2"/>
  <path d="M81 95c-11 34-6 67 8 89m47 38c25-12 42-35 48-58" fill="none" stroke="#f4eed5" stroke-width="2"/>
  <path d="m86 118 24 2 1 9-24-3Z" fill="#697975" stroke="#b7c4b6" stroke-width="1.2"/>
  <path d="m143 120 23-3-1 9-22 3Z" fill="#697975" stroke="#b7c4b6" stroke-width="1.2"/>
  <path d="m87 120 22 2m35 1 20-4" stroke="#3d504b" stroke-width="1.2"/>
  <path d="m127 126-8 32 8 4 7-4" fill="none" stroke="#a3a895" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M115 164q11 5 24-1" fill="none" stroke="#f4ead0" stroke-width="1.3"/>
  <path data-part="blank-mouth" d="M109 186q18-2 37-1" fill="none" stroke="#7c897b" stroke-width="3.3" stroke-linecap="round"/>
  <path d="m104 204 19 13 17-4" fill="none" stroke="#b0b6a2" stroke-width="1.4"/>
  <path d="m66 94 3-6m-8 73 5 5m97 36-5 6" class="va-detail-only" fill="none" stroke="#929d91" stroke-width=".8"/>
  <g data-part="dialogue-bubble"><path d="M133 23h100v62h-40l-38 26V85h-22Z" fill="#596e68" stroke="#203f35" stroke-width="2.7" stroke-linejoin="round"/><path d="M133 17h100v62h-40l-38 26V79h-22Z" fill="#c8d3c3" stroke="#f0edd9" stroke-width="1.2" stroke-linejoin="round"/><path d="M141 25h84v46h-34l-27 18V71h-23Z" fill="#aebfae" stroke="#6b8777" stroke-width="1"/>
   <g data-part="dialogue-dots" fill="#3b574c"><circle cx="157" cy="48" r="4"/><circle cx="183" cy="48" r="4"/><circle cx="209" cy="48" r="4"/></g>
  </g>
 `,
 motion:{duration:1230,layers:[{name:'dialogue-dots',origin:[183,48],frames:[{at:0,opacity:.15},{at:.32,opacity:1},{at:.49,opacity:.3},{at:.72,opacity:1},{at:1,opacity:1}]},{name:'blank-mouth',origin:[128,185],frames:[{at:0},{at:.45},{at:.58,scaleY:.3,rotate:1.5},{at:.78,scaleY:1.7},{at:1}]}]}
};

const yapper={
 name:'Certified Yapper',type:'badge',series:'Internet Relics',material:'Woven microphone mesh, nickel tubing and curled paper',
 alt:'A heavy chrome microphone has a properly woven mesh grille, a bent stand and a curled paper speech strip that suggests one more reply.',
 mini:'<g stroke="#24363c" stroke-width=".65"><path d="M6 2h8l3 3v8l-3 4H7l-3-4V6Z" fill="#8da3ab"/><path d="M7 4h7v6H7Z" fill="#405c67"/><path d="m8 5 4 4m-4 0 4-4" stroke="#bac9c5" stroke-width=".6"/><path d="m3 11 1 5 6 3v3H5m6-3 6-3 1-5m-8 11h6" fill="none" stroke="#b0c0bd" stroke-width="1.2"/><path d="m17 3 6 1-1 9-5 1 1-5-3-1Z" fill="#e0d2af"/><path d="m18 5 3 .4m-3 2 3 .4" stroke="#7a6a51" stroke-width=".7"/></g>',
 silhouette:'<path d="M84 24h62c24 3 34 23 34 46v60c0 25-10 42-32 52l-1 20 26 16v17H64v-17l49-16v-17c-32-9-54-28-54-62V94h14v29c0 27 16 43 45 46 32-2 49-19 49-46V94h17v32c0 32-16 53-47 60v10l31 22v17H64v-17l49-16V182c-31-9-48-30-48-57V68c0-23 6-39 19-44ZM180 41l47 8-4 96-48 8 7-64-16-14Z"/>',
 body:p=>`
  <defs><clipPath id="${p}-microphone-mesh"><path d="M87 31h57c20 0 28 13 28 33v30H61V65c0-21 8-34 26-34Z"/></clipPath></defs>
  <path d="m118 167 14 0 1 26 32 20-2 11-13-3-32-21Z" fill="#304851" stroke="#172b35" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m124 171 3 23 31 21" fill="none" stroke="#b1c4c7" stroke-width="3"/>
  <ellipse cx="119" cy="230" rx="55" ry="9" fill="#1b2d36" stroke="#728a92" stroke-width="2"/><ellipse cx="119" cy="225" rx="55" ry="9" fill="url(#${p}-steel)" stroke="#bdcac6" stroke-width="1.4"/>
  <path d="m81 222 26-3m26 4 23 1" fill="none" stroke="#e2e7d7" stroke-width="1.3"/>
  <path d="M54 98v28c0 37 23 58 63 59 42-1 67-24 67-60V98" fill="none" stroke="#203a45" stroke-width="12" stroke-linecap="round"/>
  <path d="M54 98v28c0 34 23 54 63 55 39-1 63-23 63-56V98" fill="none" stroke="#b6c7c8" stroke-width="5" stroke-linecap="round"/>
  <path d="M82 27h64c21 0 32 15 32 38v65c0 29-19 44-61 45-39-2-60-17-60-45V65c0-22 8-38 25-38Z" fill="#243d4a" stroke="#112632" stroke-width="3"/>
  <path d="M85 23h58c21 0 31 15 31 38v65c0 27-18 41-57 42-36-1-56-16-56-41V62c0-22 8-39 24-39Z" fill="url(#${p}-chrome)" stroke="#d9e4de" stroke-width="1.6"/>
  <path d="M87 31h57c20 0 28 13 28 33v30H61V65c0-21 8-34 26-34Z" fill="#3b5862" stroke="#182d35" stroke-width="2"/>
  <g clip-path="url(#${p}-microphone-mesh)" fill="none" stroke="#aabfc1" stroke-width="1" opacity=".8">${Array.from({length:17},(_,i)=>`<path d="M${40+i*10} 24  ${120+i*10} 105M${40+i*10} 105 ${120+i*10} 24"/>`).join('')}</g>
  <path d="M67 96h99v27c0 22-16 34-49 35-31-1-50-13-50-34Z" fill="#a0b5bc" stroke="#415f6a" stroke-width="1.2"/>
  <path d="m74 101 4 25c4 15 18 23 39 24" fill="none" stroke="#e3e9dd" stroke-width="2"/>
  <path d="M90 119h54" stroke="#496874" stroke-width="3"/><path d="m90 116h54" stroke="#e3e6d8" stroke-width="1"/>
  <circle cx="57" cy="111" r="7" fill="#79919a" stroke="#dce4d9" stroke-width="1.7"/><circle cx="177" cy="111" r="7" fill="#7a8d94" stroke="#e1e5d8" stroke-width="1.7"/>
  <g data-part="speech-strip"><path d="m185 44 48 9-5 92-47 10 3-65-15-15Z" fill="#aa9e82" stroke="#514f43" stroke-width="1.8" stroke-linejoin="round"/><path d="m183 39 48 9-4 91-43 8 4-66-16-12Z" fill="url(#${p}-paper)" stroke="#ded3b7" stroke-width="1.2"/><path d="m183 39 5 23-16 7 16 12 5-24Z" fill="#c5b695"/><path d="m190 58 31 5m-31 7 27 4m-21 11 22 4m-23 9 22 4m-24 9 22 3m-24 9 18 3" fill="none" stroke="#8f7b59" stroke-width="1.2"/><path d="m185 139 42-7-1 8-43 8Z" fill="#c7b98e"/></g>
  <g data-part="voice-wave" fill="none" stroke="#d1d9b1" stroke-width="2.4" opacity=".75"><path d="m84 71 9 0 4-10 7 22 6-28 6 31 6-19 5 4h15"/></g>
 `,
 motion:{duration:1460,layers:[{name:'voice-wave',origin:[116,71],frames:[{at:0,scaleY:.45,opacity:.35},{at:.16,scaleY:1.1,opacity:1},{at:.3,scaleY:.55},{at:.48,scaleY:1.2},{at:.65,scaleY:.65},{at:.85,scaleY:1},{at:1,scaleY:1,opacity:.75}]},{name:'speech-strip',origin:[185,44],frames:[{at:0},{at:.36},{at:.61,y:6,rotate:1.6},{at:.83,y:4,rotate:-.6},{at:1,y:4}]}]}
};

const copium={
 name:'Copium Reserve',type:'badge',series:'Internet Relics',material:'Bottle-green pressure glass, brass valve and an inset gauge',
 alt:'A narrow green-glass pressure canister has a separate brass valve, a visible inner bottle, a real ivory dial and a short hose; its gauge needle can wobble.',
 mini:'<g stroke="#29463b" stroke-width=".65"><path d="M7 5h10l2 4v12l-2 2H7l-2-2V9Z" fill="#477f65"/><path d="M8 8h7v11H8Z" fill="#2a5447"/><path d="M9 4V1h5v3m-2-2h7" fill="none" stroke="#c9ad75" stroke-width="1.5"/><circle cx="16" cy="7" r="4" fill="#ddd7bb"/><path d="m16 7 2-2" stroke="#6f4f40" stroke-width="1"/><path d="M5 10H2v6" fill="none" stroke="#a5b4a4" stroke-width="1.2"/><path d="M8 13h6v3H8Z" fill="#d2d3a5"/></g>',
 silhouette:'<path d="M93 25h63v15h-21v20h35l20 30v133l-18 17H81l-18-17V90l20-30h34V40H93Zm94 34c37 0 55 45 32 69l-13-9c16-22-1-47-19-45Z"/>',
 body:p=>`
  <path d="M84 71h81l21 28v124l-17 15H84l-17-15V99Z" fill="#18392f" stroke="#10281f" stroke-width="3" stroke-linejoin="round"/>
  <path d="M86 66h77l20 28v124l-16 15H86l-16-15V94Z" fill="url(#${p}-jade-glass)" stroke="#8bb29b" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M96 84h55l12 16v109l-10 11H97l-11-11V99Z" fill="#163f34" fill-opacity=".65" stroke="#78a188" stroke-width="1.2"/>
  <path d="m86 75-9 23v109l8 13m15-145h45" fill="none" stroke="#c3d3b2" stroke-width="2" opacity=".72"/>
  <path d="M158 97v115l-9 11" fill="none" stroke="#113a31" stroke-width="8" opacity=".6"/>
  <path d="M72 213h110v9l-16 14H88l-16-14Z" fill="#405d4a" stroke="#19382b" stroke-width="2"/><path d="M80 217h94m-88 12h78" fill="none" stroke="#96ae8a" stroke-width="1.1"/>
  <path d="M91 114h58v64H91Z" fill="#aeb889" stroke="#213d2b" stroke-width="2"/><path d="M96 119h48v54H96Z" fill="#d7d7b2"/><text x="120" y="140" text-anchor="middle" font-family="monospace" font-size="10" letter-spacing=".5" fill="#3d5138">COPIUM</text><path d="M104 150h31m-31 6h26m-26 7h20" stroke="#809169" stroke-width="1"/>
  <path d="M117 67V40h17v27" fill="url(#${p}-brass)" stroke="#544e32" stroke-width="2"/><path d="m121 45 1 17" stroke="#efe0ad" stroke-width="1.5"/>
  <g data-part="canister-valve"><path d="M94 28h63v12H94Z" fill="#8b7848" stroke="#3a4230" stroke-width="2"/><path d="M94 23h63v12H94Z" fill="url(#${p}-brass)" stroke="#e0c88d" stroke-width="1.3"/><path d="M100 27h51m-46 0v5m12-5v5m12-5v5m12-5v5" stroke="#75643c" stroke-width="1.2"/></g>
  <path d="M134 50h44c27 0 43 25 39 48l-7 34" fill="none" stroke="#1d332e" stroke-width="11" stroke-linecap="round"/><path d="M134 50h44c24 0 39 23 35 46l-6 28" fill="none" stroke="#91aa93" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="171" cy="70" r="28" fill="#365047" stroke="#122d23" stroke-width="3"/><circle cx="169" cy="66" r="26" fill="url(#${p}-brass)" stroke="#d9d5a7" stroke-width="1.2"/><circle cx="169" cy="66" r="20" fill="#e3ddbd" stroke="#61795b" stroke-width="1.6"/>
  <path d="m151 65 4 1m-1-10 4 3m5-9 2 5m8-5-1 5m9 1-4 3m7 6-4 1m-27 13 4-4m17 4-3-4" stroke="#677858" stroke-width="1.6"/>
  <path data-part="canister-needle" d="m169 66 10-12-7 14Z" fill="#995f44" stroke="#5f523b" stroke-width=".8"/><circle cx="169" cy="66" r="3.6" fill="#7e764e" stroke="#e5d8ab" stroke-width="1.1"/>
  <g class="va-detail-only" fill="#739b81" opacity=".65"><circle cx="103" cy="94" r="2"/><circle cx="144" cy="195" r="1.6"/><circle cx="112" cy="206" r="1.4"/></g>
 `,
 motion:{duration:1450,layers:[{name:'canister-valve',origin:[126,29],frames:[{at:0},{at:.27,rotate:12},{at:.48,rotate:7},{at:1,rotate:7}]},{name:'canister-needle',origin:[169,66],frames:[{at:0},{at:.25,rotate:35},{at:.42,rotate:-9},{at:.57,rotate:15},{at:.73,rotate:3},{at:1,rotate:6}]}]}
};

const cooked={
 name:'Absolutely Cooked',type:'badge',series:'Internet Relics',material:'Cast iron, charred black cube and layered amber flame',
 alt:'A thick cast-iron frying pan holds one charred cube above a layered amber flame, with a riveted handle and one small smoke curl.',
 mini:'<g stroke="#2b2928" stroke-width=".6" stroke-linejoin="round"><path d="M5 17C2 13 7 11 7 6c4 4 1 6 4 7 2-3 3-4 3-8 6 6 8 10 4 14Z" fill="#be7e45"/><ellipse cx="10" cy="15" rx="9" ry="5" fill="#53554e"/><ellipse cx="10" cy="13" rx="9" ry="4" fill="#252f30"/><path d="m17 11 6-3 1 3-6 3Z" fill="#8b9488"/><path d="m7 7 5-2 4 3-1 5-5 1-4-3Z" fill="#333b35"/><path d="m7 7 4 3 5-2m-5 2-1 4" fill="none" stroke="#9d8a64" stroke-width=".7"/></g>',
 silhouette:'<path d="M62 188c-38-37 6-63 13-113 22 22 16 53 38 62 23-31 29-45 32-89 44 48 73 83 53 126l41-25 13 17-53 39c-26 37-105 46-137-17Z"/>',
 body:p=>`
  <g data-part="pan-flame"><path d="M76 217c-43-28-41-61-9-91 12-11 22-30 26-54 24 28 5 62 29 74 22-27 31-46 33-89 40 44 69 73 57 111-8 25-29 42-58 56Z" fill="#975936" stroke="#523c2b" stroke-width="2.2"/><path d="M82 213c-25-22-20-45-1-67 9-10 13-22 16-37 16 24 8 43 28 52 18-15 31-37 34-61 27 35 42 60 25 88l-21 25Z" fill="#c68a4c"/><path d="M110 215c-19-19-9-36 9-55 6 15 7 20 17 21 7-7 11-15 13-27 24 29 23 49 1 65Z" fill="#e0b56c"/></g>
  <path d="m182 154 47-31 12 13-44 39Z" fill="#303c3c" stroke="#111f23" stroke-width="3" stroke-linejoin="round"/>
  <path d="m187 151 41-24 7 8-40 30Z" fill="url(#${p}-steel-dark)" stroke="#7f9699" stroke-width="1.3"/><path d="m222 135 6-4 3 3-5 4Z" fill="#101c21"/>
  <ellipse cx="111" cy="175" rx="83" ry="44" fill="#1c292c" stroke="#0f1b20" stroke-width="3"/>
  <path d="M29 164v14c4 29 38 45 82 45 48 0 81-19 83-47v-12Z" fill="#3a4442" stroke="#142429" stroke-width="2.7"/>
  <path d="M35 178c12 25 48 34 77 34 32 0 64-10 77-32" fill="none" stroke="#69756c" stroke-width="2"/>
  <ellipse cx="111" cy="163" rx="83" ry="42" fill="#69756f" stroke="#1a2d31" stroke-width="3"/><ellipse cx="111" cy="160" rx="75" ry="34" fill="#1a2a2e" stroke="#9ba69a" stroke-width="1.4"/>
  <path d="M44 154c20-23 82-33 126-9" fill="none" stroke="#4d6261" stroke-width="1.7"/>
  <path d="m174 146 5 2m-3 6 5 2" stroke="#acb7aa" stroke-width="2.6" stroke-linecap="round"/>
  <g data-part="charred-cube"><path d="m85 106 40-17 35 24-9 42-41 12-31-24Z" fill="#1c292b" stroke="#142025" stroke-width="3" stroke-linejoin="round"/><path d="m85 102 40-17 35 24-43 17Z" fill="#505047" stroke="#8b896c" stroke-width="1.3"/><path d="m85 102 32 24-7 37-31-24Z" fill="#2d362f"/><path d="m117 126 43-17-9 42-41 12Z" fill="#192b28"/><path d="m89 104 13 10m9-22 10 13 19 6m-26 18-2 13m17-16 11-2-4 14 10 3m-55-24 9 7-4 13" fill="none" stroke="#898367" stroke-width="1.3"/><path d="m100 104 7 5m17-10 7 5m-31 28 4 6m23 9 7-3" fill="none" stroke="#252f2d" stroke-width="2.4"/><g class="va-detail-only" fill="#92927c" opacity=".55"><path d="m90 110 4 2-1 2-3-1Zm25-15 3 2-1 2-3-1Zm22 19 3-1-1 2-2 1Zm-46 22 2 1-1 3-2-1Z"/></g></g>
  <g data-part="pan-smoke" opacity=".5"><path d="M120 93c-14-15 14-18 2-33-6-7 7-15 1-25" fill="none" stroke="#a9b4a5" stroke-width="2.4" stroke-linecap="round"/><path d="M132 84c-5-9 7-13 6-19" fill="none" stroke="#748c80" stroke-width="1.2"/></g>
 `,
 motion:{duration:1500,layers:[{name:'charred-cube',origin:[118,127],frames:[{at:0},{at:.16,y:2,rotate:-3},{at:.39,y:-24,rotate:26},{at:.61,y:-10,rotate:10},{at:.72,y:2,rotate:-2},{at:.9},{at:1}]},{name:'pan-smoke',origin:[125,70],frames:[{at:0,opacity:0},{at:.65,opacity:0},{at:.78,y:-3,opacity:.7},{at:1,y:-11,opacity:0}]},{name:'pan-flame',origin:[125,220],frames:[{at:0},{at:.18,scaleY:.92},{at:.44,scaleY:1.03},{at:.77,scaleY:.97},{at:1}]}]}
};

const terminal={
 name:'Chronically Online',type:'badge',series:'Internet Relics',material:'Recessed phosphor glass and a worn charcoal CRT housing',
 alt:'A slightly angled CRT has a thick worn bezel, recessed green screen, an amber power light and a short typed message that ends with a still cursor.',
 mini:'<g stroke="#26373d" stroke-width=".65" stroke-linejoin="round"><path d="m3 2 17 1 3 4-1 12-18 1-3-3Z" fill="#607171"/><path d="m4 4 14 1 2 2-1 10-15 1Z" fill="#243e3e"/><path d="m6 7 3 2-3 2m5 1h5" fill="none" stroke="#c0d2a4" stroke-width="1.1"/><path d="m9 19 7-1 1 4H6Z" fill="#899788"/><circle cx="20" cy="17" r=".8" fill="#d6ae62"/></g>',
 silhouette:'<path d="m54 36 135 5 39 33-5 133-66 6 7 16 27 7v14H63v-14l30-10 3-13-50-6-13-30 5-124Z"/>',
 body:p=>`
  <path d="m102 197 53-2 8 32 27 6v13H63v-13l32-9Z" fill="#354b4c" stroke="#172c31" stroke-width="3" stroke-linejoin="round"/>
  <path d="m107 202 40-1 5 27-39 5-15-6Z" fill="#869a90" stroke="#b8c2a9" stroke-width="1.2"/><path d="m73 236 39 2 68-3" stroke="#b6c1aa" stroke-width="1.6"/>
  <path d="m59 40 132 5 37 31-5 130-145 11-34-20-11-126Z" fill="#1c333b" stroke="#0e232c" stroke-width="3" stroke-linejoin="round"/>
  <path d="m58 34 132 5 34 31-5 130-145 11-32-20-9-124Z" fill="#6f817e" stroke="#b6c2b5" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="m190 39 34 31-5 130-29-16Z" fill="#314b53"/>
  <path d="m58 34 132 5-5 14-127-3-15 18-10-1Z" fill="#8b9c93"/><path d="m190 39-5 14 26 25 13-8Z" fill="#9baba1"/>
  <path d="m58 51 125 5 22 21-4 103-127 10-25-14-6-109Z" fill="#1c363d" stroke="#344f57" stroke-width="2"/>
  <path d="m63 61 111 4 17 17-4 87-112 8-17-12-6-91Z" fill="#162e31" stroke="#97aba0" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M71 70c36-6 71-3 108 12l-4 75-97 7-13-8-4-78Z" fill="#244542"/>
  <path d="m68 79 7-7 98 9" fill="none" stroke="#749d85" stroke-width="1.2" opacity=".55"/>
  <path d="m191 47 10 10-2 5 5 4" fill="none" stroke="#1b343d" stroke-width="3"/><path d="m194 47 6 5" fill="none" stroke="#bdc7b5" stroke-width="1.2"/>
  <path d="m202 96 11 3m-11 4 11 3m-11 4 11 3m-12 4 11 3m-11 4 11 3" class="va-detail-only" stroke="#152f38" stroke-width="2"/>
  <path d="m65 194 31 2m11 0 24-1" stroke="#2e4d51" stroke-width="2"/><circle cx="194" cy="187" r="4" fill="#b89952" stroke="#253e40" stroke-width="1.5"/><circle cx="193" cy="186" r="1.4" fill="#e7cf87"/>
  <g font-family="monospace" font-size="14" letter-spacing=".5" fill="#bad2a0"><text data-part="terminal-first-word" x="79" y="106">still</text><text data-part="terminal-last-word" x="79" y="127">here.</text></g>
  <path data-part="terminal-cursor" d="M131 129h10" stroke="#d4dfb1" stroke-width="2.5"/>
  <path d="M78 146h73" stroke="#4f765f" stroke-width=".9" opacity=".55"/>
 `,
 motion:{duration:1430,layers:[{name:'terminal-first-word',origin:[79,106],frames:[{at:0,opacity:0},{at:.19,opacity:0},{at:.29,opacity:1},{at:1,opacity:1}]},{name:'terminal-last-word',origin:[79,127],frames:[{at:0,opacity:0},{at:.44,opacity:0},{at:.54,opacity:1},{at:1,opacity:1}]},{name:'terminal-cursor',origin:[136,129],frames:[{at:0,opacity:0},{at:.55,opacity:0},{at:.62,opacity:1},{at:.77,opacity:.2},{at:.89,opacity:1},{at:1,opacity:1}]}]}
};

const profileAward={
 name:'Profile Authored',type:'earned',series:'Earned Achievements',material:'Ivory field notes, a graphite pencil and an inset jade check',
 alt:'An earned achievement depicts a bound ivory field notebook with deliberately written lines, a sharpened pencil and an inset jade check rather than a decorative staff symbol.',
 mini:'<g stroke="#40574a" stroke-width=".65" stroke-linejoin="round"><path d="M4 2h13l3 4v16H4Z" fill="#e0d4af"/><path d="M6 4h9l3 3v13H6Z" fill="#f1e8cd"/><path d="M8 8h7m-7 3h5" stroke="#9b997a" stroke-width=".8"/><path d="m4 18 11-13 3 3L7 21l-4 1Z" fill="#c8ad71"/><path d="m5 18 2 2m8-14 2 2" stroke="#705f41"/><path d="M15 15h8v8h-8Z" fill="#5a8a6a"/><path d="m17 19 1.5 1.5 3-4" fill="none" stroke="#e6edcf" stroke-width="1.1"/></g>',
 silhouette:'<path d="M58 24h123l29 29v176H58ZM27 197 155 48l32 29L60 224l-41 12Zm129-35h83v80h-83Z"/>',
 body:p=>`
  <path d="M60 29h122l29 29v174H60Z" fill="#6c6a50" stroke="#29372d" stroke-width="3"/>
  <path d="M56 23h122l29 29v174H56Z" fill="url(#${p}-paper)" stroke="#d9d9b5" stroke-width="1.5"/>
  <path d="M66 32h105l24 24v158H66Z" fill="#ede3c6" stroke="#9eaa87" stroke-width="1.2"/>
  <path d="m171 32 1 26 23-2Z" fill="#bdb99c"/><path d="m171 32 24 24-23-4Z" fill="#faf0d6" stroke="#a6aa8a" stroke-width="1"/>
  <path d="M56 23h12v203H56Z" fill="#547a60" stroke="#2d513b" stroke-width="1.5"/>
  <g fill="#bcc6a8" stroke="#3b5b43" stroke-width="1.2"><rect x="51" y="49" width="22" height="6" rx="2"/><rect x="51" y="85" width="22" height="6" rx="2"/><rect x="51" y="121" width="22" height="6" rx="2"/><rect x="51" y="157" width="22" height="6" rx="2"/><rect x="51" y="193" width="22" height="6" rx="2"/></g>
  <path d="M84 72h77m-77 13h91m-91 13h67m-67 25h82m-82 13h63m-63 39h56m-56 13h40" fill="none" stroke="#a3a284" stroke-width="1.3"/>
  <path d="M82 113h46m-46 39h61" stroke="#70866a" stroke-width="2"/>
  <g data-part="authored-pencil"><path d="m32 194 122-142 28 25L60 219l-40 15Z" fill="#6b6040" stroke="#293b31" stroke-width="2.5" stroke-linejoin="round"/><path d="m35 190 120-140 23 22L57 213l-34 16Z" fill="url(#${p}-brass)" stroke="#dcd1a4" stroke-width="1.2"/><path d="m155 50-1 20-119 135 0-15Z" fill="#c8a965"/><path d="m154 70 24 2L57 213l-10-11Z" fill="#8e7544"/><path d="m35 190 22 23-34 16Z" fill="#dbcc9c" stroke="#5d674c" stroke-width="1.2"/><path d="m24 216-1 13 12-5Z" fill="#34433b"/><path d="m150 56 17 15" stroke="#f1dfaa" stroke-width="1.4"/></g>
  <path d="M157 166h81v76h-81Z" fill="#244f38" stroke="#b1c49b" stroke-width="2"/><path d="M163 172h69v64h-69Z" fill="#659371" stroke="#2e6244" stroke-width="1.5"/>
  <path data-part="authored-check" d="m177 204 14 13 27-32" fill="none" stroke="#edf0cf" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m166 178h15m45 42v10h-12" fill="none" stroke="#9bbb8a" stroke-width="1"/>
 `,
 motion:{duration:1260,layers:[{name:'authored-pencil',origin:[144,82],frames:[{at:0},{at:.24,x:3,y:2,rotate:2},{at:.52,x:-2,y:4,rotate:-1},{at:.75},{at:1}]},{name:'authored-check',origin:[196,204],frames:[{at:0,opacity:.3},{at:.45,opacity:.3},{at:.76,opacity:1},{at:1,opacity:1}]}]}
};

const contributionAward={
 name:'Community Contribution',type:'earned',series:'Earned Achievements',material:'Bookbinder cloth, brass page edges and a reviewed enamel seal',
 alt:'A reviewed-contribution award has an open ivory book, separately bound page blocks, a dark cloth ribbon and a jade approval seal with a deliberate check.',
 mini:'<g stroke="#4d5e4c" stroke-width=".65" stroke-linejoin="round"><path d="M2 4h8l2 3 2-3h8v14h-8l-2 3-2-3H2Z" fill="#b69e68"/><path d="M3 3h7l2 3 2-3h7v13h-7l-2 3-2-3H3Z" fill="#e3dabc"/><path d="M12 6v12M5 7h4m-4 3h4m6-3h4" fill="none" stroke="#929878"/><path d="M15 12h8v9h-8Z" fill="#4f7d60"/><path d="m17 16 1.5 2 3-4" fill="none" stroke="#e1e6c7" stroke-width="1.1"/><path d="m7 17 3 3-2 4-2-3-3 1Z" fill="#767c6f"/></g>',
 silhouette:'<path d="M34 44h75l19 22 19-22h76v153h-74l-21 30-21-30H34Zm35 142 42 18-17 43-17-24-31 12Zm93-58h78v93h-78Z"/>',
 body:p=>`
  <path d="m71 175 43 26-22 47-17-25-31 12Z" fill="#414b42" stroke="#202e25" stroke-width="2.4"/><path d="m75 183 29 18-14 35-13-20-25 9Z" fill="#7b8371"/><path d="m82 188 5 28m6-21-5 29" stroke="#a9ac8b" stroke-width="1.2"/>
  <path d="M35 50h72l21 22 21-22h75v153h-73l-23 27-22-27H35Z" fill="#6b613d" stroke="#23382a" stroke-width="3"/>
  <path d="M34 44h73l21 23 21-23h74v152h-73l-22 26-22-26H34Z" fill="url(#${p}-brass)" stroke="#c9bf91" stroke-width="1.5" stroke-linejoin="round"/>
  <g data-part="reviewed-pages"><path d="M44 35h62l22 28 22-28h62v148h-62l-22 28-22-28H44Z" fill="#eee2bf" stroke="#a9a981" stroke-width="1.5" stroke-linejoin="round"/><path d="m46 40 57 0 23 25v139l-23-27H46Z" fill="#d5ceaa"/><path d="m130 65 22-25h56v137h-57l-21 27Z" fill="#f0e7ca"/><path d="M128 64v144" stroke="#7d8f6d" stroke-width="2.5"/><path d="m49 46 52 0 19 22m16-2 18-20h47" fill="none" stroke="#f8edcf" stroke-width="1.5"/>
  <g fill="none" stroke="#a8a17b" stroke-width="1.2"><path d="m55 67 43 0 16 16m-59-2h42l17 16m-59-2h42l17 16m-59-2h42l17 16m-59-2h42l17 16m-59-2h42l17 16m28-70 16-15h42m-58 29 16-15h42m-58 29 16-15h42"/></g></g>
  <path d="m38 190 68-1 20 23m8 0 18-23h62" fill="none" stroke="#e8d39c" stroke-width="1.5"/>
  <path d="m162 135 69-3 8 15-1 64-69 9-13-13Z" fill="#274e38" stroke="#172e21" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m166 139 60-3 7 13-1 57-60 8-10-10Z" fill="#628b65" stroke="#bed0a4" stroke-width="1.3"/>
  <path d="m170 145 49-3 6 10-1 48-48 6-7-7Z" fill="#486f4e"/>
  <path d="m179 174 12 13 24-31" fill="none" stroke="#dce6c0" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <g data-part="reviewed-glint" opacity="0"><path d="m167 134 7-1 25 77-7 1Z" fill="#edf1ca" opacity=".65"/></g>
 `,
 motion:{duration:1380,layers:[{name:'reviewed-pages',origin:[128,202],frames:[{at:0},{at:.25,rotate:-1.5},{at:.59,rotate:.6},{at:1}]},{name:'reviewed-glint',origin:[190,174],frames:[{at:0,x:-8,opacity:0},{at:.26,x:-5,opacity:0},{at:.7,x:31,opacity:.7},{at:.9,x:39,opacity:0},{at:1,x:39,opacity:0}]}]}
};

export const originals={larp,angel,ghost,velvet,night,unknown,dead,voidwalker,orbit,'coin-bitforge':bitcoin,'coin-etherglass':ether,'coin-crosssignal':xrp,'coin-solarstack':solana,'coin-moonshibe':doge,'coin-diamondhands':diamond,'meme-grass':grass,'meme-npc':npc,'meme-yapper':yapper,'meme-copium':copium,'meme-cooked':cooked,'meme-terminal':terminal};
export const earned={'profile-authored':profileAward,'reviewed-contribution':contributionAward};
