/** Shared logical account deletion. Callers authorize an immutable account ID
 * and provide a server-authored transaction guard; this helper grants no role.
 * Keep account/history/provenance references, remove private access and profile
 * data, and queue external lifecycle work without claiming remote completion.
 */
import {matrixPolicyStatement} from './matrix-policy.mjs';
import {accountMediaDeletionStatements} from './media.mjs';

const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
export const ACCOUNT_DELETION_RETENTION='Previous shared messages retain an anonymized author reference. Attached shared files and legitimate gift provenance remain subject to their existing retention rules. Configured messaging-service deactivation is queued separately; remote completion is not implied.';

export function accountDeletionStatements(db,{accountId,guardSql,guardBinds=[],time,actorId=accountId,operationId}={}){
 if(typeof accountId!=='string'||!accountId||typeof guardSql!=='string'||!guardSql||!Array.isArray(guardBinds)||!Number.isSafeInteger(time)||typeof operationId!=='string'||!operationId)throw TypeError('A guarded account deletion is required.');
 const guard=' AND ('+guardSql+')';
 const writes=[
  q(db,'DELETE FROM auth_identities WHERE account_id=?'+guard,accountId,...guardBinds),
  q(db,'UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL'+guard,time,accountId,...guardBinds),
  matrixPolicyStatement(db,{accountId,kind:'delete',idempotencyKey:operationId,requestedBy:actorId,time,guardSql,guardBinds}),
  ...accountMediaDeletionStatements(db,accountId,guardSql,guardBinds,time),
  q(db,"UPDATE gift_instances SET pending_transfer_id=NULL WHERE pending_transfer_id IN(SELECT id FROM gift_transfers WHERE state='pending' AND(sender_id=? OR recipient_id=?))"+guard,accountId,accountId,...guardBinds),
  q(db,"UPDATE gift_transfers SET state='cancelled',handled_at=? WHERE state='pending' AND(sender_id=? OR recipient_id=?)"+guard,time,accountId,accountId,...guardBinds),
 ];
 for(const [table,condition,values]of [
  ['live_memberships','account_id=?',[accountId]],
  ['live_bookmarks','account_id=?',[accountId]],
  ['live_favorites','account_id=?',[accountId]],
  ['live_read_states','account_id=?',[accountId]],
  ['social_requests','(sender_id=? OR recipient_id=?)',[accountId,accountId]],
  ['social_blocks','(blocker_id=? OR blocked_id=?)',[accountId,accountId]],
  ['social_settings','account_id=?',[accountId]],
  ['cosmetic_gifts','(sender_id=? OR recipient_id=?) AND NOT EXISTS(SELECT 1 FROM gift_instances WHERE origin_gift_id=cosmetic_gifts.id)',[accountId,accountId]],
  ['cosmetic_profiles','account_id=?',[accountId]],
  ['gift_showcase','account_id=?',[accountId]],
  ['profile_preferences','account_id=?',[accountId]],
  ['organization_targets','account_id=?',[accountId]],
  ['native_conversation_preferences','account_id=?',[accountId]],
  ['native_bookmarks','account_id=?',[accountId]],
  ['native_list_snapshots','account_id=?',[accountId]],
  ['push_subscriptions','account_id=?',[accountId]],
  ['native_members','account_id=?',[accountId]],
  ['organization_folders','account_id=?',[accountId]],
  ['account_organization','account_id=?',[accountId]],
  ['passkey_challenges','account_id=?',[accountId]],
  ['account_passkeys','account_id=?',[accountId]],
  ['auth_email_codes','account_id=?',[accountId]],
  ['auth_email_tokens','account_id=?',[accountId]],
  ['account_emails','account_id=?',[accountId]],
  ['cosmetic_ownership','account_id=?',[accountId]],
 ])writes.push(q(db,'DELETE FROM '+table+' WHERE '+condition+guard,...values,...guardBinds));
 writes.push(
  q(db,"UPDATE live_accounts SET username=NULL,display_name='Deleted account',bio='',status='',avatar='moon',theme='obsidian',email='',onboarding_complete=0,account_status='deleted',updated_at=? WHERE id=?"+guard,time,accountId,...guardBinds),
  // Last for self-deletion guards that deliberately live on this credential.
  q(db,'DELETE FROM auth_credentials WHERE account_id=?'+guard,accountId,...guardBinds),
 );
 return writes;
}
