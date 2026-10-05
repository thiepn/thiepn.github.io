import {test,expect} from '@playwright/test';
import {fixture,seed,join,connect,book} from './fixture';
test('join is optional, creates no owner load; absent consent yields no reading metadata',async({page})=>{
 const f=await fixture(page);await expect(page.locator('[data-private-library]')).toBeHidden();
 expect(f.calls.some(c=>c.url.includes('/library/hub/bridge'))).toBe(false);expect(await page.evaluate(()=>(window as any).__opens)).toEqual([]);
 await join(page);expect(f.calls.some(c=>c.url.includes('/library/hub/bridge'))).toBe(false);
 await page.getByRole('button',{name:'Connect this browser',exact:true}).click();await expect(page.locator('[data-library-status]')).toContainText('Choose sharing');await expect(page.locator('[data-library-items]')).toBeEmpty();
});
test('actual device metadata resumes the exact revision with no cloud calls, writes, or persisted titles',async({page})=>{
 const f=await fixture(page);await seed(page);await page.evaluate(()=>(window as any).__opens=[]);await connect(page);
 await expect(page.locator('[data-library-items]')).toContainText('Current 20% · furthest 80%');await expect(page.locator('[data-library-search]')).toBeHidden();
 const href=await page.locator('[data-library-items] a').first().getAttribute('href');const u=new URL(href!,'https://thiepn.dev');expect(u.searchParams.get('release')).toBe(book.releaseVersion);expect(u.searchParams.get('edition')).toBe(String(book.edition));
 expect(f.calls.every(c=>c.method==='GET'&&new URL(c.url).origin==='https://thiepn.dev')).toBe(true);
 expect(await page.evaluate(()=>(window as any).__opens)).toEqual([]);expect(await page.evaluate(()=>JSON.stringify((window as any).__results))).not.toContain('SECRET');
 expect(await page.evaluate(()=>Object.values(localStorage).join('')+Object.values(sessionStorage).join(''))).not.toContain(book.title);
});
test('ending, masking and reloading never restore a reading snapshot automatically',async({page})=>{
 await fixture(page);await seed(page);await connect(page);await page.getByRole('button',{name:'End pilot and clear this tab',exact:true}).click();await expect(page.locator('[data-library-items]')).toBeEmpty();await expect(page.locator('iframe')).toHaveCount(0);
 await connect(page);await page.getByRole('button',{name:'Hide Home',exact:true}).click();await page.getByRole('button',{name:'Show Home',exact:true}).click();await expect(page.locator('[data-private-library]')).toBeHidden();await expect(page.locator('[data-library-items]')).toBeEmpty();
 await page.reload();await expect(page.locator('[data-private-library]')).toBeHidden();await expect(page.locator('iframe')).toHaveCount(0);
});
test('pause and configuration outage fail closed before the next owner read',async({page})=>{
 const f=await fixture(page);await seed(page);await connect(page);f.pause();await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.locator('[data-private-library]')).toBeHidden();await expect(page.locator('iframe')).toHaveCount(0);await expect(page.locator('[data-library-items]')).toBeEmpty();
 f.fail();await page.getByRole('button',{name:'Try reading pilot',exact:true}).click();await expect(page.locator('[data-reading-pilot-status]')).toContainText('unavailable or paused');await expect(page.locator('iframe')).toHaveCount(0);
});
test('late join after Hide Home cannot reopen the pilot',async({page})=>{
 const f=await fixture(page);f.hold();await page.getByRole('button',{name:'Try reading pilot',exact:true}).click();await page.getByRole('button',{name:'Hide Home',exact:true}).click();f.release();await page.getByRole('button',{name:'Show Home',exact:true}).click();await expect(page.locator('[data-private-library]')).toBeHidden();await expect(page.locator('iframe')).toHaveCount(0);
});
test('backgrounding ends the pilot; returning requires a fresh join',async({page})=>{
 await fixture(page);await seed(page);await connect(page);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('[data-private-library]')).toBeHidden();await expect(page.locator('[data-library-items]')).toBeEmpty();await expect(page.locator('iframe')).toHaveCount(0);
});
