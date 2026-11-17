/* Standard messages only. IndexedDB is a durable device cache, never shared authority. */
(() => {
  'use strict';
  const NAME='voidline-standard-outbox-v1',STORE='requests',LEASE=45000;
  let opening;
  const active=new Map();
  const scope=(accountId,target)=>String(accountId)+'\u0000'+String(target);
  function database(){
    if(!globalThis.indexedDB)return Promise.reject(Error('This browser cannot preserve an outgoing queue. Nothing was sent.'));
    if(!opening)opening=new Promise((resolve,reject)=>{const request=indexedDB.open(NAME,1);request.onupgradeneeded=()=>{const store=request.result.createObjectStore(STORE,{keyPath:'id'});store.createIndex('account','accountId');store.createIndex('scope','scope');};request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};request.onerror=()=>{opening=null;reject(Error('Outgoing storage could not open. Your draft has been kept.'));};request.onblocked=()=>{opening=null;reject(Error('Close an older Voidline tab to open outgoing storage.'));};});
    return opening;
  }
  async function transaction(mode,work){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result,error;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(error||tx.error||Error('Outgoing storage could not save. Nothing new was sent.'));try{work(store,value=>{result=value;},cause=>{error=cause;tx.abort();});}catch(cause){error=cause;tx.abort();}});}
  function valid(accountId,target){if(typeof accountId!=='string'||!accountId||typeof target!=='string'||!/^(dm|channel):[a-zA-Z0-9_-]+$/.test(target))throw Error('Choose an account and conversation before queuing.');}
  const ordered=rows=>rows.sort((a,b)=>a.order-b.order||a.createdAt-b.createdAt||a.id.localeCompare(b.id));
  async function list(accountId,target){valid(accountId,target);return transaction('readonly',(store,done)=>{const req=store.index('scope').getAll(scope(accountId,target));req.onsuccess=()=>done(ordered(req.result));});}
  async function enqueue(accountId,target,payload){
    valid(accountId,target);if(typeof payload?.clientId!=='string'||!payload.clientId||typeof payload.text!=='string'||payload.text.length>4000||(!payload.text.trim()&&!payload.attachmentIds?.length))throw Error('This outgoing request is invalid.');
    const body={clientId:payload.clientId,text:payload.text,replyToId:payload.replyToId||null,...(payload.mentionIds?{mentionIds:[...payload.mentionIds]}:{}),...(payload.attachmentIds?{attachmentIds:[...payload.attachmentIds]}:{})};
    const id=accountId+':'+body.clientId,key=scope(accountId,target);
    return transaction('readwrite',(store,done,fail)=>{const lookup=store.get(id);lookup.onsuccess=()=>{if(lookup.result){if(lookup.result.scope!==key||JSON.stringify(lookup.result.payload)!==JSON.stringify(body))return fail(Error('This message ID already belongs to another request.'));done(lookup.result);return;}const rows=store.index('scope').getAll(key);rows.onsuccess=()=>{if(rows.result.filter(r=>!['accepted','cancelled'].includes(r.status)).length>=100)return fail(Error('This conversation already has 100 unsent messages. Resolve its queue before adding more.'));const now=Date.now(),record={id,scope:key,accountId,target,payload:body,status:'queued',order:Math.max(0,...rows.result.map(r=>r.order))+1,createdAt:now,updatedAt:now,attempts:0,error:''};store.add(record);done(record);};};});
  }
  async function change(id,mutate){return transaction('readwrite',(store,done)=>{const req=store.get(id);req.onsuccess=()=>{if(!req.result){done(null);return;}const changed=mutate(req.result);if(changed){changed.updatedAt=Date.now();store.put(changed);done(changed);}else done(req.result);};});}
  async function retry(accountId,target,clientId){valid(accountId,target);return change(accountId+':'+clientId,record=>record.scope===scope(accountId,target)&&record.status==='failed'?{...record,status:'queued',error:'',leaseUntil:0}:null);}
  async function importUnconfirmed(accountId,target,payload){const record=await enqueue(accountId,target,payload);return change(record.id,current=>current.status==='queued'?{...current,status:'failed',error:'This older request was not acknowledged. Retry uses its original message ID.',attempts:Math.max(1,current.attempts)}:null);}
  async function cancel(accountId,target,clientId){valid(accountId,target);return change(accountId+':'+clientId,record=>record.scope===scope(accountId,target)&&['queued','failed'].includes(record.status)?{...record,status:'cancelled',payload:{clientId:record.payload.clientId,text:'',replyToId:null},error:'',leaseUntil:0}:null);}
  async function clearAccount(accountId){return transaction('readwrite',(store,done)=>{const req=store.index('account').openCursor(accountId);req.onsuccess=()=>{const cursor=req.result;if(cursor){cursor.delete();cursor.continue();}else done(true);};});}
  async function recover(accountId,target){const rows=await list(accountId,target);for(const record of rows)if(record.status==='sending'&&record.leaseUntil<=Date.now())await change(record.id,current=>current.status==='sending'&&current.leaseUntil<=Date.now()?{...current,status:'failed',error:'The previous request was not acknowledged. Retry uses the same message ID.',leaseUntil:0}:null);return list(accountId,target);}
  async function claim(accountId,target,writer){return transaction('readwrite',(store,done)=>{const req=store.index('scope').getAll(scope(accountId,target));req.onsuccess=()=>{const head=ordered(req.result).find(r=>!['accepted','cancelled'].includes(r.status));if(!head||head.status!=='queued'){done(null);return;}head.status='sending';head.writer=writer;head.leaseUntil=Date.now()+LEASE;head.updatedAt=Date.now();head.attempts++;store.put(head);done(head);};});}
  async function drain({accountId,target,send,isCurrent=()=>true,onChange=()=>{},onAccepted=()=>{}}){
    const key=scope(accountId,target);if(active.has(key))return active.get(key);
    const run=async()=>{const writer=crypto.randomUUID();const restored=await recover(accountId,target);if(isCurrent())onChange(restored);while(isCurrent()){
      const record=await claim(accountId,target,writer);if(!record)break;
      if(!isCurrent()){await change(record.id,current=>current.writer===writer?{...current,status:'queued',leaseUntil:0}:null);break;}
      onChange(await list(accountId,target));
      try{const receipt=await send({...record.payload},record);if(!receipt?.id)throw Error('The server did not acknowledge this message. Retry the same request.');const accepted=await change(record.id,current=>current.writer===writer&&current.status==='sending'?{...current,status:'accepted',messageId:receipt.id,payload:{clientId:current.payload.clientId,text:'',replyToId:null},error:'',leaseUntil:0}:null);if(accepted?.status==='accepted'&&accepted.writer===writer&&isCurrent())await onAccepted(receipt,record);}
      catch(error){await change(record.id,current=>current.writer===writer&&current.status==='sending'?{...current,status:'failed',error:error?.message||'The send was not acknowledged.',leaseUntil:0}:null);break;}
      finally{if(isCurrent())onChange(await list(accountId,target));}
    }};
    const task=(async()=>{if(globalThis.navigator?.locks?.request)return navigator.locks.request('voidline-standard-outbox:'+key,{mode:'exclusive'},run);return run();})().finally(()=>active.delete(key));active.set(key,task);return task;
  }
  // Retain only small receipts, with no message content, for a bounded period.
  async function prune(accountId,target){const cutoff=Date.now()-86400000;return transaction('readwrite',(store,done)=>{const req=store.index('scope').openCursor(scope(accountId,target));req.onsuccess=()=>{const cursor=req.result;if(cursor){if(['accepted','cancelled'].includes(cursor.value.status)&&cursor.value.updatedAt<cutoff)cursor.delete();cursor.continue();}else done(true);};});}
  window.VoidNativeOutbox=Object.freeze({enqueue,list,recover,retry,cancel,drain,clearAccount,prune,importUnconfirmed});
})();
