import type {HubCategory} from '../../src/data/taxonomy';
import manifest from '../../src/generated/launch-manifest.json' with {type:'json'};
const visible=manifest.entries.filter(e=>e.id!=='notes');
export const hubFixture={expectedCount:visible.length,historicalCount:manifest.entries.length,expectedCategoryCounts:Object.fromEntries(manifest.categories.map(c=>[c.id,visible.filter(e=>e.category===c.id).length])) as Record<HubCategory,number>,excluded:manifest.excluded,projects:manifest.entries.map((e,index)=>({slug:e.id,title:e.title,hasDetails:!!e.contentSlug,order:index+1,category:e.category,description:e.description,badge:e.badge}))};
