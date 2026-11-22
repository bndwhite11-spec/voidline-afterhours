// Still Early keeps the valve wheel, dial and barrel proportions of the first
// Copium Cartridge. The shell detail is a small shutter in its nacre jacket.
const path = (d,fill,attributes='') => '<path d="'+d+'" fill="'+fill+'" '+attributes+'/>';
const line = (d,stroke,width=1.4,attributes='') => path(d,'none','stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round" '+attributes);
const ellipse = (cx,cy,rx,ry,fill,attributes='') => '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" '+attributes+'/>';
const part = (name,content,attributes='') => '<g data-part="'+name+'" '+attributes+'>'+content+'</g>';
const paint = (prefix,name) => 'url(#'+prefix+'-'+name+')';
const darkEdge = 'stroke="#354b50" stroke-width="1.8" stroke-linejoin="round"';
const pitch = 'rotate(-19 129 150)';
const barrel = 'M53 123H200C213 123 219 136 219 150S213 177 200 177H53Z';

function definitions(prefix) {
  const ramp = (name,x2,y2,stops) =>
    '<linearGradient id="'+prefix+'-'+name+'" x1="0%" y1="0%" x2="'+x2+'%" y2="'+y2+'%">'+stops.map(([offset,color])=>'<stop offset="'+offset+'%" stop-color="'+color+'"/>').join('')+'</linearGradient>';
  return '<defs>'+
    ramp('jade',6,100,[[0,'#457e76'],[12,'#a8c6a7'],[25,'#709f90'],[37,'#4b8279'],[58,'#305e60'],[72,'#406e65'],[90,'#294f52'],[100,'#243b47']])+
    ramp('rosefoil',8,100,[[0,'#e2b1a0'],[16,'#f9d8b8'],[33,'#bb8b87'],[49,'#e0b0a0'],[67,'#bc8d89'],[84,'#a47d83'],[100,'#805f6c']])+
    ramp('nacre',25,100,[[0,'#829f98'],[19,'#fcf0ce'],[36,'#e2d6c2'],[49,'#d0c7c4'],[62,'#b5c9bd'],[78,'#d1b8b9'],[100,'#839d9e']])+
    ramp('brass',20,100,[[0,'#a58b67'],[14,'#eed8a8'],[34,'#c4a884'],[51,'#aa916b'],[68,'#dec59e'],[88,'#947f66'],[100,'#746e60']])+
    ramp('nickel',75,100,[[0,'#6a8384'],[20,'#c5d3c5'],[37,'#e2dfcb'],[52,'#9ba9aa'],[74,'#738c8e'],[89,'#d1bdb2'],[100,'#a8b5af']])+
    ramp('lining',80,100,[[0,'#725466'],[33,'#bd828e'],[76,'#e2b3a3'],[100,'#927683']])+
    '<radialGradient id="'+prefix+'-opal" cx="29%" cy="25%" r="84%"><stop offset="0%" stop-color="#fff1d8"/><stop offset="28%" stop-color="#f7beb7"/><stop offset="53%" stop-color="#e99cac"/><stop offset="73%" stop-color="#bd839e"/><stop offset="100%" stop-color="#8f6d8c"/></radialGradient>'+
    '</defs>';
}

