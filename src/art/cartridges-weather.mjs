/** Horizontal refill cartridges, drawn on the same axis as the original Copium
 * Cartridge. The vent sits above the near end cap, separate from the side dial. */
const path = (d, fill, extra='') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (d, color, width, extra='') => path(d,'none',`stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}`);
const ellipse = (cx,cy,rx,ry,fill,extra='') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const part = (name, art, extra='') => `<g data-part="${name}" ${extra}>${art}</g>`;
const paint = (prefix, name) => `url(#${prefix}-${name})`;
function finish(prefix, name, colors, axial=false) {
  const stops=colors.map(([offset,color])=>`<stop offset="${offset}%" stop-color="${color}"/>`).join('');
  return `<linearGradient id="${prefix}-${name}" x1="0%" y1="0%" x2="${axial?100:0}%" y2="${axial?0:100}%">${stops}</linearGradient>`;
}
const warm=[[0,'#716050'],[6,'#cead7b'],[16,'#f8de9e'],[32,'#b69866'],[55,'#786049'],[80,'#584d41'],[94,'#b79d70'],[100,'#6b5848']];
const nickel=[[0,'#536273'],[9,'#b2bdc0'],[17,'#e5e3cf'],[35,'#92a4ae'],[55,'#64717d'],[75,'#454f64'],[94,'#9aa7af'],[100,'#505f6b']];
const sleeve=[[0,'#302f49'],[9,'#615f80'],[17,'#9990aa'],[29,'#665f83'],[50,'#4d496a'],[76,'#35344c'],[94,'#595873'],[100,'#373749']];
const amber=[[0,'#7c4636'],[10,'#dc8a5e'],[21,'#f9b074'],[40,'#bc7148'],[74,'#7a4c3a'],[91,'#c48758'],[100,'#5d463d']];
const enamel=[[0,'#a8a797'],[13,'#f6edd0'],[25,'#e7e3ce'],[57,'#bfc1b5'],[83,'#929e9b'],[94,'#d6d4be'],[100,'#798581']];
const windowOutline='M71 103H199Q209 105 210 139Q210 170 199 176H70Q58 166 58 139Q58 113 71 103Z';
const track=(name,origin,poses,opacity)=>({name,origin,frames:[opacity===undefined?{at:0}:{at:0,opacity},...poses,opacity===undefined?{at:1}:{at:1,opacity}]});
const metalDialTicks=Array.from({length:13},(_,i)=>{
  const a=(-212+i*20)*Math.PI/180, r=14, inner=i%3===0?10.4:12;
  return `M${(Math.cos(a)*inner).toFixed(2)} ${(Math.sin(a)*inner).toFixed(2)}L${(Math.cos(a)*r).toFixed(2)} ${(Math.sin(a)*r).toFixed(2)}`;
}).join(' ');

function pressureDial(prefix, x, y, wind, detailed) {
  const frame=paint(prefix,wind?'alloy':'brass');
  const running=wind?'#b55f3e':'#a95242', rim='#424b52', paper=wind?'#fff0c9':'#f1e5c5';
  const base=ellipse(.8,2,21,22,rim)+ellipse(-.7,-.6,20.1,21,frame,'stroke="#424b4e" stroke-width="1.4"')+
    ellipse(-1,-1.3,17.15,17.9,'#635f55')+ellipse(-1,-1.45,15.9,16.75,paper)+
    line('M-16-8Q-11-18 0-18.9m7 1.6q5 2.4 8 7.5','#f8e1b1',1.15);
  const markings=line(metalDialTicks,'#586366',1.12)+line('M7.3-11.8q3.1 1.9 5.7 6.8',running,1.55)+
    (detailed ? line('M-6 9.5h10m-6 2.1h4','#87908a',.72) : '');
  const hand=part('pressure-needle',path('M-5.2 4.1L-2.5-.3 8.8-9.4 2.6.8-.5 3.1Z',running,'stroke="#6a5146" stroke-width=".58"'));
  return `<g transform="translate(${x} ${y})">${base}${markings}${hand}${ellipse(0,0,2.8,2.8,rim)}${ellipse(-.5,-.5,1.4,1.4,'#bdaf89')}${line('M-11-13.9q4-3.6 9-3.5','#fff5d8',1.3)}</g>`;
}

