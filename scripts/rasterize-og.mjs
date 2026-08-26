import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { PATHS, SCRIPT_ROOT } from './lib/catalogue-files.mjs';

const WIDTH = 1200;
const HEIGHT = 630;
const generator = spawnSync(process.execPath, [path.join(SCRIPT_ROOT, 'scripts/generate-og.mjs'), '--svg-only'], { stdio: 'inherit', env: process.env });
if (generator.status !== 0) process.exit(generator.status ?? 1);

const svgFiles = (await fs.readdir(PATHS.og)).filter((file) => file.endsWith('.svg')).sort();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
const page = await context.newPage();
const entries = {};

for (const file of svgFiles) {
  const svg = await fs.readFile(path.join(PATHS.og, file), 'utf8');
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:#ECEAE3}svg{display:block;width:${WIDTH}px;height:${HEIGHT}px}</style></head><body>${svg}</body></html>`);
  const png = file.replace(/\.svg$/i, '.png');
  await page.screenshot({
    path: path.join(PATHS.og, png),
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    animations: 'disabled',
  });
  entries[file] = {
    png,
    sha256: createHash('sha256').update(svg).digest('hex'),
  };
}

await browser.close();
const manifest = { version: 1, width: WIDTH, height: HEIGHT, entries };
const manifestPath = path.join(PATHS.generated, 'og-raster-manifest.json');
await fs.mkdir(path.dirname(manifestPath), { recursive: true });
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Rasterized ${svgFiles.length} Open Graph cards at ${WIDTH}x${HEIGHT}.`);
