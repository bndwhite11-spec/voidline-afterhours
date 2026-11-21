/** Exercise the shipped web UI and Worker together using fresh, private D1/R2
 * bindings on each run. No live account, network, layout or device is involved.
 *
 * node scripts/verify-web-workspace.mjs --candidate dist/server/index.js
 * node scripts/verify-web-workspace.mjs --baseline before.mjs --candidate after.mjs --pairs 3 --output results.json
 */
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash, randomBytes, webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {CookieJar, JSDOM, VirtualConsole, requestInterceptor} from 'jsdom';
import {IDBFactory, IDBKeyRange} from 'fake-indexeddb';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const wrangler = createRequire(require.resolve('wrangler'));
const {Miniflare} = await import(pathToFileURL(wrangler.resolve('miniflare')));
const origin = 'https://quality.voidline.example';
const args = parseArgs({options: {
  baseline:{type:'string'}, candidate:{type:'string',default:resolve(root,'dist/server/index.js')},
  pairs:{type:'string',default:'1'}, output:{type:'string'},
}}).values;
const pairCount=Number(args.pairs);
assert(Number.isInteger(pairCount) && pairCount>0 && pairCount<=20,'Choose 1–20 repetitions.');

async function migrate(db) {
  const folder = new URL('../drizzle/', import.meta.url);
  const journal = JSON.parse(await readFile(new URL('meta/_journal.json', folder), 'utf8'));
  for (const {tag} of journal.entries) {
    const sql = await readFile(new URL(tag+'.sql',folder),'utf8');
    for (const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))
      await db.prepare(statement).run();
  }
}
const delay = ms=>new Promise(done=>setTimeout(done,ms));

