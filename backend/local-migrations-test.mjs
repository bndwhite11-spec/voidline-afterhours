import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {applyLocalMigrations,openLocalDatabase} from '../scripts/migrate-local.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),temp=await mkdtemp(path.join(os.tmpdir(),'voidline-local-migrations-'));
const configPath=path.join(temp,'wrangler.json');
await writeFile(configPath,JSON.stringify({name:'voidline-local-migration-test',compatibility_date:'2026-05-15',d1_databases:[{binding:'DB',database_name:'local-only-test',database_id:'00000000-0000-4000-8000-000000000000'}]}));
const source=path.join(root,'drizzle'),journal=JSON.parse(await readFile(path.join(source,'meta/_journal.json'),'utf8'));
let passed=0;
async function check(name,run){await run();passed++;console.log('PASS '+name);}
async function database(persistTo,run){const local=await openLocalDatabase({configPath,persistTo});try{return await run(local.db);}finally{await local.runtime.dispose();}}
try{
 const full=path.join(temp,'full');
 await check('real local D1 preserves complete 0011/0012 trigger bodies and repeated migrations keep user data',async()=>{
  const first=await applyLocalMigrations({configPath,persistTo:full,migrationsRoot:source});assert.equal(first.applied.length,journal.entries.length);
  await database(full,async db=>{
   const names=(await db.prepare('SELECT name FROM d1_migrations ORDER BY id').all()).results.map(row=>row.name);assert.deepEqual(names,journal.entries.map(entry=>entry.tag+'.sql'));
   await db.prepare("INSERT INTO live_accounts(id,display_name,created_at,updated_at) VALUES('kept-local-account','Kept local account',1,1)").run();
   await db.prepare("INSERT INTO capsule_editions(id,families_json) VALUES('afterhours-choice.v3','{}')").run();
   await db.prepare("INSERT INTO collectible_capsules(id,account_id,source,period,edition_id,earned_at) VALUES('first-local-capsule','kept-local-account','weekly','2026-W48','afterhours-choice.v3',1)").run();
   assert.equal((await db.prepare("SELECT owner_id FROM gift_instances WHERE id='milestone:first-local-capsule'").first()).owner_id,'kept-local-account');
   await assert.rejects(()=>db.prepare("UPDATE collectible_capsules SET earned_at=2 WHERE id='first-local-capsule'").run(),/earned_capsule_is_immutable/);
   await assert.rejects(()=>db.prepare("UPDATE capsule_editions SET families_json='[]' WHERE id='afterhours-choice.v3'").run(),/edition_is_immutable/);
  });
  const again=await applyLocalMigrations({configPath,persistTo:full,migrationsRoot:source});assert.deepEqual(again.applied,[]);
  await database(full,async db=>{assert.equal((await db.prepare("SELECT display_name FROM live_accounts WHERE id='kept-local-account'").first()).display_name,'Kept local account');assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM gift_instances WHERE id='milestone:first-local-capsule'").first()).n,1);});
 });
 await check('Wrangler local execute sees the exact same database identity, persistence layout and ledger',async()=>{
  const result=spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'d1','execute','DB','--local','--config',configPath,'--persist-to',full,'--command','SELECT COUNT(*) AS n FROM d1_migrations','--json'],{cwd:root,encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false',WRANGLER_LOG_PATH:path.join(temp,'logs'),CI:'true'}});
  assert.equal(result.status,0,result.stderr);const data=JSON.parse(result.stdout);assert.equal(data[0].results[0].n,journal.entries.length);
 });
 await check('an existing Wrangler-compatible prefix resumes without replaying earlier migrations',async()=>{
  const prefix=path.join(temp,'prefix-migrations'),persistTo=path.join(temp,'prefix');await mkdir(path.join(prefix,'meta'),{recursive:true});
  const prior=journal.entries.slice(0,11);await writeFile(path.join(prefix,'meta/_journal.json'),JSON.stringify({...journal,entries:prior}));
  for(const entry of prior)await writeFile(path.join(prefix,entry.tag+'.sql'),await readFile(path.join(source,entry.tag+'.sql')));
  await applyLocalMigrations({configPath,persistTo,migrationsRoot:prefix});const result=await applyLocalMigrations({configPath,persistTo,migrationsRoot:source});assert.deepEqual(result.applied,journal.entries.slice(11).map(entry=>entry.tag+'.sql'));
  await database(persistTo,async db=>{assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger' AND name='collector_first_week_keepsake'").first()).n,1);});
 });
 await check('a failed migration rolls back its DDL and ledger entry as one real D1 transaction',async()=>{
  const migrationsRoot=path.join(temp,'atomic-migrations'),persistTo=path.join(temp,'atomic');await mkdir(path.join(migrationsRoot,'meta'),{recursive:true});
  const entries=[{idx:0,tag:'0000_initial'},{idx:1,tag:'0001_failure'}];await writeFile(path.join(migrationsRoot,'meta/_journal.json'),JSON.stringify({entries}));
  await writeFile(path.join(migrationsRoot,'0000_initial.sql'),"CREATE TABLE keep_me(value TEXT);\n--> statement-breakpoint\nINSERT INTO keep_me(value) VALUES('preserved');");
  await writeFile(path.join(migrationsRoot,'0001_failure.sql'),'CREATE TABLE rolled_back(id INTEGER);\n--> statement-breakpoint\nINSERT INTO missing_table VALUES(1);');
  await assert.rejects(()=>applyLocalMigrations({configPath,persistTo,migrationsRoot}),/rolled back/);
  await database(persistTo,async db=>{assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='rolled_back'").first()).n,0);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM d1_migrations').first()).n,1);assert.equal((await db.prepare('SELECT value FROM keep_me').first()).value,'preserved');});
 });
 await check('untracked legacy data and unknown migration histories are refused without adoption or reset',async()=>{
  const legacy=path.join(temp,'legacy');await database(legacy,async db=>{await db.prepare('CREATE TABLE old_data(value TEXT)').run();await db.prepare("INSERT INTO old_data VALUES('keep')").run();});
  await assert.rejects(()=>applyLocalMigrations({configPath,persistTo:legacy,migrationsRoot:source}),/no migration history/);
  await database(legacy,async db=>{assert.equal((await db.prepare('SELECT value FROM old_data').first()).value,'keep');assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='d1_migrations'").first()).n,0);});
  await database(full,async db=>{await db.prepare("INSERT INTO d1_migrations(name) VALUES('9999_unknown.sql')").run();});
  await assert.rejects(()=>applyLocalMigrations({configPath,persistTo:full,migrationsRoot:source}),/unknown or noncontiguous/);
  await database(full,async db=>assert.equal((await db.prepare("SELECT display_name FROM live_accounts WHERE id='kept-local-account'").first()).display_name,'Kept local account'));
 });
 console.log(`${passed}/${passed} local migration checks passed with actual workerd/D1 and isolated temporary storage.`);
}finally{await rm(temp,{recursive:true,force:true});}