function plumbing(prefix, wind) {
  const metal=paint(prefix,wind?'alloy':'brass'), shadow=wind?'#444958':'#4c4e4b';
  const trim=wind?'#c37f51':'#dbba7d';
  const vent='M57 107L55 96Q53 89 45 89H39Q31 89 31 81V73';
  const body=line(vent,shadow,8.4)+line(vent,metal,5.9)+line('M29.9 77v4.9q-.1 5.1 4.6 6.4','#dbd4b5',1.1)+
    path('M25.8 71.2l3.4-1.6 7 .2 1.6 2.4-1 5.2-9.5.5-1.6-2Z',metal,`stroke="${shadow}" stroke-width="1.2"`)+
    ellipse(31.3,71.2,5.2,1.7,shadow)+ellipse(31,71.1,3.1,.8,'#2c3c45')+
    path('M50 103l12.4-4.6 5.7 13.7-14 1.9Z',metal,`stroke="${shadow}" stroke-width="1.6"`)+
    path('M54 99v-16l7-2.3 3.4 15.8Z',metal,`stroke="${shadow}" stroke-width="1.1"`);
  const spokeInk=wind?'#535767':'#66604b', wheel=part('valve-wheel',
    ellipse(0,.9,12.7,12.5,'none',`stroke="${shadow}" stroke-width="4.9"`)+
    ellipse(0,0,12.4,12.3,'none',`stroke="${trim}" stroke-width="3.9"`)+
    line('M0-10v9.8m9.6-3L1 .3m5.2 8.4L.6 1m-7.1 7.7L-.5.4M-10.1-3.3l9.1 3.5',spokeInk,2.5)+
    line('M-8.3-8.7q4.3-4.3 10-3.2',wind?'#ebaf7c':'#f2d891',1.15)+
    ellipse(0,0,3.65,3.65,metal,`stroke="${shadow}" stroke-width=".9"`)+line('M-1.1 1.2 1.1-.8',shadow,.85));
  return body+`<g transform="translate(56.5 82)">${wheel}</g>`;
}

function mouthpiece(prefix,wind) {
  const ink='#2c3438';
  return path('M53.8 114.3Q61.4 115.1 63.6 134.2Q67.1 162 56.5 168L45.8 165.8Q33.2 157.5 33.3 138.3Q32.8 123 42.1 118Z',paint(prefix,'mouth'),`stroke="${ink}" stroke-width="1.8"`)+
    ellipse(44.5,141.7,11.8,24.3,wind?'#424451':'#39464b','stroke="#465057" stroke-width="1.1"')+
    ellipse(43.2,142.3,8.9,19.6,wind?'#353643':'#2e3d45')+
    ellipse(42.4,143.3,4.3,9.8,'#202c32','stroke="#656d70" stroke-width="1.05"')+
    line('M36.7 133.5q.7-11.1 5.9-13.2m6.3-.5q4.7 3.5 6.4 12',wind?'#acaaa8':'#a2b2ae',1.35)+
    line('M38.2 154.1q2.2 7.3 6.1 9.4','#758580',1.1);
}

