'use strict';
// Repeatable journal-only workload. It does not measure browser layout or FPS.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const values=new Map(),storage={get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
const messages=Array.from({length:1200},(_,i)=>({id:'perf-'+i,author:'self',text:'Transmission '+i,time:i,reactions:[],threadRoot:i%5?'perf-'+(i-i%5):''}));
storage.setItem('voidline.local.v1',JSON.stringify({profile:{name:'Perf'},messages:{'afterhours/general':messages},customServers:[],conversations:[],notifications:[],friends:[],deleted:[],artifactInspected:[]}));
const context={window:{},JSON,Date,Map,Set,Math,crypto:require('node:crypto').webcrypto};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/store.js'),'utf8'),context);
const store=context.window.VoidStore.create(storage),start=performance.now();let state=store.load();const load=performance.now()-start,times=[];
for(let i=0;i<30;i++){state.profile.statusText='Status '+i;const start=performance.now(),result=store.commit(state);if(!result.ok)throw Error(result.error);times.push(performance.now()-start);state=result.state;}
console.log(JSON.stringify({environment:'Node 24, in-memory Storage adapter; no browser rendering',historyMessages:1200,initialLoadMs:+load.toFixed(2),fieldMutations:30,meanCommitMs:+(times.reduce((a,b)=>a+b,0)/times.length).toFixed(2),maxCommitMs:+Math.max(...times).toFixed(2),retainedMessages:state.messages['afterhours/general'].length},null,2));