function tube(prefix,detail) {
  return path(barrel,paint(prefix,'jade'),darkEdge)+
    // Smoked glass is exposed between the two inset longitudinal nacre plates.
    path('M58 143Q79 139 105 143T153 142Q179 138 204 142L205 161Q178 171 117 166Q79 164 57 161Z','#599480')+
    line('M59 144Q79 140 106 144T152 143Q182 138 201 142','#c2d4ab',1.3)+
    path('M58 125Q76 123 105 125Q155 127 199 125Q206 127 208 133Q196 132 179 134Q140 138 101 135Q76 133 60 137Z',paint(prefix,'nacre'),'stroke="#789592" stroke-width="1.25"')+
    path('M63 127Q110 129 139 130Q172 132 196 127Q152 136 112 132Q88 130 63 130Z','#d8ddc9')+
    line('M63 127Q108 127 131 130Q173 133 197 127','#fff2d4',1.25)+
    line('M68 133Q90 130 111 134Q150 138 180 132','#a6aba7',.95)+
    path('M58 162Q83 159 110 162Q158 168 205 157L202 168Q171 178 120 174Q82 169 58 172Z',paint(prefix,'nacre'),'stroke="#819791" stroke-width="1.25"')+
    path('M68 165Q98 161 125 166Q171 173 201 162Q170 178 123 169Q88 164 68 167Z','#bdc7c0')+
    line('M65 165Q94 162 119 166Q167 174 199 162','#eae7ce',1.2)+
    line('M65 169Q89 168 114 171Q163 180 198 169','#b39d9e',.9)+
    // Short scalloped inlay sections are flush with the curved jacket.
    line('M79 125q2 5 0 10m41-9q3 4 2 10m45-9q3 2 4 7m-76 28q2 5 0 10m50-7q2 4-1 10m38-13q1 4-2 9','#8b9c98',.95)+
    (detail?line('M70 128l6-1m8 2 5-.4m37 2 7 .6m38-.5 5-.8m-55 38 7 1m8 .9 5 .4m18-.2 4-.4m21-23 3 .2','#f1e8ce',.78):'')+
    (detail?line('M84 151q4-1 9 0m-22 3 5-1m52-.5 4 1m41 1 5-1','#9ac9a6',.95):'');
}

function rearCap(prefix,detail) {
  const brass=paint(prefix,'brass'),nickel=paint(prefix,'nickel');
  return path('M194 122L203 120Q221 121 225 148Q226 175 209 181L197 180Q212 170 211 150Q211 131 194 122Z',brass,darkEdge)+
    path('M203 122L208 122Q221 129 222 150Q223 172 211 177L205 178Q218 168 217 149Q216 131 203 122Z',nickel,'stroke="#967f68" stroke-width=".8"')+
    line('M208 123q12 9 13 27q1 17-7 25','#f2dfbd',1.35)+
    path('M195 122L199 121C207 128 212 141 211 153Q211 170 200 180L196 179Q207 165 206 149Q206 132 195 122Z','#657d79')+
    line('M197 122q10 12 11 26m-1 13q-2 11-7 16','#d1d0b2',1.2)+
    (detail?line('M213 129l3-.3m1 7 3 .2m.1 7 3 .4m-2 8 3 .4m-4 7 2 .8m-6 7 2.8 1.2','#756e61',1.05):'');
}

function faceCap(prefix,detail) {
  const brass=paint(prefix,'brass');
  return path('M49 120L61 119Q74 120 76 147Q77 174 63 181L51 182Q63 163 61 149Q59 127 49 120Z',brass,darkEdge)+
    ellipse(52,151,14.8,31.6,brass,darkEdge)+
    ellipse(51,151,11.5,26.8,'#56736d','stroke="#e8d1ad" stroke-width="1.4"')+
    ellipse(50.3,151.2,8.9,23.4,paint(prefix,'jade'),'stroke="#405a58" stroke-width="1.15"')+
    path('M46.8 135Q52 129 55.5 141Q58 149 55.8 162Q55 169 51 172Q53 162 53 154Q52 142 46.8 135Z','#83a398')+
    ellipse(50.1,151.6,4.2,9.2,'#344f53','stroke="#b2b5a3" stroke-width="1.35"')+
    ellipse(50.2,151.7,2.0,5.2,'#9eaea3')+
    line('M61 123q9 10 11 25m-.8 9q-1.5 13-7 19','#f4ddaf',1.55)+
    line('M44 132q-3.8 11-2.7 23m8.8 21q3 0 6-4','#f2d5aa',1.3)+
    (detail?line('M63 125l4-1m-1 6 4-1m-1 7 3-.4m0 8 3-.2m-2 8 2 .1m-3 8 2 .5m-5 7 3 .4m-7 6 2 .7','#80765e',1.02):'');
}

