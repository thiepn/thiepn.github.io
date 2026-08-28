import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(astro|css|ts)$/.test(entry.name)) out.push(rel);
  }
  return out;
};
const failures = [];
const fail = (message) => failures.push(message);
const files = walk('src');

for (const rel of files) {
  const source = read(rel);
  if (/backdrop-filter\s*:|filter\s*:\s*blur\(/i.test(source)) fail(`${rel}: glass/blur effect is prohibited`);
  if (/background(?:-image)?\s*:[^;]*linear-gradient\([^;]*\btext\b/i.test(source)) fail(`${rel}: gradient text-like treatment detected`);
  if (/border-radius\s*:\s*(?:2[4-9]|[3-9]\d|\d{3,})px/i.test(source) && !rel.endsWith('PreviewAperture.astro')) fail(`${rel}: radius exceeds Editorial Precision geometry contract`);
  if (/box-shadow\s*:/i.test(source) && !rel.endsWith('PreviewAperture.astro') && !rel.endsWith('InteractivePreview.astro') && !rel.endsWith('[slug].astro')) fail(`${rel}: shadow outside a project aperture/record state`);
}

const preview = read('src/components/artifacts/PreviewAperture.astro');
const projectDir = path.join(root, 'src/content/projects');
const publicProjects = [];
for (const file of fs.readdirSync(projectDir).filter((name) => name.endsWith('.md'))) {
  const source = fs.readFileSync(path.join(projectDir, file), 'utf8');
  const slug = source.match(/^slug:\s*([^\n]+)/m)?.[1]?.trim();
  const visibility = source.match(/^visibility:\s*([^\n]+)/m)?.[1]?.trim();
  const previewBlock = source.match(/^preview:\s*\n([\s\S]*?)(?=^[A-Za-z][A-Za-z0-9_-]*:\s*(?:\n|$)|^---$)/m)?.[1] ?? '';
  const previewType = previewBlock.match(/^\s*type:\s*([^\n]+)/m)?.[1]?.trim().replace(/["']/g, '') ?? 'static';
  if (slug && visibility === 'listed') publicProjects.push({ slug, previewType });
}
const dedicatedSceneSlugs = publicProjects.filter(({ slug }) => preview.includes(`p.slug === '${slug}'`)).map(({ slug }) => slug);
const staticFallbackSlugs = publicProjects.filter(({ slug, previewType }) => previewType === 'static' && !preview.includes(`p.slug === '${slug}'`)).map(({ slug }) => slug);
const missingRequiredScenes = publicProjects
  .filter(({ slug, previewType }) => previewType !== 'static' && !preview.includes(`p.slug === '${slug}'`))
  .map(({ slug }) => slug);
if (missingRequiredScenes.length) fail(`Interactive/video public artifacts missing dedicated aperture scenes: ${missingRequiredScenes.join(', ')}`);
if (!preview.includes('scene--generic')) fail('Static preview fallback composition is missing');
if (preview.includes('p.slug === \'markdown-guide\'')) fail('HOLD artifact should not require a public aperture composition');

const collectionPreview = read('src/components/collections/CollectionPreview.astro');
if (!collectionPreview.includes('collection-preview__relations')) fail('Collection previews must expose relationship language');
if (/linear-gradient\(45deg,transparent/.test(collectionPreview)) fail('Legacy decorative X motif still present in collection preview');

const sectionIndex = read('src/components/index/SectionIndex.astro');
if (!sectionIndex.includes('.section-index__rule::before') || !sectionIndex.includes('.section-index__rule::after')) fail('Section rules must keep registration endpoints');

const recent = read('src/components/activity/RecentActivity.astro');
if (recent.includes('Indexed in THE INDEX')) fail('Recent Activity still contains repeated filler copy');

const artifact = read('src/components/artifacts/ArtifactPlate.astro');
if (/border-radius\s*:\s*(?:24|32|999)/.test(artifact)) fail('Artifact plates may not become rounded SaaS cards');
if (!artifact.includes('artifact-cut')) fail('Artifact plates lost clipped archive geometry');

const fonts = read('src/styles/fonts.css');
const layout = read('src/layouts/BaseLayout.astro');
if (!fonts.includes('Instrument Sans Variable') || !fonts.includes('IBM Plex Mono') || !fonts.includes('--font-display')) fail('Editorial Precision typography families are missing');
if (!layout.includes('@fontsource-variable/instrument-sans/wght.css') || !layout.includes('@fontsource/ibm-plex-mono/latin-500.css')) fail('Locked interface typography must be self-hosted through build-time Fontsource imports');

const tokens = read('src/styles/tokens.css');
for (const token of ['--radius-lg: 8px','--page-max: 1460px','--text-display-xl','--accent: #2d5fdb']) if (!tokens.includes(token)) fail(`Design token contract missing ${token}`);

const config = JSON.parse(read('visual-regression.config.json'));
if (!Array.isArray(config.targets) || config.targets.length < 12) fail('Visual regression manifest must cover at least 12 canonical states');
if (!config.targets.some((t) => t.theme === 'dark') || !config.targets.some((t) => t.theme === 'light')) fail('Visual regression manifest must cover both themes');
if (!config.targets.some((t) => t.viewport === 'mobile') || !config.targets.some((t) => t.viewport === 'desktop')) fail('Visual regression manifest must cover desktop and mobile');
if (!config.targets.some((t) => t.state === 'search')) fail('Visual regression manifest must include a major interactive surface');

if (failures.length) {
  console.error(`Visual language audit failed (${failures.length}):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('Visual language audit passed.');
console.log(`${dedicatedSceneSlugs.length} public artifacts use dedicated aperture compositions.`);
console.log(`${staticFallbackSlugs.length} public static artifacts use the honest generic fallback: ${staticFallbackSlugs.join(', ') || 'none'}.`);
console.log(`${config.targets.length} canonical visual-regression states configured.`);
