/* Matrix is the complete transport/crypto protocol; VOIDLINE never receives a
 * room key. This module is loaded only after explicit account connection. */
import * as matrix from 'matrix-js-sdk';
import {initAsync as loadWasm,Attachment,EncryptedAttachment} from '@matrix-org/matrix-sdk-crypto-wasm';
import {decodeRecoveryKey} from 'matrix-js-sdk/lib/crypto-api/recovery-key.js';
import {AllDevicesIsolationMode} from 'matrix-js-sdk/lib/crypto-api/index.js';
import loglevel from 'loglevel';
import {openVault} from './secure-vault.js';
import {createLocalSaved} from './local-saved.js';
export {createLocalSaved};

// SDK debugging is unsuitable for private chat content. No telemetry sink.
loglevel.disableAll(false);
const quiet = {trace(){},debug(){},info(){},warn(){},error(){},getChild(){return this;}};
const fail = (code,message) => Object.assign(new Error(message),{code});
const cleanString = (value,max=4000) => typeof value === 'string' ? value.slice(0,max) : '';
const MAX_FILE=8*1024*1024;
const safeMime=value=>['image/png','image/jpeg','image/webp','image/gif','audio/ogg','audio/webm','audio/mp4','audio/mpeg','application/pdf','text/plain'].includes(String(value||'').split(';')[0])?String(value).split(';')[0]:'application/octet-stream';
const plainName=value=>String(value||'attachment').replace(/[\u0000-\u001f\u007f\\/]/g,'_').slice(0,255)||'attachment';
function validImage(bytes,mime){if(!mime.startsWith('image/'))return true;if(mime==='image/png')return bytes.length>8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);if(mime==='image/jpeg')return bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(mime==='image/gif')return new TextDecoder().decode(bytes.slice(0,6)).match(/^GIF8[79]a$/)!==null;if(mime==='image/webp')return new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';return false;}
const defaultDeps = {sdk:matrix,loadWasm,decodeRecoveryKey,AllDevicesIsolationMode,Attachment,EncryptedAttachment,vaultFactory:openVault,
 locks:globalThis.navigator?.locks,indexedDB:globalThis.indexedDB,
 fetch:(...args)=>globalThis.fetch(...args)};

