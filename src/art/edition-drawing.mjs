// Geometry and timing primitives shared by the three original capsule editions.
export const shape = (d, fill, extra='') => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const stroke = (d, color, width=1, extra='') => shape(d, 'none', `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}`);
export const rect = (x,y,w,h,r,fill,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
export const oval = (x,y,rx,ry,fill,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
export const part=(name,content) => `<g data-part="${name}">${content}</g>`;
export function finish(id,colors,vertical=true) {
  return `<linearGradient id="${id}" x1="0%" y1="0%" x2="${vertical?'0':'100'}%" y2="${vertical?'100':'0'}%">${colors.map((c,i)=>`<stop offset="${Math.round(100*i/(colors.length-1))}%" stop-color="${c}"/>`).join('')}</linearGradient>`;
}
export const paint=id=>`url(#${id})`;
export const track=(name,origin,...poses)=>({name,origin,frames:[{at:0},...poses,{at:1}]});
export const hiddenTrack=(name,origin,...poses)=>({name,origin,frames:[{at:0,opacity:0},...poses,{at:1,opacity:0}]});
export const edge='stroke="#283038" stroke-width="2" stroke-linejoin="round"';
export function fastener(x,y,r=2) {
  return oval(x,y,r,r,'#3b4649')+oval(x-.25,y-.35,r*.75,r*.72,'#adae9c')+stroke(`M${x-r*.45} ${y+r*.30}l${r*.9} -${r*.64}`,'#575952',.75);
}
