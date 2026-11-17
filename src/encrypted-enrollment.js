/* Native-password unlock for a dedicated Matrix device. Login credentials and
 * usable Matrix tokens never enter ordinary browser storage. */
import {openVault,indexedDBStorage} from './secure-vault.js';
const encoder=new TextEncoder(),ITERATIONS=600000;
const fail=(code,message)=>Object.assign(new Error(message),{code});
const hex=value=>Array.from(value,n=>n.toString(16).padStart(2,'0')).join('');
const namespace=(accountId,homeserver)=>'voidline.enrollment.v1.'+encodeURIComponent([accountId,homeserver].join('|'));
function origin(value){try{const url=new URL(value);return url.protocol==='https:'&&url.pathname==='/'&&!url.username&&!url.password&&!url.search&&!url.hash?url.origin:null;}catch{return null;}}
function checkConfig(config){if(!config?.configured||config.provider!=='synapse-jwt'||!origin(config.homeserver)||typeof config.serverName!=='string')throw fail('VOID_ENROLLMENT_UNAVAILABLE','Encrypted account enrollment is not configured. Standard messaging remains a separate choice.');if(config.nativePasswordAvailable===false)throw fail('VOID_NATIVE_PASSWORD_REQUIRED','Add an account password before using this device-unlock method. Google authentication alone does not recover encryption keys.');}
export async function getEncryptedEnrollmentStatus({request}={}){if(typeof request!=='function')throw fail('VOID_ENROLLMENT_UNAVAILABLE','The account service is unavailable.');return request('/api/encryption/config');}
async function deriveStoragePassword(password,seed,accountId,homeserver,crypto){
 const materialBytes=encoder.encode(password),salt=encoder.encode('VOIDLINE encrypted device unlock v1|'+accountId+'|'+homeserver+'|'+seed);let derived;
 try{const material=await crypto.subtle.importKey('raw',materialBytes,'PBKDF2',false,['deriveBits']);derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,256));return hex(derived);}finally{materialBytes.fill(0);salt.fill(0);derived?.fill(0);}
}
function dependencies(injected={}){let storage;try{storage=globalThis.localStorage;}catch{}return {crypto:globalThis.crypto,indexedDB:globalThis.indexedDB,storage,locks:globalThis.navigator?.locks,fetcher:(...args)=>fetch(...args),...injected};}
const pointerKey=(accountId,homeserver)=>'voidline.enrollment.pointer.v2.'+encodeURIComponent([accountId,homeserver].join('|'));
function validGeneration(value,base){return typeof value==='string'&&value.startsWith(base+'.v2.')&&/^[a-f0-9-]{36}$/i.test(value.slice((base+'.v2.').length));}
async function unlockEnvelope({accountId,homeserver,password,deps,create=false}){
 const store=indexedDBStorage(deps.indexedDB),base=namespace(accountId,homeserver),key=pointerKey(accountId,homeserver);let vault,wrapperPassword='';
 try{
  const seedKey='voidline.enrollment.seed.v1.'+encodeURIComponent([accountId,homeserver].join('|'));let seed=deps.storage.getItem(seedKey);
  if(seed!==null&&!/^[a-f0-9]{64}$/.test(seed))throw fail('VOID_ENROLLMENT_STORAGE','The device-unlock seed is invalid. Existing encrypted data was not replaced.');
  if(seed===null){if(!create&&(await store.keys(base+'|')).length===0&&!await store.get(key)){store.close();return null;}seed=hex(deps.crypto.getRandomValues(new Uint8Array(32)));deps.storage.setItem(seedKey,seed);}
  wrapperPassword=await deriveStoragePassword(password,seed,accountId,homeserver,deps.crypto);
  const pointer=await store.get(key);
  if(pointer&&(pointer.version!==2||!validGeneration(pointer.active,base)||(pointer.pending&&!validGeneration(pointer.pending,base))))throw fail('VOID_ENROLLMENT_STORAGE','The device credential index is invalid. Existing data was not replaced.');
  const candidates=pointer?[pointer.active,pointer.pending].filter(Boolean):[base];let lastError;
  for(const candidate of candidates){
   if(!await store.get(candidate+'|$metadata'))continue;
   try{vault=await openVault({namespace:candidate,password:wrapperPassword,indexedDB:deps.indexedDB,crypto:deps.crypto});const session=await vault.get('session');
    if(session&&candidate!==base&&(!/^[a-f0-9]{64}$/.test(session.cryptoStoragePassword||'')||session.envelopeVersion!==2))throw fail('VOID_ENROLLMENT_STORAGE','This encrypted credential format is incomplete. Existing keys were not reset.');
    return {store,vault,session,storagePassword:session?.cryptoStoragePassword||(session?wrapperPassword:hex(deps.crypto.getRandomValues(new Uint8Array(32)))),wrapperPassword,base,key,pointer,active:candidate};
   }catch(error){vault?.close();vault=null;lastError=error;}
  }
  if(lastError)throw lastError;
  if(pointer)throw fail('VOID_ENROLLMENT_STORAGE','Saved device credentials are missing. Use a deliberate new-device and recovery flow.');
  if(!create){store.close();return null;}
  const active=base+'.v2.'+deps.crypto.randomUUID();vault=await openVault({namespace:active,password:wrapperPassword,indexedDB:deps.indexedDB,crypto:deps.crypto});
  return {store,vault,session:null,storagePassword:hex(deps.crypto.getRandomValues(new Uint8Array(32))),wrapperPassword,base,key,pointer:null,active};
 }catch(error){store.close();vault?.close();throw error;}
}
async function saveEnvelope(envelope,session,deps){
 let {vault,active,base,store,key}=envelope;
 if(active===base){active=base+'.v2.'+deps.crypto.randomUUID();const next=await openVault({namespace:active,password:envelope.wrapperPassword,indexedDB:deps.indexedDB,crypto:deps.crypto});vault.close();envelope.vault=vault=next;envelope.active=active;}
 await vault.put('session',{...session,envelopeVersion:2,cryptoStoragePassword:envelope.storagePassword});
 const obsolete=(await store.keys(base+'|')).concat(envelope.pointer?.pending&&envelope.pointer.pending!==active?await store.keys(envelope.pointer.pending+'|'):[]);
 if(envelope.pointer?.active&&envelope.pointer.active!==active)obsolete.push(...await store.keys(envelope.pointer.active+'|'));
 await store.batch({put:[[key,{version:2,active}]],remove:obsolete});envelope.pointer={version:2,active};
}
// Prepare before changing the server credential. Both generations remain encrypted;
// a crash after server success can resume with the pending generation on next unlock.
export async function prepareEncryptedPasswordChange({accountId,currentPassword,newPassword,request,isCurrent=()=>true}={},injected={}){
 const deps=dependencies(injected);if(!accountId||typeof request!=='function'||typeof currentPassword!=='string'||typeof newPassword!=='string'||newPassword.length<12||newPassword.length>128)throw fail('VOID_PASSWORD_CHANGE','Confirm the current and new account passwords.');
 const reported=await getEncryptedEnrollmentStatus({request}),config={...reported,homeserver:reported?.homeserver||reported?.credentialHomeserver};if(!isCurrent())throw fail('VOID_ACCOUNT_CHANGED','The account changed before password migration.');if(!config?.homeserver)return {skipped:true,commit:async()=>({migrated:false}),abort:async()=>{}};
 const lockName=namespace(accountId,config.homeserver)+'.enrollment';if(!deps.locks?.request)throw fail('VOID_ENROLLMENT_BROWSER','This browser cannot safely coordinate the password migration.');
 let release,settled=false,envelope,pending,pendingVault;const held=new Promise(resolve=>{release=resolve;}),ready={};ready.promise=new Promise((resolve,reject)=>{ready.resolve=resolve;ready.reject=reject;});
 const lockJob=deps.locks.request(lockName,{mode:'exclusive',ifAvailable:true},async lock=>{
  try{
   if(!lock)throw fail('VOID_DEVICE_IN_USE','Another tab is changing encrypted credentials. Finish there first.');
   if(!isCurrent())throw fail('VOID_ACCOUNT_CHANGED','The account changed before password migration.');
   envelope=await unlockEnvelope({accountId,homeserver:config.homeserver,password:currentPassword,deps});if(!isCurrent())throw fail('VOID_ACCOUNT_CHANGED','The account changed before password migration.');
   if(!envelope?.session){ready.resolve({skipped:true,commit:async()=>({migrated:false}),abort:async()=>{}});return;}
   // A previous request may have changed the native password while its reply
   // was lost, leaving active-old and pending-new wrappers. Verify the native
   // credential BEFORE normalization can remove either encrypted generation.
   const proof=await request('/api/auth/reauthenticate',{password:currentPassword});currentPassword='';if(!isCurrent())throw fail('VOID_ACCOUNT_CHANGED','The account changed before password migration.');
   if(proof?.reauthenticated!==true)throw fail('VOID_NATIVE_PASSWORD_REQUIRED','The account service did not confirm the current password. Existing encrypted credentials were preserved.');
   // Upgrade the legacy wrapper without changing the Rust crypto-store key.
   await saveEnvelope(envelope,envelope.session,deps);pending=envelope.base+'.v2.'+deps.crypto.randomUUID();
   const seed=deps.storage.getItem('voidline.enrollment.seed.v1.'+encodeURIComponent([accountId,config.homeserver].join('|')));
   const nextWrapper=await deriveStoragePassword(newPassword,seed,accountId,config.homeserver,deps.crypto);newPassword='';
   pendingVault=await openVault({namespace:pending,password:nextWrapper,indexedDB:deps.indexedDB,crypto:deps.crypto});
   await pendingVault.put('session',{...envelope.session,envelopeVersion:2,cryptoStoragePassword:envelope.storagePassword});pendingVault.close();pendingVault=null;
   await envelope.store.put(envelope.key,{version:2,active:envelope.active,pending});if(!isCurrent())throw fail('VOID_ACCOUNT_CHANGED','The account changed. Existing encrypted credentials were preserved.');
   const retain=async()=>{if(!settled){settled=true;release();}return {migrated:false,prepared:true};};
   const finish=async committed=>{if(settled)throw fail('VOID_PASSWORD_CHANGE','This password migration has already finished.');if(!isCurrent()&&committed){await retain();throw fail('VOID_ACCOUNT_CHANGED','The account changed. The prepared encrypted credentials were retained for recovery.');}
    const remove=await envelope.store.keys((committed?envelope.active:pending)+'|');await envelope.store.batch({put:[[envelope.key,{version:2,active:committed?pending:envelope.active}]],remove});settled=true;release();return {migrated:committed};};
   ready.resolve({skipped:false,commit:()=>finish(true),abort:()=>finish(false),retain});await held;
  }catch(error){ready.reject(error);}finally{currentPassword='';newPassword='';pendingVault?.close();envelope?.vault?.close();envelope?.store?.close();}
 });lockJob.catch(ready.reject);return ready.promise;
}
async function remoteIdentity(homeserver,accessToken,fetcher){
 const response=await fetcher(homeserver+'/_matrix/client/v3/account/whoami',{method:'GET',redirect:'error',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000),headers:{accept:'application/json',authorization:'Bearer '+accessToken}});
 if(!response.ok)throw fail(response.status===401?'VOID_ENROLLMENT_EXPIRED':'VOID_ENROLLMENT_CONNECTION',response.status===401?'This encrypted device session expired. Enroll a new device deliberately; old encrypted keys have not been reset.':'The encrypted service could not verify this device. Retry after reconnecting.');return response.json();
}
async function revokeFresh(homeserver,accessToken,fetcher){try{const response=await fetcher(homeserver+'/_matrix/client/v3/logout',{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000),headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},body:'{}'});return response.ok?'confirmed':'unknown';}catch{return 'unknown';}}
export async function clearEncryptedEnrollment({accountId,homeserver}={},injected={}){
 if(typeof accountId!=='string'||!origin(homeserver))return false;
 const storage=indexedDBStorage(injected.indexedDB||globalThis.indexedDB);
 try{const base=namespace(accountId,homeserver),pointer=await storage.get(pointerKey(accountId,homeserver)),remove=[base+'|session'];for(const candidate of [pointer?.active,pointer?.pending])if(validGeneration(candidate,base))remove.push(...await storage.keys(candidate+'|'));await storage.batch({remove:[...remove,pointerKey(accountId,homeserver)]});return true;}finally{storage.close();}
}
export async function enrollEncryptedMessaging({accountId,password,request,createSecureMessenger,onState=()=>{},onReauthenticated=()=>{},isCurrent,deviceName='Voidline browser',replaceLocalEnrollment=false}={},injected={}){
 const deps=dependencies(injected);
 if(typeof accountId!=='string'||!accountId||typeof request!=='function'||typeof createSecureMessenger!=='function'||typeof isCurrent!=='function')throw fail('VOID_ENROLLMENT_ACCOUNT','Sign into the intended account before enrolling encrypted messaging.');
 if(typeof password!=='string'||password.length<12||password.length>128)throw fail('VOID_NATIVE_PASSWORD_REQUIRED','Confirm your ordinary Voidline account password to unlock this browser device.');
 if(!deps.crypto?.subtle||!deps.crypto?.getRandomValues||!deps.indexedDB||!deps.storage||!deps.locks?.request)throw fail('VOID_ENROLLMENT_BROWSER','This browser cannot safely protect and coordinate its encrypted device. Use a browser with WebCrypto, IndexedDB and Web Locks.');
 const current=()=>{if(!isCurrent())throw fail('VOID_ACCOUNT_CHANGED','The signed-in account changed. Encrypted enrollment was stopped.');};
 let vault=null,envelope=null,session=null,created=false,persisted=false,messenger=null,connected=false,storagePassword='',configuredHome=null;
 try{
  current();const config=await getEncryptedEnrollmentStatus({request});current();checkConfig(config);configuredHome=config.homeserver;
  onState({phase:'confirming',message:'Confirming this account.'});const proof=await request('/api/auth/reauthenticate',{password});current();if(proof?.reauthenticated!==true)throw fail('VOID_NATIVE_PASSWORD_REQUIRED','The account service did not confirm this password.');onReauthenticated(proof);
  return await deps.locks.request(namespace(accountId,config.homeserver)+'.enrollment',{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock)throw fail('VOID_DEVICE_IN_USE','Encrypted enrollment is already open in another tab. Finish or close it there first.');current();
   if(replaceLocalEnrollment)await clearEncryptedEnrollment({accountId,homeserver:config.homeserver},deps);
   envelope=await unlockEnvelope({accountId,homeserver:config.homeserver,password,deps,create:true});password='';current();
   vault=envelope.vault;storagePassword=envelope.storagePassword;session=envelope.session;current();
   const expected='@v_'+hex(new Uint8Array(await deps.crypto.subtle.digest('SHA-256',encoder.encode(accountId))))+':'+config.serverName;current();
   if(session){
    if(session.accountId!==accountId||session.homeserver!==config.homeserver||session.userId!==expected||typeof session.deviceId!=='string'||typeof session.accessToken!=='string')throw fail('VOID_ENROLLMENT_IDENTITY','The saved encrypted device does not match this account. It was not connected.');
    onState({phase:'unlocking',message:'Unlocking this encrypted device.'});const identity=await remoteIdentity(config.homeserver,session.accessToken,deps.fetcher);current();if(identity.user_id!==expected||identity.device_id!==session.deviceId)throw fail('VOID_ENROLLMENT_IDENTITY','The saved encrypted token identifies a different account or device.');
   }else{
    onState({phase:'enrolling',message:'Enrolling a dedicated encrypted device.'});session=await request('/api/encryption/enroll',{clientId:deps.crypto.randomUUID(),deviceName});created=true;current();
    if(session.accountId!==accountId||session.homeserver!==config.homeserver||session.userId!==expected||typeof session.deviceId!=='string'||!session.deviceId||typeof session.accessToken!=='string'||!session.accessToken)throw fail('VOID_ENROLLMENT_IDENTITY','The encrypted service returned a device for a different account.');
    await saveEnvelope(envelope,{accountId,homeserver:config.homeserver,userId:session.userId,deviceId:session.deviceId,accessToken:session.accessToken},deps);vault=envelope.vault;persisted=true;current();
   }
   if(!created){await saveEnvelope(envelope,session,deps);vault=envelope.vault;current();}
   messenger=createSecureMessenger({onState});if(!messenger?.connect)throw fail('VOID_ENROLLMENT_CONNECTION','The encrypted client could not initialize.');
   await messenger.connect({homeserver:config.homeserver,accountId,accessToken:session.accessToken,storagePassword,expectedUserId:expected,expectedDeviceId:session.deviceId});current();connected=true;
   const wrapped=Object.freeze({...messenger,async disconnect(options={}){const result=await messenger.disconnect(options);if(options.revokeSession===true&&(result?.revocation?.status==='confirmed'||result?.revocation==='confirmed'))await clearEncryptedEnrollment({accountId,homeserver:config.homeserver},deps);return result;}});
   return {messenger:wrapped,session:{userId:session.userId,deviceId:session.deviceId,homeserver:config.homeserver},resumed:!created};
  });
 }catch(error){
  if(error.code==='VOID_DEVICE_IN_USE'&&messenger?.requestWriterHandoff)error.requestWriterHandoff=()=>messenger.requestWriterHandoff();
  if(messenger&&!connected){try{await messenger.disconnect({revokeSession:false});}catch{}}
  if(created&&session?.accessToken&&(!persisted||!isCurrent())){const revocation=await revokeFresh(configuredHome,session.accessToken,deps.fetcher);if(revocation==='confirmed'&&persisted&&vault){try{await vault.remove('session');}catch{}}if(revocation==='unknown'){error.revocation='unknown';error.message+=' Remote device revocation could not be confirmed. Use a trusted device or service operator to review it before retrying.';}}
  throw error;
 }finally{password='';storagePassword='';session=null;vault?.close();envelope?.store?.close();}
}
