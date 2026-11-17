/* Matrix is the complete transport/crypto protocol; VOIDLINE never receives a
 * room key. This module is loaded only after explicit account connection. */
import * as matrix from 'matrix-js-sdk';
import {initAsync as loadWasm,Attachment,EncryptedAttachment} from '@matrix-org/matrix-sdk-crypto-wasm';
import {decodeRecoveryKey} from 'matrix-js-sdk/lib/crypto-api/recovery-key.js';
import {AllDevicesIsolationMode} from 'matrix-js-sdk/lib/crypto-api/index.js';
import loglevel from 'loglevel';
import {openVault} from './secure-vault.js';
import {createLocalSaved} from './local-saved.js';
import {enrollEncryptedMessaging,getEncryptedEnrollmentStatus,clearEncryptedEnrollment} from './encrypted-enrollment.js';
export {createLocalSaved,enrollEncryptedMessaging,getEncryptedEnrollmentStatus,clearEncryptedEnrollment};

// SDK debugging is unsuitable for private chat content. No telemetry sink.
loglevel.disableAll(false);
const quiet = {trace(){},debug(){},info(){},warn(){},error(){},getChild(){return this;}};
const fail = (code,message) => Object.assign(new Error(message),{code});
const cleanString = (value,max=4000) => typeof value === 'string' ? value.slice(0,max) : '';
const MAX_FILE=8*1024*1024;
const MAX_PARTICIPANTS=16;
const RECOVERY_RECORD='recovery:setup.v1',PUBLIC_UPLOAD_RECORD='recovery:public-upload.v1';
const safeMime=value=>['image/png','image/jpeg','image/webp','image/gif','audio/ogg','audio/webm','audio/mp4','audio/mpeg','application/pdf','text/plain'].includes(String(value||'').split(';')[0])?String(value).split(';')[0]:'application/octet-stream';
const plainName=value=>String(value||'attachment').replace(/[\u0000-\u001f\u007f\\/]/g,'_').slice(0,255)||'attachment';
function validImage(bytes,mime){if(!mime.startsWith('image/'))return true;if(mime==='image/png')return bytes.length>8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);if(mime==='image/jpeg')return bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(mime==='image/gif')return new TextDecoder().decode(bytes.slice(0,6)).match(/^GIF8[79]a$/)!==null;if(mime==='image/webp')return new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';return false;}
const defaultDeps = {sdk:matrix,loadWasm,decodeRecoveryKey,AllDevicesIsolationMode,Attachment,EncryptedAttachment,vaultFactory:openVault,
 locks:globalThis.navigator?.locks,indexedDB:globalThis.indexedDB,
 fetch:(...args)=>globalThis.fetch(...args)};

function publicSigningPayload(raw,userId){
 if(!raw||!userId)return null;const payload={};
 for(const name of ['master_key','self_signing_key','user_signing_key']){
  const value=raw[name];if(!value)continue;
  if(value.user_id!==userId||!Array.isArray(value.usage)||!value.keys||typeof value.keys!=='object')throw fail('VOID_IDENTITY','Identity key publication does not match this messaging account.');
  payload[name]={user_id:value.user_id,usage:[...value.usage],keys:{...value.keys},...(value.signatures?{signatures:structuredClone(value.signatures)}:{})};
 }
 return Object.keys(payload).length?payload:null;
}

