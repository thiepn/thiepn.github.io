import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS, parseArgs, readProjects } from './lib/catalogue-files.mjs';

const args = parseArgs();
const projects = await readProjects();
const requested = args.slug ? new Set(String(args.slug).split(',').map((value) => value.trim())) : null;
const candidates = projects.filter(({ data }) => {
  if (requested && !requested.has(data.slug)) return false;
  if (!requested && !args.all && data.preview?.tier !== 'P1') return false;
  return Boolean(data.liveUrl) && data.visibility !== 'hidden';
});
if (!candidates.length) {
  console.log('No capture candidates matched.');
  process.exit(0);
}
if (args.dryRun) {
  candidates.forEach(({ data }) => console.log(`${data.slug}: ${data.previewRoute || data.liveUrl}`));
  process.exit(0);
}

let chromium;
try { ({ chromium } = await import('@playwright/test')); }
catch { throw new Error('Preview capture requires installed @playwright/test and Chromium. Run: npx playwright install chromium'); }

const browser = await chromium.launch({ headless: true });
try {
  for (const { data } of candidates) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 750 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const url = data.previewRoute ? new URL(data.previewRoute, data.liveUrl).href : data.liveUrl;
    console.log(`Capture ${data.slug} ← ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await page.waitForTimeout(Number(args.delay || 900));
    const directory = path.join(PATHS.public, 'projects', data.slug);
    await fs.mkdir(directory, { recursive: true });
    await page.screenshot({ path: path.join(directory, 'capture-source.png'), type: 'png', fullPage: false });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Captured ${candidates.length} preview source image(s). Run npm run media:optimize -- --write next.`);
