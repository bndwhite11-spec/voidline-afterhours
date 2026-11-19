'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/mobile.js'),'utf8'),tests=[],test=(name,run)=>tests.push([name,run]);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function fixture(options={}){
 const nodes=new Map(['vm-install-button','vm-installed','vm-status','vm-link'].map(id=>[id,{id,hidden:false,disabled:false,textContent:'',value:'',focus(){calls.focus++;},select(){calls.select++;}}])),listeners=new Map(),docListeners=new Map(),frames=[],styles=new Map(),root={dataset:{},style:{setProperty(k,v){styles.set(k,v);},removeProperty(k){styles.delete(k);}}},calls={copy:[],share:[],focus:0,select:0,extensions:[],requests:0};
 const on=(map,name,fn)=>{if(!map.has(name))map.set(name,[]);map.get(name).push(fn);};
 const media={matches:!!options.standalone,addEventListener(name,fn){on(listeners,'display-'+name,fn);}},viewport={height:800,offsetTop:0,scale:1,addEventListener(name,fn){on(listeners,'viewport-'+name,fn);}};
 const navigator={standalone:!!options.iosStandalone,clipboard:{async writeText(value){calls.copy.push(value);if(options.clipboardFailure)throw Error('No permission');}}};
 if(options.share)navigator.share=async value=>{calls.share.push(value);return options.share(value);};
 const document={documentElement:root,activeElement:null,getElementById:id=>nodes.get(id),addEventListener(name,fn){on(docListeners,name,fn);}};
 const window={innerWidth:390,innerHeight:800,visualViewport:viewport,matchMedia:()=>media,requestAnimationFrame(fn){frames.push(fn);},addEventListener(name,fn){on(listeners,name,fn);},VoidHome:{registerExtension(extension){calls.extensions.push(extension);}}};
 vm.runInNewContext(source,{window,document,navigator,location:{protocol:'https:',origin:'https://voidline.example'},URL,console});
 const emit=(name,event={})=>{for(const fn of listeners.get(name)||[])fn(event);};
 const focus=node=>{document.activeElement=node;for(const fn of docListeners.get(node?'focusin':'focusout')||[])fn({target:node});};
 const flush=()=>{while(frames.length)frames.shift()();};
 async function click(name){for(const fn of docListeners.get('click')||[])fn({target:{closest:()=>({dataset:{vm:name}})},preventDefault(){}});for(let i=0;i<12;i++)await Promise.resolve();}
 return{nodes,window,document,navigator,viewport,media,root,styles,calls,emit,focus,flush,click};
}
test('phone setup stays public and never triggers installation, notifications, account requests or caching on load',()=>{
 const f=fixture();assert.equal(f.nodes.get('vm-link').value,'https://voidline.example/');assert.equal(f.nodes.get('vm-install-button').hidden,true);assert.equal(f.calls.copy.length,0);assert.equal(f.calls.share.length,0);assert.equal(f.calls.extensions.length,1);assert.match(f.calls.extensions[0].accountHTML(),/href="\/install.html"/);assert.doesNotMatch(source,/requestPermission|serviceWorker\.register|caches\.|localStorage|sessionStorage|fetch\(/);
});
test('browser install event waits for a user click and duplicate clicks cannot open two prompts',async()=>{
 const choice=deferred(),f=fixture();let prevented=0,prompts=0;f.emit('beforeinstallprompt',{preventDefault(){prevented++;},async prompt(){prompts++;},userChoice:choice.promise});assert.equal(prevented,1);assert.equal(prompts,0);assert.equal(f.nodes.get('vm-install-button').hidden,false);await f.click('install');await f.click('install');assert.equal(prompts,1);choice.resolve({outcome:'accepted'});for(let i=0;i<12;i++)await Promise.resolve();assert.match(f.nodes.get('vm-status').textContent,/Installation requested/);assert.equal(f.nodes.get('vm-installed').hidden,true);f.emit('appinstalled');assert.equal(f.nodes.get('vm-installed').hidden,false);assert.match(f.nodes.get('vm-status').textContent,/was added/);
});
test('an actual installed event wins over a delayed dismissed prompt response',async()=>{
 const choice=deferred(),f=fixture();f.emit('beforeinstallprompt',{preventDefault(){},async prompt(){},userChoice:choice.promise});await f.click('install');f.emit('appinstalled');choice.resolve({outcome:'dismissed'});for(let i=0;i<12;i++)await Promise.resolve();assert.match(f.nodes.get('vm-status').textContent,/was added/);assert.equal(f.nodes.get('vm-install-button').hidden,true);
});
test('iOS standalone launch is recognized without claiming an install prompt is available',()=>{
 const f=fixture({iosStandalone:true});assert.equal(f.nodes.get('vm-installed').hidden,false);assert.equal(f.nodes.get('vm-install-button').hidden,true);assert.equal(f.window.VoidMobile.installed(),true);
});
test('clipboard success and denied permission produce different truthful results',async()=>{
 const good=fixture();await good.click('copy');assert.deepEqual(good.calls.copy,['https://voidline.example/']);assert.equal(good.nodes.get('vm-status').textContent,'App link copied.');const denied=fixture({clipboardFailure:true});await denied.click('copy');assert.equal(denied.calls.focus,1);assert.equal(denied.calls.select,1);assert.match(denied.nodes.get('vm-status').textContent,/Select and copy/);assert.doesNotMatch(denied.nodes.get('vm-status').textContent,/copied/);
});
test('native sharing passes only the public app link and cancellation never claims delivery',async()=>{
 const f=fixture({share:async()=>{throw Object.assign(Error('Canceled'),{name:'AbortError'});}});await f.click('share');assert.equal(f.calls.share.length,1);assert.equal(f.calls.share[0].url,'https://voidline.example/');assert.doesNotMatch(JSON.stringify(f.calls.share),/password|token|session|recovery/i);assert.equal(f.calls.copy.length,0);assert.equal(f.nodes.get('vm-status').textContent,'');const accepted=fixture({share:async()=>{}});await accepted.click('share');assert.match(accepted.nodes.get('vm-status').textContent,/handed to your sharing app/);assert.doesNotMatch(accepted.nodes.get('vm-status').textContent,/delivered|friend received/);
});
test('keyboard resize updates CSS without reading or replacing the native composer and resets after blur',()=>{
 const f=fixture(),input={tagName:'TEXTAREA',get value(){throw Error('Draft must not be read');}};f.focus(input);f.flush();f.viewport.height=460;f.emit('viewport-resize');f.flush();assert.equal(f.root.dataset.vmKeyboard,'true');assert.equal(f.styles.get('--vm-viewport-height'),'460px');assert.equal(f.styles.get('--vm-keyboard-offset'),'340px');assert.equal(f.document.activeElement,input);f.focus(null);f.flush();assert.equal(f.root.dataset.vmKeyboard,'false');f.viewport.height=800;f.emit('viewport-resize');f.flush();assert.equal(f.styles.get('--vm-viewport-height'),'800px');
});
test('Android content-resizing keyboards retain the pre-focus baseline',()=>{
 const f=fixture();f.focus({tagName:'INPUT',type:'text'});f.flush();f.window.innerHeight=420;f.viewport.height=420;f.emit('viewport-resize');f.flush();assert.equal(f.root.dataset.vmKeyboard,'true');assert.equal(f.styles.get('--vm-keyboard-offset'),'0px');assert.equal(f.styles.get('--vm-viewport-height'),'420px');
});
test('rotation changes the keyboard baseline and closing a landscape keyboard restores navigation while focus stays',()=>{
 for(const layoutResizes of [false,true]){const f=fixture();f.focus({tagName:'TEXTAREA'});f.flush();f.viewport.height=420;f.emit('viewport-resize');f.flush();assert.equal(f.root.dataset.vmKeyboard,'true');f.window.innerWidth=800;f.window.innerHeight=layoutResizes?200:390;f.viewport.height=200;f.emit('orientationchange');f.flush();assert.equal(f.root.dataset.vmKeyboard,'true');f.window.innerHeight=390;f.viewport.height=390;f.emit('viewport-resize');f.flush();assert.equal(f.root.dataset.vmKeyboard,'false');assert.equal(f.document.activeElement.tagName,'TEXTAREA');}
});
test('pinch zoom and desktop widths disable viewport overrides rather than disabling user zoom',()=>{
 const f=fixture();f.viewport.scale=1.5;f.viewport.height=400;f.emit('viewport-resize');f.flush();assert.equal(f.styles.has('--vm-viewport-height'),false);assert.equal(f.root.dataset.vmKeyboard,undefined);f.viewport.scale=1;f.window.innerWidth=1440;f.emit('resize');f.flush();assert.equal(f.styles.has('--vm-viewport-height'),false);
});
(async()=>{let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error);}}console.log(`${tests.length-failed}/${tests.length} mobile install/share/viewport checks passed. Controlled browser interfaces; actual Android/iOS installation, keyboard placement and sharing delivery are unverified.`);process.exitCode=failed?1:0;})();
