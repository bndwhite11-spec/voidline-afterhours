import assert from 'node:assert/strict';
import {createSecureCalls,relayConfiguration} from '../src/secure-calls.js';
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
  constructor(config){assert.equal(config.iceTransportPolicy,'relay');f.pc=this;this.iceGatheringState='complete';this.connectionState='new';}
  close(){this.closed=true;}addTrack(){}
  async createOffer(){return {type:'offer',sdp};}async createAnswer(){return {type:'answer',sdp};}
  async setLocalDescription(value){this.localDescription=value;}async setRemoteDescription(value){this.remoteDescription=value;}
 }
 f.ctl=createSecureCalls({device:'BOB',user:'bob',now:()=>timestamp,Peer,allow:async()=>{f.auth++;return 'alice';},relay:async()=>{f.relay++;return relay;},media:{getUserMedia:async()=>{f.media++;return stream;}},send:async(r,c)=>{events.push(c);assert.equal(r,room);},onChange:s=>states.push(s),...opts});
 f.incoming=(content=offer,sender='alice',time=timestamp)=>f.ctl.incoming({room,sender,time,content});return f;
}
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
console.log(passed+'/'+passed+' call controller checks passed with controlled browser and signaling events.');
