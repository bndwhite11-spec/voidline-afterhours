import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const transport=await readFile(new URL('../worker/email-delivery.mjs',import.meta.url),'utf8');
const script=transport+`
export default {async fetch(request){
 const {choice}=await request.json();
 const env={EMAIL_PROVIDER:choice,RESEND_API_KEY:'test-resend',BREVO_API_KEY:'test-brevo'};
 if(choice==='resend')env.EMAIL_FROM='sender@example.test';
 return Response.json(await sendTransactionalEmail(env,{to:'receiver@example.test',subject:'Controlled mail',text:'Controlled content'}));
}};`;
const requests=[];let shouldRedirect=false;
const runtime=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',outboundService:async request=>{
 const {url,method}=request;requests.push(url);
 if(shouldRedirect)return Response.redirect('https://unrelated.example.test/',307);
 if(url==='https://api.brevo.com/v3/senders'){
  assert.equal(request.headers.get('api-key'),'test-brevo');assert.equal(method,'GET');
  return Response.json({senders:[{email:'sender@example.test',active:true}]});
 }
 assert.equal(method,'POST');
 const data=await request.json();assert.equal(data.subject,'Controlled mail');
 if(url==='https://api.resend.com/emails'){
  assert.equal(request.headers.get('authorization'),'Bearer test-resend');assert.deepEqual(data.to,['receiver@example.test']);
 }else{
  assert.equal(url,'https://api.brevo.com/v3/smtp/email');assert.equal(request.headers.get('api-key'),'test-brevo');
  assert.deepEqual(data.sender,{name:'VOIDLINE',email:'sender@example.test'});assert.deepEqual(data.to,[{email:'receiver@example.test'}]);
 }
 return Response.json({id:'test-receipt'},{status:201});
}});
async function send(choice){return (await runtime.dispatchFetch('https://worker.example.test',{method:'POST',body:JSON.stringify({choice})})).json();}
try{
 assert.equal(await send('resend'),true);assert.deepEqual(requests.splice(0),['https://api.resend.com/emails']);
 assert.equal(await send('brevo'),true);assert.deepEqual(requests.splice(0),['https://api.brevo.com/v3/senders','https://api.brevo.com/v3/smtp/email']);
 shouldRedirect=true;
 for(const [choice,expected] of [['resend','https://api.resend.com/emails'],['brevo','https://api.brevo.com/v3/senders']]){
  assert.equal(await send(choice),false);assert.deepEqual(requests.splice(0),[expected]);
 }
 console.log('PASS actual workerd fetch sends Resend mail and resolves a single Brevo sender for delivery; redirects cannot forward the key or body.');
}finally{await runtime.dispose();}
