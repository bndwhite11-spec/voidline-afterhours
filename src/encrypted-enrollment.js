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
async function remoteIdentity(homeserver,accessToken,fetcher){
 const response=await fetcher(homeserver+'/_matrix/client/v3/account/whoami',{method:'GET',redirect:'error',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000),headers:{accept:'application/json',authorization:'Bearer '+accessToken}});
 if(!response.ok)throw fail(response.status===401?'VOID_ENROLLMENT_EXPIRED':'VOID_ENROLLMENT_CONNECTION',response.status===401?'This encrypted device session expired. Enroll a new device deliberately; old encrypted keys have not been reset.':'The encrypted service could not verify this device. Retry after reconnecting.');return response.json();
}
async function revokeFresh(homeserver,accessToken,fetcher){try{const response=await fetcher(homeserver+'/_matrix/client/v3/logout',{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000),headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},body:'{}'});return response.ok?'confirmed':'unknown';}catch{return 'unknown';}}
export async function clearEncryptedEnrollment({accountId,homeserver}={},injected={}){
 if(typeof accountId!=='string'||!origin(homeserver))return false;
 const storage=indexedDBStorage(injected.indexedDB||globalThis.indexedDB);
 try{await storage.remove(namespace(accountId,homeserver)+'|session');return true;}finally{storage.close();}
}
export async function enrollEncryptedMessaging({accountId,password,request,createSecureMessenger,onState=()=>{},onReauthenticated=()=>{},isCurrent,deviceName='Voidline browser',replaceLocalEnrollment=false}={},injected={}){
 let browserStorage;try{browserStorage=globalThis.localStorage;}catch{/* Blocked browser storage remains a recoverable unavailable state. */}
 const deps={crypto:globalThis.crypto,indexedDB:globalThis.indexedDB,storage:browserStorage,locks:globalThis.navigator?.locks,fetcher:(...args)=>fetch(...args),...injected};
 if(typeof accountId!=='string'||!accountId||typeof request!=='function'||typeof createSecureMessenger!=='function'||typeof isCurrent!=='function')throw fail('VOID_ENROLLMENT_ACCOUNT','Sign into the intended account before enrolling encrypted messaging.');
 if(typeof password!=='string'||password.length<12||password.length>128)throw fail('VOID_NATIVE_PASSWORD_REQUIRED','Confirm your ordinary Voidline account password to unlock this browser device.');
 if(!deps.crypto?.subtle||!deps.crypto?.getRandomValues||!deps.indexedDB||!deps.storage||!deps.locks?.request)throw fail('VOID_ENROLLMENT_BROWSER','This browser cannot safely protect and coordinate its encrypted device. Use a browser with WebCrypto, IndexedDB and Web Locks.');
 const current=()=>{if(!isCurrent())throw fail('VOID_ACCOUNT_CHANGED','The signed-in account changed. Encrypted enrollment was stopped.');};
 let vault=null,session=null,created=false,persisted=false,messenger=null,connected=false,storagePassword='',configuredHome=null;
 try{
  current();const config=await getEncryptedEnrollmentStatus({request});current();checkConfig(config);configuredHome=config.homeserver;
  onState({phase:'confirming',message:'Confirming this account.'});const proof=await request('/api/auth/reauthenticate',{password});current();if(proof?.reauthenticated!==true)throw fail('VOID_NATIVE_PASSWORD_REQUIRED','The account service did not confirm this password.');onReauthenticated(proof);
  return await deps.locks.request(namespace(accountId,config.homeserver)+'.enrollment',{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock)throw fail('VOID_DEVICE_IN_USE','Encrypted enrollment is already open in another tab. Finish or close it there first.');current();
   const seedKey='voidline.enrollment.seed.v1.'+encodeURIComponent([accountId,config.homeserver].join('|'));let seed;
   try{seed=deps.storage.getItem(seedKey);if(seed!==null&&!/^[a-f0-9]{64}$/.test(seed))throw fail('VOID_ENROLLMENT_STORAGE','The local device-unlock seed is invalid. Existing encrypted data was not replaced.');if(seed===null){seed=hex(deps.crypto.getRandomValues(new Uint8Array(32)));deps.storage.setItem(seedKey,seed);}}catch(error){if(error.code)throw error;throw fail('VOID_ENROLLMENT_STORAGE','This browser could not save the device-unlock salt. No remote device was created.');}
   storagePassword=await deriveStoragePassword(password,seed,accountId,config.homeserver,deps.crypto);password='';current();
   const storeNamespace=namespace(accountId,config.homeserver);
   if(replaceLocalEnrollment){
    // This is an explicit fresh-device action, never an automatic password-reset
    // recovery. Existing Matrix/Rust stores and message keys are not deleted.
    const old=indexedDBStorage(deps.indexedDB);try{for(const key of await old.keys(storeNamespace+'|'))await old.remove(key);}finally{old.close();}current();
   }
   vault=await openVault({namespace:storeNamespace,password:storagePassword,indexedDB:deps.indexedDB,crypto:deps.crypto});current();
   session=await vault.get('session');current();
   const expected='@v_'+hex(new Uint8Array(await deps.crypto.subtle.digest('SHA-256',encoder.encode(accountId))))+':'+config.serverName;current();
   if(session){
    if(session.accountId!==accountId||session.homeserver!==config.homeserver||session.userId!==expected||typeof session.deviceId!=='string'||typeof session.accessToken!=='string')throw fail('VOID_ENROLLMENT_IDENTITY','The saved encrypted device does not match this account. It was not connected.');
    onState({phase:'unlocking',message:'Unlocking this encrypted device.'});const identity=await remoteIdentity(config.homeserver,session.accessToken,deps.fetcher);current();if(identity.user_id!==expected||identity.device_id!==session.deviceId)throw fail('VOID_ENROLLMENT_IDENTITY','The saved encrypted token identifies a different account or device.');
   }else{
    onState({phase:'enrolling',message:'Enrolling a dedicated encrypted device.'});session=await request('/api/encryption/enroll',{clientId:deps.crypto.randomUUID(),deviceName});created=true;current();
    if(session.accountId!==accountId||session.homeserver!==config.homeserver||session.userId!==expected||typeof session.deviceId!=='string'||!session.deviceId||typeof session.accessToken!=='string'||!session.accessToken)throw fail('VOID_ENROLLMENT_IDENTITY','The encrypted service returned a device for a different account.');
    await vault.put('session',{accountId,homeserver:config.homeserver,userId:session.userId,deviceId:session.deviceId,accessToken:session.accessToken});persisted=true;current();
   }
   messenger=createSecureMessenger({onState});if(!messenger?.connect)throw fail('VOID_ENROLLMENT_CONNECTION','The encrypted client could not initialize.');
   await messenger.connect({homeserver:config.homeserver,accountId,accessToken:session.accessToken,storagePassword,expectedUserId:expected,expectedDeviceId:session.deviceId});current();connected=true;
   const wrapped=Object.freeze({...messenger,async disconnect(options={}){const result=await messenger.disconnect(options);if(options.revokeSession===true&&(result?.revocation?.status==='confirmed'||result?.revocation==='confirmed'))await clearEncryptedEnrollment({accountId,homeserver:config.homeserver},deps);return result;}});
   return {messenger:wrapped,session:{userId:session.userId,deviceId:session.deviceId,homeserver:config.homeserver},resumed:!created};
  });
 }catch(error){
  if(messenger&&!connected){try{await messenger.disconnect({revokeSession:false});}catch{}}
  if(created&&session?.accessToken&&(!persisted||!isCurrent())){const revocation=await revokeFresh(configuredHome,session.accessToken,deps.fetcher);if(revocation==='confirmed'&&persisted&&vault){try{await vault.remove('session');}catch{}}if(revocation==='unknown'){error.revocation='unknown';error.message+=' Remote device revocation could not be confirmed. Use a trusted device or service operator to review it before retrying.';}}
  throw error;
 }finally{password='';storagePassword='';session=null;vault?.close();}
}
