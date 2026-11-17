'use strict';
// Controlled DOM + published color-token checks; this is not browser/assistive-technology acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../dist/theme.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../dist/home.css'),'utf8');
const entryCSS=fs.readFileSync(path.join(__dirname,'../dist/entry.css'),'utf8');
const tests=[],test=(name,fn)=>tests.push([name,fn]);
function client({systemReduced=false,systemContrast=false,noBody=false,legacy=false,noMedia=false}={}){
  const nodes=[],listeners=new Map(),events=[],media=new Map();
  function node(parent=null){const classes=new Set(),value={parent,dataset:{},classList:{toggle(n,on){if(on)classes.add(n);else classes.delete(n);},contains:n=>classes.has(n)}};nodes.push(value);return value;}
  const html=node(),body=node(html),home=node(body),dialog=node(body),toast=node(body),profile=node(dialog),collection=node(dialog),viewer=node(body),menu=node(body);
  const document={documentElement:html,body:noBody?null:body,addEventListener:(name,fn)=>listeners.set(name,fn)};
  const window={dispatchEvent:e=>events.push(e),matchMedia:noMedia?undefined:query=>{const q={matches:query.includes('motion')?systemReduced:systemContrast,change:null};q[legacy?'addListener':'addEventListener']=legacy?fn=>q.change=fn:(_name,fn)=>q.change=fn;media.set(query,q);return q;}};
  const context={window,document,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}};vm.createContext(context);vm.runInContext(source,context);
  return {api:window.VoidTheme,html,body,home,dialog,toast,profile,collection,viewer,menu,events,document,media,
    attachBody(){document.body=body;listeners.get('DOMContentLoaded')?.();},
    system(name,matches){const q=[...media].find(([k])=>k.includes(name))[1];q.matches=matches;q.change?.();},
    inherited(node,key){for(let current=node;current;current=current.parent)if(current.dataset[key]!==undefined)return current.dataset[key];},
    inheritedClass(node,name){for(let current=node;current;current=current.parent)if(current.classList.contains(name))return true;return false;}};
}
function variables(block){return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6});/gi)].map(m=>[m[1],m[2]]));}
const tokens=variables(css.match(/:root \{([\s\S]*?)\n\}/)[1]);
function luminance(hex){const channels=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];}
function ratio(fg,bg){const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}

