/** Edition 3 gift masters: original layered drawings, no ownership side effects. */
const ink='#10161c',paper='#dfd5b9';
const layer=(name,body)=>`<g data-part="${name}">${body}</g>`;
const screw=(x,y)=>`<g class="va-detail-only"><circle cx="${x}" cy="${y}" r="3.2" fill="#859397" stroke="#111c23" stroke-width="1.2"/><path d="m${x-1.6} ${y+1.3} 3.2-2.6" fill="none" stroke="#29343a" stroke-width="1.2"/></g>`;

export const gifts={
 'gift-rose':{
  name:'Chrome Rose',type:'gift',series:'Afterhours Objects',material:'Folded nickel, oxidized leaf and paper',
  alt:'A hand-folded silver rose with six overlapping metal petals, a dark recessed heart, a bent stem and a cream paper sleeve.',
  mini:`<path d="m11 14-1 8h2l1-7" fill="#9babad"/><path d="m12 18 6-4-1 4-5 2" fill="#6b8b7d"/><path d="m7 17 5-2 3 7-6 1Z" fill="#d8cbae" stroke="#6c6e61" stroke-width=".6"/><path d="M5 6c-1-3 2-5 5-4 3-2 8-1 9 3 4 2 3 7-1 10l-5 2-5-1C4 14 2 9 5 6Z" fill="#9eafb6" stroke="#324956" stroke-width=".8"/><path d="M6 5c4-2 8-1 10 2l-4 3-5-1m-2 2c5 3 9 4 14-1-2 5-5 7-8 6Z" fill="#c4d0d0" stroke="#edf2e6" stroke-width=".6"/><path d="M9 6c2-2 6-1 6 1l-2 4-4-1 1-2 3 1" fill="#405e6b" stroke="#f0f1e4" stroke-width=".7"/>`,
  silhouette:`<path d="M112 47c14-8 31 2 37 13 14-9 34-2 38 17 3 12-2 24-7 32 6 20-17 43-39 45l-10 14 39-29-7 29-35 16-6 39-25 6-15-66 29-10c-26-6-47-27-51-49-3-14 2-25 11-26-3-17 10-28 24-26 6 0 12 2 17 5Z"/>`,
  body:p=>`
   <ellipse cx="119" cy="233" rx="41" ry="5" fill="#05090c" opacity=".38"/>
   <g data-part="rose-stem">
    <path d="M126 119c1 25-9 49-11 67-1 12 3 24 0 39" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>
    <path d="M126 119c1 25-9 49-11 67-1 12 3 24 0 39" fill="none" stroke="url(#${p}-steel-dark)" stroke-width="5.2" stroke-linecap="round"/>
    <path d="m126 137-4 16m-3 17-2 10m-1 25 1 13" fill="none" stroke="#b2beb9" stroke-width="1.3" stroke-linecap="round"/>
    <path d="m121 170 18-9" fill="none" stroke="#384f47" stroke-width="4"/>
    ${layer('rose-leaf',`<path d="M133 162c8-17 21-19 37-22-3 18-10 31-34 30Z" fill="#446459" stroke="#18382f" stroke-width="1.5"/><path d="m137 166 26-20-9 16-13 7Z" fill="#759185"/><path d="m137 166 26-20m-14 12 1-9m3 6 9-1" fill="none" stroke="#b7c4a6" stroke-width="1"/><path d="m141 151 1-3m16 13 3-2" stroke="#947a58" stroke-width="2"/>`)}
   </g>
   ${layer('rose-sleeve',`<path d="m89 155 26-8 23 63-28 12Z" fill="#9d957f" stroke="#2b3438" stroke-width="1.3"/><path d="m89 155 12 5 15-13 18 58-24 17Z" fill="url(#${p}-paper)"/><path d="m89 155 12 5 9 62Z" fill="#bbb094"/><path d="m101 160 15-13-2 22Z" fill="#f1e7cb"/><path d="m100 169 23 7m-19 7 23 7" fill="none" stroke="#9d8d74" stroke-width=".8"/><path d="m108 201 20-6-2 10-16 5Z" fill="#626867" opacity=".7"/><path class="va-detail-only" d="m112 200 9-3m-8 5 8-3" stroke="#d9d9c6" stroke-width=".8"/><path d="m93 157 7 4 9 54" fill="none" stroke="#f1e8d1" stroke-width="1.2"/>`)}
   <path d="m116 123 12-10 13 12-8 12-15-2Z" fill="#41534d" stroke="#1a2828" stroke-width="1.2"/>
   ${layer('rose-petal-crown',`<path d="M103 87c-5-20 1-38 19-43 16-4 30 8 29 22-1 13-12 25-21 34Z" fill="#3e5663" stroke="${ink}" stroke-width="1.7"/><path d="M106 81c-2-17 3-30 17-33 13-3 23 6 24 17l-18 23Z" fill="#a6b6be"/><path d="M123 48c-12 8-13 19-8 36l14 4 18-23c-1-11-11-20-24-17Z" fill="url(#${p}-steel)"/><path d="M123 48c-9 8-11 18-8 29m5-27c8-2 17 2 22 9" fill="none" stroke="#e6ede7" stroke-width="1.4"/><path d="m131 53 6 6m-8-6 4 5" class="va-detail-only" stroke="#738c99" stroke-width=".7"/>`)}
   ${layer('rose-petal-back',`<path d="M112 102C84 105 67 89 71 71c3-19 24-26 44-14 11 7 19 18 24 28Z" fill="#334d5b" stroke="${ink}" stroke-width="1.7"/><path d="M111 97C87 99 73 87 75 73c3-15 19-21 36-11l23 22Z" fill="#a2b4bc"/><path d="M75 73c17-7 39-3 59 11l-23 13C87 99 73 87 75 73Z" fill="url(#${p}-steel)"/><path d="M76 72c17-7 36-3 55 9" fill="none" stroke="#edf2e8" stroke-width="1.5"/><path d="M80 62c15-6 32 2 44 12-15-6-29-6-49-1Z" fill="#c4d0d1"/><path d="M80 62c15-6 32 2 44 12" fill="none" stroke="#f0f1e5" stroke-width="1.3"/>`)}
   ${layer('rose-petal-right',`<path d="M137 82c-3-15 9-29 25-27 19 2 29 18 24 35-4 16-18 30-38 35l-23-16Z" fill="#2c4957" stroke="${ink}" stroke-width="1.7"/><path d="M140 81c-1-13 9-24 21-22 16 2 25 15 21 29-4 14-15 26-33 32l-18-12Z" fill="#91aab5"/><path d="M161 59c-2 14-10 27-30 49l18 12c18-6 29-18 33-32 4-14-5-27-21-29Z" fill="url(#${p}-chrome)"/><path d="M161 59c-1 13-9 27-24 43" fill="none" stroke="#edf2e8" stroke-width="1.5"/><path d="M145 65c5-5 10-7 16-6 1 9-2 17-7 25l-14-3c-1-7 0-11 5-16Z" fill="#bccbd0"/><path d="m168 75-8 15m12-13-7 14" class="va-detail-only" stroke="#466979" stroke-width=".7"/>`)}
   ${layer('rose-petal-left',`<path d="M95 89c-12-17-29-16-33-1-7 22 12 47 37 56l27-3 13-27Z" fill="#2c4653" stroke="${ink}" stroke-width="1.8"/><path d="M93 94c-10-14-23-15-27-3-5 18 11 39 33 48l24-2 12-21Z" fill="#a8b9c1"/><path d="M66 91c9 9 20 16 36 19l33 6-12 21-24 2c-22-9-38-30-33-48Z" fill="url(#${p}-steel)"/><path d="M66 91c9 9 20 16 36 19l29 5" fill="none" stroke="#e5eee8" stroke-width="1.6"/><path d="M66 91c2-9 9-11 15-6l12 9-9 12c-8-4-14-9-18-15Z" fill="#c5d0d1"/><path d="m77 112 11 12m-8-14 11 12" class="va-detail-only" stroke="#728e9c" stroke-width=".7"/>`)}
   <g data-part="rose-heart">
    <path d="M111 90c-1-14 7-25 20-26 13-1 26 9 25 21-1 14-18 30-35 32l-15-15Z" fill="#293f4b" stroke="#18323f" stroke-width="1.4"/>
    <path d="M111 90c-1-14 7-25 20-26 13-1 26 9 25 21-8-8-18-10-30-5l-10 15Z" fill="#aabcc5"/>
    <path d="M131 64c-8 5-11 13-10 24l-10 2c-1-14 7-25 20-26Z" fill="url(#${p}-chrome)"/>
    <path d="M132 72c14-3 24 10 18 22-4 9-17 16-27 15l-7-14 9-13 15 2-2 11-10 4-4-4 4-6 7 1" fill="#536f7d" stroke="#1a3542" stroke-width="1.2"/>
    <path d="M132 72c10-2 18 3 19 10-8-5-17-5-26 0l-9 13-5-5c4-9 10-16 21-18Z" fill="#c2cfd1"/>
    <path d="m125 82 15 2-2 11-10 4-4-4 4-6 7 1" fill="none" stroke="#e7eee5" stroke-width="1.3"/>
    <path d="m129 88 6 2-3 5-4-1Z" fill="#16323f"/>
   </g>
   ${layer('rose-petal-front-right',`<path d="M127 114c11-27 35-37 51-26 17 11 8 37-12 53l-27 13-19-17Z" fill="#324d5c" stroke="${ink}" stroke-width="1.8"/><path d="M131 115c10-24 30-33 43-23 14 9 7 30-11 45l-23 12-15-13Z" fill="#849eac"/><path d="M174 92c-8 9-18 16-34 21l-15 23 15 13 23-12c18-15 25-36 11-45Z" fill="url(#${p}-steel)"/><path d="M174 92c-8 9-18 16-34 21" fill="none" stroke="#eff3e8" stroke-width="1.6"/><path d="M174 92c-10-7-21-3-30 7l-4 14c16-5 26-12 34-21Z" fill="#bccad0"/><path d="m162 120-13 16m16-14-13 16" class="va-detail-only" stroke="#506f80" stroke-width=".7"/>`)}
   ${layer('rose-petal-front-left',`<path d="M78 108c20 7 36 12 57 10 14-1 27-7 40-15-2 27-22 51-47 52-25 1-42-16-50-47Z" fill="#304c5b" stroke="${ink}" stroke-width="1.9"/><path d="M83 114c17 6 34 10 52 8 14-1 23-5 35-11-5 23-21 39-43 40-21 0-35-12-44-37Z" fill="url(#${p}-chrome)"/><path d="M83 114c17 6 34 10 52 8 14-1 23-5 35-11l-8 14c-19 12-42 16-64 7Z" fill="#c3ced0"/><path d="M83 114c17 6 34 10 52 8 14-1 23-5 35-11" fill="none" stroke="#f0f3e7" stroke-width="1.8"/><path d="M98 132c22 9 45 5 64-7" fill="none" stroke="#7e98a5" stroke-width="1.1"/>
   `)}
   <path data-part="rose-reflection" d="M78 64c13-3 26 3 36 9m49-10c-2 9-7 16-13 23m-63 32c17 6 34 9 48 6" fill="none" stroke="#fffdf0" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>
  `,
  motion:{"duration":1640,"layers":[{"name":"rose-sleeve","origin":[114,184],"frames":[{"at":0},{"at":0.12,"y":-2,"rotate":-2},{"at":0.36,"y":22,"rotate":6},{"at":0.64,"y":17,"rotate":3},{"at":1,"y":18,"rotate":3}]},{"name":"rose-heart","origin":[128,99],"frames":[{"at":0},{"at":0.18,"rotate":4,"scaleX":0.97},{"at":0.46,"rotate":-12,"scaleX":1.03},{"at":0.78,"rotate":-4},{"at":1,"rotate":-4}]},{"name":"rose-petal-crown","origin":[129,101],"frames":[{"at":0},{"at":0.16,"rotate":-4,"scaleY":0.94},{"at":0.4,"rotate":13},{"at":0.76,"rotate":3},{"at":1,"rotate":3}]},{"name":"rose-petal-back","origin":[126,100],"frames":[{"at":0},{"at":0.2,"rotate":3},{"at":0.47,"rotate":-14},{"at":0.8,"rotate":-4},{"at":1,"rotate":-4}]},{"name":"rose-petal-right","origin":[130,102],"frames":[{"at":0},{"at":0.28,"rotate":-3},{"at":0.54,"rotate":15},{"at":0.83,"rotate":5},{"at":1,"rotate":4}]},{"name":"rose-petal-left","origin":[129,108],"frames":[{"at":0},{"at":0.34,"rotate":3},{"at":0.6,"rotate":-13},{"at":0.86,"rotate":-4},{"at":1,"rotate":-4}]},{"name":"rose-petal-front-right","origin":[128,111],"frames":[{"at":0},{"at":0.4,"rotate":-3,"y":-1},{"at":0.66,"rotate":18,"x":3,"y":6},{"at":0.91,"rotate":7,"x":1,"y":2},{"at":1,"rotate":7,"x":1,"y":2}]},{"name":"rose-petal-front-left","origin":[129,111],"frames":[{"at":0},{"at":0.46,"rotate":3,"y":-1},{"at":0.71,"rotate":-16,"x":-3,"y":7},{"at":0.93,"rotate":-5,"x":-1,"y":2},{"at":1,"rotate":-5,"x":-1,"y":2}]},{"name":"rose-leaf","origin":[136,167],"frames":[{"at":0},{"at":0.48,"rotate":-2},{"at":0.72,"rotate":7},{"at":0.92,"rotate":-1},{"at":1}]},{"name":"rose-reflection","origin":[128,92],"frames":[{"at":0,"opacity":0.45},{"at":0.32,"opacity":0.12},{"at":0.66,"opacity":1},{"at":1,"opacity":0.45}]}]}
 },
 'gift-cassette':{
  name:'Midnight Tape',type:'gift',series:'Afterhours Objects',material:'Smoked transparent polycarbonate, ferric tape and printed paper',
  alt:'A smoke-grey cassette emerging from its dark case, with a cream Side A label, visible tape packs, guide route, screws and two mechanical hubs.',
  mini:`<path d="M2 5h18v15H2Z" fill="#242f36" stroke="#748487" stroke-width=".7"/><rect x="4" y="4" width="18" height="14" rx="1.8" fill="#7e9293" stroke="#182b31" stroke-width=".8"/><path d="M6 6h14v3H6Z" fill="#e6ddc3"/><path d="M6 10h14v5H6Z" fill="#283a3d"/><circle cx="9" cy="12.5" r="2.4" fill="#b9b39c"/><circle cx="17" cy="12.5" r="2.4" fill="#b9b39c"/><path d="m8 16 1-2h7l2 2Z" fill="#45585d"/><circle cx="9" cy="12.5" r=".9" fill="#1c2c32"/><circle cx="17" cy="12.5" r=".9" fill="#1c2c32"/>`,
  silhouette:`<path d="M33 50h171a12 12 0 0 1 12 12v7h5a9 9 0 0 1 9 9v105a10 10 0 0 1-10 10h-4v6a9 9 0 0 1-9 9H33a12 12 0 0 1-12-12V62a12 12 0 0 1 12-12Zm22 80v31h145v-31H55Zm27 3a14 14 0 1 0 0 28 14 14 0 0 0 0-28Zm88 0a14 14 0 1 0 0 28 14 14 0 0 0 0-28Z" fill-rule="evenodd"/>`,
  body:p=>`
   <ellipse cx="132" cy="216" rx="96" ry="8" fill="#050a0d" opacity=".35"/>
   ${layer('tape-case',`<path d="M33 52h172c8 0 12 5 12 12v132c0 8-4 12-12 12H33c-8 0-12-4-12-12V64c0-8 4-12 12-12Z" fill="#202a32" stroke="#09131b" stroke-width="2"/><path d="M33 56h169c7 0 10 4 10 10v126c0 7-4 10-10 10H35c-7 0-9-3-9-10V65c0-6 2-9 7-9Z" fill="#34414b" stroke="#75828a" stroke-width="1.1"/><path d="M32 62h169v131H32Z" fill="#141e27"/><path d="M35 54v147m167-145v143M29 67v118" fill="none" stroke="#79858b" stroke-width=".9"/><path d="M54 58h123" stroke="#b8bdba" stroke-width="1.2" opacity=".7"/><path d="M28 91h5v20h-5Zm0 53h5v22h-5Z" fill="#6d7477"/><path d="m38 197 122-3m-118 5 81-1" class="va-detail-only" stroke="#53636e" stroke-width=".8"/>`)}
   ${layer('tape-case-lid',`<path d="M30 59h173c6 0 9 4 9 10v125c0 6-4 9-10 9H31c-6 0-9-4-9-10V69c0-6 2-10 8-10Z" fill="#66838b" fill-opacity=".09" stroke="#95afae" stroke-width="1.2"/><path d="M30 64h173v130H30Z" fill="none" stroke="#c0cdc0" stroke-width="1" opacity=".65"/><path d="m38 194 143-2m-144-123 30-2" stroke="#d5dfd1" stroke-width="1.3"/><path d="M41 200h18v7H41Zm124 0h18v7h-18Z" fill="#657d84" stroke="#a7b7af" stroke-width="1"/>`)}
   <g data-part="cassette">
    <path d="M47 72h169c7 0 12 4 12 10v103c0 8-5 11-12 11H47c-7 0-11-4-11-11V83c0-7 4-11 11-11Z" fill="#1d2f35" stroke="${ink}" stroke-width="2"/>
    <path d="M46 68h169c7 0 11 4 11 11v103c0 7-4 10-11 10H46c-7 0-11-3-11-10V79c0-7 4-11 11-11Z" fill="#5a7375" stroke="#a5b4b2" stroke-width="1.2"/>
    <path d="M42 78h177v98c0 5-2 8-8 8H50c-5 0-8-3-8-8Z" fill="#2b4549"/>
    <path d="M47 81h167v87H47Z" fill="#23393d"/>
    <g data-part="tape-transport">
     <path d="m72 153-15 19h143l-20-22" fill="none" stroke="#181a19" stroke-width="5.7" stroke-linejoin="round"/>
     <path d="m72 153-15 19h143l-20-22" fill="none" stroke="#695540" stroke-width="2.7" stroke-linejoin="round"/>
     <path d="M56 169v7m146-7v7" stroke="#b0b8ae" stroke-width="3"/>
     <path d="M114 172h35" stroke="#c6c5b2" stroke-width="4"/>
     <path d="M124 173h12" stroke="#252e30" stroke-width="3"/>
    </g>
    <circle cx="82" cy="141" r="23" fill="#1c211f" stroke="#90978a" stroke-width=".9"/>
    <circle cx="169" cy="141" r="23" fill="#1c2929" stroke="#7f9591" stroke-width=".9"/>
    <circle cx="82" cy="141" r="20.5" fill="#655742"/>
    <circle cx="169" cy="141" r="16" fill="#655742"/>
    <g class="va-detail-only" fill="none" stroke="#9e8e6d" stroke-width=".6" opacity=".65"><circle cx="82" cy="141" r="18.5"/><circle cx="82" cy="141" r="16.5"/><circle cx="82" cy="141" r="14.5"/><circle cx="169" cy="141" r="14"/><circle cx="169" cy="141" r="12"/></g>
    ${layer('tape-reel-left',`<circle cx="82" cy="141" r="11.8" fill="url(#${p}-ivory)" stroke="#121f23" stroke-width="1.3"/><path d="m82 130 2 6 6-1-3 5 4 5-7-1-2 7-2-7-7 1 4-5-3-5 6 1Z" fill="#859287"/><circle cx="82" cy="141" r="4.5" fill="#24383b" stroke="#c9cbb9" stroke-width="1.1"/><path d="m80 132 1 4m8 7-4-1m-7 6 2-3" stroke="#ebe5d1" stroke-width="1.2"/>`)}
    ${layer('tape-reel-right',`<circle cx="169" cy="141" r="11.8" fill="url(#${p}-ivory)" stroke="#121f23" stroke-width="1.3"/><path d="m169 130 2 6 6-1-3 5 4 5-7-1-2 7-2-7-7 1 4-5-3-5 6 1Z" fill="#859287"/><circle cx="169" cy="141" r="4.5" fill="#24383b" stroke="#c9cbb9" stroke-width="1.1"/><path d="m167 132 1 4m8 7-4-1m-7 6 2-3" stroke="#ebe5d1" stroke-width="1.2"/>`)}
    <path d="M47 82h167v80H47Z" fill="#8aafaa" opacity=".12"/>
    <path d="m53 125 11-9h133l10 9v33H53Z" fill="none" stroke="#adc0b6" stroke-width="1.3"/>
    <path d="M54 158h151M54 121l11-4m139 4h-18" stroke="#dae0ce" stroke-width="1" opacity=".7"/>
    <path d="M48 78h162l6 9v25H48Z" fill="url(#${p}-paper)" stroke="#283b3b" stroke-width="1.2"/>
    <path d="m210 78-7 7 9 4 4-2Z" fill="#9e9988"/><path d="m210 78-2 7 8 2" fill="none" stroke="#f0e5c6" stroke-width=".8"/>
    <path d="M54 105h153" stroke="#7e4649" stroke-width="2.4"/>
    <text x="57" y="93" font-family="sans-serif" font-size="9.5" font-weight="700" letter-spacing="1.25" fill="#2a3436">AFTERHOURS</text>
    <text x="58" y="101" font-family="monospace" font-size="5.3" letter-spacing=".7" fill="#625b50">MIDNIGHT MIX</text>
    <text x="194" y="98" font-family="sans-serif" font-size="16" font-weight="700" fill="#7e4146">A</text>
    <path d="M89 163h78l12 23H76Z" fill="#425e62" stroke="#142d36" stroke-width="1.3"/>
    <path d="m92 166-9 15h89l-8-15" fill="none" stroke="#9cb0aa" stroke-width="1.1"/>
    <path d="M104 179h45" stroke="#16282c" stroke-width="4"/>
    <path d="M48 73h147m-151 8v88m178-84v82" fill="none" stroke="#c0cebf" stroke-width="1.3" opacity=".8"/>
    <path d="m46 190 167-1 10-6v6l-8 7H46Z" fill="#32464d"/>
    <path d="M48 187h163" stroke="#8d9b98" stroke-width=".8"/>
    ${screw(44,78)}${screw(216,78)}${screw(44,181)}${screw(216,181)}
    <g class="va-detail-only" stroke="#96a9a4" stroke-width=".75"><path d="m49 115 7-1m-8 55 9-1m147 10 8-2m-163-39 4-2m152 40 4-1"/><path d="m51 174 2-1m150-95 3 2" stroke="#2e4144"/></g>
    <path data-part="tape-reflection" d="m59 127 22-7m63 38 37-24m-35-15 8-3" fill="none" stroke="#dbe7dc" stroke-width="1.3" stroke-linecap="round" opacity=".48"/>
   </g>
  `,
  motion:{"duration":1660,"layers":[{"name":"tape-case-lid","origin":[119,202],"frames":[{"at":0},{"at":0.13,"rotate":2,"y":-1},{"at":0.4,"rotate":-6,"scaleY":0.38,"y":9},{"at":0.73,"rotate":-4,"scaleY":0.43,"y":7},{"at":1,"rotate":-4,"scaleY":0.43,"y":7}]},{"name":"tape-case","origin":[119,132],"frames":[{"at":0},{"at":0.17,"x":-2,"y":1},{"at":0.44,"x":-8,"y":9},{"at":0.75,"x":-6,"y":7},{"at":1,"x":-6,"y":7}]},{"name":"cassette","origin":[130,131],"frames":[{"at":0},{"at":0.18,"y":3},{"at":0.45,"x":5,"y":-23,"rotate":2},{"at":0.64,"x":2,"y":-10,"rotate":-1},{"at":0.82,"x":1,"y":-13},{"at":1,"x":1,"y":-12}]},{"name":"tape-reel-left","origin":[82,141],"frames":[{"at":0},{"at":0.43},{"at":0.78,"rotate":-148},{"at":1,"rotate":-164}]},{"name":"tape-reel-right","origin":[169,141],"frames":[{"at":0},{"at":0.43},{"at":0.78,"rotate":-194},{"at":1,"rotate":-216}]},{"name":"tape-reflection","origin":[128,139],"frames":[{"at":0,"opacity":0.48},{"at":0.26,"opacity":0.1},{"at":0.61,"opacity":0.92},{"at":1,"opacity":0.48}]}]}
 },
 'gift-star':{
  name:'Pocket Star',type:'gift',series:'Afterhours Objects',material:'Faceted lilac crystal and a fitted charcoal sleeve',
  alt:'An asymmetric five-point lilac crystal with deep cut faces, rising above a fitted dark presentation sleeve.',
  mini:`<path d="m4 14 8-3 8 3-2 8H6Z" fill="#26323c" stroke="#6b7882" stroke-width=".8"/><path d="m12 1 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#ac9abb" stroke="#394251" stroke-width=".7"/><path d="m12 1 1 9 9-2-8 5 4 7-6-7-6 7 4-9-8-3 9 1Z" fill="#e0d8df"/><path d="m12 9 2 3-3 3-1-4Z" fill="#5c4a70"/>`,
  silhouette:'<path d="m128 24 25 50 57 9-41 41 9 57-50-27-50 27 9-57-41-41 57-9Zm-67 161 67-22 67 22-12 43H73Z"/>',
  body:p=>`
   <ellipse cx="129" cy="233" rx="61" ry="4" fill="#050a0e" opacity=".17"/>
   <path d="m61 180 67-23 68 23-12 45-55 12-56-12Z" fill="#18242e" stroke="${ink}" stroke-width="2"/>
   <path d="m70 184 58-20 59 20-8 32-50 12-51-12Z" fill="#34414d" stroke="#6e7880" stroke-width="1.2"/>
   <path d="m78 184 50-14 49 14-11 18-38 12-39-12Z" fill="#101a25"/>
   ${layer('star-sleeve-front',`<path d="m61 180 68 21 67-21-12 45-55 12-56-12Z" fill="url(#${p}-ink)" stroke="#4f626e" stroke-width="1.4"/><path d="m73 190 56 17 55-17-6 26-49 13-49-13Z" fill="#2e3b48"/><path d="m77 217 50 12 51-13m-49-9v22" fill="none" stroke="#80909a" stroke-width="1.1"/><path d="m118 220 11 3 12-3" fill="none" stroke="#a6a5b3" stroke-width="1.2"/>`)}
   ${layer('star-sleeve-left-flap',`<path d="m70 184 57 17-24 4-41-12Z" fill="#425260" stroke="#91a0a7" stroke-width="1.1"/><path d="m70 184 33 17 18 1-19-4Z" fill="#7a8b96"/><path d="m67 190 34 12" stroke="#aeb8b8" stroke-width="1"/>`)}
   ${layer('star-sleeve-right-flap',`<path d="m129 201 58-17 14 10-48 12Z" fill="#304452" stroke="#829aa4" stroke-width="1.1"/><path d="m134 201 20-1 33-16-17 13Z" fill="#778c98"/>`)}
   ${layer('star-crystal',`<path d="m129 31 25 49 55 8-39 40 9 56-50-26-51 25 10-55-40-40 56-8Z" fill="#4b405c" stroke="#111b29" stroke-width="3" stroke-linejoin="round"/><path d="m126 24 25 50 56 8-41 41 10 56-50-27-50 27 10-56-41-41 56-8Z" fill="#a58eb8" stroke="#d1c9d4" stroke-width="1.4" stroke-linejoin="round"/><path d="m126 24 4 75 21-25Z" fill="#ded2e5"/><path d="m151 74 56 8-77 17Z" fill="#9e86af"/><path d="m207 82-41 41-36-24Z" fill="#6f547d"/><path d="m166 123 10 56-46-80Z" fill="url(#${p}-violet-glass)"/><path d="m176 179-50-27 4-53Z" fill="#89719b"/><path d="m126 152-50 27 54-80Z" fill="#c4b1d1"/><path d="m76 179 10-56 44-24Z" fill="#78618c"/><path d="m86 123-41-41 89 17Z" fill="#b59cc6"/><path d="m45 82 56-8 29 25Z" fill="#dfd6e3"/><path d="m101 74 25-50 4 75Z" fill="#80698e"/><path data-part="star-front-facet" d="m130 99 10 20-13 17-12-18Z" fill="#e1d5e7" stroke="#74627e" stroke-width="1.2"/><path d="m126 24 4 75 77-17m-77 17 46 80m-46-80-54 80m54-80L45 82" fill="none" stroke="#ede3ec" stroke-width="1.1" opacity=".8"/><path data-part="star-reflection" d="m116 55 6-17m17 70 20 40" stroke="#fff4ef" stroke-width="2.5" opacity=".55"/>`)}
  `,
  motion:{"duration":1660,"layers":[{"name":"star-sleeve-front","origin":[129,201],"frames":[{"at":0},{"at":0.12,"rotate":-2,"y":-2},{"at":0.4,"rotate":14,"y":10,"scaleY":0.83},{"at":0.73,"rotate":11,"y":7,"scaleY":0.9},{"at":1,"rotate":11,"y":7,"scaleY":0.9}]},{"name":"star-sleeve-left-flap","origin":[73,187],"frames":[{"at":0},{"at":0.12,"rotate":3},{"at":0.38,"rotate":-32,"y":3},{"at":0.72,"rotate":-24,"y":2},{"at":1,"rotate":-25,"y":2}]},{"name":"star-sleeve-right-flap","origin":[185,188],"frames":[{"at":0},{"at":0.16,"rotate":-3},{"at":0.44,"rotate":30,"y":4},{"at":0.76,"rotate":24,"y":2},{"at":1,"rotate":24,"y":2}]},{"name":"star-crystal","origin":[129,123],"frames":[{"at":0},{"at":0.2,"y":3,"rotate":2},{"at":0.48,"y":-20,"rotate":-12},{"at":0.7,"y":-10,"rotate":6},{"at":0.88,"y":-8,"rotate":-3},{"at":1,"y":-8,"rotate":-2}]},{"name":"star-front-facet","origin":[128,118],"frames":[{"at":0},{"at":0.22,"scaleX":0.7,"rotate":-5},{"at":0.54,"scaleX":1.18,"rotate":8},{"at":0.79,"scaleX":0.95,"rotate":-2},{"at":1}]},{"name":"star-reflection","origin":[129,99],"frames":[{"at":0,"opacity":0.55},{"at":0.28,"opacity":0.12},{"at":0.59,"opacity":1},{"at":1,"opacity":0.55}]}]}
 },
 'gift-cup':{
  name:'Afterhours Cup',type:'gift',series:'Afterhours Objects',material:'Dark glazed ceramic, ivory slip and warm coffee',
  alt:'A deep midnight ceramic cup on its own saucer, with an asymmetric handle, an ivory rim, coffee and two separate steam curls.',
  mini:`<ellipse cx="11" cy="20" rx="10" ry="2" fill="#79898b"/><path d="M3 7h14v9c0 6-14 6-14 0Z" fill="#334954" stroke="#0e202a" stroke-width=".9"/><path d="M17 9h2c5 0 4 7-2 7" fill="none" stroke="#8b9e9e" stroke-width="2"/><ellipse cx="10" cy="7" rx="7" ry="2" fill="#e1dbc9"/><ellipse cx="10" cy="7" rx="5" ry="1.2" fill="#704f38"/><path d="M8 4C5 2 9 2 7 0m6 4c3-2-2-2 0-4" fill="none" stroke="#b7c3bd" stroke-width=".9"/>`,
  silhouette:'<path d="M77 43c-8-11 5-15 0-25 17 13-5 16 0 25Zm34-1c11-12-7-18 3-30 5 13 12 19-3 30ZM57 77c0-25 113-25 113 0v10h16c38-1 35 63-16 63-2 26-31 42-58 42-29 0-55-16-55-45Zm113 27v29c28 0 29-31 14-31Zm-58 92c104 0 104 43 0 43s-104-43 0-43Z"/>',
  body:p=>`
   <ellipse cx="128" cy="225" rx="83" ry="6" fill="#040a0d" opacity=".15"/>
   <ellipse cx="126" cy="204" rx="82" ry="24" fill="#344852" stroke="#152630" stroke-width="2"/><ellipse cx="126" cy="199" rx="82" ry="23" fill="url(#${p}-steel-dark)" stroke="#93a2a3" stroke-width="1.2"/><ellipse cx="126" cy="199" rx="64" ry="15" fill="#30454d" stroke="#71858a" stroke-width="1"/><ellipse cx="124" cy="197" rx="38" ry="8" fill="#192b34"/><path d="M53 204c24 15 112 25 145-2" fill="none" stroke="#acb8b1" stroke-width="1.3" opacity=".65"/>
   <path d="M169 96h17c36 0 27 65-15 60l-1-17c25 4 31-28 14-29h-14Z" fill="#223b47" stroke="#0c232e" stroke-width="3"/><path d="M175 100h12c27 0 18 49-12 49" fill="none" stroke="#8b9fa4" stroke-width="4"/><path d="M184 111c18 0 11 30-8 28" fill="none" stroke="#162d38" stroke-width="3"/>
   <path d="M61 87h111v61c-1 57-106 58-111 0Z" fill="#152a35" stroke="#0d212b" stroke-width="3"/><path d="M66 94h100v53c-1 48-92 48-100 0Z" fill="#2c4855"/><path d="M75 96c-8 48 6 70 31 79l-8-82Z" fill="#64808a"/><path d="M140 94h27v54c-1 25-29 39-51 40 30-14 34-33 24-94Z" fill="#1c3542"/><path d="M80 104c-3 31 1 50 13 60" fill="none" stroke="#a6bab9" stroke-width="2.7" opacity=".75"/><path class="va-detail-only" d="m73 133 2 9m82-7-1 12m-72 26 5 3m50-3 4-2" stroke="#778f92" stroke-width="1"/>
   <ellipse cx="116" cy="86" rx="56" ry="18" fill="#c8c9b8" stroke="#172f3a" stroke-width="2"/><ellipse cx="116" cy="83" rx="55" ry="17" fill="url(#${p}-ivory)"/><ellipse cx="116" cy="83" rx="45" ry="11.5" fill="#543d2f" stroke="#a58c67" stroke-width="1"/>
   ${layer('cup-coffee',`<ellipse cx="116" cy="84" rx="44" ry="10" fill="#6c4e36"/><path d="M79 82c18-9 57-8 73 0-11-4-51-4-73 0Z" fill="#b09568"/><path d="M89 88c16 5 34 5 48 0" fill="none" stroke="#352c25" stroke-width="1.3"/><ellipse cx="97" cy="81" rx="8" ry="1.8" fill="#cfbb91" opacity=".7"/>`)}
   <path d="M66 85c17 16 80 23 101 0" fill="none" stroke="#eee7d2" stroke-width="1.6"/>
   <path data-part="cup-steam-left" d="M105 63c-15-12 14-19 0-34-8-8-1-14 3-18" fill="none" stroke="#b0c0bc" stroke-width="3.3" stroke-linecap="round" opacity=".46"/>
   <path data-part="cup-steam-right" d="M132 63c17-10-13-20-2-33 4-5 6-9 1-15" fill="none" stroke="#d0d7c8" stroke-width="2.3" stroke-linecap="round" opacity=".4"/>
  `,
  motion:{duration:1480,layers:[{name:'cup-coffee',origin:[116,84],frames:[{at:0},{at:.2,scaleY:.7,rotate:1},{at:.45,scaleY:1.12,rotate:-1},{at:.75,scaleY:.96},{at:1}]},{name:'cup-steam-left',origin:[106,61],frames:[{at:0,opacity:.46},{at:.28,y:-5,opacity:.6},{at:.65,y:-11,opacity:.18},{at:1,y:-15,opacity:0}]},{name:'cup-steam-right',origin:[132,61],frames:[{at:0,opacity:.4},{at:.37,y:-2,opacity:.6},{at:.76,y:-8,opacity:.18},{at:1,y:-12,opacity:0}]}]}
 },
 'gift-ghost':{
  name:'Paper Ghost',type:'gift',series:'Afterhours Objects',material:'Pearlescent folded paper with ink expression',
  alt:'An awkward paper apparition built from overlapping pearl folds, with a bent corner, uneven eyes and visible paper thickness.',
  mini:`<path d="m11 2 7 3 3 15-5-2-4 4-4-4-5 2L5 6Z" fill="#a2b4b2" stroke="#243e47" stroke-width=".9"/><path d="m11 2 2 10-1 10-4-4-5 2L5 6Z" fill="#e7e5d7"/><path d="m13 5 5 1 1 7-6-1Z" fill="#c7d5d0"/><path d="m5 6 4 3-3 6m12-9-5 6 7 8" fill="none" stroke="#829993" stroke-width=".7"/><ellipse cx="9" cy="11" rx="1" ry="1.6" fill="#1e3339"/><ellipse cx="15" cy="11" rx="1.2" ry="1.4" fill="#1e3339"/><path d="m11 16 3-1" stroke="#516a6d" stroke-width=".8"/>`,
  silhouette:'<path d="m126 25 55 25 20 137-36-14-31 37-35-35-40 15L77 59Z"/>',
  body:p=>`
   <ellipse cx="131" cy="224" rx="57" ry="4" fill="#030a0e" opacity=".16"/>
   <g data-part="ghost-underfold"><path d="m126 31 57 26 22 139-38-14-31 37-36-35-41 15 18-135Z" fill="#7b9390" stroke="#203c45" stroke-width="2"/>
   <path d="m126 25 54 25 20 137-36-14-31 37-35-35-40 15L76 59Z" fill="#d6ded4" stroke="#7f9a9c" stroke-width="1.3"/>
   </g>
   ${layer('ghost-paper-left',`<path d="m76 59 50-34-9 92-19 58-40 15Z" fill="#ece9d9"/><path d="m76 59 35 35-34 45-19 51Z" fill="#b8cbc4"/><path d="m76 59 35 35 15-69Z" fill="#f0edde"/><path d="m76 59 35 35-34 45" fill="none" stroke="#7e9c9b" stroke-width="1.3"/><path d="m65 163 13-20m-5 25 14-24" class="va-detail-only" stroke="#9fb6aa" stroke-width=".7"/><path d="m86 67 10-8" stroke="#fff5df" stroke-width="1.8" opacity=".8"/>`)}
   ${layer('ghost-paper-right',`<path d="m126 25 54 25 20 137-36-14-31 37-16-93Z" fill="#c4d4cd"/><path d="m126 25 8 89 46-64Z" fill="#e4e6d8"/><path d="m134 114 30 59 36 14Z" fill="#9db7b2"/><path d="m164 173-31 37 1-96Z" fill="#dce2d4"/><path d="m126 25 8 89 46-64m-46 64 30 59" fill="none" stroke="#7e9c9b" stroke-width="1.2"/><path d="m168 54 12-4 2 19-14-7Z" fill="#abbfb9"/><path d="m168 54 1 8 13 7" fill="none" stroke="#f1eedb" stroke-width="1.3"/><path d="m147 41 15 8m-25 127-2 13" stroke="#fff5df" stroke-width="1.8" opacity=".8"/>`)}
   ${layer('ghost-expression',`<ellipse cx="107" cy="110" rx="7" ry="11" fill="#223a40"/><ellipse cx="150" cy="110" rx="8" ry="9" fill="#223a40"/><circle cx="109" cy="107" r="2" fill="#d3ddd3"/><circle cx="152" cy="108" r="2" fill="#d3ddd3"/><path d="m121 143 17-5" stroke="#5b7777" stroke-width="2.8" stroke-linecap="round"/><path d="m101 93 12-3m31 1 12 3" fill="none" stroke="#718d88" stroke-width="1.4"/>`)}
  `,
  motion:{"duration":1560,"layers":[{"name":"ghost-underfold","origin":[128,120],"frames":[{"at":0,"opacity":1},{"at":0.16,"opacity":0},{"at":0.42,"opacity":0},{"at":0.64,"opacity":1},{"at":1,"opacity":1}]},{"name":"ghost-paper-left","origin":[117,117],"frames":[{"at":0},{"at":0.17,"rotate":11,"scaleX":0.38},{"at":0.32,"rotate":12,"scaleX":0.38},{"at":0.57,"rotate":-12,"scaleX":1.04},{"at":0.81,"rotate":3},{"at":1}]},{"name":"ghost-paper-right","origin":[134,114],"frames":[{"at":0},{"at":0.22,"rotate":-12,"scaleX":0.34},{"at":0.37,"rotate":-13,"scaleX":0.34},{"at":0.63,"rotate":12,"scaleX":1.03},{"at":0.86,"rotate":-2},{"at":1}]},{"name":"ghost-expression","origin":[129,112],"frames":[{"at":0,"opacity":1},{"at":0.14,"opacity":0,"scaleY":0.35},{"at":0.45,"opacity":0,"scaleY":0.35},{"at":0.58,"opacity":1,"scaleY":1.04,"y":-3},{"at":0.73,"opacity":1,"scaleY":0.4},{"at":0.86,"opacity":1,"scaleY":1,"y":-1},{"at":1,"opacity":1}]}]}
 },
 'gift-parcel':{
  name:'Small Surprise',type:'gift',series:'Afterhours Objects',material:'Midnight cloth, foil ribbon and thick presentation board',
  alt:'A midnight-blue gift box with physically overlapping lid, folded cloth ribbon, a worn cream tag and thick corner edges.',
  mini:`<path d="m3 9 9-4 9 4v11l-9 3-9-3Z" fill="#405568" stroke="#112733" stroke-width=".8"/><path d="m12 12 9-3v11l-9 3Z" fill="#233b4e"/><path d="m2 7 10-4 10 4v4l-10 4L2 11Z" fill="#7d91a0" stroke="#253e4a" stroke-width=".8"/><path d="m8 5 8 7v10l-3 1V13L5 7Z" fill="#c0cbc5"/><path d="M12 4C4 3 6-1 10 1l2 3c5-6 10-1 0 0Z" fill="#c4cfc6" stroke="#435e67" stroke-width=".6"/>`,
  silhouette:'<path d="M124 57c-43-35-61-4-16 8-42-3-38-34-9-30l25 17c23-31 61-19 37 0l-25 13 75 30v19l-7 5v84l-75 31-75-31v-84l-8-5V95l62-24Z"/>',
  body:p=>`
   <ellipse cx="131" cy="235" rx="68" ry="4" fill="#03090e" opacity=".17"/>
   <path d="m55 110 74-29 75 29v91l-75 31-74-31Z" fill="#172d3f" stroke="#0c1d29" stroke-width="3"/>
   <path d="m55 110 74 30v92l-74-31Z" fill="#3c5367"/><path d="m129 140 75-30v91l-75 31Z" fill="#223b51"/>
   <path d="m61 121 61 25v76l-61-25Z" fill="#455e70"/><path d="m136 146 61-25v75l-61 26Z" fill="#1b3347"/>
   <path d="m63 201 60 24m13 0 60-24m-66-55v83" fill="none" stroke="#83979c" stroke-width="1.2"/>
   <path data-part="parcel-front-band" d="m91 126 19 8v91l-19-8Z" fill="#a4b6bd"/><path d="m110 134 6 2v87l-6 2Z" fill="#708994"/><path d="m166 126 18-7v87l-18 7Z" fill="#8ba2ad"/>
   <g data-part="parcel-top">
   ${layer('parcel-lid',`<path d="m46 95 83-33 83 33v20l-83 34-83-34Z" fill="#1b3448" stroke="#0e2230" stroke-width="2"/><path d="m46 95 83-33 83 33-83 34Z" fill="#536b7b" stroke="#90a1a4" stroke-width="1.3"/><path d="m46 95 83 34v20l-83-34Z" fill="#79909b"/><path d="m129 129 83-34v20l-83 34Z" fill="#344e63"/><path d="m54 96 75-29 74 29-74 29Z" fill="#3e5b6e"/><path d="m87 80 21-8 77 34-20 8Z" fill="#c2cdc6"/><path d="m74 105 19 8 80-33-21-8Z" fill="#b1c1bc"/><path d="m108 72 77 34v13l-20 9v-14Z" fill="#899fa7"/><path d="m75 107 18 7v19l-18-7Z" fill="#b9c9c2"/><path d="m49 109 78 32m5 0 76-31" stroke="#a8b7b3" stroke-width="1"/>`)}
   ${layer('parcel-bow-left',`<path d="M129 75C90 74 72 55 82 43c10-11 31 1 47 32Z" fill="#536e7b" stroke="#263e4b" stroke-width="1.5"/><path d="M123 70C96 68 84 56 88 50c5-7 20 1 35 20Z" fill="#c7d2c9"/><path d="m91 50 31 20-23-10Z" fill="#8fa6ac"/><path d="m84 43 13 3" stroke="#e6eadc" stroke-width="1.2"/>`)}
   ${layer('parcel-bow-right',`<path d="M127 74c10-36 42-49 47-32 5 16-17 29-47 32Z" fill="#8fa5ae" stroke="#294653" stroke-width="1.5"/><path d="M134 68c11-23 29-28 32-23 3 8-11 18-32 23Z" fill="#d4dbcf"/><path d="m137 67 27-21-14 16Z" fill="#a5b9bc"/>`)}
   <path d="m121 68 12-4 9 10-13 8-12-7Z" fill="url(#${p}-steel)" stroke="#3a5965" stroke-width="1.2"/>
   </g>
   <path d="m174 120 8 2-8 30" fill="none" stroke="#a99976" stroke-width="1.2"/><path d="m168 148 17 3-7 30-19-5Z" fill="#d6c9a9" stroke="#7a806d" stroke-width="1"/><circle cx="175" cy="155" r="2" fill="#4c5e5f"/><path d="m166 165 11 3m-12 2 8 3" stroke="#917a62" stroke-width="1"/>
  `,
  motion:{"duration":1680,"layers":[{"name":"parcel-bow-left","origin":[129,75],"frames":[{"at":0},{"at":0.12,"rotate":7,"scaleX":0.96},{"at":0.34,"rotate":-34,"scaleX":1.08},{"at":0.61,"rotate":-25},{"at":1,"rotate":-27}]},{"name":"parcel-bow-right","origin":[129,75],"frames":[{"at":0},{"at":0.17,"rotate":-6,"scaleX":0.96},{"at":0.4,"rotate":31,"scaleX":1.08},{"at":0.66,"rotate":23},{"at":1,"rotate":25}]},{"name":"parcel-front-band","origin":[109,134],"frames":[{"at":0},{"at":0.2,"y":-1},{"at":0.45,"x":-5,"y":11,"rotate":-8},{"at":0.73,"x":-3,"y":8,"rotate":-5},{"at":1,"x":-3,"y":8,"rotate":-5}]},{"name":"parcel-top","origin":[129,69],"frames":[{"at":0},{"at":0.3,"y":2,"rotate":1},{"at":0.57,"rotate":-9,"y":-14,"scaleY":0.63},{"at":0.8,"rotate":-5,"y":-10,"scaleY":0.7},{"at":1,"rotate":-5,"y":-10,"scaleY":0.7}]}]}
 },
 'gift-seraph':{
  name:'Chrome Seraph',type:'gift',series:'Afterhours Objects',material:'Articulated silver plates, dark steel and an ice-blue core',
  alt:'A small mechanical seraph with six jointed silver wing plates, a dark tapered body, icy core and interrupted halo.',
  mini:`<path d="m10 9-7-5-2 1 2 6 6 2-5-1 4 5 3-1 1 6 2-6 3 1 4-5-5 1 6-2 2-6-2-1-7 5Z" fill="#a8b9bf" stroke="#213946" stroke-width=".6"/><path d="m12 8 3 5-3 5-3-5Z" fill="#36515e"/><path d="m12 10 2 3-2 3-2-3Z" fill="#b8dce1"/><path d="M8 3c1-2 5-2 7 0" fill="none" stroke="#d5d7c8" stroke-width="1.2"/>`,
  silhouette:'<path d="m119 67-58-35-26 5 9 64 55 24-43-9 36 53 25-14 11 62 11-62 25 14 36-53-43 9 55-24 9-64-26-5-58 35-9 24Zm-21-35c15-15 45-14 60 0l-4 8c-13-9-33-10-49 0Z"/>',
  body:p=>`
   <ellipse cx="128" cy="232" rx="44" ry="4" fill="#03090e" opacity=".15"/>
   <path d="M97 33c16-16 47-17 64 0l-5 10c-13-11-37-12-53 0Z" fill="#7f8f92" stroke="#bfcac5" stroke-width="1.2"/><path d="M109 29c12-6 29-6 40 0m-42 12 6-3m35-1 7 5" stroke="#e8e5d5" stroke-width="1.3"/>
   <path d="m119 77 9-8 10 8 10 63-12 38-8 39-8-39-12-38Z" fill="#172c3a" stroke="#0a1d2c" stroke-width="2.5"/>
   ${layer('seraph-left-upper',`<path d="M119 91 59 38l-27-6 11 48 61 39Z" fill="#233e4b" stroke="#102a37" stroke-width="2"/><path d="M115 87 60 34l-25-2 11 40 56 37Z" fill="url(#${p}-chrome)" stroke="#c0cccb" stroke-width="1.3"/><path d="m38 35 22 4 42 64-55-34Z" fill="#7f9aa5"/><path d="m60 39 42 64m-54-56 11 4m-7 9 14 7" fill="none" stroke="#edf0e5" stroke-width="1.2"/><circle cx="111" cy="96" r="5" fill="#778e98" stroke="#dce2d5" stroke-width="1.2"/><circle cx="111" cy="96" r="1.6" fill="#17313f"/>`)}
   ${layer('seraph-left-middle',`<path d="m111 116-72-39 8 31 57 29Z" fill="#1f3a48" stroke="#0f2937" stroke-width="1.8"/><path d="m107 112-65-38 9 29 53 27Z" fill="url(#${p}-steel)" stroke="#c6d0cc" stroke-width="1.2"/><path d="m45 81 58 42-49-22Z" fill="#91a6ad"/><path d="m55 87 18 10m-10-4 24 15" stroke="#e6e9dc" stroke-width="1.1"/>`)}
   ${layer('seraph-left-lower',`<path d="m108 136-52-17 36 51 24-13Z" fill="#1d3745" stroke="#102a37" stroke-width="2"/><path d="m106 132-47-17 35 48 19-10Z" fill="url(#${p}-steel)" stroke="#bac8c7" stroke-width="1.2"/><path d="m65 121 29 42 5-22Z" fill="#7b969f"/><path d="m72 128 19 12m-13-7 20 13" stroke="#e4e9dc" stroke-width="1.1"/>`)}
   ${layer('seraph-right-upper',`<path d="m137 91 60-53 27-6-11 48-61 39Z" fill="#233e4b" stroke="#102a37" stroke-width="2"/><path d="m141 87 55-53 25-2-11 40-56 37Z" fill="url(#${p}-chrome)" stroke="#c0cccb" stroke-width="1.3"/><path d="m218 35-22 4-42 64 55-34Z" fill="#7f9aa5"/><path d="m196 39-42 64m54-56-11 4m7 9-14 7" fill="none" stroke="#edf0e5" stroke-width="1.2"/><circle cx="145" cy="96" r="5" fill="#778e98" stroke="#dce2d5" stroke-width="1.2"/><circle cx="145" cy="96" r="1.6" fill="#17313f"/>`)}
   ${layer('seraph-right-middle',`<path d="m145 116 72-39-8 31-57 29Z" fill="#1f3a48" stroke="#0f2937" stroke-width="1.8"/><path d="m149 112 65-38-9 29-53 27Z" fill="url(#${p}-steel)" stroke="#c6d0cc" stroke-width="1.2"/><path d="m211 81-58 42 49-22Z" fill="#91a6ad"/><path d="m201 87-18 10m10-4-24 15" stroke="#e6e9dc" stroke-width="1.1"/>`)}
   ${layer('seraph-right-lower',`<path d="m148 136 52-17-36 51-24-13Z" fill="#1d3745" stroke="#102a37" stroke-width="2"/><path d="m150 132 47-17-35 48-19-10Z" fill="url(#${p}-steel)" stroke="#bac8c7" stroke-width="1.2"/><path d="m191 121-29 42-5-22Z" fill="#7b969f"/><path d="m184 128-19 12m13-7-20 13" stroke="#e4e9dc" stroke-width="1.1"/>`)}
   <path d="m128 88 15 32-15 48-15-48Z" fill="url(#${p}-steel-dark)" stroke="#a6bfc5" stroke-width="1.5"/><path d="m128 99 9 22-9 29-9-29Z" fill="#accfd4" stroke="#244d63" stroke-width="1"/><path d="m128 99 1 24 8-2-9 29-1-27-8-2Z" fill="#d8e9df"/>
   <path data-part="seraph-core-glint" d="m127 108-4 12 5 14" fill="none" stroke="#fff9dc" stroke-width="2" opacity=".55"/>
  `,
  motion:{"duration":1620,"layers":[{"name":"seraph-left-upper","origin":[111,96],"frames":[{"at":0},{"at":0.13,"rotate":7},{"at":0.42,"rotate":-22},{"at":0.78,"rotate":-5},{"at":1,"rotate":-6}]},{"name":"seraph-left-middle","origin":[109,117],"frames":[{"at":0},{"at":0.2,"rotate":7},{"at":0.49,"rotate":-19},{"at":0.8150000000000001,"rotate":-5},{"at":1,"rotate":-6}]},{"name":"seraph-left-lower","origin":[111,140],"frames":[{"at":0},{"at":0.27,"rotate":7},{"at":0.56,"rotate":-16},{"at":0.8500000000000001,"rotate":-5},{"at":1,"rotate":-6}]},{"name":"seraph-right-upper","origin":[145,96],"frames":[{"at":0},{"at":0.13,"rotate":-7},{"at":0.42,"rotate":22},{"at":0.78,"rotate":5},{"at":1,"rotate":6}]},{"name":"seraph-right-middle","origin":[147,117],"frames":[{"at":0},{"at":0.2,"rotate":-7},{"at":0.49,"rotate":19},{"at":0.8150000000000001,"rotate":5},{"at":1,"rotate":6}]},{"name":"seraph-right-lower","origin":[145,140],"frames":[{"at":0},{"at":0.27,"rotate":-7},{"at":0.56,"rotate":16},{"at":0.8500000000000001,"rotate":5},{"at":1,"rotate":6}]},{"name":"seraph-core-glint","origin":[128,121],"frames":[{"at":0,"opacity":0.55},{"at":0.4,"opacity":0.15},{"at":0.69,"opacity":1},{"at":1,"opacity":0.55}]}]}
 },
 'gift-key':{
  name:'Obsidian Key',type:'gift',series:'Afterhours Objects',material:'Thick smoky glass, cut edges and one warm brass tooth',
  alt:'A diagonally suspended smoked-glass key with a hollow optical bow, cut internal bevels, a single brass tooth and a steel display clasp.',
  mini:`<path d="M9 2a6 6 0 1 0 0 12l7 8 3-2-3-3 2-2-3-3-2 1-1-2A6 6 0 0 0 9 2Z" fill="#263b43" stroke="#9fb6b1" stroke-width=".8"/><circle cx="8" cy="7" r="2.8" fill="#17242c" stroke="#83a9a1" stroke-width=".7"/><path d="m16 17 3 3 2-2-3-3Z" fill="#d2b575"/><path d="M4 5c2-3 5-3 7 0" fill="none" stroke="#c6d9ce" stroke-width=".8"/>`,
  silhouette:'<path d="M84 27c-44 0-64 53-34 82 11 11 24 14 38 10l69 84 19-16-13-15 14-12-23-26-15 12-30-36c40-24 18-83-25-83Zm-1 20a24 24 0 1 1 0 48 24 24 0 0 1 0-48Zm75 163h37v22h-50v-16h13Z" fill-rule="evenodd"/>',
  body:p=>`
   <ellipse cx="140" cy="236" rx="55" ry="4" fill="#02080c" opacity=".16"/>
   <path d="m151 212 31-2 19 10v14h-61v-14Z" fill="#293b47" stroke="#0a1e2b" stroke-width="2"/><path d="m151 211 31-2 19 10-32 6-29-6Z" fill="url(#${p}-steel)" stroke="#849b9f" stroke-width="1"/><path d="m160 214 12-1 7 5-12 3-8-4Z" fill="#0b202a"/><path d="m140 219 29 6v9h-29Z" fill="#435c69"/>
   ${layer('key-glass',`<path d="M89 34c-40-5-65 43-38 75 10 12 24 16 39 12l67 81 20-17-13-15 14-13-24-26-14 12-30-36c38-20 20-68-21-73Z" fill="#0c1c25" stroke="#0c202a" stroke-width="3" fill-rule="evenodd"/><path d="M84 27c-40 0-63 45-37 75 11 12 25 15 40 11l67 81 18-15-13-15 13-11-22-25-14 12-30-36c35-23 20-77-22-77Zm0 20a24 24 0 1 1 0 48 24 24 0 0 1 0-48Z" fill="#13252d" stroke="#a0bcb7" stroke-width="1.4" fill-rule="evenodd"/><path d="M84 34c-35 0-52 37-31 62 10 11 23 14 37 8l64 79 8-6-14-16 12-10-10-13-14 12-38-47c29-23 15-69-14-69Zm0 13a24 24 0 1 1 0 48 24 24 0 0 1 0-48Z" fill="url(#${p}-steel-dark)" opacity=".45" fill-rule="evenodd"/><path d="m107 110 51 60-5 7-56-67Z" fill="#6d9992" opacity=".15"/><path d="M49 64c7-27 33-36 51-18m-45 42c9 16 25 20 36 13m17 9 41 50" fill="none" stroke="#d5e4d6" stroke-width="1.8"/><path d="M62 54c8-8 19-10 28-6m-31 39c8 8 17 10 26 5" fill="none" stroke="#527c78" stroke-width="2"/><path d="m152 164 8 10-5 5-9-10Z" fill="#d1b475" stroke="#705d3d" stroke-width="1"/><path d="m157 162 15 17 5 6-7 6-18-21Z" fill="url(#${p}-brass)" stroke="#675d42" stroke-width="1.1"/><path d="m169 180-6 4" stroke="#f0d798" stroke-width="1.5"/><path data-part="key-cut-glint" d="M48 69c2-12 6-20 15-25m44 68 35 42" fill="none" stroke="#edf1dc" stroke-width="2" opacity=".55"/>`)}
   ${layer('key-clasp-left',`<path d="m151 215 10-5 10 5-12 6Z" fill="url(#${p}-chrome)" stroke="#36515d" stroke-width="1"/><path d="m154 215 6-3 6 3-7 3Z" fill="#8fa5ad"/>`)}
   ${layer('key-clasp-right',`<path d="m170 211 15 5-6 7-13-6Z" fill="url(#${p}-steel)" stroke="#36515d" stroke-width="1"/><path d="m174 214 8 3-4 3-8-4Z" fill="#d2d9ce"/>`)}
  `,
  motion:{"duration":1700,"layers":[{"name":"key-glass","origin":[160,187],"frames":[{"at":0},{"at":0.14,"x":-1,"y":-4,"rotate":-2},{"at":0.4,"x":7,"y":26,"rotate":0},{"at":0.62,"x":7,"y":26,"rotate":20},{"at":0.83,"x":7,"y":26,"rotate":15},{"at":1,"x":7,"y":26,"rotate":16}]},{"name":"key-clasp-left","origin":[157,216],"frames":[{"at":0},{"at":0.18,"rotate":-11},{"at":0.48,"rotate":-11},{"at":0.66,"rotate":8,"x":1},{"at":0.83,"rotate":3},{"at":1,"rotate":4}]},{"name":"key-clasp-right","origin":[177,216],"frames":[{"at":0},{"at":0.2,"rotate":12},{"at":0.5,"rotate":12},{"at":0.7,"rotate":-9,"x":-1},{"at":0.86,"rotate":-4},{"at":1,"rotate":-4}]},{"name":"key-cut-glint","origin":[102,106],"frames":[{"at":0,"opacity":0.55},{"at":0.24,"opacity":0.1},{"at":0.68,"opacity":1},{"at":1,"opacity":0.5}]}]}
 },
 'gift-halo':{
  name:'Broken Halo',type:'gift',series:'Afterhours Objects',material:'Fractured gilded enamel joined by physical nickel bridges',
  alt:'Three thick gilded enamel ring fragments, held by tiny exposed metal bridges and visible screws across the fractures.',
  mini:`<path d="M10 2A10 10 0 0 0 3 17l3-2a6 6 0 0 1 4-9Zm5 1-2 4a6 6 0 0 1 5 7l4 1A10 10 0 0 0 15 3ZM8 18l-2 3a10 10 0 0 0 14-3l-3-2a6 6 0 0 1-9 2Z" fill="#d5bb82" stroke="#635b49" stroke-width=".65"/><path d="m10 4 4 1M5 16l3 3m10-4 2 3" stroke="#9caba8" stroke-width="1.5"/>`,
  silhouette:'<path d="M114 36a82 82 0 0 0-61 126l24-16a54 54 0 0 1 37-81Zm28 0-8 30a54 54 0 0 1 42 82l23 20a82 82 0 0 0-57-132ZM84 173l-15 25a82 82 0 0 0 105-6l-20-23a54 54 0 0 1-70 4Z"/>',
  body:p=>`
   <ellipse cx="129" cy="231" rx="65" ry="4" fill="#03090d" opacity=".15"/>
   <g fill="#283d47" stroke="#829796" stroke-width="1"><path d="m107 43 31-1-2 32-30-5Z"/><path d="m53 153 28 17-17 26-26-18Z"/><path d="m171 148 26 19-21 26-24-22Z"/></g>
   ${layer('halo-left-segment',`<path d="M114 42a82 82 0 0 0-61 126l24-16a54 54 0 0 1 37-81Z" fill="#665336" stroke="#172d38" stroke-width="2.3"/><path d="M110 35a82 82 0 0 0-61 126l24-16a54 54 0 0 1 37-81Z" fill="url(#${p}-brass)" stroke="#dfcf9f" stroke-width="1.5"/><path d="M103 44a73 73 0 0 0-47 103l10-7a60 60 0 0 1 37-82Z" fill="#b39659" stroke="#f0dda8" stroke-width="1"/><path d="m105 35-4 12 9 6-9 6 4 7m-57 83 14-1 1 9 10-12" fill="none" stroke="#4e574f" stroke-width="1.6"/><path d="M75 57a63 63 0 0 0-19 41" fill="none" stroke="#f0e0af" stroke-width="1.8"/>`)}
   ${layer('halo-right-segment',`<path d="m142 42-8 30a54 54 0 0 1 42 82l23 20a82 82 0 0 0-57-132Z" fill="#685239" stroke="#182d37" stroke-width="2.3"/><path d="m138 35-8 30a54 54 0 0 1 42 82l23 20a82 82 0 0 0-57-132Z" fill="url(#${p}-brass)" stroke="#dfcf9f" stroke-width="1.4"/><path d="m143 45-3 11a63 63 0 0 1 42 98l6 5a73 73 0 0 0-45-114Z" fill="#b09359" stroke="#edd8a0" stroke-width="1"/><path d="m139 35 5 11-8 7 6 11m40 78 6 6-4 8 11 11" fill="none" stroke="#535b50" stroke-width="1.5"/><path d="M164 53a61 61 0 0 1 25 29" fill="none" stroke="#f3dfa8" stroke-width="1.9"/>`)}
   ${layer('halo-bottom-segment',`<path d="m84 180-15 25a82 82 0 0 0 105-6l-20-23a54 54 0 0 1-70 4Z" fill="#5e4c33" stroke="#19303a" stroke-width="2.3"/><path d="m80 173-15 25a82 82 0 0 0 105-6l-20-23a54 54 0 0 1-70 4Z" fill="url(#${p}-brass)" stroke="#ddcc98" stroke-width="1.4"/><path d="m82 183-5 9a70 70 0 0 0 77-3l-7-8a62 62 0 0 1-65 2Z" fill="#b49b61" stroke="#e9d3a0" stroke-width="1"/><path d="m80 173 5 12-8 5-12 8m85-29-1 11 9 3 12 9" fill="none" stroke="#535c50" stroke-width="1.5"/>`)}
   <g fill="url(#${p}-steel)" stroke="#425c61" stroke-width="1.2"><path d="m103 49 28 4-1 11-28-4Z"/><path d="m55 151 22 18-7 8-22-18Z"/><path d="m172 155 20 18-8 8-20-18Z"/></g>
   ${screw(108,56)}${screw(125,58)}${screw(55,158)}${screw(70,170)}${screw(171,161)}${screw(184,173)}
  `,
  motion:{"duration":1460,"layers":[{"name":"halo-left-segment","origin":[107,59],"frames":[{"at":0},{"at":0.2,"x":-1.65},{"at":0.48,"x":-8.25,"y":-3.3,"rotate":-3.4},{"at":0.8,"x":-1.65},{"at":1}]},{"name":"halo-right-segment","origin":[138,59],"frames":[{"at":0},{"at":0.25,"x":1.65},{"at":0.53,"x":8.25,"y":-3.3,"rotate":3.4},{"at":0.83,"x":1.65},{"at":1}]},{"name":"halo-bottom-segment","origin":[127,181],"frames":[{"at":0},{"at":0.3,"y":1.65},{"at":0.58,"y":9.899999999999999},{"at":0.87,"y":1.65},{"at":1}]}]}
 },
 'gift-orchid':{
  name:'Midnight Orchid',type:'gift',series:'Afterhours Objects',material:'Curved violet ceramic, dark-glazed sepals and a folded gold lip',
  alt:'A bilaterally composed ceramic orchid with broad upper petals, long side sepals, dark undersides and a prominent curled gold lower lip.',
  mini:`<path d="M10 11C3 10 0 5 4 3c4-2 7 2 8 7 1-5 5-9 8-6 3 4-1 8-7 8l7 6-5-1-3-3-4 3-6 1 8-6Z" fill="#8f75a3" stroke="#30364a" stroke-width=".7"/><path d="M12 10C8 3 10 0 13 1l1 9Z" fill="#5e4b77"/><path d="m9 12 3-2 4 3-1 6-4 4-3-5Z" fill="#775883" stroke="#3a3448" stroke-width=".7"/><path d="m9 13 4 2 3-2-2 5-3 2Z" fill="#dec584"/><path d="m11 12 3-.5.5 2.5-3 1Z" fill="#3e3540"/>`,
  silhouette:'<path d="M119 104c-34-45-27-70-5-69 19 1 26 25 20 59 31-51 70-50 85-29 16 28-19 57-68 63l65 41-30 8-45-27c17 31 9 63-20 79-35-12-40-50-17-79l-54 29-30-10 72-44C44 121 20 85 37 63c19-26 53-8 82 41Z"/>',
  body:p=>`
   <ellipse cx="127" cy="236" rx="47" ry="4" fill="#03090e" opacity=".15"/>
   <path d="m128 137-7 87m4-25 26-15" fill="none" stroke="#315348" stroke-width="6"/><path d="m124 197 37-16-14 24-24 8Z" fill="#58796a" stroke="#203e39" stroke-width="1.3"/><path d="m128 204 26-18" stroke="#a3b391" stroke-width="1"/>
   <path d="M122 111C99 81 91 45 108 36c21-8 36 22 26 69l-5 21Z" fill="#322b45" stroke="#182431" stroke-width="2"/><path d="M122 103c-16-29-22-54-10-62 14-4 25 21 19 60l-3 18Z" fill="#715b83"/><path d="M112 41c8 26 13 48 16 78m-18-61 8 15m11-21-3 21" fill="none" stroke="#b39abd" stroke-width="1"/>
   ${layer('orchid-upper-left',`<path d="M121 124C74 123 24 100 33 72c8-31 49-24 76 8l20 34Z" fill="#302b45" stroke="#172633" stroke-width="2.2"/><path d="M118 118C76 117 31 97 38 74c7-24 42-18 67 10l19 29Z" fill="url(#${p}-violet-glass)"/><path d="M38 74c36 2 66 17 86 39l-6 5C76 117 31 97 38 74Z" fill="#806190"/><path d="M40 75c33 2 63 17 82 38m-60-48 20 34m-40-7 45 7m-22 14 24-13" fill="none" stroke="#bc9cc6" stroke-width="1.1"/><path d="M39 72c10-17 34-13 49 0" fill="none" stroke="#d5bdd4" stroke-width="1.5"/><path d="m58 65 7 2m-13 24 8 3" class="va-detail-only" stroke="#967ba9" stroke-width=".7"/>`)}
   ${layer('orchid-upper-right',`<path d="M134 121c28-48 66-74 84-49 22 30-22 52-79 57Z" fill="#302a43" stroke="#172532" stroke-width="2.2"/><path d="M137 119c28-40 59-63 76-44 18 24-23 44-74 48Z" fill="url(#${p}-violet-glass)"/><path d="M213 75c-33 8-58 22-74 48 51-4 92-24 74-48Z" fill="#745486"/><path d="M210 78c-29 7-54 22-70 43m48-52-11 30m33-9-34 10m9 13-13-11" fill="none" stroke="#b69ac0" stroke-width="1.1"/><path d="M196 64c9-2 18 3 20 12" fill="none" stroke="#cfb7d0" stroke-width="1.5"/>`)}
   ${layer('orchid-left',`<path d="M118 128c-35-11-68 1-98 41l31 10 60-34 14-11Z" fill="#302b45" stroke="#172532" stroke-width="2"/><path d="M115 131c-30-7-59 4-87 36l22 7 59-33 10-7Z" fill="#6b4f7e"/><path d="M28 167c39-6 68-16 91-33l-10 7-59 33Z" fill="#9a79ac"/><path d="M32 166c36-6 63-16 83-31m-58 15 4 12m20-23 1 14" fill="none" stroke="#c5a6cc" stroke-width="1"/><path d="m49 175 8-5 2 5-8 4Z" fill="#4a355f"/>`)}
   ${layer('orchid-right',`<path d="M137 128c31-13 59-2 89 39l-29 11-56-34-12-9Z" fill="#302943" stroke="#172532" stroke-width="2"/><path d="M139 132c27-9 51 3 78 33l-20 8-52-32-13-6Z" fill="#6c4b7d"/><path d="M135 134c26 16 54 28 82 31l-20 8-52-32Z" fill="#8c68a0"/><path d="M139 135c24 15 48 25 74 29m-40-21 1 11m17-2-4 9" fill="none" stroke="#baa0c5" stroke-width="1"/>
   `)}
   ${layer('orchid-lip',`<path d="M115 130c-19 16-27 38-21 59 4 17 16 31 29 38 22-11 34-28 35-48 0-19-11-37-27-49Z" fill="#322840" stroke="#172430" stroke-width="2.2"/><path d="M117 138c-16 14-22 32-17 49 4 13 13 26 24 32 17-9 28-24 28-41 0-15-9-29-22-40Z" fill="#8b6596"/><path d="M102 159c13-4 31-3 48 0l-4 21-20 21-21-22Z" fill="#bda16b" stroke="#5b4c42" stroke-width="1.3"/><path d="M102 159c14 5 30 5 48 0l-6 11-18 14-18-14Z" fill="#ead59e"/><path d="m108 170 18 14 18-14-7 21-12 10-13-11Z" fill="#c0a168"/><path d="m126 184 11 7-12 10-13-11Z" fill="#8e704c"/><path d="M104 181c4 16 11 27 20 33 10-6 19-16 24-30-12 10-26 12-44-3Z" fill="#5f4275"/><path d="M106 185c6 14 11 22 18 27m0 0c9-6 15-13 21-24" fill="none" stroke="#b593be" stroke-width="1"/><path d="m109 162 15 8 18-8" fill="none" stroke="#f0dfb0" stroke-width="1.5"/>
   `)}
   <path d="m116 119 15-8 14 12-5 22-14 8-12-11Z" fill="#9d8046" stroke="#493c34" stroke-width="1.3"/><path d="m119 122 12-6 10 8-14 10-10-5Z" fill="#e2ca8b"/><path d="m127 134 14-10-3 15-11 9-7-8Z" fill="#b89a5d"/><path d="m123 123 8-3 5 6-10 4Z" fill="#40313d"/><path d="m126 130 5 5-5 5-3-6Z" fill="#e0c58a"/>
  `,
  motion:{"duration":1640,"layers":[{"name":"orchid-upper-left","origin":[122,119],"frames":[{"at":0},{"at":0.2,"rotate":3.4},{"at":0.42,"rotate":-10.2},{"at":0.79,"rotate":-1.7},{"at":1}]},{"name":"orchid-upper-right","origin":[133,118],"frames":[{"at":0},{"at":0.26,"rotate":-3.4},{"at":0.5,"rotate":11.9},{"at":0.83,"rotate":1.7},{"at":1}]},{"name":"orchid-left","origin":[117,128],"frames":[{"at":0},{"at":0.32,"rotate":3.4},{"at":0.58,"rotate":-8.5},{"at":0.87,"rotate":-1.7},{"at":1}]},{"name":"orchid-right","origin":[138,129],"frames":[{"at":0},{"at":0.38,"rotate":-3.4},{"at":0.65,"rotate":8.5},{"at":0.89,"rotate":1.7},{"at":1}]},{"name":"orchid-lip","origin":[126,137],"frames":[{"at":0},{"at":0.48,"scaleY":0.96},{"at":0.73,"y":4.949999999999999},{"at":0.93,"y":1.65},{"at":1}]}]}
 },
 'gift-signal':{
  name:'Sealed Signal',type:'gift',series:'Afterhours Objects',material:'Folded silver foil, crisp seams and jade wax',
  alt:'A thick silver envelope with overlapping folded seams and a separate jade wax seal embossed with a small signal mark.',
  mini:`<path d="m2 6 10-3 10 3v14l-10 3-10-3Z" fill="#a6b7bf" stroke="#1f3846" stroke-width=".8"/><path d="m2 6 10 8L22 6l-10 3Z" fill="#d9e0d7"/><path d="m2 20 8-8m12 8-8-8" fill="none" stroke="#5f7d8c" stroke-width=".8"/><path d="m9 12 4-2 3 3-1 4-5 1-2-3Z" fill="#61937f" stroke="#31584e" stroke-width=".7"/><path d="m11 13 2 1-2 1" stroke="#c3d5ad" stroke-width=".7" fill="none"/>`,
  silhouette:'<path d="m33 75 95-29 95 29v124l-95 31-95-31Z"/>',
  body:p=>`
   <ellipse cx="129" cy="234" rx="77" ry="4" fill="#02080d" opacity=".16"/>
   <path d="m34 80 95-29 95 29v121l-95 32-95-32Z" fill="#536d7b" stroke="#122b3a" stroke-width="2.5"/>
   <path d="m33 75 95-29 95 29v124l-95 31-95-31Z" fill="url(#${p}-steel)" stroke="#c2cecb" stroke-width="1.4"/>
   <path d="m39 83 89-27 89 27v110l-89 29-89-29Z" fill="#a2b7c0"/>
   <path d="m39 83 89 65 89-65v110l-89 29-89-29Z" fill="#6e8b9c"/>
   <path d="m39 193 75-68 14 23 15-23 74 68-89 29Z" fill="url(#${p}-steel)"/>
   <path d="m39 193 73-63m105 63-74-63" fill="none" stroke="#d7e0d6" stroke-width="1.5"/>
   <path d="m128 148 89-65-5 5-84 64-89-64v-5Z" fill="#415f71" opacity=".8"/>
   ${layer('signal-flap',`<path d="m33 75 95-29 95 29-95 76Z" fill="#8aa3af" stroke="#3e6073" stroke-width="1.3"/><path d="m39 75 89-25 89 25-89 70Z" fill="url(#${p}-steel)"/><path d="m39 75 89 70-7-50-45-31Z" fill="#b6c8cc"/><path d="m128 50-7 45 7 50 89-70Z" fill="#91aebc"/><path d="m41 76 87 67 86-67" fill="none" stroke="#edf0e3" stroke-width="1.6"/><path d="m139 61 26 8m-95 8 18 13" class="va-detail-only" stroke="#6d8a99" stroke-width=".8"/>`)}
   ${layer('signal-wax',`<path d="m127 113 12 5 8 10-4 15-12 7-15-3-9-12 4-14Z" fill="#2c554c" stroke="#183b38" stroke-width="1.4"/><path d="m126 116 10 4 7 10-4 11-10 5-12-3-7-10 4-11Z" fill="#689782"/><path d="m119 122 7-3 10 4 4 8-4 9-10 3-10-6-2-8Z" fill="#4f806b" stroke="#8bae8f" stroke-width="1"/><path d="m121 127 7 5-7 5m9-1h6" fill="none" stroke="#c3d4ab" stroke-width="2" stroke-linecap="round"/><path data-part="signal-pulse" d="M116 130c4-10 16-10 22 0" fill="none" stroke="#e2e4ba" stroke-width="1.5" opacity=".22"/>`)}
   <path d="m46 178 13-11m122 35 15-5m-49 12 14-5" class="va-detail-only" stroke="#5b7b8b" stroke-width=".9"/>
  `,
  motion:{"duration":1420,"layers":[{"name":"signal-pulse","origin":[128,130],"frames":[{"at":0,"opacity":0.22},{"at":0.28,"opacity":1},{"at":0.62,"opacity":0.35},{"at":1,"opacity":0.22}]},{"name":"signal-flap","origin":[128,58],"frames":[{"at":0},{"at":0.2,"y":2},{"at":0.53,"rotate":-3,"scaleY":0.84,"y":-2},{"at":0.8,"rotate":1,"scaleY":0.97},{"at":1}]},{"name":"signal-wax","origin":[128,131],"frames":[{"at":0},{"at":0.28,"scaleX":0.97,"scaleY":0.97},{"at":0.53,"scaleX":1.04,"scaleY":1.04},{"at":0.8,"scaleX":0.99,"scaleY":0.99},{"at":1}]}]}
 },
 'gift-ticket':{
  name:'Afterhours Ticket',type:'gift',series:'Afterhours Objects',material:'Cream admission stock, burgundy ink and a separate chrome clip',
  alt:'A thick cream ticket with clipped corners, burgundy printing, a perforated stub, one punched hole and a bent chrome paper clip.',
  mini:`<path d="m6 2 14 2-2 18-14-2 1-6c3 0 3-4 0-4Z" fill="#e4d7b9" stroke="#746e5e" stroke-width=".8"/><path d="m8 5 8 1M7 8l8 1m-9 7 8 1" stroke="#8c4b4d" stroke-width="1.1"/><path d="m5 13 12 1" stroke="#9e8970" stroke-width=".7" stroke-dasharray="1 1.2"/><path d="m15 1 4 1-1 7-2-.3 1-5-1-.2-1 5" fill="none" stroke="#b7c6c5" stroke-width="1.2"/>`,
  silhouette:'<path d="m78 25 111 12-19 190-118-14 9-69c21 2 25-33 4-36l8-75Zm90-13 27 3-6 65-14-2 4-44-4-1-5 44-12-2Z" fill-rule="evenodd"/>',
  body:p=>`
   <ellipse cx="125" cy="237" rx="62" ry="4" fill="#03080d" opacity=".14"/>
   ${layer('ticket-stock',`<path d="m78 30 109 12-18 187-117-13 8-72c21 2 25-33 4-36l8-72Z" fill="#9d937d" stroke="#383c3b" stroke-width="2"/><path d="m78 25 109 12-18 187-117-13 8-72c21 2 25-33 4-36l8-72Z" fill="url(#${p}-paper)" stroke="#e3d9be" stroke-width="1.3"/><path d="m83 35 92 10-15 168-96-11 8-61c17 2 24-31 3-41Z" fill="none" stroke="#8f5250" stroke-width="1.5"/><path d="m80 148 86 9" stroke="#9d7f68" stroke-width="1.2" stroke-dasharray="2.5 3"/><path d="m78 152 87 9" stroke="#f2e6c9" stroke-width="1" stroke-dasharray="2 4"/><text x="84" y="68" font-family="sans-serif" font-size="12" font-weight="700" fill="#833d43" transform="rotate(6 84 68)">AFTER</text><text x="82" y="84" font-family="sans-serif" font-size="12" font-weight="700" fill="#833d43" transform="rotate(6 82 84)">HOURS</text><path d="m82 92 66 7m-65-3 53 6" stroke="#9d625b" stroke-width="1.3"/><text x="80" y="116" font-family="monospace" font-size="7.5" fill="#73564a" transform="rotate(6 80 116)">ADMIT ONE</text><text x="77" y="178" font-family="monospace" font-size="7" fill="#7d4c46" transform="rotate(6 77 178)">STAY AWHILE</text><path d="m74 190 70 8m-69-4 52 6" stroke="#a46a60" stroke-width="1"/><path d="m172 58-3 9m-95 129 17 2m69-69 5-1" class="va-detail-only" stroke="#ad9a7a" stroke-width=".9"/><circle data-part="ticket-punch" cx="147" cy="126" r="8.3" fill="#131e25" stroke="#a89376" stroke-width="1.3"/>`)}
   ${layer('ticket-clip',`<path d="m162 15 23 3-6 62-12-1 4-45-5-.5-4 43c-1 11-17 9-16-2l5-47c1-10 6-14 11-13Z" fill="#5f737d" stroke="#182e3b" stroke-width="1.6"/><path d="m162 15 20 3-6 58-6-1 4-44-10-1-5 44c-1 5-9 5-8-1l5-46c0-8 3-13 6-12Z" fill="url(#${p}-chrome)"/><path d="m159 26-5 43m12-49 11 1-3 30" fill="none" stroke="#edf0df" stroke-width="1.4"/>`)}
  `,
  motion:{duration:1480,layers:[{name:'ticket-clip',origin:[169,34],frames:[{at:0},{at:.18,rotate:4,x:1},{at:.4,rotate:13,x:3,y:-3},{at:.79,rotate:1},{at:1}]},{name:'ticket-stock',origin:[127,123],frames:[{at:0},{at:.25,x:-2,y:2},{at:.58,x:5,y:5,rotate:2},{at:.85,x:1,y:1},{at:1}]},{name:'ticket-punch',origin:[147,126],frames:[{at:0,opacity:1,scaleX:1,scaleY:1},{at:.25,opacity:0,scaleX:.7,scaleY:.7},{at:.45,opacity:0,scaleX:.7,scaleY:.7},{at:.58,opacity:1,scaleX:1.1,scaleY:1.1},{at:.78,opacity:1},{at:1,opacity:1}]}]}
 }
,
 'gift-pocket-doomer':{
  name:'Pocket Doomer',type:'gift',series:'Internet Relics',material:'Charcoal felt, rib-knit wool and hand-stitched ivory cloth',
  alt:'A small slumped felt figure in an oversized charcoal hoodie and ribbed beanie, with half-closed stitched eyes and soft folded hands.',
  mini:`<path d="m5 12 7-3 7 3 2 9-7 2H7l-4-2Z" fill="#42494d" stroke="#1b272d" stroke-width=".8"/><path d="m7 7 5-3 5 3v7l-5 3-5-3Z" fill="#c6c5b7"/><path d="M6 9V6c0-6 12-6 12 0v3Z" fill="#586267" stroke="#1c2b33" stroke-width=".7"/><path d="M5 8h14v3H5Z" fill="#39474f"/><path d="m8 13 3-.5m3 0 3 .5m-6 3 3-.3" stroke="#4a5554" stroke-width=".9"/><path d="m7 20 4-2 3 1 3-1" fill="none" stroke="#7c8787" stroke-width=".8"/>`,
  silhouette:'<path d="M88 74V48c0-37 77-37 77 0v26l-4 27 20 16 19 79-24 14-12-6 2 25h-37l-8-18-6 18H79l2-24-24 6-12-19 18-74 24-17Z"/>',
  body:p=>`
   <ellipse cx="126" cy="233" rx="61" ry="4" fill="#03080d" opacity=".16"/>
   <path d="m87 99-22 19-18 74 14 17 25-8-6 28h35l8-18 8 18h35l-3-27 15 7 23-15-20-76-23-19Z" fill="#282f35" stroke="#14222a" stroke-width="3" stroke-linejoin="round"/>
   ${layer('doomer-shoulders',`<path d="m86 107-17 16-15 67 11 10 31-13 27 11 32-11 21 13 17-10-19-67-20-16Z" fill="#4b5358" stroke="#26363d" stroke-width="1.3"/><path d="m69 123 13 19-10 43-18 5Z" fill="#39444b"/><path d="m173 123-15 19 15 44 20 4Z" fill="#354149"/><path d="m88 112 35 24 32-24 6 70-37 16-33-12Z" fill="#58605f"/><path d="m98 128 24 8 24-7-12 44-13 19-11-22Z" fill="#414c50"/><path d="m87 113 9 21m64-21-10 20" fill="none" stroke="#87928b" stroke-width="1.6"/><path d="m94 132 4 24m48-24-4 24" stroke="#b3b5a1" stroke-width="1.7"/><path d="M96 164c14 9 37 11 53 0l-7 20-20 7-22-8Z" fill="#35454c" stroke="#71817f" stroke-width="1.2"/><path d="m58 175 12 3m107 0 9-4m-81-33 8 3m24-3 7-4" class="va-detail-only" stroke="#89958d" stroke-width="1" stroke-dasharray="1.5 2"/>`)}
   <path d="m88 189 26 8-8 23H88Zm44 7 25-8 2 31h-19Z" fill="#3b484f" stroke="#202e36" stroke-width="1.3"/><path d="m87 216 20 2m34 0 17-1" stroke="#7d8b88" stroke-width="1.3"/>
   <path d="m80 183 20-7 14 5-6 10-19 4-12-5Z" fill="#bcbeb0" stroke="#475653" stroke-width="1.2"/><path d="m133 182 13-7 20 8 1 8-15 4-20-6Z" fill="#c4c4b5" stroke="#475653" stroke-width="1.2"/><path d="m89 185 13-3m-10 7 10-3m42-3 13 4m-12 0 10 3" stroke="#7a867d" stroke-width="1"/>
   <path d="M86 54c-2 28 0 54 11 66l25 13 28-13c15-12 17-39 13-66Z" fill="#b3b9ad" stroke="#263b40" stroke-width="2"/><path d="M94 59c-2 25 1 44 10 55l18 11 22-10c10-10 15-32 12-56Z" fill="#d0cdbc"/><path d="m97 90 5 17 14 12-14-5-9-15Z" fill="#9baa9e"/><path d="m150 85-4 22-12 15 14-7 10-19Z" fill="#b6bcae"/><path d="m97 70 5 2m-6 6 4 2m51-10-4 2m8 6-5 2m-43 35 5 2m28 0 5-3" class="va-detail-only" stroke="#7c8e85" stroke-width="1"/>
   <path d="M85 62V46c-2-37 78-41 81-1v17Z" fill="#45555d" stroke="#192c36" stroke-width="2.5"/><path d="M91 47c4-30 65-29 69-1v11H91Z" fill="#61706e"/><path d="m99 36-2 18m13-24-2 24m14-25-1 25m13-24 1 24m10-21 3 20m8-14 3 15" fill="none" stroke="#89908a" stroke-width="1.7"/>
   <path d="M80 55h90l-1 20-43 8-44-8Z" fill="#35474e" stroke="#1c3038" stroke-width="1.7"/><path d="m86 60 1 12 38 7 39-7 1-12" fill="none" stroke="#72827f" stroke-width="1.1"/><path d="m94 59 1 14m11-14 1 16m11-16 1 18m11-18v18m11-18-1 16m11-16-1 14" stroke="#657773" stroke-width="1.2"/>
   ${layer('doomer-eyelids',`<path d="M98 91c8-4 16-3 22 0m14 0c7-4 13-3 19 1" fill="none" stroke="#546861" stroke-width="3" stroke-linecap="round"/><path d="m101 94 17-1m18 0 15 2" fill="none" stroke="#283d3d" stroke-width="2"/><path d="m104 91 2 3m34-3 2 4" stroke="#dfe0ca" stroke-width="1.1"/>`)}
   <path d="m125 94-3 12 6 2m-15 8 20-1" fill="none" stroke="#7f8c7c" stroke-width="1.5" stroke-linecap="round"/>
  `,
  motion:{duration:1380,layers:[{name:'doomer-eyelids',origin:[125,93],frames:[{at:0},{at:.22,scaleY:.3},{at:.36,scaleY:1},{at:.62,scaleY:.92},{at:1}]},{name:'doomer-shoulders',origin:[123,132],frames:[{at:0},{at:.26,y:-2},{at:.55,y:2,scaleY:.98},{at:.84,y:.5},{at:1}]}]}
 },
 'gift-orbit-mobile':{
  name:'Orbit Mobile',type:'gift',series:'Afterhours Objects',material:'Brushed chrome, aged brass and hanging enamel celestial pieces',
  alt:'A desktop kinetic mobile with a dark weighted base, a chrome mast, brass pivot, suspended crescent moon, tiny satellite and real counterweight.',
  mini:`<ellipse cx="12" cy="22" rx="8" ry="2" fill="#72898e"/><path d="M12 21V4m-8 3 16-2" stroke="#bec8bf" stroke-width="1.5" fill="none"/><circle cx="12" cy="5" r="2" fill="#c6ab72"/><path d="M5 7v5m14-7v9" stroke="#879c9b" stroke-width=".8"/><path d="M8 12a4 4 0 1 0 0 7 3 3 0 0 1 0-7Z" fill="#d8c795"/><path d="m17 14 3-1 2 3-3 1Z" fill="#a6c0c0"/><path d="m16 14-2 1 1 2 2-1m5-1 2-1" stroke="#71969f" stroke-width="1"/>`,
  silhouette:'<path d="M119 189V55l-64 12-2-10 66-12V26h14v16l64-12 3 10-67 13v136c70 1 75 45-5 45s-73-44-9-45ZM57 71h6v44h-6Zm2 42c-32 0-41 43-12 54 12 5 23 0 29-8-28 6-39-26-17-46Zm130-64h6v78h-6Zm-15 80 19-7 14 17-18 9-15-19Z"/>',
  body:p=>`
   <ellipse cx="127" cy="237" rx="60" ry="4" fill="#02080d" opacity=".16"/>
   <ellipse cx="128" cy="217" rx="61" ry="17" fill="#203641" stroke="#0f2531" stroke-width="2"/><ellipse cx="128" cy="211" rx="61" ry="16" fill="url(#${p}-steel)" stroke="#b2c3bf" stroke-width="1.3"/><ellipse cx="128" cy="210" rx="48" ry="10" fill="#455e68"/><ellipse cx="128" cy="208" rx="27" ry="6" fill="#253f4a"/><path d="M123 209V44h10v165Z" fill="url(#${p}-chrome)" stroke="#3c5a67" stroke-width="1"/><path d="M125 204V50" stroke="#e7eee0" stroke-width="1.2"/>
   <path d="M118 52V30c0-11 19-11 19 0v22" fill="none" stroke="#bb9f65" stroke-width="4"/><path d="M121 31c0-7 12-7 12 0" fill="none" stroke="#eed49a" stroke-width="1.3"/>
   ${layer('mobile-crossbeam',`<path d="m49 64 149-29 4 9L53 73Z" fill="#8fa4aa" stroke="#223e4c" stroke-width="1.6"/><path d="m51 63 147-29 1 4L52 67Z" fill="#e0e4d8"/><circle cx="128" cy="52" r="10" fill="url(#${p}-brass)" stroke="#526366" stroke-width="1.5"/><circle cx="128" cy="52" r="4" fill="#324d59" stroke="#dbca97" stroke-width="1"/>
    ${layer('mobile-moon',`<path d="M59 68v49" stroke="#a2b7af" stroke-width="1.6"/><circle cx="59" cy="117" r="3.5" fill="#c4af75"/><path d="M66 117c-25-8-40 15-28 36 7 13 23 16 36 4-21 1-30-25-8-40Z" fill="#8f855f" stroke="#203e46" stroke-width="1.7"/><path d="M63 117c-23-3-34 18-22 35 7 10 19 11 30 5-24-3-27-26-8-40Z" fill="url(#${p}-brass)"/><path d="M44 130c-4 9 0 19 8 23" fill="none" stroke="#f0ddaa" stroke-width="1.4"/><path d="m43 124 3 1m3 30 2-1" stroke="#978452" stroke-width="1.2"/>`)}
    ${layer('mobile-satellite',`<path d="M191 44v80" stroke="#95ada8" stroke-width="1.6"/><circle cx="191" cy="125" r="3.5" fill="#cfb77b"/><path d="m180 132 15-7 14 16-17 9Z" fill="#547686" stroke="#143644" stroke-width="1.5"/><path d="m180 132 15-7 4 10-14 7Z" fill="#d2dace"/><path d="m199 135 10 6-17 9-7-8Z" fill="#8fa9af"/><path d="m177 133-17 7 7 15 17-8Z" fill="#4e7388" stroke="#b0c7c3" stroke-width="1"/><path d="m169 138 7 15m-13-5 17-7" stroke="#9fb9b7" stroke-width=".8"/><path d="m208 132 13-6 8 14-15 7Z" fill="#4e7388" stroke="#afc4bf" stroke-width="1"/><path d="m216 129 7 14m-12-3 14-7" stroke="#a0b9b4" stroke-width=".8"/><path d="m192 126-3-10m-4 0 8-1" stroke="#c0b184" stroke-width="1.2"/>`)}
   `)}
   <path d="m139 56 23 13" stroke="#526e74" stroke-width="1.4"/><circle cx="168" cy="72" r="10" fill="url(#${p}-brass)" stroke="#344b50" stroke-width="1.4"/><path d="m165 65-3 7" stroke="#ead4a0" stroke-width="1.5"/>
  `,
  motion:{"duration":1580,"layers":[{"name":"mobile-crossbeam","origin":[128,52],"frames":[{"at":0},{"at":0.18,"rotate":-3.2},{"at":0.45,"rotate":8},{"at":0.72,"rotate":-3.2},{"at":1}]},{"name":"mobile-moon","origin":[59,68],"frames":[{"at":0},{"at":0.24,"rotate":4.800000000000001},{"at":0.55,"rotate":-12.8},{"at":0.82,"rotate":3.2},{"at":1}]},{"name":"mobile-satellite","origin":[191,44],"frames":[{"at":0},{"at":0.28,"rotate":-3.2},{"at":0.6,"rotate":9.600000000000001},{"at":0.86,"rotate":-1.6},{"at":1}]}]}
 },
 'gift-last-broadcast':{
  name:'Last Broadcast',type:'gift',series:'Internet Relics',material:'Worn brushed aluminum, amber dial glass and leather tether',
  alt:'A worn pocket radio with a recessed amber tuning scale, speaker grille, knurled controls, a telescoping antenna and a loose leather tether.',
  mini:`<path d="M4 8h15l2 2v12H4Z" fill="#8d9c9e" stroke="#243b46" stroke-width=".8"/><path d="M6 10h12v4H6Z" fill="#bd985d" stroke="#48555a" stroke-width=".7"/><path d="m13 10-.5 4" stroke="#eee1b2" stroke-width=".9"/><path d="M7 16h7m-7 2h7m-7 2h7" stroke="#364f5e" stroke-width="1"/><circle cx="18" cy="18" r="2" fill="#3d5964"/><path d="m18 8 3-7" stroke="#c0cbc7" stroke-width="1.5"/><path d="M4 10C0 9 0 19 4 20" stroke="#947455" stroke-width="1.2" fill="none"/>`,
  silhouette:'<path d="M65 78h114l21 12v131H64V98c-29-4-40 22-27 69l-8 3c-16-54 1-90 36-80Zm115-5 27-54 9 4-26 55Z"/>',
  body:p=>`
   <ellipse cx="128" cy="237" rx="65" ry="4" fill="#03090d" opacity=".16"/>
   <path d="M65 91C24 72 16 114 28 158c4 15 12 25 24 30" fill="none" stroke="#3c312a" stroke-width="9" stroke-linecap="round"/><path d="M64 91C29 78 23 114 33 154c4 14 9 23 18 29" fill="none" stroke="#967553" stroke-width="5" stroke-linecap="round"/><path d="m35 95-3 7m-3 10v8m3 15 2 9m5 12 4 8" stroke="#c0a07c" stroke-width="1"/>
   <path d="m63 78 117-1 22 12v132l-22 10-117-4Z" fill="#4b6774" stroke="#152f3e" stroke-width="2.5"/><path d="m180 77 22 12v132l-22 10Z" fill="#334c5d"/><path d="M63 78h117v153H63Z" fill="url(#${p}-steel)" stroke="#9db1b4" stroke-width="1.2"/><path d="M69 85h105v138H69Z" fill="#98abad"/><path d="M75 121h71v91H75Z" fill="#354f5e" stroke="#c0cbc3" stroke-width="1.1"/><path d="M80 127h61v78H80Z" fill="#273e4b"/>
   <g stroke="#839da2" stroke-width="2.2"><path d="M84 132h53m-53 7h53m-53 7h53m-53 7h53m-53 7h53m-53 7h53m-53 7h53m-53 7h53m-53 7h53m-53 7h53m-53 7h53"/></g><path d="m87 129 3 74m7-74 3 74m7-74 3 74m7-74 3 74m7-74 3 74" stroke="#1a3546" stroke-width="1.2"/>
   <path d="M77 90h94v27H77Z" fill="#3e555d" stroke="#d1d7c6" stroke-width="1.2"/><path d="M82 94h84v18H82Z" fill="#9a703f"/><path d="M85 96h77v12H85Z" fill="#c7a76a"/><path d="m92 97-1 9m12-9-1 6m13-6-1 9m13-9-1 6m13-6-1 9m13-9-1 6" stroke="#6f5738" stroke-width="1"/><text x="86" y="111" font-family="monospace" font-size="4.5" fill="#e4d2a3">FM</text><path data-part="radio-needle" d="M129 94v18" stroke="#f1e0a6" stroke-width="2"/>
   <circle cx="160" cy="177" r="13" fill="#243f4e" stroke="#c2cabe" stroke-width="1.2"/><circle cx="160" cy="177" r="9" fill="#547482" stroke="#1b3546" stroke-width="1"/><path data-part="radio-knob" d="m160 168v7m-4 10 4-2" stroke="#ded8b8" stroke-width="2"/><circle cx="160" cy="137" r="4" fill="#aa804b" stroke="#2c4c5b" stroke-width="1"/>
   <path d="M180 100h12v17h-12Z" fill="#1b3546" stroke="#73939d" stroke-width="1"/><path d="m184 101v14m4-14v14" stroke="#bac7bd" stroke-width="1.3"/>
   <path d="m172 83 13-28 9 4-13 29Z" fill="url(#${p}-steel-dark)" stroke="#54727d" stroke-width="1"/><path d="m175 81 11-23" stroke="#b6c8c2" stroke-width="1.3"/>
   ${layer('radio-antenna',`<path d="m174 81 29-58 8 4-28 58Z" fill="url(#${p}-steel)" stroke="#41616d" stroke-width="1.1"/><path d="m176 77 26-51" stroke="#f0eee0" stroke-width="1.5"/><path d="m186 54 7 4m3-24 7 3" stroke="#667e85" stroke-width="1.2"/><ellipse cx="207" cy="25" rx="5" ry="3" fill="#cbd4c9" transform="rotate(27 207 25)"/>`)}
   <path d="m72 88 3-2m-2 129 7 1m82 8 8-2m-8-137 5 1m16 127 8-4" class="va-detail-only" stroke="#5e7d8b" stroke-width="1.2"/>
  `,
  motion:{"duration":1560,"layers":[{"name":"radio-needle","origin":[129,103],"frames":[{"at":0},{"at":0.24,"x":-10},{"at":0.58,"x":13},{"at":0.82,"x":9},{"at":1,"x":10}]},{"name":"radio-knob","origin":[160,177],"frames":[{"at":0},{"at":0.24,"rotate":-14},{"at":0.58,"rotate":19},{"at":0.83,"rotate":13},{"at":1,"rotate":14}]},{"name":"radio-antenna","origin":[177,81],"frames":[{"at":0},{"at":0.18,"x":-1,"y":2},{"at":0.47,"x":8,"y":-16},{"at":0.78,"x":5,"y":-10},{"at":1,"x":6,"y":-12}]}]}
 },
 'gift-night-lantern':{
  name:'Night Lantern',type:'gift',series:'Afterhours Objects',material:'Smoked glass, aged brass and a stitched cloth carrying loop',
  alt:'A squat brass lantern with separate smoked-glass planes, a warm lamp, hinged cap, vent slots and a stitched fabric carrying loop.',
  mini:`<path d="M8 5V2c0-3 8-3 8 0v3" fill="none" stroke="#8f8f78" stroke-width="1.5"/><path d="m6 6 6-2 6 2 2 15-8 2-8-2Z" fill="#816d47" stroke="#293c41" stroke-width=".8"/><path d="m7 10 5-1 5 1 1 9-6 2-6-2Z" fill="#45625b"/><path d="m11 13 3-1 2 6-4 2-3-2Z" fill="#dbb66a"/><path d="m6 7 6 2 6-2m-6 2v12" stroke="#cbb576" stroke-width="1"/>`,
  silhouette:'<path d="M91 55V28c0-37 74-37 74 0v27l20 12 20 151-78 19-77-19L70 67Zm12-20v20h50V35c0-27-50-27-50 0Z" fill-rule="evenodd"/>',
  body:p=>`
   <ellipse cx="128" cy="237" rx="62" ry="4" fill="#03090d" opacity=".16"/>
   <path d="M93 62V32c0-34 70-35 70 0v30" fill="none" stroke="#3d4642" stroke-width="14" stroke-linecap="round"/><path d="M94 57V32c0-30 67-31 67 0v25" fill="none" stroke="#8b8c76" stroke-width="8" stroke-linecap="round"/><path d="M96 49V32c0-28 63-28 63 0v17" fill="none" stroke="#b8b496" stroke-width="1.2" stroke-dasharray="2 3"/>
   <path d="m75 78 52-17 54 17 17 135-70 19-68-19Z" fill="#4e684f" stroke="#1c3739" stroke-width="2"/><path d="m75 78 52 17v128l-59-17Z" fill="#5c7a65" opacity=".65"/><path d="m127 95 54-17 9 127-63 18Z" fill="#294a45" opacity=".8"/>
   <path d="m84 96 33 11v94l-41-12Z" fill="#1e4946" opacity=".7"/><path d="m138 108 34-11 8 92-42 12Z" fill="#6e8767" opacity=".45"/>
   ${layer('lantern-lamp',`<path d="m110 183 16-8 18 8-2 16-16 5-14-6Z" fill="#6c5839" stroke="#2e403b" stroke-width="1.2"/><ellipse cx="127" cy="181" rx="17" ry="6" fill="#b39a59"/><path d="M118 178c-10-13 2-24 1-36 13 7 21 21 16 36Z" fill="#bd8d46"/><path d="M123 177c-6-9 1-15 2-22 8 7 10 15 6 22Z" fill="#e8c986"/><path d="m124 175 3-11 3 11" fill="#f5dfac"/>`)}
   <path d="m75 78 52 17v128m0-128 54-17m-106 0-7 127m113-127 9 127" fill="none" stroke="#394d44" stroke-width="10" stroke-linejoin="round"/><path d="m76 78 51 17v128m0-128 53-17m-104 0-7 127m111-127 9 127" fill="none" stroke="url(#${p}-brass)" stroke-width="5.5" stroke-linejoin="round"/>
   <path d="m62 205 66 18 66-18 5 15-71 19-70-19Z" fill="#5d5439" stroke="#293b36" stroke-width="1.6"/><path d="m64 204 64 17 65-17-3 10-62 17-61-17Z" fill="url(#${p}-brass)"/><path d="m66 211 62 17 61-17" fill="none" stroke="#e2cc90" stroke-width="1.1"/>
   ${layer('lantern-cap',`<path d="m69 66 58-21 60 21-7 17-53 17-53-17Z" fill="#5b543b" stroke="#233a3a" stroke-width="2"/><path d="m69 66 58-21 60 21-60 20Z" fill="url(#${p}-brass)" stroke="#d5c18c" stroke-width="1.2"/><path d="m85 63 42-14 43 14-43 15Z" fill="#879176"/><path d="m97 62 6 2m7-7 6 2m7-7 6 2m8 4 6 2m7 4 6 2" stroke="#344e47" stroke-width="3" stroke-linecap="round"/><path d="m73 68 54 18 55-18m-55 18v10" fill="none" stroke="#ecdaa4" stroke-width="1.1"/>`)}
   <path d="m83 110-4 45m61-45 24-8m-27 39 2 38" fill="none" stroke="#c8d2b0" stroke-width="1.5" opacity=".45"/>
   ${screw(77,81)}${screw(177,81)}${screw(128,96)}${screw(128,222)}
  `,
  motion:{"duration":1520,"layers":[{"name":"lantern-cap","origin":[174,79],"frames":[{"at":0},{"at":0.16,"rotate":-2},{"at":0.43,"rotate":13,"y":-3},{"at":0.7,"rotate":4,"y":-1},{"at":1,"rotate":3}]},{"name":"lantern-lamp","origin":[127,181],"frames":[{"at":0,"opacity":0.78},{"at":0.22,"opacity":0.5,"scaleX":0.85,"scaleY":1.14},{"at":0.5,"opacity":1,"scaleX":1.04,"scaleY":0.96},{"at":0.76,"opacity":0.9,"scaleX":0.97,"scaleY":1.03},{"at":1,"opacity":0.9}]}]}
 }
,

 'gift-ego-volume':{
  name:'Egoist’s Volume',type:'gift',series:'Ego Archive',material:'Black bookcloth, untrimmed paper, ivory enamel and oxblood ribbon',
  alt:'A worn black cloth volume with an ivory long-nosed spectacle cameo, uneven cream paper edges, an oxblood bookmark and a loose annotated slip.',
  mini:`<path d="m5 3 12-2 4 18-13 4-4-3Z" fill="#171f25" stroke="#899493" stroke-width=".7"/><path d="m7 20 13-3v3L8 23Z" fill="#d8ccb0"/><path d="m15 3 2 17-2 2-1-4" fill="#8d454a"/><path d="M10 6c4-2 7 3 4 6l-3 3-3-2 2-2-2-1 1-1Z" fill="#e8dfc8"/><circle cx="10.5" cy="9.5" r="1" fill="none" stroke="#39423d" stroke-width=".65"/><path d="m9 14 5-1 1 3-6 1Z" fill="#d2c8b0"/>`,
  silhouette:`<path d="m68 48 95-16 30 65 36 7-14 48-15-4 5 43-116 37-22-10-20-155Z"/>`,
  body:p=>`
   <ellipse cx="130" cy="230" rx="65" ry="5" fill="#03090d" opacity=".12"/>
   <path d="m71 52 99-17 32 157-115 37-22-11-19-153Z" fill="#10171d" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
   <path d="m75 61 89-15 27 145-104 30-16-10Z" fill="url(#${p}-paper)" stroke="#716f60" stroke-width="1.1"/>
   <path d="m88 204 101-27 2 14-104 30-16-10 3-12Z" fill="#b5ab8f"/>
   <g class="va-detail-only" fill="none" stroke="#887e67" stroke-width=".75"><path d="m88 207 97-27m-96 31 98-27m-98 31 98-27m-97 31 96-27m-17-131 23 114m-20-115 22 109"/></g>
   ${layer('volume-bookmark',`<path d="m148 48 11-2 28 162-8-4-5 8Z" fill="#71393e" stroke="#291e27" stroke-width="1.2"/><path d="m152 52 4-1 26 149-4-2Z" fill="#ad6364"/><path d="m175 193 8-2m-7 5 7-2" class="va-detail-only" stroke="#d69685" stroke-width=".7"/>`)}
   ${layer('volume-annotation',`<path d="m167 100 59 7-11 43-39-6Z" fill="#ab9d80" stroke="#3a3f3a" stroke-width="1.1"/><path d="m168 98 58 7-13 41-38-6Z" fill="url(#${p}-paper)"/><path d="m173 103 42 5-3 9-37-4Z" fill="#e6ddbf"/><path d="m179 119 26 4m-25 1 19 3m-20 2 25 4m-23 1 13 2" fill="none" stroke="#756f5e" stroke-width="1"/><path d="m213 146 3-10-12 8Z" fill="#f0e8d0"/><path d="m168 98 7 42" stroke="#f0e5c8" stroke-width="1.5"/>`)}
   ${layer('volume-cover',`<path d="m66 47 95-16 33 160-111 34-20-11-20-154Z" fill="#111b22" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/><path d="m68 48 91-14 29 151-104 32-17-10-19-146Z" fill="#273138"/><path d="m70 53 84-14 27 142-95 29-13-9-19-141Z" fill="url(#${p}-ink)" stroke="#58615f" stroke-width=".8"/><path d="m66 47 10 8 24 157-17 6-16-11-19-146Z" fill="#16252b"/><path d="m66 53 24 151m-20-149 25 149" stroke="#65716d" stroke-width=".8"/><path d="m84 204 97-29m-105-119 76-13" stroke="#98a09a" stroke-width="1" opacity=".55"/>
    <path d="m87 71 47-8 18 73-53 14-13-68Z" fill="#414c4c" stroke="#0f1a20" stroke-width="1.4"/><path d="m91 75 39-7 15 64-43 12-10-60Z" fill="url(#${p}-ivory)" stroke="#a19476" stroke-width="1"/>
    <path d="M116 77c-6 0-11 3-14 9l1 9-5 7 7 3-1 5 4 5-1 11 12-3 10 5 7-3-5-20 1-10c-1-10-6-18-16-18Z" fill="#d7d0b9" stroke="#56605a" stroke-width="1.3"/><path d="M104 89c1-11 13-17 22-8l4 12-8-5-17 7Z" fill="#606e6a"/><path d="m111 81 11 7m-15-4 12 5m-14-1 11 3m11-1 3 7" stroke="#d9ddce" stroke-width=".9"/>
    <circle cx="106" cy="98" r="4.7" fill="none" stroke="#3a4944" stroke-width="1.4"/><path d="m111 96 13-3m-23 9-3 1m10 8 5 1m-5 5 6 2m-7 8 18-3 8 8-27 8Z" fill="none" stroke="#53625b" stroke-width="1.2"/>
    <path d="m95 163 62-17m-60 22 47-12" fill="none" stroke="#787b70" stroke-width=".9"/><text x="103" y="180" font-family="monospace" font-size="7.5" letter-spacing="1.4" fill="#b8b9a4" transform="rotate(-15 103 180)">OWNNESS</text>
    <g class="va-detail-only" stroke="#78837b" stroke-width=".6" opacity=".5"><path d="m80 69 3 18m-2 14 2 7m65-53 2 9m-55 88 7-2m46 11 6-2m-66 31 3-1"/></g>
   `)}
   <path d="m63 70-5 4m17 132-5-3m116-31 4 5" stroke="#a5a68e" stroke-width="1.5"/>
  `,
  motion:{"duration":1580,"layers":[{"name":"volume-cover","origin":[68,126],"frames":[{"at":0},{"at":0.13,"rotate":2},{"at":0.46,"rotate":-12,"scaleX":0.7},{"at":0.73,"rotate":-8,"scaleX":0.78},{"at":1,"rotate":-8,"scaleX":0.78}]},{"name":"volume-bookmark","origin":[154,57],"frames":[{"at":0},{"at":0.25,"y":-2},{"at":0.55,"y":15,"rotate":5},{"at":0.84,"y":9,"rotate":2},{"at":1,"y":10,"rotate":2}]},{"name":"volume-annotation","origin":[176,111],"frames":[{"at":0},{"at":0.31,"rotate":-5},{"at":0.6,"rotate":27},{"at":0.86,"rotate":10},{"at":1,"rotate":12}]}]}
 },
 'gift-curtain-call':{
  name:'Curtain Call',type:'gift',series:'Internet Relics',material:'Graphite stage box, teal cloth, warm enamel and brass rail',
  alt:'A freestanding miniature window with a deep graphite frame, attached teal curtains and an awkward bespectacled figure holding the curtain edge.',
  mini:`<path d="m4 3 16-1 2 19-19 2Z" fill="#293a40" stroke="#a3aaa1" stroke-width=".7"/><path d="M6 5h13v14H6Z" fill="#d9cdac"/><path d="M6 5h4l-1 14H6ZM16 5h3v14h-3Z" fill="#487d77"/><path d="M11 9h5v8h-5Z" fill="#c8c0a7"/><path d="M10 10h3v3h-3Zm4 0h3v3h-3Z" fill="none" stroke="#273d3f" stroke-width="1"/><path d="M4 2h17" stroke="#c3ab72" stroke-width="1.3"/><path d="m2 22 18-1 3 2H2Z" fill="#869491"/>`,
  silhouette:`<path d="M54 45h148l15 11v155l17 18H35l12-18V57l7-12Zm18 29v123h111V74H72Zm39 31h45v73h-45v-73Z" fill-rule="evenodd"/>`,
  body:p=>`
   <ellipse cx="130" cy="234" rx="86" ry="5" fill="#03090d" opacity=".13"/>
   <path d="m53 48 145-3 18 13-1 157-13 13-148-7-10-11 2-151Z" fill="#111c24" stroke="${ink}" stroke-width="2.5"/>
   <path d="m198 45 18 13-1 157-13 13-4-17Z" fill="url(#${p}-steel-dark)"/>
   <path d="M55 56h146v157H55Z" fill="#33464c" stroke="#8d9a98" stroke-width="1.5"/>
   <path d="M64 66h128v136H64Z" fill="#151f27" stroke="#080e14" stroke-width="3"/>
   <defs><clipPath id="${p}-curtain-opening"><path d="M67 69h122v130H67Z"/></clipPath></defs>
   <g clip-path="url(#${p}-curtain-opening)">
    <path d="M67 69h122v130H67Z" fill="#d3c29c"/><path d="m67 69 122 130H67Z" fill="#b5a67f" opacity=".4"/>
    <path d="m92 199 11-32 40-6 27 38Z" fill="#60736d" stroke="#273d3e" stroke-width="1.8"/><path d="m105 168 19 16 16-20 17 11-12 24h-35Z" fill="#3c5655"/><path d="m105 168 18 16-13 11-6-11Zm35-4-16 20 15 10 12-21Z" fill="#9aa99a" stroke="#324d4b" stroke-width="1.1"/>
    <path d="M109 99c9-10 30-11 42 0l6 37-9 25-17 11-18-13-10-30Z" fill="url(#${p}-ivory)" stroke="#263b3b" stroke-width="2"/>
    <path d="m108 103-6-13 8-11 30-2 17 11-3 19-13-10-28 6Z" fill="#273b3e" stroke="#152c32" stroke-width="2"/><path d="m109 89 30-6 13 8-29-1-14 6" fill="none" stroke="#71827a" stroke-width="1.6"/>
    <path d="m110 113 23 2-2 15-21-3Zm29 1 17-3 1 15-18 4Z" fill="#c5c8af" stroke="#253c3d" stroke-width="3.2"/>
    <path d="m132 118 7-1m-30-1-6-2m53 0 4-3" stroke="#1c3439" stroke-width="2.5"/>
    ${layer('curtain-gaze',`<path d="m118 121 9 1m16-2 9-1" stroke="#243b3d" stroke-width="2.1"/><circle cx="123" cy="121" r="2" fill="#1a3035"/><circle cx="146" cy="120" r="2" fill="#1a3035"/>`)}
    <path d="m130 128-5 14 9 1m-13 10 18 1-8-5Zm-10-45 17 2m10-3 13-4" fill="none" stroke="#5b6659" stroke-width="1.4"/>
    <path d="m105 136-11-6-7 5 2 16 9 5 8-7Z" fill="#d4cbb0" stroke="#3f5149" stroke-width="1.3"/><path d="m89 138 10 2m-10 3 10 2m-8 3 7 2" stroke="#788274" stroke-width="1"/>
    ${layer('curtain-left',`<path d="m65 68 39-1-4 76 4 54-16-4-22 5Z" fill="#2b5d5b" stroke="#173e43" stroke-width="1.6"/><path d="m69 69 8-1-3 122-8 8Z" fill="#7eaa94"/><path d="m79 68 9-1-6 124 6 2-11-2Z" fill="#457d76"/><path d="m91 68 9-1-6 78 6 49-10-2-4-48Z" fill="#8db09c"/><path d="m75 72-4 112m16-113-7 110m17-109-5 68 4 41" fill="none" stroke="#c0ccb0" stroke-width="1"/><path d="m67 190 10-2 11 5 11-3" fill="none" stroke="#173b3f" stroke-width="1.6"/>`)}
    ${layer('curtain-right',`<path d="m157 68 33 1v129l-12-6-17 5 2-70Z" fill="#2b5b5b" stroke="#173c42" stroke-width="1.6"/><path d="m162 69 8 1 2 119-11 8 2-70Z" fill="#6d9a87"/><path d="m176 70 8 1 2 122-9-2Z" fill="#4c8074"/><path d="m165 74 3 105m10-103 3 107m6-106 1 110" stroke="#b8c7ac" stroke-width="1"/><path d="m161 190 10-4 9 7 9-2" fill="none" stroke="#173c3e" stroke-width="1.6"/>`)}
   </g>
   <path d="M59 61h137m-136 146h139M60 64v139m136-139v139" fill="none" stroke="#adbbb0" stroke-width=".9"/>
   <path d="M52 57h152" stroke="#8b784e" stroke-width="5"/><path d="M52 55h152" stroke="#c7af72" stroke-width="2"/><circle cx="50" cy="56" r="4" fill="url(#${p}-brass)" stroke="#3b4639"/><circle cx="205" cy="56" r="4" fill="url(#${p}-brass)" stroke="#3b4639"/>
   <g fill="none" stroke="#9c9b78" stroke-width="1.4"><path d="M70 66v-9h5v9m9 0v-9h5v9m10 0v-9h5v9m57 0v-9h5v9m11 0v-9h5v9m9 0v-9h5v9"/></g>
   <path d="m47 213 161 1 22 14H35Z" fill="#425058" stroke="#111e27" stroke-width="2"/><path d="m47 213 161 1 9 6-172-1Z" fill="#a0aaa3"/><path d="M49 223h155" stroke="#6d7a75" stroke-width="1"/>
   ${screw(60,209)}${screw(197,209)}
  `,
  motion:{duration:1490,layers:[
   {name:'curtain-gaze',origin:[133,121],frames:[{at:0},{at:.2,x:4},{at:.4,x:-2},{at:.67,x:1},{at:1,x:1}]},
   {name:'curtain-left',origin:[70,70],frames:[{at:0},{at:.2,x:-1},{at:.69,x:23},{at:.84,x:21},{at:1,x:21}]},
   {name:'curtain-right',origin:[187,70],frames:[{at:0},{at:.3,x:1},{at:.72,x:-24},{at:.86,x:-23},{at:1,x:-23}]}
  ]}
 },
 'gift-larp-kit':{
  name:'LARP Starter Kit',type:'gift',series:'Afterhours Guild',material:'Worn theatrical leather, red felt, corrugated card and blue foam',
  alt:'An open worn theatrical case lined in red felt holds a blue foam sword, a visibly taped cardboard helmet and a rolled campaign map.',
  mini:`<path d="m3 5 15-3 2 10L3 15Z" fill="#39474e" stroke="#91a3a1" stroke-width=".7"/><path d="m5 7 11-2 1 7-12 1Z" fill="#743e43"/><path d="m2 15 17-4 4 8-18 4Z" fill="#27383e" stroke="#8c9c98" stroke-width=".8"/><path d="m5 15 11-3 4 5-13 3Z" fill="#754548"/><path d="m7 17 7-9 2 1-8 10" stroke="#92b9c1" stroke-width="1.9"/><path d="m13 12 5 1 1 5-6 1Z" fill="#b79c72" stroke="#594d3b" stroke-width=".7"/><path d="m13 15 6-1" stroke="#df9b5b" stroke-width="1.2"/><path d="m5 15 4-1 2 4-4 2Z" fill="#d6c6a1"/>`,
  silhouette:`<path d="m44 58 151-24 13 77 18 61-10 19-142 32-38-29-7-57 12-9-9-58 12-12Z"/>`,
  body:p=>`
   <ellipse cx="127" cy="231" rx="79" ry="5" fill="#04090c" opacity=".13"/>
   ${layer('kit-lid',`<path d="m42 61 153-27 13 78-170 27-8-66Z" fill="#1c2b31" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="m44 65 146-25 11 68-158 25-7-59Z" fill="#56635f" stroke="#8c9890" stroke-width="1.2"/><path d="m49 70 135-24 10 58-146 24Z" fill="#5b3038" stroke="#282832" stroke-width="1.5"/><path d="m54 75 125-22 7 45-133 23Z" fill="#85494d"/><path d="m53 80 121-20m-119 24 120-20m-118 24 120-20m-117 24 118-20" class="va-detail-only" fill="none" stroke="#ad7471" stroke-width=".75" opacity=".5"/><path d="m45 63 7 65m134-85 9 65" fill="none" stroke="#d0c8ae" stroke-width="1" stroke-dasharray="2 3"/><path d="m49 65 16-3-1 6-13 2Zm125-22 15-3 3 10-13 1Z" fill="#bd9d63" stroke="#514e3e" stroke-width="1.2"/>`)}
   <path d="m34 139 160-30 31 64-11 20-141 32-37-30Z" fill="#1a2c33" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
   <path d="m40 143 150-27 26 53-143 33Z" fill="#873f48" stroke="#121e27" stroke-width="2"/>
   <path d="m46 145 137-25 25 45-135 31Z" fill="#632d39"/>
   <path d="m72 203 142-33 1 17-140 32-33-26-1-17Z" fill="url(#${p}-steel-dark)"/>
   ${layer('kit-map',`<path d="m52 128 49-14 23 43-49 17Z" fill="#baaa87" stroke="#4a5146" stroke-width="1.3"/><path d="m58 125 44-10 17 36-43 17Z" fill="url(#${p}-paper)"/><path d="m71 127 10 32m6-38 11 32" fill="none" stroke="#a49473" stroke-width="1"/><path d="m66 137 14-6 11 14 15-6" fill="none" stroke="#8f6555" stroke-width="1.2" stroke-dasharray="2 2"/><path d="m69 135 4 4m-1-5-2 6m32 5 5-2" stroke="#76614f" stroke-width="1.2"/><ellipse cx="59" cy="132" rx="8" ry="11" transform="rotate(-19 59 132)" fill="#d8cbaa" stroke="#6a6b58" stroke-width="1.2"/><path d="M58 124c-5 4-3 12 1 14 5 1 6-7 2-9-3-2-5 4-2 5" fill="none" stroke="#8e876d" stroke-width="1"/><path d="m78 158 32-10 3 6-32 10Z" fill="#6c7360" opacity=".7"/>`)}
   ${layer('kit-foam-sword',`<path d="m89 166 54-69 8-2 3 8-53 70-5 4Z" fill="#244855" stroke="#152d37" stroke-width="2"/><path d="m92 167 54-67 4 1-53 69Z" fill="#9cbdc4"/><path d="m99 153 13 10-5 6-14-11Z" fill="#a4bab2" stroke="#29454c" stroke-width="1.4"/><path d="m91 164 8 6-12 15-7-6Z" fill="#466b78" stroke="#18323d" stroke-width="1.7"/><path d="m86 172 7 5m-10-1 7 5" stroke="#c0caba" stroke-width="1.5"/><path d="m110 139 8-8m10-12 6-7" stroke="#cfdbd0" stroke-width="1.1"/>`)}
   ${layer('kit-helmet',`<path d="m142 123 23-15 22 11 6 36-27 18-28-11Z" fill="#8a7150" stroke="#282d2b" stroke-width="2" stroke-linejoin="round"/><path d="m146 122 18-10 18 9 5 30-22 15-22-8Z" fill="#c0a579"/><path d="m164 112 1 54-22-8 3-36Z" fill="#d6bc8b"/><path d="m166 116 14 7 4 25-16 9Z" fill="#ad8e60"/><path d="m149 122 2 29m4-32 2 34m14-34 1 27m5-24 1 22" stroke="#8d704c" stroke-width="1.3"/><path d="m145 138 38-8 2 9-39 8Z" fill="#df9759" stroke="#9a5d3c" stroke-width="1.2"/><path d="m150 140 6-2m2-1 6-1m3-1 6-1m3-1 4-1" stroke="#f2c087" stroke-width="1.6"/><path d="m151 153 9-2m10-3 8-3" stroke="#4b4939" stroke-width="2.1"/>`)}
   ${layer('kit-plume',`<path d="m159 111-4-18 5-6 4 7 4-4 4 9-3 14Z" fill="#c1a77a" stroke="#5d533e" stroke-width="1.6"/><path d="m160 91 4 18m3-14 1 12" stroke="#efe0b7" stroke-width="1.3"/>`)}
   <path d="m43 150 3 39 30 23m4 0 128-30" fill="none" stroke="#c2c6b2" stroke-width="1" stroke-dasharray="2 3"/>
   <path d="m78 203 8-2 3 15-9 2Zm104-25 9-2 2 15-8 2Z" fill="url(#${p}-brass)" stroke="#2b393a" stroke-width="1.1"/><path d="m130 202 28-7 4 7-27 8Z" fill="#111c22" stroke="#89968e" stroke-width="1.5"/>
   <path d="m36 139 14 4m145-34 11 7m9 57 8 1m-151 42 1 7" stroke="#a6b1a4" stroke-width="1.5"/>
  `,
  motion:{"duration":1640,"layers":[{"name":"kit-lid","origin":[122,124],"frames":[{"at":0},{"at":0.16,"rotate":1.6},{"at":0.4,"rotate":-8,"scaleY":1.08},{"at":0.9,"rotate":-4.800000000000001,"scaleY":1.04},{"at":1,"rotate":-4.800000000000001,"scaleY":1.04}]},{"name":"kit-map","origin":[86,147],"frames":[{"at":0},{"at":0.35,"y":-6.4,"rotate":2},{"at":0.72,"y":-3.2,"rotate":1},{"at":1}]},{"name":"kit-foam-sword","origin":[115,140],"frames":[{"at":0},{"at":0.38,"y":-19.200000000000003,"rotate":-3},{"at":0.7,"y":-6.4,"rotate":-1},{"at":1}]},{"name":"kit-helmet","origin":[164,144],"frames":[{"at":0},{"at":0.5,"y":-14.4},{"at":0.76,"y":1.6},{"at":1}]},{"name":"kit-plume","origin":[163,111],"frames":[{"at":0},{"at":0.48,"y":-14.4,"rotate":-4},{"at":0.71,"y":1.6,"rotate":15},{"at":0.9,"rotate":5},{"at":1,"rotate":4}]}]}
 },
 'gift-aura-meter':{
  name:'Aura Meter',type:'gift',series:'Internet Relics',material:'Scratched cast housing, ivory dial, brass needle and green indicator glass',
  alt:'A heavy scratched analog meter with an ivory graduated dial, an oversize brass needle, a green indicator lens and one loose screw beside its rubber foot.',
  mini:`<path d="M4 4h15l3 3v13H3V7Z" fill="#334449" stroke="#8e9d98" stroke-width=".8"/><path d="M6 6h12v9H6Z" fill="#e2d8bd"/><path d="M7 12a5 5 0 0 1 10 0" fill="none" stroke="#66736b" stroke-width=".9"/><path d="m12 13 3-5" stroke="#9a7945" stroke-width="1.5"/><circle cx="7" cy="18" r="1.5" fill="#b2c987"/><path d="M14 18h4" stroke="#99a79e" stroke-width=".8"/><path d="M5 21h3m9 0h3" stroke="#0a171f" stroke-width="2"/>`,
  silhouette:`<path d="M64 58h124l24 20v123l-14 13h-9v15h-28v-15H84v15H57v-20l-10-11V76l17-18Zm4 21v83h119V79H68Z" fill-rule="evenodd"/>`,
  body:p=>`
   <ellipse cx="129" cy="232" rx="76" ry="4.5" fill="#03090c" opacity=".13"/>
   <path d="m65 57 120 1 24 19 3 119-15 19-137-2-16-19 2-117Z" fill="#16242b" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
   <path d="m185 58 24 19 3 119-15 19-6-30Z" fill="url(#${p}-steel-dark)"/>
   <path d="m63 64 119 1 16 15 2 114-10 12-130-1-9-13 2-111Z" fill="#46595e" stroke="#aab4aa" stroke-width="1.4"/>
   <path d="M65 80h118l3 85H64Z" fill="#172c32" stroke="#08171f" stroke-width="3"/>
   <path d="M69 84h110l3 76H68Z" fill="url(#${p}-ivory)" stroke="#8e927e" stroke-width="1.1"/>
   <path d="M75 148c1-32 18-52 49-53 27 1 44 19 49 50" fill="none" stroke="#85907b" stroke-width="6"/><path d="M77 148c1-31 18-50 47-51 26 1 42 18 47 48" fill="none" stroke="#d5cdb4" stroke-width="2"/>
   <g fill="none" stroke="#526658" stroke-width="1.5"><path d="m77 142 8-1m-5-14 7 3m2-14 6 5m4-13 5 7m6-13 2 8m12-10v9m14-8-2 9m13-5-5 7m13 0-6 5m12 8-8 2"/></g>
   <text x="102" y="137" font-family="sans-serif" font-size="10" letter-spacing="2" fill="#777f67">AURA</text>
   <text x="95" y="153" font-family="monospace" font-size="5.8" letter-spacing=".6" fill="#93927b">FOR DISPLAY ONLY</text>
   ${layer('aura-needle',`<path d="m124 151 32-54-23 58Z" fill="#735c3b" stroke="#534d38" stroke-width="1"/><path d="m126 148 30-51-24 53Z" fill="#dbbc77"/><circle cx="126" cy="151" r="6.2" fill="url(#${p}-brass)" stroke="#44564e" stroke-width="1.3"/><circle cx="126" cy="151" r="2.1" fill="#415449"/>`)}
   <path d="M70 88h106M72 157h104" stroke="#f2ecd8" stroke-width="1.2" opacity=".7"/>
   <circle cx="78" cy="185" r="10" fill="#192c2b" stroke="#b3bd9e" stroke-width="1.5"/>
   ${layer('aura-lamp',`<circle cx="78" cy="185" r="6.8" fill="url(#${p}-jade-glass)"/><path d="M74 182c1-2 4-3 7-1" fill="none" stroke="#d4deb1" stroke-width="1.6" stroke-linecap="round"/><circle cx="80" cy="188" r="1.3" fill="#88b06d"/>`)}
   <path d="M105 179h64v13h-64Z" fill="#23373e" stroke="#677970" stroke-width="1"/><path d="M110 183h33m-33 4h22" stroke="#9aa68d" stroke-width="1.1"/>
   <path d="m64 207 22 1v15H64Zm97 1h28v15h-28Z" fill="#101d24" stroke="#3a5054" stroke-width="1.5"/>
   <path d="m65 211 17 1m84 1h19" stroke="#667574" stroke-width="1.1"/>
   ${screw(61,76)}${screw(187,80)}${screw(62,194)}${screw(189,194)}
   <g class="va-detail-only" fill="none" stroke="#a4b1a2" stroke-width=".8" opacity=".7"><path d="m60 93-2 10m129 67 3 9m-5-47 3-8m-122 53 7-2m101-4 5 3"/></g>
   <path d="m207 215 11-10 3 4-10 12Z" fill="url(#${p}-steel)" stroke="#24383e" stroke-width="1.1"/><path d="m209 214 8-7" stroke="#303f41" stroke-width="1.2"/>
  `,
  motion:{duration:1370,layers:[
   {name:'aura-needle',origin:[126,151],frames:[{at:0,rotate:-32},{at:.16,rotate:-34},{at:.54,rotate:18},{at:.72,rotate:-6},{at:.86,rotate:3},{at:1,rotate:0}]},
   {name:'aura-lamp',origin:[78,185],frames:[{at:0,opacity:.42},{at:.4,opacity:.42},{at:.62,opacity:1},{at:.75,opacity:.7},{at:1,opacity:1}]}
  ]}
 },
 'gift-copium-tank':{
  name:'Copium Reserve Tank',type:'gift',series:'Internet Relics',material:'Bottle-green pressure glass, cast base, brass fittings and rubber hose',
  alt:'A squat bottle-green imaginary reserve tank with a thick metal foot, a brass valve, a short bent hose, a small ivory pressure dial and one bubble inside.',
  mini:`<path d="M8 7h8l4 4v10H5V11Z" fill="#417f69" stroke="#173c36" stroke-width="1"/><path d="M9 6h6v2H9Z" fill="#b5b99a"/><path d="M12 3v4m-4-4h8" stroke="#a2a98d" stroke-width="1.6"/><path d="M5 20h15v3H5Z" fill="#667b73"/><path d="M9 12h7v5H9Z" fill="#d7d0b2"/><path d="M16 6c7-1 7 4 7 8" fill="none" stroke="#1c3434" stroke-width="2"/><circle cx="18" cy="9" r="2.6" fill="#e0d9bc" stroke="#526c5c" stroke-width=".8"/><path d="M18 9V7" stroke="#916d43" stroke-width=".8"/><path d="M7 10v7" stroke="#a2bda0" stroke-width="1"/>`,
  silhouette:`<path d="M103 29h54v14h-19v11h18v18c22 2 31 14 35 33l12 86-12 28H65l-10-28 7-82c3-21 13-34 33-36V55h18V43h-10V29Zm56 30c43-4 65 12 64 52l-8 25-10-7 6-20c0-26-14-36-50-29Z"/>`,
  body:p=>`
   <ellipse cx="127" cy="231" rx="71" ry="5" fill="#03090c" opacity=".13"/>
   <path d="M154 64c36-9 64 8 65 32 2 15-4 28-6 39" fill="none" stroke="#09191d" stroke-width="12" stroke-linecap="round"/>
   <path d="M154 64c36-9 64 8 65 32 2 15-4 28-6 39" fill="none" stroke="#344d4c" stroke-width="7" stroke-linecap="round"/>
   <path d="M169 65c26-2 42 11 44 28" fill="none" stroke="#71867a" stroke-width="1.4"/>
   <path d="m207 130 12 2-3 17-10-2Z" fill="url(#${p}-brass)" stroke="#223f3c" stroke-width="1.3"/><path d="m209 137 8 1m-8 3 7 1" stroke="#6d6b4b" stroke-width="1.2"/>
   <path d="M99 77c-20 4-31 18-34 42l-7 74c0 18 20 29 66 29s68-10 68-28l-9-75c-3-24-15-38-37-42Z" fill="#163d35" stroke="${ink}" stroke-width="2.7"/>
   <path d="M101 81c-18 3-28 18-30 39l-7 70c0 15 18 24 60 24s61-10 61-24l-8-69c-2-23-13-37-33-40Z" fill="url(#${p}-jade-glass)"/>
   <ellipse cx="124" cy="90" rx="32" ry="11" fill="#9fbd9c" opacity=".35"/>
   <path d="M78 112c-4 18-4 43-6 70 0 14 11 18 21 20l-4-95Z" fill="#b2cbb0" opacity=".25"/>
   <path d="M158 103c11 5 16 12 18 30l6 53c1 12-11 20-29 24l7-66Z" fill="#14372e" opacity=".68"/>
   <path d="M80 112c-4 20-4 41-6 60m1 10v8" fill="none" stroke="#c0d4b7" stroke-width="2" stroke-linecap="round"/>
   <path d="M99 77V60h49v17c0 8-49 8-49 0Z" fill="url(#${p}-steel-dark)" stroke="#17312e" stroke-width="1.4"/>
   <ellipse cx="123" cy="61" rx="24" ry="7" fill="#b3bfac" stroke="#344e42" stroke-width="1.2"/>
   <path d="M119 39h9v22h-9Z" fill="url(#${p}-brass)" stroke="#263f36" stroke-width="1.1"/>
   ${layer('tank-valve',`<ellipse cx="123" cy="37" rx="25" ry="7" fill="#314b42" stroke="#b9b894" stroke-width="1.8"/><path d="m100 36 46 2m-23-8v14" stroke="#b8b68b" stroke-width="3"/><circle cx="123" cy="37" r="5" fill="url(#${p}-brass)" stroke="#405449" stroke-width="1.1"/>`)}
   <path d="m148 70 17 1 7 18-12 7-13-19Z" fill="url(#${p}-brass)" stroke="#294438" stroke-width="1.3"/>
   <circle cx="174" cy="94" r="20" fill="#1a3630" stroke="#b1baa0" stroke-width="2"/>
   <circle cx="174" cy="94" r="15" fill="url(#${p}-ivory)" stroke="#54745b" stroke-width="1.1"/>
   <path d="m162 95 3-1m0-8 3 2m6-7v4m9 1-3 3m6 6-4-1" stroke="#5d765f" stroke-width="1.2"/>
   ${layer('tank-gauge',`<path d="m174 96 5-12-3 14Z" fill="#ac8150" stroke="#677458" stroke-width=".7"/><circle cx="174" cy="96" r="2" fill="#6b775c"/>`)}
   <path d="m89 133 65-1 5 44-72 3Z" fill="#173b31" stroke="#123128" stroke-width="1.5"/>
   <path d="m92 135 59-1 4 38-65 3Z" fill="url(#${p}-paper)" stroke="#81916c" stroke-width=".8"/>
   <text x="97" y="151" font-family="sans-serif" font-size="8.5" font-weight="700" letter-spacing="1.3" fill="#365844">RESERVE</text>
   <path d="M99 157h42m-42 5h31" stroke="#86936d" stroke-width="1"/><path d="m97 168 47-1" stroke="#9fa47e" stroke-width=".6"/>
   ${layer('tank-bubble',`<circle cx="114" cy="120" r="5" fill="#c4d6ae" opacity=".35" stroke="#b9cda6" stroke-width=".8"/><path d="M111 118c1-2 3-2 4-1" fill="none" stroke="#e0e8c6" stroke-width="1"/>`)}
   <path d="M59 189c10 14 119 18 133 0l3 17c-11 20-128 21-140 0Z" fill="url(#${p}-steel-dark)" stroke="#0f2b2b" stroke-width="2"/>
   <path d="M58 195c23 13 110 15 135 0M61 209c28 10 103 11 130-1" fill="none" stroke="#8fa799" stroke-width="1.2"/>
   <path d="m65 211 4 12h25l-3-7m65-1-2 8h27l4-13" fill="#102a28" stroke="#294a3f" stroke-width="1.4"/>
   <g class="va-detail-only" fill="none" stroke="#bad0b2" stroke-width=".65" opacity=".5"><path d="m83 186 7 5m73-71 2 10m-67-26 10-1m44 87 4 1"/></g>
  `,
  motion:{duration:1510,layers:[
   {name:'tank-valve',origin:[123,37],frames:[{at:0},{at:.18,rotate:-4},{at:.5,rotate:48},{at:.75,rotate:42},{at:1,rotate:42}]},
   {name:'tank-bubble',origin:[114,120],frames:[{at:0,opacity:0},{at:.28,y:8,opacity:0},{at:.47,y:0,opacity:.8},{at:.83,y:-28,opacity:.6},{at:1,y:-34,opacity:0}]},
   {name:'tank-gauge',origin:[174,96],frames:[{at:0},{at:.4,rotate:-5},{at:.65,rotate:22},{at:.84,rotate:-3},{at:1,rotate:3}]}
  ]}
 },
 'gift-cold-wallet':{
  name:'Cold Wallet Relic',type:'gift',series:'Chain Signals',material:'Folded brushed steel, dark felt, smoked screen and ivory ceramic',
  alt:'A folded steel presentation case lined with dark felt holds a generic closed device sculpture, with a hinged lid, front clasp and recessed lock-mark display.',
  mini:`<path d="m4 5 13-2 3 10-16 3Z" fill="#899b9d" stroke="#2a4048" stroke-width=".8"/><path d="m6 7 9-2 2 6-10 3Z" fill="#20333c"/><path d="m3 16 15-5 5 8-17 4Z" fill="#809698" stroke="#2b434a" stroke-width=".8"/><path d="m6 16 11-3 3 5-13 3Z" fill="#23343c"/><path d="m9 16 7-2 2 3-8 3Z" fill="#a4afaa"/><path d="m11 16 4-1 1 2-4 1Z" fill="#263f49"/><path d="m11 21 4-1" stroke="#d4d7bd" stroke-width="1.5"/>`,
  silhouette:`<path d="m61 50 124-24 13 83 23 62-8 25-133 31-37-27-6-66 11-11-1-56 14-17Z"/>`,
  body:p=>`
   <ellipse cx="129" cy="232" rx="79" ry="4" fill="#03090d" opacity=".12"/>
   ${layer('wallet-lid',`<path d="m60 51 125-24 13 80-150 30-2-68Z" fill="#314952" stroke="#101e27" stroke-width="2.8" stroke-linejoin="round"/><path d="m63 56 118-23 10 68-139 29-1-61Z" fill="url(#${p}-steel)" stroke="#c1cac0" stroke-width="1.2"/><path d="m68 62 106-20 9 54-126 26-1-49Z" fill="#14252f" stroke="#495f61" stroke-width="1.6"/><path d="m74 65 95-18 8 43-115 24-1-38Z" fill="#233840"/><path d="m79 70 85-17 5 29-100 21Z" fill="#1a2c36"/>
    <path d="m57 66 6 61m114-91 9 62m-122 23 116-24" fill="none" stroke="#e0e1cb" stroke-width=".9"/><path d="m69 57 13-2m82-16 11-2m-111 92 13-3" class="va-detail-only" stroke="#5c767d" stroke-width="1.2"/>
   `)}
   <path d="m43 140 151-30 26 61-8 23-132 33-38-28-4-44Z" fill="#223942" stroke="#0d1b25" stroke-width="3" stroke-linejoin="round"/>
   <path d="m45 139 148-29 26 53-138 35Z" fill="url(#${p}-steel)" stroke="#c3ccc2" stroke-width="1.4"/>
   <path d="m54 143 133-26 22 42-125 32Z" fill="#172c36" stroke="#536b6d" stroke-width="1.4"/>
   <path d="m60 147 121-23 17 32-112 28Z" fill="#213740"/>
   <g class="va-detail-only" stroke="#3b5459" stroke-width=".6"><path d="m70 144 5 31m4-33 7 33m3-35 7 32m3-34 8 32m2-34 8 31m2-33 8 31m2-32 8 29m2-32 8 29m2-30 8 28m2-30 8 27"/></g>
   <path d="m83 197 131-34-2 25-132 32-34-25-1-33Z" fill="url(#${p}-steel-dark)" stroke="#132c37" stroke-width="1.3"/>
   <path d="m47 166 35 28 131-33M81 215l128-31" fill="none" stroke="#aebfb9" stroke-width="1.3"/>
   <path d="m92 150 69-16 18 24-72 20-18-16Z" fill="#0a1b25" stroke="#6d8584" stroke-width="1.3"/>
   <path d="m95 145 66-15 15 24-69 19-16-15Z" fill="url(#${p}-steel)" stroke="#d1d6c6" stroke-width="1.3"/>
   <path d="m107 146 35-9 9 15-36 10Z" fill="#1b3744" stroke="#516a70" stroke-width="1"/>
   ${layer('wallet-display',`<path d="m123 144 10-2 4 9-11 3Z" fill="#b3c9be"/><path d="m126 145-1-3 5-1 2 3m-4 4 4-1" fill="none" stroke="#395b5c" stroke-width="1.2"/>`)}
   <path d="m151 139 8-2 8 12-9 2Z" fill="#d8ddce" stroke="#5c7474" stroke-width=".7"/><path d="m112 169 53-14" stroke="#778c8a" stroke-width=".9"/>
   <path d="m68 132 14-3 3 6-14 3Zm89-18 14-3 3 6-14 3Z" fill="#cad0c1" stroke="#425e62" stroke-width="1.1"/>
   ${layer('wallet-clasp',`<path d="m139 189 18-5 4 20-19 5Z" fill="url(#${p}-chrome)" stroke="#17343e" stroke-width="1.3"/><path d="m143 194 10-3 2 8-10 3Z" fill="#364e55"/><path d="m144 189 11-3" stroke="#edf1df" stroke-width="1.3"/>`)}
   ${screw(53,151)}${screw(199,161)}
   <path d="m87 219 11-3m93-27 10-3m-150-2 4 4" class="va-detail-only" stroke="#bcc8b6" stroke-width="1"/>
  `,
  motion:{"duration":1580,"layers":[{"name":"wallet-clasp","origin":[149,191],"frames":[{"at":0},{"at":0.18,"rotate":4},{"at":0.38,"rotate":-34,"y":-3},{"at":0.88,"rotate":-28,"y":-2},{"at":1,"rotate":-28,"y":-2}]},{"name":"wallet-lid","origin":[123,119],"frames":[{"at":0},{"at":0.27,"rotate":2,"y":1},{"at":0.57,"rotate":-9,"y":-6,"scaleY":1.15},{"at":0.83,"rotate":-6,"y":-3,"scaleY":1.09},{"at":1,"rotate":-6,"y":-3,"scaleY":1.1}]},{"name":"wallet-display","origin":[130,148],"frames":[{"at":0,"opacity":0.25},{"at":0.48,"opacity":0.25},{"at":0.75,"opacity":1},{"at":1,"opacity":1}]}]}
 },
 'gift-block-zero':{
  name:'Block Zero',type:'gift',series:'Chain Signals',material:'Thick transparent glass, interlocking graphite plates and copper plaque',
  alt:'A substantial transparent cube on a graphite plinth contains three interlocking engraved ledger plates, with a copper front plaque and visible glass edge thickness.',
  mini:`<path d="m12 2 9 5v12l-9 4-9-5V7Z" fill="#6b9299" fill-opacity=".3" stroke="#b0c4c1" stroke-width=".9"/><path d="m3 7 9 5 9-5m-9 5v11" fill="none" stroke="#d0ddd0" stroke-width=".7"/><path d="m6 8 8-3 4 3-8 3Zm0 5 8-3 4 3-8 3Zm0 5 8-3 4 3-8 3Z" fill="#223941" stroke="#819d9d" stroke-width=".5"/><path d="m5 13 5 2v5l-5-2Z" fill="#bb8257"/><path d="m2 19 10 5 11-5" fill="none" stroke="#263c45" stroke-width="1.5"/>`,
  silhouette:`<path d="m126 35 85 47v126l-85 44-85-49V82l85-47Zm-79 58v102l79 46 79-40V93l-79 43-79-43Z" fill-rule="evenodd"/>`,
  body:p=>`
   <ellipse cx="128" cy="236" rx="82" ry="4" fill="#03090d" opacity=".12"/>
   <path d="m43 196 83-43 86 45v18l-86 32-83-47Z" fill="#101e28" stroke="#0c1822" stroke-width="2.5"/>
   <path d="m43 196 83-44 86 46-86 43Z" fill="#344b55" stroke="#748e91" stroke-width="1.1"/><path d="m126 241 86-43v10l-86 34Z" fill="#1e3640"/><path d="m47 199 79 44 82-41" fill="none" stroke="#9eafaa" stroke-width="1"/>
   <path d="m46 87 80-45 80 44-79 45Z" fill="#9fbdc1" opacity=".16"/>
   <path d="m46 87 80 44v104l-80-45Z" fill="#214c5c" opacity=".2"/><path d="m126 42 80 44v104l-80-45Z" fill="#7da4ad" opacity=".13"/>
   <path d="m47 88 79-44 78 42-77 44Z" fill="none" stroke="#aec9c8" stroke-width="1.6"/>
   <path d="M126 44v102" stroke="#94b4b7" stroke-width="1" opacity=".5"/>
   ${layer('block-plate-lower',`<path d="m67 166 75-37 44 24v10l-75 39-44-26Z" fill="#142b35" stroke="#0b202b" stroke-width="1.6"/><path d="m67 166 75-37 44 24-75 39Z" fill="#435e65" stroke="#99afab" stroke-width="1.1"/><path d="m78 164 64-31 32 19-64 33Z" fill="#233f48"/><path d="m89 164 49-24 21 12-49 26Z" fill="none" stroke="#8a9d96" stroke-width=".8"/><path d="m99 165 30-15m-23 18 31-16" stroke="#c3c9ad" stroke-width=".8"/><path d="m111 192 75-39v10l-75 39Z" fill="#122c37"/><path d="m78 172 6 4 7-4m50-29 8 4 7-4" fill="none" stroke="#b27b51" stroke-width="2.3"/>`)}
   ${layer('block-plate-middle',`<path d="m66 137 76-37 45 24v11l-76 38-45-26Z" fill="#132a35" stroke="#0c202c" stroke-width="1.6"/><path d="m66 137 76-37 45 24-76 39Z" fill="#4b666b" stroke="#9bb6ad" stroke-width="1.1"/><path d="m78 135 64-31 33 19-65 32Z" fill="#243f48"/><path d="m91 135 45-23 25 12-46 25Z" fill="none" stroke="#a5b2a4" stroke-width=".8"/><path d="m105 133 26-13m-19 17 25-13" stroke="#c2c6aa" stroke-width=".8"/><path d="m111 163 76-39v11l-76 38Z" fill="#112d38"/><path d="m77 144 7 4 8-4m48-32 9 4 9-3" fill="none" stroke="#b78055" stroke-width="2.3"/>`)}
   ${layer('block-plate-upper',`<path d="m65 109 77-38 46 25v10l-77 39-46-26Z" fill="#152d38" stroke="#0c212c" stroke-width="1.6"/><path d="m65 109 77-38 46 25-77 39Z" fill="#536d73" stroke="#b3c5b9" stroke-width="1.1"/><path d="m77 107 65-32 34 20-65 32Z" fill="#294550"/><path d="m90 107 47-23 25 13-47 24Z" fill="none" stroke="#a9bbb0" stroke-width=".8"/><path d="m105 105 27-13m-21 18 28-14" stroke="#d2d1b3" stroke-width=".8"/><path d="m111 135 77-39v10l-77 39Z" fill="#163440"/><path d="m76 116 8 4 8-5m48-32 10 4 8-4" fill="none" stroke="#c08b5a" stroke-width="2.5"/>`)}
   <path d="m46 87 81 44v104l-81-45Z" fill="#b1ced0" opacity=".12" stroke="#bed3cc" stroke-width="1.5"/>
   <path d="m127 131 79-45v104l-79 45Z" fill="#5c96a4" opacity=".16" stroke="#b9d1ca" stroke-width="1.5"/>
   <path d="m47 88 79 43 79-45m-78 45v102m78-145v101l-77 43" fill="none" stroke="#c5d8cf" stroke-width="1.7"/>
   <path d="m53 94 2 91 64 36m17-85 62-36-1 85-61 32" fill="none" stroke="#a5c5c7" stroke-width="1" opacity=".65"/>
   <path d="m64 148 42 23v31l-42-24Z" fill="#724b39" stroke="#132d35" stroke-width="1.5"/><path d="m66 147 42 23v28l-42-24Z" fill="url(#${p}-copper)" stroke="#d3ac7d" stroke-width="1"/>
   <text x="71" y="164" font-family="monospace" font-size="7" font-weight="700" letter-spacing="1" fill="#493d33" transform="rotate(29 71 164)">ZERO</text>
   <path d="m71 167 29 16m-28-12 20 11" stroke="#925f40" stroke-width=".8"/>
   <g fill="#d5b686" stroke="#6c6951" stroke-width=".7"><circle cx="70" cy="154" r="1.7"/><circle cx="103" cy="173" r="1.7"/><circle cx="70" cy="172" r="1.7"/><circle cx="103" cy="191" r="1.7"/></g>
   ${layer('block-reflection',`<path d="m59 94 10 83 10 5-6-79Zm118 12 9-5-2 79-9 5Z" fill="#e2ece0" opacity=".24"/><path d="m58 84 68-36 65 35" fill="none" stroke="#e4ede0" stroke-width="1.7" opacity=".7"/>`)}
  `,
  motion:{"duration":1520,"layers":[{"name":"block-plate-lower","origin":[127,165],"frames":[{"at":0,"x":-12.5,"y":5},{"at":0.25,"x":-12.5,"y":5},{"at":0.52,"x":2.5},{"at":0.75},{"at":1}]},{"name":"block-plate-middle","origin":[127,136],"frames":[{"at":0,"x":15,"y":-5},{"at":0.38,"x":15,"y":-5},{"at":0.65,"x":-2.5},{"at":0.85},{"at":1}]},{"name":"block-plate-upper","origin":[127,108],"frames":[{"at":0,"x":-10,"y":-7.5},{"at":0.47,"x":-10,"y":-7.5},{"at":0.75,"x":2},{"at":0.94},{"at":1}]},{"name":"block-reflection","origin":[128,127],"frames":[{"at":0,"opacity":0.25},{"at":0.55,"opacity":0.25},{"at":0.83,"opacity":1},{"at":1,"opacity":0.45}]}]}
 },
 'gift-last-tab':{
  name:'Last Tab Open',type:'gift',series:'Internet Relics',material:'Worn graphite CRT, amber phosphor, ivory keys and a bent metal antenna',
  alt:'A small worn CRT terminal with a deep recessed screen reading still here, bent antenna, amber power light and a separate compact keyboard.',
  mini:`<path d="m4 3 14-1 3 3v12L6 19l-3-2Z" fill="#394b53" stroke="#718c8e" stroke-width=".7"/><path d="m6 5 11-1 1 10-12 1Z" fill="#172d31" stroke="#849a8a" stroke-width=".7"/><path d="M8 10h7m-7 2h4" stroke="#bdbe89" stroke-width="1"/><path d="m3 19 15-2 4 5-18 2Z" fill="#748c87" stroke="#263f46" stroke-width=".6"/><path d="m6 20 10-1m-9 2 11-1" stroke="#d3d3b3" stroke-width="1"/><path d="m16 2 2-2 1 1" stroke="#afae8f" stroke-width=".7"/><circle cx="18" cy="16" r=".9" fill="#c7924e"/>`,
  silhouette:`<path d="m65 48 106-7 15 12 19 14v96l-19 16-47 5 9 8 42-3 27 24-148 19-28-24 24-10 42-5v-5l-51-7-12-18V65l21-17Zm10 27v73l95-4V67l-95 8Z" fill-rule="evenodd"/>`,
  body:p=>`
   <ellipse cx="129" cy="233" rx="83" ry="4.5" fill="#03090d" opacity=".12"/>
   <path d="m164 53 14-32 14 7-7 22" fill="none" stroke="#142831" stroke-width="5" stroke-linejoin="round"/>
   <path d="m164 51 14-30 12 6-7 21" fill="none" stroke="#a8b4aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
   <circle cx="164" cy="53" r="4.5" fill="url(#${p}-brass)" stroke="#344e4d" stroke-width="1.2"/>
   <path d="m66 49 106-8 30 26 1 91-17 20-115 11-22-23-1-99Z" fill="#172b34" stroke="#0d1d27" stroke-width="3" stroke-linejoin="round"/>
   <path d="m172 41 30 26 1 91-17 20-6-32-4-91Z" fill="#263f49"/>
   <path d="m68 55 102-8 15 16 2 94-9 16-110 9-13-17V69Z" fill="#566f72" stroke="#9bad9e" stroke-width="1.3"/>
   <path d="m75 67 91-6 9 10 2 75-9 13-96 7-9-13-1-72Z" fill="#12272e" stroke="#233f47" stroke-width="2.5"/>
   <path d="m80 74 80-6 8 9 1 61-6 10-84 6-8-9-1-61Z" fill="#1b3a3e" stroke="#7d9986" stroke-width="1.2"/>
   <path d="M76 84c27-10 58-13 88-9l1 62c-26 8-54 10-88 7Z" fill="#25494a"/>
   <path d="M79 83c27-8 55-10 82-7" fill="none" stroke="#8aa88b" stroke-width="1" opacity=".55"/>
   <defs><clipPath id="${p}-terminal-screen"><path d="M76 84c27-10 58-13 88-9l1 62c-26 8-54 10-88 7Z"/></clipPath><clipPath id="${p}-terminal-type"><rect data-part="terminal-type-mask" x="80" y="98" width="86" height="23"/></clipPath></defs>
   <g clip-path="url(#${p}-terminal-screen)">
    ${layer('terminal-warm',`<path d="M75 76h93v72H75Z" fill="#9cae78" opacity=".08"/><path d="M80 89c17-5 33-7 50-6" fill="none" stroke="#c3cb99" stroke-width="1.2" opacity=".3"/>`)}
    <g clip-path="url(#${p}-terminal-type)"><text x="82" y="112" font-family="monospace" font-size="10.5" letter-spacing=".45" fill="#d1ce96" transform="rotate(-4 82 112)">still here</text></g>
    <path d="M83 124h35m-35 5h15" stroke="#6f9a7c" stroke-width="1.1"/>
    ${layer('terminal-cursor',`<path d="M149 118h7v2h-7Z" fill="#c6c997"/>`)}
    <path data-part="terminal-scan" d="M74 82h96v2H74Z" fill="#b7c69b" opacity=".08"/>
   </g>
   <path d="m72 67 4-2 4 4-3 7-5-2Z" fill="#8f9b88"/><path d="m72 67 5 3-2 5" fill="none" stroke="#cfceb3" stroke-width="1"/>
   <path d="m72 173 107-9m-114-89-1 78" stroke="#b1c0aa" stroke-width="1" opacity=".65"/>
   <path d="m76 163 21-1v8l-21 2Z" fill="#283f46" stroke="#84998d" stroke-width=".7"/><path d="m79 165 14-1m-13 3 13-1" stroke="#9cad96" stroke-width=".8"/>
   <circle cx="163" cy="163" r="4.5" fill="#122c33" stroke="#aeb59b" stroke-width="1"/><circle cx="163" cy="163" r="2.5" fill="#c2904c"/><path d="m162 161 2 1" stroke="#e4ca83" stroke-width="1"/>
   ${screw(61,70)}${screw(178,73)}${screw(64,165)}
   <path d="m110 183 30-3 8 13-49 7Z" fill="#263f46" stroke="#0e2733" stroke-width="1.4"/><path d="m108 188 31-3 4 6-41 6Z" fill="#738d8a"/>
   <path d="m57 199 125-14 33 27-145 19-30-23Z" fill="#263f46" stroke="#132b34" stroke-width="2"/>
   <path d="m58 195 124-13 33 26-145 19-30-23Z" fill="#7e938c" stroke="#bfcbaf" stroke-width="1.1"/>
   <path d="m61 199 118-12 25 19-133 16-22-17Z" fill="#364f52" stroke="#203f44" stroke-width=".8"/>
   <g fill="#c3c6a8" stroke="#18323b" stroke-width=".7">
    <path d="m61 201 10-1 5 4-11 1Zm14-1 10-1 5 4-11 1Zm14-2 10-1 5 4-11 1Zm14-1 10-1 5 4-11 1Zm14-2 10-1 5 4-11 1Zm14-1 10-1 5 4-11 1Zm14-2 10-1 5 4-11 1Zm14-1 13-1 5 4-14 1Z"/>
    <path d="m66 207 12-1 5 4-13 1Zm16-2 10-1 5 4-11 1Zm14-1 10-1 5 4-11 1Zm14-2 10-1 5 4-11 1Zm14-1 10-1 5 4-11 1Zm14-2 10-1 5 4-11 1Zm14-1 10-1 5 4-11 1Zm14-2 14-1 5 4-15 1Z"/>
    <path d="m72 213 17-2 5 4-18 2Zm21-3 51-6 5 4-52 6Zm55-7 10-1 5 4-11 1Zm14-2 24-3 5 4-25 3Z"/>
   </g>
   <path d="m49 205 22 18 135-17m-133 20 139-18" fill="none" stroke="#a5b8a4" stroke-width="1"/>
   <path d="m191 98 5 2v18l-5-1Zm0 25 5 1v13l-5 1Z" fill="#172f39"/>
   <g class="va-detail-only" stroke="#9db39d" stroke-width=".7"><path d="m59 93 3-6m118 67 3 3m-105 18 9-1m72-115 7-1m-115 139 4 3"/></g>
  `,
  motion:{duration:1580,layers:[
   {name:'terminal-warm',origin:[120,111],frames:[{at:0,opacity:.1},{at:.22,opacity:.35},{at:.39,opacity:1},{at:.53,opacity:.8},{at:1,opacity:1}]},
   {name:'terminal-type-mask',origin:[80,110],frames:[{at:0,scaleX:0},{at:.26,scaleX:0},{at:.32,scaleX:.15},{at:.37,scaleX:.15},{at:.43,scaleX:.3},{at:.48,scaleX:.3},{at:.54,scaleX:.47},{at:.6,scaleX:.47},{at:.67,scaleX:.68},{at:.72,scaleX:.68},{at:.82,scaleX:1},{at:1,scaleX:1}]},
   {name:'terminal-cursor',origin:[152,119],frames:[{at:0,opacity:0},{at:.35,opacity:0},{at:.36,opacity:1},{at:.53,opacity:1},{at:.54,opacity:0},{at:.7,opacity:0},{at:.71,opacity:1},{at:1,opacity:1}]},
   {name:'terminal-scan',origin:[120,83],frames:[{at:0,opacity:0},{at:.18,opacity:.1},{at:.67,y:55,opacity:.11},{at:.83,y:61,opacity:0},{at:1,y:61,opacity:0}]}
  ]}
 }
};
