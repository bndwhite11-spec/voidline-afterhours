import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {create} from '../src/secure-messenger.js';

const cases=[];const test=(name,fn)=>cases.push([name,fn]);
const wait=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:v=>resolve(v)};};
function fixture(){
 const calls=[],states=[],events=[],records=[];let plain=false,verified=true,changed=false,identity={user_id:'@owner:matrix.example',device_id:'DEV'};
 const room={roomId:'!room:matrix.example',name:'Private room',getMyMembership:()=> 'join',getEncryptionTargetMembers:async()=>[{userId:'@owner:matrix.example'},{userId:'@member:matrix.example'}],getJoinedMemberCount:()=>2,getUnreadNotificationCount:()=>0,getLiveTimeline:()=>({getEvents:()=>records}),getPendingEvents:()=>[],findEventById:id=>records.find(r=>r.getId()===id)};
 const crypto={globalBlacklistUnverifiedDevices:false,setDeviceIsolationMode(mode){calls.push(['isolation',mode]);},isEncryptionEnabledInRoom:async()=>!plain,
 getUserDeviceInfo:async users=>new Map(users.map(id=>[id,new Map([['DEV',{userId:id,deviceId:'DEV',getFingerprint:()=>id==='@owner:matrix.example'?'OWNERKEY':'MEMBERKEY'}]])])),
 getUserVerificationStatus:async()=>({needsUserApproval:changed,wasCrossSigningVerified:false,isVerified:()=>!changed}),getDeviceVerificationStatus:async()=>({isVerified:()=>verified}),
 getEncryptionInfoForEvent:async()=>({shieldColour:0}),getOwnDeviceKeys:async()=>({ed25519:'OWNERKEY',curve25519:'CURVEKEY'}),setDeviceVerified:async(...args)=>calls.push(['verify',...args]),
 getKeyBackupInfo:async()=>null,userHasCrossSigningKeys:async()=>false,createRecoveryKeyFromPassphrase:async()=>({privateKey:new Uint8Array(32).fill(1),encodedPrivateKey:'USER-RECOVERY-SECRET'}),bootstrapSecretStorage:async opts=>{calls.push(['backup',opts]);},bootstrapCrossSigning:async opts=>{calls.push(['crossSigning']);await opts.authUploadDeviceSigningKeys(async()=>{});},checkKeyBackupAndEnable:async()=>{},isSecretStorageReady:async()=>true,isCrossSigningReady:async()=>true};
 class Client extends EventEmitter{
  constructor(opts){super();this.opts=opts;this.http=opts;}
  async whoami(){return identity;}
  async downloadKeysForUsers(){return {device_keys:{}};}
  stopClient(){calls.push(['stop']);}
  async initRustCrypto(opts){calls.push(['initCrypto',opts]);}
  getCrypto(){return crypto;}
  async startClient(){this.emit('sync','PREPARED');}
  getRooms(){return [room];}
  getRoom(){return room;}
  async getStateEvent(){return {algorithm:'m.megolm.v1.aes-sha2'};}
  async getJoinedRoomMembers(){return {joined:{'@owner:matrix.example':{},'@member:matrix.example':{}}};}
  async sendEvent(...args){calls.push(['send',...args]);return {event_id:'$durable'};}
  makeTxnId(){return 'stable-id';}
  async createRoom(opts){calls.push(['create',opts]);return {room_id:room.roomId};}
  async getDevices(){return {devices:[]};}
  async decryptEventIfNeeded(){calls.push(['decrypt']);}
  async logout(){calls.push(['logout']);}
 }
 const sdk={MemoryStore:class{},ClientEvent:{Sync:'sync'},RoomEvent:{Timeline:'timeline'},CryptoEvent:{VerificationRequestReceived:'verification',UserTrustStatusChanged:'trust',DevicesUpdated:'devices'},createClient(opts){const c=new Client(opts);calls.push(['client',opts]);clients.push(c);return c;}};
 const clients=[];const storeLocks=new Set();
 const deps={sdk,loadWasm:async()=>calls.push(['wasm']),indexedDB:{},AllDevicesIsolationMode:class{constructor(strict){this.strict=strict;}},locks:{request:async(name,_opts,fn)=>{if(storeLocks.has(name))return fn(null);storeLocks.add(name);try{return await fn({});}finally{storeLocks.delete(name);}}},fetch:async()=>({ok:true}),decodeRecoveryKey:()=>new Uint8Array(32).fill(2)};
 const app=create({onState:s=>states.push(s),onEvent:e=>events.push(e)},deps);
 const connect=()=>app.connect({homeserver:'https://matrix.example',accountId:'app-account',accessToken:'MEMORY_TOKEN',storagePassword:'private vault passphrase'});
 return {app,connect,calls,states,events,records,room,crypto,clients,deps,get latest(){return clients.at(-1);},setPlain:v=>plain=v,setVerified:v=>verified=v,setChanged:v=>changed=v,setIdentity:v=>identity=v};
}

