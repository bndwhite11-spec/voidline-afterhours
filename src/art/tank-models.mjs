/** Four original miniature pressure-bottle studies. 256-unit object space.
 * Wheel and needle turn on their own spindles; feet, gauge glass, regulator
 * casting and cylinder are fixed. Textures are drawn rather than downloaded.
 */
const P=(d,fill,attr='')=>`<path d="${d}" fill="${fill}" ${attr}/>`;
const L=(d,c,w=1.5,extra='')=>P(d,'none',`stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}`);
const E=(x,y,rx,ry,fill,attr='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${attr}/>`;
const G=(name,s,attr='')=>`<g data-part="${name}" ${attr}>${s}</g>`;
const T=(s,x,y)=>`<g transform="translate(${x} ${y})">${s}</g>`;
const grad=(p,n,stops,angle='x')=>`<linearGradient id="${p}-${n}" x1="0%" y1="0%" x2="${angle==='y'?'5%':'100%'}" y2="${angle==='x'?'0%':'100%'}">${stops.map(([pos,color])=>`<stop offset="${pos}%" stop-color="${color}"/>`).join('')}</linearGradient>`;
const url=(p,k)=>'url(#'+p+'-'+k+')';
const cylinder='M105 88Q105 85 110 83L111 75Q124 72 139 75L140 83Q140 86 146 88Q173 99 176 119L177 192Q176 210 157 218Q126 232 93 219Q74 211 74 193L75 122Q75 100 105 88Z';
const tankBoundary='M75 125Q75 108 85 101Q99 92 106 89';
const field={
  'field-enamel':{
    skin:['#34594f','#7eab88','#749b7c','#47765e','#314f48','#78917a'],coat:'#b6c7a0',ink:'#344e44',rim:'#7b9883',
    ceramic:false,hardware:'brass',face:'#e4d8b6',mark:'#405343',accent:'#a5553f',fume:'#bddbc8',tag:'#d4c6a0',shadow:'#1a2c2b'
  },
  'sight-glass':{
    skin:['#35716e','#9ad2b3','#7dbba4','#65a39a','#3a716d','#7fb4a5'],coat:'#b9deca',ink:'#365d56',rim:'#bad6c4',
    hardware:'brass',face:'#e2ebcf',mark:'#45615b',accent:'#a36d45',fume:'#a6ebdf',tag:'#87b3a0',shadow:'#193631'
  },
  'field-repair':{
    skin:['#66453b','#b77e64','#a66d55','#855e4d','#57473f','#8a6856'],coat:'#d3b38a',ink:'#684a3e',rim:'#b09475',
    hardware:'steel',face:'#e9c79e',mark:'#684b3c',accent:'#9a3f33',fume:'#f2d3a5',tag:'#bda97e',shadow:'#302621'
  },
  'kiln-white':{
    skin:['#9eaba0','#faf1d3','#e7e3c9','#cbd1c1','#a0b1aa','#cfdbcb'],coat:'#fff4dc',ink:'#586e70',rim:'#c4d0c5',
    ceramic:true,hardware:'copper',face:'#cfd9d6',mark:'#395c72',accent:'#586d9e',fume:'#d7e4e8',tag:'#d3dccb',shadow:'#394b4b'
  }
};
const metalStops={
  brass:[[0,'#735642'],[18,'#b69358'],[38,'#f6d899'],[61,'#c2a269'],[83,'#8e6d4c'],[100,'#c8aa77']],
  copper:[[0,'#795248'],[19,'#ba7e61'],[38,'#f3c7a0'],[59,'#d19c7d'],[85,'#995f50'],[100,'#d39a81']],
  steel:[[0,'#4b5a59'],[18,'#829792'],[41,'#c8d1b9'],[58,'#a4b0a2'],[84,'#677572'],[100,'#a6b2a3']]
};
const marks=(x,y,r)=>Array.from({length:13},(_,i)=>{
  const theta=(-202+i*19)*Math.PI/180,cos=Math.cos(theta),sin=Math.sin(theta),a=r-(i%3===0?3.2:1.9);
  return 'M'+(x+a*cos).toFixed(2)+' '+(y+a*sin).toFixed(2)+'L'+(x+r*cos).toFixed(2)+' '+(y+r*sin).toFixed(2);
}).join('');
function defs(id,t) {
  const pos=[0,21,41,68,88,100];const fills=grad(id,'body',t.skin.map((color,i)=>[pos[i],color]))
    +Object.entries(metalStops).map(([k,v])=>grad(id,k,v,'diag')).join('')
    +grad(id,'liquid',[[0,'#88c7a0'],[24,'#bbdbaa'],[61,'#78bd9d'],[100,'#54887f']])
    +grad(id,'web',[[0,'#7f795b'],[25,'#bfba8e'],[50,'#a39e76'],[85,'#706f57'],[100,'#a29c72']])
    +grad(id,'glass',[[0,'#e7eacb'],[32,'#f6f1d4'],[100,t.face]],'y');
  return '<defs>'+fills+'<clipPath id="'+id+'-bottle">'+P(cylinder,'white')+'</clipPath></defs>';
}
function frame(id,t,kind) {
  const steel=url(id,'steel'),copper=url(id,'copper'),brass=url(id,'brass');
  if(kind==='field-enamel'){
    const hose='M86 83Q64 90 65 106Q66 124 60 136Q51 151 59 162Q63 166 75 164';
    return G('braided-line',L(hose,'#273c37',6.5)+L(hose,'#56685b',4.0)+L(hose,'#9b9d72',1.35,'stroke-dasharray="1 3"')
      +P('M68 160l8-.5 7 4-2 6-10-2-4-3Z',brass,'stroke="#5d6754" stroke-width="1.2"')
      +L('M70 161l2 5m2-5 2 5','#e2c69a',.9));
  }
  if(kind==='sight-glass'){
    const guard='M69 204V120Q69 98 90 89L107 81 M150 84Q181 94 183 116V200';
    return G('instrument-cage',L(guard,'#405e55',6.4)+L(guard,brass,4.3)+L('M70 124v63m112-53v39','#d9c494',1.2)
      +P('M64 198l16-1 6 6-1 6-15 1-5-4Z M168 201l15-6 4 2-1 7-13 6Z',brass));
  }
  if(kind==='field-repair'){
    const bail='M82 130L63 122Q58 117 60 107L71 69Q74 58 84 57l19 1';
    return G('carry-bail',L(bail,'#555e54',6.4)+L(bail,steel,4.3)+L('M62 106l6-22','#736c51',7.5)
      +L('M61 103l6-20','#b6ab7f',5.8,'stroke-dasharray="2.1 1.15"')+
      bolt(81,130,3.4,t.coat));
  }
  const returnPipe='M143 81Q175 81 185 100Q191 109 188 126L182 158Q181 167 174 170';
  return G('copper-loop',L(returnPipe,'#776156',6.2)+L(returnPipe,copper,4.3)+
    L('M186 105q4 6 2 17','#f4cdb0',1.03)+P('M173 163l10 2 3 5-6 5-9-3Z',copper));
}
function foot(id,t,kind) {
  const color=kind==='sight-glass'||kind==='kiln-white'?t.hardware:'steel';
  const footShape=P('M81 198Q126 211 170 197L169 215Q164 224 151 226L146 231Q141 234 137 231L136 228Q120 232 102 228L97 232Q93 233 89 229L90 223Q80 219 80 212Z',url(id,color),'stroke="'+t.shadow+'" stroke-width="1.6"')+
    E(125,201,45,10,t.shadow)+L('M83 212q38 17 83-1',t.rim,2)+
    P('M100 219q4 2 10 2l-1 4-11-3Zm36 1 14-2-1 4-12 2Z',t.shadow);
  return G('base',E(129,231,54,4.3,'#101b20','opacity=".22"')+E(124,229,40,3,'#10151a','opacity=".35"')+footShape);
}
function core(id,t,kind,detail) {
  const glass=kind==='sight-glass';
  const body=P(cylinder,url(id,'body'),'stroke="'+t.ink+'" stroke-width="2"'+(glass?' fill-opacity=".30"':''))
    +L(tankBoundary,t.coat,2.2)+L('M81 196q1 12 10 16m63 2q13-5 15-16',t.rim,1.55)
    +P('M108 78q16 4 31 0v9q-13 6-32 0Z',url(id,t.hardware),'stroke="'+t.ink+'" stroke-width="1.15"')
    +L('M110 81q12 4 26 1m-28 3q13 4 30 0',t.shadow,1);
  const shoulder=P('M81 111Q86 98 108 90Q119 88 134 90Q112 90 100 97Q86 103 81 111Z',t.coat,'opacity=".48"')+
    P('M139 88Q157 92 166 106Q161 103 154 101Q151 95 139 88Z',t.shadow,'opacity=".16"');
  const reflection=shoulder+L('M84 127v48m0 6v9',t.coat,glass?2.2:1.5,glass?'opacity=".86"':'opacity=".45"')+
    (glass?'':P('M88 129q2 1 5 1v62q-2 6-5 6Z',t.coat,'opacity=".12"'));
  const seam=detail?L('M78 200q9 19 39 21m13 0q17-.6 29-7',t.ink,.85):'';
  return G('body',body+reflection+seam);
}
function bolt(x,y,r,metal) {
  return E(x+.4,y+.7,r+.4,r+.25,'#43514d')+E(x,y,r,r-.2,metal)+L('M'+(x-r*.48)+' '+(y+r*.33)+'l'+(r*.96)+' '+(-r*.67),'#54625b',.8);
}
function gauge(id,t,kind,detail) {
  const metal=url(id,t.hardware),cx=161,cy=60,r=20;
  const socket=P('M141 70L151 63 159 73 145 79Z',metal,'stroke="'+t.ink+'" stroke-width="1.3"')+
    P('M146 69l5-4 8 8-6 4Z',metal,'stroke="'+t.ink+'" stroke-width=".85"');
  const glass=E(cx+1.3,cy+1.3,r+2,r+2,t.shadow)+E(cx,cy,r+2,r+2,metal)+E(cx,cy,r-1,r-1,t.mark)+
    E(cx,cy,r-2.4,r-2.4,kind==='kiln-white'?'#43657a':url(id,'glass'))+
    L('M147 49q6-8 17-7m6 2q5 1.5 7 6',t.coat,1.2);
  const ink=kind==='kiln-white'?'#f5eace':t.mark;
  const ticks=L(marks(cx,cy,15.6),ink,1.1)+L('M167 45q5 2 8 7',kind==='kiln-white'?'#c99271':t.accent,1.25);
  const hand=G('dial-needle',P('M157 62L148 56l12 2.6 5.5 3.5-.9 2Z',kind==='kiln-white'?'#edbb86':t.accent)
    +L('M150 56.8l10.6 3.1',kind==='kiln-white'?'#fff0c7':'#844e35',.7));
  const hub=E(cx,cy,2.55,2.55,metal)+E(cx,cy,1,1,t.shadow);
  const glassLight=L('M148 51q4-6 11-7',kind==='kiln-white'?'#9fb6bc':'#fffbe1',1.85)+L('M169 73l3-2',t.coat,1);
  const dialLegend=detail?L('M157 69h7m-5 2h3',ink,.65):'';
  return socket+glass+ticks+dialLegend+hand+hub+glassLight;
}
function wheel(id,t,kind) {
  const metal=url(id,t.hardware);
  const neck=P('M117 73V56Q117 52 122 51L129 53Q133 54 133 59V74Z',metal,'stroke="'+t.ink+'" stroke-width="1.5"')+
    P('M110 73L118 68 136 69 141 75 133 81 113 79Z',metal,'stroke="'+t.ink+'" stroke-width="1.5"')+
    L('M117 74l18 1m-10-19v11',t.coat,1.2);
  const regulator=P('M94 61L113 56 122 58 142 54 148 58 147 69 127 75 117 72 97 76Z',metal,'stroke="'+t.ink+'" stroke-width="1.5"')
    +P('M132 55l10-2 8 5-4 8-8 2-6-4Z',metal,'stroke="'+t.ink+'" stroke-width="1.35"')
    +P('M85 58l10-3 10 4v14l-11 4-9-4Z',metal,'stroke="'+t.ink+'" stroke-width="1.35"')
    +L('M97 60v11m40-13 6-2',t.coat,1.25);
  const outlet=P('M104 72l-11 6-6-2-12 6 2 8 14-3 4-4 12-4Z',metal,'stroke="'+t.ink+'" stroke-width="1.3"')
    +P('M72 80l7-.8 5.1 8.7-8.7 3-4.8-7.1Z',metal,'stroke="'+t.ink+'" stroke-width="1.1"')
    +E(73.9,86.1,2.2,3.7,t.shadow,'transform="rotate(-30 73.9 86.1)"');
  const wx=92,wy=59;
  let knob;
  if(kind==='field-repair'){
    knob=P('M88 57L72 47q-4-2-6 .8l-2 6q-.6 3.8 4 4.1l16 1.5 6 4.8 8-2.5 13 7q4 2 6 0l2-5q1-3.2-3-4l-15-3-5-3.5Z',metal,'stroke="'+t.ink+'" stroke-width="1.6"')
      +L('M69 52l10 4m23 6 10 2',t.coat,1.5);
  }else{
    const radius=kind==='kiln-white'?15.7:16.5,ring=kind==='sight-glass'?'#5c7261':metal;
    knob=E(wx,wy+1,radius,radius,'none','stroke="'+t.shadow+'" stroke-width="5"')+E(wx,wy,radius,radius,'none','stroke="'+ring+'" stroke-width="4.7"')+
      L('M92 45v12m12-6-9 7m8 10-9-7m-10 11 7-10m-13-7 12 4',ring,3.8)+
      L('M80.3 50.7q4.7-7.4 12.4-7.3m4.5 1q4.5 1.1 7.1 5',kind==='sight-glass'?'#b3ccac':t.coat,1.2);

  }
  const boss=E(wx,wy,5,5,metal,'stroke="'+t.ink+'" stroke-width="1"')+bolt(wx,wy,2.1,t.coat);
  return neck+regulator+outlet+G('wheel',knob+boss);
}

function engravedWord(color) {
  const glyphs=['M4 .7H2Q.6.7.6 2.2V6Q.6 7.4 2 7.4H4',
    'M2 .7H3Q4.3.7 4.3 2.2v3.6Q4.3 7.4 3 7.4H2Q.6 7.4.6 5.8V2.2Q.6.7 2 .7Z',
    'M.7 7.4V.7H3q1.3 0 1.3 1.4v.7Q4.3 4 3 4H.8',
    'M1 .7h2.5M2.2.7v6.7M1 7.4h2.5','M.7.7v5.1q0 1.6 1.5 1.6h.5q1.5 0 1.5-1.6V.7',
    'M.5 7.4V.7L2.8 4 5 .7v6.7'];
  return glyphs.map((d,i)=>T(L(d,color,1.04),i*5.6,0)).join('');
}
function fieldDetail(id,t,detail) {
  const band=P('M76 116Q117 131 174 116L175 124Q123 139 75 124Z','#d3d8b7')+
    P('M75 122Q120 137 174 122v2q-45 13-99 2Z','#a5b69c');
  const plate=P('M91 141Q115 148 153 141v25q-28 8-62 0Z','#d6ccb0','stroke="#5a7866" stroke-width="1.3"')
    +L('M95 145q18 4 51 0m-50 17q19 4 49 .7','#bac1a0',.9)
    +T(engravedWord('#3e584e'),104,150)+E(95,149,1,1,'#667966')+E(149,147,1,1,'#667966')
    +L('M111 161h13m2 0h7','#657966',.9);
  const abrasion=detail?L('M84 178l3 2m-2 3 7 3m67-50 1-5m-15 59 5-2m-4 4 2-1','#b6bda2',1.1)
    +L('M91 197l4 1m52-22 6-1.5','#587e65',.8):'';
  const stamp=P('M138 182l10-1.4 7 7.2-9.8 1.7Z',t.skin[3])+L('M143 182l5 5m.2-5 4 4','#cfbe88',1.5);
  return band+plate+abrasion+stamp;
}
function glassDetail(id,t,detail) {
  const bg=P('M88 117Q125 108 164 116L165 193Q163 208 150 212Q119 220 99 208Q87 201 87 190Z','#386b68','fill-opacity=".60"');
  const liquid=P('M88 161Q118 157 163 157V191Q163 204 152 209Q121 220 98 207Q88 201 88 190Z',url(id,'liquid'))+
    E(125.5,159,37.5,5.6,'#badfb7')+L('M90 159q30 7 70 0','#d2ecc7',1.6);
  const guide=L('M122 111v95m6-96v97','#8ab8a3',2.2)+L('M123 115v89','#d1e2b4',.8);
  const float=G('sight-float',P('M111 147l7-4 16-1 5 4v10q-11 7-26 2Z',url(id,'copper'),'stroke="#6e7865" stroke-width="1.2"')+
    E(124.8,146.3,13.6,3.6,'#d9c699')+L('M114 154q11 3 23-.7','#f3dab2',1.4));
  const scale=L('M150 133v60','#d5e2c7',.8)+[0,1,2,3,4,5,6,7,8,9].map(i=>
    L('M'+(i%3===0?144:147)+' '+(135+i*6)+'h'+(i%3===0?6:3),'#e2e6c1',1)).join('');
  const cage=P('M77 110Q117 126 171 112v5Q122 131 76 116Z',url(id,'brass'))+
    P('M76 192Q111 211 174 193v6Q126 217 78 202Z',url(id,'brass'))+
    P('M76 117l7 3 1 78-7-4Z M160 120l7-2v78l-7 2Z',url(id,'brass'),'stroke="#728270" stroke-width=".8"')+
    L('M85 111Q91 96 106 91m45 11q9 2 16 10','#c4ddc0',2);
  const glint=L('M90 128q-.7 25 0 39m0 5v11','#d8f1d6',2.8)+L('M94 130v22','#e5f3dc',1);
  const stamp=detail?P('M92 183l12 1.3v7l-12-1.4Z','#4f7f72')+L('M95 186l4 .6m-1 2 2 .2','#ccdfc0',.9):'';
  return bg+liquid+guide+float+scale+glint+cage+stamp;
}
function repairDetail(id,t,detail) {
  const strap=P('M74 128Q114 145 176 129v15Q121 161 74 145Z',url(id,'web'),'stroke="#6c7055" stroke-width="1.1"')+
    L('M77 131q47 16 95 1m-94 10q47 15 95-1','#c8c5a0',1.2,'stroke-dasharray="3 2"')+
    P('M143 137l16-2v11l-16 2Z','none','stroke="#6b6b58" stroke-width="4.2"')+
    P('M143 136l16-2v11l-16 2Z','none','stroke="'+t.coat+'" stroke-width="1.6"')+
    L('M151 136v8','#d5bf88',1.4);
  const patch=P('M82 155l10 2.6 10 9.1-4 19-15-2.2-6-6.9Z',url(id,'steel'),'stroke="#614c42" stroke-width="1.2"')+
    L('M81 171l7 3 4-5 6 3','#5d645b',1.4)+[[84,161],[96,169],[94,181],[81,177]].map(([x,y])=>bolt(x,y,1.45,t.coat)).join('');
  const stamp=T(engravedWord('#e0c39b'),111,172)+L('M111 184l29-1.4m-29 3 18-.7','#d7b990',1);
  const tether=L('M90 68Q75 64 70 86Q65 110 72 119','#655348',2.2)+L('M90 68Q75 64 70 86Q65 110 72 119','#c7ae87',1.1,'stroke-dasharray="2.5 2"')+
    P('M71 118q2-2 4 .5l-1 6 2 3-2 6-4 1-2-2 2-6Z',url(id,'steel'),'stroke="#635f50" stroke-width=".9"');
  const dings=detail?L('M159 167l2-5m-7 35 4-1m-3 3 3-1m-43-43 4 .4m-28-49 4-1.5','#d8b697',1.1):'';
  return strap+patch+stamp+tether+dings;
}
function kilnDetail(id,t,detail) {
  const collar=P('M77 115Q112 130 171 116l1 5q-54 15-97 0Z','#78979d')+
    L('M78 119q48 16 94-.8','#f4f0d7',1.35);
  const copper=url(id,'copper');
  const jacket=L('M73 119q1 48 4 79q0 5 5 7m88-84q3 50-1 75q-.5 5-4 10',copper,4)+
    L('M77 200q40 20 91 .7',copper,4)+
    L('M81 128Q103 169 157 205M164 127Q146 167 93 206',copper,2.35);
  const mark=P('M109 152q5-7 9-13 9 16 3 19-5 4-10 .5-3-2-2-6Z','#617e89')+
    L('M119 147q1 7-4 8m-9 7q12 6 23-.7','#99acaa',1.1)+L('M108 165q8 4 16 1','#718e95',1.1);
  const linework=detail?L('M146 185l6 4m-7-1 5 3m-47-73q6-6 11-6','#b4bcb1',.9):'';
  const light=G('kiln-seam',L('M91 110q12-13 21-14m33 7 8 5','#fff0ba',2.2)+L('M166 125l3 6','#fff3c8',1.6),'opacity="0"');
  return collar+mark+jacket+linework+light;
}
function vapor(kind,t) {
  const leaking=kind==='field-repair',x=leaking?80:73,y=leaking?170:86;
  const curl=P('M0 0Q-6 .7-12-4Q-17-8-15-15Q-14-19-17-23Q-21-29-29-29Q-21-33-15-27Q-9-23-11-16Q-13-8-7-5Q-4-2 0 0Z',t.fume,'opacity=".76"')+
    L('M-5-1Q-19-5-19-13q1-5-3-7',t.fume,1.25);
  const thread=L('M-14-19Q-11-26-18-32q-5-4-10-2m-2 1q-3 2-2 5',t.fume,1.55);
  return T(G('nozzle-vapor',curl,'opacity="0"')+G('vapor-tail',thread,'opacity="0"'),x,y);
}
const scenes={'field-enamel':fieldDetail,'sight-glass':glassDetail,'field-repair':repairDetail,'kiln-white':kilnDetail};
function regulator(id,t){
  const metal=url(id,t.hardware);
  const sleeve=P('M114 78l18 1-.6 10.3-18.5-1.1Z',metal,'stroke="'+t.ink+'" stroke-width="1"')
    +P('M117 80l12 .7-.4 5.8-12.1-.6Z',t.shadow);
  return sleeve+G('regulator-piston',P('M117.5 82l10.8.5-.3 3-11-.6Z',t.coat)
    +L('M119 82.8l7.7.4',t.accent,1.15))
    +L('M115 87l15 .9',t.ink,1);
}
function draw(id,kind,variant,finish=true) {
  const t=field[kind],detail=variant!=='card';
  const collar=P('M106 75q15 4 34-1v4q-18 5-34 1Z',url(id,t.hardware));
  const construction=frame(id,t,kind)+foot(id,t,kind)+core(id,t,kind,detail)+scenes[kind](id,t,detail)
    +collar+wheel(id,t,kind)+gauge(id,t,kind,detail)+(finish?regulator(id,t):'')+vapor(kind,t);
  return defs(id,t)+'<g transform="translate(-10 -14) scale(1.08)">'+construction+'</g>';
}
function mark(kind,t) {
  const fill=t.skin[2],outline=t.ink;
  const bulb=P('M10.1 6.9v1.4Q6.7 9 6.6 11.8v6.7q.1 2.6 2.6 3.2 3.2 1 6.4-.2 2.2-.7 2.2-3.3v-6.6q-.1-2.6-3.7-3.6V6.8Z',fill,`stroke="${outline}" stroke-width=".8"`);
  const boot=P('M7 19.8q5 1.8 10.5-.3v1.4Q12 23.5 7 21.5Z',t.rim)+L('M7.8 20q4.3 1.5 8.4.2',outline,.65);
  const knob=kind==='field-repair'?L('M5.9 4.7l4.9 1.1',t.tag,1.8):E(8.1,5,1.92,1.92,'none','stroke="'+t.tag+'" stroke-width="1.1"');
  const dial=E(16,5.4,2.5,2.5,t.rim)+E(16,5.4,1.9,1.9,kind==='kiln-white'?t.mark:t.face)+L('M16.2 5.6l-1.25-.7',kind==='kiln-white'?'#ffeec6':outline,.65);
  const accents={
    'field-enamel':P('M7.1 11.3q5.1 1.6 10-.3v.9q-5.4 1.6-10 .4Z M8.4 14.3q4 1.1 7.5-.2v2.1q-3.7 1.3-7.5.4Z',t.tag),
    'sight-glass':P('M8.1 11.3h7.8v7.6q-3.5 2.2-7.8 0Z','#9ac5a5')+L('M8.2 11.2v8.1m7.4-8.3v8',t.face,.9)+P('M10 15h3.8v2H10Z','#ab805d'),
    'field-repair':P('M6.9 12.7q5.4 1.6 10.5-.2v2.2q-6 1.3-10.5.1Z','#acaa7c')+P('M7.7 16.1l2.1.3 1 1.2-.8 1.7-2.5-.5Z','#b8b6a0'),
    'kiln-white':L('M7.8 12.5l7.6 7m.8-7.4-7.9 7.8','#be8e73',.85)+P('M10.4 15.5l1.5-1.6 1.2 1.8-.9 1Z',t.mark)
  };
  return bulb+accents[kind]+boot+L('M8.8 6.4 14 5.5m-2-.4.1 3m-1.4-1.4-4.2 2',outline,1.45)+knob+dial;
}
function layer(name,origin,frames) {return {name,origin,frames:[{at:0},...frames,{at:1}]};}
const movement={
 'field-enamel':[1680,-45,56,.35,'The brass handwheel cracks open. Pressure rises briefly on the dial, a thin curl escapes, and the valve seats.'],
 'sight-glass':[1810,-63,49,.43,'The valve opens and the float drops through the clear jacket. One pulse of vapor escapes before the float and needle settle.'],
 'field-repair':[1740,-23,42,.38,'The field-repaired wing knob tips up. A patched joint exhales while the gauge overshoots once and falls back.'],
 'kiln-white':[1830,-55,61,.43,'A copper handwheel meters a short plume. The cobalt gauge responds and light passes across the glazed shoulder.']
};
function motion(kind,finish=true) {
  const [duration,rotation,peak,beat]=movement[kind];
  const repair=kind==='field-repair';
  const knob=layer('wheel',[92,59],[{at:.12,rotate:3},{at:.29,rotate:rotation,y:repair?-2.7:0},{at:.54,rotate:rotation*.94,y:repair?-2.5:0},{at:.72,rotate:6},{at:.87,rotate:-2}]);
  const needle=layer('dial-needle',[161,60],[{at:.19,rotate:0},{at:beat,rotate:peak},{at:.49,rotate:peak-4},{at:.60,rotate:peak*.63},{at:.77,rotate:-4},{at:.92,rotate:1}]);
  // Both vapor layers live inside a translated outlet group; the origin is the
  // local nozzle, so scaling keeps emission attached to its physical source.
  const vent=layer('nozzle-vapor',[0,0],[{at:.20,opacity:0,scaleX:.30,scaleY:.35},
    {at:beat+.02,opacity:.78,scaleX:.94,scaleY:.96},{at:.58,opacity:.60,scaleX:1.12,scaleY:1.06},
    {at:.73,opacity:0,x:-3,y:-3,scaleX:1.22,scaleY:1.14},{at:.9,opacity:0}]);
  const tail=layer('vapor-tail',[0,0],[{at:.30,opacity:0,scaleX:.62,scaleY:.66},
    {at:.53,opacity:.62,scaleX:.95,scaleY:.98},{at:.75,opacity:0,x:-5,y:-6,scaleX:1.1,scaleY:1.1},{at:.9,opacity:0}]);
  const extras=[];
  if(kind==='sight-glass')extras.push(layer('sight-float',[124,148],[{at:.24,y:-1},{at:.5,y:9},{at:.69,y:3},{at:.84,y:-1.8}]));
  if(kind==='kiln-white')extras.push(layer('kiln-seam',[119,108],[{at:.34,opacity:0},{at:.51,opacity:.84},{at:.69,opacity:.42},{at:.84,opacity:0}]));
  if(finish)extras.push(layer('regulator-piston',[123,84],[{at:.17},{at:beat,y:-2.9},{at:.51,y:-1.2},{at:.66,y:.5},{at:.78,y:-.3}]));
  return {duration,layers:[knob,needle,vent,tail,...extras]};
}
function silhouette(kind) {
  const ink='#122026';
  const profiles={
    'field-enamel':L('M86 83Q64 90 65 106Q66 124 60 136Q51 151 59 162Q63 166 76 164',ink,6.3),
    'sight-glass':L('M69 205V120Q69 98 90 89L107 81M150 84Q181 94 183 116V201',ink,6.3),
    'field-repair':L('M82 130L63 122Q58 117 60 107L71 69Q74 58 84 57l19 1',ink,6.4),
    'kiln-white':L('M143 81Q175 81 185 100Q191 109 188 126L182 158Q181 167 174 170',ink,6.2)
  };
  const head=P('M110 78V56l15-7 23 5v20l-13 8Z M90 59l31-4 5 16-33 7-20 13-4-7 18-9Z',ink)+E(161,60,22,22,ink)
    +(kind==='field-repair'?P('M64 51l4-4 22 6 9 1 19 10-2 6-20-8-9 2-8-5-15-3Z',ink):E(92,59,17,17,ink));
  return '<g transform="translate(-10 -14) scale(1.08)">'+profiles[kind]+P(cylinder,ink)+
    P('M80 201q45 16 89-2v16q-4 8-18 11l-5 5q-5 4-10-2-19 2-34-1l-5 4q-5 2-8-3v-6q-9-4-9-12Z',ink)+head+'</g>';
}
const designEntries=[
  ['gift-tank-field-enamel','field-enamel'],['gift-tank-sight-glass','sight-glass'],
  ['gift-tank-field-repair','field-repair'],['gift-tank-kiln-white','kiln-white']
];
export const tankModels=Object.freeze(Object.fromEntries(designEntries.map(([id,kind])=>[id,{
  mini:mark(kind,field[kind]),body:(prefix,variant='detail',finish=true)=>draw(prefix,kind,variant,finish),historicalMotion:motion(kind,false),
  silhouette:silhouette(kind),
  motion:motion(kind),storyboard:movement[kind][4]
}])));
