/** Studio 01. Coordinates describe each object in its 256-unit resting pose.
 * The retained raster is shown once or through local, object-shaped apertures.
 * Each moving part has an authored attachment point in that same coordinate space.
 */
const layer = (name, origin, poses) => ({name, origin, frames: [{at: 0}, ...poses, {at: 1}]});
const p = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (d, color, width = 1.5) => p(d, 'none', `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`);
const ellipse = (x,y,rx,ry,fill) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const part = (name, shape, options = '') => `<g data-part="${name}" ${options}>${shape}</g>`;
const use = (id, clip) => `<use href="#${id}-source"${clip ? ` clip-path="url(#${id}-${clip})"` : ''}/>`;
const clip = (id, name, shape) => `<clipPath id="${id}-${name}">${shape}</clipPath>`;
const image = (id, uri, x=0, y=0, size=256) => `<image id="${id}-source" x="${x}" y="${y}" width="${size}" height="${size}" href="${uri}"/>`;
const paint = (id,name) => `url(#${id}-${name})`;
function lighting(id) {
  const gradients = {
    silver: ['#edf6f2','#9fb9bb','#4c636d','#c8dbd8','#6b8790'],
    steel: ['#96afb2','#42535e','#202d37','#617883','#2e3c49'],
    brass: ['#fff0b9','#d3ad65','#8d6438','#d9b775','#a87d45'],
    paper: ['#fcf1ca','#ead3a9','#dcbe8d','#c4a170'],
    enamel: ['#51716a','#2e4949','#203941','#182c35']
  };
  return Object.entries(gradients).map(([name, colors]) =>
    `<linearGradient id="${id}-${name}" x1="0%" y1="0%" x2="65%" y2="100%">${colors.map((color,i)=>`<stop offset="${Math.round(100*i/(colors.length-1))}%" stop-color="${color}"/>`).join('')}</linearGradient>`).join('');
}
const dots = (x,y,rx,ry,from,to,count,r,color) => Array.from({length:count},(_,i)=>{
  const a=(from+(to-from)*i/(count-1))*Math.PI/180;
  return ellipse((x+rx*Math.cos(a)).toFixed(2),(y+ry*Math.sin(a)).toFixed(2),r,r,color);
}).join('');
const shadow = (x,y,rx,ry) => ellipse(x,y,rx,ry,'#131b20') + ellipse(x,y-1,rx*.65,ry*.52,'#0b1117');
function initials(x,y,copy,color,size=6) {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" letter-spacing="1.5" font-weight="bold" fill="${color}">${copy}</text>`;
}

