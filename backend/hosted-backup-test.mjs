// Real SQLite + WebCrypto + isolated workerd/D1/R2 snapshot and Python restore checks.
// Never a claim of production artifact access, production restoration, scheduling or Matrix backup.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createHostedBackup,hostedBackupHealth,HOSTED_BACKUP_LIMITS} from '../worker/hosted-backup.mjs';
const cases=[],test=(name,run)=>cases.push([name,run]);
const now=1794954000000,key=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
const root=new URL('../',import.meta.url),prefix='__voidline_internal/backups/v1/',sentinel='HOSTED_BACKUP_PRIVATE_SENTINEL';
class Adapter{
 constructor(db){this.db=db;this.batchCount=0;this.beforeBatch=null;this.batches=[];}
 prepare(sql){const self=this;return {bind(...values){return {sql,all:async()=>({success:true,results:self.db.prepare(sql).all(...values)})};}};}
 async batch(statements){this.batchCount++;this.batches.push(statements.map(s=>s.sql));await this.beforeBatch?.(this.batchCount,statements);this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.all());this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
class Bucket{
 constructor(){this.objects=new Map();this.putCount=0;this.failAt=null;}
 async put(name,value,options){this.putCount++;if(this.putCount===this.failAt)throw Error('Private storage failure fixture');const bytes=typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(value);this.objects.set(name,{bytes:new Uint8Array(bytes),options});return {key:name};}
 async get(name){const object=this.objects.get(name);return object?{size:object.bytes.length,text:async()=>new TextDecoder().decode(object.bytes),arrayBuffer:async()=>object.bytes.slice().buffer}:null;}
}
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries)db.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 db.exec("CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,applied_at TEXT NOT NULL);INSERT INTO d1_migrations(name,applied_at) VALUES('0009_realtime_media_policy.sql','2026-11-17');");
 db.prepare('INSERT INTO live_accounts(id,username,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,?,1,?,?)').run('retained','retained_user','Retained User',now,now);
 db.prepare("INSERT INTO live_communities(id,name,created_by,created_at) VALUES('community','Retained community','retained',?)").run(now);
 db.prepare("INSERT INTO live_memberships(community_id,account_id,role,joined_at) VALUES('community','retained','owner',?)").run(now);
 db.prepare("INSERT INTO live_channels(id,community_id,name,kind,created_at) VALUES('channel','community','general','text',?)").run(now);
 db.prepare("INSERT INTO live_messages(id,channel_id,author_id,client_id,text,created_at) VALUES('message','channel','retained','stable',?,?)").run(sentinel,now);
 db.prepare("INSERT INTO auth_credentials(account_id,password_hash,salt,algorithm,iterations,recovery_hash,created_at,updated_at) VALUES('retained',?,?,'pbkdf2-sha256',100000,?,?,?)").run('f'.repeat(64),'a'.repeat(64),'e'.repeat(64),now,now);
 db.prepare("INSERT INTO media_assets(id,owner_id,client_id,object_key,sha256,kind,content_type,bytes,state,created_at,updated_at) VALUES('asset','retained','upload','v1/private-object',?,'avatar','image/png',8,'ready',?,?)").run('a'.repeat(64),now,now);
 db.exec("CREATE TABLE backup_type_fixture(id INTEGER PRIMARY KEY AUTOINCREMENT,integer_value INTEGER,real_value REAL,blob_value BLOB,text_value TEXT,nullable TEXT,computed TEXT GENERATED ALWAYS AS (upper(text_value)) VIRTUAL);CREATE TABLE backup_trigger_fixture(id INTEGER PRIMARY KEY,value TEXT);CREATE TRIGGER backup_fixture_trigger AFTER INSERT ON backup_type_fixture BEGIN INSERT INTO backup_trigger_fixture(id,value) VALUES(NEW.id,'trigger-once');END;CREATE INDEX backup_fixture_index ON backup_type_fixture(text_value);CREATE VIEW backup_fixture_view AS SELECT id,text_value FROM backup_type_fixture;");
 db.prepare('INSERT INTO backup_type_fixture(id,integer_value,real_value,blob_value,text_value,nullable) VALUES(1,?,?,?,?,NULL)').run(9223372036854775807n,0.12345678901234568,new Uint8Array([0,1,255,44]),'text\u0000尾');
 db.exec('INSERT INTO backup_type_fixture(id) VALUES(100);DELETE FROM backup_type_fixture WHERE id=100;DELETE FROM backup_trigger_fixture WHERE id=100;');
 db.exec("CREATE TABLE _cf_METADATA(key TEXT PRIMARY KEY,value TEXT);INSERT INTO _cf_METADATA VALUES('infrastructure-only','not-application');");
 const adapter=new Adapter(db),bucket=new Bucket();return {db,adapter,bucket,env:{DB:adapter,MEDIA:bucket,VOIDLINE_BACKUP_KEY:key()},close:()=>db.close()};
}
function artifact(f,receipt){return f.bucket.objects.get(prefix+receipt.id+'.vlhb').bytes;}
function pythonCheck(raw,secret,extra={}){
 const dir=mkdtempSync(path.join(tmpdir(),'voidline-hosted-backup-')),file=path.join(dir,'backup.vlhb'),output=path.join(dir,'restored.sqlite');
 try{writeFileSync(file,raw,{mode:0o600});const code=String.raw`
import importlib.util,json,pathlib,sqlite3,sys,os,base64
x=json.load(sys.stdin)
spec=importlib.util.spec_from_file_location('hosted_restore',x['module']);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
result=m.restore_hosted_backup(x['input'],x['output'],x['key'])
with sqlite3.connect(x['output']) as db:
 assert db.execute('SELECT text FROM live_messages WHERE id=?',('message',)).fetchone()[0]==x['sentinel']
 assert db.execute('SELECT role FROM live_memberships').fetchone()[0]=='owner'
 assert db.execute('SELECT password_hash FROM auth_credentials').fetchone()[0]=='f'*64
 assert db.execute('SELECT object_key FROM media_assets').fetchone()[0]=='v1/private-object'
 assert db.execute('SELECT integer_value FROM backup_type_fixture').fetchone()[0]==9223372036854775807
 assert db.execute('SELECT real_value FROM backup_type_fixture').fetchone()[0]==0.12345678901234568
 assert db.execute('SELECT blob_value FROM backup_type_fixture').fetchone()[0]==bytes([0,1,255,44])
 assert db.execute('SELECT text_value FROM backup_type_fixture').fetchone()[0]=='text\x00尾'
 assert db.execute('SELECT COUNT(*) FROM backup_trigger_fixture').fetchone()[0]==1
 assert db.execute('SELECT id FROM backup_fixture_view').fetchone()[0]==1
 assert db.execute("SELECT name FROM sqlite_master WHERE name='_cf_METADATA'").fetchone() is None
 assert db.execute("SELECT seq FROM sqlite_sequence WHERE name='backup_type_fixture'").fetchone()[0]==100
 assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
 assert db.execute("SELECT name FROM d1_migrations").fetchone()[0]=='0009_realtime_media_policy.sql'
 assert db.execute('SELECT COUNT(*) FROM account_revisions').fetchone()[0]>=1
 assert db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger'").fetchone()[0]>13
try:m.restore_hosted_backup(x['input'],x['output'],x['key']);raise AssertionError('overwritten')
except FileExistsError:pass
wrong_raw=bytearray(base64.b64decode(x['key']));wrong_raw[0]^=1;wrong_key=base64.b64encode(wrong_raw).decode()
for key_suffix in ['wrong']:
 try:m.restore_hosted_backup(x['input'],x['output']+'.wrong',wrong_key);raise AssertionError('wrong key accepted')
 except ValueError:assert not pathlib.Path(x['output']+'.wrong').exists()
raw=bytearray(pathlib.Path(x['input']).read_bytes());raw[-1]^=1;bad=x['input']+'.bad';pathlib.Path(bad).write_bytes(raw)
try:m.restore_hosted_backup(bad,x['output']+'.bad',x['key']);raise AssertionError('tamper accepted')
except ValueError:assert not pathlib.Path(x['output']+'.bad').exists()
raw=bytearray(pathlib.Path(x['input']).read_bytes());i=raw.index(b'AES-256-GCM');raw[i]=ord('B');bad=x['input']+'.header';pathlib.Path(bad).write_bytes(raw)
try:m.restore_hosted_backup(bad,x['output']+'.header',x['key']);raise AssertionError('header tamper accepted')
except ValueError:assert not pathlib.Path(x['output']+'.header').exists()
assert pathlib.Path(x['output']).stat().st_mode & 0o777==0o600
print(json.dumps(result))
`;
 const result=spawnSync('python3',['-c',code],{input:JSON.stringify({module:new URL('../scripts/restore-hosted-backup.py',import.meta.url).pathname,input:file,output,key:secret,sentinel,...extra}),encoding:'utf8',maxBuffer:1024*1024});assert.equal(result.status,0,'Isolated Python restore failed: '+result.stderr);return JSON.parse(result.stdout);
 }finally{rmSync(dir,{recursive:true,force:true});}
}

