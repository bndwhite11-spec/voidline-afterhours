import {gifts} from './gifts.mjs';
import {telegramCharacters} from './telegram-characters.mjs';
import {telegramObjects} from './telegram-objects.mjs';
import {makeLegacyRevision} from './legacy-rig.mjs';

const master = {...gifts,...telegramObjects,...telegramCharacters};
const stroke = (d,color,width=1) => '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';
const articulated = (name,origin,poses) => ({name,origin,frames:[{at:0},...poses,{at:1}]});
const glow = (name,origin,opacity,poses) => ({name,origin,frames:[{at:0,opacity},...poses,{at:1,opacity}]});
const clip = (duration,...layers) => ({duration,layers});
const stock = (id,changes) => makeLegacyRevision(id,master[id],changes);

function datedRose(prefix) {
  // Light follows the rim of each moving petal. Attaching the engraving to
  // the petal makes its curvature survive the opening gesture.
  return master['gift-rose'].body(prefix)
    .replace('</g>\n   <g data-part="rose-heart">',stroke('M85 72Q89 63 105 65','#cbd8d7',1.1)+'</g>\n   <g data-part="rose-heart">');
}
const petal = (name,origin,degrees,lag) => articulated(name,origin,[
  {at:.13+lag,rotate:-degrees*.12},{at:.50+lag,rotate:degrees},
  {at:.72+lag,rotate:degrees*.55},{at:.90+lag,rotate:-degrees*.05}
]);

