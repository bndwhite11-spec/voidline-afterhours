/* Encryption at rest for client drafts/outbox. This is not a messaging protocol.
 * Message encryption and key distribution remain entirely with Matrix. */
const DATABASE='voidline.private.vault.v1',ITERATIONS=600000,VERSION=1;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const fail=(code,message)=>Object.assign(new Error(message),{code});
const hex=bytes=>Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
const unhex=value=>Uint8Array.from(value.match(/.{2}/g)||[],n=>parseInt(n,16));

export function indexedDBStorage(indexedDB){
 if(!indexedDB?.open)throw fail('VOID_VAULT_UNAVAILABLE','Encrypted draft storage is unavailable in this browser.');
 let database;
 const ready=new Promise((resolve,reject)=>{
  const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('records');};
  request.onsuccess=()=>{database=request.result;database.onversionchange=()=>database.close();resolve(database);};
  request.onerror=()=>reject(fail('VOID_VAULT_UNAVAILABLE','Encrypted draft storage could not open.'));
  request.onblocked=()=>reject(fail('VOID_VAULT_UNAVAILABLE','Another tab is blocking encrypted draft storage.'));
 });
 async function transaction(mode,operation){
  const db=await ready;
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('records',mode),store=tx.objectStore('records');let result;
   tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(fail('VOID_VAULT_WRITE','The encrypted draft could not be saved. Keep this tab open and retry.'));
   try{operation(store,value=>{result=value;});}catch(error){try{tx.abort();}catch{}reject(error);}
  });
 }
 return {
  get:key=>transaction('readonly',(store,done)=>{const req=store.get(key);req.onsuccess=()=>done(req.result);}),
  put:(key,value)=>transaction('readwrite',store=>store.put(value,key)),
  remove:key=>transaction('readwrite',store=>store.delete(key)),
  keys:prefix=>transaction('readonly',(store,done)=>{const keys=[],req=store.openKeyCursor();req.onsuccess=()=>{const cursor=req.result;if(!cursor){done(keys);return;}if(typeof cursor.key==='string'&&cursor.key.startsWith(prefix))keys.push(cursor.key);cursor.continue();};}),
  close:()=>{database?.close();}
 };
}

export async function openVault({namespace,password,indexedDB,crypto=globalThis.crypto,storage,iterations=ITERATIONS}={}){
 if(typeof namespace!=='string'||!namespace||namespace.length>1500)throw fail('VOID_VAULT_NAMESPACE','Choose an account-scoped encrypted vault.');
 if(typeof password!=='string'||password.length<16)throw fail('VOID_VAULT_PASSWORD','Use a separate vault passphrase of at least 16 characters.');
 if(!crypto?.subtle||!crypto.getRandomValues)throw fail('VOID_VAULT_UNAVAILABLE','This browser cannot protect local drafts.');
 if(!Number.isInteger(iterations)||iterations<100000||iterations>1000000)throw fail('VOID_VAULT_PARAMETERS','The encrypted vault parameters are unsupported.');
 const store=storage||indexedDBStorage(indexedDB),prefix=namespace+'|',metaKey=prefix+'$metadata';
 let closed=false,key,queue=Promise.resolve();
 const meta=await store.get(metaKey);
 if(meta&&(meta.version!==VERSION||meta.algorithm!=='PBKDF2-SHA256/AES-256-GCM'||!Number.isInteger(meta.iterations)||meta.iterations<100000||meta.iterations>1000000||!/^[a-f0-9]{64}$/.test(meta.salt||''))){store.close?.();throw fail('VOID_VAULT_PARAMETERS','The encrypted vault format is unsupported. Existing data has not been changed.');}
 if(!meta&&(await store.keys(prefix)).some(id=>id!==prefix+'$check')){store.close?.();throw fail('VOID_VAULT_CORRUPT','Vault metadata is missing. Existing encrypted records have not been replaced.');}
 const salt=meta?unhex(meta.salt):crypto.getRandomValues(new Uint8Array(32));
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:meta?.iterations||iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const check=()=>{if(closed||!key)throw fail('VOID_VAULT_LOCKED','Unlock the account vault before accessing drafts.');};
 const aad=id=>encoder.encode('VOIDLINE vault '+VERSION+'|'+namespace+'|'+id);
 async function encrypt(id,value){check();const iv=crypto.getRandomValues(new Uint8Array(12)),text=JSON.stringify(value);if(text===undefined||text.length>16*1024*1024)throw fail('VOID_VAULT_SIZE','This local record is too large.');const bytes=encoder.encode(text);try{return {version:VERSION,iv:hex(iv),ciphertext:await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(id),tagLength:128},key,bytes)};}finally{bytes.fill(0);}}
 async function decrypt(id,record){check();if(!record)return undefined;if(record.version!==VERSION||!/^[a-f0-9]{24}$/.test(record.iv||''))throw fail('VOID_VAULT_CORRUPT','This encrypted record could not be verified.');try{const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(record.iv),additionalData:aad(id),tagLength:128},key,record.ciphertext));try{return JSON.parse(decoder.decode(plain));}finally{plain.fill(0);}}catch{throw fail('VOID_VAULT_CORRUPT','The vault passphrase is incorrect or the encrypted record was changed. Existing data has not been replaced.');}}
 try{if(meta){const sentinel=await decrypt('$check',await store.get(prefix+'$check'));if(sentinel?.namespace!==namespace)throw fail('VOID_VAULT_CORRUPT','The account vault could not be verified.');}
 else{
  const sentinel=await encrypt('$check',{namespace,version:VERSION});
  // Store the check before metadata. An interrupted first setup can retry; no
  // user drafts exist until openVault returns successfully.
  await store.put(prefix+'$check',sentinel);
  await store.put(metaKey,{version:VERSION,algorithm:'PBKDF2-SHA256/AES-256-GCM',iterations,salt:hex(salt)});
 }}catch(error){closed=true;key=null;store.close?.();throw error;}
 const safeId=id=>{if(typeof id!=='string'||!id||id.startsWith('$')||id.length>1500)throw fail('VOID_VAULT_RECORD','Use a valid private record identifier.');return id;};
 function ordered(operation){const task=queue.then(operation);queue=task.catch(()=>{});return task;}
 return Object.freeze({
  async get(id){safeId(id);check();await queue;check();const record=await store.get(prefix+id);check();return decrypt(id,record);},
  put(id,value){safeId(id);return ordered(async()=>{const record=await encrypt(id,value);check();await store.put(prefix+id,record);check();});},
  remove(id){safeId(id);return ordered(async()=>{check();await store.remove(prefix+id);check();});},
  async list(startsWith=''){check();await queue;check();const keys=await store.keys(prefix+startsWith);check();return keys.map(k=>k.slice(prefix.length)).filter(k=>!k.startsWith('$'));},
  close(){closed=true;key=null;store.close?.();},
  isUnlocked:()=>!closed
 });
}
