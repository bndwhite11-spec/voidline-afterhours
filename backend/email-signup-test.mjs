import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createAuthService,authHash} from '../worker/auth.mjs';

// Call the actual production handler. Legacy accounts are seeded explicitly;
// no request wrapper supplies registration proof or removes verified addresses.
const origin='https://email-entry.example',password='A private email signup password 2026';
const tests=[],test=(name,run)=>tests.push([name,run]);

class Adapter{
 constructor(sqlite){this.sqlite=sqlite;this.queue=Promise.resolve();this.beforeRun=null;this.beforeFirst=null;this.beforeBatch=null;}
 prepare(sql){const adapter=this,statement=this.sqlite.prepare(sql);return {bind(...values){return {
  first:async()=>{await adapter.beforeFirst?.(sql,values);return statement.get(...values)||null;},
  all:async()=>({results:statement.all(...values)}),
  run:async()=>{await adapter.beforeRun?.(sql,values);return {success:true,meta:{changes:statement.run(...values).changes}};},
 };}};}
 batch(statements){const task=this.queue.then(async()=>{await this.beforeBatch?.();this.sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.sqlite.exec('COMMIT');return results;}catch(error){this.sqlite.exec('ROLLBACK');throw error;}});this.queue=task.catch(()=>{});return task;}
}

function fixture({mail=true}={}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const entry of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8')).entries)sqlite.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));
 let time=Date.now(),providerFailure=null;const attempts=[],messages=[],db=new Adapter(sqlite);
 const env={DB:db,VOIDLINE_ORIGIN:origin,...(mail?{RESEND_API_KEY:'controlled-mail-provider-key',EMAIL_FROM:'Voidline <accounts@example.test>'}:{})};
 const auth=createAuthService({now:()=>time,fetcher:async(url,options)=>{
  assert.equal(url,'https://api.resend.com/emails');assert.equal(options.method,'POST');assert.equal(options.headers.authorization,'Bearer '+env.RESEND_API_KEY);
  const body=JSON.parse(options.body);attempts.push(body);
  if(providerFailure==='throw')throw Error('Controlled provider connection failure');
  if(providerFailure==='reject')return {ok:false,status:503};
  messages.push(body);return {ok:true,status:200};
 }});
 function browser(){
  const cookies=new Map();let session;
  async function call(path,body,options={}){
   const method=options.method||(body===undefined?'GET':'POST'),headers={accept:'application/json',...(cookies.size?{cookie:[...cookies].map(([key,value])=>key+'='+value).join('; ')}:{})};
   if(body!==undefined)Object.assign(headers,{'content-type':'application/json',origin,'x-voidline-auth':'1','x-voidline-csrf':session?.csrfToken||''});
   Object.assign(headers,options.headers||{});for(const key of options.omitHeaders||[])delete headers[key];
   const response=await auth.handleAuthRequest(new Request(origin+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify({...body,...(session?{expectedAccountId:session.account.id}:{})})})}),env);
   for(const value of response.headers.getSetCookie()){const [name,bearer]=value.split(';')[0].split('=');bearer?cookies.set(name,bearer):cookies.delete(name);}
   const data=await response.json();if(data.account)session=data;return {status:response.status,data,headers:response.headers};
  }
  async function ok(path,body,expected=200,options={}){const result=await call(path,body,options);assert.equal(result.status,expected,path+': '+JSON.stringify(result.data));return result.data;}
  return {call,ok,cookies,get session(){return session;}};
 }
 const token=(kind='signup-email')=>{const match=messages.at(-1)?.text.match(new RegExp('#'+kind+'=([a-f0-9]{64})'));assert.ok(match,'The provider message contains the expected token fragment.');return match[1];};
 const count=table=>sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n;
 async function start(email='person@example.test'){const client=browser(),ack=await client.ok('/api/auth/register/email',{email},202);return {client,ack,token:token()};}
 async function complete(client,proof,username='email_person',extra={}){return client.call('/api/auth/register',{emailToken:proof,username,displayName:'Email Person',password,...extra});}

 return {sqlite,db,env,auth,browser,start,complete,count,token,attempts,messages,advance:ms=>time+=ms,time:()=>time,failProvider:value=>providerFailure=value};
}

test('signup inspection is repeatable, private and read-only even when the mail provider becomes unavailable',async()=>{
 const f=fixture();try{
  const pending=await f.start(' Private.Person@Example.Test '),record=f.sqlite.prepare('SELECT * FROM auth_registration_challenges').get();delete f.env.RESEND_API_KEY;
  for(let attempt=0;attempt<2;attempt++){
   const result=await pending.client.call('/api/auth/register/email/inspect',{emailToken:pending.token});assert.equal(result.status,200,JSON.stringify(result.data));assert.deepEqual(result.data,{email:'private.person@example.test',expiresAt:record.expires_at});assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(result.headers.getSetCookie().length,0);assert.ok(!JSON.stringify(result.data).includes(pending.token));
  }
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM auth_registration_challenges').get(),record);assert.equal(record.token_hash,await authHash(pending.token));assert.equal(pending.client.cookies.size,0);assert.equal(f.count('live_accounts'),0);assert.equal(f.count('auth_credentials'),0);assert.equal(f.count('auth_sessions'),0);assert.equal(f.attempts.length,1);
 }finally{f.sqlite.close();}
});

