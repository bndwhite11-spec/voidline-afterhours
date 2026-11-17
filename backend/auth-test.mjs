import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPair,SignJWT} from 'jose';
import {createAuthService,authHash,normalizeUsername} from '../worker/auth.mjs';

const keys=await generateKeyPair('RS256'),otherKeys=await generateKeyPair('RS256');
const origin='https://voidline.example',clientId='isolated-client.apps.googleusercontent.com';
const tests=[],test=(name,fn)=>tests.push([name,fn]);
const migrate=db=>{const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));for(const entry of journal.entries)db.exec(readFileSync(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));};
class Adapter{
 constructor(db){this.db=db;}
 prepare(sql){return {bind:(...values)=>{const statement=this.db.prepare(sql);return {first:async()=>statement.get(...values)||null,all:async()=>({results:statement.all(...values)}),run:async()=>({success:true,meta:{changes:statement.run(...values).changes}})};}};}
 async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec('COMMIT');return results;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
function jar(){const values=new Map();return {values,header:()=>[...values].map(([k,v])=>k+'='+v).join('; '),apply(response){for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],split=pair.indexOf('=');if(pair.slice(split+1))values.set(pair.slice(0,split),pair.slice(split+1));else values.delete(pair.slice(0,split));}}};}
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');migrate(sqlite);
 let time=Date.now(),claims={},failExchange=false,exchangeCount=0;
 const env={DB:new Adapter(sqlite),GOOGLE_CLIENT_ID:clientId,GOOGLE_CLIENT_SECRET:'isolated-client-secret',VOIDLINE_ORIGIN:origin};
 const token=async(overrides={},key=keys.privateKey)=>new SignJWT({iss:'https://accounts.google.com',aud:clientId,sub:'stable-subject',iat:Math.floor(time/1000),exp:Math.floor(time/1000)+3600,nonce:'expected-nonce',...overrides}).setProtectedHeader({alg:'RS256',kid:'isolated-key'}).sign(key);
 const auth=createAuthService({keyResolver:keys.publicKey,now:()=>time,fetcher:async(url,options)=>{
  exchangeCount++;assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(options.method,'POST');
  const body=new URLSearchParams(options.body);assert.equal(body.get('client_secret'),env.GOOGLE_CLIENT_SECRET);assert.equal(body.get('redirect_uri'),origin+'/api/auth/google/callback');
  const tx=sqlite.prepare('SELECT * FROM auth_transactions WHERE verifier=?').get(body.get('code_verifier'));assert.ok(tx);assert.ok(tx.consumed_at);
  if(failExchange)return new Response('private error from Google',{status:500});
  return new Response(JSON.stringify({id_token:await token({nonce:tx.nonce,...claims})}),{headers:{'content-type':'application/json'}});
 }});
 const call=async(path,{browser,body,headers={},method}={})=>{
  const request=new Request(origin+path,{method:method||((body===undefined)?'GET':'POST'),headers:{...(browser?{cookie:browser.header()}:{}),...(body!==undefined?{'content-type':'application/json',origin}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const response=await auth.handleAuthRequest(request,env);browser?.apply(response);return response;
 };
 const start=async(browser=jar(),returnTo='/')=>{
  const response=await call('/api/auth/google/start?returnTo='+encodeURIComponent(returnTo),{browser});assert.equal(response.status,303);const url=new URL(response.headers.get('location'));return {browser,url,state:url.searchParams.get('state'),nonce:url.searchParams.get('nonce')};
 };
 const finish=async(flow,overrides={})=>{claims=overrides;return call('/api/auth/google/callback?state='+flow.state+'&code=isolated-authorization-code',{browser:flow.browser});};
 const login=async(subject='stable-subject',browser=jar())=>{const flow=await start(browser),response=await finish(flow,{sub:subject});assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/');const session=await (await call('/api/auth/session',{browser})).json();return {browser,session};};
 const mutation=(account,path,body,extra={})=>call(path,{browser:account.browser,body:{expectedAccountId:account.session.account.id,...body},headers:{'x-voidline-csrf':account.session.csrfToken,...extra}});
 return {sqlite,env,auth,call,start,finish,login,token,mutation,advance:ms=>time+=ms,get time(){return time;},set failExchange(v){failExchange=v;},get exchangeCount(){return exchangeCount;}};
}

test('missing provider credentials report unavailable and never create a fake identity',async()=>{
 const f=fixture();try{delete f.env.GOOGLE_CLIENT_SECRET;const config=await(await f.call('/api/auth/config')).json();assert.equal(config.configured,false);assert.equal(config.encryption.available,false);assert.equal((await f.call('/api/auth/google/start')).status,503);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_accounts').get().n,0);assert.equal((await f.call('/api/auth/session',{headers:{'oai-authenticated-user-id':'pretend-owner'}})).status,401);}finally{f.sqlite.close();}
});

test('OIDC redirect uses only openid, S256 PKCE, nonce and browser-bound state',async()=>{
 const f=fixture();try{const flow=await f.start(jar(),'/#join=opaque-invite');assert.equal(flow.url.origin,'https://accounts.google.com');assert.equal(flow.url.searchParams.get('scope'),'openid');assert.equal(flow.url.searchParams.get('code_challenge_method'),'S256');assert.ok(flow.nonce);assert.ok(flow.state);assert.equal(flow.url.searchParams.get('redirect_uri'),origin+'/api/auth/google/callback');const tx=f.sqlite.prepare('SELECT * FROM auth_transactions').get();assert.equal(tx.return_to,'/#join=opaque-invite');assert.notEqual(tx.state_hash,flow.state);assert.notEqual(tx.browser_hash,flow.browser.values.get('__Host-voidline_oauth'));const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(tx.verifier)));assert.equal(Buffer.from(digest).toString('base64url'),flow.url.searchParams.get('code_challenge'));const cookie=flow.browser.values.get('__Host-voidline_oauth');assert.match(cookie,/^[a-f0-9]{64}$/);}finally{f.sqlite.close();}
});

test('real JWT signature, issuer, audience, expiry, nonce and issuance failures are rejected',async()=>{
 const f=fixture();try{for(const [name,overrides,key]of [
  ['forged signature',{},otherKeys.privateKey],['wrong issuer',{iss:'https://attacker.invalid'}],['wrong audience',{aud:'other-client'}],['expired',{exp:Math.floor(f.time/1000)-60}],['wrong nonce',{nonce:'different'}],['future issuance',{iat:Math.floor(f.time/1000)+90}],['old issuance',{iat:Math.floor(f.time/1000)-700}],['wrong authorized party',{azp:'other-client'}],['ambiguous audiences',{aud:[clientId,'another-client']}]
 ])await assert.rejects(f.auth.verifyGoogleToken(await f.token(overrides,key),f.env,'expected-nonce'),name);
 const valid=await f.auth.verifyGoogleToken(await f.token(),f.env,'expected-nonce');assert.equal(valid.sub,'stable-subject');}finally{f.sqlite.close();}
});

test('Google subject creates one empty account without exposing provider profile data',async()=>{
 const f=fixture();try{const first=await f.login('subject-one');assert.equal(first.session.account.username,null);assert.equal(first.session.account.displayName,'New resident');assert.equal(first.session.account.needsOnboarding,true);assert.equal(first.session.account.email,undefined);for(const table of ['live_memberships','live_messages','live_bookmarks','live_favorites'])assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);await f.login('subject-one');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_accounts').get().n,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_identities').get().n,1);const second=await f.login('subject-two');assert.notEqual(second.session.account.id,first.session.account.id);}finally{f.sqlite.close();}
});

