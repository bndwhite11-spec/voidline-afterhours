/** User-verifying WebAuthn step-up. Public keys, never private keys, enter D1. */
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
import {authenticate,validateSessionMutation,authRateLimit,AuthError} from './auth.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const need=(value,status,code,message)=>{if(!value)throw new AuthError(status,code,message);};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
function sameOriginClient(response){
 try{const value=JSON.parse(new TextDecoder().decode(decode(response?.response?.clientDataJSON||'')));need(value.crossOrigin!==true&&!value.topOrigin,400,'passkey_invalid','Use a passkey directly from the Voidline address.');}
 catch(error){if(error instanceof AuthError)throw error;throw new AuthError(400,'passkey_invalid','The passkey client response could not be read.');}
}
const transports=value=>{try{const result=JSON.parse(value);return Array.isArray(result)?result.filter(x=>['ble','cable','hybrid','internal','nfc','smart-card','usb'].includes(x)):[];}catch{return [];}};
export function requireRecentPasskey(user,time=Date.now()){
 need(user?.reauthenticatedAt>time-10*60000,401,'reauthentication_required','Confirm your password before this sensitive action.');
 need(user?.session?.mfa_verified_at>time-5*60000,401,'passkey_required','Verify your passkey before this sensitive action.');
}
async function readBody(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 const reader=request.body?.getReader();need(reader,400,'invalid_body','A request body is required.');let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new AuthError(413,'body_too_large','The verification response is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The verification response could not be read.');}
 need(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_body','Use a JSON object.');return body;
}
function originFor(request,env){
 const actual=new URL(request.url);let expected=actual.origin;
 if(env?.VOIDLINE_ORIGIN){const configured=new URL(env.VOIDLINE_ORIGIN);need(configured.protocol==='https:'&&configured.origin===String(env.VOIDLINE_ORIGIN).replace(/\/$/,''),503,'origin_unconfigured','The secure account origin is not configured correctly.');expected=configured.origin;}
 need(actual.protocol==='https:'&&actual.origin===expected,403,'origin_denied','Use the configured Voidline address.');return {origin:expected,rpId:actual.hostname};
}
export function createPasskeyService({now=()=>Date.now(),registrationOptions=generateRegistrationOptions,verifyRegistration=verifyRegistrationResponse,authenticationOptions=generateAuthenticationOptions,verifyAuthentication=verifyAuthenticationResponse}={}){
 async function list(db,accountId){const rows=(await q(db,'SELECT id,name,created_at,last_used_at FROM account_passkeys WHERE account_id=? ORDER BY created_at,id',accountId).all()).results;return rows.map(row=>({id:row.id,name:row.name,createdAt:row.created_at,lastUsedAt:row.last_used_at}));}
 async function challenge(db,user,kind,options,identity,time){
  const id=crypto.randomUUID();await q(db,'DELETE FROM passkey_challenges WHERE expires_at<?',time).run();
  await q(db,'INSERT INTO passkey_challenges(id,account_id,session_id,kind,challenge,origin,rp_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)',id,user.id,user.sessionId,kind,options.challenge,identity.origin,identity.rpId,time,time+5*60000).run();
  return {challengeId:id,options};
 }
 async function consume(db,user,id,kind,time,identity){
  need(typeof id==='string'&&id.length<=100,400,'challenge_unavailable','Start verification again.');
  const row=await q(db,'SELECT * FROM passkey_challenges WHERE id=? AND account_id=? AND session_id=? AND kind=?',id,user.id,user.sessionId,kind).first();
  need(row&&!row.consumed_at&&row.expires_at>time&&row.origin===identity.origin&&row.rp_id===identity.rpId,400,'challenge_unavailable','This verification expired or was already used. Start again.');
  const result=await q(db,'UPDATE passkey_challenges SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND expires_at>?',time,id,time).run();
  need(result.meta?.changes===1,400,'challenge_replayed','This verification was already used. Start again.');return row;
 }
 async function handlePasskeyRequest(request,env){
  try{
   const url=new URL(request.url),path=url.pathname.replace(/^\/api\/security\/passkeys\/?/,'').split('/').filter(Boolean);
   need(url.pathname==='/api/security/passkeys'||url.pathname.startsWith('/api/security/passkeys/'),404,'not_found','No security action matches this request.');
   const user=await authenticate(request,env),db=env.DB,time=now(),identity=originFor(request,env);
   if(path.length===0&&request.method==='GET')return json({passkeys:await list(db,user.id),recent:(user.session.mfa_verified_at||0)>time-5*60000});
   need(request.method==='POST',405,'method_not_allowed','This security action requires a POST request.');
   const body=await readBody(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'passkeys',20,time,user.id);
   const keys=(await q(db,'SELECT * FROM account_passkeys WHERE account_id=? ORDER BY created_at,id',user.id).all()).results;
   if(path[0]==='register'){
    need(user.reauthenticatedAt>time-10*60000,401,'reauthentication_required','Confirm your password before adding a passkey.');
    const owner=await q(db,'SELECT account_id FROM platform_owner WHERE id=1',).first();
    if(owner?.account_id===user.id&&keys.length)requireRecentPasskey(user,time);
    need(keys.length<10,409,'passkey_limit','Remove an unused passkey before adding another.');
    if(path.length===2&&path[1]==='options'){
     const account=await q(db,'SELECT username,display_name FROM live_accounts WHERE id=?',user.id).first();
     const options=await registrationOptions({rpName:'VOIDLINE: AFTERHOURS',rpID:identity.rpId,userID:new TextEncoder().encode(user.id),userName:account.username||user.id,userDisplayName:account.display_name,attestationType:'none',timeout:120000,authenticatorSelection:{residentKey:'preferred',userVerification:'required'},excludeCredentials:keys.map(key=>({id:key.id,transports:transports(key.transports)})),supportedAlgorithmIDs:[-7,-257,-8]});
     return json(await challenge(db,user,'register',options,identity,time));
    }
    if(path.length===2&&path[1]==='verify'){
     const expected=await consume(db,user,body.challengeId,'register',time,identity);
     sameOriginClient(body.response);
     let result;try{result=await verifyRegistration({response:body.response,expectedChallenge:expected.challenge,expectedOrigin:identity.origin,expectedRPID:identity.rpId,requireUserPresence:true,requireUserVerification:true,supportedAlgorithmIDs:[-7,-257,-8]});}catch{throw new AuthError(400,'passkey_invalid','The passkey could not be verified. Start again.');}
     need(result.verified&&result.registrationInfo?.userVerified,400,'passkey_invalid','The authenticator did not verify your presence and identity.');
     const credential=result.registrationInfo.credential,name=typeof body.name==='string'?body.name.trim().slice(0,60):'Passkey';
     need(credential?.id&&credential.publicKey instanceof Uint8Array,400,'passkey_invalid','The authenticator did not return a valid credential.');
     try{
      const inserted=await q(db,"INSERT INTO account_passkeys(id,account_id,public_key,counter,transports,name,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active') AND (SELECT COUNT(*) FROM account_passkeys WHERE account_id=?)<10 AND (NOT EXISTS(SELECT 1 FROM platform_owner WHERE account_id=?) OR NOT EXISTS(SELECT 1 FROM account_passkeys WHERE account_id=?) OR EXISTS(SELECT 1 FROM auth_sessions WHERE id=? AND mfa_verified_at>?))",credential.id,user.id,encode(credential.publicKey),credential.counter,JSON.stringify(Array.isArray(credential.transports)?credential.transports:[]),name||'Passkey',time,user.sessionId,user.id,time,user.id,user.id,user.id,user.sessionId,time-5*60000).run();
      need(inserted.meta?.changes===1,401,'sign_in_required','Your session changed. Log in again.');
     }catch(error){if(error instanceof AuthError)throw error;throw new AuthError(409,'passkey_exists','This passkey is already registered.');}
     return json({registered:true,passkeys:await list(db,user.id)});
    }
   }
   if(path[0]==='authenticate'){
    need(keys.length,409,'passkey_missing','Add a passkey before using passkey verification.');
    if(path.length===2&&path[1]==='options'){
     const options=await authenticationOptions({rpID:identity.rpId,userVerification:'required',timeout:120000,allowCredentials:keys.map(key=>({id:key.id,transports:transports(key.transports)}))});
     return json(await challenge(db,user,'authenticate',options,identity,time));
    }
    if(path.length===2&&path[1]==='verify'){
     const expected=await consume(db,user,body.challengeId,'authenticate',time,identity),key=keys.find(item=>item.id===body.response?.id);
     need(key,400,'passkey_invalid','This passkey is not registered to the current account.');
     sameOriginClient(body.response);
     let result;try{result=await verifyAuthentication({response:body.response,expectedChallenge:expected.challenge,expectedOrigin:identity.origin,expectedRPID:identity.rpId,requireUserVerification:true,credential:{id:key.id,publicKey:decode(key.public_key),counter:key.counter,transports:transports(key.transports)}});}catch{throw new AuthError(400,'passkey_invalid','The passkey assertion could not be verified. Start again.');}
     need(result.verified&&result.authenticationInfo?.userVerified,400,'passkey_invalid','The authenticator did not verify your identity.');
     const changed=await db.batch([
      q(db,'UPDATE account_passkeys SET counter=?,last_used_at=? WHERE id=? AND account_id=? AND counter=?',result.authenticationInfo.newCounter,time,key.id,user.id,key.counter),
      q(db,"UPDATE auth_sessions SET mfa_verified_at=? WHERE id=? AND account_id=? AND revoked_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM live_accounts WHERE id=? AND account_status='active') AND EXISTS(SELECT 1 FROM account_passkeys WHERE id=? AND account_id=? AND counter=? AND last_used_at=?)",time,user.sessionId,user.id,time,user.id,key.id,user.id,result.authenticationInfo.newCounter,time)
     ]);
     need(changed[0]?.meta?.changes===1&&changed[1]?.meta?.changes===1,409,'passkey_changed','Your session or credential changed. Start verification again.');
     return json({verified:true,mfaVerifiedAt:time,session:{id:user.sessionId,mfaVerifiedAt:time}});
    }
   }
   if(path.length===2&&path[0]==='remove'){
    requireRecentPasskey(user,time);const owner=await q(db,'SELECT account_id FROM platform_owner WHERE id=1').first();
    need(owner?.account_id!==user.id||keys.length>1,409,'last_owner_passkey','The owner must retain at least one passkey. Use infrastructure recovery if the last key is lost.');
    const removed=await q(db,"DELETE FROM account_passkeys WHERE id=? AND account_id=? AND (NOT EXISTS(SELECT 1 FROM platform_owner WHERE account_id=?) OR (SELECT COUNT(*) FROM account_passkeys WHERE account_id=?)>1) AND EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.reauthenticated_at>? AND s.mfa_verified_at>? AND a.account_status='active')",path[1],user.id,user.id,user.id,user.sessionId,user.id,time,time-10*60000,time-5*60000).run();
    need(removed.meta?.changes===1,409,'passkey_changed','The passkey or security session changed. Verify your remaining passkey and try again.');
    await q(db,'UPDATE auth_sessions SET mfa_verified_at=0 WHERE account_id=?',user.id).run();
    return json({removed:true,passkeys:await list(db,user.id)});
   }
   throw new AuthError(404,'not_found','No security action matches this request.');
  }catch(error){return json({error:{code:error instanceof AuthError?error.code:'security_unavailable',message:error instanceof AuthError?error.message:'The security action could not complete. Try again.'}},error instanceof AuthError?error.status:503);}
 }
 return {handlePasskeyRequest};
}
export const handlePasskeyRequest=createPasskeyService().handlePasskeyRequest;