test('preferences inherit into the external dialog, profiles, gifts, media viewer, menu and toast',()=>{
 const app=client();app.api.apply({font:'19',highContrast:true,reducedMotion:true});
 assert.notEqual(app.dialog.parent,app.home);
 for(const surface of [app.home,app.dialog,app.toast,app.profile,app.collection,app.viewer,app.menu]){
  assert.equal(app.inherited(surface,'vhFont'),'19');assert.equal(app.inherited(surface,'vhMotion'),'reduce');assert.equal(app.inherited(surface,'vhContrast'),'more');
  assert(app.inheritedClass(surface,'vh-reduced-motion'));assert(app.inheritedClass(surface,'vh-high-contrast'));
 }
});
test('account reset clears the preceding account preferences without overriding OS preferences',()=>{
 const app=client({systemReduced:true});app.api.apply({font:'19',highContrast:true,reducedMotion:true});app.api.reset();
 for(const root of [app.html,app.body]){assert.equal(root.dataset.vhFont,'15');assert(!root.classList.contains('vh-high-contrast'));assert(root.classList.contains('vh-reduced-motion'));}
 assert.equal(app.api.state().reducedMotion,false);assert.equal(app.api.state().systemReducedMotion,true);
});
test('app reduced motion and OS reduced motion independently control every portal',()=>{
 for(const options of [{systemReduced:true},{}]){const app=client(options);if(!options.systemReduced)app.api.apply({reducedMotion:true});assert(app.inheritedClass(app.dialog,'vh-reduced-motion'));assert.equal(app.api.state().effectiveReducedMotion,true);}
 const app=client();app.system('motion',true);assert(app.html.classList.contains('vh-reduced-motion'));app.system('motion',false);assert(!app.html.classList.contains('vh-reduced-motion'));
 app.api.apply({reducedMotion:true});app.system('motion',false);assert(app.html.classList.contains('vh-reduced-motion'));
 assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none\s*!important/);
 assert.match(entryCSS,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
test('app high contrast and OS high contrast independently control all surfaces and live changes',()=>{
 for(const options of [{systemContrast:true},{}]){const app=client(options);if(!options.systemContrast)app.api.apply({highContrast:true});assert(app.inheritedClass(app.collection,'vh-high-contrast'));assert.equal(app.api.state().effectiveHighContrast,true);}
 const app=client();app.system('contrast',true);assert(app.html.classList.contains('vh-high-contrast'));app.system('contrast',false);assert(!app.html.classList.contains('vh-high-contrast'));
 assert.match(css,/@media\s*\(prefers-contrast:\s*more\)/);assert.match(css,/:root\.vh-high-contrast/);
});
test('only the supported text sizes and explicit booleans are accepted, without storage or account reads',()=>{
 const app=client();app.api.apply({font:'999',highContrast:'true',reducedMotion:1,account:'private'});assert.equal(app.api.state().font,'15');assert.equal(app.api.state().highContrast,false);assert.equal(app.api.state().reducedMotion,false);
 app.api.apply(null);assert.equal(app.api.state().font,'15');app.api.apply({font:17});assert.equal(app.api.state().font,'17');
 assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\(|account\.id|innerHTML/);
 const event=app.events.at(-1);assert.equal(event.type,'voidline:theme');assert.equal(event.detail.font,'17');assert(!('account' in event.detail));
});
test('preferences initialize before body exists, and media-query legacy/unavailable cases remain usable',()=>{
 const app=client({noBody:true,legacy:true});app.api.apply({font:'19'});app.attachBody();assert.equal(app.body.dataset.vhFont,'19');app.system('motion',true);assert(app.body.classList.contains('vh-reduced-motion'));
 const noMedia=client({noMedia:true});noMedia.api.apply({highContrast:true});assert(noMedia.html.classList.contains('vh-high-contrast'));
});
test('all normal text and link roles exceed 4.5:1 on each supported UI surface',()=>{
 for(const fg of ['--vh-text','--vh-copy','--vh-muted','--vh-accent'])for(const bg of ['--vh-bg','--vh-rail','--vh-side','--vh-surface','--vh-raised','--vh-selected','--vh-own-message'])assert(ratio(tokens[fg],tokens[bg])>=4.5,`${fg} / ${bg}: ${ratio(tokens[fg],tokens[bg])}`);
 assert(ratio(tokens['--vh-accent-ink'],tokens['--vh-accent'])>=4.5);assert(ratio(tokens['--vh-accent-ink'],tokens['--vh-accent-hover'])>=4.5);
 assert(ratio(tokens['--vh-danger'],tokens['--vh-danger-surface'])>=4.5);assert(ratio(tokens['--vh-success'],tokens['--vh-surface'])>=4.5);
});
test('high-contrast text and controls retain measurable contrast, including normal-sized modal text',()=>{
 const high={...tokens,...variables(css.match(/:root\.vh-high-contrast\s*\{([^}]+)\}/)[1])};
 for(const palette of [tokens,high])for(const bg of ['--vh-bg','--vh-side','--vh-surface','--vh-raised','--vh-selected']){
  assert(ratio(palette['--vh-muted'],palette[bg])>=4.5);assert(ratio(palette['--vh-control-line'],palette[bg])>=3);assert(ratio(palette['--vh-accent'],palette[bg])>=3);
 }
});
test('auth, message, modal and metadata sizes scale relatively without shrinking metadata below 12px',()=>{
 assert.match(css,/:root\[data-vh-font="17"\]\s*\{\s*--vl-text-scale:\s*1\.133/);assert.match(css,/:root\[data-vh-font="19"\]\s*\{\s*--vl-text-scale:\s*1\.266/);
 assert.doesNotMatch(css,/\.vh-app\[data-font=/);assert.doesNotMatch(css,/font(?:-size)?:\s*\d+px/);assert.doesNotMatch(entryCSS,/font-size:\s*\d+px/);
 for(const match of css.matchAll(/font-size:\s*calc\(([.\d]+)rem/g))assert(Number(match[1])>=.75,match[0]);
 assert.match(css,/\.vh-auth-card h1\s*\{[^}]*1\.875rem/);assert.match(css,/--vh-message-size:\s*calc\(\.9375rem/);
 for(const selector of ['.vh-dialog-body>h2','.vh-toast','.vh-field','.vh-message time'])assert(css.includes(selector));
});
test('Friends, Search, Saved and admin dialogs use the same scaled type and contrast tokens',()=>{
 for(const name of ['social.css','organize.css','admin.css']){
  const extension=fs.readFileSync(path.join(__dirname,'../dist/'+name),'utf8');
  assert.doesNotMatch(extension,/font(?:-size)?:\s*\d+px/,name+' fixed type');
  assert.doesNotMatch(extension,/#[0-9a-f]{3,8}\b/i,name+' hardcoded palette');
  assert.match(extension,/var\(--vl-text-scale,1\)/,name+' relative type');
  assert.match(extension,/var\(--vh-muted\)/,name+' secondary text');
  assert.match(extension,/@media\(pointer:coarse\)[\s\S]*min-height:44px/,name+' touch controls');
 }
});
test('narrow layouts choose one pane and bound dialogs; desktop sidebar is explicitly resizable',()=>{
 assert.match(css,/@media\s*\(max-width:\s*860px\)[\s\S]*\.vh-rail,\s*\.vh-sidebar,\s*\.vh-details\s*\{\s*display:\s*none/);
 assert.match(css,/\.vh-layout[^\n]*clamp\(260px,\s*var\(--vh-list-width\),\s*320px\)/);
 assert.match(css,/\.vh-sidebar-scroll\s*\{[^}]*min-height:\s*0[^}]*overflow-y:\s*auto/);
 assert.match(css,/\.vh-sidebar-resize:focus-visible/);assert.match(css,/\.vh-dialog\s*\{[^}]*calc\(100vw - 24px\)/);
 assert.match(css,/\.vh-conversation-header[^}]*flex-wrap:\s*wrap/);assert.match(css,/\.vh-form-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
 // Arithmetic only: these bounds leave positive interior width at target CSS-pixel sizes.
 for(const width of [320,375,390,768,859,860,861,1024,1199,1200,1201,1440]){const modal=Math.min(550,width-(width<=860?24:40));assert(modal>0&&modal<=width);if(width>860)assert(width-68-320>0);}
});
let failed=0;for(const[name,run]of tests){try{run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error);}}
const lowest=Math.min(...['--vh-text','--vh-copy','--vh-muted','--vh-accent'].flatMap(fg=>['--vh-bg','--vh-side','--vh-surface','--vh-raised','--vh-selected','--vh-own-message'].map(bg=>ratio(tokens[fg],tokens[bg]))));
console.log(`${tests.length-failed}/${tests.length} appearance checks passed; normal-text token minimum ${lowest.toFixed(2)}:1. Controlled DOM, token contrast and layout constraints; rendered browser, zoom, device and screen-reader behavior remain unverified.`);process.exitCode=failed?1:0;