test('callback replay, mismatched browser and expired transactions cannot create sessions',async()=>{
 const f=fixture();try{const flow=await f.start();const wrong=await f.call('/api/auth/google/callback?state='+flow.state+'&code=x',{browser:jar()});assert.match(wrong.headers.get('location'),/auth_error=expired/);assert.equal(f.exchangeCount,0);await f.finish(flow);assert.equal(f.exchangeCount,1);const sessions=f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n;const replay=await f.finish(flow);assert.match(replay.headers.get('location'),/auth_error/);assert.equal(f.exchangeCount,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n,sessions);const expired=await f.start();f.advance(11*60000);const result=await f.finish(expired);assert.match(result.headers.get('location'),/auth_error=expired/);}finally{f.sqlite.close();}
});

test('session cookies are secure host cookies and stored bearer/CSRF values are hashed',async()=>{
 const f=fixture();try{const flow=await f.start(),response=await f.finish(flow);const cookies=response.headers.getSetCookie();assert.ok(cookies.some(v=>v.startsWith('__Host-voidline_session=')&&v.includes('HttpOnly')&&v.includes('Secure')&&v.includes('SameSite=Lax')&&v.includes('Path=/')));const session=await(await f.call('/api/auth/session',{browser:flow.browser})).json(),record=f.sqlite.prepare('SELECT * FROM auth_sessions WHERE id=?').get(session.session.id);assert.notEqual(record.token_hash,flow.browser.values.get('__Host-voidline_session'));assert.equal(record.token_hash,await authHash(flow.browser.values.get('__Host-voidline_session')));assert.equal(record.csrf_hash,await authHash(session.csrfToken));assert.equal(JSON.stringify(record).includes(session.csrfToken),false);}finally{f.sqlite.close();}
});