function ashTip(prefix,wind) {
  const edge='#514a48',ember=wind?'#ec9869':'#ee9b76';
  // The band of old ash follows the same elliptical section as the cap. Its
  // ragged edge sits outside the clean metal collar; only the exposed seam glows.
  const glowingLip=path('M205 100.5l9-.4q12.8 18.2 13.3 40.1.1 19.7-7.6 34.2l-11.3 2.3q10-23.9 5.2-49-2.8-16-8.6-27.2Z','#984e3c',`stroke="${edge}" stroke-width="1.25"`)+
    line('M208.5 103.3q6.7 12.5 8.8 25.2m.9 6.6q1.7 14.5-1.5 27.2m-1.5 5.2-2.4 5.3',ember,2.1);
  const shale=path('M211 100.9l3.6.3 2.8-1.3 2.9 2.2 2.5-.3 1.7 3 2.9 1.4.1 3.7 2.6 3.6-.4 4 2.5 4.8-.4 3.3 1.9 3-.6 4.1 1.2 3.7-.5 4.7 1 2.5-1.4 6 .6 4.3-2.1 5.6.4 3.3-2.6 3.2-.6 4.8-3.4 1.7-1.7 4-4.1.6-4 2q9.7-23.4 6.2-46.1-2.5-15-11.2-31.1Z',paint(prefix,'ash'),`stroke="${edge}" stroke-width="1.4"`)+
    path('M213 103.4l5.2-.4 3.8 4.4-3.4 1.6Zm5.6 10.7 3.5-1.8 3.8 2.5-.4 4.4-3.3-.7Zm3.3 11.3 4.1-2.1 4.9 4.7-3 1.4-4.8-.4Zm.9 8.8 3.4-2.4 3.7.7-1.3 5.1-4.8 1.2Zm1 11.5 5.6-2.8 1.2 2.6-3.9 4.8-3.3-.7Z','#b2b0a4')+
    path('M217.3 111.8l4.4-1.8 3.6.9-.4 2.9-2.9-1.8-3.4 2.8Zm4.1 10.4 4.2-.7 3.4 2.7-3.1-1.1-2.4 2Zm3 19.3 5-3.5-1.3 3.2-3 2.8Zm-1.3 13.2 4.8-3 1 .8-1.7 3.9-4.6 2.6Zm-3.2 13.2 2.8-2 4.1-1.6-1.3 3.7-6.8 3.3Z','#5c5a59')+
    line('M218 106.3l2.2 1.9m4.5 11.1 3.4 1.3m-1.2 9.9 3.3-.2m-5.5 22.7 3.3-2m-5.9 11.9 2.9-1.4','#dad6c3',1.05);
  const emberPulse=part('ember-pulse',line('M212.8 107.5l3.5 7.7.4 3.4 2.6 3.7.6 3.9m2.7 9.9.9 8.3-.8 3.4m-1.1 7.4-1.3 5.3','#ffb77c',2.1)+
    path('M218 117.1l3.6 1.9 1.9 1.9-3.7-.7Zm3 16 3-1.7 2.6.4-3.5 2.1Zm1.3 15 3-.6 1.9-1.2-.8 2.2-4.7 1.6Z','#f58c64'),'opacity=".44"');
  return glowingLip+shale+emberPulse;
}

function foilBand(prefix,wind) {
  const start=wind?80:140, span=wind?41:29;
  // A single engraved wrapper runs over the front and disappears around both
  // edges of the cylinder. The dial sits on top of its right-hand lap.
  const body=`M${start} 102.7h${span}q10.8 16.8 11.5 36.5.8 20.2-6.1 35.7h-${span}q6.9-18.1 5.6-38.1-1.4-19.1-11-34.1Z`;
  const edging=line(`M${start+2.1} 103.8q7.9 13.2 10 31.2 2.6 23.9-4.5 38.4M${start+span-1.9} 103.8q8.3 13.6 10.2 31.2 2.5 24.1-4.5 38.4`,wind?'#f5ce97':'#e3c68c',1.65)+
    line(`M${start+5} 104.8q4.8 8.1 7.2 19.7M${start+span-4.5} 104.7q3.9 6.7 6.6 17.6`,wind?'#5c463b':'#57788a',1.1);
  const pattern=wind?
    path('M91 104.3h5.1l2.8 4.4h-5.3Zm8.1 4.4h5l2.1 4.7h-5.1Zm3-4.5h5.2l2.4 4.5h-5.1Zm6.9 4.5h4.7l2.8 4.6h-4.8Zm-1.6 52.3h5l-.8 3.7h-5.1Zm4.2 3.8h5.3l-1.1 3.8H111Zm-5.8 3.8h5.4l-1.2 3.5h-5.3Z','#6c493d'):
    path('M147.7 112.3l3.3-4.6 4.4 4.2-3.1 3.8Zm6.3 41.3 2.4-3.7 3.7 3-2.8 3.5Zm-.7 8.2 2.5-3.6 3.7 3-2.6 3.2Z','#e5bf7f')+
      line('M147.5 117.7l4.9 2.6 3.7-3.4m-4.8 50.9 4.1 2 3.8-3.6','#b6c2b9',.9);
  return path(body,paint(prefix,wind?'orange':'nightband'),'stroke="#535357" stroke-width="1.05"')+edging+pattern;
}

function typingSmoke() {
  const curl=path('M217 116.5C218 109 224 102 223 96C222 88 214 87 208 82C199 75 196 67 202 59C198 69 204 74 211 77C221 82 230 87 228 96C227 104 221 109 217 116.5Z','#9cbac8')+
    path('M219 111Q228 97 224 91Q222 86 214 83Q204 78 202 73Q201 86 217 91Q224 94 219 111Z','#c6dbe1')+
    line('M225 85q-2-4-7-7q-6-3-7-8','#789cae',1.1);
  const dots=[[168.5,63.6],[180.5,61.7],[192.5,60.9]].map(([x,y],i)=>
    part('typing-bead-'+(i+1),path(`M${x-3.5} ${y+1.8}q-1.5-3.8 1.5-5.6 3.2-2 5.3 1 1.9 3-.7 5.1-2.2 2-5.1.2Z`,'#bdd1dc')+
      line(`M${x-1.7} ${y-1.7}q1.6-1.4 3.1-.6`,'#e5eded',1.05),'opacity="0"')
  ).join('');
  return part('typing-smoke',curl+dots,'opacity="0"');
}

