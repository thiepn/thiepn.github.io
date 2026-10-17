/* B1b focused, executable owner-identity and metadata tests. */
const assert = require('node:assert/strict');
const path = require('node:path');
const root = process.env.KEEP_COMPILED_DIR;
if (!root) throw new Error('Run via npm run test:b1b to compile the current source first');
const imp = f => require(path.join(root, f));
const { OWNER_SOURCES, RESOURCE_KINDS, SOURCE_ADAPTERS, makeOwnerRef, parseOwnerRef, sourceLanding } = imp('pkm/integration/ownerResourceRefs.js');
const { collectKeepPins, ensureTaskAnchor, anchoredTaskId, resolveOwnerResource } = imp('pkm/integration/keepResourceSpine.js');
const { safeResourceLinks, resourceLinks } = imp('pkm/integration/resourceLinks.js');
const { favoritesManager } = imp('pkm/personalization/favoritesManager.js');
const { extractTasksFromNote } = imp('pkm/tasks/taskParser.js');
const { configExportImportManager } = imp('pkm/personalization/configExportImport.js');
const { sourceOwnerAdapters, prepareKeepHubSummary } = imp('pkm/integration/sourceOwnerAdapters.js');
let count=0;
function ok(name, cb) {cb(); console.log(`PASS ${++count} ${name}`);}
function note(id, content='- [ ] Submit assignment @due(2026-10-16)') {return {id,title:`Lecture ${id}`,type:'text',content,checklist:[],tags:[],folderId:null,pinned:false,isFavorite:false,archived:false,trashed:false,isLocked:false,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-16T10:00:00Z',reminderDate:null,images:[],color:'default'};}
const sample=note('note-a');
ok('every advertised owner-kind round-trips with stable percent-encoded ID',()=>{
 for(const source of OWNER_SOURCES){for(const kind of RESOURCE_KINDS[source]){const original=makeOwnerRef(source,kind,'original ID/한국어?#');const parsed=parseOwnerRef(original.uri);assert.deepEqual(parsed,original);}}
});
ok('rejects fake version, malformed encoding, unauthorized module, unknown provider and control characters',()=>{
 assert.equal(parseOwnerRef('thiepn://folio/home/task/foo?v=2'),null);
 assert.equal(parseOwnerRef('thiepn://folio/not-home/task/foo?v=1'),null);
 assert.equal(parseOwnerRef('thiepn://foobar/home/task/foo?v=1'),null);
 assert.equal(parseOwnerRef('thiepn://keep/knowledge/habit/foo?v=1'),null);
 assert.equal(parseOwnerRef('thiepn://folio/home/task/%xx?v=1'),null);
 assert.equal(parseOwnerRef('thiepn://folio/home/task/a%2fb?v=1'),null);
 assert.throws(()=>makeOwnerRef('keep','note','\nsecret'));
});
ok('external owner is unverified, cannot be mistaken for native or provider-sync',()=>{
 const ref=makeOwnerRef('folio','task','task-42');const got=resolveOwnerResource(ref,[sample]);
 assert.equal(got.status,'unverified-owner');assert.equal(got.note,undefined);assert.equal(sourceLanding(ref),'https://thiepn.dev/folio/');
 for(const owner of OWNER_SOURCES.filter(x=>x!=='keep')){assert.equal(SOURCE_ADAPTERS[owner].liveRead,false);assert.equal(SOURCE_ADAPTERS[owner].remoteWrite,false);assert.equal(SOURCE_ADAPTERS[owner].synchronization,false);}
 assert.equal(sourceLanding(makeOwnerRef('habits','habit','abc')),null);
});
ok('unmodified note native pin is indexed and preserves its original ID',()=>{
 const n={...sample,pinned:true};const x=collectKeepPins([n],[]);
 assert.equal(x.length,1);assert.equal(x[0].ref.id,n.id);assert.equal(x[0].note,n);assert.equal(x[0].status,'available');
});
ok('legacy note favorite resolves to canonical note, newer duplicate does not duplicate pin',()=>{
 const a={...sample,pinned:true}; const fav={id:'fav-a',title:'Stale name',type:'note',resourceId:a.id,order:1,addedAt:'2026-10-01'};
 const uri=makeOwnerRef('keep','note',a.id).uri;
 const pins=collectKeepPins([a],[fav,{...fav,id:'fav-b',resourceUri:uri}]);
 assert.equal(pins.length,1);assert.equal(pins[0].title,a.title);
});
ok('legacy project favorites are visible but never claimed to be source-backed',()=>{
 const fav={id:'old-project',title:'My old project',type:'project',resourceId:'legacy-1',order:1,addedAt:'2026-10-01'};
 const x=collectKeepPins([], [fav]);assert.equal(x[0].status,'legacy-unresolved');assert.equal(x[0].uri,null);
});
ok('trashed, archived, locked, absent note references fail closed',()=>{
 const r=makeOwnerRef('keep','note',sample.id);
 for(const [key,status] of [['trashed','trashed'],['archived','archived'],['isLocked','locked']]) assert.equal(resolveOwnerResource(r,[{...sample,[key]:true}]).status,status);
 assert.equal(resolveOwnerResource(r,[]).status,'missing');
});
ok('stable task anchor is written to original Markdown only, and survives subsequent line movement',()=>{
 const first=extractTasksFromNote(sample)[0];const updated=ensureTaskAnchor(sample,first,'keep-test123');
 assert.equal(updated.content,'- [ ] Submit assignment @due(2026-10-16) ^keep-test123');assert.equal(sample.content,'- [ ] Submit assignment @due(2026-10-16)');
 const moved={...updated,content:'## Homework\n'+updated.content};const taskRef=makeOwnerRef('keep','markdown-task',anchoredTaskId(sample.id,'keep-test123'));
 const result=resolveOwnerResource(taskRef,[moved]);assert.equal(result.status,'available');assert.equal(result.task.blockId,'keep-test123');assert.equal(result.task.line,1);
});
ok('never creates task pin from stale source or locked note',()=>{
 const first=extractTasksFromNote(sample)[0];assert.throws(()=>ensureTaskAnchor({...sample,content:'- [ ] Changed'},first,'keep-a'));
 assert.throws(()=>ensureTaskAnchor({...sample,isLocked:true},first,'keep-a'));
});
ok('duplicate anchor is unavailable instead of ambiguously opening unrelated task',()=>{
 const n=note('duplicate','- [ ] One ^repeat\n- [ ] Two ^repeat');const ref=makeOwnerRef('keep','markdown-task',anchoredTaskId(n.id,'repeat'));
 assert.equal(resolveOwnerResource(ref,[n]).status,'missing');
});
ok('external reference title cannot override actual local note title',()=>{
 const r=makeOwnerRef('keep','note',sample.id);const fav={id:'x',title:'Spoofed',type:'note',resourceId:sample.id,resourceUri:r.uri,order:1,addedAt:'2026-10-01'};
 assert.equal(collectKeepPins([sample],[fav])[0].title,sample.title);
});
ok('unverified external references preserve user label but do not fabricate data',()=>{
 const r=makeOwnerRef('folio','event','real-id');const fav={id:'x',title:'Appointment',type:'event',resourceId:r.id,resourceUri:r.uri,order:1,addedAt:'2026-10-01'};
 const x=collectKeepPins([],[fav])[0];assert.equal(x.title,'Appointment');assert.equal(x.status,'unverified-owner');
});
ok('malformed relationship entries and duplicate edges are ignored',()=>{
 const a=makeOwnerRef('keep','note','a').uri,b=makeOwnerRef('folio','task','b').uri;
 const valid={id:'id',fromUri:a,toUri:b,label:'related',createdAt:'2026-10-16'};
 assert.deepEqual(safeResourceLinks([valid,{...valid,id:'copy'}, {...valid,toUri:'x'}, {...valid,toUri:a}]),[valid]);
});
ok('typed adapters never return made-up Folio, Calendar, Habits, Vault or Hub records',()=>{
 for(const source of OWNER_SOURCES.filter(x => x !== 'keep')){
   const r=makeOwnerRef(source,RESOURCE_KINDS[source][0],'canonical-resource');
   const result=sourceOwnerAdapters[source].resolve(r,[sample]);
   assert.equal(result.status,'not-connected');assert.equal(result.resource,null);assert.equal(result.requiresConsent,true);assert.equal(result.canMutate,false);assert.equal(result.liveSync,false);
   assert.throws(()=>sourceOwnerAdapters.keep.resolve(r,[sample]));
 }
});
ok('native adapter resolves actual note only under KEEP ownership',()=>{
 const r=makeOwnerRef('keep','note',sample.id);const result=sourceOwnerAdapters.keep.resolve(r,[sample]);
 assert.equal(result.status,'available-local');assert.equal(result.resource.note,sample);
 assert.equal(sourceOwnerAdapters.keep.resolve(r,[]).status,'unavailable-local');
});
ok('Hub summary never publishes identifiers/titles and is disabled for locked vault',()=>{
 assert.equal(prepareKeepHubSummary([sample],false),null);
 const n={...sample,pinned:true};const result=prepareKeepHubSummary([n,{...sample,id:'locked',isLocked:true}],true,new Date('2026-10-16T12:00:00.000Z'));
 assert.equal(result.activeNoteCount,1);assert.equal(result.pinnedNoteCount,1);
 assert.equal(result.visibility,'device-only-not-published');
 assert(!JSON.stringify(result).includes(sample.title));assert(!JSON.stringify(result).includes(sample.id));
});
async function asyncTests(){
 const a=makeOwnerRef('keep','note','a'),b=makeOwnerRef('folio','task','b');
 await favoritesManager.addFavorite({id:'fav-mixed',type:'task',resourceId:b.id,resourceUri:b.uri,title:'Task B'});
 ok('favorites persistence key retains owner URI and legacy compatibility',()=>{
  assert.equal(favoritesManager.isFavorite(b.id,'task',b.uri),true);
  assert.equal(favoritesManager.isFavorite(b.id,'task'),false);
 });
 await favoritesManager.addFavorite({id:'fav-mixed-duplicate',type:'task',resourceId:b.id,resourceUri:b.uri,title:'Duplicate'});
 ok('favorite identity de-duplicates only matching canonical owner URI',()=>{
   assert.equal(favoritesManager.getFavorites().length,1);
 });
 await resourceLinks.connect(a.uri,b.uri);
 await resourceLinks.connect(a.uri,b.uri);
 ok('typed related-resource metadata is idempotent and reversible',()=>{assert.equal(resourceLinks.get().length,1);});
 assert.rejects(resourceLinks.connect(a.uri,a.uri));
 const exported=configExportImportManager.generateBundle();
 ok('existing configuration export now includes canonical pins and typed links',()=>{
   assert.equal(exported.favorites.some(f=>f.resourceUri===b.uri),true);
   assert.equal(exported.resourceLinks.some(link=>link.fromUri===a.uri && link.toUri===b.uri),true);
 });
 const id=resourceLinks.get()[0].id;await resourceLinks.remove(id);await favoritesManager.removeFavorite('fav-mixed');
 const restored=await configExportImportManager.importBundle(JSON.stringify(exported),'merge');
 ok('configuration import restores validated pins and links without mutating notes',()=>{
   assert.equal(restored.success,true);
   assert.equal(favoritesManager.isFavorite(b.id,'task',b.uri),true);
   assert.equal(resourceLinks.get().length,1);
 });
 await resourceLinks.remove(resourceLinks.get()[0].id);await favoritesManager.removeFavorite('fav-mixed');
 ok('cleanup leaves no source records changed',()=>{assert.equal(resourceLinks.get().length,0);assert.equal(favoritesManager.getFavorites().length,0);});
 console.log(`KEEP_B1B_MODEL_PASS=${count}`);
}
asyncTests().catch(err=>{console.error(err);process.exitCode=1;});
