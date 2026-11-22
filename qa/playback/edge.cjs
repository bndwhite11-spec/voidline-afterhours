const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const context = await browser.newContext({reducedMotion:'no-preference'});
  const page = await context.newPage();
  page.on('pageerror', err => console.error(err.message));
  const origin = 'https://voidline-afterhours.pipedcactus1.chatgpt.site';
  const manifest = await (await context.request.get(origin+'/art/v4/manifest.json')).json();
  const gifts = manifest.items.filter(x=>x.series==='Copium Cartridges'||x.id==='gift-copium-cartridge');
  assert.equal(gifts.length,6);
  for (const gift of gifts) {
   await page.goto(origin+'/art-review.html?item='+gift.id,{waitUntil:'domcontentloaded'});
   try {
    await page.waitForFunction(()=>document.querySelector('#ar-status')?.textContent==='Resting artwork');
    assert.equal(await page.locator('#ar-title').textContent(),gift.name);
    await page.locator('#ar-play').click();
    await page.waitForFunction(()=>document.querySelector('#ar-status')?.textContent==='Preview complete.');
    assert.equal(await page.locator('#ar-frame').inputValue(),'100');
    console.log('PASS',gift.name,browser.version());
   } catch (e) {
    console.error(await page.locator('body').innerText().then(s=>s.slice(-1100)));throw e;
   }
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
