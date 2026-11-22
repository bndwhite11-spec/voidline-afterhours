import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAuthRequest} from '../worker/auth.mjs';
import {handleAdminRequest} from '../worker/admin.mjs';
import {handleCosmeticsRequest} from '../worker/cosmetics.mjs';

// Independent release review: real native HTTP handlers, migrated SQLite and
// Argon2id, with deterministic concurrency at the D1 transaction boundary.
// The owner MFA timestamp below is a fixture, not a browser authenticator test.
const origin='https://release-review.example';
const password='A release review password 2026!';
const replacement='A replacement review password 2026!';
const tests=[],test=(name,run)=>tests.push([name,run]);
class Adapter {
 constructor(sqlite){this.sqlite=sqlite;this.beforeBatch=null;}
 prepare(sql){const db=this.sqlite,adapter=this;return {bind(...values){const s=db.prepare(sql),run=()=>({success:true,meta:{changes:s.run(...values).changes}});return {sql,run:async()=>{await adapter.beforeBatch?.([sql]);return run();},_run:run,first:async()=>s.get(...values)||null,all:async()=>({results:s.all(...values)})};}};}
 async batch(statements){await this.beforeBatch?.(statements.map(s=>s.sql));this.sqlite.exec('BEGIN');try{const result=statements.map(s=>s._run());this.sqlite.exec('COMMIT');return result;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}}
}
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
 for(const entry of journal.entries)sqlite.exec(readFileSync(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),'utf8'));
 const db=new Adapter(sqlite),env={DB:db},actors=[];
 function client(){const cookies=new Map(),c={account:null,csrf:'',cookies};actors.push(c);
  c.call=async(path,body,options={})=>{
   const headers={accept:'application/json','cf-connecting-ip':'198.51.100.'+actors.indexOf(c),...(cookies.size?{cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}:{}),...options.headers};
   if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-auth':'1','x-voidline-csrf':c.csrf});
   const request=new Request(origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify({...(c.account?{expectedAccountId:c.account.id}:{}),...body})})});
   const handler=path.startsWith('/api/admin/')?handleAdminRequest:path.startsWith('/api/cosmetics/')?handleCosmeticsRequest:handleAuthRequest;
   const response=await handler(request,env),data=await response.json();
   for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],cut=pair.indexOf('=');if(pair.slice(cut+1))cookies.set(pair.slice(0,cut),pair.slice(cut+1));else cookies.delete(pair.slice(0,cut));}
   if(response.ok&&data.account)c.account=data.account;if(response.ok&&data.csrfToken)c.csrf=data.csrfToken;
   return {status:response.status,data,headers:response.headers};
  };
  c.ok=async(path,body,options)=>{const result=await c.call(path,body,options);assert.ok(result.status>=200&&result.status<300,`${path}: ${result.status} ${result.data.error?.code}`);return result.data;};return c;
 }
 async function register(username){const c=client(),result=await c.ok('/api/auth/register',{username,displayName:'Review '+username,password});return {client:c,recoveryCode:result.recoveryCode};}
 async function interrupt(match,action,mutate){
  let release,enteredResolve,used=false;const entered=new Promise(r=>{enteredResolve=r;}),gate=new Promise(r=>{release=r;});
  db.beforeBatch=async statements=>{if(!used&&match(statements)){used=true;enteredResolve();await gate;}};
  const task=action();let timeout;
  try{await Promise.race([entered,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Intended mutation batch was not reached')),5000);})]);clearTimeout(timeout);mutate();}
  finally{clearTimeout(timeout);release();db.beforeBatch=null;}
  return task;
 }
 function suspend(id){sqlite.prepare("UPDATE live_accounts SET account_status='suspended' WHERE id=?").run(id);sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE account_id=?').run(Date.now(),id);}
 const credentials=id=>({...sqlite.prepare('SELECT password_hash,salt,recovery_hash,change_marker FROM auth_credentials WHERE account_id=?').get(id)});
 return {sqlite,env,register,client,interrupt,suspend,credentials};
}

test('offline recovery cannot replace credentials if suspension commits after password derivation and before its transaction',async()=>{
 const f=fixture();try{const {client:c,recoveryCode}=await f.register('recover_race'),id=c.account.id,before=f.credentials(id),reset=f.client();
  const result=await f.interrupt(sql=>sql.some(s=>s.startsWith('UPDATE auth_credentials')),
   ()=>reset.call('/api/auth/recover',{username:'recover_race',recoveryCode,password:replacement}),()=>f.suspend(id));
  assert.ok([401,409].includes(result.status));assert.deepEqual(f.credentials(id),before);assert.equal(reset.cookies.has('__Host-voidline_session'),false);
  assert.equal((await c.call('/api/auth/session')).status,401);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE account_id=? AND revoked_at IS NULL').get(id).n,0);
 }finally{f.sqlite.close();}
});
test('a password change loses authority when its originating session is revoked before commit',async()=>{
 const f=fixture();try{const {client:c}=await f.register('change_race'),id=c.account.id,before=f.credentials(id),oldCookie=c.cookies.get('__Host-voidline_session');
  const result=await f.interrupt(sql=>sql.some(s=>s.startsWith('UPDATE auth_credentials')),
   ()=>c.call('/api/auth/password/change',{currentPassword:password,newPassword:replacement}),()=>f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE account_id=?').run(Date.now(),id));
  assert.ok([401,409].includes(result.status));assert.deepEqual(f.credentials(id),before);assert.equal(c.cookies.get('__Host-voidline_session'),oldCookie);
  assert.equal((await c.call('/api/auth/session')).status,401);assert.equal((await f.client().ok('/api/auth/login',{username:'change_race',password})).account.id,id);
 }finally{f.sqlite.close();}
});
test('a preverified ownership claim cannot bind when its session is revoked between resolve and the binding transaction',async()=>{
 const f=fixture();try{const {client:c}=await f.register('xrp'),id=c.account.id;assert.equal((await c.call('/api/admin/users')).status,403);
  // Simulate evidence already verified by the independently tested WebAuthn handler.
  f.sqlite.prepare('UPDATE auth_sessions SET mfa_verified_at=? WHERE account_id=?').run(Date.now(),id);
  const claim=await c.ok('/api/admin/owner/claim',{}),service=f.client();f.env.OWNER_BOOTSTRAP_TOKEN='isolated-operator-'+crypto.randomUUID();f.env.PLATFORM_OWNER_ACCOUNT_ID=id;
  const result=await f.interrupt(sql=>sql.some(s=>s.startsWith('INSERT OR IGNORE INTO platform_owner')),
   ()=>service.call('/api/admin/bootstrap/bind',{code:claim.code},{headers:{authorization:'Bearer '+f.env.OWNER_BOOTSTRAP_TOKEN}}),()=>f.sqlite.prepare('UPDATE auth_sessions SET revoked_at=? WHERE account_id=?').run(Date.now(),id));
  assert.equal(result.status,409);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM platform_owner').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_audit').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT consumed_at FROM owner_claims WHERE account_id=?').get(id).consumed_at,null);
 }finally{f.sqlite.close();}
});
test('a free gift cannot be granted after the recipient becomes suspended during the grant transaction',async()=>{
 const f=fixture();try{const {client:a}=await f.register('grant_sender'),{client:b}=await f.register('grant_recipient');
  const result=await f.interrupt(sql=>sql.some(s=>s.startsWith('INSERT OR IGNORE INTO cosmetic_gifts')),
   ()=>a.call('/api/cosmetics/gifts',{catalogId:'gift-seraph',username:'grant_recipient',clientId:'review-grant-suspend'}),()=>f.suspend(b.account.id));
  assert.ok([404,409,429].includes(result.status));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cosmetic_gifts').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM gift_instances').get().n,0);
 }finally{f.sqlite.close();}
});
test('a reserved instance cannot change ownership if its recipient is suspended before acceptance commits',async()=>{
 const f=fixture();try{const {client:a}=await f.register('transfer_sender'),{client:b}=await f.register('transfer_recipient');
  const collected=await a.ok('/api/cosmetics/claim',{cosmeticId:'gift-key'}),instance=collected.instances.find(i=>i.catalog_id==='gift-key');
  const {transfer}=await a.ok('/api/cosmetics/transfers',{instanceId:instance.id,username:'transfer_recipient',clientId:'review-transfer-suspend'});
  assert.equal(f.sqlite.prepare('SELECT pending_transfer_id FROM gift_instances WHERE id=?').get(instance.id).pending_transfer_id,transfer.id);
  const result=await f.interrupt(sql=>sql.some(s=>s.startsWith('UPDATE gift_transfers')),
   ()=>b.call('/api/cosmetics/transfers/'+transfer.id+'/open',{}),()=>f.suspend(b.account.id));
  assert.ok([401,409].includes(result.status));const item=f.sqlite.prepare('SELECT owner_id,pending_transfer_id,ownership_revision FROM gift_instances WHERE id=?').get(instance.id);
  assert.equal(item.owner_id,a.account.id);assert.equal(item.ownership_revision,0);assert.equal(item.pending_transfer_id,null);
  const offer=f.sqlite.prepare('SELECT state,handled_at FROM gift_transfers WHERE id=?').get(transfer.id);assert.equal(offer.state,'cancelled');assert.ok(offer.handled_at>0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM gift_instances WHERE owner_id=?').get(b.account.id).n,0);
 }finally{f.sqlite.close();}
});

let failures=0;for(const [name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${tests.length-failures}/${tests.length} independent release transaction checks passed. Real Argon2id/SQL/HTTP handlers; isolated storage and synthetic MFA evidence, no browser/provider/production test.`);
process.exitCode=failures?1:0;
