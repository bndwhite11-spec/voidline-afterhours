/** Editable character and guild-object masters. Camera and pivots use the 256-unit detail stage. */
import {gifts} from './gifts.mjs';
import {telegramObjects} from './telegram-objects.mjs';
import {telegramCharacters} from './telegram-characters.mjs';
import {makeLegacyRevision} from './legacy-rig.mjs';

const group=(name,svg)=>`<g data-part="${name}">${svg}</g>`;
const path=(d,fill,stroke='none',width=1)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const line=(d,color,width=1.5)=>path(d,'none',color,width);
const ellipse=(cx,cy,rx,ry,fill)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const track=(name,origin,...frames)=>({name,origin,frames:[{at:0},...frames,{at:1}]});
const gradient=(p,id,colors)=>`<linearGradient id="${p}-${id}" x1="13%" y1="0%" x2="81%" y2="100%">${colors.map((color,n)=>`<stop offset="${n/(colors.length-1)}" stop-color="${color}"/>`).join('')}</linearGradient>`;

function doomerBody(p){
 const face=`url(#${p}-doomer-skin)`,coat=`url(#${p}-doomer-cloth)`,hat=`url(#${p}-doomer-knit)`,ink='#20292e';
 const defs=gradient(p,'doomer-skin',['#ebdcca','#d4cabb','#b9af9f','#927d71'])+gradient(p,'doomer-cloth',['#797c77','#555b59','#363d40','#292e34'])+gradient(p,'doomer-knit',['#65716b','#464f4c','#293438','#1e292e']);
 const ribbing=Array.from({length:13},(_,i)=>{const x=72+7.7*i;return line(`M${x} ${70+Math.abs(i-5)*.65}q0 4 -1 10`,'#93958a',1.05);}).join('');
 const whiskers=[[91,111],[94,120],[100,121],[104,125],[110,126],[119,127],[127,127],[133,125],[143,120],[146,115],[151,110]].map(([x,y])=>line(`M${x} ${y}l1.7 -1.3`,'#938477',.9)).join('');
 const beanie=group('doomer-beanie',
  path('M68 74Q66 57 78 39 95 19 123 23q26-6 44 7 6 6 4 14 12 10 11 28l-9 13-95 2Z',hat,ink,2.8)+
  line('M76 69q1-27 24-36m-9 37q2-26 16-37m1 34q4-24 8-32m7 34 2-30m10 33q1-21-2-29m12 30q3-17-2-24m11 22q2-12-3-22','#727c74',1.6)+
  path('M67 68q19-13 49-13 38-2 63 11l-2 18q-25-10-60-8-29 1-48 13-5-9-2-21Z',hat,ink,2)+
  line('M69 70q20-12 47-13 38-2 60 11m-106 18q21-11 47-12 36-2 58 7','#a2a392',1.5)+ribbing+
  path('m160 68 8 3-1 9-8-3Z','#b59c75','#5b513e',.8)+line('m162 72 3 1m-3 2 2 .6','#534737',.9));
 const head=group('doomer-nod',
  path('M86 104q-17-3-14-14 2-6 8-3l3 7m79-7q14-5 12 7-1 12-15 15Z',face,'#77695f',1.7)+
  path('M79 70q29-17 68-9 28 4 27 24-1 23-15 39-12 13-30 15-27 2-45-17-12-14-10-33Z',face,'#594f48',2.3)+
  path('M81 95q1 18 14 27 9 6 23 9-28-1-36-18Z','#b49e8c')+path('M159 86q9 11-1 25-5 7-9 9 8-1 15-10 10-14 7-23Z','#a79989')+
  path('M76 84q13-15 38-17 28-5 55 7l-3 8-10-5-8 2-8-5-12 4-6-3-12 4-8-2-14 7-5 5Z','#333735')+
  group('doomer-eye',line('M88 97q7-5 19-3m21-3q11-4 21-1','#5f5c56',3.5)+line('M89 99q8-2 17-1m24-4q11-2 18 0','#343a37',2.3)+ellipse(103,98,1.8,1.4,ink)+ellipse(142,94,1.8,1.4,ink))+
  line('M89 104q8 2 14 0m30-4q7 1 13-2','#b09e89',1.3)+path('m117 94-4 14q6 4 12 0','#cfbda7','#9e8977',1.3)+
  line('M108 117q11-5 21-3 5 1 8 0','#695e56',2.1)+line('M114 121q7-2 12-2','#b49b89',1.2)+whiskers+beanie);
 const feet=path('M69 190q-18 14-11 28 6 13 23 10l32-11 6-15-17-15Z',coat,ink,2.6)+path('M142 196q14-9 35-2l18 14q10 13-3 18-13 7-33-2l-22-10Z',coat,ink,2.6)+line('M61 217q9 10 25 5l16-5m60 5q16 8 29-1','#9b9790',1.5);
 const torso=path('M82 130q8-17 30-20l24-2q23 1 41 19 15 21 20 46 4 19-15 24l-11 11q-36 15-80-2l-9-10-13-1q-15-8-9-25Z',coat,ink,2.8)+
  path('M77 144q16-21 42-17 17 5 31-3l20-4q-3 18-21 29-23 15-43 2Z','#353f40','#4b5451',1.4)+
  path('M95 151q3 18 0 26l-14 12-14-2q-5-5-2-11l10-23Z',coat,ink,1.4)+path('M159 149q-2 15-5 23l14 15 17 2 7-9q-6-20-18-30Z',coat,ink,1.4)+
  path('m92 175 9-4 12 8 1 8-10 5-19-9Z','#c6b8a3','#655f55',1.5)+path('m157 173 9 3 7 6-16 8-12-3 1-6Z','#ccbea9','#655f55',1.5)+line('m91 180 8 4m-3-6 8 5m53 0 8-4m-9 8 10-5','#927f6b',1)+
  path('m110 170 32-1 8 21q-18 8-41 2Z','#434c4b','#303a3a',1.4)+line('m112 173 6 7m23-8-7 8m-33 18q29 10 57 0','#79817a',1.1)+
  line('m111 140 3 19m24-20-2 17','#aeab94',1.9)+path('m113 157 3 0v5h-3Zm21-2h3l-1 5h-3Z','#b59366');
 return `<defs>${defs}</defs>`+ellipse(127,226,77,7,'#222a30')+feet+torso+head;
}

