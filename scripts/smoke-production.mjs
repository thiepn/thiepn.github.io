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

async function expectPng(path, size) {
  const r = await fetchRetry(new URL(path, base));
  const type = r.headers.get('content-type') ?? '';
  if (!type.includes('image/png')) throw new Error(`${path} expected image/png, got ${type || 'missing content-type'}`);
  const body = Buffer.from(await r.arrayBuffer());
  if (body.length < 24 || body.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${path} is not a valid PNG`);
  if (body.readUInt32BE(16) !== size || body.readUInt32BE(20) !== size) throw new Error(`${path} expected ${size}x${size}`);
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
await check('manifest.webmanifest', async()=>{
  const r=await fetchRetry(new URL('/manifest.webmanifest',base));
  const json=await r.json();
  if(json.name!=='THIEPN') throw new Error(`expected name THIEPN, got ${json.name ?? 'missing'}`);
  if(json.short_name!=='THIEPN') throw new Error(`expected short_name THIEPN, got ${json.short_name ?? 'missing'}`);
  if(json.id!=='/') throw new Error(`expected id /, got ${json.id ?? 'missing'}`);
  if(json.display!=='standalone') throw new Error(`expected display standalone, got ${json.display ?? 'missing'}`);
  const icons = Array.isArray(json.icons) ? json.icons : [];
  const expectedIcons = [
    ['/icon-192.png','192x192','any'],
    ['/icon-512.png','512x512','any'],
    ['/icon-192.png','192x192','maskable'],
    ['/icon-512.png','512x512','maskable'],
  ];
  for (const [src,sizes,purpose] of expectedIcons) {
    if (!icons.some((icon)=>icon.src===src && icon.sizes===sizes && icon.type==='image/png' && icon.purpose===purpose)) {
      throw new Error(`missing PNG icon ${src} ${sizes} ${purpose}`);
    }
  }
  if (icons.some((icon)=>icon.type==='image/svg+xml')) throw new Error('launcher manifest must not advertise SVG icons');
  await Promise.all([expectPng('/icon-192.png',192), expectPng('/icon-512.png',512)]);
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
