import assert from 'node:assert/strict';
const origin = 'https://voidline-afterhours.pipedcactus1.chatgpt.site';
const inspectURL = origin + '/art-review.html?item=gift-copium-cartridge';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let page;
for (let attempt = 0; attempt < 45; attempt++) {
  try {
    const targets = await (await fetch('http://127.0.0.1:19222/json/list')).json();
    page = targets.find(target => target.type === 'page' && target.url.startsWith(inspectURL)) || targets.find(target => target.type === 'page' && target.url.startsWith(origin));
    if (page?.webSocketDebuggerUrl) break;
    if (attempt % 7 === 0) console.log('Chrome targets:', targets.map(target => [target.title, target.url]));
  } catch (error) {
    if (attempt % 7 === 0) console.log('Chrome DevTools starting:', error.message);
  }
  await sleep(1000);
}
assert(page?.webSocketDebuggerUrl, 'Android Chrome never opened the production cartridge gallery');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {socket.addEventListener('open', resolve, {once:true});socket.addEventListener('error', reject, {once:true});});
let id = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const data = JSON.parse(event.data);
  if (!pending.has(data.id)) return;
  const {resolve,reject,timer} = pending.get(data.id);
  clearTimeout(timer);pending.delete(data.id);
  if (data.error) reject(new Error(JSON.stringify(data.error)));
  else resolve(data.result);
});
function command(method, params = {}) {
  return new Promise((resolve,reject) => {
    const request = ++id;
    const timer = setTimeout(() => {pending.delete(request);reject(new Error(method+' timed out'));}, 12000);
    pending.set(request,{resolve,reject,timer});socket.send(JSON.stringify({id:request,method,params}));
  });
}
async function evaluate(expression) {
  const r = await command('Runtime.evaluate', {expression,returnByValue:true});
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function until(expression, name, limit = 45) {
  for (let i = 0; i < limit; i++) {
    if (await evaluate(expression)) return;
    await sleep(600);
  }
  throw new Error(name + ' failed. ' + JSON.stringify(await evaluate("({url:location.href,title:document.title,status:document.querySelector('#ar-status')?.textContent, reduce:matchMedia('(prefers-reduced-motion: reduce)').matches})")));
}
try {
  await command('Runtime.enable');
  await command('Page.enable');
  // Android disables transitions in accelerated test images unless a preference is selected.
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await command('Page.navigate',{url:inspectURL});
  await until("document.querySelector('#ar-dialog')?.open && document.querySelector('#ar-title')?.textContent === 'Copium Cartridge'",'Signed-out gift inspection');
  console.log('Chrome on emulator:',await evaluate('navigator.userAgent'));
  const reduced = await evaluate("document.querySelector('#ar-reduce').checked");
  if (reduced) await evaluate("document.querySelector('#ar-reduce').click()");
  await until("document.querySelector('#ar-status')?.textContent === 'Resting artwork' && !document.querySelector('#ar-play').disabled", 'Detail validation');
  let noOverflow=await evaluate('document.documentElement.scrollWidth <= innerWidth + 1');
  assert(noOverflow,'Horizontal overflow in Android Chrome');
  await evaluate("document.querySelector('#ar-play').click()");
  await until("document.querySelector('#ar-status')?.textContent === 'Preview complete.' && document.querySelector('#ar-frame-value')?.textContent === '100%'",'Native Chrome animation',20);
  console.log('PASS the original Copium Cartridge downloaded and played to 100% in Android Chrome, without horizontal overflow at',await evaluate('innerWidth'),'CSS pixels.');
} finally {socket.close();}
