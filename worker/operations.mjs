/** Narrow unattended operations through Sites-authenticated MCP. This is not
 * platform ownership and grants no native account or conversation access.
 * The Sites dispatcher authenticates /mcp and injects the Site-scoped caller;
 * trusted runtime configuration separately restricts which caller may drain.
 */
import {authenticate} from './auth.mjs';
import {notificationAvailability,dispatchNotifications} from './notifications.mjs';
import {cleanupMedia} from './media.mjs';
import {drainMatrixPolicy,matrixPolicyHealth} from './matrix-policy.mjs';
import {createHostedBackup,hostedBackupHealth} from './hosted-backup.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const tool=(name,description,readOnly)=>({name,description,inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:readOnly,destructiveHint:!readOnly,idempotentHint:readOnly||name!=='create_protected_backup',openWorldHint:!readOnly}});
const tools=[
 tool('operation_identity','Return only your authenticated Site-scoped caller ID for trusted operator configuration. This never grants authority.',true),
 tool('operation_status','Read content-free queue and backup configuration health. Requires the configured service operator.',true),
 tool('process_queues','Process a bounded batch of native push retries, expired/private media cleanup, and configured messaging-policy operations. Requires the configured service operator.',false),
 tool('create_protected_backup','Create one encrypted, private D1 logical snapshot. Media object backup is separate. Requires the configured service operator and backup key.',false),
];
function caller(request){const id=request.headers.get('oai-authenticated-user-id')||'';return id.length>0&&id.length<=256&&!/[\s\u0000-\u001f\u007f]/.test(id)?id:null;}
export function isServiceOperator(request,env){const id=caller(request),allowed=env?.VOIDLINE_SERVICE_OAI_ID;return !!id&&typeof allowed==='string'&&allowed.length>0&&id===allowed;}
export async function operationHealth(env){
 const push=notificationAvailability(env),policy=await matrixPolicyHealth(env),backup=await hostedBackupHealth(env);
 let queues=null;
 if(env?.DB?.prepare){const results=await env.DB.batch([
  env.DB.prepare("SELECT COUNT(*) AS n FROM push_deliveries WHERE state IN('retry','pending','sending')"),
  env.DB.prepare('SELECT COUNT(*) AS n FROM media_cleanup'),
 ]);queues={pushPending:Number(results[0]?.results?.[0]?.n)||0,mediaCleanupPending:Number(results[1]?.results?.[0]?.n)||0};}
 return {operatorConfigured:!!env?.VOIDLINE_SERVICE_OAI_ID,pushConfigured:push.push,mediaConfigured:!!env?.MEDIA,queues,matrixPolicy:policy,backup,scheduleStatus:'Check the linked Sites automation and run history; writer configuration alone does not prove a scheduled run.'};
}
export function createOperationService({push=dispatchNotifications,media=cleanupMedia,policy=drainMatrixPolicy,backup=createHostedBackup,health=operationHealth}={}){
 async function processQueues(env){
  // Sequential bounds keep scheduled runs below provider and Worker limits.
  const notifications=notificationAvailability(env).push?await push(env):{configured:false,processed:0,accepted:0};
  const storage=env?.MEDIA?await media(env,12):{configured:false,processed:0};
  const matrix=await policy(env,{limit:8});
  return {notifications,media:storage,matrix,deliveryMeaning:'accepted counts are push-provider acceptance, not receipt by a device'};
 }
 async function handleOperationsMCP(request,env){
  if(new URL(request.url).pathname!=='/mcp')return json({error:'not_found'},404);
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'json_required'},415);
  let rpc,id=null;
  try{const reader=request.body?.getReader();if(!reader)throw Error();const chunks=[];let size=0;for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768){await reader.cancel();return json({error:'body_too_large'},413);}chunks.push(part.value);}const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length;}rpc=JSON.parse(new TextDecoder().decode(bytes));if(!rpc||Array.isArray(rpc)||rpc.jsonrpc!=='2.0'||!(rpc.id===undefined||rpc.id===null||typeof rpc.id==='number'||typeof rpc.id==='string'&&rpc.id.length<=128))throw Error();id=rpc.id??null;}catch{return json({jsonrpc:'2.0',id,error:{code:-32700,message:'Invalid JSON-RPC request'}},400);}
  const result=value=>json({jsonrpc:'2.0',id,result:value});
  const failure=(message,status=200)=>result({content:[{type:'text',text:message}],isError:true});
  if(rpc.method==='server/discover')return result({supportedVersions:['2026-07-28'],serverInfo:{name:'Voidline operations',version:'1.0.0'},capabilities:{tools:{}}});
  if(rpc.method==='tools/list')return result({tools});
  // Legacy initialization supports clients that have not adopted discovery yet.
  if(rpc.method==='initialize')return result({protocolVersion:'2025-06-18',serverInfo:{name:'Voidline operations',version:'1.0.0'},capabilities:{tools:{}}});
  if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
  if(rpc.method!=='tools/call')return json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method unavailable'}});
  const name=rpc.params?.name,args=rpc.params?.arguments;
  if(!tools.some(item=>item.name===name))return failure('Tool unavailable.');
  if(args!==undefined&&(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length))return failure('This tool takes no arguments.');
  if(name==='operation_identity'){
   const identity=caller(request);return identity?result({content:[{type:'text',text:JSON.stringify({siteScopedCallerId:identity,grantsAccess:false,operatorConfigured:!!env?.VOIDLINE_SERVICE_OAI_ID})}]}):failure('Connect through this Site’s authenticated plugin to read your caller ID.');
  }
  if(!isServiceOperator(request,env))return failure('This operation requires the service operator bound by trusted runtime configuration. Native usernames, Site viewer access and request arguments do not grant it.');
  try{const value=name==='operation_status'?await health(env):name==='create_protected_backup'?await backup(env):await processQueues(env);return result({content:[{type:'text',text:JSON.stringify(value)}]});}
  catch{return failure('The operation did not complete. Check protected operational health and retry; no completion is claimed.');}
 }
 return {handleOperationsMCP,processQueues};
}
const service=createOperationService();
export const handleOperationsMCP=service.handleOperationsMCP;
export const processQueues=service.processQueues;
let maintenance=null,lastMaintenance=0;
export async function scheduleMaintenance(request,env,context){
 if(request.method==='GET'||request.method==='HEAD'||!context?.waitUntil||!env?.DB)return;
 try{await authenticate(request,env);}catch{return;}
 if(Date.now()-lastMaintenance<10000)return;
 lastMaintenance=Date.now();
 if(!maintenance)maintenance=(async()=>{if(env.MEDIA)await cleanupMedia(env,4);await drainMatrixPolicy(env,{limit:2});})().catch(()=>{}).finally(()=>{maintenance=null;});
 context.waitUntil(maintenance);
}
