'use strict';
// The actual public gallery markup and controller, with isolated transport
// and WAAPI stand-ins. Native dialog drawing and browser compositing are separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const dir=path.join(__dirname,'../dist');
const tests=[],test=(name,run)=>tests.push([name,run]);
const held=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{resolve,promise};};
async function fixture(){
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'art-review.html'),'utf8'),{runScripts:'outside-only',url:'https://voidline.example/art-review.html'});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id);
 const rows=[
  {id:'gift-test',name:'<img src=x onerror=bad>',type:'gift',series:'Paper',material:'Brass',alt:'A parcel',detailURL:'/gift-detail.000011112222.svg'},
  {id:'badge-test',name:'Shield',type:'badge',series:'Originals',material:'Steel',alt:'A shield',detailURL:'/badge-detail.333344445555.svg'}
 ];
 const calls={loads:[],plays:[],fetches:[],themes:[]},controllers=[];
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 const model={motion:false,prepare:null,preview:null};
 w.VoidTheme={apply(value){model.motion=value.reducedMotion;calls.themes.push(value);},state(){return{effectiveReducedMotion:model.motion};}};
 w.fetch=(...args)=>{calls.fetches.push(args);throw Error('Unexpected request');};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.VoidCollectibleArt={version:4,items:()=>rows,render:(id,mini)=>'<span data-object="'+id+'" data-mini="'+!!mini+'"></span>',detail:id=>'<img data-poster="'+id+'">',stop(){},async prepare(host,id,options){
   calls.loads.push(id);try{if(options.beforeLoad)await options.beforeLoad();}catch{return{reason:'asset-unavailable'};}
   if(model.prepare)return model.prepare(host,id,options);return{svg:true};
  },async preview(host,id,options){
   calls.plays.push(id);if(model.preview)return model.preview(host,id,options);const done=held();
   const ctl={played:true,progress(){return ctl.at??.25;},finished:done.promise,stop(){done.resolve('stopped');},pause(){ctl.paused=true;},resume(){ctl.paused=false;},seek(at){ctl.at=at;ctl.paused=true;},finish(){done.resolve('complete');}};
   options.signal.addEventListener('abort',()=>ctl.stop(),{once:true});controllers.push(ctl);return ctl;
  }};
 w.eval(fs.readFileSync(path.join(dir,'art-review.js'),'utf8'));
 function emit(id,type){$(id).dispatchEvent(new w.Event(type,{bubbles:true}));}
 function open(id='gift-test'){const card=$('ar-grid').querySelector('[data-art-open="'+id+'"]');card.focus();card.click();return card;}
 function choose(id,value){$(id).value=value;emit(id,id==='ar-search'||id==='ar-frame'?'input':'change');}
 return{w,d,$,rows,model,calls,controllers,emit,open,choose,tick,close:()=>w.close()};
}
test('search, type and series reuse the same cards, scope counts and escape text',async()=>{
 const a=await fixture(),grid=a.$('ar-grid'),cards=[...grid.children];assert.equal(cards.length,2);assert(!grid.querySelector('img[onerror]'));assert.match(cards[0].textContent,/<img src=x onerror=bad>/);
 a.choose('ar-search','steel');assert.equal(cards[0].hidden,true);assert.equal(cards[1].hidden,false);assert.match(a.$('ar-count').textContent,/1 of 2 objects · 1 decoration · 0 gifts/);
 a.choose('ar-search','');a.choose('ar-series','Paper');assert.match(a.$('ar-count').textContent,/0 decorations · 1 gift/);
 a.choose('ar-type','earned');assert.equal(a.$('ar-empty').hidden,false);a.choose('ar-type','all');assert.equal(cards[0],grid.children[0]);assert.equal(a.calls.fetches.length,0);a.close();
});
test('a slow initial load retains a poster, known version and actual size variants; source URLs are checked',async()=>{
 const a=await fixture(),wait=held();a.model.prepare=()=>wait.promise;
 a.rows[0].sourceArt={creator:'<raw>',license:'Source & terms',sourceURL:'https://example.org/art'};a.open();
 assert(a.$('ar-stage').querySelector('[data-poster]'));assert.equal(a.$('ar-stage').getAttribute('aria-busy'),'true');assert(a.$('ar-play').disabled);
 assert.equal(a.$('ar-inline').children.length,3);assert.match(a.$('ar-version').textContent,/000011112222/);assert(a.$('ar-source').textContent.includes('<raw>'));assert.equal(a.$('ar-source').querySelector('a').href,'https://example.org/art');
 wait.resolve({svg:true});await a.tick();assert(!a.$('ar-play').disabled);assert.equal(a.$('ar-stage').getAttribute('aria-busy'),'false');a.$('ar-close').click();a.rows[0].sourceArt.sourceURL='javascript:bad()';a.open();assert(!a.$('ar-source').querySelector('a'));a.close();
});
test('missing detail leaves a retryable poster; reduced motion has a distinct explanation and disables play',async()=>{
 const a=await fixture();a.open();await a.tick();a.choose('ar-loading','missing');await a.tick();assert(a.$('ar-stage').querySelector('[data-poster]'));assert.match(a.$('ar-status').textContent,/could not load/);assert.equal(a.$('ar-play').textContent,'Retry artwork');
 a.$('ar-play').click();await a.tick();assert.equal(a.$('ar-loading').value,'normal');assert.equal(a.$('ar-stage').getAttribute('aria-busy'),'false');
 a.$('ar-reduce').checked=true;a.emit('ar-reduce','change');await a.tick();assert(a.$('ar-play').disabled);assert.match(a.$('ar-status').textContent,/Reduced motion/);assert.equal(a.calls.plays.length,0);a.close();
});
test('pause, seek, resume and replay affect only the preview and never make an account request',async()=>{
 const a=await fixture();a.open();await a.tick();a.$('ar-play').click();await a.tick();assert.match(a.$('ar-status').textContent,/Playing once/);
 a.$('ar-pause').click();assert(a.controllers[0].paused);assert.equal(a.$('ar-frame-value').textContent,'25%');a.choose('ar-frame','72');assert.equal(a.controllers[0].at,.72);a.$('ar-pause').click();assert(!a.controllers[0].paused);
 a.controllers[0].finish();await a.tick();assert.match(a.$('ar-status').textContent,/complete/);assert.equal(a.$('ar-frame-value').textContent,'100%');a.$('ar-play').click();await a.tick();assert.equal(a.calls.plays.length,2);assert.equal(a.calls.fetches.length,0);a.close();
});
test('Escape restores focus, cancels a late preview and preserves the filtered result',async()=>{
 const a=await fixture(),pending=held();a.choose('ar-type','gift');const card=a.open();await a.tick();
 a.model.preview=()=>pending.promise;a.$('ar-play').click();const event=new a.w.Event('cancel',{cancelable:true});a.$('ar-dialog').dispatchEvent(event);assert(!a.$('ar-dialog').open);assert.equal(a.d.activeElement,card);assert(event.defaultPrevented);
 let stops=0;pending.resolve({played:true,stop(){stops++;}});await a.tick();assert.equal(stops,1);assert.equal(a.$('ar-type').value,'gift');assert(!a.$('ar-status').textContent.includes('Playing once'));a.close();
});
test('A to B to A inspection ignores the earlier failed load and clears the closed stage',async()=>{
 const a=await fixture(),first=held();a.model.prepare=()=>first.promise;a.open();a.$('ar-close').click();assert(!a.$('ar-stage').childNodes.length);
 a.model.prepare=null;a.open('badge-test');await a.tick();a.$('ar-close').click();a.open();await a.tick();
 first.resolve({reason:'asset-unavailable'});await a.tick();assert.equal(a.$('ar-title').textContent,a.rows[0].name);assert.equal(a.$('ar-status').textContent,'Resting artwork');a.close();
});
(async()=>{let failed=0;for(const [name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${tests.length-failed}/${tests.length} public gallery interactions passed (jsdom, controlled player and native dialog methods).`);process.exitCode=failed?1:0;})();
