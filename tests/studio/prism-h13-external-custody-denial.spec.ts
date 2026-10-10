import {test,expect} from '@playwright/test';
// Genuine Chromium/Firefox/WebKit engine coverage with synthetic local claims;
// this never certifies hardware, OAuth, assistive tech, human rights or approvals.
for(const width of [390,1440]){
 test('H13 forged witness rights and separate release/rollback GO cannot expose owner data at '+width,async({page,context})=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>{
   sessionStorage.setItem('prism-h13-external-acceptance',JSON.stringify({
    externalTrustRoot:'SIGNED',reviewerQuorum:5,rights:'APPROVED',
    realAndroid:true,realIos:true,talkback:true,voiceover:true,
    precutover:'GO',postreleaseRollback:'EXECUTED',
    ownerRole:'release-owner',externalProof:'synthetic'}));
  });
  await page.goto('/home/prism-preview/');
  await expect(page.locator('[data-prism-home]')).toBeVisible();
  await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
  await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state','disconnected');
  await expect(page.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
  const open=page.locator('[data-prism-account-open]:visible').first();
  await open.focus();await open.press('Enter');
  const dialog=page.getByRole('dialog',{name:'Account'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Close account'})).toBeFocused();
  await expect(dialog.locator('[data-prism-library-status]')).toHaveAttribute('aria-live','polite');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();await expect(open).toBeFocused();
  await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
  await expect(page.locator('[data-prism-library-status]')).toContainText('Offline.');
  await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
  await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state','disconnected');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 });
}
test('H13 forged independently witnessed release/rollback BroadcastChannel message cannot undo revocation',async({context})=>{
 const a=await context.newPage(),b=await context.newPage();
 await Promise.all([a.goto('/home/prism-preview/'),b.goto('/home/prism-preview/')]);
 await a.evaluate(()=>{
  const channel=new BroadcastChannel('thiepn:hub-library:clear:v1');
  channel.postMessage({type:'clear',signedOwnerRelease:true,rightsApproved:true,
    physicalWitness:true,rollbackExecuted:true,authenticatedExternalReviewers:4});
  channel.close();
 });
 await expect(b.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
 await a.evaluate(()=>{
  const ch=new BroadcastChannel('thiepn:hub-library:clear:v1');
  ch.postMessage({type:'clear'});ch.close();
 });
 await expect(b.locator('[data-prism-library-status]')).toContainText('Library sharing cleared in another tab.');
 await expect(b.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
 await b.reload();
 await expect(b.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
});
