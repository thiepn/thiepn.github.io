import fs from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const config = JSON.parse(await fs.readFile('visual-regression.config.json','utf8'));
const outDir = path.resolve('artifacts/visual/current');
await fs.rm(outDir,{recursive:true,force:true});
await fs.mkdir(outDir,{recursive:true});

const visualStabilityCss = `
  *,*::before,*::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  * {
    content-visibility: visible !important;
    contain-intrinsic-size: none !important;
  }
`;

const port = 4323;
const isWindows = process.platform === 'win32';
const server = spawn(isWindows ? 'npm.cmd' : 'npm', ['run','preview','--','--host','127.0.0.1','--port',String(port)], {
  stdio: ['ignore','pipe','pipe'],
  detached: !isWindows,
});
let serverOutput = '';
server.stdout.on('data', (data) => { serverOutput = `${serverOutput}${data}`.slice(-12_000); });
server.stderr.on('data', (data) => { serverOutput = `${serverOutput}${data}`.slice(-12_000); });

const baseURL = `http://127.0.0.1:${port}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForServer = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Preview server exited before becoming ready. ${serverOutput}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Preview server failed to start. ${serverOutput}`);
};

async function stopServer() {
  if (server.exitCode !== null || !server.pid) return;

  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  const exited = once(server, 'exit').catch(() => undefined);
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }

  await Promise.race([exited, delay(2_000)]);
  if (server.exitCode === null) {
    try { process.kill(-server.pid, 'SIGKILL'); } catch { server.kill('SIGKILL'); }
    await Promise.race([exited, delay(1_000)]);
  }
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  for (const target of config.targets) {
    const viewport = target.viewport === 'mobile' ? config.mobileViewport : config.referenceViewport;
    const context = await browser.newContext({ viewport, colorScheme: target.theme, reducedMotion: 'reduce' });
    await context.addInitScript((theme) => localStorage.setItem('thiepn:index-theme', theme), target.theme);
    const page = await context.newPage();
    await page.goto(`${baseURL}${target.path}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready);
    if (target.state === 'search') {
      await page.keyboard.press('Control+K');
      const input = page.getByRole('combobox', { name: 'Search projects and collections' });
      await input.fill(target.query ?? 'analysis');
      await page.waitForTimeout(100);
    }
    await page.addStyleTag({ content: visualStabilityCss });
    await page.screenshot({ path: path.join(outDir, `${target.id}.png`), fullPage: true, animations: 'disabled' });
    await context.close();
    console.log(`captured ${target.id}`);
  }
} finally {
  await browser?.close().catch(() => undefined);
  await stopServer();
}
