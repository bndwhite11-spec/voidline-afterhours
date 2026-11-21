'use strict';
// Actual startup watchdog and home entry, using controlled DOM/events/clock.
// These checks do not establish browser rendering or Android device acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../dist/startup.js'),'utf8');
const tests=[],test=(name,run)=>tests.push([name,run]);
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function client(options={}){
 let now=0,nextTimer=0;const timers=new Map(),observers=[],nodes=new Map(),documentListeners=new Map(),windowListeners=new Map(),calls={fetch:[],reload:0,entryDismiss:0,storage:0,cache:0};
 const listen=(map,name,fn)=>{if(!map.has(name))map.set(name,new Set());map.get(name).add(fn);};
 const unlisten=(map,name,fn)=>map.get(name)?.delete(fn);
 const emit=(map,name,event={})=>{for(const fn of [...map.get(name)||[]])fn(event);};
 function element(tag='div'){
  let id='',html='';const attributes=new Map(),classes=new Set(),listeners=new Map();
  const node={tagName:tag.toUpperCase(),nodeName:tag.toUpperCase(),dataset:{},hidden:false,disabled:false,isConnected:true,inert:false,children:[],parentNode:null,textContent:'',value:'',scrollTop:0,scrollHeight:1200,clientHeight:600,style:{setProperty(){},removeProperty(){}},classList:{add(name){classes.add(name);},remove(name){classes.delete(name);},contains:name=>classes.has(name),toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},
   setAttribute(name,value){attributes.set(name,String(value));if(name==='hidden')this.hidden=true;},getAttribute:name=>attributes.get(name)??null,hasAttribute:name=>attributes.has(name),removeAttribute(name){attributes.delete(name);if(name==='hidden')this.hidden=false;},
   appendChild(child){if(child.parentNode)child.remove();this.children.push(child);child.parentNode=this;child.isConnected=true;},append(...children){children.forEach(child=>this.appendChild(child));},remove(){this.isConnected=false;if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;},contains(child){return child===this||this.children.some(node=>node.contains(child));},
   addEventListener(name,fn){listen(listeners,name,fn);},removeEventListener(name,fn){unlisten(listeners,name,fn);},emit(name,event={}){emit(listeners,name,{target:this,...event});},focus(){document.activeElement=this;},showModal(){this.open=true;},close(){this.open=false;},querySelector(){return null;},querySelectorAll(){return[];},closest(selector){return selector==='#'+this.id||selector.toLowerCase()===this.tagName.toLowerCase()?this:null;}
  };
  Object.defineProperty(node,'id',{get:()=>id,set:value=>{id=value;nodes.set(id,node);}});
  Object.defineProperty(node,'innerHTML',{get:()=>html,set:value=>{html=String(value);for(const [,childId]of html.matchAll(/\bid="([^"]+)"/g)){if(childId===id)continue;const child=element();child.id=childId;child.parentNode=node;}for(const [,inputId,body]of html.matchAll(/id="([^"]+)"[^>]*>([^<]*)<\/textarea>/g)){const input=nodes.get(inputId);if(input)input.value=body;}}});
  return node;
 }
 const document={readyState:options.readyState||'loading',documentElement:element('html'),body:element('body'),activeElement:null,hidden:false,getElementById:id=>nodes.get(id)||null,createElement:element,querySelector(){return null;},querySelectorAll(){return[];},addEventListener(name,fn){listen(documentListeners,name,fn);},removeEventListener(name,fn){unlisten(documentListeners,name,fn);}};
 const root=element();root.id='home-root';root.setAttribute('aria-busy',options.resolved?'false':'true');root.innerHTML='<main id="home-main"><p>Opening Voidline…</p></main>';document.body.appendChild(root);
 const panel=element('section');panel.id='home-startup-recovery';panel.hidden=true;panel.textContent='VOIDLINE is still opening. You can retry or keep this page open.';document.body.appendChild(panel);
 const title=element('h1');title.id='home-startup-title';panel.appendChild(title);const copy=element('p');copy.id='home-startup-copy';panel.appendChild(copy);const retry=element('button');retry.id='home-startup-retry';panel.appendChild(retry);
 const location={protocol:'https:',origin:'https://voidline.example',pathname:'/',search:'',hash:options.hash||'',href:'https://voidline.example/'+(options.hash||''),reload(){calls.reload++;}};
 const window={location,innerWidth:390,innerHeight:800,addEventListener(name,fn){listen(windowListeners,name,fn);},removeEventListener(name,fn){unlisten(windowListeners,name,fn);},dispatchEvent(event){emit(windowListeners,event.type,event);},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>fn(),VoidEntry:{dismiss(){calls.entryDismiss++;if(options.entryThrows)throw Error('Decorative intro already detached');}}};
 const storage={getItem(){calls.storage++;throw Error('Storage must not be read by the watchdog');},setItem(){calls.storage++;throw Error('Storage must not be written by the watchdog');},removeItem(){calls.storage++;throw Error('Storage must not be cleared by the watchdog');}};
 const server={replies:new Map()};
 const fetch=async(url,request={})=>{calls.fetch.push({url,request});if(!options.home)throw Error('The startup watchdog must not request network data');if(server.replies.has(url))return await server.replies.get(url);const data=url==='/api/auth/config'?{configured:true,matrix:{configured:false},encryption:{available:false},google:{configured:false},email:{configured:false}}:{error:{code:'sign_in_required',message:'Log in'}};return{ok:url==='/api/auth/config',status:url==='/api/auth/config'?200:401,json:async()=>data};};
 class ClockDate extends Date{static now(){return now;}}
 const context={window,document,location,navigator:{},URL,URLSearchParams,AbortController,Blob,fetch,localStorage:storage,sessionStorage:storage,caches:{open(){calls.cache++;throw Error('No cache access');}},Date:ClockDate,Promise:options.noPromise?undefined:Promise,Event:class{constructor(type){this.type=type;}},setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{at:now+Math.max(0,Number(delay)||0),fn});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>1,clearInterval(){},requestAnimationFrame:fn=>fn(),console,
  MutationObserver:options.noObserver?undefined:class{constructor(callback){this.callback=callback;this.active=false;observers.push(this);}observe(target){this.target=target;this.active=true;}disconnect(){this.active=false;}}
 };
 vm.createContext(context);vm.runInContext(source,context);
 const notify=()=>{for(const observer of observers)if(observer.active)observer.callback([{target:root,type:'attributes',attributeName:'aria-busy'}]);};
 async function flush(){for(let i=0;i<80;i++)await Promise.resolve();notify();for(let i=0;i<20;i++)await Promise.resolve();}
 const tick=duration=>{const end=now+duration;for(let count=0;count<1000;count++){const due=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;timers.delete(due[0]);now=due[1].at;due[1].fn();}now=end;};
 return{context,window,document,root,panel,title,copy,retry,calls,timers,nodes,server,location,element,notify,flush,tick,
  start(){document.readyState='interactive';emit(documentListeners,'DOMContentLoaded',{target:document});notify();},
  error(event={}){emit(windowListeners,'error',{target:window,...event});emit(documentListeners,'error',{target:window,...event});},
  rejection(reason){emit(windowListeners,'unhandledrejection',{reason,target:window});},
  homeReady(){emit(windowListeners,'voidline:home-ready',{target:window});},
  resolve(){root.setAttribute('aria-busy','false');notify();},
  async clickRetry(){const event={target:retry,preventDefault(){}};retry.emit('click',event);emit(documentListeners,'click',event);await flush();},
  display(){return[panel.innerHTML,panel.textContent,title.textContent,copy.textContent].join(' ');},
  loadHome(){vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/home.js'),'utf8'),context);}
 };
}