test('unknown, malformed and expired inspection proofs return the same safe error without leaking an address',async()=>{
 const f=fixture();try{
  const pending=await f.start(),client=f.browser();let firstError;
  for(const emailToken of ['invalid','b'.repeat(64)]){
   const result=await client.call('/api/auth/register/email/inspect',{emailToken});assert.equal(result.status,400);assert.equal(result.data.error.code,'invalid_signup_link');assert.equal(result.headers.getSetCookie().length,0);assert.equal(result.data.email,undefined);assert.ok(!JSON.stringify(result.data).includes('person@example.test'));firstError=result.data;
  }
  f.advance(10*60000);const expired=await client.call('/api/auth/register/email/inspect',{emailToken:pending.token});assert.equal(expired.status,400);assert.deepEqual(expired.data,firstError);assert.equal(f.count('auth_registration_challenges'),1);assert.equal(f.count('live_accounts'),0);assert.equal(f.attempts.length,1);
 }finally{f.sqlite.close();}
});

test('inspection cannot consume a link through GET, a different origin, a missing app header or a non-JSON body',async()=>{
 const f=fixture();try{
  const pending=await f.start(),client=f.browser(),route='/api/auth/register/email/inspect',body={emailToken:pending.token};
  assert.equal((await client.call(route,undefined,{method:'GET'})).status,405);
  assert.equal((await client.call(route,body,{headers:{origin:'https://different.example'}})).status,403);
  assert.equal((await client.call(route,body,{omitHeaders:['x-voidline-auth']})).status,403);
  assert.equal((await client.call(route,body,{headers:{'content-type':'text/plain'}})).status,415);
  const rejected=await client.call(route,body,{headers:{'content-length':'9000'}});assert.equal(rejected.status,413);assert.equal(rejected.headers.getSetCookie().length,0);
  assert.equal(f.count('auth_registration_challenges'),1);assert.equal(f.count('live_accounts'),0);assert.equal((await client.call(route,body)).status,200);assert.equal(f.attempts.length,1);
 }finally{f.sqlite.close();}
});

test('inspection rechecks expiry after awaited rate-limit work instead of trusting request-start time',async()=>{
 const f=fixture();try{
  const pending=await f.start();let advanced=false;
  f.db.beforeFirst=sql=>{if(!sql.startsWith('INSERT INTO auth_rate_limits'))return;f.db.beforeFirst=null;advanced=true;f.advance(10*60000+1);};
  const result=await pending.client.call('/api/auth/register/email/inspect',{emailToken:pending.token});assert.equal(advanced,true);assert.equal(result.status,400);assert.equal(result.data.error.code,'invalid_signup_link');assert.equal(f.count('auth_registration_challenges'),1);assert.equal(f.count('live_accounts'),0);assert.equal(result.headers.getSetCookie().length,0);
 }finally{f.sqlite.close();}
});

test('inspection rate limits repeated bearer checks without consuming proof or sending more mail',async()=>{
 const f=fixture();try{
  const pending=await f.start(),route='/api/auth/register/email/inspect';
  for(let attempt=0;attempt<20;attempt++)assert.equal((await pending.client.call(route,{emailToken:pending.token})).status,200);
  const limited=await pending.client.call(route,{emailToken:pending.token});assert.equal(limited.status,429);assert.equal(limited.data.error.code,'rate_limited');assert.equal(limited.headers.getSetCookie().length,0);assert.equal(f.count('auth_registration_challenges'),1);assert.equal(f.count('live_accounts'),0);assert.equal(f.attempts.length,1);
 }finally{f.sqlite.close();}
});

test('inspection does not consume signup proof and successfully consumed proof cannot reveal the email again',async()=>{
 const f=fixture();try{
  const pending=await f.start();assert.equal((await pending.client.call('/api/auth/register/email/inspect',{emailToken:pending.token})).status,200);
  const created=await f.complete(pending.client,pending.token);assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(f.count('auth_registration_challenges'),0);assert.equal(f.count('live_accounts'),1);
  const consumed=await f.browser().call('/api/auth/register/email/inspect',{emailToken:pending.token});assert.equal(consumed.status,400);assert.equal(consumed.data.error.code,'invalid_signup_link');assert.equal(consumed.data.email,undefined);assert.equal(consumed.headers.getSetCookie().length,0);assert.equal(f.count('live_accounts'),1);
 }finally{f.sqlite.close();}
});

let failed=0;
for(const [name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.stack);}}
console.log(`${tests.length-failed}/${tests.length} signup-inspection checks passed. Actual production handler and migrated SQLite; controlled mail responses, no live delivery claim.`);
process.exitCode=failed?1:0;
