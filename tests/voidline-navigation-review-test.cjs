'use strict';
const assert=require('node:assert/strict');
const {harness}=require('./voidline-v2-test.cjs');
function fixture(){
  const app=harness({messages:{'afterhours/general':[{id:'focus-root',author:'self',text:'Keep the thread',time:1700000000000,reactions:[]}]}},new Map(),{controlledTimers:true});
  let width=390;
  app.window.matchMedia=query=>({matches:query.includes('min-width')?width>=Number(query.match(/\d+/)[0]):query.includes('max-width')?width<=Number(query.match(/\d+/)[0]):false});
  const node=(name,tag='div',className='')=>{const n=app.document.createElement(tag);n.id=name;n.className=className;n.isConnected=true;return n;};
  const rail=node('review-rail','nav','server-rail'),sidebar=node('review-sidebar','aside','channel-sidebar'),members=node('review-members','aside','members-sidebar'),main=node('review-main','main','conversation');
  for(const panel of [rail,sidebar,members,main])app.document.body.appendChild(panel);
  const opener=node('review-opener','button','mobile-menu');opener.dataset.action='menu';main.appendChild(opener);
  const memberOpener=node('review-member-opener','button');memberOpener.dataset.action='members';main.appendChild(memberOpener);
  const first=node('review-first','button'),last=node('review-last','button'),memberClose=node('review-member-close','button');
  rail.appendChild(first);sidebar.appendChild(last);members.appendChild(memberClose);
  rail.querySelectorAll=()=>[first];sidebar.querySelectorAll=()=>[last];members.querySelectorAll=()=>[memberClose];
  main.appendChild(app.get('message-input'));main.appendChild(app.get('thread-panel'));
  const priorQuery=app.document.querySelectorAll;
  app.document.querySelectorAll=selector=>selector==='[data-action="menu"]'?[opener]:selector==='[data-action="members"]'?[memberOpener]:priorQuery(selector);
  app.api.renderAll();
  const press=async(key,target=app.document.activeElement,extra={})=>{let prevented=false;await app.dispatchDocument('keydown',{key,target,preventDefault(){prevented=true;},...extra});return prevented;};
  return {...app,rail,sidebar,members,main,opener,memberOpener,first,last,memberClose,press,setWidth(value){width=value;app.window.innerWidth=value;app.window.dispatchEvent(new Event('resize'));}};
}
(async()=>{
  {
    const app=fixture();app.opener.focus();await app.opener.click();
    assert.equal(app.document.activeElement,app.first);assert.equal(app.main.inert,true);assert.equal(app.sidebar.inert,false);assert.equal(app.opener.getAttribute('aria-expanded'),'true');
    app.last.focus();assert.equal(await app.press('Tab'),true);assert.equal(app.document.activeElement,app.first);
    assert.equal(await app.press('Tab',app.first,{shiftKey:true}),true);assert.equal(app.document.activeElement,app.last);
    await app.press('Escape');assert.equal(app.document.activeElement,app.opener);assert.equal(app.main.inert,false);assert.equal(app.sidebar.inert,true);assert.equal(app.opener.getAttribute('aria-expanded'),'false');
    console.log('PASS local navigation drawer contains keyboard focus, hides closed mobile navigation from focus, and restores its opener.');
  }
  {
    const app=fixture();app.memberOpener.focus();await app.memberOpener.click();
    assert.equal(app.document.activeElement,app.memberClose);assert.equal(app.main.inert,true);
    app.api.modal('<h2>A profile</h2>');
    assert.equal(app.main.inert,false);assert.equal(app.document.body.classList.contains('members-open'),false);assert.equal(app.get('app-modal').open,true);
    assert.equal(await app.press('Tab',app.memberClose),false,'Native dialog owns its focus while open');
    app.api.closeModal();assert.equal(app.document.activeElement,app.memberOpener);
    console.log('PASS opening a profile releases the member drawer before native dialog focus management.');
  }
  {
    const app=fixture();app.opener.focus();await app.opener.click();app.setWidth(1280);
    assert.equal(app.document.body.classList.contains('mobile-nav'),false);assert.equal(app.main.inert,false);assert.equal(app.rail.inert,false);assert.equal(app.sidebar.inert,false);assert.equal(app.document.activeElement,app.opener);
    app.setWidth(390);app.opener.focus();await app.opener.click();app.api.closeLocalDrawers(false);
    assert.equal(app.main.inert,false);assert.equal(app.document.body.classList.contains('mobile-nav'),false);
    console.log('PASS desktop resize and shared-workspace handoff both release local drawer state.');
  }
  {
    const app=fixture(),source=app.document.createElement('button');source.isConnected=true;app.main.appendChild(source);source.focus();
    app.api.messageAction('thread','focus-root',source);app.get('thread-input').value='Unsent thread note';
    assert.equal(app.get('message-input').inert,true);assert.equal(app.get('thread-panel').hidden,false);
    app.api.closeThread();assert.equal(app.get('message-input').inert,false);assert.equal(app.document.activeElement,source);assert.equal(app.get('thread-panel').hidden,true);
    app.api.messageAction('thread','focus-root',source);assert.equal(app.get('thread-input').value,'Unsent thread note');
    console.log('PASS closing a mobile thread restores focus and preserves its independent unsent draft.');
  }
  console.log('4/4 local navigation focus checks passed. Controlled DOM; no browser geometry or screenshots claimed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
