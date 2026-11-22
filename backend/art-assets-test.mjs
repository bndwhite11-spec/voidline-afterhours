/** Compiled art/source acceptance. Real bytes and XML; not browser playback,
 * ownership transactions, visual judgment or cryptographic messaging proof. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {artCatalog,artSVG,artVersion,studioIds,priorArtSVG,published32ArtSVG,studioCatalog,curatedIds} from '../src/art/catalog.mjs';
import {assertSafeWebSVG,inspectRaster} from '../src/art/web-art.mjs';
import {giftBases} from '../src/art/gift-bases.mjs';
import {telegramReferences} from '../src/art/telegram-references.mjs';
import {JSDOM} from 'jsdom';
import {collectibleModels} from '../src/collectibles/models.mjs';
import {validateLayeredScene} from '../src/art/layered-format.mjs';
import {COSMETICS,BADGE_DEFINITIONS} from '../worker/cosmetics.mjs';
const manifest=JSON.parse(readFileSync(new URL('../dist/art/v'+artVersion+'/manifest.json',import.meta.url),'utf8'));
const tests=[],test=(name,run)=>tests.push([name,run]),hash=value=>createHash('sha256').update(value).digest('hex');
const oldIds=['larp','angel','ghost','velvet','night','unknown','dead','voidwalker','orbit','coin-bitforge','coin-etherglass','coin-crosssignal','coin-solarstack','coin-moonshibe','coin-diamondhands','meme-grass','meme-npc','meme-yapper','meme-copium','meme-cooked','meme-terminal','gift-rose','gift-cassette','gift-star','gift-cup','gift-ghost','gift-parcel','gift-seraph','gift-key','gift-halo','gift-orchid','gift-signal','gift-ticket'];
const expected=[...COSMETICS.map(item=>item.id),...BADGE_DEFINITIONS.map(item=>item.id)],records=[];
for(const item of manifest.items)for(const [variant,data]of Object.entries(item.variants))records.push({id:item.id,variant,svg:readFileSync(new URL('../dist'+data.url,import.meta.url),'utf8'),motion:item.motion,sourceArt:item.sourceArt||null});

test('the registry preserves released IDs and product names while separating earned awards',()=>{
 assert.equal(artVersion,4);assert.equal(BADGE_DEFINITIONS.length,2);assert.deepEqual(Object.keys(artCatalog).sort(),[...expected].sort());assert.equal(new Set(expected).size,expected.length);
 for(const id of oldIds)assert(COSMETICS.some(item=>item.id===id),id);
 for(const award of BADGE_DEFINITIONS){assert.equal(artCatalog[award.id].type,'earned');assert(!COSMETICS.some(item=>item.id===award.id));}
 for(const item of COSMETICS){assert.equal(artCatalog[item.id].type,item.type);assert.equal(artCatalog[item.id].name,item.name,item.id+': artwork/product name mismatch');assert.equal(artCatalog[item.id].series,item.series,item.id+': artwork/product series mismatch');assert.equal(item.price,0);}
});
test('each source-image master uses a credited raster and bounded fingerprinted thumbnail; original masters have their own grade',()=>{
 const startup=readFileSync(new URL('../dist/collectible-art.js',import.meta.url),'utf8');assert(!/data:image\/(?:png|jpeg|webp);base64,/.test(startup),'Raster bytes must remain outside startup JavaScript');
 for(const [id,item]of Object.entries(artCatalog)){
  if(item.assetKind==='layered-svg'){assert(collectibleModels[id]||curatedIds.includes(id));assert(!item.sourceArt);continue;}
  const source=item.sourceArt;assert(source,id+': cannot silently fall back to generated illustration');assert.equal(source.id,id);assert.equal(source.kind,'Downloaded web image');
  for(const key of ['sourceURL','creator','license','changes'])assert(typeof source[key]==='string'&&source[key].trim(),id+':'+key);
  for(const key of ['sourceURL','licenseURL','usageURL'])if(source[key])assert.equal(new URL(source[key]).protocol,'https:',id+':'+key);
  for(const [meta,path,maximum]of [[source,source.sourcePath,150*1024],[source.mini,source.mini.path,12*1024]]){
   assert.match(path,/^\/art\/sources\/[a-z0-9][a-z0-9._-]*[.-][a-f0-9]{12,64}\.(?:webp|png|jpe?g)$/);const bytes=readFileSync(new URL('../dist'+path,import.meta.url)),actual=inspectRaster(bytes,path);assert(bytes.length<=maximum,id+':source size');
   for(const key of ['mime','width','height','bytes','sha256'])assert.equal(meta[key],actual[key],id+':'+path+':'+key);assert(path.includes(actual.sha256.slice(0,12)),id+': source fingerprint');
  }
  assert(source.mini.width<=128&&source.mini.height<=128,id+': optical thumbnail dimensions');
  for(const component of source.components||[])for(const key of ['sourceURL','creator','license','changes'])assert(component[key],id+': component '+key);
  assert.match(item.mini,/<image\b/);assert(!/<path\b/.test(item.mini),id+': miniature must use the actual downloaded image');
 }
});
test('the manifest truthfully records sources, licenses, static/motion states and no account claims',()=>{
 assert.equal(manifest.artVersion,artVersion);assert.deepEqual(manifest.counts,{decorations:COSMETICS.filter(item=>item.type==='badge').length,gifts:COSMETICS.filter(item=>item.type==='gift').length,earned:BADGE_DEFINITIONS.length,webSources:Object.values(artCatalog).filter(a=>a.sourceArt).length});assert.deepEqual(manifest.items.map(item=>item.id).sort(),[...expected].sort());
 for(const item of manifest.items){assert(item.alt.length>=20,item.id);assert(item.material&&item.series&&item.credits&&item.rights,item.id);assert.deepEqual(item.sourceArt,artCatalog[item.id].sourceArt,item.id);if(item.edition){assert(item.storyboard?.length>20);assert(item.newlyDrawn.includes('optical miniature'));assert(!item.newlyDrawn.includes('source image'));}else assert.deepEqual(item.newlyDrawn,[],item.id+': source image must not be credited as newly drawn');if(item.sourceArt){assert(item.sources.includes(item.sourceArt.sourceURL),item.id);if(item.sourceArt.licenseURL)assert(item.sources.includes(item.sourceArt.licenseURL),item.id);}
  else{assert.equal(item.assetKind,'layered-svg');if(item.familyId){const original=collectibleModels[item.id];for(const key of ['familyId','alt','material','acquisitionPolicy','tier','backdrop','motif','description','artRevision'])assert.deepEqual(item[key],original[key],item.id+':'+key);}}for(const source of item.sources)assert.equal(new URL(source).protocol,'https:');assert.deepEqual(Object.keys(item.variants).sort(),['card','detail','mini','silhouette']);assert.match(item.restingState,item.sourceArt?/static web-sourced image/i:/static layered illustration/i);
  for(const mode of ['rest','explicit preview','inspection','reduced-motion still','unavailable/retired'])assert(item.animationStates.includes(mode),item.id+':'+mode);
  for(const key of ['accountId','ownerId','owned','equipped','csrfToken','passwordHash','recoveryCode','accessToken','sessionToken','platformOwner'])assert(!Object.hasOwn(item,key),item.id+':'+key);
 }
});
test('four self-contained public variants are exact fingerprinted bytes of each current source adapter',()=>{
 assert.equal(records.length,expected.length*4);const urls=new Set();
 for(const item of manifest.items)for(const [variant,data]of Object.entries(item.variants)){
  assert.match(data.url,new RegExp('^/art/v'+artVersion+'/'+item.id+'-'+variant+'[.][a-f0-9]{12}[.]svg$'));assert(!urls.has(data.url));urls.add(data.url);
  const bytes=readFileSync(new URL('../dist'+data.url,import.meta.url)),svg=bytes.toString('utf8');assert.equal(svg,artSVG(item.id,variant),item.id+':'+variant+' stale build');assert.equal(data.bytes,bytes.length);assert.equal(data.sha256,hash(bytes));assert(data.url.endsWith(hash(bytes).slice(0,12)+'.svg'));assert.equal(data.width,variant==='mini'?24:256);assert.equal(data.height,variant==='mini'?24:256);assert(bytes.length<400000,item.id+': runtime scene bound');if(item.sourceArt)assertSafeWebSVG(svg,item.sourceArt);else{
   const dom=new JSDOM(svg,{contentType:'image/svg+xml'});try{validateLayeredScene(dom.window.document.documentElement,item.id,variant);}finally{dom.window.close();}
  }
 }
});
test('motion research cannot replace original gift identities or advertise source NFT models as products',()=>{
 for(const [id,basis]of Object.entries(giftBases)){const record=manifest.items.find(item=>item.id===id),source=telegramReferences[basis.referenceKey];assert(record,id);assert.equal(record.name,basis.name);assert.equal(record.type,'gift');assert.equal(artCatalog[id].name,basis.name);assert.notEqual(record.id,source.id);assert.deepEqual(record.reference,{kind:'Motion and material reference only',base:basis.base,url:source.sourceURL});for(const key of ['canonicalName','modelName','backdrop','symbol','productClassification'])assert(!Object.hasOwn(record,key),id+':'+key);}
 assert(!manifest.items.some(item=>Object.hasOwn(telegramReferences,item.id)));
});
test('real XML parsing proves exact embedded raster hashes, local image uses and bound presentation parts',()=>{
 const program=String.raw`import base64,hashlib,json,re,sys,xml.etree.ElementTree as ET
records=json.load(sys.stdin)
allowed={'svg','g','defs','linearGradient','radialGradient','stop','path','rect','circle','ellipse','line','polyline','polygon','clipPath','mask','title','desc','text','tspan','image','use','filter','feColorMatrix'}
for record in records:
 label=record['id']+':'+record['variant'];svg=ET.fromstring(record['svg']);assert svg.tag=='{http://www.w3.org/2000/svg}svg',label
 assert svg.attrib.get('data-vc-object')==record['id'],label
 size=24 if record['variant']=='mini' else 256;assert svg.attrib.get('viewBox')=='0 0 %d %d'%(size,size),label
 ids={};images=[];uses=[]
 for node in svg.iter():
  tag=node.tag.rsplit('}',1)[-1];assert tag in allowed,(label,tag)
  key=node.attrib.get('id')
  if key:assert key not in ids,(label,'duplicate id',key);ids[key]=tag
  for name,value in node.attrib.items():
   local=name.rsplit('}',1)[-1];assert not local.lower().startswith('on'),(label,'handler',name);assert local!='src',(label,'src');assert not re.search(r'url\(\s*[^#]',value),(label,'nonlocal paint')
   if local=='href':
    assert name=='href',(label,'namespaced link')
    if tag=='image':
     m=re.fullmatch(r'data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})',value);assert m,(label,'not an embedded raster')
     meta=record['sourceArt']['mini'] if record['variant'] in ('mini','silhouette') else record['sourceArt'];raw=base64.b64decode(m[2],validate=True)
     assert m[1]==meta['mime'] and len(raw)==meta['bytes'] and hashlib.sha256(raw).hexdigest()==meta['sha256'],(label,'source hash');images.append(node)
    elif tag=='use':assert re.fullmatch(r'#[a-zA-Z][\w:.-]*',value),(label,'nonlocal use');uses.append(value[1:])
    else:raise AssertionError((label,'unexpected link',tag))
 assert len(images)==(1 if record['sourceArt'] else 0),(label,'format-specific image count')
 for target in uses:assert ids.get(target)=='image',(label,'use must refer to image',target)
 for node in svg.iter():
  for name,value in node.attrib.items():
   for target in re.findall(r'url\(#([^)]*)\)',value):assert target in ids,(label,'dangling paint/clip',target)
   if name=='aria-labelledby':
    for target in value.split():assert target in ids,(label,'dangling title',target)
 if record['variant']=='detail':
  parts={node.attrib['data-part'] for node in svg.iter() if 'data-part' in node.attrib}
  for layer in record['motion']['layers']:assert layer['name'] in parts,(label,'unbound presentation',layer['name'])
print(json.dumps({'parsed':len(records),'movingObjects':sum(1 for r in records if r['variant']=='detail')}))`;
 const result=spawnSync('python3',['-c',program],{input:JSON.stringify(records),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{parsed:expected.length*4,movingObjects:expected.length});
});
test('lightweight thumbnails and bounded one-shot image reveals preserve a complete static resting state',()=>{
 const giftPresets=new Set(Object.values(studioCatalog).filter(item=>item.type==='gift').map(item=>item.revealPreset));
 for(const [id,item]of Object.entries(artCatalog)){
  if(item.sourceArt)assert(item.sourceArt.mini.bytes<=12*1024,id);else assert(Buffer.byteLength(item.mini)<=12*1024,id);assert(item.motion.duration>=900&&item.motion.duration<=(item.assetKind==='layered-svg'?3000:1800),id);assert(item.motion.layers.length>0,id);
  const names=new Set();for(const layer of item.motion.layers){assert((item.edition?/^[a-z][a-z0-9-]*$/:/^web-(?:image|panel-\d+)$/).test(layer.name),id);if(item.assetKind==='layered-svg')assert(!/^web-(?:image|panel-\d+)$/.test(layer.name),id+': original parts must be named physical geometry');assert(!names.has(layer.name),id);names.add(layer.name);assert(Array.isArray(layer.origin)&&layer.origin.length===2&&layer.origin.every(Number.isFinite),id);assert.equal(layer.frames[0].at,0,id);assert.equal(layer.frames.at(-1).at,1,id);if(item.sourceArt)assert.deepEqual(layer.frames.at(-1),{at:1},id+': final pose must restore the actual source image');let previous=-1;for(const frame of layer.frames){assert(Number.isFinite(frame.at)&&frame.at>=previous&&frame.at<=1,id);previous=frame.at;for(const [key,value]of Object.entries(frame))assert(['at','x','y','rotate','scaleX','scaleY','opacity'].includes(key)&&Number.isFinite(value),id+':'+key);}}
 }
 for(const preset of ['turn','unseal','fan','split','fold','shutter','slide','wobble'])assert(giftPresets.has(preset),'Archived source-image reveal remains available: '+preset);
});
test('Studio 01 preserves historical pixels and edition-paired miniatures for open clients',()=>{
 const frozen=JSON.parse(readFileSync(new URL('../src/art/pre-studio-fingerprints.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(frozen).sort(),[...studioIds].sort());
 for(const id of studioIds){
  const item=studioCatalog[id],current=manifest.items.find(row=>row.id===id);
  assert.equal(item.edition,'Studio 01');if(!curatedIds.includes(id))assert.equal(current.storyboard,item.storyboard);
  for(const [variant,fingerprint] of Object.entries(frozen[id])){
   const bytes=readFileSync(new URL('../dist/art/v4/'+id+'-'+variant+'.'+fingerprint+'.svg',import.meta.url));
   assert.equal(hash(bytes).slice(0,12),fingerprint);assert.equal(bytes.toString(),priorArtSVG(id,variant));
   assert.notEqual(hash(bytes),current.variants[variant].sha256);
  }
  assert.match(item.sourceArt.mini.path,/studio-01-/);assert.equal(item.sourceArt.mini.width,96);
  assert(!artSVG(id,'detail').includes('height="200" rx="10"'),'individual object shape');
 }
});
test('all published Site 32 gift URLs retain their exact original bytes across curation',()=>{
 const historical=JSON.parse(readFileSync(new URL('../src/art/published-32-gift-variants.json',import.meta.url)));
 assert.equal(Object.keys(historical).length,32);
 for(const [id,variants] of Object.entries(historical))for(const [variant,record] of Object.entries(variants)){
  const bytes=readFileSync(new URL('../dist'+record.url,import.meta.url));assert.equal(hash(bytes),record.sha256);assert.equal(bytes.toString(),published32ArtSVG(id,variant));
 }
});
test('original-layered masters reject unsupported SVG features and malformed or unbound tracks',()=>{
 const {id}=Object.values(collectibleModels)[0],valid=artSVG(id,'detail');
 for(const mutate of [
   doc=>{const node=doc.createElementNS('http://www.w3.org/2000/svg','image');doc.documentElement.append(node);},
   doc=>doc.querySelector('g').setAttribute('style','opacity:.9'),
   doc=>doc.querySelector('path').setAttribute('fill','url(#absent)'),
   doc=>{const root=doc.documentElement,m=JSON.parse(root.getAttribute('data-motion'));m.layers[0].name='absent-part';root.setAttribute('data-motion',JSON.stringify(m));},
   doc=>{const root=doc.documentElement,m=JSON.parse(root.getAttribute('data-motion'));m.duration=500000;root.setAttribute('data-motion',JSON.stringify(m));}
 ]){
  const dom=new JSDOM(valid,{contentType:'image/svg+xml'});try{mutate(dom.window.document);assert.throws(()=>validateLayeredScene(dom.window.document.documentElement,id,'detail'));}finally{dom.window.close();}
 }
});
let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${tests.length-failed}/${tests.length} sourced art checks passed. Actual${expected.length} objects,${expected.length*4} compiled SVGs, downloaded source hashes and real XML parsing; not browser artwork judgment, motion playback, ownership or production verification.`);process.exitCode=failed?1:0;