function valve(prefix) {
  // The petite elbow and wheel sit in the same left-hand position as the legacy
  // cartridge. Its pipe, unlike the vapor, remains a solid piece of hardware.
  const elbow='M76 122V112Q76 106 70 106H56Q49 106 49 102V98';
  const vent='M59 107L58 96Q58 89 63 86L65 85';
  return line(elbow,'#455555',7.8)+line(elbow,paint(prefix,'brass'),5.4)+
    line('M73.7 120v-7q0-4-5-4H60','#d0c59f',1.1)+
    line(vent,'#4d5c59',5.6)+line(vent,paint(prefix,'nickel'),3.5)+
    path('M62.8 82.8l3.9 3.4-1.3 2.2-4.3-3.3Z','#9fae9c','stroke="#526762" stroke-width=".8"')+
    path('M68.5 119l11.2-.4 3.1 5.5-12.9 1.6Z',paint(prefix,'brass'),darkEdge)+
    part('rose-wheel',
      ellipse(50,101,10.8,10.8,'none','stroke="#405c58" stroke-width="4.6"')+
      ellipse(50,101,10.8,10.8,'none','stroke="#ddc5a3" stroke-width="2.8"')+
      line('M50 91v19.7m-8.3-14.5 16.7 9.5m-16.7 0 16.7-9.5','#c8b495',2.3)+
      ellipse(50,101,3.35,3.35,paint(prefix,'nickel'),'stroke="#52635e" stroke-width="1"')+
      line('M48.4 100.4l2.9 1.6','#5f6c63',.85))+
    line('M43.2 93.1q3-2.9 6.6-3.0','#fae7c3',1.15);
}

function dial(prefix,detail) {
  return ellipse(111.5,149.8,19.5,20.3,'#28474d','opacity=".58"')+
    ellipse(112,147.5,18.9,19.8,paint(prefix,'nickel'),darkEdge)+
    ellipse(112,147.5,15.8,16.55,'#efe8d4','stroke="#9fa79a" stroke-width="1.2"')+
    line('M99.6 149.4C97.4 141.7 102.9 134.8 109.5 134.1Q119.2 132.7 123.9 141.2','#64756b',1.5)+
    line('M117.9 135.9q3.5 1.7 6 5.2','#ad756f',2.0)+
    line('M99.8 146.2l2.3.2m-.7-6.5 2 1.5m2.7-6.1.95 2.4m4.6-3.6v2.3m5.3-1.2-.9 2.1m5.2.9-1.5 1.9','#465a57',1.12)+
    part('dial-needle',path('M109.6 148.4L118.8 138.6L113.6 150.2Z','#8e514f')+
      ellipse(112,148.5,2.2,2.25,paint(prefix,'brass'),'stroke="#69736a" stroke-width=".8"'))+
    line('M105 155.4q6 1.7 12 .1','#979483',1.25)+
    (detail?line('M107 157.5l1.6.4m.9.1 1.9.1m1.4 0 2-.2','#8c897b',.65):'')+
    line('M98.4 137q3.3-5.3 8-6.5','#fff0d6',1.35);
}

function opalWindow(prefix,detail) {
  const rim='M139 143Q144 130 159 127Q175 125 185 134Q190 140 188 148Q185 158 169 162Q152 166 141 157Q136 152 139 143Z';
  const shutter='M140 144Q140 139 144 137Q143 133 148 132Q149 128 155 129Q159 125 164 127Q169 124 174 128Q181 128 182 132Q187 133 186 137L162 145Q152 148 140 146Z';
  return path(rim,paint(prefix,'brass'),'stroke="#536867" stroke-width="1.45"')+
    path('M143 143Q146 132 160 130Q175 127 183 136Q189 146 180 152Q164 164 148 157Q140 153 143 143Z',paint(prefix,'lining'),'stroke="#8e7279" stroke-width="1.1"')+
    ellipse(164,152,13,3.6,'#956f76')+
    part('rose-opal',
      path('M152 148Q150 141 158 137Q169 133 173 142Q177 149 169 153Q157 158 152 148Z',paint(prefix,'opal'),'stroke="#946f80" stroke-width=".9"')+
      path('M155 146q10 4 17-2-4 8-13 7Z','#afc5c3','opacity=".72"')+
      line('M154.2 143.6q1.2-4 6-5.3','#fff9df',1.55)+
      part('rose-flash',path('M153 146q6 4 15 .5l4-2q-6 8-15 6Z','#fff4d4'),'opacity=".16"'))+
    part('shell-shutter',
      path(shutter,paint(prefix,'nacre'),'stroke="#8d9792" stroke-width="1.12"')+
      path('M142 141l17 2-12-9 12 6-6-10 8 8 1-10 2 9 8-8-6 10 13-7-10 8 13-3-19 7Z','#acc0b6')+
      line('M145 136l14 6m-7-11 8.8 9m1.4-11.3.5 9.2m11.3-8.4-8.1 10.3m16-7.1-12.4 7.3','#f7e9ce',1.03)+
      line('M142 145Q153 146 164 142Q177 137 184 137','#ecdfc8',1.3))+
    path('M139 144l3-.7 1.5 2.5-1.8 2.5-3 .5-1.2-2.4Z',paint(prefix,'nickel'),'stroke="#6e807c" stroke-width=".85"')+
    line('M146 156q10 7 22 3.2m11.5-4.7 3-2','#f0dcc4',1.2)+
    (detail?line('M185 142v1.5m-43 9 .8 1','#bc9a84',.85):'');
}

