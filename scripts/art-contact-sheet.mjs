import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {artCatalog,artSVG} from '../src/art/catalog.mjs';
const all=process.argv.includes('--all'),out=all?'/workspace/work/voidline-output/art-v18':'/workspace/work/voidline-output/art-prototypes-v18';
const ids=all?Object.keys(artCatalog):['ego-unique-one','meme-nothing-happens','larp','coin-crosssignal','gift-rose','gift-cassette'];
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
let instance=0;
function nested(id,variant,x,y,size){return `<g transform="translate(${x} ${y})">${artSVG(id,variant).replaceAll('va3-'+id+'-'+variant,'sheet'+(++instance)).replace(/width="\d+" height="\d+"/,`width="${size}" height="${size}"`)}</g>`;}
await mkdir(out,{recursive:true});
const columns=3,w=1440,cellW=w/columns,cellH=440,rows=Math.ceil(ids.length/columns),h=rows*cellH+64;
const cells=ids.map((id,i)=>{const a=artCatalog[id],x=i%columns*cellW,y=Math.floor(i/columns)*cellH+54;return `<g transform="translate(${x} ${y})"><rect x="10" y="5" width="460" height="426" rx="8" fill="#15181d" stroke="#303740"/><text x="28" y="33" fill="#f1f0ec" font-family="DejaVu Sans,sans-serif" font-size="18">${esc(a.name)}</text>${nested(id,'detail',112,48,256)}${nested(id,'card',24,150,80)}<rect x="380" y="157" width="66" height="66" rx="3" fill="#e2ddce"/>${nested(id,'silhouette',381,158,64)}<text x="27" y="249" fill="#a5abb4" font-family="sans-serif" font-size="12">80 px card</text><text x="380" y="249" fill="#a5abb4" font-family="sans-serif" font-size="12">silhouette</text>${nested(id,'mini',28,324,16)}${nested(id,'mini',64,322,20)}${nested(id,'mini',104,320,24)}${nested(id,'mini',156,304,64)}<text x="28" y="365" fill="#a5abb4" font-family="sans-serif" font-size="12">16 / 20 / 24 px · enlarged optical drawing</text><text x="28" y="397" fill="#c2c8ce" font-family="sans-serif" font-size="12">${esc(a.material.slice(0,62))}</text></g>`;}).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#0e1013"/><text x="28" y="34" fill="#f1f0ec" font-family="DejaVu Sans,sans-serif" font-size="22">VOIDLINE / ${all?'Complete edition 3 artwork':'Six-object illustration quality gate'}</text>${cells}</svg>`;
await writeFile(out+'/contact-sheet.svg',svg);
const render=spawnSync('inkscape',[out+'/contact-sheet.svg','--export-type=png','--export-width=1440','--export-filename='+out+'/contact-sheet.png'],{encoding:'utf8',env:{...process.env,INKSCAPE_PROFILE_DIR:'/tmp/voidline-inkscape-profile'},timeout:120000});if(render.status)throw Error(render.stderr.slice(-1000));
console.log(JSON.stringify({sheet:out+'/contact-sheet.png',editable:out+'/contact-sheet.svg',items:ids.length,renderer:'Inkscape',browser:false}));
// Actual optical marks and silhouette grid, independent of browser UI.
if(all){
 const renderSheet=async(name,content,width,height)=>{
  const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#0e1013"/>${content}</svg>`;
  await writeFile(out+'/'+name+'.svg',source);
  const result=spawnSync('inkscape',[out+'/'+name+'.svg','--export-type=png','--export-width='+width,'--export-filename='+out+'/'+name+'.png'],{encoding:'utf8',env:{...process.env,INKSCAPE_PROFILE_DIR:'/tmp/voidline-inkscape-profile'},timeout:120000});if(result.status)throw Error(result.stderr.slice(-1000));
 };
 const badges=ids.filter(id=>artCatalog[id].type==='badge'),cols=6,cw=220,rh=68;
 await renderSheet('badge-optical-strip',`<text x="20" y="30" fill="#f1f0ec" font-family="DejaVu Sans,sans-serif" font-size="20">VOIDLINE / 20px decorative badges</text>`+badges.map((id,i)=>{const x=20+i%cols*cw,y=55+Math.floor(i/cols)*rh;return nested(id,'mini',x,y,20)+`<text x="${x+30}" y="${y+15}" fill="#d9e0e3" font-family="DejaVu Sans,sans-serif" font-size="13">${esc(artCatalog[id].name)}</text>`;}).join(''),1360,Math.ceil(badges.length/cols)*rh+64);
 await renderSheet('silhouette-grid',`<text x="20" y="30" fill="#f1f0ec" font-family="DejaVu Sans,sans-serif" font-size="20">VOIDLINE / construction silhouettes</text>`+ids.map((id,i)=>{const x=20+i%9*148,y=52+Math.floor(i/9)*138;return `<rect x="${x+23}" y="${y}" width="96" height="96" fill="#dbe1dc" rx="2"/>`+nested(id,'silhouette',x+23,y,96)+`<text x="${x+2}" y="${y+118}" fill="#d9e0e3" font-family="DejaVu Sans,sans-serif" font-size="10">${esc(artCatalog[id].name)}</text>`;}).join(''),1360,Math.ceil(ids.length/9)*138+66);
 console.log(JSON.stringify({optical:out+'/badge-optical-strip.png',silhouettes:out+'/silhouette-grid.png',renderer:'Inkscape',browser:false}));
}
