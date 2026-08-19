import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
  'src/components/index/LivingIndexField.astro',
  'src/scripts/living-index-controller.ts',
  'src/scripts/index-motion.ts',
  'src/motion/heroEntrance.ts',
  'src/motion/sectionReveal.ts',
  'src/motion/archiveReflow.ts',
  'src/motion/proximity.ts',
  'src/motion/reducedMotion.ts',
  'src/data/features.ts',
  'tests/unit/proximity.test.ts',
  'tests/e2e/phase5.spec.ts',
];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Phase 5 missing files:', missing);
  process.exit(1);
}
if (fs.existsSync(path.join(root, 'src/components/index/StaticIndexField.astro'))) {
  console.error('StaticIndexField should be replaced by LivingIndexField in Phase 5.');
  process.exit(1);
}
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('src/pages/index.astro');
const field = read('src/components/index/LivingIndexField.astro');
const controller = read('src/scripts/living-index-controller.ts');
const hero = read('src/motion/heroEntrance.ts');
const reveal = read('src/motion/sectionReveal.ts');
const archive = read('src/scripts/archive-controller.ts');
const reflow = read('src/motion/archiveReflow.ts');
const reduced = read('src/motion/reducedMotion.ts');
const checks = [
  [index.includes('LivingIndexField') && index.includes('data-index-hero'), 'Homepage must use the Living Index hero.'],
  [(index.match(/data-motion-section/g) ?? []).length >= 5, 'Homepage sections must opt into measured reveals.'],
  [field.includes('data-living-index') && field.includes('data-index-scanner'), 'Living Index field/scanner hooks are missing.'],
  [field.includes('--proximity') && field.includes('--field-resolve'), 'Living Index visual state variables are missing.'],
  [controller.includes('requestAnimationFrame') && controller.includes('ACTIVATION_RADIUS = 220'), 'Pointer proximity must be rAF-throttled with the locked radius.'],
  [controller.includes('MOBILE_INTERVAL = 3600') && controller.includes('IntersectionObserver'), 'Mobile periodic wake behavior is missing.'],
  [controller.includes('visibilitychange') && controller.includes("import { scroll } from 'motion'"), 'Visibility/scroll-aware Living Index behavior is missing.'],
  [hero.includes("from 'motion'") && hero.includes('stagger'), 'Hero choreography must use Motion sequencing.'],
  [reveal.includes('inView') && reveal.includes('stagger(.04)'), 'Section reveals must use restrained in-view stagger.'],
  [archive.includes('captureArchivePositions') && archive.includes('animateArchiveReflow'), 'Archive filtering must coordinate measured layout motion.'],
  [reflow.includes('duration: .34') && reflow.includes('scale: [.985, 1]'), 'Archive reflow timing/entry motion is missing.'],
  [reduced.includes('prefers-reduced-motion: reduce'), 'Reduced-motion detection is missing.'],
];
for (const [pass, message] of checks) {
  if (!pass) { console.error(message); process.exit(1); }
}
const phaseFiles = required.map(read).join('\n');
if (/cursor\s*:\s*none/i.test(phaseFiles)) {
  console.error('Phase 5 must not introduce a custom/global hidden cursor.');
  process.exit(1);
}
if (/addEventListener\(['"](?:wheel|touchmove)['"][\s\S]{0,300}preventDefault/i.test(phaseFiles)) {
  console.error('Phase 5 must not hijack native scrolling.');
  process.exit(1);
}
console.log(`Phase 5 Living Index validation passed (${required.length} required files).`);
