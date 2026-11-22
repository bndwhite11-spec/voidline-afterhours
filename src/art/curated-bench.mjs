/** Revisions of the existing free Workshop objects. The v32 optical marks and
 * physical pivot conventions remain useful; the new moving bodies have no raster.
 */
import {studioObjects} from './studio-objects.mjs';
import {legacyPresentations} from '../collectibles/legacy-presentations.mjs';

const p=(d,fill,attrs='')=>`<path d="${d}" fill="${fill}" ${attrs}/>`;
const l=(d,c,w=1.5,attrs='')=>p(d,'none',`stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${attrs}`);
const e=(x,y,rx,ry,c,attrs='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" ${attrs}/>`;
const g=(name,shape,attrs='')=>`<g data-part="${name}" ${attrs}>${shape}</g>`;
const tx=(x,y,label,size,fill,attrs='')=>`<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${fill}" ${attrs}>${label}</text>`;
const paint=(prefix,name)=>'url(#'+prefix+'-'+name+')';
const colors={
  brass:['#f9e8b5','#d7b46c','#b59251','#8d673c','#cdad73'],smoke:['#7f9999','#546467','#38484c','#263b3f'],
  nickel:['#d4ded5','#a9bab7','#5b7179','#9caaa9','#526872'],petrol:['#577376','#38585d','#243f48','#15303a'],
  paper:['#fff2ce','#eadcba','#d7c7a8','#c3ad8e'],wax:['#d88971','#ad5d53','#853e42','#632c37'],
  cap:['#eee5cc','#d6d0b6','#b6b49f','#9c9d8e'],amber:['#e8b878','#cb965a','#a27449','#755342']
};
function defs(id,kinds,extra=''){
 return '<defs>'+kinds.split(' ').map(name=>'<linearGradient id="'+id+'-'+name+'" x1="0%" y1="0%" x2="70%" y2="100%">'+colors[name].map((c,i)=>'<stop offset="'+Math.round(i*100/(colors[name].length-1))+'%" stop-color="'+c+'"/>').join('')+'</linearGradient>').join('')+extra+'</defs>';
}
const shadow=(x,y,rx)=>e(x,y,rx,4,'#0c151a','opacity=".38"')+e(x,y-.6,.7*rx,2.1,'#0c151a','opacity=".30"');
const layer=(name,origin,frames)=>({name,origin,frames:[{at:0},...frames,{at:1}]});
const screw=(x,y)=>e(x,y,3.05,3.05,'#273538')+e(x-.3,y-.4,2.45,2.4,'#aebdb4')+l('M'+(x-1.35)+' '+(y+.7)+'l2.45-1.8','#536064',.9);

const tapeBody='M28 50Q20 50 20 59V190Q20 201 31 202H224Q235 202 235 191V59Q235 50 225 50Z';
function cassette(id,variant) {
 const metal=paint(id,'smoke'),detail=variant!=='card';
 const wall=p(tapeBody,metal,'stroke="#536768" stroke-width="2"')+
  p('M29 53H224Q231 54 231 60V188Q231 195 223 195H31Q24 195 24 188V60Q24 54 29 53Z','#314348','stroke="#82918d" stroke-width="1.25"')+
  p('M24 178v12q0 7 8 7h190q7 0 9-4l-3 7H29q-7-1-7-8Z','#223139')+
  l('M29 57h191m-194 7v108','#8b9e98',1.25)+l('M40 196h175','#78908c',1.2);
 const label=p('M34 64H221v41H34Z','#a9cfcd','stroke="#2a424a" stroke-width="1.5"')+
  p('M35 98h185v7H35Z','#99b9b8')+l('M39 96h164','#50737a',1.2)+
  tx(42,81,'AFTERHOURS',12,'#2c4950','font-weight="700" letter-spacing="1.5"')+
  tx(43,92,'MIDNIGHT MIX',5.6,'#496367','letter-spacing="1.3"')+tx(199,91,'A',20,'#365358','font-weight="700"');
 const opening=p('M43 110H212l7 9v28l-5 6H41l-5-6v-29Z','#1a282d','stroke="#748a86" stroke-width="1.4"')+
  l('M40 119l4-5h83m80 0h4l4 5','#adbfaf',1);
 function reel(x,radius,name){
  const teeth=Array.from({length:6},(_,i)=>p('M-2-8.8H2l.4 3.9-4.8.1Z','#d5d5bb','transform="rotate('+i*60+')"')).join('');
  return e(x,131,radius,radius,'#584b3b')+e(x,131,radius-1.8,radius-1.8,'none','stroke="#8c7a59" stroke-width=".8"')+
   e(x,131,11,11,'#334347')+g(name,'<g transform="translate('+x+' 131)">'+
    e(0,0,10.1,10.1,'#ded9bb')+e(0,0,8.7,8.7,'#324143')+teeth+e(0,0,3.3,3.3,'#223135')+'</g>');
 }
 const packs=reel(79,20,'reel-left')+reel(177,16,'reel-right')+p('M102 121h52v18h-52Z','#85968a','stroke="#435653" stroke-width="1.4"')+
  p('M106 124h44v12h-44Z','#a3a699')+l('M107 133h40','#726e60',1)+l('M95 145q35 1 64-2','#ab966e',1);
 const rail=p('M76 159h103l13 31H63Z','#4b6264','stroke="#253a3f" stroke-width="1.4"')+
  l('M68 185l10-22h98l9 22','#859994',1.35)+[79,104,153,177].map((x,i)=>e(x,184,i===0||i===3?4.2:3.2,3.9,'#27383a')).join('')+
  p('M113 179h30v8h-30Z','#26383b')+l('M115 179h26','#99a8a0',1.1);
 const wear=detail?l('M42 164l11-1m-8 5 6-.4m145 10 10-2m-23-90h9','#aeb9a6',.8)+l('M33 146v5m161 37 5 1','#788a82',.8):'';
 return defs(id,'smoke')+shadow(130,208,79)+wall+label+opening+packs+rail+wear+
  [[29,59],[226,59],[29,189],[226,189]].map(a=>screw(...a)).join('');
}
const starPath='M128 25L154 99 234 99 170 148 195 226 128 179 62 226 86 148 22 99 102 99Z';
function star(id,variant){
 const points=[[128,25],[154,99],[234,99],[170,148],[195,226],[128,179],[62,226],[86,148],[22,99],[102,99]];
 const facets=['#f3d77d','#c0984e','#f5d684','#c2984c','#e5c270','#ae8641','#f7db8a','#c6a057','#e6c16a','#fae29a'];
 const planes=points.map(([x,y],i)=>p('M128 130L'+x+' '+y+' '+points[(i+1)%10].join(' ')+'Z',facets[i])).join('');
 const edge=p(starPath,paint(id,'brass'),'stroke="#886d46" stroke-width="3" stroke-linejoin="round" transform="translate(1.6 5)"');
 const score=l('M128 30v88m34 36 23 52M72 211l14-47m-47-61 49 4','#fff0b4',1.25);
 const hatch=variant==='card'?'':l('M129 39l2 9m56 162 2 7m-111-2 5-15m124-88-6 2','#fce8a5',1.1);
 const sheen=g('polish',p('M52 77l8-4 125 114-9 3Z','#fff2c2')+p('M66 72l2.5-1 124 113-3 .7Z','#fff9d6'),'opacity="0"');
 return defs(id,'brass','<clipPath id="'+id+'-face">'+p(starPath,'white')+'</clipPath>')+shadow(128,235,48)+
  g('star',edge+p(starPath,paint(id,'brass'),'stroke="#ae8e50" stroke-width="1.6" stroke-linejoin="round"')+planes+score+hatch+
   '<g clip-path="url(#'+id+'-face)">'+sheen+'</g>');
}

const envelopeShape='M38 98Q38 94 43 94H211Q216 94 216 100V192Q216 196 210 196H45Q38 196 38 190Z';
function letter(id,variant){
 const paper=paint(id,'paper'),back=p(envelopeShape,'#b79c7d','stroke="#917c68" stroke-width="2"');
 const inside=g('gummed-flap','<g transform="translate(0 190) scale(1 -1)">'+p('M40 97Q42 95 48 95H208Q214 96 214 98L136 153Q128 160 118 153Z','#dbc7a3')+
  p('M48 98L123 149Q129 152 133 148L207 98 130 139Z','#b8a98b')+l('M48 98l76 52q4 2 8 0l76-52','#dcd5b1',1.3)+'</g>','opacity="0"');
 const note=g('insert',p('M51 109l1-8 144-2 7 8v60H53Z','#dfe3cf','stroke="#9ca89b" stroke-width="1.2"')+
  l('M61 109h56m8 0h14m-77 6h98m-98 5h53m48-13 24-.4','#8caaaa',1.2)+
  p('M181 104l10-.5.1 11-10 .9Z','#aebcb2')+l('M183 111l2-4 3 4','#dde3ce',1));
 const pocket=p('M39 96L123 144Q128 147 134 144L214 96 214 191Q214 195 209 195H45Q39 194 39 189Z',paper)+
  p('M40 189l69-61 18 16 22-15 64 60Z','#dec9a5')+l('M42 189l66-59m42 2 61 57','#b69e81',1.5)+
  l('M45 189l60-54m49 2 55 50','#f2dfb9',1);
 const stamp=p('M111 130Q113 120 124 119Q129 115 137 119Q146 120 146 130Q150 138 142 144Q135 151 124 147Q115 148 111 140Q106 136 111 130Z',paint(id,'wax'),'stroke="#733b3c" stroke-width="1.2"')+
  e(128.8,134,12.5,10.8,'#98504d','stroke="#d38468" stroke-width=".9"')+
  p('M120 130l8 10 8-12-6 4-3 4-4-5Z','#cf826a')+
  l('M118 137q1 3 4 4m10-19q7-1 10 5','#efb093',1.4);
 const flap=g('seal-flap',p('M40 95H214L135 151Q128 156 119 151Z','#f2ddba','stroke="#b6a084" stroke-width="1.4"')+
  p('M44 97l77 48q6 4 12 0l75-48-80 43Z','#ead2aa')+stamp);
 const paperTooth=variant==='detail'?l('M49 175l5-4m.8 1.5 5-4m129-15 5-4m-144 31 7-6m115 12 13 .3','#cfb48e',1):'';
 return defs(id,'paper wax')+shadow(132,202,63)+'<g transform="rotate(-6 128 143)">'+back+inside+note+pocket+paperTooth+flap+'</g>';
}
function coin(id,variant){
 const metal=paint(id,'brass'),field=paint(id,'petrol');
 const reeding=Array.from({length:23},(_,i)=>{const a=(i*6+18)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return l('M'+(131+75*c).toFixed(1)+' '+(132+80*s).toFixed(1)+'l3.1 2.4','#866746',1.15);}).join('');
 const grain=Array.from({length:42},(_,i)=>{const a=i*Math.PI/21;return e((126+60.2*Math.cos(a)).toFixed(1),(127+65.1*Math.sin(a)).toFixed(1),1.05,1.05,'#c5ae79');}).join('');
 const edge=e(131,133,77,82,metal,'stroke="#8b7355" stroke-width="1.8"')+reeding+
  e(126,127,77,82,metal,'stroke="#b79c67" stroke-width="1.2"')+
  e(126,127,71,76,'#655a46')+e(126,127,68,73,field,'stroke="#c9ad74" stroke-width="1"')+
  e(126,127,56,58,'#354e50','stroke="#789594" stroke-width="1.4"')+e(126,127,52,54,'#29434a');
 const cube=p('M125 86L160 105 161 144 125 165 91 146 91 107Z','#203740','stroke="#162a32" stroke-width="1.6" transform="translate(2.2 3.4)"')+
  p('M91 106L125 85 161 105 125 126Z','#f1d8a0')+
  p('M91 106L125 126V164L91 145Z','#acb4a6')+p('M125 126L161 105v39l-36 20Z','#768e91')+
  l('M94 106l31-18 31 17m-32 24v31','#ffedbe',1.6)+l('M129 126l28-16v31','#b6c6bb',1.25);
 const serial=variant==='detail'?tx(126,184,'BLOCK ZERO',5.7,'#e1d2a6','text-anchor="middle" letter-spacing="1.2"'):'';
 const flash=g('rim-light',l('M58 108q7-30 29-45','#fff0c8',3),'opacity="0"');
 return defs(id,'brass petrol')+shadow(132,218,46)+g('medal',edge+grain+cube+serial+flash);
}
const keyShape='M44 92Q45 85 55 84L176 65Q184 63 190 69L205 84Q208 87 209 94L218 128Q220 134 213 138L80 161Q72 162 67 158L42 142Q38 140 38 134Z';
function key(id,variant){
 const metal=paint(id,'nickel'),amber=paint(id,'amber'),cap=paint(id,'cap');
 const terminals=p('M65 177l8 2-1 24-6 5-2-3Z M182 159l6 2v30l-6 5-2-2Z',paint(id,'brass'))+l('M68 186v14m115-28v18','#f4ce94',1.3);
 const socket=p('M40 157l19-16 142-24 19 13 4 32-12 15-140 27-35-19Z',metal,'stroke="#5e7376" stroke-width="1.8"')+
  p('M38 175l35 18 141-26-3 9-139 27-35-18Z','#3d5057')+l('M42 174l32 16 138-25','#b8c1b5',2)+
  p('M59 157l6-7 125-22 11 6-4 19-124 27-15-9Z','#293a3f');
 const fixture=variant==='detail'?tx(122,184,'SWITCH',5.6,'#c7c9ad','letter-spacing="1.4" transform="rotate(-10 122 184)"')+
  l('M50 172l13 7m118-21 16-3','#a7b1a3',1.2):'';
 const switchPart=g('switch',p('M66 140l106-19 16 7-1 31-107 20-14-12Z',amber,'stroke="#866e54" stroke-width="1.3"')+
  p('M68 140l108-20 12 8-106 20Z','#deb97b')+p('M117 135l4-2v-8l8-2 5 2v8l12-2 4 5-13 4v8l-9 3-4-3v-5l-8 2-7-3Z','#f3d3a1')+
  l('M82 155l99-19m-97 25 94-18m-90 22 86-16','#f0d19e',1.35));
 const bezel=p(keyShape,cap,'stroke="#777d74" stroke-width="1.9"')+
  p('M40 131l25 17q6 4 13 2l135-23 5 5q2 4-6 6L79 162q-7 1-13-3l-25-17Z','#acac98')+
  p('M49 94q1-4 8-5l119-18q5-1 9 3l15 12q3 3 .2 8l-2 23q-1 4-7 6L76 145q-5 1-9-3l-18-13q-4-3-4-8Z','#d9d7bb','stroke="#b0b19f" stroke-width="1.3"')+
  l('M52 93l119-18m-125 46 1-16m29 42 129-23','#f5e9cb',1.8)+l('M72 155l4 3 51-9','#c6c6ae',1.2);
 const glyph='<g transform="rotate(-9 127 110)">'+tx(72,119,'Tab',23,'#515a54','font-weight="500"')+
  l('M158 98v8m-3-5h-17m3.5-4-4 4 4 4m-2 6v7m2.5-3h15m-3-3 3.5 3-3.5 3.5','#6b7163',1.55)+'</g>';
 const scuff=variant==='detail'?l('M60 125l4.6 2.4m-4 .4 2.5 1.3m118-31 5-1m-18 21 6-1m-12 13 8-1.5','#a8aa94',1.2)+
  l('M52 123l2 2m143-28-1 5','#faf0d6',1.5):'';
 return defs(id,'cap brass amber nickel')+shadow(140,209,62)+terminals+socket+fixture+switchPart+g('keycap',bezel+glyph+scuff);
}

const tapeMotion={duration:1680,layers:[
 layer('reel-left',[79,131],[{at:.15,rotate:-4},{at:.52,rotate:74},{at:.68,rotate:59},{at:.9,rotate:7}]),
 layer('reel-right',[177,131],[{at:.15,rotate:-5},{at:.52,rotate:92.5},{at:.68,rotate:73.75},{at:.9,rotate:8.75}])]};
const letterMotion={duration:1780,layers:[
 layer('seal-flap',[128,95],[{at:.1,scaleY:1.02},{at:.31,scaleY:.03,opacity:1},{at:.34,scaleY:.02,opacity:0},{at:.65,scaleY:.02,opacity:0},{at:.70,scaleY:.03,opacity:1},{at:.89,scaleY:1.02}]),
 layer('gummed-flap',[128,95],[{at:.28,scaleY:.03,opacity:0},{at:.34,scaleY:.18,opacity:1},{at:.46,scaleY:.86,opacity:1},{at:.61,scaleY:.80,opacity:1},{at:.69,scaleY:.03,opacity:0},{at:.85,opacity:0}]),
 layer('insert',[128,121],[{at:.28,y:0},{at:.50,y:-27},{at:.61,y:-26},{at:.78,y:0}])]};
const newSilhouettes={
 'gift-cassette':p(tapeBody,'#162128'),
 'gift-star':p(starPath,'#162128','transform="translate(1 3)"'),
 'gift-signal':p(envelopeShape,'#162128','transform="rotate(-6 128 143)"'),
 'gift-block-zero':e(129,130,80,84,'#162128'),
 'gift-last-tab':p(keyShape,'#162128')+p('M38 156l136-30 44-2 6 37-14 18-139 26-35-19Z M64 177l10 1-1 25-7 6Zm117-12 9-3-1 29-8 6Z','#162128')
};
const entries=[['gift-cassette',cassette,tapeMotion],['gift-star',star],['gift-signal',letter,letterMotion],['gift-block-zero',coin],['gift-last-tab',key]];
export const curatedBench=Object.freeze(Object.fromEntries(entries.map(([id,body,newMotion])=>{
 const old=studioObjects[id],meta=legacyPresentations[id];
 return [id,{...meta,body,mini:old.mini,silhouette:newSilhouettes[id],
  assetKind:'layered-svg',acquisitionPolicy:'legacy-free',storyboard:meta.description,
  motion:newMotion||{duration:old.duration,layers:old.layers}}];
})));
