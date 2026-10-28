import {test,expect,type Page} from '@playwright/test';

/** Tests the actual visible Today/nav controls without replacing source owners. */
async function ready(page:Page,width:number,dark:boolean) {
  await page.setViewportSize({width,height:844});
  await page.goto('/');
  await expect(page.locator('[data-workspace][data-home-mode=today]')).toBeVisible();
  await expect(page.locator('[data-unified-today]')).toBeVisible();
  await page.evaluate(mode=>document.documentElement.setAttribute('data-theme',mode),dark?'dark':'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme',dark?'dark':'light');
}
async function insideViewport(page:Page,selector:string,width:number) {
  const rect=await page.locator(selector).first().boundingBox();
  expect(rect,selector+' must have visible bounds').not.toBeNull();
  expect(rect!.width,selector+' positive width').toBeGreaterThan(0);
  expect(rect!.x,selector+' left bound at '+width).toBeGreaterThanOrEqual(-1);
  expect(rect!.x+rect!.width,selector+' right bound at '+width).toBeLessThanOrEqual(width+1);
}
for(const width of [320,390,768,1440]){
  for(const dark of [false,true]){
    test('Today and navigation interactions '+width+'px '+(dark?'dark':'light'),async({page})=>{
      await ready(page,width,dark);
      await insideViewport(page,'[data-action=toggle-today-more]',width);
      await insideViewport(page,'.ws-unified-head-actions [data-action=capture-task]',width);
      await insideViewport(page,'.ws-unified-head-actions [data-action=new-event]',width);
      await expect(page.locator('[data-today-workbench]')).toHaveCount(0);
      await expect(page.locator('[data-today-decisions]')).toHaveCount(0);
      await expect(page.locator('[data-hub-calendar-c1]')).toBeHidden();
      await page.locator('[data-action=toggle-today-more]').click();
      await expect(page.locator('[data-today-workbench]')).toBeVisible();
      await expect(page.locator('[data-today-decisions]')).toBeVisible();
      await expect(page.locator('[data-hub-calendar-c1]')).toBeVisible();
      await page.locator('[data-action=toggle-today-more]').click();
      await expect(page.locator('[data-today-workbench]')).toHaveCount(0);
      await expect(page.locator('[data-hub-calendar-c1]')).toBeHidden();

      if(width<768){
        const more=page.locator('[data-more-trigger]');
        await expect(more).toBeVisible();
        await insideViewport(page,'[data-more-trigger]',width);
        await more.click();
        await expect(page.locator('[data-more-dialog]')).toBeVisible();
        await expect(page.locator('[data-more-dialog] a[href="/home/settings/"]')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-more-dialog]')).not.toBeVisible();
        await expect(more).toBeFocused();
      }else{
        const more=page.locator('[data-nav-more]');
        await expect(more).toBeVisible();
        await expect(more).not.toHaveAttribute('open','');
        await more.locator('summary').click();
        await expect(more).toHaveAttribute('open','');
        await expect(more.locator('a[href="/home/knowledge/"]')).toBeVisible();
        await expect(more.locator('a[href="/home/settings/"]')).toBeVisible();
        await more.locator('summary').click();
        await expect(more).not.toHaveAttribute('open','');
      }
      await page.locator('[data-action=unified-mode][data-id=focus]').click();
      await expect(page.locator('[data-focus-panel]')).toBeVisible();
      await page.locator('[data-action=unified-mode][data-id=workspace]').click();
      await expect(page.locator('[data-grid]')).toBeVisible();
      await page.locator('[data-action=unified-mode][data-id=today]').click();
      await expect(page.locator('[data-unified-today]')).toBeVisible();

      const dimensions=await page.evaluate(()=>({
        viewport:window.innerWidth,content:document.documentElement.scrollWidth
      }));
      expect(dimensions.content,'no horizontal overflow '+width+' '+(dark?'dark':'light'))
        .toBeLessThanOrEqual(dimensions.viewport+1);
    });
  }
}
