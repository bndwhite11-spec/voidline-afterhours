/** Small profile identity projection for lists and message authors.
 * Native group membership alone never grants access to someone's profile.
 * Keep the relationship/block gate aligned with profileAvatarMediaForViewer.
 */
import {profileAvatarMediaForViewer} from './media.mjs';
import {mayView} from './cosmetics.mjs';
const marks=new Set(['moon','orbit','spark','leaf','ghost']);
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
export async function profileAvatarsForViewer(db,viewerId,accountIds){
 const ids=[...new Set(accountIds.filter(id=>typeof id==='string'&&id))],result=new Map();
 for(let start=0;start<ids.length;start+=80){
  const batch=ids.slice(start,start+80);
  const rows=(await q(db,`SELECT a.id,a.avatar,p.*,a.id=? AS is_own,
   EXISTS(SELECT 1 FROM social_requests relation WHERE relation.state='accepted' AND((relation.sender_id=? AND relation.recipient_id=a.id)OR(relation.recipient_id=? AND relation.sender_id=a.id))) AS is_friend,
   EXISTS(SELECT 1 FROM live_memberships own JOIN live_memberships theirs ON theirs.community_id=own.community_id WHERE own.account_id=? AND theirs.account_id=a.id) AS is_shared
   FROM live_accounts a
   LEFT JOIN profile_preferences p ON p.account_id=a.id
   WHERE a.id IN(${batch.map(()=>'?').join(',')}) AND a.account_status='active' AND a.username IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE(b.blocker_id=? AND b.blocked_id=a.id)OR(b.blocker_id=a.id AND b.blocked_id=?))
   AND(a.id=? OR p.details_visibility='public'
    OR EXISTS(SELECT 1 FROM social_requests r WHERE r.state='accepted' AND((r.sender_id=? AND r.recipient_id=a.id)OR(r.recipient_id=? AND r.sender_id=a.id)))
    OR EXISTS(SELECT 1 FROM live_memberships mine JOIN live_memberships theirs ON theirs.community_id=mine.community_id WHERE mine.account_id=? AND theirs.account_id=a.id))`,viewerId,viewerId,viewerId,viewerId,...batch,viewerId,viewerId,viewerId,viewerId,viewerId,viewerId).all()).results;
  const media=await profileAvatarMediaForViewer(db,viewerId,rows.map(row=>row.id));
  for(const row of rows){const relation={own:!!row.is_own,friends:!!row.is_friend,shared:!!row.is_shared,blocked:false};const detailsVisible=mayView(row.details_visibility||'shared',relation);result.set(row.id,{avatar:marks.has(row.avatar)?row.avatar:'moon',avatarMedia:media.get(row.id)||null,nameStyle:detailsVisible&&['serif','mono'].includes(row.name_style)?row.name_style:'plain',profileAvailable:true});}
 }
 return result;
}
export const unavailableAvatar=Object.freeze({avatar:null,avatarMedia:null,nameStyle:'plain',profileAvailable:false});
