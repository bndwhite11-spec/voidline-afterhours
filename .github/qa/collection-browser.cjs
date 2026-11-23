'use strict';
// Run from a built VOIDLINE checkout, using only ephemeral workerd D1/R2.
// The real browser sends HTTPS over loopback to a private Worker transport.
const assert=require('node:assert/strict');
const {readFile,mkdir,writeFile,mkdtemp,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {createServer}=require('node:https');
const {execFileSync}=require('node:child_process');
const {createRequire}=require('node:module');
const {randomBytes}=require('node:crypto');
const {resolve,join}=require('node:path');
const {pathToFileURL}=require('node:url');

async function run(){
  const root=process.cwd(),fixtureOnly=process.argv.includes('--preflight');
  const fromProject=createRequire(join(root,'package.json'));
  const {Miniflare}=createRequire(fromProject.resolve('wrangler'))('miniflare');
  const {verificationMailbox}=await import(pathToFileURL(join(root,'scripts/verification-mailbox.mjs')));
  let unexpected=0,browser,runtime;
  const posts=[],apiLog=[],certDir=await mkdtemp(join(tmpdir(),'voidline-local-https-'));
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',join(certDir,'key.pem'),'-out',join(certDir,'cert.pem')],{stdio:'ignore'});
  const server=createServer({key:await readFile(join(certDir,'key.pem')),cert:await readFile(join(certDir,'cert.pem'))},async(req,res)=>{
    try{
      assert(req.url.startsWith('/')&&!req.url.startsWith('//'));
      const url=new URL(req.url,origin),headers=new Headers();
      for(const [key,val] of Object.entries(req.headers))if(typeof val==='string')headers.set(key,val);
      headers.set('accept-encoding','identity');
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const method=req.method;
      const resp=await runtime.dispatchFetch(url.href,{method,headers,redirect:'manual',body:chunks.length?Buffer.concat(chunks):undefined});
      for(const [key,val] of resp.headers)if(!['content-encoding','content-length','set-cookie','transfer-encoding'].includes(key))res.setHeader(key,val);
      const cookies=resp.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
      if(method==='POST')posts.push([url.pathname,resp.status]);
      if(url.pathname.startsWith('/api/'))apiLog.push([method,url.pathname.replace(/[0-9a-f-]{28,}/g,'…'),resp.status]);
      const bytes=Buffer.from(await resp.arrayBuffer());res.writeHead(resp.status);res.end(bytes);
    }catch(error){if(!res.headersSent)res.writeHead(502);res.end();if(!res.destroyed)console.error('Local bridge error',error.name);}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='https://127.0.0.1:'+server.address().port;
  const mailbox=verificationMailbox(origin,()=>{unexpected++;return new Response(null,{status:502});});
  runtime=new Miniflare({modules:true,script:await readFile(join(root,'dist/server/index.js'),'utf8'),
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
      const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,serviceWorkers:'block',ignoreHTTPSErrors:true,reducedMotion:'reduce'});
      const page=await ctx.newPage(),errors=[];posts.length=0;apiLog.length=0;
      page.on('pageerror',e=>errors.push(e.name));
      page.setDefaultTimeout(15000);
      await ctx.route(url=>url.origin!==origin,route=>{unexpected++;return route.abort();});
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
        await page.waitForFunction(()=>/^12 designs\b/.test(document.querySelector('#vc-result-count')?.textContent||''));
        const card=id=>page.locator('.vc-card[data-design-id="'+id+'"]:visible');
        await card('gift-cartridge-rain-check').waitFor();
        assert.match(await card('gift-cartridge-rain-check').innerText(),/free edition/i);
        const capsule='gift-edition-cartridge-text-back';
        assert.match(await card(capsule).innerText(),/capsule edition/i);
        assert.equal(await page.locator('#vc-design-grid > .vc-card:visible').count(),12);
        await card(capsule).getByRole('button',{name:/^Inspect /}).click();
        const dialog=page.locator('#home-dialog[open]');
        await dialog.getByText('How to obtain',{exact:true}).click();
        assert.match(await dialog.innerText(),/Choice Capsule/);
        assert.equal(await dialog.locator('[data-vc-action="claim"]').count(),0);
        await dialog.locator('#vc-inspection-scene > .va-asset svg').waitFor();
        const layout=await dialog.locator('.cl-model-detail').evaluate(detail=>{
          const rect=selector=>detail.querySelector(selector).getBoundingClientRect();
          const frame=rect('#vc-inspection-frame'),backdrop=rect('#vc-inspection-frame > .va-backdrop');
          const artwork=rect('#vc-inspection-scene > .va-asset'),stage=rect('.vc-stage-column'),info=rect('.cl-model-info');
          return {artWidth:artwork.width,artHeight:artwork.height,
            frameWidth:frame.width,frameHeight:frame.height,
            backdropError:Math.max(...['left','right','top','bottom'].map(edge=>Math.abs(frame[edge]-backdrop[edge]))),
            columns:getComputedStyle(detail).gridTemplateColumns.trim().split(/\s+/).length,
            sideBySide:info.left>=stage.right-1&&Math.abs(info.top-stage.top)<2,
            stacked:info.top>=stage.bottom-1};
        });
        assert(layout.artWidth>=210&&layout.artHeight>=210,'Foreground SVG wrapper is undersized: '+JSON.stringify(layout));
        assert(layout.backdropError<=2,'Backdrop must cover the frame: '+JSON.stringify(layout));
        if(width>720)assert(layout.columns===2&&layout.sideBySide,'Desktop model details must appear beside the stage: '+JSON.stringify(layout));
        else assert(layout.columns===1&&layout.stacked,'Mobile model details must appear beneath the stage: '+JSON.stringify(layout));
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
        results.push({width,height,layout,emptyBeforeOwnClaim:true,editionsInFamily:2,familyDesigns:12,ownedCopies:1,utcDays:1,requestLists:2});
      }catch(error){
        console.error(String(error.stack||error).split('\n').slice(0,6).join('\n'));
        await page.screenshot({path:join(directory,'failure-'+width+'.png'),timeout:3000}).catch(()=>{});
        const headers=await page.locator('h1,h2,h3,#home-dialog[open] [role="alert"]').allTextContents().catch(()=>[]);
        console.error('Fixture stage evidence',JSON.stringify({width,headers:headers.slice(0,12),errors,posts,apiLog:apiLog.slice(-9)}));
        throw error;
      }finally{await ctx.unrouteAll({behavior:'wait'});await ctx.close();}
    }
    assert.equal(unexpected,0);
    const result={engine,version:browser.version(),environment:'Real loopback HTTPS to local workerd/D1/R2, private mailbox; no production or physical device',results};
    await writeFile(join(directory,'results.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await runtime.dispose();await rm(certDir,{recursive:true,force:true});}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