export function create(options={},injected={}) {
 const deps={...defaultDeps,...injected};
 let intent=0,client=null,epoch=0,releaseLock=null,lockPromise=null,secret=null,secretEpoch=-1,initializing=null,vault=null,tokenBinding='',savedRoomId=null,savedRoomOpening=null,mediaRequest=null;
 let state={phase:'locked',userId:null,deviceId:null,error:''};
 const requests=new Map(),outbox=new Map(),attachmentJobs=new Map(),historyLimits=new Map(),draftVersions=new Map(),draftCache=new Map(),listeners=[];
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
  const cleanupEpoch=++epoch;const old=client,pendingInit=initializing,oldRelease=releaseLock,oldLock=lockPromise,oldVault=vault;client=null;releaseLock=null;lockPromise=null;vault=null;tokenBinding='';savedRoomId=null;savedRoomOpening=null;mediaRequest=null;oldVault?.close();
  for(const remove of listeners.splice(0))remove();
  old?.stopClient();
  for(const item of requests.values()){try{Promise.resolve(item.request.cancel()).catch(()=>{});}catch{}}
  requests.clear();outbox.clear();attachmentJobs.clear();historyLimits.clear();draftVersions.clear();draftCache.clear();eraseSecret();
  if(pendingInit){try{await pendingInit;}catch{}}
  if(old){try{old.stopClient();if(revokeSession)await old.logout();}catch{}old.removeAllListeners?.();}
  oldRelease?.();await oldLock;
  if(cleanupEpoch===epoch)emitState({phase:'locked',userId:null,deviceId:null,error:''});
 }
 async function disconnect(options={}){intent++;return clearConnection(options);}
 async function connect({homeserver,accountId,accessToken,storagePassword}){
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
   mediaRequest=(path,signal)=>guardedFetch(url.origin+path,{method:'GET',signal,cache:'no-store',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+accessToken}});
   const probe=deps.sdk.createClient({baseUrl:url.origin,accessToken,fetchFn:guardedFetch,logger:quiet,disableVoip:true});
   const identity=await probe.whoami();
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   const published=await probe.downloadKeysForUsers([identity.user_id]);probe.stopClient?.();
   const publishedKeys=published.device_keys?.[identity.user_id]?.[identity.device_id]?.keys||null;
   if(!owns())throw fail('VOID_ACCOUNT_CHANGED','Connection was cancelled.');
   if(!/^@[^:\s]+:[^\s]+$/.test(identity.user_id||'')||!identity.device_id)throw fail('VOID_IDENTITY','The token does not identify a Matrix account and device.');
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
  const ticket=current(),result=[],direct=ticket.client.getAccountData?.('m.direct')?.getContent?.()||{},directIds=new Set(Object.values(direct).flatMap(ids=>Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[]));
  for(const room of ticket.client.getRooms())if(room.getMyMembership()==='join'&&await ticket.client.getCrypto().isEncryptionEnabledInRoom(room.roomId))result.push({id:room.roomId,name:cleanString(room.name,200),memberCount:room.getJoinedMemberCount(),unreadCount:room.getUnreadNotificationCount(),encrypted:true,isDirect:directIds.has(room.roomId)||!!room.getDMInviter?.()});
  unchanged(ticket);return result;
 }
 async function createRoom({name='',invites=[],isDirect=false}={}){
  const ticket=current();
  if(!Array.isArray(invites)||invites.length>15||invites.some(id=>!/^@[^:\s]+:[^\s]+$/.test(id)))throw fail('VOID_RECIPIENT','Use exact Matrix usernames, with at most 15 recipients.');
  if(isDirect&&(invites.length!==1||invites[0]===state.userId))throw fail('VOID_RECIPIENT','A direct conversation requires exactly one other Matrix user.');
  const result=await ticket.client.createRoom({name:cleanString(name,100)||undefined,invite:invites,is_direct:!!isDirect,visibility:'private',preset:'private_chat',initial_state:[
   {type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2',rotation_period_msgs:100,rotation_period_ms:86400000}},
   {type:'m.room.history_visibility',state_key:'',content:{history_visibility:'joined'}},
   {type:'m.room.guest_access',state_key:'',content:{guest_access:'forbidden'}}
  ]});unchanged(ticket);
  if(isDirect){try{const mapping=await ticket.client.getAccountDataFromServer('m.direct')||{};unchanged(ticket);const previous=Array.isArray(mapping[invites[0]])?mapping[invites[0]].filter(id=>typeof id==='string'):[];await ticket.client.setAccountData('m.direct',{...mapping,[invites[0]]:[...new Set([...previous,result.room_id])]});unchanged(ticket);}catch(error){unchanged(ticket);return {roomId:result.room_id,warning:'The conversation was created, but its direct-message organization could not be saved. It remains available in All.'};}}
  return {roomId:result.room_id};
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
 return Object.freeze({connect,disconnect,status:()=>({...state}),listRooms,createRoom,timeline,older,sendText,react,edit,deleteMessage,jumpToEvent,getRoomPermissions,getPins,setPinned,sendAttachment,downloadAttachment,saveDraft,getDraft,listDrafts,clearDraft,pendingSends,retryPending,saveNote,saveMessage,savedMessages,listSaved:savedMessages,removeSaved,search,devices,fingerprint,verifyFingerprint,requestVerification,acceptVerification,startVerification,confirmVerification,setupRecovery,restoreRecovery,securityStatus,revokeDevice});
}
const api=Object.freeze({create,createLocalSaved});
if(typeof window!=='undefined')window.VoidSecureMessenger=api;
export default api;