const seraphTracks = ['upper','middle','lower'].flatMap((level,index) => {
  const y = [96,117,140][index],left = [111,109,111][index];
  return [petal('seraph-left-'+level,[left,y],[-16,-12,-8][index],index*.018),
    petal('seraph-right-'+level,[256-left,y],[16,12,8][index],index*.018)];
});
function tankBody(prefix) {
  const vapor='<g data-part="tank-outlet-vapor" opacity="0">'+
    stroke('M209 139q14-6 10-13t7-12','#c0e4d4',3)+stroke('M213 139q16-1 16-10t9-8','#95bcee',1.5)+'</g>';
  return vapor+master['gift-copium-tank'].body(prefix);
}
function meterBody(prefix) {
  return master['gift-aura-meter'].body(prefix)+
    '<path d="M78 88q44-9 81-3l-7 3q-41-3-74 2Z" fill="#eff8f1" opacity=".21"/>';
}
export const curatedWorkshop = {
  'gift-chudjak-plush':stock('gift-chudjak-plush',{motion:clip(1840,
    articulated('chud-head',[128,133],[{at:.20,rotate:1},{at:.49,rotate:-3,y:1},{at:.76,rotate:-1}]),
    articulated('chud-note',[128,175],[{at:.29,rotate:-1},{at:.58,rotate:2,y:1}]))}),
  'gift-rose':stock('gift-rose',{body:datedRose,motion:clip(1840,
    petal('rose-petal-crown',[129,101],-7,0),petal('rose-petal-back',[126,100],-9,.03),
    petal('rose-petal-right',[130,102],12,.015),petal('rose-petal-left',[129,108],-11,.02),
    petal('rose-petal-front-right',[128,111],9,.045),petal('rose-petal-front-left',[129,111],-10,.05),
    articulated('rose-leaf',[136,167],[{at:.33,rotate:-3},{at:.60,rotate:4}]),
    glow('rose-reflection',[128,92],.45,[{at:.28,opacity:.16},{at:.57,opacity:.87},{at:.82,opacity:.25}]))}),
  'gift-ghost':stock('gift-ghost',{motion:clip(1520,
    petal('ghost-underfold',[128,120],4,.025),petal('ghost-paper-left',[117,117],-5,.03),
    petal('ghost-paper-right',[134,114],6,.045),articulated('ghost-expression',[129,112],[{at:.40,y:-1},{at:.62,y:1}]))}),
  'gift-seraph':stock('gift-seraph',{motion:clip(1740,...seraphTracks,
    glow('seraph-core-glint',[128,121],.55,[{at:.3,opacity:.27},{at:.59,opacity:.98},{at:.8,opacity:.64}]))}),
  'gift-key':stock('gift-key',{motion:clip(1680,
    articulated('key-clasp-left',[157,216],[{at:.18,rotate:-13},{at:.65,rotate:-13}]),
    articulated('key-clasp-right',[177,216],[{at:.18,rotate:14},{at:.65,rotate:14}]),
    articulated('key-glass',[160,187],[{at:.23,rotate:-2},{at:.52,rotate:7,scaleX:.91},{at:.73,rotate:1}]),
    glow('key-cut-glint',[102,106],.55,[{at:.24,opacity:.18},{at:.55,opacity:.9}]))}),
  'gift-halo':stock('gift-halo',{motion:clip(1630,
    articulated('halo-left-segment',[107,59],[{at:.20,rotate:-3,x:-2},{at:.50,rotate:4,x:2},{at:.8,rotate:-1}]),
    articulated('halo-right-segment',[138,59],[{at:.22,rotate:3,x:2},{at:.51,rotate:-4,x:-2},{at:.82,rotate:.75}]),
    articulated('halo-bottom-segment',[127,181],[{at:.25,y:2},{at:.55,y:-2},{at:.8,y:.5}]))}),
  'gift-orchid':stock('gift-orchid',{motion:clip(1870,
    petal('orchid-upper-left',[122,119],-9,0),petal('orchid-upper-right',[133,118],10,.015),
    petal('orchid-left',[117,128],-8,.045),petal('orchid-right',[138,129],7,.055),petal('orchid-lip',[126,137],4,.08))}),
  'gift-larp-kit':stock('gift-larp-kit',{motion:clip(1640,
    articulated('kit-lid',[122,124],[{at:.22,scaleY:.95},{at:.49,scaleY:1.15},{at:.75,scaleY:1.06}]),
    petal('kit-map',[86,147],-5,.04),petal('kit-plume',[163,111],7,.075))}),
  'gift-aura-meter':stock('gift-aura-meter',{body:meterBody,motion:clip(1480,
    articulated('aura-needle',[126,151],[{at:.18,rotate:-4},{at:.47,rotate:28},{at:.61,rotate:19},{at:.73,rotate:21},{at:.88,rotate:5}]),
    glow('aura-lamp',[78,185],1,[{at:.16,opacity:.52},{at:.48,opacity:1},{at:.71,opacity:.74}]))}),
  'gift-copium-tank':stock('gift-copium-tank',{body:tankBody,motion:clip(1780,
    articulated('tank-valve',[123,37],[{at:.2,rotate:-4},{at:.44,rotate:36},{at:.66,rotate:36}]),
    articulated('tank-gauge',[174,96],[{at:.30,rotate:1},{at:.48,rotate:20},{at:.60,rotate:16},{at:.82,rotate:2}]),
    glow('tank-outlet-vapor',[210,139],0,[{at:.36,opacity:0,scaleY:.65},{at:.5,opacity:.64},{at:.7,opacity:.20,y:-4},{at:.82,opacity:0,y:-7}]))}),
  'gift-cold-wallet':stock('gift-cold-wallet',{motion:clip(1660,
    articulated('wallet-clasp',[149,191],[{at:.2,rotate:-17},{at:.63,rotate:-17}]),
    articulated('wallet-lid',[123,119],[{at:.21,scaleY:.94},{at:.53,scaleY:1.16},{at:.67,scaleY:1.13}]),
    glow('wallet-display',[130,148],1,[{at:.18,opacity:.44},{at:.52,opacity:1},{at:.80,opacity:.8}]))}),
  'gift-copium-cartridge':stock('gift-copium-cartridge',{motion:clip(1620,
    articulated('cartridge-plunger',[204,150],[{at:.20,x:2},{at:.43,x:-7},{at:.69,x:-2}]),
    articulated('cartridge-needle',[137,148],[{at:.28,rotate:-2},{at:.53,rotate:22},{at:.71,rotate:12}]),
    glow('cartridge-vapor',[51,98],1,[{at:.23,opacity:.3},{at:.58,opacity:.89,y:-3},{at:.74,opacity:.22,y:-4}]))})
};