test('mutations require the session account, exact origin and session-bound CSRF token',async()=>{
 const f=fixture();try{const a=await f.login(),body={username:'night_one',displayName:'Night One'};for(const headers of [{'x-voidline-csrf':'bad'},{origin:'https://attacker.invalid'}, {origin:''}])assert.equal((await f.mutation(a,'/api/auth/onboarding',body,headers)).status,403);assert.equal((await f.mutation(a,'/api/auth/onboarding',{...body,expectedAccountId:'somebody-else'})).status,409);assert.equal((await f.mutation(a,'/api/auth/onboarding',body)).status,200);const b=await f.login('different-user');assert.equal((await f.mutation(b,'/api/auth/onboarding',{username:'other_name',displayName:'Other'}, {'x-voidline-csrf':a.session.csrfToken})).status,403);}finally{f.sqlite.close();}
});

test('onboarding normalizes usernames atomically and enforces reserved and unique names',async()=>{
 const f=fixture();try{assert.equal(normalizeUsername(' Ｎight_One '),'night_one');const a=await f.login('username-a'),b=await f.login('username-b');for(const username of ['admin','system','1name','ab','unsafe.name'])assert.equal((await f.mutation(a,'/api/auth/onboarding',{username,displayName:'Night'})).status,400);const result=await f.mutation(a,'/api/auth/onboarding',{username:' Night_One ',displayName:'Chosen Alias',avatar:'ghost'});assert.equal(result.status,200);const data=await result.json();assert.equal(data.account.username,'night_one');assert.equal(data.account.needsOnboarding,false);assert.equal((await f.mutation(b,'/api/auth/onboarding',{username:'NIGHT_ONE',displayName:'Other'})).status,409);}finally{f.sqlite.close();}
});

test('logout invalidates the actual database session and account switching revokes the old browser session',async()=>{
 const f=fixture();try{const browser=jar(),first=await f.login('switch-a',browser),oldToken=browser.values.get('__Host-voidline_session');await f.login('switch-b',browser);const oldJar=jar();oldJar.values.set('__Host-voidline_session',oldToken);assert.equal((await f.call('/api/auth/session',{browser:oldJar})).status,401);const secondSession=await(await f.call('/api/auth/session',{browser})).json();const second={browser,session:secondSession};assert.equal((await f.mutation(second,'/api/auth/logout',{})).status,200);assert.equal((await f.call('/api/auth/session',{browser})).status,401);assert.equal(f.sqlite.prepare('SELECT revoked_at FROM auth_sessions WHERE id=?').get(first.session.session.id).revoked_at>0,true);}finally{f.sqlite.close();}
});

