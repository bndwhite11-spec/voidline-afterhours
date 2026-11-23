import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleMatrixRoomPolicy} from '../worker/matrix-room-policy.mjs';

const sql=new DatabaseSync(':memory:');
for(const {tag} of JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url))).entries)sql.exec(readFileSync(new URL('../drizzle/'+tag+'.sql',import.meta.url),'utf8'));
const credential=crypto.randomUUID(),env={DB:{prepare:statement=>({bind:(...args)=>({first:()=>sql.prepare(statement).get(...args)})})},MATRIX_ROOM_POLICY_TOKEN:credential,MATRIX_SERVER_NAME:'matrix.example',MATRIX_HOMESERVER:'https://matrix.example'};
const id=name=>'@v_'+createHash('sha256').update(name).digest('hex')+':matrix.example',alice=id('alice'),bob=id('bob'),eve=id('eve');
for(const name of ['alice','bob','eve']){
 sql.prepare("INSERT INTO live_accounts(id,display_name,onboarding_complete,created_at,updated_at) VALUES(?,?,1,1,1)").run(name,name);
 sql.prepare('INSERT INTO matrix_account_links VALUES(?,?,?,?,?,?)').run(name,id(name),id(name).slice(1,67),env.MATRIX_HOMESERVER,name==='eve'?null:1,1);
}
const request=(change={},headers={})=>new Request('https://unit.example/api/encryption/policy/decision',{method:'POST',headers:{'Content-Type':'application/json',authorization:'Bearer '+credential,...headers},body:JSON.stringify({action:'send',actor:alice,members:[alice,bob],...change})});
async function check(expected,change={},headers={},status=200){
 const r=await handleMatrixRoomPolicy(request(change,headers),env);assert.equal(r.status,status);assert.deepEqual(await r.json(),{allowed:expected});
}
try{
 await check(true);await check(false,{}, {Cookie:'session=cannot-grant'},403);await check(false,{}, {Authorization:''},403);
 await check(false,{members:[eve]});await check(false,{members:['@x:other.example']},{},400);
 await check(false,{body:'plaintext never belongs here'},{},400);
 sql.prepare("INSERT INTO social_blocks VALUES('bob','alice',1)").run();await check(false);await check(false,{action:'invite',actor:bob});
 sql.exec("DELETE FROM social_blocks;UPDATE live_accounts SET account_status='suspended' WHERE id='bob'");await check(false);
 sql.exec("UPDATE live_accounts SET account_status='active' WHERE id='bob';UPDATE matrix_account_links SET homeserver_origin='https://previous.example' WHERE account_id='bob'");await check(false);
 const down=await handleMatrixRoomPolicy(request(),{...env,DB:null});assert.equal(down.status,503);assert.deepEqual(await down.json(),{allowed:false});
 console.log('PASS content-free Synapse policy oracle: scoped operator credential; active verified local participants; directional blocks; changes of server and account status; unavailable database denies.');
}finally{sql.close();}
