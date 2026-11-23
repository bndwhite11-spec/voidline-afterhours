'use strict';
// Run from a built VOIDLINE checkout, using only ephemeral workerd D1/R2.
// The browser targets a reserved HTTPS origin intercepted by the isolated Worker.
const assert=require('node:assert/strict');
const {readFile,mkdir,writeFile}=require('node:fs/promises');
const {createRequire}=require('node:module');
const {randomBytes}=require('node:crypto');
const {resolve,join}=require('node:path');
const {pathToFileURL}=require('node:url');

async function run(){
  const root=process.cwd(),fixtureOnly=process.argv.includes('--preflight');
  const fromProject=createRequire(join(root,'package.json'));
  const {Miniflare}=createRequire(fromProject.resolve('wrangler'))('miniflare');
  const {verificationMailbox}=await import(pathToFileURL(join(root,'scripts/verification-mailbox.mjs')));
  const origin='https://qa.voidline.example';
  let unexpected=0,browser;
  const mailbox=verificationMailbox(origin,()=>{unexpected++;return new Response(null,{status:502});});
  const runtime=new Miniflare({modules:true,script:await readFile(join(root,'dist/server/index.js'),'utf8'),
    compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],
    bindings:{...mailbox.bindings,CAPSULE_COLLECTOR_EDITION:'1'},outboundService:request=>mailbox.exchange(request)});
  const directory=resolve(process.env.QA_EVIDENCE||'qa-evidence'),results=[];
  async function api(path,body){
    const response=await runtime.dispatchFetch(origin+path,{method:'POST',headers:{origin,'content-type':'application/json','x-voidline-auth':'1'},body:JSON.stringify(body)});
    assert(response.ok,path+' failed with '+response.status);
    return response.json();
  }
  async function actor(name){
    const email=name+'@example.test',password=randomBytes(26).toString('hex');
    await api('/api/auth/register/email',{email});
    const token=new URL(mailbox.take(email)).hash.split('=')[1];
    const {account}=await api('/api/auth/register',{emailToken:token,username:name,displayName:'Private collector fixture',password});
    assert(account.id);
    return {id:account.id,email,password};
  }
  try{
    const db=await runtime.getD1Database('DB'),folder=join(root,'drizzle');
    const journal=JSON.parse(await readFile(join(folder,'meta/_journal.json'),'utf8'));
    for(const {tag} of journal.entries){
      const sql=await readFile(join(folder,tag+'.sql'),'utf8');
      for(const stmt of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(stmt).run();
    }
    const first=await actor('private_desktop'),second=await actor('private_phone');
    assert.notEqual(first.id,second.id);
    const empty=await db.prepare('SELECT COUNT(*) n FROM gift_instances').first();
    assert.equal(empty.n,0);
    assert.equal(unexpected,0);
    if(fixtureOnly){console.log('Two verified fixture accounts registered through an isolated signup-mail transport.');return;}
    const engine=process.env.QA_ENGINE||'chromium';
    assert(['chromium','webkit'].includes(engine));
    browser=await require('playwright')[engine].launch({headless:true});
    await mkdir(directory,{recursive:true});
    for(const [person,width,height] of [[first,1440,900],[second,390,844]]){
      const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,serviceWorkers:'block',reducedMotion:'reduce'});
      const page=await ctx.newPage(),errors=[],posts=[];
      page.on('pageerror',e=>errors.push(e.name));
      page.setDefaultTimeout(15000);
      await ctx.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.origin!==origin){unexpected++;return route.abort();}
        const headers=new Headers(await request.allHeaders());
        headers.set('accept-encoding','identity');
        const method=request.method();
        const resp=await runtime.dispatchFetch(request.url(),{method,headers,body:method==='GET'||method==='HEAD'?undefined:request.postDataBuffer()});
        const outgoing=Object.fromEntries(resp.headers);delete outgoing['content-length'];delete outgoing['content-encoding'];delete outgoing['set-cookie'];
        const cookies=resp.headers.getSetCookie();
        // Playwright fulfill() collapses multi-value headers, which WebKit
        // interprets differently. Deliver each Worker-issued cookie separately
        // to this browser's real cookie jar, retaining scope and expiry.
        if(cookies.length){
          const sessionCookies=cookies.map(raw=>{
            const [pair,...bits]=raw.split(';').map(s=>s.trim());
            const offset=pair.indexOf('='),attrs=new Map(bits.map(s=>s.split('=').map(x=>x.toLowerCase())));
            assert(attrs.has('secure')&&attrs.get('path')==='/'&&!attrs.has('domain'));
            return {name:pair.slice(0,offset),value:pair.slice(offset+1),domain:url.hostname,path:'/',
              httpOnly:attrs.has('httponly'),secure:true,sameSite:attrs.get('samesite')==='strict'?'Strict':'Lax',
              expires:Math.floor(Date.now()/1000)+Number(attrs.get('max-age'))};
          });
          await ctx.addCookies(sessionCookies);
        }
        if(method==='POST')posts.push([url.pathname,resp.status]);
        const bytes=Buffer.from(await resp.arrayBuffer());
        await route.fulfill({status:resp.status,headers:outgoing,body:bytes});
      });
      try{
        await page.goto(origin+'/chats',{waitUntil:'domcontentloaded'});
        const form=page.locator('[data-home-form="login"]');
        await form.locator('[name="username"]').fill(person.email);
        await form.locator('[name="password"]').fill(person.password);
        await form.locator('[type="submit"]').click();
        await page.waitForFunction(id=>window.VoidHome?.state?.phase==='ready'&&window.VoidHome.state.account?.id===id,person.id);
        await page.goto(origin+'/chats#collection',{waitUntil:'domcontentloaded'});
        const hub=page.locator('nav[aria-label="Collection sections"]');
        const tab=id=>hub.locator('[data-section="'+id+'"]');
        await page.locator('.cl-modes').waitFor();
        assert.equal(await tab('collected').getAttribute('aria-current'),'page');
        assert.equal(await page.locator('[data-cl="inspect"][data-copy]').count(),0);
        assert.deepEqual(await hub.getByRole('button').allTextContents(),['My gifts','Discover','Earn','Requests']);
        await tab('browse').click();
        await page.locator('.vc-family-picker > summary').click();
        await page.locator('[data-vc-action="discover-family"][data-family="Copium Cartridges"]').click();
        const card=id=>page.locator('.vc-card[data-design-id="'+id+'"]:visible');
        await card('gift-cartridge-rain-check').waitFor();
        assert.match(await card('gift-cartridge-rain-check').innerText(),/free edition/i);
        const capsule='gift-edition-cartridge-text-back';
        assert.match(await card(capsule).innerText(),/capsule edition/i);
        assert.equal(await page.locator('.vc-card:visible').count(),12);
        await card(capsule).getByRole('button',{name:/^Inspect /}).click();
        const dialog=page.locator('#home-dialog[open]');
        await dialog.getByText('How to obtain',{exact:true}).click();
        assert.match(await dialog.innerText(),/Choice Capsule/);
        assert.equal(await dialog.locator('[data-vc-action="claim"]').count(),0);
        await page.screenshot({path:join(directory,'catalog-'+width+'.png')});
        await dialog.locator('[data-home="close-dialog"]').click();
        await card('gift-cartridge-rain-check').getByRole('button',{name:/^Inspect /}).click();
        const claim=dialog.locator('[data-vc-action="claim"]');
        await claim.click();
        await page.waitForFunction(()=>!document.querySelector('#home-dialog[open] [data-vc-action="claim"]'));
        const copy=await db.prepare('SELECT id FROM gift_instances WHERE catalog_id=? AND owner_id=?').bind('gift-cartridge-rain-check',person.id).first();
        assert(copy?.id);
        await dialog.locator('[data-home="close-dialog"]').click();
        await tab('collected').click();
        await page.locator('[data-copy="'+copy.id+'"]').waitFor();
        assert.equal(await page.locator('[data-cl="inspect"][data-copy]').count(),1);
        await tab('collector').click();
        await page.locator('[data-cl="check-in"]').click();
        await page.getByText('Today’s participation is recorded.',{exact:true}).waitFor();
        assert.match(await page.locator('.cl-progress').first().innerText(),/1 of 3 UTC days/);
        await page.screenshot({path:join(directory,'earn-'+width+'.png')});
        await tab('requests').click();
        await page.locator('#vc-gift-list').getByText('No gifts yet',{exact:true}).waitFor();
        await page.locator('button[data-vc-action="transfers"]').first().click();
        await page.waitForFunction(()=>/No transfer requests/i.test(document.querySelector('#vc-transfer-list')?.textContent||''));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
        assert.deepEqual(errors,[]);
        assert.equal(posts.filter(([p,s])=>p==='/api/capsules/check-in'&&s<300).length,1);
        assert.equal(posts.filter(([p,s])=>p==='/api/cosmetics/claim'&&s<300).length,1);
        results.push({width,height,emptyBeforeOwnClaim:true,editionsInFamily:2,familyDesigns:12,ownedCopies:1,utcDays:1,requestLists:2});
      }catch(error){
        console.error(String(error.stack||error).split('\n').slice(0,6).join('\n'));
        await page.screenshot({path:join(directory,'failure-'+width+'.png'),timeout:3000}).catch(()=>{});
        const headers=await page.locator('h1,h2,h3,#home-dialog[open] [role="alert"]').allTextContents().catch(()=>[]);
        console.error('Fixture stage evidence',JSON.stringify({width,headers:headers.slice(0,12),errors,posts}));
        throw error;
      }finally{await ctx.unrouteAll({behavior:'wait'});await ctx.close();}
    }
    assert.equal(unexpected,0);
    const result={engine,version:browser.version(),environment:'Browser with intercepted HTTPS to local workerd/D1/R2, private mailbox; no production or physical device',results};
    await writeFile(join(directory,'results.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  }finally{await browser?.close();await runtime.dispose();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
