import { readFileSync } from 'node:fs';
const hubCount = JSON.parse(readFileSync(new URL('../../src/data/hub.json', import.meta.url), 'utf8')).expectedCount;
import { test, expect } from '@playwright/test';
const actions=[['Capture a thought','https://thiepn.dev/notes/?capture=text'],['Continue in Library','https://thiepn.dev/library/saved/'],['Open TMS60','https://tms60.thiepn.dev/']] as const;
test('H3 discovery describes disabled private contracts without private fixtures or false counts',async({page})=>{
 const urls:string[]=[];page.on('request',r=>urls.push(r.url()));await page.goto('/home/');
 await expect(page.locator('[data-hub-item]')).toHaveCount(hubCount);
 await expect(page.getByRole('heading',{name:'Daily Home'})).toBeVisible();
 for(const [label,href] of actions){const link=page.getByRole('region',{name:'Daily Home'}).getByRole('link',{name:new RegExp('^'+label)});await expect(link).toHaveAttribute('href',href);await expect(link).toHaveAttribute('rel','noreferrer');}
 const registry=await(await page.request.get('/hub-providers.json')).json();expect(registry.providers).toHaveLength(3);expect(registry.contractVersion.major).toBe(1);
 for(const provider of registry.providers){expect(provider.privateReadsEnabled).toBe(false);expect(provider.inlineWritesEnabled).toBe(false);expect(provider.transport).toBeNull();}
 const schema=await(await page.request.get('/hub-provider-schema.json')).json();expect(schema.$id).toBe('https://thiepn.dev/hub-provider-schema.json');
 expect(urls.some(url=>/supabase|rest\/v1|hub\/summary|hub\/continue/.test(url))).toBe(false);
 expect(await page.locator('body').innerText()).not.toMatch(/Example note|Example book|due reviews|cloud synced/i);
});
test('H3 owner handoffs work without JavaScript and carry no private payload',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('http://127.0.0.1:4321/home/');
 for(const [label,href] of actions)await expect(page.getByRole('region',{name:'Daily Home'}).getByRole('link',{name:new RegExp('^'+label)})).toHaveAttribute('href',href);
 await context.close();
});
for(const width of [320,1440])for(const theme of ['light','dark'] as const)test(`H3 handoffs reflow and accessibility ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});await page.goto('/home/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.getByRole('link',{name:/^Capture a thought/}).focus();await expect(page.getByRole('link',{name:/^Capture a thought/})).toBeFocused();
 await page.addScriptTag({path:process.env.AXE_PATH||'/tmp/audit-tools/node_modules/axe-core/axe.min.js'});
 expect(await page.evaluate(async()=>{const result=await (window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));})).toEqual([]);
 await page.screenshot({path:`.cache/h3-home-${width}-${theme}.png`,fullPage:false});
});
