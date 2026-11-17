(function(){
 'use strict';
 let app=null,identity='',epoch=0,running=null;
 const state=()=>app?.state||{},MAX_BYTES=10*1024*1024,MAX_RECORDS=10000,PAGE_LIMIT=100,downloads=new Map();
 const scopes=[['profile','My profile'],['memberships','Community memberships'],['gifts','Owned gifts'],['badges','Earned badges'],['organization','Private organization & bookmark references'],['standard-native','Standard direct & group history'],['standard-community','Accessible Standard community history']];
 function cancel(){if(!running)return;const task=running;task.cancelled=true;running=null;task.release?.();}
 function revokeDownloads(){for(const [url,timer]of downloads){clearTimeout(timer);URL.revokeObjectURL(url);}downloads.clear();}
 function sync(){const id=state().account?.id||'';if(id!==identity){cancel();revokeDownloads();identity=id;epoch++;}}
 function dialog(){
  sync();if(!identity)return;cancel();
  app.showDialog('Your data','Choose exactly what to export. A recent identity confirmation is required. Previous device-local archives are never silently uploaded.',`<div class="vh-note"><b>Account export</b><p>These JSON files contain readable account records or Standard message text. Anyone with the file can read it. Store it privately. Encrypted Matrix messages, keys, passwords, recovery codes and device-only Saved notes and uploaded file bytes are excluded.</p></div><form data-ve-form="export"><label class="vh-field">Export scope<select name="scope">${scopes.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><label class="vp-check"><input name="acknowledge" type="checkbox" required>I understand this download is readable plaintext.</label><div class="vp-actions"><button class="vh-primary" type="submit">Prepare private download</button><button class="vh-secondary" type="button" data-ve="cancel" hidden>Cancel preparation</button></div><p id="ve-status" role="status"></p><p id="ve-error" role="alert"></p><button class="vh-secondary" id="ve-reauth" type="button" data-home="reauthenticate" hidden>Confirm account identity</button></form><div class="vh-note"><b>Previous local archive</b><p>Review or export untouched records from this browser. Samples are kept separate from real account history.</p><button class="vh-secondary" data-home="review-local">Review previous archive</button><button class="vh-secondary" data-home="export-local">Export previous local archive</button></div><p>Device-only encrypted Saved notes and Matrix history have separate recovery boundaries. Account recovery does not recover missing encryption keys.</p><a class="vh-secondary" href="/downloads/voidline-source.zip" download>Download source</a><button class="vh-danger" data-home="delete-account">Delete account</button>`);
 }
 async function prepare(form){
  sync();if(running||!identity||!form.isConnected)return;
  const values=new FormData(form),scope=String(values.get('scope')||'');if(!scopes.some(([id])=>id===scope)||!values.get('acknowledge'))return;
  const parent=app.guard(),task={accountId:identity,epoch,ticket:state().dialogGeneration,cancelled:false},current=()=>!task.cancelled&&identity===task.accountId&&epoch===task.epoch&&state().account?.id===task.accountId&&state().dialogGeneration===task.ticket&&form.isConnected&&parent();
  const submit=form.querySelector('[type="submit"]'),cancelButton=form.querySelector('[data-ve="cancel"]'),status=document.getElementById('ve-status'),error=document.getElementById('ve-error');
  if(!submit||!cancelButton||!status||!error)return;
  running=task;submit.disabled=true;cancelButton.hidden=false;error.textContent='';
  task.release=()=>{if(form.isConnected){submit.disabled=false;cancelButton.hidden=true;}};
  try{
   const pages=[],seen=new Set(),encoder=new TextEncoder();let cursor=null,total=0,size=0;
   for(let page=0;page<100;page++){
    if(!current())return;
    status.textContent=`Preparing ${total} records…`;
    const data=await app.request('/api/export',{scope,acknowledgePlaintext:true,...(cursor?{cursor}:{}),limit:PAGE_LIMIT});
    if(!current())return;
    if(!data||typeof data!=='object'||Array.isArray(data)||data.format!=='voidline-account-export-v1'||!Array.isArray(data.records)||data.records.length>PAGE_LIMIT||!data.page||typeof data.page.hasMore!=='boolean'||data.page.limit!==PAGE_LIMIT||data.page.count!==data.records.length||data.scope!==scope||data.accountId!==task.accountId||data.encrypted!==false||data.includesFileBytes!==false)throw Error('The export page could not be verified. No partial file was downloaded.');
    size+=encoder.encode(JSON.stringify(data)).byteLength;total+=data.records.length;
    if(size>MAX_BYTES)throw Error('This scope exceeds the 10 MiB browser export limit. No partial file was downloaded. Use the documented operator export process.');
    if(total>MAX_RECORDS)throw Error('This scope exceeds the browser’s 10,000-record limit. No partial file was downloaded.');
    pages.push(data);
    if(!data.page.hasMore){
     const content=JSON.stringify({format:'voidline-scoped-export',version:1,scope,accountId:task.accountId,createdAt:new Date().toISOString(),confidentiality:'Readable plaintext. Excludes Matrix keys/history and device-only Saved notes.',pages},null,2),bytes=encoder.encode(content);
     if(bytes.byteLength>MAX_BYTES)throw Error('The formatted download exceeds the 10 MiB browser export limit. No partial file was downloaded.');
     if(!current())return;
     const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));
     if(!current()){URL.revokeObjectURL(url);return;}
     try{const link=document.createElement('a');link.href=url;link.download=`voidline-${scope}-${new Date().toISOString().slice(0,10)}.json`;link.click();}catch(reason){URL.revokeObjectURL(url);throw reason;}
     const timer=setTimeout(()=>{URL.revokeObjectURL(url);downloads.delete(url);},10000);downloads.set(url,timer);
     status.textContent=`Prepared ${total} records. Save the file privately. Records reflect current access; permissions are checked on every page.`;return;
    }
    if(typeof data.page.nextCursor!=='string'||!data.page.nextCursor||data.page.nextCursor.length>2048||seen.has(data.page.nextCursor))throw Error('The export cursor could not advance. No partial file was downloaded.');
    cursor=data.page.nextCursor;seen.add(cursor);
   }
   throw Error('This scope exceeds the browser’s 10,000-record limit. No partial file was downloaded.');
  }catch(reason){if(current()){error.textContent=reason.message||'Export did not complete. No file was downloaded.';if(reason.code==='reauthentication_required'){const button=document.getElementById('ve-reauth');if(button)button.hidden=false;status.textContent='After confirming your identity, reopen Your data and restart this scope.';}}}
  finally{if(running===task){running=null;task.release();}}
 }

 function init(bridge){if(app)return;app=bridge;sync();window.addEventListener('pagehide',()=>{cancel();revokeDownloads();});document.addEventListener('submit',event=>{if(event.target?.dataset?.veForm!=='export')return;event.preventDefault();prepare(event.target);});document.addEventListener('click',event=>{if(!event.target.closest?.('[data-ve="cancel"]'))return;event.preventDefault();cancel();const status=document.getElementById('ve-status');if(status)status.textContent='Preparation cancelled. No file was downloaded.';});}
 const extension={id:'account-export',init,handles:name=>name==='data',handleAction(name){if(name!=='data')return false;dialog();return true;},onAccount:sync,onLock(){cancel();revokeDownloads();identity='';epoch++;},beforeCloseDialog(){cancel();return true;}};
 window.VoidAccountExport=Object.freeze({extension});
 function register(){window.VoidHome?.registerExtension(extension);}window.addEventListener('voidline:home-ready',register,{once:true});register();
})();
