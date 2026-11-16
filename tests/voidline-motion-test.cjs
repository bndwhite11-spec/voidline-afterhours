'use strict';
// Deterministic lifecycle checks for the real motion policy and entrance modules.
// CSS completion events are simulated. This does not exercise browser rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const motionSource = fs.readFileSync(path.join(__dirname,'../dist/motion.js'),'utf8');
const entranceSource = fs.readFileSync(path.join(__dirname,'../dist/entrance.js'),'utf8');
const tests = [];
const test = (name,fn) => tests.push([name,fn]);
function harness({seen=false,appMotion=true,systemReduced=false,hiddenMembers=false,noStyles=false}={}) {
  let now=0,serial=0,document;
  const timers=new Map(),windowListeners=new Map(),documentListeners=new Map(),mediaListeners=[];
  const storage=new Map([['voidline.local.v1',JSON.stringify({settings:{motion:appMotion}})]]);
  if(seen)storage.set('voidline.entry.v2','1');
  const add=(map,type,fn,capture=false)=>{if(!map.has(type))map.set(type,[]);map.get(type).push({fn,capture:!!capture});};
  const remove=(map,type,fn)=>map.set(type,(map.get(type)||[]).filter(x=>x.fn!==fn));
  function node(tag='div',className='') {
    const classes=new Set(className.split(/\s+/).filter(Boolean)),attrs=new Map(),listeners=new Map();
    const n={tagName:tag.toUpperCase(),children:[],parentElement:null,dataset:{},inert:false,isConnected:true,hidden:false,listeners,
      classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle(x,force){const next=force===undefined?!classes.has(x):!!force;next?classes.add(x):classes.delete(x);return next;}},
      style:{values:new Map(),setProperty(k,v){this.values.set(k,v);}},
      setAttribute(k,v){attrs.set(k,String(v));},getAttribute:k=>attrs.get(k)??null,hasAttribute:k=>attrs.has(k),removeAttribute:k=>attrs.delete(k),
      append(...ns){ns.forEach(child=>{child.parentElement=n;child.isConnected=true;n.children.push(child);});},
      remove(){n.isConnected=false;if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);if(n.contains(document.activeElement))document.activeElement=document.body;},
      contains(target){return target===n||n.children.some(child=>child.contains(target));},
      focus(){document.activeElement=n;dispatchDocument('focusin',{target:n});},
      querySelector(selector){return all(n.children).find(x=>matches(x,selector))||null;},
      addEventListener(type,fn,capture){add(listeners,type,fn,capture);},removeEventListener(type,fn){remove(listeners,type,fn);},
      getClientRects(){return n.hidden?[]:[{width:100,height:100}];}
    };
    Object.defineProperty(n,'className',{get:()=>[...classes].join(' '),set:v=>{classes.clear();String(v).split(/\s+/).filter(Boolean).forEach(x=>classes.add(x));}});
    let html='';Object.defineProperty(n,'innerHTML',{get:()=>html,set(value){html=value;n.children=[];if(value.includes('class="ve-veil"'))n.append(node('div','ve-veil'),node('span','ve-phase-name'),node('button','ve-skip'));}});
    return n;
  }
  function all(list){return list.flatMap(n=>[n,...all(n.children)]);}
  function matches(n,s){return s.startsWith('.')?n.classList.contains(s.slice(1)):s.startsWith('#')?n.id===s.slice(1):n.tagName.toLowerCase()===s.toLowerCase();}
  document={body:node('body'),documentElement:node('html'),activeElement:null,createElement:tag=>node(tag),
    querySelector:selector=>all(document.body.children).find(n=>matches(n,selector))||null,
    addEventListener:(type,fn,capture)=>add(documentListeners,type,fn,capture),removeEventListener:(type,fn)=>remove(documentListeners,type,fn)};
  const title=node('header','titlebar'),shell=node('div','app-shell'),rail=node('nav','server-rail'),sidebar=node('aside','channel-sidebar'),conversation=node('main','conversation'),members=node('aside','members-sidebar'),launchButton=node('button','launch-button'),alreadyInert=node('div','already-inert');
  alreadyInert.inert=true;alreadyInert.setAttribute('inert','');members.hidden=hiddenMembers;
  shell.append(rail,sidebar,conversation,members);conversation.append(launchButton);document.body.append(title,shell,alreadyInert);document.activeElement=launchButton;
  const media={matches:systemReduced,addEventListener:(type,fn)=>mediaListeners.push(fn)};
  const mappings=new Map([[rail,['ve-rail-in','.4s','0s']],[sidebar,['ve-sidebar-in','.42s','.025s']],[conversation,['ve-client-in','.45s','.05s']],[members,['ve-members-in','.48s','.075s']],[title,['ve-header-in','.38s','.035s']]]);
  const window={matchMedia:()=>media,addEventListener:(type,fn)=>add(windowListeners,type,fn),dispatchEvent(event){(windowListeners.get(event.type)||[]).slice().forEach(({fn})=>fn(event));return true;},getComputedStyle(n){const [animationName,animationDuration,animationDelay]=!noStyles&&document.body.classList.contains('ve-client-reveal')&&mappings.has(n)?mappings.get(n):['none','0s','0s'];return {display:n.hidden?'none':'block',animationName,animationDuration,animationDelay,transitionDuration:!noStyles&&n.classList.contains('ve-veil')?'320ms':'0s'};}};
  function eventObject(props={}){return {defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},stopPropagation(){this.stopped=true;},...props};}
  function dispatchDocument(type,properties={}){const event=eventObject(properties);for(const {fn}of [...(documentListeners.get(type)||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){fn(event);if(event.stopped)break;}return event;}
  function dispatchNode(n,type,properties={}){const event=eventObject({target:n,...properties});for(const {fn}of [...(n.listeners.get(type)||[])]){fn(event);if(event.stopped)break;}if(!event.stopped)dispatchDocument(type,event);return event;}
  const context={window,document,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},setTimeout(fn,delay){timers.set(++serial,{fn,time:now+delay});return serial;},clearTimeout:id=>timers.delete(id),console};
  vm.createContext(context);vm.runInContext(motionSource,context,{filename:'motion.js'});vm.runInContext(entranceSource,context,{filename:'entrance.js'});
  function advance(ms){const target=now+ms;for(;;){const next=[...timers].filter(([,t])=>t.time<=target).sort((a,b)=>a[1].time-b[1].time)[0];if(!next)break;now=next[1].time;timers.delete(next[0]);next[1].fn();}now=target;}
  const entry=()=>document.querySelector('#voidline-entrance');
  const animate=(target,name)=>dispatchDocument('animationend',{target,animationName:name});
  function completeReveal({membersLast=true}={}){const current=entry();if(!current)return;dispatchNode(current.querySelector('.ve-veil'),'transitionend',{propertyName:'opacity'});for(const [target,[name]]of mappings){if(target===members&&membersLast)continue;if(!target.hidden)animate(target,name);}if(membersLast&&!members.hidden)animate(members,'ve-members-in');}
  return {window,document,storage,shell,alreadyInert,launchButton,title,rail,sidebar,conversation,members,timers,documentListeners,entry,advance,animate,completeReveal,dispatchDocument,dispatchNode,ready:()=>window.dispatchEvent({type:'voidline:ready'}),setSystemReduced(value){media.matches=value;mediaListeners.slice().forEach(fn=>fn({matches:value}));}};
}

