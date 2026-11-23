// Matrix carries the SDP inside the existing verified encrypted room. The browser
// owns ICE, DTLS and SRTP; this module never handles private media keys.
export const CALL_EVENT = 'io.voidline.call.v1';
const RING_MS = 45000, DISCONNECT_MS = 35000;
const uuid = value => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
function within(promise,ms,message) {
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(err(message)),ms);})]).finally(()=>clearTimeout(timer));
}
const err = message => Object.assign(new Error(message), {code:'VOID_CALL'});
const safeSDP = (s,type) => s?.type===type && typeof s.sdp==='string' && s.sdp.length<=50000 && s.sdp.startsWith('v=0');
export async function verifiedCallSignal(matrixCrypto,event){
  const sender=event.getSender(),device=event.getContent()?.from,key=event.getSenderKey();
  if(!sender||!key||typeof device!=='string'||!device||device.length>255)return false;
  const trust=await matrixCrypto.getEncryptionInfoForEvent(event);
  if(trust?.shieldColour!==0)return false;
  const devices=await matrixCrypto.getUserDeviceInfo([sender],true);
  return devices.get(sender)?.get(device)?.getIdentityKey()===key;
}
export function relayConfiguration(result) {
  const urls = (Array.isArray(result?.uris) ? result.uris : []).filter(uri =>
    typeof uri==='string' && /^turns?:(?:\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::\d{1,5})?(?:\?transport=(?:udp|tcp))?$/i.test(uri));
  if(!urls.length || !result.username || !result.password || !(result.ttl>=60))
    throw err('The messaging service has no usable TURN relay. Ask its operator to check calling.');
  return {iceTransportPolicy:'relay',iceServers:[{urls,username:result.username,credential:result.password}]};
}
function gathered(pc) {
  if(pc.iceGatheringState==='complete')return Promise.resolve();
  return new Promise((resolve,reject)=>{
    function finish(error){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);pc.removeEventListener('signalingstatechange',check);error?reject(error):resolve();}
    function check(){if(pc.signalingState==='closed')finish(err('Call ended.'));else if(pc.iceGatheringState==='complete')finish();}
    const timer=setTimeout(()=>finish(err('The TURN relay could not be reached. Check your connection and try again.')),14000);
    pc.addEventListener('icegatheringstatechange',check);pc.addEventListener('signalingstatechange',check);check();
  });
}
export function createSecureCalls({device,user,allow,send,relay,onChange=()=>{},media=globalThis.navigator?.mediaDevices,Peer=globalThis.RTCPeerConnection,now=Date.now}) {
  let active=null,closed=false;
  const seen=new Map();
  function current(c){if(closed||active!==c)throw err('Call has ended on this device.');}
  function publish(c,reason=''){
    onChange({phase:c.phase,room:c.room,peer:c.peer||'',kind:c.kind,reason,local:c.local||null,remote:c.remote||null,
      mic:c.local?.getAudioTracks().some(t=>t.enabled)||false,camera:c.local?.getVideoTracks().some(t=>t.enabled)||false,everConnected:!!c.connected});
  }
  function phase(c,value){current(c);c.phase=value;publish(c);}
  function cleanup(c,reason,notify=true) {
    if(active!==c)return;
    active=null;clearTimeout(c.timeout);clearTimeout(c.disconnected);clearInterval(c.policy);
    c.pc?.close();for(const t of c.local?.getTracks()||[])t.stop();
    for(const t of c.remote?.getTracks()||[])t.stop();
    c.local=null;c.remote=null;c.phase='ended';if(notify)publish(c,reason);
  }
  function envelope(c,action,extra={}){return {v:1,id:c.id,action,from:device,to:c.otherDevice||null,...extra};}
  async function signal(c,action,extra={}){current(c);await send(c.room,envelope(c,action,extra));current(c);}
  function end(reason='Call ended.',remoteReason='hangup'){
    const c=active;if(!c)return;
    const payload=envelope(c,'end',{reason:remoteReason});
    cleanup(c,reason);if(c.sent||c.inbound)Promise.resolve().then(()=>send(c.room,payload)).catch(()=>{});
  }
  function timer(c,delay,message,reason){clearTimeout(c.timeout);c.timeout=setTimeout(()=>{if(active===c)end(message,reason);},delay);}
  async function eligible(c){const who=await within(allow(c.room),12000,'Could not verify calling access.');current(c);if(!who||who===user||(c.peer&&who!==c.peer))throw err('The participants in this call changed.');c.peer=who;}
  async function mediaAndConnection(c) {
    await eligible(c);
    const config=relayConfiguration(await within(relay(),10000,'The TURN service did not respond.'));current(c);
    const stream=await media.getUserMedia({audio:true,video:c.kind==='video'});
    if(active!==c||closed){for(const t of stream.getTracks())t.stop();throw err('Call ended.');}
    c.local=stream;const pc=c.pc=new Peer(config);
    for(const t of stream.getTracks())pc.addTrack(t,stream);
    pc.ontrack=event=>{
      if(active!==c)return;
      if(event.streams?.length)c.remote=event.streams[0];
      else {c.remote ||= new MediaStream();c.remote.addTrack(event.track);}
      publish(c);
    };
    pc.onconnectionstatechange=()=>{
      if(active!==c)return;
      if(pc.connectionState==='connected'){c.connected=true;clearTimeout(c.timeout);if(!c.round)restored(c);return;}
      if(!['disconnected','failed'].includes(pc.connectionState))return;
      if(!c.connected){if(pc.connectionState==='failed')end('The relay connection failed.','failed');return;}
      if(c.disconnected)return;
      recovering(c);
      const recovery=c.inbound?signal(c,'restart'):restartOffer(c);
      recovery.catch(()=>{if(active===c)end('The relay connection could not be restored.','failed');});
    };
    c.policy=setInterval(()=>{if(c.checking)return;c.checking=true;eligible(c).catch(()=>{if(active===c)end('Call ended because access could no longer be verified.','failed');}).finally(()=>{c.checking=false;});},15000);
    publish(c);return pc;
  }
  function recovering(c){
    if(!c.disconnected)c.disconnected=setTimeout(()=>{if(active===c)end('Connection lost. Start a new call to reconnect.','failed');},DISCONNECT_MS);
    if(c.phase!=='reconnecting')phase(c,'reconnecting');
  }
  function restored(c){
    clearTimeout(c.disconnected);c.disconnected=null;
    if(c.phase!=='connected')phase(c,'connected');
  }
  async function renewRelay(c){
    await eligible(c);
    const config=relayConfiguration(await within(relay(),10000,'The TURN service did not respond.'));current(c);c.pc.setConfiguration(config);
  }
  async function restartOffer(c){
    if(c.inbound||c.round||!c.otherDevice||c.pc.signalingState!=='stable')return;
    c.round=crypto.randomUUID();recovering(c);await renewRelay(c);
    const offer=await description(c,'offer',c.pc,true);
    await signal(c,'ice-offer',{round:c.round,description:offer});
  }
  async function description(c,type,pc,restart=false){
    await pc.setLocalDescription(type==='offer'?await pc.createOffer(restart?{iceRestart:true}:undefined):await pc.createAnswer());await gathered(pc);current(c);
    const value=pc.localDescription;
    if(!safeSDP(value,type)||!/^a=candidate:.* typ relay(?: |$)/m.test(value.sdp.replaceAll('\r','')))throw err('The TURN relay did not return a usable media candidate.');
    return {type:value.type,sdp:value.sdp};
  }
  const supported=()=>!closed&&!!Peer&&typeof media?.getUserMedia==='function';
  function open(room,id,kind,inbound){
    if(!supported())throw err('Calling is unavailable in this browser.');
    if(active)throw err('Finish your current call first.');
    const c=active={room,id,kind,inbound,phase:inbound?'checking':'preparing'};return c;
  }
  async function start(room,kind){
    if(!['voice','video'].includes(kind))throw err('Choose a voice or video call.');
    const c=open(room,crypto.randomUUID(),kind,false);publish(c);
    try{
      const pc=await mediaAndConnection(c);const desc=await description(c,'offer',pc);
      c.sent=true;await signal(c,'offer',{kind,description:desc});
      if(c.phase==='preparing')phase(c,'calling');
      timer(c,RING_MS,'No answer.','timeout');
    }catch(error){if(active===c)end(error?.name==='NotAllowedError'?'Microphone or camera permission was denied.':error.code==='VOID_CALL'?error.message:'Call setup failed. Check device verification, hardware and service connectivity.','failed');}
  }
  async function answer(){
    const c=active;if(!c?.inbound||c.phase!=='ringing')return;
    phase(c,'answering');clearTimeout(c.timeout);
    try{
      const pc=await mediaAndConnection(c);await pc.setRemoteDescription(c.offer);current(c);
      const desc=await description(c,'answer',pc);await signal(c,'answer',{description:desc});
      if(!c.connected){phase(c,'connecting');timer(c,RING_MS,'The media connection timed out.','failed');}
    }catch(error){if(active===c)end(error?.name==='NotAllowedError'?'Microphone or camera permission was denied.':error.code==='VOID_CALL'?error.message:'Could not answer this call.','failed');}
  }
  function remember(id){
    seen.set(id,now());
    for(const [key,t] of seen)if(t<now()-2*RING_MS||seen.size>256)seen.delete(key);
  }
  async function incoming({room,sender,content:b,time}){
    if(closed||!supported()||!b||b.v!==1||!uuid(b.id)||!Number.isFinite(time)||time>now()+10000||now()-time>RING_MS||typeof b.from!=='string'||!b.from||b.from.length>255)return;
    if(b.to!=null && b.to!==device)return;
    if(sender===user)return;
    if(!active && b.action==='end'){remember(b.id);return;}
    if(b.action==='offer'){
      if(active||seen.has(b.id)||!['voice','video'].includes(b.kind)||!safeSDP(b.description,'offer'))return;
      const c=open(room,b.id,b.kind,true);c.peer=sender;c.otherDevice=b.from;
      remember(b.id);
      try{
        await eligible(c);relayConfiguration(await within(relay(),10000,'The TURN service did not respond.'));current(c);
        if(now()-time>=RING_MS){cleanup(c,'Missed call.');return;}
        c.offer=b.description;phase(c,'ringing');timer(c,RING_MS-(now()-time),'Missed call.','timeout');
        await signal(c,'ringing');
      }catch{if(active===c)cleanup(c,'Call invitation could no longer be verified.',c.phase!=='checking');}return;
    }
    const c=active;if(!c||c.id!==b.id||room!==c.room||sender!==c.peer||c.otherDevice&&b.from!==c.otherDevice)return;
    if(b.action==='ringing'&&!c.inbound&&['preparing','calling'].includes(c.phase)){phase(c,'remote-ringing');return;}
    if(b.action==='end'){
      const reason=b.reason==='declined'?'Call declined.':c.inbound&&c.phase==='ringing'?'Missed call.':'Call ended.';
      cleanup(c,reason);return;
    }
    if(b.action==='selected'&&c.inbound&&b.selected!==device){cleanup(c,'Answered on another device.');return;}
    if(c.connected&&c.otherDevice&&['restart','ice-offer','ice-answer'].includes(b.action)){
      try{
        if(b.action==='restart'){await restartOffer(c);return;}
        if(!uuid(b.round))return;
        if(b.action==='ice-offer'&&c.inbound&&!c.round&&c.lastRound!==b.round&&safeSDP(b.description,'offer')){
          c.round=b.round;c.lastRound=b.round;recovering(c);await renewRelay(c);
          await c.pc.setRemoteDescription(b.description);current(c);
          const answer=await description(c,'answer',c.pc);
          await signal(c,'ice-answer',{round:b.round,description:answer});
        }else if(b.action==='ice-answer'&&!c.inbound&&c.round===b.round&&safeSDP(b.description,'answer')){
          await c.pc.setRemoteDescription(b.description);current(c);
        }else return;
        c.round=null;if(c.pc.connectionState==='connected')restored(c);
      }catch{if(active===c)end('The relay connection could not be restored.','failed');}return;
    }
    if(b.action==='answer'&&!c.inbound&&!c.otherDevice&&safeSDP(b.description,'answer')){
      c.otherDevice=b.from;
      try{await eligible(c);await c.pc.setRemoteDescription(b.description);current(c);
        await send(c.room,envelope(c,'selected',{to:null,selected:b.from}));current(c);
        if(!c.connected){phase(c,'connecting');timer(c,RING_MS,'The media connection timed out.','failed');}
      }catch{if(active===c)end('The call could not connect.','failed');}
    }
  }
  function toggle(kind){const c=active;if(!c?.local)return;const tracks=kind==='camera'?c.local.getVideoTracks():c.local.getAudioTracks();const enabled=!tracks.some(t=>t.enabled);for(const t of tracks)t.enabled=enabled;publish(c);}
  return {supported,start,answer,incoming,toggle,end,decline:()=>end('Call declined.','declined'),
    close(){closed=true;if(active)cleanup(active,'Messaging device locked.');seen.clear();},
    recheck(){const c=active;if(c&&c.phase!=='checking')eligible(c).catch(()=>{if(active===c)end('The participants or verified devices changed.','failed');});}};
}
