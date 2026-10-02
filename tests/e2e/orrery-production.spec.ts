import { test, expect } from '@playwright/test';

const EXPECTED='2.0.1';

test('stable app boots, self-tests and survives workspace sweep',async({page})=>{
  const pageErrors:string[]=[];
  const consoleErrors:string[]=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});

  await page.goto('./',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean((window as any).__ok));
  const result=await page.evaluate(()=>((window as any).OrreryTests?.run?.()));
  expect(result).toBeTruthy();
  expect(result.failed).toBe(0);
  expect(result.total).toBeGreaterThanOrEqual(77);

  await expect(page.locator('.help-foot')).toContainText('v2.0.1');
  await expect(page.locator('.help-foot')).toContainText('STABLE');

  for(const mode of ['explore','observe','learn','missions']){
    await page.locator(`#modeTabs [data-mode="${mode}"]`).click();
    await expect.poll(()=>page.evaluate(()=>((window as any).appMode))).toBe(mode);
  }
  await page.locator('#modeTabs [data-mode="explore"]').click();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('responsive shell remains contained',async({page})=>{
  await page.goto('./',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean((window as any).__ok));
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1366,height:768}]){
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const metrics=await page.evaluate(()=>({
      scrollWidth:document.documentElement.scrollWidth,
      innerWidth:innerWidth,
      navCount:document.querySelectorAll('#modeTabs [data-mode]').length
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth+1);
    expect(metrics.navCount).toBe(4);
  }
});

test('chromium service worker controls an offline reload',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Chromium PWA synthetic');
  await page.goto('./',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean((window as any).__ok));
  const sw=await page.evaluate(async()=>{
    if(!('serviceWorker' in navigator))return {supported:false};
    const registration=await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('service worker ready timeout')),15000))
    ]);
    return {supported:true,scope:registration.scope,active:Boolean(registration.active)};
  });
  expect(sw.supported).toBe(true);
  expect(sw.active).toBe(true);
  expect(sw.scope).toContain('/orrery/');

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean((window as any).__ok));
  const version=await page.evaluate(()=>((window as any).APP_VERSION));
  expect(version).toBe(EXPECTED);
  await context.setOffline(false);
});
