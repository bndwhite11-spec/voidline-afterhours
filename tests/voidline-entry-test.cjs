'use strict';
// Entry lifecycle checks against the shipped script with a controlled DOM/clock.
// This does not establish browser rendering, animation smoothness or contrast.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../dist/entry.js'),'utf8');
const tests=[],test=(name,fn)=>tests.push([name,fn]);
function client(options={}) {
  let now=0,nextTimer=1,storageValue=options.seen?'1':null,writeCount=0;
  const timers=new Map(),nodes=new Map(),observers=[],docListeners=new Map(),winListeners=new Map();
  const listeners=(map,name,fn)=>{if(!map.has(name))map.set(name,new Set());map.get(name).add(fn);};
  const unlisten=(map,name,fn)=>map.get(name)?.delete(fn);
  function element(tag='div') {
    const attrs=new Map(),events=new Map(),classes=new Set();let id='',html='';
    const node={tagName:tag.toUpperCase(),children:[],parent:null,isConnected:true,inert:false,textContent:'',className:'',classList:{add:name=>classes.add(name),contains:name=>classes.has(name)},
      setAttribute:(key,value)=>attrs.set(key,String(value)),getAttribute:key=>attrs.get(key)??null,hasAttribute:key=>attrs.has(key),
      addEventListener:(name,fn)=>listeners(events,name,fn),emit:(name,event={})=>{for(const fn of events.get(name)||[])fn(event);},
      appendChild(child){child.parent=this;child.isConnected=true;this.children.push(child);},
      contains(child){return child===this||this.children.some(item=>item.contains(child));},
      focus(){document.activeElement=node;},
      remove(){node.isConnected=false;if(node.parent)node.parent.children=node.parent.children.filter(item=>item!==node);if(id)nodes.delete(id);},
      querySelector(selector){if(selector==='[data-ve-status]')return node.status;if(selector==='[data-ve-skip]')return node.skip;return null;}
    };
    Object.defineProperty(node,'id',{get:()=>id,set:value=>{id=value;nodes.set(value,node);}});
    Object.defineProperty(node,'innerHTML',{get:()=>html,set:value=>{html=String(value);if(html.includes('data-ve-status')){node.status=element('p');node.status.textContent='Opening Voidline…';node.appendChild(node.status);node.skip=element('button');node.appendChild(node.skip);}}});
    return node;
  }
  const body=element('body'),root=element(),main=element('main');root.id='home-root';main.id='home-main';root.appendChild(main);body.appendChild(root);root.inert=!!options.originalInert;root.setAttribute('aria-busy','true');
  const document={readyState:'loading',body,documentElement:{dataset:options.offline?{offline:'true'}:{}},activeElement:body,hidden:false,
    getElementById:id=>nodes.get(id)||null,createElement:element,addEventListener:(name,fn)=>listeners(docListeners,name,fn),removeEventListener:(name,fn)=>unlisten(docListeners,name,fn)};
  const window={VoidTheme:{state:()=>({effectiveReducedMotion:!!options.appReduced})},addEventListener:(name,fn)=>listeners(winListeners,name,fn),removeEventListener:(name,fn)=>unlisten(winListeners,name,fn),matchMedia:()=>({matches:!!options.reduced}),...(options.phase?{VoidHome:{state:{phase:options.phase,error:''}}}:{})};
  const emit=(map,name,event={})=>{for(const fn of [...map.get(name)||[]])fn(event);};
  const context={window,document,location:{protocol:options.file?'file:':'https:',pathname:options.pathname||'/',search:options.search||'',hash:options.hash||''},
    sessionStorage:{getItem(){if(options.storageThrows)throw Error('Storage unavailable');return storageValue;},setItem(_key,value){if(options.storageThrows)throw Error('Storage unavailable');storageValue=value;writeCount++;}},
    Date:{now:()=>now},setTimeout(fn,delay){const id=nextTimer++;timers.set(id,{at:now+delay,fn});return id;},clearTimeout:id=>timers.delete(id),
    MutationObserver:options.noObserver?undefined:class {constructor(fn){this.fn=fn;this.connected=false;observers.push(this);}observe(){this.connected=true;}disconnect(){this.connected=false;}},console};
  vm.createContext(context);vm.runInContext(source,context);
  const tick=duration=>{const end=now+duration;for(;;){const due=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;timers.delete(due[0]);now=due[1].at;due[1].fn();}now=end;};
  return {root,main,document,window,timers,observers,winListeners,docListeners,get writes(){return writeCount;},get overlay(){return nodes.get('voidline-entry');},get now(){return now;},start(){emit(docListeners,'DOMContentLoaded');},tick,
    ready(phase='welcome',error=''){window.VoidHome={state:{phase,error}};root.setAttribute('aria-busy',String(phase==='loading'));for(const observer of observers)if(observer.connected)observer.fn();},
    emitHome(){emit(winListeners,'voidline:home-ready');},theme(reduced){emit(winListeners,'voidline:theme',{detail:{effectiveReducedMotion:reduced}});},hide(){emit(winListeners,'pagehide');},focus(node){document.activeElement=node;emit(docListeners,'focusin',{target:node});},key(key){let prevented=false;emit(docListeners,'keydown',{key,preventDefault(){prevented=true;}});return prevented;}
  };
}

