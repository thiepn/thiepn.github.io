import {test,expect} from '@playwright/test';
test('new app pinning and simple editor preserve the layout and survive reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/apps/');await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await expect(page.locator('[data-hub-item]')).toHaveCount(31);
 const pin=page.locator('[data-hub-slug=bikes] [data-action=pin-app]');await pin.click();await expect(pin).toHaveAttribute('aria-pressed','true');
 await page.locator('.ws-nav a[href="/"]').click();const widget=page.locator('[data-widget-type=app-shortcuts]');await expect(widget).toContainText('Bike Atlas');
 const geometry=await widget.getAttribute('style');await widget.locator('[data-action=configure-widget]').click();
 await expect(page.locator('#ws-dialog-title')).toHaveText('Choose app shortcuts');await expect(page.getByLabel('Width (columns)',{exact:true})).toHaveCount(0);
 await page.getByText('Add an external shortcut',{exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Reference');await page.getByLabel('HTTPS address',{exact:true}).fill('https://example.org/reference');await page.locator('[data-dialog-submit]').click();
 await expect(widget).toContainText('Reference');await expect(widget).toHaveAttribute('style',geometry!);await expect(page.locator('[data-workspace-notice]')).not.toContainText('interrupted layout');
 await page.reload();await expect(page.locator('[data-widget-type=app-shortcuts]')).toContainText('Reference');expect(errors).toEqual([]);
});
test('shared static routes retain their actual content after identity settles',async({page})=>{
 for(const [route,marker] of [['/search/','[data-portal-search-page]'],['/inbox/','[data-portal-inbox]'],['/home/connections/','.portal-home'],['/flows/','[data-portal-flows]']]){
  await page.goto(route!);await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');await expect(page.locator('[data-workspace]')).toHaveCount(1);await expect(page.locator(marker!)).toBeVisible();await expect(page.locator('[data-hub-account]')).toHaveCount(1);
 }
});
test('default Home shows shortcuts in the first desktop screen and optional modes reuse tasks',async({page})=>{
 await page.goto('/');await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');const box=await page.locator('[data-widget-type=app-shortcuts]').boundingBox();expect(box!.y).toBeLessThan(350);
 await page.locator('.ws-topbar [data-action=capture]').click();await page.locator('[data-workspace-form] [data-capture-kind]').selectOption('task');await page.locator('[data-workspace-form] [data-capture-draft]').fill('Plan connected Hub');await page.locator('[data-dialog-submit]').click();
 await page.locator('[data-action=unified-mode][data-id=today]').click();await expect(page.locator('[data-unified-today]')).toContainText('Plan connected Hub');
 await page.locator('[data-action=unified-mode][data-id=focus]').click();await page.locator('[data-action=focus-queue][data-id=inbox]').click();await expect(page.locator('[data-workspace-content]')).toContainText('Plan connected Hub');
});