export function create(options={},injected={}) {
 const deps={...defaultDeps,...injected};
 let intent=0,client=null,epoch=0,releaseLock=null,lockPromise=null,secret=null,secretEpoch=-1,initializing=null,vault=null,tokenBinding='',savedRoomId=null,savedRoomOpening=null,mediaRequest=null,remoteSession=null,secretKeyId=null,recoveryJob=null;
 let state={phase:'locked',userId:null,deviceId:null,error:''};
 const requests=new Map(),outbox=new Map(),attachmentJobs=new Map(),historyLimits=new Map(),draftVersions=new Map(),draftCache=new Map(),listeners=[];
 const emitState=patch=>{state={...state,...patch};options.onState?.({...state});};
 const safeError=error=>error?.code?.startsWith('VOID_')?error:fail('VOID_CONNECTION','The encrypted service could not complete this action. Check the connection, device verification and homeserver reauthentication.');
 const current=()=>{if(!client||state.phase!=='ready')throw fail('VOID_LOCKED','Connect and unlock this device before using encrypted messaging.');return {client,epoch};};
 const unchanged=ticket=>{if(ticket.epoch!==epoch||ticket.client!==client)throw fail('VOID_ACCOUNT_CHANGED','The account changed. The previous operation was stopped.');};
 function subscribe(target,event,fn){target.on(event,fn);listeners.push(()=>target.off?.(event,fn));}
 function eraseSecret(owner){if(owner!==undefined&&owner!==secretEpoch)return;secret?.fill(0);secret=null;secretEpoch=-1;secretKeyId=null;}
 function setSecret(key,owner,keyId=null){eraseSecret();secret=Uint8Array.from(key);secretEpoch=owner;secretKeyId=keyId;}
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
  const cleanupEpoch=++epoch,old=client,pendingInit=initializing,oldRelease=releaseLock,oldLock=lockPromise,oldVault=vault,session=remoteSession;
  client=null;releaseLock=null;lockPromise=null;vault=null;tokenBinding='';savedRoomId=null;savedRoomOpening=null;mediaRequest=null;remoteSession=null;recoveryJob=null;oldVault?.close();
  for(const remove of listeners.splice(0))remove();
  old?.stopClient();
  for(const item of requests.values()){try{Promise.resolve(item.request.cancel()).catch(()=>{});}catch{}}
  requests.clear();outbox.clear();attachmentJobs.clear();historyLimits.clear();draftVersions.clear();draftCache.clear();eraseSecret();
  // Lock the local endpoint before awaiting any remote response.
  emitState({phase:'locked',userId:null,deviceId:null,error:'',revocation:revokeSession?'pending':'not-requested'});
  if(pendingInit){try{await pendingInit;}catch{}}
  old?.removeAllListeners?.();oldRelease?.();await oldLock;
  let revocation='not-requested';
  if(revokeSession){
   if(!session)revocation='unknown';
   else{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);let revoker;
    try{
     // A dedicated SDK client revokes only the old token. The stopped device's
     // guarded transport deliberately rejects actions after its epoch changes.
     revoker=deps.sdk.createClient({baseUrl:session.homeserver,accessToken:session.accessToken,logger:quiet,disableVoip:true,fetchFn:(input,init={})=>{
      const target=new URL(typeof input==='string'?input:input.url||String(input));
      if(target.origin!==session.homeserver||!/^\/_matrix\/client\/[^/]+\/logout$/.test(target.pathname))throw fail('VOID_ORIGIN','Session revocation cannot leave its homeserver or call another action.');
      return deps.fetch(input,{...init,signal:controller.signal,redirect:'error'});
     }});
     await revoker.logout();revocation='confirmed';
    }catch(error){revocation=error?.errcode==='M_UNKNOWN_TOKEN'?'confirmed':error?.name==='AbortError'?'unknown':'failed';}
    finally{clearTimeout(timer);revoker?.stopClient?.();revoker?.removeAllListeners?.();session.accessToken='';}
   }
  }
  const result={locked:true,revocation,...(revocation==='failed'||revocation==='unknown'?{retry:'Reconnect only to retry sign-out, or revoke this messaging device from another trusted device.'}:{})};
  if(cleanupEpoch===epoch)emitState({phase:'locked',userId:null,deviceId:null,error:revocation==='failed'||revocation==='unknown'?'Locked here. The service has not confirmed that its session was revoked.':'',revocation});
  return result;
 }
 async function disconnect(options={}){intent++;return clearConnection(options);}
 async function connect({homeserver,accountId,accessToken,storagePassword,expectedUserId,expectedDeviceId}){
  const myIntent=++intent;await clearConnection();
  if(myIntent!==intent)throw fail('VOID_ACCOUNT_CHANGED','A newer connection replaced this request.');
  const ticket=epoch,owns=()=>myIntent===intent&&ticket===epoch;
  try{
   const url=new URL(homeserver);
   if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw fail('VOID_HOMESERVER','Use the configured HTTPS homeserver origin.');
   if(!accountId||!accessToken||typeof storagePassword!=='string'||storagePassword.length<16)throw fail('VOID_CREDENTIALS','Provide the Matrix access token and a local vault passphrase of at least 16 characters.');
   if(!deps.indexedDB)throw fail('VOID_STORE_UNAVAILABLE','Encrypted device storage is unavailable in this browser.');
   emitState({phase:'connecting',error:''});
   let deviceKeysApproved=false;
   const guardedFetch=async(input,init)=>{
    const target=new URL(typeof input==='string'?input:input.url||String(input),url);
    if(!owns())throw fail('VOID_ACCOUNT_CHANGED','The encrypted connection was replaced.');
    if(target.origin!==url.origin)throw fail('VOID_ORIGIN','The encrypted connection tried to leave the configured homeserver.');
    // Matrix JS SDK deliberately leaves standard reactions unencrypted. This
    // adapter uses a custom encrypted content event and blocks every plaintext
    // /send path, including unknown future SDK fallback behavior.
    if(/\/keys\/upload$/.test(target.pathname)&&!deviceKeysApproved)throw fail('VOID_DEVICE_CONFLICT','Device identity must be checked before publishing keys.');
    const sending=target.pathname.match(/\/_matrix\/client\/[^/]+\/rooms\/[^/]+\/send\/([^/]+)\//);
    if(sending&&decodeURIComponent(sending[1])!=='m.room.encrypted')throw fail('VOID_PLAINTEXT','This action would send an unencrypted event and was blocked.');
    if(String(init?.method||'GET').toUpperCase()==='DELETE'&&/\/room_keys\/version(?:\/|$)/.test(target.pathname))throw fail('VOID_RECOVERY_RESET','Automatic backup replacement was blocked. Resume or restore the existing recovery backup instead.');
    const signing=/\/keys\/device_signing\/upload$/.test(target.pathname),requestVault=vault;
    if(signing&&requestVault){
     const raw=typeof init?.body==='string'?JSON.parse(init.body):null,payload=publicSigningPayload(raw,state.userId);
     if(payload)await requestVault.put(PUBLIC_UPLOAD_RECORD,{version:1,payload});
     if(!owns())throw fail('VOID_ACCOUNT_CHANGED','The encrypted connection was replaced.');
    }
    const response=await deps.fetch(input,init);
    if(signing&&requestVault&&response.ok&&owns())await requestVault.remove(PUBLIC_UPLOAD_RECORD);
    return response;
   };
   mediaRequest=(path,signal)=>guardedFetch(url.origin+path,{method:'GET',signal,cache:'no-store',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+accessToken}});
   const probe=deps.sdk.createClient({baseUrl:url.origin,accessToken,fetchFn:guardedFetch,logger:quiet,disableVoip:true});
   const identity=await probe.whoami();
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   const published=await probe.downloadKeysForUsers([identity.user_id]);probe.stopClient?.();
   const publishedKeys=published.device_keys?.[identity.user_id]?.[identity.device_id]?.keys||null;
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   if(!/^@[^:\s]+:[^\s]+$/.test(identity.user_id||'')||!identity.device_id)throw fail('VOID_IDENTITY','The token does not identify a Matrix account and device.');
   if(expectedUserId&&identity.user_id!==expectedUserId||expectedDeviceId&&identity.device_id!==expectedDeviceId)throw fail('VOID_IDENTITY','The messaging service returned a different account or device than the verified enrollment.');
   remoteSession={homeserver:url.origin,accessToken,userId:identity.user_id,deviceId:identity.device_id};
   const prefix='voidline.crypto.v1.'+encodeURIComponent([accountId,url.origin,identity.user_id,identity.device_id].join('|'));
   await lockStore(prefix,owns);
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   const localVault=await deps.vaultFactory({namespace:prefix,password:storagePassword,indexedDB:deps.indexedDB});
   if(!owns()){localVault.close();throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');}
   vault=localVault;
   tokenBinding=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(accessToken))),n=>n.toString(16).padStart(2,'0')).join('');
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   client=deps.sdk.createClient({baseUrl:url.origin,accessToken,userId:identity.user_id,deviceId:identity.device_id,
    fetchFn:guardedFetch,logger:quiet,disableVoip:true,timelineSupport:true,
    store:new deps.sdk.MemoryStore(),verificationMethods:['m.sas.v1'],
    cryptoCallbacks:{
     getSecretStorageKey:async({keys})=>{
      if(!owns()||secretEpoch!==ticket||!secret)return null;
      for(const [id,info]of Object.entries(keys))if(!secretKeyId||secretKeyId===id){
       if(activeClient.secretStorage?.checkKey&&!await activeClient.secretStorage.checkKey(secret,info))continue;
       if(!owns())return null;return [id,secret];
      }
      return null;
     },
     cacheSecretStorageKey:(id,_info,key)=>{if(owns())setSecret(key,ticket,id);}
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
   if(deps.sdk.ClientEvent.Room)subscribe(activeClient,deps.sdk.ClientEvent.Room,room=>{if(owns()&&client===activeClient)options.onEvent?.({type:'rooms-changed',roomId:room?.roomId});});
   if(deps.sdk.RoomEvent.MyMembership)subscribe(activeClient,deps.sdk.RoomEvent.MyMembership,(room,membership)=>{if(owns()&&client===activeClient)options.onEvent?.({type:'membership-changed',roomId:room?.roomId,membership});});
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
   if(users.length>MAX_PARTICIPANTS)throw fail('VOID_LIMIT','This conversation exceeds the supported participant limit. Remove excess participants before sending.');
   if(!users.includes(state.userId))throw fail('VOID_MEMBERSHIP','Your membership is no longer active.');
   const targets=room.getEncryptionTargetMembers?await room.getEncryptionTargetMembers():room.getJoinedMembers?.();unchanged(ticket);
   const cached=targets?.map(member=>member.userId).sort();
   if(cached&&JSON.stringify(cached)!==JSON.stringify([...users].sort())){await crypto.forceDiscardSession(roomId);unchanged(ticket);throw fail('VOID_MEMBERSHIP_SYNC','Membership changed. Wait for synchronization before sending.');}
   const info=await crypto.getUserDeviceInfo(users,true);unchanged(ticket);
   for(const userId of users){
    const devices=info.get(userId);if(!devices?.size)throw Object.assign(fail('VOID_UNVERIFIED','No encryption device is available for '+userId+'. Ask them to enroll their device.'),{details:{userId,deviceId:null,reason:'missing-device'}});
    const trust=await crypto.getUserVerificationStatus(userId);unchanged(ticket);
    if(trust.needsUserApproval||trust.wasCrossSigningVerified&&!trust.isVerified())throw fail('VOID_IDENTITY_CHANGED','A participant identity changed. Compare fingerprints again before sending.');
    for(const device of devices.values()){
     const verified=await crypto.getDeviceVerificationStatus(userId,device.deviceId);unchanged(ticket);
     if(!verified?.isVerified())throw Object.assign(fail('VOID_UNVERIFIED','Verify '+userId+' device '+device.deviceId+' in Devices and encryption before sending.'),{details:{userId,deviceId:device.deviceId,reason:'unverified-device'}});
    }
   }
  }
  unchanged(ticket);return {ticket,room,crypto};
 }
 async function listRooms(){
  const ticket=current(),result=[],direct=ticket.client.getAccountData?.('m.direct')?.getContent?.()||{},directIds=new Set(Object.values(direct).flatMap(ids=>Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[]));
  for(const room of ticket.client.getRooms())if(room.getMyMembership()==='join'&&await ticket.client.getCrypto().isEncryptionEnabledInRoom(room.roomId))result.push({id:room.roomId,name:cleanString(room.name,200),memberCount:room.getJoinedMemberCount(),unreadCount:room.getUnreadNotificationCount(),encrypted:true,isDirect:directIds.has(room.roomId)||!!room.getDMInviter?.()});
  unchanged(ticket);return result;
 }
 async function createRoom({name='',invites=[],isDirect=false}={}){
  const ticket=current();
  if(!Array.isArray(invites)||invites.length>MAX_PARTICIPANTS-1||invites.some(id=>!/^@[^:\s]+:[^\s]+$/.test(id)))throw fail('VOID_RECIPIENT','Use exact Matrix usernames, with at most 15 recipients.');
  if(new Set(invites).size!==invites.length||invites.some(id=>(ticket.client.getIgnoredUsers?.()||[]).includes(id)))throw fail('VOID_RECIPIENT','Choose distinct recipients who are not blocked in encrypted messaging.');
  if(isDirect&&(invites.length!==1||invites[0]===state.userId))throw fail('VOID_RECIPIENT','A direct conversation requires exactly one other Matrix user.');
  const result=await ticket.client.createRoom({name:cleanString(name,100)||undefined,invite:invites,is_direct:!!isDirect,visibility:'private',preset:'private_chat',initial_state:[
   {type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2',rotation_period_msgs:100,rotation_period_ms:86400000}},
   {type:'m.room.history_visibility',state_key:'',content:{history_visibility:'joined'}},
   {type:'m.room.guest_access',state_key:'',content:{guest_access:'forbidden'}}
  ]});unchanged(ticket);
  if(isDirect){try{const mapping=await ticket.client.getAccountDataFromServer('m.direct')||{};unchanged(ticket);const previous=Array.isArray(mapping[invites[0]])?mapping[invites[0]].filter(id=>typeof id==='string'):[];await ticket.client.setAccountData('m.direct',{...mapping,[invites[0]]:[...new Set([...previous,result.room_id])]});unchanged(ticket);}catch(error){unchanged(ticket);return {roomId:result.room_id,warning:'The conversation was created, but its direct-message organization could not be saved. It remains available in All.'};}}
  return {roomId:result.room_id};
 }
 function invitationState(room){
  const event=room?.currentState?.getStateEvents?.('m.room.encryption',''),content=event?.getContent?.()||{},membership=room?.currentState?.getStateEvents?.('m.room.member',state.userId),member=room?.getMember?.(state.userId);
  return {roomId:room?.roomId,name:cleanString(room?.name,200)||'Encrypted invitation',inviter:cleanString(membership?.getSender?.()||member?.events?.member?.getSender?.()||room?.getDMInviter?.(),300)||null,membership:room?.getMyMembership?.()||'unknown',isDirect:!!room?.getDMInviter?.(),algorithm:content.algorithm||null,security:content.algorithm==='m.megolm.v1.aes-sha2'?'encrypted-invitation':'unconfirmed',encrypted:content.algorithm==='m.megolm.v1.aes-sha2',history:'Earlier history is controlled by the conversation history policy. Accepting does not verify another device.'};
 }
 async function listInvitations(){
  const ticket=current(),ignored=new Set(ticket.client.getIgnoredUsers?.()||[]),rows=[];
  for(const room of ticket.client.getRooms())if(room.getMyMembership()==='invite'){const row=invitationState(room);if(!ignored.has(row.inviter))rows.push(row);}
  unchanged(ticket);return rows;
 }
 async function invitation(roomId){const ticket=current(),room=ticket.client.getRoom(roomId);if(!room||room.getMyMembership()!=='invite')throw fail('VOID_INVITATION','This invitation is no longer pending.');const row=invitationState(room);unchanged(ticket);return row;}
 async function acceptInvitation(roomId){
  const ticket=current(),preview=await invitation(roomId);unchanged(ticket);
  if(!preview.encrypted)throw fail('VOID_INVITATION_SECURITY','This invitation does not advertise supported encryption. It was not accepted. Ask the inviter to create an encrypted conversation.');
  if((ticket.client.getIgnoredUsers?.()||[]).includes(preview.inviter))throw fail('VOID_BLOCKED','Unblock this inviter deliberately before accepting their invitation.');
  await ticket.client.joinRoom(roomId);unchanged(ticket);
  try{
   const setting=await ticket.client.getStateEvent(roomId,'m.room.encryption','');unchanged(ticket);
   const members=await ticket.client.getJoinedRoomMembers(roomId);unchanged(ticket);
   if(setting?.algorithm!=='m.megolm.v1.aes-sha2'||!members.joined?.[state.userId]||Object.keys(members.joined||{}).length>MAX_PARTICIPANTS)throw fail('VOID_INVITATION_SECURITY','The service did not confirm supported encryption and membership.');
   if(!await ticket.client.getCrypto().isEncryptionEnabledInRoom(roomId))throw fail('VOID_INVITATION_SYNC','Membership was accepted, but encryption state has not synchronized. Wait for synchronization before opening messages.');
   unchanged(ticket);let warning;
   if(preview.isDirect&&preview.inviter){try{const mapping=await ticket.client.getAccountDataFromServer('m.direct')||{};unchanged(ticket);const previous=Array.isArray(mapping[preview.inviter])?mapping[preview.inviter].filter(id=>typeof id==='string'):[];await ticket.client.setAccountData('m.direct',{...mapping,[preview.inviter]:[...new Set([...previous,roomId])]});unchanged(ticket);}catch{unchanged(ticket);warning='Joined securely, but direct-message organization could not be saved. The conversation remains in All.';}}
   return {roomId,joined:true,encrypted:true,pendingSync:ticket.client.getRoom(roomId)?.getMyMembership()!=='join',verificationRequired:true,...(warning?{warning}:{})};
  }catch(error){
   unchanged(ticket);if(error?.code==='VOID_INVITATION_SYNC')throw error;
   let left=false;try{await ticket.client.leave(roomId);unchanged(ticket);left=true;}catch{unchanged(ticket);}
   throw fail('VOID_INVITATION_SECURITY',left?'The room did not confirm supported encryption. It was left without opening protected content.':'The room did not confirm supported encryption and was not opened. The service has not confirmed leaving it; review membership before retrying.');
  }
 }
 async function declineInvitation(roomId){const ticket=current();await invitation(roomId);unchanged(ticket);await ticket.client.leave(roomId);unchanged(ticket);return {roomId,declined:true};}
 async function blockUser(userId,{blocked=true}={}){const ticket=current();if(!/^@[^:\s]+:[^\s]+$/.test(userId)||userId===state.userId)throw fail('VOID_RECIPIENT','Choose another messaging identity to block.');const existing=ticket.client.getIgnoredUsers?.()||[],next=blocked?[...new Set([...existing,userId])]:existing.filter(id=>id!==userId);await ticket.client.setIgnoredUsers(next);unchanged(ticket);return {userId,blocked,scope:'This Matrix account. Shared group participants may still receive messages; blocking does not revoke their membership or keys.'};}
 async function leaveRoom(roomId){const ticket=current(),room=ticket.client.getRoom(roomId);if(!room||!['join','invite'].includes(room.getMyMembership()))throw fail('VOID_MEMBERSHIP','This account has no active membership to leave.');await ticket.client.leave(roomId);unchanged(ticket);const crypto=ticket.client.getCrypto();if(await crypto.isEncryptionEnabledInRoom(roomId)){unchanged(ticket);await crypto.forceDiscardSession(roomId);unchanged(ticket);}return {roomId,left:true,retainedHistory:'Other participants may retain earlier plaintext and keys.'};}
 async function roomMembers(roomId){
  const {ticket,room}=await requireEncrypted(roomId),[members,powers,pending]=await Promise.all([ticket.client.getJoinedRoomMembers(roomId),ticket.client.getStateEvent(roomId,'m.room.power_levels','').catch(error=>{if(error?.errcode==='M_NOT_FOUND')return {};throw error;}),ticket.client.members(roomId,'invite')]);unchanged(ticket);
  if(!Array.isArray(pending.chunk))throw fail('VOID_MEMBERSHIP_SYNC','The service did not confirm pending invitations.');
  const own=powers.users?.[state.userId]??powers.users_default??0,kick=powers.kick??50,invitePower=powers.invite??0,joined=Object.entries(members.joined||{}),invites=[...new Map(pending.chunk.filter(event=>event.content?.membership==='invite'&&/^@[^:\s]+:[^\s]+$/.test(event.state_key||'')).map(event=>[event.state_key,event])).values()];
  const canRemove=userId=>userId!==state.userId&&own>=kick&&own>(powers.users?.[userId]??powers.users_default??0);
  return {roomId,members:joined.slice(0,MAX_PARTICIPANTS).map(([userId,profile])=>({userId,name:cleanString(profile.display_name||room.getMember?.(userId)?.name||userId,200),power:powers.users?.[userId]??powers.users_default??0,current:userId===state.userId,canRemove:canRemove(userId)})),invitations:invites.slice(0,MAX_PARTICIPANTS).map(event=>({userId:event.state_key,name:cleanString(event.content.displayname||event.state_key,200),inviter:cleanString(event.sender,300)||null,canCancel:canRemove(event.state_key)})),memberCount:joined.length,invitationCount:invites.length,truncated:joined.length>MAX_PARTICIPANTS||invites.length>MAX_PARTICIPANTS,canInvite:own>=invitePower&&joined.length+invites.length<MAX_PARTICIPANTS,canLeave:true,maxParticipants:MAX_PARTICIPANTS};
 }
 async function inviteParticipant(roomId,userId){
  const {ticket,room}=await requireEncrypted(roomId);if(!/^@[^:\s]+:[^\s]+$/.test(userId)||userId===state.userId||(ticket.client.getIgnoredUsers?.()||[]).includes(userId))throw fail('VOID_RECIPIENT','Choose a different, unblocked messaging identity.');
  const summary=await roomMembers(roomId);unchanged(ticket);if(!summary.canInvite)throw fail('VOID_PERMISSION','Your current room role cannot invite participants.');
  const history=await ticket.client.getStateEvent(roomId,'m.room.history_visibility','');unchanged(ticket);
  if(history?.history_visibility!=='joined'||room.getHistoryVisibility?.()!=='joined')throw fail('VOID_HISTORY_SYNC','Inviting is paused until the joined-only history policy is confirmed and synchronized. Earlier protected history was not shared.');
  const data=await ticket.client.members(roomId);unchanged(ticket);if(!Array.isArray(data.chunk))throw fail('VOID_MEMBERSHIP_SYNC','The service did not confirm current participants.');
  const active=data.chunk.filter(event=>['join','invite'].includes(event.content?.membership));if(active.some(event=>event.state_key===userId))throw fail('VOID_RECIPIENT','This person is already joined or invited.');
  if(active.length>=MAX_PARTICIPANTS)throw fail('VOID_LIMIT','This conversation has reached its supported participant limit.');
  await ticket.client.invite(roomId,userId);unchanged(ticket);return {roomId,userId,invited:true,historyVisibility:'joined'};
 }
 async function cancelInvitation(roomId,userId){
  const {ticket}=await requireEncrypted(roomId);if(userId===state.userId)throw fail('VOID_PERMISSION','Use Leave for your own membership.');
  const [member,powers]=await Promise.all([ticket.client.getStateEvent(roomId,'m.room.member',userId),ticket.client.getStateEvent(roomId,'m.room.power_levels','')]);unchanged(ticket);
  const own=powers.users?.[state.userId]??powers.users_default??0,target=powers.users?.[userId]??powers.users_default??0;
  if(member?.membership!=='invite')throw fail('VOID_INVITATION','That invitation is no longer pending.');
  if(own<(powers.kick??50)||own<=target)throw fail('VOID_PERMISSION','Your current role cannot cancel this participant invitation.');
  await ticket.client.kick(roomId,userId,'Invitation cancelled');unchanged(ticket);return {roomId,userId,cancelled:true};
 }
 async function removeParticipant(roomId,userId,{reason=''}={}){
  const {ticket,crypto}=await requireEncrypted(roomId);if(userId===state.userId)throw fail('VOID_PERMISSION','Use Leave to remove your own membership.');
  const summary=await roomMembers(roomId);unchanged(ticket);const target=summary.members.find(member=>member.userId===userId);
  if(!target?.canRemove)throw fail('VOID_PERMISSION','Your current room role cannot remove this participant.');
  await ticket.client.kick(roomId,userId,cleanString(reason,200)||undefined);unchanged(ticket);await crypto.forceDiscardSession(roomId);unchanged(ticket);return {roomId,userId,removed:true,synchronizationRequired:true};
 }
 async function normalizeEvent(event,ticket){
  const id=event.getId(),base={id,sender:cleanString(event.getSender(),300),senderName:cleanString(event.sender?.name||ticket.client.getUser?.(event.getSender())?.displayName||event.getSender(),200),time:event.getTs()};
  if(event.isRedacted())return {...base,type:'deleted',text:'Message deleted.'};
  // Unencrypted content in an encrypted room is never displayed as private.
  if(!event.isEncrypted())return null;
  try{await ticket.client.decryptEventIfNeeded(event);unchanged(ticket);}catch{return {...base,type:'unavailable',text:'Message could not be decrypted on this device.'};}
  if(event.isDecryptionFailure?.())return {...base,type:'unavailable',text:'Message could not be decrypted or its device identity is untrusted.'};
  const authenticity=await ticket.client.getCrypto().getEncryptionInfoForEvent(event);unchanged(ticket);
  if(!authenticity||authenticity.shieldColour!==0)return {...base,type:'unavailable',text:'The sender identity or device is not verified. Verify it before displaying this message.'};
  const content=event.getOriginalContent?.()||event.getContent(),relation=content['m.relates_to']||{},editing=relation.rel_type==='m.replace',actual=editing&&content['m.new_content']?content['m.new_content']:content,actualRelation=actual['m.relates_to']||relation;
  if(event.getType()==='m.room.message'){
   const attachment=actual.file&&actual.file.v==='v2'?{name:cleanString(actual.filename||actual.body,255),mime:safeMime(actual.info?.mimetype),size:Number.isSafeInteger(actual.info?.size)?actual.info.size:null,kind:actual.msgtype==='m.image'?'image':actual.msgtype==='m.audio'?'audio':'file',durationMs:Number.isFinite(actual.info?.duration)?actual.info.duration:null}:null;
   return {...base,type:'text',text:attachment?'':cleanString(actual.body),replyToId:actualRelation['m.in_reply_to']?.event_id||null,threadRootId:actualRelation.rel_type==='m.thread'?actualRelation.event_id:null,edited:editing,replaces:editing?relation.event_id:null,...(attachment?{attachment,hasAttachment:true}:{})};
  }
  if(event.getType()==='io.voidline.reaction')return {...base,type:'reaction',text:cleanString(content.reaction,16),target:cleanString(content.target,300),active:content.active!==false};
  if(event.getType()==='io.voidline.saved')return {...base,type:content.kind==='bookmark'?'bookmark':'note',...(content.kind==='bookmark'?{sourceRoomId:cleanString(content.sourceRoomId,300),sourceEventId:cleanString(content.sourceEventId,300)}:{text:cleanString(content.text)})};
  return null;
 }
 function reconcileEvents(rows){
  const messages=new Map(),reactionStates=new Map();
  for(const row of rows)if(row.type!=='reaction'&&!row.replaces)messages.set(row.id,{...row,reactions:[],threadCount:0});
  for(const row of rows){
   if(row.replaces){const source=messages.get(row.replaces);if(source&&source.type!=='deleted'&&source.sender===row.sender&&row.time>=source.time&&(!source.editedAt||row.time>=source.editedAt)){Object.assign(source,{text:row.text,edited:true,editedAt:row.time});if(row.attachment)Object.assign(source,{attachment:row.attachment,hasAttachment:true});else{delete source.attachment;delete source.hasAttachment;}}}
   if(row.type==='reaction')reactionStates.set(row.target+'|'+row.sender+'|'+row.text,row);
  }
  for(const row of reactionStates.values()){
   const source=messages.get(row.target);if(!source||source.type==='deleted'||!row.active)continue;
   let reaction=source.reactions.find(r=>r.emoji===row.text);if(!reaction){reaction={emoji:row.text,count:0,mine:false};source.reactions.push(reaction);}reaction.count++;if(row.sender===state.userId)reaction.mine=true;
  }
  for(const message of messages.values()){
   if(message.replyToId){const source=messages.get(message.replyToId);message.replyPreview=source?{id:source.id,sender:source.sender,text:source.type==='deleted'?'Message deleted.':source.text,unavailable:source.type==='unavailable',deleted:source.type==='deleted'}:null;}
   if(message.threadRootId&&message.type!=='deleted'){const root=messages.get(message.threadRootId);if(root)root.threadCount++;}
  }
  return [...messages.values()];
 }
 async function timeline(roomId){const {ticket,room}=await requireEncrypted(roomId);const result=[];for(const event of room.getLiveTimeline().getEvents().slice(-(historyLimits.get(roomId)||150))){const data=await normalizeEvent(event,ticket);if(data)result.push(data);}unchanged(ticket);return reconcileEvents(result);}
 async function older(roomId){const {ticket,room}=await requireEncrypted(roomId);await ticket.client.scrollback(room,50);unchanged(ticket);historyLimits.set(roomId,(historyLimits.get(roomId)||150)+50);return timeline(roomId);}
 const draftKey=(roomId,threadRootId)=>'draft:'+encodeURIComponent(roomId)+':'+encodeURIComponent(threadRootId||'');
 function privateStore(ticket){unchanged(ticket);if(!vault?.isUnlocked())throw fail('VOID_VAULT_LOCKED','Unlock encrypted local storage before using this conversation.');return vault;}
 async function saveDraft(roomId,draft={}){
  const text=typeof draft.text==='string'?draft.text:'';
  if(text.length>4000)throw fail('VOID_TEXT','Drafts contain at most 4,000 characters.');
  const threadRootId=draft.threadRootId||null,key=draftKey(roomId,threadRootId),version=(draftVersions.get(key)||0)+1;draftVersions.set(key,version);
  const value={roomId,threadRootId,text,replyToId:typeof draft.replyToId==='string'?draft.replyToId:null,pending:draft.pending?{text:cleanString(draft.pending.text),clientId:cleanString(draft.pending.clientId,100),replyToId:cleanString(draft.pending.replyToId,300)||null,threadRootId:cleanString(draft.pending.threadRootId,300)||threadRootId}:null,updatedAt:Date.now()};
  draftCache.set(key,value);
  const {ticket}=await requireEncrypted(roomId),store=privateStore(ticket);if(version!==draftVersions.get(key))return {saved:false,superseded:true};
  await store.put(key,value);unchanged(ticket);return {saved:version===draftVersions.get(key),superseded:version!==draftVersions.get(key)};
 }
 async function getDraft(roomId,{threadRootId=null}={}){const {ticket}=await requireEncrypted(roomId),key=draftKey(roomId,threadRootId),persisted=await privateStore(ticket).get(key);unchanged(ticket);return draftCache.get(key)||persisted||{roomId,threadRootId,text:'',replyToId:null,pending:null};}
 async function clearDraft(roomId,{threadRootId=null}={}){const key=draftKey(roomId,threadRootId),version=(draftVersions.get(key)||0)+1;draftVersions.set(key,version);draftCache.set(key,{roomId,threadRootId,text:'',replyToId:null,pending:null});const {ticket}=await requireEncrypted(roomId);if(version!==draftVersions.get(key))return {saved:false,superseded:true};await privateStore(ticket).remove(key);unchanged(ticket);return {saved:version===draftVersions.get(key)};}
 async function listDrafts(){const ticket=current(),store=privateStore(ticket),rows=new Map();for(const id of await store.list('draft:')){const value=await store.get(id);unchanged(ticket);if(value)rows.set(id,value);}for(const [id,value]of draftCache)rows.set(id,value);return [...rows.values()].filter(value=>value.text||value.pending);}
 async function pendingSends(roomId){const {ticket}=await requireEncrypted(roomId),store=privateStore(ticket),rows=[];for(const id of await store.list('outbox:')){const value=await store.get(id);unchanged(ticket);if(value?.roomId===roomId&&!value.result)rows.push({roomId,clientId:value.clientId,type:value.type,text:cleanString(value.content?.body),hasAttachment:!!value.content?.file,replyToId:value.content?.['m.relates_to']?.['m.in_reply_to']?.event_id||null,threadRootId:value.content?.['m.relates_to']?.rel_type==='m.thread'?value.content['m.relates_to'].event_id:null,createdAt:value.createdAt,requiresOriginalSession:value.tokenBinding!==tokenBinding});}return rows;}
 async function retryPending(roomId,clientId){const {ticket}=await requireEncrypted(roomId),record=await privateStore(ticket).get('outbox:'+encodeURIComponent(roomId)+'|'+clientId);unchanged(ticket);if(!record)throw fail('VOID_RETRY_MISSING','This pending send is no longer available.');if(record.result)return record.result;return encryptedSend(roomId,record.type,record.content,clientId);}
 async function encryptedSend(roomId,type,content,clientId){
  const {ticket}=await requireEncrypted(roomId,{verify:true});
  const store=privateStore(ticket),txn=clientId||ticket.client.makeTxnId();
  if(typeof txn!=='string'||!/^[A-Za-z0-9_.~-]{1,150}$/.test(txn))throw fail('VOID_RETRY_ID','Use a valid stable message identifier.');
  const key=encodeURIComponent(roomId)+'|'+txn,persisted=outbox.get(key)||await store.get('outbox:'+key),fingerprint=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([type,content])))),n=>n.toString(16).padStart(2,'0')).join('');unchanged(ticket);
  const prior=outbox.get(key)||persisted;
  if(prior&&prior.fingerprint!==fingerprint)throw fail('VOID_RETRY_CONFLICT','This retry ID belongs to a different message.');
  if(prior?.result)return prior.result;if(prior?.promise)return prior.promise;
  if(prior&&prior.tokenBinding!==tokenBinding)throw fail('VOID_RETRY_SESSION_CHANGED','This unconfirmed send belongs to a different Matrix session. Reconnect the original dedicated device token to retry safely; sending it as a new message may duplicate it.');
  const record=prior||{fingerprint,roomId,clientId:txn,type,content,tokenBinding,createdAt:Date.now()};outbox.set(key,record);
  record.promise=(async()=>{
   try{
    // Save the intended payload and transaction ID before the SDK can transmit.
    // Only ciphertext is written to IndexedDB by the local vault.
    await store.put('outbox:'+key,{fingerprint,roomId,clientId:txn,type,content,tokenBinding:record.tokenBinding,createdAt:record.createdAt});unchanged(ticket);
    const pending=ticket.client.getRoom(roomId)?.getPendingEvents?.().find(event=>event.getTxnId?.()===txn);
    const response=pending?await ticket.client.resendEvent(pending,ticket.client.getRoom(roomId)):await ticket.client.sendEvent(roomId,type,content,txn);
    unchanged(ticket);if(typeof response?.event_id!=='string')throw fail('VOID_ACK','The messaging server did not acknowledge this event. Retry with the same message ID.');
    record.result={id:response.event_id,clientId:txn,status:'sent'};
    try{await store.put('outbox:'+key,{fingerprint,roomId,clientId:txn,tokenBinding:record.tokenBinding,createdAt:record.createdAt,result:record.result});unchanged(ticket);}catch(error){unchanged(ticket);record.result={...record.result,storageWarning:'The server saved this message, but its local receipt could not be persisted. Keep the original session for any retry.'};}
    return record.result;
   }catch(error){throw safeError(error);}finally{record.promise=null;}
  })();return record.promise;
 }
 function sendText(roomId,text,{replyToId=null,threadRootId=null,clientId}={}){if(typeof text!=='string'||!text.trim()||text.length>4000)throw fail('VOID_TEXT','Write a message of 1–4,000 characters.');const content={msgtype:'m.text',body:text};if(threadRootId)content['m.relates_to']={rel_type:'m.thread',event_id:threadRootId,is_falling_back:true,'m.in_reply_to':{event_id:replyToId||threadRootId}};else if(replyToId)content['m.relates_to']={'m.in_reply_to':{event_id:replyToId}};return encryptedSend(roomId,'m.room.message',content,clientId);}
 function react(roomId,eventId,emoji,{clientId,active=true}={}){if(typeof emoji!=='string'||!emoji||emoji.length>16)throw fail('VOID_REACTION','Choose a short reaction.');return encryptedSend(roomId,'io.voidline.reaction',{reaction:emoji,target:eventId,active:active!==false},clientId);}
 async function edit(roomId,eventId,text,{clientId}={}){const {room}=await requireEncrypted(roomId);const source=room.findEventById(eventId);if(!source||source.getSender()!==state.userId)throw fail('VOID_OWNERSHIP','Only your own loaded message can be edited.');if(typeof text!=='string'||!text.trim()||text.length>4000)throw fail('VOID_TEXT','Write a message of 1–4,000 characters.');return encryptedSend(roomId,'m.room.message',{msgtype:'m.text',body:'* '+text,'m.new_content':{msgtype:'m.text',body:text},'m.relates_to':{rel_type:'m.replace',event_id:eventId}},clientId);}
 async function deleteMessage(roomId,eventId){const {ticket,room}=await requireEncrypted(roomId);const event=room.findEventById(eventId);if(!event||event.getSender()!==state.userId)throw fail('VOID_OWNERSHIP','Only your own loaded message can be deleted.');const result=await ticket.client.redactEvent(roomId,eventId);unchanged(ticket);return result;}
 async function jumpToEvent(roomId,eventId){
  const {ticket,room}=await requireEncrypted(roomId);let event=room.findEventById(eventId);
  await requireSourceMembership(roomId,ticket);
  if(!event){const raw=await ticket.client.fetchRoomEvent(roomId,eventId);unchanged(ticket);if(raw.room_id&&raw.room_id!==roomId)throw fail('VOID_SOURCE','This source does not belong to the requested conversation.');event=ticket.client.getEventMapper?.()({...raw,room_id:roomId})||new deps.sdk.MatrixEvent({...raw,room_id:roomId});}
  const result=await normalizeEvent(event,ticket);unchanged(ticket);if(!result)throw fail('VOID_SOURCE','This protected message is unavailable.');
  if(result.type==='text'&&ticket.client.relations){
   const related=await ticket.client.relations(roomId,eventId,'m.replace','m.room.message',{limit:50,dir:'b'});unchanged(ticket);const refreshed=related.originalEvent?await normalizeEvent(related.originalEvent,ticket):result;unchanged(ticket);const rows=[refreshed||result];let unavailable=false;
   for(const edit of related.events||[]){const row=await normalizeEvent(edit,ticket);if(row?.type==='unavailable')unavailable=true;else if(row)rows.push(row);unchanged(ticket);}
   return {...reconcileEvents(rows)[0],...(unavailable?{editsUnavailable:true}:{})};
  }
  return result;
 }
 async function requireSourceMembership(roomId,ticket){const members=await ticket.client.getJoinedRoomMembers(roomId);unchanged(ticket);if(!members.joined?.[state.userId])throw fail('VOID_MEMBERSHIP','This source is no longer available to your account.');}
 async function getRoomPermissions(roomId){const {room}=await requireEncrypted(roomId),power=room.getMember?.(state.userId)?.powerLevel??0;return {canPin:!!room.currentState?.maySendStateEvent?.('m.room.pinned_events',state.userId),canRedact:!!room.currentState?.maySendEvent?.('m.room.redaction',state.userId)&&!!room.currentState?.hasSufficientPowerLevelFor?.('redact',power),canSend:!!room.currentState?.maySendEvent?.('m.room.encrypted',state.userId),userId:state.userId};}
 async function getPins(roomId){const {ticket}=await requireEncrypted(roomId);let content;try{content=await ticket.client.getStateEvent(roomId,'m.room.pinned_events','');}catch(error){if(error?.errcode==='M_NOT_FOUND')return [];throw safeError(error);}unchanged(ticket);const ids=Array.isArray(content.pinned)?content.pinned.filter(id=>typeof id==='string').slice(0,50):[];const result=[];for(const id of ids){try{result.push(await jumpToEvent(roomId,id));}catch{result.push({id,type:'unavailable',text:'Pinned source unavailable.'});}unchanged(ticket);}return result;}
 async function setPinned(roomId,eventId,active=true){
  const {ticket,room}=await requireEncrypted(roomId);if(!room.currentState?.maySendStateEvent?.('m.room.pinned_events',state.userId))throw fail('VOID_PERMISSION','Your room role cannot change community pins.');
  await jumpToEvent(roomId,eventId);unchanged(ticket);let content={pinned:[]};try{content=await ticket.client.getStateEvent(roomId,'m.room.pinned_events','');}catch(error){if(error?.errcode!=='M_NOT_FOUND')throw safeError(error);}unchanged(ticket);
  const ids=Array.isArray(content.pinned)?content.pinned.filter(id=>typeof id==='string').slice(0,50):[],pinned=active?[...new Set([...ids,eventId])]:ids.filter(id=>id!==eventId);
  if(pinned.length>50)throw fail('VOID_LIMIT','This room has reached its 50-pin limit. Remove a pin first.');const result=await ticket.client.sendStateEvent(roomId,'m.room.pinned_events',{pinned},'');unchanged(ticket);return result;
 }
 function mxcParts(value){const match=/^mxc:\/\/([A-Za-z0-9.\[\]:_-]+)\/([A-Za-z0-9_-]{1,500})$/.exec(value||'');if(!match)throw fail('VOID_ATTACHMENT','This encrypted attachment reference is invalid.');return match.slice(1);}
 async function sendAttachment(roomId,file,{clientId,signal,onProgress,voice=false,durationMs=null,replyToId=null,threadRootId=null}={}){
  const {ticket}=await requireEncrypted(roomId,{verify:true}),store=privateStore(ticket),txn=clientId||ticket.client.makeTxnId();
  if(!file||typeof file.arrayBuffer!=='function'||!Number.isInteger(file.size)||file.size<1||file.size>MAX_FILE)throw fail('VOID_FILE_SIZE','Choose a file between 1 byte and 8 MB.');
  if(!/^[A-Za-z0-9_.~-]{1,150}$/.test(txn))throw fail('VOID_RETRY_ID','Use a valid stable attachment identifier.');
  const key='upload:'+encodeURIComponent(roomId)+'|'+txn,name=plainName(file.name),mime=safeMime(file.type);
  let plain=new Uint8Array(await file.arrayBuffer());try{unchanged(ticket);if(plain.byteLength!==file.size||!validImage(plain,mime)){plain.fill(0);throw fail('VOID_FILE_TYPE','The file contents do not match the supported image type or declared size.');}
  const digest=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',plain)),n=>n.toString(16).padStart(2,'0')).join('');unchanged(ticket);
  const fingerprint=JSON.stringify([name,mime,file.size,digest,!!voice,durationMs,replyToId,threadRootId]);
  const active=attachmentJobs.get(key);if(active){if(active.fingerprint!==fingerprint)throw fail('VOID_RETRY_CONFLICT','This attachment retry belongs to a different file.');return active.promise;}
  // Reserve before the first vault read: concurrent retries must share exactly
  // one ciphertext, upload descriptor and eventual message transaction.
  const job={fingerprint,promise:null};attachmentJobs.set(key,job);
  job.promise=(async()=>{
  let uploaded=await store.get(key);unchanged(ticket);if(uploaded&&uploaded.fingerprint!==fingerprint)throw fail('VOID_RETRY_CONFLICT','This attachment retry belongs to a different file.');
  if(!uploaded){
   if(signal?.aborted)throw fail('VOID_CANCELLED','The upload was cancelled.');
   let encrypted;
   try{
    encrypted=deps.Attachment.encrypt(plain);const descriptor=JSON.parse(encrypted.mediaEncryptionInfo),bytes=encrypted.encryptedData;
    plain.fill(0);plain=null;
    if(signal?.aborted)throw fail('VOID_CANCELLED','The upload was cancelled.');
    const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
    try{
     onProgress?.({loaded:0,total:file.size,phase:'uploading'});
     const response=await ticket.client.uploadContent(new Blob([bytes],{type:'application/octet-stream'}),{includeFilename:false,type:'application/octet-stream',abortController:controller,progressHandler:progress=>{if(ticket.epoch===epoch&&ticket.client===client)onProgress?.({loaded:progress.loaded,total:progress.total||file.size,phase:'uploading'});}});unchanged(ticket);
     mxcParts(response.content_uri);uploaded={fingerprint,file:{...descriptor,url:response.content_uri}};
     await store.put(key,uploaded);unchanged(ticket);onProgress?.({loaded:file.size,total:file.size,phase:'uploaded'});
    }finally{signal?.removeEventListener('abort',cancel);bytes.fill(0);}
   }catch(error){if(signal?.aborted)throw fail('VOID_CANCELLED','The upload was cancelled. If the server received bytes before cancellation, they remain encrypted and unreferenced.');throw safeError(error);}finally{plain?.fill(0);encrypted?.free();}
  }
  plain?.fill(0);
  if(signal?.aborted)throw fail('VOID_CANCELLED','The upload was cancelled before sending its message.');
  const kind=mime.startsWith('image/')?'m.image':mime.startsWith('audio/')?'m.audio':'m.file',content={msgtype:kind,body:name,filename:name,file:uploaded.file,info:{mimetype:mime,size:file.size,...(Number.isFinite(durationMs)&&durationMs>=0?{duration:Math.min(durationMs,600000)}:{})}};
  if(voice&&kind==='m.audio'){content['org.matrix.msc3245.voice']={};content['org.matrix.msc1767.audio']={duration:content.info.duration||0,waveform:[]};}
  if(threadRootId)content['m.relates_to']={rel_type:'m.thread',event_id:threadRootId,is_falling_back:true,'m.in_reply_to':{event_id:replyToId||threadRootId}};else if(replyToId)content['m.relates_to']={'m.in_reply_to':{event_id:replyToId}};
  return encryptedSend(roomId,'m.room.message',content,txn);
  })();
  try{return await job.promise;}finally{if(attachmentJobs.get(key)===job)attachmentJobs.delete(key);}
  }finally{plain?.fill(0);}
 }
 async function downloadAttachment(roomId,eventId,{signal,onProgress}={}){
  const {ticket,room}=await requireEncrypted(roomId);let event=room.findEventById(eventId);if(!event){const raw=await ticket.client.fetchRoomEvent(roomId,eventId);unchanged(ticket);event=new deps.sdk.MatrixEvent({...raw,room_id:roomId});}
  await requireSourceMembership(roomId,ticket);
  const normalized=await normalizeEvent(event,ticket);unchanged(ticket);if(!normalized?.attachment||normalized.type==='unavailable')throw fail('VOID_ATTACHMENT','Verify the source device before downloading this attachment.');
  const content=event.getOriginalContent?.()||event.getContent(),descriptor=content.file,[serverName,mediaId]=mxcParts(descriptor?.url),fetchMedia=mediaRequest;
  if(normalized.attachment.size>MAX_FILE||!fetchMedia)throw fail('VOID_FILE_SIZE','This attachment is larger than this client supports.');
  const response=await fetchMedia('/_matrix/client/v1/media/download/'+encodeURIComponent(serverName)+'/'+encodeURIComponent(mediaId),signal);unchanged(ticket);
  if(!response.ok||Number(response.headers.get('content-length')||0)>MAX_FILE+65536)throw fail('VOID_ATTACHMENT','The encrypted attachment could not be downloaded within the size limit.');
  const reader=response.body?.getReader();if(!reader)throw fail('VOID_ATTACHMENT','The encrypted download is unavailable.');const chunks=[];let size=0;
  for(;;){const {done,value}=await reader.read();unchanged(ticket);if(done)break;size+=value.length;if(size>MAX_FILE+65536){await reader.cancel();throw fail('VOID_FILE_SIZE','The encrypted attachment exceeds the download limit.');}chunks.push(value);onProgress?.({loaded:size,total:normalized.attachment.size,phase:'downloading'});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let encrypted,plain;try{const {url,...info}=descriptor;encrypted=new deps.EncryptedAttachment(bytes,JSON.stringify(info));plain=deps.Attachment.decrypt(encrypted);unchanged(ticket);if(plain.length>MAX_FILE)throw fail('VOID_FILE_SIZE','This decrypted attachment exceeds the limit.');const mime=validImage(plain,normalized.attachment.mime)?normalized.attachment.mime:'application/octet-stream';return {blob:new Blob([plain],{type:mime}),name:plainName(normalized.attachment.name),mime};}catch(error){if(error.code?.startsWith('VOID_'))throw error;throw fail('VOID_ATTACHMENT_TAMPERED','The attachment failed integrity verification. It was not opened.');}finally{bytes.fill(0);plain?.fill(0);encrypted?.free();}
 }
 async function savedRoom(options={}){
  if(savedRoomOpening){await savedRoomOpening;return savedRoom(options);}
  const opening=openSavedRoom(options);savedRoomOpening=opening;
  try{return await opening;}finally{if(savedRoomOpening===opening)savedRoomOpening=null;}
 }
 async function openSavedRoom({create=true}={}){
  const ticket=current();if(!savedRoomId){const pointer=await ticket.client.getAccountDataFromServer('io.voidline.saved_room');unchanged(ticket);savedRoomId=typeof pointer?.roomId==='string'?pointer.roomId:null;}
  if(!savedRoomId&&!create)return {ticket,roomId:null};
  if(!savedRoomId){const result=await createRoom({name:'Saved',invites:[],isDirect:false});unchanged(ticket);savedRoomId=result.roomId;await ticket.client.setAccountData('io.voidline.saved_room',{roomId:savedRoomId});unchanged(ticket);}
  const result=await requireEncrypted(savedRoomId),members=await ticket.client.getJoinedRoomMembers(savedRoomId);unchanged(ticket);if(Object.keys(members.joined||{}).length!==1||!members.joined[state.userId])throw fail('VOID_SAVED_PRIVACY','Saved is not an encrypted self-only conversation. No private note was sent.');return {ticket,...result,roomId:savedRoomId};
 }
 async function saveNote(text,{clientId}={}){if(typeof text!=='string'||!text.trim()||text.length>4000)throw fail('VOID_TEXT','Write a note of 1–4,000 characters.');const {roomId}=await savedRoom();return encryptedSend(roomId,'io.voidline.saved',{kind:'note',text},clientId);}
 async function saveMessage(sourceRoomId,sourceEventId,{clientId}={}){const message=await jumpToEvent(sourceRoomId,sourceEventId);if(message.type==='unavailable'||message.type==='deleted')throw fail('VOID_SOURCE','This source cannot be bookmarked.');const {roomId}=await savedRoom();return encryptedSend(roomId,'io.voidline.saved',{kind:'bookmark',sourceRoomId,sourceEventId},clientId);}
 async function savedMessages(){const {ticket,roomId}=await savedRoom({create:false});if(!roomId)return {roomId:null,messages:[],scope:'Loaded encrypted Saved history'};const messages=await timeline(roomId),results=[];for(const row of messages){if(row.type==='bookmark'){try{const source=await jumpToEvent(row.sourceRoomId,row.sourceEventId);results.push({...row,source,...(source.type==='deleted'||source.type==='unavailable'?{unavailable:true}:{})});}catch{results.push({...row,unavailable:true});}}else if(row.type==='note'||row.type==='deleted')results.push(row);unchanged(ticket);}return {roomId,messages:results,scope:'Loaded encrypted Saved history'};}
 async function removeSaved(eventId){const {roomId}=await savedRoom();return deleteMessage(roomId,eventId);}
 async function search(roomId,{q='',author='',after=null,before=null,has=null}={}){const rows=await timeline(roomId);const term=String(q).trim().toLocaleLowerCase();if(after!==null&&!Number.isFinite(after)||before!==null&&!Number.isFinite(before)||after!==null&&before!==null&&after>=before)throw fail('VOID_SEARCH_DATE','Use valid ordered date bounds.');if(has&&!['file','image','link'].includes(has))throw fail('VOID_SEARCH_FILTER','Choose files, images or links for this loaded-history search.');const messages=rows.filter(m=>m.type==='text'&&(!term||((m.text||'')+' '+(m.attachment?.name||'')+' '+m.sender).toLocaleLowerCase().includes(term))&&(!author||m.sender===author)&&(after===null||m.time>=after)&&(before===null||m.time<before)&&(!has||has==='file'&&m.hasAttachment||has==='image'&&m.attachment?.kind==='image'||has==='link'&&/https?:\/\//i.test(m.text||'')));return {messages,total:messages.length,loaded:rows.length,scope:'Loaded decrypted history in this conversation only; load earlier messages to search more.'};}
 async function fingerprint(){const ticket=current(),keys=await ticket.client.getCrypto().getOwnDeviceKeys();unchanged(ticket);return {userId:state.userId,deviceId:state.deviceId,...keys};}
 async function devices(userId=state.userId){const ticket=current(),crypto=ticket.client.getCrypto(),info=await crypto.getUserDeviceInfo([userId],true);const list=[];let sessions={devices:[]};if(userId===state.userId)sessions=await ticket.client.getDevices();for(const device of info.get(userId)?.values()||[]){const trust=await crypto.getDeviceVerificationStatus(userId,device.deviceId);const session=sessions.devices.find(s=>s.device_id===device.deviceId);list.push({userId,deviceId:device.deviceId,name:cleanString(device.displayName||device.deviceId,100),fingerprint:device.getFingerprint(),verified:!!trust?.isVerified(),current:userId===state.userId&&device.deviceId===state.deviceId,lastSeenAt:session?.last_seen_ts||null});}unchanged(ticket);return list;}
 async function verifyFingerprint(userId,deviceId,expected){const ticket=current(),crypto=ticket.client.getCrypto(),info=await crypto.getUserDeviceInfo([userId],true),device=info.get(userId)?.get(deviceId);unchanged(ticket);if(!device||device.getFingerprint()?.replace(/\s/g,'')!==String(expected).replace(/\s/g,''))throw fail('VOID_FINGERPRINT','The fingerprints do not match. Verification was not changed.');await crypto.setDeviceVerified(userId,deviceId,true);unchanged(ticket);return true;}
 function emitVerification(record,extra={}){if(record.epoch===epoch&&client)options.onVerification?.({...verificationSnapshot(record),...extra});}
 function verificationSnapshot(record){const request=record.request,callbacks=record.verifier?.getShowSasCallbacks();return {id:record.id,userId:request.otherUserId,deviceId:request.otherDeviceId,phase:request.phase,emoji:callbacks?.sas.emoji,decimal:callbacks?.sas.decimal,canAccept:request.pending&&!request.initiatedByMe&&!request.accepting,canStart:request.methods?.includes('m.sas.v1')&&!record.verifier,error:record.error||''};}
 function trackVerification(request){const id=request.transactionId||crypto.randomUUID();if(requests.has(id))return id;const record={id,request,verifier:null,epoch};requests.set(id,record);subscribe(request,'change',()=>{if(request.verifier&&!record.verifier)attachVerifier(record,request.verifier);emitVerification(record);});if(request.verifier)attachVerifier(record,request.verifier);emitVerification(record);return id;}
 function attachVerifier(record,verifier){if(record.verifier===verifier)return;record.verifier=verifier;subscribe(verifier,'show_sas',()=>emitVerification(record));verifier.verify().then(()=>emitVerification(record,{done:true})).catch(()=>{record.error='Verification was cancelled, timed out, or failed.';emitVerification(record);});}
 async function requestVerification(userId=state.userId,deviceId){const ticket=current();if(!/^@[^:\s]+:[^\s]+$/.test(userId)||!deviceId&&userId!==state.userId)throw fail('VOID_RECIPIENT','Choose the exact other device to verify, or verify your own account.');const request=deviceId?await ticket.client.getCrypto().requestDeviceVerification(userId,deviceId):await ticket.client.getCrypto().requestOwnUserVerification();unchanged(ticket);return trackVerification(request);}
 function verificationRecord(id,ticket){const record=requests.get(id);if(!record||record.epoch!==ticket.epoch)throw fail('VOID_VERIFICATION','This verification request expired.');return record;}
 async function acceptVerification(id){const ticket=current(),record=verificationRecord(id,ticket);await record.request.accept();unchanged(ticket);return verificationSnapshot(verificationRecord(id,ticket));}
 async function startVerification(id){const ticket=current(),record=verificationRecord(id,ticket),verifier=await record.request.startVerification('m.sas.v1');unchanged(ticket);verificationRecord(id,ticket);attachVerifier(record,verifier);return verificationSnapshot(record);}
 async function confirmVerification(id,matches){const ticket=current(),record=verificationRecord(id,ticket),callbacks=record.verifier?.getShowSasCallbacks();if(!callbacks)throw fail('VOID_VERIFICATION','No comparison is ready.');if(matches===true)await callbacks.confirm();else await callbacks.mismatch();unchanged(ticket);}
 function recoveryProgress(onProgress,stage,extra={}){const value={stage,...extra};onProgress?.(value);return value;}
 function authChallenge(error){
  const data=error?.data||error?.body;
  if(!data||typeof data.session!=='string'||!Array.isArray(data.flows))return null;
  return {session:data.session,flows:data.flows.filter(flow=>Array.isArray(flow?.stages)).map(flow=>({stages:flow.stages.filter(stage=>typeof stage==='string')})),completed:Array.isArray(data.completed)?data.completed.filter(stage=>typeof stage==='string'):[]};
 }
 async function authenticatedRequest(ticket,makeRequest,{auth,authenticate,operation}={}){
  let supplied=auth;
  for(let attempt=0;attempt<3;attempt++){
   unchanged(ticket);
   try{const result=await makeRequest(supplied);unchanged(ticket);return result;}
   catch(error){
    unchanged(ticket);const challenge=authChallenge(error);
    if(!challenge)throw safeError(error);
    const dummy=challenge.flows.find(flow=>flow.stages.every(stage=>stage==='m.login.dummy'||challenge.completed.includes(stage)));
    if(dummy){supplied={type:'m.login.dummy',session:challenge.session};continue;}
    if(typeof authenticate!=='function')throw fail('VOID_REAUTH','The homeserver requires another sign-in step. Recovery is saved locally and can be resumed without resetting existing keys.');
    const base=remoteSession?.homeserver;
    const stages=[...new Set(challenge.flows.flatMap(flow=>flow.stages))],fallbacks=base?stages.filter(stage=>['m.login.sso','org.matrix.login.sso'].includes(stage)).map(stage=>({stage,url:base.replace(/\/$/,'')+'/_matrix/client/v3/auth/'+encodeURIComponent(stage)+'/fallback/web?session='+encodeURIComponent(challenge.session)})):[];
    supplied=await authenticate({operation,challenge,fallbacks});unchanged(ticket);
    if(!supplied||typeof supplied!=='object'||Array.isArray(supplied))throw fail('VOID_REAUTH_CANCELLED','Sign-in was cancelled. Recovery can be resumed without replacing keys.');
    if(supplied.session!==undefined&&supplied.session!==challenge.session)throw fail('VOID_REAUTH','The sign-in session changed. Restart this recovery step.');
    supplied={...supplied,session:challenge.session};
   }
  }
  throw fail('VOID_REAUTH','The service has not completed its sign-in challenge. Recovery is retained and has not been reset.');
 }
 async function recoveryState(ticket){
  const crypto=ticket.client.getCrypto(),[storage,crossSigning,backup,identity,activeBackup]=await Promise.all([crypto.getSecretStorageStatus(),crypto.getCrossSigningStatus(),crypto.getKeyBackupInfo(),crypto.userHasCrossSigningKeys(),crypto.getActiveSessionBackupVersion()]);unchanged(ticket);
  const privateKeys=crossSigning.privateKeysCachedLocally||{},privateKeysCached=!!(privateKeys.masterKey&&privateKeys.selfSigningKey&&privateKeys.userSigningKey),crossSigningReady=await crypto.isCrossSigningReady();unchanged(ticket);
  return {storage,crossSigning,backup,identity,activeBackup,privateKeysCached,crossSigningReady};
 }
 async function validateRecoveryKey(ticket,key,keyId){
  const storage=ticket.client.secretStorage;
  if(!keyId||!storage?.getKey||!storage?.checkKey)return;
  const result=await storage.getKey(keyId);unchanged(ticket);
  if(!result||!await storage.checkKey(key,result[1]))throw fail('VOID_RECOVERY_KEY','That recovery key does not unlock the current secret storage. Existing keys were not changed.');
  unchanged(ticket);
 }
 async function performRecovery({onRecoveryKey,onProgress,encodedRecoveryKey,auth,authenticate}={}){
  const ticket=current(),crypto=ticket.client.getCrypto(),store=privateStore(ticket);let generated=null,journal=await store.get(RECOVERY_RECORD);unchanged(ticket);
  let inspection=await recoveryState(ticket);unchanged(ticket);
  const summary=()=>({ready:!!inspection.storage.ready,crossSigningReady:inspection.crossSigningReady,hasBackup:!!inspection.backup,backupEnabled:!!inspection.activeBackup,recoveryVerified:false});
  if(inspection.storage.ready&&inspection.crossSigningReady&&inspection.activeBackup&&!journal){return {...recoveryProgress(onProgress,'backup-enabled',summary()),verificationRequired:true};}
  recoveryProgress(onProgress,journal?.stage||'not-started',summary());
  if(journal&&journal.version!==1)throw fail('VOID_RECOVERY_STATE','This device has an unsupported recovery setup record. Existing keys were not replaced.');
  if(journal?.keyId&&inspection.storage.defaultKeyId!==journal.keyId)throw fail('VOID_RECOVERY_CHANGED','The account recovery key changed on another device. Use its current recovery key or a trusted device before continuing.');
  if(inspection.identity&&!inspection.privateKeysCached&&!inspection.crossSigning.privateKeysInSecretStorage)throw fail('VOID_RECOVERY_KEY_REQUIRED','This account already has signing keys. Verify with a trusted device or restore the existing recovery key; its identity will not be reset.');
  try{
   if(encodedRecoveryKey){
    const key=deps.decodeRecoveryKey(encodedRecoveryKey);try{await validateRecoveryKey(ticket,key,inspection.storage.defaultKeyId);journal={version:1,keyAcknowledged:true,key:Array.from(key),keyId:inspection.storage.defaultKeyId,stage:'key-acknowledged'};}finally{key.fill(0);}
    await store.put(RECOVERY_RECORD,journal);unchanged(ticket);
   }
   if(!journal){
    if(inspection.storage.defaultKeyId)throw fail('VOID_RECOVERY_KEY_REQUIRED','Enter the existing message recovery key to resume setup. No backup or identity was reset.');
    generated=await crypto.createRecoveryKeyFromPassphrase();unchanged(ticket);
    if(typeof onRecoveryKey!=='function'||await onRecoveryKey(generated.encodedPrivateKey)!==true)throw fail('VOID_RECOVERY_CANCELLED','Recovery setup was cancelled before publishing a recovery key.');
    unchanged(ticket);journal={version:1,keyAcknowledged:true,key:Array.from(generated.privateKey),keyId:null,stage:'key-acknowledged'};
    await store.put(RECOVERY_RECORD,journal);unchanged(ticket);
   }
   if(!journal.keyAcknowledged||!Array.isArray(journal.key)||journal.key.length!==32)throw fail('VOID_RECOVERY_STATE','This device cannot resume recovery safely. Restore the existing recovery key instead.');
   setSecret(Uint8Array.from(journal.key),ticket.epoch,journal.keyId||inspection.storage.defaultKeyId);
   await validateRecoveryKey(ticket,secret,inspection.storage.defaultKeyId);unchanged(ticket);
   recoveryProgress(onProgress,'key-acknowledged',summary());
   // Never reset an existing secret store or backup. Filling missing secrets is
   // the SDK's idempotent bootstrap operation, with both reset flags omitted.
   const keyMaterial=generated||{privateKey:secret,keyInfo:{}};
   await crypto.bootstrapSecretStorage({createSecretStorageKey:async()=>keyMaterial});unchanged(ticket);
   inspection=await recoveryState(ticket);unchanged(ticket);
   if(!inspection.storage.defaultKeyId)throw fail('VOID_RECOVERY_INCOMPLETE','The service has not confirmed its recovery-key store. Retry this saved setup.');
   journal.keyId=inspection.storage.defaultKeyId;journal.stage='secret-storage-ready';secretKeyId=journal.keyId;await store.put(RECOVERY_RECORD,journal);unchanged(ticket);
   recoveryProgress(onProgress,'secret-storage-ready',summary());
   // The pinned SDK may retain private signing keys after a failed upload and
   // then skip that upload during another bootstrap. Replay only the original
   // sanitized public signing payload through its maintained public API.
   const pending=await store.get(PUBLIC_UPLOAD_RECORD);unchanged(ticket);
   if(pending?.payload){
    const payload=publicSigningPayload(pending.payload,state.userId);if(!payload)throw fail('VOID_RECOVERY_STATE','The pending identity publication is unavailable.');
    const published=await ticket.client.downloadKeysForUsers([state.userId]);unchanged(ticket);
    for(const [field,section]of [['master_key','master_keys'],['self_signing_key','self_signing_keys'],['user_signing_key','user_signing_keys']]){const existing=published[section]?.[state.userId];if(existing&&payload[field]&&JSON.stringify(Object.entries(existing.keys||{}).sort())!==JSON.stringify(Object.entries(payload[field].keys||{}).sort()))throw fail('VOID_IDENTITY_CHANGED','Another device published a different signing identity. Existing keys were not replaced; verify that device before resuming.');}
    await authenticatedRequest(ticket,value=>ticket.client.uploadDeviceSigningKeys(value,payload),{auth,authenticate,operation:'publish-signing-identity'});unchanged(ticket);
    await store.remove(PUBLIC_UPLOAD_RECORD);unchanged(ticket);await crypto.userHasCrossSigningKeys();unchanged(ticket);
   }
   await crypto.bootstrapCrossSigning({authUploadDeviceSigningKeys:makeRequest=>authenticatedRequest(ticket,makeRequest,{auth,authenticate,operation:'publish-signing-identity'})});unchanged(ticket);
   if(typeof crypto.crossSignDevice==='function'){await crypto.crossSignDevice(state.deviceId);unchanged(ticket);}
   await crypto.bootstrapSecretStorage({});unchanged(ticket);
   inspection=await recoveryState(ticket);unchanged(ticket);
   if(!inspection.crossSigningReady)throw fail('VOID_RECOVERY_INCOMPLETE','Signing identity is not ready yet. Resume after homeserver sign-in and synchronization; existing keys are retained.');
   journal.stage='signing-identity-ready';await store.put(RECOVERY_RECORD,journal);unchanged(ticket);recoveryProgress(onProgress,'signing-identity-ready',summary());
   const backup=await crypto.getKeyBackupInfo();unchanged(ticket);
   if(!backup){await crypto.bootstrapSecretStorage({setupNewKeyBackup:true});unchanged(ticket);}
   else{await crypto.bootstrapSecretStorage({});unchanged(ticket);}
   await crypto.loadSessionBackupPrivateKeyFromSecretStorage();unchanged(ticket);
   await crypto.checkKeyBackupAndEnable();unchanged(ticket);
   inspection=await recoveryState(ticket);unchanged(ticket);
   if(!inspection.activeBackup||!inspection.storage.ready)throw fail('VOID_RECOVERY_INCOMPLETE','Recovery material is retained, but the service has not enabled its backup. Retry or restore using the existing recovery key.');
   journal.stage='backup-enabled';await store.put(RECOVERY_RECORD,journal);unchanged(ticket);recoveryProgress(onProgress,'backup-enabled',summary());
   await store.remove(RECOVERY_RECORD);unchanged(ticket);
   return {...summary(),stage:'backup-enabled',verificationRequired:true};
  }catch(error){
   // If the SDK generated signing keys but failed before dispatching its public
   // upload, preserve only a public projection that it confirms matches the
   // local private identity. Never derive or export private signing material.
   try{
    unchanged(ticket);
    if(journal&&!await store.get(PUBLIC_UPLOAD_RECORD)&&typeof crypto.getUserCrossSigningKeys==='function'&&typeof crypto.getCrossSigningKeyId==='function'){
     const id=await crypto.getCrossSigningKeyId();unchanged(ticket);const keys=id?await crypto.getUserCrossSigningKeys(state.userId):null;unchanged(ticket);
     if(keys&&Object.values(keys.master_key?.keys||{}).includes(id)){const payload=publicSigningPayload(keys,state.userId);if(payload)await store.put(PUBLIC_UPLOAD_RECORD,{version:1,payload});unchanged(ticket);}
    }
   }catch{/* The original failure remains authoritative; no reset is attempted. */}
   throw safeError(error);
  }
  finally{generated?.privateKey?.fill(0);journal?.key?.fill(0);eraseSecret(ticket.epoch);}
 }
 async function setupRecovery(options={}){if(recoveryJob){if(recoveryJob.type!=='setup')throw fail('VOID_RECOVERY_BUSY','Finish the current recovery action before starting another.');return recoveryJob.promise;}const promise=performRecovery(options),record={type:'setup',promise};recoveryJob=record;try{return await promise;}finally{if(recoveryJob===record)recoveryJob=null;}}
 async function restoreRecovery(encoded){if(recoveryJob)throw fail('VOID_RECOVERY_BUSY','Finish the current recovery action before starting another.');const promise=performRestore(encoded),record={type:'restore',promise};recoveryJob=record;try{return await promise;}finally{if(recoveryJob===record)recoveryJob=null;}}
 async function performRestore(encoded){
  const ticket=current(),crypto=ticket.client.getCrypto();
  try{
   const storage=await crypto.getSecretStorageStatus();unchanged(ticket);setSecret(deps.decodeRecoveryKey(encoded),ticket.epoch,storage.defaultKeyId);await validateRecoveryKey(ticket,secret,storage.defaultKeyId);unchanged(ticket);
   const cross=await crypto.getCrossSigningStatus();unchanged(ticket);
   if(!cross.privateKeysInSecretStorage)throw fail('VOID_RECOVERY_KEY_REQUIRED','Existing signing keys are not available through this recovery store. Use another trusted device; no keys were reset.');
   await crypto.bootstrapCrossSigning({authUploadDeviceSigningKeys:async()=>{throw fail('VOID_REAUTH','Existing signing keys could not be recovered; no keys were reset.');}});unchanged(ticket);
   if(!await crypto.isCrossSigningReady())throw fail('VOID_RECOVERY_INCOMPLETE','The existing signing identity is not ready. Resume its pending setup without resetting keys.');unchanged(ticket);
   await crypto.loadSessionBackupPrivateKeyFromSecretStorage();unchanged(ticket);const result=await crypto.restoreKeyBackup();unchanged(ticket);
   const inspection=await recoveryState(ticket);unchanged(ticket);
   await privateStore(ticket).put('recovery:verified.v1',{version:1,verifiedAt:Date.now(),keyId:inspection.storage.defaultKeyId,backupVersion:inspection.backup?.version||null});unchanged(ticket);
   await privateStore(ticket).remove(RECOVERY_RECORD);unchanged(ticket);
   return {...result,recoveryVerified:true};
  }catch(error){throw safeError(error);}finally{eraseSecret(ticket.epoch);}
 }
 async function securityStatus(){const ticket=current(),inspection=await recoveryState(ticket),pending=await privateStore(ticket).get(RECOVERY_RECORD),verified=await privateStore(ticket).get('recovery:verified.v1');unchanged(ticket);const recoveryVerified=!!verified?.verifiedAt&&verified.keyId===inspection.storage.defaultKeyId&&verified.backupVersion===(inspection.backup?.version||null);return {storageReady:!!inspection.storage.ready,secretStorageReady:!!inspection.storage.defaultKeyId,crossSigning:inspection.crossSigning,crossSigningReady:inspection.crossSigningReady,hasBackup:!!inspection.backup,backupEnabled:!!inspection.activeBackup,recoveryVerified,recoveryStage:pending?.stage||(recoveryVerified?'recovery-verified':inspection.activeBackup&&inspection.storage.ready&&inspection.crossSigningReady?'backup-enabled':'not-started'),canResume:!!pending};}
 async function revokeDevice(deviceId,authOrOptions){
  const ticket=current(),settings=authOrOptions?.authenticate||authOrOptions?.auth?authOrOptions:{auth:authOrOptions};
  if(deviceId===state.deviceId)throw fail('VOID_CURRENT_DEVICE','Use Sign out of encrypted messaging to revoke this session. Local keys are retained.');
  await authenticatedRequest(ticket,auth=>ticket.client.deleteDevice(deviceId,auth),{...settings,operation:'revoke-device'});unchanged(ticket);
  for(const room of ticket.client.getRooms()){const encrypted=await ticket.client.getCrypto().isEncryptionEnabledInRoom(room.roomId);unchanged(ticket);if(encrypted){await ticket.client.getCrypto().forceDiscardSession(room.roomId);unchanged(ticket);}}
  return {deviceId,revoked:true,synchronizationRequired:true};
 }
 return Object.freeze({connect,disconnect,status:()=>({...state}),listRooms,listInvitations,invitation,acceptInvitation,declineInvitation,blockUser,leaveRoom,roomMembers,inviteParticipant,cancelInvitation,removeParticipant,createRoom,timeline,older,sendText,react,edit,deleteMessage,jumpToEvent,getRoomPermissions,getPins,setPinned,sendAttachment,downloadAttachment,saveDraft,getDraft,listDrafts,clearDraft,pendingSends,retryPending,saveNote,saveMessage,savedMessages,listSaved:savedMessages,removeSaved,search,devices,fingerprint,verifyFingerprint,requestVerification,acceptVerification,startVerification,confirmVerification,setupRecovery,restoreRecovery,securityStatus,revokeDevice});
}
const api=Object.freeze({create,createLocalSaved,enrollEncryptedMessaging,getEncryptedEnrollmentStatus,clearEncryptedEnrollment,limits:Object.freeze({maxParticipants:MAX_PARTICIPANTS,maxInvites:MAX_PARTICIPANTS-1})});
if(typeof window!=='undefined')window.VoidSecureMessenger=api;
export default api;
