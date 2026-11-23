// A palm-size, serviceable terminal: an enamel clamshell, deep screen bezel,
// raised key bed and interchangeable peripherals. All content is object-local.
import {shape,stroke,rect,oval,part,finish,paint,track,edge,fastener} from './edition-drawing.mjs';

const casePath='M62 61Q62 54 70 53L171 40Q178 39 182 45L192 59 196 158 184 170 203 188 200 203 78 220 50 199 45 190 51 75Z';
const facePath='M59 67Q59 61 65 60L171 46Q177 45 178 53L181 151 59 169Z';
const keysPath='M59 160 181 145 200 186 77 205 48 189Z';
const screens={
  greenline:{body:['#d4cdb2','#b2b098','#88927c','#616d65'],shade:'#56645e',trim:'#e2d8ae',phosphor:'#b8e7a8',dark:'#263b34',hardware:'disk',timing:2160},
  'amber-relay':{body:['#eeb38a','#ca8460','#b26d54','#865848'],shade:'#82584d',trim:'#f4ce97',phosphor:'#f6c07e',dark:'#422f2b',hardware:'receipt',timing:2430},
  'field-service':{body:['#a6bac0','#7896a4','#567180','#425562'],shade:'#374958',trim:'#cad0bd',phosphor:'#a4dce3',dark:'#273943',hardware:'aerial',timing:2260},
  'glass-console':{body:['#d9ccdf','#aa91ba','#81799e','#5b587e'],shade:'#544f72',trim:'#ddd7dd',phosphor:'#dcd0ff',dark:'#343049',hardware:'spindle',timing:2380}
};
const modelIds=Object.keys(screens);
const slots=(color)=>Array.from({length:5},(_,i)=>stroke(`M${166+i*3.3} ${155-i*.42}l3.5 5.2`,color,1.2)).join('');
function housing(p,v){
 const shell=paint(p+'-case'),metal=paint(p+'-metal');
 return shape(casePath,v.shade,edge)+shape('M175 45 188 58 192 152 181 160 177 124Z',v.shade)+shape(facePath,shell,edge)+
   stroke('M64 64l104-13q5-.7 5 3m-111 16 2.5 88',v.trim,2)+stroke('M182 56l3 90 4-5','#a6a49b',1)+
   shape('M80 207l119-17-1 10-120 17-26-18-3-8Z',v.shade,edge)+shape(keysPath,shell,edge)+
   stroke('M54 187l25 14 114-16',v.trim,1.4)+stroke('M82 211l107-15',v.dark,1.7)+
   shape('M64 158l23-3 3 5.5-23 3Z M149 147l25-3 3 5-26 3.4Z',metal,edge)+
   [[67,69],[171,56],[63,150],[173,140]].map(([x,y])=>fastener(x,y,1.8)).join('')+slots(v.dark);
}
function keyboard(v,code){
 const key=(x,y,w,fill)=>shape(`M${x} ${y}l${w} -1.2 3.2 3.5 -${w+1} 1.35Z`,fill,'stroke="#435050" stroke-width=".75"')+stroke(`M${x+1.2} ${y+.3}l${w-2} -1`,v.trim,.62);
 let keys='';
 for(let row=0;row<3;row++)for(let col=0;col<(code===2?5:7);col++){
  keys+=key(65+row*4+col*10.4,169+row*5.8-col*1.25,8.5,(row+col)%6===0?v.trim:'#8d9894');
 }
 return keys+key(87,186,33,v.dark)+oval(165,173,10.5,7.4,'#485052',edge)+oval(165,171,8.1,6.5,paint(''+v.knob))+
  part('jog-wheel',stroke('M165 171l5-4',v.dark,1.8))+fastener(183,181,2.1);
}
function frame(x,y,w,h,v){
 return rect(x-3,y-3,w+6,h+6,5,v.trim)+rect(x-1.5,y-1.4,w+3,h+3,4.4,'#454952')+rect(x,y,w,h,4,v.dark)+
 stroke(`M${x+3} ${y+h-3}v-${h-8}q0-2 2-2h${w-12}`,'#141f28',1.3);
}
function lightScreen(v,n) {
 const c=v.phosphor,mark=(d,w=1.3)=>stroke(d,c,w);
 const glass=frame(73,83,87,43,v);
 const faint=Array.from({length:8},(_,i)=>stroke(`M75 ${86+i*5}h83`,c,.46,'opacity=".17"')).join('');
 const prefix=mark('M78 91h7m2 0h3m4 0h3',1.1);
 const scenes=[
  mark('M80 98l6 4-6 4m10-2h19m-19 5h28')+part('display-response',rect(122,105,7,3,.4,c)),
  mark('M81 99h26m-26 5h23m-23 5h14')+part('display-response',mark('M119 104l5 4 9-12',2.5)),
  mark('M78 107h13l4-5 5 11 6-20 7 18 4-4h20',1.7)+part('display-response',mark('M140 96v20m-3-17h6',1.6)),
  mark('M77 96h25v22H77z M108 96h22v22h-22z',1)+part('display-response',mark('M80 111l5-1 4-7 5 10 5-5m11 4h4l3-7 4 9 5-6',1.6))
 ];
 return '<g transform="matrix(1 -.127 .02 1 -2 5)">'+glass+faint+prefix+scenes[n]+
   stroke('M78 86h72l-4 4H82Z','#ebe8ce',.8,'opacity=".27"')+'</g>';
}
// The external module changes the outline even when the four terminals are
// shown in monochrome. Its moving component remains attached to its housing.
const moduleProfiles=[
 'M48 108l9-5 5 31-5 13-13-5-2-25Z',
 'M141 54l1-18 12-5 12 3 7 18v6Z',
 'M178 79l14-9 12 4 7 36-11 13-13-9Z M197 116l11-1 10 33-3 12-6-7Z',
 'M174 74l18-7 15 4 12 13 7 40-7 12-27 9-12-11Z'
];
function externalModule(p,v,n) {
 const metal=paint(p+'-metal'),dark=v.dark,trim=v.trim;
 const back=shape(moduleProfiles[n],metal,edge);
 if(n===0){
   const door=shape('M36 109l16-5 6 4 2 25-15 10-9-6Z','#717e75',edge)+
   shape('M38 113l15-4 1.6 8-15 5Z',dark,edge)+
   stroke('M41 115l9.5-2.6m-8 16 12-4.5',trim,1.3)+fastener(45,135,1.6);
   return back+part('case-mechanism',door);
 }
 if(n===1){
   const cog=oval(149,44,11,12,'#776b5c',edge)+oval(149,44,7.5,9,'#363e3f',edge)+
   [0,90,180,270].map(a=>`<g transform="rotate(${a} 149 44)">${stroke('M149 36v5',trim,2.1)}</g>`).join('')+
   oval(149,44,2.2,2.1,trim);
   return back+part('case-mechanism',cog)+stroke('M157 35l6 2 4 11','#efc69b',1.8);
 }
 if(n===2){
   const probe=shape('M195 84l4-2 4 3 9 37-5 11-9-27Z','#546a76',edge)+
    stroke('M199 89l5 21',trim,1.5)+shape('M207 129l5-7 4 20-1 8-4-5Z','#d4d3ae',edge);
   return back+stroke('M187 89q7-24 15-16 4 5 2 16m-13 24q10 23 15 8','#485254',4)+
    part('case-mechanism',probe)+fastener(188,112,2.6);
 }
 const reel=oval(202,98,13.5,15,'#534d68',edge)+oval(202,98,11,12.4,'#bbacc2','stroke="#635d70" stroke-width="1.4"')+
  [0,120,240].map(a=>`<g transform="rotate(${a} 202 98)">${oval(202,90.6,3.1,2.8,'#605777')}</g>`).join('')+oval(202,98,2.5,2.8,'#635e6b');
 return back+shape('M185 79l18-5 10 9 6 39-5 9-19 5-10-9Z','#847d9e',edge)+part('case-mechanism',reel)+
   stroke('M193 87q-11 18 .7 32l6.5 8 9-2','#5c526d',2.5)+oval(203,121,4,4.5,metal,edge)+
   shape('M188 83l17-5 5 4-10 3-11 11Z','#cac3d3','opacity=".48"');
}
function peripheral(p,v,n) {
 const metal=paint(p+'-metal'), chip=paint(p+'-face'), c=v.phosphor;
 if(n===0){
  const disk=shape('M84 52V36l43-5 6 5v19l-42 7Z','#525963',edge)+shape('M88 37l29-3 5 7-34 4Z','#c5c8b5')+
    shape('M103 51v-6l18-2v6Z',metal)+stroke('M92 40l13-1.5','#788c7a',1.1);
  return {behind:part('peripheral',disk),front:shape('M80 55l57-8 2.7 4-56 8Z','#464d4a')+stroke('M84 55.5l50-6.8',v.trim,1.2),mini:'M7 5V3.3l4.6-.6v2.1Z',story:'A disk slips halfway into the top drive, the cursor types, and the jog wheel indexes back.',move:[.33,-.5,12]};
 }
 if(n===1){
  const receipt=shape('M100 65l-.8-38 4 1.6 3-3 4 2.2 3-3.5 4 2 3-3 4 1.5 4-3.2 3.6 1.1 3-2.8 2.4 40Z','#e9d9b2','stroke="#89755c" stroke-width="1.4"')+
  [0,1,2,3,4].map(i=>stroke(`M104 ${32+i*5}l${i%2?22:29} -3.6`,'#8a8571',i===0?1.7:1)).join('');
  return {behind:part('peripheral',receipt),front:shape('M96 55l47-6 2 4-47 7Z','#67594d')+stroke('M96 54l46-5.5','#f1d4aa',2),mini:'M9 5.8l-.2-3.2 4-.7.4 3.6Z',story:'The thermal roller feeds a numbered receipt in two short pulls, then retracts the paper.',move:[.48,0,-17]};
 }
 if(n===2){
  const aerial=stroke('M161 56l12-29','#303e45',5)+stroke('M161 55l12-29',metal,3.2)+oval(173,26,3,3.2,v.trim,edge);
  return {behind:part('peripheral',aerial),front:shape('M150 51l4-7 9-1 6 5-2 7Z',metal,edge)+shape('M58 60l12-3-3 10-9 4Z M169 47l8-1 6 9-6 6-5-6Z M49 178l10-3 3 10-10 6Z M184 177l10-1 7 9-6 3Z','#495962',edge),mini:'M15.2 6l3-4.5 1.1.4-3.1 5Z',story:'The aerial telescopes as the tuner turns. A narrow breakpoint travels across the scope.',move:[.42,4,-8]};
 }
 const spokes=Array.from({length:4},(_,i)=>`<g transform="rotate(${i*90} 147 141)">${oval(147,136,2.5,3.6,'#544f69')}</g>`).join('');
 return {behind:shape('M171 54l8 1 8 11 2 40-8-11Z','#b2b1ce',edge),front:shape('M133 136l28-5 7 12-5 8-26 3Z',chip,edge)+oval(147,141,10,9,'#696580',edge)+part('peripheral',oval(147,141,8,7.2,metal)+spokes+oval(147,141,2,2,v.dark))+stroke('M73 139l25-3 4-5 22-3m-48 15 19-2.5 4-3 23-3',c,1,'opacity=".75"'),mini:'M16.4 6l2.2 1.4.2 4.8-1.8-1.4Z',story:'A magnetic tape reel runs forward under glass; the two channel monitors answer one another.',move:[.56,0,0,138]};
}
function miniature(v,n) {
 const keys=stroke('M6 17.7l5.8-.9m-4.8 2.3 6.3-.9',v.shade,.75);
 const symbols=['M8 10l1 .7-1 .9m2 .3 2.7-.4','M8 10.2l4.4-.7m-4.4 2 3.8-.6','M7.6 11.2l1.1-.2.6-1.2.8 1.4.7-2.1.8 1.2 1.9-.3','M7.6 10l2.6-.4.1 2.1-2.7.4Z M11.4 9.4l2.3-.4v2l-2.3.4Z'];
 return shape('M4.4 7 15.9 4.9l1.9 1.7.5 8.1 2.4 3.4-.8 1.5L7.2 22l-3-2.4-.3-1.5.5-2.4Z',v.body[1],'stroke="#313a40" stroke-width=".75"')+
 shape(peripheral('mini',v,n).mini,n===1?'#e4d3af':v.trim,'stroke="#48504e" stroke-width=".55"')+
 shape('M6.2 8.6l8.5-1.4.2 5.4-8.7 1.7Z',v.dark)+stroke(symbols[n],v.phosphor,.65)+stroke('M4.9 16.2l11.5-2',v.trim,.7)+keys+oval(15.4,17.5,1.25,1,v.dark)+
 (n===3?oval(14.5,14.2,1,.8,v.trim):'');
}
function miniModule(v,n){
 const d=['M4.7 10.2l-1.8.4-.3 3.4 1.6 1.1 1.1-.8Z','M12.9 5.6l.5-2 1.4-.3 1.2 1.8Z','M16.6 8l1.8-.8 1.2 1.3 1 4.4-.45 1.2-1-1.1-1.1-3.5-.9.4Z','M16.5 7.4l2.2-.9 1.3.8 1 4.7-.8 1.3-2.4.5Z'][n];
 return shape(d,v.body[2],'stroke="#43515a" stroke-width=".6"')+
 (n===3?oval(18.9,9.3,.95,1.2,v.trim)+oval(18.9,9.3,.3,.4,v.dark):'');
}
function model(key,n){
 const v=screens[key],mechanism=peripheral('sample',v,n);
 const [at,x,y,rotate]=mechanism.move;
 return {
 body(prefix){const variant={...v,knob:prefix+'-metal'},p=peripheral(prefix,variant,n);
   const defs=finish(prefix+'-case',v.body)+finish(prefix+'-metal',[v.trim,'#8f9796','#526167','#c6c2ac'])+finish(prefix+'-face',['#b5abbc','#766e99','#433e62']);
   return '<defs>'+defs+'</defs>'+oval(124,221,65,4.2,'#17242b','opacity=".27"')+p.behind+externalModule(prefix,variant,n)+housing(prefix,variant)+lightScreen(variant,n)+keyboard(variant,n)+p.front;
 },
 mini:miniature(v,n)+miniModule(v,n),silhouette:shape(casePath,'#10161d')+shape(moduleProfiles[n],'#10161d')+shape(['M84 59V36l43-5 6 5v19Z','M100 62l-1-36 38-6 2 38Z','M158 57l13-33 5 1-12 34Z','M171 54l8 1 8 11 2 40-8-11Z'][n],'#10161d'),
 storyboard:mechanism.story,motion:{duration:v.timing,layers:[
  track('peripheral',n===3?[147,141]:[138,53],{at:.12},{at,x,y,rotate:rotate||0},{at:.72,x:x*.5,y:y*.45,rotate:rotate?180:0}),
  track('case-mechanism',[[48,132],[149,44],[199,84],[202,98]][n],
    {at:.12},{at:.43,rotate:[-21,89,-12,98][n],x:n===0?-3:0},{at:.66,rotate:[-15,169,8,164][n]},{at:.89,rotate:[2,16,-2,24][n]}),
  track('jog-wheel',[165,171],{at:.12,rotate:9},{at:.42,rotate:-66},{at:.68,rotate:-54},{at:.9,rotate:5}),
  track('display-response',[122,106],{at:.16,opacity:.18},{at:.36,x:n===2?-12:3,opacity:.92},{at:.56,x:n===2?-20:5},{at:.79,opacity:.46})]}
 };
}
export const terminalEditions=Object.freeze(Object.fromEntries(modelIds.map((key,i)=>['gift-terminal-'+key,model(key,i)])));
