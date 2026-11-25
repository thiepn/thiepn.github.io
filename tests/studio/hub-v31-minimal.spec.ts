import {test,expect} from '@playwright/test';
import {HUB_VISIBLE_APP_IDS} from '../../src/lib/workspace/visible-apps';
test('V3.1 default Home is bounded and opens preserved workspace',async({page})=>{
 await page.goto('/');
 await expect(page.locator('[data-workspace]')).toHaveAttribute('data-home-mode','today');
 await expect(page.locator('.ws-nav [data-primary-nav]')).toHaveCount(4);
 await expect(page.locator('[data-unified-today]')).toBeVisible();
 await expect(page.locator('[data-v31-continue]')).toBeVisible();
 await expect(page.locator('[data-v31-launch]')).toBeVisible();
 await expect(page.locator('[data-v31-capture]')).toBeVisible();
 expect(await page.locator('[data-v31-launch] [data-launch]').count()).toBeLessThanOrEqual(8);
 for(const id of await page.locator('[data-v31-launch] [data-launch]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-launch'))))expect(HUB_VISIBLE_APP_IDS).toContain(id);
 await page.getByRole('button',{name:'Workspace',exact:true}).click();
 await expect(page.locator('[data-grid]')).toBeVisible();
 await page.reload();
 await expect(page.locator('[data-grid]')).toBeVisible();
});
test('V3.1 Planner retains task calendar tracker routes',async({page})=>{
 await page.goto('/home/tasks/');
 await expect(page.locator('.ws-nav [data-primary-nav=planner]')).toHaveAttribute('aria-current','location');
 const tabs=page.locator('[data-v31-planner-tabs]');
 await expect(tabs).toBeVisible();
 await expect(tabs.getByRole('link',{name:'Tasks',exact:true})).toHaveAttribute('aria-current','page');
 await tabs.getByRole('link',{name:'Calendar',exact:true}).click();
 await expect(page).toHaveURL(/\/home\/calendar\//);
 await expect(tabs.getByRole('link',{name:'Calendar',exact:true})).toHaveAttribute('aria-current','page');
 await tabs.getByRole('link',{name:'Trackers',exact:true}).click();
 await expect(page).toHaveURL(/\/home\/trackers\//);
});
test('V3.1 mobile navigation remains reachable without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:320,height:720});
 await page.goto('/');
 await expect(page.locator('[data-workspace]')).toHaveAttribute('data-home-mode','today');
 await expect(page.locator('.ws-mobile-nav [data-primary-nav]')).toHaveCount(4);
 await expect(page.locator('.ws-mobile-nav')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
