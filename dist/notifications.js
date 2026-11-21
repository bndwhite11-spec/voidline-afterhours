/* Explicit device opt-in. Opening settings never asks notification permission. */
(() => {
 'use strict';
 let app,identity='',epoch=0,actionToken=null;
 const $=id=>document.getElementById(id),esc=value=>app.esc(value);
 function sync(){const next=app.state.account?.id||'';if(next!==identity){identity=next;epoch++;actionToken=null;}}
 function guard(){sync();const id=identity,e=epoch,parent=app.guard();return ()=>id===app.state.account?.id&&e===epoch&&parent();}
 const supported=()=>!!navigator.serviceWorker&&'PushManager' in window&&'Notification' in window;
 const bytes=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 async function settings(){const valid=guard(),ticket=app.showDialog('Notifications on this device','Notifications are optional. Native activity uses generic previews; encrypted Matrix notifications require separate service integration.','<section id="vn-settings" role="status">Loading notification settings…</section>');try{const data=await app.request('/api/notifications/config');if(!valid()||ticket!==app.state.dialogGeneration)return;const node=$('vn-settings');if(!node)return;node.innerHTML=`<p>${esc(data.privacy)}</p><p>${esc(!supported()?'This browser does not support Web Push here. On iPhone or iPad with iOS16.4 or later, add VOIDLINE to your Home Screen and open it there. On Android, try Chrome.':data.reason)}</p><p>If this preview blocks browser permissions, <a href="/" target="_blank" rel="noopener noreferrer">open VOIDLINE in a browser tab</a>.</p><p><a href="/install.html" target="_blank" rel="noopener noreferrer">Android and iPhone installation help</a></p><p>Browser permission: ${esc(!supported()?'unavailable':Notification.permission==='denied'?'blocked. To allow notifications, change this site’s permission in your browser settings.':Notification.permission)}</p><p>Private message text is never included. Quiet hours and chat mute settings apply. Provider acceptance does not confirm that a device displayed a notification.</p><p id="vn-error" role="alert"></p><div class="vo-actions"><button class="vh-primary" data-vn="enable" ${!supported()||!data.configured||Notification.permission==='denied'?'disabled':''}>Enable on this device</button><button class="vh-secondary" data-vn="disable" ${!supported()?'disabled':''}>Disable on this device</button><button class="vh-secondary" data-vn="test" ${!supported()||!data.configured||!data.subscriptions?.length?'disabled':''}>Send a test notification</button></div>`;}catch(error){if(valid()&&ticket===app.state.dialogGeneration){const node=$('vn-settings');if(node)node.textContent=error.message;}}}
 async function action(name){
  const valid=guard();if(actionToken)return;const token={};actionToken=token;const ticket=app.state.dialogGeneration,samePanel=()=>valid()&&ticket===app.state.dialogGeneration;
  const fail=message=>{if(samePanel()){const node=$('vn-error');if(node)node.textContent=message;}};
  try{
   if(!supported())throw Error('This browser does not support notifications.');
   if(name==='enable'){
    const config=await app.request('/api/notifications/config');if(!samePanel())return;if(!config.configured)throw Error(config.reason);
    const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;if(!samePanel())return;if(permission!=='granted')throw Error('Notification permission was not granted. You can change it in browser settings.');
    const registration=await navigator.serviceWorker.register('/push-worker.js',{scope:'/'});if(!samePanel())return;
    await navigator.serviceWorker.ready;if(!samePanel())return;
    let subscription=await registration.pushManager.getSubscription();if(!samePanel())return;
    if(subscription?.options?.applicationServerKey&&new Uint8Array(subscription.options.applicationServerKey).toString()!==bytes(config.publicKey).toString()){if(await subscription.unsubscribe()!==true)throw Error('The old notification subscription could not be removed. Try again.');subscription=null;}
    const created=!subscription;subscription=subscription||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(config.publicKey)});
    if(!samePanel()){if(created)await subscription.unsubscribe();return;}
    await app.request('/api/notifications/subscribe',{subscription:subscription.toJSON()});
    if(samePanel()){app.announce('Notification subscription saved. Use Send a test to check this device.');await settings();}return;
   }
   if(name==='disable'){
    const registration=await navigator.serviceWorker.getRegistration('/');if(!samePanel())return;
    const subscription=await registration?.pushManager.getSubscription();if(!samePanel())return;
    if(subscription&&await subscription.unsubscribe()!==true)throw Error('The browser did not confirm removal. Notifications may still be enabled; try again.');
    if(!samePanel())return;
    let config;try{config=await app.request('/api/notifications/config');}catch{throw Error('Browser notifications are stopped. Server cleanup could not finish; retry Disable when connected.');}
    if(!samePanel())return;for(const record of config.subscriptions||[]){if(!samePanel())return;await app.request('/api/notifications/remove/'+encodeURIComponent(record.id),{});}
    if(samePanel()){app.announce('Notifications disabled for this browser session.');await settings();}return;
   }
   if(name==='test'){const result=await app.request('/api/notifications/test',{});if(samePanel()&&result.queued)app.announce('Test notification queued. Device display is not yet confirmed.');}
  }catch(error){fail(error.message);}finally{if(actionToken===token)actionToken=null;}
 }
 const extension={id:'notifications',init(bridge){if(app)return;app=bridge;document.addEventListener('click',event=>{const button=event.target.closest('[data-vn]');if(!button||!app.state.account)return;event.preventDefault();action(button.dataset.vn);});},accountHTML(){sync();return identity?'<button class="vo-settings-link" data-home="notification-settings"><span><b>Notifications on this device</b><small>Optional generic browser notifications</small></span></button>':'';},handles:name=>name==='notification-settings',handleAction(name){if(name==='notification-settings'){settings();return true;}return false;},onAccount:sync,onLock(){identity='';epoch++;actionToken=null;}};
 window.VoidNotifications=Object.freeze({extension,settings});function register(){window.VoidHome?.registerExtension?.(extension);}window.addEventListener('voidline:home-ready',register,{once:true});register();
})();