test('session expiry and revocation require genuine recent reauthentication and remain account scoped',async()=>{
 const f=fixture();try{const a=await f.login('device-a'),aSecond=await f.login('device-a'),b=await f.login('device-b');const devices=await(await f.call('/api/auth/devices',{browser:a.browser})).json();assert.equal(devices.devices.length,2);assert.equal(devices.recovery.available,false);assert.ok(!devices.devices.some(d=>d.id===b.session.session.id));assert.equal((await f.mutation(a,'/api/auth/devices/'+aSecond.session.session.id+'/revoke',{})).status,401);
 const flow=await f.start(a.browser);f.sqlite.prepare('UPDATE auth_transactions SET reauthenticate=1 WHERE state_hash=?').run(await authHash(flow.state));await f.finish(flow,{sub:'device-a',auth_time:Math.floor(f.time/1000)});a.session=await(await f.call('/api/auth/session',{browser:a.browser})).json();assert.equal((await f.mutation(a,'/api/auth/devices/'+aSecond.session.session.id+'/revoke',{})).status,200);assert.equal((await f.call('/api/auth/session',{browser:aSecond.browser})).status,401);assert.equal((await f.mutation(a,'/api/auth/devices/'+b.session.session.id+'/revoke',{})).status,200);assert.equal((await f.call('/api/auth/session',{browser:b.browser})).status,200);f.advance(8*24*60*60000);assert.equal((await f.call('/api/auth/session',{browser:a.browser})).status,401);}finally{f.sqlite.close();}
});

test('fresh reauthentication rejects missing, stale and future auth_time claims',async()=>{
 const f=fixture();try{for(const authTime of [undefined,Math.floor(f.time/1000)-600,Math.floor(f.time/1000)+600]){const flow=await f.start();f.sqlite.prepare('UPDATE auth_transactions SET reauthenticate=1 WHERE state_hash=?').run(await authHash(flow.state));const result=await f.finish(flow,{auth_time:authTime});assert.match(result.headers.get('location'),/auth_error=invalid_response/);}assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n,0);}finally{f.sqlite.close();}
});

test('cancelled consent and provider errors preserve the invite without joining or leaking details',async()=>{
 const f=fixture();try{const flow=await f.start(jar(),'/#join=kept-invite');const cancelled=await f.call('/api/auth/google/callback?state='+flow.state+'&error=access_denied',{browser:flow.browser});assert.equal(cancelled.headers.get('location'),'/?auth_error=cancelled#join=kept-invite');const next=await f.start(jar(),'/#join=kept-invite');f.failExchange=true;const failed=await f.finish(next);assert.equal(failed.headers.get('location'),'/?auth_error=provider_unavailable#join=kept-invite');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM live_memberships').get().n,0);assert.equal((await failed.text()).includes('private error'),false);}finally{f.sqlite.close();}
});

test('external or malformed return locations cannot become an open redirect',async()=>{
 const f=fixture();try{for(const destination of ['//attacker.invalid/','https://attacker.invalid/','/\\attacker.invalid/','/api/auth/google/start']){const flow=await f.start(jar(),destination);const result=await f.finish(flow);assert.equal(result.headers.get('location'),'/');}}finally{f.sqlite.close();}
});

test('authentication start rate limits are enforced without storing raw network addresses',async()=>{
 const f=fixture();try{for(let n=0;n<10;n++)assert.equal((await f.call('/api/auth/google/start',{headers:{'cf-connecting-ip':'192.0.2.5'}})).status,303);assert.equal((await f.call('/api/auth/google/start',{headers:{'cf-connecting-ip':'192.0.2.5'}})).status,429);assert.equal(JSON.stringify(f.sqlite.prepare('SELECT * FROM auth_rate_limits').all()).includes('192.0.2.5'),false);}finally{f.sqlite.close();}
});

let failed=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`${tests.length-failed}/${tests.length} Google/session checks passed. Locally signed JWTs and SQLite; no real Google login claimed.`);process.exitCode=failed?1:0;
