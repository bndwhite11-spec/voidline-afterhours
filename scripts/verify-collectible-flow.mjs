import assert from 'node:assert/strict';

// Use only the selectors and requests available to a signed-in collector. The
// final SQL reads independently verify this exact copy in the isolated fixture.
export async function verifyCollectibleFlow({action, click, element, until, $, event, json, one, accountId, observe}) {
  const section = '[data-vc-action="section"][data-section="collector"]';
  await action('cosmetics-collection');
  await click(section);
  await click('[data-cl="reconcile"]');
  const welcome = await element('[data-cl="capsule"][data-id]');
  const capsuleId = welcome.dataset.id;
  welcome.click();
  await click('[data-cl="family"][data-family="pepe-keycap"]');
  const before = await json('/api/capsules/' + capsuleId);
  const family = before.families.find(row => row.id === 'pepe-keycap');
  assert.equal(family.tableVersion, 'pepe-keycap.v1');
  assert.deepEqual(family.models.map(item => item.weight), [5000, 2800, 1400, 600, 150, 50]);
  assert.equal(before.opening, null);

  observe('submitting');
  await click('[data-cl="open"]');
  await until(() => $('[data-cl-state="result"]') || $('[data-cl="skip"]'));
  if ($('[data-cl="skip"]')) await click('[data-cl="skip"]');
  const result = await element('[data-cl-state="result"]');
  const {opening} = await json('/api/capsules/' + capsuleId);
  assert.equal(result.dataset.instance, opening.instanceId);
  assert.equal(result.dataset.model, opening.modelId);
  assert.ok(family.models.some(m => m.id === opening.modelId));
  assert.equal(opening.currentlyOwned, true);
  assert.match(result.textContent, /New model discovered/);
  const copy = await one('SELECT id,catalog_id,owner_id FROM gift_instances WHERE id=?', opening.instanceId);
  assert.equal(copy.catalog_id, opening.modelId);
  assert.equal(copy.owner_id, accountId);

  observe('showcase');
  await click('[data-cl="display"]');
  observe('choose-slot');
  await click('[data-ps-action="offer-position"][data-slot="1"]');
  const profileForm = await element('[data-vp-form="profile"]');
  observe('save-profile');
  profileForm.dispatchEvent(event('submit'));

  let profile;
  for (let i = 0; i < 80; i++) {
    profile = (await json('/api/profiles/me')).profile;
    if (profile.showcase?.some(row => (row.instance_id || row.instanceId) === opening.instanceId)) break;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  assert.ok(profile.showcase.some(item => (item.instance_id || item.instanceId) === opening.instanceId));
  assert.equal((await one('SELECT count(*) AS n FROM gift_instances WHERE capsule_id=?',capsuleId)).n, 1);
  assert.equal((await one('SELECT count(*) AS n FROM capsule_openings WHERE capsule_id=?',capsuleId)).n, 1);
  if ($('#home-dialog[open]')) await action('close-dialog');
  return {model:opening.modelId, family:opening.familyId, tableVersion:opening.tableVersion, copyInResultInventoryAndProfile:true};
}