async function run(script) {
  let outbound=0, stage='setup', dom;
  const runtime = new Miniflare({
    modules:true,script,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
    d1Databases:['DB'],r2Buckets:['MEDIA'],d1Persist:false,r2Persist:false,
    outboundService:()=>{outbound++;return new Response(null,{status:502});},
  });
  const jar=new CookieJar(), seen=[], clientErrors=[];
  const timings={};
  let guestRequests, guestRequestStarts, guestByKind, signOutDefault;
  const started={document:0,script:0,style:0,api:0,other:0};
  const browserFailures=[];
  let closing=false;

  async function exchange(input, init={}) {
    const destination=new URL(typeof input==='string'?input:input.url,origin);
    if(destination.origin!==origin){outbound++;throw Error('External browser request denied');}
    if(closing)return new Response(null,{status:503});
    const path=destination.pathname;
    if(path==='/chats')started.document++;
    else if(path.startsWith('/api/'))started.api++;
    else if(path.endsWith('.js'))started.script++;
    else if(path.endsWith('.css'))started.style++;
    else started.other++;
    const method=init.method||input.method||'GET';
    const headers=new Headers(init.headers||input.headers||{});
    if(method!=='GET' && method!=='HEAD')headers.set('origin',origin);
    const cookies=jar.getCookieStringSync(destination.href);
    headers.delete('cookie');
    if(cookies)headers.set('cookie',cookies);
    headers.set('accept-encoding','identity');
    const response=await runtime.dispatchFetch(destination.href,{method,headers,body:init.body??undefined});
    for(const value of response.headers.getSetCookie())jar.setCookieSync(value,destination.href);
    const body=await response.arrayBuffer(), outgoing=new Headers(response.headers);
    for(const key of ['content-length','content-encoding','set-cookie'])outgoing.delete(key);
    seen.push({path:destination.pathname, method, status:response.status});
    if(response.status>=400 && !(destination.pathname==='/api/auth/session' && response.status===401))
      browserFailures.push(response.status);
    return new Response(body.byteLength?body:null,{status:response.status,headers:outgoing});
  }
  function $ (selector) {return dom.window.document.querySelector(selector);}
  function event(type) {return new dom.window.Event(type,{bubbles:true,cancelable:true});}
  async function until(predicate) {
    const deadline=Date.now()+20000;
    while(!predicate()){
      if(Date.now()>deadline)throw Error('UI condition timed out');
      await delay(10);
    }
  }
  async function element(selector) {await until(()=>$(selector));return $(selector);}
  async function click(selector) {(await element(selector)).click();}
  const action = name=>click('[data-home="'+name+'"]');
  async function measure(key,callback) {
    stage=key;
    const start=performance.now();
    await callback();
    timings[key]=Math.round(performance.now()-start);
  }
  function fill(form,fields) {
    for(const [name,value]of Object.entries(fields)) {
      const input=form.elements.namedItem(name);
      assert.ok(input,'Expected form field');
      input.value=value;input.dispatchEvent(event('input'));
    }
  }
  async function json(path) {
    const response=await exchange(path);
    assert.equal(response.status,200,'Authorized data should be available');
    return response.json();
  }
  const username='quality_guest', password=randomBytes(26).toString('hex');
  const bio='Բարեւ • مرحبا 🎛️', message='Բարեւ workspace • مرحبا';
  const communityName='Fixture workshop';
  try {
    const db=await runtime.getD1Database('DB');await migrate(db);
    const one=(sql,...params)=>db.prepare(sql).bind(...params).first();
    const state=()=>dom.window.VoidHome?.state;
    await measure('guestEntry',async()=>{
      const markup=await(await exchange('/chats')).text();
      const log=new VirtualConsole();
      log.on('jsdomError',error=>{if(error.type!=='css-parsing' && !error.message.startsWith('Could not parse CSS'))clientErrors.push(error.type||'runtime');});
      dom=new JSDOM(markup,{
        url:origin+'/chats',cookieJar:jar,pretendToBeVisual:true,runScripts:'dangerously',
        virtualConsole:log,resources:{interceptors:[requestInterceptor(req=>exchange(req))]},
        beforeParse(w) {
          Object.assign(w,{fetch:exchange,Response,Request,Headers,TextEncoder,TextDecoder,indexedDB:new IDBFactory(),IDBKeyRange});
          Object.defineProperty(w,'crypto',{value:webcrypto});
          w.matchMedia=media=>({media,matches:false,addEventListener(){},removeEventListener(){}});
          w.HTMLElement.prototype.scrollIntoView=function(){};
          w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
          w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
        },
      });
      await element('[data-home-form="login"]');
    });
    guestRequests=seen.length;
    guestByKind={...started};guestRequestStarts=Object.values(guestByKind).reduce((sum,n)=>sum+n,0);
    await action('auth-register');
    const signup=await element('[data-home-form="register"]');
    fill(signup,{username,displayName:'Quality fixture',password,passwordConfirm:password});
    await measure('signupToWorkspace',async()=>{
      signup.dispatchEvent(event('submit'));
      await action('finish-recovery');
      await until(()=>state()?.phase==='ready'&&$('[data-home="create"]')&&!$('[data-home="finish-recovery"]'));
    });
    const id=state().account.id;
    assert.ok(typeof id==='string'&&id.length>0,'Signed-in UI must identify an account');
    assert.ok((await one('SELECT id FROM live_accounts WHERE username=?',username))?.id===id,'UI and D1 must agree on the immutable identity');
    assert.equal(state().nativeConversations.length,0);assert.equal(state().communities.length,0);
    for(const table of ['live_memberships','native_members','live_messages','native_messages'])
      assert.equal((await one('SELECT COUNT(*) AS n FROM '+table)).n,0,'Fresh account has empty messaging tables');

    await measure('profileOpen',async()=>{
      if(!$('[data-home="profile"]'))await action('you');
      await until(()=>$('[data-home="profile"]')||$('[data-vp-action="edit"]'));
      if($('[data-vp-action="edit"]'))await click('[data-vp-action="edit"]');else await action('profile');
      await element('[data-vp-form="profile"] [name="bio"]');
    });
    stage='profileSave';
    const editor=await element('[data-vp-form="profile"]');
    fill(editor,{bio});editor.dispatchEvent(event('submit'));
    await until(()=>seen.some(r=>r.path==='/api/profiles/me'&&r.method!=='GET'&&r.status===200));
    const profile=await json('/api/profiles/me');
    assert.ok(profile.profile?.bio===bio,'Saved profile should round-trip via authorized API');
    assert.ok((await one('SELECT bio FROM live_accounts WHERE id=?',id))?.bio===bio,'Mixed-script profile should persist under the same account');
    await action('close-dialog');

    await measure('collectionOpen',async()=>{
      await action('cosmetics-collection');
      await element('#vc-design-search');await element('[data-vc-action="inspect"][data-item="gift-rose"]');
    });
    stage='collectionFilter';
    const search=$('#vc-design-search');search.value='Chrome Rose';search.dispatchEvent(event('input'));
    await until(()=>{
      const cards=dom.window.document.querySelectorAll('#vc-design-grid > .vc-card:not([hidden])');
      return cards.length===1&&cards[0].querySelector('[data-vc-action="inspect"][data-item="gift-rose"]');
    });
    await measure('giftInspect',async()=>{
      await click('[data-vc-action="inspect"][data-item="gift-rose"]');
      await until(()=>$('#home-dialog[open]')?.textContent.includes('Chrome Rose'));
    });
    const inventory=await json('/api/cosmetics/inventory');
    assert.equal(inventory.claimedDesigns.length,0);assert.equal(inventory.instances.length,0);
    assert.equal((await one('SELECT COUNT(*) AS n FROM cosmetic_ownership')).n,0);
    assert.equal((await one('SELECT COUNT(*) AS n FROM gift_instances')).n,0);
    await action('close-dialog');

    stage='communityCreate';await action('create');
    const create=await element('[data-home-form="create"]');fill(create,{name:communityName});create.dispatchEvent(event('submit'));
    await until(()=>state().communities?.some(room=>room.name===communityName));
    const room=state().communities.find(room=>room.name===communityName);
    assert.ok((await one('SELECT created_by FROM live_communities WHERE id=?',room.id))?.created_by===id);
    assert.equal((await one('SELECT COUNT(*) AS n FROM live_memberships WHERE account_id=? AND community_id=?',id,room.id)).n,1);

    stage='standardMessage';
    await until(()=>$('[data-home="native-consent"]')||$('#home-native-input'));
    if($('[data-home="native-consent"]')){
      await action('native-consent');
      const consent=await element('[data-home-form="native-consent"]');
      consent.elements.namedItem('acknowledge').checked=true;consent.dispatchEvent(event('submit'));
    }
    const composer=await element('#home-native-input');
    composer.value=message;composer.dispatchEvent(event('input'));
    $('[data-home-form="native-message"]').dispatchEvent(event('submit'));
    await until(()=>state().messages?.some(row=>row.text===message));
    const ack=state().messages.find(row=>row.text===message);
    const row=await one('SELECT m.id,m.author_id,c.community_id FROM live_messages m JOIN live_channels c ON c.id=m.channel_id WHERE m.text=?',message);
    assert.ok(row?.id===ack.id&&row.author_id===id&&row.community_id===room.id,'Rendered message must match durable author, channel and message identity');
    assert.equal((await one('SELECT COUNT(*) AS n FROM live_messages')).n,1);

    stage='logout';await action('you');await action('logout');await element('[data-home="auth-login"]');
    assert.equal((await exchange('/api/auth/session')).status,401,'Server should revoke the signed-out session');
    signOutDefault=$('[data-home-form="login"]')?'login':'createAccount';
    if(signOutDefault==='createAccount')await action('auth-login');
    const login=await element('[data-home-form="login"]');fill(login,{username,password});
    await measure('loginToWorkspace',async()=>{
      login.dispatchEvent(event('submit'));
      await until(()=>state()?.account?.id===id&&state().communities?.some(item=>item.id===room.id));
    });
    assert.equal((await one('SELECT COUNT(*) AS n FROM live_accounts')).n,1);
    assert.equal((await one('SELECT COUNT(*) AS n FROM live_messages WHERE author_id=?',id)).n,1);
    assert.equal(outbound,0,'All transport must stay inside the fixture');
    assert.equal(clientErrors.length,0,'Uncaught document runtime errors');
    assert.equal(browserFailures.length,0,'Unexpected HTTP errors');
    return {timings,guestRequests,guestRequestStarts,guestByKind,signOutDefault};
  } catch (error) {
    // Exception and API text may contain account input. Only report the
    // scenario boundary, safe assertion label and error category.
    const safe=error.code==='ERR_ASSERTION'?'state assertion':error.message==='UI condition timed out'?'UI timeout':'transport or runtime error';
    throw Error('Workspace check failed in '+stage+' ('+safe+').');
  } finally {closing=true;dom?.window.close();await runtime.dispose();}
}

