import { test, expect } from '@playwright/test';
test('H6 guides support positions, history and recovery without claiming progress', async ({ page }) => {
  await page.goto('/flows/?flow=pdf-read&step=2&resource=fictional-secret&token=fake');
  await expect(page).toHaveURL(/\/flows\/\?flow=pdf-read&step=2$/);
  await expect(page.locator('[data-flow-guide]:visible')).toHaveCount(1);
  await expect(page.locator('[aria-current="step"] h3')).toHaveText('Choose the reading copy');
  await expect(page.locator('[data-flow-status]')).toContainText('no file transfer or app outcome confirmed');
  await page.getByRole('link',{name:'Turn notes into a manuscript',exact:true}).click();
  await expect(page.locator('[aria-current="step"] h3')).toHaveText('Export selected notes');
  await page.getByRole('link',{name:'View step 2',exact:true}).click(); await page.reload();
  await expect(page.locator('[aria-current="step"] h3')).toHaveText('Open the Markdown source');
  await page.getByText('If something stops',{exact:true}).last().click(); await expect(page.getByText(/Reopen the saved draft/)).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({...localStorage}))).not.toContain('fictional-secret');
  await page.goBack(); await expect(page.locator('[aria-current="step"] h3')).toHaveText('Export selected notes');
});
test('H6 reviewed app links carry no file payload and Scan remains an Android product page', async ({ page }) => {
  const requests:string[]=[]; page.on('request',r=>requests.push(r.url())); await page.goto('/flows/');
  const links=page.locator('[data-flow-guide="scan-read"] .portal-flow-actions a[target="_blank"]');
  expect(await links.evaluateAll((nodes:HTMLAnchorElement[])=>nodes.map(n=>n.href))).toEqual(['https://thiepn.dev/scan/','https://thiepn.dev/pdf/','https://thiepn.dev/library/saved/']);
  await expect(links.first()).toHaveAttribute('rel','noopener noreferrer'); await expect(links.first()).toContainText('product page');
  expect(requests.some(url=>/rest\/v1|hub\/transfer|account\.thiepn|\/share-target/.test(url))).toBe(false);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});
test('H6 Home and Actions discover workflow guides', async ({ page }) => {
  await page.goto('/home/'); await expect(page.getByRole('link',{name:'Workflow guides',exact:true})).toHaveAttribute('href','/flows/');
  await page.goto('/search/?scope=actions&q=manuscript'); await expect(page.locator('[data-search-action]:visible')).toHaveCount(1);
  await expect(page.getByRole('link',{name:'Turn notes into a manuscript',exact:true})).toHaveAttribute('href','https://thiepn.dev/flows/?flow=notes-draft&step=1');
});
test('H6 no-JavaScript guide links remain usable', async ({ browser }) => {
  const context=await browser.newContext({javaScriptEnabled:false}); const page=await context.newPage(); await page.goto('http://127.0.0.1:4321/flows/');
  await expect(page.locator('[data-flow-guide]:visible')).toHaveCount(3); await expect(page.getByRole('link',{name:/Open Manuscript/})).toHaveAttribute('href','https://thiepn.dev/manuscript/'); await context.close();
});
for(const [width,theme,zoom] of [[320,'light',false],[1440,'dark',false],[320,'dark',true]] as const)test(`H6 workflow accessibility ${width} ${theme} text200=${zoom}`,async({page})=>{
  await page.setViewportSize({width,height:900}); await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'}); await page.goto('/flows/');
  if(zoom) await page.addStyleTag({content:'html{font-size:200%!important}'});
  await page.addScriptTag({path:process.env.AXE_PATH||'/tmp/audit-tools/node_modules/axe-core/axe.min.js'});
  for(const title of ['Scan, edit and read a PDF','Edit a PDF for Library','Turn notes into a manuscript']){
    await page.getByRole('link',{name:title,exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(async()=>(await(window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})))).toEqual([]);
  }
  await page.screenshot({path:`.cache/h6-flows-${width}-${theme}-${zoom}.png`,fullPage:true});
});
