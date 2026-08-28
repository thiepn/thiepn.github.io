import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS, parseArgs, readProjects } from './lib/catalogue-files.mjs';

const args = parseArgs();
const projects = await readProjects();
const requested = args.slug ? new Set(String(args.slug).split(',').map((value) => value.trim())) : null;
const candidates = projects.filter(({ data }) => {
  if (requested && !requested.has(data.slug)) return false;
  if (!requested && !args.all && data.preview?.tier !== 'P1') return false;
  if (!requested && data.preview?.type === 'video') return false;
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

const delay = Number(args.delay || 1400);
const failures = [];
const captures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const { data } of candidates) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      colorScheme: 'no-preference',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const url = data.previewRoute ? new URL(data.previewRoute, data.liveUrl).href : data.liveUrl;

    try {
      console.log(`Capture ${data.slug} ← ${url}`);
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);

      await page.addStyleTag({
        content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}',
      });
      await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
      await page.waitForLoadState('networkidle', { timeout: 4500 }).catch(() => {});
      await page.waitForTimeout(delay);

      const directory = path.join(PATHS.public, 'projects', data.slug);
      await fs.mkdir(directory, { recursive: true });
      const output = path.join(directory, 'capture.jpg');
      await page.screenshot({
        path: output,
        type: 'jpeg',
        quality: 82,
        fullPage: false,
        animations: 'disabled',
      });
      captures.push(data.slug);
    } catch (error) {
      failures.push({ slug: data.slug, url, error: error instanceof Error ? error.message : String(error) });
      console.warn(`Capture skipped for ${data.slug}: ${failures.at(-1).error}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`Captured ${captures.length}/${candidates.length} authentic preview(s).`);
if (failures.length) {
  console.warn(`${failures.length} capture(s) failed; existing synthetic/static fallbacks remain available.`);
  failures.forEach((failure) => console.warn(`- ${failure.slug}: ${failure.error}`));
}
