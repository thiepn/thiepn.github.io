import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd(), fixtureRoot=await fs.mkdtemp(path.join(root,'.cache/h7-registry-'));
try {
 await fs.mkdir(path.join(fixtureRoot,'scripts/lib'),{recursive:true});await fs.mkdir(path.join(fixtureRoot,'src/data'),{recursive:true});await fs.mkdir(path.join(fixtureRoot,'src/content'),{recursive:true});
 await fs.copyFile('scripts/validate-hub.mjs',path.join(fixtureRoot,'scripts/validate-hub.mjs'));await fs.copyFile('scripts/lib/catalogue-files.mjs',path.join(fixtureRoot,'scripts/lib/catalogue-files.mjs'));
 await fs.cp('src/content/projects',path.join(fixtureRoot,'src/content/projects'),{recursive:true});
 const baseline=JSON.parse(await fs.readFile('src/data/hub.json','utf8'));
 for(const count of [100,250]) {
  const config=structuredClone(baseline);config.expectedCount=count;
  for(let i=baseline.projects.length;i<count;i++) {
   const slug=`scale-${i}`;config.projects.push({slug,order:i+1,category:'tools',description:'Synthetic public metadata for isolated registry qualification.',badge:null});
   await fs.writeFile(path.join(fixtureRoot,`src/content/projects/${slug}.md`),`---\nslug: ${slug}\nvisibility: listed\nliveUrl: https://example.test/${slug}/\npreview:\n  tier: P1\n  type: auto\n---\n`);
  }
  config.expectedCategoryCounts.tools=baseline.expectedCategoryCounts.tools+count-baseline.projects.length;
  await fs.writeFile(path.join(fixtureRoot,'src/data/hub.json'),JSON.stringify(config));
  execFileSync(process.execPath,[path.join(fixtureRoot,'scripts/validate-hub.mjs')],{stdio:'pipe'});console.log(`${count}-app isolated release registry passed`);
  config.projects[count-1].slug=config.projects[0].slug;await fs.writeFile(path.join(fixtureRoot,'src/data/hub.json'),JSON.stringify(config));
  let rejected=false;try{execFileSync(process.execPath,[path.join(fixtureRoot,'scripts/validate-hub.mjs')],{stdio:'pipe'});}catch{rejected=true;}
  if(!rejected)throw Error('Duplicate registry accepted');console.log(`${count}-app duplicate registry rejected`);
 }
} finally { await fs.rm(fixtureRoot,{recursive:true,force:true}); }
