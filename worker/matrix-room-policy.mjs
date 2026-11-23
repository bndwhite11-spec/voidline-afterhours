// Content-free policy oracle for a dedicated, nonfederating Synapse module.
// Only the homeserver's credential authorizes a decision. Browser cookies and
// community roles cannot call this internal service.
import {authHash,readBody} from './auth.mjs';

const actions=new Set(['create','invite','join','send','state','remove']);
function response(allowed,status){
 return Response.json({allowed},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
function trustedOrigin(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&url.origin===value;
 }catch{return false;}
}

export async function handleMatrixRoomPolicy(request,env){
 const token=env.MATRIX_ROOM_POLICY_TOKEN,origin=env.MATRIX_HOMESERVER,name=env.MATRIX_SERVER_NAME;
 if(typeof token!=='string'||token.length<32||token.length>256||!trustedOrigin(origin)||typeof name!=='string'||!name||!trustedOrigin('https://'+name)||!env.DB)return response(false,503);
 const presented=request.headers.get('Authorization')||'';
 if(request.method!=='POST'||request.headers.has('Cookie')||presented.length>280||await authHash(presented)!==await authHash('Bearer '+token))return response(false,403);
 try{
  const body=await readBody(request);
  if(Object.keys(body).some(key=>!['action','actor','members'].includes(key))||!actions.has(body.action)||!Array.isArray(body.members)||body.members.length>64)return response(false,400);
  const members=[...new Set([body.actor,...body.members])];
  if(members.length>64||!members.every(id=>typeof id==='string'&&id.length<=255&&id.slice(67)===':'+name&&/^@v_[a-f0-9]{64}:/.test(id)))return response(false,400);
  // Single D1 snapshot for membership eligibility and both directions of blocks.
  // The Synapse callback supplies its resolved room state, never event-supplied
  // participant lists. Matrix membership itself is authorized by the homeserver.
  const row=await env.DB.prepare(`WITH eligible AS (
   SELECT a.id FROM matrix_account_links l JOIN live_accounts a ON a.id=l.account_id
   JOIN json_each(?) member ON member.value=l.matrix_user_id
   WHERE l.homeserver_origin=? AND l.verified_at IS NOT NULL
    AND a.account_status='active' AND a.onboarding_complete=1
  ) SELECT (SELECT count(*) FROM eligible) AS known,
   EXISTS(SELECT 1 FROM social_blocks b JOIN eligible a ON a.id=b.blocker_id JOIN eligible z ON z.id=b.blocked_id) AS blocked`).bind(JSON.stringify(members),origin).first();
  return response(row?.known===members.length&&row.blocked===0,200);
 }catch(error){return response(false,error?.status||503);}
}
