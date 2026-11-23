/** Server-side transport. Provider selection is explicit; retries are a user action. */
function mailbox(value){
 if(typeof value!=='string'||value.length>254||/[\r\n]/.test(value))return null;
 const [local,domain,...extra]=value.trim().split('@');
 if(extra.length||!local||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')
  ||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)||!domain||!domain.includes('.')
  ||!domain.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)))return null;
 return local+'@'+domain.toLowerCase();
}
function provider(env){
 const choice=env?.EMAIL_PROVIDER??'resend',from=env?.EMAIL_FROM;
 if(choice==='brevo'&&env.BREVO_API_KEY&&(!from||mailbox(from)))return 'brevo';
 if(choice==='resend'&&env.RESEND_API_KEY&&typeof from==='string'&&from.trim()&&!/[\r\n]/.test(from))return 'resend';
 return null;
}
// This is a local configuration check. Provider acceptance is known only after sending.
export function mailTransportConfigured(env){return provider(env)!==null;}
async function onlyActiveSender(fetcher,headers,signal){
 const response=await fetcher('https://api.brevo.com/v3/senders',{method:'GET',headers,signal,redirect:'error'});
 if(!response.ok)return null;
 const data=await response.json();
 if(!Array.isArray(data?.senders)||(data.count!==undefined&&data.count>data.senders.length))return null;
 const addresses=new Set();
 for(const sender of data.senders){
  if(typeof sender?.active!=='boolean')return null;
  if(!sender.active)continue;
  const address=mailbox(sender.email);
  if(!address)return null;
  addresses.add(address);
  if(addresses.size>1)return null;
 }
 return addresses.values().next().value??null;
}
export async function sendTransactionalEmail(env,{to,subject,text},fetcher=fetch){
 const selected=provider(env);
 if(!selected)return false;
 const brevo=selected==='brevo';
 const endpoint=brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails';
 const headers=brevo?{'api-key':env.BREVO_API_KEY}:{authorization:'Bearer '+env.RESEND_API_KEY};
 const signal=AbortSignal.timeout(15000);
 try{
  let body;
  if(brevo){
   const from=env.EMAIL_FROM?mailbox(env.EMAIL_FROM):await onlyActiveSender(fetcher,headers,signal);
   if(!from)return false;
   body={sender:{name:'VOIDLINE',email:from},to:[{email:to}],subject,textContent:text};
  }else{
   body={from:env.EMAIL_FROM,to:[to],subject,text};
  }
  const response=await fetcher(endpoint,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'});
  return response.ok;
 }catch{
  // Provider responses and exceptions can include private addresses or content.
  return false;
 }
}
