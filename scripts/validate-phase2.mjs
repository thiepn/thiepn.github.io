import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
  'src/components/index/SectionIndex.astro',
  'src/components/artifacts/PreviewAperture.astro','src/components/artifacts/ArtifactPlate.astro','src/components/artifacts/HeroArtifact.astro','src/components/artifacts/FeatureArtifact.astro','src/components/artifacts/CompactArtifact.astro','src/components/artifacts/ArchiveRow.astro','src/components/artifacts/StatusLabel.astro',
  'src/components/archive/CategoryIndex.astro','src/components/collections/CollectionPreview.astro','src/components/activity/RecentActivity.astro','src/components/shell/SiteFooter.astro',
  'src/pages/index.astro','src/pages/projects/index.astro','src/pages/project/[slug].astro','src/pages/collections/index.astro','src/pages/collection/[slug].astro','src/pages/404.astro'
];
const fail=[];
for(const file of required){if(!fs.existsSync(path.join(root,file)))fail.push(`missing ${file}`)}
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const home=read('src/pages/index.astro');
for(const marker of ['Projects, tools & experiments.','Selected projects','All projects','Browse by interest','featured-grid','project-directory','collection-links']){if(!home.includes(marker))fail.push(`homepage missing ${marker}`)}
if(home.includes('LivingIndexField'))fail.push('homepage must not render the decorative Living Index field');
if(home.includes('<ProjectArchive'))fail.push('homepage must not duplicate the full project archive');
const artifact=read('src/components/artifacts/ArtifactPlate.astro');
for(const marker of ['artifact-cut','StatusLabel','ArtifactActions']){if(!artifact.includes(marker))fail.push(`ArtifactPlate missing ${marker}`)}
if(!(artifact.includes('PreviewAperture')||artifact.includes('InteractivePreview')))fail.push('ArtifactPlate missing PreviewAperture/InteractivePreview');
const preview=read('src/components/artifacts/PreviewAperture.astro');
for(const slug of ['pdf-studio','manuscript','clean30','wordstrike','french-3000','ligo-quizabend','analysis-ii-klausurlabor','curio','wordfall','nebula-foundry']){if(!preview.includes(slug))fail.push(`static preview missing treatment for ${slug}`)}
const projectRecord=read('src/pages/project/[slug].astro');
for(const marker of ['render(project)','Overview','Record','Related Artifacts']){if(!projectRecord.includes(marker))fail.push(`artifact record missing ${marker}`)}
const header=read('src/components/shell/SiteHeader.astro');
for(const marker of ['Home','Projects','Collections']){if(!header.includes(marker))fail.push(`header missing ${marker}`)}
const site=read('src/data/site.ts');const phaseMatch=/phase:\s*(\d+)/.exec(site);if(!phaseMatch||Number(phaseMatch[1])<2)fail.push('SITE.phase must be at least 2');
const banned=[/border-radius:\s*(?:2[4-9]|[3-9]\d)px/i,/linear-gradient\([^\n]*(?:purple|violet)/i,/glassmorphism/i,/backdrop-filter:\s*blur\((?:2[0-9]|[3-9]\d)px\)/i];
const uiFiles=required.filter((f)=>f.endsWith('.astro')).concat(['src/styles/primitives.css','src/styles/tokens.css','src/styles/themes.css']);
for(const f of uiFiles){const text=read(f);for(const re of banned){if(re.test(text))fail.push(`generic-pattern check failed in ${f}: ${re}`)}}
for(const f of ['src/pages/index.astro','src/pages/projects/index.astro','src/pages/collections/index.astro']){if(/Phase\s+1|Phase\s+01|proof view|catalogue-proof|phase-one/i.test(read(f)))fail.push(`legacy proof language remains in ${f}`)}
if(fail.length){console.error('Phase 2 validation failed:\n- '+fail.join('\n- '));process.exit(1)}
console.log(`Phase 2 portfolio-hub design validation passed (${required.length} retained design-system files).`);