test('first entrance keeps background inert until every actual reveal event settles',()=>{
  const h=harness();assert.equal(h.window.VoidMotion.enabled(),true);assert.equal(h.window.VoidEntrance.isPlaying(),true);assert.equal(h.shell.inert,true);assert.equal(h.alreadyInert.inert,true);assert.equal(h.document.activeElement.className,'ve-skip');
  h.ready();h.advance(1599);assert.equal(h.document.body.classList.contains('ve-client-reveal'),false);h.advance(1);assert.equal(h.document.body.classList.contains('ve-client-reveal'),true);
  h.dispatchNode(h.entry().querySelector('.ve-veil'),'transitionend',{propertyName:'opacity'});
  for(const [target,name]of [[h.rail,'ve-rail-in'],[h.sidebar,'ve-sidebar-in'],[h.conversation,'ve-client-in'],[h.title,'ve-header-in']])h.animate(target,name);
  h.advance(600);assert.equal(h.window.VoidEntrance.isPlaying(),true,'Do not truncate the final pending reveal with an arbitrary timer');h.animate(h.members,'unrelated-animation');assert.ok(h.entry());h.animate(h.members,'ve-members-in');
  assert.equal(h.window.VoidEntrance.isPlaying(),false);assert.equal(h.shell.inert,false);assert.equal(h.shell.hasAttribute('inert'),false);assert.equal(h.alreadyInert.inert,true);assert.equal(h.alreadyInert.hasAttribute('inert'),true);assert.equal(h.document.activeElement,h.launchButton);assert.equal(h.storage.get('voidline.entry.v2'),'1');assert.equal(h.document.body.classList.contains('ve-client-reveal'),false);h.advance(750);assert.equal(h.document.querySelector('.ve-welcome'),null);
  assert.equal((h.documentListeners.get('animationend')||[]).length,0,'Completion listeners should be removed');
});
test('first entrance missing completion events uses a bounded late fallback',()=>{const h=harness();h.ready();h.advance(2319);assert.ok(h.entry());h.advance(1);assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);});
test('returning entry ends at its 200ms animation event without a full cinematic',()=>{const h=harness({seen:true});h.ready();assert.equal(h.entry().classList.contains('ve-return'),true);h.advance(199);assert.ok(h.entry());h.advance(1);h.dispatchNode(h.entry(),'animationend',{animationName:'ve-return'});assert.equal(h.entry(),null);assert.equal(h.document.querySelector('.ve-welcome'),null);assert.equal(h.shell.inert,false);});
test('returning transition has a bounded 260ms fallback when CSS events are absent',()=>{const h=harness({seen:true});h.ready();h.advance(259);assert.ok(h.entry());h.advance(1);assert.equal(h.entry(),null);});
test('saved app motion off produces no initial overlay and Replay stays immediate',()=>{const h=harness({appMotion:false});assert.equal(h.window.VoidMotion.enabled(),false);assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);h.ready();assert.equal(h.window.VoidEntrance.replay(),false);assert.equal(h.entry(),null);assert.equal(h.timers.size,0);assert.equal(h.document.activeElement,h.launchButton);});
test('OS reduced motion overrides an enabled app preference and Replay',()=>{const h=harness({systemReduced:true});assert.equal(h.window.VoidMotion.enabled(),false);assert.equal(h.entry(),null);h.window.VoidMotion.setEnabled(true);h.ready();assert.equal(h.window.VoidEntrance.replay(),false);assert.equal(h.entry(),null);h.setSystemReduced(false);assert.equal(h.window.VoidMotion.enabled(),true);assert.equal(h.window.VoidEntrance.replay(),true);h.window.VoidEntrance.skip();});
test('changing app or OS policy mid-sequence immediately releases the client',()=>{const h=harness();h.ready();h.advance(500);h.window.VoidMotion.setEnabled(false);assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);assert.equal(h.document.body.classList.contains('reduce-motion'),true);assert.equal(h.window.VoidEntrance.replay(),false);h.window.VoidMotion.setEnabled(true);h.window.VoidEntrance.replay();assert.ok(h.entry());h.setSystemReduced(true);assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);h.advance(5000);assert.equal(h.document.querySelector('.ve-welcome'),null);});
test('skip/Escape restore focus and do not allow Cmd K or Cmd comma to open competing dialogs',()=>{const h=harness();let rootShortcuts=0;h.document.addEventListener('keydown',()=>rootShortcuts++);for(const key of ['k',',']){const event=h.dispatchDocument('keydown',{key,metaKey:true});assert.equal(event.defaultPrevented,true);}assert.equal(rootShortcuts,0);h.dispatchDocument('keydown',{key:'Tab'});assert.equal(h.document.activeElement.className,'ve-skip');const event=h.dispatchDocument('keydown',{key:'Escape'});assert.equal(event.defaultPrevented,true);assert.equal(rootShortcuts,0);assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);assert.equal(h.document.activeElement,h.launchButton);h.dispatchDocument('keydown',{key:'k',metaKey:true});assert.equal(rootShortcuts,1);h.advance(5000);assert.equal(h.entry(),null);assert.equal(h.document.querySelector('.ve-welcome'),null);});
test('readiness timeout releases background without marking a broken launch as seen',()=>{const h=harness();h.advance(1000);assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);assert.equal(h.storage.has('voidline.entry.v2'),false);h.ready();h.advance(4000);assert.equal(h.entry(),null);});
test('replay cleanup cannot leave old timers, inert state, or reusable SVG ID collisions',()=>{const h=harness({seen:true});h.ready();h.window.VoidEntrance.replay();assert.equal(h.entry().classList.contains('ve-running'),true);h.advance(700);h.window.VoidEntrance.replay();h.advance(1600);h.completeReveal();assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);assert.ok(h.window.VoidEntrance.markSVG('one').includes('id="one-chrome"'));assert.ok(h.window.VoidEntrance.markSVG('two').includes('id="two-chrome"'));assert.ok(!h.window.VoidEntrance.markSVG('<script>').includes('<script>'));h.advance(5000);assert.equal(h.timers.size,0);});
test('hidden mobile/member parts and absent styles do not hold entry unnecessarily',()=>{let h=harness({hiddenMembers:true});h.ready();h.advance(1600);h.completeReveal();assert.equal(h.entry(),null);h=harness({noStyles:true});h.ready();h.advance(1600);assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);});
test('same-origin storage preference updates share the same motion policy',()=>{const h=harness();h.ready();h.window.dispatchEvent({type:'storage',key:'voidline.local.v1',newValue:JSON.stringify({settings:{motion:false}})});assert.equal(h.window.VoidMotion.enabled(),false);assert.equal(h.entry(),null);assert.equal(h.shell.inert,false);});

let failures=0;
for(const [name,fn]of tests){try{fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`\n${tests.length-failures}/${tests.length} motion lifecycle checks passed. CSS events are simulated; browser visuals remain unverified.`);
process.exitCode=failures?1:0;
