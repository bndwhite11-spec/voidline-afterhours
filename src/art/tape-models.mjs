/**
 * Afterhours duplication room. A 200-unit compact cassette is drawn face-up,
 * with the head apertures along the near edge. Local hub coordinates are fixed
 * to the shell; the entire housing tips five degrees in the resting composition.
 */
export const tapeModels = {};

const d=(shape,fill,stroke='',w=1,more='')=>
  `<path d="${shape}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`:''}${more?' '+more:''}/>`;
const l=(shape,color,w=1)=>d(shape,'none',color,w);
const e=(cx,cy,rx,ry,fill,stroke='',w=1)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${w}"`:''}/>`;
const part=(name,content)=>`<g data-part="${name}">${content}</g>`;
const ref=(id,key)=>`url(#${id}-${key})`;
const gradient=(id,key,colors,vertical=false)=>`<linearGradient id="${id}-${key}" x1="0%" y1="0%" x2="${vertical?'12':'85'}%" y2="100%">${colors.map(([n,c])=>`<stop offset="${n}%" stop-color="${c}"/>`).join('')}</linearGradient>`;
const mouth='M37 64H209Q218 64 219 72L224 180Q225 188 215 191L32 191Q24 190 24 183L24 78Q24 67 37 64Z';
const lower='M24 175L223 170L229 179L229 188Q228 193 221 195L34 199Q25 198 23 190Z';
const windowShape='M102 110Q103 108 107 108H146Q151 108 152 112V125Q151 129 147 129H106Q102 129 102 126Z';
const labelA='M39 74Q39 72 44 72H199Q207 72 207 78L209 139Q209 146 202 146H44Q36 146 36 138L35 81Q35 76 39 74Z';
const clearA='M36 72Q37 69 43 69H202Q211 69 212 76L216 176Q217 183 209 185L37 185Q31 185 31 178L31 82Q31 74 36 72Z';
const metalA='M38 72L200 71L208 79L211 145L203 152H42L34 146L33 80Z';
const nightA='M37 75Q39 72 43 72H202Q208 73 209 78L211 137Q212 143 206 146H41Q35 144 35 139L34 83Q33 78 37 75Z';
const plate='M43 178L52 159Q53 155 59 155H189Q192 155 194 160L203 178L202 185H43Z';
const settings={
  graphite:{shell:['#68716d','#3a4442','#232c2b','#434b47'],edge:'#242c28',lip:'#9d9e87',label:'#dbcda2',bright:'#e8d7af',ink:'#394538',rule:'#ab624b',hub:['#e4d5ae','#a0987f','#685f53'],under:'#272c28',bottom:'#484b41'},
  clear:{shell:['#c4dfc4','#749b88','#3b776f','#598579'],edge:'#35574f',lip:'#def3d4',label:'#8ebaa1',bright:'#d1d9a0',ink:'#35554a',rule:'#c5a464',hub:['#e8c98c','#ad8256','#654b34'],under:'#24493e',bottom:'#688c79'},
  splice:{shell:['#c3ac76','#a88e63','#705f50','#967858'],edge:'#7c6047',lip:'#decca1',label:'#bb925d',bright:'#e8d0a0',ink:'#473f34',rule:'#a75547',hub:['#c5b79c','#99826b','#63564b'],under:'#433b30',bottom:'#8d765b'},
  metal:{shell:['#e7e4cc','#a5b1ac','#6a7d7e','#b6c1b8'],edge:'#52605c',lip:'#e2e8d3',label:'#aab4a9',bright:'#e2ded0',ink:'#424c4c',rule:'#9a6950',hub:['#6d7774','#455251','#2a3637'],under:'#313e3c',bottom:'#91a5a0'},
  press:{shell:['#987783','#674758','#412c43','#774a63'],edge:'#493744',lip:'#ba9f9d',label:'#423448',bright:'#f4d3a0',ink:'#ddd2c1',rule:'#b27a76',hub:['#b89b76','#6d6259','#342f34'],under:'#302c38',bottom:'#775767'}
};
// Lettering on a physical cassette is part of its face. These little originals
// use fixed paths so the paper and foil inscriptions are reproducible offline.
const alphabet={
 A:'M0 7 2.6 0H3.6L6.2 7M1 4.5H5',B:'M0 0H3.4Q5.4 0 5.4 1.7Q5.4 3.3 3.2 3.4H0M3.2 3.4Q5.9 3.5 5.9 5.1Q5.9 7 3.6 7H0V0',C:'M5.5 1.3Q4.6 0 2.9 0Q0 0 0 3.6Q0 7 3 7Q4.5 7 5.6 5.8',D:'M0 0H2.2Q5.9 0 5.9 3.4Q5.9 7 2.5 7H0Z',E:'M5.2 0H0V7H5.3M0 3.4H4.1',F:'M0 7V0H5.3M0 3.4H4.1',G:'M5.7 1.2Q4.7 0 2.8 0Q0 0 0 3.5Q0 7 3 7Q4.8 7 5.6 6.1V3.8H3.1',H:'M0 0V7M5.5 0V7M0 3.5H5.5',I:'M2.5 0V7',K:'M0 0V7M5.5 0 0 4 5.8 7',L:'M0 0V7H5',M:'M0 7V0L3 4 6 0V7',N:'M0 7V0L5.5 7V0',O:'M2.8 0Q5.8 0 5.8 3.5Q5.8 7 2.8 7Q0 7 0 3.5Q0 0 2.8 0Z',P:'M0 7V0H3.1Q5.6 0 5.6 2Q5.6 4 3.1 4H0',R:'M0 7V0H3.1Q5.6 0 5.6 2Q5.6 4 3.1 4H0M3 4 5.8 7',S:'M5.5 .8Q3-.7 1.4.5Q-.2 1.4 1 2.8Q1.5 3.4 3.4 3.7Q6.1 4.2 5.5 5.8Q4.8 7.9.4 6.3',T:'M0 0H6M3 0V7',U:'M0 0V4Q0 7 2.8 7Q5.5 7 5.5 4V0',V:'M0 0 3 7 6 0',W:'M0 0 1.4 7 3.5 3 5.5 7 7 0',Y:'M0 0 2.9 3.65 5.8 0M2.9 3.65V7',0:'M2.7 0Q5.4 0 5.4 3.6Q5.4 7 2.7 7Q0 7 0 3.5Q0 0 2.7 0Z',1:'M1 .9 3 0V7',2:'M0 1.3Q1 0 3 0Q6 0 5.1 2.6L.1 7H5.6',3:'M.1.8Q1.5 0 3.2 0Q5.5.1 5.4 1.5Q5.4 3.2 3 3.5Q5.8 3.6 5.8 5.4Q5.3 7.9 0 6.4',4:'M4.5 7V0L0 4.7H6',5:'M5.5 0H1L.5 3.1Q6 2 5.6 5.2Q5.3 7.8 0 6.4',6:'M5.1 .3Q1-.8.2 3.2Q-.7 7 2.8 7Q5.6 7 5.6 4.9Q5.4 2.7 2.6 3Q1.2 3 .2 4',7:'M0 0H5.9L1.7 7',8:'M2.7 0Q5.7 0 5.4 1.8Q5.4 3 2.7 3.5Q0 3 .1 1.8Q0 0 2.7 0ZM2.7 3.5Q5.6 3.8 5.6 5.5Q5.4 7 2.7 7Q0 7 0 5.5Q0 3.9 2.7 3.5Z',9:'M.5 6.8Q4.6 7.7 5.3 3.4Q6 0 2.6 0Q0 0 0 2.2Q.3 4.1 2.8 4Q4.4 3.9 5.4 3','/':'M.5 7 5.8 0','-':'M.5 3.7H4.7'
};
function type(x,y,word,size,color,weight=1.15){
  let offset=0;let chars='';for(const ch of word){
    if(alphabet[ch])chars+=`<g transform="translate(${offset} 0)">${l(alphabet[ch],color,weight)}</g>`;
    offset+=ch===' '?4.4:7.5;
  }
  return `<g transform="translate(${x} ${y}) scale(${size})">${chars}</g>`;
}
function resources(id,v){
  const a=settings[v],color=a.shell;
  const label=v==='metal'?metalA:v==='press'?nightA:labelA;
  return `<defs>${gradient(id,'shell',[[0,color[0]],[32,color[1]],[74,color[2]],[100,color[3]]],true)}${gradient(id,'machine',[[0,'#eff0d8'],[21,'#afbdb5'],[51,'#839492'],[71,'#bbc8bf'],[100,'#708582']])}${gradient(id,'binder',[[0,'#fff0bb'],[30,'#decaa6'],[80,'#d7c095'],[100,'#b5a178']])}${gradient(id,'jade',[[0,'#e1ebc5'],[34,'#9fc6a5'],[67,'#4b8776'],[100,'#95b49b']])}${gradient(id,'oxide',[[0,'#a37d57'],[39,'#785643'],[70,'#503c31'],[100,'#966b49']])}${gradient(id,'hub',[[0,a.hub[0]],[35,a.hub[1]],[79,a.hub[2]],[100,a.hub[1]]])}${gradient(id,'foil',[[0,'#f9ddab'],[32,'#d8a57a'],[63,'#bd8c78'],[85,'#e5c69e'],[100,'#af987f']])}
  <clipPath id="${id}-label-cut">${d(label,'#fff')}</clipPath><clipPath id="${id}-window">${d(windowShape,'#fff')}</clipPath><clipPath id="${id}-plate-cut">${d(metalA,'#fff')}</clipPath></defs>`;
}
function outer(p,v) {
  const a=settings[v];
  const side=d(lower,a.edge,'#333832',1.35)
    +d('M22 178L25 75L31 68L34 68L33 181L29 192L26 191Z',a.shell[1],a.edge,1)
    +d('M32 188L216 182L224 172L229 178L227 191Q226 195 217 195L34 198Q29 197 28 194Z',a.shell[2],a.edge,1.2)
    +l('M32 194Q91 195 215 191Q222 190 225 185',a.lip,.95);
  let housing=d(mouth,ref(p,'shell'),a.edge,1.9)
    +l('M27 168V80Q26 68 38 67H205',a.lip,1.45)
    +l('M25 179Q27 187 34 188L215 187Q221 186 222 177',a.shell[1],1.6);
  if(v==='clear')housing+=d(clearA,'#54766a',a.lip,1.1);
  if(v==='splice')housing+=d('M169 66L204 65Q214 65 215 73L216 98L211 95L209 84L202 81L204 74L188 73L184 69Z','#b29773')
   +l('M173 68l8 2m7 2 10 1m8 5 2 6M216 110l-1 5m-182 29 2-9m5 43 3-1','#cfb98e',1.2);
  return side+housing;
}
function reel(p,v,cx,name,details) {
  const cy=117,a=settings[v],radius=v==='clear'?(name==='supply'?31:24):23;
  let pack=e(cx,cy,radius,radius,ref(p,'oxide'),'#4a4133',1.35);
  // Winding is visible through translucent constructions and through the central
  // inspection slot on paper-shell models. The stock line is concentric with its hub.
  for(let r=13;r<radius;r+=3.45)pack+=e(cx,cy,r,r,'none',r%2<1?'#bc966c':'#544839',.85);
  return pack+(details?l(`M${cx-radius+3} ${cy-5}q2-9 9-14`,'#bf956e',.9):'');
}
function starHole(cx,cy,outer=8,inner=5.3) {
  // Open perforated spindle with six keyed notches.
  const points=[];
  for(let i=0;i<6;i++)for(const [angle,r] of [[-19,outer],[-6,outer],[1,inner],[25,inner]]){
    const theta=(i*60+angle-90)*Math.PI/180;points.push([(cx+Math.cos(theta)*r).toFixed(2),(cy+Math.sin(theta)*r).toFixed(2)]);
  }
  return 'M'+points.map(a=>a.join(' ')).join('L')+'Z';
}
function hub(p,v,x,id,details) {
  const a=settings[v],y=117;
  let rotor=e(x,y,14.8,14.8,ref(p,'hub'),a.hub[2],1.15)
    +e(x,y,13.2,13.2,'none',a.hub[0],.9)
    +d(starHole(x,y,8.15,5.65),a.under,a.hub[0],.9);
  for(let i=0;i<6;i++)rotor+=`<g transform="rotate(${i*60+13} ${x} ${y})">${d(`M${x-2.9} ${y-11.2}Q${x} ${y-13.4} ${x+2.8} ${y-11.2}L${x+1.6} ${y-9.2}H${x-1.6}Z`,v==='metal'?'#aab7aa':a.hub[2])}</g>`;
  rotor+=d(`M${x-1.6} ${y-14.1}H${x+1.4}L${x+1} ${y-11.9}H${x-1.1}Z`,v==='press'?'#f3cc94':v==='clear'?'#864e3e':v==='metal'?'#dbae8d':'#a05743');
  if(v==='press'&&id==='takeup')rotor+=l(`M${x+8} ${y-11}q6 4 5 11m-3-2 h5m-2.5-2.5v5`,'#f8d7a3',.8);
  return e(x,y,18,18,a.under,a.edge,1.3)+e(x,y,16,16,a.hub[1])+part(id+'-hub',rotor)
   +(details?l(`M${x-16} ${y-3}q.4-8.5 7.5-11.4`,a.bright,.7):'');
}
function headPlate(p,v,details) {
  const a=settings[v];let result=d(plate,a.bottom,a.edge,1.35)+l('M46 175L54 160Q56 157 62 157H187Q191 158 193 163',a.lip,1.2)
   +d('M64 173L70 166H78L81 173V182H64ZM103 177L106 167H141L144 176V182H103ZM172 173L176 166H184L186 173V181H172Z',a.under,a.edge,1.05)
   +d('M105 179L108 173H138L141 178Z','#a99576')
   +l('M68 180h10m31 1h30m35-1h8',a.lip,1);
  for(const x of [53,195])result+=e(x,177,3.15,3,a.under,a.lip,.85);
  if(details)result+=l('M68 162h16m71 0h21M85 171h9m61 0h7',a.lip,.95);
  return result;
}

function scaleMarks(color){
  let marks='';for(let i=0;i<11;i++)marks+=l(`M${103+i*4.8} 132v${i%5===0?3:1.7}`,color,.65);
  return marks;
}
function paperLabel(p,v,details) {
  const a=settings[v],ink=a.ink;
  let face=d(labelA,ref(p,'binder'),'#a79a7d',1)
    +l('M36 94H208',ink,.9)+d('M36 96H208V99H36Z','#a76b59')
    +l('M37 137H209',ink,.9)+d('M38 138H205V140H38Z','#ba8065')
    +type(44,78,'AFTERHOURS',.91,ink,1.25)+type(156,80,'C-60',1.1,ink,1.35)
    +d('M188 78h12v12h-12Z',ink)+type(191,80,'A',.85,a.bright,1.28)
    +scaleMarks(ink);
  if(details)face+=type(47,101,'NR',.52,ink)+type(174,101,'01',.48,ink)+l('M47 91h74m6 0h7m21 0h29','#a58a6a',.75);
  return face;
}
function clearFrame(p,details) {
  const a=settings.clear;
  let shape=d('M33 85Q34 73 42 72H204L211 78L213 154L203 155L196 146V88H49L44 140L36 149Z',ref(p,'jade'),a.edge,1.3)
    +d('M33 77L43 70H203L211 77L207 82H38Z','#a5c3a7',a.edge,.95)
    +l('M41 84H196M40 86L36 139M201 87l2 54','#bddec2',1.1)
    +d('M39 150L55 139Q72 130 91 140L109 148H147L163 138Q183 128 204 147L207 154L187 160H60Z','#80a791',a.edge,1.3)
    +l('M45 151Q69 128 92 144L106 151H149M164 143q18-10 32 3','#bed8b9',1.15)
    +type(46,75,'CLEAR LEADER',.73,'#2e5146',1.25)
    +type(163,75,'A / 60',.65,'#365b50',1.3);
  if(details)shape+=d('M53 89H67L86 106L76 110Z','#a5cbb6','','', 'opacity=".26"')+d('M129 87H142L177 131H171Z','#b8d9c3', '',1,'opacity=".2"')+l('M104 136h46','#a9c6a7',.85);
  return shape;
}
function repairLabel(p,details) {
  const a=settings.splice;
  let shape=d('M39 75L49 72L57 74L71 71L95 73L120 72L166 73L177 76L200 73L205 78L204 103L208 123L205 139L197 146L170 142L147 145L121 143L105 146L73 142L48 144L36 138L38 126L34 110L36 94Z','#c6a775','#927456',1.05)
    +l('M37 94L90 94M102 94H201M41 137L88 138M117 139L198 138','#876c50',.9)
    +type(47,80,'SERVICE COPY',.91,a.ink,1.2)+type(188,82,'02',.76,'#8b453b',1.65)
    +d('M39 102L53 95L83 140L70 145L68 144L65 147Z','#d6c9a6','#998c70',.9)
    +l('M42 103L68 141M47 101L74 142','#e5d9b5',1)
    +d('M140 76L166 70L172 68L178 70L186 67L190 71L164 90Z','#8a735b','#675647',.85)
    +d('M145 76L150 74L170 86L164 88Z','#ad9470')
    +scaleMarks(a.ink);
  if(details)shape+=l('M43 131l11-2m-11 5 17-4m32 9 9-1m78-58 8-3m-2 3 9-2','#856b50',.9)
    +type(149,94,'SPLICE',.57,'#88483a',1.55)
    +l('M171 100q10 5 15 6m-2-3 3 3-4 1','#934c3e',1.2)
    +l('M40 150l14 .7m-12 1.7 9 .3m150-3 12-1','#6b5343',1.1);
  return shape;
}
function machineLabel(p,details) {
  const a=settings.metal;
  let face=d(metalA,ref(p,'machine'),a.edge,1.3)
    +d('M37 77L44 73H199L205 80H97L93 85H37Z','#c8cdc1')
    +d('M36 98H205V103H37Z','#455454')
    +d('M38 140H207L203 147H42L38 144Z','#657571')
    +type(45,85,'STEREO',.85,a.ink,1.35)
    +type(151,82,'A / 90',1.18,a.ink,1.65)
    +scaleMarks(a.ink);
  if(details){
    let brush='';for(let i=0;i<35;i++){
      const y=(76+i*2.03).toFixed(1), x=38+(i*17)%35, len=21+(i*11)%55;
      brush+=l(`M${x} ${y}h${len}m${36+i%15} 0h${12+i%13}`,i%4===0?'#e1e3cc':'#8b9b91',.48);
    }
    face+=`<g clip-path="${ref(p,'plate-cut')}" opacity=".48">${brush}</g>`+type(95,85,'METAL',.61,a.ink,1.3);
  }
  return face+`<g clip-path="${ref(p,'plate-cut')}"><g data-part="reflection" opacity="0">${d('M69 65L75 65L147 155L138 156Z','#f6f3dc')+d('M80 65L82 65L155 155L153 155Z','#ffffe8')}</g></g>`;
}
function printLabel(p,details) {
  const a=settings.press, foil=ref(p,'foil');
  let lines='';
  // The printed horizon is stationary. The registration cross on the right hub
  // is applied to the actual platter, so only that foil fragment advances.
  for(let i=0;i<9;i++)lines+=l(`M33 ${137-i*2.7}Q62 ${147-i*2.5} 86 ${132-i*2.65}T143 ${118-i*2.6}T212 ${104-i*2.55}`,i%4===0?'#d99b80':'#b9787b',i%3===0?1.4:.75);
  return d(nightA,a.label,'#a28382',1.05)
    +`<g clip-path="${ref(p,'label-cut')}">${e(166,92,15.8,15.8,foil)+d('M146 86Q154 73 170 76Q153 78 153 94Q154 103 161 108Q144 102 146 86Z','#9e717e')+lines}</g>`
    +d('M39 77H124L119 87H37Z','#665164')
    +type(44,77,'NIGHT PRESS',.89,'#f0d3af',1.15)
    +type(43,92,'SIDE A',.57,'#c6b4af')
    +l('M38 139H207M38 142H205',foil,.95)
    +(details?type(149,134,'AFTERHOURS',.47,'#ead2b3',1.14)+l('M47 97h17M196 81v6m-3-3h6',foil,1):'');
}
function slot(p,v){
  const a=settings[v];
  let contents=d('M100 107H154V131H100Z',a.under)
    +d('M95 106H112Q119 116 114 131H99ZM144 108H156V129H143Q139 122 144 108Z',ref(p,'oxide'))
    +l('M112 107q9 12 1 25m32-26q-6 12-1 23','#b28e69',1.05)
    +l('M102 122Q129 118 152 115','#654c39',3.15)+l('M102 120.8Q128 117.5 152 114.1','#b38a66',.9);
  if(v==='splice')contents+=part('splice',d('M109 118.7l7-.6 2.2 3.1-7.1.8Z','#e0bc85','#805e45',.55)+l('M111 118.5l2.7 3.2','#9b463d',1.2));
  if(v==='graphite')contents+=part('witness',d('M102 120.8l3-.6 1.6 2.6-3.3.5Z','#d9bb86'));
  return d(windowShape,a.under,a.edge,2.2)+`<g clip-path="${ref(p,'window')}">${contents}</g>`+l('M106 129h42q3-.4 3.6-3','#ddd6bd',.9);
}
function clearInterior(p,detail){
  const metal=ref(p,'machine');
  let mechanism=d('M35 82L42 74H200L210 82L213 171L202 181H44L34 170Z','#355f55')
    +l('M42 80H197M36 86l3 80 10 9M205 84l3 75','#82a38d',1.2)
    +d('M36 94L45 91L56 103L45 119L34 125ZM194 90L204 93L210 109L207 123L194 107Z','#688876')
    +l('M53 101Q45 111 42 139L38 159Q37 166 44 170H198Q209 169 208 160L205 139Q203 118 192 107','#1e352f',3.4)
    +l('M52 103Q44 116 42 143L40 159Q38 165 45 167H197Q206 166 206 159L204 137Q201 117 192 109','#c6a47d',1.1);
  for(const [x,y,r] of [[41,161,4.5],[205,161,4.5],[50,151,2.7],[195,148,2.7]])mechanism+=e(x,y,r,r,metal)+e(x,y,r*.31,r*.31,'#654f3c');
  // Top-center tape path remains visible when the cosmetic clear bridge overlaps
  // the bottom head housing. The amber splicing marker travels along it.
  mechanism+=l('M91 92Q122 82 161 96','#b39366',1.1);
  if(detail)mechanism+=l('M38 89l7-6h11m142 4 4 4M57 165h15m101 0h12','#a3b499',.8);
  return mechanism;
}
function screw(x,y,v,angle){
  const a=settings[v],r=v==='metal'?4.3:3.35;
  return e(x,y,r+1,r+1,a.edge)+e(x,y,r,r,a.hub[1])+e(x-.3,y-.5,r-.8,r-.8,a.lip)
   +`<g transform="rotate(${angle} ${x} ${y})">${l(`M${x-r*.56} ${y}h${r*1.12}M${x} ${y-r*.56}v${r*1.12}`,a.edge,.9)}</g>`;
}
function shadow(v) {
  return `<g opacity=".29">${e(131,196,94,5.7,'#1f2324')+e(135,195,68,3.8,'#151a1c')}</g>`;
}
function face(p,v,variant){
  const a=settings[v],detail=variant!=='card',isClear=v==='clear';
  let shell=outer(p,v);
  if(isClear)shell+=clearInterior(p,detail)+reel(p,v,79,'supply',detail)+reel(p,v,171,'takeup',detail)+clearFrame(p,detail);
  else shell+=(v==='graphite'?paperLabel(p,v,detail):v==='splice'?repairLabel(p,detail):v==='metal'?machineLabel(p,detail):printLabel(p,detail))+slot(p,v);
  shell+=headPlate(p,v,detail);
  if(isClear){
    // The clear head shield has a cut-in guide exposing the amber leader at y=166.
    shell+=d('M92 162H155L153 169H91Z','#486e5d',a.edge,1.1)+l('M94 166h58','#b99c73',2.15)
      +part('leader-window',d('M102 164.4l8.8.2 1.8 2.7h-8.9Z','#ebce83','#806846',.65)+l('M104 165l1.5 1.9','#b56d47',.85));
  }
  shell+=hub(p,v,79,'supply',detail)+hub(p,v,171,'takeup',detail);
  if(v==='metal')shell+=d('M49 150H79L82 153H47Z','#48575a')+d('M166 150H196L198 153H163Z','#526263');
  for(const [x,y,r] of [[31,74,10],[211,73,42],[33,181,35],[216,181,65],[125,151,25]])shell+=screw(x,y,v,r);
  return resources(p,v)+shadow(v)+`<g transform="rotate(-5 128 128)">${shell}</g>`;
}

function miniature(v){
  const a=settings[v],clear=v==='clear';
  let shell=d('M2.3 6.1L20.2 4.6Q21.3 4.5 21.6 5.9L22.5 16.5L22 17.8L3.3 19.4L1.5 18.5L.9 7.4Z',a.shell[1],a.edge,.89)
    +d('M1.7 16.7l1.5 1.1 18.9-1.6.25 1.45-18.9 1.65-1.7-1Z',a.shell[2]);
  const tinted=v==='metal'?'#c8cfc0':v==='splice'?'#d3b583':v==='press'?'#3d3246':clear?'#527968':a.label;
  shell+=d('M2.6 7.1L20.4 5.6L21 13.1L3.1 14.8Z',tinted,a.edge,.6);
  if(v==='graphite')shell+=l('M3.3 8.8l16.2-1.3',a.rule,.9);
  if(v==='metal')shell+=l('M3.4 8.7L19.8 7.3','#62716a',1)+l('M5.5 15.9l3.5-.3m6.4-.6 3.1-.3','#d9dfcf',.95);
  if(v==='splice')shell+=d('M3.6 8.3L5.1 7.5L9.2 14L7.2 14.5Z','#e9dbb7')+l('M15.5 8.2l3-1.2','#96574a',1);
  if(v==='press')shell+=e(16.9,7.9,2,2,'#d7b389')+l('M3.4 13.4q4-1.1 6.2-1.1t5.5-1.8t5.3-.9','#c18c87',.86);
  if(clear)shell+=e(6.8,10.8,3.7,3.7,'#766747')+e(15.9,10,2.9,2.9,'#927852')+l('M7 7.2l10.8-.9M3.1 14.5q.5 2.2 2.1 2l14.2-1.1','#c0d4ac',.7);
  for(const [x,y] of [[6.7,11],[16,10.15]])shell+=e(x,y,1.7,1.7,a.hub[0],a.edge,.55)+e(x,y,.78,.8,a.under);
  return shell+d('M10 10.35l3.1-.29.15 1.2-3.2.29Z',v==='clear'?'#d5bd84':a.under)
   +l('M5.6 16.3l1.1-1.25 10.8-.9 1.1 1','#9a9d83',.8)
   +e(2.4,7,.4,.4,a.bright)+e(20.2,6,.4,.4,a.bright)+e(21,15,.4,.4,a.bright);
}
const layer=(name,origin,frames)=>({name,origin,frames:[{at:0},...frames,{at:1}]});
const supply=[79,117],takeup=[171,117];
const rigs={
 graphite:{duration:1580,layers:[
   layer('supply-hub',supply,[{at:.15,rotate:-3},{at:.40,rotate:18},{at:.64,rotate:34},{at:.76,rotate:28}]),
   layer('takeup-hub',takeup,[{at:.15,rotate:-5},{at:.40,rotate:33},{at:.64,rotate:61},{at:.76,rotate:51}]),
   layer('witness',[104,122],[{at:.14,x:0},{at:.4,x:14,y:-1.4},{at:.65,x:23,y:-2.3},{at:.76,x:20,y:-2}])]},
 clear:{duration:1670,layers:[
   layer('supply-hub',supply,[{at:.16,rotate:1},{at:.46,rotate:23},{at:.60,rotate:44},{at:.82,rotate:18}]),
   layer('takeup-hub',takeup,[{at:.16,rotate:2},{at:.46,rotate:41},{at:.60,rotate:68},{at:.82,rotate:32}]),
   layer('leader-window',[110,166],[{at:.16,x:0},{at:.46,x:18},{at:.60,x:32},{at:.82,x:10}])]},
 splice:{duration:1720,layers:[
   layer('supply-hub',supply,[{at:.13,rotate:-2},{at:.34,rotate:19},{at:.44,rotate:20},{at:.57,rotate:46},{at:.74,rotate:31}]),
   layer('takeup-hub',takeup,[{at:.13,rotate:-3},{at:.34,rotate:32},{at:.44,rotate:33},{at:.57,rotate:67},{at:.74,rotate:46}]),
   layer('splice',[114,120],[{at:.13,x:0},{at:.34,x:11,y:-1.1},{at:.44,x:12,y:-1.25},{at:.57,x:27,y:-2.7},{at:.75,x:16,y:-1.6}])]},
 metal:{duration:1480,layers:[
   layer('supply-hub',supply,[{at:.15,rotate:0},{at:.46,rotate:24},{at:.62,rotate:30},{at:.80,rotate:16}]),
   layer('takeup-hub',takeup,[{at:.15,rotate:0},{at:.46,rotate:41},{at:.62,rotate:53},{at:.80,rotate:29}]),
   layer('reflection',[125,110],[{at:.14,x:-51,opacity:0},{at:.30,x:-23,opacity:.31},{at:.48,x:13,opacity:.40},{at:.65,x:51,opacity:0},{at:.8,x:55,opacity:0}])]},
 press:{duration:1740,layers:[
   layer('supply-hub',supply,[{at:.12,rotate:-2},{at:.35,rotate:24},{at:.57,rotate:47},{at:.72,rotate:37},{at:.88,rotate:10}]),
   layer('takeup-hub',takeup,[{at:.12,rotate:-4},{at:.35,rotate:43},{at:.57,rotate:82},{at:.72,rotate:65},{at:.88,rotate:17}])]}
};
const specs=[
 ['graphite','gift-tape-graphite-session','Matte ABS, cream label stock and oxide-coated polyester tape.','Graphite cassette with a red-rule cream label, ivory notched reels and a central tape window.','Rock the reels forward to check the stock. The small witness mark advances with the oxide before the cue returns.'],
 ['clear','gift-tape-clear-leader','Transparent smoke-jade shell, amber leader and brass-toned hubs.','See-through jade tape with two exposed brown tape packs, guide pins and a moving amber leader.','The exposed hubs turn at different rates while an amber splice passes the clear front guide.'],
 ['splice','gift-tape-splice-repair','Worn ochre ABS, folded repair tape and a hand-marked edit splice.','Ochre cassette with a cream diagonal repair, worn label edge and a marked splice visible between the hubs.','The marked edit advances, hesitates at the inspection slot and runs free as both reels turn together.'],
 ['metal','gift-tape-brushed-deck','Brushed aluminum plate, recessed countersunk screws and machined dark hubs.','A cool silver cassette with dark hubs, a stepped aluminum plate and visible head apertures.','Both black hubs advance precisely while a thin band of light moves across the brushed aluminum plate.'],
 ['press','gift-tape-night-press','Mulberry shell, two-color screen print and warm registration foil.','A plum cassette printed with a gold moon and thin wavy horizons; the right hub carries a foil registration cross.','The screen-printed moon stays still while a small foil registration cross advances with the winding hub.']
];
for(const [variant,id,material,alt,storyboard] of specs){
  tapeModels[id]={material,alt,storyboard,mini:miniature(variant),body:(p,size)=>face(p,variant,size),
    silhouette:`<g transform="rotate(-5 128 128)">${d('M35 63H210Q219 63 222 72L229 183Q231 194 218 196L34 199Q24 198 22 190L22 76Q23 65 35 63Z','#10171b')}</g>`,motion:rigs[variant]};
}
