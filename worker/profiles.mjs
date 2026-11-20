/** Account-backed public profile details. Authentication information is never public. */
import {authenticate,validateSessionMutation,authRateLimit,AuthError} from './auth.mjs';
import {BADGE_DEFINITIONS,COSMETICS,relationship,mayView,earnedBadges,effectiveCatalog} from './cosmetics.mjs';
import {profileMedia} from './media.mjs';
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const need=(value,status,code,message)=>{if(!value)throw new AuthError(status,code,message);};
export const PROFILE_OPTIONS=Object.freeze({banners:['midnight','blueprint','eclipse','noise','orchid'],accents:['ice','lilac','jade','oxide','gold'],avatars:['moon','orbit','spark','leaf','ghost'],visibilities:['public','shared','friends','private'],nameStyles:['plain','serif','mono'],profileFrames:['none','line','halo']});
export function normalizeProfileAccent(value){
 if(PROFILE_OPTIONS.accents.includes(value))return value;
 if(typeof value==='string'&&value.length===7&&/^#[0-9a-f]{6}$/i.test(value))return value.toLowerCase();
 return null;
}
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
function prefs(row){return {banner:row?.banner||'midnight',accent:row?.accent||'ice',detailsVisibility:row?.details_visibility||'shared',collectionVisibility:row?.collection_visibility||'shared',animationEnabled:!!row?.animation_enabled,badgeOrder:JSON.parse(row?.badge_order||'[]'),avatarMediaId:row?.avatar_media_id||null,bannerMediaId:row?.banner_media_id||null,nameStyle:row?.name_style||'plain',profileFrame:row?.profile_frame||'none'};}
/** Run before the account/prefs update in the same batch. Compare committed author
 * fields, rather than an earlier request snapshot. CROSS JOIN keeps the one-row
 * account/prefs check outside history traversal when no author field changed.
 */
function authorDelta({displayName,avatar,avatarMediaId,nameStyle,detailsVisibility}){
 const media=avatarMediaId!==undefined||nameStyle!==undefined||detailsVisibility!==undefined,comparisons=[],values=[];
 if(displayName!==undefined){comparisons.push('author.display_name IS NOT ?');values.push(displayName);}
 if(avatar!==undefined){comparisons.push('author.avatar IS NOT ?');values.push(avatar);}
 if(avatarMediaId!==undefined){comparisons.push('p.avatar_media_id IS NOT ?');values.push(avatarMediaId);}
 if(nameStyle!==undefined){comparisons.push("COALESCE(p.name_style,'plain') IS NOT ?");values.push(nameStyle);}
 if(detailsVisibility!==undefined){comparisons.push("COALESCE(p.details_visibility,'shared') IS NOT ?");values.push(detailsVisibility);}
 return {media,comparisons,values};
}
export function profileAuthorChanges(db,user,now,patch,guard){
 const {media,comparisons,values}=authorDelta(patch);
 return q(db,`INSERT INTO live_changes(channel_id,message_id,actor_id,kind,created_at)
  SELECT m.channel_id,m.id,?,'profile',? FROM live_accounts author
  ${media?'LEFT JOIN profile_preferences p ON p.account_id=author.id':''}
  CROSS JOIN live_messages m
  WHERE author.id=? AND(${comparisons.join(' OR ')||'0=1'})
  AND m.author_id=author.id AND ${guard.sql}`,
  user.id,now,user.id,...values,...guard.args);
}
/** One real anchor per joined conversation wakes its readers; consumers reproject
 * only already-loaded rows by this author, rather than copying message history.
 */
export function profileNativeAuthorChanges(db,user,now,patch,guard){
 const {media,comparisons,values}=authorDelta(patch);
 return q(db,`INSERT INTO native_changes(conversation_id,message_id,actor_id,kind,created_at)
  SELECT member.conversation_id,(SELECT m.id FROM native_messages m WHERE m.author_id=author.id AND m.conversation_id=member.conversation_id ORDER BY m.seq DESC LIMIT 1),?,'profile',? FROM live_accounts author
  ${media?'LEFT JOIN profile_preferences p ON p.account_id=author.id':''}
  CROSS JOIN native_members member WHERE author.id=? AND member.account_id=author.id AND(${comparisons.join(' OR ')||'0=1'})
  AND EXISTS(SELECT 1 FROM native_messages m WHERE m.author_id=author.id AND m.conversation_id=member.conversation_id) AND ${guard.sql}`,
  user.id,now,user.id,...values,...guard.args);
}
const accountFields={displayName:'display_name',bio:'bio',status:'status',avatar:'avatar'};
const preferenceFields={banner:'banner',accent:'accent',detailsVisibility:'details_visibility',collectionVisibility:'collection_visibility',animationEnabled:'animation_enabled',badgeOrder:'badge_order',avatarMediaId:'avatar_media_id',bannerMediaId:'banner_media_id',nameStyle:'name_style',profileFrame:'profile_frame'};
const editableFields=[...Object.keys(accountFields),...Object.keys(preferenceFields),'equippedId','showcaseSlots'];
const slotsJSON=slots=>JSON.stringify(slots.map(s=>[s.slot,s.instanceId,s.showSender?1:0]));
const showcaseSQL="COALESCE((SELECT json_group_array(json_array(slot,instance_id,show_sender)) FROM(SELECT slot,instance_id,show_sender FROM gift_showcase WHERE account_id=? ORDER BY slot)),'[]')";
async function editableState(db,id){
 const row=await q(db,`SELECT a.display_name,a.bio,a.status,a.avatar,a.account_status,p.*,c.equipped_id,COALESCE(v.revision,0) AS revision,${showcaseSQL} AS slots_json FROM live_accounts a LEFT JOIN profile_preferences p ON p.account_id=a.id LEFT JOIN cosmetic_profiles c ON c.account_id=a.id LEFT JOIN profile_save_state v ON v.account_id=a.id WHERE a.id=?`,id,id).first();
 need(row,409,'profile_changed','Your account changed before the profile could be saved.');
 return {displayName:row.display_name,bio:row.bio,status:row.status,avatar:row.avatar,...prefs(row),equippedId:row.equipped_id||null,showcaseSlots:JSON.parse(row.slots_json).map(([slot,instanceId,showSender])=>({slot,instanceId,showSender:!!showSender})),revision:row.revision,accountStatus:row.account_status};
}
function normalized(key,value){
 if(key==='displayName'){const name=bounded(value,32,'Display name');need(name.length>=2,400,'invalid_profile','Use a display name of 2–32 characters.');return name;}
 if(key==='bio'||key==='status')return bounded(value,key==='bio'?240:80,key==='bio'?'Bio':'Status');
 if(key==='accent'){const accent=normalizeProfileAccent(value);need(accent,400,'invalid_profile','Choose a preset or a six-digit hex color.');return accent;}
 const options={avatar:'avatars',banner:'banners',detailsVisibility:'visibilities',collectionVisibility:'visibilities',nameStyle:'nameStyles',profileFrame:'profileFrames'};
 if(options[key])return choice(value,PROFILE_OPTIONS[options[key]],undefined);
 if(key==='animationEnabled'){need(typeof value==='boolean',400,'invalid_profile','Choose whether profile animation is enabled.');return value;}
 if(key==='avatarMediaId'||key==='bannerMediaId'){need(value===null||typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),400,'invalid_media','Choose an uploaded profile image or reset it.');return value;}
 if(key==='badgeOrder'){need(Array.isArray(value)&&value.length<=3&&new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&id.length<=128),400,'invalid_badge_order','Choose up to three distinct earned badges.');return value;}
 if(key==='equippedId'){need(value===null||typeof value==='string'&&COSMETICS.some(item=>item.id===value&&item.type==='badge'),400,'invalid_cosmetic','Choose an available profile decoration.');return value;}
 if(key==='showcaseSlots'){
  need(Array.isArray(value)&&value.length<=3&&value.every(s=>s&&typeof s.instanceId==='string'&&s.instanceId.length<=160&&Number.isSafeInteger(s.slot)&&s.slot>=1&&s.slot<=3&&typeof s.showSender==='boolean')&&new Set(value.map(s=>s.slot)).size===value.length&&new Set(value.map(s=>s.instanceId)).size===value.length,400,'invalid_showcase','Choose up to three different owned gifts.');
  return value.map(({slot,instanceId,showSender})=>({slot,instanceId,showSender})).sort((a,b)=>a.slot-b.slot);
 }
 throw new AuthError(400,'invalid_profile','Choose a supported profile field.');
}
const storedValue=(key,value)=>key==='badgeOrder'?JSON.stringify(value):key==='showcaseSlots'?slotsJSON(value):key==='animationEnabled'?(value?1:0):value;
function fieldExpression(key,id){
 if(accountFields[key])return {sql:`(SELECT ${accountFields[key]} FROM live_accounts WHERE id=?)`,args:[id]};
 if(preferenceFields[key]){const defaults={banner:'midnight',accent:'ice',detailsVisibility:'shared',collectionVisibility:'shared',animationEnabled:0,badgeOrder:'[]',avatarMediaId:null,bannerMediaId:null,nameStyle:'plain',profileFrame:'none'},column=preferenceFields[key],sql=`(SELECT ${column} FROM profile_preferences WHERE account_id=?)`;return {sql:key==='badgeOrder'?`json(COALESCE(${sql},'[]'))`:`COALESCE(${sql},?)`,args:key==='badgeOrder'?[id]:[id,defaults[key]]};}
 if(key==='equippedId')return {sql:'(SELECT equipped_id FROM cosmetic_profiles WHERE account_id=?)',args:[id]};
 return {sql:showcaseSQL,args:[id]};
}
function sameField(key,left,right){return JSON.stringify(storedValue(key,left))===JSON.stringify(storedValue(key,right));}
async function finalProfileScope(db,viewer,id,sessionId){
 return q(db,`SELECT target.account_status AS target_status,reader.account_status AS reader_status,COALESCE(p.details_visibility,'shared') AS details_visibility,COALESCE(p.collection_visibility,'shared') AS collection_visibility,
  EXISTS(SELECT 1 FROM social_blocks b WHERE(b.blocker_id=? AND b.blocked_id=?)OR(b.blocker_id=? AND b.blocked_id=?)) AS blocked,
  EXISTS(SELECT 1 FROM social_requests f WHERE f.state='accepted' AND((f.sender_id=? AND f.recipient_id=?)OR(f.sender_id=? AND f.recipient_id=?))) AS friends,
  EXISTS(SELECT 1 FROM live_memberships mine JOIN live_memberships theirs ON theirs.community_id=mine.community_id WHERE mine.account_id=? AND theirs.account_id=?) AS shared,
  ${sessionId?"EXISTS(SELECT 1 FROM auth_sessions s WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))":'1'} AS session_active
  FROM live_accounts target CROSS JOIN live_accounts reader LEFT JOIN profile_preferences p ON p.account_id=target.id WHERE target.id=? AND reader.id=?`,viewer,id,id,viewer,viewer,id,id,viewer,viewer,id,...(sessionId?[sessionId,viewer]:[]),id,viewer).first();
}
export async function readProfile(db,viewer,id,attempt=0,sessionId=null){
 const before=viewer===id?(await q(db,'SELECT revision FROM profile_save_state WHERE account_id=?',id).first())?.revision||0:null;
 const target=await q(db,"SELECT id,username,display_name,bio,status,avatar,theme,created_at,account_status FROM live_accounts WHERE id=? AND username IS NOT NULL AND account_status='active'",id).first();need(target,404,'profile_unavailable','This profile is unavailable.');
 const relation=await relationship(db,viewer,id);need(!relation.blocked,403,'profile_unavailable','This profile is unavailable.');
 const settings=prefs(await q(db,'SELECT * FROM profile_preferences WHERE account_id=?',id).first());
 need(relation.own||relation.friends||relation.shared||settings.detailsVisibility==='public',403,'profile_unavailable','This profile is unavailable.');
 const detailsVisible=mayView(settings.detailsVisibility,relation),collectionVisible=mayView(settings.collectionVisibility,relation);
 const [cosmetic,owner,awards]=await Promise.all([q(db,'SELECT equipped_id FROM cosmetic_profiles WHERE account_id=?',id).first(),q(db,'SELECT account_id FROM platform_owner WHERE id=1').first(),earnedBadges(db,id)]);
 const badgeById=new Map(awards.map(a=>[a.badge_id,a])),ordered=settings.badgeOrder.map(id=>badgeById.get(id)).filter(Boolean);
 // A displayed award publishes its requirement, date and issuing institution.
 // Reviewer account references and award notes remain in the owner's record.
 const visibleAwards=ordered.map(({reason,issuer_id,issuer_name,issuer,...award})=>({...award,issuer:issuer_id?'VOIDLINE platform award':'VOIDLINE server rule'}));
 const profile={id:target.id,username:target.username,displayName:target.display_name,avatar:target.avatar,avatarMedia:settings.avatarMediaId?await profileMedia(db,settings.avatarMediaId,'avatar'):null,theme:target.theme,createdAt:target.created_at,detailsVisible,collectionVisible,equippedId:cosmetic?.equipped_id||null,role:owner?.account_id===id?'platform-owner':null,earnedBadges:detailsVisible?visibleAwards:[]};
 if(detailsVisible)Object.assign(profile,{bio:target.bio,status:target.status,banner:settings.banner,bannerMedia:settings.bannerMediaId?await profileMedia(db,settings.bannerMediaId,'banner'):null,accent:settings.accent,animationEnabled:settings.animationEnabled,nameStyle:settings.nameStyle,profileFrame:settings.profileFrame});
 if(collectionVisible){
  const catalog=new Map((await effectiveCatalog(db)).map(item=>[item.id,item]));
  profile.showcase=(await q(db,`SELECT s.slot,s.instance_id,s.show_sender,i.catalog_id,i.origin_kind,i.created_at,CASE WHEN s.show_sender=1 OR ?=1 THEN a.display_name ELSE NULL END AS sender_name,CASE WHEN s.show_sender=1 OR ?=1 THEN a.username ELSE NULL END AS sender_username
  FROM gift_showcase s JOIN gift_instances i ON i.id=s.instance_id AND i.owner_id=s.account_id LEFT JOIN cosmetic_gifts g ON g.id=i.origin_gift_id LEFT JOIN live_accounts a ON a.id=g.sender_id AND a.account_status='active' AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE(b.blocker_id=a.id AND b.blocked_id IN(?,?)) OR(b.blocked_id=a.id AND b.blocker_id IN(?,?))) WHERE s.account_id=? ORDER BY s.slot LIMIT 3`,relation.own?1:0,relation.own?1:0,viewer,id,viewer,id,id).all()).results.map(item=>({...item,name:catalog.get(item.catalog_id)?.name||'Gift',...(relation.own?{senderDisclosureAvailable:!!item.sender_username}: {})}));
 }
 if(relation.own){const state=await editableState(db,id);if(state.revision!==before){need(attempt<2,409,'profile_changed','The saved profile changed while loading. Try again.');return readProfile(db,viewer,id,attempt+1,sessionId);}Object.assign(profile,{...settings,earnedBadges:awards,revision:state.revision,showcaseSlots:state.showcaseSlots});}
 const scope=await finalProfileScope(db,viewer,id,sessionId);
 need(scope?.reader_status==='active'&&scope.session_active,401,'sign_in_required','Your account session changed. Sign in again.');
 need(scope.target_status==='active',404,'profile_unavailable','This profile is unavailable.');
 const current={own:viewer===id,friends:!!scope.friends,shared:!!scope.shared,blocked:!!scope.blocked};
 need(!current.blocked&&(current.own||current.friends||current.shared||scope.details_visibility==='public'),403,'profile_unavailable','This profile is unavailable.');
 if(mayView(scope.details_visibility,current)!==detailsVisible||mayView(scope.collection_visibility,current)!==collectionVisible){need(attempt<2,409,'profile_changed','Profile visibility changed while loading. Try again.');return readProfile(db,viewer,id,attempt+1,sessionId);}
 return profile;
}
export async function handleProfilesRequest(request,env){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/profiles\//,'').split('/').filter(Boolean);
  need(url.pathname.startsWith('/api/profiles/'),404,'not_found','This profile page is unavailable.');
  const user=await authenticate(request,env),db=env.DB;
  if(request.method==='GET'&&path.length===1){const id=path[0]==='me'?user.id:decodeURIComponent(path[0]);return json({profile:await readProfile(db,user.id,id,0,user.sessionId),options:PROFILE_OPTIONS});}
  need(request.method==='POST'&&path.length===1&&path[0]==='me',405,'method_not_allowed','This profile action is unavailable.');
  const body=await bodyJSON(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'profile',30,Date.now(),user.id);
  need(!['role','owner','platformOwner','awards','giftInstances'].some(key=>key in body),400,'invalid_profile','Profile settings cannot assign roles, badges or gifts.');
  const patch=Object.fromEntries(editableFields.filter(key=>Object.hasOwn(body,key)).map(key=>[key,normalized(key,body[key])])),keys=Object.keys(patch),now=Date.now();
  const hasRevision=body.expectedRevision!==undefined;
  need(!hasRevision||Number.isSafeInteger(body.expectedRevision)&&body.expectedRevision>=0,400,'invalid_revision','Use the profile revision returned by the server.');
  const hasBase=body.baseValues!==undefined;
  need(!hasBase||body.baseValues&&typeof body.baseValues==='object'&&!Array.isArray(body.baseValues)&&keys.every(key=>Object.hasOwn(body.baseValues,key)),400,'invalid_profile_base','Include the saved base value for every edited field.');
  const base=hasBase?Object.fromEntries(keys.map(key=>[key,normalized(key,body.baseValues[key])])):null;
  const active={sql:"EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) AND a.account_status='active')",args:[user.sessionId,user.id]};
  const guards=[active];
  if(hasBase)for(const key of keys){const field=fieldExpression(key,user.id);guards.push({sql:`EXISTS(SELECT 1 FROM(SELECT ${field.sql} AS actual) WHERE actual IS ? OR actual IS ?)`,args:[...field.args,storedValue(key,base[key]),storedValue(key,patch[key])]});}
  else if(hasRevision)guards.push({sql:'COALESCE((SELECT revision FROM profile_save_state WHERE account_id=?),0)=?',args:[user.id,body.expectedRevision]});
  for(const [key,kind]of [['avatarMediaId','avatar'],['bannerMediaId','banner']])if(patch[key])guards.push({sql:"EXISTS(SELECT 1 FROM media_assets f WHERE f.id=? AND f.owner_id=? AND f.kind=? AND((f.state='staged' AND f.expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) OR(f.state='ready' AND EXISTS(SELECT 1 FROM profile_preferences p WHERE p.account_id=f.owner_id AND(f.id=p.avatar_media_id OR f.id=p.banner_media_id)))))",args:[patch[key],user.id,kind]});
  if(patch.badgeOrder?.length){const ids=patch.badgeOrder;guards.push({sql:`(SELECT COUNT(*) FROM badge_awards a JOIN badge_definitions d ON d.id=a.badge_id WHERE a.account_id=? AND a.badge_id IN(${ids.map(()=>'?').join(',')}) AND a.revoked_at IS NULL AND d.active=1)=?`,args:[user.id,...ids,ids.length]});}
  if(patch.equippedId)guards.push({sql:'EXISTS(SELECT 1 FROM cosmetic_ownership WHERE account_id=? AND cosmetic_id=?)',args:[user.id,patch.equippedId]});
  if(patch.showcaseSlots?.length){const ids=patch.showcaseSlots.map(s=>s.instanceId);guards.push({sql:`(SELECT COUNT(*) FROM gift_instances i WHERE i.owner_id=? AND i.id IN(${ids.map(()=>'?').join(',')}) AND(i.pending_transfer_id IS NULL OR EXISTS(SELECT 1 FROM gift_showcase s WHERE s.account_id=i.owner_id AND s.instance_id=i.id)))=?`,args:[user.id,...ids,ids.length]});}
  const guard={sql:guards.map(item=>'('+item.sql+')').join(' AND '),args:guards.flatMap(item=>item.args)};
  async function rejected(){
   const state=await editableState(db,user.id);
   need(state.accountStatus==='active'&&await q(db,'SELECT 1 WHERE '+active.sql,...active.args).first(),409,'profile_changed','Your session or account changed before this save. Sign in again; your draft has not been published.');
   const conflicts=hasBase?keys.filter(key=>!sameField(key,state[key],base[key])&&!sameField(key,state[key],patch[key])):hasRevision&&state.revision!==body.expectedRevision?(keys.length?keys:['revision']):[];
   if(conflicts.length){const error=new AuthError(409,'profile_conflict','This profile changed on another device. Review the conflicting fields; your draft has not been published.');error.conflicts=conflicts;error.profile=await readProfile(db,user.id,user.id,0,user.sessionId);throw error;}
   if(patch.badgeOrder){const awards=await earnedBadges(db,user.id);need(patch.badgeOrder.every(id=>awards.some(a=>a.badge_id===id)),403,'badge_not_owned','Only valid earned badges can be displayed.');}
   if(patch.equippedId)need(await q(db,'SELECT 1 FROM cosmetic_ownership WHERE account_id=? AND cosmetic_id=?',user.id,patch.equippedId).first(),403,'cosmetic_not_owned','Collect this decoration before equipping it.');
   if(patch.showcaseSlots?.length){const ids=patch.showcaseSlots.map(s=>s.instanceId),owned=await q(db,`SELECT COUNT(*) AS n FROM gift_instances i WHERE i.owner_id=? AND i.id IN(${ids.map(()=>'?').join(',')}) AND(i.pending_transfer_id IS NULL OR EXISTS(SELECT 1 FROM gift_showcase s WHERE s.account_id=i.owner_id AND s.instance_id=i.id))`,user.id,...ids).first();need(owned.n===ids.length,403,'instance_not_owned','Choose gifts you still own that are not being transferred.');}
   throw new AuthError(409,'profile_changed','An uploaded image or profile permission changed. Reload the saved profile; your draft has not been published.');
  }
  if(!await q(db,'SELECT 1 AS allowed WHERE '+guard.sql,...guard.args).first())await rejected();
  const token=crypto.randomUUID(),marker={sql:'EXISTS(SELECT 1 FROM profile_save_state WHERE account_id=? AND write_token=?)',args:[user.id,token]};
  const writes=[q(db,'INSERT INTO profile_save_state(account_id,write_token) SELECT ?,? WHERE '+guard.sql+' ON CONFLICT(account_id) DO UPDATE SET write_token=excluded.write_token',user.id,token,...guard.args),profileAuthorChanges(db,user,now,patch,marker),profileNativeAuthorChanges(db,user,now,patch,marker)];
  const accountKeys=keys.filter(key=>accountFields[key]);
  if(accountKeys.length)writes.push(q(db,'UPDATE live_accounts SET '+accountKeys.map(key=>accountFields[key]+'=?').join(',')+',updated_at=? WHERE id=? AND '+marker.sql+' AND('+accountKeys.map(key=>accountFields[key]+' IS NOT ?').join(' OR ')+')',...accountKeys.map(key=>patch[key]),now,user.id,...marker.args,...accountKeys.map(key=>patch[key])));
  const prefKeys=keys.filter(key=>preferenceFields[key]);
  if(prefKeys.length)writes.push(q(db,'INSERT INTO profile_preferences(account_id,'+prefKeys.map(key=>preferenceFields[key]).join(',')+',updated_at) SELECT ?,'+prefKeys.map(()=>'?').join(',')+',? WHERE '+marker.sql+' ON CONFLICT(account_id) DO UPDATE SET '+prefKeys.map(key=>preferenceFields[key]+'=excluded.'+preferenceFields[key]).join(',')+',updated_at=excluded.updated_at WHERE '+prefKeys.map(key=>'profile_preferences.'+preferenceFields[key]+' IS NOT excluded.'+preferenceFields[key]).join(' OR '),user.id,...prefKeys.map(key=>storedValue(key,patch[key])),now,...marker.args));
  else writes.push(q(db,'INSERT INTO profile_preferences(account_id,updated_at) SELECT ?,? WHERE '+marker.sql+' ON CONFLICT(account_id) DO NOTHING',user.id,now,...marker.args));
  const mediaIds=['avatarMediaId','bannerMediaId'].map(key=>patch[key]).filter(Boolean);
  if(mediaIds.length)writes.push(q(db,"UPDATE media_assets SET state='ready',expires_at=NULL,updated_at=? WHERE owner_id=? AND id IN("+mediaIds.map(()=>'?').join(',')+") AND state='staged' AND EXISTS(SELECT 1 FROM profile_preferences p WHERE p.account_id=? AND(p.avatar_media_id=media_assets.id OR p.banner_media_id=media_assets.id)) AND "+marker.sql,now,user.id,...mediaIds,user.id,...marker.args));
  if(Object.hasOwn(patch,'equippedId'))writes.push(q(db,'INSERT INTO cosmetic_profiles(account_id,equipped_id) SELECT ?,? WHERE '+marker.sql+' ON CONFLICT(account_id) DO UPDATE SET equipped_id=excluded.equipped_id WHERE cosmetic_profiles.equipped_id IS NOT excluded.equipped_id',user.id,patch.equippedId,...marker.args));
  if(patch.showcaseSlots){
   writes.push(q(db,'DELETE FROM gift_showcase WHERE account_id=? AND '+marker.sql+' AND '+showcaseSQL+' IS NOT ?',user.id,...marker.args,user.id,slotsJSON(patch.showcaseSlots)));
   for(const slot of patch.showcaseSlots)writes.push(q(db,'INSERT INTO gift_showcase(account_id,slot,instance_id,show_sender) SELECT ?,?,?,? WHERE '+marker.sql+' AND NOT EXISTS(SELECT 1 FROM gift_showcase WHERE account_id=? AND slot=?)',user.id,slot.slot,slot.instanceId,slot.showSender?1:0,...marker.args,user.id,slot.slot));
  }
  const definition=BADGE_DEFINITIONS.find(d=>d.id==='profile-authored');
  writes.push(q(db,'INSERT OR IGNORE INTO badge_definitions(id,name,description,requirement,rule,active,created_at,updated_at) SELECT ?,?,?,?,?,1,?,? WHERE '+marker.sql,definition.id,definition.name,definition.description,definition.requirement,definition.rule,now,now,...marker.args));
  writes.push(q(db,`INSERT OR IGNORE INTO badge_awards(id,account_id,badge_id,issuer_id,issued_at,reason) SELECT ?,a.id,?,NULL,?,'Completed the published profile rule' FROM live_accounts a JOIN profile_preferences p ON p.account_id=a.id JOIN badge_definitions d ON d.id=? AND d.active=1 AND d.rule='profile-authored' WHERE a.id=? AND length(a.bio)>=20 AND(a.avatar<>'moon' OR p.banner<>'midnight' OR p.accent<>'ice' OR p.avatar_media_id IS NOT NULL OR p.banner_media_id IS NOT NULL) AND ${marker.sql}`,'profile-authored:'+user.id,definition.id,now,definition.id,user.id,...marker.args));
  const result=await db.batch(writes);
  if(!result[0]?.meta?.changes)await rejected();
  return json({profile:await readProfile(db,user.id,user.id,0,user.sessionId),saved:true});
 }catch(error){return json({error:{code:error instanceof AuthError?error.code:'profile_unavailable',message:error instanceof AuthError?error.message:'The profile could not be updated. Please retry.'},...(error.code==='profile_conflict'?{conflicts:error.conflicts,profile:error.profile}:{})},error instanceof AuthError?error.status:503);}
}
export default {fetch:handleProfilesRequest};