// The lip is dark horn over a nickel shoulder. The center bore remains visible
// in the same perspective as the original cartridge's circular near end.
function mouthpiece(prefix) {
  return path('M49 142Q48 144 48 152Q48 160 50 164L38 163Q33 162 31 153Q30 147 33 144Z',paint(prefix,'nickel'),'stroke="#496268" stroke-width="1.25"')+
    path('M39 143L34 144L24 146Q20 146 21 151L22 156Q23 159 27 158L37 160L41 162Q38 155 38 150Q37 146 39 143Z','#394f53','stroke="#30444a" stroke-width="1.35"')+
    ellipse(24.3,152.0,2.7,6.15,'#78918c','transform="rotate(-8 24.3 152)"')+
    ellipse(24,152.3,1.05,3.75,'#243942','transform="rotate(-8 24 152)"')+
    line('M27 147.4l7.2-1.2m8.8-1.3 3.4-1','#aac1ac',1.08);
}

function cigarBand(prefix,detail) {
  return path('M95 124Q99 122 106 123L120 123Q126 146 122 175L115 176L99 173Q102 147 95 124Z',paint(prefix,'rosefoil'),'stroke="#957d74" stroke-width="1.2"')+
    line('M98 125q6 19 3.7 44m16-44q6.4 23 2.4 47','#f3d6b2',1.35)+
    line('M100.4 125q6 19 3.7 40m10.5-39q6.4 20 3.8 42','#9e7676',.9)+
    path('M104 125l5 3.6 4-3-.4 2.5-3.4 3.3-5.1-4.4Zm2 43 5.4-3 5 2.7-.2 2-4.9-2.1-5.1 3.4Z','#f2d6b9')+
    (detail?line('M102.2 127.5l1.9 1.5m12.4 41-2.9-.9m-8.9 3-.6 1.1','#f3ddc5',.85):'');
}

// A short, grey ash crown on the far end has its own irregular contour. The
// ember seam sits between the ash and ferrule, following the far cap ellipse.
function ember(prefix,detail) {
  return path('M212 122Q218 120 221 125L224 125L225 131L228 134L227 138L230 142L228 149L231 154L228 157L228 162L223 166L222 171L216 173L211 177L207 177Q218 164 217 146Q217 132 212 122Z','#847f82','stroke="#555965" stroke-width="1.4" stroke-linejoin="round"')+
    path('M214 123Q219 127 222 132L224 133L224 136L226 140L222 139L219 133ZM224 146l4 1-2 6-4 2 1.8-5Zm-5 12 5-2-.7 6-4.9 5-2.2-1.5Zm-4.3 13.1 4.1-2.4-1.1 3-6 3.3Z','#c1b6ab')+
    path('M217 125l4 1 1 4-2.8-.7Zm9 12.5-1 3.5 2.5 2 .7-2.5Zm-.8 17.8-2.9 1.5-.4 5 1.4.1 2.5-4.2Z','#5d6268')+
    line('M211.4 123q6.4 7.2 7.1 17.2m.5 3.7q.7 10.8-3.0 21.4m-1.1 3.6-3.4 4.9','#de9b81',2.8)+
    part('tip-ember',line('M211.4 123q6.4 7.2 7.1 17.2m.5 3.7q.7 10.8-3 21.4m-1.1 3.6-3.4 4.9','#ffbb8d',2.15)+line('M215.2 129l3.8 4.0 3.9.8m-4.1 15.7 4.1 1.4 1.5-3.1m-6.4 11.4 1.7 1.2','#fb9f8a',1.28),'opacity=".54"')+
    (detail?line('M221 126l1.5 1.1m2.8 8.2 1.1 1.4m-1 6.2.1 1.2m-2.2 11.8-.5 1.7m-4.5 8.1-1.9 2.0','#e4cdb9',.86):'');
}

