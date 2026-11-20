const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {JSDOM} = require('jsdom');

(async function verifySavedLooks() {
  const dom = new JSDOM('<main></main>', {runScripts:'outside-only'});
  try {
    const {window} = dom;
    const root = window.document.querySelector('main');
    window.VoidHome = {state:{account:{id:'fixture-owner'}}};
    window.eval(readFileSync(join(__dirname,'../dist/profile-looks.js'),'utf8'));
    const draft = {avatar:'ghost',banner:'orchid',accent:'lilac',nameStyle:'serif',profileFrame:'halo'};
    const writes = [], looks = [];
    let applied;
    async function request(path, data) {
      if (!data) return {looks};
      writes.push(path);
      if (path.endsWith('/save')) looks.push(data);
      if (path.endsWith('/remove')) looks.splice(0);
      return {};
    }
    window.VoidProfileLooks.mount({root,accountId:'fixture-owner',request,
      read:()=>({...draft,bio:'private',detailsVisibility:'public'}),
      apply:values=>{applied=values;}});
    const click = async selector => {
      root.querySelector(selector).click();
      await new Promise(resolve => setImmediate(resolve));
    };
    root.querySelector('[data-look-name]').value='<untitled>';
    await click('[data-look-save]');
    assert.deepEqual(JSON.parse(JSON.stringify(looks[0])),{name:'<untitled>',...draft});
    assert.equal(root.querySelector('strong').textContent,'<untitled>');
    await click('[aria-label="Apply <untitled>"]');
    assert.deepEqual(JSON.parse(JSON.stringify(applied)), draft);
    assert.deepEqual(writes,['/api/profile-looks/save']);
    window.VoidHome.state.account.id='another-account';
    await click('[aria-label="Delete saved look <untitled>"]');
    assert.equal(looks.length,1);
    window.VoidHome.state.account.id='fixture-owner';
    await click('[aria-label="Delete saved look <untitled>"]');
    assert.equal(looks.length,0);
    assert.match(root.textContent,/No saved looks yet/);
    console.log('PASS private saved looks capture five presets, escape labels, apply to draft, isolate account switches and delete');
  } finally { dom.window.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
