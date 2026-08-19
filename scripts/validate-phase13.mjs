import fs from 'node:fs';
const required = [
  'visual-regression.config.json',
  'scripts/audit-visual-language.mjs',
  'scripts/capture-visuals.mjs',
  'scripts/build-contact-sheet.mjs',
  'tests/visual/phase13.visual.spec.ts',
  'playwright.visual.config.ts',
  'docs/VISUAL_REGRESSION.md',
  'docs/PHASE_13_REPORT.md',
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(`Phase 13 validation failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}
const packageJson = JSON.parse(fs.readFileSync('package.json','utf8'));
for (const script of ['visual:audit','visual:capture','visual:contact-sheet','visual:update','visual:check','audit:phase13']) {
  if (!packageJson.scripts?.[script]) { console.error(`Phase 13 validation failed. Missing npm script ${script}`); process.exit(1); }
}
const config = JSON.parse(fs.readFileSync('visual-regression.config.json','utf8'));
if (config.targets.length < 12) { console.error('Phase 13 requires at least 12 canonical screenshots.'); process.exit(1); }
const preview = fs.readFileSync('src/components/artifacts/PreviewAperture.astro','utf8');
const sceneCount = (preview.match(/p\.slug === '/g) || []).length;
if (sceneCount < 19) { console.error(`Phase 13 requires 19 public project-specific preview branches; found ${sceneCount}.`); process.exit(1); }
console.log(`Phase 13 visual/art-direction validation passed (${sceneCount} project-specific scenes, ${config.targets.length} canonical states).`);