function median(values) {
  const sorted=[...values].sort((a,b)=>a-b), middle=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
}
const builds={};
for(const variant of ['baseline','candidate'])if(args[variant]){
  const script=await readFile(resolve(args[variant]),'utf8');
  builds[variant]={script,sha256:createHash('sha256').update(script).digest('hex'),runs:[]};
}
const order=[];
for(let pair=0;pair<pairCount;pair++){
  const variants=Object.keys(builds);
  if(pair%2)variants.reverse();
  for(const variant of variants){
    const result=await run(builds[variant].script);
    order.push(variant);builds[variant].runs.push(result);
    console.log('PASS '+variant+' workspace, pair '+(pair+1)+'/'+pairCount);
  }
}
const results={environment:'Node '+process.version+', jsdom, local workerd/D1/R2; no browser painting or external transport',units:'milliseconds',guestCheckpoint:'First queryable login form on /chats. guestRequests counts completed local HTTP responses; guestRequestStarts and guestByKind count requests started by that point.',order,builds:{}};
for (const [variant,{sha256,runs}]of Object.entries(builds)){
  const medians=Object.fromEntries(Object.keys(runs[0].timings).map(key=>[key,median(runs.map(row=>row.timings[key]))]));
  results.builds[variant]={sha256,runs,medians};
}
if(args.output)await writeFile(resolve(args.output),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