function retrySmoke() {
  const stem=path('M217.5 116.4Q219.6 108.5 225 101C229 95 226 90 218 87C210 83.7 204 80 202 73.3Q208.1 80 219.2 83.3C229.4 86.5 234.1 93.2 229.1 101.1Q221 109.2 217.5 116.4Z','#b4a8c7')+
    line('M219.9 109.3q10-12.1 7-17.4-1.6-3.2-6.7-5.2','#e2cfae',1.6);
  const loop=part('return-curl',path('M208.5 81.5Q193 79 187 71.7C181.9 65.8 185 56.3 192.3 54.4C201 52 208 57.4 208 64.7C207.8 68.6 206 71.4 203 73.5L208.2 74.5Q202 77.5 196 77L197.7 67.6L200 71.4Q207.3 67.4 203.6 61.1Q199.8 55.4 193.6 58.7C187.6 61.4 188.2 67.6 192.3 71.7Q197 77.1 208.5 81.5Z','#c7bad2')+
    line('M189.4 60.2q5.5-5.7 11.1-2.2m3.7 3.7q2.4 5.8-2.4 9.5','#eee0c7',1.2)+
    line('M187.3 69.7q1.4 3.5 5.7 6.5','#9689b2',1.1));
  return part('retry-smoke',stem+loop,'opacity="0"');
}


// Both end faces are elliptical. The dark recessed socket belongs to the near
// cap. The far cap projects beyond the glass or moving sleeve.
function rims(prefix, wind, detailed) {
  const outer=paint(prefix,wind?'cream':'brass'),band=paint(prefix,wind?'orange':'alloy'),gilt=paint(prefix,'brass');
  const edge=wind?'#484e57':'#4b514e',stroke=wind?'#e9e5cd':'#f0d49b';
  const far=path('M198 100.8H207Q221 102 222.4 132Q225 163 212 175.7L199 178.2Q210 158 208.7 138Q208.5 114 198 100.8Z',outer,`stroke="${edge}" stroke-width="1.65"`)+
    path('M203.6 103.4Q214.5 114 215.8 136.7Q217.1 160 208 173.8', 'none',`stroke="${edge}" stroke-width="1.1"`)+
    line('M207.6 103.7q8.9 7.4 11.5 31.7',stroke,1.4)+
    line('M216.6 157.5q-.8 8.6-4.6 15','#7a7868',1.35)+
    (detailed?line('M209 107l2-.6m2.5 6.7 3-.7m-1 8.2 3-.4m-1.1 9 2.8-.5m-1.2 11 2 .2m-2.4 8.8 1.6.3',edge,1.3):'');
  const near=path('M55.3 103.2L68 101.6Q82 103 84 138.5Q85 164.8 73.6 177L60 180.4Z',outer,`stroke="${edge}" stroke-width="1.8"`)+
    ellipse(57.7,141.7,17.1,39,outer,`stroke="${edge}" stroke-width="1.9"`)+
    ellipse(55.9,142.3,13.9,32.5,wind?'#565d6a':'#4b5b5c','stroke="#e1c58b" stroke-width="1.3"')+
    ellipse(53.6,142.6,10.3,25,band)+ellipse(53,142.9,8.7,19.6,'#2c4148','stroke="#93988a" stroke-width="1"')+
    ellipse(52.6,142.9,4.2,10.6,'#384d52','stroke="#887e64" stroke-width=".8"')+
    line('M49.5 138.8l6.7 7.6','#a3a17e',1.15)+
    line('M46.5 117.3q3.2-11.2 9.7-12.1m8.8 4.7q4.4 6.6 5.5 17.1',stroke,1.6)+
    path('M71.8 102.7q11.4 15.9 11.5 38.7.8 21.4-8.4 34.1l3 .1q17-26.8 8.3-57.4-2.9-10.8-10.2-15.5Z',band)+
    (detailed?line('M67.7 108.5l4.2-.6m-.8 6.1 4.6-.7m-3 7.8 4.2-.6m-1.2 8.8 3.3-.5m-7.5 36.4 4-.5m-6 5.5 4.4-.6',edge,1.0):'');
  const retaining=path('M187.8 101.7l6.8-1q10.5 10.8 13 31.3 3.7 26.9-5.9 45.5l-7.8 1.2q12-18.5 6.3-47.5-3.8-19.3-12.4-29.5Z',gilt,`stroke="${edge}" stroke-width="1.1"`)+
    line('M191.7 103q6 9 8.3 18.3',stroke,1.15);
  return {far,near,retaining};
}

