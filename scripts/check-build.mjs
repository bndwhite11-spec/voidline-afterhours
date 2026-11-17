// Verify the deployable Worker, rather than an imitation of its asset router.
// Run after the offline generator and npm run build.
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const worker = (await import(pathToFileURL(path.join(dist, 'server/index.js')))).default;
const origin = 'https://voidline-build.example';
const fetchAsset = (name, options) => worker.fetch(new Request(origin + name, options), {}, {});
const productionRoots=new Set(['index.html','entry.js','entry.css','home.js','home.css','organize.js','organize.css','profiles-panel.js','profiles-panel.css','admin.js','admin.css','passkey-client.js','cosmetics.js','cosmetics.css','social.js','social.css','store.js','legacy-import.js','icon.svg','manifest.webmanifest','secure-messenger.js','secure-messenger.js.LEGAL.txt','pkg','downloads']);
async function bytes(response){assert.equal(response.headers.get('content-encoding'),null,'The Sites proxy owns HTTP compression; Worker responses must contain original bytes.');return Buffer.from(await response.arrayBuffer());}
let count = 0;
async function verify(directory, prefix = '') {
  for (const item of await readdir(directory, {withFileTypes:true})) {
    if (item.name.startsWith('.') || (!prefix && !productionRoots.has(item.name))) continue;
    const relative = prefix + '/' + item.name;
    if (item.isDirectory()) { await verify(path.join(directory,item.name), relative); continue; }
    assert(item.isFile(), `Unexpected deploy asset ${relative}`);
    const response = await fetchAsset(relative);
    assert.equal(response.status, 200, relative);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(await bytes(response), await readFile(path.join(directory,item.name)), relative);
    const head = await fetchAsset(relative, {method:'HEAD'});
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    const cached = await fetchAsset(relative, {headers:{'if-none-match':response.headers.get('etag')}});
    assert.equal(cached.status, 304);
    count++;
  }
}
await verify(dist);
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
assert.equal(manifest.r2, null);
assert.equal(manifest.static, undefined);
const journal = JSON.parse(await readFile(path.join(root,'drizzle/meta/_journal.json')));
for (const entry of journal.entries) {
  const name = entry.tag + '.sql';
  assert.deepEqual(await readFile(path.join(dist,'.openai/drizzle',name)), await readFile(path.join(root,'drizzle',name)));
}
console.log(`PASS built Worker: ${count} exact assets, HEAD/ETag, private build paths excluded, API guards, existing Site identity and ${journal.entries.length} packaged migrations.`);
console.log('This verifies the generated Worker locally, not a browser session or production D1 exchange.');
