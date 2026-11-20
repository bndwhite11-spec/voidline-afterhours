'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {JSDOM}=require('jsdom');

const key=id=>'voidline.preferences.v1.'+id;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(saved,accountId='account-a') {
  const dom=new JSDOM('<main id="home-root"></main>',{
    url:'https://voidline.example/#you',pretendToBeVisual:true,runScripts:'outside-only'
  });
  const w=dom.window,d=w.document;
  try {
    for(const [id,item] of Object.entries(saved||{})) w.localStorage.setItem(key(id),JSON.stringify(item));
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    w.HTMLDialogElement.prototype.close=function(){this.open=false;};
    w.matchMedia=()=>({matches:false,addEventListener(){}});
    const account={id:accountId,username:'night',displayName:'Night',needsOnboarding:false};
    const routes={
      '/api/auth/config':{configured:true},'/api/auth/session':{account,session:{id:'session-a'},csrfToken:'fixture'},
      '/api/live/communities':{communities:[]},'/api/messages/conversations':{conversations:[]}
    };
    const calls=[];
    w.fetch=async(path,options)=>{
      calls.push({path,method:options.method});
      if(!(path in routes)) throw Error('Unexpected fixture route '+path);
      return {ok:true,status:200,json:async()=>routes[path]};
    };
    for(const file of ['theme','home']) w.eval(readFileSync(join(__dirname,'../dist/'+file+'.js'),'utf8'));
    for(let i=0;i<15&&!d.querySelector('[data-home="appearance"]');i++)await tick();
    assert(d.querySelector('[data-home="appearance"]'),'the authenticated You page exposes Appearance');
    function open() {
      d.querySelector('[data-home="appearance"]').click();
      const form=d.querySelector('[data-home-form="appearance"]');
      assert(form?.closest('dialog[open]'),'Appearance opens from its normal account action');
      return form;
    }
    return {w,d,open,calls,close:()=>dom.window.close()};
  } catch (e) {dom.window.close();throw e;}
}
function field(form,name) {return form.elements.namedItem(name);}
function input(form,name,value) {
  const item=field(form,name);
  if(item.type==='checkbox') item.checked=value; else item.value=value;
  // For radio lists, dispatch from the checked native control.
  const node=item.dispatchEvent?item:form.querySelector('[name="'+name+'"]:checked');
  node.dispatchEvent(new form.ownerDocument.defaultView.Event('input',{bubbles:true}));
}
async function save(form) {
  form.querySelector('[type="submit"]').click();
  await tick();
}
async function verify() {
  const legacy={font:'19',simpleProfiles:true,reducedMotion:true};
  const f=await fixture({'account-a':legacy});
  let p;
  try {
    const {w,d,open}=f;
    let form=open();
    assert.equal(field(form,'font').value,'19');
    assert.equal(field(form,'simpleProfiles').checked,true);
    assert.equal(field(form,'palette').value,'graphite');
    assert.equal(field(form,'density').value,'comfortable');
    assert.equal(field(form,'background').disabled,true);
    console.log('PASS Appearance opens from the signed-in account and migrates older reading preferences');
    input(form,'palette','custom');
    input(form,'background','#fed');
    input(form,'accent','#145991');
    input(form,'density','compact');
    let scene=form.querySelector('[data-vh-sample]');
    assert.equal(scene.style.getPropertyValue('--vh-bg'),'#ffeedd');
    assert.equal(scene.dataset.vhDensity,'compact');
    assert.equal(d.documentElement.dataset.vhDensity,'comfortable');
    assert.equal(w.VoidTheme.state().palette,'graphite');
    assert.deepEqual(JSON.parse(w.localStorage.getItem(key('account-a'))),legacy);
    form.querySelector('[data-home="close-dialog"]').click();
    assert.equal(d.querySelector('dialog').open,false);
    form=open();
    assert.equal(field(form,'palette').value,'graphite');
    console.log('PASS editing and canceling a custom color changes only the isolated message preview');
    input(form,'palette','custom');input(form,'background','#fed');
    form.querySelector('[data-vh-accent="#81cfb4"]').click();
    assert.equal(field(form,'accent').value,'#81cfb4');
    const picker=form.querySelector('[data-vh-picker="accent"]');
    picker.value='#fcaf20';picker.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(field(form,'accent').value,'#fcaf20');
    input(form,'accent','bad');await save(form);
    assert.equal(field(form,'accent').checkValidity(),false);assert(d.querySelector('dialog').open);
    assert.deepEqual(JSON.parse(w.localStorage.getItem(key('account-a'))),legacy);
    input(form,'accent','#145991');input(form,'density','compact');input(form,'font','17');
    await save(form);
    assert(!d.querySelector('dialog').open);
    p=JSON.parse(w.localStorage.getItem(key('account-a')));
    assert.equal(p.background,'#ffeedd');assert.equal(p.accent,'#145991');assert.equal(p.density,'compact');assert.equal(p.simpleProfiles,true);
    assert.equal(w.VoidTheme.state().font,'17');assert.equal(d.documentElement.dataset.vhDensity,'compact');
    assert.equal(d.documentElement.style.getPropertyValue('--vh-bg'),'#ffeedd');
    assert(f.calls.every(call=>call.method==='GET'));
    console.log('PASS swatches, native color picker, validation and explicit Apply persist a custom theme without sending it to the server');
    form=open();form.querySelector('[data-vh-defaults]').click();
    assert.equal(field(form,'palette').value,'graphite');assert.equal(field(form,'simpleProfiles').checked,false);
    assert.equal(w.VoidTheme.state().palette,'custom');assert.equal(w.localStorage.getItem(key('account-a')),JSON.stringify(p));
    await save(form);assert.equal(w.VoidTheme.state().palette,'graphite');assert.equal(d.documentElement.style.getPropertyValue('--vh-bg'),'');
    console.log('PASS Restore defaults remains a draft until Apply and clears previous color overrides');
  } finally {f.close();}
  const reload=await fixture({'account-a':p});
  try {
    const form=reload.open();
    assert.equal(field(form,'accent').value,p.accent);assert.equal(field(form,'palette').value,'custom');
    assert.equal(reload.w.VoidTheme.state().density,'compact');
    const external={...p,font:'19',highContrast:true};
    input(form,'density','comfortable');
    reload.w.localStorage.setItem(key('account-a'),JSON.stringify(external));
    reload.w.dispatchEvent(new reload.w.StorageEvent('storage',{key:key('account-a'),storageArea:reload.w.localStorage}));
    assert.equal(reload.w.VoidTheme.state().font,'19');
    await save(form);
    assert.equal(reload.w.VoidTheme.state().density,'comfortable');
    assert.equal(reload.w.VoidTheme.state().font,'19');
    assert.equal(reload.w.VoidTheme.state().highContrast,true);
    console.log('PASS a settings change from another tab updates the app and survives an independent edit in an open form');
    const later=reload.open();
    Object.defineProperty(reload.w.Storage.prototype,'setItem',{value(){throw Error('quota');}});
    input(later,'palette','midnight');await save(later);
    assert(reload.d.querySelector('dialog').open);assert.match(later.querySelector('[data-form-error]').textContent,/could not save/i);
    assert.equal(field(later,'palette').value,'midnight');assert.equal(reload.w.VoidTheme.state().palette,'custom');
    console.log('PASS saved choices survive reload and failed device storage preserves the draft and previous theme');
  } finally {reload.close();}
  const other=await fixture({'account-a':p},'account-b');
  try {assert.equal(other.w.VoidTheme.state().palette,'graphite');assert.equal(field(other.open(),'density').value,'comfortable');
    console.log('PASS another signed-in account starts with its own appearance');}
  finally {other.close();}
}
verify().catch(error=>{console.error(error);process.exitCode=1;});
