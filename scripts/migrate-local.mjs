/** Local preview D1 only. Do not use Wrangler's generic SQL splitter on
 * Drizzle migrations: its trigger bodies contain intentional semicolons. */
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);

export async function openLocalDatabase({configPath=path.join(root,'.sites-runtime/wrangler.json'),persistTo=path.join(root,'.wrangler/state')}={}){
 const config=JSON.parse(await readFile(configPath,'utf8'));
 const binding=config.d1_databases?.find(binding=>binding.binding==='DB');
 if(!binding)throw Error('The local preview configuration must declare its DB binding.');
 const databaseId=binding.preview_database_id??binding.database_id??binding.binding;
 const persistRoot=path.resolve(persistTo);
 // Match Wrangler's local execute/dev storage layout and database identity.
 // No credentials, remote binding, provider or network D1 client is used.
 const runtime=new Miniflare({modules:true,script:'',compatibilityDate:config.compatibility_date||'2026-05-15',d1Persist:path.join(persistRoot,'v3','d1'),d1Databases:{DB:databaseId}});
 try{return {runtime,db:await runtime.getD1Database('DB'),persistRoot,ledger:binding.migrations_table||'d1_migrations'};}
 catch(error){await runtime.dispose();throw error;}
}

export async function applyLocalMigrations({configPath=path.join(root,'.sites-runtime/wrangler.json'),persistTo=path.join(root,'.wrangler/state'),migrationsRoot=path.join(root,'drizzle'),onProgress=()=>{}}={}){
 const journal=JSON.parse(await readFile(path.join(migrationsRoot,'meta/_journal.json'),'utf8'));
 if(!Array.isArray(journal.entries)||journal.entries.some((entry,index)=>entry.idx!==index||!/^\d{4}_[a-z0-9_]+$/i.test(entry.tag)))throw Error('The local migration journal is invalid.');
 const names=journal.entries.map(entry=>entry.tag+'.sql');
 if(new Set(names).size!==names.length)throw Error('The local migration journal contains duplicate names.');
 const local=await openLocalDatabase({configPath,persistTo}),{db,runtime,ledger}=local;
 try{
  if(!/^[a-z_][a-z0-9_]*$/i.test(ledger))throw Error('The local migration ledger name is invalid.');
  const table='"'+ledger+'"';
  const schema=(await db.prepare("SELECT name,type FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*'").all()).results;
  const exists=schema.some(row=>row.name===ledger&&row.type==='table');
  const recorded=exists?(await db.prepare(`SELECT name FROM ${table} ORDER BY id`).all()).results.map(row=>row.name):[];
  const applicationSchema=schema.filter(row=>row.name!==ledger);
  if(!recorded.length&&applicationSchema.length)throw Error('This local database already has application tables but no migration history. It was left unchanged. Use --persist-to with a new empty directory for a fresh preview.');
  if(recorded.length>names.length||recorded.some((name,index)=>name!==names[index]))throw Error('This local database has an unknown or noncontiguous migration history. It was left unchanged. Use another --persist-to directory.');
  if(!exists)await db.prepare(`CREATE TABLE ${table}(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)`).run();
  const pending=names.slice(recorded.length),applied=[];
  for(const name of pending){
   const source=await readFile(path.join(migrationsRoot,name),'utf8');
   // Preserve each authored SQL statement, including the entire trigger body.
   // The migration and its compatible Wrangler ledger record commit together.
   const parts=source.split('--> statement-breakpoint').map(part=>part.trim()).filter(Boolean);
   if(!parts.length)throw Error('The local migration '+name+' is empty.');
   try{await db.batch([...parts.map(part=>db.prepare(part)),db.prepare(`INSERT INTO ${table}(name) VALUES(?)`).bind(name)]);}
   catch(error){throw new Error('Local migration '+name+' failed; its changes and ledger entry were rolled back. '+(error.cause?.message||error.message),{cause:error});}
   applied.push(name);onProgress(name);
  }
  return {persistRoot:local.persistRoot,applied,total:names.length};
 }finally{await runtime.dispose();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let persistTo=path.join(root,'.wrangler/state');
 const args=process.argv.slice(2);
 for(let i=0;i<args.length;i++){
  if(args[i]==='--persist-to')persistTo=args[++i];
  else if(args[i].startsWith('--persist-to='))persistTo=args[i].slice(13);
  else throw Error('Unknown local migration option: '+args[i]);
 }
 if(typeof persistTo!=='string'||!persistTo)throw Error('Provide a directory after --persist-to.');
 const result=await applyLocalMigrations({persistTo:path.resolve(persistTo),onProgress:name=>console.log('Applied local migration '+name)});
 console.log(`Local D1 ready: ${result.applied.length} applied, ${result.total} recorded (${result.persistRoot}).`);
}
