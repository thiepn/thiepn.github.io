import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const exists=(f)=>fs.existsSync(path.join(root,f));
const required=[
  'src/components/collections/CollectionMap.astro',
  'src/scripts/collection-map-controller.ts',
  'src/lib/collection-map.ts',
  'tests/unit/collection-map.test.ts',
  'tests/e2e/phase9.spec.ts',
  'docs/PHASE_9_REPORT.md',
];
const missing=required.filter((f)=>!exists(f));
if(missing.length){console.error('Phase 9 missing files:',missing);process.exit(1);}
const dir=path.join(root,'src/content/collections');
const files=fs.readdirSync(dir).filter((f)=>f.endsWith('.md'));
const ledger=JSON.parse(read('src/data/catalogue-ledger.json'));
const expectedCollectionRecords=Object.keys(ledger.collections).length;
if(files.length!==expectedCollectionRecords){console.error(`Expected ${expectedCollectionRecords} ledger-backed collection records, got ${files.length}.`);process.exit(1);}
for(const file of files){
  const text=read(`src/content/collections/${file}`);
  const slug=(text.match(/^slug:\s*([^\n]+)/m)?.[1]||file).trim();
  for(const needle of ['editorialNote:','keywords:','relationships:']) if(!text.includes(`\n${needle}`)){console.error(`${slug}: missing ${needle}`);process.exit(1);}
  const relationCount=(text.match(/^- from:/gm)||[]).length;
  const noteCount=(text.match(/^  note:/gm)||[]).length;
  if(relationCount<1||relationCount!==noteCount){console.error(`${slug}: every relationship requires an editorial note.`);process.exit(1);}
}
const browser=read('src/content/collections/browser-games.md');
const projectCount=(browser.match(/^projects:\n([\s\S]*?)^anchors:/m)?.[1].match(/^- /gm)||[]).length;
const anchorCount=(browser.match(/^anchors:\n([\s\S]*?)^relationships:/m)?.[1].match(/^- /gm)||[]).length;
if(projectCount<9||anchorCount<4||anchorCount>=projectCount){console.error('Browser Games must prove the large-set highlights-map + full-project-list pattern.');process.exit(1);}
const schema=read('src/content.config.ts');
for(const needle of ['editorialNote: z.string','keywords: z.array','note: z.string']) if(!schema.includes(needle)){console.error(`Collection schema missing ${needle}`);process.exit(1);}
const map=read('src/components/collections/CollectionMap.astro');
for(const needle of ['chooseCollectionMapSlugs','data-collection-node','data-collection-edge','data-collection-preview','PreviewAperture','collection-map-shell__relations']) if(!map.includes(needle)){console.error(`Collection map missing ${needle}`);process.exit(1);}
const page=read('src/pages/collection/[slug].astro');
for(const needle of ['About this collection','CollectionMap','Featured projects','Everything in this collection']) if(!page.includes(needle)){console.error(`Collection page missing ${needle}`);process.exit(1);}
const search=read('src/lib/search-core.ts');
for(const needle of ['relationshipLabels','projectTitles','keywords','editorialNote']) if(!search.includes(needle)){console.error(`Search integration missing ${needle}`);process.exit(1);}
const controller=read('src/scripts/collection-map-controller.ts');
for(const needle of ['pointerenter','focus','data-collection-preview','data-collection-relation']) if(!controller.includes(needle)){console.error(`Collection map controller missing ${needle}`);process.exit(1);}
const site=read('src/data/site.ts');
const phase=/phase:\s*(\d+)/.exec(site);if(!phase||Number(phase[1])<9){console.error('SITE.phase must be at least 9.');process.exit(1);}
console.log(`Phase 9 Collections validation passed (${files.length} project collections, interactive maps, highlights/full-list pattern, search integration).`);
