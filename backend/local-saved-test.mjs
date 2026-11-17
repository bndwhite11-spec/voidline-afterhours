import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createLocalSaved} from '../src/local-saved.js';
const active=new Set(),locks={async request(name,_opts,fn){if(active.has(name))return fn(null);active.add(name);try{return await fn({});}finally{active.delete(name);}}};
const password='An independent Saved vault password 2026';
const tests=[],test=(name,run)=>tests.push([name,run]);
test('Saved notes work independently of a homeserver and persist encrypted across lock/reopen',async()=>{
 const indexedDB=new IDBFactory(),config={accountId:'native-account',password,indexedDB,locks,origin:'https://voidline.example'};
 const saved=await createLocalSaved(config),note=await saved.save({text:'A private note with https://example.org',title:'Reference',tags:['work','work','night']});
 assert.deepEqual(note.tags,['work','night']);assert.equal((await saved.list()).total,1);await saved.close();
 const restored=await createLocalSaved(config);assert.equal((await restored.list()).notes[0].text,note.text);assert.match((await restored.list()).scope,/This device only/);await restored.remove(note.id);assert.equal((await restored.list()).total,0);await restored.close();
});
test('Saved unlocks require the separate secret and native account namespaces do not share notes',async()=>{
 const indexedDB=new IDBFactory(),config={accountId:'account-a',password,indexedDB,locks,origin:'https://voidline.example'};
 const a=await createLocalSaved(config);await a.save({text:'Account A only'});await a.close();
 await assert.rejects(()=>createLocalSaved({...config,password:'The incorrect separate password'}),e=>e.code==='VOID_VAULT_CORRUPT');
 const b=await createLocalSaved({...config,accountId:'account-b'});assert.equal((await b.list()).total,0);await b.close();
 const again=await createLocalSaved(config);assert.equal((await again.list()).total,1);await again.close();
});
test('Saved search, tags and pagination describe only the unlocked local records',async()=>{
 const saved=await createLocalSaved({accountId:'search-account',password,indexedDB:new IDBFactory(),locks});
 try{for(let i=0;i<4;i++)await saved.save({text:'local note '+i,title:'Notebook',tags:[i%2?'odd':'even']});
 const page=await saved.list({q:'local',offset:1,limit:2});assert.equal(page.total,4);assert.equal(page.notes.length,2);assert.equal(page.page.hasMore,true);assert.equal((await saved.list({tag:'odd'})).total,2);
 }finally{await saved.close();}
});
test('a second tab cannot write the same unlocked vault and locked handles cannot read notes',async()=>{
 const config={accountId:'one-writer',password,indexedDB:new IDBFactory(),locks},saved=await createLocalSaved(config);
 await assert.rejects(()=>createLocalSaved(config),e=>e.code==='VOID_DEVICE_IN_USE');await saved.close();await assert.rejects(()=>saved.list(),e=>e.code==='VOID_VAULT_LOCKED');
 const reopened=await createLocalSaved(config);await reopened.close();
});
let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error);}}
console.log(`${tests.length-failed}/${tests.length} independent local Saved checks passed with actual WebCrypto and fake-indexeddb. No cloud sync or messaging delivery claim.`);process.exitCode=failed?1:0;