test('explicit connection validates server identity, encrypts the account/device scoped store, and serializes writers',async()=>{
 const f=fixture();try{await f.connect();assert.equal(f.app.status().phase,'ready');const init=f.calls.find(c=>c[0]==='initCrypto')[1];assert.equal(init.useIndexedDB,true);assert.match(init.cryptoDatabasePrefix,/app-account/);assert.match(init.cryptoDatabasePrefix,/DEV/);assert.equal(init.storagePassword,'private vault passphrase');assert.equal(f.crypto.globalBlacklistUnverifiedDevices,true);
 assert.ok(f.calls.find(c=>c[0]==='isolation')[1].strict);assert.equal(f.latest.opts.disableVoip,true);assert.equal(f.latest.opts.accessToken,'MEMORY_TOKEN');
 }finally{await f.app.disconnect();}
});
test('no protected send reaches SDK transport for plaintext, missing verification or changed identity',async()=>{
 const f=fixture();try{await f.connect();f.setPlain(true);await assert.rejects(()=>f.app.sendText(f.room.roomId,'private'),e=>e.code==='VOID_PLAINTEXT');f.setPlain(false);f.setVerified(false);await assert.rejects(()=>f.app.sendText(f.room.roomId,'private'),e=>e.code==='VOID_UNVERIFIED');f.setVerified(true);f.setChanged(true);await assert.rejects(()=>f.app.sendText(f.room.roomId,'private'),e=>e.code==='VOID_IDENTITY_CHANGED');assert.equal(f.calls.filter(c=>c[0]==='send').length,0);}finally{await f.app.disconnect();}
});
test('encrypted send retry binds one content payload to one stable transaction identifier',async()=>{
 const f=fixture();try{await f.connect();const first=await f.app.sendText(f.room.roomId,'private',{clientId:'retry-1'});const second=await f.app.sendText(f.room.roomId,'private',{clientId:'retry-1'});assert.deepEqual(first,second);assert.equal(f.calls.filter(c=>c[0]==='send').length,1);await assert.rejects(()=>f.app.sendText(f.room.roomId,'different',{clientId:'retry-1'}),e=>e.code==='VOID_RETRY_CONFLICT');assert.equal(first.status,'sent');}finally{await f.app.disconnect();}
});
test('the final fetch boundary blocks SDK plaintext fallback, including standard unencrypted reactions',async()=>{
 const f=fixture();try{await f.connect();for(const type of ['m.room.message','m.reaction','future.unknown'])await assert.rejects(async()=>f.latest.opts.fetchFn(`https://matrix.example/_matrix/client/v3/rooms/!room/send/${type}/txn`,{method:'PUT'}),e=>e.code==='VOID_PLAINTEXT');await f.latest.opts.fetchFn('https://matrix.example/_matrix/client/v3/rooms/!room/send/m.room.encrypted/txn',{method:'PUT'});await assert.rejects(async()=>f.latest.opts.fetchFn('https://other.example/_matrix/client/v3/sync'),e=>e.code==='VOID_ORIGIN');await f.app.react(f.room.roomId,'$event','💜');assert.equal(f.calls.find(c=>c[0]==='send')[2],'io.voidline.reaction');}finally{await f.app.disconnect();}
});
test('room creation installs encryption and joined-only history without public discovery',async()=>{
 const f=fixture();try{await f.connect();await f.app.createRoom({name:'Room',invites:['@member:matrix.example'],isDirect:true});const opts=f.calls.find(c=>c[0]==='create')[1];assert.equal(opts.visibility,'private');assert.equal(opts.preset,'private_chat');assert.equal(opts.initial_state.find(e=>e.type==='m.room.encryption').content.algorithm,'m.megolm.v1.aes-sha2');assert.equal(opts.initial_state.find(e=>e.type==='m.room.history_visibility').content.history_visibility,'joined');assert.equal(opts.is_direct,true);}finally{await f.app.disconnect();}
});
test('timeline excludes plaintext injected into an encrypted room and never emits HTML',async()=>{
 const f=fixture();try{await f.connect();for(const encrypted of [false,true])f.records.push({getId:()=>encrypted?'$encrypted':'$plain',getSender:()=> '@member:matrix.example',getTs:()=>100,isRedacted:()=>false,isEncrypted:()=>encrypted,getContent:()=>({body:'<script>literal</script>'}),getType:()=> 'm.room.message'});const list=await f.app.timeline(f.room.roomId);assert.equal(list.length,1);assert.equal(list[0].id,'$encrypted');assert.equal(list[0].text,'<script>literal</script>');assert.equal(list[0].html,undefined);}finally{await f.app.disconnect();}
});
test('fingerprint mismatch cannot mark a device verified and disconnect locks all operations',async()=>{
 const f=fixture();await f.connect();await assert.rejects(()=>f.app.verifyFingerprint('@member:matrix.example','DEV','WRONG'),e=>e.code==='VOID_FINGERPRINT');assert.equal(f.calls.filter(c=>c[0]==='verify').length,0);await f.app.verifyFingerprint('@member:matrix.example','DEV','MEMBERKEY');assert.equal(f.calls.filter(c=>c[0]==='verify').length,1);await f.app.disconnect({revokeSession:true});assert.equal(f.app.status().phase,'locked');assert.ok(f.calls.some(c=>c[0]==='logout'));await assert.rejects(()=>f.app.listRooms(),e=>e.code==='VOID_LOCKED');
});
test('recovery requires the user acknowledgement before SDK backup writes and never silently resets keys',async()=>{
 const f=fixture();try{await f.connect();await assert.rejects(()=>f.app.setupRecovery({onRecoveryKey:async()=>false}),e=>e.code==='VOID_RECOVERY_CANCELLED');assert.equal(f.calls.filter(c=>c[0]==='backup').length,0);let displayed='';await f.app.setupRecovery({onRecoveryKey:async key=>{displayed=key;return true;}});assert.equal(displayed,'USER-RECOVERY-SECRET');assert.equal(f.calls.filter(c=>c[0]==='backup').length,1);f.crypto.userHasCrossSigningKeys=async()=>true;await assert.rejects(()=>f.app.setupRecovery({onRecoveryKey:async()=>true}),e=>e.code==='VOID_RECOVERY_EXISTS');}finally{await f.app.disconnect();}
});
test('an already published Matrix device cannot be silently reinitialized with different keys',async()=>{
 const f=fixture(),original=f.deps.sdk.createClient;f.deps.sdk.createClient=opts=>{const c=original(opts);c.downloadKeysForUsers=async()=>({device_keys:{'@owner:matrix.example':{DEV:{keys:{'ed25519:DEV':'OTHERKEY','curve25519:DEV':'OTHERIDENTITY'}}}}});return c;};await assert.rejects(()=>f.connect(),e=>e.code==='VOID_DEVICE_CONFLICT');assert.equal(f.app.status().phase,'error');assert.equal(f.states.some(s=>s.phase==='ready'),false);
});
test('decryption alone cannot display an event with an unverified sender shield',async()=>{
 const f=fixture();try{await f.connect();f.crypto.getEncryptionInfoForEvent=async()=>({shieldColour:1});f.records.push({getId:()=> '$untrusted',getSender:()=> '@member:matrix.example',getTs:()=>100,isRedacted:()=>false,isEncrypted:()=>true,getContent:()=>({body:'UNTRUSTED_PRIVATE_CONTENT'}),getType:()=> 'm.room.message'});const list=await f.app.timeline(f.room.roomId);assert.equal(list[0].type,'unavailable');assert.equal(JSON.stringify(list).includes('UNTRUSTED_PRIVATE_CONTENT'),false);}finally{await f.app.disconnect();}
});
test('stale SDK membership blocks sending until revocation synchronization and rotates the outbound session',async()=>{
 const f=fixture();try{await f.connect();f.room.getEncryptionTargetMembers=async()=>[{userId:'@owner:matrix.example'},{userId:'@removed:matrix.example'}];let rotations=0;f.crypto.forceDiscardSession=async()=>rotations++;await assert.rejects(()=>f.app.sendText(f.room.roomId,'blocked'),e=>e.code==='VOID_MEMBERSHIP_SYNC');assert.equal(rotations,1);assert.equal(f.calls.filter(c=>c[0]==='send').length,0);}finally{await f.app.disconnect();}
});
test('an account switch during fingerprint lookup cannot verify an old device',async()=>{
 const f=fixture();await f.connect();const held=wait(),original=f.crypto.getUserDeviceInfo;f.crypto.getUserDeviceInfo=async users=>{await held.promise;return original(users);};const mutation=f.app.verifyFingerprint('@member:matrix.example','DEV','MEMBERKEY');await f.app.disconnect();held.resolve();await assert.rejects(()=>mutation,e=>e.code==='VOID_ACCOUNT_CHANGED');assert.equal(f.calls.filter(c=>c[0]==='verify').length,0);
});
test('an old recovery lookup cannot display a key after disconnect',async()=>{
 const f=fixture();await f.connect();const held=wait();f.crypto.getKeyBackupInfo=()=>held.promise;let shown=0;const setup=f.app.setupRecovery({onRecoveryKey:async()=>{shown++;return true;}});await f.app.disconnect();held.resolve(null);await assert.rejects(()=>setup,e=>e.code==='VOID_ACCOUNT_CHANGED');assert.equal(shown,0);assert.equal(f.calls.filter(c=>c[0]==='backup').length,0);
});
test('simultaneous connection intents cannot both initialize or let an old catch disconnect the winner',async()=>{
 const f=fixture();const first=f.app.connect({homeserver:'https://old.example',accountId:'old-google',accessToken:'oldtoken',storagePassword:'old vault passphrase'});const second=f.app.connect({homeserver:'https://matrix.example',accountId:'new-google',accessToken:'newtoken',storagePassword:'new vault passphrase'});const result=await Promise.allSettled([first,second]);assert.equal(result[0].status,'rejected');assert.equal(result[0].reason.code,'VOID_ACCOUNT_CHANGED');assert.equal(result[1].status,'fulfilled');assert.equal(f.app.status().phase,'ready');assert.equal(f.calls.filter(c=>c[0]==='initCrypto').length,1);assert.equal(f.latest.opts.baseUrl,'https://matrix.example');await f.app.disconnect();
});
test('loading older history expands the visible window rather than silently discarding the loaded page',async()=>{
 const f=fixture();try{await f.connect();for(let i=0;i<160;i++)f.records.push({getId:()=>'$'+i,getSender:()=> '@member:matrix.example',getTs:()=>i,isRedacted:()=>false,isEncrypted:()=>true,getContent:()=>({body:'record '+i}),getType:()=> 'm.room.message'});f.latest.scrollback=async()=>{};assert.equal((await f.app.timeline(f.room.roomId)).length,150);const expanded=await f.app.older(f.room.roomId);assert.equal(expanded.length,160);assert.equal(expanded[0].text,'record 0');}finally{await f.app.disconnect();}
});
test('a delayed previous-session logout cannot replace a newer connected account status',async()=>{
 const f=fixture();await f.connect();const held=wait();f.latest.logout=()=>held.promise;const oldLogout=f.app.disconnect({revokeSession:true});await f.app.connect({homeserver:'https://other.example',accountId:'new-google',accessToken:'newtoken',storagePassword:'new private vault passphrase'});assert.equal(f.app.status().phase,'ready');held.resolve();await oldLogout;assert.equal(f.app.status().phase,'ready');assert.equal(f.latest.opts.baseUrl,'https://other.example');await f.app.disconnect();
});
let failures=0;for(const[name,fn]of cases){try{await fn();console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name,e);}}
console.log(`${cases.length-failures}/${cases.length} Matrix adapter boundary checks passed. Mock SDK transport; not a homeserver, WASM browser or two-account security test.`);process.exitCode=failures?1:0;
