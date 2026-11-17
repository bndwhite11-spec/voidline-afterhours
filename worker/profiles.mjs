/** Account-backed public profile details. Authentication information is never public. */
import {authenticate,validateSessionMutation,authRateLimit,AuthError} from './auth.mjs';
import {BADGE_DEFINITIONS,relationship,mayView,earnedBadges,effectiveCatalog} from './cosmetics.mjs';
import {profileMedia} from './media.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const need=(value,status,code,message)=>{if(!value)throw new AuthError(status,code,message);};
export const PROFILE_OPTIONS=Object.freeze({banners:['midnight','blueprint','eclipse','noise','orchid'],accents:['ice','lilac','jade','oxide','gold'],avatars:['moon','orbit','spark','leaf','ghost'],visibilities:['public','shared','friends','private']});
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 const reader=request.body?.getReader();need(reader,400,'invalid_body','A request body is required.');let total=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>8192){await reader.cancel();throw new AuthError(413,'body_too_large','The profile is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const value of chunks){bytes.set(value,offset);offset+=value.length;}let body;
 try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AuthError(400,'invalid_body','The profile could not be read.');}
 need(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_body','Use a profile object.');return body;
}
const bounded=(value,maximum,label)=>{need(typeof value==='string'&&value.length<=maximum&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),400,'invalid_profile',`${label} must contain at most ${maximum} characters.`);return value.trim();};
const choice=(value,options,fallback)=>{const selected=value??fallback;need(options.includes(selected),400,'invalid_profile','Choose one of the available profile settings.');return selected;};
function prefs(row){return {banner:row?.banner||'midnight',accent:row?.accent||'ice',detailsVisibility:row?.details_visibility||'shared',collectionVisibility:row?.collection_visibility||'shared',animationEnabled:!!row?.animation_enabled,badgeOrder:JSON.parse(row?.badge_order||'[]'),avatarMediaId:row?.avatar_media_id||null,bannerMediaId:row?.banner_media_id||null};}
export async function readProfile(db,viewer,id){
 const target=await q(db,"SELECT id,username,display_name,bio,status,avatar,theme,created_at,account_status FROM live_accounts WHERE id=? AND username IS NOT NULL AND account_status='active'",id).first();need(target,404,'profile_unavailable','This profile is unavailable.');
 const relation=await relationship(db,viewer,id);need(!relation.blocked,403,'profile_unavailable','This profile is unavailable.');
 const settings=prefs(await q(db,'SELECT * FROM profile_preferences WHERE account_id=?',id).first());
 need(relation.own||relation.friends||relation.shared||settings.detailsVisibility==='public',403,'profile_unavailable','This profile is unavailable.');
 const detailsVisible=mayView(settings.detailsVisibility,relation),collectionVisible=mayView(settings.collectionVisibility,relation);
 const [cosmetic,owner,awards]=await Promise.all([q(db,'SELECT equipped_id FROM cosmetic_profiles WHERE account_id=?',id).first(),q(db,'SELECT account_id FROM platform_owner WHERE id=1').first(),earnedBadges(db,id)]);
 const badgeById=new Map(awards.map(a=>[a.badge_id,a])),ordered=settings.badgeOrder.map(id=>badgeById.get(id)).filter(Boolean);
 const visibleAwards=ordered;
 const profile={id:target.id,username:target.username,displayName:target.display_name,avatar:target.avatar,avatarMedia:settings.avatarMediaId?await profileMedia(db,settings.avatarMediaId,'avatar'):null,theme:target.theme,createdAt:target.created_at,detailsVisible,collectionVisible,equippedId:cosmetic?.equipped_id||null,role:owner?.account_id===id?'platform-owner':null,earnedBadges:detailsVisible?visibleAwards:[]};
 if(detailsVisible)Object.assign(profile,{bio:target.bio,status:target.status,banner:settings.banner,bannerMedia:settings.bannerMediaId?await profileMedia(db,settings.bannerMediaId,'banner'):null,accent:settings.accent,animationEnabled:settings.animationEnabled});
 if(collectionVisible){
  const catalog=new Map((await effectiveCatalog(db)).map(item=>[item.id,item]));
  profile.showcase=(await q(db,`SELECT s.slot,s.instance_id,s.show_sender,i.catalog_id,i.origin_kind,i.created_at,CASE WHEN s.show_sender=1 THEN a.display_name ELSE NULL END AS sender_name,CASE WHEN s.show_sender=1 THEN a.username ELSE NULL END AS sender_username
  FROM gift_showcase s JOIN gift_instances i ON i.id=s.instance_id AND i.owner_id=s.account_id LEFT JOIN cosmetic_gifts g ON g.id=i.origin_gift_id LEFT JOIN live_accounts a ON a.id=g.sender_id WHERE s.account_id=? ORDER BY s.slot LIMIT 3`,id).all()).results.map(item=>({...item,name:catalog.get(item.catalog_id)?.name||'Gift'}));
 }
 if(relation.own)Object.assign(profile,{...settings,earnedBadges:awards});
 return profile;
}
export async function handleProfilesRequest(request,env){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/profiles\//,'').split('/').filter(Boolean);
  need(url.pathname.startsWith('/api/profiles/'),404,'not_found','This profile page is unavailable.');
  const user=await authenticate(request,env),db=env.DB;
  if(request.method==='GET'&&path.length===1){const id=path[0]==='me'?user.id:decodeURIComponent(path[0]);return json({profile:await readProfile(db,user.id,id),options:PROFILE_OPTIONS});}
  need(request.method==='POST'&&path.length===1&&path[0]==='me',405,'method_not_allowed','This profile action is unavailable.');
  const body=await bodyJSON(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'profile',30,Date.now(),user.id);
  need(!['role','owner','platformOwner','awards','giftInstances'].some(key=>key in body),400,'invalid_profile','Profile settings cannot assign roles, badges or gifts.');
  const old=await q(db,'SELECT * FROM live_accounts WHERE id=?',user.id).first(),oldPrefs=prefs(await q(db,'SELECT * FROM profile_preferences WHERE account_id=?',user.id).first()),now=Date.now();
  const displayName=bounded(body.displayName??old.display_name,32,'Display name');need(displayName.length>=2,400,'invalid_profile','Use a display name of 2–32 characters.');
  const bio=bounded(body.bio??old.bio,240,'Bio'),status=bounded(body.status??old.status,80,'Status');
  const avatar=choice(body.avatar,PROFILE_OPTIONS.avatars,old.avatar),banner=choice(body.banner,PROFILE_OPTIONS.banners,oldPrefs.banner),accent=choice(body.accent,PROFILE_OPTIONS.accents,oldPrefs.accent),detailsVisibility=choice(body.detailsVisibility,PROFILE_OPTIONS.visibilities,oldPrefs.detailsVisibility),collectionVisibility=choice(body.collectionVisibility,PROFILE_OPTIONS.visibilities,oldPrefs.collectionVisibility);
  const animationEnabled=body.animationEnabled===undefined?oldPrefs.animationEnabled:body.animationEnabled;need(typeof animationEnabled==='boolean',400,'invalid_profile','Choose whether profile animation is enabled.');
  const mediaId=(key)=>{const value=body[key]===undefined?oldPrefs[key]:body[key];need(value===null||typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),400,'invalid_media','Choose one of your uploaded profile images or reset it.');return value;};
  const avatarMediaId=mediaId('avatarMediaId'),bannerMediaId=mediaId('bannerMediaId');
  const active={sql:"EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.account_status='active')",args:[user.sessionId,user.id,now]};
  const validMedia=(id,kind)=>({sql:id?"EXISTS(SELECT 1 FROM media_assets f WHERE f.id=? AND f.owner_id=? AND f.kind=? AND((f.state='staged' AND f.expires_at>?) OR(f.state='ready' AND EXISTS(SELECT 1 FROM profile_preferences p WHERE p.account_id=f.owner_id AND(f.id=p.avatar_media_id OR f.id=p.banner_media_id)))))":'1=1',args:id?[id,user.id,kind,now]:[]});
  const avatarGuard=validMedia(avatarMediaId,'avatar'),bannerGuard=validMedia(bannerMediaId,'banner'),guard={sql:`${active.sql} AND ${avatarGuard.sql} AND ${bannerGuard.sql}`,args:[...active.args,...avatarGuard.args,...bannerGuard.args]};
  need(await q(db,'SELECT 1 AS allowed WHERE '+guard.sql,...guard.args).first(),409,'profile_changed','Your session or uploaded image changed. Reload the saved profile and retry.');
  const order=body.badgeOrder??oldPrefs.badgeOrder;need(Array.isArray(order)&&order.length<=3&&new Set(order).size===order.length&&order.every(id=>typeof id==='string'),400,'invalid_badge_order','Choose up to three distinct earned badges.');
  const validAwards=await earnedBadges(db,user.id);need(order.every(id=>validAwards.some(a=>a.badge_id===id)),403,'badge_not_owned','Only valid earned badges can be displayed.');
  const definition=BADGE_DEFINITIONS.find(d=>d.id==='profile-authored');
  const results=await db.batch([
   q(db,'UPDATE live_accounts SET display_name=?,bio=?,status=?,avatar=?,updated_at=? WHERE id=? AND '+guard.sql,displayName,bio,status,avatar,now,user.id,...guard.args),
   q(db,'INSERT INTO profile_preferences(account_id,banner,accent,details_visibility,collection_visibility,animation_enabled,badge_order,updated_at,avatar_media_id,banner_media_id) SELECT ?,?,?,?,?,?,?,?,?,? WHERE '+guard.sql+' ON CONFLICT(account_id) DO UPDATE SET banner=excluded.banner,accent=excluded.accent,details_visibility=excluded.details_visibility,collection_visibility=excluded.collection_visibility,animation_enabled=excluded.animation_enabled,badge_order=excluded.badge_order,updated_at=excluded.updated_at,avatar_media_id=excluded.avatar_media_id,banner_media_id=excluded.banner_media_id',user.id,banner,accent,detailsVisibility,collectionVisibility,animationEnabled?1:0,JSON.stringify(order),now,avatarMediaId,bannerMediaId,...guard.args),
   q(db,"UPDATE media_assets SET state='ready',expires_at=NULL,updated_at=? WHERE owner_id=? AND id IN(?,?) AND state IN('staged','ready') AND EXISTS(SELECT 1 FROM profile_preferences p WHERE p.account_id=? AND(p.avatar_media_id=media_assets.id OR p.banner_media_id=media_assets.id)) AND "+active.sql,now,user.id,avatarMediaId,bannerMediaId,user.id,...active.args),
   q(db,'INSERT OR IGNORE INTO badge_definitions(id,name,description,requirement,rule,active,created_at,updated_at) SELECT ?,?,?,?,?,1,?,? WHERE '+active.sql,definition.id,definition.name,definition.description,definition.requirement,definition.rule,now,now,...active.args),
   q(db,`INSERT OR IGNORE INTO badge_awards(id,account_id,badge_id,issuer_id,issued_at,reason)
    SELECT ?,a.id,?,NULL,?,'Completed the published profile rule' FROM live_accounts a JOIN profile_preferences p ON p.account_id=a.id JOIN badge_definitions d ON d.id=? AND d.active=1 AND d.rule='profile-authored'
    WHERE a.id=? AND length(a.bio)>=20 AND(a.avatar<>'moon' OR p.banner<>'midnight' OR p.accent<>'ice' OR p.avatar_media_id IS NOT NULL OR p.banner_media_id IS NOT NULL) AND ${active.sql}`,'profile-authored:'+user.id,definition.id,now,definition.id,user.id,...active.args),
   q(db,"INSERT INTO live_changes(channel_id,message_id,actor_id,kind,created_at) SELECT channel_id,id,?,'profile',? FROM live_messages WHERE author_id=? AND "+active.sql,user.id,now,user.id,...active.args)
  ]);
  need(results[0]?.meta?.changes>0,409,'profile_changed','Your account changed before the profile could be saved. Your edits remain on this device.');
  return json({profile:await readProfile(db,user.id,user.id),saved:true});
 }catch(error){return json({error:{code:error instanceof AuthError?error.code:'profile_unavailable',message:error instanceof AuthError?error.message:'The profile could not be updated. Please retry.'}},error instanceof AuthError?error.status:503);}
}
export default {fetch:handleProfilesRequest};
