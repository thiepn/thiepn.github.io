import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
  'src/components/index/SectionIndex.astro',
  'src/components/artifacts/PreviewAperture.astro','src/components/artifacts/ArtifactPlate.astro','src/components/artifacts/HeroArtifact.astro','src/components/artifacts/FeatureArtifact.astro','src/components/artifacts/CompactArtifact.astro','src/components/artifacts/ArchiveRow.astro','src/components/artifacts/StatusLabel.astro',
  'src/components/archive/CategoryIndex.astro','src/components/archive/ArchiveControls.astro','src/components/archive/ProjectArchive.astro','src/components/collections/CollectionPreview.astro','src/components/activity/RecentActivity.astro','src/components/shell/SiteFooter.astro','src/components/shell/SiteHeader.astro','src/components/shell/MobileMenu.astro','src/components/search/CatalogueSearch.astro','src/components/records/CapabilityList.astro','src/components/records/ArtifactGallery.astro','src/components/records/RecordMetadata.astro','src/components/records/RecordNavigation.astro',
  'src/pages/index.astro','src/pages/projects/index.astro','src/pages/project/[slug].astro','src/pages/collections/index.astro','src/pages/collection/[slug].astro','src/pages/404.astro','src/layouts/BaseLayout.astro'
];
const fail=[];
for(const file of required){if(!fs.existsSync(path.join(root,file)))fail.push(`missing ${file}`)}
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const count=(text,re)=>[...text.matchAll(re)].length;

// Homepage contracts deliberately validate semantics and data wiring rather than
// marketing copy or CSS class names. This keeps redesigns free to change wording
// and presentation without weakening the important structural guarantees.
const home=read('src/pages/index.astro');
const layout=read('src/layouts/BaseLayout.astro');
const taxonomy=read('src/data/taxonomy.ts');

if(!home.includes('THIEPN'))fail.push('homepage missing THIEPN brand identity');
if(home.includes('LivingIndexField'))fail.push('homepage must not render the decorative Living Index field');
if(home.includes('<ProjectArchive'))fail.push('homepage must not duplicate the full project browser');

