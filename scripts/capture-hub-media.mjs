import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { readFrontmatterDirectory } from './lib/catalogue-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const hub = JSON.parse(await readFile(resolve(root, 'src/data/hub.json'), 'utf8'));
const projectFiles = await readFrontmatterDirectory(resolve(root, 'src/content/projects'));
const projects = new Map(projectFiles.map(({ data }) => [data.slug, data]));
const outputDir = resolve(root, 'src/assets/hub');
const manifestPath = resolve(root, 'src/generated/hub-media.json');
const viewport = { width: 1440, height: 900 };
const capturedAt = new Date().toISOString();
const failures = [];
const manifest = { schemaVersion: 1, capturedAt, width: viewport.width, height: viewport.height, format: 'webp', captures: {} };

await mkdir(outputDir, { recursive: true });
await mkdir(resolve(root, 'src/generated'), { recursive: true });

const browser = await chromium.launch({ headless: true });
const conversionContext = await browser.newContext();
const conversionPage = await conversionContext.newPage();

async function convertPngToWebp(pngBuffer) {
  const source = `data:image/png;base64,${pngBuffer.toString('base64')}`;
  const result = await conversionPage.evaluate(async (imageSource) => {
    const image = new Image();
    image.src = imageSource;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not create screenshot conversion canvas.');
    context.drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', 0.82);
  }, source);
  return Buffer.from(result.slice(result.indexOf(',') + 1), 'base64');
}

async function clickVisible(locator) {
  if (!await locator.isVisible().catch(() => false)) return false;
  await locator.click({ force: true }).catch(() => {});
  return true;
}

async function dismissCommonObstruction(page) {
  const candidates = [
    page.getByRole('button', { name: /^(skip|skip intro|close|dismiss|not now|maybe later|got it)$/i }).first(),
    page.locator('button[aria-label*="dismiss" i],button[aria-label*="close" i]').first(),
  ];
  for (const candidate of candidates) {
    if (await clickVisible(candidate)) {
      await page.waitForTimeout(250);
      break;
    }
  }
}

async function prepareWordstrike(page) {
  const backdrop = page.locator('.onboarding-backdrop').first();
  if (!await backdrop.isVisible().catch(() => false)) return;
  const skip = page.locator('[data-onboarding-action="skip"],[data-onboarding-action="close"]').first();
  if (!await clickVisible(skip)) await page.keyboard.press('Escape').catch(() => {});
  await backdrop.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

async function prepareSteadybar(page) {
  const starter = page.getByRole('button', { name: /use starter routine/i }).first();
  if (await clickVisible(starter)) {
    await page.locator('dialog[open]').waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(900);
  }
}

async function preparePdfStudio(page) {
  const sample = page.getByRole('button', { name: /open sample/i }).first();
  if (!await clickVisible(sample)) return;
  await page.waitForFunction(() => window.location.hash.startsWith('#/workspace/'), null, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_600);
}

async function prepareMicroArcade(page) {
  if (await clickVisible(page.locator('#play-btn-orbit').first())) await page.waitForTimeout(1_200);
}

async function prepareVoidcut(page) {
  const play = page.locator('#play').first();
  if (!await clickVisible(play)) return;
  await page.locator('#menu').first().waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(1_300);
}

async function prepareBibleChallenge(page) {
  await dismissCommonObstruction(page);
  const quickPlay = page.getByRole('button', { name: /quick play/i }).first();
  if (await clickVisible(quickPlay)) await page.waitForTimeout(1_200);
}

async function prepareCanonicalState(page, slug) {
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}',
  }).catch(() => {});

  if (slug === 'wordstrike') await prepareWordstrike(page);
  else if (slug === 'steadybar') await prepareSteadybar(page);
  else if (slug === 'pdf-studio') await preparePdfStudio(page);
  else if (slug === 'micro-arcade') await prepareMicroArcade(page);
  else if (slug === 'voidcut') await prepareVoidcut(page);
  else if (slug === 'the-bible-challenge') await prepareBibleChallenge(page);
  else await dismissCommonObstruction(page);

  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.waitForTimeout(700);
}

try {
  for (const hubEntry of [...hub.projects].sort((a, b) => a.order - b.order)) {
    const project = projects.get(hubEntry.slug);
    if (!project?.liveUrl) {
      failures.push({ slug: hubEntry.slug, error: 'Missing liveUrl.' });
      continue;
    }

    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });

    await context.addInitScript((slug) => {
      try {
        if (slug === 'notes') localStorage.setItem('notes.onboarding.quickstart.v1', 'done');
        if (slug === 'voidcut') localStorage.setItem('voidcut.standalone.v1', JSON.stringify({ schemaVersion: 17, tutorialSeen: true, dividerTutorialSeen: true }));
      } catch {}
    }, hubEntry.slug);

    const page = await context.newPage();
    try {
      console.log(`Capture ${hubEntry.order}/${hub.expectedCount}: ${hubEntry.slug} ← ${project.liveUrl}`);
      const response = await page.goto(project.liveUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; }).catch(() => {});
      await page.waitForTimeout(1_100);
      await prepareCanonicalState(page, hubEntry.slug);

      const png = await page.screenshot({ type: 'png', fullPage: false, animations: 'disabled' });
      const webp = await convertPngToWebp(png);
      const file = `${hubEntry.slug}.webp`;
      await writeFile(resolve(outputDir, file), webp);
      manifest.captures[hubEntry.slug] = {
        file: `/src/assets/hub/${file}`,
        url: project.liveUrl,
        bytes: webp.byteLength,
      };
    } catch (error) {
      failures.push({ slug: hubEntry.slug, error: error instanceof Error ? error.message : String(error) });
      console.error(`Capture failed for ${hubEntry.slug}: ${failures.at(-1).error}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await conversionContext.close();
  await browser.close();
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const captured = Object.keys(manifest.captures).length;
console.log(`Captured ${captured}/${hub.expectedCount} canonical Hub previews.`);
if (failures.length) {
  console.error('Hub media capture failures:');
  failures.forEach((failure) => console.error(`- ${failure.slug}: ${failure.error}`));
  process.exit(1);
}
