import fs from 'node:fs';

const failures = [];
const required = [
  'docs/ACCESSIBILITY.md',
  'docs/PHASE_12_REPORT.md',
  'scripts/audit-accessibility.mjs',
  'tests/e2e/phase12.spec.ts',
];
for (const file of required) if (!fs.existsSync(file)) failures.push(`Missing ${file}`);

const site = fs.readFileSync('src/data/site.ts', 'utf8');
const phase = /phase:\s*(\d+)/.exec(site);
if (!phase || Number(phase[1]) < 12) failures.push('SITE.phase must be at least 12.');

const playwright = fs.readFileSync('playwright.config.ts', 'utf8');
for (const browser of ["name: 'chromium'", "name: 'firefox'", "name: 'webkit'", "name: 'mobile-chromium'", "name: 'mobile-webkit'"]) {
  if (!playwright.includes(browser)) failures.push(`Playwright certification project missing ${browser}.`);
}
if (!playwright.includes("screenshot: 'only-on-failure'")) failures.push('Failure screenshots are not retained.');
if (!playwright.includes("video: 'retain-on-failure'")) failures.push('Failure video is not retained.');

const phase12 = fs.readFileSync('tests/e2e/phase12.spec.ts', 'utf8');
for (const signal of ['toMatchAriaSnapshot', 'javaScriptEnabled: false', 'reducedMotion', 'forcedColors', '320', '@mobile-cert', 'toBeFocused']) {
  if (!phase12.includes(signal)) failures.push(`Phase 12 browser suite is missing ${signal}.`);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!packageJson.scripts?.['a11y:source']) failures.push('a11y:source npm script missing.');
if (!packageJson.scripts?.['audit:phase12']) failures.push('audit:phase12 npm script missing.');

const quality = fs.readFileSync('.github/workflows/quality.yml', 'utf8');
if (!quality.includes('chromium firefox webkit')) failures.push('CI does not install all three desktop browser engines.');
if (!quality.includes('a11y:source')) failures.push('CI does not run the accessibility source audit.');

const base = fs.readFileSync('src/layouts/BaseLayout.astro', 'utf8');
if (/maximum-scale|user-scalable/i.test(base)) failures.push('Base viewport constrains zoom.');

if (failures.length) {
  console.error('Phase 12 certification validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Phase 12 browser/accessibility certification source validation passed.');
