/* Matrix is the complete transport/crypto protocol; VOIDLINE never receives a
 * room key. This module is loaded only after explicit account connection. */
import * as matrix from 'matrix-js-sdk';
import {initAsync as loadWasm} from '@matrix-org/matrix-sdk-crypto-wasm';
import {decodeRecoveryKey} from 'matrix-js-sdk/lib/crypto-api/recovery-key.js';
import {AllDevicesIsolationMode} from 'matrix-js-sdk/lib/crypto-api/index.js';
import loglevel from 'loglevel';

// SDK debugging is unsuitable for private chat content. No telemetry sink.
loglevel.disableAll(false);
const quiet = {trace(){},debug(){},info(){},warn(){},error(){},getChild(){return this;}};
const fail = (code,message) => Object.assign(new Error(message),{code});
const cleanString = (value,max=4000) => typeof value === 'string' ? value.slice(0,max) : '';
const defaultDeps = {sdk:matrix,loadWasm,decodeRecoveryKey,AllDevicesIsolationMode,
 locks:globalThis.navigator?.locks,indexedDB:globalThis.indexedDB,
 fetch:(...args)=>globalThis.fetch(...args)};

export function create(options={},injected={}) {
 const deps={...defaultDeps,...injected};
 let intent=0,client=null,epoch=0,releaseLock=null,lockPromise=null,secret=null,secretEpoch=-1,initializing=null;
 let state={phase:'locked',userId:null,deviceId:null,error:''};
 const requests=new Map(),outbox=new Map(),historyLimits=new Map(),listeners=[];
 const emitState=patch=>{state={...state,...patch};options.onState?.({...state});};
 const safeError=error=>error?.code?.startsWith('VOID_')?error:fail('VOID_CONNECTION','The encrypted service could not complete this action. Check the connection, device verification and homeserver reauthentication.');
 const current=()=>{if(!client||state.phase!=='ready')throw fail('VOID_LOCKED','Connect and unlock this device before using encrypted messaging.');return {client,epoch};};
 const unchanged=ticket=>{if(ticket.epoch!==epoch||ticket.client!==client)throw fail('VOID_ACCOUNT_CHANGED','The account changed. The previous operation was stopped.');};
 function subscribe(target,event,fn){target.on(event,fn);listeners.push(()=>target.off?.(event,fn));}
 function eraseSecret(owner){if(owner!==undefined&&owner!==secretEpoch)return;secret?.fill(0);secret=null;secretEpoch=-1;}
 function setSecret(key,owner){eraseSecret();secret=Uint8Array.from(key);secretEpoch=owner;}
 async function lockStore(name,owns){
  if(!deps.locks?.request)throw fail('VOID_LOCKS_UNAVAILABLE','This browser cannot safely coordinate its encrypted device store. Use a browser with Web Locks support.');
  let acquired,failed;const ready=new Promise((resolve,reject)=>{acquired=resolve;failed=reject;});
  lockPromise=deps.locks.request(name,{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!owns()){failed(fail('VOID_ACCOUNT_CHANGED','A newer connection replaced this device request.'));return;}
   if(!lock){failed(fail('VOID_DEVICE_IN_USE','This encrypted device is open in another tab. Disconnect there before connecting here.'));return;}
   await new Promise(resolve=>{releaseLock=resolve;acquired();});
  }).catch(failed);
  await ready;
 }
 async function clearConnection({revokeSession=false}={}){
  const cleanupEpoch=++epoch;const old=client,pendingInit=initializing,oldRelease=releaseLock,oldLock=lockPromise;client=null;releaseLock=null;lockPromise=null;
  for(const remove of listeners.splice(0))remove();
  old?.stopClient();
  for(const item of requests.values()){try{Promise.resolve(item.request.cancel()).catch(()=>{});}catch{}}
  requests.clear();outbox.clear();historyLimits.clear();eraseSecret();
  if(pendingInit){try{await pendingInit;}catch{}}
  if(old){try{old.stopClient();if(revokeSession)await old.logout();}catch{}old.removeAllListeners?.();}
  oldRelease?.();await oldLock;
  if(cleanupEpoch===epoch)emitState({phase:'locked',userId:null,deviceId:null,error:''});
 }
 async function disconnect(options={}){intent++;return clearConnection(options);}
 async function connect({homeserver,googleAccountId,accessToken,storagePassword}){
  const myIntent=++intent;await clearConnection();
  if(myIntent!==intent)throw fail('VOID_ACCOUNT_CHANGED','A newer connection replaced this request.');
  const ticket=epoch,owns=()=>myIntent===intent&&ticket===epoch;
  try{
   const url=new URL(homeserver);
   if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw fail('VOID_HOMESERVER','Use the configured HTTPS homeserver origin.');
   if(!googleAccountId||!accessToken||typeof storagePassword!=='string'||storagePassword.length<16)throw fail('VOID_CREDENTIALS','Provide the Matrix access token and a local vault passphrase of at least 16 characters.');
   if(!deps.indexedDB)throw fail('VOID_STORE_UNAVAILABLE','Encrypted device storage is unavailable in this browser.');
   emitState({phase:'connecting',error:''});
   let deviceKeysApproved=false;
   const guardedFetch=(input,init)=>{
    const target=new URL(typeof input==='string'?input:input.url||String(input),url);
    if(!owns())throw fail('VOID_ACCOUNT_CHANGED','The encrypted connection was replaced.');
    if(target.origin!==url.origin)throw fail('VOID_ORIGIN','The encrypted connection tried to leave the configured homeserver.');
    // Matrix JS SDK deliberately leaves standard reactions unencrypted. This
    // adapter uses a custom encrypted content event and blocks every plaintext
    // /send path, including unknown future SDK fallback behavior.
    if(/\/keys\/upload$/.test(target.pathname)&&!deviceKeysApproved)throw fail('VOID_DEVICE_CONFLICT','Device identity must be checked before publishing keys.');
    const sending=target.pathname.match(/\/_matrix\/client\/[^/]+\/rooms\/[^/]+\/send\/([^/]+)\//);
    if(sending&&decodeURIComponent(sending[1])!=='m.room.encrypted')throw fail('VOID_PLAINTEXT','This action would send an unencrypted event and was blocked.');
    return deps.fetch(input,init);
   };
   const probe=deps.sdk.createClient({baseUrl:url.origin,accessToken,fetchFn:guardedFetch,logger:quiet,disableVoip:true});
   const identity=await probe.whoami();
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   const published=await probe.downloadKeysForUsers([identity.user_id]);probe.stopClient?.();
   const publishedKeys=published.device_keys?.[identity.user_id]?.[identity.device_id]?.keys||null;
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   if(!/^@[^:\s]+:[^\s]+$/.test(identity.user_id||'')||!identity.device_id)throw fail('VOID_IDENTITY','The token does not identify a Matrix account and device.');
   const prefix='voidline.crypto.v1.'+encodeURIComponent([googleAccountId,url.origin,identity.user_id,identity.device_id].join('|'));
   await lockStore(prefix,owns);
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   client=deps.sdk.createClient({baseUrl:url.origin,accessToken,userId:identity.user_id,deviceId:identity.device_id,
    fetchFn:guardedFetch,logger:quiet,disableVoip:true,timelineSupport:true,
    store:new deps.sdk.MemoryStore(),verificationMethods:['m.sas.v1'],
    cryptoCallbacks:{
     getSecretStorageKey:async({keys})=>owns()&&secretEpoch===ticket&&secret?[Object.keys(keys)[0],secret]:null,
     cacheSecretStorageKey:(_id,_info,key)=>{if(owns())setSecret(key,ticket);}
    }});
   await deps.loadWasm(new URL('./pkg/matrix_sdk_crypto_wasm_bg.wasm',import.meta.url));
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   const activeClient=client;
   const initTask=activeClient.initRustCrypto({useIndexedDB:true,cryptoDatabasePrefix:prefix,storagePassword});initializing=initTask;
   try{await initTask;}finally{if(initializing===initTask)initializing=null;}
   if(!owns()||client!==activeClient){activeClient.stopClient();throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');}
   const crypto=activeClient.getCrypto();if(!crypto)throw fail('VOID_CRYPTO','The encryption engine could not initialize.');
   const ownKeys=await crypto.getOwnDeviceKeys();
   if(!owns()||client!==activeClient)throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   if(publishedKeys&&(publishedKeys['ed25519:'+identity.device_id]!==ownKeys.ed25519||publishedKeys['curve25519:'+identity.device_id]!==ownKeys.curve25519))throw fail('VOID_DEVICE_CONFLICT','This Matrix device already belongs to another client or its local keys were lost. Create a fresh dedicated Matrix device token; the existing keys were not replaced.');
   deviceKeysApproved=true;
   crypto.globalBlacklistUnverifiedDevices=true;
   crypto.setDeviceIsolationMode(new deps.AllDevicesIsolationMode(true));
   subscribe(activeClient,deps.sdk.ClientEvent.Sync,sync=>{
    if(!owns()||client!==activeClient)return;
    emitState({phase:['PREPARED','SYNCING'].includes(sync)?'ready':'syncing',userId:identity.user_id,deviceId:identity.device_id,error:sync==='ERROR'?'Connection interrupted. Encrypted sends are paused.':''});
   });
   subscribe(client,deps.sdk.RoomEvent.Timeline,(event,room)=>{if(owns()&&client===activeClient)options.onEvent?.({roomId:room?.roomId,eventId:event.getId?.()});});
   subscribe(client,deps.sdk.CryptoEvent.VerificationRequestReceived,request=>trackVerification(request));
   subscribe(client,deps.sdk.CryptoEvent.UserTrustStatusChanged,()=>{if(owns())options.onEvent?.({type:'trust-changed'});});
   subscribe(client,deps.sdk.CryptoEvent.DevicesUpdated,()=>{if(owns())options.onEvent?.({type:'devices-changed'});});
   emitState({phase:'syncing',userId:identity.user_id,deviceId:identity.device_id});
   await activeClient.startClient({initialSyncLimit:50,lazyLoadMembers:true,pollTimeout:30000});
   if(!owns()||client!==activeClient)throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   return {...state};
  }catch(error){const cleaned=safeError(error);if(owns()){await clearConnection();if(myIntent===intent)emitState({phase:'error',error:cleaned.message});}throw cleaned;}
 }
 async function requireEncrypted(roomId,{verify=false}={}){
  const ticket=current(),room=ticket.client.getRoom(roomId);
  if(!room||room.getMyMembership()!=='join')throw fail('VOID_MEMBERSHIP','Join this conversation before opening it.');
  const crypto=ticket.client.getCrypto();
  if(!crypto||!await crypto.isEncryptionEnabledInRoom(roomId))throw fail('VOID_PLAINTEXT','This is a legacy unencrypted conversation. Protected messaging is blocked.');
  if(verify){
   const setting=await ticket.client.getStateEvent(roomId,'m.room.encryption','');unchanged(ticket);
   if(setting.algorithm!=='m.megolm.v1.aes-sha2')throw fail('VOID_CRYPTO','The conversation has no supported encryption setting.');
   const members=await ticket.client.getJoinedRoomMembers(roomId);unchanged(ticket);
   const users=Object.keys(members.joined||{});
   if(!users.includes(state.userId))throw fail('VOID_MEMBERSHIP','Your membership is no longer active.');
   const targets=room.getEncryptionTargetMembers?await room.getEncryptionTargetMembers():room.getJoinedMembers?.();unchanged(ticket);
   const cached=targets?.map(member=>member.userId).sort();
   if(cached&&JSON.stringify(cached)!==JSON.stringify([...users].sort())){await crypto.forceDiscardSession(roomId);unchanged(ticket);throw fail('VOID_MEMBERSHIP_SYNC','Membership changed. Wait for synchronization before sending.');}
   const info=await crypto.getUserDeviceInfo(users,true);unchanged(ticket);
   for(const userId of users){
    const devices=info.get(userId);if(!devices?.size)throw fail('VOID_UNVERIFIED','A participant has no available encryption device. Ask them to connect and verify first.');
    const trust=await crypto.getUserVerificationStatus(userId);unchanged(ticket);
    if(trust.needsUserApproval||trust.wasCrossSigningVerified&&!trust.isVerified())throw fail('VOID_IDENTITY_CHANGED','A participant identity changed. Compare fingerprints again before sending.');
    for(const device of devices.values()){
     const verified=await crypto.getDeviceVerificationStatus(userId,device.deviceId);unchanged(ticket);
     if(!verified?.isVerified())throw fail('VOID_UNVERIFIED','Verify every participating device in Devices and Security before sending.');
    }
   }
  }
  unchanged(ticket);return {ticket,room,crypto};
 }
 async function listRooms(){
  const ticket=current(),result=[];
  for(const room of ticket.client.getRooms())if(room.getMyMembership()==='join'&&await ticket.client.getCrypto().isEncryptionEnabledInRoom(room.roomId))result.push({id:room.roomId,name:cleanString(room.name,200),memberCount:room.getJoinedMemberCount(),unreadCount:room.getUnreadNotificationCount(),encrypted:true});
  unchanged(ticket);return result;
 }
 async function createRoom({name='',invites=[],isDirect=false}={}){
  const ticket=current();
  if(!Array.isArray(invites)||invites.length>15||invites.some(id=>!/^@[^:\s]+:[^\s]+$/.test(id)))throw fail('VOID_RECIPIENT','Use exact Matrix usernames, with at most 15 recipients.');
  const result=await ticket.client.createRoom({name:cleanString(name,100)||undefined,invite:invites,is_direct:!!isDirect,visibility:'private',preset:'private_chat',initial_state:[
   {type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2',rotation_period_msgs:100,rotation_period_ms:86400000}},
   {type:'m.room.history_visibility',state_key:'',content:{history_visibility:'joined'}},
   {type:'m.room.guest_access',state_key:'',content:{guest_access:'forbidden'}}
  ]});unchanged(ticket);return {roomId:result.room_id};
 }
 async function normalizeEvent(event,ticket){
  const id=event.getId(),base={id,sender:cleanString(event.getSender(),300),time:event.getTs()};
  if(event.isRedacted())return {...base,type:'deleted',text:'Message deleted.'};
  // Unencrypted content in an encrypted room is never displayed as private.
  if(!event.isEncrypted())return null;
  try{await ticket.client.decryptEventIfNeeded(event);unchanged(ticket);}catch{return {...base,type:'unavailable',text:'Message could not be decrypted on this device.'};}
  if(event.isDecryptionFailure?.())return {...base,type:'unavailable',text:'Message could not be decrypted or its device identity is untrusted.'};
  const authenticity=await ticket.client.getCrypto().getEncryptionInfoForEvent(event);unchanged(ticket);
  if(!authenticity||authenticity.shieldColour!==0)return {...base,type:'unavailable',text:'The sender identity or device is not verified. Verify it before displaying this message.'};
  const content=event.getContent();
  if(event.getType()==='m.room.message')return {...base,type:'text',text:cleanString(content.body),replyToId:content['m.relates_to']?.['m.in_reply_to']?.event_id||null,edited:content['m.relates_to']?.rel_type==='m.replace',replaces:content['m.relates_to']?.event_id||null};
  if(event.getType()==='io.voidline.reaction')return {...base,type:'reaction',text:cleanString(content.reaction,16),target:cleanString(content.target,300)};
  return null;
 }
 async function timeline(roomId){const {ticket,room}=await requireEncrypted(roomId);const result=[];for(const event of room.getLiveTimeline().getEvents().slice(-(historyLimits.get(roomId)||150))){const data=await normalizeEvent(event,ticket);if(data)result.push(data);}unchanged(ticket);return result;}
 async function older(roomId){const {ticket,room}=await requireEncrypted(roomId);await ticket.client.scrollback(room,50);unchanged(ticket);historyLimits.set(roomId,(historyLimits.get(roomId)||150)+50);return timeline(roomId);}
 async function encryptedSend(roomId,type,content,clientId){
  const {ticket}=await requireEncrypted(roomId,{verify:true});
  const txn=clientId||ticket.client.makeTxnId(),key=roomId+'|'+txn,prior=outbox.get(key),fingerprint=JSON.stringify([type,content]);
  if(prior&&prior.fingerprint!==fingerprint)throw fail('VOID_RETRY_CONFLICT','This retry ID belongs to a different message.');
  if(prior?.result)return prior.result;if(prior?.promise)return prior.promise;
  const record=prior||{fingerprint};outbox.set(key,record);
  record.promise=(async()=>{
   try{
    const pending=ticket.client.getRoom(roomId)?.getPendingEvents?.().find(event=>event.getTxnId?.()===txn);
    const response=pending?await ticket.client.resendEvent(pending,ticket.client.getRoom(roomId)):await ticket.client.sendEvent(roomId,type,content,txn);
    unchanged(ticket);record.result={id:response.event_id,clientId:txn,status:'sent'};return record.result;
   }catch(error){throw safeError(error);}finally{record.promise=null;}
  })();return record.promise;
 }
 function sendText(roomId,text,{replyToId=null,clientId}={}){if(typeof text!=='string'||!text.trim()||text.length>4000)throw fail('VOID_TEXT','Write a message of 1–4,000 characters.');const content={msgtype:'m.text',body:text};if(replyToId)content['m.relates_to']={'m.in_reply_to':{event_id:replyToId}};return encryptedSend(roomId,'m.room.message',content,clientId);}
 function react(roomId,eventId,emoji,{clientId}={}){if(typeof emoji!=='string'||!emoji||emoji.length>16)throw fail('VOID_REACTION','Choose a short reaction.');return encryptedSend(roomId,'io.voidline.reaction',{reaction:emoji,target:eventId},clientId);}
 async function edit(roomId,eventId,text,{clientId}={}){const {room}=await requireEncrypted(roomId);const source=room.findEventById(eventId);if(!source||source.getSender()!==state.userId)throw fail('VOID_OWNERSHIP','Only your own loaded message can be edited.');if(typeof text!=='string'||!text.trim()||text.length>4000)throw fail('VOID_TEXT','Write a message of 1–4,000 characters.');return encryptedSend(roomId,'m.room.message',{msgtype:'m.text',body:'* '+text,'m.new_content':{msgtype:'m.text',body:text},'m.relates_to':{rel_type:'m.replace',event_id:eventId}},clientId);}
 async function deleteMessage(roomId,eventId){const {ticket,room}=await requireEncrypted(roomId,{verify:true});const event=room.findEventById(eventId);if(!event||event.getSender()!==state.userId)throw fail('VOID_OWNERSHIP','Only your own loaded message can be deleted.');const result=await ticket.client.redactEvent(roomId,eventId);unchanged(ticket);return result;}
 async function fingerprint(){const ticket=current(),keys=await ticket.client.getCrypto().getOwnDeviceKeys();unchanged(ticket);return {userId:state.userId,deviceId:state.deviceId,...keys};}
 async function devices(userId=state.userId){const ticket=current(),crypto=ticket.client.getCrypto(),info=await crypto.getUserDeviceInfo([userId],true);const list=[];let sessions={devices:[]};if(userId===state.userId)sessions=await ticket.client.getDevices();for(const device of info.get(userId)?.values()||[]){const trust=await crypto.getDeviceVerificationStatus(userId,device.deviceId);const session=sessions.devices.find(s=>s.device_id===device.deviceId);list.push({userId,deviceId:device.deviceId,name:cleanString(device.displayName||device.deviceId,100),fingerprint:device.getFingerprint(),verified:!!trust?.isVerified(),current:userId===state.userId&&device.deviceId===state.deviceId,lastSeenAt:session?.last_seen_ts||null});}unchanged(ticket);return list;}
 async function verifyFingerprint(userId,deviceId,expected){const ticket=current(),crypto=ticket.client.getCrypto(),info=await crypto.getUserDeviceInfo([userId],true),device=info.get(userId)?.get(deviceId);unchanged(ticket);if(!device||device.getFingerprint()?.replace(/\s/g,'')!==String(expected).replace(/\s/g,''))throw fail('VOID_FINGERPRINT','The fingerprints do not match. Verification was not changed.');await crypto.setDeviceVerified(userId,deviceId,true);unchanged(ticket);return true;}
 function emitVerification(record,extra={}){if(record.epoch===epoch&&client)options.onVerification?.({...verificationSnapshot(record),...extra});}
 function verificationSnapshot(record){const request=record.request,callbacks=record.verifier?.getShowSasCallbacks();return {id:record.id,userId:request.otherUserId,deviceId:request.otherDeviceId,phase:request.phase,emoji:callbacks?.sas.emoji,decimal:callbacks?.sas.decimal,canAccept:request.pending&&!request.initiatedByMe&&!request.accepting,canStart:request.methods?.includes('m.sas.v1')&&!record.verifier,error:record.error||''};}
 function trackVerification(request){const id=request.transactionId||crypto.randomUUID();if(requests.has(id))return id;const record={id,request,verifier:null,epoch};requests.set(id,record);subscribe(request,'change',()=>{if(request.verifier&&!record.verifier)attachVerifier(record,request.verifier);emitVerification(record);});if(request.verifier)attachVerifier(record,request.verifier);emitVerification(record);return id;}
 function attachVerifier(record,verifier){if(record.verifier===verifier)return;record.verifier=verifier;subscribe(verifier,'show_sas',()=>emitVerification(record));verifier.verify().then(()=>emitVerification(record,{done:true})).catch(()=>{record.error='Verification was cancelled, timed out, or failed.';emitVerification(record);});}
 async function requestVerification(userId,deviceId){const ticket=current(),request=deviceId?await ticket.client.getCrypto().requestDeviceVerification(userId,deviceId):await ticket.client.getCrypto().requestOwnUserVerification();unchanged(ticket);return trackVerification(request);}
 async function acceptVerification(id){const record=requests.get(id);if(!record)throw fail('VOID_VERIFICATION','This verification request expired.');await record.request.accept();return verificationSnapshot(record);}
 async function startVerification(id){const record=requests.get(id);if(!record)throw fail('VOID_VERIFICATION','This verification request expired.');const verifier=await record.request.startVerification('m.sas.v1');attachVerifier(record,verifier);return verificationSnapshot(record);}
 async function confirmVerification(id,matches){const record=requests.get(id),callbacks=record?.verifier?.getShowSasCallbacks();if(!callbacks)throw fail('VOID_VERIFICATION','No comparison is ready.');if(matches===true)await callbacks.confirm();else callbacks.mismatch();}
 async function setupRecovery({onRecoveryKey,auth}={}){
  const ticket=current(),crypto=ticket.client.getCrypto();
  const existingBackup=await crypto.getKeyBackupInfo();unchanged(ticket);const existingIdentity=await crypto.userHasCrossSigningKeys();unchanged(ticket);
  if(existingBackup||existingIdentity)throw fail('VOID_RECOVERY_EXISTS','This identity already has security keys. Verify with a trusted device or restore its recovery key; existing keys were not reset.');
  const generated=await crypto.createRecoveryKeyFromPassphrase();
  try{
   unchanged(ticket);
   if(typeof onRecoveryKey!=='function'||await onRecoveryKey(generated.encodedPrivateKey)!==true)throw fail('VOID_RECOVERY_CANCELLED','Recovery setup was cancelled before creating a backup.');
   unchanged(ticket);setSecret(generated.privateKey,ticket.epoch);
   await crypto.bootstrapSecretStorage({createSecretStorageKey:async()=>generated,setupNewKeyBackup:true});unchanged(ticket);
   await crypto.bootstrapCrossSigning({authUploadDeviceSigningKeys:async makeRequest=>{unchanged(ticket);try{return await makeRequest(auth);}catch{throw fail('VOID_REAUTH','The homeserver requires reauthentication before it can publish identity keys.');}}});unchanged(ticket);
   await crypto.checkKeyBackupAndEnable();unchanged(ticket);const ready=await crypto.isSecretStorageReady();unchanged(ticket);const crossSigningReady=await crypto.isCrossSigningReady();unchanged(ticket);return {ready,crossSigningReady};
  }finally{generated.privateKey.fill(0);eraseSecret(ticket.epoch);}
 }
 async function restoreRecovery(encoded){const ticket=current(),crypto=ticket.client.getCrypto();try{setSecret(deps.decodeRecoveryKey(encoded),ticket.epoch);await crypto.bootstrapCrossSigning({authUploadDeviceSigningKeys:async()=>{throw fail('VOID_REAUTH','Existing signing keys could not be recovered; no keys were reset.');}});unchanged(ticket);await crypto.loadSessionBackupPrivateKeyFromSecretStorage();unchanged(ticket);const result=await crypto.restoreKeyBackup();unchanged(ticket);return result;}catch(error){throw safeError(error);}finally{eraseSecret(ticket.epoch);}}
 async function securityStatus(){const ticket=current(),crypto=ticket.client.getCrypto();const [storage,crossSigning,backup]=await Promise.all([crypto.getSecretStorageStatus(),crypto.getCrossSigningStatus(),crypto.getKeyBackupInfo()]);unchanged(ticket);return {storageReady:storage.ready,crossSigning,hasBackup:!!backup};}
 async function revokeDevice(deviceId,auth){const ticket=current();if(deviceId===state.deviceId)throw fail('VOID_CURRENT_DEVICE','Use Sign out of encrypted messaging to revoke this session. Local keys are retained.');await ticket.client.deleteDevice(deviceId,auth);unchanged(ticket);for(const room of ticket.client.getRooms()){const encrypted=await ticket.client.getCrypto().isEncryptionEnabledInRoom(room.roomId);unchanged(ticket);if(encrypted){await ticket.client.getCrypto().forceDiscardSession(room.roomId);unchanged(ticket);}}return true;}
 return Object.freeze({connect,disconnect,status:()=>({...state}),listRooms,createRoom,timeline,older,sendText,react,edit,deleteMessage,devices,fingerprint,verifyFingerprint,requestVerification,acceptVerification,startVerification,confirmVerification,setupRecovery,restoreRecovery,securityStatus,revokeDevice});
}
const api=Object.freeze({create});
if(typeof window!=='undefined')window.VoidSecureMessenger=api;
export default api;
