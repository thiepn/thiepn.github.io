import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const required = [
  'src/components/shell/MobileMenu.astro',
  'src/components/shell/SiteHeader.astro',
  'src/layouts/BaseLayout.astro',
  'src/styles/responsive.css',
  'src/styles/motion.css',
  'tests/e2e/phase3.spec.ts',
  'tests/e2e/accessibility.spec.ts',
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);

const mobileMenu = read('src/components/shell/MobileMenu.astro');
for (const marker of ['<dialog', 'showModal()', 'data-mobile-menu-open', 'data-mobile-menu-close', '<noscript>', 'ThemeControl']) {
  if (!mobileMenu.includes(marker)) failures.push(`mobile menu missing ${marker}`);
}
if (!/min-(?:width|height):44px/.test(mobileMenu)) failures.push('mobile menu touch targets are not explicitly 44px minimum.');

const header = read('src/components/shell/SiteHeader.astro');
if (!header.includes('MobileMenu')) failures.push('SiteHeader does not use MobileMenu.');
if (!header.includes('aria-current')) failures.push('desktop navigation does not expose aria-current.');
if (!/position:sticky/.test(header)) failures.push('header is no longer sticky.');
if (!/@media\(max-width:650px\)/.test(header)) failures.push('mobile header breakpoint is missing.');

const base = read('src/layouts/BaseLayout.astro');
if (!base.includes('Skip to main content')) failures.push('general skip-link wording is missing.');
if (!base.includes('tabindex="-1"')) failures.push('main content target is not focusable for skip navigation.');
if (/user-scalable\s*=\s*["']?no/i.test(base)) failures.push('pinch zoom must never be disabled.');

const responsive = read('src/styles/responsive.css');
for (const marker of ['1199px','899px','599px','379px','hover: none','pointer: coarse','forced-colors: active']) {
  if (!responsive.includes(marker)) failures.push(`responsive foundation missing ${marker}`);
}
const motion = read('src/styles/motion.css');
if (!motion.includes('prefers-reduced-motion: reduce')) failures.push('reduced-motion support is missing.');

const artifact = read('src/components/artifacts/ArtifactPlate.astro');
if (!artifact.includes('container-type:inline-size')) failures.push('Artifact Plate is missing container query ownership.');
if (!artifact.includes('@container')) failures.push('Artifact Plate does not adapt through container queries.');

const category = read('src/components/archive/CategoryIndex.astro');
if (!category.includes('aria-disabled="true"')) failures.push('empty category rows remain misleading interactive links.');

const indexPage = read('src/pages/index.astro');
const projectsPage = read('src/pages/projects/index.astro');
const collectionPage = read('src/pages/collection/[slug].astro');
const notFound = read('src/pages/404.astro');

// Page-level responsive checks validate the behavior contract rather than exact
// historical breakpoint values. Any compact breakpoint at or below the threshold
// satisfies the requirement, allowing layouts to be retuned without rewriting CI.
const maxWidthBreakpoints = (source) => [...source.matchAll(/@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)/g)].map((match) => Number(match[1]));
const hasCompactBreakpoint = (source, threshold = 900) => maxWidthBreakpoints(source).some((value) => value <= threshold);
if (!hasCompactBreakpoint(indexPage)) failures.push('home page lacks a compact responsive breakpoint at or below 900px.');
if (!hasCompactBreakpoint(projectsPage)) failures.push('projects page lacks a compact responsive breakpoint at or below 900px.');
if (!hasCompactBreakpoint(collectionPage)) failures.push('collection page lacks a compact responsive breakpoint at or below 900px.');
if (!hasCompactBreakpoint(notFound)) failures.push('404 page lacks a compact responsive breakpoint at or below 900px.');

for (const file of ['src/pages/index.astro','src/pages/projects/index.astro','src/pages/project/[slug].astro','src/pages/collections/index.astro','src/pages/collection/[slug].astro','src/pages/404.astro']) {
  const source = read(file);
  const firstSectionIndex = source.indexOf('<SectionIndex');
  const firstH1 = source.indexOf('<h1');
  if (firstSectionIndex >= 0 && firstH1 >= 0) {
    const top = source.slice(firstSectionIndex, firstH1);
    if (!top.includes('headingLevel="div"')) failures.push(`${file}: pre-h1 SectionIndex must not create an h2 before the page h1.`);
  }
}

function hexToRgb(hex) {
  const normalized = hex.replace('#','');
  return [0,2,4].map((index) => parseInt(normalized.slice(index,index+2),16)/255);
}
function channel(v) { return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }
function luminance(hex) { const [r,g,b] = hexToRgb(hex).map(channel); return .2126*r + .7152*g + .0722*b; }
function contrast(a,b) { const [l1,l2] = [luminance(a),luminance(b)].sort((x,y)=>y-x); return (l1+.05)/(l2+.05); }
const tokens = read('src/styles/tokens.css');
const themes = read('src/styles/themes.css');
const lightMuted = /--ink-muted:\s*(#[0-9a-f]{6})/i.exec(tokens)?.[1];
const lightCanvas = /--canvas:\s*(#[0-9a-f]{6})/i.exec(tokens)?.[1];
const darkBlock = /:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(themes)?.[1] ?? '';
const darkMuted = /--ink-muted:\s*(#[0-9a-f]{6})/i.exec(darkBlock)?.[1];
const darkCanvas = /--canvas:\s*(#[0-9a-f]{6})/i.exec(darkBlock)?.[1];
if (!lightMuted || !lightCanvas || contrast(lightMuted, lightCanvas) < 4.5) failures.push('light muted metadata contrast must be at least 4.5:1.');
if (!darkMuted || !darkCanvas || contrast(darkMuted, darkCanvas) < 4.5) failures.push('dark muted metadata contrast must be at least 4.5:1.');

const site = read('src/data/site.ts');
const phaseMatch = /phase:\s*(\d+)/.exec(site);
if (!phaseMatch || Number(phaseMatch[1]) < 3) failures.push('SITE.phase must be at least 3.');

if (failures.length) {
  console.error('Phase 3 validation failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`Phase 3 responsive/accessibility validation passed (${required.length} required files).`);
console.log(`Muted metadata contrast: light ${contrast(lightMuted, lightCanvas).toFixed(2)}:1 / dark ${contrast(darkMuted, darkCanvas).toFixed(2)}:1.`);
