import {test,expect} from '@playwright/test';
import {fixture,seed,connect} from './fixture';
test('mobile preview stays opt-in, reflows and exposes usable reading controls',async({page})=>{
 const f=await fixture(page);await expect(page.getByRole('button',{name:'Try reading pilot',exact:true})).toBeEnabled();expect(f.calls.some(c=>c.url.includes('/library/hub/bridge'))).toBe(false);
 await seed(page);await connect(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
 const resume=page.locator('[data-library-items] a').first();await resume.scrollIntoViewIfNeeded();const box=await resume.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);
 await page.emulateMedia({colorScheme:'dark'});await expect(resume).toBeVisible();await page.getByRole('button',{name:'End pilot and clear this tab',exact:true}).click();await expect(page.locator('[data-library-items]')).toBeEmpty();await expect(page.locator('iframe')).toHaveCount(0);
});
