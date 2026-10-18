import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
for(const width of [320,390,768,1024,1440,1920]){
  test(`PI-04 P1 source-safe header and navigation at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const mobile=page.getByRole('navigation',{name:'Mobile workspace navigation'});
    if(width>=768&&width<=1024){
      const rail=await page.locator('.ws-navigation').evaluate(node=>node.getBoundingClientRect().width);
      expect(rail).toBeGreaterThanOrEqual(60);
      expect(rail).toBeLessThanOrEqual(68);
    }
    if(width===1440){
      await page.getByRole('button',{name:'Collapse sidebar'}).click();
      const collapsed=await page.locator('.ws-navigation').evaluate(node=>node.getBoundingClientRect().width);
      expect(collapsed).toBeGreaterThanOrEqual(60);
      expect(collapsed).toBeLessThanOrEqual(68);
    }
    if(width<768){
      await expect(mobile).toBeVisible();
      await expect(page.locator('.ws-mobile-nav')).toHaveCSS('position','static');
      const menu=page.locator('[data-more-trigger]');
      await expect(menu).toContainText('MENU');
      await menu.click();
      const sheet=page.locator('[data-more-dialog]');
      await expect(sheet).toBeVisible();
      for(const title of ['Today','Plan','Tasks','Trackers','Apps']){
        await expect(sheet.getByRole('navigation',{name:'Personal Index sections'}).getByRole('link',{name:new RegExp(title)})).toBeVisible();
      }
      await page.keyboard.press('Escape');
      await expect(sheet).not.toBeVisible();
      await expect(menu).toBeFocused();
    } else {
      await expect(mobile).toBeHidden();
      await expect(page.getByRole('navigation',{name:'Personal Index sections'})).toBeVisible();
    }
    const search=page.locator('.ws-topbar [data-action=search]');
    await search.click();
    await expect(page.locator('[data-search-dialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-search-dialog]')).not.toBeVisible();
    await expect(page.locator('.ws-topbar [data-action=capture]')).toBeVisible();
  });
}
test('PI-04 P1 mobile MENU has working owner-safe handoffs and current-page links',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.locator('[data-more-trigger]').click();
  await page.getByRole('navigation',{name:'Personal Index sections'}).getByRole('link',{name:/Plan/}).click();
  await expect(page).toHaveURL(/\/home\/calendar\//);
  await expect(page.locator('[data-more-dialog]')).not.toBeVisible();
  await page.locator('[data-more-trigger]').click();
  await expect(page.locator('[data-more-dialog] [href="/home/calendar/"]')).toHaveAttribute('aria-current','page');
  await page.getByRole('button',{name:'Account and sharing'}).click();
  await expect(page.locator('[data-more-dialog]')).not.toBeVisible();
  await expect(page.locator('[data-account-dialog]')).toBeVisible();
});