test('all deployed application tables, schema, typed rows, credentials and media references survive protected isolated restore',async()=>{
 const f=fixture();try{const receipt=await createHostedBackup(f.env,{now}),raw=artifact(f,receipt);assert.equal(receipt.encrypted,true);assert.equal(receipt.mediaBytesIncluded,false);assert.equal(receipt.productionRestoreVerified,false);assert(receipt.tableCount>60);assert.equal(Buffer.from(raw).includes(Buffer.from(sentinel)),false);assert.equal(Buffer.from(raw).includes(Buffer.from('v1/private-object')),false);assert.equal(JSON.stringify(receipt).includes(sentinel),false);assert(!('objectKey'in receipt));assert(!('tables'in receipt));const restored=pythonCheck(raw,f.env.VOIDLINE_BACKUP_KEY);assert.equal(restored.tableCount,receipt.tableCount);assert.equal(restored.rowCount,receipt.rowCount);assert.equal(restored.mediaBytesRestored,false);assert.equal(receipt.mediaReferenceCount,1);assert.equal(f.adapter.batchCount,3);const snapshotBatch=f.adapter.batches.at(-1);assert(snapshotBatch[0].includes('sqlite_master'));assert(snapshotBatch.at(-1).includes('sqlite_master'));assert(snapshotBatch.some(sql=>sql.includes('AS backup_row')));assert(f.adapter.batches.flat().every(sql=>Buffer.byteLength(sql)<=100000 && (sql.match(/\?/g)||[]).length<=100),'Every prepared query must fit D1 SQL length and binding limits');assert(f.adapter.batches.flat().length+1<=50,'Current deployed schema should fit a 50-statement D1 budget');const health=await hostedBackupHealth(f.env);assert.equal(health.configured,true);assert.equal(health.lastBackup.id,receipt.id);assert.equal(health.receiptStatus,'stored');}finally{f.close();}
});
test('each run has a fresh random nonce and ID; ciphertext is stored before either completion receipt',async()=>{
 const f=fixture();try{const first=await createHostedBackup(f.env,{now}),second=await createHostedBackup(f.env,{now});assert.notEqual(first.id,second.id);assert.notDeepEqual(artifact(f,first),artifact(f,second));const objects=[...f.bucket.objects.keys()];assert.equal(objects[0],prefix+first.id+'.vlhb');assert.equal(objects[1],prefix+first.id+'.json');assert.equal(objects[2],prefix+'latest.json');assert.equal((await hostedBackupHealth(f.env)).lastBackup.id,second.id);for(const object of f.bucket.objects.values())assert(!Buffer.from(object.bytes).includes(Buffer.from(sentinel)));}finally{f.close();}
});
test('missing/invalid key, missing storage and invalid bounds fail before any snapshot write',async()=>{
 const f=fixture();try{for(const env of [{...f.env,VOIDLINE_BACKUP_KEY:undefined},{...f.env,VOIDLINE_BACKUP_KEY:'bad'},{...f.env,MEDIA:null}])await assert.rejects(createHostedBackup(env,{now}),error=>/^backup_(key_missing|not_configured)$/.test(error.code));await assert.rejects(createHostedBackup(f.env,{now,limits:{maxTableRows:HOSTED_BACKUP_LIMITS.maxTableRows+1}}),error=>error.code==='backup_limits_invalid');assert.equal(f.bucket.objects.size,0);assert.equal((await hostedBackupHealth({...f.env,VOIDLINE_BACKUP_KEY:undefined})).configured,false);}finally{f.close();}
});
test('per-table rows, bytes and total bounds fail without silent truncation or a new completion marker',async()=>{
 for(const limits of [{maxTableRows:1},{maxTotalRows:1},{maxTableBytes:16},{maxPlaintextBytes:32},{maxTables:1}]){const f=fixture();try{if(limits.maxTableRows)f.db.exec("INSERT INTO backup_trigger_fixture(id,value) VALUES(2,'size-bound-fixture')");await assert.rejects(createHostedBackup(f.env,{now,limits}),error=>['backup_too_large','backup_schema_unsupported'].includes(error.code));assert.equal(f.bucket.objects.size,0);}finally{f.close();}}
});
test('schema changes and growth between preflight and the transactional snapshot fail without partial publication',async()=>{
 for(const kind of ['schema','growth']){const f=fixture();try{f.adapter.beforeBatch=async count=>{if(count!==3)return;if(kind==='schema')f.db.exec('CREATE TABLE unexpected_schema_change(id INTEGER)');else f.db.prepare('INSERT INTO backup_type_fixture(text_value) VALUES(?)').run('x'.repeat(100000));};await assert.rejects(createHostedBackup(f.env,{now,limits:kind==='growth'?{maxTableBytes:65536}:{}}),error=>['backup_schema_changed','backup_too_large'].includes(error.code));assert.equal(f.bucket.objects.size,0);}finally{f.close();}}
});
test('R2 write failure cannot advance latest or publish a premature completion marker',async()=>{
 for(const failAt of [1,2,3]){const f=fixture();try{f.bucket.failAt=failAt;await assert.rejects(createHostedBackup(f.env,{now}),error=>error.code==='backup_storage_failed'&&!error.message.includes(sentinel));assert.equal(f.bucket.objects.has(prefix+'latest.json'),false);if(failAt<=2)assert.equal([...f.bucket.objects.keys()].some(name=>name.endsWith('.json')),false);assert.equal((await hostedBackupHealth(f.env)).lastBackup,null);}finally{f.close();}}
});
test('health receipts are bounded and reveal only operational metadata',async()=>{
 const f=fixture();try{assert.equal((await hostedBackupHealth(f.env)).receiptStatus,'none');await f.bucket.put(prefix+'latest.json','x'.repeat(17000));assert.equal((await hostedBackupHealth(f.env)).receiptStatus,'invalid');await f.bucket.put(prefix+'latest.json',JSON.stringify({format:1,id:'bad',passwordHash:'PRIVATE'}));const health=await hostedBackupHealth(f.env);assert.equal(health.lastBackup,null);assert.equal(JSON.stringify(health).includes('PRIVATE'),false);}finally{f.close();}
});
test('actual workerd/D1/R2 bindings complete a bounded authenticated-format snapshot with a private encrypted object',async()=>{
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler')),{Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const compiled=await build({stdin:{contents:"import {createHostedBackup,hostedBackupHealth} from './worker/hosted-backup.mjs';export default{async fetch(request,env){try{return Response.json(new URL(request.url).pathname==='/run'?await createHostedBackup(env):await hostedBackupHealth(env));}catch(error){return Response.json({code:error.code||'test_failed',message:error.message},{status:500});}}}",resolveDir:root.pathname,loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false});
 const runtimeKey=key(),mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:{DB:'isolated-voidline-hosted-backup'},r2Buckets:['MEDIA'],bindings:{VOIDLINE_BACKUP_KEY:runtimeKey},d1Persist:false,r2Persist:false});
 try{const db=await mf.getD1Database('DB');for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries){for(const statement of readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8').split('--> statement-breakpoint').map(value=>value.trim()).filter(Boolean))await db.prepare(statement).run();}await db.prepare('CREATE TABLE backup_runtime_accounts(id TEXT PRIMARY KEY,content TEXT NOT NULL)').run();await db.prepare('INSERT INTO backup_runtime_accounts(id,content) VALUES(?,?)').bind('isolated',sentinel).run();
  const response=await mf.dispatchFetch('https://isolated.example/run');const receipt=await response.json();assert.equal(response.status,200,JSON.stringify(receipt));assert(receipt.tableCount>=60);assert.equal(receipt.rowCount,1);const bucket=await mf.getR2Bucket('MEDIA'),object=await bucket.get(prefix+receipt.id+'.vlhb');assert(object);const bytes=Buffer.from(await object.arrayBuffer());assert(bytes.subarray(0,24).toString().startsWith('VOIDLINE-HOSTED-BACKUP-1'));assert.equal(bytes.includes(Buffer.from(sentinel)),false);
  const directory=mkdtempSync(path.join(tmpdir(),'voidline-workerd-backup-'));try{const sourceFile=path.join(directory,'runtime.vlhb'),destination=path.join(directory,'runtime.sqlite');writeFileSync(sourceFile,bytes,{mode:0o600});const python=spawnSync('python3',['-c',String.raw`import importlib.util,json,sqlite3,sys
x=json.load(sys.stdin);s=importlib.util.spec_from_file_location('restore',x['module']);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);result=m.restore_hosted_backup(x['input'],x['output'],x['key'])
with sqlite3.connect(x['output']) as db: assert db.execute('SELECT content FROM backup_runtime_accounts').fetchone()[0]==x['sentinel']
print(json.dumps(result))`],{input:JSON.stringify({module:new URL('../scripts/restore-hosted-backup.py',import.meta.url).pathname,input:sourceFile,output:destination,key:runtimeKey,sentinel}),encoding:'utf8',maxBuffer:1024*1024});assert.equal(python.status,0,'Actual workerd artifact failed isolated restore: '+python.stderr);assert.equal(JSON.parse(python.stdout).tableCount,receipt.tableCount);}finally{rmSync(directory,{recursive:true,force:true});}
  const health=await(await mf.dispatchFetch('https://isolated.example/status')).json();assert.equal(health.lastBackup.id,receipt.id);assert.equal(health.productionRestoreVerified,false);}finally{await mf.dispose();}
});
let passed=0;for(const[name,run]of cases){try{await run();passed++;console.log('PASS '+name);}catch(error){console.error('FAIL '+name,error.stack);}}
console.log(`${passed}/${cases.length} protected hosted-backup checks passed. Includes actual isolated workerd/D1/R2 and cross-runtime Python/SQLite restore; not production restoration, scheduled execution or R2 media-byte recovery.`);process.exitCode=passed===cases.length?0:1;
