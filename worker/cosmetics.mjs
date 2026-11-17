/** Free cosmetic collections. These records confer no authorization role. */
import {authenticate, validateSessionMutation, normalizeUsername, authRateLimit, AuthError} from './auth.mjs';
export const COSMETICS = Object.freeze([
 {id:'larp',type:'badge',name:'LARP PRO MAX',description:'A polished shield for taking your online persona a little too seriously.',finish:'Brushed titanium'},
 {id:'angel',type:'badge',name:'404 Angel',description:'A small pair of chrome wings with a halo that never quite connects.',finish:'Pale chrome'},
 {id:'ghost',type:'badge',name:'Ghost Frequency',description:'A quiet apparition caught between two radio waves.',finish:'Smoked silver'},
 {id:'velvet',type:'badge',name:'Velvet Static',description:'A ribbon of violet metal, folded into an impossible loop.',finish:'Violet alloy'},
 {id:'night',type:'badge',name:'Night Shift',description:'For the hours when the room gets quieter and the conversation gets better.',finish:'Midnight steel'},
 {id:'unknown',type:'badge',name:'Unknown Entity',description:'An unlabelled object in a finely machined frame.',finish:'Iridescent glass'},
 {id:'dead',type:'badge',name:'Dead Internet',description:'A fractured little globe. Somehow, we are still here.',finish:'Oxidised chrome'},
 {id:'voidwalker',type:'badge',name:'Voidwalker',description:'A cut through the dark, held inside a faceted metal seal.',finish:'Black titanium'},
 {id:'orbit',type:'badge',name:'Low Orbit',description:'A satellite circling a tiny violet moon.',finish:'Satin aluminium'},
 {id:'gift-rose',type:'gift',name:'Chrome Rose',description:'A rose that needs no water. Its petals are folded from bright metal.',finish:'Rose chrome'},
 {id:'gift-cassette',type:'gift',name:'Midnight Tape',description:'A tiny mixtape for someone whose company you like.',finish:'Smoked glass'},
 {id:'gift-star',type:'gift',name:'Pocket Star',description:'A five-point star, carefully wrapped for its next home.',finish:'Lilac crystal'},
 {id:'gift-cup',type:'gift',name:'Afterhours Cup',description:'One more cup, then we should probably get some sleep.',finish:'Glazed ceramic'},
 {id:'gift-ghost',type:'gift',name:'Paper Ghost',description:'A friendly little ghost folded from pearlescent paper.',finish:'Pearl paper'},
 {id:'gift-parcel',type:'gift',name:'Small Surprise',description:'A midnight-blue parcel with a silver ribbon. Just because.',finish:'Velvet and foil'}
].map(item=>Object.freeze({...item,price:0,acquisition:'Free to collect. Cosmetic only; no staff role or verified achievement.'})));
const catalog=new Map(COSMETICS.map(c=>[c.id,c]));
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 need(Number(request.headers.get('content-length')||0)<=4096,413,'body_too_large','This request is too large.');
 const reader=request.body?.getReader();need(reader,400,'invalid_body','A request body is required.');let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw new AuthError(413,'body_too_large','This request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}const text=new TextDecoder().decode(bytes);
 let body;try{body=JSON.parse(text);}catch{throw new AuthError(400,'invalid_body','The request could not be read.');}
 need(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_body','Use a JSON object.');return body;
}
function itemFor(id,type){const item=catalog.get(id);need(item&&(!type||item.type===type),400,'unknown_cosmetic','Choose an item from the collection.');return item;}
const giftColumns=`g.id,g.catalog_id,g.sender_id,g.recipient_id,g.state,g.created_at,g.opened_at,s.display_name AS sender_name,s.username AS sender_username,r.display_name AS recipient_name,r.username AS recipient_username`;
const giftJoins=`FROM cosmetic_gifts g JOIN live_accounts s ON s.id=g.sender_id JOIN live_accounts r ON r.id=g.recipient_id`;
async function inventory(db,userId){
 const [owned,profile,pending]=await Promise.all([
  q(db,'SELECT cosmetic_id,claimed_at FROM cosmetic_ownership WHERE account_id=? ORDER BY claimed_at,cosmetic_id',userId).all(),
  q(db,'SELECT equipped_id,gifts_enabled FROM cosmetic_profiles WHERE account_id=?',userId).first(),
  q(db,"SELECT COUNT(*) AS n FROM cosmetic_gifts WHERE recipient_id=? AND state='pending'",userId).first()
 ]);
 return {owned:owned.results,equippedId:profile?.equipped_id||null,giftsEnabled:profile?.gifts_enabled!==0,pendingGifts:pending.n};
}
export async function handleCosmeticsRequest(request,env){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/cosmetics\/?/,'').split('/').filter(Boolean),method=request.method;
  need(url.pathname.startsWith('/api/cosmetics/'),404,'not_found','This collection page is unavailable.');
  need(['GET','POST'].includes(method),405,'method_not_allowed','This action is unavailable.');
  const user=await authenticate(request,env),db=env.DB,now=Date.now();
  let body;if(method==='POST'){body=await bodyJSON(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'cosmetics',60,now,user.id);}
  if(path.length===1&&path[0]==='catalog'&&method==='GET')return json({items:COSMETICS,free:true});
  if(path.length===1&&path[0]==='inventory'&&method==='GET')return json(await inventory(db,user.id));
  if(path.length===1&&path[0]==='claim'&&method==='POST'){
   itemFor(body.cosmeticId);await q(db,'INSERT OR IGNORE INTO cosmetic_ownership(account_id,cosmetic_id,claimed_at) VALUES(?,?,?)',user.id,body.cosmeticId,now).run();
   return json({claimed:true,...await inventory(db,user.id)});
  }
  if(path.length===1&&path[0]==='equip'&&method==='POST'){
   const id=body.cosmeticId;
   if(id!==null){itemFor(id,'badge');need(await q(db,'SELECT 1 AS found FROM cosmetic_ownership WHERE account_id=? AND cosmetic_id=?',user.id,id).first(),403,'not_owned','Collect this badge before equipping it.');}
   await q(db,'INSERT INTO cosmetic_profiles(account_id,equipped_id) VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET equipped_id=excluded.equipped_id',user.id,id).run();
   return json({equipped:true,...await inventory(db,user.id)});
  }
  if(path.length===1&&path[0]==='settings'&&method==='POST'){
   need(typeof body.giftsEnabled==='boolean',400,'invalid_setting','Choose whether to receive gifts.');
   await q(db,'INSERT INTO cosmetic_profiles(account_id,gifts_enabled) VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET gifts_enabled=excluded.gifts_enabled',user.id,body.giftsEnabled?1:0).run();
   return json(await inventory(db,user.id));
  }
  if(path.length===2&&path[0]==='profiles'&&method==='GET'){
   const id=decodeURIComponent(path[1]);
   const blocked=id!==user.id&&await q(db,'SELECT 1 AS found FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',user.id,id,id,user.id).first();
   const allowed=!blocked&&(id===user.id||await q(db,'SELECT 1 AS found FROM live_memberships a JOIN live_memberships b ON a.community_id=b.community_id WHERE a.account_id=? AND b.account_id=? LIMIT 1',user.id,id).first()||await q(db,"SELECT 1 AS found FROM social_requests WHERE state='accepted' AND ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) LIMIT 1",user.id,id,id,user.id).first());
   need(allowed,403,'profile_unavailable','This profile is unavailable.');
   const profile=await q(db,'SELECT equipped_id FROM cosmetic_profiles WHERE account_id=?',id).first();
   return json({equippedId:profile?.equipped_id||null});
  }
  if(path.length===1&&path[0]==='gifts'&&method==='GET'){
   const box=url.searchParams.get('box')==='sent'?'sent':'inbox',offset=Number(url.searchParams.get('offset')||0);
   need(Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Choose a valid page.');
   const column=box==='sent'?'sender_id':'recipient_id';
   const total=(await q(db,`SELECT COUNT(*) AS n FROM cosmetic_gifts WHERE ${column}=?`,user.id).first()).n;
   const rows=(await q(db,`SELECT ${giftColumns} ${giftJoins} WHERE g.${column}=? ORDER BY g.created_at DESC,g.id DESC LIMIT 30 OFFSET ?`,user.id,offset).all()).results;
   return json({gifts:rows,total,box,page:{offset,limit:30,hasMore:offset+rows.length<total}});
  }
  if(path.length===1&&path[0]==='gifts'&&method==='POST'){
   const item=itemFor(body.catalogId,'gift');
   need(typeof body.clientId==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(body.clientId),400,'invalid_client_id','Use a stable gift request ID.');
   const username=normalizeUsername(body.username);
   const previous=await q(db,'SELECT g.*,a.username AS recipient_username FROM cosmetic_gifts g JOIN live_accounts a ON a.id=g.recipient_id WHERE sender_id=? AND client_id=?',user.id,body.clientId).first();
   if(previous){need(previous.catalog_id===item.id&&previous.recipient_username===username,409,'retry_conflict','That gift request ID already belongs to a different gift.');return json({gift:previous,acknowledged:true});}
   const recipient=await q(db,'SELECT a.id,p.gifts_enabled FROM live_accounts a LEFT JOIN cosmetic_profiles p ON p.account_id=a.id WHERE a.username=? AND a.onboarding_complete=1',username).first();
   need(recipient&&recipient.gifts_enabled!==0,404,'recipient_unavailable','This username is unavailable for gifts.');
   const blocked=await q(db,'SELECT 1 AS found FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',user.id,recipient.id,recipient.id,user.id).first();
   need(!blocked,404,'recipient_unavailable','This username is unavailable for gifts.');
   need(recipient.id!==user.id,400,'gift_to_self','Use Add to collection to keep a gift for yourself.');
   const id=crypto.randomUUID();
   // Conditional insertion enforces limits at the same database operation as
   // creation; retries retain the original request and never send twice.
   await q(db,`INSERT OR IGNORE INTO cosmetic_gifts(id,sender_id,recipient_id,catalog_id,client_id,state,created_at)
    SELECT ?,?,?,?,?,'pending',? WHERE
    (SELECT COUNT(*) FROM cosmetic_gifts WHERE sender_id=? AND created_at>?)<10 AND
    (SELECT COUNT(*) FROM cosmetic_gifts WHERE sender_id=? AND recipient_id=? AND created_at>?)<3 AND
    NOT EXISTS(SELECT 1 FROM cosmetic_profiles WHERE account_id=? AND gifts_enabled=0) AND
    NOT EXISTS(SELECT 1 FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))`,id,user.id,recipient.id,item.id,body.clientId,now,user.id,now-3600000,user.id,recipient.id,now-86400000,recipient.id,user.id,recipient.id,recipient.id,user.id).run();
   const gift=await q(db,'SELECT * FROM cosmetic_gifts WHERE sender_id=? AND client_id=?',user.id,body.clientId).first();
   need(gift,429,'gift_limit','You can send up to 10 gifts per hour and 3 to the same person per day. Try again later.');
   need(gift.catalog_id===item.id&&gift.recipient_id===recipient.id,409,'retry_conflict','That request ID already belongs to a different gift.');
   return json({gift,acknowledged:true},201);
  }
  if(path.length===3&&path[0]==='gifts'&&['open','decline'].includes(path[2])&&method==='POST'){
   const gift=await q(db,'SELECT * FROM cosmetic_gifts WHERE id=? AND recipient_id=?',path[1],user.id).first();
   need(gift,404,'gift_unavailable','This gift is unavailable.');
   const opening=path[2]==='open';
   if(opening){const blocked=await q(db,'SELECT 1 AS found FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',user.id,gift.sender_id,gift.sender_id,user.id).first();need(!blocked,409,'gift_unavailable','This gift cannot be collected while either account is blocked.');}
   need(gift.state!==(opening?'declined':'opened'),409,'gift_already_handled',opening?'This gift was declined.':'This gift was already collected.');
   const blockGuard=opening?' AND NOT EXISTS(SELECT 1 FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))':'';
   const writes=[q(db,"UPDATE cosmetic_gifts SET state=?,opened_at=COALESCE(opened_at,?) WHERE id=? AND recipient_id=? AND state='pending'"+blockGuard,opening?'opened':'declined',now,gift.id,user.id,...(opening?[user.id,gift.sender_id,gift.sender_id,user.id]:[]))];
   if(opening)writes.push(q(db,"INSERT OR IGNORE INTO cosmetic_ownership(account_id,cosmetic_id,claimed_at) SELECT recipient_id,catalog_id,? FROM cosmetic_gifts WHERE id=? AND recipient_id=? AND state='opened' AND NOT EXISTS(SELECT 1 FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))",now,gift.id,user.id,user.id,gift.sender_id,gift.sender_id,user.id));
   await db.batch(writes);
   const final=await q(db,'SELECT state FROM cosmetic_gifts WHERE id=? AND recipient_id=?',gift.id,user.id).first();
   need(final?.state===(opening?'opened':'declined'),409,'gift_already_handled','This gift was already handled in another session. Refresh the gift requests.');
   return json({handled:true,...await inventory(db,user.id)});
  }
  throw new AuthError(404,'not_found','This collection action is unavailable.');
 }catch(error){return json({error:{code:error instanceof AuthError?error.code:'collection_unavailable',message:error instanceof AuthError?error.message:'The collection could not be updated. Please retry.'}},error instanceof AuthError?error.status:503);}
}
export default {fetch:handleCosmeticsRequest};
