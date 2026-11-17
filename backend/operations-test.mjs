import assert from 'node:assert/strict';
import {createOperationService,isServiceOperator} from '../worker/operations.mjs';

const origin='https://operations.voidline.example',operator='site-scoped-operator-fixture',calls=[];
const service=createOperationService({push:async()=>{calls.push('push');return {processed:1,accepted:1};},media:async(env,limit)=>{calls.push('media:'+limit);return {processed:2};},policy:async(env,{limit})=>{calls.push('policy:'+limit);return {configured:false,attempted:0};},backup:async()=>{calls.push('backup');return {encrypted:true,mediaBytesIncluded:false,productionRestoreVerified:false};},health:async()=>({operatorConfigured:true,queues:{pushPending:0}})});
const env={VOIDLINE_SERVICE_OAI_ID:operator,MEDIA:{},VAPID_SUBJECT:'https://operations.voidline.example/help.html',VAPID_PUBLIC_KEY:Buffer.alloc(65,1).toString('base64url'),VAPID_PRIVATE_KEY:Buffer.alloc(32,2).toString('base64url')};
async function call(method,params={},who,extra={}){const response=await service.handleOperationsMCP(new Request(origin+'/mcp',{method:'POST',headers:{'content-type':'application/json',...(who?{'oai-authenticated-user-id':who}:{}),...extra},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),env);return {response,data:await response.json()};}
let passed=0,failed=0;async function test(name,run){try{await run();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error.stack);}}
await test('MCP discovery exposes bounded typed operations without native account or content tools',async()=>{
 const d=await call('server/discover');assert.deepEqual(d.data.result.supportedVersions,['2026-07-28']);const list=await call('tools/list');assert.deepEqual(list.data.result.tools.map(t=>t.name),['operation_identity','operation_status','process_queues','create_protected_backup']);for(const tool of list.data.result.tools)assert.equal(tool.inputSchema.additionalProperties,false);assert.equal(calls.length,0);
});
await test('anonymous and other Site viewers cannot drain, back up or read operator health',async()=>{
 for(const name of ['operation_status','process_queues','create_protected_backup'])for(const who of [undefined,'another-site-viewer']){const {data}=await call('tools/call',{name,arguments:{}},who,{'x-voidline-account-id':'xrp','x-platform-owner':'true'});assert.equal(data.result.isError,true);}assert.equal(calls.length,0);assert.equal(isServiceOperator(new Request(origin+'/mcp',{headers:{'oai-authenticated-user-id':operator}}),{}),false);
});
await test('identity resolution reports only the authenticated caller and never grants access',async()=>{
 const {data}=await call('tools/call',{name:'operation_identity',arguments:{}},'another-site-viewer');assert.deepEqual(JSON.parse(data.result.content[0].text),{siteScopedCallerId:'another-site-viewer',grantsAccess:false,operatorConfigured:true});assert.equal(calls.length,0);assert.equal((await call('tools/call',{name:'operation_identity'})).data.result.isError,true);
});
await test('native names, request arguments and arbitrary tool names cannot choose operator or increase bounds',async()=>{
 for(const [name,args]of [['process_queues',{operatorId:operator,limit:100000}],['create_protected_backup',{accountId:'xrp'}],['read_all_messages',{}]])assert.equal((await call('tools/call',{name,arguments:args},operator)).data.result.isError,true);assert.equal(calls.length,0);
});
await test('configured service operator drains fixed bounded jobs and returns provider acceptance honestly',async()=>{
 const {data}=await call('tools/call',{name:'process_queues',arguments:{}},operator),value=JSON.parse(data.result.content[0].text);assert.deepEqual(calls,['push','media:12','policy:8']);assert.equal(value.notifications.accepted,1);assert.match(value.deliveryMeaning,/not receipt/);assert.equal(value.matrix.configured,false);const status=await call('tools/call',{name:'operation_status'},operator);assert.deepEqual(JSON.parse(status.data.result.content[0].text),{operatorConfigured:true,queues:{pushPending:0}});
});
await test('protected backup receipts contain no snapshot, credentials or restore-success fabrication',async()=>{
 const {data}=await call('tools/call',{name:'create_protected_backup'},operator),receipt=JSON.parse(data.result.content[0].text);assert.deepEqual(receipt,{encrypted:true,mediaBytesIncluded:false,productionRestoreVerified:false});assert.equal(calls.at(-1),'backup');assert(!JSON.stringify(data).includes(env.VAPID_PRIVATE_KEY));
});
await test('MCP parsing rejects oversized bodies, wrong content types and batch requests without invoking jobs',async()=>{
 const before=calls.length;for(const [body,headers,status]of [[JSON.stringify({large:'x'.repeat(33000)}),{'content-type':'application/json'},413],['{}',{'content-type':'text/plain'},415],['[]',{'content-type':'application/json'},400]]){const r=await service.handleOperationsMCP(new Request(origin+'/mcp',{method:'POST',headers,body}),env);assert.equal(r.status,status);}assert.equal(calls.length,before);
});
console.log(`${passed}/${passed+failed} operations checks passed. Controlled handler/auth-header contract; platform OAuth and actual unattended scheduling require separate hosted verification.`);process.exitCode=failed?1:0;
