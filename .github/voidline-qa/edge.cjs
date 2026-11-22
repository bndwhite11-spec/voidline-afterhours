'use strict';
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const files = [
 ['gift-copium-cartridge', 'Copium Cartridge'],
 ['gift-cartridge-rain-check', 'They’ll Text Back'],
 ['gift-cartridge-second-wind', 'One More Game'],
 ['gift-cartridge-hold-music', 'Next in Queue'],
 ['gift-cartridge-panic-button', 'It Was Lag'],
 ['gift-cartridge-last-resort', 'Still Early']
];
const origin='https://voidline-afterhours.pipedcactus1.chatgpt.site';
const home=path.join(process.env.RUNNER_TEMP, 'voidline-edge-smoke');
fs.mkdirSync(home,{recursive:true});
const edge=[process.env['ProgramFiles(x86)'],process.env.ProgramFiles].filter(Boolean).map(base=>path.join(base,'Microsoft','Edge','Application','msedge.exe')).find(file=>fs.existsSync(file));
assert(edge, 'Microsoft Edge installation missing');
const runner=spawn(edge,['--headless=new','--disable-background-mode','--no-first-run','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+home,'about:blank'], {stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn, dst, ms=30000) {
 const deadline=Date.now()+ms;let last;
 do {try{const result=await fn();if(result)return result;}catch(e){last=e;}await delay(150);}while(Date.now()<deadline);
 throw Error(dst+' timed out'+(last?' ('+last.message+')':''));
}
async function test() {
 const port=await until(()=>fs.readFileSync(path.join(home,'DevToolsActivePort'),'utf8').split(/\r?\n/)[0],'Edge startup');
 const tab=await until(async ()=>(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'Edge tab');
 const socket=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((ok,no)=>{socket.onopen=ok;socket.onerror=no;});
 const pending=new Map();let id=0;
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id && pending.has(message.id)){const [yes,no]=pending.get(message.id);pending.delete(message.id);if(message.error)no(Error(message.error.message));else yes(message.result);}});
 function command(method,params={}) {
   const k=++id;return new Promise((yes,no)=>{pending.set(k,[yes,no]);socket.send(JSON.stringify({id:k,method,params}));});
 }
 async function evaluate(expr){const res=await command('Runtime.evaluate',{expression:expr,returnByValue:true});if(res.exceptionDetails)throw Error(res.exceptionDetails.text);return res.result.value;}
 try {
  await command('Page.enable');
  for(const [id,label] of files) {
   const url=origin+'/art-review.html?item='+id;
   await command('Page.navigate',{url});
   await until(()=>evaluate('location.href==='+JSON.stringify(url)+' && document.querySelector("#ar-dialog")?.open && document.querySelector("#ar-title").textContent==='+JSON.stringify(label)+' && !!document.querySelector("#ar-stage svg") && !document.querySelector("#ar-play").disabled'),'loading '+label,45000);
   assert(await evaluate('(()=>{document.getElementById("ar-play").click();return true})()'));
   await until(()=>evaluate('document.querySelector("#ar-status")?.textContent==="Playing once"'),'play '+label);
   await until(()=>evaluate('document.querySelector("#ar-status")?.textContent==="Preview complete." && document.querySelector("#ar-frame").value==="100"'),'finish '+label);
   console.log('WINDOWS EDGE PASS: '+label+' detail SVG and actual animation completed.');
  }
 } finally {socket.close();}
}
test().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>runner.kill());
