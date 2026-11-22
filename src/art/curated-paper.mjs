import {gifts} from './gifts.mjs';
import {makeLegacyRevision} from './legacy-rig.mjs';

const join = (name, body, attributes='') => `<g data-part="${name}"${attributes?' '+attributes:''}>${body}</g>`;
const path=(d,fill,stroke='',width=1) => `<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`:''}/>`;
const line=(d,stroke,width=1)=>path(d,'none',stroke,width);
const dot=(cx,cy,r,col)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/>`;
const track=(name,origin,poses,restOpacity)=>({name,origin,frames:[{at:0,...(restOpacity===undefined?{}:{opacity:restOpacity})},...poses,{at:1,...(restOpacity===undefined?{}:{opacity:restOpacity})}]});
const word=(x,y,value,size,color,weight=500)=>`<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${value}</text>`;
const material=(p,name)=>`url(#${p}-${name})`;

// These four masters have labelled joints. Join new parts at their original
// stacking boundaries so a reflection stays behind glass and a leaf under its cover.
function beforePart(body,name,insert){
  const tag='<g data-part="'+name+'">';
  if(!body.includes(tag))throw Error('Drawing has no joint '+name);
  return body.replace(tag,insert+tag);
}
function coffee(p) {
  const body=gifts['gift-cup'].body(p);
  const foam=join('cup-foam',path('M94 84Q103 80 112 81Q120 81 126 83Q133 85 140 83Q137 87 130 87Q124 87 118 84Q108 81 99 85Q113 84 116 87Q106 88 94 84Z','#d7bc94')
    +line('M126 88Q134 89 142 85','#b9976b',1.05)+dot(145,83,1.6,'#d8bd96')+dot(148,81.8,.85,'#cdac7d'));
  const mount=body.indexOf('<path d="M169 96h17');
  if(mount<0)throw Error('Cup handle registration changed');
  const heel=path('M85 184Q113 194 146 182L143 191Q116 202 91 194Z','#283e44','#142a30',1)
    +line('M91 192Q113 199 140 192','#949a89',1.35);
  const vessel=body.slice(mount).replace('<path d="M66 85',foam+'<path d="M66 85')
    +line('M93 162Q100 170 108 171M153 148Q153 156 148 162','#8ca7a7',1.1);
  return body.slice(0,mount)+'<ellipse cx="117" cy="200" rx="33" ry="5" fill="#182c32"/><g transform="translate(0 5)">'+heel+vessel+'</g>';
}
function ticket(p){
  // The coupon is a separate cut panel with its own printed back. A fixed
  // perforated hinge between the two panels is visible from both directions.
  const stock=material(p,'paper'), burgundy='#873e4b', edge='#9a846d';
  const upper='M75 29Q81 29 82 23H173Q174 30 180 30V84Q170 84 170 93Q170 102 180 103V150H75V117Q83 116 83 110Q83 102 75 102Z';
  const stub='M75 151H180V206Q173 205 172 215H83Q82 209 75 208Z';
  const seam=Array.from({length:17},(_,i)=>line('M'+(78+i*6)+' 150.8h2.45','#866d55',1.05)).join('');
  const print=word(86,52,'NIGHT',13,burgundy,750)+word(86,67,'SERVICE',13,burgundy,750)+word(87,81,'AFTERHOURS  /  01',5.8,'#765849',650)
     +line('M87 88h73m-72 2h64','#a56b62',1)
     +word(87,110,'23:56',14,'#4e4942',650)+word(87,121,'LATE DEPARTURE',5.5,burgundy,600)
     +line('M87 133h55m-54 3h42','#92755f',1);
  const upperFace=path(upper,'#b4a487',edge,1.6)+`<g transform="translate(0 -1.8)">${path(upper,stock,edge,1.2)}</g>`
    +line('M79 146V120m.5-21V35q4-.6 6-6h82q3 6 8 8v43m0 28v37','#ad7062',1)
    +print+path('M155 126a5.3 5.3 0 1 0 .01 0Z','#605c52','#a38f70',1.65)
    +line('M149 141h19m-14 2h13','#947652',.8);
  const coupon=path(stub,'#ab987c',edge,1.7)+path('M75 151H180V204Q173 204 171 212H83Q82 206 75 205Z',stock,edge,1.05)
    +line('M79 155v46q6 0 8 7h79q1-4 8-7v-46',burgundy,.9)
    +word(85,170,'ADMIT ONE',9.7,burgundy,700)+word(85,181,'RETURN COUPON',5.7,'#74604f',600)
    +[0,3,5,8,12,15,19,21,25,29,32,36,39,42,47,50,54,58].map((x,i)=>line('M'+(86+x)+' 188v10','#6d5b48',i%3===0?1.8:.9)).join('')
    +word(151,197,'A1',8.3,burgundy,650);
  const clip=path('M155 18Q156 12 163 12H178Q184 12 183 19L180 67Q178 75 171 74Q164 74 164 67L167 31Q168 26 173 26Q177 26 177 31L174 62','#788786','#3f4948',2.4)
    +line('M157 19q0-5 5-5h15q5 0 4 5l-3 47q-.1 6-6 6q-6 0-5-6l3-34q0-4 3-4q3 0 2 4l-2 30','#d8e0d1',2.1);
  return `<ellipse data-part="ticket-shadow" cx="128" cy="225" rx="62" ry="3.5" fill="#10191d" opacity=".18"/><g transform="rotate(7 128 128)">${upperFace}${join('ticket-stub',coupon)}${seam}${join('ticket-clip',clip)}</g>`;
}
function broadcast(p){
  let body=gifts['gift-last-broadcast'].body(p);
  const glow=join('dial-light',path('M85 96h77v12H85Z','#ffdc94')+dot(160,137,3.4,'#ffe7a2'),'opacity="0"');
  body=body.replace('<path d="m92 97',glow+'<path d="m92 97');
  const index=Array.from({length:12},(_,i)=>
    `<g transform="rotate(${i*30} 160 177)">${line('M160 166.5v1.9',i%3===0?'#e0ddbd':'#80999e',1.15)}</g>`).join('');
  return body.replace('<path data-part="radio-knob"',index+'<path data-part="radio-knob"')+word(85,218,'NIGHT BAND',5.1,'#2e4857',700);
}
function lantern(p){
  const original=gifts['gift-night-lantern'].body(p);
  const handle=original.indexOf('<path d="M93 62V32'),panes=original.indexOf('<path d="m75 78 52-17 54 17');
  if(handle<0||panes<handle)throw Error('Lantern loop registration changed');
  const light=join('window-light',path('M79 92l42 12v104l-48-14Z','#f8d388')+path('M137 107l36-12 10 96-46 15Z','#e8b376'),'opacity="0"');
  const rivets=dot(94,57,3.7,'#4e5041')+dot(94,57,2.3,'#bfab78')+dot(161,56,3.2,'#535848')+dot(160.8,55.8,1.8,'#cab587');
  const body=original.slice(0,handle)+join('lantern-loop','<g transform="translate(0 56) scale(1 .87) translate(0 -56)">'+original.slice(handle,panes)+'</g>')+original.slice(panes);
  return beforePart(body,'lantern-lamp',light)+rivets;
}
function volume(p){
  const paper=material(p,'paper');
  const leaf=join('bound-page',
    path('M70 55L160 41L188 186L87 213L69 206Z',paper,'#947f69',1.25)
    +path('M70 55L76 53L95 207L87 212L69 206Z','#a79376')
    +line('M80 59L94 196','#eaddb8',1.15)
    +line('M87 71l51-9m-50 13 36-6m-34 16 54-10m-53 15 46-9m-45 15 51-10m-50 15 37-7m-35 15 49-9m-49 15 41-8m-39 20 48-10m-47 15 36-7m-34 16 42-8','#9a876c',1.25)
    +path('M174 162L186 185L162 192Q172 175 174 162Z','#efe3c5','#b39c7c',.78));
  const still=path('M74 58L160 44L187 187L90 213L74 206Z','#c8b695','#97826e',1)
    +line('M87 69l55-10m-54 16 59-11m-58 17 41-8m-37 18 56-10m-55 16 49-9','#ab977c',1.15);
  const spine=path('M56 63L65 58L83 214L77 214Z','#47514c','#283437',.75)+line('M61 87l7-2M64 114l6-2M70 164l6-2','#b9a883',1);
  return beforePart(gifts['gift-ego-volume'].body(p),'volume-cover',still+leaf)+spine;
}
function orbit(p){
  const source=gifts['gift-orbit-mobile'].body(p);
  // The wire cage is a second round stage on the fixed post. The near half of
  // one orbit is painted last; the two planes genuinely occlude one another.
  const hoop=join('inner-orbit',`<ellipse cx="127" cy="138" rx="28" ry="12" transform="rotate(-62 127 138)" fill="none" stroke="#cba977" stroke-width="2"/>`
      +dot(139,115,3.6,'#d6b179')+dot(116,161,2.7,'#a88a61'));
  const ring=path('M90 139C94 123 117 123 139 129Q160 134 168 145Q155 136 137 132Q105 123 90 139Z','#788e91','#5d777d',1)
    +hoop+line('M90 139C88 153 112 161 144 159Q168 157 168 145','#b9c9c5',2.2)
    +dot(128,139,7,'#8b6e4f')+dot(126,137,5.2,'#d6b886')+dot(124,135,1.7,'#f4dfac');
  return beforePart(source,'mobile-crossbeam',ring);
}
const extras={
 'gift-cup':{body:coffee,storyboard:'Coffee laps at the ivory rim. The crema turns in a shallow arc while two steam curls rise separately and reform.',motion:{duration:1640,layers:[
   track('cup-coffee',[116,84],[{at:.23,scaleY:.88},{at:.47,scaleY:1.04},{at:.74,scaleY:.98}]),
   track('cup-foam',[116,84],[{at:.16,x:-1},{at:.42,x:2,rotate:6,scaleX:.88},{at:.70,x:-1,rotate:-2}]),
   track('cup-steam-left',[106,61],[{at:.27,y:-2,rotate:-3,opacity:.56},{at:.60,y:-5,rotate:2,opacity:.22},{at:.80,opacity:.34}],.46),
   track('cup-steam-right',[132,61],[{at:.31,y:-2,rotate:2,opacity:.46},{at:.64,y:-4,rotate:-2,opacity:.21},{at:.83,opacity:.32}],.4)]}},
 'gift-ticket':{body:ticket,storyboard:'The printed return coupon folds upward along its perforations, hangs briefly, then settles against the ticket while its wire clip ticks.',motion:{duration:1600,layers:[
   track('ticket-stub',[128,151],[{at:.13,scaleY:1.035},{at:.41,scaleY:.27},{at:.54,scaleY:.22},{at:.72,scaleY:1.055},{at:.86,scaleY:.99}]),
   track('ticket-shadow',[128,225],[{at:.13,opacity:.18},{at:.47,opacity:.075,scaleX:.72},{at:.66,opacity:.13,scaleX:.88},{at:.81,opacity:.19}],.18),
   track('ticket-clip',[162,20],[{at:.20,rotate:-1.5},{at:.44,rotate:2.5},{at:.68,rotate:-1.1}])]}},
 'gift-last-broadcast':{body:broadcast,storyboard:'A turn of the knurled knob drives the dial needle across the amber scale. The dial backlight comes up, then settles with the needle.',motion:{duration:1590,layers:[
   track('radio-knob',[160,177],[{at:.16,rotate:-11},{at:.44,rotate:68},{at:.56,rotate:59},{at:.78,rotate:20}]),
   track('radio-needle',[129,103],[{at:.16,x:-3},{at:.44,x:22},{at:.56,x:18},{at:.78,x:6}]),
   track('dial-light',[125,104],[{at:.19,opacity:0},{at:.34,opacity:.36},{at:.55,opacity:.28},{at:.78,opacity:.07}],0)]}},
 'gift-night-lantern':{body:lantern,storyboard:'The flame brightens behind smoked panes. The cloth loop drops a little on its two pins, then rocks back to its carrying position.',motion:{duration:1680,layers:[
   track('lantern-loop',[128,56],[{at:.18,scaleY:.98},{at:.41,scaleY:.62},{at:.63,scaleY:1.045},{at:.80,scaleY:.97}]),
   track('lantern-lamp',[127,181],[{at:.18,scaleY:.86},{at:.43,scaleX:1.07,scaleY:1.12},{at:.7,scaleY:.96}]),
   track('window-light',[127,174],[{at:.18,opacity:0},{at:.43,opacity:.29},{at:.6,opacity:.18},{at:.82,opacity:.08}],0)]}},
 'gift-ego-volume':{body:volume,storyboard:'The front board lifts to reveal a printed leaf. It turns along the bound spine and settles back before the cover closes.',motion:{duration:1890,layers:[
   track('volume-cover',[69,122],[{at:.14,scaleX:.96},{at:.30,scaleX:.37,rotate:-4},{at:.62,scaleX:.35,rotate:-4},{at:.82,scaleX:.89},{at:.92,scaleX:.99}]),
   track('bound-page',[76,120],[{at:.22,scaleX:1},{at:.42,scaleX:.48,rotate:-3},{at:.55,scaleX:.28,rotate:-3},{at:.68,scaleX:.94},{at:.79,scaleX:1}]),
   track('volume-bookmark',[154,57],[{at:.24,rotate:-1},{at:.44,rotate:4},{at:.68,rotate:-2}])]}},
 'gift-orbit-mobile':{body:orbit,storyboard:'The brass balance tips at its bearing. The crescent and satellite follow on separate hangers while an inner wire orbit changes plane over the fixed mast.',motion:{duration:1730,layers:[
   ...gifts['gift-orbit-mobile'].motion.layers,
   track('inner-orbit',[127,138],[{at:.18,scaleX:.90},{at:.45,scaleX:.28,rotate:14},{at:.63,scaleX:.62,rotate:8},{at:.82,scaleX:1.035}])]}}
};
export const curatedPaper=Object.fromEntries(Object.entries(extras).map(([id,revisions])=>[id,makeLegacyRevision(id,gifts[id],revisions)]));
