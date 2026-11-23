import assert from 'node:assert/strict';
import {mailTransportConfigured,sendTransactionalEmail} from '../worker/email-delivery.mjs';
const message={to:'recipient@example.test',subject:'Controlled test',text:'Private fixture content'};
const resend={RESEND_API_KEY:'fixture-resend',EMAIL_FROM:'Voidline <sender@example.test>'};
const both={...resend,EMAIL_PROVIDER:'brevo',EMAIL_FROM:'sender@example.test',BREVO_API_KEY:'fixture-brevo'};
for(const env of [resend,{...resend,EMAIL_PROVIDER:'resend'},both]){
 const calls=[];
 assert.equal(mailTransportConfigured(env),true);
 const sent=await sendTransactionalEmail(env,message,async(url,request)=>{
  calls.push(url);
  assert.equal(request.method,'POST');assert.equal(request.redirect,'error');assert(request.signal instanceof AbortSignal);
  const data=JSON.parse(request.body);
  if(env.EMAIL_PROVIDER==='brevo'){
   assert.equal(url,'https://api.brevo.com/v3/smtp/email');assert(!request.headers.authorization);assert.equal(request.headers['api-key'],'fixture-brevo');
   assert.deepEqual(data,{sender:{name:'VOIDLINE',email:'sender@example.test'},to:[{email:message.to}],subject:message.subject,textContent:message.text});
  }else{
   assert.equal(url,'https://api.resend.com/emails');assert(!request.headers['api-key']);assert.equal(request.headers.authorization,'Bearer fixture-resend');
   assert.deepEqual(data,{from:resend.EMAIL_FROM,to:[message.to],subject:message.subject,text:message.text});
  }
  return new Response(null,{status:201});
 });
 assert.equal(sent,true);assert.equal(calls.length,1);
}
console.log('PASS default Resend, explicit Resend and Brevo use only their selected recipient, payload and credentials');
for(const env of [{...both,EMAIL_PROVIDER:'invalid'},{...both,EMAIL_FROM:'name <x@example.test>'},{...both,EMAIL_FROM:'sender@.example..test'},{...both,EMAIL_FROM:'a@example.test\r\nX-Fake: yes'},{...both,BREVO_API_KEY:''}]){
 assert.equal(mailTransportConfigured(env),false);
 let calls=0;assert.equal(await sendTransactionalEmail(env,message,async()=>{calls++;}),false);assert.equal(calls,0);
}
console.log('PASS invalid provider, missing Brevo key and malformed sender fail before delivery');
for(const failure of ['response','network']){
 let calls=0;
 const sent=await sendTransactionalEmail(both,message,async(url)=>{
  calls++;assert.equal(url,'https://api.brevo.com/v3/smtp/email');
  if(failure==='network')throw Error('Controlled private provider diagnostic');
  return new Response('Controlled private provider diagnostic',{status:403});
 });
 assert.equal(sent,false);assert.equal(calls,1);
}
console.log('PASS provider denial and network failure expose no provider body and trigger no fallback');
const discovery={EMAIL_PROVIDER:'brevo',BREVO_API_KEY:'fixture-brevo'};
const active={email:'sender@EXAMPLE.test',active:true},inactive={email:'another@example.test',active:false};
assert.equal(mailTransportConfigured(discovery),true);
for(const [list,ok] of [
 [{senders:[inactive,active,{...active,email:'sender@example.test'}]},true],
 [{senders:[]},false],[{senders:[inactive]},false],[{senders:[active,{...inactive,active:true}]},false],
 [{senders:[{...active,email:'invalid'}]},false],[{senders:[{email:'sender@example.test'}]},false],
 [{senders:[active],count:2},false],[{},false],[null,false]
]){
 const routes=[];
 const sent=await sendTransactionalEmail(discovery,message,async(url,options)=>{
  routes.push(url);assert.equal(options.headers['api-key'],discovery.BREVO_API_KEY);
  if(url.endsWith('/senders')){
   assert.equal(options.method,'GET');assert.equal(options.body,undefined);
   return list?Response.json(list):new Response(null,{status:401});
  }
  assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body).sender,{name:'VOIDLINE',email:'sender@example.test'});
  return new Response(null,{status:201});
 });
 assert.equal(sent,ok);assert.deepEqual(routes,ok?['https://api.brevo.com/v3/senders','https://api.brevo.com/v3/smtp/email']:['https://api.brevo.com/v3/senders']);
}
console.log('PASS sender discovery requires exactly one distinct active address and handles malformed/failed lookups before sending');
