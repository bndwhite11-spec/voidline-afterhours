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
let count = 0;
async function verify(directory, prefix = '') {
  for (const item of await readdir(directory, {withFileTypes:true})) {
    if (item.name.startsWith('.') || (!prefix && ['server', '_appgen_meta'].includes(item.name))) continue;
    const relative = prefix + '/' + item.name;
    if (item.isDirectory()) { await verify(path.join(directory,item.name), relative); continue; }
    assert(item.isFile(), `Unexpected deploy asset ${relative}`);
    const response = await fetchAsset(relative);
    assert.equal(response.status, 200, relative);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path.join(directory,item.name)), relative);
    const head = await fetchAsset(relative, {method:'HEAD'});
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    const cached = await fetchAsset(relative, {headers:{'if-none-match':response.headers.get('etag')}});
    assert.equal(cached.status, 304);
    count++;
  }
}
await verify(dist);
assert.deepEqual(Buffer.from(await (await fetchAsset('/')).arrayBuffer()), await readFile(path.join(dist,'index.html')));
for (const route of ['/server/index.js', '/.openai/hosting.json', '/.openai/drizzle/meta/_journal.json', '/.env', '/missing']) {
  assert.equal((await fetchAsset(route)).status, 404, route);
}
assert.equal((await fetchAsset('/', {method:'POST'})).status, 405);
assert.equal((await fetchAsset('/api/live/me')).status, 401);
assert.equal((await fetchAsset('/api/live/health')).status, 503);
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
