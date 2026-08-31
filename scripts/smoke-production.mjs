import fs from 'node:fs';
import { forEachConcurrent, normalizeConcurrency } from './lib/async-pool.mjs';

const args = process.argv.slice(2);
const arg = (name) => { const i=args.indexOf(name); return i>=0 ? args[i+1] : undefined; };
const base = new URL(arg('--url') || process.env.PRODUCTION_URL || 'https://thiepn.dev/');
const manifest = JSON.parse(fs.readFileSync('src/generated/route-manifest.json','utf8'));
const catalogue = JSON.parse(fs.readFileSync('src/generated/catalogue-public.json','utf8'));
const retries = Number(arg('--retries') || 10);
const concurrency = normalizeConcurrency(arg('--concurrency') || process.env.SMOKE_CONCURRENCY || 6);
const expectedProjects = (catalogue.projects ?? []).length;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const retryDelay = (attempt) => Math.min(1500 + attempt * 1000, 7000);

async function fetchRetry(url, expected = (r) => r.ok) {
  let last;
  for (let i=0;i<retries;i++) {
    try {
      const r = await fetch(url, { redirect:'follow', headers:{'user-agent':'THIEPN-Production-Smoke/2.1'} });
      if (expected(r)) return r;
      last = new Error(`${r.status} ${r.statusText}`);
    } catch (e) { last=e; }
    await sleep(retryDelay(i));
  }
  throw last ?? new Error(`Failed ${url}`);
}

async function fetchTextRetry(url, responseExpected, textExpected, failureMessage) {
  let last;
  for (let i=0;i<retries;i++) {
    try {
      const r = await fetch(url, { redirect:'follow', headers:{'user-agent':'THIEPN-Production-Smoke/2.1'} });
      const text = await r.text();
      if (responseExpected(r) && textExpected(text)) return { response:r, text };
      last = new Error(failureMessage || `${r.status} ${r.statusText}`);
    } catch (e) { last=e; }
    await sleep(retryDelay(i));
  }
  throw last ?? new Error(`Failed ${url}`);
}

const failures=[];
const check = async (label, fn) => { try { await fn(); console.log(`PASS ${label}`); } catch(e){ failures.push(`${label}: ${e.message}`); console.error(`FAIL ${label}: ${e.message}`); } };

await check('homepage', async()=>{
  await fetchTextRetry(
    new URL('/',base),
    (r)=>r.ok,
    (text)=>/<main\b[^>]*id=["']main-content["']/i.test(text) && /<h1\b/i.test(text) && /THIEPN/i.test(text),
    'homepage structural identity not available yet',
  );
});
await check('catalogue.json', async()=>{
  const r=await fetchRetry(new URL('/catalogue.json',base)); const json=await r.json();
  const projects=json.projects ?? json;
  if(projects.length!==expectedProjects) throw new Error(`expected ${expectedProjects} projects, got ${projects.length}`);
});
await check('sitemap.xml', async()=>{
  const r=await fetchRetry(new URL('/sitemap.xml',base)); const text=await r.text();
  if(!text.includes(base.origin)) throw new Error('production canonical domain missing');
  if(text.includes('/dev/')) throw new Error('development route leaked into sitemap');
});

const routes = (manifest.routes ?? []).filter((route) => !route.startsWith('/dev/') && !route.endsWith('.json'));
const launches = (catalogue.projects ?? []).filter((project) => project.liveUrl);
console.log(`Production smoke fan-out: ${routes.length} routes / ${launches.length} launches / concurrency ${concurrency}.`);

await forEachConcurrent(routes, concurrency, async (route) => {
  await check(`route ${route}`, async()=>{ await fetchRetry(new URL(route,base)); });
});
await forEachConcurrent(launches, concurrency, async (project) => {
  await check(`launch ${project.code}`, async()=>{
    const r=await fetchRetry(project.liveUrl);
    if(!r.ok) throw new Error(`unexpected final status ${r.status}`);
  });
});

await check('custom 404', async()=>{
  await fetchTextRetry(
    new URL('/__production_smoke_missing__',base),
    (r)=>r.status===404,
    (text)=>/<main\b[^>]*id=["']main-content["']/i.test(text) && /THIEPN/i.test(text),
    'custom 404 structural identity not available yet',
  );
});

if(failures.length){
  console.error(`Production smoke failed (${failures.length}):`); failures.forEach(f=>console.error(`- ${f}`)); process.exit(1);
}
console.log(`Production smoke passed: ${base.href} + ${expectedProjects} live catalogue projects.`);
