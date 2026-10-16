import fs from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(fs.readFileSync('src/generated/launch-manifest.json','utf8'));
const legacy=JSON.parse(fs.readFileSync('src/data/hub.json','utf8'));
assert.equal(manifest.schemaVersion,1);assert.equal(manifest.source.repository,'thiepn/core');
assert.match(manifest.source.commit,/^[0-9a-f]{40}$/);assert.match(manifest.source.sha256,/^[0-9a-f]{64}$/);
assert(manifest.entries.length>=27&&manifest.entries.length<=250);
const ids=new Set(),aliases=new Map(),urls=new Set();
for(const entry of manifest.entries){
 assert.match(entry.id,/^[a-z0-9-]+$/);assert(!ids.has(entry.id),'Duplicate launch ID');ids.add(entry.id);
 assert.equal(entry.state,'active');assert.equal(entry.visibility,'public');assert(!manifest.excluded.includes(entry.id));
 assert(entry.title.trim()&&entry.description.trim());assert(manifest.categories.some(c=>c.id===entry.category));
 const url=new URL(entry.url);assert.equal(url.protocol,'https:');assert(!url.username&&!url.password);const target=url.href.replace(/\/$/,'');assert(!urls.has(target),'Duplicate destination');urls.add(target);
 for(const alias of [entry.id,...entry.aliases]){const key=alias.toLowerCase();assert(!aliases.has(key)||aliases.get(key)===entry.id,'Ambiguous alias');aliases.set(key,entry.id);}
 assert.match(entry.ownerRepo,/^thiepn\/[a-zA-Z0-9._-]+$/);
}
for(const entry of legacy.projects)assert(ids.has(entry.slug),`Legacy shortcut lost: ${entry.slug}`);
for(const entry of manifest.entries)assert(!aliases.has(entry.id)||aliases.get(entry.id)===entry.id,'Alias shadows a stable ID');
console.log(`Launch manifest: ${ids.size} current apps; all ${legacy.projects.length} legacy IDs preserved.`);
