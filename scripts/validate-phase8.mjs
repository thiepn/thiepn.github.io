import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const exists=(file)=>fs.existsSync(path.join(root,file));
const required=[
  'src/components/records/CapabilityList.astro',
  'src/components/records/ArtifactGallery.astro',
  'src/components/records/RecordMetadata.astro',
  'src/components/records/RecordNavigation.astro',
  'src/scripts/record-preview-controller.ts',
  'tests/e2e/phase8.spec.ts',
  'docs/PHASE_8_REPORT.md',
];
const missing=required.filter((file)=>!exists(file));
if(missing.length){console.error('Phase 8 missing files:',missing);process.exit(1);}
const projectDir=path.join(root,'src/content/projects');
const files=fs.readdirSync(projectDir).filter((file)=>file.endsWith('.md'));
const ledger=JSON.parse(read('src/data/catalogue-ledger.json'));
const expectedProjectRecords=Object.values(ledger.projects).filter((slug)=>slug!=='__retired__').length;
if(files.length!==expectedProjectRecords){console.error(`Expected ${expectedProjectRecords} ledger-backed project records, got ${files.length}.`);process.exit(1);}
const featured=new Set(['pdf-studio','manuscript','clean30','wordstrike','french-3000','ligo-quizabend','analysis-ii-klausurlabor']);
for(const file of files){
  const text=fs.readFileSync(path.join(projectDir,file),'utf8');
  const slug=(text.match(/^slug:\s*([^\n]+)/m)?.[1]||'').trim();
  if(!text.includes('\ncapabilities:\n')){console.error(`${slug||file}: capabilities missing.`);process.exit(1);}
  const capabilityCount=(text.match(/^- title:/gm)||[]).length;
  if(capabilityCount<3){console.error(`${slug}: expected >=3 capabilities, got ${capabilityCount}.`);process.exit(1);}
  const body=text.split('---').slice(2).join('---').trim();
  if(body.split(/\n\s*\n/).filter(Boolean).length<2){console.error(`${slug}: About copy must contain at least two paragraphs.`);process.exit(1);}
  if(featured.has(slug)){
    if(!text.includes('\ngallery:\n')){console.error(`${slug}: Featured project gallery missing.`);process.exit(1);}
    const galleryBlock=text.split('\ngallery:\n')[1]?.split('\n---')[0]||'';
    const figures=(galleryBlock.match(/^- label:/gm)||[]).length;
    if(figures<3){console.error(`${slug}: expected >=3 gallery views, got ${figures}.`);process.exit(1);}
  }
}
const schema=read('src/content.config.ts');
for(const needle of ['capabilities: z.array','previewState: z.string','gallery: z.array','variant: z.string']){
  if(!schema.includes(needle)){console.error(`Phase 8 content schema missing ${needle}`);process.exit(1);}
}
const page=read('src/pages/project/[slug].astro');
for(const needle of ['CapabilityList','ArtifactGallery','RecordMetadata','RecordNavigation','getProjectNeighbors','About this project','Project details','Related projects']){
  if(!page.includes(needle)){console.error(`Project page missing ${needle}`);process.exit(1);}
}
const gallery=read('src/components/records/ArtifactGallery.astro');
const galleryController=exists('src/scripts/gallery-controller.ts') ? read('src/scripts/gallery-controller.ts') : '';
for(const needle of ['<dialog','data-gallery-close','data-gallery-dialog-visual']){
  if(!gallery.includes(needle)){console.error(`Gallery inspection behavior missing ${needle}`);process.exit(1);}
}
if(!gallery.includes('showModal()') && !galleryController.includes('showModal()')){
  console.error('Gallery inspection behavior missing showModal()');process.exit(1);
}
const controller=read('src/scripts/record-preview-controller.ts');
if(!controller.includes('recordPreviewVariant')||!controller.includes('data-capability-preview')){console.error('Capability-driven preview controller missing.');process.exit(1);}
const catalogue=read('src/lib/catalogue.ts');
if(!catalogue.includes('getProjectNeighbors')||!catalogue.includes('sharedCollections * 8')||!catalogue.includes('Last-resort catalogue neighbors')){console.error('Project navigation or inferred related-project fallback missing.');process.exit(1);}
const site=read('src/data/site.ts');
const phaseMatch=/phase:\s*(\d+)/.exec(site);
if(!phaseMatch||Number(phaseMatch[1])<8){console.error('SITE.phase must be at least 8.');process.exit(1);}
console.log(`Phase 8 project-detail validation passed (${files.length} capability records, related fallback + curated navigation).`);
