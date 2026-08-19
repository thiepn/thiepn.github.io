import { parseArgs, readProjects } from './lib/catalogue-files.mjs';

const args = parseArgs();
const online = Boolean(args.online);
const projects = await readProjects();
const links = [];
for (const { data } of projects) {
  if (data.repo) links.push({ slug: data.slug, kind: 'repo', url: `https://github.com/${data.repo}` });
  if (data.liveUrl) links.push({ slug: data.slug, kind: 'live', url: data.liveUrl });
}
const failures = [];
for (const item of links) {
  try {
    const parsed = new URL(item.url);
    if (parsed.protocol !== 'https:') failures.push(`${item.slug}: ${item.kind} URL must use HTTPS.`);
  } catch { failures.push(`${item.slug}: invalid ${item.kind} URL.`); }
}
if (!online) {
  if (failures.length) {
    failures.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
  }
  console.log(`Link syntax validation passed: ${links.length} URLs. Use --online for live health checks.`);
  process.exit(0);
}

async function check(item) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let response = await fetch(item.url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': 'thiepn-index-link-health' } });
    if ([403, 405].includes(response.status)) response = await fetch(item.url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { Range: 'bytes=0-0', 'User-Agent': 'thiepn-index-link-health' } });
    return { ...item, status: response.status, ok: response.ok || response.status === 206 };
  } catch (error) { return { ...item, status: null, ok: false, error: String(error?.message ?? error) }; }
  finally { clearTimeout(timer); }
}

const results = [];
for (let i = 0; i < links.length; i += 5) results.push(...await Promise.all(links.slice(i, i + 5).map(check)));
const broken = results.filter((item) => !item.ok);
if (broken.length) {
  console.error(`Link health found ${broken.length} failure(s):`);
  broken.forEach((item) => console.error(`- ${item.slug} ${item.kind}: ${item.status ?? item.error}`));
  process.exit(1);
}
console.log(`Online link health passed: ${results.length} URLs.`);
