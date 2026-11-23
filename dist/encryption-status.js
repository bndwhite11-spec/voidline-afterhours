/* A status view, not an encryption or enrollment fallback. No keys are rendered. */
(() => {
 'use strict';
 let app,epoch=0,view=null;
 const state=()=>app?.state||{},esc=value=>app.esc(value),bool=value=>typeof value==='boolean'?value:null;
 const secureClient=()=>app.getSecureClient?.()||null;
 function connection(client){try{const value=client?.status?.();return value&&typeof value==='object'?{phase:value.phase,identity:String(value.userId||'')+'\0'+String(value.deviceId||''),identified:typeof value.userId==='string'&&!!value.userId&&typeof value.deviceId==='string'&&!!value.deviceId}:null;}catch{return null;}}
 const selected=()=>({secure:state().secureRoomId||'',native:state().nativeId||'',channel:state().channelId||''});
 function current(record){const choice=selected(),status=connection(record.client);return view===record&&epoch===record.epoch&&record.parent()&&record.ticket===state().dialogGeneration&&record.client===secureClient()&&record.selection.secure===choice.secure&&record.selection.native===choice.native&&record.selection.channel===choice.channel&&record.phase===status?.phase&&record.identity===status?.identity&&document.getElementById('ves-status')?.isConnected;}
 const settled=task=>Promise.resolve().then(task).then(value=>({ok:true,value}),()=>({ok:false}));
 function row(title,label,copy,tone='unknown'){return `<div class="ves-row"><span class="ves-dot ves-${tone}" aria-hidden="true"></span><div><h3>${esc(title)}</h3><strong>${esc(label)}</strong><p>${esc(copy)}</p></div></div>`;}
 function render(record){
  if(!current(record))return;
  const root=document.getElementById('ves-status'),focus=document.activeElement?.getAttribute('data-es-action');
  const https=location.protocol==='https:',local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname),ready=record.phase==='ready'&&record.identified;
  let html=row('Website connection',https?'HTTPS connection':local?'Local development connection':'HTTPS is not in use',https?'Your browser uses HTTPS for this page. This protects the connection to the service; it does not make Standard messages end-to-end encrypted.':'This page URL does not use HTTPS. Message encryption and device trust are separate checks.',https?'good':'attention');
  const choice=record.selection;
  if(choice.secure){
   const encrypted=record.roomEncrypted;
   html+=row('Selected conversation',encrypted===true?'End-to-end encryption enabled':encrypted===false?'Encryption is not enabled':'Encryption status unknown',encrypted===true?'The messaging SDK reports encryption enabled for this room. Device verification is shown separately.':encrypted===false?'The messaging SDK reports that this room is not encrypted.':'The selected room could not be confirmed by the current messaging SDK.',encrypted===true?'good':encrypted===false?'attention':'unknown');
  }else if(choice.native||choice.channel)html+=row('Selected conversation','Standard messaging · service-readable','Standard message text and media are available to the service. HTTPS does not change this.','attention');
  else html+=row('Selected conversation','No conversation selected','Open a conversation to check its encryption status.');
  const configured=bool(record.config?.configured);
  html+=row('Encrypted messaging service',configured===true?'Account connection configured':configured===false?'Account connection unavailable':'Availability unknown',configured===true?'A service is configured for account enrollment. Successful enrollment and device verification still need their own checks.':configured===false?'Encrypted account connection is not available here. Standard conversations remain service-readable.':'Service availability could not be loaded.',configured===true?'neutral':'unknown');
  html+=row('Messaging connection',ready?'Connected on this device':record.phase==='connecting'||record.phase==='syncing'?'Connecting':record.phase==='locked'?'Locked on this device':record.phase==='error'?'Connection unavailable':'Not connected',ready?'The live messaging SDK has an account and device connection. This does not prove device verification.':'No ready account and device connection was confirmed by the live messaging SDK.',ready?'neutral':'unknown');
  const verified=record.currentVerified;
  html+=row('This device’s identity',verified===true?'Verified':verified===false?'Not verified':'Verification unknown',verified===true?'Fresh device-key verification from the messaging SDK confirms this device.':verified===false?'The messaging SDK does not report this device as verified. Review devices before trusting this identity.':'Fresh device-key verification could not be confirmed. Connection status is not proof of trust.',verified===true?'good':verified===false?'attention':'unknown');
  if(record.otherDevices)html+=row('Other messaging devices',`${record.otherDevices.verified} verified · ${record.otherDevices.unverified} not verified`,'Counts come from a fresh device-key query for your messaging account. Review devices to inspect individual identities.','neutral');
  const backup=bool(record.security?.backupEnabled),recovered=bool(record.security?.recoveryVerified),signing=bool(record.security?.crossSigningReady),storage=bool(record.security?.secretStorageReady);
  html+=row('Key backup',backup===true?'Backup enabled':backup===false?'Backup not enabled':'Backup status unknown','Backup availability is separate from proving that a recovery key can restore your encrypted history.',backup===true?'neutral':backup===false?'attention':'unknown');
  html+=row('Recovery check',recovered===true?'Restore recorded for this backup':recovered===false?'Recovery not yet verified':'Recovery verification unknown',recovered===true?'This device has a successful restore record matching the current secret-storage key and backup version. This is not proof of a restore on another device.':'A matching successful restore record was not confirmed. Enabling backup alone does not verify recovery.',recovered===true?'good':recovered===false?'attention':'unknown');
  html+=`<p class="ves-detail">Signing identity: ${signing===true?'ready':signing===false?'not ready':'unknown'} · Secret storage: ${storage===true?'available':storage===false?'not available':'unknown'}</p>`;
  html+='<section class="ves-service" aria-label="Service check"><h3>Check service availability</h3><p>This checks public service capabilities. It does not sign in, create a device, verify keys or change a conversation.</p><p id="ves-service-result" role="status" aria-live="polite">'+esc(serviceCopy(record))+'</p><button type="button" class="vh-secondary" data-es-action="check" '+(record.checking?'disabled':'')+'>'+(record.checking?'Checking service…':'Check encrypted service')+'</button></section>';
  html+='<div class="vh-dialog-actions"><button type="button" class="vh-secondary" data-es-action="refresh">Refresh status</button>';
  if(ready&&typeof record.client?.devices==='function')html+='<button type="button" class="vh-primary" data-home="secure-verify">Review devices and recovery</button>';
  else if(configured===true)html+='<button type="button" class="vh-primary" data-home="secure-connect">Connect encrypted messaging</button>';
  html+='</div><p class="ves-footnote">Encrypted messaging is a separate choice. Standard history has not been converted, and no automatic fallback is enabled.</p>';
  root.innerHTML=html;if(focus)root.querySelector(`[data-es-action="${focus}"]`)?.focus();
 }
 function serviceCopy(record){
  if(record.checking)return 'Checking the configured service…';
  if(record.checkFailed)return 'The service check could not finish. Wait a moment and try again.';
  const result=record.check;if(!result)return 'No service check has been run in this view.';
  if(result.status==='not-configured')return 'Encrypted account connection is not available here.';
  if(result.status==='advertised'&&result.checks?.versions==='valid'&&result.checks?.login==='jwt-advertised')return 'The service responded with version information and advertised account sign-in. Actual account enrollment is not proven by this check.';
  const versions=result.checks?.versions==='valid'?'Version information responded.':'Version information could not be confirmed.';
  const login=result.checks?.login==='jwt-advertised'?'Account sign-in is advertised.':result.checks?.login==='not-advertised'?'Account sign-in is not advertised.':'Account sign-in could not be confirmed.';
  return versions+' '+login+' Enrollment and key verification remain separate.';
 }
 async function load(record){
  const ready=record.phase==='ready'&&record.identified,client=record.client;
  const [config,devices,security,rooms]=await Promise.all([
   settled(()=>app.request('/api/encryption/config')),
   settled(()=>ready&&typeof client?.devices==='function'?client.devices():null),
   settled(()=>ready&&typeof client?.securityStatus==='function'?client.securityStatus():null),
   settled(()=>ready&&record.selection.secure&&typeof client?.listRooms==='function'?client.listRooms():null)
  ]);
  if(!current(record))return;
  record.config=config.ok?{configured:bool(config.value?.configured)}:null;
  record.security=security.ok&&security.value?{backupEnabled:bool(security.value.backupEnabled),recoveryVerified:bool(security.value.recoveryVerified),crossSigningReady:bool(security.value.crossSigningReady),secretStorageReady:bool(security.value.secretStorageReady)}:null;
  if(devices.ok&&Array.isArray(devices.value)&&devices.value.every(device=>device&&typeof device==='object')){
   const own=devices.value.find(device=>device.current===true);record.currentVerified=bool(own?.verified);
   const others=devices.value.filter(device=>device.current===false);if(others.every(device=>typeof device.verified==='boolean'))record.otherDevices={verified:others.filter(device=>device.verified===true).length,unverified:others.filter(device=>device.verified===false).length};
  }
  if(rooms.ok&&Array.isArray(rooms.value))record.roomEncrypted=bool(rooms.value.find(room=>room&&room.id===record.selection.secure)?.encrypted);
  render(record);
 }
 function open(){
  if(!state().account)return;const client=secureClient(),status=connection(client),record={epoch:++epoch,parent:app.guard(),client,phase:status?.phase,identity:status?.identity,identified:status?.identified,selection:selected(),currentVerified:null,roomEncrypted:null};
  record.ticket=app.showDialog('Encryption and privacy','Connection, conversation encryption, device trust and recovery are separate layers.','<div class="ves-status" id="ves-status" role="region" aria-label="Encryption status"></div>');view=record;render(record);return load(record);
 }
 async function check(record){
  if(!current(record)||record.checking)return;record.checking=true;record.checkFailed=false;render(record);
  try{const result=await app.request('/api/encryption/check',{});if(!current(record))return;record.check=result&&typeof result==='object'?{status:result.status,checks:{versions:result.checks?.versions,login:result.checks?.login}}:null;record.checkFailed=!record.check;}
  catch{if(current(record))record.checkFailed=true;}
  finally{if(current(record)){record.checking=false;render(record);}}
 }
 const reset=()=>{epoch++;view=null;};
 const extension={id:'encryption-status',init(bridge){app=bridge;},onAccount:reset,onLock:reset,handles:action=>action==='encryption-status',handleAction:action=>action==='encryption-status'?open():undefined};
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-es-action]');if(!button||!document.getElementById('ves-status')?.contains(button)||!view||!current(view))return;if(button.dataset.esAction==='refresh')void open();if(button.dataset.esAction==='check')void check(view);});
 function register(){window.VoidHome?.registerExtension?.(extension);}window.addEventListener('voidline:home-ready',register,{once:true});register();
})();
