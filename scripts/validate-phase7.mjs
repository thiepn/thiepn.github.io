import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root,file),'utf8');
const required = [
  'src/components/artifacts/PreviewAperture.astro',
  'src/components/artifacts/InteractivePreview.astro',
  'src/scripts/preview-controller.ts',
  'tests/e2e/phase7.spec.ts',
  'docs/PHASE_7_REPORT.md',
  'public/projects/wordstrike/preview.webm',
];
const missing=required.filter(f=>!fs.existsSync(path.join(root,f)));
if(missing.length){console.error('Phase 7 missing files:',missing);process.exit(1);}
const aperture=read('src/components/artifacts/PreviewAperture.astro');
const interactive=read('src/components/artifacts/InteractivePreview.astro');
const controller=read('src/scripts/preview-controller.ts');
const config=read('src/content.config.ts');
const taxonomy=read('src/data/taxonomy.ts');
const featured={
  'pdf-studio': ['P5','synthetic','PdfStudioPreview','duration: 3800','scene--pdf','p7-pdf-page'],
  'manuscript': ['P5','synthetic','ManuscriptPreview','duration: 4000','scene--manuscript','p7-md-line'],
  'clean30': ['P4','synthetic','Clean30Preview','duration: 3600','scene--clean','p7-clean-progress'],
  'wordstrike': ['P4','video',null,'duration: 3400','scene--strike','p7-strike-a'],
  'french-3000': ['P4','synthetic','French3000Preview','duration: 3600','scene--french','p7-french-next'],
  'ligo-quizabend': ['P4','synthetic','LigoQuizPreview','duration: 3900','scene--quiz','p7-quiz-answer'],
  'analysis-ii-klausurlabor': ['P4','synthetic','AnalysisLabPreview','duration: 4000','scene--analysis','p7-curve-b'],
};
for(const [slug,[tier,type,component,duration,scene,animation]] of Object.entries(featured)){
  const file=read(`src/content/projects/${slug}.md`);
  const checks=[
    [file.includes(`tier: ${tier}`),`${slug} must remain ${tier}.`],
    [file.includes(`type: ${type}`),`${slug} preview type must be ${type}.`],
    [file.includes(duration),`${slug} must declare its Phase 7 duration.`],
    [aperture.includes(scene),`${slug} needs a dedicated preview scene.`],
    [interactive.includes(animation),`${slug} needs dedicated Phase 7 choreography.`],
  ];
  if(component) checks.push([file.includes(`component: ${component}`),`${slug} component contract missing.`]);
  for(const [ok,msg] of checks){if(!ok){console.error(msg);process.exit(1);}}
}
if(!config.includes('PREVIEW_PROVENANCE')||!config.includes('provenance: z.enum(PREVIEW_PROVENANCE).optional()')){console.error('Preview provenance schema missing.');process.exit(1);}
if(!taxonomy.includes("'captured'")||!taxonomy.includes("'reconstructed'")){console.error('Preview provenance taxonomy incomplete.');process.exit(1);}
const strike=read('src/content/projects/wordstrike.md');
if(!strike.includes('provenance: reconstructed')){console.error('WORDSTRIKE reconstructed preview must be labelled honestly.');process.exit(1);}
if(!controller.includes("provenance === 'captured' ? 'LIVE' : 'DEMO'")){console.error('Preview status must distinguish captured LIVE footage from DEMO media.');process.exit(1);}
const video=path.join(root,'public/projects/wordstrike/preview.webm');
const size=fs.statSync(video).size;
if(size>1.2*1024*1024){console.error('WORDSTRIKE Featured preview exceeds 1.2 MB preferred P4 budget.');process.exit(1);}
const head=fs.readFileSync(video).subarray(0,4).toString('hex');
if(head!=='1a45dfa3'){console.error('WORDSTRIKE preview is not a valid WebM/Matroska EBML stream.');process.exit(1);}
if(/protocol video|Phase 6 synthetic protocol demos/i.test(interactive)){console.error('Phase 6 protocol choreography leaked into Phase 7.');process.exit(1);}
if(!aperture.includes('VIDEO DEMO')||!aperture.includes('INTERACTIVE DEMO')){console.error('Apertures must distinguish preview media types.');process.exit(1);}
console.log(`Phase 7 Featured-preview validation passed (7 curated previews, ${(size/1024).toFixed(1)} KB WORDSTRIKE WebM).`);
