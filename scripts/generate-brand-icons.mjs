import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const svgPath = path.join(root, 'public', 'app-icon.svg');
const svg = await fs.readFile(svgPath, 'utf8');
const targets = [
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const target of targets) {
    const context = await browser.newContext({ viewport: { width: target.size, height: target.size }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:${target.size}px;height:${target.size}px;overflow:hidden}svg{display:block;width:${target.size}px;height:${target.size}px}</style></head><body>${svg}</body></html>`);
    await page.screenshot({
      path: path.join(root, 'public', target.file),
      type: 'png',
      clip: { x: 0, y: 0, width: target.size, height: target.size },
      animations: 'disabled',
    });
    await context.close();
    console.log(`Generated ${target.file} (${target.size}x${target.size}).`);
  }
} finally {
  await browser.close();
}
