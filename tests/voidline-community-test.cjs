const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let html='';const events={},holder={innerHTML:'',querySelector:()=>({pause(){},isConnected:true})};const nodes={'app-modal':{addEventListener(){}},'vc-audio-study':holder};
const document={querySelector:()=>null,getElementById:id=>nodes[id]||null,addEventListener:(type,fn)=>events[type]=fn};const window={};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/community.js'),'utf8'),{window,document,btoa,ArrayBuffer,DataView,Uint8Array,Math,Object,String});const community=window.VoidCommunity;
assert.equal(Object.keys(community.residents).length,5);assert.equal(new Set(Object.keys(community.residents).map(id=>community.avatarMarkup(id))).size,5);
for(const id of Object.keys(community.residents)){const avatar=community.avatarMarkup(id);assert.match(avatar,/<svg/);assert.doesNotMatch(avatar,/<script|(?:href|src)="https?:|onload=/i);assert.match(community.contribution(id),/data-contribution="night-bus/);}
let templates=0;for(const [bucket,list]of Object.entries(community.conversations)){assert.match(bucket,/^(afterhours|studio)\/[a-z-]+$/);for(const item of list){templates++;assert.ok(community.residents[item.author]);assert.ok(item.text.length<4000);assert.ok(item.minutesAgo>0);if(item.contributionId)assert.ok(community.work(item.contributionId));assert.equal(item.reactions.length,0);}}
assert.equal(templates,16);assert.equal(community.work('__proto__'),null);assert.equal(community.avatarMarkup('unknown'),'');assert.equal(community.forArtifact('night','nova').id,'night-bus');
const api={modal:value=>html=value,toast(){}};assert.equal(community.openContribution('night-bus',api),true);assert.match(html,/fictional sample content/);assert.match(html,/roughs/);assert.doesNotMatch(html,/<audio/);
community.openContribution('night-bus-loop',api);assert.match(html,/data-vc-render-loop/);assert.doesNotMatch(html,/<audio/);
const button={dataset:{},hasAttribute:k=>k==='data-vc-render-loop'};events.click({target:{closest:()=>button},preventDefault(){}});
assert.match(holder.innerHTML,/<audio[^>]*controls/);assert.doesNotMatch(holder.innerHTML,/autoplay/);
const encoded=/src="data:audio\/wav;base64,([^"]+)"/.exec(holder.innerHTML)[1],wave=Buffer.from(encoded,'base64');assert.equal(wave.toString('ascii',0,4),'RIFF');assert.equal(wave.toString('ascii',8,12),'WAVE');assert.equal(wave.readUInt32LE(24),12000);assert.equal(wave.readUInt32LE(40)/2/12000,8);assert.equal(wave.length,192044);assert.ok(wave.subarray(44).some(byte=>byte!==0));
console.log('PASS: five original residents/avatars, sample-safe contribution references, 16 discussion templates, read-only story views, opt-in valid original 8-second WAV, and no autoplay.');

const {harness}=require('./voidline-v2-test.cjs');
const app=harness(null,new Map(),{realModules:true,runtimeModules:['community.js']});
assert.ok(app.api.state.messages['afterhours/general'].some(message=>message.contributionId==='night-bus'));
assert.match(app.get('chat-feed').innerHTML,/data-contribution="night-bus"/);
app.window.VoidProfiles.open('nova');assert.match(app.get('modal-content').innerHTML,/vc-resident-avatar/);assert.match(app.get('modal-content').innerHTML,/data-contribution="night-bus"/);assert.match(app.get('modal-content').innerHTML,/vp-frame-orbit/);
const before=JSON.stringify(app.api.state.artifacts);app.api.openContribution('night-bus');assert.match(app.get('modal-content').innerHTML,/fictional sample content/);assert.equal(JSON.stringify(app.api.state.artifacts),before);
const existing=harness({version:2,messages:{'afterhours/general':[],'studio/general':[{id:'my-old-record',author:'self',text:'Keep my original work',time:1700000000000,reactions:[]}]}},new Map(),{realModules:true,runtimeModules:['community.js']});
assert.equal(existing.api.state.messages['afterhours/general'].length,0);assert.equal(existing.api.state.messages['studio/general'][0].id,'my-old-record');assert.ok(existing.api.state.messages['afterhours/night-bus'].length>0);
console.log('PASS: fresh discussion and distinct sample profile integrate; contributions do not grant ownership or overwrite previous archives.');
