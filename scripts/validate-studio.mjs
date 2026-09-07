import fs from 'node:fs';
import assert from 'node:assert/strict';
import { publicProjects, readProjects } from './lib/catalogue-files.mjs';
const config=JSON.parse(fs.readFileSync('src/data/showcase.json','utf8'));
const projects=publicProjects(await readProjects());const bySlug=new Map(projects.map(p=>[p.data.slug,p.data]));
const selected=[config.hero,...config.homeTools,...config.homeGames,...config.work];
for(const slug of selected){
 assert(bySlug.has(slug),`Non-public showcase project: ${slug}`);
 assert(config.projects[slug],`Missing presentation: ${slug}`);
 const view=config.projects[slug];
 assert(view.summary && view.caption && view.action,`Incomplete copy: ${slug}`);
 assert(view.media.startsWith('/projects/'),`Media must use project source: ${slug}`);
 assert(fs.existsSync(`public${view.media}`),`Missing real media: ${slug}`);
}
assert.equal(new Set(config.work).size,config.work.length,'Duplicate selected work');
for(const file of ['src/pages/index.astro','src/pages/work/index.astro','src/components/shell/SiteHeader.astro']){
 const text=fs.readFileSync(file,'utf8');
 for(const term of ['Portfolio index','Start by intent','Flagship & featured','Currently building']) assert(!text.includes(term),`${file} exposes retired front-page taxonomy`);
}
assert(fs.readFileSync('src/pages/index.astro','utf8').includes('/library/'),'Library entry missing');
assert(fs.readFileSync('src/pages/projects/index.astro','utf8').includes('data-simple-item'),'Archive must render real rows without JS');
assert(!fs.readFileSync('src/layouts/BaseLayout.astro','utf8').includes('runtime-loader'),'Retired effects runtime must not load on new pages');
console.log(`Studio content validation passed: ${projects.length} public projects; ${config.work.length} selected works; authentic media present.`);
