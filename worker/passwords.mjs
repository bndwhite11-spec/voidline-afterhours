/** Maintained Argon2id implementation; password bytes never leave this server. */
import {argon2idAsync} from '@noble/hashes/argon2.js';
const encoder=new TextEncoder();
export const ARGON_ALGORITHM='argon2id-v19-m19456-t2-p1';
export const ARGON_PARAMETERS=Object.freeze({m:19456,t:2,p:1,dkLen:32,asyncTick:8});
const DUMMY_SALT='a8df45ee43ac2dc98af0915ad32e06fba8df45ee43ac2dc98af0915ad32e06fb';
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
const unhex=value=>Uint8Array.from(value.match(/.{2}/g)||[],byte=>parseInt(byte,16));
const hex=bytes=>Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
// Keep only scalar admission state across requests. workerd can cancel a
// continuation whose Promise was stored by one request and settled by another.
const MAX_PASSWORD_HASHES=2;
let activeHashes=0;
export function equalHash(left,right){if(typeof left!=='string'||typeof right!=='string'||left.length!==64||right.length!==64)return false;let mismatch=0;for(let i=0;i<64;i++)mismatch|=left.charCodeAt(i)^right.charCodeAt(i);return mismatch===0;}
export async function hashPassword(password,salt=random()){
 if(!/^[a-f0-9]{64}$/.test(salt))throw new Error('Invalid password salt.');
 if(activeHashes>=MAX_PASSWORD_HASHES){
  const error=new Error('Account verification is busy. Please retry shortly.');
  error.status=503;error.code='authentication_busy';throw error;
 }
 const bytes=encoder.encode(password);
 activeHashes++;
 try{
  const output=await argon2idAsync(bytes,unhex(salt),ARGON_PARAMETERS);
  try{return {hash:hex(output),salt,iterations:2,algorithm:ARGON_ALGORITHM};}
  finally{output.fill(0);}
 }finally{activeHashes--;bytes.fill(0);}
}
export async function passwordMatches(password,credential){
 const bounded=typeof password==='string'&&password.length<=128&&encoder.encode(password).length<=512?password:'';
 const saltValid=/^[a-f0-9]{64}$/.test(credential?.salt||'');
 if(saltValid&&credential.algorithm==='pbkdf2-sha256'&&credential.iterations===100000){
  const key=await crypto.subtle.importKey('raw',encoder.encode(bounded),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(credential.salt),iterations:100000,hash:'SHA-256'},key,256);
  const matches=bounded.length>0&&equalHash(hex(new Uint8Array(bits)),credential.password_hash);
  // Failed legacy records should not skip the current authentication cost.
  // Success immediately performs a real Argon2id migration in the caller.
  if(!matches)await hashPassword(bounded,DUMMY_SALT);
  return matches;
 }
 const valid=credential?.algorithm===ARGON_ALGORITHM&&credential.iterations===2&&saltValid;
 // Unknown identities still pay the current hash cost. Invalid storage params
 // cannot select arbitrary memory/work factors.
 const computed=await hashPassword(bounded,valid?credential.salt:DUMMY_SALT);
 return !!valid&&bounded.length>0&&equalHash(computed.hash,credential.password_hash);
}
