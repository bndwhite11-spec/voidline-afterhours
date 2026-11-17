/** Atomic binding of uploaded Standard media to a single acknowledged message.
 * This helper is never called by the Matrix encrypted attachment path.
 */
import {AuthError} from './auth.mjs';
export function standardAttachmentIds(value){
 const ids=value??[];
 if(!Array.isArray(ids)||ids.length>4||new Set(ids).size!==ids.length||!ids.every(id=>typeof id==='string'&&/^(?:[a-f0-9-]{36}|[a-f0-9]{64})$/i.test(id)))throw new AuthError(400,'invalid_attachments','Choose up to four distinct uploaded attachments.');
 return ids;
}
export function stagedAttachmentGuard(ids,ownerId,{conversationId=null,channelId=null},now){
 if(!ids.length)return {sql:'',args:[]};
 return {sql:` AND NOT EXISTS(SELECT 1 FROM json_each(?) chosen LEFT JOIN media_assets asset ON asset.id=chosen.value WHERE asset.id IS NULL OR asset.owner_id<>? OR asset.conversation_id IS NOT ? OR asset.channel_id IS NOT ? OR asset.native_message_id IS NOT NULL OR asset.live_message_id IS NOT NULL OR asset.state<>'staged' OR asset.kind NOT IN('attachment','voice') OR asset.expires_at IS NULL OR asset.expires_at<=? OR asset.bytes<1 OR asset.bytes>8388608) AND (SELECT COALESCE(SUM(bytes),0) FROM media_assets WHERE id IN(SELECT value FROM json_each(?)))<=33554432`,args:[JSON.stringify(ids),ownerId,conversationId,channelId,now,JSON.stringify(ids)]};
}
export function claimStandardAttachments(db,ids,userId,{conversationId=null,channelId=null},messageId,originalHash,now){
 if(!ids.length)return [];
 const native=!!conversationId,table=native?'native_messages':'live_messages',messageColumn=native?'native_message_id':'live_message_id',scopeColumn=native?'conversation_id':'channel_id',scopeId=conversationId||channelId;
 return [db.prepare(`UPDATE media_assets SET state='attached',${messageColumn}=?,message_position=(SELECT CAST(key AS INTEGER) FROM json_each(?) WHERE value=media_assets.id),expires_at=NULL,updated_at=? WHERE id IN(SELECT value FROM json_each(?)) AND owner_id=? AND ${scopeColumn}=? AND state='staged' AND EXISTS(SELECT 1 FROM ${table} WHERE id=? AND author_id=? AND ${scopeColumn}=? AND original_hash=?)`).bind(messageId,JSON.stringify(ids),now,JSON.stringify(ids),userId,scopeId,messageId,userId,scopeId,originalHash)];
}
export function standardAttachmentMetadata(asset){return {id:asset.id,kind:asset.kind,contentType:asset.content_type,filename:asset.filename,bytes:asset.bytes,width:asset.width,height:asset.height,url:'/api/media/'+asset.id};}
