// Submit real account forms concurrently to a single isolated production auth Worker.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),wrangler=createRequire(require.resolve('wrangler'));
const {Miniflare}=await import(pathToFileURL(wrangler.resolve('miniflare')));
const root=new URL('../',import.meta.url),origin='https://accounts.test';
const bundle=await build({stdin:{resolveDir:root.pathname,contents:"import {handleAuthRequest} from './worker/auth.mjs';export default {fetch(r,e){return handleAuthRequest(r,e)}}" },bundle:true,format:'esm',platform:'browser',target:'es2022',write:false});
const runtime=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:{DB:'isolated-auth-concurrency'},d1Persist:false});
async function submit(path,username){
 const response=await runtime.dispatchFetch(origin+'/api/auth/'+path,{method:'POST',headers:{origin,'content-type':'application/json','x-voidline-auth':'1'},body:JSON.stringify({username,displayName:username,password:'Independent test account pass '+username})});
 const isJSON=response.headers.get('content-type')?.includes('application/json');
 let data={};
 if(isJSON)data=await response.json();
 else await response.arrayBuffer();
 if(response.status===503){
  assert.equal(response.headers.get('Retry-After'),'1');
  assert.equal(response.headers.get('set-cookie'),null);
 }
 return {status:response.status,code:data.error?.code,username:data.account?.username};
}
try{
 const db=await runtime.getD1Database('DB'),journal=JSON.parse(readFileSync(new URL('drizzle/meta/_journal.json',root)));
 for(const {tag} of journal.entries){
  const migration=readFileSync(new URL('drizzle/'+tag+'.sql',root),'utf8');
  for(const sql of migration.split('--> statement-breakpoint').filter(part=>part.trim()))await db.prepare(sql).run();
 }
 const people=['test_moon','test_comet','test_quasar'];
 const first=await Promise.all(people.map(person=>submit('register',person)));
 console.log('Concurrent registration statuses:',first.map(r=>r.status).join(', '));
 assert(first.some(r=>r.status===201));
 for(const [index,result] of first.entries()){
  if(result.status!==201){
   assert.deepEqual([result.status,result.code],[503,'authentication_busy']);
   assert.equal((await db.prepare('SELECT COUNT(*) n FROM live_accounts WHERE username=?').bind(people[index]).first()).n,0);
   assert.equal((await submit('register',people[index])).status,201);
  }
 }
 for(const person of people)assert.deepEqual(await submit('login',person),{status:200,code:undefined,username:person});
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM auth_credentials WHERE algorithm='argon2id-v19-m19456-t2-p1' AND iterations=2").first()).n,people.length);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM live_accounts').first()).n,people.length);
 console.log('PASS overlapping isolated signups recover on the same Worker and every account can sign in with its original password');
}finally{await runtime.dispose();}
