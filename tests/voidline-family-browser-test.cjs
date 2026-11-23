'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {JSDOM}=require('jsdom');
const {DatabaseSync}=require('node:sqlite');
const cases=[];
const delay=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(check){for(let i=0;i<30;i++){if(check())return;await delay();}assert.fail('Expected collection view did not appear');}
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const source=name=>readFileSync(join(__dirname,'../dist/'+name),'utf8');
let COSMETICS,collectibleFamilies,summary;
function browser({reduced=false}={}){
 const dom=new JSDOM('<body><main id="home-main"></main><dialog id="home-dialog"></dialog></body>',{url:'https://voidline.example/chats',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,dialog=d.querySelector('dialog'),main=d.querySelector('main'),requests=[],previews=[];
 let extension,online=true;
 const state={account:{id:'account-a'},dialogGeneration:0,view:'chats'};
 w.matchMedia=()=>({matches:reduced});
 Object.defineProperty(w.navigator,'onLine',{get:()=>online});
 w.VoidCollectibleArt={render:id=>'<span class="vc-art va-asset"><img src="/art/'+esc(id)+'.svg" alt="" width="256" height="256"></span>',detail:id=>'<span class="vc-art">'+esc(id)+'</span>',prepare:async()=>({svg:null}),preview:async(...args)=>{previews.push(args);return {played:false};},stop(){}};
 const bridge={state,esc,guard(){const account=state.account.id;return ()=>state.account?.id===account;},render(){},announce(){},showDialog(title,copy,html){state.dialogGeneration++;dialog.setAttribute('open','');dialog.innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(copy)+'</p>'+html;return state.dialogGeneration;},closeDialog(){state.dialogGeneration++;dialog.removeAttribute('open');},registerExtension(value){extension=value;value.init(bridge);},async request(path,body){requests.push({path,body});if(path==='/api/cosmetics/catalog')return {items:COSMETICS};if(path==='/api/cosmetics/inventory')return {owned:Object.entries(summary.modelCounts).map(([cosmetic_id])=>({cosmetic_id})),summary};throw Error('Unexpected request '+path);}};
 w.VoidHome=bridge;
 const click=async selector=>{const node=d.querySelector(selector);assert(node,selector);node.click();await delay();};
 return {w,d,dom,main,dialog,state,requests,previews,bridge,click,setOnline:value=>online=value,get extension(){return extension;},end:()=>dom.window.close()};
}
async function inventory(){
 const {inventorySummary}=await import('../worker/collectible-inventory.mjs');
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE gift_instances(id TEXT,owner_id TEXT,catalog_id TEXT,acquired_at INTEGER,created_at INTEGER,ownership_revision INTEGER,arrival_acknowledged_at INTEGER); CREATE TABLE gift_transfers(instance_id TEXT,recipient_id TEXT,state TEXT,handled_at INTEGER); CREATE TABLE collectible_discovery_history(account_id TEXT,model_id TEXT);');
 const insert=db.prepare('INSERT INTO gift_instances VALUES(?,?,?,?,?,?,?)');
 const capsule=COSMETICS.find(item=>item.familyId==='copium-cartridge');
 insert.run('free-copy','account-a','gift-copium-cartridge',1,1,0,null);
 insert.run('capsule-copy','account-a',capsule.id,2,2,0,3);
 insert.run('duplicate','account-a',capsule.id,3,3,0,4);
 const discovery=db.prepare('INSERT INTO collectible_discovery_history VALUES(?,?)');
 for(const id of ['gift-copium-cartridge',capsule.id,'gift-cartridge-rain-check'])discovery.run('account-a',id);
 const adapter={prepare(sql){return {bind(...args){return {all:async()=>({results:db.prepare(sql).all(...args)})};}};}};
 try{return (await inventorySummary(adapter,'account-a')).summary;}finally{db.close();}
}
cases.push(['family progress reflects actual SQL inventory and discovery history, including a no-longer-owned design',async()=>{
 const f=browser();try{f.w.eval(source('cosmetics.js'));await f.w.VoidCosmetics.collection('gifts');
  const tiles=[...f.d.querySelectorAll('.vc-family-tile')];assert.equal(tiles.length,Object.keys(collectibleFamilies).length);
  const copium=tiles.find(tile=>tile.querySelector('[data-family]').dataset.family==='Copium Cartridges');
  assert.match(copium.textContent,/6 free editions · 6 capsule editions/);
  assert.match(copium.textContent,/2 of 12 designs owned · 3 discovered/);
  assert.equal(copium.querySelector('progress').value,2);assert.equal(copium.querySelectorAll('.vc-family-art img').length,3);
  assert(!f.requests.some(request=>request.body));assert.equal(f.previews.length,0);
 }finally{f.end();}
}]);
cases.push(['family comparison and exact inspection are read-only and preserve free versus capsule editions offline',async()=>{
 const f=browser({reduced:true});try{f.w.eval(source('cosmetics.js'));await f.w.VoidCosmetics.collection('gifts');f.setOnline(false);
  await f.click('[data-vc-action="compare-family"][data-family="Copium Cartridges"]');
  const cards=[...f.d.querySelectorAll('.vc-compare-card')];assert.equal(cards.length,12);
  for(const card of cards){const id=card.querySelector('[data-item]').dataset.item,item=COSMETICS.find(item=>item.id===id);assert.equal(card.querySelector('h3').textContent,item.name);assert.match(card.textContent,new RegExp(item.acquisitionPolicy==='capsule-only'?'Capsule edition':'Free edition'));assert(card.textContent.includes(item.material||item.finish));}
  assert.equal(f.d.querySelector('[data-vc-action="claim"]'),null);assert.match(f.dialog.textContent,/exact chances before opening/);
  const capsule=COSMETICS.find(item=>item.familyId==='copium-cartridge');
  await f.click('[data-vc-action="compare-inspect"][data-item="'+capsule.id+'"]');
  assert.match(f.dialog.textContent,/Back to family comparison/);assert.equal(f.d.querySelector('[data-vc-action="claim"]'),null);
  await f.click('[data-vc-action="return"]');assert.equal(f.d.querySelectorAll('.vc-compare-card').length,12);
  await f.click('[data-vc-action="return"]');await settle(()=>f.d.querySelector('.vc-family-picker'));
  assert(!f.requests.some(request=>request.body));assert.equal(f.previews.length,0);
 }finally{f.end();}
}]);
cases.push(['illustrated family selection filters exact editions while keeping matched poster nodes and the selected family',async()=>{
 const f=browser();try{f.w.eval(source('cosmetics.js'));await f.w.VoidCosmetics.collection('gifts');
  const poster=f.d.querySelector('#vc-design-grid [data-design-id="gift-copium-cartridge"] img');
  await f.click('[data-vc-action="discover-family"][data-family="Copium Cartridges"]');
  assert.equal(f.d.querySelectorAll('#vc-design-grid [data-design-id]').length,12);
  assert.equal(f.d.querySelector('#vc-design-grid [data-design-id="gift-copium-cartridge"] img'),poster);
  assert.equal(f.d.querySelector('[data-vc-series]').value,'Copium Cartridges');
  assert.equal(f.d.querySelector('.vc-family-picker').open,false);
  assert.equal(f.d.querySelector('[data-vc-action="discover-family"][data-family="Copium Cartridges"]').getAttribute('aria-pressed'),'true');
  await f.click('[data-vc-action="compare-family"][data-family="Copium Cartridges"]');
  await f.click('[data-vc-action="return"]');await settle(()=>f.d.querySelector('#vc-design-grid'));
  assert.equal(f.d.querySelectorAll('#vc-design-grid [data-design-id]').length,12);assert(!f.requests.some(request=>request.body));
 }finally{f.end();}
}]);
cases.push(['missing discovery metadata stays unknown rather than claiming zero discoveries',async()=>{
 const previous=summary;summary={modelCounts:summary.modelCounts};const f=browser();
 try{f.w.eval(source('cosmetics.js'));await f.w.VoidCosmetics.collection('gifts');assert.match(f.dialog.textContent,/2 of 12 designs owned/);assert.doesNotMatch(f.d.querySelector('.vc-family-list').textContent,/discovered/);}
 finally{summary=previous;f.end();}
}]);
function collectorFixture(){
 const f=browser({reduced:true}),frozen=Object.values(collectibleFamilies).slice(0,2).map(family=>({id:family.id,name:family.name,tableVersion:family.id+'.original',models:family.modelIds.slice(0,2).map((id,index)=>({...COSMETICS.find(item=>item.id===id),name:'Original '+index,weight:index?220:9780}))}));
 const original=f.bridge.request;
 f.bridge.request=async(path,body)=>{if(path==='/api/capsules'){f.requests.push({path,body});return {capsules:[{id:'old-capsule',source:'welcome'}]};}if(path==='/api/capsules/old-capsule'){f.requests.push({path,body});return {capsule:{id:'old-capsule',source:'welcome'},families:frozen};}return original(path,body);};
 const host={app:f.bridge,esc,items:()=>COSMETICS,summary:()=>summary,model:id=>({...COSMETICS.find(item=>item.id===id),name:'Later catalog name'}),familyName:id=>collectibleFamilies[id]?.name,visibility:()=>'private',art:f.w.VoidCollectibleArt.render,refresh:async()=>{},active:()=>true,activate(){},page(html){f.main.innerHTML=html;return f.state.dialogGeneration;},dialog:f.bridge.showDialog,inspect(){}};
 f.w.eval(source('collector.js'));f.client=f.w.VoidCollector.create(host);f.frozen=frozen;return f;
}
cases.push(['All models includes both free and capsule Copium editions under the same family filter',async()=>{
 const f=collectorFixture();try{await f.client.open();const select=f.d.querySelector('[data-cl-filter="family"]');select.value='copium-cartridge';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));await settle(()=>f.d.querySelectorAll('.cl-tile').length===12);const ids=[...f.d.querySelectorAll('.cl-tile [data-model]')].map(node=>node.dataset.model);assert(ids.includes('gift-copium-cartridge'));assert(ids.includes('gift-cartridge-rain-check'));assert.equal(ids.filter(id=>COSMETICS.find(item=>item.id===id).acquisitionPolicy==='capsule-only').length,6);assert.match(f.main.textContent,/2 of 12 models owned · 3 discovered/);assert(!f.requests.some(request=>request.body));}finally{f.client.reset();f.end();}
}]);
cases.push(['an older capsule shows only its saved families and odds; offline reduced-motion previews never draw or play',async()=>{
 const f=collectorFixture();try{await f.client.open();await f.click('[data-cl="capsule"]');await settle(()=>f.d.querySelector('.cl-family-choices'));
  assert.deepEqual([...f.d.querySelectorAll('[data-cl="family"]')].map(node=>node.dataset.family),f.frozen.map(item=>item.id));
  assert.equal(f.d.querySelectorAll('.cl-family-posters img').length,4);assert.match(f.dialog.textContent,/97\.8%/);assert.match(f.dialog.textContent,/2\.2%/);assert.match(f.dialog.textContent,/2 eligible models owned/);
  f.setOnline(false);await f.click('[data-cl="preview-contents"]');assert.match(f.dialog.textContent,/Original 0/);assert.doesNotMatch(f.dialog.textContent,/Later catalog name/);await f.click('[data-cl="sample-play"]');assert.match(f.dialog.textContent,/Reduced motion is on/);await f.click('[data-cl="sample-back"]');assert(f.d.querySelector('[data-cl="open"]').disabled);assert.equal(f.previews.length,0);assert(!f.requests.some(request=>request.body));
 }finally{f.client.reset();f.end();}
}]);
(async()=>{
 ({COSMETICS}=await import('../worker/cosmetics.mjs'));({collectibleFamilies}=await import('../src/collectibles/models.mjs'));summary=await inventory();
 let passed=0;for(const [name,run] of cases){try{await run();console.log('PASS '+name);passed++;}catch(error){console.error('FAIL '+name,error);process.exitCode=1;}}
 console.log(passed+'/'+cases.length+' focused family browsing checks passed (production catalog, SQL summary and client controllers).');
})();
