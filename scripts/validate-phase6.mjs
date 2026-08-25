import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
  'src/components/artifacts/InteractivePreview.astro',
  'src/components/artifacts/ProjectPreview.astro',
  'src/scripts/preview-controller.ts',
  'src/lib/preview-core.ts',
  'tests/unit/preview-core.test.ts',
  'tests/e2e/phase6.spec.ts',
  'public/projects/wordstrike/preview.webm',
];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) { console.error('Phase 6 missing files:', missing); process.exit(1); }
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const component = read('src/components/artifacts/InteractivePreview.astro');
const projectPreview = read('src/components/artifacts/ProjectPreview.astro');
const controller = read('src/scripts/preview-controller.ts');
const core = read('src/lib/preview-core.ts');
const layout = read('src/layouts/BaseLayout.astro');
const runtimeLoader = fs.existsSync(path.join(root, 'src/scripts/runtime-loader.ts')) ? read('src/scripts/runtime-loader.ts') : '';
const plate = read('src/components/artifacts/ArtifactPlate.astro');
const record = read('src/pages/project/[slug].astro');
const pdf = read('src/content/projects/pdf-studio.md');
const strike = read('src/content/projects/wordstrike.md');
const french = read('src/content/projects/french-3000.md');
const checks = [
  [component.includes('data-preview-root') && component.includes('data-preview-state'), 'InteractivePreview must expose lifecycle hooks.'],
  [component.includes('preload="none"') && component.includes('data-preview-video'), 'Video previews must remain poster-first/lazy.'],
  [controller.includes("'poster'") && controller.includes("'armed'") && controller.includes("'active'") && controller.includes("'settled'"), 'Preview lifecycle states are incomplete.'],
  [core.includes('return coarsePointer ? 1 : 2'), 'Global active preview limits must be 2 desktop / 1 coarse pointer.'],
  [controller.includes('IntersectionObserver') && controller.includes('visibilitychange') && controller.includes('pagehide'), 'Offscreen/hidden-page cleanup is incomplete.'],
  [controller.includes('prefersReducedMotion()'), 'Reduced-motion guard is missing.'],
  [controller.includes('video.src = source') && controller.includes('video.load()'), 'Video source must be assigned only during prepare/interaction.'],
  [plate.includes('InteractivePreview'), 'Artifact Plates must use the shared interactive preview wrapper.'],
  [record.includes('ProjectPreview') && record.includes('focusable={true}'), 'Artifact Records must route primary media through ProjectPreview with interactive fallback focus enabled.'],
  [projectPreview.includes('<InteractivePreview') && projectPreview.includes('focusable={focusable}'), 'ProjectPreview must pass record focusability through to interactive fallback previews.'],
  [projectPreview.includes("p.preview.provenance === 'captured'") && projectPreview.includes('poster'), 'ProjectPreview must support non-interactive captured poster media without adding an unnecessary focus stop.'],
  [(layout.includes("import '../scripts/preview-controller'") || (layout.includes("import '../scripts/runtime-loader'") && runtimeLoader.includes("import('./preview-controller')"))), 'PreviewController must initialize from the shared layout/runtime loader.'],
  [pdf.includes('type: synthetic') && pdf.includes('duration: 3800'), 'PDF Studio proof preview configuration is missing.'],
  [strike.includes('type: video') && strike.includes('/projects/wordstrike/preview.webm') && strike.includes('duration: 3400'), 'WORDSTRIKE video proof configuration is missing.'],
  [french.includes('type: synthetic') && french.includes('duration: 3600'), 'French 3000 proof preview configuration is missing.'],
];
for (const [pass, message] of checks) { if (!pass) { console.error(message); process.exit(1); } }
const size = fs.statSync(path.join(root, 'public/projects/wordstrike/preview.webm')).size;
if (size > 3 * 1024 * 1024) { console.error('WORDSTRIKE preview video exceeds the 3 MB hard preview budget.'); process.exit(1); }
if (/autoplay/i.test(component)) { console.error('Preview videos must not use autoplay markup.'); process.exit(1); }
if (/preload=["']auto["']/i.test(component)) { console.error('Preview videos must not preload automatically.'); process.exit(1); }
console.log(`Phase 6 preview-framework validation passed (${required.length} required files, ${(size/1024).toFixed(1)} KB preview video).`);