const roseHead = 'M151 43 Q172 34 196 42 L218 55 232 76 245 101 247 124 234 149 213 166 183 163 159 150 144 131 139 105 137 85 145 62Z';
function rose(id, uri, detail) {
  const silver=paint(id,'silver'),steel=paint(id,'steel');
  const rightLeaf='M107 158Q128 128 156 136Q142 158 111 159Z';
  const leftLeaf='M98 172Q72 169 58 144Q79 143 99 169Z';
  const rimLeft='M119 97Q98 86 94 63Q111 44 134 58Q120 70 124 92Z';
  const rimRight='M149 103Q174 98 182 75Q170 57 153 61Q165 77 149 103Z';
  const veins=line('M66 149L96 168M76 153L75 149M83 158L83 153M114 155L146 140M124 151L124 146M131 147L139 147','#b6ced0',1.3);
  const stem=p('M77 224Q96 195 103 162Q112 119 134 91L138 93Q117 122 109 165Q101 201 80 226Z',silver,'stroke="#536c73" stroke-width="1.4"')
    +p(leftLeaf,steel,'stroke="#8da8a9" stroke-width="1.4"')+p(rightLeaf,steel,'stroke="#8da8a9" stroke-width="1.4"')+(detail?veins:'')
    +line('M101 174l-5-8 7 3M111 141l8-8-5 9','#9a9f87',2)
    +line('M78 222l5 2M80 218l5 2M82 214l5 2','#c2a972',2.3);
  const bloom=part('outer-petal-left',p(rimLeft,steel,'stroke="#97b0b0" stroke-width="1.8"')+line('M98 65Q107 66 116 79','#e0e9df',2))
    +part('outer-petal-right',p(rimRight,silver,'stroke="#687e87" stroke-width="1.5"'))
    +`<g transform="translate(-39 -9) scale(.9)">${use(id,'bloom')}</g>`
    +p('M105 115Q118 125 132 120L143 110Q139 126 130 134L121 128Z','#677f7a')
    +line('M113 118L128 126L136 117','#c7d9ca',1.6)
    +part('petal-light',line('M114 69Q123 56 133 56M139 57l4 2','#fdfaea',2.2),'opacity="0"');
  return `<defs>${lighting(id)}${image(id,uri)}${clip(id,'bloom',p(roseHead,'white'))}</defs>${shadow(94,228,32,3)}${part('stem',stem+part('bloom',bloom))}`;
}
function star(id,uri,detail) {
  const outline='M128 25L154 100 234 100 170 148 195 226 128 179 62 226 86 148 22 100 102 100Z';
  const edge=p(outline,paint(id,'brass'),'stroke="#825e3d" stroke-width="3" stroke-linejoin="round" transform="translate(0 5)"');
  const seam=line('M64 222l24-74-14-10M193 221l-24-74 43-32','#a67e41',1.6);
  const engraving=detail?line('M125 57l4-13M153 109l25-2M105 152l-6 16','#f8e8ac',1.3):'';
  const flash=part('polish',p('M54 88L60 84 148 191 142 194Z','#fff5c0')+p('M69 80L70.8 79 161 184 159.3 185Z','#fffced'),'opacity="0"');
  return `<defs>${lighting(id)}${image(id,uri,9,9,238)}${clip(id,'rim',p(outline,'white'))}</defs>${shadow(131,231,53,4)}${part('star',edge+use(id)+seam+engraving+`<g clip-path="url(#${id}-rim)">${flash}</g>`)}`;
}
function cassette(id,uri,detail) {
  // These centers belong to Fyrsten’s 512px source. The holes in the shell are
  // the same two circles as the rotating reel masks, including transparent teeth.
  const left=[77.75,119],right=[175.75,119.25],r=13.76;
  const circles=[left,right].map(([cx,cy])=>`M${cx-r} ${cy}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`).join('');
  const label = initials(127,87,'AFTERHOURS', '#203c44',9)
    +line('M39 93H99M155 93H216','#739a9e',1.8)
    +(detail?initials(129,161,'MAGNETIC TAPE  ·  90','#a8c1b9',4.5):'');
  const caseEdge=p('M20 55H236Q242 55 242 62V193Q242 201 235 202H21Q14 201 14 194V62Q14 55 20 55Z',paint(id,'steel'),'stroke="#8a9d9d" stroke-width="1.6"');
  return `<defs>${lighting(id)}${image(id,uri)}${clip(id,'shell',`<path clip-rule="evenodd" fill-rule="evenodd" d="M0 0H256V256H0Z${circles}"/>`)}${[left,right].map(([cx,cy],i)=>clip(id,'reel-'+i,`<circle cx="${cx}" cy="${cy}" r="${r}"/>`)).join('')}</defs>${shadow(130,208,79,4)}${caseEdge}${part('web-panel-0',use(id,'shell')+label)}${part('web-panel-1',use(id,'reel-0'))}${part('web-panel-2',use(id,'reel-1'))}`;
}
function ghost(id,uri,detail) {
  const paper=paint(id,'brass');
  const outline='M75 150L62 124 77 96 87 58 130 35 168 47 179 76 177 106 197 132 187 147 166 133 155 162 131 171 110 158 87 173Z';
  const face='M104 72L129 57 156 63 165 86 152 107 123 115 105 98Z';
  const tail=p('M112 145L164 138 151 179 137 175 118 202 110 197 88 217 96 183 91 173Z',paper,'stroke="#866f40" stroke-width="1.8"')
    +p('M112 150L130 173 88 217 102 179Z','#b68f49')+line('M102 180L121 162M116 190L138 165','#f2d991',1.5);
  const planes=p(outline,paper,'stroke="#8d744b" stroke-width="2.5" stroke-linejoin="round"')
    +p('M87 58L130 35 113 78 76 113Z','#ffe6a6')+p('M130 35L168 47 153 70 113 78Z','#e4be72')
    +p('M171 74L177 106 197 132 164 119Z','#bf9858')+p('M62 124L88 108 107 152 87 173 73 147Z','#dcc58b')
    +p('M104 107L126 122 131 171 110 158Z','#efd198')+line('M76 98L85 112 104 108M131 169L126 121 154 112M165 132l8-18','#ffdf9a',1.5);
  const facePhoto=`<g clip-path="url(#${id}-face)" filter="url(#${id}-fold-tone)">${use(id)}</g>`;
  return `<defs>${lighting(id)}${image(id,uri,-22,56,253)}<filter id="${id}-fold-tone" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".29 .71 0 0 .08  .22 .64 0 0 .10  .14 .44 0 0 .10  0 0 0 1 0"/></filter>${clip(id,'face',p(face,'white'))}</defs>${shadow(123,225,44,3)}${part('paper-body',part('paper-tail',tail)+planes+facePhoto+(detail?line('M88 76l11-8M86 81l7-5','#b89b67',1.3):''))}`;
}
function letter(id,uri,detail) {
  const paper=paint(id,'paper'),body='M41 93L206 81 214 178 49 191Z';
  const hinge=part('letter-flap','<g transform="translate(0 91) scale(1 .22) translate(0 -91)">'+p('M41 96L207 82 161 66 121 50 82 69Z','#bda47b','stroke="#876e4e" stroke-width="2"')+line('M47 94L123 56 199 81','#eadab2',1.8)+'</g>');
  const insert=part('letter-insert',p('M55 106L193 95 194 78 54 89Z','#ede8cb','stroke="#bca984" stroke-width="1.4"')+line('M64 95l69-5M158 88l25-2','#768f8c',1.5));
  const face=p(body,paper,'stroke="#ab946d" stroke-width="2"')+p('M42 95L129 149 207 83 125 119Z','#baa07b')
    +p('M49 189L103 128 128 141 153 123 214 177Z','#e3c7a0')+line('M50 188L104 130M152 124l60 53','#b8a280',1.5)
    +line('M54 181l47-46M156 130l46 40','#f1d9ad',1.2);
  const lid=part('seal-flap',p('M42 94L206 82 139 138Q129 146 119 139Z','#f0dabb','stroke="#b6a183" stroke-width="1.5"')
    +p('M44 94L202 83 126 128Z','#f4e4c5')
    +part('wax',p('M108 127Q110 113 128 112Q143 108 149 121Q158 132 145 140Q131 146 115 142Q105 137 108 127Z','#672f34')+use(id,'seal')));
  const stitching=detail?line('M60 169l7-7m-3 9l7-7M182 102l8-7','#bc9c78',1.3)
    +line('M60 177l25-2m-24 5l14-1','#aa936f',1)
    +`<g transform="rotate(-5 178 161)">${line('M165 158h24m-24 3h24','#ab8b71',.8)}${ellipse(177,160,6.2,6.2,'#d4ba98')}${initials(177,162,'A','#85735d',6)}</g>`:'';
  return `<defs>${lighting(id)}${image(id,uri,21,21,218)}${clip(id,'seal',p('M108 126Q110 115 125 113Q142 108 149 121Q157 132 144 140Q130 147 114 140Q106 136 108 126Z','white'))}</defs>${shadow(136,196,64,3)}${hinge}${insert}${face}${lid}${stitching}`;
}
function token(id,uri,detail) {
  const rim=paint(id,'brass'),steel=paint(id,'steel'),field=paint(id,'enamel');
  const back=ellipse(131,137,77,81,steel)+dots(131,137,75,78,7,166,32,1.2,'#92a19d');
  const disk=ellipse(126,127,77,80,rim)+ellipse(126,127,70,73,'#584c35')+ellipse(126,127,68,71,field);
  const inset=ellipse(126,127,53,55,'#789087')+ellipse(126,127,51.6,53.6,'#2f4648');
  const engrave=dots(126,127,61,63,199,340,27,1.2,'#d5c29a')+dots(126,127,61,63,10,170,31,1.1,'#968766');
  const mark=use(id)+line('M111 165l24-1','#6e847a',1);
  const copy=detail?initials(126,186,'BLOCK ZERO','#e3cd97',5.1):'';
  const flash=part('rim-light',line('M59 107Q65 77 88 62','#fff1ba',2.8),'opacity="0"');
  return `<defs>${lighting(id)}${image(id,uri,77,78,99)}</defs>${shadow(132,223,52,4)}${part('medal',back+disk+inset+engrave+mark+copy+flash)}`;
}
function tab(id,uri,detail) {
  const pins=p('M67 181L72 182 71 201 67 205 65 202Z M179 174L183 175 184 193 179 197Z',paint(id,'brass'));
  const shell=p('M45 148L69 133 208 127 220 152 209 181 64 195 37 175Z',paint(id,'steel'),'stroke="#708287" stroke-width="2"')
    +p('M44 170L66 183 209 170 205 182 66 195 39 177Z','#2a363e')+line('M47 169L66 179 208 167','#a0b1ad',2);
  const switchPart=part('switch',p('M70 139L182 127 192 154 84 167Z','#9a6951')+p('M79 151L189 139 183 158 86 168Z','#bd9c78')+line('M88 161l87-9','#e2bd86',2));
  const cap=part('keycap',use(id)+line('M59 136l10 3M184 99l3 10','#cfc3a6',1.2));
  const copy=detail?initials(141,180,'SWITCH  /  01','#d7d1b6',5.2)+line('M56 169l10 5 14-1 M184 163l14-1 6-6','#b7976b',1.2):'';
  return `<defs>${lighting(id)}${image(id,uri,18,-5,213)}</defs>${shadow(139,208,62,3)}${pins}${shell}${switchPart}${cap}${copy}`;
}
function pin(id,uri,detail) {
  const plate='M126 39L192 77 192 159 126 198 60 159 60 77Z';
  return `<defs>${lighting(id)}${image(id,uri,69,63,115)}</defs>${shadow(131,207,40,3)}${part('pin',p(plate,paint(id,'steel'),'transform="translate(3 5)"')+p(plate,paint(id,'silver'))+p('M126 45L186 80V155L126 191 66 155V80Z',paint(id,'enamel'))+use(id)+(detail?line('M74 85v26M176 149l-24 14','#b5c6b8',1.4):''))}`;
}

