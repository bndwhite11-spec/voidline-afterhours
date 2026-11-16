'use strict';
// Loads the real badge/profile modules and app in one VM. Native browser rendering is not modeled.
const assert=require('node:assert/strict');
const {harness,plain,prevent,input,messages,sampleMessage,STORE}=require('./voidline-v2-test.cjs');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
const boot=(initial={},storage=new Map(),options={})=>harness(initial,storage,{realModules:true,...options});

test('real modules retain legacy identity/history and grant starter artifacts',()=>{
  const fixture={server:'custom-old',channel:'general',profile:{name:'Ari',avatar:'☾',badge:'night',bio:'A retained profile biography.',status:'idle',statusText:'Listening to lost records',accent:'#7a8b9c',theme:'velvet',banner:'grid',frame:'orbit',layout:'editorial',animated:false,featuredBadges:['night'],extraField:'retained'},customServers:[{id:'custom-old',name:'The old club'}],messages:{'afterhours/general':[],'custom-old/general':[sampleMessage('old-transmission','A message from the first edition',{pinned:true,reactions:[{emoji:'💜',count:4,mine:true}]})]}};
  const app=boot(fixture),p=app.api.state.profile;
  for(const [key,value]of Object.entries(fixture.profile))assert.deepEqual(plain(p[key]),value,'Retain profile '+key);
  assert.equal(app.api.state.server,'custom-old');assert.equal(messages(app,'custom-old/general')[0].id,'old-transmission');assert.equal(messages(app,'custom-old/general')[0].pinned,true);assert.equal(messages(app,'afterhours/general').length,0);
  for(const badge of ['night','larp','founder'])assert.equal(app.window.VoidBadges.has(badge),true,'Retain/grant '+badge);
  assert.equal(app.api.state.artifactSchema,1);assert.equal(app.window.VoidBadges.catalog.length,9);
  assert.equal(app.api.state.profile.badge,'night','Starter grants must not replace the equipped legacy badge');
});

test('profile open/edit/settings accept multiple modal class tokens',()=>{
  const app=boot({});
  app.window.VoidProfiles.open('self');assert.equal(app.get('app-modal').open,true);assert.ok(app.get('app-modal').classList.contains('vp-modal'));assert.ok(app.get('app-modal').classList.contains('vp-view-modal'));assert.match(app.get('modal-content').innerHTML,/vp-profile-view/);
  app.window.VoidProfiles.edit();assert.ok(app.get('app-modal').classList.contains('vp-editor-modal'));assert.match(app.get('modal-content').innerHTML,/vp-profile-form/);
  app.window.VoidProfiles.settings();assert.ok(app.get('app-modal').classList.contains('vp-settings-modal'));assert.match(app.get('modal-content').innerHTML,/vp-settings-form/);
  app.window.VoidProfiles.open('nova');assert.match(app.get('modal-content').innerHTML,/SAMPLE PROFILE/);
});

test('artifact button event handling persists inspection, equipped badge, schema and history through reload',async()=>{
  const app=boot({profile:{name:'Ari',avatar:'A',badge:'night'},messages:{'afterhours/general':[sampleMessage('kept','Keep this original message')]}});
  await app.click({vbadge:'night'});assert.match(app.get('modal-content').innerHTML,/3:33 AM/);assert.ok(app.api.state.artifactInspected.includes('night'));assert.equal(app.saved().artifactSchema,1);
  await app.click({vbadgeEquip:'founder'});assert.equal(app.api.state.profile.badge,'founder');
  app.api.persist();const reloaded=boot(null,app.storage);assert.equal(reloaded.api.state.profile.badge,'founder');assert.ok(reloaded.api.state.artifactInspected.includes('night'));assert.ok(reloaded.api.state.artifactInspected.includes('founder'));assert.equal(reloaded.api.state.artifactSchema,1);assert.equal(messages(reloaded,'afterhours/general')[0].id,'kept');
  assert.equal(reloaded.saved().artifactSchema,1);
});

test('saved appearance applies and real settings events persist toggles',async()=>{
  const app=boot({profile:{name:'Ari',theme:'obsidian',accent:'#112233',badge:'larp'},settings:{compact:true,motion:false,memberSidebar:false}});
  assert.equal(app.document.documentElement.dataset.theme,'obsidian');assert.equal(app.document.documentElement.style.getPropertyValue('--accent'),'#112233');assert.equal(app.document.body.dataset.density,'compact');assert.ok(app.document.body.classList.contains('reduce-motion'));assert.ok(app.document.body.classList.contains('members-hidden'));
  app.window.VoidProfiles.settings();await app.submit('vp-settings-form',{theme:'velvet',motion:'on',memberSidebar:'on'});
  assert.equal(app.api.state.profile.theme,'velvet');assert.equal(app.api.state.settings.compact,false);assert.equal(app.api.state.settings.motion,true);assert.equal(app.api.state.settings.memberSidebar,true);assert.equal(app.document.body.classList.contains('reduce-motion'),false);assert.equal(app.document.body.classList.contains('members-hidden'),false);
  const reloaded=boot(null,app.storage);assert.equal(reloaded.document.documentElement.dataset.theme,'velvet');assert.equal(reloaded.api.state.settings.memberSidebar,true);
});

test('real profile submit marks customization and unlocks 404 Angel through actual module contract',async()=>{
  const app=boot({messages:{'afterhours/general':[]}});
  assert.equal(app.window.VoidBadges.has('angel'),false);assert.equal(app.api.getStats().profileComplete,false);
  app.window.VoidProfiles.edit();await app.submit('vp-profile-form',{name:'Ari',avatar:'AR',bio:'Making quiet things for strange hours.',status:'idle',statusText:'In the studio',theme:'velvet',accent:'#887799',banner:'aurora',frame:'orbit',layout:'editorial',animated:'on',featuredBadges:['larp','founder']});
  assert.equal(app.api.state.profile.name,'Ari');assert.equal(app.api.state.profile.frame,'orbit');assert.ok(app.api.state.profile.customizedAt);assert.equal(app.window.VoidProfiles.isComplete(),true);assert.equal(app.api.getStats().profileComplete,true);assert.equal(app.window.VoidBadges.has('angel'),true);
  assert.ok(app.saved().artifacts.angel);assert.ok(app.api.state.notifications.some(n=>n.artifact==='angel'));
  assert.equal(app.get('app-modal').classList.contains('vp-view-modal'),true,'Saving should return to the identity view');
});

test('artifact activity rules run against real getStats and mini sprite installs once',()=>{
  const app=boot({messages:{'afterhours/general':[]}}),api=app.api;
  const sprites=()=>app.document.body.children.filter(n=>n.id==='va-mini-sprite');assert.equal(sprites().length,1);assert.match(sprites()[0].innerHTML,/id="va-mini-larp"/);assert.match(app.window.VoidBadges.mini('larp'),/href="#va-mini-larp"/);
  app.window.VoidBadges.init(api);app.window.VoidBadges.init(api);assert.equal(sprites().length,1,'Repeated initialization must reuse the existing sprite');
  input(app,'A first original transmission');api.changeContext('afterhours','introductions');input(app,'A second channel transmission');assert.equal(app.window.VoidBadges.has('night'),true);
  assert.equal(messages(app,'afterhours/general').filter(m=>m.author==='self').length,1);assert.equal(messages(app,'afterhours/introductions').filter(m=>m.author==='self').length,1);
});

(async()=>{let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`\n${tests.length-failures}/${tests.length} module integration checks passed. Browser layout, pointer rendering, media, and downloads are not exercised.`);process.exitCode=failures?1:0;})();
