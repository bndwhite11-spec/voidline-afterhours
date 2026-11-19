// Actual workerd R2 multipart, conditional writes, byte streams and ranges.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
const hash=value=>createHash('sha256').update(value).digest('hex'),partBytes=5*1024*1024;
const windows=Buffer.alloc(partBytes+37,0x61);windows.set(Buffer.from('PK\x03\x04'));const source=Buffer.from('PK\x03\x04source archive fixture');
const release={tag:'v1.0.1',windows:{bytes:windows.length,sha256:hash(windows)}},token='isolated-native-release-token-'+crypto.randomUUID();
const compiled=await build({stdin:{contents:`import {handleNativeReleaseRequest} from './worker/native-releases.mjs';export default{fetch(request,env){if(request.headers.get('x-fixture-no-token'))env={...env,NATIVE_RELEASE_UPLOAD_TOKEN:undefined};if(request.headers.get('x-fixture-disabled-token'))env={...env,NATIVE_RELEASE_UPLOAD_TOKEN:'disabled'};return handleNativeReleaseRequest(request,env,${JSON.stringify(release)});}}`,resolveDir:new URL('../',import.meta.url).pathname,loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,minify:true});
const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',r2Buckets:{MEDIA:'isolated-native-release-runtime'},r2Persist:false,bindings:{NATIVE_RELEASE_UPLOAD_TOKEN:token}});
let passed=0,failed=0;
async function test(name,run){try{await run();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.stack);}}
async function raw(path,body,options={}){const headers={...(body===undefined?{}:{authorization:'Bearer '+token,'content-type':'application/json'}),...options.headers};return mf.dispatchFetch('https://release-runtime.example'+path,{method:options.method||(body===undefined?'GET':'POST'),headers,...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function call(path,body,status=200,options={}){const response=await raw(path,body,options),data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;}
const upload=(action,body,status=200,options)=>call('/api/native-release-upload/'+action,body,status,options);
async function part(id,number,bytes,expected=200,headers={}){const response=await mf.dispatchFetch('https://release-runtime.example/api/native-release-upload/part?'+new URLSearchParams({operationId:id,partNumber:String(number)}),{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/octet-stream','x-voidline-part-sha256':hash(bytes),...headers},body:bytes});const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));return data;}
async function start(name,bytes,extra={}){const operationId=crypto.randomUUID(),data=await upload('start',{operationId,name,bytes:bytes.length,sha256:hash(bytes),...extra},201);return {operationId,...data};}
try{
 const bucket=await mf.getR2Bucket('MEDIA');
 await test('only the temporary deployment bearer can upload; normal cookies and missing configuration never grant access',async()=>{
  const body={operationId:crypto.randomUUID(),name:'voidline-source.zip',bytes:source.length,sha256:hash(source)};
  await upload('start',body,403,{headers:{authorization:'',cookie:'__Host-voidline_session='+token}});
  await upload('start',body,403,{headers:{authorization:'Bearer wrong-token-with-more-than-thirty-two-characters'}});
  await upload('start',body,403,{headers:{'x-fixture-no-token':'1'}});
  await upload('start',body,403,{headers:{'x-fixture-disabled-token':'1'}});
  assert.equal((await bucket.list()).objects.length,0);
 });
 await test('unready multipart bytes and arbitrary object paths are never public application downloads',async()=>{
  const id=await start('VOIDLINE-Windows-x64.zip',windows);globalThis.testWindows=id;
  await part(id.operationId,1,windows.subarray(0,partBytes));
  assert.equal((await raw('/downloads/VOIDLINE-Windows-x64.zip')).status,404);
  assert.equal((await raw('/downloads/native-releases/uploads/'+id.operationId+'.json')).status,404);
  await upload('complete',{operationId:id.operationId},409);
  assert.equal(await bucket.get('native-releases/v1.0.1/VOIDLINE-Windows-x64.zip.json'),null);
 });
 await test('multipart part sizes and checksums are bounded, resumable and immutable within an operation',async()=>{
  const id=globalThis.testWindows;
  await part(id.operationId,2,Buffer.from('short'),400);
  await part(id.operationId,0,windows.subarray(0,37),400);
  await part(id.operationId,2,windows.subarray(partBytes),400,{'x-voidline-part-sha256':'0'.repeat(64)});
  const valid=await part(id.operationId,2,windows.subarray(partBytes));const retry=await part(id.operationId,2,windows.subarray(partBytes));assert.equal(retry.etag,valid.etag);
  await part(id.operationId,2,Buffer.alloc(37,0x62),409);
  const resume=await upload('start',{operationId:id.operationId,name:'VOIDLINE-Windows-x64.zip',bytes:windows.length,sha256:hash(windows)});assert.equal(resume.parts.length,2);assert.equal(resume.parts[1].sha256,hash(windows.subarray(partBytes)));
  await part(id.operationId,2,Buffer.alloc(8*1024*1024+1),413);
 });
 await test('a claimed completion prevents racing aborts and part replacement while remaining resumable after interruption',async()=>{
  const id=globalThis.testWindows,key='native-releases/uploads/'+id.operationId+'.json',stored=await (await bucket.get(key)).json();stored.finalizingAt=Date.now();await bucket.put(key,JSON.stringify(stored));
  await upload('abort',{operationId:id.operationId},409);await part(id.operationId,2,windows.subarray(partBytes),409);
  assert.equal((await raw('/downloads/VOIDLINE-Windows-x64.zip')).status,404);
 });
 await test('complete validates actual R2 bytes before publishing one immutable manifest and supports a lost-response retry',async()=>{
  const id=globalThis.testWindows,complete=await upload('complete',{operationId:id.operationId});assert.equal(complete.completed,true);assert.equal(complete.bytes,windows.length);assert.equal(complete.sha256,hash(windows));assert.equal(complete.url,'/downloads/VOIDLINE-Windows-x64.zip');assert.equal(JSON.stringify(complete).includes('staging'),false);
  assert.deepEqual(await upload('complete',{operationId:id.operationId}),complete);
  const manifest=await (await bucket.get('native-releases/v1.0.1/VOIDLINE-Windows-x64.zip.json')).json();assert.equal(manifest.objectKey,'native-releases/staging/'+id.operationId+'/VOIDLINE-Windows-x64.zip');
  assert.equal((await bucket.head(manifest.objectKey)).size,windows.length);
  await upload('start',{operationId:crypto.randomUUID(),name:'VOIDLINE-Windows-x64.zip',bytes:windows.length,sha256:'0'.repeat(64)},409);
  await upload('abort',{operationId:id.operationId},409);
 });
 await test('public R2 download streaming has exact ZIP bytes, attachment name, SHA ETag, HEAD and conditional reads',async()=>{
  const response=await raw('/downloads/VOIDLINE-Windows-x64.zip');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/zip');assert.equal(response.headers.get('content-disposition'),'attachment; filename="VOIDLINE-Windows-x64.zip"');assert.equal(response.headers.get('content-length'),String(windows.length));assert.equal(response.headers.get('cache-control'),'no-cache');globalThis.testETag=response.headers.get('etag');assert.equal(globalThis.testETag,'"sha256-'+hash(windows)+'"');assert.deepEqual(Buffer.from(await response.arrayBuffer()),windows);
  const head=await raw('/downloads/VOIDLINE-Windows-x64.zip',undefined,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),String(windows.length));assert.equal((await head.arrayBuffer()).byteLength,0);
  for(const etag of [globalThis.testETag,'W/'+globalThis.testETag,'*']){const cached=await raw('/downloads/VOIDLINE-Windows-x64.zip',undefined,{headers:{'if-none-match':etag}});assert.equal(cached.status,304);assert.equal((await cached.arrayBuffer()).byteLength,0);}
 });
 await test('byte ranges, suffixes, unsatisfiable ranges and If-Range resume use actual R2 range reads',async()=>{
  for(const [range,start,end]of [['bytes=0-3',0,3],['bytes=-16',windows.length-16,windows.length-1],['bytes='+String(windows.length-10)+'-',windows.length-10,windows.length-1]]){const response=await raw('/downloads/VOIDLINE-Windows-x64.zip',undefined,{headers:{range}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${windows.length}`);assert.equal(response.headers.get('content-length'),String(end-start+1));assert.deepEqual(Buffer.from(await response.arrayBuffer()),windows.subarray(start,end+1));}
  for(const range of ['bytes='+String(windows.length)+'-','bytes=-0','bytes=6-2','bytes=0-1,3-4','bytes=-','items=0-3']){const response=await raw('/downloads/VOIDLINE-Windows-x64.zip',undefined,{headers:{range}});assert.equal(response.status,416);assert.equal(response.headers.get('content-range'),'bytes */'+windows.length);assert.equal((await response.arrayBuffer()).byteLength,0);}
  const matched=await raw('/downloads/VOIDLINE-Windows-x64.zip',undefined,{headers:{range:'bytes=0-3','if-range':globalThis.testETag}});assert.equal(matched.status,206);assert.equal((await matched.arrayBuffer()).byteLength,4);
  const stale=await raw('/downloads/VOIDLINE-Windows-x64.zip',undefined,{headers:{range:'bytes=0-3','if-range':'"old"'}});assert.equal(stale.status,200);assert.equal((await stale.arrayBuffer()).byteLength,windows.length);
 });
 await test('concurrent different bytes for one part cannot desynchronize acknowledged metadata from the R2 multipart object',async()=>{
  const id=await start('voidline-source.zip',source),other=Buffer.alloc(source.length,0x62);
  const send=bytes=>mf.dispatchFetch('https://release-runtime.example/api/native-release-upload/part?'+new URLSearchParams({operationId:id.operationId,partNumber:'1'}),{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/octet-stream','x-voidline-part-sha256':hash(bytes)},body:bytes});
  const responses=await Promise.all([send(source),send(other)]);assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
  const state=await (await bucket.get('native-releases/uploads/'+id.operationId+'.json')).json();assert.equal(state.parts.length,1);assert.equal(state.partClaims.length,1);assert.equal(state.parts[0].sha256,state.partClaims[0].sha256);
  await bucket.resumeMultipartUpload(state.objectKey,state.uploadId).complete(state.parts.map(({partNumber,etag})=>({partNumber,etag})));
  const actual=Buffer.from(await (await bucket.get(state.objectKey)).arrayBuffer());assert.equal(hash(actual),state.parts[0].sha256);assert.equal((await raw('/downloads/voidline-source.zip')).status,404);
  await upload('abort',{operationId:id.operationId});
 });
 await test('source archive SHA is authenticated upload metadata, mismatches remain private and abort cleans staging',async()=>{
  const bad=await start('voidline-source.zip',source,{sha256:'0'.repeat(64)});await part(bad.operationId,1,source);await upload('complete',{operationId:bad.operationId},409);assert.equal((await raw('/downloads/voidline-source.zip')).status,404);
  await upload('abort',{operationId:bad.operationId});assert.equal(await bucket.get('native-releases/staging/'+bad.operationId+'/voidline-source.zip'),null);await upload('complete',{operationId:bad.operationId},409);
  const valid=await start('voidline-source.zip',source);await part(valid.operationId,1,source);await upload('complete',{operationId:valid.operationId});const response=await raw('/downloads/voidline-source.zip');assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),source);
  await upload('start',{operationId:crypto.randomUUID(),name:'voidline-source.zip',bytes:source.length+1,sha256:'1'.repeat(64)},409);
 });
 await test('uploaded operation IDs filenames and methods cannot select unrelated private MEDIA objects',async()=>{
  for(const name of ['../../private','VOIDLINE-Android.apk','private-backup.zip'])await upload('start',{operationId:crypto.randomUUID(),name,bytes:source.length,sha256:hash(source)},400);
  await upload('complete',{operationId:'../private'},400);await upload('abort',{operationId:crypto.randomUUID()},404);
  const response=await raw('/downloads/voidline-source.zip',{},{});assert.equal(response.status,405);
 });
}finally{await mf.dispose();delete globalThis.testWindows;delete globalThis.testETag;}
console.log(`${passed}/${passed+failed} native-release runtime checks passed. Actual isolated R2 multipart; production upload/device installation are separate.`);process.exitCode=failed?1:0;
