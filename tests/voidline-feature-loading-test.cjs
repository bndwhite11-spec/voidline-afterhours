'use strict';
// Exercise the actual parser entry, extension registration and feature controls
// with an in-memory asset server and isolated account responses.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole, requestInterceptor} = require('jsdom');

const dist = path.join(__dirname, '../dist');
const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const account = {id:'example-a', username:'example_a', displayName:'Example A', avatar:'moon', needsOnboarding:false};
const session = {account, session:{id:'example-session'}, authentication:{methods:['password']}, csrfToken:'fixture'};

function fixture({signedIn=false, fail=null, wait=null, route=''}={}) {
  const assets = [], calls = [], errors = [];
  let failed = false, release;
  const pending = new Promise(resolve => { release = resolve; });
  const console = new VirtualConsole();
  console.on('jsdomError', error => {
    if (!['not-implemented','css-parsing','resource-loading'].includes(error.type)) errors.push(error);
  });
  const dom = new JSDOM(index, {
    url:'https://fixture.invalid/chats'+route,
    pretendToBeVisual:true, runScripts:'dangerously', virtualConsole:console,
    resources:{interceptors:[requestInterceptor(async request => {
      const name = new URL(request.url).pathname;
      assets.push(name);
      if (name === fail && !failed) { failed=true; return new Response('', {status:503}); }
      if (name === wait) await pending;
      const file = path.join(dist, name);
      assert(file.startsWith(dist+'/'));
      return new Response(fs.readFileSync(file), {headers:{'content-type':name.endsWith('.css')?'text/css':'text/javascript'}});
    })]},
    beforeParse(window) {
      window.AbortController=AbortController;window.TextEncoder=TextEncoder;window.TextDecoder=TextDecoder;
      window.fetch=async (url, options={}) => {
        const name=new URL(url, 'https://fixture.invalid').pathname;
        calls.push(name);
        let data={}, status=200;
        if(name==='/api/auth/config')data={configured:true,google:{configured:false},matrix:{configured:false}};
        if(name==='/api/auth/session'){if(signedIn)data=session;else{status=401;data={error:{code:'sign_in_required',message:'Sign in required'}};}}
        if(name==='/api/auth/login'){signedIn=true;data=session;}
        if(name==='/api/live/communities')data={communities:[]};
        if(name==='/api/admin/status')data={isOwner:false,ownerConfigured:true};
        if(name==='/api/messages/conversations')data={conversations:[]};
        if(name==='/api/profiles/me')data={profile:{...account,showcase:[],earnedBadges:[]}};
        if(name==='/api/cosmetics/catalog')data={items:[]};
        return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
      };
      window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
    }
  });
  return {dom, w:dom.window, assets, calls, errors, release};
}
async function until(check, description) {
  for(let attempt=0;attempt<300;attempt++){
    if(check())return;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  throw Error('Did not reach '+description);
}

(async()=>{
  const guest=fixture({fail:'/collectible-art.js'});
  try {
    const {w,calls,assets}=guest,doc=w.document;
    await until(()=>w.VoidHome?.state.phase==='welcome','guest login');
    const forbidden=['/collectible-art.js','/account-export.js','/admin.js','/profiles-panel.js','/native-media.js','/cosmetics.css'];
    assert(forbidden.every(url=>!assets.includes(url)));
    assert.equal(doc.querySelector('#home-root').inert,false);
    const form=doc.querySelector('[data-home-form="login"]');
    form.elements.username.value=account.username;form.elements.password.value='example-example';
    form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await until(()=>doc.querySelector('[data-home="cosmetics-collection"]'),'signed-in navigation');
    assert(w.VoidNativeTimeline && w.VoidProfilesPanel && w.VoidCosmetics);
    assert(!assets.includes('/collectible-art.js') && !assets.includes('/admin.js') && !assets.includes('/account-export.js'));
    assert(!calls.includes('/api/cosmetics/catalog'));
    const openCollection=()=>doc.querySelector('[data-home="cosmetics-collection"]').click();
    openCollection();
    await until(()=>doc.querySelector('#home-announcer').textContent.includes('could not load'),'recoverable feature error');
    assert.equal(w.VoidHome.state.view,'chats');
    openCollection();
    await until(()=>w.VoidHome.state.view==='collection' && calls.includes('/api/cosmetics/inventory'),'collection retry');
    assert(w.VoidCollectibleArt && w.VoidGiftCollections);
    assert.equal(assets.filter(url=>url==='/collectible-art.js').length,2);
    assert.equal(assets.filter(url=>url==='/gift-collections.js').length,1);
    assert.equal(assets.filter(url=>url==='/cosmetics.css').length,1);
    assert.deepEqual(guest.errors,[]);
    console.log('PASS guest entry, real login controls, authenticated registration, scoped feature loading and single-asset retry');
  } finally { guest.dom.window.close(); }
  const switching=fixture({signedIn:true,wait:'/collectible-art.js'});
  try {
    const {w,assets,calls}=switching,doc=w.document;
    await until(()=>doc.querySelector('[data-home="cosmetics-collection"]'),'account navigation');
    doc.querySelector('[data-home="cosmetics-collection"]').click();
    await until(()=>assets.includes('/collectible-art.js'),'pending collection');
    doc.querySelector('[data-home="servers"]').click();
    switching.release();
    await until(()=>w.VoidFeatures.ready('collection'),'completed download');
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(w.VoidHome.state.view,'servers');
    assert(!calls.includes('/api/cosmetics/inventory'));
    assert.deepEqual(switching.errors,[]);
    console.log('PASS navigating away during a pending feature load does not reopen it or fetch private inventory');
  } finally { switching.release(); switching.dom.window.close(); }
  const interrupted=fixture({signedIn:true,route:'#collection',wait:'/collectible-art.js'});
  try {
    const {w,assets}=interrupted,doc=w.document;
    await until(()=>assets.includes('/collectible-art.js'),'cold collection route loading');
    // The conversation list can finish while the collection artwork is still loading.
    w.VoidHome.state.nativeListLoaded=true;
    doc.querySelector('[data-home="you"]').click();
    await until(()=>doc.querySelector('[data-home="logout"]'),'basic profile while optional artwork is stalled');
    assert.equal(w.VoidFeatures.ready('collection'),false);
    interrupted.release();
    assert.equal(w.location.hash,'#you');
    w.history.back();
    await until(()=>w.VoidHome.state.view==='collection','back to original collection route');
    w.history.forward();
    await until(()=>w.VoidHome.state.view==='you','forward to the chosen profile');
    assert.deepEqual(interrupted.errors,[]);
    console.log('PASS a profile tap during collection route restoration wins and preserves back/forward history');
  } finally { interrupted.release(); interrupted.dom.window.close(); }
  const sidebarCase=fixture({signedIn:true});
  try {
    const {w}=sidebarCase, doc=w.document;
    await until(()=>w.VoidHome?.state.phase==='ready' && w.VoidHome.state.nativeListLoaded,'signed-in conversation list');
    const state=w.VoidHome.state;
    state.nativeConversations=Array.from({length:45},(_,i)=>({id:'row-'+i,title:'Conversation '+i,kind:'group',participants:[]}));
    w.VoidHome.refreshChrome();
    const selector='.vh-sidebar-scroll';
    const proto=w.HTMLElement.prototype,original=proto.getBoundingClientRect;
    proto.getBoundingClientRect=function(){
      if(this.matches('[data-home-native]')){
        const list=this.closest(selector),index=[...list.querySelectorAll('[data-home-native]')].indexOf(this);
        const top=index*50-list.scrollTop;return {top,bottom:top+50};
      }
      return original.call(this);
    };
    const list=doc.querySelector(selector);
    list.scrollTop=630;
    const anchor=doc.querySelector('[data-home-native="row-12"]');
    assert.equal(anchor.getBoundingClientRect().top,-30);
    state.nativeConversations.unshift({id:'new-arrival',title:'New activity',kind:'group',participants:[]});
    w.VoidHome.refreshChrome();
    assert.equal(doc.querySelector(selector).scrollTop,680);
    assert.equal(doc.querySelector('[data-home-native="row-12"]').getBoundingClientRect().top,-30);
    console.log('PASS incoming activity preserves the visible sidebar anchor across a replaced list');
  } finally { sidebarCase.dom.window.close(); }
  const restored=fixture({signedIn:true,fail:'/native-outbox.js',route:'#collection'});
  try {
    const {w,assets,calls}=restored,doc=w.document;
    await until(()=>doc.querySelector('[data-home="retry-workspace"]'),'workspace recovery');
    assert.equal(w.VoidHome.state.account.id,account.id);
    doc.querySelector('[data-home="retry-workspace"]').click();
    await until(()=>w.VoidHome.state.view==='collection' && calls.includes('/api/cosmetics/inventory'),'restored deep link');
    assert.equal(assets.filter(url=>url==='/native-outbox.js').length,2);
    assert.equal(assets.filter(url=>url==='/social.js').length,1);
    assert.deepEqual(restored.errors,[]);
    console.log('PASS signed-in dependency failure preserves identity and restores the original collection deep link on retry');
  } finally { restored.dom.window.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
