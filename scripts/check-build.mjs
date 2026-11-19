// Verify the deployable Worker, rather than an imitation of its asset router.
// Run after the offline generator and npm run build.
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const worker = (await import(pathToFileURL(path.join(dist, 'server/index.js')))).default;
const origin = 'https://voidline-build.example';
const fetchAsset = (name, options) => worker.fetch(new Request(origin + name, options), {}, {});
const productionRoots=new Set(['icons','install.html','mobile.js','mobile.css','art','art-motion.css','art-review.html','art-review.css','art-review.js','account-export.js','theme.js','media-validation.js','profile-media.js','native-media.js','native-media.css','native-outbox.js','native-timeline.js','native-messaging.css','realtime.js','collectible-art.js','index.html','help.html','help.css','notifications.js','push-worker.js','entry.js','entry.css','home.js','home.css','organize.js','organize.css','profiles-panel.js','profiles-panel.css','admin.js','admin.css','passkey-client.js','cosmetics.js','cosmetics.css','social.js','social.css','store.js','legacy-import.js','icon.svg','manifest.webmanifest','secure-messenger.js','secure-messenger.js.LEGAL.txt','pkg','downloads']);
async function bytes(response){assert.equal(response.headers.get('content-encoding'),null,'The Sites proxy owns HTTP compression; Worker responses must contain original bytes.');return Buffer.from(await response.arrayBuffer());}
let count = 0;
const verifiedFiles = new Map();
async function verify(directory, prefix = '') {
  for (const item of await readdir(directory, {withFileTypes:true})) {
    if (item.name.startsWith('.') || (!prefix && !productionRoots.has(item.name))) continue;
    if(prefix==='/art'&&item.name==='v3')continue; // Historical files are checked as compatibility redirects below.
    const relative = prefix + '/' + item.name;
    if (item.isDirectory()) { await verify(path.join(directory,item.name), relative); continue; }
    assert(item.isFile(), `Unexpected deploy asset ${relative}`);
    const response = await fetchAsset(relative);
    assert.equal(response.status, 200, relative);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const original = await readFile(path.join(directory,item.name));
    assert.deepEqual(await bytes(response), original, relative);
    verifiedFiles.set(relative,original);
    const head = await fetchAsset(relative, {method:'HEAD'});
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    const cached = await fetchAsset(relative, {headers:{'if-none-match':response.headers.get('etag')}});
    assert.equal(cached.status, 304);
    count++;
  }
}
await verify(dist);
// Inspect the real bundled static table, not a second implementation of its
// response router. esbuild preserves literal route keys but minifies bindings
// and booleans, so isolate its trusted object literal with string-aware braces.
const bundle = await readFile(path.join(dist,'server/index.js'),'utf8');
function bundledAssetTable() {
  const first = [...verifiedFiles.keys()].sort()[0], start = bundle.indexOf('{'+JSON.stringify(first)+':');
  assert(start>=0,'the compiled Worker retains its static route table');
  let depth=0,quote=null,escaped=false;
  for(let index=start;index<bundle.length;index++){
    const character=bundle[index];
    if(quote){if(escaped)escaped=false;else if(character==='\\')escaped=true;else if(character===quote)quote=null;continue;}
    if(character==='"'||character==="'"){quote=character;continue;}
    if(character==='{')depth++;
    if(character==='}'&&--depth===0)return vm.runInNewContext('('+bundle.slice(start,index+1)+')',Object.create(null),{timeout:2000});
  }
  assert.fail('unterminated compiled asset table');
}
const compiledAssets=bundledAssetTable(),rasters=new Map();
// Frozen v3 route names remain reconstructible when generated v3 files are
// absent from source downloads. Every one must resolve to the current same-ID
// variant, rather than disappear or retain the old synthetic artwork payload.
const builderSource=await readFile(path.join(root,'scripts/build-worker.mjs'),'utf8');
const legacySnapshot=/const legacyV3Filenames = (\[[\s\S]*?\]);/.exec(builderSource);
assert(legacySnapshot,'historical artwork routes have a source snapshot');
const legacyNames=JSON.parse(legacySnapshot[1]);
assert.equal(legacyNames.length,324);
assert.equal(new Set(legacyNames).size,324);
assert.equal(createHash('sha256').update(JSON.stringify(legacyNames)).digest('hex'),'e997a65bd91721fcb881d81d0806d7d55ed2cac0e93e53da714f9e7e4064ec0b','historical SVG route snapshot must retain every deployed v3 filename');
try{
 const historical=(await readdir(path.join(dist,'art/v3'))).filter(name=>name.endsWith('.svg')).sort();
 assert.deepEqual(legacyNames,historical,'existing generated historical SVGs all have compatibility routes');
}catch(error){if(error.code!=='ENOENT')throw error;}
const currentArt=JSON.parse(await readFile(path.join(dist,'art/v4/manifest.json'),'utf8'));
const currentById=new Map(currentArt.items.map(item=>[item.id,item]));
const legacyTargets=new Map([['/art/v3/manifest.json','/art/v4/manifest.json']]);
for(const filename of legacyNames){
 const match=/^(.+)-(mini|card|detail|silhouette)\.[a-f0-9]{12,64}\.svg$/.exec(filename);
 const target=match&&currentById.get(match[1])?.variants?.[match[2]]?.url;
 assert(target&&verifiedFiles.has(target),'same catalog ID and variant retained for '+filename);
 legacyTargets.set('/art/v3/'+filename,target);
}
for(const [legacy,target]of legacyTargets){
 assert.equal(compiledAssets[legacy],undefined,'historical pixel payload is omitted: '+legacy);
 for(const method of ['GET','HEAD']){
  const response=await fetchAsset(legacy,{method});
  assert.equal(response.status,302,legacy);
  assert.equal(response.headers.get('location'),target,legacy);
  assert.equal(response.headers.get('cache-control'),'no-cache',legacy);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff',legacy);
  assert.equal((await response.arrayBuffer()).byteLength,0,legacy);
 }
 const actual=await fetchAsset(target);
 assert.equal(actual.status,200,target);
 assert.deepEqual(await bytes(actual),verifiedFiles.get(target),legacy+' resolves to current exact source bytes');
}
assert.equal((await fetchAsset('/art/v3/unknown-mini.0123456789ab.svg')).status,404);
assert.equal((await fetchAsset('/art/v3/manifest.json',{method:'POST'})).status,405);
console.log(`PASS historical artwork compatibility: ${legacyTargets.size} GET/HEAD redirects retain each catalog ID/variant and resolve to current exact artwork; no retired payloads embedded.`);
let rasterReferences=0,embeddedReferences=0;
const sha=value=>createHash('sha256').update(value).digest('hex');
for(const [route,original] of verifiedFiles){
 const record=compiledAssets[route];assert(record,'compiled static asset '+route);
 if(route.startsWith('/art/sources/')&&/[.](?:png|jpe?g|webp)$/i.test(route)){
  const key=sha(original);rasters.set(key,original);rasterReferences++;
  assert.equal(record.rasterKey,key,route+': raw raster uses its shared digest');
  assert.equal(record.body,undefined,route+': raw raster does not duplicate its shared payload');
 }
 if(route.startsWith('/art/')&&route.endsWith('.svg')){
  const references=[...original.toString('utf8').matchAll(/data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})/g)];
  if(!references.length)continue;
  const template=(record.gzip?gunzipSync(Buffer.from(record.body,'base64')):Buffer.from(record.body,'base64')).toString('utf8');
  for(const [,mime,encoded]of references){
   const bytes=Buffer.from(encoded,'base64'),key=sha(bytes);rasters.set(key,bytes);rasterReferences++;embeddedReferences++;
   const reference=record.rasterRefs?.find(value=>value.key===key&&value.mime===mime);
   assert(reference,route+': embedded raster points to the shared digest and exact MIME');
   assert(template.includes(reference.placeholder),route+': template retains its literal restoration point');
   assert(!template.includes(encoded),route+': compressed SVG template must omit embedded raster bytes');
  }
 }
}
for(const [key,original] of rasters){
 const literal=JSON.stringify(original.toString('base64'));
 assert.equal(bundle.split(literal).length-1,1,key+': each shared raster payload appears once in the real Worker');
}
if(embeddedReferences)assert(rasterReferences>rasters.size,'embedded variants actually share raster payloads');
console.log(`PASS raster deduplication: ${rasters.size} shared payloads, ${rasterReferences} raw/embedded references and ${embeddedReferences} image-bearing SVGs; all served bytes match the original files.`);
assert.deepEqual(await bytes(await fetchAsset('/')), await readFile(path.join(dist,'index.html')));
// Direct-entry pages must resolve their assets at the app root.
for (const route of ['/users/example', '/invite/example', '/channels/example']) {
  const response=await fetchAsset(route);
  assert.equal(response.status,200,route);
  const html=await response.text();
  const links=[...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|svg|webmanifest))"/g)].map(match=>match[1]);
  assert(links.length>0);
  for(const link of links){
    assert(link.startsWith('/'),'Deep-link assets must be root-absolute: '+link);
    const asset=await fetchAsset(new URL(link,origin+route).pathname);
    assert.equal(asset.status,200,route+' -> '+link);
    assert(!asset.headers.get('content-type').includes('text/html'),link);
  }
}
for (const route of ['/server/index.js', '/.openai/hosting.json', '/.openai/drizzle/meta/_journal.json', '/.env', '/app.js','/community.js','/live.js','/missing']) {
  assert.equal((await fetchAsset(route)).status, 404, route);
}
assert.equal((await fetchAsset('/', {method:'POST'})).status, 405);
assert.equal((await fetchAsset('/api/live/me')).status, 503);
for(const route of ['/api/encryption/config','/api/notifications/config','/api/messages/conversations','/api/organize/activity','/api/media/uploads','/api/realtime'])assert.equal((await fetchAsset(route)).status,503,'New API routes must reach their guarded handlers.');
assert.equal((await fetchAsset('/api/live/health')).status, 503);
const config=await (await fetchAsset('/api/auth/config')).json();
assert.equal(config.configured,false);
assert.equal(config.provider,'password');
assert.equal(config.google.configured,false);
assert.equal((await fetchAsset('/api/auth/google/start')).status,503);
const policy=(await fetchAsset('/')).headers.get('content-security-policy');
assert(policy.includes("script-src 'self' 'wasm-unsafe-eval'"));assert(!policy.includes("'unsafe-inline'"));
// ChatGPT embeds the published app. Keep that allowlist static and bounded.
const frameSources = policy.split(';').map(part=>part.trim()).find(part=>part.startsWith('frame-ancestors '));
assert.equal(frameSources,"frame-ancestors 'self' https://chatgpt.com https://chat.openai.com");
const pageETag=(await fetchAsset('/')).headers.get('etag');
for(const route of ['/','/users/example']){
  for(const options of [
    {headers:{origin:'https://untrusted.example',referer:'https://untrusted.example/frame'}},
    {method:'HEAD'},
    {headers:{'if-none-match':pageETag}}
  ]){
    const response=await fetchAsset(route,options);
    assert.equal(response.headers.get('content-security-policy'),policy,'Framing policy must not reflect request origins or disappear on HEAD/304.');
    assert.equal(response.headers.get('x-frame-options'),null,'A second header must not block the approved preview.');
  }
}
const manifest = JSON.parse(await readFile(path.join(root,'.openai/hosting.json')));
assert.deepEqual(JSON.parse(await readFile(path.join(dist,'.openai/hosting.json'))), manifest);
assert.equal(manifest.project_id, 'appgprj_6afb6be77b9c8191ae8d2ee76b1afd34');
assert.equal(manifest.d1, 'DB');
assert.equal(manifest.r2, 'MEDIA');
assert(manifest.capabilities.includes('mcp'));
assert.equal(manifest.static, undefined);
const journal = JSON.parse(await readFile(path.join(root,'drizzle/meta/_journal.json')));
for (const entry of journal.entries) {
  const name = entry.tag + '.sql';
  assert.deepEqual(await readFile(path.join(dist,'.openai/drizzle',name)), await readFile(path.join(root,'drizzle',name)));
}
console.log(`PASS built Worker: ${count} exact assets, HEAD/ETag, private build paths excluded, API guards, existing Site identity and ${journal.entries.length} packaged migrations.`);
console.log('This verifies the generated Worker locally, not a browser session or production D1 exchange.');
