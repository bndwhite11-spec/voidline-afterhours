/**
 * Sculpted artisan keycaps. Coordinates are in a common 256-unit stage, with
 * travel measured down the switch's vertical guide. Rim highlights and facial
 * planes belong to the cap; the switch plate, screw heads and socket do not.
 * All paths here are original. No photographs, traced memes or external media.
 */
const path = (d, fill, attributes = '') => `<path d="${d}" fill="${fill}" ${attributes}/>`;
const line = (d, color, width=1.5, attributes='') => path(d,'none',`stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${attributes}`);
const ellipse = (cx,cy,rx,ry,fill,attr='') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${attr}/>`;
const part = (name,body,attr='') => `<g data-part="${name}" ${attr}>${body}</g>`;
const gradient = (id,colors,x='67%',y='100%') =>
  `<linearGradient id="${id}" x1="5%" y1="0%" x2="${x}" y2="${y}">${colors.map((color,index)=>`<stop offset="${Math.round(100*index/(colors.length-1))}%" stop-color="${color}"/>`).join('')}</linearGradient>`;
const paint = (id,tint) => `url(#${id}-${tint})`;
const clip = (id,shape) => `<clipPath id="${id}">${shape}</clipPath>`;
const inside = (id,shape) => `<g clip-path="url(#${id})">${shape}</g>`;
const capOutline = 'M45 112 Q48 98 65 89 L145 67 Q155 65 165 68 L196 81 Q204 84 207 94 L218 146 Q221 154 211 159 L108 183 Q99 185 90 181 L43 160 Q36 157 38 149 Z';
const faceSide = 'M39 147 Q41 144 49 147 L92 164 Q99 168 110 166 L213 143 Q218 142 219 148 L220 155 Q221 160 212 162 L108 186 Q97 188 90 185 L42 164 Q36 161 38 155Z';
const upperLip = 'M73 111 Q85 112 94 115 Q109 121 126 118 Q136 116 147 113 Q159 109 168 109 Q174 108 178 111 Q180 115 174 117 Q164 118 152 123 Q134 132 116 133 Q96 133 84 125 Q78 121 73 121 Q69 120 69 116 Q69 112 73 111Z';
const lowerLip = 'M72 119 Q77 117 82 119 Q99 128 115 128 Q133 129 152 120 Q165 114 175 114 Q181 115 177 121 Q174 124 162 126 Q145 130 132 137 Q109 147 90 135 Q82 128 73 126 Q68 125 69 122Z';
const head = 'M58 126 Q53 117 57 103 Q59 93 68 86 Q65 68 73 51 Q79 37 91 37 Q101 36 108 45 Q117 31 130 28 Q145 25 153 37 Q160 46 158 60 Q172 68 178 80 Q181 88 188 91 Q199 94 199 103 Q198 109 183 113 Q182 125 170 135 Q157 147 140 152 Q116 162 90 152 Q69 146 58 126Z';
const socketOutline = 'M47 194Q46 190 52 188L154 165Q161 163 167 166L207 182Q212 184 211 190L210 197Q209 200 204 202L103 227Q97 229 90 226L51 209Q47 208 47 205Z';
const clearWindow = 'M86 152Q91 152 98 155Q103 157 111 155L194 136Q199 135 201 139L201 145Q199 147 194 148L110 168Q102 170 96 167L86 163Z';
const baseTop = 'M48 192Q47 189 54 187L155 164Q162 163 169 166L208 182Q215 185 207 188L102 215Q97 216 91 214Z';
const socketHole = 'M62 190L157 168 196 184 99 208Z';
const bezel = 'M70 179L140 162Q143 161 147 163L182 177 180 189Q179 194 174 195L111 211Q107 212 103 210L70 197Z';
const capSkirt = 'M56 128 Q59 113 69 108 L147 87 Q158 83 171 88 L190 95 Q197 98 199 106 L210 141 Q208 145 203 146 L108 168 Q100 171 94 169 L48 149Z';

const palettes = {
  desk: {
    skin:['#b5d988','#83b66a','#56864f','#315747'], relief:['#d2e6a2','#95c67b','#659d5e','#477753'],
    case:['#b6ce85','#88ab63','#577d49','#385339'], rim:['#bbe19a','#709559','#3e6546','#254437'],
    mouth:['#d99a75','#b77762','#8d564d'], lids:['#a8ce77','#80a964','#517950'], luster:'#d5ebaf', etch:'#315946',
    base:['#859795','#475c5d','#2b4548','#203236'], stem:['#fff1c4','#e5d7a6','#b9a779','#91845d'], faceInk:'#33462d',
    accent:'#d4cf94', secondary:'#e4dba8', lower:'#3d6244', outline:'#28473b', iris:'#466249', white:'#eee6ca'
  },
  terminal: {
    skin:['#c2eccc','#7bd4a4','#3ea789','#24776c'],relief:['#b8f3ce','#77d8b0','#40b198','#24796c'],
    case:['#c7f4d4','#83d6bc','#50baaa','#227f78'],rim:['#b5f6dc','#70d9b8','#349b94','#2d7c7b'],
    mouth:['#c4e7a7','#88c8a1','#539e8b'],lids:['#b5f6c9','#80d5a7','#4ca88d'],luster:'#dcffe2',etch:'#408e82',
    base:['#a0c2ab','#688e86','#3b6461','#2d4a4b'],stem:['#dfecbf','#a5c89b','#7f9975','#587d6b'],faceInk:'#294f47',
    accent:'#c0ffdf',secondary:'#d1f0cc',lower:'#328d7f',outline:'#377d73',iris:'#358474',white:'#e0f1d1'
  },
  night: {
    skin:['#748078','#515958','#333e41','#242e32'],relief:['#88958b','#657068','#495256','#303b40'],
    case:['#53615e','#414b4d','#293237','#171e25'],rim:['#f7ebc4','#dfd4ac','#b4aa91','#8a806d'],
    mouth:['#ebe0b9','#c7bda0','#928d79'],lids:['#e2dbb9','#b0b4a0','#929684'],luster:'#b8c0b2',etch:'#a7aea0',
    base:['#929b91','#647278','#434c53','#2f3742'],stem:['#e4d8b7','#bebda8','#8f9489','#69746f'],faceInk:'#202b2d',
    accent:'#f3dda4',secondary:'#f3e7c9',lower:'#dad3b4',outline:'#303a3e',iris:'#58655d',white:'#efe9d6'
  },
  pond: {
    skin:['#d5e5b7','#a4c9a2','#7baf92','#558e82'],relief:['#e2ebba','#b7d2a8','#8cbca0','#6a9c8e'],
    case:['#fff0ca','#f0e6c4','#d5d4b9','#a6b9b1'],rim:['#fff7d4','#eae1bc','#c6c4ac','#9aa8a5'],
    mouth:['#c3d8aa','#a7c6a3','#7da99b'],lids:['#d8e8be','#b3cfa5','#8ab99e'],luster:'#fff9d7',etch:'#6b9888',
    base:['#94a4a0','#667b7b','#435b60','#34474b'],stem:['#c3d5b3','#a2bca2','#7b9b8c','#627b75'],faceInk:'#4f7566',
    accent:'#c59447',secondary:'#ffe19b',lower:'#e1dcc0',outline:'#788c81',iris:'#628e70',white:'#fcf2d5'
  },
  meteor: {
    skin:['#bdc2af','#8f978b','#5b6864','#3c4b4d'],relief:['#c8c6ac','#9b9f8d','#777f74','#4d5c5c'],
    case:['#89908a','#636f70','#3b4953','#24313d'],rim:['#b49777','#7d6b61','#4e5157','#36424b'],
    mouth:['#cdad91','#a68876','#766b66'],lids:['#bbc4af','#95a193','#697d73'],luster:'#d6d3b9',etch:'#5a6864',
    base:['#ad9f91','#766c6e','#51535b','#363d46'],stem:['#f6ede0','#a7b5ba','#606f77','#c7c9bf'],faceInk:'#344444',
    accent:'#f2a46d',secondary:'#ffc999',lower:'#505657',outline:'#394648',iris:'#655c4f',white:'#ebe1c8'
  },
  opal: {
    skin:['#a2bbb7','#608c94','#444766','#252d43'],relief:['#bdd5c2','#819d9c','#56647e','#3a4663'],
    case:['#756d91','#4f506e','#303648','#1c273b'],rim:['#b7bab7','#8c9caf','#546878','#494b68'],
    mouth:['#b0c6bc','#88a6ae','#6a8798'],lids:['#afc3bc','#879ca3','#667e8d'],luster:'#c8d3cf',etch:'#769096',
    base:['#acb8ba','#727b91','#554e66','#373a50'],stem:['#eee4ca','#a4b6bd','#687888','#c6bad0'],faceInk:'#353c50',
    accent:'#a9eeee',secondary:'#edeaca',lower:'#5f657e',outline:'#41445e',iris:'#617b88',white:'#eae5d3'
  }
};

function defs(id,theme) {
  const materials=['case','rim','skin','relief','mouth','lids','base','stem'].map(key=>gradient(id+'-'+key,theme[key])).join('');
  return '<defs>'+materials+gradient(id+'-pin',['#ffe5aa','#b98d56','#775846','#c5a16b'])
    +gradient(id+'-nickel',['#a0a7a1','#ece9cb','#848e8c','#45535a','#c1c3b1'])
    +gradient(id+'-silver',['#f0f0db','#c0c8be','#757d90','#e1dfcf','#8c9ba7'])
    +gradient(id+'-amber',['#3b2d35','#744746','#dd9766','#f4be82'])
    +clip(id+'-eye-near',path('M73 78 Q82 62 111 69 Q111 76 104 85 Q90 98 76 88 Q72 85 73 78Z','#fff'))
    +clip(id+'-eye-far',path('M112 70 Q125 54 148 62 Q146 74 137 81 Q125 88 114 80Z','#fff'))
    +'<mask id="'+id+'-resin-window"><rect x="0" y="0" width="256" height="256" fill="white"/>'+path(clearWindow,'#252525')+'</mask>'
    +clip(id+'-sculpt',path(head,'#fff'))+clip(id+'-wall',path(faceSide,'#fff'))+'</defs>';
}

function socket(id,t,kind) {
  const steel=paint(id,'base');
  const terminals=path('M71 210L76 212 76 220 73 223 71 221Z M184 201L189 199 188 207 184 210Z',paint(id,'pin'));
  const foot=path(socketOutline,steel,`stroke="${t.base[3]}" stroke-width="1.7"`)
    +path(baseTop,t.base[0])+path(socketHole,t.base[3])
    +line('M50 195l41 18q5 2 11 1l105-26',t.base[0],2)
    +line('M51 205l40 17q5 2 10 1l104-25',t.base[1],1.7)
    +path('M60 205l9 4v3l-9-4Zm121-5 13-3v3l-13 3Z',t.base[3]);
  const bolts=[[55,190],[157,168],[202,184],[99,210]].map(([x,y])=>
    ellipse(x,y,3.4,1.55,t.base[3])+line(`M${x-1.6} ${y+.35}l3.1-.7`,t.base[0],.9)).join('');
  const socketMark=kind==='terminal'?'M113 217l7-1.7m2-.5 3-.7m2-.5 6-1.5':'M110 218l5-1.3m3-.7 3-.7m3-.7 3-.7';
  return part('socket',terminals+foot+bolts+line(socketMark,t.accent,1.15));
}
function mechanism(id,t,kind) {
  const clear=kind==='terminal',wire=paint(id,clear?'pin':'nickel'),glass=clear?'#68bba6':t.base[0];
  // A low, narrow switch over a wider stamped plate leaves open air on the
  // sides. The spring's lower turn seats at y=196 and the front wall is below
  // the upper four turns. This is a physical cavity even in the opaque models.
  const housing=path(bezel,paint(id,'base'),`stroke="${t.base[2]}" stroke-width="1.5"`)
    +path('M71 179L140 163 178 178 109 196Z',t.base[0])+path('M79 179L139 166 168 177 109 191Z',t.base[3])
    +line('M72 194l32 14q4 2 8 0l65-16',t.base[0],1.5);
  const guide=path('M111 147L130 142 143 146V183L124 188 111 183Z',paint(id,'stem'))
    +path('M111 147L123 151V188L111 183Z',t.stem[2])+line('M125 152v31',t.stem[0],1.8)
    +path('M101 145l12-3v-5l8-2 6 2v4l10-2 7 3v5l-12 3v4l-9 2-6-2v-4l-11 2-5-2Z',paint(id,'stem'),'stroke="'+t.stem[2]+'" stroke-width="1.1"')
    +path('M102 144l13-3v-4l6-2 6 2v4l10-2 6 3-13 4v4l-8 2-6-2v-4l-10 2Z',t.stem[0]);
  // Far arcs sit behind the material. Front highlights run down a single helix.
  const far='M110 163C120 157 143 155 147 160M110 170C120 164 143 162 147 167M110 177C120 171 143 169 147 174M110 184C120 178 143 176 147 181M110 191C120 185 143 183 147 188';
  const helix='M109 162C104 165 115 171 133 167C150 164 151 160 147 159C153 164 132 169 116 170C103 171 108 178 123 177C138 176 153 171 147 167C152 172 129 177 115 179C104 180 111 185 125 184C143 183 151 178 147 175C149 181 130 184 117 186C106 187 112 192 127 191C142 189 151 185 147 183C150 188 135 194 122 195';
  const spring=line(far,t.base[3],2.5)+line(helix,'#39413e',3.2)+line(helix,wire,clear?2.55:2.1);
  const leftWall=path('M74 167L83 164 99 171 99 197 91 200 73 192Z',glass,'fill-opacity=".42" stroke="'+glass+'" stroke-width="1.4"')
    +line('M75 169l16 7 6-2m-6 2v19',t.base[0],1.4)+path('M77 176l8 3v8l-8-3Z',t.base[3],'opacity=".50"');
  const rightWall=path('M153 156l9-2 16 7-1 28-10 3-14-6Z',glass,'fill-opacity=".40" stroke="'+glass+'" stroke-width="1.4"')
    +line('M156 158l12 6 8-2m-8 2v23',t.base[0],1.5);
  const front=path('M97 191L173 172 178 175 177 189 110 206 100 201Z',glass,'fill-opacity=".20" stroke="'+glass+'" stroke-width="1.1"')
    +line('M102 193l7 3 66-17',t.base[0],1.35);
  return part('switch-housing',housing)+part('switch-stem',guide)+part('switch-spring',spring)
    +part('switch-window',leftWall+rightWall+front);
}

function capStructure(id,t,kind,detail) {
  const clear=kind==='terminal',mineral=kind==='meteor';
  const outline=path(capOutline,paint(id,'case'),`stroke="${t.outline}" stroke-width="2.2" ${clear?'fill-opacity=".40"':''}`);
  const exposedBack=path('M40 151L94 169 216 144 216 153Q213 156 207 158L107 181Q100 183 93 180L41 159Z',t.case[3],clear?'opacity=".58"':'');
  const side=path(faceSide,paint(id,'rim'),`stroke="${t.outline}" stroke-width="1.5" ${clear?'fill-opacity=".32"':''}`);
  const underside=path('M40 159L91 181Q98 185 106 182L218 155 213 161Q211 164 205 166L108 188Q97 190 90 187L43 166Z',t.outline)+
    line('M45 161l48 20q5 2 12 0l107-24',t.rim[1],2.1);
  const top=path(capSkirt,paint(id,'case'),clear?'fill-opacity=".38"':'')
    +line('M43 147q2 3 7 5l43 17q5 2 12 .5l103-24',t.rim[0],1.7);
  const facets=mineral?path('M42 142l13-27 22-13 4 15-22 29Z','#5e706d')+path('M44 152l23-8 34 23-8 8Z','#9b9790')+
    path('M149 164l30-20 33-8-5 12Z','#84928c')+line('M46 153l13-7 14 6 3-5 16 13m85-10 10-8 13-3','#d19a78',1.5):'';
  const seams=detail?line('M45 153l45 18m84-19 26-6',clear?'#d0ffdc':t.rim[0],.8)+
    line('M60 161l8 3m3 1 5 2m4 1 4 2',t.rim[1],1):'';
  const solid=exposedBack+outline+underside+side+top+facets+seams;
  return clear?'<g mask="url(#'+id+'-resin-window)">'+solid+'</g>'+path(clearWindow,'#68d8ab','fill-opacity=".15" stroke="#a8f0d2" stroke-width="1.2"'):solid;
}

function eyes(id,t,kind) {
  const relief=paint(id,'relief'),lids=paint(id,'lids');
  const far='M112 70 Q125 54 148 62 Q146 74 137 81 Q125 88 114 80Z';
  const near='M73 78 Q82 62 111 69 Q111 76 104 85 Q90 98 76 88 Q72 85 73 78Z';
  // Whites and pupils extend behind the moving eyelids. Each lid is clipped
  // to its own eye opening so it can never drift across the rest of the face.
  const eye=(farEye)=>{
    const edge=farEye?far:near,cx=farEye?135:97,cy=farEye?69:78;
    const lidShape=farEye?'M104 51Q126 35 154 51L150 65Q139 66 128 69Q120 72 113 75Z':
      'M65 61Q82 45 112 60L114 74Q104 72 95 75Q81 79 72 83Z';
    const lidEdge=farEye?'M113 75Q128 67 150 65':'M72 83Q94 71 113 74';
    const lid=path(lidShape,lids)+line(lidEdge,t.faceInk,2.35)+line(farEye?'M115 72Q130 66 143 64':'M75 79Q91 72 106 72',t.luster,1.35);
    const lidGroup=part(farEye?'far-lid':'near-lid',lid);
    return path(edge,t.white,`stroke="${t.faceInk}" stroke-width="2.4"`)+
      inside(id+(farEye?'-eye-far':'-eye-near'),
        ellipse(cx,cy,6.9,8.2,t.iris)+ellipse(cx+1.3,cy-.1,3.7,5.4,t.faceInk)+ellipse(cx-.8,cy-1.7,1.35,1.3,'#fff7d9')+lidGroup)
      +line(farEye?'M115 79q12 10 27-9':'M73 86q11 13 26 1',t.relief[1],1.6);
  };
  return path('M106 72 Q106 58 112 47 Q119 35 130 35 Q148 31 152 46 Q154 54 151 62 Q133 61 115 75Z',relief)
    +line('M115 51q6-12 16-13q12-2 16 6',t.luster,2.1)+eye(true)
    +path('M66 82 Q65 66 72 51 Q80 37 91 38 Q105 40 110 56 Q113 64 111 70 Q89 64 72 83Z',lids)
    +line('M72 64q4-17 15-20q9-3 16 7',t.luster,2.6)+eye(false)
    +line('M109 65q4-9 9-13',t.skin[1],2.2);
}

function face(id,t,kind,detail) {
  const mineral=kind==='meteor',clear=kind==='terminal';
  const drop=path(head,t.outline,'transform="translate(0 2.7)" opacity=".76"');
  const cranium=path(head,paint(id,'skin'),`stroke="${t.outline}" stroke-width="2.2" ${clear?'fill-opacity=".87"':''}`);
  const cheek=path('M59 98Q63 84 72 84Q82 96 95 96Q105 96 113 90Q128 81 144 79Q157 76 169 84L182 94Q191 94 196 99Q201 105 190 108Q181 111 170 109Q159 107 146 114Q128 124 107 123Q90 122 77 115Q69 111 64 116Q57 117 59 98Z',paint(id,'relief'));
  const jowl=path('M61 119Q65 127 77 131Q82 143 100 148Q118 153 139 147Q126 158 107 155Q78 154 64 140Q58 132 57 123Z',t.skin[3],'opacity=".57"')
    +line('M70 136q11 13 31 15',t.relief[1],2);
  const plane=mineral?path('M60 108L70 93 80 99 76 106Z M139 141L161 134 151 143 132 149Z',t.relief[0],'opacity=".45"'):'';
  const dimple=path('M60 117Q64 109 70 111Q72 113 70 117Q68 114 65 116Q61 120 64 126Q60 125 60 117Z',t.skin[2],'opacity=".58"')
    +path('M102 144Q111 147 124 145Q139 143 150 136Q140 145 126 148Q112 150 102 147Z',t.relief[0],'opacity=".67"')
    +line('M80 98Q85 103 94 102m17-7q7-7 18-8',t.skin[1],1.7);
  const accents=detail?line('M62 105q0-6 4-11m45-3q9-8 17-9m26 0 5 2m-55 55q7 3 14 2',t.relief[0],1.2)
    +line('M64 113q1 4 5 5m91-21 2-.6m-10 2 2-.6',t.skin[2],1.15):'';
  const lips=path(lowerLip,paint(id,'mouth'),`stroke="${t.skin[3]}" stroke-width="1.5"`)
    +path(upperLip,paint(id,'mouth'),`stroke="${t.mouth[2]}" stroke-width="1.4"`)
    +line('M74 119Q81 119 88 123Q106 134 126 129Q141 126 154 120Q164 116 175 115',t.faceInk,2.35)
    +line('M78 114q7 1 14 5m43 9q9-3 15-6',t.mouth[0],1.5)
    +line('M76 120q-3-2-6 0',t.faceInk,1.35);
  return drop+cranium+plane+jowl+cheek+eyes(id,t,kind)
    +path('M157 88Q164 86 172 92 M151 91Q153 88 157 89','none',`stroke="${t.skin[2]}" stroke-width="2.3" stroke-linecap="round"`)
    +line('M183 96q7 .4 10 3',t.relief[0],2)+dimple+lips+accents;
}

function crescent(cx,cy,size,fill) {
  return `<g transform="translate(${cx} ${cy}) scale(${size})">`+
    path('M5-11C-3-13-11-7-11 1C-11 8-5 13 1 13C7 13 11 10 13 6C8 9 3 9-1 5C-6 0-4-7 5-11Z',fill)+'</g>';
}

function ornament(id,t,kind,detail) {
  switch(kind){
    case 'desk': {
      const grain=detail?[
        [52,143],[54,140],[57,147],[61,143],[64,148],[67,148],[71,151],[74,149],[78,153],
        [188,127],[191,124],[194,127],[197,122],[199,130],[195,134],[190,131],
        [65,106],[68,103],[66,101],[149,92],[145,94],[92,140],[95,143],[100,143]
      ].map(([x,y],i)=>ellipse(x,y,i%3===0?1.1:.65,.48,i%2?t.skin[3]:t.luster,'opacity=".6"')).join(''):'';
      const molding=line('M50 144q2-12 8-16m132 14 12-3',t.luster,1.5)
        +path('M102 165l10-2 1 2-10 2Z',t.secondary);
      return grain+molding;
    }
    case 'terminal': {
      const rails=line('M47 147l47 18q5 2 13 0l102-23M52 143l39 14m22 2 88-20','#c9ffe1',2)
        +line('M59 131l4 12 13 5m104-17 13-4-2-6','#7de4c4',1.8)
        +line('M103 169v13m-9-12v9m63-23v12m8-14v12','#b8f3d5',1.7);
      const light=part('release-light',path('M126 150l19-4 1.5 2.8-19 4Z','#d2ffe8')+
        ellipse(142,147,2.3,1.3,'#fff8ce'),'opacity="0"');
      const sideGlass=path('M180 122l12-7 8 3 4 13-17 5-8-4Z','#236f69','opacity=".64"')+
        line('M181 128l12-4m-10 7 11-3m2-10 3 9','#b1e9c4',1.7)+
        line('M181 121l10-5 7 3m-17 11 4 3 15-4','#d2ffe1',1.5);
      return sideGlass+rails+line('M90 155l9 4q4 1 10-.2l84-20',t.accent,1.15)+light;
    }
    case 'night': {
      const mask='M43 146L64 146Q81 146 93 152L111 162 183 146 211 137 208 147 107 174Q99 176 91 172L44 153Z';
      const collar=path(mask,t.rim[1])+line('M48 150l45 18q4 2 11 1l102-24',t.rim[0],1.7);
      const inset=crescent(59,141,.66,t.faceInk)+crescent(59,140,.59,t.accent);
      const glint=part('moon-inlay',crescent(59,140,.59,'#fff9d2'),'opacity="0"');
      return collar+inset+glint+line('M175 150l16-3',t.secondary,1.25);
    }
    case 'pond': {
      const cracks='M47 147L61 145 63 139 73 136 74 129 80 125 M61 145L67 150 68 155 82 161 M185 142L186 136 195 131 194 125 200 118';
      const gold=line(cracks,'#977842',2.65)+line(cracks,'#ecca7c',1.3);
      const reeds=path('M113 175q10-12 21-13-4 8-16 12ZM127 172q14-2 21-9-12 1-21 9Zm12-3q0-7 8-12-1 7-8 12Z','#678e84')+
        line('M109 176q14-4 33-8m-14 1 8-8','#75928b',1);
      const highlights=line('M178 91q6 4 9 8m-10-11 4 3M71 61q2-9 6-14','#fffde3',2.7);
      const moving=part('glaze-ripple',line('M58 108q3-10 7-14m-5 19 4-8m57-58q5-6 10-7','#fffee8',2.6)+line('M118 145q10-.2 19-5','#f6ffda',1.8),'opacity="0"');
      return gold+reeds+highlights+inside(id+'-sculpt',moving);
    }
    case 'meteor': {
      const inclusion='M175 123L189 114 202 118 204 130 193 141 178 139 172 133Z';
      const rim=path('M173 122L188 111 204 115 208 130 194 145 175 143 168 134Z',paint(id,'nickel'),'stroke="#5d6059" stroke-width="1.2"')+
        path(inclusion,'#333d41','stroke="#c7a087" stroke-width="3"')
        +path('M177 124L188 118 200 120 201 129 191 137 179 135 176 131Z',paint(id,'amber'))
        +path('M178 126l10-6-1 8-9 4Zm11 3 11-6-3 7-5 5Z','#f0a06d','opacity=".62"')
        +line('M176 125l12-9 9 1',t.secondary,1.5);
      const pulse=part('mineral-seam',line('M53 149l12-5 8-8 11 1m72 18 8-6 13-6 1-5',t.accent,2.2),'opacity="0"');
      const glint=part('inclusion-glint',line('M178 125q2-4 7-5',t.secondary,2.5)+ellipse(180,123,1.4,1.3,'#fff1bb'),'opacity="0"');
      const rock=inside(id+'-sculpt',
        path('M63 101l8-13 11 7-5 6Zm5 29 13 3 6 9-10-4Zm78-84-7-9 8 2 6 9Zm7 34 14 4 5 7-9-2Z','#b9baa5','opacity=".57"')
        +path('M73 65l8-17 7-4-6 13Zm80 69 19-10-5 10-15 6Z','#505e59','opacity=".65"')
        +line('M68 115l6-4 9 2 5-3m62-56-5-8 1-6',t.rim[0],1.05));
      const score=detail?line('M50 155l6-4 12 1m78 11 12-6 10-2m21-10 6-3',t.rim[0],1.3):'';
      return rock+rim+score+pulse+glint;
    }
    case 'opal': {
      const fire=inside(id+'-sculpt',
        path('M65 93l8-8 10 7-8 1-8 6Zm45 60 9-6 16-4-9 8Zm48-75 13 8 2 6-10-6Z','#54aba7','opacity=".82"')
        +path('M76 93l7-1-4 5-11 3Zm37 58 7-4 8-1-8 4Zm48-68 7 4-2 2Z','#d49da8','opacity=".85"')+
        path('M65 106q11-15 22-14l-9 7-9 3ZM112 146q16 0 30-9l-6 8-18 5Z','#99c9bb','opacity=".56"')+
        path('M62 111l8-11 7 1-7 4zm69-60 12-5 5 4-10 1Z','#b1a6c7','opacity=".63"'));
      const opalFacets=path('M58 147l14 2 20 13-8-1-17-6Zm80 14 17-10 15-3-11 9Zm33-10 19-17 7-1-8 12Z','#71a9a9','opacity=".75"')+
        path('M63 148l10 2 8 6-5-1Zm95 4 12-8 4-.6-6 5Z','#b8a5c7')+
        path('M109 161l7-5 13-2-4 4Z','#bb88a7','opacity=".9"');
      // A cast crescent cups the cheek from the side without hiding the eyes.
      const moon='M60 87Q40 99 34 118Q27 141 42 153Q55 164 79 154Q60 156 50 144Q42 133 47 115Q51 100 60 87Z';
      const clasp=path(moon,paint(id,'silver'),'stroke="#59697c" stroke-width="1.3"')+
        line('M56 92q-16 14-20 32q-3 17 8 26','#ece9d3',1.7)+
        (detail?line('M44 136l4-1m-3 4 4-1m-3 4 4-1','#7a8290',1.2):'');
      const eclipse=part('eclipse-face',ellipse(145,93,11.5,7.8,'#263747')+ellipse(144,92,10.4,6.8,'#e2d1a3')+
        ellipse(142.4,91,9,6.2,'#36445b')+path('M154 91l2.9-.5-2.4 1.5-1.1 2-.3-2Z','#fff4c7'),'opacity="0"');
      return fire+opalFacets+clasp+eclipse;
    }
    default: throw Error('Unrecognized keycap material '+kind);
  }
}

function draw(id,kind,variant) {
  const t=palettes[kind],detail=variant!=='card',opticalShadow=part('contact-shadow',
    ellipse(127,215,75,8,'#111720','opacity=".20"')+ellipse(129,214,59,4.9,'#10151b','opacity=".36"'));
  const stem=mechanism(id,t,kind);
  // Inside a clear cap the upper cross guide is visible through the apron.
  const clearGuide=kind==='terminal'?part('clear-guide',line('M74 149l14 5m67-7 16-4','#a6f2c9',2.3)):'';
  return defs(id,t)+opticalShadow+socket(id,t,kind)+stem+
    part('landing-shadow',path('M51 166Q57 161 64 162L99 176 202 151 209 154 112 182Q102 185 94 182Z','#152327'),'opacity=".42"')+
    '<g transform="translate(0 -8)">'+part('keycap',capStructure(id,t,kind,detail)+clearGuide+face(id,t,kind,detail)+ornament(id,t,kind,detail))+'</g>';
}

function tiny(kind,t) {
  const s=t.skin[1],light=t.relief[0],ink=t.outline;
  const tinyBase=path('M2 15.2L15.8 11.6l6.4 2.7v4.4l-13.8 3.7-6.6-2.9Z',t.base[1],`stroke="${t.base[3]}" stroke-width=".75"`)+
    path('M4.2 16.3l3.7 1.6 11.8-3.1-.1 2L8 20 4.1 18.5Z',t.stem[0]);
  const cap=path('M2.7 13.9l1.6-4.8 11-3.2 4.9 2.3 1.6 7.2-13.3 3.5-6.4-2.9Z',t.rim[1],`stroke="${ink}" stroke-width=".8"`);
  const frog=path('M4.4 12.3q-1.1-2.3.6-3.9-.4-4.8 2-5.2 1.5-.3 2.1 1.1 2.3-3.7 4.5-2.1 1.2.8 1.1 3.1 2.1.9 2.4 2.8 2.6.1 2.2 1.6-.2 1.1-1.9 1.5-1.5 3.4-5.9 4.1-5.6 1.2-7.1-3Z',s,`stroke="${ink}" stroke-width=".8"`);
  const eyes=path('M5.2 8.5q1.3-1.5 3.5-1.1-.6 2.2-2.6 2.2Zm4.4-1.2q1.4-1.5 3.5-1.2-.3 1.9-2.6 2.3Z',t.white)+
    ellipse(7.47,8.02,.7,.7,t.faceInk)+ellipse(11.82,6.84,.67,.71,t.faceInk)+
    line('M5.3 8.2l3.3-.8m1.1-.4 3.2-.8',ink,.75);
  const lip=line('M5.9 11.8q3.1 2.6 7 .5l3.1-1.4',t.mouth[0],1.5)+line('M6.2 12.15q3.0 2.25 6.9.4l2.9-1.5',ink,.6);
  const details={
    desk:line('M10 16.2l2.6-.6',light,.9),
    terminal:line('M3.3 15.7 8.6 18l12.4-3.1m-7.6 1.9v1.1m2.1-1.6v1.2',t.accent,.8),
    night:crescent(4.2,14.1,.12,t.accent)+line('M9.3 17.4 20.5 14.5',t.secondary,1.15),
    pond:line('M3.5 14.4l2.5-.1.6 1.1 2 .9m8.5-2.8 1.7-2.1',t.accent,.9),
    meteor:path('M16.2 12.8l2-1.5 1.6.8.1 1.6-2.3 1.4-1.4-.9Z','#eca977')+line('M3.5 14.8l2-.7 2 1.6',t.secondary,.65),
    opal:path('M3.9 9.8Q.4 12.3 1.4 15.6q1.4 3.2 5.4 1.2-4.9.3-2.9-7Z',t.secondary)+line('M14.6 16.4l3-1.8',t.accent,.9)
  };
  return tinyBase+cap+frog+eyes+lip+details[kind];
}

const states=(name,origin,frames)=>({name,origin,frames:[{at:0},...frames,{at:1}]});
const vertical = (name,origin,points) => states(name,origin,points.map(([at,y])=>({at,y})));
const press = {
  desk: [[.13,-.7],[.37,12],[.48,12],[.66,-2.8],[.84,.8]],
  terminal: [[.12,-.5],[.32,11],[.46,11],[.70,-1.8],[.86,.3]],
  night: [[.16,-.6],[.38,11.5],[.53,11.5],[.72,-1.6],[.86,.5]],
  pond: [[.16,-.4],[.35,10.5],[.52,10.5],[.70,-.8],[.82,.23]],
  meteor: [[.16,-.5],[.39,12],[.56,12],[.76,-1.7],[.89,.4]],
  opal: [[.13,6],[.24,6],[.47,-16],[.56,-16],[.66,-3],[.75,3.5],[.86,-.7]]
};
const signatures = {
  desk: [
    vertical('near-lid',[91,76],[[.21,0],[.39,3],[.50,3],[.64,.4],[.79,0]]),
    vertical('far-lid',[133,69],[[.24,0],[.43,2.5],[.51,2.5],[.67,0]])],
  terminal: [states('release-light',[134,148],[
    {at:.44,opacity:0,y:5},{at:.57,opacity:.9,y:1},{at:.73,opacity:.75,y:-9},{at:.83,opacity:0,y:-13}])],
  night: [
    vertical('far-lid',[131,68],[[.22,0],[.43,-6],[.55,-6],[.73,0]]),
    states('moon-inlay',[59,140],[{at:.22,opacity:0},{at:.40,opacity:.95},{at:.55,opacity:.80},{at:.73,opacity:0}])],
  pond: [states('glaze-ripple',[122,120],[
    {at:.47,opacity:0,x:-3},{at:.57,opacity:.8,x:1},{at:.67,opacity:.67,x:4},{at:.78,opacity:0,x:7}])],
  meteor: [
    states('mineral-seam',[145,155],[{at:.23,opacity:0},{at:.39,opacity:.9},{at:.52,opacity:.7},{at:.72,opacity:0}]),
    states('inclusion-glint',[189,128],[
      {at:.36,opacity:0,rotate:-15},{at:.46,opacity:.95,rotate:6},{at:.59,opacity:.9,rotate:77},{at:.73,opacity:.7,rotate:160},{at:.84,opacity:0,rotate:206}])],
  opal: [states('eclipse-face',[145,93],[
    {at:.27,opacity:0,scaleX:.78},{at:.46,opacity:1},{at:.55,opacity:1},{at:.66,opacity:0,scaleX:.83}])]
};
const details = [
  ['desk-green','desk',1480,'The cream stem bottoms out. The molded eyelids narrow, and one rebound returns the cap to its seat.'],
  ['terminal-clear','terminal',1580,'The brass spring shortens inside the clear jade shell. A light moves up the guide as the coils expand.'],
  ['night-shift','night',1640,'The switch compresses and the far eye opens against its raised lid. The small moon catches the light, then both settle.'],
  ['porcelain-pond','pond',1530,'The glazed cap presses firmly. A single moving reflection crosses the celadon relief as it returns to its stop.'],
  ['meteor-core','meteor',1690,'The stone cap drops into its collar. A narrow seam lights and one reflection rounds the amber inclusion.'],
  ['black-opal-eclipse','opal',1890,'The cap presses, lifts clear of the guide, and shows an eclipse. The silver crescent and cap reconnect and settle.']
];
function keyMotion(kind,duration) {
  const points=press[kind];
  // Inherits Last Tab Open's fixed plate, independent stem, and one rebound.
  // Only Opal separates; during its lift the unlatched stem stays at full extension.
  const stem=points.map(([at,v])=>[at,kind==='opal'?Math.max(0,v):v]);
  const layers=[
    vertical('keycap',[128,162],points),vertical('switch-stem',[128,196],stem),
    states('switch-spring',[128,196],stem.map(([at,y])=>({at,scaleY:1-y/36}))),
    states('landing-shadow',[126,166],points.map(([at,y])=>({at,opacity:.42+y*.015,scaleX:1-y*.007}))),
    ...signatures[kind]
  ];
  return {duration,layers};
}

export const keycapModels=Object.freeze(Object.fromEntries(details.map(([suffix,kind,duration,storyboard])=>{
  const id='gift-pepe-'+suffix,t=palettes[kind];
  return [id,{
    mini:tiny(kind,t),
    silhouette:path(socketOutline,'#121b23')+path(bezel,'#121b23')+'<g transform="translate(0 -8)">'+path(capOutline,'#121b23')+path(head,'#121b23')+'</g>',
    body:(prefix,variant='detail')=>draw(prefix,kind,variant),
    motion:keyMotion(kind,duration),storyboard
  }];
})));
