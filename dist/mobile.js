/* Web-app installation, sharing and visible-viewport sizing. No account data cache. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),root=document.documentElement;
 const appURL=(()=>{try{return location.protocol==='https:'?location.origin+'/':'https://voidline-afterhours.pipedcactus1.chatgpt.site/';}catch{return 'https://voidline-afterhours.pipedcactus1.chatgpt.site/';}})();
 const display=window.matchMedia?.('(display-mode: standalone)');
 let installed=false,promptEvent=null,promptBusy=false,sharedBusy=false;
 function installedNow(){return installed||!!display?.matches||navigator.standalone===true;}
 function status(text){const node=$('vm-status');if(node)node.textContent=text;}
 function paintInstall(){const button=$('vm-install-button'),badge=$('vm-installed');if(button){button.hidden=installedNow();button.disabled=promptBusy;button.setAttribute?.('aria-busy',String(promptBusy));}if(badge){badge.hidden=!installedNow();badge.textContent=installed?'VOIDLINE is installed on this device.':'You’re using VOIDLINE in app mode.';}}
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();if(!installedNow())promptEvent=event;paintInstall();});
 window.addEventListener('appinstalled',()=>{installed=true;promptEvent=null;paintInstall();status('VOIDLINE was added to this device. Open it from your Home Screen or app launcher.');});
 display?.addEventListener?.('change',()=>{if(installedNow())promptEvent=null;paintInstall();});
 function manualInstall(message='Choose the iOS, Android or PC steps below to install through your browser.'){
  if(installedNow())return;status(message);const instructions=$('vm-install-instructions');const disclosure=instructions?.closest?.('details');if(disclosure)disclosure.open=true;instructions?.focus?.({preventScroll:true});instructions?.scrollIntoView?.({block:'start',behavior:'auto'});
 }
 async function install(){
  if(promptBusy||installedNow())return;if(!promptEvent){manualInstall();return;}
  const event=promptEvent;promptEvent=null;promptBusy=true;paintInstall();
  try{await event.prompt();const choice=await event.userChoice;if(!installedNow()){if(choice?.outcome==='accepted')status('Installation requested. Follow your browser’s remaining steps.');else manualInstall('Installation was not completed. You can use the browser steps below whenever you are ready.');}}
  catch(error){if(!installedNow())manualInstall(error?.name==='AbortError'?'Installation was canceled. The browser steps below are still available.':'This browser did not open an install prompt. Use the iOS, Android or PC steps below.');}
  finally{promptBusy=false;paintInstall();}
 }
 async function copyLink(){const field=$('vm-link');try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(appURL);status('App link copied.');}catch{field?.focus();field?.select?.();status('Select and copy the app link above.');}}
 async function shareLink(){if(sharedBusy)return;if(!navigator.share)return copyLink();sharedBusy=true;try{await navigator.share({title:'VOIDLINE: AFTERHOURS',text:'Join me on VOIDLINE. Create your own account to get started.',url:appURL});status('Link handed to your sharing app.');}catch(error){if(error?.name!=='AbortError')await copyLink();}finally{sharedBusy=false;}}
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-vm]');if(!button)return;event.preventDefault();if(button.dataset.vm==='install')install();if(button.dataset.vm==='copy')copyLink();if(button.dataset.vm==='share')shareLink();});
 if($('vm-link'))$('vm-link').value=appURL;paintInstall();
 function revealInstallFragment(){if(['#vm-ios','#vm-android','#vm-pc'].includes(location.hash))manualInstall();}
 window.addEventListener('hashchange',revealInstallFragment);revealInstallFragment();
 // CSS updates only: never replace a composer, inspect its value or touch drafts.
 const viewport=window.visualViewport;let scheduled=false,fullHeight=window.innerHeight||0,fullWidth=window.innerWidth||0;const heightByWidth=new Map();
 const editable=node=>!!node&&(node.isContentEditable||node.tagName==='TEXTAREA'||node.tagName==='INPUT'&&['text','search','password','email','url','tel','number'].includes(node.type||'text'));
 function updateViewport(){
  const mobile=Number(window.innerWidth)<=860,scale=viewport?.scale??1,height=viewport?.height||window.innerHeight,focus=editable(document.activeElement);
  if(!mobile||Math.abs(scale-1)>.02||!Number.isFinite(height)||height<=0){root.style.removeProperty('--vm-viewport-height');root.style.removeProperty('--vm-viewport-top');root.style.removeProperty('--vm-keyboard-offset');delete root.dataset.vmKeyboard;return;}
  if(Math.abs(window.innerWidth-fullWidth)>80){heightByWidth.set(Math.round(fullWidth),fullHeight);fullHeight=Math.max(height,window.innerHeight||0,heightByWidth.get(Math.round(window.innerWidth))||Math.min(fullWidth,fullHeight));fullWidth=window.innerWidth;}
  if(!focus)fullHeight=Math.max(height,window.innerHeight||0);else fullHeight=Math.max(fullHeight,window.innerHeight||0);
  const keyboard=focus&&fullHeight-height>120;
  root.style.setProperty('--vm-viewport-height',Math.round(height)+'px');root.style.setProperty('--vm-viewport-top',Math.max(0,Math.round(viewport?.offsetTop||0))+'px');root.style.setProperty('--vm-keyboard-offset',Math.max(0,Math.round((window.innerHeight||height)-height-(viewport?.offsetTop||0)))+'px');root.dataset.vmKeyboard=keyboard?'true':'false';
 }
 function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||((fn)=>window.setTimeout(fn,16)))(()=>{scheduled=false;updateViewport();});}
 viewport?.addEventListener?.('resize',schedule);viewport?.addEventListener?.('scroll',schedule);window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);updateViewport();
 const extension={id:'mobile',accountHTML(){return '<a class="vm-account-link" href="/install.html" target="_blank" rel="noopener noreferrer"><b>Download VOIDLINE</b><small>Android APK, Windows app, and iPhone browser setup</small></a>';}};
 const register=()=>window.VoidHome?.registerExtension?.(extension);window.addEventListener('voidline:home-ready',register,{once:true});register();
 window.VoidMobile=Object.freeze({appURL,installed:installedNow});
})();
