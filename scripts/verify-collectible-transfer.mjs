import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

// Runs entirely through the delivered client. Authenticated reads and D1 queries
// independently cross-check the component being exercised. The account switch
// deliberately reuses one document to exercise local identity cleanup, too.
export async function verifyCollectibleTransfer({action,click,element,until,$,event,fill,json,one,state,sender,beforeLogout,seeStage,requests}) {
  const recipient={username:'quality_recipient',password:randomBytes(26).toString('hex')};
  const scope='[data-vc-action="section"][data-section="collector"]';
  const requestPanel='[data-vc-action="section"][data-section="requests"]';
  const requestsFrom=at=>requests().slice(at);
  const collectibleWrites=rows=>rows.filter(r=>r.method==='POST'&&/^\/api\/(?:cosmetics|capsules)\//.test(r.path));
  const submit=form=>form.dispatchEvent(event('submit'));
  async function closeDialog(){if($('#home-dialog[open]'))await action('close-dialog');}
  async function logout(){
    await closeDialog();await action('you');beforeLogout();await action('logout');
    await element('[data-home-form="login"]');
  }
  async function login(person){
    const form=await element('[data-home-form="login"]');
    fill(form,{username:person.username,password:person.password});submit(form);
    await until(()=>state().phase==='ready'&&state().account?.username===person.username);
  }
  async function recover(){
    await action('cosmetics-collection');await click(scope);
    await click('[data-cl="capsule"][data-id="'+cap.id+'"]');
    return element('[data-cl-state="result"]');
  }
  async function transferInbox(){
    await action('cosmetics-collection');await click(requestPanel);await click('[data-vc-action="transfers"]');
  }
  const list=await json('/api/capsules'),cap=list.capsules.find(c=>c.openingId);
  assert.ok(cap,'Earlier opening must be available to its owner');
  const {opening}=await json('/api/capsules/'+cap.id),copy=opening.instanceId;
  const copyRow=()=>one('SELECT owner_id,pending_transfer_id,ownership_revision FROM gift_instances WHERE id=?',copy);
  const qty=()=>one('SELECT count(*) AS n FROM gift_instances WHERE catalog_id=?',opening.modelId);
  const showcase=()=>one('SELECT count(*) n FROM gift_showcase WHERE account_id=? AND instance_id=?',sender.id,copy);
  assert.equal((await showcase()).n,1);
  seeStage('recipient-signup'); await logout();await action('auth-register');
  const register=await element('[data-home-form="register"]');fill(register,{...recipient,displayName:'Recipient fixture',passwordConfirm:recipient.password});
  submit(register);await action('finish-recovery');
  await until(()=>state().phase==='ready'&&state().account?.username===recipient.username&&!$('[data-home="finish-recovery"]'));
  const recipientId=state().account.id;assert.notEqual(recipientId,sender.id);
  seeStage('sender-login');await logout();await login(sender);
  seeStage('recipient-review');
  await recover();await click('[data-cl="gift"]');
  const form=await element('[data-vc-form="transfer"]');
  assert.equal(form.dataset.instance,copy);fill(form,{username:recipient.username});submit(form);
  const confirm=await element('[data-vc-form="confirm-send"]');
  assert.equal(confirm.dataset.instance,copy);assert.equal(confirm.elements.namedItem('username').value,recipient.username);
  assert.equal((await copyRow()).pending_transfer_id,null);
  seeStage('sender-confirm');submit(confirm);
  await element('[data-vc-action="transfers"][data-box="sent"]');
  await click('[data-vc-action="transfers"][data-box="sent"]');
  const cancel=await element('[data-vc-action="transfer-cancel"]'), transferId=cancel.dataset.transfer;
  const pending=await copyRow();assert.equal(pending.owner_id,sender.id);assert.equal(pending.pending_transfer_id,transferId);
  assert.equal((await showcase()).n,1);assert.equal((await qty()).n,1);
  const transfer=await json('/api/cosmetics/transfers/'+transferId);assert.equal(transfer.transfer.recipient_id,recipientId);
  seeStage('accept-exact-copy');await logout();await login(recipient);await transferInbox();
  const accept=await element('[data-vc-action="transfer-open"][data-transfer="'+transferId+'"]');
  assert.equal(accept.dataset.instance,copy);assert.equal(accept.dataset.item,opening.modelId);
  assert.equal((await copyRow()).owner_id,sender.id);accept.click();
  const receipt=await element('.vc-receipt-card');assert(receipt.textContent.includes(copy));
  const accepted=await copyRow();
  assert.equal(accepted.owner_id,recipientId);assert.equal(accepted.pending_transfer_id,null);assert.equal(accepted.ownership_revision,1);
  assert.equal((await showcase()).n,0);assert.equal((await qty()).n,1);
  seeStage('recipient-receipt');
  await closeDialog();await transferInbox();
  await click('[data-vc-action="transfer-receipt"][data-transfer="'+transferId+'"]');
  const historicalReceipt=await element('.cl-receipt');
  assert(historicalReceipt.textContent.includes(copy));assert(historicalReceipt.textContent.includes(opening.model.name));
  assert(historicalReceipt.textContent.includes('accepted'));
  assert.equal((await element('[data-vc-action="inspect-instance"]')).dataset.instance,copy);
  const receiptState=()=>one(`SELECT i.id,i.catalog_id,i.owner_id,i.ownership_revision,i.pending_transfer_id,i.acquired_at,i.arrival_acknowledged_at,t.state,
    (SELECT COUNT(*) FROM gift_instances WHERE catalog_id=i.catalog_id) AS quantity FROM gift_instances i JOIN gift_transfers t ON t.id=? WHERE i.id=?`,transferId,copy);
  const stable=await receiptState(),at=requests().length;await click('[data-vc-action="preview"][data-stage="vc-receipt-art"]');
  // Allow real async asset selection, accessibility feedback and reduced-motion
  // fallback, then exercise the owner action before checking for writes.
  await until(()=>!!$('#vc-preview-feedback')?.textContent||!!$('#vc-receipt-art svg')||/reduced motion/i.test($('#home-announcer')?.textContent||''));
  assert.deepEqual(await receiptState(),stable);
  assert.equal(collectibleWrites(requestsFrom(at)).length,0);
  await click('[data-vc-action="inspect-instance"]');
  assert.equal((await qty()).n,1);
  seeStage('sender-history');await logout();await login(sender);
  const historical=await recover();
  assert.equal(historical.dataset.instance,copy);assert.equal(historical.dataset.model,opening.modelId);
  assert.match(historical.textContent,/Historical award\s*·\s*Transferred/);
  assert.equal(historical.querySelector('[data-cl="display"],[data-cl="gift"],[data-cl="view-copy"]'),null);
  const saved=(await json('/api/capsules/'+cap.id)).opening;assert.equal(saved.id,opening.id);assert.equal(saved.currentlyOwned,false);
  assert(!JSON.stringify(saved).includes(recipientId));
  assert.equal((await one('SELECT count(*) n FROM capsule_openings WHERE capsule_id=?',cap.id)).n,1);
  assert.equal((await one('SELECT count(*) n FROM gift_transfers WHERE instance_id=?',copy)).n,1);
  await closeDialog();
  return {accounts:2,model:opening.modelId,edition:cap.editionId,tableVersion:opening.tableVersion,
    senderReviewedExactRecipient:true,reservedBeforeAcceptance:true,showcaseRetainedWhilePending:true,
    recipientAcceptedSameCopy:true,showcaseClearedOnTransfer:true,receiptDisplayedExactModelAndInstance:true,
    receiptReplayGrantedCopies:0,endingGiftCopies:1,endingTransferRows:1,endingAwardReceipts:1,
    senderHistoricalReceiptHasNoOwnershipActions:true,historicalReceiptExposesNewOwner:false};
}
