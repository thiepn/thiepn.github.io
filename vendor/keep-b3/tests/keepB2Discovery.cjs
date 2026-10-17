/* Source-only deterministic B2 regression: compiled against the current code. */
const assert = require('node:assert/strict');
const path = require('node:path');
const root=process.env.KEEP_COMPILED_DIR;
if (!root) throw new Error('Run through scripts/check-keep-b2.cjs');
const imp=p=>require(path.join(root,p));
const { buildKeepDiscoveryIndex, queryKeepDiscovery, queryExistingSavedView, relatedKeepResources, savedViewDomain } = imp('pkm/integration/keepDiscoveryModel.js');
const { classifyPlanningNote } = imp('pkm/planning/planningNoteClassifier.js');
const { resolveOwnerResource, collectKeepPins } = imp('pkm/integration/keepResourceSpine.js');
const { makeOwnerRef } = imp('pkm/integration/ownerResourceRefs.js');
const { resourceLinks }=imp('pkm/integration/resourceLinks.js');
const { buildVaultIndex }=imp('pkm/vaultIndex.js');
const { prepareKeepTaskCompletion }=imp('pkm/integration/keepDiscoveryModel.js');
const { favoritesManager }=imp('pkm/personalization/favoritesManager.js');
const { configExportImportManager }=imp('pkm/personalization/configExportImport.js');
const { savedViewsManager }=imp('pkm/personalization/savedViewsManager.js');
let count=0;
const test=(n,fn)=>{fn();console.log(`PASS ${++count} ${n}`)};
const note=(id,patch={})=>({id,title:id,content:'',type:'text',checklist:[],color:'default',tags:[],folderId:null,pinned:false,isFavorite:false,archived:false,trashed:false,isLocked:false,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-16T10:00:00Z',reminderDate:null,images:[],...patch});
const project=note('p',{title:'Research Project',content:'---\ntype: project\nstatus: active\n---\n## Actions\n- [ ] Submit draft @due(2026-10-19) !high ^draft\n- [x] Outline ^outline',tags:['uni']});
const goal=note('g',{title:'Finish research',content:'---\ntype: goal\n---\n## Goal'});
const area=note('a',{title:'University',tags:['area'],content:'## Scope'});
const regular=note('n',{title:'Literature notes',content:'## Reading\n- [ ] Read article @due(2026-10-18) ^reading',linkedNoteIds:['p']});
const locked=note('secret',{title:'PRIVATE',content:'- [ ] Secret',isLocked:true,tags:['project']});
const archived=note('old',{title:'OLD',archived:true,content:'- [ ] Archived'});
const trashed=note('gone',{title:'TRASH',trashed:true,content:'- [ ] Trash'});
const projects=[{id:'p',noteId:'p',title:project.title,status:'active',goalIds:['g'],goalTitles:['Finish research'],areaId:'a',areaTitle:'University',blockedByIds:[],due:'2026-10-20',priority:'high',nextActionTask:{line:5,text:'Submit draft'},updatedAt:project.updatedAt}];
const goals=[{id:'g',noteId:'g',title:goal.title,status:'active',supportingProjectIds:['p'],updatedAt:goal.updatedAt}];
const areas=[{id:'a',noteId:'a',title:area.title,status:'active',projectIds:['p'],goalIds:['g'],updatedAt:area.updatedAt}];
const notes=[project,goal,area,regular,locked,archived,trashed];
const index=buildKeepDiscoveryIndex(notes,projects,goals,areas);
const ref=(kind,id)=>makeOwnerRef('keep',kind,id).uri;
test('projects goals and areas remain the same canonical note IDs',()=>{
 assert.equal(index.rows.filter(x=>x.kind==='project')[0].noteId,'p');
 assert.equal(index.rows.filter(x=>x.kind==='goal')[0].uri,ref('goal','g'));
 assert.equal(index.rows.filter(x=>x.kind==='area')[0].uri,ref('area','a'));
});
test('locked archived and trashed note content is absent across all results',()=>{
 assert(!index.rows.some(x=>['secret','old','gone'].includes(x.noteId)));
 assert(!JSON.stringify(index.rows).includes('PRIVATE'));
});
test('planning statuses and due dates come from planning source records',()=>{
 const row=index.rows.find(x=>x.noteId==='p'&&x.kind==='project');
 assert.equal(row.dueDate,'2026-10-20');assert.equal(row.priority,'high');assert.equal(row.status,'active');
});
test('original Markdown tasks remain note lines, not duplicated new task entities',()=>{
 const tasks=index.rows.filter(x=>x.kind==='task');
 assert.equal(tasks.length,3);
 assert.equal(tasks.find(x=>x.title.startsWith('Submit')).line,5);
 assert.equal(tasks.find(x=>x.title.startsWith('Submit')).uri,ref('markdown-task','p::draft'));
});
test('unanchored Markdown task remains navigable but cannot receive a fake stable URI',()=>{
 const n=note('free',{content:'- [ ] Unanchored'});
 const tasks=buildKeepDiscoveryIndex([n],[],[],[]).rows.filter(x=>x.kind==='task');
 assert.equal(tasks.length,1);assert.equal(tasks[0].uri,null);assert.equal(tasks[0].noteId,'free');
});
test('tokenized discovery filters across title tags summaries case-insensitively',()=>{
 const found=queryKeepDiscovery(index.rows,{scope:'all',query:'research uni',tag:'',sort:'recent',status:'all'});
 assert(found.some(x=>x.noteId==='p'));assert(!found.some(x=>x.noteId==='a'));
});
test('scope and status filters respect native completion status',()=>{
 const found=queryKeepDiscovery(index.rows,{scope:'task',query:'',tag:'',sort:'title',status:'completed'});
 assert.deepEqual(found.map(x=>x.title),['Outline']);
});
test('due sort orders dated resources first and preserves original IDs',()=>{
 const found=queryKeepDiscovery(index.rows,{scope:'task',query:'',tag:'',sort:'due',status:'open'});
 assert(found[0].title.startsWith('Read article'));
});
test('tag selection supports # and case-insensitive normalization',()=>{
 const found=queryKeepDiscovery(index.rows,{scope:'project',query:'',tag:'#UNI',sort:'recent',status:'all'});
 assert.deepEqual(found.map(x=>x.noteId),['p']);
});
test('existing high-priority tasks SavedView runs against source tasks',()=>{
 const view=savedViewsManager.getSavedViewById('sv-urgent-tasks');
 assert.deepEqual(queryExistingSavedView(index.rows,view).map(x=>x.title),['Submit draft @due(2026-10-19) !high']);
});
test('existing active-projects SavedView runs without creating projects',()=>{
 const view=savedViewsManager.getSavedViewById('sv-active-projects');
 assert.deepEqual(queryExistingSavedView(index.rows,view).map(x=>x.noteId),['p']);
});
test('unconnected external SavedView stays unsupported, never filled by fabricated records',()=>{
 assert.equal(queryExistingSavedView(index.rows,savedViewsManager.getSavedViewById('sv-reading-inbox')),null);
});
test('saved view target domain matches existing native schema, not a second store',()=>{
 assert.equal(savedViewDomain('project'),'projects');assert.equal(savedViewDomain('all'),null);assert.equal(savedViewDomain('task'),'tasks');
});
test('project planning links correctly resolve source-backed area and goal',()=>{
 const row=index.rows.find(x=>x.kind==='project');
 const related=relatedKeepResources(row,index,[],projects,goals,areas);
 assert(related.some(x=>x.uri===ref('area','a')));assert(related.some(x=>x.uri===ref('goal','g')));
});
test('goal and area invert planning relationships without copying projects',()=>{
 for(const kind of ['goal','area']){
  const row=index.rows.find(x=>x.kind===kind);
  assert(relatedKeepResources(row,index,[],projects,goals,areas).some(x=>x.uri===ref('project','p')));
 }
});
test('existing note ID backlinks visible without guessing wiki title identity',()=>{
 const row=index.rows.find(x=>x.kind==='project');
 assert(relatedKeepResources(row,index,[],projects,goals,areas).some(x=>x.uri===ref('note','n')));
});
test('typed explicit links show incoming and outgoing resource directions',()=>{
 const row=index.rows.find(x=>x.kind==='project');const external=makeOwnerRef('folio','task','remote').uri;
 const links=[{id:'x',fromUri:row.uri,toUri:external,label:'depends on',createdAt:'2026-10-16'}, {id:'y',fromUri:ref('note','n'),toUri:row.uri,label:'supports',createdAt:'2026-10-16'}];
 const result=relatedKeepResources(row,index,links,projects,goals,areas);
 assert(result.some(x=>x.uri===external&&x.direction==='outgoing'));
 assert(result.some(x=>x.uri===ref('note','n')&&x.direction==='incoming'));
});
test('existing Wikilink index provides verified outbound and inbound relationships',()=>{
 const wiki={...regular,content:'Review the [[Research Project]] paper'};
 const derived=buildVaultIndex([project,goal,area,wiki]);
 const idx=buildKeepDiscoveryIndex([project,goal,area,wiki],projects,goals,areas);
 const a=relatedKeepResources(idx.rows.find(x=>x.kind==='project'),idx,[],projects,goals,areas,derived);
 assert(a.some(x=>x.uri===ref('note','n') && x.reason.includes('Wikilink backlink')));
 const b=relatedKeepResources(idx.rows.find(x=>x.noteId==='n'),idx,[],projects,goals,areas,derived);
 assert(b.some(x=>x.uri===ref('note','p') && x.reason.includes('Resolved Wikilink')));
});
test('stale existing link-index revisions are rejected after note edit',()=>{
 const wiki={...regular,content:'Review the [[Research Project]] paper'};
 const derived=buildVaultIndex([project,goal,area,wiki]);
 const changed={...wiki,content:'Removed wikilink',updatedAt:'2026-10-16T12:00:00Z',linkedNoteIds:[]};
 const idx=buildKeepDiscoveryIndex([project,goal,area,changed],projects,goals,areas);
 const result=relatedKeepResources(idx.rows.find(x=>x.noteId==='n'),idx,[],projects,goals,areas,derived);
 assert(!result.some(x=>x.reason.includes('Resolved Wikilink')));
});
test('strict inline completion mutates only the correct canonical Markdown task',()=>{
 const task=index.taskById.values().next().value;
 const changed=prepareKeepTaskCompletion(project,task);
 assert.notEqual(changed,project);
 assert(changed.content.includes('- [x] Submit draft'));
 assert(project.content.includes('- [ ] Submit draft'));
});
test('source changes, duplicate anchors and locked notes prevent unsafe task toggles',()=>{
 const task=index.taskById.values().next().value;
 assert.throws(()=>prepareKeepTaskCompletion({...project,content:project.content.replace('Submit draft','Different work')},task));
 assert.throws(()=>prepareKeepTaskCompletion({...project,content:project.content+'\n- [ ] Another ^draft'},task));
 assert.throws(()=>prepareKeepTaskCompletion({...project,isLocked:true},task));
});
test('native checklist tasks are discoverable but cannot silently target Markdown lines',()=>{
 const check=note('check',{type:'checklist',checklist:[{id:'1',text:'Read',completed:false},{id:'2',text:'Read',completed:false}]});
 const idx=buildKeepDiscoveryIndex([check],[],[],[]);
 assert(idx.rows.filter(x=>x.kind==='task').every(x=>x.line===undefined&&x.uri===null));
 const task=[...idx.taskById.values()][0];
 assert.throws(()=>prepareKeepTaskCompletion(check,task));
});
test('source-typed project ref resolves only when original note is a project',()=>{
 assert.equal(resolveOwnerResource(makeOwnerRef('keep','project','p'),notes).status,'available');
 assert.equal(resolveOwnerResource(makeOwnerRef('keep','project','n'),notes).status,'missing');
});
test('planning classifier works for frontmatter and tags without title guessing',()=>{
 assert.equal(classifyPlanningNote(project),'project');assert.equal(classifyPlanningNote(area),'area');assert.equal(classifyPlanningNote(regular),null);
});
(async()=>{
 const created=await savedViewsManager.saveView({name:'University projects',domain:'projects',filters:[{field:'tags',operator:'contains',value:'uni'}],sort:{field:'title',direction:'asc'}});
 test('custom view persists through the existing preference service',()=>{
  assert.equal(queryExistingSavedView(index.rows,created).length,1);
  assert(savedViewsManager.getSavedViewById(created.id));
 });
 const vref=makeOwnerRef('keep','saved-view',created.id);
 test('portable saved view import retains ID and skips duplicate IDs',()=>{
  // Checked below asynchronously; this synchronous test confirms the original ID shape.
  assert(created.id.startsWith('sv-custom-'));assert(created.id.length>20);
 });
 test('saved view URI resolves to actual stored user view, not a fake note',()=>{
  const resolved=resolveOwnerResource(vref,notes);assert.equal(resolved.status,'available');assert.equal(resolved.note,undefined);
 });
 await favoritesManager.addFavorite({id:'view-pin',title:created.name,type:'view',resourceId:created.id,resourceUri:vref.uri});
 test('saved view pins reuse B1b favorite metadata without shadow records',()=>{
  const pins=collectKeepPins(notes,favoritesManager.getFavorites());assert(pins.some(x=>x.uri===vref.uri&&x.status==='available'));
 });
 await resourceLinks.connect(ref('project','p'),makeOwnerRef('folio','task','external').uri);
 test('source-owned links remain an explicit pointer only',()=>{
  assert.equal(resourceLinks.get().length,1);assert(!JSON.stringify(resourceLinks.get()).includes('secret'));
 });
 await savedViewsManager.deleteView(created.id);
 test('deleted saved-view pin is missing, never silently remapped by title',()=>{
  assert.equal(resolveOwnerResource(vref,notes).status,'missing');
 });
 const snapshot={...created,id:'sv-custom-import-original'};
 assert.equal(await savedViewsManager.importView(snapshot),'imported');
 test('saved view import preserves stable source identity instead of generating a new ID',()=>{
  assert(savedViewsManager.getSavedViewById(snapshot.id));
  assert.equal(resolveOwnerResource(makeOwnerRef('keep','saved-view',snapshot.id),notes).status,'available');
 });
 assert.equal(await savedViewsManager.importView(snapshot),'existing');
 test('repeat import never creates a duplicate saved view',()=>{
  assert.equal(savedViewsManager.getSavedViews().filter(v=>v.id===snapshot.id).length,1);
 });
 await savedViewsManager.deleteView(snapshot.id);
 await savedViewsManager.importView(created);
 const packageId = created.id;
 const portable = configExportImportManager.generateBundle();
 assert(portable.savedViews.some(v=>v.id===packageId));
 await savedViewsManager.deleteView(packageId);
 const restored = await configExportImportManager.importBundle(JSON.stringify(portable),'merge');
 test('full personalization bundle restores saved view original ID for pinned URI',()=>{
  assert.equal(restored.success,true);
  assert.equal(resolveOwnerResource(vref,notes).status,'available');
  assert.equal(savedViewsManager.getSavedViews().filter(v=>v.id===packageId).length,1);
 });
 await savedViewsManager.deleteView(packageId);
 await favoritesManager.removeFavorite('view-pin');await resourceLinks.remove(resourceLinks.get()[0].id);
 console.log(`KEEP_B2_DISCOVERY_PASS=${count}`);
})().catch(e=>{console.error(e);process.exitCode=1});
