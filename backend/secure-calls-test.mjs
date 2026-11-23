import assert from 'node:assert/strict';
import {createSecureCalls,relayConfiguration,verifiedCallSignal,verifiedCallDevice,CALL_EVENT} from '../src/secure-calls.js';
import {create} from '../src/secure-messenger.js';
import {fixture as messengerFixture} from './secure-fixture.mjs';
const relay={uris:['turns:relay.example:443?transport=tcp'],username:'short-lived',password:'test-only',ttl:180};
const sdp='v=0\r\na=candidate:1 1 udp 123 192.0.2.21 5000 typ relay\r\n';
const timestamp=100000,room='!private:example',id=crypto.randomUUID();
const offer={v:1,id,action:'offer',from:'ALICE',kind:'video',description:{type:'offer',sdp}};
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
function fixture(opts={}){
 const states=[],events=[],tracks=[{kind:'audio',enabled:true,stop(){this.stopped=true;}},{kind:'video',enabled:true,stop(){this.stopped=true;}}];
 const stream={getTracks:()=>tracks,getAudioTracks:()=>tracks.slice(0,1),getVideoTracks:()=>tracks.slice(1)};
 const f={states,events,tracks,stream,media:0,relay:0,auth:0};
 class Peer {
  constructor(config){assert.equal(config.iceTransportPolicy,'relay');f.pc=this;this.iceGatheringState='complete';this.connectionState='new';this.signalingState='stable';}
  close(){this.closed=true;}addTrack(){}
  setConfiguration(config){f.config=config;}
  async createOffer(options){f.lastOfferOptions=options;return {type:'offer',sdp};}async createAnswer(){return {type:'answer',sdp};}
  async setLocalDescription(value){this.localDescription=value;}async setRemoteDescription(value){this.remoteDescription=value;}
 }
 f.ctl=createSecureCalls({device:'BOB',user:'bob',now:()=>timestamp,Peer,allow:async()=>{f.auth++;return 'alice';},relay:async()=>{f.relay++;return relay;},media:{getUserMedia:async()=>{f.media++;return stream;}},send:async(r,c)=>{events.push(c);assert.equal(r,room);},onChange:s=>states.push(s),...opts});
 f.incoming=(content=offer,sender='alice',time=timestamp)=>f.ctl.incoming({room,sender,time,content});return f;
}
await check('the declared calling device must own the authenticated Megolm sender key',async()=>{
 const event={getSender:()=>'alice',getContent:()=>({from:'DEVICE-A'}),getSenderKey:()=>'actual-key'};
 const crypto={getEncryptionInfoForEvent:async()=>({shieldColour:0}),getUserDeviceInfo:async()=>new Map([['alice',new Map([['DEVICE-A',{getIdentityKey:()=>'actual-key'}]])]])};
 assert(await verifiedCallSignal(crypto,event));
 assert.equal(await verifiedCallSignal(crypto,{...event,getSenderKey:()=>'other-key'}),false);
 assert.equal(await verifiedCallSignal(crypto,{...event,getContent:()=>({from:'DEVICE-B'})}),false);
 assert.equal(await verifiedCallSignal({...crypto,getEncryptionInfoForEvent:async()=>({shieldColour:2})},event),false);
});
await check('TURN-only configuration rejects unavailable, expired and STUN-only credentials',()=>{
 for(const input of [null,{...relay,ttl:10},{...relay,password:''},{...relay,uris:['stun:relay.example']}])assert.throws(()=>relayConfiguration(input),/TURN relay/);
 assert.deepEqual(relayConfiguration(relay).iceServers[0].urls,relay.uris);
});
await check('incoming invitation rings after access checks and never captures media before explicit acceptance',async()=>{
 const f=fixture();try{
  await f.incoming(offer,'alice',timestamp-60000);await f.incoming({...offer,to:'OTHER'});await f.incoming(offer,'bob');assert.equal(f.auth,0);
  await f.incoming();assert.equal(f.states.at(-1).phase,'ringing');assert.equal(f.media,0);assert.deepEqual(f.events.map(e=>e.action),['ringing']);
  await f.ctl.answer();assert.equal(f.media,1);assert.deepEqual(f.events.map(e=>e.action),['ringing','answer']);assert.equal(f.states.at(-1).phase,'connecting');
  f.pc.connectionState='connected';f.pc.onconnectionstatechange();assert.equal(f.states.at(-1).phase,'connected');
  f.ctl.toggle('mic');assert.equal(f.states.at(-1).mic,false);f.ctl.toggle('camera');assert.equal(f.states.at(-1).camera,false);
  await f.incoming({...offer,action:'end'},'stranger');assert.equal(f.states.at(-1).phase,'connected');
  await f.incoming({...offer,action:'end',from:'ANOTHER'});assert.equal(f.states.at(-1).phase,'connected');
  await f.incoming({...offer,action:'end'});assert(f.pc.closed);assert(f.tracks.every(t=>t.stopped));assert.equal(f.states.at(-1).phase,'ended');
  await f.incoming();assert.equal(f.states.at(-1).phase,'ended');
 }finally{f.ctl.close();}
});
await check('an unavailable relay or ineligible friendship never opens the microphone',async()=>{
 for(const opts of [{relay:async()=>null},{allow:async()=>{throw Error('blocked');}}]){
  const f=fixture(opts);try{await f.ctl.start(room,'voice');assert.equal(f.media,0);assert(!f.events.length);assert.equal(f.states.at(-1).phase,'ended');}finally{f.ctl.close();}
 }
});
await check('a delayed capture after cancel releases every acquired track and sends no invitation',async()=>{
 let resume;const f=fixture({media:{getUserMedia:()=>new Promise(r=>resume=r)}});try{
  const starting=f.ctl.start(room,'video');while(!resume)await new Promise(r=>setImmediate(r));
  f.ctl.end();resume(f.stream);await starting;assert(f.tracks.every(t=>t.stopped));assert.deepEqual(f.events,[]);
 }finally{f.ctl.close();}
});
await check('terminal events arriving before a replayed offer do not ring again',async()=>{
 const f=fixture();try{await f.incoming({...offer,action:'end'});await f.incoming();assert.deepEqual(f.states,[]);assert.equal(f.media,0);}finally{f.ctl.close();}
});
await check('a selected peer can renegotiate relay ICE using the original media and a matching answer',async()=>{
 const f=fixture();try{
  await f.ctl.start(room,'video');const call=f.events[0],from={v:1,id:call.id,from:'ALICE',to:'BOB'};
  await f.incoming({...from,action:'answer',description:{type:'answer',sdp}});
  f.pc.connectionState='connected';f.pc.onconnectionstatechange();
  await f.incoming({...from,action:'restart',from:'UNSELECTED'});assert.equal(f.events.length,2);
  await f.incoming({...from,action:'restart'});assert.deepEqual(f.lastOfferOptions,{iceRestart:true});
  const next=f.events.at(-1);assert.equal(next.action,'ice-offer');assert.equal(f.config.iceTransportPolicy,'relay');assert.equal(f.media,1);
  await f.incoming({...from,action:'restart'});assert.equal(f.events.at(-1),next);
  const answer={...from,action:'ice-answer',description:{type:'answer',sdp}};
  await f.incoming({...answer,round:crypto.randomUUID()});assert.equal(f.states.at(-1).phase,'reconnecting');
  await f.incoming({...answer,round:next.round});assert.equal(f.states.at(-1).phase,'connected');
 }finally{f.ctl.close();}
});

