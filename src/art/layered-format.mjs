// Shared build/runtime contract for original SVG masters. All paint servers and
// all motion targets must be inside this one illustration.
const elements = new Set('svg g defs linearGradient radialGradient stop path rect circle ellipse line polyline polygon clipPath mask title desc text tspan'.split(' '));
const attributes = new Set(('xmlns id width height viewBox preserveAspectRatio data-vc-object data-art-version data-variant data-motion data-part role aria-labelledby '+
  'x y x1 y1 x2 y2 cx cy r rx ry fx fy fr d points offset transform fill fill-opacity fill-rule clip-rule clip-path mask opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset '+
  'gradientUnits gradientTransform spreadMethod stop-color stop-opacity clipPathUnits maskUnits maskContentUnits color font-size font-family font-weight text-anchor letter-spacing dominant-baseline').split(' '));
const numberFields=new Set(['at','x','y','rotate','scaleX','scaleY','opacity']);
const partName=/^[a-z][a-z0-9-]{0,63}$/;
const localId=/^[a-zA-Z][\w:.-]*$/;
export function validateLayeredScene(svg,modelId,variant) {
  if (svg.localName!=='svg' || svg.getAttribute('data-vc-object')!==modelId || svg.getAttribute('data-variant')!==variant) throw Error('Incorrect model or variant');
  const ids=new Set(), paints=[], parts=new Map();
  for(const node of [svg,...svg.querySelectorAll('*')]){
    if(!elements.has(node.localName)||node.namespaceURI!=='http://www.w3.org/2000/svg')throw Error('Unsupported SVG element');
    for(const {name,value} of [...node.attributes]){
      if(!attributes.has(name))throw Error('Unsupported SVG attribute '+name);
      if(name==='xmlns'&&(node!==svg||value!=='http://www.w3.org/2000/svg'))throw Error('Invalid SVG namespace');
      if(name==='id'){if(!localId.test(value)||ids.has(value))throw Error('Invalid SVG ID');ids.add(value);}
      if(name==='data-part'){if(!partName.test(value))throw Error('Invalid part name');parts.set(value,1+(parts.get(value)||0));}
      if(name==='data-motion'&&(node!==svg||variant!=='detail'))throw Error('Unexpected choreography');
      if(/url\s*\(/i.test(value)){
        const ref=/^url\(#([a-zA-Z][\w:.-]*)\)$/.exec(value);
        if(!ref||!['fill','stroke','mask','clip-path'].includes(name))throw Error('Invalid paint reference');
        paints.push(ref[1]);
      }
    }
  }
  if(paints.some(id=>!ids.has(id)))throw Error('Missing paint reference');
  if(variant!=='detail')return null;
  const motion=JSON.parse(svg.getAttribute('data-motion')||'null');
  if(!motion||!Number.isInteger(motion.duration)||motion.duration<900||motion.duration>3000||!Array.isArray(motion.layers)||!motion.layers.length||motion.layers.length>48)throw Error('Invalid clip');
  const seen=new Set();
  for(const layer of motion.layers){
    if(!partName.test(layer.name)||parts.get(layer.name)!==1||seen.has(layer.name))throw Error('Unbound or ambiguous motion track '+layer.name);
    seen.add(layer.name);
    if(!Array.isArray(layer.origin)||layer.origin.length!==2||layer.origin.some(n=>!Number.isFinite(n)||Math.abs(n)>512))throw Error('Invalid pivot');
    if(!Array.isArray(layer.frames)||layer.frames.length<2||layer.frames.length>48||layer.frames[0].at!==0||layer.frames.at(-1).at!==1)throw Error('Invalid clip endpoints');
    let previous=-1;
    for(const frame of layer.frames){
      if(!Number.isFinite(frame.at)||frame.at<=previous||frame.at>1)throw Error('Unordered motion frame');
      previous=frame.at;
      for(const [field,n] of Object.entries(frame)){
        if(!numberFields.has(field)||!Number.isFinite(n)||Math.abs(n)>1024)throw Error('Invalid motion property');
        if(field==='opacity'&&(n<0||n>1))throw Error('Invalid track opacity');
        if((field==='scaleX'||field==='scaleY')&&Math.abs(n)>8)throw Error('Invalid track scale');
      }
    }
    for(const frame of [layer.frames[0],layer.frames.at(-1)])for(const [key,n] of Object.entries(frame)) {
      if(key!=='at'&&n!==(key.startsWith('scale')?1:0)&&key!=='opacity')throw Error('Clip must start and finish at rest');
      if(key==='opacity'&&n!==Number(svg.querySelector('[data-part="'+layer.name+'"]').getAttribute('opacity')??1))throw Error('Resting opacity mismatch');
    }
  }
  return motion;
}
