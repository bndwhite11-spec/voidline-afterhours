// Isolated TLS adapter for proof.py. The production policy handler is unchanged.
import https from 'node:https';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleMatrixRoomPolicy} from '../../worker/matrix-room-policy.mjs';
const dir=process.argv[2],db=new DatabaseSync(join(dir,'native.sqlite'));
for(const {tag} of JSON.parse(readFileSync(new URL('../../drizzle/meta/_journal.json',import.meta.url))).entries)db.exec(readFileSync(new URL('../../drizzle/'+tag+'.sql',import.meta.url),'utf8'));
const env={MATRIX_SERVER_NAME:'policy.test',MATRIX_HOMESERVER:'https://policy.test',MATRIX_ROOM_POLICY_TOKEN:readFileSync(join(dir,'token'),'utf8').trim(),DB:{prepare:sql=>({bind:(...args)=>({first:()=>db.prepare(sql).get(...args)})})}};
https.createServer({cert:readFileSync(join(dir,'cert.pem')),key:readFileSync(join(dir,'key.pem'))},async(req,res)=>{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const outcome=await handleMatrixRoomPolicy(new Request('https://localhost'+req.url,{method:req.method,headers:req.headers,body:Buffer.concat(chunks)}),env);
 res.writeHead(outcome.status,{'content-type':'application/json'});res.end(await outcome.text());
}).listen(+process.argv[3],'127.0.0.1');
