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
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('src/pages/index.astro');
const controller = read('src/scripts/living-index-controller.ts');
const hero = read('src/motion/heroEntrance.ts');
const reveal = read('src/motion/sectionReveal.ts');
const archive = read('src/scripts/archive-controller.ts');
const reflow = read('src/motion/archiveReflow.ts');
const reduced = read('src/motion/reducedMotion.ts');
const checks = [
  [index.includes('data-index-hero'), 'Homepage must keep the restrained hero motion hook.'],
  [(index.match(/data-motion-section/g) ?? []).length >= 3, 'Homepage hub sections must opt into measured reveals.'],
  [index.includes('data-project-directory'), 'Homepage must expose the compact project-directory hook.'],
  [!index.includes('LivingIndexField'), 'Homepage must not render the decorative Living Index field.'],
  [!index.includes('<ProjectArchive'), 'Homepage must not duplicate the full interactive project archive.'],
  [controller.includes('requestAnimationFrame') && controller.includes('ACTIVATION_RADIUS = 220'), 'Legacy proximity infrastructure must remain bounded and rAF-throttled.'],
  [hero.includes("from 'motion'") && hero.includes('stagger') && !hero.includes('scale: [.97, 1]'), 'Hero choreography must use restrained Motion sequencing without fragment scaling.'],
  [reveal.includes('inView') && reveal.includes('stagger(.025)') && reveal.includes('y: [6, 0]'), 'Section reveals must use the reconstructed restrained in-view stagger.'],
  [archive.includes('captureArchivePositions') && archive.includes('animateArchiveReflow'), 'Dedicated archive filtering must coordinate measured layout motion.'],
  [reflow.includes('duration: .30') && reflow.includes('y: [4, 0]') && !reflow.includes('scale:'), 'Archive reflow must use mechanical translation without entry scaling.'],
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
console.log(`Phase 5/P3 compact portfolio motion validation passed (${required.length} motion/accessibility support files retained).`);
