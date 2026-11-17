'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {harness}=require('./voidline-v2-test.cjs');
function memory(){const data=new Map(),writes=[];return {data,writes,get length(){return data.size},key:i=>[...data.keys()][i],getItem:key=>data.get(key)||null,setItem(key,value){writes.push({key,length:value.length});data.set(key,String(value));},removeItem:key=>data.delete(key)};}
const context={window:{},JSON,Map,Set,Math,Date};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/drafts.js'),'utf8'),context);const drafts=context.window.VoidDrafts;
(async()=>{
 const storage=memory(),tab=drafts.create(storage);tab.load();const bytes='data:image/png;base64,'+'A'.repeat(200000);
 const first={location:{server:'afterhours',channel:'general'},drafts:{'afterhours/general':{text:'First caption',image:bytes,name:'rough.png',reply:'original'}},threads:{},reading:{}};
 assert.equal(tab.save(first),true);first.drafts['afterhours/general'].text='Second caption';assert.equal(tab.save(first),true);assert.equal(storage.writes.filter(item=>item.key.includes('.media.')).length,1);assert.ok(storage.writes.filter(item=>item.key===tab.key).every(item=>item.length<1000));
 const restored=drafts.create(storage).load();assert.equal(restored.drafts['afterhours/general'].image,bytes);assert.equal(restored.drafts['afterhours/general'].text,'Second caption');assert.equal(restored.drafts['afterhours/general'].reply,'original');tab.save({location:first.location,drafts:{},threads:{}});assert.equal([...storage.data.keys()].filter(key=>key.includes('.media.')).length,0);
 console.log('PASS draft media writes once, text metadata stays small, refresh restores exact data, and successful deletion collects unused bytes.');
 const failed=memory(),store=drafts.create(failed);store.load();assert.equal(store.save({drafts:{'afterhours/general':{text:'Keep this committed draft'}}}),true);const old=failed.getItem(store.key),originalSet=failed.setItem.bind(failed);failed.setItem=(key,value)=>{if(key===store.key)throw Error('quota');originalSet(key,value);};
 assert.equal(store.save(first),false);assert.equal(failed.getItem(store.key),old);assert.equal([...failed.data.keys()].filter(key=>key.includes('.media.')).length,0);assert.equal(store.current.drafts['afterhours/general'].image,bytes);
 console.log('PASS denied metadata write preserves prior session and recoverable in-memory media without orphaning a committed reference.');
 const app=harness({messages:{'afterhours/general':[]}});app.get('message-input').value='Keep my current draft';await app.get('message-input').dispatch('input');
 const recovery={format:'voidline-recovery',state:app.saved(),pending:[],tabSession:{location:{server:'arcade',channel:'general'},drafts:{'afterhours/general':{text:'Recovered alternative'},'afterhours/introductions':{text:'Recovered introduction'}},threads:{},reading:{}}};
 const create=app.document.createElement;let picker;app.document.createElement=tag=>{const element=create(tag);if(tag==='input')picker=element;return element;};
 async function importRecovery(replace){await app.click({action:'import'});const text=JSON.stringify(recovery);picker.files=[{size:text.length,text:async()=>text}];await picker.onchange();assert.match(app.get('modal-content').innerHTML,/tab-local drafts/);app.get('import-replace-drafts').checked=replace;await app.click({action:'commit-import'});}
 await importRecovery(false);assert.equal(app.api.state.server,'afterhours');assert.equal(app.api.state.channel,'general');assert.equal(app.get('message-input').value,'Keep my current draft');app.api.changeContext('afterhours','introductions');assert.equal(app.get('message-input').value,'Recovered introduction');
 await importRecovery(true);assert.equal(app.api.state.channel,'introductions');app.api.changeContext('afterhours','general');assert.equal(app.get('message-input').value,'Recovered alternative');
 console.log('PASS recovery import restores drafts by context, never moves destination, and replaces conflicts only on explicit choice.');
})().catch(error=>{console.error(error);process.exitCode=1;});
