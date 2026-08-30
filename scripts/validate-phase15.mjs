import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const fail = (m) => failures.push(m);
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const rc = JSON.parse(fs.readFileSync('release-candidate.json','utf8'));
const prod = JSON.parse(fs.readFileSync('release-production.json','utf8'));
const site = fs.readFileSync('src/data/site.ts','utf8');
const astro = fs.readFileSync('astro.config.mjs','utf8');
const robots = fs.readFileSync('public/robots.txt','utf8');

if (pkg.version !== '1.0.0') fail(`package version must be 1.0.0, got ${pkg.version}`);
if (rc.release !== '1.0.0' || rc.phase !== 15) fail('release-candidate.json must preserve the promoted 1.0.0 / Phase 15 release record');
if (prod.release !== rc.release || prod.phase !== rc.phase || prod.productionUrl !== 'https://thiepn.dev/') fail('release-production.json must match the frozen promoted release record');

const sitePhaseMatch = /phase:\s*(\d+)\b/.exec(site);
if (!sitePhaseMatch) {
  fail('SITE.phase must be present and numeric');
} else if (Number(sitePhaseMatch[1]) < Number(prod.phase)) {
  fail(`SITE.phase must not regress below production Phase ${prod.phase}; got ${sitePhaseMatch[1]}`);
}

if (!site.includes("url: 'https://thiepn.dev'")) fail('SITE.url must be https://thiepn.dev');
if (!astro.includes("site: 'https://thiepn.dev'")) fail('Astro canonical site must be https://thiepn.dev');
if (!robots.includes('https://thiepn.dev/sitemap.xml')) fail('robots.txt sitemap must use production domain');
for (const file of ['CNAME','public/CNAME']) {
  if (!fs.existsSync(file) || fs.readFileSync(file,'utf8').trim() !== 'thiepn.dev') fail(`${file} must contain thiepn.dev`);
}
for (const name of fs.readdirSync('src/content/projects')) {
  if (!name.endsWith('.md')) continue;
  const text = fs.readFileSync(path.join('src/content/projects',name),'utf8');
  const match = /^liveUrl:\s*(\S+)/m.exec(text);
  if (match && !match[1].startsWith('https://thiepn.dev/')) fail(`${name}: liveUrl must use thiepn.dev`);
}
if (fs.existsSync('src/generated/catalogue-public.json')) {
  const catalogue = JSON.parse(fs.readFileSync('src/generated/catalogue-public.json','utf8'));
  for (const project of catalogue.projects ?? []) {
    if (!project.liveUrl?.startsWith('https://thiepn.dev/')) fail(`${project.code}: generated liveUrl is not production-domain canonical`);
  }
}
if (failures.length) {
  console.error(`Phase 15 production-source validation failed (${failures.length}):`);
  failures.forEach((m) => console.error(`- ${m}`));
  process.exit(1);
}
console.log(`Production-source validation passed: v${prod.release} baseline / Phase ${prod.phase}+ / thiepn.dev / canonical project URLs.`);
