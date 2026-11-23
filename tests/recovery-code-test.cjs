'use strict';
// Shipped account UI, real native DOM constraint validation and controlled HTTP.
// All credentials below are public synthetic fixtures, never user credentials.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {webcrypto}=require('node:crypto');
const {JSDOM,VirtualConsole}=require('jsdom');
const source=readFileSync(join(__dirname,'../dist/home.js'),'utf8');
const cases=[];
const savedCode='0123456789abcdef'.repeat(4),emailCode='07234567',challengeId='c'.repeat(64),email='reader.with.long.name@example.test',password='New!Cobalt92RiverMaple';
async function until(check){for(let i=0;i<70;i++){if(check())return;await new Promise(resolve=>setImmediate(resolve));}assert(check(),'Expected account view completed');}
async function client({signedIn=false,configured=true}={}){
 const errors=[],calls=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error));
 const dom=new JSDOM('<body><div id="home-root"></div></body>',{url:'https://voidline.example/'+(signedIn?'#you':''),runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
 const w=dom.window,d=w.document,account={id:'fixture-account',username:'reader',displayName:'Reader',avatar:'moon',bio:'',needsOnboarding:false};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};w.setInterval=()=>0;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;Object.defineProperty(w,'crypto',{value:webcrypto});
 const session=()=>({account,session:{id:'fixture-session',expiresAt:Date.now()+3600000},csrfToken:'fixture-csrf',authentication:{methods:['password'],needsVerifiedEmail:true}});
 w.fetch=async(url,options={})=>{
  const call={url:String(url),body:options.body?JSON.parse(options.body):undefined};calls.push(call);let body,status=200;
  if(url==='/api/auth/config')body={configured:true,google:{configured:false},matrix:{configured:false},encryption:{available:false},email:{configured,registration:'verified-email'}};
  else if(url==='/api/auth/session'){body=signedIn?session():{error:{code:'sign_in_required',message:'Log in to continue.'}};if(!signedIn)status=401;}
  else if(url==='/api/auth/recover'){body={...session(),recoveryCode:'b'.repeat(64)};signedIn=true;}
  else if(url==='/api/auth/devices')body={devices:[]};
  else if(url==='/api/security/passkeys')body={passkeys:[]};
  else if(url==='/api/auth/email')body={email:null,verifiedAt:null,deliveryConfigured:true};
  else if(url==='/api/auth/email/code/request')body={accepted:true,challengeId,email:call.body.email,expiresAt:Date.now()+600000};
  else if(url==='/api/auth/email/code/verify')body={verified:true,email};
  else if(url==='/api/live/communities')body={communities:[]};
  else if(String(url).startsWith('/api/messages/conversations'))body={conversations:[]};
  else throw Error('Unexpected fixture request '+url);
  return {ok:status>=200&&status<300,status,json:async()=>body};
 };
 w.eval(source);await until(()=>w.VoidHome&&w.VoidHome.state.phase!=='loading'&&d.querySelector('#home-main'));
 const form=kind=>d.querySelector(kind?'[data-home-form="'+kind+'"]':'[data-home-form]');
 const click=action=>{const button=d.querySelector('[data-home="'+action+'"]');assert(button,action);button.click();};
 const type=(name,value)=>{const field=form().elements.namedItem(name);assert(field,name);field.value=value;field.dispatchEvent(new w.Event('input',{bubbles:true}));return field;};
 const recover=async()=>{if(configured){click('auth-email-recover');click('auth-recover');}else click('auth-recover');await until(()=>form('recover'));};
 const emailVerification=async()=>{await until(()=>d.querySelector('[data-home="security"]'));click('security');await until(()=>d.querySelector('[data-home="email-settings"]'));click('email-settings');await until(()=>form('email-code-request'));type('email',email);form().requestSubmit();await until(()=>form('email-code-verify'));};
 return {w,d,calls,errors,form,click,type,recover,emailVerification,state:()=>w.VoidHome.state,end:()=>w.close()};
}
function fillRecovery(f,identifier,code){f.type('username',identifier);f.type('recoveryCode',code);f.type('password',password);f.type('passwordConfirm',password);}
cases.push(['saved recovery accepts an existing username and replaces the code only after confirmed success',async()=>{
 const f=await client();try{await f.recover();fillRecovery(f,'reader',savedCode);assert(f.form().checkValidity());f.form().requestSubmit();await until(()=>f.state().phase==='account-recovery');const call=f.calls.find(call=>call.url==='/api/auth/recover');assert.equal(call.body.username,'reader');assert.equal(call.body.recoveryCode,savedCode);assert.equal(f.state().accountRecovery,'b'.repeat(64));assert.equal(f.errors.length,0);}finally{f.end();}
}]);
cases.push(['saved recovery accepts the account verified email through native form validation',async()=>{
 const f=await client();try{await f.recover();fillRecovery(f,email,savedCode);assert(f.form().checkValidity(),'A verified email is a valid recovery identifier');f.form().requestSubmit();await until(()=>f.calls.some(call=>call.url==='/api/auth/recover'));assert.equal(f.calls.find(call=>call.url==='/api/auth/recover').body.username,email);}finally{f.end();}
}]);
cases.push(['recovery controller accepts verified email even when the submit event bypasses native validation',async()=>{
 const f=await client();try{await f.recover();fillRecovery(f,email,savedCode);f.form().dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setImmediate(resolve));assert(f.calls.some(call=>call.url==='/api/auth/recover'),'The controller must not apply registration username rules to recovery');}finally{f.end();}
}]);
cases.push(['saved recovery input leaves room for surrounding copied whitespace and sends a complete token',async()=>{
 const f=await client({configured:false});try{await f.recover();const pasted='  '+savedCode.toUpperCase()+'  ';fillRecovery(f,'reader',pasted);const field=f.form().elements.namedItem('recoveryCode');assert(field.maxLength<0||field.maxLength>=pasted.length,'Native paste must not truncate the complete token');assert(f.form().checkValidity());f.form().requestSubmit();await until(()=>f.calls.some(call=>call.url==='/api/auth/recover'));assert.equal(f.calls.find(call=>call.url==='/api/auth/recover').body.recoveryCode.toLowerCase(),savedCode);}finally{f.end();}
}]);
cases.push(['grouped saved recovery code normalizes whitespace, hyphens and uppercase before HTTP',async()=>{
 const f=await client();try{await f.recover();const grouped=savedCode.toUpperCase().match(/.{1,8}/g).join(' - ');fillRecovery(f,'reader',grouped);assert(f.form().checkValidity());f.form().requestSubmit();await until(()=>f.calls.some(call=>call.url==='/api/auth/recover'));assert.equal(f.calls.find(call=>call.url==='/api/auth/recover').body.recoveryCode,savedCode);}finally{f.end();}
}]);
cases.push(['invalid and email-length saved recovery codes stay local with a clear recovery-code error',async()=>{
 for(const code of [emailCode,'f'.repeat(63),'g'.repeat(64)]){const f=await client();try{await f.recover();fillRecovery(f,'reader',code);f.form().requestSubmit();await new Promise(resolve=>setImmediate(resolve));assert(!f.calls.some(call=>call.url==='/api/auth/recover'));assert.match(f.form().querySelector('[data-form-error]').textContent,/64|recovery code/i);}finally{f.end();}}
}]);
cases.push(['email verification preserves all eight digits including a leading zero through native submission',async()=>{
 const f=await client({signedIn:true});try{await f.emailVerification();const field=f.type('code',emailCode);assert.equal(field.type,'text');assert.equal(field.autocomplete,'one-time-code');assert(f.form().checkValidity());f.form().requestSubmit();await until(()=>f.calls.some(call=>call.url==='/api/auth/email/code/verify'));const call=f.calls.find(call=>call.url==='/api/auth/email/code/verify');assert.equal(call.body.code,emailCode);assert.equal(call.body.challengeId,challengeId);assert.equal(call.body.expectedAccountId,'fixture-account');}finally{f.end();}
}]);
cases.push(['email verification accepts a copied code with surrounding whitespace before native validation',async()=>{
 const f=await client({signedIn:true});try{await f.emailVerification();const pasted=' '+emailCode+' ',field=f.type('code',pasted);assert(field.maxLength<0||field.maxLength>=pasted.length,'Native paste must not discard a digit');assert(f.form().checkValidity(),'Copy padding must not block submission before normalization');f.form().requestSubmit();await until(()=>f.calls.some(call=>call.url==='/api/auth/email/code/verify'));assert.equal(f.calls.find(call=>call.url==='/api/auth/email/code/verify').body.code,emailCode);}finally{f.end();}
}]);
cases.push(['grouped eight-digit email code normalizes whitespace while preserving its leading zero',async()=>{
 const f=await client({signedIn:true});try{await f.emailVerification();f.type('code',' 0723 4567 ');assert(f.form().checkValidity());f.form().requestSubmit();await until(()=>f.calls.some(call=>call.url==='/api/auth/email/code/verify'));assert.equal(f.calls.find(call=>call.url==='/api/auth/email/code/verify').body.code,emailCode);}finally{f.end();}
}]);
cases.push(['letters, incomplete email codes and saved recovery codes never reach email verification',async()=>{
 for(const code of ['0723456','0723a567',savedCode]){const f=await client({signedIn:true});try{await f.emailVerification();f.type('code',code);f.form().requestSubmit();await new Promise(resolve=>setImmediate(resolve));assert(!f.calls.some(call=>call.url==='/api/auth/email/code/verify'));assert.match(f.form().querySelector('[data-form-error]').textContent,/8|eight|email/i);}finally{f.end();}}
}]);
(async()=>{let passed=0;for(const [name,run]of cases){try{await run();passed++;console.log('PASS '+name);}catch(error){process.exitCode=1;console.error('FAIL '+name+'\n'+error.stack);}}console.log(passed+'/'+cases.length+' recovery and verification UI checks passed (real DOM constraints; synthetic controlled HTTP).');})();
