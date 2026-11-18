/**
 * Original VOIDLINE objects with object construction informed by collectible gift research.
 * Free cosmetic illustrations. They do not represent on-chain assets or real token holdings.
 * The research references are documented separately; production objects have their own identities.
 */
const part=(name,body)=>`<g data-part="${name}">${body}</g>`;
const outline='#0a121b';

export const telegramObjects={
 'gift-larp-cap':{
  name:'LARP Cap',type:'gift',series:'Afterhours Guild',
  material:'Waxed canvas, cardboard crest, hand stitching and steel safety pins',
  alt:'An olive-black hand-sewn baseball cap with a corrugated cardboard LARP crest, worn cream stitching, rust-colored brim binding and two steel safety pins.',
  mini:`<path d="M5 14C5 6 9 2 15 3c6 1 8 6 7 13l-4 3-9-1Z" fill="#3c4741" stroke="#141c1a" stroke-width=".8"/><path d="M14 3c3 3 4 7 3 13M8 5c-2 4-2 7-1 10" fill="none" stroke="#a29c7f" stroke-width=".8" stroke-dasharray="1 1"/><path d="M2 17c5-6 9-5 14-2l4 2c-2 5-7 5-12 2-3-2-4-1-7 1Z" fill="#25332f" stroke="#121c1b" stroke-width=".8"/><path d="M2 17c5-6 10-4 15-1" fill="none" stroke="#b3a383" stroke-width=".8"/><path d="M8 19c5 3 8 2 11-1" fill="none" stroke="#9b6c57" stroke-width="1"/><path d="m9 7 6-1v5l-3 3-3-2Z" fill="#c9b78b" stroke="#6f6550" stroke-width=".6"/><path d="m11 8 .2 3 2-.2" fill="none" stroke="#343c34" stroke-width="1"/><path d="m20 10 .5 4" stroke="#c7ccbe" stroke-width="1"/>`,
  silhouette:`<path d="M48 145c-1-46 11-79 45-93 27-12 57-12 81 0 23 12 34 35 35 65 2 13 0 31-5 41-7 18-18 31-35 39-21 12-43 12-66 0l-39-21c-13-5-23-3-31 5l-15 15c-8-21 7-39 30-51Z"/>`,
  body:p=>`
   <defs>
    <linearGradient id="${p}-cap-fabric" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#5a6454"/><stop offset=".24" stop-color="#37483e"/><stop offset=".62" stop-color="#1a2925"/><stop offset="1" stop-color="#101a18"/></linearGradient>
    <linearGradient id="${p}-cap-front" x1="0" y1="0" x2="1" y2=".65"><stop stop-color="#566655"/><stop offset=".28" stop-color="#354b40"/><stop offset=".64" stop-color="#172923"/><stop offset="1" stop-color="#2d4036"/></linearGradient>
    <linearGradient id="${p}-cap-brim" x1=".15" y1="0" x2=".7" y2="1"><stop stop-color="#566354"/><stop offset=".3" stop-color="#33473c"/><stop offset=".62" stop-color="#25342e"/><stop offset="1" stop-color="#422f2a"/></linearGradient>
    <linearGradient id="${p}-cap-edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#d0c7a9"/><stop offset=".32" stop-color="#b1a68b"/><stop offset=".72" stop-color="#8d8b71"/><stop offset="1" stop-color="#9b7157"/></linearGradient>
   </defs>
   <ellipse cx="125" cy="219" rx="81" ry="8" fill="#03080e" opacity=".35"/>
   ${part('cap-back-panel',`<path d="M137 48c35-10 61 7 70 39 7 23 8 45-2 68l-31 29-25-29Z" fill="#15231d" stroke="${outline}" stroke-width="2.2"/><path d="M157 49c31 5 47 29 48 69l-2 35-26 23-7-76Z" fill="#24372d"/><path d="M158 50c21 9 30 39 29 72l-5 49" fill="none" stroke="#596755" stroke-width="3"/><path d="M190 75c9 17 12 43 8 66" fill="none" stroke="#8b6553" stroke-width="1.8"/><path d="m196 112 5-2 1 9-5 2Z" fill="#49382e" stroke="#c5b398" stroke-width=".8"/><path d="m197 114 3-1" stroke="#e2d4b4" stroke-width="1"/>`)}
   ${part('cap-crown',`<path d="M49 146c-2-39 7-73 35-88 24-13 51-15 71-6 21 12 25 43 24 83l-5 35-48 7-48-17Z" fill="url(#${p}-cap-fabric)" stroke="${outline}" stroke-width="2.2"/><path d="M99 53c-24 12-29 46-28 91l24 16 34 2c8-35 8-76-1-113Z" fill="url(#${p}-cap-front)"/><path d="M128 49c18 9 32 30 33 59l-2 54 15 8c6-44 7-91-19-118Z" fill="#2c3d32"/><path d="M83 60C67 77 63 103 63 134" fill="none" stroke="#bdb597" stroke-width="3.2" stroke-linecap="round"/><path d="M82 62c-11 18-14 40-13 68" fill="none" stroke="#68755e" stroke-width="1"/><path d="M130 50c20 16 25 49 24 86l-2 26" fill="none" stroke="#c6b99a" stroke-width="3" stroke-linecap="round"/><path d="M133 54c17 16 22 46 21 79" fill="none" stroke="#63715e" stroke-width="1.2"/><path d="M89 56c12-7 26-10 40-8" fill="none" stroke="#ded1ad" stroke-width="2.4" stroke-linecap="round"/><path d="M55 123c2-27 7-42 17-53" fill="none" stroke="#6b7864" stroke-width="1.2"/><path d="M57 132c4-24 4-43 17-60" fill="none" stroke="#7c8b70" stroke-width=".7" opacity=".45"/><path d="M77 147c26-3 51 4 75 16" fill="none" stroke="#1f3029" stroke-width="5"/><path d="M76 145c27-3 52 4 77 16" fill="none" stroke="#968f75" stroke-width="1.6"/>
    <g class="va-detail-only" fill="none" stroke="#7b8068" stroke-width=".75" stroke-linecap="round"><path d="m79 78 1-3m-2 9 1-3m-2 10 .5-3m-1 10 .4-3m-1 10 .3-3m-1 10 .2-3m63-42 1 3m1 4 1 3m1 5 .5 3m1 5 .4 3m.6 5 .3 3m.3 5 .1 3m0 5v3"/></g>
    <path d="m85 87 38-9 5 32-19 18-21-12Z" fill="#76644b" stroke="#17241e" stroke-width="1.6"/>
    <path d="m87 85 37-8 3 29-18 17-20-10Z" fill="url(#${p}-paper)" stroke="#a18e69" stroke-width="1.1"/>
    <path d="m89 113 20 10 18-17-2 6-17 16-20-12Z" fill="#8f7853"/><path d="m91 116 1 3m4-1 1 3m4-1 1 3m4-1 1 3m6-7 2 2m1-5 2 2m1-5 2 2m1-5 2 2" stroke="#c6af7e" stroke-width="1"/>
    <path d="m92 87 6 2 1-7m18-3-3 5 10 1m-32 23 4-5 4 9m17 0-4-5 9-3" fill="none" stroke="#747c62" stroke-width="1.8"/>
    <path d="m95 94 24-5m-22 8 21-4" stroke="#b2a581" stroke-width=".75"/>
    <text x="94" y="106" transform="rotate(-12 105 102)" font-family="monospace" font-size="10" font-weight="bold" letter-spacing=".6" fill="#314038">LARP</text>
    <path d="m188 103 5 16c2 7-5 10-8 4l-6-17c-1-5 5-8 7-3l6 17" fill="none" stroke="#15251e" stroke-width="4"/>
    <path d="m188 103 5 16c2 7-5 10-8 4l-6-17c-1-5 5-8 7-3l6 17" fill="none" stroke="#b2bcb0" stroke-width="1.7"/>
    <path d="m187 103 2-1 2 6-3 1Z" fill="#d8dcca" stroke="#6f7a6d" stroke-width=".8"/>

    ${part('cap-top-button',`<ellipse cx="130" cy="47" rx="9" ry="4.5" fill="#26372d" stroke="#a0a083" stroke-width="1.2"/><path d="M124 46c3-2 7-2 10 0" fill="none" stroke="#d1c6a4" stroke-width="1.2"/>`)}

   `)}
   ${part('cap-brim',`<path d="M51 141c27-17 50-9 78 4l46 20c-4 16-16 30-34 37-18 6-39 2-63-12l-21-14c-12-7-25 0-37 17-3-18 9-38 31-52Z" fill="#1b251f" stroke="${outline}" stroke-width="2.4"/><path d="M51 138c27-17 50-9 78 4l46 20c-4 15-18 26-34 31-20 4-38-2-59-14l-21-14c-17-8-30-1-41 23 1-20 13-39 31-50Z" fill="url(#${p}-cap-brim)"/><path d="M51 138c25-16 49-8 77 4l47 20" fill="none" stroke="url(#${p}-cap-edge)" stroke-width="3" stroke-linecap="round"/><path d="M20 188c12-22 24-32 43-22l21 15c22 13 42 19 60 13 11-3 21-9 27-17" fill="none" stroke="#a2795c" stroke-width="2"/><path d="M23 181c13-22 27-30 46-20l25 15c21 11 36 13 50 9 10-3 18-7 24-12" fill="none" stroke="#405143" stroke-width="1.5"/><path d="M28 174c14-20 26-24 44-15l26 14c23 12 41 12 60 1" fill="none" stroke="#5b6553" stroke-width="1.1"/><path d="M37 163c12-14 22-17 38-10l28 15c17 8 33 11 47 5" fill="none" stroke="#7b8068" stroke-width=".9"/><path d="M45 153c10-8 20-8 33-2l30 14c13 6 25 8 36 6" fill="none" stroke="#8b8e70" stroke-width=".85"/><path d="M20 188c0-16 7-30 18-40" fill="none" stroke="#d1c7a5" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M85 180c26 15 48 19 67 9" fill="none" stroke="#19251f" stroke-width="2.2"/>
   `)}
   <path data-part="cap-reflection" d="M87 60c-11 18-13 34-13 51m62-53c8 12 12 28 13 46" fill="none" stroke="#d0c8a9" stroke-width="3" stroke-linecap="round" opacity=".25"/>
  `,
  motion:{duration:1740,layers:[
   {name:'cap-back-panel',origin:[159,153],frames:[{at:0},{at:.16,x:-1,y:2,rotate:-3},{at:.4,x:-13,y:0,rotate:-10,scaleX:.7},{at:.63,x:-5,rotate:3},{at:.84,x:1,rotate:-1},{at:1}]},
   {name:'cap-crown',origin:[113,151],frames:[{at:0},{at:.16,y:3,scaleY:.96},{at:.38,x:7,y:-10,rotate:10,scaleX:.66,scaleY:.86},{at:.55,x:2,y:-5,rotate:-4,scaleX:.9},{at:.76,y:2,scaleY:.98},{at:.91,y:-1},{at:1}]},
   {name:'cap-brim',origin:[145,158],frames:[{at:0},{at:.14,rotate:4,y:2},{at:.35,rotate:29,x:7,y:-8,scaleY:.42},{at:.47,rotate:22,x:4,y:-4,scaleY:.62},{at:.68,rotate:-5,y:-2},{at:.84,rotate:2,y:1},{at:1}]},
   {name:'cap-top-button',origin:[130,48],frames:[{at:0},{at:.2,rotate:-2},{at:.42,rotate:4},{at:.61,rotate:-2},{at:.83,rotate:1},{at:1}]},
   {name:'cap-reflection',origin:[120,111],frames:[{at:0,opacity:.25},{at:.18,opacity:.05},{at:.37,x:12,opacity:.65,scaleX:.64},{at:.54,x:5,opacity:.15},{at:.77,opacity:.5},{at:1,opacity:.25}]}
  ]}
 },
 'gift-spook-crystal':{
  name:'Spook Crystal',type:'gift',series:'Ego Archive',
  material:'Smoky amethyst, jade glass and a folded paper specter',
  alt:'An irregular smoky violet and jade crystal containing a little torn-paper specter with two ink eyes. Glass facets separate in sequence, release the paper ghost, and close around it again.',
  mini:`<path d="m12 1 5 7 4 1 1 7-7 7-8-2-5-8 4-6 3 1Z" fill="#312d43" stroke="#151c24" stroke-width=".8"/><path d="m12 2 3 9-5 3-3-6Z" fill="#b3a4c6"/><path d="m15 11 3-4 3 7-5 7Z" fill="#6d9b90"/><path d="m10 14 5-3 1 10-7 1-5-7Z" fill="#665e81"/><path d="m10 15 1-4c1-2 4-1 4 1l1 5-2-1-2 2-2-1Z" fill="#e8e0c8"/><path d="m12 13 .1 1m2-1 .1 1" stroke="#28362f" stroke-width="1"/><path d="m4 12 1-3m15 10-2 2" stroke="#bdd3ba" stroke-width="1"/>`,
  silhouette:`<path d="m123 28 30 36 16 14 11-10 15 35 10 23 3 43-24 31-37 21-28-5-27 6-34-20-15-38 8-39 17-22 14 4 9-28 16 8Z"/><path d="m59 70 4-12 5 12-4 7Zm132-9 5-13 6 13-5 8ZM39 122l5-9 4 10-4 6Z"/>`,
  body:p=>`
   <defs>
    <linearGradient id="${p}-crystal-amethyst" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#d9e4d4"/><stop offset=".24" stop-color="#a49cbc"/><stop offset=".7" stop-color="#6b607e"/><stop offset="1" stop-color="#393348"/></linearGradient>
    <linearGradient id="${p}-crystal-violet" x1=".1" y1="0" x2="1" y2="1"><stop stop-color="#ad9cbc"/><stop offset=".27" stop-color="#78627e"/><stop offset=".65" stop-color="#3d344e"/><stop offset="1" stop-color="#1b2630"/></linearGradient>
    <linearGradient id="${p}-crystal-paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e6e8d5"/><stop offset=".34" stop-color="#b8d2b6"/><stop offset=".7" stop-color="#8aab9d"/><stop offset="1" stop-color="#465e58"/></linearGradient>
   </defs>
   <ellipse cx="127" cy="231" rx="66" ry="6" fill="#07070b" opacity=".34"/>
   ${part('crystal-wisp-back',`<path d="M77 190c-22-27-27-45-13-74 7-15 14-30 12-46 13 20-6 39-4 61 1 22 15 29 15 42Z" fill="#637f79" opacity=".8"/><path d="M173 196c22-16 35-40 29-65-5-19-15-27-10-46 12 11 15 35 14 53 3 21-8 46-25 60Z" fill="#7b998d"/><path d="M184 153c13-29-14-47-10-66 1-9 6-16 5-27 13 18 8 30 8 41 1 16 15 32 6 51Z" fill="#a2c1a5"/><path d="M62 119c6-20 19-26 17-42" fill="none" stroke="#b4cbb6" stroke-width="2" stroke-linecap="round"/>`)}
   <path data-part="shard-bed" d="m123 35 28 36 16 15 12-11 14 32 10 22 2 39-24 28-36 22-28-4-24 5-32-18-15-36 8-37 16-20 13 4 11-31 14 7Z" fill="#242738" stroke="#243039" stroke-width="3"/>
   ${part('shard-crown',`<path d="m124 30 27 40-3 49-39 24-14-54 13 5Z" fill="url(#${p}-crystal-amethyst)" stroke="#4e485f" stroke-width="1.4"/><path d="m124 30 5 54-21 10Z" fill="#c6bad2"/><path d="m124 30 27 40-22 14Z" fill="#9b88ae"/><path d="m129 84 19 35-39 24Z" fill="#d7cadd"/><path d="m95 89 14 54 20-59-21 10Z" fill="#9a8eaa"/><path d="m124 30 5 54-20 59" fill="none" stroke="#e9e6d8" stroke-width="1.9"/><path d="m108 94 16-64 27 40" fill="none" stroke="#b9c9b3" stroke-width="1.2"/><path d="m117 62 5-18 2 20-4 13Z" fill="#ece4d2" opacity=".7"/>`)}
   ${part('shard-left-shoulder',`<path d="m80 87 24 18 5 38-28 20-24-23 11-26Z" fill="url(#${p}-crystal-violet)" stroke="#34463e" stroke-width="1.4"/><path d="m80 87 3 40 21-22Z" fill="#a7bda2"/><path d="m80 87-12 27 15 13Z" fill="#647f6e"/><path d="m83 127 26 16-28 20-24-23Z" fill="#709784"/><path d="m68 114 15 13-26 13Z" fill="#c1d9b8"/><path d="m83 127-2 36 28-20Z" fill="#263e3b"/><path d="m80 87 3 40-26 13m26-13 21-22" fill="none" stroke="#cce0c4" stroke-width="1.2"/>`)}
   ${part('shard-right-shoulder',`<path d="m151 70 17 16 11-11 14 32-4 35-34 26-14-29Z" fill="url(#${p}-crystal-violet)" stroke="#3f4257" stroke-width="1.4"/><path d="m151 70 9 47 19-42-11 11Z" fill="#a6b6b5"/><path d="m160 117 33-10-14-32Z" fill="#647583"/><path d="m160 117 29 25-34 26-14-29Z" fill="#293747"/><path d="m160 117 33-10-4 35Z" fill="#677c85"/><path d="m151 70 9 47 33-10m-33 10-5 51" fill="none" stroke="#bfcec6" stroke-width="1.2"/><path d="m175 98 9-8 5 14Z" fill="#a8c2b5" opacity=".8"/>`)}
   ${part('crystal-paper-specter',`<path d="M115 153c-3-9 1-20 10-23 10-3 18 5 18 15l-1 13 6 9-10-3-6 7-8-5-9 3 3-10-5 3Z" fill="url(#${p}-paper)" stroke="#59685c" stroke-width="1.1"/><path d="M118 143c1-7 5-11 12-10m-12 21 4 4 1 8m11-32c5 3 7 9 6 14" fill="none" stroke="#f4ebd5" stroke-width="1.2"/><path d="m123 145 1-4 3-1 1 5-2 3-3-1Zm10-2 3-1 2 4-1 3-3-1Z" fill="#2b3934"/><path d="m127 154 3-2 2 3-1 3-3-1Z" fill="#a29476"/><path d="m121 136 1 5m17 9-3 3m-17 7 4-1" stroke="#b3a98d" stroke-width=".7"/>
    ${part('crystal-specter-tail',`<path d="M129 164c-2 9 9 11 10 17 1 5-5 10-12 7 15 9 27-2 17-12-5-5-10-5-9-12Z" fill="url(#${p}-paper)" stroke="#75806a" stroke-width=".8"/><path d="M132 168c0 7 11 8 10 15" fill="none" stroke="#f1e6cc" stroke-width="1"/>`)}
   `)}
   ${part('shard-core',`<g opacity=".48"><path d="m109 142 39-24 12 37-21 37-42-18Z" fill="#71958b" stroke="#4e726b" stroke-width="1.5"/><path d="m148 118-10 47-29-23Z" fill="#c3d9c7"/><path d="m148 118 12 37-22 10Z" fill="#96b9ac"/><path d="m109 142 29 23-41 9Z" fill="#8fb09d"/><path d="m138 165 22-10-21 37Z" fill="#476f66"/><path d="m97 174 41-9 1 27Z" fill="#6e9d8c"/><path d="m148 118-10 47-29-23" fill="none" stroke="#dbead7" stroke-width="1.8"/><path d="m124 146 12-9 3 19-10 3Z" fill="#e0e9d8" opacity=".7"/></g>`)}
   ${part('shard-left-base',`<path d="m57 140 24 23 16 11 20 40-24 5-32-18-15-36Z" fill="url(#${p}-crystal-violet)" stroke="#35354c" stroke-width="1.4"/><path d="m57 140 12 37 28-3-16-11Z" fill="#53445c"/><path d="m46 165 23 12-8 24Z" fill="#7d5e7b"/><path d="m69 177 24 42-32-18Z" fill="#302a42"/><path d="m69 177 28-3 20 40-24 5Z" fill="#755876"/><path d="m69 177 25 15 3-18Z" fill="#a995b6"/><path d="m46 165 23 12 24 42m-24-42 28-3" fill="none" stroke="#c1b1cc" stroke-width="1.2"/>`)}
   ${part('shard-right-base',`<path d="m189 142 14-13 2 39-24 28-36 22-6-26 21-37Z" fill="url(#${p}-crystal-violet)" stroke="#314c49" stroke-width="1.4"/><path d="m189 142 1 34-45 42 15-63Z" fill="#5a7b71"/><path d="m190 176 15-8-24 28-36 22Z" fill="#243d39"/><path d="m203 129 2 39-15 8-1-34Z" fill="#7fa491"/><path d="m160 155-15 63-6-26Z" fill="#9fba9e"/><path d="m189 142 1 34-45 42m45-42 15-8" fill="none" stroke="#c1d4bd" stroke-width="1.3"/>`)}
   ${part('shard-front-tip',`<path d="m97 174 42 18 6 26-28-4-24 5 2-20Z" fill="#72617f" stroke="#393247" stroke-width="1.3"/><path d="m97 174 20 40 22-22Z" fill="#b1a2bf"/><path d="m97 174-2 25 22 15Z" fill="#8d779c"/><path d="m139 192 6 26-28-4Z" fill="#4c3f5b"/><path d="m97 174 20 40 22-22" fill="none" stroke="#d2c9d9" stroke-width="1.7"/>`)}
   ${part('crystal-ribbon-left',`<path d="M71 185c-13-11-15-23-4-36 11-12 15-23 7-35 18 9 18 24 5 38-12 14-7 20-1 31Z" fill="url(#${p}-crystal-paper)"/><path d="M74 183c-9-10-9-19 1-31" fill="none" stroke="#e3e4d0" stroke-width="1.8" stroke-linecap="round"/><path d="m56 129 3-10 7-2-2 9Z" fill="#c8d3b7"/><path d="m56 129 10-12-2 9Z" fill="#a1b09b"/>`)}
   ${part('crystal-ribbon-right',`<path d="M155 211c16-22 25-19 29-41 3-16-4-25 4-42 0 19 11 27 6 45-5 20-17 27-31 40Z" fill="url(#${p}-crystal-paper)"/><path d="M164 207c9-12 23-19 25-37" fill="none" stroke="#dfdfc7" stroke-width="1.7" stroke-linecap="round"/><path d="m195 105-1-12 5-9 5 11-3 11Z" fill="#bacbb2"/><path d="m196 98 3-10 2 10-3 5Z" fill="#e9e5cd"/>`)}
   ${part('crystal-paper-chips',`<path d="m62 82 1-18 5 11-1 9Z" fill="#c1cdb3"/><path d="m62 75 2-9 2 9Z" fill="#ece6ce"/><path d="m177 63 3-13 5 12-2 8Z" fill="#bdc9ad"/><path d="m178 60 2-7 2 8Z" fill="#e1e4ce"/><path d="m43 146 2-9 4 8-2 8Z" fill="#c7d1b9"/><path d="m150 62 4-8 4 8-4 5Z" fill="#e9e4d2"/>`)}
  `,
  motion:{duration:1800,layers:[
   {name:'shard-bed',origin:[128,145],frames:[{at:0},{at:.15,opacity:1},{at:.3,opacity:0},{at:.64,opacity:0},{at:.84,opacity:1},{at:1}]},
   {name:'crystal-paper-specter',origin:[128,154],frames:[{at:0},{at:.21,y:2,scaleY:.95},{at:.43,y:-43,x:3,rotate:8,scaleX:1.24,scaleY:1.24},{at:.59,y:-49,x:-3,rotate:-7,scaleX:1.28,scaleY:1.28},{at:.78,y:-8,rotate:3},{at:.92,y:1},{at:1}]},
   {name:'crystal-specter-tail',origin:[131,166],frames:[{at:0},{at:.26,rotate:-8},{at:.47,rotate:26,scaleX:1.2},{at:.66,rotate:-17},{at:.84,rotate:5},{at:1}]},
   {name:'shard-crown',origin:[127,123],frames:[{at:0},{at:.12,y:4},{at:.35,x:-7,y:-26,rotate:-9},{at:.54,x:4,y:-20,rotate:5,scaleX:.78},{at:.76,y:3,rotate:1},{at:.91,y:-1},{at:1}]},
   {name:'shard-left-shoulder',origin:[108,143],frames:[{at:0},{at:.14,x:2,y:2},{at:.37,x:-23,y:-9,rotate:-19},{at:.55,x:-17,y:2,rotate:-8,scaleX:.7},{at:.78,x:1,y:1,rotate:2},{at:1}]},
   {name:'shard-right-shoulder',origin:[152,147],frames:[{at:0},{at:.17,x:-2,y:2},{at:.39,x:25,y:-14,rotate:22},{at:.56,x:16,y:-6,rotate:10,scaleX:.76},{at:.8,x:-1,y:1,rotate:-2},{at:1}]},
   {name:'shard-core',origin:[130,157],frames:[{at:0},{at:.16,scaleX:.95,scaleY:.95},{at:.4,scaleX:1.06,scaleY:1.1},{at:.58,scaleX:.88,scaleY:.96,rotate:12},{at:.77,scaleX:1.03,scaleY:1.02},{at:1}]},
   {name:'shard-left-base',origin:[103,182],frames:[{at:0},{at:.22,x:2},{at:.43,x:-20,y:15,rotate:-21},{at:.6,x:-11,y:8,rotate:9},{at:.81,x:1,y:-1},{at:1}]},
   {name:'shard-right-base',origin:[151,184],frames:[{at:0},{at:.24,x:-2},{at:.45,x:22,y:12,rotate:20},{at:.63,x:10,y:6,rotate:-7},{at:.83,x:-1,y:-1},{at:1}]},
   {name:'shard-front-tip',origin:[117,194],frames:[{at:0},{at:.29,y:-2},{at:.46,y:23,rotate:17,scaleX:.7},{at:.62,y:12,rotate:-9},{at:.85,y:-2},{at:1}]},
   {name:'crystal-wisp-back',origin:[129,168],frames:[{at:0},{at:.23,scaleX:1.04,scaleY:1.08},{at:.44,scaleX:1.13,scaleY:1.18,opacity:.65},{at:.67,scaleX:.96,scaleY:.96},{at:.85,scaleY:1.03},{at:1}]},
   {name:'crystal-ribbon-left',origin:[92,156],frames:[{at:0},{at:.18,rotate:-12,x:-2},{at:.42,x:-7,y:-13,rotate:28,scaleY:1.2},{at:.65,x:3,y:-5,rotate:-8},{at:1}]},
   {name:'crystal-ribbon-right',origin:[153,174],frames:[{at:0},{at:.22,rotate:10},{at:.45,x:9,y:-7,rotate:-23,scaleY:1.18},{at:.69,x:-2,rotate:8},{at:1}]},
   {name:'crystal-paper-chips',origin:[127,137],frames:[{at:0},{at:.23,y:-5,opacity:.7},{at:.47,y:-20,x:5,opacity:1},{at:.7,y:-6,x:-2,opacity:.45},{at:1}]}
  ]}
 },
 'gift-larp-helmet':{
  name:'LARP Helmet',type:'gift',series:'Afterhours Guild',
  material:'Repaired sheet steel, corrugated cardboard, packing tape and craft foam',
  alt:'A homemade steel roleplay helmet with a jagged jade foam crest, cardboard cheek lining, a taped forehead repair, visible rivets, a slotted hinge washer and a crooked paper LARP flag.',
  mini:`<path d="m4 7 1-4 3 2 2-4 3 3 4-3 1 4 3-1-2 5Z" fill="#719388" stroke="#344a40" stroke-width=".8"/><path d="M7 8c6-2 12 1 12 7l-2 5-7 3-1-6-4 1 1-5-2-1Z" fill="#a4afb0" stroke="#2b3c40" stroke-width=".8"/><path d="m5 12 7 1-1 2-6 1Z" fill="#242c2f"/><path d="m12 14 4 1-1 5-4 2Z" fill="#b8ac88" stroke="#686e61" stroke-width=".6"/><path d="m7 10 6 1" stroke="#d8c8a2" stroke-width="2"/><circle cx="16" cy="13" r="2.4" fill="#a2afb2" stroke="#dbe0d8" stroke-width=".8"/><path d="m15 12 2 2" stroke="#293b3f" stroke-width="1"/>`,
  silhouette:`<path d="M86 83c21-6 49 2 68 14 23 15 29 40 25 64l-10 27-22 9-41 22-18 1 1-31 12-20-2-28-9-5-10 27-14-6 11-29 2-18 6-5Zm3 35-4 9 15 8 28-4 5-5c-12-6-28-10-44-8Z" fill-rule="evenodd"/><path d="m52 70 8-21 14 10 4-23 18 15 9-24 15 18 17-19 7 24 20-9-2 29-15 19-26-4-43-4-26-11Zm112-30 29 7-7 9 4 9-26-7-6 31-4-1 8-49Z"/><path d="M181 106c15-16 16-29 8-33-7-4-14 4-10 11l9 17 2-2-9-17c-2-4 1-9 6-7 6 3 3 14-8 29Z"/>`,
  body:p=>`
   <defs>
    <linearGradient id="${p}-helmet-gold" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#d5dfda"/><stop offset=".25" stop-color="#a5b3b1"/><stop offset=".56" stop-color="#687c7c"/><stop offset=".78" stop-color="#bac5bd"/><stop offset="1" stop-color="#455b5f"/></linearGradient>
    <linearGradient id="${p}-helmet-side" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#839998"/><stop offset=".4" stop-color="#bec8bc"/><stop offset=".72" stop-color="#607879"/><stop offset="1" stop-color="#334d53"/></linearGradient>
    <linearGradient id="${p}-helmet-plume" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#a1b5a1"/><stop offset=".3" stop-color="#75998b"/><stop offset=".7" stop-color="#466e63"/><stop offset="1" stop-color="#2f4d47"/></linearGradient>
   </defs>
   <ellipse cx="129" cy="227" rx="63" ry="6" fill="#06080a" opacity=".35"/>
   ${part('helmet-rear-plume',`<path d="M172 90c7-1 13 2 19 10l-3 24 5 13-10 9 3 15-16 20-8-18 6-32Z" fill="#59463c" stroke="#293d3d" stroke-width="1.5"/><path d="m176 97 10 6-4 20 6 15-10 9 3 12-9 12-4-11 5-32Z" fill="#7c6752"/><path d="m177 104 5 3-3 17 5 13-11 13m3-1 1 11" fill="none" stroke="#c1af8c" stroke-width="1" stroke-dasharray="2 3"/><path d="m172 139 5-3 3 6-5 3Z" fill="#a6a48a"/><path d="m174 146 6-3" stroke="#343f37" stroke-width="1.2"/>`)}   ${part('helmet-crest',`<path d="m52 70 8-21 14 10 4-23 18 15 9-24 15 18 17-19 7 24 20-9-2 29-15 19-26-4-43-4-26-11Z" fill="#355f53" stroke="#233f38" stroke-width="1.8"/><path d="m57 67 6-12 14 10 5-22 16 15 9-22 14 17 14-17 6 22 17-9-2 20-12 13-25-4-40-4Z" fill="url(#${p}-helmet-plume)"/><path d="m63 55 16 19 3-31 15 31 10-38 12 42 16-42 5 44 18-31-14 33" fill="none" stroke="#9ebbaa" stroke-width="1.4"/><path d="m70 60 10 15m12-24 9 26m14-34 6 34m13-33-1 35m16-22-7 20" fill="none" stroke="#4f7e6a" stroke-width="2"/><path d="M71 78c29-2 56 4 76 12l15-10c-25-9-53-15-82-14Z" fill="#514e3d" stroke="#303f36" stroke-width="1.4"/><path d="M75 77c28-1 53 5 73 12" fill="none" stroke="#c7b694" stroke-width="2"/><path d="m91 72 2 6m14-4 1 6m15-3v6m14-3-1 5" stroke="#938e70" stroke-width="2"/>`)}   ${part('helmet-paper-flag',`<path d="m155 92 11-52" fill="none" stroke="#3a4d46" stroke-width="3.2"/><path d="m155 92 11-52" fill="none" stroke="#a5aa95" stroke-width="1.2"/><path d="m164 40 29 7-7 9 4 9-29-8Z" fill="url(#${p}-paper)" stroke="#7d7358" stroke-width="1.1"/><path d="m164 40-3 17 4-2 3-14Z" fill="#a69a79"/><path d="m170 44 3 2m10 13 3-3" stroke="#9e9273" stroke-width=".8"/><text x="168" y="54" transform="rotate(13 175 51)" font-family="monospace" font-size="7" font-weight="bold" fill="#3b4d40">LARP</text>`)}   ${part('helmet-safety-pin',`<path d="M181 106c15-16 16-29 8-33-7-4-14 4-10 11l9 17" fill="none" stroke="#263f42" stroke-width="4"/><path d="M181 106c15-16 16-29 8-33-7-4-14 4-10 11l9 17" fill="none" stroke="#b1bdb5" stroke-width="1.7"/><path d="m182 100 3-2 5 8-4 3Z" fill="#a8b4aa" stroke="#3a5350" stroke-width=".8"/>`)}   ${part('helmet-shell',`<path d="M86 83c17-6 45-1 65 10 25 14 32 37 28 67l-10 28-38 15-16-19-7-26-12-13-14-34Z" fill="url(#${p}-helmet-side)" stroke="#354b51" stroke-width="2"/><path d="M86 83c20-3 49 4 68 16 17 11 22 26 22 47l-20 13-23-25-22-20-30-8Z" fill="url(#${p}-helmet-gold)"/><path d="M86 84c21-3 50 4 68 16" fill="none" stroke="#d5dfda" stroke-width="2"/><path d="M86 95c24 0 42 6 62 17" fill="none" stroke="#50686a" stroke-width="3.7"/><path d="M85 93c25 0 46 7 65 18" fill="none" stroke="#c1cbbf" stroke-width="1.6"/><path d="M90 104c21 2 36 8 49 17" fill="none" stroke="#c8d1c4" stroke-width="1.3"/><path d="M115 91c8 0 16 4 20 6m-20-3c6 1 11 3 16 6" fill="none" stroke="#7d8d85" stroke-width=".9"/><path d="M159 108c13 14 17 32 13 51l-10 23-25 15" fill="none" stroke="#c9d1c5" stroke-width="1.6"/><path d="M166 118c6 13 6 27 4 37" fill="none" stroke="#4b6265" stroke-width="1"/><path d="m150 183 17-10-5 13-22 11Z" fill="#4c6565"/><path d="m102 85 2 9m-8-10 1 8m14-6 2 10" fill="none" stroke="#d3d9cb" stroke-width=".9"/>
    <path d="m88 99 36 9-3 13-37-9 3-5-1-4Z" fill="#c1b38e" stroke="#9e936f" stroke-width=".7"/><path d="m90 101 30 8-1 8-31-8Z" fill="#dfd2ac" opacity=".7"/><path d="m91 101-2 9m7-8-2 9m8-7-2 8m8-6-2 8m7-6-2 9" fill="none" stroke="#ad9d77" stroke-width=".65"/><path d="m88 101-1 6 3-4Z" fill="#f2e7c5"/>
    <g class="va-detail-only" fill="#5c7779" stroke="#c9d3c6" stroke-width="1"><circle cx="145" cy="114" r="2.3"/><circle cx="157" cy="125" r="2.3"/><circle cx="164" cy="141" r="2.3"/><circle cx="161" cy="158" r="2.3"/></g>
    <path d="m153 172 3-4m2-29-2-8m1 12 1 8m-48-61 7 3" stroke="#475f63" stroke-width=".9"/>

   `)}
   <g data-part="helmet-eye"><path d="M87 113c19 1 38 6 51 13l-6 12-30 5-22-14Z" fill="#2b363b" stroke="#475e60" stroke-width="1.5"/>
   <path d="M86 115c18 0 35 5 47 11l-5 5-28 3-17-8Z" fill="#131f25"/></g>
   ${part('helmet-nose',`<path d="M88 110c10 2 15 7 16 15l-4 16-11-5-9 27-14-6 11-29 2-18Z" fill="url(#${p}-helmet-gold)" stroke="#354b51" stroke-width="1.7"/><path d="m79 110 9 1-3 25-12 24-7-3 11-29Z" fill="#abbcb3"/><path d="m88 111-3 25-12 24" fill="none" stroke="#e1e5d5" stroke-width="1.4"/><path d="m77 148 8-18 6 2-9 22Z" fill="#738883"/><path d="m76 156 4-7" fill="none" stroke="#d6dfcc" stroke-width="1.2"/>`)}
   ${part('helmet-cheek',`<path d="M132 129c16 3 26 15 24 30l-9 25-41 24-18 1 1-20 12-20-2-29 10 2Z" fill="url(#${p}-helmet-gold)" stroke="#374c4f" stroke-width="1.8"/><path d="M132 136c9 3 16 10 17 20l-9 23-33 22-13 2 1-13 12-20-2-23 9 2Z" fill="#a29170"/><path d="m132 136-4 29-22 36-12 2 1-13 12-20-2-23 9 2Z" fill="#c6b795"/><path d="m110 154 18-5-3 15-14 6Z" fill="#88795b"/><path d="M132 136c9 3 16 10 17 20l-9 23-33 22-13 2" fill="none" stroke="#e0d8bc" stroke-width="1.6"/><path d="m100 192 8-16 15-7m-16 20 25-16 9-21" fill="none" stroke="#8f805e" stroke-width="1.3"/><path d="m103 196 30-20 9-22" fill="none" stroke="#d1c5a1" stroke-width=".9"/><path d="m95 201 10-1" stroke="#e9dfc0" stroke-width="1.4"/>
    <circle cx="137" cy="131" r="18.5" fill="#4c6261" stroke="#263f42" stroke-width="1.3"/><circle cx="136" cy="130" r="15.7" fill="url(#${p}-steel)" stroke="#cad4c6" stroke-width="1.4"/><circle cx="136" cy="130" r="10.7" fill="#758b86" stroke="#435c58" stroke-width="1.3"/><path d="m131 124 11 10" stroke="#223b3d" stroke-width="3.6" stroke-linecap="round"/><path d="m132 123 10 10" stroke="#b9c9bb" stroke-width="1"/><path d="m119 121 3-2 4 3-2 3Z" fill="#b07451"/><path d="m147 139 3-3 2 3-3 2Z" fill="#8d6650"/><path d="m124 139-3 4m2-6-4 4" stroke="#d6d4bb" stroke-width=".8"/>

   `)}
   <path data-part="helmet-reflection" d="M91 86c18-1 36 4 51 11m15 14c7 7 11 16 12 25m-60 52 22-15" fill="none" stroke="#dfe5d5" stroke-width="2" stroke-linecap="round" opacity=".38"/>
  `,
  motion:{duration:1720,layers:[
   {name:'helmet-eye',origin:[137,142],frames:[{at:0},{at:.13,x:-2,rotate:-2},{at:.35,x:8,rotate:7,scaleX:.76},{at:.56,x:3,rotate:2,scaleX:.9},{at:.79,x:-1,rotate:-1},{at:1}]},
   {name:'helmet-shell',origin:[137,142],frames:[{at:0},{at:.13,x:-2,rotate:-2},{at:.35,x:8,rotate:7,scaleX:.76},{at:.56,x:3,rotate:2,scaleX:.9},{at:.79,x:-1,rotate:-1},{at:1}]},
   {name:'helmet-cheek',origin:[136,131],frames:[{at:0},{at:.16,rotate:-4},{at:.39,rotate:-30,x:7,scaleX:.84},{at:.57,rotate:-19,x:3},{at:.77,rotate:4},{at:.9,rotate:-2},{at:1}]},
   {name:'helmet-nose',origin:[90,112],frames:[{at:0},{at:.2,rotate:2},{at:.39,x:12,y:-2,rotate:12,scaleX:.8},{at:.6,x:4,rotate:5},{at:.82,rotate:-2},{at:1}]},
   {name:'helmet-crest',origin:[119,86],frames:[{at:0},{at:.18,rotate:-4},{at:.42,x:5,y:-2,rotate:11,scaleX:.92},{at:.61,x:2,rotate:-5},{at:.8,rotate:2},{at:1}]},
   {name:'helmet-rear-plume',origin:[172,94],frames:[{at:0},{at:.23,rotate:-3},{at:.46,rotate:16,x:6},{at:.66,rotate:-7},{at:.84,rotate:3},{at:1}]},
   {name:'helmet-paper-flag',origin:[152,78],frames:[{at:0},{at:.22,rotate:-6},{at:.44,rotate:17,x:4},{at:.63,rotate:-9},{at:.78,rotate:5},{at:.9,rotate:-2},{at:1}]},
   {name:'helmet-safety-pin',origin:[174,107],frames:[{at:0},{at:.28,rotate:-5},{at:.48,rotate:13,x:4},{at:.67,rotate:-8},{at:.83,rotate:3},{at:1}]},
   {name:'helmet-reflection',origin:[139,136],frames:[{at:0,opacity:.38},{at:.21,opacity:.1},{at:.44,x:6,opacity:.8,scaleX:.7},{at:.62,opacity:.2},{at:.82,opacity:.5},{at:1,opacity:.38}]}
  ]}
 },
 'gift-copium-cartridge':{
  name:'Copium Cartridge',type:'gift',series:'Internet Relics',
  material:'Smoked jade glass, brass end caps, hand valve and analog pressure dial',
  alt:'A portable smoked-jade glass cartridge with brass end caps, visible imaginary green liquid, a spoked shutoff wheel, a white pressure gauge and the word COPIUM printed on its side. A brief valve release moves the needle and unwinds a soft vapor curl.',
  mini:`<path d="m4 12 15-5 3 3-1 5-15 5-3-3Z" fill="#314b46" stroke="#172d31" stroke-width=".8"/><path d="m7 12 10-3 2 6-10 3Z" fill="#79a594"/><path d="m4 12 2-1 3 8-2 1-3-2Z" fill="#b49860" stroke="#564d34" stroke-width=".6"/><path d="m18 7 2-.5 3 8-2 1Z" fill="#b69f70" stroke="#4b4e3e" stroke-width=".6"/><circle cx="14" cy="13" r="3.2" fill="#e6e3ca" stroke="#8e875d" stroke-width=".9"/><path d="m14 13 1-2" stroke="#753e35" stroke-width="1"/><path d="m5 11-1-4m-2 1 4-2" stroke="#b2b9a5" stroke-width="1.2"/><circle cx="3.5" cy="7.2" r="2.2" fill="none" stroke="#ba9f68" stroke-width="1"/>`,
  silhouette:`<g transform="rotate(-19 129 150)"><path d="M47 120h161c10 3 17 15 17 30s-7 27-17 30H47c-10-4-18-16-18-30s8-26 18-30Zm-3 0v-9h-3v-9h18v9h-3v9Z"/><path d="M50 88a14 14 0 1 0 0 28 14 14 0 0 0 0-28Zm0 5a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" fill-rule="evenodd"/><path d="M51 93c-13-10-11-20 2-25 11-4 16-10 10-17 14 5 12 17-2 22-12 5-12 10-5 17Z"/></g>`,
  body:p=>`
   <defs>
    <linearGradient id="${p}-cartridge-glass" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#7ea599"/><stop offset=".16" stop-color="#406d62"/><stop offset=".44" stop-color="#203f3d"/><stop offset=".66" stop-color="#467a68"/><stop offset="1" stop-color="#172e31"/></linearGradient>
    <linearGradient id="${p}-cartridge-liquid" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a3bf82"/><stop offset=".28" stop-color="#71976a"/><stop offset="1" stop-color="#365f4f"/></linearGradient>
    <linearGradient id="${p}-cartridge-vapor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d4dec7"/><stop offset="1" stop-color="#81a59b"/></linearGradient>
   </defs>
   <ellipse cx="129" cy="226" rx="86" ry="7" fill="#050a0d" opacity=".34"/>
   <g data-part="cartridge-housing" transform="rotate(-19 129 150)">
    <path d="M49 123h151c15 0 24 11 24 27s-9 28-24 28H49Z" fill="#122b2b" stroke="#0e2329" stroke-width="2.1"/>
    <path d="M54 125h144c13 0 21 10 21 25s-8 25-21 25H54Z" fill="url(#${p}-cartridge-glass)" stroke="#73958a" stroke-width="1.1"/>
    <path d="M63 132h132c9 0 15 7 15 17v4H63Z" fill="#243e3b"/>
    ${part('cartridge-liquid',`<path d="M63 150c20-5 28 4 46 0s32-4 46 0 27 0 43-2l11 4c-1 10-7 16-15 16H63Z" fill="url(#${p}-cartridge-liquid)"/><path d="M63 150c20-5 28 4 46 0s32-4 46 0 27 0 43-2" fill="none" stroke="#b5c6a0" stroke-width="1.2"/>`)}
    ${part('cartridge-bubbles',`<circle cx="87" cy="157" r="2.8" fill="none" stroke="#b6c7a4" stroke-width="1"/><circle cx="99" cy="161" r="1.6" fill="#a1bd91"/><circle cx="183" cy="154" r="2" fill="none" stroke="#b7c9a7" stroke-width=".9"/><circle cx="174" cy="163" r="1.2" fill="#9bb893"/><circle cx="106" cy="155" r=".9" fill="#adc59a"/>`)}
    <path d="M61 129h134c8 0 14 6 16 14" fill="none" stroke="#b7d0bd" stroke-width="2.4" stroke-linecap="round"/><path d="M65 132h42m56 0h22M65 171h127c8 0 14-4 17-10" fill="none" stroke="#759e8b" stroke-width="1"/><path d="M68 136v30m129-29v28" fill="none" stroke="#d4e0c4" stroke-width=".8" opacity=".45"/>
    <path d="M65 121h132v5H65Zm0 54h132v6H65Z" fill="url(#${p}-steel-dark)" stroke="#263d3e" stroke-width="1"/><path d="M67 122h127m-124 55h123" stroke="#a9bdb0" stroke-width="1.2"/>
    <path d="M201 136h22v27h-22Z" fill="url(#${p}-steel)" stroke="#344c4b" stroke-width="1.1"/>
    ${part('cartridge-plunger',`<path d="M199 120h9c10 4 16 15 16 30s-6 26-16 30h-9c11-11 12-47 0-60Z" fill="url(#${p}-brass)" stroke="#4e4e39" stroke-width="1.5"/><path d="M205 123c9 8 13 34 2 53" fill="none" stroke="#ebd8a3" stroke-width="1.5"/><path d="M213 130c5 10 6 25 0 38" fill="none" stroke="#7d7551" stroke-width="1.2"/><path d="m209 128 4-1m1 7 4-1m-1 7 4-1m-1 7 3-.5m-3 8 3 .3m-5 7 3 1m-6 6 3 1" stroke="#645f43" stroke-width="1"/>`)}
    <path d="M48 121h11c11 10 13 47 1 59H48c-10-4-17-16-17-30s7-26 17-29Z" fill="url(#${p}-brass)" stroke="#484b36" stroke-width="1.8"/><ellipse cx="47" cy="150" rx="17" ry="29" fill="#6d7054" stroke="#d9c68d" stroke-width="1.1"/><ellipse cx="47" cy="150" rx="12" ry="22" fill="url(#${p}-steel-dark)" stroke="#b9b28a" stroke-width="1.4"/><ellipse cx="46" cy="150" rx="5.5" ry="11" fill="#344c49" stroke="#b6bd9d" stroke-width="1.1"/><path d="m42 145 7 10" stroke="#101f23" stroke-width="2.6"/><path d="M57 125c8 9 10 36 2 48" fill="none" stroke="#efddab" stroke-width="1.8"/>
    <path d="M44 123v-13h13v13" fill="#839783" stroke="#223e3a" stroke-width="1.5"/><path d="M42 110h17v-6H42Z" fill="url(#${p}-brass)" stroke="#42513c" stroke-width="1.1"/>
    ${part('cartridge-vapor',`<path d="M51 99c-10-8-13-15-7-21 7-7 20-4 23-13 4-10-5-17-14-12 5-10 20-8 23 2 4 13-8 19-19 22-10 4-11 9-1 18Z" fill="url(#${p}-cartridge-vapor)" opacity=".36"/><path d="M53 95c-11-10-12-16 2-20 12-4 19-11 12-19" fill="none" stroke="#d9e2ce" stroke-width="1.7" opacity=".55"/>`)}
    ${part('cartridge-valve',`<circle cx="50" cy="102" r="12.5" fill="#223c36" stroke="#c9b47e" stroke-width="3.8"/><circle cx="50" cy="102" r="9.4" fill="none" stroke="#6c7250" stroke-width="1.4"/><path d="M50 91v22m-10-14 20 7m-18 3 16-14" fill="none" stroke="#beac75" stroke-width="2.6"/><circle cx="50" cy="102" r="4" fill="url(#${p}-steel)" stroke="#425943" stroke-width="1"/><path d="m47 100 5 4" stroke="#4a5d4a" stroke-width="1.2"/>`)}
    <path d="M119 120h26c10 15 12 40 3 59h-28c10-19 8-44-1-59Z" fill="url(#${p}-steel-dark)" stroke="#1f3a3c" stroke-width="1.5"/><path d="M121 123c8 14 11 37 3 53m18-52c9 15 10 36 3 52" fill="none" stroke="#aabeb0" stroke-width="1.1"/>
    <ellipse cx="137" cy="147" rx="20" ry="22" fill="url(#${p}-brass)" stroke="#354a3d" stroke-width="1.6"/><ellipse cx="137" cy="146" rx="16.5" ry="18.5" fill="#e5e3cd" stroke="#f2eace" stroke-width="1.1"/><path d="M124 149c-2-10 2-18 10-19 7-1 13 5 15 13" fill="none" stroke="#758878" stroke-width="2"/><path d="m125 144 3 1m-1-9 2 2m6-7 .2 4m7-2-1 3m6 2-3 2" stroke="#3c5549" stroke-width="1.3"/>
    ${part('cartridge-needle',`<path d="m136 148 9-10-6 14Z" fill="#8b4537" stroke="#6c3e32" stroke-width=".5"/><circle cx="137" cy="148" r="2.5" fill="#445c50" stroke="#b6c6a4" stroke-width="1"/>`)}
    <text x="129" y="158" font-family="monospace" font-size="4.5" letter-spacing=".5" fill="#617261">CALM</text>
    <path d="m164 140 31 0v15h-31Z" fill="#c4c8a1" stroke="#6e825d" stroke-width=".7"/><text x="167" y="148" font-family="monospace" font-size="6.2" font-weight="bold" letter-spacing=".1" fill="#31463b">COPIUM</text><path d="m168 151h24" stroke="#7c8d64" stroke-width=".6"/><path d="m166 139 2 3m24-3-1 3m-23 10-1 3m24-3 1 3" stroke="#e0dec0" stroke-width="1"/>
   </g>
  `,
  motion:{duration:1780,layers:[
   {name:'cartridge-housing',origin:[130,150],frames:[{at:0},{at:.13,rotate:2},{at:.35,rotate:-5,scaleX:.92},{at:.55,rotate:-3,scaleX:.96},{at:.76,rotate:1},{at:1}]},
   {name:'cartridge-valve',origin:[50,102],frames:[{at:0},{at:.15,rotate:7},{at:.34,rotate:-85},{at:.55,rotate:-85},{at:.76,rotate:5},{at:.9,rotate:-2},{at:1}]},
   {name:'cartridge-plunger',origin:[204,150],frames:[{at:0},{at:.19,x:-2},{at:.38,x:14},{at:.59,x:11},{at:.78,x:-1},{at:1}]},
   {name:'cartridge-needle',origin:[137,148],frames:[{at:0},{at:.2,rotate:8},{at:.39,rotate:-71},{at:.52,rotate:-54},{at:.64,rotate:-66},{at:.8,rotate:7},{at:.92,rotate:-3},{at:1}]},
   {name:'cartridge-vapor',origin:[51,98],frames:[{at:0,opacity:.36},{at:.18,opacity:.1,scaleX:.8,scaleY:.8},{at:.4,opacity:.85,scaleX:1.15,scaleY:1.3,rotate:-9},{at:.59,opacity:.6,scaleX:1.3,scaleY:1.15,rotate:8},{at:.79,opacity:.2,scaleX:.9},{at:1,opacity:.36}]},
   {name:'cartridge-liquid',origin:[65,166],frames:[{at:0},{at:.22,scaleY:1.1},{at:.43,scaleY:.63,rotate:-1},{at:.63,scaleY:.83,rotate:1},{at:.8,scaleY:1.04},{at:1}]},
   {name:'cartridge-bubbles',origin:[129,159],frames:[{at:0},{at:.23,y:-1},{at:.47,y:-9,x:2,opacity:.5},{at:.68,y:-3,x:-1},{at:1}]}
  ]}
 }
};