// Landmark contract: BaseLayout owns the sole main landmark; pages must not nest one.
if(count(layout,/<main\b/g)!==1)fail.push('BaseLayout must render exactly one <main> landmark');
if(count(home,/<main\b/g)!==0)fail.push('homepage must not render a nested <main> landmark');
if(!/<main\b[^>]*\bid=["']main-content["'][^>]*>/s.test(layout))fail.push('BaseLayout main landmark must expose id="main-content"');
if(!/<a\b[^>]*\bhref=["']#main-content["'][^>]*>/s.test(layout))fail.push('BaseLayout must provide a skip link targeting #main-content');

// Heading contract: one page H1, with a programmatic label relationship from the hero.
if(count(home,/<h1\b/g)!==1)fail.push('homepage must render exactly one <h1>');
const h1Tag=/<h1\b([^>]*)>/s.exec(home);
const h1Id=h1Tag?.[1]?.match(/\bid=["']([^"']+)["']/)?.[1];
if(!h1Id)fail.push('homepage <h1> must have an id');
else if(!new RegExp(`aria-labelledby=["']${h1Id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`).test(home))fail.push('homepage hero must reference the <h1> with aria-labelledby');

// Every static aria-labelledby reference in the homepage must resolve to an id in the page source.
for(const match of home.matchAll(/aria-labelledby=["']([^"']+)["']/g)){
  for(const id of match[1].trim().split(/\s+/)){
    if(!new RegExp(`\\bid=["']${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`).test(home))fail.push(`homepage aria-labelledby target missing: ${id}`);
  }
}

// Navigation landmarks need an accessible name.
for(const nav of home.matchAll(/<nav\b([^>]*)>/gs)){
  if(!/\baria-(?:label|labelledby)=/.test(nav[1]))fail.push('homepage nav landmark missing aria-label/aria-labelledby');
}

// Featured-project contract: use the curated featured data, render a preview, provide
// a project-detail route, and preserve a direct live action when one exists.
if(!/getFeaturedProjects\s*\(\s*\)/.test(home))fail.push('homepage must load curated featured projects');
if(!/const\s+flagship\s*=\s*featured\s*\[\s*0\s*\]/.test(home))fail.push('homepage must derive a flagship from curated featured projects');
if(!/<InteractivePreview\b[^>]*\bproject=\{flagship\}/s.test(home))fail.push('homepage flagship must render an InteractivePreview');
if(!home.includes('/project/${flagship.data.slug}/'))fail.push('homepage flagship must link to its project detail route');
if(!home.includes('flagship.data.liveUrl'))fail.push('homepage flagship must expose its live action when available');

// Preview links must have accessible names. Dynamic maps count once in source, which
// is sufficient because the label is generated from each mapped project title.
const previewCount=count(home,/<InteractivePreview\b/g);
const labelledPreviewLinks=count(home,/<a\b[^>]*\baria-label=[^>]*>\s*<InteractivePreview\b/gs);
if(previewCount===0)fail.push('homepage must render at least one project preview');
else if(labelledPreviewLinks<previewCount)fail.push('every homepage InteractivePreview must be wrapped by an accessible labelled link');

// Category discovery is checked against the canonical taxonomy, not visible labels.
const categoryBlock=/PROJECT_CATEGORIES\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(taxonomy)?.[1]??'';
const canonicalCategories=[...categoryBlock.matchAll(/["']([^"']+)["']/g)].map((match)=>match[1]);
if(canonicalCategories.length===0)fail.push('unable to read canonical project categories from taxonomy');
for(const category of canonicalCategories){
  const escaped=category.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(!new RegExp(`\\bkey:\\s*["']${escaped}["']`).test(home))fail.push(`homepage category discovery missing canonical category: ${category}`);
}
if(!home.includes('/projects/?category=${category.key}'))fail.push('homepage category discovery must link through the category query route');
if(!home.includes('stats.categories[category.key]'))fail.push('homepage category discovery must expose catalogue counts');

// Collections should remain navigable without constraining their visible wording or layout.
if(!/collections\.map\s*\(/.test(home))fail.push('homepage must render collection discovery from collection data');
if(!home.includes('/collection/${collection.data.slug}/'))fail.push('homepage collections must link to collection detail routes');

const artifact=read('src/components/artifacts/ArtifactPlate.astro');
for(const marker of ['artifact-cut','StatusLabel','ArtifactActions']){if(!artifact.includes(marker))fail.push(`ArtifactPlate missing ${marker}`)}
if(!(artifact.includes('PreviewAperture')||artifact.includes('InteractivePreview')))fail.push('ArtifactPlate missing PreviewAperture/InteractivePreview');
const preview=read('src/components/artifacts/PreviewAperture.astro');
for(const slug of ['pdf-studio','manuscript','clean30','wordstrike','french-3000','ligo-quizabend','analysis-ii-klausurlabor','curio','wordfall','nebula-foundry']){if(!preview.includes(slug))fail.push(`static preview missing treatment for ${slug}`)}
const projectPage=read('src/pages/project/[slug].astro');
for(const marker of ['render(project)','About this project','Project details','Related projects']){if(!projectPage.includes(marker))fail.push(`project page missing ${marker}`)}
const header=read('src/components/shell/SiteHeader.astro');
for(const marker of ['THIEPN','Home','Projects','Collections','Search projects']){if(!header.includes(marker))fail.push(`header missing ${marker}`)}
const site=read('src/data/site.ts');const phaseMatch=/phase:\s*(\d+)/.exec(site);if(!phaseMatch||Number(phaseMatch[1])<16)fail.push('SITE.phase must be at least 16 for P0 identity cleanup');
const banned=[/border-radius:\s*(?:2[4-9]|[3-9]\d)px/i,/linear-gradient\([^\n]*(?:purple|violet)/i,/glassmorphism/i,/backdrop-filter:\s*blur\((?:2[0-9]|[3-9]\d)px\)/i];
const uiFiles=required.filter((f)=>f.endsWith('.astro')).concat(['src/styles/primitives.css','src/styles/tokens.css','src/styles/themes.css']);
for(const f of uiFiles){const text=read(f);for(const re of banned){if(re.test(text))fail.push(`generic-pattern check failed in ${f}: ${re}`)}}
for(const f of ['src/pages/index.astro','src/pages/projects/index.astro','src/pages/collections/index.astro']){if(/Phase\s+1|Phase\s+01|proof view|catalogue-proof|phase-one/i.test(read(f)))fail.push(`legacy proof language remains in ${f}`)}

const identityFiles=[
  'src/data/site.ts','src/layouts/BaseLayout.astro','src/components/shell/SiteHeader.astro','src/components/shell/SiteFooter.astro','src/components/shell/MobileMenu.astro','src/components/search/CatalogueSearch.astro','src/components/archive/ArchiveControls.astro','src/components/archive/ProjectArchive.astro','src/components/archive/CategoryIndex.astro','src/components/collections/CollectionPreview.astro','src/components/records/CapabilityList.astro','src/components/records/ArtifactGallery.astro','src/components/records/RecordMetadata.astro','src/components/records/RecordNavigation.astro','src/pages/projects/index.astro','src/pages/project/[slug].astro','src/pages/collections/index.astro','src/pages/collection/[slug].astro','src/pages/404.astro'
];
const legacyPhrases=['THIEPN.','THE INDEX','Project Archive','Artifact Record','Related Artifacts','Anchor Artifacts','Search / The Index','Random Access','This artifact does not exist','Return to index','Project archive','No listed artifacts'];
for(const file of identityFiles){const text=read(file);for(const phrase of legacyPhrases){if(text.includes(phrase))fail.push(`${file} retains legacy public identity phrase: ${phrase}`)}}

if(fail.length){console.error('Phase 2 validation failed:\n- '+fail.join('\n- '));process.exit(1)}
console.log(`Phase 2 portfolio identity validation passed (${required.length} retained design-system files).`);
