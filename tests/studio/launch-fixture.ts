import { HUB_VISIBLE_APP_IDS } from '../../src/lib/workspace/visible-apps';
import type {HubCategory} from '../../src/data/taxonomy';
import manifest from '../../src/generated/launch-manifest.json' with {type:'json'};
const entries = HUB_VISIBLE_APP_IDS.flatMap(id => manifest.entries.filter(entry => entry.id === id));
export const hubFixture={expectedCount:entries.length,expectedCategoryCounts:Object.fromEntries(manifest.categories.map(c=>[c.id,entries.filter(e=>e.category===c.id).length])) as Record<HubCategory,number>,excluded:manifest.excluded,projects:entries.map((e,index)=>({slug:e.id,title:e.title,hasDetails:!!e.contentSlug,order:index+1,category:e.category,description:e.description,badge:e.badge}))};