await check('a delayed offer acknowledgement cannot arm No answer after media has connected',async()=>{
 const original={setTimeout,clearTimeout,setInterval,clearInterval},timers=[];
 globalThis.setTimeout=(fn,ms)=>{const timer={fn,ms,cancelled:false};timers.push(timer);return timer;};
 globalThis.clearTimeout=timer=>{if(timer)timer.cancelled=true;};globalThis.setInterval=()=>({});globalThis.clearInterval=()=>{};
 let release;const f=fixture({send:async(r,content)=>{f.events.push(content);if(content.action==='offer')await new Promise(resolve=>release=resolve);}});
 try{
  const starting=f.ctl.start(room,'video');while(!release)await new Promise(resolve=>setImmediate(resolve));const call=f.events[0];
  await f.incoming({v:1,id:call.id,from:'ALICE',to:'BOB',action:'answer',description:{type:'answer',sdp}});
  f.pc.connectionState='connected';f.pc.onconnectionstatechange();release();await starting;
  assert.equal(f.states.at(-1).phase,'connected');assert.equal(timers.filter(t=>!t.cancelled&&t.ms===45000).length,0);
  for(const timer of timers.filter(t=>!t.cancelled))timer.fn();assert.equal(f.states.at(-1).phase,'connected');
 }finally{f.ctl.close();Object.assign(globalThis,original);}
});
await check('a selected device revoked while capture permission is pending cannot receive media',async()=>{
 let grant,allowed=true;const selected=[];
 const f=fixture({allow:async(_room,binding)=>{selected.push(binding);if(!allowed)throw Error('Selected device revoked');return 'alice';},media:{getUserMedia:()=>new Promise(resolve=>grant=resolve)}});
 try{
  await f.incoming();const answering=f.ctl.answer();while(!grant)await new Promise(resolve=>setImmediate(resolve));allowed=false;grant(f.stream);await answering;
  assert(f.tracks.every(track=>track.stopped));assert.equal(f.pc,undefined);assert(!f.events.some(event=>event.action==='answer'));assert.equal(f.states.at(-1).phase,'ended');assert(selected.every(binding=>binding.deviceId==='ALICE'));
 }finally{f.ctl.close();}
});

