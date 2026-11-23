// Invoked by test-synapse-exchange.py against its private, throwaway homeserver.
import {createClient, MatrixEvent} from 'matrix-js-sdk';
import {AllDevicesIsolationMode} from 'matrix-js-sdk/lib/crypto-api/index.js';
import {Attachment,EncryptedAttachment,initAsync} from '@matrix-org/matrix-sdk-crypto-wasm';
import loglevel from 'loglevel';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createInterface} from 'node:readline/promises';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
loglevel.disableAll(false);
const input=createInterface({input:process.stdin});
const {base,accounts,database}=JSON.parse(await input.question(''));input.close();
assert.equal(new URL(base).hostname,'127.0.0.1');
assert(path.isAbsolute(database));
const quiet={getChild(){return this},debug(){},info(){},warn(){},error(){},trace(){}};
const delay=ms=>new Promise(r=>setTimeout(r,ms)), clients=[];
async function wait(label,fn,limit=36000){
 const until=Date.now()+limit;
 while(Date.now()<until){const value=await fn();if(value)return value;await delay(240);}
 throw Error('Timed out waiting for '+label);
}
async function req(path,{token,body,method=body?'POST':'GET'}={}){
 const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 if(r.status===429){const data=await r.json();await delay(Math.max(1100,Math.min(data.retry_after_ms||7000,60000))+300);return req(path,{token,body,method});}
 assert(r.ok,method+' '+path+' HTTP '+r.status);
 return await r.json();
}
async function login(user,device){
 const creds=await req('/_matrix/client/v3/login',{body:{type:'m.login.password',identifier:{type:'m.id.user',user},password:accounts[user],device_id:device}});
 const client=createClient({baseUrl:base,userId:creds.user_id,deviceId:creds.device_id,accessToken:creds.access_token,logger:quiet,localTimeoutMs:12000});
 clients.push(client);
 await client.initRustCrypto({useIndexedDB:false});
 const crypto=client.getCrypto();crypto.globalBlacklistUnverifiedDevices=true;crypto.setDeviceIsolationMode(new AllDevicesIsolationMode(true));
 await client.startClient({initialSyncLimit:15,pollTimeout:5000});
 await wait('first sync',()=>client.getSyncState()==='SYNCING'||client.getSyncState()==='PREPARED');
 return {client,crypto,creds};
}
const id=o=>o.creds.user_id,did=o=>o.creds.device_id;
async function verify(peer,other){
 const pub=await other.crypto.getOwnDeviceKeys();
 const device=await wait('device key upload',async()=>{const map=await peer.crypto.getUserDeviceInfo([id(other)],true);return map.get(id(other))?.get(did(other));});
 assert.equal(device.keys.get('ed25519:'+did(other)),pub.ed25519);
 assert.equal(device.keys.get('curve25519:'+did(other)),pub.curve25519);
 await peer.crypto.setDeviceVerified(id(other),did(other));
 assert((await peer.crypto.getDeviceVerificationStatus(id(other),did(other))).isVerified());
}
async function decrypted(peer,raw,plain=true){
 const event=new MatrixEvent(raw);
 await peer.client.decryptEventIfNeeded(event);
 if(plain)assert(!event.isDecryptionFailure(),'recipient failed to decrypt event');
 return event;
}
const runId=randomUUID(),suffix=runId.slice(0,8).toUpperCase();
const text='receiver-only '+runId, attachmentBytes=new TextEncoder().encode('attachment-only '+runId);
const encryptedBody = async (actor,roomId,eventId)=> await req('/_matrix/client/v3/rooms/'+encodeURIComponent(roomId)+'/event/'+encodeURIComponent(eventId),{token:actor.creds.access_token});
const milestones=[];
function pass(s){milestones.push(s);console.log('PASS '+s);}
async function gate(){
 await initAsync();
 const [a,b]=await Promise.all([login('proofalice','A'+suffix),login('proofbob','B'+suffix)]);
 const {room_id}=await a.client.createRoom({visibility:'private',preset:'private_chat',invite:[id(b)],is_direct:true,initial_state:[
  {type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2'}},
  {type:'m.room.history_visibility',state_key:'',content:{history_visibility:'joined'}},
  {type:'m.room.guest_access',state_key:'',content:{guest_access:'forbidden'}}
 ]});
 await wait('invitation sync',()=>b.client.getRoom(room_id)?.getMyMembership()==='invite');
 await b.client.joinRoom(room_id);
 await wait('membership sync',()=>a.client.getRoom(room_id)?.getMember(id(b))?.membership==='join'&&b.client.getRoom(room_id)?.getMyMembership()==='join');
 await Promise.all([verify(a,b),verify(b,a)]);
 pass('Two independent Matrix clients verified each other’s device keys through a trusted local comparison.');
 const {event_id}=await a.client.sendTextMessage(room_id,text);
 let raw=await encryptedBody(a,room_id,event_id);
 assert.equal(raw.type,'m.room.encrypted');assert.equal(raw.content.algorithm,'m.megolm.v1.aes-sha2');assert.equal(typeof raw.content.ciphertext,'string');
 assert(!JSON.stringify(raw).includes(text));assert(!raw.content.session_key);
 await wait('room key and recipient plaintext',async()=>{
  const ev=await decrypted(b,raw,false);return !ev.isDecryptionFailure()&&ev.getContent().body===text;
 });
 pass('Synapse returned a Megolm event envelope; the receiving Rust client decrypted the exact message.');
 const encrypted=Attachment.encrypt(attachmentBytes), info=JSON.parse(encrypted.mediaEncryptionInfo);
 const octets=new Uint8Array(encrypted.encryptedData);
 assert.notDeepEqual(octets,attachmentBytes);
 const {content_uri}=await a.client.uploadContent(octets,{type:'application/octet-stream',includeFilename:false,timeout:16000});
 const {event_id:fileId}=await a.client.sendEvent(room_id,'m.room.message',{msgtype:'m.file',body:'private-proof.txt',file:{...info,url:content_uri},info:{size:attachmentBytes.length,mimetype:'text/plain'}});
 const rawFile=await encryptedBody(a,room_id,fileId);
 assert.equal(rawFile.type,'m.room.encrypted');assert(!JSON.stringify(rawFile).includes('private-proof.txt'));
 const event=await decrypted(b,rawFile);
 const blobURL=b.client.mxcUrlToHttp(event.getContent().file.url,undefined,undefined,undefined,false,false,true);
 const blob=await fetch(blobURL,{headers:{Authorization:'Bearer '+b.creds.access_token}});
 assert.equal(blob.status,200);
 const stored=new Uint8Array(await blob.arrayBuffer());assert.deepEqual(stored,octets);
 const {url,...savedInfo}=event.getContent().file;
 const forReceiver=new EncryptedAttachment(stored,JSON.stringify(savedInfo));
 assert.deepEqual(new Uint8Array(Attachment.decrypt(forReceiver)),attachmentBytes);
 encrypted.free();forReceiver.free();
 pass('Uploaded media bytes matched ciphertext; only the decrypted room event supplied the attachment key and private filename.');
 const outsider=await req('/_matrix/client/v3/login',{body:{type:'m.login.password',identifier:{type:'m.id.user',user:'proofcarol'},password:accounts.proofcarol}});
 const denied=await fetch(base+'/_matrix/client/v3/rooms/'+encodeURIComponent(room_id)+'/event/'+encodeURIComponent(event_id),{headers:{Authorization:'Bearer '+outsider.access_token}});
 assert([403,404].includes(denied.status));
 pass('Uninvited account could not read the private room event.');
 const member=await login('proofcarol','C'+suffix);
 const group=await a.client.createRoom({visibility:'private',preset:'private_chat',invite:[id(b),id(member)],initial_state:[
  {type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2'}},
  {type:'m.room.history_visibility',state_key:'',content:{history_visibility:'joined'}},
  {type:'m.room.guest_access',state_key:'',content:{guest_access:'forbidden'}}
 ]});
 const gid=group.room_id;
 for(const guest of [b,member]){
  await wait('group invitation',()=>guest.client.getRoom(gid)?.getMyMembership()==='invite');
  await guest.client.joinRoom(gid);
 }
 await wait('all group memberships',()=>[a,b,member].every(c=>c.client.getRoom(gid)?.getJoinedMembers().length===3));
 await Promise.all([verify(a,member),verify(member,a),verify(b,member),verify(member,b)]);
 const firstGroupMessage='group-only '+runId;
 const firstGroup=await a.client.sendTextMessage(gid,firstGroupMessage);
 const groupRaw=await encryptedBody(a,gid,firstGroup.event_id);
 assert.equal(groupRaw.type,'m.room.encrypted');
 for(const peer of [b,member]){
  await wait('group room key',async()=>{const event=await decrypted(peer,groupRaw,false);return !event.isDecryptionFailure()&&event.getContent().body===firstGroupMessage});
 }
 await a.client.kick(gid,id(member),'Fixture membership change');
 await wait('removal applied before subsequent send',()=>[a,b].every(c=>c.client.getRoom(gid)?.getMember(id(member))?.membership==='leave')&&member.client.getRoom(gid)?.getMyMembership()==='leave');
 const laterGroupMessage='current-members-only '+runId;
 const later=await a.client.sendTextMessage(gid,laterGroupMessage);
 const laterRaw=await encryptedBody(a,gid,later.event_id);
 assert.notEqual(laterRaw.content.session_id,groupRaw.content.session_id);
 await wait('remaining member decrypts',async()=>{const event=await decrypted(b,laterRaw,false);return !event.isDecryptionFailure()&&event.getContent().body===laterGroupMessage});
 const removed=await fetch(base+'/_matrix/client/v3/rooms/'+encodeURIComponent(gid)+'/event/'+encodeURIComponent(later.event_id),{headers:{Authorization:'Bearer '+member.creds.access_token}});
 assert([403,404].includes(removed.status));
 assert((await decrypted(member,laterRaw,false)).isDecryptionFailure());
 pass('Three verified group members decrypted the initial message. Removing one member rotated the Megolm session; even direct access to the later ciphertext did not let that member decrypt it.');
 const q=await b.crypto.getKeyBackupInfo();
 assert.equal(q,null,'This gate requires disposable new users');
 await b.crypto.resetKeyBackup();await b.crypto.checkKeyBackupAndEnable();
 const key=await b.crypto.getSessionBackupPrivateKey(), backup=await b.crypto.getKeyBackupInfo();
 assert(key instanceof Uint8Array&&key.length===32&&backup?.version);
 const backupPath='/_matrix/client/v3/room_keys/keys/'+encodeURIComponent(room_id)+'/'+encodeURIComponent(raw.content.session_id)+'?version='+encodeURIComponent(backup.version);
 const backupSession=await wait('encrypted server-side session backup',async()=>{const res=await fetch(base+backupPath,{headers:{Authorization:'Bearer '+b.creds.access_token}});return res.ok?await res.json():false;},65000);
 assert(backupSession.session_data?.ciphertext);assert(!backupSession.session_data.session_key);
 const sql=new DatabaseSync(database,{readOnly:true});
 const eventJson=sql.prepare('SELECT json FROM event_json WHERE event_id=?');
 for(const [key,val] of [[event_id,raw],[fileId,rawFile],[firstGroup.event_id,groupRaw],[later.event_id,laterRaw]]) {
  const event=JSON.parse(eventJson.get(key).json);
  assert.equal(event.type,'m.room.encrypted');assert.equal(event.content.ciphertext,val.content.ciphertext);
 }
 const keyRow=sql.prepare('SELECT session_data FROM e2e_room_keys WHERE user_id=? AND room_id=? AND session_id=?').get(id(b),room_id,raw.content.session_id);
 assert.deepEqual(JSON.parse(keyRow.session_data),backupSession.session_data);
 sql.close();
 const dir=path.dirname(database),dbName=path.basename(database);
 const sensitive=[text,firstGroupMessage,laterGroupMessage,Buffer.from(attachmentBytes).toString(),Buffer.from(key).toString('base64').replace(/=+$/,''),info.key.k];
 assert(sensitive.every(v=>typeof v==='string'&&v.length>=30));
 for(const filename of (await readdir(dir)).filter(n=>n===dbName||n===dbName+'-wal'||n===dbName+'-shm')){
  const bytes=await readFile(path.join(dir,filename));
  for(const value of sensitive)assert(!bytes.includes(value),'Unexpected plaintext or client key in database files');
 }
 pass('Megolm event and encrypted key-backup records matched Synapse SQLite. Plaintext, media key and backup private key were absent from its database files.');
 b.client.stopClient();a.client.stopClient();
 const recovered=await login('proofbob','R'+suffix);
 const missing=await decrypted(recovered,raw,false);assert(missing.isDecryptionFailure());
 await recovered.crypto.storeSessionBackupPrivateKey(key,backup.version);
 const restoration=await recovered.crypto.restoreKeyBackup();
 assert(restoration.imported>0);
 const history=await decrypted(recovered,raw);
 assert.equal(history.getContent().body,text);
 pass('A new device with only the account password could not decrypt earlier history; importing the separately retained backup key restored it.');
 console.log('RESULT '+JSON.stringify({checks:milestones.length,encryptedEvents:4,restoredSessions:restoration.imported}));
}
gate().then(()=>{for(const c of clients)c.stopClient();process.exit(0)}).catch(e=>{console.error('GATE_FAILURE',e.message,e.stack?.split('\n').slice(1,4).join('\n'));for(const c of clients)try{c.stopClient()}catch{};process.exit(1);});
