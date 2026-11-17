import {EventEmitter} from 'node:events';
import {create} from '../src/secure-messenger.js';
export function fixture(){
 const calls=[],states=[],events=[],records=[],recovery={storage:false,signing:false,identity:false,backup:null,backupSecret:false,activeBackup:null,key:null};let plain=false,verified=true,changed=false,identity={user_id:'@owner:matrix.example',device_id:'DEV'};
 const room={roomId:'!room:matrix.example',name:'Private room',getMyMembership:()=> 'join',getEncryptionTargetMembers:async()=>[{userId:'@owner:matrix.example'},{userId:'@member:matrix.example'}],getJoinedMemberCount:()=>2,getUnreadNotificationCount:()=>0,getLiveTimeline:()=>({getEvents:()=>records}),getPendingEvents:()=>[],findEventById:id=>records.find(r=>r.getId()===id)};
 const crypto={globalBlacklistUnverifiedDevices:false,setDeviceIsolationMode(mode){calls.push(['isolation',mode]);},isEncryptionEnabledInRoom:async()=>!plain,
 getUserDeviceInfo:async users=>new Map(users.map(id=>[id,new Map([['DEV',{userId:id,deviceId:'DEV',getFingerprint:()=>id==='@owner:matrix.example'?'OWNERKEY':'MEMBERKEY'}]])])),
 getUserVerificationStatus:async()=>({needsUserApproval:changed,wasCrossSigningVerified:false,isVerified:()=>!changed}),getDeviceVerificationStatus:async()=>({isVerified:()=>verified}),
 getEncryptionInfoForEvent:async()=>({shieldColour:0}),getOwnDeviceKeys:async()=>({ed25519:'OWNERKEY',curve25519:'CURVEKEY'}),setDeviceVerified:async(...args)=>calls.push(['verify',...args]),
 getKeyBackupInfo:async()=>recovery.backup,userHasCrossSigningKeys:async()=>recovery.identity,
 getSecretStorageStatus:async()=>({ready:recovery.storage&&recovery.signing&&(!recovery.backup||recovery.backupSecret),defaultKeyId:recovery.storage?'recovery-key':null}),
 getCrossSigningStatus:async()=>({publicKeysOnDevice:recovery.identity,privateKeysInSecretStorage:recovery.storage&&recovery.signing,privateKeysCachedLocally:{masterKey:recovery.signing,selfSigningKey:recovery.signing,userSigningKey:recovery.signing}}),
 getActiveSessionBackupVersion:async()=>recovery.activeBackup,
 createRecoveryKeyFromPassphrase:async()=>({privateKey:new Uint8Array(32).fill(1),encodedPrivateKey:'USER-RECOVERY-SECRET'}),
 bootstrapSecretStorage:async(opts={})=>{calls.push(['backup',opts]);if(!recovery.storage){const key=await opts.createSecretStorageKey();recovery.storage=true;recovery.key=Array.from(key.privateKey);}if(opts.setupNewKeyBackup){recovery.backup={version:'1'};recovery.backupSecret=true;}},
 bootstrapCrossSigning:async opts=>{calls.push(['crossSigning']);if(recovery.signing&&recovery.identity)return;await opts.authUploadDeviceSigningKeys(async()=>{});recovery.signing=true;recovery.identity=true;},
 checkKeyBackupAndEnable:async()=>{recovery.activeBackup=recovery.backup?.version||null;},isSecretStorageReady:async()=>recovery.storage&&recovery.signing&&(!recovery.backup||recovery.backupSecret),isCrossSigningReady:async()=>recovery.signing&&recovery.identity,
 loadSessionBackupPrivateKeyFromSecretStorage:async()=>{if(!recovery.backupSecret)throw Error('No stored backup');},restoreKeyBackup:async()=>({total:1,imported:1}),forceDiscardSession:async roomId=>calls.push(['rotate',roomId])};
 class Client extends EventEmitter{
  constructor(opts){super();this.opts=opts;this.http=opts;this.secretStorage={getKey:async()=>recovery.storage?['recovery-key',{}]:null,checkKey:async key=>Array.from(key).every((n,i)=>n===recovery.key?.[i])};}
  getHomeserverUrl(){return this.opts.baseUrl;}
  async whoami(){return identity;}
  async downloadKeysForUsers(){return {device_keys:{}};}
  stopClient(){calls.push(['stop']);}
  async initRustCrypto(opts){calls.push(['initCrypto',opts]);}
  getCrypto(){return crypto;}
  async startClient(){this.emit('sync','PREPARED');}
  getRooms(){return [room];}
  getRoom(){return room;}
  async getStateEvent(){return {algorithm:'m.megolm.v1.aes-sha2'};}
  async getAccountDataFromServer(){return null;}
  async setAccountData(...args){calls.push(['accountData',...args]);}
  async members(){return {chunk:[]};}
  async getJoinedRoomMembers(){return {joined:{'@owner:matrix.example':{},'@member:matrix.example':{}}};}
  async sendEvent(...args){calls.push(['send',...args]);return {event_id:'$durable'};}
  makeTxnId(){return 'stable-id';}
  async createRoom(opts){calls.push(['create',opts]);return {room_id:room.roomId};}
  async getDevices(){return {devices:[]};}
  async decryptEventIfNeeded(){calls.push(['decrypt']);}
  async logout(){calls.push(['logout']);}
 }
 const sdk={MemoryStore:class{},ClientEvent:{Sync:'sync'},RoomEvent:{Timeline:'timeline'},CryptoEvent:{VerificationRequestReceived:'verification',UserTrustStatusChanged:'trust',DevicesUpdated:'devices'},createClient(opts){const c=new Client(opts);calls.push(['client',opts]);clients.push(c);return c;}};
 const clients=[];const storeLocks=new Set(),vaultStores=new Map();let denied=false,fetcher=async()=>({ok:true});
 const vaultFactory=async({namespace})=>{if(!vaultStores.has(namespace))vaultStores.set(namespace,new Map());const rows=vaultStores.get(namespace);let closed=false;const check=()=>{if(closed)throw Object.assign(Error('Locked'),{code:'VOID_VAULT_LOCKED'});};return {isUnlocked:()=>!closed,close:()=>{closed=true;},async get(key){check();return structuredClone(rows.get(key));},async put(key,value){check();if(denied)throw Object.assign(Error('Quota denied'),{code:'VOID_VAULT_WRITE'});rows.set(key,structuredClone(value));},async remove(key){check();rows.delete(key);},async list(prefix){check();return [...rows.keys()].filter(key=>key.startsWith(prefix));}};};
 const deps={sdk,vaultFactory,loadWasm:async()=>calls.push(['wasm']),indexedDB:{},AllDevicesIsolationMode:class{constructor(strict){this.strict=strict;}},locks:{request:async(name,_opts,fn)=>{if(storeLocks.has(name))return fn(null);storeLocks.add(name);try{return await fn({});}finally{storeLocks.delete(name);}}},fetch:(...args)=>fetcher(...args),decodeRecoveryKey:value=>new Uint8Array(32).fill(value==='USER-RECOVERY-SECRET'?1:2)};
 const app=create({onState:s=>states.push(s),onEvent:e=>events.push(e)},deps);
 const connect=()=>app.connect({homeserver:'https://matrix.example',accountId:'app-account',accessToken:'MEMORY_TOKEN',storagePassword:'private vault passphrase'});
 return {app,connect,calls,states,events,records,recovery,room,crypto,clients,deps,vaultStores,get latest(){return clients.at(-1);},setVaultDenied:value=>denied=value,setFetch:fn=>fetcher=fn,setPlain:v=>plain=v,setVerified:v=>verified=v,setChanged:v=>changed=v,setIdentity:v=>identity=v};
}
