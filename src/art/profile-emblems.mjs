/** Die-cut profile pins. Each drawing has a simplified 24-unit optical master.
 * The larger enamel proofs add a recessed edge, local engraving and a moving
 * accent. Negative spaces and contrasting keylines keep the pins legible on
 * both public profile backgrounds. Geometry is original to VOIDLINE.
 */
import {emblemPresentations} from '../collectibles/emblem-presentations.mjs';
const pin = (colors, edge, face, cut, accent, engraving, pivot, turn) => ({
  colors, edge, face, cut, accent, engraving, pivot, turn
});
const pins = {
  larp: pin(
    ['#d7e7e9','#80999e','#233744','#f8c76b'], 'M4 7L10 2l6 1 4 5-.4 5-4.1 6.4-3.1 2L6.1 18 4 13Z',
    'M4.8 8.5L10 3l4.8.5L17 6l-4 1.3-3.4 3.1Z','M4.5 9.2l5.6.9L19.6 7l-.3 3.5-9.1 3.7-5.4-2Z',
    'M15.6 6.5l2.1-.7.4 1.3-2 .7Z','M8 14.3l1.2 3m1.1-3.5 1.2 4m1-5 1 4.8m1-5.7.6 4.2',[18,7],-11),
  angel: pin(
    ['#faf1cf','#b5c8cf','#58677f','#ffd48e'], 'M1.4 8.8l4.3 1.4L4 5.5l5.3 3.8 2.6 4 2.7-4L20 5.5l-1.6 4.7 4.1-1.4-2.1 5.5-6.9 6.4h-3l-6.8-6.4Z',
    'M2.4 9.9l7.2 4-2.3-4.5 4.4 5.2.3 4.6-5.6-4.9Z','M4.3 13.4l5.1 2.1-3.6-.4 3.7 2.6-3-.7Zm15.4.2-4.8 1.9 3.3-.3-3.6 2.4 3-.9Z',
    'M8.4 5C8 1.8 15.6.9 16 3.2c.3 1.4-1.6 2.8-3.5 3.1l-.4-1.3c1.5-.3 2.6-1 2.5-1.5-.2-.8-5 .1-4.7 1.1Z','M5.5 11.2l3.3 2m10.1-2-3.5 2.4',[12,4],8),
  ghost: pin(
    ['#c9f3db','#80bea6','#234a50','#ffffcd'], 'M2.3 8.2H5V5.8h2.1v8.9c0 2.1 1.8 3.8 4.9 3.8s4.9-1.8 4.9-3.8V5.9H19v2.3h2.8v6.3c0 3.7-2.8 6.8-7.9 7.6h-3.8c-4.9-.8-7.8-3.8-7.8-7.7Z',
    'M7 12.2c0-4.2 1-9.8 5.5-10.1 4.4-.3 4.8 3.5 4.7 6.7l-.2 6.5-2-1-1.6 2.4-2.6-1.9-3 1.1Z','M9.5 8.1c.8-.5 1.5.1 1.2 1.7-.2 1.2-1.3 1.5-1.5.5Zm4-1c.9-.5 1.6.1 1.2 1.9-.3 1.2-1.3 1.3-1.5.3Z',
    'M3.5 7.2h1.3v7.4l-1.3-1ZM19.5 6.2h1.3v6.3l-1.3 1Z','M10.5 5.2q1.4-1.2 2.8-1.2M7.8 18.1l2.1.9',[12,14],-7),
  night: pin(
    ['#eee3bd','#baa776','#363b58','#acd7df'], 'M15.4 2.1A10 10 0 1 0 21.7 16c-3.3 1.9-7.1 1.3-9.7-1.2C8.4 11 9.1 5.6 15.4 2.1Z',
    'M13.2 3.4a9.2 9.2 0 0 0-8.5 11.5L7 17.6c-3-5.4-.2-11.4 6.2-14.2Z','M5.6 16.5l1-.2.6 1.1-.8.5Zm2.1 2.2.8-.6 1.2.7-.6.8Z',
    'M17.9 4.7l.9 2.8 2.6 1-2.6 1-.9 2.9-.9-2.9-2.6-1 2.6-1Z','M10.5 20.2q2.7.7 4.6.3',[18,8.5],16),
  'ego-unique-one': pin(
    ['#eadcbb','#a49883','#34434c','#f3c272'], 'M4 21.6l3-4.2 2.9-2-1.3-1.3-1.1-2.6-2.9-.7 2.5-3.1.8-3.5 3.8-2.1 4.6.5 3.1 3.7-.3 4.5-1.7 3.4.6 2.6 3.1 4.8Z',
    'M8.3 7.7l.7-3 3.3-1.8 4.1.4L19 5.9l-2.4-.5.3 1.7-2.7-1.4-2.5.6Z','M7.7 17.8l6.9-3.2 2.9-.8-.3 2.1-6.6 3.3L9 21.1Zm2.9-9.3 5.2-.8-.1.9-4.9.8Z',
    'M7.6 8.9c.8-1.1 3-.8 3.2.4.2 1.5-1.2 2.6-2.6 2.3s-1.5-1.6-.6-2.7Zm.8.6c-.6.8-.2 1.3.5 1.3s1.4-.6 1.2-1.2c-.1-.6-1.2-.8-1.7-.1Z','M12.4 4.2l2-.3m-1.3 1.2 2.1-.4M11.6 17.9l3.4-1.6',[9,10],-5),
  'meme-nothing-happens': pin(
    ['#e2ccb1','#aa9178','#414547','#d4e5d6'], 'M4.4 4.9l3.5-2.2 9-.2 3.9 3.4.2 5.8-1.8 1.8-1 5-3.6 3.3-5.4-.1-3.9-4.4-.8-4.4-1.7-2.2Z',
    'M4 5.4l4.1-2.3 8.3-.2 3.9 3.2-.1 2.6-3.6-2.1-2.2 1.2-2.1-1.5-2 1.1-1.2-.8-4.1 2Z','M5 9.1l5.8-.1.7.8 1.3-.2.5-.9 5.6-.4.1 4.2-5.5.7-.5-2-1.5.3-.2 1.8-5.6.1Zm1.6 1.4.2 1.5 2.7-.1.2-1.4Zm8-.4.2 1.5 2.6-.3.2-1.4Z',
    'M8.7 16.7l3.4-.9 3.1.4-.2 1-2.9-.3-3.2.8Z','M7.7 4.9l3.8-.7m4.1 12.6-.6 1.2',[12,16.8],-6),
  'coin-genesis-block': pin(
    ['#e4d9c2','#8398ab','#3a506a','#e6ac67'], 'M12 1.4l9.3 5.4V17L12 22.6 2.7 17V6.8Z',
    'M12 2.9l7.8 4.4-7.8 4.5-7.8-4.5Z','M3.8 8.6l7.4 4.3v7.8l-7.4-4.2Zm9 4.3 7.4-4.3v7.8l-7.4 4.3Z',
    'M12 5.3l3.4 2-3.4 2-3.5-2Zm-6.3 7.3L9 14.5v2.9l-3.3-2Zm9.4 1.1 3.2-1.9v3l-3.2 1.9Z','M12 4l5.9 3.3M5.1 10.6l4.8 2.9m3.9.1 5.4-3.2',[12,7.3],7),
  'meme-yapper': pin(
    ['#ffdab2','#d78c6c','#673f4d','#fff0ce'], 'M4 3.4h12.8c2 0 3.1 1.2 3.1 3v1.5h.9c1.2 0 2 .9 2 2v6.7c0 1.6-1.2 2.5-2.6 2.5h-.9l.7 2.6-4.7-2.6H10c-1.7 0-2.9-1.1-2.9-2.7v-1H6L2.3 18l.9-4.1C2 13.5 1.4 12.5 1.4 11V6.2C1.4 4.4 2.5 3.4 4 3.4Z',
    'M4.6 4.3h11.6c1.6 0 2.4.6 2.4 2.2V11c0 1.3-.9 2.1-2.4 2.1H6.1l-2 1.8.5-2.3c-1.2-.2-2-1-2-2.2V6.6c0-1.5.6-2.3 2-2.3Z','M5.1 7h1.8v2H5.1Zm4.7 0h1.9v2H9.8Zm4.6 0h1.9v2h-1.9Z',
    'M10.3 15.3h8.8v1.4h-8.8Z','M4.6 5.5h9.3m3.2 12.1h1.7',[15,16],-10),
  'profile-authored': pin(
    ['#d3dfec','#7894b4','#344961','#ffdda0'], 'M12 1.3l8.2 3.8.1 9.2-3.5 4.6-4.8 3.8-4.8-3.8-3.5-4.6.2-9.2Z',
    'M11.8 2.9 5.3 6l-.1 7.5 2.6 3.8 3.8 3.1-3.1-4.6-.5-4.1Z','M8 14.9l.5-6.1 7.8-3.5 1.5 1.5-3.6 7.6-6.2 1.8Z',
    'M8.7 15l3.3-5q-.2-1.6 1.1-1.8 1.6-.2 1.4 1.2-.1 1.5-1.6 1.3Z','M7.2 6.9l2.4-1m5.2 11.4-2.9 2.3',[9,15],-10),
  'reviewed-contribution': pin(
    ['#e7d8b0','#9bb1a0','#325457','#f8dfa1'], 'M4.3 2.1l6.3.7 1.7 3.6 1.7-3.6 5.7-.7-2.1 6.8 3 4.3-1.3 5.8-6.9 3.8-7.1-3.5-1.7-6 3.4-4.4Z',
    'M5.6 3.6l4.1.4 2.2 4.5-3.8 1.1ZM14.8 4l3.3-.5-1.8 5-3.4-.3Z','M6.3 11.4l5.8-2.2 5.8 2.2 1 4.4-3.2 3.5-3.4 1.5-4-1.6-2.8-3.5Z',
    'M12 10.5l1.2 3.1 3.4.2-2.6 2 1 3.1-3-1.8-2.8 1.8.8-3.1-2.4-2 3.2-.2Z','M6.8 5.1l2.5 2.7m6.9-3-.9 2.1',[12,15],9),
};
const shape = (d, fill) => '<path d="'+d+'" fill="'+fill+'" fill-rule="evenodd"/>';
const line = (d, color, width) => '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linejoin="round" stroke-linecap="round"/>';
function engraving(item, prefix, mini) {
  const [light, base, ink, accent]=item.colors;
  const paint=mini?base:'url(#'+prefix+'-metal)';
  const trim=mini?light:'url(#'+prefix+'-polish)';
  return line(item.edge, '#17202b', mini?2.1:1.1)+shape(item.edge,paint)+line(item.edge,light,mini?.56:.40)
    +shape(item.face,trim)+shape(item.cut,ink)
    +'<g data-part="pin-accent">'+shape(item.accent,accent)+'</g>'
    +(mini?'':line(item.engraving,ink,.39)+line(item.engraving,light,.14));
}
const stops=entries=>entries.map(([at,c])=>'<stop offset="'+at+'%" stop-color="'+c+'"/>').join('');
export const opticalEmblems=Object.freeze(Object.fromEntries(Object.entries(pins).map(([id,item])=>{
  const [light,base,shade,accent]=item.colors;
  return [id,{
    ...emblemPresentations[id],assetKind:'layered-svg',edition:'enamel-01',
    mini:engraving(item,'',true),
    body(prefix){return '<defs><linearGradient id="'+prefix+'-metal" x1="0%" y1="0%" x2="100%" y2="85%">'+stops([[0,light],[24,base],[49,light],[51,base],[100,shade]])+'</linearGradient><linearGradient id="'+prefix+'-polish" x1="0%" y1="0%" x2="42%" y2="100%">'+stops([[0,light],[46,light],[64,base],[91,accent],[100,base]])+'</linearGradient></defs><g transform="translate(13 13) scale(9.6)">'+line(item.edge,shade,1.35)+engraving(item,prefix,false)+'</g>';},
    silhouette:'<g transform="translate(13 13) scale(9.6)">'+shape(item.edge,'#10161d')+'</g>',
    motion:{duration:1150,layers:[{name:'pin-accent',origin:item.pivot,frames:[{at:0},{at:.19},{at:.43,rotate:item.turn},{at:.62,rotate:-item.turn*.24},{at:.82,rotate:item.turn*.07},{at:1}]}]},
    storyboard:'A short tilt catches the colored inlay, which rebounds into its enamel seat and settles.'
  }];
})));
