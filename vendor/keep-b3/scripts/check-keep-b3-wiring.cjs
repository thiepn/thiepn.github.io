const {readFileSync}=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const read=p=>readFileSync(path.join(root,p),'utf8');
const expl=read('src/pkm/integration/ui/KeepKnowledgeExplorer.tsx');
const desk=read('src/pkm/integration/ui/KeepProjectDesk.tsx');
const model=read('src/pkm/integration/keepProjectContext.ts');
const manager=read('src/pkm/personalization/savedViewsManager.ts');
const wspace=read('src/pkm/workspace/WorkspacePaneSurface.tsx');
const checks=[
 [expl.includes("import { KeepProjectDesk } from './KeepProjectDesk'"),'B3 desk imported natively'],
 [expl.includes('aria-label="KEEP knowledge and project discovery"'),'existing discovery shell retained'],
 [expl.includes('workspaceSection===\'projects\''),'project view switch wired'],
 [expl.includes('workspaceSection===\'discovery\''),'discovery view switch wired'],
 [expl.includes('onCompleteTask={(row)=>void completeTask(row)}'),'source mutator passed through to desk'],
 [expl.includes('onRescheduleTask={(row,day)=>void rescheduleTask(row,day)}'),'source deadline edit passed through to desk'],
 [model.includes('prepareKeepTaskReschedule'), 'source-line-exact date edit implemented'],
 [expl.includes("scope === 'all' ? 'keep-workspace'"),'cross-domain existing saved-view persistence used'],
 [expl.includes('onInspectProject={(id)=>{setSavedViewId'), 'project inspector navigation resets filtered state'],
 [expl.includes('if (locked) return'), 'vault privacy guard preserved'],
 [desk.includes('buildProjectContext(') && desk.includes('buildKeepPlanningDays('),'project and planning projections connected'],
 [desk.includes('onOpenNote(t.noteId,t.line)'),'task open navigates exact source line'],
 [desk.includes('project.linkedNotes.slice'),'linked notes rendered from source context'],
 [desk.includes('onOpenCalendar'),'existing calendar handoff used'],
 [model.includes('relatedKeepResources('),'existing verified graph relation engine reused'],
 [manager.includes("'keep-workspace'"),'saved-view validator supports native union'],
 [wspace.includes('KeepKnowledgeExplorer'), 'native pane uses existing explorer'],
 ];checks.forEach(([pass,label])=>assert(pass,label));console.log(`KEEP_B3_WIRING_PASS=${checks.length}`);
