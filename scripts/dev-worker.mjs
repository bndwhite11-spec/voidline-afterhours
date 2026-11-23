import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {applyLocalMigrations} from './migrate-local.mjs';

// sites-preview owns the managed server lifecycle. Its --host/--port arguments
// are translated to Wrangler's documented --ip/--port flags here.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let host = '127.0.0.1';
let port = '4173';
let persistTo = path.join(root, '.wrangler/state');
const input = process.argv.slice(2);
for (let i = 0; i < input.length; i++) {
  if (input[i] === '--host' || input[i] === '--ip') host = input[++i];
  else if (input[i].startsWith('--host=')) host = input[i].slice(7);
  else if (input[i] === '--port') port = input[++i];
  else if (input[i].startsWith('--port=')) port = input[i].slice(7);
  else if (input[i] === '--persist-to') persistTo = input[++i];
  else if (input[i].startsWith('--persist-to=')) persistTo = input[i].slice(13);
  else if (input[i] !== '--strictPort') throw new Error(`Unknown preview option: ${input[i]}`);
}
if (!['127.0.0.1', 'localhost', '0.0.0.0'].includes(host)) throw new Error('Unsupported preview host.');
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid preview port.');
if (typeof persistTo !== 'string' || !persistTo) throw new Error('Provide a directory after --persist-to.');
persistTo = path.resolve(persistTo);

await import('./build-worker.mjs');
const runtime = path.join(root, '.sites-runtime');
await mkdir(path.join(runtime, 'wrangler-logs'), { recursive: true });
await mkdir(path.join(runtime, 'xdg-config'), { recursive: true });
await mkdir(path.join(runtime, 'xdg-cache'), { recursive: true });
const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const localEnvironment = {
  ...process.env,
  WRANGLER_SEND_METRICS: 'false',
  CLOUDFLARE_CF_FETCH_ENABLED: 'false',
  WRANGLER_LOG_PATH: path.join(runtime, 'wrangler-logs'),
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || path.join(runtime, 'xdg-config'),
  XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || path.join(runtime, 'xdg-cache'),
};
// Apply authored statements through local D1 without splitting trigger bodies.
// Existing untracked preview databases are refused, never adopted or reset.
await applyLocalMigrations({configPath:path.join(runtime,'wrangler.json'),persistTo,onProgress:name=>console.log('Applied local migration '+name)});
const child = spawn(process.execPath, [
  wrangler,
  'dev', '--local', '--config', path.join(runtime, 'wrangler.json'),
  '--persist-to', persistTo,
  '--ip', host, '--port', port, '--inspector-port', '0',
], {
  cwd: root,
  stdio: 'inherit',
  env: localEnvironment,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
