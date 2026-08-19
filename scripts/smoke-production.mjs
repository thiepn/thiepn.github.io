import fs from 'node:fs';

const args = process.argv.slice(2);
const arg = (name) => { const i=args.indexOf(name); return i>=0 ? args[i+1] : undefined; };
const base = new URL(arg('--url') || process.env.PRODUCTION_URL || 'https://thiepn.dev/');
const manifest = JSON.parse(fs.readFileSync('src/generated/route-manifest.json','utf8'));
const catalogue = JSON.parse(fs.readFileSync('src/generated/catalogue-public.json','utf8'));
const retries = Number(arg('--retries') || 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchRetry(url, expected = (r) => r.ok) {
  let last;
  for (let i=0;i<retries;i++) {
    try {
      const r = await fetch(url, { redirect:'follow', headers:{'user-agent':'THIEPN-Phase15-Smoke/1.0'} });
      if (expected(r)) return r;
      last = new Error(`${r.status} ${r.statusText}`);
    } catch (e) { last=e; }
    await sleep(Math.min(1500 + i*1000, 7000));
  }
  throw last ?? new Error(`Failed ${url}`);
}

const failures=[];
const check = async (label, fn) => { try { await fn(); console.log(`PASS ${label}`); } catch(e){ failures.push(`${label}: ${e.message}`); console.error(`FAIL ${label}: ${e.message}`); } };

await check('homepage', async()=>{
  const r=await fetchRetry(new URL('/',base)); const text=await r.text();
  if(!/THIEPN\./.test(text) || !/PROJECT INDEX|THE INDEX/i.test(text)) throw new Error('identity marker missing');
});
await check('catalogue.json', async()=>{
  const r=await fetchRetry(new URL('/catalogue.json',base)); const json=await r.json();
  const projects=json.projects ?? json; if(projects.length!==19) throw new Error(`expected 19 projects, got ${projects.length}`);
});
await check('sitemap.xml', async()=>{
  const r=await fetchRetry(new URL('/sitemap.xml',base)); const text=await r.text();
  if(!text.includes('https://thiepn.dev/')) throw new Error('production canonical domain missing');
  if(text.includes('/dev/')) throw new Error('development route leaked into sitemap');
});
for (const route of manifest.routes ?? []) {
  if (route.startsWith('/dev/') || route.endsWith('.json')) continue;
  await check(`route ${route}`, async()=>{ await fetchRetry(new URL(route,base)); });
}
for (const project of catalogue.projects ?? []) {
  await check(`launch ${project.code}`, async()=>{
    const r=await fetchRetry(project.liveUrl);
    if(!r.url.startsWith('https://thiepn.dev/')) throw new Error(`unexpected final URL ${r.url}`);
  });
}
await check('custom 404', async()=>{
  const r=await fetchRetry(new URL('/__phase15_missing__',base), (res)=>res.status===404);
  const text=await r.text(); if(!/UNCATALOGUED/i.test(text)) throw new Error('custom 404 identity missing');
});

if(failures.length){
  console.error(`Production smoke failed (${failures.length}):`); failures.forEach(f=>console.error(`- ${f}`)); process.exit(1);
}
console.log(`Production smoke passed: ${base.href} + ${(catalogue.projects??[]).length} live artifacts.`);
