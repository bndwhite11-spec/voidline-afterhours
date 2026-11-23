'use strict';

// Exercise the shipped account UI with real DOM forms and controlled HTTP.
// Mail delivery and token issuance are covered by the account service tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const { JSDOM, VirtualConsole } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../dist/home.js'), 'utf8');
const tests = [];
const test = (name, run) => tests.push([name, run]);
const token = 'a'.repeat(64);
const email = 'night.reader@example.org';
const password = 'Cobalt!River92Maple';
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.ok(predicate(), 'The account UI completed its asynchronous update.');
}

async function client({ strict = true, hash = '', signedIn = false, handlers = {} } = {}) {
  const calls = [], errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM('<!doctype html><html><body><a class="vh-skip-link" href="#home-main">Skip to content</a><div id="home-root"></div></body></html>', {
    url: 'https://voidline.example/' + hash,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom, { document } = window;
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.setInterval = () => 0;
  window.structuredClone = structuredClone;
  window.TextEncoder = TextEncoder;
  Object.defineProperty(window, 'crypto', { value: webcrypto });

  const existing = { id: 'existing-account', username: 'night_reader', displayName: 'Night Reader', bio: '', avatar: 'moon', needsOnboarding: false };
  const server = { signedIn, account: existing };
  const session = account => ({ account, session: { id: 'session-' + account.id, expiresAt: Date.now() + 3600000 }, authentication: { methods: ['password'] }, csrfToken: 'fixture-csrf' });
  const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  window.fetch = async (url, options = {}) => {
    const request = { url: String(url), method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined };
    calls.push(request);
    if (handlers[request.url]) {
      const result = await handlers[request.url](request, server, session);
      return response(result.body, result.status ?? 200);
    }
    if (url === '/api/auth/config') return response({
      configured: true, google: { configured: false }, matrix: { configured: false }, encryption: { available: false },
      email: { configured: true, registration: strict ? 'verified-email' : undefined },
    });
    if (url === '/api/auth/session') return server.signedIn ? response(session(server.account)) : response({ error: { code: 'sign_in_required', message: 'Log in to continue.' } }, 401);
    if (url === '/api/auth/register/email') return response({ accepted: true, verificationRequired: true, expiresInSeconds: 600, message: 'If this address is available, check your inbox for a verification link.' }, 202);
    if (url === '/api/auth/register/email/inspect') return response({ email, expiresAt: Date.now() + 600000 });
    if (url === '/api/auth/register') {
      server.account = { ...existing, id: 'completed-account', username: request.body.username, displayName: request.body.displayName };
      server.signedIn = true;
      return response({ ...session(server.account), recoveryCode: 'b'.repeat(64) }, 201);
    }
    if (url === '/api/auth/legacy-login') {
      server.account = { ...existing, id: 'legacy-account', username: request.body.username };
      server.signedIn = true;
      return response({ ...session(server.account), emailUpgradeRequired: true });
    }
    if (url === '/api/auth/logout') { server.signedIn = false; return response({ loggedOut: true }); }
    if (url === '/api/auth/devices') return response({devices:[]});
    if (url === '/api/security/passkeys') return response({passkeys:[]});
    if (url === '/api/auth/email') return response({ email: null, verifiedAt: null, deliveryConfigured: true });
    if (url === '/api/auth/login') return response({ error: { code: 'invalid_credentials', message: 'The email or password is incorrect.' } }, 401);
    if (String(url).startsWith('/api/messages/conversations')) return response({ conversations: [] });
    if (url === '/api/live/communities') return response({ communities: [] });
    throw Error('Unexpected account request: ' + url);
  };
  window.eval(source);
  await until(() => window.VoidHome && window.VoidHome.state.phase !== 'loading' && document.querySelector('#home-main'));
  const form = kind => document.querySelector(kind ? `[data-home-form="${kind}"]` : '[data-home-form]');
  const field = name => form()?.elements.namedItem(name);
  const type = (name, value) => { const input = field(name); assert.ok(input, 'The form contains ' + name); input.value = value; input.dispatchEvent(new window.Event('input', { bubbles: true })); return input; };
  const click = action => { const button = document.querySelector(`[data-home="${action}"]`); assert.ok(button, 'The account UI contains ' + action); button.click(); };
  const submit = () => { const node = form(); assert.ok(node, 'An account form is visible.'); node.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); };
  return { dom, window, document, server, calls, errors, form, field, type, click, submit, response, state: () => window.VoidHome.state, close: () => window.close() };
}

test('signup collects an email without passwords, and ordinary login requests verified email', async () => {
  const app=await client();try{
    assert.equal(app.field('username').type,'email');app.click('auth-register');
    assert.ok(app.form('signup-email-request'));assert.equal(app.document.querySelector('input[type="password"]'),null);
    app.type('email',email);app.submit();await until(()=>app.calls.some(c=>c.url==='/api/auth/register/email'));
    assert.deepEqual(app.calls.find(c=>c.url==='/api/auth/register/email').body,{email});
    assert.equal(app.state().account,null);assert.equal(app.calls.some(c=>c.url==='/api/auth/register'),false);
  }finally{app.close();}
});

test('an email link is checked before profile or password fields appear', async () => {
  const held=deferred(),app=await client({hash:'#signup-email='+token,handlers:{'/api/auth/register/email/inspect':()=>held.promise}});try{
    await until(()=>app.calls.some(c=>c.url.endsWith('/inspect')));
    assert.equal(app.document.querySelector('input[name="password"],input[name="username"]'),null);
    held.resolve({body:{email,expiresAt:Date.now()+600000}});await until(()=>app.form('register'));
    assert.deepEqual(app.calls.find(c=>c.url.endsWith('/inspect')).body,{emailToken:token});
    assert.match(app.document.querySelector('#home-main').textContent,/night\.reader@example\.org/);
    assert.equal(app.state().account,null);
  }finally{app.close();}
});

test('password strength remains local and completed signup carries the same email proof', async () => {
  const app=await client({hash:'#signup-email='+token});try{
    await until(()=>app.form('register'));app.type('username','maple_reader');app.type('displayName','Maple Reader');
    const input=app.type('password','short');app.type('passwordConfirm','short');
    const feedback=input.closest('.vh-field').querySelector('[data-password-feedback]');assert.equal(feedback.dataset.strength,'short');
    app.submit();await new Promise(resolve=>setImmediate(resolve));assert.equal(app.calls.some(c=>c.url==='/api/auth/register'),false);
    const before=app.calls.length;app.type('password',password);app.type('passwordConfirm',password);
    assert.equal(feedback.dataset.strength,'strong');assert.equal(app.calls.length,before);
    app.submit();await until(()=>app.state().account?.id==='completed-account');
    const request=app.calls.find(c=>c.url==='/api/auth/register');assert.equal(request.body.emailToken,token);assert.equal(request.body.username,'maple_reader');
    assert.equal(Object.hasOwn(request.body,'passwordConfirm'),false);assert.equal(app.window.location.hash,'');
    assert.equal(app.state().phase,'account-recovery');assert.equal(app.state().accountRecovery,'b'.repeat(64));
  }finally{app.close();}
});

test('expired links show an actionable error without collecting credentials', async () => {
  const app=await client({hash:'#signup-email='+token,handlers:{'/api/auth/register/email/inspect':()=>({status:400,body:{error:{code:'invalid_signup_link',message:'This signup link was used or expired. Request a new link.'}}})}});try{
    await until(()=>app.document.querySelector('[data-home="auth-restart-signup"]'));
    assert.equal(app.document.querySelector('input[type="password"]'),null);assert.match(app.document.querySelector('[role="alert"]').textContent,/expired/);
    app.click('auth-restart-signup');assert.ok(app.form('signup-email-request'));assert.equal(app.window.location.hash,'');
  }finally{app.close();}
});

test('a late link check cannot replace deliberate login navigation', async () => {
  const held=deferred(),app=await client({hash:'#signup-email='+token,handlers:{'/api/auth/register/email/inspect':()=>held.promise}});try{
    await until(()=>app.calls.some(c=>c.url.endsWith('/inspect')));app.click('auth-login');assert.ok(app.form('login'));
    held.resolve({body:{email,expiresAt:Date.now()+600000}});await new Promise(resolve=>setImmediate(resolve));
    assert.ok(app.form('login'));assert.equal(app.form('register'),null);assert.equal(app.window.location.hash,'');
  }finally{app.close();}
});

test('skip-to-content preserves the email proof and the active registration form', async () => {
  const app=await client({hash:'#signup-email='+token});try{
    await until(()=>app.form('register'));app.type('username','maple_reader');
    app.document.querySelector('.vh-skip-link').click();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(app.window.location.hash,'#signup-email='+token);assert.equal(app.document.activeElement.id,'home-main');
    assert.equal(app.field('username').value,'maple_reader');assert.equal(app.calls.filter(c=>c.url.endsWith('/inspect')).length,1);
  }finally{app.close();}
});

test('a proof that expires while composing returns to a new-link action', async () => {
  const app=await client({hash:'#signup-email='+token,handlers:{'/api/auth/register':()=>({status:400,body:{error:{code:'invalid_signup_link',message:'This signup link was used or expired. Request a new link.'}}})}});try{
    await until(()=>app.form('register'));for(const [name,value]of Object.entries({username:'maple_reader',displayName:'Maple Reader',password,passwordConfirm:password}))app.type(name,value);
    app.submit();await until(()=>app.document.querySelector('[data-home="auth-retry-signup"]'));
    assert.equal(app.document.querySelector('input[type="password"]'),null);assert.equal(app.state().account,null);
    assert.equal(app.window.localStorage.length,0);assert.equal(app.window.sessionStorage.length,0);
  }finally{app.close();}
});

test('a signed-in account stays intact until explicit sign-out before signup', async () => {
  const app=await client({signedIn:true,hash:'#signup-email='+token});try{
    await until(()=>app.document.querySelector('[data-home="signup-signout-continue"]'));
    assert.equal(app.state().account.id,'existing-account');assert.equal(app.calls.some(c=>c.url.endsWith('/inspect')||c.url==='/api/auth/register'||c.url==='/api/auth/logout'),false);
    app.click('signup-signout-continue');await until(()=>app.form('register'));
    const logout=app.calls.findIndex(c=>c.url==='/api/auth/logout'),inspect=app.calls.findIndex(c=>c.url.endsWith('/inspect'));
    assert.ok(logout>=0&&inspect>logout);assert.equal(app.state().account,null);assert.equal(app.window.location.hash,'#signup-email='+token);
  }finally{app.close();}
});

test('keeping the current account dismisses the link without consuming it', async () => {
  const app=await client({signedIn:true,hash:'#signup-email='+token});try{
    await until(()=>app.document.querySelector('[data-home="signup-keep-account"]'));app.click('signup-keep-account');
    assert.equal(app.state().account.id,'existing-account');assert.equal(app.window.location.hash,'');assert.equal(app.calls.some(c=>c.url.endsWith('/inspect')||c.url==='/api/auth/logout'),false);
  }finally{app.close();}
});

test('pending sign-out cannot be duplicated or offer a misleading stay action', async () => {
  const held=deferred(),app=await client({signedIn:true,hash:'#signup-email='+token,handlers:{'/api/auth/logout':async(_request,server)=>{await held.promise;server.signedIn=false;return {body:{loggedOut:true}};}}});try{
    await until(()=>app.document.querySelector('[data-home="signup-signout-continue"]'));app.click('signup-signout-continue');
    assert.equal(app.document.querySelector('[data-home="signup-keep-account"]').disabled,true);
    assert.equal(app.document.querySelector('[data-home="signup-signout-continue"]').disabled,true);
    app.click('signup-signout-continue');app.click('signup-keep-account');
    assert.equal(app.calls.filter(c=>c.url==='/api/auth/logout').length,1);assert.equal(app.state().account.id,'existing-account');
    held.resolve();await until(()=>app.form('register'));assert.equal(app.state().account,null);
  }finally{app.close();}
});

async function openEmailSettings(app){
  await until(()=>app.document.querySelector('[data-home="security"]'));
  assert.equal(app.document.querySelector('#home-main [data-home="email-settings"]'),null);
  app.click('security');await until(()=>app.document.querySelector('#home-dialog[open] [data-home="email-settings"]'));
  app.click('email-settings');
}

test('older account can request, resend, correct a code and see its verified address confirmed',async()=>{
  let attempt=0;
  const app=await client({signedIn:true,hash:'#you',handlers:{
    '/api/auth/email/code/request':({body})=>({body:{accepted:true,challengeId:'challenge-'+(++attempt),email:body.email,expiresAt:Date.now()+600000}}),
    '/api/auth/email/code/verify':({body})=>body.code==='07234567'?{body:{verified:true,email}}:{status:400,body:{error:{code:'invalid_code',message:'The code is incorrect.'}}}
  }});
  try{
    await openEmailSettings(app);
    await until(()=>app.form('email-code-request'));app.type('email',email);app.submit();
    await until(()=>app.form('email-code-verify'));
    const code=app.field('code');assert.equal(code.autocomplete,'one-time-code');assert.equal(code.type,'text');assert.equal(code.inputMode,'numeric');
    assert.match(app.document.querySelector('#home-dialog').textContent,/night.reader@example.org/);
    app.form('email-code-verify').querySelector('[value="resend"]').click();
    await until(()=>app.document.querySelector('#home-dialog').textContent.includes('A new code was requested.'));
    app.type('code','12345678');app.submit();
    await until(()=>app.form('email-code-verify')?.querySelector('[data-form-error]').textContent.includes('incorrect'));
    assert.equal(app.state().account.id,'existing-account');app.type('code','07234567');app.submit();
    await until(()=>app.document.querySelector('#home-dialog-title').textContent==='Email verified');
    assert.deepEqual(app.calls.filter(c=>c.url.endsWith('/code/verify')).at(-1).body,{challengeId:'challenge-2',code:'07234567',expectedAccountId:'existing-account'});
    assert.equal(app.state().authentication.needsVerifiedEmail,false);assert.equal(app.window.location.href.includes(email),false);
  }finally{app.close();}
});

test('stale session can confirm its password inline and change the destination before verifying',async()=>{
  let fresh=false;
  const app=await client({signedIn:true,hash:'#you',handlers:{
    '/api/auth/email/code/request':({body})=>fresh?{body:{accepted:true,challengeId:'new',email:body.email,expiresAt:Date.now()+600000}}:{status:401,body:{error:{code:'reauthentication_required',message:'Confirm your password.'}}},
    '/api/auth/reauthenticate':({body})=>{assert.equal(body.password,password);fresh=true;return{body:{reauthenticated:true}};}
  }});
  try{
    await openEmailSettings(app);await until(()=>app.form('email-code-request'));
    app.type('email',email);app.submit();await until(()=>app.field('emailPassword'));assert.equal(app.field('email').value,email);
    app.type('emailPassword',password);app.submit();await until(()=>app.form('email-code-verify'));
    app.click('email-code-change');await until(()=>app.form('email-code-request'));app.type('email','different@example.test');app.submit();await until(()=>app.form('email-code-verify'));
    assert.match(app.document.querySelector('#home-dialog').textContent,/different@example.test/);
    assert.equal(app.calls.filter(c=>c.url.endsWith('/code/verify')).length,0);
    assert.equal(app.calls.filter(c=>c.url.endsWith('/code/request')).some(c=>'emailPassword' in c.body||'password' in c.body),false);
    app.click('close-dialog');await openEmailSettings(app);await until(()=>app.form('email-code-verify'));
  }finally{app.close();}
});

test('unconfigured mail delivery explains availability on old accounts without submitting anything',async()=>{
 const app=await client({signedIn:true,hash:'#you',handlers:{'/api/auth/email':()=>({body:{verifiedAt:null,deliveryConfigured:false}})}});
 try{await openEmailSettings(app);
 await until(()=>app.document.querySelector('#home-email-settings')?.textContent.includes('temporarily unavailable'));
 assert.equal(app.form('email-code-request'),null);assert.equal(app.calls.some(c=>c.url.includes('/code/')),false);
 }finally{app.close();}
});

(async()=>{let failures=0;for(const [name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name);console.error(error.stack||error);}}console.log(`${tests.length-failures}/${tests.length} email onboarding DOM checks passed. Mail delivery is controlled HTTP; no provider delivery is claimed.`);process.exitCode=failures?1:0;})();