test('first entry is skippable, names no fake backend step and does not mistake bridge initialization for readiness',()=>{
  const app=client();app.start();assert(app.overlay);assert.equal(app.root.inert,true);assert.equal(app.writes,1);
  assert.match(app.overlay.innerHTML,/Skip intro/);assert.match(app.overlay.innerHTML,/role="status"/);assert.doesNotMatch(app.overlay.innerHTML,/role="progressbar"|[0-9]+%|encrypting|connecting devices/i);
  app.window.VoidHome={state:{phase:'loading',error:''}};app.emitHome();app.tick(559);assert(app.overlay);assert.equal(app.overlay.status.textContent,'Opening Voidline…');
});
test('actual account resolution permits the short reveal to finish and restores the underlying app',()=>{
  const app=client();app.start();app.tick(100);app.ready();assert.equal(app.overlay.status.textContent,'Ready when you are.');app.tick(459);assert(!app.overlay.classList.contains('ve-is-leaving'));app.tick(1);assert(app.overlay.classList.contains('ve-is-leaving'));app.tick(140);assert.equal(app.overlay,undefined);assert.equal(app.root.inert,false);assert.equal(app.document.activeElement,app.document.body);assert.equal(app.timers.size,0);
});
test('a real connection error removes the introduction immediately',()=>{
  const app=client();app.start();app.tick(10);app.ready('welcome','The connection could not finish.');assert.equal(app.overlay,undefined);assert.equal(app.root.inert,false);assert.equal(app.timers.size,0);
});
test('a slow or failed session transport cannot extend the brand reveal past 1190 milliseconds',()=>{
  const app=client();app.start();app.tick(1050);assert(app.overlay.classList.contains('ve-is-leaving'));assert.equal(app.overlay.status.textContent,'Opening Voidline…');app.tick(140);assert.equal(app.overlay,undefined);assert.equal(app.root.inert,false);assert.equal(app.now,1190);
});
test('Skip works immediately and moves keyboard focus to the current main content',()=>{
  const app=client();app.start();app.overlay.skip.focus();app.overlay.skip.emit('click');assert.equal(app.overlay,undefined);assert.equal(app.root.inert,false);assert.equal(app.document.activeElement,app.main);assert.equal(app.main.getAttribute('tabindex'),'-1');
});
test('Escape is available and focus may leave the intro without a trap or unwanted restoration',()=>{
  const app=client();app.start();app.overlay.skip.focus();assert.equal(app.key('Escape'),true);assert.equal(app.overlay,undefined);assert.equal(app.document.activeElement,app.main);
  const other=client();other.start();other.focus(other.main);assert.equal(other.overlay,undefined);assert.equal(other.document.activeElement,other.main);
});
test('returning sessions and reduced-motion users reach the ordinary app without an overlay',()=>{
  for(const options of [{seen:true},{reduced:true},{appReduced:true},{phase:'ready'}]){const app=client(options);app.start();assert.equal(app.overlay,undefined);assert.equal(app.root.inert,false);assert.equal(app.timers.size,0);assert.equal(app.writes,0);}
});
test('offline copies and authentication/recovery redirects skip the reveal entirely',()=>{
  for(const options of [{offline:true},{file:true},{pathname:'/api/auth/google/callback'},{hash:'#reset-password=private-token'},{hash:'#verify-email=private-token'},{search:'?code=provider-code'}]){const app=client(options);app.start();assert.equal(app.overlay,undefined);assert.equal(app.timers.size,0);}
});
test('a reduced-motion preference restored after account resolution removes an active intro immediately',()=>{
  const app=client();app.start();app.tick(100);app.theme(false);assert(app.overlay);app.theme(true);assert.equal(app.overlay,undefined);assert.equal(app.root.inert,false);assert.equal(app.timers.size,0);assert.equal(app.winListeners.get('voidline:theme')?.size,0);
});
test('unavailable storage and MutationObserver still leave the deadline intact',()=>{
  const app=client({storageThrows:true,noObserver:true});app.start();assert(app.overlay);app.tick(1190);assert.equal(app.overlay,undefined);assert.equal(app.root.inert,false);assert.equal(app.timers.size,0);
});
test('page navigation cleans up observers, listeners and timers without changing focus or pre-existing inert state',()=>{
  const app=client({originalInert:true});app.start();app.hide();assert.equal(app.overlay,undefined);assert.equal(app.root.inert,true);assert.equal(app.timers.size,0);assert(app.observers.every(observer=>!observer.connected));for(const name of ['keydown','focusin','visibilitychange'])assert.equal(app.docListeners.get(name)?.size,0);for(const name of ['pagehide','voidline:home-ready','voidline:theme'])assert.equal(app.winListeners.get(name)?.size,0);assert.equal(app.document.activeElement,app.document.body);
});

let failed=0;for(const[name,run]of tests){try{run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error);}}
console.log(`${tests.length-failed}/${tests.length} entry lifecycle checks passed. Controlled DOM/clock, not browser animation or mobile visual verification.`);
process.exitCode=failed?1:0;