function registerMarks(detailed) {
  return line('M78 108.4h108m-98 63.8h102','#d3e0d7',1.35,'opacity=".65"')+
    line('M87 166.5h22m49 0h31','#8bb0b5',.95)+
    (detailed ? line('M90 109.7h19m4 0h5m59-.4h7m-93 59h4m2.5-.1h3.4','#e6eadb',.75):'');
}
function umbrella(prefix) {
  const fringe=path('M101 144q5-14.3 19.5-18.4 15.5 3.4 21 17.1-4.6-1.2-8 2.8-3.9-2.6-7.4 2.1-4.9-3.8-10 .4-3.1-3.9-6.2-1.7-4.3-3.2-8.9-2.3Z','#cd7758','stroke="#794e48" stroke-width="1.15"')+
    path('M102 143q6-13.6 18.6-17.1-9 8-10.8 20.1-3.8-3.3-7.8-3Z','#b46453')+
    path('M110 146q3.7-14 10.7-19.8-3.3 10.3-3.9 21.4-3.7-4.1-6.8-1.6Z','#e49c68')+
    path('M117 147.6q.5-13.3 3.8-21.4 4.5 8 5.3 21.4-3.8-3.8-9.1 0Z','#e8a16e')+
    line('M120.7 126.5q8.5 7.3 12.9 18M120.5 126.1q-5.3 5.4-8 12','#f2b98a',.8)+
    path('M100.7 144q4.7-.8 9 2.6 3.1-2.1 6.5 1.9 5.4-4.7 10-.4 2.6-4.4 7.7-2.2 2.6-3.3 7.5-3.1','none','stroke="#94584a" stroke-width="1.25"');
  return line('M120.6 124v30q.1 4 3.1 4.4 3.1.4 3.7-2.8','#584c46',2.5)+
    line('M120.4 124v30q0 3.6 3 3.9 2.8.2 3.1-2.6','#e3bd82',1.35)+
    part('rain-runner',line('M112 143.2l8.7 7.1 10.4-7.2','#d6bb91',1.05)+path('M119 149h3.5v2.5h-3.5Z',paint(prefix,'brass')))+
    part('umbrella-canopy',fringe)+ellipse(120.7,125.5,1.3,1.5,'#f7cc87');
}
function rainChamber(prefix,detailed) {
  const color=paint(prefix,'ocean');
  const shell=path(windowOutline,color,'stroke="#364753" stroke-width="2"')+
    path('M79 117Q132 109 195 113L199 121Q146 117 82 123Z','#b4cbd0','opacity=".25"')+
    path('M73 156Q92 151 108 155T143 160Q159 158 178 155Q192 153 207 155L204 177H73Z','#527a86')+
    line('M77 155Q94 151 110 156T145 159Q179 151 198 154','#a1c2c1',1.15)+
    path('M78 165q37 7 64 3.7 30-4.4 58-3.2l-1.7 8.8H79Z','#52717d')+
    registerMarks(detailed);
  const drops=part('rain-drops',[[96,124,1.2],[102,119,.8],[110,130,.7],[129,118,.9],[140,127,.85],[147,121,.75]].map(([x,y,s])=>
    `<g transform="translate(${x} ${y}) scale(${s})">${path('M0-3.9Q.8-1.3 2 .2Q3.3 3.3.3 3.8Q-2.8 3.7-2.3 1.2Z','#aacbd0')}${line('M-.7.6l.6-1.6','#dfebe3',.7)}</g>`).join(''));
  const glass=path('M76 105q52-3.8 108-2.1l4.3 3.2q-56-.4-106.3 3.4Z','#d6ded2','opacity=".78"')+
    line('M87 114.2h20.2m3.2-.1h5.4m32.2-2.3h23.6','#e0e8df',1.45,'opacity=".86"')+
    line('M89 160.3h6.5m34 .9h13.4','#bad6cd',1.1)+
    (detailed?line('M86 116h7m85 44.9h4m3.3-.1h2m-64 5.3 7-.1','#e0e6d4',.75):'');
  return shell+drops+umbrella(prefix)+glass;
}
function sealRib(x){
  const shape=`M${x} 104q7.7 13 9.5 33 1.4 19.8-5.4 36.5l4.3 1q8.3-16.6 6.3-38.3-1.7-21-10.2-32.3Z`;
  return path(shape,'#34364c','stroke="#312f42" stroke-width=".9"')+
    line(`M${x+1.2} 105q4.6 8.1 6.9 18.8`,'#bf926f',1.7)+
    line(`M${x+6.8} 110.3q8.5 22 5.4 39.5m-1.1 4.8q-1.2 8-4.4 15`,'#77748b',1.25);
}
function windChamber(prefix,detailed) {
  const shaft=paint(prefix,'alloy'),orange=paint(prefix,'orange'),violet=paint(prefix,'violet');
  const fixed=path(windowOutline,shaft,'stroke="#414858" stroke-width="1.9"')+
    path('M79 104H191l4.4 4.6H83Z','#c4ced0')+
    line('M82 112h112m-106 56h107','#848d9d',1.35)+
    line('M114 115.8h76m-75 48.5h74','#ced2c8',.9)+
    path('M185 103h8q10.6 22.5 9.5 43.3-.7 16.9-7.5 29.2h-9.4q10.8-33.1-.6-72.5Z',orange);
  const latch=path('M117 102.1h55.5q11.7 17.4 10.9 43.4-.2 16.8-7.3 29.5h-55.3q5.9-16.7 4.9-37.9-.6-17.2-8.7-35Z',violet,'stroke="#373947" stroke-width="1.35"')+
    path('M120 105.5h51.4q2.7 4.7 4.1 8.9l-52.3.5Z','#74718f')+
    path('M125.3 152.1h56.4l-.8 4.7h-56Z','#494762')+
    [118,128,138,148,158,168].map(sealRib).join('')+
    path('M171.8 101.3l5.7-.5q13.8 23.6 11.7 52.2-.4 10.6-5.5 21.2l-7.6.8q12.3-31.8-4.3-73.7Z',orange,'stroke="#65483c" stroke-width="1.2"')+
    line('M175.4 104.4q4.8 8.5 6.5 15m3.2 30.2q.1 10.5-4.6 21.4','#e9ac76',1.15);
  const collar=path('M79.5 102H117q9.1 15.5 10.3 35.6 1.2 20.4-6 37.8H79.6q10-34.2-.1-73.4Z',violet,'stroke="#494659" stroke-width="1.45"')+
    path('M82 106.7l31.5-.6 5 4.2-34.2.9Z','#aaa0af')+
    path('M84.5 163.1l36.9.3-1.6 4.4H83Z',orange)+
    path('M85.4 166.7l33.6-.1-.7 1.5h-34Z','#dfa16c')+
    (detailed?line('M86.4 120h8.9m3 0h4m6.7-7.2h4.1m-1.2 57.6h6.1','#a29aa4',.9):'');
  return fixed+part('piston-sleeve',latch)+collar;
}
function draw(prefix,variant,wind){
  const detail=variant!=='card';
  let definitions=finish(prefix,'brass',warm)+finish(prefix,'alloy',nickel)+
    finish(prefix,'mouth',[[0,'#364452'],[18,'#84908e'],[30,'#48565d'],[61,'#323e49'],[88,'#232d35'],[100,'#5d676a']])+
    finish(prefix,'ash',[[0,'#817c75'],[21,'#c3bdab'],[39,'#96968d'],[68,'#6b6a68'],[87,'#8c8a82'],[100,'#5e5b5b']])+
    finish(prefix,'nightband',[[0,'#304654'],[18,'#567081'],[33,'#344d61'],[68,'#293c50'],[90,'#405663'],[100,'#273c49']]);
  if(wind)definitions+=finish(prefix,'violet',sleeve)+finish(prefix,'orange',amber)+finish(prefix,'cream',enamel);
  else definitions+=finish(prefix,'ocean',[[0,'#416377'],[12,'#a1b9bd'],[28,'#628b9e'],[49,'#588497'],[69,'#3f697d'],[88,'#354f66'],[100,'#223b53']]);
  const caps=rims(prefix,wind,detail), gaugeX=wind?99:167, gaugeY=139;
  const dialMount=path(`M${gaugeX-10} 103l11.1-.9q10 13.5 13.1 34.9l-1.7 33.7-12.2 3.7q8.7-39.8-10.3-71.4Z`,paint(prefix,wind?'orange':'alloy'),'stroke="#4c5558" stroke-width="1.15"')+
    line(`M${gaugeX-6.8} 104.3q5.5 7.3 7.5 13.5`,wind?'#ecb281':'#d9dbca',1.3);
  const construction=plumbing(prefix,wind)+caps.far+(wind?windChamber(prefix,detail):rainChamber(prefix,detail))+caps.retaining+ashTip(prefix,wind)+caps.near+mouthpiece(prefix,wind)+foilBand(prefix,wind)+dialMount+pressureDial(prefix,gaugeX,gaugeY,wind,detail)+(wind?retrySmoke():typingSmoke());
  return '<defs>'+definitions+'</defs>'+ellipse(125,201.5,70,3.4,'#1e2932','opacity=".23"')+
    `<g transform="rotate(${wind?-15:-17} 130 139)">${construction}</g>`;
}

