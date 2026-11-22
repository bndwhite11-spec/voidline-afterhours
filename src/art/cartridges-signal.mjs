// Both refills use the broadside proportions and left-facing coupling of the
// original Copium Cartridge. Moving mechanisms stay in barrel-local coordinates.
const path = (d, fill, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const line = (d, color, width, attrs = '') => path(d, 'none',
  `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${attrs}`);
const ellipse = (cx, cy, rx, ry, fill, attrs = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${attrs}/>`;
const part = (name, content) => `<g data-part="${name}">${content}</g>`;
const gradient = (id, colors) =>
  `<linearGradient id="${id}" x1="0%" x2="0%" y1="0%" y2="100%">` +
  colors.map(([position, color]) => `<stop offset="${position}%" stop-color="${color}"/>`).join('') + '</linearGradient>';
const paint = (prefix,key) => `url(#${prefix}-${key})`;
const clip = (name, origin, frames) => ({name,origin,frames:[{at:0},...frames,{at:1}]});
const tilted = content => '<g transform="rotate(-17 128 144)">'+content+'</g>';
const shell = 'M49 110H204Q220 110 222 138Q224 168 208 176H49Z';
const leftCap = 'M45 109H58C69 116 71 164 59 177H45C34 173 27 159 27 143S34 112 45 109Z';
const rightCap = 'M191 108H203C217 109 226 125 226 142C226 161 219 175 205 178H191C203 165 204 121 191 108Z';
const tube = 'M46 111V95C46 87 39 84 38 75C37 68 41 62 49 59L58 57';

function finishes(prefix) {
  return '<defs>' +
    gradient(prefix+'-nickel', [[0,'#edf2df'],[11,'#a4b2ad'],[26,'#ced4cc'],[44,'#929e9f'],[62,'#687579'],[77,'#99a5a0'],[92,'#485860'],[100,'#8d9590']]) +
    gradient(prefix+'-dusk', [[0,'#ddd6e6'],[15,'#a399b7'],[28,'#c4b7d0'],[48,'#867594'],[72,'#706778'],[89,'#4d455b'],[100,'#a69aad']]) +
    gradient(prefix+'-brass', [[0,'#efdcb0'],[15,'#d2b07b'],[33,'#edc994'],[58,'#ad855b'],[78,'#9c754d'],[92,'#705743'],[100,'#d1ae78']]) +
    gradient(prefix+'-violet', [[0,'#403d59'],[8,'#c9b6de'],[18,'#b6a0cd'],[30,'#9380b3'],[43,'#68567e'],[66,'#6b5686'],[82,'#8c77aa'],[94,'#55485f'],[100,'#414356']]) +
    gradient(prefix+'-iron', [[0,'#b6b8a8'],[9,'#878c84'],[23,'#777d79'],[40,'#575d5b'],[62,'#444849'],[82,'#3d4345'],[90,'#5b6261'],[100,'#31393f']]) +
    gradient(prefix+'-black', [[0,'#71777a'],[22,'#434b4d'],[55,'#30373c'],[79,'#252d32'],[100,'#51595b']]) +
    gradient(prefix+'-red', [[0,'#ff9c75'],[24,'#ed674d'],[48,'#d74e39'],[76,'#ae352b'],[100,'#773029']]) +
    gradient(prefix+'-amber', [[0,'#ffdfa0'],[22,'#efd07a'],[58,'#bf8e4c'],[82,'#956c40'],[100,'#eac787']]) +
    '</defs>';
}

function caps(prefix, music) {
  const bright = paint(prefix,music?'dusk':'nickel'), disk=music?'#675b79':'#545c5d';
  const ridges = ['M210 114l5 2','M215 120l5 2','M218 127l5 1.5','M220 135l5 .5',
    'M220 143h5','M219 151l5-.5','M217 159l5-.9','M213 167l5-1.7','M207 174l4-1.6'].join('');
  return path(rightCap,bright,'stroke="#38424b" stroke-width="1.7"') +
    line('M194 111c12 13 13 48 1 62',music?'#efd8f1':'#e4e5cd',1.85) +
    line('M203 111c14 9 20 45 4 63',disk,1.4) + line(ridges,disk,1.25) +
    path(leftCap,bright,'stroke="#40454e" stroke-width="1.8"') +
    ellipse(45,143,16.7,32, disk,'stroke="'+(music?'#d6c4d9':'#cdd3c2')+'" stroke-width="1.5"') +
    ellipse(44,143,12,25.6,paint(prefix,'black'),'stroke="'+(music?'#95899d':'#909d95')+'" stroke-width="1.15"') +
    ellipse(43,143,7.4,17.3,bright) + ellipse(42.5,143,4.3,11.9,'#333643') +
    line('M40 140l4 6','#a9ada6',1.15) + line('M55 113c11 13 12 45 2.5 60',music?'#ecdeeb':'#e4e3cf',1.45) +
    line('M34.4 129l1.3-4.1m-1.6 31 1.5 4','#aca5af',1);
}

function valve(prefix, music) {
  const trim=paint(prefix,music?'dusk':'brass');
  const tubeColor = music?'#bcb8ca':'#a59e83';
  const stem = path('M47 89l10-.5 2 24-13 .2Z',paint(prefix,'nickel'),'stroke="#42494c" stroke-width="1.4"') +
    path('M44 105l15-.5 2 7.4-17 .4Z',trim,'stroke="#50515a" stroke-width="1.1"') +
    line('M48 101h8m-8 2h9','#6c7475',1);
  const hose = line(tube,'#3e4650',6.2)+line(tube,tubeColor,3.9)+
    line('M40 74q-.3-8 8-13',music?'#ece1f1':'#e3dec3',1.1)+
    path('M54 56l6-2 2 5.6-5.8 2Z',trim,'stroke="#576166" stroke-width="1"');
  const wheel = part('shutoff-wheel',
    ellipse(52.5,88.7,12.9,12.8,'none','stroke="#484954" stroke-width="4.8"')+
    ellipse(52,88,12.1,12.1,'none','stroke="'+trim+'" stroke-width="3.5"')+
    line('M52 76.5v23M41.2 84l21.6 8M42.2 94l19.6-13.1',music?'#baabc1':'#c6a679',2.05)+
    ellipse(52,88,4.05,4.05,trim,'stroke="#5e5961" stroke-width=".9"')+
    line('M50.5 87l3.1 2.2','#58555b',.9));
  return hose+stem+wheel;
}

function dial(prefix, cx, cy, music) {
  const radius=music?17:19, rim=paint(prefix,music?'brass':'nickel');
  const dark=music?'#524858':'#39434b', face=music?'#eadbbf':'#eee8cd';
  const ticks=Array.from({length:15},(_,i)=>{
    const angle=(-219+i*17)*Math.PI/180, inner=radius-(i%2===0?6.3:5.0), outer=radius-3.5;
    const loc = r => `${(cx+r*Math.cos(angle)).toFixed(2)} ${(cy+r*Math.sin(angle)).toFixed(2)}`;
    return 'M'+loc(inner)+'L'+loc(outer);
  }).join('');
  const mounting=ellipse(cx+.6,cy+2.2,radius+1.8,radius+1.3,'#333d43')+
    ellipse(cx,cy,radius+1,radius+.8,rim,'stroke="'+dark+'" stroke-width="1.3"')+
    ellipse(cx,cy,radius-2.2,radius-2.3,face,'stroke="#8e8e7e" stroke-width="1"');
  const redZone=line(`M${cx+6.6} ${cy-radius+5.3}q5.4 3.2 6.6 8.2`,music?'#aa8083':'#d07d5d',1.6);
  const hand=part('dial-needle',path(`M${cx-10.8} ${cy-5.4}L${cx+4.8} ${cy+1.4}l-.85 2.7Z`,music?'#85576d':'#b74a3c'));
  return mounting+redZone+line(ticks,dark,1)+hand+
    ellipse(cx,cy,2.15,2.15,'#505c5a','stroke="#cfc5a0" stroke-width=".8"')+
    line(`M${cx-4.4} ${cy+7}h8.8m-6.6 2.4h4.4`,music?'#a19a85':'#919586',.8)+
    line(`M${cx-radius+2} ${cy-4}q2-8 9-11`,'#fff3d4',1.1,'opacity=".77"');
}

function foilStamp(x,y,music) {
  const dark=music?'#514861':'#504739', light=music?'#dcd8d3':'#e2c18a';
  // The stepped edge and fine double rule are stamped into each cigar band.
  // Letterforms are drawn locally, so the foil does not depend on a font.
  const letters=music
    ? 'M1 0h2q1 0 1 1v3.4q0 1-1 1H1q-1 0-1-1V1q0-1 1-1Zm1.4 3.8 2.1 2.5 M6 0v4.3q0 1.2 1 1.2h1q1.1 0 1.1-1.2V0 M14.2 0H11v5.4h3.2M11 2.5h2.5 M16 0v4.2q0 1.2 1.2 1.2h.7q1.2 0 1.2-1.2V0 M24.3 0H21v5.4h3.4M21 2.5h2.5'
    : 'M3.5-.8v6.7h5 M10 5.9l2.4-6.7 2.6 6.7m-4.1-2.1h3.2 M23 .1q-1.3-1.2-3.1-.9-2.6.2-2.6 3.3 0 3.4 2.6 3.4h2.5V3.3h-2.2';
  return `<g transform="translate(${x} ${y})">`+
    path('M-4.5-3.8h32l1.4 2.2v9L27.5 9h-32L-6 7.1v-8.7Z',dark)+
    path('M-3.8-3h30.6l1.1 1.8v8l-1.2 1.4H-3.8l-1.2-1.5v-8.1Z',light)+
    line('M-3.3-1.8h29.2m-29.3 8.9h29.7',dark,.5)+line(letters,dark,music?.87:1.08)+'</g>';
}

function tongue(prefix,name,x,tip,y) {
  const tonguePath=`M${x} ${y-1.6}L${tip-9} ${y-1.4}l5-1.7 4.9.3q1.8 1.1.8 3.7l-10 2.1-3-1.3-${tip-x-13}-.3Z`;
  return part('reed-'+name,path(tonguePath,paint(prefix,'brass'),'stroke="#775d60" stroke-width=".75"') +
    line(`M${x+2} ${y-.6}h${tip-x-12}l7-1.6`,'#f6d9a7',.85));
}

function musicBarrel(prefix,detail) {
  const glass=paint(prefix,'violet');
  const body=path(shell,glass,'stroke="#4b435d" stroke-width="2.1"')+
    path('M63 117H199l4 3-138 .8Z','#ddcfe4','opacity=".68"')+
    line('M62 112q3 3 4 7m-2 48 135-.7m-131 4.7 124 .1','#cab6d4',1.15)+
    path('M66 126Q67 123 72 123H145Q149 124 150 129L149 157Q148 161 143 162H71Q67 162 67 158Z','#564d67','stroke="#bca2bc" stroke-width="1.25"')+
    path('M70 128l5-2h69l2 3-.5 27-3 2H72Z','#56556e')+
    path('M72 146h72v11H72Z','#605873')+
    line('M69 127l5-2h69m-71 32h69','#c1a1bf',1)+
    line('M76 128q27 1 60 0M77 155h58','#848198',1);
  const reeds=tongue(prefix,'low',76,136,133)+tongue(prefix,'middle',76,126,142)+tongue(prefix,'high',76,115,151);
  const block=path('M72 127h7l3 26-2 4-7-.1Z',paint(prefix,'brass'),'stroke="#6b5e65" stroke-width="1"')+
    line('M74.6 130l1.1 22.5','#f0ce9e',1.15)+
    line('M82.1 130h55m-55 25h48','#e1c4d7',.75,'opacity=".64"');
  const collar=path('M143 110h18c10 15 12 48 2 65h-18c10-15 9-50-2-65Z',paint(prefix,'dusk'),'stroke="#625b70" stroke-width="1.1"')+
    line('M144.6 112c8 15 10 44 3.1 60m13-60c8 15 9 44 3 59','#d7cddb',1.2);
  const guard=path('M172 112h17c7 14 8 45 1.5 61h-17c8-18 6-46-1.5-61Z','#676175','stroke="#80748a" stroke-width=".9"')+
    line('M175 114q5 14 4 26m7-27q5 15 4.7 26','#d3bfd1',1.05);
  const etch=Array.from({length:9},(_,i)=>line(`M${175+i*.09} ${118+i*3.6}l${13-i*.12} 3.3`,'#b09ea9',.7)).join('');
  const shine=line('M68 119l64 .2m2 0h9M89 164h45','#eadcee',1.25,'opacity=".80"')+
    (detail?line('M65 122l3.5 2m38-5.3 6 0m72 38 .7 4m-112 5 2.3 .4','#ede1e7',.65):'');
  return body+reeds+block+guard+etch+collar+shine+foilStamp(173,149,true);
}

function panicBarrel(prefix,detail) {
  const graphite=paint(prefix,'iron');
  const main=path(shell,graphite,'stroke="#343d41" stroke-width="2.15"')+
    path('M62 114H195l4 4-132 .6Z','#c1c1aa')+
    path('M66 122l10-3 39 .1 4.7 5.1 60 .1 7-4.6 10-.2 3.3 9-1 26.8-9 7-40 .5-6-4.7-56 .5-9 5-13-2.3Z',paint(prefix,'black'),'stroke="#4b5050" stroke-width="1.3"')+
    line('M69 124l8-3.1h34M156 162h30l10-6m-119 11h57','#9ea59b',1.15)+
    line('M65 172h126l5-2','#757f7d',1.1);
  const warningBands=path('M75 111h8c8 15 10 50 .1 64h-8.5c9.6-16 9-48 .4-64Z',paint(prefix,'amber'),'stroke="#857447" stroke-width="1"')+
    path('M76 113h6.8l4.1 11h-2.2l-7-9Zm4.5 14h4.1l3.8 6.8.4 5.3Zm2 16.6h4.7l1.3 4.2-.5 5.5Zm-2 16.2 5 1.1-1.7 7.5Z','#50554d');
  const foil=path('M157 111h22c7 14 8.5 50 1.2 64h-22q10-28-1.2-64Z',paint(prefix,'brass'),'stroke="#746547" stroke-width="1"')+
    path('M161 113h15q8 24 1.5 58.5h-15q6.4-32-1.5-58.5Z','#655a4d')+
    line('M162 115q5 14 4 25m12 17-1 7','#c4ab7c',.95);
  const rails=path('M85 114h24l4 4h-27Zm67 0h34l4.5 4.3h-39Z','#90978e')+
    line('M90 168l5 2.3h39m12-.4h34l4-2','#343c3e',1.4)+
    (detail?line('M91 127l3-1m7 4 6 .5m39 30 4.5 1.5m33-33 4.6-.8','#989b89',.85):'');
  const grooves=Array.from({length:5},(_,i)=>line('M92 '+(136+i*3)+'l11-.3','#92948a',.95)).join('');
  const mount=path('M114 112h24c9 16 9 45 2.3 62h-24c8.8-19 8-48-2.3-62Z',graphite,'stroke="#555d5d" stroke-width="1.2"')+
    line('M116.3 114q4 8 5 14m17 32-2.9 10','#bac0ae',1.3);
  return main+warningBands+rails+grooves+foil+mount+foilStamp(164,146,false);
}

function panicRelease(prefix,detail) {
  const amber=paint(prefix,'amber');
  const saddle=path('M99 110l8-8 34-2 14 5 .8 6-9 3-43 1-6-2Z','#464a4d','stroke="#373d40" stroke-width="1.25"')+
    ellipse(125,105.8,21.2,6.4,paint(prefix,'nickel'),'stroke="#525759" stroke-width="1"')+
    path('M115 95h20v10c-2 3-15 4-20 .2Z',paint(prefix,'black'))+
    line('M116 100q9 2 17-.3','#a0a49d',1.15);
  const red=part('release-button',
    path('M109 92q8-7 28-3l4 2.5v5.3q-.4 4.5-14 6-10 .9-17-2.5l-1.2-2Z',paint(prefix,'red'),'stroke="#823d36" stroke-width="1.05"')+
    ellipse(125,92,16.2,5.7,'#e85f47','stroke="#af4a3a" stroke-width="1"')+
    line('M111 91q7-4 16-3.7m-14 11q8 3 17 1.5','#ffac85',1.15));
  const cover=part('safety-cover',
    path('M98 102l7-22 26-6 15 7 7 21-13 6-25 2Z','#e8aa55','fill-opacity=".18" stroke="'+amber+'" stroke-width="2.3" stroke-linejoin="round"')+
    path('M105 80l26-6 15 7-26 7Z','#ffdd91','fill-opacity=".23"')+
    line('M106 81l14 6.7 25-6.7m-25 6.7-4.6 20.6','#e7bb72',1.2)+
    line('M100 100l5-15m6-4 15-3.6m-8.4 28.6 18-2.5','#ffdc96',1.05)+
    (detail?line('M126 84l9-2m-22 18h1.3','#ffe8b1',.65):''));
  const hinge=path('M145 103l6-6 6 2 1 8-4 4-8-.5Z','#74796c','stroke="#444d4c" stroke-width="1"')+
    ellipse(152,102.8,3.3,3.2,paint(prefix,'brass'))+line('M151 102l2.3 1.5','#6a6554',.8);
  return saddle+red+cover+hinge;
}

function mouthpiece(music) {
  const throat=music?'#54495d':'#454644', lip=music?'#888094':'#857e72';
  return path('M43 128Q37 127 32 131L21 136L13 136.5Q9 138 9 143Q9 149 13 150L22 151L34 156Q40 159 45 155C49 148 48 134 43 128Z',throat,'stroke="#383a42" stroke-width="1.5"')+
    path('M12 145q5 2 11 1l14 4.8 8 1-1 4q-6 3-11-.6L21 151l-8-.9Z','#373941')+
    ellipse(13,143.7,3.1,6.2,lip)+ellipse(12.6,143.7,1.45,3.8,'#292d35')+
    line('M18 138l6.3-.8 10-4q4-2 7-2.3',lip,1.2)+
    line('M36 132q5 11 1.7 21','#6f6972',1.45);
}

function cinder(prefix,music) {
  const ember=music?'#e8956c':'#ffb465';
  // The ember straddles the far end fitting, with ash interrupting the bright
  // inner edge. Its upper lip is the attachment point of the exhaled motif.
  return path('M211 112q11 2 15 14l2-1 3 9-1.1 4.5 1.6 6.1-2.4 5.6.5 4.2-3.3 4.1-.7 5.1-3.4 2.3-1.2 4-7 4.1-4.9-.2c14-13 16-46 .3-62.9Z','#504849','stroke="#55504e" stroke-width="1.2"')+
    path('M212 113q8 5 12 17l-1.6 3.6 2.8 4.5-.8 4.5 1.6 5.2-1.4 4 .3 3.2-3.2 3.5-1.7 7.8-4.9 3.8-4 3.4q13.4-17 11.2-38.6-1-12-10.3-22.9Z',ember)+
    path('M219 117l5 4.3 2.5 7.4-2.6-.8-2.1-3.1Zm6.8 17.5 3-1.7-.4 5-2.4 1.9Zm.8 10.3 2.7 3.2-1.3 4.4-3-.4Zm-2.6 11.9 2.2-.1-2 4.5-2.2.7Zm-4.1 9.1 1.3 1.7-4.3 3.3-.5-1.7Z',music?'#b7adae':'#afa99c')+
    line('M215 116l4 5.2m5.4 11.4.9 2.1m-1 21-.9 3m-2.8 6.1-2.6 3.5','#ffcc8d',1.15)+
    (music?line('M203 113l2.4 2m1.1 1.9 1.6 2.7','#e7d6b5',.9):'');
}

// In stage coordinates the upper ember sits around (210, 95). The plume rises
// upright even though the refill is tilted. Its lower strand begins on that tip.
function smoke(music) {
  const strand=path('M210 94C218 86 220 80 217 76C213 71 198 76 194 69C191 65 194 62 196 60C194 66 198 70 205 70C213 70 220 69 223 76C226 83 218 91 210 94Z',music?'#c1abd9':'#f0be8c','opacity=".78"')+
    line('M212 92c8-9 11-17 4-19-5-2-13-.2-16-2.4',music?'#ead6f3':'#ffddb0',1.2);
  const note=path('M191 67C184 71 177 70 176 66C174 61 181 56 187 56C190 55 192 56 193 57L198 29Q198 26 201 28C205 32 207 34 212 35C219 38 220 46 215 52C216 45 214 42 207 41C204 40 202 39 200 37L196 61Q196 65 191 67Z','#cbb4e2','opacity=".92"')+
    line('M179 64q4-6 12-5m7.4-19.1 1.3-8M204 33q3 3 7.5 4.3','#f2dff4',1.35)+
    line('M172 57q3-4 7.5-4.6m34.8-24.2 2 1.6','#d3b4df',1.2);
  const arcs=path('M173 48Q181 37 191 37l1.5 3.7q-11 1-19 7.3ZM195 36q11-.8 23 10l-4.5 1.1q-7.3-5.8-17-6.9Z','#ebae74')+
    path('M179 55q7.3-9 14.4-9.6l1.5 3.2q-7.5 1.2-13.8 8.1Zm18-10q8.4.7 14.3 7.6l-3.3 2.3q-5.2-4.8-10.2-5.8Z','#f2ba7d')+
    path('M184.7 61q4.4-6.5 11.4-6.7l-.8 3.1q-4.4.7-7.9 4.9Zm14-6.4q4.3 1 7.2 4.6l-3 1.7-5.2-3.1Z','#ffd29a')+
    ellipse(196,64.6,2.15,2.2,'#ffdcab')+
    line('M174.7 45.4l3.6-3.7m35.1-3 3 2.5m-25.8-8.4 2.4-.5','#ffd399',1);
  return '<g data-part="'+(music?'queue-smoke':'lag-smoke')+'" opacity="0">'+strand+(music?note:arcs)+'</g>';
}

function draw(prefix,variant,music) {
  const detail=variant==='detail';
  const body=music?musicBarrel(prefix,detail):panicBarrel(prefix,detail);
  return finishes(prefix)+ellipse(130,207,82,5,'#11171c','opacity=".26"')+
    tilted(body+caps(prefix,music)+mouthpiece(music)+cinder(prefix,music)+valve(prefix,music)+(music?'':panicRelease(prefix))+dial(prefix,music?154:130,145,music))+smoke(music);
}

function miniature(music) {
  const body=path('M4.6 9.9h14.1q2.4 0 2.6 2.7.5 3.4-1.7 4.5H4.6Z',music?'#9984b5':'#707873','stroke="#42464d" stroke-width=".55"')+
    path('M4.2 9.7h1.2q1.5 3.4.2 7.6H4.2q-1.6-.3-1.8-3.4-.2-3.2 1.8-4.2Z',music?'#c7bad7':'#b6baaf')+
    ellipse(4,13.5,1.1,2.8,'#555864')+
    path('M18.4 9.6h1.2q3.3 3.2.2 7.7h-1.2q1.7-3.4-.2-7.7Z',music?'#c8bdcf':'#c1c8bb')+
    line('M4.7 9.7V8Q3.2 6.3 5.3 5.6','#a7a8a1',.65)+
    ellipse(5,8.4,1.16,1.16,'#555963','stroke="'+(music?'#c9bcce':'#cbb27e')+'" stroke-width=".55"');
  const gaugeX=music?14.2:12.25;
  const traits=music?path('M6.8 11.4h5.7v4.3H6.8Z','#655774')+
      line('M7.2 12.1h4.6m-4.5 1.3h3.7m-3.6 1.3h2.8','#e7bea1',.55):
    path('M6.6 10.1h1q1 3.3.1 6.7h-1q.9-3.2-.1-6.7Z','#c9a165')+
    ellipse(12,9,1.7,.75,'#e76248')+
    path('M9.6 10l.7-2.4 2.7-.6 1.7.7.6 2.2Z','#ffd180','fill-opacity=".17" stroke="#e0b475" stroke-width=".45"');
  return '<g transform="rotate(-17 12 13)">'+body+traits+
    path('M4 12q-.5-.4-1.8.4l-1.3.5v1l1.4.4 1.8.6q.8-1.2 0-2.9Z','#55525b')+
    path('M20.6 10.2q2.2 3.2.4 6.4l.7-.2q2.2-3.8-.1-6.1Z',music?'#e7a17a':'#ffbd74')+

    ellipse(gaugeX,13.3,1.75,1.75,music?'#e2d0b3':'#e9e4cb','stroke="#7c796e" stroke-width=".45"')+
    line(`M${gaugeX-.85} 12.75l.95.65`,'#685e5b',.45)+'</g>';
}
function silhouette(music) {
  const ink='#142028';
  return tilted(path(shell,ink)+path(leftCap,ink)+path(rightCap,ink)+
    path('M43 128l-21 8-10 .6q-5 6 0 13.5l10 .9 21 6Z M211 112q21 5 21 29 1 22-16 33l-6 .2Z',ink)+line(tube,ink,5.8)+
    path('M46 111V87h12v25Z',ink)+ellipse(52,88,13,13,'none','stroke="'+ink+'" stroke-width="4.2"')+
    (music?'':path('M98 110l6-31 27-6 16 7 10 28Z',ink)));
}
const turn=clip('shutoff-wheel',[52,88],[{at:.10,rotate:-3},{at:.23,rotate:42},{at:.44,rotate:41},{at:.71,rotate:2},{at:.84,rotate:-2}]);

export const signalCartridges = Object.freeze({
  'gift-cartridge-hold-music': {
    body:(prefix,variant)=>draw(prefix,variant,true), mini:miniature(true),silhouette:silhouette(true),
    storyboard:'The valve turns. Three brass tongues flex in sequence behind violet glass and the side gauge climbs with their resonance and lavender smoke curls into an eighth note above the lit tip.',
    motion:{duration:1940,layers:[turn,
      clip('reed-low',[78,133],[{at:.15,rotate:0},{at:.23,rotate:-5},{at:.33,rotate:3.5},{at:.44,rotate:-2},{at:.57,rotate:1}]),
      clip('reed-middle',[78,142],[{at:.21,rotate:0},{at:.31,rotate:6},{at:.42,rotate:-4},{at:.54,rotate:2},{at:.69,rotate:-.6}]),
      clip('reed-high',[78,151],[{at:.27,rotate:0},{at:.37,rotate:-6},{at:.47,rotate:4.2},{at:.59,rotate:-2},{at:.76,rotate:.7}]),
      clip('queue-smoke',[210,94],[{at:.21,opacity:0,scaleX:.27,scaleY:.12},{at:.39,opacity:.66,scaleX:.81,scaleY:.63},{at:.53,opacity:1},{at:.66,opacity:.96,y:-.6},{at:.80,opacity:.4,x:-1.8,y:-5},{at:.92,opacity:0,x:-4,y:-10}]),
      clip('dial-needle',[154,145],[{at:.13,rotate:0},{at:.31,rotate:42},{at:.43,rotate:32},{at:.53,rotate:44},{at:.68,rotate:18},{at:.84,rotate:-3}])
    ]}
  },
  'gift-cartridge-panic-button': {
    body:(prefix,variant)=>draw(prefix,variant,false), mini:miniature(false),silhouette:silhouette(false),
    storyboard:'A handwheel opens and the amber guard flips on its bolted hinge. The red release clicks into the barrel. The dial falls and three broken amber signal arcs stutter out of the ember before the guard resets.',
    motion:{duration:2120,layers:[turn,
      clip('safety-cover',[152,103],[{at:.09,rotate:-2},{at:.29,rotate:46},{at:.37,rotate:43},{at:.63,rotate:44},{at:.79,rotate:2},{at:.85,rotate:4},{at:.94,rotate:0}]),
      clip('release-button',[125,99],[{at:.32,y:0},{at:.43,y:5.5},{at:.51,y:5.5},{at:.62,y:-.8},{at:.71,y:0}]),
      clip('lag-smoke',[210,94],[{at:.29,opacity:0,scaleX:.4,scaleY:.18},{at:.40,opacity:.82,scaleX:.82,scaleY:.69},{at:.44,opacity:.42,scaleX:.84,scaleY:.70},{at:.51,opacity:.96,scaleX:.96,scaleY:.92},{at:.56,opacity:.73,x:1.5},{at:.62,opacity:1},{at:.72,opacity:.93},{at:.84,opacity:.39,x:-2.1,y:-5},{at:.95,opacity:0,x:-3,y:-9}]),
      clip('dial-needle',[130,145],[{at:.23,rotate:22},{at:.35,rotate:22},{at:.46,rotate:-38},{at:.55,rotate:-27},{at:.68,rotate:-13},{at:.82,rotate:3}])
    ]}
  }
});
