'use strict';
// Pure journal checks use independent VM instances sharing only a Storage implementation.
// Recovery normalization checks use the existing application VM; no browser is involved.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const {harness,plain,sampleMessage,STORE}=require('./voidline-v2-test.cjs');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
const source=fs.readFileSync(path.join(__dirname,'../dist/store.js'),'utf8');
function memory(initial){const data=new Map([[STORE,JSON.stringify(initial)]]);let denied=()=>false;return {data,deny(fn){denied=fn;},get length(){return data.size;},key:index=>[...data.keys()][index]??null,getItem:key=>data.get(key)??null,setItem(key,value){if(denied(key,value))throw Object.assign(new Error('Quota exceeded'),{name:'QuotaExceededError'});data.set(key,String(value));},removeItem:key=>data.delete(key)};}
function moduleAPI(){const context={window:{},crypto:webcrypto,console};vm.runInNewContext(source,context);return context.window.VoidStore;}
function fixture(){return {version:2,server:'custom-shared',channel:'general',profile:{name:'Ari',avatar:'A',badge:'larp',bio:'Original biography',statusText:'Original status'},settings:{compact:false,motion:true,memberSidebar:true},messages:{'custom-shared/general':[sampleMessage('original-message','An original transmission')]},customServers:[{id:'custom-shared',name:'Shared studio',owner:true,channels:[['general','Main room'],['announcements','Notices']]}],conversations:[],friends:[],notifications:[],deleted:[],artifacts:{larp:{earnedAt:1700000000000}},artifactInspected:[]};}

test('two stale writers retain independent channels, profile fields and settings after reload',()=>{
  const storage=memory(fixture()),one=moduleAPI().create(storage,STORE),two=moduleAPI().create(storage,STORE);
  const a=one.load(),b=two.load();a.customServers[0].channels.push(['art','Art room']);a.profile.bio='Biography from tab A';a.settings.compact=true;b.customServers[0].channels.push(['music','Music room']);b.profile.statusText='Status from tab B';b.settings.motion=false;
  assert.equal(one.commit(a).ok,true);assert.equal(two.commit(b).ok,true);
  const reloaded=moduleAPI().create(storage,STORE).load(),server=reloaded.customServers.find(s=>s.id==='custom-shared');
  for(const channel of ['general','announcements','art','music'])assert.ok(server.channels.some(c=>c[0]===channel),'Retain channel '+channel);
  assert.equal(reloaded.profile.bio,'Biography from tab A');assert.equal(reloaded.profile.statusText,'Status from tab B');assert.equal(reloaded.settings.compact,true);assert.equal(reloaded.settings.motion,false);assert.equal(reloaded.messages['custom-shared/general'][0].id,'original-message');
});

test('deleted message IDs remain deleted after a stale writer edits or recreates them',()=>{
  const original=fixture(),child=sampleMessage('original-child','Original child',{threadRoot:'original-message'});original.messages['custom-shared/general'].push(child);
  const storage=memory(original),deleter=moduleAPI().create(storage,STORE),stale=moduleAPI().create(storage,STORE),a=deleter.load(),b=stale.load();
  a.messages['custom-shared/general']=[];a.deleted.push('original-message','original-child');assert.equal(deleter.commit(a).ok,true);
  b.messages['custom-shared/general'][0].text='Edited by the stale tab';b.messages['custom-shared/general'][0].updatedAt=Date.now();assert.equal(stale.commit(b).ok,true);
  const later=moduleAPI().create(storage,STORE),c=later.load();assert.equal(c.messages['custom-shared/general'].length,0);c.messages['custom-shared/general'].push(sampleMessage('original-message','Accidentally recreated'));assert.equal(later.commit(c).ok,true);
  const reloaded=moduleAPI().create(storage,STORE).read();assert.equal(reloaded.messages['custom-shared/general'].length,0);assert.ok(reloaded.deleted.includes('original-message'));assert.ok(reloaded.deleted.includes('original-child'));
});

test('denied operation write acknowledges no change and its retry saves exactly once',()=>{
  const storage=memory(fixture()),writer=moduleAPI().create(storage,STORE),initial=writer.load();assert.equal(writer.commit(initial).ok,true);
  const before=plain(writer.read()),candidate=plain(before);candidate.messages['custom-shared/general'].push(sampleMessage('retry-message','Save this once'));storage.deny(key=>key.includes('.op.'));
  const failed=writer.commit(candidate);assert.equal(failed.ok,false);assert.ok(failed.patch.length>0);assert.deepEqual(plain(writer.read()),before);assert.deepEqual(plain(failed.state),before);
  storage.deny(()=>false);assert.equal(writer.retry(failed.patch).ok,true);assert.equal(writer.retry(failed.patch).ok,true);
  const reloaded=moduleAPI().create(storage,STORE).read();assert.equal(reloaded.messages['custom-shared/general'].filter(m=>m.id==='retry-message').length,1);
});

