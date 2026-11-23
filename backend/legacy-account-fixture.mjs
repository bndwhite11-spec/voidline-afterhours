// Exercise current password hashing/session creation with a previously-delivered
// mailbox proof. Remove the email only in this isolated fixture to replicate an
// account created before verified-email registration. Never imported by Worker code.
import {randomBytes,createHash} from 'node:crypto';
export function withLegacyRegistration(handler){
 return async(request,env,...extra)=>{
  if(new URL(request.url).pathname!=='/api/auth/register'||request.method!=='POST')return handler(request,env,...extra);
  let data;try{data=await request.clone().json();}catch{return handler(request,env,...extra);}
  if(data.emailToken)return handler(request,env,...extra);
  const emailToken=randomBytes(32).toString('hex'),email=emailToken+'@example.test';
  await env.DB.prepare('INSERT INTO auth_registration_challenges VALUES(?,?,?)').bind(createHash('sha256').update(emailToken).digest('hex'),email,Date.now()+86400000).run();
  const payload=new Request(request.url,{method:request.method,headers:request.headers,body:JSON.stringify({...data,emailToken})});
  const response=await handler(payload,env,...extra);
  if(response.status===201)await env.DB.prepare('DELETE FROM account_emails WHERE email=?').bind(email).run();
  return response;
 };
}
