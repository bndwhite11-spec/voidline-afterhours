/* Friends are explicit account relationships, independent of messaging keys. */
(() => {
 'use strict';
 let home=null,identity='',epoch=0,panel=0,snapshot=null,view='friends',offset=0;
 const $=id=>document.getElementById(id);
 const esc=value=>home.esc(value);
 const icon=name=>home.icon(name);
 const currentAccount=()=>home?.state.account?.id||'';
 function sync(){const id=currentAccount();if(id!==identity){identity=id;epoch++;panel++;snapshot=null;offset=0;view='friends';}}
 function guard(){sync();const id=identity,version=epoch;return ()=>id===currentAccount()&&version===epoch;}
 const count=name=>Number(snapshot?.counts?.[name])||0;
 function navHTML(){sync();return identity?`<button class="vh-nav-item vs-nav" data-home="social-open">${icon('you')}<span>Friends</span>${count('incoming')?`<b class="vs-count" aria-label="${count('incoming')} incoming friend requests">${count('incoming')}</b>`:''}</button>`:'';}
 function accountHTML(){sync();return identity?`<button class="vs-account-link" data-home="social-open"><span><b>Friends & requests</b><small>${snapshot?`${count('friends')} friends${count('incoming')?' · '+count('incoming')+' incoming requests':''}`:'Manage friends and incoming requests'}</small></span>${icon('arrow')}</button>`:'';}
 function error(message,node=$('social-error')){if(node?.isConnected){node.textContent=message;node.hidden=false;}else home.announce(message);}
 function row(person,kind){
  const name=person.username?'@'+person.username:'Deleted account',id=person.accountId;
  const actions=kind==='incoming'?`<button class="vh-primary" data-social-action="accept" data-request="${esc(person.id)}">Accept</button><button class="vh-secondary" data-social-action="decline" data-request="${esc(person.id)}">Decline</button>`:kind==='outgoing'?`<span class="vs-status">Request sent</span><button class="vh-secondary" data-social-action="cancel" data-request="${esc(person.id)}">Cancel</button>`:kind==='blocked'?`<button class="vh-secondary" data-social-action="unblock" data-account="${esc(id)}">Unblock</button>`:`<button class="vh-secondary" data-social-action="remove-confirm" data-account="${esc(id)}" data-username="${esc(person.username)}">Remove</button>`;
  return `<article class="vs-person"><span class="vs-avatar" aria-hidden="true">${esc((person.displayName||person.username||'?').slice(0,1).toUpperCase())}</span><div class="vs-person-name"><b>${esc(person.displayName||name)}</b><span>${esc(name)}</span></div><div class="vs-person-actions">${actions}${kind!=='blocked'?`<button class="vs-more" data-social-action="block-confirm" data-account="${esc(id)}" data-username="${esc(person.username)}" aria-label="Block ${esc(name)}">Block</button>`:''}</div></article>`;
 }
 function empty(kind){const labels={friends:['Your friends will appear here.','Add someone by their exact Voidline username.'],incoming:['No incoming requests.','People who send you a friend request will appear here.'],outgoing:['No sent requests.','Requests you send will appear here until they are handled.'],blocked:['No blocked accounts.','Blocked accounts cannot send you requests or gifts.']};return `<div class="vs-empty"><b>${labels[kind][0]}</b><p>${labels[kind][1]}</p></div>`;}
 function tabs(){return `<div class="vs-tabs" role="group" aria-label="Friends view">${[['friends','All friends'],['incoming','Incoming'],['outgoing','Sent'],['blocked','Blocked']].map(([key,label])=>`<button data-social-action="tab" data-view="${key}" aria-pressed="${view===key}" class="${view===key?'is-active':''}">${label}${count(key)?` <span>${count(key)}</span>`:''}</button>`).join('')}</div>`;}
 async function open(preferred='friends',page=0){
  sync();if(!identity)return;
  view=['friends','incoming','outgoing','blocked'].includes(preferred)?preferred:'friends';offset=Math.max(0,Number(page)||0);
  const valid=guard(),ticket=++panel;
  home.showDialog('Friends','Find someone by their username and send them a request.',`<section class="vs-panel"><form data-social-form="request" class="vs-add-form"><label for="social-username">Add a friend</label><div><input id="social-username" name="username" placeholder="Enter their username" maxlength="24" autocomplete="off" autocapitalize="none" spellcheck="false" required><button class="vh-primary" type="submit">Send request</button></div></form><p class="vs-error" id="social-error" role="alert" hidden></p><div id="social-tabs">${tabs()}</div><div id="social-results" class="vs-results" role="status">Loading friends…</div><div id="social-pages"></div><label class="vs-privacy"><input id="social-allow-requests" type="checkbox" ${snapshot?.settings?.allowRequests===false?'':'checked'}><span>Allow friend requests by username</span></label><p class="vs-note">You can disable new friend requests at any time. Blocking someone also prevents gifts.</p></section>`);
  const results=$('social-results'),errorNode=$('social-error');
  try{
   const data=await home.request(`/api/social?limit=30&offset=${offset}`);
   if(!valid()||ticket!==panel||!results?.isConnected)return;
   snapshot=data;const list=data[view]||[];results.innerHTML=list.length?list.map(person=>row(person,view)).join(''):empty(view);
   const tabNode=$('social-tabs');if(tabNode)tabNode.innerHTML=tabs();
   const setting=$('social-allow-requests');if(setting)setting.checked=data.settings?.allowRequests!==false;
   const pages=$('social-pages');if(pages)pages.innerHTML=`<div class="vs-pages"><span>${count(view)?`${offset+1}–${Math.min(offset+30,count(view))} of ${count(view)}`:'0 results'}</span><button class="vh-secondary" data-social-action="page" data-offset="${Math.max(0,offset-30)}" ${offset===0?'disabled':''}>Previous</button><button class="vh-secondary" data-social-action="page" data-offset="${offset+30}" ${offset+30>=count(view)?'disabled':''}>Next</button></div>`;
  }catch(reason){if(valid()&&ticket===panel&&results?.isConnected){results.innerHTML='<div class="vs-empty"><b>Friends could not load.</b><p>Retry when your connection is available.</p><button class="vh-secondary" data-social-action="refresh">Retry</button></div>';error(reason.message,errorNode);}}
 }
 async function mutate(path,body,button,success){
  const valid=guard(),ticket=panel,dialogTicket=home.state.dialogGeneration,errorNode=$('social-error');if(button)button.disabled=true;
  const samePanel=()=>valid()&&ticket===panel&&dialogTicket===home.state.dialogGeneration&&(!button||button.isConnected);
  try{const data=await home.request(path,body);if(!samePanel())return;if(success)home.announce(typeof success==='function'?success(data):success);await open(view,offset);return data;}
  catch(reason){if(samePanel())error(reason.message,errorNode);}
  finally{if(button?.isConnected&&valid())button.disabled=false;}
 }
 function confirm(kind,button){
  const name='@'+(button.dataset.username||'this account'),id=button.dataset.account;
  panel++;home.showDialog(kind==='block'?'Block '+name+'?':'Remove '+name+'?',kind==='block'?'This removes your friendship and cancels requests. You will not receive new friend requests or gifts from this account.':'This removes the friendship for both accounts. Existing messages are kept.',`<section class="vs-panel"><p id="social-error" class="vs-error" role="alert" hidden></p><div class="vs-confirm-actions"><button class="vh-danger" data-social-action="${kind}" data-account="${esc(id)}">${kind==='block'?'Block account':'Remove friend'}</button><button class="vh-secondary" data-social-action="refresh">Cancel</button></div></section>`);
 }
 function act(button){const name=button.dataset.socialAction,id=button.dataset.request,accountId=button.dataset.account;
  if(name==='tab')return open(button.dataset.view,0);
  if(name==='page')return open(view,button.dataset.offset);
  if(name==='refresh')return open(view,offset);
  if(name==='accept'||name==='decline')return mutate(`/api/social/requests/${encodeURIComponent(id)}/respond`,{accept:name==='accept'},button,name==='accept'?'Friend request accepted.':'Friend request declined.');
  if(name==='cancel')return mutate(`/api/social/requests/${encodeURIComponent(id)}/cancel`,{},button,'Request cancelled.');
  if(name==='remove-confirm'||name==='block-confirm')return confirm(name==='block-confirm'?'block':'remove',button);
  if(name==='remove')return mutate(`/api/social/friends/${encodeURIComponent(accountId)}/remove`,{},button,'Friend removed.');
  if(name==='block'||name==='unblock')return mutate('/api/social/blocks',{accountId,active:name==='block'},button,name==='block'?'Account blocked.':'Account unblocked. Friend requests are not restored.');
 }
 function init(bridge){
  if(home)return;home=bridge;sync();
  document.addEventListener('click',event=>{const button=event.target.closest('[data-social-action]');if(!button||!currentAccount())return;event.preventDefault();Promise.resolve(act(button)).catch(reason=>error(reason.message));});
  document.addEventListener('submit',event=>{const form=event.target;if(form.dataset.socialForm!=='request'||!currentAccount())return;event.preventDefault();if(form.dataset.busy)return;form.dataset.busy='1';const button=form.querySelector('[type="submit"]'),username=String(new FormData(form).get('username')||'').trim().replace(/^@/,'');
   mutate('/api/social/request',{username},button,data=>{offset=0;if(data.request?.state==='accepted'){view='friends';return 'You are already friends.';}if(data.request?.direction==='incoming'){view='incoming';return 'This person already sent you a request. Review Incoming to accept it.';}view='outgoing';return data.alreadyExists?'Your request is already pending.':'Friend request sent.';}).finally(()=>{delete form.dataset.busy;});
  });
  document.addEventListener('change',event=>{if(event.target.id!=='social-allow-requests'||!currentAccount())return;const checkbox=event.target,prior=!checkbox.checked;mutate('/api/social/settings',{allowRequests:checkbox.checked},checkbox,'Request preference saved.').then(data=>{if(!data&&checkbox.isConnected)checkbox.checked=prior;});});
 }
 const extension={id:'social',init,navHTML,accountHTML,handles:action=>action==='friend'||action==='social-open',handleAction(action){if(action==='friend'||action==='social-open'){open('friends');return true;}return false;},onAccount(){sync();},onLock(){identity='';epoch++;panel++;snapshot=null;}};
 window.VoidSocial={open,extension};
 function register(){if(window.VoidHome?.registerExtension)window.VoidHome.registerExtension(extension);}
 window.addEventListener('voidline:home-ready',register,{once:true});register();
})();
