import {test,expect} from '@playwright/test';import {fixture} from './fixture';
test('mobile stays outside the desktop pilot and makes no owner requests',async({page})=>{
 const f=await fixture(page);await expect(page.getByRole('button',{name:'Try reading pilot',exact:true})).toBeDisabled();await expect(page.locator('[data-reading-pilot-status]')).toContainText('desktop');await expect(page.locator('[data-private-library]')).toBeHidden();expect(f.calls.some(c=>c.url.includes('/library/hub/bridge'))).toBe(false);
});
