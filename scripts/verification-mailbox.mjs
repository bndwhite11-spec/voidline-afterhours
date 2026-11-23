// Isolated mail transport for local workerd verification. No network client is
// used here. Only reserved example.test recipients can receive fixture links.
export function verificationMailbox(origin, denied) {
  const links=new Map();
  return {
    bindings:{VOIDLINE_ORIGIN:origin,RESEND_API_KEY:'local-fixture',EMAIL_FROM:'qa@example.test'},
    async exchange(request) {
      if(request.url!=='https://api.resend.com/emails'||request.method!=='POST')return denied();
      const {to,text}=await request.json();
      const link=String(text).match(/https:\/\/[^\s]+\/#signup-email=[0-9a-f]{64}(?=\s|$)/)?.[0];
      if(!Array.isArray(to)||to.length!==1||!/^[a-z0-9_]+@example\.test$/.test(to[0])||!link||new URL(link).origin!==origin)return denied();
      links.set(to[0],link);
      return Response.json({id:'local-mail-receipt'});
    },
    has:email=>links.has(email),
    take(email){const link=links.get(email);links.delete(email);if(!link)throw Error('Signup email was not delivered to the isolated mailbox');return link;},
  };
}
