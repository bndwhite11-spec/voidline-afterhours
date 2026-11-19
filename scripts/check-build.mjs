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
const productionRoots=new Set(['icons','install.html','mobile.js','mobile.css','art','art-motion.css','art-review.html','art-review.css','art-review.js','account-export.js','theme.js','media-validation.js','profile-media.js','native-media.js','native-media.css','native-outbox.js','native-timeline.js','native-messaging.css','realtime.js','collectible-art.js','index.html','help.html','help.css','notifications.js','push-worker.js','entry.js','entry.css','home.js','home.css','organize.js','organize.css','profiles-panel.js','profiles-panel.css','admin.js','admin.css','passkey-client.js','cosmetics.js','cosmetics.css','social.js','social.css','store.js','legacy-import.js','icon.svg','manifest.webmanifest','secure-messenger.js','secure-messenger.js.LEGAL.txt','pkg','downloads','.well-known']);
const publicDownloads=new Set(['voidline-offline.html','voidline-improvement-prompt.txt','voidline-release.json','VOIDLINE-Android.apk']);
async function bytes(response){assert.equal(response.headers.get('content-encoding'),null,'The Sites proxy owns HTTP compression; Worker responses must contain original bytes.');return Buffer.from(await response.arrayBuffer());}
let count = 0;
const verifiedFiles = new Map();
async function verify(directory, prefix = '') {
  for (const item of await readdir(directory, {withFileTypes:true})) {
    const relative = prefix + '/' + item.name;
    if ((item.name.startsWith('.') && relative !== '/.well-known') || (!prefix && !productionRoots.has(item.name))) continue;
    if(prefix==='/.well-known'&&relative!=='/.well-known/assetlinks.json')continue;
    if(prefix==='/downloads'&&!publicDownloads.has(item.name))continue; // Large source/Windows downloads are release redirects.
    if(prefix==='/art'&&item.name==='v3')continue; // Historical files are checked as compatibility redirects below.
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
// The Android package is served as original installable bytes. Large source
// and desktop packages resolve to immutable GitHub release assets instead of
// duplicating them inside the constrained Worker bundle.
const release=JSON.parse(await readFile(path.join(dist,'downloads/voidline-release.json'),'utf8'));
assert.equal(release.tag,'v1.0.0');
assert.equal(release.android.filename,'VOIDLINE-Android.apk');
assert.equal(release.android.packageId,'app.voidline.afterhours');
assert.equal(release.android.bytes,564978);
assert.equal(release.android.sha256,'2b1f7523d364d45b1568628d1812f3f9a73a2fb45b6e5bbb657b958e9825ba2b');
const apkRoute='/downloads/'+release.android.filename,apkBytes=verifiedFiles.get(apkRoute);
assert(apkBytes,'the verified Android package is among the real bundled assets');
assert.equal(apkBytes.length,release.android.bytes);
assert.equal(createHash('sha256').update(apkBytes).digest('hex'),release.android.sha256);
assert.deepEqual(apkBytes.subarray(0,4),Buffer.from([0x50,0x4b,0x03,0x04]),'an APK ZIP header, not an HTML download placeholder');
const apk=await fetchAsset(apkRoute),apkETag=apk.headers.get('etag');
function apkHeaders(response,length){
 assert.equal(response.headers.get('content-type'),'application/vnd.android.package-archive');
 assert.equal(response.headers.get('content-disposition'),'attachment; filename="VOIDLINE-Android.apk"');
 assert.equal(response.headers.get('accept-ranges'),'bytes');
 assert.equal(response.headers.get('content-length'),String(length));
 assert.equal(response.headers.get('etag'),apkETag);
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
}
assert.equal(apk.status,200);apkHeaders(apk,apkBytes.length);assert.deepEqual(await bytes(apk),apkBytes);
const apkHead=await fetchAsset(apkRoute,{method:'HEAD'});assert.equal(apkHead.status,200);apkHeaders(apkHead,apkBytes.length);assert.equal((await apkHead.arrayBuffer()).byteLength,0);
const apkCached=await fetchAsset(apkRoute,{headers:{'if-none-match':apkETag}});assert.equal(apkCached.status,304);assert.equal((await apkCached.arrayBuffer()).byteLength,0);
for(const [range,start,end]of [['bytes=0-3',0,3],['bytes=-16',apkBytes.length-16,apkBytes.length-1],['bytes='+String(apkBytes.length-4)+'-',apkBytes.length-4,apkBytes.length-1],['bytes=0-'+String(apkBytes.length+99),0,apkBytes.length-1]]){
 const response=await fetchAsset(apkRoute,{headers:{range}});assert.equal(response.status,206,range);apkHeaders(response,end-start+1);
 assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${apkBytes.length}`,range);
 assert.deepEqual(await bytes(response),apkBytes.subarray(start,end+1),range);
}
for(const range of ['bytes='+String(apkBytes.length)+'-','bytes=4-3','bytes=-0','bytes=-','bytes=0-1,3-4','items=0-3']){
 const response=await fetchAsset(apkRoute,{headers:{range}});assert.equal(response.status,416,range);
 assert.equal(response.headers.get('content-range'),'bytes */'+apkBytes.length,range);assert.equal((await response.arrayBuffer()).byteLength,0,range);
}
const matched=await fetchAsset(apkRoute,{headers:{range:'bytes=0-3','if-range':apkETag}});assert.equal(matched.status,206);apkHeaders(matched,4);assert.deepEqual(await bytes(matched),apkBytes.subarray(0,4));
for(const stale of ['"different-release"','W/'+apkETag,'Wed, 01 Jan 2020 00:00:00 GMT']){
 const response=await fetchAsset(apkRoute,{headers:{range:'bytes=0-3','if-range':stale}});assert.equal(response.status,200,stale);apkHeaders(response,apkBytes.length);assert.equal(response.headers.get('content-range'),null);assert.deepEqual(await bytes(response),apkBytes);
}
const certificate=JSON.parse(await readFile(path.join(root,'native/android/release-certificate.json'),'utf8'));
const dalRoute='/.well-known/assetlinks.json',dalResponse=await fetchAsset(dalRoute);assert.equal(dalResponse.status,200);assert.equal(dalResponse.headers.get('content-type'),'application/json; charset=utf-8');
assert.deepEqual(await dalResponse.json(),[{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:release.android.packageId,sha256_cert_fingerprints:[certificate.sha256CertificateFingerprint]}}]);
assert.equal(certificate.packageId,release.android.packageId);
assert.equal(certificate.sha256CertificateFingerprint,'9E:1A:6F:B3:D7:53:55:1A:B7:C6:4D:09:C3:F6:DE:B3:77:00:3A:E6:2F:96:86:D7:27:32:FA:19:2E:D7:5E:19');
assert.equal(release.android.certificateSha256,certificate.sha256CertificateFingerprint,'public release metadata and the Android association must identify the signed package');
assert.deepEqual(Object.keys(compiledAssets).filter(route=>route.startsWith('/.')), [dalRoute],'only the explicitly allowed public asset-links file may be embedded from dot directories');
for(const route of ['/.well-known','/.well-known/','/.well-known/secrets.json','/.well-known/assetlinks.json.bak','/.well-known/../.openai/hosting.json'])assert.equal((await fetchAsset(route)).status,404,route);
for(const filename of ['voidline-source.zip','VOIDLINE-Windows-x64.zip']){
 const route='/downloads/'+filename;
 for(const method of ['GET','HEAD']){
  const response=await fetchAsset(route,{method});
  assert.equal(response.status,503,route+' requires its real R2 binding; the isolated R2 suite verifies ready-file responses');
 }
 assert.equal(compiledAssets[route],undefined,'large developer/desktop files are not embedded in the Worker');
}
console.log('PASS native downloads: exact signed APK bytes/hash/MIME/filename, GET/HEAD/ETag, byte/suffix/invalid/If-Range responses, matching public Android certificate association, and R2-backed large-download routing. Device installation and remote release availability are checked separately.');
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
