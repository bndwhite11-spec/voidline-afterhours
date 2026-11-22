// The original jade barrel tips nineteen degrees. Keep effects in its local
// coordinates so the release comes from the hand valve opposite the plunger.
import {telegramObjects} from './telegram-objects.mjs';

const master = telegramObjects['gift-copium-cartridge'];

function outlet(prefix) {
  return `<g transform="rotate(-19 129 150)">
    <defs>
      <radialGradient id="${prefix}-release-light">
        <stop stop-color="#fff3ba" stop-opacity=".92"/>
        <stop offset=".30" stop-color="#ffcc72" stop-opacity=".78"/>
        <stop offset=".66" stop-color="#ed954c" stop-opacity=".27"/>
        <stop offset="1" stop-color="#d07648" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${prefix}-release-smoke" x1="0" y1="1" x2=".7" y2="0">
        <stop stop-color="#d3ecb7"/><stop offset=".42" stop-color="#b9dbcd"/>
        <stop offset=".78" stop-color="#d6e4df"/><stop offset="1" stop-color="#92bdb2"/>
      </linearGradient>
    </defs>
    <g data-part="cartridge-outlet-glow" opacity="0">
      <ellipse cx="50" cy="92" rx="16" ry="9" fill="url(#${prefix}-release-light)"/>
      <path d="M41 95q5-8 14-5l4 2" fill="none" stroke="#f3b26a" stroke-width="2" stroke-linecap="round"/>
      <path d="M45 91q4-2.4 7-1.8" fill="none" stroke="#fff0ae" stroke-width="1.5" stroke-linecap="round"/>
    </g>
    <g data-part="cartridge-outlet-stream" opacity="0">
      <path d="M49 94C47 87 40 86 40 79c0-8 9-11 17-14 11-4 13-7 11-12-1-3-4-5-7-6 6 .2 12 3 13 8 1 7-6 11-13 14-9 4-15 7-15 12 0 4 4 7 5 13Z" fill="url(#${prefix}-release-smoke)" opacity=".70"/>
      <path d="M49 90c-1-5-6-7-5-12 1-7 12-10 20-14 8-5 9-9 4-13" fill="none" stroke="#f1f0dd" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M43 83c-11-7-8-14-.3-18 5-3 8-5 7-9" fill="none" stroke="#96c5b8" stroke-width="1.3" stroke-linecap="round" opacity=".56"/>
    </g>
    <g data-part="cartridge-smoke-ring" opacity="0">
      <path d="M46 52c-3-4 4-9 12-11 10-2 22-.5 26 4 4 5-3 10-13 12-10 2-21 1-25-5Zm5-2c2 3 11 4 19 2 7-1 12-4 10-6-2-3-12-4-19-2-7 1-12 4-10 6Z" fill="url(#${prefix}-release-smoke)" fill-rule="evenodd" opacity=".80"/>
      <path d="M47 52c5 5 17 5 24 3 5-1 10-3 12-6" fill="none" stroke="#edf2df" stroke-width="2.2" stroke-linecap="round" opacity=".84"/>
      <path d="M51 46q6-5 16-5m9 1q8 2 9 6" fill="none" stroke="#a8cdbf" stroke-width="1.2" stroke-linecap="round" opacity=".64"/>
    </g>
  </g>`;
}

const part = (name, origin, poses) => ({name, origin, frames:[{at:0}, ...poses, {at:1}]});
const transient = (name, origin, poses) => ({name, origin, frames:[{at:0,opacity:0}, ...poses, {at:1,opacity:0}]});

export const originalCartridgeMotion = {
  body(prefix,variant='detail') {
    return master.body(prefix) + (variant==='detail' ? outlet(prefix) : '');
  },
  storyboard:'The valve turns against its stop. The plunger compresses the jade liquid, bubbles lift and the needle overshoots. The warm outlet sends a curling wisp through a drifting smoke ring before the mechanism settles.',
  motion:{duration:2680, layers:[
    part('cartridge-valve',[50,102],[
      {at:.07,rotate:5},{at:.25,rotate:-68},{at:.32,rotate:-79},
      {at:.56,rotate:-79},{at:.74,rotate:-24},{at:.85,rotate:3}
    ]),
    part('cartridge-plunger',[204,150],[
      {at:.12},{at:.20,x:3},{at:.37,x:-8.5},{at:.44,x:-8.5},
      {at:.52,x:-3},{at:.61,x:1.6},{at:.72,x:-.4},{at:.84}
    ]),
    part('cartridge-liquid',[64,165],[
      {at:.17},{at:.25,scaleY:.91,rotate:-.45},{at:.40,scaleY:1.20,rotate:.4},
      {at:.53,scaleY:.86,rotate:-.7},{at:.67,scaleY:1.07,rotate:.2},{at:.80}
    ]),
    part('cartridge-bubbles',[129,159],[
      {at:.20},{at:.33,x:.7,y:-1},{at:.46,x:2,y:-6},
      {at:.56,x:3.7,y:-10,opacity:.24},{at:.63,x:4.5,y:-11,opacity:0},
      {at:.64,y:3,opacity:0},{at:.79,y:1,opacity:.78},{at:.86}
    ]),
    part('cartridge-needle',[137,148],[
      {at:.17},{at:.27,rotate:-5},{at:.42,rotate:23},{at:.49,rotate:13},
      {at:.57,rotate:-42},{at:.65,rotate:-31},{at:.73,rotate:-35},
      {at:.84,rotate:4},{at:.93,rotate:-1}
    ]),
    part('cartridge-vapor',[51,98],[
      {at:.12,opacity:.72},{at:.29,opacity:.30,scaleY:.85},
      {at:.43,opacity:.30,scaleY:.85},{at:.56,opacity:.10},
      {at:.70,opacity:.15},{at:.89,opacity:.65}
    ]),
    transient('cartridge-outlet-glow',[50,92],[
      {at:.26,opacity:0},{at:.40,opacity:.45},{at:.48,opacity:1},
      {at:.58,opacity:.62},{at:.73,opacity:0}
    ]),
    transient('cartridge-outlet-stream',[50,94],[
      {at:.35,scaleX:.35,scaleY:.07,opacity:0},
      {at:.46,scaleX:.77,scaleY:.73,opacity:.89},
      {at:.55,scaleX:1.00,scaleY:1.00,opacity:.97},
      {at:.65,scaleX:1.08,scaleY:1.03,opacity:.63},
      {at:.76,scaleX:.95,scaleY:.89,opacity:.21},{at:.85,opacity:0}
    ]),
    transient('cartridge-smoke-ring',[65,49],[
      {at:.43,x:-3,y:8,scaleX:.20,scaleY:.32,opacity:0},
      {at:.54,x:0,y:1,scaleX:.68,scaleY:.78,opacity:.87},
      {at:.63,x:5,y:-5,scaleX:1.05,scaleY:.92,rotate:2,opacity:1},
      {at:.74,x:14,y:-13,scaleX:1.16,scaleY:1.00,rotate:6,opacity:.83},
      {at:.84,x:23,y:-18,scaleX:1.27,scaleY:1.04,rotate:10,opacity:.37},
      {at:.94,x:29,y:-22,scaleX:1.38,scaleY:1.12,rotate:13,opacity:0}
    ])
  ]}
};
