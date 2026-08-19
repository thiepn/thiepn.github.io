import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'package.json',
  'astro.config.mjs',
  'tsconfig.json',
  'src/layouts/BaseLayout.astro',
  'src/pages/index.astro',
  'src/pages/404.astro',
  'src/styles/tokens.css',
  'src/styles/themes.css',
  'src/styles/global.css',
  'public/favicon.svg',
  'public/manifest.webmanifest',
  'public/.nojekyll',
  '.github/workflows/quality.yml',
  '.github/workflows/deploy.yml',
  'docs/DESIGN_SYSTEM.md',
  'docs/CONTENT_MODEL.md',
  'docs/ARCHITECTURE.md',
  'docs/MASTER_IMPLEMENTATION_PROMPT.md',
];

const failures = [];

for (const file of requiredFiles) {
  try {
    await access(new URL(`../${file}`, import.meta.url), constants.R_OK);
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const astroConfig = await readFile(new URL('../astro.config.mjs', import.meta.url), 'utf8');
const tokenCss = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const designSystem = await readFile(new URL('../docs/DESIGN_SYSTEM.md', import.meta.url), 'utf8');

if (packageJson.dependencies?.astro !== '7.1.6') failures.push('Astro must be pinned to 7.1.6 for this Phase 0 snapshot.');
if (packageJson.dependencies?.motion !== '12.43.0') failures.push('Motion must be pinned to 12.43.0 for this Phase 0 snapshot.');
if (!/site:\s*['"]https:\/\/(?:thiepn\.github\.io|thiepn\.dev)['"]/.test(astroConfig)) failures.push('Astro site URL must target the root Pages site or its production custom domain.');
if (/\bbase\s*:/.test(astroConfig)) failures.push('Root user Pages repository must not define a project base path.');
if (!tokenCss.includes('--radius-sm: 4px')) failures.push('THE INDEX small-radius token is missing.');
if (!tokenCss.includes('--canvas: #eceae3')) failures.push('THE INDEX paper canvas token is missing.');
if (!designSystem.includes('THE INDEX / DS-01')) failures.push('Authoritative design-system identity is missing.');

const forbiddenPatterns = [
  ['generic glassmorphism', /backdrop-filter\s*:\s*blur\(2[0-9]px/i],
  ['large generic card radius', /border-radius\s*:\s*(2[0-9]|3[0-9])px/i],
];

for (const [label, pattern] of forbiddenPatterns) {
  if (pattern.test(tokenCss)) failures.push(`Forbidden ${label} detected in token foundation.`);
}

if (failures.length) {
  console.error('Phase 0 validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Phase 0 structural validation passed (${requiredFiles.length} required files).`);