function helmetBody(p){
 const steel=`url(#${p}-shell)`,jade=`url(#${p}-foam)`,brass=`url(#${p}-bolt)`,ink='#243038';
 const defs=gradient(p,'shell',['#e1e3d6','#a2b4b0','#62797e','#36494d','#96a5a0'])+gradient(p,'foam',['#acc0a2','#608779','#365950'])+gradient(p,'bolt',['#e6c584','#a08958','#766548']);
 const screws=[[75,97],[116,72],[143,78],[192,101],[175,191]].map(([x,y])=>ellipse(x,y,2.8,2.8,brass)+line(`M${x-1} ${y+1}l2 -2`,ink,.7)).join('');
 const visor=group('visor',path('M62 111q36-6 79 3l42 1 1 23-24 7-13 29-37 23-30-15-20-32Z',steel,ink,2.8)+
  path('m60 111 63 8 40 1 15-3-2 8-42 3-73-9Z','#d8e1d7')+path('m62 120 65 10 28-1-19 9-69-3Z','#1d3035')+path('m65 138 66 2-16 11-43-5Z','#8a9994')+
  path('m142 138-7 17-27 32 36-20 15-28Z','#51696b')+line('m75 150 11 21m-1-20 10 23m0-21 9 21m2-20 7 15','#34474a',3.5)+line('m76 151 8 16m3-15 6 15m5-12 4 10','#d2d5c8',1)+
  path('m111 194 37-25 12-31 17-7-1 8-14 8-12 28-36 23Z','#475853')+line('m70 115 48 6m-37 18 44 2','#f0ebd8',1.15));
 return `<defs>${defs}</defs>`+ellipse(129,222,73,7,'#222a30')+
  path('M57 108Q56 65 93 50q28-15 59-6 42 10 51 46 8 33 1 73l-19 30-18 4-20-8-37 13-33-20-18-35Z',steel,ink,3)+
  path('M59 115q22-21 52-22 40-1 73 16l-10 30-28 33-33 20-30-15-21-27Z','#232f34',ink,2)+
  path('M63 122q17-15 40-22 34-11 67 6l8 8-7 7q-36-16-60-7-27 8-40 22Z','#645a49')+line('M71 122q18-13 38-18 22-6 46 0','#baaa87',2)+
  path('M75 143q17-18 38-20 14-1 21 6l-3 32-19 15-25-7Z','#313e40')+line('m80 145 16 11 19-19m-21 30 18-18 13 4','#65706a',2)+
  path('M157 145q18-8 36-23l4 25-15 39-17 7-25-12Z',steel,ink,2.2)+path('m168 151 20-13-6 31-15 18-12-6Z','#7e908a')+
  path('M83 69q25-32 58-25 40 5 54 44l-8 13q-12-31-42-42-31-11-62 10Z','#c7cfc3')+line('M134 44q21 16 29 47m-33-44q16 14 24 37','#526b70',2)+
  group('foam-crest',path('m94 55 4-20 10 4 7-15 11 6 14-11 3 12 18-1-4 14 14 5-10 9-21-6-26 0Z',jade,'#324e47',2)+line('m103 46 13-7 7 3 16-10m-23 17 28-7 7 2','#bbccb2',1.4))+
  visor+ellipse(181,121,11,11,'#334446')+ellipse(181,120,8,8,brass)+line('m177 123 8-7','#57513f',2.25)+screws+
  path('m156 68 16 6-3 8-15-6Z','#aeb6a0','#727e70',.9)+line('m157 71 12 5','#d5d9c5',1.3);
}

