// Created only when a call starts or a verified incoming invitation arrives.
export function callPanel(controls) {
  let dialog=null,restore=null,title,peer,status,remote,local,accept,decline,mic,cam,end,close,sound;
  const states={preparing:'Checking devices and TURN relay…',calling:'Invitation sent',ringing:'Incoming call', 'remote-ringing':'Ringing',answering:'Preparing microphone and relay…',connecting:'Connecting',connected:'Connected',reconnecting:'Reconnecting…'};
  function remove(){if(!dialog)return;local.srcObject=null;remote.srcObject=null;dialog.remove();dialog=null;if(restore?.isConnected)restore.focus({preventScroll:true});restore=null;}
  function build(){
    restore=document.activeElement;dialog=document.createElement('dialog');dialog.className='vh-call-dialog';dialog.setAttribute('aria-labelledby','vh-call-title');
    const add=(tag,container=dialog)=>container.appendChild(document.createElement(tag));
    title=add('h2');title.id='vh-call-title';peer=add('p');status=add('p');status.setAttribute('role','status');
    const media=add('div');media.className='vh-call-streams';
    remote=add('video',media);local=add('video',media);
    for(const el of [remote,local]){el.autoplay=true;el.playsInline=true;}
    remote.setAttribute('aria-label','Other participant');local.setAttribute('aria-label','Your camera preview');local.muted=true;
    const actions=add('div');actions.className='vh-dialog-actions';
    const button=(name,fn,cls='vh-secondary')=>{const b=add('button',actions);b.type='button';b.className=cls;b.textContent=name;b.onclick=fn;return b;};
    accept=button('Answer',()=>controls().answer(),'vh-primary');decline=button('Decline',()=>controls().decline());
    mic=button('Mute microphone',()=>controls().toggle('mic'));cam=button('Pause camera',()=>controls().toggle('camera'));
    sound=button('Play incoming audio',()=>remote.play().then(()=>{sound.hidden=true;}).catch(()=>{}));sound.hidden=true;
    end=button('End call',()=>controls().end(),'vh-danger');close=button('Close',remove);dialog.addEventListener('cancel',e=>{if(close.hidden)e.preventDefault();else remove();});
    document.body.append(dialog);dialog.showModal();
  }
  function update(s){
    if(s.reason==='Messaging device locked.'){remove();return;}
    if(!dialog)build();
    const ended=s.phase==='ended',ringing=s.phase==='ringing';
    title.textContent=(s.kind==='video'?'Video':'Voice')+' call';peer.textContent=s.peer;status.textContent=s.reason||states[s.phase]||s.phase;
    for(const [el,stream] of [[local,s.local],[remote,s.remote]]){el.hidden=!stream||s.kind==='voice';if(el.srcObject!==stream){el.srcObject=stream;if(stream)el.play().catch(()=>{if(el===remote&&el.srcObject===stream)sound.hidden=false;});}}
    mic.hidden=!s.local||ended;cam.hidden=mic.hidden||s.kind!=='video';mic.textContent=s.mic?'Mute microphone':'Unmute microphone';cam.textContent=s.camera?'Pause camera':'Resume camera';
    accept.hidden=decline.hidden=!ringing;end.hidden=ended||ringing;close.hidden=!ended;if(!s.remote)sound.hidden=true;
    if(ended)close.focus({preventScroll:true});
  }
  return {update,remove};
}