await check('selected-device checks require its original identity key and current verification even when another device remains trusted',async()=>{
 const selected={deviceId:'SELECTED',identityKey:'original-key'},other={getIdentityKey:()=>'another-key'};let entry={getIdentityKey:()=>'original-key'},verified=true;
 const matrixCrypto={getUserDeviceInfo:async()=>new Map([['alice',new Map([['OTHER',other],...(entry?[['SELECTED',entry]]:[])])]]),getDeviceVerificationStatus:async()=>({isVerified:()=>verified})};
 assert.equal(await verifiedCallDevice(matrixCrypto,'alice',selected),true);entry=null;assert.equal(await verifiedCallDevice(matrixCrypto,'alice',selected),false);
 entry={getIdentityKey:()=>'replacement-key'};assert.equal(await verifiedCallDevice(matrixCrypto,'alice',selected),false);
 entry={getIdentityKey:()=>'original-key'};verified=false;assert.equal(await verifiedCallDevice(matrixCrypto,'alice',selected),false);
});

await check('actual messenger device-update callbacks stop calls when the selected peer device disappears or changes key',async()=>{
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),oldPeer=Object.getOwnPropertyDescriptor(globalThis,'RTCPeerConnection');
 const until=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw Error('Call callback did not settle.');};
 try{
  for(const change of ['removed','key-changed']){
   const f=messengerFixture(),states=[],track={enabled:true,stop(){this.stopped=true;}},stream={getTracks:()=>[track],getAudioTracks:()=>[track],getVideoTracks:()=>[]};let pc;
   class Peer{constructor(config){assert.equal(config.iceTransportPolicy,'relay');pc=this;this.iceGatheringState='complete';this.signalingState='stable';this.connectionState='new';}close(){this.closed=true;}addTrack(){}async createOffer(){return {type:'offer',sdp};}async setLocalDescription(value){this.localDescription=value;}async setRemoteDescription(value){this.remoteDescription=value;}}
   Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>stream}}});Object.defineProperty(globalThis,'RTCPeerConnection',{configurable:true,value:Peer});
   let selectedKey='peer-key',present=true;
   f.crypto.getUserDeviceInfo=async users=>new Map(users.map(user=>[user,user==='@owner:matrix.example'?new Map([['DEV',{deviceId:'DEV',getIdentityKey:()=>'CURVEKEY'}]]):new Map([['OTHER',{deviceId:'OTHER',getIdentityKey:()=>'other-key'}],...(present?[['PEER',{deviceId:'PEER',getIdentityKey:()=>selectedKey}]]:[])])]));
   const app=create({callsEnabled:true,callPermission:async()=>({allowed:true}),onCall:state=>states.push(state)},f.deps);
   try{
    await app.connect({homeserver:'https://matrix.example',accountId:'app-account',accessToken:'MEMORY_TOKEN',storagePassword:'private vault passphrase',expectedUserId:'@owner:matrix.example',expectedDeviceId:'DEV'});
    f.latest.getAccountData=()=>({getContent:()=>({'@member:matrix.example':[f.room.roomId]})});f.latest.turnServer=async()=>relay;
    await app.startCall(f.room.roomId,'voice');const sent=f.calls.find(call=>call[0]==='send'&&call[2]===CALL_EVENT)[3];
    const content={v:1,id:sent.id,from:'PEER',to:'DEV',action:'answer',description:{type:'answer',sdp}};
    f.latest.emit(f.deps.sdk.RoomEvent.Timeline,{isEncrypted:()=>true,getTs:()=>Date.now(),getType:()=>CALL_EVENT,isDecryptionFailure:()=>false,getContent:()=>content,getSender:()=>'@member:matrix.example',getSenderKey:()=>'peer-key'},f.room,false,false);
    await until(()=>states.at(-1)?.phase==='connecting');pc.connectionState='connected';pc.onconnectionstatechange();assert.equal(states.at(-1).phase,'connected');
    if(change==='removed')present=false;else selectedKey='replacement-key';f.latest.emit(f.deps.sdk.CryptoEvent.DevicesUpdated,['@member:matrix.example']);
    await until(()=>states.at(-1)?.phase==='ended');assert.equal(pc.closed,true);assert.equal(track.stopped,true);
   }finally{await app.disconnect();}
  }
 }finally{oldNavigator?Object.defineProperty(globalThis,'navigator',oldNavigator):delete globalThis.navigator;oldPeer?Object.defineProperty(globalThis,'RTCPeerConnection',oldPeer):delete globalThis.RTCPeerConnection;}
});
console.log(passed+'/'+passed+' call controller checks passed with controlled browser and signaling events.');
