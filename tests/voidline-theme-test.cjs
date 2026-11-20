'use strict';
// Controlled DOM + published color-token checks; this is not browser/assistive-technology acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../dist/theme.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../dist/home.css'),'utf8');
const entryCSS=fs.readFileSync(path.join(__dirname,'../dist/entry.css'),'utf8');
const tests=[],test=(name,fn)=>tests.push([name,fn]);
function client({systemReduced=false,systemContrast=false,noBody=false,legacy=false,noMedia=false}={}){
  const nodes=[],listeners=new Map(),events=[],media=new Map();
  function node(parent=null){const classes=new Set(),properties=new Map(),value={parent,isConnected:true,dataset:{},
    style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k),getPropertyValue:k=>properties.get(k)||''},classList:{toggle(n,on){if(on)classes.add(n);else classes.delete(n);},contains:n=>classes.has(n)}};nodes.push(value);return value;}
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
 assert.match(css,/\.vh-auth-card h1\s*\{[^}]*1\.875rem/);assert.match(css,/--vh-message-size:\s*calc\(1rem/);
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
test('presets, user colors and density normalize independently while older preferences retain defaults',()=>{
 const {api}=client();
 assert.deepEqual({...api.normalize({palette:'custom',background:' #aBc ',accent:'#F3D40a',density:'compact',font:17})},{
  ...api.defaults,palette:'custom',background:'#aabbcc',accent:'#f3d40a',density:'compact',font:'17'
 });
 for(const payload of [{palette:['midnight']},{background:'url(https://example.invalid)'},{accent:'var(--any)'},{density:'tight'},{palette:'__proto__'},{font:{toString:0,valueOf:0}}]) {
  assert.deepEqual({...api.normalize(payload)},{...api.defaults});
 }
 assert.deepEqual({...api.normalize({font:'19',reducedMotion:true})},{...api.defaults,font:'19',reducedMotion:true});
});
test('custom surfaces, exact chosen fills, corrected text and control edges retain contrast at color extremes',()=>{
 const app=client(),value=k=>app.html.style.getPropertyValue(k)||tokens[k];
 const backgrounds=['#000000','#ffffff','#777777','#757575','#8a638c','#ff0088','#00ff00','#0000ff','#303040','#d0b4a3'];
 const accents=['#000000','#ffffff','#777777','#770011','#00ffee','#c5b5b0','#0000ff','#242424'];
 for(const bg of backgrounds)for(const accent of accents){
  app.api.apply({palette:'custom',background:bg,accent});
  assert.equal(value('--vh-bg'),bg); assert.equal(value('--vh-button-bg'),accent);
  const surfaces=['--vh-bg','--vh-rail','--vh-side','--vh-surface','--vh-raised','--vh-selected','--vh-own-message','--vh-danger-surface'].map(value);
  for(const surface of surfaces){
   for(const key of ['--vh-text','--vh-copy','--vh-muted','--vh-accent','--vh-danger','--vh-success']){
    assert(ratio(value(key),surface)>=4.5,`${key} / ${surface} for ${bg}, ${accent}`);
   }
   assert(ratio(value('--vh-control-line'),surface)>=3);
   // Either the fill itself or its visible edge distinguishes the control.
   assert(Math.max(ratio(value('--vh-button-bg'),surface),ratio(value('--vh-button-edge'),surface))>=3);
  }
  for(const [label,fills] of [['--vh-button-ink',['--vh-button-bg','--vh-button-hover']],['--vh-accent-ink',['--vh-accent','--vh-accent-hover']]]){
   for(const fill of fills) assert(ratio(value(label),value(fill))>=4.5,`${label}/${fill} for ${bg}, ${accent}`);
  }
 }
});
test('the dialog preview renders draft-only colors, font and density and can show original defaults over a customized app',()=>{
 const app=client();app.api.apply({palette:'midnight',accent:'#2377cc',font:'19',density:'compact'});
 const count=app.events.length,prior=app.html.style.getPropertyValue('--vh-bg');
 const result=app.api.preview(app.profile,{palette:'custom',background:'#fafafa',accent:'#712a7a',font:'17'});
 assert.equal(result.accent,'#712a7a');assert.equal(app.profile.dataset.vhDensity,'comfortable');
 assert.equal(app.profile.dataset.vhTone,'light');assert.equal(app.profile.style.getPropertyValue('--vh-bg'),'#fafafa');
 assert.equal(app.profile.style.getPropertyValue('--vl-text-scale'),String(17/15));
 assert.equal(app.events.length,count);assert.equal(app.html.style.getPropertyValue('--vh-bg'),prior);
 app.api.preview(app.profile,{});assert.equal(app.profile.style.getPropertyValue('--vh-bg'),'');assert.equal(app.profile.dataset.vhThemePreview,'');
 assert.match(css,/\[data-vh-theme-preview\], :root \{/);
 assert.equal(app.api.state().palette,'midnight');assert.equal(app.api.state().font,'19');
 app.api.preview(app.html,{accent:'#000000'});assert.equal(app.html.style.getPropertyValue('--vh-bg'),prior);
});
test('high contrast supersedes personal colors in the app and an open draft, then restores each independently',()=>{
 const app=client();
 app.api.apply({palette:'forest',accent:'#f7a',density:'compact'});
 app.api.preview(app.profile,{palette:'custom',accent:'#000',background:'#eee'});
 app.system('contrast',true);
 for(const node of [app.html,app.profile]){
  assert.equal(node.style.getPropertyValue('--vh-bg'),'');assert.equal(node.style.getPropertyValue('--vh-button-bg'),'');
  assert.equal(node.dataset.vhContrast,'more');assert.equal(node.dataset.vhTone,'dark');
 }
 app.system('contrast',false);
 assert.equal(app.html.style.getPropertyValue('--vh-bg'),app.api.palettes.forest);
 assert.equal(app.profile.style.getPropertyValue('--vh-bg'),'#eeeeee');
 app.api.reset();assert.equal(app.html.style.getPropertyValue('--vh-button-bg'),'');assert.equal(app.body.dataset.vhDensity,'comfortable');
 assert.equal(app.api.state().accent,app.api.defaults.accent);
});
test('compact density covers both actual message feeds and keeps coarse-pointer navigation at 44px',()=>{
 const density=fs.readFileSync(path.join(__dirname,'../dist/appearance.css'),'utf8');
 for(const selector of ['.vh-feed .vh-message','.vh-feed-direct .vh-message>div','#home-secure-feed .vh-message>div','.vh-nav-item']) assert(density.includes(selector),selector);
 assert.match(density,/@media \(pointer:coarse\)\s*\{[^}]*min-height:44px/);
 assert.match(density,/\.vh-primary \{[^}]*var\(--vh-button-bg\)/);
});
test('app controls and draft previews resolve independent published CSS values and update the browser theme color',()=>{
 const {JSDOM,VirtualConsole}=require('jsdom');
 const logs=[],vc=new VirtualConsole();vc.on('jsdomError',error=>logs.push(error.message));
 const dom=new JSDOM('<!doctype html><meta name="theme-color" content="#0e1013"><button class="vh-primary" id="outside">Send</button><section id="sample"><button class="vh-primary">Preview</button></section>',{runScripts:'outside-only',virtualConsole:vc});
 try{
  const w=dom.window,d=w.document,contrastListeners=new Map();
  w.matchMedia=query=>({matches:false,addEventListener:(_name,fn)=>contrastListeners.set(query,fn)});
  for(const text of [css,fs.readFileSync(path.join(__dirname,'../dist/appearance.css'),'utf8')]){const sheet=d.createElement('style');sheet.textContent=text;d.head.append(sheet);}
  w.eval(source);w.VoidTheme.apply({palette:'custom',background:'#ededef',accent:'#2030a0',density:'compact'});
  const sample=d.getElementById('sample'),applied=d.getElementById('outside'),draft=sample.firstElementChild;
  w.VoidTheme.preview(sample,{});
  assert.equal(d.querySelector('meta').content,'#ededef');
  assert.equal(w.getComputedStyle(applied).backgroundColor,'rgb(32, 48, 160)');
  assert.equal(w.getComputedStyle(draft).backgroundColor,'rgb(203, 239, 132)');
  assert.equal(w.getComputedStyle(draft).color,'rgb(23, 32, 14)');
  w.VoidTheme.apply({palette:'custom',background:'#ededef',accent:'#2030a0',highContrast:true});
  assert.equal(w.getComputedStyle(applied).backgroundColor,'rgb(221, 247, 173)');
  assert.equal(w.getComputedStyle(draft).backgroundColor,'rgb(203, 239, 132)');
  w.VoidTheme.reset();
  assert.equal(w.getComputedStyle(applied).backgroundColor,'rgb(203, 239, 132)');
  assert.equal(d.querySelector('meta').content,'#0e1013');assert.deepEqual(logs,[]);
 }finally{dom.window.close();}
});
let failed=0;for(const[name,run]of tests){try{run();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name,error);}}
const lowest=Math.min(...['--vh-text','--vh-copy','--vh-muted','--vh-accent'].flatMap(fg=>['--vh-bg','--vh-side','--vh-surface','--vh-raised','--vh-selected','--vh-own-message'].map(bg=>ratio(tokens[fg],tokens[bg]))));
console.log(`${tests.length-failed}/${tests.length} appearance checks passed; normal-text token minimum ${lowest.toFixed(2)}:1. Controlled DOM, token contrast and layout constraints; rendered browser, zoom, device and screen-reader behavior remain unverified.`);process.exitCode=failed?1:0;
