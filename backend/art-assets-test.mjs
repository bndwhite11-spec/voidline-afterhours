/** Actual compiled SVG/XML/manifest acceptance. Illustration proof is distinct
 * from a rendered browser, ownership transactions or cryptographic acceptance. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {artCatalog,artSVG,artVersion} from '../src/art/catalog.mjs';
import {giftBases} from '../src/art/gift-bases.mjs';
import {telegramReferences} from '../src/art/telegram-references.mjs';
import {COSMETICS,BADGE_DEFINITIONS} from '../worker/cosmetics.mjs';
const root=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('../dist/art/v3/manifest.json',import.meta.url),'utf8'));
const tests=[],test=(name,run)=>tests.push([name,run]),hash=value=>createHash('sha256').update(value).digest('hex');
const oldIds=['larp','angel','ghost','velvet','night','unknown','dead','voidwalker','orbit','coin-bitforge','coin-etherglass','coin-crosssignal','coin-solarstack','coin-moonshibe','coin-diamondhands','meme-grass','meme-npc','meme-yapper','meme-copium','meme-cooked','meme-terminal','gift-rose','gift-cassette','gift-star','gift-cup','gift-ghost','gift-parcel','gift-seraph','gift-key','gift-halo','gift-orchid','gift-signal','gift-ticket'];
const expected=[...COSMETICS.map(item=>item.id),...BADGE_DEFINITIONS.map(item=>item.id)],records=[];
for(const item of manifest.items)for(const [variant,data]of Object.entries(item.variants)){const bytes=readFileSync(new URL('../dist'+data.url,import.meta.url));records.push({id:item.id,variant,svg:bytes.toString('utf8'),motion:item.motion});}

test('the complete authored registry preserves every released ID and keeps earned awards separate',()=>{
 assert(COSMETICS.length>=65);assert(COSMETICS.filter(item=>item.type==='badge').length>=41);assert(COSMETICS.filter(item=>item.type==='gift').length>=24);assert.equal(BADGE_DEFINITIONS.length,2);assert.deepEqual(Object.keys(artCatalog).sort(),[...expected].sort());assert.equal(new Set(expected).size,expected.length);for(const id of oldIds)assert(COSMETICS.some(item=>item.id===id),id);for(const award of BADGE_DEFINITIONS){assert.equal(artCatalog[award.id].type,'earned');assert(!COSMETICS.some(item=>item.id===award.id));}for(const item of COSMETICS){assert.equal(artCatalog[item.id].type,item.type);assert.equal(artCatalog[item.id].name,item.name,item.id+': visible artwork/product name mismatch');assert.equal(artCatalog[item.id].series,item.series,item.id+': artwork/product series mismatch');assert.equal(item.price,0);}
});
test('the actual compiled manifest contains complete variant, provenance and resting/motion records without account claims',()=>{
 assert.equal(manifest.artVersion,artVersion);assert.deepEqual(manifest.counts,{decorations:COSMETICS.filter(item=>item.type==='badge').length,gifts:COSMETICS.filter(item=>item.type==='gift').length,earned:BADGE_DEFINITIONS.length});assert.deepEqual(manifest.items.map(item=>item.id).sort(),[...expected].sort());for(const item of manifest.items){assert(item.alt.length>=20,item.id);assert(item.material&&item.series&&item.credits&&item.rights,item.id);assert(Array.isArray(item.sources)&&Array.isArray(item.newlyDrawn)&&item.newlyDrawn.length>0,item.id);for(const source of item.sources)assert.equal(new URL(source).protocol,'https:');assert.deepEqual(Object.keys(item.variants).sort(),['card','detail','mini','silhouette']);assert.match(item.restingState,/static/i);for(const mode of ['rest','explicit preview','inspection','reduced-motion still','unavailable/retired'])assert(item.animationStates.includes(mode),item.id+':'+mode);for(const key of ['accountId','ownerId','owned','equipped','csrfToken','passwordHash','recoveryCode','accessToken','sessionToken','platformOwner'])assert(!Object.hasOwn(item,key),item.id+':'+key);}
});
test('every public variant is fingerprinted exact bytes of its current editable master',()=>{
 assert.equal(records.length,expected.length*4);const urls=new Set();for(const item of manifest.items)for(const [variant,data]of Object.entries(item.variants)){assert.match(data.url,new RegExp('^/art/v3/'+item.id+'-'+variant+'[.][a-f0-9]{12}[.]svg$'));assert(!urls.has(data.url));urls.add(data.url);const bytes=readFileSync(new URL('../dist'+data.url,import.meta.url)),current=artSVG(item.id,variant);assert.equal(bytes.toString('utf8'),current,item.id+':'+variant+' stale build');assert.equal(data.bytes,bytes.length);assert.equal(data.sha256,hash(bytes));assert(data.url.endsWith(hash(bytes).slice(0,12)+'.svg'));assert.equal(data.width,variant==='mini'?24:256);assert.equal(data.height,variant==='mini'?24:256);}
});
test('source-study provenance cannot replace an original gift identity or advertise a source NFT model as the product',()=>{
 for(const [id,basis]of Object.entries(giftBases)){
  const record=manifest.items.find(item=>item.id===id),source=telegramReferences[basis.referenceKey];
  assert(record,id+': original gift must remain addressable by its own ID');
  assert.equal(record.name,basis.name,id);assert.equal(record.type,'gift',id);
  assert.equal(artCatalog[id].name,basis.name,id);assert.notEqual(record.id,source.id,id);
  assert.deepEqual(record.reference,{kind:'Motion and material reference only',base:basis.base,url:source.sourceURL},id);
  assert(record.sources.includes(source.sourceURL),id+': reference credit remains available');
  for(const key of ['canonicalName','modelName','backdrop','symbol','productClassification'])assert(!Object.hasOwn(record,key),id+': source '+key+' must not become product metadata');
 }
 assert(!manifest.items.some(item=>Object.hasOwn(telegramReferences,item.id)),'Research-only Telegram IDs must not enter the product registry');
});
test('real XML parsing proves valid namespaces, unique IDs, local references and bound moving parts for every object',()=>{
 const program=String.raw`import json,re,sys,xml.etree.ElementTree as ET
records=json.load(sys.stdin)
allowed={'svg','g','defs','linearGradient','radialGradient','stop','path','rect','circle','ellipse','line','polyline','polygon','clipPath','mask','title','desc','text','tspan'}
count=0
for record in records:
 label=record['id']+':'+record['variant']
 svg=ET.fromstring(record['svg'])
 assert svg.tag=='{http://www.w3.org/2000/svg}svg',label
 assert svg.attrib.get('data-vc-object')==record['id'],label
 size=24 if record['variant']=='mini' else 256
 assert svg.attrib.get('viewBox')=='0 0 %d %d'%(size,size),label
 ids=set()
 for node in svg.iter():
  tag=node.tag.rsplit('}',1)[-1]
  assert tag in allowed,(label,tag)
  key=node.attrib.get('id')
  if key:
   assert key not in ids,(label,'duplicate id',key)
   ids.add(key)
  for name,value in node.attrib.items():
   local=name.rsplit('}',1)[-1]
   assert not local.lower().startswith('on'),(label,'handler',name)
   assert local not in ('href','src'),(label,'external/link reference',name)
   assert not re.search(r'url\(\s*[^#]',value),(label,'nonlocal paint',name,value)
 for node in svg.iter():
  for name,value in node.attrib.items():
   for target in re.findall(r'url\(#([^)]*)\)',value):assert target in ids,(label,'dangling paint/clip',target)
   if name=='aria-labelledby':
    for target in value.split():assert target in ids,(label,'dangling title',target)
 if record['variant']=='detail':
  parts={node.attrib['data-part'] for node in svg.iter() if 'data-part' in node.attrib}
  for layer in record['motion']['layers']:assert layer['name'] in parts,(label,'unbound part',layer['name'])
 count+=1
print(json.dumps({'parsed':count,'movingObjects':sum(1 for r in records if r['variant']=='detail')}))`;
 const result=spawnSync('python3',['-c',program],{input:JSON.stringify(records),encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{parsed:expected.length*4,movingObjects:expected.length});
});
test('every object has independent optical geometry and bounded non-looping part choreography',()=>{
 const signatures=new Set();for(const [id,item]of Object.entries(artCatalog)){assert(item.mini.length<item.body('qa').length,id+':mini should be separately simplified');assert(!/viewBox="0 0 256 256"|<image\b/.test(item.mini));assert(item.motion.duration>=900&&item.motion.duration<=1800,id);assert(item.motion.layers.length>0,id);const names=new Set();for(const layer of item.motion.layers){assert(/^[a-z][a-z0-9-]*$/.test(layer.name),id);assert(!names.has(layer.name),id+':duplicate choreography target');names.add(layer.name);assert(Array.isArray(layer.origin)&&layer.origin.length===2&&layer.origin.every(Number.isFinite),id);assert.equal(layer.frames[0].at,0,id);assert.equal(layer.frames.at(-1).at,1,id);let previous=-1;for(const frame of layer.frames){assert(Number.isFinite(frame.at)&&frame.at>=previous&&frame.at<=1,id);previous=frame.at;for(const [key,value]of Object.entries(frame))assert(['at','x','y','rotate','scaleX','scaleY','opacity'].includes(key)&&Number.isFinite(value),id+':'+key);}}const signature=JSON.stringify(item.motion);assert(!signatures.has(signature),id+':interchangeable choreography');signatures.add(signature);}
});
let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${tests.length-failed}/${tests.length} authored asset checks passed. Actual${expected.length} masters,${expected.length*4} compiled SVGs and real XML parsing; not browser artwork judgment, motion playback, ownership or production verification.`);process.exitCode=failed?1:0;