const roseMini = p('M5.6 22.7Q10.8 17.3 12.3 10.3','none','stroke="#404b4e" stroke-width="2.7" stroke-linecap="round"')+line('M5.6 22.7Q10.8 17.3 12.3 10.3','#c0c9ba',1.5)
  +p('M9 18Q3 17 3 13Q8 12 9 18Z','#7f9a8f','stroke="#45595a" stroke-width=".65"')+p('M10 16Q12 12 17 13Q16 16 10 16Z','#829e87')
  +p('M8 9L7 5 10 3 11 1.6 15 2 17 1.9 19 4.4 20 7 18 10.9 15 12.6 11.5 12.3Z','#d7ded6','stroke="#394751" stroke-width="1"')
  +p('M9 5Q10 9 14 9L12.5 11.2Q9.4 10.7 8.8 8ZM13 3.5L16.5 3.7 18 6 15.6 7.5 12.5 7 11.4 5.1 13.8 4.4 15.7 5.6 13.7 6.1 15.3 6.4 16.3 5.7 14.4 4Z','#738991')
  +line('M10 4.5l1.2-1M17 8.3l1-1.2','#fffaf0',.9);
const starMini=p('M12 1L15.1 8.3 23 9 17 14.7 18.7 22.6 12 18.3 5.2 22.6 6.8 14.7 1 9 8.9 8.3Z','#d1a633','stroke="#846129" stroke-width=".8"')+p('M12 2L12 13 2.4 9.2 9 8.9Z','#ffe57c')+p('M12 13L21.9 9.4 16.3 14.5 18 20.7Z','#f4cb49')+p('M12 13L11.9 17.9 6.5 21Z','#8c6a31');
const cassetteMini=p('M1.1 5h21.8v14H1.1Z','#35454e','stroke="#81949a" stroke-width="1.1"')+p('M3 7h18v6.9H3Z','#a7d2cd')+p('M5.8 8.2h12.6v4.8H5.8Z','#273439')+ellipse(7.7,10.6,1.4,1.4,'#f1e4c6')+ellipse(16.2,10.6,1.4,1.4,'#f1e4c6')+line('M6 16.7h12','#91a2a4',1.1);
const ghostMini=p('M3.1 16.5l1.4-5.8L5 6.8 9.2 3l6.7-.6L19.7 6l-.2 4.3 2.6 4.4-2.7 1.2-2.4-1.6-3.7 5.2-2.1-1.4-5.4 4.2.5-5.1Z','#e7bf62','stroke="#765e34" stroke-width=".85"')+p('M5.1 6.9L9.4 3 15.6 2.5l-4.2 3.6Z','#ffdd85')+p('M7.7 13.4l3.9 2.9-5.2 5.5Z','#b98d42')+p('M8.5 8.1l2.7.6-.3 1.7-2.2-.2zm5.5.3l2.1-.8.2 2-2.1.6Z','#463e38')+line('M10.9 12.8q1.3-1.4 2.8-.6','#5f4f37',1.1);
const letterMini=p('M1 6.7L22 5l1 12.3-21 1.8Z','#e9d6ac','stroke="#937d5f" stroke-width="1"')+line('M2.5 7.1l10 5.8 9-7M2.8 17.5l6.1-6M21.7 16.5l-5.8-4.3','#a79069',1)+ellipse(12.4,12,3,2.8,'#8e4442')+line('M11.3 11.7q1.6-1.4 2.5-.3','#d99278',.75);
const tokenMini=ellipse(12.3,12.5,10.1,10.4,'#705d3b')+ellipse(11.9,11.6,10.2,10.2,'#d8b675')+ellipse(11.9,11.6,7.8,7.8,'#344d4f')+p('M7 9.6l4.8-2.5 5 2.4-4.9 2.3Z','#e8d3a3')+p('M7 10.6l4.1 2v4.6l-4.1-2Z','#a9b1a1')+p('M12.4 12.8l4.3-2v4.4l-4.3 2Z','#738984');
const tabMini=p('M2 7.3l17.8-1.7 2.8 2.5-.2 9.5-18.8 2.1L1.5 17Z','#47575c','stroke="#273439" stroke-width=".8"')+p('M2.6 6.3l16.8-1.5 1.9 1.6-.7 8.6-17.2 1.7Z','#ccc5ac','stroke="#7e8076" stroke-width=".9"')+line('M6.7 10.8l-1.8-1.1 2-1.7M5.6 9.7l7-.6M15.1 10.4l2 1.1-1.9 2M16.5 11.5l-5.3.5','#525955',1);
const pinMini=p('M12 1.2l9 5.3v10.7L12 23l-9-5.8V6.5Z','#a6b7b5','stroke="#56666d" stroke-width="1"')+p('M12 3l7.4 4.3v8.9L12 21l-7.3-4.8V7.3Z','#2a454b')+p('M12 5.1l3.2 1.9v3.7L12 12.6l-3.2-1.9V7Zm-3.7 6.2 3.1 1.9v3.6l-3.1 1.8-3.1-1.8v-3.6zm7.3 0 3.1 1.9v3.6l-3.1 1.8-3.1-1.8v-3.6Z','none','stroke="#c7dad4" stroke-width="1"');
function object(mini,body,material,alt,story,duration,layers) {return {mini,body,material,alt,story,duration,layers};}
export const studioObjects = {
  'gift-rose':object(roseMini,rose,'Plated botanical silver, etched leaf and brass binding','A silver rose on a curved, wire-bound stem. Its photographed bloom sits inside two polished outer petals.','The stem draws back, the two outer petals unfold at their sockets, a highlight catches the bloom, and the leaf settles.',1720,[
    layer('stem',[80,224],[{at:.20,rotate:-4},{at:.49,rotate:4.8},{at:.74,rotate:-1.6}]),
    layer('bloom',[130,123],[{at:.22,rotate:-3},{at:.55,rotate:2}]),
    layer('outer-petal-left',[123,104],[{at:.19,rotate:3},{at:.55,rotate:-17},{at:.77,rotate:-7}]),
    layer('outer-petal-right',[151,104],[{at:.23,rotate:-3},{at:.58,rotate:16},{at:.79,rotate:5}]),
    layer('petal-light',[131,66],[{at:.27,opacity:0,x:-4},{at:.52,opacity:.91,x:3},{at:.72,opacity:0,x:7}])]),
  'gift-star':object(starMini,star,'Faceted gilt brass with a satin edge','A five-point gold star with raised facets, a beveled edge and one traveling reflection.','The star tilts back, rolls across its bevel and catches a narrow glint before settling on the same five points.',1430,[
    layer('star',[127,134],[{at:.20,rotate:-5,scaleX:.96},{at:.52,rotate:9,scaleX:.89,y:-5},{at:.76,rotate:-2,y:1}]),
    layer('polish',[128,130],[{at:.23,opacity:0,x:-55},{at:.47,opacity:.64,x:4},{at:.70,opacity:0,x:83}])]),
  'gift-cassette':object(cassetteMini,cassette,'Graphite cassette shell, ferric tape and ice-blue label','A black Side A cassette with an ice-blue Afterhours label and two visible tape reels.','The fixed recorder shell holds its position. The two hubs take up slack, turn at different rates, and settle with the teeth aligned.',1540,[
    layer('web-panel-1',[77.75,119],[{at:.14,rotate:-8},{at:.48,rotate:95},{at:.70,rotate:72},{at:.90,rotate:8}]),
    layer('web-panel-2',[175.75,119.25],[{at:.19,rotate:-5},{at:.54,rotate:68},{at:.76,rotate:54},{at:.93,rotate:5}])]),
  'gift-ghost':object(ghostMini,ghost,'Folded gold foil and ink','A gold-paper ghost with a broad folded hood, an ink frown and a little trailing paper tail.','The hood draws down, the ghost leans into a small upward drift, then the loose tail follows the body back to rest.',1620,[
    layer('paper-body',[124,171],[{at:.19,rotate:-4,y:3},{at:.48,rotate:7,y:-10},{at:.74,rotate:-2,y:1}]),
    layer('paper-tail',[126,151],[{at:.27,rotate:4},{at:.54,rotate:-13},{at:.78,rotate:6}])]),
  'gift-signal':object(letterMini,letter,'Cotton paper, crimson wax and a folded insert','A cream envelope with a photographed red wax seal. A pale note sits behind its folded lip.','The back hinge rises and the insert peeks above the stationary envelope. The sealed front lifts slightly and the letter folds closed.',1760,[
    layer('letter-flap',[123,92],[{at:.16,scaleY:.82},{at:.49,scaleY:4.25},{at:.75,scaleY:2.75}]),
    layer('letter-insert',[123,101],[{at:.20,y:2},{at:.53,y:-22},{at:.73,y:-15}]),
    layer('seal-flap',[123,90],[{at:.20,scaleY:1.04},{at:.55,scaleY:.79},{at:.79,scaleY:.97}])]),
  'gift-block-zero':object(tokenMini,token,'Antique gilt rim and petrol enamel','An enamel medallion with the Block Zero cube, a milled brass rim and a visible metal edge.','A slight counterturn reveals a thicker far edge. The minted cube stays legible as light runs along the rim and the medal settles.',1510,[
    layer('medal',[126,131],[{at:.16,rotate:-4},{at:.45,rotate:10,scaleX:.73,y:-5},{at:.67,rotate:3,scaleX:.90},{at:.82,rotate:-1}]),
    layer('rim-light',[126,127],[{at:.25,opacity:0},{at:.49,opacity:.88,rotate:22},{at:.72,opacity:0,rotate:47}])]),
  'gift-last-tab':object(tabMini,tab,'Worn keycap, amber switch and gunmetal plate','A worn Tab key above an amber mechanical switch in a low metal socket.','The key lifts a fraction, presses straight into its switch, bottoms out, then rebounds on the spring.',1280,[
    layer('keycap',[126,152],[{at:.17,y:-3},{at:.43,y:12},{at:.55,y:12},{at:.74,y:-4},{at:.88,y:1}]),
    layer('switch',[131,166],[{at:.17,scaleY:1.07},{at:.45,scaleY:.49},{at:.55,scaleY:.49},{at:.74,scaleY:1.12}])]),
  'coin-genesis-block':object(pinMini,pin,'Brushed nickel lapel pin with enamel inlay','A hexagonal blue-green enamel pin carrying three interlinked cube outlines in a silver rim.','The lapel pin pitches toward the light and returns face-on with the three cube outlines intact.',1210,[
    layer('pin',[127,126],[{at:.22,rotate:-3},{at:.52,rotate:6,scaleX:.88},{at:.78,rotate:-1}])])
};
