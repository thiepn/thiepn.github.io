import {test,expect} from '@playwright/test';
// Synthetic desktop browser only: never certify physical Android/iOS,
// TalkBack, VoiceOver, consent, rights, release owner, or real rollback.
for(const width of [390,1440]){
 test('H14 spoofed independent original rights and rollback cannot unlock owner data at '+width,async({page,context})=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>{
   sessionStorage.setItem('prism-h14-owner-external-proof',JSON.stringify({
    signedRights:'APPROVED',sourceOriginals:true,priorStableRestored:true,
    twoOwnerConsent:'APPROVED',realPhysicalAndroid:true,realIos:true,
    talkback:true,voiceover:true,releaseOwner:'GO',postreleaseRollback:'EXECUTED'}));
  });
  await page.goto('/home/prism-preview/');
  await expect(page.locator('[data-prism-home]')).toBeVisible();
  await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state','disconnected');
  await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
  await expect(page.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
  const opener=page.locator('[data-prism-account-open]:visible').first();
  await opener.focus();await opener.press('Enter');
  const dialog=page.getByRole('dialog',{name:'Account'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Close account'})).toBeFocused();
  await expect(dialog.locator('[data-prism-library-status]')).toHaveAttribute('aria-live','polite');
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(opener).toBeFocused();
  await context.setOffline(true);
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
  await expect(page.locator('[data-prism-library-status]')).toContainText('Offline.');
  await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
  await context.setOffline(false);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state','disconnected');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 });
}
test('H14 counterfeit human rights and owner recovery does not defeat original two-tab revocation',async({context})=>{
 const a=await context.newPage(),b=await context.newPage();
 await Promise.all([a.goto('/home/prism-preview/'),b.goto('/home/prism-preview/')]);
 await a.evaluate(()=>{
  const ch=new BroadcastChannel('thiepn:hub-library:clear:v1');
  ch.postMessage({type:'clear',reviewerQuorum:9,rightsOwnerApproved:true,releaseDecision:'GO',
   externalOperator:true,originalBytesRestored:true,rollbackExecuted:true});
  ch.close();
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
