import {materialDefs} from './materials.mjs';
import {legacyPresentations} from '../collectibles/legacy-presentations.mjs';

// The earlier vector masters use one-shot openings. Rehearse their local joints
// from the actual rest drawing and return each joint to that drawing after the action.
function restingClip(master) {
  const source = master.body('resting');
  const layers = master.motion.layers.map(layer => {
    const target = source.match(new RegExp('<[^>]*data-part="'+layer.name+'"[^>]*>'))?.[0] || '';
    const opacity = Number(target.match(/\sopacity="([^"]+)"/)?.[1] ?? 1);
    const rest = {at:0,opacity};
    const poses = layer.frames.map(frame => {
      const {at, ...values} = frame;
      return {at:.09 + .70 * at, ...values, opacity:values.opacity ?? opacity};
    });
    return {...layer,frames:[rest,...poses,{...rest,at:1}]};
  });
  return {duration:Math.min(2550,Math.round(master.motion.duration*1.18)),layers};
}
export function makeLegacyRevision(id, master, changes = {}) {
  const info = legacyPresentations[id];
  if (!info) throw Error('Missing legacy presentation '+id);
  const draw = changes.body || master.body;
  return {
    ...master, ...info, ...changes,
    assetKind:'layered-svg', artRevision:info.artRevision, acquisitionPolicy:'legacy-free',
    body(prefix,variant) {
      // Optical and inspection output reuse one pose. Detail-only incisions are
      // static paths; strip the old presentation class from the isolated SVG.
      const body = draw(prefix,variant).replaceAll(' class="va-detail-only"','');
      return '<defs>'+materialDefs(prefix)+'</defs>'+body;
    },
    storyboard:changes.storyboard || info.description,
    motion:changes.motion || restingClip(master),
  };
}
