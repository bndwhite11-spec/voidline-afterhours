'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs/promises');
const playwright = require('playwright');

const origin = 'https://voidline-afterhours.pipedcactus1.chatgpt.site';
const release = {
  '/art/v4/manifest.json': '4b2d41564be785718abfb09d7eb09d10c01665ba0169630a8f4ec803789be626',
  '/art-review.js': '2618b4ee4f39f3e157dc83f5f5aa8d19467e899bb59d6658c06ec2377e0f20a8',
  '/collectible-art.js': 'ecc05975711a8fc7d5cee5d4db3d7b32dd746af39416c12de04c147b8bf6bed4',
};
const originalId = 'gift-copium-cartridge';
const series = 'Copium Cartridges';
const engine = process.env.ENGINE;
assert(['chromium', 'firefox', 'webkit'].includes(engine), 'Set ENGINE to a Playwright browser name.');
const evidence = path.resolve('qa-browser-output');
const results = [];
const sizes = [[320, 568], [390, 844], [768, 1024], [1440, 900]];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function matchingRelease(request) {
  let manifest;
  for (const [route, digest] of Object.entries(release)) {
    const response = await request.get(origin + route, {timeout: 35000, maxRetries: 2});
    assert.equal(response.status(), 200, route);
    const bytes = await response.body();
    assert.equal(hash(bytes), digest, route + ' digest differs from the release under test');
    if (route.endsWith('.json')) manifest = JSON.parse(bytes.toString('utf8'));
  }
  const original = manifest.items.find(row => row.id === originalId);
  const variants = manifest.items.filter(row => row.series === series);
  assert.equal(original.artRevision, 'workshop-02');
  assert.equal(variants.length, 5);
  return [original, ...variants];
}

async function status(page, text) {
  await page.waitForFunction(expected => document.querySelector('#ar-status')?.textContent === expected, text, {timeout: 18000});
}

async function geometry(page, open) {
  const {viewport, pageScroll, dialog, columns, close, play} = await page.evaluate(() => {
    const root = document.documentElement;
    const modal = document.querySelector('#ar-dialog');
    const rect = modal.getBoundingClientRect();
    const target = id => document.querySelector(id).getBoundingClientRect().height;
    return {
      viewport: root.clientWidth,
      pageScroll: root.scrollWidth,
      columns: getComputedStyle(document.querySelector('#ar-grid')).gridTemplateColumns.split(/\s+/).length,
      dialog: {left: rect.left, right: rect.right, width: modal.clientWidth, scroll: modal.scrollWidth},
      close: target('#ar-close'), play: target('#ar-play'),
    };
  });
  assert(pageScroll <= viewport + 1, 'page overflows horizontally at ' + viewport + 'px: ' + pageScroll);
  if (open) {
    assert(dialog.left >= -1 && dialog.right <= viewport + 1 && dialog.scroll <= dialog.width + 1,
      'dialog overflows at ' + viewport + 'px: ' + JSON.stringify(dialog));
    assert(close >= 43 && play >= 43, 'Close/Play touch target smaller than 44px');
  }
  return {viewport, columns};
}

async function atWidth(browser, width, height, models) {
  const context = await browser.newContext({
    viewport: {width, height}, reducedMotion: 'no-preference',
    ...(engine === 'firefox' ? {} : {isMobile: width <= 768}),
    hasTouch: width <= 768,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method() + ' ' + request.url()); });
  try {
    const dialog = page.locator('#ar-dialog');
    const res = await page.goto(origin + '/art-review.html?item=' + originalId, {waitUntil: 'domcontentloaded'});
    assert.equal(res.status(), 200);
    for (const [index, model] of models.entries()) {
      if (index === 1) {
        await page.locator('#ar-series').selectOption(series);
        assert.equal(await page.locator('[data-art-open]:visible').count(), 5);
      }
      const card = page.locator('[data-art-open="' + model.id + '"]');
      if (index !== 0) await card.click();
      await status(page, 'Resting artwork');
      assert.equal(await page.locator('#ar-title').innerText(), model.name);
      await geometry(page, true);
      assert.equal(await page.locator('#ar-stage svg').count(), 1);
      // The release player verifies the source hash before mounting this SVG.
      assert.equal(new URL(await page.locator('#ar-download').getAttribute('href'), origin).pathname, model.variants.detail.url);
      await page.locator('#ar-play').click();
      await status(page, 'Playing once');
      await status(page, 'Preview complete.');
      assert.equal(await page.locator('#ar-frame').inputValue(), '100');
      if (index === 0) await page.screenshot({path: path.join(evidence, engine + '-' + width + '-preview.png')});
      await page.locator('#ar-close').click();
      await dialog.waitFor({state:'hidden'});
      await page.waitForFunction(id => document.activeElement?.dataset.artOpen === id, model.id);
    }
    const layout = await geometry(page, false);
    const expectedColumns = width <= 360 ? 1 : width <= 640 ? 2 : null;
    if (expectedColumns) assert.equal(layout.columns, expectedColumns);
    else assert(layout.columns >= 3);
    await page.screenshot({path: path.join(evidence, engine + '-' + width + '-series.png')});
    await page.emulateMedia({reducedMotion:'reduce'});
    for (const model of models) {
      if (model.id === originalId) await page.locator('#ar-series').selectOption('all');
      await page.locator('[data-art-open="' + model.id + '"]').click();
      await page.waitForFunction(() => document.querySelector('#ar-status').textContent.includes('Reduced motion is on'));
      assert(await page.locator('#ar-play').isDisabled());
      assert(await page.locator('#ar-frame').isDisabled());
      assert.equal(await page.locator('#ar-stage svg').count(), 1);
      assert.equal(await page.locator('#ar-stage').evaluate(node => node.getAnimations({subtree:true}).filter(a => a.playState === 'running').length), 0);
      await page.locator('#ar-close').click();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    const summary = {engine, width, height, columns:layout.columns, played:models.length, reducedMotion:models.length};
    results.push(summary);
    console.log('PASS', JSON.stringify(summary));
  } catch (error) {
    await page.screenshot({path:path.join(evidence, engine + '-' + width + '-failure.png')}).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  await fs.mkdir(evidence,{recursive:true});
  const browser = await playwright[engine].launch();
  const request = await playwright.request.newContext();
  try {
    const models = await matchingRelease(request);
    for (const [width, height] of sizes) await atWidth(browser, width, height, models);
  } finally {
    await fs.writeFile(path.join(evidence, engine + '-summary.json'), JSON.stringify(results, null, 2));
    await request.dispose();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
