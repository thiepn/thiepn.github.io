import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const config = JSON.parse(await fs.readFile('visual-regression.config.json', 'utf8'));
const root = path.resolve('artifacts/visual');
const currentDir = path.join(root, 'current');
const htmlPath = path.join(root, 'contact-sheet.html');
const pngPath = path.join(root, 'contact-sheet.png');

await fs.mkdir(root, { recursive: true });

const cards = [];
for (const target of config.targets) {
  const file = path.join(currentDir, `${target.id}.png`);
  const stat = await fs.stat(file).catch(() => null);
  if (!stat || stat.size < 20_000) {
    throw new Error(`Visual capture missing or too small: ${target.id}.png`);
  }
  cards.push(`
    <article class="specimen">
      <header>
        <span>${target.id}</span>
        <small>${target.viewport.toUpperCase()} / ${target.theme.toUpperCase()}${target.state ? ` / ${target.state.toUpperCase()}` : ''}</small>
      </header>
      <img src="./current/${target.id}.png" alt="${target.id}" />
    </article>`);
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>THIEPN. / Phase 15 Visual Review</title>
<style>
  * { box-sizing: border-box; }
  html { background:#0b0c0c; color:#f0eee8; font-family:Arial,sans-serif; }
  body { margin:0; padding:32px; }
  .masthead { display:flex; justify-content:space-between; align-items:end; gap:24px; border-bottom:2px solid #484945; padding-bottom:20px; margin-bottom:28px; }
  h1 { margin:0; font-size:40px; letter-spacing:-.04em; }
  .masthead p { margin:0; color:#aaa8a2; font:12px/1.5 monospace; text-align:right; }
  .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:28px 18px; align-items:start; }
  .specimen { min-width:0; border-top:1px solid #484945; padding-top:8px; }
  .specimen header { min-height:42px; display:flex; justify-content:space-between; gap:10px; align-items:start; font:10px/1.35 monospace; letter-spacing:.06em; }
  .specimen header span { font-weight:700; }
  .specimen header small { color:#aaa8a2; text-align:right; }
  .specimen img { display:block; width:100%; height:auto; border:1px solid #2b2c2b; background:#141515; }
  footer { margin-top:32px; padding-top:16px; border-top:1px solid #484945; color:#aaa8a2; font:11px/1.5 monospace; }
</style>
</head>
<body>
  <div class="masthead"><h1>THIEPN. / VISUAL REVIEW</h1><p>PHASE 15 / ${config.targets.length} CANONICAL STATES<br>NOT A BASELINE UNTIL REVIEWED</p></div>
  <main class="grid">${cards.join('')}</main>
  <footer>Generated from the production Astro build. Review composition, typography, project differentiation, THE INDEX identity, responsive behavior, light/dark parity, and absence of generic UI patterns before approving baselines.</footer>
</body>
</html>`;

await fs.writeFile(htmlPath, html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map((image) => image.complete ? Promise.resolve() : new Promise((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => reject(new Error(`Image failed: ${image.src}`)), { once: true });
    })));
  });
  await page.screenshot({ path: pngPath, fullPage: true, animations: 'disabled' });
} finally {
  await browser.close();
}

console.log(`Visual contact sheet written to ${pngPath}`);
