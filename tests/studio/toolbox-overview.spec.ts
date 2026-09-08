import { test, expect } from '@playwright/test';
for (const width of [320,375,768,1440]) for (const theme of ['light','dark'] as const) {
 test(`suite breadth and readable links ${width} ${theme}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme});
  await page.goto('/');const section=page.locator('#tiny-tools');
  await expect(section.getByRole('heading',{name:'Tiny Tools',exact:true})).toBeVisible();
  await expect(section).toContainText('Hundreds of tools.');
  await expect(section.locator('[data-toolbox-family]')).toHaveCount(8);
  await expect(section.locator('[data-toolbox-overview] a')).toHaveCount(16);
  await expect(section.locator('textarea,input,button')).toHaveCount(0);
  for(const link of await section.locator('a').all()){
   await expect(link).toBeVisible();const box=await link.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);
   expect(await link.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await testInfo.attach(`toolbox-${width}-${theme}`,{body:await section.screenshot(),contentType:'image/png'});
 });
}
test('suite examples are real destinations, not fake filters or demos',async({page})=>{
 await page.goto('/');const links=page.locator('#tiny-tools [data-toolbox-overview] a');
 const hrefs=await links.evaluateAll(es=>es.map(e=>e.getAttribute('href')));
 expect(new Set(hrefs).size).toBe(16);for(const href of hrefs)expect(href).toMatch(/^\/tools\/#\/tool\/[a-z0-9-]+$/);
 await links.first().focus();await expect(links.first()).toBeFocused();await page.keyboard.press('Tab');await expect(links.nth(1)).toBeFocused();
});
