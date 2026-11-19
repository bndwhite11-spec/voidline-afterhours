/** Profile-only static SVG import. The original document is never displayed or uploaded. */
import createDOMPurify from 'dompurify';

const SVG_NS='http://www.w3.org/2000/svg';
const MAX_BYTES=1024*1024,MAX_NODES=10000,MAX_DEPTH=64,MAX_TEXT=131072,MAX_PATH=65536,MAX_PATH_TOTAL=262144;
const TAGS=['#text','svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','defs','lineargradient','radialgradient','stop','clippath','title','desc'];
const ATTRS=['xmlns','id','viewbox','preserveaspectratio','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','fx','fy','dx','dy','d','points','transform','fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-dasharray','stroke-dashoffset','stroke-opacity','opacity','vector-effect','paint-order','clip-path','clip-rule','clippathunits','gradientunits','gradienttransform','spreadmethod','offset','stop-color','stop-opacity','font-family','font-size','font-weight','font-style','text-anchor','dominant-baseline','textlength','lengthadjust','xml:space'];
const PAINT=new Set(['fill','stroke','clip-path']);
const FRAGMENT_PAINT=/^url\(\s*(['"]?)#([A-Za-z_][A-Za-z0-9_.:-]{0,127})\1\s*\)$/i;
const DRAWING=new Set(['path','rect','circle','ellipse','line','polyline','polygon','text']);
const UNSUPPORTED=/^(?:script|style|foreignobject|image|use|symbol|mask|filter|fe[a-z]+|animate[a-z]*|set|mpath|font|font-face|audio|video|iframe|object|embed)$/;
const NUMBER=/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/ig;
const ID=/^[A-Za-z_][A-Za-z0-9_.:-]{0,127}$/;
const fail=message=>{throw Error(message);};
function xmlAttribute(value){
 return value.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos));/gi,(_all,decimal,hex,named)=>{
  if(named)return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[named.toLowerCase()];
  const code=Number.parseInt(decimal||hex,decimal?10:16);return code<=0x10ffff?String.fromCodePoint(code):'\ufffd';
 });
}

function size(value){
 if(value===null||value===undefined||value==='')return null;
 const match=/^\s*(\d+(?:\.\d+)?|\.\d+)\s*(px|pt|pc|in|cm|mm|q)?\s*$/i.exec(value);
 if(!match)return null;
 const factor={px:1,pt:96/72,pc:16,in:96,cm:96/2.54,mm:96/25.4,q:96/101.6}[match[2]?.toLowerCase()||'px'];
 const result=Number(match[1])*factor;return Number.isFinite(result)&&result>0?result:null;
}
function dimensions(root){
 const raw=root.getAttribute('viewBox'),view=raw===null?null:raw.trim().split(/[\s,]+/).map(Number);
 if(view&& (view.length!==4||view.some(n=>!Number.isFinite(n)||Math.abs(n)>1000000)||view[2]<=0||view[3]<=0))fail('This SVG has an invalid viewBox. Export it as PNG and try again.');
 let width=size(root.getAttribute('width')),height=size(root.getAttribute('height'));
 if(width===null&&height!==null&&view)width=height*view[2]/view[3];
 if(height===null&&width!==null&&view)height=width*view[3]/view[2];
 if(width===null&&height===null&&view){width=view[2];height=view[3];}
 if(width===null||height===null)fail('Give this SVG a width and height or a viewBox before uploading.');
 width=Math.ceil(width);height=Math.ceil(height);
 if(width<1||height<1||width>16384||height>16384||width*height>16*1024*1024)fail('This SVG is too large. Choose an image under 16 megapixels and 16384 pixels per side.');
 return {width,height};
}
function walk(root,visit){
 const stack=[[root,0]];let count=0,text=0,paths=0;
 while(stack.length){
  const [node,depth]=stack.pop();
  if(++count>MAX_NODES||depth>MAX_DEPTH)fail('This SVG is too complex for a profile image. Export it as PNG.');
  if(node.nodeType===7)fail('SVG processing instructions are unsupported. Export this image as PNG.');
  if(node.nodeType===3){text+=node.nodeValue?.length||0;if(text>MAX_TEXT)fail('This SVG contains too much text. Export it as PNG.');}
  if(node.nodeType===1){
   if(node.attributes.length>64)fail('This SVG is too complex for a profile image. Export it as PNG.');
   const tag=node.localName.toLowerCase();
   if(UNSUPPORTED.test(tag))fail('SVG profiles support static paths, shapes and text. Export images, filters or animations as PNG.');
   const path=node.getAttribute('d')||node.getAttribute('points')||'';paths+=path.length;
   if(path.length>MAX_PATH||paths>MAX_PATH_TOTAL)fail('This SVG has too much path detail. Export it as PNG.');
   visit?.(node,tag);
  }
  for(let child=node.lastChild;child;child=child.previousSibling)stack.push([child,depth+1]);
 }
}

