import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {build} from 'esbuild';
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const runtimeDirectory = path.join(root, '.sites-runtime');
const manifest = JSON.parse(await readFile(path.join(root, '.openai/hosting.json'), 'utf8'));
if (manifest.static != null) throw new Error('Worker builds must omit static from .openai/hosting.json.');
if (manifest.d1 !== 'DB') throw new Error('The live messaging API requires the declared D1 binding DB.');
if (!manifest.project_id) throw new Error('The existing Site project_id must be preserved.');

const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
};
const excludedRoots = new Set(['server', '.openai', '_appgen_meta']);
// v7's sample/archive source remains in the source download and tests. It is
// never an executable production fallback or automatically loaded fixture.
const productionRoots = new Set(['index.html','help.html','help.css','notifications.js','push-worker.js','entry.js','entry.css','home.js','home.css','store.js','legacy-import.js',
  'cosmetics.js','cosmetics.css','social.js','social.css',
  'organize.js','organize.css','profiles-panel.js','profiles-panel.css','admin.js','admin.css','passkey-client.js',
  'icon.svg','manifest.webmanifest','secure-messenger.js','secure-messenger.js.LEGAL.txt','pkg','downloads']);
const assets = {};
let assetBytes = 0;
async function collect(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if ((!prefix && (excludedRoots.has(entry.name)||!productionRoots.has(entry.name))) || entry.name.startsWith('.')) continue;
    if(prefix==='downloads'&&!['voidline-offline.html','voidline-source.zip','voidline-improvement-prompt.txt'].includes(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(filename, relative);
    else if (entry.isFile()) {
      const bytes = await readFile(filename);
      assetBytes += bytes.length;
      const compressed = bytes.length>32768 ? gzipSync(bytes,{level:9}) : null;
      const encoded = compressed && compressed.length<bytes.length*.85 ? compressed : bytes;
      assets[`/${relative}`] = {
        body: encoded.toString('base64'),
        gzip: encoded!==bytes,
        type: contentTypes[path.extname(entry.name).toLowerCase()] || 'application/octet-stream',
        etag: `"${createHash('sha256').update(bytes).digest('hex').slice(0, 24)}"`,
      };
    } else throw new Error(`Unexpected symlink or special asset: ${relative}`);
  }
}
await collect(output);
if (!assets['/index.html']) throw new Error('Missing dist/index.html. Existing static client source must be retained.');

const runtime = `
const VOIDLINE_ASSETS = ${JSON.stringify(assets)};
function matrixConnectOrigin(env) {
  try { const u=new URL(env?.MATRIX_HOMESERVER);return u.protocol==='https:'&&u.origin===u.href.replace(/\\/$/,'') ? ' '+u.origin : ''; } catch {return '';}
}

async function apiResponse(request,env,ctx,handler){
  const response=await handler(request,env,ctx);
  if(response.ok)await scheduleNotificationDelivery(request,env,ctx).catch(()=>{});
  return response;
}
async function serveVoidline(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/auth/')) return apiResponse(request,env,ctx,handleAuthRequest);
  if (url.pathname==='/api/encryption'||url.pathname.startsWith('/api/encryption/')) return apiResponse(request,env,ctx,handleEncryptionRequest);
  if (url.pathname==='/api/notifications'||url.pathname.startsWith('/api/notifications/')) return apiResponse(request,env,ctx,handleNotificationsRequest);
  if (url.pathname.startsWith('/api/security/')) return apiResponse(request,env,ctx,handleSecurityRequest);
  if (url.pathname==='/api/admin'||url.pathname.startsWith('/api/admin/')) return apiResponse(request,env,ctx,handleAdminRequest);
  if (url.pathname==='/api/messages'||url.pathname.startsWith('/api/messages/')) return apiResponse(request,env,ctx,handleMessagesRequest);
  if (url.pathname==='/api/organize'||url.pathname.startsWith('/api/organize/')) return apiResponse(request,env,ctx,handleOrganizeRequest);
  if (url.pathname.startsWith('/api/profiles/')) return apiResponse(request,env,ctx,handleProfilesRequest);
  if (url.pathname.startsWith('/api/cosmetics/')) return apiResponse(request,env,ctx,handleCosmeticsRequest);
  if (url.pathname==='/api/social'||url.pathname.startsWith('/api/social/')) return apiResponse(request,env,ctx,handleSocialRequest);
  if (url.pathname === '/api/live' || url.pathname.startsWith('/api/live/')) {
    return apiResponse(request,env,ctx,handleLiveRequest);
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD'}});
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return new Response('Invalid path', {status: 400}); }
  const pageRoute = /^\\/(?:users|invite|servers|channels)\\//.test(pathname);
  const asset = VOIDLINE_ASSETS[pathname === '/' || pageRoute ? '/index.html' : pathname];
  if (!asset) return new Response('Not found', {status: 404});
  const headers = {
    'content-type': asset.type,
    'cache-control': 'no-cache',
    'etag': asset.etag,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(self), geolocation=(), display-capture=()',
    'content-security-policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'" + matrixConnectOrigin(env) + "; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'self' https://chatgpt.com https://chat.openai.com; form-action 'self'; upgrade-insecure-requests",
  };
  if (request.headers.get('if-none-match') === asset.etag) return new Response(null, {status: 304, headers});
  if (request.method === 'HEAD') return new Response(null, {headers});
  const bytes = Uint8Array.from(atob(asset.body), c => c.charCodeAt(0));
  // The Sites proxy owns HTTP content encoding. Keep compressed bytes only
  // inside the Worker bundle, then restore the original stream before handing
  // it to the proxy; otherwise an outer gzip layer hides an inner gzip file.
  const body = asset.gzip ? new Response(bytes).body.pipeThrough(new DecompressionStream('gzip')) : bytes;
  return new Response(body, {headers});
}

export default {fetch: serveVoidline};
`;

// Preview state lives outside dist. Keep the production entry's directory in
// place and replace the file atomically so an active watcher never reads a
// partial bundle or loses its directory. Remove only obsolete preview output.
await rm(path.join(output, '.openai'), { recursive: true, force: true });
await mkdir(path.join(output, 'server'), { recursive: true });
await mkdir(path.join(output, '.openai'), { recursive: true });
await mkdir(runtimeDirectory, { recursive: true });
await rm(path.join(output, 'server/wrangler.json'), { force: true });
await rm(path.join(output, 'server/.wrangler'), { recursive: true, force: true });
const compiled=await build({stdin:{contents:`import {handleLiveRequest} from './worker/index.mjs';\nimport {handleEncryptionRequest} from './worker/encryption.mjs';\nimport {handleNotificationsRequest,scheduleNotificationDelivery} from './worker/notifications.mjs';\nimport {handleMessagesRequest} from './worker/messages.mjs';\nimport {handleAuthRequest} from './worker/auth.mjs';\nimport {handlePasskeyRequest as handleSecurityRequest} from './worker/passkeys.mjs';\nimport {handleAdminRequest} from './worker/admin.mjs';\nimport {handleOrganizeRequest} from './worker/organize.mjs';\nimport {handleProfilesRequest} from './worker/profiles.mjs';\nimport {handleCosmeticsRequest} from './worker/cosmetics.mjs';\nimport {handleSocialRequest} from './worker/social.mjs';\n${runtime}`,resolveDir:root,sourcefile:'voidline-entry.mjs',loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,minify:true,legalComments:'inline'});
const bundle=compiled.outputFiles[0].text;
const nextBundle = path.join(runtimeDirectory, 'worker-build.next');
await writeFile(nextBundle, bundle);
await rename(nextBundle, path.join(output, 'server/index.js'));
await writeFile(path.join(output, '.openai/hosting.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await cp(path.join(root, 'drizzle'), path.join(output, '.openai/drizzle'), { recursive: true });

// This configuration and Wrangler's adjacent .wrangler/tmp directory are
// local-only. They must never enter dist or be removed by a production build.
// Sites provisions the hosted binding from the source hosting manifest.
const localConfigPath = path.join(runtimeDirectory, 'wrangler.json');
const localConfig = `${JSON.stringify({
  name: 'voidline-afterhours-local',
  main: '../dist/server/index.js',
  compatibility_date: '2026-05-15',
  d1_databases: [{
    binding: 'DB',
    database_name: 'site-creator-d1',
    database_id: '00000000-0000-4000-8000-000000000000',
  }],
}, null, 2)}\n`;
let currentLocalConfig;
try { currentLocalConfig = await readFile(localConfigPath, 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (currentLocalConfig !== localConfig) {
  const nextConfig = path.join(runtimeDirectory, 'wrangler-config.next');
  await writeFile(nextConfig, localConfig);
  await rename(nextConfig, localConfigPath);
}
console.log(`Built self-contained Worker with ${Object.keys(assets).length} assets (${assetBytes} source bytes; ${Buffer.byteLength(bundle)} Worker bytes).`);