test('recovery export patches reconstruct pending content without writing storage',()=>{
  const storage=memory(fixture()),api=moduleAPI(),writer=api.create(storage,STORE),committed=writer.load();assert.equal(writer.commit(committed).ok,true);
  const candidate=plain(committed);candidate.profile.bio='Pending recovery biography';candidate.messages['custom-shared/general'].push(sampleMessage('recover-message','Recover this unsaved thought'));candidate.customServers[0].channels.push(['recovered-room','A pending room']);storage.deny(key=>key.includes('.op.'));
  const failed=writer.commit(candidate);assert.equal(failed.ok,false);const before=[...storage.data];
  const reconstructed=api.recover({format:'voidline-recovery',state:committed,pending:[{patch:failed.patch}]});assert.equal(reconstructed.profile.bio,'Pending recovery biography');assert.ok(reconstructed.messages['custom-shared/general'].some(m=>m.id==='recover-message'));assert.ok(reconstructed.messages['custom-shared/general'].some(m=>m.id==='original-message'));assert.ok(reconstructed.customServers[0].channels.some(c=>c[0]==='recovered-room'));assert.deepEqual([...storage.data],before,'Pure recovery must not alter storage');
  const fromLegacy=api.recover({legacyArchive:JSON.stringify(committed),pending:[{patch:failed.patch}]});assert.equal(fromLegacy.messages['custom-shared/general'].filter(m=>m.id==='recover-message').length,1);
});

test('legacy orphan replies keep original IDs/timestamps and gain one explicit system recovery root',()=>{
  const replies=[sampleMessage('orphan-child-one','Original retained reply',{time:1700000000123,threadRoot:'lost-parent'}),sampleMessage('orphan-child-two','Another retained reply',{time:1700000000456,threadRoot:'lost-parent'})];
  const app=harness({messages:{'afterhours/general':replies}}),list=app.api.state.messages['afterhours/general'],roots=list.filter(m=>m.id==='lost-parent');assert.equal(roots.length,1);assert.equal(roots[0].author,'system');assert.equal(roots[0].threadRoot,'');assert.match(roots[0].text,/unavailable|recover|preserv/i);
  for(const original of replies){const retained=list.find(m=>m.id===original.id);assert.equal(retained.text,original.text);assert.equal(retained.time,original.time);assert.equal(retained.threadRoot,'lost-parent');}
  assert.equal(app.api.getStats().ownMessages,2,'The system recovery message must not count as a user transmission');
  const reloaded=harness(null,app.storage,{sessionStorage:app.sessionStorage});assert.equal(reloaded.api.state.messages['afterhours/general'].filter(m=>m.id==='lost-parent').length,1);assert.equal(reloaded.api.state.messages['afterhours/general'].find(m=>m.id==='orphan-child-one').time,1700000000123);
});

test('orphaned custom-community history regains reachable metadata without changing messages',()=>{
  const original=sampleMessage('orphan-community-message','A retained community transmission',{time:1700000000789}),app=harness({server:'custom-recovered',channel:'sketches',customServers:[],messages:{'custom-recovered/sketches':[original],'custom-recovered/music':[sampleMessage('orphan-music','A retained song',{time:1700000000888})]}});
  const recovered=app.api.state.customServers.find(s=>s.id==='custom-recovered');assert.ok(recovered);assert.match(recovered.name,/recover/i);assert.ok(recovered.channels.some(c=>c[0]==='sketches'));assert.ok(recovered.channels.some(c=>c[0]==='music'));assert.equal(app.api.state.server,'custom-recovered');assert.equal(app.api.state.channel,'sketches');
  const retained=app.api.state.messages['custom-recovered/sketches'][0];assert.equal(retained.id,original.id);assert.equal(retained.text,original.text);assert.equal(retained.time,original.time);
  const reloaded=harness(null,app.storage,{sessionStorage:app.sessionStorage});reloaded.api.changeContext('custom-recovered','music');assert.equal(reloaded.api.state.channel,'music');assert.equal(reloaded.api.state.messages['custom-recovered/music'][0].id,'orphan-music');
});

(async()=>{let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`\n${tests.length-failures}/${tests.length} journal/recovery checks passed. No browser, network, or media hardware is used.`);process.exitCode=failures?1:0;})();
