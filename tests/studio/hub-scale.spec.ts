import { test, expect } from '@playwright/test';
for(const count of [100,250])test(`H7 ${count}-app Home filtering, pin choice and keyboard recovery`,async({page})=>{
 await page.route('**/home/',async route=>{
  const response=await route.fetch();let html=await response.text();
  const items=Array.from({length:count},(_,i)=>`<article class="hub-card" data-hub-item data-hub-item-category="${i%2?'learn':'tools'}" data-hub-slug="scale-${i}" data-hub-title="Scale app ${i}"><h2><a href="https://example.test/app-${i}">Scale app ${i}</a></h2><p>Public synthetic scale fixture for keyboard verification.</p><a class="hub-card__open" href="https://example.test/app-${i}">Open app</a></article>`).join('');
  const start=html.indexOf('<div class="hub-grid"'),end=html.indexOf('</section>',start);expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);html=html.slice(0,start)+`<div class="hub-grid" data-hub-grid>${items}</div>`+html.slice(end);
  html=html.replace(/<div class="portal-pin-choices">[\s\S]*?<\/div>/,`<div class="portal-pin-choices">${Array.from({length:count},(_,i)=>`<label><input type="checkbox" value="scale-${i}" data-pin-choice><span>Scale app ${i}</span></label>`).join('')}</div>`);
  await route.fulfill({response,body:html});
 });
 await page.setViewportSize({width:320,height:900});await page.goto('/home/');
 await expect(page.locator('[data-hub-item]:visible')).toHaveCount(count);await page.getByRole('button',{name:/Learn/}).click();await expect(page.locator('[data-hub-item]:visible')).toHaveCount(count/2);
 await page.getByRole('button',{name:'Customize',exact:true}).click();await page.getByLabel('Find an app to pin').fill(`Scale app ${count-1}`);
 await expect(page.locator('[data-pin-choice]:visible')).toHaveCount(1);await page.locator('[data-pin-choice]:visible').check();await page.getByLabel('Find an app to pin').fill('unmatched');
 await expect(page.locator('[data-pin-filter-status]')).toContainText('0 apps');await expect(page.locator('[data-pin-order]')).toContainText(`Scale app ${count-1}`);
 await page.getByRole('button',{name:'Done',exact:true}).focus();await page.keyboard.press('Escape');await expect(page.locator('[data-pin-list] a')).toHaveAttribute('data-pin-slug',`scale-${count-1}`);
 await page.getByRole('button',{name:'Customize',exact:true}).click();await expect(page.getByLabel('Find an app to pin')).toHaveValue('');await expect(page.locator('[data-pin-choice]:visible')).toHaveCount(count);
 await page.addScriptTag({path:process.env.AXE_PATH||'/tmp/audit-tools/node_modules/axe-core/axe.min.js'});
 expect(await page.evaluate(async()=>(await(window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map((v:any)=>v.id))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
