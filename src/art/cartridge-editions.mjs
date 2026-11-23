// The freely collected cylinders keep their published masters. Capsule editions
// use those same working drawings under separate IDs with additional hardware.
import {weatherCartridges} from './cartridges-weather.mjs';
import {signalCartridges} from './cartridges-signal.mjs';
import {pearlCartridges} from './cartridges-pearl.mjs';
import {shape,stroke,oval,part,finish,paint,track,hiddenTrack,edge,fastener} from './edition-drawing.mjs';
const masters={...weatherCartridges,...signalCartridges,...pearlCartridges};
const dark='#46514e';
const specs=[
 {key:'text-back',basis:'rain-check',axis:'-17 130 139',lift:0,
  outline:'M93 106l4-12 4-4-5-13q8-6 29-3l4 4-11 14 1 12Z',color:'#a6c3c1',
  mount:'M94 108l3-12 15-1 5 9Z',moving:'M96 78q12-5 29-3l2 3-13 15-6 2Z',
  inset:'M100 78q11-3 22-2-10 5-20 5Z',detail:'M105 84l5 6m6-8-3 6',
  mini:'M8.3 9.9l.3-1.4-1-1.3 3.6-.4-.9 2 .3 1.2Z',pivot:[112,94],turn:-22,drop:1,
  story:'A tipping rain collector empties into the storm glass, the umbrella springs open and three typing dots rise from the ash.'},
 {key:'one-more-game',basis:'second-wind',axis:'-15 130 139',lift:0,
  outline:'M103 105l3-17 7-3 4 5 45-1 1-7 7-1 9 21Z',color:'#daaa77',
  mount:'M102 105l4-17 8-3 4 18Zm58-3 3-20 8-1 9 21Z',moving:'M110 88l56-3 3 4-56 6Z',
  inset:'M116 88l40-2 2 2-40 3Z',detail:'M117 85l4 9 4-10 4 9 4-10 4 9 4-10 4 9 4-10 4 8',
  mini:'M9 9.6l.2-1.8 1.1-.3.3.8 4.1-.3.2-1.1 1.3-.1.5 2.2Z',pivot:[169,89],scale:.70,turn:0,drop:1,
  story:'A copper return rod slides through the upper yoke as the accordion sleeve collapses. The spring kicks it back and a retry curl rolls off the tip.'},
 {key:'next-in-queue',basis:'hold-music',axis:'-17 128 144',lift:6,
  outline:'M81 105l8-10 8-2 7-12 27-4 3 3-1 14-5 1-4-7-13 2-6 11-7 4Z',color:'#dfc39b',
  mount:'M82 107l6-12 12-4 7 12Z',moving:'M91 97l8-5 6-11 19-3 5-5 5 1 .4 22-6 2-5-10-12 2-5 10-11 3Z',
  inset:'M128 78q1-4 4-4l1.4 21q-4-2-5-7Z',detail:'M104 88l5-4 12-2m-29 15 6-2',
  mini:'M7.2 10.8l.4-1.7 1.1-.6.7-1.1 2.3-.4.9-.4.1 2-1 .3-.4-.6-1.6.3-.7 1.4Z',pivot:[95,98],turn:-9,drop:-2,
  story:'The silver listening horn tilts toward the reeds. Their vibration reaches the vent as a single note before the gauge drops.'},
 {key:'it-was-lag',basis:'panic-button',axis:'-17 128 144',lift:8,
  outline:'M143 104l-1-13 7-5 11 1 5 6h7l4-8 6 .5 5 16Z',color:'#d59d6c',
  mount:'M143 104l-1-12 7-4 4 14Zm29-3 3-13 7-2 5 15Z',moving:'M147 94q3-16 12-14l8 3q8 1 11 8l-3 3q-3-6-9-6l-8-3q-5-1-8 10Z',
  inset:'M152 87q5-9 11-4l4 2-2 1-7-2Z',detail:'M151 84l3 6m3-10 1 6m3-5-1 5m11-2-2 5',
  mini:'M12.4 9.8v-1.6l1.3-1.2 1.6.1 1.2.7.5 1.4-1 .3-.5-1.1-1.4-.2-.6 1.2Z',pivot:[148,95],turn:6,drop:-3,
  story:'A misaligned jumper snaps once before contact. The delayed gauge overshoots as the amber guard throws open and the signal breaks into arcs.'},
 {key:'still-early',basis:'last-resort',axis:'-19 129 150',lift:12,
  outline:'M113 110l4-13 10-6 4-14 8-3 11 6 4 14 6 5 1 9Z',color:'#d6b2af',
  mount:'M113 110l6-14 25-7 15 9 2 12Z',moving:'M124 99l6-21 10-7 10 9 2 16-12 6Z',
  inset:'M127 97l6-17 6-4-3 16Z M140 78l6 4 3 12-10-3Z',detail:'M131 80l8 10 9-7m-9 7 1 11',
  mini:'M10.3 10.5l.7-1.8.7-.6.4-1.3 1.2-.6 1.1 1.4v1.3l.9.8Z',pivot:[138,98],turn:-13,drop:-2,
  story:'The exposed opal pivots on its rose-gold saddle. The shell shutter uncovers the second inclusion as the price trace climbs and evaporates.'}
];
function equipment(s,p){
 const metal=paint(p+'-mount-metal');
 return shape(s.mount,metal,edge)+part('edition-actuator',
  shape(s.moving,s.color,'stroke="#4d5352" stroke-width="1.8" stroke-linejoin="round"')+
  shape(s.inset,s.key==='still-early'?'#9ac0bb':'#546366')+stroke(s.detail,s.key==='one-more-game'?'#674e46':'#f6ddbe',1.45))+
  fastener(s.pivot[0],s.pivot[1],2.25);
}
function edition(s){
 const basis=masters['gift-cartridge-'+s.basis],at=s.key==='it-was-lag'?.49:.36;
 return {body:(p,v)=>`<defs>${finish(p+'-mount-metal',['#dcccc0','#a39b85','#6c716b','#484f51','#b7aa8b'])}</defs>`+
    basis.body(p,v)+`<g transform="rotate(${s.axis})"><g transform="translate(0 ${s.lift})">${equipment(s,p)}</g></g>`,
  silhouette:basis.silhouette+`<g transform="rotate(${s.axis})"><g transform="translate(0 ${s.lift})">${shape(s.outline,'#10161d')}</g></g>`,
  mini:basis.mini+`<g transform="rotate(-17 12 13)">${shape(s.mini,s.color,'stroke="#505656" stroke-width=".45" stroke-linejoin="round"')}</g>`,
  storyboard:s.story,motion:{duration:basis.motion.duration,layers:[...basis.motion.layers,
   track('edition-actuator',s.pivot,{at:.12},{at,rotate:s.turn,y:s.drop,scaleX:s.scale||1},{at:.63,rotate:.6*s.turn,y:s.drop*.7,scaleX:s.scale||1},{at:.82,rotate:-.16*s.turn})]}};
}
const twinAngle='rotate(-16 125 145)';
const twinShell='M53 109H194Q211 109 215 145T199 183H55Q36 182 36 148T53 109Z';
function chamber(p,x,y,tint){
 const glow=tint==='amber'?'#f3bc84':'#a1cccc';
 return shape(`M${x} ${y}h128q13 0 13 12t-10 13H${x+4}q-12 0-14-11t10-14Z`,paint(p+'-'+tint),'stroke="#475454" stroke-width="1.7"')+
  stroke(`M${x+6} ${y+4}h95m5 0h12`,glow,1.8)+
  [0,1,2,3].map(i=>oval(x+20+i*21,y+18-i%2*5,1.7+i*.23,1.7,glow,'opacity=".68"')).join('');
}
function twinBody(p) {
 const alloy=paint(p+'-alloy'), brass=paint(p+'-brass');
 const defs=finish(p+'-alloy',['#c9c9b6','#899f9a','#525f65','#384a52','#a9b6a6'])+
 finish(p+'-brass',['#fee1af','#bc9a77','#7f685a','#ccac8a'])+
 finish(p+'-amber',['#8c685b','#c69f7d','#986a56','#654a4c'])+finish(p+'-aqua',['#8eaaa8','#79a4a7','#4e757c','#45646b'])+
 finish(p+'-opal',['#e0d5b4','#a1c7c0','#d0b5c4','#9d9cb8','#e6d2ab'],false);
 const far=shape(twinShell,alloy,edge)+shape('M192 107h12q12 4 16 24l4 20-4 22-6 12-13 2q12-30 2-57Z',brass,edge)+
 shape('M211 116l5 1 1 5 4 4 .2 4 3 6-1 5 2 6-2 6 1 4-2.8 5 1 4-4 7-1 4-5 4-4-1q12-30 2.4-64Z','#8a8079',edge)+
 stroke('M211 121q8 18 7 34m-1 5-3 12','#e8a587',1.7);
 const strut=shape('M149 111l10-.5 7 25-1 32-9 13h-9l8-19-1-29Z',paint(p+'-opal'),edge)+
 stroke('M152 114l5 14 2 15-1 13','#eee1c8',1.25);
 const regulator=part('balance-lever',stroke('M93 139l53 17',dark,5.4)+stroke('M93 138l53 17',brass,3.5)+oval(95,138,4.2,4,'#dac8a6',edge)+oval(144,154.8,4.2,4,'#dac8a6',edge))+
 oval(118,146,7,7,brass,edge)+fastener(118,146,3.1);
 const dial=oval(174,148,16,17,brass,edge)+oval(174,148,13.3,14.5,'#e8dfc2','stroke="#64645b" stroke-width="1.3"')+
 stroke('M163 147l2 .5m.7-7 2 2m3.7-6.1.7 3m5.8-3-.6 3.2m4.5.8-1.8 2.5m4.4 2.9-2.6.7','#6d7167',1)+
 part('differential-needle',stroke('M170 152l10-13','#924f48',2))+oval(174,147.8,2,2,'#6b6560');
 const ring=(y,id)=>part(id,
  shape(`M213 ${y}c15-15-7-18-3-30 2-6 10-7 12-14 1-6-2-9-6-12 9 3 13 10 10 18-3 7-11 9-11 14-1 9 14 12-2 24Z`,id==='warm-smoke'?'#debca4':'#a8c9c4')+
  stroke(`M215 ${y-5}q5-8 .5-13`,'#eeebd6',1));
 const breath='<g opacity="0" data-part="vent-pair">'+ring(142,'warm-smoke')+`<g transform="translate(2 -3) rotate(11 214 140)">${ring(141,'cool-smoke')}</g></g>`;
 const cap=oval(52,146,17,38,alloy,edge)+oval(48,147,12,29,brass,edge)+oval(45.5,147,8.3,21,'#465858',edge)+
 shape('M47 137l-18 1-8 5 .7 9 9 3 17 1q5-9-.7-19Z','#52646a',edge)+oval(21.8,147,2.7,5.5,'#25363b');
 const vent=stroke('M68 115v-9q0-8 7-10','#3c484b',6)+stroke('M68 115v-9q0-8 7-10',brass,3.6)+
 part('balance-wheel',oval(73,98,10.5,10,'none','stroke="#bfa88a" stroke-width="3.5"')+stroke('M73 88v20m-10-10h20m-17-7 15 14','#bca88d',2))+oval(73,98,2.6,2.6,'#78817c');
 return '<defs>'+defs+'</defs>'+oval(128,212,69,4,'#17242b','opacity=".24"')+`<g transform="${twinAngle}">${breath}${far}${chamber(p,64,114,'amber')}${chamber(p,66,152,'aqua')}${strut}${regulator}${dial}${cap}${vent}</g>`;
}
const lastExcuse={body:twinBody,mini:`<g transform="rotate(-16 12 14)">${shape('M4 9h15q3 0 3.2 4.5t-3 4.2H5q-2-.2-2-4.2T4 9Z','#8c9e95','stroke="#405157" stroke-width=".7"')}${stroke('M6 11.1h11','#dbab87',1.85)}${stroke('M6 15.5h11','#84b8b8',1.85)}${stroke('M8 12.4l5.2 2','#d1c29c',.7)}${oval(16.5,13.1,1.9,2,'#e6d8b2','stroke="#69756f" stroke-width=".55"')}${oval(4.3,13.4,1.6,4,'#af9e85')}${oval(4.1,13.4,.9,2.6,'#394b53')}${stroke('M5.5 9.1v-1.3l1-.5','#bca388',.7)}${oval(6.5,7.1,.9,.85,'none','stroke="#bca388" stroke-width=".6"')}</g>`,
 silhouette:`<g transform="${twinAngle}">${shape(twinShell,'#10161d')}${shape('M192 107h15l9 8 7 22 1 21-5 18-9 12-16 1Z M49 137l-22 1-7 5 1 10 26 4Z M65 118v-15l1-4q-6-9 1-15 9-8 17 1 7 11-5 19l-7 5v8Z','#10161d')}</g>`,
 storyboard:'Amber and opal chambers push opposite ends of a balance beam. It rocks through center, the differential needle catches up, and two warm and cool ribbons cross at the vent.',
 motion:{duration:2690,layers:[
 track('balance-wheel',[73,98],{at:.09,rotate:-7},{at:.35,rotate:66},{at:.57,rotate:62},{at:.78,rotate:-8}),
 track('balance-lever',[118,146],{at:.16},{at:.37,rotate:-23},{at:.49,rotate:18},{at:.62,rotate:-10},{at:.79,rotate:4}),
 track('differential-needle',[174,148],{at:.22},{at:.45,rotate:58},{at:.57,rotate:-35},{at:.73,rotate:14},{at:.86,rotate:-4}),
 hiddenTrack('vent-pair',[213,141],{at:.34,opacity:0,scaleY:.25},{at:.52,opacity:.94,scaleY:.83},{at:.66,opacity:.9,y:-4},{at:.84,opacity:.3,y:-8}),
 track('warm-smoke',[213,142],{at:.35},{at:.56,rotate:-15},{at:.76,rotate:4}),
 track('cool-smoke',[213,141],{at:.38},{at:.59,rotate:12},{at:.78,rotate:-6})
 ]}};
export const cartridgeEditions=Object.freeze({...Object.fromEntries(specs.map(s=>['gift-edition-cartridge-'+s.key,edition(s)])),'gift-edition-cartridge-last-excuse':lastExcuse});
