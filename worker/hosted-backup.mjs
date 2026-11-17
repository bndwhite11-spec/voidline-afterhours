/** Protected infrastructure operation. Callers MUST independently authorize the operator.
 * Only a small content-free receipt leaves this module; database rows stay in encrypted private R2.
 * This is a bounded D1 logical snapshot, not a Matrix/media-byte/provider restore service. */
const encoder=new TextEncoder();
const MAGIC=encoder.encode('VOIDLINE-HOSTED-BACKUP-1\n');
const AAD_PREFIX='VOIDLINE/hosted-d1-backup/v1\n';
const PREFIX='__voidline_internal/backups/v1/';
const LATEST=PREFIX+'latest.json';
const SCHEMA_SQL="SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','view','trigger') ORDER BY type,name";
export const HOSTED_BACKUP_LIMITS=Object.freeze({maxTables:128,maxColumns:64,maxTableRows:5000,maxTotalRows:25000,maxTableBytes:4*1024*1024,maxPlaintextBytes:8*1024*1024,maxSchemaBytes:256*1024});
export class HostedBackupError extends Error{constructor(code,message){super(message);this.name='HostedBackupError';this.code=code;}}
const fail=(code,message)=>{throw new HostedBackupError(code,message);};
const requireThat=(value,code,message)=>{if(!value)fail(code,message);};
const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const rows=result=>{requireThat(result?.success!==false&&Array.isArray(result?.results),'backup_database_failed','The database snapshot did not complete.');return result.results;};
function identifier(value){requireThat(typeof value==='string'&&/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(value),'backup_schema_unsupported','The database contains an unsupported identifier; no partial snapshot was stored.');return '"'+value+'"';}
const internal=name=>/^sqlite_|^_cf_/i.test(name);
function schemaObjects(raw){return raw.filter(row=>row.sql&&!internal(row.name)&&!internal(row.tbl_name)).map(row=>({type:row.type,name:row.name,table:row.tbl_name,sql:row.sql}));}
function normalizedLimits(input={}){requireThat(input&&typeof input==='object'&&!Array.isArray(input),'backup_limits_invalid','Use documented backup bounds.');const result={...HOSTED_BACKUP_LIMITS};for(const key of Object.keys(result)){if(input[key]!==undefined){requireThat(Number.isSafeInteger(input[key])&&input[key]>0&&input[key]<=result[key],'backup_limits_invalid','Backup limits may only lower the documented server bounds.');result[key]=input[key];}}return result;}
function keyBytes(value){
 requireThat(typeof value==='string'&&/^[A-Za-z0-9+/]{43}=$/.test(value),'backup_key_missing','Install a 32-byte base64 backup key in the server secret store.');
 try{const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));requireThat(bytes.length===32,'backup_key_missing','Install a valid 32-byte base64 backup key in the server secret store.');return bytes;}catch{fail('backup_key_missing','Install a valid 32-byte base64 backup key in the server secret store.');}
}
function configuration(env){let keyConfigured=false;try{const bytes=keyBytes(env?.VOIDLINE_BACKUP_KEY);bytes.fill(0);keyConfigured=true;}catch{}return {databaseConfigured:!!env?.DB?.prepare&&!!env?.DB?.batch,storageConfigured:!!env?.MEDIA?.put&&!!env?.MEDIA?.get,keyConfigured};}
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function rowExpression(columns){return 'json_array('+columns.map(column=>{const name=identifier(column.name);return `json_array(typeof(${name}),CASE typeof(${name}) WHEN 'integer' THEN CAST(${name} AS TEXT) WHEN 'real' THEN printf('%!.17g',${name}) WHEN 'blob' THEN hex(${name}) WHEN 'null' THEN NULL ELSE ${name} END)`;}).join(',')+')';}
function measurement(table){return `SELECT COUNT(*) AS row_count,COALESCE(SUM(length(CAST(${table.expression} AS BLOB))+1),0)+2 AS bytes FROM ${identifier(table.name)}`;}
function measure(result,limits){const value=rows(result)[0];requireThat(value&&Number.isSafeInteger(value.row_count)&&value.row_count>=0&&Number.isSafeInteger(value.bytes)&&value.bytes>=0,'backup_database_failed','The database returned an invalid snapshot size.');requireThat(value.row_count<=limits.maxTableRows&&value.bytes<=limits.maxTableBytes,'backup_too_large','A table exceeds the bounded backup capacity; no truncated snapshot was stored.');return value;}
function totalCheck(measures,limits){const total=measures.reduce((sum,item)=>({rows:sum.rows+item.row_count,bytes:sum.bytes+item.bytes}),{rows:0,bytes:0});requireThat(total.rows<=limits.maxTotalRows&&total.bytes<=limits.maxPlaintextBytes,'backup_too_large','The database exceeds the bounded backup capacity; no truncated snapshot was stored.');return total;}
const QUERY_GROUP_SIZE=5;
function groups(values){const result=[];for(let index=0;index<values.length;index+=QUERY_GROUP_SIZE)result.push(values.slice(index,index+QUERY_GROUP_SIZE));return result;}
function indexedResults(results,knownNames){const indexed=new Map([...knownNames].map(name=>[name,[]]));for(const result of results)for(const row of rows(result)){requireThat(indexed.has(row.backup_table),'backup_database_failed','The database returned an unexpected snapshot table.');indexed.get(row.backup_table).push(row);}return indexed;}
async function databaseSnapshot(db,limits){
 let raw;try{raw=rows(await q(db,SCHEMA_SQL).all());}catch(error){if(error instanceof HostedBackupError)throw error;fail('backup_database_failed','Database schema discovery failed.');}
 const schema=schemaObjects(raw),tables=schema.filter(item=>item.type==='table');
 requireThat(tables.length>0&&tables.length<=limits.maxTables,'backup_schema_unsupported','The application table count is outside the supported backup bounds.');
 requireThat(encoder.encode(JSON.stringify(raw)).length<=limits.maxSchemaBytes,'backup_too_large','The database schema exceeds the bounded backup capacity.');
 for(const object of schema){identifier(object.name);identifier(object.table);requireThat(!/^\s*CREATE\s+VIRTUAL\s+TABLE/i.test(object.sql),'backup_schema_unsupported','Virtual tables need a provider-specific backup; no partial snapshot was stored.');}
 const discovered=JSON.stringify(raw),hasSequence=raw.some(item=>item.name==='sqlite_sequence'),knownNames=new Set(tables.map(table=>table.name));
 let columnResults;const columnBound=limits.maxTables*(limits.maxColumns+16);try{columnResults=await db.batch([q(db,"SELECT m.name AS backup_table,p.cid,p.name,p.type,p.\"notnull\",p.dflt_value,p.pk,p.hidden FROM sqlite_master m JOIN pragma_table_xinfo(m.name) p WHERE m.type='table' AND lower(m.name) NOT GLOB 'sqlite_*' AND lower(m.name) NOT GLOB '_cf_*' ORDER BY m.name,p.cid LIMIT ?",columnBound+1)]);}catch{fail('backup_database_failed','Database column discovery failed.');}
 requireThat(rows(columnResults[0]).length<=columnBound,'backup_schema_unsupported','The database column manifest exceeds the supported backup bounds.');
 const columnMap=indexedResults(columnResults,knownNames);
 const definitions=tables.map(table=>{const columns=columnMap.get(table.name).sort((a,b)=>a.cid-b.cid).filter(column=>Number(column.hidden||0)===0).map(column=>({name:column.name,type:column.type||'',notnull:column.notnull,default:column.dflt_value,pk:column.pk}));requireThat(columns.length>0&&columns.length<=limits.maxColumns,'backup_schema_unsupported','A table has unsupported columns; no partial snapshot was stored.');return {name:table.name,columns,expression:rowExpression(columns)};});
 const tableGroups=groups(definitions),measureGroup=group=>group.map(table=>measurement(table).replace('SELECT COUNT(*)',`SELECT '${table.name}' AS backup_table,COUNT(*)`)).join(' UNION ALL ');
 let preflight;try{preflight=await db.batch(tableGroups.map(group=>q(db,measureGroup(group))));}catch{fail('backup_database_failed','The database backup preflight did not complete.');}
 const preflightMap=indexedResults(preflight,knownNames),measured=new Map();
 for(const table of definitions){const tableRows=preflightMap.get(table.name);requireThat(tableRows.length===1,'backup_database_failed','The database backup preflight returned an invalid table count.');measured.set(table.name,measure({results:tableRows},limits));}
 const preflightTotal=totalCheck([...measured.values()],limits);
 // Group small SQL branches to stay below ordinary D1 query/parameter budgets.
 // Every branch checks its cap inside the SAME transaction as all snapshot rows.
 const sparePerTable=Math.floor((limits.maxPlaintextBytes-preflightTotal.bytes)/definitions.length),statements=[q(db,SCHEMA_SQL)];
 for(const group of tableGroups){const bindings=[],branches=group.map(table=>{const cap=Math.min(limits.maxTableBytes,measured.get(table.name).bytes+sparePerTable);bindings.push(limits.maxTableRows,cap,limits.maxTableRows+1);return `SELECT * FROM (WITH backup_bounds AS (${measurement(table)}) SELECT '${table.name}' AS backup_table,${table.expression} AS backup_row FROM ${identifier(table.name)} WHERE (SELECT row_count FROM backup_bounds)<=? AND (SELECT bytes FROM backup_bounds)<=? LIMIT ?)`;});statements.push(q(db,measureGroup(group)),q(db,branches.join(' UNION ALL '),...bindings));}
 if(hasSequence)statements.push(q(db,"SELECT name,CAST(seq AS TEXT) AS seq FROM sqlite_sequence WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name LIMIT ?",limits.maxTables+1));
 statements.push(q(db,SCHEMA_SQL));
 let result;try{result=await db.batch(statements);}catch{fail('backup_database_failed','The consistent database snapshot failed; no partial backup was stored.');}
 requireThat(JSON.stringify(rows(result[0]))===discovered&&JSON.stringify(rows(result.at(-1)))===discovered,'backup_schema_changed','The database schema changed during backup preparation. Retry after migration completes.');
 const measurementResults=[],rowResults=[];for(let index=0;index<tableGroups.length;index++){measurementResults.push(result[1+index*2]);rowResults.push(result[2+index*2]);}
 const measuredMap=indexedResults(measurementResults,knownNames),rowMap=indexedResults(rowResults,knownNames),measures=[],data=[];
 for(const table of definitions){const sizes=measuredMap.get(table.name);requireThat(sizes.length===1,'backup_database_failed','The database returned an invalid snapshot table size.');const count=measure({results:sizes},limits),encodedRows=rowMap.get(table.name);requireThat(encodedRows.length===count.row_count,'backup_too_large','A table grew beyond its snapshot capacity; no truncated backup was stored.');measures.push(count);let values;try{values=encodedRows.map(row=>JSON.parse(row.backup_row));}catch{fail('backup_database_failed','The database returned an invalid encoded row.');}data.push({name:table.name,columns:table.columns,rowCount:count.row_count,rows:values});}
 const total=totalCheck(measures,limits),sqliteSequence=hasSequence?rows(result.at(-2)):[];
 requireThat(sqliteSequence.length<=limits.maxTables,'backup_too_large','The database sequence manifest exceeds the backup bounds.');
 const mediaReferences=[],seenReferences=new Set();
 for(const table of data){table.columns.forEach((column,index)=>{if(!/^(?:object_key|storage_key|r2_key)$/.test(column.name))return;for(const row of table.rows){const cell=row[index];if(cell?.[0]!=='text'||!cell[1])continue;const identity=JSON.stringify([table.name,column.name,cell[1]]);if(!seenReferences.has(identity)){seenReferences.add(identity);mediaReferences.push({table:table.name,column:column.name,objectKey:cell[1]});}}});}
 const migrationManifest={source:'deployed-sqlite-master',tables:data.filter(table=>/^(?:d1_migrations|__drizzle_migrations)$/.test(table.name)).map(table=>({name:table.name,rowCount:table.rowCount,rows:table.rows}))};
 return {schema,schemaSha256:await digest(encoder.encode(JSON.stringify(schema))),tables:data,sqliteSequence,migrationManifest,mediaReferences,counts:{tables:data.length,rows:total.rows}};
}
function safeReceipt(value){
 if(!value||value.format!==1||!/^\d{13}-[a-f0-9-]{36}$/.test(value.id||'')||!Number.isSafeInteger(value.createdAt)||!Number.isSafeInteger(value.completedAt)||!Number.isSafeInteger(value.ciphertextBytes)||!Number.isSafeInteger(value.tableCount)||!Number.isSafeInteger(value.rowCount))return null;
 return {format:1,id:value.id,createdAt:value.createdAt,completedAt:value.completedAt,ciphertextBytes:value.ciphertextBytes,tableCount:value.tableCount,rowCount:value.rowCount,mediaReferenceCount:Number.isSafeInteger(value.mediaReferenceCount)?value.mediaReferenceCount:0,encrypted:true,mediaBytesIncluded:false,productionRestoreVerified:false};
}
export async function hostedBackupHealth(env){
 const configured=configuration(env),health={...configured,configured:Object.values(configured).every(Boolean),format:1,limits:{...HOSTED_BACKUP_LIMITS},lastBackup:null,receiptStatus:'unavailable',mediaBytesIncluded:false,productionRestoreVerified:false};
 if(!configured.storageConfigured)return health;
 try{const object=await env.MEDIA.get(LATEST);if(!object){health.receiptStatus='none';return health;}if(!Number.isSafeInteger(object.size)||object.size>16384){health.receiptStatus='invalid';return health;}health.lastBackup=safeReceipt(JSON.parse(await object.text()));health.receiptStatus=health.lastBackup?'stored':'invalid';}catch{health.receiptStatus='unavailable';}
 return health;
}
export async function createHostedBackup(env,{now=Date.now(),limits:requestedLimits}={}){
 const configured=configuration(env);requireThat(configured.databaseConfigured&&configured.storageConfigured,'backup_not_configured','Database and private R2 storage must be configured before creating a backup.');
 const secret=keyBytes(env.VOIDLINE_BACKUP_KEY),limits=normalizedLimits(requestedLimits);
 requireThat(Number.isSafeInteger(now)&&now>=1000000000000&&now<=9999999999999,'backup_time_invalid','Use a valid backup creation timestamp.');
 let key;try{key=await crypto.subtle.importKey('raw',secret,'AES-GCM',false,['encrypt']);}finally{secret.fill(0);}
 const snapshot=await databaseSnapshot(env.DB,limits),id=String(now)+'-'+crypto.randomUUID(),nonce=crypto.getRandomValues(new Uint8Array(12));
 const payload={format:1,id,createdAt:now,source:'cloudflare-d1',...snapshot,media:{objectBytesIncluded:false,restore:'Referenced R2 objects require a separate protected media backup and restore.'}};
 const plaintext=encoder.encode(JSON.stringify(payload));requireThat(plaintext.length<=limits.maxPlaintextBytes,'backup_too_large','The encoded snapshot exceeds the bounded backup capacity; no truncated snapshot was stored.');
 const nonceBase64=btoa(String.fromCharCode(...nonce)),header={format:1,algorithm:'AES-256-GCM',id,createdAt:now,nonce:nonceBase64,schemaSha256:snapshot.schemaSha256},headerBytes=encoder.encode(JSON.stringify(header));
 let ciphertext;try{ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:encoder.encode(AAD_PREFIX+new TextDecoder().decode(headerBytes)),tagLength:128},key,plaintext));}finally{plaintext.fill(0);}
 const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,headerBytes.length,false);const sealed=new Uint8Array(MAGIC.length+4+headerBytes.length+ciphertext.length);sealed.set(MAGIC);sealed.set(length,MAGIC.length);sealed.set(headerBytes,MAGIC.length+4);sealed.set(ciphertext,MAGIC.length+4+headerBytes.length);
 const receipt={format:1,id,createdAt:now,completedAt:Date.now(),ciphertextBytes:sealed.length,tableCount:snapshot.counts.tables,rowCount:snapshot.counts.rows,mediaReferenceCount:snapshot.mediaReferences.length,encrypted:true,mediaBytesIncluded:false,productionRestoreVerified:false};
 const objectKey=PREFIX+id+'.vlhb',receiptKey=PREFIX+id+'.json';
 try{
  await env.MEDIA.put(objectKey,sealed,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{format:'voidline-hosted-backup-v1',sha256:await digest(sealed)}});
  // One atomic R2 object becomes the completion marker only AFTER encrypted bytes were accepted.
  await env.MEDIA.put(receiptKey,JSON.stringify(receipt),{httpMetadata:{contentType:'application/json'}});
  await env.MEDIA.put(LATEST,JSON.stringify(receipt),{httpMetadata:{contentType:'application/json'}});
 }catch{fail('backup_storage_failed','The protected backup or its completion receipt could not be stored. Inspect protected storage before retrying; no successful backup was reported.');}
 return safeReceipt(receipt);
}
