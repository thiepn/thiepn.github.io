import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const doc=JSON.parse(readFileSync(resolve(root,"docs/workspace/hub-phase01-capabilities.json"),"utf8"));
assert.equal(doc.schemaVersion,1);
assert.equal(doc.baseline.repository,"thiepn/thiepn.github.io");
assert.match(doc.baseline.mainCommit,/^[a-f0-9]{40}$/);
assert.equal(doc.policy.hubWorkspaceWriter,"src/lib/workspace/store.ts and existing commands with owner/CAS protections");
assert.equal(doc.catalogue.legacyIdsPreserved,true);
assert.equal(doc.catalogue.notAutomaticallyPromoted,true);
assert.equal(doc.catalogue.publishedEntries,JSON.parse(readFileSync(resolve(root,"src/generated/launch-manifest.json"),"utf8")).entries.length);
const ids=new Set();
for(const item of doc.capabilities){
  assert.ok(!ids.has(item.id),"Duplicate Hub capability "+item.id);
  ids.add(item.id);
  assert.ok(item.owner && item.next && item.scope);
  if(item.state!=="draft_only")assert.ok(existsSync(resolve(root,item.source)),"Missing main source "+item.source);
}
assert.ok(ids.has("apps")&&ids.has("calendar")&&ids.has("knowledge")&&ids.has("account"));
const prs=new Set();
for(const pr of doc.pullRequests){
  assert.ok(!prs.has(pr.number),"Duplicate PR "+pr.number);
  prs.add(pr.number);
  assert.match(pr.head,/^[a-f0-9]{40}$/);
  assert.ok(pr.decision&&pr.details);
}
for(const n of [188,185,178,166,168,175,176])assert.ok(prs.has(n),"Missing critical PR "+n);
assert.ok(existsSync(resolve(root,"src/lib/launches/shortcut-directory.ts")));
console.log("PASS Hub Phase01 owned capability inventory; "+doc.capabilities.length+" capabilities; "+prs.size+" reviewed PR heads; "+doc.catalogue.publishedEntries+" published entries; no duplicate owners or claims");