function smoke() {
  // Rises from the hot upper edge. Inside the large curl a brief fall and an
  // upswing resemble a price chart, without drawing an axis or a graphic arrow.
  return part('chart-smoke',
    path('M219 128C227 120 219 116 216 112C210 106 211 99 216 95C222 91 225 89 224 84C223 80 219 78 217 76C228 80 231 87 225 93C221 98 215 100 216 105C217 110 225 116 224 121Q224 126 219 128Z','#deb4bd','opacity=".72"')+
    path('M216 105Q209 97 214 91L222 82Q223 80 225 82L229 87Q231 89 233 86L242 71Q246 65 249 61Q247 69 243 76L234 91Q230 96 227 92L223 87L217 94Q212 99 216 105Z','#efbdc4','opacity=".88"')+
    line('M220 125q5-5-.4-10m-5.7-15q-.3-4.3 2.4-7.0m18.2-7.5 5.3-9.4','#f5dad1',1.4,'opacity=".85"'),
    'opacity=".08"')+
    path('M219.5 127Q225 121 220.5 116Q218 113 220 110Q220 113 222.6 116.9Q226.1 122 219.5 127Z','#d3b2b8','opacity=".6"');
}

function body(prefix,variant) {
  const detail=variant==='detail';
  return definitions(prefix)+ellipse(133.5,207,73,4.1,'#15232b','opacity=".22"')+
    ellipse(127,206,46,2.1,'#1a2a30','opacity=".23"')+
    '<g transform="'+pitch+'">'+smoke()+tube(prefix,detail)+rearCap(prefix,detail)+ember(prefix,detail)+valve(prefix)+faceCap(prefix,detail)+mouthpiece(prefix)+cigarBand(prefix,detail)+dial(prefix,detail)+opalWindow(prefix,detail)+'</g>';
}

const mini = '<g transform="rotate(-19 12 13.6)">'+
  path('M4.2 11.1H19.5q1.8 0 2 2.5.2 2.7-1.5 3.4H4.6Z','#528a7d','stroke="#385956" stroke-width=".75"')+
  path('M5.5 11.2h14l.6 1.3q-7.4 1.1-14.5.1Zm.3 4.8q7.9-.7 14.5-1.2l-.8 1.7-13.5.4Z','#e6d9c6')+
  path('M18.7 10.9l1.4-.2q2 .2 2.2 3.1.1 2.9-1.7 3.6h-1.4q1.8-2 .9-4.9Z','#c4ac89','stroke="#576967" stroke-width=".55"')+
  ellipse(5,14.14,1.75,3.33,'#c0a789','stroke="#475956" stroke-width=".6"')+
  ellipse(4.9,14.1,.81,2.21,'#63887e')+
  path('M4.9 13.4l-2 .1-1.1.3.2.9 1.3.2 1.6.2Z','#415958','stroke="#647f78" stroke-width=".34"')+
  path('M20.3 10.8l.7-.2.3.5.5.3.1.6.4.7-.1.6.3.5-.2.6.05.8-.6.7-.7.3q1.2-1.3 1-3.4-.2-1.3-.9-2Z','#9b9793')+
  line('M20.5 11.4q1.55 2.2.55 4.6','#e6a08b',.38)+
  path('M9.8 11l1.9.1q1.1 2.5.2 5.6l-1.8-.1q.9-2.6-.3-5.6Z','#d5a99c')+
  line('M6.8 11.2v-1.1q0-.8-1-.8h-1','#ac9f82',.86)+
  ellipse(4.45,8.57,1.1,1.05,'none','stroke="#d5bd95" stroke-width=".73"')+
  ellipse(11.2,13.65,1.75,1.85,'#f3e8d1','stroke="#667873" stroke-width=".6"')+
  line('M11.2 13.8l.8-.95','#915f61',.44)+
  ellipse(16.1,13.7,1.95,1.30,'#eea9b7','stroke="#bda19a" stroke-width=".45"')+
  line('M14.7 13.4l1.5-.65.9.13','#f2e4cf',.43)+'</g>';