test('the early watchdog is inert until a real problem and uses no account, network, cache or storage access',()=>{
 const app=client({noPromise:true});app.start();assert.equal(app.panel.hidden,true);assert.equal(app.calls.reload,0);assert.equal(app.calls.entryDismiss,0);assert.deepEqual(app.calls.fetch,[]);assert.equal(app.calls.storage,0);assert.equal(app.calls.cache,0);assert.doesNotMatch(source,/=>|\?\.|\?\?|\b(?:const|let|class|async|await)\b/);
});
test('failure to load the critical home script reveals safe recovery and dismisses an optional intro',()=>{
 for(const entryThrows of [false,true]){const app=client({entryThrows});app.start();const script=app.element('script');script.src='https://voidline.example/home.js?build=private-secret';app.error({target:script});assert.equal(app.panel.hidden,false);assert.ok(app.calls.entryDismiss>=1);assert.match(app.display(),/finish loading|could not load|couldn.t load/i);assert.doesNotMatch(app.display(),/private-secret|home\.js|https:/i);assert.equal(app.calls.reload,0);}
});
test('ordinary image and optional-extension resource failures do not replace an unresolved startup with a fatal panel',()=>{
 const app=client();app.start();for(const [tag,url]of [['img','https://voidline.example/missing.png'],['script','https://voidline.example/cosmetics.js']]){const target=app.element(tag);target.src=url;app.error({target});}assert.equal(app.panel.hidden,true);assert.equal(app.calls.reload,0);
});
test('global startup errors and rejected promises show only generic recovery copy without inspecting private reasons',()=>{
 const secret='private-fragment-and-token',app=client({hash:'#reset-password='+secret});app.start();app.error({message:'Failure '+secret,filename:'https://voidline.example/?token='+secret,error:Error(secret)});assert.equal(app.panel.hidden,false);assert.doesNotMatch(app.display(),new RegExp(secret));assert.doesNotMatch(app.display(),/reset-password|https:/i);
 const other=client(),reason={private:secret};Object.defineProperty(reason,'message',{get(){throw Error('The watchdog must not inspect rejection messages');}});other.start();other.rejection(reason);assert.equal(other.panel.hidden,false);assert.doesNotMatch(other.display(),new RegExp(secret));
});
test('a slow startup gets a nonfatal 35-second recovery option and late healthy rendering clears it',()=>{
 const app=client();app.start();app.tick(34999);assert.equal(app.panel.hidden,true);app.tick(1);assert.equal(app.panel.hidden,false);assert.match(app.display(),/Still opening/i);assert.match(app.display(),/keep.*(?:open|waiting)|continue waiting/i);assert.equal(app.calls.reload,0);const root=app.root;app.resolve();assert.equal(app.panel.hidden,true);assert.equal(app.document.getElementById('home-root'),root);assert.equal(app.timers.size,0);app.tick(70000);assert.equal(app.panel.hidden,true);
});
test('a home bridge phase alone cannot certify startup and late errors cannot cover a resolved login or account',()=>{
 const app=client();app.start();app.window.VoidHome={state:{phase:'ready'}};app.homeReady();app.tick(35000);assert.equal(app.panel.hidden,false);app.resolve();app.error({message:'Late optional script failure'});app.rejection(Error('Late rejected optional work'));assert.equal(app.panel.hidden,true);assert.equal(app.calls.reload,0);
 const already=client({resolved:true});already.start();already.tick(35000);already.error({message:'Late failure'});assert.equal(already.panel.hidden,true);
});
test('resolution checks also work through home-ready and DOMContentLoaded when MutationObserver is unavailable',()=>{
 const app=client({noObserver:true});app.start();app.tick(35000);assert.equal(app.panel.hidden,false);app.root.setAttribute('aria-busy','false');app.homeReady();assert.equal(app.panel.hidden,true);assert.equal(app.timers.size,0);
 const beforeDOM=client({noObserver:true});beforeDOM.root.setAttribute('aria-busy','false');beforeDOM.start();beforeDOM.tick(35000);assert.equal(beforeDOM.panel.hidden,true);
});
test('an explicit retry uses the existing home bridge and retains a bounded deadline while it works',async()=>{
 const app=client(),held=deferred();let reloads=0;app.window.VoidHome={reload(){reloads++;return held.promise;}};app.start();app.tick(35000);assert.equal(app.panel.hidden,false);await app.clickRetry();assert.equal(reloads,1);assert.equal(app.calls.reload,0);assert.equal(app.panel.hidden,true);app.tick(34999);assert.equal(app.panel.hidden,true);app.tick(1);assert.equal(app.panel.hidden,false);app.resolve();held.resolve();await app.flush();assert.equal(app.panel.hidden,true);
});
test('a thrown or rejected retry returns safe recovery without exposing its error',async()=>{
 for(const rejected of [false,true]){const app=client({hash:'#verify-email=retry-private'});app.window.VoidHome={reload(){if(rejected)return Promise.reject(Error('retry-private'));throw Error('retry-private');}};app.start();app.tick(35000);await app.clickRetry();assert.equal(app.panel.hidden,false);assert.match(app.display(),/finish loading|could not load|couldn.t load/i);assert.doesNotMatch(app.display(),/retry-private|verify-email/);assert.equal(app.calls.reload,0);}
});
test('a late rejected retry cannot replace a healthy screen that rendered while it was pending',async()=>{
 const app=client(),held=deferred();app.window.VoidHome={reload:()=>held.promise};app.start();app.tick(35000);await app.clickRetry();app.resolve();held.reject(Error('Late optional rejection with private details'));await app.flush();assert.equal(app.panel.hidden,true);assert.equal(app.timers.size,0);assert.doesNotMatch(app.display(),/private details/);
});
test('retry without a home bridge reloads the page only after the user requests it',async()=>{
 const app=client();app.start();app.tick(35000);assert.equal(app.calls.reload,0);await app.clickRetry();assert.equal(app.calls.reload,1);assert.equal(app.calls.fetch.length,0);assert.equal(app.calls.storage,0);assert.equal(app.calls.cache,0);
});
test('the actual guest home entry resolves startup into login and remains usable after the watchdog deadline',async()=>{
 const app=client({home:true});app.loadHome();app.start();await app.flush();assert.equal(app.window.VoidHome.state.phase,'welcome');assert.equal(app.root.getAttribute('aria-busy'),'false');assert.match(app.root.innerHTML,/Log in/);assert.equal(app.panel.hidden,true);app.tick(35000);assert.equal(app.panel.hidden,true);assert.equal(app.document.getElementById('home-root'),app.root);assert.deepEqual(app.calls.fetch.map(call=>call.url),['/api/auth/config','/api/auth/session']);
});
test('independent configuration and session reads overlap, keep their original requests and resolve before the nonfatal watchdog',async()=>{
 const app=client({home:true}),config=deferred(),session=deferred();app.server.replies.set('/api/auth/config',config.promise);app.server.replies.set('/api/auth/session',session.promise);app.loadHome();app.start();await app.flush();const root=app.root,initialMarkup=root.innerHTML;assert.equal(app.window.VoidHome.state.phase,'loading');assert.deepEqual(app.calls.fetch.map(call=>call.url),['/api/auth/config','/api/auth/session']);app.tick(7000);assert.equal(app.panel.hidden,true);assert.equal(root.innerHTML,initialMarkup);assert.equal(app.calls.fetch[0].request.signal.aborted,false);
 config.resolve({ok:true,status:200,json:async()=>({configured:true,matrix:{configured:false},encryption:{available:false},google:{configured:false},email:{configured:false}})});await app.flush();assert.equal(app.calls.fetch.length,2);app.tick(7000);assert.equal(app.panel.hidden,true);assert.equal(app.calls.fetch[1].request.signal.aborted,false);assert.equal(app.calls.reload,0);session.resolve({ok:false,status:401,json:async()=>({error:{code:'sign_in_required',message:'Log in'}})});await app.flush();app.tick(7000);assert.equal(app.panel.hidden,true);assert.equal(app.window.VoidHome.state.phase,'welcome');assert.match(root.innerHTML,/Log in/);assert.equal(app.document.getElementById('home-root'),root);assert.equal(app.calls.fetch.length,2);
});
test('the public entry includes the early watchdog and static recovery outside the replaceable home root',()=>{
 const index=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8'),startup=index.indexOf('src="/startup.js"'),home=index.indexOf('src="/home.js"'),root=index.match(/<div\b[^>]*\bid="home-root"[^>]*>[\s\S]*?<\/div>/)?.[0];assert.ok(startup>=0&&startup<home);assert.match(index,/id="home-startup-recovery"[^>]*hidden|hidden[^>]*id="home-startup-recovery"/);assert.match(index,/id="home-startup-retry"/);assert.match(index,/href="\/startup\.css"/);assert.ok(root);assert.doesNotMatch(root,/home-startup-recovery/);assert.ok(index.indexOf('id="home-startup-recovery"')>index.indexOf(root)+root.length);
});

(async()=>{let failed=0;for(const[name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}console.log(`${tests.length-failed}/${tests.length} startup recovery checks passed. Actual scripts with controlled DOM, events and clock; no browser or Android-device acceptance.`);process.exitCode=failed?1:0;})();
