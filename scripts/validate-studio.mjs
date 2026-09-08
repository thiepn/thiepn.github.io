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
assert(config.work.includes('tiny-tools'),'Tiny Tools must be selected');
assert.equal(config.projects['tiny-tools'].tier,'showcase');
for(const preview of config.arcadePreviews){
 assert(fs.existsSync('public'+preview.src),`Missing game capture: ${preview.id}`);
 if(preview.video)assert(fs.existsSync('public'+preview.video),`Missing gameplay recording: ${preview.id}`);
}
assert(config.toolFamilies.length>=8,'Tiny Tools needs a cross-suite overview');
for(const family of config.toolFamilies){assert(family.tools.length>=2);for(const task of family.tools)assert(/^\/tools\/#\/tool\/[a-z0-9-]+$/.test(task.href),'Unexpected Tiny Tools shortcut');}
const notes=JSON.parse(fs.readFileSync('src/data/build-notes.json','utf8'));
for(const [slug,note] of Object.entries(notes)){
 assert(bySlug.has(slug));assert(note.sections.length>0);assert(note.sources.length>0);
 for(const source of note.sources)assert(/^https:\/\/github\.com\/thiepn\/[^/]+\/blob\/[0-9a-f]{40}\//.test(source.url),'Build notes need pinned source links');
 for(const related of note.related)assert(bySlug.has(related));
}
console.log(`Studio content validation passed: ${projects.length} public projects; ${config.work.length} selected works; authentic media present.`);
