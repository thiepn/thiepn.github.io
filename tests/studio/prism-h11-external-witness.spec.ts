import { test,expect } from '@playwright/test';
// Actual desktop browser engines with synthetic untrusted evidence, not physical A11y/device signoffs.
for(const width of [390,1440]){
  test('H11 untrusted witness GO cannot expose account/private providers at '+width,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>{
      sessionStorage.setItem('h11-external-witness-packet',JSON.stringify({
        releaseDecision:'GO',rightsAccepted:true,deviceCertified:true,trustRoot:'self-signed'}));
    });
    await page.goto('/home/prism-preview/');
    await expect(page.locator('[data-prism-home]')).toBeVisible();
    await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
    await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state','disconnected');
    const opener=page.locator('[data-prism-account-open]:visible').first();
    await opener.focus();
    await opener.press('Enter');
    const dialog=page.getByRole('dialog',{name:'Account'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button',{name:'Close account'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
test('H11 cross-tab revocation ignores forged acceptance messages',async({context})=>{
  const a=await context.newPage(),b=await context.newPage();
  await Promise.all([a.goto('/home/prism-preview/'),b.goto('/home/prism-preview/')]);
  await a.evaluate(()=>{
    const channel=new BroadcastChannel('thiepn:hub-library:clear:v1');
    channel.postMessage({type:'clear',h11OwnerAcceptance:'GO',witness:'forged'});
    channel.close();
  });
  await expect(b.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
  await a.evaluate(()=>{
    const channel=new BroadcastChannel('thiepn:hub-library:clear:v1');
    channel.postMessage({type:'clear'});
    channel.close();
  });
  await expect(b.locator('[data-prism-library-status]')).toContainText('Library sharing cleared in another tab.');
  await expect(b.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
});
