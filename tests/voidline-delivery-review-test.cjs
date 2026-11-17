'use strict';
// Exercise the shipped generator in an isolated source tree. These canaries
// must never enter a user's downloadable offline client or source bundle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'voidline-delivery-review-'));
try {
  for (const name of ['dist','worker','backend','db','drizzle','scripts','tests','docs','src','build_offline.py','README.txt','DEVELOPMENT.txt','PERFORMANCE.txt','package.json','package-lock.json','requirements-backup.txt','drizzle.config.ts','.gitignore','.env.example','.openai']) {
    if(!fs.existsSync(path.join(root,name)))continue;
    fs.cpSync(path.join(root,name), path.join(temporary,name), {recursive:true, filter:source => !source.split(path.sep).includes('node_modules')});
  }
  const canary='VOIDLINE_PRIVATE_DELIVERY_REVIEW_'+require('node:crypto').randomUUID();
  for (const name of ['dist/.env.local','dist/credentials.json','dist/secrets.json','dist/.dev.vars','backend/private.sqlite','scripts/private-backup.vlb','dist/downloads/backup.db','dist/node_modules/fake/index.js','dist/.sites-runtime/preview.txt','dist/server/private-bundle.js','dist/.openai/private-config.json','dist/_appgen_meta/private-state.txt']) {
    const file=path.join(temporary,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,canary);
  }
  fs.symlinkSync(path.join(temporary,'dist/.env.local'),path.join(temporary,'dist/private-link.txt'));
  const build=spawnSync('python3',['build_offline.py'],{cwd:temporary,encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
  const offline=fs.readFileSync(path.join(temporary,'dist/downloads/voidline-offline.html'),'utf8');
  assert.match(offline,/<html\b[^>]*data-offline="true"/i);
  assert.equal(offline.includes(canary),false);
  assert.doesNotMatch(offline,/<script\b[^>]*\bsrc=/i);
  assert.doesNotMatch(offline,/<link\b[^>]*\brel=["']stylesheet["']/i);
  const scripts=[...offline.matchAll(/<script\b[^>]*data-source="([^"]+)"[^>]*>([\s\S]*?)<\/script\s*>/gi)];
  const sourceScripts=[...fs.readFileSync(path.join(temporary,'dist/index.html'),'utf8').matchAll(/<script\b[^>]*src="([^"?]+)(?:\?[^"]*)?"/gi)].map(match=>path.basename(match[1]));
  assert.deepEqual(scripts.map(match=>match[1]),sourceScripts);
  for (const [,name,source] of scripts) new vm.Script(source,{filename:'offline/'+name});
  const inspect=spawnSync('python3',['-c',`
import zipfile
from pathlib import PurePosixPath
with zipfile.ZipFile('dist/downloads/voidline-source.zip') as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert 'VOIDLINE/dist/live.js' in names
    assert 'VOIDLINE/worker/index.mjs' in names
    assert 'VOIDLINE/.env.example' in names
    assert 'VOIDLINE/docs/ACCOUNT-SETUP.md' in names
    assert 'VOIDLINE/src/secure-messenger.js' in names
    assert any(name.startswith('VOIDLINE/drizzle/') and name.endswith('.sql') for name in names)
    assert 'VOIDLINE/dist/downloads/voidline-source.zip' not in names
    assert not any(name.startswith(('VOIDLINE/dist/server/', 'VOIDLINE/dist/.openai/', 'VOIDLINE/dist/_appgen_meta/')) for name in names)
    for name in names:
        parts = PurePosixPath(name).parts
        assert not any(part in ('node_modules', '.sites-runtime', '.wrangler', '.git') for part in parts), name
        assert not any(part.startswith(('.env', '.dev.vars')) and part != '.env.example' for part in parts), name
        assert not name.endswith(('credentials.json', 'secrets.json', 'private-link.txt')), name
        assert PurePosixPath(name).suffix.lower() not in ('.sqlite', '.sqlite3', '.db', '.vlb', '.backup', '.bak', '.log', '.pem', '.key', '.p12', '.pfx'), name
        assert b'${canary}' not in archive.read(name), name
`],{cwd:temporary,encoding:'utf8'});
  assert.equal(inspect.status,0,inspect.stderr);
  console.log('PASS offline build includes every client script, parses independently, and excludes credential, dependency, symlink, preview, and generated-recursion canaries from downloads.');
} finally { fs.rmSync(temporary,{recursive:true,force:true}); }
