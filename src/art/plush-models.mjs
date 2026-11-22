/**
 * Chudjak Plush sewing patterns. Stage units are fixed to the 256-square cutting
 * layout; the planted seat and both feet occupy the same plane across the six toys.
 * Thread routes follow individual fabric pieces so the seams move with their owner.
 * All facial embroidery is original geometry. No meme photograph is embedded.
 */
const path = (d, fill, stroke = '', weight = 1) =>
  `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round"` : ''}/>`;
const thread = (d, color, width = 1) => path(d, 'none', color, width);
const seam = (d, color, spacing = '2.1 2.25', width = .9) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="${spacing}"/>`;
const oval = (x,y,rx,ry,fill) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const group = (name, content) => `<g data-part="${name}">${content}</g>`;
const stops = colors => colors.map(([at,color]) => `<stop offset="${at}%" stop-color="${color}"/>`).join('');
const radial = (id, colors, cx='34%', cy='23%', r='83%') =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(colors)}</radialGradient>`;
const linear = (id, colors, x2='80%', y2='100%') =>
  `<linearGradient id="${id}" x1="0%" y1="0%" x2="${x2}" y2="${y2}">${stops(colors)}</linearGradient>`;
const metal = [[0,'#eef1df'],[20,'#b6c8cb'],[43,'#81969c'],[66,'#4a5969'],[84,'#c7ccd0'],[100,'#58626c']];

const looks = {
  original: {coat:['#a9b5a7','#73867c','#4d625c','#2f4241'],edge:'#323a36',light:'#c1c8b6',lining:'#c3bd9f',pants:['#667785','#43535e','#2d3a42'],hair:['#393732','#292822','#141815'],skin:['#f1e5c9','#d9c6a5','#b39b7d','#826a57']},
  hoodie: {coat:['#70736e','#494e49','#323b38','#1c2726'],edge:'#272c2a',light:'#979e90',lining:'#b1a282',pants:['#716c69','#514d4f','#322f35'],hair:['#3a352c','#262622','#151a17'],skin:['#f1dec3','#d7bea0','#b09676','#826b55']},
  helmet: {coat:['#a1a783','#717955','#4c5741','#2d3930'],edge:'#354037',light:'#c4c4a2',lining:'#d3c69e',pants:['#7e7e65','#565c49','#364136'],hair:['#39372c','#28271c','#171c17'],skin:['#eee1bd','#d7c19d','#ad9475','#7e6a53']},
  patchwork: {coat:['#e9d6ba','#c5ae93','#9a7f6e','#6b5551'],edge:'#483a3b',light:'#f0dac4',lining:'#e4bb80',pants:['#7c6861','#544c48','#383d3b'],hair:['#504541','#332f2c','#1f2220'],skin:['#f4dfbb','#e0c7a5','#b79877','#8d735c']},
  silver: {coat:['#888d9b','#474e5b','#222b39','#101823'],edge:'#26333e',light:'#c9d3d0',lining:'#a6b4b6',pants:['#535766','#373e4a','#232a36'],hair:['#423e40','#2c2a30','#1b1c21'],skin:['#e9dfce','#cfc4b2','#ab9c8c','#7e7068']},
  velvet: {coat:['#796077','#4f3c59','#32263e','#201a2d'],edge:'#362c40',light:'#c8afbd',lining:'#bab7c0',pants:['#6c596c','#443748','#2b2638'],hair:['#453a3c','#2b262a','#1b1922'],skin:['#f1dec9','#d6bea7','#ab9180','#806756']}
};
function textiles(prefix, look) {
  const four=colors=>colors.map((c,i)=>[[0,38,73,100][i],c]);
  const three=colors=>colors.map((c,i)=>[[0,57,100][i],c]);
  return `<defs>${radial(prefix+'-linen',four(look.skin))}${radial(prefix+'-pile',three(look.hair),'38%','18%')}${radial(prefix+'-coat',four(look.coat))}${radial(prefix+'-twill',three(look.pants))}${radial(prefix+'-sole',[[0,'#d7c29c'],[52,'#b69e78'],[82,'#8c785d'],[100,'#6a5c4b']])}${linear(prefix+'-nickel',metal)}${linear(prefix+'-satin',[[0,'#818594'],[18,'#4e5664'],[40,'#252c37'],[59,'#555a6b'],[78,'#2d3440'],[100,'#141b26']])}${linear(prefix+'-velour',[[0,'#80667e'],[18,'#5e4765'],[39,'#403146'],[70,'#52405b'],[100,'#272333']])}${linear(prefix+'-selvedge',[[0,'#d4c3a3'],[22,'#97aeb4'],[44,'#cfb0c0'],[63,'#a19ec7'],[83,'#bccaaf'],[100,'#927f8d']])}${radial(prefix+'-bronze',[[0,'#c5c193'],[39,'#969a72'],[73,'#697452'],[100,'#434f3b']])}</defs>`;
}
const paint = (prefix,name)=>`url(#${prefix}-${name})`;

// The far lens is narrower and slightly higher; the long nose extends over the
// bridge while the near temple wraps into the side hair above the ear.
function face(p,variant,details) {
  const l=looks[variant], ink='#342f2a', linen=paint(p,'linen'), pile=paint(p,'pile');
  const head='M74 68C76 46 91 34 118 32C139 30 160 34 172 44C187 53 190 69 188 86L185 108Q181 119 173 129Q169 139 154 143C141 147 121 149 108 143Q93 139 82 132C70 124 68 114 69 99C66 89 67 77 74 68Z';
  const hair='M71 88C63 79 62 62 68 48C66 48 69 40 76 33L75 30L86 27Q94 21 116 20Q132 19 143 22L151 21L161 26Q174 30 180 38L181 35Q189 46 189 60L187 68Q183 56 176 52L169 49L165 51L157 46Q145 47 137 43Q124 45 115 44Q101 44 95 52Q86 60 86 73L80 74L79 91L74 96Z';
  const nearLens='M101 77Q109 73 135 76Q141 77 142 81L140 96Q139 100 135 100L104 101Q99 99 99 95L98 82Q98 79 101 77Z';
  const farLens='M157 76Q169 72 186 73Q190 73 190 77L188 91Q188 95 183 96L157 98Q153 97 153 93L153 81Q153 77 157 76Z';
  const nose='M149 83C150 91 151 100 154 104Q157 109 151 113L147 112Q143 115 139 113L134 114Q130 112 132 109Q135 105 135 101';
  const stitching=details?thread('M81 96C79 115 87 125 103 132Q111 137 122 139','#b0997e',1.5)
    +seam('M82 97C80 115 88 124 104 131Q112 136 121 137','#e4cfae','2 2.7',.92)
    +thread('M95 103l2.5-.8m-1.3 2.3 2.2-.7m3.3 1.1 2.6-.7m-2.2 3.3 2.4-.65m3.2-2.5 1.7-.45m-18.8 4 2.1-1m-.7 3.2 2.8-1m5.2 1.1 2.3-.8m57.5 8.2 2-.7m1.2-2.1 2.3-1.05m2-2.6 2.1-1.2m-3.6 4.8 1.8-.8','#c5ac8d',.82)
    +seam('M83 96C80 111 84 121 92 127Q103 134 115 136','#967d64','1.9 2.3',.85)
    +seam('M181 97Q183 109 175 122','#9e886f','1.8 2.4',.9)
    +seam('M104 44Q122 36 147 41','#a29275','1.7 2.4',.75)
    +seam('M153 113Q147 118 142 115','#9d8063','1.1 2.2',.8)
    +thread('M100 114l2 1m1-5 2 .8M166 105l1.5-.5M108 108l1 .4','#dbc3a4',1.3)
    +thread('M80 42q9-9 21-11m-9 8q10-9 20-10m-4 4q11-7 20-6m-2 8q11-5 17-4m1 1q5-.1 9 2m4 4 6 3','#46443b',1.1):'';
  let fabric=path(head,linen,'#65584b',1.6)
    +path('M80 77C79 99 84 119 99 131Q116 143 140 143Q123 149 106 141Q90 137 79 126Q69 118 70 99Z','#bba388')
    +path('M164 120Q173 116 183 99Q182 117 170 130Q160 140 149 139Q159 137 164 130Z','#a89279')
    +path('M97 120Q104 125 113 126M167 109Q173 103 177 99','none','#c3ab8c',1.9)
    +oval(75,91,10,13,linen)+thread('M71 92Q69 83 75 84Q78 84 78 91M72 99l5-5','#9c7e63',1.6)
    +path(hair,pile,'#272a23',1.25)
    +path('M69 51Q72 32 99 27Q125 18 153 27Q125 24 111 30Q86 30 69 51Z','#3c3930')
    +thread('M72 63Q71 56 75 47M83 51Q88 42 95 39','#555043',1.4);
  if(variant==='patchwork')fabric+=path('M75 95Q84 100 93 99L96 119L89 125Q73 117 75 95Z','#aa7263')+seam('M75 95Q86 101 93 99L96 119 89 125','#ead1a5','2 2',1.25);
  fabric+=stitching;
  const eyes=path('M103 84Q116 81 130 86L134 90Q119 94 105 90L102 87Z','#ede6cf','#786b56',1)
    +path('M159 85Q169 79 183 79L182 88Q168 92 159 89Z','#ebe1c6','#786b56',1)
    +path('M103 84Q119 80 135 87L132 89Q117 84 103 87Z',ink)
    +path('M158 84Q170 79 184 79L183 82Q171 82 159 87Z',ink)
    +path('M120 85Q129 83 128 89Q126 92 121 91Q116 90 120 85ZM174 82Q181 80 179 86Q178 90 172 88Q171 85 174 82Z','#242923')
    +thread('M109 95Q119 96 128 93M161 92Q168 93 177 90','#947e64',1.1)
    +path('M99 65Q108 64 116 69Q125 74 136 76L134 79Q116 77 104 72Q99 70 99 65ZM158 73Q168 65 182 62Q182 68 176 70L159 77Z','#36322a')
    +thread('M103 67l8 3m3 1 7 2M171 68l6-3','#66614f',.95)
    +thread('M144 68q-3-6-4-10M151 64l1-7','#9f8a70',1.05);
  const mouth=path('M129 126Q135 122 141 123Q145 122 149 124Q153 121 157 123Q162 126 163 129Q157 129 152 133Q146 137 140 134Q133 130 129 126Z','#b59880')
    +thread('M129 126Q137 123 143 124L148 126Q154 122 158 124L162 127Q157 129 152 129Q141 130 130 127','#514238',1.7)
    +thread('M140 134Q147 138 153 133M143 141q6 1 10-1','#9e8066',1.3)
    +thread('M129 115q-4 7-4.5 12M160 110q-1 5 4 11','#ab9176',1.2);
  const glasses=thread('M74 83Q76 77 80 77L98 81','#282d27',3.3)
    +path(nearLens,'none','#9e8f72',4.7)+path(farLens,'none','#9e8f72',4.3)
    +path(nearLens,'none','#2d332c',3.4)+path(farLens,'none','#2d332c',3.1)
    +thread('M141 83Q146 76 153 82','#30342b',3.1)
    +thread('M102 77Q114 74 126 76M158 75Q166 73 175 73','#979b86',1.05)
    +oval(99.8,81.8,.8,.9,'#d3cdaf')+oval(188.2,76.7,.7,.8,'#d3cdaf');
  return fabric+eyes+path(nose,linen,'#9d8265',1.35)+thread('M133 110q2 4 6 2M147 111q3-3 6-2','#51463a',1.85)+mouth+glasses;
}

const seatShape='M84 185C93 174 146 169 165 182Q183 195 178 210Q174 223 149 224L100 226Q76 221 78 207Z';
function feet(p,variant,details) {
  const look=looks[variant], twill=paint(p,'twill'), sole=paint(p,'sole');
  const left='M77 187C66 188 58 198 58 209C55 222 68 235 84 237Q101 240 113 231Q119 222 115 211C113 199 101 185 88 185Z';
  const right='M154 191Q163 185 177 187Q191 191 198 206Q204 217 197 226C188 236 170 238 155 232Q141 226 143 211Q147 201 154 191Z';
  const lc=variant==='patchwork'?'#bb9178':sole, rc=variant==='silver'?paint(p,'linen'):sole;
  return path(left,twill,look.edge,1.8)+path(right,twill,look.edge,1.8)
    +path('M63 205Q60 211 70 224Q84 239 99 235Q111 232 111 222C107 209 98 202 87 198Q69 194 63 205Z',lc,'#5f5549',1.45)
    +path('M159 206Q167 197 181 200Q193 201 198 211Q200 219 192 226Q180 235 164 230Q149 224 159 206Z',rc,'#5f5549',1.45)
    +thread('M69 205Q78 198 90 205M162 211Q170 203 180 204','#dbc4a0',1.8)
    +seam('M63 210Q67 224 83 231Q100 239 109 227M157 217Q155 228 173 230Q187 231 194 220','#968365','2.1 2.6',1.1)
    +(details?thread('M74 214l2 3m2-5 2 3m11 12 2 1m83-16 2-1m1 2 2-1','#a89271',1.1)+oval(113,225,1.05,1.8,'#b28c60'):'')
    +(variant==='patchwork'?path('M72 197Q77 188 87 189L99 197L94 207Q82 202 73 203Z','#a38466','#725a4d',1)+seam('M73 197Q78 189 87 190L97 197L94 205Q81 201 73 202Z','#ead6b1','1.8 2.1',1.2):'');
}
const coatShape='M89 135C102 128 143 129 156 132C171 136 183 148 186 169Q191 186 182 201Q178 210 159 214Q138 221 108 218Q78 219 71 204Q66 192 73 169Q77 146 89 135Z';
const coatTail='M89 140Q119 128 154 134Q173 135 183 155Q186 180 197 205Q179 214 159 213L152 218Q120 222 101 218L93 215Q80 219 57 211Q69 190 74 168Q77 147 89 140Z';
function collar(variant,p){
  const l=looks[variant];
  if(variant==='hoodie')return path('M92 135Q108 148 132 148Q156 147 170 135L173 143Q161 157 137 161Q114 158 97 148Z',l.coat[2],l.edge,1.5)
    +thread('M97 139Q119 158 136 156Q161 151 169 141',l.light,1.1);
  if(variant==='silver')return path('M91 136Q94 147 109 151L128 156L133 147Q107 145 103 133ZM137 149L145 156Q163 150 172 136L165 132Q153 143 137 149Z',paint(p,'satin'),l.edge,1.2)
    +thread('M97 137Q107 148 124 151M147 151Q158 147 168 137','#a3b1b9',1.2);
  if(variant==='velvet')return path('M88 134Q98 137 117 143L134 149L128 164Q106 156 87 143ZM138 150Q153 146 172 134L178 137L163 152L146 160Z',paint(p,'velour'),l.edge,1.45)
    +thread('M89 137Q114 150 128 159M146 157Q162 151 173 139',paint(p,'selvedge'),2);
  return path('M95 136Q103 134 110 133Q112 140 131 146L125 155Q113 153 98 146ZM134 147Q150 144 158 132L166 136Q162 144 146 155Z',l.coat[0],l.edge,1.45)
    +thread('M100 142Q112 148 122 151M148 150q10-5 14-11',l.light,.9);
}
function torso(p,variant,details){
  const l=looks[variant], fill=variant==='silver'?paint(p,'satin'):variant==='velvet'?paint(p,'velour'):paint(p,'coat');
  let body=path(variant==='velvet'?coatTail:coatShape,fill,l.edge,1.7);
  if(variant==='original'){
    body+=path('M110 169L127 170L126 185Q120 190 112 184Z','#758780',l.edge,1.05)
      +thread('M111 171l14 1',l.light,1)
      +path('M132 148L138 148L141 211L134 212Z',l.coat[2])+thread('M133 150Q138 177 136 210',l.light,.85)
      +thread('M96 159Q105 164 116 164M145 191Q156 189 164 183',l.coat[1],1.6)
      +[161,176,191,205].map((y,i)=>oval(135.3+i*.5,y,1.65,1.65,'#d3bb98')+oval(135.2+i*.5,y,.55,.65,l.edge)).join('');
  }else if(variant==='hoodie'){
    body+=path('M108 175Q128 179 148 176L161 193Q144 204 111 199L98 195Z',l.coat[2],l.edge,1.2)
      +seam('M107 179l-7 14m55-11 6 9M109 198q19 5 40 1',l.light)
      +path('M75 199Q93 215 125 213Q163 217 182 198L179 207Q163 221 118 220Q88 219 76 208Z',l.coat[2],l.edge,1.1);
  }else if(variant==='helmet'){
    body+=path('M130 147L141 146L146 211L136 213Z',l.coat[2])+thread('M133 149l7 63',l.light,.8)
      +path('M91 159L119 161L117 181Q102 186 90 177ZM151 158L171 154L173 172Q163 180 153 178Z','#788064',l.edge,1)
      +path('M90 158L120 159L119 166L105 169L90 165ZM150 157L171 153L172 160L160 165L151 164Z','#a1a487',l.edge,1.2)
      +[162,179,195].map((y,i)=>oval(138+i,y,1.55,1.65,'#514c3d')+oval(137.6+i,y-.45,.65,.6,'#d2c4a0')).join('');
  }else if(variant==='patchwork'){
    body+=path('M76 159Q81 143 97 138L117 144L110 173L86 178L72 172Z','#594f4e',l.edge,.9)
      +path('M114 169L134 163L161 177L156 202L126 212L105 202Z','#965e5e',l.edge,1.15)
      +path('M156 147L176 147L185 169L163 180L144 172Z','#6a7c72',l.edge,.85)
      +path('M82 180L112 172L107 197L89 204L78 200Z','#c9ab82',l.edge,.9)
      +seam('M75 173L109 173L117 145M109 174L106 201L128 210L154 201L162 179L181 170M139 166L157 148', '#f3d6ad','2.4 2.7',1.45)
      +thread('M119 188l4 5m-4-1 4-3M141 177l3 4m-3-.4 3-4','#e6bf9d',1.2);
  }else if(variant==='silver'){
    const embroidery='M93 181Q107 177 116 160Q119 169 106 178Q119 177 124 170Q122 182 103 185Q111 186 115 184Q110 193 95 188M151 172Q157 167 162 154Q163 166 157 173Q166 171 171 167Q169 176 153 180';
    body+=path('M89 152Q93 156 92 185L82 197Q84 187 82 172ZM160 143Q178 149 181 170L173 162Q166 150 157 149Z','#7a8190')
      +thread(embroidery,paint(p,'nickel'),2)
      +`<g data-part="thread-light" opacity="0">${thread('M101 181Q110 177 116 160M153 175Q159 170 162 155','#f7f3dc',1.65)}</g>`+thread('M93 191q6 4 12 1m58-16q4-1 7-4','#d3dcdb',1.35)
      +path('M129 147L137 147L144 210L136 213Z','#202733')+thread('M134 149l7 61','#8a949c',1.5)
      +seam('M134 151l7 58','#dedfc9','.7 1.9',1.35)
      +group('zip-pull',path('M136 161l3 0 0 9-2 3-2-2Z',paint(p,'nickel'),'#39464b',.8)+oval(137.2,169.3,.7,1.2,'#444e58'));
  }else{
    body+=path('M137 147L153 151L155 205L146 217L128 220Q139 193 137 147Z','#34293f')
      +path('M166 151Q177 178 185 202L174 209Q171 191 166 183Z','#58425f')
      +thread('M154 152Q149 187 146 216M66 209Q80 212 92 211M152 215Q176 212 192 205',paint(p,'selvedge'),2.2)
      +[166,181,197].map((y,i)=>oval(150-i*.9,y,2.05,2.05,'#c0b7a4')+oval(149.7-i*.9,y-.3,1.1,1.25,'#645267')).join('')
      +thread('M110 171Q102 168 105 161Q99 173 110 174M114 163l1 1','#cabdc2',1.4);
  }
  if(variant!=='velvet'&&variant!=='hoodie')body+=thread('M78 202Q99 216 124 214Q154 218 177 205',l.coat[2],2)+seam('M81 204Q99 214 122 214M150 213q15-1 24-7',l.light);
  if(details)body+=thread('M82 181q-3 11 6 17m85-15q0 11-6 14',l.coat[2],1.35)
    +thread('M96 200l5 2m1-.1 3 .9',l.coat[0],.85);
  return body+collar(variant,p)
    +path('M177 187l11 1-1 8-11-2Z','#d3bf9a','#564e45',.65)
    +thread('M180 190l1.6 2.6 2.5-2.2','#71685c',.9);
}
// Sleeve and stuffed paw share a shoulder pivot. The paw overlaps the turned cuff,
// keeping a complete dark armhole and torso underneath even at full extension.
function arm(p,variant,side,details){
  const l=looks[variant],left=side==='left';
  const form='M89 139C78 138 70 146 66 158L59 175Q56 185 64 192Q75 199 86 191Q94 185 98 169Q107 150 99 144Q95 140 89 139Z';
  const paw='M62 176Q67 173 75 177Q81 177 82 183Q88 179 90 185Q91 191 85 194Q83 199 78 201Q67 205 59 198C54 195 53 189 55 184Q57 178 62 176Z';
  const cuff='M60 173Q68 168 84 176L85 184Q77 188 68 183L58 181Z';
  const fill=variant==='silver'?paint(p,'satin'):variant==='velvet'?paint(p,'velour'):paint(p,'coat');
  let shape=path(form,fill,l.edge,1.6)+path('M82 144Q71 150 66 167Q72 162 77 154L86 145Z',l.coat[0])
    +seam('M74 149Q83 142 92 145',l.light,'1.8 2.2',.9);
  if(variant==='patchwork'){
    shape+=path('M71 152Q75 144 85 142L94 144L89 159L78 172L64 169Z',left?'#91615d':'#5f706c',l.edge,.85)+seam('M68 168L78 171L89 158L94 146',l.light,'2.6 2.35',1.2);
  }
  if(variant==='silver')shape+=thread('M64 175Q69 167 72 162Q74 154 79 153M71 165q7-2 10-7M69 169q6 1 11-2',paint(p,'nickel'),1.6);
  if(variant==='helmet')shape+=path('M75 150l10 2-3 9-10-2Z','#647358',l.edge,.7)+thread('M75 156l3-3 3 3', '#d3c494',1.1);
  shape+=path(paw,paint(p,'linen'),'#796956',1.35)+thread('M85 184q3-2 3 1q0 3-5 6M62 195q4 3 8 3','#aa947a',1.05)
    +path(cuff,variant==='patchwork'?(left?'#b7b9a4':'#7b5555'):variant==='original'?l.coat[0]:l.coat[2],l.edge,1.15)
    +seam('M61 177Q71 173 83 180',l.light,'1.8 1.65',.85)
    +(details&&['silver','hoodie','velvet'].includes(variant)?thread('M64 174l-1 4m5-5-1 6m5-5-1 6m5-5-1 5m4-4-1 5',l.coat[1],1.05):'');
  return group(side+'-arm',left?shape:`<g transform="translate(260 -3) scale(-1 1)">${shape}</g>`);
}

function hood(p,variant,details){
  const l=looks[variant],velvet=variant==='velvet',fill=velvet?paint(p,'velour'):paint(p,'coat');
  const shell='M63 88C57 69 60 52 73 36Q91 15 119 12Q139 10 158 17Q184 26 194 47C205 67 203 93 201 105Q201 124 187 141L169 151Q157 155 145 149L117 149Q96 157 76 142Q62 130 61 112Z';
  const mouth='M73 93Q66 72 78 50Q93 27 119 23Q143 18 166 32Q190 46 194 78L193 109Q188 132 164 146L144 146L101 146Q78 139 71 115Z';
  const binding='M71 114Q65 92 68 69Q71 42 96 27Q124 8 153 20Q182 29 194 52Q205 76 195 113';
  const shoulders=velvet?'':path('M71 40Q87 16 118 9Q153 5 175 20Q194 32 204 52Q210 76 206 107Q203 121 210 139L191 152L162 154L132 145L95 155L69 152L48 141Q56 128 53 105Q48 71 58 53Z',fill,l.edge,2.1)
    +path('M57 74Q58 50 76 34Q57 64 61 96L67 120L60 141L52 139Q58 122 55 106Z','#626a60')
    +path('M201 58Q209 79 201 115Q199 127 204 138L190 146L185 142Q200 106 200 89Z','#717466')
    +thread('M59 59Q63 47 76 34M54 134Q61 127 61 117M192 143l7-9',l.light,1.15)
    +seam('M54 139Q65 148 74 149M196 147l11-8',l.light,'2.2 2.4',1);
  return shoulders+path(shell,fill,l.edge,2)
    +path(mouth,velvet?l.lining:'#8d8c80',l.edge,1.3)
    +path('M77 128Q69 109 72 88Q73 55 93 39Q122 12 157 30Q176 38 188 62Q161 31 136 33Q96 30 82 72Q74 91 78 118Z',velvet?'#817689':'#676d63')
    +thread(binding,velvet?paint(p,'selvedge'):l.coat[0],2.7)
    +thread('M64 103Q60 77 69 56M77 47Q88 32 103 26',l.light,1.15)
    +(details?seam('M67 110Q62 90 66 69Q72 42 93 28M154 19Q183 29 194 50M196 111Q193 128 182 138',l.light,'1.8 2.3',.85):'');
}
function helmet(p,details) {
  const olive=paint(p,'bronze'), edge='#46503d',light='#d4cc9e';
  const dome='M59 64Q61 45 75 31Q93 14 122 12Q148 8 169 18Q190 28 195 47L199 58L202 66Q201 72 193 73L184 73C152 68 131 67 106 74L74 84Q63 86 59 77Z';
  return path(dome,olive,edge,1.9)
    +path('M67 65Q66 49 83 32Q100 16 121 15Q89 31 83 65Z','#a8a97e')
    +path('M151 15Q174 16 188 35Q194 46 195 58L185 57Q179 31 151 15Z','#697550')
    +thread('M82 65Q93 35 119 18M129 15Q152 20 161 56M168 23Q180 36 185 55',edge,1.55)
    +seam('M85 65Q96 35 121 19M132 16Q154 23 164 55',light,'2.5 2.25',.85)
    +path('M59 65Q91 59 118 55Q157 51 196 56L201 65Q181 61 163 63Q125 61 88 76L64 82Q57 80 59 72Z','#5d6950',edge,1.5)
    +path('M59 69Q110 52 167 56Q185 56 199 59L201 63Q177 58 153 61Q118 60 90 71L63 80Z','#889473')
    +path('M65 81L79 76L78 90Q72 94 69 87Z','#586448',edge,1.4)
    +path('M98 59L105 57L107 66L100 68ZM174 55L181 56L182 64L175 63Z','#c5bd91',edge,.9)
    +(details?thread('M65 74Q80 68 91 67M116 60q17-3 30-2M182 28l3 2',light,1):'');
}
function helmetStrap(){
  return path('M76 87L80 86Q86 108 99 124Q111 136 134 141Q149 145 163 138L167 136Q165 142 157 145Q137 152 114 141Q87 129 76 98Z','#747557','#434a3c',1.05)
    +seam('M79 94Q90 123 110 136Q119 141 134 144','#c6bc8e','2.3 2.7',1)
    +path('M98 126l3-3 9 8-3 3Z','#b7ac7b','#555542',.85)
    +thread('M102 126l5 5','#565846',1);
}
function cords() {
  return group('cords',thread('M118 149Q116 157 119 163L117 173M152 149Q157 155 155 159L157 165','#212c28',3.4)
    +thread('M118 149Q116 157 119 163L117 173M152 149Q157 155 155 159L157 165','#c8b99c',1.8)
    +path('M115 171l3 1-1 5-2-1ZM155 163l3-.5 1 4-2 .8Z','#ada997','#464c45',.75)
    +oval(118,149,1.8,1.3,'#a49a83')+oval(152,149,1.8,1.3,'#a49a83'));
}
function scene(p,variant,detail) {
  const look=looks[variant], detailed=detail!=='card';
  const isHood=variant==='hoodie',isVelvet=variant==='velvet',isHelmet=variant==='helmet';
  let head='';
  if(isHood)head+=group('hood',hood(p,variant,detailed));
  if(isVelvet)head+=group('hood',`<g transform="translate(0 132) scale(1 .29) translate(0 -132)">${hood(p,variant,detailed)}</g>`);
  head+=face(p,variant,detailed);
  if(isHelmet)head+=helmetStrap()+group('helmet',helmet(p,detailed));
  const neck=path('M108 128Q129 135 150 128L154 139Q150 150 134 151Q117 152 104 144Z',paint(p,'linen'),'#8d7962',1);
  const strings=isHood?cords():'';
  const shadow=oval(126,230,77,6.3,'#111920')+oval(129,230,66,3.1,'#0c1117');
  return textiles(p,look)+`<g opacity=".32">${shadow}</g>`+path(seatShape,paint(p,'twill'),look.edge,1.6)
    +group('upper',torso(p,variant,detailed)+neck+group('head',head)+arm(p,variant,'right',detailed)+arm(p,variant,'left',detailed)+strings)+feet(p,variant,detailed);
}
const lArm=[88,148],rArm=[172,145],headJoint=[130,137],seat=[128,208];
const pose=(name,origin,...frames)=>({name,origin,frames:[{at:0},...frames,{at:1}]});
function motion(v){
  const body=pose('upper',seat,{at:.12,y:1.1},{at:.24,scaleY:.964,scaleX:1.023},{at:.5,scaleY:.99},{at:.73,scaleY:1.013},{at:.85,scaleY:.997});
  const head=pose('head',headJoint,{at:.15,rotate:-.6},{at:.31,rotate:3.5,y:1},{at:.56,rotate:1.8},{at:.74,rotate:-1.4},{at:.88,rotate:.4});
  const gesture=(...frames)=>pose('left-arm',lArm,...frames);
  let layers;
  if(v==='original')layers=[body,head,gesture({at:.14,rotate:-4},{at:.29,rotate:15},{at:.42,rotate:112},{at:.49,rotate:98},{at:.55,rotate:116},{at:.61,rotate:88},{at:.75,rotate:-4},{at:.88,rotate:1.1}),
    pose('right-arm',rArm,{at:.25,rotate:-3.5},{at:.65,rotate:1.5})];
  if(v==='hoodie')layers=[body,
    pose('head',headJoint,{at:.17,rotate:-1.3},{at:.38,rotate:2.6},{at:.55,rotate:4},{at:.76,rotate:-1.5}),
    gesture({at:.17,rotate:-8},{at:.32,rotate:67},{at:.43,rotate:128},{at:.57,rotate:125},{at:.7,rotate:40},{at:.81,rotate:-3}),
    pose('hood',[128,125],{at:.33,rotate:0},{at:.44,rotate:-2.8,y:2.5},{at:.57,rotate:-3.2,y:3},{at:.68,rotate:1.7},{at:.8,rotate:-.5}),
    pose('cords',[132,149],{at:.34,rotate:0},{at:.48,rotate:7},{at:.62,rotate:-6},{at:.75,rotate:3},{at:.84,rotate:-.9})];
  if(v==='helmet')layers=[
    pose('upper',seat,{at:.19,y:1},{at:.37,rotate:-2,scaleY:.974},{at:.70,rotate:1,scaleY:1.015}),
    pose('head',headJoint,{at:.15,rotate:2},{at:.33,rotate:-11},{at:.48,rotate:-8},{at:.66,rotate:3},{at:.8,rotate:-1}),
    pose('helmet',[128,66],{at:.19,rotate:0},{at:.33,rotate:5,x:2},{at:.42,rotate:-2,x:-1},{at:.52,rotate:4,y:-2},{at:.66,rotate:-2,y:1},{at:.78,rotate:.7}),
    gesture({at:.25,rotate:-5},{at:.40,rotate:118},{at:.49,rotate:143},{at:.57,rotate:135},{at:.72,rotate:12},{at:.83,rotate:-3})];
  if(v==='patchwork')layers=[
    pose('upper',seat,{at:.18,scaleY:1.015},{at:.39,scaleX:.90,scaleY:.967},{at:.53,scaleX:.89,scaleY:.96},{at:.69,scaleX:1.055,scaleY:1.015},{at:.82,scaleX:.993,scaleY:.997}),
    pose('head',headJoint,{at:.24,rotate:-2.5},{at:.44,rotate:4,y:3},{at:.73,rotate:-2,y:-1.2}),
    gesture({at:.18,rotate:9},{at:.37,rotate:-58},{at:.5,rotate:-66},{at:.64,rotate:-43},{at:.76,rotate:5}),
    pose('right-arm',rArm,{at:.18,rotate:-8},{at:.34,rotate:55},{at:.48,rotate:68},{at:.62,rotate:48},{at:.77,rotate:-3.5})];
  if(v==='silver')layers=[
    pose('upper',seat,{at:.17,rotate:-2,scaleX:1.016},{at:.40,rotate:5,scaleX:.93},{at:.53,rotate:4.7,scaleX:.945},{at:.72,rotate:-1.8,scaleX:1.02},{at:.87,rotate:.4}),
    pose('head',headJoint,{at:.19,rotate:1},{at:.42,rotate:-4.5,x:-2.2},{at:.73,rotate:1.5}),gesture({at:.22,rotate:-4},{at:.45,rotate:13},{at:.70,rotate:-5}),
    pose('zip-pull',[137,161],{at:.13,rotate:0},{at:.31,rotate:-11},{at:.46,rotate:-25},{at:.62,rotate:17},{at:.74,rotate:-11},{at:.85,rotate:4}),
    pose('thread-light',[106,177],{at:.2,opacity:0},{at:.38,opacity:.57},{at:.49,opacity:.92},{at:.63,opacity:0})];
  if(v==='velvet')layers=[
    pose('upper',seat,{at:.19,scaleY:.976},{at:.36,scaleY:.99},{at:.53,scaleY:1.012},{at:.8,scaleY:.996}),
    pose('head',headJoint,{at:.19,rotate:1.5},{at:.35,rotate:-2.4,y:1.3},{at:.50,rotate:.7},{at:.7,rotate:-1.5}),
    pose('hood',[128,132],{at:.14,scaleY:.98},{at:.24,scaleY:1.72},{at:.34,scaleY:3.43},{at:.42,scaleY:3.40},{at:.52,scaleY:1.74},{at:.60,scaleY:.91},{at:.67,scaleY:1.05},{at:.74,scaleY:1}),
    gesture({at:.14,rotate:-3},{at:.32,rotate:115},{at:.42,rotate:118},{at:.58,rotate:6},{at:.65,rotate:15},{at:.73,rotate:65},{at:.79,rotate:52},{at:.85,rotate:64},{at:.92,rotate:-2}),
    pose('right-arm',rArm,{at:.17,rotate:3},{at:.31,rotate:-102},{at:.42,rotate:-106},{at:.56,rotate:-16},{at:.65,rotate:3})];
  return {duration:2500,layers};
}

function glyph(v) {
  const l=looks[v];
  const head='M5.5 8Q5.1 4 10 2.8Q16 .7 19.2 5.1Q21.3 8.2 19.5 12.8L17.1 15.6Q14 17.4 10 16.5Q5.5 16 5.5 12Z';
  const hair='M5.3 10.2Q3.3 5.4 6.1 3.4Q9.5 .3 15.7 1.5Q18.2 1.9 19.3 4.4L18.3 6.1L15.5 4.7L12.2 5.1Q8.3 4.2 8.3 7.4L7.1 8.9L7.1 10.4Z';
  let upper='';
  if(v==='hoodie')upper+=path('M2.5 12.8Q.8 3.2 9.8 1.25Q16.5-.6 21.1 4.1Q24.4 8.3 21.7 14L22.8 16.9L19.8 18.1L15 17.2L7 18.1L1 17.4L2.8 15.1Z','#6e7168','#333c39',.8);
  upper+=path(head,l.skin[1],'#796e5b',.68)+path(hair,l.hair[1])
    +path('M7.4 8.2l5.8.2.1 3.1-5.5.2ZM15.2 8.2l4.4-.5-.2 3-4.4.5Z','none','#31342e',1.08)
    +thread('M6.1 8.5l1.1.5m6.2-.1 1.4-.4M13.8 10.1l.6 2.3-.9.3M12.5 14l2-.3 1.6.3','#4a443a',.65)
    +thread('M8.5 9.4l2.9.65m4.7-.45 2.1-.5','#36382e',.78);
  if(v==='helmet')upper+=path('M3.8 7.6Q4.1 2.5 10.4 1.45Q18.5-.7 21.3 5.9L21 7L15.5 6.45L5.8 8.6L3.6 8.4Z','#919b70','#4d5943',.9)+thread('M7 6.2Q9 2.7 12 2M4.7 7.4l10-1.9 5.9.3','#ccd0a8',.64);
  const chest=path('M4.5 17Q5 14 9 14.6Q14 16.6 18.1 14.2Q21.1 14.5 21.5 18.6L22.2 20.3L19.2 21.4L6.1 21.6L2.1 20.6Z',l.coat[1],l.edge,.85);
  let accent='';
  if(v==='hoodie')accent=path('M2.2 15.1l3.5.9 2.5 1.7-4.5-.3-2-1.2ZM21.1 14.2l1.6 2.1-3.2 1.3-2.4.3 2.7-2.2Z','#878b7d')+thread('M9 16l1.4 2.7m6-3-.8 2.8','#eee0bd',.9);
  if(v==='patchwork')accent=path('M5.8 15.7l4.3-.4 1.3 2.8-3 2.3-4.7-1.1Z','#945455')+path('M13.3 17.3l3.8-.8 3.5 2.5-4.6 1.7Z','#6f8275');
  if(v==='silver')accent=thread('M6 19.3q3.6-.8 4.7-3.1m4.2.4.2 3.8m1.1-2.2 2.1-1.5','#e0e4d6',1.05);
  if(v==='velvet')accent=path('M3.2 17.6L4.3 14.7l3.6-.7 4.1 2.3 2.2 1.4 3.1-2.5 3.9-.4-2.8 3.5-4.5 1.8-4.8-1.7Z','#948794','#544352',.6)+thread('M4.5 15.4l8.8 3.8m1.5-.4 5-3.1','#dbc5bd',.72);
  return chest+upper+accent+path('M2.6 18.8Q4.8 16.8 8.4 18.8Q11 20.5 10.2 22Q9.3 23.5 5.6 22.8Q2.1 22.2 2.6 18.8ZM15.7 19.8Q17.7 17.6 20.1 18.6Q22.9 19.4 22 21.4Q20.7 23.3 17.5 23Q14.9 22.7 15.7 19.8Z',l.pants[1],l.edge,.65);
}
const silhouettes={
  original:'M62 82Q57 53 74 33Q95 14 137 21Q177 20 188 51L190 78L185 106Q183 121 170 136Q187 137 197 166Q210 183 205 193L197 199Q211 222 193 232Q172 244 149 232L110 234Q92 247 72 236Q51 225 57 203L56 198Q46 187 59 166Q66 145 82 137L88 134Q72 126 68 104Q57 97 62 82Z',
  hoodie:'M52 112Q47 83 54 57Q66 24 102 12Q157-4 190 28Q210 48 208 88L204 116Q202 130 210 140L190 150L180 150Q195 155 203 178Q210 191 199 199Q212 227 190 234Q165 243 149 232L108 234Q77 248 61 228Q51 217 58 202Q49 198 53 183Q58 158 77 141Q63 133 62 115Z',
  helmet:'M57 62Q61 33 91 18Q122 2 157 13Q186 18 198 49L204 65Q204 74 190 74L187 100Q183 123 171 133Q191 141 201 169Q212 190 200 198Q212 224 194 234Q167 244 150 231L109 233Q83 247 64 231Q50 221 56 204Q48 193 55 177Q65 144 86 136Q70 126 67 103Q61 102 61 93L63 83Q55 80 57 62Z'
};
const descriptions={
  original:['gift-chudjak-original','Oatmeal cotton, felt pile, embroidered features and a sage work shirt.','A seated Chudjak plush with square glasses, a sewn sage shirt and two oat-colored padded feet.','The shoulder hesitates. A stuffed hand rises, gives two small reluctant beats, and drops back into his lap.'],
  hoodie:['gift-chudjak-midnight-hoodie','Charcoal brushed fleece with a lined hood, ribbed cuffs and waxed cords.','A deadpan square-glasses plush inside a lined charcoal hood, with two cream drawstrings.','He reaches for the left edge of the hood. The fabric shifts, then the two cord tips settle against the pouch.'],
  helmet:['gift-chudjak-helmet','Olive cotton panels, canvas pockets, a padded chin strap and brass keepers.','A seated bespectacled Chudjak plush with a quilted olive field helmet, chin strap and two flapped pockets.','A head tilt slips the padded helmet. The paw catches its side; the brim adjusts after the head.'],
  patchwork:['gift-chudjak-patchwork','Cream twill, oxblood and charcoal patches, visible blanket stitching and a repaired knee.','A square-glasses plush in an asymmetric cream, burgundy and sage patchwork suit with different cuffs.','Both arms fold inward, squeezing the stuffing across the sewn joins. The torso puffs back once.'],
  silver:['gift-chudjak-silver-thread','Ink velour, satin bomber panels, silver-thread feather embroidery and nickel zipper hardware.','A dark satin-jacketed Chudjak plush with silver embroidery on the chest and a hanging zip pull.','His shoulder turns. A stitched feather catches the light and the loose zip pull swings after the jacket.'],
  velvet:['gift-chudjak-velvet-eclipse','Plum velvet, moon-gray lining, woven iridescent binding and covered buttons.','A Chudjak plush with an open plum coat, iridescent trim and a folded gray-lined hood beneath the visible face.','The paws raise the folded hood, lower it to reveal his expression, then the near paw gives a tiny wave.']
};
export const plushModels=Object.fromEntries(Object.entries(descriptions).map(([variant,[id,material,alt,storyboard]])=>[id,{
  material,alt,storyboard,mini:glyph(variant),
  silhouette:path(silhouettes[variant]||silhouettes.original,'#10171b'),
  body:(prefix,renderVariant='detail')=>scene(prefix,variant,renderVariant),
  motion:motion(variant)
}]));