const silhouette='<g transform="'+pitch+'">'+path(
  'M52 120L65 120Q67 120 69 122H194L201 120Q209 117 216 125Q226 135 226 151Q226 176 209 181L197 180L65 180Q56 184 50 182Q35 179 36 149Q36 128 47 121Z '+
  'M69 124L68 119H72V113Q72 110 68 110H56L52 112Q44 115 39 107Q33 94 45 89Q56 84 61 94Q61 87 65 84L68 87Q63 90 62 98V103H70Q80 103 80 112V119L83 124Z',
  '#10161d','fill-rule="nonzero"')+
  path('M51 142l-15 1-13 3q-4 0-2 10l3 3 14 1 13 4Z M213 122l7 .6 4 4 .8 5 3 4-.7 3 2.4 4-.8 6 2 5-3.4 5-.7 4-3.3 3-2.9 6-4.7 1.7-5 4.3-6 1.2Z','#10161d')+'</g>';

export const pearlCartridges = {
  'gift-cartridge-last-resort': {
    body,mini,silhouette,
    storyboard:'The ivory dial ticks up. Its scalloped shutter uncovers a pink opal while a rose-colored puff climbs, dips and climbs again from the lit tip. The smoke fades and the shutter seats itself.',
    motion:{
      duration:2210,
      layers:[
        {name:'chart-smoke',origin:[219,128],frames:[{at:0,opacity:.08},{at:.14,scaleX:.5,scaleY:.2,opacity:0},{at:.32,scaleX:.72,scaleY:.65,opacity:.78},{at:.51,scaleX:1,scaleY:1,opacity:1},{at:.61,scaleX:1.04,scaleY:1.01,opacity:.9},{at:.78,x:2,y:-2,scaleX:1.10,scaleY:1.045,opacity:.27},{at:.91,x:3,y:-4,opacity:0},{at:1,opacity:.08}]},
        {name:'tip-ember',origin:[219,145],frames:[{at:0,opacity:.54},{at:.16,opacity:.66},{at:.31,opacity:1},{at:.55,opacity:.93},{at:.77,opacity:.68},{at:1,opacity:.54}]},
        {name:'rose-wheel',origin:[50,101],frames:[{at:0},{at:.10,rotate:5},{at:.28,rotate:-48},{at:.58,rotate:-48},{at:.82,rotate:4},{at:1}]},
        {name:'dial-needle',origin:[112,148.5],frames:[{at:0},{at:.18},{at:.40,rotate:33},{at:.53,rotate:27},{at:.72,rotate:18},{at:.88,rotate:-3},{at:1}]},
        {name:'shell-shutter',origin:[154,130],frames:[{at:0},{at:.14,scaleY:1.03},{at:.37,scaleY:.33,rotate:-5},{at:.64,scaleY:.35,rotate:-5},{at:.83,scaleY:1.04},{at:1}]},
        {name:'rose-opal',origin:[164,150],frames:[{at:0},{at:.23},{at:.44,x:.8,y:-4.5,rotate:-9},{at:.56,x:1,y:-4,rotate:-7},{at:.69,x:.4,y:-3.2,rotate:-4},{at:.83,scaleY:.96,scaleX:1.02},{at:1}]},
        {name:'rose-flash',origin:[164,145],frames:[{at:0,opacity:.16},{at:.29,x:-1.3,opacity:.05},{at:.47,x:.1,y:-.4,opacity:.95},{at:.63,x:1.4,opacity:.29},{at:.80,opacity:.06},{at:1,opacity:.16}]}
      ]
    }
  }
};
