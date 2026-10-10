import {test,expect} from '@playwright/test';

// Isolated browser simulation, not authenticated OAuth or physical-device evidence.
for(const width of [390,1440]){
  test('H16 Account discloses local-only Home ownership and never claims cloud sync at '+width,async({page})=>{
    const remoteCalls:string[]=[];
    page.on('request',r=>{
      if(/home.?document.*(?:sync|rpc)|(?:rpc|rest)\/.*(?:home.?document)/i.test(r.url())) remoteCalls.push(r.url());
    });
    await page.setViewportSize({width,height:850});
    await page.goto('/home/prism-preview/');
    const root=page.locator('[data-prism-home]');
    const sync=page.locator('[data-prism-home-sync-status]');
    await expect(root).toHaveAttribute('data-prism-cloud-verified','false');
    await expect(sync).toContainText(/browser|cloud|account/i);
    const opener=page.locator('[data-prism-account-open]:visible').first();
    await opener.click();
    const dialog=page.getByRole('dialog',{name:'Account'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading',{name:'Home layout'})).toBeVisible();
    await expect(sync).not.toContainText(/all devices are synced|cloud backup complete|restore approved/i);
    await expect(dialog.getByRole('button',{name:'Close account'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    expect(remoteCalls).toEqual([]);
  });
}
test('H16 simulated identity switch immediately masks previous local pending status, without OAuth claims',async({page})=>{
  await page.goto('/home/prism-preview/');
  const sync=page.locator('[data-prism-home-sync-status]');
  const home=page.locator('[data-prism-home]');
  await page.evaluate(()=>{
    window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'signed-in',id:'11111111-1111-4111-8111-111111111111',label:'Fictional A'}}));
  });
  await expect(sync).toContainText(/device only|revision batch|browser only|could not be checked/);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'checking'}})));
  await expect(sync).toContainText('Checking Home ownership');
  await expect(home).toHaveAttribute('data-prism-cloud-verified','false');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'signed-in',id:'22222222-2222-4222-8222-222222222222',label:'Fictional B'}})));
  await expect(sync).not.toContainText('Fictional A');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'unavailable'}})));
  await expect(sync).toContainText('Account verification unavailable');
  await expect(home).toHaveAttribute('data-prism-cloud-verified','false');
});
