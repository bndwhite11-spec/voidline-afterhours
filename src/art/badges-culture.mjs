/** Original VOIDLINE drawings informed by the research manifest.
 * The face, cloth, settings and props are editable paths, never embedded source images.
 */
export const culture = {
  'ego-unique-one': {
    name: 'Max Stirner', type: 'badge', series: 'Ego Archive',
    material: 'Ivory enamel, oxidized silver and ink engraving',
    alt: 'A left-facing ivory portrait with a long nose, round spectacles, swept-back hair and a high collar in a nicked oxidized-silver setting.',
    mini: `<g stroke-linejoin="round"><path d="m9 1 7 1 5 4 1 7-3 8-7 2-7-2-3-5 1-8 3-4Z" fill="#68777e" stroke="#121820" stroke-width="1.2"/><path d="M11 4c-2.5.4-3.2 2.6-3.3 4.5L5 12l2.5 1 .3 1.1-.8.9 2.8 1.5.2 1.4 6-2.1-1-2c2-2.4 3-5.7 1-8-1.1-1.3-3-2.1-5-1.8Z" fill="#e6dec7" stroke="#151b20" stroke-width=".8"/><path d="M11 4c3-1.1 6.5 1 6.4 4.1-.1 2.9-1.2 4.5-2.8 5.8l.9-3.5-1.1-3.2-4.6-.5Z" fill="#3a454c"/><path d="m10 17 6-2 2 5-10 1-2-1Z" fill="#ded7c1" stroke="#222b30" stroke-width=".8"/><circle cx="8.5" cy="10.5" r="1.7" fill="none" stroke="#111920" stroke-width="1.1"/><path d="m10.3 10.3 4.3-.3" stroke="#111920" stroke-width=".9"/></g>`,
    silhouette: `<path fill="currentColor" fill-rule="evenodd" d="m78 29 54-11 51 14 3 11 22 18 6 45-7 36 10 22-19 37-11 12-3 19-70 7-31-9-19-18-16-30 5-23-11-21 4-51 14-26 1-15Zm6 12-15 15-2 12-13 23-4 45 10 21-5 23 16 27 15 15 29 8 61-6 2-17 14-13 16-31-9-22 8-36-6-39-21-18-3-11-43-12Z"/><path fill="currentColor" fill-rule="evenodd" d="M116 48c-16 10-17 25-24 40-4 8-3 13 3 17l-14 16c-6 5-2 11 11 13l2 5-7 3 7 3-3 6c-7 3-6 9 0 10 5 5 12 5 18 4l3 13-13 22-29 26h130c-2-22-10-36-18-49l1-17-7-16-9-10c11-15 18-38 14-58-4-23-34-39-65-28Zm-27 63a10 12 0 1 0 20 0 10 12 0 1 0-20 0Z"/>`,
    body: p => `
      <defs>
        <clipPath id="${p}-portrait-lens"><ellipse cx="99" cy="111" rx="9.1" ry="10.9"/></clipPath>
        <linearGradient id="${p}-portrait-enamel" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#f5eed9"/><stop offset=".58" stop-color="#e4ddc6"/><stop offset="1" stop-color="#b4b3a4"/></linearGradient>
      </defs>
      <g data-part="setting">
        <path d="m78 34 54-11 51 14 3 11 22 18 6 45-7 36 10 22-19 37-11 12-3 19-70 7-31-9-19-18-16-30 5-23-11-21 4-51 14-26 1-15Z" fill="#0a1016" opacity=".65"/>
        <path d="m78 29 54-11 51 14 3 11 22 18 6 45-7 36 10 22-19 37-11 12-3 19-70 7-31-9-19-18-16-30 5-23-11-21 4-51 14-26 1-15Z" fill="url(#${p}-steel-dark)" stroke="#11181e" stroke-width="4"/>
        <path d="m84 41-15 15-2 12-13 23-4 45 10 21-5 23 16 27 15 15 29 8 61-6 2-17 14-13 16-31-9-22 8-36-6-39-21-18-3-11-43-12Z" fill="#252e34" stroke="#9da9ac" stroke-width="2.2"/>
        <path d="m88 45 45-10 42 12 4 10 18 15 6 35-8 35 9 21-15 28-14 13-2 16-57 7-27-7-15-14-15-25 5-24-10-21 5-42 12-23 2-12Z" fill="#1b252d" stroke="#10171d" stroke-width="2"/>
        <path d="m77 31 6 10-9 3-7 7-5-5 6-10Z" fill="#0a1117"/>
        <path d="m183 205 8-4-5 12-9 5 1-8Z" fill="#0c151b"/>
        <path d="m87 30 43-8 38 10M51 92l-3 43 10 21m3 32 12 22 15 13m44 12 43-5" fill="none" stroke="#d3dcda" stroke-width="1.5" stroke-linecap="round"/>
        <g class="va-detail-only" fill="none" stroke="#74887f" stroke-linecap="round">
          <path d="m65 73 6-9m-16 44 3-11m-3 34 4 8m3 34 3 6m10 31 6 7m72 15 12-1m34-53-5 8m9-69-2-9m-7-36-5-8" stroke-width="2.1"/>
          <path d="m85 36 8-1m-27 27 3-4m-16 61 2-6m8 82 4 6m94 32 6-1m37-74 1 5m-5-66-1-6" stroke="#c5ceca" stroke-width=".8"/>
        </g>
      </g>
      <g data-part="portrait" stroke-linecap="round" stroke-linejoin="round">
        <path d="M116 48c-16 10-17 25-24 40-4 8-3 13 3 17l-14 16c-6 5-2 11 11 13l2 5-7 3 7 3-3 6c-7 3-6 9 0 10 5 5 12 5 18 4l3 13 61-27-6-17c11-15 18-38 14-58-4-23-34-39-65-28Z" fill="url(#${p}-portrait-enamel)" stroke="#151c20" stroke-width="3.2"/>
        <path d="M117 48c17-9 40-5 55 10 12 13 13 31 6 48l-12 27-14 7 9-23c3-12 3-25-5-34-9-11-25-14-42-13l-10-5 5-11Z" fill="#465259" stroke="#202b30" stroke-width="2.1"/>
        <path d="M110 57q3-8 10-10m-5 15q4-9 11-12m-5 15q5-8 12-11m-6 14q6-8 13-10m-6 13q5-7 13-9m-7 13q5-7 12-8m-7 13q5-6 11-7m-5 13q5-6 10-8m-5 15q6-7 9-11m-5 18q6-8 8-14m-6 23q7-8 9-17m-9 26q8-7 11-19m-13 27q9-7 12-18m-16 27q11-7 15-19m-18 26 10-12" fill="none" stroke="#c6cec7" stroke-width="1.25"/>
        <path d="M113 57q3-8 9-10m-4 15q5-8 12-11m-5 15q5-8 12-10m-5 14q5-7 12-9m-5 13q5-7 11-8m-6 13q5-7 11-8m-5 14q5-7 10-9m-5 16q5-7 9-12m-5 21q6-8 8-16m-7 24q7-8 9-18m-11 27q8-6 12-20m-15 29q10-7 13-20" fill="none" stroke="#17242a" stroke-width="1.05"/>
        <path d="M159 101c9-6 15-1 12 9-1 6-5 12-10 13l-4 10-8 5 5-15 2-13Z" fill="#c8c5b1" stroke="#263036" stroke-width="1.7"/>
        <path d="m164 106 3-1-1 8-5 6m-4 3-5 7" fill="none" stroke="#6b6f65" stroke-width="1.4"/>
        <path d="M159 114c-4 9-10 15-15 18m12-13-12 9m8-3-13 10m10-6-14 9m10-5-12 8m8-3-10 7" fill="none" stroke="#3c4649" stroke-width="1.6"/>
        <path d="M109 163c9-3 15-8 22-11m-20 14 3 9 19-9m18-27 8-5" fill="none" stroke="#8c9185" stroke-width="1.5"/>
        <path d="m113 166 61-22 7 18-67 27-4-14Z" fill="#e7dfc9" stroke="#20292f" stroke-width="2.6"/>
        <path d="m174 144 9 15-2 18 19 49-130 1 28-27 16-18 67-25" fill="url(#${p}-ivory)" stroke="#20292f" stroke-width="2.8"/>
        <path d="m114 189 65-27 2 15-54 33-28 15H72l29-27Z" fill="#c7c8bb"/>
        <path d="m181 175 16 48-53 2 9-30Z" fill="#a7afa9"/>
        <path d="m115 185 60-24m-73 36 14-12m15 25 37-23" fill="none" stroke="#f6eedb" stroke-width="1.8"/>
        <g class="va-detail-only" fill="none" stroke="#5e6a69" stroke-width=".9" opacity=".78">
          <path d="m143 179 13-4m-18 10 18-6m-23 12 23-8m-30 16 30-11m-37 18 29-11m-37 18 27-10m-35 17 26-10m39-22 7 18m-4-20 8 22m-5-24 8 24"/>
          <path d="m121 84 5 2m-10 3 6 1m-8 5 6 1m-14 34 6 3m-12 4 10 2m-6 13 9-1m-6 7 10-1" stroke="#8b8e7e"/>
        </g>
        <path d="M90 106c3-2 8-2 11 0" fill="none" stroke="#182127" stroke-width="2"/>
        <ellipse cx="99" cy="111" rx="10.4" ry="12.1" fill="#e4e8d8" fill-opacity=".22" stroke="#162229" stroke-width="3"/>
        <ellipse cx="99" cy="111" rx="8.2" ry="9.9" fill="none" stroke="#e2e7df" stroke-width=".8"/>
        <path d="m109 110 44-3 8-8M89 110l-3 2m8-1 4-1" fill="none" stroke="#152128" stroke-width="2.4"/>
        <path d="M89 125q-5 4-8 3m10 11 5 1m-3 9 5 1" fill="none" stroke="#8a8d7e" stroke-width="1.2"/>
        <g clip-path="url(#${p}-portrait-lens)"><g data-part="glasses-glint" opacity="0"><path d="m77 96 5-2 12 35-5 2Z" fill="#fffbed" opacity=".9"/><path d="m85 96 1-1 12 35-1 1Z" fill="#fffbed"/></g></g>
      </g>
    `,
    motion: { duration: 1380, layers: [
      { name: 'glasses-glint', origin: [99,111], frames: [{at:0,opacity:0,x:0},{at:.18,opacity:0,x:0},{at:.32,opacity:1,x:12},{at:.49,opacity:1,x:31},{at:.57,opacity:0,x:38},{at:1,opacity:0,x:38}] },
      { name: 'portrait', origin: [147,173], frames: [{at:0,rotate:0},{at:.43,rotate:0},{at:.66,rotate:-1.6,y:-1},{at:.85,rotate:-.6,y:0},{at:1,rotate:0}] }
    ] }
  },
  'meme-nothing-happens': {
    name: 'Chudjak', type: 'badge', series: 'Internet Relics',
    material: 'Teal enamel cloth, warm porcelain and tarnished nickel',
    alt: 'An angular deadpan face with thick rectangular glasses peers between folded teal curtains in a small graphite window.',
    mini: `<g stroke-linejoin="round"><path d="M3 3h18v19H3Z" fill="#63747a" stroke="#10171d" stroke-width="1.3"/><path d="M5 5h14v15H5Z" fill="#d3c7a9"/><path d="m10 8 5-.2 2 3-1 5-3 2-3-2-1-5Z" fill="#dcd3b8" stroke="#202d31" stroke-width=".8"/><path d="m9 9 1-2 5-.5 2 2-1 2-1-1-5 .4Z" fill="#243238"/><path d="M9 12h3v2H9Zm5 0h3v2h-3Z" fill="none" stroke="#14252c" stroke-width="1.1"/><path d="M12 12.8h2m-2 3.2 2-.3" stroke="#14252c" stroke-width=".8"/><path d="M5 4h3l-.5 9L8 20H5Zm12 0h3v16h-3l.6-7Z" fill="#497f75" stroke="#214e4a" stroke-width=".7"/><path d="M2 2h21" stroke="#b5a475" stroke-width="1.6" stroke-linecap="round"/></g>`,
    silhouette: `<path fill="currentColor" fill-rule="evenodd" d="M32 34h192v195H32Zm17 19v157h158V53Z"/><path fill="currentColor" d="M26 26h204v12H26Zm24 21h37l3 160H50Zm119 0h38v160h-43Z"/><path fill="currentColor" fill-rule="evenodd" d="M104 93c10-12 43-15 56 2l4 25-5 25-10 20-14 9-17-7-16-21-5-25Zm-3 23v16h25v-16Zm35-1v16h24v-16Z"/><path fill="currentColor" d="m117 165-1 16-31 15-7 13h106l-9-17-27-11-1-16Z"/>`,
    body: p => `
      <defs>
        <clipPath id="${p}-window-opening"><path d="M49 48h159v160H49Z"/></clipPath>
        <linearGradient id="${p}-window-room" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0dfb8"/><stop offset=".54" stop-color="#c6b89e"/><stop offset="1" stop-color="#8b8d7d"/></linearGradient>
        <linearGradient id="${p}-curtain-front" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#1e4b48"/><stop offset=".17" stop-color="#477e72"/><stop offset=".35" stop-color="#2e625a"/><stop offset=".55" stop-color="#80a493"/><stop offset=".69" stop-color="#3b7367"/><stop offset="1" stop-color="#254d49"/></linearGradient>
      </defs>
      <g data-part="window-frame" stroke-linejoin="round">
        <path d="M37 39h184v194H37Z" fill="#080f15" opacity=".7"/>
        <path d="M32 34h192v195H32Z" fill="url(#${p}-steel-dark)" stroke="#0d171e" stroke-width="4"/>
        <path d="M42 44h173v175H42Z" fill="#141e25" stroke="#a2aeab" stroke-width="1.6"/>
        <path d="M49 48h159v160H49Z" fill="url(#${p}-window-room)" stroke="#0f1b22" stroke-width="2.3"/>
        <path d="M51 50h155v5H51Z" fill="#d1ba8f"/>
        <path d="M195 54h12v153h-12Z" fill="#364a45" opacity=".36"/>
        <path d="M51 191h155v16H51Z" fill="#6f7d71"/>
        <path d="M42 219h173v9H42Z" fill="#101a20"/>
        <path d="M34 35h187M34 38v184m7-3h172" fill="none" stroke="#bfc7bf" stroke-width="1.1"/>
        <path d="m42 219 7-10h159l7 10Z" fill="url(#${p}-steel)" stroke="#15232b" stroke-width="1.6"/>
        <path d="M52 213h152" stroke="#e0e2d4" stroke-width="1.2"/>
        <g class="va-detail-only" fill="none" stroke="#9aaba5" stroke-width=".8"><path d="m36 57 4-4m-4 128 3 6m178-107 2 10m-18 135-8 1m-139 0 7-1"/><path d="M45 217h5m157 0h5" stroke="#24343a"/></g>
      </g>
      <g clip-path="url(#${p}-window-opening)">
        <path d="M64 82h46v75H64Zm90-16h32v103h-32Z" fill="#e6d8b5" fill-opacity=".18"/>
        <path d="M130 53v42m-77 42h153" fill="none" stroke="#b1a98c" stroke-width="2" opacity=".38"/>
        <g data-part="figure" stroke-linejoin="round" stroke-linecap="round">
          <path d="m117 161-1 20-30 14-9 18h109l-11-20-28-12-1-20Z" fill="#d0c5aa" stroke="#28363a" stroke-width="2.6"/>
          <path d="m116 177 15 13 17-12 28 15 10 22H76l10-20Z" fill="#424d4d" stroke="#1c2b31" stroke-width="2.2"/>
          <path d="m116 177 14 13-9 12-13-20m39-5-16 13 10 12 15-20" fill="#7e8b7c" stroke="#25363a" stroke-width="1.5"/>
          <path d="M131 190v24m-40-13 6-4m69 1 6 6" fill="none" stroke="#a4a994" stroke-width="1.1"/>
          <path d="M105 93c10-12 43-15 55 2l4 25-5 25-10 20-14 9-17-7-16-21-5-25Z" fill="url(#${p}-ivory)" stroke="#263238" stroke-width="3"/>
          <path d="m155 101 6 14-3 27-12 21-10 6 11-28 3-26Z" fill="#b0b29e" opacity=".8"/>
          <path d="M101 115c-11-5-12 5-8 16 2 7 5 10 10 8m58-22c11-7 13 4 9 15-2 7-6 11-12 9" fill="#c6c3ab" stroke="#2d3c3e" stroke-width="2"/>
          <path d="m97 122-2 2 2 8m69-9 2 2-3 9" fill="none" stroke="#747f70" stroke-width="1.3"/>
          <path d="m99 107-5-9 8-11 6-3 35-5 16 5 10 17-7 11-7-17-14 1-26 2-10 12Z" fill="#26353a" stroke="#17262b" stroke-width="2.1"/>
          <path d="m108 87 34-4 12 4m-48 6 39-4 11 4" fill="none" stroke="#69796f" stroke-width="1.1"/>
          <g data-part="brows"><path d="m103 109 8-4 11 6m16 0 9-6 9 3" fill="none" stroke="#27363a" stroke-width="3.5" stroke-linecap="round"/></g>
          <path d="m101 116 24-1 2 16-23 2Zm35-1 24-1-2 17-22-1Z" fill="#8aa696" fill-opacity=".2" stroke="#1d3036" stroke-width="4"/>
          <path d="m127 121 8-1m-36-1-5-1m67-1 5-2" fill="none" stroke="#1c3038" stroke-width="3"/>
          <path d="m105 119 17-1m17 1 16-1" fill="none" stroke="#f3ead3" stroke-width="1.1"/>
          <g data-part="eyes"><path d="M108 123q8-5 14 0-7 4-14 0Zm31-1q8-5 15 0-7 5-15 0Z" fill="#f0e9d2" stroke="#4c5c54" stroke-width="1.1"/><ellipse cx="117" cy="122.6" rx="2.7" ry="2.5" fill="#273a3c"/><ellipse cx="148" cy="121.8" rx="2.6" ry="2.5" fill="#273a3c"/></g>
          <path d="m130 122-5 18 8 3 5-2m-27 2-4 8m41-10 5 9" fill="none" stroke="#5e6a5e" stroke-width="1.7"/>
          <path d="M118 156q14-12 28 0m-22 5 13-1" fill="none" stroke="#384b48" stroke-width="2.3"/>
          <g class="va-detail-only" fill="none" stroke="#9c9e89" stroke-width=".9"><path d="m116 102 4 2m19-4 6-1m-39 38 5 1m36 0 6-2m-32 11 3-1m14 0 3 1m-19 17 5 2"/></g>
        </g>
        <g data-part="curtain-left" stroke-linejoin="round">
          <path d="M8 44h78l-2 45 3 43-2 27 5 44-12 5-14-3-13 4-14-4-13 4-16-4Z" fill="url(#${p}-curtain-front)" stroke="#193f3d" stroke-width="2.3"/>
          <path d="M74 46 70 84l6 53-4 38 8 29 9-2-4-43 2-27-3-43 2-45Z" fill="#1b4543"/>
          <path d="M23 47 19 89l3 42-2 38 7 36m16-158-5 39 5 47-2 41 4 31m16-157-5 41 6 44-5 41 7 30m16-153-4 36 5 46-4 27 5 39" fill="none" stroke="#96b3a0" stroke-width="1.8"/>
          <path d="M31 47 27 90l3 42-3 39 6 33m18-157-5 39 5 47-3 40 4 30m17-155-5 41 7 44-5 39 8 32" fill="none" stroke="#24544e" stroke-width="3.3"/>
          <path d="m11 196 13 3 14-3 13 4 14-4 13 3 9-3" fill="none" stroke="#b0c1a6" stroke-width=".8"/>
          <path d="m84 147 6-2c5-2 9 2 8 6l-1 9c0 5-6 8-11 6l-4-2 1-5 5 1-2-5-5 1 1-5 5-1Z" fill="#d9d3ba" stroke="#293e3e" stroke-width="1.7"/>
          <path d="m87 151 7-1m-7 5 6-1m-6 5 5-1" fill="none" stroke="#8b9785" stroke-width="1.1"/>
        </g>
        <g data-part="curtain-right" stroke-linejoin="round">
          <path d="M170 44h80v161l-15 3-13-4-15 4-14-4-12 4-15-6 3-42-3-36 4-39Z" fill="url(#${p}-curtain-front)" stroke="#193f3d" stroke-width="2.3"/>
          <path d="m170 45 7 41-3 38 4 38-6 42-7-2 4-42-3-36 4-39Z" fill="#173c3c"/>
          <path d="m183 46 5 40-5 39 4 37-5 41m20-157 5 43-6 39 6 38-4 37m19-157 6 44-5 38 7 39-3 36m17-156 3 41-4 41 5 37-4 36" fill="none" stroke="#8dac9a" stroke-width="1.7"/>
          <path d="m191 46 5 41-5 39 5 38-5 39m21-157 5 43-5 39 7 39-4 36m21-156 3 41-4 40 5 38-4 35" fill="none" stroke="#27574f" stroke-width="3.4"/>
          <path d="m169 196 12 4 12-3 14 4 15-4 13 3 12-3" fill="none" stroke="#aac0a5" stroke-width=".8"/>
        </g>
      </g>
      <g data-part="rail" stroke-linecap="round">
        <path d="M25 29h206" stroke="#14252a" stroke-width="10"/>
        <path d="M25 27h206" stroke="url(#${p}-brass)" stroke-width="6"/>
        <path d="M31 25h192" stroke="#e4ce97" stroke-width="1"/>
        <circle cx="24" cy="28" r="6" fill="url(#${p}-brass)" stroke="#34423b" stroke-width="1.7"/>
        <circle cx="231" cy="28" r="6" fill="url(#${p}-brass)" stroke="#34423b" stroke-width="1.7"/>
        <path d="M57 30v15m15-15v15m14-15v15m84-15v15m16-15v15m15-15v15" stroke="#273b37" stroke-width="4"/>
        <path d="M56 32v10m15-10v10m14-10v10m84-10v10m16-10v10m15-10v10" stroke="#c8b988" stroke-width="1.2"/>
      </g>
    `,
    motion: { duration: 1540, layers: [
      { name: 'eyes', origin: [129,123], frames: [{at:0,x:0},{at:.13,x:-2},{at:.27,x:2},{at:.4,x:0},{at:1,x:0}] },
      { name: 'brows', origin: [130,109], frames: [{at:0,y:0},{at:.27,y:-1},{at:.45,y:0},{at:1,y:0}] },
      { name: 'curtain-left', origin: [50,48], frames: [{at:0,x:0},{at:.28,x:0},{at:.61,x:27},{at:.74,x:25},{at:.88,x:26},{at:1,x:26}] },
      { name: 'curtain-right', origin: [207,48], frames: [{at:0,x:0},{at:.32,x:0},{at:.64,x:-47},{at:.78,x:-45},{at:.9,x:-46},{at:1,x:-46}] }
    ] }
  },
  'ego-ownness': {
    name:'Ownness Seal', type:'badge', series:'Ego Archive', material:'Oxblood sealing wax, torn book paper and oxidized silver',
    alt:'An uneven oxblood wax seal with a tiny bespectacled profile lies across a folded cream bookplate and a broken silver frame.',
    mini:`<g stroke-linejoin="round"><path d="m4 4 15-2 2 15-3 4-14-1-2-3Z" fill="#d9ccb0" stroke="#776e5c" stroke-width="1"/><path d="m4 5 7-.9m6-.8 3-.2.5 4M3 13l.8 6 5 .4m7 .6 4-.4.3-5" fill="none" stroke="#8a9699" stroke-width="1.6"/><path d="m11 7 3-1 2 2 3 1-.3 4 1 3-3 2-4-.4-3 1-2-3 .4-3-1-2Z" fill="#873d48" stroke="#4b2731" stroke-width=".8"/><path d="m13 9-1 2-2 2 2 .6 1 2 3-1-1-2 .6-2-1-1.5Z" fill="#c0817d"/><circle cx="12.2" cy="12.1" r=".7" fill="none" stroke="#4c2831" stroke-width=".7"/></g>`,
    silhouette:`<path fill="currentColor" d="m51 41 145-15 24 159-27 39-151-10-13-35Zm46 45 24-8 24 6 14 16 25 7-3 28 10 25-17 20-28-3-25 11-19-13-23-6 2-25-10-25 14-16Z"/>`,
    body:p=>`
      <g data-part="bookplate" stroke-linejoin="round">
        <path d="m50 45 145-15 25 159-27 39-150-10-14-35Z" fill="#0a1117" opacity=".5"/>
        <path d="m51 41 145-15 24 159-27 39-151-10-13-35Z" fill="url(#${p}-paper)" stroke="#7b705e" stroke-width="2.3"/>
        <path d="m51 41 6 51-28 87 13 35 8-39 13-74Z" fill="#b9ac8e"/><path d="m57 46 133-14 8 51-130 17Z" fill="#eee6ce"/>
        <path d="m196 26-6 57 26 102 4 .1Z" fill="#a99c7f"/><path d="m198 170 22 15-27 39-2-30Z" fill="#f3ead4" stroke="#b6aa90" stroke-width="1.5"/>
        <path d="m66 99 126-15m-7 4 18 80M53 170l132 15" fill="none" stroke="#f8efd9" stroke-width="1.6"/>
        <path d="m54 206 9 3 5-2 5 3 7-2 7 3 9-2 8 3 8-1 9 3 8-2 9 3 11-2 9 3 9-2 12 3 10-1" fill="none" stroke="#97896c" stroke-width="1"/>
        <g class="va-detail-only" fill="none" stroke="#97896c" stroke-width=".9" opacity=".65"><path d="m61 57 99-11m-98 17 76-8m-65 128 101 13m-100-7 85 11m-86-5 56 7"/><path d="m59 82 6-1m122-37 1 7m-144 131 3 6m143 21 4-3"/></g>
      </g>
      <g data-part="frame-left"><path d="m58 53 73-8m-73 8 13 130 40 6" fill="none" stroke="#313e43" stroke-width="7"/><path d="m58 51 73-8m-73 8 13 130 40 6" fill="none" stroke="url(#${p}-steel)" stroke-width="4"/><path d="m62 60 5-1m-3 9 5-.4m-2 9 4-.4m-1 9 4-.4m-1 9 4-.4m-1 9 4-.4m-1 9 4-.4m-1 9 4-.4m-1 9 4-.4m-1 9 4-.4" fill="none" stroke="#bdc3b6" stroke-width="1"/></g>
      <g data-part="frame-right"><path d="m158 41 25-3 19 149-41 7" fill="none" stroke="#2b393e" stroke-width="7"/><path d="m158 39 25-3 19 149-41 7" fill="none" stroke="url(#${p}-steel)" stroke-width="4"/><path d="m175 45 3 10m20 116-1-9m-6 22-9 1" fill="none" stroke="#f1eedb" stroke-width="1"/></g>
      <g data-part="wax-seal" stroke-linejoin="round">
        <path d="m98 91 24-8 24 6 14 16 25 7-3 28 10 25-17 20-28-3-25 11-19-13-23-6 2-25-10-25 14-16Z" fill="#371e29"/>
        <path d="m98 85 24-8 24 6 14 16 25 7-3 28 10 25-17 20-28-3-25 11-19-13-23-6 2-25-10-25 14-16Z" fill="url(#${p}-oxblood)" stroke="#4b2933" stroke-width="2.1"/>
        <path d="m99 92 23-8 20 6 14 15 21 7-2 23 9 23-15 13-23-2-22 10-17-11-21-5 2-21-9-21 12-15Z" fill="none" stroke="#ba7776" stroke-width="1.6"/>
        <path d="M121 99c-9 6-9 13-13 21l-10 10 12 5-2 5 9 5 2 10 31-12-4-12c9-8 11-24 3-30-8-7-19-8-28-2Z" fill="#a26063" stroke="#562f3b" stroke-width="1.8"/>
        <path d="M121 99c10-5 23 0 28 8l1 17-9 13-2-13 1-10-17-6-7 1Z" fill="#713a46"/><path d="m117 152 31-12 7 14-40 16-13-2Z" fill="#ad6a6c" stroke="#613541" stroke-width="1.6"/>
        <circle cx="112" cy="124" r="6" fill="none" stroke="#4c2b36" stroke-width="2.1"/><path d="m118 123 22-2m-17-15 5-5m0 8 5-6m0 9 6-6m0 11 6-7m-36 29 5 1" fill="none" stroke="#532e3c" stroke-width="1.2"/>
        <path d="m99 91 17-6m43 21 17 7m-68 57 10 8m43-5 9-2" fill="none" stroke="#ce8d86" stroke-width="2.2" stroke-linecap="round"/>
        <g class="va-detail-only" fill="none" stroke="#562a36" stroke-width=".9"><path d="m91 115 5-4m-11 18 3 7m86-10-2 8m6 17 3 5m-46 20 6-3m-39-9-6-2m38-68 6 2"/></g>
      </g>`,
    motion:{duration:1280,layers:[{name:'frame-left',origin:[72,178],frames:[{at:0,x:0,rotate:0},{at:.3,x:-5,rotate:-3},{at:.65,x:-4,rotate:-2},{at:1,x:0,rotate:0}]},{name:'frame-right',origin:[196,178],frames:[{at:0,x:0,rotate:0},{at:.38,x:5,rotate:3},{at:.7,x:4,rotate:2},{at:1,x:0,rotate:0}]}]}
  },
  'ego-spook-breaker': {
    name:'Spook Breaker',type:'badge',series:'Ego Archive',material:'Uncoated book paper, grey ink and worn cloth',
    alt:'An angular paper ghost rises from an open book with spectacles on its cover, while two folded scraps form a broken frame.',
    mini:`<g stroke-linejoin="round"><path d="m3 13 9 2 9-2v7l-9 3-9-3Z" fill="#736553" stroke="#242b30" stroke-width="1"/><path d="m3 11 9 3 9-3v7l-9 3-9-3Z" fill="#e5dcc2" stroke="#8e826c" stroke-width=".8"/><path d="M8 11V7c0-4 7-4 7 0l2 6-3-1-2 2-2-2-3 1Z" fill="#e7deca" stroke="#48545a" stroke-width="1"/><path d="M10 7h1m2 0h1m-3 3h3" stroke="#37474c" stroke-width="1.1"/><path d="M4 16h4l1 2h3l1-2h4" fill="none" stroke="#35464b" stroke-width="1"/><path d="m4 5 3-2m10 1 3 3" stroke="#a99d82" stroke-width="1.5"/></g>`,
    silhouette:`<path fill="currentColor" d="m34 142 94 22 94-22v64l-94 29-94-29Zm48-17V84c0-44 67-46 75-7l15 57-30-9-16 24-18-24-29 12Z"/><path fill="currentColor" d="m40 46 37-17 10 20-35 21Zm139-21 40 24-14 22-40-25Z"/>`,
    body:p=>`
      <g data-part="scrap-left"><path d="m40 46 37-17 10 20-35 21 7 34-21-4Z" fill="url(#${p}-paper)" stroke="#8c806b" stroke-width="1.5"/><path d="m51 60 26-20 4 9-28 17m-5 1 7 28" fill="none" stroke="#eee5cc" stroke-width="1.3"/></g>
      <g data-part="scrap-right"><path d="m179 25 40 24-14 22 10 34-22 5-5-36-23-28Z" fill="#d4c7a9" stroke="#8e826b" stroke-width="1.5"/><path d="m177 40 24 19-4 10 7 29" fill="none" stroke="#f5ead1" stroke-width="1.6"/></g>
      <g data-part="book" stroke-linejoin="round">
        <path d="m32 145 96 23 96-23v63l-96 30-96-30Z" fill="#101922" opacity=".5"/>
        <path d="m34 142 94 22 94-22v64l-94 29-94-29Z" fill="#384039" stroke="#17262b" stroke-width="3"/>
        <path d="m40 140 88 24 88-24v57l-88 28-88-28Z" fill="url(#${p}-paper)" stroke="#86775d" stroke-width="1.8"/>
        <path d="m40 140 88 18 88-18-12 48-76 27-76-27Z" fill="#eee5cb" stroke="#a59474" stroke-width="1.5"/>
        <path d="m128 158 1 56-77-27-12-47Z" fill="#d2c7a8"/><path d="m128 158 88-18-12 48-76 27Z" fill="#e9dfc4"/>
        <path d="m127 163 1 50m-83-31 76 26m15-1 72-25m-163 7 76 26m15-1 71-25" fill="none" stroke="#a09275" stroke-width="1.3"/>
        <path d="m134 174 9-2-6 44-10 2Z" fill="url(#${p}-oxblood)" stroke="#683a3d" stroke-width="1"/>
        <g class="va-detail-only" fill="none" stroke="#8b8169" stroke-width="1.1"><path d="m57 151 45 10m-47-3 42 10m-39-3 44 11m-39-3 45 12m45-23 43-10m-45 17 40-10m-41 17 37-10m-38 18 38-11"/><path d="m71 174 6 5 5-1m95-17 5 2 4-3"/></g>
      </g>
      <g data-part="specter" stroke-linejoin="round">
        <path d="M82 125V84c0-44 67-46 75-7l15 57-30-9-16 24-18-24-29 12Z" fill="#9b9c8c" stroke="#3d4a4d" stroke-width="2.2"/>
        <path d="M88 119V83c0-34 57-36 62-4l15 47-25-9-15 22-16-22-25 12Z" fill="url(#${p}-paper)" stroke="#d4c9b0" stroke-width="1.5"/>
        <path d="m127 60-3 77-15-20-25 12 4-46c1-15 16-25 39-23Z" fill="#f2e9d4"/><path d="m127 60 9 49 28 17-24-9-15 22Z" fill="#c4baa0"/>
        <path d="m125 65-1 37m2 11-1 17m-30-9 12-7m36-4 14 11" fill="none" stroke="#8c8876" stroke-width="1.3"/>
        <path d="M101 85q7-5 12 0m19-1q7-5 12 0" fill="none" stroke="#3d4a4c" stroke-width="2.6" stroke-linecap="round"/>
        <path d="m114 106 12 3 10-5" fill="none" stroke="#46524e" stroke-width="2"/>
      </g>
      <g data-part="spectacles" fill="none" stroke="#34474d" stroke-linejoin="round"><path d="m55 173 22 6-1 15-22-7Zm45 13 22 6-1 15-22-7Z" stroke-width="3"/><path d="m76 184 24 7m-46-11-6-4m74 23 8-5" stroke-width="2.4"/><path d="m58 178 13 4m33 9 12 4" stroke="#f4edda" stroke-width="1"/></g>`,
    motion:{duration:1430,layers:[{name:'scrap-left',origin:[54,68],frames:[{at:0,x:0,y:0,rotate:0},{at:.33,x:-8,y:4,rotate:-18},{at:.69,x:-5,y:3,rotate:-13},{at:1,x:0,y:0,rotate:0}]},{name:'scrap-right',origin:[198,67],frames:[{at:0,x:0,y:0,rotate:0},{at:.4,x:9,y:3,rotate:16},{at:.74,x:5,y:3,rotate:10},{at:1,x:0,y:0,rotate:0}]},{name:'specter',origin:[126,136],frames:[{at:0,y:0,rotate:0},{at:.28,y:-3,rotate:-1},{at:.7,y:-1,rotate:1},{at:1,y:0,rotate:0}]}]}
  },
  'meme-final-reply': {
    name:'Reply Guy',type:'badge',series:'Internet Relics',material:'Chalk enamel, ink and tarnished nickel',
    alt:'A broken speech-bubble pin frames heavy spectacles, a raised eyebrow and a long folded reply strip.',
    mini:`<g stroke-linejoin="round"><path d="M3 3h17v12l-5 1-3 5-2-5H3Z" fill="#c9d1ce" stroke="#28363a" stroke-width="1.1"/><path d="M5 5h13v9H5Z" fill="#ece5d2"/><path d="M5 8h5v4H5Zm8 0h5v4h-5Z" fill="none" stroke="#172b32" stroke-width="1.4"/><path d="M10 9h3M13 6l4-1m-8 9 3-1" stroke="#172b32" stroke-width="1"/><path d="m15 14 6 1-1 6-5-1Z" fill="#d5c9aa" stroke="#847963" stroke-width=".8"/></g>`,
    silhouette:`<path fill="currentColor" fill-rule="evenodd" d="M45 32h161v133l-39 9-39 58-20-56H37V62Zm18 20-7 20v84h67l10 29 22-30 31-7V52Z"/><path fill="currentColor" d="m65 91 57-2v42l-57 2Zm73-3 50-2v42l-50 2Zm22 72 61 10-4 55-61-11Z"/>`,
    body:p=>`
      <g data-part="bubble"><path d="M45 37h161v133l-39 9-39 58-20-56H37V67Z" fill="#0c151c" opacity=".6"/><path d="M45 32h161v133l-39 9-39 58-20-56H37V62Z" fill="url(#${p}-steel)" stroke="#16252c" stroke-width="3.3"/><path d="M60 48h130v103l-33 8-25 41-14-39H52V68Z" fill="url(#${p}-ivory)" stroke="#4b5855" stroke-width="2"/><path d="m45 32 15 16-8 20-15-6Z" fill="#43555d"/><path d="m167 174 22-7-14-9-17 4Z" fill="#9baba8"/><path d="m60 48 116 1m-118 106 48 1" fill="none" stroke="#f6efd9" stroke-width="1.5"/></g>
      <g data-part="face" stroke-linecap="round"><path d="m67 91 55-2 1 40-55 4Zm72-3 47-2-1 41-46 3Z" fill="#b0c2b1" fill-opacity=".18" stroke="#253940" stroke-width="7" stroke-linejoin="round"/><path d="m123 101 16-1m-73-1-12-2m132-2 8-2" stroke="#273b43" stroke-width="5"/><path d="m75 96 37-1m34-1 32-1" stroke="#fff5dc" stroke-width="1.2"/><path d="M81 111q13-8 26 0m41-2q13-7 24 0" fill="none" stroke="#314a4c" stroke-width="2.4"/><ellipse cx="99" cy="110" rx="4" ry="4.5" fill="#263b40"/><ellipse cx="165" cy="108" rx="4" ry="4.5" fill="#263b40"/><path d="m121 112-4 22 12 3m-21 14 20-5" fill="none" stroke="#617369" stroke-width="2.4"/><path d="m78 79 30 1" stroke="#314446" stroke-width="4"/><path data-part="reply-brow" d="m144 74 30-8 6 4" fill="none" stroke="#314446" stroke-width="5"/></g>
      <g data-part="reply-strip" stroke-linejoin="round"><path d="m157 153 60 10 4 18-7 45-59-11 4-25-12-17Z" fill="#a7987a" stroke="#6c6856" stroke-width="1.7"/><path d="m158 150 59 10-8 22-56-9Z" fill="#eee5ce" stroke="#a29577" stroke-width="1.3"/><path d="m153 173 56 9 5 43-59-10 4-25Z" fill="url(#${p}-paper)"/><path d="m161 183 38 6m-39 3 35 6m-35 3 38 6" fill="none" stroke="#8a816a" stroke-width="1.8"/><path d="m157 214 8 1 2-3 5 4 4-2 7 4 6-2 7 3 5-1 5 4 8 1" fill="none" stroke="#97866b" stroke-width="1"/></g>
      <g fill="#8b947e"><circle data-part="ellipsis-one" cx="72" cy="58" r="2.1"/><circle data-part="ellipsis-two" cx="82" cy="58" r="2.1"/><circle data-part="ellipsis-three" cx="92" cy="58" r="2.1"/></g>
      <g class="va-detail-only" fill="none" stroke="#879893" stroke-width="1"><path d="m43 86 4 6m-3 48 4-7m143 12-6 2m-56 66 3-8m-84-53 6 1"/></g>`,
    motion:{duration:1360,layers:[{name:'reply-brow',origin:[145,74],frames:[{at:0,rotate:0},{at:.25,rotate:-8},{at:.75,rotate:-8},{at:1,rotate:0}]},{name:'reply-strip',origin:[158,153],frames:[{at:0,y:0},{at:.2,y:-3},{at:.5,y:5},{at:.77,y:4},{at:1,y:0}]},{name:'ellipsis-one',origin:[72,58],frames:[{at:0,opacity:1},{at:.15,opacity:.15},{at:.3,opacity:1},{at:1,opacity:1}]},{name:'ellipsis-two',origin:[82,58],frames:[{at:0,opacity:1},{at:.25,opacity:.15},{at:.4,opacity:1},{at:1,opacity:1}]},{name:'ellipsis-three',origin:[92,58],frames:[{at:0,opacity:1},{at:.35,opacity:.15},{at:.5,opacity:1},{at:1,opacity:1}]}]}
  },
  'meme-aura-receipt': {
    name:'Aura Receipt',type:'badge',series:'Internet Relics',material:'Thermal paper, black ceramic and brass counter wheels',
    alt:'A curled perforated receipt marked plus one thousand drapes over a black mechanical counter; the score is a decorative joke.',
    mini:`<g stroke-linejoin="round"><path d="M5 14h14v7H5Z" fill="#29373c" stroke="#101c22" stroke-width="1"/><path d="M8 2h10v15l-2-1-2 1-2-1-2 1-2-1Z" fill="#e7dec6" stroke="#8c826b" stroke-width="1"/><path d="M10 5h6m-6 3h4m-3 3h4m-2-2v4" stroke="#738860" stroke-width="1.2"/><path d="M7 18h10" stroke="#c0d39c" stroke-width="2"/></g>`,
    silhouette:`<path fill="currentColor" d="M54 160h149l17 20v46H40v-46Zm31-134h102v134l-11 15-13-7-14 7-15-7-14 6-13-7-13 6-11-10 6-31Z"/>`,
    body:p=>`
      <defs><clipPath id="${p}-aura-counter-display"><path d="M65 186h128v28H65Z"/></clipPath></defs>
      <g data-part="counter-case" stroke-linejoin="round"><path d="M54 164h149l17 20v46H40v-46Z" fill="#0a131b" opacity=".5"/><path d="M54 160h149l17 20v46H40v-46Z" fill="url(#${p}-ink)" stroke="#101f27" stroke-width="3"/><path d="m54 160 12 18h128l9-18Z" fill="#485950" stroke="#243b39" stroke-width="1.5"/><path d="M55 180h150v37H55Z" fill="#182422" stroke="#788a79" stroke-width="1.4"/><path d="M65 186h128v28H65Z" fill="#080f13"/><path d="M45 222h168m-164-38v31" fill="none" stroke="#66756b" stroke-width="1.2"/><circle cx="199" cy="198" r="9" fill="url(#${p}-brass)" stroke="#222d2d" stroke-width="2"/><path d="m196 191 5 13m-7-6 10-1" stroke="#655738" stroke-width="1.1"/><path d="M57 165h35" stroke="#c4c9b0" stroke-width="1.2"/></g>
      <g data-part="receipt"><path d="M89 31h96l9 19-10 94 7 25-14 7-13-7-14 7-15-8-14 7-13-8-14 5-13-11 8-30Z" fill="#837d67"/><path d="M85 26h102v118l5 20-15 8-13-7-14 7-15-8-14 7-13-8-14 5-11-10 6-31Z" fill="url(#${p}-paper)" stroke="#8a8068" stroke-width="1.7"/><path d="M85 26h102l8 18-18 6H82Z" fill="#f3ecd8" stroke="#aa9d81" stroke-width="1.1"/><path d="M85 27h102l-8 14H83Z" fill="#d9cfb7"/><path d="M84 49h92l-3 67 7 28-6 18-10-5-14 6-15-7-15 7-12-7-13 5-6-6 7-27Z" fill="#ece3cb"/>
        <path d="M97 60h67m-67 8h46m-46 8h61m-61 8h32m-32 56h59m-59 7h37" fill="none" stroke="#989178" stroke-width="1.5"/>
        <path d="M97 91h66m-66 39h66" stroke="#b9b394" stroke-width=".9" stroke-dasharray="2 3"/>
        <text x="131" y="118" text-anchor="middle" fill="#627d42" font-family="monospace" font-size="22" font-weight="700">+1000</text>
        <path d="m84 49 2 71-5 24m96-94-3 66 7 27" fill="none" stroke="#f8f1db" stroke-width="1.4"/>
        <g class="va-detail-only" fill="none" stroke="#8d866e" stroke-width=".8"><path d="M100 54h2m4 0h2m4 0h2m4 0h2m4 0h2m4 0h2m4 0h2m4 0h2m4 0h2m4 0h2m4 0h2m-59 99h3m3 0h3m3 0h3m3 0h3m3 0h3m3 0h3m3 0h3"/></g>
      </g>
      <g clip-path="url(#${p}-aura-counter-display)"><g data-part="counter-digits"><path d="M66 186h28v28H66Zm33 0h28v28H99Zm33 0h28v28h-28Zm33 0h27v28h-27Z" fill="#1a2725"/><text x="128" y="208" text-anchor="middle" fill="#d0e1af" font-family="monospace" font-size="22" letter-spacing="9">1000</text><path d="M96 187v25m33-25v25m33-25v25" stroke="#72836a" stroke-width="1"/></g></g>`,
    motion:{duration:1220,layers:[{name:'counter-digits',origin:[128,198],frames:[{at:0,y:0},{at:.18,y:-8},{at:.35,y:8},{at:.57,y:-2},{at:.74,y:0},{at:1,y:0}]},{name:'receipt',origin:[130,164],frames:[{at:0,y:0},{at:.12,y:-2},{at:.48,y:6},{at:.68,y:5},{at:1,y:0}]}]}
  },
  'meme-aura-farmer': {
    name:'Aura Farmer',type:'badge',series:'Internet Relics',material:'Black ceramic, brushed steel, soil and green enamel',
    alt:'Two uneven enamel leaves sprout through an angled steel ring above a black ceramic pot with a visible gold seed.',
    mini:`<g stroke-linejoin="round"><path d="m6 15 12-.2-2 7H8Z" fill="#26343b" stroke="#0c1a23" stroke-width="1.1"/><ellipse cx="12" cy="15" rx="6" ry="2" fill="#756951"/><path d="M4 11c0-4 16-6 17-2s-17 6-17 2Z" fill="none" stroke="#aabbb7" stroke-width="1.5"/><path d="m12 15-.5-9m0 3C5 8 4 4 6 3c4 0 6 3 5.5 6Zm1-3c0-4 5-5 7-3-1 4-4 5-7 3Z" fill="#6c9d79" stroke="#305b4d" stroke-width=".8"/><circle cx="14" cy="15" r="1.2" fill="#cfb47c"/></g>`,
    silhouette:`<path fill="currentColor" fill-rule="evenodd" d="M66 157c9-14 114-17 127-1l-22 72H89Zm-13-44c-2-36 145-57 150-22 5 37-145 59-150 22Zm13-2c3 17 125-4 124-18-2-17-125 3-124 18Z"/><path fill="currentColor" d="m126 166-5-102 6-3 5 105ZM122 89C75 86 60 45 81 34c30-3 49 27 41 55Zm6-25c-2-35 38-53 61-32-5 29-36 45-61 32Z"/>`,
    body:p=>`
      <g data-part="ring-back"><path d="M53 113c-2-36 145-57 150-22 1 7-2 15-10 20l-5-8c5-5 5-8 3-11-10-17-119-3-126 16l1 7Z" fill="url(#${p}-steel)" stroke="#34464a" stroke-width="2.1"/><path d="M59 100c19-23 103-35 131-18" fill="none" stroke="#e1e6d8" stroke-width="1.4"/></g>
      <g data-part="sprout" stroke-linejoin="round"><path d="m127 170-8-105 6-2 10 106Z" fill="#4a7756" stroke="#244a3f" stroke-width="1.7"/><path d="M122 89C75 86 60 45 81 34c30-3 49 27 41 55Z" fill="#5c9170" stroke="#2b5849" stroke-width="2.1"/><path d="M128 64c-2-35 38-53 61-32-5 29-36 45-61 32Z" fill="#89ad79" stroke="#3e6c4f" stroke-width="2"/><path d="m82 42 38 43m16-23 44-25" fill="none" stroke="#bdcca0" stroke-width="1.6"/><path d="m94 55-7 1m16 9-12 1m22 8-13 2m42-18 3-13m9 7 2-13m8 8 2-10" fill="none" stroke="#396c50" stroke-width="1.1"/></g>
      <g data-part="ring-front"><path d="M53 112c5 25 91 17 133-3l8-6 9-11c2 30-140 65-150 20Z" fill="url(#${p}-chrome)" stroke="#34464a" stroke-width="1.8"/><path d="M64 121c33 10 92-4 122-16" fill="none" stroke="#f0eee0" stroke-width="1.3"/><path d="M78 127c29 3 72-6 94-14" fill="none" stroke="#465d62" stroke-width="1"/></g>
      <g data-part="planter" stroke-linejoin="round"><path d="M65 161c12-19 116-24 130-2l-24 72H89Z" fill="#08141b" opacity=".5"/><path d="M66 157c9-14 114-17 127-1l-22 72H89Z" fill="url(#${p}-ink)" stroke="#172a31" stroke-width="3"/><path d="m69 161 45 16 2 49-26-1Z" fill="#37474a"/><path d="m114 177 76-17-20 65-54 1Z" fill="#17252d"/><ellipse cx="130" cy="156" rx="61" ry="16" fill="#5d5443" stroke="#68796a" stroke-width="2.1"/><ellipse cx="131" cy="153" rx="51" ry="10" fill="#3b3d32"/><path d="m78 156 11 2m14-11 7 3m34-2 5 3m17 7 8-3m-55 8 7-2" fill="none" stroke="#8a7b58" stroke-width="2" stroke-linecap="round"/><path d="m75 165 20 53m22-40 1 40m17 5 29-3" fill="none" stroke="#5c706d" stroke-width="1.2"/><path d="m144 151 7-5 7 3-2 7-8 2-6-3Z" fill="url(#${p}-brass)" stroke="#8c794d" stroke-width="1.2"/><path d="m147 150 5-1" stroke="#f7dfa3" stroke-width="1"/>
        <g class="va-detail-only" fill="none" stroke="#73837b" stroke-width=".8" opacity=".7"><path d="m93 181 3 9m2 8 2 9m65-26-2 9m-5 25 5-1m-44-29 1 8"/></g>
      </g>`,
    motion:{duration:1480,layers:[{name:'sprout',origin:[130,157],frames:[{at:0,rotate:0},{at:.28,rotate:-5},{at:.61,rotate:2},{at:.81,rotate:-1},{at:1,rotate:0}]},{name:'ring-front',origin:[128,109],frames:[{at:0,x:0,y:0},{at:.32,x:1,y:-1},{at:.66,x:-1,y:1},{at:1,x:0,y:0}]}]}
  },
  'meme-locked-in-alien': {
    name:'Locked-In Alien',type:'badge',series:'Internet Relics',material:'Pale celadon porcelain and machined steel',
    alt:'An extremely elongated celadon alien head with asymmetric dark eyes, a small angular nose and a concentrated mouth is held inside four steel focus corners.',
    mini:`<g stroke-linejoin="round"><path d="M10 2C5 2 5 11 7 16l3 5 3 1 4-5c2-4 3-14-2-15Z" fill="#b9c9b2" stroke="#405d58" stroke-width="1"/><path d="M7 13q1.7-2.2 4-1.2-.5 2.5-3.4 3Z M13 12q2-.4 4 1.2-1 2.2-3.5 1.4Z" fill="#1c3337"/><path d="m11 16 1.5-1 1 2-2 .4m-.5 2h3" fill="#294044" stroke="#294044" stroke-width=".7"/><path d="M3 5V2h3m12 0h3v3M3 18v4h3m12 0h3v-4" fill="none" stroke="#a7bab8" stroke-width="1"/></g>`,
    silhouette:`<path fill="currentColor" fill-rule="evenodd" d="M128 27c-42-4-47 52-41 101 3 28 10 53 25 75l4 25h31l2-25c16-19 23-47 24-77 3-47-7-98-45-99ZM96 136l28-5-7 25-20 2Zm42-7 27 5-8 23-21-3Z"/><path fill="currentColor" d="M58 35h31v8H66v22h-8Zm111 0h30v30h-8V43h-22ZM58 193h8v28h23v8H58Zm133 0h8v36h-30v-8h22Z"/>`,
    body:p=>`
      <defs><linearGradient id="${p}-alien-celadon" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#e5e7d0"/><stop offset=".33" stop-color="#c5d2ba"/><stop offset=".68" stop-color="#9cb5a2"/><stop offset="1" stop-color="#607d73"/></linearGradient></defs>
      <g data-part="focus-top-left"><path d="M58 35h31v8H66v22h-8Z" fill="url(#${p}-steel)" stroke="#2e4246" stroke-width="1.5"/><path d="M61 61V38h24" fill="none" stroke="#e6e8d8" stroke-width="1"/></g>
      <g data-part="focus-top-right"><path d="M169 35h30v30h-8V43h-22Z" fill="url(#${p}-steel)" stroke="#2e4246" stroke-width="1.5"/><path d="M173 38h23v23" fill="none" stroke="#e6e8d8" stroke-width="1"/></g>
      <g data-part="focus-bottom-left"><path d="M58 193h8v28h23v8H58Z" fill="url(#${p}-steel)" stroke="#2e4246" stroke-width="1.5"/><path d="M61 197v28h24" fill="none" stroke="#e6e8d8" stroke-width="1"/></g>
      <g data-part="focus-bottom-right"><path d="M191 193h8v36h-30v-8h22Z" fill="url(#${p}-steel)" stroke="#2e4246" stroke-width="1.5"/><path d="M196 197v28h-23" fill="none" stroke="#e6e8d8" stroke-width="1"/></g>
      <g data-part="alien-head" stroke-linejoin="round">
        <path d="M128 31c-42-4-47 52-41 101 3 28 10 53 25 75l4 25h31l2-25c16-19 23-47 24-77 3-47-7-98-45-99Z" fill="#0a1920" opacity=".55"/>
        <path d="M128 27c-42-4-47 52-41 101 3 28 10 53 25 75l4 25h31l2-25c16-19 23-47 24-77 3-47-7-98-45-99Z" fill="url(#${p}-alien-celadon)" stroke="#2f5051" stroke-width="2.6"/>
        <path d="M136 31c29 16 33 54 30 90l-11 20-4 35-15 31-1 20h12l2-25c16-19 23-47 24-77 2-42-7-82-37-94Z" fill="#719184" opacity=".6"/>
        <path d="M104 48c-10 14-14 41-11 62m-1 10 2 13" fill="none" stroke="#edf0d7" stroke-width="2" stroke-linecap="round"/>
        <path d="m94 126 28-5 8 10 10-12 23 5-1 11-26 19-5-10-9 14-26 5Z" fill="#7f9b89"/>
        <path d="M96 139c6-9 17-12 28-9-4 12-12 22-24 22-4-2-5-7-4-13Z" fill="#1a3338" stroke="#587b70" stroke-width="1.3"/><path d="M137 129c12-1 24 6 28 15-5 10-15 13-26 9-3-7-4-16-2-24Z" fill="#1b3439" stroke="#587b70" stroke-width="1.3"/>
        <g data-part="alien-pupils"><path d="m103 139 10-2-4 11-6 2Zm41-4 10 2-3 10-7-2Z" fill="#a0b7a0" opacity=".6"/><path d="m105 140 3-1m38-2 3 .3" stroke="#dce7c8" stroke-width="1.1"/></g>
        <g data-part="alien-lids"><path d="M94 137q14-15 31-9l-3 7q-15-4-26 7ZM136 128q18-2 31 12l-3 4q-12-10-26-10Z" fill="#a0b9a0" stroke="#42665e" stroke-width="1.4"/></g>
        <path d="m126 157-7 17 14 4 6-6-7-15Z" fill="#355953"/><path d="m126 159-4 12 9 2" fill="none" stroke="#c7d4b8" stroke-width="1.2"/>
        <path d="M114 190q15-11 28-1-13 8-28 1Z" fill="#294744"/><path d="m117 192 21-1m-16 8 12 1" fill="none" stroke="#d2dcc0" stroke-width="1.2"/>
        <path d="m98 163 7 24 11 14m43-37-7 23-12 15m-27 2 7 18m22-18-5 18" fill="none" stroke="#698e7d" stroke-width="1.3"/>
        <g class="va-detail-only" fill="none" stroke="#b2c6ac" stroke-width=".8"><path d="m108 58-3 12m3 3-2 12m4 3-1 13m42-35 3 11m1 7 2 12m-3 105-2 9m-14 3-2 9"/></g>
      </g>`,
    motion:{duration:1180,layers:[{name:'alien-pupils',origin:[128,143],frames:[{at:0,x:0},{at:.22,x:-2},{at:.45,x:1},{at:.72,x:0},{at:1,x:0}]},{name:'alien-lids',origin:[130,131],frames:[{at:0,y:0},{at:.38,y:2},{at:.75,y:2},{at:1,y:0}]},{name:'focus-top-left',origin:[62,38],frames:[{at:0,x:0,y:0},{at:.47,x:3,y:3},{at:.77,x:1,y:1},{at:1,x:0,y:0}]},{name:'focus-top-right',origin:[196,38],frames:[{at:0,x:0,y:0},{at:.51,x:-3,y:3},{at:.81,x:-1,y:1},{at:1,x:0,y:0}]},{name:'focus-bottom-left',origin:[62,225],frames:[{at:0,x:0,y:0},{at:.55,x:3,y:-3},{at:.85,x:1,y:-1},{at:1,x:0,y:0}]},{name:'focus-bottom-right',origin:[196,225],frames:[{at:0,x:0,y:0},{at:.59,x:-3,y:-3},{at:.89,x:-1,y:-1},{at:1,x:0,y:0}]}]}
  },
  'meme-six-seven': {
    name:'Six / Seven',type:'badge',series:'Internet Relics',material:'Warm ivory enamel and dull chrome',
    alt:'Two cupped, upturned enamel palm charms hang like weighing hands, with short foreshortened fingers, visible thumbs and engraved six and seven marks.',
    mini:`<g stroke-linejoin="round"><path d="M3 7c1-5 16-5 18 0" fill="none" stroke="#aab8b7" stroke-width="1.3"/><path d="m5 20-.5-3c-2-.4-3.7-1.5-4-3l1-.6 2 1-2-2 .5-.9 2.8 1.7-1.6-2.3.9-.5L7 13l1-.2 1.3-1 .9.6-1 2.6-1.6 2 .4 2.5Z" fill="#e4dbc3" stroke="#4d605d" stroke-width=".65"/><path d="M3 14.5q2.3 2.2 4.4.1" fill="none" stroke="#9ca58c" stroke-width=".6"/><path d="m17 22 .5-3c2-.4 3.7-1.5 4-3l-1-.6-2 1 2-2-.5-.9-2.8 1.7 1.6-2.3-.9-.5L15 15l-1-.2-1.3-1-.9.6 1 2.6 1.6 2-.4 2.5Z" fill="#ddd2b7" stroke="#4d605d" stroke-width=".65"/><path d="M19 16.5q-2.3 2.2-4.4.1" fill="none" stroke="#9ca58c" stroke-width=".6"/><text x="5.8" y="16.8" font-family="monospace" font-size="3.5" fill="#435a58">6</text><text x="16.2" y="18.8" font-family="monospace" font-size="3.5" fill="#435a58">7</text></g>`,
    silhouette:`<path fill="currentColor" d="M72 199 64 175c-17-3-32-10-41-20L10 141c-5-6-1-12 5-9l24 13-21-16c-6-5-2-12 4-8l28 18-18-19c-6-5-1-12 5-7l26 24-13-19c-4-6 3-11 8-4l20 27 6-3c6-11 14-14 19-10 7 5-4 12-7 18-4 12 5 15 2 30l5 24Z"/><path fill="currentColor" d="M72 199 64 175c-17-3-32-10-41-20L10 141c-5-6-1-12 5-9l24 13-21-16c-6-5-2-12 4-8l28 18-18-19c-6-5-1-12 5-7l26 24-13-19c-4-6 3-11 8-4l20 27 6-3c6-11 14-14 19-10 7 5-4 12-7 18-4 12 5 15 2 30l5 24Z" transform="translate(256 8) scale(-1 1)"/><path fill="none" stroke="currentColor" stroke-width="9" d="M45 87c10-62 155-62 170 1"/>`,
    body:p=>`
      <g data-part="connector"><path d="M45 87c10-62 155-62 170 1" fill="none" stroke="#1a2b32" stroke-width="10" stroke-linecap="round"/><path d="M45 83c10-62 155-62 170 1" fill="none" stroke="url(#${p}-chrome)" stroke-width="6" stroke-linecap="round"/><path d="M56 60c30-28 112-31 145 0" fill="none" stroke="#e4e6d7" stroke-width="1.2"/><path d="m45 82 7 29m160-29-8 37" stroke="#425c5e" stroke-width="5"/><path d="m46 82 7 29m165-29-8 37" stroke="#bfcbc2" stroke-width="1.5"/><ellipse cx="54" cy="114" rx="7" ry="8" fill="none" stroke="#9eb2b1" stroke-width="3"/><ellipse cx="204" cy="122" rx="7" ry="8" fill="none" stroke="#9eb2b1" stroke-width="3"/></g>
      <g data-part="palm-six" stroke-linejoin="round">
        <path d="M72 199 64 175c-17-3-32-10-41-20L10 141c-5-6-1-12 5-9l24 13-21-16c-6-5-2-12 4-8l28 18-18-19c-6-5-1-12 5-7l26 24-13-19c-4-6 3-11 8-4l20 27 6-3c6-11 14-14 19-10 7 5-4 12-7 18-4 12 5 15 2 30l5 24Z" fill="url(#${p}-ivory)" stroke="#48605f" stroke-width="3.2"/>
        <path d="M30 153c16 16 37 24 56 13l12-14c3 8 0 16 0 24l5 24-31-1-8-24c-18-4-27-10-34-22Z" fill="#b4b59f"/>
        <path d="M34 147c18 16 46 22 61 4-14-8-29-11-43-8" fill="none" stroke="#8f9f8c" stroke-width="1.8" stroke-linecap="round"/>
        <path d="m17 137 22 14m-17-25 28 19m-13-26 26 24m-7-24 21 28m7 4 8 4 10-9" fill="none" stroke="#fff3d9" stroke-width="1.6" stroke-linecap="round"/>
        <path d="m43 147 8-8m9 8 7-7m11 9 5-8m-14 28 10 6m5 8 9-5" fill="none" stroke="#8e9f8d" stroke-width="1.4" stroke-linecap="round"/>
        <text x="73" y="165" text-anchor="middle" font-family="monospace" font-size="21" fill="#506865" font-weight="700" transform="rotate(10 73 165)">6</text>
        <path d="m70 201 31-2 2 15-30 3Z" fill="url(#${p}-steel)" stroke="#354e53" stroke-width="1.8"/><path d="m76 207 21-1" stroke="#f0ecda" stroke-width="1.2"/>
      </g>
      <g data-part="palm-seven" stroke-linejoin="round">
        <g transform="translate(256 8) scale(-1 1)"><path d="M72 199 64 175c-17-3-32-10-41-20L10 141c-5-6-1-12 5-9l24 13-21-16c-6-5-2-12 4-8l28 18-18-19c-6-5-1-12 5-7l26 24-13-19c-4-6 3-11 8-4l20 27 6-3c6-11 14-14 19-10 7 5-4 12-7 18-4 12 5 15 2 30l5 24Z" fill="url(#${p}-ivory)" stroke="#48605f" stroke-width="3.2"/><path d="M30 153c16 16 37 24 56 13l12-14c3 8 0 16 0 24l5 24-31-1-8-24c-18-4-27-10-34-22Z" fill="#b4b59f"/><path d="M34 147c18 16 46 22 61 4-14-8-29-11-43-8" fill="none" stroke="#8f9f8c" stroke-width="1.8" stroke-linecap="round"/><path d="m17 137 22 14m-17-25 28 19m-13-26 26 24m-7-24 21 28m7 4 8 4 10-9" fill="none" stroke="#fff3d9" stroke-width="1.6" stroke-linecap="round"/><path d="m43 147 8-8m9 8 7-7m11 9 5-8m-14 28 10 6m5 8 9-5" fill="none" stroke="#8e9f8d" stroke-width="1.4" stroke-linecap="round"/><path d="m70 201 31-2 2 15-30 3Z" fill="url(#${p}-steel)" stroke="#354e53" stroke-width="1.8"/><path d="m76 207 21-1" stroke="#f0ecda" stroke-width="1.2"/></g>
        <text x="183" y="173" text-anchor="middle" font-family="monospace" font-size="21" fill="#506865" font-weight="700" transform="rotate(-10 183 173)">7</text>
      </g>`,
    motion:{duration:1450,layers:[{name:'palm-six',origin:[74,175],frames:[{at:0,y:0,rotate:0},{at:.18,y:-9,rotate:-2},{at:.36,y:6,rotate:1},{at:.55,y:-7,rotate:-1},{at:.74,y:4,rotate:1},{at:1,y:0,rotate:0}]},{name:'palm-seven',origin:[182,183],frames:[{at:0,y:0,rotate:0},{at:.18,y:7,rotate:2},{at:.36,y:-8,rotate:-1},{at:.55,y:5,rotate:1},{at:.74,y:-5,rotate:-1},{at:1,y:0,rotate:0}]}]}
  },
  'meme-dilly-dally': {
    name:'Dilly Dally',type:'badge',series:'Internet Relics',material:'Lavender shell enamel, cream ceramic and a faded cloth lanyard',
    alt:'A relaxed lavender-shelled snail wearing a loose office lanyard rests on a punched timecard, ready to become absurdly serious.',
    mini:`<g stroke-linejoin="round"><path d="m3 16 17-1 1 7H3Z" fill="#ded2b4" stroke="#897c61" stroke-width=".8"/><path d="M4 16c1-3 12-2 13-5l1-3h2v8l-3 3H5Z" fill="#e4dac0" stroke="#657368" stroke-width=".9"/><ellipse cx="10" cy="12" rx="6" ry="5" fill="#9782aa" stroke="#5e5774" stroke-width="1"/><path d="M9 15c-5-3 3-7 4-3s-4 3-3 0" fill="none" stroke="#cdc0d5" stroke-width="1.1"/><path d="m17 10 1-5m1 5 2-4" stroke="#7b8974" stroke-width="1"/><circle cx="18" cy="5" r="1" fill="#384c45"/><circle cx="21" cy="6" r="1" fill="#384c45"/><path d="m16 15 1 5 3-1" fill="none" stroke="#c4ac6b" stroke-width="1.2"/></g>`,
    silhouette:`<path fill="currentColor" d="m32 170 175-17 19 74-189 6Zm23 10c-10-35 17-76 52-76 32-1 56 27 51 56l24-3 12-34-1-25 12-2 3 28 12-17 7 5-14 28 3 35-26 27-127 1c-21-1-28-10-8-23Zm138-57-3-36 9-2 3 38Zm16 5 9-34 8 3-9 34Z"/>`,
    body:p=>`
      <g data-part="timecard" stroke-linejoin="round"><path d="m32 174 175-17 19 74-189 6Z" fill="#0b1720" opacity=".5"/><path d="m32 170 175-17 19 74-189 6Z" fill="url(#${p}-paper)" stroke="#8e8063" stroke-width="2"/><path d="m43 181 156-15 13 50-164 8Z" fill="#e9dfc5" stroke="#b8aa89" stroke-width="1"/><path d="m48 190 155-14m-153 24 155-14m-153 24 156-14m-142-15 5 38m22-41 5 39m23-42 5 39m22-42 5 39m22-42 5 39" fill="none" stroke="#b3a585" stroke-width="1"/><circle cx="188" cy="202" r="5" fill="#38443d" stroke="#a89977" stroke-width="1"/><text class="va-detail-only" x="128" y="222" text-anchor="middle" font-family="monospace" font-size="8" fill="#746c56">FORCED TO LOCK IN</text></g>
      <g data-part="snail-body" stroke-linejoin="round"><path d="M59 179c24-22 86-12 123-22l12-34-1-25 12-2 3 28 12-17 7 5-14 28 3 35-26 27-127 1c-21-1-28-10-4-24Z" fill="url(#${p}-ivory)" stroke="#63736a" stroke-width="2.6"/><path d="M57 192c36 5 87 1 123-4l20-16-10 25-127 3Z" fill="#b5bba3"/><path d="M62 183c35-12 80-4 111-12m27-28-2 13m-141 40 121-3" fill="none" stroke="#f4ecd6" stroke-width="1.4"/><path d="m197 161 10 1m-11 7 9 1" stroke="#8c9b83" stroke-width="1.5" stroke-linecap="round"/></g>
      <g data-part="snail-shell" stroke-linejoin="round"><ellipse cx="110" cy="139" rx="56" ry="51" fill="#61576e" stroke="#3d4550" stroke-width="2.4"/><path d="M59 146c-7-43 36-69 72-49 30 17 27 62-6 78-24 13-61 2-66-29Z" fill="url(#${p}-violet-glass)" stroke="#9b8bab" stroke-width="1.8"/><path d="M76 151c-21-23 9-56 35-47 29 10 31 42 9 54-20 12-41-5-34-21 6-15 24-9 23 3-1 8-11 9-12 3" fill="none" stroke="#d3c0d7" stroke-width="4" stroke-linecap="round"/><path d="M78 155c13 16 41 18 57-2M85 108c13-7 31-6 41 3m-65 24 6-15m75 27-5 12" fill="none" stroke="#534f69" stroke-width="1.6"/><path d="M68 119c7-13 22-20 36-20" fill="none" stroke="#e1d0dd" stroke-width="1.3"/><g class="va-detail-only" fill="none" stroke="#9584a4" stroke-width="1"><path d="m67 152 5 10m-1-20 5 11m3-21 3-8m47 34-7 8m16-18-3 6"/></g></g>
      <g data-part="snail-eyes"><path d="m193 123-3-36m19 41 9-34" fill="none" stroke="#7b987d" stroke-width="5" stroke-linecap="round"/><circle cx="190" cy="86" r="7" fill="#d5ddbd" stroke="#7b927a" stroke-width="1.8"/><circle cx="220" cy="93" r="7" fill="#d5ddbd" stroke="#7b927a" stroke-width="1.8"/><path d="m185 85 10 1m20 6 10 1" stroke="#465f50" stroke-width="2.1"/><circle cx="192" cy="89" r="2" fill="#304a40"/><circle cx="222" cy="96" r="2" fill="#304a40"/></g>
      <g data-part="lanyard" stroke-linejoin="round"><path d="m183 146 10 2-8 44-12 16-7-4 12-17Z" fill="#bca66e" stroke="#7e795b" stroke-width="1.5"/><path d="m185 149 4 1-8 37-10 15" fill="none" stroke="#e7d392" stroke-width="1.3"/><path d="m171 202 10 3-2 8-11-2Z" fill="url(#${p}-steel)" stroke="#3a5255" stroke-width="1.3"/></g>
      <g data-part="punch-shoe"><path d="m178 170 16-2 4 21-17 2Z" fill="url(#${p}-brass)" stroke="#6f6c4c" stroke-width="1.6"/><path d="m182 174 9-1 2 12-9 1Z" fill="#34463c"/><path d="m184 190 8-1v11h-7Z" fill="#6c7567" stroke="#3e5149" stroke-width="1"/></g>`,
    motion:{duration:1500,layers:[{name:'snail-eyes',origin:[203,124],frames:[{at:0,rotate:0,x:0},{at:.2,rotate:3,x:1},{at:.47,rotate:-2,x:0},{at:.75,rotate:0,x:0},{at:1,rotate:0,x:0}]},{name:'punch-shoe',origin:[188,170],frames:[{at:0,y:0},{at:.37,y:-3},{at:.48,y:6},{at:.58,y:1},{at:.77,y:0},{at:1,y:0}]},{name:'lanyard',origin:[190,149],frames:[{at:0,rotate:0},{at:.35,rotate:4},{at:.62,rotate:-2},{at:1,rotate:0}]}]}
  },
  'guild-cardboard-paladin': {
    name:'Cardboard Paladin',type:'badge',series:'Afterhours Guild',material:'Corrugated board, faded blue cloth and cream stitching',
    alt:'A carefully taped off-center corrugated shield carries a stitched faded-blue cloth star and a loose fabric arm strap.',
    mini:`<g stroke-linejoin="round"><path d="M6 4c-5 0-5 12 2 13m9-12c5 1 4 10-1 12" fill="none" stroke="#c8baa0" stroke-width="2"/><path d="m6 2 13 3-1 11-7 7-7-10Z" fill="#b59b71" stroke="#705e47" stroke-width="1.1"/><path d="m11 6 2 3 4 1-3 3v4l-4-2-3 1 1-4-2-3 4 .2Z" fill="#68889c" stroke="#d7cfb2" stroke-width=".8"/><path d="m16 15 3-1-1 4-3 1Z" fill="#d2c29e"/></g>`,
    silhouette:`<path fill="currentColor" d="M76 44c-49-11-62 108-3 131l7-18c-36-14-26-95-1-95Zm104 8c45 4 38 100-8 123l-6-18c26-18 34-81 11-86Z"/><path fill="currentColor" d="m80 26 118 28-12 117-74 67-71-104Z"/>`,
    body:p=>`
      <g data-part="arm-strap"><path d="M76 44c-49-11-62 108-3 131l7-18c-36-14-26-95-1-95Z" fill="#b4a68c" stroke="#6e6b58" stroke-width="2"/><path d="M180 52c45 4 38 100-8 123l-6-18c26-18 34-81 11-86Z" fill="#8e8b73" stroke="#5b6254" stroke-width="2"/><path d="M63 53c-24 11-27 78 1 101m122-90c18 12 9 69-12 85" fill="none" stroke="#ded2b6" stroke-width="1.4" stroke-dasharray="3 4"/></g>
      <g data-part="cardboard-shield" stroke-linejoin="round"><path d="m80 33 118 28-12 117-74 67-71-104Z" fill="#574a3b" stroke="#273036" stroke-width="2.7"/><path d="m80 26 118 28-12 117-74 67-71-104Z" fill="url(#${p}-paper)" stroke="#837151" stroke-width="2.5"/><path d="m80 26 118 28-8 19-109-27-40 88Z" fill="#bfaa80"/><path d="m81 46 108 27-10 91-65 61-62-91Z" fill="#c7ad7d" stroke="#a38b61" stroke-width="1.3"/><path d="m80 27 2 19-40 88m148-60-9 90-67 61" fill="none" stroke="#eadfc3" stroke-width="1.5"/><path d="m88 32 1 10m8-8 1 10m8-8 1 10m8-8 1 10m8-8 1 10m8-8 1 10m8-8 1 10m8-8 1 10m8-8 1 10m8-8 1 10m8-8 1 10" fill="none" stroke="#8c7958" stroke-width="1.1"/>
        <path d="m52 142 5 7m0 1 5 7m0 1 5 7m0 1 5 7m0 1 5 7m0 1 5 7m0 1 5 7m0 1 5 7m0 1 5 7m0 1 5 7m0 1 5 7" fill="none" stroke="#88724e" stroke-width="1"/>
        <path d="m170 143 22 4-5 29-24-2Z" fill="#cbbd98" stroke="#a79b78" stroke-width="1.1"/><path d="m170 149 20 4m-21 2 20 4m-21 2 19 4m-20 2 19 4" stroke="#e9ddbd" stroke-width="1"/><path d="m172 144 3 30m6-29 2 30" stroke="#b2a47f" stroke-width=".8"/>
        <g data-part="cloth-star"><path d="m111 64 20 32 37 7-27 28 1 40-34-20-36 10 9-38-20-29 37 1Z" fill="#324f63" stroke="#c3c7af" stroke-width="2.5"/><path d="m110 72 16 30 31 5-25 22 2 32-27-18-28 8 10-29-19-22 30 2Z" fill="#668b9e"/><path d="m110 72-3 71 27 18-2-32 25-22-31-5Z" fill="#527389"/><path d="m71 96 30 2 10-26m46 35-28 20 5 34m-55-10 28-8" fill="none" stroke="#d9d4ba" stroke-width="1.6" stroke-dasharray="3 4"/><path d="m108 143 3-15m15 3 9 8m-38-24-11-6" fill="none" stroke="#304c61" stroke-width="1.2"/></g>
        <g class="va-detail-only" fill="none" stroke="#a28e68" stroke-width="1"><path d="m64 126 8-3m84 48 7-5m-55 49 6 5m49-103 10 3m-70-62 13 2"/></g>
      </g>`,
    motion:{duration:1420,layers:[{name:'cardboard-shield',origin:[118,124],frames:[{at:0,rotate:0},{at:.28,rotate:-5},{at:.58,rotate:2},{at:.83,rotate:-.5},{at:1,rotate:0}]},{name:'arm-strap',origin:[127,62],frames:[{at:0,rotate:0},{at:.36,rotate:-3},{at:.66,rotate:2},{at:1,rotate:0}]},{name:'cloth-star',origin:[109,116],frames:[{at:0,rotate:0},{at:.39,rotate:2},{at:.69,rotate:-1},{at:1,rotate:0}]}]}
  },
  'guild-guildless-knight': {
    name:'Guildless Knight',type:'badge',series:'Afterhours Guild',material:'Narrow brushed-steel helmet, faded crimson cloth and an oversized brass pin',
    alt:'A tall narrow empty steel helmet rests above an unlettered crimson ribbon fastened with a large worn-brass safety pin.',
    mini:`<g stroke-linejoin="round"><path d="m10 1 5 2 2 6-2 8-4 2-4-4 1-9Z" fill="#7f929a" stroke="#172832" stroke-width="1"/><path d="m10 4 4 1 1 4-1 6-3 2-2-3Z" fill="#aab8b9"/><path d="m8 8 8 1-.5 3-7-.5Z" fill="#334b57"/><path d="m10 9 4 .4" stroke="#0d1e29" stroke-width="1.1"/><path d="m3 17 8-1 9 2-1 5-8-2-7 2 .7-3Z" fill="#8b4b51" stroke="#422d34" stroke-width=".8"/><path d="m14 16 7 5m-7-5c-2-2-4 1-2 2l7 5c2 1 4-2 2-3" fill="none" stroke="#c8ad71" stroke-width="1.2"/></g>`,
    silhouette:`<path fill="currentColor" fill-rule="evenodd" d="m111 27 40 8 22 38 4 57-18 43-31 19-28-23-19-49 8-57Zm-8 69-4 18 58 3-1-14Z"/><path fill="currentColor" d="m42 188 69-14 88 18-8 41-69-16-69 15 5-22Z"/><path d="m151 178 60 40c17 12 31-9 15-22l-48-35c-15-11-30 8-15 19" fill="none" stroke="currentColor" stroke-width="9"/>`,
    body:p=>`
      <g data-part="helmet-shell" stroke-linejoin="round">
        <path d="m111 32 40 8 22 38 4 57-18 43-31 19-28-23-19-49 8-57Z" fill="#07131d" opacity=".6"/>
        <path d="m111 27 40 8 22 38 4 57-18 43-31 19-28-23-19-49 8-57Z" fill="url(#${p}-steel-dark)" stroke="#14232c" stroke-width="3.2"/>
        <path d="m112 32 16-7 24 10 21 40-19-5-25-14-30 10Z" fill="url(#${p}-steel)" stroke="#697e88" stroke-width="1.5"/>
        <path d="m128 29 1 27 25 14-14-33Z" fill="#b4bfc0"/><path d="m115 32 12-4 1 25-21 9Z" fill="#e1e4d9"/>
        <path d="m96 67 33-10 25 14 7 55-16 37-17 13-15-18-12-35Z" fill="#0b1b27" stroke="#506c79" stroke-width="1.7"/>
        <path d="m100 127 13 31 15 18 18-14 14-35-5 43-27 16-25-21Z" fill="url(#${p}-steel)" stroke="#253b47" stroke-width="1.7"/>
        <path d="m128 176 18-14 14-35-5 43-27 16Z" fill="#6e838e"/><path d="m107 141 10 23 11 13m18-5 7-10" fill="none" stroke="#d8dfd8" stroke-width="1.3"/>
        <path d="m113 164 4-4m7 13 3-4m12 1 4-5" stroke="#3a505d" stroke-width="2"/>
        <path d="m111 40 8-3m32 16 4 5m-70 55 3 9m74 26-3 10" fill="none" stroke="#a8b6b7" stroke-width="1.3"/>
      </g>
      <g data-part="guild-visor" stroke-linejoin="round">
        <path d="m91 88 40-10 36 15 4 28-42 20-36-21Z" fill="#233c4b" stroke="#10232e" stroke-width="2.8"/>
        <path d="m93 85 38-10 35 15 2 25-39 18-34-19Z" fill="url(#${p}-steel)" stroke="#a0b1b5" stroke-width="1.7"/>
        <path d="m131 75-2 58 39-18-2-25Z" fill="#7f959f"/>
        <path d="m98 92 31-6 31 10-1 6-30-8-29 6Z" fill="#0c202c" stroke="#44616d" stroke-width="1"/>
        <path d="m98 90 31-7 30 10" fill="none" stroke="#e1e6dc" stroke-width="1.4"/>
        <path d="m104 108 1 9m8-6 1 10m32-11-1 9m8-12-1 8" stroke="#354f5e" stroke-width="2"/>
        <circle cx="95" cy="99" r="5" fill="#a6b8bc" stroke="#2b4757" stroke-width="1.6"/><path d="m92 99 6-.3" stroke="#2b4757" stroke-width="1.6"/>
      </g>
      <g data-part="blank-ribbon" stroke-linejoin="round">
        <path d="m42 188 69-14 88 18-8 41-69-16-69 15 5-22Z" fill="#542b35" stroke="#25232c" stroke-width="2.6"/>
        <path d="m42 183 70-13 88 18-8 36-70-15-68 17 5-22Z" fill="url(#${p}-oxblood)" stroke="#ac6c69" stroke-width="1.5"/>
        <path d="m112 170 10 39 70 15 8-36-12 11-64-14Z" fill="#7a414b"/>
        <path d="m47 185 14 15-7 26 12-9 50-13-4-34-12 13-39 11Z" fill="#a06563" opacity=".52"/>
        <path d="m64 201 42-12 70 15m-110 1 41-11 72 14" fill="none" stroke="#552e3b" stroke-width="1"/>
        <path d="m61 195 39-11m29 0 57 13" stroke="#c58a7c" stroke-width="1.2" stroke-dasharray="2 3"/>
      </g>
      <g data-part="safety-pin" stroke-linecap="round" stroke-linejoin="round">
        <path d="m151 179 59 40c15 10 28-9 13-20l-48-35c-13-9-28 8-14 19" fill="none" stroke="#302f2d" stroke-width="7"/>
        <path d="m151 176 59 40c15 10 28-9 13-20l-48-35c-13-9-28 8-14 19" fill="none" stroke="url(#${p}-brass)" stroke-width="4.6"/>
        <path d="m159 174 54 37m-44-43 8 5" fill="none" stroke="#ead8a7" stroke-width="1.1"/>
        <path d="m145 172 10-4 14 12-7 9-14-8Z" fill="#ba9e65" stroke="#6b6248" stroke-width="1.4"/><path d="m149 174 7-2 7 6" fill="none" stroke="#f0d9a0" stroke-width="1.3"/>
      </g>`,
    motion:{duration:1460,layers:[{name:'guild-visor',origin:[95,99],frames:[{at:0,rotate:0},{at:.18,rotate:2},{at:.48,rotate:-28,y:-1},{at:.7,rotate:-24,y:-1},{at:1,rotate:-25,y:-1}]},{name:'blank-ribbon',origin:[127,190],frames:[{at:0,rotate:0},{at:.5,rotate:2},{at:.73,rotate:-1},{at:1,rotate:0}]},{name:'safety-pin',origin:[168,181],frames:[{at:0,rotate:0},{at:.56,rotate:-1},{at:.8,rotate:.5},{at:1,rotate:0}]}]}
  },
  'guild-side-quest': {
    name:'Side Quest Only',type:'badge',series:'Afterhours Guild',material:'Folded parchment, blunt brass and a foam-sword route marker',
    alt:'A triangular folded map shows a winding dotted detour, a small brass compass and a blunt blue foam-sword marker.',
    mini:`<g stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v16l-6 3-6-3-6 2Z" fill="#e1d4b5" stroke="#7d755d" stroke-width=".9"/><path d="m9 3 6 3v16l-6-3Z" fill="#bdae8d"/><path d="m7 9 7 4-1 4" fill="none" stroke="#a66b4a" stroke-width=".9" stroke-dasharray="1 1.4"/><circle cx="6" cy="17" r="4" fill="#c0a56a" stroke="#615c45" stroke-width=".8"/><path d="m6 14 1 4-3 1Z" fill="#405957"/><path d="m17 7-3 7 1.7.8 3-7-1-.5m-3 6 4 1.5" fill="#7698a3" stroke="#233d49" stroke-width=".8"/></g>`,
    silhouette:`<path fill="currentColor" d="m41 70 59-34 55 29 59-25-6 166-57 28-53-27-62 18Z"/><path fill="currentColor" d="m147 75 30-39 10 8-22 45-13 45-10-4 14-42Z"/><circle cx="74" cy="173" r="39" fill="currentColor"/><path d="M57 173h34m-17-16v33" stroke="#e9e3d3" stroke-width="6"/>`,
    body:p=>`
      <g data-part="quest-map" stroke-linejoin="round">
        <path d="m41 75 59-34 55 29 59-25-6 166-57 28-53-27-62 18Z" fill="#534f42" stroke="#1e2b31" stroke-width="2.4"/>
        <path d="m41 70 59-34 55 29 59-25-6 166-57 28-53-27-62 18Z" fill="url(#${p}-paper)" stroke="#958361" stroke-width="2"/>
        <path d="m100 36 55 29-4 169-53-27Z" fill="#b8ac8f"/><path d="m155 65 59-25-6 166-57 28Z" fill="#e7ddc4"/>
        <path d="m41 70 8 11-6 132-7 12Z" fill="#b4a281"/><path d="m100 36 5 11-2 151-5 9Z" fill="#f1e4c7"/><path d="m155 65-5 10-4 149 5 10Z" fill="#8b8068" opacity=".7"/>
        <path d="m48 85 46-27m14-5 39 21m14 5 43-21m-155 37 38-12m-37 28 29-12m-30 30 39-17m22-17 30 13m-30 4 29 11m21-22 33-12m-34 33 33-13m-32 31 21-7m-93 34 25 12m-26 6 24 12" fill="none" stroke="#a5a183" stroke-width="1.2"/>
        <path d="m51 143 10-8 9 4 9-7m33 18 8-10 8 3 9-8m26 46 11-7 7 3 12-8" fill="none" stroke="#8a957a" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M68 109c15-22 31 6 45 7s27-23 45-12c21 14-18 31-10 43 7 11 41-9 47 8 5 16-15 23-25 28" fill="none" stroke="#955f43" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 5"/>
        <path d="m167 182 6 3-6 5" fill="none" stroke="#955f43" stroke-width="2"/>
        <path d="m58 70 6-3m134 99 4-7m-87 40 8 3" stroke="#7f725b" stroke-width="1.3"/>
        <g class="va-detail-only"><path d="m170 68 21-9m-21 13 12-5" stroke="#9d967d" stroke-width=".9"/><text x="164" y="202" font-family="monospace" font-size="6" fill="#8e8064" transform="rotate(-21 164 202)">UNPLANNED</text></g>
      </g>
      <g data-part="quest-compass" stroke-linejoin="round">
        <ellipse cx="74" cy="180" rx="39" ry="34" fill="#182a30" opacity=".5"/><circle cx="74" cy="172" r="38" fill="url(#${p}-brass)" stroke="#4f5448" stroke-width="2.8"/>
        <circle cx="74" cy="172" r="31" fill="#e2d4af" stroke="#8f7d50" stroke-width="1.8"/><circle cx="74" cy="172" r="26" fill="#bdc3aa" stroke="#7e8b72" stroke-width="1.1"/>
        <path d="M74 145v8m0 39v8m-27-28h8m38 0h8m-45-18 5 6m26 24 5 6m0-36-6 6m-25 24-5 6" stroke="#68785f" stroke-width="1.4"/>
        <g data-part="quest-needle"><path d="m74 150 6 22-6 20-6-20Z" fill="#6c8275" stroke="#405c55" stroke-width="1.1"/><path d="m74 150 6 22h-6Z" fill="#e4ece0"/><path d="m74 192-6-20h6Z" fill="#8f6346"/></g>
        <circle cx="74" cy="172" r="3.7" fill="#ceb478" stroke="#6d7154" stroke-width="1.1"/><path d="M47 154c9-12 29-16 43-5" fill="none" stroke="#f3ddaa" stroke-width="1.2"/>
      </g>
      <g data-part="quest-marker" stroke-linejoin="round">
        <path d="m149 81 25-41 10 6-18 44-12 43-12-4 12-43Z" fill="#2a4551" stroke="#172d39" stroke-width="2.4"/>
        <path d="m156 82 20-38 5 3-19 39-14 39-3-1Z" fill="#86a3aa"/>
        <path d="m140 118 27 10-3 8-27-10Z" fill="#b5c3bd" stroke="#354f5c" stroke-width="1.7"/>
        <path d="m147 133-7 18 9 4 7-18Z" fill="#d3b081" stroke="#695f4a" stroke-width="1.6"/><path d="m143 143 8 3m-9 2 7 3" stroke="#86765a" stroke-width="1.3"/>
        <path d="m171 54 5-10m-12 25 4-8" stroke="#d1d9cf" stroke-width="1.1"/>
      </g>`,
    motion:{duration:1420,layers:[{name:'quest-needle',origin:[74,172],frames:[{at:0,rotate:0},{at:.22,rotate:-23},{at:.48,rotate:15},{at:.71,rotate:6},{at:1,rotate:8}]},{name:'quest-marker',origin:[157,124],frames:[{at:0,x:0,y:0},{at:.23,x:0,y:-3},{at:.56,x:12,y:8},{at:.76,x:10,y:7},{at:1,x:10,y:7}]}]}
  },
  'coin-cold-storage': {
    name:'Cold Storage',type:'badge',series:'Chain Signals',material:'Brushed steel, dark recessed glass and a frosted sleeve',
    alt:'An original closed hardware-device relic sits inside a frosted glass sleeve, with an inset dark display and one ice-blue edge.',
    mini:`<g stroke-linejoin="round"><path d="m4 8 15-3 3 12-15 4Z" fill="#6f838e" stroke="#253b46" stroke-width="1"/><path d="m6 10 13-2 1.5 7-13 3Z" fill="#bac6c6"/><path d="m8 11 6-1 1 4-6 1Z" fill="#223c49"/><path d="m16 6 3-1 3 12-6 2Z" fill="#83afbc" fill-opacity=".55" stroke="#c3e1df" stroke-width=".8"/><path d="m10 12 2-.4.5 1.5-2 .4Z" fill="#b7d2cb"/></g>`,
    silhouette:`<path fill="currentColor" fill-rule="evenodd" d="m49 91 139-23 23 101-139 29Zm33 28 58-10 7 32-58 12Z"/><path fill="currentColor" d="m157 74 38-6 21 102-40 9Z"/>`,
    body:p=>`
      <g data-part="wallet-device" stroke-linejoin="round">
        <path d="m49 97 139-23 23 101-139 29Z" fill="#07131c" opacity=".55"/>
        <path d="m49 91 139-23 23 101-139 29Z" fill="#213642" stroke="#10232e" stroke-width="3.1"/>
        <path d="m54 88 133-22 20 97-132 28Z" fill="url(#${p}-steel)" stroke="#b6c8cc" stroke-width="1.8"/>
        <path d="m54 88 20 91 133-28 3 13-135 29-23-98Z" fill="#526b79"/><path d="m187 66 20 97-12-4-18-91Z" fill="#738c97"/>
        <path d="m59 93 120-20 3 12-121 22Z" fill="#d4ded8" opacity=".6"/>
        <path d="m79 112 63-11 9 41-64 14Z" fill="#263c49" stroke="#829ba4" stroke-width="2"/>
        <path d="m84 116 53-10 6 31-52 12Z" fill="#0e2735"/><path d="m87 117 48-9" stroke="#b2cfce" stroke-width="1.1" opacity=".5"/>
        <g data-part="closed-mark"><path d="m109 124 16-3 4 14-16 3Z" fill="#bad1c7" stroke="#729e9d" stroke-width="1"/><path d="M112 124c-3-11 9-14 11-2" fill="none" stroke="#bad1c7" stroke-width="3"/><path d="m118 128 1.4 5" stroke="#345b63" stroke-width="1.6"/></g>
        <path d="m90 165 43-9m-41 13 29-6" stroke="#59737e" stroke-width="1.2"/>
        <path d="m159 94 11-2 3 13-11 2Z" fill="#213c4a" stroke="#aac0c3" stroke-width="1.2"/><path d="m164 95 2 10" stroke="#c1d4cf" stroke-width="1.3"/>
        <g fill="#7d929b" stroke="#344c59" stroke-width="1.2"><circle cx="66" cy="102" r="3"/><circle cx="84" cy="176" r="3"/><circle cx="184" cy="83" r="3"/><circle cx="196" cy="150" r="3"/></g>
        <path d="m65 101 3 1m15 73 3 1m-25-66 7-1m61 63 6-1" stroke="#cedbd5" stroke-width="1"/>
      </g>
      <g data-part="wallet-cover" stroke-linejoin="round">
        <path d="m155 72 40-8 24 105-43 10Z" fill="#527d8a" fill-opacity=".22" stroke="#b3d2d3" stroke-width="2"/>
        <path d="m161 75 28-5 21 95-29 7Z" fill="#a0c0c2" fill-opacity=".25"/>
        <path d="m156 73 18 89 7 10m13-104 21 96" fill="none" stroke="#d3e6df" stroke-width="1.3"/>
        <path d="m165 86 16 70m-10-73 17 72m-11-73 16 69" fill="none" stroke="#c9dcda" stroke-width="1.1" opacity=".3"/>
        <path d="m179 165 35-8 3 13-39 9Z" fill="#477a8a" fill-opacity=".5" stroke="#a6cace" stroke-width="1"/>
      </g>`,
    motion:{duration:1330,layers:[{name:'wallet-cover',origin:[185,122],frames:[{at:0,x:0},{at:.2,x:5,y:-1},{at:.64,x:-35,y:6},{at:.86,x:-33,y:5},{at:1,x:-34,y:5}]},{name:'closed-mark',origin:[120,128],frames:[{at:0,opacity:1},{at:.22,opacity:.2},{at:.58,opacity:.2},{at:.82,opacity:1},{at:1,opacity:1}]}]}
  },
  'coin-genesis-block': {
    name:'Genesis Block',type:'badge',series:'Chain Signals',material:'Smoked optical glass, engraved ledger steel and a copper corner',
    alt:'A clear cuboid contains three engraved dark ledger plates, with a copper corner clasp and two distinctly visible glass faces.',
    mini:`<g stroke-linejoin="round"><path d="m3 7 9-5 9 5v11l-9 5-9-5Z" fill="#779194" fill-opacity=".25" stroke="#a7c4c3" stroke-width=".9"/><path d="m3 7 9 5 9-5M12 12v11" fill="none" stroke="#b8d2ca" stroke-width=".8"/><path d="m6 10 6 3 6-3v2l-6 3-6-3Zm0 5 6 3 6-3v2l-6 3-6-3Z" fill="#4b6470"/><path d="m11 18 4 2v3l-4-2Z" fill="#c18a60" stroke="#81583e" stroke-width=".6"/></g>`,
    silhouette:`<path fill="currentColor" fill-rule="evenodd" d="m49 91 78-43 80 44v105l-79 40-79-43Zm13 8v87l65 34 67-34V99l-67-36Z"/><path fill="currentColor" d="m67 112 60-32 60 32-60 33Zm0 28 60-31 60 32-60 34Zm0 29 60-31 60 31-60 34Z"/>`,
    body:p=>`
      <defs><clipPath id="${p}-genesis-interior"><path d="m56 95 71-39 73 40v96l-72 37-72-39Z"/></clipPath></defs>
      <ellipse cx="130" cy="236" rx="66" ry="4" fill="#040b0f" opacity=".14"/>
      <path d="m49 91 78-43 80 44v105l-79 40-79-43Z" fill="#52787a" fill-opacity=".18" stroke="#779fa2" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="m49 91 78-43 80 44-79 44Z" fill="#b8d2c8" fill-opacity=".22" stroke="#9cbab5" stroke-width="1.5"/>
      <g clip-path="url(#${p}-genesis-interior)" stroke-linejoin="round">
        <g data-part="ledger-one"><path d="m67 113 60-32 60 32-60 33Z" fill="#4b6471" stroke="#213d49" stroke-width="2.1"/><path d="m67 113 60 33v7l-60-32Zm60 33 60-33v7l-60 33Z" fill="#213c49" stroke="#64848b" stroke-width=".9"/><path d="m86 114 42-22 40 22-40 22Z" fill="#7e989c"/><path d="m99 114 29-15m-19 21 29-15m-20 20 29-14" stroke="#3b5864" stroke-width="1.3"/></g>
        <g data-part="ledger-two"><path d="m67 141 60-32 60 32-60 33Z" fill="#45616e" stroke="#1c3946" stroke-width="2.1"/><path d="m67 141 60 33v7l-60-32Zm60 33 60-33v7l-60 33Z" fill="#1b3745" stroke="#62848b" stroke-width=".9"/><path d="m87 141 41-22 40 22-40 22Z" fill="#6f8d93"/><path d="m99 141 29-15m-19 21 29-15m-20 20 29-14" stroke="#335663" stroke-width="1.3"/></g>
        <g data-part="ledger-three"><path d="m67 169 60-32 60 32-60 33Z" fill="#3e5b68" stroke="#183542" stroke-width="2.1"/><path d="m67 169 60 33v7l-60-32Zm60 33 60-33v7l-60 33Z" fill="#142f3e" stroke="#5d7b83" stroke-width=".9"/><path d="m88 170 40-22 40 21-40 22Z" fill="#66848b"/><path d="m100 169 28-15m-18 21 28-15m-19 20 28-14" stroke="#2f505d" stroke-width="1.3"/></g>
      </g>
      <path d="m49 91 79 45v101l-79-43Z" fill="#8db4b4" fill-opacity=".09" stroke="#8fb5b5" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="m128 136 79-44v105l-79 40Z" fill="#487a88" fill-opacity=".15" stroke="#a7cbc7" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="m55 96 72 40 73-41m-72 46v88m-73-121v76m145-75v76" fill="none" stroke="#d3e5d9" stroke-width="1.1"/>
      <path d="m62 119 9 5m-10 7 9 5m113-7 10-6m-10 15 10-6" stroke="#b8d3c8" stroke-width=".9" opacity=".6"/>
      <g data-part="ledger-circuit"><path d="m67 184 61 32 63-33" fill="none" stroke="#d4b27d" stroke-width="1.6" stroke-linecap="round"/><circle cx="67" cy="184" r="2" fill="#dfc191"/><circle cx="191" cy="183" r="2" fill="#dfc191"/></g>
      <path d="m120 199 17 9v29l-17-9Z" fill="url(#${p}-copper)" stroke="#684b38" stroke-width="1.5" stroke-linejoin="round"/><path d="m124 203 9 5v22l-9-5Z" fill="#ce9c6d"/><path d="m125 211 6 3m-6 3 6 3" stroke="#885f42" stroke-width=".9"/>
    `,
    motion:{duration:1480,layers:[{name:'ledger-one',origin:[127,113],frames:[{at:0,x:0,y:0},{at:.18,x:-5,y:-3},{at:.43,x:1,y:1},{at:.63,x:0,y:0},{at:1,x:0,y:0}]},{name:'ledger-two',origin:[127,141],frames:[{at:0,x:0,y:0},{at:.29,x:4,y:-3},{at:.54,x:-1,y:1},{at:.74,x:0,y:0},{at:1,x:0,y:0}]},{name:'ledger-three',origin:[127,169],frames:[{at:0,x:0,y:0},{at:.4,x:-4,y:-2},{at:.65,x:1,y:1},{at:.84,x:0,y:0},{at:1,x:0,y:0}]},{name:'ledger-circuit',origin:[67,184],frames:[{at:0,scaleX:.04,opacity:0},{at:.51,scaleX:.04,opacity:0},{at:.86,scaleX:1,opacity:1},{at:1,scaleX:1,opacity:1}]}]}
  },
  'coin-moon-pending': {
    name:'Moon Pending',type:'badge',series:'Chain Signals',material:'Dented ivory tin, dark cable and a muted-orange fin',
    alt:'A dented toy tin rocket is tethered by a loose cable to a still crescent moon, poised for a very small launch.',
    mini:`<g stroke-linejoin="round"><path d="M20 3c-5 1-5 7 0 9-7 1-10-7-3-10Z" fill="#c8cbb4" stroke="#667a74" stroke-width=".7"/><path d="m7 3 4 5-1 11-5-.4-.3-11Z" fill="#d9dbc9" stroke="#3d5960" stroke-width=".9"/><path d="m5 13-3 4 3 2m5-6 3 5-3 1" fill="#be7d55" stroke="#704f3f" stroke-width=".7"/><circle cx="7.6" cy="10.5" r="1.7" fill="#4a6c78" stroke="#90aab0" stroke-width=".7"/><path d="M11 16c7 8 9 1 8-5" fill="none" stroke="#809795" stroke-width=".9"/></g>`,
    silhouette:`<path fill="currentColor" fill-rule="evenodd" d="M207 39c-33 7-34 61-1 73-48 9-67-57-15-79Zm-98 4 23 39-2 83-17 23-27-18-6-83Z"/><path fill="currentColor" d="m83 130-27 36 29 12Zm45-1 24 39-24 11Z"/><path fill="none" stroke="currentColor" stroke-width="7" d="M132 154c36 56 71 36 67-44"/>`,
    body:p=>`
      <g data-part="still-moon" stroke-linejoin="round">
        <path d="M207 39c-33 7-34 61-1 73-48 9-67-57-15-79Z" fill="url(#${p}-ivory)" stroke="#6c827d" stroke-width="2.5"/>
        <path d="M189 43c-18 19-11 47 3 61-30-6-39-40-3-61Z" fill="#a5b29d"/>
        <path d="M196 39c-20 10-27 39-15 59" fill="none" stroke="#eef0d5" stroke-width="1.5"/>
        <path d="m172 65 7-2m-9 10 5 1m3 17 5 3" stroke="#798e80" stroke-width="2.7" stroke-linecap="round"/><path d="m174 62 2 1m-1 13 2 1" stroke="#d0d8bd" stroke-width="1.1"/>
      </g>
      <g data-part="slack-cable"><path d="M132 154c36 56 71 36 67-44" fill="none" stroke="#112b38" stroke-width="5" stroke-linecap="round"/><path d="M132 152c36 56 71 36 67-44" fill="none" stroke="#90a7a3" stroke-width="2" stroke-linecap="round"/><path d="m132 149 6 4-4 6-6-4Z" fill="#657e86" stroke="#243f4c" stroke-width="1.1"/><path d="m196 106 7 1-1 8-6-1Z" fill="url(#${p}-steel)" stroke="#39545d" stroke-width="1.1"/></g>
      <g data-part="rising-rocket" stroke-linejoin="round">
        <path d="m86 134-28 35 28 12 8-30Z" fill="#81543e" stroke="#293d42" stroke-width="2"/>
        <path d="m87 128-29 36 26 8 11-25Z" fill="#bd7b52" stroke="#754c36" stroke-width="1.8"/><path d="m63 161 18 5 7-29Z" fill="#dc9c67"/>
        <path d="m125 132 26 37-27 12-8-30Z" fill="#77503d" stroke="#273c44" stroke-width="2"/>
        <path d="m124 126 26 37-24 10-9-26Z" fill="#b77953" stroke="#744b37" stroke-width="1.8"/><path d="m126 137 18 24-16 7Z" fill="#d08d5d"/>
        <path d="m109 43 23 39-2 83-17 23-27-18-6-83Z" fill="#536e78" stroke="#203943" stroke-width="2.6"/>
        <path d="m107 40 23 40-3 81-16 20-24-16-6-80Z" fill="url(#${p}-ivory)" stroke="#718a8c" stroke-width="2"/>
        <path d="m107 40 23 40-22-2-27 7Z" fill="#c3ccbf"/><path d="m107 40 1 38 22 2Z" fill="#8fa4a3"/>
        <path d="m108 79 19 1-3 81-13 20-3-20Z" fill="#a5b5ab"/>
        <path d="m87 91 1 65m4-96 12-16" fill="none" stroke="#f2eed8" stroke-width="1.5"/>
        <path d="m83 88 43-5m-39 74 39 3" stroke="#789194" stroke-width="2"/><path d="m87 161 24 19 16-19" fill="none" stroke="#526f79" stroke-width="1.7"/>
        <ellipse cx="107" cy="109" rx="12" ry="14" fill="#7c9b9f" stroke="#3b5c6c" stroke-width="2"/><ellipse cx="107" cy="109" rx="8.3" ry="10.5" fill="#314f61" stroke="#a7bcb6" stroke-width="1.1"/><path d="m102 101 5-2 4 4" fill="none" stroke="#d0ddd1" stroke-width="1.2"/>
        <path d="m96 132 8 3-5 8 9 3m10-54-4 5 4 3m-24 51 5 1" fill="none" stroke="#8d9d91" stroke-width="1.2"/>
        <path d="m101 179 19 1-2 13-16-1Z" fill="url(#${p}-steel-dark)" stroke="#294450" stroke-width="1.5"/><path d="m104 184 12 1m-11 3 10 1" stroke="#8aa4a7" stroke-width="1.1"/>
      </g>`,
    motion:{duration:1510,layers:[{name:'rising-rocket',origin:[109,156],frames:[{at:0,y:0,rotate:0},{at:.18,y:2,rotate:-1},{at:.51,y:-11,rotate:1.5},{at:.72,y:-7,rotate:.5},{at:1,y:-8,rotate:.5}]},{name:'slack-cable',origin:[199,110],frames:[{at:0,scaleY:1,rotate:0},{at:.29,scaleY:1.02,rotate:0},{at:.57,scaleY:.84,rotate:3},{at:.79,scaleY:.92,rotate:1},{at:1,scaleY:.9,rotate:1}]}]}
  }
};
