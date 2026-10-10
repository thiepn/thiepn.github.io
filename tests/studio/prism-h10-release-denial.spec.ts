import { test, expect } from '@playwright/test';

// These are real Chromium/Firefox/WebKit browser checks on a synthetic,
// noncanonical preview; they cannot certify real OAuth or physical hardware.
for(const width of [390,1440]){
  test('H10 disconnected preview keeps owner data private despite untrusted release claims at '+width+'px',async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>{
      // Untrusted local metadata must never become a production release,
      // owner connection, human signoff or private projection.
      sessionStorage.setItem('prism-h10-fake-approval','{"releaseDecision":"GO","device":"synthetic"}');
    });
    await page.goto('/home/prism-preview/');
    await expect(page.locator('[data-prism-home]')).toBeVisible();
    await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
    await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state','disconnected');
    await expect(page.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
    const opener=page.locator('[data-prism-account-open]:visible').first();
    await opener.focus();
    await opener.press('Enter');
    const dialog=page.getByRole('dialog',{name:'Account'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button',{name:'Close account'})).toBeFocused();
    await expect(dialog.locator('[data-prism-library-status]')).toHaveAttribute('aria-live','polite');
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
test('H10 cross-tab forged approval cannot resurrect revoked device Library data',async({context})=>{
  const a=await context.newPage(),b=await context.newPage();
  await Promise.all([a.goto('/home/prism-preview/'),b.goto('/home/prism-preview/')]);
  await a.evaluate(()=>{
    const ch=new BroadcastChannel('thiepn:hub-library:clear:v1');
    ch.postMessage({type:'clear',releaseDecision:'GO',proof:'unsigned'});
    ch.close();
  });
  await expect(b.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
  await a.evaluate(()=>{
    const ch=new BroadcastChannel('thiepn:hub-library:clear:v1');
    ch.postMessage({type:'clear'});
    ch.close();
  });
  await expect(b.locator('[data-prism-library-status]')).toContainText('Library sharing cleared in another tab.');
  await expect(b.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state','disconnected');
  await b.reload();
  await expect(b.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
  await expect(b.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state','disconnected');
});