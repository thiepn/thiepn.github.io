import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
  'src/components/archive/ArchiveControls.astro','src/components/archive/ProjectArchive.astro','src/components/search/CatalogueSearch.astro',
  'src/scripts/archive-controller.ts','src/scripts/catalogue-search.ts','src/lib/archive-state.ts','src/lib/search-core.ts','src/lib/random-access.ts',
  'tests/e2e/phase4.spec.ts','tests/unit/search-core.test.ts','tests/unit/archive-state.test.ts','tests/unit/random-access.test.ts','tests/fixtures/catalogue-250.json'
];
const missing=required.filter(file=>!fs.existsSync(path.join(root,file)));
if(missing.length){console.error('Phase 4 missing files:',missing);process.exit(1)}
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/catalogue-250.json'),'utf8'));
if(!Array.isArray(fixture)||fixture.length!==250){console.error('Scale fixture must contain exactly 250 projects.');process.exit(1)}
const projects=fs.readFileSync(path.join(root,'src/pages/projects/index.astro'),'utf8');
const base=fs.readFileSync(path.join(root,'src/layouts/BaseLayout.astro'),'utf8');
const search=fs.readFileSync(path.join(root,'src/components/search/CatalogueSearch.astro'),'utf8');
const controller=fs.readFileSync(path.join(root,'src/scripts/archive-controller.ts'),'utf8');
const core=fs.readFileSync(path.join(root,'src/lib/search-core.ts'),'utf8');
const checks=[
  [projects.includes('<ProjectArchive'), 'Projects page must use the shared interactive project-browser component.'],
  [base.includes('<CatalogueSearch'), 'Project Search must be available site-wide.'],
  [search.includes('role="combobox"')&&search.includes('role="listbox"'), 'Project Search must expose combobox/listbox semantics.'],
  [controller.includes('pushState')&&controller.includes('popstate'), 'Project-browser state must integrate browser history.'],
  [controller.includes('localStorage')&&controller.includes('sessionStorage'), 'Project-browser preferences/restoration storage is missing.'],
  [core.includes('scoreSearchItem')&&core.includes('tokenDistance'), 'Weighted/fuzzy search core is missing.'],
  [search.includes('Random project')&&!search.includes('auto-launch'), 'Random project presentation missing.'],
];
for(const [pass,message] of checks){if(!pass){console.error(message);process.exit(1)}}
console.log(`Phase 4 project-browser/search validation passed (${required.length} required files, ${fixture.length} scale fixtures).`);
