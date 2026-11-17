import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {openVault,indexedDBStorage} from '../src/secure-vault.js';
const tests=[],test=(name,run)=>tests.push([name,run]);
const password='A separate private vault passphrase 2026';
const namespace='app-account|matrix.example|@person:matrix.example|device';
const options=idb=>({namespace,password,indexedDB:idb});

test('actual IndexedDB/WebCrypto stores ciphertext and restores exact per-thread drafts after reopening',async()=>{
 const idb=new IDBFactory(),vault=await openVault(options(idb));
 const text='PRIVATE_DRAFT_CANARY 🌙\nA reply and its pending ID';
 await vault.put('draft:room:thread',{roomId:'room',threadRootId:'thread',text,pending:{clientId:'fixed-retry',text}});
 const raw=indexedDBStorage(idb),record=await raw.get(namespace+'|draft:room:thread');
 assert.equal(record.version,1);assert.equal(typeof record.iv,'string');assert.ok(record.ciphertext instanceof ArrayBuffer);
 assert.equal(Buffer.from(record.ciphertext).includes(Buffer.from(text)),false);
 const meta=await raw.get(namespace+'|$metadata');assert.equal(meta.iterations,600000);assert.equal(JSON.stringify(meta).includes(password),false);assert.equal(meta.key,undefined);
 raw.close();vault.close();const restored=await openVault(options(idb));
 assert.equal((await restored.get('draft:room:thread')).text,text);assert.equal((await restored.get('draft:room:thread')).pending.clientId,'fixed-retry');restored.close();
});
test('wrong passphrases never replace the existing encrypted store',async()=>{
 const idb=new IDBFactory(),vault=await openVault(options(idb));await vault.put('draft:one',{text:'preserved'});vault.close();
 const raw=indexedDBStorage(idb),before=await raw.get(namespace+'|draft:one');
 await assert.rejects(()=>openVault({...options(idb),password:'The wrong private passphrase'}),e=>e.code==='VOID_VAULT_CORRUPT');
 const after=await raw.get(namespace+'|draft:one');assert.deepEqual(after,before);raw.close();
 const right=await openVault(options(idb));assert.equal((await right.get('draft:one')).text,'preserved');right.close();
});
test('account namespaces and authenticated record IDs prevent cross-account or swapped-record decryption',async()=>{
 const idb=new IDBFactory(),first=await openVault(options(idb));await first.put('draft:one',{text:'only account one'});
 const second=await openVault({...options(idb),namespace:'another-account|same-device'});assert.equal(await second.get('draft:one'),undefined);
 const raw=indexedDBStorage(idb),record=await raw.get(namespace+'|draft:one');await raw.put(namespace+'|draft:two',record);
 await assert.rejects(()=>first.get('draft:two'),e=>e.code==='VOID_VAULT_CORRUPT');raw.close();first.close();second.close();
});
test('AES-GCM rejects ciphertext tampering and every rewrite uses a fresh IV',async()=>{
 const idb=new IDBFactory(),vault=await openVault(options(idb)),raw=indexedDBStorage(idb);
 await vault.put('draft:one',{text:'same text'});const a=await raw.get(namespace+'|draft:one');await vault.put('draft:one',{text:'same text'});const b=await raw.get(namespace+'|draft:one');assert.notEqual(a.iv,b.iv);
 new Uint8Array(b.ciphertext)[0]^=1;await raw.put(namespace+'|draft:one',b);
 await assert.rejects(()=>vault.get('draft:one'),e=>e.code==='VOID_VAULT_CORRUPT');raw.close();vault.close();
});
test('a failed durable write preserves the prior draft and cannot acknowledge success',async()=>{
 const idb=new IDBFactory(),raw=indexedDBStorage(idb);let denied=false;
 const storage={...raw,put:async(key,value)=>{if(denied&&key.endsWith('|draft:one'))throw Object.assign(Error('Quota denied'),{code:'VOID_VAULT_WRITE'});return raw.put(key,value);}};
 const vault=await openVault({...options(idb),storage});await vault.put('draft:one',{text:'committed'});denied=true;
 await assert.rejects(()=>vault.put('draft:one',{text:'uncommitted'}));assert.equal((await vault.get('draft:one')).text,'committed');denied=false;await vault.put('draft:one',{text:'retried'});assert.equal((await vault.get('draft:one')).text,'retried');vault.close();
});
test('locking the vault removes access until the correct passphrase is supplied again',async()=>{
 const idb=new IDBFactory(),vault=await openVault(options(idb));await vault.put('draft:one',{text:'locked'});vault.close();
 for(const operation of [()=>vault.get('draft:one'),()=>vault.put('draft:two',{text:'no'}),()=>vault.list()])await assert.rejects(operation,e=>e.code==='VOID_VAULT_LOCKED');
});
test('missing metadata cannot silently initialize over existing encrypted records',async()=>{
 const idb=new IDBFactory(),vault=await openVault(options(idb));await vault.put('draft:one',{text:'Preserve this ciphertext'});vault.close();
 const raw=indexedDBStorage(idb),before=await raw.get(namespace+'|draft:one');await raw.remove(namespace+'|$metadata');
 await assert.rejects(()=>openVault(options(idb)),e=>e.code==='VOID_VAULT_CORRUPT');assert.deepEqual(await raw.get(namespace+'|draft:one'),before);assert.equal(await raw.get(namespace+'|$metadata'),undefined);raw.close();
});
test('atomic credential pointer promotion rolls back deletions when any staged write fails',async()=>{const idb=new IDBFactory(),store=indexedDBStorage(idb);try{await store.put('credential-old',{ciphertext:'old authenticated ciphertext'});await store.put('credential-pointer',{active:'old'});await assert.rejects(()=>store.batch({remove:['credential-old'],put:[['credential-pointer',{active:'new'}],['invalid',()=>{}]]}));assert.equal((await store.get('credential-pointer')).active,'old');assert.equal((await store.get('credential-old')).ciphertext,'old authenticated ciphertext');await store.batch({remove:['credential-old'],put:[['credential-pointer',{active:'new'}]]});assert.equal(await store.get('credential-old'),undefined);assert.equal((await store.get('credential-pointer')).active,'new');}finally{store.close();}});
let failures=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error);}}
console.log(`${tests.length-failures}/${tests.length} encrypted vault checks passed against real WebCrypto and fake-indexeddb. Browser storage/visual behavior is not established by this test.`);process.exitCode=failures?1:0;