const motion=(duration,...layers)=>({duration,layers});
const doomer=makeLegacyRevision('gift-pocket-doomer',gifts['gift-pocket-doomer'],{
 body:doomerBody,
 silhouette:path('M69 87q-6-18 8-45 12-20 44-19 30-8 50 9 3 8 3 15 13 13 4 38l-4 17-12 17 13 9q20 29 24 51 3 13-10 19 16 17 8 26-12 12-46-1l-27-7-22 2q-28 15-40 7-13-8-2-29-13-7-4-30l16-34 18-15-13-18Z','#161e24'),
 mini:path('M4 19q0-4 4-6h8q4 2 5 7l-2 2-5-1-3 1-3-1-4 1-2-2Z','#485452','#19262a',.85)+path('M6 7q4-3 12-2l1 5-2 4-4 2-5-2-2-4Z','#d0c2ad','#665d54',.7)+path('M5 8q0-6 5-6 6-2 8 1l2 5-2 1q-6-2-13 1Z','#3e4c4c','#1e2d31',.8)+line('M6 7q7-3 12 0','#89938a',1)+line('m8 10 3-.4m3 0 3-.3m-6 4 3-.5','#4c514b',.9)+line('m5 18 4 1 2-1m4 1 3-1','#b4b1a0',.9),
 motion:motion(1680,track('doomer-nod',[126,134],{at:.16,rotate:-1.3,y:-.4},{at:.41,rotate:7.2,y:3.8},{at:.56,rotate:7.7,y:4},{at:.79,rotate:-1.2,y:-.6}),track('doomer-beanie',[123,75],{at:.22,rotate:1},{at:.44,rotate:-2,y:-.8},{at:.59,rotate:1.8,y:1.3},{at:.81,rotate:-.5}),track('doomer-eye',[120,96],{at:.23,scaleY:.95},{at:.4,scaleY:.55},{at:.64,scaleY:.84})),
 storyboard:'The heavy skull tips into the collar on a sewn neck seam. The wool cap lags a fraction and settles back over the eyes.'
});
const helmet=makeLegacyRevision('gift-larp-helmet',telegramObjects['gift-larp-helmet'],{
 body:helmetBody,
 silhouette:path('M57 107q0-37 31-53l6-3 4-15 10 3 7-15 11 6 14-11 3 12 18-1-4 14 14 5-5 4q41 20 40 83l-2 27-19 30-18 4-20-8-34 13-37-20-18-34Z','#1a242a'),
 mini:path('M4 11q0-6 6-7 8-1 10 5 2 6-1 11l-4 1-2-2-4 2-5-3Z','#94aaa7','#283b40',.85)+path('m7 5 1-2 2 1 2-3 2 1 3-1-1 3 3 1-3 1Z','#779983','#3e6058',.6)+path('m4 11 11 1 4-1-1 3-3 1-5 5-5-3Z','#c2cebf','#475d5d',.6)+path('m4.6 12.4 10.7 1.1-2 1-8-.8Z','#273c40')+ellipse(18,12,1.2,1.2,'#cfaf70'),
 motion:motion(1730,track('visor',[181,120],{at:.16,rotate:-2},{at:.43,rotate:36},{at:.53,rotate:39},{at:.64,rotate:36},{at:.81,rotate:-2.5},{at:.89,rotate:1}),track('foam-crest',[135,50],{at:.4,rotate:1.8},{at:.53,rotate:-1.5},{at:.76,rotate:.7},{at:.87,rotate:-1})),
 storyboard:'The steel faceplate lifts around the visible brass bolt. A complete quilted cavity sits behind it. The faceplate meets the lower stop and the glued crest flexes once.'
});
const crystal=makeLegacyRevision('gift-spook-crystal',telegramObjects['gift-spook-crystal'],{
 body:p=>telegramObjects['gift-spook-crystal'].body(p)+group('crystal-inner-reflection',line('m146 123-11 7m21 22-8 9','#e1e9d7',1.5)),
 motion:motion(1580,track('crystal-paper-specter',[129,159],{at:.16,y:1.4,rotate:-3},{at:.44,y:-7,rotate:9,scaleX:.82},{at:.68,y:-2,rotate:4},{at:.84,y:.7,rotate:-1.6}),track('crystal-specter-tail',[130,164],{at:.28,rotate:3},{at:.52,rotate:-11},{at:.72,rotate:3},{at:.86,rotate:-.8}),track('crystal-inner-reflection',[144,138],{at:.2,x:-1},{at:.48,x:1.5,y:-2,opacity:.48},{at:.78,x:.6})),
 storyboard:'A folded apparition turns inside the transparent inclusion. The paper tail follows its body; the cut mineral stays in place.'
});
const candyLean=[{at:.15,rotate:1},{at:.41,rotate:-6.4},{at:.6,rotate:1.9},{at:.82,rotate:-.7}];
const candy=makeLegacyRevision('gift-brainrot-pop',telegramCharacters['gift-brainrot-pop'],{
 motion:motion(1600,...['brain-core','brain-lobe-left','brain-lobe-right'].map(n=>track(n,[137,173],...candyLean)),track('brain-wrapper-left',[118,188],{at:.19,rotate:1.2},{at:.41,rotate:-5},{at:.66,rotate:1.6}),track('brain-wrapper-right',[131,188],{at:.2,rotate:-1.3},{at:.49,rotate:6.1},{at:.72,rotate:-1.7})),
 storyboard:'Both molded sugar hemispheres and their lime seam tip together from the stick insertion. The pleats on either side of the tied wrapper flutter after the candy settles.'
});
const cap=makeLegacyRevision('gift-larp-cap',telegramObjects['gift-larp-cap'],{
 body:p=>telegramObjects['gift-larp-cap'].body(p)+path('m87 86 36-8 3 26-17 17-19-10Z','#b1a786','#6b725b',1.6)+`<path d="m91 89 29-7 2 20-14 14-15-8Z" fill="none" stroke="#e1d9b8" stroke-width="1.25" stroke-dasharray="2 2"/>`+path('m98 99 3-5 4 3 3-8 4 6 5-5-2 13-14 4Z','#465f55')+line('m101 109 16-4','#715940',1.4),
 motion:motion(1470,track('cap-brim',[150,155],{at:.15,rotate:1.5},{at:.41,rotate:9,scaleY:.91},{at:.66,rotate:-2,scaleY:1.01},{at:.83,rotate:.7})),
 storyboard:'The bound brim tips from its sewn root and flexes back. The crown and its embroidered guild patch hold their shape.'
});
const jelly=makeLegacyRevision('gift-wojak-jelly',telegramCharacters['gift-wojak-jelly'],{
 motion:motion(1720,track('wojak-body',[127,193],{at:.16,scaleX:.99,scaleY:1.02},{at:.34,scaleX:1.075,scaleY:.9,rotate:1.8},{at:.53,scaleX:.964,scaleY:1.055,rotate:-1.9},{at:.71,scaleX:1.022,scaleY:.976,rotate:.7},{at:.87,scaleX:.995,scaleY:1.005}),track('wojak-puddle',[128,192],{at:.35,scaleX:1.06,scaleY:.98},{at:.59,scaleX:.98},{at:.76,scaleX:1.013}),track('wojak-eyes',[122,112],{at:.19,scaleY:.92},{at:.35,scaleY:.79},{at:.63,scaleY:1})),
 storyboard:'The molded brow, nose, eyes and cheeks travel with the entire gelatin cast. Its base widens against a still celadon dish, rebounds and returns to rest.'
});

export const curatedCharacters=Object.freeze({'gift-pocket-doomer':doomer,'gift-larp-helmet':helmet,'gift-spook-crystal':crystal,'gift-brainrot-pop':candy,'gift-larp-cap':cap,'gift-wojak-jelly':jelly});
