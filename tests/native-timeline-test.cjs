'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/native-timeline.js'),'utf8'),tests=[],test=(name,run)=>tests.push([name,run]);
function setup(){
 let selection=null,nextFrame=0;const frames=new Map(),document={activeElement:null};
 class Node{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.dataset={};this.style={};this.attributes=[];this.children=[];this.parentNode=null;this.listeners=new Map();this.className='';this.innerHTML='';this.media=[];this.height=80;}
  setAttribute(name,value){const found=this.attributes.find(a=>a.name===name);if(found)found.value=String(value);else this.attributes.push({name,value:String(value)});if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  appendChild(node){this.insertBefore(node,null);return node;}
  insertBefore(node,before){if(node===before)return;node.remove();const index=before?this.children.indexOf(before):-1;this.children.splice(index<0?this.children.length:index,0,node);node.parentNode=this;}
  remove(){if(this.parentNode){const index=this.parentNode.children.indexOf(this);if(index>=0)this.parentNode.children.splice(index,1);this.parentNode=null;}}
  replaceChildren(...nodes){for(const node of [...this.children])node.remove();nodes.forEach(node=>this.appendChild(node));}
  get childNodes(){return this.children;}get firstChild(){return this.children[0]||null;}get nextSibling(){return this.parentNode?.children[this.parentNode.children.indexOf(this)+1]||null;}
  contains(node){return node===this||this.children.some(child=>child.contains(node))||this.media.includes(node);}
  querySelectorAll(selector){return selector==='audio,video'?this.media:[];}querySelector(){return null;}
  addEventListener(name,callback){this.listeners.set(name,callback);}removeEventListener(name){this.listeners.delete(name);}emit(name){this.listeners.get(name)?.();}
  getBoundingClientRect(){if(this===feed)return{top:0,bottom:feed.clientHeight,height:feed.clientHeight};const index=this.parentNode?.children.indexOf(this)??-1,top=index<0?0:this.parentNode.children.slice(0,index).reduce((sum,node)=>sum+node.actualHeight,0)-feed.scrollTop;return{top,bottom:top+this.actualHeight,height:this.actualHeight};}
  get actualHeight(){return this.className==='vh-timeline-spacer'?parseFloat(this.style.height)||0:this.height;}
  focus(){document.activeElement=this;}scrollIntoView({block}={}){const rect=this.getBoundingClientRect();feed.scrollTop+=rect.top-(block==='center'?feed.clientHeight/2-this.actualHeight/2:0);}
 }
 const feed=new Node();feed.clientHeight=600;let scrollTop=0;Object.defineProperties(feed,{scrollHeight:{get:()=>feed.children.reduce((sum,node)=>sum+node.actualHeight,0)},scrollTop:{get:()=>scrollTop,set:value=>scrollTop=Math.max(0,Math.min(value,Math.max(0,feed.scrollHeight-feed.clientHeight)))}});
 document.createElement=tag=>{if(tag!=='template')return new Node(tag);const template={content:{firstElementChild:null}};Object.defineProperty(template,'innerHTML',{set:html=>{const node=new Node(/^<([a-z]+)/.exec(html)[1]);node.outerHTML=html;node.innerHTML=html;for(const match of html.matchAll(/([\w-]+)="([^"]*)"/g))node.setAttribute(match[1],match[2]);node.height=Number(node.dataset.height)||80;template.content.firstElementChild=node;}});return template;};
 const context={window:{getSelection:()=>selection},document,WeakMap,Map,Set,requestAnimationFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};vm.createContext(context);vm.runInContext(source,context);
 return{api:context.window.VoidNativeTimeline,feed,document,select:value=>selection=value,flush(){for(let i=0;i<10&&frames.size;i++){const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn());}},Node};
}
const items=(count,start=0)=>Array.from({length:count},(_,i)=>({key:'message:'+(start+i),html:`<article data-native-key="message:${start+i}" data-native-message="${start+i}" data-height="80"><p>Message ${start+i}</p></article>`}));
test('ten thousand records mount a bounded variable-height window with real top and bottom spacers',()=>{
 const app=setup(),controller=app.api.update(app.feed,items(10000));assert.ok(controller.stats().mounted<60);assert.equal(controller.stats().total,10000);assert.ok(parseFloat(app.feed.children[0].style.height)>700000);app.feed.scrollTop=400000;app.feed.emit('scroll');app.flush();assert.ok(controller.stats().mounted<60);assert.ok(parseFloat(app.feed.children.at(-1).style.height)>300000);assert.ok(app.feed.children.some(node=>node.dataset.nativeMessage&&Number(node.dataset.nativeMessage)>4000&&Number(node.dataset.nativeMessage)<6000));
});
test('reading position remains anchored through incoming messages and prepended earlier history',()=>{
 const app=setup(),rows=items(1000,100),controller=app.api.update(app.feed,rows);app.feed.scrollTop=40000;app.feed.emit('scroll');app.flush();const visible=app.feed.children.find(node=>node.dataset.nativeKey&&node.getBoundingClientRect().bottom>0),key=visible.dataset.nativeKey,offset=visible.getBoundingClientRect().top;controller.update([...rows,...items(5,1100)]);const after=app.feed.children.find(node=>node.dataset.nativeKey===key);assert.equal(after,visible);assert.equal(after.getBoundingClientRect().top,offset);controller.update([...items(100),...rows,...items(5,1100)]);const prepended=app.feed.children.find(node=>node.dataset.nativeKey===key);assert.equal(prepended,visible);assert.equal(prepended.getBoundingClientRect().top,offset);
});
test('following latest stays bottom-anchored and exact reply navigation mounts the requested record',()=>{
 const app=setup(),rows=items(1000),controller=app.api.update(app.feed,rows);assert.equal(app.feed.scrollTop,app.feed.scrollHeight-app.feed.clientHeight);controller.update([...rows,...items(2,1000)]);assert.equal(app.feed.scrollTop,app.feed.scrollHeight-app.feed.clientHeight);assert.equal(controller.jump('message:22'),true);const target=app.feed.children.find(node=>node.dataset.nativeMessage==='22');assert.ok(target);assert.equal(app.document.activeElement,target);assert.ok(target.getBoundingClientRect().top>=0&&target.getBoundingClientRect().bottom<=app.feed.clientHeight);
});
test('focused and selected message nodes stay attached and unchanged while the nearby window advances',()=>{
 const app=setup(),rows=items(1000),controller=app.api.update(app.feed,rows);app.feed.scrollTop=30000;app.feed.emit('scroll');app.flush();const protectedNode=app.feed.children.find(node=>node.dataset.nativeMessage);protectedNode.focus();const selected={isCollapsed:false,anchorNode:protectedNode,focusNode:protectedNode};app.select(selected);app.feed.scrollTop+=900;app.feed.emit('scroll');app.flush();controller.update([...rows,...items(1,1000)]);assert.equal(protectedNode.parentNode,app.feed);assert.equal(app.document.activeElement,protectedNode);assert.equal(app.feed.children.find(node=>node.dataset.nativeKey===protectedNode.dataset.nativeKey),protectedNode);
});
test('offscreen nodes detach and cache remains bounded; active media stays attached until paused',()=>{
 const app=setup(),rows=items(3000),controller=app.api.update(app.feed,rows);const mediaNode=app.feed.children.find(node=>node.dataset.nativeMessage);mediaNode.media=[{paused:false,currentTime:13}];app.feed.scrollTop-=900;app.feed.emit('scroll');app.flush();assert.equal(mediaNode.parentNode,app.feed);mediaNode.media[0].paused=true;for(let position=0;position<200000;position+=2000){app.feed.scrollTop=position;app.feed.emit('scroll');app.flush();}assert.ok(controller.stats().cached<=500);assert.ok(controller.stats().mounted<70);assert.equal(mediaNode.parentNode,null);controller.destroy();assert.ok(!app.feed.listeners.has('scroll'));
});
(async()=>{let passed=0;for(const[name,run]of tests)try{await run();passed++;console.log('PASS '+name);}catch(error){console.error('FAIL '+name+'\n'+error.stack);}console.log(`${passed}/${tests.length} controlled variable-height DOM checks. Browser layout/selection/media-device acceptance remains separate.`);process.exitCode=passed===tests.length?0:1;})();
