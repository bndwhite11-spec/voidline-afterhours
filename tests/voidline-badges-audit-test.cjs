'use strict';
// Badge state and event checks. Native layout, rasterization, and pointer rendering are not modeled.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const {harness}=require('./voidline-v2-test.cjs');
const source=fs.readFileSync(path.join(__dirname,'../dist/badges.js'),'utf8');
function fixture(initial={}){
  let card=null,html='',result=true,saves=0,modalOpen=false,timerId=0;
  const nodes=[],listeners={},events=[],toasts=[],revealed=[],timers=new Map();
  const state={profile:{badge:'larp'},settings:{motion:false},artifacts:{larp:{earnedAt:null,legacy:true}},artifactInspected:['larp'],...initial};
  let metrics={};
  function node(){return {id:'',className:'',innerHTML:'',listeners:{},classList:{add(){}},setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn;},contains(){return false;},remove(){if(card===this)card=null;}};}
  const document={body:{appendChild(n){if(n.id==='va-mini-sprite')nodes.push(n);else{card=n;revealed.push(n.innerHTML);}}},createElement:node,createElementNS:node,getElementById:id=>nodes.find(n=>n.id===id)||null,querySelector:q=>q==='dialog[open]'?(modalOpen?{}:null):q==='.va-acquisition'?card:null,addEventListener(type,fn){listeners[type]=fn;},activeElement:null};
  const window={matchMedia:()=>({matches:false}),dispatchEvent:e=>events.push(e)};
  vm.runInNewContext(source,{window,document,Intl,Date,Object,Array,String,Number,Math,Set,Map,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},setTimeout(fn,delay){timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id)},{filename:'badges.js'});
  const api={state,getStats:()=>metrics,persist(){saves++;return result;},modal(v){html=v;},refresh(){},toast(v){toasts.push(v);}};
  window.VoidBadges.init(api);
  return {badges:window.VoidBadges,state,nodes,events,toasts,revealed,timers,listeners,get html(){return html;},get saves(){return saves;},get card(){return card;},set metrics(v){metrics=v;},set saveResult(v){result=v;},set modalOpen(v){modalOpen=v;},click(dataset,attrs=[],sample=false){const button={dataset,hasAttribute:k=>attrs.includes(k),closest:q=>sample&&q==='.va-sample-context'?{}:null};listeners.click({target:{closest:()=>button},preventDefault(){}});},run(delay){const t=[...timers].find(([,v])=>v.delay===delay);assert.ok(t,'Expected timer '+delay);timers.delete(t[0]);t[1].fn();}};
}
const full={ownMessages:40,channelsUsed:6,attachments:3,replies:10,pins:3,customServers:1,customChannels:3,profileComplete:true};
const tests=[];
const test=(name,run)=>tests.push([name,run]);
test('failed unlock writes never announce or retain phantom awards',()=>{
  const f=fixture();f.metrics=full;f.saveResult=false;
  assert.equal(f.badges.checkUnlocks({announce:true}).length,0);
  assert.equal(f.badges.has('angel'),false);assert.equal(f.badges.has('voidwalker'),false);
  assert.equal(f.events.length,0);assert.equal(f.toasts.length,0);assert.equal(f.card,null);
  f.badges.open('angel');assert.equal(f.state.artifactInspected.includes('angel'),false);assert.doesNotMatch(f.html,/data-vbadge-equip="angel"/);
});
test('equip failure retains prior choice and emits no success',()=>{
  const f=fixture();f.metrics=full;f.badges.checkUnlocks({announce:false});f.saveResult=false;
  f.click({vbadgeEquip:'angel'});assert.equal(f.state.profile.badge,'larp');assert.equal(f.toasts.length,0);
  f.saveResult=true;f.click({vbadgeEquip:'angel'});assert.equal(f.state.profile.badge,'angel');assert.match(f.toasts.at(-1),/now on your profile/);
});
test('sample cabinet inspections are read-only with no invented earned date',()=>{
  const f=fixture(),before=JSON.stringify(f.state),saves=f.saves;
  f.badges.openFor('ghost',['founder'],'ghost.wav');assert.match(f.html,/ghost.wav’s cabinet/);assert.match(f.html,/Read-only/);assert.doesNotMatch(f.html,/data-vbadge-equip/);
  f.click({vbadge:'founder'},[],true);assert.match(f.html,/Sample display \/ no earned date/);assert.doesNotMatch(f.html,/data-vbadge-equip/);assert.equal(f.saves,saves);assert.equal(JSON.stringify(f.state),before);
});
test('shared Angel predicate requires authored identity and a genuine visual change',()=>{
  const app=harness({profile:{name:'Ari',avatar:'Y',bio:'An original biography with enough detail.',statusText:'In the studio',banner:'orbital',frame:'chrome',layout:'classic',theme:'midnight',accent:'#a5b2d4',animated:true,customizedAt:Date.now()},messages:{'afterhours/general':[]}},new Map(),{realModules:true});
  assert.equal(app.window.VoidProfiles.isComplete(),false);assert.equal(app.api.getStats().profileComplete,false);assert.equal(app.window.VoidBadges.has('angel'),false);
  app.api.state.profile.avatar='AR';assert.equal(app.window.VoidProfiles.isComplete(),true);assert.equal(app.api.getStats().profileComplete,true);app.window.VoidBadges.checkUnlocks({announce:false});assert.equal(app.window.VoidBadges.has('angel'),true);
  const founder=app.window.VoidBadges.catalog.find(b=>b.id==='founder');assert.equal(founder.tier,'Edition');assert.match(founder.condition,/not a limited-supply claim/);
  const angel=app.window.VoidBadges.catalog.find(b=>b.id==='angel');assert.match(angel.condition,/20 characters/);assert.match(angel.condition,/change an appearance option/);
});
test('mini marks are distinct small vectors and full collectible art remains separate',()=>{
  const f=fixture(),sprite=f.nodes[0].innerHTML;assert.equal((sprite.match(/<symbol /g)||[]).length,9);assert.doesNotMatch(sprite,/linearGradient/);
  const silhouettes=new Set();for(const b of f.badges.catalog){for(const size of [16,24,32]){assert.match(f.badges.mini(b.id,size),new RegExp('--va-mini-size:'+size+'px'));assert.match(f.badges.mark(b.id,size),/viewBox="0 0 32 32"/);}silhouettes.add(f.badges.mark(b.id,24).replace(/aria-label="[^"]+"/,'').replace(/class="[^"]+"/,''));}
  assert.equal(silhouettes.size,9);assert.match(f.badges.art('angel'),/viewBox="0 0 160 160"/);
  const sheet=fs.readFileSync(path.join(__dirname,'../dist/artifact-marks.svg'),'utf8');assert.match(sheet,/16 PX/);assert.match(sheet,/24 PX/);assert.match(sheet,/32 PX/);assert.match(sheet,/grayscale/);
});
test('rare acquisitions queue instead of dropping awards and wait behind dialogs',()=>{
  const f=fixture();f.metrics=full;f.modalOpen=true;f.badges.checkUnlocks({announce:true});assert.equal(f.card,null);
  f.modalOpen=false;f.listeners.close();assert.match(f.card.innerHTML,/404 ANGEL/);assert.match(f.card.className,/va-acquisition-still/);
  for(let i=0;i<4;i++){f.run(5200);f.run(0);}
  assert.equal(f.revealed.length,5);for(const name of ['404 ANGEL','GHOST FREQUENCY','VELVET STATIC','DEAD INTERNET','VOIDWALKER'])assert.ok(f.revealed.some(v=>v.includes(name)),name);
});
test('recovery reveal accepts only committed ownership and performs no write or event',()=>{
  const f=fixture(),beforeSaves=f.saves,beforeEvents=f.events.length;
  f.badges.revealCommitted(['angel','invalid']);assert.equal(f.card,null);
  f.state.artifacts.angel={earnedAt:Date.now()};f.badges.revealCommitted(['angel','angel','voidwalker']);
  assert.match(f.card.innerHTML,/404 ANGEL/);assert.equal(f.saves,beforeSaves);assert.equal(f.events.length,beforeEvents);assert.equal(f.toasts.length,0);assert.equal(f.badges.has('voidwalker'),false);
});
let failed=0;for(const [name,run]of tests){try{run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`\n${tests.length-failed}/${tests.length} badge audit checks passed. Browser rasterization and native pointer rendering are not modeled.`);process.exitCode=failed?1:0;
