/** Fixed public application downloads staged into private R2 by a temporary
 * deployment-only bearer capability. App sessions never authorize uploads. */
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';

const NAMES=new Set(['VOIDLINE-Windows-x64.zip','voidline-source.zip']);
const PART_BYTES=5*1024*1024,MAX_BODY=8*1024*1024,MAX_BYTES=256*1024*1024;
const encoder=new TextEncoder(),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const windows=new Map();
class ReleaseError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code});}}
const need=(ok,status,code,message)=>{if(!ok)throw new ReleaseError(status,code,message);};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const same=(a,b)=>{const left=sha256(encoder.encode(a)),right=sha256(encoder.encode(b));let diff=0;for(let i=0;i<left.length;i++)diff|=left[i]^right[i];return diff===0;};
const prefix=tag=>'native-releases/'+tag+'/';
const manifestKey=(tag,name)=>prefix(tag)+name+'.json';
const operationKey=id=>'native-releases/uploads/'+id+'.json';
const stagingKey=(id,name)=>'native-releases/staging/'+id+'/'+name;
function configuration(release){need(typeof release?.tag==='string'&&/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(release.tag),503,'release_unavailable','This application release is unavailable.');return release;}
function rate(token){const key=bytesToHex(sha256(encoder.encode(token))),now=Date.now();let entry=windows.get(key);if(!entry||entry.until<=now){entry={until:now+60000,count:0};windows.set(key,entry);}need(++entry.count<=240,429,'upload_rate_limited','Wait before continuing this release upload.');if(windows.size>16)for(const [id,value]of windows)if(value.until<=now)windows.delete(id);}
function authorize(request,env){
 const configured=env.NATIVE_RELEASE_UPLOAD_TOKEN,header=request.headers.get('authorization')||'',provided=header.startsWith('Bearer ')?header.slice(7):'';
 need(typeof configured==='string'&&configured.length>=32&&configured.length<=512&&provided.length>=32&&provided.length<=512&&same(configured,provided),403,'release_upload_denied','Release upload authorization is unavailable or invalid.');rate(configured);
}
async function readBytes(request,limit){
 const declared=Number(request.headers.get('content-length')||0);need(Number.isFinite(declared)&&declared>=0&&declared<=limit,413,'upload_too_large','This upload request is too large.');
 const reader=request.body?.getReader();need(reader,400,'body_required','A request body is required.');const chunks=[];let length=0;
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new ReleaseError(413,'upload_too_large','This upload request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(length);let at=0;for(const value of chunks){bytes.set(value,at);at+=value.length;}return bytes;
}
async function readJSON(request){need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use an application/json request.');let value;try{value=JSON.parse(new TextDecoder().decode(await readBytes(request,8192)));}catch(error){if(error instanceof ReleaseError)throw error;throw new ReleaseError(400,'invalid_body','The upload request could not be read.');}need(value&&typeof value==='object'&&!Array.isArray(value),400,'invalid_body','Use a JSON object.');return value;}
function validateExpected(body,release){
 need(NAMES.has(body.name)&&Number.isSafeInteger(body.bytes)&&body.bytes>0&&body.bytes<=MAX_BYTES&&hex(body.sha256),400,'invalid_release','Choose a permitted release filename, byte size and SHA-256.');
 if(body.name==='VOIDLINE-Windows-x64.zip')need(body.bytes===release.windows?.bytes&&body.sha256===release.windows?.sha256,409,'release_mismatch','The desktop package does not match the compiled release.');
 else need(body.bytes<=32*1024*1024,413,'source_too_large','The source archive exceeds its release limit.');
}
function validRecord(value,id,release){
 need(value?.format===1&&value.operationId===id&&value.tag===release.tag&&NAMES.has(value.name)&&uuid.test(id)&&value.objectKey===stagingKey(id,value.name)&&typeof value.uploadId==='string'&&value.uploadId.length>0&&value.uploadId.length<=1024&&Array.isArray(value.parts),409,'upload_unavailable','This upload is unavailable.');validateExpected(value,release);return value;
}
async function getRecord(bucket,id,release){need(typeof id==='string'&&uuid.test(id),400,'invalid_operation','Use the original upload operation ID.');const stored=await bucket.get(operationKey(id));need(stored,404,'upload_unavailable','This upload is unavailable.');let value;try{value=await stored.json();}catch{throw new ReleaseError(409,'upload_unavailable','This upload is unavailable.');}return {record:validRecord(value,id,release),etag:stored.etag};}
async function ready(bucket,release,name){
 const object=await bucket.get(manifestKey(release.tag,name));if(!object)return null;let value;try{value=await object.json();}catch{throw new ReleaseError(503,'release_unavailable','This application release is unavailable.');}
 need(value?.format===1&&value.tag===release.tag&&value.name===name&&uuid.test(value.operationId||'')&&value.objectKey===stagingKey(value.operationId,name)&&Number.isSafeInteger(value.bytes)&&value.bytes>0&&value.bytes<=MAX_BYTES&&hex(value.sha256),503,'release_unavailable','This application release is unavailable.');validateExpected(value,release);return value;
}
const receipt=value=>({completed:true,name:value.name,bytes:value.bytes,sha256:value.sha256,url:'/downloads/'+value.name});
async function persist(bucket,record,etag){const saved=await bucket.put(operationKey(record.operationId),JSON.stringify(record),{httpMetadata:{contentType:'application/json'},onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'}});need(saved,409,'upload_changed','This upload changed. Restart the same operation to resume.');return saved.etag;}
function byteRange(value,size){const match=/^bytes=(\d*)-(\d*)$/.exec(value);need(match&&(match[1]||match[2]),416,'range_unavailable','This byte range is unavailable.');let start=0,end=size-1;if(!match[1]){const suffix=Number(match[2]);need(Number.isSafeInteger(suffix)&&suffix>0,416,'range_unavailable','This byte range is unavailable.');start=Math.max(0,size-suffix);}else{start=Number(match[1]);const requested=match[2]?Number(match[2]):end;need(Number.isSafeInteger(start)&&Number.isSafeInteger(requested),416,'range_unavailable','This byte range is unavailable.');end=Math.min(requested,end);}need(start>=0&&start<=end&&start<size,416,'range_unavailable','This byte range is unavailable.');return {offset:start,length:end-start+1,end};}
async function serve(request,bucket,release,name){
 let value=await ready(bucket,release,name);
 // A web or Android update may reuse the exact signed-off Windows archive.
 // ready() checks the current build's size and hash against the older manifest.
 if (!value && name==='VOIDLINE-Windows-x64.zip' && release.windows?.reuseTag) {
  const previous=configuration({...release,tag:release.windows.reuseTag});
  value=await ready(bucket,previous,name);
 }
 need(value,404,'release_unavailable','This application download is not available yet.');const object=await bucket.head(value.objectKey);need(object&&object.size===value.bytes,503,'release_unavailable','This application download is temporarily unavailable.');
 const etag='"sha256-'+value.sha256+'"',headers={'content-type':'application/zip','content-disposition':'attachment; filename="'+name+'"','content-length':String(value.bytes),'cache-control':'no-cache','etag':etag,'accept-ranges':'bytes','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
 if((request.headers.get('if-none-match')||'').split(',').map(item=>item.trim().replace(/^W\//,'')).some(item=>item===etag||item==='*'))return new Response(null,{status:304,headers});
 if(request.method==='HEAD')return new Response(null,{headers});
 let range;const requested=request.headers.get('range'),ifRange=request.headers.get('if-range');if(requested&&(!ifRange||ifRange===etag))try{range=byteRange(requested,value.bytes);}catch(error){if(error.status!==416)throw error;return new Response(null,{status:416,headers:{...headers,'content-length':'0','content-range':'bytes */'+value.bytes}});}
 const body=await bucket.get(value.objectKey,range?{range:{offset:range.offset,length:range.length}}:undefined);need(body,503,'release_unavailable','This application download is temporarily unavailable.');
 if(range){headers['content-length']=String(range.length);headers['content-range']='bytes '+range.offset+'-'+range.end+'/'+value.bytes;}
 return new Response(body.body,{status:range?206:200,headers});
}
export async function handleNativeReleaseRequest(request,env,releaseMetadata){
 try{
  const url=new URL(request.url),release=configuration(releaseMetadata),publicName=url.pathname.startsWith('/downloads/')?url.pathname.slice('/downloads/'.length):null;
  need(env?.MEDIA?.get&&env.MEDIA.createMultipartUpload,503,'release_storage_unavailable','Application download storage is unavailable.');
  if(publicName&&NAMES.has(publicName)){need(['GET','HEAD'].includes(request.method),405,'method_not_allowed','Use GET or HEAD to download this file.');return await serve(request,env.MEDIA,release,publicName);}
  need(/^\/api\/native-release-upload\/(start|part|complete|abort)$/.test(url.pathname),404,'not_found','This release route is unavailable.');authorize(request,env);need(request.method==='POST',405,'method_not_allowed','Use a POST upload request.');
  const action=url.pathname.split('/').at(-1),bucket=env.MEDIA;
  if(action==='start'){
   const body=await readJSON(request);need(typeof body.operationId==='string'&&uuid.test(body.operationId),400,'invalid_operation','Use a stable upload operation ID.');validateExpected(body,release);
   const published=await ready(bucket,release,body.name);if(published){need(published.bytes===body.bytes&&published.sha256===body.sha256,409,'release_immutable','A different package is already published at this release name.');return json({...receipt(published),operationId:body.operationId,partBytes:PART_BYTES,parts:[]});}
   const existing=await bucket.get(operationKey(body.operationId));if(existing){const record=validRecord(await existing.json(),body.operationId,release);need(record.name===body.name&&record.bytes===body.bytes&&record.sha256===body.sha256&&!record.abortedAt,409,'operation_conflict','This operation already belongs to another upload.');return json({operationId:record.operationId,name:record.name,uploadId:record.uploadId,partBytes:PART_BYTES,parts:record.parts});}
   const objectKey=stagingKey(body.operationId,body.name),upload=await bucket.createMultipartUpload(objectKey,{httpMetadata:{contentType:'application/zip'}}),record={format:1,tag:release.tag,operationId:body.operationId,name:body.name,objectKey,uploadId:upload.uploadId,bytes:body.bytes,sha256:body.sha256,createdAt:Date.now(),parts:[]};
   try{await persist(bucket,record);}catch(error){await upload.abort().catch(()=>{});throw error;}return json({operationId:record.operationId,name:record.name,uploadId:record.uploadId,partBytes:PART_BYTES,parts:[]},201);
  }
  if(action==='part'){
   const id=url.searchParams.get('operationId'),partNumber=Number(url.searchParams.get('partNumber')),{record,etag}=await getRecord(bucket,id,release);need(!record.abortedAt,409,'upload_aborted','This upload was aborted.');need(!record.finalizingAt,409,'upload_completing','This upload is completing. Retry completion instead.');need(!await ready(bucket,release,record.name),409,'release_immutable','This release has already been published.');
   const total=Math.ceil(record.bytes/PART_BYTES);need(Number.isSafeInteger(partNumber)&&partNumber>=1&&partNumber<=total,400,'invalid_part','Choose a valid release part number.');const expected=partNumber===total?record.bytes-PART_BYTES*(total-1):PART_BYTES;
   const bytes=await readBytes(request,MAX_BODY),partHash=request.headers.get('x-voidline-part-sha256');need(bytes.length===expected&&hex(partHash)&&bytesToHex(sha256(bytes))===partHash,400,'invalid_part','This upload part has the wrong byte size or checksum.');
   const prior=record.parts.find(part=>part.partNumber===partNumber);if(prior){need(prior.sha256===partHash&&prior.bytes===bytes.length,409,'part_conflict','This part already contains different bytes.');return json(prior);}
   // Bind a part's content before uploadPart can replace R2's same-numbered
   // part. A competing request must win this CAS and can then retry only the
   // exact same bytes, so R2 and an acknowledged part cannot diverge.
   record.partClaims=Array.isArray(record.partClaims)?record.partClaims:[];const claim=record.partClaims.find(part=>part.partNumber===partNumber);
   if(claim)need(claim.sha256===partHash&&claim.bytes===bytes.length,409,'part_conflict','This part already contains different bytes.');
   else{record.partClaims.push({partNumber,sha256:partHash,bytes:bytes.length});await persist(bucket,record,etag);}
   const part=await bucket.resumeMultipartUpload(record.objectKey,record.uploadId).uploadPart(partNumber,bytes),value={partNumber,etag:part.etag,sha256:partHash,bytes:bytes.length};
   const latest=await getRecord(bucket,id,release);need(!latest.record.abortedAt&&!latest.record.finalizingAt,409,'upload_changed','This upload changed. Restart the same operation to resume.');
   const confirmed=latest.record.parts.find(part=>part.partNumber===partNumber);if(confirmed){need(confirmed.sha256===partHash&&confirmed.bytes===bytes.length,409,'part_conflict','This part already contains different bytes.');return json(confirmed);}
   latest.record.parts.push(value);latest.record.parts.sort((a,b)=>a.partNumber-b.partNumber);await persist(bucket,latest.record,latest.etag);return json(value);
  }
  const body=await readJSON(request),{record,etag}=await getRecord(bucket,body.operationId,release),published=await ready(bucket,release,record.name);
  if(published){need(published.bytes===record.bytes&&published.sha256===record.sha256,409,'release_immutable','A different package is already published.');need(action==='complete',409,'release_immutable','A published package cannot be aborted.');return json(receipt(published));}
  if(action==='abort'){need(!record.finalizingAt||record.failedAt,409,'upload_completing','This upload is completing and cannot be aborted. Retry completion.');if(!record.abortedAt){record.abortedAt=Date.now();await persist(bucket,record,etag);}await bucket.resumeMultipartUpload(record.objectKey,record.uploadId).abort().catch(()=>{});await bucket.delete(record.objectKey);return json({aborted:true});}
  need(!record.abortedAt,409,'upload_aborted','This upload was aborted.');need(record.parts.length===Math.ceil(record.bytes/PART_BYTES)&&record.parts.every((part,index)=>part.partNumber===index+1),409,'parts_missing','Upload every release part before completing.');
  // Claim completion before touching the multipart object. An abort must win
  // the same conditional metadata write before it can remove staging bytes.
  if(!record.finalizingAt){record.finalizingAt=Date.now();await persist(bucket,record,etag);}
  async function failedVerification(message){const current=await getRecord(bucket,record.operationId,release);current.record.failedAt=Date.now();await persist(bucket,current.record,current.etag);throw new ReleaseError(409,'release_mismatch',message);}
  let object=await bucket.head(record.objectKey);if(!object){await bucket.resumeMultipartUpload(record.objectKey,record.uploadId).complete(record.parts.map(({partNumber,etag})=>({partNumber,etag})));object=await bucket.head(record.objectKey);}
  if(!object||object.size!==record.bytes)await failedVerification('The completed object has the wrong size.');const full=await bucket.get(record.objectKey),hasher=sha256.create(),reader=full.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;hasher.update(value);}if(bytesToHex(hasher.digest())!==record.sha256)await failedVerification('The completed object checksum does not match. This file was not published.');
  const manifest={format:1,tag:release.tag,operationId:record.operationId,name:record.name,objectKey:record.objectKey,bytes:record.bytes,sha256:record.sha256,completedAt:Date.now()};
  const saved=await bucket.put(manifestKey(release.tag,record.name),JSON.stringify(manifest),{httpMetadata:{contentType:'application/json'},onlyIf:{etagDoesNotMatch:'*'}});if(!saved){const winner=await ready(bucket,release,record.name);need(winner?.sha256===record.sha256&&winner.bytes===record.bytes,409,'release_immutable','A different package is already published.');return json(receipt(winner));}return json(receipt(manifest));
 }catch(error){return json({error:{code:error instanceof ReleaseError?error.code:'release_operation_failed',message:error instanceof ReleaseError?error.message:'The release operation could not complete. Retry the same operation.'}},error instanceof ReleaseError?error.status:503);}
}
