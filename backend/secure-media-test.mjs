import assert from 'node:assert/strict';
import {initAsync,Attachment,EncryptedAttachment} from '@matrix-org/matrix-sdk-crypto-wasm';
await initAsync();
const plain=new TextEncoder().encode('PRIVATE_FILE_CANARY\nA real attachment round trip through the maintained Rust implementation.');
let encrypted,copy,modified;
try{
 encrypted=Attachment.encrypt(plain);const descriptor=encrypted.mediaEncryptionInfo,ciphertext=encrypted.encryptedData;
 assert.equal(JSON.parse(descriptor).v,'v2');assert.equal(Buffer.from(ciphertext).includes(Buffer.from('PRIVATE_FILE_CANARY')),false);
 copy=new EncryptedAttachment(ciphertext,descriptor);assert.deepEqual(Attachment.decrypt(copy),plain);
 console.log('PASS actual pinned Rust WASM encrypts and decrypts attachment bytes with a validated Matrix v2 descriptor');
 const changed=Uint8Array.from(ciphertext);changed[0]^=1;modified=new EncryptedAttachment(changed,descriptor);assert.throws(()=>Attachment.decrypt(modified));
 console.log('PASS actual Rust attachment integrity validation rejects modified ciphertext');
 console.log('2/2 actual library checks passed. These are attachment-library checks, not a homeserver exchange, protocol audit or browser media test.');
}finally{encrypted?.free();copy?.free();modified?.free();plain.fill(0);}
