/** Sample the same named tracks and per-interval easing as the shipped player for offline artwork review. */
function easing(fraction){
  // WAAPI's per-segment ease-in-out is cubic-bezier(.42,0,.58,1).
  let low=0,high=1;
  for(let i=0;i<19;i++){
    const t=(low+high)/2, one=1-t;
    if(3*one*one*t*.42+3*one*t*t*.58+t*t*t<fraction)low=t;else high=t;
  }
  const t=(low+high)/2;
  return (3-2*t)*t*t;
}
function sample(layer,progress,key,defaultValue) {
  const next=layer.frames.findIndex(frame=>frame.at>=progress);
  if(next<=0)return layer.frames[next===0?0:layer.frames.length-1][key]??defaultValue;
  const left=layer.frames[next-1], right=layer.frames[next];
  if(right.at===progress)return right[key]??defaultValue;
  const t=easing((progress-left.at)/(right.at-left.at));
  const a=left[key]??defaultValue, b=right[key]??defaultValue;
  return a+(b-a)*t;
}
export function sampleArtPose(dom,motion,time) {
  const scene=dom.window.document.documentElement.cloneNode(true);
  for(const layer of motion.layers){
    const [ox,oy]=layer.origin;
    for(const node of scene.querySelectorAll('[data-part="'+layer.name+'"]')){
      const get=(key,fallback)=>sample(layer,time,key,fallback);
      const base=node.getAttribute('transform')||'';
      node.setAttribute('transform',`translate(${ox+get('x',0)} ${oy+get('y',0)}) rotate(${get('rotate',0)}) scale(${get('scaleX',1)} ${get('scaleY',1)}) translate(${-ox} ${-oy}) ${base}`);
      node.setAttribute('opacity',get('opacity',Number(node.getAttribute('opacity')??1)));
    }
  }
  return new dom.window.XMLSerializer().serializeToString(scene);
}

