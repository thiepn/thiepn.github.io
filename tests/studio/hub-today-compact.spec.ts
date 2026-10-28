import {test,expect} from '@playwright/test';

test('Today shows a single primary work surface, with secondary panels available on demand',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('[data-home-mode=today]')).toBeVisible();
 await expect(page.locator('[data-unified-today]')).toBeVisible();
 await expect(page.locator('[data-today-workbench]')).toHaveCount(0);
 await expect(page.locator('[data-hub-calendar-c1]')).toBeHidden();
 await expect(page.locator('.ws-calendar-details')).toBeHidden();
 await expect(page.locator('[data-today-decisions]')).toHaveCount(0);
 await expect(page.locator('.ws-toolbar button')).toHaveCount(0);
 const more=page.getByRole('button',{name:'More sections',exact:true});
 await expect(more).toHaveAttribute('aria-expanded','false');
 await more.click();
 await expect(page.locator('[data-today-workbench]')).toBeVisible();
 await expect(page.locator('[data-hub-calendar-c1]')).toBeVisible();
 await expect(page.locator('[data-today-decisions]')).toBeVisible();
 await expect(page.locator('[data-action=toggle-today-more]')).toHaveAttribute('aria-expanded','true');
 await page.locator('.ws-unified-head-actions [data-action=new-event]').click();
 await expect(page.locator('[data-workspace-dialog]')).toBeVisible();
 await page.locator('[data-workspace-dialog] [data-action=close-dialog]').first().click();
 await expect(page.locator('[data-today-workbench]')).toBeVisible();
 await page.getByRole('button',{name:'Hide additional sections'}).click();
 await expect(page.locator('[data-today-workbench]')).toHaveCount(0);
 await page.locator('[data-action=unified-mode][data-id=workspace]').click();
 await expect(page.locator('.ws-toolbar [data-action=customize]')).toBeVisible();
});
test('compact Today has no horizontal overflow at phone, tablet and desktop widths',async({page})=>{
 for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:844});
   await page.goto('/');
   await expect(page.locator('[data-unified-today]')).toBeVisible();
   const dim=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:window.innerWidth}));
   expect(dim.scroll, 'horizontal scroll at '+width).toBeLessThanOrEqual(dim.inner+1);
   await page.locator('[data-action=toggle-today-more]').click();
   await expect(page.locator('[data-today-workbench]')).toBeVisible();
 }
});
