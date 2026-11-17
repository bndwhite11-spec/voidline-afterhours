import {openVault} from './secure-vault.js';
const fail=(code,message)=>Object.assign(new Error(message),{code});
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

/** Private notes on this device. No cloud content, contacts or keys are sent. */
export async function createLocalSaved({accountId,password,indexedDB=globalThis.indexedDB,locks=globalThis.navigator?.locks,origin=globalThis.location?.origin||'offline',vaultFactory=openVault}={}){
 if(typeof accountId!=='string'||!accountId||accountId.length>256)throw fail('VOID_ACCOUNT','Log in before opening account-scoped Saved.');
 if(!locks?.request)throw fail('VOID_LOCKS_UNAVAILABLE','This browser cannot safely coordinate encrypted Saved across tabs.');
 const namespace='voidline.local-saved.v1.'+encodeURIComponent(origin+'|'+accountId);
 let release,closed=false,vault,readyResolve,readyReject;
 const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
 const lockTask=locks.request(namespace,{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock){readyReject(fail('VOID_DEVICE_IN_USE','Saved is unlocked in another tab. Lock it there before opening it here.'));return;}
  await new Promise(resolve=>{release=resolve;readyResolve();});
 }).catch(readyReject);
 try{await ready;vault=await vaultFactory({namespace,password,indexedDB});}
 catch(error){release?.();await lockTask;throw error;}
 const check=()=>{if(closed||!vault?.isUnlocked())throw fail('VOID_VAULT_LOCKED','Unlock Saved before accessing its notes.');};
 const key=id=>{if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))throw fail('VOID_NOTE_ID','Choose a valid Saved note.');return 'note:'+id;};
 async function list({q='',tag=null,offset=0,limit=30}={}){
  check();if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>100)throw fail('VOID_PAGE','Choose a valid Saved page.');
  const term=text(q,200).toLocaleLowerCase(),rows=[];
  for(const id of await vault.list('note:')){const row=await vault.get(id);check();if(row&&(!term||(row.title+' '+row.text+' '+row.tags.join(' ')).toLocaleLowerCase().includes(term))&&(!tag||row.tags.includes(tag)))rows.push(row);}
  rows.sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));
  return {notes:rows.slice(offset,offset+limit),total:rows.length,page:{offset,limit,hasMore:offset+limit<rows.length},scope:'This device only. Notes are encrypted locally and do not sync to other devices.'};
 }
 async function save(value={}){
  check();if(typeof value.text!=='string'||!value.text.trim()||value.text.length>16000)throw fail('VOID_NOTE_TEXT','Write a note of 1–16,000 characters.');
  const id=value.id||crypto.randomUUID(),recordKey=key(id),prior=await vault.get(recordKey);check();
  if(!prior&&(await vault.list('note:')).length>=1000)throw fail('VOID_NOTE_LIMIT','This device supports up to 1,000 Saved notes. Remove an existing note before adding more.');
  const tags=Array.isArray(value.tags)?[...new Set(value.tags.map(v=>text(v,32)).filter(Boolean))].slice(0,10):[];
  const row={id,title:text(value.title,120),text:value.text,tags,createdAt:prior?.createdAt||Date.now(),updatedAt:Date.now()};
  await vault.put(recordKey,row);check();return row;
 }
 async function remove(id){check();await vault.remove(key(id));check();return {removed:true};}
 function close(){if(closed)return Promise.resolve();closed=true;vault.close();release?.();return lockTask;}
 return Object.freeze({list,save,remove,close,lock:close,isUnlocked:()=>!closed&&vault.isUnlocked()});
}
