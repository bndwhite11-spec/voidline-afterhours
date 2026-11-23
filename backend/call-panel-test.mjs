import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {callPanel} from '../src/call-panel.js';

const pending=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const state=(number,extra={})=>({phase:'connected',kind:'video',peer:'Participant '+number,reason:'',local:{id:'local-'+number},remote:{id:'remote-'+number},mic:true,camera:true,...extra});
let passed=0;
async function check(name,run){await run();passed++;console.log('PASS '+name);}
function fixture(){
  const dom=new JSDOM('<!doctype html><button id="outside">Outside</button>',{url:'https://call-panel.invalid'}),plays=[];
  const previous=globalThis.document;globalThis.document=dom.window.document;
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  dom.window.HTMLMediaElement.prototype.play=function(){const result={...pending(),element:this};plays.push(result);return result.promise;};
  const panel=callPanel(()=>({answer(){},decline(){},toggle(){},end(){}}));
  return {panel,plays,get sound(){return [...dom.window.document.querySelectorAll('button')].find(button=>button.textContent==='Play incoming audio');},
    get status(){return dom.window.document.querySelector('[role="status"]')?.textContent;},
    async blockRemote(){plays.at(-1).reject(Error('Autoplay blocked'));await flush();assert.equal(this.sound.hidden,false);},
    close(){panel.remove();dom.window.close();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}};
}
await check('an old panel playback result cannot hide the new call playback control',async()=>{
  const f=fixture();try{
    f.panel.update(state(1));await f.blockRemote();f.sound.click();const oldPlay=f.plays.at(-1);
    f.panel.remove();f.panel.update(state(2));await f.blockRemote();const currentSound=f.sound;
    oldPlay.resolve();await flush();assert.equal(currentSound.hidden,false);
  }finally{f.close();}
});
await check('an old stream playback result cannot hide a replacement stream playback control',async()=>{
  const f=fixture();try{
    f.panel.update(state(1));await f.blockRemote();f.sound.click();const oldPlay=f.plays.at(-1);
    f.panel.update(state(2));await f.blockRemote();oldPlay.resolve();await flush();assert.equal(f.sound.hidden,false);
  }finally{f.close();}
});
await check('successful playback still hides the matching current control',async()=>{
  const f=fixture();try{
    f.panel.update(state(1));await f.blockRemote();f.sound.click();f.plays.at(-1).resolve();await flush();assert.equal(f.sound.hidden,true);
  }finally{f.close();}
});
await check('call preparation copy describes the user action without operator configuration',async()=>{
  const f=fixture();try{
    f.panel.update(state(1,{phase:'preparing',local:null,remote:null}));assert.equal(f.status,'Preparing your call…');
    f.panel.update(state(1,{phase:'answering',local:null,remote:null}));assert.equal(f.status,'Preparing your devices…');
  }finally{f.close();}
});
console.log(`${passed}/${passed} call panel checks passed with controlled DOM and playback promises.`);
