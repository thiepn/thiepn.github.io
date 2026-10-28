import {test,expect} from '@playwright/test';

test('desktop navigation exposes primary routes and keeps all secondary routes in More',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await expect(page.locator('.ws-nav > a')).toHaveCount(4);
 const more=page.locator('[data-nav-more]');
 await expect(more).not.toHaveAttribute('open','');
 await expect(more.locator('a')).toHaveCount(7);
 await more.locator('summary').click();
 await expect(more).toHaveAttribute('open','');
 await expect(more.getByRole('link',{name:'Settings',exact:true})).toBeVisible();
 await more.getByRole('link',{name:'Settings',exact:true}).click();
 await expect(page.locator('[data-workspace][data-view=settings]')).toBeVisible();
 await expect(page.locator('[data-nav-more]')).toHaveAttribute('open','');
 await expect(page.locator('.ws-nav-more-links a[href="/home/settings/"]')).toHaveAttribute('aria-current','page');
});

test('workspace switcher is collapsed without hiding the original workspace actions',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/?mode=workspace');
 const disclosure=page.locator('.ws-workspaces-disclosure');
 await expect(disclosure).not.toHaveAttribute('open','');
 await disclosure.locator('summary').click();
 await expect(disclosure).toHaveAttribute('open','');
 await expect(disclosure.getByRole('button',{name:'New workspace',exact:true})).toBeVisible();
 await expect(page.locator('[data-workspace-list] button')).not.toHaveCount(0);
 await page.locator('[data-action=unified-mode][data-id=today]').click();
 await expect(page.locator('[data-unified-today]')).toBeVisible();
});