/** Return a self-contained static SVG Blob source for the browser's image decoder. */
export function prepareProfileSvg(input,{window:host=globalThis.window}={}){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(!bytes.length||bytes.length>MAX_BYTES)fail('Choose an SVG smaller than 1 MiB, or export it as PNG.');
 if(!host?.DOMParser||!host?.XMLSerializer||!host?.document)fail('SVG image tools are unavailable in this browser. Export the image as PNG.');
 let source;try{source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('Use a UTF-8 SVG image, or export it as PNG.');}
 if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source))fail('SVG documents with entities or document types are unsupported. Export this image as PNG.');
 // Reject resource-bearing syntax before any DOM parser sees it. Inert parsing
 // is not a promise that every browser suppresses resource fetches in all modes.
 const documentBody=source.replace(/^\s*<\?xml\s[^?]*\?>/i,'');
 if(/<\?/.test(documentBody)||/<\s*(?:[^\s<>/:]+:)?(?:script|style|foreignobject|image|img|use|symbol|mask|filter|fe[a-z]+|animate[a-z]*|set|mpath|font|font-face|audio|video|source|track|iframe|object|embed|link|base)\b/i.test(source)||/\s(?:[^\s<>/="']+:)?(?:href|base|style|on[a-z]+)\s*=/i.test(source))fail('SVG profiles support static paths, shapes and text without links, scripts, styles or resources. Export it as PNG.');
 for(const attribute of source.matchAll(/\s([^\s<>=/"']+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)){
  const name=attribute[1].toLowerCase(),value=xmlAttribute(attribute[2]??attribute[3]);
  if(value.includes('\\'))fail('This SVG uses unsupported escaped attributes. Export it as PNG.');
  if(/url\s*\(/i.test(value)&&!(PAINT.has(name)&&FRAGMENT_PAINT.test(value.trim())))fail('SVG profiles cannot load outside images, fonts or resources. Export it as PNG.');
 }
 const parser=new host.DOMParser(),document=parser.parseFromString(source,'image/svg+xml');
 let root=document.documentElement;
 if(document.getElementsByTagName('parsererror').length||root?.localName!=='svg'||root.namespaceURI&&root.namespaceURI!==SVG_NS)fail('This SVG could not be read. Export it as PNG and try again.');
 const measured=dimensions(root);
 // Parse in an inert XML document and sanitize a serialized string. Never place
 // source nodes into the app document or depend on a live DOM for sanitization.
 walk(root,node=>{
  for(const attribute of [...node.attributes]){
   const name=attribute.name.toLowerCase(),value=attribute.value;
   if(name==='href'||name==='xlink:href'||name==='base'||name.endsWith(':base')||/^on/i.test(name)||name==='style'||name==='mask')fail('This SVG contains links, scripts, styles or unsupported masks. Export it as PNG.');
   if(value.includes('\\'))fail('This SVG uses unsupported escaped attributes. Export it as PNG.');
   if(value.length>(name==='d'||name==='points'?MAX_PATH:4096))fail('This SVG is too complex for a profile image. Export it as PNG.');
  }
 });
 root.setAttribute('xmlns',SVG_NS);
 const purifier=createDOMPurify(host);
 const cleaned=purifier.sanitize(new host.XMLSerializer().serializeToString(root),{
  NAMESPACE:SVG_NS,ALLOWED_TAGS:TAGS,ALLOWED_ATTR:ATTRS,ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,
  KEEP_CONTENT:false,RETURN_DOM_FRAGMENT:true,FORBID_TAGS:['style','script','foreignObject'],
 });
 root=cleaned.firstElementChild;
 if(!root||root.localName!=='svg'||root.namespaceURI!==SVG_NS)fail('This SVG could not be prepared. Export it as PNG.');
 const ids=new Map(),references=[];let drawing=false;
 walk(root,(node,tag)=>{
  if(node.namespaceURI!==SVG_NS)fail('This SVG contains an unsupported document namespace. Export it as PNG.');
  if(DRAWING.has(tag))drawing=true;
  const id=node.getAttribute('id');if(id!==null){if(!ID.test(id)||ids.has(id))fail('This SVG has invalid or repeated object names. Export it as PNG.');ids.set(id,{node,tag});}
  for(const attribute of [...node.attributes]){
   const name=attribute.name.toLowerCase(),value=attribute.value;
   if(name==='xmlns')continue;
   if(/(?:url\s*\(|javascript\s*:|data\s*:|https?\s*:|@import)/i.test(value)){
    const match=PAINT.has(name)&&FRAGMENT_PAINT.exec(value.trim());
    if(!match)fail('SVG profiles cannot load outside images, fonts or resources. Export it as PNG.');
    references.push({node,name,id:match[2]});continue;
   }
   if(name==='d'&&!/^[MmZzLlHhVvCcSsQqTtAa0-9eE.,+\-\s]*$/.test(value))fail('This SVG has invalid path data. Export it as PNG.');
   if(['d','points','transform','gradienttransform','viewbox','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','fx','fy','width','height','font-size','textlength','stroke-width','stroke-miterlimit','stroke-dasharray','stroke-dashoffset','opacity','fill-opacity','stroke-opacity','stop-opacity'].includes(name)){
    for(const match of value.matchAll(NUMBER))if(!Number.isFinite(Number(match[0]))||Math.abs(Number(match[0]))>1000000)fail('This SVG uses unsupported drawing coordinates. Export it as PNG.');
   }
  }
 });
 for(const reference of references){
  const target=ids.get(reference.id);
  if(!target||(reference.name==='clip-path'?target.tag!=='clippath':!['lineargradient','radialgradient'].includes(target.tag)))fail('This SVG has an invalid internal resource. Export it as PNG.');
  for(let parent=reference.node;parent;parent=parent.parentElement)if(parent.localName?.toLowerCase()==='clippath')fail('Nested SVG clipping is unsupported. Export it as PNG.');
 }
 if(!drawing)fail('This SVG has no supported paths, shapes or text to show.');
 root.setAttribute('xmlns',SVG_NS);root.setAttribute('width',String(measured.width));root.setAttribute('height',String(measured.height));
 const prepared=new TextEncoder().encode(new host.XMLSerializer().serializeToString(root));
 if(prepared.length>MAX_BYTES)fail('This SVG is too complex for a profile image. Export it as PNG.');
 return {...measured,bytes:prepared,mime:'image/svg+xml',extension:'svg',decoder:'native'};
}
