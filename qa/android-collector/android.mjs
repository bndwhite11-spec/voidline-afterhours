import assert from 'node:assert/strict';
const origin = 'https://voidline-afterhours.pipedcactus1.chatgpt.site';
const phase=process.argv[2];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let page;
for (let attempt = 0; attempt < 45; attempt++) {
  try {
    const targets = await (await fetch('http://127.0.0.1:19222/json/list')).json();
    page = targets.find(target => target.type === 'page' && target.url.startsWith(origin));
    if (page?.webSocketDebuggerUrl) break;
    if (attempt % 7 === 0) console.log('Chrome targets:', targets.map(target => [target.title, target.url]));
  } catch (error) {
    if (attempt % 7 === 0) console.log('Chrome DevTools starting:', error.message);
  }
  await sleep(1000);
}
assert(page?.webSocketDebuggerUrl, 'Android launcher never opened the shipped VOIDLINE origin in Chrome');
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
  const r = await command('Runtime.evaluate', {expression,returnByValue:true,awaitPromise:true});
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
  await until("document.querySelector('form input[type=password]') && document.body.innerText.includes('Create account') && document.body.innerText.includes('Log in')",'Guest form in native handoff',55);
  const href=await evaluate('location.href');
  assert.equal(new URL(href).origin,origin);
  const version=await evaluate("fetch('/downloads/voidline-release.json').then(r=>r.json()).then(r=>r.tag)");
  assert.equal(version,'v1.0.11');
  const original=await evaluate("document.querySelector('form[data-home-form]').dataset.homeForm");
  assert(['register','login'].includes(original),original);
  const toggle=original==='register'?'auth-login':'auth-register';
  await evaluate("document.querySelector('[data-home="+toggle+"]').click()");
  await until("document.querySelector('form[data-home-form]').dataset.homeForm!=="+JSON.stringify(original),'Guest form switch');
  console.log('PASS',phase,'Android 15 APK handoff to current guest form at',href,'with registration/login switch; release',version,'viewport',await evaluate('innerWidth'));
} finally {socket.close();}
