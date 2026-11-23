// A half-bound volume seen from the fore edge. The cover turns on the spine,
// exposing an actual printed leaf; separate ribbons, clasps and inlays respond.
import {shape,stroke,rect,oval,part,finish,paint,track,edge} from './edition-drawing.mjs';
const variants = {
 marginalia:{cloth:['#cfaa79','#b28b63','#936c50','#775641'],spine:'#614c43',foil:'#edd29a',ink:'#584d40',page:'#e6d5ae',story:'The apprentice’s stitched notebook cracks open. A pencil mark crosses the margin and the loose backstitch tightens as it closes.'},
 'clasped-copy':{cloth:['#ab7c79','#845857','#714848','#533742'],spine:'#533e42',foil:'#e3bb7c',ink:'#513b37',page:'#e2c99f',story:'The brass lock swivels free of the oxblood cover. An engraved key appears on the cream leaf, then the book shuts and latches.'},
 'night-binding':{cloth:['#64718e','#4d5d79','#394b66','#2c394e'],spine:'#343749',foil:'#d2d9cd',ink:'#4d5165',page:'#c6d1cb',story:'A silver-edged astronomical index fans out; an indigo ribbon swings under the opening page before tucking back against the cover.'},
 'opal-frontispiece':{cloth:['#46595c','#39444e','#333343','#282c39'],spine:'#e2d6b9',foil:'#d8b98f',ink:'#545361',page:'#ebe3cd',story:'The nacre eyelid opens on its hinge. A silvered frontispiece reflects a second moon, then the book folds its two moons together again.'}
};
const curve='M71 52Q76 47 82 46L172 32Q177 31 180 36L197 174Q198 178 194 181L93 201Q89 202 86 197Z';
const leaf='M76 68 174 52 192 184 91 204Z';
const pose='rotate(-6 128 130)';
const line=(d,c,w=1)=>stroke(d,c,w);
const outline='stroke="#343538" stroke-width="1.65" stroke-linejoin="round"';
function corner(x,y,flip,foil){
 return `<g transform="translate(${x} ${y}) scale(${flip} 1)">${shape('M0 0l15-2.4.4 2.5-10.7 2.2L6.6 12l-2 1Z',foil,outline)}${line('M4 1l3-.4', '#fff0c9',.8)}</g>`;
}
function leafPrint(v,n){
 const ink=v.ink;
 const illustrations=[
  line('M0-17l2 11 10-4-7 8 8 5-11-1-2 11-3-10-10 4 7-9-9-5 12 1Z',ink,1.2)+line('M-19 14l29-5m-23 8 17-2',ink,.9),
  oval(-1,-9,6,6,'none',`stroke="${ink}" stroke-width="2"`)+line('M-2-3l-1 14 5-1v-3l4-.6',ink,2),
  line('M-17 9q8-9 15-6 8 5 15-7m-27-4q14-7 25-3',ink,1.1)+[[-12,-5],[-4,2],[3,4],[12,-5]].map(([x,y])=>oval(x,y,1.5,1.5,ink)).join(''),
  oval(0,0,15,19,'#bac5c2',outline)+oval(0,0,11,15,'#9eaead')+shape('M-9 1q9-17 20-9l-2 5q-5-6-15 11Z','#f6ebcc')
 ];
 return shape(leaf,v.page,outline)+line('M95 77l70-11m-69 16 49-8',ink,1.4)+
 `<g transform="translate(135 119) rotate(-8)">${illustrations[n]}</g>`+
 [0,1,2,3,4].map(i=>line(`M${101+i*.55} ${154+i*5}l${i===4?39:63} -10`,ink,.85)).join('')+
 part('reading-mark',line('M169 144l8-4-3 7m-1 3 4-.7',n===0?'#a56a54':ink,1.6));
}
function emblem(v,n,p){
 const f=v.foil;
 const brass=paint(p+'-metal'), nacre=paint(p+'-nacre');
 if(n===0)return shape('M99 86l53-8 3 19-53 9Z','#dcc8a2','stroke="#896d55" stroke-width=".9"')+
  line('M104 90l25-3.8m-24 8 34-5.5m-26 6.9 14-2',v.ink,1.2)+
  line('M117 130l13-16-2 10 13-1-15 17 3-12Z',v.ink,2.2)+line('M109 142l28-4.5',v.ink,1.3);
 if(n===1)return shape('M107 90l25-15 28 9 5 39-23 24-29-15Z',brass,outline)+
  shape('M112 94l21-12 22 7 4 31-18 20-22-10Z',v.spine,outline)+
  oval(137,106,6,7,f)+shape('M134 111l5-1 4 13-11 2Z',f)+line('M116 93l15-8m12 51 12-14',f,.9);
 if(n===2)return oval(133,112,28,32,'none',`stroke="${f}" stroke-width="1.35"`)+
  oval(133,112,22,25,'none',`stroke="${f}" stroke-width=".8" stroke-dasharray="1 4"`)+
  shape('M137 89q-15 6-16 22-.7 16 16 23-9-10-6-23 3-12 16-18Z',f)+
  line('M133 74v10m2 56v8m-38-32 8-1m54-6 9-2',f,1.2);
 return oval(135,111,31,38,brass,outline)+oval(135,111,26,33,v.ink,outline)+
  oval(135,111,22,27,nacre,outline)+shape('M115 112q9-13 16-9 12 8 24-5l.6 6q-14 13-23 7-8-4-16 8Z','#d6d6c5')+
  oval(135,111,8,11,'#635a72',outline)+oval(132.7,106.8,3,4,'#ecebd8');
}
function clasp(v,n,p){
 if(n===1)return shape('M165 103l27-5 5 4 .3 14-26 5-5-4Z',paint(p+'-metal'),outline)+rect(173,107,13,7,2,v.ink)+oval(180,109.8,1.7,2,v.foil);
 if(n===2)return [0,1,2].map(i=>shape(`M178 ${90+13*i}l14-2 1.4 8.7-15 3Z`,i===1?'#adabbf':'#8ba0b5',outline)).join('');
 if(n===3)return shape('M130 80q23-3 29 24-6-8-12-8-14 0-29 12-1-18 12-28Z',paint(p+'-nacre'),outline)+line('M121 103q17-18 29-9','#e3dfbd',1.4);
 return line('M86 80q-5 2-7 11m8 9q-6 4-7 11m10 14q-7 2-8 10m9 13q-6 2-7 9',v.foil,2.2);
}
function cover(v,n,p){
 const binding=shape('M70 52q4-5 12-6l9-1 20 151-15 4q-7 3-10-4Z',paint(p+'-spine'),outline);
 return shape(curve,paint(p+'-cloth'),edge)+binding+
 line('M90 49l19 142m-2 1 78-15-15-130-76 12',v.foil,.95)+
 line('M94 60l74-11 14 122-73 14',v.spine,1.1)+
 [0,1,2,3,4].map(i=>line(`M${78+i*2.7} ${66+i*25}l11-1.8`,n===3?'#a99983':v.foil,2.1)).join('')+
 corner(158,40,1,v.foil)+corner(191,171,-1,v.foil)+emblem(v,n,p)+
 (n===1||n===3?part('cover-fitting',clasp(v,n,p)):clasp(v,n,p));
}
function miniature(v,n) {
 const marks=[
 line('M10.5 9.6l4-.6m-3 3.7 1.1-1.6 1 .1-1.3 1.8',v.foil,1),
 shape('M11 8l2.7-1.4 2 1 .2 3.1-2.5 2.7-2.4-1.5Z',v.foil)+oval(13.3,9.6,.65,.75,v.ink),
 shape('M14 7.8q-3.7 1.3-3.2 4.4.4 2.7 3.6 3.1-2.7-1.8-2-4 .3-1.8 2.5-3Z',v.foil),
 oval(13.4,10.8,2.7,3.7,'#d9d3b3')+oval(13.4,10.8,1.7,2.4,'#9eabc1')+oval(13.2,10.8,.65,1.2,'#68617a')
 ];
 return shape('M5.3 4.8 15.6 2.7 17.4 3.5 19.6 18.3 18.9 19.8 8.2 22l-2-1.1-1.8-14.8Z',v.spine,'stroke="#333639" stroke-width=".8"')+
 shape('M6.6 5.4l9.4-1.8 2.4 14.1-10.6 2.1Z',v.cloth[1])+shape('M7.9 19.7l10.4-2.1 1 .7-10.6 2.5Z',v.page)+line('M7.3 6.1l1.7 12.5',v.foil,.75)+marks[n]+
 (n===1?shape('M16.1 10.6l2-.5.3 1.6-2.2.5Z',v.foil):n===2?shape('M15.5 18.8l.4 3.2-1.2-.7-.6.9-.2-3Z','#b8a4c4'):'');
}
function model([key,v],n){
 const layers=[track('turning-cover',[79,67],{at:.15},{at:.43,scaleX:[.47,.26,.36,.18][n],y:-2,rotate:-2},{at:.61,scaleX:[.47,.26,.36,.18][n],y:-2,rotate:-2},{at:.87,scaleX:.98}),
   track('reading-mark',[171,145],{at:.24,opacity:.4},{at:.45,x:-4,y:2},{at:.65,x:1},{at:.86})];
 if(n===1||n===3)layers.push(track('cover-fitting',n===1?[172,110]:[135,83],{at:.12,rotate:n===1?-27:0,scaleY:n===3?.35:1},{at:.65,rotate:n===1?-24:0,scaleY:n===3?.45:1},{at:.89,rotate:2}));
 if(n===2)layers.push(track('ribbon',[149,191],{at:.16},{at:.41,rotate:15,y:2},{at:.63,rotate:-10},{at:.82,rotate:4}));
 return {body(p){
  const defs=finish(p+'-cloth',v.cloth,false)+finish(p+'-spine',[v.spine,v.cloth[1],v.spine],false)+finish(p+'-metal',[v.foil,'#aa946e','#7c7565','#dfd1ae'])+finish(p+'-nacre',['#b6c2bb','#dbbeaf','#95b3b7','#9d97b3','#d8ccab']);
  const bottom=shape('M77 67 177 47 204 186q1 5-4 7L97 215q-8 2-11-4L69 73Z',v.spine,edge);
  const pages=shape('M178 49l12-3 12 138-8 6-98 22-9-8 2-9 104-17Z',v.page,outline)+
  [0,1,2,3].map(i=>line(`M${98+i*.4} ${201+i*2}l96-19 4-3`,i%2?'#a59982':'#fff0cd',.85)).join('');
  const ribbon=n===2?part('ribbon',shape('M140 189l8-1 10 34-6-3.5-3 4Z','#9b8caa',outline)+line('M146 194l7 24','#c1b0bd',.8)):'';
  return '<defs>'+defs+'</defs>'+oval(131,223,60,4,'#15212a','opacity=".23"')+`<g transform="${pose}">${bottom}${pages}${ribbon}${leafPrint(v,n)}${part('turning-cover',cover(v,n,p))}</g>`;
 },mini:miniature(v,n),silhouette:`<g transform="${pose}">${shape('M70 52q4-6 13-7l89-15 15 3q5 1 6 8l15 145q.4 5-6 8L97 216q-9 2-12-6Z','#10161d')}${n===2?shape('M140 188l8-1 11 37-7-4-3 4Z','#10161d'):''}</g>`,
 storyboard:v.story,motion:{duration:2180+n*110,layers}};
}
export const volumeEditions=Object.freeze(Object.fromEntries(Object.entries(variants).map((entry,n)=>['gift-volume-'+entry[0],model(entry,n)])));
