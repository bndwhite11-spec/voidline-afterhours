'use strict';
// Execute the real read-only journal and review module. No fixture client boots.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const tests=[],test=(name,run)=>tests.push([name,run]);
function storage(entries=[]){const data=new Map(entries),writes=[];return {data,writes,get length(){return data.size;},key:index=>[...data.keys()][index]??null,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(['set',key]);data.set(key,String(value));},removeItem(key){writes.push(['remove',key]);data.delete(key);},clear(){writes.push(['clear']);data.clear();}};}
function moduleInstance(withJournal=true,withCrypto=true){const context={window:{},crypto:withCrypto?webcrypto:undefined,TextEncoder,Uint8Array,Date,Blob,URL,console};vm.createContext(context);for(const name of [...(withJournal?['store.js']:[]),'legacy-import.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',name),'utf8'),context,{filename:name});return {api:context.window.VoidLegacy,store:context.window.VoidStore};}
const personal=(id,text,extras={})=>({id,text,author:'self',time:1700000000000,...extras});
const sample=()=>({id:'seed-afterhours-general-0',author:'nova',text:'the internet feels a little smaller in here. i like it.',time:1700000000000});
const plain=value=>JSON.parse(JSON.stringify(value));

test('a new device remains truly empty without reads creating records or defaults',async()=>{
 const local=storage(),session=storage(),app=moduleInstance();const result=await app.api.inspect(local,{sessionStorage:session});
 assert.equal(result.present,false);assert.equal(result.summary.messages,0);assert.equal(result.candidate,null);assert.deepEqual(local.writes,[]);assert.deepEqual(session.writes,[]);assert.equal(local.length,0);
});
test('only an exact unchanged known fixture is excluded while personal and uncertain content survive',async()=>{
 const app=moduleInstance(),state={profile:{name:'Own identity'},settings:{compact:true},artifacts:{founder:{legacy:true}},customServers:[{id:'custom-real',name:'Real work',channels:[['journal','My notes']]}],conversations:[{id:'dm-nova',members:['nova'],name:'Chosen sample conversation'}],messages:{'afterhours/general':[sample(),personal('mine','My actual thought',{replyTo:sample().id})],'custom-real/journal':[personal('mine2','An attached note',{image:'data:image/png;base64,AAAA'})],'unknown/room':[{id:'unknown-peer',author:'nova',text:'Unknown content that must survive',time:1700000000000}]}};
 const local=storage([['voidline.local.v1',JSON.stringify(state)]]),before=new Map(local.data),review=await app.api.inspect(local);
 assert.equal(review.summary.knownFixtures,1);assert.equal(review.summary.personalMessages,2);assert.equal(review.summary.uncertainMessages,1);assert.equal(review.summary.retainedMessages,3);
 assert.equal(review.referenceSources.length,1);assert.equal(review.referenceSources[0].message.id,sample().id);assert.equal(review.candidate.messages['afterhours/general'].length,1);assert.equal(review.candidate.messages['afterhours/general'][0].replyTo,sample().id);assert.equal(review.candidate.messages['custom-real/journal'][0].image,'data:image/png;base64,AAAA');assert.deepEqual(plain(review.candidate.customServers),state.customServers);assert.deepEqual(plain(review.candidate.profile),state.profile);assert.deepEqual(plain(review.candidate.artifacts),state.artifacts);assert.deepEqual(plain(review.candidate.settings),state.settings);assert.deepEqual(local.data,before);assert.deepEqual(local.writes,[]);
});
test('edited seed records and same IDs with changed text are retained rather than guessed away',async()=>{
 const app=moduleInstance(),review=await app.api.extract({messages:{'afterhours/general':[{...sample(),text:'A changed imported record'},{...sample(),id:'seed-afterhours-general-2'},{...sample(),edited:true},{...sample(),updatedAt:1700000000010},{...sample(),reactions:[{emoji:'💜',mine:true,count:1}]}]}});
 assert.equal(review.summary.knownFixtures,0);assert.equal(review.summary.uncertainMessages,5);assert.equal(review.summary.retainedMessages,5);
});
test('journal replay keeps current IDs and tombstones without writing storage',async()=>{
 const app=moduleInstance(),local=storage([['voidline.local.v1',JSON.stringify({messages:{'custom-real/journal':[personal('kept','Original'),personal('deleted','Removed')]},deleted:[],customServers:[{id:'custom-real',channels:[['journal','Notes']]}]})]]);
 const peer=app.store.create(local);const current=peer.load();current.messages['custom-real/journal'].find(message=>message.id==='kept').text='Latest committed text';current.deleted.push('deleted');assert.equal(peer.commit(current).ok,true);local.writes.length=0;
 const review=await app.api.inspect(local);assert.equal(review.ok,true);assert.equal(review.candidate.messages['custom-real/journal'].length,1);assert.equal(review.candidate.messages['custom-real/journal'][0].id,'kept');assert.equal(review.candidate.messages['custom-real/journal'][0].text,'Latest committed text');assert.deepEqual(local.writes,[]);
});
test('recovery export retains original bytes and opt-in draft media while excluding unrelated account caches',async()=>{
 const app=moduleInstance(),raw=' {"messages":{}, "profile":{"name":"Private name"}} ',local=storage([['voidline.local.v1',raw],['unrelated-token','not yours']]),drafts=storage([['voidline.tab.v1',JSON.stringify({drafts:{'custom-real/journal':{text:'Unsent text',imageRef:'blob-1',reply:'root'}},threads:{'custom-real/journal:root':'Thread draft'}})],['voidline.tab.v1.media.blob-1','data:image/png;base64,AAAA'],['voidline.shared.session.v1.other-account.channel','Other account text']]);
 const review=await app.api.inspect(local,{sessionStorage:drafts});assert.equal(review.drafts.drafts,1);assert.equal(review.drafts.threadDrafts,1);assert.equal(review.drafts.attachmentRecords,1);
 const defaultExport=await app.api.exportArchive(local,{sessionStorage:drafts});assert.deepEqual(plain(defaultExport.sessionRecords),{});assert.equal(defaultExport.localRecords['voidline.local.v1'],raw);assert.equal(defaultExport.localRecords['unrelated-token'],undefined);assert.equal(defaultExport.encrypted,false);
 const explicit=await app.api.exportArchive(local,{sessionStorage:drafts,includeSessionDrafts:true});assert.equal(explicit.sessionRecords['voidline.tab.v1.media.blob-1'],'data:image/png;base64,AAAA');assert.equal(explicit.sessionRecords['voidline.shared.session.v1.other-account.channel'],undefined);assert.deepEqual(local.writes,[]);assert.deepEqual(drafts.writes,[]);
});
test('corrupt journal never destroys source and can be recovered verbatim',async()=>{
 const local=storage([['voidline.local.v1','{"messages":{}}'],['voidline.archive.v3.op.corrupt','not-json']]),app=moduleInstance();const review=await app.api.inspect(local);assert.equal(review.ok,false);assert.equal(review.present,true);assert.equal(review.candidate,null);const exported=await app.api.exportArchive(local);assert.equal(exported.localRecords['voidline.archive.v3.op.corrupt'],'not-json');assert.equal(exported.reconstructed,false);assert.deepEqual(local.writes,[]);
});
test('missing journal or crypto support retains uncertain content and explains limits',async()=>{
 const app=moduleInstance(false),local=storage([['voidline.local.v1',JSON.stringify({messages:{'afterhours/general':[sample()]}})]]);const result=await app.api.inspect(local);assert.equal(result.summary.knownFixtures,1);
 const noCrypto=moduleInstance(false,false);const uncertain=await noCrypto.api.inspect(local);assert.equal(uncertain.summary.knownFixtures,0);assert.equal(uncertain.summary.uncertainMessages,1);
 const withOp=storage([['voidline.archive.v3.op.unknown','{}']]);assert.equal((await app.api.inspect(withOp)).ok,false);assert.equal((await app.api.exportArchive(withOp)).localRecords['voidline.archive.v3.op.unknown'],'{}');
});
(async()=>{let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${tests.length-failed}/${tests.length} legacy review checks passed. Read-only storage; no account import or encryption claim.`);process.exitCode=failed?1:0;})();
