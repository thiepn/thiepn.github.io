import fs from 'node:fs';

const required = [
  'performance-budgets.json',
  'scripts/audit-performance.mjs',
  'scripts/benchmark-scale.mjs',
  'src/pages/search-index.json.ts',
  'src/scripts/catalogue-search-bootstrap.ts',
  'src/scripts/runtime-loader.ts',
  'src/scripts/perf-debug.ts',
  'src/pages/dev/scale/index.astro',
  'tests/e2e/phase11.spec.ts',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Phase 11 missing ${file}`);

const site = fs.readFileSync('src/data/site.ts','utf8');
const phaseMatch = /phase:\s*(\d+)/.exec(site);
if (!phaseMatch || Number(phaseMatch[1]) < 11) throw new Error('SITE.phase must be at least 11.');
const search = fs.readFileSync('src/components/search/CatalogueSearch.astro','utf8');
if (search.includes('data-catalogue-search-data')) throw new Error('Search index must not be embedded in BaseLayout pages.');
const archive = fs.readFileSync('src/components/archive/ProjectArchive.astro','utf8');
if (archive.includes("import ArchiveRow")) throw new Error('Archive still imports the duplicate list component.');
const reflow = fs.readFileSync('src/motion/archiveReflow.ts','utf8');
if (!reflow.includes('ARCHIVE_REFLOW_ITEM_LIMIT')) throw new Error('Large-result archive motion guard missing.');
const preview = fs.readFileSync('src/scripts/preview-controller.ts','utf8');
if (!preview.includes("document.addEventListener('pointerover'")) throw new Error('Delegated preview pointer handling missing.');
const header = fs.readFileSync('src/components/shell/SiteHeader.astro','utf8');
if (header.includes('backdrop-filter:blur')) throw new Error('Expensive sticky-header backdrop blur remains.');
console.log('Phase 11 performance/scale source validation passed.');