// Dedicated optical drawings give the wheel, dial, end faces and a single
// identifying barrel treatment enough ink at 16–24 CSS px.
function miniature(wind) {
  const cap=wind?'#e3dfc3':'#cfb07d', shell=wind?'#585574':'#678fa1', dialX=wind?9.5:15.75;
  const silhouette=path('M5.2 9.4l14-.2q2 0 2.2 4.1.2 3.5-1.6 3.8L5.6 17.8Q4 17.8 3.8 14.2q-.4-3.7 1.4-4.8Z',shell,'stroke="#344550" stroke-width=".66"');
  const treatment=wind?line('M12 10q1.6 3.1.9 6.7m1.1-6.8q1.5 3.1.9 6.6m1-6.6q1.5 3 .8 6.5m1-6.5q1.6 3 .9 6.3','#c28b68',.66):
    path('M8.7 13.9q.8-2.4 2.4-2.8 2 .3 2.6 2.7-1-.5-1.4.2-.9-.5-1.3.3-.9-.6-1.3 0-.8-.7-1-.4Z','#f4a372')+
      line('M11.2 13.5v1.6q.1.6.6.4','#efc994',.48);
  return `<g transform="rotate(${wind?-15:-17} 12 13)">${line('M5 10.3 4.7 8.6 3 8.5 2.5 7.2','#ad9b79',.9)}${ellipse(5.3,7.9,1.15,1.15,'none',`stroke="${wind?'#d58c5d':'#d7b97c'}" stroke-width=".7"`)}${silhouette}${treatment}${path(wind?'M8.1 9.6h2.7q1.1 3.7.3 7.6h-2.8q1.2-3.6-.2-7.6Z':'M13.45 9.4h2.15q1.22 4 .49 7.65l-2.22.03q.96-3.48-.42-7.68Z',wind?'#c18765':'#394d63')}${line('M6.8 10.1l11.3-.1',wind?'#c0bac5':'#bececc',.63)}${path('M19.1 9l1.2.1q2.1 1.3 1.9 5.1-.2 2.3-1.3 3l-1.4.1q2.1-4.1-.4-8.3Z',cap)}${path('M20.6 9.3l.85.3q1.95 1.7 1.85 4.7-.06 1.7-1.07 2.79l-1.1.12q1.36-4.52-.53-7.91Z','#a39d91','stroke="#826956" stroke-width=".35"')}${ellipse(5.4,13.8,1.75,4,cap)}${ellipse(5.25,14,1.15,2.75,'#3b4e55')}${ellipse(4.15,14,1.03,2.0,'#394351')}${ellipse(3.95,14,.34,.73,'#88948f')}${ellipse(dialX,13.35,2.1,2.2,cap,'stroke="#515953" stroke-width=".53"')}${ellipse(dialX,13.35,1.59,1.73,'#f6e7c4')}${line('M'+(dialX-.4)+' 13.8l1.2-1.3','#975647',.52)}</g>`;
}
function silhouette(wind){
  const dark='#152229';
  return `<g transform="rotate(${wind?-15:-17} 130 139)">${path('M53 104l15-3 129-.4 11.4-.8q14 2 15 32 1.2 28.3-11.3 44.5L72 178.8l-14 2.8q-17 .4-18-38.4-1-31 13-39.2Z',dark)}${line('M57 106 55 95Q53 90 45 89H38Q31 88 31 80v-8',dark,8)}${ellipse(56.5,82,14.5,14.5,dark)}${ellipse(44,142,12,24,dark)}${path('M211 99q24 0 25 37 1 37-19 42l-8 1q14-34 2-80Z',dark)}${path('M52 96h9l5 15H51Z',dark)}</g>`;
}
function commonTracks(wind){
  return [
    track('valve-wheel',[0,0],[{at:.10,rotate:4},{at:.29,rotate:wind?-46:51},{at:.50,rotate:wind?-41:47},{at:.74,rotate:3},{at:.88,rotate:-1.3}]),
    track('pressure-needle',[0,0],[{at:.16,rotate:-3},{at:.40,rotate:wind?53:37},{at:.52,rotate:wind?44:32},{at:.67,rotate:12},{at:.78,rotate:-6},{at:.91,rotate:2}]),
    track('ember-pulse',[220,132],[{at:.12,opacity:.36},{at:.26,opacity:1},{at:.45,opacity:.83},{at:.65,opacity:.60},{at:.83,opacity:.46}],.44),
    track(wind?'retry-smoke':'typing-smoke',[217,116.5],[{at:.12,opacity:0,scaleX:.47,scaleY:.20},{at:.26,opacity:.72,scaleX:.72,scaleY:.48},{at:.44,opacity:1,scaleX:.97,scaleY:.96},{at:.59,opacity:.95,scaleX:1,scaleY:1},{at:.76,opacity:.60,y:-1,scaleX:1.03,scaleY:1.09},{at:.9,opacity:0,y:-3,scaleX:1.05,scaleY:1.13}],0)
  ];
}
export const weatherCartridges=Object.freeze({
  'gift-cartridge-rain-check':{
    body:(p,v)=>draw(p,v,false),mini:miniature(false),silhouette:silhouette(false),
    motion:{duration:2010,layers:[...commonTracks(false),
      track('umbrella-canopy',[120.7,125.5],[{at:.15,scaleX:.95,scaleY:1.03},{at:.37,scaleX:1.33,scaleY:.71},{at:.51,scaleX:1.27,scaleY:.77},{at:.65,scaleX:1.29,scaleY:.76},{at:.82,scaleX:.98,scaleY:1.03}]),
      track('rain-runner',[120.7,125.5],[{at:.15,scaleX:.96,scaleY:1.03},{at:.37,scaleX:1.35,scaleY:.76},{at:.51,scaleX:1.25,scaleY:.81},{at:.65,scaleX:1.28,scaleY:.8},{at:.82,scaleX:.97,scaleY:1.02}]),
      ...[0,1,2].map(i=>track('typing-bead-'+(i+1),[168.5+i*12,62],[{at:.23+i*.04,opacity:0,scaleX:.65,scaleY:.65},{at:.38+i*.04,opacity:.94,y:-1.1,scaleX:1.13,scaleY:1.13},{at:.50+i*.04,opacity:.98},{at:.69+i*.02,opacity:.87,y:-.5},{at:.86,opacity:0}],0)),
      track('rain-drops',[123,122],[{at:.16,y:-1.6,opacity:.78},{at:.39,y:3.8,opacity:.96},{at:.52,y:6,opacity:.35},{at:.64,y:-1.8,opacity:.05},{at:.83,y:-.5,opacity:.75}])
    ]},
    storyboard:'The ember brightens as the wheel turns and the umbrella opens inside the blue barrel. Smoke curls from the ash tip and three typing dots appear one after another before fading.'
  },
  'gift-cartridge-second-wind':{
    body:(p,v)=>draw(p,v,true),mini:miniature(true),silhouette:silhouette(true),
    motion:{duration:1730,layers:[...commonTracks(true),
      track('return-curl',[204,80],[{at:.20,rotate:-19,scaleX:.75,scaleY:.76},{at:.46,rotate:4},{at:.62,rotate:-2},{at:.83,rotate:3}]),
      track('piston-sleeve',[118,138],[{at:.14,scaleX:1.025},{at:.39,scaleX:.71},{at:.52,scaleX:.74},{at:.72,scaleX:1.045},{at:.85,scaleX:.985}])
    ]},
    storyboard:'The indigo sleeve draws back on its shaft. The copper band stays fixed while the glowing tip sends up a lavender curl that loops into a retry arrow, then dissipates.'
  }
});
