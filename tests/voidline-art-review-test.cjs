'use strict';
// Real public-gallery controller; controlled dialog/theme/renderer events.
// Browser focus trapping, native Escape and actual SVG animation are separate checks.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/art-review.js'),'utf8');
const tests=[],test=(name,run)=>tests.push([name,run]);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function fixture({previewResult}={}){
 const nodes=new Map(),calls={mount:[],preview:[],stop:[],stopAll:0,theme:[],fetch:[]},live=new Set();let focus=null;
 function node(id=''){const value={id,open:false,isConnected:true,value:id==='ar-series'?'all':'',checked:false,textContent:'',innerHTML:'',children:[],listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},append(child){this.children.push(child);},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();},focus(){focus=this;}};if(id)nodes.set(id,value);return value;}
 for(const id of ['ar-dialog','ar-search','ar-series','ar-count','ar-grid','ar-stage','ar-title','ar-detail-series','ar-alt','ar-material','ar-inline','ar-download','ar-status','ar-close','ar-play','ar-reduce'])node(id);
 const rows=[{id:'gift-test',name:'<img src=x onerror=alert(1)>',type:'gift',series:'Test & gifts',material:'Brass',alt:'A small object',detailURL:'/art/v3/gift-test-detail.fixture.svg'},{id:'badge-test',name:'Shield',type:'badge',series:'Originals',material:'Steel',alt:'A shield',detailURL:'/art/v3/badge-test-detail.fixture.svg'}];
 const art={items:()=>rows,render:(id,mini=false)=>`<span data-test-object="${id}" data-mini="${mini}"></span>`,detail:id=>`<span data-test-detail="${id}"></span>`,mount:async(container,id)=>{calls.mount.push({container,id});return null;},stopAll(){calls.stopAll++;for(const result of [...live])result.stop();},preview:async(container,id)=>{calls.preview.push({container,id});if(previewResult)return previewResult(container,id);const finished=deferred(),result={played:true,finished:finished.promise,stop(){if(live.delete(result)){calls.stop.push(id);finished.resolve();}}};live.add(result);return result;}};
 const document={getElementById:id=>nodes.get(id),createElement:()=>node()};
 const window={VoidCollectibleArt:art,VoidTheme:{apply(value){calls.theme.push(value);if(value.reducedMotion)art.stopAll();}}};
 vm.runInNewContext(source,{window,document,fetch:(...args)=>{calls.fetch.push(args);throw Error('Public gallery must not fetch account data');}});
 return{nodes,calls,rows,node,get focus(){return focus;},open(id='gift-test'){const card=node();card.dataset={artOpen:id};nodes.get('ar-grid').listeners.click({target:{closest:()=>card}});return card;},play:()=>nodes.get('ar-play').listeners.click(),reduce(value=true){nodes.get('ar-reduce').checked=value;nodes.get('ar-reduce').listeners.change();}};
}
test('public gallery escapes labels, filters real metadata and leaves account operations untouched',()=>{
 const app=fixture();assert.match(app.nodes.get('ar-grid').innerHTML,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(app.nodes.get('ar-grid').innerHTML,/<img src=x/);assert.match(app.nodes.get('ar-count').textContent,/1 decorative badges · 1 gifts/);
 app.nodes.get('ar-search').value='steel';app.nodes.get('ar-search').listeners.input();assert.match(app.nodes.get('ar-grid').innerHTML,/badge-test/);assert.doesNotMatch(app.nodes.get('ar-grid').innerHTML,/gift-test/);
 app.nodes.get('ar-search').value='';app.nodes.get('ar-series').value='Test & gifts';app.nodes.get('ar-series').listeners.change();assert.match(app.nodes.get('ar-grid').innerHTML,/gift-test/);assert.doesNotMatch(app.nodes.get('ar-grid').innerHTML,/badge-test/);assert.equal(app.calls.fetch.length,0);
});
test('gallery detail uses a static mount and close restores the connected source card',()=>{
 const app=fixture(),card=app.open();assert.equal(app.nodes.get('ar-dialog').open,true);assert.equal(app.nodes.get('ar-title').textContent,app.rows[0].name);assert.equal(app.nodes.get('ar-status').textContent,'Static resting pose');assert.equal(app.calls.mount.length,1);assert.equal(app.calls.preview.length,0);assert.equal(app.nodes.get('ar-download').href,app.rows[0].detailURL);app.nodes.get('ar-close').listeners.click();assert.equal(app.nodes.get('ar-dialog').open,false);assert.equal(app.focus,card);assert.equal(app.calls.fetch.length,0);
});
test('reducing motion invalidates a running preview before its canceled completion callback',async()=>{
 const app=fixture();app.open();await app.play();assert.match(app.nodes.get('ar-status').textContent,/Playing once/);const stops=app.calls.stopAll;app.reduce();await Promise.resolve();assert.ok(app.calls.stopAll>stops);assert.equal(app.calls.stop.length,1);assert.equal(app.nodes.get('ar-status').textContent,'Static resting pose');assert.equal(app.calls.theme.at(-1).reducedMotion,true);assert.equal(app.calls.fetch.length,0);
});
test('closing or reducing motion during a delayed preview stops its late result',async()=>{
 for(const action of ['close','reduce']){
  const pending=deferred();let stops=0;const app=fixture({previewResult:()=>pending.promise}),card=app.open();const playing=app.play();
  if(action==='close')app.nodes.get('ar-dialog').close();else app.reduce();
  pending.resolve({played:true,stop(){stops++;}});await playing;assert.equal(stops,1);assert.doesNotMatch(app.nodes.get('ar-status').textContent,/Playing once|Preview complete/);if(action==='close')assert.equal(app.focus,card);
 }
});
test('a native close notification cancels active motion without restoring a removed card',async()=>{
 const app=fixture(),card=app.open();await app.play();card.isConnected=false;app.nodes.get('ar-dialog').close();await Promise.resolve();assert.equal(app.calls.stop.length,1);assert.equal(app.focus,null);assert.doesNotMatch(app.nodes.get('ar-status').textContent,/Preview complete/);
});
(async()=>{let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${tests.length-failed}/${tests.length} public-gallery controller checks passed. Controlled DOM/theme/renderer events; native browser dialog behavior and actual artwork motion are not exercised.`);process.exitCode=failed?1:0;})();
